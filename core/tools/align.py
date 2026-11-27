"""
Mushanhe Video Engine — 口播对齐工具：音/视频 → 同源 words（逐字绝对秒）+ sub（字幕行）→ 剧本

依赖：
  pip install faster-whisper          # 必需（不依赖 PyTorch）；PATH 里要有 ffmpeg
  pip install pypinyin                # 可选：启用「同音错字」修正（--script 时用）
  pip install opencc-python-reimplemented  或  zhconv   # 可选：更全的繁转简（没装用内置高频表兜底）
  pip install stable-ts               # 可选：--refine 强制对齐（会连带安装 PyTorch，约 0.5–2 GB）

用法：
  # 模式 A：独立输出 aligned.json（duration / audio / words / sub / corrections）
  python core/tools/align.py --input voice.wav --script script.txt --out aligned.json

  # 模式 B：把真实口播回填进草稿剧本（每段 start / dur / words / sub + meta.audio）
  python core/tools/align.py --input voice.wav --inject templates/06_neobrutalism/draft.json --out templates/06_neobrutalism/final.json

  # 视频输入：自动另存一份 48kHz 立体声 WAV 作为 meta.audio（也可用 --extract-audio 指定路径）
  python core/tools/align.py --input take.mp4 --extract-audio templates/06_neobrutalism/voice.wav --out aligned.json

硬约束：必须在「最终用于播放和导出的那条音轨」上运行（即 meta.audio 指向的文件）。
        后期剪掉停顿、变速、重新拼接后，请重新跑一次 align.py，否则全片时间会整体错位。

时间一律是全片绝对秒（音轨第 0 秒 = 剧本第 0 秒）。words 与 sub 由同一次识别产出，sub 的切行规则与
core/script-sync.js 完全一致（有草稿 sub 时按字 LCS 映射断点；没有时按停顿 ≥0.3s / 每行宽度 ≤14 切）。
"""
import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path

VERSION = "3.3"

# ============================== 与 core/script-sync.js 同口径的切行规则 ==============================
LATIN = re.compile(r"^[A-Za-z0-9.\-_/@#:+%]+$")
STRIP = re.compile(r"[\s，。、！？；：,!?;:“”\"'‘’（）()《》【】「」…—·~～]")


def norm(s):
    return STRIP.sub("", "" if s is None else str(s))


def width_js(tk):
    """与 script-sync.js width() 相同：拉丁词按 0.55 字宽折算（JS Math.round，.5 向上），其余按去标点后的字数。"""
    import math
    return max(1, math.floor(len(tk) * 0.55 + 0.5)) if LATIN.match(tk) else len(norm(tk))


def auto_split(W, groups):
    """停顿 ≥0.3s 或本行宽度将超 14 就换行（script-sync.js autoSplit）。"""
    g, n = [], 0
    for w in W:
        wd = width_js(w[0])
        gap = (w[1] - g[-1][2]) if g else 0
        if g and (gap >= 0.3 or n + wd > 14):
            groups.append(g)
            g, n = [], 0
        g.append(w)
        n += wd
    if g:
        groups.append(g)
    return groups


def chars_js(s):
    return list(norm(s).lower())


def map_lines(subs, W, key=chars_js):
    """script-sync.js mapLines：按字 LCS 把每行断点映射到实际念出的词上，返回每个词的行号（单调）；对不上返回 None。"""
    S, SL, C, CW = [], [], [], []
    for li, line in enumerate(subs):
        for c in key(line):
            S.append(c)
            SL.append(li)
    for wi, w in enumerate(W):
        for c in key(w[0]):
            C.append(c)
            CW.append(wi)
    n, m = len(S), len(C)
    if not n or not m or n * m > 4e6:
        return None
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        row, nxt, si = dp[i], dp[i + 1], S[i]
        for j in range(m - 1, -1, -1):
            row[j] = nxt[j + 1] + 1 if si == C[j] else (nxt[j] if nxt[j] >= row[j + 1] else row[j + 1])
    if not dp[0][0]:
        return None
    votes = [dict() for _ in W]
    i = j = 0
    while i < n and j < m:
        if S[i] == C[j]:
            v = votes[CW[j]]
            v[SL[i]] = v.get(SL[i], 0) + 1
            i += 1
            j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            i += 1
        else:
            j += 1
    L = []
    for v in votes:
        best, cnt = -1, 0
        for k, c in v.items():
            if c > cnt or (c == cnt and k < best):
                best, cnt = k, c
        L.append(best)
    run = -1
    for i in range(len(L)):
        if L[i] >= 0:
            if L[i] < run:
                L[i] = run
            run = L[i]
    for i in range(len(L)):
        if L[i] >= 0:
            continue
        p, q = i - 1, i + 1
        while p >= 0 and L[p] < 0:
            p -= 1
        while q < len(L) and L[q] < 0:
            q += 1
        gp = W[i][1] - W[p][2] if p >= 0 else float("inf")
        gq = W[q][1] - W[i][2] if q < len(L) else float("inf")
        L[i] = L[p] if gp <= gq else L[q]
    return L


def group_lines(W, subs):
    """words → 字幕行（每行是 words 的一个片段），规则同 script-sync.js pushWords。"""
    groups = []
    subs = [s for s in (norm(x) for x in (subs or [])) if s]
    L = map_lines(subs, W) if subs else None
    if L:
        g = []

        def flush():
            if g:
                if sum(width_js(w[0]) for w in g) > 14:
                    auto_split(list(g), groups)
                else:
                    groups.append(list(g))
                g.clear()

        for i, w in enumerate(W):
            if i and L[i] != L[i - 1]:
                flush()
            g.append(w)
        flush()
    else:
        auto_split(W, groups)
    return groups


def display(tokens):
    """词列表 → 显示文字：拉丁词与相邻词之间补空格（与 subtitle 的 sp 规则一致）。"""
    s = ""
    for i, t in enumerate(tokens):
        if i and (LATIN.match(t) or LATIN.match(tokens[i - 1])):
            s += " "
        s += t
    return s


