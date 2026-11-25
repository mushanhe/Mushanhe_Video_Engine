/**
 * Mushanhe Video Engine — 风格包 04 · ComfyUI 3D 节点流水线 · 实时换肤系统（templates/04_nodegraph/themes.js）
 * ---------------------------------------------------------------------------
 *   window.NodeGraphThemes = { PRESETS, init(script?, opts?), apply(name, opts?), mountSwitcher(container?), resolve(script?), current(), list() }
 *
 *   - PRESETS        : 4 套皮肤（cyber 默认 / matrix / amber_lab / daylight），每套含 label、色点、8 个 --ng-* 变量与全组件中性色令牌
 *   - apply(name)    : 切换皮肤（幂等、无刷新）。写 <html data-ng-theme>，注入/更新 <style id="ng-theme-override">，
 *                      并把 ?theme=xxx 同步进地址栏（history.replaceState）
 *   - mountSwitcher(): 右上角极简“节点”胶囊换肤器（4 颗 LED 色点按钮）；跟随 #hud 显隐（H 键 / ?clean=1）
 *   - resolve(script): 启动皮肤名：URL ?theme= ＞ 剧本 theme.preset ＞ 'cyber'
 *   - init(script)   : apply(resolve(script), { syncUrl:false }) + mountSwitcher()，供宿主页 boot() 一行接入
 *
 * 兼容约定：
 *   - cyber = 不注入任何覆盖规则、不改 CSS 变量，即与原页面逐像素一致。
 *   - 其余皮肤的 --ng-* 变量用 !important 声明在 :root[data-ng-theme="x"] 上，能压过 boot() 按剧本 theme 写入的内联变量；
 *     components.js / index.html 里写死的中性色（节点底、面板底、灰阶文字、SVG 描边、字幕条、人像框…）
 *     全部用带 :root[data-ng-theme] 前缀的更高优先级选择器逐一覆盖，不改动 components.js。
 *   - daylight 为浅底皮肤：额外关闭霓虹外发光、把所有“白字”翻转为深墨字，保证浅底高对比。
 */
