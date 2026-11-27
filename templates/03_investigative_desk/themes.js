/**
 * Mushanhe Video Engine — 风格包 03 · 深度调查桌面 · 实时换肤系统（templates/03_investigative_desk/themes.js）
 * ---------------------------------------------------------------------------
 *   window.InvestigativeDeskThemes = { PRESETS, init(script), apply(name, opts?), mountSwitcher(container?), resolve(script?), current(), list() }
 *
 *   - PRESETS        : 4 套皮肤（linen 默认 / night_desk / blueprint / newsprint）
 *   - apply(name)    : 切换皮肤（幂等、无刷新）。写 <html data-vx-theme>，注入/更新 <style id="vx-theme-override">，
 *                      并把 ?theme=xxx 同步进地址栏（history.replaceState）
 *   - mountSwitcher(): 右上角“档案标签”式 4 色换肤胶囊条；跟随 #hud 显隐（H 键 / ?clean=1）
 *   - resolve(script): 启动皮肤：URL ?theme= ＞ 剧本 theme.preset ＞ 'linen'
 *   - init(script)   : apply(resolve(script), { syncUrl:false }) + mountSwitcher()，宿主 boot() 一行接入
 *
 * 兼容约定：
 *   - linen = 不注入任何覆盖规则，无参数访问与原版逐像素一致。
 *   - 其余皮肤用 :root[data-vx-theme="x"] + !important，压过 boot() 按剧本 theme 写入的内联 CSS 变量与组件内联描边色。
 *   - 文字分两层取色：纸面文字走 --vx-ink（各皮肤纸张始终是浅色纸 + 深色墨），直接落在桌面上的文字（标题、证物编号、
 *     笔记标签等）走皮肤的 deskText，保证暗色桌面上绝不出现深字配深底。
 *   - 不改 core/、components.js；只依赖 DOM。
 */
