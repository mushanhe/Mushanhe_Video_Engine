"""
Mushanhe Video Engine — 通用 MP4 导出器（无头浏览器确定性逐帧抓取 → FFmpeg 多进程分块编码 → 无损拼接 + 音频混流）

原理：每帧 t = start + i / fps，调用页面 window.__MH_ENGINE__.seek(t)，等待 ready()（或人像视频解码完成）
      + 主页面 / 可见 iframe 各 2 帧 requestAnimationFrame 落帧，再截图 PNG 直接管道喂给 FFmpeg（不落盘）。

用法:
  # 单模板（默认读页面 __MH_ENGINE__.duration）
  python core/tools/export_mp4.py --template 01_industrial_3d --theme obsidian --out output/demo.mp4
  # 自定义剧本 + 4K
  python core/tools/export_mp4.py --template 02_swiss_print --data demo_data.json --res 4k --out output/swiss_4k.mp4
  # 任意页面（仓库相对路径）+ 外部母带音轨
  python core/tools/export_mp4.py --url-path my_project/index.html --duration 120 --audio my_master.wav --out output/my_ep.mp4

音频优先级：--audio（外部母带，按 --start 对齐裁切）＞ 剧本 meta.audio.src（--data 时自动解析，含 offset / volume）＞ 静音轨。
            --bgm 可选循环背景乐（--bgm-vol 线性音量），与上面的人声混合。
"""
import argparse
import functools
import http.server
import json
import math
import multiprocessing as mp
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlencode, urlsplit, parse_qs, unquote

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:  # 复用 serve.py 的 HTTP 206 Range 处理器：大体积抠像 WebM / 人声 WAV 在无头浏览器里任意 seek
    from serve import RangeHTTPRequestHandler as _BaseHandler
except Exception:  # pragma: no cover
    _BaseHandler = http.server.SimpleHTTPRequestHandler

RES = {"1080p": 1, "4k": 2}           # 固定 1920×1080 视口，device_scale_factor 1 / 2 → 1920×1080 / 3840×2160
DEFAULT_CRF = {"1080p": 18, "4k": 16}
LAUNCH_ARGS = [
    "--force-color-profile=srgb",
    "--autoplay-policy=no-user-gesture-required",
    "--hide-scrollbars",
    "--mute-audio",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
]
EXPORT_CSS = "#toast { display: none !important; } .ch-frame { transition: none !important; }"

# —— 页面加载就绪：引擎挂出 → 字体 → 主页面与同源 iframe 的 <img> 解码完成 ——
JS_WAIT_ASSETS = """
async (timeoutMs) => {
  const docs = [document];
  document.querySelectorAll('iframe').forEach(f => { try { if (f.contentDocument) docs.push(f.contentDocument); } catch (e) {} });
  const jobs = [];
  for (const d of docs) {
    try { if (d.fonts && d.fonts.ready) jobs.push(d.fonts.ready); } catch (e) {}
    for (const im of Array.from(d.images || [])) {
      if (!im.getAttribute('src') && !im.currentSrc) continue;
      jobs.push(im.complete
        ? (im.decode ? im.decode().catch(() => {}) : Promise.resolve())
        : new Promise(r => { im.addEventListener('load', () => (im.decode ? im.decode().catch(() => {}) : 0, r()), { once: true }); im.addEventListener('error', r, { once: true }); }));
    }
  }
  await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, timeoutMs))]);
  return jobs.length;
}
"""

# —— 单帧：seek → 轮询 ready()（无固定 sleep）→ 主页面 + 可见 iframe 各 2 帧 rAF ——
JS_SEEK_FRAME = """
async ([t, timeoutMs]) => {
  const E = window.__MH_ENGINE__;
  const tick = () => new Promise(r => setTimeout(r, 4));
  const raf2 = (w) => new Promise(res => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    try { w.requestAnimationFrame(() => w.requestAnimationFrame(fin)); } catch (e) { fin(); }
    setTimeout(fin, 500);   // 兜底：iframe 正在卸载时 rAF 可能永不回调
  });
  const isReady = () => {
    try {
      if (E && typeof E.ready === 'function') return !!E.ready();
      const v = document.getElementById('avatar-video');
      return !v || (!v.seeking && v.readyState >= 2);
    } catch (e) { return false; }
  };
  const visibleFrames = () => Array.from(document.querySelectorAll('iframe')).filter(f => {
    try { const cs = getComputedStyle(f); return f.contentWindow && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01; }
    catch (e) { return false; }
  }).map(f => f.contentWindow);
  E.seek(t);
  const t0 = performance.now();
  let ok = true;
  for (let pass = 0; pass < 4; pass++) {
    while (!isReady()) {
      if (performance.now() - t0 > timeoutMs) { ok = false; break; }
      await tick();
    }
    await Promise.all([window, ...visibleFrames()].map(raf2));
    if (!ok || isReady()) break;   // rAF 期间又触发了新的解码 / 换章 → 再等一轮
  }
  return ok;
}
"""


