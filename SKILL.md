---
name: mushanhe-video-engine
description: mushanhe 视频动效 Skill（Mushanhe Video Engine）——把口播文案或口播视频转成确定性、JSON 驱动的电影级口播视频。12 大电影级流派 × 30 套开箱皮肤，同一份 { meta, theme, scenes } 剧本随时换风格、换皮肤，支持词级字幕同步并一键导出 MP4。用户说“做一条口播视频 / 把这段稿子做成视频 / 换个风格或配色 / 出片”时使用。Use when the user asks to turn a talking-head script or video into a deterministic, JSON-driven cinematic video, switch styles or skins, sync word-level subtitles, or export MP4 (12 styles × 30 skins).
---

> 🌐 **简体中文** | [English](SKILL.en.md)

# Mushanhe Video Engine · v3.5

纯 HTML/CSS/JS，零构建。`core/` 是共享内核（摄影机、字幕、人像、转场），`templates/01_*` ~ `templates/12_*` 是 12 套风格包。
画面按时间确定性渲染：`?t=37.4` 一定是第 37.4 秒，可逐帧验货、可一键导出 1080p / 4K MP4。

## 0. 开工前（每次会话做一次，静默；「静默」只管这一节，后面的必停点照样要停）

1. **更新检查**（本 Skill 唯一的更新入口）：在仓库根目录执行 `python core/tools/check_update.py`。
   - 脚本自己动态读取当前分支和它的上游分支（不写死 `origin/main`）；非 git 目录、detached HEAD、没有上游时输出 `STATUS SKIP`，直接跳过。
   - 一天最多真正联网一次（上次检查时间记在本地 `.mh_update_pref`，已被 `.gitignore` 忽略）；`git fetch` 带 5 秒超时和 `GIT_TERMINAL_PROMPT=0`，超时 / 失败也只输出 `STATUS SKIP`。
   - 只有输出 `STATUS BEHIND N` 时才开口：把脚本列出的更新摘要告诉用户，**问用户是否更新**；用户确认后执行 `git pull --ff-only`。
     若因本地改动导致失败，只提示用户手动 `git stash` 后再试，**严禁** `git reset`。不设自动更新。
   - 当天已联网查过时不再联网，改用本地已下载的上游信息重算：仍落后就照样输出 `STATUS BEHIND N`（注明「今日已联网查过」），已更新完则 `STATUS SKIP checked-today`。
   - 升级须知：用 `git pull` 升级时，v3.2.2 改名的旧目录（`03_vox_desk`、`11_keynote_glass`、`12_bloomberg_fin`）会被自动删除，只有旧目录里放了用户自己的文件时才会残留（脚本会多打一行 `NOTE` 提示，只提示不删除）——请用户把自己的文件挪走后删掉旧目录；
     用下载压缩包覆盖升级的，必须先删掉这 3 个旧目录，否则本地会同时出现新旧 15 套模板。
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

## 2. 句型：10 个图表句型 + 1 个内核句型 `talk`（全部 12 套风格包通用；**写剧本先按第 2.5 节配方选**）

| `type` | 什么时候才用（口播里真的出现这个结构才用） |
|---|---|
| `talk` | 全屏真人 + 按口播弹 1–2 个关键词（内核句型，12 套都能用）。v3.5 起**不再是默认**：全屏只用于配方第 8 条「全屏点睛」（全片 1–2 处、每处 2–3 秒、合计 ≤ 20%），普通过渡句按配方第 9 条并到信息页 |
| `cover` | 开场标题、章节号 |
| `stat` | 口播说出了具体数字（数字滚动 + 比例条 + `delta`） |
| `steps` | 口播说出 ≥3 个有先后的步骤 |
| `checklist` | 口播列举了 ≥3 条要点 |
| `compare` | 口播里有明确的两方对比（错 vs 对、以前 vs 现在） |
| `timeline` | 口播里有 ≥3 个时间点 / 阶段 |
| `diagram` | 原理 / 架构 / 工作流（节点 + 连线；每个节点都要写 `at` 坐标） |
| `showcase` | `kind`: `code` / `terminal` / `doc` / `image` / `video` / `product` |
| `quote` | 全屏人像 + 侧边金句卡（占画面一侧约 40%，默认贴左，`"pos": "right"` 贴右） |
| `outro` | 结尾：只放口播里真说了的行动建议 |

- **每句话都按第 2.5 节配方归类**：开场用封面、有结构的句子用对应的信息页、结尾用收尾铭牌；整片全屏真人（`talk` / `quote` / `avatar:"full"`）合计 **≤ 20%**，只在 1–2 处 2–3 秒点睛（v3.5，第 2.6 节规矩 12；v3.4 的「全屏 ≥ 55%」作废）。
- **禁止自创 `type`**：未知 type 会被整段丢掉，后面所有段的时间全部错位（`inspect_frames.py` 会把 `unknown scene type` 当错误报出来）。
- `talk` 的 `data`：`{ "keywords": ["开源", { "text": "十二套", "cue": "十二", "side": "right" }] }`；关键词**只能是口播原话里的词**（2–6 字），不写也行（纯真人）。
  默认第 1 个在左、第 2 个在右，都避开画面中线 ±240px；说到这个词的那一帧弹出。
