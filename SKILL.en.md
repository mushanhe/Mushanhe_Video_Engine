> 🌐 [简体中文](SKILL.md) | **English**
>
> This is the English reference copy of [`SKILL.md`](SKILL.md). It deliberately has no YAML frontmatter, so only `SKILL.md` registers as the `mushanhe-video-engine` Skill (no duplicate-name conflict). To use it as the Skill in an English setup, copy it to `SKILL.md` and paste the frontmatter block from `SKILL.md` on top.

# Mushanhe Video Engine · v3.5

Plain HTML/CSS/JS, zero build step. `core/` is the shared kernel (camera, subtitles, avatar, transitions); `templates/01_*` ~ `templates/12_*` are the 12 style packs.
Rendering is deterministic in time: `?t=37.4` is always second 37.4, so every frame can be inspected and the result exported to 1080p / 4K MP4 in one command.

## 0. Before you start (once per session, silently; "silent" applies to this section only — the mandatory stops below still apply)

1. **Update check** (the only update entry point in this Skill): run `python core/tools/check_update.py` in the repo root.
   - The script reads the current branch and its upstream dynamically (no hard-coded `origin/main`); outside a git repo, on a detached HEAD or without an upstream it prints `STATUS SKIP` — just move on.
   - It goes online at most once a day (last check time stored in the local `.mh_update_pref`, ignored by `.gitignore`); `git fetch` runs with a 5-second timeout and `GIT_TERMINAL_PROMPT=0`, and a timeout / failure is also just `STATUS SKIP`.
   - Speak up only on `STATUS BEHIND N`: relay the update summary the script prints and **ask the user whether to update**; after they confirm, run `git pull --ff-only`.
     If it fails because of local changes, only tell the user to run `git stash` manually and retry — **never** `git reset`. There is no automatic update.
   - If it already went online today it stays offline and recounts from the upstream info already downloaded: still behind → `STATUS BEHIND N` as usual (marked "already checked online today"); already updated → `STATUS SKIP checked-today`.
   - Upgrade note: with `git pull`, the old folders renamed in v3.2.2 (`03_vox_desk`, `11_keynote_glass`, `12_bloomberg_fin`) are removed automatically; they only remain if the user put their own files inside (the script prints an extra `NOTE` line — it only reports, never deletes) — have the user move their files out and delete the old folders;
     when upgrading by extracting a downloaded zip over the old copy, delete these 3 old folders first, otherwise old and new packs show up side by side (15 templates).
2. **Environment self-check**: `python --version` and `ffmpeg -version` (ffmpeg is only needed for MP4 export and `align.py`); when real voice-over needs aligning, also check `python -c "import faster_whisper"`;
   then run `python core/tools/smoke_test.py --packs 01_industrial_3d --times 3 --out scratch_verify/selfcheck`, which really launches a headless browser — `SMOKE PASS` means the Playwright engine is ready (if no browser is found: `pip install playwright` + `playwright install chromium`).

## 1. The 12 styles (equal rank; recommend by the script's mood — 01–06 have 4 skins each + 07–12 one each = 30 skins)

| Style pack | Visual character | Good for | `?theme=` (first = default) |
|---|---|---|---|
| `templates/01_industrial_3d/` | 3D industrial gallery: brushed-metal slabs, frosted glass, orange/teal accents, walk-through glass partitions | Hardware, gadgets, tool reviews, product launches | `pearl` · `obsidian` · `tactical` · `concrete` |
| `templates/02_swiss_print/` | Swiss International print collage: grid paper, square-cut paper, wooden ruler and pencil | Methodology, design, explainers, rational how-tos | `classic` · `bauhaus` · `midnight` · `botanical` |
| `templates/03_investigative_desk/` | Investigative desk: cutting mat, highlighter, red string, torn clippings | Investigations, post-mortems, industry analysis, storytelling | `linen` · `night_desk` · `blueprint` · `newsprint` |
| `templates/04_nodegraph/` | 3D node graph: glowing Bézier wires, pulse dots, oscilloscope | AI workflows, automation, architecture, programming | `cyber` · `matrix` · `amber_lab` · `daylight` |
| `templates/05_pro_nle/` | Pro NLE multitrack editor: 4-track timeline, per-character waveform, video scopes | Editing tutorials, creator tools, film, process breakdowns | `studio_dark` · `color_grade` · `light_silver` · `broadcast` |
| `templates/06_neobrutalism/` | Neo-Brutalism clash-color zine: 4px black borders, hard shadows, stickers and stamps | Youth audience, hot takes, listicles, trends | `zine` · `acid` · `pop_pink` · `mono_ink` |
| `templates/07_chalkboard/` | Academy chalkboard: dark-green matte board, jittery colored-chalk frames, stroke-by-stroke circles/ticks/arrows, eraser prop | Tutorials, classes, exam / study methods, science formulas, kids' education | Single skin (chalkboard) |
| `templates/08_song_ink/` | Song-dynasty ink: rice paper, ink stick, cinnabar seal, fine double ink frame with fret border, vertical headings, moon-gate window | Chinese classics, history, poetry & reading, tea, intangible heritage, Eastern brands | Single skin (rice paper) |
| `templates/09_analog_film/` | Japanese film magazine: Polaroid borders, 35mm sprocket holes, orange date stamp, developing animation | Vlogs, lifestyle, travel, photography, emotions, personal growth | Single skin (Portra) |
| `templates/10_retro_crt/` | Retro CRT terminal: phosphor-green screen, scanlines, ASCII double-line boxes, typewriter text | Programming, hacking / security, retro games, CLI tools, geek topics | Single skin (phosphor green) |
| `templates/11_stage_glass/` | Stage glass: pure-black stage, liquid frosted-glass Bento, titanium headings, aurora gradients | Launches, AI products, premium tech, fundraising pitches, year-in-review | Single skin (aurora) |
| `templates/12_fin_terminal/` | Finance data terminal: navy panels, amber function keys, candlesticks / sparklines, ticker tape, rating badges | Finance, investing, business analysis, data reports, earnings | Single skin (terminal) |