(function (global) {
  'use strict';

  const DEFAULT = 'cyber';
  const STYLE_ID = 'ng-theme-override';
  const SWITCHER_ID = 'ng-theme-switcher';
  const ATTR = 'data-ng-theme';

  /**
   * vars   : 写入 --ng-* 的 8 个主题变量（cyber 为 null = 不覆盖）
   * t      : 中性色令牌（替换 components.js / index.html 中写死的颜色）
   *   strong  标题/主文字（原 #FFFFFF / #F8FAFC）   soft  次级亮字（原 #E2E8F0）   soft2 正文（原 #CBD5E1）
   *   mute    辅助字（原 #94A3B8）   dim  弱字（原 #64748B）   faint 刻度字（原 #475569）
   *   off     未激活描边/灯（原 #334155）   off2 未激活底（原 #1E293B）
   *   well    节点内凹槽底（原 #0A0E16）   deep 示波器/进度槽底（原 #06080D）   term 文档终端底   pic 产品图底
   *   onAcc   实色强调块上的字色（原 #06080D）   line/line2 细描边   shadow 投影   cable 未点亮电缆
   */
  const PRESETS = {
    cyber: {
      label: '深空赛博', en: 'CYBER', dots: ['#0A0D14', '#38BDF8', '#A78BFA'], light: false,
      desc: '默认·深空赛博：#0A0D14 蓝图底 + 青 / 紫 / 翠绿 / 琥珀 霓虹电缆',
      vars: null
    },
    matrix: {
      label: '黑客矩阵', en: 'MATRIX', dots: ['#060B08', '#00FF88', '#00D4FF'], light: false,
      desc: '黑客矩阵绿：极深黑底 #060B08 + 矩阵绿 #00FF88 + 电子青 #00D4FF + 琥珀提示',
      vars: { bg: '#060B08', node: '#0C1510', text: '#E6FFF0', cyan: '#00D4FF', violet: '#B8FF4D', jade: '#00FF88', amber: '#FFC24D', coral: '#FF5470' },
      t: {
        strong: '#F0FFF6', soft: '#D3F5E2', soft2: '#B5DCC6', mute: '#82B49A', dim: '#5F8A72', faint: '#557A66',
        off: '#1F3A2B', off2: '#13261B', well: '#08120C', deep: '#030805', term: '#07110B', pic: '#040A06',
        onAcc: '#03140A', line: 'rgba(190,255,215,.10)', line2: 'rgba(190,255,215,.14)', lineSoft: 'rgba(190,255,215,.07)',
        shadow: 'rgba(0,0,0,.66)', cable: 'rgba(110,170,135,.24)',
        gridDot: 'rgba(110,170,135,.17)', gridLine: 'rgba(0,255,136,.05)', bgDot: 'rgba(110,170,135,.15)', wm: 'rgba(0,255,136,.045)',
        vignette: 'rgba(1,4,2,.6)', scopeGrid: 'rgba(0,255,136,.12)', scopeMid: 'rgba(110,170,135,.3)',
        kickerBg: 'rgba(6,12,8,.94)', kickerBorder: 'rgba(0,212,255,.35)', panelBg: 'rgba(8,14,10,.96)',
        tabs: { bg: 'rgba(6,12,8,.94)', border: 'rgba(190,255,215,.12)', text: '#4F7563', done: '#82B49A', on: '#F0FFF6', dot: '#13261B' },
        slabs: ['#08130D', '#07110B', '#060F0A', '#050C08'],
        sub: { bg: 'rgba(4,10,6,.96)', border: 'rgba(0,255,136,.38)', left: '#00FF88', text: '#F0FFF6', active: '#00FF88', glow: 'rgba(0,255,136,.45)', ring: 'rgba(0,255,136,.12)' },
        avatar: { stroke: '#00FF88', fill: '#06100A', border: 'rgba(0,255,136,.55)', glow: 'rgba(0,255,136,.16)', nh: 'rgba(0,255,136,.30)', nhEnd: 'rgba(12,21,16,.92)', tagBg: 'rgba(6,14,9,.94)', tagText: '#7DFFBE', tagBorder: 'rgba(0,255,136,.5)' }
      }
    },
    amber_lab: {
      label: '核能琥珀', en: 'AMBER LAB', dots: ['#120F0C', '#FF9F1C', '#FF4D4D'], light: false,
      desc: '核能琥珀实验室：深炭棕 #120F0C + 熔岩琥珀 #FF9F1C + 警报红 #FF4D4D + 暖米白字',
      vars: { bg: '#120F0C', node: '#1C1611', text: '#FFF1DE', cyan: '#FF9F1C', violet: '#FF6B3D', jade: '#C6F432', amber: '#FFD166', coral: '#FF4D4D' },
      t: {
        strong: '#FFF6E9', soft: '#F4E6D0', soft2: '#E0CCB0', mute: '#BBA388', dim: '#937E67', faint: '#7E6A55',
        off: '#3D3127', off2: '#2A2119', well: '#15100C', deep: '#0B0806', term: '#17110D', pic: '#0D0906',
        onAcc: '#1A0E04', line: 'rgba(255,225,190,.10)', line2: 'rgba(255,225,190,.14)', lineSoft: 'rgba(255,225,190,.07)',
        shadow: 'rgba(0,0,0,.66)', cable: 'rgba(190,160,125,.24)',
        gridDot: 'rgba(190,160,125,.17)', gridLine: 'rgba(255,159,28,.05)', bgDot: 'rgba(190,160,125,.15)', wm: 'rgba(255,159,28,.05)',
        vignette: 'rgba(6,3,1,.6)', scopeGrid: 'rgba(255,159,28,.12)', scopeMid: 'rgba(190,160,125,.3)',
        kickerBg: 'rgba(18,13,9,.94)', kickerBorder: 'rgba(255,159,28,.38)', panelBg: 'rgba(20,15,11,.96)',
        tabs: { bg: 'rgba(18,13,9,.94)', border: 'rgba(255,225,190,.12)', text: '#7E6A55', done: '#BBA388', on: '#FFF6E9', dot: '#2A2119' },
        slabs: ['#1A140F', '#18120D', '#16110C', '#130E0A'],
        sub: { bg: 'rgba(18,13,9,.96)', border: 'rgba(255,159,28,.4)', left: '#FF9F1C', text: '#FFF6E9', active: '#FFB547', glow: 'rgba(255,159,28,.45)', ring: 'rgba(255,159,28,.12)' },
        avatar: { stroke: '#FF9F1C', fill: '#1A120B', border: 'rgba(255,159,28,.55)', glow: 'rgba(255,159,28,.16)', nh: 'rgba(255,159,28,.32)', nhEnd: 'rgba(28,22,17,.92)', tagBg: 'rgba(20,14,10,.94)', tagText: '#FFC46B', tagBorder: 'rgba(255,159,28,.5)' }
      }
    },
    daylight: {
      label: '白昼蓝图', en: 'DAYLIGHT', dots: ['#F1F5F9', '#2563EB', '#059669'], light: true,
      desc: '白昼工程蓝图：冷白底 #F1F5F9 + 白色节点卡片 / 深墨高对比文字 + 科技蓝信号线 #2563EB + 翡翠绿点',
      vars: { bg: '#F1F5F9', node: '#FFFFFF', text: '#0F172A', cyan: '#2563EB', violet: '#7C3AED', jade: '#059669', amber: '#C2410C', coral: '#DC2626' },
      t: {
        strong: '#0F172A', soft: '#1E293B', soft2: '#334155', mute: '#475569', dim: '#64748B', faint: '#64748B',
        off: '#CBD5E1', off2: '#E2E8F0', well: '#F8FAFC', deep: '#E8EEF5', term: '#F8FAFC', pic: '#F8FAFC',
        onAcc: '#FFFFFF', line: 'rgba(15,23,42,.12)', line2: 'rgba(15,23,42,.16)', lineSoft: 'rgba(15,23,42,.09)',
        shadow: 'rgba(15,23,42,.13)', cable: 'rgba(100,116,139,.32)',
        gridDot: 'rgba(71,85,105,.20)', gridLine: 'rgba(37,99,235,.07)', bgDot: 'rgba(71,85,105,.16)', wm: 'rgba(37,99,235,.06)',
        vignette: 'rgba(148,163,184,.22)', scopeGrid: 'rgba(37,99,235,.12)', scopeMid: 'rgba(100,116,139,.4)',
        kickerBg: 'rgba(255,255,255,.96)', kickerBorder: 'rgba(37,99,235,.35)', panelBg: 'rgba(255,255,255,.97)',
        tabs: { bg: 'rgba(255,255,255,.95)', border: 'rgba(15,23,42,.12)', text: '#64748B', done: '#334155', on: '#0F172A', dot: '#CBD5E1' },
        slabs: ['#DBE4EF', '#E4EAF2', '#EBF0F6', '#F6F8FB'],
        sub: { bg: 'rgba(255,255,255,.97)', border: 'rgba(37,99,235,.32)', left: '#059669', text: '#0F172A', active: '#1D4ED8', glow: 'transparent', ring: 'rgba(37,99,235,.10)' },
        avatar: { stroke: '#2563EB', fill: '#E2E8F0', border: 'rgba(37,99,235,.6)', glow: 'rgba(37,99,235,.10)', nh: 'rgba(37,99,235,.16)', nhEnd: 'rgba(255,255,255,.96)', nhText: '#0F172A', tagBg: 'rgba(255,255,255,.96)', tagText: '#1D4ED8', tagBorder: 'rgba(37,99,235,.5)' }
      }
    }
  };

  // ============================== 覆盖样式生成 ==============================
  function buildCSS(name) {
    const P = PRESETS[name];
    if (!P || !P.vars) return '';
    const V = P.vars, T = P.t, R = `:root[${ATTR}="${name}"]`;
    const varsCSS = Object.keys(V).map((k) => `--ng-${k}:${V[k]} !important;`).join('');
    const nhText = (T.avatar && T.avatar.nhText) || '#FFFFFF';
    let css = `
${R}{${varsCSS}}
/* ---------- index.html：底景 / 画布 / 转场 / 顶栏 / 人像 / 字幕 ---------- */
${R} #ng-bg-layer{background-image:radial-gradient(${T.bgDot} 1.4px,transparent 1.4px)}
${R} #ng-vignette{background:radial-gradient(ellipse at 40% 45%,transparent 55%,${T.vignette} 100%)}
${R} #ng-world{background-image:radial-gradient(${T.gridDot} 1.5px,transparent 1.5px),linear-gradient(90deg,${T.gridLine} 1px,transparent 1px),linear-gradient(${T.gridLine} 1px,transparent 1px)}
${R} #ng-wipe .ng-slab:nth-child(1){background:${T.slabs[0]} !important}
${R} #ng-wipe .ng-slab:nth-child(2){background:${T.slabs[1]} !important}
${R} #ng-wipe .ng-slab:nth-child(3){background:${T.slabs[2]} !important}
${R} #ng-wipe .ng-slab.top{background-color:${T.slabs[3]};background-image:radial-gradient(${T.gridDot} 1.4px,transparent 1.4px)}
${R} .ng-exec{background:var(--ng-node);box-shadow:0 30px 70px ${T.shadow},0 0 40px color-mix(in srgb,var(--ng-jade) 25%,transparent)}
${R} .ng-exec .nh{background:linear-gradient(90deg,color-mix(in srgb,var(--ng-jade) 30%,var(--ng-node)),var(--ng-node) 85%);border-bottom-color:${T.line};color:${T.strong}}
${R} .ng-exec .no{text-shadow:0 0 40px color-mix(in srgb,var(--ng-cyan) 45%,transparent)}
${R} .ng-exec .lb{color:${T.strong}}
${R} .ng-exec .tr{background:${T.deep};border-color:${T.line}}
${R} #ng-tabs{background:${T.tabs.bg};border-color:${T.tabs.border}}
${R} .ng-tab{color:${T.tabs.text}}
${R} .ng-tab i{background:${T.tabs.dot}}
${R} .ng-tab.done{color:${T.tabs.done}}
${R} .ng-tab.on{color:${T.tabs.on}}
${R} .ng-tab .tr{background:${T.line}}
${R} #avatar-stage{border-color:${T.avatar.border} !important;box-shadow:0 24px 56px ${T.shadow},0 0 30px ${T.avatar.glow} !important}
${R} #avatar-stage.is-full{border:0 solid transparent !important;box-shadow:none !important}
${R} #avatar-nh{background:linear-gradient(90deg,${T.avatar.nh},${T.avatar.nhEnd} 80%);border-bottom-color:${T.line};color:${nhText}}
${R} #avatar-silhouette circle,${R} #avatar-silhouette path{fill:${T.avatar.fill};stroke:${T.avatar.stroke}}
${R} #avatar-silhouette text{fill:${T.avatar.stroke}}
${R} #avatar-tag{background:${T.avatar.tagBg} !important;color:${T.avatar.tagText} !important;border-color:${T.avatar.tagBorder} !important}
${R} #subtitle-bar{background:${T.sub.bg} !important;border:1.5px solid ${T.sub.border} !important;border-left:6px solid ${T.sub.left} !important;color:${T.sub.text} !important;box-shadow:0 16px 38px ${T.shadow},0 0 24px ${T.sub.ring} !important}
${R} #subtitle-bar .w,${R} #subtitle-bar .w.passed{color:${T.sub.text} !important;text-shadow:none !important}
${R} #subtitle-bar .w.active{color:${T.sub.active} !important;text-shadow:0 0 14px ${T.sub.glow} !important}
${R} #load-error{background:var(--ng-node)}
/* ---------- components.js：通用件 ---------- */
${R} .cb-base{stroke:${T.cable}}
${R} .cb-port{stroke:var(--ng-bg)}
${R} .ng-kicker{background:${T.kickerBg};border-color:${T.kickerBorder};border-left-color:var(--ng-cyan)}
${R} .ng-head{color:${T.strong};text-shadow:0 4px 24px ${T.shadow}}
${R} .ng-chip{background:${T.well};box-shadow:0 10px 26px ${T.shadow},0 0 18px color-mix(in srgb,var(--nc) 25%,transparent)}
${R} .ng-chip small{color:${T.mute}}
${R} .ng-chip.solid{background:var(--nc);color:${T.onAcc}}
${R} .ng-chip.solid small{color:${T.onAcc}}
${R} .ng-node{border-color:${T.line2};box-shadow:0 24px 54px ${T.shadow}}
${R} .ng-node.lit{border-color:var(--nc);box-shadow:0 24px 54px ${T.shadow},0 0 32px color-mix(in srgb,var(--nc) 26%,transparent)}
${R} .ng-node .nh{border-bottom-color:${T.line};color:${T.strong}}
${R} .ng-node .nh .st{background:${T.off2};color:${T.mute}}
${R} .ng-node.lit .nh .st{background:color-mix(in srgb,var(--nc) 22%,${T.well});color:var(--nc)}
${R} .ng-node.done .nh .st{background:var(--ng-jade);color:${T.onAcc}}
${R} .ng-node .nh i{background:${T.off}}
${R} .ng-node.lit .nh i{background:var(--nc)}
${R} .ng-np{background:${T.well};border-color:${T.lineSoft};color:${T.dim}}
${R} .ng-np .pv{color:${T.mute}}
${R} .ng-np.on{border-color:var(--nc);color:${T.strong};background:color-mix(in srgb,var(--nc) 14%,${T.well})}
${R} .ng-np.on .pv{color:var(--nc)}
${R} .ng-scope{background:${T.deep};border-color:${T.lineSoft}}
${R} .ng-scope g[stroke]{stroke:${T.scopeGrid}}
${R} .ng-scope line[stroke-dasharray]{stroke:${T.scopeMid}}
${R} .ng-ruler line[stroke="#64748B"]{stroke:${T.dim}}
${R} .ng-ruler line[stroke="#334155"]{stroke:${T.off}}
${R} .ng-ruler text{fill:${T.faint}}
${R} .ng-leds i{background:${T.off2}}
${R} .ng-leds i.on{background:var(--nc)}
${R} .ng-ring g[stroke]{stroke:${T.off}}
${R} .ng-ring circle[stroke="#1E293B"]{stroke:${T.off2}}
${R} .ng-ring .rv{color:${T.strong}}
${R} .ng-ring .rv small{color:${T.mute}}
${R} .ng-track{background:${T.deep};border-color:${T.line}}
${R} .ng-wm{color:${T.wm}}
${R} .ng-ck{stroke:${T.onAcc}}
/* cover */
${R} .ng-cv-title{color:${T.strong};text-shadow:0 0 30px color-mix(in srgb,var(--ng-cyan) 18%,transparent)}
${R} .ng-cv-sub{color:${T.soft}}
${R} .ng-queue .lb{color:${T.mute}}
${R} .ng-btn{background:${T.well};color:${T.strong}}
${R} .ng-btn.on{background:var(--nc);color:${T.onAcc}}
${R} .ng-btn.on small{color:${T.onAcc}}
/* stat */
${R} .ng-st-num{color:${T.strong}}
${R} .ng-st-meta{color:${T.dim}}
${R} .ng-delta{color:${T.strong}}
/* steps */
${R} .ng-sp-no{-webkit-text-stroke-color:${T.off}}
${R} .ng-node.lit .ng-sp-no{-webkit-text-stroke-color:var(--nc)}
${R} .ng-sp-t{color:${T.strong}}
${R} .ng-out .f{color:${T.soft}}
${R} .ng-out .m{color:${T.dim}}
/* checklist */
${R} .ng-ck-ttl{color:${T.strong}}
${R} .ng-ck-sub{color:${T.mute}}
${R} .ng-ck-hr{background:linear-gradient(90deg,var(--ng-cyan),transparent)}
${R} .ng-row{background:${T.well};border-color:${T.lineSoft};border-left-color:${T.off2}}
${R} .ng-row.on{border-color:color-mix(in srgb,var(--nc) 55%,transparent);border-left-color:var(--nc);background:color-mix(in srgb,var(--nc) 10%,${T.well})}
${R} .ng-row .box{border-color:${T.off}}
${R} .ng-row.on .box{background:var(--nc);border-color:var(--nc)}
${R} .ng-row .k,${R} .ng-row .d{color:${T.dim}}
${R} .ng-row.on .k{color:${T.strong}}
${R} .ng-row.on .d{color:${T.mute}}
${R} .ng-row .n{background:${T.off2};color:${T.dim}}
${R} .ng-row.on .n{background:var(--nc);color:${T.onAcc}}
${R} .ng-memo{background:color-mix(in srgb,var(--ng-violet) 12%,${T.well});color:${T.strong}}
/* compare */
${R} .ng-cmp-t{color:${T.strong}}
${R} .ng-cmp-d{color:${T.soft2}}
${R} .ng-node.err .ng-cmp-t,${R} .ng-node.err .ng-cmp-d{color:${T.dim}}
${R} .ng-node.err .nh .st{background:var(--ng-coral);color:#FFFFFF}
${R} .ng-lever{background:${T.deep};border-color:${T.line2}}
${R} .ng-verdict b{color:${T.onAcc}}
${R} .ng-verdict span{color:${T.strong}}
/* showcase */
${R} .ng-term{background:${T.deep};color:${T.soft2}}
${R} .ng-term .ln{color:${T.off}}
${R} .ng-term .c{color:${T.dim}}
${R} .ng-term.doc{background:${T.term};color:${T.soft}}
${R} .ng-call .tx{background:${T.panelBg};color:${T.strong};box-shadow:0 10px 26px ${T.shadow}}
${R} .ng-prod .pic{background-color:${T.pic};border-color:color-mix(in srgb,var(--ng-cyan) 30%,transparent);background-image:linear-gradient(${T.scopeGrid} 1px,transparent 1px),linear-gradient(90deg,${T.scopeGrid} 1px,transparent 1px)}
${R} .ng-prod .pic svg.dev g[fill="none"]{stroke:var(--ng-cyan)}
${R} .ng-prod .pic svg.dev circle[stroke="#A78BFA"]{stroke:var(--ng-violet)}
${R} .ng-prod .pic svg.dev circle[stroke="#00E5C3"]{stroke:var(--ng-jade)}
${R} .ng-prod .pic svg.dev rect[stroke="#FFB84D"]{stroke:var(--ng-amber)}
${R} .ng-prod .pic svg.dev g[stroke-dasharray]{stroke:color-mix(in srgb,var(--ng-cyan) 45%,transparent)}
${R} .ng-prod .pic svg.dev text{fill:var(--ng-cyan)}
${R} .ng-prod .nm{color:${T.strong}}
/* quote */
${R} .ng-q .t{color:${T.strong};text-shadow:0 4px 20px ${T.shadow}}
/* outro */
${R} .ng-act-t{color:${T.strong}}
${R} .ng-act-d{color:${T.mute}}
${R} .ng-act-no{-webkit-text-stroke-color:${T.off}}
${R} .ng-node.lit .ng-act-no{-webkit-text-stroke-color:var(--nc)}
${R} .ng-cta-t{color:${T.strong}}
${R} .ng-cta-repo{background:${T.deep};border-color:color-mix(in srgb,var(--ng-jade) 30%,transparent);color:${T.soft}}
/* timeline / diagram */
${R} .ng-tl-t{color:${T.strong}}
${R} .ng-tl-d{color:${T.mute}}
${R} .ng-node.now{box-shadow:0 24px 54px ${T.shadow},0 0 46px color-mix(in srgb,var(--nc) 45%,transparent)}
${R} .ng-dg-l{color:${T.strong}}
${R} .ng-dg-s{color:${T.mute}}
${R} .ng-node.focus{border-color:var(--ng-amber);box-shadow:0 24px 54px ${T.shadow},0 0 0 3px color-mix(in srgb,var(--ng-amber) 30%,transparent),0 0 50px color-mix(in srgb,var(--ng-amber) 45%,transparent)}
${R} .ng-tag{background:${T.well}}
`;
    if (P.light) {
      // 浅底：关闭霓虹外发光 / 文字辉光，未激活节点改为“褪色”而非“压暗”，强调色描边加粗一点
      css += `
${R} #ng-wipe .ng-slab{box-shadow:-10px 0 30px color-mix(in srgb,var(--c) 30%,transparent),inset 10px 0 24px -14px color-mix(in srgb,var(--c) 40%,transparent)}
${R} .ng-exec{box-shadow:0 30px 70px ${T.shadow},0 0 0 4px color-mix(in srgb,var(--ng-jade) 14%,transparent)}
${R} .ng-exec .nh{background:linear-gradient(90deg,color-mix(in srgb,var(--ng-jade) 18%,#FFFFFF),#FFFFFF 85%)}
${R} .ng-exec .no{text-shadow:none}
${R} .ng-exec .nh i,${R} .ng-exec .tr b,${R} .ng-tab.on i,${R} .ng-tab .fl,${R} #avatar-nh i,${R} #avatar-tag i{box-shadow:none}
${R} .ng-zone em,${R} .ng-q em{text-shadow:none}
${R} .ng-head,${R} .ng-q .t,${R} .ng-cv-title{text-shadow:none}
${R} .ng-chip{box-shadow:0 8px 20px ${T.shadow}}
${R} .ng-node:not(.lit) .nb{filter:saturate(.2) opacity(.58)}
${R} .ng-node.lit{box-shadow:0 24px 54px ${T.shadow},0 0 0 3px color-mix(in srgb,var(--nc) 16%,transparent)}
${R} .ng-node .nh{background:linear-gradient(90deg,color-mix(in srgb,var(--nc) 18%,var(--ng-node)),var(--ng-node) 85%)}
${R} .ng-node.lit .nh .st{background:color-mix(in srgb,var(--nc) 14%,#FFFFFF)}
${R} .ng-node.done .nh .st{background:var(--ng-jade);color:${T.onAcc}}
${R} #avatar-nh{background:linear-gradient(90deg,color-mix(in srgb,var(--ng-cyan) 16%,#FFFFFF),#FFFFFF 80%)}
${R} .ng-node.now{box-shadow:0 24px 54px ${T.shadow},0 0 0 4px color-mix(in srgb,var(--nc) 22%,transparent)}
${R} .ng-node.focus{box-shadow:0 24px 54px ${T.shadow},0 0 0 4px color-mix(in srgb,var(--ng-amber) 25%,transparent)}
${R} .ng-node.lit .nh i,${R} .ng-node.err .nh i,${R} .ng-leds i.on,${R} .ng-track i,${R} .ng-lever i,${R} .ng-okbadge,${R} .ng-row.on .box,${R} .ng-cv-title .cur,${R} .ng-term .cur,${R} .ng-kicker i,${R} .ng-call .ln{box-shadow:none}
${R} .ng-call .dot{box-shadow:0 0 0 5px color-mix(in srgb,var(--nc) 22%,transparent)}
${R} .ng-node.lit .ng-st-num,${R} .ng-vs,${R} .ng-cv-no{text-shadow:none}
${R} .ng-out .b,${R} .ng-btn.on{box-shadow:none}
${R} .ng-scan{box-shadow:0 0 10px 2px color-mix(in srgb,var(--ng-cyan) 30%,transparent)}
${R} .ng-prod .pic .sc{box-shadow:0 0 8px 1px color-mix(in srgb,var(--ng-cyan) 30%,transparent)}
${R} .cb-lit{stroke-width:5.5}
`;
    }
    return css;
  }

  // ============================== 运行时 ==============================
  const state = { name: null, switcher: null, observer: null, keyBound: false };

  function normalize(name) {
    const k = String(name == null ? '' : name).trim().toLowerCase().replace(/-/g, '_');
    return Object.prototype.hasOwnProperty.call(PRESETS, k) ? k : null;
  }
  function ensureStyle() {
    let st = document.getElementById(STYLE_ID);
    if (!st) {
      st = document.createElement('style'); st.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(st);
    } else if (st.parentNode && st.parentNode.lastElementChild !== st) {
      st.parentNode.appendChild(st); // 保持在 components.js 注入的样式之后
    }
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
      try { global.dispatchEvent(new CustomEvent('ng:themechange', { detail: { name: key, preset: PRESETS[key] } })); } catch (_) {}
    }
    return key;
  }
  function resolve(script) {
    let fromUrl = null;
    try { fromUrl = normalize(new URL(global.location.href).searchParams.get('theme')); } catch (_) {}
    if (fromUrl) return fromUrl;
    const preset = script && script.theme && normalize(script.theme.preset);
    return preset || DEFAULT;
  }

  // ============================== 换肤胶囊条（节点风） ==============================
  const SW_CSS = `
#${SWITCHER_ID}{position:fixed;top:12px;right:12px;z-index:1000;display:flex;align-items:center;gap:3px;padding:4px 5px 4px 0;border-radius:3px;
  background:rgba(12,16,24,.94);border:1px solid rgba(148,163,184,.28);border-left:4px solid #38BDF8;box-shadow:0 12px 30px rgba(0,0,0,.45);
  font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace;font-size:11px;font-weight:900;letter-spacing:.08em;user-select:none}
#${SWITCHER_ID}.hidden{display:none}
#${SWITCHER_ID} .lb{color:#94A3B8;padding:0 8px 0 10px;white-space:nowrap}
#${SWITCHER_ID} .lb i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#00E5C3;box-shadow:0 0 6px #00E5C3;margin-right:7px;vertical-align:1px}
#${SWITCHER_ID} button{all:unset;cursor:pointer;display:flex;align-items:center;gap:7px;padding:5px 10px 5px 7px;border-radius:2px;color:#CBD5E1;white-space:nowrap;border:1px solid transparent;transition:background .15s}
#${SWITCHER_ID} button:hover{background:rgba(148,163,184,.12)}
#${SWITCHER_ID} button.on{background:rgba(56,189,248,.14);border-color:rgba(56,189,248,.55);color:#FFFFFF}
#${SWITCHER_ID} button:focus-visible{outline:2px solid #38BDF8;outline-offset:1px}
#${SWITCHER_ID} .dt{position:relative;width:15px;height:15px;border-radius:2px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);overflow:hidden;flex:none}
#${SWITCHER_ID} .dt i{position:absolute;right:0;top:0;width:7px;height:15px}
#${SWITCHER_ID} .dt b{position:absolute;right:0;bottom:0;width:7px;height:7px}
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
      el.innerHTML = `<span class="lb"><i></i>THEME</span>` + Object.keys(PRESETS).map((k) => {
        const p = PRESETS[k];
        return `<button type="button" data-theme="${k}" title="${p.desc}"><span class="dt" style="background:${p.dots[0]}"><i style="background:${p.dots[1]}"></i><b style="background:${p.dots[2]}"></b></span>${p.label}</button>`;
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

  /** 宿主页一行接入：按 URL / 剧本 theme.preset 应用皮肤并挂载换肤器 */
  function init(script, opts) {
    const name = apply(resolve(script), { syncUrl: false });
    if (!(opts && opts.switcher === false)) mountSwitcher(opts && opts.container);
    return name;
  }

  global.NodeGraphThemes = {
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
