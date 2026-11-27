> 🌐 [简体中文](SKILL.md) | **English**
>
> This is the English reference copy of [`SKILL.md`](SKILL.md). It deliberately has no YAML frontmatter, so only `SKILL.md` registers as the `mushanhe-video-engine` Skill (no duplicate-name conflict). To use it as the Skill in an English setup, copy it to `SKILL.md` and paste the frontmatter block from `SKILL.md` on top.

# Mushanhe Video Engine · v3.2.2

Plain HTML/CSS/JS, zero build step. `core/` is the shared kernel (camera, subtitles, avatar, transitions); `templates/01_*` ~ `templates/12_*` are the 12 style packs.
Rendering is deterministic in time: `?t=37.4` is always second 37.4, so every frame can be inspected and the result exported to 1080p / 4K MP4 in one command.

## 0. Before you start (once per session, silent — do not bother the user)

1. **Update check** (the only update entry point in this Skill): run `python core/tools/check_update.py` in the repo root.
   - The script reads the current branch and its upstream dynamically (no hard-coded `origin/main`); outside a git repo, on a detached HEAD or without an upstream it prints `STATUS SKIP` — just move on.
   - It goes online at most once a day (last check time stored in the local `.mh_update_pref`, ignored by `.gitignore`); `git fetch` runs with a 5-second timeout and `GIT_TERMINAL_PROMPT=0`, and a timeout / failure is also just `STATUS SKIP`.
   - Speak up only on `STATUS BEHIND N`: relay the update summary the script prints and **ask the user whether to update**; after they confirm, run `git pull --ff-only`.
     If it fails because of local changes, only tell the user to run `git stash` manually and retry — **never** `git reset`. There is no automatic update.
2. **Environment self-check**: `python --version` and `ffmpeg -version` (ffmpeg is only needed for MP4 export);
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

## 2. 10 universal scene types (shared by all 12 style packs)

| `type` | Use it for |
|---|---|
| `cover` | Opening title, chapter number |
| `stat` | Number hook (rolling number + ratio bar + `delta`) |
| `steps` | 3–5 step procedure |
| `checklist` | Rules / key points ticked one by one |
| `compare` | Wrong way vs right way |
| `timeline` | Version history, stages, "you are here" highlight |
| `diagram` | Principle / architecture / workflow (nodes + links + flowing pulses) |
| `showcase` | `kind`: `code` / `terminal` / `doc` / `image` / `video` / `product` |
| `quote` | Full-screen avatar + side quote card (left by default, `"pos": "right"` for right; no face detection — see the shooting constraint in section 4) |
| `outro` | Call to action + follow / open-source CTA |

4 avatar modes (scene field `avatar`): `card` side frame · `pip` picture-in-picture · `corner` small corner window · `full` full-screen presenter. Mode changes come with a particle scatter/gather transition.

## 3. Script schema `{ meta, theme, scenes }`

```json
{
  "meta":  { "title": "Title", "avatar": { "video": "", "bg": "assets/studio_bg.png", "tag": "YOUR NAME" } },
  "theme": { "preset": "obsidian" },
  "scenes": [
    { "type": "cover", "dur": 6, "avatar": "card", "sub": ["Today let's talk about one question"],
      "data": { "kicker": "EPISODE 01", "title": "Talking-head\nas templates", "subtitle": "Driven by one **JSON** script" } }
  ]
}
```

- `sub[]` holds this scene's subtitle lines (auto highlighted word by word); `**keyword**` in titles gets the accent color; `dur` is in seconds.
- For each scene type's full `data` fields, copy the matching scene from the target pack's `demo_data.json`; do not invent fields.
- Put the script in the style-pack folder and load it with `?data=my_script.json`; all packs share the same fields, so switching style only means switching folder (or using the top-right switcher).

**Real-footage sync fields (v3.2, all optional; without them output is frame-identical to the original)** — all times are **absolute seconds on the whole-video timeline** (counted from the start of scene 1, not seconds relative to the scene):
- `sc.words`: `[["word", absStart, absEnd], ...]` → real word-level subtitle highlighting; if omitted, falls back to spreading `sub[]` evenly.
  Lines follow this scene's `sub[]`: the engine aligns them character by character (LCS) to the words actually spoken — extra words join the nearest line, skipped words are dropped, rephrasing does not shift lines — and splits any mapped line wider than 14 at pauses; without `sub[]` it splits at pauses ≥ 0.3 s / ≤ 14 characters per line.
  Relative-seconds auto-correction covers **one case only**: from scene 2 on (`start > 0`), the first word starts more than 0.5 s before the scene start, and after adding the scene start every word lands inside `[start − 1 s, end + 1 s]` → the whole scene is shifted and a `console.warn` is emitted.
  Otherwise times are left as they are, and any word still outside that window triggers a `console.warn` naming the scene number and word indices. So always write absolute seconds and watch the console when inspecting frames.