Skin mood guide:
- **01**: `pearl` bright & professional · `obsidian` premium night launch · `tactical` outdoor / hardcore gear · `concrete` calm architecture / corporate
- **02**: `classic` classic Swiss red · `bauhaus` design history / creative · `midnight` serious late-night topics · `botanical` nature / humanities / reading
- **03**: `linen` gentle narrative · `night_desk` mystery / late-night files · `blueprint` technical files / engineering · `newsprint` news / current affairs
- **04**: `cyber` default tech · `matrix` hacking / security · `amber_lab` experiments / risk warnings · `daylight` daytime class / docs
- **05**: `studio_dark` default NLE · `color_grade` color grading / cinematic · `light_silver` light silver look · `broadcast` live / newsroom control
- **06**: `zine` lively default · `acid` edgy / club / gaming · `pop_pink` sweet / beauty / lifestyle · `mono_ink` comics / strong opinions
- **07–12** have no skin capsule; the style sets the tone: teaching → 07 · Eastern classical → 08 · gentle lifestyle → 09 · geek retro → 10 · premium launch → 11 · data & money → 12.
  To fine-tune colors, put a color key from that pack's `index.html` whitelist into the script's `theme` (e.g. for 08: `{ "cinnabar": "#A61B1B" }`).
- **Rule of thumb**: match the "Good for" column first, then the mood: bright & rational 01/02/09 · dark tech 04/05/10/11/12 · narrative investigation 03 · youthful impact 06 · classroom 07 · Chinese style 08.

Skin priority (01–06): URL `?theme=` > script `theme.preset` > default skin. The skin capsule in the top-right switches without reload and syncs the URL; `H` hides it together with the HUD.
All 12 preview pages have a "🎨 Switch style 01–12" switcher in the top-right: it carries the current `?data=` script (path auto-rebased) and the current playback time, but not `?theme=`;
it hides with `H`, and never appears with `?clean=1` (frame inspection / export) or inside an iframe.
Since v3.2.2 packs 03 / 11 / 12 live in `03_investigative_desk` / `11_stage_glass` / `12_fin_terminal` (old folder URLs no longer work); 05's skins are now `studio_dark` / `color_grade` / `light_silver`, and the v3.2.1-and-earlier skin names keep working in `?theme=`, `theme.preset` and `meta.themeCues` (mapping in `templates/05_pro_nle/themes.js`).
01 also has 4 layout variants (set `"variant"` on a scene): `cover:blueprint` · `stat:gauge` · `steps:conveyor` · `compare:split`; see `templates/01_industrial_3d/demo_variants.json`.

## 2. Scene types: 10 chart types + 1 kernel type `talk` (shared by all 12 style packs; **when writing a script, pick by the recipes in section 2.5 first**)

| `type` | Use it only when the narration really contains this structure |
|---|---|
| `talk` | Full-screen presenter + 1–2 keywords popping in as they are spoken (kernel type, all 12 packs). From v3.5 it is **no longer the default**: full screen is only for recipe 8 "full-screen accent" (1–2 per video, 2–3 s each, ≤ 20% total); plain transition sentences merge into info pages per recipe 9 |
| `cover` | Opening title, chapter number |
| `stat` | The narration says a concrete number (count-up + ratio bar + `delta`) |
| `steps` | The narration names ≥3 ordered steps |
| `checklist` | The narration lists ≥3 points |
| `compare` | The narration has an explicit two-sided comparison (wrong vs right, before vs now) |
| `timeline` | The narration has ≥3 points in time / stages |
| `diagram` | Principle / architecture / workflow (nodes + links; every node needs an `at` position) |
| `showcase` | `kind`: `code` / `terminal` / `doc` / `image` / `video` / `product` |
| `quote` | Full-screen presenter + side quote card (~40% of one side, left by default, `"pos": "right"` for right) |
| `outro` | Ending: only call-to-actions the narration actually says |

- **Classify every sentence with the recipes in section 2.5**: cover for the opening, the matching info page for structured sentences, closing nameplates for the ending; full-screen presenter time (`talk` / `quote` / `avatar:"full"`) **≤ 20%** in total, only 1–2 accents of 2–3 s (v3.5, rule 12 in section 2.6; the v3.4 "≥ 55% full screen" is void).
- **Never invent a `type`**: an unknown type silently drops the whole scene and shifts every later scene (`inspect_frames.py` now reports `unknown scene type` as an error).
- `talk` data: `{ "keywords": ["open source", { "text": "12 styles", "cue": "12", "side": "right" }] }`; keywords **must be words actually spoken** (2–6 characters / 1–3 words), or omit them (pure presenter).
  The 1st keyword goes left, the 2nd right, both outside the ±240px centre band; each pops on the frame its word is spoken.