class QuietHandler(_BaseHandler):
    def log_message(self, format, *args):
        pass


class SharedServer(http.server.ThreadingHTTPServer):
    request_queue_size = 512   # 多个 worker 同时加载大量资源：默认 backlog=5 在 Windows 上会直接 ERR_CONNECTION_REFUSED
    daemon_threads = True


def start_server(root_dir: Path):
    handler = functools.partial(QuietHandler, directory=str(root_dir))
    httpd = SharedServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def page_rel_path(args) -> str:
    """仓库相对页面路径（可带 query），与 inspect_frames.py 同一套拼装规则。"""
    if args.url_path:
        return args.url_path.lstrip("/")
    return f"templates/{args.template}/{args.file}"


def build_url(port: int, args, t: float) -> str:
    base_url = f"http://127.0.0.1:{port}/{page_rel_path(args)}"
    params = {}
    if args.data:
        params["data"] = args.data
    if args.theme:
        params["theme"] = args.theme
    params["t"] = f"{t:.4f}"
    params["clean"] = 1
    sep = "&" if "?" in base_url else "?"
    return f"{base_url}{sep}{urlencode(params, safe='/')}"


def launch_browser(p):
    for ch in ("msedge", "chrome", None):
        try:
            kwargs = {"headless": True, "args": LAUNCH_ARGS}
            if ch:
                kwargs["channel"] = ch
            return p.chromium.launch(**kwargs), (ch or "chromium")
        except Exception:
            continue
    raise RuntimeError("No Chromium/Edge/Chrome browser available for Playwright.")


def open_page(browser, url: str, scale: int, errors: list, ready_timeout: float):
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=scale)
    page = ctx.new_page()
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_function("() => window.__MH_ENGINE__ !== undefined && typeof window.__MH_ENGINE__.seek === 'function'",
                           timeout=60000)
    page.add_style_tag(content=EXPORT_CSS)
    page.evaluate(JS_WAIT_ASSETS, int(ready_timeout * 1000))
    return ctx, page


# ==================== Worker：一个浏览器 + 一个 FFmpeg 进程，负责 [f0, f1) 帧 ====================
def worker_main(wid, port, args_dict, f0, f1, chunk_path, progress_q):
    from playwright.sync_api import sync_playwright
    a = argparse.Namespace(**args_dict)
    scale = RES[a.res]
    fps = a.fps
    errors, slow = [], []
    ff = None
    try:
        cmd = [
            a.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-f", "image2pipe", "-vcodec", "png", "-r", str(fps), "-i", "-",
            # RGB → YUV 必须显式用 BT.709 矩阵（swscale 默认 BT.601，只打标签会偏色）
            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,"
                   "setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
            "-c:v", "libx264", "-preset", a.preset, "-crf", str(a.crf), "-pix_fmt", "yuv420p",
            "-color_range", "tv", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
            "-r", str(fps), "-video_track_timescale", "90000",
            str(chunk_path),
        ]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        with sync_playwright() as p:
            browser, _ = launch_browser(p)
            t_first = a.start + f0 / fps
            ctx, page = open_page(browser, build_url(port, a, t_first), scale, errors, a.ready_timeout)
            # 预热：首帧连 seek 两次（新开页面 / 跨章首次加载时，确保落到目标章节的目标帧）
            page.evaluate(JS_SEEK_FRAME, [t_first, int(a.ready_timeout * 1000)])
            page.evaluate(JS_WAIT_ASSETS, int(a.ready_timeout * 1000))
            for i in range(f0, f1):
                t = a.start + i / fps
                ok = page.evaluate(JS_SEEK_FRAME, [t, int(a.ready_timeout * 1000)])
                if not ok:
                    slow.append(round(t, 4))
                ff.stdin.write(page.screenshot(type="png"))
                if (i - f0) % 10 == 9 or i == f1 - 1:
                    progress_q.put(("p", wid, i - f0 + 1))
            ctx.close()
            browser.close()
        ff.stdin.close()
        rc = ff.wait()
        if rc != 0:
            raise RuntimeError(f"ffmpeg exited with {rc} for chunk {chunk_path.name}")
        progress_q.put(("done", wid, {"errors": errors, "slow": slow}))
    except Exception as e:  # pragma: no cover
        try:
            if ff and ff.stdin:
                ff.stdin.close()
            if ff:
                ff.wait(timeout=30)
        except Exception:
            pass
        progress_q.put(("fail", wid, f"{type(e).__name__}: {e}"))


