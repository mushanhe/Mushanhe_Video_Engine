"""
Mushanhe Video Engine — 12 套风格包冒烟回归（抽帧 + 零报错断言 + 可选逐像素基线比对）

用法:
  # 1. 全量 12 套 × 3 帧，断言每套 ZERO_ERRORS（截图存 --out）
  python core/tools/smoke_test.py --out scratch_verify/smoke

  # 2. 先存一份基线（改代码之前跑）
  python core/tools/smoke_test.py --out scratch_verify/baseline

  # 3. 改完后与基线逐像素比对（两条同时满足才算该帧通过）：
  #    - 单像素任一通道差 ≤ --pixel-tol（默认 3/255）的点不算差异；
  #    - 超出的像素占整帧比例 ≤ --ratio-tol（默认 0.1% = 0.001）。
  python core/tools/smoke_test.py --out scratch_verify/after --baseline scratch_verify/baseline

  # 只跑部分包 / 换时间点 / 换皮肤 / 换剧本（剧本路径相对各风格包目录）
  python core/tools/smoke_test.py --packs 05_pro_nle,12_fin_terminal --times 3,9.5 --theme color_grade --out scratch_verify/s5

  # 已人工确认、允许与基线不同的格子（仍会打印差异图路径，但不算失败）：包名@秒
  python core/tools/smoke_test.py --baseline scratch_verify/baseline --out scratch_verify/after --allow 05_pro_nle@3,12_fin_terminal@17

目录改名兼容：基线可以按旧目录名存放，比对时按 RENAMES（旧名 → 新名）自动找到旧目录；
两处都找不到基线帧时直接判失败，绝不静默跳过。

退出码：0 = 全部通过；1 = 有报错 / 有超差帧 / 缺基线帧。
"""
import argparse
import functools
import http.server
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:  # 复用 serve.py 的 HTTP 206 Range 处理器（人像 WebM / 人声 WAV 可任意 seek）
    from serve import RangeHTTPRequestHandler as _BaseHandler
except Exception:  # pragma: no cover
    _BaseHandler = http.server.SimpleHTTPRequestHandler

REPO = Path(__file__).resolve().parents[2]

# 12 套开源风格包（当前目录名）
PACKS = [
    "01_industrial_3d", "02_swiss_print", "03_investigative_desk", "04_nodegraph",
    "05_pro_nle", "06_neobrutalism", "07_chalkboard", "08_song_ink",
    "09_analog_film", "10_retro_crt", "11_stage_glass", "12_fin_terminal",
]
# 历史目录名 → 当前目录名（v3.2.2 去商标化改名）
RENAMES = {
    "03_vox_desk": "03_investigative_desk",
    "11_keynote_glass": "11_stage_glass",
    "12_bloomberg_fin": "12_fin_terminal",
}
OLD_OF = {new: old for old, new in RENAMES.items()}


class QuietHandler(_BaseHandler):
    def log_message(self, format, *args):
        pass


def start_server(root: Path):
    handler = functools.partial(QuietHandler, directory=str(root))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def resolve_pack_dir(name: str):
    """包名（新旧皆可）→ templates/ 下实际存在的目录名；找不到返回 None。"""
    cands = [name, RENAMES.get(name), OLD_OF.get(name)]
    for c in cands:
        if c and (REPO / "templates" / c / "index.html").is_file():
            return c
    return None


def frame_name(idx: int, t: float) -> str:
    return f"frame_{idx:02d}_{t:.1f}s.png"


def launch(p):
    for ch in ("msedge", "chrome", None):
        try:
            kw = {"headless": True}
            if ch:
                kw["channel"] = ch
            return p.chromium.launch(**kw)
        except Exception:
            continue
    raise RuntimeError("No Chromium/Edge/Chrome browser available for Playwright.")


def capture_pack(browser, port, pack_dir, times, out_dir: Path, data=None, theme=None):
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    params = {}
    if data:
        params["data"] = data
    if theme:
        params["theme"] = theme
    params["t"] = times[0]
    params["clean"] = 1
    url = f"http://127.0.0.1:{port}/templates/{pack_dir}/index.html?{urlencode(params, safe='/')}"
    shots = []
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_function("() => window.__MH_ENGINE__ !== undefined", timeout=15000)
        page.wait_for_function(
            "() => { const v = document.getElementById('avatar-video'); return !v || v.readyState >= 2; }",
            timeout=15000,
        )
        try:
            page.evaluate("() => document.fonts && document.fonts.ready")
        except Exception:
            pass
        time.sleep(0.5)
        out_dir.mkdir(parents=True, exist_ok=True)
        for idx, t in enumerate(times, start=1):
            page.evaluate("(sec) => window.__MH_ENGINE__.seek(sec)", t)
            time.sleep(0.45)
            try:
                page.wait_for_function(
                    "() => { const E = window.__MH_ENGINE__; if (E && typeof E.ready === 'function') return E.ready();"
                    " const v = document.getElementById('avatar-video'); return !v || (!v.seeking && v.readyState >= 2); }",
                    timeout=8000,
                )
                time.sleep(0.15)
            except Exception:
                pass
            path = out_dir / frame_name(idx, t)
            page.screenshot(path=str(path))
            shots.append((t, path))
    except Exception as e:  # 页面打不开 / 引擎没起来，同样算报错
        errors.append(f"[smoke_test] {type(e).__name__}: {e}")
    finally:
        page.close()
    return url, errors, shots