- 4 avatar modes (scene `avatar`): `full` full screen · `card` side frame · `pip` picture-in-picture · `corner` corner window. Chart layouts are designed for `card`, except `diagram` (`pip`) and `showcase` (`corner`) (with the fill layout `meta.layout:"fill"`, `steps` / `compare` also work with `pip` — the component zone widens automatically).

## 2.5 Recipe table (v3.5, copied from the final gold sample; one recipe per kind of sentence, four things fixed for each)

The gold sample is a 46.5 s talking-head clip (Chinese narration: "我最近把自己做视频动效的这套工具开源了……看看实际用起来到底怎么样。" — "I just open-sourced my motion-graphics toolkit … let's see how it actually works.") finished in pack 06 Neo-Brutalism.
The same script runs unchanged in any of the 12 packs (from v3.5 every recipe field below works in all 12). Seconds are absolute seconds in the gold sample; **copy the script snippets' shape and swap in your own spoken words**.
Always set for the whole video: `"meta": { "layout": "fill", "cardDetail": "trim", "avatar": { "fullFrame": "inset", "morph": 0.3, "morphStyle": "snap", … } }`, `"theme": { "pip": "circle" }`.

| # | Recipe (kind of sentence) | Avatar mode | Scene type / component | What enters on which word | When it leaves | In the gold sample (seconds · script snippet) |
|---|---|---|---|---|---|---|
| 1 | **Opening cover**: the first sentence (topic / announcement) | side card `avatar:"card"`, there from frame 0 | `cover` + `parts` (+ `size` / `stamp` / `stampCue`), second half continues with `then` | text-free cover decor is there from frame 0; the title slams in part by part on its words (`parts[i].cue`, `br:true` = new line); stamp on `stampCue` | stamp: 0.08 s after its clause's last word; cover: hard cut away on the frame of `then.cue` | 0–7.02 「…视频动效的这套工具开源了」: `{"type":"cover","avatar":"card","data":{"parts":[{"text":"视频动效","cue":"动效"},{"text":"工具","cue":"工具","br":true}],"size":188,"stamp":"开源了！","stampCue":"开源","then":{…}}}` |
| 2 | **Pain point / problem cards**: "the worst part is…", "…takes half a day" | side card | `steps` (2 cards; inside the cover scene as `then:{cue,type:"steps",data}`) + title badge `badges[]` `kind:"tag"` | title first (a tag shown earlier `dock`s into the title slot on the first card's word); cards on their words (`items[i].cue` + `icon` line art); spotlight follows the current card, earlier ones dim; sticker on a card `items[i].sticker:{text,cue}` | sticker: after its clause; title `out:"end"`; cards covered by the scene transition | 7.02–11.51 「平时剪口播最烦的其实就是做动效，一条几分钟的视频光包装就得折腾半天」: `"then":{"cue":"做动效","type":"steps","data":{"titleSpace":116,"items":[{"title":"最烦：\n做动效","cue":"做动效","icon":"motion"},{"title":"几分钟的视频\n→ 光包装","cue":"几分钟","icon":"clock","sticker":{"text":"折腾半天","cue":"折腾"}}]}}`, `"badges":[{"text":"平时剪口播","kind":"tag","cue":"平时","xy":[450,708],"size":88,"out":"end","dock":{"cue":"做动效","xy":[80,150],"size":80}}]` |
| 3 | **Input → AI**: "I hand A and B to the AI" | bottom-right PiP `pip` (from full screen: `avatarCues:[[first card's word − 0.08,"pip"]]`) | `steps` with `intake:{files,ai,size,aiW,aiScale}` | file cards on their words (one card sits centred, the next arrival makes room side by side); on "AI" the AI box slams into the centre and the file cards fly into it in 0.38 s; title badge on "AI" | file cards vanish into the box; the AI box collapses on the first step card's word | 14.08–17.46 「录好的原片和文字丢给 AI」: `"intake":{"files":[{"text":"原片","cue":"原片"},{"text":"文字稿","cue":"文字"}],"ai":{"text":"AI","cue":"AI"},"size":[520,340],"aiW":400,"aiScale":1.3}`, `"badges":[{"parts":[{"text":"原片 + 文字稿","cue":"AI"},{"text":"→ AI","cue":"AI","br":true}],"kind":"tag","xy":[80,150],"size":80,"out":"end"}]` |
| 4 | **Steps**: ≥ 2 ordered actions | PiP / side card | `steps` (`items[].cue` + `icon`, `progress:true`, `doneCue`, `exitCue:"end"`) | a row of cards on their words; spotlight follows; the card's progress bar fills until the next card appears; on "done / finished" every card shown lights up (`doneCue`) | the whole row leaves after the scene's last word (`exitCue:"end"`); title `out:"end"` | 17.46–22.93 「让它自己选风格、写脚本、对齐字幕，跑完就能直接看预览」: `{"type":"steps","data":{"titleSpace":230,"items":[{"title":"选风格","cue":"选风格","icon":"palette"},{"title":"写脚本","cue":"写脚本","icon":"script"},{"title":"对齐字幕","cue":"对齐","icon":"subtitle"},{"title":"看预览","cue":"看预览","icon":"preview"}],"progress":true,"doneCue":["跑完","预览"],"exitCue":"end"}}` |
| 5 | **Before / now comparison** (incl. clicking a button to switch looks) | side card | `compare` (`cue` on `wrong` / `right`; `rows[].cue`; `stamp`+`stampCue`; `illus:"timeline"`; `right.button:{text,cue,until}`; `vs:"→"`) | "before" card enters centred and enlarged, rows on their words, stamp slams on its word; on "now" the left card slides back and the right card lands; on "click" a cursor flies in and clicks, the swatches cycle 3 looks; spotlight left → right | stamp after its clause; both cards covered by the scene transition | 23.45–34.77 「以前改个样式或者换个配色，时间线里得一个一个重调；现在直接在浏览器点一下就能换风格」: `{"type":"compare","data":{"vs":"→","wrong":{"title":"以前","cue":"以前","rows":[{"text":"改样式","cue":"改个样式"},{"text":"换配色","cue":"换个配色"}],"stamp":"一个个重调","stampCue":"一个一个","illus":"timeline"},"right":{"title":"现在：\n浏览器点一下","cue":"现在","button":{"text":"换风格","cue":"点一下","until":"换风格"}}}}` |
| 6 | **Big number**: a concrete number is spoken | same as its info page | after a comparison: `compare.stat`; on its own: `stat` (`value` + `cue` + `endCue`) | the number bar lands on the number's word (`inCue` = same word); number and bar share **one progress value** and land together the moment `endCue` finishes; cards above make room on `roomCue` | stays until clause end + `hold` s (`"hold":0.3` on the scene), then the transition covers it | 34.04–34.77 「目前已经做好了 12 套」: `"stat":{"label":"目前已经做好","value":12,"unit":"套","cue":"12","endCue":"12","inCue":"12","roomCue":"做好"}`, scene `"hold":0.3` |
| 7 | **Closing nameplates + "next" banner**: wrap-up selling points + teaser | side card | `outro` (`actions[].cue` (1–3 plates) + `cta:{title,cue}` + `titleSpace`) + title badge `kind:"tag"` | title badge on the summary word (same style as the other page titles); the plate board slams in together with the first plate (never empty first); plates on their words with spotlight; the "next" banner on the teaser word, dimming all plates | title stays to the end of the closing page (gone before the avatar returns to full screen: `out:"看看"` + `outLead:0.2`); plates / banner leave with the component zone | 35.24–44.07 「工具是开源免费的，你也不需要懂什么代码，后面这期视频我就一步步带大家从头跑一遍」: `{"type":"outro","avatar":"card","data":{"titleSpace":140,"actions":[{"title":"开源","cue":"开源"},{"title":"免费","cue":"免费"},{"title":"不用懂代码","cue":"不需要"}],"cta":{"title":"接下来：一步步从头跑一遍","cue":"从头"},"badges":[{"text":"工具","kind":"tag","cue":"工具","xy":[80,150],"size":80,"out":"看看","outLead":0.2}]}}` |
| 8 | **Full-screen accent**: the opening clause of a new topic, or the closing punchline | full screen in the B frame (`meta.avatar.fullFrame:"inset"`): scene `avatar:"full"` until 0.08 s before the first card's word, or at the end `avatarCues:[[punchline's first word − 0.08,"full"]]` | never a scene of its own — written inside its info-page scene | opening: no badges; ending: optionally one stamp on the punchline word (`badges[]` `kind:"stamp"`) + slow push-in (`avatarPush`) | opening: back to the info page on the first card's word; ending: end of video | 11.70–14.10 「现在我一般直接把」 (`"avatar":"full","avatarCues":[[14.0,"pip"]]`); 44.17–46.53 「看看实际用起来到底怎么样」 (`"avatarCues":[[43.98,"full"]],"avatarPush":{"cue":"到底","zoom":1.08,"dur":0.8}`, `{"text":"到底怎么样？","kind":"stamp","cue":"到底","pos":"top-right","size":80}`). **At most 1–2 per video, 2–3 s each, ≤ 20% in total** |
| 9 | **Plain transition sentence** (greeting, bridge, opinion with no structure) | follows the nearest info page | no scene of its own, no full screen of its own: merge it into the nearest info-page scene and support it with a tag / stamp (`badges[]` `kind:"tag"` / `"stamp"`, spoken words only) | tag / stamp on its word | after its clause | gold sample 4.64 「平时剪口播」: the bridge words first appear as a tag on the cover, then dock into the title when the next sentence's cards arrive (see recipe 2) |

## 2.6 Whole-video rules (set when the gold sample was finalised)

1. **Background B frame**: whenever the presenter is full screen, the video is inset in the 06 frame (48px of cream dotted paper on every side, 4px black border, 10px hard shadow bottom-right, ~25% vignette inside); the side card / PiP share the same 10px hard shadow, so morphs never jump. → `meta.avatar.fullFrame: "inset"`.
2. **Particle morph**: changing avatar mode (full / side card / PiP) keeps the signature dot-particle scatter-and-gather, never a slide. Crisp rhythm (0.3 s total): the first two particle frames still show a clear, complete avatar (particles peel off it) → fully scattered at 0.063–0.085 s → the mode swaps while scattered (0.117 s) → the new mode grows back as halftone dots from 0.15 s (frames with < 10% dot coverage are not drawn), solid at 0.25 s; particles fast-then-slow, last 20% fade. No visible avatar for 3 frames per morph; 0 half-transparent avatar frames in the whole video. Particle colour, count (1000) and size as the original. → `meta.avatar.morph: 0.3` + `meta.avatar.morphStyle: "snap"` (`core/avatar-morph-fx.js` `addMorph({snap:true})` + `AvatarMorphFX.applyHalftone`).
3. **Stay full screen until the first card**: when a sentence opens with the presenter full screen, they stay full until the first card's word; the morph starts 0.08 s before that word so on the word's frame the avatar is already scattered and the card visible. A tag shown during full screen glides into the card group's title on that frame (same element). → `avatarCues: [[word start − 0.08, mode]]` + badge `dock`.
4. **Cards appear only when spoken**: every card, row, stamp and sticker appears on its own word's frame (±1 frame); nothing — no empty slots, no dashed placeholders — is shown before its word. → `items[].cue`, `rows[].cue` etc.; never write `slots`.
5. **Badges leave when their clause ends**: keyword badges / big text / stamps / stickers / tags start leaving 0.08 s after the last word of their clause (subtitle ，。！？；…) and are gone within 0.24 s; `out:"end"` leaves after the scene's last word; every screen-layer badge is gone before the scene transition arrives. → badge layer in `core/talk.js` + host `ctx.coverAt`.
6. **Scene boundaries only at sentence ends (semicolons count, commas don't)**: the last word of every scene must sit at 。！？…； in the written script; commas and enumeration commas don't count. Checked by `align.py --inject --script`; failures print `STATUS FAIL cross-sentence`.
7. **Transition A**: scene changes use the four-colour slab wipe + avatar particles; the slabs adapt to speech gaps (cover no earlier than 0.25 s after the previous sentence's last word, uncover no later than the next sentence's first word). → leave `meta.transition` unset.
8. **On-screen text = spoken words only**: every character on screen must have been said (verbatim or a faithful compression); no English mini-labels, no scene-type names, no scene numbers; optional fields left empty render nothing.
9. **Missing media stops the export**: if any avatar video, voice track or backdrop in the script fails to load (≥400 / media error), export prints `STATUS FAIL missing-media`, exits 1 and writes no video; frame inspection and the preview page report it too; no silent fallback. Media paths resolve against the script file.
10. **Scene boundaries only at the end of a complete sentence**: → `align.py --inject --script`; cross-sentence boundaries print `STATUS FAIL cross-sentence`; the 4 boundaries are the same as the final cut.
11. **Missing media stops the export**: → `export_mp4.py` preflight + page media errors → `STATUS FAIL missing-media`, exit 1, no video.
12. **Full-screen share**: the first sentence uses the cover page (presenter in the side card); the ending uses the outro info page, spoken words only; full screen (B frame) stays within 15%–20% of the video, only for 1–2 short 2–3 s transitions / punchlines, never long stretches. → script level: sentence 1 `cover` + `then`, sentence 4 cue-driven `outro`, `avatarCues` switch to full only twice; measure the full-screen share and each duration frame by frame.

> Rules 1 / 7 describe pack 06; in the other 11 packs each pack has "its own frame / its own transition": from v3.5 every pack's full-screen frame uses its own border, shadow and texture (`--mh-frame-*`), and transitions stay each pack's own.

## 2.7 How the AI works (do this when writing a script)

1. **First classify every sentence into a recipe** and show the user a "sentence → recipe" table (one line per sentence: spoken sentence · recipe number · avatar mode · scene type).
2. **Then fill the recipe with the spoken words**: only swap in spoken words (`text` / `title` / `cue`); layout, fields and enter / exit rules are copied from section 2.5; **never design new visuals, never invent text** (rule 8 in section 2.6).
3. **A sentence with no matching recipe goes to the nearest recipe — never a new one** (when unsure, recipe 9 "plain transition sentence"). Full screen only via recipe 8, ≤ 20% in total.
4. The mandatory stops do not change: give a preview link (without `clean`) → the user says OK → only then export (stops 3 / 4 in section 4).
5. **"Spoken words" means the recording** (the `words` from `align.py`): when the written script and the recording differ, on-screen text and `cue` follow the recording; list every difference for the user.
6. **Times come from `words`**: `avatarCues` take absolute seconds such as "word start − 0.08", so word timing must exist first — run `align.py` mode A (aligned.json only) before drafting, or fill them in after `--inject`.
7. **Rewrite `sub` after injecting**: the `sub` written back by `--inject` is cut at 14 characters with no punctuation; re-split each scene's `sub` using the written script's punctuation (without punctuation it must match `words` character for character) — badges exit at clause ends computed from that punctuation.
8. **Measure the full-screen share yourself**: seek a headless browser frame by frame at 30 fps; frames where the avatar box is ≥ 1800px wide count as full screen; ≤ 20% total, 2–3 s per accent.

## 3. Script schema `{ meta, theme, scenes }`

```json
{
  "meta":  { "title": "Title", "audio": "voice.wav", "layout": "fill", "cardDetail": "trim",
             "avatar": { "video": "avatar.mp4", "tag": "Your name", "focus": "50% 30%", "cuts": [28.5],
                         "fullFrame": "inset", "morph": 0.3, "morphStyle": "snap" } },
  "theme": { "preset": "zine", "pip": "circle" },
  "scenes": [
    { "type": "cover", "dur": 7.0, "avatar": "card", "sub": ["I just open-sourced", "my motion-graphics toolkit."],
      "data": { "parts": [ { "text": "Motion", "cue": "motion" }, { "text": "toolkit", "cue": "toolkit", "br": true } ], "stamp": "Open source!", "stampCue": "open" } },
    { "type": "steps", "dur": 8.4, "avatar": "full", "avatarCues": [[14.0, "pip"]], "sub": ["…"],
      "data": { "titleSpace": 230, "items": [ { "title": "Pick a style", "cue": "style", "icon": "palette" }, { "title": "Write", "cue": "write", "icon": "script" } ], "progress": true, "exitCue": "end" } }
  ]
}
```

- **Put footage and scripts in `work/<episode>/` at the repo root** (ignored by `.gitignore`); **never copy them into `templates/`**.
  `meta.audio` / `meta.avatar.video` / `meta.avatar.bg` are written **relative to the script file** (since v3.4 the engine, frame inspector and exporter all resolve them against the script);
  preview / inspect / export with `?data=../../work/<episode>/<script>.json` (`--data` likewise, relative to the pack folder). Switching to any pack keeps every asset.
- **Copy only field names and data types from `demo_data.json` — never its item counts or copy.** Every on-screen string in `data` (including `label`, `kicker`, buttons, stamps) must be traceable to **the narration of this scene or a neighbouring one** (verbatim or a faithful compression);
  never add concepts, file names, code names, commands, steps, platform buttons or promises that were not spoken. If you cannot fill a layout, use fewer items or drop optional fields — leave it out rather than invent.
- `sub[]` are subtitle lines split by **the user's written script**; do not copy `sub` from `aligned.json` (it is cut at 14-character width with no punctuation). `**keyword**` highlights in titles; `dur` is in seconds.
- Canvas is fixed at 1920×1080; export resolution / fps come from `export_mp4.py` `--res` / `--fps` (no `fps` / `size` in `meta`).

**Talking-head sync fields (all optional; omitted = frame-identical to the original)** — times are always **absolute seconds of the whole video**:
- `sc.words`: `[["word", start, end], ...]` → word-level highlighted subtitles (generated by `align.py`; do not hand-write).
- **`cue` on any `data` item (v3.4)**: `"word"` or `["word", nth]` → the element enters on the frame that word is spoken. The cue must match the characters in `words` exactly (numbers as written in words);
  if not found, the template's default timing is used and a console warning is printed. From v3.5 the recipe components (`cover` / `steps` / `compare` / `stat` / `outro`) read cues in all 12 packs; 06 `checklist` / `timeline` and the kernel `talk` read them too.
- `sc.avatarCues`: `[[seconds, "card|pip|corner|full"], ...]` → change avatar mode inside a scene.
- **v3.5 recipe fields (all 12 packs; only active when written — omitted = every pack frame-identical to before)** — use them as in the recipe table, section 2.5:
  - `meta.layout: "fill"` fill layout: side card 520×700 / PiP Ø260; component zone = screen x 80→1260 (side card) or →1500 (PiP), y 150→930;
    `meta.avatar.fullFrame: "inset"` full screen inset in a frame (each pack uses its own border / shadow / texture); `meta.avatar.morph: 0.3` + `morphStyle: "snap"` crisp particle morph; `meta.cardDetail: "trim"` card details.
  - Spotlight: `steps` / `compare` / `outro` with cues highlight the card being spoken (ring + slight zoom) and dim the earlier ones (`"focus": false` to disable).
  - `cover`: `parts:[{text,cue,br}]` + `size` + `stamp` / `stampCue` + `then:{cue,type,data}` (text-free decor from frame 0).
  - `steps`: `items[i].cue` / `icon` / `sticker:{text,cue}`, `titleSpace`, `progress`, `doneCue`, `exitCue:"end"`, `intake:{files:[{text,cue}],ai:{text,cue},size,aiW,aiScale}` (file cards → AI box).
  - `compare`: `cue` on `wrong` / `right`, `rows:[{text,cue}]`, `stamp`+`stampCue`, `illus:"timeline"`, `right.button:{text,cue,until}`, `vs`, `stat:{label,value,unit,cue,endCue,inCue,roomCue}`.
  - `stat` (a big number on its own): `value` + `cue` + `endCue` (+ `label` / `unit`).
  - `outro`: `actions:[{title,cue,icon}]` (1–3 nameplates) + `cta:{title,cue}` ("next" banner) + `titleSpace` + `board` (on by default, lands with the first plate).
  - `data.badges` (badge layer on any scene type): `[{ "text", "kind": "keyword|big|stamp|sticker|tag|label", "cue", "pos" | "xy":[x,y], "size", "parts"?, "out"?, "outLead"?, "dock":{cue,xy,size}? }]`,
    **auto-exit within 0.24 s after the last word of their clause (subtitle ，。！？；…)**; `out:"end"` leaves after the scene's last word; `out:"word"` + `outLead` leaves that many seconds early; `dock` glides a badge shown during full screen into the title slot on its cue; every badge is gone before the scene transition covers the screen. Each pack has its own badge look.
  - `sc.avatarCues` (mode change inside a scene), `sc.avatarPush:{cue,zoom,dur}` (slow push-in on a word), `sc.hold` (keep the scene fully visible that long after its last word).
  - Optional fields (kicker / subtitle / tag / stamp / buttons / name tag…) render nothing when empty; on export (`?chrome=0`) transitions and decor never show English scene-type names.
- `meta.audio`: `"voice.wav"` or `{ "src", "offset", "volume" }` → the voice track, used as master clock. ⚠️ The avatar `<video>` is always muted; voice only comes from `meta.audio`.
- `meta.avatar.focus` (v3.4): `"50% 30%"` → avatar framing focus; **required for phone-portrait / rotated footage in `full`**, otherwise only the cap and door frame show (default `center top`).
- `meta.avatar.cuts` (v3.4): rough-cut points (written by `align.py --cuts`) → a cut that lands on a scene change is hidden by it; any other cut gets a 1.0→1.08 punch-in on that frame to hide the jump (`cutZoom` adjustable).
- `theme.pip` (v3.4): `"circle"` / `"square"` → PiP shape is a skin parameter; omitted = the pack's own (02 / 04 / 06 / 12 square, others round).
- `meta.transition` (v3.4, pack 06 only for now): `"wipe"` (default: four-colour slab wipe + avatar particles) / `"cut"` (hard cuts; only scenes marked `"chapter": true` keep the wipe).
- `meta.themeCues`: `[[seconds, "obsidian", "badge"], ...]` → timed skin switches (01–06 only).

## 4. Workflow (4 mandatory stops: at every ⛔ wait for an explicit reply — "silent" / "default" never skips them)

**⛔ Stop 1 · Style and skin**: ask which pack; if none given, recommend 1 style (plus 1 skin for 01–06) and 1 alternative from section 1, and **wait for the answer**.

**⛔ Stop 2 · Rough cut or not** (before align): ask "Is this footage already your final cut? Should I automatically remove leading/trailing silence and long pauses? Flubs / retakes you need to cut yourself first."
If yes (or the footage is clearly uncut), run:
```bash
python core/tools/rough_cut.py --input raw/take.mkv --out-dir work/ep01
```
- Keeps ~0.3s before the first and after the last word; compresses only pauses **>1.0s** (to ~0.4s); shorter pauses and flubs are untouched.
- Outputs `work/ep01/avatar.mp4` (1080p, **every frame a keyframe** → export ~1–1.5× real time) + `voice.wav` (48k) + `cut_points.json` (each cut in the new timeline). Success = `STATUS OK` / `ROUGH_CUT_DONE`.
- From now on **always align this cut `voice.wav`**; point `meta.avatar.video` at `avatar.mp4`.

**Step 3 · Draft the script** (`work/ep01/ep01_draft.json`):
- Scenes ≈ narration length ÷ 8–12 s (at least 3); never split just to reach a count.
- **Scene boundaries may only fall on sentence-ending punctuation of the written script (。！？…； / . ! ? ;)** — never mid-sentence (not at commas, enumeration commas, or unpunctuated spots; a semicolon counts as a sentence end). A long sentence stays whole in one scene.
  When a cut point (`cut_points.json`) sits at a sentence end, prefer putting the boundary there so the scene change hides the jump.
- **Write the "sentence → recipe" table first** (section 2.7): classify every sentence into a recipe from section 2.5 and show the table to the user; then fill the recipes with the spoken words (no new visuals, no invented text; a sentence with no recipe goes to the nearest one).
  Every on-screen string follows the "spoken words only" rule (section 3 / rule 8 in section 2.6); every timed element gets a `cue`; full screen only via recipe 8, ≤ 20% total.
- Before using `quote` with real footage, grab one frame and check where the face is: left → `"pos": "right"`; centre or right → default left card; both sides covered → skip quote, use `talk`.

**Step 4 · Fill in the real narration**:
```bash
python core/tools/align.py --input work/ep01/voice.wav --script work/ep01/script.txt --cuts work/ep01/cut_points.json \
       --inject work/ep01/ep01_draft.json --out work/ep01/ep01.json
