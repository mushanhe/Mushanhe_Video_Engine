---
name: mushanhe-video-engine
description: 把口播文案或口播视频转成确定性、JSON 驱动的电影级口播视频。12 大电影级流派 × 30 套开箱皮肤，同一份 { meta, theme, scenes } 剧本随时换风格、换皮肤，并能按文案情绪在 12 套里自动推荐。用户说“做一条口播视频 / 把这段稿子做成视频 / 换个风格或配色 / 出片”时使用。
---

# Mushanhe Video Engine · v3.1

纯 HTML/CSS/JS，零构建。`core/` 是共享内核（摄影机、字幕、人像、转场），`templates/01_*` ~ `templates/12_*` 是 12 套风格包。
画面按时间确定性渲染：`?t=37.4` 一定是第 37.4 秒，可逐帧验货、可无头录制。

## 1. 12 大流派总索引（平权，按文案情绪主动推荐；01–06 各 4 套皮肤 + 07–12 各 1 套 = 30 套）

| 风格包 | 美术气质 | 适合题材 | `?theme=`（首个为默认） |
|---|---|---|---|
| `templates/01_industrial_3d/` | 3D 工业画廊：拉丝金属厚板、磨砂玻璃、橙青点缀、玻璃隔断漫游 | 硬件、数码、工具评测、产品发布 | `pearl` · `obsidian` · `tactical` · `concrete` |
| `templates/02_swiss_print/` | 瑞士国际主义印刷拼贴：网格纸、直角纸片、木尺铅笔 | 方法论、设计、知识科普、理性干货 | `classic` · `bauhaus` · `midnight` · `botanical` |
| `templates/03_vox_desk/` | Vox 侦探桌面：切割垫、荧光笔、红丝线、撕边剪报 | 调查、复盘、行业分析、讲故事 | `linen` · `night_desk` · `blueprint` · `newsprint` |
| `templates/04_nodegraph/` | ComfyUI 3D 节点图：发光贝塞尔线、脉冲光点、示波器 | AI 工作流、自动化、架构、编程 | `cyber` · `matrix` · `amber_lab` · `daylight` |
| `templates/05_pro_nle/` | Pro NLE 多轨剪辑台：4 轨时间线、逐字波形、Lumetri 示波器 | 剪辑教程、创作者工具、影视、流程拆解 | `premiere` · `davinci` · `fcp_silver` · `broadcast` |
| `templates/06_neobrutalism/` | Neo-Brutalism 撞色潮刊：4px 粗黑边、硬投影、贴纸印章 | 年轻向、观点输出、清单种草、热点 | `zine` · `acid` · `pop_pink` · `mono_ink` |
| `templates/07_chalkboard/` | 学院黑板：墨绿磨砂黑板、彩色粉笔手绘抖动框、逐笔圈勾箭头、黑板擦道具 | 教程、课堂、考试 / 学习方法、理科公式、儿童教育 | 单皮肤（黑板） |
| `templates/08_song_ink/` | 宋韵水墨：宣纸、徽墨、朱砂方印、细墨双框回纹、竖排引题、月洞窗 | 国学、历史、诗词读书、茶文化、非遗、东方品牌 | 单皮肤（宣纸） |
| `templates/09_analog_film/` | 日系胶片杂志：拍立得白边、35mm 齿孔、橙色日期戳、显影动画 | Vlog、生活方式、旅行、摄影、情感、个人成长 | 单皮肤（Portra） |
| `templates/10_retro_crt/` | 复古 CRT 终端：磷光绿荧光屏、扫描线、ASCII 双线框、打字机逐字 | 编程、黑客 / 安全、复古游戏、命令行工具、极客 | 单皮肤（磷光绿） |
| `templates/11_keynote_glass/` | Keynote 暗黑流光：纯黑舞台、液态毛玻璃 Bento、钛金属标题、极光渐变 | 新品发布、AI 产品、高端科技、融资路演、年度总结 | 单皮肤（极光） |
| `templates/12_bloomberg_fin/` | 华尔街金融终端：藏青面板、琥珀功能键、K 线 / sparkline、行情条、评级徽章 | 财经、投资理财、商业分析、数据研报、行业财报 | 单皮肤（终端） |

