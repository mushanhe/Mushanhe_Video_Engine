/**
 * Mushanhe Video Engine — 风格包 01 · 3D 工业实体画廊 · 多版式布局变体（Layout Variants）
 * ---------------------------------------------------------------------------
 * 为 4 个高频句型提供第二套截然不同的工业 3D 版式。剧本场景写 `"variant": "..."` 时，宿主优先查：
 *   Industrial3DVariants[scene.type + ':' + scene.variant]  →  Industrial3DTechPack[scene.type]  →  Industrial3D.COMPONENTS[scene.type]
 *
 *   'cover:blueprint'  工程蓝图全景封面：图框 + 居中放大 3D 金属立方体 + 精密尺寸标线 + 左上超大标题 + 底部宽幅金属规格铭牌
 *   'stat:gauge'       机械仪表盘大数字：2 个 SVG 圆形刻度表盘（旋转指针 + 橙色扇形进度弧 + 居中大数字）+ 底部 delta 橙吊牌
 *   'steps:conveyor'   流水线阶梯步骤：微倾斜工业传送带，步骤模块从进料舱依次滑入工位并逐个点亮青色指示灯
 *   'compare:split'    上下双轨对比：上深灰金属「错误做法」横轨（橙红警示条 + 斜删线）/ 中 VS 滑块 / 下磨砂玻璃「推荐做法」横轨（青色高亮 + 打勾徽章）
 *
 * 接口与 components.js 完全一致：create(data, ctx) → { el, layer, avatar, cams, update(localT), w? }
 * data 字段是对应原句型字段的超集（未加载本文件时，宿主回退原组件仍能正常渲染同一份剧本）。
 * 全部动画只由 localT 决定（Animator + 纯函数），任意 seek(t) 精确还原；局部安全区 x 60–1340 / y 100–980。
 * 依赖：先加载 components.js（复用其 Animator / EASE / PROPS / 基础材质 CSS），颜色全部走 --id-* 变量，可被 themes.js 换肤。
 */