# ============================== 文本：分词 / 繁转简 / 数字读法 ==============================
UNIT = re.compile(r"[A-Za-z][A-Za-z0-9]*(?:['’][A-Za-z]+)?|[0-9]+(?:\.[0-9]+)?%?|[㐀-鿿豈-﫿]")
CJK = re.compile(r"[㐀-鿿豈-﫿]")
NUM = re.compile(r"^[0-9]+(?:\.[0-9]+)?%?$")
ALPHA = re.compile(r"^[A-Za-z][A-Za-z0-9]*(?:['’][A-Za-z]+)?$")   # 英文词（含 MP4 / H264 这类字母开头的字母数字词）

_T2S_PAIRS = (
    "這这 個个 們们 來来 說说 時时 會会 為为 對对 發发 開开 後后 過过 還还 當当 動动 體体 點点 電电 腦脑 視视 頻频 話话 請请 讓让 與与 從从 "
    "進进 經经 樣样 種种 關关 麼么 問问 題题 長长 頭头 實实 現现 學学 習习 應应 該该 聽听 寫写 錄录 製制 輯辑 軟软 術术 標标 記记 號号 碼码 網网 "
    "絡络 設设 計计 畫画 圖图 書书 條条 總总 結结 將将 給给 覺觉 見见 專专 業业 風风 廣广 場场 聲声 費费 務务 獲获 據据 導导 師师 課课 準准 備备 "
    "擊击 轉转 換换 變变 機机 優优 質质 單单 雙双 車车 門门 東东 鳥鸟 魚鱼 馬马 龍龙 萬万 豐丰 麗丽 舉举 義义 鄉乡 買买 賣卖 亂乱 爭争 於于 雲云 "
    "亞亚 產产 價价 眾众 傳传 億亿 內内 兩两 軍军 農农 處处 則则 創创 劃划 劇剧 勞劳 勢势 區区 協协 員员 啟启 團团 園园 圍围 壞坏 壓压 夠够 夢梦 "
    "奪夺 寧宁 寶宝 尋寻 層层 屬属 島岛 幣币 帶带 幫帮 幹干 庫库 張张 強强 彈弹 態态 懷怀 戰战 戲戏 擇择 擔担 掃扫 擁拥 擴扩 數数 斷断 暫暂 極极 "
    "構构 樹树 橋桥 權权 歡欢 歲岁 歷历 歸归 殺杀 氣气 決决 沒没 況况 淨净 測测 濟济 滅灭 滿满 漢汉 熱热 營营 燈灯 獨独 環环 畢毕 療疗 盡尽 監监 "
    "盤盘 確确 稱称 穩稳 積积 競竞 筆笔 範范 簡简 類类 紀纪 約约 紅红 級级 純纯 紙纸 組组 細细 終终 統统 絕绝 綠绿 維维 緊紧 線线 練练 績绩 續续 "
    "羅罗 聯联 職职 臉脸 興兴 舊旧 藝艺 節节 華华 葉叶 蘇苏 衛卫 補补 裝装 複复 規规 親亲 觀观 訂订 討讨 訓训 許许 評评 試试 詩诗 詳详 認认 語语 "
    "誤误 誰谁 調调 談谈 論论 謝谢 識识 證证 譯译 議议 讀读 負负 財财 貨货 責责 貴贵 貼贴 資资 賞赏 購购 賽赛 趕赶 較较 載载 輕轻 輪轮 輸输 辦办 "
    "邊边 遠远 運运 連连 達达 選选 遺遗 郵邮 醫医 釋释 錢钱 錯错 鍵键 鏡镜 閉闭 間间 閱阅 際际 陣阵 陸陆 隊队 階阶 隨随 險险 雜杂 離离 難难 靜静 "
    "響响 頁页 頂顶 項项 順顺 須须 預预 領领 額额 顏颜 願愿 顯显 飛飞 飯饭 館馆 驗验 鬥斗 齊齐 嗎吗 衹只 隻只 臺台 檔档 鍊链 雖虽 腳脚 夥伙 夾夹 "
    "豬猪 貓猫 歐欧 爾尔 彙汇 錶表 鐘钟 塊块 讚赞 剛刚 鬆松 戶户 罷罢 擬拟 獻献 憑凭 傑杰 勁劲 匯汇 幾几 惡恶 愛爱 戀恋 搶抢 搖摇 攝摄 敵敌 曉晓 "
    "檢检 歎叹 毀毁 溝沟 濾滤 煩烦 牽牵 猶犹 禮礼 穀谷 竊窃 籤签 紋纹 紛纷 絲丝 綁绑 緩缓 縮缩 繫系 繼继 罰罚 聞闻 膽胆 艱艰 蓋盖 薦荐 蘭兰 蝦虾 "
    "衆众 襯衬 診诊 詞词 誌志 誕诞 誠诚 誼谊 謀谋 謂谓 講讲 譜谱 護护 賬账 賴赖 跡迹 蹤踪 軸轴 輔辅 轟轰 辭辞 迴回 適适 遲迟 邏逻 釣钓 鈕钮 銀银 "
    "銷销 鋪铺 鎖锁 鑰钥 闆板 隱隐 雞鸡 霧雾 韓韩 頒颁 頓顿 顧顾 颱台 餘余 騰腾 驚惊 髒脏 鬧闹 鹽盐 麵面 黨党 齡龄 儘尽 嚴严 圓圆 墊垫 壇坛 奧奥 "
    "孫孙 屆届 嶺岭 帳帐 廳厅 徵征 憶忆 掛挂 揮挥 損损 撥拨 擾扰 攜携 敗败 暢畅 曆历 槍枪 樂乐 殘残 漲涨 漸渐 灣湾 災灾 燒烧 爺爷 牆墙 狀状 獎奖 "
    "疊叠 祕秘 禍祸 稅税 窮穷 糾纠 紹绍 綜综 綱纲 縱纵 繞绕 聖圣 聰聪 腫肿 膚肤 莊庄 蔣蒋 藥药 虧亏 襲袭 覽览 觸触 訊讯 訪访 詢询 誇夸 誘诱 諾诺 "
    "謊谎 譽誉 豈岂 貢贡 貿贸 賀贺 賦赋 賺赚 贈赠 贊赞 躍跃 軌轨 輛辆 違违 遞递 鈴铃 錦锦 鍋锅 鎮镇 鐵铁 鑽钻 閃闪 闖闯 陰阴 陽阳 靈灵 韻韵 頌颂 "
    "餅饼 驅驱 驕骄 鬍胡 鳳凤 黴霉 齒齿 髮发 準准 範范 眾众 啓启 剪剪"
)
T2S_BUILTIN = {p[0]: p[1] for p in _T2S_PAIRS.split() if len(p) == 2}


