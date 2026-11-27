/**
 * Mushanhe Video Engine — 风格包 05 · Pro NLE 多轨剪辑台 · 零代码换肤系统（templates/05_pro_nle/themes.js）
 * ---------------------------------------------------------------------------
 *   window.ProNLEThemes = { PRESETS, init(script), apply(name, opts?), mountSwitcher(container?), resolve(script?), normalize(name), current(), list(), canvas() }
 *
 *   - PRESETS        : 4 套皮肤（studio_dark 默认 / color_grade / light_silver / broadcast），每套含 label、色点、CSS 变量与面板参数
 *   - apply(name)    : 切换皮肤（幂等）。写 <html data-pn-theme>，注入/更新 <style id="pn-theme-override">，
 *                      派发 'pn:themechange' 事件（宿主页据此重绘画布：A1/A2 声波、视频示波器），
 *                      并把 ?theme=xxx 同步进地址栏（history.replaceState，不刷新）
 *   - mountSwitcher(): 挂在 Program Monitor 标题栏正中的「DISPLAY LUT」4 色胶囊换肤器；跟随 #hud 显隐（H 键 / ?clean=1）
 *   - resolve(script): 启动皮肤名：URL ?theme= ＞ 剧本 theme.preset ＞ 'studio_dark'
 *   - normalize(name): 皮肤名规范化（大小写 / 连字符 / v3.2.1 及更早的旧皮肤名 → 新名）；apply / resolve / themeCues 全部经过它
 *   - init(script)   : apply(resolve(script), { syncUrl:false }) + mountSwitcher()，供宿主页 boot() 一行接入
 *   - canvas()       : 当前皮肤的画布配色 { scopeGrid, scope:[3], waveA1, waveA2 }（studio_dark = 原版取值）
 *
 * 兼容约定：
 *   - studio_dark（默认）= 不注入任何覆盖规则、不改 CSS 变量、画布取原版颜色，即与现有页面逐像素一致。
 *   - 旧皮肤名兼容（至少保留到 v4.x）：见下方 LEGACY，?theme= / 剧本 theme.preset / meta.themeCues 写旧名都会自动换成新名。
 *   - 其余皮肤的 CSS 变量用 !important 声明在 :root[data-pn-theme="x"] 上，能压过宿主 boot() 按剧本 theme 写入的内联变量。
 *   - 只依赖 DOM；建议在 components.js 之后引入。
 */
