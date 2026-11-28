/**
 * Mushanhe Video Engine — 风格包 02 · 瑞士国际主义印刷拼贴（Swiss Print Collage）
 * ---------------------------------------------------------------------------
 * 10 大万能口播句型参数化组件（cover · steps · checklist · compare · showcase[code|terminal|doc|image|video|product] · quote · outro · stat · timeline · diagram），全部由 JSON 驱动、按时间确定性渲染（任意 seek 可还原）。
 *
 *   const comp = SwissPrint.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : {
 *     el      : HTMLElement  组件根节点（1400×1100 的局部坐标区；可选 w 加宽，如 timeline）
 *     layer   : 'world' | 'screen'   world=挂在 3D 网格纸上 / screen=屏幕层（全屏人像上的纸片）
 *     avatar  : 'card' | 'full'      本段人像形态
 *     cams    : [{ t, x, y, zoom, rx, ry, rz }]  局部坐标运镜关键帧（交给 core/camera-rig.js）
 *     update(localT)                 按本段局部时间渲染
 *   }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位整体换算为 (x-60, y, zoom×0.92)，
 * 使该区域在 1920×1080 画面中恰好落在右侧人像框左边、顶部标签之下、底部字幕之上。
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

  // ============================== 纯 SVG 实体道具 ==============================
  const PROPS = {
    ruler(len = 900) {
      const hgt = 64; let ticks = '', nums = '';
      for (let x = 12, i = 0; x < len - 8; x += 10, i++) {
        const th = i % 10 === 0 ? 28 : i % 5 === 0 ? 18 : 10;
        ticks += `<line x1="${x}" y1="0" x2="${x}" y2="${th}"/>`;
        if (i % 10 === 0) nums += `<text x="${x + 3}" y="${th + 15}">${i / 10}</text>`;
      }
      return `<svg width="${len}" height="${hgt}" viewBox="0 0 ${len} ${hgt}"><rect x="0.5" y="0.5" width="${len - 1}" height="${hgt - 1}" fill="#DDBF8C" stroke="#A8844C"/><rect x="0" y="${hgt - 12}" width="${len}" height="12" fill="#C9A570" opacity="0.55"/><g stroke="#2A2118" stroke-width="1.4">${ticks}</g><g fill="#2A2118" font-family="Consolas, monospace" font-size="12" font-weight="700">${nums}</g></svg>`;
    },
    pencil(len = 320) {
      const m = len / 2;
      return `<svg width="${len}" height="26" viewBox="0 0 ${len} 26"><polygon points="0,13 40,1 40,25" fill="#E8CC9C"/><polygon points="0,13 13,9.2 13,16.8" fill="#C21E1E"/><rect x="40" y="1" width="${m - 40}" height="24" fill="#D92323"/><rect x="40" y="9" width="${m - 40}" height="4" fill="#F06A5E" opacity="0.6"/><rect x="${m}" y="1" width="${m - 40}" height="24" fill="#2C4E9E"/><rect x="${m}" y="9" width="${m - 40}" height="4" fill="#6E8FD8" opacity="0.6"/><polygon points="${len},13 ${len - 40},1 ${len - 40},25" fill="#E8CC9C"/><polygon points="${len},13 ${len - 13},9.2 ${len - 13},16.8" fill="#24407F"/><line x1="${m}" y1="1" x2="${m}" y2="25" stroke="#141414" stroke-width="2"/></svg>`;
    },
    triangle(s = 220) {
      const a = s * 0.2; let ticks = '';
      for (let y = 14; y < s - 6; y += 12) ticks += `<line x1="1" y1="${y}" x2="${(y / 12) % 5 === 0 ? 14 : 8}" y2="${y}"/>`;
      return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><path fill-rule="evenodd" d="M1 1 L1 ${s - 1} L${s - 1} ${s - 1} Z M${a} ${a * 2.3} L${a} ${s - a} L${s - a * 2.3} ${s - a} Z" fill="rgba(150,190,198,0.30)" stroke="rgba(20,20,20,0.5)" stroke-width="1.5"/><g stroke="rgba(20,20,20,0.6)" stroke-width="1.2">${ticks}</g></svg>`;
    },
    pin() {
      return `<svg width="44" height="54" viewBox="0 0 44 54"><ellipse cx="28" cy="46" rx="10" ry="4" fill="rgba(0,0,0,0.25)"/><line x1="21" y1="26" x2="27" y2="45" stroke="#7A7F86" stroke-width="2.4"/><circle cx="20" cy="18" r="14" fill="#D92323"/><circle cx="20" cy="18" r="8.5" fill="#B31919"/><ellipse cx="15" cy="12.5" rx="4.5" ry="3.2" fill="#FFFFFF" opacity="0.55"/></svg>`;
    },
    clip() {
      return `<svg width="44" height="120" viewBox="0 0 44 120"><path d="M14 34 V96 a11 11 0 0 0 22 0 V22 a15 15 0 0 0 -30 0 V88" stroke="#7D848C" stroke-width="3.6" fill="none" stroke-linecap="round"/></svg>`;
    },
    stampTool() {
      return `<svg width="170" height="220" viewBox="0 0 170 220"><circle cx="85" cy="40" r="36" fill="#8B5A2B"/><ellipse cx="74" cy="28" rx="12" ry="8" fill="#B98250" opacity="0.7"/><rect x="66" y="70" width="38" height="84" fill="#A0703F"/><rect x="10" y="150" width="150" height="44" fill="#6E4520"/><rect x="14" y="194" width="142" height="18" fill="#D92323"/></svg>`;
    },
    reg() {
      return `<svg width="36" height="36" viewBox="0 0 36 36"><g stroke="#141414" stroke-width="1.5" fill="none"><circle cx="18" cy="18" r="10"/><line x1="18" y1="0" x2="18" y2="36"/><line x1="0" y1="18" x2="36" y2="18"/></g></svg>`;
    },
    check(size = 60, stroke = 8) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" style="overflow:visible"><path class="sp-ck" d="M8 30 L22 44 L52 8" stroke="var(--sp-red)" stroke-width="${stroke}" fill="none" stroke-linecap="square" stroke-dasharray="70" stroke-dashoffset="70"/></svg>`;
    }
  };

  function prop(name, arg, style) { return h('div', 'sp-prop', style, PROPS[name](arg)); }
  function tape(style) { return h('div', 'sp-tape', style); }
  function reg(style) { return h('div', 'sp-reg', style, PROPS.reg()); }
  function stamp(text, small, style) { return h('div', 'sp-stamp', style, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`); }
  function dim(label, style) { return h('div', 'sp-dim', style, `<div class="dl"></div><div class="dt">${esc(label)}</div>`); }
  /** v3.5 空字段不出框：可选字段没填 → 整块不渲染（display:none；Animator 只动 transform / opacity，不会再把它显示出来） */
  const blank = (s) => !String(s == null ? '' : s).trim();
  const hideIf = (el, cond) => { if (el && cond) el.style.display = 'none'; return el; };
  /** 把 "这句**关键词**话" 中 ** 包裹部分标红 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .sp-zone{position:absolute;width:1400px;height:1100px;font-family:var(--sp-font-cn);color:var(--sp-ink)}
  .sp-abs{position:absolute}
  .sp-sheet{position:absolute;background:var(--sp-sheet);box-shadow:var(--sp-shadow)}
  .sp-kicker{position:absolute;font-family:var(--sp-font-mono);font-size:22px;font-weight:800;letter-spacing:.14em;color:var(--sp-red);white-space:nowrap}
  .sp-head{position:absolute;font-weight:900;letter-spacing:-.02em;line-height:1.04;color:var(--sp-ink);white-space:nowrap}
  .sp-head em,.sp-quote-t em,.sp-text em{font-style:normal;color:var(--sp-red)}
  .sp-tape{position:absolute;width:150px;height:40px;background:rgba(236,226,196,.72);box-shadow:0 1px 2px rgba(20,20,20,.12);z-index:6;
    clip-path:polygon(0 8%,4% 0,8% 10%,12% 0,88% 0,92% 10%,96% 0,100% 8%,100% 92%,96% 100%,92% 90%,88% 100%,12% 100%,8% 90%,4% 100%,0 92%)}
  .sp-prop{position:absolute;z-index:5;filter:drop-shadow(0 6px 6px rgba(20,20,20,.22))}
  .sp-prop svg,.sp-reg svg{display:block}
  .sp-reg{position:absolute;width:36px;height:36px}
  .sp-stamp{position:absolute;border:6px double var(--sp-red);color:var(--sp-red);padding:8px 22px;font-weight:900;text-align:center;line-height:1.05;white-space:nowrap;mix-blend-mode:multiply;z-index:7;
    -webkit-mask-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9'/></filter><rect width='200' height='200' filter='url(%23g)'/></svg>");
    mask-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9'/></filter><rect width='200' height='200' filter='url(%23g)'/></svg>")}
  .sp-stamp small{display:block;font-family:var(--sp-font-mono);font-size:.36em;letter-spacing:.2em;margin-top:4px}
  .sp-stamp.on-dark{mix-blend-mode:normal;background:transparent}
  .sp-dim{position:absolute;height:30px}
  .sp-dim .dl{position:absolute;left:0;right:0;top:14px;height:2px;background:var(--sp-red);transform-origin:left center}
  .sp-dim .dl::before,.sp-dim .dl::after{content:'';position:absolute;top:-10px;width:2px;height:22px;background:var(--sp-red)}
  .sp-dim .dl::before{left:0}.sp-dim .dl::after{right:0}
  .sp-dim .dt{position:absolute;left:50%;top:-6px;transform:translateX(-50%);padding:0 14px;background:var(--sp-paper);font-size:26px;font-weight:900;color:var(--sp-red);white-space:nowrap}
  /* cover */
  .sp-cover-title{position:absolute;left:56px;top:160px;font-size:150px;font-weight:900;letter-spacing:-.03em;line-height:1.02;white-space:nowrap}
  .sp-cover-title span{display:inline-block}
  .sp-cover-block{position:absolute;left:60px;top:540px;width:300px;height:300px;background:var(--sp-red);color:var(--sp-sheet);box-shadow:var(--sp-shadow)}
  .sp-cover-block .l{position:absolute;left:26px;top:22px;font-family:var(--sp-font-mono);font-size:24px;font-weight:800;letter-spacing:.2em}
  .sp-cover-block .n{position:absolute;left:18px;bottom:6px;font-family:var(--sp-font-latin);font-size:190px;font-weight:900;letter-spacing:-.06em;line-height:1}
  .sp-cover-sub{position:absolute;left:410px;top:560px;font-size:46px;font-weight:900;line-height:1.25;white-space:nowrap}
  /* steps */
  .sp-folder{position:absolute;left:100px;top:320px;width:1200px;height:600px;overflow:hidden}
  .sp-f-tab{position:absolute;left:0;top:0;width:380px;height:54px;background:var(--sp-ink);color:var(--sp-sheet);font-family:var(--sp-font-mono);font-size:20px;font-weight:800;letter-spacing:.08em;padding:15px 22px;box-sizing:border-box;white-space:nowrap;overflow:hidden}
  .sp-f-back{position:absolute;left:0;top:50px;width:100%;height:550px;background:var(--sp-ink);box-shadow:var(--sp-shadow-lg)}
  .sp-f-sheet{position:absolute;top:100px;height:320px;background:var(--sp-sheet-2);box-shadow:0 4px 10px rgba(0,0,0,.35);padding:18px 20px;box-sizing:border-box}
  .sp-f-sheet .no{font-family:var(--sp-font-mono);font-size:20px;font-weight:900;color:var(--sp-red)}
  .sp-f-sheet .nm{font-size:44px;font-weight:900;margin-top:4px;line-height:1.08}
  .sp-f-sheet .fn{font-family:var(--sp-font-mono);font-size:16px;font-weight:700;color:var(--sp-grey);margin-top:8px;line-height:1.4}
  .sp-f-sheet::after{content:'';position:absolute;right:0;top:0;border-style:solid;border-width:0 26px 26px 0;border-color:transparent var(--sp-ink) #DCD5C4 transparent}
  .sp-f-front{position:absolute;left:0;top:290px;width:100%;height:310px;background:#E4DDCC;box-shadow:0 -6px 14px rgba(0,0,0,.25);border-top:4px solid var(--sp-ink)}
  .sp-f-front .big{position:absolute;left:36px;bottom:22px;font-family:var(--sp-font-latin);font-size:180px;font-weight:900;letter-spacing:-.05em;line-height:.8;white-space:nowrap}
  .sp-f-front .meta{position:absolute;right:34px;bottom:34px;text-align:right;font-family:var(--sp-font-mono);font-size:18px;font-weight:800;line-height:1.6}
  .sp-f-front .bar{position:absolute;left:36px;top:30px;width:140px;height:14px;background:var(--sp-red)}
  .sp-f-label{position:absolute;right:60px;top:330px;padding:16px 26px;background:var(--sp-red);color:var(--sp-sheet);box-shadow:var(--sp-shadow);z-index:4;font-size:36px;font-weight:900;white-space:nowrap}
  .sp-f-label small{display:block;font-family:var(--sp-font-mono);font-size:15px;letter-spacing:.18em;margin-top:4px}
  /* checklist */
  .sp-a4{position:absolute;left:300px;top:100px;width:800px;background:var(--sp-sheet-2);box-shadow:var(--sp-shadow-lg)}
  .sp-a4 .margin{position:absolute;left:66px;top:0;bottom:0;width:2px;background:rgba(217,35,35,.55)}
  .sp-a4 .hd{position:absolute;left:96px;top:56px;font-family:var(--sp-font-mono);font-size:18px;font-weight:800;letter-spacing:.2em;color:var(--sp-grey);white-space:nowrap}
  .sp-a4 .ttl{position:absolute;left:92px;top:92px;font-family:var(--sp-font-latin);font-size:110px;font-weight:900;letter-spacing:-.05em;line-height:1;white-space:nowrap}
  .sp-a4 .sub{position:absolute;left:96px;top:232px;font-size:38px;font-weight:900;white-space:nowrap}
  .sp-a4 .sub i{display:inline-block;width:60px;height:12px;background:var(--sp-red);margin-left:18px;vertical-align:middle}
  .sp-a4 .hr{position:absolute;left:96px;right:66px;top:316px;height:5px;background:var(--sp-ink)}
  .sp-rl{position:absolute;left:96px;right:56px;height:115px;border-bottom:1.5px solid rgba(20,20,20,.16)}
  .sp-rl .box{position:absolute;left:0;top:22px;width:46px;height:46px;border:4px solid var(--sp-ink);box-sizing:border-box}
  .sp-rl .box svg{position:absolute;left:-6px;top:-12px}
  .sp-rl .k{position:absolute;left:76px;top:14px;font-size:42px;font-weight:900;white-space:nowrap}
  .sp-rl .d{position:absolute;left:76px;top:68px;font-size:25px;font-weight:700;color:var(--sp-grey);white-space:nowrap}
  .sp-rl .n{position:absolute;right:0;top:22px;font-family:var(--sp-font-mono);font-size:18px;font-weight:800;color:var(--sp-red)}
  .sp-note{position:absolute;left:96px;font-size:44px;font-weight:900;white-space:nowrap;z-index:1}
  .sp-note small{display:block;font-family:var(--sp-font-mono);font-size:18px;color:var(--sp-grey);letter-spacing:.16em;margin-bottom:8px}
  .sp-note .tx{position:relative}
  .sp-note .hl{position:absolute;left:-10px;right:-10px;bottom:2px;height:24px;background:rgba(217,35,35,.85);transform-origin:left center;z-index:-1}
  /* compare */
  .sp-cmp{position:absolute;top:290px;width:520px;height:440px;background:var(--sp-sheet);box-shadow:var(--sp-shadow-lg)}
  .sp-cmp .band{height:56px;background:var(--sp-ink);color:var(--sp-sheet);font-family:var(--sp-font-mono);font-size:19px;font-weight:800;letter-spacing:.16em;padding:17px 24px;box-sizing:border-box;white-space:nowrap}
  .sp-cmp.right .band{background:var(--sp-red)}
  .sp-cmp .t{position:absolute;left:32px;top:96px;font-size:58px;font-weight:900;line-height:1.12;white-space:nowrap}
  .sp-cmp .d{position:absolute;left:32px;right:32px;top:260px;font-size:26px;font-weight:700;line-height:1.5;color:var(--sp-grey)}
  .sp-cmp svg.strike{position:absolute;left:20px;top:90px;overflow:visible}
  .sp-vs{position:absolute;left:580px;top:420px;width:240px;text-align:center;font-family:var(--sp-font-latin);font-size:120px;font-weight:900;letter-spacing:-.05em;color:var(--sp-red)}
  .sp-verdict{position:absolute;left:60px;top:790px;width:1280px;height:120px;background:var(--sp-ink);color:var(--sp-sheet);box-shadow:var(--sp-shadow-lg);display:flex;align-items:center;gap:26px;padding:0 36px;box-sizing:border-box}
  .sp-verdict b{font-family:var(--sp-font-mono);font-size:20px;letter-spacing:.2em;color:var(--sp-red);white-space:nowrap}
  .sp-verdict span{font-size:44px;font-weight:900;white-space:nowrap}
  /* showcase */
  .sp-panel{position:absolute;left:60px;top:260px;width:1240px;height:640px;box-shadow:var(--sp-shadow-lg);overflow:hidden}
  .sp-panel.dark{background:#141414;color:#EDE8DC}
  .sp-panel.light{background:var(--sp-sheet-2);color:var(--sp-ink)}
  .sp-panel .bar{height:52px;display:flex;align-items:center;gap:10px;padding:0 20px;font-family:var(--sp-font-mono);font-size:17px;font-weight:800;letter-spacing:.1em;border-bottom:2px solid rgba(237,232,220,.12)}
  .sp-panel.light .bar{border-bottom-color:rgba(20,20,20,.12)}
  .sp-panel .bar i{width:14px;height:14px;background:#5B564C;display:inline-block}
  .sp-panel .bar i:first-child{background:var(--sp-red)}
  .sp-panel .bar span{margin-left:12px}
  .sp-code{padding:22px 30px;font-family:var(--sp-font-mono);font-size:30px;line-height:1.62;white-space:pre}
  .sp-code .ln{display:inline-block;width:46px;color:#5B564C}
  .sp-code .c{color:#8C877C}.sp-code .k{color:var(--sp-red)}.sp-code .ok{color:#7BC29A}
  .sp-panel.light .sp-code{font-family:var(--sp-font-cn);font-size:34px;font-weight:700}
  .sp-media{position:absolute;left:0;right:0;top:52px;bottom:0;width:100%;height:calc(100% - 52px);object-fit:cover;background:#000}
  .sp-note-pin{position:absolute;display:flex;align-items:center;gap:12px;z-index:5}
  .sp-note-pin b{width:46px;height:46px;border-radius:50%;background:var(--sp-red);color:#fff;font-family:var(--sp-font-latin);font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.35)}
  .sp-note-pin span{background:var(--sp-sheet);color:var(--sp-ink);font-size:24px;font-weight:900;padding:8px 16px;box-shadow:var(--sp-shadow);white-space:nowrap;border-left:6px solid var(--sp-red)}
  /* quote（屏幕层） */
  .sp-quote{position:absolute;top:240px;width:660px;padding:40px 44px 46px 48px;box-sizing:border-box;background:var(--sp-sheet);border-left:12px solid var(--sp-red);box-shadow:0 2px 2px rgba(0,0,0,.2),0 30px 60px -10px rgba(0,0,0,.6)}
  .sp-quote .k{font-family:var(--sp-font-mono);font-size:17px;font-weight:900;letter-spacing:.18em;color:var(--sp-red)}
  .sp-quote-t{font-size:56px;font-weight:900;line-height:1.24;margin-top:16px;color:var(--sp-ink)}
  .sp-quote .by{margin-top:22px;font-family:var(--sp-font-mono);font-size:18px;font-weight:800;color:var(--sp-grey);letter-spacing:.1em}
  /* outro */
  .sp-act{position:absolute;left:60px;width:560px;height:150px;background:var(--sp-sheet);box-shadow:var(--sp-shadow-lg);padding:24px 30px;box-sizing:border-box}
  .sp-act .no{font-family:var(--sp-font-mono);font-size:20px;font-weight:900;color:var(--sp-red);letter-spacing:.12em}
  .sp-act .t{font-size:40px;font-weight:900;margin-top:6px;white-space:nowrap}
  .sp-act .d{font-size:21px;font-weight:700;color:var(--sp-grey);margin-top:4px;white-space:nowrap}
  .sp-cta{position:absolute;left:690px;top:280px;width:650px;height:500px;background:var(--sp-ink);color:var(--sp-sheet);box-shadow:var(--sp-shadow-lg);padding:40px 44px;box-sizing:border-box}
  .sp-cta .k{font-family:var(--sp-font-mono);font-size:20px;font-weight:900;letter-spacing:.2em;color:var(--sp-red)}
  .sp-cta .t{font-size:62px;font-weight:900;margin-top:14px;line-height:1.1;white-space:nowrap}
  .sp-cta .repo{margin-top:22px;padding:14px 18px;border:2px solid rgba(237,232,220,.3);font-family:var(--sp-font-mono);font-size:26px;font-weight:800;white-space:nowrap;overflow:hidden}
  .sp-cta .btns{display:flex;gap:14px;margin-top:28px}
  .sp-cta .btns span{flex:1;text-align:center;padding:16px 0;background:var(--sp-sheet);color:var(--sp-ink);font-size:30px;font-weight:900}
  .sp-cta .btns span:first-child{background:var(--sp-red);color:var(--sp-sheet)}
  /* stat */
  .sp-stat{position:absolute;top:300px;height:430px;padding:30px 30px 0;box-sizing:border-box;overflow:hidden}
  .sp-stat .lb{font-family:var(--sp-font-mono);font-size:20px;font-weight:800;letter-spacing:.12em;color:var(--sp-grey);white-space:nowrap}
  .sp-stat .num{margin-top:18px;font-family:var(--sp-font-latin);font-weight:900;letter-spacing:-.05em;line-height:1;white-space:nowrap;color:var(--sp-ink);display:inline-block}
  .sp-stat.hot .num{color:var(--sp-red)}
  .sp-stat .num .u,.sp-stat .num .pf{font-family:var(--sp-font-cn);font-size:.26em;letter-spacing:0;margin-left:.15em;vertical-align:.2em}
  .sp-stat .num .pf{margin:0 .1em 0 0}
  .sp-stat .bar{position:absolute;left:30px;right:30px;bottom:44px;height:22px;background:rgba(20,20,20,.1)}
  .sp-stat .bar i{position:absolute;left:0;top:0;bottom:0;background:var(--sp-ink);transform-origin:left center}
  .sp-stat.hot .bar i{background:var(--sp-red)}
  .sp-stat .sc{position:absolute;right:30px;bottom:12px;font-family:var(--sp-font-mono);font-size:16px;font-weight:800;color:var(--sp-grey)}
  /* timeline */
  .sp-tl-node{position:absolute;width:240px;height:200px;padding:16px 20px;box-sizing:border-box}
  .sp-tl-node .tm{font-family:var(--sp-font-latin);font-size:58px;font-weight:900;letter-spacing:-.04em;line-height:1;color:var(--sp-red);white-space:nowrap}
  .sp-tl-node .t{font-size:34px;font-weight:900;margin-top:10px;white-space:nowrap}
  .sp-tl-node .d{font-size:19px;font-weight:700;color:var(--sp-grey);margin-top:6px;line-height:1.35}
  .sp-tl-node.now{background:var(--sp-red);color:var(--sp-sheet)}
  .sp-tl-node.now .tm{color:var(--sp-sheet)}.sp-tl-node.now .d{color:rgba(247,244,236,.85)}
  .sp-tl-stem{position:absolute;width:3px;background:var(--sp-ink)}
  .sp-tl-dot{position:absolute;width:26px;height:26px;background:var(--sp-ink);z-index:6}
  .sp-tl-dot.now{background:var(--sp-red);outline:4px solid var(--sp-paper)}
  /* diagram */
  .sp-dg-node{position:absolute;width:260px;height:124px;padding:16px 20px 0;box-sizing:border-box;border-top:10px solid var(--sp-ink);z-index:3}
  .sp-dg-node .l{font-size:36px;font-weight:900;white-space:nowrap}
  .sp-dg-node .s{font-family:var(--sp-font-mono);font-size:17px;font-weight:800;color:var(--sp-grey);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sp-dg-node.hot{background:var(--sp-red);color:var(--sp-sheet)}
  .sp-dg-node.hot .s{color:rgba(247,244,236,.85)}
  .sp-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .sp-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .sp-dg-tag{padding:4px 12px;background:var(--sp-paper);border:2px solid var(--sp-ink);font-family:var(--sp-font-mono);font-size:16px;font-weight:800;white-space:nowrap}
  /* showcase · product */
  .sp-prod{position:absolute;left:0;right:0;top:52px;bottom:0}
  .sp-prod .pic{position:absolute;left:28px;top:28px;bottom:28px;width:500px;background:var(--sp-paper);display:flex;align-items:center;justify-content:center;overflow:hidden}
  .sp-prod .pic img{width:100%;height:100%;object-fit:contain}
  .sp-prod .pic svg{width:80%;height:auto;color:var(--sp-ink)}
  .sp-prod .info{position:absolute;left:570px;right:40px;top:34px}
  .sp-prod .nm{font-size:58px;font-weight:900;line-height:1.08;white-space:nowrap}
  .sp-prod .tg{font-size:24px;font-weight:700;color:var(--sp-grey);margin-top:10px;white-space:nowrap}
  .sp-prod .specs{margin-top:22px;border-top:5px solid var(--sp-ink)}
  .sp-prod .row{display:flex;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1.5px solid rgba(20,20,20,.16);white-space:nowrap}
  .sp-prod .row .k{font-family:var(--sp-font-mono);font-size:19px;font-weight:800;color:var(--sp-grey);letter-spacing:.06em}
  .sp-prod .row .v{font-size:26px;font-weight:900}
  `;
  function injectCSS() {
    if (document.getElementById('sp-components-css')) return;
    const st = document.createElement('style'); st.id = 'sp-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  // 默认机位
  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });

  // ============================== 1. cover 章节封面 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'sp-zone');
    const kick = h('div', 'sp-kicker', 'left:60px;top:120px;', esc(data.kicker));
    const title = h('div', 'sp-cover-title');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const block = h('div', 'sp-cover-block', null, `<div class="l">${esc(data.chapterLabel || '')}</div><div class="n">${esc(data.chapter || '')}</div>`);
    hideIf(block, blank(data.chapterLabel) && blank(data.chapter));   // 章节号 / 章节名都没填 → 红色章节块不出（不再出默认 CHAPTER 01）
    const sub = h('div', 'sp-cover-sub', null, mark(data.subtitle));
    const dm = hideIf(dim(data.dim || '', 'left:410px;top:700px;width:880px;'), blank(data.dim));
    const st = hideIf(stamp(data.stamp || '', data.stampSmall || '', 'left:1000px;top:770px;font-size:52px;'), blank(data.stamp));
    el.append(kick, title, block, sub, dm, st,
      prop('pencil', 400, 'left:410px;top:850px;transform:rotate(-3deg);'),
      prop('triangle', 170, 'left:1160px;top:560px;transform:rotate(8deg);'),
      reg('left:20px;top:96px;'), reg('left:1320px;top:930px;'));
    A.add(kick, 0.15, 0.35, { x: -30, o: 0 }, { x: 0, o: 1 });
    chars.forEach((c, i) => A.add(c, 0.3 + i * 0.06, 0.42, { y: -90, o: 0 }, { y: 0, o: 1 }, 'back'));
    const tB = 0.5 + chars.length * 0.06;
    A.add(block, tB, 0.45, { x: -200, o: 0, r: -6 }, { x: 0, o: 1, r: -1.2 }, 'drop');
    A.add(sub, tB + 0.35, 0.4, { x: 40, o: 0 }, { x: 0, o: 1 });
    A.add(dm.querySelector('.dl'), tB + 0.6, 0.5, { sx: 0 }, { sx: 1 });
    A.add(dm.querySelector('.dt'), tB + 0.9, 0.25, { o: 0 }, { o: 1 });
    A.add(st, Math.min(D - 1.2, tB + 1.6), 0.12, { s: 1.4, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 520, 360, 1.32, 2, -3, -0.4), CAM(1.8, 700, 500, 1.0, 1, -1, 0), CAM(D, 710, 500, 1.04, 0.5, 0.5, 0)] };
  }

  // ============================== 2. steps 3–5 步纸签 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'sp-zone');
    const kick = h('div', 'sp-kicker', 'left:100px;top:110px;', esc(data.kicker));
    const head = h('div', 'sp-head', 'left:96px;top:142px;font-size:96px;', mark(data.title));
    const dm = hideIf(dim(data.dim || '', 'left:100px;top:272px;width:1200px;'), blank(data.dim));   // 没填 dim 不出默认 N STEPS
    const folder = h('div', 'sp-folder');
    folder.append(h('div', 'sp-f-tab', null, esc(data.folder || '')), h('div', 'sp-f-back'));
    const gap = 20, sw = (1200 - 80 - gap * (n - 1)) / n;
    const sheets = items.map((it, i) => {
      const s = h('div', 'sp-f-sheet', `left:${40 + i * (sw + gap)}px;width:${sw}px;`,
        `<div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div>`);
      folder.appendChild(s); return s;
    });
    const front = h('div', 'sp-f-front', null, `<div class="bar"></div><div class="big">${esc(data.folderBig || '')}</div><div class="meta">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`);
    folder.appendChild(front);
    const label = h('div', 'sp-f-label', null, `${esc(data.label || '')}${blank(data.labelSmall) ? '' : `<small>${esc(data.labelSmall)}</small>`}`);
    if (data.label) folder.appendChild(label);
    el.append(kick, head, dm, folder, tape('left:1180px;top:300px;transform:rotate(14deg);'), reg('left:40px;top:96px;'), reg('left:1320px;top:930px;'));
    A.add(folder, 0.1, 0.5, { s: 1.15, y: -40, o: 0, r: -2 }, { s: 1, y: 0, o: 1, r: 0 }, 'drop');
    A.add(kick, 0.3, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.4, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(dm.querySelector('.dl'), 0.8, 0.5, { sx: 0 }, { sx: 1 });
    A.add(dm.querySelector('.dt'), 1.1, 0.25, { o: 0 }, { o: 1 });
    const t0 = 1.3, t1 = Math.max(t0 + 0.5, D - 2.0), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    sheets.forEach((s, i) => A.add(s, t0 + i * stp, 0.42, { y: 220, r: 0, o: 0 }, { o: 1, y: 0, r: [-2, 1.5, -1, 2, -1.5][i] }, 'back'));
    if (data.label) A.add(label, D - 1.2, 0.3, { s: 1.3, o: 0, r: 4 }, { s: 1, o: 1, r: -3 });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 620, 1.22, 2, -2, -0.3), CAM(1.3, 700, 500, 1.0, 1, -1, 0), CAM(D, 700, 500, 1.04, 0.5, 0.5, 0)] };
  }

  // ============================== 3. checklist 打印纸逐条红勾 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const H = 360 + n * 115 + (data.note ? 190 : 60);
    const el = h('div', 'sp-zone');
    const a4 = h('div', 'sp-a4', `height:${H}px;`,
      `<div class="margin"></div><div class="hd">${esc(data.kicker || '')}</div><div class="ttl">${esc(data.title)}</div>${blank(data.subtitle) ? '' : `<div class="sub">${esc(data.subtitle)}<i></i></div>`}<div class="hr"></div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'sp-rl', `top:${350 + i * 115}px;`,
        `<div class="box">${PROPS.check(60, 8)}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">§${String(i + 1).padStart(2, '0')}</div>`);
      a4.appendChild(r); return r;
    });
    let note = null;
    if (data.note) {
      note = h('div', 'sp-note', `top:${350 + n * 115 + 40}px;`, `${blank(data.noteLead) ? '' : `<small>${esc(data.noteLead)}</small>`}<span class="tx">${esc(data.note)}</span><span class="hl"></span>`);
      a4.appendChild(note);
    }
    a4.append(reg('left:16px;top:16px;'));
    el.append(a4, prop('pin', 0, 'left:678px;top:76px;'), prop('clip', 0, 'left:1060px;top:70px;transform:rotate(8deg);'),
      prop('pencil', 320, 'left:60px;top:560px;transform:rotate(80deg);'), prop('triangle', 200, 'left:1140px;top:620px;transform:rotate(-10deg);'));
    A.add(a4, -1, 0.01, { o: 0, y: -700 }, { o: 0, y: -700 }); // 入场前隐藏，避免邻段时从画面边缘漏出
    A.add(a4, 0, 0.6, { y: -700, r: 2.5, o: 1 }, { y: 0, r: -0.4, o: 1 }, 'out');
    const t0 = 1.2, t1 = Math.max(t0 + 0.4, D - (note ? 2.4 : 1.2)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    rows.forEach((r, i) => A.add(r, t0 + i * stp, 0.3, { o: 0.18, x: -16 }, { o: 1, x: 0 }));
    const cks = rows.map((r) => r.querySelector('.sp-ck'));
    if (note) { A.add(note, D - 2.0, 0.3, { o: 0 }, { o: 1 }); A.add(note.querySelector('.hl'), D - 1.5, 0.7, { sx: 0 }, { sx: 1 }, 'inOut'); }
    A.fn((t) => cks.forEach((c, i) => c.setAttribute('stroke-dashoffset', (70 * (1 - EASE.out(clamp01((t - (t0 + i * stp) - 0.12) / 0.25)))).toFixed(1))));
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1010);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 500, 1.0, 1, -1.5, 0), CAM(1.0, 700, 500, 1.02, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.02, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0, 0)] }; // 先看全条目，总结出现时再往下巡
  }

  // ============================== 4. compare 红笔划掉 vs 正确项 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'sp-zone');
    const kick = h('div', 'sp-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'sp-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const L = h('div', 'sp-cmp', 'left:60px;', `${blank(w.label) ? '' : `<div class="band">${esc(w.label)}</div>`}<div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div><svg class="strike" width="480" height="160"><path d="M4 90 L470 62" stroke="var(--sp-red)" stroke-width="12" fill="none" stroke-dasharray="480" stroke-dashoffset="480"/></svg>`);
    const R = h('div', 'sp-cmp right', 'left:820px;', `${blank(r.label) ? '' : `<div class="band">${esc(r.label)}</div>`}<div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div>`);
    const vs = h('div', 'sp-vs', null, 'VS');
    const xs = hideIf(stamp(w.stamp || '', '', 'left:330px;top:600px;font-size:46px;'), blank(w.stamp));
    const ck = h('div', 'sp-abs', 'left:1230px;top:330px;z-index:7;', PROPS.check(84, 9));
    const pinR = prop('pin', 0, 'left:1060px;top:268px;');
    const pinL = prop('pin', 0, 'left:300px;top:268px;');
    const verdict = hideIf(h('div', 'sp-verdict', null, `${blank(data.verdictLabel) ? '' : `<b>${esc(data.verdictLabel)}</b>`}<span>${mark(data.verdict || '')}</span>`), blank(data.verdict));
    el.append(kick, head, L, R, vs, xs, ck, pinL, pinR, verdict,
      prop('triangle', 190, 'left:1180px;top:690px;transform:rotate(-12deg);'),
      prop('pencil', 300, 'left:0px;top:0px;'), reg('left:20px;top:96px;'));
    const pencil = el.lastChild.previousSibling;
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(L, 0.6, 0.45, { y: 140, o: 0, r: -5 }, { y: 0, o: 1, r: -1.2 }, 'drop');
    A.add(pinL, 0.95, 0.2, { y: -50, o: 0 }, { y: 0, o: 1 });
    const tStrike = Math.min(D * 0.3, 2.0);
    const strike = L.querySelector('path');
    A.add(pencil, tStrike - 0.2, 0.2, { x: 80, y: 360, r: -20, o: 0 }, { x: 80, y: 360, r: -20, o: 1 });
    A.add(pencil, tStrike, 0.55, { x: 80, y: 360, r: -20, o: 1 }, { x: 540, y: 330, r: -20, o: 1 }, 'inOut');
    A.add(pencil, tStrike + 0.8, 0.4, { x: 540, y: 330, r: -20, o: 1 }, { x: 760, y: 120, r: -40, o: 0 }, 'in');
    A.add(xs, tStrike + 0.6, 0.12, { s: 1.4, o: 0, r: -10 }, { s: 1, o: 1, r: -10 });
    A.add(vs, tStrike + 0.3, 0.35, { s: 1.6, o: 0 }, { s: 1, o: 1 }, 'back');
    const tR = Math.min(D * 0.5, tStrike + 1.2);
    A.add(R, tR, 0.45, { y: 140, o: 0, r: 5 }, { y: 0, o: 1, r: 1 }, 'drop');
    A.add(pinR, tR + 0.35, 0.2, { y: -50, o: 0 }, { y: 0, o: 1 });
    const ckp = ck.querySelector('.sp-ck');
    A.add(verdict, Math.min(D - 1.4, tR + 1.3), 0.45, { y: 140, o: 0, r: 1.5 }, { y: 0, o: 1, r: -0.6 }, 'drop');
    A.fn((t) => {
      strike.setAttribute('stroke-dashoffset', (480 * (1 - EASE.inOut(clamp01((t - tStrike) / 0.55)))).toFixed(1));
      ckp.setAttribute('stroke-dashoffset', (70 * (1 - EASE.out(clamp01((t - tR - 0.7) / 0.3)))).toFixed(1));
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.1, 1, -2, 0), CAM(1.0, 700, 500, 1.0, 0.5, -1, 0), CAM(D, 700, 510, 1.02, 0.5, 1, 0)] };
  }

  // ============================== 5. showcase 代码/文档/终端/录屏贴片 ==============================
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'sp-zone');
    const kick = h('div', 'sp-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'sp-head', 'left:56px;top:142px;font-size:80px;', mark(data.title));
    const dark = kind === 'code' || kind === 'terminal';
    const panel = h('div', `sp-panel ${dark ? 'dark' : 'light'}`, null, `<div class="bar"><i></i><i></i><i></i><span>${esc(data.file || '')}</span></div>`);
    let codeEl = null, media = null;
    const lines = data.lines || [];
    let prod = null;
    if (kind === 'product') { prod = productPanel(data, 'sp'); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'sp-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'sp-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', 'sp-code'); panel.appendChild(codeEl); }
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const p = h('div', 'sp-note-pin', `left:${(nt.at && nt.at[0]) || 60}%;top:${(nt.at && nt.at[1]) || 30 + i * 20}%;`, `<b>${i + 1}</b><span>${esc(nt.text)}</span>`);
      panel.appendChild(p); return p;
    });
    el.append(kick, head, panel, tape('left:20px;top:236px;transform:rotate(-12deg);'), tape('left:1210px;top:236px;transform:rotate(10deg);'),
      prop('clip', 0, kind === 'product' ? 'left:28px;top:560px;transform:rotate(-8deg);' : 'left:1240px;top:600px;transform:rotate(-8deg);'), reg('left:20px;top:96px;'));
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(panel, 0.3, 0.55, { y: 200, o: 0, r: -3, s: 0.94 }, { y: 0, o: 1, r: -0.5, s: 1 }, 'drop');
    const tType0 = 0.9, tType1 = Math.max(tType0 + 0.6, D * 0.62);
    const total = lines.reduce((a, l) => a + String(l.t || l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.8 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.32, { s: 0.4, o: 0 }, { s: 1, o: 1 }, 'back'));
    if (prod) {
      A.add(prod.pic, 0.7, 0.5, { s: 0.9, o: 0 }, { s: 1, o: 1 }, 'back');
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.28, 0.3, { x: 40, o: 0 }, { x: 0, o: 1 }));
      if (prod.price) A.add(prod.price, Math.min(D - 1.2, 1.3 + prod.rows.length * 0.28 + 0.3), 0.12, { s: 1.4, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    }
    A.fn((t) => {
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
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), media,
      cams: [CAM(0, 700, 560, 0.94, 1, -1, 0), CAM(1.2, 700, 520, 1.0, 1, -1.5, 0), CAM(D, 720, 540, 1.05, 1, 1, 0)] };
  }

  // ============================== 6. quote 全屏人像金句纸片（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'sp-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const card = h('div', 'sp-quote', `${right ? 'right:70px;' : 'left:70px;'}`,
      `${blank(data.kicker) ? '' : `<div class="k">${esc(data.kicker)}</div>`}<div class="sp-quote-t">${mark(data.text)}</div>${blank(data.by) ? '' : `<div class="by">${esc(data.by)}</div>`}`);
    const tp = tape(`left:${right ? 1920 - 70 - 660 + 250 : 320}px;top:220px;transform:rotate(-4deg);`);
    const st = hideIf(stamp(data.stamp || '', data.stampSmall || '', `${right ? 'right:110px;' : 'left:420px;'}top:${data.stampTop || 640}px;font-size:54px;background:rgba(247,244,236,.0);`), blank(data.stamp));
    st.style.mixBlendMode = 'normal';
    el.append(card, tp, st);
    A.add(card, 0.5, 0.5, { x: right ? 120 : -120, o: 0, r: right ? 4 : -4 }, { x: 0, o: 1, r: right ? 1 : -1 }, 'drop');
    A.add(tp, 0.95, 0.15, { o: 0 }, { o: 1, r: -4 });
    A.add(st, Math.min(D - 1.0, D * 0.5), 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 7. outro 行动建议 + CTA 结尾卡 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'sp-zone');
    const kick = h('div', 'sp-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'sp-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const acts = (data.actions || []).slice(0, 3).map((a, i) => {
      const e = h('div', 'sp-act', `top:${280 + i * 172}px;`, `<div class="no">${String(i + 1).padStart(2, '0')}${blank(a.tag) ? '' : ` / ${esc(a.tag)}`}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div>`);
      return e;
    });
    const pins = acts.map((_, i) => prop('pin', 0, `left:320px;top:${258 + i * 172}px;`));
    const c = data.cta || {};
    const btns = (c.buttons || []).slice(0, 3).filter((b) => !blank(b));
    const cta = h('div', 'sp-cta', null, `${blank(c.kicker) ? '' : `<div class="k">${esc(c.kicker)}</div>`}<div class="t">${esc(c.title || '')}</div>${blank(c.repo) ? '' : `<div class="repo">${esc(c.repo)}</div>`}<div class="btns">${btns.map((b) => `<span>${esc(b)}</span>`).join('')}</div>`);
    const go = hideIf(stamp(c.stamp || '', c.stampSmall || '', 'left:1120px;top:690px;font-size:64px;'), blank(c.stamp));
    go.style.mixBlendMode = 'normal'; go.style.background = 'var(--sp-sheet)';
    const ctaTape = tape('left:930px;top:258px;');
    const noCta = blank(c.kicker) && blank(c.title) && blank(c.repo) && !btns.length;   // CTA 一个字段都没填 → 整张深色结尾卡（连胶带）不出
    [cta, ctaTape].forEach((e) => hideIf(e, noCta));
    el.append(kick, head, ...acts, ...pins, cta, go, ctaTape, reg('left:20px;top:96px;'), reg('left:1320px;top:930px;'));
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    const t0 = 0.7, stp = Math.min(0.7, (D * 0.4) / Math.max(1, acts.length));
    acts.forEach((a, i) => { A.add(a, t0 + i * stp, 0.42, { x: -160, o: 0, r: -4 }, { x: 0, o: 1, r: [-1.2, 0.8, -0.6][i] }, 'drop'); A.add(pins[i], t0 + i * stp + 0.3, 0.2, { y: -50, o: 0 }, { y: 0, o: 1 }); });
    const tC = t0 + acts.length * stp + 0.1;
    A.add(cta, tC, 0.5, { y: 160, o: 0, r: 4, s: 0.95 }, { y: 0, o: 1, r: 0.8, s: 1 }, 'drop');
    A.add(ctaTape, tC + 0.45, 0.15, { o: 0, r: -6 }, { o: 1, r: -6 });
    A.add(go, Math.min(D - 0.9, tC + 1.2), 0.12, { s: 1.5, o: 0, r: -10 }, { s: 1, o: 1, r: -10 });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.08, 1, -2, 0), CAM(1.2, 700, 500, 1.0, 0.5, -0.5, 0), CAM(D, 700, 500, 0.98, 0, 0.5, 0)] };
  }

  // ============================== 共用：产品贴片 / 数字格式 / 连线几何 ==============================
  const DEVICE_SVG = (accent) => `<svg viewBox="0 0 400 300"><rect x="40" y="86" width="320" height="174" fill="none" stroke="currentColor" stroke-width="8"/><rect x="80" y="56" width="96" height="34" fill="currentColor"/><circle cx="200" cy="173" r="64" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="200" cy="173" r="34" fill="${accent}"/><rect x="300" y="108" width="34" height="18" fill="${accent}"/><text x="200" y="292" text-anchor="middle" font-family="Consolas, monospace" font-size="20" font-weight="800" fill="currentColor" letter-spacing="4">PRODUCT IMAGE</text></svg>`;
  /** showcase kind:"product" —— 左产品图（无 src 用设备线稿占位）+ 右规格表 + 价格印章 */
  function productPanel(data) {
    const el = h('div', 'sp-prod');
    const pic = h('div', 'pic');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.innerHTML = DEVICE_SVG('var(--sp-red)');
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div><div class="tg">${esc(data.tagline || '')}</div>`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? stamp(data.price, data.priceSmall || '', 'right:46px;bottom:36px;font-size:48px;') : null;
    if (price) { price.style.mixBlendMode = 'normal'; price.style.background = 'var(--sp-sheet-2)'; el.appendChild(price); }
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

  // ============================== 8. stat 大数字冲击 / 数据对比 ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'sp-zone');
    const kick = h('div', 'sp-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'sp-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const gap = 40, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 260 : n === 2 ? 190 : 140;
    const cards = items.map((it, i) => h('div', `sp-sheet sp-stat${i === n - 1 ? ' hot' : ''}`, `left:${60 + i * (w + gap)}px;width:${w}px;`,
      `<div class="lb">${esc(it.label || '')}</div><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div><div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div>`));
    const nums = cards.map((c) => c.querySelector('.num'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const st = data.delta ? stamp(data.delta, data.deltaSmall || '', 'left:990px;top:770px;font-size:58px;') : null;
    const dm = data.note ? dim(data.note, 'left:60px;top:800px;width:860px;') : null;
    el.append(kick, head, ...cards, prop('triangle', 170, 'left:1190px;top:190px;transform:rotate(-8deg);'), reg('left:20px;top:96px;'), reg('left:1320px;top:930px;'));
    if (dm) el.appendChild(dm);
    if (st) el.appendChild(st);
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    const tIn = cards.map((_, i) => 0.6 + i * 0.55);
    cards.forEach((c, i) => {
      A.add(c, tIn[i], 0.45, { y: 140, o: 0, r: i % 2 ? 3 : -3 }, { y: 0, o: 1, r: [-0.8, 0.6, -0.5][i] }, 'drop');
      A.add(c.querySelector('.bar i'), tIn[i] + 1.1, 0.6, { sx: 0 }, { sx: 1 }, 'inOut');
    });
    if (dm) { A.add(dm.querySelector('.dl'), D - 2.6, 0.5, { sx: 0 }, { sx: 1 }); A.add(dm.querySelector('.dt'), D - 2.3, 0.25, { o: 0 }, { o: 1 }); }
    if (st) A.add(st, Math.min(D - 1.2, tIn[n - 1] + 1.9), 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 60); fitted = true; }
      items.forEach((it, i) => { nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.2) / 1.2)), decs[i]); });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.1, 1, -2, 0), CAM(1.2, 700, 505, 1.0, 0.5, -1, 0), CAM(D, 705, 505, 1.04, 0.5, 0.8, 0)] };
  }

  // ============================== 9. timeline 时间轴 / 演进（长轴横向跟拍） ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    // ≤5 个节点一屏铺满不横移；更多节点按 300 间距加长画布，由机位横向跟拍
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'sp-zone', `width:${W}px;`);
    const kick = h('div', 'sp-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'sp-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    const ruler = prop('ruler', W - 120, 'left:60px;top:528px;');
    el.append(kick, head, ruler, reg('left:20px;top:96px;'));
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 290 : 640, at = t0 + i * stp;
      const card = h('div', `sp-sheet sp-tl-node${i === now ? ' now' : ''}`, `left:${x}px;top:${top}px;`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', 'sp-tl-stem', `left:${x + 40}px;top:${up ? 490 : 560}px;height:${up ? 48 : 80}px;`);
      const dot = h('div', `sp-tl-dot${i === now ? ' now' : ''}`, `left:${x + 28}px;top:547px;`);
      el.append(stem, dot, card);
      A.add(dot, at - 0.1, 0.25, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
      A.add(stem, at, 0.2, { o: 0 }, { o: 1 });
      A.add(card, at + 0.05, 0.4, { y: up ? -80 : 80, o: 0, r: up ? -3 : 3 }, { y: 0, o: 1, r: [-0.8, 0.7, -0.5, 0.9][i % 4] }, 'drop');
      return { x, up, top, at };
    });
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = stamp(data.nowLabel, data.nowSmall || '', `left:${Math.min(W - 280, p.x + (p.up ? 10 : 110))}px;top:${p.up ? 616 : p.top + 190}px;font-size:36px;`);
      ns.style.mixBlendMode = 'normal'; ns.style.background = 'var(--sp-sheet)';
      el.appendChild(ns);
      A.add(ns, Math.min(D - 0.9, p.at + 0.7), 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    }
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.add(ruler, 0.4, 0.7, { x: -60, o: 0 }, { x: 0, o: 1 });
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.06, 1, -2, 0), CAM(0.9, 700, 505, 1.0, 0.5, -1, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 505, 1.0, 0.5, 1, 0), CAM(D, endX + 6, 505, 1.02, 0.3, 1, 0)] };
  }

  // ============================== 10. diagram 关系 / 架构图（节点 + 连线 + 流动脉冲） ==============================
  let DG_SEQ = 0;
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 290, AW = 1280, AH = 610, NW = 260, NH = 124;
    const el = h('div', 'sp-zone');
    const kick = h('div', 'sp-kicker', 'left:60px;top:110px;', esc(data.kicker));
    const head = h('div', 'sp-head', 'left:56px;top:142px;font-size:90px;', mark(data.title));
    el.append(kick, head, reg('left:20px;top:96px;'), reg('left:1320px;top:930px;'));
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = h('div', 'sp-sheet sp-dg-node', `left:${x}px;top:${y}px;`, `<div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      el.appendChild(e);
      A.add(e, appear[nd.id], 0.4, { s: 0.6, o: 0, r: -4 }, { s: 1, o: 1, r: [-0.8, 0.6, -0.4, 0.8][i % 4] }, 'back');
      return e;
    });
    const mid = `spdg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill="var(--sp-ink)"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="var(--sp-ink)" stroke-width="4" fill="none" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mid})"/>`;
      inner += `<rect class="pl" data-j="${j}" data-k="0" x="-7" y="-7" width="14" height="14" fill="var(--sp-red)" opacity="0"/><rect class="pl" data-j="${j}" data-k="1" x="-7" y="-7" width="14" height="14" fill="var(--sp-red)" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'sp-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'sp-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'sp-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.4, 0.25, { s: 0.5, o: 0 }, { s: 1, o: 1 }, 'back');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = stamp(data.focusLabel, data.focusSmall || '', `left:${Math.min(1140, p.x + 150)}px;top:${p.y - 58}px;font-size:32px;`);
      st.style.mixBlendMode = 'normal'; st.style.background = 'var(--sp-sheet)'; el.appendChild(st);
      A.add(st, tF + 0.25, 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    }
    A.add(kick, 0.1, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    A.fn((t) => {
      lnEls.forEach((p) => { const j = +p.dataset.j, g = geo[j]; p.setAttribute('stroke-dashoffset', (g.len * (1 - EASE.inOut(clamp01((t - tDraw[j]) / 0.5)))).toFixed(1)); });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.6;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.5 + (+r.dataset.k) * 0.5) % 1);
        r.setAttribute('opacity', '1'); r.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 560, 1.1, 1, -2, 0), CAM(1.2, 700, 515, 1.0, 0.5, -1, 0), CAM(D, 705, 515, 1.03, 0.5, 1, 0)] };
  }

  global.SwissPrint = {
    version: '1.1.0',
    PROPS, Animator, EASE, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro },
      stat: { create: stat }, timeline: { create: timeline }, diagram: { create: diagram }
    }
  };
})(window);
