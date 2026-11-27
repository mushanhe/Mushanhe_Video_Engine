---
name: mushanhe-video-engine
description: mushanhe 视频动效 Skill（Mushanhe Video Engine）——把口播文案或口播视频转成确定性、JSON 驱动的电影级口播视频。12 大电影级流派 × 30 套开箱皮肤，同一份 { meta, theme, scenes } 剧本随时换风格、换皮肤，支持词级字幕同步并一键导出 MP4。用户说“做一条口播视频 / 把这段稿子做成视频 / 换个风格或配色 / 出片”时使用。Use when the user asks to turn a talking-head script or video into a deterministic, JSON-driven cinematic video, switch styles or skins, sync word-level subtitles, or export MP4 (12 styles × 30 skins).
---

> 🌐 **简体中文** | [English](SKILL.en.md)

# Mushanhe Video Engine · v3.3

纯 HTML/CSS/JS，零构建。`core/` 是共享内核（摄影机、字幕、人像、转场），`templates/01_*` ~ `templates/12_*` 是 12 套风格包。
画面按时间确定性渲染：`?t=37.4` 一定是第 37.4 秒，可逐帧验货、可一键导出 1080p / 4K MP4。

## 0. 开工前（每次会话做一次，全部静默，不打扰用户）

1. **更新检查**（本 Skill 唯一的更新入口）：在仓库根目录执行 `python core/tools/check_update.py`。
   - 脚本自己动态读取当前分支和它的上游分支（不写死 `origin/main`）；非 git 目录、detached HEAD、没有上游时输出 `STATUS SKIP`，直接跳过。
   - 一天最多真正联网一次（上次检查时间记在本地 `.mh_update_pref`，已被 `.gitignore` 忽略）；`git fetch` 带 5 秒超时和 `GIT_TERMINAL_PROMPT=0`，超时 / 失败也只输出 `STATUS SKIP`。
   - 只有输出 `STATUS BEHIND N` 时才开口：把脚本列出的更新摘要告诉用户，**问用户是否更新**；用户确认后执行 `git pull --ff-only`。
     若因本地改动导致失败，只提示用户手动 `git stash` 后再试，**严禁** `git reset`。不设自动更新。
2. **环境自检**：`python --version` 与 `ffmpeg -version`（ffmpeg 导出 MP4 和 `align.py` 才需要）；有真人口播要对齐时再查 `python -c "import faster_whisper"`；
   再跑 `python core/tools/smoke_test.py --packs 01_industrial_3d --times 3 --out scratch_verify/selfcheck`，真正启动一次无头浏览器，输出 `SMOKE PASS` 即 Playwright 内核就绪（报找不到浏览器时：`pip install playwright` + `playwright install chromium`）。

## 1. 12 大流派总索引（平权，按文案情绪主动推荐；01–06 各 4 套皮肤 + 07–12 各 1 套 = 30 套）

| 风格包 | 美术气质 | 适合题材 | `?theme=`（首个为默认） |
|---|---|---|---|
| `templates/01_industrial_3d/` | 3D 工业画廊：拉丝金属厚板、磨砂玻璃、橙青点缀、玻璃隔断漫游 | 硬件、数码、工具评测、产品发布 | `pearl` · `obsidian` · `tactical` · `concrete` |
| `templates/02_swiss_print/` | 瑞士国际主义印刷拼贴：网格纸、直角纸片、木尺铅笔 | 方法论、设计、知识科普、理性干货 | `classic` · `bauhaus` · `midnight` · `botanical` |
| `templates/03_investigative_desk/` | 深度调查桌面：切割垫、荧光笔、红丝线、撕边剪报 | 调查、复盘、行业分析、讲故事 | `linen` · `night_desk` · `blueprint` · `newsprint` |
| `templates/04_nodegraph/` | 3D 节点工作流：发光贝塞尔线、脉冲光点、示波器 | AI 工作流、自动化、架构、编程 | `cyber` · `matrix` · `amber_lab` · `daylight` |
| `templates/05_pro_nle/` | Pro NLE 多轨剪辑台：4 轨时间线、逐字波形、视频示波器 | 剪辑教程、创作者工具、影视、流程拆解 | `studio_dark` · `color_grade` · `light_silver` · `broadcast` |
| `templates/06_neobrutalism/` | Neo-Brutalism 撞色潮刊：4px 粗黑边、硬投影、贴纸印章 | 年轻向、观点输出、清单种草、热点 | `zine` · `acid` · `pop_pink` · `mono_ink` |
| `templates/07_chalkboard/` | 学院黑板：墨绿磨砂黑板、彩色粉笔手绘抖动框、逐笔圈勾箭头、黑板擦道具 | 教程、课堂、考试 / 学习方法、理科公式、儿童教育 | 单皮肤（黑板） |
| `templates/08_song_ink/` | 宋韵水墨：宣纸、徽墨、朱砂方印、细墨双框回纹、竖排引题、月洞窗 | 国学、历史、诗词读书、茶文化、非遗、东方品牌 | 单皮肤（宣纸） |
| `templates/09_analog_film/` | 日系胶片杂志：拍立得白边、35mm 齿孔、橙色日期戳、显影动画 | Vlog、生活方式、旅行、摄影、情感、个人成长 | 单皮肤（Portra） |
| `templates/10_retro_crt/` | 复古 CRT 终端：磷光绿荧光屏、扫描线、ASCII 双线框、打字机逐字 | 编程、黑客 / 安全、复古游戏、命令行工具、极客 | 单皮肤（磷光绿） |
| `templates/11_stage_glass/` | 发布会流光玻璃：纯黑舞台、液态毛玻璃 Bento、钛金属标题、极光渐变 | 新品发布、AI 产品、高端科技、融资路演、年度总结 | 单皮肤（极光） |
| `templates/12_fin_terminal/` | 金融数据终端：藏青面板、琥珀功能键、K 线 / sparkline、行情条、评级徽章 | 财经、投资理财、商业分析、数据研报、行业财报 | 单皮肤（终端） |

