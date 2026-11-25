/**
 * Mushanhe Video Engine — 风格包 12 · 华尔街金融终端 / 财经研报风（BloombergFin）
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print / 06_neobrutalism 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · stat · steps · checklist · compare · timeline · diagram · showcase[code|terminal|doc|image|video|product] · quote · outro
 *
 *   const comp = BloombergFin.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : { el, layer:'world'|'screen', avatar, cams:[{t,x,y,zoom,rx,ry,rz}], update(localT), w?, media? }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：深海藏青 #0B1220 终端面板 · 1px 钢蓝 #1E293B 框线 · 2px 圆角上限 · 等宽表格数字（tabular-nums）
 *          琥珀金 #F59E0B 功能键/强调 · 翠绿 #10B981 涨 · 猩红 #EF4444 跌 · 银白 #F1F5F9 正文
 *          道具：确定性种子 K 线 / 折线 sparkline / BUY·STRONG·AAA 评级徽章 / 行情代码牌
 */
(function (global) {
  'use strict';

  // ============================== 工具 ==============================
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const EASE = {
    linear: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    quart: (x) => 1 - Math.pow(1 - x, 4),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    in: (x) => x * x * x,
    back: (x) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    /** 行情牌“咔哒”到位：快速冲过 + 一次小回摆 */
    tick: (x) => (x < 0.6 ? EASE.quart(x / 0.6) * 1.03 : 1.03 - 0.03 * EASE.out((x - 0.6) / 0.4))
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
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
        ['x', 'y', 's', 'r', 'o', 'sx', 'sy'].forEach((k) => {
          const dv = k === 's' || k === 'o' || k === 'sx' || k === 'sy' ? 1 : 0;
          const f = a.from[k] != null ? a.from[k] : (a.to[k] != null ? a.to[k] : dv);
          const tt = a.to[k] != null ? a.to[k] : f;
          st[k] = f + (tt - f) * p;
        });
        el.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) rotate(${st.r.toFixed(2)}deg) scale(${(st.s * st.sx).toFixed(4)}, ${(st.s * st.sy).toFixed(4)})`;
        el.style.opacity = clamp01(st.o).toFixed(3);
      });
      this.fns.forEach((f) => f(t));
    }
  }

  // ============================== 纯 SVG 金融道具（全部种子确定性） ==============================
  /** 生成 OHLC 序列：trend>0 上涨通道，<0 下跌通道 */
  function ohlc(n, seed, trend) {
    const R = rng(seed), out = []; let p = 50 - trend * 22;
    for (let i = 0; i < n; i++) {
      const o = p, c = o + trend * 1.9 + (R() - 0.5) * 9;
      out.push({ o, c, hi: Math.max(o, c) + R() * 4.5, lo: Math.min(o, c) - R() * 4.5 }); p = c;
    }
    return out;
  }
  const PROPS = {
    /** 迷你 K 线图（含琥珀 MA 均线 + 末根价格标签） */
    candles(w, hgt, n = 24, seed = 7, trend = 1, opt = {}) {
      const bars = ohlc(n, seed, trend), all = bars.flatMap((b) => [b.hi, b.lo]);
      const mn = Math.min(...all), mx = Math.max(...all), pad = 8;
      const Y = (v) => pad + (hgt - pad * 2) * (1 - (v - mn) / (mx - mn || 1));
      const bw = w / n; let s = '';
      if (opt.grid !== false) for (let g = 1; g < 4; g++) s += `<line x1="0" x2="${w}" y1="${(hgt * g / 4).toFixed(1)}" y2="${(hgt * g / 4).toFixed(1)}" stroke="#1E293B" stroke-width="1" stroke-dasharray="3 5"/>`;
      bars.forEach((b, i) => {
        const up = b.c >= b.o, col = up ? 'var(--bf-up)' : 'var(--bf-down)', cx = (i + 0.5) * bw;
        s += `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${Y(b.hi).toFixed(1)}" y2="${Y(b.lo).toFixed(1)}" stroke="${col}" stroke-width="1.6"/>`;
        const y0 = Y(Math.max(b.o, b.c)), y1 = Y(Math.min(b.o, b.c));
        s += `<rect x="${(cx - bw * 0.32).toFixed(1)}" y="${y0.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(1.5, y1 - y0).toFixed(1)}" fill="${col}"/>`;
      });
      if (opt.ma !== false) {
        const pts = bars.map((b, i) => { const k = bars.slice(Math.max(0, i - 4), i + 1); const m = k.reduce((a, q) => a + q.c, 0) / k.length; return `${((i + 0.5) * bw).toFixed(1)},${Y(m).toFixed(1)}`; });
        s += `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--bf-amber)" stroke-width="2.2" stroke-linejoin="round"/>`;
      }
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" style="overflow:visible;display:block">${s}</svg>`;
    },
    /** 折线 sparkline + 渐变面积 */
    spark(w, hgt, seed = 3, trend = 1, color = 'var(--bf-up)', n = 32) {
      const R = rng(seed); let p = 0; const v = [];
      for (let i = 0; i < n; i++) { p += trend * 0.9 + (R() - 0.5) * 4; v.push(p); }
      const mn = Math.min(...v), mx = Math.max(...v);
      const pts = v.map((q, i) => [(i / (n - 1)) * w, 4 + (hgt - 8) * (1 - (q - mn) / (mx - mn || 1))]);
      const gid = `bfsg${seed}${trend > 0 ? 'u' : 'd'}${Math.round(w)}`;
      const line = pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
      return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" style="overflow:visible;display:block"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="0,${hgt} ${line} ${w},${hgt}" fill="url(#${gid})"/><polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${pts[n - 1][0].toFixed(1)}" cy="${pts[n - 1][1].toFixed(1)}" r="4.5" fill="${color}"/></svg>`;
    },
    check(size = 34, color = 'var(--bf-up)') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 34 34" style="display:block"><path class="bf-ck" d="M6 18 L14 26 L29 8" stroke="${color}" stroke-width="4.5" fill="none" stroke-linecap="square" stroke-dasharray="40" stroke-dashoffset="40"/></svg>`;
    }
  };

  /** "这句**关键词**话" → ** 包裹部分做琥珀高亮 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }
  /** 功能键式小标题：琥珀底功能码 + 银灰标题 */
  let FN_SEQ = 0;
  function kicker(text, style, code) {
    return h('div', 'bf-kicker', style, `<b>${esc(code || 'FN')}</b><span>${esc(text)}</span>`);
  }
  /** 研报标题行 + 下方 1px 钢蓝分隔规 + 右侧报告元信息 */
  function headBlock(el, A, data, size, meta, code) {
    const kick = kicker(data.kicker || '', 'left:60px;top:104px;', code);
    const head = h('div', 'bf-head', `left:58px;top:150px;font-size:${size}px;`, mark(data.title));
    const rule = h('div', 'bf-rule', 'left:60px;top:262px;width:1280px;');
    const mt = h('div', 'bf-meta', 'right:60px;top:110px;', esc(meta || ''));
    el.append(kick, head, rule, mt);
    A.add(kick, 0.05, 0.3, { x: -30, o: 0 }, { x: 0, o: 1 }, 'quart');
    A.add(mt, 0.15, 0.3, { o: 0 }, { o: 1 });
    A.add(head, 0.18, 0.45, { y: 26, o: 0 }, { y: 0, o: 1 }, 'quart');
    A.add(rule, 0.3, 0.6, { sx: 0 }, { sx: 1 }, 'quart');
    return { kick, head, rule };
  }
  /** 评级徽章（BUY / STRONG / AAA） */
  function badge(text, small, kind, style) {
    return h('div', `bf-badge ${kind || 'up'}`, style, `<span class="bt">${esc(text)}</span>${small ? `<span class="bs">${esc(small)}</span>` : ''}`);
  }
  /** 徽章“盖章”入场：放大 → 弹回 + 闪白 */
  const badgeIn = (A, el, at) => A.add(el, at, 0.34, { s: 1.6, o: 0 }, { s: 1, o: 1 }, 'tick');

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .bf-zone{position:absolute;width:1400px;height:1100px;font-family:var(--bf-font-cn);color:var(--bf-silver);font-variant-numeric:tabular-nums}
  .bf-zone *,.bf-q *{box-sizing:border-box}
  .bf-kicker{position:absolute;display:flex;align-items:stretch;height:34px;border:1px solid var(--bf-steel);background:#0A1222;white-space:nowrap;font-family:var(--bf-font-mono);font-size:17px;font-weight:700;letter-spacing:.12em}
  .bf-kicker b{display:flex;align-items:center;padding:0 12px;background:var(--bf-amber);color:#0B1220;font-weight:800}
  .bf-kicker span{display:flex;align-items:center;padding:0 16px;color:var(--bf-amber2)}
  .bf-head{position:absolute;font-weight:800;letter-spacing:-.01em;line-height:1.08;color:var(--bf-silver);white-space:nowrap}
  .bf-zone em,.bf-q em{font-style:normal;color:var(--bf-amber2)}
  .bf-rule{position:absolute;height:2px;background:linear-gradient(90deg,var(--bf-amber) 0 160px,var(--bf-steel) 160px);transform-origin:left center}
  .bf-meta{position:absolute;font-family:var(--bf-font-mono);font-size:16px;font-weight:600;letter-spacing:.14em;color:var(--bf-mute);white-space:nowrap}
  .bf-panel{position:absolute;background:linear-gradient(180deg,#111C30 0%,#0C1526 100%);border:1px solid var(--bf-steel);border-radius:2px;box-shadow:0 18px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05)}
  .bf-panel::before{content:'';position:absolute;left:-1px;top:-1px;width:18px;height:18px;border-left:2px solid var(--bf-amber);border-top:2px solid var(--bf-amber)}
  .bf-ph{height:36px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid var(--bf-steel);background:rgba(7,12,22,.65);font-family:var(--bf-font-mono);font-size:15px;font-weight:700;letter-spacing:.12em;color:var(--bf-amber2);white-space:nowrap;overflow:hidden}
  .bf-ph .r{margin-left:auto;color:var(--bf-mute);font-weight:600}
  .bf-ph .live{color:var(--bf-up)}
  .bf-up{color:var(--bf-up)}.bf-down{color:var(--bf-down)}
  .bf-chip{position:absolute;display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border:1px solid var(--bf-steel);background:#0A1222;font-family:var(--bf-font-mono);font-size:20px;font-weight:700;letter-spacing:.08em;color:var(--bf-silver);white-space:nowrap}
  .bf-chip i{width:4px;align-self:stretch;background:var(--bf-amber);margin:-8px 4px -8px -16px}
  .bf-badge{position:absolute;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 26px 12px;border:2px solid currentColor;outline:1px solid currentColor;outline-offset:4px;font-weight:900;line-height:1.02;white-space:nowrap;text-align:center;background:rgba(11,18,32,.92)}
  .bf-badge .bt{letter-spacing:.02em}
  .bf-badge .bs{display:block;font-family:var(--bf-font-mono);font-size:.3em;font-weight:700;letter-spacing:.22em;margin-top:8px;opacity:.95}
  .bf-badge.up{color:var(--bf-up)}.bf-badge.down{color:var(--bf-down)}.bf-badge.amber{color:var(--bf-amber2)}.bf-badge.silver{color:var(--bf-silver)}
  .bf-badge.fill{background:var(--bf-up);color:#06130D;border-color:var(--bf-up);outline-color:var(--bf-up)}
  .bf-badge.fill.amber{background:var(--bf-amber);color:#0B1220;border-color:var(--bf-amber);outline-color:var(--bf-amber)}
  /* cover */
  .bf-cv-title{position:absolute;left:58px;top:168px;font-size:146px;font-weight:900;letter-spacing:-.02em;line-height:1.1;white-space:nowrap;color:var(--bf-silver)}
  .bf-cv-title span{display:inline-block}
  .bf-cv-title .cur{display:inline-block;width:.08em;height:.82em;margin-left:.06em;background:var(--bf-amber);vertical-align:-.04em}
  .bf-cv-chart{left:740px;top:170px;width:600px;height:340px;overflow:hidden}
  .bf-cv-chart .cv{position:absolute;left:18px;top:52px}
  .bf-cv-chart .px{position:absolute;right:14px;top:46px;padding:4px 10px;background:var(--bf-up);color:#06130D;font-family:var(--bf-font-mono);font-size:20px;font-weight:800}
  .bf-cv-ch{left:60px;top:560px;width:290px;height:300px}
  .bf-cv-ch .l{position:absolute;left:18px;top:52px;font-family:var(--bf-font-mono);font-size:18px;font-weight:700;letter-spacing:.24em;color:var(--bf-mute)}
  .bf-cv-ch .n{position:absolute;left:14px;top:76px;font-family:var(--bf-font-mono);font-size:150px;font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--bf-amber2)}
  .bf-cv-ch .f{position:absolute;left:18px;right:18px;bottom:16px;display:flex;justify-content:space-between;font-family:var(--bf-font-mono);font-size:17px;font-weight:700;color:var(--bf-up);border-top:1px solid var(--bf-steel);padding-top:10px}
  .bf-cv-sub{left:380px;top:560px;width:560px;height:220px}
  .bf-cv-sub .tx{padding:22px 26px;font-size:42px;font-weight:800;line-height:1.38;white-space:nowrap}
  /* stat */
  .bf-stat{top:300px;height:440px;overflow:hidden}
  .bf-stat .lb{position:absolute;left:26px;top:58px;font-size:28px;font-weight:800;color:var(--bf-silver);white-space:nowrap}
  .bf-stat .num{position:absolute;left:22px;top:110px;font-family:var(--bf-font-mono);font-weight:800;letter-spacing:-.04em;line-height:1;white-space:nowrap;color:var(--bf-silver)}
  .bf-stat.hot .num{color:var(--bf-amber2);text-shadow:0 0 28px rgba(245,158,11,.35)}
  .bf-stat .num .u,.bf-stat .num .pf{font-family:var(--bf-font-cn);font-size:.22em;letter-spacing:0;margin-left:.25em;font-weight:800;color:var(--bf-mute)}
  .bf-stat .num .pf{margin:0 .15em 0 0}
  .bf-stat .sp{position:absolute;right:24px;top:118px;opacity:.9}
  .bf-stat .bar{position:absolute;left:26px;right:26px;bottom:74px;height:22px;background:#0A1222;border:1px solid var(--bf-steel)}
  .bf-stat .bar i{position:absolute;left:0;top:0;bottom:0;background:var(--bf-mute);transform-origin:left center}
  .bf-stat.hot .bar i{background:var(--bf-amber)}
  .bf-stat .sc{position:absolute;left:26px;right:26px;bottom:26px;display:flex;justify-content:space-between;font-family:var(--bf-font-mono);font-size:18px;font-weight:700;color:var(--bf-mute)}
  .bf-stat.hot{border-color:rgba(245,158,11,.55)}
  /* steps */
  .bf-leg{top:310px;height:380px}
  .bf-leg .no{position:absolute;left:20px;top:56px;font-family:var(--bf-font-mono);font-size:64px;font-weight:800;color:var(--bf-amber2);line-height:1}
  .bf-leg .nm{position:absolute;left:20px;top:150px;font-size:60px;font-weight:900;line-height:1.05;white-space:nowrap}
  .bf-leg .pg{position:absolute;left:20px;right:20px;top:246px;height:6px;background:#0A1222;border:1px solid var(--bf-steel)}
  .bf-leg .pg i{position:absolute;left:0;top:0;bottom:0;width:100%;background:var(--bf-up);transform-origin:left center}
  .bf-leg .fn{position:absolute;left:20px;right:20px;bottom:22px;padding:10px 12px;background:#0A1222;border:1px solid var(--bf-steel);font-family:var(--bf-font-mono);font-size:20px;font-weight:700;color:var(--bf-silver);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bf-leg .st{padding:2px 8px;border:1px solid currentColor;color:var(--bf-mute)}
  .bf-leg .st.ok{color:var(--bf-up);background:rgba(16,185,129,.12)}
  .bf-arw{position:absolute;top:478px;font-family:var(--bf-font-mono);font-size:40px;font-weight:800;color:var(--bf-amber);z-index:4}
  .bf-pf{left:60px;top:770px;width:1280px;height:104px;display:flex;align-items:center;gap:24px;padding:0 28px;border-color:rgba(245,158,11,.5)}
  .bf-pf .f{font-family:var(--bf-font-mono);font-size:26px;font-weight:700;letter-spacing:.06em;color:var(--bf-silver);white-space:nowrap}
  .bf-pf .b{padding:2px 14px;background:var(--bf-amber);color:#0B1220;font-family:var(--bf-font-mono);font-size:40px;font-weight:800;white-space:nowrap}
  .bf-pf .m{margin-left:auto;margin-right:250px;font-family:var(--bf-font-mono);font-size:16px;font-weight:700;color:var(--bf-mute);line-height:1.45;text-align:right;white-space:nowrap}
  /* checklist */
  .bf-ck-card{left:200px;top:100px;width:1000px}
  .bf-ck-card .ttl{position:absolute;left:34px;top:58px;font-family:var(--bf-font-mono);font-size:84px;font-weight:800;letter-spacing:-.03em;line-height:1;white-space:nowrap;color:var(--bf-silver)}
  .bf-ck-card .sub{position:absolute;left:36px;top:160px;font-size:32px;font-weight:800;color:var(--bf-mute);white-space:nowrap}
  .bf-ck-card .th{position:absolute;left:34px;right:34px;top:226px;height:40px;display:flex;align-items:center;border-top:1px solid var(--bf-steel);border-bottom:1px solid var(--bf-steel);font-family:var(--bf-font-mono);font-size:15px;font-weight:700;letter-spacing:.18em;color:var(--bf-mute)}
  .bf-ck-card .th span:nth-child(1){width:84px}.bf-ck-card .th span:nth-child(3){margin-left:auto}
  .bf-row{position:absolute;left:34px;right:34px;height:92px;border-bottom:1px solid rgba(30,41,59,.9)}
  .bf-row .hl{position:absolute;inset:0;background:linear-gradient(90deg,rgba(245,158,11,.16),rgba(245,158,11,0) 70%);transform-origin:left center}
  .bf-row .n{position:absolute;left:0;top:28px;font-family:var(--bf-font-mono);font-size:24px;font-weight:800;color:var(--bf-amber2)}
  .bf-row .k{position:absolute;left:84px;top:10px;font-size:38px;font-weight:900;white-space:nowrap}
  .bf-row .d{position:absolute;left:86px;top:58px;font-size:22px;font-weight:700;color:var(--bf-mute);white-space:nowrap}
  .bf-row .ck{position:absolute;right:150px;top:28px}
  .bf-row .s{position:absolute;right:0;top:26px;width:132px;text-align:center;padding:4px 0;border:1px solid currentColor;font-family:var(--bf-font-mono);font-size:18px;font-weight:800;letter-spacing:.12em}
  .bf-memo{position:absolute;left:34px;right:34px;padding:18px 24px 20px;background:rgba(245,158,11,.1);border-left:4px solid var(--bf-amber);font-size:38px;font-weight:900;white-space:nowrap}
  .bf-memo small{display:block;font-family:var(--bf-font-mono);font-size:17px;letter-spacing:.14em;margin-bottom:8px;color:var(--bf-amber2)}
  /* compare */
  .bf-cmp{top:296px;width:560px;height:440px;overflow:hidden}
  .bf-cmp .band{height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;font-family:var(--bf-font-mono);font-size:20px;font-weight:800;letter-spacing:.12em;white-space:nowrap}
  .bf-cmp.wrong .band{background:rgba(239,68,68,.16);color:var(--bf-down);border-bottom:1px solid rgba(239,68,68,.5)}
  .bf-cmp.right .band{background:rgba(16,185,129,.16);color:var(--bf-up);border-bottom:1px solid rgba(16,185,129,.5)}
  .bf-cmp.right{border-color:rgba(16,185,129,.6)}
  .bf-cmp .t{position:absolute;left:28px;top:78px;font-size:56px;font-weight:900;line-height:1.14;white-space:nowrap}
  .bf-cmp.wrong .t{color:#7C8AA0}
  .bf-cmp .d{position:absolute;left:28px;right:28px;top:226px;font-size:25px;font-weight:700;line-height:1.5;color:var(--bf-mute)}
  .bf-cmp.right .d{color:#CBD5E1}
  .bf-cmp .kc{position:absolute;left:18px;right:18px;bottom:14px;opacity:.85}
  .bf-cmp svg.strike{position:absolute;left:16px;top:84px;overflow:visible}
  .bf-vs{position:absolute;left:640px;top:470px;width:120px;height:120px;z-index:6;display:flex;align-items:center;justify-content:center;border:1px solid var(--bf-steel);border-radius:50%;background:#0A1222;font-family:var(--bf-font-mono);font-size:40px;font-weight:800;color:var(--bf-amber2);box-shadow:0 0 0 6px rgba(11,18,32,.9)}
  .bf-verdict{left:60px;top:790px;width:1280px;height:110px;display:flex;align-items:center;gap:26px;padding:0 28px;z-index:7;border-color:rgba(245,158,11,.6)}
  .bf-verdict b{padding:6px 14px;background:var(--bf-amber);color:#0B1220;font-family:var(--bf-font-mono);font-size:20px;letter-spacing:.18em;white-space:nowrap}
  .bf-verdict span{font-size:46px;font-weight:900;white-space:nowrap}
  /* showcase */
  .bf-scr{left:60px;top:282px;width:1240px;height:620px;overflow:hidden}
  .bf-code{padding:22px 28px;font-family:var(--bf-font-mono);font-size:30px;font-weight:600;line-height:1.62;white-space:pre;color:var(--bf-silver)}
  .bf-code .ln{display:inline-block;width:56px;color:#475569}
  .bf-code .c{color:#64748B}.bf-code .k{color:var(--bf-amber2)}.bf-code .ok{color:var(--bf-up)}.bf-code .er{color:var(--bf-down)}
  .bf-code .cur{display:inline-block;width:.6em;background:var(--bf-amber);color:var(--bf-amber)}
  .bf-scr.doc{background:#F1F5F9;color:#0B1220}
  .bf-scr.doc .bf-ph{background:#E2E8F0;color:#0B1220;border-bottom-color:#CBD5E1}
  .bf-scr.doc .bf-code{font-family:var(--bf-font-cn);font-size:34px;font-weight:700;color:#0B1220}
  .bf-scr.doc .bf-code .ln{color:#94A3B8}.bf-scr.doc .bf-code .k{color:#B45309}.bf-scr.doc .bf-code .ok{color:#047857}.bf-scr.doc .bf-code .c{color:#64748B}
  .bf-media{position:absolute;left:0;right:0;top:36px;width:100%;height:calc(100% - 36px);object-fit:cover;background:#000}
  .bf-callout{position:absolute;display:flex;align-items:center;z-index:6}
  .bf-callout .ln{width:64px;height:2px;background:var(--bf-amber)}
  .bf-callout .dt{width:12px;height:12px;border-radius:50%;background:var(--bf-amber);box-shadow:0 0 0 5px rgba(245,158,11,.25)}
  .bf-callout span{padding:8px 16px;background:var(--bf-amber);color:#0B1220;font-size:26px;font-weight:900;white-space:nowrap}
  .bf-prod{position:absolute;left:0;right:0;top:36px;bottom:0}
  .bf-prod .pic{position:absolute;left:28px;top:28px;bottom:28px;width:480px;border:1px solid var(--bf-steel);background:#0A1222;display:flex;align-items:center;justify-content:center;overflow:hidden;
    background-image:linear-gradient(rgba(30,41,59,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(30,41,59,.6) 1px,transparent 1px);background-size:24px 24px}
  .bf-prod .pic img{width:100%;height:100%;object-fit:contain}
  .bf-prod .pic svg{width:80%;height:auto}
  .bf-prod .info{position:absolute;left:550px;right:36px;top:28px}
  .bf-prod .nm{font-size:54px;font-weight:900;line-height:1.08;white-space:nowrap}
  .bf-prod .tg{display:inline-block;margin-top:12px;padding:4px 12px;border:1px solid var(--bf-up);color:var(--bf-up);font-size:22px;font-weight:800;white-space:nowrap}
  .bf-prod .specs{margin-top:18px;border-top:2px solid var(--bf-amber)}
  .bf-prod .row{display:flex;justify-content:space-between;gap:20px;padding:11px 0;border-bottom:1px solid var(--bf-steel);white-space:nowrap}
  .bf-prod .row .k{font-family:var(--bf-font-mono);font-size:18px;font-weight:700;letter-spacing:.08em;color:var(--bf-mute)}
  .bf-prod .row .v{font-family:var(--bf-font-mono);font-size:24px;font-weight:800;color:var(--bf-silver)}
  /* quote（屏幕层） */
  .bf-q{position:absolute;top:190px;width:fit-content;min-width:440px;max-width:720px;padding:0 0 34px;background:rgba(11,18,32,.9);backdrop-filter:blur(10px);border:1px solid var(--bf-steel);border-top:3px solid var(--bf-amber);box-shadow:0 30px 70px rgba(0,0,0,.55);color:var(--bf-silver);font-family:var(--bf-font-cn)}
  .bf-q .bf-ph{border-bottom:1px solid var(--bf-steel)}
  .bf-q .t{padding:26px 40px 0;font-size:64px;font-weight:900;line-height:1.26}
  .bf-q .sp{margin:22px 40px 0}
  .bf-q .by{margin:18px 40px 0;font-family:var(--bf-font-mono);font-size:19px;font-weight:700;letter-spacing:.1em;color:var(--bf-mute)}
  /* outro */
  .bf-act{left:60px;width:580px;height:156px;padding:46px 24px 0}
  .bf-act .tg{position:absolute;left:0;top:0;height:30px;display:flex;align-items:center;padding:0 12px;font-family:var(--bf-font-mono);font-size:16px;font-weight:800;letter-spacing:.14em}
  .bf-act .t{font-size:40px;font-weight:900;line-height:1.2;white-space:nowrap}
  .bf-act .d{font-family:var(--bf-font-mono);font-size:19px;font-weight:700;color:var(--bf-mute);margin-top:6px;white-space:nowrap}
  .bf-act .no{position:absolute;right:22px;top:46px;font-family:var(--bf-font-mono);font-size:60px;font-weight:800;color:transparent;-webkit-text-stroke:1.5px var(--bf-amber);line-height:1}
  .bf-cta{left:700px;top:272px;width:640px;height:520px;border-color:rgba(245,158,11,.55)}
  .bf-cta .in{padding:24px 34px}
  .bf-cta .t{font-size:66px;font-weight:900;line-height:1.1;white-space:nowrap}
  .bf-cta .repo{margin-top:22px;padding:14px 16px;background:#0A1222;border:1px solid var(--bf-steel);font-family:var(--bf-font-mono);font-size:24px;font-weight:700;color:var(--bf-amber2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bf-cta .btns{display:flex;gap:16px;margin-top:30px}
  .bf-cta .btns span{flex:1;text-align:center;padding:14px 0;font-size:32px;font-weight:900;border:1px solid transparent}
  /* timeline */
  .bf-tl-axis{position:absolute;left:60px;top:556px;height:2px;background:var(--bf-steel);transform-origin:left center}
  .bf-tl-chart{position:absolute;left:60px;top:300px;overflow:visible;z-index:1}
  .bf-tl-node{position:absolute;z-index:3;width:240px;height:196px;padding:44px 18px 0}
  .bf-tl-node .tm{position:absolute;left:0;top:0;height:34px;display:flex;align-items:center;padding:0 12px;background:#0A1222;border-right:1px solid var(--bf-steel);border-bottom:1px solid var(--bf-steel);font-family:var(--bf-font-mono);font-size:22px;font-weight:800;color:var(--bf-amber2)}
  .bf-tl-node .chg{position:absolute;right:12px;top:7px;font-family:var(--bf-font-mono);font-size:16px;font-weight:800}
  .bf-tl-node .t{font-size:34px;font-weight:900;white-space:nowrap}
  .bf-tl-node .d{font-size:19px;font-weight:700;margin-top:8px;line-height:1.35;color:var(--bf-mute)}
  .bf-tl-node.now{border-color:var(--bf-amber);box-shadow:0 0 0 1px var(--bf-amber),0 0 40px rgba(245,158,11,.25)}
  .bf-tl-node.now .tm{background:var(--bf-amber);color:#0B1220}
  .bf-tl-stem{position:absolute;width:1px;background:var(--bf-mute)}
  .bf-tl-dot{position:absolute;width:18px;height:18px;border-radius:50%;background:#0B1220;border:3px solid var(--bf-silver);z-index:6}
  .bf-tl-dot.now{border-color:var(--bf-amber);background:var(--bf-amber);box-shadow:0 0 0 6px rgba(245,158,11,.25)}
  /* diagram */
  .bf-dg-node{width:260px;height:124px;z-index:3;overflow:hidden}
  .bf-dg-node .l{padding:12px 18px 0;font-size:36px;font-weight:900;white-space:nowrap}
  .bf-dg-node .s{padding:4px 18px 0;font-family:var(--bf-font-mono);font-size:17px;font-weight:700;color:var(--bf-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bf-dg-node .bf-ph{height:28px;font-size:13px}
  .bf-dg-node.hot{border-color:var(--bf-amber);box-shadow:0 0 0 1px var(--bf-amber),0 0 44px rgba(245,158,11,.35)}
  .bf-dg-node.hot .bf-ph{background:var(--bf-amber);color:#0B1220}
  .bf-dg-node.hot .bf-ph .r{color:#0B1220}
  .bf-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .bf-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .bf-dg-tag{padding:4px 12px;background:#0A1222;border:1px solid var(--bf-amber);color:var(--bf-amber2);font-family:var(--bf-font-mono);font-size:17px;font-weight:800;white-space:nowrap}
  `;
  function injectCSS() {
    if (document.getElementById('bf-components-css')) return;
    const st = document.createElement('style'); st.id = 'bf-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  const panel = (cls, style, hdrL, hdrR, inner) => h('div', `bf-panel ${cls || ''}`, style, `${hdrL != null ? `<div class="bf-ph"><span>${hdrL}</span>${hdrR ? `<span class="r">${hdrR}</span>` : ''}</div>` : ''}${inner || ''}`);
  /** 揭开 K 线等图表：clip-path 从左到右扫出 */
  const reveal = (el, t, at, d) => { const p = EASE.inOut(clamp01((t - at) / d)); el.style.clipPath = `inset(-20px ${((1 - p) * 100).toFixed(2)}% -20px -20px)`; };

  // ============================== 1. cover 研报封面 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'bf-zone');
    const kick = kicker(data.kicker, 'left:60px;top:104px;', 'FN·01');
    const meta = h('div', 'bf-meta', 'right:60px;top:110px;', 'MVE RESEARCH · INITIATING COVERAGE');
    const title = h('div', 'bf-cv-title');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const cur = h('i', 'cur'); title.appendChild(cur);
    const chart = panel('bf-cv-chart', null, 'MVE · 1D · 口播效率指数', '<span class="live">● LIVE</span>',
      `<div class="cv">${PROPS.candles(500, 270, 26, 1203, 1)}</div><div class="px">+9.0x ▲</div>`);
    const cv = chart.querySelector('.cv'), px = chart.querySelector('.px');
    const ch = panel('bf-cv-ch', null, 'TICKER', null,
      `<div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="n">${esc(data.chapter || '01')}</div><div class="f"><span>VOL 1.0M</span><span>▲ 100%</span></div>`);
    const sub = panel('bf-cv-sub', null, 'SUMMARY · 摘要', 'P.01', `<div class="tx">${mark(data.subtitle)}</div>`);
    const dm = h('div', 'bf-chip', 'left:380px;top:812px;', `<i></i>${esc(data.dim || '')}`);
    const st = data.stamp ? badge(data.stamp, data.stampSmall || '', 'fill', 'left:1010px;top:600px;font-size:72px;min-width:280px;') : null;
    const rl = h('div', 'bf-meta', 'left:1010px;top:566px;color:var(--bf-amber2);', 'ANALYST RATING');
    el.append(kick, meta, title, chart, ch, sub, dm, rl);
    if (st) el.appendChild(st);
    A.add(kick, 0.05, 0.3, { x: -30, o: 0 }, { x: 0, o: 1 }, 'quart');
    A.add(meta, 0.15, 0.3, { o: 0 }, { o: 1 });
    chars.forEach((c, i) => A.add(c, 0.3 + i * 0.07, 0.32, { y: 46, o: 0 }, { y: 0, o: 1 }, 'quart'));
    const tB = 0.5 + chars.length * 0.07;
    A.add(chart, 0.35, 0.5, { x: 60, o: 0 }, { x: 0, o: 1 }, 'quart');
    A.add(px, 0.95 + 1.3, 0.3, { s: 1.4, o: 0 }, { s: 1, o: 1 }, 'tick');
    A.add(ch, tB, 0.45, { y: 60, o: 0 }, { y: 0, o: 1 }, 'quart');
    A.add(sub, tB + 0.2, 0.45, { y: 60, o: 0 }, { y: 0, o: 1 }, 'quart');
    A.add(dm, tB + 0.6, 0.35, { x: -30, o: 0 }, { x: 0, o: 1 }, 'quart');
    A.add(rl, tB + 0.9, 0.3, { o: 0 }, { o: 1 });
    if (st) badgeIn(A, st, Math.min(D - 1.2, tB + 1.1));
    A.fn((t) => {
      reveal(cv, t, 0.8, 1.4);
      cur.style.opacity = t < tB + 0.4 ? '1' : (Math.floor(t * 2.2) % 2 ? '0' : '1');
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 640, 420, 1.22, 2, -3, -0.6), CAM(1.6, 700, 500, 1.0, 1, -1.2, 0), CAM(D, 712, 505, 1.03, 0.4, 1, 0.2)] };
  }

  // ============================== 2. stat 大数字数据卡 ==============================
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
    const el = h('div', 'bf-zone');
    headBlock(el, A, data, 84, data.note ? `SRC: ${data.note}`.slice(0, 40) : 'DATA · REALTIME', 'FN·02');
    const gap = 40, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 230 : n === 2 ? 176 : 128;
    const cards = items.map((it, i) => {
      const hot = i === n - 1, trend = hot ? 1 : -1;
      const c = panel(`bf-stat${hot ? ' hot' : ''}`, `left:${60 + i * (w + gap)}px;width:${w}px;`, `DATA ${String(i + 1).padStart(2, '0')}`, hot ? '<span class="live">▲ NOW</span>' : '<span class="bf-down">▼ PREV</span>',
        `<div class="lb">${esc(it.label || '')}</div><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div>
         <div class="sp">${PROPS.spark(150, 70, 40 + i, trend, hot ? 'var(--bf-up)' : 'var(--bf-down)', 24)}</div>
         <div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div>
         <div class="sc"><span>0</span><span>${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}% OF MAX` : ''}</span></div>`);
      return c;
    });
    const nums = cards.map((c) => c.querySelector('.num'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const st = data.delta ? badge(data.delta, data.deltaSmall || '', 'fill', 'left:1000px;top:770px;font-size:54px;min-width:300px;') : null;
    const note = data.note ? h('div', 'bf-chip', 'left:60px;top:792px;font-family:var(--bf-font-cn);font-size:28px;', `<i></i>† ${esc(data.note)}`) : null;
    el.append(...cards);
    if (note) el.appendChild(note);
    if (st) el.appendChild(st);
    const tIn = cards.map((_, i) => 0.55 + i * 0.45);
    cards.forEach((c, i) => {
      A.add(c, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(c, tIn[i], 0.5, { y: 80, o: 0 }, { y: 0, o: 1 }, 'quart');
      A.add(c.querySelector('.bar i'), tIn[i] + 0.9, 0.8, { sx: 0 }, { sx: 1 }, 'quart');
    });
    if (note) A.add(note, D - 2.6, 0.4, { x: -30, o: 0 }, { x: 0, o: 1 }, 'quart');
    if (st) badgeIn(A, st, Math.min(D - 1.3, tIn[n - 1] + 1.9));
    let fitted = false;
    const sps = cards.map((c) => c.querySelector('.sp'));
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 220); fitted = true; }
      items.forEach((it, i) => {
        nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.out(clamp01((t - tIn[i] - 0.2) / 1.2)), decs[i]);
        reveal(sps[i], t, tIn[i] + 0.3, 1.0);
      });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 550, 1.12, 1.5, -2.5, -0.5), CAM(1.2, 700, 510, 1.0, 1, -1, 0), CAM(D, 708, 505, 1.04, 0.5, 1, 0.2)] };
  }

  // ============================== 3. steps 订单腿（LEG）逐条成交 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'bf-zone');
    headBlock(el, A, data, 84, `EXECUTION PLAN · ${n} LEGS`, 'FN·03');
    const tag = h('div', 'bf-chip', 'left:1100px;top:176px;font-size:28px;color:var(--bf-amber2);', `<i></i>${esc(data.dim || `${n} STEPS`)}`);
    const AW = 44, cw = (1280 - AW * (n - 1)) / n;
    const cards = items.map((it, i) => panel('bf-leg', `left:${60 + i * (cw + AW)}px;width:${cw}px;`, `LEG ${String(i + 1).padStart(2, '0')}`, '<span class="st">QUEUED</span>',
      `<div class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm">${esc(it.title)}</div><div class="pg"><i></i></div><div class="fn">${esc(it.desc || '')}</div>`));
    const arrows = items.slice(1).map((_, i) => h('div', 'bf-arw', `left:${60 + (i + 1) * (cw + AW) - AW + 8}px;`, '›'));
    const bar = panel('bf-pf', null, null, null,
      `<div class="f">▣ ${esc(data.folder || 'PROJECT /')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>`);
    const label = data.label ? badge(data.label, data.labelSmall || '', 'fill amber', 'left:1080px;top:752px;font-size:38px;min-width:220px;') : null;
    el.append(tag, ...cards, ...arrows, bar);
    if (label) el.appendChild(label);
    A.add(tag, 0.6, 0.35, { x: 30, o: 0 }, { x: 0, o: 1 }, 'quart');
    A.add(bar, 0.5, 0.45, { y: 60, o: 0 }, { y: 0, o: 1 }, 'quart');
    const t0 = 1.0, t1 = Math.min(Math.max(t0 + 0.5, D - 2.4), t0 + 0.75 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const sts = cards.map((c) => c.querySelector('.st')), pgs = cards.map((c) => c.querySelector('.pg i'));
    cards.forEach((c, i) => { A.add(c, -1, 0.01, { o: 0 }, { o: 0 }); A.add(c, t0 + i * stp, 0.45, { y: -70, o: 0 }, { y: 0, o: 1 }, 'quart'); });
    arrows.forEach((a, i) => A.add(a, t0 + (i + 1) * stp - 0.1, 0.3, { x: -20, o: 0 }, { x: 0, o: 1 }, 'quart'));
    if (label) badgeIn(A, label, D - 1.4);
    A.fn((t) => cards.forEach((c, i) => {
      const at = t0 + i * stp + 0.3, p = clamp01((t - at) / 0.6);
      pgs[i].style.transform = `scaleX(${EASE.out(p).toFixed(3)})`;
      const done = p >= 1;
      sts[i].classList.toggle('ok', done); sts[i].textContent = done ? 'FILLED' : 'QUEUED';
    }));
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 600, 1.18, 2, -2.5, -0.5), CAM(1.2, 700, 510, 1.0, 1, -1, 0), CAM(D, 705, 505, 1.03, 0.5, 1, 0.2)] };
  }

  // ============================== 4. checklist 合规审查表 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const RH = 92, R0 = 268;
    const H = R0 + n * RH + (data.note ? 150 : 30);
    const el = h('div', 'bf-zone');
    const card = panel('bf-ck-card', `height:${H}px;`, `COMPLIANCE · ${esc(data.kicker || '')}`, `${n} ITEMS`,
      `<div class="ttl">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div><div class="th"><span>#</span><span>ITEM / 条目</span><span>STATUS</span></div>`);
    const rows = items.map((it, i) => {
      const r = h('div', 'bf-row', `top:${R0 + i * RH}px;`,
        `<div class="hl"></div><div class="n">${String(i + 1).padStart(2, '0')}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="ck">${PROPS.check(36)}</div><div class="s">PENDING</div>`);
      card.appendChild(r); return r;
    });
    let memo = null;
    if (data.note) { memo = h('div', 'bf-memo', `top:${R0 + n * RH + 24}px;`, `<small>${esc(data.noteLead || '')}</small>${mark(data.note)}`); card.appendChild(memo); }
    const score = badge('AAA', `${n}/${n} PASS`, 'up', 'left:1124px;top:152px;font-size:52px;');
    el.append(card, score);
    A.add(card, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(card, 0, 0.5, { y: 70, o: 0 }, { y: 0, o: 1 }, 'quart');
    const t0 = 1.0, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.6 : 1.4)), t0 + 0.65 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const sEls = rows.map((r) => r.querySelector('.s')), cks = rows.map((r) => r.querySelector('.bf-ck'));
    rows.forEach((r, i) => {
      A.add(r, t0 + i * stp - 0.35, 0.3, { o: 0.3, x: -10 }, { o: 1, x: 0 }, 'quart');
      A.add(r.querySelector('.hl'), t0 + i * stp, 0.4, { sx: 0, o: 1 }, { sx: 1, o: 1 }, 'quart');
    });
    A.fn((t) => rows.forEach((r, i) => {
      const at = t0 + i * stp, p = clamp01((t - at - 0.05) / 0.25);
      cks[i].setAttribute('stroke-dashoffset', (40 * (1 - EASE.out(p))).toFixed(1));
      const ok = t >= at + 0.2;
      sEls[i].textContent = ok ? 'PASS ✓' : 'PENDING';
      sEls[i].style.color = ok ? 'var(--bf-up)' : 'var(--bf-mute)';
      sEls[i].style.background = ok ? 'rgba(16,185,129,.12)' : 'transparent';
    }));
    if (memo) A.add(memo, D - 2.1, 0.45, { x: -40, o: 0 }, { x: 0, o: 1 }, 'quart');
    badgeIn(A, score, Math.max(t1 + 0.4, D - 1.5));
    const bottom = 100 + H, scanY = 500 + Math.max(0, bottom - 1000);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 520, 1.06, 1.5, -2, 0), CAM(1.0, 700, 500, 1.01, 1, -1, 0), CAM(Math.max(1.1, D - 2.3), 700, 500, 1.01, 0.5, -0.5, 0), CAM(Math.max(1.2, D - 1.5), 700, scanY, 1.0, 0.5, 0, 0), CAM(D, 700, scanY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 5. compare SELL vs BUY 双栏研判 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'bf-zone');
    headBlock(el, A, data, 84, 'PAIR ANALYSIS · A / B', 'FN·05');
    const L = h('div', 'bf-panel bf-cmp wrong', 'left:60px;',
      `<div class="band"><span>${esc(w.label || '✕ WRONG')}</span><span>SELL ▼</span></div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div><div class="kc">${PROPS.candles(522, 92, 22, 505, -1, { grid: false, ma: false })}</div><svg class="strike" width="480" height="150"><path d="M4 42 L430 36" stroke="var(--bf-down)" stroke-width="6" fill="none" stroke-dasharray="430" stroke-dashoffset="430"/><path d="M4 106 L390 100" stroke="var(--bf-down)" stroke-width="6" fill="none" stroke-dasharray="390" stroke-dashoffset="390"/></svg>`);
    const R = h('div', 'bf-panel bf-cmp right', 'left:780px;',
      `<div class="band"><span>${esc(r.label || '✓ RIGHT')}</span><span>BUY ▲</span></div><div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div><div class="kc">${PROPS.candles(522, 92, 22, 507, 1, { grid: false, ma: false })}</div>`);
    const vs = h('div', 'bf-vs', null, 'VS');
    const xs = badge(w.stamp || '✕', 'SELL', 'down', 'left:390px;top:372px;font-size:40px;');
    const verdict = h('div', 'bf-panel bf-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span>`);
    const rate = badge('STRONG', 'BUY', 'fill', 'left:1110px;top:776px;font-size:44px;');
    el.append(L, R, vs, xs, verdict, rate);
    A.add(L, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(L, 0.5, 0.45, { x: -60, o: 0 }, { x: 0, o: 1 }, 'quart');
    const tStrike = Math.min(D * 0.28, 1.6);
    const strikes = L.querySelectorAll('svg.strike path');
    badgeIn(A, xs, tStrike + 0.7);
    A.add(vs, tStrike + 0.3, 0.4, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
    const tR = Math.min(D * 0.48, tStrike + 1.3);
    A.add(R, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(R, tR, 0.45, { x: 60, o: 0 }, { x: 0, o: 1 }, 'quart');
    const tV = Math.min(D - 1.6, tR + 1.3);
    A.add(verdict, tV, 0.45, { y: 50, o: 0 }, { y: 0, o: 1 }, 'quart');
    badgeIn(A, rate, tV + 0.45);
    const kcs = [L.querySelector('.kc'), R.querySelector('.kc')];
    A.fn((t) => {
      strikes.forEach((p, i) => { const len = +p.getAttribute('stroke-dasharray'); p.setAttribute('stroke-dashoffset', (len * (1 - EASE.inOut(clamp01((t - tStrike - i * 0.25) / 0.3)))).toFixed(1)); });
      reveal(kcs[0], t, 0.8, 0.9); reveal(kcs[1], t, tR + 0.3, 0.9);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.12, 1, -2.5, 0), CAM(1.0, 700, 505, 1.0, 0.5, -1, 0), CAM(D, 700, 510, 1.02, 0.5, 1.2, 0)] };
  }

  // ============================== 6. showcase 终端 / 研报文档 / 录屏 / 产品 ==============================
  const DEVICE_SVG = `<svg viewBox="0 0 400 300"><rect x="40" y="70" width="320" height="190" rx="4" fill="#0F192B" stroke="#94A3B8" stroke-width="4"/><polyline points="70,220 120,190 160,200 210,140 250,160 300,100 330,110" fill="none" stroke="#10B981" stroke-width="6"/><rect x="70" y="92" width="90" height="12" fill="#F59E0B"/><rect x="150" y="262" width="100" height="18" fill="#94A3B8"/><text x="200" y="298" text-anchor="middle" font-family="Consolas, monospace" font-size="18" font-weight="700" fill="#94A3B8" letter-spacing="4">PRODUCT IMAGE</text></svg>`;
  function productPanel(data) {
    const el = h('div', 'bf-prod');
    const pic = h('div', 'pic');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.innerHTML = DEVICE_SVG;
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? badge(data.price, data.priceSmall || '', 'fill amber', 'right:40px;bottom:30px;font-size:44px;') : null;
    if (price) el.appendChild(price);
    return { el, pic, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'bf-zone');
    headBlock(el, A, data, 76, `EXHIBIT · ${kind.toUpperCase()}`, 'FN·08');
    const dark = kind !== 'doc';
    const hdrR = kind === 'code' || kind === 'terminal' ? '<span class="live">● CONNECTED</span>' : (kind === 'doc' ? 'CONFIDENTIAL · P.01' : '<span class="live">● REC</span>');
    const scr = panel(`bf-scr${dark ? '' : ' doc'}`, null, `${kind === 'doc' ? 'DOC' : 'TERM'} 01 · ${esc(data.file || kind.toUpperCase())}`, hdrR);
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); scr.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'bf-media'); media.src = data.src; scr.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'bf-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; scr.appendChild(media); }
    else { codeEl = h('div', 'bf-code'); scr.appendChild(codeEl); }
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 282 + 620 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      return h('div', 'bf-callout', `left:${px.toFixed(0)}px;top:${(py - 22).toFixed(0)}px;`, `<div class="dt"></div><div class="ln"></div><span>${esc(nt.text)}</span>`);
    });
    const tag = h('div', 'bf-chip', 'left:1150px;top:196px;color:var(--bf-amber2);', `<i></i>${esc(kind.toUpperCase())}`);
    el.append(scr, ...notes, tag);
    A.add(scr, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(scr, 0.3, 0.5, { y: 80, o: 0, s: 0.97 }, { y: 0, o: 1, s: 1 }, 'quart');
    A.add(tag, 0.8, 0.35, { x: 30, o: 0 }, { x: 0, o: 1 }, 'quart');
    const tType0 = 0.9, tType1 = Math.max(tType0 + 0.6, D * 0.58);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 1.0 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => A.add(p, tN0 + i * nStep, 0.4, { x: 40, o: 0 }, { x: 0, o: 1 }, 'quart'));
    if (prod) {
      A.add(prod.pic, 0.75, 0.5, { s: 0.9, o: 0 }, { s: 1, o: 1 }, 'quart');
      prod.rows.forEach((r, i) => A.add(r, 1.0 + i * 0.25, 0.35, { x: 40, o: 0 }, { x: 0, o: 1 }, 'quart'));
      if (prod.price) badgeIn(A, prod.price, Math.min(D - 1.2, 1.3 + prod.rows.length * 0.25 + 0.3));
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
        if (!cur && Math.floor(t * 2.2) % 2 === 0) html += `<span class="ln">  </span><span class="k">$ </span><span class="cur">_</span>`;
        codeEl.innerHTML = html;
      }
      if (media && media.tagName === 'VIDEO' && media.readyState >= 1 && media.duration) {
        const want = Math.max(0, t - 0.3) % media.duration;
        if (media.paused && Math.abs(media.currentTime - want) > 0.08) { try { media.currentTime = want; } catch (_) {} }
      }
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), media,
      cams: [CAM(0, 700, 580, 0.95, 1.5, -1.5, 0), CAM(1.2, 700, 508, 1.0, 1, -1.5, 0), CAM(D, 710, 512, 1.02, 1, 1.2, 0)] };
  }

  // ============================== 7. quote 全屏人像 + 分析师批注卡（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'bf-screen-wrap', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const side = right ? 'right:70px;' : 'left:70px;';
    const card = h('div', 'bf-q', side, `<div class="bf-ph"><span>ANALYST NOTE · ${esc(data.kicker || 'QUOTE')}</span><span class="r">★★★★★</span></div><div class="t">${mark(data.text)}</div><div class="sp">${PROPS.spark(420, 60, 88, 1, 'var(--bf-amber)', 28)}</div><div class="by">${esc(data.by || '')}</div>`);
    const st = badge(data.stamp || 'AAA', data.stampSmall || '', 'fill amber', `${right ? 'right:120px;' : 'left:470px;'}top:${data.stampTop || 690}px;font-size:54px;`);
    el.append(card, st);
    const dir = right ? 1 : -1;
    A.add(card, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(card, 0.45, 0.55, { x: dir * 120, o: 0 }, { x: 0, o: 1 }, 'quart');
    const sp = card.querySelector('.sp');
    A.fn((t) => reveal(sp, t, 0.9, 1.2));
    badgeIn(A, st, Math.min(D - 1.0, D * 0.42));
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 8. outro 行动指令单 + 交易按钮 CTA ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'bf-zone');
    headBlock(el, A, data, 84, 'ORDER TICKET · NEXT ACTIONS', 'FN·10');
    const tagBg = [['var(--bf-up)', '#06130D'], ['var(--bf-amber)', '#0B1220'], ['#38BDF8', '#0B1220']];
    const acts = (data.actions || []).slice(0, 3).map((a, i) => panel('bf-act', `top:${290 + i * 176}px;`, null, null,
      `<div class="tg" style="background:${tagBg[i][0]};color:${tagBg[i][1]}">${esc(a.tag || 'ACTION')}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div><div class="no">${String(i + 1).padStart(2, '0')}</div>`));
    const c = data.cta || {};
    const btnSt = [['var(--bf-up)', '#06130D'], ['var(--bf-amber)', '#0B1220'], ['#0A1222', 'var(--bf-silver)']];
    const cta = panel('bf-cta', null, esc(c.kicker || 'OPEN SOURCE'), '<span class="live">● MARKET OPEN</span>',
      `<div class="in"><div class="t">${esc(c.title || '')}</div><div class="repo">${esc(c.repo || '')}</div><div class="btns">${(c.buttons || []).slice(0, 3).map((b, i) => `<span style="background:${btnSt[i][0]};color:${btnSt[i][1]};border-color:${i === 2 ? 'var(--bf-steel)' : btnSt[i][0]}">${esc(b)}</span>`).join('')}</div></div>`);
    const go = badge(c.stamp || 'GO', c.stampSmall || '', 'fill', 'left:1080px;top:650px;font-size:60px;min-width:220px;');
    el.append(...acts, cta, go);
    const t0 = 0.7, stp = Math.min(0.5, (D * 0.3) / Math.max(1, acts.length));
    acts.forEach((a, i) => { A.add(a, -1, 0.01, { o: 0 }, { o: 0 }); A.add(a, t0 + i * stp, 0.45, { x: -60, o: 0 }, { x: 0, o: 1 }, 'quart'); });
    const tC = t0 + acts.length * stp + 0.05;
    A.add(cta, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(cta, tC, 0.5, { y: 60, o: 0 }, { y: 0, o: 1 }, 'quart');
    const btns = Array.from(cta.querySelectorAll('.btns span'));
    const tP = tC + 0.8;
    A.fn((t) => btns.forEach((b, i) => {
      const p = clamp01((t - (tP + i * 0.35)) / 0.3), k = p <= 0 || p >= 1 ? 0 : (p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6);
      b.style.transform = `scale(${(1 - 0.06 * k).toFixed(3)})`;
      b.style.filter = `brightness(${(1 + 0.5 * k).toFixed(2)})`;
    }));
    badgeIn(A, go, Math.min(D - 0.9, tP + btns.length * 0.35 + 0.2));
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1, -2.5, 0), CAM(1.2, 700, 505, 1.0, 0.5, -0.8, 0), CAM(D, 700, 500, 0.98, 0, 0.8, 0)] };
  }

  // ============================== 9. timeline 走势图时间轴 ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 240, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 300;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'bf-zone', `width:${W}px;`);
    headBlock(el, A, data, 84, `PRICE HISTORY · ${n} PERIODS`, 'FN·06');
    el.querySelector('.bf-rule').style.width = `${W - 120}px`;
    const axis = h('div', 'bf-tl-axis', `width:${W - 120}px;`);
    // 背景上升走势面积图（贯穿各节点）
    const CW = W - 120, CH = 520, R = rng(606);
    const pts = []; const NP = 60;
    for (let k = 0; k < NP; k++) { const u = k / (NP - 1); pts.push([u * CW, CH * (0.86 - 0.72 * Math.pow(u, 1.3)) + (R() - 0.5) * 34]); }
    const line = pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
    const chart = h('div', 'bf-tl-chart', null, `<svg width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" style="display:block;overflow:visible"><defs><linearGradient id="bftlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F59E0B" stop-opacity=".22"/><stop offset="1" stop-color="#F59E0B" stop-opacity="0"/></linearGradient></defs><polygon points="0,${CH} ${line} ${CW},${CH}" fill="url(#bftlg)"/><polyline points="${line}" fill="none" stroke="#F59E0B" stroke-opacity=".75" stroke-width="3"/></svg>`);
    el.append(chart, axis);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.2), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 296 : 640, at = t0 + i * stp, isNow = i === now;
      const chg = i === 0 ? '—' : `▲ +${(i * 12.5 + 8).toFixed(1)}%`;
      const card = h('div', `bf-panel bf-tl-node${isNow ? ' now' : ''}`, `left:${x}px;top:${top}px;`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="chg ${i === 0 ? '' : 'bf-up'}" style="${i === 0 ? 'color:var(--bf-mute)' : ''}">${chg}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', 'bf-tl-stem', `left:${x + 40}px;top:${up ? 492 : 566}px;height:${up ? 56 : 74}px;`);
      const dot = h('div', `bf-tl-dot${isNow ? ' now' : ''}`, `left:${x + 31}px;top:548px;`);
      el.append(stem, dot, card);
      A.add(dot, at - 0.1, 0.3, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
      A.add(stem, at, 0.2, { o: 0 }, { o: 1 });
      A.add(card, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(card, at + 0.05, 0.4, { y: up ? -40 : 40, o: 0 }, { y: 0, o: 1 }, 'quart');
      return { x, up, top, at };
    });
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = badge(data.nowLabel, data.nowSmall || '', 'fill amber', `left:${Math.min(W - 300, p.x + (p.up ? 0 : 60))}px;top:${p.up ? 600 : 860}px;font-size:34px;`);
      el.appendChild(ns);
      badgeIn(A, ns, Math.min(D - 0.9, p.at + 0.7));
    }
    A.add(axis, 0.4, 0.7, { sx: 0 }, { sx: 1 }, 'quart');
    A.fn((t) => reveal(chart, t, 0.5, Math.max(1, tEnd - 0.2)));
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 530, 1.08, 1.5, -2.5, -0.4), CAM(0.9, 700, 512, 1.0, 1, -1, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 512, 1.0, 0.5, 1, 0), CAM(D, endX + 8, 510, 1.02, 0.3, 1, 0.2)] };
  }

  // ============================== 10. diagram 资金流向图（终端节点 + 钢蓝连线 + 琥珀脉冲） ==============================
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
  function linkGeom(a, b, NW, NH) {
    const ax = a.x + NW / 2, ay = a.y + NH / 2, bx = b.x + NW / 2, by = b.y + NH / 2, dx = bx - ax, dy = by - ay;
    let p0, p1, c1, c2;
    if (Math.abs(dx) * NH >= Math.abs(dy) * NW) {
      const sx = Math.sign(dx) || 1; p0 = { x: ax + sx * NW / 2, y: ay }; p1 = { x: bx - sx * (NW / 2 + 14), y: by };
      const mx = (p0.x + p1.x) / 2; c1 = { x: mx, y: p0.y }; c2 = { x: mx, y: p1.y };
    } else {
      const sy = Math.sign(dy) || 1; p0 = { x: ax, y: ay + sy * NH / 2 }; p1 = { x: bx, y: by - sy * (NH / 2 + 14) };
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
    const L = 60, T = 296, AW = 1280, AH = 604, NW = 260, NH = 124;
    const el = h('div', 'bf-zone');
    headBlock(el, A, data, 84, 'FLOW MAP · NODES / LINKS', 'FN·07');
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = panel('bf-dg-node', `left:${x}px;top:${y}px;`, `NODE ${String(i + 1).padStart(2, '0')}`, '<span class="live">●</span>', `<div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      el.appendChild(e);
      A.add(e, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(e, appear[nd.id], 0.4, { s: 0.86, o: 0 }, { s: 1, o: 1 }, 'quart');
      return e;
    });
    const mid = `bfdg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="16" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill="#94A3B8"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="#64748B" stroke-width="3" fill="none" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}"/>`;
      inner += `<rect class="pl" data-j="${j}" data-k="0" x="-6" y="-6" width="12" height="12" fill="#F59E0B" opacity="0"/><rect class="pl" data-j="${j}" data-k="1" x="-5" y="-5" width="10" height="10" fill="#10B981" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bf-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'bf-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'bf-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, tDraw[j] + 0.4, 0.3, { s: 0.6, o: 0 }, { s: 1, o: 1 }, 'quart');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = badge(data.focusLabel, data.focusSmall || '', 'fill amber', `left:${Math.min(1140, p.x + 150)}px;top:${p.y - 96}px;font-size:30px;`);
      el.appendChild(st);
      badgeIn(A, st, tF + 0.25);
    }
    A.fn((t) => {
      lnEls.forEach((p) => { const j = +p.dataset.j, g = geo[j], q = clamp01((t - tDraw[j]) / 0.45); p.setAttribute('stroke-dashoffset', (g.len * (1 - EASE.inOut(q))).toFixed(1)); p.setAttribute('marker-end', q >= 0.97 ? `url(#${mid})` : 'none'); p.style.opacity = q > 0 ? '1' : '0'; });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.55;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.55 + (+r.dataset.k) * 0.5) % 1);
        r.setAttribute('opacity', '1'); r.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 570, 1.12, 1.5, -2.5, -0.4), CAM(1.2, 700, 518, 1.0, 1, -1, 0), CAM(D, 708, 512, 1.02, 0.5, 1, 0.2)] };
  }

  global.BloombergFin = {
    version: '1.0.0',
    PROPS, Animator, EASE, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, stat: { create: stat }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, timeline: { create: timeline }, diagram: { create: diagram },
      showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro }
    }
  };
})(window);