def compare(cur: Path, base: Path, diff_path: Path, pixel_tol: int):
    import numpy as np
    from PIL import Image

    a = np.asarray(Image.open(cur).convert("RGB"), dtype=np.int16)
    b = np.asarray(Image.open(base).convert("RGB"), dtype=np.int16)
    if a.shape != b.shape:
        return 1.0, None, f"尺寸不同 {a.shape[1]}x{a.shape[0]} vs {b.shape[1]}x{b.shape[0]}"
    d = np.abs(a - b).max(axis=2)
    mask = d > pixel_tol
    ratio = float(mask.mean())
    written = None
    if mask.any():
        # 差异图：当前帧压暗 35%，超差像素标纯红，便于人眼核对
        vis = (a * 0.35).astype(np.uint8)
        vis[mask] = (255, 0, 0)
        diff_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(vis).save(diff_path)
        written = diff_path
    return ratio, written, f"maxΔ={int(d.max())}"


def main():
    for stream in (sys.stdout, sys.stderr):  # Windows 控制台默认 GBK，统一 UTF-8 输出避免乱码
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="12 套风格包冒烟回归：ZERO_ERRORS 断言 + 可选逐像素基线比对")
    ap.add_argument("--packs", default=",".join(PACKS), help="逗号分隔的包名（新旧目录名皆可），默认全部 12 套")
    ap.add_argument("--times", default="3,17,48", help="抽帧秒数，默认 3,17,48")
    ap.add_argument("--out", default="scratch_verify/smoke", help="截图输出目录（按包名分子目录）")
    ap.add_argument("--baseline", default=None, help="基线目录（结构同 --out）；给了就逐像素比对")
    ap.add_argument("--pixel-tol", type=int, default=3, help="单像素单通道容差（/255），默认 3")
    ap.add_argument("--ratio-tol", type=float, default=0.001, help="超差像素占比上限，默认 0.001（0.1%%）")
    ap.add_argument("--allow", default="", help="允许与基线不同的格子，逗号分隔：包名@秒，如 05_pro_nle@3")
    ap.add_argument("--data", default=None, help="可选剧本 JSON（相对各风格包目录）")
    ap.add_argument("--theme", default=None, help="可选皮肤名")
    args = ap.parse_args()

    times = [float(x) for x in args.times.split(",") if x.strip()]
    out_root = Path(args.out)
    base_root = Path(args.baseline) if args.baseline else None
    allow = set()
    for item in filter(None, (s.strip() for s in args.allow.split(","))):
        name, _, sec = item.partition("@")
        allow.add((RENAMES.get(name, name), float(sec)))

    from playwright.sync_api import sync_playwright

    failures, report = [], []
    httpd, port = start_server(REPO)
    try:
        with sync_playwright() as p:
            browser = launch(p)
            for name in [s.strip() for s in args.packs.split(",") if s.strip()]:
                pack_dir = resolve_pack_dir(name)
                if not pack_dir:
                    failures.append(f"{name}: templates/ 下找不到该风格包（新旧目录名都试过）")
                    print(f"[FAIL] {name}: 找不到目录")
                    continue
                url, errors, shots = capture_pack(browser, port, pack_dir, times, out_root / pack_dir, args.data, args.theme)
                print(f"URL {url}")
                if errors:
                    failures.append(f"{pack_dir}: {len(errors)} 条报错")
                    print(f"[FAIL] {pack_dir} CONSOLE/PAGE ERRORS:")
                    for e in errors:
                        print("   -", e)
                else:
                    print(f"[OK]   {pack_dir} ZERO_ERRORS ({len(shots)} 帧)")
                if not base_root:
                    continue
                canon = RENAMES.get(pack_dir, pack_dir)
                for idx, (t, cur) in enumerate(shots, start=1):
                    cands = [base_root / d / frame_name(idx, t) for d in dict.fromkeys([pack_dir, canon, OLD_OF.get(canon, canon)])]
                    base = next((c for c in cands if c.is_file()), None)
                    if base is None:
                        failures.append(f"{pack_dir}@{t:g}: 缺基线帧（找过 {', '.join(str(c) for c in cands)}）")
                        print(f"   [FAIL] {pack_dir}@{t:g}s 缺基线帧")
                        continue
                    diff_path = out_root / "_diff" / f"{pack_dir}_{t:.1f}s.png"
                    ratio, written, info = compare(cur, base, diff_path, args.pixel_tol)
                    ok = ratio <= args.ratio_tol
                    allowed = (canon, t) in allow
                    tag = "PASS" if ok else ("ALLOW" if allowed else "FAIL")
                    line = f"   [{tag}] {pack_dir}@{t:g}s 超差 {ratio * 100:.4f}% ({info}) ← 基线 {base.parent.name}"
                    if written:  # 只要有超出单像素容差的点就给差异图，便于人眼复核
                        line += f"\n          差异图 {written}"
                    print(line)
                    report.append((pack_dir, t, ratio, tag, written))
                    if not ok and not allowed:
                        failures.append(f"{pack_dir}@{t:g}: 超差 {ratio * 100:.4f}% > {args.ratio_tol * 100:g}%，差异图 {written}")
            browser.close()
    finally:
        httpd.shutdown()

    print("=" * 64)
    if failures:
        print(f"SMOKE FAIL（{len(failures)} 项）")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    n_allow = sum(1 for r in report if r[3] == "ALLOW")
    print(f"SMOKE PASS · ZERO_ERRORS" + (f" · 基线比对通过（{n_allow} 格为已确认的允许差异）" if base_root else ""))


if __name__ == "__main__":
    main()
