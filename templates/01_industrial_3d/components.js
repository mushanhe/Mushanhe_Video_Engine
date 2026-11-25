/**
 * Mushanhe Video Engine — 风格包 01 · 3D 工业实体画廊（Industrial 3D Gallery）
 * ---------------------------------------------------------------------------
 * 10 大万能口播句型参数化组件（cover · steps · checklist · compare · showcase[code|terminal|doc|image|video|product] · quote · outro · stat · timeline · diagram），
 * 数据字段与 02_swiss_print / 06_neobrutalism 100% 一致，全部由 JSON 驱动、按时间确定性渲染（任意 seek 可还原）。
 *
 *   const comp = Industrial3D.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : { el, layer: 'world'|'screen', avatar, cams: [{ t, x, y, zoom, rx, ry, rz }], update(localT), w?, media? }
 *
 * 美术锁定（物理参数，不是形容词）：
 *   - 底：瑞士珍珠白建筑画廊 #F4F5F7；墙面校准十字 + 120px 建筑网格
 *   - 材质 A「工业深灰金属」：#434952→#2B2F36→#1D2025 165° 渐变 + 3px 拉丝纹 + 底部 10px 实体厚度 + 四角内六角螺丝
 *   - 材质 B「磨砂玻璃展台」：白 92%→72% 150° 渐变 + 1px 高光描边 + 底部 8px 玻璃厚边 + 柔和落地阴影
 *   - 形状：10px 机加工圆角（卡片）/ 999px 胶囊（字幕、结论条、标签），严禁默认 SaaS 大圆角
 *   - 点缀：爱马仕橙 #FF5A1F（重点、数值、资产标签）+ 电光青 #00C2A8（尺寸线、勾选、脉冲、LED）
 *   - 空间：组件内部按 translateZ 分层（底座 -40 / 主体 0 / 标签 +30），配合 CameraRig3D 画廊漫游产生真实视差
 *
 * 局部坐标安全区：x 60–1340，y 100–980（宿主页换算为 (x-60, y, zoom×0.92)，落在人像框左侧、标签之下、字幕之上）。
 */
