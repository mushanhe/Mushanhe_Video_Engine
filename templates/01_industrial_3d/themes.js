/**
 * Mushanhe Video Engine — 风格包 01 · 3D 工业实体画廊 · 零代码换肤系统（templates/01_industrial_3d/themes.js）
 * ---------------------------------------------------------------------------
 *   window.Industrial3DThemes = { PRESETS, apply(name, opts?), mountSwitcher(container?), current(), resolve(script?), init(script?) }
 *
 *   - PRESETS        : 4 套皮肤（pearl 默认 / obsidian / tactical / concrete），每套含 label、色点、CSS 变量与材质参数
 *   - apply(name)    : 切换皮肤（幂等）。写 <html data-ind3d-theme>，注入/更新 <style id="ind3d-theme-override">，
 *                      重绘画廊底景，并把 ?theme=xxx 同步进地址栏（history.replaceState，不刷新）
 *   - mountSwitcher(): 右上角极简工业胶囊换肤器（4 颗色点按钮）；跟随 #hud 显隐（H 键 / ?clean=1），无 #hud 时自己监听 H 键
 *   - resolve(script): 启动皮肤名：URL ?theme= ＞ 剧本 theme.preset ＞ 'pearl'
 *   - init(script)   : apply(resolve(script), { syncUrl:false }) + mountSwitcher()，供宿主页 boot() 一行接入
 *
 * 兼容约定：
 *   - pearl = 不注入任何覆盖规则、不改 CSS 变量、底景照旧走 core/gallery-bg.js 'swiss-pearl'，即与现有页面 100% 一致。
 *   - 其余皮肤的 CSS 变量用 !important 声明在 :root[data-ind3d-theme="x"] 上，能压过宿主 boot() 按剧本 theme 写入的内联变量，
 *     与调用先后顺序无关。
 *   - 底景：运行时包一层 MHEngine.GalleryBackground.prototype.render（不改 core 文件）；pearl 时原样透传。
 *   - 只依赖 DOM，不依赖 components.js / index.html 的加载顺序；可在任意位置 <script src="themes.js"> 引入（建议放在 gallery-bg.js 之后）。
 */