皮肤情绪速配：
- **01**：`pearl` 明亮专业 · `obsidian` 暗夜高端发布 · `tactical` 户外 / 硬核装备 · `concrete` 冷静建筑 / 企业感
- **02**：`classic` 经典瑞士红 · `bauhaus` 设计史 / 创意 · `midnight` 深夜严肃话题 · `botanical` 自然 / 人文 / 读书
- **03**：`linen` 温和叙事 · `night_desk` 悬疑 / 深夜档案 · `blueprint` 技术档案 / 工程 · `newsprint` 新闻 / 时事
- **04**：`cyber` 默认科技感 · `matrix` 黑客 / 安全 · `amber_lab` 实验 / 风险警示 · `daylight` 白天课堂 / 文档向
- **05**：`studio_dark` 默认非编 · `color_grade` 调色 / 电影感 · `light_silver` 浅色银灰系 · `broadcast` 直播 / 新闻导播
- **06**：`zine` 活泼默认 · `acid` 潮酷 / 夜店 / 游戏 · `pop_pink` 甜美 / 美妆 / 生活 · `mono_ink` 漫画 / 强观点
- **07–12** 无换肤胶囊，选流派即定调：教学感 → 07 · 东方古典 → 08 · 温柔生活 → 09 · 极客复古 → 10 · 高端发布 → 11 · 数据金钱 → 12；
  需要微调颜色时在剧本 `theme` 里写该包 `index.html` 白名单里的颜色键（如 08 的 `{ "cinnabar": "#A61B1B" }`）。
- **推荐口诀**：先看题材匹配「适合题材」列，再看情绪：明亮理性 01/02/09 · 暗夜科技 04/05/10/11/12 · 叙事调查 03 · 年轻冲击 06 · 课堂 07 · 国风 08。

皮肤优先级（01–06）：URL `?theme=` ＞ 剧本 `theme.preset` ＞ 默认皮肤。展厅右上角有换肤胶囊，点击无刷新切换并同步 URL；`H` 隐藏控制栏时一起隐藏。
12 套预览页右上角都有「🎨 切换风格 01–12」一键切换器：自动带上当前 `?data=` 剧本（路径自动换算）和当前播放时间，不带 `?theme=`；
`H` 隐藏控制栏时同步隐藏，`?clean=1`（抽帧 / 导出）与 iframe 嵌入时不出现。
v3.2.2 起 03 / 11 / 12 目录改名为 `03_investigative_desk` / `11_stage_glass` / `12_fin_terminal`（旧目录网址已失效）；05 的皮肤改名为 `studio_dark` / `color_grade` / `light_silver`，v3.2.1 及更早的旧皮肤名在 `?theme=`、`theme.preset`、`meta.themeCues` 里仍自动兼容（映射见 `templates/05_pro_nle/themes.js`）。
01 另有 4 个版式变体（场景里写 `"variant"`）：`cover:blueprint` · `stat:gauge` · `steps:conveyor` · `compare:split`，示例见 `templates/01_industrial_3d/demo_variants.json`。

## 2. 10 大万能口播句型（全部 12 套风格包通用）

| `type` | 用在哪里 |
|---|---|
| `cover` | 开场标题、章节号 |
| `stat` | 数字钩子（数字滚动 + 比例条 + `delta`） |
| `steps` | 3–5 步操作流程 |
| `checklist` | 规则 / 要点逐条打勾 |
| `compare` | 错误做法 vs 正确做法 |
| `timeline` | 版本演进、阶段，「你在这」高亮 |
| `diagram` | 原理 / 架构 / 工作流（节点 + 连线 + 流动脉冲） |
| `showcase` | `kind`: `code` / `terminal` / `doc` / `image` / `video` / `product` |
| `quote` | 全屏人像 + 侧边金句卡（默认贴左，`"pos": "right"` 贴右；不做人脸检测，见第 4 节拍摄约束） |
| `outro` | 行动建议 + 关注 / 开源 CTA |

