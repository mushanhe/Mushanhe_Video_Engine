/**
 * Mushanhe Video Engine — 风格包 02 · 瑞士国际主义印刷拼贴 · 零代码换肤系统（templates/02_swiss_print/themes.js）
 * ---------------------------------------------------------------------------
 *   window.SwissPrintThemes = { PRESETS, apply(name, opts?), mountSwitcher(container?), current(), resolve(script?), init(script?), list() }
 *
 *   - PRESETS        : 4 套皮肤（classic 默认·瑞士红 / bauhaus 包豪斯蓝黄 / midnight 暗夜版画 / botanical 博物森林绿）
 *   - apply(name)    : 切换皮肤（幂等、无刷新）。写 <html data-sp-theme>，注入/更新 <style id="sp-theme-override">，
 *                      并把 ?theme=xxx 同步进地址栏（history.replaceState）
 *   - mountSwitcher(): 右上角极简瑞士印刷色票条（4 枚方形色块）；跟随 #hud 显隐（H 键 / ?clean=1）
 *   - resolve(script): 启动皮肤名：URL ?theme= ＞ 剧本 theme.preset ＞ 'classic'
 *   - init(script)   : apply(resolve(script), { syncUrl:false }) + mountSwitcher()，宿主页 boot() 一行接入
 *
 * 兼容约定：
 *   - classic = 不注入任何覆盖规则、不写 data-sp-theme，即与原页面逐像素一致（剧本 theme.paper/red/... 仍照常生效）。
 *   - 其余皮肤的 --sp-* 变量以 !important 声明在 :root[data-sp-theme="x"] 上，压过宿主按剧本 theme 写入的内联变量；
 *     components.js / index.html 里写死的颜色（字幕条、折页、发丝线、SVG 道具描边、网格纸等）在此按皮肤逐项改写，
 *     保证所有文字 / 卡片 / 边框 / 字幕 / 人像框高对比（暗色皮肤无黑字黑底，浅色皮肤无白字白底）。
 */