def make_t2s():
    """繁转简：opencc → zhconv → 内置高频表（逐字转换，保证一字对一字、时间不动）。"""
    try:
        import opencc  # opencc / opencc-python-reimplemented
        cc = opencc.OpenCC("t2s")
        return (lambda ch: cc.convert(ch) if len(cc.convert(ch)) == 1 else ch), "opencc"
    except Exception:
        pass
    try:
        import zhconv
        return (lambda ch: zhconv.convert(ch, "zh-cn") if len(zhconv.convert(ch, "zh-cn")) == 1 else ch), "zhconv"
    except Exception:
        pass
    return (lambda ch: T2S_BUILTIN.get(ch, ch)), "builtin"


_DIG = "零一二三四五六七八九"


def num_reading(tok):
    """阿拉伯数字 → 普通话读法（12→十二、30→三十、3.5→三点五、50%→百分之五十），用于比对。"""
    pct = tok.endswith("%")
    t = tok.rstrip("%")
    ip, _, dp = t.partition(".")

    def four(n):
        s, zero = "", False
        for v, u in ((1000, "千"), (100, "百"), (10, "十"), (1, "")):
            d = n // v % 10
            if d:
                if zero:
                    s += "零"
                s += _DIG[d] + u
                zero = False
            elif s:
                zero = True
        return s

    n = int(ip) if ip else 0
    if n == 0:
        r = "零"
    elif n >= 10 ** 8 or len(ip) > 9:
        r = "".join(_DIG[int(c)] for c in ip)
    else:
        hi, lo = divmod(n, 10000)
        r = (four(hi) + "万" + ("零" if 0 < lo < 1000 else "") + four(lo)) if hi else four(lo)
        if r.startswith("一十"):
            r = r[1:]
    if dp:
        r += "点" + "".join(_DIG[int(c)] for c in dp)
    return ("百分之" + r) if pct else r


def keys_of(text):
    """一个显示单位的比对键：中文单字（两→二）/ 英文小写整词 / 数字展开成读法的若干字。"""
    if NUM.match(text):
        return [("二" if c == "两" else c) for c in num_reading(text)]
    if ALPHA.match(text):
        return [text.lower()]
    return [("二" if c == "两" else c) for c in text]


def tokenize(text, t2s=None):
    out = [m.group(0) for m in UNIT.finditer(text or "")]
    if t2s:
        out = [t2s(t) if CJK.fullmatch(t) else t for t in out]
    return out


def clean_script(raw):
    """文稿 → 口播文字：去掉 Markdown 标题行、【舞台说明】、** 加粗、> 引用和列表符号。"""
    lines = []
    for ln in raw.splitlines():
        s = ln.strip()
        if not s or s.startswith("#"):
            continue
        s = re.sub(r"【[^】]*】", "", s)
        s = re.sub(r"[*_`>]+", "", s)
        s = re.sub(r"^\s*([-+•]|\d+[.、)])\s+", "", s)
        if s.strip():
            lines.append(s.strip())
    return "\n".join(lines)


def script_terms(text, limit=24):
    """从文稿提取专有名词（英文 / 数字混合词，如 Claude Code、CLAUDE.md、WorkBuddy、JSON、Skill）。"""
    terms = []
    for m in re.finditer(r"[A-Za-z][A-Za-z0-9.+#_\-]*(?:[ ][A-Z][A-Za-z0-9.+#_\-]*)*", text):
        t = m.group(0).strip(" .-")
        if len(t) >= 2 and t not in terms:
            terms.append(t)
    return terms[:limit]


# ============================== 音频 ==============================
VIDEO_EXT = {".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v"}


def run_ffmpeg(args):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg 失败：{r.stderr.strip()[:300]}")


def load_16k(src, tmpdir):
    wav16 = Path(tmpdir) / "asr_16k_mono.wav"
    run_ffmpeg(["-i", str(src), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav16)])
    import numpy as np
    with wave.open(str(wav16)) as wf:
        a = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16)
    return a.astype(np.float32) / 32768.0


def media_duration(src):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip().split()[0])
    except Exception:
        return None


# ============================== 识别 ==============================
def load_model(name, device, model_dir, offline):
    from faster_whisper import WhisperModel
    kw = {"download_root": model_dir} if model_dir else {}
    if offline:
        kw["local_files_only"] = True
    tries = [("cuda", "float16"), ("cpu", "int8")] if device == "auto" else [(device, "float16" if device == "cuda" else "int8")]
    err = None
    for dev, ct in tries:
        try:
            m = WhisperModel(name, device=dev, compute_type=ct, cpu_threads=os.cpu_count() or 4, **kw)
            if dev == "cuda":   # 能加载不代表能推理（常见：缺 cublas64_12.dll / cuDNN），先用 1 秒静音试跑
                import numpy as np
                segs, _ = m.transcribe(np.zeros(16000, dtype=np.float32), language="en", beam_size=1)
                list(segs)
            return m, dev, ct
        except Exception as e:  # 没有 CUDA / 缺 cuBLAS、cuDNN → 退回 CPU
            err = e
            if dev == "cuda":
                print(f"[align] CUDA 不可用（{str(e)[:90]}），改用 CPU int8（要用 GPU：pip install nvidia-cublas-cu12 nvidia-cudnn-cu12）", flush=True)
    raise err


