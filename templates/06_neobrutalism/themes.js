/**
 * Mushanhe Video Engine — 风格包 06 · 新粗野主义撞色潮刊 · 实时换肤系统（templates/06_neobrutalism/themes.js）
 * ---------------------------------------------------------------------------
 *   window.NeoBrutalismThemes = { PRESETS, init(script), apply(name, opts?), mountSwitcher(container?), resolve(script?), current(), list() }
 *
 *   - PRESETS        : 4 套皮肤（zine 默认 / acid / pop_pink / mono_ink）
 *   - apply(name)    : 切换皮肤（幂等、无刷新）。写 <html data-nb-theme>，注入/更新 <style id="nb-theme-override">，
 *                      并把 ?theme=xxx 同步进地址栏（history.replaceState）
 *   - mountSwitcher(): 右上角粗黑边硬投影「4 色换肤胶囊条」；跟随 #hud 显隐（H 键 / ?clean=1）
 *   - resolve(script): 启动皮肤名：URL ?theme= ＞ 剧本 theme.preset ＞ 'zine'
 *   - init(script)   : apply(resolve(script), { syncUrl:false }) + mountSwitcher()，宿主 boot() 一行接入
 *
 * 兼容约定：
 *   - zine = 不注入任何覆盖规则、不改 CSS 变量，与原页面逐像素一致。
 *   - 其余皮肤的 --nb-* 变量用 !important 写在 :root[data-nb-theme="x"] 上，压过 boot() 按剧本 theme 写入的内联变量。
 *   - 组件全部走 --nb-* 变量，切换后无需重建 DOM；少量硬编码色（#fff 字、#111 描边、字幕条等）在覆盖层里按皮肤修正，
 *     保证每套皮肤文字 / 卡片 / 边框 / 字幕 / 人像框高对比。
 */
