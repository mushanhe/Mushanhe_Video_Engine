/**
 * Mushanhe Video Engine — 风格包 10 · 复古 CRT 像素终端（Retro CRT）
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print / 06_neobrutalism 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · stat · steps · checklist · compare · timeline · diagram · showcase[code|terminal|doc|image|video|product] · quote · outro
 *
 *   const comp = RetroCRT.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : { el, layer:'world'|'screen', avatar, cams:[{t,x,y,zoom,rx,ry,rz}], update(localT), w? }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：纯黑微绿荧光屏 #070C08 · 5px 双线 ASCII 窗框（四角 + 号）· 0 圆角 · 磷光绿 #33FF66 发光 ·
 *           琥珀 #FFB000 高亮 · 警示红 #FF3344 · 暗绿框线 #14532D · 像素块进度条 [████░░] · 闪烁方块光标 █
 * 动画语言：打字机逐字敲出 · CRT 开窗（纵向展开 + 荧光闪烁）· 全部由局部时间确定性驱动，任意 seek 可还原。
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
    back: (x) => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    /** 磷光管点亮：快速爬升 → 两次掉电闪烁 → 稳定 */
    flick: (x) => (x < 0.3 ? EASE.out(x / 0.3) : x < 0.42 ? 0.25 : x < 0.56 ? 1 : x < 0.64 ? 0.5 : 1),
    /** 阶梯式（像素感）：8 级量化 */
    step: (x) => Math.floor(clamp01(x) * 8) / 8
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const blink = (t, hz = 2) => Math.floor(t * hz * 2) % 2 === 0;
  const pad2 = (n) => String(n).padStart(2, '0');
  const blank = (s) => !String(s == null ? '' : s).trim();
  /** v3.5：可选字段没填 → 整块不渲染（display:none；Animator 只动 transform / opacity，不会再显出来） */
  const hideIf = (el, cond) => { if (cond && el) el.style.display = 'none'; return el; };

  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }

  /** 确定性补间：同一元素可挂多段动画；支持 x / y / s / sx / sy / r / o，o 可单独指定缓动（如 flick 闪烁） */
  class Animator {
    constructor() { this.map = new Map(); this.fns = []; }
    add(el, at, d, from, to, ease = 'out', oEase) {
      if (!this.map.has(el)) this.map.set(el, []);
      this.map.get(el).push({ at, d, from, to, ease, oEase });
      this.map.get(el).sort((a, b) => a.at - b.at);
      return this;
    }
    fn(f) { this.fns.push(f); return this; }
    update(t) {
      this.map.forEach((list, el) => {
        let a = list[0], raw = 0;
        for (const it of list) if (t >= it.at) a = it;
        if (t >= a.at) raw = clamp01((t - a.at) / Math.max(0.001, a.d));
        const p = t >= a.at ? EASE[a.ease](raw) : 0;
        const po = t >= a.at ? EASE[a.oEase || a.ease](raw) : 0;
        const st = {};
        ['x', 'y', 's', 'sx', 'sy', 'r', 'o'].forEach((k) => {
          const dv = k === 's' || k === 'o' || k === 'sx' || k === 'sy' ? 1 : 0;
          const f = a.from[k] != null ? a.from[k] : (a.to[k] != null ? a.to[k] : dv);
          const tt = a.to[k] != null ? a.to[k] : f;
          st[k] = f + (tt - f) * (k === 'o' ? po : p);
        });
        el.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) rotate(${st.r.toFixed(2)}deg) scale(${(st.s * st.sx).toFixed(4)}, ${(st.s * st.sy).toFixed(4)})`;
        el.style.opacity = clamp01(st.o).toFixed(3);
      });
      this.fns.forEach((f) => f(t));
    }
  }

  /** "这句**关键词**话\n换行" → 只渲染前 k 个可见字符（打字机），** 段落渲染为琥珀反显块 */
  function markN(src, k) {
    const s = String(src == null ? '' : src);
    let out = '', n = 0, inEm = false;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '*' && s[i + 1] === '*') { out += inEm ? '</em>' : '<em>'; inEm = !inEm; i++; continue; }
      if (n >= k) break;
      out += s[i] === '\n' ? '<br/>' : esc(s[i]);
      if (s[i] !== '\n') n++;
    }
    if (inEm) out += '</em>';
    return out;
  }
  const plainLen = (src) => String(src == null ? '' : src).replace(/\*\*/g, '').replace(/\n/g, '').length;
  const mark = (src) => markN(src, 1e9);

  /** 打字机：在 [t0, t0+len/cps] 内逐字敲出；打字时尾随 █ 光标，打完后可选继续闪烁 */
  function typer(A, el, src, t0, cps = 18, keepCursor = false) {
    const N = plainLen(src), t1 = t0 + N / cps;
    let last = '';
    A.fn((t) => {
      const k = t < t0 ? 0 : Math.min(N, Math.floor((t - t0) * cps + 0.0001));
      const typing = t >= t0 && k < N, cur = typing || (keepCursor && k >= N && blink(t, 1.6));
      const key = `${k}|${cur ? 1 : 0}`;
      if (key === last) return; last = key;
      el.innerHTML = markN(src, k) + (cur ? '<span class="rc-cur">█</span>' : (keepCursor ? '<span class="rc-cur off">█</span>' : ''));
    });
    return t1;
  }

  /** 像素块进度条文本 [████████░░] 80% */
  function pbar(frac, cells = 10, pct = true) {
    const k = Math.round(clamp01(frac) * cells);
    return `[${'█'.repeat(k)}${'░'.repeat(cells - k)}]${pct ? ` ${String(Math.round(clamp01(frac) * 100)).padStart(3, ' ')}%` : ''}`;
  }

  // ============================== 实体道具（纯 SVG / ASCII） ==============================
  const PROPS = {
    /** 硬件拨码开关组（8 位），bits 形如 '10110010' */
    dip(bits = '10110010', label = 'DIP SW1') {
      const n = bits.length, W = 40 + n * 34, H = 128;
      let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible"><rect x="1" y="16" width="${W - 2}" height="96" fill="#B3262E" stroke="#5A0F14" stroke-width="3"/>`;
      s += `<text x="12" y="10" font-family="Consolas, monospace" font-size="14" font-weight="700" fill="var(--rc-amber)" letter-spacing="2">${esc(label)}</text>`;
      s += `<text x="${W - 12}" y="10" text-anchor="end" font-family="Consolas, monospace" font-size="14" font-weight="700" fill="var(--rc-amber)">ON ▲</text>`;
      for (let i = 0; i < n; i++) {
        const x = 20 + i * 34, on = bits[i] === '1';
        s += `<rect x="${x}" y="30" width="22" height="58" fill="#1A1A1A" stroke="#000" stroke-width="2"/>`;
        s += `<rect class="rc-dip-k" data-i="${i}" x="${x + 3}" y="${on ? 33 : 59}" width="16" height="26" fill="#F1F1E8"/>`;
        s += `<text x="${x + 11}" y="106" text-anchor="middle" font-family="Consolas, monospace" font-size="13" font-weight="700" fill="#F7D9DB">${i + 1}</text>`;
      }
      return s + '</svg>';
    },
    /** 示波器小屏（波形由 update 实时重绘） */
    scope(w = 300, hgt = 150) {
      let grid = '';
      for (let x = 0; x <= w; x += w / 6) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${hgt}" stroke="#14532D" stroke-width="1.5"/>`;
      for (let y = 0; y <= hgt; y += hgt / 4) grid += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#14532D" stroke-width="1.5"/>`;
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}">${grid}<path class="rc-wave" d="" stroke="var(--rc-green)" stroke-width="3.5" fill="none" style="filter:drop-shadow(0 0 4px rgba(51,255,102,.9))"/></svg>`;
    },
    /** 磁带 / 软盘小道具（product 占位） */
    floppy() {
      return `<svg viewBox="0 0 300 300"><rect x="20" y="20" width="260" height="260" fill="none" stroke="currentColor" stroke-width="8"/><rect x="80" y="20" width="140" height="90" fill="none" stroke="currentColor" stroke-width="8"/><rect x="170" y="36" width="30" height="58" fill="currentColor"/><rect x="56" y="160" width="188" height="120" fill="none" stroke="var(--rc-amber)" stroke-width="8"/><line x1="76" y1="196" x2="224" y2="196" stroke="var(--rc-amber)" stroke-width="5"/><line x1="76" y1="226" x2="200" y2="226" stroke="var(--rc-amber)" stroke-width="5"/><text x="150" y="268" text-anchor="middle" font-family="Consolas, monospace" font-size="18" font-weight="700" fill="var(--rc-amber)" letter-spacing="3">PRODUCT IMG</text></svg>`;
    }
  };

  /** ASCII 双线窗口：标题嵌在上框线 [ TITLE ]，四角琥珀 + 号 */
  function win(cls, style, title, inner, tone) {
    const el = h('div', `rc-win${tone ? ' ' + tone : ''}${cls ? ' ' + cls : ''}`, style,
      `${title != null ? `<div class="wt">[ ${esc(title)} ]</div>` : ''}<i class="cn k1">+</i><i class="cn k2">+</i><i class="cn k3">+</i><i class="cn k4">+</i>${inner || ''}`);
    return el;
  }
  function kicker(text, style) { return hideIf(h('div', 'rc-kicker', style, `${esc(text)}`), blank(text)); }
  /** 警示 / 印章：ASCII 双线琥珀框，可带小字 */
  function alert(text, small, style, tone) { return hideIf(h('div', `rc-alert${tone ? ' ' + tone : ''}`, style, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`), blank(text)); }
  function chip(text, style, tone) { return hideIf(h('div', `rc-chip${tone ? ' ' + tone : ''}`, style, esc(text)), blank(text)); }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .rc-zone{position:absolute;width:1400px;height:1100px;font-family:var(--rc-font);color:var(--rc-green)}
  .rc-zone *,.rc-sw *{box-sizing:border-box}
  .rc-g{color:var(--rc-green);text-shadow:0 0 10px rgba(51,255,102,.55),0 0 2px rgba(51,255,102,.9)}
  .rc-a{color:var(--rc-amber);text-shadow:0 0 10px rgba(255,176,0,.55),0 0 2px rgba(255,176,0,.9)}
  .rc-win{position:absolute;border:5px double var(--rc-green);background:rgba(4,11,6,.94);box-shadow:0 0 22px rgba(51,255,102,.26),inset 0 0 30px rgba(51,255,102,.07);transform-origin:50% 50%}
  .rc-win.amber{border-color:var(--rc-amber);box-shadow:0 0 22px rgba(255,176,0,.24),inset 0 0 30px rgba(255,176,0,.06)}
  .rc-win.red{border-color:var(--rc-red);box-shadow:0 0 22px rgba(255,51,68,.24),inset 0 0 30px rgba(255,51,68,.05)}
  .rc-win.dim{border-color:#2E8B4E;box-shadow:none}
  .rc-win .wt{position:absolute;left:22px;top:-19px;padding:0 10px;background:var(--rc-screen);color:var(--rc-green);font-size:21px;font-weight:700;letter-spacing:.1em;line-height:30px;white-space:nowrap;z-index:3}
  .rc-win.amber .wt{color:var(--rc-amber)}.rc-win.red .wt{color:var(--rc-red)}
  .rc-win .cn{position:absolute;font-style:normal;color:var(--rc-amber);font-size:30px;font-weight:700;line-height:20px;width:20px;height:20px;text-align:center;background:var(--rc-screen);z-index:3}
  .rc-win .cn.k1{left:-13px;top:-13px}.rc-win .cn.k2{right:-13px;top:-13px}.rc-win .cn.k3{left:-13px;bottom:-13px}.rc-win .cn.k4{right:-13px;bottom:-13px}
  .rc-kicker{position:absolute;padding:5px 16px;background:var(--rc-green);color:#031006;font-size:22px;font-weight:700;letter-spacing:.12em;white-space:nowrap;box-shadow:0 0 16px rgba(51,255,102,.5)}
  .rc-kicker::before{content:'■ ';}
  .rc-head{position:absolute;font-weight:700;letter-spacing:.01em;line-height:1.1;white-space:nowrap;color:var(--rc-green);text-shadow:0 0 14px rgba(51,255,102,.55),0 0 2px rgba(51,255,102,.9)}
  .rc-zone em,.rc-q em{font-style:normal;background:var(--rc-amber);color:#120C00;padding:0 .14em;text-shadow:none;box-shadow:0 0 16px rgba(255,176,0,.55)}
  .rc-cur{color:var(--rc-amber);text-shadow:0 0 10px rgba(255,176,0,.8);margin-left:.06em}
  .rc-cur.off{opacity:0}
  .rc-alert{position:absolute;z-index:8;padding:10px 26px 12px;border:6px double var(--rc-amber);background:#0B0A02;color:var(--rc-amber);font-weight:700;text-align:center;line-height:1.05;white-space:nowrap;
    text-shadow:0 0 14px rgba(255,176,0,.7);box-shadow:0 0 26px rgba(255,176,0,.38),inset 0 0 18px rgba(255,176,0,.12);transform-origin:50% 50%}
  .rc-alert small{display:block;font-size:.34em;letter-spacing:.24em;margin-top:8px}
  .rc-alert.red{border-color:var(--rc-red);color:var(--rc-red);background:#0E0304;text-shadow:0 0 14px rgba(255,51,68,.7);box-shadow:0 0 26px rgba(255,51,68,.38),inset 0 0 18px rgba(255,51,68,.12)}
  .rc-alert.green{border-color:var(--rc-green);color:var(--rc-green);background:#020D05;text-shadow:0 0 14px rgba(51,255,102,.7);box-shadow:0 0 26px rgba(51,255,102,.38),inset 0 0 18px rgba(51,255,102,.12)}
  .rc-alert.inv{background:var(--rc-amber);color:#120C00;text-shadow:none;border-color:#120C00;outline:3px solid var(--rc-amber);outline-offset:3px}
  .rc-chip{position:absolute;z-index:6;padding:6px 14px;background:#031006;border:2px solid var(--rc-green);color:var(--rc-green);font-size:22px;font-weight:700;letter-spacing:.08em;white-space:nowrap;text-shadow:0 0 8px rgba(51,255,102,.6)}
  .rc-chip.amber{border-color:var(--rc-amber);color:var(--rc-amber);text-shadow:0 0 8px rgba(255,176,0,.6)}
  .rc-chip.inv{background:var(--rc-green);color:#031006;text-shadow:none}
  .rc-chip.red{border-color:var(--rc-red);color:var(--rc-red);text-shadow:0 0 8px rgba(255,51,68,.6)}
  .rc-prop{position:absolute;z-index:5}.rc-prop svg{display:block}
  .rc-body{color:var(--rc-ink)}
  /* cover */
  .rc-boot .log{position:absolute;left:34px;top:32px;font-size:22px;line-height:34px;color:#8CF5A8;white-space:pre;text-shadow:0 0 6px rgba(51,255,102,.4)}
  .rc-boot .log b{color:var(--rc-amber);font-weight:700}
  .rc-boot .ttl{position:absolute;left:30px;top:146px;font-size:128px;font-weight:700;line-height:1.08;white-space:nowrap}
  .rc-ch .l{position:absolute;left:24px;top:26px;font-size:20px;font-weight:700;letter-spacing:.24em;color:var(--rc-amber)}
  .rc-ch .n{position:absolute;left:22px;bottom:4px;font-size:150px;font-weight:700;line-height:1;letter-spacing:-.04em}
  .rc-sub .tx{position:absolute;left:30px;top:22px;font-size:40px;font-weight:700;line-height:1.45;white-space:nowrap;color:var(--rc-ink)}
  /* stat */
  .rc-stat{top:300px;height:440px}
  .rc-stat .num{position:absolute;left:30px;top:70px;font-weight:700;letter-spacing:-.04em;line-height:1;white-space:nowrap}
  .rc-stat .num .u,.rc-stat .num .pf{font-size:.24em;letter-spacing:0;margin-left:.2em;vertical-align:.22em}
  .rc-stat .num .pf{margin:0 .12em 0 0}
  .rc-stat .pb{position:absolute;left:30px;bottom:92px;font-size:34px;font-weight:700;white-space:pre;letter-spacing:-.02em}
  .rc-stat .sc{position:absolute;left:32px;bottom:34px;font-size:19px;font-weight:700;letter-spacing:.12em;color:#8CF5A8;white-space:nowrap}
  /* steps */
  .rc-ticket{top:330px;height:400px}
  .rc-ticket .no{position:absolute;left:22px;top:30px;font-size:24px;font-weight:700;letter-spacing:.12em;color:var(--rc-amber)}
  .rc-ticket .nm{position:absolute;left:22px;top:92px;font-size:64px;font-weight:700;line-height:1.05;white-space:nowrap}
  .rc-ticket .pb{position:absolute;left:22px;bottom:84px;font-size:22px;font-weight:700;white-space:pre;color:var(--rc-green)}
  .rc-ticket .fn{position:absolute;left:16px;right:16px;bottom:18px;padding:8px 10px;border:2px solid #2E8B4E;color:var(--rc-amber);font-size:20px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 6px rgba(255,176,0,.5)}
  .rc-ticket.on{background:rgba(10,40,18,.96)}
  .rc-arw{position:absolute;font-size:44px;font-weight:700;line-height:1;z-index:4}
  .rc-steps-bar{left:60px;top:800px;width:1280px;height:104px;display:flex;align-items:center;gap:24px;padding:0 30px}
  .rc-steps-bar .f{font-size:30px;font-weight:700;letter-spacing:.04em;white-space:nowrap}
  .rc-steps-bar .b{padding:2px 14px;background:var(--rc-amber);color:#120C00;font-size:42px;font-weight:700;white-space:nowrap;box-shadow:0 0 16px rgba(255,176,0,.5)}
  .rc-steps-bar .m{margin-left:auto;margin-right:250px;font-size:16px;font-weight:700;color:#8CF5A8;line-height:1.4;text-align:right;white-space:nowrap}
  /* checklist */
  .rc-card{left:250px;top:100px;width:900px}
  .rc-card .ttl{position:absolute;left:40px;top:40px;font-size:96px;font-weight:700;letter-spacing:-.02em;line-height:1;white-space:nowrap}
  .rc-card .sub{position:absolute;left:44px;top:158px;font-size:34px;font-weight:700;white-space:nowrap;color:var(--rc-ink)}
  .rc-card .hr{position:absolute;left:40px;right:40px;top:216px;font-size:24px;line-height:24px;white-space:nowrap;overflow:hidden;color:#2E8B4E}
  .rc-row{position:absolute;left:40px;right:40px;height:100px}
  .rc-row .hl{position:absolute;left:96px;top:10px;height:56px;width:520px;transform-origin:left center;background:#14532D;box-shadow:0 0 14px rgba(51,255,102,.25)}
  .rc-row .box{position:absolute;left:0;top:12px;font-size:40px;font-weight:700;white-space:pre;line-height:1.2}
  .rc-row .box b{color:var(--rc-amber);text-shadow:0 0 10px rgba(255,176,0,.8)}
  .rc-row .k{position:absolute;left:108px;top:12px;font-size:40px;font-weight:700;white-space:nowrap;line-height:1.2}
  .rc-row .d{position:absolute;left:110px;top:72px;font-size:23px;font-weight:700;color:#8CF5A8;white-space:nowrap}
  .rc-row .n{position:absolute;right:0;top:20px;font-size:19px;font-weight:700;color:var(--rc-amber)}
  .rc-memo{position:absolute;right:46px;z-index:6;padding:18px 26px 20px;font-size:40px;font-weight:700;white-space:nowrap}
  .rc-memo small{display:block;font-size:18px;letter-spacing:.14em;margin-bottom:8px;color:#8CF5A8;text-shadow:none}
  /* compare */
  .rc-cmp{top:290px;width:540px;height:440px}
  .rc-cmp .band{position:absolute;left:0;right:0;top:0;height:58px;font-size:22px;font-weight:700;letter-spacing:.12em;padding:14px 22px;white-space:nowrap}
  .rc-cmp.red .band{background:var(--rc-red);color:#160204}
  .rc-cmp.ok .band{background:var(--rc-green);color:#031006}
  .rc-cmp .t{position:absolute;left:30px;top:92px;font-size:58px;font-weight:700;line-height:1.16;white-space:nowrap}
  .rc-cmp .d{position:absolute;left:30px;right:30px;top:262px;font-size:26px;font-weight:700;line-height:1.5}
  .rc-cmp.red .t,.rc-cmp.red .d{color:#A3B3A7;text-shadow:none}
  .rc-cmp.ok .d{color:var(--rc-ink)}
  .rc-cmp svg.strike{position:absolute;left:18px;top:98px;overflow:visible}
  .rc-cmp .badge{position:absolute;right:-26px;top:-30px;padding:4px 10px;background:#0B0A02;border:4px double var(--rc-amber);color:var(--rc-amber);font-size:34px;font-weight:700;z-index:4;text-shadow:0 0 10px rgba(255,176,0,.8)}
  .rc-vs{position:absolute;left:640px;top:450px;width:120px;height:120px;z-index:6;display:flex;align-items:center;justify-content:center;border:5px double var(--rc-amber);background:#0B0A02;font-size:50px;font-weight:700;color:var(--rc-amber);text-shadow:0 0 14px rgba(255,176,0,.8);box-shadow:0 0 22px rgba(255,176,0,.35)}
  .rc-verdict{left:60px;top:800px;width:1280px;height:116px;display:flex;align-items:center;gap:26px;padding:0 30px;z-index:7}
  .rc-verdict b{padding:6px 14px;background:var(--rc-amber);color:#120C00;font-size:22px;letter-spacing:.16em;white-space:nowrap}
  .rc-verdict span{font-size:46px;font-weight:700;white-space:nowrap;color:var(--rc-green);text-shadow:0 0 12px rgba(51,255,102,.5)}
  /* timeline */
  .rc-tl-line{position:absolute;left:60px;top:548px;height:12px;transform-origin:left center;background:repeating-linear-gradient(90deg,var(--rc-green) 0 26px,transparent 26px 34px);box-shadow:0 0 14px rgba(51,255,102,.45)}
  .rc-tl-node{width:240px;height:200px}
  .rc-tl-node .tm{position:absolute;left:18px;top:24px;font-size:42px;font-weight:700;letter-spacing:-.02em;line-height:1.05;white-space:nowrap}
  .rc-tl-node .t{position:absolute;left:18px;top:84px;font-size:34px;font-weight:700;white-space:nowrap}
  .rc-tl-node .d{position:absolute;left:18px;right:14px;top:134px;font-size:20px;font-weight:700;line-height:1.35;color:#8CF5A8}
  .rc-tl-node.now .tm{background:var(--rc-amber);color:#120C00;padding:0 8px;left:12px;text-shadow:none}
  .rc-tl-stem{position:absolute;width:0;border-left:4px dashed var(--rc-green)}
  .rc-tl-dot{position:absolute;width:30px;height:30px;background:var(--rc-screen);border:4px solid var(--rc-green);z-index:6;box-shadow:0 0 12px rgba(51,255,102,.6)}
  .rc-tl-dot.now{background:var(--rc-amber);border-color:var(--rc-amber);box-shadow:0 0 18px rgba(255,176,0,.9)}
  /* diagram */
  .rc-dg-node{width:260px;height:124px;z-index:3}
  .rc-dg-node .l{position:absolute;left:18px;top:24px;font-size:36px;font-weight:700;white-space:nowrap}
  .rc-dg-node .s{position:absolute;left:18px;right:12px;top:76px;font-size:18px;font-weight:700;color:var(--rc-amber);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rc-dg-node.hot{background:var(--rc-amber);border-color:var(--rc-amber)}
  .rc-dg-node.hot .l,.rc-dg-node.hot .s{color:#120C00;text-shadow:none}
  .rc-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none;filter:drop-shadow(0 0 5px rgba(51,255,102,.7))}
  .rc-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .rc-dg-tag{padding:3px 12px;background:var(--rc-green);color:#031006;font-size:18px;font-weight:700;white-space:nowrap;box-shadow:0 0 12px rgba(51,255,102,.6)}
  /* showcase */
  .rc-panel{left:60px;top:262px;width:1240px;height:640px;overflow:hidden}
  .rc-panel .bar{position:absolute;left:0;right:0;top:0;height:52px;display:flex;align-items:center;gap:14px;padding:0 20px;background:#0C2414;border-bottom:3px solid var(--rc-green);font-size:20px;font-weight:700;letter-spacing:.08em;color:var(--rc-green);white-space:nowrap}
  .rc-panel .bar .tt{flex:1}
  .rc-panel .bar .st{color:var(--rc-amber)}
  .rc-panel .bar .rec{color:var(--rc-red)}
  .rc-code{position:absolute;left:0;right:0;top:52px;padding:24px 30px;font-size:31px;font-weight:700;line-height:1.62;white-space:pre;color:var(--rc-green);text-shadow:0 0 8px rgba(51,255,102,.5)}
  .rc-code .ln{display:inline-block;width:60px;color:#2E8B4E;text-shadow:none}
  .rc-code .c{color:#7FCB95;text-shadow:none}.rc-code .k{color:var(--rc-amber);text-shadow:0 0 8px rgba(255,176,0,.5)}.rc-code .ok{color:#B6FFC9}
  .rc-panel.doc .rc-code{font-size:34px;color:var(--rc-amber);text-shadow:0 0 8px rgba(255,176,0,.45)}
  .rc-panel.doc .rc-code .k{color:var(--rc-green)}
  .rc-media{position:absolute;left:0;right:0;top:52px;width:100%;height:calc(100% - 52px);object-fit:cover;background:#000;filter:grayscale(1) sepia(1) hue-rotate(72deg) saturate(2.6) brightness(.95) contrast(1.15)}
  .rc-media-sl{position:absolute;left:0;right:0;top:52px;bottom:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 2px,transparent 2px 4px);pointer-events:none}
  .rc-callout{position:absolute;display:flex;align-items:center;gap:6px;z-index:6;white-space:nowrap}
  .rc-callout .ar{font-size:30px;font-weight:700;color:var(--rc-amber);text-shadow:0 0 10px rgba(255,176,0,.8)}
  .rc-callout span{padding:6px 16px;background:var(--rc-amber);color:#120C00;font-size:26px;font-weight:700;box-shadow:0 0 18px rgba(255,176,0,.55)}
  .rc-prod{position:absolute;left:0;right:0;top:52px;bottom:0}
  .rc-prod .pic{position:absolute;left:30px;top:30px;bottom:34px;width:470px;border:3px dashed #2E8B4E;display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--rc-green)}
  .rc-prod .pic img{width:100%;height:100%;object-fit:contain;filter:grayscale(1) sepia(1) hue-rotate(72deg) saturate(2.6)}
  .rc-prod .pic svg{width:76%;height:auto;filter:drop-shadow(0 0 6px rgba(51,255,102,.7))}
  .rc-prod .info{position:absolute;left:550px;right:40px;top:30px}
  .rc-prod .nm{font-size:56px;font-weight:700;line-height:1.08;white-space:nowrap}
  .rc-prod .tg{display:inline-block;margin-top:12px;padding:3px 12px;background:var(--rc-green);color:#031006;font-size:22px;font-weight:700;white-space:nowrap}
  .rc-prod .specs{margin-top:22px;border-top:3px double var(--rc-green)}
  .rc-prod .row{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:2px dashed #2E8B4E;white-space:nowrap}
  .rc-prod .row .k{font-size:20px;font-weight:700;letter-spacing:.06em;color:#8CF5A8}
  .rc-prod .row .v{font-size:26px;font-weight:700;color:var(--rc-amber)}
  /* quote（屏幕层） */
  .rc-q{position:absolute;top:196px;width:fit-content;min-width:420px;max-width:720px;padding:40px 44px 40px;background:rgba(3,9,4,.93)}
  .rc-q .k{display:inline-block;padding:5px 14px;background:var(--rc-green);color:#031006;font-size:20px;font-weight:700;letter-spacing:.16em}
  .rc-q .t{font-size:64px;font-weight:700;line-height:1.3;margin-top:24px;color:var(--rc-green);text-shadow:0 0 16px rgba(51,255,102,.6),0 0 2px rgba(51,255,102,.9);font-family:var(--rc-font)}
  .rc-q .by{margin-top:22px;font-size:22px;font-weight:700;letter-spacing:.1em;color:var(--rc-amber)}
  /* outro */
  .rc-act{left:60px;width:580px;height:164px}
  .rc-act .tg{position:absolute;left:24px;top:22px;padding:2px 12px;font-size:18px;font-weight:700;letter-spacing:.14em}
  .rc-act .t{position:absolute;left:24px;top:60px;font-size:40px;font-weight:700;line-height:1.2;white-space:nowrap}
  .rc-act .d{position:absolute;left:24px;top:116px;font-size:20px;font-weight:700;color:var(--rc-amber);white-space:nowrap}
  .rc-act .no{position:absolute;right:22px;top:20px;font-size:64px;font-weight:700;color:transparent;-webkit-text-stroke:2px var(--rc-green);line-height:1}
  .rc-cta{left:700px;top:280px;width:640px;height:500px;padding:40px 40px}
  .rc-cta .k{display:inline-block;padding:5px 14px;background:var(--rc-amber);color:#120C00;font-size:20px;font-weight:700;letter-spacing:.16em}
  .rc-cta .t{font-size:66px;font-weight:700;margin-top:20px;line-height:1.1;white-space:nowrap}
  .rc-cta .repo{margin-top:26px;padding:12px 16px;border:2px solid #2E8B4E;color:var(--rc-ink);font-size:25px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rc-cta .repo::before{content:'> ';color:var(--rc-amber)}
  .rc-cta .btns{display:flex;gap:18px;margin-top:36px}
  .rc-cta .btns span{flex:1;text-align:center;padding:12px 0;border:3px solid var(--rc-green);color:var(--rc-green);font-size:32px;font-weight:700;white-space:nowrap;text-shadow:0 0 8px rgba(51,255,102,.6)}
  .rc-cta .btns span.hit{background:var(--rc-green);color:#031006;text-shadow:none;box-shadow:0 0 22px rgba(51,255,102,.8)}
  `;
  function injectCSS() {
    if (document.getElementById('rc-components-css')) return;
    const st = document.createElement('style'); st.id = 'rc-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  /** CRT 开窗：纵向从一条线展开 + 荧光闪烁点亮 */
  const winOpen = (A, el, at, d = 0.4) => { A.add(el, -1, 0.01, { o: 0, sy: 0.02 }, { o: 0, sy: 0.02 }); return A.add(el, at, d, { sy: 0.02, o: 0 }, { sy: 1, o: 1 }, 'out', 'flick'); };
  /** 警示框点亮：放大落位 + 闪烁 */
  const alertOn = (A, el, at, r = 0) => A.add(el, at, 0.42, { s: 1.5, o: 0, r }, { s: 1, o: 1, r }, 'out', 'flick');
  /** 小部件弹入（像素阶梯） */
  const pop = (A, el, at, d = 0.3) => A.add(el, at, d, { s: 0.2, o: 0 }, { s: 1, o: 1 }, 'step');

  // ============================== 1. cover 开机自检 BOOT 封面 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'rc-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const boot = win('rc-boot', 'left:60px;top:170px;width:890px;height:470px;', 'BOOT.SYS', '<div class="log"></div><div class="ttl rc-g"></div>');
    const log = boot.querySelector('.log'), ttl = boot.querySelector('.ttl');
    const ch = hideIf(win('rc-ch', 'left:60px;top:680px;width:260px;height:230px;', null, `${blank(data.chapterLabel) ? '' : `<div class="l">${esc(data.chapterLabel)}</div>`}<div class="n rc-a">${esc(data.chapter || '')}</div>`, 'amber'),
      blank(data.chapterLabel) && blank(data.chapter));
    const sub = hideIf(win('rc-sub', 'left:360px;top:680px;width:590px;height:156px;', 'README', `<div class="tx">${mark(data.subtitle)}</div>`), blank(data.subtitle));
    const dm = chip(data.dim || '', 'left:360px;top:862px;font-size:26px;', 'inv');
    const st = alert(data.stamp || '', data.stampSmall || '', 'left:1000px;top:186px;font-size:72px;min-width:280px;', 'inv');
    const dip = h('div', 'rc-prop', 'left:1000px;top:420px;', PROPS.dip('10110010', 'DIP SW1'));
    const scope = win('', 'left:1000px;top:604px;width:320px;height:200px;', 'SIGNAL', `<div style="position:absolute;left:8px;top:24px;">${PROPS.scope(294, 150)}</div>`);
    const wave = scope.querySelector('.rc-wave');
    const sysl = chip('SYS READY ●', 'left:1000px;top:834px;font-size:20px;');
    el.append(kick, boot, ch, sub, dm, dip, scope, sysl, st);
    const LOG = ['MVE BIOS v2.6  (C) 1986 MUSHANHE SYSTEMS', 'MEMORY TEST ....... <b>640K OK</b>', 'LOADING demo_data.json ... <b>[ OK ]</b>'];
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    winOpen(A, boot, 0.15, 0.45);
    A.fn((t) => { // 自检日志逐行出现
      const k = Math.max(0, Math.min(LOG.length, Math.floor((t - 0.5) / 0.22) + 1));
      log.innerHTML = LOG.slice(0, k).join('\n');
    });
    const tT = typer(A, ttl, data.title, 1.25, 7, true);
    winOpen(A, ch, tT + 0.05, 0.35);
    winOpen(A, sub, tT + 0.25, 0.35);
    pop(A, dm, tT + 0.7);
    pop(A, dip, 0.9, 0.35);
    winOpen(A, scope, 1.1, 0.35);
    pop(A, sysl, 1.5);
    alertOn(A, st, Math.min(D - 1.2, tT + 1.2), -4);
    const dipKeys = Array.from(dip.querySelectorAll('.rc-dip-k'));
    A.fn((t) => {
      // 示波器：确定性波形
      let d = '';
      for (let x = 0; x <= 294; x += 6) {
        const y = 75 + Math.sin(x * 0.06 + t * 5) * 34 * Math.cos(t * 0.9) + Math.sin(x * 0.17 - t * 3) * 10;
        d += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)} `;
      }
      wave.setAttribute('d', d);
      // 拨码开关：依次拨动
      dipKeys.forEach((k, i) => { const on = ((Math.floor(t * 1.5) + i * 3) % 7) < 4; k.setAttribute('y', on ? 33 : 59); });
      sysl.style.color = blink(t, 1) ? 'var(--rc-green)' : '#2E8B4E';
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 560, 420, 1.25, 2, -4, -0.6), CAM(1.6, 700, 505, 1.0, 1, -1.5, 0), CAM(D, 712, 508, 1.03, 0.5, 1, 0.2)] };
  }

  // ============================== 2. stat 数字计数器 + 像素进度条 ==============================
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
    const el = h('div', 'rc-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'rc-head', 'left:56px;top:160px;font-size:88px;');
    const gap = 44, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 240 : n === 2 ? 180 : 130;
    const cards = items.map((it, i) => {
      const hot = i === n - 1;
      return win('rc-stat', `left:${60 + i * (w + gap)}px;width:${w}px;`, it.label || `CH_${i + 1}`,
        `<div class="num ${hot ? 'rc-a' : 'rc-g'}" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="pb ${hot ? 'rc-a' : 'rc-g'}"></div><div class="sc">ADDR 0x${(0x3F00 + i * 0x80).toString(16).toUpperCase()} · CH_${pad2(i + 1)}</div>`, hot ? 'amber' : '');
    });
    const nums = cards.map((c) => c.querySelector('.num')), pbs = cards.map((c) => c.querySelector('.pb'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const st = data.delta ? alert(data.delta, data.deltaSmall || '', 'left:990px;top:778px;font-size:56px;') : null;
    const note = data.note ? h('div', 'rc-head', 'left:60px;top:812px;font-size:30px;color:#8CF5A8;text-shadow:none;', `// ${esc(data.note)}`) : null;
    const live = chip(`● SAMPLE ${n}/${n}`, 'left:1110px;top:178px;font-size:20px;', 'red');
    el.append(kick, head, ...cards, live);
    if (note) el.appendChild(note);
    if (st) el.appendChild(st);
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    typer(A, head, data.title, 0.2, 16, false);
    const tIn = cards.map((_, i) => 0.7 + i * 0.45);
    cards.forEach((c, i) => winOpen(A, c, tIn[i], 0.4));
    pop(A, live, 0.5);
    if (note) A.add(note, D - 2.4, 0.35, { o: 0, x: -20 }, { o: 1, x: 0 }, 'out', 'flick');
    if (st) alertOn(A, st, Math.min(D - 1.2, tIn[n - 1] + 2.0), -3);
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 70); fitted = true; }
      items.forEach((it, i) => {
        const p = EASE.out(clamp01((t - tIn[i] - 0.3) / 1.3));
        nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * p, decs[i]);
        const bar = it.bar != null ? clamp01(it.bar) : 1;
        pbs[i].textContent = pbar(bar * EASE.step(clamp01((t - tIn[i] - 0.9) / 0.9)), 12);
      });
      live.style.opacity = t < 0.5 ? live.style.opacity : (blink(t, 1.2) ? '1' : '0.35');
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 550, 1.12, 1.5, -2.5, -0.5), CAM(1.2, 700, 510, 1.0, 1, -1, 0), CAM(D, 708, 505, 1.04, 0.5, 1, 0.2)] };
  }

  // ============================== 3. steps 进程窗口逐个启动 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'rc-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'rc-head', 'left:56px;top:160px;font-size:90px;');
    const tag = chip(data.dim || '', 'left:1120px;top:184px;font-size:30px;', 'amber');
    const AW = 56, cw = (1280 - AW * (n - 1)) / n;
    const cards = items.map((it, i) => win('rc-ticket', `left:${60 + i * (cw + AW)}px;width:${cw}px;`, `PID ${pad2(i + 1)}`,
      `<div class="no">STEP_${esc(it.no || pad2(i + 1))}</div><div class="nm rc-g">${esc(it.title)}</div><div class="pb"></div>${blank(it.desc) ? '' : `<div class="fn">&gt; ${esc(it.desc)}</div>`}`));
    const arrows = items.slice(1).map((_, i) => h('div', 'rc-arw rc-a', `left:${60 + (i + 1) * (cw + AW) - AW + 6}px;top:506px;`, '►'));
    const bar = hideIf(win('rc-steps-bar', null, 'DIR',
      `<div class="f rc-g">${esc(data.folder || '')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`),
      blank(data.folder) && blank(data.folderBig) && blank(data.folderMeta));
    const label = data.label ? alert(data.label, data.labelSmall || '', 'left:1066px;top:770px;font-size:36px;') : null;
    el.append(kick, head, tag, ...cards, ...arrows, bar);
    if (label) el.appendChild(label);
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    typer(A, head, data.title, 0.2, 16, false);
    pop(A, tag, 0.7);
    winOpen(A, bar, 0.5, 0.4);
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.5, D - 2.4), t0 + 0.7 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    cards.forEach((c, i) => winOpen(A, c, t0 + i * stp, 0.4));
    arrows.forEach((a, i) => pop(A, a, t0 + (i + 1) * stp - 0.1, 0.25));
    if (label) alertOn(A, label, D - 1.3, -3);
    const pbs = cards.map((c) => c.querySelector('.pb'));
    A.fn((t) => cards.forEach((c, i) => {
      const p = EASE.step(clamp01((t - t0 - i * stp - 0.35) / 0.8));
      pbs[i].textContent = `${pbar(p, 6, false)} ${p >= 1 ? 'OK' : '..'}`;
      pbs[i].style.color = p >= 1 ? 'var(--rc-green)' : 'var(--rc-amber)';
      // 当前执行中的进程窗口亮底
      const active = t >= t0 + i * stp && (i === n - 1 || t < t0 + (i + 1) * stp);
      c.classList.toggle('on', active);
    }));
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 600, 1.2, 2, -2.5, -0.5), CAM(1.2, 700, 510, 1.0, 1, -1, 0), CAM(D, 705, 505, 1.03, 0.5, 1, 0.2)] };
  }

  // ============================== 4. checklist RULES.md 逐条 [✓] ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const RH = 100, R0 = 250;
    const H = R0 + n * RH + (data.note ? 150 : 30);
    const el = h('div', 'rc-zone');
    const card = win('rc-card', `height:${H}px;`, blank(data.kicker) ? null : data.kicker,
      `<div class="ttl rc-g">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div><div class="hr">${'═'.repeat(60)}</div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'rc-row', `top:${R0 + i * RH}px;`,
        `<div class="hl"></div><div class="box rc-g">[<b> </b>]</div><div class="k rc-g">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">#${pad2(i + 1)}</div>`);
      card.appendChild(r); return r;
    });
    let memo = null;
    if (data.note) {
      memo = win('rc-memo', `top:${R0 + n * RH + 22}px;`, null, `<small>${esc(data.noteLead || '')}</small><span class="rc-a">${mark(data.note)}</span>`, 'amber');
      card.appendChild(memo);
    }
    const pass = alert(`${n}/${n} PASS`, '', 'left:1090px;top:150px;font-size:34px;', 'green');
    el.append(card, pass);
    winOpen(A, card, 0, 0.5);
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.5 : 1.3)), t0 + 0.6 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    rows.forEach((r, i) => {
      A.add(r, t0 + i * stp - 0.3, 0.25, { o: 0.22 }, { o: 1 }, 'linear', 'flick');
      A.add(r.querySelector('.hl'), t0 + i * stp + 0.1, 0.32, { sx: 0 }, { sx: 1 }, 'step');
    });
    let measured = false;
    const bs = rows.map((r) => r.querySelector('.box b'));
    A.fn((t) => {
      if (!measured) { rows.forEach((r) => { const k = r.querySelector('.k'); const w = k.scrollWidth; if (w > 0) { r.querySelector('.hl').style.width = `${w + 26}px`; measured = true; } }); }
      bs.forEach((b, i) => { b.textContent = t >= t0 + i * stp ? '✓' : (t >= t0 + i * stp - 0.3 && blink(t, 4) ? '_' : ' '); });
    });
    if (memo) winOpen(A, memo, D - 2.0, 0.4);
    alertOn(A, pass, Math.max(t1 + 0.3, D - 1.6), 4);
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.04, 1.5, -2, 0), CAM(1.0, 700, 500, 1.01, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.01, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 5. compare ERROR 红窗 vs OK 绿窗 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'rc-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'rc-head', 'left:56px;top:160px;font-size:88px;');
    const L = win('rc-cmp', 'left:60px;', null,
      `<div class="band">${esc(w.label || '✕')}</div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div><svg class="strike" width="480" height="150"><path d="M4 44 L440 38" stroke="var(--rc-red)" stroke-width="10" fill="none" stroke-dasharray="440" stroke-dashoffset="440"/><path d="M4 112 L400 106" stroke="var(--rc-red)" stroke-width="10" fill="none" stroke-dasharray="400" stroke-dashoffset="400"/></svg>`, 'red');
    L.classList.add('red');
    const R = win('rc-cmp ok', 'left:800px;', null,
      `<div class="band">${esc(r.label || '✓')}</div><div class="t rc-g">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div><div class="badge">[✓]</div>`);
    const vs = h('div', 'rc-vs', null, 'VS');
    const xs = alert(w.stamp || '✕', 'ERR 0x0F', 'left:300px;top:640px;font-size:40px;', 'red');
    const verdict = hideIf(win('rc-verdict', null, null, `${blank(data.verdictLabel) ? '' : `<b>${esc(data.verdictLabel)}</b>`}<span>${mark(data.verdict || '')}</span>`, 'amber'), blank(data.verdict));
    const ok = alert('OK', '', 'left:1236px;top:748px;font-size:38px;z-index:9;', 'green');
    el.append(kick, head, L, R, vs, xs, verdict, ok);
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    typer(A, head, data.title, 0.2, 16, false);
    winOpen(A, L, 0.5, 0.42);
    const tStrike = Math.min(D * 0.28, 1.7);
    const strikes = L.querySelectorAll('path');
    alertOn(A, xs, tStrike + 0.7, -4);
    pop(A, vs, tStrike + 0.3, 0.3);
    const tR = Math.min(D * 0.48, tStrike + 1.3);
    winOpen(A, R, tR, 0.42);
    const badge = R.querySelector('.badge');
    pop(A, badge, tR + 0.6, 0.3);
    const tV = Math.min(D - 1.5, tR + 1.3);
    winOpen(A, verdict, tV, 0.4);
    alertOn(A, ok, tV + 0.45);
    A.fn((t) => {
      strikes.forEach((p, i) => { const len = +p.getAttribute('stroke-dasharray'); p.setAttribute('stroke-dashoffset', (len * (1 - EASE.inOut(clamp01((t - tStrike - i * 0.28) / 0.32)))).toFixed(1)); });
      if (t > tStrike + 1.2) xs.style.opacity = blink(t, 1.5) ? '1' : '0.45';
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.12, 1, -2.5, 0), CAM(1.0, 700, 505, 1.0, 0.5, -1, 0), CAM(D, 700, 510, 1.02, 0.5, 1.2, 0)] };
  }

  // ============================== 6. timeline 虚线磁轨 + 节点窗口 ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'rc-zone', `width:${W}px;`);
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'rc-head', 'left:56px;top:160px;font-size:88px;');
    const line = h('div', 'rc-tl-line', `width:${W - 120}px;`);
    el.append(kick, head, line);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 292 : 640, at = t0 + i * stp, isNow = i === now;
      const card = win(`rc-tl-node${isNow ? ' now' : ''}`, `left:${x}px;top:${top}px;`, null,
        `<div class="tm ${isNow ? '' : 'rc-a'}">${esc(nd.time || '')}</div><div class="t rc-g">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`, isNow ? 'amber' : '');
      const stem = h('div', 'rc-tl-stem', `left:${x + 36}px;top:${up ? 497 : 566}px;height:${up ? 50 : 74}px;`);
      const dot = h('div', `rc-tl-dot${isNow ? ' now' : ''}`, `left:${x + 23}px;top:539px;`);
      el.append(stem, dot, card);
      pop(A, dot, at - 0.1, 0.25);
      A.add(stem, at, 0.2, { o: 0 }, { o: 1 }, 'step');
      winOpen(A, card, at + 0.05, 0.38);
      return { x, up, top, at, dot };
    });
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = alert(data.nowLabel, data.nowSmall || '', `left:${Math.min(W - 290, p.x + (p.up ? 10 : 110))}px;top:${p.up ? 612 : p.top + 214}px;font-size:36px;`);
      el.appendChild(ns);
      alertOn(A, ns, Math.min(D - 0.9, p.at + 0.7), -3);
    }
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    typer(A, head, data.title, 0.2, 16, false);
    A.add(line, 0.4, 0.8, { sx: 0 }, { sx: 1 }, 'step');
    const nowDot = parts[now] && parts[now].dot;
    if (nowDot) A.fn((t) => { if (t > parts[now].at + 0.3) nowDot.style.background = blink(t, 1.5) ? 'var(--rc-amber)' : 'var(--rc-screen)'; });
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1.5, -2.5, -0.4), CAM(0.9, 700, 508, 1.0, 1, -1, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 508, 1.0, 0.5, 1, 0), CAM(D, endX + 8, 505, 1.02, 0.3, 1, 0.2)] };
  }

  // ============================== 7. diagram 节点窗口 + 荧光数据总线 ==============================
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
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
  let DG_SEQ = 0;
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 290, AW = 1280, AH = 610, NW = 260, NH = 124;
    const el = h('div', 'rc-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'rc-head', 'left:56px;top:160px;font-size:88px;');
    el.append(kick, head);
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = win('rc-dg-node', `left:${x}px;top:${y}px;`, `N${pad2(i + 1)}`, `<div class="l rc-g">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      el.appendChild(e);
      winOpen(A, e, appear[nd.id], 0.36);
      return e;
    });
    const mid = `rcdg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="18" markerHeight="18" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill="#33FF66"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="#33FF66" stroke-width="5" fill="none" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mid})"/>`;
      inner += `<rect class="pl" data-j="${j}" data-k="0" x="-8" y="-8" width="16" height="16" fill="#FFB000" opacity="0"/><rect class="pl" data-j="${j}" data-k="1" x="-8" y="-8" width="16" height="16" fill="#FFB000" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rc-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'rc-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'rc-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      pop(A, tg, tDraw[j] + 0.4, 0.25);
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = alert(data.focusLabel, data.focusSmall || '', `left:${Math.min(1120, p.x + 140)}px;top:${p.y - 78}px;font-size:32px;`);
      el.appendChild(st);
      alertOn(A, st, tF + 0.25, -4);
    }
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    typer(A, head, data.title, 0.2, 16, false);
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

  // ============================== 8. showcase TTY 终端 / 文档 / 录屏 / 产品 ==============================
  function productPanel(data) {
    const el = h('div', 'rc-prod');
    const pic = h('div', 'pic');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.innerHTML = PROPS.floppy();
    const info = h('div', 'info', null, `<div class="nm rc-g">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? alert(data.price, data.priceSmall || '', 'right:46px;bottom:34px;font-size:46px;', 'inv') : null;
    if (price) el.appendChild(price);
    return { el, pic, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'rc-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'rc-head', 'left:56px;top:150px;font-size:80px;');
    const panel = win(`rc-panel${kind === 'doc' ? ' doc' : ''}`, null, null,
      `<div class="bar"><span>■</span><span class="tt">${esc(data.file || '')}</span><span class="st">9600 8N1</span><span class="rec">● ${kind === 'video' ? 'PLAY' : 'ONLINE'}</span></div>`);
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'rc-media'); media.src = data.src; panel.append(media, h('div', 'rc-media-sl')); }
    else if (kind === 'video' && data.src) { media = h('video', 'rc-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.append(media, h('div', 'rc-media-sl')); }
    else { codeEl = h('div', 'rc-code'); panel.appendChild(codeEl); }
    const notes = (data.notes || []).filter((nt) => nt && !blank(nt.text)).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 262 + 640 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      return h('div', 'rc-callout', `left:${px.toFixed(0)}px;top:${(py - 24).toFixed(0)}px;`, `<b class="ar">◄──</b><span>${esc(nt.text)}</span>`);
    });
    const tag = chip(blank(data.kind) ? '' : kind.toUpperCase(), 'left:1170px;top:212px;font-size:22px;', 'inv');   // v3.5：没写 kind 不出默认 CODE
    el.append(kick, head, panel, ...notes, tag);
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    typer(A, head, data.title, 0.2, 16, false);
    winOpen(A, panel, 0.35, 0.45);
    pop(A, tag, 0.85);
    const tType0 = 0.95, tType1 = Math.max(tType0 + 0.6, D * 0.6);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.9 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.35, { o: 0, x: 40 }, { o: 1, x: 0 }, 'step', 'flick'));
    if (prod) {
      pop(A, prod.pic, 0.75, 0.4);
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.28, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick'));
      if (prod.price) alertOn(A, prod.price, Math.min(D - 1.2, 1.3 + prod.rows.length * 0.28 + 0.3), -3);
    }
    A.fn((t) => {
      if (codeEl) {
        let budget = Math.floor(total * clamp01((t - tType0) / (tType1 - tType0))), html = '', cur = false;
        lines.forEach((l, i) => {
          const tx = String(l.t != null ? l.t : l), cls = l.c || '';
          const k = Math.min(tx.length, budget); budget -= k;
          if (k <= 0 && i > 0) return;
          html += `<span class="ln">${pad2(i + 1)}</span>${cls ? `<span class="${cls}">${esc(tx.slice(0, k))}</span>` : esc(tx.slice(0, k))}`;
          if (k < tx.length && !cur) { html += '<span class="rc-cur">█</span>'; cur = true; }
          html += '\n';
        });
        if (!cur) html += `<span class="ln">${pad2(lines.length + 1)}</span><span class="k">$ </span>${blink(t, 1.6) ? '<span class="rc-cur">█</span>' : ''}`;
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

  // ============================== 9. quote 全屏人像 + 侧边终端金句窗（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'rc-sw', 'position:absolute;inset:0;pointer-events:none;font-family:var(--rc-font);');
    const right = data.pos === 'right';
    const side = right ? 'right:70px;' : 'left:70px;';
    const card = win('rc-q', side, 'MSG.TXT', `${blank(data.kicker) ? '' : `<div class="k">${esc(data.kicker)}</div>`}<div class="t"></div>${blank(data.by) ? '' : `<div class="by">${esc(data.by)}</div>`}`);
    const tx = card.querySelector('.t');
    // 预留终稿尺寸：先填满文本测量，再由打字机覆盖
    tx.innerHTML = mark(data.text);
    const st = alert(data.stamp || '', data.stampSmall || '', `${right ? 'right:120px;' : 'left:440px;'}top:${data.stampTop || 680}px;font-size:56px;`, 'inv');
    el.append(card, st);
    winOpen(A, card, 0.45, 0.45);
    let sized = false;
    A.fn(() => { if (!sized && card.offsetWidth > 0) { card.style.width = `${card.offsetWidth}px`; tx.style.minHeight = `${tx.offsetHeight}px`; sized = true; } });
    typer(A, tx, data.text, 0.9, 9, true);
    alertOn(A, st, Math.min(D - 1.0, D * 0.45), right ? 4 : -4);
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 10. outro 命令窗 + CTA 按键逐个按下 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'rc-zone');
    const kick = kicker(data.kicker, 'left:60px;top:106px;');
    const head = h('div', 'rc-head', 'left:56px;top:150px;font-size:88px;');
    const tagCls = ['background:var(--rc-green);color:#031006;', 'background:var(--rc-amber);color:#120C00;', 'background:var(--rc-red);color:#160204;'];
    const acts = (data.actions || []).slice(0, 3).map((a, i) => win('rc-act', `top:${272 + i * 180}px;`, null,
      `${blank(a.tag) ? '' : `<div class="tg" style="${tagCls[i]}">${esc(a.tag)}</div>`}<div class="t rc-g">${esc(a.title)}</div>${blank(a.desc) ? '' : `<div class="d">$ ${esc(a.desc)}</div>`}<div class="no">${pad2(i + 1)}</div>`));
    const c = data.cta || {};
    const noCta = blank(c.kicker) && blank(c.title) && blank(c.repo) && !(c.buttons || []).some((b) => !blank(b)) && blank(c.stamp);
    const cta = win('rc-cta', null, 'CONNECT', `${blank(c.kicker) ? '' : `<div class="k">${esc(c.kicker)}</div>`}<div class="t rc-g">${esc(c.title || '')}</div><div class="repo">${esc(c.repo || '')}</div><div class="btns">${(c.buttons || []).slice(0, 3).map((b) => `<span>[ ${esc(b)} ]</span>`).join('')}</div>`, 'amber');
    hideIf(cta, noCta);
    const go = alert(c.stamp || '', c.stampSmall || '', 'left:1110px;top:700px;font-size:66px;', 'green');
    const dip = hideIf(h('div', 'rc-prop', 'left:942px;top:812px;', PROPS.dip('11010110', 'MODE')), noCta);
    el.append(kick, head, ...acts, cta, dip, go);
    A.add(kick, 0.05, 0.3, { o: 0 }, { o: 1 }, 'linear', 'flick');
    typer(A, head, data.title, 0.2, 16, false);
    const t0 = 0.8, stp = Math.min(0.6, (D * 0.35) / Math.max(1, acts.length));
    acts.forEach((a, i) => winOpen(A, a, t0 + i * stp, 0.38));
    const tC = t0 + acts.length * stp + 0.05;
    winOpen(A, cta, tC, 0.45);
    pop(A, dip, tC + 0.4, 0.3);
    const btns = Array.from(cta.querySelectorAll('.btns span'));
    const tP = tC + 0.8;
    A.fn((t) => btns.forEach((b, i) => {
      const p = (t - (tP + i * 0.4)) / 0.3;
      b.classList.toggle('hit', p >= 0 && (p < 1 || t > tP + btns.length * 0.4 + 0.3));
    }));
    alertOn(A, go, Math.min(D - 0.9, tP + btns.length * 0.4 + 0.2), -4);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1, -2.5, 0), CAM(1.2, 700, 505, 1.0, 0.5, -0.8, 0), CAM(D, 700, 500, 0.98, 0, 0.8, 0)] };
  }

  global.RetroCRT = {
    version: '1.0.0',
    PROPS, Animator, EASE, injectCSS, pbar, blink,
    COMPONENTS: {
      cover: { create: cover }, stat: { create: stat }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, timeline: { create: timeline }, diagram: { create: diagram },
      showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro }
    }
  };
})(window);