(function (global) {
  'use strict';

  const DEFAULT = 'linen';
  const STYLE_ID = 'vx-theme-override';
  const SWITCHER_ID = 'vx-theme-switcher';
  const ATTR = 'data-vx-theme';

  function hexRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  // ============================== 4 套皮肤 ==============================
  /**
   * vars      : --vx-desk / paper / yellow(荧光笔) / red(纸面红笔·印章·编号) / ink(纸面墨) / muted
   * string    : 桌面上的调查丝线、红图钉、箭头（可与纸面 red 不同：暗色桌面用更亮的版本）
   * deskText  : 直接写在桌面上的文字；hlText：桌面标题里被荧光笔划过的字
   * surface   : 原本用 --vx-ink 填充的深色块（结论条 / CTA 卡 / VS 章 / 宝丽来底片），暗色桌面上换成带描边的抬升色
   * glow      : 深色块上的浅强调字（原 #FFE499）
   */
  const PRESETS = {
    linen: {
      label: '亚麻', en: 'LINEN', dots: ['#EFE9DC', '#FFE14D', '#D92B4B'], dark: false,
      desc: '默认·暖亚麻案桌：亚麻切割垫 + 荧光黄马克笔 + 调查红丝线',
      vars: null
    },
    night_desk: {
      label: '台灯夜', en: 'NIGHT DESK', dots: ['#181614', '#FFD166', '#F43F5E'], dark: true,
      desc: '台灯暗夜案桌：深胡桃木炭桌面 + 暖台灯琥珀黄 + 猩红丝线 + 米白文档纸',
      vars: { desk: '#181614', paper: '#F5EFE2', yellow: '#FFD166', red: '#E11D48', ink: '#231C15', muted: '#6B5B4A' },
      string: '#F43F5E', deskText: '#F5EFE2', deskSub: 'rgba(245,239,226,.62)', hlText: '#1A140E',
      cam: 'radial-gradient(ellipse at 40% 42%, #2C251E 0%, #1A1715 55%, #0D0C0B 100%)',
      grid: ['rgba(255,214,150,.055)', 'rgba(255,214,150,.025)'], wm: 'rgba(255,214,150,.05)',
      lamp: 'radial-gradient(ellipse 60% 62% at 38% 40%, rgba(255,209,102,.10) 0%, rgba(255,209,102,0) 55%, rgba(0,0,0,.50) 100%)',
      grain: 0.18, ring: 'rgba(255,209,102,.10)',
      tag: ['#FFD166', '#1A140E'], exB: ['#FFD166', '#1A140E'],
      card: '#FBF6EA', polar: '#F8F2E6', quote: '#F1E9D8', wrong: ['#E4DCCB', '#7A6B58', '#FBF6EA'],
      sticky: ['#FFEDB5', '#FFD98A', 'rgba(160,110,20,.35)'], noteSmall: '#8A5200',
      folder: { tab: '#C9A15E', a: '#DDB978', b: '#D1AA62', border: 'rgba(90,60,20,.35)' },
      dgHot: ['#FFE7A8', '#FFD166'], dgHotS: '#5A3E08', hlFade: 'rgba(255,209,102,0)', barInset: 'rgba(170,110,0,.35)',
      surface: '#2A231C', surfaceLine: 'rgba(255,209,102,.30)', glow: '#FFD166', btn: '#3E342A',
      pinRed: 'radial-gradient(circle at 32% 32%,#FF9CAE 0%,#F43F5E 58%,#7A0C20 100%)',
      tape: 'rgba(230,206,150,.78)', strShadow: 'rgba(0,0,0,.45)',
      shadow: '0 2px 3px rgba(0,0,0,.35), 0 14px 26px -10px rgba(0,0,0,.65), 0 30px 54px -26px rgba(0,0,0,.6)',
      shadowLg: '0 3px 4px rgba(0,0,0,.35), 0 22px 40px -14px rgba(0,0,0,.7), 0 50px 90px -36px rgba(0,0,0,.7)',
      tabs: { bg: '#0E0C0A', line: 'rgba(255,209,102,.22)', text: 'rgba(245,239,226,.45)', on: '#F5EFE2' },
      avatar: { bg: '#120F0D', frame: '#F5EFE2' },
      sub: { bg: '#0E0C0A', text: '#F5EFE2', line: 'rgba(255,209,102,.28)' }
    },
    blueprint: {
      label: '蓝图', en: 'BLUEPRINT', dots: ['#10243E', '#38BDF8', '#FACC15'], dark: true,
      desc: '档案蓝图桌：工程深蓝桌面 + 细白网格 + 荧光青丝线 + 警示黄马克笔 + 冷白图纸',
      vars: { desk: '#10243E', paper: '#F2F6FB', yellow: '#FACC15', red: '#0369A1', ink: '#0B1E36', muted: '#46607E' },
      string: '#38BDF8', deskText: '#F1F7FD', deskSub: 'rgba(226,238,250,.62)', hlText: '#0B1E36',
      cam: 'radial-gradient(ellipse at 42% 42%, #17345A 0%, #10243E 58%, #0A1729 100%)',
      grid: ['rgba(226,238,250,.11)', 'rgba(226,238,250,.045)'], wm: 'rgba(226,238,250,.05)',
      lamp: 'radial-gradient(ellipse 75% 70% at 38% 42%, rgba(56,189,248,.04) 0%, rgba(56,189,248,0) 55%, rgba(3,10,22,.42) 100%)',
      grain: 0.12, ring: 'rgba(56,189,248,.14)',
      tag: ['#FACC15', '#0B1E36'], exB: ['#FACC15', '#0B1E36'],
      card: '#F8FBFF', polar: '#F5F9FD', quote: '#ECF2F9', wrong: ['#DCE5F0', '#5B7189', '#F8FBFF'],
      sticky: ['#FEF6C9', '#FDE68A', 'rgba(150,110,0,.32)'], noteSmall: '#7A5600',
      folder: { tab: '#9FB9D9', a: '#C3D5EA', b: '#AFC6E2', border: 'rgba(11,30,54,.28)' },
      dgHot: ['#FEF3A3', '#FACC15'], dgHotS: '#4A3A00', hlFade: 'rgba(250,204,21,0)', barInset: 'rgba(160,120,0,.35)',
      surface: '#0A1A30', surfaceLine: 'rgba(56,189,248,.38)', glow: '#FACC15', btn: '#1C3556',
      pinRed: 'radial-gradient(circle at 32% 32%,#BAE6FD 0%,#38BDF8 55%,#075985 100%)',
      tape: 'rgba(214,228,244,.72)', strShadow: 'rgba(0,0,0,.40)',
      shadow: '0 2px 3px rgba(2,8,20,.35), 0 14px 26px -10px rgba(2,8,20,.6), 0 30px 54px -26px rgba(2,8,20,.55)',
      shadowLg: '0 3px 4px rgba(2,8,20,.35), 0 22px 40px -14px rgba(2,8,20,.65), 0 50px 90px -36px rgba(2,8,20,.65)',
      tabs: { bg: '#071426', line: 'rgba(56,189,248,.28)', text: 'rgba(226,238,250,.45)', on: '#F1F7FD' },
      avatar: { bg: '#0A1A2E', frame: '#F2F6FB' },
      sub: { bg: '#071426', text: '#F8FAFC', line: 'rgba(56,189,248,.35)' }
    },
    newsprint: {
      label: '新闻纸', en: 'NEWSPRINT', dots: ['#E5E5E0', '#34D399', '#B91C1C'], dark: false,
      desc: '复古新闻纸：冷灰报纸底 + 薄荷荧光绿马克笔 + 报社深红 + 油墨黑',
      vars: { desk: '#E5E5E0', paper: '#F8F8F4', yellow: '#34D399', red: '#B91C1C', ink: '#111111', muted: '#55554D' },
      string: '#B91C1C', deskText: '#111111', deskSub: 'rgba(17,17,17,.58)', hlText: '#111111',
      cam: 'radial-gradient(ellipse at 50% 45%, #EDEDE8 0%, #DCDCD5 70%, #C9C9C1 100%)',
      grid: ['rgba(17,17,17,.075)', 'rgba(17,17,17,.035)'], wm: 'rgba(17,17,17,.06)',
      lamp: 'radial-gradient(ellipse 75% 70% at 38% 42%, rgba(255,255,255,0) 55%, rgba(30,30,26,.18) 100%)',
      grain: 0.4, ring: null,
      tag: ['#111111', '#6EE7B7'], exB: ['#111111', '#6EE7B7'],
      card: '#FCFCF8', polar: '#FAFAF6', quote: '#F1F1EB', wrong: ['#E8E8E2', '#6E6E66', '#F8F8F4'],
      sticky: ['#DDF7EA', '#BDEFD6', 'rgba(16,120,80,.30)'], noteSmall: '#0F6B4A',
      folder: { tab: '#C2C2B8', a: '#D6D6CD', b: '#CACAC0', border: 'rgba(40,40,36,.28)' },
      dgHot: ['#C8F8E2', '#34D399'], dgHotS: '#0B4A33', hlFade: 'rgba(52,211,153,0)', barInset: 'rgba(4,120,87,.35)',
      surface: null, surfaceLine: null, glow: '#6EE7B7', btn: '#2E2E2B',
      pinRed: 'radial-gradient(circle at 32% 32%,#F08A8A 0%,#B91C1C 58%,#5A0A0A 100%)',
      tape: 'rgba(210,210,198,.8)', strShadow: null,
      shadow: '0 2px 3px rgba(20,20,18,.12), 0 14px 26px -10px rgba(20,20,18,.28), 0 30px 54px -26px rgba(20,20,18,.28)',
      shadowLg: '0 3px 4px rgba(20,20,18,.12), 0 22px 40px -14px rgba(20,20,18,.32), 0 50px 90px -36px rgba(20,20,18,.36)',
      tabs: { bg: '#111111', line: null, text: 'rgba(248,248,244,.42)', on: '#F8F8F4' },
      avatar: { bg: '#1E1E1C', frame: '#F8F8F4' },
      sub: { bg: '#111111', text: '#F8F8F4', line: null }
    }
  };

  // ============================== 覆盖样式生成 ==============================
  function buildCSS(name) {
    const T = PRESETS[name];
    if (!T || !T.vars) return '';
    const P = `:root[${ATTR}="${name}"]`;
    const V = T.vars;
    const out = [];
    const r = (s) => out.push(s);
    r(`/* ====== InvestigativeDeskThemes · ${name} ====== */`);
    r(`${P}{--vx-desk:${V.desk} !important;--vx-paper:${V.paper} !important;--vx-yellow:${V.yellow} !important;--vx-red:${V.red} !important;--vx-ink:${V.ink} !important;--vx-muted:${V.muted} !important;--vx-string:${T.string};--vx-shadow:${T.shadow} !important;--vx-shadow-lg:${T.shadowLg} !important;color-scheme:${T.dark ? 'dark' : 'light'}}`);
    // —— 桌面 ——
    r(`${P} #camera-viewport{background:${T.cam}}`);
    r(`${P} #desk-world{background-image:linear-gradient(${T.grid[0]} 1px,transparent 1px),linear-gradient(90deg,${T.grid[0]} 1px,transparent 1px),linear-gradient(${T.grid[1]} 1px,transparent 1px),linear-gradient(90deg,${T.grid[1]} 1px,transparent 1px)}`);
    r(`${P} .desk-wm{color:${T.wm}}`);
    r(`${P} .desk-ex{color:${T.deskSub}}`);
    r(`${P} .desk-ex b{background:${T.exB[0]};color:${T.exB[1]}}`);
    r(`${P} #desk-lamp{background:${T.lamp}}`);
    r(`${P} #desk-grain{opacity:${T.grain}}`);
    if (T.ring) r(`${P} #desk-world > svg:not(#desk-links) circle,${P} #desk-world > svg:not(#desk-links) path{stroke:${T.ring}}`);
    // —— 丝线 / 图钉 / 胶带 ——
    r(`${P} #desk-links path:not([transform]),${P} .vx-strings path.st,${P} .vx-strings path.ln:not(.sh){stroke:var(--vx-string) !important}`);
    r(`${P} .vx-strings marker path{fill:var(--vx-string) !important}`);
    if (T.strShadow) r(`${P} #desk-links path[transform],${P} .vx-strings path.sh{stroke:${T.strShadow} !important}`);
    r(`${P} .vx-pin.red,${P} .vx-callout b{background:${T.pinRed}}`);
    r(`${P} .vx-tape{background-color:${T.tape}}`);
    // —— 顶部句型标签 ——
    r(`${P} #vx-tabs{background:${T.tabs.bg};${T.tabs.line ? `box-shadow:0 0 0 1px ${T.tabs.line},0 10px 24px rgba(0,0,0,.45)` : ''}}`);
    r(`${P} .vx-tab{color:${T.tabs.text}}`);
    r(`${P} .vx-tab.on{color:${T.tabs.on}}`);
    r(`${P} .vx-tab .tr{background:${rgba('#FFFFFF', 0.14)}}`);
    // —— 人像框 ——
    r(`${P} #avatar-stage{border-color:${T.avatar.frame} !important;background:${T.avatar.bg}}`);
    r(`${P} #avatar-tag{color:${T.glow} !important}`);
    r(`${P} #avatar-silhouette text{fill:${T.glow}}`);
    // —— 字幕 ——
    r(`${P} #subtitle-bar{background:${T.sub.bg} !important;color:${T.sub.text} !important;border-left-color:var(--vx-yellow) !important;${T.sub.line ? `box-shadow:0 0 0 1px ${T.sub.line},0 14px 28px -8px rgba(0,0,0,.6) !important` : ''}}`);
    r(`${P} #subtitle-bar .w,${P} #subtitle-bar .w.passed{color:${T.sub.text} !important}`);
    r(`${P} #subtitle-bar .w.active{color:var(--vx-yellow) !important}`);
    // —— 直接落在桌面上的文字 ——
    r(`${P} .vx-zone > .vx-head{color:${T.deskText}}`);
    r(`${P} .vx-zone > .vx-head .vx-hl{color:${T.hlText}${T.dark ? ';padding:.16em .08em .06em;background-position:0 50%' : ''}}`);
    r(`${P} .vx-zone > .vx-penlabel{color:var(--vx-string)}`);
    r(`${P} .vx-tl-stem{border-left-color:${T.deskSub}}`);
    r(`${P} .vx-tag{background:${T.tag[0]};color:${T.tag[1]}}`);
    // —— 纸张 ——
    r(`${P} .vx-card{background-color:${T.card};background-image:linear-gradient(${rgba(V.red, 0.5)},${rgba(V.red, 0.5)}),repeating-linear-gradient(180deg,transparent 0 35px,rgba(70,120,200,.16) 35px 37px)}`);
    r(`${P} .vx-paper.bind::before{border-left-color:${rgba(V.red, 0.38)};border-right-color:${rgba(V.red, 0.38)}}`);
    r(`${P} .vx-sticky,${P} .vx-tl-node.now{background:linear-gradient(180deg,${T.sticky[0]} 0%,${T.sticky[1]} 100%);border-color:${T.sticky[2]}}`);
    r(`${P} .vx-note small{color:${T.noteSmall}}`);
    r(`${P} .vx-polar,${P} .vx-panel.photo,${P} .vx-prod .pic{background:${T.polar}}`);
    r(`${P} .vx-quote{background:${T.quote}}`);
    r(`${P} .vx-cmp.wrong{background:${T.wrong[0]}}`);
    r(`${P} .vx-cmp.wrong .band{background:${T.wrong[1]};color:${T.wrong[2]}}`);
    r(`${P} .vx-folder .tb{background:${T.folder.tab}}`);
    r(`${P} .vx-folder .bd{background:linear-gradient(180deg,${T.folder.a} 0%,${T.folder.b} 100%);border-color:${T.folder.border}}`);
    r(`${P} .vx-folder .big{color:${rgba(V.ink, 0.88)}}`);
    r(`${P} .vx-folder .meta{color:${rgba(V.ink, 0.78)}}`);
    r(`${P} .vx-dg-node.hot{background:linear-gradient(180deg,${T.dgHot[0]} 0%,${T.dgHot[1]} 100%)}`);
    r(`${P} .vx-dg-node.hot .s{color:${T.dgHotS}}`);
    r(`${P} .vx-dg-tag{background:${T.card}}`);
    r(`${P} .vx-hl{background-image:linear-gradient(100deg,${T.hlFade} 0%,var(--vx-yellow) 1.5%,var(--vx-yellow) 97%,${T.hlFade.replace(/,0\)$/, ',.25)')} 100%)}`);
    r(`${P} .vx-stat .bar i{box-shadow:inset 0 -5px 0 ${T.barInset}}`);
    r(`${P} .vx-stat .lb{border-bottom-color:${rgba(V.ink, 0.16)}}`);
    r(`${P} .vx-stat .bar{background:${rgba(V.ink, 0.07)}}`);
    r(`${P} .vx-rl,${P} .vx-prod .row{border-bottom-color:${rgba(V.ink, 0.2)}}`);
    r(`${P} .vx-panel.light .vx-code .ln{color:${rgba(V.muted, 0.6)}}`);
    // —— 深色块：结论条 / CTA / VS / 宝丽来底片 / 档案标签 ——
    const S = T.surface || V.ink;
    const SL = T.surfaceLine ? `,0 0 0 1.5px ${T.surfaceLine}` : '';
    r(`${P} .vx-verdict{background:${S};color:#FFFFFF;box-shadow:var(--vx-shadow-lg)${SL}}`);
    r(`${P} .vx-verdict .vx-hl{color:${T.hlText}}`);
    r(`${P} .vx-cta{background:${S};color:#FFFFFF;box-shadow:var(--vx-shadow-lg)${SL}}`);
    r(`${P} .vx-cta .repo{background:${V.paper};color:${V.ink}}`);
    r(`${P} .vx-cta .btns span{background:${T.btn};color:#FFFFFF}`);
    r(`${P} .vx-cta .btns span:first-child{background:var(--vx-yellow);color:${T.hlText}}`);
    r(`${P} .vx-cta .vx-hl{color:${T.hlText}}`);
    r(`${P} .vx-vs{background:${S};box-shadow:var(--vx-shadow)${SL}}`);
    r(`${P} .vx-polar .ph{background:${S}}`);
    r(`${P} .vx-cmp .band{background:${S};color:${T.glow}}`);
    r(`${P} .vx-verdict b,${P} .vx-cta .k,${P} .vx-cv-pol .l,${P} .vx-code .k{color:${T.glow}}`);
    r(`${P} .vx-callout span{border-left-color:var(--vx-yellow)}`);
    // —— 印章：暗色桌面上 multiply 会吃掉颜色，改为实底纸章 ——
    if (T.dark) r(`${P} .vx-stamp{mix-blend-mode:normal;background:${V.paper}}`);
    return out.join('\n');
  }

  // ============================== apply ==============================
  const state = { name: null, switcher: null, observer: null, keyBound: false };

  function normalize(name) {
    const k = String(name == null ? '' : name).trim().toLowerCase().replace(/-/g, '_');
    return Object.prototype.hasOwnProperty.call(PRESETS, k) ? k : null;
  }

  function ensureStyle() {
    let st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; }
    const head = document.head || document.documentElement;
    if (st.parentNode !== head || st !== head.lastElementChild) head.appendChild(st);
    return st;
  }

  function syncUrl(name) {
    try {
      const u = new URL(global.location.href);
      if (u.searchParams.get('theme') === name) return;
      u.searchParams.set('theme', name);
      global.history.replaceState(global.history.state, '', u.toString());
    } catch (_) { /* file:// 等环境忽略 */ }
  }

  /**
   * 切换皮肤；未知名称回退 linen。
   * @param {string} name  linen | night_desk | blueprint | newsprint
   * @param {object} [opts] { syncUrl?: boolean } 默认 true；linen 且地址栏原本没有 ?theme= 时不写参数
   */
  function apply(name, opts) {
    const o = opts || {};
    const key = normalize(name) || DEFAULT;
    const st = ensureStyle();
    const css = buildCSS(key);
    if (st.textContent !== css) st.textContent = css;
    const changed = state.name !== key;
    state.name = key;
    if (key === DEFAULT) document.documentElement.removeAttribute(ATTR);
    else document.documentElement.setAttribute(ATTR, key);
    if (o.syncUrl !== false) {
      let hasParam = false;
      try { hasParam = new URL(global.location.href).searchParams.has('theme'); } catch (_) {}
      if (key !== DEFAULT || hasParam) syncUrl(key);
    }
    if (changed) {
      renderSwitcherState();
      try { global.dispatchEvent(new CustomEvent('vx:themechange', { detail: { name: key, preset: PRESETS[key] } })); } catch (_) {}
    }
    return key;
  }

  /** 启动皮肤：URL ?theme= ＞ 剧本 theme.preset ＞ linen */
  function resolve(script) {
    let fromUrl = null;
    try { fromUrl = normalize(new URL(global.location.href).searchParams.get('theme')); } catch (_) {}
    if (fromUrl) return fromUrl;
    const preset = script && script.theme && normalize(script.theme.preset);
    return preset || DEFAULT;
  }

  // ============================== 档案标签式换肤胶囊条 ==============================
  const SW_CSS = `
#${SWITCHER_ID}{position:fixed;top:12px;right:12px;z-index:1000;display:flex;align-items:center;gap:3px;padding:5px 6px;border-radius:6px;
  background:#231C15;border-left:6px solid #FFE14D;box-shadow:0 10px 26px rgba(0,0,0,.42),0 0 0 1px rgba(255,228,153,.16);
  font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace;font-size:11px;font-weight:800;letter-spacing:.12em;user-select:none}
#${SWITCHER_ID}.hidden{display:none}
#${SWITCHER_ID} .lb{color:#FFE499;padding:0 8px 0 6px;white-space:nowrap}
#${SWITCHER_ID} button{all:unset;cursor:pointer;display:flex;align-items:center;gap:7px;padding:6px 10px 6px 7px;border-radius:4px;color:rgba(252,249,242,.62);white-space:nowrap;transition:background .15s,color .15s}
#${SWITCHER_ID} button:hover{background:rgba(252,249,242,.08);color:#FCF9F2}
#${SWITCHER_ID} button.on{background:#FCF9F2;color:#231C15}
#${SWITCHER_ID} button:focus-visible{outline:2px solid #FFE14D;outline-offset:1px}
#${SWITCHER_ID} .dt{display:flex;width:20px;height:14px;border-radius:2px;overflow:hidden;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.35)}
#${SWITCHER_ID} .dt i{flex:1}
#${SWITCHER_ID} button.on .dt{box-shadow:0 0 0 1px rgba(35,28,21,.45)}
`;

  function renderSwitcherState() {
    const el = state.switcher; if (!el) return;
    el.querySelectorAll('button[data-theme]').forEach((b) => {
      const on = b.getAttribute('data-theme') === state.name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function followHud() {
    const el = state.switcher; if (!el) return;
    const hud = document.getElementById('hud');
    if (hud) {
      const sync = () => el.classList.toggle('hidden', hud.classList.contains('hidden'));
      sync();
      if (state.observer) state.observer.disconnect();
      if (typeof MutationObserver === 'function') {
        state.observer = new MutationObserver(sync);
        state.observer.observe(hud, { attributes: true, attributeFilter: ['class'] });
      }
    } else {
      let clean = false;
      try { clean = new URL(global.location.href).searchParams.get('clean') === '1'; } catch (_) {}
      if (clean) el.classList.add('hidden');
      if (!state.keyBound) {
        state.keyBound = true;
        global.addEventListener('keydown', (e) => {
          if (document.getElementById('hud')) return;
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
          if (e.key === 'h' || e.key === 'H') state.switcher && state.switcher.classList.toggle('hidden');
        });
      }
    }
  }

  /** 渲染换肤胶囊条（幂等），固定在窗口右上角 */
  function mountSwitcher(container) {
    const host = container || document.body;
    if (!host) return null;
    if (!document.getElementById(`${SWITCHER_ID}-css`)) {
      const st = document.createElement('style'); st.id = `${SWITCHER_ID}-css`; st.textContent = SW_CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    let el = state.switcher || document.getElementById(SWITCHER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = SWITCHER_ID;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', '换肤');
      el.innerHTML = `<span class="lb">SKIN</span>` + Object.keys(PRESETS).map((k) => {
        const p = PRESETS[k];
        return `<button type="button" data-theme="${k}" title="${p.desc}"><span class="dt">${p.dots.map((c) => `<i style="background:${c}"></i>`).join('')}</span>${p.label}</button>`;
      }).join('');
      el.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('button[data-theme]');
        if (!b) return;
        apply(b.getAttribute('data-theme'), { syncUrl: true });
        b.blur();
      });
      el.addEventListener('keydown', (e) => { if (e.code === 'Space') e.preventDefault(); });
    }
    if (el.parentNode !== host) host.appendChild(el);
    state.switcher = el;
    if (!state.name) apply(resolve(), { syncUrl: false });
    renderSwitcherState();
    followHud();
    return el;
  }

  function init(script) {
    const name = apply(resolve(script), { syncUrl: false });
    mountSwitcher();
    return name;
  }

  global.InvestigativeDeskThemes = {
    PRESETS, apply, mountSwitcher, resolve, init,
    current: () => state.name,
    list: () => Object.keys(PRESETS)
  };
})(window);