- 4 种人像形态（场景 `avatar`）：`full` 全屏出镜 · `card` 侧栏画框 · `pip` 画中画 · `corner` 角落小窗。只有 `diagram` 用 `pip`、`showcase` 用 `corner` 时组件排版是为它设计的，其余图表句型用 `card`（铺满版式 `meta.layout:"fill"` 下 `steps` / `compare` 也可以用 `pip`，组件区自动加宽）。

## 2.5 配方表（v3.5，照金样片定稿抄；每种句子一条，四样写死）

金样片 = 46.5 秒口播「我最近把自己做视频动效的这套工具开源了……看看实际用起来到底怎么样。」，06 撞色潮刊做的定稿；
同一份剧本换到 12 套任何一套都能直接用（v3.5 起配方里的字段 12 套通用）。秒数都是金样片里的全片绝对秒，括号里的剧本片段**照抄格式、换成你的口播原话**。
全片固定写：`"meta": { "layout": "fill", "cardDetail": "trim", "avatar": { "fullFrame": "inset", "morph": 0.3, "morphStyle": "snap", … } }`、`"theme": { "pip": "circle" }`。

| # | 配方（什么样的句子） | 人像形态 | 句型 / 组件 | 哪些元素跟哪个词出 | 什么时候退 | 金样片里的样子（秒 · 剧本片段） |
|---|---|---|---|---|---|---|
| 1 | **开场封面**：全片第一句（点题 / 宣布） | 侧栏卡 `avatar:"card"`，第 0 帧就在 | `cover` + `parts`（+ `size` / `stamp` / `stampCue`），后半句接 `then` | 不带字的封面装饰第 0 帧就在；标题按词分段砸出（`parts[i].cue`，`br:true` 另起一行）；印章跟 `stampCue` | 印章：所属分句念完 0.08s 起退；封面：`then.cue` 那一帧整块硬切收起 | 0–7.02「…视频动效的这套工具开源了」：`{"type":"cover","avatar":"card","data":{"parts":[{"text":"视频动效","cue":"动效"},{"text":"工具","cue":"工具","br":true}],"size":188,"stamp":"开源了！","stampCue":"开源","then":{…}}}` |
| 2 | **痛点 / 问题卡**：说「最烦的是…」「…得折腾半天」 | 侧栏卡 | `steps`（2 张卡；在封面段里写成 `then:{cue,type:"steps",data}`）+ 标题牌 `badges[]` `kind:"tag"` | 标题先挂（全屏或封面上先亮出的标签在卡的词那一帧 `dock` 成标题）；卡跟词出（`items[i].cue` + `icon` 线稿）；聚光跟着当前那张走、前面的压暗；卡上贴纸 `items[i].sticker:{text,cue}` | 贴纸：分句念完就退；标题 `out:"end"`；卡随换段转场盖住 | 7.02–11.51「平时剪口播最烦的其实就是做动效，一条几分钟的视频光包装就得折腾半天」：`"then":{"cue":"做动效","type":"steps","data":{"titleSpace":116,"items":[{"title":"最烦：\n做动效","cue":"做动效","icon":"motion"},{"title":"几分钟的视频\n→ 光包装","cue":"几分钟","icon":"clock","sticker":{"text":"折腾半天","cue":"折腾"}}]}}`，`"badges":[{"text":"平时剪口播","kind":"tag","cue":"平时","xy":[450,708],"size":88,"out":"end","dock":{"cue":"做动效","xy":[80,150],"size":80}}]` |
| 3 | **输入 → AI**：「把 A 和 B 丢给 AI」 | 右下圆窗 `pip`（从全屏切过来：`avatarCues:[[第一张卡的词 − 0.08,"pip"]]`） | `steps` 的 `intake:{files,ai,size,aiW,aiScale}` | 文件卡跟词出（`files[i].cue`，只出一张时居中、下一张来时让位并排）；「AI」那一帧 AI 框砸在正中、文件卡 0.38s 飞进框；标题牌在「AI」时出 | 文件卡进框即消失；AI 框在第一张步骤卡的词那一帧收起 | 14.08–17.46「录好的原片和文字丢给 AI」：`"intake":{"files":[{"text":"原片","cue":"原片"},{"text":"文字稿","cue":"文字"}],"ai":{"text":"AI","cue":"AI"},"size":[520,340],"aiW":400,"aiScale":1.3}`，`"badges":[{"parts":[{"text":"原片 + 文字稿","cue":"AI"},{"text":"→ AI","cue":"AI","br":true}],"kind":"tag","xy":[80,150],"size":80,"out":"end"}]` |
| 4 | **步骤**：说出 ≥ 2 个先后动作 | 圆窗 / 侧栏卡 | `steps`（`items[].cue` + `icon`，`progress:true`，`doneCue`，`exitCue:"end"`） | 一排卡跟词出；聚光跟着走；卡底进度条从这张出现填到下一张出现；说「做完 / 跑完」时已出的卡全亮（`doneCue`） | 本段最后一个字念完整组收起（`exitCue:"end"`）；标题 `out:"end"` | 17.46–22.93「让它自己选风格、写脚本、对齐字幕，跑完就能直接看预览」：`{"type":"steps","data":{"titleSpace":230,"items":[{"title":"选风格","cue":"选风格","icon":"palette"},{"title":"写脚本","cue":"写脚本","icon":"script"},{"title":"对齐字幕","cue":"对齐","icon":"subtitle"},{"title":"看预览","cue":"看预览","icon":"preview"}],"progress":true,"doneCue":["跑完","预览"],"exitCue":"end"}}` |
| 5 | **以前 / 现在对比**（含点按钮换样子） | 侧栏卡 | `compare`（`wrong` / `right` 各写 `cue`；`rows[].cue`；`stamp`+`stampCue`；`illus:"timeline"`；`right.button:{text,cue,until}`；`vs:"→"`） | 「以前」卡先居中放大出、行跟词出、印章跟词砸；「现在」那一帧左卡滑回、右卡出；说「点一下」光标飞来点按钮、色块连换 3 套样子；聚光左 → 右 | 印章分句念完就退；两张卡随换段转场盖住 | 23.45–34.77「以前改个样式或者换个配色，时间线里得一个一个重调；现在直接在浏览器点一下就能换风格」：`{"type":"compare","data":{"vs":"→","wrong":{"title":"以前","cue":"以前","rows":[{"text":"改样式","cue":"改个样式"},{"text":"换配色","cue":"换个配色"}],"stamp":"一个个重调","stampCue":"一个一个","illus":"timeline"},"right":{"title":"现在：\n浏览器点一下","cue":"现在","button":{"text":"换风格","cue":"点一下","until":"换风格"}}}}` |
| 6 | **大数字**：口播说出具体数字 | 跟所在信息页 | 跟在对比后：`compare.stat`；单独一句：`stat`（`value` + `cue` + `endCue`） | 数字条在数字的词那一帧进场（`inCue` 写成同一个词）；数字和进度条**同一个进度**，`endCue` 念完那一刻同帧到位；`roomCue` 时上面的卡让位 | 挂到分句末 + `hold` 秒（段上写 `"hold":0.3`），随换段转场盖住 | 34.04–34.77「目前已经做好了 12 套」：`"stat":{"label":"目前已经做好","value":12,"unit":"套","cue":"12","endCue":"12","inCue":"12","roomCue":"做好"}`，段上 `"hold":0.3` |
| 7 | **收尾铭牌 + 「接下来」横条**：结尾总结卖点 + 预告 | 侧栏卡 | `outro`（`actions[].cue`（1–3 块）+ `cta:{title,cue}` + `titleSpace`）+ 标题牌 `kind:"tag"` | 标题牌在总起词那一帧出（样式同全片标题）；铭牌底板和第一块铭牌同帧砸出（不先空着出现）；铭牌跟词整块出，聚光跟着走；「接下来」横条在预告的词出，出现时铭牌一起压暗 | 标题挂到收尾页结束（人像换全屏前退完：`out:"看看"` + `outLead:0.2`）；铭牌 / 横条在回全屏时随组件区收起 | 35.24–44.07「工具是开源免费的，你也不需要懂什么代码，后面这期视频我就一步步带大家从头跑一遍」：`{"type":"outro","avatar":"card","data":{"titleSpace":140,"actions":[{"title":"开源","cue":"开源"},{"title":"免费","cue":"免费"},{"title":"不用懂代码","cue":"不需要"}],"cta":{"title":"接下来：一步步从头跑一遍","cue":"从头"},"badges":[{"text":"工具","kind":"tag","cue":"工具","xy":[80,150],"size":80,"out":"看看","outLead":0.2}]}}` |
| 8 | **全屏点睛**：句首过渡（换话题的第一个分句）或结尾金句 | 全屏 B 画框（`meta.avatar.fullFrame:"inset"`）：段 `avatar:"full"` 到第一张卡的词前 0.08s，或段尾 `avatarCues:[[金句第一个词 − 0.08,"full"]]` | 不单独开段，写在所在信息页那一段里 | 句首过渡：不出牌子；结尾金句：可在金句关键词盖一个印章（`badges[]` `kind:"stamp"`）+ 镜头缓推（`avatarPush`） | 句首过渡：第一张卡的词那一帧换回信息页；结尾：片尾 | 11.70–14.10「现在我一般直接把」（`"avatar":"full","avatarCues":[[14.0,"pip"]]`）；44.17–46.53「看看实际用起来到底怎么样」（`"avatarCues":[[43.98,"full"]],"avatarPush":{"cue":"到底","zoom":1.08,"dur":0.8}`，`{"text":"到底怎么样？","kind":"stamp","cue":"到底","pos":"top-right","size":80}`）。**全片最多 1–2 处，每处 2–3 秒，合计 ≤ 20%** |
| 9 | **普通过渡句**（寒暄、承上启下、没有结构的观点） | 跟前后最近的信息页 | 不单独开段、不单独全屏：并到前后最近的信息页那一段，用标签 / 印章补（`badges[]` `kind:"tag"` / `"stamp"`，词只用口播原话） | 标签 / 印章跟它的词出 | 分句念完就退 | 金样片 4.64「平时剪口播」：过渡词先作标签出现在封面上，下一句的卡出来时停靠成标题（见第 2 条） |