```
- Needs `pip install faster-whisper` (no PyTorch) + ffmpeg; optional `pypinyin` (homophones), `opencc-python-reimplemented` / `zhconv` (traditional → simplified), `stable-ts` (`--refine`, pulls in PyTorch).
  First run downloads ~1.5 GB; in mainland China set `HF_ENDPOINT=https://hf-mirror.com`, or place the model and use `--model-dir` / `--offline`.
- Read the last lines: `STATUS OK`; `STATUS PARTIAL` (with warnings — resolve them first); `STATUS FAIL …` (exit 1, `--out` not written) — **never continue as if it succeeded**:
  - `FAIL cross-sentence`: a scene boundary is not at a sentence end; each one is listed as "scene N | scene N+1 cut between 『…｜…』" — move the boundary to the sentence end (or merge the scenes) and re-run;
  - `FAIL mismatch` / `too-large` / `io`: check that script and recording are the same version.
- `NOTE dropped N …`: words whisper hallucinated in silence were removed automatically — tell the user what was dropped.
- **Show the user `meta.align.corrections` and a per-scene diff of draft `sub` vs filled `sub`.** `--script` only fixes one-to-one homophones; places where the speaker left the script are not corrected.
  Fix typos in **both `words` and `sub`**, then re-inspect.

**Step 5 · Inspect frames** (mandatory, before the user sees anything):
```bash
python core/tools/inspect_frames.py --template 06_neobrutalism --data ../../work/ep01/ep01.json --theme zine --times 1,5,9.2,9.5 --out scratch_verify/ep01
```
- `ZERO_ERRORS` is necessary, not sufficient (read every `CONSOLE WARNINGS` line; missing assets fail as `STATUS FAIL missing-media`).
- At least 2 frames per scene (start +1s, middle) and **1 frame 0.3s before and after every boundary**; compare each frame's on-screen text with the subtitle / narration at that moment:
  ① nothing on screen that was not said; ② nothing shown before it is said; ③ no boundary mid-sentence; ④ face and subtitles unobstructed, high contrast on light and dark.