(function (global) {
  'use strict';

  const DEFAULT = 'classic';
  const STYLE_ID = 'sp-theme-override';
  const SWITCHER_ID = 'sp-theme-switcher';
  const ATTR = 'data-sp-theme';

  function hexRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  // ============================== 4 套皮肤 ==============================
  /**
   * vars     : --sp-paper / sheet / sheet-2 / red / ink / grey（red = 主点缀色槽位：关键词、标签、印章、尺寸线）
   * panel    : 原“油墨黑实底块”（文件夹、对比色带、结论条、CTA、标签页）的底色与字色
   * accent2  : 第二点缀（包豪斯信号黄 / 博物赛车绿），用于便签荧光、胶带、文件夹标签等
   * onAccent : 主点缀实底块上的文字色
   * hot      : 实底深色块上的点缀字色（结论条标签 / CTA 小标题 / 代码关键字）
   */
  const PRESETS = {
    classic: {
      label: '瑞士红', en: 'CLASSIC', dots: ['#EDE8DC', '#D92323'], dark: false,
      desc: '默认·米白网格纸 + 瑞士红 #D92323 + 油墨黑',
      vars: null
    },
    bauhaus: {
      label: '包豪斯', en: 'BAUHAUS', dots: ['#1D4ED8', '#F5B700'], dark: false,
      desc: '包豪斯蓝黄：暖白纸 #F4F1E8 + 钴蓝 #1D4ED8 + 信号黄 #F5B700 + 炭黑',
      vars: { paper: '#F4F1E8', sheet: '#FBF9F3', sheet2: '#FFFDF8', red: '#1D4ED8', ink: '#1C1C1C', grey: '#57534A' },
      inkRGB: '28,28,28', panel: { bg: '#1C1C1C', text: '#FBF9F3', line: 'rgba(251,249,243,.3)' },
      accent2: '#F5B700', onAccent2: '#1C1C1C', onAccent: '#FFFFFF', hot: '#F5B700',
      noteHL: 'rgba(245,183,0,.92)', margin: 'rgba(29,78,216,.45)', tape: 'rgba(245,183,0,.55)',
      cover: { bg: '#1D4ED8', text: '#FFFFFF' }, front: { bg: '#E9E3D2', fold: '#D8D0BC' },
      code: { bg: '#161616', text: '#F4F1E8', ln: '#6B675E', c: '#8E8A80', k: '#F5B700', ok: '#7BC29A', border: 'rgba(244,241,232,.12)' },
      sub: { bg: '#FBF9F3', bar: '#1D4ED8', text: '#1C1C1C', active: '#1D4ED8', ring: 'none' },
      tabs: { bg: '#FBF9F3', text: 'rgba(28,28,28,.48)', on: '#1C1C1C', track: 'rgba(28,28,28,.14)', fill: '#1D4ED8' },
      grid: ['rgba(28,28,28,.085)', 'rgba(28,28,28,.035)'], colNo: 'rgba(28,28,28,.42)',
      grain: { opacity: 0.45, blend: 'multiply' }, shadowRGB: '28,24,12', stampBlend: 'multiply'
    },
    midnight: {
      label: '暗夜版画', en: 'MIDNIGHT', dots: ['#121316', '#FF453A'], dark: true,
      desc: '暗夜版画：深墨黑纸 #121316 + 浅灰网格 + 朱砂红 #FF453A + 象牙白文字 #F5F2EB',
      vars: { paper: '#121316', sheet: '#1E2025', sheet2: '#24272D', red: '#FF453A', ink: '#F5F2EB', grey: '#ADA89D' },
      inkRGB: '245,242,235', panel: { bg: '#F5F2EB', text: '#121316', line: 'rgba(18,19,22,.3)' },
      accent2: '#FF453A', onAccent2: '#121316', onAccent: '#121316', hot: '#E0261B',
      noteHL: 'rgba(255,69,58,.62)', margin: 'rgba(255,69,58,.6)', tape: 'rgba(236,226,196,.42)',
      cover: { bg: '#FF453A', text: '#121316' }, front: { bg: '#2B2E35', fold: '#3B3F47' },
      code: { bg: '#0A0B0D', text: '#F5F2EB', ln: '#7C776C', c: '#9C978C', k: '#FF6A60', ok: '#7BD3A2', border: 'rgba(245,242,235,.14)' },
      sub: { bg: '#1E2025', bar: '#FF453A', text: '#F5F2EB', active: '#FF453A', ring: '0 0 0 1px rgba(245,242,235,.16)' },
      tabs: { bg: '#1E2025', text: 'rgba(245,242,235,.48)', on: '#F5F2EB', track: 'rgba(245,242,235,.16)', fill: '#FF453A' },
      grid: ['rgba(214,214,220,.12)', 'rgba(214,214,220,.05)'], colNo: 'rgba(245,242,235,.42)',
      grain: { opacity: 0.22, blend: 'screen' }, shadowRGB: '0,0,0', stampBlend: 'normal'
    },
    botanical: {
      label: '博物森林', en: 'BOTANICAL', dots: ['#14532D', '#C2410C'], dark: false,
      desc: '博物森林绿：复古羊皮纸 #EFECE2 + 英国赛车绿 #14532D + 铜橙 #C2410C + 深墨绿文字',
      vars: { paper: '#EFECE2', sheet: '#F7F5EE', sheet2: '#FBFAF5', red: '#C2410C', ink: '#11281B', grey: '#4E5A4F' },
      inkRGB: '17,40,27', panel: { bg: '#14532D', text: '#F7F5EE', line: 'rgba(247,245,238,.32)' },
      accent2: '#14532D', onAccent2: '#F7F5EE', onAccent: '#FFFFFF', hot: '#FDBA74',
      noteHL: 'rgba(253,186,116,.9)', margin: 'rgba(194,65,12,.5)', tape: 'rgba(214,200,158,.72)',
      cover: { bg: '#14532D', text: '#F7F5EE' }, front: { bg: '#E2DCCB', fold: '#D2CAB4' },
      code: { bg: '#0F2418', text: '#EFECE2', ln: '#5E7263', c: '#8A9A8C', k: '#FB923C', ok: '#86D3A4', border: 'rgba(239,236,226,.12)' },
      sub: { bg: '#F7F5EE', bar: '#14532D', text: '#11281B', active: '#C2410C', ring: 'none' },
      tabs: { bg: '#F7F5EE', text: 'rgba(17,40,27,.48)', on: '#11281B', track: 'rgba(17,40,27,.14)', fill: '#C2410C' },
      grid: ['rgba(17,40,27,.085)', 'rgba(17,40,27,.035)'], colNo: 'rgba(17,40,27,.42)',
      grain: { opacity: 0.5, blend: 'multiply' }, shadowRGB: '24,30,18', stampBlend: 'multiply'
    }
  };

  // ============================== CSS 生成 ==============================
  function buildCSS(name) {
    const T = PRESETS[name];
    if (!T || !T.vars) return '';
    const V = T.vars, S = `:root[${ATTR}="${name}"]`, I = T.inkRGB, SH = T.shadowRGB;
    const line = (a) => `rgba(${I},${a})`;
    const sh = (a) => `rgba(${SH},${a})`;
    const gridBg = `linear-gradient(90deg, ${T.grid[0]} 1px, transparent 1px), linear-gradient(${T.grid[1]} 1px, transparent 1px)`;
    const P = T.panel;
    return `
/* ===== SwissPrintThemes · ${name} ===== */
${S}{--sp-paper:${V.paper} !important;--sp-sheet:${V.sheet} !important;--sp-sheet-2:${V.sheet2} !important;--sp-red:${V.red} !important;--sp-ink:${V.ink} !important;--sp-grey:${V.grey} !important;
  --sp-shadow:0 1px 1px ${sh(T.dark ? 0.5 : 0.10)}, 0 10px 18px -8px ${sh(T.dark ? 0.7 : 0.30)}, 0 26px 44px -22px ${sh(T.dark ? 0.7 : 0.30)} !important;
  --sp-shadow-lg:0 2px 2px ${sh(T.dark ? 0.5 : 0.10)}, 0 18px 30px -12px ${sh(T.dark ? 0.75 : 0.34)}, 0 46px 80px -34px ${sh(T.dark ? 0.8 : 0.38)} !important}
/* 网格纸 / 栏号 / 纸纹 / 抽纸 */
${S} #paper-world, ${S} #pull-sheet{background-image:${gridBg} !important}
${S} #pull-sheet{box-shadow:-40px 0 70px ${sh(T.dark ? 0.75 : 0.45)}, 40px 0 70px ${sh(T.dark ? 0.75 : 0.45)} !important}
${S} .col-no{color:${T.colNo} !important}
${S} #paper-grain{opacity:${T.grain.opacity} !important;mix-blend-mode:${T.grain.blend} !important}
/* 顶部句型标签 */
${S} #sp-tabs{background:${T.tabs.bg} !important;${T.dark ? `box-shadow:var(--sp-shadow), 0 0 0 1px ${line(0.12)} !important;` : ''}}
${S} .sp-tab{color:${T.tabs.text} !important}
${S} .sp-tab.on{color:${T.tabs.on} !important}
${S} .sp-tab .tr{background:${T.tabs.track} !important}
${S} .sp-tab .fl{background:${T.tabs.fill} !important}
/* 人像框 */
${S} #avatar-stage{border-color:${V.ink} !important}
${S} #avatar-tag{background:${V.ink} !important;color:${V.paper} !important}
${S} #avatar-tag i{background:${V.red} !important}
/* 字幕条 */
${S} #subtitle-bar{background:${T.sub.bg} !important;border-left:6px solid ${T.sub.bar} !important;color:${T.sub.text} !important;
  box-shadow:${T.sub.ring === 'none' ? '' : T.sub.ring + ', '}0 1px 1px ${sh(T.dark ? 0.5 : 0.14)}, 0 10px 22px -6px ${sh(T.dark ? 0.7 : 0.34)} !important}
${S} #subtitle-bar .w, ${S} #subtitle-bar .w.passed{color:${T.sub.text} !important}
${S} #subtitle-bar .w.active{color:${T.sub.active} !important}
${S} #pull-sheet .ps-lb{color:${V.ink} !important}
/* 通用道具 */
${S} .sp-tape{background:${T.tape} !important}
${S} .sp-prop{filter:drop-shadow(0 6px 6px ${sh(T.dark ? 0.6 : 0.22)}) !important}
${S} .sp-reg svg g{stroke:${V.ink} !important}
${S} .sp-prop svg path[fill-rule]{stroke:${line(0.55)} !important}
${S} .sp-prop svg g[stroke^="rgba(20"]{stroke:${line(0.6)} !important}
${S} .sp-stamp{mix-blend-mode:${T.stampBlend} !important}
${S} .sp-stamp.on-dark{mix-blend-mode:normal !important}
/* cover */
${S} .sp-cover-block{background:${T.cover.bg} !important;color:${T.cover.text} !important}
/* steps 文件夹 */
${S} .sp-f-tab, ${S} .sp-f-back{background:${P.bg} !important}
${S} .sp-f-tab{color:${P.text} !important}
${S} .sp-f-sheet{box-shadow:0 4px 10px ${sh(T.dark ? 0.55 : 0.35)} !important}
${S} .sp-f-sheet::after{border-color:transparent ${P.bg} ${T.front.fold} transparent !important}
${S} .sp-f-front{background:${T.front.bg} !important;border-top-color:${V.ink} !important;box-shadow:0 -6px 14px ${sh(T.dark ? 0.55 : 0.25)} !important}
${S} .sp-f-front .bar{background:${T.accent2} !important}
${S} .sp-f-label{background:${T.accent2} !important;color:${T.onAccent2} !important}
/* checklist */
${S} .sp-a4 .margin{background:${T.margin} !important}
${S} .sp-rl{border-bottom-color:${line(0.16)} !important}
${S} .sp-note .hl{background:${T.noteHL} !important}
/* compare */
${S} .sp-cmp .band{background:${P.bg} !important;color:${P.text} !important}
${S} .sp-cmp.right .band{background:${V.red} !important;color:${T.onAccent} !important}
${S} .sp-verdict{background:${P.bg} !important;color:${P.text} !important}
${S} .sp-verdict b{color:${T.hot} !important}
/* showcase */
${S} .sp-panel.dark{background:${T.code.bg} !important;color:${T.code.text} !important;${T.dark ? `box-shadow:var(--sp-shadow-lg), 0 0 0 2px ${line(0.14)} !important;` : ''}}
${S} .sp-panel .bar{border-bottom-color:${T.code.border} !important}
${S} .sp-panel.light .bar{border-bottom-color:${line(0.12)} !important}
${S} .sp-code .ln{color:${T.code.ln} !important}
${S} .sp-code .c{color:${T.code.c} !important}
${S} .sp-panel.dark .sp-code .k{color:${T.code.k} !important}
${S} .sp-code .ok{color:${T.code.ok} !important}
${S} .sp-note-pin b{color:${T.onAccent} !important;box-shadow:0 4px 10px ${sh(T.dark ? 0.6 : 0.35)} !important}
${S} .sp-prod .row{border-bottom-color:${line(0.16)} !important}
/* quote（屏幕层，压在全屏人像上） */
${S} .sp-quote{box-shadow:0 2px 2px rgba(0,0,0,.2),0 30px 60px -10px rgba(0,0,0,.6)${T.dark ? `, 0 0 0 1px ${line(0.14)}` : ''} !important}
/* outro */
${S} .sp-cta{background:${P.bg} !important;color:${P.text} !important}
${S} .sp-cta .k{color:${T.hot} !important}
${S} .sp-cta .repo{border-color:${P.line} !important}
${S} .sp-cta .btns span{background:${V.sheet} !important;color:${V.ink} !important;${T.dark ? 'box-shadow:inset 0 0 0 2px rgba(18,19,22,.85);' : ''}}
${S} .sp-cta .btns span:first-child{background:${V.red} !important;color:${T.onAccent} !important}
/* stat / timeline / diagram */
${S} .sp-stat .bar{background:${line(0.12)} !important}
${S} .sp-tl-node.now{color:${T.onAccent} !important}
${S} .sp-tl-node.now .tm{color:${T.onAccent} !important}
${S} .sp-tl-node.now .d, ${S} .sp-dg-node.hot .s{color:${T.onAccent === '#121316' ? 'rgba(18,19,22,.82)' : 'rgba(255,255,255,.88)'} !important}
${S} .sp-dg-node.hot{color:${T.onAccent} !important}
${S} .sp-dg-node.hot .l{color:${T.onAccent} !important}
${T.dark ? `${S} .sp-sheet, ${S} .sp-a4, ${S} .sp-act, ${S} .sp-cmp{outline:1px solid ${line(0.08)}}` : ''}
`;
  }

  // ============================== apply ==============================
  const state = { name: null, switcher: null, observer: null, keyBound: false };

  function normalize(name) {
    const k = String(name == null ? '' : name).trim().toLowerCase();
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
    } catch (_) { /* file:// 或沙箱环境下忽略 */ }
  }

  /**
   * 切换皮肤。未知名称回退到 classic。
   * @param {string} name   classic | bauhaus | midnight | botanical
   * @param {object} [opts] { syncUrl?: boolean } 默认 true；classic 且地址栏原本没有 ?theme= 时不写参数
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
      try { global.dispatchEvent(new CustomEvent('sp:themechange', { detail: { name: key, preset: PRESETS[key] } })); } catch (_) {}
    }
    return key;
  }

  /** 启动皮肤：URL ?theme= ＞ 剧本 theme.preset ＞ classic */
  function resolve(script) {
    let fromUrl = null;
    try { fromUrl = normalize(new URL(global.location.href).searchParams.get('theme')); } catch (_) {}
    if (fromUrl) return fromUrl;
    const preset = script && script.theme && normalize(script.theme.preset);
    return preset || DEFAULT;
  }

  // ============================== 瑞士印刷色票条 ==============================
  // 直角、无圆角、等宽小字、左侧点缀竖条 + 方形双色色票；底色/字色跟随当前皮肤变量
  const SW_CSS = `
#${SWITCHER_ID}{position:fixed;top:12px;right:12px;z-index:1000;display:flex;align-items:stretch;gap:0;padding:0;
  background:var(--sp-sheet,#F7F4EC);color:var(--sp-ink,#141414);border:2px solid var(--sp-ink,#141414);border-left:8px solid var(--sp-red,#D92323);
  box-shadow:0 10px 24px -8px rgba(0,0,0,.45);font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace;font-size:11px;font-weight:800;letter-spacing:.1em;user-select:none}
#${SWITCHER_ID}.hidden{display:none}
#${SWITCHER_ID} .lb{display:flex;align-items:center;padding:0 12px 0 10px;opacity:.6;white-space:nowrap}
#${SWITCHER_ID} button{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 13px 8px 10px;border-left:1px solid currentColor;white-space:nowrap;color:inherit;opacity:.62;transition:opacity .12s,background .12s}
#${SWITCHER_ID} button:hover{opacity:1}
#${SWITCHER_ID} button.on{opacity:1;background:var(--sp-ink,#141414);color:var(--sp-sheet,#F7F4EC)}
#${SWITCHER_ID} button:focus-visible{outline:2px solid var(--sp-red,#D92323);outline-offset:-3px}
#${SWITCHER_ID} .dt{position:relative;width:14px;height:14px;flex:none;box-shadow:0 0 0 1px currentColor}
#${SWITCHER_ID} .dt i{position:absolute;right:0;bottom:0;width:7px;height:14px}
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

  function mountSwitcher(container) {
    const host = container || document.body;
    if (!host) return null;
    if (!document.getElementById(`${SWITCHER_ID}-css`)) {
      const st = document.createElement('style'); st.id = `${SWITCHER_ID}-css`; st.textContent = SW_CSS;
      (document.head || document.documentElement).appendChild(st);
      ensureStyle(); // 覆盖层保持在 <head> 最后
    }
    let el = state.switcher || document.getElementById(SWITCHER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = SWITCHER_ID;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', '换肤');
      el.innerHTML = `<span class="lb">SKIN</span>` + Object.keys(PRESETS).map((k) => {
        const p = PRESETS[k];
        return `<button type="button" data-theme="${k}" title="${p.desc}"><span class="dt" style="background:${p.dots[0]}"><i style="background:${p.dots[1]}"></i></span>${p.label}</button>`;
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

  function init(script, opts) {
    const name = apply(resolve(script), { syncUrl: false });
    if (!(opts && opts.switcher === false)) mountSwitcher(opts && opts.container);
    return name;
  }

  global.SwissPrintThemes = {
    PRESETS, apply, mountSwitcher, resolve, init,
    current: () => state.name || DEFAULT,
    list: () => Object.keys(PRESETS)
  };

  // 加载即生效：URL 带 ?theme= 时立即套用（首帧无闪烁）；不带参数什么都不做
  try {
    const q = normalize(new URL(global.location.href).searchParams.get('theme'));
    if (q) apply(q, { syncUrl: false });
  } catch (_) {}
})(window);