(function (global) {
  'use strict';

  const I3 = global.Industrial3D;
  if (!I3) { console.error('[Industrial3DVariants] 需要先加载 components.js'); return; }
  const { Animator, EASE, PROPS } = I3;

  // ============================== 工具（与 components.js 同构） ==============================
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mark = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>');
  const oneLine = (s) => String(s == null ? '' : s).replace(/\s*\n\s*/g, ' ');
  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }
  function screws(el, inset = 14) {
    [[inset, inset], [null, inset], [inset, null], [null, null]].forEach(([l, tp]) => {
      el.appendChild(h('i', 'id-screw', `${l != null ? `left:${l}px;` : `right:${inset}px;`}${tp != null ? `top:${tp}px;` : `bottom:${inset}px;`}`));
    });
    return el;
  }
  const depth = (z, ...els) => { const w = h('div', 'id-z', `transform:translateZ(${z}px);`); w.append(...els); return w; };
  const floorShadow = (style) => h('div', 'id-fshadow', style);
  const reg = (style) => h('div', 'id-reg', style, PROPS.reg());
  const prop = (name, arg, style) => h('div', 'id-prop', style, PROPS[name](arg));
  const tag = (text, small, style, teal) => h('div', `id-tag${teal ? ' teal' : ''}`, style, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`);
  const dim = (label, style) => h('div', 'id-dim', style, `<div class="dl"></div><div class="dt">${esc(label)}</div>`);
  const fadeShadows = (el, A, at) => el.querySelectorAll('.id-fshadow').forEach((sh) => A.add(sh, at, 0.5, { o: 0, sx: 0.6 }, { o: 1, sx: 1 }));
  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  /** 文本近似宽度（CJK 1em / 其他 0.6em），用于不依赖布局测量的确定性几何 */
  const textW = (s, fs) => Array.from(String(s || '')).reduce((a, c) => a + (/[⺀-￿]/.test(c) ? 1 : 0.6), 0) * fs;
  const decOf = (v) => { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; };
  const fmtNum = (v, dec) => Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function niceCeil(v) {
    if (!(v > 0)) return 100;
    const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    const k = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => x >= m - 1e-9);
    return k * p;
  }
  /** 一次性 stroke 绘制进度（stroke-dasharray 已设为 len） */
  const drawPath = (el, len, p) => el.setAttribute('stroke-dashoffset', (len * (1 - p)).toFixed(1));

  let SEQ = 0;

  // ============================== 变体专属样式（全部走 --id-* 变量） ==============================
  const STEEL_BG = 'repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 1px,transparent 1px 3px),linear-gradient(165deg,#454B54 0%,var(--id-steel) 40%,#1D2025 100%)';
  const CSS = `
  /* ---------- cover:blueprint ---------- */
  .v3-bp-sheet{position:absolute;left:40px;top:96px;width:1310px;height:866px;border-radius:4px;
    background-image:linear-gradient(90deg,rgba(0,194,168,.14) 1px,transparent 1px),linear-gradient(rgba(0,194,168,.14) 1px,transparent 1px),
      linear-gradient(90deg,rgba(0,194,168,.06) 1px,transparent 1px),linear-gradient(rgba(0,194,168,.06) 1px,transparent 1px);
    background-size:200px 200px,200px 200px,40px 40px,40px 40px;background-position:-1px -1px}
  .v3-bp-svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
  .v3-bp-title{position:absolute;left:92px;top:176px;font-size:136px;font-weight:900;letter-spacing:-.035em;line-height:1.0;white-space:nowrap;color:var(--id-ink)}
  .v3-bp-title span{display:inline-block;text-shadow:0 2px 0 rgba(255,255,255,.9),0 14px 24px rgba(20,26,34,.14)}
  .v3-bp-cube .id-face b{font-size:104px}
  .v3-bp-cube .id-face span{font-size:16px}
  .v3-bp-call{position:absolute;font-family:var(--id-font-mono);font-size:17px;font-weight:800;letter-spacing:.12em;white-space:nowrap;color:var(--id-ink);
    padding:5px 12px;border-radius:4px;background:var(--id-pearl);border:1.5px solid var(--id-teal)}
  .v3-bp-call b{color:var(--id-orange);margin-right:8px}
  .v3-bp-plate{position:absolute;left:60px;top:772px;width:1280px;height:168px;overflow:hidden}
  .v3-bp-plate .hz{position:absolute;left:0;right:0;top:0;height:8px;background:repeating-linear-gradient(-45deg,var(--id-orange) 0 14px,#1D2025 14px 28px)}
  .v3-bp-plate .ch{position:absolute;left:34px;top:26px;width:260px;height:120px}
  .v3-bp-plate .ch .l{font-family:var(--id-font-mono);font-size:18px;font-weight:800;letter-spacing:.24em;color:var(--id-teal)}
  .v3-bp-plate .ch .n{font-family:var(--id-font-latin);font-size:104px;font-weight:900;letter-spacing:-.06em;line-height:.95;color:var(--id-orange)}
  .v3-bp-plate .sep{position:absolute;left:270px;top:30px;bottom:24px;width:2px;background:rgba(255,255,255,.14)}
  .v3-bp-plate .grid{position:absolute;left:306px;top:30px;right:236px;display:flex;gap:0}
  .v3-bp-plate .cell{flex:0 1 auto;padding:0 26px;border-left:1.5px solid rgba(255,255,255,.12);white-space:nowrap;overflow:hidden}
  .v3-bp-plate .cell:first-child{border-left:none;padding-left:0}
  .v3-bp-plate .cell .k{font-family:var(--id-font-mono);font-size:15px;font-weight:800;letter-spacing:.16em;color:#9EA5AE}
  .v3-bp-plate .cell .v{font-size:30px;font-weight:900;color:#EEF1F4;margin-top:8px}
  .v3-bp-plate .serial{position:absolute;left:306px;right:250px;bottom:22px;height:22px;opacity:.55;
    background:repeating-linear-gradient(90deg,#C9CED5 0 2px,transparent 2px 5px,#C9CED5 5px 6px,transparent 6px 11px,#C9CED5 11px 14px,transparent 14px 17px)}
  .v3-bp-sub{position:absolute;left:84px;top:474px;padding:20px 32px 22px;font-size:42px;font-weight:900;line-height:1.26;white-space:nowrap}
  .v3-bp-sub em{font-style:normal;color:var(--id-orange)}
  /* ---------- stat:gauge ---------- */
  .v3-gg{position:absolute;top:262px;width:610px;height:520px;overflow:hidden}
  .v3-gg .lb{position:absolute;left:32px;top:26px;font-family:var(--id-font-mono);font-size:20px;font-weight:800;letter-spacing:.12em;color:var(--id-grey);white-space:nowrap}
  .v3-gg.hot .lb{color:#C9CED5}
  .v3-gg .lb::before{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--id-teal);box-shadow:0 0 8px var(--id-teal);margin-right:12px;vertical-align:2px}
  .v3-gg svg.dial{position:absolute;left:105px;top:64px;overflow:visible}
  .v3-gg .num{position:absolute;left:0;right:0;top:330px;text-align:center;font-family:var(--id-font-latin);font-weight:900;letter-spacing:-.05em;line-height:1;white-space:nowrap;color:var(--id-ink)}
  .v3-gg.hot .num{color:var(--id-orange)}
  .v3-gg .num .u{font-family:var(--id-font-cn);font-size:.26em;letter-spacing:0;margin-left:.12em;vertical-align:.12em;color:var(--id-grey)}
  .v3-gg.hot .num .u{color:#EEF1F4}
  .v3-gg .num .pf{font-family:var(--id-font-cn);font-size:.3em;letter-spacing:0;margin-right:.08em;vertical-align:.12em}
  .v3-gg .rd{position:absolute;left:32px;right:32px;bottom:20px;display:flex;justify-content:space-between;font-family:var(--id-font-mono);font-size:15px;font-weight:800;letter-spacing:.12em;color:var(--id-grey);white-space:nowrap}
  .v3-gg.hot .rd{color:#9EA5AE}
  .v3-gg .rd b{color:var(--id-orange)}
  .v3-hang{position:absolute;width:0;height:0;transform-origin:0 0}
  .v3-hang .str{position:absolute;left:-1.5px;top:0;width:3px;height:44px;background:repeating-linear-gradient(180deg,#9EA5AE 0 5px,#5C636D 5px 8px);border-radius:2px}
  .v3-hang .ring{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;box-sizing:border-box;border:4px solid #8A929C;background:transparent}
  /* ---------- steps:conveyor ---------- */
  .v3-cv{position:absolute;left:60px;top:352px;width:1280px;height:470px;transform-origin:0 100%;transform:rotate(-2deg);transform-style:preserve-3d}
  .v3-cv .clip{position:absolute;left:0;top:-30px;width:1280px;height:312px;overflow:hidden}
  .v3-cv .mod{position:absolute;top:88px;height:224px;box-sizing:border-box;border-radius:10px 10px 4px 4px;overflow:hidden}
  .v3-cv .mod .hd{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 18px;background:${STEEL_BG};color:#DDE1E6;font-family:var(--id-font-mono);font-size:16px;font-weight:800;letter-spacing:.14em;white-space:nowrap}
  .v3-cv .mod .led{width:16px;height:16px;border-radius:50%;background:#4A5059;box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
  .v3-cv .mod.on .led{background:var(--id-teal);box-shadow:0 0 0 3px rgba(0,194,168,.25),0 0 16px var(--id-teal)}
  .v3-cv .mod .no{position:absolute;left:18px;top:60px;padding:3px 10px;border-radius:4px;background:var(--id-orange);color:#fff;font-family:var(--id-font-mono);font-size:17px;font-weight:900}
  .v3-cv .mod .nm{position:absolute;left:18px;top:96px;font-size:46px;font-weight:900;line-height:1.08;white-space:nowrap;color:var(--id-ink)}
  .v3-cv .mod .fn{position:absolute;left:18px;top:160px;font-family:var(--id-font-mono);font-size:16px;font-weight:700;color:var(--id-grey);white-space:nowrap}
  .v3-cv .mod .ok{position:absolute;right:14px;bottom:12px;font-family:var(--id-font-mono);font-size:14px;font-weight:900;letter-spacing:.14em;color:var(--id-teal);opacity:0}
  .v3-cv .mod.on .ok{opacity:1}
  .v3-cv .gate{position:absolute;top:-10px;height:292px;width:10px;border-radius:5px;background:linear-gradient(180deg,rgba(0,194,168,0),var(--id-teal) 40%,rgba(0,194,168,0));box-shadow:0 0 24px var(--id-teal);opacity:0}
  .v3-cv .belt{position:absolute;left:-6px;top:282px;width:1292px;height:34px;border-radius:17px;box-shadow:inset 0 2px 0 rgba(255,255,255,.12),inset 0 -3px 0 rgba(0,0,0,.45),0 6px 10px -4px rgba(0,0,0,.5);
    background:repeating-linear-gradient(90deg,#3A3F47 0 7px,#1A1D21 7px 28px)}
  .v3-cv .roll{position:absolute;top:282px;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 32%,#F4F6F8 0%,#AEB5BE 40%,#5C636D 100%);box-shadow:0 2px 4px rgba(0,0,0,.45)}
  .v3-cv .roll i{position:absolute;left:15px;top:3px;width:4px;height:28px;border-radius:2px;background:#3A3F47}
  .v3-cv .frame{position:absolute;left:0;top:316px;width:1280px;height:58px;border-radius:0 0 8px 8px}
  .v3-cv .plate{position:absolute;left:130px;top:388px;padding:6px 16px;border-radius:4px;background:#1D2025;border:1px solid rgba(255,255,255,.14);box-shadow:0 8px 14px -6px rgba(0,0,0,.5);font-family:var(--id-font-mono);font-size:16px;font-weight:800;letter-spacing:.12em;color:#C9CED5;white-space:nowrap}
  .v3-cv .lamp{position:absolute;top:337px;width:42px;height:16px;border-radius:8px;background:#3A3F47;box-shadow:inset 0 1px 3px rgba(0,0,0,.6);z-index:2}
  .v3-cv .lamp.on{background:var(--id-teal);box-shadow:0 0 14px var(--id-teal)}
  .v3-cv .stn{position:absolute;top:342px;font-family:var(--id-font-mono);font-size:13px;font-weight:900;letter-spacing:.14em;color:#9EA5AE;white-space:nowrap;z-index:2}
  .v3-cv .leg{position:absolute;top:374px;width:28px;height:84px;background:${STEEL_BG};box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
  .v3-cv .foot{position:absolute;top:452px;width:84px;height:14px;border-radius:4px;background:#1D2025}
  .v3-cv .hatch{position:absolute;left:1142px;top:-36px;width:150px;height:356px;border-radius:10px 10px 4px 4px;z-index:5}
  .v3-cv .hatch .hz{position:absolute;left:0;top:0;bottom:0;width:16px;border-radius:10px 0 0 4px;background:repeating-linear-gradient(-45deg,var(--id-orange) 0 12px,#1D2025 12px 24px)}
  .v3-cv .hatch .slot{position:absolute;left:16px;bottom:32px;width:28px;height:238px;background:linear-gradient(90deg,#08090B,#1D2025);box-shadow:inset -6px 0 10px rgba(0,0,0,.7)}
  .v3-cv .hatch .vt{position:absolute;left:62px;top:56px;writing-mode:vertical-rl;font-family:var(--id-font-mono);font-size:18px;font-weight:900;letter-spacing:.3em;color:#C9CED5}
  .v3-cv .hatch .led2{position:absolute;left:96px;top:26px;width:14px;height:14px;border-radius:50%;background:var(--id-orange);box-shadow:0 0 12px var(--id-orange)}
  .v3-cv .stop{position:absolute;left:-14px;top:244px;width:16px;height:52px;border-radius:4px;background:linear-gradient(170deg,#FF7A47,var(--id-orange) 55%,#DE4511);box-shadow:0 4px 0 -1px #9E2F08}
  /* ---------- compare:split ---------- */
  .v3-sp{position:absolute;left:60px;width:1280px;height:210px;overflow:hidden}
  .v3-sp .warn{position:absolute;left:0;top:0;bottom:0;width:30px;background:repeating-linear-gradient(-45deg,var(--id-orange) 0 14px,#1D2025 14px 28px)}
  .v3-sp.right .warn{background:var(--id-teal);box-shadow:0 0 26px var(--id-teal)}
  .v3-sp .lb{position:absolute;left:66px;top:24px;font-family:var(--id-font-mono);font-size:19px;font-weight:800;letter-spacing:.16em;white-space:nowrap}
  .v3-sp.wrong .lb{color:#FF8A5C}
  .v3-sp.right .lb{color:#00796A}
  .v3-sp .t{position:absolute;left:64px;top:56px;font-size:58px;font-weight:900;line-height:1.1;white-space:nowrap}
  .v3-sp.wrong .t{color:#EEF1F4}
  .v3-sp.right .t{color:var(--id-ink)}
  .v3-sp .d{position:absolute;left:66px;top:136px;width:700px;font-size:23px;font-weight:700;line-height:1.42;white-space:normal}
  .v3-sp.wrong .d{color:#9EA5AE}
  .v3-sp.right .d{color:var(--id-grey)}
  .v3-sp .big{position:absolute;right:300px;top:38px;font-family:var(--id-font-latin);font-size:130px;font-weight:900;letter-spacing:-.05em;line-height:1;color:transparent;white-space:nowrap}
  .v3-sp.wrong .big{right:330px;-webkit-text-stroke:3px rgba(255,90,31,.75)}
  .v3-sp.right .big{-webkit-text-stroke:3px rgba(0,194,168,.8)}
  .v3-sp svg.strike{position:absolute;left:0;top:0;overflow:visible}
  .v3-sp .sheen{position:absolute;top:-20px;bottom:-20px;width:240px;background:linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.75) 45%,rgba(0,194,168,.22) 55%,rgba(255,255,255,0) 100%);pointer-events:none}
  .v3-sp .badge{position:absolute;right:90px;top:46px;width:118px;height:118px;border-radius:50%;background:linear-gradient(165deg,#25D9BF,var(--id-teal) 55%,#00A28C);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 0 -1px #006F60,0 0 30px rgba(0,194,168,.45);display:flex;align-items:center;justify-content:center}
  .v3-vs-track{position:absolute;left:60px;top:513px;width:1280px;height:14px;border-radius:7px;transform-origin:left center;
    background:linear-gradient(180deg,#1D2025,#3A3F47);box-shadow:inset 0 2px 3px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.6)}
  .v3-vs-ticks{position:absolute;left:60px;top:533px;width:1280px;height:10px;background:repeating-linear-gradient(90deg,rgba(20,26,34,.35) 0 2px,transparent 2px 40px)}
  .v3-vs-knob{position:absolute;left:555px;top:478px;width:170px;height:84px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:10px;
    font-family:var(--id-font-latin);font-size:46px;font-weight:900;letter-spacing:-.03em;color:#fff;background:${STEEL_BG};
    box-shadow:inset 0 0 0 5px rgba(255,90,31,.92),inset 0 1px 0 rgba(255,255,255,.25),0 8px 0 -1px #101215,0 24px 34px -12px rgba(14,18,24,.55)}
  .v3-vs-knob i{font-style:normal;font-size:18px;color:var(--id-teal)}
  .v3-vs-knob i:first-child{color:var(--id-orange)}
  .v3-sp-verdict{position:absolute;left:60px;top:812px;width:1280px;height:100px;border-radius:999px;display:flex;align-items:center;gap:26px;padding:0 48px;box-sizing:border-box;color:#fff;background:${STEEL_BG};
    box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 10px 0 -1px #101215,0 40px 58px -18px rgba(14,18,24,.55)}
  .v3-sp-verdict b{font-family:var(--id-font-mono);font-size:20px;letter-spacing:.2em;color:var(--id-teal);white-space:nowrap}
  .v3-sp-verdict span{font-size:42px;font-weight:900;white-space:nowrap}
  .v3-sp-verdict em{font-style:normal;color:var(--id-orange)}
  `;
  function injectCSS() {
    if (I3.injectCSS) I3.injectCSS();
    if (document.getElementById('id-variants-css')) return;
    const st = document.createElement('style'); st.id = 'id-variants-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  /** 真 CSS 3D 拉丝金属立方体（复用 components.js 的 .id-cube / .id-face 材质） */
  function cube(S, label) {
    const wrap = h('div', 'id-cube-wrap v3-bp-cube', `width:${S}px;height:${S}px;`);
    const c = h('div', 'id-cube', `width:${S}px;height:${S}px;`);
    const L = label || {};
    [
      ['steel', `translateZ(${S / 2}px)`, `<b>${esc(L.front || 'MH')}</b><span>${esc(L.frontSmall || 'ENGINE · 01')}</span>`],
      ['steel', `rotateY(180deg) translateZ(${S / 2}px)`, ''],
      ['orange', `rotateY(90deg) translateZ(${S / 2}px)`, `<b>${esc(L.side || '3D')}</b>`],
      ['steel', `rotateY(-90deg) translateZ(${S / 2}px)`, `<span>${esc(L.back || 'INDUSTRIAL')}</span>`],
      ['pearl', `rotateX(90deg) translateZ(${S / 2}px)`, ''],
      ['steel', `rotateX(-90deg) translateZ(${S / 2}px)`, '']
    ].forEach(([k, tf, inner]) => c.appendChild(h('div', `id-face ${k}`, `transform:${tf};`, inner)));
    wrap.appendChild(c);
    return { el: wrap, set: (rx, ry, s, y) => { c.style.transform = `translateY(${(y || 0).toFixed(1)}px) scale(${s.toFixed(3)}) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; } };
  }

  // ============================== 1. cover:blueprint 工程蓝图全景封面 ==============================
  function coverBlueprint(data, ctx) {
    injectCSS();
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'id-zone');
    const CX = 900, CY = 470, S = 270;

    // 图框 SVG（后层）：外框 + 内框 + 边缘刻度 + 分区字母
    const SX0 = 40, SY0 = 96, SW = 1310, SH = 866, IN = 22;
    let ticks = '', zones = '';
    for (let x = SX0 + IN + 40; x < SX0 + SW - IN; x += 40) {
      const big = (x - SX0 - IN) % 200 === 0;
      ticks += `<line x1="${x}" y1="${SY0 + IN}" x2="${x}" y2="${SY0 + IN + (big ? 14 : 7)}"/>`;
    }
    for (let y = SY0 + IN + 40; y < SY0 + SH - IN; y += 40) {
      const big = (y - SY0 - IN) % 200 === 0;
      ticks += `<line x1="${SX0 + IN}" y1="${y}" x2="${SX0 + IN + (big ? 14 : 7)}" y2="${y}"/>`;
    }
    'ABCDEF'.split('').forEach((ch, i) => { zones += `<text x="${SX0 + IN + 100 + i * 200}" y="${SY0 + 16}" text-anchor="middle">${ch}</text>`; });
    [1, 2, 3, 4].forEach((n, i) => { zones += `<text x="${SX0 + 11}" y="${SY0 + IN + 104 + i * 200}" text-anchor="middle">${n}</text>`; });
    const frameLen = 2 * (SW + SH), innerLen = 2 * (SW - 2 * IN + SH - 2 * IN);
    const back = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    back.setAttribute('class', 'v3-bp-svg'); back.setAttribute('width', '1400'); back.setAttribute('height', '1100');
    back.innerHTML = `<rect class="fr" x="${SX0}" y="${SY0}" width="${SW}" height="${SH}" rx="4" fill="none" stroke="var(--id-steel)" stroke-width="2.5" stroke-dasharray="${frameLen}" stroke-dashoffset="${frameLen}"/>`
      + `<rect class="fi" x="${SX0 + IN}" y="${SY0 + IN}" width="${SW - 2 * IN}" height="${SH - 2 * IN}" fill="none" stroke="var(--id-teal)" stroke-width="1.5" opacity=".8" stroke-dasharray="${innerLen}" stroke-dashoffset="${innerLen}"/>`
      + `<g class="tk" stroke="var(--id-teal)" stroke-width="1.4" opacity="0">${ticks}</g>`
      + `<g class="zn" fill="var(--id-grey)" font-family="Consolas, monospace" font-size="13" font-weight="800" opacity="0">${zones}</g>`;
    const sheet = h('div', 'v3-bp-sheet');

    // 尺寸标线 SVG（中层）：中心线（点划线）+ 水平/竖直尺寸 + 剖面符号 + 引出线
    const hx0 = CX - 200, hx1 = CX + 200, hy = 248;        // 水平尺寸
    const vx = 1178, vy0 = CY - 190, vy1 = CY + 190;      // 竖直尺寸
    const arrow = (x, y, ang) => { const a = (ang * Math.PI) / 180, l = 16, w = 6; const bx = x - l * Math.cos(a), by = y - l * Math.sin(a); return `<path d="M${x} ${y} L${(bx - w * Math.sin(a)).toFixed(1)} ${(by + w * Math.cos(a)).toFixed(1)} L${(bx + w * Math.sin(a)).toFixed(1)} ${(by - w * Math.cos(a)).toFixed(1)} Z"/>`; };
    const callouts = (data.callouts || ['MATERIAL · 拉丝钢 6061', 'SCALE 1 : 1']).slice(0, 2);
    const cl = [
      { p0: [CX - 96, CY + 150], p1: [700, 716], p2: [640, 716] },
      { p0: [CX + 110, CY + 140], p1: [1000, 700], p2: [1040, 700] }
    ];
    const len2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const mid = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mid.setAttribute('class', 'v3-bp-svg'); mid.setAttribute('width', '1400'); mid.setAttribute('height', '1100');
    let mi = '';
    mi += `<g stroke="var(--id-steel)" stroke-width="1.5" stroke-dasharray="26 6 4 6" opacity=".55" fill="none"><line class="c1" x1="${CX - 250}" y1="${CY}" x2="${CX + 250}" y2="${CY}"/><line class="c2" x1="${CX}" y1="${CY - 250}" x2="${CX}" y2="${CY + 250}"/></g>`;
    mi += `<g class="dh" stroke="var(--id-teal)" stroke-width="2" fill="var(--id-teal)"><line x1="${hx0}" y1="${hy - 18}" x2="${hx0}" y2="${CY - 150}" stroke-width="1.2" opacity=".7"/><line x1="${hx1}" y1="${hy - 18}" x2="${hx1}" y2="${CY - 150}" stroke-width="1.2" opacity=".7"/>`
      + `<line class="dhl" x1="${hx0}" y1="${hy}" x2="${hx1}" y2="${hy}" stroke-dasharray="${hx1 - hx0}" stroke-dashoffset="${hx1 - hx0}"/><g class="dha" opacity="0" stroke="none">${arrow(hx0, hy, 180)}${arrow(hx1, hy, 0)}</g></g>`;
    mi += `<g class="dv" stroke="var(--id-teal)" stroke-width="2" fill="var(--id-teal)"><line x1="${CX + 160}" y1="${vy0}" x2="${vx + 18}" y2="${vy0}" stroke-width="1.2" opacity=".7"/><line x1="${CX + 160}" y1="${vy1}" x2="${vx + 18}" y2="${vy1}" stroke-width="1.2" opacity=".7"/>`
      + `<line class="dvl" x1="${vx}" y1="${vy0}" x2="${vx}" y2="${vy1}" stroke-dasharray="${vy1 - vy0}" stroke-dashoffset="${vy1 - vy0}"/><g class="dva" opacity="0" stroke="none">${arrow(vx, vy0, -90)}${arrow(vx, vy1, 90)}</g>`
      + `<g class="dvt" opacity="0"><rect x="${vx - 20}" y="${CY - 66}" width="40" height="132" rx="20" fill="var(--id-pearl)" stroke="var(--id-teal)" stroke-width="2"/><text x="${vx}" y="${CY}" transform="rotate(-90 ${vx} ${CY})" text-anchor="middle" dominant-baseline="central" fill="#00796A" stroke="none" font-family="Consolas, monospace" font-size="18" font-weight="900" letter-spacing="1.5">${esc(data.dimV || 'H 270')}</text></g></g>`;
    cl.forEach((c, i) => {
      if (!callouts[i]) return;
      const L = len2(c.p0, c.p1) + len2(c.p1, c.p2);
      mi += `<g class="co" data-i="${i}"><circle cx="${c.p0[0]}" cy="${c.p0[1]}" r="6" fill="var(--id-orange)" opacity="0" class="cod"/><path class="col" d="M${c.p0[0]} ${c.p0[1]} L${c.p1[0]} ${c.p1[1]} L${c.p2[0]} ${c.p2[1]}" fill="none" stroke="var(--id-orange)" stroke-width="2" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${L.toFixed(1)}" data-len="${L.toFixed(1)}"/></g>`;
    });
    // 剖面符号 A—A（右上）
    mi += `<g class="sec" opacity="0"><circle cx="1240" cy="190" r="30" fill="var(--id-pearl)" stroke="var(--id-steel)" stroke-width="2.5"/><line x1="1210" y1="190" x2="1270" y2="190" stroke="var(--id-steel)" stroke-width="2"/><text x="1240" y="181" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="var(--id-orange)">A</text><text x="1240" y="210" text-anchor="middle" font-family="Consolas, monospace" font-size="13" font-weight="800" fill="var(--id-grey)">${esc(data.chapter || '01')}</text></g>`;
    mid.innerHTML = mi;
    const dimTxt = h('div', 'id-dim', `left:${hx0}px;top:${hy - 14}px;width:${hx1 - hx0}px;`, `<div class="dt">${esc(data.dim || 'W 270')}</div>`);
    const calloutEls = callouts.map((tx, i) => {
      const c = cl[i];
      const right = c.p2[0] > c.p1[0];
      const e = h('div', 'id-abs', `left:${right ? c.p2[0] + 6 : c.p2[0] - 6}px;top:${c.p2[1] - 17}px;width:0;height:0;`);
      e.appendChild(h('div', 'v3-bp-call', `left:0;top:0;${right ? '' : 'transform:translateX(-100%);'}`, `<b>${String(i + 1).padStart(2, '0')}</b>${esc(tx)}`));
      return e;
    });

    // 标题（左上超大）+ kicker + 副标题玻璃条
    const kick = h('div', 'id-kicker', 'left:84px;top:134px;', esc(data.kicker));
    const title = h('div', 'v3-bp-title');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const nLines = String(data.title || '').split('\n').length;
    const sub = data.subtitle ? h('div', 'id-glass v3-bp-sub', `top:${Math.max(474, 176 + nLines * 136 + 26)}px;`, mark(data.subtitle)) : null;

    // 立方体 + 落地影
    const cb = cube(S, data.cube);
    cb.el.style.left = `${CX - S / 2}px`; cb.el.style.top = `${CY - S / 2}px`;

    // 底部宽幅金属规格铭牌
    const ch = data.chapter || '01';
    const specs = (data.specs && data.specs.length ? data.specs : [
      { k: 'DWG NO.', v: `MH-${ch}` }, { k: 'SCALE', v: '1 : 1' }, { k: 'REV', v: 'A' }, { k: 'SHEET', v: `${ch} / ${data.sheets || ch}` }
    ]).slice(0, 4);
    const plate = screws(h('div', 'id-steel v3-bp-plate', null,
      `<div class="hz"></div><div class="ch"><div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="n">${esc(ch)}</div></div><div class="sep"></div>`
      + `<div class="grid">${specs.map((s) => `<div class="cell"><div class="k">${esc(s.k)}</div><div class="v">${esc(s.v)}</div></div>`).join('')}</div><div class="serial"></div>`), 12);
    const cells = Array.from(plate.querySelectorAll('.cell'));
    const st = data.stamp ? tag(data.stamp, data.stampSmall || '', 'left:1110px;top:742px;font-size:50px;') : null;

    el.append(
      depth(-40, sheet, back, floorShadow(`left:${CX - 210}px;top:${CY + 196}px;width:420px;height:70px;`)),
      depth(0, mid, dimTxt, kick, title, ...(sub ? [sub] : []), plate, ...calloutEls),
      depth(34, cb.el, ...(st ? [st] : []))
    );

    // ---- 时间轴 ----
    const fr = back.querySelector('.fr'), fi = back.querySelector('.fi'), tk = back.querySelector('.tk'), zn = back.querySelector('.zn');
    const c1 = mid.querySelector('.c1'), c2 = mid.querySelector('.c2');
    const dhl = mid.querySelector('.dhl'), dha = mid.querySelector('.dha'), dvl = mid.querySelector('.dvl'), dva = mid.querySelector('.dva'), dvt = mid.querySelector('.dvt'), sec = mid.querySelector('.sec');
    const cos = Array.from(mid.querySelectorAll('.co'));
    A.add(sheet, 0, 0.6, { o: 0 }, { o: 1 });
    A.add(kick, 0.15, 0.35, { x: -30, o: 0 }, { x: 0, o: 1 });
    chars.forEach((c, i) => A.add(c, 0.3 + i * 0.06, 0.42, { y: -90, o: 0 }, { y: 0, o: 1 }, 'back'));
    const tB = 0.5 + chars.length * 0.06;
    if (sub) A.add(sub, tB + 0.2, 0.4, { x: 40, o: 0 }, { x: 0, o: 1 });
    A.add(plate, 0.9, 0.5, { y: 160, o: 0 }, { y: 0, o: 1 }, 'drop');
    cells.forEach((c, i) => A.add(c, 1.3 + i * 0.14, 0.3, { y: 16, o: 0 }, { y: 0, o: 1 }));
    A.add(dimTxt.querySelector('.dt'), 1.75, 0.25, { o: 0, s: 0.8 }, { o: 1, s: 1 }, 'back');
    calloutEls.forEach((e, i) => A.add(e, 2.2 + i * 0.3, 0.3, { o: 0, x: i ? 20 : -20 }, { o: 1, x: 0 }));
    if (st) A.add(st, Math.min(D - 1.2, tB + 1.8), 0.18, { s: 1.4, o: 0, r: -8 }, { s: 1, o: 1, r: -5 }, 'back');
    A.fn((t) => {
      drawPath(fr, frameLen, EASE.inOut(clamp01((t - 0.05) / 0.9)));
      drawPath(fi, innerLen, EASE.inOut(clamp01((t - 0.2) / 0.9)));
      tk.setAttribute('opacity', (0.9 * clamp01((t - 0.8) / 0.4)).toFixed(2));
      zn.setAttribute('opacity', clamp01((t - 0.9) / 0.4).toFixed(2));
      const cp = EASE.out(clamp01((t - 0.9) / 0.6));
      [c1, c2].forEach((l) => { l.style.opacity = cp.toFixed(2); });
      drawPath(dhl, hx1 - hx0, EASE.inOut(clamp01((t - 1.25) / 0.5)));
      dha.setAttribute('opacity', clamp01((t - 1.6) / 0.15).toFixed(2));
      drawPath(dvl, vy1 - vy0, EASE.inOut(clamp01((t - 1.45) / 0.5)));
      dva.setAttribute('opacity', clamp01((t - 1.8) / 0.15).toFixed(2));
      dvt.setAttribute('opacity', clamp01((t - 1.9) / 0.25).toFixed(2));
      sec.setAttribute('opacity', clamp01((t - 2.0) / 0.3).toFixed(2));
      cos.forEach((g, i) => {
        const at = 1.9 + i * 0.3;
        g.querySelector('.cod').setAttribute('opacity', clamp01((t - at) / 0.1).toFixed(2));
        const pth = g.querySelector('.col'); drawPath(pth, +pth.dataset.len, EASE.out(clamp01((t - at) / 0.35)));
      });
      const e = EASE.back(clamp01((t - 0.45) / 0.75));
      cb.set(-22 + Math.sin(t * 0.7) * 3, 32 + t * 22, Math.max(0.001, e), -200 * (1 - EASE.out(clamp01((t - 0.45) / 0.7))) + Math.sin(t * 1.3) * 6);
    });
    fadeShadows(el, A, 0.5);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 880, 470, 1.32, 2, -4, -0.4), CAM(1.9, 700, 505, 1.0, 1, -2, 0), CAM(D, 705, 505, 1.03, 0.5, 1, 0)] };
  }

  // ============================== 2. stat:gauge 机械仪表盘大数字 ==============================
  const G = 400, GC = 200, GR = 168, A0 = -120, A1 = 120;
  const polar = (r, deg) => { const a = (deg * Math.PI) / 180; return [GC + r * Math.sin(a), GC - r * Math.cos(a)]; };
  function dialSVG(max, hot, gid) {
    const p0 = polar(GR, A0), p1 = polar(GR, A1);
    const arcLen = (GR * (A1 - A0) * Math.PI) / 180;
    let ticks = '', nums = '', red = '';
    const N = 50;
    for (let i = 0; i <= N; i++) {
      const a = A0 + ((A1 - A0) * i) / N, major = i % 10 === 0, half = i % 5 === 0;
      const [x0, y0] = polar(major ? 124 : half ? 134 : 140, a), [x1, y1] = polar(150, a);
      const isRed = i >= N * 0.85;
      ticks += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${isRed ? 'var(--id-orange)' : hot ? '#C9CED5' : 'var(--id-steel)'}" stroke-width="${major ? 4 : half ? 2.6 : 1.6}"/>`;
      if (major && i > 0 && i < N) {
        const [tx, ty] = polar(104, a), v = (max * i) / N;
        nums += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}">${fmtNum(v, v % 1 ? 1 : 0)}</text>`;
      }
    }
    const r0 = polar(156, A0 + (A1 - A0) * 0.85), r1 = polar(156, A1);
    red = `<path d="M${r0[0].toFixed(1)} ${r0[1].toFixed(1)} A156 156 0 0 1 ${r1[0].toFixed(1)} ${r1[1].toFixed(1)}" stroke="var(--id-orange)" stroke-width="6" fill="none" opacity=".55"/>`;
    const face = hot ? `<circle cx="${GC}" cy="${GC}" r="${GR + 22}" fill="url(#${gid}f)"/>` : `<circle cx="${GC}" cy="${GC}" r="${GR + 22}" fill="url(#${gid}f)"/>`;
    return `<svg class="dial" width="${G}" height="${G}" viewBox="0 0 ${G} ${G}"><defs>
      <radialGradient id="${gid}f" cx=".5" cy=".42" r=".62">${hot
        ? '<stop offset="0" stop-color="#3A3F47"/><stop offset=".8" stop-color="#1D2025"/><stop offset="1" stop-color="#121417"/>'
        : '<stop offset="0" stop-color="#FFFFFF"/><stop offset=".78" stop-color="#EEF1F4"/><stop offset="1" stop-color="#D3D8DE"/>'}</radialGradient>
      <linearGradient id="${gid}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1F3F5"/><stop offset=".5" stop-color="#9EA5AE"/><stop offset="1" stop-color="#5C636D"/></linearGradient>
      <linearGradient id="${gid}n" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DE4511"/><stop offset=".5" stop-color="#FF7A47"/><stop offset="1" stop-color="#DE4511"/></linearGradient></defs>
      <circle cx="${GC}" cy="${GC}" r="${GR + 30}" fill="url(#${gid}b)"/>${face}
      <path d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${GR} ${GR} 0 1 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" stroke="${hot ? 'rgba(255,255,255,.1)' : 'rgba(20,26,34,.09)'}" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path class="arc" d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${GR} ${GR} 0 1 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" stroke="var(--id-orange)" stroke-width="20" fill="none" stroke-linecap="round" stroke-dasharray="${arcLen.toFixed(1)}" stroke-dashoffset="${arcLen.toFixed(1)}" style="filter:drop-shadow(0 0 6px rgba(255,90,31,.55))"/>
      ${red}<g>${ticks}</g>
      <g fill="${hot ? '#C9CED5' : 'var(--id-grey)'}" font-family="Consolas, monospace" font-size="17" font-weight="800" text-anchor="middle" dominant-baseline="central">${nums}</g>
      <g class="ndl"><path d="M${GC - 7} ${GC + 30} L${GC - 2.5} ${GC - 146} L${GC + 2.5} ${GC - 146} L${GC + 7} ${GC + 30} Z" fill="url(#${gid}n)" style="filter:drop-shadow(0 4px 4px rgba(0,0,0,.35))"/><rect x="${GC - 9}" y="${GC + 22}" width="18" height="26" rx="4" fill="#1D2025"/></g>
      <circle cx="${GC}" cy="${GC}" r="22" fill="url(#${gid}b)" stroke="#2B2F36" stroke-width="2"/><circle cx="${GC}" cy="${GC}" r="8" fill="var(--id-orange)"/>
    </svg>`;
  }
  function statGauge(data, ctx) {
    injectCSS();
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 2); const n = Math.max(1, items.length);
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const shared = data.max || niceCeil(Math.max(...items.map((it) => +it.value || 0), 1));
    const CW = 610, gap = 1280 - CW * 2;
    const arcLen = (GR * (A1 - A0) * Math.PI) / 180;
    const parts = items.map((it, i) => {
      const hot = i === n - 1 && n > 1;
      const max = it.max || shared, frac = clamp01((+it.value || 0) / max);
      const dec = it.decimals != null ? it.decimals : decOf(it.value || 0), fin = fmtNum(it.value || 0, dec);
      const fs = Math.min(96, Math.floor(196 / (fin.length * 0.6 + (it.unit ? 0.26 * textW(it.unit, 1) + 0.12 : 0) + (it.prefix ? 0.3 * textW(it.prefix, 1) : 0))));
      const left = n === 1 ? 60 + (1280 - CW) / 2 : 60 + i * (CW + gap);
      const card = screws(h('div', `${hot ? 'id-steel hot' : 'id-glass'} v3-gg`, `left:${left}px;width:${CW}px;`,
        `<div class="lb">${esc(it.label || '')}</div>${dialSVG(max, hot, `gg${++SEQ}`)}`
        + `<div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b>${it.unit ? `<span class="u">${esc(it.unit)}</span>` : ''}</div>`
        + `<div class="rd"><span>SCALE 0–${esc(fmtNum(max, max % 1 ? 1 : 0))}${it.unit ? ` ${esc(it.unit)}` : ''}</span><span><b>${Math.round(frac * 100)}%</b> FS</span></div>`), 12);
      return { it, card, frac, dec, ndl: card.querySelector('.ndl'), arc: card.querySelector('.arc'), num: card.querySelector('.num b') };
    });
    const hotLeft = parts.length ? parseFloat(parts[parts.length - 1].card.style.left) : 730;
    let hang = null;
    if (data.delta) {
      hang = h('div', 'v3-hang', `left:${hotLeft + CW / 2}px;top:782px;`);
      hang.append(h('div', 'str'), h('div', 'ring'), tag(data.delta, data.deltaSmall || '', 'left:-120px;top:40px;font-size:48px;'));
    }
    const dm = data.note ? dim(data.note, `left:60px;top:840px;width:${Math.max(360, hotLeft + CW / 2 - 200 - 60)}px;`) : null;
    el.append(depth(-40, floorShadow('left:40px;top:740px;width:1320px;height:90px;'), reg('left:20px;top:96px;'), reg('left:1320px;top:930px;')),
      depth(0, kick, head, ...parts.map((p) => p.card), ...(dm ? [dm] : [])),
      depth(30, prop('leds', 0, 'left:1150px;top:170px;'), ...(hang ? [hang] : [])));
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    const tIn = parts.map((_, i) => 0.6 + i * 0.6);
    parts.forEach((p, i) => A.add(p.card, tIn[i], 0.5, { y: 160, o: 0, s: 0.96 }, { y: 0, o: 1, s: 1 }, 'drop'));
    if (dm) { A.add(dm.querySelector('.dl'), D - 2.6, 0.5, { sx: 0 }, { sx: 1 }); A.add(dm.querySelector('.dt'), D - 2.3, 0.25, { o: 0 }, { o: 1 }); }
    const tHang = Math.min(D - 1.4, (tIn[n - 1] || 0.6) + 2.2);
    A.fn((t) => {
      parts.forEach((p, i) => {
        const t0 = tIn[i] + 0.35;
        const q = clamp01((t - t0) / 1.5);
        const sweep = EASE.back(q);                      // 指针轻微过冲后回落
        const settle = q >= 1 ? Math.sin((t - t0) * 21) * 0.35 * Math.exp(-(t - t0 - 1.5) * 1.2) : 0; // 机械余振
        const ang = A0 + (A1 - A0) * p.frac * Math.min(1.06, sweep) + settle;
        p.ndl.setAttribute('transform', `rotate(${ang.toFixed(2)} ${GC} ${GC})`);
        drawPath(p.arc, arcLen, p.frac * EASE.out(q));
        p.num.textContent = fmtNum((+p.it.value || 0) * EASE.out(q), p.dec);
      });
      if (hang) {
        const u = t - tHang;
        if (u < 0) { hang.style.opacity = '0'; hang.style.transform = 'translateY(-30px)'; }
        else {
          const drop = 1 - EASE.out(clamp01(u / 0.35));
          const swing = -4 + 14 * Math.exp(-u * 2.2) * Math.cos(u * 7.5);
          hang.style.opacity = clamp01(u / 0.15).toFixed(3);
          hang.style.transform = `translateY(${(-30 * drop).toFixed(1)}px) rotate(${swing.toFixed(2)}deg)`;
        }
      }
    });
    fadeShadows(el, A, 0.6);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.12, 1, -3, 0), CAM(1.3, 700, 515, 1.0, 0.5, -1.5, 0), CAM(D, 705, 520, 1.03, 0.5, 1.2, 0)] };
  }

  // ============================== 3. steps:conveyor 流水线阶梯步骤 ==============================
  function stepsConveyor(data, ctx) {
    injectCSS();
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:100px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:96px;top:142px;font-size:96px;', mark(data.title));
    const dm = dim(data.dim || `${n} STEPS`, 'left:100px;top:276px;width:960px;');

    const line = h('div', 'v3-cv');
    const clip = h('div', 'clip');
    const X0 = 24, X1 = 1126, gap = 22, sw = (X1 - X0 - gap * (n - 1)) / n, ENTRY = 1300;
    const mods = items.map((it, i) => {
      const x = X0 + i * (sw + gap);
      const m = h('div', 'id-glass mod', `left:${x}px;width:${sw}px;`,
        `<div class="hd"><span>STEP ${esc(it.no || String(i + 1).padStart(2, '0'))}</span><i class="led"></i></div>`
        + `<div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div><div class="ok">● PASS</div>`);
      const gt = h('div', 'gate', `left:${x + sw / 2 - 5}px;`);
      clip.append(gt, m);
      return { m, gt, x };
    });
    const belt = h('div', 'belt');
    const rolls = [-6, 1252].concat([1, 2, 3, 4, 5, 6].map((k) => Math.round((1280 / 7) * k) - 17)).map((x) => h('div', 'roll', `left:${x}px;`, '<i></i>'));
    const frame = screws(h('div', 'id-steel frame'), 10);
    const fplate = h('div', 'plate', null, esc(data.folder || 'PIPELINE /'));
    const lamps = mods.map((md) => h('div', 'lamp', `left:${md.x + sw / 2 - 21}px;`));
    const stns = mods.map((md, i) => h('div', 'stn', `left:${md.x + sw / 2 + 30}px;`, `ST-${String(i + 1).padStart(2, '0')}`));
    const legs = [70, 620, 1150].flatMap((x) => [h('div', 'leg', `left:${x}px;`), h('div', 'foot', `left:${x - 28}px;`)]);
    const hatch = screws(h('div', 'id-steel hatch', null, `<div class="hz"></div><div class="slot"></div><div class="vt">${esc(data.folderBig || 'FEED')}</div><i class="led2"></i>`), 10);
    line.append(...legs, fplate, clip, belt, ...rolls, frame, ...lamps, ...stns, hatch, h('div', 'stop'));
    const label = data.label ? tag(data.label, data.labelSmall || '', 'left:820px;top:806px;font-size:36px;') : null;
    const lineWrap = h('div', 'id-abs', 'left:0;top:0;width:0;height:0;transform-style:preserve-3d;');
    lineWrap.appendChild(line);
    el.append(depth(-40, reg('left:40px;top:96px;'), reg('left:1320px;top:930px;'), floorShadow('left:40px;top:792px;width:1320px;height:90px;')),
      depth(0, kick, head, dm, lineWrap), ...(label ? [depth(30, label)] : []));

    A.add(lineWrap, 0.05, 0.55, { y: 120, o: 0 }, { y: 0, o: 1 }, 'drop');
    A.add(kick, 0.3, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.4, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(dm.querySelector('.dl'), 0.8, 0.5, { sx: 0 }, { sx: 1 });
    A.add(dm.querySelector('.dt'), 1.1, 0.25, { o: 0 }, { o: 1 });
    const TRAVEL = 0.95;
    const t0 = 1.2, t1 = Math.max(t0 + 0.5, D - 2.2 - TRAVEL * 0.3), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const arrive = mods.map((_, i) => t0 + i * stp + TRAVEL);
    mods.forEach((md, i) => {
      A.add(md.m, -1, 0.01, { x: ENTRY - md.x, o: 1 }, { x: ENTRY - md.x, o: 1 });
      A.add(md.m, t0 + i * stp, TRAVEL, { x: ENTRY - md.x }, { x: 0 }, 'out');
    });
    if (label) A.add(label, D - 1.2, 0.25, { s: 1.35, o: 0, r: 6 }, { s: 1, o: 1, r: -3 }, 'back');
    A.fn((t) => {
      // 传送带：恒速向左（确定性：位移只由 t 决定），滚筒同步旋转
      belt.style.backgroundPosition = `${(-t * 240).toFixed(1)}px 0`;
      const rot = (-t * 240 / (Math.PI * 34)) * 360;
      rolls.forEach((r) => { r.firstChild.style.transform = `rotate(${rot.toFixed(1)}deg)`; });
      mods.forEach((md, i) => {
        const on = t >= arrive[i];
        md.m.classList.toggle('on', on);
        lamps[i].classList.toggle('on', on);
        const g = t - arrive[i];
        md.gt.style.opacity = (g >= 0 && g < 0.6 ? Math.sin((g / 0.6) * Math.PI) : 0).toFixed(3);
      });
    });
    fadeShadows(el, A, 0.1);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 760, 600, 1.16, 2, -3, -0.3), CAM(1.2, 700, 520, 1.0, 1, -1.5, 0), CAM(D, 700, 515, 1.03, 0.5, 1.2, 0)] };
  }

  // ============================== 4. compare:split 上下双轨对比 ==============================
  function compareSplit(data, ctx) {
    injectCSS();
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:84px;', mark(data.title));
    const wT = oneLine(w.title), rT = oneLine(r.title);
    const sw = Math.min(840, textW(wT, 58) + 40);
    const W = screws(h('div', 'id-steel v3-sp wrong', 'top:258px;',
      `<div class="warn"></div><div class="lb">${esc(w.label || '✕ WRONG')}</div><div class="t">${esc(wT)}</div><div class="d">${esc(w.desc || '')}</div><div class="big">${esc(w.mark || 'NG')}</div>`
      + `<svg class="strike" width="1280" height="210"><path d="M50 116 L${(64 + sw).toFixed(0)} 74" stroke="var(--id-orange)" stroke-width="11" stroke-linecap="round" fill="none" stroke-dasharray="${(sw + 40).toFixed(0)}" stroke-dashoffset="${(sw + 40).toFixed(0)}"/></svg>`), 12);
    const xs = tag(w.stamp || '✕', '', 'right:48px;top:66px;font-size:40px;');
    W.appendChild(xs);
    const R = screws(h('div', 'id-glass v3-sp right', 'top:572px;',
      `<div class="warn"></div><div class="sheen"></div><div class="lb">${esc(r.label || '✓ RIGHT')}</div><div class="t">${esc(rT)}</div><div class="d">${esc(r.desc || '')}</div><div class="big">${esc(r.mark || 'OK')}</div>`
      + `<div class="badge">${PROPS.check(70, 10, '#FFFFFF')}</div>`), 12);
    const track = h('div', 'v3-vs-track'), tks = h('div', 'v3-vs-ticks');
    const knob = h('div', 'v3-vs-knob', null, `<i>▲</i>${esc(data.vs || 'VS')}<i>▼</i>`);
    const verdict = data.verdict ? h('div', 'v3-sp-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict)}</span>`) : null;
    el.append(depth(-40, reg('left:20px;top:96px;'), reg('left:1320px;top:930px;'), floorShadow('left:40px;top:760px;width:1320px;height:80px;')),
      depth(0, kick, head, W, R, track, tks, ...(verdict ? [verdict] : [])),
      depth(30, knob, prop('hazard', 200, 'left:1120px;top:208px;transform:rotate(-4deg);')));

    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(W, 0.5, 0.5, { x: -180, o: 0 }, { x: 0, o: 1 }, 'drop');
    const tStrike = 1.15;
    A.add(W.querySelector('.big'), 0.9, 0.4, { x: 60, o: 0 }, { x: 0, o: 1 });
    A.add(xs, tStrike + 0.55, 0.18, { s: 1.4, o: 0, r: -10 }, { s: 1, o: 1, r: -6 }, 'back');
    A.add(track, 1.3, 0.5, { sx: 0, o: 0 }, { sx: 1, o: 1 }, 'inOut');
    A.add(tks, 1.5, 0.3, { o: 0 }, { o: 1 });
    A.add(knob, 1.55, 0.75, { x: -495, o: 0, r: -8 }, { x: 0, o: 1, r: 0 }, 'back');
    const tR = Math.min(D * 0.45, 2.4);
    A.add(R, tR, 0.5, { x: 180, o: 0 }, { x: 0, o: 1 }, 'drop');
    A.add(R.querySelector('.big'), tR + 0.35, 0.4, { x: 60, o: 0 }, { x: 0, o: 1 });
    const badge = R.querySelector('.badge');
    A.add(badge, tR + 0.6, 0.3, { s: 0.3, o: 0, r: -30 }, { s: 1, o: 1, r: 0 }, 'back');
    if (verdict) A.add(verdict, Math.min(D - 1.4, tR + 1.5), 0.45, { y: 130, o: 0 }, { y: 0, o: 1 }, 'drop');
    const strike = W.querySelector('svg.strike path'), sLen = sw + 40;
    const ckp = badge.querySelector('.id-ck'), sheen = R.querySelector('.sheen');
    A.fn((t) => {
      drawPath(strike, sLen, EASE.inOut(clamp01((t - tStrike) / 0.55)));
      ckp.setAttribute('stroke-dashoffset', (70 * (1 - EASE.out(clamp01((t - tR - 0.8) / 0.3)))).toFixed(1));
      const q = clamp01((t - tR - 0.5) / 0.9);
      sheen.style.left = `${(-260 + 1560 * EASE.inOut(q)).toFixed(1)}px`;
      sheen.style.opacity = (q > 0 && q < 1 ? 1 : 0).toString();
    });
    fadeShadows(el, A, 0.5);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 430, 1.12, 1, -3, 0), CAM(1.3, 700, 500, 1.0, 0.5, -1.5, 0), CAM(D, 705, 515, 1.0, 0.5, 1.5, 0)] };
  }

  global.Industrial3DVariants = {
    'cover:blueprint': { create: coverBlueprint },
    'stat:gauge': { create: statGauge },
    'steps:conveyor': { create: stepsConveyor },
    'compare:split': { create: compareSplit }
  };
  Object.defineProperty(global.Industrial3DVariants, 'version', { value: '1.0.0', enumerable: false });
  Object.defineProperty(global.Industrial3DVariants, 'injectCSS', { value: injectCSS, enumerable: false });
})(window);