(function (global) {
  'use strict';

  // ============================== 工具 ==============================
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const EASE = {
    linear: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    in: (x) => x * x * x,
    back: (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    drop: (x) => { if (x < 0.7) return EASE.out(x / 0.7) * 1.03; return 1.03 - 0.03 * EASE.out((x - 0.7) / 0.3); }
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }

  /** 确定性补间：同一元素可挂多段动画，按时间取最后一段已开始的动画插值 */
  class Animator {
    constructor() { this.map = new Map(); this.fns = []; }
    add(el, at, d, from, to, ease = 'out') {
      if (!this.map.has(el)) this.map.set(el, []);
      this.map.get(el).push({ at, d, from, to, ease });
      this.map.get(el).sort((a, b) => a.at - b.at);
      return this;
    }
    fn(f) { this.fns.push(f); return this; }
    update(t) {
      this.map.forEach((list, el) => {
        let a = list[0], p = 0;
        for (const it of list) if (t >= it.at) a = it;
        if (t >= a.at) p = EASE[a.ease](clamp01((t - a.at) / Math.max(0.001, a.d)));
        const st = {};
        ['x', 'y', 's', 'r', 'o', 'sx'].forEach((k) => {
          const dv = k === 's' || k === 'o' || k === 'sx' ? 1 : 0;
          const f = a.from[k] != null ? a.from[k] : (a.to[k] != null ? a.to[k] : dv);
          const tt = a.to[k] != null ? a.to[k] : f;
          st[k] = f + (tt - f) * p;
        });
        el.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) rotate(${st.r.toFixed(2)}deg) scale(${(st.s * st.sx).toFixed(4)}, ${st.s.toFixed(4)})`;
        el.style.opacity = st.o.toFixed(3);
      });
      this.fns.forEach((f) => f(t));
    }
  }

  // ============================== 纯 SVG / CSS 工业实体道具 ==============================
  let SEQ = 0;
  const PROPS = {
    /** 不锈钢直尺（时间轴主轨） */
    rail(len = 900) {
      const hgt = 56; let ticks = '', nums = '';
      for (let x = 14, i = 0; x < len - 10; x += 10, i++) {
        const th = i % 10 === 0 ? 24 : i % 5 === 0 ? 16 : 9;
        ticks += `<line x1="${x}" y1="6" x2="${x}" y2="${6 + th}"/>`;
        if (i % 10 === 0) nums += `<text x="${x + 3}" y="${th + 20}">${i / 10}</text>`;
      }
      const g = `rl${++SEQ}`;
      return `<svg width="${len}" height="${hgt}" viewBox="0 0 ${len} ${hgt}"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9ECEF"/><stop offset=".5" stop-color="#C4CAD1"/><stop offset="1" stop-color="#9EA5AE"/></linearGradient></defs><rect x="0.5" y="0.5" width="${len - 1}" height="${hgt - 1}" rx="4" fill="url(#${g})" stroke="#7D848D"/><rect x="0" y="${hgt - 8}" width="${len}" height="8" rx="3" fill="#FF5A1F" opacity=".9"/><g stroke="#1D2025" stroke-width="1.4">${ticks}</g><g fill="#1D2025" font-family="Consolas, monospace" font-size="11" font-weight="800">${nums}</g></svg>`;
    },
    /** 游标卡尺 */
    caliper(len = 380) {
      const g = `cp${++SEQ}`; let ticks = '';
      for (let x = 70; x < len - 20; x += 8) ticks += `<line x1="${x}" y1="22" x2="${x}" y2="${(x - 70) % 40 === 0 ? 34 : 29}"/>`;
      return `<svg width="${len}" height="120" viewBox="0 0 ${len} 120"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1F3F5"/><stop offset="1" stop-color="#A9B0B8"/></linearGradient></defs><rect x="40" y="18" width="${len - 44}" height="22" rx="2" fill="url(#${g})" stroke="#6E757E"/><g stroke="#2B2F36" stroke-width="1.2">${ticks}</g><path d="M6 18 H70 V120 H50 L40 64 H6 Z" fill="url(#${g})" stroke="#6E757E"/><path d="M150 10 H220 V64 H196 L186 112 H166 L160 64 H150 Z" fill="#2B2F36"/><rect x="164" y="44" width="40" height="10" rx="2" fill="#FF5A1F"/><circle cx="208" cy="22" r="5" fill="#00C2A8"/></svg>`;
    },
    /** 安全色警示条 */
    hazard(w = 220, hgt = 22) {
      return `<div style="width:${w}px;height:${hgt}px;border-radius:3px;background:repeating-linear-gradient(-45deg,#FF5A1F 0 14px,#1D2025 14px 28px);box-shadow:0 6px 10px -4px rgba(20,26,34,.4)"></div>`;
    },
    /** 三灯状态面板 */
    leds() {
      return `<div class="id-ledbox"><i style="background:#00C2A8;box-shadow:0 0 12px #00C2A8"></i><i style="background:#FF5A1F;box-shadow:0 0 12px #FF5A1F"></i><i></i><span>SYS · OK</span></div>`;
    },
    /** 建筑校准十字 */
    reg() {
      return `<svg width="36" height="36" viewBox="0 0 36 36"><g stroke="#2B2F36" stroke-width="1.3" fill="none" opacity=".55"><circle cx="18" cy="18" r="9"/><line x1="18" y1="0" x2="18" y2="36"/><line x1="0" y1="18" x2="36" y2="18"/></g></svg>`;
    },
    check(size = 60, stroke = 8, color = 'var(--id-teal)') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" style="overflow:visible"><path class="id-ck" d="M10 31 L24 45 L51 12" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="70" stroke-dashoffset="70"/></svg>`;
    }
  };

  function prop(name, arg, style) { return h('div', 'id-prop', style, PROPS[name](arg)); }
  function reg(style) { return h('div', 'id-reg', style, PROPS.reg()); }
  /** 橙色资产吊牌（替代印章）：冲孔 + 模版字 */
  function tag(text, small, style, teal) { return h('div', `id-tag${teal ? ' teal' : ''}`, style, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`); }
  /** 电光青尺寸标注线 */
  function dim(label, style) { return h('div', 'id-dim', style, `<div class="dl"></div><div class="dt">${esc(label)}</div>`); }
  /** 四角内六角螺丝 */
  function screws(el, inset = 14) {
    [[inset, inset], [null, inset], [inset, null], [null, null]].forEach(([l, tp]) => {
      el.appendChild(h('i', 'id-screw', `${l != null ? `left:${l}px;` : `right:${inset}px;`}${tp != null ? `top:${tp}px;` : `bottom:${inset}px;`}`));
    });
    return el;
  }
  /** translateZ 景深层（不参与透明度动画，保证 3D 不被拍平） */
  function depth(z, ...els) { const w = h('div', 'id-z', `transform:translateZ(${z}px);`); w.append(...els); return w; }
  /** 落地柔影 */
  function floorShadow(style) { return h('div', 'id-fshadow', style); }
  /** 落地柔影随展台一起淡入（避免漫游时阴影先于实体悬空出现） */
  function fadeShadows(el, A, at) { el.querySelectorAll('.id-fshadow').forEach((sh) => A.add(sh, at, 0.5, { o: 0, sx: 0.6 }, { o: 1, sx: 1 })); }
  /** 把 "这句**关键词**话" 中 ** 包裹部分标橙 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }

  /** 真 CSS 3D 拉丝金属立方体（6 面，确定性旋转） */
  function cube(S) {
    const wrap = h('div', 'id-cube-wrap', `width:${S}px;height:${S}px;`);
    const c = h('div', 'id-cube', `width:${S}px;height:${S}px;`);
    const faces = [
      ['steel', `translateZ(${S / 2}px)`, '<b>MH</b><span>ENGINE · 01</span>'],
      ['steel', `rotateY(180deg) translateZ(${S / 2}px)`, ''],
      ['orange', `rotateY(90deg) translateZ(${S / 2}px)`, '<b>3D</b>'],
      ['steel', `rotateY(-90deg) translateZ(${S / 2}px)`, '<span>INDUSTRIAL</span>'],
      ['pearl', `rotateX(90deg) translateZ(${S / 2}px)`, ''],
      ['steel', `rotateX(-90deg) translateZ(${S / 2}px)`, '']
    ];
    faces.forEach(([k, tf, inner]) => c.appendChild(h('div', `id-face ${k}`, `transform:${tf};`, inner)));
    wrap.appendChild(c);
    return { el: wrap, set: (rx, ry, s, y) => { c.style.transform = `translateY(${(y || 0).toFixed(1)}px) scale(${s.toFixed(3)}) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; } };
  }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const STEEL_BG = 'repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 1px,transparent 1px 3px),linear-gradient(165deg,#454B54 0%,var(--id-steel) 40%,#1D2025 100%)';
  const GLASS_BG = 'linear-gradient(150deg,rgba(255,255,255,.94) 0%,rgba(247,248,250,.82) 55%,rgba(233,237,242,.76) 100%)';
  const CSS = `
  .id-zone{position:absolute;width:1400px;height:1100px;font-family:var(--id-font-cn);color:var(--id-ink);transform-style:preserve-3d}
  .id-z{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d}
  .id-abs{position:absolute}
  .id-glass{position:absolute;border-radius:10px;background:${GLASS_BG};border:1px solid rgba(255,255,255,.96);
    box-shadow:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(20,26,34,.05),0 8px 0 -1px #D2D7DD,0 9px 0 -1px rgba(20,26,34,.14),0 34px 52px -20px rgba(20,26,34,.34)}
  .id-steel{position:absolute;border-radius:10px;color:#EEF1F4;background:${STEEL_BG};
    box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -1px 0 rgba(0,0,0,.5),0 10px 0 -1px #101215,0 40px 58px -18px rgba(14,18,24,.55)}
  .id-orangep{position:absolute;border-radius:10px;color:#fff;background:linear-gradient(165deg,#FF7A47 0%,var(--id-orange) 48%,#DE4511 100%);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 0 -1px #9E2F08,0 36px 54px -18px rgba(158,47,8,.5)}
  .id-screw{position:absolute;width:14px;height:14px;border-radius:50%;z-index:3;background:radial-gradient(circle at 35% 32%,#F4F6F8 0%,#AEB5BE 48%,#5C636D 100%);box-shadow:0 1px 1px rgba(0,0,0,.45)}
  .id-screw::after{content:'';position:absolute;left:3px;right:3px;top:6px;height:2px;background:#4A5059;transform:rotate(35deg)}
  .id-fshadow{position:absolute;border-radius:50%;background:radial-gradient(ellipse at center,rgba(20,26,34,.32) 0%,rgba(20,26,34,.12) 45%,rgba(20,26,34,0) 72%)}
  .id-kicker{position:absolute;font-family:var(--id-font-mono);font-size:21px;font-weight:800;letter-spacing:.16em;color:var(--id-grey);white-space:nowrap}
  .id-kicker::before{content:'';display:inline-block;width:12px;height:12px;background:var(--id-orange);margin-right:14px;vertical-align:1px}
  .id-head{position:absolute;font-weight:900;letter-spacing:-.02em;line-height:1.06;color:var(--id-ink);white-space:nowrap}
  .id-head em,.id-quote-t em,.id-sub em,.id-verdict em{font-style:normal;color:var(--id-orange)}
  .id-prop{position:absolute;z-index:5;filter:drop-shadow(0 8px 8px rgba(20,26,34,.25))}
  .id-prop svg,.id-reg svg{display:block}
  .id-reg{position:absolute;width:36px;height:36px}
  .id-ledbox{display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;background:${STEEL_BG};box-shadow:0 8px 0 -1px #101215,0 20px 30px -12px rgba(14,18,24,.5)}
  .id-ledbox i{width:14px;height:14px;border-radius:50%;background:#4A5059}
  .id-ledbox span{font-family:var(--id-font-mono);font-size:15px;font-weight:800;letter-spacing:.14em;color:#C9CED5;margin-left:4px}
  .id-tag{position:absolute;padding:10px 26px 12px 50px;border-radius:6px;background:linear-gradient(170deg,#FF7A47,var(--id-orange) 55%,#E24A12);color:#15181D;font-weight:900;line-height:1.05;white-space:nowrap;z-index:7;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 5px 0 -1px #9E2F08,0 18px 28px -10px rgba(20,26,34,.45)}
  .id-tag.teal{background:linear-gradient(170deg,#25D9BF,var(--id-teal) 55%,#00A28C);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 5px 0 -1px #006F60,0 18px 28px -10px rgba(20,26,34,.45)}
  .id-tag::before{content:'';position:absolute;left:18px;top:50%;width:16px;height:16px;margin-top:-8px;border-radius:50%;background:var(--id-pearl);box-shadow:inset 0 2px 3px rgba(0,0,0,.45)}
  .id-tag small{display:block;font-family:var(--id-font-mono);font-size:.34em;letter-spacing:.22em;margin-top:5px}
  .id-dim{position:absolute;height:30px}
  .id-dim .dl{position:absolute;left:0;right:0;top:14px;height:2px;background:var(--id-teal);transform-origin:left center}
  .id-dim .dl::before,.id-dim .dl::after{content:'';position:absolute;top:-10px;width:2px;height:22px;background:var(--id-teal)}
  .id-dim .dl::before{left:0}.id-dim .dl::after{right:0}
  .id-dim .dt{position:absolute;left:50%;top:-8px;transform:translateX(-50%);padding:2px 16px;border-radius:999px;background:var(--id-pearl);border:2px solid var(--id-teal);font-family:var(--id-font-mono);font-size:20px;font-weight:900;letter-spacing:.08em;color:#00796A;white-space:nowrap}
  /* 3D 立方体 */
  .id-cube-wrap{position:absolute;transform-style:preserve-3d}
  .id-cube{position:absolute;left:0;top:0;transform-style:preserve-3d}
  .id-face{position:absolute;inset:0;box-sizing:border-box;border:1px solid rgba(255,255,255,.14);display:flex;flex-direction:column;align-items:center;justify-content:center;backface-visibility:hidden}
  .id-face.steel{background:${STEEL_BG};color:#EEF1F4}
  .id-face.orange{background:linear-gradient(165deg,#FF7A47,var(--id-orange) 50%,#DE4511);color:#15181D}
  .id-face.pearl{background:linear-gradient(135deg,#FFFFFF,#DDE2E8)}
  .id-face b{font-family:var(--id-font-latin);font-size:72px;font-weight:900;letter-spacing:-.04em;line-height:1}
  .id-face.steel b{color:var(--id-orange)}
  .id-face span{font-family:var(--id-font-mono);font-size:13px;font-weight:800;letter-spacing:.2em;margin-top:8px;color:#9EA5AE}
  /* cover */
  .id-cover-title{position:absolute;left:56px;top:160px;font-size:150px;font-weight:900;letter-spacing:-.03em;line-height:1.02;white-space:nowrap;color:var(--id-ink)}
  .id-cover-title span{display:inline-block;text-shadow:0 2px 0 #fff,0 14px 24px rgba(20,26,34,.14)}
  .id-chap{left:60px;top:540px;width:300px;height:300px}
  .id-chap .l{position:absolute;left:26px;top:24px;font-family:var(--id-font-mono);font-size:22px;font-weight:800;letter-spacing:.22em;color:var(--id-teal)}
  .id-chap .n{position:absolute;left:20px;bottom:10px;font-family:var(--id-font-latin);font-size:190px;font-weight:900;letter-spacing:-.06em;line-height:1;color:var(--id-orange)}
  .id-chap .stripe{position:absolute;left:0;right:0;top:0;height:8px;border-radius:10px 10px 0 0;background:var(--id-orange)}
  .id-sub{position:absolute;padding:22px 34px 24px;font-size:44px;font-weight:900;line-height:1.26;white-space:nowrap}
  /* steps */
  .id-bed{position:absolute;left:100px;top:320px;width:1200px;height:600px;transform-style:preserve-3d}
  .id-bed-tab{position:absolute;left:0;top:0;width:400px;height:58px;border-radius:10px 10px 0 0;background:${STEEL_BG};color:#DDE1E6;font-family:var(--id-font-mono);font-size:19px;font-weight:800;letter-spacing:.1em;padding:17px 22px 0 46px;box-sizing:border-box;white-space:nowrap;overflow:hidden}
  .id-bed-tab::before{content:'';position:absolute;left:20px;top:22px;width:12px;height:12px;border-radius:50%;background:var(--id-teal);box-shadow:0 0 10px var(--id-teal)}
  .id-bed-back{position:absolute;left:0;top:54px;width:100%;height:546px;border-radius:0 10px 10px 10px;background:${STEEL_BG};box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 40px 60px -20px rgba(14,18,24,.55)}
  .id-bed-clip{position:absolute;left:0;top:0;width:1200px;height:290px;overflow:hidden}
  .id-st-card{position:absolute;top:100px;height:300px;padding:18px 20px;box-sizing:border-box;border-radius:10px 10px 0 0}
  .id-st-card .no{display:inline-block;padding:3px 10px;border-radius:4px;background:var(--id-orange);color:#fff;font-family:var(--id-font-mono);font-size:18px;font-weight:900}
  .id-st-card .nm{font-size:44px;font-weight:900;margin-top:8px;line-height:1.08;white-space:nowrap}
  .id-st-card .fn{font-family:var(--id-font-mono);font-size:16px;font-weight:700;color:var(--id-grey);margin-top:8px;line-height:1.4;white-space:nowrap}
  .id-bed-front{position:absolute;left:0;top:290px;width:100%;height:310px;border-radius:0 0 10px 10px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 3px),linear-gradient(180deg,#4A5059 0%,#353A42 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 -8px 16px rgba(0,0,0,.3),0 10px 0 -1px #101215}
  .id-bed-front .hz{position:absolute;left:0;right:0;top:0;height:16px;background:repeating-linear-gradient(-45deg,var(--id-orange) 0 16px,#1D2025 16px 32px)}
  .id-bed-front .big{position:absolute;left:36px;bottom:24px;font-family:var(--id-font-latin);font-size:176px;font-weight:900;letter-spacing:-.05em;line-height:.8;white-space:nowrap;color:transparent;-webkit-text-stroke:3px var(--id-orange)}
  .id-bed-front .meta{position:absolute;right:34px;bottom:34px;text-align:right;font-family:var(--id-font-mono);font-size:18px;font-weight:800;line-height:1.6;color:#C9CED5}
  .id-bed-front .vent{position:absolute;right:34px;top:48px;width:260px;height:70px;background:repeating-linear-gradient(90deg,#1D2025 0 8px,transparent 8px 18px);border-radius:4px;opacity:.75}
  /* checklist */
  .id-tablet{position:absolute;left:300px;top:100px;width:800px}
  .id-tablet .hdr{position:absolute;left:0;right:0;top:0;height:64px;border-radius:10px 10px 0 0;background:${STEEL_BG};color:#C9CED5;font-family:var(--id-font-mono);font-size:17px;font-weight:800;letter-spacing:.2em;padding:22px 0 0 96px;box-sizing:border-box;white-space:nowrap}
  .id-tablet .hdr .lz{position:absolute;right:26px;top:24px;display:flex;gap:8px}
  .id-tablet .hdr .lz i{width:12px;height:12px;border-radius:50%;background:#4A5059}
  .id-tablet .hdr .lz i:first-child{background:var(--id-teal);box-shadow:0 0 10px var(--id-teal)}
  .id-tablet .ttl{position:absolute;left:92px;top:94px;font-family:var(--id-font-latin);font-size:108px;font-weight:900;letter-spacing:-.05em;line-height:1;white-space:nowrap}
  .id-tablet .sub{position:absolute;left:96px;top:232px;font-size:38px;font-weight:900;white-space:nowrap}
  .id-tablet .sub i{display:inline-block;width:60px;height:12px;border-radius:6px;background:var(--id-orange);margin-left:18px;vertical-align:middle}
  .id-tablet .hr{position:absolute;left:96px;right:66px;top:316px;height:5px;border-radius:3px;background:var(--id-steel)}
  .id-tablet .rail{position:absolute;left:52px;top:64px;bottom:0;width:2px;background:rgba(0,194,168,.45)}
  .id-rl{position:absolute;left:96px;right:56px;height:115px;border-bottom:1.5px solid rgba(20,26,34,.12)}
  .id-rl .box{position:absolute;left:0;top:22px;width:48px;height:48px;border-radius:8px;border:3px solid var(--id-steel);box-sizing:border-box;background:#fff;transition:none}
  .id-rl .box.on{background:var(--id-teal);border-color:var(--id-teal);box-shadow:0 0 18px rgba(0,194,168,.55)}
  .id-rl .box svg{position:absolute;left:-3px;top:-4px}
  .id-rl .k{position:absolute;left:78px;top:14px;font-size:42px;font-weight:900;white-space:nowrap}
  .id-rl .d{position:absolute;left:78px;top:68px;font-size:25px;font-weight:700;color:var(--id-grey);white-space:nowrap}
  .id-rl .n{position:absolute;right:0;top:24px;font-family:var(--id-font-mono);font-size:17px;font-weight:800;color:var(--id-orange);letter-spacing:.08em}
  .id-note{position:absolute;left:96px;font-size:44px;font-weight:900;white-space:nowrap;z-index:1}
  .id-note small{display:block;font-family:var(--id-font-mono);font-size:18px;color:var(--id-grey);letter-spacing:.16em;margin-bottom:8px}
  .id-note .tx{position:relative}
  .id-note .hl{position:absolute;left:-12px;right:-12px;bottom:2px;height:24px;border-radius:4px;background:rgba(255,90,31,.88);transform-origin:left center;z-index:-1}
  /* compare */
  .id-cmp{position:absolute;top:290px;width:520px;height:440px;overflow:hidden}
  .id-cmp .band{height:58px;font-family:var(--id-font-mono);font-size:19px;font-weight:800;letter-spacing:.16em;padding:18px 26px 18px 48px;box-sizing:border-box;white-space:nowrap}
  .id-cmp.wrong .band{background:rgba(0,0,0,.28);color:#FF8A5C}
  .id-cmp.right .band{background:var(--id-teal);color:#fff}
  .id-cmp .t{position:absolute;left:34px;top:98px;font-size:58px;font-weight:900;line-height:1.12;white-space:nowrap}
  .id-cmp .d{position:absolute;left:34px;right:34px;top:262px;font-size:26px;font-weight:700;line-height:1.5}
  .id-cmp.wrong .d{color:#9EA5AE}.id-cmp.right .d{color:var(--id-grey)}
  .id-cmp svg.strike{position:absolute;left:20px;top:92px;overflow:visible}
  .id-vs{position:absolute;left:620px;top:430px;width:160px;height:160px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--id-font-latin);font-size:62px;font-weight:900;letter-spacing:-.04em;color:#fff;background:${STEEL_BG};box-shadow:inset 0 0 0 6px rgba(255,90,31,.9),0 10px 0 -1px #101215,0 30px 40px -14px rgba(14,18,24,.5)}
  .id-verdict{position:absolute;left:60px;top:790px;width:1280px;height:118px;border-radius:999px;display:flex;align-items:center;gap:26px;padding:0 48px;box-sizing:border-box;color:#fff;background:${STEEL_BG};box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 10px 0 -1px #101215,0 40px 58px -18px rgba(14,18,24,.55)}
  .id-verdict b{font-family:var(--id-font-mono);font-size:20px;letter-spacing:.2em;color:var(--id-teal);white-space:nowrap}
  .id-verdict span{font-size:44px;font-weight:900;white-space:nowrap}
  /* showcase */
  .id-panel{position:absolute;left:60px;top:260px;width:1240px;height:640px;overflow:hidden}
  .id-panel .bar{height:54px;display:flex;align-items:center;gap:10px;padding:0 22px;font-family:var(--id-font-mono);font-size:17px;font-weight:800;letter-spacing:.1em;background:${STEEL_BG};color:#DDE1E6;border-radius:10px 10px 0 0}
  .id-panel .bar i{width:13px;height:13px;border-radius:50%;background:#5C636D;display:inline-block}
  .id-panel .bar i:first-child{background:var(--id-orange)}
  .id-panel .bar i:nth-child(2){background:var(--id-teal)}
  .id-panel .bar span{margin-left:12px}
  .id-panel.dark{background:#16191E;color:#E6EAEE;border-radius:10px;box-shadow:0 10px 0 -1px #0B0C0E,0 40px 58px -18px rgba(14,18,24,.55)}
  .id-code{padding:24px 32px;font-family:var(--id-font-mono);font-size:30px;line-height:1.62;white-space:pre}
  .id-code .ln{display:inline-block;width:48px;color:#5C636D}
  .id-code .c{color:#8A929C}.id-code .k{color:var(--id-orange)}.id-code .ok{color:var(--id-teal)}
  .id-panel.light .id-code{font-family:var(--id-font-cn);font-size:34px;font-weight:700}
  .id-media{position:absolute;left:0;right:0;top:54px;bottom:0;width:100%;height:calc(100% - 54px);object-fit:cover;background:#000}
  .id-note-pin{position:absolute;display:flex;align-items:center;gap:12px;z-index:5}
  .id-note-pin b{width:46px;height:46px;border-radius:50%;background:var(--id-orange);color:#fff;font-family:var(--id-font-latin);font-size:24px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(255,255,255,.9),0 6px 12px rgba(0,0,0,.35)}
  .id-note-pin span{background:#16191E;color:#fff;font-size:24px;font-weight:900;padding:9px 20px;border-radius:999px;white-space:nowrap;box-shadow:0 10px 20px -6px rgba(0,0,0,.45)}
  .id-prod{position:absolute;left:0;right:0;top:54px;bottom:0}
  .id-prod .pic{position:absolute;left:26px;top:26px;bottom:26px;width:520px;border-radius:8px;overflow:hidden;perspective:900px;
    background:radial-gradient(ellipse at 50% 18%,#FFFFFF 0%,#EEF1F4 42%,#D3D8DE 100%);box-shadow:inset 0 0 0 1px rgba(20,26,34,.08),inset 0 -40px 60px -30px rgba(20,26,34,.25)}
  .id-prod .pic .beam{position:absolute;left:50%;top:-20px;width:420px;height:520px;margin-left:-210px;background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,0) 85%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);opacity:.55}
  .id-prod .pic .disc{position:absolute;left:50%;bottom:44px;width:380px;height:70px;margin-left:-190px;border-radius:50%;background:radial-gradient(ellipse at 50% 35%,#5A616B,#1D2025 70%);box-shadow:0 0 0 3px var(--id-orange),0 26px 30px -8px rgba(14,18,24,.55)}
  .id-prod .pic .obj{position:absolute;left:50%;bottom:92px;width:380px;margin-left:-190px;transform-style:preserve-3d}
  .id-prod .pic .obj img{width:100%;height:auto;display:block}
  .id-prod .pic .obj svg{width:100%;height:auto;display:block}
  .id-prod .info{position:absolute;left:590px;right:44px;top:36px}
  .id-prod .nm{font-size:58px;font-weight:900;line-height:1.08;white-space:nowrap}
  .id-prod .tg{font-size:24px;font-weight:700;color:var(--id-grey);margin-top:10px;white-space:nowrap}
  .id-prod .specs{margin-top:22px;border-top:5px solid var(--id-steel)}
  .id-prod .row{display:flex;justify-content:space-between;align-items:baseline;gap:20px;padding:13px 0;border-bottom:1.5px solid rgba(20,26,34,.12);white-space:nowrap}
  .id-prod .row .k{font-family:var(--id-font-mono);font-size:19px;font-weight:800;color:var(--id-grey);letter-spacing:.06em}
  .id-prod .row .k::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--id-teal);margin-right:12px;vertical-align:2px}
  .id-prod .row .v{font-size:26px;font-weight:900}
  /* quote（屏幕层） */
  .id-quote{position:absolute;top:240px;width:660px;padding:40px 46px 46px 52px;box-sizing:border-box;border-radius:12px;color:#fff;
    background:linear-gradient(160deg,#2A2E35,#141619);border:1px solid rgba(255,255,255,.14);box-shadow:inset 10px 0 0 var(--id-orange),0 10px 0 -1px #0B0C0E,0 40px 70px -10px rgba(0,0,0,.6)}
  .id-quote .k{font-family:var(--id-font-mono);font-size:17px;font-weight:900;letter-spacing:.2em;color:var(--id-teal)}
  .id-quote-t{font-size:56px;font-weight:900;line-height:1.24;margin-top:16px}
  .id-quote .by{margin-top:22px;font-family:var(--id-font-mono);font-size:18px;font-weight:800;color:#9EA5AE;letter-spacing:.1em}
  /* outro */
  .id-act{position:absolute;left:60px;width:560px;height:150px;padding:24px 30px 24px 34px;box-sizing:border-box}
  .id-act .no{font-family:var(--id-font-mono);font-size:19px;font-weight:900;color:var(--id-orange);letter-spacing:.12em}
  .id-act .t{font-size:40px;font-weight:900;margin-top:6px;white-space:nowrap}
  .id-act .d{font-size:21px;font-weight:700;color:var(--id-grey);margin-top:4px;white-space:nowrap}
  .id-act::before{content:'';position:absolute;left:0;top:22px;bottom:22px;width:6px;border-radius:0 3px 3px 0;background:var(--id-orange)}
  .id-cta{left:690px;top:280px;width:650px;height:500px;padding:42px 46px;box-sizing:border-box}
  .id-cta .k{font-family:var(--id-font-mono);font-size:20px;font-weight:900;letter-spacing:.2em;color:var(--id-teal)}
  .id-cta .t{font-size:62px;font-weight:900;margin-top:14px;line-height:1.1;white-space:nowrap}
  .id-cta .repo{margin-top:24px;padding:14px 20px;border-radius:8px;background:rgba(0,0,0,.32);border:1.5px solid rgba(0,194,168,.55);font-family:var(--id-font-mono);font-size:25px;font-weight:800;white-space:nowrap;overflow:hidden;color:#E6EAEE}
  .id-cta .btns{display:flex;gap:14px;margin-top:30px}
  .id-cta .btns span{flex:1;text-align:center;padding:16px 0;border-radius:999px;background:#EEF1F4;color:var(--id-ink);font-size:30px;font-weight:900;box-shadow:0 5px 0 -1px #9EA5AE}
  .id-cta .btns span:first-child{background:var(--id-orange);color:#fff;box-shadow:0 5px 0 -1px #9E2F08}
  /* stat */
  .id-stat{position:absolute;top:300px;height:430px;padding:30px 32px 0;box-sizing:border-box;overflow:hidden}
  .id-stat .lb{font-family:var(--id-font-mono);font-size:20px;font-weight:800;letter-spacing:.12em;color:var(--id-grey);white-space:nowrap}
  .id-stat.hot .lb{color:#C9CED5}
  .id-stat .num{margin-top:18px;font-family:var(--id-font-latin);font-weight:900;letter-spacing:-.05em;line-height:1;white-space:nowrap;color:var(--id-ink);display:inline-block}
  .id-stat.hot .num{color:var(--id-orange)}
  .id-stat .num .u,.id-stat .num .pf{font-family:var(--id-font-cn);font-size:.26em;letter-spacing:0;margin-left:.15em;vertical-align:.2em}
  .id-stat.hot .num .u{color:#EEF1F4}
  .id-stat .num .pf{margin:0 .1em 0 0}
  .id-stat .bar{position:absolute;left:32px;right:32px;bottom:48px;height:24px;border-radius:4px;background:repeating-linear-gradient(90deg,rgba(20,26,34,.1) 0 16px,transparent 16px 21px)}
  .id-stat.hot .bar{background:repeating-linear-gradient(90deg,rgba(255,255,255,.1) 0 16px,transparent 16px 21px)}
  .id-stat .bar i{position:absolute;left:0;top:0;bottom:0;background:repeating-linear-gradient(90deg,var(--id-steel) 0 16px,transparent 16px 21px)}
  .id-stat.hot .bar i{background:repeating-linear-gradient(90deg,var(--id-orange) 0 16px,transparent 16px 21px);filter:drop-shadow(0 0 6px rgba(255,90,31,.6))}
  .id-stat .sc{position:absolute;right:32px;bottom:14px;font-family:var(--id-font-mono);font-size:16px;font-weight:800;color:var(--id-grey)}
  .id-stat.hot .sc{color:#C9CED5}
  /* timeline */
  .id-tl-node{position:absolute;width:240px;height:200px;padding:18px 22px;box-sizing:border-box}
  .id-tl-node .tm{font-family:var(--id-font-latin);font-size:56px;font-weight:900;letter-spacing:-.04em;line-height:1;color:var(--id-orange);white-space:nowrap}
  .id-tl-node .t{font-size:34px;font-weight:900;margin-top:10px;white-space:nowrap}
  .id-tl-node .d{font-size:19px;font-weight:700;color:var(--id-grey);margin-top:6px;line-height:1.35}
  .id-tl-node.now .tm{color:#fff}.id-tl-node.now .d{color:rgba(255,255,255,.88)}
  .id-tl-stem{position:absolute;width:4px;border-radius:2px;background:var(--id-steel)}
  .id-tl-dot{position:absolute;width:28px;height:28px;border-radius:50%;z-index:6;background:radial-gradient(circle at 35% 32%,#F4F6F8 0%,#AEB5BE 48%,#5C636D 100%);box-shadow:0 2px 4px rgba(0,0,0,.4)}
  .id-tl-dot.now{background:var(--id-teal);box-shadow:0 0 0 5px rgba(0,194,168,.25),0 0 22px var(--id-teal)}
  /* diagram */
  .id-dg-node{position:absolute;width:260px;height:124px;padding:20px 22px 0;box-sizing:border-box;z-index:3}
  .id-dg-node::before{content:'';position:absolute;left:0;right:0;top:0;height:10px;border-radius:10px 10px 0 0;background:var(--id-steel)}
  .id-dg-node .l{font-size:36px;font-weight:900;white-space:nowrap}
  .id-dg-node .s{font-family:var(--id-font-mono);font-size:17px;font-weight:800;color:var(--id-grey);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .id-dg-node.hot{background:linear-gradient(165deg,#FF7A47 0%,var(--id-orange) 48%,#DE4511 100%);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 8px 0 -1px #9E2F08,0 0 40px rgba(255,90,31,.45)}
  .id-dg-node.hot::before{background:#15181D}
  .id-dg-node.hot .s{color:rgba(255,255,255,.88)}
  .id-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .id-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .id-dg-tag{padding:5px 16px;border-radius:999px;background:#16191E;color:#fff;font-family:var(--id-font-mono);font-size:16px;font-weight:800;white-space:nowrap;box-shadow:0 0 0 2px var(--id-teal)}
  `;
  function injectCSS() {
    if (document.getElementById('id-components-css')) return;
    const st = document.createElement('style'); st.id = 'id-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  // 默认机位
  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });

  // ============================== 1. cover 章节封面 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:120px;', esc(data.kicker));
    const title = h('div', 'id-cover-title');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const block = screws(h('div', 'id-steel id-chap', null, `<div class="stripe"></div><div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="n">${esc(data.chapter || '01')}</div>`));
    const sub = h('div', 'id-glass id-sub', 'left:400px;top:536px;', mark(data.subtitle));
    const dm = dim(data.dim || '', 'left:410px;top:740px;width:560px;');
    const st = tag(data.stamp || '', data.stampSmall || '', 'left:1010px;top:770px;font-size:50px;');
    const cb = cube(190);
    cb.el.style.left = '985px'; cb.el.style.top = '220px';
    const plinth = h('div', 'id-steel', 'left:940px;top:470px;width:280px;height:46px;border-radius:8px;');
    plinth.appendChild(h('div', 'id-abs', 'left:0;right:0;top:0;height:5px;border-radius:8px 8px 0 0;background:var(--id-orange);'));
    el.append(
      depth(-40, floorShadow('left:880px;top:500px;width:400px;height:70px;'), reg('left:20px;top:96px;'), reg('left:1320px;top:930px;')),
      depth(0, kick, title, block, sub, dm, plinth, prop('caliper', 380, 'left:400px;top:820px;transform:rotate(-3deg);')),
      depth(30, cb.el, st)
    );
    A.add(kick, 0.15, 0.35, { x: -30, o: 0 }, { x: 0, o: 1 });
    chars.forEach((c, i) => A.add(c, 0.3 + i * 0.06, 0.42, { y: -90, o: 0 }, { y: 0, o: 1 }, 'back'));
    const tB = 0.5 + chars.length * 0.06;
    A.add(block, tB, 0.45, { y: 160, o: 0, r: -4 }, { y: 0, o: 1, r: 0 }, 'drop');
    A.add(sub, tB + 0.35, 0.4, { x: 40, o: 0 }, { x: 0, o: 1 });
    A.add(dm.querySelector('.dl'), tB + 0.6, 0.5, { sx: 0 }, { sx: 1 });
    A.add(dm.querySelector('.dt'), tB + 0.9, 0.25, { o: 0 }, { o: 1 });
    A.add(plinth, 0.4, 0.4, { y: 40, o: 0 }, { y: 0, o: 1 });
    A.add(st, Math.min(D - 1.2, tB + 1.6), 0.18, { s: 1.4, o: 0, r: -8 }, { s: 1, o: 1, r: -5 }, 'back');
    A.fn((t) => {
      const e = EASE.back(clamp01((t - 0.5) / 0.7));
      cb.set(-24 + Math.sin(t * 0.8) * 3, 28 + t * 26, Math.max(0.001, e), -180 * (1 - EASE.out(clamp01((t - 0.5) / 0.6))) + Math.sin(t * 1.4) * 5);
    });
    fadeShadows(el, A, 0.5);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 520, 360, 1.3, 2, -4, -0.4), CAM(1.8, 700, 500, 1.0, 1, -2, 0), CAM(D, 710, 500, 1.04, 0.5, 1, 0)] };
  }

  // ============================== 2. steps 3–5 步工位 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:100px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:96px;top:142px;font-size:96px;', mark(data.title));
    const dm = dim(data.dim || `${n} STEPS`, 'left:100px;top:274px;width:1200px;');
    const bed = h('div', 'id-bed');
    const clip = h('div', 'id-bed-clip');
    bed.append(h('div', 'id-bed-tab', null, esc(data.folder || 'PROJECT /')), h('div', 'id-bed-back'), clip);
    const gap = 20, sw = (1200 - 80 - gap * (n - 1)) / n;
    const sheets = items.map((it, i) => {
      const s = h('div', 'id-glass id-st-card', `left:${40 + i * (sw + gap)}px;width:${sw}px;`,
        `<div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div>`);
      clip.appendChild(s); return s;
    });
    const front = screws(h('div', 'id-bed-front', null, `<div class="hz"></div><div class="vent"></div><div class="big">${esc(data.folderBig || '')}</div><div class="meta">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`), 18);
    bed.appendChild(front);
    const label = tag(data.label || '', data.labelSmall || '', 'right:200px;top:600px;font-size:36px;');
    el.append(depth(-40, reg('left:40px;top:96px;'), reg('left:1320px;top:930px;'), floorShadow('left:60px;top:880px;width:1280px;height:90px;')),
      depth(0, kick, head, dm, bed));
    if (data.label) el.appendChild(depth(30, label));
    A.add(bed, 0.1, 0.5, { s: 1.12, y: -40, o: 0 }, { s: 1, y: 0, o: 1 }, 'drop');
    A.add(kick, 0.3, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.4, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(dm.querySelector('.dl'), 0.8, 0.5, { sx: 0 }, { sx: 1 });
    A.add(dm.querySelector('.dt'), 1.1, 0.25, { o: 0 }, { o: 1 });
    const t0 = 1.3, t1 = Math.max(t0 + 0.5, D - 2.0), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    sheets.forEach((s, i) => A.add(s, t0 + i * stp, 0.42, { y: 240, o: 0 }, { o: 1, y: 0 }, 'back'));
    if (data.label) A.add(label, D - 1.2, 0.25, { s: 1.35, o: 0, r: 6 }, { s: 1, o: 1, r: -3 }, 'back');
    fadeShadows(el, A, 0.1);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 620, 1.2, 2, -3, -0.3), CAM(1.3, 700, 500, 1.0, 1, -1.5, 0), CAM(D, 700, 500, 1.04, 0.5, 1, 0)] };
  }

  // ============================== 3. checklist 磨砂玻璃质检板逐条点亮 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const H = 360 + n * 115 + (data.note ? 190 : 60);
    const el = h('div', 'id-zone');
    const tab = h('div', 'id-glass id-tablet', `height:${H}px;`,
      `<div class="hdr">${esc(data.kicker || '')}<div class="lz"><i></i><i></i><i></i></div></div><div class="rail"></div><div class="ttl">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}<i></i></div><div class="hr"></div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'id-rl', `top:${350 + i * 115}px;`,
        `<div class="box">${PROPS.check(54, 7, '#FFFFFF')}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">QC-${String(i + 1).padStart(2, '0')}</div>`);
      tab.appendChild(r); return r;
    });
    let note = null;
    if (data.note) {
      note = h('div', 'id-note', `top:${350 + n * 115 + 40}px;`, `<small>${esc(data.noteLead || '')}</small><span class="tx">${esc(data.note)}</span><span class="hl"></span>`);
      tab.appendChild(note);
    }
    tab.append(h('i', 'id-screw', `left:14px;top:${H - 28}px;`), h('i', 'id-screw', `right:14px;top:${H - 28}px;`));
    el.append(depth(-40, reg('left:240px;top:96px;'), reg('left:1140px;top:930px;')),
      depth(0, tab),
      depth(30, prop('caliper', 360, 'left:-40px;top:560px;transform:rotate(78deg);'), prop('leds', 0, 'left:1130px;top:210px;')));
    A.add(tab, -1, 0.01, { o: 0, y: -700 }, { o: 0, y: -700 }); // 入场前隐藏，避免邻段时从画面边缘漏出
    A.add(tab, 0, 0.6, { y: -700, r: 1.5, o: 1 }, { y: 0, r: 0, o: 1 }, 'out');
    const t0 = 1.2, t1 = Math.max(t0 + 0.4, D - (note ? 2.4 : 1.2)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    rows.forEach((r, i) => A.add(r, t0 + i * stp, 0.3, { o: 0.2, x: -16 }, { o: 1, x: 0 }));
    const cks = rows.map((r) => r.querySelector('.id-ck')), boxes = rows.map((r) => r.querySelector('.box'));
    if (note) { A.add(note, D - 2.0, 0.3, { o: 0 }, { o: 1 }); A.add(note.querySelector('.hl'), D - 1.5, 0.7, { sx: 0 }, { sx: 1 }, 'inOut'); }
    A.fn((t) => cks.forEach((c, i) => {
      const at = t0 + i * stp + 0.12;
      boxes[i].classList.toggle('on', t >= at);
      c.setAttribute('stroke-dashoffset', (70 * (1 - EASE.out(clamp01((t - at) / 0.25)))).toFixed(1));
    }));
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1010);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 500, 1.0, 1, -2, 0), CAM(1.0, 700, 500, 1.02, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.02, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 4. compare 哑光废件 vs 玻璃合格件 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const L = screws(h('div', 'id-steel id-cmp wrong', 'left:60px;', `<div class="band">${esc(w.label || '✕ WRONG')}</div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div><svg class="strike" width="480" height="160"><path d="M4 92 L470 60" stroke="var(--id-orange)" stroke-width="12" stroke-linecap="round" fill="none" stroke-dasharray="480" stroke-dashoffset="480"/></svg>`));
    const R = screws(h('div', 'id-glass id-cmp right', 'left:820px;', `<div class="band">${esc(r.label || '✓ RIGHT')}</div><div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div>`));
    const vs = h('div', 'id-vs', null, 'VS');
    const xs = tag(w.stamp || '✕', '', 'left:300px;top:610px;font-size:42px;');
    const ck = h('div', 'id-abs', 'left:1220px;top:318px;z-index:7;', PROPS.check(84, 10));
    const verdict = h('div', 'id-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span>`);
    el.append(depth(-40, reg('left:20px;top:96px;'), floorShadow('left:40px;top:700px;width:560px;height:80px;'), floorShadow('left:800px;top:700px;width:560px;height:80px;')),
      depth(0, kick, head, L, R, verdict),
      depth(30, vs, xs, ck, prop('hazard', 200, 'left:1120px;top:250px;transform:rotate(-4deg);')));
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(L, 0.6, 0.45, { y: 140, o: 0, r: -3 }, { y: 0, o: 1, r: -0.8 }, 'drop');
    const tStrike = Math.min(D * 0.3, 2.0);
    const strike = L.querySelector('path');
    A.add(xs, tStrike + 0.6, 0.18, { s: 1.4, o: 0, r: -10 }, { s: 1, o: 1, r: -7 }, 'back');
    A.add(vs, tStrike + 0.3, 0.35, { s: 1.6, o: 0 }, { s: 1, o: 1 }, 'back');
    const tR = Math.min(D * 0.5, tStrike + 1.2);
    A.add(R, tR, 0.45, { y: 140, o: 0, r: 3 }, { y: 0, o: 1, r: 0.6 }, 'drop');
    const ckp = ck.querySelector('.id-ck');
    A.add(verdict, Math.min(D - 1.4, tR + 1.3), 0.45, { y: 140, o: 0 }, { y: 0, o: 1 }, 'drop');
    A.fn((t) => {
      strike.setAttribute('stroke-dashoffset', (480 * (1 - EASE.inOut(clamp01((t - tStrike) / 0.55)))).toFixed(1));
      ckp.setAttribute('stroke-dashoffset', (70 * (1 - EASE.out(clamp01((t - tR - 0.7) / 0.3)))).toFixed(1));
    });
    fadeShadows(el, A, 0.6);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.1, 1, -3, 0), CAM(1.0, 700, 500, 1.0, 0.5, -1.5, 0), CAM(D, 700, 510, 1.02, 0.5, 1.5, 0)] };
  }

  // ============================== 5. showcase 产品展台 / 代码 / 文档 / 终端 / 录屏 ==============================
  /** 无 src 时的工业设备线稿占位（拉丝机身 + 橙色镜环 + 电光青 LED） */
  const DEVICE_SVG = () => {
    const g = `dv${++SEQ}`;
    return `<svg viewBox="0 0 400 300"><defs><linearGradient id="${g}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A5059"/><stop offset=".45" stop-color="#2B2F36"/><stop offset="1" stop-color="#16191E"/></linearGradient><radialGradient id="${g}b" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#5E8FA8"/><stop offset=".35" stop-color="#1C2A36"/><stop offset="1" stop-color="#05080B"/></radialGradient></defs>
      <rect x="92" y="40" width="92" height="34" rx="6" fill="#3A3F47"/><rect x="104" y="30" width="40" height="14" rx="4" fill="#5C636D"/><circle cx="300" cy="58" r="16" fill="#3A3F47"/><circle cx="300" cy="58" r="8" fill="#FF5A1F"/>
      <rect x="40" y="70" width="320" height="200" rx="18" fill="url(#${g}a)"/><rect x="40" y="70" width="320" height="16" rx="8" fill="rgba(255,255,255,.12)"/>
      <rect x="40" y="200" width="320" height="70" rx="0" fill="rgba(0,0,0,.18)"/>
      <circle cx="200" cy="172" r="84" fill="#1D2025"/><circle cx="200" cy="172" r="74" fill="none" stroke="#FF5A1F" stroke-width="8"/><circle cx="200" cy="172" r="58" fill="url(#${g}b)"/><circle cx="200" cy="172" r="58" fill="none" stroke="#5C636D" stroke-width="3"/><ellipse cx="182" cy="152" rx="16" ry="10" fill="rgba(255,255,255,.35)"/>
      <circle cx="330" cy="100" r="6" fill="#00C2A8"/><rect x="66" y="100" width="44" height="10" rx="5" fill="#5C636D"/><rect x="66" y="118" width="30" height="10" rx="5" fill="#5C636D"/></svg>`;
  };
  /** showcase kind:"product" —— 左聚光转台展柜（无 src 用设备线稿）+ 右规格表 + 价格吊牌 */
  function productPanel(data) {
    const el = h('div', 'id-prod');
    const pic = h('div', 'pic', null, '<div class="beam"></div><div class="disc"></div>');
    const obj = h('div', 'obj');
    if (data.src) { const im = h('img'); im.src = data.src; obj.appendChild(im); } else obj.innerHTML = DEVICE_SVG();
    pic.appendChild(obj);
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div><div class="tg">${esc(data.tagline || '')}</div>`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? tag(data.price, data.priceSmall || '', 'right:46px;bottom:34px;font-size:46px;') : null;
    if (price) el.appendChild(price);
    return { el, pic, obj, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:80px;', mark(data.title));
    const dark = kind === 'code' || kind === 'terminal';
    const panel = h('div', `id-panel ${dark ? 'dark' : 'id-glass light'}`, null, `<div class="bar"><i></i><i></i><i></i><span>${esc(data.file || (kind === 'product' ? 'EXHIBIT · PRODUCT' : kind.toUpperCase()))}</span></div>`);
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'id-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'id-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', 'id-code'); panel.appendChild(codeEl); }
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const p = h('div', 'id-note-pin', `left:${(nt.at && nt.at[0]) || 60}%;top:${(nt.at && nt.at[1]) || 30 + i * 20}%;`, `<b>${i + 1}</b><span>${esc(nt.text)}</span>`);
      panel.appendChild(p); return p;
    });
    el.append(depth(-40, reg('left:20px;top:96px;'), floorShadow('left:40px;top:860px;width:1280px;height:90px;')),
      depth(0, kick, head, panel),
      depth(30, prop('hazard', 180, 'left:1120px;top:226px;transform:rotate(3deg);')));
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(panel, 0.3, 0.55, { y: 200, o: 0, s: 0.95 }, { y: 0, o: 1, s: 1 }, 'drop');
    const tType0 = 0.9, tType1 = Math.max(tType0 + 0.6, D * 0.62);
    const total = lines.reduce((a, l) => a + String(l.t || l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.8 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.32, { s: 0.4, o: 0 }, { s: 1, o: 1 }, 'back'));
    if (prod) {
      A.add(prod.pic, 0.7, 0.5, { s: 0.92, o: 0 }, { s: 1, o: 1 }, 'back');
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.28, 0.3, { x: 40, o: 0 }, { x: 0, o: 1 }));
      if (prod.price) A.add(prod.price, Math.min(D - 1.2, 1.3 + prod.rows.length * 0.28 + 0.3), 0.18, { s: 1.4, o: 0, r: -8 }, { s: 1, o: 1, r: -5 }, 'back');
    }
    A.fn((t) => {
      if (prod) { // 转台：设备缓慢自转 + 悬浮呼吸（确定性）
        const ry = Math.sin(t * 0.9) * 16, bob = Math.sin(t * 1.6) * 6 - 20 * (1 - EASE.out(clamp01((t - 0.7) / 0.8)));
        prod.obj.style.transform = `translateY(${bob.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
      }
      if (codeEl) {
        let budget = Math.floor(total * clamp01((t - tType0) / (tType1 - tType0))), html = '', cur = false;
        lines.forEach((l, i) => {
          const tx = String(l.t != null ? l.t : l), cls = l.c || '';
          const k = Math.min(tx.length, budget); budget -= k;
          if (k <= 0 && i > 0) return;
          html += `<span class="ln">${String(i + 1).padStart(2, '0')}</span>${cls ? `<span class="${cls}">${esc(tx.slice(0, k))}</span>` : esc(tx.slice(0, k))}`;
          if (k < tx.length && !cur) { html += '▌'; cur = true; }
          html += '\n';
        });
        codeEl.innerHTML = html;
      }
      if (media && media.tagName === 'VIDEO' && media.readyState >= 1 && media.duration) {
        const want = Math.max(0, t - 0.3) % media.duration;
        if (media.paused && Math.abs(media.currentTime - want) > 0.08) { try { media.currentTime = want; } catch (_) {} }
      }
    });
    fadeShadows(el, A, 0.3);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), media,
      cams: [CAM(0, 700, 560, 0.94, 1, -2, 0), CAM(1.2, 700, 520, 1.0, 1, -1.5, 0), CAM(D, 720, 540, 1.05, 1, 1.5, 0)] };
  }

  // ============================== 6. quote 全屏人像金句（屏幕层暗色金属玻璃卡） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'id-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const card = h('div', 'id-quote', `${right ? 'right:70px;' : 'left:70px;'}`,
      `<div class="k">${esc(data.kicker || 'QUOTE')}</div><div class="id-quote-t">${mark(data.text)}</div><div class="by">${esc(data.by || '')}</div>`);
    screws(card, 12);
    const st = tag(data.stamp || '', data.stampSmall || '', `${right ? 'right:110px;' : 'left:420px;'}top:${data.stampTop || 640}px;font-size:50px;`);
    el.append(card, st);
    A.add(card, 0.5, 0.5, { x: right ? 120 : -120, o: 0 }, { x: 0, o: 1 }, 'drop');
    A.add(st, Math.min(D - 1.0, D * 0.5), 0.18, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -5 }, 'back');
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 7. outro 行动建议 + CTA 控制台 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const acts = (data.actions || []).slice(0, 3).map((a, i) => h('div', 'id-glass id-act', `top:${280 + i * 172}px;`,
      `<div class="no">${String(i + 1).padStart(2, '0')} / ${esc(a.tag || 'ACTION')}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div>`));
    const c = data.cta || {};
    const cta = screws(h('div', 'id-steel id-cta', null, `<div class="k">${esc(c.kicker || 'OPEN SOURCE')}</div><div class="t">${esc(c.title || '')}</div><div class="repo">${esc(c.repo || '')}</div><div class="btns">${(c.buttons || []).slice(0, 3).map((b) => `<span>${esc(b)}</span>`).join('')}</div>`));
    const go = tag(c.stamp || 'GO', c.stampSmall || '', 'left:1110px;top:700px;font-size:60px;', true);
    el.append(depth(-40, reg('left:20px;top:96px;'), reg('left:1320px;top:930px;'), floorShadow('left:670px;top:740px;width:690px;height:90px;')),
      depth(0, kick, head, ...acts, cta),
      depth(30, go, prop('leds', 0, 'left:1130px;top:200px;')));
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    const t0 = 0.7, stp = Math.min(0.7, (D * 0.4) / Math.max(1, acts.length));
    acts.forEach((a, i) => A.add(a, t0 + i * stp, 0.42, { x: -160, o: 0 }, { x: 0, o: 1 }, 'drop'));
    const tC = t0 + acts.length * stp + 0.1;
    A.add(cta, tC, 0.5, { y: 160, o: 0, s: 0.95 }, { y: 0, o: 1, s: 1 }, 'drop');
    A.add(go, Math.min(D - 0.9, tC + 1.2), 0.2, { s: 1.5, o: 0, r: -10 }, { s: 1, o: 1, r: -6 }, 'back');
    fadeShadows(el, A, tC);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.08, 1, -3, 0), CAM(1.2, 700, 500, 1.0, 0.5, -1, 0), CAM(D, 700, 500, 0.98, 0, 1, 0)] };
  }

  // ============================== 共用：数字格式 / 连线几何 ==============================
  function decOf(v) { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; }
  function fmtNum(v, dec) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
  /** 节点盒 a→b 的连线：按主方向取左右 / 上下锚点，返回三次贝塞尔与长度 */
  function linkGeom(a, b, NW, NH) {
    const ax = a.x + NW / 2, ay = a.y + NH / 2, bx = b.x + NW / 2, by = b.y + NH / 2, dx = bx - ax, dy = by - ay;
    let p0, p1, c1, c2;
    if (Math.abs(dx) * NH >= Math.abs(dy) * NW) {
      const sx = Math.sign(dx) || 1; p0 = { x: ax + sx * NW / 2, y: ay }; p1 = { x: bx - sx * (NW / 2 + 16), y: by };
      const mx = (p0.x + p1.x) / 2; c1 = { x: mx, y: p0.y }; c2 = { x: mx, y: p1.y };
    } else {
      const sy = Math.sign(dy) || 1; p0 = { x: ax, y: ay + sy * NH / 2 }; p1 = { x: bx, y: by - sy * (NH / 2 + 16) };
      const my = (p0.y + p1.y) / 2; c1 = { x: p0.x, y: my }; c2 = { x: p1.x, y: my };
    }
    let len = 0, prev = p0;
    for (let k = 1; k <= 24; k++) { const q = bez(p0, c1, c2, p1, k / 24); len += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q; }
    return { p0, p1, c1, c2, len, mid: bez(p0, c1, c2, p1, 0.5), d: `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}` };
  }
  /** 把大数字字号收进卡片可用宽度（首帧按终值测量一次） */
  function fitNums(nums, finals, avail) {
    nums.forEach((nEl, i) => {
      const b = nEl.querySelector('b'), keep = b.textContent; b.textContent = finals[i];
      const w = nEl.scrollWidth; if (w > avail) nEl.style.fontSize = `${Math.floor(parseFloat(nEl.style.fontSize) * avail / w)}px`;
      b.textContent = keep;
    });
  }

  // ============================== 8. stat 大数字 + LED 分段仪表 ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const gap = 40, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 260 : n === 2 ? 190 : 140;
    const cards = items.map((it, i) => screws(h('div', `${i === n - 1 ? 'id-steel hot' : 'id-glass'} id-stat`, `left:${60 + i * (w + gap)}px;width:${w}px;`,
      `<div class="lb">${esc(it.label || '')}</div><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div><div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div>`), 12));
    const nums = cards.map((c) => c.querySelector('.num'));
    const fills = cards.map((c) => c.querySelector('.bar i'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const st = data.delta ? tag(data.delta, data.deltaSmall || '', 'left:990px;top:780px;font-size:54px;') : null;
    const dm = data.note ? dim(data.note, 'left:60px;top:810px;width:860px;') : null;
    const zf = [floorShadow('left:40px;top:700px;width:1320px;height:90px;'), reg('left:20px;top:96px;'), reg('left:1320px;top:930px;')];
    el.append(depth(-40, ...zf), depth(0, kick, head, ...cards, ...(dm ? [dm] : [])), depth(30, prop('leds', 0, 'left:1130px;top:200px;'), ...(st ? [st] : [])));
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    const tIn = cards.map((_, i) => 0.6 + i * 0.55);
    cards.forEach((c, i) => A.add(c, tIn[i], 0.45, { y: 140, o: 0 }, { y: 0, o: 1 }, 'drop'));
    if (dm) { A.add(dm.querySelector('.dl'), D - 2.6, 0.5, { sx: 0 }, { sx: 1 }); A.add(dm.querySelector('.dt'), D - 2.3, 0.25, { o: 0 }, { o: 1 }); }
    if (st) A.add(st, Math.min(D - 1.2, tIn[n - 1] + 1.9), 0.18, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -5 }, 'back');
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 64); fitted = true; }
      items.forEach((it, i) => {
        nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.2) / 1.2)), decs[i]);
        const p = EASE.inOut(clamp01((t - tIn[i] - 1.1) / 0.7));
        fills[i].style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(1)}% 0 0)`;
      });
    });
    fadeShadows(el, A, 0.6);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.1, 1, -3, 0), CAM(1.2, 700, 505, 1.0, 0.5, -1.5, 0), CAM(D, 705, 505, 1.04, 0.5, 1.2, 0)] };
  }

  // ============================== 9. timeline 不锈钢导轨时间轴（长轴横向跟拍） ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'id-zone', `width:${W}px;`);
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const rail = prop('rail', W - 120, 'left:60px;top:532px;');
    const back = depth(-40, reg('left:20px;top:96px;'), floorShadow(`left:40px;top:560px;width:${W - 80}px;height:70px;`));
    const mid = depth(0, kick, head, rail);
    const front = depth(30);
    el.append(back, mid, front);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 290 : 640, at = t0 + i * stp;
      const card = h('div', `${i === now ? 'id-orangep now' : 'id-glass'} id-tl-node`, `left:${x}px;top:${top}px;`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', 'id-tl-stem', `left:${x + 40}px;top:${up ? 498 : 580}px;height:${up ? 36 : 60}px;`);
      const dot = h('div', `id-tl-dot${i === now ? ' now' : ''}`, `left:${x + 28}px;top:546px;`);
      mid.append(stem, card); front.appendChild(dot);
      A.add(dot, at - 0.1, 0.25, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
      A.add(stem, at, 0.2, { o: 0 }, { o: 1 });
      A.add(card, at + 0.05, 0.4, { y: up ? -80 : 80, o: 0 }, { y: 0, o: 1 }, 'drop');
      return { x, up, top, at };
    });
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = tag(data.nowLabel, data.nowSmall || '', `left:${Math.min(W - 300, p.x + (p.up ? 10 : 110))}px;top:${p.up ? 620 : p.top + 196}px;font-size:34px;`, true);
      front.appendChild(ns);
      A.add(ns, Math.min(D - 0.9, p.at + 0.7), 0.18, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -4 }, 'back');
    }
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(rail, 0.4, 0.7, { x: -60, o: 0 }, { x: 0, o: 1 });
    const endX = W - 700;
    fadeShadows(el, A, 0.4);
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.06, 1, -3, 0), CAM(0.9, 700, 505, 1.0, 0.5, -1.5, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 505, 1.0, 0.5, 1.5, 0), CAM(D, endX + 6, 505, 1.02, 0.3, 1.5, 0)] };
  }

  // ============================== 10. diagram 玻璃节点 + 电光青脉冲管线 ==============================
  let DG_SEQ = 0;
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 290, AW = 1280, AH = 610, NW = 260, NH = 124;
    const el = h('div', 'id-zone');
    const kick = h('div', 'id-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'id-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const mid = depth(0, kick, head), front = depth(30);
    el.append(depth(-40, reg('left:20px;top:96px;'), reg('left:1320px;top:930px;')), mid, front);
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = h('div', 'id-glass id-dg-node', `left:${x}px;top:${y}px;`, `<div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      mid.appendChild(e);
      A.add(e, appear[nd.id], 0.4, { s: 0.6, o: 0 }, { s: 1, o: 1 }, 'back');
      return e;
    });
    const mk = `iddg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mk}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill="var(--id-steel)"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path d="${g.d}" stroke="rgba(20,26,34,.10)" stroke-width="14" stroke-linecap="round" fill="none"/>`;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="var(--id-steel)" stroke-width="4" fill="none" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mk})"/>`;
      inner += `<circle class="pl" data-j="${j}" data-k="0" r="7" fill="var(--id-teal)" opacity="0"/><circle class="pl" data-j="${j}" data-k="1" r="7" fill="var(--id-teal)" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'id-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; mid.insertBefore(svg, mid.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    const halos = Array.from(svg.querySelectorAll('path:not(.ln)')).filter((p) => !p.closest('marker'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'id-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'id-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); front.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.4, 0.25, { s: 0.5, o: 0 }, { s: 1, o: 1 }, 'back');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = tag(data.focusLabel, data.focusSmall || '', `left:${Math.min(1120, p.x + 140)}px;top:${p.y - 66}px;font-size:30px;`, true);
      front.appendChild(st);
      A.add(st, tF + 0.25, 0.18, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -4 }, 'back');
    }
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.fn((t) => {
      lnEls.forEach((p, k) => {
        const j = +p.dataset.j, g = geo[j], q = EASE.inOut(clamp01((t - tDraw[j]) / 0.5));
        p.setAttribute('stroke-dashoffset', (g.len * (1 - q)).toFixed(1));
        if (halos[k]) halos[k].setAttribute('opacity', q.toFixed(2));
      });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.6;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.5 + (+r.dataset.k) * 0.5) % 1);
        r.setAttribute('opacity', '1'); r.setAttribute('cx', q.x.toFixed(1)); r.setAttribute('cy', q.y.toFixed(1));
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 560, 1.1, 1, -3, 0), CAM(1.2, 700, 515, 1.0, 0.5, -1.5, 0), CAM(D, 705, 515, 1.03, 0.5, 1.5, 0)] };
  }

  global.Industrial3D = {
    version: '1.1.0',
    PROPS, Animator, EASE, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro },
      stat: { create: stat }, timeline: { create: timeline }, diagram: { create: diagram }
    }
  };
})(window);
