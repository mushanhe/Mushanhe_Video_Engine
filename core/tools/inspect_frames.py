"""
Mushanhe Video Engine — 无头浏览器关键帧自动抽帧验货脚本
用法:
  python core/tools/inspect_frames.py --template 02_swiss_print --times 3,9.5,17,25,32.5,40,48,56,63,69.5 --out preview_frames
  # 验非默认皮肤 / 自定义剧本（剧本路径相对风格包目录）
  python core/tools/inspect_frames.py --template 01_industrial_3d --data demo_variants.json --theme obsidian --times 3,9.5 --out scratch_verify/my_ep

v3.4：URL 带 clean=1&chrome=0（与导出同一画面：隐藏控制栏、切换器和顶部英文页签）。
  - 任一请求 404 / 媒体加载失败 → 打印清单 + STATUS FAIL missing-media，退出码 1（不再等 15 秒后超时崩溃）；
  - 控制台 warn 也打印出来（CONSOLE WARNINGS），其中「unknown scene type」（自创句型会被静默丢掉、后面全部错位）按错误处理；
  - 结果：ZERO_ERRORS（退出码 0）/ CONSOLE/PAGE ERRORS（退出码 1）。
"""
import argparse
import functools
import http.server
import sys
import threading
import time
from urllib.parse import urlencode, unquote
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
    for stream in (sys.stdout, sys.stderr):   # Agent 按 UTF-8 读管道；中文 / 英文 Windows 默认 GBK / cp1252
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

    repo_root = Path(__file__).resolve().parents[2]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    times = [float(x.strip()) for x in args.times.split(",") if x.strip()]

    httpd, port = start_server(repo_root)
    errors = []
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
            errors, warns, media = [], [], []

            def on_console(msg):
                if msg.type == "error":
                    errors.append(msg.text)
                elif msg.type == "warning":
                    (errors if "unknown scene type" in msg.text else warns).append(msg.text)
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.on("console", on_console)
            page.on("response", lambda r: media.append(f"HTTP {r.status} {unquote(r.url)}") if r.status >= 400 else None)
            page.on("requestfailed", lambda r: media.append(f"请求失败 {unquote(r.url)} ({r.failure})")
                    if "ERR_ABORTED" not in str(r.failure or "") else None)

            params = {}
            if args.data:
                params["data"] = args.data
            if args.theme:
                params["theme"] = args.theme
            params["t"] = times[0]
            params["clean"] = 1
            params["chrome"] = 0
            sep = "&" if "?" in base_url else "?"
            page_url = f"{base_url}{sep}{urlencode(params, safe='/')}"
            print(f"URL {page_url}")
            page.goto(page_url, wait_until="domcontentloaded")
            try:
                page.wait_for_function("() => window.__MH_ENGINE__ !== undefined", timeout=15000)
            except Exception:
                msg = page.evaluate("() => { const e = document.getElementById('load-error'); return e ? e.textContent : ''; }")
                print("[FAIL] 页面 15 秒内没跑起来（剧本 JSON 写错 / 路径不对？）：")
                for e in dict.fromkeys([m for m in [msg] if m] + errors + media):
                    print("  -", e)
                print("STATUS FAIL page-load")
                browser.close()
                sys.exit(1)
            deadline = time.time() + 15
            while True:   # 等人像就绪；期间出现 404 / 媒体加载失败立刻停，不再空等超时
                ok = page.evaluate("() => { const v = document.getElementById('avatar-video'); return !v || v.readyState >= 2 || !!v.error; }")
                bad = media + [e for e in errors if "missing-media" in e]
                if bad or ok or time.time() > deadline:
                    break
                time.sleep(0.2)
            time.sleep(0.5)
            bad = media + [e for e in errors if "missing-media" in e]
            if bad or not ok:
                print("[FAIL] 素材缺失 / 加载失败（预览和成片会没人或没声音）：")
                for e in dict.fromkeys(bad or ["人像视频 15 秒内没有解码出第一帧（格式不支持？）"]):
                    print("  -", e)
                print("  提示：剧本里的 meta.audio / meta.avatar.video / meta.avatar.bg 按「剧本 JSON 所在目录」解析。")
                print("STATUS FAIL missing-media")
                browser.close()
                sys.exit(1)

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

            if warns:
                print("CONSOLE WARNINGS（不算失败，但要逐条确认）:")
                for e in dict.fromkeys(warns):
                    print("  -", e)
            errors += [f"[missing-media] {m}" for m in media]
            if errors:
                print("CONSOLE/PAGE ERRORS:")
                for e in errors:
                    print("  -", e)
            else:
                print("ZERO_ERRORS")
            browser.close()
    finally:
        httpd.shutdown()
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