def transcribe(model, audio, language, prompt):
    segs, info = model.transcribe(audio, language=language, word_timestamps=True, vad_filter=False,
                                  initial_prompt=prompt or None, condition_on_previous_text=False,
                                  beam_size=5, temperature=0.0)
    words = []
    for s in segs:
        for w in s.words or []:
            words.append({"w": w.word, "start": float(w.start), "end": float(w.end), "p": float(w.probability)})
    return words, info


def words_to_units(words, t2s):
    """识别词 → 显示单位：中文逐字（多字词时间均分）、英文整词、数字整块。
    英文常被拆成碎片（"C" "la" "ude、" "Work" …）：只有「没有前导空格、上一个词也没以标点结尾、间隔 <0.3s」时才拼回同一个词；
    字母词后面紧跟的数字碎片（"MP" "4"）也拼成一个词（MP4）。"""
    units, prev_raw = [], " "
    for w in words:
        raw = w["w"]
        toks = tokenize(raw, t2s)
        if not toks:
            prev_raw = raw or prev_raw
            continue
        d = max(w["end"] - w["start"], 0.0) / len(toks)
        glued = not raw.startswith(" ") and not re.search(r"[^\w]$", prev_raw)   # 上一个词以标点 / 空白结尾 = 词边界
        for i, t in enumerate(toks):
            u = {"text": t, "start": w["start"] + d * i, "end": w["start"] + d * (i + 1)}
            if (i == 0 and glued and units and ALPHA.match(units[-1]["text"]) and (ALPHA.match(t) or t.isdigit())
                    and u["start"] - units[-1]["end"] < 0.3):
                units[-1]["text"] += t
                units[-1]["end"] = u["end"]
                continue
            units.append(u)
        prev_raw = raw
    return units


# ============================== 文稿保守纠错 ==============================
def make_homophone():
    try:
        from pypinyin import pinyin, Style

        def same(a, b):
            if a == b:
                return True
            pa = set(pinyin(a, style=Style.NORMAL, heteronym=True)[0])
            pb = set(pinyin(b, style=Style.NORMAL, heteronym=True)[0])
            return bool(pa & pb)
        return same, True
    except Exception:
        return None, False


def split_glued_latin(units, script_text):
    """识别偶尔把相邻英文词粘成一个（"Cloud"+"Work"+"Body" → CloudWorkBody）。只在给了文稿时处理：
    在大小写交界处试切，切出的每一段都要和文稿里某个英文词拼写相似（≥0.6），且比不切更像，才拆开；时间按字母数分。"""
    from itertools import combinations
    terms = sorted({t for t in tokenize(script_text) if ALPHA.match(t)}, key=str.lower)
    if not terms:
        return units, []
    low = [t.lower() for t in terms]
    def sim(x):   # 拼写相似度；长度差太多（多粘了一个词）直接判不像
        return max((difflib.SequenceMatcher(None, x.lower(), t).ratio() if 0.7 <= len(x) / len(t) <= 1.4 else 0.0) for t in low)
    out, logs = [], []
    for u in units:
        t = u["text"]
        pieces = re.findall(r"[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+", t) if ALPHA.match(t) else []
        if len(pieces) < 2 or len(pieces) > 6 or t.lower() in low or "".join(pieces) != t:
            out.append(u)
            continue
        best, best_score = None, sim(t)
        for k in range(1, len(pieces)):
            for cuts in combinations(range(1, len(pieces)), k):
                b = [0, *cuts, len(pieces)]
                segs = ["".join(pieces[b[i]:b[i + 1]]) for i in range(len(b) - 1)]
                score = min(sim(x) for x in segs)
                if score >= 0.6 and score > best_score + 0.05:
                    best, best_score = segs, score
        if not best:
            out.append(u)
            continue
        dur, pos = u["end"] - u["start"], 0
        for x in best:
            out.append({"text": x, "start": u["start"] + dur * pos / len(t), "end": u["start"] + dur * (pos + len(x)) / len(t)})
            pos += len(x)
        logs.append({"from": t, "to": " ".join(best), "start": round(u["start"], 3), "end": round(u["end"], 3), "type": "英文断词"})
    return out, logs