- Anything you are unsure is design or bug (top tabs, square windows, crops, empty boxes, placeholder text) — **list it for the user; never label it "by design" yourself**.

**⛔ Stop 3 · Give the user a playable preview, then ask what to change**:
```bash
python core/tools/serve.py      # keep it running; prints the standard link format on start
```
- Link format is fixed: `http://127.0.0.1:8765/templates/<pack>/index.html?data=../../work/<episode>/<script>.json&theme=<skin>`.
  **Never include `clean=1` or `t=`** (`clean=1` hides the play bar and style switcher — the page looks frozen). Open it yourself first and check the bottom play bar and top-right switcher are there.
- You may add one line per scene on what it covers, but **never text alone without the link**; also attach the corrections / diff list, dropped hallucinations, and open questions.
- Mention the same script can switch to the other 11 styles (top-right switcher) and 01–06 can change skin (`?theme=`). **Wait for the user's reply**; after changes, send the link again.

**⛔ Stop 4 · Before export**: tell the user **duration, resolution, estimated time and output file name**, and run only after they explicitly say "export".
- Estimated time = duration × factor: avatar from `rough_cut.py` (all-intra 1080p) ~1–1.5×; phone / camera original used directly ~4–6×; 4K original as avatar 5–8×; `--res 4k` ×~2.5 more. `export_mp4.py` prints this estimate too.
- If the user said beforehand "just export" / "don't ask me", you may skip waiting, but **still report duration and estimated time first**. A `--duration 3` smoke test only checks the pipeline — **it is not user approval**.
```bash
python core/tools/export_mp4.py --template 06_neobrutalism --data ../../work/ep01/ep01.json --theme zine --res 1080p --out output/ep01_zine_1080p.mp4
```
- Exactly **one file**: `output/<script>_<skin>_<resolution>.mp4`; smoke clips and frames go to `scratch_verify/`; never copy-rename a second file.
- Must end with `STATUS OK` + `ZERO_ERRORS`. **Missing voice / missing avatar / any media 404 → `STATUS FAIL missing-media` (exit 1, no mp4)** — there is no silent fallback: fix the path, do not work around it.
  `STATUS WARN ready-timeout` = some frames' avatar did not finish decoding; inspect before delivering.