# ==================== 音频 ====================
def resolve_script_audio(args):
    """--data 剧本里的 meta.audio → (本地文件, offset, volume)；src 按页面目录解析（与浏览器一致）。"""
    if not args.data:
        return None
    page_rel = urlsplit(page_rel_path(args)).path
    page_dir = (REPO_ROOT / unquote(page_rel)).parent
    data_path = (page_dir / args.data).resolve()
    if not data_path.exists():
        print(f"[audio] script not found: {data_path}")
        return None
    try:
        meta = json.loads(data_path.read_text(encoding="utf-8")).get("meta", {})
    except Exception as e:
        print(f"[audio] cannot parse {data_path}: {e}")
        return None
    A = meta.get("audio")
    if not A:
        return None
    src = A if isinstance(A, str) else A.get("src", "")
    if not src:
        return None
    off = float(A.get("offset", 0) or 0) if isinstance(A, dict) else 0.0
    vol = float(A.get("volume", 1.0)) if isinstance(A, dict) and A.get("volume") is not None else 1.0
    f = (page_dir / unquote(src)).resolve()
    if not f.exists():
        print(f"[audio] meta.audio.src not found: {f}")
        return None
    return f, off, vol


def mux_final(args, chunks, duration, out_path: Path, work: Path):
    lst = work / "concat.txt"
    lst.write_text("".join(f"file '{c.as_posix()}'\n" for c in chunks), encoding="utf-8")
    cmd = [args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst)]
    D = f"{duration:.6f}"
    voice = None
    if args.audio:
        voice = (Path(args.audio).resolve(), args.start, 1.0)
    else:
        voice = resolve_script_audio(args)
        if voice:
            voice = (voice[0], voice[1] + args.start, voice[2])
    filters, labels, idx = [], [], 1
    if voice:
        f, off, vol = voice
        print(f"[audio] voice/master: {f}  (offset {off:.3f}s, volume {vol:g})")
        cmd += ["-i", str(f)]
        filters.append(f"[{idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
                       f"atrim=start={off:.6f},asetpts=PTS-STARTPTS,volume={vol:g},apad,atrim=duration={D}[va]")
        labels.append("[va]")
        idx += 1
    if args.bgm:
        print(f"[audio] bgm loop: {args.bgm}  (volume {args.bgm_vol:g})")
        cmd += ["-stream_loop", "-1", "-i", str(Path(args.bgm).resolve())]
        filters.append(f"[{idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
                       f"volume={args.bgm_vol:g},atrim=duration={D},asetpts=PTS-STARTPTS[ba]")
        labels.append("[ba]")
        idx += 1
    if not labels:
        print("[audio] no audio source → silent stereo track")
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        filters.append(f"[{idx}:a]atrim=duration={D}[aout]")
    elif len(labels) == 1:
        filters[-1] = filters[-1].rsplit("[", 1)[0] + "[aout]"
    else:
        filters.append(f"{''.join(labels)}amix=inputs={len(labels)}:duration=first:normalize=0[aout]")
    cmd += ["-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-ac", "2",
            "-t", D, "-movflags", "+faststart", str(out_path)]
    subprocess.run(cmd, check=True)


# ==================== 主流程 ====================
def probe_duration(port, args, errors):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser, ch = launch_browser(p)
        ctx, page = open_page(browser, build_url(port, args, args.start), 1, errors, args.ready_timeout)
        d = page.evaluate("() => Number(window.__MH_ENGINE__.duration) || 0")
        ctx.close()
        browser.close()
    return float(d), ch


def fmt_t(sec):
    sec = max(0, int(sec))
    return f"{sec // 60:02d}:{sec % 60:02d}"