## 2.6 全片规矩（金样片定稿时定下的）

1. **背景 B 画框**：人像全屏时一律缩进 06 画框（四边 48px 露米色点阵底、4px 黑边、右下 10px 硬投影、框内暗角约 25%）；侧栏卡 / 圆窗也用同一个 10px 硬投影，换形态不跳。→ `meta.avatar.fullFrame: "inset"`。
2. **粒子散聚**：换形态（全屏 / 侧栏卡 / 圆窗互换）保留招牌的点阵粒子散聚，不改成滑过去。利落版节奏（总长 0.3 秒）：粒子出现的第一、二帧人像清楚完整（粒子从人像上剥离）→ 第 0.063–0.085 秒一口气散尽 → 人全散开时（0.117 秒）换形态 → 0.15 秒起新形态网点长回（网点覆盖不到 10% 的那一帧不画）、0.25 秒长成实心；粒子先快后慢、尾巴 20% 淡出。看不见人每次 3 帧；整片 0 个半透明人像帧。粒子颜色、数量（1000）、大小和原版一样。→ `meta.avatar.morph: 0.3` + `meta.avatar.morphStyle: "snap"`（`core/avatar-morph-fx.js` `addMorph({snap:true})` + `AvatarMorphFX.applyHalftone`）。
3. **人先全屏，第一张卡出现才缩**：一句话开头是全屏真人时，人一直全屏，到第一张卡的词才换形态；换形态起点比这个词早 0.08 秒，词那一帧人已散开、卡已看得见。全屏时亮出的标签在同一帧滑成卡组标题（同一个元素）。→ `avatarCues: [[词起点 − 0.08, 形态]]` + 牌子 `dock`。
4. **卡念到才出**：每张卡、每一行、每个印章 / 贴纸都在自己的词那一帧（±1 帧）出现；词出来之前画面上不摆空位、不摆虚线框。→ `items[].cue`、`rows[].cue` 等；不写 `slots`。
5. **牌子讲完就退**：关键词牌 / 大字 / 印章 / 贴纸 / 标签在所属分句（字幕 ，。！？；…）最后一个字念完后 0.08 秒起退、≤0.24 秒退完；写 `out:"end"` 的在本段最后一个字后退；任何屏幕层牌子在换段色块到达前退完。→ `core/talk.js` 牌子层 + 宿主页 `ctx.coverAt`。
6. **段边界只在句末（分号算，逗号不算）**：每段最后一个字必须落在文字稿 。！？…；处；逗号、顿号不算。`align.py --inject --script` 检查，不合格 `STATUS FAIL cross-sentence`。
7. **转场 A**：换段用四色色块横扫 + 人像粒子散聚；色块按口播空档自适应（盖上不早于上一句最后一个字后 0.25 秒，掀开不晚于下一句第一个字）。→ 不写 `meta.transition`。
8. **上屏字只用口播原话**：屏幕上每个字都要在口播里说过（原词或不改原意的压缩）；不加英文小标签、不出句型英文名、不出段号、没填的可选字段整块不渲染。
9. **缺素材就报错停**：剧本里写的人像视频、音轨、底图任何一个加载失败（≥400 / 媒体 error），导出 `STATUS FAIL missing-media` exit 1、不出片；抽帧和预览页同样报错；不再静音兜底。媒体路径以剧本文件为基准。
10. **段边界只在完整句子结束处**：→ `align.py --inject --script` 检查，跨句 `STATUS FAIL cross-sentence`；本轮 4 段边界与定稿相同。
11. **缺素材就报错停**：→ `export_mp4.py` 预检 + 页面媒体报错 → `STATUS FAIL missing-media` exit 1，不出片。
12. **全屏比例**：开场第 1 句用 cover 封面页（人在侧栏）；结尾用 outro 信息页收尾，只用口播原话；全屏（B 画框）占全片 15%–20% 以内，只用于 1–2 处 2–3 秒的短促过渡 / 金句点睛，绝不大段霸屏。→ 剧本层：句 1 `cover` + `then`、句 4 `outro` cue 版、`avatarCues` 只在两处切全屏；逐帧量全屏占比和每处时长。

