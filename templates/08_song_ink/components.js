/**
 * Mushanhe Video Engine — 风格包 08 · 新中式宣纸水墨 / 宋韵美学（Song Ink）
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print / 06_neobrutalism 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · stat · steps · checklist · compare · timeline · diagram · showcase[code|terminal|doc|image|video|product] · quote · outro
 *
 *   const comp = SongInk.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : { el, layer:'world'|'screen', avatar:'card'|'pip'|'corner'|'full', cams:[{t,x,y,zoom,rx,ry,rz}], update(localT), w? }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：宣纸 #F3EFE6 · 徽墨 #1C1B18 · 朱砂 #B82925 · 石青 #2E5A6B · 淡赭金 #9A7B4F
 *           1px 细墨线双框 + 回纹角花 · 0 圆角 · 朱砂方印（阴文/阳文）· 毛笔飞白下划线与红圈 · 竖排小引题
 * 可选字段（全部向下兼容 02/06 剧本）：data.vtag 覆盖竖排引题（默认按句型给「卷首 · 序」「数 · 述」…）
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
    soft: (x) => 1 - Math.pow(1 - x, 4),
    back: (x) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    /** 落印：快速压下 + 一次极轻回弹 */
    press: (x) => (x < 0.55 ? EASE.in(x / 0.55) : 1 + Math.sin(((x - 0.55) / 0.45) * Math.PI) * 0.025)
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** v3.5：可选字段没填（空串 / 纯空白 / null）→ 整块不渲染 */
  const blank = (s) => !String(s == null ? '' : s).trim();
  /** v3.5：印章文字没填 → 不落印（不再补「印」字占位） */
  const sealOpt = (text, small, style, opts) => { const el = seal(text, small, style, opts); if (blank(sealText(text))) el.style.display = 'none'; return el; };
  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /** 确定性补间：x/y/s/r/o/sx + 可选 blur（墨晕显影） */
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
        ['x', 'y', 's', 'r', 'o', 'sx', 'b'].forEach((k) => {
          const dv = k === 's' || k === 'o' || k === 'sx' ? 1 : 0;
          const f = a.from[k] != null ? a.from[k] : (a.to[k] != null ? a.to[k] : dv);
          const tt = a.to[k] != null ? a.to[k] : f;
          st[k] = f + (tt - f) * p;
        });
        el.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) rotate(${st.r.toFixed(2)}deg) scale(${(st.s * st.sx).toFixed(4)}, ${st.s.toFixed(4)})`;
        el.style.opacity = clamp01(st.o).toFixed(3);
        el.style.filter = st.b > 0.05 ? `blur(${st.b.toFixed(1)}px)` : '';
      });
      this.fns.forEach((f) => f(t));
    }
  }
  /** 墨晕显影：模糊 + 透明 → 清晰（宋韵入场统一语汇） */
  const inkIn = (A, el, at, d = 0.6, extra = {}) => A.add(el, at, d, Object.assign({ o: 0, b: 10, s: 1.02 }, extra.from || {}), Object.assign({ o: 1, b: 0, s: 1 }, extra.to || {}), 'soft');
  /** 自左向右的笔触揭示（clip-path，确定性） */
  const reveal = (el, t, at, d) => { const p = EASE.inOut(clamp01((t - at) / d)); el.style.clipPath = `inset(-20% ${(100 - p * 100).toFixed(2)}% -20% -2%)`; };

  const VTAG = { cover: '卷首·序', stat: '卷·述数', steps: '卷·次第', checklist: '卷·条目', compare: '卷·辨正', timeline: '卷·流变', diagram: '卷·枢机', showcase: '卷·实证', quote: '卷·要义', outro: '卷·跋行' };
  const CN_NUM = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌'];
  const ORD = ['其一', '其二', '其三', '其四', '其五'];
  const TINTS = ['var(--si-ink)', 'var(--si-azurite)', 'var(--si-ochre)', 'var(--si-cinnabar)'];

  // ============================== 纯 SVG 道具 ==============================
  /** 毛笔飞白横笔：锥形笔身 + 若干飞白丝缝（确定性） */
  function brushPath(w, hgt, seed) {
    const r = rng(seed), m = hgt / 2, top = [], bot = [];
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = u * w;
      const thick = hgt * (0.34 + 0.16 * Math.sin(u * Math.PI * 0.9 + 0.3)) * (u < 0.06 ? 0.55 + u * 7 : 1) * (u > 0.82 ? 1 - (u - 0.82) * 3.2 : 1);
      const wob = (r() - 0.5) * hgt * 0.06 + Math.sin(u * 5 + seed) * hgt * 0.04;
      top.push(`${x.toFixed(1)},${(m - thick + wob).toFixed(1)}`);
      bot.unshift(`${x.toFixed(1)},${(m + thick * 0.82 + wob).toFixed(1)}`);
    }
    let gaps = '';
    for (let k = 0; k < 5; k++) {
      const y = m + (r() - 0.5) * hgt * 0.5, x0 = w * (0.35 + r() * 0.3), x1 = w * (0.86 + r() * 0.12);
      gaps += `<path d="M${x0.toFixed(1)} ${y.toFixed(1)} Q${((x0 + x1) / 2).toFixed(1)} ${(y + (r() - 0.5) * 4).toFixed(1)} ${x1.toFixed(1)} ${(y + (r() - 0.5) * 3).toFixed(1)}" stroke="#000" stroke-width="${(0.8 + r() * 1.6).toFixed(1)}" fill="none"/>`;
    }
    return { poly: `M${top.join(' L')} L${bot.join(' L')} Z`, gaps };
  }
  let SVG_SEQ = 0;
  const PROPS = {
    brush(w = 300, hgt = 22, color = 'var(--si-cinnabar)', seed = 7) {
      const id = `sib${++SVG_SEQ}`, b = brushPath(w, hgt, seed);
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" style="overflow:visible;display:block"><defs><mask id="${id}"><rect x="-10" y="-10" width="${w + 20}" height="${hgt + 20}" fill="#fff"/>${b.gaps}</mask></defs><path d="${b.poly}" fill="${color}" mask="url(#${id})"/></svg>`;
    },
    /** 手绘红圈（不闭合、带过冲） */
    circle(w = 300, hgt = 160, color = 'var(--si-cinnabar)', sw = 5) {
      const cx = w / 2, cy = hgt / 2, rx = w / 2 - 8, ry = hgt / 2 - 8;
      let d = '';
      for (let i = 0; i <= 44; i++) {
        const a = -2.4 + (i / 44) * (Math.PI * 2 + 0.55), k = 1 + 0.05 * Math.sin(i * 0.7) - (i / 44) * 0.06;
        d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)} `;
      }
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" style="overflow:visible;display:block"><path class="si-draw" d="${d}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;
    },
    /** 毛笔勾 */
    tick(size = 54, color = 'var(--si-cinnabar)') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" style="overflow:visible;display:block"><path class="si-draw" d="M6 32 Q14 36 23 48 Q34 24 56 6" stroke="${color}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;
    },
    /** 回纹角花（左上方向，其余角用 CSS 旋转） */
    fret(size = 30, color = 'var(--si-ochre)') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 30 30" style="display:block"><path d="M1 29 V1 H29 M7 29 V7 H23 V17 H13 V12 H18" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="square"/></svg>`;
    },
    /** 一段回纹横带 */
    fretBand(w = 240, color = 'var(--si-ochre)') {
      let d = ''; const u = 16;
      for (let x = 0; x + u <= w; x += u) d += `M${x} 14 V2 H${x + 12} V10 H${x + 6} V6 `;
      return `<svg width="${w}" height="16" viewBox="0 0 ${w} 16" style="display:block"><path d="${d}" stroke="${color}" stroke-width="1.6" fill="none" stroke-linecap="square"/></svg>`;
    },
    /** 远山淡墨（装饰） */
    mountains(w = 600, hgt = 200, seed = 3, alpha = 0.16) {
      const r = rng(seed); const id = `sim${++SVG_SEQ}`;
      let paths = '';
      [[0.55, 0.32, alpha * 0.55], [0.7, 0.26, alpha * 0.8], [0.84, 0.18, alpha]].forEach(([base, amp, a], li) => {
        const ph = r() * 6, f = 0.008 + r() * 0.006; let d = `M0 ${hgt}`;
        for (let x = 0; x <= w; x += 10) d += ` L${x} ${(hgt * base - hgt * amp * (0.6 * Math.sin(x * f + ph) + 0.4 * Math.sin(x * f * 2.7 + ph * 1.7)) * Math.sin(Math.PI * x / w)).toFixed(1)}`;
        d += ` L${w} ${hgt} Z`;
        paths += `<path d="${d}" fill="url(#${id}g${li})"/><linearGradient id="${id}g${li}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C1B18" stop-opacity="${a.toFixed(3)}"/><stop offset="1" stop-color="#1C1B18" stop-opacity="0"/></linearGradient>`;
      });
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" style="display:block;overflow:visible"><defs><filter id="${id}f" x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation="2.4"/></filter></defs><g filter="url(#${id}f)">${paths}</g></svg>`;
    },
    /** 毛笔箭头（向右） */
    arrow(w = 60, color = 'var(--si-ink)') {
      return `<svg width="${w}" height="24" viewBox="0 0 ${w} 24" style="overflow:visible;display:block"><path d="M2 13 Q${w * 0.5} 9 ${w - 6} 12" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${w - 18} 4 L${w - 4} 12 L${w - 19} 20" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
  };

  // ============================== 朱砂印章 ==============================
  /** 印文排布：≤4 字按传统右起竖读排成 1 列 / 2×2；更长转横排长印。阴文=红底白字，阳文=白底红字红框 */
  function sealText(s) { return String(s || '').replace(/[\s!！?？✕✓×·,，。:：\-—"“”]/g, ''); }
  function seal(text, small, style, opts = {}) {
    const raw = sealText(text) || '印';
    const yang = !!opts.yang, size = opts.size || 140;
    const chars = Array.from(raw);
    let inner, w, hgt;
    if (chars.length <= 4) {
      let cols;
      if (chars.length <= 3) cols = [chars];
      else cols = [chars.slice(0, 2), chars.slice(2, 4)];
      const rows = Math.max(...cols.map((c) => c.length));
      const cell = size / Math.max(rows, cols.length === 2 ? 2 : 1.25);
      const fs = cell * 0.82;
      w = cols.length === 1 ? Math.max(size * 0.62, fs * 1.32) : size; hgt = cols.length === 1 ? Math.max(size, rows * fs * 1.08 + 22) : size;
      inner = `<div class="g" style="font-size:${fs.toFixed(0)}px;">${cols.map((c) => `<div class="c">${c.map((ch) => `<span>${esc(ch)}</span>`).join('')}</div>`).join('')}</div>`;
    } else {
      const fs = size * 0.3; w = Math.min(560, chars.length * fs * 1.05 + 40); hgt = fs * 1.7;
      inner = `<div class="g line" style="font-size:${fs.toFixed(0)}px;">${esc(raw)}</div>`;
    }
    const el = h('div', `si-seal${yang ? ' yang' : ''}`, `width:${w.toFixed(0)}px;height:${hgt.toFixed(0)}px;${style || ''}`, `<div class="body">${inner}</div>${small ? `<div class="sm">${esc(small)}</div>` : ''}`);
    return el;
  }
  /** 落印：放大透明 → 压下 + 印泥微晕 */
  const stampIn = (A, el, at, r = -4) => A.add(el, at, 0.32, { s: 1.6, o: 0, r: r - 5 }, { s: 1, o: 1, r }, 'press');

  function vtag(text, style) { return h('div', 'si-vtag', style, `<i></i>${esc(text)}`); }
  function kicker(text, style) { const el = h('div', 'si-kicker', style, `${PROPS.fretBand(64)}<span>${esc(text)}</span>`); if (blank(text)) el.style.display = 'none'; return el; }   // v3.5：没填 kicker 不出孤零零的回纹
  /** "这句**关键词**话" → 朱砂字 + 飞白下划线 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }
  function corners(el, color) {
    ['tl', 'tr', 'br', 'bl'].forEach((c) => el.appendChild(h('div', `si-cn ${c}`, null, PROPS.fret(26, color))));
    return el;
  }
  /** 卡片：宣纸浅底 + 1px 墨线 + 内衬细线 + 回纹角 */
  function card(cls, style, html, color) { return corners(h('div', `si-card ${cls || ''}`, style, html), color); }

  // ============================== 样式注入 ==============================
  const BRUSH_UL = (c) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='20' viewBox='0 0 300 20' preserveAspectRatio='none'><path d='M2 12 C40 6 120 5 200 8 C240 9 270 11 298 9 L296 14 C250 16 160 15 90 16 C50 16 20 17 4 16 Z' fill='${c}' opacity='.9'/><path d='M120 11 L290 10' stroke='%23F3EFE6' stroke-width='1.2' opacity='.8'/><path d='M150 13 L280 13' stroke='%23F3EFE6' stroke-width='.8' opacity='.7'/></svg>`).replace(/%2523/g, '%23')}")`;
  const SEAL_MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='8'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.4 2.05'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>`).replace(/%2523/g, '%23')}")`;
  const CSS = `
  .si-zone{position:absolute;width:1400px;height:1100px;font-family:var(--si-font-serif);color:var(--si-ink)}
  .si-abs{position:absolute}
  .si-card{position:absolute;box-sizing:border-box;background:rgba(250,247,240,.9);border:1.5px solid rgba(28,27,24,.62);outline:1px solid rgba(28,27,24,.22);outline-offset:-8px;box-shadow:0 18px 40px -22px rgba(60,44,20,.35)}
  .si-cn{position:absolute;width:26px;height:26px;z-index:3;pointer-events:none}
  .si-cn.tl{left:3px;top:3px}.si-cn.tr{right:3px;top:3px;transform:scaleX(-1)}.si-cn.br{right:3px;bottom:3px;transform:scale(-1,-1)}.si-cn.bl{left:3px;bottom:3px;transform:scaleY(-1)}
  .si-vtag{position:absolute;writing-mode:vertical-rl;text-orientation:upright;font-size:21px;letter-spacing:.18em;color:var(--si-ochre);font-weight:600;padding:12px 0 6px;border-top:2px solid var(--si-cinnabar);white-space:nowrap}
  .si-vtag i{display:block;width:10px;height:10px;background:var(--si-cinnabar);margin:0 auto 10px}
  .si-kicker{position:absolute;display:flex;align-items:center;gap:14px;font-family:var(--si-font-serif);font-size:22px;font-weight:600;letter-spacing:.2em;color:var(--si-ochre);white-space:nowrap}
  .si-head{position:absolute;font-weight:700;letter-spacing:.06em;line-height:1.18;color:var(--si-ink);white-space:nowrap}
  .si-zone em,.si-q em{font-style:normal;color:var(--si-cinnabar);background:${BRUSH_UL('%23B82925')} no-repeat left 0 bottom -.04em/100% .3em;padding:0 .04em .06em}
  .si-prop{position:absolute;z-index:5;pointer-events:none}
  .si-seal{position:absolute;z-index:8;transform-origin:50% 60%}
  .si-seal .body{position:absolute;inset:0;background:var(--si-cinnabar);color:#FBF6EC;border-radius:3px;display:flex;align-items:center;justify-content:center;
    -webkit-mask-image:${SEAL_MASK};mask-image:${SEAL_MASK};-webkit-mask-size:220px 220px;mask-size:220px 220px;box-shadow:inset 0 0 0 4px rgba(251,246,236,.0)}
  .si-seal .body::after{content:'';position:absolute;inset:7px;border:2px solid rgba(251,246,236,.85);border-radius:2px}
  .si-seal.yang .body{background:rgba(250,247,240,.6);color:var(--si-cinnabar);border:6px solid var(--si-cinnabar)}
  .si-seal.yang .body::after{border-color:transparent}
  .si-seal .g{display:flex;flex-direction:row-reverse;gap:.08em;font-family:var(--si-font-seal);font-weight:900;line-height:1}
  .si-seal .g .c{display:flex;flex-direction:column;align-items:center;gap:.06em}
  .si-seal .g.line{letter-spacing:.06em;white-space:nowrap}
  .si-seal .sm{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:10px;font-family:var(--si-font-serif);font-size:15px;letter-spacing:.26em;color:var(--si-cinnabar);white-space:nowrap;font-weight:700}
  .si-line{position:absolute;height:1.5px;background:var(--si-ink);opacity:.55}
  /* cover */
  .si-cover-title{position:absolute;left:150px;top:176px;font-size:150px;font-weight:800;line-height:1.16;letter-spacing:.08em;white-space:nowrap;color:var(--si-ink)}
  .si-cover-title span{display:inline-block}
  .si-cover-ch{position:absolute;left:150px;top:600px;width:270px;height:270px;border-radius:50%;border:1.5px solid rgba(28,27,24,.7);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(250,247,240,.75)}
  .si-cover-ch::before{content:'';position:absolute;inset:9px;border-radius:50%;border:1px solid rgba(28,27,24,.3)}
  .si-cover-ch .l{font-size:18px;letter-spacing:.42em;color:var(--si-ochre);font-weight:700;margin-left:.42em}
  .si-cover-ch .n{font-family:var(--si-font-num);font-size:118px;font-weight:600;line-height:1;margin:6px 0 2px;color:var(--si-ink)}
  .si-cover-ch .z{font-size:24px;letter-spacing:.5em;margin-left:.5em;color:var(--si-ink)}
  .si-cover-sub{left:480px;top:614px;padding:34px 46px 38px;font-size:44px;font-weight:600;line-height:1.5;white-space:nowrap}
  .si-cover-dim{position:absolute;left:480px;top:880px;display:flex;align-items:center;gap:16px;font-size:26px;letter-spacing:.18em;color:var(--si-azurite);font-weight:600;white-space:nowrap}
  .si-cover-dim::before{content:'';width:60px;height:1.5px;background:var(--si-azurite)}
  .si-sun{position:absolute;border-radius:50%;background:radial-gradient(circle at 45% 42%,rgba(184,41,37,.85),rgba(184,41,37,.62) 62%,rgba(184,41,37,0) 72%)}
  /* stat */
  .si-stat{position:absolute;top:310px;height:430px;padding:40px 44px 0}
  .si-stat .lb{display:flex;align-items:center;gap:12px;font-size:24px;letter-spacing:.18em;color:var(--si-ochre);font-weight:700;white-space:nowrap}
  .si-stat .lb::before{content:'';width:10px;height:10px;background:var(--si-ochre);transform:rotate(45deg)}
  .si-stat.hot .lb{color:var(--si-cinnabar)}.si-stat.hot .lb::before{background:var(--si-cinnabar)}
  .si-stat .num{position:relative;display:inline-block;margin-top:34px;font-family:var(--si-font-num);font-weight:600;letter-spacing:-.01em;line-height:1;white-space:nowrap;color:var(--si-ink)}
  .si-stat.hot .num{color:var(--si-cinnabar)}
  .si-stat .num .u,.si-stat .num .pf{font-family:var(--si-font-serif);font-size:.24em;letter-spacing:.1em;margin-left:.2em;font-weight:700;color:var(--si-ink)}
  .si-stat .num .pf{margin:0 .1em 0 0}
  .si-stat .ring{position:absolute;left:-36px;top:-30px;pointer-events:none}
  .si-stat .bar{position:absolute;left:44px;right:44px;bottom:66px;height:22px}
  .si-stat .bar .tr{position:absolute;left:0;right:0;top:10px;height:1px;background:rgba(28,27,24,.3)}
  .si-stat .bar .fill{position:absolute;left:0;top:0;height:22px}
  .si-stat .sc{position:absolute;right:44px;bottom:26px;font-family:var(--si-font-num);font-size:22px;color:var(--si-ochre);letter-spacing:.1em}
  .si-note{position:absolute;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:600;color:var(--si-azurite);white-space:nowrap;letter-spacing:.06em}
  .si-note::before{content:'注';display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:1.5px solid var(--si-azurite);font-size:22px}
  /* steps */
  .si-step{position:absolute;top:320px;height:420px;padding:0 24px}
  .si-step .big{position:absolute;right:16px;top:8px;font-size:150px;font-weight:800;line-height:1;color:rgba(154,123,79,.16)}
  .si-step .no{position:absolute;left:26px;top:30px;writing-mode:vertical-rl;font-size:22px;letter-spacing:.3em;color:var(--si-cinnabar);font-weight:700;border-right:2px solid var(--si-cinnabar);padding-right:6px}
  .si-step .nm{position:absolute;left:26px;right:20px;top:190px;font-size:64px;font-weight:800;letter-spacing:.1em;white-space:nowrap}
  .si-step .ul{position:absolute;left:26px;top:280px}
  .si-step .fn{position:absolute;left:24px;right:24px;bottom:28px;padding:10px 14px;border-top:1px solid rgba(28,27,24,.35);font-family:var(--si-font-mono);font-size:21px;color:var(--si-azurite);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
  .si-steps-bar{position:absolute;left:60px;top:806px;width:1280px;height:96px;background:var(--si-azurite);color:#F3EFE6;display:flex;align-items:center;gap:26px;padding:0 34px;box-sizing:border-box;outline:1px solid rgba(243,239,230,.45);outline-offset:-7px}
  .si-steps-bar .f{font-family:var(--si-font-mono);font-size:26px;letter-spacing:.06em;white-space:nowrap}
  .si-steps-bar .b{font-family:var(--si-font-num);font-size:44px;font-weight:700;letter-spacing:.06em;white-space:nowrap;color:#F5D08A}
  .si-steps-bar .m{margin-left:auto;margin-right:200px;font-family:var(--si-font-mono);font-size:16px;color:rgba(243,239,230,.8);line-height:1.45;text-align:right;white-space:nowrap}
  /* checklist */
  .si-list{left:250px;top:100px;width:900px}
  .si-list .hd{position:absolute;left:44px;top:34px;display:flex;align-items:center;gap:14px;font-size:20px;letter-spacing:.24em;color:var(--si-ochre);font-weight:700;white-space:nowrap}
  .si-list .ttl{position:absolute;left:44px;top:78px;font-family:var(--si-font-num);font-size:92px;font-weight:600;line-height:1;letter-spacing:.01em;white-space:nowrap}
  .si-list .sub{position:absolute;left:48px;top:190px;font-size:32px;font-weight:600;color:#4A463E;white-space:nowrap;letter-spacing:.08em}
  .si-list .hr{position:absolute;left:44px;right:44px;top:250px;height:6px;border-top:1.5px solid var(--si-ink);border-bottom:1px solid var(--si-ink)}
  .si-row{position:absolute;left:44px;right:44px;height:100px}
  .si-row .wash{position:absolute;left:76px;top:12px;height:54px;width:520px;background:linear-gradient(90deg,rgba(46,90,107,.16),rgba(46,90,107,.07) 80%,rgba(46,90,107,0));border-radius:2px 30px 30px 2px / 2px 50% 50% 2px}
  .si-row .box{position:absolute;left:0;top:14px;width:50px;height:50px;border:1.5px solid var(--si-ink);box-sizing:border-box}
  .si-row .box svg{position:absolute;left:2px;top:-12px}
  .si-row .k{position:absolute;left:92px;top:12px;font-size:40px;font-weight:700;white-space:nowrap;letter-spacing:.06em}
  .si-row .d{position:absolute;left:94px;top:66px;font-size:23px;font-weight:500;color:#6A645A;white-space:nowrap}
  .si-row .n{position:absolute;right:0;top:20px;font-size:20px;letter-spacing:.2em;color:var(--si-ochre);font-weight:700}
  .si-memo{position:absolute;right:46px;z-index:6;padding:14px 26px 16px 28px;border-left:5px solid var(--si-cinnabar);background:rgba(184,41,37,.06);font-size:40px;font-weight:700;white-space:nowrap}
  .si-memo small{display:block;font-size:18px;letter-spacing:.2em;margin-bottom:6px;color:var(--si-ochre);font-weight:700}
  /* compare */
  .si-cmp{top:300px;width:540px;height:430px}
  .si-cmp .band{position:absolute;left:30px;top:30px;font-size:22px;letter-spacing:.2em;font-weight:700;white-space:nowrap;padding:6px 14px}
  .si-cmp.wrong{background:rgba(226,220,206,.9)}
  .si-cmp.wrong .band{color:#7C766B;border:1.5px solid #9A9488}
  .si-cmp.right .band{color:#F3EFE6;background:var(--si-azurite)}
  .si-cmp .t{position:absolute;left:34px;top:100px;font-size:58px;font-weight:800;line-height:1.24;white-space:nowrap;letter-spacing:.06em}
  .si-cmp.wrong .t{color:#8A8478}
  .si-cmp .d{position:absolute;left:34px;right:34px;top:276px;font-size:26px;font-weight:500;line-height:1.6;color:#4A463E}
  .si-cmp.wrong .d{color:#8A8478}
  .si-cmp .strike{position:absolute;z-index:4}
  .si-cmp .badge{position:absolute;right:30px;top:24px}
  .si-vs{position:absolute;left:640px;top:450px;width:120px;height:120px;z-index:6;border-radius:50%;border:1.5px solid var(--si-ink);background:var(--si-paper);display:flex;align-items:center;justify-content:center;font-family:var(--si-font-num);font-style:italic;font-size:44px;font-weight:600;color:var(--si-ink)}
  .si-vs::before{content:'';position:absolute;inset:6px;border-radius:50%;border:1px solid rgba(28,27,24,.35)}
  .si-verdict{left:60px;top:806px;width:1280px;height:110px;display:flex;align-items:center;gap:28px;padding:0 36px;z-index:7}
  .si-verdict b{padding:8px 14px;background:var(--si-cinnabar);color:#FBF6EC;font-size:20px;letter-spacing:.24em;white-space:nowrap;font-weight:700}
  .si-verdict span{font-size:46px;font-weight:700;white-space:nowrap;letter-spacing:.06em}
  /* showcase */
  .si-panel{position:absolute;left:60px;top:262px;width:1240px;height:640px;overflow:hidden;box-sizing:border-box}
  .si-panel.dark{background:#1F1D19;color:#EDE7DA;border:1.5px solid var(--si-ink);box-shadow:0 24px 50px -24px rgba(28,27,24,.6);outline:1px solid rgba(243,239,230,.18);outline-offset:-8px}
  .si-panel .bar{height:58px;display:flex;align-items:center;gap:12px;padding:0 24px;border-bottom:1px solid rgba(243,239,230,.18);font-size:20px;letter-spacing:.14em;color:#CDBF9F}
  .si-panel.light .bar{border-bottom:1.5px solid rgba(28,27,24,.5);color:var(--si-ochre)}
  .si-panel .bar i{width:14px;height:14px;display:inline-block;border-radius:50%;background:var(--si-cinnabar)}
  .si-panel .bar i:nth-child(2){background:var(--si-ochre)}.si-panel .bar i:nth-child(3){background:#5C8C9C}
  .si-panel .bar span{margin-left:14px;font-family:var(--si-font-mono);letter-spacing:.06em}
  .si-code{padding:26px 34px;font-family:var(--si-font-mono);font-size:30px;line-height:1.66;white-space:pre}
  .si-code .ln{display:inline-block;width:56px;color:#6E675A}
  .si-code .c{color:#9C9483}.si-code .k{color:#F5D08A}.si-code .ok{color:#8FC1B5}
  .si-code .cur{display:inline-block;width:.55em;background:#F5D08A;color:#F5D08A}
  .si-panel.light .si-code{font-family:var(--si-font-serif);font-size:34px;color:var(--si-ink)}
  .si-panel.light .si-code .ln{color:#B5AB98}.si-panel.light .si-code .k{color:var(--si-azurite)}.si-panel.light .si-code .ok{color:var(--si-cinnabar)}.si-panel.light .si-code .c{color:#8A8478}
  .si-panel.light .si-code .cur{background:var(--si-cinnabar);color:var(--si-cinnabar)}
  .si-media{position:absolute;left:0;right:0;top:58px;width:100%;height:calc(100% - 58px);object-fit:cover;background:#1F1D19}
  .si-callout{position:absolute;display:flex;align-items:center;z-index:6}
  .si-callout .ld{width:64px;height:1.5px;background:var(--si-cinnabar);position:relative}
  .si-callout .ld::before{content:'';position:absolute;left:-5px;top:-4.5px;width:10px;height:10px;border-radius:50%;background:var(--si-cinnabar)}
  .si-callout span{padding:9px 18px 9px 16px;background:var(--si-paper);border:1.5px solid var(--si-ink);border-left:5px solid var(--si-cinnabar);font-size:26px;font-weight:700;color:var(--si-ink);white-space:nowrap;letter-spacing:.06em;box-shadow:0 10px 20px -12px rgba(0,0,0,.45)}
  .si-kind{position:absolute;padding:6px 14px;border:1.5px solid var(--si-cinnabar);color:var(--si-cinnabar);font-family:var(--si-font-mono);font-size:18px;letter-spacing:.2em;font-weight:700;background:var(--si-paper)}
  /* quote（屏幕层，竖排） */
  .si-q{position:absolute;top:150px;padding:50px 56px 46px;box-sizing:border-box;background:rgba(246,242,233,.95);border:1.5px solid var(--si-ink);outline:1px solid rgba(28,27,24,.3);outline-offset:-9px;box-shadow:0 30px 60px -30px rgba(28,27,24,.6);display:flex;flex-direction:row-reverse;gap:30px;align-items:flex-start}
  .si-q .k{writing-mode:vertical-rl;font-size:20px;letter-spacing:.4em;color:var(--si-ochre);font-weight:700;padding-top:6px;border-top:2px solid var(--si-cinnabar)}
  .si-q .t{writing-mode:vertical-rl;text-orientation:mixed;font-size:76px;font-weight:800;line-height:1.55;letter-spacing:.14em;color:var(--si-ink);height:470px}
  .si-q .t em{background:none;padding:0;border-right:4px solid var(--si-cinnabar);padding-right:4px}
  .si-q .by{writing-mode:vertical-rl;align-self:flex-end;font-size:24px;letter-spacing:.3em;color:#5E584D;font-weight:600}
  /* outro */
  .si-act{left:60px;width:560px;height:158px;padding:24px 30px 0 92px}
  .si-act .no{position:absolute;left:24px;top:24px;bottom:24px;width:44px;writing-mode:vertical-rl;display:flex;align-items:center;justify-content:center;background:var(--si-ink);color:var(--si-paper);font-size:22px;letter-spacing:.2em;font-weight:700}
  .si-act .tg{font-family:var(--si-font-mono);font-size:16px;letter-spacing:.26em;font-weight:700}
  .si-act .t{font-size:42px;font-weight:800;line-height:1.2;margin-top:6px;white-space:nowrap;letter-spacing:.08em}
  .si-act .d{font-family:var(--si-font-mono);font-size:19px;color:#6A645A;margin-top:4px;white-space:nowrap}
  .si-cta{left:700px;top:282px;width:640px;height:500px;padding:46px 48px;background:rgba(250,247,240,.94)}
  .si-cta .k{font-size:20px;letter-spacing:.3em;color:var(--si-ochre);font-weight:700}
  .si-cta .t{font-size:70px;font-weight:800;margin-top:20px;line-height:1.12;white-space:nowrap;letter-spacing:.08em}
  .si-cta .ul{margin-top:8px}
  .si-cta .repo{margin-top:26px;padding:14px 18px;border:1.5px solid rgba(28,27,24,.55);border-left:5px solid var(--si-azurite);font-family:var(--si-font-mono);font-size:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--si-azurite)}
  .si-cta .btns{display:flex;gap:18px;margin-top:36px}
  .si-cta .btns span{flex:1;text-align:center;padding:14px 0;border:2px solid var(--si-cinnabar);color:var(--si-cinnabar);font-size:32px;font-weight:800;letter-spacing:.3em;text-indent:.3em}
  /* timeline */
  .si-tl-line{position:absolute;left:60px;top:540px;height:26px;transform-origin:left center}
  .si-tl-node{position:absolute;width:244px;height:210px;padding:22px 22px}
  .si-tl-node .tm{font-family:var(--si-font-num);font-size:48px;font-weight:600;line-height:1.05;white-space:nowrap;color:var(--si-ochre)}
  .si-tl-node.now .tm{color:var(--si-cinnabar)}
  .si-tl-node .t{font-size:34px;font-weight:800;margin-top:12px;white-space:nowrap;letter-spacing:.06em}
  .si-tl-node .d{font-size:20px;font-weight:500;margin-top:8px;line-height:1.4;color:#6A645A}
  .si-tl-stem{position:absolute;width:1.5px;background:var(--si-ink);opacity:.6}
  .si-tl-dot{position:absolute;width:26px;height:26px;border-radius:50%;background:var(--si-paper);border:2px solid var(--si-ink);box-sizing:border-box;z-index:6}
  .si-tl-dot.now{background:var(--si-cinnabar);border-color:var(--si-cinnabar);box-shadow:0 0 0 6px var(--si-paper),0 0 0 7.5px var(--si-cinnabar)}
  /* diagram */
  .si-dg-node{position:absolute;width:260px;height:124px;z-index:3;background:rgba(250,247,240,.95)}
  .si-dg-node .bd{position:absolute;left:0;top:0;bottom:0;width:6px}
  .si-dg-node .l{position:absolute;left:28px;top:20px;font-size:38px;font-weight:800;white-space:nowrap;letter-spacing:.08em}
  .si-dg-node .s{position:absolute;left:28px;right:16px;top:76px;font-family:var(--si-font-mono);font-size:18px;color:#6A645A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .si-dg-node.hot{border-color:var(--si-cinnabar);background:rgba(184,41,37,.07)}
  .si-dg-node.hot .l{color:var(--si-cinnabar)}
  .si-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .si-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .si-dg-tag{padding:4px 14px;background:var(--si-paper);border:1px solid rgba(28,27,24,.55);color:var(--si-azurite);font-family:var(--si-font-mono);font-size:18px;font-weight:700;white-space:nowrap;letter-spacing:.06em}
  .si-dg-ring{position:absolute;z-index:5;pointer-events:none}
  /* showcase · product */
  .si-prod{position:absolute;left:0;right:0;top:58px;bottom:0}
  .si-prod .pic{position:absolute;left:34px;top:34px;bottom:38px;width:480px;border:1.5px solid rgba(28,27,24,.55);outline:1px solid rgba(28,27,24,.2);outline-offset:-8px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 60%,rgba(46,90,107,.12),rgba(46,90,107,0) 70%)}
  .si-prod .pic img{width:100%;height:100%;object-fit:contain}
  .si-prod .pic svg{width:78%;height:auto;color:var(--si-ink)}
  .si-prod .info{position:absolute;left:566px;right:44px;top:34px}
  .si-prod .nm{font-size:56px;font-weight:800;line-height:1.1;white-space:nowrap;letter-spacing:.06em}
  .si-prod .tg{display:inline-block;margin-top:14px;padding:4px 14px;border:1.5px solid var(--si-azurite);color:var(--si-azurite);font-size:22px;font-weight:700;white-space:nowrap;letter-spacing:.1em}
  .si-prod .specs{margin-top:22px;border-top:1.5px solid var(--si-ink);border-bottom:1.5px solid var(--si-ink)}
  .si-prod .row{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid rgba(28,27,24,.2);white-space:nowrap}
  .si-prod .row:last-child{border-bottom:0}
  .si-prod .row .k{font-size:20px;letter-spacing:.14em;color:var(--si-ochre);font-weight:700}
  .si-prod .row .v{font-size:26px;font-weight:700}
  `;
  function injectCSS() {
    if (document.getElementById('si-components-css')) return;
    const st = document.createElement('style'); st.id = 'si-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  const drawPaths = (root) => Array.from(root.querySelectorAll('.si-draw'));
  const setDraw = (paths, p) => paths.forEach((pa) => pa.setAttribute('stroke-dashoffset', (100 * (1 - p)).toFixed(2)));
  /** 每段公共页眉：竖排引题 + 横向小引题 + 标题（标题自左向右墨晕显影） */
  function header(el, A, type, data, opts = {}) {
    const vt = vtag(data.vtag || VTAG[type] || '', `left:64px;top:${opts.vtTop || 104}px;`);
    const kick = kicker(data.kicker || '', 'left:130px;top:112px;');
    const head = h('div', 'si-head', `left:128px;top:${opts.headTop || 154}px;font-size:${opts.size || 84}px;`, mark(data.title));
    el.append(vt, kick, head);
    A.add(vt, 0.05, 0.5, { o: 0, y: -20 }, { o: 1, y: 0 }, 'soft');
    A.add(kick, 0.12, 0.45, { o: 0, x: -24 }, { o: 1, x: 0 }, 'soft');
    inkIn(A, head, 0.25, 0.7, { from: { x: -18 }, to: { x: 0 } });
    return { vt, kick, head };
  }

  // ============================== 1. cover 卷首 · 宣纸大字 + 月洞章号 + 落印 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'si-zone');
    const vt = vtag(data.vtag || VTAG.cover, 'left:64px;top:104px;');
    const kick = kicker(data.kicker || '', 'left:150px;top:112px;');
    const mtn = h('div', 'si-prop', 'left:560px;top:250px;', PROPS.mountains(820, 300, 11, 0.22));
    const sun = h('div', 'si-sun', 'left:1150px;top:236px;width:96px;height:96px;');
    const title = h('div', 'si-cover-title');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const ul = h('div', 'si-prop', 'left:150px;top:540px;', PROPS.brush(560, 26, 'var(--si-ink)', 21));
    // v3.5：月洞章号 / 副标题卷 / 维度线 / 印章没填就整块不出（不再补 CHAPTER / 01 / 「印」占位）
    const ch = h('div', 'si-cover-ch', null, `${blank(data.chapterLabel) ? '' : `<div class="l">${esc(data.chapterLabel)}</div>`}<div class="n">${esc(data.chapter || '')}</div><div class="z">第 · 章</div>`);
    if (blank(data.chapter) && blank(data.chapterLabel)) ch.style.display = 'none';
    const sub = card('si-cover-sub', null, mark(data.subtitle));
    if (blank(data.subtitle)) sub.style.display = 'none';
    const dm = h('div', 'si-cover-dim', null, esc(data.dim || ''));
    if (blank(data.dim)) dm.style.display = 'none';
    const st = sealOpt(data.stamp || '', data.stampSmall || '', 'left:1150px;top:560px;', { size: 168 });
    el.append(mtn, sun, vt, kick, title, ul, ch, sub, dm, st);
    A.add(vt, 0.05, 0.5, { o: 0, y: -20 }, { o: 1, y: 0 }, 'soft');
    A.add(kick, 0.15, 0.45, { o: 0, x: -24 }, { o: 1, x: 0 }, 'soft');
    A.add(mtn, 0, 1.6, { o: 0, x: 40 }, { o: 1, x: 0 }, 'soft');
    A.add(sun, 0.4, 1.0, { o: 0, s: 0.6 }, { o: 1, s: 1 }, 'soft');
    chars.forEach((c, i) => A.add(c, 0.35 + i * 0.09, 0.7, { o: 0, b: 14, s: 1.08, y: 6 }, { o: 1, b: 0, s: 1, y: 0 }, 'soft'));
    const tB = 0.5 + chars.length * 0.09;
    A.add(ch, tB, 0.7, { o: 0, s: 0.86, b: 8 }, { o: 1, s: 1, b: 0 }, 'soft');
    inkIn(A, sub, tB + 0.3, 0.7, { from: { x: 30 }, to: { x: 0 } });
    A.add(dm, tB + 0.7, 0.5, { o: 0, x: -20 }, { o: 1, x: 0 }, 'soft');
    stampIn(A, st, Math.min(D - 1.2, tB + 1.3), -5);
    A.fn((t) => {
      reveal(ul.firstChild, t, tB - 0.1, 0.6);
      const em = sub.querySelector('em'); if (em) em.style.backgroundSize = `${(EASE.inOut(clamp01((t - tB - 0.9) / 0.5)) * 100).toFixed(1)}% .3em`;
      mtn.style.transform += ` translateX(${(-(t * 4)).toFixed(1)}px)`;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 600, 420, 1.18, 1, -2, -0.4), CAM(1.8, 700, 505, 1.0, 0.5, -1, 0), CAM(D, 712, 508, 1.03, 0.3, 0.8, 0.2)] };
  }

  // ============================== 共用：数字格式 / 连线几何 ==============================
  function decOf(v) { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; }
  function fmtNum(v, dec) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
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
  function fitNums(nums, finals, avail) {
    nums.forEach((nEl, i) => {
      const b = nEl.querySelector('b'), keep = b.textContent; b.textContent = finals[i];
      const w = nEl.scrollWidth; if (w > avail) nEl.style.fontSize = `${Math.floor(parseFloat(nEl.style.fontSize) * avail / w)}px`;
      b.textContent = keep;
    });
  }

  // ============================== 2. stat 大数字 · 末项朱砂 + 手绘红圈 + 落印 ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'si-zone');
    header(el, A, 'stat', data);
    const gap = 44, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 240 : n === 2 ? 176 : 130;
    const cards = items.map((it, i) => card(`si-stat${i === n - 1 && n > 1 ? ' hot' : ''}`, `left:${60 + i * (w + gap)}px;width:${w}px;`,
      `${blank(it.label) ? '' : `<div class="lb">${esc(it.label)}</div>`}<div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div>` +
      `<div class="bar"><div class="tr"></div><div class="fill" style="min-width:64px;width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%">${PROPS.brush(Math.max(64, (w - 88) * clamp01(it.bar != null ? it.bar : 1)), 22, i === n - 1 && n > 1 ? 'var(--si-cinnabar)' : 'var(--si-ink)', 31 + i)}</div></div>` +
      `<div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div>`));
    const nums = cards.map((c) => c.querySelector('.num'));
    const fills = cards.map((c) => c.querySelector('.fill svg'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    // 末项手绘红圈（按数字尺寸自适应）
    const ring = n > 1 ? h('div', 'ring') : null;
    if (ring) nums[n - 1].appendChild(ring);
    const st = data.delta ? seal(data.delta, data.deltaSmall || '', 'left:1150px;top:740px;', { size: 150 }) : null;
    const note = data.note ? h('div', 'si-note', 'left:64px;top:790px;', esc(data.note)) : null;
    el.append(...cards);
    if (note) el.appendChild(note);
    if (st) el.appendChild(st);
    const tIn = cards.map((_, i) => 0.6 + i * 0.45);
    cards.forEach((c, i) => inkIn(A, c, tIn[i], 0.7, { from: { y: 26 }, to: { y: 0 } }));
    if (note) A.add(note, D - 2.6, 0.5, { o: 0, x: -20 }, { o: 1, x: 0 }, 'soft');
    if (st) stampIn(A, st, Math.min(D - 1.2, tIn[n - 1] + 2.0), -4);
    let fitted = false, ringPaths = [];
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) {
        if (ring) ring.innerHTML = '';
        fitNums(nums, finals, w - 100); fitted = true;
        if (ring) {
          const nb = nums[n - 1], bb = nb.querySelector('b'); const keep = bb.textContent; bb.textContent = finals[n - 1];
          const rw = bb.offsetWidth + 70, rh = bb.offsetHeight + 16; bb.textContent = keep;
          ring.innerHTML = PROPS.circle(rw, rh, 'var(--si-cinnabar)', 4.5); ring.style.left = `${(bb.offsetLeft - 35).toFixed(0)}px`; ring.style.top = `${(bb.offsetTop - 4).toFixed(0)}px`;
          ringPaths = drawPaths(ring);
        }
      }
      items.forEach((it, i) => { nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.3) / 1.3)), decs[i]); });
      fills.forEach((f, i) => reveal(f, t, tIn[i] + 1.0, 0.8));
      setDraw(ringPaths, EASE.inOut(clamp01((t - tIn[n - 1] - 1.6) / 0.6)));
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.1, 1, -2, -0.3), CAM(1.3, 700, 510, 1.0, 0.5, -0.8, 0), CAM(D, 706, 506, 1.03, 0.3, 0.8, 0.15)] };
  }

  // ============================== 3. steps 册页四折 · 大写序数 + 飞白下划 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'si-zone');
    header(el, A, 'steps', data);
    const AW = 54, cw = (1280 - AW * (n - 1)) / n;
    const dim = data.dim ? h('div', 'si-kind', 'left:1160px;top:180px;', esc(data.dim)) : null;
    const cards = items.map((it, i) => card('si-step', `left:${60 + i * (cw + AW)}px;width:${cw}px;`,
      `<div class="big">${CN_NUM[i] || i + 1}</div><div class="no">第${CN_NUM[i] || i + 1}步</div><div class="nm">${esc(it.title)}</div><div class="ul">${PROPS.brush(Math.min(150, cw - 60), 16, TINTS[i % 4], 41 + i)}</div>${blank(it.desc) ? '' : `<div class="fn">${esc(it.desc)}</div>`}`));
    const uls = cards.map((c) => c.querySelector('.ul svg'));
    const arrows = items.slice(1).map((_, i) => h('div', 'si-prop', `left:${60 + (i + 1) * (cw + AW) - AW + 2}px;top:520px;`, PROPS.arrow(48)));
    const bar = h('div', 'si-steps-bar', null, `${blank(data.folder) ? '' : `<div class="f">${esc(data.folder)}</div>`}<div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`);
    if (blank(data.folder) && blank(data.folderBig) && blank(data.folderMeta)) bar.style.display = 'none';   // v3.5：石青文件夹条三项都没填 → 不出空条（不再补 PROJECT /）
    const lab = data.label ? seal(data.label, data.labelSmall || '', 'left:1170px;top:752px;', { size: 136 }) : null;
    el.append(...cards, ...arrows, bar);
    if (dim) el.appendChild(dim);
    if (lab) el.appendChild(lab);
    if (dim) A.add(dim, 0.6, 0.5, { o: 0 }, { o: 1 }, 'soft');
    A.add(bar, 0.5, 0.7, { o: 0, y: 30, b: 6 }, { o: 1, y: 0, b: 0 }, 'soft');
    const t0 = 1.0, t1 = Math.min(Math.max(t0 + 0.5, D - 2.4), t0 + 0.6 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    cards.forEach((c, i) => inkIn(A, c, t0 + i * stp, 0.7, { from: { y: 36 }, to: { y: 0 } }));
    arrows.forEach((a, i) => A.add(a, t0 + (i + 1) * stp + 0.1, 0.5, { o: 0, x: -14 }, { o: 1, x: 0 }, 'soft'));
    if (lab) stampIn(A, lab, D - 1.4, -5);
    A.fn((t) => uls.forEach((u, i) => reveal(u, t, t0 + i * stp + 0.45, 0.5)));
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 580, 1.14, 1, -2, -0.3), CAM(1.3, 700, 512, 1.0, 0.5, -0.8, 0), CAM(D, 705, 508, 1.03, 0.3, 0.8, 0.15)] };
  }

  // ============================== 4. checklist 册页条目 · 朱砂笔勾 + 石青淡染 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const RH = 100, R0 = 284;
    const H = R0 + n * RH + (data.note ? 150 : 30);
    const el = h('div', 'si-zone');
    const vt = vtag(data.vtag || VTAG.checklist, 'left:150px;top:104px;');
    const c = card('si-list', `height:${H}px;`,
      `${blank(data.kicker) ? '' : `<div class="hd">${PROPS.fretBand(48)}${esc(data.kicker)}</div>`}<div class="ttl">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div><div class="hr"></div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'si-row', `top:${R0 + i * RH}px;`,
        `<div class="wash"></div><div class="box">${PROPS.tick(56)}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">${ORD[i] || ''}</div>`);
      c.appendChild(r); return r;
    });
    let memo = null;
    if (data.note) { memo = h('div', 'si-memo', `top:${R0 + n * RH + 16}px;`, `${blank(data.noteLead) ? '' : `<small>${esc(data.noteLead)}</small>`}${mark(data.note)}`); c.appendChild(memo); }
    const st = seal(`${n}/${n}`, '', 'left:1186px;top:150px;', { size: 104, yang: true });
    el.append(vt, c, st);
    A.add(vt, 0.05, 0.5, { o: 0, y: -20 }, { o: 1, y: 0 }, 'soft');
    inkIn(A, c, 0.1, 0.8, { from: { y: 30 }, to: { y: 0 } });
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.6 : 1.4)), t0 + 0.65 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const ticks = rows.map((r) => drawPaths(r));
    rows.forEach((r, i) => A.add(r, t0 + i * stp - 0.3, 0.4, { o: 0.3 }, { o: 1 }, 'soft'));
    let measured = false;
    A.fn((t) => {
      if (!measured) { rows.forEach((r) => { const k = r.querySelector('.k'); const w = k.scrollWidth; if (w > 0) { r.querySelector('.wash').style.width = `${w + 46}px`; measured = true; } }); }
      rows.forEach((r, i) => { setDraw(ticks[i], EASE.out(clamp01((t - (t0 + i * stp)) / 0.35))); reveal(r.querySelector('.wash'), t, t0 + i * stp + 0.15, 0.45); });
    });
    if (memo) inkIn(A, memo, D - 2.1, 0.6, { from: { x: 20 }, to: { x: 0 } });
    stampIn(A, st, Math.max(t1 + 0.4, D - 1.5), 6);
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.05, 1, -1.5, 0), CAM(1.0, 700, 500, 1.01, 0.5, -0.6, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.01, 0.3, -0.3, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.3, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.4, 0)] };
  }

  // ============================== 5. compare 正误两卷 · 朱砂飞白划去 + 落印 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'si-zone');
    header(el, A, 'compare', data);
    const L = card('si-cmp wrong', 'left:60px;', `${blank(w.label) ? '' : `<div class="band">${esc(w.label)}</div>`}<div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div>`, '#9A9488');
    const s1 = h('div', 'strike', 'left:22px;top:126px;', PROPS.brush(400, 20, 'var(--si-cinnabar)', 51));
    const s2 = h('div', 'strike', 'left:22px;top:198px;', PROPS.brush(360, 20, 'var(--si-cinnabar)', 52));
    L.append(s1, s2);
    const R = card('si-cmp right', 'left:800px;', `${blank(r.label) ? '' : `<div class="band">${esc(r.label)}</div>`}<div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div><div class="badge">${PROPS.tick(60)}</div>`);
    const vs = h('div', 'si-vs', null, 'VS');
    const xs = seal(w.stamp || '否', '', 'left:420px;top:410px;', { size: 116 });
    const verdict = card('si-verdict', null, `${blank(data.verdictLabel) ? '' : `<b>${esc(data.verdictLabel)}</b>`}<span>${mark(data.verdict || '')}</span>`);
    if (blank(data.verdict) && blank(data.verdictLabel)) verdict.style.display = 'none';   // v3.5：结论卷没填 → 不出空框（不再补 VERDICT）
    el.append(L, R, vs, xs, verdict);
    inkIn(A, L, 0.5, 0.7, { from: { x: -30 }, to: { x: 0 } });
    const tStrike = Math.min(D * 0.26, 1.6);
    stampIn(A, xs, tStrike + 0.75, -6);
    A.add(vs, tStrike + 0.2, 0.6, { o: 0, s: 0.7 }, { o: 1, s: 1 }, 'soft');
    const tR = Math.min(D * 0.46, tStrike + 1.3);
    inkIn(A, R, tR, 0.7, { from: { x: 30 }, to: { x: 0 } });
    const bck = drawPaths(R);
    const tV = Math.min(D - 1.6, tR + 1.3);
    inkIn(A, verdict, tV, 0.7, { from: { y: 24 }, to: { y: 0 } });
    A.fn((t) => {
      reveal(s1.firstChild, t, tStrike, 0.35); reveal(s2.firstChild, t, tStrike + 0.28, 0.35);
      setDraw(bck, EASE.out(clamp01((t - tR - 0.7) / 0.35)));
      const em = verdict.querySelector('em'); if (em) em.style.backgroundSize = `${(EASE.inOut(clamp01((t - tV - 0.5) / 0.5)) * 100).toFixed(1)}% .3em`;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.1, 1, -2, 0), CAM(1.0, 700, 506, 1.0, 0.4, -0.8, 0), CAM(D, 702, 510, 1.02, 0.3, 0.9, 0)] };
  }

  // ============================== 6. showcase 砚墨代码卷 / 宣纸文档 / 录屏 / 器物 ==============================
  const DEVICE_SVG = `<svg viewBox="0 0 400 300"><ellipse cx="200" cy="262" rx="150" ry="14" fill="currentColor" opacity=".12"/><rect x="60" y="80" width="280" height="170" fill="none" stroke="currentColor" stroke-width="5"/><rect x="72" y="92" width="256" height="146" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5"/><circle cx="200" cy="165" r="52" fill="none" stroke="#B82925" stroke-width="5"/><circle cx="200" cy="165" r="22" fill="currentColor"/><rect x="96" y="58" width="84" height="22" fill="currentColor"/><text x="200" y="292" text-anchor="middle" font-family="serif" font-size="18" fill="currentColor" letter-spacing="6">器</text></svg>`;
  function productPanel(data) {
    const el = h('div', 'si-prod');
    const pic = h('div', 'pic');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.innerHTML = DEVICE_SVG;
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? seal(data.price, data.priceSmall || '', 'right:50px;bottom:60px;', { size: 120 }) : null;
    if (price) el.appendChild(price);
    return { el, pic, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'si-zone');
    header(el, A, 'showcase', data, { size: 76, headTop: 150 });
    const dark = kind === 'code' || kind === 'terminal';
    const panel = dark ? h('div', 'si-panel dark') : card('si-panel light', 'position:absolute;');
    panel.insertAdjacentHTML('afterbegin', `<div class="bar"><i></i><i></i><i></i><span>${esc(data.file || '')}</span></div>`);
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'si-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'si-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', 'si-code'); panel.appendChild(codeEl); }
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 262 + 640 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      return h('div', 'si-callout', `left:${px.toFixed(0)}px;top:${(py - 24).toFixed(0)}px;`, `<div class="ld"></div><span>${esc(nt.text)}</span>`);
    });
    const tag = h('div', 'si-kind si-en', 'left:1170px;top:206px;', esc(kind.toUpperCase()));   // v3.5：si-en = 导出（?chrome=0）时藏掉英文种类签
    el.append(panel, ...notes, tag);
    inkIn(A, panel, 0.3, 0.8, { from: { y: 40 }, to: { y: 0 } });
    A.add(tag, 0.8, 0.5, { o: 0 }, { o: 1 }, 'soft');
    const tType0 = 1.0, tType1 = Math.max(tType0 + 0.6, D * 0.6);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 0.9 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.5, { o: 0, x: 30, b: 6 }, { o: 1, x: 0, b: 0 }, 'soft'));
    if (prod) {
      inkIn(A, prod.pic, 0.8, 0.7);
      prod.rows.forEach((r, i) => A.add(r, 1.1 + i * 0.25, 0.45, { x: 30, o: 0 }, { x: 0, o: 1 }, 'soft'));
      if (prod.price) stampIn(A, prod.price, Math.min(D - 1.2, 1.4 + prod.rows.length * 0.25 + 0.3), -5);
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
    return { el, layer: 'world', avatar: 'corner', update: (t) => A.update(t), media,
      cams: [CAM(0, 700, 570, 0.95, 1, -1.2, 0), CAM(1.3, 700, 525, 1.0, 0.5, -1, 0), CAM(D, 710, 535, 1.04, 0.5, 0.9, 0)] };
  }

  // ============================== 7. quote 全屏人像 + 竖排题跋金句（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'si-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const c = h('div', 'si-q', right ? 'right:110px;' : 'left:110px;',
      `<div class="k">${esc(data.kicker || '要义')}</div><div class="t">${mark(data.text)}</div><div class="by">${esc(data.by || '')}</div>`);
    corners(c);
    const st = sealOpt(data.stamp || '', data.stampSmall || '', `${right ? 'right:130px;' : 'left:130px;'}top:${data.stampTop || 690}px;`, { size: 128 });
    el.append(c, st);
    inkIn(A, c, 0.4, 0.9, { from: { x: right ? 40 : -40 }, to: { x: 0 } });
    const cols = Array.from(c.querySelectorAll('.t'));
    stampIn(A, st, Math.min(D - 1.0, D * 0.45), right ? 6 : -6);
    A.fn((t) => cols.forEach((col) => { const p = EASE.inOut(clamp01((t - 0.7) / 1.6)); col.style.clipPath = `inset(-4% -4% -4% ${(100 - p * 100).toFixed(1)}%)`; }));
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 8. outro 三枚书签 + 题签 CTA + 朱印按钮 ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'si-zone');
    header(el, A, 'outro', data);
    const tagC = ['var(--si-azurite)', 'var(--si-cinnabar)', 'var(--si-ochre)'];
    const acts = (data.actions || []).slice(0, 3).map((a, i) => card('si-act', `top:${282 + i * 180}px;`,
      `<div class="no">${ORD[i]}</div>${blank(a.tag) ? '' : `<div class="tg" style="color:${tagC[i]}">${esc(a.tag)}</div>`}<div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div>`));
    const cdat = data.cta || {};
    // v3.5：CTA 题签的引题 / 仓库框 / 整块、收尾印章没填就不出（不再补 OPEN SOURCE / ACTION / 「行」）
    const cta = card('si-cta', null, `${blank(cdat.kicker) ? '' : `<div class="k">${esc(cdat.kicker)}</div>`}<div class="t">${esc(cdat.title || '')}</div><div class="ul">${PROPS.brush(360, 20, 'var(--si-cinnabar)', 61)}</div>${blank(cdat.repo) ? '' : `<div class="repo">${esc(cdat.repo)}</div>`}<div class="btns">${(cdat.buttons || []).slice(0, 3).map((b) => `<span>${esc(b)}</span>`).join('')}</div>`);
    if (blank(cdat.title)) cta.querySelector('.ul').style.display = 'none';
    if (blank(cdat.kicker) && blank(cdat.title) && blank(cdat.repo) && !(cdat.buttons || []).length) cta.style.display = 'none';
    const go = sealOpt(cdat.stamp || '', cdat.stampSmall || '', 'left:1222px;top:690px;', { size: 116 });
    el.append(...acts, cta, go);
    const t0 = 0.7, stp = Math.min(0.55, (D * 0.33) / Math.max(1, acts.length));
    acts.forEach((a, i) => inkIn(A, a, t0 + i * stp, 0.7, { from: { x: -36 }, to: { x: 0 } }));
    const tC = t0 + acts.length * stp + 0.05;
    inkIn(A, cta, tC, 0.8, { from: { y: 30 }, to: { y: 0 } });
    const ulSvg = cta.querySelector('.ul svg');
    const btns = Array.from(cta.querySelectorAll('.btns span'));
    const tP = tC + 1.0;
    A.fn((t) => {
      reveal(ulSvg, t, tC + 0.5, 0.5);
      btns.forEach((b, i) => {
        const on = t >= tP + i * 0.35;
        const p = clamp01((t - (tP + i * 0.35)) / 0.25);
        b.style.background = on ? 'var(--si-cinnabar)' : 'transparent';
        b.style.color = on ? '#FBF6EC' : 'var(--si-cinnabar)';
        b.style.transform = `scale(${(1 + 0.08 * (1 - p) * (on ? 1 : 0)).toFixed(3)})`;
      });
    });
    stampIn(A, go, Math.min(D - 0.9, tP + btns.length * 0.35 + 0.3), -6);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1, -2, 0), CAM(1.3, 700, 506, 1.0, 0.4, -0.7, 0), CAM(D, 700, 502, 0.99, 0, 0.7, 0)] };
  }

  // ============================== 9. timeline 长卷流变 · 墨线横贯 + 朱点当下 ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 244, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'si-zone', `width:${W}px;`);
    header(el, A, 'timeline', data);
    const line = h('div', 'si-tl-line', `width:${W - 120}px;`, PROPS.brush(W - 120, 26, 'var(--si-ink)', 71));
    const lineSvg = line.firstChild;
    el.append(line);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 290 : 636, at = t0 + i * stp, isNow = i === now;
      const c = card(`si-tl-node${isNow ? ' now' : ''}`, `left:${x}px;top:${top}px;`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`, isNow ? 'var(--si-cinnabar)' : undefined);
      const stem = h('div', 'si-tl-stem', `left:${x + 42}px;top:${up ? 500 : 566}px;height:${up ? 40 : 70}px;`);
      const dot = h('div', `si-tl-dot${isNow ? ' now' : ''}`, `left:${x + 30}px;top:540px;`);
      el.append(stem, dot, c);
      A.add(dot, at - 0.1, 0.4, { s: 0, o: 0 }, { s: 1, o: 1 }, 'soft');
      A.add(stem, at, 0.3, { o: 0 }, { o: 1 });
      inkIn(A, c, at + 0.05, 0.6, { from: { y: up ? -24 : 24 }, to: { y: 0 } });
      return { x, up, top, at };
    });
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = seal(data.nowLabel, data.nowSmall || '', `left:${Math.min(W - 230, p.x + (p.up ? 60 : 130))}px;top:${p.up ? 620 : p.top + 226 - 200}px;`, { size: 116 });
      el.appendChild(ns);
      stampIn(A, ns, Math.min(D - 0.9, p.at + 0.8), -5);
    }
    A.fn((t) => reveal(lineSvg, t, 0.4, Math.max(0.8, tEnd - 0.4)));
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.07, 1, -2, -0.3), CAM(0.9, 700, 508, 1.0, 0.5, -0.8, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 508, 1.0, 0.3, 0.8, 0), CAM(D, endX + 6, 505, 1.02, 0.2, 0.8, 0.15)] };
  }

  // ============================== 10. diagram 枢机图 · 墨线连枝 + 墨点流转 + 朱圈核心 ==============================
  let DG_SEQ = 0;
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 130, T = 300, AW = 1210, AH = 590, NW = 260, NH = 124;
    const el = h('div', 'si-zone');
    header(el, A, 'diagram', data);
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = card('si-dg-node', `left:${x}px;top:${y}px;`, `<div class="bd" style="background:${TINTS[i % 4]};"></div><div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      el.appendChild(e);
      inkIn(A, e, appear[nd.id], 0.6, { from: { s: 0.9 }, to: { s: 1 } });
      return e;
    });
    const mid = `sidg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="2" refY="6" markerWidth="16" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1 L11 6 L1 11" fill="none" stroke="#1C1B18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="#1C1B18" stroke-opacity=".78" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mid})"/>`;
      inner += `<circle class="pl" data-j="${j}" data-k="0" r="6" fill="#B82925" opacity="0"/><circle class="pl" data-j="${j}" data-k="1" r="4.5" fill="#2E5A6B" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'si-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'si-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'si-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.4, 0.4, { o: 0, s: 0.9 }, { o: 1, s: 1 }, 'soft');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    let ringPaths = [];
    if (fi >= 0) {
      const p = pos[data.focus];
      const ring = h('div', 'si-dg-ring', `left:${p.x - 36}px;top:${p.y - 30}px;`, PROPS.circle(NW + 72, NH + 60, 'var(--si-cinnabar)', 4));
      el.appendChild(ring); ringPaths = drawPaths(ring);
      if (data.focusLabel) {
        const st = seal(data.focusLabel, data.focusSmall || '', `left:${Math.min(1230, p.x + NW + 30)}px;top:${p.y - 120}px;`, { size: 108 });
        el.appendChild(st);
        stampIn(A, st, tF + 0.35, -6);
      }
    }
    A.fn((t) => {
      lnEls.forEach((pa) => { const j = +pa.dataset.j, g = geo[j]; pa.setAttribute('stroke-dashoffset', (g.len * (1 - EASE.inOut(clamp01((t - tDraw[j]) / 0.5)))).toFixed(1)); });
      plEls.forEach((c) => {
        const j = +c.dataset.j, g = geo[j], live = t - tDraw[j] - 0.6;
        if (live < 0) { c.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.45 + (+c.dataset.k) * 0.5) % 1);
        c.setAttribute('opacity', '.9'); c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1));
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
      setDraw(ringPaths, EASE.inOut(clamp01((t - tF) / 0.6)));
    });
    return { el, layer: 'world', avatar: 'pip', update: (t) => A.update(t),
      cams: [CAM(0, 720, 560, 1.1, 1, -2, -0.3), CAM(1.3, 720, 520, 1.0, 0.5, -0.8, 0), CAM(D, 726, 516, 1.03, 0.3, 0.8, 0.15)] };
  }

  global.SongInk = {
    version: '1.0.0',
    PROPS, Animator, EASE, seal, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, stat: { create: stat }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, timeline: { create: timeline }, diagram: { create: diagram },
      showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro }
    }
  };
})(window);