def correct_with_script(units, script_text, t2s, homophone):
    """只改「前后各 ≥2 个字都对得上、中间一字对一字」的同音错字；数字读法统一成文稿的阿拉伯数字；英文大小写按文稿。
    字数不一样的地方（多念 / 少念 / 改口）一律以实际念的为准。"""
    stoks = tokenize(script_text, t2s)
    T, TU, u_rng = [], [], []
    for ui, u in enumerate(units):
        ks = keys_of(u["text"])
        u_rng.append((len(T), len(T) + len(ks)))
        T += ks
        TU += [ui] * len(ks)
    S, ST, s_rng = [], [], []
    for si, tok in enumerate(stoks):
        ks = keys_of(tok)
        s_rng.append((len(S), len(S) + len(ks)))
        S += ks
        ST += [si] * len(ks)
    corrections = []
    if not T or not S:
        return units, corrections
    ops = difflib.SequenceMatcher(None, T, S, autojunk=False).get_opcodes()
    replace_units = {}   # unit idx → 新文字
    merges = []          # (unit idx 列表, 新文字, 类型)
    for oi, (tag, a0, a1, b0, b1) in enumerate(ops):
        if tag == "equal":
            # 文稿里一个 token 的全部键都落在这段 equal 里，且对面那几个识别单位的键也全部落在里面 → 检查数字写法 / 英文大小写
            for si in sorted(set(ST[b0:b1])):
                lo, hi = s_rng[si]
                if lo < b0 or hi > b1:
                    continue
                ta, tb = a0 + (lo - b0), a0 + (hi - b0)
                us = sorted(set(TU[ta:tb]))
                if any(u_rng[u][0] < ta or u_rng[u][1] > tb for u in us):
                    continue
                cur, tgt = "".join(units[u]["text"] for u in us), stoks[si]
                if cur == tgt:
                    continue
                if NUM.match(tgt) and all(CJK.fullmatch(units[u]["text"]) for u in us):
                    merges.append((us, tgt, "数字写法"))
                elif ALPHA.match(tgt) and len(us) == 1 and cur.lower() == tgt.lower():
                    replace_units[us[0]] = (tgt, "英文大小写")
        elif tag == "replace":
            if not (0 < oi < len(ops) - 1):
                continue
            pt, nt = ops[oi - 1], ops[oi + 1]
            if pt[0] != "equal" or nt[0] != "equal" or pt[2] - pt[1] < 2 or nt[2] - nt[1] < 2:
                continue
            if (a1 - a0) != (b1 - b0):
                continue   # 字数不同：多念 / 少念 / 改口 → 以实际为准
            # 一字对一字：逐对判断，只换「同音」的那几对（中文按拼音、英文按拼写相似度 ≥0.6），其余保持实际念的
            for q in range(a1 - a0):
                ui, si = TU[a0 + q], ST[b0 + q]
                ut, st = units[ui]["text"], stoks[si]
                if len(keys_of(ut)) != 1 or len(keys_of(st)) != 1 or NUM.match(ut) or NUM.match(st):
                    continue
                if CJK.fullmatch(ut) and CJK.fullmatch(st):
                    ok = homophone is not None and homophone(ut, st)
                elif ALPHA.match(ut) and ALPHA.match(st):
                    ok = difflib.SequenceMatcher(None, ut.lower(), st.lower()).ratio() >= 0.6
                else:
                    ok = False
                if ok:
                    replace_units[ui] = (st, "同音错字" if CJK.fullmatch(st) else "英文拼写")
    for ui, (txt, kind) in replace_units.items():
        u = units[ui]
        corrections.append({"from": u["text"], "to": txt, "start": round(u["start"], 3), "end": round(u["end"], 3), "type": kind})
        u["text"] = txt
    drop = set()
    for us, txt, kind in merges:
        a, b = units[us[0]], units[us[-1]]
        corrections.append({"from": "".join(units[u]["text"] for u in us), "to": txt, "start": round(a["start"], 3),
                            "end": round(b["end"], 3), "type": kind})
        a["text"], a["end"] = txt, b["end"]
        drop.update(us[1:])
    units = [u for i, u in enumerate(units) if i not in drop]
    corrections.sort(key=lambda c: c["start"])
    return units, corrections


# ============================== 时间精修 ==============================
def energy_refine(units, audio):
    """音量曲线修正停顿前后的字（照已上线项目的 refine.py 做法）：切掉字内首尾 ≥0.2s 静音、字内 ≥0.25s 静音处截断、
    停顿后首字往前找真正开口的位置。中间的字不动。"""
    import numpy as np
    hop = 160
    n = len(audio) // hop
    if n < 10 or not units:
        return 0
    e = 10 * np.log10(np.mean(audio[: n * hop].reshape(n, hop).astype(float) ** 2, 1) + 1e-12)
    floor = float(np.percentile(e[e > -100], 10)) if (e > -100).sum() > 100 else float(np.percentile(e, 10))
    thr = floor + 0.5 * (float(np.percentile(e, 90)) - floor)
    on = e > thr
    fixed = 0
    for u in units:
        a, b = int(round(u["start"] * 100)), int(round(u["end"] * 100))
        seg = on[a:b]
        if len(seg) == 0 or not seg.any():
            continue
        nz = np.flatnonzero(seg)
        lead, trail = int(nz[0]), int(len(seg) - 1 - nz[-1])
        if lead >= 20:
            u["start"] = (a + lead) / 100
            fixed += 1
        if trail >= 20:
            u["end"] = (b - trail) / 100
            fixed += 1
    for i, u in enumerate(units[:-1]):
        a, b = int(round(u["start"] * 100)), int(round(u["end"] * 100))
        seg = on[a:b]
        if not seg.any():
            continue
        k, run = int(np.flatnonzero(seg)[0]), 0
        for j in range(k, len(seg)):
            run = run + 1 if not seg[j] else 0
            if run >= 25:
                cut = a + j - run + 1
                after = np.flatnonzero(seg[j:])
                u["end"] = cut / 100
                fixed += 1
                if len(after):
                    units[i + 1]["start"] = min(units[i + 1]["start"], (a + j + after[0]) / 100)
                break
    for i, u in enumerate(units):
        prev_end = units[i - 1]["end"] if i else 0
        if u["start"] - prev_end > 0.25 or u["end"] - u["start"] < 0.03:
            lo = int(max(u["start"] - 0.8, prev_end) * 100)
            hi = int((u["start"] + 0.3) * 100)
            w = on[max(lo - 1, 0):hi]
            rise = np.flatnonzero(w[1:] & ~w[:-1]) if len(w) > 1 else []
            if len(rise):
                new = (max(lo - 1, 0) + rise[0] + 1) / 100
                if abs(new - u["start"]) > 0.03:
                    u["start"] = min(new, u["end"] - 0.05) if u["end"] - new > 0.05 else new
                    fixed += 1
            if u["end"] <= u["start"]:
                u["end"] = u["start"] + 0.08
    for u, v in zip(units, units[1:]):
        if u["end"] > v["start"]:
            u["end"] = max(v["start"], u["start"])
    return fixed