4 种人像形态（场景 `avatar` 字段）：`card` 侧栏画框 · `pip` 画中画 · `corner` 角落小窗 · `full` 全屏出镜。形态切换自带粒子散聚转场。

## 3. 剧本规范 `{ meta, theme, scenes }`

```json
{
  "meta":  { "title": "片名", "avatar": { "video": "", "bg": "assets/studio_bg.png", "tag": "YOUR NAME" } },
  "theme": { "preset": "obsidian" },
  "scenes": [
    { "type": "cover", "dur": 6, "avatar": "card", "sub": ["这一期我们聊一个问题"],
      "data": { "kicker": "EPISODE 01", "title": "口播视频\n模板化", "subtitle": "一套 **JSON** 剧本驱动" } }
  ]
}
```

- `sub[]` 是这一段的字幕行（自动逐字高亮）；`**关键词**` 在标题里标高亮色；`dur` 单位秒。
- 每种句型的完整 `data` 字段，照抄目标风格包 `demo_data.json` 里对应段落，不要自创字段。
- 剧本放在风格包目录下，用 `?data=my_script.json` 加载；不同风格包字段一致，换风格只换目录（或点右上角切换器）。

**真人素材同步字段（v3.2，全部可选；不写则与原版逐帧一致）**——时间一律是**全片绝对秒**（从第 1 段开头算起，不是本段相对秒）：
- `sc.words`：`[["字", 起始绝对秒, 结束绝对秒], ...]` → 真实词级字幕高亮；不写则回退 `sub[]` 均分。
  分行按本段 `sub[]`：引擎按字比对把每行断点映射到实际念出的词（多念归入最近一行、少念跳过、改口也不串行），映射后超过 14 字再按停顿拆；没有 `sub[]` 时按停顿 ≥0.3s / 每行 ≤14 字自动切。
  相对秒自动纠正**只覆盖一种情况**：第 2 段起（`start > 0`），首词早于段首 0.5s 以上，且整体加上段首后全部落在 `[段首-1s, 段尾+1s]` 内 → 整体平移并 `console.warn`；
  其余情况不改时间，只要还有词落在该区间外就按「段号 + 词序号」`console.warn`。所以请始终写绝对秒，抽帧时留意控制台告警。
- `sc.avatarCues`：`[[绝对秒, "card|pip|corner|full"], ...]` → 一段之内切换人像形态。
- `meta.audio`：`"voice.wav"` 或 `{ "src": "...", "offset": 0, "volume": 1 }` → 人声音轨，播放时作为主时钟。
  ⚠️ **12 套模板的人像 `<video>` 都默认静音，出镜视频自带的音轨不会被使用**：必须用 `meta.audio`（或导出时 `--audio`）提供人声，否则成片无声。
- `meta.themeCues`：`[[绝对秒, "obsidian", "角标文字"], ...]` → 按时间实时换肤（仅 01–06）。

```json
{
  "meta": { "audio": { "src": "voice.wav", "offset": 0, "volume": 1 },
            "themeCues": [[6, "obsidian", "进入夜间模式"]] },
  "scenes": [
    { "type": "cover", "dur": 6, "sub": ["大家好"], "words": [["大", 0.4, 0.6], ["家", 0.6, 0.8], ["好", 0.8, 1.1]] },
    { "type": "stat", "dur": 5, "sub": ["第二段"], "avatarCues": [[8.5, "pip"]],
      "words": [["第", 6.2, 6.4], ["二", 6.4, 6.6], ["段", 6.6, 6.9]] }
  ]
}
```

## 4. 标准 5 步工作流