(function (global) {
  'use strict';

  const DEFAULT = 'studio_dark';
  const STYLE_ID = 'pn-theme-override';
  const SWITCHER_ID = 'pn-theme-switcher';
  const ATTR = 'data-pn-theme';

  const mixv = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const CY = 'var(--pn-cyan)', JD = 'var(--pn-jade)', AM = 'var(--pn-amber)', CR = 'var(--pn-crimson)', VI = 'var(--pn-violet)';

  // ============================== 4 套皮肤 ==============================
  /**
   * vars   : --pn-* 主题变量（studio_dark 为 null = 不覆盖）
   * 角色    : cyan = 主 UI 点缀（标签/播放进度/光标）· jade = 高亮/通过 · amber = 备注/裁决 · crimson = 播放头/录制/错误 · violet = 人声轨
   * L(a)   : 细线/描边/底纹（暗皮肤 = 白色透明，浅皮肤 = 墨蓝透明）
   * hi..faint : 文字灰阶（由亮到暗 / 由深到浅），保证在各自面板上高对比
   */
  const PRESETS = {
    studio_dark: {
      label: '深蓝黑', en: 'STUDIO DARK', dots: ['#0A0D12', '#38BDF8'], dark: true,
      desc: '默认·深蓝黑非编：#0A0D12 演播室底 + 青 / 翡翠 / 琥珀 / 玫红',
      vars: null,
      canvas: { scopeGrid: 'rgba(255,255,255,0.06)', scope: ['rgba(0,229,195,0.55)', 'rgba(56,189,248,0.5)', 'rgba(255,184,77,0.4)'], waveA1: 'rgba(196,181,253,0.85)', waveA2: 'rgba(255,200,120,0.6)' }
    },

    color_grade: {
      label: '调色台', en: 'COLOR GRADE', dots: ['#0B0B0D', '#FF7A00'], dark: true,
      desc: '电影调色台：曜石黑 + 电影橙 + 青蓝 + 胶片金',
      vars: { bg: '#0B0B0D', text: '#ECE8E2', cyan: '#FF7A00', jade: '#00C2D1', amber: '#E8B84A', crimson: '#FF4040', violet: '#B79CFF', border: 'rgba(255,255,255,0.10)' },
      L: (a) => `rgba(255,255,255,${a})`,
      hi: '#FFFFFF', text: '#ECE8E2', soft: '#D6D0C8', mute: '#A39C93', dim: '#7D776F', faint: '#58534D',
      onAccent: '#100A04', inset: '#0E0E11', overlay: 'rgba(12,12,14,0.92)',
      panel: ['#1A1A1E', '#121215'], shadow: 'rgba(0,0,0,0.62)', titleShadow: '0 6px 30px rgba(0,0,0,0.7)',
      vpTop: '#1A1714', scan: 'rgba(255,255,255,0.012)',
      topbar: ['#1C1C20', '#121215'], monBg: '#0C0C0F', hdr: ['#1B1B1F', '#141417'], foot: '#131316', monBody: ['#141416', '#0A0A0C'],
      tlBg: '#121215', ruler: ['#1D1D21', '#151518'], lblBg: '#17171B', scopeBg: '#070708',
      tabText: '#FFB066', wrongText: '#FFB0A8', amberText: '#F5D78A',
      sil: ['#24201C', '#0F0D0B'], silText: '#FF9A3D', tagBg: 'rgba(10,10,12,0.88)',
      sub: { bg: 'rgba(10,10,12,0.95)', text: '#FFFFFF', active: '#E8B84A', glow: 'rgba(232,184,74,0.55)' },
      codeBg: '#0E0E11', picBg: '#121214',
      canvas: { scopeGrid: 'rgba(255,255,255,0.06)', scope: ['rgba(0,194,209,0.55)', 'rgba(255,122,0,0.5)', 'rgba(232,184,74,0.42)'], waveA1: 'rgba(205,190,255,0.85)', waveA2: 'rgba(240,200,110,0.62)' }
    },

    light_silver: {
      label: '浅银', en: 'LIGHT SILVER', dots: ['#E5E7EB', '#007AFF'], dark: false,
      desc: '浅银工作站：浅银灰金属台面 + 洁白面板与清晰时间线 + 系统蓝 + 珊瑚红游标',
      vars: { bg: '#E5E7EB', text: '#1E293B', cyan: '#007AFF', jade: '#15803D', amber: '#B45309', crimson: '#F0483E', violet: '#7C3AED', border: 'rgba(15,23,42,0.14)' },
      L: (a) => `rgba(15,23,42,${Math.min(0.32, +(a * 1.25).toFixed(3))})`,
      hi: '#0B1220', text: '#1E293B', soft: '#334155', mute: '#475569', dim: '#5B6676', faint: '#8A94A3',
      onAccent: '#FFFFFF', inset: '#F3F4F6', overlay: 'rgba(255,255,255,0.97)',
      panel: ['#FFFFFF', '#F8F9FB'], shadow: 'rgba(15,23,42,0.13)', titleShadow: 'none',
      vpTop: '#F1F2F5', scan: 'rgba(15,23,42,0.0)',
      topbar: ['#FAFAFB', '#ECEEF1'], monBg: '#FFFFFF', hdr: ['#F7F8FA', '#EEF0F3'], foot: '#F3F4F6', monBody: ['#FDFDFE', '#F1F3F6'],
      tlBg: '#FFFFFF', ruler: ['#F5F6F8', '#ECEEF1'], lblBg: '#F3F4F6', scopeBg: '#F3F5F8',
      tabText: '#0062CC', wrongText: '#B42318', amberText: '#92400E',
      sil: ['#E2E8F0', '#CBD5E1'], silText: '#007AFF', tagBg: 'rgba(255,255,255,0.95)',
      sub: { bg: 'rgba(255,255,255,0.97)', text: '#0B1220', active: '#007AFF', glow: 'rgba(0,122,255,0.0)' },
      codeBg: '#FFFFFF', picBg: '#F6F7F9',
      canvas: { scopeGrid: 'rgba(15,23,42,0.08)', scope: ['rgba(21,128,61,0.55)', 'rgba(0,122,255,0.55)', 'rgba(180,83,9,0.45)'], waveA1: 'rgba(124,58,237,0.75)', waveA2: 'rgba(180,83,9,0.55)' }
    },

    broadcast: {
      label: '导播台', en: 'BROADCAST', dots: ['#09111F', '#EC4899'], dark: true,
      desc: '广电导播台：深海军蓝 + 荧光洋红 + 电光青 + 广播黄',
      vars: { bg: '#09111F', text: '#E6EDF7', cyan: '#EC4899', jade: '#06B6D4', amber: '#FACC15', crimson: '#FF3B30', violet: '#8B8CFF', border: 'rgba(255,255,255,0.11)' },
      L: (a) => `rgba(255,255,255,${a})`,
      hi: '#FFFFFF', text: '#E6EDF7', soft: '#CAD5E5', mute: '#93A3BB', dim: '#6D7E98', faint: '#4A5A73',
      onAccent: '#0A0614', inset: '#0A1322', overlay: 'rgba(7,13,25,0.93)',
      panel: ['#14203A', '#0D172B'], shadow: 'rgba(0,0,0,0.6)', titleShadow: '0 6px 30px rgba(0,0,0,0.65)',
      vpTop: '#14213D', scan: 'rgba(255,255,255,0.014)',
      topbar: ['#16223D', '#0E182C'], monBg: '#0A1222', hdr: ['#16223B', '#101A2E'], foot: '#0F182B', monBody: ['#0F1A30', '#080F1C'],
      tlBg: '#0D172B', ruler: ['#17233E', '#111B31'], lblBg: '#121D35', scopeBg: '#060C17',
      tabText: '#F9A8D4', wrongText: '#FFB4AE', amberText: '#FDE68A',
      sil: ['#1B2846', '#0B1324'], silText: '#EC4899', tagBg: 'rgba(7,13,25,0.88)',
      sub: { bg: 'rgba(6,11,22,0.95)', text: '#FFFFFF', active: '#FACC15', glow: 'rgba(250,204,21,0.5)' },
      codeBg: '#0A1322', picBg: '#0E1A31',
      canvas: { scopeGrid: 'rgba(255,255,255,0.06)', scope: ['rgba(6,182,212,0.55)', 'rgba(236,72,153,0.5)', 'rgba(250,204,21,0.4)'], waveA1: 'rgba(180,182,255,0.85)', waveA2: 'rgba(250,215,90,0.6)' }
    }
  };

  // ============================== CSS 覆盖层 ==============================
  function buildCSS(name) {
    const T = PRESETS[name];
    if (!T || !T.vars) return '';
    const P = `:root[${ATTR}="${name}"]`;
    const V = T.vars, L = T.L, S = T.sub;
    const dark = T.dark;
    const panel = `linear-gradient(180deg,${T.panel[0]} 0%,${T.panel[1]} 100%)`;
    const pShadow = dark ? `0 22px 50px ${T.shadow},inset 0 1px 0 ${L(0.08)}` : `0 1px 2px rgba(15,23,42,.06),0 14px 34px ${T.shadow}`;
    const hiWhite = dark ? '#FFFFFF' : T.hi;
    return `
/* ====== ProNLEThemes · ${name} ====== */
${P}{--pn-bg:${V.bg} !important;--pn-text:${V.text} !important;--pn-cyan:${V.cyan} !important;--pn-jade:${V.jade} !important;--pn-amber:${V.amber} !important;--pn-crimson:${V.crimson} !important;--pn-violet:${V.violet} !important;--pn-border:${V.border} !important;color-scheme:${dark ? 'dark' : 'light'}}
${P} #viewport{background:radial-gradient(circle at 50% 0%,${T.vpTop} 0%,var(--pn-bg) 65%)}
${P} #viewport::after{background:repeating-linear-gradient(0deg,${T.scan} 0 1px,transparent 1px 3px)}

/* 顶部菜单栏 */
${P} #pn-topbar{background:linear-gradient(180deg,${T.topbar[0]} 0%,${T.topbar[1]} 100%);box-shadow:${dark ? '0 4px 20px rgba(0,0,0,.45)' : '0 1px 0 rgba(255,255,255,.8) inset,0 4px 16px rgba(15,23,42,.08)'}}
${P} .nt-logo{color:${T.onAccent};background:linear-gradient(135deg,${JD},${CY})}
${P} .nt-proj{color:${T.text}}
${P} .nt-tools{border-left-color:${L(0.12)}}
${P} .nt-ico{background:${L(0.05)};border-color:${L(0.08)};color:${T.mute}}
${P} .nt-ico.on{color:${dark ? CY : T.tabText};border-color:${mixv(CY, 45)};background:${mixv(CY, 14)}}
${P} .nt-st{color:${dark ? 'rgba(255,255,255,.4)' : T.faint};background:${L(0.03)}}
${P} .nt-st.active{color:${hiWhite};background:${mixv(CY, dark ? 20 : 14)};border-color:${mixv(CY, 50)};box-shadow:0 0 14px ${mixv(CY, 20)}}
${P} .nt-st.done{color:${JD}}
${P} .nt-tc{color:${hiWhite}}
${P} .nt-hdr-tag{background:${mixv(AM, 18)};border-color:${mixv(AM, 45)};color:${T.amberText}}

/* Program Monitor */
${P} #pn-monitor{background:${T.monBg};box-shadow:${dark ? `0 28px 66px rgba(0,0,0,.65),inset 0 1px 0 ${L(0.08)}` : `0 1px 2px rgba(15,23,42,.06),0 18px 44px ${T.shadow}`}}
${P} .mon-hdr{background:linear-gradient(180deg,${T.hdr[0]},${T.hdr[1]});color:${T.mute}}
${P} .mon-foot{background:${T.foot};color:${T.dim}}
${P} .mf-btns{color:${T.soft}}
${P} #pn-mon-body{background:radial-gradient(circle at 50% 40%,${T.monBody[0]} 0%,${T.monBody[1]} 80%)}
${P} #pn-world{background-image:linear-gradient(90deg,${mixv(CY, dark ? 4 : 7)} 1px,transparent 1px),linear-gradient(${mixv(CY, dark ? 4 : 7)} 1px,transparent 1px)}
${P} .pn-safe{border-color:${L(0.22)}}
${P} .pn-strip{background:${T.monBg}}
${P} #pn-slate .b{color:${T.hi};text-shadow:${dark ? `0 0 30px ${mixv(CY, 35)}` : 'none'}}
${P} #pn-slate .c{border-color:${mixv(CR, 55)};background:${mixv(CR, 12)};color:${T.wrongText}}

/* Inspector */
${P} #pn-inspector{background:${panel};box-shadow:${pShadow}}
${P} .ins-hdr{color:${T.tabText}}
${P} #ins-scope{background:${T.scopeBg};border-color:${L(0.08)}}
${P} .ins-vu{background:${L(0.06)}}
${P} .ins-vu b{color:${T.dim}}
${P} .ins-kv{color:${T.mute};border-bottom-color:${L(0.05)}}
${P} .ins-src{color:${T.faint}}

/* 四轨时间轴 */
${P} #pn-timeline{background:${T.tlBg};box-shadow:${dark ? `0 20px 48px rgba(0,0,0,.58),inset 0 1px 0 ${L(0.08)}` : `0 1px 2px rgba(15,23,42,.06),0 14px 34px ${T.shadow}`}}
${P} .tl-ruler{background:linear-gradient(180deg,${T.ruler[0]},${T.ruler[1]})}
${P} .tl-ruler .tk{background-image:repeating-linear-gradient(90deg,${L(0.16)} 0 1px,transparent 1px 23.2px)}
${P} .tl-ruler .lb{color:${T.dim}}
${P} .tl-ruler .seq{color:${dark ? CY : T.tabText}}
${P} .tl-row{border-bottom-color:${L(0.05)}}
${P} .tl-lbl{background:${T.lblBg};color:${T.mute}}
${P} .tl-lbl em{color:${T.faint}}
${P} .tl-c{background:${L(0.06)};color:${T.dim}}
${P} .tl-clip{color:${dark ? 'rgba(255,255,255,.85)' : T.text};border-color:${L(0.16)}}
${P} .tl-clip.playing{color:${hiWhite};border-color:${hiWhite};box-shadow:0 0 16px ${dark ? 'rgba(255,255,255,.3)' : 'rgba(15,23,42,.18)'}}
${P} .c-amber{background:linear-gradient(180deg,${mixv(AM, dark ? 30 : 22)},${mixv(AM, dark ? 18 : 12)});border-color:${mixv(AM, 55)}}
${P} .c-blue{background:linear-gradient(180deg,${mixv(CY, dark ? 28 : 20)},${mixv(CY, dark ? 16 : 10)});border-color:${mixv(CY, 55)}}
${P} .c-jade{background:linear-gradient(180deg,${mixv(JD, dark ? 26 : 20)},${mixv(JD, dark ? 15 : 10)});border-color:${mixv(JD, 50)}}
${P} .c-violet{background:linear-gradient(180deg,${mixv(VI, dark ? 28 : 20)},${mixv(VI, dark ? 15 : 10)});border-color:${mixv(VI, 55)}}
${P} #tl-a1{background:${mixv(VI, 10)};border-color:${mixv(VI, 38)}}
${P} #tl-a2{background:${mixv(AM, 7)};border-color:${mixv(AM, 32)}}
${P} #tl-played{background:${mixv(CY, dark ? 4 : 6)}}

/* 人像监视器框 + 剪影占位 */
${P} #avatar-stage{border-color:${mixv(CY, 50)} !important;box-shadow:0 0 0 1px ${L(0.1)},0 24px 60px ${dark ? 'rgba(0,0,0,.65)' : 'rgba(15,23,42,.18)'},0 0 34px ${mixv(CY, 16)} !important;background:${dark ? V.bg : '#DDE1E7'} !important}
${P} #avatar-stage.is-full{border-color:transparent !important;box-shadow:none !important}
${P} #sil-g stop:first-child{stop-color:${T.sil[0]}}
${P} #sil-g stop:last-child{stop-color:${T.sil[1]}}
${P} #avatar-silhouette circle,${P} #avatar-silhouette path{stroke:${CY}}
${P} #avatar-silhouette text{fill:${T.silText}}
${P} #avatar-tag{background:${T.tagBg} !important;border-color:${mixv(CY, 50)} !important;color:${T.text} !important}

/* 字幕 */
${P} #subtitle-bar{background:${S.bg} !important;border-color:${mixv(CY, 50)} !important;border-left-color:${CY} !important;box-shadow:${dark ? `0 10px 30px rgba(0,0,0,.6),0 0 24px ${mixv(CY, 18)}` : '0 10px 30px rgba(15,23,42,.18)'} !important;color:${S.text} !important}
${P} #subtitle-bar .w,${P} #subtitle-bar .w.passed{color:${S.text} !important}
${P} #subtitle-bar .w.active{color:${S.active} !important;text-shadow:0 0 14px ${S.glow} !important}

/* ====== 组件（components.js）====== */
${P} .pn-head,${P} .pn-cover-title,${P} .pn-cover-sub,${P} .pn-stat .num,${P} .pn-node .nm,${P} .pn-bin .lbl,${P} .pn-ide .ttl,${P} .pn-memo,${P} .pn-cmp .t,${P} .pn-verdict span,${P} .pn-prod .nm,${P} .pn-q .t,${P} .pn-job .t,${P} .pn-cta .t,${P} .pn-cta .btns span,${P} .pn-tl-node .t,${P} .pn-dg-node .l,${P} .pn-stat.hot .lb,${P} .pn-call span{color:${T.hi}}
${P} .pn-head,${P} .pn-cover-title{text-shadow:${T.titleShadow}}
${P} .pn-zone em,${P} .pn-scr em{${dark ? `color:${T.onAccent};background:${JD}` : `color:#004FB8;background:${mixv(CY, 14)};box-shadow:inset 0 -3px 0 ${mixv(CY, 55)}`}}
${P} .pn-panel{background:${panel};border-color:${V.border};box-shadow:${pShadow}}
${P} .pn-chip{background:${T.overlay};box-shadow:0 0 18px ${dark ? 'rgba(0,0,0,.4)' : 'rgba(15,23,42,.1)'}}
${P} .pn-badge{background:${T.overlay};box-shadow:0 0 0 4px ${dark ? T.overlay : 'rgba(255,255,255,.85)'},0 0 34px ${mixv('var(--c)', dark ? 55 : 30)},inset 0 0 20px ${mixv('var(--c)', dark ? 22 : 10)};text-shadow:${dark ? `0 0 16px ${mixv('var(--c)', 70)}` : 'none'}}
${P} .pn-bar{background:linear-gradient(180deg,${T.hdr[0]},${T.hdr[1]});border-bottom-color:${L(0.1)};color:${T.mute}}
${P} .pn-bar .tab{color:${T.tabText}}
${P} .pn-bar .r{color:${T.dim}}
${P} .pn-led{color:${JD}}
${P} .pn-cover-ch .m{color:${T.dim}}
${P} .pn-cover-ch .n{background-image:linear-gradient(180deg,${dark ? '#FFFFFF' : T.hi} 0%,${CY} 70%,${dark ? mixv(CY, 30) : mixv(CY, 55)} 100%)}
${P} .pn-cover-ch .sc{background:repeating-linear-gradient(0deg,${mixv(CY, 5)} 0 2px,transparent 2px 4px)}
${P} .pn-boot{color:${T.soft}}
${P} .pn-track{background:${L(0.07)};border-color:${L(0.08)}}
${P} .pn-meta{color:${T.dim} !important}
${P} .pn-stat .lb{background:${L(0.06)};border-color:${L(0.12)};color:${T.soft}}
${P} .pn-stat.hot .num{color:${JD};text-shadow:${dark ? `0 0 34px ${mixv(JD, 50)}` : 'none'}}
${P} .pn-stat .num .u,${P} .pn-stat .num .pf{color:${T.mute}}
${P} .pn-meter s{outline:1px solid ${L(dark ? 0.03 : 0.08)};outline-offset:-1px}
${P} .pn-stat .sc{color:${T.dim}}
${P} .pn-note{background:${T.overlay};border-color:${L(0.14)};border-left-color:${CY};color:${T.text}}
${P} .pn-note small{color:${dark ? CY : T.tabText}}
${P} .pn-node .hd{border-bottom-color:${L(0.08)};color:${T.dim}}
${P} .pn-node .no,${P} .pn-job .tg,${P} .pn-acc.open .bd,${P} .pn-acc.done .bd{color:${T.onAccent}}
${P} .pn-node .pt{background:${T.inset}}
${P} .pn-node .fn{background:${T.inset};border-color:${L(0.1)};color:${T.mute}}
${P} .pn-rail{background:${L(0.08)}}
${P} .pn-stub{background:${L(0.12)}}
${P} .pn-pkt{background:${dark ? '#FFFFFF' : T.hi}}
${P} .pn-bin .b,${P} .pn-verdict b{color:${dark ? T.onAccent : '#FFFFFF'}}
${P} .pn-bin .f{color:${dark ? CY : T.tabText}}
${P} .pn-bin .m{color:${T.dim}}
${P} .pn-ide .sub{color:${T.mute}}
${P} .pn-ide .hr{background:${L(0.1)}}
${P} .pn-ide .pass{border-color:${T.faint};color:${T.dim}}
${P} .pn-ide .pass.ok{border-color:${JD};color:${JD}}
${P} .pn-acc{border-color:${L(0.07)};border-left-color:${L(0.12)};background:${L(0.02)}}
${P} .pn-acc.open{border-color:${mixv('var(--a)', 55)};border-left-color:var(--a);background:${mixv('var(--a)', dark ? 9 : 7)}}
${P} .pn-acc .no{color:${T.faint}}
${P} .pn-acc .box{border-color:${T.faint}}
${P} .pn-acc.done .box{border-color:var(--a)}
${P} .pn-acc .k{color:${T.text}}
${P} .pn-acc .bd{background:${L(0.06)};color:${T.dim}}
${P} .pn-acc .d{background:${dark ? 'rgba(0,0,0,.36)' : 'rgba(15,23,42,.045)'};color:${T.soft}}
${P} .pn-memo small{color:${dark ? AM : T.amberText}}
${P} .pn-cmp.wrong .band{color:${T.wrongText}}
${P} .pn-cmp.right .band{color:${JD}}
${P} .pn-cmp.wrong .t{color:${dark ? T.dim : T.faint}}
${P} .pn-cmp .d{color:${T.soft}}
${P} .pn-cmp.wrong .d{color:${T.dim}}
${P} .pn-cmp .ok{box-shadow:0 0 0 5px ${T.monBg},0 0 30px ${mixv(JD, dark ? 70 : 40)}}
${P} .pn-vs{background:${T.monBg};color:${dark ? AM : T.amberText}}
${P} .pn-show{background:${T.codeBg}}
${P} .pn-code{color:${T.text}}
${P} .pn-code .ln{color:${T.faint}}
${P} .pn-code .c{color:${T.dim}}
${P} .pn-prod .pic{color:${T.soft};background:radial-gradient(circle at 50% 45%,${mixv(CY, 18)} 0%,transparent 62%),linear-gradient(${L(0.04)} 1px,transparent 1px),linear-gradient(90deg,${L(0.04)} 1px,transparent 1px),${T.picBg};background-size:auto,24px 24px,24px 24px,auto}
${P} .pn-prod .pic svg [fill="#121A26"]{fill:${dark ? T.panel[0] : '#E8ECF1'}}
${P} .pn-prod .pic svg [fill="#0B1018"]{fill:${dark ? T.inset : '#D5DBE3'}}
${P} .pn-prod .pic svg text{fill:${T.dim}}
${P} .pn-prod .specs{border-top-color:${L(0.14)}}
${P} .pn-prod .row{border-bottom-color:${L(0.07)}}
${P} .pn-prod .row .k{color:${T.dim}}
${P} .pn-prod .row .v{color:${T.text}}
${P} .pn-call span{background:${T.overlay}}
${P} .pn-q{background:${dark ? T.overlay : 'rgba(255,255,255,.95)'};border-color:${L(0.14)};border-left-color:${AM};box-shadow:0 30px 70px ${dark ? 'rgba(0,0,0,.6)' : 'rgba(15,23,42,.25)'},0 0 40px ${mixv(AM, 14)}}
${P} .pn-q .k{color:${dark ? AM : T.amberText}}
${P} .pn-q .by{color:${T.mute}}
${P} .pn-job .d{color:${T.dim}}
${P} .pn-job .st{color:${T.mute}}
${P} .pn-job .st.ok{color:${JD}}
${P} .pn-job .no{-webkit-text-stroke-color:${T.faint}}
${P} .pn-job .pb{background:${L(0.06)}}
${P} .pn-cta .k{color:${dark ? CY : T.tabText}}
${P} .pn-cta .repo{background:${T.inset};border-color:${L(0.12)};color:${T.text}}
${P} .pn-cta .ex{color:${T.dim}}
${P} .pn-tl-ruler{background-color:${T.ruler[1]};border-color:${L(0.08)};background-image:repeating-linear-gradient(90deg,${L(0.16)} 0 1px,transparent 1px 20px)}
${P} .pn-tl-kf{background:${T.inset}}
${P} .pn-tl-kf.lit{background:var(--a)}
${P} .pn-tl-stem{background:${L(0.18)}}
${P} .pn-tl-node .d{color:${T.mute}}
${P} .pn-dg-node .s{color:${T.dim}}
${P} .pn-dg-node .p{background:${T.inset}}
${P} .pn-dg-tag{background:${T.inset};border-color:${L(0.2)};color:${T.soft}}
${P} .pn-dg-svg marker path{fill:${T.soft}}
${P} .pn-dg-svg path[stroke="rgba(255,255,255,.06)"]{stroke:${L(0.06)}}
${P} .pn-dg-svg circle.pl[data-k="0"]{fill:${dark ? '#FFFFFF' : T.hi}}
${dark ? '' : `${P} .pn-ck{stroke:#FFFFFF}`}
`;
  }

  // ============================== apply ==============================
  const state = { name: null, switcher: null, observer: null, keyBound: false };

  // v3.2.2 去商标化改名：旧皮肤名 → 新皮肤名（旧 URL / 旧剧本 / 旧 themeCues 继续可用，至少保留一个大版本）
  const LEGACY = { premiere: 'studio_dark', davinci: 'color_grade', fcp_silver: 'light_silver' };

  function normalize(name) {
    let k = String(name == null ? '' : name).trim().toLowerCase().replace(/-/g, '_');
    if (Object.prototype.hasOwnProperty.call(LEGACY, k)) k = LEGACY[k];
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
   * 切换皮肤。先经 normalize()（旧名自动换新名），未知名称回退到 studio_dark。
   * @param {string} name   studio_dark | color_grade | light_silver | broadcast
   * @param {object} [opts] { syncUrl?: boolean } 默认 true；studio_dark 且地址栏原本没有 ?theme= 时不写参数
   */
  function apply(name, opts) {
    const o = opts || {};
    const key = normalize(name) || DEFAULT;
    const css = buildCSS(key);
    const st = ensureStyle();
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
      try { global.dispatchEvent(new CustomEvent('pn:themechange', { detail: { name: key, preset: PRESETS[key] } })); } catch (_) {}
    }
    return key;
  }

  /** 启动皮肤：URL ?theme= ＞ 剧本 theme.preset ＞ studio_dark（两处都先经 normalize） */
  function resolve(script) {
    let fromUrl = null;
    try { fromUrl = normalize(new URL(global.location.href).searchParams.get('theme')); } catch (_) {}
    if (fromUrl) return fromUrl;
    const preset = script && script.theme && normalize(script.theme.preset);
    return preset || DEFAULT;
  }

  /** 当前皮肤的画布配色（示波器 / 声波） */
  function canvas() { return PRESETS[state.name || DEFAULT].canvas; }

  // ============================== DISPLAY LUT 胶囊换肤器 ==============================
  // 默认挂在 Program Monitor 标题栏（.mon-hdr）正中，随 1920×1080 画幅一起缩放；被 H / ?clean=1 隐藏时不占版面
  const SW_CSS = `
#${SWITCHER_ID}{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;display:flex;align-items:center;gap:2px;padding:2px;border-radius:999px;
  background:rgba(6,9,14,.88);border:1px solid rgba(255,255,255,.16);box-shadow:0 4px 14px rgba(0,0,0,.35);
  font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace;font-size:10px;font-weight:800;letter-spacing:.08em;user-select:none;white-space:nowrap}
#${SWITCHER_ID}.hidden{display:none}
#${SWITCHER_ID} .lb{color:#8A96A8;padding:0 6px 0 8px}
#${SWITCHER_ID} button{all:unset;cursor:pointer;display:flex;align-items:center;gap:5px;height:20px;padding:0 9px 0 4px;border-radius:999px;color:#B8C2D0;transition:background .15s}
#${SWITCHER_ID} button:hover{background:rgba(255,255,255,.09)}
#${SWITCHER_ID} button.on{background:rgba(255,255,255,.16);color:#FFFFFF;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
#${SWITCHER_ID} button:focus-visible{outline:2px solid #38BDF8;outline-offset:1px}
#${SWITCHER_ID} .dt{position:relative;width:13px;height:13px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),0 1px 2px rgba(0,0,0,.5);overflow:hidden;flex:none}
#${SWITCHER_ID} .dt i{position:absolute;right:0;bottom:0;width:7px;height:7px;border-radius:50% 0 0 0}
#${SWITCHER_ID}.float{position:fixed;left:auto;right:12px;top:12px;transform:none;z-index:1000}
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

  /**
   * 渲染换肤器（幂等）。
   * @param {HTMLElement} [container] 默认 Program Monitor 标题栏 .mon-hdr；找不到时固定在窗口右上角
   */
  function mountSwitcher(container) {
    const host = container || document.querySelector('#pn-monitor .mon-hdr') || document.body;
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
      el.innerHTML = `<span class="lb">LUT</span>` + Object.keys(PRESETS).map((k) => {
        const p = PRESETS[k];
        return `<button type="button" data-theme="${k}" title="${p.desc}"><span class="dt" style="background:${p.dots[0]}"><i style="background:${p.dots[1]}"></i></span>${p.en}</button>`;
      }).join('');
      el.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('button[data-theme]');
        if (!b) return;
        apply(b.getAttribute('data-theme'), { syncUrl: true });
        b.blur();
      });
      el.addEventListener('keydown', (e) => { if (e.code === 'Space') e.preventDefault(); });
    }
    el.classList.toggle('float', host === document.body);
    if (getComputedStyle(host).position === 'static' && host !== document.body) host.style.position = 'relative';
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

  global.ProNLEThemes = {
    PRESETS, apply, mountSwitcher, resolve, init, canvas, normalize,
    current: () => state.name || DEFAULT,
    list: () => Object.keys(PRESETS)
  };

  // 加载即生效：URL 带 ?theme= 时立即套用（首帧无闪烁）
  try {
    const q = normalize(new URL(global.location.href).searchParams.get('theme'));
    if (q) apply(q, { syncUrl: false });
  } catch (_) {}
})(window);