def fix_short(units, min_len=0.05, phrase_gap=0.3):
    """时长 < 0.05s 的字和同一句里的相邻字均分时间（照已上线项目的 fix_short，"同一块"改为"停顿 <0.3s 的同一句"）。"""
    same = lambda i, j: abs(units[j]["start"] - units[i]["end"]) < phrase_gap if j > i else abs(units[i]["start"] - units[j]["end"]) < phrase_gap
    n, i = 0, 0
    while i < len(units):
        if units[i]["end"] - units[i]["start"] >= min_len:
            i += 1
            continue
        j = i
        while j + 1 < len(units) and units[j + 1]["end"] - units[j + 1]["start"] < min_len and same(j, j + 1):
            j += 1
        lo, hi, side = i, j, 0
        while units[hi]["end"] - units[lo]["start"] < 0.06 * (hi - lo + 1) or (hi == j and lo == i):
            can_r = hi + 1 < len(units) and same(hi, hi + 1)
            can_l = lo - 1 >= 0 and same(lo - 1, lo)
            if not (can_r or can_l):
                break
            if (side % 2 == 0 and can_r) or not can_l:
                hi += 1
            else:
                lo -= 1
            side += 1
        a, b, grp = units[lo]["start"], units[hi]["end"], units[lo:hi + 1]
        if b - a >= 0.06 * len(grp):
            step = (b - a) / len(grp)
            for q, u in enumerate(grp):
                u["start"], u["end"] = a + q * step, a + (q + 1) * step
            n += j - i + 1
        i = max(hi, j) + 1
    return n


def ckeys(text):
    """逐字符键（英文也拆成字母）：强制对齐器怎么切词都不影响回填。"""
    return [c for t in tokenize(text) for c in t.lower()]


def stable_refine(units, audio, args, device, compute_type):
    """可选：stable-ts 按最终文字做强制对齐（照已上线项目的做法：按停顿 ≥1s 分块、窗口外扩 0.3s、数字按读法对齐）。"""
    try:
        import stable_whisper
    except Exception:
        print("[align] --refine 需要 stable-ts（pip install stable-ts，会连带安装 PyTorch 约 0.5–2 GB）；本机未安装，已跳过强制对齐。", flush=True)
        return 0
    kw = {"download_root": args.model_dir} if args.model_dir else {}
    if args.offline:
        kw["local_files_only"] = True
    model = stable_whisper.load_faster_whisper(args.model, device=device, compute_type=compute_type, **kw)
    sr = 16000
    blocks, cur = [], [0]
    for i in range(1, len(units)):
        if units[i]["start"] - units[i - 1]["end"] >= 1.0 or units[i]["end"] - units[cur[0]]["start"] > 25:
            blocks.append(cur)
            cur = []
        cur.append(i)
    blocks.append(cur)
    done = 0
    for blk in blocks:
        us = [units[i] for i in blk]
        a = max(0.0, us[0]["start"] - 0.3)
        b = min(len(audio) / sr, us[-1]["end"] + 0.3)
        parts = [num_reading(u["text"]) if NUM.match(u["text"]) else u["text"] for u in us]
        text = display(parts)
        try:
            clip = audio[int(a * sr):int(b * sr)]
            try:
                res = model.align(clip, text, language=args.language, verbose=None)
            except TypeError:
                res = model.align(clip, text, language=args.language)
        except Exception as e:
            print(f"[align] 强制对齐失败（{a:.1f}–{b:.1f}s），保留识别时间：{str(e)[:80]}", flush=True)
            continue
        flat = []   # (键, start, end)
        for s in res.segments:
            for w in s.words:
                ks = ckeys(w.word)
                if not ks:
                    continue
                d = (w.end - w.start) / len(ks)
                flat += [(k, w.start + d * q + a, w.start + d * (q + 1) + a) for q, k in enumerate(ks)]
        need = []
        for ui, p in zip(blk, parts):
            need.append((ui, len(ckeys(p))))
        if sum(n for _, n in need) != len(flat):
            print(f"[align] 强制对齐结果与文字对不上（{a:.1f}–{b:.1f}s），保留识别时间", flush=True)
            continue
        if flat[-1][2] - flat[0][1] < 0.08 * len(us):   # 挤成一团（极短的块常见）
            print(f"[align] 强制对齐挤成一团（{a:.1f}–{b:.1f}s），保留识别时间", flush=True)
            continue
        q = 0
        for ui, n in need:
            units[ui]["start"], units[ui]["end"] = flat[q][1], flat[q + n - 1][2]
            q += n
        done += len(us)
    return done


def finalize(units, duration):
    out, prev = [], 0.0
    for u in units:
        s = max(u["start"], prev, 0.0)
        e = min(u["end"], duration) if duration else u["end"]
        if e <= s:
            e = s + 0.04
        out.append([u["text"], round(s, 3), round(e, 3)])
        prev = s
    return out


# ============================== 模式 B：回填剧本 ==============================
def scene_text(sc):
    """草稿文字：优先 sc.sub（字幕行）；没有 sub 时依次取 sc.text、sc.script；都没有 = 无口播段。"""
    for k in ("sub", "text", "script"):
        v = sc.get(k)
        if isinstance(v, list) and any(str(x).strip() for x in v):
            return k, [str(x) for x in v if str(x).strip()]
        if isinstance(v, str) and v.strip():
            return k, [v.strip()]
    return None, []


def key_chars(s):
    out = []
    for t in tokenize(s):
        out += keys_of(t) if (NUM.match(t) or CJK.fullmatch(t)) else [t.lower()]
    return out


