/**
 * Mushanhe Video Engine — 风格包 07 · 学院派黑板 / 粉笔手绘风（Chalkboard）
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print / 06_neobrutalism 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · stat · steps · checklist · compare · timeline · diagram · showcase[code|terminal|doc|image|video|product] · quote · outro
 *
 *   const comp = Chalkboard.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : { el, layer:'world'|'screen', avatar, cams:[{t,x,y,zoom,rx,ry,rz}], update(localT), w? }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：深墨绿磨砂黑板 #183028 · 粉笔白 #F4F4EE / 黄 #FFE066 / 天蓝 #74C0FC / 珊瑚粉 #FF8787
 *          · 所有边框 = 种子化微抖动手绘路径（双线 / 虚线），圆圈 / 大括号 / 箭头 / 打勾全部逐笔描出（pathLength 描边动画）
 *          · 楷体粉笔字 + 粉尘颗粒蒙版（宿主页对 3D 画布整体施加噪点 mask）· 原木黑板擦与彩色粉笔头实体道具。
 * 所有随机抖动由固定种子生成，组件创建顺序固定 → 任意 seek(t) 逐帧一致。
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
    /** 粉笔落板：轻微过冲后稳住 */
    soft: (x) => 1 - Math.pow(1 - x, 4)
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = (v) => (+v).toFixed(1);

  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let SEED = 7000;
  const RNG = () => mulberry32((SEED++) * 7919 + 17);

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
      this.fns.forEach((f) => f(t, 'pre'));
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
      this.fns.forEach((f) => f(t, 'post'));
    }
  }

  // ============================== 手绘粉笔几何（种子化微抖动） ==============================
  const G = {
    line(r, x1, y1, x2, y2, amp = 2.5) {
      const j = () => (r() - 0.5) * 2 * amp;
      const mx = (x1 + x2) / 2 + j() * 1.6, my = (y1 + y2) / 2 + j() * 1.6;
      return `M${f1(x1 + j())} ${f1(y1 + j())} Q${f1(mx)} ${f1(my)} ${f1(x2 + j())} ${f1(y2 + j())}`;
    },
    /** 一笔画完的手绘矩形（起笔微出头、收笔过冲） */
    rect(r, x, y, w, hh, amp = 3) {
      const j = () => (r() - 0.5) * 2 * amp;
      const P = [[x + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + hh + j()], [x + j(), y + hh + j()]];
      let d = `M${f1(P[0][0] - 7)} ${f1(P[0][1] + 1.5)}`;
      for (let i = 0; i < 4; i++) {
        const b = P[(i + 1) % 4], a = P[i];
        const mx = (a[0] + b[0]) / 2 + j() * 1.3, my = (a[1] + b[1]) / 2 + j() * 1.3;
        d += ` Q${f1(mx)} ${f1(my)} ${f1(b[0])} ${f1(b[1])}`;
      }
      d += ` L${f1(P[0][0] + 14)} ${f1(P[0][1] + j() * 0.6)}`;
      return d;
    },
    /** 手绘圆圈：转 1.1 圈、半径带低频起伏、首尾不闭合 */
    ellipse(r, cx, cy, rx, ry, turn = 1.12) {
      const a0 = -Math.PI * (0.55 + r() * 0.3), N = 84, p1 = r() * 6, p2 = r() * 6, drift = (r() - 0.5) * 0.12;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, a = a0 + u * Math.PI * 2 * turn;
        const k = 1 + 0.045 * Math.sin(a * 2 + p1) + 0.025 * Math.sin(a * 3 + p2) + (u - 0.5) * drift;
        pts.push(`${f1(cx + Math.cos(a) * rx * k)} ${f1(cy + Math.sin(a) * ry * k)}`);
      }
      return 'M' + pts.join(' L');
    },
    /** 手绘箭头：弯曲箭杆 + 两笔箭头 → [shaft, head] */
    arrow(r, x1, y1, x2, y2, bend = 0.18, head = 20) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const b = L * bend * (r() > 0.5 ? 1 : -1) * (0.7 + r() * 0.3);
      const cx = (x1 + x2) / 2 + nx * b, cy = (y1 + y2) / 2 + ny * b;
      const tx = x2 - cx, ty = y2 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const ang = 0.5, hx1 = x2 - head * (ux * Math.cos(ang) - uy * Math.sin(ang)), hy1 = y2 - head * (uy * Math.cos(ang) + ux * Math.sin(ang));
      const hx2 = x2 - head * (ux * Math.cos(-ang) - uy * Math.sin(-ang)), hy2 = y2 - head * (uy * Math.cos(-ang) + ux * Math.sin(-ang));
      return [`M${f1(x1)} ${f1(y1)} Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}`, `M${f1(hx1)} ${f1(hy1)} L${f1(x2)} ${f1(y2)} L${f1(hx2)} ${f1(hy2)}`];
    },
    /** 横向大括号（开口朝上，尖朝下） */
    braceH(x0, y0, w, hh) {
      const q = hh / 2, xm = x0 + w / 2, x1 = x0 + w;
      return `M${f1(x0)} ${f1(y0)} Q${f1(x0)} ${f1(y0 + q)} ${f1(x0 + q)} ${f1(y0 + q)} L${f1(xm - q)} ${f1(y0 + q)} Q${f1(xm)} ${f1(y0 + q)} ${f1(xm)} ${f1(y0 + hh)} Q${f1(xm)} ${f1(y0 + q)} ${f1(xm + q)} ${f1(y0 + q)} L${f1(x1 - q)} ${f1(y0 + q)} Q${f1(x1)} ${f1(y0 + q)} ${f1(x1)} ${f1(y0)}`;
    },
    tick(x, y, s = 1) { return `M${f1(x)} ${f1(y + 22 * s)} Q${f1(x + 9 * s)} ${f1(y + 28 * s)} ${f1(x + 18 * s)} ${f1(y + 42 * s)} Q${f1(x + 30 * s)} ${f1(y + 12 * s)} ${f1(x + 58 * s)} ${f1(y - 6 * s)}`; },
    wave(x, y, w, amp = 6, step = 34) { let d = `M${f1(x)} ${f1(y)}`; for (let k = 0; k < w; k += step) d += ` q${f1(step / 2)} ${f1(-amp * 2)} ${f1(step)} 0`; return d; },
    star(r, cx, cy, R) {
      let d = ''; for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 4 / 5), j = (r() - 0.5) * R * 0.12; d += `${i ? ' L' : 'M'}${f1(cx + Math.cos(a) * (R + j))} ${f1(cy + Math.sin(a) * (R + j))}`; } return d;
    },
    cross(x, y, s) { return [`M${f1(x - s)} ${f1(y - s)} L${f1(x + s)} ${f1(y + s)}`, `M${f1(x + s)} ${f1(y - s)} L${f1(x - s)} ${f1(y + s)}`]; }
  };

  /** 粉笔路径：class cb-d = 逐笔描出；cb-dash = 静态虚线 */
  function P(d, color, w = 4, mode = 'd', extra = '') {
    const st = mode === 'd' ? 'stroke-dasharray:1 2;stroke-dashoffset:1;opacity:0;' : mode === 'dash' ? 'stroke-dasharray:0.011 0.009;' : '';
    return `<path class="cb-${mode}" d="${d}" pathLength="1" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:${color};stroke-width:${w}px;${st}${extra}"/>`;
  }
  function svgWrap(inner, style, cls) {
    return h('div', `cb-svg ${cls || ''}`, style, `<svg width="10" height="10" style="overflow:visible">${inner}</svg>`);
  }

  /**
   * 手绘粉笔框（尺寸在首帧测量后生成，因此对任意长度文案自适应）
   * opts: { color, double, dash, amp, w }
   */
  function frame(el, opts = {}) {
    el.classList.add('cb-frame');
    const s = h('div', 'cb-fr-svg');
    el.insertBefore(s, el.firstChild);
    el._frame = { opts, s, r: RNG(), done: false };
    return el;
  }
  function buildFrame(el) {
    const F = el._frame; if (!F || F.done) return;
    const w = el.offsetWidth, hh = el.offsetHeight; if (!w || !hh) return;
    const o = F.opts, c = o.color || 'var(--cb-white)', sw = o.w || 3.6;
    let inner = '';
    if (o.dash) inner += P(G.rect(F.r, 0, 0, w, hh, o.amp || 2.5), c, sw, 'dash');
    else {
      inner += P(G.rect(F.r, 0, 0, w, hh, o.amp || 3), c, sw, 'd');
      if (o.double) inner += P(G.rect(F.r, 7, 7, w - 14, hh - 14, (o.amp || 3) * 0.8), c, sw * 0.6, 'd', 'opacity:0;');
    }
    F.s.innerHTML = `<svg width="${w}" height="${hh}" style="overflow:visible">${inner}</svg>`;
    F.done = true;
  }

  /** 手绘圆圈套在元素外（首帧测量） */
  function ring(el, opts = {}) {
    const s = h('div', 'cb-fr-svg');
    el.appendChild(s);
    el._ring = { opts, s, r: RNG(), done: false };
    el.classList.add('cb-ringed');
    return el;
  }
  function buildRing(el) {
    const F = el._ring; if (!F || F.done) return;
    const w = el.offsetWidth, hh = el.offsetHeight; if (!w || !hh) return;
    const o = F.opts, c = o.color || 'var(--cb-yellow)', pad = o.pad || 26, sw = o.w || 5;
    let inner = P(G.ellipse(F.r, w / 2, hh / 2, w / 2 + pad, hh / 2 + pad * 0.72), c, sw, 'd');
    if (o.double) inner += P(G.ellipse(F.r, w / 2 + 3, hh / 2 - 2, w / 2 + pad + 9, hh / 2 + pad * 0.72 + 7, 1.02), c, sw * 0.55, 'd');
    F.s.innerHTML = `<svg width="${w}" height="${hh}" style="overflow:visible">${inner}</svg>`;
    F.done = true;
  }

  /** 首帧（可测量时）一次性生成本组件内所有手绘框 / 圈 */
  function buildAll(root) {
    if (root._built) return;
    let pending = false;
    [root, ...root.querySelectorAll('.cb-frame,.cb-ringed')].forEach((e) => {
      if (e._frame && !e._frame.done) { buildFrame(e); if (!e._frame.done) pending = true; }
      if (e._ring && !e._ring.done) { buildRing(e); if (!e._ring.done) pending = true; }
    });
    if (!pending) root._built = true;
  }

  /** 逐笔描出：root 下所有 .cb-d 路径按顺序在 [at, at+dur] 内描完 */
  function drawOn(A, root, at, dur) {
    let ps = null;
    A.fn((t, phase) => {
      if (phase !== 'post') return;
      if (!ps || !ps.length) {
        ps = Array.from(root.querySelectorAll(':scope > .cb-fr-svg .cb-d'));
        if (!ps.length) ps = Array.from(root.querySelectorAll('.cb-d'));
      }
      const n = ps.length; if (!n) return;
      const seg = dur / n;
      ps.forEach((p, i) => {
        const k = EASE.inOut(clamp01((t - at - i * seg * 0.85) / (seg * 1.15)));
        p.style.strokeDashoffset = (1 - k).toFixed(4);
        p.style.opacity = k > 0.001 ? '1' : '0';
      });
    });
  }

  /** "这句**关键词**话" → 逐字 span（便于粉笔逐字书写）+ 关键词粉笔黄波浪下划线 */
  function chalkHTML(s) {
    let out = '';
    String(s == null ? '' : s).split(/(\*\*.+?\*\*)/).forEach((seg) => {
      if (!seg) return;
      const em = /^\*\*.+\*\*$/.test(seg), body = em ? seg.slice(2, -2) : seg;
      let inner = '';
      for (const ch of body) {
        if (ch === '\n') { inner += '<br/>'; continue; }
        inner += `<span class="cc">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`;
      }
      out += em ? `<em>${inner}</em>` : inner;
    });
    return out;
  }
  /** 粉笔逐字书写：每字从淡粉尘 → 实笔 */
  function writeIn(A, el, at, rate = 0.07) {
    const cs = Array.from(el.querySelectorAll('.cc'));
    A.fn((t, phase) => {
      if (phase !== 'post') return;
      cs.forEach((c, i) => {
        const k = clamp01((t - at - i * rate) / 0.16);
        c.style.opacity = k.toFixed(3);
        c.style.filter = k < 1 ? `blur(${((1 - k) * 3).toFixed(2)}px)` : '';
      });
    });
    return at + cs.length * rate + 0.16;
  }

  // ============================== 实体道具 ==============================
  let GID = 0;
  const PROPS = {
    /** 原木黑板擦（侧视）：木块 + 毛毡 + 粉笔灰 */
    eraser(w = 240, hh = 92) {
      const id = `cbw${++GID}`, fh = hh * 0.3;
      let grain = '';
      for (let i = 0; i < 6; i++) grain += `<path d="M${8} ${f1(8 + i * (hh - fh - 14) / 6)} q${f1(w * 0.3)} ${i % 2 ? 4 : -4} ${f1(w - 16)} ${i % 2 ? -2 : 3}" stroke="rgba(60,34,14,.35)" stroke-width="2" fill="none"/>`;
      return `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" style="overflow:visible"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C8915A"/><stop offset=".55" stop-color="#A0703C"/><stop offset="1" stop-color="#7A4F26"/></linearGradient></defs>
        <rect x="4" y="${hh - 2}" width="${w - 8}" height="10" rx="5" fill="rgba(0,0,0,.35)"/>
        <rect x="0" y="0" width="${w}" height="${hh - fh}" rx="12" fill="url(#${id})" stroke="#5C3A1E" stroke-width="3"/>${grain}
        <rect x="10" y="${hh - fh - 2}" width="${w - 20}" height="${fh}" rx="4" fill="#3A3A3C" stroke="#232325" stroke-width="2"/>
        <rect x="12" y="${hh - fh + 4}" width="${w - 24}" height="${fh * 0.45}" fill="rgba(244,244,238,.42)"/>
        <text x="${w / 2}" y="${(hh - fh) * 0.62}" text-anchor="middle" font-family="Consolas, monospace" font-size="${Math.round(hh * 0.17)}" font-weight="700" fill="rgba(60,34,14,.75)" letter-spacing="3">CHALK · ERASER</text></svg>`;
    },
    /** 彩色粉笔头 */
    chalk(len = 110, color = '#F4F4EE') {
      return `<svg width="${len}" height="24" viewBox="0 0 ${len} 24" style="overflow:visible"><rect x="2" y="16" width="${len - 4}" height="7" rx="3" fill="rgba(0,0,0,.3)"/><path d="M6 3 H${len - 10} Q${len} 3 ${len} 11 Q${len} 19 ${len - 10} 19 H6 Q2 19 2 11 Q2 3 6 3 Z" fill="${color}"/><path d="M8 6 H${len - 14}" stroke="rgba(255,255,255,.55)" stroke-width="2.5" stroke-linecap="round"/><path d="M${len - 12} 4 Q${len - 2} 11 ${len - 12} 18" stroke="rgba(0,0,0,.12)" stroke-width="2" fill="none"/></svg>`;
    }
  };
  function propEl(html, style) { return h('div', 'cb-prop', style, html); }
  function kicker(text, style) {
    const el = h('div', 'cb-kicker', style, `<span>${esc(text)}</span>`);
    return el;
  }
  function head(text, style) { return h('div', 'cb-head', style, chalkHTML(text)); }
  /** 粉笔圈注印记（大字 + 小字 + 手绘双圈） */
  function stamp(text, small, style, color = 'var(--cb-pink)') {
    const el = h('div', 'cb-stamp', `color:${color};${style || ''}`, `<div class="tx">${esc(text)}</div>${small ? `<small>${esc(small)}</small>` : ''}`);
    ring(el, { color, double: true, pad: 24, w: 5 });
    return el;
  }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .cb-zone{position:absolute;width:1400px;height:1100px;font-family:var(--cb-font);color:var(--cb-white)}
  .cb-zone *, .cb-scr *{box-sizing:border-box}
  .cb-svg,.cb-prop{position:absolute;z-index:5}
  .cb-svg svg,.cb-prop svg{display:block}
  .cb-frame{position:absolute}
  .cb-fr-svg{position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:0;pointer-events:none}
  .cb-fr-svg svg{position:absolute;left:0;top:0;overflow:visible}
  .cb-frame > *:not(.cb-fr-svg){position:relative;z-index:1}
  .cb-ringed{position:absolute}
  .cc{display:inline-block}
  .cb-kicker{position:absolute;font-family:var(--cb-mono);font-size:22px;font-weight:700;letter-spacing:.16em;color:var(--cb-yellow);white-space:nowrap;padding-bottom:10px;text-shadow:var(--cb-glow)}
  .cb-kicker:before{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:repeating-linear-gradient(90deg,var(--cb-yellow) 0 14px,transparent 14px 22px);opacity:.85}
  .cb-head{position:absolute;font-weight:700;letter-spacing:.01em;line-height:1.12;color:var(--cb-white);white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-zone em,.cb-scr em{font-style:normal;color:var(--cb-yellow);padding-bottom:.14em;background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='10'><path d='M0 5 Q6 0 12 5 T24 5' fill='none' stroke='%23FF8787' stroke-width='2.4' stroke-linecap='round'/></svg>") repeat-x 0 100%;background-size:.46em .2em}
  .cb-stamp{position:absolute;z-index:8;font-weight:700;text-align:center;line-height:1.02;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-stamp .tx{position:relative;z-index:1}
  .cb-stamp small{position:relative;z-index:1;display:block;font-family:var(--cb-mono);font-size:.3em;letter-spacing:.22em;margin-top:8px;font-weight:700}
  .cb-tag{position:absolute;padding:8px 18px;font-family:var(--cb-mono);font-size:22px;font-weight:700;letter-spacing:.08em;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-note{position:absolute;padding:12px 22px;font-size:30px;font-weight:700;white-space:nowrap;color:var(--cb-white);text-shadow:var(--cb-glow)}
  .cb-dim{color:var(--cb-dim)}
  /* cover */
  .cb-cover-title{position:absolute;left:58px;top:168px;font-size:150px;font-weight:700;line-height:1.14;letter-spacing:.02em;white-space:nowrap;text-shadow:var(--cb-glow-lg)}
  .cb-cover-ch{position:absolute;left:60px;top:618px;width:300px;height:270px;padding:22px 26px}
  .cb-cover-ch .l{font-family:var(--cb-mono);font-size:22px;font-weight:700;letter-spacing:.22em;color:var(--cb-yellow)}
  .cb-cover-ch .n{position:absolute !important;left:26px;bottom:6px;font-family:var(--cb-num);font-size:180px;font-weight:700;line-height:1;color:var(--cb-blue);text-shadow:var(--cb-glow-lg)}
  .cb-cover-sub{position:absolute;left:420px;top:628px;padding:24px 34px 28px;font-size:46px;font-weight:700;line-height:1.42;white-space:nowrap;text-shadow:var(--cb-glow)}
  /* stat */
  .cb-stat{position:absolute;top:300px;height:440px;padding:34px 36px}
  .cb-stat .lb{font-size:36px;font-weight:700;white-space:nowrap}
  .cb-stat .num{position:absolute !important;left:36px;top:96px;font-family:var(--cb-num);font-weight:700;line-height:1;white-space:nowrap;letter-spacing:-.02em;text-shadow:var(--cb-glow-lg)}
  .cb-stat .num .u{font-family:var(--cb-font);font-size:.26em;margin-left:26px;letter-spacing:0;color:var(--cb-white)}
  .cb-stat .num .pf{font-size:.5em;margin-right:6px}
  .cb-stat.hot .num b{color:var(--cb-yellow)}
  .cb-stat .bar{position:absolute !important;left:36px;right:36px;top:340px;height:44px}
  .cb-stat .bar i{position:absolute;left:0;top:0;bottom:0;transform-origin:left center;background:repeating-linear-gradient(-55deg,var(--cb-white) 0 3px,transparent 3px 12px);opacity:.75}
  .cb-stat.hot .bar i{background:repeating-linear-gradient(-55deg,var(--cb-yellow) 0 3px,transparent 3px 12px);opacity:.9}
  .cb-stat .sc{position:absolute !important;right:36px;top:296px;font-family:var(--cb-mono);font-size:22px;font-weight:700;color:var(--cb-dim)}
  /* steps */
  .cb-ticket{position:absolute;top:330px;height:360px;padding:100px 22px 20px}
  .cb-ticket .no{position:absolute !important;left:22px;top:24px;font-family:var(--cb-num);font-size:38px;font-weight:700;color:var(--cb-yellow);line-height:1}
  .cb-ticket .nm{font-size:62px;font-weight:700;line-height:1.08;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-ticket .fn{position:absolute !important;left:22px;right:22px;bottom:26px;font-family:var(--cb-mono);font-size:21px;font-weight:700;color:var(--cb-blue);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-top:12px;border-top:2px dashed rgba(116,192,252,.55)}
  .cb-steps-bar{position:absolute;left:60px;top:806px;width:1280px;height:100px;display:flex;align-items:center;gap:24px;padding:0 30px}
  .cb-steps-bar .f{font-family:var(--cb-mono);font-size:28px;font-weight:700;letter-spacing:.04em;white-space:nowrap;color:var(--cb-white)}
  .cb-steps-bar .b{font-family:var(--cb-num);font-size:44px;font-weight:700;color:var(--cb-yellow);white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-steps-bar .m{margin-left:auto;margin-right:250px;font-family:var(--cb-mono);font-size:16px;font-weight:700;color:var(--cb-dim);line-height:1.4;text-align:right;white-space:nowrap}
  /* checklist */
  .cb-card{position:absolute;left:250px;top:100px;width:900px}
  .cb-card .hd{position:absolute !important;left:40px;top:26px;font-family:var(--cb-mono);font-size:20px;font-weight:700;letter-spacing:.16em;color:var(--cb-yellow);white-space:nowrap}
  .cb-card .ttl{position:absolute !important;left:40px;top:66px;font-family:var(--cb-num);font-size:92px;font-weight:700;line-height:1.05;white-space:nowrap;text-shadow:var(--cb-glow-lg)}
  .cb-card .sub{position:absolute !important;left:44px;top:184px;font-size:34px;font-weight:700;white-space:nowrap;color:var(--cb-blue)}
  .cb-row{position:absolute !important;left:40px;right:40px;height:100px}
  .cb-row .k{position:absolute;left:96px;top:10px;font-size:42px;font-weight:700;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-row .d{position:absolute;left:98px;top:64px;font-size:24px;font-weight:700;color:var(--cb-dim);white-space:nowrap}
  .cb-row .n{position:absolute;right:0;top:22px;font-family:var(--cb-mono);font-size:20px;font-weight:700;color:var(--cb-dim)}
  .cb-memo{position:absolute !important;left:40px;right:40px;padding:16px 26px;font-size:40px;font-weight:700;white-space:nowrap;color:var(--cb-yellow);text-shadow:var(--cb-glow)}
  .cb-memo small{display:inline-block;font-size:26px;color:var(--cb-white);margin-right:18px}
  /* compare */
  .cb-cmp{position:absolute;top:290px;width:540px;height:440px}
  .cb-cmp .band{position:absolute !important;left:30px;top:26px;font-size:30px;font-weight:700;white-space:nowrap}
  .cb-cmp .t{position:absolute !important;left:30px;top:92px;font-size:58px;font-weight:700;line-height:1.16;white-space:nowrap}
  .cb-cmp .d{position:absolute !important;left:30px;right:20px;top:262px;font-size:25px;font-weight:700;line-height:1.5}
  .cb-cmp.wrong .t,.cb-cmp.wrong .d{color:var(--cb-dim)}
  .cb-cmp.wrong .band{color:var(--cb-pink)}
  .cb-cmp.right .band{color:var(--cb-blue)}
  .cb-cmp.right .t{text-shadow:var(--cb-glow)}
  .cb-vs{position:absolute;left:640px;top:458px;width:120px;height:100px;font-family:var(--cb-num);font-size:64px;font-weight:700;color:var(--cb-yellow);display:flex;align-items:center;justify-content:center;text-shadow:var(--cb-glow-lg)}
  .cb-verdict{position:absolute;left:60px;top:800px;width:1280px;height:116px;display:flex;align-items:center;gap:26px;padding:0 34px;z-index:7}
  .cb-verdict b{font-family:var(--cb-mono);font-size:22px;letter-spacing:.18em;color:var(--cb-yellow);white-space:nowrap}
  .cb-verdict span{font-size:48px;font-weight:700;white-space:nowrap;text-shadow:var(--cb-glow)}
  /* timeline */
  .cb-tl-node{position:absolute;width:240px;padding:18px 20px 20px}
  .cb-tl-node .tm{font-family:var(--cb-num);font-size:34px;font-weight:700;color:var(--cb-yellow);line-height:1.1}
  .cb-tl-node .t{font-size:40px;font-weight:700;white-space:nowrap;margin-top:6px;text-shadow:var(--cb-glow)}
  .cb-tl-node .d{font-size:23px;font-weight:700;color:var(--cb-dim);white-space:nowrap;margin-top:6px}
  .cb-tl-node.now .t{color:var(--cb-pink)}
  .cb-tl-dot{position:absolute;width:30px;height:30px;border-radius:50%;background:var(--cb-white);box-shadow:0 0 8px rgba(244,244,238,.35)}
  .cb-tl-dot.now{background:var(--cb-pink)}
  /* diagram */
  .cb-dg-node{position:absolute;width:260px;height:124px;padding:16px 22px 0}
  .cb-dg-node .l{font-size:38px;font-weight:700;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-dg-node .s{font-family:var(--cb-mono);font-size:18px;font-weight:700;color:var(--cb-blue);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:8px}
  .cb-dg-node.hot .l{color:var(--cb-yellow)}
  .cb-dg-tagw{position:absolute;z-index:6;transform:translate(-50%,-50%)}
  .cb-dg-tag{padding:3px 12px;background:var(--cb-board);font-family:var(--cb-mono);font-size:19px;font-weight:700;color:var(--cb-yellow);white-space:nowrap;border-radius:4px}
  /* showcase */
  .cb-panel{position:absolute;left:60px;top:262px;width:1240px;height:640px;overflow:hidden}
  .cb-panel.slate{background:#0F221C;border:16px solid #8E5E31;border-radius:6px;box-shadow:inset 0 0 0 3px #5C3A1E,inset 0 0 60px rgba(0,0,0,.55),0 14px 30px rgba(0,0,0,.45);
    background-image:radial-gradient(ellipse at 30% 20%,rgba(244,244,238,.05),transparent 60%)}
  .cb-panel.paper{background:#F1EAD8;border-radius:4px;box-shadow:0 16px 34px rgba(0,0,0,.5);color:#24221E;overflow:visible;
    background-image:repeating-linear-gradient(180deg,transparent 0 55px,rgba(46,90,140,.18) 55px 57px)}
  .cb-panel .bar{position:relative;height:54px;display:flex;align-items:center;gap:12px;padding:0 22px;font-family:var(--cb-mono);font-size:20px;font-weight:700;letter-spacing:.1em;color:var(--cb-yellow);border-bottom:2px dashed rgba(244,244,238,.35)}
  .cb-panel.paper .bar{color:#B3402F;border-bottom:2px solid rgba(179,64,47,.35)}
  .cb-panel .bar i{width:16px;height:16px;border-radius:50%;border:3px solid var(--cb-pink);display:inline-block}
  .cb-panel .bar i:nth-child(2){border-color:var(--cb-yellow)}.cb-panel .bar i:nth-child(3){border-color:var(--cb-blue)}
  .cb-panel.paper .bar i{border-color:#B3402F}
  .cb-panel .bar span{margin-left:12px}
  .cb-code{padding:24px 30px;font-family:var(--cb-mono);font-size:30px;font-weight:700;line-height:1.62;white-space:pre;color:var(--cb-white);text-shadow:var(--cb-glow)}
  .cb-code .ln{display:inline-block;width:56px;color:rgba(244,244,238,.32)}
  .cb-code .c{color:rgba(244,244,238,.5)}.cb-code .k{color:var(--cb-yellow)}.cb-code .ok{color:var(--cb-blue)}
  .cb-code .cur{display:inline-block;width:.55em;background:var(--cb-white);color:transparent}
  .cb-panel.paper .cb-code{font-family:var(--cb-font);font-size:36px;color:#24221E;text-shadow:none;line-height:57px;padding-top:8px}
  .cb-panel.paper .cb-code .ln{color:#B3402F;opacity:.6}.cb-panel.paper .cb-code .k{color:#2E5A8C}.cb-panel.paper .cb-code .ok{color:#2D7A4F}.cb-panel.paper .cb-code .c{color:#8A8170}
  .cb-panel.paper .cb-code .cur{background:#24221E}
  .cb-magnet{position:absolute;top:-16px;width:40px;height:40px;border-radius:50%;box-shadow:0 5px 8px rgba(0,0,0,.45),inset 0 -4px 0 rgba(0,0,0,.2);z-index:4}
  .cb-media{position:absolute;left:0;right:0;top:54px;width:100%;height:calc(100% - 54px);object-fit:cover;background:#000}
  .cb-callout{position:absolute;display:flex;align-items:center;gap:6px;z-index:6}
  .cb-callout span{position:relative;padding:8px 18px;background:rgba(15,34,28,.92);border-radius:6px;font-size:30px;font-weight:700;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-prod{position:absolute;left:0;right:0;top:54px;bottom:0}
  .cb-prod .pic{position:absolute;left:34px;top:34px;bottom:36px;width:480px;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .cb-prod .pic img{width:100%;height:100%;object-fit:contain}
  .cb-prod .pic svg{width:82%;height:auto}
  .cb-prod .info{position:absolute;left:570px;right:40px;top:30px}
  .cb-prod .nm{font-size:56px;font-weight:700;line-height:1.08;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-prod .tg{display:inline-block;margin-top:10px;font-size:26px;font-weight:700;color:var(--cb-blue);white-space:nowrap}
  .cb-prod .specs{margin-top:16px;border-top:3px dashed rgba(244,244,238,.5)}
  .cb-prod .row{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:2px dashed rgba(244,244,238,.3);white-space:nowrap}
  .cb-prod .row .k{font-family:var(--cb-mono);font-size:20px;font-weight:700;letter-spacing:.06em;color:var(--cb-dim)}
  .cb-prod .row .v{font-size:28px;font-weight:700}
  /* quote（屏幕层：手持小黑板） */
  .cb-scr{position:absolute;inset:0;pointer-events:none;font-family:var(--cb-font);color:var(--cb-white)}
  .cb-q{position:absolute;top:186px;width:fit-content;min-width:440px;max-width:720px;padding:34px 46px 44px;background:var(--cb-board);border:16px solid #8E5E31;border-radius:8px;
    box-shadow:inset 0 0 0 3px #5C3A1E,inset 0 0 70px rgba(0,0,0,.5),0 24px 50px rgba(0,0,0,.55)}
  .cb-q .k{display:inline-block;font-family:var(--cb-mono);font-size:20px;font-weight:700;letter-spacing:.18em;color:var(--cb-yellow);padding-bottom:8px;border-bottom:3px dashed var(--cb-yellow)}
  .cb-q .t{font-size:66px;font-weight:700;line-height:1.32;margin-top:22px;white-space:nowrap;text-shadow:var(--cb-glow-lg)}
  .cb-q .by{margin-top:22px;font-family:var(--cb-mono);font-size:22px;font-weight:700;letter-spacing:.1em;color:var(--cb-blue)}
  .cb-q .tray{position:absolute;left:-30px;right:-30px;bottom:-42px;height:22px;background:linear-gradient(180deg,#B07A45,#7A4F26);border-radius:3px;box-shadow:0 8px 14px rgba(0,0,0,.45)}
  /* outro */
  .cb-act{position:absolute;left:60px;width:580px;height:156px;padding:20px 26px}
  .cb-act .tg{font-family:var(--cb-mono);font-size:19px;font-weight:700;letter-spacing:.16em}
  .cb-act .t{font-size:46px;font-weight:700;margin-top:6px;white-space:nowrap;text-shadow:var(--cb-glow)}
  .cb-act .d{font-family:var(--cb-mono);font-size:21px;font-weight:700;color:var(--cb-dim);margin-top:6px;white-space:nowrap}
  .cb-act .no{position:absolute !important;right:26px;top:18px;font-family:var(--cb-num);font-size:64px;font-weight:700;color:rgba(244,244,238,.2);line-height:1}
  .cb-cta{position:absolute;left:712px;top:272px;width:600px;height:420px;padding:34px 40px}
  .cb-cta .k{font-family:var(--cb-mono);font-size:20px;font-weight:700;letter-spacing:.2em;color:var(--cb-yellow)}
  .cb-cta .t{font-size:72px;font-weight:700;margin-top:12px;white-space:nowrap;text-shadow:var(--cb-glow-lg)}
  .cb-cta .repo{font-family:var(--cb-mono);font-size:24px;font-weight:700;color:var(--cb-blue);margin-top:14px;white-space:nowrap}
  .cb-cta .btns{position:absolute !important;left:40px;right:40px;bottom:44px;display:flex;gap:46px;justify-content:flex-start;padding-left:22px}
  .cb-cta .btns > div{position:relative;font-size:40px;font-weight:700;white-space:nowrap}
  `;
  function injectCSS() {
    if (document.getElementById('cb-components-css')) return;
    const st = document.createElement('style'); st.id = 'cb-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  /** 粉笔圈注落板：轻放大 → 到位，再描圈 */
  const popIn = (A, el, at, r = -6) => { A.add(el, at, 0.3, { s: 1.35, o: 0, r: r - 4 }, { s: 1, o: 1, r }, 'back'); drawOn(A, el, at + 0.12, 0.5); };
  const KICK = (A, kick, at = 0.1) => { A.add(kick, at, 0.35, { x: -30, o: 0 }, { x: 0, o: 1 }); };
  const PAL = ['var(--cb-white)', 'var(--cb-yellow)', 'var(--cb-blue)', 'var(--cb-pink)'];

  // ============================== 1. cover 板书封面 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'cb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const title = h('div', 'cb-cover-title', null, chalkHTML(data.title));
    const lines = String(data.title || '').split('\n');
    const maxLen = Math.max(...lines.map((l) => l.length), 1);
    const ulW = Math.min(1180, maxLen * 150 + 20), ulY = 168 + lines.length * 171 + 4;
    const ul = svgWrap(P(G.wave(62, 0, ulW, 6, 40), 'var(--cb-yellow)', 6) + P(G.wave(80, 18, ulW - 70, 5, 46), 'var(--cb-yellow)', 3.5), `left:0;top:${ulY}px;`);
    const ch = frame(h('div', 'cb-cover-ch', null, `<div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="n">${esc(data.chapter || '01')}</div>`), { double: true, color: 'var(--cb-white)' });
    const sub = frame(h('div', 'cb-cover-sub', null, chalkHTML(data.subtitle)), { dash: true, color: 'rgba(244,244,238,.7)' });
    const dm = frame(h('div', 'cb-tag', 'left:430px;top:858px;color:var(--cb-blue);', esc(data.dim || '')), { dash: true, color: 'var(--cb-blue)' });
    const st = stamp(data.stamp || '', data.stampSmall || '', 'left:1040px;top:250px;font-size:76px;');
    const r = RNG();
    const doodle = svgWrap(P(G.star(r, 1190, 580, 46), 'var(--cb-yellow)', 4.5) + P(G.star(r, 1080, 650, 24), 'var(--cb-blue)', 3.5) + G.cross(1260, 680, 12).map((d) => P(d, 'var(--cb-pink)', 4)).join('') + G.cross(1140, 500, 9).map((d) => P(d, 'var(--cb-white)', 3.5)).join(''), 'left:0;top:0;');
    const arr = svgWrap(G.arrow(r, 1000, 640, 1110, 420, 0.22, 24).map((d) => P(d, 'var(--cb-pink)', 5)).join(''), 'left:0;top:0;');
    const er = propEl(PROPS.eraser(230, 88), 'left:1010px;top:800px;');
    const ck1 = propEl(PROPS.chalk(100, '#FFE066'), 'left:1250px;top:880px;');
    const ck2 = propEl(PROPS.chalk(78, '#FF8787'), 'left:1140px;top:910px;');
    el.append(kick, title, ul, ch, sub, dm, st, doodle, arr, er, ck1, ck2);
    KICK(A, kick);
    const tW = writeIn(A, title, 0.35, 0.1);
    drawOn(A, ul, tW - 0.1, 0.5);
    A.add(ch, tW - 0.1, 0.35, { o: 0, y: 20 }, { o: 1, y: 0 });
    drawOn(A, ch, tW - 0.1, 0.6);
    A.add(sub, tW + 0.2, 0.35, { o: 0, x: 30 }, { o: 1, x: 0 });
    const tS = writeIn(A, sub, tW + 0.25, 0.045);
    A.add(dm, tS + 0.1, 0.35, { s: 0.6, o: 0, r: 6 }, { s: 1, o: 1, r: -2 }, 'back');
    A.add(er, tW + 0.1, 0.5, { x: 160, o: 0, r: 8 }, { x: 0, o: 1, r: -4 }, 'out');
    A.add(ck1, tW + 0.3, 0.4, { x: 120, o: 0, r: 30 }, { x: 0, o: 1, r: -12 }, 'out');
    A.add(ck2, tW + 0.4, 0.4, { x: 90, o: 0, r: -20 }, { x: 0, o: 1, r: 8 }, 'out');
    drawOn(A, doodle, tW + 0.3, 0.9);
    const tSt = Math.min(D - 1.3, tS + 0.35);
    drawOn(A, arr, tSt - 0.4, 0.35);
    popIn(A, st, tSt, -8);
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 560, 400, 1.24, 1.5, -3, -0.8), CAM(1.8, 700, 505, 1.0, 1, -1.2, 0), CAM(D, 712, 506, 1.03, 0.5, 1, 0.3)] };
  }

  // ============================== 共用：数字格式 ==============================
  function decOf(v) { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; }
  function fmtNum(v, dec) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function fitNums(nums, finals, avail) {
    nums.forEach((nEl, i) => {
      const b = nEl.querySelector('b'), keep = b.textContent; b.textContent = finals[i];
      const w = nEl.scrollWidth; if (w > avail) nEl.style.fontSize = `${Math.floor(parseFloat(nEl.style.fontSize) * avail / w)}px`;
      b.textContent = keep;
    });
  }

  // ============================== 2. stat 大数字 + 粉笔圈注 ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'cb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const hd = head(data.title, 'left:58px;top:150px;font-size:90px;');
    const gap = 44, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 240 : n === 2 ? 176 : 130;
    const cards = items.map((it, i) => frame(h('div', `cb-stat${i === n - 1 ? ' hot' : ''}`, `left:${60 + i * (w + gap)}px;width:${w}px;`,
      `<div class="lb">${esc(it.label || '')}</div><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div><div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div>`),
      { double: i === n - 1, color: i === n - 1 ? 'var(--cb-yellow)' : 'var(--cb-white)' }));
    // 每张卡的进度条手绘外框
    const barFrames = cards.map((c) => { const b = c.querySelector('.bar'); frame(b, { color: 'rgba(244,244,238,.6)', w: 2.6, amp: 2 }); return b; });
    const nums = cards.map((c) => c.querySelector('.num'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    // 末卡大数字粉笔圈
    const hotNum = nums[n - 1];
    const hotRing = h('div', 'cb-fr-svg');
    hotNum.appendChild(hotRing);
    const st = data.delta ? stamp(data.delta, data.deltaSmall || '', 'left:1010px;top:800px;font-size:58px;') : null;
    const note = data.note ? frame(h('div', 'cb-note', 'left:60px;top:812px;font-size:30px;color:var(--cb-blue);', esc(data.note)), { dash: true, color: 'var(--cb-blue)' }) : null;
    el.append(kick, hd, ...cards);
    if (note) el.appendChild(note);
    if (st) el.appendChild(st);
    KICK(A, kick);
    writeIn(A, hd, 0.25, 0.06);
    const tIn = cards.map((_, i) => 0.8 + i * 0.6);
    cards.forEach((c, i) => {
      A.add(c, tIn[i], 0.4, { o: 0, y: 24 }, { o: 1, y: 0 }, 'out');
      drawOn(A, c, tIn[i], 0.55);
      drawOn(A, barFrames[i], tIn[i] + 0.9, 0.35);
      A.add(c.querySelector('.bar i'), tIn[i] + 1.1, 0.8, { sx: 0 }, { sx: 1 }, 'out');
    });
    if (note) { A.add(note, D - 2.6, 0.4, { o: 0, y: 16 }, { o: 1, y: 0, r: -1 }); }
    const tRing = tIn[n - 1] + 1.6;
    if (st) popIn(A, st, Math.min(D - 1.2, tIn[n - 1] + 2.2), -7);
    let fitted = false, ringPath = null;
    A.fn((t, ph) => {
      if (ph !== 'post') return;
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) {
        fitNums(nums, finals, w - 80); fitted = true;
        const bw = hotNum.querySelector('b'); const keep = bw.textContent; bw.textContent = finals[n - 1];
        const rw = bw.offsetWidth, rh = bw.offsetHeight, ox = bw.offsetLeft; bw.textContent = keep;
        hotRing.innerHTML = `<svg width="10" height="10" style="overflow:visible">${P(G.ellipse(RNG(), ox + rw / 2, rh / 2, rw / 2 + 16, rh / 2 + 2), 'var(--cb-pink)', 5.5, 'd')}</svg>`;
        ringPath = hotRing.querySelector('path');
      }
      items.forEach((it, i) => { nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.3) / 1.2)), decs[i]); });
      if (ringPath) { const k = EASE.inOut(clamp01((t - tRing) / 0.55)); ringPath.style.strokeDashoffset = (1 - k).toFixed(4); ringPath.style.opacity = k > 0 ? '1' : '0'; }
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 680, 560, 1.12, 1.5, -2.5, -0.5), CAM(1.3, 700, 512, 1.0, 1, -1, 0), CAM(D, 708, 506, 1.04, 0.5, 1, 0.2)] };
  }

  // ============================== 3. steps 板书流程 + 大括号归档 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'cb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const hd = head(data.title, 'left:58px;top:150px;font-size:92px;');
    const tag = stamp(data.dim || `${n} STEPS`, '', 'left:1130px;top:178px;font-size:34px;font-family:var(--cb-mono);', 'var(--cb-yellow)');
    const AW = 60, cw = (1280 - AW * (n - 1)) / n;
    const cards = items.map((it, i) => {
      const c = frame(h('div', 'cb-ticket', `left:${60 + i * (cw + AW)}px;width:${cw}px;`,
        `<div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div>`), { double: i === n - 1, color: i === n - 1 ? 'var(--cb-yellow)' : 'var(--cb-white)' });
      ring(c.querySelector('.no'), { color: PAL[(i + 1) % 4], pad: 14, w: 3.5 });
      return c;
    });
    const r = RNG();
    const arrows = items.slice(1).map((_, i) => {
      const x0 = 60 + (i + 1) * (cw + AW) - AW + 6, x1 = x0 + AW - 12;
      return svgWrap(G.arrow(r, x0, 512, x1, 512, 0.3, 14).map((d) => P(d, 'var(--cb-white)', 4.5)).join(''), 'left:0;top:0;');
    });
    const brace = svgWrap(P(G.braceH(70, 718, 1260, 60), 'var(--cb-yellow)', 5), 'left:0;top:0;');
    const bar = frame(h('div', 'cb-steps-bar', null,
      `<div class="f">▣ ${esc(data.folder || 'PROJECT /')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`), { dash: true, color: 'rgba(244,244,238,.6)' });
    const label = data.label ? stamp(data.label, data.labelSmall || '', 'left:1104px;top:818px;font-size:40px;') : null;
    el.append(kick, hd, tag, ...cards, ...arrows, brace, bar);
    if (label) el.appendChild(label);
    KICK(A, kick);
    writeIn(A, hd, 0.25, 0.07);
    popIn(A, tag, 0.9, 4);
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.5, D - 3.0), t0 + 0.6 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    cards.forEach((c, i) => {
      A.add(c, t0 + i * stp, 0.35, { o: 0, y: 26 }, { o: 1, y: 0, r: [-0.8, 0.6, -0.5, 0.7, -0.6][i] });
      drawOn(A, c, t0 + i * stp, 0.55);
      drawOn(A, c.querySelector('.no'), t0 + i * stp + 0.35, 0.35);
    });
    arrows.forEach((a, i) => drawOn(A, a, t0 + (i + 1) * stp - 0.25, 0.3));
    const tB = t1 + 0.6;
    drawOn(A, brace, tB, 0.5);
    A.add(bar, tB + 0.3, 0.4, { o: 0, y: 20 }, { o: 1, y: 0 });
    if (label) popIn(A, label, Math.min(D - 1.2, tB + 0.9), -5);
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 680, 600, 1.16, 2, -2.5, -0.5), CAM(1.3, 700, 512, 1.0, 1, -1, 0), CAM(D, 705, 508, 1.02, 0.5, 1, 0.2)] };
  }

  // ============================== 4. checklist 手绘方框逐条打勾 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const RH = 100, R0 = 276;
    const H = R0 + n * RH + (data.note ? 130 : 30);
    const el = h('div', 'cb-zone');
    const card = frame(h('div', 'cb-card', `height:${H}px;`,
      `<div class="hd">${esc(data.kicker || '')}</div><div class="ttl">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div>`), { double: true });
    const hr = svgWrap(P(G.line(RNG(), 40, 250, 860, 250, 3), 'rgba(244,244,238,.75)', 4), 'left:0;top:0;');
    card.appendChild(hr);
    const rows = items.map((it, i) => {
      const rr = RNG();
      const svg = `<svg width="10" height="10" style="overflow:visible">${P(G.rect(rr, 0, 12, 56, 56, 2.5), 'var(--cb-white)', 4)}${P(G.tick(6, 18, 1), 'var(--cb-yellow)', 7)}</svg>`;
      const row = h('div', 'cb-row', `top:${R0 + i * RH}px;`,
        `<div class="cb-fr-svg">${svg}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">#${String(i + 1).padStart(2, '0')}</div><div class="cb-fr-svg ul"></div>`);
      card.appendChild(row); return row;
    });
    let memo = null;
    if (data.note) {
      memo = h('div', 'cb-memo', `top:${R0 + n * RH + 16}px;`, `<small>${esc(data.noteLead || '')}</small>${chalkHTML(data.note)}`);
      frame(memo, { dash: true, color: 'var(--cb-yellow)' });
      card.appendChild(memo);
    }
    const cnt = stamp(`${n}/${n}`, '', 'left:1196px;top:150px;font-size:60px;font-family:var(--cb-num);', 'var(--cb-yellow)');
    const er = propEl(PROPS.eraser(200, 78), 'left:1150px;top:880px;');
    el.append(card, cnt, er);
    A.add(card, 0, 0.4, { o: 0, y: 30 }, { o: 1, y: 0 });
    drawOn(A, card, 0.05, 0.7);
    drawOn(A, hr, 0.7, 0.35);
    A.add(er, 0.8, 0.5, { x: 120, o: 0, r: 10 }, { x: 0, o: 1, r: -3 });
    const t0 = 1.2, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.9 : 1.6)), t0 + 0.75 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    // 每行：方框描出 → 文字写出 → 粉笔黄打勾 → 彩色下划线
    let ulBuilt = false;
    rows.forEach((row, i) => {
      A.add(row, t0 + i * stp - 0.3, 0.25, { o: 0.15, x: -12 }, { o: 1, x: 0 });
      const ps = row.querySelectorAll('.cb-d');
      A.fn((t, ph) => {
        if (ph !== 'post') return;
        [0, 1].forEach((j) => {
          const at = t0 + i * stp - 0.25 + j * 0.3, k = EASE.inOut(clamp01((t - at) / (j ? 0.25 : 0.3)));
          ps[j].style.strokeDashoffset = (1 - k).toFixed(4); ps[j].style.opacity = k > 0 ? '1' : '0';
        });
        const u = row.querySelector('.ul path');
        if (u) { const k = EASE.out(clamp01((t - (t0 + i * stp + 0.15)) / 0.35)); u.style.strokeDashoffset = (1 - k).toFixed(4); u.style.opacity = k > 0 ? '1' : '0'; }
      });
    });
    A.fn((t, ph) => {
      if (ph !== 'pre' || ulBuilt) return;
      rows.forEach((row, i) => {
        const k = row.querySelector('.k'), w = k.offsetWidth;
        if (w > 0) { row.querySelector('.ul').innerHTML = `<svg width="10" height="10" style="overflow:visible">${P(G.wave(96, 62, w + 10, 3, 28), PAL[(i + 1) % 4], 3.5)}</svg>`; ulBuilt = true; }
      });
    });
    if (memo) { A.add(memo, D - 2.3, 0.4, { o: 0, y: 16 }, { o: 1, y: 0 }); drawOn(A, memo, D - 2.3, 0.4); }
    popIn(A, cnt, Math.max(t1 + 0.6, D - 1.6), 8);
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 700, 530, 1.05, 1.5, -2, 0), CAM(1.0, 700, 502, 1.01, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.01, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 5. compare 粉笔划掉 vs 打勾 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'cb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const hd = head(data.title, 'left:58px;top:150px;font-size:90px;');
    const L = frame(h('div', 'cb-cmp wrong', 'left:60px;',
      `<div class="band">${esc(w.label || '✕ WRONG')}</div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div>`), { dash: true, color: 'rgba(244,244,238,.5)' });
    const rr = RNG();
    const strike = svgWrap(P(G.line(rr, 80, 160, 520, 150, 5), 'var(--cb-pink)', 7) + P(G.line(rr, 80, 228, 470, 236, 5), 'var(--cb-pink)', 7) + P(G.line(rr, 90, 120, 470, 270, 6), 'var(--cb-pink)', 4.5), 'left:0;top:290px;');
    const R = frame(h('div', 'cb-cmp right', 'left:800px;',
      `<div class="band">${esc(r.label || '✓ RIGHT')}</div><div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div>`), { double: true, color: 'var(--cb-white)' });
    const bigTick = svgWrap(P(G.tick(1220, 300, 1.9), 'var(--cb-yellow)', 9), 'left:0;top:0;');
    const vs = h('div', 'cb-vs', null, 'VS');
    ring(vs, { color: 'var(--cb-yellow)', pad: 10, w: 4.5, double: true });
    const xs = stamp(w.stamp || '✕', '', 'left:330px;top:648px;font-size:44px;');
    const verdict = frame(h('div', 'cb-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${chalkHTML(data.verdict || '')}</span>`), { double: true, color: 'var(--cb-yellow)' });
    el.append(kick, hd, L, strike, R, bigTick, vs, xs, verdict);
    KICK(A, kick);
    writeIn(A, hd, 0.25, 0.06);
    A.add(L, 0.6, 0.4, { o: 0, x: -30 }, { o: 1, x: 0, r: -0.6 });
    const tStrike = Math.min(D * 0.3, 1.8);
    drawOn(A, strike, tStrike, 0.75);
    popIn(A, xs, tStrike + 0.75, -8);
    A.add(vs, tStrike + 0.3, 0.35, { s: 0.4, o: 0 }, { s: 1, o: 1 }, 'back');
    drawOn(A, vs, tStrike + 0.4, 0.5);
    const tR = Math.min(D * 0.5, tStrike + 1.3);
    A.add(R, tR, 0.4, { o: 0, x: 30 }, { o: 1, x: 0, r: 0.6 });
    drawOn(A, R, tR, 0.6);
    drawOn(A, bigTick, tR + 0.7, 0.35);
    const tV = Math.min(D - 1.6, tR + 1.3);
    A.add(verdict, tV, 0.4, { o: 0, y: 24 }, { o: 1, y: 0 });
    drawOn(A, verdict, tV, 0.6);
    writeIn(A, verdict.querySelector('span'), tV + 0.2, 0.05);
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 690, 540, 1.12, 1, -2.5, 0), CAM(1.1, 700, 506, 1.0, 0.5, -1, 0), CAM(D, 702, 510, 1.02, 0.5, 1.2, 0)] };
  }

  // ============================== 6. timeline 粉笔长轴 ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'cb-zone', `width:${W}px;`);
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const hd = head(data.title, 'left:58px;top:150px;font-size:90px;');
    const r = RNG();
    const axis = svgWrap(P(G.wave(60, 553, W - 150, 3, 60), 'var(--cb-white)', 5) + G.arrow(r, W - 140, 553, W - 70, 553, 0.02, 22).map((d) => P(d, 'var(--cb-white)', 5)).join(''), 'left:0;top:0;');
    el.append(kick, hd, axis);
    const t0 = 1.1, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 296 : 628, at = t0 + i * stp, isNow = i === now;
      const card = frame(h('div', `cb-tl-node${isNow ? ' now' : ''}`, `left:${x}px;top:${top}px;`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`), isNow ? { double: true, color: 'var(--cb-pink)' } : { dash: true, color: 'rgba(244,244,238,.6)' });
      const stem = svgWrap(P(G.line(RNG(), x + 36, up ? 492 : 566, x + 36, up ? 538 : 626, 2), 'rgba(244,244,238,.7)', 3.5), 'left:0;top:0;');
      const dot = h('div', `cb-tl-dot${isNow ? ' now' : ''}`, `left:${x + 21}px;top:538px;`);
      el.append(stem, dot, card);
      A.add(dot, at - 0.1, 0.3, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
      drawOn(A, stem, at, 0.2);
      A.add(card, at + 0.05, 0.35, { o: 0, y: up ? -20 : 20 }, { o: 1, y: 0, r: [-0.8, 0.7, -0.6, 0.8][i % 4] });
      if (isNow) drawOn(A, card, at + 0.05, 0.5);
      return { x, up, top, at };
    });
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const sx = Math.min(W - 300, p.x + (p.up ? 40 : 110)), sy = p.up ? 640 : p.top + 222;
      const ns = stamp(data.nowLabel, data.nowSmall || '', `left:${sx}px;top:${sy}px;font-size:40px;`, 'var(--cb-yellow)');
      el.appendChild(ns);
      popIn(A, ns, Math.min(D - 1.0, p.at + 0.7), -6);
    }
    KICK(A, kick);
    writeIn(A, hd, 0.25, 0.06);
    drawOn(A, axis, 0.5, 0.8);
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 690, 540, 1.08, 1.5, -2.5, -0.4), CAM(1.0, 700, 510, 1.0, 1, -1, 0), CAM(Math.max(1.1, tEnd + 0.3), endX, 510, 1.0, 0.5, 1, 0), CAM(D, endX + 8, 506, 1.02, 0.3, 1, 0.2)] };
  }

  // ============================== 7. diagram 板书关系图 ==============================
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
  function linkGeom(a, b, NW, NH) {
    const ax = a.x + NW / 2, ay = a.y + NH / 2, bx = b.x + NW / 2, by = b.y + NH / 2, dx = bx - ax, dy = by - ay;
    let p0, p1, c1, c2;
    if (Math.abs(dx) * NH >= Math.abs(dy) * NW) {
      const sx = Math.sign(dx) || 1; p0 = { x: ax + sx * (NW / 2 + 10), y: ay }; p1 = { x: bx - sx * (NW / 2 + 14), y: by };
      const mx = (p0.x + p1.x) / 2; c1 = { x: mx, y: p0.y }; c2 = { x: mx, y: p1.y };
    } else {
      const sy = Math.sign(dy) || 1; p0 = { x: ax, y: ay + sy * (NH / 2 + 10) }; p1 = { x: bx, y: by - sy * (NH / 2 + 14) };
      const my = (p0.y + p1.y) / 2; c1 = { x: p0.x, y: my }; c2 = { x: p1.x, y: my };
    }
    const e = bez(p0, c1, c2, p1, 0.94), ux = p1.x - e.x, uy = p1.y - e.y, ul = Math.hypot(ux, uy) || 1;
    const hx = ux / ul, hy = uy / ul, a1 = 0.5, HL = 22;
    const head = `M${f1(p1.x - HL * (hx * Math.cos(a1) - hy * Math.sin(a1)))} ${f1(p1.y - HL * (hy * Math.cos(a1) + hx * Math.sin(a1)))} L${f1(p1.x)} ${f1(p1.y)} L${f1(p1.x - HL * (hx * Math.cos(-a1) - hy * Math.sin(-a1)))} ${f1(p1.y - HL * (hy * Math.cos(-a1) + hx * Math.sin(-a1)))}`;
    return { p0, p1, c1, c2, mid: bez(p0, c1, c2, p1, 0.5), head, d: `M${f1(p0.x)} ${f1(p0.y)} C${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(p1.x)} ${f1(p1.y)}` };
  }
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 300, AW = 1280, AH = 600, NW = 260, NH = 124;
    const el = h('div', 'cb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const hd = head(data.title, 'left:58px;top:150px;font-size:90px;');
    el.append(kick, hd);
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.36) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.7 + i * stp;
      const e = frame(h('div', 'cb-dg-node', `left:${x}px;top:${y}px;`, `<div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`), { color: PAL[i % 4], double: nd.id === data.focus });
      el.appendChild(e);
      A.add(e, appear[nd.id], 0.35, { o: 0, s: 0.92 }, { o: 1, s: 1, r: [-0.8, 0.7, -0.5, 0.8][i % 4] });
      drawOn(A, e, appear[nd.id], 0.45);
      return e;
    });
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    const lnks = geo.map((g, j) => {
      if (!g) return null;
      const s = svgWrap(P(g.d, 'rgba(244,244,238,.85)', 4.5) + P(g.head, 'rgba(244,244,238,.85)', 4.5) +
        `<circle class="pl" r="7" fill="var(--cb-yellow)" opacity="0"/><circle class="pl" r="5" fill="var(--cb-blue)" opacity="0"/>`, 'left:0;top:0;z-index:2;');
      el.insertBefore(s, el.firstChild);
      drawOn(A, s, tDraw[j], 0.5);
      return s;
    });
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'cb-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'cb-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.45, 0.3, { s: 0.5, o: 0 }, { s: 1, o: 1, r: -2 }, 'back');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 2.0, 0.7 + nodes.length * stp + 0.9);
    let focusRing = null;
    if (fi >= 0) {
      const p = pos[data.focus];
      focusRing = svgWrap(P(G.ellipse(RNG(), p.x + NW / 2, p.y + NH / 2, NW / 2 + 40, NH / 2 + 30), 'var(--cb-yellow)', 5.5) + P(G.ellipse(RNG(), p.x + NW / 2 + 4, p.y + NH / 2 - 3, NW / 2 + 52, NH / 2 + 38, 1.0), 'var(--cb-yellow)', 3), 'left:0;top:0;z-index:7;');
      el.appendChild(focusRing);
      drawOn(A, focusRing, tF, 0.6);
      if (data.focusLabel) {
        const st = stamp(data.focusLabel, data.focusSmall || '', `left:${Math.min(1190, p.x + NW + 40)}px;top:${p.y - 64}px;font-size:34px;`, 'var(--cb-pink)');
        el.appendChild(st);
        popIn(A, st, tF + 0.35, -7);
      }
    }
    KICK(A, kick);
    writeIn(A, hd, 0.25, 0.06);
    A.fn((t, ph) => {
      if (ph !== 'post') return;
      lnks.forEach((s, j) => {
        if (!s) return; const g = geo[j], live = t - tDraw[j] - 0.6;
        s.querySelectorAll('.pl').forEach((c, k) => {
          if (live < 0) { c.setAttribute('opacity', '0'); return; }
          const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.5 + k * 0.5) % 1);
          c.setAttribute('opacity', '0.95'); c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1));
        });
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 690, 570, 1.12, 1.5, -2.5, -0.4), CAM(1.2, 700, 520, 1.0, 1, -1, 0), CAM(D, 708, 516, 1.03, 0.5, 1, 0.2)] };
  }

  // ============================== 8. showcase 原木框石板 / 磁吸纸张 / 照片 ==============================
  const DEVICE_SVG = () => `<svg viewBox="0 0 400 300"><g fill="none" stroke="#F4F4EE" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M42 90 Q200 84 358 92 L356 258 Q200 262 44 256 Z"/><path d="M82 88 L90 58 L170 60 L176 90"/></g><circle cx="200" cy="174" r="62" fill="none" stroke="#FFE066" stroke-width="7"/><circle cx="200" cy="174" r="26" fill="none" stroke="#74C0FC" stroke-width="6"/><path d="M300 108 h34 v20 h-34 z" fill="none" stroke="#FF8787" stroke-width="5"/><text x="200" y="294" text-anchor="middle" font-family="Consolas, monospace" font-size="20" font-weight="700" fill="rgba(244,244,238,.7)" letter-spacing="4">PRODUCT IMAGE</text></svg>`;
  function productPanel(data) {
    const el = h('div', 'cb-prod');
    const pic = frame(h('div', 'pic'), { dash: true, color: 'rgba(244,244,238,.55)' });
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.insertAdjacentHTML('beforeend', DEVICE_SVG());
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? stamp(data.price, data.priceSmall || '', 'right:70px;bottom:56px;font-size:46px;') : null;
    if (price) el.appendChild(price);
    return { el, pic, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'cb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const hd = head(data.title, 'left:58px;top:146px;font-size:80px;');
    const paper = kind === 'doc';
    const panel = h('div', `cb-panel ${paper ? 'paper' : 'slate'}`, null, `<div class="bar"><i></i><i></i><i></i><span>${esc(data.file || kind.toUpperCase())}</span></div>`);
    if (paper) { panel.insertAdjacentHTML('beforeend', '<div class="cb-magnet" style="left:90px;background:#FF8787"></div><div class="cb-magnet" style="right:90px;background:#74C0FC"></div>'); }
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'cb-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'cb-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', 'cb-code'); panel.appendChild(codeEl); }
    const NC = ['var(--cb-yellow)', 'var(--cb-blue)', 'var(--cb-pink)'];
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 262 + 640 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      const ar = G.arrow(RNG(), 74, 22, 4, 22, 0.25, 14).map((d) => P(d, NC[i], 4.5)).join('');
      const c = h('div', 'cb-callout', `left:${px.toFixed(0)}px;top:${(py - 26).toFixed(0)}px;`, `<div style="position:relative;width:80px;height:44px"><svg width="80" height="44" style="overflow:visible">${ar}</svg></div><span style="color:${NC[i]}">${esc(nt.text)}</span>`);
      frame(c.querySelector('span'), { dash: true, color: NC[i] });
      return c;
    });
    const tag = stamp(kind.toUpperCase(), '', 'left:1178px;top:196px;font-size:30px;font-family:var(--cb-mono);', 'var(--cb-pink)');
    const ck = propEl(PROPS.chalk(96, '#F4F4EE'), 'left:1190px;top:930px;');
    el.append(kick, hd, panel, ...notes, tag, ck);
    KICK(A, kick);
    writeIn(A, hd, 0.25, 0.06);
    A.add(panel, 0.35, 0.55, { y: 60, o: 0, r: -1.5, s: 0.96 }, { y: 0, o: 1, r: paper ? -0.8 : 0, s: 1 }, 'soft');
    A.add(ck, 0.9, 0.4, { x: 80, o: 0, r: 20 }, { x: 0, o: 1, r: -6 });
    popIn(A, tag, 0.95, 6);
    const tType0 = 1.0, tType1 = Math.max(tType0 + 0.6, D * 0.6);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.9 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => {
      A.add(p, tN0 + i * nStep, 0.35, { o: 0, x: 30 }, { o: 1, x: 0, r: [-2, 1.5, -1.5][i] });
      drawOn(A, p, tN0 + i * nStep, 0.35);
    });
    if (prod) {
      A.add(prod.pic, 0.8, 0.45, { s: 0.9, o: 0 }, { s: 1, o: 1, r: -1 }, 'back');
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.28, 0.35, { x: 40, o: 0 }, { x: 0, o: 1 }));
      if (prod.price) popIn(A, prod.price, Math.min(D - 1.2, 1.3 + prod.rows.length * 0.28 + 0.3), -7);
    }
    A.fn((t, ph) => {
      if (ph !== 'post') return;
      if (codeEl) {
        let budget = Math.floor(total * clamp01((t - tType0) / (tType1 - tType0))), html = '', cur = false;
        lines.forEach((l, i) => {
          const tx = String(l.t != null ? l.t : l), cls = l.c || '';
          const k = Math.min(tx.length, budget); budget -= k;
          if (k <= 0 && i > 0) return;
          html += `<span class="ln">${String(i + 1).padStart(2, '0')}</span>${cls ? `<span class="${cls}">${esc(tx.slice(0, k))}</span>` : esc(tx.slice(0, k))}`;
          if (k < tx.length && !cur) { html += Math.floor(t * 2.5) % 2 ? '<span class="cur">_</span>' : '<span class="cur" style="opacity:0">_</span>'; cur = true; }
          html += '\n';
        });
        codeEl.innerHTML = html;
      }
      if (media && media.tagName === 'VIDEO' && media.readyState >= 1 && media.duration) {
        const want = Math.max(0, t - 0.3) % media.duration;
        if (media.paused && Math.abs(media.currentTime - want) > 0.08) { try { media.currentTime = want; } catch (_) {} }
      }
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); }, media,
      cams: [CAM(0, 700, 580, 0.95, 1.5, -1.5, 0), CAM(1.2, 700, 526, 1.0, 1, -1.5, 0), CAM(D, 712, 540, 1.04, 1, 1.2, 0)] };
  }

  // ============================== 9. quote 全屏人像 + 手持小黑板金句（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'cb-scr');
    const right = data.pos === 'right';
    const side = right ? 'right:80px;' : 'left:80px;';
    const card = h('div', 'cb-q', side, `<div class="k">${esc(data.kicker || 'QUOTE')}</div><div class="t">${chalkHTML(data.text)}</div><div class="by">${esc(data.by || '')}</div><div class="tray"></div>`);
    const sTop = (data.stampTop || 690) + 44;
    const st = stamp(data.stamp || '', data.stampSmall || '', `${right ? 'right:150px;' : 'left:150px;'}top:${sTop}px;font-size:58px;`, 'var(--cb-pink)');
    const ck = propEl(PROPS.chalk(92, '#FFE066'), `${right ? 'right:470px;' : 'left:470px;'}top:${sTop + 70}px;`);
    el.append(card, ck, st);
    const dir = right ? 1 : -1;
    A.add(card, 0.35, 0.6, { x: dir * 760, o: 1, r: dir * 6 }, { x: 0, o: 1, r: dir * 1.2 }, 'soft');
    A.add(card, -1, 0.01, { o: 0, x: dir * 760 }, { o: 0, x: dir * 760 });
    const tE = writeIn(A, card.querySelector('.t'), 0.95, 0.09);
    A.add(ck, 0.9, 0.4, { y: 40, o: 0 }, { y: 0, o: 1, r: right ? 10 : -10 });
    popIn(A, st, Math.min(D - 1.1, tE + 0.2), right ? 7 : -7);
    return { el, layer: 'screen', avatar: 'full', update: (t) => { buildAll(el); A.update(t); }, cams: [CAM(0), CAM(D)] };
  }

  // ============================== 10. outro 行动清单 + 一键三连逐个打勾 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'cb-zone');
    const kick = kicker(data.kicker, 'left:60px;top:102px;');
    const hd = head(data.title, 'left:58px;top:146px;font-size:90px;');
    const tagC = ['var(--cb-blue)', 'var(--cb-pink)', 'var(--cb-yellow)'];
    const acts = (data.actions || []).slice(0, 3).map((a, i) => frame(h('div', 'cb-act', `top:${272 + i * 180}px;`,
      `<div class="tg" style="color:${tagC[i]}">${esc(a.tag || 'ACTION')}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div><div class="no">${String(i + 1).padStart(2, '0')}</div>`), { dash: true, color: 'rgba(244,244,238,.6)' }));
    const c = data.cta || {};
    const cta = frame(h('div', 'cb-cta', null, `<div class="k">${esc(c.kicker || 'OPEN SOURCE')}</div><div class="t">${esc(c.title || '')}</div><div class="repo">${esc(c.repo || '')}</div><div class="btns">${(c.buttons || []).slice(0, 3).map((b) => `<div>${esc(b)}</div>`).join('')}</div>`), { double: true, color: 'var(--cb-yellow)' });
    const btns = Array.from(cta.querySelectorAll('.btns > div'));
    btns.forEach((b, i) => { ring(b, { color: PAL[(i + 1) % 4], pad: 16, w: 4 }); b.insertAdjacentHTML('beforeend', `<div class="cb-fr-svg"><svg width="10" height="10" style="overflow:visible">${P(G.tick(-6, -40, 0.75), 'var(--cb-yellow)', 6)}</svg></div>`); });
    const go = stamp(c.stamp || 'GO', c.stampSmall || '', 'left:1100px;top:752px;font-size:66px;', 'var(--cb-pink)');
    const er = propEl(PROPS.eraser(220, 84), 'left:760px;top:808px;');
    el.append(kick, hd, ...acts, cta, er, go);
    KICK(A, kick);
    writeIn(A, hd, 0.25, 0.07);
    const t0 = 0.8, stp = Math.min(0.6, (D * 0.35) / Math.max(1, acts.length));
    acts.forEach((a, i) => A.add(a, t0 + i * stp, 0.4, { x: -40, o: 0 }, { x: 0, o: 1, r: [-0.6, 0.5, -0.4][i] }));
    const tC = t0 + acts.length * stp + 0.05;
    A.add(cta, tC, 0.4, { o: 0, y: 24 }, { o: 1, y: 0, r: 0.5 });
    drawOn(A, cta, tC, 0.6);
    A.add(er, tC + 0.3, 0.5, { x: 120, o: 0, r: 8 }, { x: 0, o: 1, r: -3 });
    const tP = tC + 0.8;
    btns.forEach((b, i) => drawOn(A, b, tP + i * 0.45, 0.4));
    popIn(A, go, Math.min(D - 1.0, tP + btns.length * 0.45 + 0.2), -9);
    return { el, layer: 'world', avatar: 'card', update: (t) => { buildAll(el); A.update(t); },
      cams: [CAM(0, 690, 540, 1.08, 1, -2.5, 0), CAM(1.2, 700, 508, 1.0, 0.5, -0.8, 0), CAM(D, 700, 504, 0.99, 0, 0.8, 0)] };
  }

  global.Chalkboard = {
    version: '1.0.0',
    PROPS, G, Animator, EASE, injectCSS, chalkHTML,
    COMPONENTS: {
      cover: { create: cover }, stat: { create: stat }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, timeline: { create: timeline }, diagram: { create: diagram },
      showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro }
    }
  };
})(window);