> 规矩 1 / 7 写的是 06 的样子；其余 11 套是「各自的画框 / 各自的转场」：v3.5 起每套全屏画框用自己的边框、投影、底纹（`--mh-frame-*`），转场仍是各套原来的转场。

## 2.7 AI 的做法（写剧本时照做）

1. **先逐句判断属于哪条配方**，把「句子 → 配方」对照表写出来给用户看（一句一行：口播原句 · 配方编号 · 人像形态 · 句型）。
2. **再照配方填口播原话**：只换成口播里的词（`text` / `title` / `cue`），版式、字段、出场 / 退场规则一律照第 2.5 节抄；**不许自己设计新画面、不许编字**（上屏字守第 2.6 节规矩 8）。
3. **配方表里没有的句子，归到最近的一条，不新造**（拿不准就归第 9 条「普通过渡句」）。全屏只用第 8 条，合计 ≤ 20%。
4. 必停点不变：给预览链接（不带 `clean`）→ 用户说可以 → 才导出（第 4 节必停 3 / 必停 4）。
5. **「口播原话」以录音为准**（`align.py` 出的 `words`）：文字稿和录音对不上时按录音写上屏字和 `cue`，把差异逐条列给用户。
6. **时间从 `words` 来**：`avatarCues` 写「词起点 − 0.08」这类绝对秒，要先有词级时间——先跑一遍 `align.py` 模式 A（只出 aligned.json）拿到时间再写草稿，或 `--inject` 之后再补。
7. **回填后重写 `sub`**：`--inject` 写回的 `sub` 是按 14 字宽切的无标点版本；照文字稿的标点把每段 `sub` 重新断行（去掉标点后必须和 `words` 逐字一致），牌子「分句念完就退」靠这些标点算。
8. **全屏占比自己量**：用无头浏览器按 30fps 逐帧 seek，人像框宽 ≥ 1800px 的帧算全屏，合计 ≤ 20%、每处 2–3 秒。

