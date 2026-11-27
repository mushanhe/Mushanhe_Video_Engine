/**
 * Mushanhe Video Engine — 风格包 03 · 真实文档 × 3D 深度调查桌面（Investigative Desk）
 * ---------------------------------------------------------------------------
 * 10 大万能口播句型参数化组件（cover · steps · checklist · compare · showcase[code|terminal|doc|image|video|product] · quote · outro · stat · timeline · diagram），
 * 全部由 JSON 驱动、按时间确定性渲染（任意 seek 可还原）。字段与 02_swiss_print / 06_neobrutalism 100% 一致。
 *
 *   const comp = InvestigativeDesk.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data        ctx : { dur }
 *   返回   : { el, layer:'world'|'screen', avatar, cams:[{t,x,y,zoom,rx,ry,rz}], update(localT), w?, media? }
 *
 * 美术锁定（物理参数）：
 *   桌面 #EFE9DC 暖亚麻切割垫方格 · 文档纸 #FCF9F2（1.5px 牛皮边 + 6px 圆角 + 暖棕投影 + 左侧红双装订线）
 *   编辑部荧光黄马克笔 #FFE14D（background-size 0→100% 确定性刷出）· 红笔 #D92B4B 手绘圈 / 勾 / 叉 / 下划线（pathLength=1 描边）
 *   红色调查丝线 + 黄铜 / 红头图钉 · 黄便签 · 索引卡（蓝格红顶线）· 马尼拉文件夹 · 宝丽来 · 牛皮纸胶带 · 红色橡皮章
 *   `**关键词**` → 黄色马克笔高亮
 *
 * 局部坐标安全区：x 60–1340，y 100–980（宿主页按 (x-60, y, zoom×0.92) 换算，落在人像框左侧、标签之下、字幕之上）。
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

  /** 荧光笔扫过：按顺序把 .vx-hl 的 background-size 从 0% 刷到 100% */
  function sweep(A, els, t0, d = 0.42, gap = 0.12) {
    const list = Array.from(els || []);
    A.fn((t) => list.forEach((e, i) => { const p = EASE.inOut(clamp01((t - t0 - i * (d + gap)) / d)); e.style.backgroundSize = p > 0.002 ? `${(p * 100).toFixed(1)}% 80%` : '0 0'; }));
    return t0 + list.length * (d + gap);
  }
  /** 红笔 / 丝线描边：pathLength=1 的 path 从 0 描到 1 */
  function draw(A, paths, t0, d = 0.5, ease = 'inOut') {
    const list = paths && paths.length != null && !paths.getAttribute ? Array.from(paths) : [paths];
    A.fn((t) => list.forEach((p) => {
      if (!p) return;
      const k = EASE[ease](clamp01((t - t0) / d));
      p.setAttribute('stroke-dashoffset', (1 - k).toFixed(4));
      p.style.opacity = k > 0.002 ? '1' : '0';
    }));
  }
  const DRAW_ATTR = 'pathLength="1" stroke-dasharray="1 1.05" stroke-dashoffset="1" fill="none" stroke-linecap="round" stroke-linejoin="round"';

  // ============================== 红笔手绘路径 ==============================
  /** 手绘红圈：1.1 圈、略收口、带抖动（确定性） */
  function loopD(W, H, seed = 1) {
    const cx = W / 2, cy = H / 2, rx = W / 2 - 6, ry = H / 2 - 6; let d = '';
    for (let k = 0; k <= 60; k++) {
      const u = k / 60, a = -2.0 + u * Math.PI * 2 * 1.12;
      const f = 1 + 0.03 * Math.sin(a * 3 + seed) - 0.05 * u;
      d += `${k ? 'L' : 'M'}${(cx + Math.cos(a) * rx * f).toFixed(1)} ${(cy + Math.sin(a) * ry * f * (1 + 0.04 * Math.sin(seed * 2 + a))).toFixed(1)}`;
    }
    return d;
  }
  function penSvg(W, H, paths, style, sw = 6) {
    return h('div', 'vx-pen', style, `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${paths.map((d) => `<path class="vx-draw" d="${d}" ${DRAW_ATTR} style="stroke:var(--vx-red);stroke-width:${sw}px"/>`).join('')}</svg>`);
  }
  const penLoop = (W, H, seed, style, sw) => penSvg(W, H, [loopD(W, H, seed)], style, sw);
  const penCheck = (S, style, sw = 8) => penSvg(S, S, [`M${S * 0.08} ${S * 0.55} L${S * 0.36} ${S * 0.84} L${S * 0.94} ${S * 0.1}`], style, sw);
  const penCross = (W, H, style, sw = 10) => penSvg(W, H, [`M${W * 0.06} ${H * 0.12} Q${W * 0.5} ${H * 0.46} ${W * 0.95} ${H * 0.9}`, `M${W * 0.92} ${H * 0.08} Q${W * 0.46} ${H * 0.52} ${W * 0.05} ${H * 0.92}`], style, sw);
  const penUnder = (W, style, sw = 6) => penSvg(W, 24, [`M4 14 Q${W * 0.25} 4 ${W * 0.5} 13 T${W - 4} 9`], style, sw);
  const penStrike = (W, style, sw = 9) => penSvg(W, 40, [`M4 26 Q${W * 0.5} 8 ${W - 4} 18`], style, sw);

  // ============================== 纯 SVG 实体道具 ==============================
  const PROPS = {
    pencil(len = 320) {
      return `<svg width="${len}" height="26" viewBox="0 0 ${len} 26"><polygon points="0,13 36,1 36,25" fill="#EBCB98"/><polygon points="0,13 12,9.4 12,16.6" fill="#2A2118"/><rect x="36" y="1" width="${len - 86}" height="24" fill="#F2B51D"/><rect x="36" y="1" width="${len - 86}" height="8" fill="#F8CC4E"/><rect x="36" y="17" width="${len - 86}" height="8" fill="#D99A0E"/><rect x="${len - 50}" y="0" width="20" height="26" fill="#B8B2A6"/><rect x="${len - 30}" y="2" width="28" height="22" rx="4" fill="#E58A8F"/></svg>`;
    },
    marker(len = 260) {
      return `<svg width="${len}" height="34" viewBox="0 0 ${len} 34"><polygon points="0,17 26,7 26,27" fill="#B41D39"/><rect x="26" y="4" width="34" height="26" fill="#E4E0D6"/><rect x="60" y="2" width="${len - 62}" height="30" rx="6" fill="#D92B4B"/><rect x="60" y="6" width="${len - 62}" height="7" rx="3" fill="#F06A82" opacity=".55"/><rect x="${len - 70}" y="2" width="8" height="30" fill="#231C15" opacity=".5"/></svg>`;
    },
    magnifier(s = 170) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 170 170"><line x1="104" y1="104" x2="160" y2="160" stroke="#3A2A1A" stroke-width="18" stroke-linecap="round"/><line x1="104" y1="104" x2="122" y2="122" stroke="#B88A3E" stroke-width="20" stroke-linecap="round"/><circle cx="64" cy="64" r="52" fill="rgba(200,226,236,.28)" stroke="#B88A3E" stroke-width="11"/><path d="M34 46 A36 36 0 0 1 58 26" stroke="#FFFFFF" stroke-width="6" fill="none" opacity=".7" stroke-linecap="round"/></svg>`;
    },
    clip() {
      return `<svg width="44" height="120" viewBox="0 0 44 120"><path d="M14 34 V96 a11 11 0 0 0 22 0 V22 a15 15 0 0 0 -30 0 V88" stroke="#8C9096" stroke-width="3.6" fill="none" stroke-linecap="round"/></svg>`;
    },
    coffee(s = 220) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 220 220"><circle cx="110" cy="110" r="92" fill="none" stroke="rgba(132,86,38,.16)" stroke-width="10"/><circle cx="110" cy="110" r="84" fill="none" stroke="rgba(132,86,38,.08)" stroke-width="4"/><path d="M30 140 A92 92 0 0 1 60 40" fill="none" stroke="rgba(132,86,38,.22)" stroke-width="5"/></svg>`;
    },
    device(accent) {
      return `<svg viewBox="0 0 400 300"><rect x="40" y="86" width="320" height="174" rx="18" fill="none" stroke="currentColor" stroke-width="8"/><rect x="80" y="56" width="96" height="34" rx="6" fill="currentColor"/><circle cx="200" cy="173" r="64" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="200" cy="173" r="34" fill="${accent}"/><rect x="300" y="108" width="34" height="18" rx="4" fill="${accent}"/><text x="200" y="292" text-anchor="middle" font-family="Consolas, monospace" font-size="20" font-weight="800" fill="currentColor" letter-spacing="4">PRODUCT IMAGE</text></svg>`;
    }
  };
  const prop = (name, arg, style) => h('div', 'vx-prop', style, PROPS[name](arg));
  const tape = (style) => h('div', 'vx-tape', style);
  const pin = (style, red) => h('div', `vx-pin${red ? ' red' : ''}`, style);
  const tag = (text, style) => h('div', 'vx-tag', style, esc(text));
  function stamp(text, small, style) { return h('div', 'vx-stamp', style, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`); }
  /** 把 "这句**关键词**话" 中 ** 包裹部分变成黄色马克笔高亮 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="vx-hl">$1</span>').replace(/\n/g, '<br/>'); }
  /** 标题：有 ** 用 **，没有则整行高亮最后一行 */
  function markTitle(s) {
    const str = String(s || '');
    if (str.includes('**')) return mark(str);
    const lines = str.split('\n');
    return lines.map((l, i) => (i === lines.length - 1 ? `<span class="vx-hl">${esc(l)}</span>` : esc(l))).join('<br/>');
  }
  function kickHead(el, A, data, size = 88) {
    const kick = tag(data.kicker || '', 'left:60px;top:104px;');
    const head = h('div', 'vx-head', `left:56px;top:150px;font-size:${size}px;`, mark(data.title));
    el.append(kick, head);
    A.add(kick, 0.1, 0.3, { x: -30, o: 0 }, { x: 0, o: 1 });
    A.add(head, 0.2, 0.4, { x: -40, o: 0 }, { x: 0, o: 1 });
    sweep(A, head.querySelectorAll('.vx-hl'), 0.75);
    return { kick, head };
  }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.3' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.1 1.85'/></filter><rect width='200' height='200' filter='url(%23g)'/></svg>\")";
  const CSS = `
  .vx-zone{position:absolute;width:1400px;height:1100px;font-family:var(--vx-font-cn);color:var(--vx-ink)}
  .vx-abs{position:absolute}
  .vx-paper{position:absolute;background:var(--vx-paper);border:1.5px solid rgba(120,92,58,.22);border-radius:6px;box-shadow:var(--vx-shadow);box-sizing:border-box}
  .vx-paper.bind::before{content:'';position:absolute;left:30px;top:0;bottom:0;width:5px;border-left:1.5px solid rgba(217,43,75,.38);border-right:1.5px solid rgba(217,43,75,.38)}
  .vx-card{position:absolute;box-sizing:border-box;border-radius:3px;box-shadow:var(--vx-shadow);background-color:#FFFEF7;
    background-image:linear-gradient(rgba(217,43,75,.5),rgba(217,43,75,.5)),repeating-linear-gradient(180deg,transparent 0 35px,rgba(70,120,200,.16) 35px 37px);
    background-repeat:no-repeat,repeat;background-size:100% 2px,100% 100%;background-position:0 58px,0 60px}
  .vx-sticky{position:absolute;box-sizing:border-box;background:linear-gradient(180deg,#FFF6B8 0%,#FCEA88 100%);border:1px solid rgba(180,136,36,.32);border-radius:3px 3px 18px 3px;box-shadow:0 22px 38px -10px rgba(58,40,14,.38),0 3px 8px rgba(58,40,14,.14)}
  .vx-tag{position:absolute;display:inline-block;padding:7px 16px 8px;border-radius:4px;background:var(--vx-ink);color:#FFE499;font-family:var(--vx-font-mono);font-size:19px;font-weight:800;letter-spacing:.14em;white-space:nowrap;box-shadow:0 8px 18px rgba(35,28,21,.22)}
  .vx-head{position:absolute;font-weight:900;letter-spacing:-.01em;line-height:1.08;color:var(--vx-ink);white-space:nowrap}
  .vx-hl{background-image:linear-gradient(100deg,rgba(255,225,77,0) 0%,var(--vx-yellow) 1.5%,var(--vx-yellow) 97%,rgba(255,225,77,.25) 100%);background-repeat:no-repeat;background-position:0 62%;background-size:0 0;padding:0 .08em;margin:0 -.04em;-webkit-box-decoration-break:clone;box-decoration-break:clone;color:inherit}
  .vx-tape{position:absolute;width:150px;height:38px;background:rgba(222,198,148,.78);box-shadow:0 1px 2px rgba(60,40,20,.16);z-index:6;
    background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.12) 0 6px,transparent 6px 14px);
    clip-path:polygon(0 10%,3% 0,7% 12%,11% 0,89% 0,93% 12%,97% 0,100% 10%,100% 90%,97% 100%,93% 88%,89% 100%,11% 100%,7% 88%,3% 100%,0 90%)}
  .vx-pin{position:absolute;width:24px;height:24px;border-radius:50%;z-index:8;margin:-12px 0 0 -12px;
    background:radial-gradient(circle at 32% 32%,#FFE8A3 0%,#D49B38 55%,#7D5212 100%);box-shadow:0 7px 10px rgba(42,24,8,.42),inset 0 1px 2px rgba(255,255,255,.8)}
  .vx-pin.red{background:radial-gradient(circle at 32% 32%,#FF8A9E 0%,#E02848 58%,#7A0C20 100%)}
  .vx-prop{position:absolute;z-index:5;filter:drop-shadow(0 7px 6px rgba(46,30,12,.26))}
  .vx-prop svg,.vx-pen svg{display:block;overflow:visible}
  .vx-pen{position:absolute;z-index:7;pointer-events:none}
  .vx-strings{position:absolute;left:0;top:0;overflow:visible;z-index:4;pointer-events:none}
  .vx-stamp{position:absolute;border:5px solid var(--vx-red);border-radius:8px;color:var(--vx-red);padding:6px 20px 8px;font-weight:900;text-align:center;line-height:1.05;white-space:nowrap;mix-blend-mode:multiply;z-index:9;letter-spacing:.04em;
    box-shadow:inset 0 0 0 3px rgba(217,43,75,.0);-webkit-mask-image:${GRAIN};mask-image:${GRAIN}}
  .vx-stamp::after{content:'';position:absolute;inset:4px;border:1.5px solid var(--vx-red);border-radius:4px;opacity:.7}
  .vx-stamp small{display:block;font-family:var(--vx-font-mono);font-size:.34em;letter-spacing:.22em;margin-top:5px}
  .vx-stamp.solid{mix-blend-mode:normal;background:var(--vx-paper)}
  .vx-mono{font-family:var(--vx-font-mono)}
  /* cover */
  .vx-cv-sheet{left:60px;top:170px;width:900px;height:480px;padding:34px 40px 0 64px}
  .vx-cv-sheet .hd{font-family:var(--vx-font-mono);font-size:18px;font-weight:800;letter-spacing:.2em;color:var(--vx-muted);display:flex;justify-content:space-between;border-bottom:2.5px solid var(--vx-ink);padding-bottom:12px}
  .vx-cv-title{margin-top:30px;font-size:128px;font-weight:900;line-height:1.1;letter-spacing:-.01em;white-space:nowrap}
  .vx-cv-title .ln{display:block}
  .vx-polar{position:absolute;background:#FFFDF6;padding:16px 16px 0;box-sizing:border-box;box-shadow:var(--vx-shadow-lg);border-radius:2px}
  .vx-polar .ph{position:relative;background:var(--vx-ink);overflow:hidden}
  .vx-polar .cap{font-family:var(--vx-font-mono);font-weight:800;letter-spacing:.16em;color:var(--vx-muted);text-align:center}
  .vx-cv-pol{left:1000px;top:190px;width:300px;height:370px}
  .vx-cv-pol .ph{height:256px}
  .vx-cv-pol .l{position:absolute;left:18px;top:16px;font-family:var(--vx-font-mono);font-size:18px;font-weight:800;letter-spacing:.2em;color:#FFE499}
  .vx-cv-pol .n{position:absolute;left:0;right:0;bottom:-6px;text-align:center;font-family:var(--vx-font-num);font-size:190px;font-weight:700;line-height:1;color:var(--vx-yellow)}
  .vx-cv-pol .cap{font-size:18px;padding-top:24px}
  .vx-cv-sub{left:100px;top:690px;width:580px;padding:30px 34px;font-size:40px;font-weight:900;line-height:1.36;white-space:nowrap}
  .vx-cv-dim{left:740px;top:706px;width:560px;height:120px;padding:24px 30px 0}
  .vx-cv-dim .t{font-size:36px;font-weight:900;white-space:nowrap}
  /* stat */
  .vx-stat{top:300px;height:430px;padding:28px 30px 0}
  .vx-stat .lb{font-family:var(--vx-font-mono);font-size:20px;font-weight:800;letter-spacing:.12em;color:var(--vx-muted);white-space:nowrap;border-bottom:2px solid rgba(35,28,21,.16);padding-bottom:12px}
  .vx-stat .num{margin-top:20px;font-family:var(--vx-font-num);font-weight:700;letter-spacing:-.03em;line-height:1;white-space:nowrap;color:var(--vx-ink);display:inline-block;position:relative}
  .vx-stat .num .u,.vx-stat .num .pf{font-family:var(--vx-font-cn);font-weight:900;font-size:.26em;letter-spacing:0;margin-left:.15em;vertical-align:.25em}
  .vx-stat .num .pf{margin:0 .1em 0 0}
  .vx-stat .bar{position:absolute;left:30px;right:30px;bottom:46px;height:26px;background:rgba(35,28,21,.07);border-radius:3px}
  .vx-stat .bar i{position:absolute;left:0;top:-3px;bottom:-3px;background:var(--vx-yellow);transform-origin:left center;border-radius:2px 8px 3px 6px;box-shadow:inset 0 -5px 0 rgba(214,170,0,.35)}
  .vx-stat.hot .bar i{background:var(--vx-red);box-shadow:inset 0 -5px 0 rgba(120,10,30,.3)}
  .vx-stat .sc{position:absolute;right:30px;bottom:12px;font-family:var(--vx-font-mono);font-size:16px;font-weight:800;color:var(--vx-muted)}
  .vx-note{left:60px;top:780px;padding:20px 28px;font-size:28px;font-weight:900;white-space:nowrap}
  .vx-note small{display:block;font-family:var(--vx-font-mono);font-size:15px;letter-spacing:.16em;color:#9E620A;margin-bottom:6px}
  /* steps */
  .vx-st-card{top:340px;height:300px;padding:16px 20px 0}
  .vx-st-card .no{font-family:var(--vx-font-mono);font-size:20px;font-weight:900;color:var(--vx-red);letter-spacing:.1em;height:44px}
  .vx-st-card .nm{font-size:46px;font-weight:900;margin-top:16px;line-height:1.08;white-space:nowrap}
  .vx-st-card .fn{font-family:var(--vx-font-mono);font-size:18px;font-weight:700;color:var(--vx-muted);margin-top:14px;line-height:1.4;white-space:nowrap}
  .vx-folder{position:absolute;left:100px;top:716px;width:1200px;height:210px}
  .vx-folder .tb{position:absolute;left:0;top:-42px;width:380px;height:50px;background:#D9B675;border-radius:8px 8px 0 0;padding:12px 22px;box-sizing:border-box;font-family:var(--vx-font-mono);font-size:19px;font-weight:800;letter-spacing:.08em;color:var(--vx-ink);white-space:nowrap;overflow:hidden}
  .vx-folder .bd{position:absolute;inset:0;background:linear-gradient(180deg,#E6CB94 0%,#DDBE80 100%);border-radius:0 8px 8px 8px;box-shadow:var(--vx-shadow-lg);border:1.5px solid rgba(120,82,30,.3)}
  .vx-folder .big{position:absolute;left:36px;bottom:20px;font-family:var(--vx-font-num);font-size:150px;font-weight:700;letter-spacing:-.03em;line-height:.8;color:rgba(35,28,21,.86);white-space:nowrap}
  .vx-folder .meta{position:absolute;right:300px;bottom:30px;text-align:right;font-family:var(--vx-font-mono);font-size:18px;font-weight:800;line-height:1.6;color:rgba(35,28,21,.75)}
  .vx-penlabel{position:absolute;font-family:var(--vx-font-mono);font-size:26px;font-weight:900;letter-spacing:.1em;color:var(--vx-red);white-space:nowrap}
  /* checklist */
  .vx-doc{left:250px;top:100px;width:840px}
  .vx-doc .hd{position:absolute;left:84px;top:50px;right:50px;font-family:var(--vx-font-mono);font-size:18px;font-weight:800;letter-spacing:.2em;color:var(--vx-muted);white-space:nowrap;display:flex;justify-content:space-between}
  .vx-doc .hd b{color:var(--vx-red)}
  .vx-doc .ttl{position:absolute;left:80px;top:90px;font-family:var(--vx-font-num);font-size:108px;font-weight:700;letter-spacing:-.02em;line-height:1;white-space:nowrap}
  .vx-doc .sub{position:absolute;left:84px;top:222px;font-size:38px;font-weight:900;white-space:nowrap}
  .vx-doc .hr{position:absolute;left:84px;right:56px;top:300px;height:3px;background:var(--vx-ink)}
  .vx-rl{position:absolute;left:84px;right:50px;height:112px;border-bottom:1.5px dashed rgba(35,28,21,.2)}
  .vx-rl .box{position:absolute;left:0;top:24px;width:46px;height:46px;border:3.5px solid var(--vx-ink);border-radius:4px;box-sizing:border-box;transform:rotate(-2deg)}
  .vx-rl .vx-pen{left:-4px;top:4px}
  .vx-rl .k{position:absolute;left:76px;top:14px;font-size:42px;font-weight:900;white-space:nowrap}
  .vx-rl .d{position:absolute;left:78px;top:68px;font-family:var(--vx-font-serif);font-size:25px;font-weight:700;color:var(--vx-muted);white-space:nowrap}
  .vx-rl .n{position:absolute;right:0;top:24px;font-family:var(--vx-font-mono);font-size:18px;font-weight:800;color:var(--vx-muted)}
  .vx-dnote{position:absolute;left:84px;font-size:44px;font-weight:900;white-space:nowrap}
  .vx-dnote small{display:block;font-family:var(--vx-font-mono);font-size:18px;color:var(--vx-muted);letter-spacing:.16em;margin-bottom:8px}
  /* compare */
  .vx-cmp{top:290px;width:520px;height:440px;padding:0}
  .vx-cmp .band{margin:24px 0 0 56px;display:inline-block;padding:7px 14px;border-radius:4px;background:var(--vx-ink);color:#FFE499;font-family:var(--vx-font-mono);font-size:18px;font-weight:800;letter-spacing:.14em;white-space:nowrap}
  .vx-cmp.wrong{background:#F2EDE2;filter:saturate(.75)}
  .vx-cmp.wrong .band{background:#8A7B69;color:#F7F1E4}
  .vx-cmp .t{position:absolute;left:56px;top:100px;font-size:58px;font-weight:900;line-height:1.16;white-space:nowrap}
  .vx-cmp .d{position:absolute;left:56px;right:34px;top:268px;font-family:var(--vx-font-serif);font-size:26px;font-weight:700;line-height:1.55;color:var(--vx-muted)}
  .vx-vs{position:absolute;left:640px;top:440px;width:120px;height:120px;border-radius:50%;background:var(--vx-ink);color:var(--vx-yellow);font-family:var(--vx-font-num);font-size:56px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:var(--vx-shadow);z-index:6}
  .vx-verdict{position:absolute;left:60px;top:790px;width:1280px;height:120px;background:var(--vx-ink);color:#FCF9F2;border-radius:6px;border-left:10px solid var(--vx-yellow);box-shadow:var(--vx-shadow-lg);display:flex;align-items:center;gap:26px;padding:0 36px;box-sizing:border-box}
  .vx-verdict b{font-family:var(--vx-font-mono);font-size:20px;letter-spacing:.2em;color:#FFE499;white-space:nowrap}
  .vx-verdict span{font-size:44px;font-weight:900;white-space:nowrap}
  .vx-verdict .vx-hl{color:var(--vx-ink)}
  /* showcase */
  .vx-panel{position:absolute;left:60px;top:262px;width:1240px;height:640px;box-shadow:var(--vx-shadow-lg);overflow:hidden;box-sizing:border-box}
  .vx-panel.dark{background:#141A21;color:#E8F0F8;border-radius:12px;border:2px solid rgba(255,255,255,.12)}
  .vx-panel.light{background:var(--vx-paper);color:var(--vx-ink);border-radius:6px;border:1.5px solid rgba(120,92,58,.22)}
  .vx-panel.photo{background:#FFFDF6;border-radius:2px;padding:20px 20px 64px}
  .vx-panel .bar{height:50px;display:flex;align-items:center;gap:9px;padding:0 20px;font-family:var(--vx-font-mono);font-size:16px;font-weight:800;letter-spacing:.08em}
  .vx-panel.dark .bar{background:#1E2731;border-bottom:1px solid rgba(255,255,255,.08);color:#B8C7D6}
  .vx-panel.light .bar{border-bottom:2.5px solid var(--vx-ink);margin:0 40px 0 64px;padding:0;color:var(--vx-ink)}
  .vx-panel.photo .bar{position:absolute;left:0;right:0;bottom:0;height:64px;justify-content:center;color:var(--vx-muted);letter-spacing:.2em}
  .vx-panel .bar i{width:13px;height:13px;border-radius:50%;display:inline-block}
  .vx-panel.light .bar i,.vx-panel.photo .bar i{display:none}
  .vx-panel .bar span{margin-left:10px}
  .vx-code{padding:24px 32px;font-family:var(--vx-font-mono);font-size:30px;line-height:1.62;white-space:pre}
  .vx-code .ln{display:inline-block;width:50px;color:#5E6E7E}
  .vx-code .c{color:#7F8C99}.vx-code .k{color:#FFE499}.vx-code .ok{color:#6BF2CB}
  .vx-panel.light .vx-code{padding:24px 40px 24px 64px;font-family:var(--vx-font-serif);font-size:32px;font-weight:700}
  .vx-panel.light .vx-code .ln{color:rgba(107,91,74,.55);font-family:var(--vx-font-mono);font-size:18px}
  .vx-panel.light .vx-code .k{color:var(--vx-red)}.vx-panel.light .vx-code .c{color:var(--vx-muted)}.vx-panel.light .vx-code .ok{color:#00876A}
  .vx-media{display:block;width:100%;height:100%;object-fit:cover;background:#111}
  .vx-callout{position:absolute;display:flex;align-items:center;gap:10px;z-index:8}
  .vx-callout b{position:relative;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 32% 32%,#FF8A9E 0%,#E02848 58%,#7A0C20 100%);color:#fff;font-family:var(--vx-font-num);font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 10px rgba(0,0,0,.35)}
  .vx-callout span{background:#1A222A;color:#FFFFFF;font-size:24px;font-weight:900;padding:9px 16px;border-radius:6px;border-left:5px solid var(--vx-yellow);box-shadow:0 16px 30px rgba(20,16,10,.32);white-space:nowrap}
  /* showcase · product */
  .vx-prod{position:absolute;left:0;right:0;top:50px;bottom:0}
  .vx-prod .pic{position:absolute;left:52px;top:34px;width:470px;height:500px;background:#FFFDF6;padding:16px 16px 56px;box-sizing:border-box;box-shadow:var(--vx-shadow);transform:rotate(-1.6deg)}
  .vx-prod .pic .in{width:100%;height:100%;background:var(--vx-desk);display:flex;align-items:center;justify-content:center;overflow:hidden}
  .vx-prod .pic .cap{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-family:var(--vx-font-mono);font-size:16px;font-weight:800;letter-spacing:.2em;color:var(--vx-muted)}
  .vx-prod .pic img{width:100%;height:100%;object-fit:contain}
  .vx-prod .pic svg{width:80%;height:auto;color:var(--vx-ink)}
  .vx-prod .info{position:absolute;left:580px;right:44px;top:36px}
  .vx-prod .nm{font-size:58px;font-weight:900;line-height:1.08;white-space:nowrap}
  .vx-prod .tg{font-family:var(--vx-font-serif);font-size:25px;font-weight:700;color:var(--vx-muted);margin-top:10px;white-space:nowrap}
  .vx-prod .specs{margin-top:22px;border-top:3px solid var(--vx-ink)}
  .vx-prod .row{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1.5px dashed rgba(35,28,21,.2);white-space:nowrap}
  .vx-prod .row .k{font-family:var(--vx-font-mono);font-size:19px;font-weight:800;color:var(--vx-muted);letter-spacing:.06em}
  .vx-prod .row .v{font-size:26px;font-weight:900}
  /* quote（屏幕层） */
  .vx-quote{position:absolute;top:220px;width:680px;padding:46px 48px 52px 52px;box-sizing:border-box;background:#F6F0E1;color:var(--vx-ink);
    box-shadow:0 2px 2px rgba(0,0,0,.2),0 34px 64px -10px rgba(0,0,0,.6);
    clip-path:polygon(0 2%,4% 0,9% 1.6%,15% .2%,22% 1.8%,30% .4%,38% 1.6%,47% 0,55% 1.4%,63% .2%,71% 1.8%,79% .3%,87% 1.6%,94% 0,100% 1.5%,100% 98%,95% 100%,89% 98.4%,82% 99.8%,74% 98.2%,66% 99.6%,58% 98.4%,49% 100%,41% 98.6%,33% 99.8%,25% 98.2%,17% 99.6%,9% 98.4%,3% 100%,0 98.5%)}
  .vx-quote .k{font-family:var(--vx-font-mono);font-size:18px;font-weight:900;letter-spacing:.2em;color:var(--vx-red);border-bottom:2.5px solid var(--vx-ink);padding-bottom:12px}
  .vx-quote .tx{font-size:60px;font-weight:900;line-height:1.26;margin-top:22px}
  .vx-quote .by{margin-top:24px;font-family:var(--vx-font-mono);font-size:18px;font-weight:800;color:var(--vx-muted);letter-spacing:.1em}
  /* outro */
  .vx-act{left:60px;width:560px;height:150px;padding:22px 30px 0 96px}
  .vx-act .no{font-family:var(--vx-font-mono);font-size:19px;font-weight:900;color:var(--vx-red);letter-spacing:.12em;height:30px}
  .vx-act .t{font-size:40px;font-weight:900;margin-top:4px;white-space:nowrap}
  .vx-act .d{font-family:var(--vx-font-serif);font-size:21px;font-weight:700;color:var(--vx-muted);margin-top:8px;white-space:nowrap}
  .vx-act .box{position:absolute;left:28px;top:50px;width:44px;height:44px;border:3.5px solid var(--vx-ink);border-radius:4px;box-sizing:border-box;transform:rotate(-3deg)}
  .vx-act .vx-pen{left:22px;top:30px}
  .vx-cta{position:absolute;left:690px;top:280px;width:650px;height:500px;background:var(--vx-ink);color:#FCF9F2;border-radius:10px;box-shadow:var(--vx-shadow-lg);padding:40px 44px;box-sizing:border-box;border-top:10px solid var(--vx-yellow)}
  .vx-cta .k{font-family:var(--vx-font-mono);font-size:19px;font-weight:900;letter-spacing:.2em;color:#FFE499}
  .vx-cta .t{font-size:62px;font-weight:900;margin-top:14px;line-height:1.1;white-space:nowrap}
  .vx-cta .repo{margin-top:24px;padding:14px 18px;background:#FCF9F2;color:var(--vx-ink);border-radius:4px;font-family:var(--vx-font-mono);font-size:25px;font-weight:800;white-space:nowrap;overflow:hidden;transform:rotate(-.6deg)}
  .vx-cta .btns{display:flex;gap:14px;margin-top:30px}
  .vx-cta .btns span{flex:1;text-align:center;padding:15px 0;background:#3A3027;color:#FCF9F2;border-radius:6px;font-size:30px;font-weight:900}
  .vx-cta .btns span:first-child{background:var(--vx-yellow);color:var(--vx-ink)}
  /* timeline */
  .vx-tl-node{width:240px;height:200px;padding:16px 20px;box-sizing:border-box}
  .vx-tl-node .tm{font-family:var(--vx-font-num);font-size:58px;font-weight:700;letter-spacing:-.02em;line-height:1;color:var(--vx-red);white-space:nowrap}
  .vx-tl-node .t{font-size:34px;font-weight:900;margin-top:20px;white-space:nowrap}
  .vx-tl-node .d{font-family:var(--vx-font-serif);font-size:19px;font-weight:700;color:var(--vx-muted);margin-top:6px;line-height:1.35}
  .vx-tl-node.now{background:linear-gradient(180deg,#FFF6B8 0%,#FCEA88 100%);border:1px solid rgba(180,136,36,.35)}
  .vx-tl-node.now .tm{color:var(--vx-ink)}
  .vx-tl-stem{position:absolute;width:0;border-left:2px dashed rgba(35,28,21,.55)}
  /* diagram */
  .vx-dg-node{width:260px;height:124px;padding:16px 20px 0 22px;transition:none}
  .vx-dg-node .l{font-size:36px;font-weight:900;white-space:nowrap}
  .vx-dg-node .s{font-family:var(--vx-font-mono);font-size:17px;font-weight:800;color:var(--vx-muted);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .vx-dg-node.hot{background:linear-gradient(180deg,#FFF0A0 0%,var(--vx-yellow) 100%);border-color:rgba(180,136,36,.5)}
  .vx-dg-node.hot .s{color:#5E4A20}
  .vx-dg-tagw{position:absolute;z-index:6;transform:translate(-50%,-50%)}
  .vx-dg-tag{padding:5px 12px;background:#FFFEF7;border:1.5px solid rgba(35,28,21,.55);border-radius:3px;font-family:var(--vx-font-mono);font-size:16px;font-weight:800;white-space:nowrap;box-shadow:0 6px 12px rgba(46,30,12,.18)}
  `;
  function injectCSS() {
    if (document.getElementById('vx-components-css')) return;
    const st = document.createElement('style'); st.id = 'vx-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  // 默认机位
  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  let SEQ = 0;
  /** 组件内红色丝线层（含暗色阴影线） */
  function stringsSvg(W, H, paths) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'vx-strings'); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = paths.map((d) => `<path class="sh" d="${d}" ${DRAW_ATTR} style="stroke:rgba(60,10,20,.22);stroke-width:5px" transform="translate(2 5)"/><path class="st" d="${d}" ${DRAW_ATTR} style="stroke:var(--vx-red);stroke-width:3.5px"/>`).join('');
    return svg;
  }
  const sag = (x0, y0, x1, y1, s = 30) => `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${((x0 + x1) / 2).toFixed(1)} ${(Math.max(y0, y1) + s).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;

  // ============================== 1. cover 案卷封面 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'vx-zone');
    const kick = tag(data.kicker || '', 'left:60px;top:104px;');
    const sheet = h('div', 'vx-paper bind vx-cv-sheet', null,
      `<div class="hd"><span>CASE FILE · No.${esc(data.chapter || '01')}</span><span>MUSHANHE DESK</span></div><div class="vx-cv-title">${markTitle(data.title).split('<br/>').map((l) => `<span class="ln">${l}</span>`).join('')}</div>`);
    const lines = Array.from(sheet.querySelectorAll('.ln'));
    const pol = h('div', 'vx-polar vx-cv-pol', null, `<div class="ph"><div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="n">${esc(data.chapter || '01')}</div></div><div class="cap">EXHIBIT · ${esc(data.chapter || '01')}</div>`);
    const polTape = tape('left:1075px;top:172px;');
    const sub = h('div', 'vx-sticky vx-cv-sub', null, mark(data.subtitle));
    const card = h('div', 'vx-card vx-cv-dim', null, `<div class="t">${esc(data.dim || '')}</div>`);
    const under = penUnder(470, 'left:770px;top:780px;');
    const st = stamp(data.stamp || '', data.stampSmall || '', 'left:1020px;top:836px;font-size:50px;');
    const pinA = pin('left:1150px;top:200px;', true), pinB = pin('left:1010px;top:724px;', true), pinC = pin('left:390px;top:700px;');
    const strings = stringsSvg(1400, 1100, [sag(1150, 200, 1010, 724, 60)]);
    el.append(prop('coffee', 240, 'left:820px;top:40px;z-index:0;filter:none;'), kick, sheet, pol, polTape, sub, card, under, strings, pinA, pinB, pinC, st,
      prop('pencil', 380, 'left:560px;top:950px;transform:rotate(-4deg);'));
    A.add(kick, 0.15, 0.35, { x: -30, o: 0 }, { x: 0, o: 1 });
    A.add(sheet, 0.2, 0.55, { y: -140, o: 0, r: -4, s: 1.05 }, { y: 0, o: 1, r: -1.0, s: 1 }, 'drop');
    lines.forEach((l, i) => A.add(l, 0.55 + i * 0.25, 0.4, { x: -30, o: 0 }, { x: 0, o: 1 }));
    const tH = sweep(A, sheet.querySelectorAll('.vx-hl'), 0.65 + lines.length * 0.25, 0.5);
    A.add(pol, Math.min(tH, 1.6), 0.5, { y: -220, x: 60, o: 0, r: 12 }, { y: 0, x: 0, o: 1, r: 3 }, 'drop');
    A.add(polTape, Math.min(tH, 1.6) + 0.45, 0.15, { o: 0, r: -6 }, { o: 1, r: -6 });
    A.add(pinA, Math.min(tH, 1.6) + 0.5, 0.2, { y: -40, o: 0 }, { y: 0, o: 1 });
    const tS = Math.min(tH + 0.3, 2.1);
    A.add(sub, tS, 0.45, { y: 160, o: 0, r: 6 }, { y: 0, o: 1, r: -2.5 }, 'drop');
    A.add(pinC, tS + 0.35, 0.2, { y: -40, o: 0 }, { y: 0, o: 1 });
    sweep(A, sub.querySelectorAll('.vx-hl'), tS + 0.5);
    A.add(card, tS + 0.4, 0.45, { x: 160, o: 0, r: 5 }, { x: 0, o: 1, r: 1.2 }, 'drop');
    A.add(pinB, tS + 0.75, 0.2, { y: -40, o: 0 }, { y: 0, o: 1 });
    draw(A, under.querySelectorAll('.vx-draw'), tS + 0.9, 0.45);
    draw(A, strings.querySelectorAll('path'), tS + 0.85, 0.6);
    A.add(st, Math.min(D - 1.1, tS + 1.6), 0.12, { s: 1.45, o: 0, r: -9 }, { s: 1, o: 1, r: -9 });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 540, 380, 1.3, 7, -3, -0.8), CAM(1.8, 700, 500, 1.0, 2.5, -1, 0), CAM(D, 712, 505, 1.04, 1.2, 0.6, 0)] };
  }

  // ============================== 2. steps 索引卡 + 红线串联 + 马尼拉文件夹 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'vx-zone');
    kickHead(el, A, data, 90);
    const dimL = h('div', 'vx-penlabel', 'left:102px;top:270px;', esc(data.dim || `${n} STEPS`));
    const dimU = penUnder(220, 'left:96px;top:300px;', 5);
    const gap = 30, sw = (1200 - gap * (n - 1)) / n;
    const pins = [], cards = items.map((it, i) => {
      const x = 100 + i * (sw + gap);
      const c = h('div', 'vx-card vx-st-card', `left:${x}px;width:${sw}px;`,
        `<div class="no">${esc(it.no || `STEP ${String(i + 1).padStart(2, '0')}`)}</div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div>`);
      pins.push({ x: x + sw / 2, y: 352 });
      return c;
    });
    const pinEls = pins.map((p, i) => pin(`left:${p.x}px;top:${p.y}px;`, i === n - 1));
    const segs = pins.slice(1).map((p, i) => sag(pins[i].x, pins[i].y, p.x, p.y, 34));
    const strings = stringsSvg(1400, 1100, segs);
    const folder = h('div', 'vx-folder', null, `<div class="tb">${esc(data.folder || 'PROJECT /')}</div><div class="bd"></div><div class="big">${esc(data.folderBig || '')}</div><div class="meta">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`);
    const label = data.label ? stamp(data.label, data.labelSmall || '', 'left:1036px;top:756px;font-size:40px;') : null;
    el.append(dimL, dimU, folder, ...cards, strings, ...pinEls, prop('clip', 0, 'left:1270px;top:660px;transform:rotate(12deg);'), prop('magnifier', 150, 'left:1180px;top:110px;transform:rotate(-10deg);'));
    if (label) { label.classList.add('solid'); label.style.background = 'transparent'; label.style.mixBlendMode = 'multiply'; el.appendChild(label); }
    A.add(dimL, 0.9, 0.3, { o: 0 }, { o: 1 });
    draw(A, dimU.querySelectorAll('.vx-draw'), 1.0, 0.4);
    A.add(folder, 0.3, 0.55, { y: 200, o: 0, r: 2 }, { y: 0, o: 1, r: -0.4 }, 'drop');
    const t0 = 1.2, t1 = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const segEls = Array.from(strings.querySelectorAll('path'));
    cards.forEach((c, i) => {
      const at = t0 + i * stp;
      A.add(c, at, 0.42, { y: -160, r: 0, o: 0 }, { o: 1, y: 0, r: [-2, 1.5, -1, 2, -1.5][i] }, 'back');
      A.add(pinEls[i], at + 0.3, 0.18, { y: -40, o: 0 }, { y: 0, o: 1 });
      if (i > 0) draw(A, segEls.slice((i - 1) * 2, i * 2), at + 0.2, 0.4);
    });
    if (label) A.add(label, D - 1.2, 0.12, { s: 1.45, o: 0, r: -6 }, { s: 1, o: 1, r: -6 });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 640, 1.2, 5, -2, -0.4), CAM(1.3, 700, 505, 1.0, 2, -1, 0), CAM(D, 705, 510, 1.04, 1, 0.6, 0)] };
  }

  // ============================== 3. checklist 打字稿逐条红笔打勾 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const H = 340 + n * 112 + (data.note ? 190 : 60);
    const el = h('div', 'vx-zone');
    const doc = h('div', 'vx-paper bind vx-doc', `height:${H}px;`,
      `<div class="hd"><span>${esc(data.kicker || '')}</span><b>● REVIEWED</b></div><div class="ttl">${esc(data.title)}</div><div class="sub">${mark(data.subtitle || '')}</div><div class="hr"></div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'vx-rl', `top:${330 + i * 112}px;`,
        `<div class="box"></div><div class="k"><span class="vx-hl">${esc(it.k)}</span></div><div class="d">${esc(it.d || '')}</div><div class="n">§${String(i + 1).padStart(2, '0')}</div>`);
      r.appendChild(penCheck(60, null, 7)); doc.appendChild(r); return r;
    });
    let note = null;
    if (data.note) {
      note = h('div', 'vx-dnote', `top:${330 + n * 112 + 40}px;`, `<small>${esc(data.noteLead || '')}</small><span class="vx-hl">${esc(data.note)}</span>`);
      doc.appendChild(note);
    }
    const subHl = doc.querySelectorAll('.sub .vx-hl');
    el.append(doc, pin('left:670px;top:118px;', true), prop('clip', 0, 'left:1050px;top:66px;transform:rotate(8deg);'),
      prop('pencil', 320, 'left:20px;top:600px;transform:rotate(78deg);'), prop('magnifier', 170, 'left:1130px;top:660px;transform:rotate(-14deg);'),
      prop('coffee', 220, 'left:1110px;top:250px;z-index:0;filter:none;'));
    A.add(doc, -1, 0.01, { o: 0, y: -700 }, { o: 0, y: -700 });
    A.add(doc, 0, 0.6, { y: -700, r: 2.5, o: 1 }, { y: 0, r: -0.5, o: 1 }, 'out');
    sweep(A, subHl, 0.75);
    const t0 = 1.2, t1 = Math.max(t0 + 0.4, D - (note ? 2.4 : 1.2)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    rows.forEach((r, i) => {
      const at = t0 + i * stp;
      A.add(r, at, 0.3, { o: 0.2, x: -16 }, { o: 1, x: 0 });
      draw(A, r.querySelectorAll('.vx-draw'), at + 0.12, 0.28, 'out');
      sweep(A, r.querySelectorAll('.vx-hl'), at + 0.3, 0.35);
    });
    if (note) { A.add(note, D - 2.0, 0.3, { o: 0 }, { o: 1 }); sweep(A, note.querySelectorAll('.vx-hl'), D - 1.6, 0.6); }
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1010);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 500, 1.0, 2, -1.5, 0), CAM(1.0, 700, 500, 1.02, 1.5, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.02, 1, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.8, 0, 0), CAM(D, 700, scanY, 1.0, 0.5, 0, 0)] };
  }

  // ============================== 4. compare 红笔打叉 vs 黄笔圈定 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'vx-zone');
    kickHead(el, A, data, 90);
    const L = h('div', 'vx-paper vx-cmp wrong', 'left:60px;', `<div class="band">${esc(w.label || '✕ WRONG')}</div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div>`);
    const R = h('div', 'vx-paper bind vx-cmp', 'left:820px;', `<div class="band">${esc(r.label || '✓ RIGHT')}</div><div class="t"><span class="vx-hl">${esc(r.title).replace(/\n/g, '</span><br/><span class="vx-hl">')}</span></div><div class="d">${esc(r.desc || '')}</div>`);
    const cross = penCross(440, 300, 'left:100px;top:360px;', 11);
    const xs = stamp(w.stamp || '✕', '', 'left:300px;top:640px;font-size:44px;');
    const ring = penLoop(420, 200, 3, 'left:848px;top:372px;', 6);
    const ck = penCheck(90, 'left:1236px;top:300px;', 10);
    const vs = h('div', 'vx-vs', null, 'VS');
    const pinL = pin('left:320px;top:300px;'), pinR = pin('left:1080px;top:300px;', true);
    const verdict = h('div', 'vx-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span>`);
    const marker = prop('marker', 240, 'left:0px;top:0px;');
    el.append(L, R, cross, xs, ring, ck, vs, pinL, pinR, verdict, marker, prop('coffee', 200, 'left:560px;top:250px;z-index:0;filter:none;'));
    A.add(L, 0.6, 0.45, { y: 140, o: 0, r: -6 }, { y: 0, o: 1, r: -1.8 }, 'drop');
    A.add(pinL, 0.95, 0.2, { y: -50, o: 0 }, { y: 0, o: 1 });
    const tX = Math.min(D * 0.3, 1.9);
    draw(A, cross.querySelectorAll('.vx-draw')[0], tX, 0.32);
    draw(A, cross.querySelectorAll('.vx-draw')[1], tX + 0.32, 0.32);
    A.add(marker, tX - 0.2, 0.2, { x: 120, y: 420, r: -32, o: 0 }, { x: 120, y: 420, r: -32, o: 1 });
    A.add(marker, tX, 0.32, { x: 120, y: 420, r: -32, o: 1 }, { x: 520, y: 640, r: -32, o: 1 }, 'inOut');
    A.add(marker, tX + 0.32, 0.32, { x: 520, y: 400, r: -32, o: 1 }, { x: 120, y: 650, r: -32, o: 1 }, 'inOut');
    A.add(marker, tX + 0.7, 0.35, { x: 120, y: 650, r: -32, o: 1 }, { x: -60, y: 900, r: -50, o: 0 }, 'in');
    A.add(xs, tX + 0.75, 0.12, { s: 1.4, o: 0, r: -10 }, { s: 1, o: 1, r: -10 });
    A.add(vs, tX + 0.3, 0.35, { s: 1.6, o: 0 }, { s: 1, o: 1, r: -6 }, 'back');
    const tR = Math.min(D * 0.5, tX + 1.2);
    A.add(R, tR, 0.45, { y: 140, o: 0, r: 5 }, { y: 0, o: 1, r: 1 }, 'drop');
    A.add(pinR, tR + 0.35, 0.2, { y: -50, o: 0 }, { y: 0, o: 1 });
    const tH = sweep(A, R.querySelectorAll('.vx-hl'), tR + 0.5, 0.36);
    draw(A, ring.querySelectorAll('.vx-draw'), tH, 0.5);
    draw(A, ck.querySelectorAll('.vx-draw'), tH + 0.4, 0.3, 'out');
    const tV = Math.min(D - 1.4, tR + 1.3);
    A.add(verdict, tV, 0.45, { y: 140, o: 0, r: 1.5 }, { y: 0, o: 1, r: -0.5 }, 'drop');
    sweep(A, verdict.querySelectorAll('.vx-hl'), tV + 0.45, 0.5);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.1, 3, -2, 0), CAM(1.0, 700, 500, 1.0, 2, -1, 0), CAM(D, 700, 510, 1.02, 1, 1, 0)] };
  }

  // ============================== 5. showcase 终端 / 文档 / 宝丽来 / 产品档案 ==============================
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'vx-zone');
    kickHead(el, A, data, 80);
    const dark = kind === 'code' || kind === 'terminal';
    const photo = (kind === 'image' || kind === 'video') && data.src;
    const panel = h('div', `vx-panel ${dark ? 'dark' : photo ? 'photo' : 'light'}`, null,
      `<div class="bar"><i style="background:#FF5F56"></i><i style="background:#FFBD2E"></i><i style="background:#27C93F"></i><span>${esc(data.file || kind.toUpperCase())}</span></div>`);
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'vx-media'); media.src = data.src; panel.insertBefore(media, panel.firstChild); }
    else if (kind === 'video' && data.src) { media = h('video', 'vx-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.insertBefore(media, panel.firstChild); }
    else { codeEl = h('div', 'vx-code'); panel.appendChild(codeEl); }
    if (!dark && !photo) panel.classList.add('bind');
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const p = h('div', 'vx-callout', `left:${(nt.at && nt.at[0]) || 60}%;top:${(nt.at && nt.at[1]) || 30 + i * 20}%;`, `<b>${i + 1}</b><span>${esc(nt.text)}</span>`);
      panel.appendChild(p); return p;
    });
    el.append(panel, tape('left:20px;top:240px;transform:rotate(-12deg);'), tape('left:1210px;top:240px;transform:rotate(10deg);'),
      prop('clip', 0, kind === 'product' ? 'left:28px;top:600px;transform:rotate(-8deg);' : 'left:1250px;top:620px;transform:rotate(-8deg);'),
      prop('pencil', 300, 'left:360px;top:930px;transform:rotate(3deg);'));
    A.add(panel, 0.3, 0.55, { y: 200, o: 0, r: -3, s: 0.94 }, { y: 0, o: 1, r: -0.6, s: 1 }, 'drop');
    const tType0 = 0.9, tType1 = Math.max(tType0 + 0.6, D * 0.62);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.8 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.32, { s: 0.4, o: 0, y: -20 }, { s: 1, o: 1, y: 0 }, 'back'));
    if (prod) {
      A.add(prod.pic, 0.7, 0.5, { s: 0.9, o: 0, r: -6 }, { s: 1, o: 1, r: 0 }, 'back');
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.28, 0.3, { x: 40, o: 0 }, { x: 0, o: 1 }));
      sweep(A, prod.el.querySelectorAll('.nm .vx-hl'), 1.0, 0.45);
      sweep(A, prod.el.querySelectorAll('.row .vx-hl'), 1.3 + prod.rows.length * 0.28, 0.25, 0.08);
      if (prod.price) A.add(prod.price, Math.min(D - 1.2, 1.5 + prod.rows.length * 0.6), 0.12, { s: 1.4, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
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
      cams: [CAM(0, 700, 560, 0.94, 3, -1, 0), CAM(1.2, 700, 520, 1.0, 1.5, -1.5, 0), CAM(D, 720, 540, 1.05, 1, 1, 0)] };
  }

  /** showcase kind:"product" —— 左宝丽来产品照（无 src 用设备线稿占位）+ 右打字规格表（数值逐行黄笔）+ 价格红章 */
  function productPanel(data) {
    const el = h('div', 'vx-prod');
    const pic = h('div', 'pic', null, `<div class="in"></div><div class="cap">${esc(data.picLabel || 'EXHIBIT · PRODUCT')}</div>`);
    if (data.src) { const im = h('img'); im.src = data.src; pic.firstChild.appendChild(im); } else pic.firstChild.innerHTML = PROPS.device('var(--vx-red)');
    const info = h('div', 'info', null, `<div class="nm"><span class="vx-hl">${esc(data.name || '')}</span></div><div class="tg">${esc(data.tagline || '')}</div>`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v"><span class="vx-hl">${esc(sp.v)}</span></span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? stamp(data.price, data.priceSmall || '', 'right:52px;bottom:34px;font-size:48px;') : null;
    if (price) { price.classList.add('solid'); el.appendChild(price); }
    return { el, pic, rows, price };
  }

  // ============================== 6. quote 全屏人像 + 剪报金句（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'vx-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const card = h('div', 'vx-quote', right ? 'right:80px;' : 'left:80px;',
      `<div class="k">${esc(data.kicker || 'QUOTE')}</div><div class="tx">${mark(data.text)}</div><div class="by">${esc(data.by || '')}</div>`);
    const tp = tape(`left:${right ? 1920 - 80 - 680 + 260 : 340}px;top:200px;transform:rotate(-4deg);`);
    const tp2 = tape(`left:${right ? 1920 - 80 - 40 - 120 : 80 + 680 - 110}px;top:${data.stampTop ? 236 : 236}px;width:110px;transform:rotate(38deg);`);
    const st = stamp(data.stamp || '', data.stampSmall || '', `${right ? 'right:120px;' : 'left:440px;'}top:${data.stampTop || 640}px;font-size:54px;`);
    st.classList.add('solid');
    el.append(card, tp, tp2, st);
    A.add(card, 0.5, 0.5, { x: right ? 120 : -120, o: 0, r: right ? 5 : -5 }, { x: 0, o: 1, r: right ? 1.2 : -1.2 }, 'drop');
    A.add(tp, 0.95, 0.15, { o: 0 }, { o: 1, r: -4 });
    A.add(tp2, 1.0, 0.15, { o: 0 }, { o: 1, r: 38 });
    sweep(A, card.querySelectorAll('.vx-hl'), 1.15, 0.5);
    A.add(st, Math.min(D - 1.0, D * 0.55), 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 7. outro 行动索引卡 + CASE CLOSED 结尾卡 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'vx-zone');
    kickHead(el, A, data, 90);
    const acts = (data.actions || []).slice(0, 3).map((a, i) => {
      const e = h('div', 'vx-card vx-act', `top:${280 + i * 172}px;`, `<div class="box"></div><div class="no">${String(i + 1).padStart(2, '0')} / ${esc(a.tag || 'ACTION')}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div>`);
      e.appendChild(penCheck(58, null, 7));
      return e;
    });
    const pins = acts.map((_, i) => pin(`left:340px;top:${290 + i * 172}px;`, i === 0));
    const c = data.cta || {};
    const cta = h('div', 'vx-cta', null, `<div class="k">${esc(c.kicker || 'OPEN SOURCE')} · CASE CLOSED</div><div class="t">${mark(c.title || '')}</div><div class="repo">${esc(c.repo || '')}</div><div class="btns">${(c.buttons || []).slice(0, 3).map((b) => `<span>${esc(b)}</span>`).join('')}</div>`);
    const go = stamp(c.stamp || 'GO', c.stampSmall || '', 'left:1110px;top:700px;font-size:62px;');
    go.classList.add('solid');
    const ctaTape = tape('left:940px;top:262px;');
    el.append(...acts, ...pins, cta, go, ctaTape, prop('magnifier', 150, 'left:1180px;top:110px;transform:rotate(-8deg);'));
    const t0 = 0.7, stp = Math.min(0.7, (D * 0.4) / Math.max(1, acts.length));
    acts.forEach((a, i) => {
      A.add(a, t0 + i * stp, 0.42, { x: -160, o: 0, r: -4 }, { x: 0, o: 1, r: [-1.2, 0.8, -0.6][i] }, 'drop');
      A.add(pins[i], t0 + i * stp + 0.3, 0.2, { y: -50, o: 0 }, { y: 0, o: 1 });
      draw(A, a.querySelectorAll('.vx-draw'), t0 + i * stp + 0.45, 0.28, 'out');
    });
    const tC = t0 + acts.length * stp + 0.1;
    A.add(cta, tC, 0.5, { y: 160, o: 0, r: 4, s: 0.95 }, { y: 0, o: 1, r: 0.8, s: 1 }, 'drop');
    A.add(ctaTape, tC + 0.45, 0.15, { o: 0, r: -6 }, { o: 1, r: -6 });
    sweep(A, cta.querySelectorAll('.vx-hl'), tC + 0.55, 0.45);
    A.add(go, Math.min(D - 0.9, tC + 1.2), 0.12, { s: 1.5, o: 0, r: -10 }, { s: 1, o: 1, r: -10 });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.08, 3, -2, 0), CAM(1.2, 700, 500, 1.0, 1.5, -0.5, 0), CAM(D, 700, 500, 0.98, 0.8, 0.5, 0)] };
  }

  // ============================== 共用：数字格式 / 连线几何 ==============================
  function decOf(v) { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; }
  function fmtNum(v, dec) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
  /** 节点盒 a→b 的连线：按主方向取左右 / 上下锚点，返回三次贝塞尔（带一点丝线下垂） */
  function linkGeom(a, b, NW, NH) {
    const ax = a.x + NW / 2, ay = a.y + NH / 2, bx = b.x + NW / 2, by = b.y + NH / 2, dx = bx - ax, dy = by - ay;
    let p0, p1, c1, c2;
    if (Math.abs(dx) * NH >= Math.abs(dy) * NW) {
      const sx = Math.sign(dx) || 1; p0 = { x: ax + sx * NW / 2, y: ay }; p1 = { x: bx - sx * (NW / 2 + 16), y: by };
      const mx = (p0.x + p1.x) / 2; c1 = { x: mx, y: p0.y + 26 }; c2 = { x: mx, y: p1.y + 26 };
    } else {
      const sy = Math.sign(dy) || 1; p0 = { x: ax, y: ay + sy * NH / 2 }; p1 = { x: bx, y: by - sy * (NH / 2 + 16) };
      const my = (p0.y + p1.y) / 2; c1 = { x: p0.x + 22, y: my }; c2 = { x: p1.x + 22, y: my };
    }
    return { p0, p1, c1, c2, mid: bez(p0, c1, c2, p1, 0.5), d: `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}` };
  }
  /** 把大数字字号收进卡片可用宽度（首帧按终值测量一次） */
  function fitNums(nums, finals, avail) {
    nums.forEach((nEl, i) => {
      const b = nEl.querySelector('b'), keep = b.textContent; b.textContent = finals[i];
      const w = nEl.scrollWidth; if (w > avail) nEl.style.fontSize = `${Math.floor(parseFloat(nEl.style.fontSize) * avail / w)}px`;
      b.textContent = keep;
    });
  }

  // ============================== 8. stat 报告纸大数字 + 荧光比例条 + 红圈 ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'vx-zone');
    kickHead(el, A, data, 90);
    const gap = 40, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 250 : n === 2 ? 180 : 132;
    const cards = items.map((it, i) => h('div', `vx-paper vx-stat${i === n - 1 ? ' hot' : ''}`, `left:${60 + i * (w + gap)}px;width:${w}px;`,
      `<div class="lb">${esc(it.label || '')}</div><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div><div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div>`));
    const nums = cards.map((c) => c.querySelector('.num'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const hotX = 60 + (n - 1) * (w + gap);
    const ring = penLoop(Math.min(w - 10, 560), fs + 60, 5, `left:${hotX + 4}px;top:${300 + 52}px;`, 6);
    const st = data.delta ? stamp(data.delta, data.deltaSmall || '', 'left:990px;top:780px;font-size:56px;') : null;
    const note = data.note ? h('div', 'vx-sticky vx-note', null, `<small>FIELD NOTE · 实测</small>${esc(data.note)}`) : null;
    el.append(...cards, ring, pin(`left:${60 + w / 2}px;top:312px;`), pin(`left:${hotX + w / 2}px;top:312px;`, true),
      prop('magnifier', 150, 'left:1180px;top:120px;transform:rotate(-12deg);'), prop('coffee', 210, 'left:640px;top:690px;z-index:0;filter:none;'));
    const noteTape = note ? tape('left:300px;top:766px;width:120px;') : null;
    if (note) el.append(note, noteTape);
    if (st) el.appendChild(st);
    const tIn = cards.map((_, i) => 0.6 + i * 0.55);
    cards.forEach((c, i) => {
      A.add(c, tIn[i], 0.45, { y: 140, o: 0, r: i % 2 ? 3 : -3 }, { y: 0, o: 1, r: [-0.8, 0.6, -0.5][i] }, 'drop');
      A.add(c.querySelector('.bar i'), tIn[i] + 1.1, 0.6, { sx: 0 }, { sx: 1 }, 'inOut');
    });
    draw(A, ring.querySelectorAll('.vx-draw'), tIn[n - 1] + 1.5, 0.5);
    if (note) { A.add(note, D - 2.6, 0.4, { y: 80, o: 0, r: 4 }, { y: 0, o: 1, r: -1.5 }, 'drop'); A.add(noteTape, D - 2.2, 0.15, { o: 0, r: -6 }, { o: 1, r: -6 }); }
    if (st) A.add(st, Math.min(D - 1.2, tIn[n - 1] + 2.1), 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 60); fitted = true; }
      items.forEach((it, i) => { nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.2) / 1.2)), decs[i]); });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.1, 3, -2, 0), CAM(1.2, 700, 505, 1.0, 1.5, -1, 0), CAM(D, 705, 505, 1.04, 1, 0.8, 0)] };
  }

  // ============================== 9. timeline 红丝线时间轴（长轴横向跟拍） ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'vx-zone', `width:${W}px;`);
    kickHead(el, A, data, 90);
    const SY = 562, xs = nodes.map((_, i) => 60 + i * SP + 40);
    const xS = 30, xE = Math.min(W - 30, xs[n - 1] + 140);
    let d = `M${xS} ${SY}`, prev = xS;
    xs.concat([xE]).forEach((x) => { d += ` Q${((prev + x) / 2).toFixed(1)} ${SY + 22} ${x.toFixed(1)} ${SY}`; prev = x; });
    const strings = stringsSvg(W, 1100, [d]);
    el.append(strings, pin(`left:${xS}px;top:${SY}px;`), pin(`left:${xE}px;top:${SY}px;`));
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 290 : 642, at = t0 + i * stp;
      const card = h('div', `vx-card vx-tl-node${i === now ? ' now' : ''}`, `left:${x}px;top:${top}px;`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', 'vx-tl-stem', `left:${x + 40}px;top:${up ? 490 : SY}px;height:${up ? SY - 490 : 642 - SY}px;`);
      const pn = pin(`left:${x + 40}px;top:${SY}px;`, i === now);
      el.append(stem, card, pn);
      A.add(pn, at - 0.1, 0.22, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
      A.add(stem, at, 0.2, { o: 0 }, { o: 1 });
      A.add(card, at + 0.05, 0.4, { y: up ? -80 : 80, o: 0, r: up ? -3 : 3 }, { y: 0, o: 1, r: [-1, 0.8, -0.6, 1.1][i % 4] }, 'drop');
      return { x, up, top, at };
    });
    // 丝线进度：按节点出现时间分段线性，恰好在节点出现时拉到它的图钉
    const tk = [0.45].concat(parts.map((p) => p.at - 0.1), [parts[n - 1].at + 0.5]);
    const fk = [0].concat(xs.map((x) => (x - xS) / (xE - xS)), [1]);
    const segs = Array.from(strings.querySelectorAll('path'));
    A.fn((t) => {
      let f = 0;
      if (t >= tk[tk.length - 1]) f = 1;
      else for (let k = 0; k < tk.length - 1; k++) if (t >= tk[k] && t < tk[k + 1]) { f = fk[k] + (fk[k + 1] - fk[k]) * clamp01((t - tk[k]) / Math.max(0.01, tk[k + 1] - tk[k])); break; }
      segs.forEach((p) => { p.setAttribute('stroke-dashoffset', (1 - f).toFixed(4)); p.style.opacity = f > 0.001 ? '1' : '0'; });
    });
    if (parts[now]) {
      const p = parts[now];
      const ring = penLoop(300, 250, 7, `left:${p.x - 30}px;top:${p.top - 25}px;`, 6);
      el.appendChild(ring);
      draw(A, ring.querySelectorAll('.vx-draw'), Math.min(D - 1.2, p.at + 0.5), 0.5);
      if (data.nowLabel) {
        const ns = stamp(data.nowLabel, data.nowSmall || '', `left:${Math.min(W - 290, p.x + (p.up ? 10 : 110))}px;top:${p.up ? 620 : p.top + 196}px;font-size:36px;`);
        ns.classList.add('solid'); el.appendChild(ns);
        A.add(ns, Math.min(D - 0.9, p.at + 0.8), 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
      }
    }
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.06, 3, -2, 0), CAM(0.9, 700, 505, 1.0, 1.5, -1, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 505, 1.0, 1, 1, 0), CAM(D, endX + 6, 505, 1.02, 0.6, 1, 0)] };
  }

  // ============================== 10. diagram 侦探板：索引卡节点 + 红丝线 + 黄色脉冲 ==============================
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 290, AW = 1280, AH = 610, NW = 260, NH = 124;
    const el = h('div', 'vx-zone');
    kickHead(el, A, data, 90);
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = h('div', 'vx-card vx-dg-node', `left:${x}px;top:${y}px;`, `<div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      const p = pin(`left:${x + NW - 26}px;top:${y + 16}px;`, i % 2 === 1);
      el.append(e, p);
      A.add(e, appear[nd.id], 0.4, { s: 0.6, o: 0, r: -4 }, { s: 1, o: 1, r: [-1, 0.8, -0.5, 1][i % 4] }, 'back');
      A.add(p, appear[nd.id] + 0.3, 0.18, { y: -30, o: 0 }, { y: 0, o: 1 });
      return e;
    });
    const mid = `vxdg${++SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L12 6 L0 12 Z" style="fill:var(--vx-red)"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln sh" data-j="${j}" d="${g.d}" ${DRAW_ATTR} style="stroke:rgba(60,10,20,.2);stroke-width:5px" transform="translate(2 5)"/>`;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" ${DRAW_ATTR} style="stroke:var(--vx-red);stroke-width:4px" marker-end="url(#${mid})"/>`;
      inner += `<circle class="pl" data-j="${j}" data-k="0" r="8" style="fill:var(--vx-yellow);stroke:var(--vx-ink);stroke-width:2px" opacity="0"/><circle class="pl" data-j="${j}" data-k="1" r="8" style="fill:var(--vx-yellow);stroke:var(--vx-ink);stroke-width:2px" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'vx-strings'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.children[2] || null);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'vx-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'vx-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.4, 0.25, { s: 0.5, o: 0, r: -4 }, { s: 1, o: 1, r: [-2, 1.5, -1][j % 3] }, 'back');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0) {
      const p = pos[data.focus];
      const ring = penLoop(NW + 70, NH + 70, 9, `left:${p.x - 35}px;top:${p.y - 35}px;`, 6);
      el.appendChild(ring); draw(A, ring.querySelectorAll('.vx-draw'), tF, 0.45);
      if (data.focusLabel) {
        const st = stamp(data.focusLabel, data.focusSmall || '', `left:${Math.min(1130, p.x + 150)}px;top:${p.y - 64}px;font-size:32px;`);
        st.classList.add('solid'); el.appendChild(st);
        A.add(st, tF + 0.35, 0.12, { s: 1.45, o: 0, r: -8 }, { s: 1, o: 1, r: -8 });
      }
    }
    A.fn((t) => {
      lnEls.forEach((p) => { const k = EASE.inOut(clamp01((t - tDraw[+p.dataset.j]) / 0.5)); p.setAttribute('stroke-dashoffset', (1 - k).toFixed(4)); p.style.opacity = k > 0.002 ? '1' : '0'; });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.6;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.5 + (+r.dataset.k) * 0.5) % 1);
        r.setAttribute('opacity', '1'); r.setAttribute('cx', q.x.toFixed(1)); r.setAttribute('cy', q.y.toFixed(1));
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 560, 1.1, 3, -2, 0), CAM(1.2, 700, 515, 1.0, 1.5, -1, 0), CAM(D, 705, 515, 1.03, 1, 1, 0)] };
  }

  global.InvestigativeDesk = {
    version: '1.1.0',
    PROPS, Animator, EASE, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro },
      stat: { create: stat }, timeline: { create: timeline }, diagram: { create: diagram }
    }
  };
})(window);
