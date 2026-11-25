"""
Mushanhe Video Engine — 支持 HTTP 206 Range 断点续传的本地预览服务器
彻底解决大体积 1080p WebM 抠像视频（77MB+）拖动进度条或同步时卡死/重缓冲的问题。
用法:
  python core/tools/serve.py --port 8765
"""
import argparse
import http.server
import mimetypes
import os
import re
from pathlib import Path

mimetypes.add_type("video/webm", ".webm")
mimetypes.add_type("audio/mp4", ".m4a")
mimetypes.add_type("audio/mpeg", ".mp3")
mimetypes.add_type("application/javascript", ".js")


class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        if not os.path.exists(path):
            self.send_error(404, "File not found")
            return None

        ctype = self.guess_type(path)
        f = open(path, "rb")
        fs = os.fstat(f.fileno())
        file_len = fs.st_size

        range_header = self.headers.get("Range")
        if range_header:
            m = re.match(r"bytes=(\d*)-(\d*)", range_header)
            if m:
                start_str, end_str = m.groups()
                start = int(start_str) if start_str else 0
                end = int(end_str) if end_str else file_len - 1
                end = min(end, file_len - 1)
                if start > end or start >= file_len:
                    f.close()
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{file_len}")
                    self.end_headers()
                    return None
                length = end - start + 1
                self.send_response(206)
                self.send_header("Content-Type", ctype)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_len}")
                self.send_header("Content-Length", str(length))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                f.seek(start)
                self._range_remaining = length
                return f

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(file_len))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self._range_remaining = file_len
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_range_remaining", None)
        buf_size = 64 * 1024
        try:
            while True:
                to_read = buf_size if remaining is None else min(buf_size, remaining)
                if to_read <= 0:
                    break
                data = source.read(to_read)
                if not data:
                    break
                outputfile.write(data)
                if remaining is not None:
                    remaining -= len(data)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    os.chdir(repo_root)
    httpd = http.server.ThreadingHTTPServer((args.bind, args.port), RangeHTTPRequestHandler)
    httpd.daemon_threads = True
    print(f"SERVING http://{args.bind}:{args.port} (HTTP 206 Range Enabled)", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