## 3. 剧本规范 `{ meta, theme, scenes }`

```json
{
  "meta":  { "title": "片名", "audio": "voice.wav", "layout": "fill", "cardDetail": "trim",
             "avatar": { "video": "avatar.mp4", "tag": "你的名字", "focus": "50% 30%", "cuts": [28.5],
                         "fullFrame": "inset", "morph": 0.3, "morphStyle": "snap" } },
  "theme": { "preset": "zine", "pip": "circle" },
  "scenes": [
    { "type": "cover", "dur": 7.0, "avatar": "card", "sub": ["我最近把自己做视频动效的", "这套工具开源了，"],
      "data": { "parts": [ { "text": "视频动效", "cue": "动效" }, { "text": "工具", "cue": "工具", "br": true } ], "stamp": "开源了！", "stampCue": "开源" } },
    { "type": "steps", "dur": 8.4, "avatar": "full", "avatarCues": [[14.0, "pip"]], "sub": ["…"],
      "data": { "titleSpace": 230, "items": [ { "title": "选风格", "cue": "选风格", "icon": "palette" }, { "title": "写脚本", "cue": "写脚本", "icon": "script" } ], "progress": true, "exitCue": "end" } }
  ]
}
```

- **素材和剧本统一放仓库根 `work/<期号>/`**（`work/` 已被 `.gitignore` 忽略），**不要拷进 `templates/`**。
  `meta.audio` / `meta.avatar.video` / `meta.avatar.bg` 一律**相对剧本文件**写（v3.4 起引擎、抽帧、导出都按剧本文件解析）；
  预览 / 抽帧 / 导出用 `?data=../../work/<期号>/<剧本>.json`（`--data` 同理，相对风格包目录）。换任何一套风格包素材都不会断。
- **`demo_data.json` 只抄字段名和数据类型，不抄条数和文案**。`data` 里每一条上屏文字（含 `label`、`kicker`、按钮、印章）都必须能在**本段或相邻一段的口播原话**里找到依据（原词或不改原意的压缩）；
  禁止新增口播没提到的概念、文件名、代码名、命令、步骤、平台按钮和承诺。凑不满就减少 items、删掉可选字段，宁缺勿编。
- `sub[]` 是字幕行，按**用户的文字稿**断句，不要抄 `aligned.json` 的 `sub`（那是按 14 字宽切的，没有标点）；`**关键词**` 在标题里标高亮色；`dur` 单位秒。
- 画幅固定 1920×1080；导出分辨率和帧率由 `export_mp4.py` 的 `--res` / `--fps` 决定（`meta` 里不写 `fps` / `size`）。