(function (global) {
  'use strict';

  const DEFAULT = 'zine';
  const STYLE_ID = 'nb-theme-override';
  const SWITCHER_ID = 'nb-theme-switcher';
  const ATTR = 'data-nb-theme';

  // ============================== 4 套皮肤 ==============================
  /**
   * vars : 写入 --nb-paper / ink / yellow / blue / mint / coral（yellow=主高亮，blue/coral=深色块，mint=浅色块）
   * dot  : 背景波点色 · grid : 3D 画布网格线色 · sub : 字幕条
   * extra(P) : 该皮肤专属修正规则（P = 选择器前缀）
   */
  const PRESETS = {
    zine: {
      label: '潮刊', en: 'ZINE', dots: ['#F6F1E3', '#FFE500', '#3B82F6', '#FF4D6D'],
      desc: '默认·暖米波点潮刊 + 明黄 / 电光蓝 / 薄荷绿 / 珊瑚红',
      vars: null
    },
    acid: {
      label: '酸性', en: 'ACID', dots: ['#111111', '#CCFF00', '#A855F7', '#FF2E93'],
      desc: '酸性暗黑涂鸦：纯黑底 + 荧光酸绿 + 电光紫 + 热粉 + 粗亮边与硬投影',
      vars: { paper: '#111111', ink: '#111111', yellow: '#CCFF00', blue: '#A855F7', mint: '#2DE2E6', coral: '#FF2E93' },
      dot: 'rgba(244,244,240,.16)', grid: 'rgba(244,244,240,.05)',
      sub: { bg: '#111111', border: '#F4F4F0', shadow: '#CCFF00', text: '#FFFFFF', active: '#CCFF00' }, sil: '#CCFF00',
      extra: (P) => {
        const E = '#F4F4F0', SH = '#CCFF00', PK = '#FF2E93';
        return `
/* 粗亮边 + 荧光硬投影（只改外轮廓；卡片内部细线仍是墨黑） */
${P} .nb-box,${P} .nb-sticker,${P} .nb-stamp,${P} .nb-cover-block,${P} .nb-tape,${P} .nb-callout span,${P} .nb-tab{border-color:${E} !important}
${P} .nb-box{box-shadow:8px 8px 0 ${SH} !important}
${P} .nb-box.lg{box-shadow:12px 12px 0 ${SH} !important}
${P} .nb-box[style*="--nb-yellow"],${P} .nb-stat.hot,${P} .nb-verdict{box-shadow:12px 12px 0 ${PK} !important}
${P} .nb-cover-block{box-shadow:12px 12px 0 ${PK}}
${P} .nb-sticker{box-shadow:5px 5px 0 ${SH}}
${P} .nb-sticker[style*="--nb-yellow"]{box-shadow:5px 5px 0 ${PK}}
${P} .nb-stamp{box-shadow:7px 7px 0 ${SH}}
${P} .nb-callout span{box-shadow:5px 5px 0 ${E}}
${P} .nb-tab{box-shadow:3px 3px 0 ${SH}}
${P} .nb-tab.on{box-shadow:5px 5px 0 ${SH}}
${P} #avatar-stage:not(.is-full){border-color:${E} !important;box-shadow:12px 12px 0 ${SH} !important}
/* 直接压在黑纸上的元素：标题、标签、连线、箭头 */
${P} .nb-head{color:${E}}
${P} .nb-zone em,${P} .nb-q em{box-shadow:5px 5px 0 ${PK}}
${P} .nb-kicker{background:${SH};color:#111111}
${P} .nb-vs .dm{box-shadow:8px 0 0 ${SH},inset 0 0 0 4px ${E}}
${P} .nb-tl-line{background:${E};box-shadow:0 7px 0 ${PK}}
${P} .nb-tl-stem{background:${E}}
${P} .nb-tl-dot{border-color:${E}}
${P} .nb-dg-svg path.ln{stroke:${E}}
${P} .nb-dg-svg marker path{fill:${E}}
${P} .nb-dg-tag{box-shadow:4px 4px 0 ${PK};outline:3px solid ${E}}
${P} .nb-prop svg path[fill="#111111"]{fill:${E}}
${P} .nb-prop svg polygon[fill="#111111"]{fill:${PK}}
${P} .nb-prop svg polygon[stroke="#111111"]{stroke:${E}}
${P} .nb-callout svg path[stroke="#111111"]{stroke:${E}}
${P} .nb-callout svg path[fill="#111111"]{fill:${E}}
${P} .nb-panel.dark{background:#1A1A1A}
${P} .nb-prod .pic{background-color:#F4F4F0;background-image:radial-gradient(rgba(17,17,17,.17) 1.8px,transparent 1.8px)}
${P} .nb-slab{border-left-color:${E};box-shadow:-14px 0 0 ${E}}
`;
      }
    },
    pop_pink: {
      label: '波普', en: 'POP', dots: ['#FFF0F5', '#FF3385', '#38BDF8', '#FFE500'],
      desc: '波普糖果：淡粉纸 + 芭比粉 + 天空蓝 + 柠檬黄 + 4px 粗黑边',
      vars: { paper: '#FFF0F5', ink: '#111111', yellow: '#FFE500', blue: '#38BDF8', mint: '#C4A1FF', coral: '#FF3385' },
      dot: 'rgba(255,51,133,.26)', grid: 'rgba(17,17,17,.05)',
      sub: { bg: '#111111', border: '#111111', shadow: '#FF3385', text: '#FFFFFF', active: '#FFE500' },
      extra: (P) => `
/* 天空蓝 / 芭比粉色块上统一用墨黑字（白字在天空蓝上对比不足） */
${P} .nb-ticket.inv,${P} .nb-tl-node.inv,${P} .nb-cover-ch,${P} .nb-memo,${P} .nb-cta,${P} .nb-panel .bar{color:#111111}
${P} .nb-row .k,${P} .nb-act .tg{color:#111111 !important}
${P} .nb-memo small{color:#111111}
${P} .nb-cover-ch .n{color:#FFFFFF}
${P} .nb-cta .t{text-shadow:5px 5px 0 #FFFFFF}
${P} .nb-panel .bar span{color:#FFFFFF}
${P} .nb-box,${P} .nb-cover-block,${P} .nb-sticker{border-width:4px}
`
    },
    mono_ink: {
      label: '漫画', en: 'MONO', dots: ['#FFFFFF', '#000000', '#FF2A2A', '#000000'],
      desc: '黑白漫画红点：纯白纸 + 粗黑油墨 + 漫画红 + 高对比黑红硬投影',
      vars: { paper: '#FFFFFF', ink: '#000000', yellow: '#FF2A2A', blue: '#000000', mint: '#FFFFFF', coral: '#FF2A2A' },
      dot: 'rgba(0,0,0,.15)', grid: 'rgba(0,0,0,.05)',
      sub: { bg: '#000000', border: '#000000', shadow: '#FF2A2A', text: '#FFFFFF', active: '#FF2A2A' }, sil: '#FFFFFF',
      extra: (P) => {
        const R = '#FF2A2A';
        return `
/* 黑红交替硬投影：大卡红影，红底卡黑影 */
${P} .nb-box.lg{box-shadow:12px 12px 0 ${R}}
${P} .nb-box.lg[style*="--nb-yellow"],${P} .nb-box.lg[style*="--nb-coral"],${P} .nb-stat.hot,${P} .nb-verdict,${P} .nb-q{box-shadow:12px 12px 0 #000000}
${P} .nb-panel.dark{box-shadow:12px 12px 0 ${R}}
${P} .nb-panel .bar{background:${R};color:#FFFFFF}
${P} .nb-panel.light .bar{background:#000000;color:#FFFFFF}
${P} .nb-panel.light .bar span{background:${R}}
${P} .nb-stat.hot .num{text-shadow:7px 7px 0 #FFFFFF}
${P} .nb-tab.done{background:#000000;color:#FFFFFF}
${P} .nb-tab.done .fl{background:${R}}
${P} #avatar-tag i{background:#FFFFFF}
${P} #avatar-stage:not(.is-full){box-shadow:12px 12px 0 ${R} !important}
`;
      }
    }
  };

  // ============================== CSS 生成 ==============================
  function buildCSS(name) {
    const T = PRESETS[name];
    if (!T || !T.vars) return '';
    const P = `:root[${ATTR}="${name}"]`;
    const V = T.vars, S = T.sub;
    const vars = Object.keys(V).map((k) => `--nb-${k}:${V[k]} !important`).join(';');
    return `
/* ====== NeoBrutalismThemes · ${name} ====== */
${P}{${vars}}
${P} #viewport{background:${V.paper}}
${P} #nb-bg-layer{background-color:${V.paper};background-image:radial-gradient(${T.dot} 1.8px,transparent 1.8px)}
${P} #nb-world{background-image:linear-gradient(90deg,${T.grid} 1px,transparent 1px),linear-gradient(${T.grid} 1px,transparent 1px)}
${P} .nb-prod .pic{background-image:radial-gradient(${T.dot} 1.8px,transparent 1.8px)}
${P} #subtitle-bar{background:${S.bg} !important;border-color:${S.border} !important;box-shadow:7px 7px 0 ${S.shadow} !important;color:${S.text} !important}
${P} #subtitle-bar .w,${P} #subtitle-bar .w.passed{color:${S.text} !important}
${P} #subtitle-bar .w.active{color:${S.active} !important}
${T.sil ? `${P} #avatar-silhouette circle,${P} #avatar-silhouette path{stroke:${T.sil}}
${P} #avatar-silhouette text{fill:${T.sil}}
` : ''}${T.extra ? T.extra(P) : ''}`;
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
    } catch (_) { /* file:// 或沙箱环境下忽略 */ }
  }

  /**
   * 切换皮肤，未知名称回退 zine。
   * @param {string} name  zine | acid | pop_pink | mono_ink
   * @param {object} [opts] { syncUrl?: boolean } 默认 true；zine 且地址栏原本无 ?theme= 时不写参数
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
      try { global.dispatchEvent(new CustomEvent('nb:themechange', { detail: { name: key, preset: PRESETS[key] } })); } catch (_) {}
    }
    return key;
  }

  /** 启动皮肤：URL ?theme= ＞ 剧本 theme.preset ＞ zine */
  function resolve(script) {
    let fromUrl = null;
    try { fromUrl = normalize(new URL(global.location.href).searchParams.get('theme')); } catch (_) {}
    if (fromUrl) return fromUrl;
    const preset = script && script.theme && normalize(script.theme.preset);
    return preset || DEFAULT;
  }

  // ============================== 粗黑边 4 色胶囊条 ==============================
  const SW_CSS = `
#${SWITCHER_ID}{position:fixed;top:12px;right:12px;z-index:1000;display:flex;align-items:center;gap:4px;padding:4px;border-radius:999px;
  background:#FFFFFF;border:3px solid #111111;box-shadow:4px 4px 0 #111111;
  font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace;font-size:11px;font-weight:900;letter-spacing:.08em;color:#111111;user-select:none}
#${SWITCHER_ID}.hidden{display:none}
#${SWITCHER_ID} .lb{padding:0 6px 0 10px;white-space:nowrap}
#${SWITCHER_ID} button{all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;padding:5px 11px 5px 6px;border-radius:999px;border:2px solid transparent;color:#111111;white-space:nowrap}
#${SWITCHER_ID} button:hover{background:#F1F1F1}
#${SWITCHER_ID} button.on{background:#FFE500;border-color:#111111}
#${SWITCHER_ID} button:focus-visible{outline:2px solid #3B82F6;outline-offset:1px}
#${SWITCHER_ID} .dt{width:16px;height:16px;border-radius:50%;border:2px solid #111111;flex:none;box-sizing:border-box}
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
    }
    let el = state.switcher || document.getElementById(SWITCHER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = SWITCHER_ID;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', '换肤');
      el.innerHTML = `<span class="lb">SKIN</span>` + Object.keys(PRESETS).map((k) => {
        const p = PRESETS[k], d = p.dots;
        const bg = `conic-gradient(${d[1]} 0 25%,${d[2]} 0 50%,${d[3]} 0 75%,${d[0]} 0)`;
        return `<button type="button" data-theme="${k}" title="${p.desc}"><span class="dt" style="background:${bg}"></span>${p.label}</button>`;
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

  global.NeoBrutalismThemes = {
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
