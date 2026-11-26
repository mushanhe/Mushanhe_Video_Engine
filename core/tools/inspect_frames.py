"""
Mushanhe Video Engine — 无头浏览器关键帧自动抽帧验货脚本
用法:
  python core/tools/inspect_frames.py --template 02_swiss_print --times 3,9.5,17,25,32.5,40,48,56,63,69.5 --out preview_frames
  # 验非默认皮肤 / 自定义剧本（剧本路径相对风格包目录）
  python core/tools/inspect_frames.py --template 01_industrial_3d --data demo_variants.json --theme obsidian --times 3,9.5 --out scratch_verify/my_ep
"""
import argparse
import functools
import http.server
import os
import socketserver
import threading
import time
from urllib.parse import urlencode
from pathlib import Path
from playwright.sync_api import sync_playwright


try:  # 复用 serve.py 的 HTTP 206 Range 处理器：大体积抠像 WebM / 人声 WAV 在无头浏览器里也能任意 seek
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).resolve().parent))
    from serve import RangeHTTPRequestHandler as _BaseHandler
except Exception:  # pragma: no cover
    _BaseHandler = http.server.SimpleHTTPRequestHandler


class QuietHandler(_BaseHandler):
    def log_message(self, format, *args):
        pass


def start_server(root_dir: Path):
    handler = functools.partial(QuietHandler, directory=str(root_dir))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd, port


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", default="02_swiss_print")
    parser.add_argument("--file", default="index.html")
    parser.add_argument("--url-path", default=None, help="Optional repo-relative URL path, e.g. episodes/ep02_ai_workflow/ch00_intro/index.html")
    parser.add_argument("--data", default=None, help="Optional script JSON, relative to the page dir, e.g. demo_variants.json -> ?data=...")
    parser.add_argument("--theme", default=None, help="Optional skin name, e.g. obsidian -> ?theme=...")
    parser.add_argument("--times", default="6.5,15.6,20.6,26.0,35.5,47.0")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    times = [float(x.strip()) for x in args.times.split(",") if x.strip()]

    httpd, port = start_server(repo_root)
    if args.url_path:
        rel = args.url_path.lstrip("/")
        base_url = f"http://127.0.0.1:{port}/{rel}"
    else:
        base_url = f"http://127.0.0.1:{port}/templates/{args.template}/{args.file}"

    try:
        with sync_playwright() as p:
            browser = None
            for ch in ("msedge", "chrome", None):
                try:
                    kwargs = {"headless": True}
                    if ch:
                        kwargs["channel"] = ch
                    browser = p.chromium.launch(**kwargs)
                    break
                except Exception:
                    continue
            if browser is None:
                raise RuntimeError("No Chromium/Edge/Chrome browser available for Playwright.")
            page = browser.new_page(viewport={"width": 1920, "height": 1080})
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

            params = {}
            if args.data:
                params["data"] = args.data
            if args.theme:
                params["theme"] = args.theme
            params["t"] = times[0]
            params["clean"] = 1
            sep = "&" if "?" in base_url else "?"
            page_url = f"{base_url}{sep}{urlencode(params, safe='/')}"
            print(f"URL {page_url}")
            page.goto(page_url, wait_until="domcontentloaded")
            page.wait_for_function("() => window.__MH_ENGINE__ !== undefined", timeout=15000)
            page.wait_for_function(
                "() => { const v = document.getElementById('avatar-video'); return !v || v.readyState >= 2; }",
                timeout=15000,
            )
            time.sleep(0.5)

            for idx, t in enumerate(times, start=1):
                page.evaluate("(sec) => window.__MH_ENGINE__.seek(sec)", t)
                time.sleep(0.45)
                try:  # 等人像视频真正解码到目标帧（真人抠像素材 seek 较慢）；整期主控台走 __MH_ENGINE__.ready()
                    page.wait_for_function(
                        "() => { const E = window.__MH_ENGINE__; if (E && typeof E.ready === 'function') return E.ready(); const v = document.getElementById('avatar-video'); return !v || (!v.seeking && v.readyState >= 2); }",
                        timeout=8000,
                    )
                    time.sleep(0.15)
                except Exception:
                    pass
                out_path = out_dir / f"frame_{idx:02d}_{t:.1f}s.png"
                page.screenshot(path=str(out_path))
                print(f"CAPTURED {out_path}")

            if errors:
                print("CONSOLE/PAGE ERRORS:")
                for e in errors:
                    print("  -", e)
            else:
                print("ZERO_ERRORS")
            browser.close()
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    main()