(function (global) {
  'use strict';

  const DEFAULT = 'pearl';
  const STYLE_ID = 'ind3d-theme-override';
  const SWITCHER_ID = 'ind3d-theme-switcher';
  const ATTR = 'data-ind3d-theme';

  // ============================== 颜色工具 ==============================
  function hexRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  /** hex 与 hex2 按 p(0..1) 混合 */
  function mix(hex, hex2, p) {
    const a = hexRgb(hex), b = hexRgb(hex2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * p).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // ============================== 4 套皮肤 ==============================
  /**
   * vars       : 写入 --id-* 的 6 个主题变量（pearl 为 null = 不覆盖）
   * accent     : 主点缀（承担原“爱马仕橙”角色：关键词、数值、吊牌、橙色材质）
   * signal     : 副点缀（承担原“电光青”角色：LED、勾选、尺寸线、正确侧）
   * onSteel    : 深色金属面上的强调字色（章节号、热数值、立方体字、代码关键字等）
   * line       : 原先用 --id-steel 画“线”的地方（分隔线、时间轴竖杆、连线箭头、复选框描边）
   */
  const PRESETS = {
    pearl: {
      label: '珍珠白', en: 'PEARL', dots: ['#F4F5F7', '#FF5A1F'], dark: false,
      desc: '默认·珍珠白光学画廊 + 深灰拉丝金属 + 爱马仕橙 + 电光青',
      vars: null
    },
    obsidian: {
      label: '黑曜石', en: 'OBSIDIAN', dots: ['#0E1117', '#FF5A1F'], dark: true,
      desc: '黑曜石暗夜展厅：哑光深炭黑底景 + 深钛银金属 + 半透暗玻璃 + 熔岩橙 + 激光青',
      vars: { pearl: '#0E1117', steel: '#1C222B', orange: '#FF5A1F', teal: '#00F0C8', ink: '#F8FAFC', grey: '#9AA6B6' },
      onAccent: '#FFFFFF', onAccentDark: '#0E1117', onSignal: '#04221D', signalText: '#00F0C8', onSteel: '#FF6A33',
      wrongText: '#FF8A5C', hl: rgba('#FF5A1F', 0.72), hazard: ['#FF5A1F', '#0B0E13'], line: '#7F8C9E',
      steel: { hi: '#2C3542', lo: '#10141A', edge: '#06080B', text: '#E8EDF3', border: 'rgba(255,255,255,.09)', front: ['#28303B', '#191E26'] },
      glass: {
        bg: 'linear-gradient(150deg,rgba(30,37,49,.92) 0%,rgba(22,27,36,.88) 55%,rgba(18,22,30,.86) 100%)',
        border: 'rgba(255,255,255,.10)', edge: '#090B10', hair: 'rgba(255,255,255,.10)', inner: 'rgba(255,255,255,.07)'
      },
      shadow: 'rgba(0,0,0,.62)', floor: 'rgba(0,0,0,.55)',
      panelDark: '#0B0E13', quote: ['#222A35', '#0F1318'],
      prodPic: 'radial-gradient(ellipse at 50% 18%,#3A4452 0%,#202733 42%,#0F1318 100%)', prodBeam: 0.22,
      cubeTop: 'linear-gradient(135deg,#4A5566,#262E3A)',
      btn: ['#2A323E', '#F8FAFC', '#0B0E13'],
      titleShadow: '0 2px 0 rgba(0,0,0,.6),0 16px 34px rgba(0,0,0,.65)',
      tabs: { bg: 'rgba(20,25,33,.86)', border: 'rgba(255,255,255,.10)', text: 'rgba(226,232,240,.45)', done: 'rgba(226,232,240,.82)', on: '#2E3846', onText: '#FFFFFF', track: 'rgba(255,255,255,.10)' },
      partition: 'linear-gradient(90deg,rgba(24,30,40,.78),rgba(16,20,27,.92) 60%,rgba(24,30,40,.8))',
      world: 'rgba(148,163,184,.07)', base: 'rgba(255,255,255,.10)',
      avatar: { bg: '#161B24', sil: '#3A4452', label: '#C9D2DE', ring: 'rgba(255,255,255,.12)' },
      sub: { bg: '#1A212C', border: 'rgba(255,255,255,.18)', ring: '0 0 0 4px rgba(0,240,200,.14)', shadow: 'rgba(0,0,0,.7)', text: '#FFFFFF', active: '#FF6A33' },
      bg: { stops: ['#151B25', '#0E1117', '#090B10'], glowA: 'rgba(0,240,200,.07)', glowB: 'rgba(255,90,31,.06)', grid: 'rgba(148,163,184,.045)', gridMajor: 'rgba(148,163,184,.075)', ring: 'rgba(148,163,184,.08)', mark: 'rgba(226,232,240,.026)', fid: 'rgba(203,213,225,.22)', fidAccent: 'rgba(0,240,200,.38)', word: 'OBSIDIAN', wordSub: 'NIGHT HALL // DARK ROOM', pattern: 'grid' }
    },
    tactical: {
      label: '战术沙', en: 'TACTICAL', dots: ['#E7E2D3', '#F5B700'], dark: false,
      desc: '战术军工沙色：暖沙漠卡其底景 + 橄榄炭灰金属 + 信号黄 + 战术红 + 墨黑文字',
      vars: { pearl: '#E7E2D3', steel: '#262A24', orange: '#D93829', teal: '#F5B700', ink: '#1A1D19', grey: '#5E5F4E' },
      onAccent: '#FFFFFF', onAccentDark: '#FFFFFF', onSignal: '#1A1D19', signalText: '#7A5600', onSteel: '#F5B700',
      wrongText: '#FF7A68', hl: rgba('#F5B700', 0.9), hazard: ['#F5B700', '#1A1D19'], line: '#262A24',
      steel: { hi: '#3C4237', lo: '#161914', edge: '#0D0F0B', text: '#ECEAE0', border: 'rgba(255,255,255,.05)', front: ['#454B3F', '#30352D'] },
      glass: {
        bg: 'linear-gradient(150deg,rgba(253,251,245,.95) 0%,rgba(245,241,230,.86) 55%,rgba(233,227,211,.80) 100%)',
        border: 'rgba(255,253,246,.96)', edge: '#CBC3AC', hair: 'rgba(26,29,25,.13)', inner: 'rgba(26,29,25,.06)'
      },
      shadow: 'rgba(34,30,18,.38)', floor: 'rgba(40,34,18,.30)',
      panelDark: '#1B1E18', quote: ['#30352D', '#151813'],
      prodPic: 'radial-gradient(ellipse at 50% 18%,#FFFDF6 0%,#EFEADC 42%,#D3CBB4 100%)', prodBeam: 0.55,
      cubeTop: 'linear-gradient(135deg,#FBF8EF,#D9D1BC)',
      btn: ['#EFEADC', '#1A1D19', '#A39A80'],
      titleShadow: '0 2px 0 #FBF8EF,0 14px 24px rgba(40,34,18,.16)',
      tabs: { bg: 'rgba(251,248,239,.82)', border: 'rgba(255,253,246,.95)', text: 'rgba(26,29,25,.45)', done: 'rgba(26,29,25,.78)', on: '#262A24', onText: '#F5B700', track: 'rgba(26,29,25,.12)' },
      partition: 'linear-gradient(90deg,rgba(253,251,245,.66),rgba(236,231,216,.9) 60%,rgba(253,251,245,.72))',
      world: 'rgba(58,52,30,.055)', base: 'rgba(38,42,36,.24)',
      avatar: { bg: '#DCD5C2', sil: '#262A24', label: '#E7E2D3', ring: 'rgba(255,253,246,.7)' },
      sub: { bg: '#1A1D19', border: 'rgba(245,183,0,.28)', ring: '0 0 0 4px rgba(231,226,211,.65)', shadow: 'rgba(30,26,14,.55)', text: '#FFFFFF', active: '#F5B700' },
      bg: { stops: ['#EFEBDF', '#E7E2D3', '#DAD3BF'], glowA: 'rgba(245,183,0,.10)', glowB: 'rgba(217,56,41,.05)', grid: 'rgba(58,52,30,.035)', gridMajor: 'rgba(58,52,30,.07)', ring: 'rgba(58,52,30,.085)', mark: 'rgba(58,52,30,.03)', fid: 'rgba(38,42,36,.26)', fidAccent: 'rgba(122,86,0,.5)', word: 'TACTICAL', wordSub: 'FIELD KIT // DESERT OPS', pattern: 'contour' }
    },
    concrete: {
      label: '混凝土', en: 'CONCRETE', dots: ['#E2E6EC', '#1D4ED8'], dark: false,
      desc: '清水混凝土建筑蓝：冷建筑水泥灰底 + 深岩灰金属 + 克莱因蓝 + 亮银青',
      vars: { pearl: '#E2E6EC', steel: '#1E2530', orange: '#1D4ED8', teal: '#0EA5E9', ink: '#0F1724', grey: '#526070' },
      onAccent: '#FFFFFF', onAccentDark: '#FFFFFF', onSignal: '#FFFFFF', signalText: '#0369A1', onSteel: '#38BDF8',
      wrongText: '#FCA5A5', hl: rgba('#0EA5E9', 0.5), hazard: ['#1D4ED8', '#E2E6EC'], line: '#1E2530',
      steel: { hi: '#364256', lo: '#111720', edge: '#090D13', text: '#E8EDF4', border: 'rgba(255,255,255,.05)', front: ['#3A4558', '#262F3D'] },
      glass: {
        bg: 'linear-gradient(150deg,rgba(251,252,254,.95) 0%,rgba(240,243,248,.86) 55%,rgba(225,230,238,.80) 100%)',
        border: 'rgba(255,255,255,.96)', edge: '#C6CDD8', hair: 'rgba(15,23,36,.12)', inner: 'rgba(15,23,36,.05)'
      },
      shadow: 'rgba(15,23,36,.36)', floor: 'rgba(15,23,36,.30)',
      panelDark: '#121821', quote: ['#2A3444', '#121821'],
      prodPic: 'radial-gradient(ellipse at 50% 18%,#FFFFFF 0%,#EBEFF4 42%,#CDD4DE 100%)', prodBeam: 0.55,
      cubeTop: 'linear-gradient(135deg,#FFFFFF,#D3DAE4)',
      btn: ['#E8EDF4', '#0F1724', '#8C98A8'],
      titleShadow: '0 2px 0 #fff,0 14px 24px rgba(15,23,36,.14)',
      tabs: { bg: 'rgba(250,251,253,.80)', border: 'rgba(255,255,255,.95)', text: 'rgba(15,23,36,.42)', done: 'rgba(15,23,36,.76)', on: '#1E2530', onText: '#FFFFFF', track: 'rgba(15,23,36,.10)' },
      partition: 'linear-gradient(90deg,rgba(255,255,255,.64),rgba(230,235,242,.9) 60%,rgba(255,255,255,.7))',
      world: 'rgba(15,23,36,.05)', base: 'rgba(30,37,48,.22)',
      avatar: { bg: '#D6DCE4', sil: '#1E2530', label: '#E2E6EC', ring: 'rgba(255,255,255,.7)' },
      sub: { bg: '#0F1724', border: 'rgba(14,165,233,.30)', ring: '0 0 0 4px rgba(226,230,236,.65)', shadow: 'rgba(15,23,36,.55)', text: '#FFFFFF', active: '#38BDF8' },
      bg: { stops: ['#EBEEF2', '#E2E6EC', '#D3D9E1'], glowA: 'rgba(14,165,233,.07)', glowB: 'rgba(29,78,216,.06)', grid: 'rgba(15,23,36,.03)', gridMajor: 'rgba(15,23,36,.075)', ring: 'rgba(15,23,36,.06)', mark: 'rgba(15,23,36,.026)', fid: 'rgba(15,23,36,.24)', fidAccent: 'rgba(29,78,216,.45)', word: 'CONCRETE', wordSub: 'BÉTON BRUT // ARCHITECTURE', pattern: 'formwork' }
    }
  };

  // ============================== 覆盖样式生成 ==============================
  function buildCSS(name) {
    const T = PRESETS[name];
    if (!T || !T.vars) return '';
    const P = `:root[${ATTR}="${name}"]`;
    const V = T.vars, S = T.steel, G = T.glass;
    const A = V.orange, B = V.teal;
    const aHi = mix(A, '#FFFFFF', 0.2), aLo = mix(A, '#000000', 0.14), aEdge = mix(A, '#000000', 0.45);
    const bHi = mix(B, '#FFFFFF', 0.18), bLo = mix(B, '#000000', 0.14), bEdge = mix(B, '#000000', 0.45);
    const STEEL = `repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 1px,transparent 1px 3px),linear-gradient(165deg,${S.hi} 0%,var(--id-steel) 40%,${S.lo} 100%)`;
    const steelBox = `inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.5),0 0 0 1px ${S.border},0 10px 0 -1px ${S.edge},0 40px 58px -18px ${T.shadow}`;
    const accentGrad = `linear-gradient(165deg,${aHi} 0%,var(--id-orange) 48%,${aLo} 100%)`;
    return `
/* ====== Industrial3DThemes · ${name} ====== */
${P}{--id-pearl:${V.pearl} !important;--id-steel:${V.steel} !important;--id-orange:${A} !important;--id-teal:${B} !important;--id-ink:${V.ink} !important;--id-grey:${V.grey} !important;color-scheme:${T.dark ? 'dark' : 'light'}}
${P} #viewport{background:${V.pearl}}
${P} #ind-world{background-image:linear-gradient(90deg,${T.world} 1px,transparent 1px),linear-gradient(${T.world} 1px,transparent 1px)}
${P} .ind-bay .base{background:${T.base}}
/* 玻璃隔断 */
${P} #ind-partition{background:${T.partition};box-shadow:inset -2px 0 0 var(--id-teal),-30px 0 60px ${T.shadow},30px 0 60px ${T.shadow}}
/* 顶部胶囊标签 */
${P} #ind-tabs{background:${T.tabs.bg};border-color:${T.tabs.border};box-shadow:0 0 0 1px ${G.inner},0 12px 24px -12px ${T.shadow}}
${P} .ind-tab{color:${T.tabs.text}}
${P} .ind-tab.done{color:${T.tabs.done}}
${P} .ind-tab.on{background:${T.tabs.on};color:${T.tabs.onText}}
${P} .ind-tab .tr{background:${T.tabs.track}}
/* 人像框 */
${P} #avatar-stage{background:${T.avatar.bg} !important;box-shadow:0 0 0 1px ${T.avatar.ring},0 10px 0 -2px ${S.edge},0 40px 70px -20px ${T.shadow} !important}
${P} #avatar-stage.is-full{box-shadow:none !important}
${P} #avatar-silhouette [fill="#2B2F36"]{fill:${T.avatar.sil}}
${P} #avatar-silhouette [fill="#F4F5F7"]{fill:${T.avatar.label}}
${P} #avatar-silhouette [fill="#FF5A1F"]{fill:var(--id-orange)}
/* 字幕胶囊：高对比 */
${P} #subtitle-bar{background:${T.sub.bg} !important;border:1px solid ${T.sub.border} !important;box-shadow:${T.sub.ring},0 18px 36px -10px ${T.sub.shadow} !important;color:${T.sub.text} !important}
${P} #subtitle-bar::before{background:var(--id-teal);box-shadow:0 0 12px var(--id-teal)}
${P} #subtitle-bar .w,${P} #subtitle-bar .w.passed{color:${T.sub.text} !important}
${P} #subtitle-bar .w.active{color:${T.sub.active} !important}
/* 材质 A：拉丝金属 */
${P} .id-steel,${P} .id-verdict{color:${S.text};background:${STEEL};box-shadow:${steelBox}}
${P} .id-face.steel,${P} .id-ledbox,${P} .id-bed-tab,${P} .id-bed-back,${P} .id-vs,${P} .id-panel .bar,${P} .id-tablet .hdr{background:${STEEL}}
${P} .id-face.steel{color:${S.text}}
${P} .id-ledbox{box-shadow:0 0 0 1px ${S.border},0 8px 0 -1px ${S.edge},0 20px 30px -12px ${T.shadow}}
${P} .id-bed-back{box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px ${S.border},0 40px 60px -20px ${T.shadow}}
${P} .id-bed-front{background:repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 3px),linear-gradient(180deg,${S.front[0]} 0%,${S.front[1]} 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 -8px 16px rgba(0,0,0,.3),0 10px 0 -1px ${S.edge}}
${P} .id-bed-front .hz{background:repeating-linear-gradient(-45deg,${T.hazard[0]} 0 16px,${T.hazard[1]} 16px 32px)}
${P} .id-bed-front .vent{background:repeating-linear-gradient(90deg,${S.lo} 0 8px,transparent 8px 18px)}
${P} .id-vs{box-shadow:inset 0 0 0 6px ${rgba(A, 0.9)},0 10px 0 -1px ${S.edge},0 30px 40px -14px ${T.shadow}}
${P} .id-verdict b{color:var(--id-teal)}
/* 材质 B：磨砂玻璃 */
${P} .id-glass{background:${G.bg};border-color:${G.border};box-shadow:inset 0 1px 0 ${G.border},inset 0 0 0 1px ${G.inner},0 8px 0 -1px ${G.edge},0 9px 0 -1px ${G.inner},0 34px 52px -20px ${T.shadow}}
/* 点缀材质：主点缀板 / 吊牌 / 立方体 */
${P} .id-orangep,${P} .id-dg-node.hot{color:${T.onAccent};background:${accentGrad};box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 0 -1px ${aEdge},0 36px 54px -18px ${rgba(aEdge, 0.5)}}
${P} .id-dg-node.hot{box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 8px 0 -1px ${aEdge},0 0 40px ${rgba(A, 0.45)}}
${P} .id-tag{color:${T.onAccent};background:linear-gradient(170deg,${aHi},var(--id-orange) 55%,${aLo});box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 5px 0 -1px ${aEdge},0 18px 28px -10px ${T.shadow}}
${P} .id-tag.teal{color:${T.onSignal};background:linear-gradient(170deg,${bHi},var(--id-teal) 55%,${bLo});box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 5px 0 -1px ${bEdge},0 18px 28px -10px ${T.shadow}}
${P} .id-face.orange{background:${accentGrad};color:${T.onAccent}}
${P} .id-face.pearl{background:${T.cubeTop}}
${P} .id-face.steel b,${P} .id-chap .n,${P} .id-stat.hot .num,${P} .id-quote-t em,${P} .id-verdict em,${P} .id-panel.dark .id-code .k{color:${T.onSteel}}
${P} .id-bed-front .big{-webkit-text-stroke-color:${T.onSteel}}
${P} .id-chap .stripe,${P} .id-tablet .sub i{background:var(--id-orange)}
${P} .id-st-card .no{color:${T.onAccent}}
/* 尺寸线 / LED / 勾选 */
${P} .id-dim .dt{color:${T.signalText};background:var(--id-pearl)}
${P} .id-ledbox i:nth-child(1){background:var(--id-teal) !important;box-shadow:0 0 12px var(--id-teal) !important}
${P} .id-ledbox i:nth-child(2){background:var(--id-orange) !important;box-shadow:0 0 12px var(--id-orange) !important}
${P} .id-ledbox i:nth-child(3){background:${S.hi}}
${P} .id-tablet .rail{background:${rgba(B, 0.45)}}
${P} .id-tablet .hdr .lz i{background:${S.hi}}
${P} .id-tablet .hdr .lz i:first-child{background:var(--id-teal)}
${P} .id-rl{border-bottom-color:${G.hair}}
${P} .id-rl .box{border-color:${T.line};background:${T.dark ? '#0E1117' : '#FFFFFF'}}
${P} .id-rl .box.on{background:var(--id-teal);border-color:var(--id-teal);box-shadow:0 0 18px ${rgba(B, 0.55)}}
${P} .id-rl .box.on path{stroke:${T.onSignal}}
${P} .id-note .hl{background:${T.hl}}
/* 原先用 steel 画线的位置 */
${P} .id-tablet .hr,${P} .id-tl-stem,${P} .id-dg-node::before{background:${T.line}}
${P} .id-dg-node.hot::before{background:${T.dark ? '#0E1117' : V.ink}}
${P} .id-prod .specs{border-top-color:${T.line}}
${P} .id-prod .row{border-bottom-color:${G.hair}}
${P} .id-stat .bar{background:repeating-linear-gradient(90deg,${G.hair} 0 16px,transparent 16px 21px)}
${P} .id-stat .bar i{background:repeating-linear-gradient(90deg,${T.line} 0 16px,transparent 16px 21px)}
${P} .id-stat.hot .bar i{background:repeating-linear-gradient(90deg,${T.onSteel} 0 16px,transparent 16px 21px);filter:drop-shadow(0 0 6px ${rgba(T.onSteel, 0.6)})}
${P} .id-stat.hot .num .u{color:${S.text}}
${P} .id-dg-svg path.ln{stroke:${T.line}}
${P} .id-dg-svg marker path{fill:${T.line}}
${P} .id-dg-svg path:not(.ln){stroke:${G.hair}}
${P} .id-dg-svg circle.pl{fill:var(--id-teal)}
${P} .id-tl-dot.now{background:var(--id-teal);box-shadow:0 0 0 5px ${rgba(B, 0.25)},0 0 22px var(--id-teal)}
${P} .id-tl-node.now .tm{color:${T.onAccent}}
${P} .id-dg-tag{box-shadow:0 0 0 2px var(--id-teal)}
/* 对比卡 */
${P} .id-cmp.wrong .band{color:${T.wrongText}}
${P} .id-cmp.right .band{background:var(--id-teal);color:${T.onSignal}}
${P} .id-cmp svg [stroke="#FF5A1F"]{stroke:var(--id-orange)}
/* 展台 / 面板 */
${P} .id-panel.dark{background:${T.panelDark};box-shadow:0 0 0 1px ${S.border},0 10px 0 -1px ${S.edge},0 40px 58px -18px ${T.shadow}}
${P} .id-prod .pic{background:${T.prodPic}}
${P} .id-prod .pic .beam{opacity:${T.prodBeam}}
${P} .id-prod .pic .disc{box-shadow:0 0 0 3px var(--id-orange),0 26px 30px -8px ${T.shadow}}
${P} .id-note-pin b{color:${T.onAccent}}
${P} .id-note-pin span{background:${T.panelDark};box-shadow:0 0 0 1px ${S.border},0 10px 20px -6px ${T.shadow}}
${P} .id-quote{background:linear-gradient(160deg,${T.quote[0]},${T.quote[1]});box-shadow:inset 10px 0 0 var(--id-orange),0 0 0 1px ${S.border},0 10px 0 -1px ${S.edge},0 40px 70px -10px ${T.shadow}}
${P} .id-quote .k{color:var(--id-teal)}
${P} .id-cta .k{color:var(--id-teal)}
${P} .id-cta .repo{border-color:${rgba(B, 0.55)}}
${P} .id-cta .btns span{background:${T.btn[0]};color:${T.btn[1]};box-shadow:0 5px 0 -1px ${T.btn[2]}}
${P} .id-cta .btns span:first-child{background:var(--id-orange);color:${T.onAccent};box-shadow:0 5px 0 -1px ${aEdge}}
/* 封面 / 阴影 */
${P} .id-cover-title span{text-shadow:${T.titleShadow}}
${P} .id-fshadow{background:radial-gradient(ellipse at center,${T.floor} 0%,${T.floor.replace(/[\d.]+\)$/, '0.12)')} 45%,rgba(0,0,0,0) 72%)}
${P} .id-prop{filter:drop-shadow(0 8px 8px ${T.shadow})}
/* SVG / 内联道具里的硬编码点缀色 */
${P} .id-zone [fill="#FF5A1F"]{fill:var(--id-orange)}
${P} .id-zone [stroke="#FF5A1F"]{stroke:var(--id-orange)}
${P} .id-zone [fill="#00C2A8"]{fill:var(--id-teal)}
${P} .id-zone [stroke="#00C2A8"]{stroke:var(--id-teal)}
${P} .id-zone [style*="#FF5A1F 0 14px"]{background:repeating-linear-gradient(-45deg,${T.hazard[0]} 0 14px,${T.hazard[1]} 14px 28px) !important}
${T.dark ? `${P} #avatar-studio-bg{filter:brightness(.42) saturate(.85) contrast(1.05)}
${P} .id-reg svg g{stroke:#CBD5E1}
${P} .id-glass .id-code .c{color:#8A96A8}
${P} .id-glass .id-code .ln{color:#6B7788}
${P} .v3-gg:not(.hot) svg.dial radialGradient stop:nth-child(1){stop-color:${S.hi}}
${P} .v3-gg:not(.hot) svg.dial radialGradient stop:nth-child(2){stop-color:${V.steel}}
${P} .v3-gg:not(.hot) svg.dial radialGradient stop:nth-child(3){stop-color:${S.lo}}
${P} .v3-gg:not(.hot) svg.dial [stroke="var(--id-steel)"]{stroke:${T.line}}
${P} .v3-gg:not(.hot) svg.dial [stroke="rgba(20,26,34,.09)"]{stroke:rgba(255,255,255,.1)}
${P} .v3-sp.right .lb,${P} .id-zone text[fill="#00796A"]{color:var(--id-teal);fill:var(--id-teal)}
${P} .v3-sp .sheen{opacity:.22}` : ''}
`;
  }

  // ============================== 画廊底景（运行时包装 core/gallery-bg.js） ==============================
  const bgInstances = [];
  function drawThemeBg(inst, T, t) {
    const g = inst.ctx, W = inst.W || 1920, H = inst.H || 1080, B = T.bg;
    const lg = g.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, B.stops[0]); lg.addColorStop(0.55, B.stops[1]); lg.addColorStop(1, B.stops[2]);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);

    const r1 = g.createRadialGradient(540 + Math.sin(t * 0.4) * 40, 480, 40, 540, 480, 640);
    r1.addColorStop(0, B.glowA); r1.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r1; g.fillRect(0, 0, W, H);
    const r2 = g.createRadialGradient(1480, 240 + Math.cos(t * 0.35) * 30, 30, 1480, 240, 540);
    r2.addColorStop(0, B.glowB); r2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r2; g.fillRect(0, 0, W, H);

    g.save();
    if (B.pattern === 'grid') {
      // 细冷灰网格：40px 细格 + 200px 主格
      g.lineWidth = 1;
      g.strokeStyle = B.grid; g.beginPath();
      for (let x = 0; x <= W; x += 40) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
      for (let y = 0; y <= H; y += 40) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
      g.stroke();
      g.strokeStyle = B.gridMajor; g.beginPath();
      for (let x = 0; x <= W; x += 200) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
      for (let y = 0; y <= H; y += 200) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
      g.stroke();
      // 地面反光（暗夜展厅顶灯落地）
      const fl = g.createLinearGradient(0, H * 0.62, 0, H);
      fl.addColorStop(0, 'rgba(0,0,0,0)'); fl.addColorStop(1, 'rgba(148,163,184,.05)');
      g.fillStyle = fl; g.fillRect(0, H * 0.62, W, H * 0.38);
    } else if (B.pattern === 'contour') {
      // 战术地形等高线 + 坐标格
      g.lineWidth = 1; g.strokeStyle = B.grid; g.beginPath();
      for (let x = 0; x <= W; x += 160) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
      for (let y = 0; y <= H; y += 160) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
      g.stroke();
      g.strokeStyle = B.gridMajor; g.lineWidth = 1.2;
      for (let k = 0; k < 7; k++) {
        g.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
          const rr = 120 + k * 70 + Math.sin(a * 3 + k * 0.7 + t * 0.15) * 18 + Math.cos(a * 5 - k) * 10;
          const x = 1420 + Math.cos(a) * rr * 1.25, y = 560 + Math.sin(a) * rr * 0.8;
          if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
    } else if (B.pattern === 'formwork') {
      // 清水混凝土：模板分缝 + 对拉螺栓孔
      const pw = 480, ph = 240;
      g.lineWidth = 1.2; g.strokeStyle = B.gridMajor; g.beginPath();
      for (let x = 0; x <= W; x += pw) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
      for (let y = 0; y <= H; y += ph) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
      g.stroke();
      for (let x = 0; x < W; x += pw) {
        for (let y = 0; y < H; y += ph) {
          [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].forEach(([fx, fy]) => {
            const cx = x + pw * fx, cy = y + ph * fy;
            const hole = g.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 7);
            hole.addColorStop(0, 'rgba(15,23,36,.16)'); hole.addColorStop(1, 'rgba(15,23,36,0)');
            g.fillStyle = hole; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
          });
        }
      }
      // 斜向天光
      g.globalAlpha = 0.5;
      const sk = g.createLinearGradient(900, 0, 1300, H);
      sk.addColorStop(0, 'rgba(255,255,255,.35)'); sk.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sk;
      g.beginPath(); g.moveTo(980 + Math.sin(t * 0.2) * 20, 0); g.lineTo(1180, 0); g.lineTo(1500, H); g.lineTo(1160, H); g.closePath(); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();

    // 精密同心轨道
    g.save();
    g.translate(610, 580); g.rotate(t * 0.04);
    g.strokeStyle = B.ring; g.lineWidth = 1.2;
    [270, 380, 490].forEach((r, i) => { g.beginPath(); g.setLineDash(i === 1 ? [8, 12] : []); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); });
    g.setLineDash([]);
    g.restore();

    if (typeof inst.drawWatermark === 'function') inst.drawWatermark(g, B.word, B.wordSub, 68, 900, B.mark);
    if (typeof inst.drawSwissFiducials === 'function') inst.drawSwissFiducials(g, B.fid, B.fidAccent);
  }

  function patchGallery() {
    const E = global.MHEngine;
    const G = E && E.GalleryBackground;
    if (!G || G.prototype.__ind3dThemed) return;
    const orig = G.prototype.render;
    G.prototype.render = function (t, mood) {
      if (bgInstances.indexOf(this) < 0) bgInstances.push(this);
      this.__ind3dLast = [t, mood];
      const T = PRESETS[state.name];
      if (!T || !T.vars) return orig.call(this, t, mood);
      this.ctx.clearRect(0, 0, this.W || 1920, this.H || 1080);
      drawThemeBg(this, T, t || 0);
    };
    G.prototype.__ind3dThemed = true;
    G.prototype.__ind3dOrigRender = orig;
  }
  function redrawBackgrounds() {
    bgInstances.forEach((inst) => { const L = inst.__ind3dLast; if (L) { try { inst.render(L[0], L[1]); } catch (_) {} } });
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
    // 始终保持在 <head> 最后，保证覆盖层晚于 components.js 注入的样式
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
   * 切换皮肤。未知名称回退到 pearl。
   * @param {string} name   pearl | obsidian | tactical | concrete
   * @param {object} [opts] { syncUrl?: boolean }  默认 true；pearl 且地址栏原本没有 ?theme= 时不写参数（保持无参访问 100% 不变）
   * @returns {string} 实际生效的皮肤名
   */
  function apply(name, opts) {
    const o = opts || {};
    const key = normalize(name) || DEFAULT;
    patchGallery();
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
      redrawBackgrounds();
      renderSwitcherState();
      try { global.dispatchEvent(new CustomEvent('ind3d:themechange', { detail: { name: key, preset: PRESETS[key] } })); } catch (_) {}
    }
    return key;
  }

  /** 启动皮肤：URL ?theme= ＞ 剧本 theme.preset ＞ pearl */
  function resolve(script) {
    let fromUrl = null;
    try { fromUrl = normalize(new URL(global.location.href).searchParams.get('theme')); } catch (_) {}
    if (fromUrl) return fromUrl;
    const preset = script && script.theme && normalize(script.theme.preset);
    return preset || DEFAULT;
  }

  // ============================== 胶囊换肤器 ==============================
  const SW_CSS = `
#${SWITCHER_ID}{position:fixed;top:12px;right:12px;z-index:1000;display:flex;align-items:center;gap:4px;padding:5px;border-radius:999px;
  background:rgba(14,21,28,.92);border:1px solid rgba(255,241,210,.22);box-shadow:0 12px 30px rgba(0,0,0,.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace;font-size:11px;font-weight:800;letter-spacing:.06em;user-select:none}
#${SWITCHER_ID}.hidden{display:none}
#${SWITCHER_ID} .lb{color:#98A6B3;padding:0 8px 0 10px;white-space:nowrap}
#${SWITCHER_ID} button{all:unset;cursor:pointer;display:flex;align-items:center;gap:7px;padding:6px 12px 6px 8px;border-radius:999px;color:#C9D2DC;white-space:nowrap;transition:background .15s}
#${SWITCHER_ID} button:hover{background:rgba(255,255,255,.08)}
#${SWITCHER_ID} button.on{background:rgba(255,255,255,.14);color:#FFFFFF;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
#${SWITCHER_ID} button:focus-visible{outline:2px solid #00C2A8;outline-offset:1px}
#${SWITCHER_ID} .dt{position:relative;width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),0 1px 2px rgba(0,0,0,.5);overflow:hidden;flex:none}
#${SWITCHER_ID} .dt i{position:absolute;right:0;bottom:0;width:8px;height:8px;border-radius:50% 0 0 0}
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
          if (document.getElementById('hud')) return; // 有 #hud 时只跟随它，避免重复切换
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
          if (e.key === 'h' || e.key === 'H') state.switcher && state.switcher.classList.toggle('hidden');
        });
      }
    }
  }

  /**
   * 渲染胶囊换肤器（幂等：重复调用只会复用同一个节点）。
   * @param {HTMLElement} [container] 默认 document.body；固定定位在窗口右上角
   * @returns {HTMLElement}
   */
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
        return `<button type="button" data-theme="${k}" title="${p.desc}"><span class="dt" style="background:${p.dots[0]}"><i style="background:${p.dots[1]}"></i></span>${p.label}</button>`;
      }).join('');
      el.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('button[data-theme]');
        if (!b) return;
        apply(b.getAttribute('data-theme'), { syncUrl: true });
        b.blur();
      });
      // 阻止空格/数字键在按钮上触发宿主快捷键时的默认点击
      el.addEventListener('keydown', (e) => { if (e.code === 'Space') e.preventDefault(); });
    }
    if (el.parentNode !== host) host.appendChild(el);
    state.switcher = el;
    if (!state.name) apply(resolve(), { syncUrl: false });
    renderSwitcherState();
    followHud();
    return el;
  }

  /** 宿主页一行接入：按 URL / 剧本 theme.preset 应用皮肤并挂载换肤器 */
  function init(script, opts) {
    const name = apply(resolve(script), { syncUrl: false });
    if (!(opts && opts.switcher === false)) mountSwitcher(opts && opts.container);
    return name;
  }

  global.Industrial3DThemes = {
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
