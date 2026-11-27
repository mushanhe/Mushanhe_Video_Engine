"""
Mushanhe Video Engine — 模板更新检查（SKILL.md Step 0 调用；只检查，不更新）

用法:
  python core/tools/check_update.py            # 一天最多真正联网检查一次（记录在仓库根目录 .mh_update_pref）
  python core/tools/check_update.py --force    # 忽略「一天一次」限制，立即检查

输出（第一行固定以 STATUS 开头，便于 AI Agent 解析）:
  STATUS SKIP <原因>     非 git 目录 / detached HEAD / 没有上游分支 / 今天已查过 / 联网失败或超时 → 静默跳过，不打扰用户
  STATUS UP_TO_DATE      已是最新
  STATUS BEHIND <N>      上游有 N 个新提交，随后列出更新摘要；由 Agent 询问用户，用户确认后再执行 git pull --ff-only

约束：当前分支与上游分支动态获取（不写死 origin/main）；联网只做一次 git fetch，5 秒超时，
GIT_TERMINAL_PROMPT=0 + SSH BatchMode，绝不弹出账号密码输入；本脚本从不修改工作区。
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PREF = REPO / ".mh_update_pref"
DAY = 24 * 3600


def git(*args, timeout=5):
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
    env.setdefault("GIT_SSH_COMMAND", "ssh -o BatchMode=yes -o ConnectTimeout=5")
    r = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout, env=env)
    return r.returncode, r.stdout.strip()


def fetch(remote, timeout=5):
    """git fetch，硬超时：不接管道（避免 Windows 上子进程占住管道导致 communicate 挂住），超时连同子进程树一起结束。"""
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
    env.setdefault("GIT_SSH_COMMAND", "ssh -o BatchMode=yes -o ConnectTimeout=5")
    kw = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
    p = subprocess.Popen(["git", "-C", str(REPO), "fetch", "--quiet", remote], stdin=subprocess.DEVNULL,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env, **kw)
    try:
        return p.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            import signal
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except OSError:
                p.kill()
        raise


def skip(reason):
    print(f"STATUS SKIP {reason}")
    sys.exit(0)


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="检查模板仓库上游是否有新提交（只检查，不更新）")
    ap.add_argument("--force", action="store_true", help="忽略一天一次的限制")
    args = ap.parse_args()

    try:
        code, out = git("rev-parse", "--is-inside-work-tree")
    except (OSError, subprocess.TimeoutExpired):
        skip("git-unavailable")
    if code != 0 or out != "true":
        skip("not-a-git-repo")
    code, branch = git("symbolic-ref", "-q", "--short", "HEAD")
    if code != 0 or not branch:
        skip("detached-head")
    code, upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
    if code != 0 or not upstream:
        skip(f"no-upstream ({branch})")
    _, remote = git("config", f"branch.{branch}.remote")
    if not remote or remote == ".":
        skip(f"local-upstream ({upstream})")

    last = 0.0
    try:
        last = float(json.loads(PREF.read_text(encoding="utf-8")).get("last_check", 0))
    except Exception:
        pass
    if not args.force and time.time() - last < DAY:
        skip("checked-today")
    try:  # 先记时间：无论联网成败，一天只打扰网络一次
        PREF.write_text(json.dumps({"last_check": time.time()}), encoding="utf-8")
    except OSError:
        pass

    try:
        code = fetch(remote, timeout=5)
    except subprocess.TimeoutExpired:
        skip("fetch-timeout")
    if code != 0:
        skip("fetch-failed")
    code, n = git("rev-list", "--count", f"HEAD..{upstream}")
    if code != 0:
        skip("compare-failed")
    if int(n or 0) == 0:
        print(f"STATUS UP_TO_DATE {branch} ← {upstream}")
        return
    print(f"STATUS BEHIND {n} {branch} ← {upstream}")
    _, log = git("log", "--oneline", "--no-decorate", "-n", "20", f"HEAD..{upstream}")
    print(log)
    print("NEXT 询问用户是否更新；同意后执行 git pull --ff-only。若因本地改动失败，只提示用户手动 git stash 后重试，严禁 reset。")


if __name__ == "__main__":
    main()