def main():
    ap = argparse.ArgumentParser(description="Mushanhe Video Engine — deterministic headless MP4 exporter")
    ap.add_argument("--template", default="02_swiss_print")
    ap.add_argument("--file", default="index.html")
    ap.add_argument("--url-path", default=None, help="repo-relative page path, e.g. my_project/index.html")
    ap.add_argument("--data", default=None, help="script JSON relative to the page dir -> ?data=...")
    ap.add_argument("--theme", default=None, help="skin name -> ?theme=...")
    ap.add_argument("--res", choices=list(RES), default="1080p")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--duration", type=float, default=None, help="seconds; default = __MH_ENGINE__.duration - start")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--crf", type=int, default=None, help="default 1080p=18, 4k=16")
    ap.add_argument("--preset", default="medium")
    ap.add_argument("--audio", default=None, help="external master track (WAV/MP3), aligned to page t=0")
    ap.add_argument("--bgm", default=None, help="optional looping background music")
    ap.add_argument("--bgm-vol", type=float, default=0.10)
    ap.add_argument("--out", required=True)
    ap.add_argument("--keep-chunks", action="store_true")
    ap.add_argument("--ready-timeout", type=float, default=20.0, help="max seconds to wait for ready() per frame")
    args = ap.parse_args()

    args.ffmpeg = shutil.which("ffmpeg")
    if not args.ffmpeg:
        sys.exit("ffmpeg not found in PATH")
    if args.crf is None:
        args.crf = DEFAULT_CRF[args.res]
    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    work = out_path.parent / f".{out_path.stem}_chunks"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    httpd, port = start_server(REPO_ROOT)
    t_begin = time.time()
    try:
        print(f"URL {build_url(port, args, args.start)}")
        probe_errors = []
        if args.duration is None:
            total, ch = probe_duration(port, args, probe_errors)
            if total <= 0:
                sys.exit("page has no __MH_ENGINE__.duration; pass --duration")
            args.duration = total - args.start
            print(f"[probe] __MH_ENGINE__.duration = {total:.4f}s  (browser: {ch})")
        n_frames = max(1, int(round(args.duration * args.fps)))
        duration = n_frames / args.fps
        W, H = 1920 * RES[args.res], 1080 * RES[args.res]
        n_workers = max(1, min(args.workers, n_frames))
        bounds = [round(k * n_frames / n_workers) for k in range(n_workers + 1)]
        print(f"[plan] {W}x{H} @ {args.fps}fps · start {args.start:.3f}s · {n_frames} frames ({duration:.4f}s) · "
              f"{n_workers} workers · x264 crf {args.crf} preset {args.preset}")

        ctx = mp.get_context("spawn")
        q = ctx.Queue()
        chunks = [work / f"chunk_{k:02d}.mp4" for k in range(n_workers)]
        args_dict = {k: v for k, v in vars(args).items()}
        procs = []
        for k in range(n_workers):
            pr = ctx.Process(target=worker_main, args=(k, port, args_dict, bounds[k], bounds[k + 1], chunks[k], q), daemon=True)
            pr.start()
            procs.append(pr)

        done = [0] * n_workers
        finished, failures, all_errors, all_slow = set(), {}, [], []
        t_enc = time.time()
        last_print = 0
        while len(finished) + len(failures) < n_workers:
            try:
                kind, wid, val = q.get(timeout=2)
            except Exception:
                if any(not pr.is_alive() and k not in finished and k not in failures for k, pr in enumerate(procs)):
                    for k, pr in enumerate(procs):
                        if not pr.is_alive() and k not in finished and k not in failures:
                            failures[k] = f"worker exited with code {pr.exitcode}"
                continue
            if kind == "p":
                done[wid] = val
            elif kind == "done":
                done[wid] = bounds[wid + 1] - bounds[wid]
                finished.add(wid)
                all_errors += [f"[w{wid}] {e}" for e in val["errors"]]
                all_slow += val["slow"]
            elif kind == "fail":
                failures[wid] = val
            now = time.time()
            if now - last_print > 5 or len(finished) + len(failures) == n_workers:
                last_print = now
                tot = sum(done)
                el = now - t_enc
                eta = el / tot * (n_frames - tot) if tot else 0
                per = " ".join(f"w{k}:{done[k]}/{bounds[k + 1] - bounds[k]}" for k in range(n_workers))
                print(f"[render] {tot}/{n_frames} ({100 * tot / n_frames:5.1f}%) · {tot / max(el, 1e-6):.2f} fps · "
                      f"elapsed {fmt_t(el)} · eta {fmt_t(eta)} · {per}", flush=True)
        for pr in procs:
            pr.join(timeout=30)
        if failures:
            for k, msg in failures.items():
                print(f"[FAIL] worker {k}: {msg}")
            sys.exit(1)
        t_render = time.time() - t_enc

        print("[mux] concat chunks + audio → MP4")
        mux_final(args, chunks, duration, out_path, work)
        if not args.keep_chunks:
            shutil.rmtree(work, ignore_errors=True)
        else:
            print(f"[keep] chunks kept in {work}")

        size_mb = out_path.stat().st_size / 1024 / 1024
        print(f"[done] {out_path}  ({size_mb:.1f} MB) · render {t_render:.1f}s · total {time.time() - t_begin:.1f}s")
        if all_slow:
            print(f"[warn] {len(all_slow)} frames hit ready-timeout: {all_slow[:12]}{' ...' if len(all_slow) > 12 else ''}")
        errs = probe_errors + all_errors
        if errs:
            print("CONSOLE/PAGE ERRORS:")
            for e in errs[:40]:
                print("  -", e)
        else:
            print("ZERO_ERRORS")
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    main()