- `sc.avatarCues`: `[[absSec, "card|pip|corner|full"], ...]` → switch avatar mode within a scene.
- `meta.audio`: `"voice.wav"` or `{ "src": "...", "offset": 0, "volume": 1 }` → voice track, used as the master clock during playback.
  ⚠️ **The avatar `<video>` in all 12 templates is muted by default; the presenter video's own audio track is never used**: you must supply the voice via `meta.audio` (or `--audio` at export), otherwise the final video is silent.
- `meta.themeCues`: `[[absSec, "obsidian", "badge text"], ...]` → live skin changes over time (01–06 only).

```json
{
  "meta": { "audio": { "src": "voice.wav", "offset": 0, "volume": 1 },
            "themeCues": [[6, "obsidian", "Night mode"]] },
  "scenes": [
    { "type": "cover", "dur": 6, "sub": ["Hello everyone"], "words": [["Hello", 0.4, 0.8], ["everyone", 0.8, 1.4]] },
    { "type": "stat", "dur": 5, "sub": ["Scene two"], "avatarCues": [[8.5, "pip"]],
      "words": [["Scene", 6.2, 6.5], ["two", 6.5, 6.9]] }
  ]
}
```

## 4. Standard 5-step workflow

1. **Pick style and skin**: ask the user which pack they want; if unspecified, recommend 1 style from all 12 using "Good for + mood" in section 1 (plus 1 skin for 01–06), and offer 1 alternative.
2. **Write the JSON script**: following section 3, split the voice-over into 6–10 scenes, pick the best scene type and avatar mode for each, and keep the original wording in `sub[]`.
   One scene, one idea; keep on-screen text short — never cram in paragraphs of small text.
3. **Headless frame inspection** (mandatory):
   ```bash
   python core/tools/inspect_frames.py --template 05_pro_nle --data my_script.json --theme color_grade --times 3,9.5,17,25 --out scratch_verify/my_ep
   ```
   `--data` (script, relative to the pack folder) and `--theme` (skin) are both optional; omitted means default script / default skin.
   Use each scene's midpoint for `--times`; the output must be `ZERO_ERRORS`, then check every screenshot: no overlapping text, nothing covering the face or subtitles, high contrast on light and dark skins.
   In `quote` scenes the card takes a fixed ~40% of the frame width on one side (including the "must read" sticker) and the engine does not detect faces: keep the speaker's face in the other 60% (default left card → face centered or right of center), or set `"pos": "right"`.
   For a full regression after changing a template: `python core/tools/smoke_test.py --baseline <screenshots-before-change>` (12 packs × 3 frames, zero errors + pixel diff).
   Screenshots, videos and other large files stay in `scratch_verify/`; never commit them.
4. **Deliver a preview**:
   ```bash
   python core/tools/serve.py      # http://127.0.0.1:8765/
   ```
   Give the user `http://127.0.0.1:8765/templates/<pack>/index.html?data=my_script.json&theme=<skin>`,
   and explain: the same script can switch to any of the other 11 styles (switch folder), and 01–06 can also switch to the other 3 skins of the same style (switch `?theme=`).
   Online (demo only): https://mushanhe.github.io/Mushanhe_Video_Engine/
5. **One-click MP4 export** (after the user approves the look; requires `pip install playwright` + `playwright install chromium` (optional if Edge / Chrome is installed) + `ffmpeg` on PATH):
   ```bash
   python core/tools/export_mp4.py --template 05_pro_nle --data my_script.json --theme color_grade --res 1080p --out output/my_ep.mp4
   python core/tools/export_mp4.py --template 05_pro_nle --data my_script.json --res 4k --audio voice.wav --out output/my_ep_4k.mp4
   ```
   Duration defaults to the script length; `--audio` takes an external voice / master (defaults to the script's `meta.audio`), `--bgm bgm.mp3 --bgm-vol 0.1` adds optional looping background music;
   `--start` / `--duration` export just a slice for a smoke test, `--workers` renders chunks in parallel. Output must end with `ZERO_ERRORS`; put renders in `output/`, never commit them.
   **Expected time**: local headless frame-by-frame rendering takes about 3–10× real time at 1080p (depending on machine and assets), longer at 4K; at start it prints total frames / workers / estimated minutes,
   then progress and ETA every 5s. Smoke-test with `--duration 3` first to confirm picture and sound, then export the full video.

## 5. Ground rules

- Script JSON is loaded with `fetch`, so pages must be opened through `serve.py`, not by double-clicking the HTML.
- Do not modify `core/`; put new needs into the script or the pack's own `themes.js` / components.
- Unified component interface: `create(data, ctx) → { el, layer, avatar, cams, update(localT), w? }`; `update` must be deterministic.
- Shortcuts: `Space` play / pause · `1`–`9` / `0` jump to scene · `H` hide controls.