**真人素材同步字段（全部可选；不写则与原版逐帧一致）**——时间一律是**全片绝对秒**：
- `sc.words`：`[["字", 起始秒, 结束秒], ...]` → 逐字高亮字幕（`align.py` 自动生成，不要手写）。
- `data` 里任意 item 的 **`cue`（v3.4）**：`"词"` 或 `["词", 第几次]` → 这个元素在口播说到这个词的那一帧入场。cue 必须和 `words` 里的字一模一样（数字写法跟 words 走）；
  找不到时退回模板默认节奏并在控制台 warn。本轮 06 的 `steps` / `checklist` / `stat` 和内核 `talk` 读 cue，其余 11 套的图表句型下一轮再接。
- `sc.avatarCues`：`[[秒, "card|pip|corner|full"], ...]` → 一段之内切换人像形态。
- **v3.5 配方字段（12 套通用；只在剧本写了才生效，不写 = 各套原样逐帧不变）**——用法照第 2.5 节配方表抄：
  - `meta.layout: "fill"` 铺满版式：人像侧栏卡 520×700 / 圆窗 260，组件区 = 屏幕 x 80→1260（侧栏卡）或 →1500（圆窗），y 150→930；
    `meta.avatar.fullFrame: "inset"` 全屏缩进画框（每套用自己的边框 / 投影 / 底纹）；`meta.avatar.morph: 0.3` + `morphStyle: "snap"` 利落版粒子散聚；`meta.cardDetail: "trim"` 卡片细节。
  - 聚光：`steps` / `compare` / `outro` 写了 cue 就自动「讲到哪张亮边微放大、前面的压暗」（`"focus": false` 关掉）。
  - `cover`：`parts:[{text,cue,br}]` + `size` + `stamp` / `stampCue` + `then:{cue,type,data}`（不带字的装饰第 0 帧就在）。
  - `steps`：`items[i].cue` / `icon` / `sticker:{text,cue}`、`titleSpace`、`progress`、`doneCue`、`exitCue:"end"`、`intake:{files:[{text,cue}],ai:{text,cue},size,aiW,aiScale}`（文件卡 → AI 框）。
  - `compare`：`wrong` / `right` 的 `cue`、`rows:[{text,cue}]`、`stamp`+`stampCue`、`illus:"timeline"`、`right.button:{text,cue,until}`、`vs`、`stat:{label,value,unit,cue,endCue,inCue,roomCue}`。
  - `stat`（单独一句大数字）：`value` + `cue` + `endCue`（+ `label` / `unit`）。
  - `outro`：`actions:[{title,cue,icon}]`（1–3 块铭牌）+ `cta:{title,cue}`（「接下来」横条）+ `titleSpace` + `board`（底板，默认有，和第一块铭牌同帧出）。
  - `data.badges`（任何句型的牌子层）：`[{ "text", "kind": "keyword|big|stamp|sticker|tag|label", "cue", "pos" | "xy":[x,y], "size", "parts"?, "out"?, "outLead"?, "dock":{cue,xy,size}? }]`，
    **所属分句（字幕 ，。！？；…）念完 0.24s 内自动退场**；`out:"end"` 本段最后一个字念完退；`out:"词"` + `outLead` 提前几秒退；`dock` 全屏时亮出的牌子在 cue 时滑成标题；任何牌子在换段转场盖上前退完。每套用自己的牌子造型。
  - `sc.avatarCues`（段内换形态）、`sc.avatarPush:{cue,zoom,dur}`（说到这个词镜头缓推）、`sc.hold`（本段内容在最后一个字后挂满几秒）。
  - 可选字段（kicker / 副标题 / 标签 / 印章 / 按钮 / 名牌等）没填就整块不出；导出时（`?chrome=0`）转场和装饰里不出英文句型名。
- `meta.audio`：`"voice.wav"` 或 `{ "src", "offset", "volume" }` → 人声主时钟。⚠️ 人像 `<video>` 永远静音，人声只来自 `meta.audio`。
- `meta.avatar.focus`（v3.4）：`"50% 30%"` → 人像取景焦点；**手机竖屏 / 带旋转信息的素材用 `full` 时必须写**，否则只剩帽顶和门框（不写 = `center top`）。
- `meta.avatar.cuts`（v3.4）：粗剪剪点（`align.py --cuts` 自动写入）→ 剪点落在换段处由换段盖住，落不到的剪点那一帧人像推近 1.0→1.08 盖住跳切（`cutZoom` 可调）。
- `theme.pip`（v3.4）：`"circle"` / `"square"` → 画中画圆窗 / 方窗由皮肤参数决定；不写 = 风格包原样（02 / 04 / 06 / 12 方窗，其余圆窗）。
- `meta.transition`（v3.4，目前只有 06）：`"wipe"`（默认，换段四色色块横扫 + 人像粒子）/ `"cut"`（换段直接切，只有 `"chapter": true` 的段保留色块）。
- `meta.themeCues`：`[[秒, "obsidian", "角标文字"], ...]` → 按时间换肤（仅 01–06）。

