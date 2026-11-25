/**
 * Mushanhe Video Engine — 风格包 09 · 日系胶片 / 独立杂志（Analog Film）
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print / 06_neobrutalism 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · stat · steps · checklist · compare · timeline · diagram · showcase[code|terminal|doc|image|video|product] · quote · outro
 *
 *   const comp = AnalogFilm.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : { el, layer:'world'|'screen', avatar, cams:[{t,x,y,zoom,rx,ry,rz}], update(localT), w? }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：奶白杂志纸 #F6F3EC · 拍立得白边（18px / 底 74px）+ 柔和纸面投影 · 1px 胶片黑细线分割
 *          · 35mm 齿孔条（透明孔）· 胶片日期橙 #FF7B29 发光日期戳 · 即显相纸“显影”动画 · 油性记号笔圈注。
 */
(function (global) {
  'use strict';

  // ============================== 工具 ==============================
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const EASE = {
    linear: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    soft: (x) => 1 - Math.pow(1 - x, 4),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    in: (x) => x * x * x,
    back: (x) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
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
      if (!el) return this;
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

  /** 相纸色调：青绿 / 日落 / 暗棕 / 深青 */
  const TINTS = ['teal', 'sunset', 'umber', 'deep'];
  const DATE = '26 11 25';

  // ============================== 纯 SVG 实体道具 ==============================
  /** 确定性伪随机 */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /** 油性记号笔手绘圈（略超过一圈的抖动椭圆），返回 path d 与长度 */
  function loosePath(w, hgt, seed = 7) {
    const R = rng(seed), cx = w / 2, cy = hgt / 2, rx = w / 2 - 8, ry = hgt / 2 - 8, N = 40;
    let d = '', len = 0, prev = null;
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI * 0.62 + (i / N) * Math.PI * 2 * 1.12;
      const j = 1 + (R() - 0.5) * 0.035 + (i / N) * 0.04;
      const x = cx + Math.cos(a) * rx * j, y = cy + Math.sin(a) * ry * j;
      d += (i ? ' L' : 'M') + `${x.toFixed(1)} ${y.toFixed(1)}`;
      if (prev) len += Math.hypot(x - prev.x, y - prev.y); prev = { x, y };
    }
    return { d, len: Math.ceil(len) };
  }
  const PROPS = {
    loop(w, hgt, seed, color = 'var(--af-marker)', sw = 6) {
      const p = loosePath(w, hgt, seed);
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" style="overflow:visible"><path class="af-draw" d="${p.d}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${p.len}" stroke-dashoffset="${p.len}" opacity=".92"/></svg>`;
    },
    /** 手写勾 */
    check(size = 56, color = 'var(--af-marker)', sw = 6) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" style="overflow:visible"><path class="af-draw" d="M6 33 Q14 38 23 50 Q33 26 57 5" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="80" stroke-dashoffset="80"/></svg>`;
    },
    /** 记号笔删除线 */
    strike(w, color = 'var(--af-marker)') {
      return `<path class="af-draw" d="M4 10 Q${w * 0.4} 2 ${w} 8" stroke="${color}" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="${w + 20}" stroke-dashoffset="${w + 20}"/>`;
    },
    /** 35mm 胶片暗盒 */
    canister(label = 'PORTRA 400') {
      return `<svg width="230" height="300" viewBox="0 0 230 300" style="overflow:visible">
        <defs><linearGradient id="afcanB" x1="0" x2="1"><stop offset="0" stop-color="#1B1A18"/><stop offset=".35" stop-color="#3C3933"/><stop offset=".6" stop-color="#22201D"/><stop offset="1" stop-color="#0F0E0D"/></linearGradient>
        <linearGradient id="afcanL" x1="0" x2="1"><stop offset="0" stop-color="#B9542A"/><stop offset=".35" stop-color="#F08A50"/><stop offset=".65" stop-color="#E06D3B"/><stop offset="1" stop-color="#9C3F22"/></linearGradient>
        <linearGradient id="afcanC" x1="0" x2="1"><stop offset="0" stop-color="#77736B"/><stop offset=".4" stop-color="#E9E5DC"/><stop offset="1" stop-color="#6A665F"/></linearGradient></defs>
        <rect x="128" y="96" width="102" height="96" fill="#2A2420"/>
        <g fill="#F6F3EC">${[0, 1, 2, 3, 4].map((i) => `<rect x="${140 + i * 18}" y="102" width="9" height="12" rx="2"/><rect x="${140 + i * 18}" y="174" width="9" height="12" rx="2"/>`).join('')}</g>
        <rect x="118" y="96" width="14" height="96" fill="#1A1613"/>
        <rect x="58" y="10" width="30" height="22" fill="url(#afcanC)"/>
        <rect x="20" y="28" width="106" height="18" rx="4" fill="url(#afcanC)"/>
        <rect x="24" y="44" width="98" height="214" fill="url(#afcanB)"/>
        <rect x="24" y="92" width="98" height="104" fill="url(#afcanL)"/>
        <text x="73" y="128" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="24" font-weight="700" fill="#FDF6EC">400</text>
        <text x="73" y="152" text-anchor="middle" font-family="Consolas, monospace" font-size="11" font-weight="700" fill="#FDF6EC" letter-spacing="2">${esc(label)}</text>
        <text x="73" y="178" text-anchor="middle" font-family="Consolas, monospace" font-size="10" fill="#FDF6EC" letter-spacing="2">35mm · 36EXP</text>
        <rect x="20" y="256" width="106" height="18" rx="4" fill="url(#afcanC)"/>
      </svg>`;
    }
  };

  function prop(name, args, style) { return h('div', 'af-prop', style, PROPS[name](...(args || []))); }
  function kicker(text, style) { return h('div', 'af-kicker', style, `<span class="no">No.</span>${esc(text)}<i></i>`); }
  /** 圆形价签贴纸 */
  function dotSticker(text, small, size, cls, style) {
    return h('div', `af-dot ${cls || ''}`, `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.2)}px;${style || ''}`, `<div><b>${esc(text)}</b>${small ? `<small>${esc(small)}</small>` : ''}</div>`);
  }
  function tape(style) { return h('div', 'af-tape', style); }
  function dateStamp(text, size, style) { return h('div', 'af-date', `font-size:${size}px;${style || ''}`, esc(text || `'${DATE}`)); }
  /** "这句**关键词**话" → ** 包裹部分做暖橘高亮 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }
  /** 拍立得：返回 { el, ph(相纸区), cap(底部手写区), dev(显影遮罩) } */
  function polaroid(w, phH, tint, style, capHtml) {
    const el = h('div', 'af-pola', `width:${w}px;${style || ''}`);
    const ph = h('div', `ph ${tint || ''}`, `height:${phH}px;`);
    const dev = h('div', 'dev');
    ph.appendChild(dev);
    const cap = h('div', 'cap', null, capHtml || '');
    el.append(ph, cap);
    return { el, ph, cap, dev };
  }
  /** 显影：相纸从暗褐色逐渐显出画面 */
  const develop = (A, dev, at, d = 1.5) => { A.add(dev, -1, 0.01, { o: 1 }, { o: 1 }); A.add(dev, at, d, { o: 1 }, { o: 0 }, 'inOut'); };
  /** 驱动 .af-draw 描线（stroke-dashoffset 从全长到 0） */
  function drawPath(p, t, at, d) { const L = +p.getAttribute('stroke-dasharray'); p.setAttribute('stroke-dashoffset', (L * (1 - EASE.inOut(clamp01((t - at) / d)))).toFixed(1)); }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .af-zone{position:absolute;width:1400px;height:1100px;font-family:var(--af-font-cn);color:var(--af-ink)}
  .af-prop{position:absolute;z-index:5}
  .af-prop svg{display:block}
  .af-kicker{position:absolute;display:flex;align-items:center;gap:12px;font-family:var(--af-font-mono);font-size:20px;font-weight:700;letter-spacing:.2em;color:var(--af-ink);white-space:nowrap}
  .af-kicker .no{font-family:var(--af-font-serif);font-style:italic;font-weight:400;letter-spacing:0;font-size:24px;color:var(--af-sunset)}
  .af-kicker i{display:block;width:120px;height:1px;background:var(--af-ink);opacity:.7}
  .af-head{position:absolute;font-weight:700;letter-spacing:.02em;line-height:1.12;color:var(--af-ink);white-space:nowrap}
  .af-zone em,.af-q em{font-style:normal;color:var(--af-sunset);background:linear-gradient(transparent 70%,rgba(255,123,41,.24) 70%)}
  .af-on-dark em{color:#FFC08F;background:linear-gradient(transparent 72%,rgba(255,123,41,.35) 72%)}
  .af-rule{position:absolute;height:1px;background:var(--af-ink);opacity:.75;transform-origin:left center}
  .af-cap{position:absolute;font-family:var(--af-font-mono);font-size:17px;letter-spacing:.14em;color:var(--af-mute);white-space:nowrap}
  .af-date{position:absolute;font-family:var(--af-font-mono);font-weight:700;letter-spacing:.12em;color:var(--af-date);white-space:nowrap;
    text-shadow:0 0 5px rgba(255,123,41,.85),0 0 14px rgba(255,90,20,.45)}
  /* 拍立得 */
  .af-pola{position:absolute;box-sizing:border-box;padding:18px 18px 0;background:var(--af-white);
    box-shadow:0 1px 1px rgba(60,40,20,.08),0 10px 18px rgba(60,40,20,.14),0 26px 48px rgba(60,40,20,.14)}
  .af-pola .ph{position:relative;overflow:hidden;background:#D9D2C4}
  .af-pola .ph.teal{background:radial-gradient(120% 90% at 92% 8%,rgba(255,150,70,.42),transparent 55%),linear-gradient(165deg,#378474 0%,#2B6E63 48%,#1D4740 100%);color:var(--af-cream)}
  .af-pola .ph.sunset{background:radial-gradient(90% 70% at 15% 10%,rgba(255,230,170,.55),transparent 60%),linear-gradient(172deg,#F1A458 0%,#E06D3B 50%,#9A3D27 100%);color:var(--af-cream)}
  .af-pola .ph.umber{background:radial-gradient(100% 80% at 85% 15%,rgba(255,140,60,.30),transparent 60%),linear-gradient(170deg,#5A4A3C 0%,#3B3029 60%,#241D19 100%);color:var(--af-cream)}
  .af-pola .ph.deep{background:radial-gradient(100% 80% at 10% 90%,rgba(255,123,41,.26),transparent 60%),linear-gradient(170deg,#24564E 0%,#1A3F39 60%,#122B27 100%);color:var(--af-cream)}
  .af-pola .ph.faded{background:radial-gradient(110% 90% at 80% 10%,rgba(255,255,255,.7),transparent 60%),linear-gradient(170deg,#E9E3D7 0%,#DCD4C6 60%,#CFC6B6 100%);color:var(--af-ink)}
  .af-pola .ph .dev{position:absolute;inset:0;z-index:9;background:radial-gradient(80% 70% at 50% 45%,#5B4E42,#2E2620);pointer-events:none}
  .af-pola .cap{height:74px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 4px;font-family:var(--af-font-mono);font-size:19px;letter-spacing:.12em;color:var(--af-ink);white-space:nowrap}
  .af-pola .cap b{font-family:var(--af-font-cn);font-size:25px;letter-spacing:.04em;font-weight:700}
  .af-tape{position:absolute;z-index:7;width:140px;height:36px;background:rgba(232,220,192,.82);box-shadow:0 1px 2px rgba(60,40,20,.12);
    background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.18) 0 3px,transparent 3px 9px);clip-path:polygon(0 8%,4% 0,8% 10%,12% 0,100% 0,100% 92%,96% 100%,92% 90%,88% 100%,0 100%)}
  .af-dot{position:absolute;z-index:8;border-radius:50%;background:var(--af-sunset);color:var(--af-cream);display:flex;align-items:center;justify-content:center;text-align:center;
    box-shadow:0 6px 14px rgba(120,50,20,.25), inset 0 0 0 4px rgba(255,255,255,.22)}
  .af-dot b{display:block;font-weight:700;line-height:1.05;white-space:nowrap}
  .af-dot small{display:block;margin-top:6px;font-family:var(--af-font-mono);font-size:.4em;letter-spacing:.18em;opacity:.92;white-space:nowrap}
  .af-dot.teal{background:var(--af-teal)}
  .af-dot.ink{background:var(--af-ink)}
  /* 35mm 齿孔带（透明孔，露出纸面） */
  .af-perf{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='44'%3E%3Cpath fill='%23131110' fill-rule='evenodd' d='M0 0H28V44H0Z M9 14h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2z'/%3E%3C/svg%3E");background-repeat:repeat-x;background-size:28px 100%}
  /* cover */
  .af-cover-title{position:absolute;left:52px;top:150px;font-size:150px;font-weight:700;letter-spacing:.01em;line-height:1.12;white-space:nowrap}
  .af-cover-title span{display:inline-block}
  .af-cover-sub{position:absolute;left:64px;top:520px;padding-left:24px;border-left:3px solid var(--af-sunset);font-size:40px;font-weight:500;line-height:1.5;white-space:nowrap}
  .af-cover-ch{position:absolute;left:22px;bottom:6px;font-family:var(--af-font-serif);font-style:italic;font-size:250px;line-height:1;letter-spacing:-.04em;color:var(--af-cream);text-shadow:0 6px 30px rgba(80,20,0,.25)}
  .af-cover-chl{position:absolute;left:28px;top:24px;font-family:var(--af-font-mono);font-size:18px;letter-spacing:.3em;color:var(--af-cream)}
  /* stat */
  .af-stat .ph{padding:26px 30px}
  .af-stat .lb{font-family:var(--af-font-mono);font-size:18px;letter-spacing:.2em;opacity:.85;white-space:nowrap}
  .af-stat .num{position:absolute;left:28px;top:70px;font-family:var(--af-font-serif);font-style:italic;letter-spacing:-.03em;line-height:1;white-space:nowrap}
  .af-stat .num .u{font-family:var(--af-font-cn);font-style:normal;font-size:.24em;letter-spacing:.04em;margin-left:.2em;font-weight:700}
  .af-stat .num .pf{font-family:var(--af-font-cn);font-style:normal;font-size:.24em;margin-right:.1em;font-weight:700}
  .af-stat .cells{position:absolute;left:30px;right:30px;bottom:26px;display:flex;gap:6px;height:26px}
  .af-stat .cells i{flex:1;border:1.5px solid currentColor;opacity:.55;box-sizing:border-box}
  .af-stat .cells i.on{background:var(--af-date);border-color:var(--af-date);opacity:1;box-shadow:0 0 8px rgba(255,123,41,.6)}
  .af-stat .ph.faded .cells i.on{background:var(--af-ink);border-color:var(--af-ink);box-shadow:none}
  /* steps 接触印样胶片条 */
  .af-strip{position:absolute;left:60px;top:290px;width:1280px;height:440px;background:linear-gradient(#131110,#131110) 0 44px/100% 352px no-repeat;filter:drop-shadow(0 14px 22px rgba(40,25,10,.28))}
  .af-strip .pf{position:absolute;left:0;right:0;height:44px}
  .af-strip .edge{position:absolute;font-family:var(--af-font-mono);font-size:14px;font-weight:700;letter-spacing:.16em;color:var(--af-date);opacity:.9;white-space:nowrap}
  .af-frame{position:absolute;top:58px;height:324px;overflow:hidden;color:var(--af-cream)}
  .af-frame .bgc{position:absolute;inset:0}
  .af-frame .no{position:absolute;left:22px;top:12px;font-family:var(--af-font-serif);font-style:italic;font-size:70px;line-height:1}
  .af-frame .nm{position:absolute;left:24px;top:132px;font-size:54px;font-weight:700;line-height:1.1;white-space:nowrap}
  .af-frame .fn{position:absolute;left:24px;right:24px;bottom:22px;padding:8px 12px;border:1px solid rgba(253,250,243,.7);font-family:var(--af-font-mono);font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .af-frame .unexp{position:absolute;inset:0;background:#0E0C0B;z-index:4}
  .af-frame .flash{position:absolute;inset:0;background:#FFF3DF;z-index:5;opacity:0}
  .af-capbar{position:absolute;left:60px;top:820px;width:1280px;height:80px;border-top:1px solid var(--af-ink);border-bottom:1px solid var(--af-ink);display:flex;align-items:center;gap:22px;box-sizing:border-box;padding:0 6px}
  .af-capbar .f{font-family:var(--af-font-mono);font-size:24px;letter-spacing:.08em;white-space:nowrap}
  .af-capbar .b{font-family:var(--af-font-serif);font-style:italic;font-size:44px;color:var(--af-sunset);white-space:nowrap}
  .af-capbar .m{margin-left:auto;margin-right:330px;font-family:var(--af-font-mono);font-size:15px;letter-spacing:.12em;color:var(--af-mute);line-height:1.45;text-align:right;white-space:nowrap}
  .af-mk{position:absolute;z-index:8;color:var(--af-marker);font-weight:700;white-space:nowrap;transform-origin:left center}
  .af-mk small{display:block;font-family:var(--af-font-mono);font-size:.46em;letter-spacing:.2em;font-weight:700;margin-top:2px}
  /* checklist 冲洗店工作单 */
  .af-sheet{position:absolute;left:110px;top:100px;width:900px;background:var(--af-white);box-sizing:border-box;
    box-shadow:0 1px 1px rgba(60,40,20,.08),0 14px 30px rgba(60,40,20,.14);
    background-image:linear-gradient(90deg,transparent 98px,rgba(224,109,59,.35) 98px,rgba(224,109,59,.35) 100px,transparent 100px)}
  .af-sheet .hd{position:absolute;left:0;right:0;top:0;height:52px;border-bottom:1px solid var(--af-ink);display:flex;align-items:center;gap:14px;padding:0 28px 0 120px;font-family:var(--af-font-mono);font-size:17px;letter-spacing:.18em;white-space:nowrap}
  .af-sheet .hd .af-date{position:relative;margin-left:auto;font-size:20px}
  .af-sheet .ttl{position:absolute;left:120px;top:70px;font-family:var(--af-font-serif);font-style:italic;font-size:92px;letter-spacing:-.02em;line-height:1;white-space:nowrap}
  .af-sheet .sub{position:absolute;left:124px;top:178px;font-size:30px;font-weight:500;color:var(--af-mute);white-space:nowrap}
  .af-sheet .hr{position:absolute;left:28px;right:28px;top:238px;height:1px;background:var(--af-ink)}
  .af-row{position:absolute;left:0;right:28px;height:100px;border-bottom:1px dashed rgba(26,26,26,.22)}
  .af-row .n{position:absolute;left:26px;top:24px;font-family:var(--af-font-serif);font-style:italic;font-size:34px;color:var(--af-sunset)}
  .af-row .box{position:absolute;left:122px;top:20px;width:40px;height:40px;border:1.5px solid var(--af-ink);box-sizing:border-box}
  .af-row .box svg{position:absolute;left:-6px;top:-18px}
  .af-row .k{position:absolute;left:186px;top:14px;font-size:38px;font-weight:700;white-space:nowrap}
  .af-row .hl{position:absolute;left:180px;top:40px;height:18px;width:300px;background:rgba(255,123,41,.24);transform-origin:left center}
  .af-row .d{position:absolute;left:188px;top:64px;font-size:22px;color:var(--af-mute);white-space:nowrap}
  .af-memo{position:absolute;left:120px;font-size:36px;font-weight:700;white-space:nowrap}
  .af-memo small{display:block;font-family:var(--af-font-mono);font-size:17px;letter-spacing:.16em;color:var(--af-mute);font-weight:400;margin-bottom:8px}
  .af-memo em{font-style:normal;color:var(--af-sunset)}
  /* compare */
  .af-cmp .ph{padding:0}
  .af-cmp .t{position:absolute;left:32px;top:40px;font-size:56px;font-weight:700;line-height:1.2;white-space:nowrap}
  .af-cmp .d{position:absolute;left:32px;right:24px;top:216px;font-size:23px;line-height:1.5}
  .af-cmp .ph.faded .t,.af-cmp .ph.faded .d{color:#8F877A}
  .af-cmp svg.strike{position:absolute;left:24px;top:62px;overflow:visible;z-index:3}
  .af-cmp .badge{position:absolute;right:-26px;top:-26px;width:82px;height:82px;border-radius:50%;background:var(--af-sunset);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(120,50,20,.25);z-index:9}
  .af-vs{position:absolute;left:640px;top:440px;width:120px;text-align:center;font-family:var(--af-font-serif);font-style:italic;font-size:72px;color:var(--af-ink)}
  .af-vs small{display:block;font-family:var(--af-font-mono);font-style:normal;font-size:14px;letter-spacing:.3em;color:var(--af-mute)}
  .af-reject{position:absolute;z-index:9;padding:8px 20px;border:3px solid var(--af-marker);color:var(--af-marker);font-size:38px;font-weight:700;white-space:nowrap;background:rgba(253,250,243,.55)}
  .af-verdict{position:absolute;left:60px;top:800px;width:1280px;height:104px;border-top:1px solid var(--af-ink);border-bottom:1px solid var(--af-ink);display:flex;align-items:center;gap:28px;box-sizing:border-box;padding:0 8px}
  .af-verdict b{padding:5px 14px;border:1px solid var(--af-ink);font-family:var(--af-font-mono);font-size:18px;font-weight:700;letter-spacing:.24em;white-space:nowrap}
  .af-verdict span{font-size:46px;font-weight:700;white-space:nowrap}
  /* showcase */
  .af-panel{position:absolute;left:60px;top:262px;width:1240px;height:640px;overflow:hidden}
  .af-panel.dark{background:linear-gradient(#1A1714,#1A1714) 0 40px/100% 560px no-repeat;color:#EFE8DA;filter:drop-shadow(0 14px 24px rgba(40,25,10,.3))}
  .af-panel.light{background:var(--af-white);color:var(--af-ink);box-shadow:0 1px 1px rgba(60,40,20,.08),0 18px 40px rgba(60,40,20,.16)}
  .af-panel .pf{position:absolute;left:0;right:0;height:40px;z-index:3}
  .af-panel .bar{position:absolute;left:0;right:0;top:40px;height:50px;display:flex;align-items:center;gap:16px;padding:0 30px;border-bottom:1px solid rgba(239,232,218,.18);font-family:var(--af-font-mono);font-size:19px;letter-spacing:.12em}
  .af-panel.light .bar{top:0;border-bottom:1px solid var(--af-ink)}
  .af-panel .bar .ep{margin-left:auto;color:var(--af-date);font-size:15px;font-weight:700;text-shadow:0 0 5px rgba(255,123,41,.6)}
  .af-code{position:absolute;left:0;right:0;top:92px;padding:18px 34px;font-family:var(--af-font-mono);font-size:30px;line-height:1.6;white-space:pre}
  .af-panel.light .af-code{top:52px;font-family:var(--af-font-cn);font-size:34px}
  .af-code .ln{display:inline-block;width:56px;color:#6E665B}
  .af-code .c{color:#9A9183}.af-code .k{color:#FF9A5C}.af-code .ok{color:#7CCBB9}
  .af-panel.light .af-code .ln{color:#B4AC9E}.af-panel.light .af-code .k{color:var(--af-sunset)}.af-panel.light .af-code .ok{color:var(--af-teal)}
  .af-code .cur{display:inline-block;width:.6em;background:var(--af-date);color:var(--af-date)}
  .af-media{position:absolute;left:0;right:0;top:90px;bottom:40px;width:100%;height:calc(100% - 130px);object-fit:cover;background:#000}
  .af-callout{position:absolute;display:flex;align-items:center;gap:0;z-index:6}
  .af-callout .ln{width:64px;height:1px;background:var(--af-ink)}
  .af-callout .dt{width:12px;height:12px;border-radius:50%;background:var(--af-date);box-shadow:0 0 8px rgba(255,123,41,.8)}
  .af-callout span{padding:10px 18px;background:var(--af-white);color:var(--af-ink);font-size:26px;font-weight:700;white-space:nowrap;box-shadow:0 6px 16px rgba(30,20,10,.28);border-left:4px solid var(--af-sunset)}
  .af-kind{position:absolute;padding:5px 14px;border:1px solid var(--af-ink);font-family:var(--af-font-mono);font-size:17px;letter-spacing:.24em;white-space:nowrap}
  /* quote（屏幕层） */
  .af-q{position:absolute;top:168px;width:fit-content;min-width:420px;max-width:720px;padding:40px 48px 40px;box-sizing:border-box;background:rgba(253,250,243,.95);color:var(--af-ink);
    box-shadow:0 2px 2px rgba(40,25,10,.1),0 24px 60px rgba(40,25,10,.28)}
  .af-q .k{display:flex;align-items:center;gap:12px;font-family:var(--af-font-mono);font-size:18px;letter-spacing:.24em}
  .af-q .k i{display:block;width:80px;height:1px;background:var(--af-sunset)}
  .af-q .t{font-family:var(--af-font-serif-cn);font-size:66px;font-weight:700;line-height:1.36;margin-top:24px}
  .af-q .by{margin-top:22px;font-family:var(--af-font-mono);font-size:18px;letter-spacing:.14em;color:var(--af-mute)}
  /* outro */
  .af-act{position:absolute;left:60px;width:570px;height:148px;background:var(--af-white);padding:20px 26px 0 118px;box-sizing:border-box;
    box-shadow:0 1px 1px rgba(60,40,20,.08),0 10px 22px rgba(60,40,20,.12)}
  .af-act .no{position:absolute;left:24px;top:22px;font-family:var(--af-font-serif);font-style:italic;font-size:62px;line-height:1;color:var(--af-sunset)}
  .af-act .tg{display:inline-block;padding:2px 10px;border:1px solid var(--af-ink);font-family:var(--af-font-mono);font-size:15px;letter-spacing:.2em}
  .af-act .t{font-size:38px;font-weight:700;line-height:1.2;margin-top:8px;white-space:nowrap}
  .af-act .d{font-family:var(--af-font-mono);font-size:18px;color:var(--af-mute);margin-top:4px;white-space:nowrap}
  .af-cta .ph{padding:34px 38px}
  .af-cta .k{font-family:var(--af-font-mono);font-size:18px;letter-spacing:.28em}
  .af-cta .t{font-size:72px;font-weight:700;margin-top:16px;line-height:1.1;white-space:nowrap;text-shadow:0 4px 24px rgba(80,20,0,.25)}
  .af-cta .btns{position:absolute;left:38px;right:38px;bottom:36px;display:flex;gap:18px}
  .af-cta .btns span{flex:1;text-align:center;padding:14px 0;border:2px solid var(--af-cream);border-radius:999px;color:var(--af-cream);font-size:30px;font-weight:700}
  /* timeline */
  .af-tl-film{position:absolute;left:60px;top:528px;height:44px;transform-origin:left center}
  .af-tl-node{position:absolute;width:240px;height:190px;padding:18px 20px;box-sizing:border-box;background:var(--af-white);
    box-shadow:0 1px 1px rgba(60,40,20,.08),0 10px 22px rgba(60,40,20,.13)}
  .af-tl-node .tm{font-family:var(--af-font-serif);font-style:italic;font-size:46px;line-height:1;color:var(--af-sunset);white-space:nowrap}
  .af-tl-node .t{font-size:32px;font-weight:700;margin-top:14px;white-space:nowrap}
  .af-tl-node .d{font-size:19px;margin-top:6px;line-height:1.35;color:var(--af-mute)}
  .af-tl-node.now{background:radial-gradient(120% 90% at 92% 8%,rgba(255,150,70,.42),transparent 55%),linear-gradient(165deg,#378474 0%,#2B6E63 48%,#1D4740 100%);color:var(--af-cream)}
  .af-tl-node.now .tm{color:var(--af-date);text-shadow:0 0 6px rgba(255,123,41,.85)}
  .af-tl-node.now .d{color:rgba(253,250,243,.85)}
  .af-tl-stem{position:absolute;width:1px;background:var(--af-ink)}
  .af-tl-dot{position:absolute;width:16px;height:16px;border-radius:50%;background:var(--af-cream);z-index:6;box-shadow:0 0 0 3px #131110}
  .af-tl-dot.now{background:var(--af-date);box-shadow:0 0 0 3px #131110,0 0 12px rgba(255,123,41,.9)}
  /* diagram */
  .af-dg-node{position:absolute;width:260px;height:124px;background:var(--af-white);z-index:3;overflow:hidden;
    box-shadow:0 1px 1px rgba(60,40,20,.08),0 10px 22px rgba(60,40,20,.14)}
  .af-dg-node .bd{height:10px}
  .af-dg-node .l{padding:14px 20px 0;font-size:34px;font-weight:700;white-space:nowrap}
  .af-dg-node .s{padding:4px 20px 0;font-family:var(--af-font-mono);font-size:16px;color:var(--af-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .af-dg-node.hot{background:linear-gradient(165deg,#378474 0%,#2B6E63 50%,#1D4740 100%);color:var(--af-cream)}
  .af-dg-node.hot .s{color:rgba(253,250,243,.85)}
  .af-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .af-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .af-dg-tag{padding:3px 12px;background:var(--af-paper);border:1px solid var(--af-ink);font-family:var(--af-font-mono);font-size:16px;letter-spacing:.08em;white-space:nowrap}
  /* showcase · product */
  .af-prod{position:absolute;left:0;right:0;top:52px;bottom:0}
  .af-prod .pic{position:absolute;left:34px;top:34px;bottom:40px;width:480px}
  .af-prod .pic .af-pola{position:relative;width:100%;height:100%}
  .af-prod .pic .ph{height:calc(100% - 74px);display:flex;align-items:center;justify-content:center}
  .af-prod .pic img{width:100%;height:100%;object-fit:cover}
  .af-prod .pic svg{width:76%;height:auto;color:var(--af-cream)}
  .af-prod .info{position:absolute;left:570px;right:44px;top:40px}
  .af-prod .nm{font-size:56px;font-weight:700;line-height:1.08;white-space:nowrap}
  .af-prod .tg{display:inline-block;margin-top:12px;padding:3px 12px;border:1px solid var(--af-ink);font-size:22px;white-space:nowrap}
  .af-prod .specs{margin-top:22px;border-top:1px solid var(--af-ink)}
  .af-prod .row{display:flex;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px dashed rgba(26,26,26,.3);white-space:nowrap}
  .af-prod .row .k{font-family:var(--af-font-mono);font-size:18px;letter-spacing:.1em;color:var(--af-mute)}
  .af-prod .row .v{font-size:26px;font-weight:700}
  `;
  function injectCSS() {
    if (document.getElementById('af-components-css')) return;
    const st = document.createElement('style'); st.id = 'af-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  /** 贴纸轻放：微放大淡入 → 落定 */
  const popIn = (A, el, at, r = -6) => A.add(el, at, 0.42, { s: 1.35, o: 0, r: r - 8 }, { s: 1, o: 1, r }, 'back');
  const fadeUp = (A, el, at, dy = 26, d = 0.6) => A.add(el, at, d, { y: dy, o: 0 }, { y: 0, o: 1 }, 'soft');

  // ============================== 1. cover 杂志封面 + 即显相片显影 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'af-zone');
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const title = h('div', 'af-cover-title');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const sub = h('div', 'af-cover-sub', null, mark(data.subtitle));
    const dim = h('div', 'af-cap', 'left:64px;top:700px;font-size:22px;color:var(--af-ink);', `— ${esc(data.dim || '')}`);
    const rule = h('div', 'af-rule', 'left:60px;top:770px;width:640px;');
    const P = polaroid(470, 470, 'sunset', 'left:810px;top:150px;', `<span>${esc(data.chapterLabel || 'CHAPTER')} ${esc(data.chapter || '01')}</span><span></span>`);
    P.ph.insertBefore(h('div', 'af-cover-chl', null, `${esc(data.chapterLabel || 'CHAPTER')} ·`), P.dev);
    P.ph.insertBefore(h('div', 'af-cover-ch', null, esc(data.chapter || '01')), P.dev);
    P.ph.insertBefore(dateStamp(`'${DATE}`, 24, 'right:22px;top:20px;'), P.dev);
    const tp = tape('left:975px;top:128px;transform:rotate(-4deg);');
    const st = dotSticker(data.stamp || '', data.stampSmall || '', 150, 'teal', 'left:1170px;top:640px;');
    el.append(kick, title, sub, dim, rule, P.el, tp, st);
    A.add(kick, 0.1, 0.5, { x: -24, o: 0 }, { x: 0, o: 1 }, 'soft');
    chars.forEach((c, i) => A.add(c, 0.3 + i * 0.07, 0.6, { y: 40, o: 0 }, { y: 0, o: 1 }, 'soft'));
    const tB = 0.5 + chars.length * 0.07;
    A.add(P.el, 0.35, 0.8, { y: -60, r: 9, o: 0 }, { y: 0, r: 3, o: 1 }, 'soft');
    develop(A, P.dev, 0.9, 1.6);
    A.add(tp, 1.1, 0.25, { o: 0, s: 1.2 }, { o: 1, s: 1, r: -4 });
    fadeUp(A, sub, tB + 0.1);
    A.add(dim, tB + 0.4, 0.5, { x: -20, o: 0 }, { x: 0, o: 1 }, 'soft');
    A.add(rule, tB + 0.3, 0.7, { sx: 0 }, { sx: 1 }, 'inOut');
    popIn(A, st, Math.min(D - 1.4, tB + 1.0), -10);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 600, 420, 1.18, 1, -2, -0.6), CAM(1.8, 700, 500, 1.0, 0.5, -0.8, 0), CAM(D, 712, 505, 1.03, 0.3, 0.8, 0.2)] };
  }

  // ============================== 2. stat 拍立得大数字 + 曝光计数格 ==============================
  function decOf(v) { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; }
  function fmtNum(v, dec) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function fitNums(nums, finals, avail) {
    nums.forEach((nEl, i) => {
      const b = nEl.querySelector('b'), keep = b.textContent; b.textContent = finals[i];
      const w = nEl.scrollWidth; if (w > avail) nEl.style.fontSize = `${Math.floor(parseFloat(nEl.style.fontSize) * avail / w)}px`;
      b.textContent = keep;
    });
  }
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'af-zone');
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const head = h('div', 'af-head', 'left:56px;top:150px;font-size:84px;', mark(data.title));
    const gap = 60, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 240 : n === 2 ? 176 : 128;
    const CELLS = 20;
    const P = items.map((it, i) => {
      const hot = i === n - 1;
      const p = polaroid(w, 330, hot ? 'teal' : 'faded', `left:${60 + i * (w + gap)}px;top:300px;`,
        `<b>${esc(it.label || '')}</b><span>${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</span>`);
      p.el.classList.add('af-stat');
      const on = Math.max(1, Math.round(clamp01(it.bar != null ? it.bar : 1) * CELLS));
      p.ph.insertBefore(h('div', 'lb', null, `FRAME ${String(i + 1).padStart(2, '0')} · ${hot ? 'NOW' : 'BEFORE'}`), p.dev);
      p.ph.insertBefore(h('div', 'num', `font-size:${fs}px;`, `${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span>`), p.dev);
      p.ph.insertBefore(h('div', 'cells', null, Array.from({ length: CELLS }, (_, k) => `<i data-k="${k}" data-on="${k < on ? 1 : 0}"></i>`).join('')), p.dev);
      return p;
    });
    const nums = P.map((p) => p.ph.querySelector('.num'));
    const cells = P.map((p) => Array.from(p.ph.querySelectorAll('.cells i')));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const st = data.delta ? dotSticker(data.delta, data.deltaSmall || '', 170, '', 'left:1170px;top:735px;') : null;
    const note = data.note ? h('div', 'af-cap', 'left:62px;top:770px;font-size:21px;letter-spacing:.08em;color:var(--af-ink);', `※ ${esc(data.note)}`) : null;
    const ds = dateStamp(`'${DATE}`, 22, 'left:1150px;top:180px;');
    el.append(kick, head, ...P.map((p) => p.el), ds);
    if (note) el.appendChild(note);
    if (st) el.appendChild(st);
    A.add(kick, 0.1, 0.4, { o: 0 }, { o: 1 });
    fadeUp(A, head, 0.2);
    A.add(ds, 0.6, 0.4, { o: 0 }, { o: 1 });
    const tIn = P.map((_, i) => 0.5 + i * 0.55);
    P.forEach((p, i) => {
      A.add(p.el, tIn[i], 0.7, { y: 50, o: 0, r: [-5, 4, -3][i] }, { y: 0, o: 1, r: [-1.5, 1.2, -1][i] }, 'soft');
      develop(A, p.dev, tIn[i] + 0.3, 1.1);
    });
    if (note) A.add(note, D - 2.6, 0.5, { x: -16, o: 0 }, { x: 0, o: 1 }, 'soft');
    if (st) popIn(A, st, Math.min(D - 1.3, tIn[n - 1] + 2.0), -9);
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 36 - 60); fitted = true; }
      items.forEach((it, i) => {
        const p = EASE.out(clamp01((t - tIn[i] - 0.5) / 1.3));
        nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * p, decs[i]);
        const lit = Math.floor(p * CELLS + 0.001);
        cells[i].forEach((c, k) => c.classList.toggle('on', c.dataset.on === '1' && k < lit));
      });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.1, 1, -2, -0.4), CAM(1.3, 700, 505, 1.0, 0.6, -0.8, 0), CAM(D, 708, 505, 1.03, 0.3, 0.8, 0.2)] };
  }

  // ============================== 3. steps 接触印样：胶片条逐格曝光 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'af-zone');
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const head = h('div', 'af-head', 'left:56px;top:150px;font-size:84px;', mark(data.title));
    const tag = h('div', 'af-kind', 'left:1150px;top:182px;', esc(data.dim || `${n} STEPS`));
    const strip = h('div', 'af-strip');
    const pfT = h('div', 'pf af-perf', 'top:0;'), pfB = h('div', 'pf af-perf', 'bottom:0;');
    strip.append(pfT, pfB);
    const G = 14, fw = (1280 - G * (n + 1)) / n;
    const COLORS = ['linear-gradient(165deg,#378474,#2B6E63 50%,#1D4740)', 'linear-gradient(172deg,#F1A458,#E06D3B 50%,#9A3D27)',
      'linear-gradient(170deg,#5A4A3C,#3B3029 60%,#241D19)', 'linear-gradient(170deg,#24564E,#1A3F39 60%,#122B27)', 'linear-gradient(170deg,#C98A4B,#8E5A33 60%,#5A3820)'];
    const frames = items.map((it, i) => {
      const x = G + i * (fw + G);
      const f = h('div', 'af-frame', `left:${x}px;width:${fw}px;`,
        `<div class="bgc" style="background:radial-gradient(90% 70% at 85% 10%,rgba(255,170,90,.35),transparent 60%),${COLORS[i % 5]}"></div><div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div><div class="unexp"></div><div class="flash"></div>`);
      strip.appendChild(f);
      const e1 = h('div', 'edge', `left:${x + 8}px;top:381px;font-size:12px;`, `▸ ${i + 1}&nbsp;&nbsp;&nbsp;${i + 1}A`);
      strip.appendChild(e1);
      return f;
    });
    strip.appendChild(h('div', 'edge', 'left:20px;top:42px;font-size:12px;opacity:.75;', 'PORTRA 400 · 01A'));
    const bar = h('div', 'af-capbar', null,
      `<div class="f">▣ ${esc(data.folder || 'PROJECT /')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`);
    const fx = 60 + G + (n - 1) * (fw + G);
    const loop = prop('loop', [fw + 60, 400, 31], `left:${fx - 30}px;top:310px;`);
    const label = data.label ? h('div', 'af-mk', `left:${Math.min(1060, fx + 10)}px;top:738px;font-size:36px;`, `${esc(data.label)}${data.labelSmall ? `<small>${esc(data.labelSmall)}</small>` : ''}`) : null;
    el.append(kick, head, tag, strip, bar, loop);
    if (label) el.appendChild(label);
    A.add(kick, 0.1, 0.4, { o: 0 }, { o: 1 });
    fadeUp(A, head, 0.2);
    A.add(tag, 0.6, 0.4, { o: 0 }, { o: 1 });
    A.add(strip, 0.3, 0.9, { x: 420, o: 0 }, { x: 0, o: 1 }, 'soft');
    A.add(bar, 0.7, 0.6, { y: 24, o: 0 }, { y: 0, o: 1 }, 'soft');
    const t0 = 1.2, t1 = Math.min(Math.max(t0 + 0.5, D - 2.4), t0 + 0.7 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const unexp = frames.map((f) => f.querySelector('.unexp')), flash = frames.map((f) => f.querySelector('.flash'));
    const tLoop = t1 + 0.45;
    const lp = loop.querySelector('path');
    if (label) A.add(label, tLoop + 0.5, 0.45, { o: 0, sx: 0.3 }, { o: 1, sx: 1, r: -4 }, 'soft');
    A.fn((t) => {
      frames.forEach((f, i) => {
        const at = t0 + i * stp, q = (t - at);
        flash[i].style.opacity = (q < 0 ? 0 : Math.max(0, 1 - q / 0.28) * 0.95).toFixed(3);
        unexp[i].style.opacity = (q < 0 ? 1 : 1 - EASE.inOut(clamp01((q - 0.05) / 0.7))).toFixed(3);
      });
      drawPath(lp, t, tLoop, 0.6);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 760, 560, 1.12, 1, -2, -0.4), CAM(1.3, 700, 510, 1.0, 0.6, -0.8, 0), CAM(D, 706, 506, 1.03, 0.3, 0.8, 0.2)] };
  }

  // ============================== 4. checklist 冲洗店工作单 + 手写勾 + 胶片暗盒 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const RH = 100, R0 = 256;
    const H = R0 + n * RH + (data.note ? 140 : 30);
    const el = h('div', 'af-zone');
    const sheet = h('div', 'af-sheet', `height:${H}px;`,
      `<div class="hd"><span>${esc(data.kicker || '')}</span><span class="af-date">'${DATE}</span></div><div class="ttl">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div><div class="hr"></div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'af-row', `top:${R0 + i * RH}px;`,
        `<div class="n">No.${String(i + 1).padStart(2, '0')}</div><div class="hl"></div><div class="box">${PROPS.check(58)}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div>`);
      sheet.appendChild(r); return r;
    });
    let memo = null;
    if (data.note) { memo = h('div', 'af-memo', `top:${R0 + n * RH + 26}px;`, `<small>${esc(data.noteLead || '')}</small><em>${mark(data.note)}</em>`); sheet.appendChild(memo); }
    const can = prop('canister', [data.canister || 'PORTRA 400'], 'left:1080px;top:250px;');
    const cnt = dateStamp(`${n}/${n} OK`, 30, 'left:1100px;top:600px;');
    const tp = tape('left:470px;top:82px;transform:rotate(-3deg);');
    el.append(sheet, tp, can, cnt);
    A.add(sheet, 0, 0.8, { y: 60, o: 0, r: 1.5 }, { y: 0, o: 1, r: -0.6 }, 'soft');
    A.add(tp, 0.55, 0.25, { o: 0, s: 1.2 }, { o: 1, s: 1, r: -3 });
    A.add(can, 0.6, 0.8, { x: 140, o: 0, r: 20 }, { x: 0, o: 1, r: -7 }, 'soft');
    const t0 = 1.2, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.6 : 1.4)), t0 + 0.7 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    rows.forEach((r, i) => {
      A.add(r, t0 + i * stp - 0.35, 0.35, { o: 0.3, x: -10 }, { o: 1, x: 0 }, 'soft');
      A.add(r.querySelector('.hl'), t0 + i * stp + 0.2, 0.4, { sx: 0 }, { sx: 1 }, 'out');
    });
    let measured = false;
    const cks = rows.map((r) => r.querySelector('.af-draw'));
    A.fn((t) => {
      if (!measured) { rows.forEach((r) => { const k = r.querySelector('.k'); const w = k.scrollWidth; if (w > 0) { r.querySelector('.hl').style.width = `${w + 14}px`; measured = true; } }); }
      cks.forEach((c, i) => drawPath(c, t, t0 + i * stp, 0.3));
    });
    if (memo) fadeUp(A, memo, D - 2.1, 20, 0.5);
    A.add(cnt, Math.max(t1 + 0.4, D - 1.7), 0.4, { o: 0 }, { o: 1 });
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.05, 1, -1.5, 0), CAM(1.0, 700, 500, 1.01, 0.6, -0.6, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.01, 0.3, -0.3, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.3, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.4, 0)] };
  }

  // ============================== 5. compare 褪色过曝相片 vs 鲜活青绿相片 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'af-zone');
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const head = h('div', 'af-head', 'left:56px;top:150px;font-size:84px;', mark(data.title));
    const L = polaroid(540, 330, 'faded', 'left:60px;top:282px;', `<b style="color:var(--af-mute)">${esc(w.label || '✕ WRONG')}</b><span style="color:var(--af-mute)">01</span>`);
    const R = polaroid(540, 330, 'teal af-on-dark', 'left:800px;top:282px;', `<b>${esc(r.label || '✓ RIGHT')}</b><span>02</span>`);
    [L, R].forEach((p) => p.el.classList.add('af-cmp'));
    L.ph.insertBefore(h('div', 't', null, esc(w.title).replace(/\n/g, '<br/>')), L.dev);
    L.ph.insertBefore(h('div', 'd', null, esc(w.desc || '')), L.dev);
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('class', 'strike'); sv.style.top = '74px'; sv.setAttribute('width', '470'); sv.setAttribute('height', '150');
    sv.innerHTML = `<g>${PROPS.strike(380)}</g><g transform="translate(0 67)">${PROPS.strike(340)}</g>`;
    L.ph.insertBefore(sv, L.dev);
    R.ph.insertBefore(h('div', 't', null, esc(r.title).replace(/\n/g, '<br/>')), R.dev);
    R.ph.insertBefore(h('div', 'd', 'color:rgba(253,250,243,.9)', esc(r.desc || '')), R.dev);
    const badge = h('div', 'badge', null, PROPS.check(46, 'var(--af-cream)', 7));
    R.el.appendChild(badge);
    const vs = h('div', 'af-vs', null, 'vs.<small>COMPARE</small>');
    const xs = h('div', 'af-reject', 'left:300px;top:560px;', esc(w.stamp || '✕'));
    const verdict = h('div', 'af-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span>`);
    const ds = dateStamp(`'${DATE}`, 22, 'left:1150px;top:180px;');
    el.append(kick, head, L.el, R.el, vs, xs, verdict, ds);
    A.add(kick, 0.1, 0.4, { o: 0 }, { o: 1 });
    fadeUp(A, head, 0.2);
    A.add(ds, 0.6, 0.4, { o: 0 }, { o: 1 });
    A.add(L.el, 0.45, 0.7, { y: 50, o: 0, r: -5 }, { y: 0, o: 1, r: -1.6 }, 'soft');
    develop(A, L.dev, 0.7, 0.9);
    const tStrike = Math.min(D * 0.22, 1.4);
    const strikes = Array.from(sv.querySelectorAll('.af-draw'));
    A.add(xs, tStrike + 0.7, 0.3, { s: 1.6, o: 0, r: -14 }, { s: 1, o: 1, r: -8 }, 'out');
    A.add(vs, tStrike + 0.3, 0.5, { y: 16, o: 0 }, { y: 0, o: 1 }, 'soft');
    const tR = Math.min(D * 0.4, tStrike + 1.1);
    A.add(R.el, tR, 0.7, { y: 50, o: 0, r: 5 }, { y: 0, o: 1, r: 1.4 }, 'soft');
    develop(A, R.dev, tR + 0.1, 0.8);
    A.add(badge, tR + 0.55, 0.4, { s: 0.4, o: 0 }, { s: 1, o: 1 }, 'back');
    const bck = badge.querySelector('.af-draw');
    const tV = Math.min(D - 1.6, tR + 1.4);
    fadeUp(A, verdict, tV, 24, 0.6);
    A.fn((t) => {
      strikes.forEach((p, i) => drawPath(p, t, tStrike + i * 0.3, 0.35));
      drawPath(bck, t, tR + 0.8, 0.3);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.1, 0.8, -1.8, 0), CAM(1.1, 700, 505, 1.0, 0.4, -0.7, 0), CAM(D, 704, 508, 1.02, 0.3, 0.8, 0)] };
  }

  // ============================== 6. showcase 胶片负片暗盒面板 / 白纸文档 / 产品拍立得 ==============================
  const DEVICE_SVG = `<svg viewBox="0 0 400 300"><rect x="40" y="86" width="320" height="174" rx="14" fill="none" stroke="currentColor" stroke-width="6"/><rect x="80" y="60" width="90" height="28" rx="6" fill="currentColor"/><circle cx="200" cy="173" r="62" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="200" cy="173" r="34" fill="currentColor" opacity=".35"/><circle cx="312" cy="114" r="9" fill="#FF7B29"/><text x="200" y="294" text-anchor="middle" font-family="Consolas, monospace" font-size="18" fill="currentColor" letter-spacing="5">PRODUCT IMAGE</text></svg>`;
  function productPanel(data) {
    const el = h('div', 'af-prod');
    const pic = h('div', 'pic');
    const p = polaroid(480, 300, 'umber', '', `<span>${esc(data.file || 'PRODUCT')}</span><span class="af-date" style="position:relative;font-size:16px;">'${DATE}</span>`);
    p.el.style.position = 'relative'; p.el.style.boxShadow = 'none';
    if (data.src) { const im = h('img'); im.src = data.src; p.ph.insertBefore(im, p.dev); } else p.ph.insertBefore(h('div', null, 'width:100%;display:flex;justify-content:center', DEVICE_SVG), p.dev);
    pic.appendChild(p.el);
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? dotSticker(data.price, data.priceSmall || '', 150, '', 'right:40px;bottom:30px;') : null;
    if (price) el.appendChild(price);
    return { el, pic, dev: p.dev, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'af-zone');
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const head = h('div', 'af-head', 'left:56px;top:148px;font-size:76px;', mark(data.title));
    const dark = kind === 'code' || kind === 'terminal' || kind === 'image' || kind === 'video';
    const panel = h('div', `af-panel ${dark ? 'dark' : 'light'}`);
    if (dark) panel.append(h('div', 'pf af-perf', 'top:0;'), h('div', 'pf af-perf', 'bottom:0;'));
    panel.appendChild(h('div', 'bar', null, `<span>▸ ${esc(data.file || kind.toUpperCase())}</span><span class="ep">PORTRA 400 · 08A</span>`));
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'af-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'af-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', 'af-code'); panel.appendChild(codeEl); }
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 262 + 640 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      return h('div', 'af-callout', `left:${px.toFixed(0)}px;top:${(py - 24).toFixed(0)}px;`, `<div class="dt"></div><div class="ln"></div><span>${esc(nt.text)}</span>`);
    });
    const tag = h('div', 'af-kind', 'left:1172px;top:204px;', esc(kind.toUpperCase()));
    el.append(kick, head, panel, ...notes, tag);
    A.add(kick, 0.1, 0.4, { o: 0 }, { o: 1 });
    fadeUp(A, head, 0.2);
    A.add(panel, 0.3, 0.8, { x: 300, o: 0 }, { x: 0, o: 1 }, 'soft');
    A.add(tag, 0.8, 0.4, { o: 0 }, { o: 1 });
    const tType0 = 1.0, tType1 = Math.max(tType0 + 0.6, D * 0.42);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.9 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.5, { x: 30, o: 0 }, { x: 0, o: 1, r: [-1.5, 1.2, -1][i] }, 'soft'));
    if (prod) {
      develop(A, prod.dev, 0.8, 1.2);
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.28, 0.45, { x: 40, o: 0 }, { x: 0, o: 1 }, 'soft'));
      if (prod.price) popIn(A, prod.price, Math.min(D - 1.2, 1.3 + prod.rows.length * 0.28 + 0.3), -8);
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
      cams: [CAM(0, 700, 570, 0.96, 1, -1.2, 0), CAM(1.3, 700, 525, 1.0, 0.6, -0.8, 0), CAM(D, 712, 535, 1.04, 0.5, 0.8, 0)] };
  }

  // ============================== 7. quote 全屏人像 + 侧边纸卡金句 + 机内日期戳 ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'af-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const side = right ? 'right:70px;' : 'left:70px;';
    const card = h('div', 'af-q', side, `<div class="k"><i></i>${esc(data.kicker || 'QUOTE')}</div><div class="t">${mark(data.text)}</div><div class="by">${esc(data.by || '')}</div>`);
    const st = dotSticker(data.stamp || '', data.stampSmall || '', 160, '', `${right ? 'right:140px;' : 'left:470px;'}top:${data.stampTop || 680}px;`);
    const tp = tape(`${right ? 'right:330px;' : 'left:300px;'}top:150px;transform:rotate(${right ? 5 : -5}deg);`);
    const ds = dateStamp(`'${DATE}`, 40, `${right ? 'left:90px;' : 'right:96px;'}top:820px;`);
    el.append(card, tp, st, ds);
    A.add(card, 0.4, 0.9, { y: 40, o: 0, r: right ? 2 : -2 }, { y: 0, o: 1, r: right ? 0.6 : -0.6 }, 'soft');
    A.add(tp, 1.0, 0.25, { s: 1.2, o: 0 }, { s: 1, o: 1, r: right ? 5 : -5 });
    A.add(ds, 0.6, 0.6, { o: 0 }, { o: 1 });
    popIn(A, st, Math.min(D - 1.0, D * 0.4), right ? 8 : -8);
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 8. outro 索引卡 + 日落拍立得 CTA + 按钮连按 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'af-zone');
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const head = h('div', 'af-head', 'left:56px;top:148px;font-size:84px;', mark(data.title));
    const acts = (data.actions || []).slice(0, 3).map((a, i) => h('div', 'af-act', `top:${280 + i * 172}px;`,
      `<div class="no">${String(i + 1).padStart(2, '0')}</div><div class="tg">${esc(a.tag || 'ACTION')}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div>`));
    const c = data.cta || {};
    const P = polaroid(640, 400, 'sunset af-on-dark', 'left:690px;top:262px;', `<span>${esc(c.repo || '')}</span><span class="af-date" style="position:relative;font-size:16px;">'${DATE}</span>`);
    P.el.classList.add('af-cta');
    P.ph.insertBefore(h('div', 'k', null, esc(c.kicker || 'OPEN SOURCE')), P.dev);
    P.ph.insertBefore(h('div', 't', null, esc(c.title || '')), P.dev);
    const btnWrap = h('div', 'btns', null, (c.buttons || []).slice(0, 3).map((b) => `<span>${esc(b)}</span>`).join(''));
    P.ph.insertBefore(btnWrap, P.dev);
    const go = dotSticker(c.stamp || 'GO', c.stampSmall || '', 150, 'teal', 'left:1180px;top:690px;');
    const tp = tape('left:940px;top:240px;transform:rotate(3deg);');
    el.append(kick, head, ...acts, P.el, tp, go);
    A.add(kick, 0.1, 0.4, { o: 0 }, { o: 1 });
    fadeUp(A, head, 0.2);
    const t0 = 0.6, stp = Math.min(0.5, (D * 0.3) / Math.max(1, acts.length));
    acts.forEach((a, i) => A.add(a, t0 + i * stp, 0.6, { x: -60, o: 0 }, { x: 0, o: 1, r: [-0.8, 0.6, -0.5][i] }, 'soft'));
    const tC = t0 + acts.length * stp;
    A.add(P.el, tC, 0.8, { y: 60, o: 0, r: 6 }, { y: 0, o: 1, r: 2 }, 'soft');
    develop(A, P.dev, tC + 0.3, 1.1);
    A.add(tp, tC + 0.6, 0.25, { s: 1.2, o: 0 }, { s: 1, o: 1, r: 3 });
    const btns = Array.from(btnWrap.querySelectorAll('span'));
    const tP = tC + 1.5;
    A.fn((t) => btns.forEach((b, i) => {
      const p = clamp01((t - (tP + i * 0.35)) / 0.3), on = t >= tP + i * 0.35 + 0.1;
      const k = p <= 0 || p >= 1 ? 0 : (p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6);
      b.style.transform = `scale(${(1 - 0.06 * k).toFixed(3)})`;
      b.style.background = on ? 'var(--af-cream)' : 'transparent';
      b.style.color = on ? 'var(--af-sunset)' : 'var(--af-cream)';
    }));
    popIn(A, go, Math.min(D - 0.9, tP + btns.length * 0.35 + 0.2), -10);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.06, 0.8, -1.8, 0), CAM(1.3, 700, 505, 1.0, 0.4, -0.6, 0), CAM(D, 700, 500, 0.99, 0, 0.6, 0)] };
  }

  // ============================== 9. timeline 胶片边带时间轴 ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'af-zone', `width:${W}px;`);
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const head = h('div', 'af-head', 'left:56px;top:150px;font-size:84px;', mark(data.title));
    const film = h('div', 'af-tl-film af-perf', `width:${W - 120}px;`);
    el.append(kick, head, film);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 3.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 300 : 630, at = t0 + i * stp, isNow = i === now;
      const card = h('div', `af-tl-node${isNow ? ' now af-on-dark' : ''}`, `left:${x}px;top:${top}px;`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', 'af-tl-stem', `left:${x + 40}px;top:${up ? 490 : 572}px;height:${up ? 38 : 58}px;`);
      const dot = h('div', `af-tl-dot${isNow ? ' now' : ''}`, `left:${x + 32}px;top:542px;`);
      const edge = h('div', 'af-cap', `left:${x + 60}px;top:${up ? 576 : 504}px;font-size:13px;color:var(--af-date);font-weight:700;opacity:.9`, `▸ ${i + 1}A`);
      el.append(stem, card, dot, edge);
      A.add(dot, at - 0.1, 0.35, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
      A.add(stem, at, 0.25, { o: 0 }, { o: 1 });
      A.add(edge, at, 0.3, { o: 0 }, { o: 1 });
      A.add(card, at + 0.05, 0.6, { y: up ? -36 : 36, o: 0, r: up ? -3 : 3 }, { y: 0, o: 1, r: [-1.2, 1, -0.8, 1.1][i % 4] }, 'soft');
      return { x, up, top, at };
    });
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = dotSticker(data.nowLabel, data.nowSmall || '', 150, '', `left:${Math.min(W - 230, p.x + (p.up ? 30 : 120))}px;top:${p.up ? 612 : p.top + 170}px;`);
      el.appendChild(ns);
      popIn(A, ns, Math.min(D - 0.9, p.at + 0.7), -8);
    }
    A.add(kick, 0.1, 0.4, { o: 0 }, { o: 1 });
    fadeUp(A, head, 0.2);
    A.add(film, 0.4, 0.8, { sx: 0 }, { sx: 1 }, 'inOut');
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1, -2, -0.3), CAM(0.9, 700, 508, 1.0, 0.6, -0.8, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 508, 1.0, 0.3, 0.8, 0), CAM(D, endX + 8, 505, 1.02, 0.2, 0.8, 0.2)] };
  }

  // ============================== 10. diagram 白卡节点 + 细墨连线 + 日期橙光点 ==============================
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
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
  let DG_SEQ = 0;
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 290, AW = 1280, AH = 610, NW = 260, NH = 124;
    const el = h('div', 'af-zone');
    const kick = kicker(data.kicker, 'left:60px;top:108px;');
    const head = h('div', 'af-head', 'left:56px;top:150px;font-size:84px;', mark(data.title));
    el.append(kick, head);
    const TABS = ['var(--af-teal)', 'var(--af-sunset)', 'var(--af-ink)', 'var(--af-date)'];
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = h('div', 'af-dg-node', `left:${x}px;top:${y}px;`, `<div class="bd" style="background:${TABS[i % 4]};"></div><div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      el.appendChild(e);
      A.add(e, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(e, appear[nd.id], 0.55, { y: 24, o: 0 }, { y: 0, o: 1, r: [-0.8, 0.6, -0.5, 0.8][i % 4] }, 'soft');
      return e;
    });
    const mid = `afdg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L11 6 L0 11" fill="none" stroke="#1A1A1A" stroke-width="2"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="#1A1A1A" stroke-width="2.2" fill="none" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mid})"/>`;
      inner += `<circle class="pl" data-j="${j}" data-k="0" r="7" fill="#FF7B29" opacity="0" style="filter:drop-shadow(0 0 5px rgba(255,123,41,.9))"/><circle class="pl" data-j="${j}" data-k="1" r="5" fill="#2B6E63" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'af-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'af-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'af-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.4, 0.35, { o: 0, y: 8 }, { o: 1, y: 0 }, 'soft');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = dotSticker(data.focusLabel, data.focusSmall || '', 116, '', `left:${Math.min(1200, p.x + 190)}px;top:${p.y - 80}px;`);
      el.appendChild(st);
      popIn(A, st, tF + 0.25, -8);
    }
    A.add(kick, 0.1, 0.4, { o: 0 }, { o: 1 });
    fadeUp(A, head, 0.2);
    A.fn((t) => {
      lnEls.forEach((p) => { const j = +p.dataset.j, g = geo[j]; p.setAttribute('stroke-dashoffset', (g.len * (1 - EASE.inOut(clamp01((t - tDraw[j]) / 0.5)))).toFixed(1)); });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.6;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.45 + (+r.dataset.k) * 0.5) % 1);
        r.setAttribute('opacity', '1'); r.setAttribute('cx', q.x.toFixed(1)); r.setAttribute('cy', q.y.toFixed(1));
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 560, 1.1, 1, -2, -0.3), CAM(1.3, 700, 518, 1.0, 0.6, -0.8, 0), CAM(D, 706, 515, 1.03, 0.3, 0.8, 0.2)] };
  }

  global.AnalogFilm = {
    version: '1.0.0',
    PROPS, Animator, EASE, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, stat: { create: stat }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, timeline: { create: timeline }, diagram: { create: diagram },
      showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro }
    }
  };
})(window);