**Shooting tips (suggestions only)**: landscape 16:9, face roughly within ±240px of the centre line, tidy background; set `meta.avatar.focus` for portrait footage.

## 5. Ground rules

- Scripts load via `fetch`, so pages must be opened through `serve.py`, never by double-clicking the HTML.
- Put new needs into the script or the pack's own `themes.js` / components first. **v3.5, approved by the user, adds `core/cue-kit.js` (recipe components shared by 11 packs, styled by each pack's `--mk-*` variables) and `core/host-kit.js` (fill layout / frame / crisp morph / badge layer / no English in transitions for host pages)**; `talk.js` gains `Badges.registerKinds` (per-pack badge looks) and `outLead`. **v3.4 changed `core/` with the user's approval**: `script-sync.js` (media resolved against the script + missing-media errors, `cue`, avatar focus, cut punch-in, `theme.pip`, `?chrome=0`), new `talk.js` (talk type), `engine.css` (hide English tabs on export, PiP shape), `tools/` (new `rough_cut.py`; guards in `align.py` / `export_mp4.py` / `inspect_frames.py` / `serve.py`). No other `core/` file changed; future `core/` changes still need the user's OK.
- Component interface: `create(data, ctx) → { el, layer, avatar, cams, update(localT), w? }`, `ctx = { dur, start, words, cue, cueEnd, clauseEnd }`; `update` must be deterministic. v3.4.1 adds `core/focus.js` (focus) and the `MHEngine.Badges` layer in `talk.js`.
- Export / inspect add `clean=1&chrome=0` automatically (hide controls, switcher and the top English scene tabs); these parameters are **for tools only**, never in links for the user.
- Shortcuts: `Space` play / pause · `1`–`9` / `0` jump to scene · `H` hide controls.
