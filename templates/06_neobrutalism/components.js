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
  function kicker(text, style) { return h('div', 'nb-kicker', style, esc(text)); }
  function sticker(text, bg, style, small) { return h('div', 'nb-sticker', `background:${bg};${style || ''}`, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`); }
  function stamp(text, small, style) { return h('div', 'nb-stamp', style, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`); }
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
    const ch = h('div', 'nb-box lg nb-cover-ch', null, `<div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="n">${esc(data.chapter || '01')}</div>`);
    const sub = h('div', 'nb-box nb-cover-sub', null, mark(data.subtitle));
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

  // ============================== 2. steps 撞色票据卡逐张砸落 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:156px;font-size:96px;', mark(data.title));
    const tag = sticker(data.dim || `${n} STEPS`, 'var(--nb-yellow)', 'left:1110px;top:170px;font-size:34px;');
    const AW = 56, cw = (1280 - AW * (n - 1)) / n;
    const cards = items.map((it, i) => h('div', `nb-box lg nb-ticket${ON_DARK[i % 4] ? ' inv' : ''}`, `left:${60 + i * (cw + AW)}px;width:${cw}px;background:${PALETTE[i % 4]};`,
      `<div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="hole"></div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div>`));
    const arrows = items.slice(1).map((_, i) => prop('arrow', [44, 46], `left:${60 + (i + 1) * (cw + AW) - AW + 2}px;top:508px;`));
    const bar = h('div', 'nb-box nb-steps-bar', 'box-shadow:8px 8px 0 var(--nb-yellow);',
      `<div class="f">▣ ${esc(data.folder || 'PROJECT /')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`);
    const label = data.label ? sticker(data.label, 'var(--nb-coral)', 'left:1070px;top:776px;color:#fff;font-family:var(--nb-font-cn);font-size:36px;', data.labelSmall || '') : null;
    el.append(kick, head, tag, ...cards, ...arrows, bar);
    if (label) el.appendChild(label);
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    A.add(tag, 0.6, 0.35, { s: 0, o: 0, r: -30 }, { s: 1, o: 1, r: 4 }, 'back');
    A.add(bar, 0.5, 0.45, { y: 200, o: 0 }, { y: 0, o: 1 }, 'back');
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.5, D - 2.2), t0 + 0.6 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    cards.forEach((c, i) => A.add(c, t0 + i * stp, 0.5, { y: -760, r: [-9, 7, -6, 8, -7][i], o: 1 }, { y: 0, o: 1, r: [-1.6, 1.4, -1.2, 1.6, -1.4][i] }, 'slam'));
    cards.forEach((c) => A.add(c, -1, 0.01, { o: 0, y: -760 }, { o: 0, y: -760 })); // 入场前隐藏
    arrows.forEach((a, i) => A.add(a, t0 + (i + 1) * stp + 0.25, 0.3, { s: 0, o: 0, x: -20 }, { s: 1, o: 1, x: 0 }, 'back'));
    if (label) A.add(label, D - 1.3, 0.4, { s: 0, o: 0, r: 25 }, { s: 1, o: 1, r: -4 }, 'back');
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 600, 1.2, 2, -2.5, -0.5), CAM(1.2, 700, 510, 1.0, 1, -1, 0), CAM(D, 705, 505, 1.03, 0.5, 1, 0.2)] };
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
    rows.forEach((r, i) => {
      A.add(r, t0 + i * stp - 0.3, 0.25, { o: 0.25, x: -14 }, { o: 1, x: 0 });
      A.add(r.querySelector('.hl'), t0 + i * stp + 0.15, 0.32, { sx: 0 }, { sx: 1 }, 'out');
      A.add(r.querySelector('.box'), t0 + i * stp, 0.25, { s: 1.35 }, { s: 1 }, 'back');
    });
    // 行荧光条宽度按文字自适应（首帧测量一次）
    let measured = false;
    const cks = rows.map((r) => r.querySelector('.nb-ck'));
    A.fn((t) => {
      if (!measured) { rows.forEach((r) => { const k = r.querySelector('.k'); const w = k.scrollWidth; if (w > 0) { r.querySelector('.hl').style.width = `${w + 30}px`; measured = true; } }); }
      cks.forEach((c, i) => c.setAttribute('stroke-dashoffset', (74 * (1 - EASE.out(clamp01((t - (t0 + i * stp)) / 0.22)))).toFixed(1)));
    });
    if (memo) A.add(memo, D - 2.0, 0.45, { s: 0, o: 0, r: 14 }, { s: 1, o: 1, r: -2.5 }, 'back');
    A.add(star, Math.max(t1 + 0.3, D - 1.6), 0.45, { s: 0, o: 0, r: -120 }, { s: 1, o: 1, r: 10 }, 'back');
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.04, 1.5, -2, 0), CAM(1.0, 700, 500, 1.01, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.01, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 4. compare 灰底删除线 vs 薄荷绿正确项 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:156px;font-size:90px;', mark(data.title));
    const L = h('div', 'nb-box lg nb-cmp wrong', 'left:60px;',
      `<div class="band">${esc(w.label || '✕ WRONG')}</div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div><svg class="strike" width="480" height="150"><path d="M4 44 L440 38" stroke="var(--nb-coral)" stroke-width="13" fill="none" stroke-dasharray="440" stroke-dashoffset="440"/><path d="M4 112 L400 106" stroke="var(--nb-coral)" stroke-width="13" fill="none" stroke-dasharray="400" stroke-dashoffset="400"/></svg>`);
    const R = h('div', 'nb-box lg nb-cmp right', 'left:800px;',
      `<div class="band">${esc(r.label || '✓ RIGHT')}</div><div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div><div class="badge">${PROPS.check(50, 11).replace('#111111', 'var(--nb-mint)')}</div>`);
    const vs = h('div', 'nb-vs', null, '<div class="dm"></div><div class="tx">VS</div>');
    const xs = stamp(w.stamp || '✕', '', 'left:300px;top:610px;font-size:44px;');
    const verdict = h('div', 'nb-box lg nb-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span>`);
    const star = prop('burst', [118, 'var(--nb-coral)', 'OK!'], 'left:1255px;top:752px;z-index:9;');
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
    const card = h('div', 'nb-q', side, `<div class="k">${esc(data.kicker || 'QUOTE')}</div><div class="t">${mark(data.text)}</div><div class="by">${esc(data.by || '')}</div>`);
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
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'nb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'nb-head', 'left:56px;top:150px;font-size:90px;', mark(data.title));
    const tagBg = ['var(--nb-blue)', 'var(--nb-coral)', 'var(--nb-mint)'];
    const acts = (data.actions || []).slice(0, 3).map((a, i) => h('div', 'nb-box nb-act', `top:${272 + i * 180}px;`,
      `<div class="tg" style="background:${tagBg[i]};color:${i === 2 ? 'var(--nb-ink)' : '#fff'}">${esc(a.tag || 'ACTION')}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div><div class="no">${String(i + 1).padStart(2, '0')}</div>`));
    const c = data.cta || {};
    const btnBg = ['var(--nb-yellow)', '#fff', 'var(--nb-mint)'];
    const cta = h('div', 'nb-box lg nb-cta', null, `<div class="k">${esc(c.kicker || 'OPEN SOURCE')}</div><div class="t">${esc(c.title || '')}</div><div class="repo">${esc(c.repo || '')}</div><div class="btns">${(c.buttons || []).slice(0, 3).map((b, i) => `<span style="background:${btnBg[i]}">${esc(b)}</span>`).join('')}</div>`);
    const go = stamp(c.stamp || 'GO', c.stampSmall || '', 'left:1120px;top:700px;font-size:66px;');
    go.classList.add('mint');
    const tp = tape('left:950px;top:262px;transform:rotate(-6deg);');
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
      `<div class="lb">${esc(it.label || '')}</div><br/><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div><div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div>`));
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
    const tIn = cards.map((_, i) => 0.6 + i * 0.5);
    cards.forEach((c, i) => {
      A.add(c, -1, 0.01, { o: 0, y: -720 }, { o: 0, y: -720 });
      A.add(c, tIn[i], 0.5, { y: -720, o: 1, r: [-8, 7, -6][i] }, { y: 0, o: 1, r: [-1.4, 1.2, -1][i] }, 'slam');
      A.add(c.querySelector('.bar i'), tIn[i] + 1.1, 0.6, { sx: 0 }, { sx: 1 }, 'out');
    });
    A.add(star, tIn[n - 1] + 0.5, 0.45, { s: 0, o: 0, r: -120 }, { s: 1, o: 1, r: 10 }, 'back');
    if (note) A.add(note, D - 2.4, 0.4, { s: 0, o: 0, r: 15 }, { s: 1, o: 1, r: -2 }, 'back');
    if (st) slamIn(A, st, Math.min(D - 1.2, tIn[n - 1] + 1.9), -8);
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 70); fitted = true; }
      items.forEach((it, i) => { nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.25) / 1.2)), decs[i]); });
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
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 290 : 640, at = t0 + i * stp, isNow = i === now;
      const inv = isNow || INV[i % 3];
      const card = h('div', `nb-box lg nb-tl-node${inv ? ' inv' : ''}`, `left:${x}px;top:${top}px;background:${isNow ? 'var(--nb-coral)' : BG[i % 3]};`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', 'nb-tl-stem', `left:${x + 36}px;top:${up ? 494 : 564}px;height:${up ? 52 : 76}px;`);
      const dot = h('div', `nb-tl-dot${isNow ? ' now' : ''}`, `left:${x + 22}px;top:538px;`);
      el.append(stem, dot, card);
      A.add(dot, at - 0.1, 0.3, { s: 0, o: 0, r: 45 }, { s: 1, o: 1, r: 0 }, 'back');
      A.add(stem, at, 0.2, { o: 0 }, { o: 1 });
      A.add(card, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(card, at + 0.05, 0.45, { y: up ? -260 : 260, o: 1, r: up ? -8 : 8 }, { y: 0, o: 1, r: [-1.6, 1.4, -1.2, 1.5][i % 4] }, 'slam');
      return { x, up, top, at };
    });
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