1. **定风格与皮肤**：问用户想要哪套；没指定就在全部 12 套里按第 1 节「适合题材 + 情绪」推荐 1 个风格（01–06 再配 1 套皮肤），并给出 1 个备选。
2. **写 JSON 剧本**：按第 3 节把口播稿拆成 6–10 段，每段选最合适的句型和人像形态，字幕 `sub[]` 保留原话。
   一段只讲一件事，屏幕文字要短，严禁塞大段小字。
   **用户给了真人录音 / 录像时**，草稿写好后用 `align.py` 把真实口播回填进去（每段 `start` / `dur` / `words` / `sub` + `meta.audio`）：
   ```bash
   python core/tools/align.py --input voice.wav --script script.txt --inject templates/06_neobrutalism/draft.json --out templates/06_neobrutalism/final.json
   python core/tools/align.py --input voice.wav --script script.txt --out aligned.json      # 只要逐字时间：duration / audio / words / sub / corrections
   ```
   - 依赖：`pip install faster-whisper`（不需要 PyTorch）+ ffmpeg；可选 `pip install pypinyin`（同音错字修正）、`opencc-python-reimplemented` 或 `zhconv`（繁转简，没装用内置表）。
     `--refine` 可选 stable-ts 强制对齐，需 `pip install stable-ts`，**会连带装 PyTorch**；没装自动跳过。视频输入会另存 48 kHz 立体声 WAV 当 `meta.audio`。
   - **硬约束**：必须在最终播放 / 导出用的那条 `meta.audio` 音轨上跑；剪停顿、变速、重拼后要重跑，否则全片时间错位。
   - 草稿每段文字取 `sub`（没有再取 `text`、`script`；都没有 = 无口播段，保持原时长顺延）；对不上的段会打印「段号 + 原文」警告，要处理掉再往下走。
   - `--script` 只做保守纠错：一字对一字的同音错字、数字写法、英文大小写 / 拼写；多念、少念、改口一律以实际念的为准，全部记在 `corrections`。
   - 实测（i5-14600KF，CPU int8，medium 模型 1.53 GB）：3 分 04 秒口播识别约 85 秒（约 0.45× 实时），对 EP03 上线字幕文字一致 99.4%、
     每字起点误差中位 20 ms / P95 140 ms；`--refine` 多约 40 秒，中位降到 17 ms。`--model large-v3-turbo` 快约一倍但起点误差中位 120 ms，不推荐用于逐字高亮。
3. **无头抽帧验货**（必做）：
   ```bash
   python core/tools/inspect_frames.py --template 05_pro_nle --data my_script.json --theme color_grade --times 3,9.5,17,25 --out scratch_verify/my_ep
   ```
   `--data`（剧本，相对风格包目录）和 `--theme`（皮肤）都可省略，省略即默认剧本 / 默认皮肤。
   `--times` 取每段中点秒数；输出必须是 `ZERO_ERRORS`，再逐张看截图：无文字重叠、无遮挡人脸和字幕、深浅皮肤都高对比。
   `quote` 段金句卡固定占画面一侧约 40% 宽（含「划重点」贴纸），引擎不识别人脸：真人素材请让人脸落在另一侧 60% 区域（默认左卡 → 人脸居中或偏右），否则改 `"pos": "right"`。
   改完模板想做整体回归：`python core/tools/smoke_test.py --baseline <改前截图目录>`（12 套 × 3 帧零报错 + 逐像素比对）。
   截图、视频等大文件只放 `scratch_verify/`，不要提交。
4. **交付预览**：
   ```bash
   python core/tools/serve.py      # http://127.0.0.1:8765/
   ```
   给用户链接 `http://127.0.0.1:8765/templates/<风格包>/index.html?data=my_script.json&theme=<皮肤>`，
   并说明：同一份剧本可随时换成其他 11 套风格（换目录），01–06 还能换同风格的另外 3 套皮肤（换 `?theme=`）。
   在线版（仅 demo）：https://mushanhe.github.io/Mushanhe_Video_Engine/
5. **一键导出 MP4**（用户确认画面后；依赖 `pip install playwright` + `playwright install chromium`（本机有 Edge / Chrome 可省）+ PATH 里有 `ffmpeg`）：
   ```bash
   python core/tools/export_mp4.py --template 05_pro_nle --data my_script.json --theme color_grade --res 1080p --out output/my_ep.mp4
   python core/tools/export_mp4.py --template 05_pro_nle --data my_script.json --res 4k --audio voice.wav --out output/my_ep_4k.mp4
   ```
   时长缺省读剧本总长；`--audio` 外部人声 / 母带（缺省自动用剧本 `meta.audio`），`--bgm bgm.mp3 --bgm-vol 0.1` 可选循环背景乐；
   `--start` / `--duration` 只导一段做冒烟，`--workers` 并行分块。输出必须以 `ZERO_ERRORS` 结尾；成片放 `output/`，不提交。
   **预期耗时**：本地无头逐帧渲染，1080p 约为实时时长的 3–10×（取决于机器与素材），4K 更久；启动时会打印总帧数 / workers / 预估分钟数，
   之后每 5s 输出进度与 ETA。建议先加 `--duration 3` 冒烟确认画面与声音，再导全片。

## 5. 铁律

- 剧本 JSON 用 `fetch` 加载，必须通过 `serve.py` 打开，不能双击 HTML。
- 不改 `core/`；新需求优先写进剧本或风格包自己的 `themes.js` / 组件。
- 组件接口统一：`create(data, ctx) → { el, layer, avatar, cams, update(localT), w? }`，`update` 必须确定性。
- 快捷键：`空格` 播放 / 暂停 · `1`–`9` / `0` 跳段 · `H` 隐藏控制栏。