def inject(draft, words, audio_rel, duration, warn):
    scenes = draft.get("scenes") or []
    texts = [scene_text(sc) for sc in scenes]
    voiced = [i for i, (_, t) in enumerate(texts) if t]
    W = [list(w) for w in words]
    assign = {i: [] for i in range(len(scenes))}
    if voiced and W:
        L = map_lines([" ".join(texts[i][1]) for i in voiced], W, key=key_chars)
        if L is None:
            warn("全片草稿文字与识别结果完全对不上，未回填任何段")
        else:
            for wi, li in enumerate(L):
                assign[voiced[li]].append(W[wi])
    # 对不上的段：打印段号 + 原文
    for i in voiced:
        src = " ".join(texts[i][1])
        sk, wk = key_chars(src), [k for w in assign[i] for k in key_chars(w[0])]
        ratio = difflib.SequenceMatcher(None, sk, wk, autojunk=False).ratio() if sk and wk else 0.0
        if not assign[i]:
            warn(f"第 {i + 1} 段草稿文字在口播里找不到，保持原时长：{src[:40]}")
        elif ratio < 0.6:
            warn(f"第 {i + 1} 段草稿与实际念的差异较大（相似度 {ratio:.2f}）：草稿「{src[:30]}」/ 实际「{display([w[0] for w in assign[i]])[:30]}」")
    ms = lambda t: int(round(t * 1000))
    has = [i for i in range(len(scenes)) if assign[i]]
    total = ms(max(w[2] for w in W)) if W else 0
    cursor = 0
    for i, sc in enumerate(scenes):
        start = cursor
        if assign[i]:
            first, last = ms(assign[i][0][1]), ms(assign[i][-1][2])
            nxt = next((j for j in has if j > i), None)
            if nxt is None:
                # 最后一个口播段：后面还有无口播段（片尾）→ 留 0.3–0.6s 尾音再接片尾；否则一直延到音轨结束
                end = (last + max(300, min(600, ms(duration) - last))) if i < len(scenes) - 1 else max(ms(duration), last + 300)
            else:
                gap_start = ms(assign[nxt][0][1])
                silent = sum(ms(float(scenes[k].get("dur") or 6)) for k in range(i + 1, nxt))
                if silent:
                    end = last + max(300, min(600, (gap_start - last - silent) // 2))
                    if silent > gap_start - last - 300:
                        warn(f"第 {i + 2}–{nxt} 段无口播（共 {silent / 1000:.2f}s），但音频此处停顿只有 {(gap_start - last) / 1000:.2f}s，后续画面会晚于口播")
                else:
                    end = (last + gap_start) // 2
            end = max(end, start + 500, last)
            if first < start - 1000:
                warn(f"第 {i + 1} 段的口播从 {first / 1000:.2f}s 开始，早于本段起点 {start / 1000:.2f}s（前面的无口播段太长）")
            sc["words"] = [[w[0], w[1], w[2]] for w in assign[i]]
            src_key, lines = texts[i]
            groups = group_lines(assign[i], lines if src_key == "sub" else None)
            sc["sub"] = [display([w[0] for w in g]) for g in groups]
        else:
            end = start + ms(float(sc.get("dur") or 6))
            sc.pop("words", None)
        sc["start"] = round(start / 1000, 3)
        sc["dur"] = round((end - start) / 1000, 3)
        cursor = end
    meta = draft.setdefault("meta", {})
    old = meta.get("audio")
    meta["audio"] = audio_rel
    if old and (old if isinstance(old, str) else old.get("src")) != audio_rel:
        warn(f"meta.audio 由 {old} 改为 {audio_rel}")
    return draft, total


# ============================== 输出 ==============================
def dump_json(obj, path):
    """紧凑可读：标量列表（如 ["字", 0.12, 0.28]）写在一行。"""
    def enc(o, ind):
        pad, pad2 = "  " * ind, "  " * (ind + 1)
        if isinstance(o, dict):
            if not o:
                return "{}"
            return "{\n" + ",\n".join(f"{pad2}{json.dumps(k, ensure_ascii=False)}: {enc(v, ind + 1)}" for k, v in o.items()) + f"\n{pad}}}"
        if isinstance(o, list):
            if all(not isinstance(x, (dict, list)) for x in o):
                return json.dumps(o, ensure_ascii=False)
            if all(isinstance(x, list) and all(not isinstance(y, (dict, list)) for y in x) for x in o):
                return "[\n" + ",\n".join(pad2 + json.dumps(x, ensure_ascii=False) for x in o) + f"\n{pad}]"
            return "[\n" + ",\n".join(pad2 + enc(x, ind + 1) for x in o) + f"\n{pad}]"
        return json.dumps(o, ensure_ascii=False)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(enc(obj, 0) + "\n", encoding="utf-8")


def rel_url(target, base_dir):
    try:
        return os.path.relpath(Path(target).resolve(), Path(base_dir).resolve()).replace("\\", "/")
    except ValueError:   # 不同盘符
        return Path(target).resolve().as_posix()


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="口播对齐：音/视频 → 同源逐字 words + sub（模式 A）或回填剧本（模式 B）")
    ap.add_argument("--input", required=True, help="口播音/视频：.wav .mp3 .m4a .mp4 .mkv .mov …（必须是最终播放 / 导出用的音轨）")
    ap.add_argument("--out", required=True, help="输出 JSON（模式 A：aligned.json；模式 B：回填后的剧本）")
    ap.add_argument("--script", default=None, help="可选文稿 .txt：提取专有名词做提示词 + 保守纠正同音错字")
    ap.add_argument("--inject", default=None, help="模式 B：草稿剧本 JSON，回填每段 start / dur / words / sub 与 meta.audio")
    ap.add_argument("--page-dir", default=None, help="meta.audio 的相对基准 = 模板页面目录（默认 = --out 所在目录；剧本放在风格包目录里时无需设置）")
    ap.add_argument("--extract-audio", default=None, help="另存 48kHz 立体声 WAV 作为 meta.audio（视频输入时默认存到 --out 同目录）")
    ap.add_argument("--model", default="medium", help="faster-whisper 模型名或本地目录（默认 medium）")
    ap.add_argument("--model-dir", default=None, help="模型缓存目录（不填则用 HF_HOME / 默认缓存）")
    ap.add_argument("--offline", action="store_true", help="只用本地已有模型，不联网（local_files_only）")
    ap.add_argument("--language", default="zh")
    ap.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"], help="auto：有 CUDA 用 float16，否则 CPU int8")
    ap.add_argument("--prompt", default=None, help="覆盖默认 initial_prompt（一句说明 + 专有名词表）")
    ap.add_argument("--terms", default="", help="额外专有名词，逗号分隔（会并入提示词）")
    ap.add_argument("--refine", action="store_true", help="可选：stable-ts 强制对齐（需 pip install stable-ts，连带 PyTorch）")
    ap.add_argument("--no-energy", action="store_true", help="关闭音量曲线精修（仅用于对比）")
    ap.add_argument("--raw-out", default=None, help="调试：另存 faster-whisper 原始词级结果 JSON")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        print("[align] 需要 ffmpeg：请安装后加入 PATH（https://ffmpeg.org/download.html）")
        sys.exit(2)
    try:
        import faster_whisper  # noqa: F401
        import numpy  # noqa: F401
    except Exception:
        print("[align] 需要 faster-whisper：pip install faster-whisper")
        sys.exit(2)

    src = Path(args.input)
    if not src.is_file():
        print(f"[align] 找不到输入文件：{src}")
        sys.exit(2)
    out = Path(args.out)
    page_dir = Path(args.page_dir) if args.page_dir else out.parent
    t2s, t2s_name = make_t2s()
    homophone, has_py = make_homophone()
    t_all = time.time()

    play_audio = src
    if src.suffix.lower() in VIDEO_EXT or args.extract_audio:
        play_audio = Path(args.extract_audio) if args.extract_audio else out.parent / f"{src.stem}_48k.wav"
        play_audio.parent.mkdir(parents=True, exist_ok=True)
        run_ffmpeg(["-i", str(src), "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", str(play_audio)])
        print(f"[align] 已导出 48kHz 立体声音轨：{play_audio}", flush=True)
    duration = media_duration(play_audio)

    script_text, terms = "", [t.strip() for t in args.terms.split(",") if t.strip()]
    if args.script:
        script_text = clean_script(Path(args.script).read_text(encoding="utf-8"))
        terms += [t for t in script_terms(script_text) if t not in terms]
    if args.prompt is not None:
        prompt = args.prompt
    else:
        prompt = "以下是普通话口播，简体中文，带标点。" if args.language.startswith("zh") else ""
        if terms:
            prompt += "会提到：" + "、".join(terms[:24]) + "。"

    with tempfile.TemporaryDirectory(prefix="mh_align_") as tmp:
        audio = load_16k(src, tmp)
    duration = duration or len(audio) / 16000
    t0 = time.time()
    model, device, ctype = load_model(args.model, args.device, args.model_dir, args.offline)
    t_load = time.time() - t0
    t0 = time.time()
    raw, info = transcribe(model, audio, args.language, prompt)
    t_asr = time.time() - t0
    if args.raw_out:
        dump_json({"prompt": prompt, "words": [[w["w"], round(w["start"], 3), round(w["end"], 3), round(w["p"], 3)] for w in raw]}, args.raw_out)
    units = words_to_units(raw, t2s)

    corrections = []
    if script_text:
        if not has_py:
            print("[align] 未安装 pypinyin，跳过中文同音错字修正（pip install pypinyin 可启用）；数字写法与英文大小写仍按文稿统一", flush=True)
        units, splits = split_glued_latin(units, script_text)
        units, corrections = correct_with_script(units, script_text, t2s, homophone)
        corrections = sorted(splits + corrections, key=lambda c: c["start"])
    n_refine = stable_refine(units, audio, args, device, ctype) if args.refine else 0
    n_energy = 0 if args.no_energy else energy_refine(units, audio)
    n_short = fix_short(units)
    words = finalize(units, duration)

    audio_rel_out = rel_url(play_audio, out.parent)
    stats = {"model": args.model, "device": f"{device}/{ctype}", "load_s": round(t_load, 1), "asr_s": round(t_asr, 1),
             "total_s": round(time.time() - t_all, 1), "rtf": round(t_asr / duration, 3) if duration else None,
             "t2s": t2s_name, "pinyin": has_py, "stable_ts_refined": n_refine, "energy_fixed": n_energy, "short_fixed": n_short}
    warnings = []

    def warn(msg):
        warnings.append(msg)
        print(f"[align][警告] {msg}", flush=True)

    if args.inject:
        draft = json.loads(Path(args.inject).read_text(encoding="utf-8"))
        audio_rel = rel_url(play_audio, page_dir)
        final, _ = inject(draft, words, audio_rel, duration, warn)
        final.setdefault("meta", {})["align"] = {"tool": f"core/tools/align.py v{VERSION}", "model": args.model,
                                                  "duration": round(duration, 3), "corrections": corrections}
        dump_json(final, out)
        n_sc = sum(1 for sc in final.get("scenes", []) if sc.get("words"))
        print(f"[align] 模式 B：回填 {n_sc}/{len(final.get('scenes', []))} 段，meta.audio = {audio_rel}（相对页面目录 {page_dir}）", flush=True)
    else:
        groups = auto_split([list(w) for w in words], [])
        sub = [display([w[0] for w in g]) for g in groups]
        dump_json({"version": VERSION, "duration": round(duration, 3), "audio": audio_rel_out, "language": args.language,
                   "stats": stats, "prompt": prompt, "corrections": corrections, "sub": sub, "words": words}, out)
        print(f"[align] 模式 A：{len(words)} 个字 / 词，{len(sub)} 行字幕", flush=True)
    print(f"[align] 纠错 {len(corrections)} 处 · 模型 {args.model} · {stats['device']} · 加载 {stats['load_s']}s · 识别 {stats['asr_s']}s"
          f"（实时倍率 {stats['rtf']}）· 精修 {n_energy} · 均分短字 {n_short}" + (f" · 强制对齐 {n_refine} 字" if args.refine else ""), flush=True)
    print(f"[align] 写出 {out}", flush=True)
    print("ALIGN_DONE" + (f" · {len(warnings)} 条警告" if warnings else ""))


if __name__ == "__main__":
    main()
