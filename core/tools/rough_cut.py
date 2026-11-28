"""
Mushanhe Video Engine — 口播原片粗剪（v3.4）：去头尾静音 + 压缩长停顿 → 1080p 全帧内人像 mp4 + 48k 人声 wav + 剪点表

做什么（只按音量切，不碰口误 / 重说，这些仍要人来剪）：
  - 头尾：第一个字之前、最后一个字之后的静音切掉，各留 --head / --tail 秒（默认 0.3s）；
  - 中间：只处理长于 --min-pause（默认 1.0s）的停顿，压到 --keep-pause（默认 0.4s：停顿前后各留一半）；更短的停顿原样保留；
  - 剪点全部吸附到视频帧边界，画面和声音同一刀切，时长逐帧一致；
  - 输出 1080p（短边 1080）H.264 **每帧都是关键帧**（-g 1）的人像 mp4（无音轨）+ 48 kHz 立体声 wav，
    浏览器每帧 seek 不用从远处关键帧解码，导出约 1–1.5× 实时（原片 / 手机片常见 4–6×）；
  - cut_points.json 记下每个剪点在**新时间轴**上的秒数（t）和原片里被剪掉的区间，之后
    `align.py --cuts cut_points.json` 会写进剧本 meta.avatar.cuts：剪点落在换段处 → 换段本身盖住跳切；
    落不到的 → 引擎在剪点那一帧做一次 1.0→1.08 推近盖住（见 core/script-sync.js cutPlan）。

用法:
  python core/tools/rough_cut.py --input raw/take.mkv --out-dir work/ep01
  # → work/ep01/avatar.mp4 · work/ep01/voice.wav · work/ep01/cut_points.json
  # 之后：align.py 用 voice.wav（剪过的那条！）对齐，--cuts work/ep01/cut_points.json

结果最后一行：STATUS OK → ROUGH_CUT_DONE（退出码 0）；STATUS FAIL <原因>（退出码 1）；参数 / 依赖错误退出码 2。
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
from fractions import Fraction
from pathlib import Path

VERSION = "3.4"


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)


def probe(src):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate,avg_frame_rate,duration",
             "-of", "json", str(src)])
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:300])
    j = json.loads(r.stdout)
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in j.get("streams", []) if s.get("codec_type") == "audio"), None)
    dur = float(j.get("format", {}).get("duration") or 0)
    fps = None
    if v:
        for k in ("avg_frame_rate", "r_frame_rate"):
            try:
                f = Fraction(v.get(k) or "0")
                if 5 <= f <= 240:
                    fps = f
                    break
            except (ValueError, ZeroDivisionError):
                pass
    return {"dur": dur, "video": v, "audio": a, "fps": fps}


def silences(src, noise_db, min_d):
    """ffmpeg silencedetect → [(start, end)]（end 缺失时补到片尾）。"""
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-vn", "-af", f"silencedetect=noise={noise_db}dB:d={min_d}", "-f", "null", "-"])
    out, cur = [], None
    for ln in r.stderr.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", ln)
        if m:
            cur = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.]+)", ln)
        if m and cur is not None:
            out.append((cur, float(m.group(1))))
            cur = None
    return out, cur


def plan(dur, sil, open_tail, head, tail, min_pause, keep_pause, fps):
    """静音区间 → 保留区间（原片秒，吸附到帧边界）。"""
    if open_tail is not None:
        sil = sil + [(open_tail, dur)]
    sil = sorted(sil)
    # 说话区间 = 静音的补集
    speech, t = [], 0.0
    for a, b in sil:
        if a > t + 1e-3:
            speech.append((t, a))
        t = max(t, b)
    if t < dur - 1e-3:
        speech.append((t, dur))
    speech = [(a, b) for a, b in speech if b - a >= 0.12]   # 喷麦 / 碰桌子这类极短的响动不算开口
    if not speech:
        return None, None
    s0, s1 = speech[0][0], speech[-1][1]
    keep, cur = [], max(0.0, s0 - head)
    half = keep_pause / 2
    for a, b in sil:
        if a <= s0 + 1e-3 or b >= s1 - 1e-3:
            continue   # 头尾静音另算
        if b - a > min_pause:
            keep.append((cur, a + half))
            cur = b - half
    keep.append((cur, min(dur, s1 + tail)))
    snap = lambda x: float(round(Fraction(x) * fps) / fps)
    keep = [(snap(a), snap(b)) for a, b in keep]
    keep = [(a, b) for a, b in keep if b - a >= 1 / float(fps)]
    return keep, (s0, s1)


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="口播原片粗剪：去头尾静音 + 压缩 >1s 长停顿 → 1080p 全帧内人像 + 48k wav + cut_points.json")
    ap.add_argument("--input", required=True, help="原片视频（.mkv/.mp4/.mov…，带音轨）")
    ap.add_argument("--out-dir", required=True, help="输出目录（建议 work/<期号>/）")
    ap.add_argument("--video-name", default="avatar.mp4")
    ap.add_argument("--audio-name", default="voice.wav")
    ap.add_argument("--noise", type=float, default=-40.0, help="静音阈值 dB（默认 -40）")
    ap.add_argument("--head", type=float, default=0.3, help="第一个字前保留秒数（默认 0.3）")
    ap.add_argument("--tail", type=float, default=0.3, help="最后一个字后保留秒数（默认 0.3）")
    ap.add_argument("--min-pause", type=float, default=1.0, help="只压缩长于此值的中间停顿（默认 1.0s）")
    ap.add_argument("--keep-pause", type=float, default=0.4, help="长停顿压到多长（默认 0.4s）")
    ap.add_argument("--height", type=int, default=1080, help="输出短边像素（默认 1080）")
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--preset", default="medium")
    args = ap.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            print(f"[rough_cut] 需要 {tool}：请安装 FFmpeg 并加入 PATH")
            sys.exit(2)
    src = Path(args.input)
    if not src.is_file():
        print(f"[rough_cut] 找不到输入文件：{src}")
        sys.exit(2)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t_all = time.time()

    info = probe(src)
    if not info["video"] or not info["audio"]:
        print("STATUS FAIL io 输入必须同时有视频轨和音轨")
        sys.exit(1)
    fps = info["fps"] or Fraction(30)
    dur = info["dur"]
    tmpd = tempfile.TemporaryDirectory(prefix="mh_rough_")
    full = Path(tmpd.name) / "full48k.wav"
    r = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-map", "0:a:0", "-vn", "-ac", "2", "-ar", "48000",
             "-c:a", "pcm_s16le", str(full)])
    if r.returncode != 0:
        print(f"STATUS FAIL io 音频抽取失败：{r.stderr.strip()[:300]}")
        sys.exit(1)
    a_dur = probe(full)["dur"] or dur   # 音轨常比视频短 0.1s 左右（mkv 的流时长还读不到）：说话区间按音轨自己的长度算
    sil, open_tail = silences(full, args.noise, 0.2)
    sil = [(a, a_dur if b >= a_dur - 0.05 else b) for a, b in sil]
    keep, speech = plan(min(dur, a_dur), sil, open_tail, args.head, args.tail, args.min_pause, args.keep_pause, fps)
    if not keep:
        print(f"STATUS FAIL mismatch 整条音轨都低于 {args.noise:g} dB，没找到说话（音轨不对 / 阈值太高？）")
        sys.exit(1)

    out_v, out_a = out_dir / args.video_name, out_dir / args.audio_name
    eps = 0.5 / float(fps)
    sel = "+".join(f"between(t,{a - eps:.6f},{b - eps:.6f})" for a, b in keep)
    W, H = int(info["video"].get("width") or 1920), int(info["video"].get("height") or 1080)
    scale = f"scale=-2:{args.height}" if W >= H else f"scale={args.height}:-2"
    vf = f"fps={fps.numerator}/{fps.denominator},select='{sel}',setpts=N/FRAME_RATE/TB,{scale}:flags=lanczos,format=yuv420p"
    print(f"[rough_cut] 原片 {dur:.2f}s（音轨 {a_dur:.2f}s）· {W}x{H} · {float(fps):.3f}fps · 保留 {len(keep)} 段 → 剪点 {len(keep) - 1} 个", flush=True)
    t0 = time.time()
    r = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-map", "0:v:0", "-an", "-vf", vf,
             "-c:v", "libx264", "-preset", args.preset, "-crf", str(args.crf), "-g", "1", "-keyint_min", "1", "-sc_threshold", "0",
             "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
             "-movflags", "+faststart", str(out_v)])
    if r.returncode != 0:
        print(f"STATUS FAIL io 视频编码失败：{r.stderr.strip()[:300]}")
        sys.exit(1)
    t_v = time.time() - t0
    parts, labels = [], []
    for i, (a, b) in enumerate(keep):
        f = 0.006   # 6ms 淡入淡出，剪点不爆音（剪点都落在静音里，听不出）
        parts.append(f"[0:a]atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS,afade=t=in:d={f},afade=t=out:st={max(0.0, b - a - f):.6f}:d={f}[a{i}]")
        labels.append(f"[a{i}]")
    expect = sum(b - a for a, b in keep)
    fc = ";".join(parts) + f";{''.join(labels)}concat=n={len(keep)}:v=0:a=1,apad=whole_dur={expect:.6f},atrim=end={expect:.6f}[aout]"
    r = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(full), "-filter_complex", fc, "-map", "[aout]",
             "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", str(out_a)])
    tmpd.cleanup()
    if r.returncode != 0:
        print(f"STATUS FAIL io 音频剪辑失败：{r.stderr.strip()[:300]}")
        sys.exit(1)

    pv, pa = probe(out_v), probe(out_a)
    expect = sum(b - a for a, b in keep)
    cuts, t = [], 0.0
    for i, (a, b) in enumerate(keep):
        if i:
            pa_, pb_ = keep[i - 1][1], a
            cuts.append({"t": round(t, 3), "src_from": round(pa_, 3), "src_to": round(pb_, 3), "removed": round(pb_ - pa_, 3)})
        t += b - a
    res = {
        "tool": f"core/tools/rough_cut.py v{VERSION}", "input": str(src), "source_duration": round(dur, 3),
        "output_duration": round(expect, 3), "fps": f"{fps.numerator}/{fps.denominator}",
        "video": out_v.name, "audio": out_a.name,
        "params": {"noise_db": args.noise, "head": args.head, "tail": args.tail, "min_pause": args.min_pause, "keep_pause": args.keep_pause},
        "speech": [round(speech[0], 3), round(speech[1], 3)],
        "head_removed": round(keep[0][0], 3), "tail_removed": round(dur - keep[-1][1], 3),
        "keep": [[round(a, 3), round(b, 3)] for a, b in keep],
        "cuts": cuts,
    }
    (out_dir / "cut_points.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    dv, da = pv["dur"], pa["dur"]
    print(f"[rough_cut] 头部切掉 {res['head_removed']:.2f}s · 尾部切掉 {res['tail_removed']:.2f}s · 中间压缩 {len(cuts)} 处长停顿，"
          f"共省 {sum(c['removed'] for c in cuts):.2f}s · 成片 {expect:.2f}s（原片 {dur:.2f}s）", flush=True)
    print(f"[rough_cut] 人像 {out_v}（{dv:.3f}s，1080p 全帧内，编码 {t_v:.1f}s）· 人声 {out_a}（{da:.3f}s，48k 立体声）· 剪点表 {out_dir / 'cut_points.json'}", flush=True)
    print(f"[rough_cut] 下一步：用 {out_a.name}（剪过的这条）跑 align.py，模式 B 加 --cuts {out_dir / 'cut_points.json'}；总用时 {time.time() - t_all:.1f}s", flush=True)
    if abs(dv - expect) > 1.5 / float(fps) or abs(da - expect) > 0.02:
        print(f"STATUS FAIL io 画面 / 声音时长对不上（视频 {dv:.3f}s · 音频 {da:.3f}s · 应为 {expect:.3f}s）")
        sys.exit(1)
    print("STATUS OK")
    print("ROUGH_CUT_DONE")


if __name__ == "__main__":
    main()