皮肤情绪速配：
- **01**：`pearl` 明亮专业 · `obsidian` 暗夜高端发布 · `tactical` 户外 / 硬核装备 · `concrete` 冷静建筑 / 企业感
- **02**：`classic` 经典瑞士红 · `bauhaus` 设计史 / 创意 · `midnight` 深夜严肃话题 · `botanical` 自然 / 人文 / 读书
- **03**：`linen` 温和叙事 · `night_desk` 悬疑 / 深夜档案 · `blueprint` 技术档案 / 工程 · `newsprint` 新闻 / 时事
- **04**：`cyber` 默认科技感 · `matrix` 黑客 / 安全 · `amber_lab` 实验 / 风险警示 · `daylight` 白天课堂 / 文档向
- **05**：`premiere` 默认非编 · `davinci` 调色 / 电影感 · `fcp_silver` 浅色苹果系 · `broadcast` 直播 / 新闻导播
- **06**：`zine` 活泼默认 · `acid` 潮酷 / 夜店 / 游戏 · `pop_pink` 甜美 / 美妆 / 生活 · `mono_ink` 漫画 / 强观点
- **07–12** 无换肤胶囊，选流派即定调：教学感 → 07 · 东方古典 → 08 · 温柔生活 → 09 · 极客复古 → 10 · 高端发布 → 11 · 数据金钱 → 12；
  需要微调颜色时在剧本 `theme` 里写该包 `index.html` 白名单里的颜色键（如 08 的 `{ "cinnabar": "#A61B1B" }`）。
- **推荐口诀**：先看题材匹配「适合题材」列，再看情绪：明亮理性 01/02/09 · 暗夜科技 04/05/10/11/12 · 叙事调查 03 · 年轻冲击 06 · 课堂 07 · 国风 08。

皮肤优先级（01–06）：URL `?theme=` ＞ 剧本 `theme.preset` ＞ 默认皮肤。展厅右上角有换肤胶囊，点击无刷新切换并同步 URL；`H` 隐藏控制栏时一起隐藏。
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
| `quote` | 全屏人像 + 金句卡 |
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
- 剧本放在风格包目录下，用 `?data=my_script.json` 加载；不同风格包字段一致，换风格只换目录。

## 4. 标准 4 步工作流

1. **定风格与皮肤**：问用户想要哪套；没指定就在全部 12 套里按第 1 节「适合题材 + 情绪」推荐 1 个风格（01–06 再配 1 套皮肤），并给出 1 个备选。
2. **写 JSON 剧本**：按第 3 节把口播稿拆成 6–10 段，每段选最合适的句型和人像形态，字幕 `sub[]` 保留原话。
   一段只讲一件事，屏幕文字要短，严禁塞大段小字。
3. **无头抽帧验货**（必做）：
   ```bash
   python core/tools/inspect_frames.py --template 05_pro_nle --data my_script.json --theme davinci --times 3,9.5,17,25 --out scratch_verify/my_ep
   ```
   `--data`（剧本，相对风格包目录）和 `--theme`（皮肤）都可省略，省略即默认剧本 / 默认皮肤。
   `--times` 取每段中点秒数；输出必须是 `ZERO_ERRORS`，再逐张看截图：无文字重叠、无遮挡人脸和字幕、深浅皮肤都高对比。
   截图、视频等大文件只放 `scratch_verify/`，不要提交。
4. **交付预览**：
   ```bash
   python core/tools/serve.py      # http://127.0.0.1:8765/
   ```
   给用户链接 `http://127.0.0.1:8765/templates/<风格包>/index.html?data=my_script.json&theme=<皮肤>`，
   并说明：同一份剧本可随时换成其他 11 套风格（换目录），01–06 还能换同风格的另外 3 套皮肤（换 `?theme=`）。
   在线版（仅 demo）：https://mushanhe.github.io/Mushanhe_Video_Engine/

## 5. 铁律

- 剧本 JSON 用 `fetch` 加载，必须通过 `serve.py` 打开，不能双击 HTML。
- 不改 `core/`；新需求优先写进剧本或风格包自己的 `themes.js` / 组件。
- 组件接口统一：`create(data, ctx) → { el, layer, avatar, cams, update(localT), w? }`，`update` 必须确定性。
- 快捷键：`空格` 播放 / 暂停 · `1`–`9` / `0` 跳段 · `H` 隐藏控制栏。