## 4. 工作流（4 个必停点：标 ⛔ 的地方必须停下来等用户明确回复，不能用「静默」「默认」跳过）

**⛔ 必停 1 · 风格与皮肤**：问用户要哪套；没指定就按第 1 节推荐 1 个风格（01–06 再配 1 套皮肤）+ 1 个备选，**等用户回答**再往下做。

**⛔ 必停 2 · 原片要不要粗剪**（在 align 之前）：问用户「这条原片是不是剪好的定稿？要不要先自动去掉头尾静音和长停顿？口误 / 重说要你自己先剪」。
用户要粗剪（或没剪过的原片），跑：
```bash
python core/tools/rough_cut.py --input raw/take.mkv --out-dir work/ep01
```
- 头尾静音各留约 0.3s；只压缩 **>1.0s** 的停顿（压到约 0.4s），更短的停顿不动；口误不碰。
- 产出 `work/ep01/avatar.mp4`（1080p，**每帧都是关键帧**，导出约 1–1.5× 实时）+ `voice.wav`（48k）+ `cut_points.json`（每个剪点在新时间轴的秒数）。看到 `STATUS OK` / `ROUGH_CUT_DONE` 才算成功。
- 之后**一律用剪过的这条 `voice.wav` 跑 align**；剧本 `meta.avatar.video` 指 `avatar.mp4`。

**第 3 步 · 写草稿剧本**（`work/ep01/ep01_draft.json`）：
- 段数 ≈ 口播时长 ÷ 8–12 秒（至少 3 段），不为凑数硬拆。
- **段边界只能落在文字稿的句末标点（。！？…；）处**，严禁切在半句话中间（逗号、顿号、没有标点的地方都不行；分号算句末）。一句话太长就整句放一段。
  剪点（`cut_points.json`）附近恰好是句末时，优先把段边界放在那里，换段能直接盖住跳切。
- **先写「句子 → 配方」对照表**（第 2.7 节）：逐句判断属于第 2.5 节哪条配方，表给用户看；再照配方填口播原话（不设计新画面、不编字，配方里没有的句子归最近的一条）。
  每条上屏文字守第 3 节 / 第 2.6 节规矩 8 的「只用口播原话」；所有跟词元素都写 `cue`；全屏只用配方第 8 条，合计 ≤ 20%。
- 真人素材用 `quote` 前先抽一帧看人脸在左 / 中 / 右：偏左 → `"pos": "right"`；居中或偏右 → 默认左卡；两边都会压到 → 不用 quote，改 `talk`。

**第 4 步 · 回填真实口播**：
```bash
python core/tools/align.py --input work/ep01/voice.wav --script work/ep01/script.txt --cuts work/ep01/cut_points.json \
       --inject work/ep01/ep01_draft.json --out work/ep01/ep01.json
```
- 依赖：`pip install faster-whisper`（不需要 PyTorch）+ ffmpeg；可选 `pypinyin`（同音错字）、`opencc-python-reimplemented` / `zhconv`（繁转简）、`stable-ts`（`--refine`，会连带装 PyTorch）。
  模型第一次要下载约 1.5 GB；国内网络慢可设 `HF_ENDPOINT=https://hf-mirror.com`，或把模型放好后用 `--model-dir` / `--offline`。
- 看最后几行：`STATUS OK`；`STATUS PARTIAL`（附警告清单，要处理掉再往下走）；`STATUS FAIL …`（退出码 1，不写 `--out`）——**严禁当成功继续**：
  - `FAIL cross-sentence`：有段边界不在句末，会逐条报出「第几段｜第几段 切在『写脚本、｜对齐』之间」——把边界改到句末（或合并两段）再重跑；
  - `FAIL mismatch` / `too-large` / `io`：先查稿子和录音是不是同一版。
- 输出里的 `NOTE dropped N 个静音幻听词`：whisper 在静音里编出来的字，已自动丢掉，告诉用户丢了什么。
- **把 `meta.align.corrections` 和「草稿 sub vs 回填 sub」的逐段差异列给用户**；`--script` 只纠一字对一字的同音字，说话人偏离稿子的地方纠不到。
  改错字要 **`words` 和 `sub` 两处一起改**，改完重新抽帧。

**第 5 步 · 抽帧验货**（必做，给用户看之前自己先过一遍）：
```bash
python core/tools/inspect_frames.py --template 06_neobrutalism --data ../../work/ep01/ep01.json --theme zine --times 1,5,9.2,9.5 --out scratch_verify/ep01
```
- `ZERO_ERRORS` 只是必要条件（`CONSOLE WARNINGS` 也要逐条看；缺素材会直接 `STATUS FAIL missing-media`）。
- 每段至少抽 2 帧（段首 +1s、段中），**每个段边界前后 0.3s 各抽 1 帧**；每帧都把画面文字和这一刻的字幕 / 口播对照：
  ① 画面没出现口播没说过的信息；② 没有提前剧透后面的内容；③ 边界不在半句话上；④ 人像、字幕没被遮挡，深浅背景都高对比。
