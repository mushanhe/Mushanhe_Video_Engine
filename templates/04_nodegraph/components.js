/**
 * Mushanhe Video Engine — 风格包 04 · 3D 节点工作流（Node Graph）
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print / 06_neobrutalism 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · steps · checklist · compare · showcase[code|terminal|doc|image|video|product] · quote · outro · stat · timeline · diagram
 *
 *   const comp = NodeGraph.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : {
 *     el      : HTMLElement  组件根节点（1400×1100 的局部坐标区，timeline 超 5 节点时 w 加宽）
 *     layer   : 'world' | 'screen'   world=挂在 3D 蓝图画布上 / screen=屏幕层（全屏人像上的贴卡）
 *     avatar  : 'card' | 'pip' | 'corner' | 'full'
 *     cams    : [{ t, x, y, zoom, rx, ry, rz }]  局部坐标运镜关键帧（交给 core/camera-rig.js）
 *     update(localT)                 按本段局部时间渲染（确定性，任意 seek 可还原）
 *   }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：#0A0D14 暗蓝图点阵 · #121722 直角节点卡（3px 圆角上限）· 1.5px 发光描边 · 5px 贝塞尔电缆 + 白芯光球
 *           青 #38BDF8 / 紫 #A78BFA / 翡翠 #00E5C3 / 琥珀 #FFB84D（+ 珊瑚 #FF4D6D 只用于错误态）。
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
    back: (x) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    /** 机械吸附：快速到位 + 一次轻微过冲 */
    snap: (x) => { if (x < 0.6) return EASE.out(x / 0.6) * 1.02; return 1.02 - 0.02 * EASE.inOut((x - 0.6) / 0.4); }
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = (v) => v.toFixed(1);

  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(w, hgt, cls) { return sv('svg', { width: w, height: hgt, viewBox: `0 0 ${w} ${hgt}`, class: cls || '' }); }

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
        el.style.transform = `translate(${f1(st.x)}px, ${f1(st.y)}px) rotate(${st.r.toFixed(2)}deg) scale(${(st.s * st.sx).toFixed(4)}, ${st.s.toFixed(4)})`;
        el.style.opacity = clamp01(st.o).toFixed(3);
      });
      this.fns.forEach((f) => f(t));
    }
  }

  const C = { cyan: 'var(--ng-cyan)', violet: 'var(--ng-violet)', jade: 'var(--ng-jade)', amber: 'var(--ng-amber)', coral: 'var(--ng-coral)' };
  const PALETTE = [C.cyan, C.violet, C.jade, C.amber];
  let SEQ = 0;

  /** "这句**关键词**话" → ** 包裹部分做翡翠发光高亮 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }
  function kicker(text, style) { return h('div', 'ng-kicker', style, `<i></i>${esc(text)}`); }
  function head(text, style) { return h('div', 'ng-head', style, mark(text)); }
  /** 等宽小芯片（节点参数 / 状态标签） */
  function chip(text, color, style, small) { return h('div', 'ng-chip', `--nc:${color};${style || ''}`, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`); }

  /** 首帧测量：nowrap 文本超过可用宽度时等比缩字号 */
  function fitWidth(el, avail) {
    const w = el.scrollWidth; if (!(w > 0)) return false;
    if (w > avail) el.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(el).fontSize) * avail / w)}px`;
    return true;
  }

  // ============================== 直角工作流节点 ==============================
  function node(x, y, w, color, id, body, opt = {}) {
    const e = h('div', `ng-node${opt.cls ? ' ' + opt.cls : ''}`, `left:${x}px;top:${y}px;width:${w}px;${opt.h ? `height:${opt.h}px;` : ''}--nc:${color};${opt.style || ''}`,
      `<div class="nh"><span class="id">${esc(id)}</span><b class="st">${esc(opt.st || 'IDLE')}</b><i></i></div><div class="nb">${body || ''}</div>`);
    e._st = e.querySelector('.nh .st');
    return e;
  }
  /** 节点状态机：tLit 前暗置 → RUN 发光 → tDone 后完成 ✓ */
  function nodeState(e, t, tLit, tDone, labels) {
    const L = labels || ['IDLE', 'RUN', 'DONE ✓'];
    const lit = t >= tLit, done = tDone != null && t >= tDone;
    e.classList.toggle('lit', lit); e.classList.toggle('done', done);
    const s = done ? L[2] : lit ? L[1] : L[0];
    if (e._st.textContent !== s) e._st.textContent = s;
  }

  // ============================== 贝塞尔电缆层（发光 + 流动信号光球） ==============================
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
  /** 水平出线（节点端口在左右两侧） */
  const hPath = (p0, p1) => { const k = Math.max(46, Math.abs(p1.x - p0.x) * 0.5); return [p0, { x: p0.x + k, y: p0.y }, { x: p1.x - k, y: p1.y }, p1]; };
  /** 垂直出线（上下端口） */
  const vPath = (p0, p1) => { const s = Math.sign(p1.y - p0.y) || 1, k = Math.max(30, Math.abs(p1.y - p0.y) * 0.5); return [p0, { x: p0.x, y: p0.y + s * k }, { x: p1.x, y: p1.y - s * k }, p1]; };

  function CableLayer(W, H) {
    const fid = `ngcg${++SEQ}`;
    const s = svgRoot(W, H, 'ng-cables');
    s.innerHTML = `<defs><filter id="${fid}" filterUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    const gBase = sv('g', {}, s), gLit = sv('g', {}, s), gPort = sv('g', {}, s), gOrb = sv('g', {}, s);
    const list = [];
    function add(pts, color, tOn, opt = {}) {
      const [p0, c1, c2, p1] = pts;
      const d = `M${f1(p0.x)} ${f1(p0.y)} C${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(p1.x)} ${f1(p1.y)}`;
      const lut = [{ l: 0, x: p0.x, y: p0.y }]; let len = 0, prev = p0;
      for (let k = 1; k <= 48; k++) { const q = bez(p0, c1, c2, p1, k / 48); len += Math.hypot(q.x - prev.x, q.y - prev.y); lut.push({ l: len, x: q.x, y: q.y }); prev = q; }
      const base = sv('path', { d, class: 'cb-base' }, gBase);
      const lit = sv('path', { d, class: 'cb-lit', filter: `url(#${fid})`, style: `stroke:${color};opacity:0` }, gLit);
      if (opt.broken) lit.setAttribute('stroke-dasharray', '16 14');
      else { lit.setAttribute('stroke-dasharray', f1(len)); lit.setAttribute('stroke-dashoffset', f1(len)); }
      const ports = [p0, p1].map((p) => sv('circle', { cx: f1(p.x), cy: f1(p.y), r: 8, class: 'cb-port', style: `fill:${color};opacity:.35` }, gPort));
      const orbs = opt.broken ? [] : Array.from({ length: opt.orbs != null ? opt.orbs : 3 }, () => {
        const g = sv('g', { opacity: 0 }, gOrb);
        sv('circle', { r: 9, style: `fill:${color}`, filter: `url(#${fid})` }, g);
        sv('circle', { r: 4.2, fill: '#FFFFFF' }, g);
        return g;
      });
      const cb = { lut, len, lit, base, ports, orbs, tOn, opt, mid: bez(p0, c1, c2, p1, 0.5) };
      list.push(cb); return cb;
    }
    function at(cb, l) {
      const L = cb.lut; let i = 1;
      while (i < L.length - 1 && L[i].l < l) i++;
      const a = L[i - 1], b = L[i], k = clamp01((l - a.l) / Math.max(0.001, b.l - a.l));
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    function update(t) {
      list.forEach((cb) => {
        const dd = cb.opt.drawDur || 0.5;
        const p = cb.opt.prog ? cb.opt.prog(t) : EASE.inOut(clamp01((t - cb.tOn) / dd));
        if (cb.opt.broken) {
          cb.lit.style.opacity = p > 0 ? (Math.sin(t * 19) > -0.2 ? 0.95 : 0.25).toFixed(2) : '0';
          cb.lit.setAttribute('stroke-dashoffset', f1(-t * 20));
        } else {
          cb.lit.style.opacity = p > 0 ? '1' : '0';
          cb.lit.setAttribute('stroke-dashoffset', f1(cb.len * (1 - p)));
        }
        const gh = cb.opt.ghost && t < cb.tOn - 0.15;
        cb.base.style.opacity = gh ? '0' : '1';
        cb.ports[0].style.opacity = gh ? '0' : p > 0 ? '1' : '.35';
        cb.ports[1].style.opacity = gh ? '0' : p >= 0.98 ? '1' : '.35';
        const live = t - (cb.opt.orbAt != null ? cb.opt.orbAt : cb.tOn + dd), spd = cb.opt.speed || 300, reach = cb.len * p;
        cb.orbs.forEach((o, k) => {
          if (live < 0 || reach < 10) { o.setAttribute('opacity', '0'); return; }
          const u = ((live * spd) / cb.len + k / cb.orbs.length) % 1;
          const q = at(cb, u * reach);
          o.setAttribute('transform', `translate(${f1(q.x)} ${f1(q.y)})`);
          o.setAttribute('opacity', (0.3 + 0.7 * Math.sin(Math.PI * u)).toFixed(2));
        });
      });
    }
    return { el: s, add, update };
  }

  // ============================== 硬核工业仪表 ==============================
  /** 示波器：网格 + 发光波形（确定性，按 t 驱动） */
  function Scope(w, hgt, color) {
    const fid = `ngsc${++SEQ}`, mid = hgt / 2;
    const s = svgRoot(w, hgt, 'ng-scope');
    let grid = '';
    for (let x = 0; x <= w; x += 40) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${hgt}"/>`;
    for (let k = 1; k < 4; k++) grid += `<line x1="0" y1="${(hgt * k / 4).toFixed(1)}" x2="${w}" y2="${(hgt * k / 4).toFixed(1)}"/>`;
    s.innerHTML = `<defs><filter id="${fid}" filterUnits="userSpaceOnUse" x="-10" y="-10" width="${w + 20}" height="${hgt + 20}"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="rgba(56,189,248,0.12)" stroke-width="1">${grid}</g><line x1="0" y1="${mid}" x2="${w}" y2="${mid}" stroke="rgba(148,163,184,0.28)" stroke-dasharray="4 6"/>`;
    const pl = sv('polyline', { fill: 'none', style: `stroke:${color}`, 'stroke-width': 2.6, 'stroke-linejoin': 'round', filter: `url(#${fid})` }, s);
    return {
      el: s,
      update(t, amp = 1) {
        let pts = '';
        for (let x = 0; x <= w; x += 5) {
          const u = x / w, env = Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(u * 7 + t * 4.7));
          const y = mid + (Math.sin(u * 46 + t * 31) * 0.62 + Math.sin(u * 17 - t * 13) * 0.38) * amp * hgt * 0.38 * env;
          pts += `${x},${y.toFixed(1)} `;
        }
        pl.setAttribute('points', pts);
      }
    };
  }
  /** 刻度尺（每 5 格一长刻度） */
  function ruler(w, n = 20, labels) {
    let s = `<svg class="ng-ruler" width="${w}" height="22" viewBox="0 0 ${w} 22">`;
    for (let i = 0; i <= n; i++) { const x = 1 + (w - 2) * i / n, big = i % 5 === 0; s += `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${big ? 12 : 6}" stroke="${big ? '#64748B' : '#334155'}" stroke-width="${big ? 2 : 1.4}"/>`; }
    if (labels) labels.forEach((lb, i) => { const x = 1 + (w - 2) * i / (labels.length - 1); s += `<text x="${x.toFixed(1)}" y="21" text-anchor="${i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}" font-family="Consolas, monospace" font-size="10" font-weight="900" fill="#475569">${esc(lb)}</text>`; });
    return s + '</svg>';
  }
  /** 环形仪表：底环 + 发光进度弧 + 外圈刻度 + 中心读数 */
  function Ring(size, color) {
    const fid = `ngrg${++SEQ}`, c = size / 2, r = c - 22, Cc = 2 * Math.PI * r;
    let ticks = '';
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r0 = c - 8, r1 = c - (i % 5 === 0 ? 16 : 12); ticks += `<line x1="${(c + r0 * Math.sin(a)).toFixed(1)}" y1="${(c - r0 * Math.cos(a)).toFixed(1)}" x2="${(c + r1 * Math.sin(a)).toFixed(1)}" y2="${(c - r1 * Math.cos(a)).toFixed(1)}"/>`; }
    const el = h('div', 'ng-ring', `width:${size}px;height:${size}px;`,
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><filter id="${fid}" filterUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="#334155" stroke-width="2">${ticks}</g><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#1E293B" stroke-width="12"/><circle class="arc" cx="${c}" cy="${c}" r="${r}" fill="none" style="stroke:${color}" stroke-width="12" stroke-dasharray="${Cc.toFixed(1)}" stroke-dashoffset="${Cc.toFixed(1)}" transform="rotate(-90 ${c} ${c})" filter="url(#${fid})"/></svg><div class="rv"></div>`);
    const arc = el.querySelector('.arc'), rv = el.querySelector('.rv');
    return { el, set(p, text, sub) { arc.setAttribute('stroke-dashoffset', (Cc * (1 - clamp01(p))).toFixed(1)); const v = `${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}`; if (rv.innerHTML !== v) rv.innerHTML = v; } };
  }
  /** 状态灯排 */
  function leds(n, color) { return `<span class="ng-leds" style="--nc:${color}">${'<i></i>'.repeat(n)}</span>`; }
  function setLeds(el, k, t) { if (!el) return; el.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i < k || (k < 0 && Math.sin(t * 6 + i * 1.3) > 0.2))); }
  /** 发光对勾（stroke 描绘） */
  const CHECK = (size = 34) => `<svg width="${size}" height="${size}" viewBox="0 0 40 40" style="overflow:visible"><path class="ng-ck" d="M6 21 L16 31 L34 9" fill="none" stroke="#06080D" stroke-width="7" stroke-linecap="square" stroke-linejoin="miter" stroke-dasharray="48" stroke-dashoffset="48"/></svg>`;
  function drawCheck(path, p) { if (path) path.setAttribute('stroke-dashoffset', (48 * (1 - clamp01(p))).toFixed(1)); }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .ng-zone{position:absolute;width:1400px;height:1100px;font-family:var(--ng-font-cn);color:var(--ng-text)}
  .ng-cables{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .cb-base{fill:none;stroke:rgba(148,163,184,.2);stroke-width:5;stroke-linecap:round}
  .cb-lit{fill:none;stroke-width:5;stroke-linecap:round}
  .cb-port{stroke:#0A0D14;stroke-width:3}
  .ng-kicker{position:absolute;display:flex;align-items:center;gap:10px;padding:7px 16px 7px 12px;background:rgba(10,14,22,.94);border:1.5px solid rgba(56,189,248,.35);border-left:5px solid var(--ng-cyan);color:var(--ng-cyan);font-family:var(--ng-font-mono);font-size:20px;font-weight:900;letter-spacing:.16em;white-space:nowrap;z-index:4}
  .ng-kicker i{width:9px;height:9px;border-radius:50%;background:var(--ng-jade);box-shadow:0 0 10px var(--ng-jade)}
  .ng-head{position:absolute;font-size:80px;font-weight:900;color:#F8FAFC;letter-spacing:-.01em;line-height:1.1;white-space:nowrap;z-index:4;text-shadow:0 4px 24px rgba(0,0,0,.6)}
  .ng-zone em,.ng-q em{font-style:normal;color:var(--ng-jade);text-shadow:0 0 22px color-mix(in srgb,var(--ng-jade) 55%,transparent)}
  .ng-chip{position:absolute;z-index:6;padding:7px 14px;background:#0A0E16;border:1.5px solid var(--nc);color:var(--nc);font-family:var(--ng-font-mono);font-size:19px;font-weight:900;letter-spacing:.1em;white-space:nowrap;box-shadow:0 10px 26px rgba(0,0,0,.55),0 0 18px color-mix(in srgb,var(--nc) 25%,transparent);line-height:1.15}
  .ng-chip small{display:block;font-size:.62em;letter-spacing:.2em;color:#94A3B8;margin-top:3px}
  .ng-chip.solid{background:var(--nc);color:#06080D}
  .ng-chip.solid small{color:#06080D;opacity:.75}
  /* 节点 */
  .ng-node{position:absolute;z-index:3;border-radius:3px;background:var(--ng-node);border:1.5px solid rgba(255,255,255,.12);box-shadow:0 24px 54px rgba(0,0,0,.62);overflow:hidden;box-sizing:border-box}
  .ng-node:not(.lit) .nb{filter:saturate(.25) brightness(.62)}
  .ng-node.lit{border-color:var(--nc);box-shadow:0 24px 54px rgba(0,0,0,.66),0 0 32px color-mix(in srgb,var(--nc) 26%,transparent)}
  .ng-node .nh{height:42px;padding:0 14px 0 16px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,color-mix(in srgb,var(--nc) 30%,var(--ng-node)),var(--ng-node) 85%);border-bottom:1px solid rgba(255,255,255,.1);font-family:var(--ng-font-mono);font-size:15px;font-weight:900;color:#FFFFFF;letter-spacing:.08em;white-space:nowrap;box-sizing:border-box}
  .ng-node .nh .id{overflow:hidden;text-overflow:ellipsis}
  .ng-node .nh .st{margin-left:auto;padding:2px 8px;font-size:12px;background:#1E293B;color:#94A3B8;letter-spacing:.1em;flex:none}
  .ng-node.lit .nh .st{background:color-mix(in srgb,var(--nc) 22%,#0A0E16);color:var(--nc)}
  .ng-node.done .nh .st{background:var(--ng-jade);color:#06080D}
  .ng-node .nh i{width:11px;height:11px;border-radius:50%;background:#334155;flex:none}
  .ng-node.lit .nh i{background:var(--nc);box-shadow:0 0 10px var(--nc)}
  .ng-node .nb{position:relative;padding:16px 18px}
  .ng-np{margin-top:9px;padding:9px 12px;background:#0A0E16;border:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:16px;font-family:var(--ng-font-mono);font-size:16px;font-weight:800;color:#64748B;white-space:nowrap}
  .ng-np .pv{color:#94A3B8;overflow:hidden;text-overflow:ellipsis}
  .ng-np.on{border-color:var(--nc);color:#FFFFFF;background:color-mix(in srgb,var(--nc) 14%,#0A0E16)}
  .ng-np.on .pv{color:var(--nc)}
  .ng-scope{display:block;background:#06080D;border:1px solid rgba(255,255,255,.08)}
  .ng-ruler{display:block}
  .ng-leds{display:inline-flex;gap:6px;vertical-align:middle}
  .ng-leds i{width:10px;height:10px;border-radius:50%;background:#1E293B;display:inline-block}
  .ng-leds i.on{background:var(--nc);box-shadow:0 0 8px var(--nc)}
  .ng-ring{position:relative}
  .ng-ring svg{position:absolute;inset:0;overflow:visible}
  .ng-ring .rv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--ng-font-mono);font-size:50px;font-weight:900;color:#FFFFFF;line-height:1}
  .ng-ring .rv small{font-size:13px;letter-spacing:.2em;color:#94A3B8;margin-top:8px}
  .ng-track{position:relative;height:16px;background:#06080D;border:1px solid rgba(255,255,255,.1)}
  .ng-track i{position:absolute;left:0;top:0;bottom:0;width:100%;background:var(--nc);box-shadow:0 0 14px var(--nc);transform-origin:left center;transform:scaleX(0)}
  .ng-wm{position:absolute;font-family:var(--ng-font-mono);font-weight:900;letter-spacing:-.04em;color:rgba(56,189,248,.045);white-space:nowrap;pointer-events:none;z-index:1}
  /* cover */
  .ng-cv-title{font-size:124px;font-weight:900;line-height:1.08;color:#FFFFFF;white-space:nowrap;letter-spacing:-.01em;text-shadow:0 0 30px rgba(56,189,248,.18)}
  .ng-cv-title span{display:inline-block}
  .ng-cv-title .cur{display:inline-block;width:.42em;height:.09em;background:var(--ng-jade);box-shadow:0 0 12px var(--ng-jade);vertical-align:-.02em;margin-left:.04em}
  .ng-cv-no{font-family:var(--ng-font-mono);font-size:168px;font-weight:900;line-height:1;letter-spacing:-.05em;color:transparent;-webkit-text-stroke:3px var(--ng-violet);text-shadow:0 0 34px color-mix(in srgb,var(--ng-violet) 45%,transparent);margin:6px 0 10px}
  .ng-cv-sub{font-size:34px;font-weight:900;line-height:1.42;color:#E2E8F0;white-space:nowrap}
  .ng-queue{display:flex;align-items:center;gap:22px}
  .ng-queue .lb{font-family:var(--ng-font-mono);font-size:18px;font-weight:900;color:#94A3B8;letter-spacing:.14em;white-space:nowrap}
  .ng-queue .ng-track{flex:1}
  .ng-queue .pc{width:74px;font-family:var(--ng-font-mono);font-size:24px;font-weight:900;color:var(--ng-jade);text-align:right}
  .ng-btn{padding:12px 26px 10px;background:#0A0E16;border:2px solid var(--nc);border-bottom-width:7px;color:#FFFFFF;font-weight:900;font-size:34px;white-space:nowrap;line-height:1.05;text-align:center}
  .ng-btn small{display:block;font-family:var(--ng-font-mono);font-size:12px;letter-spacing:.24em;color:var(--nc);margin-top:5px}
  .ng-btn.on{background:var(--nc);color:#06080D;box-shadow:0 0 30px color-mix(in srgb,var(--nc) 60%,transparent)}
  .ng-btn.on small{color:#06080D}
  /* stat */
  .ng-st-num{font-family:var(--ng-font-mono);font-weight:900;letter-spacing:-.05em;line-height:1;color:#FFFFFF;white-space:nowrap;margin-top:18px}
  .ng-node.lit .ng-st-num{text-shadow:0 0 30px color-mix(in srgb,var(--nc) 45%,transparent)}
  .ng-st-num .u,.ng-st-num .pf{font-family:var(--ng-font-cn);font-size:.24em;letter-spacing:0;color:var(--nc);margin-left:.18em;vertical-align:.25em}
  .ng-st-num .pf{margin:0 .08em 0 0}
  .ng-st-meta{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-family:var(--ng-font-mono);font-size:15px;font-weight:900;color:#64748B;letter-spacing:.1em}
  .ng-st-meta b{color:var(--nc)}
  .ng-delta{font-size:46px;font-weight:900;color:#FFFFFF;line-height:1;white-space:nowrap}
  .ng-delta small{font-family:var(--ng-font-mono);font-size:15px;letter-spacing:.2em;color:var(--ng-amber);margin-left:16px;vertical-align:.4em}
  /* steps */
  .ng-sp-no{font-family:var(--ng-font-mono);font-size:62px;font-weight:900;line-height:1;color:transparent;-webkit-text-stroke:2px #334155;position:absolute;right:16px;top:14px}
  .ng-node.lit .ng-sp-no{-webkit-text-stroke-color:var(--nc)}
  .ng-sp-t{font-size:56px;font-weight:900;line-height:1.1;color:#FFFFFF;white-space:nowrap;margin-top:66px}
  .ng-out{display:flex;align-items:center;gap:22px;height:66px}
  .ng-out .f{font-family:var(--ng-font-mono);font-size:26px;font-weight:900;color:#E2E8F0;letter-spacing:.04em;white-space:nowrap}
  .ng-out .b{padding:2px 14px;border:2px solid var(--ng-cyan);color:var(--ng-cyan);font-family:var(--ng-font-mono);font-size:38px;font-weight:900;white-space:nowrap;box-shadow:0 0 18px color-mix(in srgb,var(--ng-cyan) 35%,transparent)}
  .ng-out .m{font-family:var(--ng-font-mono);font-size:14px;font-weight:900;color:#64748B;line-height:1.45;white-space:nowrap;letter-spacing:.08em}
  .ng-out .ng-btn{margin-left:auto;font-size:30px}
  /* checklist */
  .ng-ck-ttl{font-family:var(--ng-font-mono);font-size:84px;font-weight:900;line-height:1;letter-spacing:-.03em;color:#FFFFFF;white-space:nowrap}
  .ng-ck-sub{font-size:30px;font-weight:800;color:#94A3B8;margin-top:12px;white-space:nowrap}
  .ng-ck-hr{position:absolute;left:18px;right:18px;height:2px;background:linear-gradient(90deg,var(--ng-cyan),rgba(56,189,248,0))}
  .ng-row{position:absolute;left:18px;right:18px;height:84px;background:#0A0E16;border:1px solid rgba(255,255,255,.07);border-left:4px solid #1E293B;box-sizing:border-box}
  .ng-row.on{border-color:color-mix(in srgb,var(--nc) 55%,transparent);border-left-color:var(--nc);background:color-mix(in srgb,var(--nc) 10%,#0A0E16)}
  .ng-row .box{position:absolute;left:18px;top:19px;width:44px;height:44px;border:2px solid #334155;box-sizing:border-box;display:flex;align-items:center;justify-content:center}
  .ng-row.on .box{background:var(--nc);border-color:var(--nc);box-shadow:0 0 16px var(--nc)}
  .ng-row .k{position:absolute;left:84px;top:7px;line-height:1.1;font-size:35px;font-weight:900;color:#64748B;white-space:nowrap}
  .ng-row.on .k{color:#FFFFFF}
  .ng-row .d{position:absolute;left:86px;top:51px;line-height:1.2;font-size:19px;font-weight:700;color:#64748B;white-space:nowrap}
  .ng-row .n{position:absolute;right:16px;top:26px;padding:3px 10px;background:#1E293B;font-family:var(--ng-font-mono);font-size:15px;font-weight:900;color:#64748B;letter-spacing:.1em}
  .ng-row.on .n{background:var(--nc);color:#06080D}
  .ng-scan{position:absolute;left:0;right:0;height:3px;background:var(--ng-cyan);box-shadow:0 0 18px 4px color-mix(in srgb,var(--ng-cyan) 60%,transparent);z-index:5;pointer-events:none}
  .ng-memo{margin-top:0;padding:14px 20px;background:color-mix(in srgb,var(--ng-violet) 12%,#0A0E16);border:1.5px solid var(--ng-violet);font-size:36px;font-weight:900;color:#FFFFFF;white-space:nowrap;position:absolute;right:18px}
  .ng-memo small{display:block;font-family:var(--ng-font-mono);font-size:15px;letter-spacing:.16em;color:var(--ng-violet);margin-bottom:6px}
  /* compare */
  .ng-cmp-t{font-size:56px;font-weight:900;line-height:1.16;color:#FFFFFF;white-space:nowrap}
  .ng-cmp-d{font-size:25px;font-weight:700;line-height:1.55;color:#CBD5E1;margin-top:22px}
  .ng-node.err{border-color:color-mix(in srgb,var(--ng-coral) 70%,transparent)}
  .ng-node.err .nb{filter:none}
  .ng-node.err .ng-cmp-t,.ng-node.err .ng-cmp-d{color:#8391A7}
  .ng-node.err .nh .st{background:var(--ng-coral);color:#FFFFFF}
  .ng-node.err .nh i{background:var(--ng-coral);box-shadow:0 0 10px var(--ng-coral)}
  .ng-strike{position:absolute;left:10px;top:12px;overflow:visible;pointer-events:none}
  .ng-vs{font-family:var(--ng-font-mono);font-size:50px;font-weight:900;color:var(--ng-amber);text-align:center;line-height:1;text-shadow:0 0 20px color-mix(in srgb,var(--ng-amber) 55%,transparent)}
  .ng-lever{position:relative;height:26px;margin-top:16px;background:#06080D;border:1px solid rgba(255,255,255,.12)}
  .ng-lever i{position:absolute;top:2px;width:44%;bottom:2px;background:var(--ng-amber);box-shadow:0 0 12px var(--ng-amber)}
  .ng-verdict{display:flex;align-items:center;gap:24px;height:62px}
  .ng-verdict b{padding:5px 12px;background:var(--ng-amber);color:#06080D;font-family:var(--ng-font-mono);font-size:18px;letter-spacing:.18em;white-space:nowrap}
  .ng-verdict span{font-size:44px;font-weight:900;color:#FFFFFF;white-space:nowrap}
  .ng-okbadge{position:absolute;right:18px;top:18px;width:56px;height:56px;background:var(--ng-jade);display:flex;align-items:center;justify-content:center;box-shadow:0 0 22px var(--ng-jade)}
  /* showcase */
  .ng-term{position:absolute;left:0;right:0;top:42px;bottom:0;background:#06080D;padding:22px 28px;box-sizing:border-box;font-family:var(--ng-font-mono);font-size:30px;font-weight:700;line-height:1.62;white-space:pre;color:#CBD5E1;overflow:hidden}
  .ng-term .ln{display:inline-block;width:54px;color:#334155}
  .ng-term .c{color:#64748B}.ng-term .k{color:var(--ng-amber)}.ng-term .ok{color:var(--ng-jade);font-weight:900}
  .ng-term .cur{display:inline-block;width:.58em;background:var(--ng-jade);color:var(--ng-jade);box-shadow:0 0 10px var(--ng-jade)}
  .ng-term.doc{background:#0C111B;font-family:var(--ng-font-cn);font-size:34px;font-weight:800;color:#E2E8F0}
  .ng-media{position:absolute;left:0;right:0;top:42px;width:100%;height:calc(100% - 42px);object-fit:cover;background:#000}
  .ng-call{position:absolute;z-index:7;display:flex;align-items:center}
  .ng-call .dot{width:14px;height:14px;border-radius:50%;background:var(--nc);box-shadow:0 0 0 5px color-mix(in srgb,var(--nc) 25%,transparent),0 0 16px var(--nc);flex:none}
  .ng-call .ln{width:54px;height:2px;background:var(--nc);box-shadow:0 0 8px var(--nc);flex:none}
  .ng-call .tx{padding:8px 16px;background:rgba(10,14,22,.96);border:1.5px solid var(--nc);color:#FFFFFF;font-size:26px;font-weight:900;white-space:nowrap;box-shadow:0 10px 26px rgba(0,0,0,.6)}
  .ng-prod{position:absolute;left:0;right:0;top:42px;bottom:0}
  .ng-prod .pic{position:absolute;left:24px;top:24px;bottom:24px;width:490px;background:#070A10;border:1px solid rgba(56,189,248,.3);overflow:hidden;display:flex;align-items:center;justify-content:center;
    background-image:linear-gradient(rgba(56,189,248,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.08) 1px,transparent 1px);background-size:30px 30px}
  .ng-prod .pic img{width:100%;height:100%;object-fit:contain}
  .ng-prod .pic svg.dev{width:78%;height:auto}
  .ng-prod .pic .cm{position:absolute;width:26px;height:26px;border-color:var(--ng-cyan);border-style:solid}
  .ng-prod .pic .sc{position:absolute;left:0;right:0;height:2px;background:var(--ng-cyan);box-shadow:0 0 14px 3px color-mix(in srgb,var(--ng-cyan) 55%,transparent)}
  .ng-prod .pic .lb{position:absolute;left:46px;bottom:14px;font-family:var(--ng-font-mono);font-size:13px;font-weight:900;color:var(--ng-cyan);letter-spacing:.14em}
  .ng-prod .info{position:absolute;left:546px;right:30px;top:24px}
  .ng-prod .nm{font-size:52px;font-weight:900;line-height:1.1;color:#FFFFFF;white-space:nowrap}
  .ng-prod .tg{display:inline-block;margin-top:12px;padding:4px 12px;border:1.5px solid var(--ng-jade);color:var(--ng-jade);font-size:22px;font-weight:900;white-space:nowrap}
  .ng-prod .specs{margin-top:16px}
  .ng-prod .ng-np{font-size:18px;padding:11px 14px}
  .ng-prod .ng-np .pv{font-family:var(--ng-font-cn);font-size:24px;font-weight:900}
  .ng-prod .price{position:absolute;right:30px;bottom:24px}
  .ng-prod .scw{position:absolute;left:546px;bottom:24px}
  /* quote（屏幕层） */
  .ng-q{position:absolute;top:190px;width:fit-content;min-width:440px;max-width:720px}
  .ng-q .nb{padding:26px 32px 26px}
  .ng-q .t{font-size:62px;font-weight:900;line-height:1.3;color:#FFFFFF;text-shadow:0 4px 20px rgba(0,0,0,.6)}
  .ng-q .by{display:inline-block;margin-top:20px;padding:5px 12px;border:1.5px solid var(--ng-violet);color:var(--ng-violet);font-family:var(--ng-font-mono);font-size:17px;font-weight:900;letter-spacing:.12em}
  .ng-q .ng-scope{margin-top:20px}
  /* outro */
  .ng-act-t{font-size:38px;font-weight:900;line-height:1.15;color:#FFFFFF;white-space:nowrap}
  .ng-act-d{font-family:var(--ng-font-mono);font-size:18px;font-weight:800;color:#94A3B8;margin-top:8px;white-space:nowrap}
  .ng-act-no{position:absolute;right:18px;top:12px;font-family:var(--ng-font-mono);font-size:58px;font-weight:900;line-height:1;color:transparent;-webkit-text-stroke:2px #334155}
  .ng-node.lit .ng-act-no{-webkit-text-stroke-color:var(--nc)}
  .ng-cta-t{font-size:62px;font-weight:900;color:#FFFFFF;line-height:1.1;white-space:nowrap;margin-top:16px}
  .ng-cta-repo{margin-top:20px;padding:14px 18px;background:#06080D;border:1px solid rgba(0,229,195,.3);font-family:var(--ng-font-mono);font-size:20px;font-weight:800;color:#E2E8F0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ng-cta-repo b{color:var(--ng-jade)}
  .ng-keys{display:flex;gap:16px;margin-top:24px}
  .ng-keys .ng-btn{flex:1;font-size:30px;padding:12px 0 9px}
  .ng-cta-run{display:flex;align-items:center;gap:18px;margin-top:26px}
  .ng-cta-run .ng-track{flex:1}
  /* timeline */
  .ng-tl-tm{font-family:var(--ng-font-mono);font-size:38px;font-weight:900;line-height:1;color:var(--nc);letter-spacing:-.03em;white-space:nowrap}
  .ng-tl-t{font-size:32px;font-weight:900;color:#FFFFFF;margin-top:12px;white-space:nowrap}
  .ng-tl-d{font-size:19px;font-weight:700;color:#94A3B8;margin-top:6px;line-height:1.35}
  .ng-node.now{box-shadow:0 24px 54px rgba(0,0,0,.66),0 0 46px color-mix(in srgb,var(--nc) 45%,transparent)}
  .ng-pulse{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:2px solid var(--ng-jade);z-index:4;pointer-events:none}
  /* diagram */
  .ng-dg .nb{padding:10px 16px}
  .ng-dg-l{font-size:34px;font-weight:900;color:#FFFFFF;white-space:nowrap;line-height:1.1}
  .ng-dg-s{font-family:var(--ng-font-mono);font-size:16px;font-weight:800;color:#94A3B8;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ng-node.focus{border-color:var(--ng-amber);box-shadow:0 24px 54px rgba(0,0,0,.66),0 0 0 3px color-mix(in srgb,var(--ng-amber) 30%,transparent),0 0 50px color-mix(in srgb,var(--ng-amber) 45%,transparent)}
  .ng-tagw{position:absolute;z-index:5;transform:translate(-50%,-50%)}
  .ng-tag{padding:3px 10px;background:#0A0E16;border:1px solid var(--nc);color:var(--nc);font-family:var(--ng-font-mono);font-size:15px;font-weight:900;white-space:nowrap;letter-spacing:.06em}
  `;
  function injectCSS() {
    if (document.getElementById('ng-components-css')) return;
    const st = document.createElement('style'); st.id = 'ng-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  /** 节点入场：轻微缩放 + 上浮吸附到网格 */
  const popIn = (A, el, at, dy = 40) => { A.add(el, -1, 0.01, { o: 0, s: 0.94, y: dy }, { o: 0, s: 0.94, y: dy }); A.add(el, at, 0.42, { o: 0, s: 0.94, y: dy }, { o: 1, s: 1, y: 0 }, 'snap'); };
  const headIn = (A, kick, hd) => { A.add(kick, 0.1, 0.3, { x: -30, o: 0 }, { x: 0, o: 1 }); A.add(hd, 0.2, 0.45, { y: -36, o: 0 }, { y: 0, o: 1 }, 'out'); };

  // ============================== 1. cover 标题编码节点 + 章节 ID + 队列执行 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const nT = node(60, 168, 740, C.cyan, '01 · TITLE_ENCODER', `<div class="ng-cv-title"></div><div class="ng-np" style="--nc:var(--ng-cyan)"><span>OUTPUT</span><span class="pv">${esc(data.dim || '')}</span></div>`, { st: 'IDLE', h: 470 });
    const title = nT.querySelector('.ng-cv-title'), npT = nT.querySelector('.ng-np');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const cur = h('span', 'cur'); title.appendChild(cur);
    const scope = Scope(700, 62, C.cyan); scope.el.style.marginTop = '12px'; nT.querySelector('.nb').appendChild(scope.el);
    const nC = node(940, 168, 400, C.violet, '02 · CHAPTER_ID', `<div class="ng-np" style="--nc:var(--ng-violet);margin-top:0"><span>${esc(data.chapterLabel || 'CHAPTER')}</span><span class="pv">INT</span></div><div class="ng-cv-no">${esc(data.chapter || '01')}</div>${ruler(360, 20, ['00', '05', '10'])}`);
    const nS = node(940, 520, 400, C.amber, '03 · SUBTITLE_TXT', `<div class="ng-cv-sub">${mark(data.subtitle)}</div>`, { h: 180 });
    const nQ = node(60, 772, 1280, C.jade, '04 · QUEUE_PROMPT', `<div class="ng-queue"><span class="lb">BATCH 1/1</span><div class="ng-track" style="--nc:var(--ng-jade)"><i></i></div><span class="pc">0%</span><div class="ng-btn" style="--nc:var(--ng-jade)">${esc(data.stamp || '▶ RUN')}${data.stampSmall ? `<small>${esc(data.stampSmall)}</small>` : ''}</div></div>`);
    const fill = nQ.querySelector('.ng-track i'), pc = nQ.querySelector('.pc'), btn = nQ.querySelector('.ng-btn');
    el.append(kick, nT, nC, nS, nQ);
    const tB = 0.6 + chars.length * 0.07;
    const tC = 0.75, tS = tB + 0.25, tQ = tB + 0.55, tRun = Math.min(D - 2.0, tQ + 0.5), tDone = Math.min(D - 0.8, tRun + 1.3);
    const cT = cab.add(hPath({ x: 800, y: 300 }, { x: 940, y: 300 }), C.violet, tC + 0.2);
    const cS = cab.add(hPath({ x: 800, y: 470 }, { x: 940, y: 620 }), C.amber, tS + 0.1);
    const cQ1 = cab.add(vPath({ x: 430, y: 638 }, { x: 430, y: 772 }), C.cyan, tQ + 0.15);
    const cQ2 = cab.add(vPath({ x: 1140, y: 700 }, { x: 1140, y: 772 }), C.amber, tQ + 0.25);
    A.add(kick, 0.05, 0.3, { x: -30, o: 0 }, { x: 0, o: 1 });
    popIn(A, nT, 0.15); popIn(A, nC, tC); popIn(A, nS, tS); popIn(A, nQ, tQ, 60);
    chars.forEach((c, i) => A.add(c, 0.5 + i * 0.07, 0.18, { o: 0, y: 14 }, { o: 1, y: 0 }));
    let fitted = false;
    A.fn((t) => {
      if (!fitted) fitted = fitWidth(title, 700) && fitWidth(nS.querySelector('.ng-cv-sub'), 362);
      cab.update(t); scope.update(t, t < 0.4 ? 0.1 : 0.55 + 0.45 * Math.abs(Math.sin(t * 1.7)));
      nodeState(nT, t, 0.35, tB + 0.2); nodeState(nC, t, tC + 0.3, tC + 0.8); nodeState(nS, t, tS + 0.4, tS + 0.9);
      nodeState(nQ, t, tQ + 0.3, tDone, ['IDLE', 'QUEUED', 'EXECUTED ✓']);
      cur.style.opacity = t < tB + 0.6 ? (Math.floor(t * 3) % 2 ? '1' : '0.15') : '0';
      npT.classList.toggle('on', t >= tB);
      const rp = EASE.inOut(clamp01((t - tRun) / (tDone - tRun)));
      fill.style.transform = `scaleX(${rp.toFixed(3)})`; pc.textContent = `${Math.round(rp * 100)}%`;
      btn.classList.toggle('on', t >= tDone);
      btn.style.transform = t >= tDone && t < tDone + 0.16 ? 'translateY(5px)' : 'none';
    });
    void cT; void cS; void cQ1; void cQ2;
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 470, 380, 1.32, 2, -4, -0.6), CAM(1.9, 700, 520, 0.98, 1, -1.5, 0), CAM(D, 712, 515, 1.03, 0.5, 1.2, 0.2)] };
  }

  // ============================== 2. steps 横向流水线：逐个节点执行 → 汇入输出目录 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const hd = head(data.title, 'left:56px;top:150px;');
    const tag = chip(data.dim || `${n} STEPS`, C.amber, 'right:60px;top:178px;font-size:24px;');
    const AW = 72, cw = (1280 - AW * (n - 1)) / n, TOP = 300, NH = 360;
    const cards = items.map((it, i) => node(60 + i * (cw + AW), TOP, cw, PALETTE[i % 4], `${String(i + 1).padStart(2, '0')} · ${it.no || 'STAGE'}`,
      `<div class="ng-sp-no">${String(i + 1).padStart(2, '0')}</div><div class="ng-sp-t">${esc(it.title)}</div><div class="ng-np" style="--nc:${PALETTE[i % 4]}"><span>FILE</span><span class="pv">${esc(it.desc || '')}</span></div><div class="ng-track" style="--nc:${PALETTE[i % 4]};margin-top:22px"><i></i></div><div class="ng-st-meta" style="--nc:${PALETTE[i % 4]}"><span>PROGRESS</span><b>0%</b></div>`, { h: NH }));
    const outN = node(60, 772, 1280, C.cyan, 'OUTPUT · SAVE_DIR',
      `<div class="ng-out"><div class="f">▣ ${esc(data.folder || 'PROJECT /')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>${data.label ? `<div class="ng-btn" style="--nc:var(--ng-jade)">${esc(data.label)}${data.labelSmall ? `<small>${esc(data.labelSmall)}</small>` : ''}</div>` : ''}</div>`);
    const lbBtn = outN.querySelector('.ng-btn');
    el.append(kick, hd, tag, ...cards, outN);
    headIn(A, kick, hd);
    A.add(tag, 0.55, 0.35, { s: 0.6, o: 0 }, { s: 1, o: 1 }, 'back');
    popIn(A, outN, 0.5, 60);
    const t0 = 1.0, t1 = Math.min(Math.max(t0 + 0.5, D - 2.4), t0 + 0.9 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0.8;
    const run = Math.max(0.5, stp * 0.85);
    const tl = cards.map((c, i) => {
      const at = t0 + i * stp;
      popIn(A, c, at - 0.35);
      if (i > 0) cab.add(hPath({ x: 60 + i * (cw + AW) - AW, y: TOP + 180 }, { x: 60 + i * (cw + AW), y: TOP + 180 }), PALETTE[(i - 1) % 4], at - 0.12, { drawDur: 0.3, orbs: 2 });
      const cx = 60 + i * (cw + AW) + cw / 2;
      cab.add(vPath({ x: cx, y: TOP + NH }, { x: cx, y: 772 }), PALETTE[i % 4], at + run, { drawDur: 0.3, orbs: 2, speed: 200 });
      return { at, fill: c.querySelector('.ng-track i'), pc: c.querySelector('.ng-st-meta b'), np: c.querySelector('.ng-np') };
    });
    const tL = D - 1.2;
    A.fn((t) => {
      cab.update(t);
      cards.forEach((c, i) => {
        const p = clamp01((t - tl[i].at) / run);
        nodeState(c, t, tl[i].at, tl[i].at + run);
        tl[i].fill.style.transform = `scaleX(${EASE.inOut(p).toFixed(3)})`;
        tl[i].pc.textContent = `${Math.round(EASE.inOut(p) * 100)}%`;
        tl[i].np.classList.toggle('on', p >= 1);
      });
      nodeState(outN, t, t0 + run, t0 + (n - 1) * stp + run + 0.2, ['IDLE', 'WRITING', 'SAVED ✓']);
      if (lbBtn) lbBtn.classList.toggle('on', t >= tL);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 600, 1.16, 2, -2.5, -0.5), CAM(1.2, 700, 515, 1.0, 1, -1, 0), CAM(D, 708, 510, 1.03, 0.5, 1, 0.2)] };
  }

  // ============================== 3. checklist 规则校验节点：扫描线逐条 PASS + 环形通过率 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const RH = 96, R0 = 250;
    const H = 42 + R0 + n * RH + (data.note ? 128 : 16);
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1300); el.appendChild(cab.el);
    const V = node(120, 100, 880, C.cyan, data.kicker || 'RULES_VALIDATOR', `<div class="ng-ck-ttl">${esc(data.title)}</div><div class="ng-ck-sub">${esc(data.subtitle || '')}</div><div class="ng-ck-hr" style="top:${R0 - 34}px"></div>`, { h: H });
    const body = V.querySelector('.nb');
    const rows = items.map((it, i) => {
      const r = h('div', 'ng-row', `top:${R0 + i * RH - 12}px;--nc:${PALETTE[i % 4]};`,
        `<div class="box">${CHECK(30)}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">#${String(i + 1).padStart(2, '0')}</div>`);
      body.appendChild(r); return r;
    });
    let memo = null;
    if (data.note) { memo = h('div', 'ng-memo', `top:${R0 + n * RH + 4}px;`, `<small>${esc(data.noteLead || '')}</small>${mark(data.note)}`); body.appendChild(memo); }
    const scan = h('div', 'ng-scan', 'top:0;'); body.appendChild(scan);
    const ring = Ring(220, C.jade);
    const G = node(1080, 300, 260, C.jade, 'PASS_RATE', '', { h: 360 });
    G.querySelector('.nb').appendChild(ring.el); ring.el.style.margin = '8px auto 0';
    const gl = h('div', null, 'text-align:center;margin-top:14px;', leds(n, C.jade)); G.querySelector('.nb').appendChild(gl);
    el.append(V, G);
    cab.add(hPath({ x: 1000, y: 380 }, { x: 1080, y: 480 }), C.jade, 0.9);
    A.add(V, -1, 0.01, { o: 0, y: 60, s: 0.97 }, { o: 0, y: 60, s: 0.97 });
    A.add(V, 0, 0.5, { o: 0, y: 60, s: 0.97 }, { o: 1, y: 0, s: 1 }, 'snap');
    popIn(A, G, 0.6);
    const t0 = 1.2, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.6 : 1.4)), t0 + 0.75 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    rows.forEach((r, i) => A.add(r, t0 + i * stp - 0.45, 0.3, { o: 0.35, x: -10 }, { o: 1, x: 0 }));
    if (memo) A.add(memo, D - 2.1, 0.45, { s: 0.7, o: 0 }, { s: 1, o: 1 }, 'back');
    const cks = rows.map((r) => r.querySelector('.ng-ck')), ledEl = gl.querySelector('.ng-leds');
    A.fn((t) => {
      cab.update(t);
      nodeState(V, t, 0.3, t1 + 0.4, ['IDLE', 'VALIDATING', 'ALL PASS ✓']);
      let k = 0;
      rows.forEach((r, i) => { const on = t >= t0 + i * stp; r.classList.toggle('on', on); if (on) k++; drawCheck(cks[i], (t - t0 - i * stp) / 0.22); });
      // 扫描线：沿行逐条下移
      const sp = clamp01((t - (t0 - 0.5)) / (t1 - t0 + 0.5));
      scan.style.opacity = t > t0 - 0.5 && t < t1 + 0.3 ? '1' : '0';
      scan.style.top = `${(R0 - 12 + sp * ((n - 1) * RH + 84)).toFixed(1)}px`;
      nodeState(G, t, 1.1, t1 + 0.4, ['IDLE', 'MEASURE', '100% ✓']);
      ring.set(k / n, `${k}/${n}`, 'PASSED');
      setLeds(ledEl, k, t);
    });
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 690, 520, 1.06, 1.5, -2, 0), CAM(1.0, 700, 500, 1.0, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.0, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 4. compare 报错节点 vs 通过节点 + A/B 路由开关 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const hd = head(data.title, 'left:56px;top:150px;');
    const L = node(60, 290, 500, C.coral, w.label || '✕ NODE_A', `<div class="ng-cmp-t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="ng-cmp-d">${esc(w.desc || '')}</div><svg class="ng-strike" width="470" height="160"><path d="M8 52 L440 46" style="stroke:var(--ng-coral)" stroke-width="8" fill="none" stroke-dasharray="440" stroke-dashoffset="440"/><path d="M8 118 L400 112" style="stroke:var(--ng-coral)" stroke-width="8" fill="none" stroke-dasharray="400" stroke-dashoffset="400"/></svg>`, { h: 420 });
    const R = node(840, 290, 500, C.jade, r.label || '✓ NODE_B', `<div class="ng-cmp-t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="ng-cmp-d">${esc(r.desc || '')}</div><div class="ng-okbadge">${CHECK(34)}</div>`, { h: 420 });
    const S = node(630, 404, 140, C.amber, 'A/B', `<div class="ng-vs">VS</div><div class="ng-lever"><i></i></div>`, { h: 170, style: 'z-index:4' });
    const err = chip(w.stamp || '✕ ERROR', C.coral, 'left:300px;top:640px;font-size:26px;', 'EXCEPTION');
    err.classList.add('solid');
    const V = node(60, 790, 1280, C.amber, 'OUTPUT · VERDICT', `<div class="ng-verdict"><b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span></div>`);
    el.append(kick, hd, L, R, S, err, V);
    headIn(A, kick, hd);
    popIn(A, L, 0.5);
    const tStrike = Math.min(D * 0.26, 1.6), tR = Math.min(D * 0.46, tStrike + 1.3), tV = Math.min(D - 1.6, tR + 1.3);
    popIn(A, S, tStrike + 0.15);
    A.add(err, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(err, tStrike + 0.7, 0.3, { s: 1.6, o: 0, r: -10 }, { s: 1, o: 1, r: -4 }, 'snap');
    popIn(A, R, tR);
    popIn(A, V, tV, 60);
    cab.add(hPath({ x: 630, y: 490 }, { x: 560, y: 500 }), C.coral, tStrike + 0.35, { broken: true });
    cab.add(hPath({ x: 770, y: 490 }, { x: 840, y: 500 }), C.jade, tR + 0.25);
    cab.add(vPath({ x: 1090, y: 710 }, { x: 1090, y: 790 }), C.amber, tV + 0.1);
    const strikes = L.querySelectorAll('.ng-strike path'), bck = R.querySelector('.ng-ck'), lever = S.querySelector('.ng-lever i');
    const badge = R.querySelector('.ng-okbadge');
    A.add(badge, -1, 0.01, { s: 0, o: 0 }, { s: 0, o: 0 });
    A.add(badge, tR + 0.55, 0.35, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
    A.fn((t) => {
      cab.update(t);
      L.classList.toggle('err', t >= tStrike);
      nodeState(L, t, 0.7, null, ['IDLE', t >= tStrike ? 'FAILED' : 'RUN', '']);
      nodeState(R, t, tR + 0.3, tR + 0.9, ['IDLE', 'RUN', 'PASS ✓']);
      nodeState(S, t, tStrike + 0.4, null, ['—', t >= tR ? 'B' : 'A', '']);
      nodeState(V, t, tV + 0.3, tV + 0.8, ['IDLE', 'RUN', 'OK ✓']);
      strikes.forEach((p, i) => { const len = +p.getAttribute('stroke-dasharray'); p.setAttribute('stroke-dashoffset', (len * (1 - EASE.inOut(clamp01((t - tStrike - i * 0.25) / 0.32)))).toFixed(1)); });
      drawCheck(bck, (t - tR - 0.8) / 0.25);
      const lp = EASE.inOut(clamp01((t - tR) / 0.35));
      lever.style.left = `${(2 + lp * 52).toFixed(1)}%`;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.12, 1, -2.5, 0), CAM(1.0, 700, 505, 1.0, 0.5, -1, 0), CAM(D, 700, 512, 1.02, 0.5, 1.2, 0)] };
  }

  // ============================== 5. showcase 终端 / 文档 / 媒体监视器 / 产品参数节点 ==============================
  const DEVICE_SVG = `<svg class="dev" viewBox="0 0 400 300"><g fill="none" stroke="#38BDF8" stroke-width="5" stroke-linejoin="miter"><rect x="40" y="86" width="320" height="174"/><rect x="80" y="56" width="96" height="30"/><circle cx="200" cy="173" r="64"/><circle cx="200" cy="173" r="40" stroke="#A78BFA"/><circle cx="200" cy="173" r="16" stroke="#00E5C3"/><rect x="296" y="106" width="38" height="22" stroke="#FFB84D"/></g><g stroke="rgba(56,189,248,.45)" stroke-width="1.5" stroke-dasharray="4 5"><line x1="200" y1="20" x2="200" y2="286"/><line x1="10" y1="173" x2="390" y2="173"/></g><text x="200" y="296" text-anchor="middle" font-family="Consolas, monospace" font-size="16" font-weight="900" fill="#38BDF8" letter-spacing="4">PRODUCT · PREVIEW</text></svg>`;
  function productPanel(data) {
    const el = h('div', 'ng-prod');
    const pic = h('div', 'pic');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.innerHTML = DEVICE_SVG;
    [['left:10px;top:10px;', '3px 0 0 3px'], ['right:10px;top:10px;', '3px 3px 0 0'], ['left:10px;bottom:10px;', '0 0 3px 3px'], ['right:10px;bottom:10px;', '0 3px 3px 0']].forEach(([p, bw]) => pic.appendChild(h('div', 'cm', `${p}border-width:${bw};`)));
    const scan = h('div', 'sc', 'top:0;'); pic.appendChild(scan);
    pic.appendChild(h('div', 'lb', null, 'IMG_PREVIEW · 1:1'));
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp, i) => { const r = h('div', 'ng-np', `--nc:${PALETTE[i % 4]}`, `<span>${esc(sp.k)}</span><span class="pv">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? h('div', 'price ng-btn', '--nc:var(--ng-amber);font-size:44px;', `${esc(data.price)}${data.priceSmall ? `<small>${esc(data.priceSmall)}</small>` : ''}`) : null;
    if (price) el.appendChild(price);
    return { el, pic, scan, rows, price, nm: info.querySelector('.nm') };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const hd = head(data.title, 'left:56px;top:146px;font-size:76px;');
    const colr = kind === 'product' ? C.amber : kind === 'doc' ? C.violet : kind === 'image' || kind === 'video' ? C.cyan : C.jade;
    const P = node(60, 262, 1240, colr, `${(data.file || kind).toUpperCase()}`, '', { h: 620, st: 'IDLE' });
    P.querySelector('.nb').remove();
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); P.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'ng-media'); media.src = data.src; P.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'ng-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; P.appendChild(media); }
    else { codeEl = h('div', `ng-term${kind === 'doc' ? ' doc' : ''}`); P.appendChild(codeEl); }
    const tag = chip(`${kind.toUpperCase()} · NODE`, colr, 'right:100px;top:190px;');
    // 标注：发光引线 + 贴标（挂在 zone 上，不被面板裁切），坐标按面板百分比换算
    const NC = [C.amber, C.jade, C.violet];
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 262 + 620 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      return h('div', 'ng-call', `left:${(px - 7).toFixed(0)}px;top:${(py - 24).toFixed(0)}px;--nc:${NC[i]};`, `<div class="dot"></div><div class="ln"></div><div class="tx">${esc(nt.text)}</div>`);
    });
    let scope = null;
    if (prod) { scope = Scope(320, 72, C.amber); const scW = h('div', 'scw'); scW.appendChild(scope.el); prod.el.appendChild(scW); A.add(scW, 1.2, 0.3, { o: 0 }, { o: 1 }); }
    el.append(kick, hd, P, tag, ...notes);
    headIn(A, kick, hd);
    A.add(P, -1, 0.01, { o: 0, y: 80, s: 0.96 }, { o: 0, y: 80, s: 0.96 });
    A.add(P, 0.3, 0.55, { o: 0, y: 80, s: 0.96 }, { o: 1, y: 0, s: 1 }, 'snap');
    A.add(tag, 0.8, 0.35, { s: 0.6, o: 0 }, { s: 1, o: 1 }, 'back');
    const tType0 = 0.95, tType1 = Math.max(tType0 + 0.6, D * 0.6);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    let tN0 = tType1 + 0.2;
    if (prod) {
      A.add(prod.pic, 0.75, 0.5, { s: 0.9, o: 0 }, { s: 1, o: 1 }, 'snap');
      prod.rows.forEach((r2, i) => A.add(r2, 1.0 + i * 0.3, 0.35, { x: 50, o: 0 }, { x: 0, o: 1 }, 'out'));
      const tPr = Math.min(D - 1.4, 1.3 + prod.rows.length * 0.3 + 0.3);
      if (prod.price) { A.add(prod.price, -1, 0.01, { o: 0 }, { o: 0 }); A.add(prod.price, tPr, 0.3, { s: 1.4, o: 0 }, { s: 1, o: 1 }, 'snap'); }
      tN0 = Math.min(D - 1.2, tPr + 0.5);
    }
    const nStep = notes.length ? Math.max(0.4, (D - 0.9 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.35, { o: 0, x: -24 }, { o: 1, x: 0 }, 'out'));
    let fitted = false;
    A.fn((t) => {
      cab.update(t); if (scope) scope.update(t, 0.8);
      nodeState(P, t, 0.6, prod ? null : tType1 + 0.1, ['IDLE', kind === 'product' ? 'PREVIEW' : 'RUN', 'DONE ✓']);
      if (prod) {
        if (!fitted) fitted = fitWidth(prod.nm, 640);
        prod.scan.style.top = `${(((t * 0.45) % 1) * 100).toFixed(2)}%`;
        prod.rows.forEach((r2, i) => r2.classList.toggle('on', t >= 1.3 + i * 0.3));
      }
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
      cams: [CAM(0, 700, 580, 0.94, 1.5, -1.5, 0), CAM(1.2, 700, 530, 1.0, 1, -1.5, 0), CAM(D, 712, 540, 1.04, 1, 1.2, 0)] };
  }

  // ============================== 6. quote 全屏人像 + 侧边 KEY_TAKEAWAY 节点（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'ng-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const card = node(0, 0, 0, C.violet, data.kicker || 'KEY_TAKEAWAY', `<div class="t">${mark(data.text)}</div><div class="by">${esc(data.by || '')}</div>`, { cls: 'ng-q lit', st: 'LIVE' });
    card.style.cssText += `${right ? 'right:70px;left:auto;' : 'left:70px;'}top:190px;width:fit-content;`;
    const scope = Scope(440, 54, C.violet); card.querySelector('.nb').appendChild(scope.el);
    const st = chip(data.stamp || '', C.amber, `${right ? 'right:70px;' : 'left:70px;'}top:${data.stampTop || 690}px;font-size:40px;`, data.stampSmall || '');
    st.classList.add('solid');
    el.append(card, st);
    const dir = right ? 1 : -1;
    A.add(card, -1, 0.01, { o: 0, x: dir * 120 }, { o: 0, x: dir * 120 });
    A.add(card, 0.45, 0.55, { o: 0, x: dir * 120 }, { o: 1, x: 0 }, 'snap');
    A.add(st, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(st, Math.min(D - 1.0, D * 0.42), 0.3, { s: 1.5, o: 0, r: dir * -4 }, { s: 1, o: 1, r: dir * -2 }, 'snap');
    A.fn((t) => scope.update(t, 0.55 + 0.45 * Math.abs(Math.sin(t * 2.3))));
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 7. outro 三个行动节点串联 → PUBLISH 输出节点 + 机械键帽连按 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const hd = head(data.title, 'left:56px;top:150px;');
    const AC = [C.cyan, C.violet, C.amber];
    const acts = (data.actions || []).slice(0, 3).map((a, i) => node(60, 280 + i * 180, 540, AC[i], `${String(i + 1).padStart(2, '0')} · ${a.tag || 'ACTION'}`,
      `<div class="ng-act-no">${String(i + 1).padStart(2, '0')}</div><div class="ng-act-t">${esc(a.title)}</div><div class="ng-act-d">${esc(a.desc || '')}</div>`, { h: 146 }));
    const c = data.cta || {};
    const KC = [C.amber, C.cyan, C.jade];
    const cta = node(720, 280, 620, C.jade, `OUTPUT · ${c.kicker || 'PUBLISH'}`,
      `<div class="ng-chip" style="--nc:var(--ng-jade);position:relative;display:inline-block">${esc(c.kicker || 'OPEN SOURCE')}</div><div class="ng-cta-t">${esc(c.title || '')}</div><div class="ng-cta-repo"><b>$</b> git clone ${esc(c.repo || '')}</div><div class="ng-keys">${(c.buttons || []).slice(0, 3).map((b, i) => `<div class="ng-btn" style="--nc:${KC[i]}">${esc(b)}</div>`).join('')}</div><div class="ng-cta-run"><div class="ng-track" style="--nc:var(--ng-jade)"><i></i></div><div class="ng-btn go" style="--nc:var(--ng-jade);font-size:34px;padding:10px 22px 8px">${esc(c.stamp || 'GO')}${c.stampSmall ? `<small>${esc(c.stampSmall)}</small>` : ''}</div></div>`, { h: 470 });
    el.append(kick, hd, ...acts, cta);
    headIn(A, kick, hd);
    const t0 = 0.7, stp = Math.min(0.6, (D * 0.35) / Math.max(1, acts.length));
    acts.forEach((a, i) => {
      popIn(A, a, t0 + i * stp);
      if (i > 0) cab.add(vPath({ x: 200, y: 280 + (i - 1) * 180 + 146 }, { x: 200, y: 280 + i * 180 }), AC[i - 1], t0 + i * stp + 0.2, { orbs: 1, drawDur: 0.25 });
      cab.add(hPath({ x: 600, y: 280 + i * 180 + 73 }, { x: 720, y: 400 + i * 130 }), AC[i], t0 + acts.length * stp + 0.15 + i * 0.12);
    });
    const tC = t0 + acts.length * stp + 0.05;
    popIn(A, cta, tC);
    const keys = Array.from(cta.querySelectorAll('.ng-keys .ng-btn')), go = cta.querySelector('.ng-btn.go'), fill = cta.querySelector('.ng-cta-run .ng-track i');
    const tP = tC + 0.8, tGo = Math.min(D - 0.9, tP + keys.length * 0.35 + 0.3);
    A.fn((t) => {
      cab.update(t);
      acts.forEach((a, i) => nodeState(a, t, t0 + i * stp + 0.2, t0 + i * stp + 0.6));
      nodeState(cta, t, tC + 0.3, tGo, ['IDLE', 'READY', 'PUBLISHED ✓']);
      keys.forEach((b, i) => {
        const p = clamp01((t - (tP + i * 0.35)) / 0.3), d = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6, k = p <= 0 || p >= 1 ? 0 : d;
        b.style.transform = `translateY(${(5 * k).toFixed(1)}px)`;
        b.style.borderBottomWidth = `${(7 - 5 * k).toFixed(1)}px`;
        b.classList.toggle('on', t >= tP + i * 0.35 + 0.12);
      });
      fill.style.transform = `scaleX(${EASE.inOut(clamp01((t - tP) / (tGo - tP))).toFixed(3)})`;
      go.classList.toggle('on', t >= tGo);
      go.style.transform = t >= tGo && t < tGo + 0.16 ? 'translateY(5px)' : 'none';
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1, -2.5, 0), CAM(1.2, 700, 508, 1.0, 0.5, -0.8, 0), CAM(D, 700, 505, 0.98, 0, 0.8, 0)] };
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

  // ============================== 8. stat 探针节点：大数字滚动 + 刻度比例条 → 比较器 ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const hd = head(data.title, 'left:56px;top:150px;');
    const gap = 50, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 220 : n === 2 ? 160 : 118, TOP = 290, NH = 400;
    const SC = n === 1 ? [C.jade] : n === 2 ? [C.cyan, C.jade] : [C.cyan, C.violet, C.jade];
    const cards = items.map((it, i) => node(60 + i * (w + gap), TOP, w, SC[i], `${String(i + 1).padStart(2, '0')} · PROBE`,
      `<div class="ng-np" style="--nc:${SC[i]};margin-top:0"><span>${esc(it.label || '')}</span><span class="pv">${it.bar != null ? 'RATIO' : 'VALUE'}</span></div><div class="ng-st-num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="ng-track" style="--nc:${SC[i]};margin-top:22px"><i></i></div>${ruler(Math.floor(w - 38), 20, ['0', '50', '100'])}<div class="ng-st-meta" style="--nc:${SC[i]}"><span>${leds(5, SC[i])}</span><b>${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</b></div>`, { h: NH }));
    const nums = cards.map((c) => c.querySelector('.ng-st-num'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const cmp = data.delta ? node(800, 782, 540, C.amber, 'COMPARATOR · Δ', `<div class="ng-delta">${esc(data.delta)}${data.deltaSmall ? `<small>${esc(data.deltaSmall)}</small>` : ''}</div>`) : null;
    const note = data.note ? chip(data.note, C.violet, 'left:60px;top:808px;font-family:var(--ng-font-cn);font-size:28px;letter-spacing:.02em;') : null;
    el.append(kick, hd, ...cards);
    if (note) el.appendChild(note);
    if (cmp) el.appendChild(cmp);
    headIn(A, kick, hd);
    const tIn = cards.map((_, i) => 0.6 + i * 0.5);
    cards.forEach((c, i) => popIn(A, c, tIn[i]));
    const tCmp = Math.min(D - 1.6, tIn[n - 1] + 1.9);
    if (cmp) {
      popIn(A, cmp, tCmp - 0.4, 50);
      cards.forEach((_, i) => {
        const cx = 60 + i * (w + gap) + w / 2, ix = 860 + (n > 1 ? i * (420 / (n - 1)) : 210);
        cab.add(vPath({ x: cx, y: TOP + NH }, { x: ix, y: 782 }), SC[i], tCmp - 0.3 + i * 0.08, { orbs: 2 });
      });
    }
    if (note) A.add(note, D - 2.4, 0.4, { o: 0, x: -30 }, { o: 1, x: 0 }, 'out');
    let fitted = false;
    const fills = cards.map((c) => c.querySelector('.ng-track i')), ledEls = cards.map((c) => c.querySelector('.ng-leds')), nps = cards.map((c) => c.querySelector('.ng-np'));
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 40); fitted = true; }
      cab.update(t);
      items.forEach((it, i) => {
        const p = EASE.out(clamp01((t - tIn[i] - 0.25) / 1.2));
        nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * p, decs[i]);
        nodeState(cards[i], t, tIn[i] + 0.2, tIn[i] + 1.5, ['IDLE', 'SAMPLING', 'LOCKED ✓']);
        fills[i].style.transform = `scaleX(${(clamp01(it.bar != null ? it.bar : 1) * EASE.out(clamp01((t - tIn[i] - 1.0) / 0.6))).toFixed(3)})`;
        setLeds(ledEls[i], t >= tIn[i] + 1.5 ? 5 : -1, t + i);
        nps[i].classList.toggle('on', t >= tIn[i] + 1.5);
      });
      if (cmp) nodeState(cmp, t, tCmp, tCmp + 0.5, ['IDLE', 'COMPARE', 'RESULT ✓']);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 550, 1.12, 1.5, -2.5, -0.5), CAM(1.2, 700, 512, 1.0, 1, -1, 0), CAM(D, 708, 508, 1.03, 0.5, 1, 0.2)] };
  }

  // ============================== 9. timeline 信号总线：节点上下交错挂载，光球沿总线推进（长轴横向跟拍） ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const BUS = 556;
    const el = h('div', 'ng-zone', `width:${W}px;`);
    const cab = CableLayer(W, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const hd = head(data.title, 'left:56px;top:150px;');
    el.append(kick, hd);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const x0 = 60, x1 = 60 + (n - 1) * SP + NWD / 2 + 40;
    // 总线：随节点逐个点亮向右延伸
    cab.add([{ x: x0, y: BUS }, { x: x0 + (x1 - x0) / 3, y: BUS }, { x: x0 + 2 * (x1 - x0) / 3, y: BUS }, { x: x1, y: BUS }], C.cyan, 0.4,
      { prog: (t) => clamp01((t - 0.4) / (tEnd - 0.4 + 0.3)), orbAt: 0.6, speed: 340, orbs: 4 });
    const BG = [C.cyan, C.violet, C.amber];
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 290 : 660, at = t0 + i * stp, isNow = i === now, col = isNow ? C.jade : BG[i % 3];
      const card = node(x, top, NWD, col, `T${String(i).padStart(2, '0')} · EVENT`,
        `<div class="ng-tl-tm">${esc(nd.time || '')}</div><div class="ng-tl-t">${esc(nd.title || '')}</div><div class="ng-tl-d">${esc(nd.desc || '')}</div>`, { h: 206, cls: isNow ? 'now' : '' });
      el.appendChild(card);
      const cx = x + NWD / 2;
      cab.add(vPath({ x: cx, y: BUS }, { x: cx, y: up ? top + 206 : top }), col, at - 0.05, { orbs: 1, drawDur: 0.3, speed: 160, ghost: true });
      popIn(A, card, at, up ? -40 : 40);
      return { x, up, top, at, card, cx };
    });
    let pulse = null;
    if (parts[now]) {
      const p = parts[now];
      pulse = h('div', 'ng-pulse', `left:${p.cx}px;top:${BUS}px;`); el.appendChild(pulse);
      if (data.nowLabel) {
        const ns = chip(data.nowLabel, C.jade, `left:${Math.min(W - 280, p.x)}px;top:${p.up ? 600 : 446}px;font-family:var(--ng-font-cn);font-size:30px;`, data.nowSmall || '');
        ns.classList.add('solid'); el.appendChild(ns);
        A.add(ns, -1, 0.01, { o: 0 }, { o: 0 });
        A.add(ns, Math.min(D - 0.9, p.at + 0.7), 0.3, { s: 1.4, o: 0 }, { s: 1, o: 1 }, 'snap');
      }
    }
    headIn(A, kick, hd);
    A.fn((t) => {
      cab.update(t);
      parts.forEach((p, i) => nodeState(p.card, t, p.at + 0.15, i === now ? null : p.at + 0.6, ['IDLE', i === now ? 'NOW' : 'RUN', 'DONE ✓']));
      if (pulse) {
        const pp = parts[now], k = ((t - pp.at) * 1.1) % 1;
        pulse.style.opacity = t >= pp.at ? (1 - k).toFixed(2) : '0';
        pulse.style.transform = `scale(${(1 + k * 2.6).toFixed(2)})`;
      }
    });
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1.5, -2.5, -0.4), CAM(0.9, 700, 512, 1.0, 1, -1, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 512, 1.0, 0.5, 1, 0), CAM(D, endX + 8, 508, 1.02, 0.3, 1, 0.2)] };
  }

  // ============================== 10. diagram 节点图：at[x%,y%] 布点 + 发光贝塞尔电缆 + 信号光球 + focus 焦点节点 ==============================
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 290, AW = 1280, AH = 610, NW = 260, NH = 124;
    const el = h('div', 'ng-zone');
    const cab = CableLayer(1400, 1100); el.appendChild(cab.el);
    const kick = kicker(data.kicker, 'left:60px;top:100px;');
    const hd = head(data.title, 'left:56px;top:150px;');
    el.append(kick, hd);
    const pos = {}, appear = {}, colOf = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp; colOf[nd.id] = PALETTE[i % 4];
      const e = node(x, y, NW, PALETTE[i % 4], `${String(i + 1).padStart(2, '0')} · ${String(nd.id || 'NODE').toUpperCase()}`, `<div class="ng-dg-l">${esc(nd.label || nd.id)}</div><div class="ng-dg-s">${esc(nd.sub || '')}</div>`, { h: NH, cls: 'ng-dg' });
      el.appendChild(e);
      popIn(A, e, appear[nd.id]);
      return e;
    });
    const geom = (a, b) => {
      const ax = a.x + NW / 2, ay = a.y + NH / 2, bx = b.x + NW / 2, by = b.y + NH / 2, dx = bx - ax, dy = by - ay;
      if (Math.abs(dx) * NH >= Math.abs(dy) * NW) { const sx = Math.sign(dx) || 1; return hPath({ x: ax + sx * NW / 2, y: ay }, { x: bx - sx * NW / 2, y: by }); }
      const sy = Math.sign(dy) || 1; return vPath({ x: ax, y: ay + sy * NH / 2 }, { x: bx, y: by - sy * NH / 2 });
    };
    const tDraw = [];
    links.forEach((lk, j) => {
      if (!pos[lk.from] || !pos[lk.to]) return;
      tDraw[j] = Math.max(appear[lk.from], appear[lk.to]) + 0.35;
      const cb = cab.add(geom(pos[lk.from], pos[lk.to]), colOf[lk.from], tDraw[j], { drawDur: 0.45, orbs: 2 });
      if (lk.label) {
        const wrap = h('div', 'ng-tagw', `left:${cb.mid.x.toFixed(0)}px;top:${cb.mid.y.toFixed(0)}px;`);
        const tg = h('div', 'ng-tag', `--nc:${colOf[lk.from]}`, esc(lk.label));
        wrap.appendChild(tg); el.appendChild(wrap);
        A.add(tg, -1, 0.01, { o: 0 }, { o: 0 });
        A.add(tg, tDraw[j] + 0.4, 0.3, { s: 0.6, o: 0 }, { s: 1, o: 1 }, 'back');
      }
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = chip(data.focusLabel, C.amber, `left:${Math.min(1160, p.x + 150)}px;top:${p.y - 58}px;font-family:var(--ng-font-cn);font-size:26px;`, data.focusSmall || '');
      st.classList.add('solid'); el.appendChild(st);
      A.add(st, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(st, tF + 0.25, 0.3, { s: 1.4, o: 0 }, { s: 1, o: 1 }, 'snap');
    }
    A.fn((t) => {
      cab.update(t);
      nodes.forEach((nd, i) => nodeState(nodeEls[i], t, appear[nd.id] + 0.25, null, ['IDLE', 'ACTIVE', '']));
      if (fi >= 0) { nodeEls[fi].classList.toggle('focus', t >= tF); if (t >= tF) nodeEls[fi]._st.textContent = 'CORE ●'; }
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 570, 1.12, 1.5, -2.5, -0.4), CAM(1.2, 700, 520, 1.0, 1, -1, 0), CAM(D, 708, 516, 1.03, 0.5, 1, 0.2)] };
  }

  global.NodeGraph = {
    version: '1.1.0',
    Animator, EASE, PALETTE, CableLayer, Scope, Ring, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro },
      stat: { create: stat }, timeline: { create: timeline }, diagram: { create: diagram }
    }
  };
})(window);
