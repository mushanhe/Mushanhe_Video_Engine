/**
 * Mushanhe Video Engine — 风格包 06 · 先锋新粗野主义撞色潮刊（Neo-Brutalism）
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · steps · checklist · compare · showcase[code|terminal|doc|image|video|product] · quote · outro · stat · timeline · diagram
 *
 *   const comp = NeoBrutalism.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : {
 *     el      : HTMLElement  组件根节点（1400×1100 的局部坐标区）
 *     layer   : 'world' | 'screen'   world=挂在 3D 潮刊画布上 / screen=屏幕层（全屏人像上的贴卡）
 *     avatar  : 'card' | 'full'      本段人像形态
 *     cams    : [{ t, x, y, zoom, rx, ry, rz }]  局部坐标运镜关键帧（交给 core/camera-rig.js）
 *     update(localT)                 按本段局部时间渲染（确定性，任意 seek 可还原）
 *   }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：4px #111 硬边框 · 8px / 12px 实体硬偏移黑投影 · 0 圆角 · 明黄/电光蓝/薄荷绿/珊瑚红撞色。
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
    back: (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    /** 硬砸落：快速到位 + 两次衰减回弹 */
    slam: (x) => {
      if (x < 0.45) return EASE.in(x / 0.45);
      const k = (x - 0.45) / 0.55;
      return 1 + Math.sin(k * Math.PI * 2) * 0.06 * (1 - k);
    },
    elastic: (x) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1)
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
        el.style.opacity = clamp01(st.o).toFixed(3);
      });
      this.fns.forEach((f) => f(t));
    }
  }

  const PALETTE = ['var(--nb-yellow)', 'var(--nb-blue)', 'var(--nb-mint)', 'var(--nb-coral)'];
  const ON_DARK = [false, true, false, true]; // 蓝 / 珊瑚红底用白字

  // ============================== 纯 SVG 实体道具 ==============================
  const PROPS = {
    /** 12 角爆炸星贴纸 */
    burst(size = 200, fill = 'var(--nb-mint)', text = '') {
      const c = size / 2, R = c - 6, r = R * 0.72; let pts = '';
      for (let i = 0; i < 24; i++) { const a = (Math.PI * i) / 12 - Math.PI / 2, rr = i % 2 ? r : R; pts += `${(c + rr * Math.cos(a)).toFixed(1)},${(c + rr * Math.sin(a)).toFixed(1)} `; }
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible"><polygon points="${pts}" transform="translate(7 7)" fill="#111111"/><polygon points="${pts}" fill="${fill}" stroke="#111111" stroke-width="4" stroke-linejoin="miter"/>${text ? `<text x="${c}" y="${c + size * 0.07}" text-anchor="middle" font-family="Consolas, monospace" font-weight="900" font-size="${size * 0.2}" fill="#111111">${esc(text)}</text>` : ''}</svg>`;
    },
    /** 粗黑硬箭头（向右） */
    arrow(w = 70, hgt = 50) {
      const m = hgt / 2;
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" style="overflow:visible"><path d="M0 ${m - 8} H${w - 26} V2 L${w} ${m} L${w - 26} ${hgt - 2} V${m + 8} H0 Z" fill="#111111"/></svg>`;
    },
    /** 粗黑折线指示箭头（指向左侧） */
    pointer(len = 90) {
      return `<svg width="${len}" height="40" viewBox="0 0 ${len} 40" style="overflow:visible"><path d="M${len} 20 H18" stroke="#111111" stroke-width="7" fill="none"/><path d="M2 20 L24 6 L24 34 Z" fill="#111111"/></svg>`;
    },
    check(size = 60, stroke = 11) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" style="overflow:visible"><path class="nb-ck" d="M6 30 L22 46 L54 8" stroke="#111111" stroke-width="${stroke}" fill="none" stroke-linecap="square" stroke-linejoin="miter" stroke-dasharray="74" stroke-dashoffset="74"/></svg>`;
    },
    squiggle(w = 260, color = 'var(--nb-coral)') {
      let d = 'M0 14'; for (let x = 0; x < w; x += 26) d += ` q13 -16 26 0`;
      return `<svg width="${w}" height="28" viewBox="0 0 ${w} 28"><path d="${d}" stroke="${color}" stroke-width="7" fill="none"/></svg>`;
    }
  };

  function prop(name, args, style) { return h('div', 'nb-prop', style, PROPS[name](...(args || []))); }
  /** v3.4.1：可选字段没填 → 整块不渲染（不出空条 / 空贴纸 / 空印章 / 默认英文字）；填了的与原来逐像素一致 */
  const blank = (s) => !String(s == null ? '' : s).trim();
  const hideIf = (el, empty) => { if (empty) el.style.display = 'none'; return el; };
  function kicker(text, style) { return hideIf(h('div', 'nb-kicker', style, esc(text)), blank(text)); }
  function sticker(text, bg, style, small) { return hideIf(h('div', 'nb-sticker', `background:${bg};${style || ''}`, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`), blank(text)); }
  function stamp(text, small, style) { return hideIf(h('div', 'nb-stamp', style, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`), blank(text)); }
  /** v3.4.1 铺满版式卡片插图（粗黑线稿，06 同款硬边）：items[i].icon */
  const ICON = {
    motion: '<svg viewBox="0 0 120 120"><rect x="8" y="22" width="104" height="76" fill="none" stroke="currentColor" stroke-width="8"/><path d="M48 42 L80 60 L48 78 Z" fill="currentColor"/><path d="M8 108 H40 M54 108 H70 M84 108 H112" stroke="currentColor" stroke-width="8"/></svg>',
    clock: '<svg viewBox="0 0 120 120"><circle cx="60" cy="64" r="44" fill="none" stroke="currentColor" stroke-width="8"/><path d="M60 38 V64 L80 76" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="square"/><path d="M44 8 H76" stroke="currentColor" stroke-width="8"/></svg>',
    gift: '<svg viewBox="0 0 120 120"><rect x="12" y="46" width="96" height="62" fill="none" stroke="currentColor" stroke-width="8"/><rect x="6" y="30" width="108" height="20" fill="currentColor"/><path d="M60 30 V108" stroke="currentColor" stroke-width="8"/><path d="M60 30 C44 6 22 14 32 30 M60 30 C76 6 98 14 88 30" fill="none" stroke="currentColor" stroke-width="7"/></svg>',
    palette: '<svg viewBox="0 0 120 120"><rect x="8" y="8" width="48" height="48" fill="currentColor"/><rect x="64" y="8" width="48" height="48" fill="none" stroke="currentColor" stroke-width="8"/><rect x="8" y="64" width="48" height="48" fill="none" stroke="currentColor" stroke-width="8"/><rect x="64" y="64" width="48" height="48" fill="currentColor" opacity=".45"/></svg>',
    script: '<svg viewBox="0 0 120 120"><path d="M20 6 H80 L104 30 V114 H20 Z" fill="none" stroke="currentColor" stroke-width="8"/><path d="M36 48 H88 M36 66 H88 M36 84 H70" stroke="currentColor" stroke-width="8"/></svg>',
    subtitle: '<svg viewBox="0 0 120 120"><rect x="6" y="14" width="108" height="70" fill="none" stroke="currentColor" stroke-width="8"/><rect x="22" y="94" width="76" height="18" fill="currentColor"/><path d="M24 38 H96 M24 58 H70" stroke="currentColor" stroke-width="8" opacity=".5"/></svg>',
    preview: '<svg viewBox="0 0 120 120"><rect x="6" y="18" width="108" height="72" fill="none" stroke="currentColor" stroke-width="8"/><path d="M50 36 L76 54 L50 72 Z" fill="currentColor"/><path d="M6 104 H114" stroke="currentColor" stroke-width="8"/><rect x="6" y="98" width="58" height="12" fill="currentColor"/></svg>',
    // v3.4.1 结构版：文件卡 / 收尾铭牌用的线稿
    film: '<svg viewBox="0 0 120 120"><rect x="8" y="14" width="104" height="92" fill="none" stroke="currentColor" stroke-width="8"/><path d="M32 14 V106 M88 14 V106" stroke="currentColor" stroke-width="6"/><path d="M14 30 H26 M14 50 H26 M14 70 H26 M14 90 H26 M94 30 H106 M94 50 H106 M94 70 H106 M94 90 H106" stroke="currentColor" stroke-width="8"/><path d="M50 44 L72 60 L50 76 Z" fill="currentColor"/></svg>',
    doc: '<svg viewBox="0 0 120 120"><path d="M20 6 H80 L104 30 V114 H20 Z" fill="none" stroke="currentColor" stroke-width="8"/><path d="M78 6 V32 H104" fill="none" stroke="currentColor" stroke-width="7"/><path d="M36 52 H88 M36 70 H88 M36 88 H68" stroke="currentColor" stroke-width="8"/></svg>',
    unlock: '<svg viewBox="0 0 120 120"><rect x="14" y="54" width="92" height="60" fill="none" stroke="currentColor" stroke-width="9"/><path d="M34 54 V34 C34 6 80 4 84 30" fill="none" stroke="currentColor" stroke-width="9"/><rect x="54" y="72" width="12" height="24" fill="currentColor"/></svg>',
    nocode: '<svg viewBox="0 0 120 120"><path d="M42 34 L16 60 L42 86 M78 34 L104 60 L78 86" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="square"/><path d="M68 22 L52 98" stroke="currentColor" stroke-width="8"/><circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="7"/><path d="M22 98 L98 22" stroke="currentColor" stroke-width="7"/></svg>'
  };
  /** 聚光（core/focus.js，EP03 原样移植）：只有本段真的读到 cue 时才启用 */
  const FX = () => (global.MHEngine && global.MHEngine.Focus) || null;
  /** v3.4.1 卡片细节润色开关（宿主页按 meta.cardDetail = "trim" 写 html[data-mh-card]） */
  const TRIM = () => global.document.documentElement.getAttribute('data-mh-card') === 'trim';
  /** 轻抖：落定后 0.4s 衰减横抖（叠在 Animator 写好的 transform 前面） */
  function shakeAt(el, t, t0, amp = 9) {
    const ds = t - t0;
    if (ds <= 0 || ds >= 0.4) return;
    const d = 1 - ds / 0.4;
    el.style.transform = `translate(${(amp * Math.sin(ds * 55) * d).toFixed(1)}px, 0px) rotate(${(1.6 * Math.sin(ds * 55 + 1) * d).toFixed(2)}deg) ${el.style.transform}`;
  }
  /** 牌子退场时刻：所属分句最后一个字念完后 0.08s 开始（0.16s 退完，≤ 分句结束后 0.24s）；没有 words 返回 null */
  /** cue 版印章 / 贴纸砸落：词起点那一帧就看得见（不透明度从 0.4 起），其余与 slamIn 相同；入场前隐藏 */
  const slamCue = (A, el, at, r = -8, s0 = 1.9) => { A.add(el, -1, 0.01, { o: 0 }, { o: 0 }); A.add(el, at, 0.22, { s: s0, o: 0.4, r: r - 6 }, { s: 1, o: 1, r }, 'slam'); };
  const clauseOut = (ctx, at) => { const ce = ctx.clauseEnd ? ctx.clauseEnd(at, null) : null; return ce == null ? null : ce + 0.08; };
  function tape(style) { return h('div', 'nb-tape', style); }
  /** "这句**关键词**话" → ** 包裹部分做高亮底块 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .nb-zone{position:absolute;width:1400px;height:1100px;font-family:var(--nb-font-cn);color:var(--nb-ink)}
  .nb-abs{position:absolute}
  .nb-box{position:absolute;border:4px solid var(--nb-ink);box-shadow:8px 8px 0 var(--nb-ink);box-sizing:border-box}
  .nb-box.lg{box-shadow:12px 12px 0 var(--nb-ink)}
  .nb-kicker{position:absolute;padding:7px 16px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-mono);font-size:21px;font-weight:900;letter-spacing:.14em;white-space:nowrap}
  .nb-head{position:absolute;font-weight:900;letter-spacing:-.02em;line-height:1.06;color:var(--nb-ink);white-space:nowrap}
  .nb-zone em,.nb-q em{font-style:normal;background:var(--nb-yellow);color:var(--nb-ink);padding:0 .12em;box-shadow:5px 5px 0 var(--nb-ink);border:3px solid var(--nb-ink)}
  .nb-zone em.c,.nb-cover-sub em{background:var(--nb-coral);color:#fff}
  .nb-prop{position:absolute;z-index:5}
  .nb-prop svg{display:block}
  .nb-sticker{position:absolute;z-index:6;padding:10px 20px;border:3px solid var(--nb-ink);box-shadow:5px 5px 0 var(--nb-ink);font-family:var(--nb-font-mono);font-size:24px;font-weight:900;color:var(--nb-ink);white-space:nowrap;line-height:1.1}
  .nb-sticker small{display:block;font-size:.55em;letter-spacing:.18em;margin-top:4px}
  .nb-stamp{position:absolute;z-index:8;padding:10px 26px 12px;background:var(--nb-coral);color:#fff;border:5px solid var(--nb-ink);box-shadow:7px 7px 0 var(--nb-ink);font-weight:900;text-align:center;line-height:1.02;white-space:nowrap;outline:3px solid #fff;outline-offset:-12px}
  .nb-stamp small{display:block;font-family:var(--nb-font-mono);font-size:.34em;letter-spacing:.22em;margin-top:6px}
  .nb-tape{position:absolute;z-index:7;width:150px;height:38px;background:var(--nb-mint);border:3px solid var(--nb-ink);box-sizing:border-box;
    background-image:repeating-linear-gradient(45deg,rgba(17,17,17,.16) 0 6px,transparent 6px 14px)}
  /* cover */
  .nb-cover-block{position:absolute;left:60px;top:176px;padding:26px 46px 34px;background:var(--nb-yellow);border:4px solid var(--nb-ink);box-shadow:12px 12px 0 var(--nb-ink);transform-origin:20% 80%}
  .nb-cover-title{font-size:140px;font-weight:900;letter-spacing:-.03em;line-height:1.04;white-space:nowrap}
  .nb-cover-title span{display:inline-block}
  .nb-cover-ch{position:absolute;left:60px;top:610px;width:290px;height:290px;background:var(--nb-blue);color:#fff}
  .nb-cover-ch .l{position:absolute;left:22px;top:18px;padding:4px 10px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-mono);font-size:20px;font-weight:900;letter-spacing:.2em}
  .nb-cover-ch .n{position:absolute;left:18px;bottom:0;font-family:var(--nb-font-latin);font-size:200px;font-weight:900;letter-spacing:-.06em;line-height:1;-webkit-text-stroke:4px var(--nb-ink);text-shadow:8px 8px 0 var(--nb-ink)}
  .nb-cover-sub{position:absolute;left:400px;top:610px;padding:26px 34px;background:#fff;font-size:46px;font-weight:900;line-height:1.36;white-space:nowrap}
  /* steps */
  .nb-ticket{position:absolute;top:330px;height:400px;padding:86px 22px 20px;color:var(--nb-ink)}
  .nb-ticket.inv{color:#fff}
  .nb-ticket .no{position:absolute;left:-4px;top:-4px;width:76px;height:64px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-mono);font-size:32px;font-weight:900;display:flex;align-items:center;justify-content:center}
  .nb-ticket .nm{font-size:62px;font-weight:900;line-height:1.05;white-space:nowrap}
  .nb-ticket .fn{position:absolute;left:20px;right:20px;bottom:22px;padding:10px 12px;background:#fff;color:var(--nb-ink);border:3px solid var(--nb-ink);font-family:var(--nb-font-mono);font-size:20px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .nb-ticket .hole{position:absolute;right:18px;top:18px;width:26px;height:26px;border:4px solid var(--nb-ink);background:var(--nb-paper)}
  .nb-steps-bar{position:absolute;left:60px;top:800px;width:1280px;height:104px;background:var(--nb-ink);color:var(--nb-yellow);display:flex;align-items:center;gap:24px;padding:0 30px}
  .nb-steps-bar .f{font-family:var(--nb-font-mono);font-size:30px;font-weight:900;letter-spacing:.06em;white-space:nowrap}
  .nb-steps-bar .b{padding:4px 14px;background:var(--nb-yellow);color:var(--nb-ink);font-family:var(--nb-font-latin);font-size:42px;font-weight:900;white-space:nowrap}
  .nb-steps-bar .m{margin-left:auto;margin-right:250px;font-family:var(--nb-font-mono);font-size:16px;font-weight:900;color:#fff;line-height:1.4;text-align:right;white-space:nowrap}
  /* checklist */
  .nb-card{position:absolute;left:250px;top:100px;width:900px;background:#fff}
  .nb-card .hd{height:58px;background:var(--nb-yellow);border-bottom:4px solid var(--nb-ink);display:flex;align-items:center;gap:12px;padding:0 24px;font-family:var(--nb-font-mono);font-size:19px;font-weight:900;letter-spacing:.16em;white-space:nowrap}
  .nb-card .hd i{width:18px;height:18px;border:3px solid var(--nb-ink);background:var(--nb-coral);display:inline-block}
  .nb-card .hd i:nth-child(2){background:var(--nb-blue)}.nb-card .hd i:nth-child(3){background:var(--nb-mint)}
  .nb-card .ttl{position:absolute;left:40px;top:76px;font-family:var(--nb-font-latin);font-size:96px;font-weight:900;letter-spacing:-.04em;line-height:1;white-space:nowrap}
  .nb-card .sub{position:absolute;left:44px;top:190px;font-size:34px;font-weight:900;white-space:nowrap}
  .nb-card .hr{position:absolute;left:40px;right:40px;top:252px;height:6px;background:var(--nb-ink)}
  .nb-row{position:absolute;left:40px;right:40px;height:100px}
  .nb-row .hl{position:absolute;left:78px;top:14px;height:50px;width:520px;transform-origin:left center;border:3px solid var(--nb-ink)}
  .nb-row .box{position:absolute;left:0;top:14px;width:54px;height:54px;border:4px solid var(--nb-ink);background:#fff;box-shadow:4px 4px 0 var(--nb-ink);box-sizing:border-box}
  .nb-row .box svg{position:absolute;left:-4px;top:-14px}
  .nb-row .k{position:absolute;left:92px;top:12px;font-size:40px;font-weight:900;white-space:nowrap}
  .nb-row .d{position:absolute;left:94px;top:68px;font-size:23px;font-weight:800;color:#555;white-space:nowrap}
  .nb-row .n{position:absolute;right:0;top:20px;padding:3px 8px;border:3px solid var(--nb-ink);font-family:var(--nb-font-mono);font-size:17px;font-weight:900}
  .nb-memo{position:absolute;right:46px;z-index:6;padding:18px 26px 20px;background:var(--nb-blue);color:#fff;font-size:40px;font-weight:900;white-space:nowrap}
  .nb-memo small{display:block;font-family:var(--nb-font-mono);font-size:17px;letter-spacing:.14em;margin-bottom:8px;color:var(--nb-yellow)}
  /* compare */
  .nb-cmp{position:absolute;top:290px;width:540px;height:440px;overflow:visible}
  .nb-cmp .band{height:58px;border-bottom:4px solid var(--nb-ink);font-family:var(--nb-font-mono);font-size:21px;font-weight:900;letter-spacing:.14em;padding:14px 22px;box-sizing:border-box;white-space:nowrap}
  .nb-cmp.wrong{background:#DEDAD0}.nb-cmp.wrong .band{background:var(--nb-coral);color:#fff}
  .nb-cmp.right{background:var(--nb-mint)}.nb-cmp.right .band{background:var(--nb-ink);color:var(--nb-mint)}
  .nb-cmp .t{position:absolute;left:30px;top:90px;font-size:58px;font-weight:900;line-height:1.14;white-space:nowrap}
  .nb-cmp.wrong .t{color:#77736A}
  .nb-cmp .d{position:absolute;left:30px;right:30px;top:262px;font-size:26px;font-weight:800;line-height:1.5}
  .nb-cmp.wrong .d{color:#77736A}
  .nb-cmp svg.strike{position:absolute;left:18px;top:96px;overflow:visible}
  .nb-cmp .badge{position:absolute;right:-22px;top:-26px;width:76px;height:76px;background:var(--nb-ink);border:4px solid var(--nb-ink);box-shadow:5px 5px 0 var(--nb-blue);display:flex;align-items:center;justify-content:center}
  .nb-vs{position:absolute;left:632px;top:440px;width:136px;height:136px;z-index:6}
  .nb-vs .dm{position:absolute;inset:0;background:var(--nb-ink);transform:rotate(45deg);box-shadow:8px 0 0 var(--nb-yellow)}
  .nb-vs .tx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--nb-font-latin);font-size:56px;font-weight:900;color:var(--nb-yellow);letter-spacing:-.04em}
  .nb-verdict{position:absolute;left:60px;top:800px;width:1280px;height:116px;background:var(--nb-yellow);display:flex;align-items:center;gap:26px;padding:0 30px;z-index:7}
  .nb-verdict b{padding:6px 14px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-mono);font-size:20px;letter-spacing:.18em;white-space:nowrap}
  .nb-verdict span{font-size:46px;font-weight:900;white-space:nowrap}
  .nb-verdict span em{background:var(--nb-coral);color:#fff}
  /* showcase */
  .nb-panel{position:absolute;left:60px;top:262px;width:1240px;height:640px;overflow:hidden}
  .nb-panel.dark{background:var(--nb-ink);color:#F6F1E3;box-shadow:12px 12px 0 var(--nb-blue)}
  .nb-panel.light{background:#fff;color:var(--nb-ink)}
  .nb-panel .bar{height:56px;display:flex;align-items:center;gap:10px;padding:0 18px;background:var(--nb-blue);border-bottom:4px solid var(--nb-ink);font-family:var(--nb-font-mono);font-size:19px;font-weight:900;letter-spacing:.1em;color:#fff}
  .nb-panel.light .bar{background:var(--nb-yellow);color:var(--nb-ink)}
  .nb-panel .bar i{width:20px;height:20px;border:3px solid var(--nb-ink);display:inline-block;background:var(--nb-coral)}
  .nb-panel .bar i:nth-child(2){background:var(--nb-yellow)}.nb-panel .bar i:nth-child(3){background:var(--nb-mint)}
  .nb-panel .bar span{margin-left:14px;padding:2px 12px;background:var(--nb-ink);color:#fff}
  .nb-code{padding:24px 30px;font-family:var(--nb-font-mono);font-size:30px;font-weight:700;line-height:1.62;white-space:pre}
  .nb-code .ln{display:inline-block;width:52px;color:#6B6B6B}
  .nb-code .c{color:#8F8F8F}.nb-code .k{color:var(--nb-yellow)}.nb-code .ok{color:var(--nb-mint)}
  .nb-code .cur{display:inline-block;width:.6em;background:var(--nb-yellow);color:var(--nb-yellow)}
  .nb-panel.light .nb-code{font-family:var(--nb-font-cn);font-size:34px;font-weight:800}
  .nb-panel.light .nb-code .ln{color:#AAA}.nb-panel.light .nb-code .k{color:var(--nb-blue)}.nb-panel.light .nb-code .ok{color:#009E69}
  .nb-media{position:absolute;left:0;right:0;top:56px;width:100%;height:calc(100% - 56px);object-fit:cover;background:#000}
  .nb-callout{position:absolute;display:flex;align-items:center;gap:0;z-index:6}
  .nb-callout span{padding:10px 18px;border:4px solid var(--nb-ink);box-shadow:5px 5px 0 var(--nb-ink);font-size:26px;font-weight:900;color:var(--nb-ink);white-space:nowrap}
  /* quote（屏幕层） */
  .nb-q{position:absolute;top:196px;width:fit-content;min-width:420px;max-width:700px;padding:36px 44px 42px;box-sizing:border-box;background:var(--nb-coral);color:#fff;border:5px solid var(--nb-ink);box-shadow:14px 14px 0 var(--nb-ink)}
  .nb-q .k{display:inline-block;padding:6px 14px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-mono);font-size:18px;font-weight:900;letter-spacing:.18em}
  .nb-q .t{font-size:64px;font-weight:900;line-height:1.28;margin-top:22px;text-shadow:5px 5px 0 var(--nb-ink)}
  .nb-q .t em{text-shadow:none}
  .nb-q .by{margin-top:24px;display:inline-block;padding:6px 14px;background:#fff;color:var(--nb-ink);border:3px solid var(--nb-ink);font-family:var(--nb-font-mono);font-size:18px;font-weight:900;letter-spacing:.1em}
  .nb-stamp.yellow{background:var(--nb-yellow);color:var(--nb-ink);outline-color:var(--nb-ink)}
  .nb-stamp.mint{background:var(--nb-mint);color:var(--nb-ink);outline-color:var(--nb-ink)}
  /* outro */
  .nb-act{position:absolute;left:60px;width:580px;height:164px;background:#fff;padding:20px 26px;box-sizing:border-box}
  .nb-act .tg{display:inline-block;padding:3px 12px;border:3px solid var(--nb-ink);font-family:var(--nb-font-mono);font-size:17px;font-weight:900;letter-spacing:.14em}
  .nb-act .t{font-size:40px;font-weight:900;line-height:1.2;margin-top:8px;white-space:nowrap}
  .nb-act .d{font-family:var(--nb-font-mono);font-size:19px;font-weight:800;color:#555;margin-top:2px;white-space:nowrap}
  .nb-act .no{position:absolute;right:20px;top:16px;font-family:var(--nb-font-latin);font-size:64px;font-weight:900;color:transparent;-webkit-text-stroke:3px var(--nb-ink);line-height:1}
  .nb-cta{position:absolute;left:700px;top:280px;width:640px;height:500px;background:var(--nb-blue);color:#fff;padding:36px 40px;box-sizing:border-box}
  .nb-cta .k{display:inline-block;padding:6px 14px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-mono);font-size:19px;font-weight:900;letter-spacing:.18em}
  .nb-cta .t{font-size:66px;font-weight:900;margin-top:18px;line-height:1.1;white-space:nowrap;text-shadow:5px 5px 0 var(--nb-ink)}
  .nb-cta .repo{margin-top:24px;padding:14px 18px;background:#fff;color:var(--nb-ink);border:4px solid var(--nb-ink);font-family:var(--nb-font-mono);font-size:25px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .nb-cta .btns{display:flex;gap:18px;margin-top:34px}
  .nb-cta .btns span{flex:1;text-align:center;padding:14px 0;border:4px solid var(--nb-ink);color:var(--nb-ink);font-size:32px;font-weight:900;box-shadow:6px 6px 0 var(--nb-ink)}
  /* stat */
  .nb-stat{position:absolute;top:300px;height:440px;padding:30px 30px 0;background:#fff;overflow:hidden}
  .nb-stat.hot{background:var(--nb-yellow)}
  .nb-stat .lb{display:inline-block;padding:5px 12px;background:var(--nb-ink);color:#fff;font-family:var(--nb-font-mono);font-size:19px;font-weight:900;letter-spacing:.1em;white-space:nowrap}
  .nb-stat .num{display:inline-block;margin-top:24px;font-family:var(--nb-font-latin);font-weight:900;letter-spacing:-.05em;line-height:1;white-space:nowrap;color:var(--nb-ink)}
  .nb-stat.hot .num{text-shadow:7px 7px 0 var(--nb-coral)}
  .nb-stat .num .u,.nb-stat .num .pf{font-family:var(--nb-font-cn);font-size:.26em;letter-spacing:0;margin-left:.15em;vertical-align:.2em;text-shadow:none}
  .nb-stat .num .pf{margin:0 .1em 0 0}
  .nb-stat .bar{position:absolute;left:30px;right:30px;bottom:50px;height:30px;background:#fff;border:4px solid var(--nb-ink);box-sizing:border-box}
  .nb-stat .bar i{position:absolute;left:0;top:0;bottom:0;background:var(--nb-ink);transform-origin:left center}
  .nb-stat.hot .bar i{background:var(--nb-coral)}
  .nb-stat .sc{position:absolute;right:30px;bottom:14px;font-family:var(--nb-font-mono);font-size:17px;font-weight:900}
  /* timeline */
  .nb-tl-line{position:absolute;left:60px;top:546px;height:18px;background:var(--nb-ink);box-shadow:0 7px 0 var(--nb-yellow);transform-origin:left center}
  .nb-tl-node{position:absolute;width:240px;height:200px;padding:16px 20px}
  .nb-tl-node .tm{display:inline-block;padding:2px 10px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-latin);font-size:40px;font-weight:900;letter-spacing:-.03em;line-height:1.1;white-space:nowrap}
  .nb-tl-node .t{font-size:34px;font-weight:900;margin-top:12px;white-space:nowrap}
  .nb-tl-node .d{font-size:19px;font-weight:800;margin-top:6px;line-height:1.35;opacity:.85}
  .nb-tl-node.inv{color:#fff}
  .nb-tl-stem{position:absolute;width:6px;background:var(--nb-ink)}
  .nb-tl-dot{position:absolute;width:34px;height:34px;background:#fff;border:5px solid var(--nb-ink);box-sizing:border-box;z-index:6}
  .nb-tl-dot.now{background:var(--nb-coral)}
  /* diagram */
  .nb-dg-node{position:absolute;width:260px;height:124px;padding:0;background:#fff;z-index:3;overflow:hidden}
  .nb-dg-node .bd{height:14px;border-bottom:4px solid var(--nb-ink)}
  .nb-dg-node .l{padding:10px 18px 0;font-size:36px;font-weight:900;white-space:nowrap}
  .nb-dg-node .s{padding:2px 18px 0;font-family:var(--nb-font-mono);font-size:17px;font-weight:900;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .nb-dg-node.hot{background:var(--nb-coral);color:#fff}
  .nb-dg-node.hot .s{color:#fff}
  .nb-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .nb-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .nb-dg-tag{padding:4px 12px;background:var(--nb-ink);color:var(--nb-yellow);font-family:var(--nb-font-mono);font-size:17px;font-weight:900;white-space:nowrap;box-shadow:4px 4px 0 var(--nb-yellow)}
  /* showcase · product */
  .nb-prod{position:absolute;left:0;right:0;top:56px;bottom:0;background:#fff}
  .nb-prod .pic{position:absolute;left:30px;top:30px;bottom:34px;width:490px;background:var(--nb-paper);border:4px solid var(--nb-ink);box-shadow:8px 8px 0 var(--nb-ink);box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;
    background-image:radial-gradient(rgba(17,17,17,.17) 1.8px,transparent 1.8px);background-size:22px 22px}
  .nb-prod .pic img{width:100%;height:100%;object-fit:contain}
  .nb-prod .pic svg{width:80%;height:auto;color:var(--nb-ink)}
  .nb-prod .info{position:absolute;left:570px;right:40px;top:30px}
  .nb-prod .nm{font-size:56px;font-weight:900;line-height:1.08;white-space:nowrap}
  .nb-prod .tg{display:inline-block;margin-top:12px;padding:4px 12px;background:var(--nb-mint);border:3px solid var(--nb-ink);font-size:22px;font-weight:900;white-space:nowrap}
  .nb-prod .specs{margin-top:20px;border-top:6px solid var(--nb-ink)}
  .nb-prod .row{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:3px solid var(--nb-ink);white-space:nowrap}
  .nb-prod .row .k{font-family:var(--nb-font-mono);font-size:19px;font-weight:900;letter-spacing:.06em;color:#555}
  .nb-prod .row .v{font-size:26px;font-weight:900}
  /* v3.4.1 · 聚光亮边（core/focus.js）+ cue 版对比卡（行 / 按钮 / 风格色块 / 光标 / 数字进度条） */
  .nb-zone .mh-focus-ring{position:absolute;inset:-18px;border:7px solid var(--nb-coral);box-shadow:8px 8px 0 var(--nb-ink);pointer-events:none;z-index:9}
  .nb-ticket .ico{position:absolute;right:22px;bottom:22px;opacity:.9}
  .nb-ticket .ico svg{display:block;width:100%;height:100%}
  .nb-ticket .pgb{position:absolute;left:22px;right:22px;bottom:22px;background:rgba(255,255,255,.55);border:4px solid var(--nb-ink);box-sizing:border-box}
  .nb-ticket .pgb i{position:absolute;left:0;top:0;bottom:0;width:100%;background:repeating-linear-gradient(-45deg,var(--nb-ink) 0 10px,var(--nb-yellow) 10px 20px);transform-origin:left center;transform:scaleX(0)}
  /* v3.4.1 · 卡片细节润色（meta.cardDetail = "trim"，宿主页写 html[data-mh-card]；不写 = 原样逐像素不变）
     照 EP03 48–78s 工业板卡：内沿细线（距边 8px、1.5px、同色加深）+ 四角 L 角标 + 聚光卡同色柔光 + 卡底进度条边缘干净。位置 / 尺寸 / 字 / 颜色都不动。 */
  html[data-mh-card="trim"] .nb-zone .nb-ticket::before,html[data-mh-card="trim"] .nb-zone .nb-cmp.cue::before,html[data-mh-card="trim"] .nb-zone .nb-cstat::before{content:'';position:absolute;inset:8px;border:1.5px solid rgba(17,17,17,.3);pointer-events:none}
  html[data-mh-card="trim"] .nb-zone .nb-ticket::after,html[data-mh-card="trim"] .nb-zone .nb-cmp.cue::after,html[data-mh-card="trim"] .nb-zone .nb-cstat::after{content:'';position:absolute;inset:8px;pointer-events:none;--c:rgba(17,17,17,.72);
    background:linear-gradient(var(--c),var(--c)) left top/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) left top/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) right top/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) right top/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) left bottom/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) left bottom/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) right bottom/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) right bottom/3px 22px no-repeat}
  html[data-mh-card="trim"] .nb-zone .nb-ticket.inv::before{border-color:rgba(17,17,17,.5)}
  html[data-mh-card="trim"] .nb-zone .nb-cmp.wrong{--nb-glow:#DEDAD0}
  html[data-mh-card="trim"] .nb-zone .nb-cmp.right{--nb-glow:var(--nb-mint)}
  html[data-mh-card="trim"] .nb-zone .mh-focus-ring:not(.row){box-shadow:8px 8px 0 var(--nb-ink),0 0 34px 10px color-mix(in srgb,var(--nb-glow,var(--nb-yellow)) 62%,transparent)}
  html[data-mh-card="trim"] .nb-ticket .pgb::before{content:'';position:absolute;z-index:1;top:0;bottom:0;width:4px;left:calc(var(--p,0) * 100% - 2px);background:var(--nb-ink);opacity:var(--pe,0)}
  html[data-mh-card="trim"] .nb-ticket .pgb::after{content:'';position:absolute;z-index:2;inset:-4px;border:4px solid var(--nb-ink);pointer-events:none}
  html[data-mh-card="trim"] .nb-ticket .pgb i{top:-1px;bottom:-1px;left:-1px;width:calc(100% + 2px);transform:none;clip-path:inset(0 calc((1 - var(--p,0)) * 100%) 0 0)}
  .nb-cmp .tlx{position:absolute;left:30px;right:30px;border:4px solid var(--nb-ink);background:#CFCABF;box-sizing:border-box;overflow:hidden}
  .nb-cmp .tlx .trk{position:absolute;left:0;right:0;border-bottom:3px solid rgba(17,17,17,.35)}
  .nb-cmp .tlx .clp{position:absolute;top:6px;bottom:6px;border:3px solid var(--nb-ink);box-sizing:border-box}
  .nb-cmp .tlx .ph{position:absolute;top:0;bottom:0;width:5px;background:var(--nb-coral)}
  .nb-slot{position:absolute;border:4px solid rgba(17,17,17,.5);box-shadow:8px 8px 0 rgba(17,17,17,.14);box-sizing:border-box;background-color:rgba(255,255,255,.35);background-image:repeating-linear-gradient(-45deg,rgba(17,17,17,.1) 0 3px,transparent 3px 16px)}
  .nb-slot b{position:absolute;left:18px;top:8px;font-family:var(--nb-font-latin);font-size:58px;font-weight:900;color:transparent;-webkit-text-stroke:2px rgba(17,17,17,.32);line-height:1}
  .nb-zone .mh-focus-ring.row{inset:-2px -12px -6px -12px;border-width:5px;box-shadow:5px 5px 0 var(--nb-ink)}
  .nb-ticket .nm.fit{white-space:nowrap}
  .nb-cmp.noband .t{top:30px}
  .nb-cmp.cue{top:270px;height:480px}
  .nb-cmp.cue .t{font-size:70px;line-height:1.1}
  .nb-cmp.cue.wrong .t{color:#5E5A52}
  .nb-cmp.cue .rws{top:136px}
  .nb-cmp.cue .rw{font-size:56px;height:86px}
  .nb-cmp.cue .rw i{width:28px;height:28px}
  .nb-cmp.cue .sw{top:200px;height:136px}
  .nb-cmp.cue .btn{font-size:46px}
  .nb-cmp .rws{position:absolute;left:30px;right:30px;top:118px}
  .nb-cmp .rw{position:relative;display:flex;align-items:center;gap:18px;height:72px;font-size:48px;font-weight:900;white-space:nowrap;color:var(--nb-ink)}
  .nb-cmp .rw i{width:24px;height:24px;background:var(--nb-coral);border:4px solid var(--nb-ink);flex:none}
  .nb-cmp .sw{position:absolute;left:30px;right:30px;top:180px;height:126px;border:4px solid var(--nb-ink);box-shadow:6px 6px 0 var(--nb-ink);box-sizing:border-box;overflow:hidden;background:#fff}
  .nb-cmp .sw i{position:absolute;top:0;bottom:0;border-left:4px solid var(--nb-ink)}
  .nb-cmp .sw i:first-child{border-left:0}
  .nb-cmp .btn{position:absolute;left:30px;bottom:30px;padding:10px 30px 12px;background:var(--nb-yellow);border:4px solid var(--nb-ink);box-shadow:6px 6px 0 var(--nb-ink);font-size:40px;font-weight:900;white-space:nowrap;line-height:1.1}
  .nb-cursor{position:absolute;z-index:12;left:0;top:0;width:58px;height:58px;pointer-events:none}
  .nb-cursor svg{display:block;width:100%;height:100%;overflow:visible}
  .nb-ripple{position:absolute;z-index:11;left:0;top:0;width:130px;height:130px;margin:-65px 0 0 -65px;border:7px solid var(--nb-ink);border-radius:50%;box-sizing:border-box;pointer-events:none}
  .nb-cstat{position:absolute;left:60px;top:786px;width:1280px;height:128px;background:var(--nb-yellow);display:flex;align-items:center;gap:30px;padding:0 34px;z-index:7;box-sizing:border-box}
  .nb-cstat .lb{padding:8px 16px;background:var(--nb-ink);color:var(--nb-yellow);font-size:32px;font-weight:900;white-space:nowrap}
  .nb-cstat .num{font-family:var(--nb-font-latin);font-size:100px;font-weight:900;letter-spacing:-.04em;line-height:1;white-space:nowrap;text-shadow:6px 6px 0 var(--nb-coral)}
  .nb-cstat .num b{display:inline-block;min-width:1.25em;text-align:right}
  .nb-cstat .num .u{font-family:var(--nb-font-cn);font-size:46px;margin-left:8px;text-shadow:none;letter-spacing:0}
  .nb-cstat .pg{flex:1;height:40px;background:#fff;border:4px solid var(--nb-ink);position:relative;box-sizing:border-box}
  .nb-cstat .pg i{position:absolute;left:0;top:0;bottom:0;width:100%;background:var(--nb-coral);transform-origin:left center;transform:scaleX(0)}
  /* v3.4.1 结构版 · cover cue 版（不带字的装饰第 0 帧就在）/ 文件卡进 AI / 收尾铭牌 + 铭牌底板 + 大横条（只有剧本写了对应字段才出现） */
  .nb-cv{position:absolute;left:0;top:0;width:1400px;height:1100px}
  .nb-cv-block{position:absolute;background-color:var(--nb-yellow);box-sizing:border-box;background-image:radial-gradient(rgba(17,17,17,.08) 2px,transparent 2px);background-size:22px 22px}
  .nb-cv-title{position:absolute;font-weight:900;letter-spacing:-.03em;line-height:1.04;white-space:nowrap;color:var(--nb-ink)}
  .nb-cv-title span{display:inline-block}
  .nb-cv-blue{position:absolute;background:var(--nb-blue);color:#fff;display:flex;align-items:center;justify-content:center}
  .nb-cv-blue svg{display:block;width:100%;height:100%}
  .nb-cv-dots{position:absolute;background-color:var(--nb-coral);background-image:radial-gradient(rgba(17,17,17,.34) 3px,transparent 3px);background-size:22px 22px}
  .nb-cv-chip{position:absolute;border:4px solid var(--nb-ink);box-shadow:6px 6px 0 var(--nb-ink);box-sizing:border-box}
  .nb-file{position:absolute;box-sizing:border-box;color:var(--nb-ink);transform-origin:50% 50%}
  .nb-file .ic{position:absolute}
  .nb-file .ic svg{display:block;width:100%;height:100%}
  .nb-file .lb{position:absolute;font-weight:900;line-height:1;white-space:nowrap;letter-spacing:-.01em}
  .nb-file .ear{position:absolute;right:-4px;top:-4px;background:linear-gradient(225deg,var(--nb-paper) 0 50%,var(--nb-ink) 50% calc(50% + 4px),rgba(17,17,17,.2) calc(50% + 4px))}
  .nb-ai{position:absolute;box-sizing:border-box;background:var(--nb-ink);display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;box-shadow:12px 12px 0 var(--nb-yellow)}
  .nb-ai b{font-family:var(--nb-font-latin);font-weight:900;color:var(--nb-yellow);letter-spacing:-.04em;line-height:1}
  .nb-ai .mini{position:absolute;display:flex;align-items:center;gap:12px;color:var(--nb-yellow)}
  .nb-ai .mini i{display:block;height:100%;flex:none}
  .nb-ai .mini i svg{display:block;width:100%;height:100%}
  .nb-ai .mini u{display:block;flex:1;height:40%;border:3px solid var(--nb-yellow);background:repeating-linear-gradient(-45deg,var(--nb-yellow) 0 7px,transparent 7px 14px)}
  .nb-ai.lit{box-shadow:12px 12px 0 var(--nb-yellow),0 0 46px 14px rgba(255,229,0,.55)}
  .nb-board{position:absolute;background-color:#DEDAD0;background-image:radial-gradient(rgba(17,17,17,.15) 2px,transparent 2px);background-size:24px 24px}
  .nb-screw{position:absolute;width:20px;height:20px;border-radius:50%;background:#C9C3B4;border:3px solid var(--nb-ink);box-sizing:border-box}
  .nb-screw::after{content:'';position:absolute;left:1px;right:1px;top:50%;height:3px;margin-top:-1.5px;background:var(--nb-ink);transform:rotate(-35deg)}
  .nb-plate{position:absolute;display:flex;align-items:center;box-sizing:border-box;color:var(--nb-ink);white-space:nowrap;transform-origin:50% 50%}
  .nb-plate.inv{color:#fff}
  .nb-plate .tx{font-weight:900;line-height:1;letter-spacing:-.02em}
  .nb-plate .ic{margin-left:auto;flex:none}
  .nb-plate .ic svg{display:block;width:100%;height:100%}
  .nb-banner{position:absolute;display:flex;align-items:center;box-sizing:border-box;background:var(--nb-ink);color:var(--nb-yellow);box-shadow:10px 10px 0 var(--nb-yellow);font-weight:900;white-space:nowrap}
  .nb-banner .ar{margin-left:auto;flex:none}
  html[data-mh-card="trim"] .nb-zone .nb-file::before,html[data-mh-card="trim"] .nb-zone .nb-plate::before{content:'';position:absolute;inset:8px;border:1.5px solid rgba(17,17,17,.3);pointer-events:none}
  html[data-mh-card="trim"] .nb-zone .nb-plate.inv::before{border-color:rgba(17,17,17,.5)}
  html[data-mh-card="trim"] .nb-zone .nb-file::after,html[data-mh-card="trim"] .nb-zone .nb-plate::after{content:'';position:absolute;inset:8px;pointer-events:none;--c:rgba(17,17,17,.72);
    background:linear-gradient(var(--c),var(--c)) left top/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) left top/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) right top/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) right top/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) left bottom/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) left bottom/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) right bottom/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) right bottom/3px 22px no-repeat}
  `;
  function injectCSS() {
    if (document.getElementById('nb-components-css')) return;
    const st = document.createElement('style'); st.id = 'nb-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  /** 印章重盖：放大透明 → 狠砸到位 */
  const slamIn = (A, el, at, r = -8, s0 = 1.9) => A.add(el, at, 0.22, { s: s0, o: 0, r: r - 6 }, { s: 1, o: 1, r }, 'slam');

  // ============================== 1. cover 撞色潮刊封面 ==============================
  function cover(data, ctx) {
    if (Array.isArray(data.parts) && data.parts.length) return coverCue(data, ctx);   // v3.4.1 结构版（不写 parts = 下面原版，逐帧不变）
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const block = h('div', 'nb-cover-block');
    const title = h('div', 'nb-cover-title'); block.appendChild(title);
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const ch = hideIf(h('div', 'nb-box lg nb-cover-ch', null, `${blank(data.chapterLabel) ? '' : `<div class="l">${esc(data.chapterLabel)}</div>`}<div class="n">${esc(data.chapter || '')}</div>`), blank(data.chapter));
    const sub = hideIf(h('div', 'nb-box nb-cover-sub', null, mark(data.subtitle)), blank(data.subtitle));
    const dm = sticker(data.dim || '', 'var(--nb-mint)', 'left:430px;top:840px;');
    const st = stamp(data.stamp || '', data.stampSmall || '', 'left:1010px;top:250px;font-size:70px;');
    const t1 = tape('left:24px;top:196px;transform:rotate(-24deg);');
    const t2 = tape('left:560px;top:500px;transform:rotate(18deg);width:120px;');
    const star = prop('burst', [190, 'var(--nb-mint)', 'NEW!'], 'left:1130px;top:560px;');
    const sq = prop('squiggle', [240, 'var(--nb-coral)'], 'left:1080px;top:880px;');
    el.append(kick, block, ch, sub, dm, st, t1, t2, star, sq);
    A.add(kick, 0.1, 0.3, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(block, 0.2, 0.5, { y: -620, r: 6, o: 1 }, { y: 0, r: -2, o: 1 }, 'slam');
    A.add(block, -1, 0.01, { o: 0, y: -620 }, { o: 0, y: -620 });
    chars.forEach((c, i) => A.add(c, 0.55 + i * 0.05, 0.4, { s: 0.2, o: 0, r: i % 2 ? 12 : -12 }, { s: 1, o: 1, r: 0 }, 'back'));
    const tB = 0.75 + chars.length * 0.05;
    A.add(t1, tB, 0.16, { s: 1.4, o: 0 }, { s: 1, o: 1, r: -24 });
    A.add(t2, tB + 0.08, 0.16, { s: 1.4, o: 0 }, { s: 1, o: 1, r: 18 });
    A.add(ch, tB + 0.1, 0.45, { y: 300, o: 0, r: 8 }, { y: 0, o: 1, r: 1.5 }, 'back');
    A.add(sub, tB + 0.35, 0.45, { x: 260, o: 0, r: 4 }, { x: 0, o: 1, r: -1 }, 'back');
    A.add(dm, tB + 0.7, 0.35, { s: 0, o: 0, r: 20 }, { s: 1, o: 1, r: -3 }, 'back');
    A.add(star, tB + 0.5, 0.5, { s: 0, o: 0, r: -90 }, { s: 1, o: 1, r: 8 }, 'back');
    A.add(sq, tB + 0.9, 0.3, { sx: 0, o: 1 }, { sx: 1, o: 1 });
    slamIn(A, st, Math.min(D - 1.2, tB + 1.4), -9);
    // 爆炸星缓慢自转（确定性）
    A.fn((t) => { if (t > tB + 1.0) star.style.transform = `rotate(${(8 + (t - tB - 1.0) * 18).toFixed(1)}deg)`; });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 520, 380, 1.3, 2, -4, -1), CAM(1.6, 700, 500, 1.0, 1, -1.5, 0), CAM(D, 715, 505, 1.04, 0.5, 1, 0.3)] };
  }

  /**
   * v3.4.1 结构版 · cover 的 cue 版（写了 parts 就走这里；不写 = 上面的原版，逐帧不变）——「一上来就封面炸场」：
   *   parts：[{ text, cue, br }] → 大标题按词分段砸出（第一段砸出，后面的段补出；br = 另起一行）；size：标题字号（屏幕像素，默认 168）
   *   stamp + stampCue：印章跟词砸在标题右下（不越出组件区），所属分句念完就退
   *   不带字的装饰（黄色标题块、胶带、蓝色色块 + 播放线稿、点阵白板、三色条、爆炸星、波浪线）第 0 帧就在；带字的一律跟词出
   *   then：{ cue, type, data } → 说到 cue 那一帧封面整块收起，同一段接着放这个句型（如 steps 卡片页，同一个 ctx / 组件区）；
   *         本段的牌子仍写在本段 data.badges（如「平时剪口播」先作标签出现在封面上，dock 到 then 的标题位）
   * 版式按组件区（ctx.area，铺满版式）摆；没有组件区时按 06 局部安全区摆。
   */
  function coverCue(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const AR = ctx.area || { x0: 60, x1: 1340, y0: 120, y1: 960, k: 1 };
    const k = AR.k, X = (u) => AR.x0 + u * k, Y = (v) => AR.y0 + v * k, S = (p) => p * k;
    const AW = (AR.x1 - AR.x0) / k;   // 组件区宽（屏幕像素）
    const cue = (c, fb = null) => (ctx.cue ? ctx.cue(c, fb) : fb);
    const el = h('div', 'nb-zone');
    const cv = h('div', 'nb-cv');   // 封面整块（收起时一起动）
    const fs = +data.size > 0 ? +data.size : 168, bw = Math.min(900, AW - 280), bh = Math.max(420, Math.round(fs * 2.08 + 44));
    // ---- 不带字的装饰：第 0 帧就在 ----
    const chips = ['var(--nb-blue)', 'var(--nb-mint)', 'var(--nb-coral)'].map((c, i) => h('div', 'nb-cv-chip', `left:${X(bw + 70 + i * 22)}px;top:${Y(36 + i * 76)}px;width:${S(200)}px;height:${S(56)}px;background:${c};`));
    const blue = h('div', 'nb-box lg nb-cv-blue', `left:${X(0)}px;top:${Y(Math.max(490, bh + 60))}px;width:${S(300)}px;height:${S(270)}px;padding:${S(50)}px;`, ICON.motion.replace('<svg ', '<svg style="color:#fff" '));
    const dots = h('div', 'nb-box nb-cv-dots', `left:${X(340)}px;top:${Y(Math.max(500, bh + 70))}px;width:${S(bw - 360)}px;height:${S(240)}px;`);
    const block = h('div', 'nb-box lg nb-cv-block', `left:${X(0)}px;top:${Y(20)}px;width:${S(bw)}px;height:${S(bh)}px;transform-origin:20% 80%;`);
    const title = h('div', 'nb-cv-title', `left:${S(44)}px;top:${S(26)}px;font-size:${S(fs)}px;`);
    block.appendChild(title);
    const t1 = tape(`left:${X(-34)}px;top:${Y(34)}px;width:${S(170)}px;height:${S(42)}px;`);
    const t2 = tape(`left:${X(bw - 130)}px;top:${Y(bh - 4)}px;width:${S(150)}px;height:${S(40)}px;`);
    const star = prop('burst', [S(190), 'var(--nb-mint)', ''], `left:${X(bw + 82)}px;top:${Y(520)}px;`);
    const sq = prop('squiggle', [S(220), 'var(--nb-coral)'], `left:${X(bw + 40)}px;top:${Y(752)}px;`);
    // ---- 带字的：跟词出 ----
    const parts = data.parts.map((p) => (typeof p === 'string' ? { text: p } : p || {})).filter((p) => !blank(p.text));
    let fb = 0.4;
    const groups = parts.map((p, j) => {
      if (p.br && j > 0) title.appendChild(document.createElement('br'));
      const at = cue(p.cue != null ? p.cue : p.text, fb); fb = (at == null ? fb : at) + 0.5;
      const cs = Array.from(String(p.text)).map((c) => { const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); return s; });
      return { at: at == null ? fb - 0.5 : at, cs };
    });
    const tS = !blank(data.stamp) ? cue(data.stampCue != null ? data.stampCue : data.stamp, null) : null;
    const st = stamp(tS == null ? '' : data.stamp, '', `right:${1400 - X(Math.min(AW - 70, bw + 200))}px;top:${Y(bh - 76)}px;font-size:${S(104)}px;transform-origin:100% 100%;`);
    cv.append(chips[0], chips[1], chips[2], blue, dots, block, t1, t2, star, sq, st);
    el.appendChild(cv);
    // 静态姿态（第 0 帧起）
    const REST = new Map([[block, -1.2], [blue, 1.6], [dots, -0.8], [t1, -24], [t2, 16], [chips[0], -3], [chips[1], 2], [chips[2], -1.5]]);
    REST.forEach((r, e) => A.add(e, -1, 0.01, { r }, { r }));
    groups.forEach((g, j) => g.cs.forEach((c, m) => {   // 词起点那一帧第一个字就看得见（0.5 起），整组 0.1s 内砸完
      A.add(c, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(c, g.at + m * 0.03, 0.3, { s: 1.8, o: 0.5, r: m % 2 ? 10 : -10 }, { s: 1, o: 1, r: 0 }, 'slam');
    }));
    if (groups.length) A.add(block, groups[0].at, 0.32, { s: 1.035, r: -2.4 }, { s: 1, r: -1.2 }, 'out');   // 标题砸下时标题块一震
    let tOutS = null;
    if (tS != null) {
      slamCue(A, st, tS, -8, 1.45);
      tOutS = clauseOut(ctx, tS);
      if (tOutS != null) A.add(st, tOutS, 0.16, { s: 1, o: 1, r: -8 }, { s: 0.75, o: 0, r: -8 }, 'in');
    }
    // ---- then：说到 cue 那一帧封面整块收起，同一段接着放下一个句型 ----
    let child = null, tT = null;
    const th = data.then;
    if (th && th.type) {
      const f = ({ steps, checklist, compare, outro, stat, timeline, diagram })[th.type];
      if (f) { child = f(th.data || {}, ctx); if (child.layer !== 'world') child = null; }
      if (child) {
        child.el.style.left = '0px'; child.el.style.top = '0px'; el.appendChild(child.el);
        tT = cue(th.cue, null); if (tT == null) tT = D * 0.5;
        cv.style.transformOrigin = `${X(AW / 2)}px ${Y(300)}px`;
        A.add(cv, tT, 0.01, { o: 1 }, { o: 0 });   // 硬切收起：这一帧起封面整块不见（不和卡 1 半透明叠字）
      }
    }
    // 爆炸星缓慢自转、波浪线横移（确定性）
    A.fn((t) => {
      star.style.transform = `rotate(${(8 + t * 14).toFixed(1)}deg)`;
      sq.style.transform = `translateX(${(6 * Math.sin(t * 2.2)).toFixed(1)}px)`;
    });
    const update = (t) => { A.update(t); if (child) child.update(t); };
    return { el, layer: 'world', avatar: 'card', update,
      cams: child && child.cams ? child.cams : [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)] };
  }

  // ============================== 2. steps 撞色票据卡逐张砸落 ==============================
  // v3.4.1（cue 版，全部可选；不写 = 原样逐帧不变）：
  //   items[i].cue 说到这个词砸下 + 聚光（当前亮边微放大，前面的压暗）；items[i].title 可用 \n 换行（过宽自动缩字）；
  //   items[i].sticker { text, cue, shake }：在这张卡上砸贴纸，所属分句念完就退场；
  //   titleCue：标题 / kicker 跟这个词出；doneCue：说到这个词时已出现的卡一起亮一下（完成感）；
  //   exitCue："end"（本段最后一个字念完）或某个词 → 整组收起。dim / folder 没填就不出（不再自动写「N STEPS」「PROJECT /」）。
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = hideIf(h('div', 'nb-head', 'left:56px;top:156px;font-size:96px;', mark(data.title)), blank(data.title));
    const tag = sticker(data.dim || '', 'var(--nb-yellow)', 'left:1110px;top:170px;font-size:34px;');
    const AW = 56, cw = (1280 - AW * (n - 1)) / n;
    const cards = items.map((it, i) => h('div', `nb-box lg nb-ticket${ON_DARK[i % 4] ? ' inv' : ''}`, `left:${60 + i * (cw + AW)}px;width:${cw}px;background:${PALETTE[i % 4]};--nb-glow:${PALETTE[i % 4]};`,
      `<div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="hole"></div><div class="nm">${esc(it.title).replace(/\n/g, '<br/>')}</div>${blank(it.desc) ? '' : `<div class="fn">${esc(it.desc)}</div>`}`));
    const arrows = items.slice(1).map((_, i) => prop('arrow', [44, 46], `left:${60 + (i + 1) * (cw + AW) - AW + 2}px;top:508px;`));
    const hasBar = !blank(data.folder) || !blank(data.folderBig) || !blank(data.folderMeta);
    const bar = hasBar ? h('div', 'nb-box nb-steps-bar', 'box-shadow:8px 8px 0 var(--nb-yellow);',
      `<div class="f">▣ ${esc(data.folder || '')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`) : null;
    const label = data.label ? sticker(data.label, 'var(--nb-coral)', 'left:1070px;top:776px;color:#fff;font-family:var(--nb-font-cn);font-size:36px;', data.labelSmall || '') : null;
    el.append(kick, head, tag, ...cards, ...arrows);
    if (bar) el.appendChild(bar);
    if (label) el.appendChild(label);
    const tH = ctx.cue ? ctx.cue(data.titleCue, null) : null;   // 标题跟词出（不写 = 原节奏）
    if (tH != null) {   // 标题跟词：词起点那一帧就看得见
      [kick, head].forEach((e) => A.add(e, -1, 0.01, { o: 0 }, { o: 0 }));
      A.add(kick, tH, 0.3, { o: 0.4 }, { o: 1 });
      A.add(head, tH, 0.4, { y: -40, o: 0.45 }, { y: 0, o: 1 }, 'back');
    } else {
      A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
      A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    }
    A.add(tag, 0.6, 0.35, { s: 0, o: 0, r: -30 }, { s: 1, o: 1, r: 4 }, 'back');
    if (bar) A.add(bar, 0.5, 0.45, { y: 200, o: 0 }, { y: 0, o: 1 }, 'back');
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.5, D - 2.2), t0 + 0.6 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    // v3.4：items[i].cue = 口播里的词 → 这张卡在说到这个词的那一帧砸下来；不写 cue 时沿用原节奏（逐帧不变）
    const tc = items.map((it, i) => (ctx.cue ? ctx.cue(it.cue, t0 + i * stp) : t0 + i * stp));
    const REST = [-1.6, 1.4, -1.2, 1.6, -1.4];
    // 铺满版式下卡片原地砸出（放大 → 落定），不从上方飞过标题；其余版式照旧从上方砸落
    const POP = !!(ctx.area && items.some((it) => ctx.cue && ctx.cue(it.cue, null) != null));
    if (POP) {
      cards.forEach((c, i) => { c.style.transformOrigin = '50% 0%'; A.add(c, tc[i], 0.32, { s: 1.06, o: 0.45, r: [-4, 3, -3, 4, -3][i] }, { s: 1, o: 1, r: REST[i] }, 'slam'); });   // 以卡片上沿为轴放大，不往上顶到标题
      cards.forEach((c) => A.add(c, -1, 0.01, { o: 0 }, { o: 0 }));
    } else {
      cards.forEach((c, i) => A.add(c, tc[i], 0.5, { y: -760, r: [-9, 7, -6, 8, -7][i], o: 1 }, { y: 0, o: 1, r: REST[i] }, 'slam'));
      cards.forEach((c) => A.add(c, -1, 0.01, { o: 0, y: -760 }, { o: 0, y: -760 })); // 入场前隐藏
    }
    arrows.forEach((a, i) => A.add(a, tc[i + 1] + 0.25, 0.3, { s: 0, o: 0, x: -20 }, { s: 1, o: 1, x: 0 }, 'back'));
    if (label) A.add(label, D - 1.3, 0.4, { s: 0, o: 0, r: 25 }, { s: 1, o: 1, r: -4 }, 'back');

    // ---- v3.4.1：聚光 / 完成一起亮 / 卡上贴纸 / 整组收起（只在读到 cue 时启用） ----
    const cued = items.some((it) => ctx.cue && ctx.cue(it.cue, null) != null);
    const slots = [];
    const AR = ctx.area;
    if (cued && AR) {   // v3.4.1 铺满版式（meta.layout = "fill"）：卡片按组件区铺满，字号按屏幕像素算（k = 局部 / 屏幕）
      const k = AR.k, W = AR.x1 - AR.x0, g = (n <= 2 ? 100 : 48) * k, cwF = (W - g * (n - 1)) / n, chF = (n <= 2 ? 560 : 440) * k;
      // titleSpace（屏幕像素）：标题由屏幕层牌子停靠过来（badges dock）时，给它在组件区顶部留的高度
      const hasTitle = !blank(data.title) || +data.titleSpace > 0, top0 = hasTitle ? AR.y0 + (+data.titleSpace > 0 ? +data.titleSpace : 116) * k : AR.y0, topC = top0 + Math.max(0, (AR.y1 - top0 - chF) / 2);
      Object.assign(head.style, { left: `${AR.x0}px`, top: `${AR.y0}px`, fontSize: `${Math.round(84 * k)}px` });
      Object.assign(kick.style, { left: `${AR.x0}px`, top: `${AR.y0 - 52 * k}px` });
      cards.forEach((c, i) => {
        Object.assign(c.style, { left: `${AR.x0 + i * (cwF + g)}px`, top: `${topC}px`, width: `${cwF}px`, height: `${chF}px`, paddingTop: `${108 * k}px`, paddingLeft: `${26 * k}px` });
        c.querySelector('.nm').style.fontSize = `${Math.round((n <= 2 ? 86 : 64) * k)}px`;
        Object.assign(c.querySelector('.no').style, { width: `${96 * k}px`, height: `${76 * k}px`, fontSize: `${36 * k}px` });
      });
      arrows.forEach((a, i) => { a.style.left = `${AR.x0 + (i + 1) * (cwF + g) - g / 2 - 22}px`; a.style.top = `${topC + chF / 2 - 23}px`; });
      // 卡片下半：线稿插图（items[i].icon）；data.progress → 卡底进度条（AI 在跑：这张卡出现起填，下一张出现 / 「跑完」时填满）
      cards.forEach((c, i) => {
        const ic = ICON[items[i].icon];
        const pgH = data.progress ? 34 * k : 0, isz = Math.min(cwF - 44, (n <= 2 ? 190 : 150) * k);
        if (ic) c.appendChild(h('div', 'ico', `width:${isz}px;height:${isz}px;bottom:${22 + (pgH ? pgH + 18 * k : 0)}px;color:${ON_DARK[i % 4] ? '#FFFFFF' : 'var(--nb-ink)'};`, ic));
        if (pgH) c.appendChild(h('div', 'pgb', `height:${pgH}px;`, '<i></i>'));
      });
      if (data.slots) cards.forEach((c, i) => {
        const sl = h('div', 'nb-slot', `left:${c.style.left};top:${topC}px;width:${cwF}px;height:${chF}px;`, `<b>${String(i + 1).padStart(2, '0')}</b>`);
        el.insertBefore(sl, cards[0]); slots.push(sl);
      });
    } else if (cued) {   // cue 版版式：总宽收到 1200（亮边 / 放大 / 贴纸不顶人像卡）；卡少时卡名放大；没有底栏时整组下移、卡片加高
      const big = n <= 2 ? 92 : n === 3 ? 76 : 62, W2 = 1200, cw2 = (W2 - AW * (n - 1)) / n;
      cards.forEach((c, i) => {
        c.style.left = `${60 + i * (cw2 + AW)}px`; c.style.width = `${cw2}px`;
        c.querySelector('.nm').style.fontSize = `${big}px`; if (!bar) { c.style.top = '372px'; c.style.height = '430px'; }
      });
      arrows.forEach((a, i) => { a.style.left = `${60 + (i + 1) * (cw2 + AW) - AW + 2}px`; if (!bar) a.style.top = '565px'; });
      // slots: true → 标题出来时先摆好虚线空位（带编号），卡片砸进空位后空位消失
      if (data.slots) cards.forEach((c, i) => {
        const sl = h('div', 'nb-slot', `left:${c.style.left};top:${bar ? 330 : 372}px;width:${cw2}px;height:${bar ? 400 : 430}px;`, `<b>${String(i + 1).padStart(2, '0')}</b>`);
        el.insertBefore(sl, cards[0]); slots.push(sl);
      });
    }
    // v3.4.1 结构版 · intake：步骤卡之前的「素材丢给 AI」（只在铺满版式 + cue 版里生效；不写 = 原样逐帧不变）
    //   intake：{ files: [{ text, cue, icon }], ai: { text, cue }, size: [宽, 高], aiW, aiScale } → 文件卡（默认 360×240）跟词出，
    //   几张卡自己在组件区正中排开；AI 框（默认 280×240，黑底黄字）在 ai.cue 砸在组件区正中，文件卡同时从两侧飞进框（0.4s 内），
    //   框一鼓、放大到 aiScale（默认 1.3），框底亮出收进来的文件小图标 + 在跑的斜纹条；第一张步骤卡出现那一帧收起（不占步骤卡的位）
    const IN = data.intake && cued && AR ? data.intake : null;
    const inFx = [];
    if (IN) {
      const k = AR.k, X = (u) => AR.x0 + u * k, Y = (v) => AR.y0 + v * k, cue = (c, fb = null) => (ctx.cue ? ctx.cue(c, fb) : fb);
      const files = (IN.files || []).map((f) => (typeof f === 'string' ? { text: f } : f || {})).filter((f) => !blank(f.text)).slice(0, 3);
      const ai = IN.ai && !blank(IN.ai.text) ? IN.ai : null;
      const sz = Array.isArray(IN.size) ? IN.size : [], FW = +sz[0] || 360, FH = +sz[1] || 240, AIW = +IN.aiW || 280, G1 = 48;   // 屏幕像素
      const fk = Math.max(1, Math.min(FW / 360, FH / 240));   // v3.5：卡放大时字号 / 线稿 / 折角跟着放大（默认尺寸 = 1，原样）
      const tot = files.length * FW + Math.max(0, files.length - 1) * G1;   // AI 框出现前，文件卡自己居中（不给还没出现的 AI 框留空位）
      const AWs = (AR.x1 - AR.x0) / k, AHs = (AR.y1 - AR.y0) / k, top0s = +data.titleSpace > 0 ? +data.titleSpace : 116;
      const u0 = Math.max(0, (AWs - tot) / 2), vMid = (AHs - FH) / 2, v0 = vMid >= top0s ? vMid : top0s + Math.max(0, (AHs - top0s - FH) / 2);   // 整个组件区上下居中（不压标题位时）
      const FC = ['var(--nb-yellow)', 'var(--nb-mint)', 'var(--nb-coral)'], FI = ['film', 'doc', 'script'];
      const fEls = files.map((f, i) => {
        const e = h('div', 'nb-box lg nb-file', `left:${X(u0 + i * (FW + G1))}px;top:${Y(v0)}px;width:${FW * k}px;height:${FH * k}px;background:${FC[i % 3]};`,
          `<div class="ear" style="width:${54 * fk * k}px;height:${54 * fk * k}px;"></div><div class="ic" style="left:${26 * fk * k}px;top:${24 * fk * k}px;width:${96 * fk * k}px;height:${96 * fk * k}px;">${ICON[f.icon] || ICON[FI[i % 3]]}</div>` +
          `<div class="lb" style="left:${26 * fk * k}px;bottom:${22 * fk * k}px;font-size:${Math.round(Math.min(80 * fk, (FW - 60 * fk) / Math.max(1, Array.from(String(f.text)).length)) * k)}px;">${esc(f.text)}</div>`);
        return e;
      });
      const uA = (AWs - AIW) / 2;   // AI 框在组件区正中
      const aiEl = ai ? h('div', 'nb-box lg nb-ai', `left:${X(uA)}px;top:${Y(v0)}px;width:${AIW * k}px;height:${FH * k}px;`, `<b style="font-size:${Math.round(Math.min(128 * fk, (AIW - 50) / (0.62 * Math.max(1, String(ai.text).length))) * k)}px;margin-bottom:${54 * fk * k}px;">${esc(ai.text)}</b>` +
        `<div class="mini" style="left:${22 * fk * k}px;right:${22 * fk * k}px;bottom:${18 * fk * k}px;height:${Math.round(FH * 0.2) * k}px;">${files.map((f, i) => `<i style="width:${Math.round(FH * 0.2) * k}px;">${ICON[f.icon] || ICON[FI[i % 3]]}</i>`).join('')}<u></u></div>`) : null;
      [aiEl, ...fEls].filter(Boolean).forEach((e) => el.insertBefore(e, cards[0] || null));   // 文件卡在 AI 框上层：飞进去时从框上方缩进去
      const tF = files.map((f, i) => cue(f.cue != null ? f.cue : f.text, tc[0] - 1.2 + i * 0.4));
      const tA = ai ? cue(ai.cue != null ? ai.cue : ai.text, null) : null, tE = tc[0], FLY = 0.38;
      const RR = [-1.5, 1.2, -1];
      fEls.forEach((e, i) => {
        A.add(e, -1, 0.01, { o: 0 }, { o: 0 });
        // 还没出齐时，已出的卡按「已出的张数」居中；下一张出来时滑到最终并排位（不偏一边）
        const offAt = (m) => ((files.length - m) * (FW + G1) / 2) * k;   // 只出了 m 张时的横向偏移
        A.add(e, tF[i], 0.3, { s: 1.08, o: 0.45, r: RR[i] * 2.5, x: offAt(i + 1) }, { s: 1, o: 1, r: RR[i], x: offAt(i + 1) }, 'slam');
        for (let m = i + 1; m < files.length; m++) if (tF[m] != null && (tA == null || tF[m] < tA)) A.add(e, Math.max(tF[i] + 0.3, tF[m] - 0.15), 0.2, { s: 1, o: 1, r: RR[i], x: offAt(m) }, { s: 1, o: 1, r: RR[i], x: offAt(m + 1) }, 'out');   // 提前 0.15s 让位，下一张的词那一帧已基本到位、不重叠
        if (tA != null) {   // 飞进 AI 框：平移到框中心 + 缩小，最后几帧淡掉
          const dx = (uA + AIW / 2 - (u0 + i * (FW + G1) + FW / 2)) * k, dy = 0;
          A.add(e, tA, FLY, { x: 0, y: 0, s: 1, o: 1, r: RR[i] }, { x: dx, y: dy, s: 0.18, o: 0.3, r: RR[i] * 6 }, 'inOut');
          A.add(e, tA + FLY, 0.02, { x: dx, y: dy, s: 0.18, o: 0 }, { x: dx, y: dy, s: 0.18, o: 0 });
        } else if (tE != null) A.add(e, tE, 0.2, { o: 1, s: 1, r: RR[i] }, { o: 0, s: 0.6, r: RR[i] }, 'out');
      });
      if (aiEl) {
        A.add(aiEl, -1, 0.01, { o: 0 }, { o: 0 });
        A.add(aiEl, tA, 0.3, { s: 1.2, o: 0.5, r: 2 }, { s: 1, o: 1, r: 1 }, 'slam');
        // 两张卡进框后：框一鼓、放大到 aiScale（AI 在处理，画面不空）
        const SC = +IN.aiScale > 0 ? +IN.aiScale : 1.3;
        A.add(aiEl, tA + FLY, 0.42, { s: 1.12, o: 1, r: 1 }, { s: SC, o: 1, r: 0 }, 'inOut');
        if (tE != null) A.add(aiEl, tE, 0.2, { s: SC, o: 1, r: 0 }, { s: 0.6, o: 0, r: 0, y: -30 * k }, 'out');
        const mini = aiEl.querySelector('.mini'), mIs = Array.from(mini.querySelectorAll('i')), run = mini.querySelector('u');
        mIs.forEach((e, i) => A.add(e, -1, 0.01, { o: 0 }, { o: 0 }).add(e, tA + FLY - 0.04 + i * 0.05, 0.22, { s: 1.6, o: 0.5 }, { s: 1, o: 1 }, 'back'));
        A.add(run, -1, 0.01, { o: 0 }, { o: 0 }).add(run, tA + FLY + 0.1, 0.2, { o: 0 }, { o: 1 });
        inFx.push((t) => {
          aiEl.classList.toggle('lit', t >= tA && (tE == null || t < tE));
          run.style.backgroundPosition = `${(-(t * 60) % 28).toFixed(1)}px 0`;   // 斜纹条在跑（AI 在处理）
        });
      }
    }
    const F = FX();
    const fo = F && cued && data.focus !== false ? cards.map((c) => F.attach(c)) : null;
    const tDones = (Array.isArray(data.doneCue) ? data.doneCue : [data.doneCue]).map((c) => (cued && ctx.cue ? ctx.cue(c, null) : null)).filter((x) => x != null);
    let tOut = null;
    if (cued && data.exitCue != null) tOut = data.exitCue === 'end' ? (ctx.clauseEnd ? ctx.clauseEnd(D, null) : null) : (ctx.cue ? ctx.cue(data.exitCue, null) : null);
    const stks = items.map((it, i) => {
      const o = typeof it.sticker === 'string' ? { text: it.sticker } : it.sticker;
      if (!o || blank(o.text)) return null;
      const st = sticker(o.text, 'var(--nb-coral)', `right:26px;top:-44px;color:#fff;font-family:var(--nb-font-cn);font-size:${AR ? Math.round(56 * AR.k) : 46}px;padding:12px 24px 14px;border-width:4px;box-shadow:6px 6px 0 var(--nb-ink);z-index:10;`);
      cards[i].appendChild(st);
      const at = ctx.cue ? ctx.cue(o.cue != null ? o.cue : o.text, tc[i] + 0.8) : tc[i] + 0.8;
      const out = clauseOut(ctx, at);
      slamCue(A, st, at, 6, 1.9);
      if (out != null) A.add(st, out, 0.16, { s: 1, o: 1, r: 6 }, { s: 0.75, o: 0, r: 6 }, 'in');
      return { at, shake: o.shake !== false, card: cards[i] };
    });
    if (slots.length) {
      // 空位：每张卡提前 slotLead 秒（默认 1.2s）摆出「下一张」的位子，不长时间空挂（最早跟标题一起）
      const tS0 = tH != null ? tH : Math.max(0, tc[0] - 0.6), lead = +data.slotLead > 0 ? +data.slotLead : 1.2;
      slots.forEach((sl, i) => {
        const ta = Math.min(tc[i] - 0.15, Math.max(tS0, tc[i] - lead));
        A.add(sl, -1, 0.01, { o: 0 }, { o: 0 });
        A.add(sl, ta, 0.3, { o: 0, s: 0.9 }, { o: 1, s: 1 }, 'back');
        A.add(sl, tc[i] + 0.3, 0.12, { o: 1 }, { o: 0 });
      });
    }
    if (tOut != null) {
      [kick, head, tag, ...arrows].forEach((e) => A.add(e, tOut, 0.22, { o: 1 }, { o: 0 }, 'in'));
      cards.forEach((c, i) => A.add(c, tOut + i * 0.035, 0.26, { y: 0, o: 1, r: REST[i], s: 1 }, { y: -120, o: 0, r: REST[i] * 4, s: 0.55 }, 'in'));
    }
    let fitted = false;
    A.fn((t) => {
      if (!fitted) {   // 卡名过宽自动缩字（只在溢出时动，原 demo 不溢出 → 不变）
        cards.forEach((c) => { const nm = c.querySelector('.nm'); if (nm.clientWidth > 0) { fitted = true; if (nm.scrollWidth > nm.clientWidth + 1) nm.style.fontSize = `${Math.floor(parseFloat(global.getComputedStyle(nm).fontSize) * nm.clientWidth / nm.scrollWidth)}px`; } });
      }
      if (fo) {
        const f = F.track(t, tc, { flashes: tDones.map((x) => [x, x + 0.6]) });
        fo.forEach((o, i) => F.apply(o, tOut != null && t >= tOut ? 0 : f[i], 'fade'));
      }
      stks.forEach((sk) => { if (sk && sk.shake) shakeAt(sk.card, t, sk.at + 0.24, 8); });
      inFx.forEach((f) => f(t));
      if (data.progress && AR) cards.forEach((c, i) => {   // 进度条：同一张卡从出现填到「下一张出现」或「一起亮」（先到者）
        const bar = c.querySelector('.pgb i'); if (!bar) return;
        const ends = [tc[i + 1], ...tDones].filter((x) => x != null && x > tc[i] + 0.05);
        const te = ends.length ? Math.min(...ends) : tc[i] + 0.6;
        const v = clamp01((t - tc[i] - 0.15) / Math.max(0.2, te - tc[i] - 0.15));
        if (TRIM()) {   // 润色版：用裁切代替横向压缩（斜纹不被挤扁）+ 前沿一道黑边，见 CSS html[data-mh-card="trim"]
          const pb = bar.parentElement; pb.style.setProperty('--p', v.toFixed(4)); pb.style.setProperty('--pe', v > 0.002 && v < 0.998 ? '1' : '0');
        } else bar.style.transform = `scaleX(${v.toFixed(4)})`;
      });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      // 铺满版式：机位基本不动（只留 1.2% 缓推和手持微晃），版面不被推出组件区
      cams: AR && cued ? [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)]
        : [CAM(0, 700, 600, 1.2, 2, -2.5, -0.5), CAM(1.2, 700, 510, 1.0, 1, -1, 0), CAM(D, 705, 505, 1.03, 0.5, 1, 0.2)] };
  }

  // ============================== 3. checklist 白卡逐条黑勾 + 荧光底 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const RH = 100, R0 = 280;
    const H = R0 + n * RH + (data.note ? 150 : 30);
    const el = h('div', 'nb-zone');
    const card = h('div', 'nb-box lg nb-card', `height:${H}px;`,
      `<div class="hd"><i></i><i></i><i></i><span>${esc(data.kicker || '')}</span></div><div class="ttl">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div><div class="hr"></div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'nb-row', `top:${R0 + i * RH}px;`,
        `<div class="hl" style="background:${PALETTE[i % 4]};"></div><div class="box">${PROPS.check(62, 11)}</div><div class="k" style="color:${ON_DARK[i % 4] ? '#fff' : 'var(--nb-ink)'}">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">#${String(i + 1).padStart(2, '0')}</div>`);
      card.appendChild(r); return r;
    });
    let memo = null;
    if (data.note) {
      memo = h('div', 'nb-box nb-memo', `top:${R0 + n * RH + 14}px;`, `<small>${esc(data.noteLead || '')}</small>${mark(data.note)}`);
      card.appendChild(memo);
    }
    const star = prop('burst', [150, 'var(--nb-yellow)', `${n}/${n}`], 'left:1110px;top:150px;');
    const tp1 = tape('left:200px;top:86px;transform:rotate(-30deg);');
    const tp2 = tape('left:1060px;top:86px;transform:rotate(28deg);');
    el.append(card, star, tp1, tp2);
    A.add(card, 0, 0.55, { y: -780, r: 4, o: 1 }, { y: 0, r: -0.8, o: 1 }, 'slam');
    A.add(card, -1, 0.01, { o: 0, y: -780 }, { o: 0, y: -780 }); // 入场前隐藏，避免邻段时从画面边缘漏出
    A.add(tp1, 0.5, 0.14, { o: 0, s: 1.4 }, { o: 1, s: 1, r: -30 });
    A.add(tp2, 0.58, 0.14, { o: 0, s: 1.4 }, { o: 1, s: 1, r: 28 });
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.5 : 1.3)), t0 + 0.6 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    // v3.4：items[i].cue = 口播里的词 → 这一行在说到这个词的那一帧点亮打勾；不写 cue 时沿用原节奏（逐帧不变）
    const tk = items.map((it, i) => { const c = ctx.cue ? ctx.cue(it.cue, null) : null; return c == null ? t0 + i * stp : c; });
    rows.forEach((r, i) => {
      const cued = ctx.cue && ctx.cue(items[i].cue, null) != null;
      A.add(r, cued ? tk[i] : tk[i] - 0.3, 0.25, { o: 0.25, x: -14 }, { o: 1, x: 0 });
      A.add(r.querySelector('.hl'), tk[i] + (cued ? 0.05 : 0.15), 0.32, { sx: 0 }, { sx: 1 }, 'out');
      A.add(r.querySelector('.box'), tk[i], 0.25, { s: 1.35 }, { s: 1 }, 'back');
    });
    // 行荧光条宽度按文字自适应（首帧测量一次）
    let measured = false;
    const cks = rows.map((r) => r.querySelector('.nb-ck'));
    A.fn((t) => {
      if (!measured) { rows.forEach((r) => { const k = r.querySelector('.k'); const w = k.scrollWidth; if (w > 0) { r.querySelector('.hl').style.width = `${w + 30}px`; measured = true; } }); }
      cks.forEach((c, i) => c.setAttribute('stroke-dashoffset', (74 * (1 - EASE.out(clamp01((t - tk[i]) / 0.22)))).toFixed(1)));
    });
    // v3.4.1 聚光：讲到哪一行，这一行亮边 + 微放大，前面的压暗（只在读到 cue 时启用）
    if (FX() && data.focus !== false && ctx.cue && items.some((it) => ctx.cue(it.cue, null) != null)) {
      const fo = rows.map((r) => FX().attach(r, 'row'));
      A.fn((t) => { const f = FX().track(t, tk); fo.forEach((o, i) => FX().apply(o, f[i], 'fade')); });
    }
    if (memo) A.add(memo, D - 2.0, 0.45, { s: 0, o: 0, r: 14 }, { s: 1, o: 1, r: -2.5 }, 'back');
    A.add(star, Math.max(t1 + 0.3, D - 1.6), 0.45, { s: 0, o: 0, r: -120 }, { s: 1, o: 1, r: 10 }, 'back');
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.04, 1.5, -2, 0), CAM(1.0, 700, 500, 1.01, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.01, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 4. compare 灰底删除线 vs 薄荷绿正确项 ==============================
  function compare(data, ctx) {
    const w0 = data.wrong || {}, r0 = data.right || {};
    if (ctx.cue && (ctx.cue(w0.cue, null) != null || ctx.cue(r0.cue, null) != null)) return compareCue(data, ctx);   // v3.4.1
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:156px;font-size:90px;', mark(data.title));
    const L = h('div', `nb-box lg nb-cmp wrong${blank(w.label) ? ' noband' : ''}`, 'left:60px;',
      `${blank(w.label) ? '' : `<div class="band">${esc(w.label)}</div>`}<div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div><svg class="strike" width="480" height="150"><path d="M4 44 L440 38" stroke="var(--nb-coral)" stroke-width="13" fill="none" stroke-dasharray="440" stroke-dashoffset="440"/><path d="M4 112 L400 106" stroke="var(--nb-coral)" stroke-width="13" fill="none" stroke-dasharray="400" stroke-dashoffset="400"/></svg>`);
    const R = h('div', `nb-box lg nb-cmp right${blank(r.label) ? ' noband' : ''}`, 'left:800px;',
      `${blank(r.label) ? '' : `<div class="band">${esc(r.label)}</div>`}<div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div><div class="badge">${PROPS.check(50, 11).replace('#111111', 'var(--nb-mint)')}</div>`);
    const vs = hideIf(h('div', 'nb-vs', null, `<div class="dm"></div><div class="tx">${esc(data.vs == null ? 'VS' : data.vs)}</div>`), data.vs === false || data.vs === '');
    const xs = stamp(w.stamp || '✕', '', 'left:300px;top:610px;font-size:44px;');
    const verdict = hideIf(h('div', 'nb-box lg nb-verdict', null, `${blank(data.verdictLabel) ? '' : `<b>${esc(data.verdictLabel)}</b>`}<span>${mark(data.verdict || '')}</span>`), blank(data.verdict));
    const star = hideIf(prop('burst', [118, 'var(--nb-coral)', 'OK!'], 'left:1255px;top:752px;z-index:9;'), blank(data.verdict));
    el.append(kick, head, L, R, vs, xs, verdict, star);
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    A.add(L, 0.5, 0.5, { y: -700, o: 1, r: -8 }, { y: 0, o: 1, r: -1.5 }, 'slam');
    A.add(L, -1, 0.01, { o: 0, y: -700 }, { o: 0, y: -700 });
    const tStrike = Math.min(D * 0.28, 1.7);
    const strikes = L.querySelectorAll('path');
    slamIn(A, xs, tStrike + 0.7, -8);
    A.add(vs, tStrike + 0.3, 0.45, { s: 0, o: 0, r: -180 }, { s: 1, o: 1, r: 0 }, 'back');
    const tR = Math.min(D * 0.48, tStrike + 1.3);
    A.add(R, tR, 0.5, { y: -700, o: 1, r: 8 }, { y: 0, o: 1, r: 1.5 }, 'slam');
    A.add(R, -1, 0.01, { o: 0, y: -700 }, { o: 0, y: -700 });
    const badge = R.querySelector('.badge'), bck = badge.querySelector('.nb-ck');
    A.add(badge, tR + 0.55, 0.35, { s: 0, o: 0, r: -40 }, { s: 1, o: 1, r: 6 }, 'back');
    const tV = Math.min(D - 1.5, tR + 1.3);
    A.add(verdict, tV, 0.5, { y: 260, o: 0, r: 3 }, { y: 0, o: 1, r: -0.8 }, 'back');
    A.add(star, tV + 0.4, 0.4, { s: 0, o: 0 }, { s: 1, o: 1, r: 12 }, 'back');
    A.fn((t) => {
      strikes.forEach((p, i) => { const len = +p.getAttribute('stroke-dasharray'); p.setAttribute('stroke-dashoffset', (len * (1 - EASE.inOut(clamp01((t - tStrike - i * 0.28) / 0.32)))).toFixed(1)); });
      bck.setAttribute('stroke-dashoffset', (74 * (1 - EASE.out(clamp01((t - tR - 0.8) / 0.25)))).toFixed(1));
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.12, 1, -2.5, 0), CAM(1.0, 700, 505, 1.0, 0.5, -1, 0), CAM(D, 700, 510, 1.02, 0.5, 1.2, 0)] };
  }

  /**
   * v3.4.1 · compare 的 cue 版（wrong.cue / right.cue 写了任意一个就走这里；不写 = 上面的原版，逐帧不变）
   *   wrong / right：{ cue, label?, title, rows:[{ text, cue }], stamp, stampCue }，title 可用 \n 换行
   *   right.button：{ text, cue, until }：光标飞来点按钮（点击涟漪），卡内风格色块从点击闪到 until 这个词念完（默认 1.4s）
   *   right.swatches：[[底色, 色1, 色2, 色3], ...]（可选，默认取本包的 3 套皮肤）
   *   stat：{ label, value, unit, cue, endCue, inCue } → 底部数字条：cue 起滚，数字和进度条同一个进度，endCue 念完时同时到头
   *   vs：中间菱形里的字（"" / false = 不出）。聚光：讲到哪边哪边亮边微放大，另一边压暗；印章所属分句念完就退场。
   */
  function compareCue(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const cue = (spec, fb = null) => (ctx.cue ? ctx.cue(spec, fb) : fb);
    const cueEnd = (spec, fb = null) => (ctx.cueEnd ? ctx.cueEnd(spec, fb) : fb);
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = hideIf(h('div', 'nb-head', 'left:56px;top:156px;font-size:90px;', mark(data.title)), blank(data.title));
    const rowsOf = (side) => (side.rows || []).map((x) => (typeof x === 'string' ? { text: x } : x || {})).filter((o) => !blank(o.text)).slice(0, 4);
    const wRows = rowsOf(w), rRows = rowsOf(r);
    const card = (side, cls, left, rows, extra) => h('div', `nb-box lg nb-cmp cue ${cls}${blank(side.label) ? ' noband' : ''}`, `left:${left}px;`,
      `${blank(side.label) ? '' : `<div class="band">${esc(side.label)}</div>`}<div class="t">${esc(side.title || '').replace(/\n/g, '<br/>')}</div>` +
      (rows.length ? `<div class="rws">${rows.map((o) => `<div class="rw"><i></i>${esc(o.text)}</div>`).join('')}</div>` : '') +
      (blank(side.desc) ? '' : `<div class="d">${esc(side.desc)}</div>`) + (extra || ''));
    const btn = r.button && !blank(r.button.text) ? r.button : null;
    const SKINS = (() => {
      if (Array.isArray(r.swatches) && r.swatches.length) return r.swatches.slice(0, 4);
      const T = global.NeoBrutalismThemes, P = T && T.PRESETS;
      const pick = P ? ['mono_ink', 'acid', 'pop_pink'].map((k) => P[k] && P[k].dots).filter(Boolean) : [];
      return pick.length ? pick : [['#FFFFFF', '#000000', '#FF2A2A', '#000000'], ['#111111', '#CCFF00', '#A855F7', '#FF2E93'], ['#FFF0F5', '#FF3385', '#38BDF8', '#FFE500']];
    })();
    const swHtml = btn ? `<div class="sw">${[0, 1, 2].map((k) => `<i style="left:${(k * 100 / 3).toFixed(3)}%;width:${(100 / 3).toFixed(3)}%;"></i>`).join('')}</div><div class="btn">${esc(btn.text)}</div>` : '';
    const L = card(w, 'wrong', 60, wRows, '');
    L.style.width = '520px';
    const R = card(r, 'right', 730, rRows, `<div class="badge">${PROPS.check(50, 11).replace('#111111', 'var(--nb-mint)')}</div>${swHtml}`);
    const vs = hideIf(h('div', 'nb-vs', null, `<div class="dm"></div><div class="tx">${esc(data.vs == null ? 'VS' : data.vs)}</div>`), data.vs === false || data.vs === '');
    R.style.width = '520px';
    vs.style.left = '577px';
    const ghost = data.slots ? h('div', 'nb-slot', 'left:730px;top:270px;width:520px;height:480px;') : null;   // slots: true → 右卡位置先摆虚线空位
    const xs = stamp(w.stamp || '', '', 'left:240px;top:600px;font-size:46px;');
    const stc = data.stat && Number.isFinite(+data.stat.value) ? data.stat : null;
    const sbar = stc ? h('div', 'nb-box lg nb-cstat', null, `${blank(stc.label) ? '' : `<span class="lb">${esc(stc.label)}</span>`}<span class="num"><b>0</b><span class="u">${esc(stc.unit || '')}</span></span><span class="pg"><i></i></span>`) : null;
    const verdict = !stc && !blank(data.verdict) ? h('div', 'nb-box lg nb-verdict', null, `${blank(data.verdictLabel) ? '' : `<b>${esc(data.verdictLabel)}</b>`}<span>${mark(data.verdict)}</span>`) : null;
    const cursor = btn ? h('div', 'nb-cursor', null, '<svg viewBox="0 0 40 40"><path d="M5 2 L5 33 L13 26 L19 39 L26 36 L20 23 L31 23 Z" fill="#111111" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/></svg>') : null;
    const ripple = btn ? h('div', 'nb-ripple') : null;
    if (ghost) el.appendChild(ghost);
    el.append(kick, head, L, R, vs, xs);
    if (sbar) sbar.style.width = '1190px';
    const AR = ctx.area;
    let cTop = 0, cTopS = 0, chC = 0, tlx = null, tlPh = null;
    const tlClips = [];
    if (AR) {   // v3.4.1 铺满版式：左右卡 520×480、中间菱形箭头、数字条横跨组件区宽（高 150、数字 ≥110px）——尺寸都按屏幕像素
      const k = AR.k, cw = 520 * k, ch = 480 * k, gp = 40 * k, sh = 150 * k;
      const top = AR.y0 + Math.max(0, (AR.y1 - AR.y0 - (ch + (sbar ? gp + sh : 0))) / 2);
      cTopS = top; cTop = sbar ? AR.y0 + Math.max(0, (AR.y1 - AR.y0 - ch) / 2) : top; chC = ch;
      // 左卡下半：小时间线插图（wrong.illus = "timeline"）
      if (w.illus === 'timeline') {
        const th = 140 * k, tw = 520 * k - 60;
        tlx = h('div', 'tlx', `top:${ch - th - 30 * k}px;height:${th}px;`);
        const COLS = ['var(--nb-yellow)', 'var(--nb-blue)', 'var(--nb-mint)'];
        [0, 1, 2].forEach((r2) => {
          const rh = th / 3;
          tlx.appendChild(h('div', 'trk', `top:${(r2 + 1) * rh - 3}px;height:0;`));
          [[0.02, 0.26], [0.32, 0.22], [0.6, 0.3]].forEach(([x, wd], j) => {
            const e = h('div', 'clp', `left:${((x + (r2 % 2) * 0.05) * tw).toFixed(1)}px;width:${(wd * tw).toFixed(1)}px;top:${(r2 * rh + 6).toFixed(1)}px;height:${(rh - 12).toFixed(1)}px;bottom:auto;background:${COLS[(r2 + j) % 3]};`);
            tlx.appendChild(e); tlClips.push({ e, bg: COLS[(r2 + j) % 3], order: j * 3 + r2 });
          });
        });
        tlClips.sort((a, b) => a.order - b.order);
        tlPh = h('div', 'ph'); tlx.appendChild(tlPh);
        L.appendChild(tlx);
      }
      [[L, AR.x0], [R, AR.x1 - cw]].concat(ghost ? [[ghost, AR.x1 - cw]] : []).forEach(([e, x]) => Object.assign(e.style, { left: `${x}px`, top: `${top}px`, width: `${cw}px`, height: `${ch}px` }));
      const vsz = 136;
      Object.assign(vs.style, { left: `${(AR.x0 + AR.x1) / 2 - vsz / 2}px`, top: `${top + ch / 2 - vsz / 2}px` });
      Object.assign(xs.style, { left: `${150 * k}px`, top: `${ch - 150 * k - 6}px`, fontSize: `${Math.round(52 * k)}px` });
      L.appendChild(xs);   // 印章挂进左卡：跟着左卡居中放大 / 滑回   // 印章在数字条进场前就退了，按居中时的卡位放（压在时间线插图上沿）
      [L, R].forEach((c) => {
        const tt = c.querySelector('.t'); Object.assign(tt.style, { fontSize: `${Math.round(70 * k)}px`, left: `${30 * k}px`, top: `${26 * k}px` });
        const rws = c.querySelector('.rws'); if (rws) rws.style.top = `${150 * k}px`;
        c.querySelectorAll('.rw').forEach((rw) => { rw.style.fontSize = `${Math.round(54 * k)}px`; rw.style.height = `${(tlx && c === L ? 70 : 84) * k}px`; });
        const sw = c.querySelector('.sw'); if (sw) Object.assign(sw.style, { top: `${196 * k}px`, height: `${140 * k}px` });
        const bt = c.querySelector('.btn'); if (bt) bt.style.fontSize = `${Math.round(48 * k)}px`;
      });
      if (sbar) {
        Object.assign(sbar.style, { left: `${AR.x0}px`, top: `${top + ch + gp}px`, width: `${AR.x1 - AR.x0}px`, height: `${sh}px`, gap: `${34 * k}px` });
        sbar.querySelector('.lb').style.fontSize = `${Math.round(40 * k)}px`;
        const nm = sbar.querySelector('.num'); nm.style.fontSize = `${Math.round(124 * k)}px`;
        nm.querySelector('.u').style.fontSize = `${Math.round(56 * k)}px`;
        sbar.querySelector('.pg').style.height = `${50 * k}px`;
      }
    }
    [sbar, verdict].forEach((e) => e && el.appendChild(e));
    if (btn) R.append(ripple, cursor);   // 光标 / 涟漪挂在右卡里：跟着卡的入场、聚光放大一起走

    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    const tL = cue(w.cue, 0.4), tR = cue(r.cue, Math.min(D * 0.48, tL + 2.5));
    if (ghost) { A.add(ghost, -1, 0.01, { o: 0 }, { o: 0 }); A.add(ghost, Math.max(tL + 0.35, tR - (+data.slotLead > 0 ? +data.slotLead : 1.2)), 0.3, { o: 0, s: 0.92 }, { o: 1, s: 1 }, 'back'); A.add(ghost, tR + 0.3, 0.12, { o: 1 }, { o: 0 }); }
    if (ctx.area) {   // 铺满版式：和 steps 一样原地放大落定（以卡片上沿为轴）
      [L, R].forEach((c) => { c.style.transformOrigin = '50% 0%'; });
      A.add(L, -1, 0.01, { o: 0 }, { o: 0 }); A.add(L, tL, 0.32, { s: 1.06, o: 0.45, r: -3 }, { s: 1, o: 1, r: -1.5 }, 'slam');
      A.add(R, -1, 0.01, { o: 0 }, { o: 0 }); A.add(R, tR, 0.32, { s: 1.06, o: 0.45, r: 3 }, { s: 1, o: 1, r: 1.5 }, 'slam');
    } else {
      A.add(L, -1, 0.01, { o: 0, y: -700 }, { o: 0, y: -700 });
      A.add(L, tL, 0.5, { y: -700, o: 1, r: -8 }, { y: 0, o: 1, r: -1.5 }, 'slam');
      A.add(R, -1, 0.01, { o: 0, y: -700 }, { o: 0, y: -700 });
      A.add(R, tR, 0.5, { y: -700, o: 1, r: 8 }, { y: 0, o: 1, r: 1.5 }, 'slam');
    }
    A.add(vs, tR - 0.05, 0.45, { s: 0, o: 0, r: -180 }, { s: 1, o: 1, r: 0 }, 'back');
    const badge = R.querySelector('.badge'), bck = badge.querySelector('.nb-ck');
    A.add(badge, tR + 0.45, 0.35, { s: 0, o: 0, r: -40 }, { s: 1, o: 1, r: 6 }, 'back');
    // 行：各在自己的词出现（从左滑入）
    const rowAt = (side, rows, el0, tCard) => Array.from(el0.querySelectorAll('.rw')).map((rw, i) => {
      const at = Math.max(tCard + 0.12, cue(rows[i].cue != null ? rows[i].cue : rows[i].text, tCard + 0.5 + i * 0.6));
      A.add(rw, -1, 0.01, { o: 0, x: -40 }, { o: 0, x: -40 });
      A.add(rw, at, 0.3, { o: 0, x: -40, s: 0.9 }, { o: 1, x: 0, s: 1 }, 'back');
      return at;
    });
    rowAt(w, wRows, L, tL); rowAt(r, rRows, R, tR);
    // 印章：说到 stampCue 砸下 + 卡片轻抖；所属分句念完就退场
    const tX = blank(w.stamp) ? null : cue(w.stampCue != null ? w.stampCue : w.stamp, Math.min(D - 1.5, tR - 1.2));
    let tXo = null;
    if (tX != null) {
      slamCue(A, xs, tX, -8);
      tXo = clauseOut(ctx, tX);
      if (tXo != null) A.add(xs, tXo, 0.16, { s: 1, o: 1, r: -8 }, { s: 0.75, o: 0, r: -8 }, 'in');
    }
    // 按钮：光标飞来 → 点击（按钮下沉 + 涟漪）→ 色块闪过 3 套风格
    const tB = btn ? cue(btn.cue, tR + 1.2) : null;
    const tBe = btn ? Math.max(tB + 0.6, cueEnd(btn.until, tB + 1.4)) : null;
    // 数字条：inCue（默认 cue 前 0.35s）出现，cue 起滚，endCue 念完时数字和进度条同时到头
    const tS = stc ? cue(stc.cue, D - 1.2) : null;
    const tSe = stc ? Math.max(tS + 0.2, cueEnd(stc.endCue != null ? stc.endCue : stc.cue, tS + 0.9)) : null;
    const tSin = stc ? Math.min(tS, cue(stc.inCue, tS - 0.35)) : null;   // inCue 写成和 cue 同一个词 → 数字条和数字同一帧进场
    const tRoom = stc ? Math.min(tSin - 0.4, cue(stc.roomCue, tSin - 0.4)) : null;   // 铺满版式：两张卡在 roomCue（默认数字条前 0.4s）上移让位，数字条进场时位子已经空好
    if (sbar) {
      const tSi = tSin;
      if (ctx.area) {   // 铺满版式：原地放大落定，不从下方滑过字幕条
        sbar.style.transformOrigin = '50% 0%';
        A.add(sbar, -1, 0.01, { o: 0 }, { o: 0 });
        A.add(sbar, tSi, 0.32, { s: 1.02, o: 0.5, r: 1 }, { s: 1, o: 1, r: -0.6 }, 'slam');
      } else {
        A.add(sbar, -1, 0.01, { o: 0, y: 220 }, { o: 0, y: 220 });
        A.add(sbar, tSi, 0.45, { y: 220, o: 0, r: 3 }, { y: 0, o: 1, r: -0.6 }, 'back');
      }
    }
    if (verdict) A.add(verdict, Math.min(D - 1.5, tR + 1.3), 0.5, { y: 260, o: 0, r: 3 }, { y: 0, o: 1, r: -0.8 }, 'back');
    const F = FX(), fL = F ? F.attach(L) : null, fR = F ? F.attach(R) : null;
    const sws = btn ? Array.from(R.querySelectorAll('.sw i')) : [], swBox = btn ? R.querySelector('.sw') : null, bEl = btn ? R.querySelector('.btn') : null;
    const paint = (dots) => { swBox.style.background = dots[0]; sws.forEach((e, k) => { e.style.background = dots[k + 1] || dots[0]; }); };
    const BASE = ['var(--nb-paper)', 'var(--nb-yellow)', 'var(--nb-blue)', 'var(--nb-coral)'];
    if (btn) paint(BASE);
    let lastSkin = -2;
    A.fn((t) => {
      bck.setAttribute('stroke-dashoffset', (74 * (1 - EASE.out(clamp01((t - tR - 0.7) / 0.25)))).toFixed(1));
      // 铺满版式：右卡出现前左卡先占满整个组件区宽，右卡砸下前 0.3s 收窄到自己的位子（不摆空位也不空半屏）
      if (AR) {   // 数字条进场前两张卡上下居中；数字条进场时一起上移让位
        const pu = sbar && tS != null ? EASE.inOut(clamp01((t - tRoom) / 0.35)) : 0, top = cTop + (cTopS - cTop) * pu;
        [L, R].concat(ghost ? [ghost] : []).forEach((e) => { e.style.top = `${top.toFixed(1)}px`; });
        vs.style.top = `${(top + chC / 2 - 68).toFixed(1)}px`;
      }
      if (tlx) {   // 「时间线里得一个一个重调」：说到 stampCue 起，片段一个接一个被拎起来重调（变色 + 错位）
        const t0 = tX != null ? tX : tR - 1.5, t1 = tXo != null ? tXo : t0 + 1.2, nC = tlClips.length;
        tlClips.forEach((cl, j) => {
          const at = t0 + (j / nC) * Math.max(0.4, t1 - t0 - 0.2), p = clamp01((t - at) / 0.18), back = clamp01((t - at - 0.22) / 0.16);
          const on = p * (1 - back);
          cl.e.style.transform = `translate(${(10 * on).toFixed(1)}px, ${(-8 * on).toFixed(1)}px)`;
          cl.e.style.background = t >= at + 0.1 ? 'var(--nb-coral)' : cl.bg;
        });
        tlPh.style.left = `${(clamp01((t - tL) / Math.max(1, (tX != null ? tX : tR) - tL)) * 100).toFixed(2)}%`;
      }
      if (F && data.focus !== false) {
        F.apply(fL, F.stepv(t, [[tL, 1], [tR, -0.6]], 0), 'fade');
        F.apply(fR, F.stepv(t, [[tR, 1]], 0), 'fade');
      }
      if (tX != null) shakeAt(L, t, tX + 0.2, 10);
      if (AR) {   // 铺满版式：右卡出现前，左卡（连同里面的印章、时间线）居中放大 1.3 倍；「现在」那一帧起 0.25s 滑回左边的位子
        const mv = EASE.inOut(clamp01((t - (tR - 1 / 30)) / 0.25)), ls = 1.3 + (1 - 1.3) * mv;   // 「现在」那一帧起滑回（≤1 帧）
        const dx = ((AR.x0 + AR.x1) / 2 - (AR.x0 + 260 * AR.k)) * (1 - mv);
        const dy = -(ls - 1) * chC / 2;   // 以卡片上沿为轴放大 → 往上提一半，等于围绕中心放大，卡底不越过组件区下沿（不压字幕条）
        L.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        L.style.scale = (((F && data.focus !== false) ? (parseFloat(L.style.scale) || 1) : 1) * ls).toFixed(4);   // 聚光每帧先写 scale，这里再乘上版式缩放
      }
      if (btn) {
        // 光标：点击前 0.55s 从右下飞入，点击时按下，色块闪完后淡出
        const bx = bEl.offsetLeft + bEl.offsetWidth * 0.55, by = bEl.offsetTop + bEl.offsetHeight * 0.55;
        const pIn = EASE.inOut(clamp01((t - (tB - 0.55)) / 0.5));
        const cx = bx + 230 * (1 - pIn), cy = by + 170 * (1 - pIn);
        const press = t >= tB && t < tB + 0.16 ? 0.86 : 1;
        const co = t < tB - 0.55 ? 0 : t > tBe + 0.3 ? clamp01(1 - (t - tBe - 0.3) / 0.2) : 1;
        cursor.style.opacity = co.toFixed(3);
        cursor.style.transform = `translate(${(cx - 6).toFixed(1)}px, ${(cy - 4).toFixed(1)}px) scale(${press})`;
        const rp = clamp01((t - tB) / 0.45);
        ripple.style.opacity = t < tB || rp >= 1 ? '0' : (1 - rp).toFixed(3);
        ripple.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) scale(${(0.2 + 1.6 * EASE.out(rp)).toFixed(4)})`;
        const k = t >= tB && t < tB + 0.18 ? 1 : 0;   // 按钮下沉 + 投影收短
        bEl.style.transform = `translate(${6 * k}px, ${6 * k}px)`;
        bEl.style.boxShadow = `${6 - 6 * k}px ${6 - 6 * k}px 0 var(--nb-ink)`;
        // 色块：点击后快速闪过 3 套风格，停在最后一套
        const idx = t < tB + 0.08 ? -1 : Math.min(SKINS.length - 1, Math.floor((t - tB - 0.08) / Math.max(0.12, (tBe - tB - 0.08) / SKINS.length)));
        if (idx !== lastSkin) { paint(idx < 0 ? BASE : SKINS[idx]); lastSkin = idx; }
      }
      if (sbar) {   // 同一个进度驱动数字和进度条（照 05 / 06 stat 的共用进度写法）
        const pr = tS == null ? 0 : clamp01((t - tS) / (tSe - tS));   // 匀速计数：每个数停留一样久，「套」念完那一帧到 12
        const dec = decOf(stc.value), q = Math.pow(10, dec);   // 向下取整：数字和进度条在同一帧一起到头
        const numEl = sbar.querySelector('.num');
        numEl.style.opacity = t < tS ? '0' : '1';   // 说到这个数之前不出数字（不挂「0 套」）
        const pop = clamp01((t - tSe) / 0.25);   // 到头那一帧弹一下
        numEl.style.display = 'inline-block';
        numEl.style.transform = t >= tSe ? `scale(${(1 + 0.22 * (1 - EASE.out(pop))).toFixed(4)})` : 'none';
        const shown = pr >= 0.9999 ? +stc.value : Math.round(+stc.value * pr * q) / q;   // 数字和进度条用同一个（四舍五入后的）值 → 同一帧到头
        sbar.querySelector('.num b').textContent = fmtNum(shown, dec);
        sbar.querySelector('.pg i').style.transform = `scaleX(${((+stc.value ? shown / +stc.value : pr) * clamp01(stc.bar != null ? +stc.bar : 1)).toFixed(4)})`;
      }
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: AR ? [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)]
        : [CAM(0, 700, 530, 1.1, 1, -2.5, 0), CAM(Math.max(0.6, tL + 0.4), 700, 505, 1.0, 0.5, -1, 0), CAM(D, 700, 510, 1.02, 0.5, 1.2, 0)] };
  }

  // ============================== 5. showcase 黑终端 / 白文档 / 录屏贴片 ==============================
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:150px;font-size:80px;', mark(data.title));
    const dark = kind === 'code' || kind === 'terminal';
    const panel = h('div', `nb-box nb-panel ${dark ? 'dark' : 'light lg'}`, null, `<div class="bar"><i></i><i></i><i></i><span>${esc(data.file || kind.toUpperCase())}</span></div>`);
    let codeEl = null, media = null;
    const lines = data.lines || [];
    let prod = null;
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'nb-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'nb-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', 'nb-code'); panel.appendChild(codeEl); }
    // 标注贴纸挂在 zone 上（不被面板裁切），坐标按面板百分比换算
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 262 + 640 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      const c = h('div', 'nb-callout', `left:${px.toFixed(0)}px;top:${(py - 26).toFixed(0)}px;`, `${PROPS.pointer(70)}<span style="background:${['var(--nb-yellow)', 'var(--nb-mint)', 'var(--nb-coral)'][i]};${i === 2 ? 'color:#fff;' : ''}">${esc(nt.text)}</span>`);
      return c;
    });
    const tag = sticker(kind.toUpperCase(), 'var(--nb-coral)', 'left:1180px;top:226px;color:#fff;');
    el.append(kick, head, panel, ...notes, tag);
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    A.add(panel, 0.3, 0.55, { y: 420, o: 1, r: -4, s: 0.92 }, { y: 0, o: 1, r: -0.6, s: 1 }, 'slam');
    A.add(panel, -1, 0.01, { o: 0, y: 420 }, { o: 0, y: 420 });
    A.add(tag, 0.85, 0.35, { s: 0, o: 0, r: 30 }, { s: 1, o: 1, r: 6 }, 'back');
    const tType0 = 0.95, tType1 = Math.max(tType0 + 0.6, D * 0.6);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.9 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.4, { s: 0, o: 0, x: 40, r: 10 }, { s: 1, o: 1, x: 0, r: [-3, 2.5, -2][i] }, 'back'));
    if (prod) {
      A.add(prod.pic, 0.75, 0.5, { s: 0.6, o: 0, r: -6 }, { s: 1, o: 1, r: -1.5 }, 'back');
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.28, 0.35, { x: 60, o: 0 }, { x: 0, o: 1 }, 'back'));
      if (prod.price) slamIn(A, prod.price, Math.min(D - 1.2, 1.3 + prod.rows.length * 0.28 + 0.3), -7);
    }
    A.fn((t) => {
      if (codeEl) {
        let budget = Math.floor(total * clamp01((t - tType0) / (tType1 - tType0))), html = '', cur = false;
        lines.forEach((l, i) => {
          const tx = String(l.t != null ? l.t : l), cls = l.c || '';
          const k = Math.min(tx.length, budget); budget -= k;
          if (k <= 0 && i > 0) return;
          html += `<span class="ln">${String(i + 1).padStart(2, '0')}</span>${cls ? `<span class="${cls}">${esc(tx.slice(0, k))}</span>` : esc(tx.slice(0, k))}`;
          if (k < tx.length && !cur) { html += '<span class="cur">_</span>'; cur = true; }
          html += '\n';
        });
        codeEl.innerHTML = html;
      }
      if (media && media.tagName === 'VIDEO' && media.readyState >= 1 && media.duration) {
        const want = Math.max(0, t - 0.3) % media.duration;
        if (media.paused && Math.abs(media.currentTime - want) > 0.08) { try { media.currentTime = want; } catch (_) {} }
      }
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), media,
      cams: [CAM(0, 700, 580, 0.94, 1.5, -1.5, 0), CAM(1.2, 700, 525, 1.0, 1, -1.5, 0), CAM(D, 715, 540, 1.05, 1, 1.2, 0)] };
  }

  // ============================== 6. quote 全屏人像 + 侧边珊瑚红金句大卡（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'nb-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const side = right ? 'right:70px;' : 'left:70px;';
    const card = h('div', 'nb-q', side, `${blank(data.kicker) ? '' : `<div class="k">${esc(data.kicker)}</div>`}<div class="t">${mark(data.text)}</div>${blank(data.by) ? '' : `<div class="by">${esc(data.by)}</div>`}`);
    const st = stamp(data.stamp || '', data.stampSmall || '', `${right ? 'right:120px;' : 'left:440px;'}top:${data.stampTop || 680}px;font-size:56px;`);
    st.classList.add('yellow');
    const tp = tape(`${right ? 'right:640px;' : 'left:40px;'}top:176px;transform:rotate(${right ? 30 : -30}deg);`);
    el.append(card, tp, st);
    const dir = right ? 1 : -1;
    A.add(card, 0.45, 0.6, { x: dir * 820, o: 1, r: dir * 10 }, { x: 0, o: 1, r: dir * 2 }, 'back');
    A.add(card, -1, 0.01, { o: 0, x: dir * 820 }, { o: 0, x: dir * 820 });
    A.add(tp, 1.0, 0.16, { s: 1.5, o: 0 }, { s: 1, o: 1, r: right ? 30 : -30 });
    slamIn(A, st, Math.min(D - 1.0, D * 0.4), right ? 7 : -7);
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 7. outro 行动卡 + 电光蓝 CTA + 按钮连按 ==============================
  function outro(data, ctx) {
    if (ctx.cue && (data.actions || []).some((a) => a && ctx.cue(a.cue, null) != null)) return outroCue(data, ctx);   // v3.4.1 结构版（不写 cue = 下面原版，逐帧不变）
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:150px;font-size:90px;', mark(data.title));
    const tagBg = ['var(--nb-blue)', 'var(--nb-coral)', 'var(--nb-mint)'];
    const acts = (data.actions || []).slice(0, 3).map((a, i) => h('div', 'nb-box nb-act', `top:${272 + i * 180}px;`,
      `${blank(a.tag) ? '' : `<div class="tg" style="background:${tagBg[i]};color:${i === 2 ? 'var(--nb-ink)' : '#fff'}">${esc(a.tag)}</div>`}<div class="t">${esc(a.title)}</div>${blank(a.desc) ? '' : `<div class="d">${esc(a.desc)}</div>`}<div class="no">${String(i + 1).padStart(2, '0')}</div>`));
    const c = data.cta || {};
    const btnBg = ['var(--nb-yellow)', '#fff', 'var(--nb-mint)'];
    const cta = hideIf(h('div', 'nb-box lg nb-cta', null, `${blank(c.kicker) ? '' : `<div class="k">${esc(c.kicker)}</div>`}<div class="t">${esc(c.title || '')}</div>${blank(c.repo) ? '' : `<div class="repo">${esc(c.repo)}</div>`}<div class="btns">${(c.buttons || []).slice(0, 3).map((b, i) => `<span style="background:${btnBg[i]}">${esc(b)}</span>`).join('')}</div>`),
      !data.cta || (blank(c.title) && blank(c.repo) && !(c.buttons || []).length));
    const go = stamp(c.stamp || '', c.stampSmall || '', 'left:1120px;top:700px;font-size:66px;');
    go.classList.add('mint');
    const tp = hideIf(tape('left:950px;top:262px;transform:rotate(-6deg);'), cta.style.display === 'none');
    el.append(kick, head, ...acts, cta, tp, go);
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    const t0 = 0.7, stp = Math.min(0.6, (D * 0.35) / Math.max(1, acts.length));
    acts.forEach((a, i) => {
      A.add(a, t0 + i * stp, 0.45, { x: -700, o: 1, r: -8 }, { x: 0, o: 1, r: [-1.4, 1.2, -1][i] }, 'back');
      A.add(a, -1, 0.01, { o: 0, x: -700 }, { o: 0, x: -700 });
    });
    const tC = t0 + acts.length * stp + 0.05;
    A.add(cta, tC, 0.55, { y: -720, o: 1, r: 6 }, { y: 0, o: 1, r: 1 }, 'slam');
    A.add(cta, -1, 0.01, { o: 0, y: -720 }, { o: 0, y: -720 });
    A.add(tp, tC + 0.5, 0.15, { s: 1.5, o: 0 }, { s: 1, o: 1, r: -6 });
    const btns = Array.from(cta.querySelectorAll('.btns span'));
    const tP = tC + 0.8;
    A.fn((t) => btns.forEach((b, i) => {
      // 依次按下：下沉 + 投影收短 → 弹回
      const p = clamp01((t - (tP + i * 0.35)) / 0.3), d = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6, k = p <= 0 || p >= 1 ? 0 : d;
      b.style.transform = `translate(${(6 * k).toFixed(1)}px, ${(6 * k).toFixed(1)}px)`;
      b.style.boxShadow = `${(6 - 6 * k).toFixed(1)}px ${(6 - 6 * k).toFixed(1)}px 0 var(--nb-ink)`;
    }));
    slamIn(A, go, Math.min(D - 0.9, tP + btns.length * 0.35 + 0.2), -10);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1, -2.5, 0), CAM(1.2, 700, 505, 1.0, 0.5, -0.8, 0), CAM(D, 700, 500, 0.98, 0, 0.8, 0)] };
  }

  /**
   * v3.4.1 结构版 · outro 的 cue 版（actions[i].cue 写了任意一个就走这里；不写 = 上面的原版，逐帧不变）——收尾信息页：
   *   actions：[{ title, cue, icon }]（1–3 块）→ 大铭牌铺满组件区（3 块 = 品字排：前两块并排、第三块通栏），跟词整块砸出，聚光跟着走、前一块压暗
   *   cta：{ title, cue } → 下方大横条（宽 = 组件区，字号 ≥ 56px），出现时铭牌整体压暗
   *   board：铭牌底板（灰底点阵 + 四角螺丝，不带字），和第一块铭牌同一帧砸出（不先空着出现）；false = 不要
   *   titleSpace（屏幕像素，v3.5）：组件区顶部留给标题牌（data.badges 的 tag，如「工具」）的高度，底板 / 铭牌 / 横条整体下移
   *   只出剧本写了的字：kicker / title / tag / desc / repo / buttons / stamp 这些在 cue 版一律不渲染（不出 GO、OPEN SOURCE 之类默认字）。
   */
  function outroCue(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const AR = ctx.area || { x0: 60, x1: 1340, y0: 120, y1: 960, k: 1 };
    const k = AR.k;
    const TS = +data.titleSpace > 0 ? +data.titleSpace : 0;
    const AW = (AR.x1 - AR.x0) / k, AH = (AR.y1 - AR.y0) / k - TS;
    const X = (u) => AR.x0 + u * k, Y = (v) => AR.y0 + (v + TS) * k, S = (p) => p * k;
    const cue = (c, fb = null) => (ctx.cue ? ctx.cue(c, fb) : fb);
    const el = h('div', 'nb-zone');
    const acts = (data.actions || []).map((a) => (typeof a === 'string' ? { title: a } : a || {})).filter((a) => !blank(a.title)).slice(0, 3);
    const c = data.cta || {}, hasBan = !blank(c.title);
    const BH = hasBan ? 116 : 0, GAP = hasBan ? 60 : 0, boardH = AH - BH - GAP, PAD = 26;
    let board = null;
    if (data.board !== false) {
      board = h('div', 'nb-box lg nb-board', `left:${X(0)}px;top:${Y(0)}px;width:${S(AW)}px;height:${S(boardH)}px;`);
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => board.appendChild(h('i', 'nb-screw', `${a ? 'right' : 'left'}:${S(5)}px;${b ? 'bottom' : 'top'}:${S(5)}px;width:${S(16)}px;height:${S(16)}px;`)));
      el.appendChild(board);
    }
    // 版位（屏幕像素，相对组件区左上）：1 块 = 整板；2 块 = 并排；3 块 = 品字（上两块并排 53%，下一块通栏）
    const n = acts.length, iw = AW - PAD * 2, ih = boardH - PAD * 2, half = (iw - PAD) / 2, h1 = (ih - PAD) * 0.53, h2 = ih - PAD - h1;
    const geo = n === 1 ? [[PAD, PAD, iw, ih]] : n === 2 ? [[PAD, PAD, half, ih], [PAD * 2 + half, PAD, half, ih]]
      : [[PAD, PAD, half, h1], [PAD * 2 + half, PAD, half, h1], [PAD, PAD * 2 + h1, iw, h2]];
    const BG = ['var(--nb-yellow)', 'var(--nb-mint)', 'var(--nb-coral)'], INV = [false, false, true], DEF_IC = ['unlock', 'gift', 'nocode'];
    const plates = acts.map((a, i) => {
      const [u, v, w, hh] = geo[i], ics = Math.min(hh * 0.5, 150), txt = String(a.title);
      const fz = Math.round(Math.min(200, hh * 0.6, (w - ics - 110) / Math.max(1, Array.from(txt).length)));
      const ic = ICON[a.icon] || ICON[DEF_IC[i]];
      return h('div', `nb-box lg nb-plate${INV[i] ? ' inv' : ''}`, `left:${X(u)}px;top:${Y(v)}px;width:${S(w)}px;height:${S(hh)}px;background:${BG[i]};--nb-glow:${BG[i]};padding:0 ${S(46)}px 0 ${S(50)}px;`,
        `<div class="tx" style="font-size:${S(fz)}px;">${esc(txt)}</div><div class="ic" style="width:${S(ics)}px;height:${S(ics)}px;color:${INV[i] ? '#fff' : 'var(--nb-ink)'};">${ic}</div>`);
    });
    plates.forEach((p) => el.appendChild(p));
    const ban = hasBan ? h('div', 'nb-box nb-banner', `left:${X(0)}px;top:${Y(AH - BH - 24)}px;width:${S(AW)}px;height:${S(BH)}px;padding:0 ${S(40)}px;font-size:${S(Math.max(56, Math.min(64, (AW - 200) / Math.max(1, Array.from(String(c.title)).length))))}px;`,
      `<span>${esc(c.title)}</span><span class="ar">${PROPS.arrow(S(86), S(56)).replace(/#111111/g, 'var(--nb-yellow)')}</span>`) : null;
    if (ban) el.appendChild(ban);
    const tc = acts.map((a, i) => cue(a.cue != null ? a.cue : a.title, 0.6 + i * 0.6));
    const REST = [-1.2, 1.1, -0.6];
    plates.forEach((p, i) => {
      A.add(p, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(p, tc[i], 0.32, { s: 1.1, o: 0.45, r: REST[i] * 3 }, { s: 1, o: 1, r: REST[i] }, 'slam');
    });
    if (board) {   // 本段开始前隐藏（相邻段时不从人像后面露边）；和第一块铭牌同一帧砸出，不先空着出现
      const tb = tc.length && tc[0] != null ? tc[0] : 0;
      A.add(board, -1, 0.01, { o: 0, r: -0.4 }, { o: 0, r: -0.4 });
      A.add(board, tb, 0.24, { s: 1.03, o: 0.5, r: -1.2 }, { s: 1, o: 1, r: -0.4 }, 'slam');
    }
    const tB = ban ? cue(c.cue != null ? c.cue : c.title, null) : null;
    if (ban) {
      A.add(ban, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(ban, tB == null ? D - 1.5 : tB, 0.3, { x: -S(80), o: 0.45, r: 0.8 }, { x: 0, o: 1, r: -0.4 }, 'back');
    }
    // 聚光：跟着当前念到的那块，前面的压暗；大横条出现时三块一起压暗
    const F = FX(), fo = F && data.focus !== false ? plates.map((p) => F.attach(p)) : null;
    if (fo) A.fn((t) => {
      const f = F.track(t, tc);
      fo.forEach((o, i) => {
        let v = f[i];
        if (tB != null && t >= tB) v += (-0.75 - v) * clamp01((t - tB) / 0.16);
        F.apply(o, v, 'fade');
      });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)] };
  }

  // ============================== 共用：产品贴片 / 数字格式 / 连线几何 ==============================
  const DEVICE_SVG = (accent) => `<svg viewBox="0 0 400 300"><rect x="40" y="86" width="320" height="174" fill="#fff" stroke="currentColor" stroke-width="10"/><rect x="80" y="56" width="96" height="34" fill="currentColor"/><circle cx="200" cy="173" r="64" fill="${accent}" stroke="currentColor" stroke-width="10"/><circle cx="200" cy="173" r="28" fill="currentColor"/><rect x="296" y="106" width="38" height="22" fill="var(--nb-coral)" stroke="currentColor" stroke-width="5"/><text x="200" y="294" text-anchor="middle" font-family="Consolas, monospace" font-size="20" font-weight="900" fill="currentColor" letter-spacing="4">PRODUCT IMAGE</text></svg>`;
  /** showcase kind:"product" —— 左产品图（无 src 用设备线稿占位）+ 右规格表 + 价格印章 */
  function productPanel(data) {
    const el = h('div', 'nb-prod');
    const pic = h('div', 'pic');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.innerHTML = DEVICE_SVG('var(--nb-yellow)');
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? stamp(data.price, data.priceSmall || '', 'right:46px;bottom:34px;font-size:46px;') : null;
    if (price) el.appendChild(price);
    return { el, pic, rows, price };
  }
  function decOf(v) { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; }
  function fmtNum(v, dec) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
  /** 节点盒 a→b 的连线：按主方向取左右 / 上下锚点，返回三次贝塞尔与长度 */
  function linkGeom(a, b, NW, NH) {
    const ax = a.x + NW / 2, ay = a.y + NH / 2, bx = b.x + NW / 2, by = b.y + NH / 2, dx = bx - ax, dy = by - ay;
    let p0, p1, c1, c2;
    if (Math.abs(dx) * NH >= Math.abs(dy) * NW) {
      const sx = Math.sign(dx) || 1; p0 = { x: ax + sx * NW / 2, y: ay }; p1 = { x: bx - sx * (NW / 2 + 20), y: by };
      const mx = (p0.x + p1.x) / 2; c1 = { x: mx, y: p0.y }; c2 = { x: mx, y: p1.y };
    } else {
      const sy = Math.sign(dy) || 1; p0 = { x: ax, y: ay + sy * NH / 2 }; p1 = { x: bx, y: by - sy * (NH / 2 + 20) };
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

  // ============================== 8. stat 大数字冲击 / 数据对比 ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:156px;font-size:90px;', mark(data.title));
    const gap = 44, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 250 : n === 2 ? 180 : 135;
    const cards = items.map((it, i) => h('div', `nb-box lg nb-stat${i === n - 1 ? ' hot' : ''}`, `left:${60 + i * (w + gap)}px;width:${w}px;`,
      `${blank(it.label) ? '' : `<div class="lb">${esc(it.label)}</div>`}<br/><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div><div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div>`));
    const nums = cards.map((c) => c.querySelector('.num'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const st = data.delta ? stamp(data.delta, data.deltaSmall || '', 'left:990px;top:780px;font-size:56px;') : null;
    const note = data.note ? sticker(data.note, 'var(--nb-mint)', 'left:60px;top:806px;font-family:var(--nb-font-cn);font-size:30px;') : null;
    const star = prop('burst', [130, 'var(--nb-blue)', ''], 'left:1230px;top:220px;');
    el.append(kick, head, ...cards, star);
    if (note) el.appendChild(note);
    if (st) el.appendChild(st);
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    // v3.4：items[i].cue = 口播里的词（如数字「12」）→ 卡片在说到这个词的那一帧砸下，数字滚动和进度条共用同一个进度（同一条时钟）；
    //       不写 cue 时沿用原节奏（逐帧不变）
    const cuedAt = items.map((it) => (ctx.cue ? ctx.cue(it.cue, null) : null));
    const tIn = cards.map((_, i) => (cuedAt[i] != null ? cuedAt[i] : 0.6 + i * 0.5));
    const ROLL = 0.9;
    cards.forEach((c, i) => {
      A.add(c, -1, 0.01, { o: 0, y: -720 }, { o: 0, y: -720 });
      A.add(c, tIn[i], 0.5, { y: -720, o: 1, r: [-8, 7, -6][i] }, { y: 0, o: 1, r: [-1.4, 1.2, -1][i] }, 'slam');
      if (cuedAt[i] == null) A.add(c.querySelector('.bar i'), tIn[i] + 1.1, 0.6, { sx: 0 }, { sx: 1 }, 'out');
    });
    A.add(star, tIn[n - 1] + 0.5, 0.45, { s: 0, o: 0, r: -120 }, { s: 1, o: 1, r: 10 }, 'back');
    if (note) A.add(note, D - 2.4, 0.4, { s: 0, o: 0, r: 15 }, { s: 1, o: 1, r: -2 }, 'back');
    if (st) slamIn(A, st, Math.min(D - 1.2, tIn[n - 1] + 1.9), -8);
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 70); fitted = true; }
      items.forEach((it, i) => {
        if (cuedAt[i] != null) {   // 同一进度驱动数字和进度条
          const pr = EASE.out(clamp01((t - tIn[i]) / ROLL));
          nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * pr, decs[i]);
          cards[i].querySelector('.bar i').style.transform = `scale(${pr.toFixed(4)}, 1)`;
        } else nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.25) / 1.2)), decs[i]);
      });
      if (t > tIn[n - 1] + 1.0) star.style.transform = `rotate(${(10 + (t - tIn[n - 1] - 1.0) * 20).toFixed(1)}deg)`;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 550, 1.12, 1.5, -2.5, -0.5), CAM(1.2, 700, 510, 1.0, 1, -1, 0), CAM(D, 708, 505, 1.04, 0.5, 1, 0.2)] };
  }

  // ============================== 9. timeline 时间轴 / 演进（长轴横向跟拍） ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    // ≤5 个节点一屏铺满不横移；更多节点按 300 间距加长画布，由机位横向跟拍
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'nb-zone', `width:${W}px;`);
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:156px;font-size:90px;', mark(data.title));
    const line = h('div', 'nb-tl-line', `width:${W - 120}px;`);
    el.append(kick, head, line);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const BG = ['var(--nb-yellow)', 'var(--nb-blue)', 'var(--nb-mint)'], INV = [false, true, false];
    const parts = nodes.map((nd, i) => {
      // v3.4.1：nodes[i].cue = 口播里的词 → 这个节点在说到这个词的那一帧出现；不写 cue 时沿用原节奏（逐帧不变）
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 290 : 640, at = ctx.cue ? ctx.cue(nd.cue, t0 + i * stp) : t0 + i * stp, isNow = i === now;
      const inv = isNow || INV[i % 3];
      const card = h('div', `nb-box lg nb-tl-node${inv ? ' inv' : ''}`, `left:${x}px;top:${top}px;background:${isNow ? 'var(--nb-coral)' : BG[i % 3]};`,
        `${blank(nd.time) ? '' : `<div class="tm">${esc(nd.time)}</div>`}<div class="t">${esc(nd.title || '')}</div>${blank(nd.desc) ? '' : `<div class="d">${esc(nd.desc)}</div>`}`);
      const stem = h('div', 'nb-tl-stem', `left:${x + 36}px;top:${up ? 494 : 564}px;height:${up ? 52 : 76}px;`);
      const dot = h('div', `nb-tl-dot${isNow ? ' now' : ''}`, `left:${x + 22}px;top:538px;`);
      el.append(stem, dot, card);
      A.add(dot, at - 0.1, 0.3, { s: 0, o: 0, r: 45 }, { s: 1, o: 1, r: 0 }, 'back');
      A.add(stem, at, 0.2, { o: 0 }, { o: 1 });
      A.add(card, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(card, at + 0.05, 0.45, { y: up ? -260 : 260, o: 1, r: up ? -8 : 8 }, { y: 0, o: 1, r: [-1.6, 1.4, -1.2, 1.5][i % 4] }, 'slam');
      return { x, up, top, at, card, cued: !!(ctx.cue && ctx.cue(nd.cue, null) != null) };
    });
    // v3.4.1 聚光：讲到哪个节点，它亮边 + 微放大，前面的压暗（只在读到 cue 时启用）
    if (FX() && data.focus !== false && parts.some((p) => p.cued)) {
      const fo = parts.map((p) => FX().attach(p.card));
      A.fn((t) => { const f = FX().track(t, parts.map((p) => p.at + 0.05)); fo.forEach((o, i) => FX().apply(o, f[i], 'fade')); });
    }
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = stamp(data.nowLabel, data.nowSmall || '', `left:${Math.min(W - 280, p.x + (p.up ? 10 : 110))}px;top:${p.up ? 616 : p.top + 196}px;font-size:36px;`);
      ns.classList.add('yellow'); el.appendChild(ns);
      slamIn(A, ns, Math.min(D - 0.9, p.at + 0.7), -7);
    }
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    A.add(line, 0.4, 0.7, { sx: 0 }, { sx: 1 }, 'out');
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1.5, -2.5, -0.4), CAM(0.9, 700, 508, 1.0, 1, -1, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 508, 1.0, 0.5, 1, 0), CAM(D, endX + 8, 505, 1.02, 0.3, 1, 0.2)] };
  }

  // ============================== 10. diagram 关系 / 架构图（节点 + 粗黑连线 + 流动脉冲） ==============================
  let DG_SEQ = 0;
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 290, AW = 1280, AH = 610, NW = 260, NH = 124;
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:156px;font-size:90px;', mark(data.title));
    el.append(kick, head);
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = h('div', 'nb-box lg nb-dg-node', `left:${x}px;top:${y}px;`, `<div class="bd" style="background:${PALETTE[i % 4]};"></div><div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      el.appendChild(e);
      A.add(e, -1, 0.01, { o: 0, s: 0 }, { o: 0, s: 0 });
      A.add(e, appear[nd.id], 0.45, { s: 0, o: 1, r: -14 }, { s: 1, o: 1, r: [-1.4, 1.2, -1, 1.4][i % 4] }, 'back');
      return e;
    });
    const mid = `nbdg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="20" markerHeight="20" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill="#111111"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="#111111" stroke-width="7" fill="none" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mid})"/>`;
      inner += `<rect class="pl" data-j="${j}" data-k="0" x="-9" y="-9" width="18" height="18" fill="var(--nb-yellow)" stroke="#111111" stroke-width="3" opacity="0"/><rect class="pl" data-j="${j}" data-k="1" x="-9" y="-9" width="18" height="18" fill="var(--nb-mint)" stroke="#111111" stroke-width="3" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'nb-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'nb-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'nb-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.4, 0.3, { s: 0, o: 0, r: 12 }, { s: 1, o: 1, r: -2 }, 'back');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = stamp(data.focusLabel, data.focusSmall || '', `left:${Math.min(1140, p.x + 150)}px;top:${p.y - 62}px;font-size:32px;`);
      st.classList.add('yellow'); el.appendChild(st);
      slamIn(A, st, tF + 0.25, -8);
    }
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    A.fn((t) => {
      lnEls.forEach((p) => { const j = +p.dataset.j, g = geo[j]; p.setAttribute('stroke-dashoffset', (g.len * (1 - EASE.inOut(clamp01((t - tDraw[j]) / 0.45)))).toFixed(1)); });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.55;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.55 + (+r.dataset.k) * 0.5) % 1);
        r.setAttribute('opacity', '1'); r.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 570, 1.12, 1.5, -2.5, -0.4), CAM(1.2, 700, 518, 1.0, 1, -1, 0), CAM(D, 708, 515, 1.03, 0.5, 1, 0.2)] };
  }

  global.NeoBrutalism = {
    version: '1.1.0',
    PROPS, Animator, EASE, PALETTE, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro },
      stat: { create: stat }, timeline: { create: timeline }, diagram: { create: diagram }
    }
  };
})(window);