- 拿不准是设计还是 bug 的（顶部页签、方窗、裁切、空框、占位假字），**列给用户问，不要自己定性为「设计如此」**。

**⛔ 必停 3 · 给用户能播的预览，再问要不要改**：
```bash
python core/tools/serve.py      # 后台常驻；启动时会打印标准链接格式
```
- 链接格式固定：`http://127.0.0.1:8765/templates/<风格包>/index.html?data=../../work/<期号>/<剧本>.json&theme=<皮肤>`。
  **禁止带 `clean=1` 或 `t=`**（`clean=1` 会隐藏播放键和风格切换器，页面打开就像一张死图）。给之前自己打开一次，确认能看到底部播放栏和右上角切换器。
- 链接后面可以每段附一句「这一段讲什么」，但**不能只给文字不给链接**；同时附上：纠错 / 差异清单、丢掉的幻听词、存疑项。
- 说明同一份剧本可随时换其他 11 套风格（右上角切换器），01–06 还能换皮肤（`?theme=`）。**等用户看完回复**；要改就改完再给一次链接。

**⛔ 必停 4 · 导出前**：先报给用户**片长、分辨率、预计耗时、输出文件名**，等用户明确说「导」再运行。
- 预计耗时 = 片长 × 倍率：人像是 `rough_cut.py` 出的全帧内 1080p 约 1–1.5×；手机 / 相机原片直接当人像约 4–6×；4K 原片当人像 5–8×；`--res 4k` 再乘约 2.5。`export_mp4.py` 启动时也会打印这个估计。
- 用户事先明确说过「直接导」「不用问我」时可以跳过等待，但**仍要先把片长和预计耗时报出来**。`--duration 3` 冒烟只验证管线，**不算用户确认**。
```bash
python core/tools/export_mp4.py --template 06_neobrutalism --data ../../work/ep01/ep01.json --theme zine --res 1080p --out output/ep01_zine_1080p.mp4
```
- 成片只出 **1 个文件**：`output/<剧本名>_<皮肤>_<分辨率>.mp4`；冒烟片、抽帧图放 `scratch_verify/`，不要复制改名出第二份。
- 结尾必须是 `STATUS OK` + `ZERO_ERRORS`。**缺音轨 / 缺人像 / 任一媒体 404 一律 `STATUS FAIL missing-media`（退出码 1，不出 mp4）**，没有任何静音兜底：去修路径，不要绕过。
  `STATUS WARN ready-timeout` = 有帧人像没解码完，抽帧核对后再交付。

**拍摄建议（只是建议，不强制）**：横屏 16:9、人脸大致在画面中线 ±240px 内、背景干净；竖屏素材记得写 `meta.avatar.focus`。

## 5. 铁律

- 剧本用 `fetch` 加载，必须通过 `serve.py` 打开，不能双击 HTML。
- 新需求优先写进剧本或风格包自己的 `themes.js` / 组件。**v3.5 经用户同意新增 `core/cue-kit.js`（配方组件，11 套共用，样子走各套 `--mk-*` 变量）、`core/host-kit.js`（宿主页的铺满版式 / 画框 / 利落散聚 / 牌子层 / 转场无英文）**，`talk.js` 加了 `Badges.registerKinds`（每套自己的牌子造型）和 `outLead`。**v3.4 经用户同意改了 `core/`**：`script-sync.js`（媒体路径按剧本解析 + 缺素材报错、`cue`、人像焦点、剪点推近、`theme.pip`、`?chrome=0`）、新增 `talk.js`（talk 句型）、`engine.css`（导出隐藏英文页签、画中画形状）、`tools/`（`rough_cut.py` 新增；`align.py` / `export_mp4.py` / `inspect_frames.py` / `serve.py` 加防呆）。其他 `core/` 文件没动；以后再改 `core/` 仍要先问用户。
- 组件接口：`create(data, ctx) → { el, layer, avatar, cams, update(localT), w? }`，`ctx = { dur, start, words, cue, cueEnd, clauseEnd }`，`update` 必须确定性。v3.4.1 新增 `core/focus.js`（聚光）、`talk.js` 牌子层 `MHEngine.Badges`。
- 导出 / 抽帧自动带 `clean=1&chrome=0`（隐藏控制栏、切换器和顶部英文句型页签）；这两个参数**只给工具用**，不进给用户的链接。
- 快捷键：`空格` 播放 / 暂停 · `1`–`9` / `0` 跳段 · `H` 隐藏控制栏。
