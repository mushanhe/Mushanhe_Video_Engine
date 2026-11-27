/**
 * Mushanhe Video Engine — 风格包 11 · Stage Glass 发布会流光玻璃风
 * ---------------------------------------------------------------------------
 * 与 02_swiss_print / 06_neobrutalism 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · stat · steps · checklist · compare · timeline · diagram · showcase[code|terminal|doc|image|video|product] · quote · outro
 *
 *   const comp = StageGlass.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（业务文案全部来自这里）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : { el, layer:'world'|'screen', avatar, cams:[{t,x,y,zoom,rx,ry,rz}], update(localT), w? }
 *
 * 局部坐标安全区：x 60–1340，y 100–980。宿主页把机位换算为 (x-60, y, zoom×0.92)。
 * 物理参数：#050507 纯黑舞台 · 1px 亮边液态毛玻璃 Bento（backdrop-filter blur 28px + 顶部高光边）·
 *          钛金属渐变超大标题 · 极光渐变（蓝 #60A5FA → 紫 #A78BFA → 青 #22D3EE）点睛 · 28px 圆角 · 柔和缓动 + 景深模糊入场。
 */
(function (global) {
  'use strict';

  // ============================== 工具 ==============================
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const EASE = {
    linear: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    /** 发布会式柔和减速（quint out） */
    soft: (x) => 1 - Math.pow(1 - x, 5),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    in: (x) => x * x * x,
    /** 极轻微回弹（只在缩放上用，克制） */
    back: (x) => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }

  /** 确定性补间：x/y/s/r/o/sx + b（景深模糊 px）。同一元素可挂多段，按时间取最后一段已开始的动画插值 */
  class Animator {
    constructor() { this.map = new Map(); this.fns = []; }
    add(el, at, d, from, to, ease = 'soft') {
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
  /** 标准发布会入场：上浮 + 景深模糊 → 清晰 */
  const rise = (A, el, at, d = 0.7, dy = 36, b = 14) => A.add(el, at, d, { y: dy, o: 0, b }, { y: 0, o: 1, b: 0 }, 'soft');
  /** 由远及近：轻微放大 + 模糊 → 清晰 */
  const focusIn = (A, el, at, d = 0.8, s0 = 0.94, b = 18) => A.add(el, at, d, { s: s0, o: 0, b }, { s: 1, o: 1, b: 0 }, 'soft');

  // ============================== 纯 SVG 道具 ==============================
  const PROPS = {
    /** 极光渐变对勾（描边由 stroke-dashoffset 驱动） */
    check(size = 44, stroke = 4.5, color = 'url(#kg-au-grad)') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" style="overflow:visible"><path class="kg-ck" d="M11 25 L20.5 34 L37 15" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="44" stroke-dashoffset="44"/></svg>`;
    },
    /** 圆环进度（描边） */
    ring(size = 120, stroke = 3) {
      const r = size / 2 - stroke * 2, c = 2 * Math.PI * r;
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(148,163,184,.18)" stroke-width="${stroke}" fill="none"/><circle class="kg-rg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="url(#kg-au-grad)" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})" data-c="${c.toFixed(1)}"/></svg>`;
    }
  };

  function kicker(text, style) { return h('div', 'kg-kicker', style, `<i></i><span>${esc(text)}</span>`); }
  /** 「这句**关键词**话」→ ** 包裹部分用极光渐变字 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }
  function head(text, style) { return h('div', 'kg-head kg-ti', style, mark(text)); }
  /** 发布会式徽章（替代印章）：极光描边药丸 + 大字 + 小字 */
  function badge(text, small, style) { return h('div', 'kg-badge', style, `<b class="kg-au">${esc(text)}</b>${small ? `<small>${esc(small)}</small>` : ''}`); }
  function pill(text, style, cls) { return h('div', `kg-pill${cls ? ' ' + cls : ''}`, style, esc(text)); }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .kg-zone{position:absolute;width:1400px;height:1100px;font-family:var(--kg-font);color:var(--kg-white);-webkit-font-smoothing:antialiased}
  .kg-zone *,.kg-screen *{box-sizing:border-box}
  .kg-ti{background:linear-gradient(180deg,#FFFFFF 0%,#EEF2F7 38%,#B4C0D0 78%,#8A98AD 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .kg-au,.kg-zone em,.kg-screen em{background:linear-gradient(90deg,var(--kg-accent) 0%,#A78BFA 52%,var(--kg-cyan) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-style:normal}
  .kg-glass{position:absolute;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.085) 0%,rgba(255,255,255,.03) 100%);border:1px solid rgba(255,255,255,.11);
    -webkit-backdrop-filter:blur(28px) saturate(160%);backdrop-filter:blur(28px) saturate(160%);box-shadow:0 30px 80px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.14)}
  .kg-glass::before{content:'';position:absolute;left:28px;right:28px;top:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);pointer-events:none}
  .kg-glass.hero{background:linear-gradient(180deg,rgba(96,165,250,.10) 0%,rgba(124,58,237,.06) 100%);box-shadow:0 30px 90px rgba(0,0,0,.5),0 0 70px rgba(96,165,250,.16),inset 0 1px 0 rgba(255,255,255,.18)}
  .kg-glass.hero::after,.kg-badge::after,.kg-pill.hero::after{content:'';position:absolute;inset:-1px;border-radius:inherit;padding:1px;pointer-events:none;
    background:linear-gradient(120deg,var(--kg-accent),#A78BFA 50%,var(--kg-cyan));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
  .kg-kicker{position:absolute;display:flex;align-items:center;gap:14px;font-family:var(--kg-font-latin);font-size:20px;font-weight:600;letter-spacing:.26em;color:var(--kg-silver);white-space:nowrap;text-transform:uppercase}
  .kg-kicker i{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--kg-accent),var(--kg-violet));box-shadow:0 0 14px var(--kg-accent)}
  .kg-head{position:absolute;font-weight:700;letter-spacing:-.03em;line-height:1.1;white-space:nowrap;padding-bottom:.06em}
  .kg-pill{position:absolute;padding:10px 24px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);
    color:#E2E8F0;font-size:22px;font-weight:600;letter-spacing:.02em;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
  .kg-pill.hero{border-color:transparent;background:rgba(96,165,250,.10);color:#fff}
  .kg-pill.mono{font-family:var(--kg-font-mono);font-size:20px;letter-spacing:.12em;color:var(--kg-silver)}
  .kg-badge{position:absolute;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 38px 18px;border-radius:999px;
    background:rgba(10,12,20,.55);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);box-shadow:0 0 60px rgba(96,165,250,.28),0 20px 50px rgba(0,0,0,.5);white-space:nowrap;line-height:1.05}
  .kg-badge b{font-weight:800;letter-spacing:-.01em}
  .kg-badge small{display:block;margin-top:6px;font-family:var(--kg-font-latin);font-size:15px;font-weight:600;letter-spacing:.32em;color:#CBD5E1}
  .kg-num-thin{font-family:var(--kg-font-latin);font-weight:200;letter-spacing:-.04em;line-height:1}
  .kg-glow-dot{position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(96,165,250,.25),0 0 22px 4px var(--kg-accent)}

  /* cover */
  .kg-cover-title{position:absolute;left:52px;top:168px;font-size:156px;font-weight:700;letter-spacing:-.045em;line-height:1.06;white-space:nowrap}
  .kg-cover-title span{display:inline-block;padding-bottom:.08em}
  .kg-cover-sub{position:absolute;left:62px;top:540px;font-size:40px;font-weight:500;line-height:1.42;color:#CBD5E1;white-space:nowrap}
  .kg-cover-ch{left:62px;top:700px;width:300px;height:236px;padding:26px 30px}
  .kg-cover-ch .l{font-family:var(--kg-font-latin);font-size:17px;font-weight:600;letter-spacing:.3em;color:var(--kg-silver)}
  .kg-cover-ch .n{position:absolute;left:24px;bottom:16px;font-size:150px}
  .kg-orb{position:absolute;left:880px;top:300px;width:400px;height:400px;border-radius:50%;
    background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.55) 0%,rgba(255,255,255,.10) 18%,rgba(255,255,255,0) 40%),radial-gradient(circle at 70% 78%,rgba(34,211,238,.35) 0%,rgba(124,58,237,.18) 38%,rgba(37,99,235,.06) 62%,rgba(5,5,7,0) 72%),rgba(255,255,255,.03);
    border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(16px) saturate(170%);backdrop-filter:blur(16px) saturate(170%);
    box-shadow:inset 0 0 60px rgba(96,165,250,.20),inset -20px -30px 80px rgba(124,58,237,.25),0 40px 120px rgba(37,99,235,.25)}
  .kg-orb-shadow{position:absolute;left:930px;top:760px;width:300px;height:40px;border-radius:50%;background:radial-gradient(ellipse,rgba(96,165,250,.30),rgba(5,5,7,0) 70%);filter:blur(6px)}

  /* stat */
  .kg-stat{top:320px;height:410px;padding:34px 40px 0;overflow:hidden}
  .kg-stat .lb{font-size:24px;font-weight:600;color:var(--kg-silver);letter-spacing:.04em;white-space:nowrap}
  .kg-stat .num{display:inline-block;margin-top:26px;font-family:var(--kg-font-latin);font-weight:700;letter-spacing:-.05em;line-height:1;white-space:nowrap;padding-bottom:.05em}
  .kg-stat .num b{font-weight:700}
  .kg-stat.dim .num{background:linear-gradient(180deg,#E2E8F0,#64748B);-webkit-background-clip:text;background-clip:text;color:transparent}
  .kg-stat .num .u,.kg-stat .num .pf{font-family:var(--kg-font);font-size:.22em;font-weight:600;letter-spacing:0;margin-left:.2em;vertical-align:.25em;color:var(--kg-silver);-webkit-text-fill-color:var(--kg-silver)}
  .kg-stat .num .pf{margin:0 .12em 0 0}
  .kg-stat .bar{position:absolute;left:40px;right:110px;bottom:56px;height:6px;border-radius:6px;background:rgba(148,163,184,.16);overflow:hidden}
  .kg-stat .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(90deg,#64748B,#CBD5E1);transform-origin:left center}
  .kg-stat.hot .bar i{background:linear-gradient(90deg,var(--kg-accent),#A78BFA,var(--kg-cyan));box-shadow:0 0 16px var(--kg-accent)}
  .kg-stat .sc{position:absolute;right:40px;bottom:44px;font-family:var(--kg-font-latin);font-size:22px;font-weight:600;color:var(--kg-silver)}
  .kg-note{position:absolute;display:flex;align-items:center;gap:14px;font-size:26px;font-weight:500;color:#CBD5E1;white-space:nowrap}
  .kg-note i{width:8px;height:8px;border-radius:50%;background:var(--kg-silver)}

  /* steps */
  .kg-tile{top:320px;height:380px;padding:30px 28px}
  .kg-tile .no{font-size:92px}
  .kg-tile .nm{position:absolute;left:28px;top:170px;font-size:54px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;color:#F8FAFC}
  .kg-tile .fn{position:absolute;left:24px;right:24px;bottom:26px;padding:10px 16px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);font-family:var(--kg-font-mono);font-size:19px;color:var(--kg-silver);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kg-track{position:absolute;height:2px;border-radius:2px;background:rgba(148,163,184,.18)}
  .kg-track i{position:absolute;left:0;top:-1px;height:4px;border-radius:4px;width:100%;background:linear-gradient(90deg,var(--kg-accent),#A78BFA,var(--kg-cyan));box-shadow:0 0 14px var(--kg-accent);transform-origin:left center}
  .kg-track-dot{position:absolute;width:14px;height:14px;margin:-6px 0 0 -7px;border-radius:50%;background:#0B0D14;border:2px solid rgba(148,163,184,.45)}
  .kg-track-dot.on{background:#fff;border-color:#fff;box-shadow:0 0 0 5px rgba(96,165,250,.22),0 0 22px 4px var(--kg-accent)}
  .kg-sbar{left:60px;top:800px;width:1280px;height:112px;display:flex;align-items:center;gap:26px;padding:0 34px;border-radius:24px}
  .kg-sbar .f{font-family:var(--kg-font-mono);font-size:24px;color:var(--kg-silver);white-space:nowrap}
  .kg-sbar .b{font-family:var(--kg-font-latin);font-size:46px;font-weight:700;letter-spacing:-.02em;white-space:nowrap}
  .kg-sbar .m{font-family:var(--kg-font-mono);font-size:15px;line-height:1.5;color:#64748B;white-space:nowrap}
  .kg-sbar .lbl{margin-left:auto;position:relative;padding:12px 26px;font-size:28px;display:flex;align-items:baseline;gap:14px}
  .kg-sbar .lbl small{font-family:var(--kg-font-latin);font-size:14px;letter-spacing:.28em;color:var(--kg-silver)}

  /* checklist */
  .kg-card{left:200px;top:110px;width:1000px;padding:0}
  .kg-card .hd{position:absolute;left:44px;top:34px}
  .kg-card .ttl{position:absolute;left:42px;top:74px;font-family:var(--kg-font-latin);font-size:88px;font-weight:700;letter-spacing:-.04em;line-height:1.05;white-space:nowrap;padding-bottom:.05em}
  .kg-card .sub{position:absolute;left:46px;top:186px;font-size:30px;font-weight:500;color:var(--kg-silver);white-space:nowrap}
  .kg-card .hr{position:absolute;left:44px;right:44px;top:250px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.28),rgba(255,255,255,.04))}
  .kg-row{position:absolute;left:30px;right:30px;height:84px;border-radius:18px}
  .kg-row .glow{position:absolute;inset:0;border-radius:18px;background:linear-gradient(90deg,rgba(96,165,250,.16),rgba(124,58,237,.06) 55%,rgba(5,5,7,0));transform-origin:left center}
  .kg-row .ci{position:absolute;left:16px;top:18px;width:48px;height:48px;border-radius:50%;border:1.5px solid rgba(148,163,184,.4);background:rgba(255,255,255,.03)}
  .kg-row .ci svg{position:absolute;left:1px;top:1px}
  .kg-row .k{position:absolute;left:90px;top:8px;font-size:38px;font-weight:700;color:#F8FAFC;white-space:nowrap}
  .kg-row .d{position:absolute;left:92px;top:54px;font-size:21px;font-weight:500;color:var(--kg-silver);white-space:nowrap}
  .kg-row .n{position:absolute;right:20px;top:26px;font-family:var(--kg-font-latin);font-size:22px;font-weight:500;color:#475569;letter-spacing:.1em}
  .kg-memo{position:absolute;right:40px;padding:18px 30px 20px;border-radius:22px;z-index:3}
  .kg-memo small{display:block;font-size:18px;font-weight:500;letter-spacing:.08em;color:var(--kg-silver);margin-bottom:6px}
  .kg-memo div{font-size:38px;font-weight:700;white-space:nowrap}
  .kg-coin{position:absolute;width:132px;height:132px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(10,12,20,.55);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);box-shadow:0 0 50px rgba(96,165,250,.25)}
  .kg-coin svg{position:absolute;left:0;top:0}
  .kg-coin b{font-family:var(--kg-font-latin);font-size:34px;font-weight:700;letter-spacing:-.02em}

  /* compare */
  .kg-cmp{top:318px;width:560px;height:430px;padding:30px 34px}
  .kg-cmp .band{font-size:22px;font-weight:600;letter-spacing:.08em;white-space:nowrap}
  .kg-cmp.wrong{background:rgba(255,255,255,.025);border-color:rgba(255,255,255,.07);box-shadow:0 30px 80px rgba(0,0,0,.5)}
  .kg-cmp.wrong .band{color:#F87171}
  .kg-cmp.right .band{color:var(--kg-cyan)}
  .kg-cmp .t{position:absolute;left:34px;top:84px;font-size:56px;font-weight:700;letter-spacing:-.02em;line-height:1.18;white-space:nowrap;padding-bottom:.05em}
  .kg-cmp.wrong .t{color:#64748B}
  .kg-cmp .d{position:absolute;left:34px;right:34px;top:256px;font-size:25px;font-weight:500;line-height:1.55;color:#CBD5E1}
  .kg-cmp.wrong .d{color:#8391A7}
  .kg-cmp svg.strike{position:absolute;left:26px;top:84px;overflow:visible}
  .kg-cmp .ok{position:absolute;right:28px;top:24px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--kg-accent),var(--kg-violet));box-shadow:0 0 30px rgba(96,165,250,.55);display:flex;align-items:center;justify-content:center}
  .kg-cmp .xs{position:absolute;left:34px;bottom:30px;padding:8px 20px;border-radius:999px;border:1px solid rgba(248,113,113,.45);color:#F87171;font-size:22px;font-weight:600;background:rgba(248,113,113,.06);white-space:nowrap}
  .kg-vs{position:absolute;left:648px;top:482px;width:104px;height:104px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--kg-font-latin);font-size:30px;font-weight:300;letter-spacing:.06em;color:#CBD5E1}
  .kg-verdict{left:60px;top:800px;width:1280px;height:112px;display:flex;align-items:center;gap:30px;padding:0 36px;border-radius:24px}
  .kg-verdict b{font-family:var(--kg-font-latin);font-size:17px;font-weight:600;letter-spacing:.32em;color:var(--kg-silver);white-space:nowrap}
  .kg-verdict span{font-size:44px;font-weight:700;color:#F8FAFC;white-space:nowrap}

  /* timeline */
  .kg-tl-node{width:230px;height:196px;padding:22px 24px;border-radius:24px}
  .kg-tl-node .tm{font-family:var(--kg-font-latin);font-size:38px;font-weight:700;letter-spacing:-.02em;line-height:1.1;white-space:nowrap;padding-bottom:.05em}
  .kg-tl-node .t{font-size:31px;font-weight:700;margin-top:14px;white-space:nowrap;color:#F8FAFC}
  .kg-tl-node .d{font-size:19px;font-weight:500;margin-top:8px;line-height:1.4;color:var(--kg-silver);white-space:nowrap}
  .kg-tl-stem{position:absolute;width:1px;background:linear-gradient(180deg,rgba(148,163,184,.0),rgba(148,163,184,.55))}
  .kg-tl-stem.dn{background:linear-gradient(0deg,rgba(148,163,184,.0),rgba(148,163,184,.55))}
  .kg-pulse{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:1.5px solid var(--kg-accent)}

  /* diagram */
  .kg-dg-node{width:250px;height:116px;padding:20px 24px;border-radius:22px;z-index:3}
  .kg-dg-node .l{display:flex;align-items:center;gap:12px;font-size:34px;font-weight:700;white-space:nowrap;color:#F8FAFC}
  .kg-dg-node .l i{width:10px;height:10px;border-radius:50%;flex:none}
  .kg-dg-node .s{margin-top:6px;font-family:var(--kg-font-mono);font-size:17px;color:var(--kg-silver);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kg-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .kg-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .kg-dg-tag{padding:5px 16px;border-radius:999px;background:rgba(10,12,20,.72);border:1px solid rgba(255,255,255,.14);font-family:var(--kg-font-mono);font-size:16px;color:#CBD5E1;white-space:nowrap}

  /* showcase */
  .kg-panel{left:60px;top:270px;width:1240px;height:640px;overflow:hidden;border-radius:26px}
  .kg-panel .bar{position:relative;height:52px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-family:var(--kg-font-mono);font-size:17px;letter-spacing:.08em;color:var(--kg-silver)}
  .kg-panel .bar .dots{position:absolute;left:22px;top:20px;display:flex;gap:9px}
  .kg-panel .bar .dots i{width:12px;height:12px;border-radius:50%;background:rgba(148,163,184,.35)}
  .kg-code{padding:30px 38px;font-family:var(--kg-font-mono);font-size:32px;font-weight:500;line-height:1.66;white-space:pre;color:#E2E8F0}
  .kg-code .ln{display:inline-block;width:56px;color:#334155}
  .kg-code .c{color:#64748B}.kg-code .k{color:var(--kg-accent)}.kg-code .ok{color:var(--kg-cyan)}
  .kg-code .cur{display:inline-block;width:.55em;height:1.1em;vertical-align:-.18em;background:var(--kg-accent);box-shadow:0 0 12px var(--kg-accent);color:transparent}
  .kg-panel.doc .kg-code{font-family:var(--kg-font);font-size:33px;font-weight:600;color:#F1F5F9}
  .kg-media{position:absolute;left:0;right:0;top:52px;width:100%;height:calc(100% - 52px);object-fit:cover;background:#000}
  .kg-callout{position:absolute;display:flex;align-items:center;z-index:6}
  .kg-callout .dot{width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(96,165,250,.3),0 0 18px 3px var(--kg-accent);flex:none}
  .kg-callout .ln{width:46px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.8),rgba(255,255,255,.25));flex:none;transform-origin:left center}
  .kg-callout .tx{position:relative;padding:10px 22px;border-radius:999px;background:rgba(12,14,22,.72);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);font-size:24px;font-weight:600;color:#fff;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.4)}
  .kg-prod{position:absolute;left:0;right:0;top:52px;bottom:0}
  .kg-prod .pic{position:absolute;left:34px;top:34px;bottom:34px;width:480px;border-radius:22px;background:radial-gradient(circle at 50% 42%,rgba(96,165,250,.20),rgba(124,58,237,.08) 45%,rgba(5,5,7,0) 72%),rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;overflow:hidden}
  .kg-prod .pic img{width:100%;height:100%;object-fit:contain}
  .kg-prod .pic svg{width:78%;height:auto}
  .kg-prod .info{position:absolute;left:566px;right:44px;top:40px}
  .kg-prod .nm{font-size:54px;font-weight:700;letter-spacing:-.02em;line-height:1.1;white-space:nowrap;padding-bottom:.05em}
  .kg-prod .tg{display:inline-block;margin-top:12px;font-size:24px;font-weight:600;white-space:nowrap}
  .kg-prod .specs{margin-top:22px;border-top:1px solid rgba(255,255,255,.14)}
  .kg-prod .row{display:flex;justify-content:space-between;gap:20px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap}
  .kg-prod .row .k{font-size:20px;font-weight:500;color:var(--kg-silver)}
  .kg-prod .row .v{font-size:26px;font-weight:600;color:#F8FAFC}

  /* quote（屏幕层） */
  .kg-screen{font-family:var(--kg-font);color:var(--kg-white);-webkit-font-smoothing:antialiased}
  .kg-q{position:absolute;top:170px;width:fit-content;min-width:520px;max-width:780px;padding:46px 56px 50px;border-radius:34px;background:linear-gradient(180deg,rgba(14,16,26,.62),rgba(8,9,14,.55))}
  .kg-q .t{font-size:80px;font-weight:700;letter-spacing:-.03em;line-height:1.24;margin-top:26px;white-space:nowrap;padding-bottom:.05em}
  .kg-q .ft{display:flex;align-items:center;gap:26px;margin-top:34px}
  .kg-q .by{font-size:24px;font-weight:500;color:var(--kg-silver);letter-spacing:.04em;white-space:nowrap}
  .kg-q .kg-badge{position:relative;padding:12px 30px 14px}
  .kg-q .kg-kicker{position:relative}
  .kg-qmark{position:absolute;font-family:var(--kg-font-latin);font-size:260px;font-weight:200;line-height:1;color:rgba(148,163,184,.14);pointer-events:none}

  /* outro */
  .kg-act{left:60px;width:590px;height:150px;padding:22px 30px;border-radius:24px}
  .kg-act .tg{display:inline-block;padding:3px 14px;border-radius:999px;border:1px solid rgba(96,165,250,.45);font-family:var(--kg-font-latin);font-size:14px;font-weight:600;letter-spacing:.22em;color:var(--kg-accent)}
  .kg-act .t{font-size:38px;font-weight:700;line-height:1.2;margin-top:10px;white-space:nowrap;color:#F8FAFC}
  .kg-act .d{font-family:var(--kg-font-mono);font-size:18px;color:var(--kg-silver);margin-top:4px;white-space:nowrap}
  .kg-act .no{position:absolute;right:30px;top:30px;font-size:84px;color:rgba(148,163,184,.30)}
  .kg-cta{left:700px;top:290px;width:640px;height:400px;padding:40px 44px;border-radius:30px}
  .kg-cta .t{font-size:68px;font-weight:700;letter-spacing:-.03em;margin-top:22px;line-height:1.1;white-space:nowrap;padding-bottom:.05em}
  .kg-cta .repo{margin-top:26px;padding:14px 20px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);font-family:var(--kg-font-mono);font-size:23px;color:#CBD5E1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kg-cta .btns{display:flex;gap:16px;margin-top:36px}
  .kg-cta .btns span{flex:1;text-align:center;padding:16px 0;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#F8FAFC;font-size:30px;font-weight:600;white-space:nowrap}
  .kg-cta .btns span.pri{border-color:transparent;background:linear-gradient(120deg,#3B82F6,#7C3AED);box-shadow:0 10px 40px rgba(59,130,246,.45)}
  .kg-go{position:absolute;width:150px;height:150px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:8;
    background:linear-gradient(140deg,#3B82F6,#7C3AED 60%,#06B6D4);box-shadow:0 0 70px rgba(96,165,250,.5),inset 0 1px 0 rgba(255,255,255,.5)}
  .kg-go b{font-family:var(--kg-font-latin);font-size:50px;font-weight:800;letter-spacing:-.02em;color:#fff;line-height:1}
  .kg-go small{font-size:16px;font-weight:600;color:rgba(255,255,255,.85);margin-top:6px;letter-spacing:.08em;white-space:nowrap}
  `;
  const DEFS = `<svg id="kg-defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
    <linearGradient id="kg-au-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60A5FA"/><stop offset=".55" stop-color="#A78BFA"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
    <linearGradient id="kg-ti-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#94A3B8"/></linearGradient></defs></svg>`;
  function injectCSS() {
    if (document.getElementById('kg-components-css')) return;
    const st = document.createElement('style'); st.id = 'kg-components-css'; st.textContent = CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.innerHTML = DEFS; document.body.appendChild(d.firstChild);
  }

  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  const glass = (cls, style, html) => h('div', `kg-glass ${cls || ''}`, style, html);

  // ============================== 1. cover 钛金属超大标题 + 液态玻璃球 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'kg-zone');
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const title = h('div', 'kg-cover-title');
    const chars = [];
    String(data.title || '').split('').forEach((c) => {
      if (c === '\n') { title.appendChild(document.createElement('br')); return; }
      const s = h('span', 'kg-ti', null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); chars.push(s);
    });
    const sub = h('div', 'kg-cover-sub', null, mark(data.subtitle));
    const ch = glass('kg-cover-ch', null, `<div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="n kg-num-thin kg-ti">${esc(data.chapter || '01')}</div>`);
    const dm = pill(data.dim || '', 'left:402px;top:726px;');
    const orbSh = h('div', 'kg-orb-shadow');
    const orb = h('div', 'kg-orb');
    const bd = data.stamp ? badge(data.stamp, data.stampSmall || '', 'left:402px;top:810px;font-size:44px;') : null;
    el.append(orbSh, orb, kick, title, sub, ch, dm);
    if (bd) el.appendChild(bd);
    rise(A, kick, 0.1, 0.6, 16, 8);
    chars.forEach((c, i) => A.add(c, 0.3 + i * 0.07, 0.9, { y: 60, o: 0, b: 22 }, { y: 0, o: 1, b: 0 }, 'soft'));
    const tB = 0.5 + chars.length * 0.07;
    rise(A, sub, tB + 0.1, 0.8, 30, 12);
    focusIn(A, orb, 0.6, 1.4, 0.82, 30);
    A.add(orbSh, 0.9, 1.2, { o: 0, sx: 0.5 }, { o: 1, sx: 1 });
    rise(A, ch, tB + 0.4, 0.8, 40, 14);
    rise(A, dm, tB + 0.6, 0.7, 24, 10);
    if (bd) focusIn(A, bd, Math.min(D - 1.4, tB + 1.1), 0.8, 0.9, 16);
    // 玻璃球缓慢悬浮（确定性）
    A.fn((t) => { if (t > 2.0) orb.style.transform = `translate(0px, ${(Math.sin((t - 2.0) * 1.1) * 10).toFixed(1)}px)`; });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.12, 0, -1.2, 0), CAM(2.0, 700, 505, 1.0, 0, -0.4, 0), CAM(D, 706, 502, 1.03, 0, 0.5, 0)] };
  }

  // ============================== 2. stat 大数字 + 极光进度 ==============================
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
    const el = h('div', 'kg-zone');
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const hd = head(data.title, 'left:58px;top:160px;font-size:88px;');
    const gap = 40, w = (1280 - gap * (n - 1)) / n, fs = n === 1 ? 240 : n === 2 ? 180 : 130;
    const cards = items.map((it, i) => glass(`kg-stat${i === n - 1 ? ' hot hero' : ' dim'}`, `left:${60 + i * (w + gap)}px;width:${w}px;`,
      `<div class="lb">${esc(it.label || '')}</div><div class="num${i === n - 1 ? ' kg-au' : ''}" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="bar"><i style="width:${(clamp01(it.bar != null ? it.bar : 1) * 100).toFixed(1)}%"></i></div><div class="sc">${it.bar != null ? `${Math.round(clamp01(it.bar) * 100)}%` : ''}</div>`));
    const nums = cards.map((c) => c.querySelector('.num'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const bd = data.delta ? badge(data.delta, data.deltaSmall || '', 'left:930px;top:772px;font-size:50px;') : null;
    const note = data.note ? h('div', 'kg-note', 'left:66px;top:800px;', `<i></i>${esc(data.note)}`) : null;
    el.append(kick, hd, ...cards);
    if (note) el.appendChild(note);
    if (bd) el.appendChild(bd);
    rise(A, kick, 0.1, 0.6, 16, 8);
    rise(A, hd, 0.25, 0.8, 40, 16);
    const tIn = cards.map((_, i) => 0.7 + i * 0.45);
    cards.forEach((c, i) => {
      rise(A, c, tIn[i], 0.9, 60, 20);
      A.add(c.querySelector('.bar i'), tIn[i] + 0.9, 1.0, { sx: 0 }, { sx: 1 }, 'soft');
    });
    if (note) rise(A, note, Math.min(D - 2.6, tIn[n - 1] + 1.4), 0.7, 16, 8);
    if (bd) focusIn(A, bd, Math.min(D - 1.5, tIn[n - 1] + 2.0), 0.8, 0.88, 16);
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) { fitNums(nums, finals, w - 90); fitted = true; }
      items.forEach((it, i) => { nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * EASE.soft(clamp01((t - tIn[i] - 0.2) / 1.6)), decs[i]); });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.1, 0, -1.2, 0), CAM(1.4, 700, 508, 1.0, 0, -0.4, 0), CAM(D, 706, 505, 1.03, 0, 0.5, 0)] };
  }

  // ============================== 3. steps Bento 步骤磁贴 + 极光进度轨 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'kg-zone');
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const hd = head(data.title, 'left:58px;top:160px;font-size:88px;');
    const tag = pill(data.dim || `${n} STEPS`, 'right:60px;top:186px;', 'mono');
    const GAP = 36, cw = (1280 - GAP * (n - 1)) / n;
    const tiles = items.map((it, i) => glass('kg-tile', `left:${60 + i * (cw + GAP)}px;width:${cw}px;`,
      `<div class="no kg-num-thin kg-ti">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div>`));
    const TY = 752;
    const track = h('div', 'kg-track', `left:${60 + cw / 2}px;top:${TY}px;width:${(n - 1) * (cw + GAP)}px;`, '<i></i>');
    const dots = items.map((_, i) => h('div', 'kg-track-dot', `left:${60 + cw / 2 + i * (cw + GAP)}px;top:${TY}px;`));
    const bar = glass('kg-sbar', null,
      `<div class="f">${esc(data.folder || 'PROJECT /')}</div><div class="b kg-ti">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>${data.label ? `<div class="kg-pill hero lbl"><span>${esc(data.label)}</span>${data.labelSmall ? `<small>${esc(data.labelSmall)}</small>` : ''}</div>` : ''}`);
    el.append(kick, hd, tag, track, ...dots, ...tiles, bar);
    rise(A, kick, 0.1, 0.6, 16, 8);
    rise(A, hd, 0.25, 0.8, 40, 16);
    rise(A, tag, 0.6, 0.6, 16, 8);
    const t0 = 1.0, t1 = Math.min(Math.max(t0 + 0.5, D - 2.6), t0 + 0.75 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    tiles.forEach((c, i) => rise(A, c, t0 + i * stp, 0.9, 70, 22));
    dots.forEach((d, i) => A.add(d, t0 + i * stp + 0.2, 0.5, { o: 0, s: 0.4 }, { o: 1, s: 1 }));
    A.add(track, t0, 0.4, { o: 0 }, { o: 1 });
    A.add(track.querySelector('i'), t0 + 0.2, Math.max(0.6, t1 - t0 + 0.2), { sx: 0 }, { sx: 1 }, 'inOut');
    rise(A, bar, Math.min(D - 2.4, t0 + 1.0), 0.9, 40, 16);
    A.fn((t) => dots.forEach((d, i) => d.classList.toggle('on', t >= t0 + i * stp + 0.35)));
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 560, 1.1, 0, -1.2, 0), CAM(1.4, 700, 512, 1.0, 0, -0.4, 0), CAM(D, 706, 508, 1.02, 0, 0.5, 0)] };
  }

  // ============================== 4. checklist 毛玻璃清单 + 极光对勾 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = items.length;
    const RH = 94, R0 = 272;
    const H = R0 + n * RH + (data.note ? 136 : 26);
    const el = h('div', 'kg-zone');
    const card = glass('kg-card', `height:${H}px;`,
      `<div class="kg-kicker hd"><i></i><span>${esc(data.kicker || '')}</span></div><div class="ttl kg-ti">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div><div class="hr"></div>`);
    card.querySelector('.hd').style.position = 'absolute';
    const rows = items.map((it, i) => {
      const r = h('div', 'kg-row', `top:${R0 + i * RH}px;`,
        `<div class="glow"></div><div class="ci">${PROPS.check(44, 4.5)}</div><div class="k">${esc(it.k)}</div><div class="d">${esc(it.d || '')}</div><div class="n">${String(i + 1).padStart(2, '0')}</div>`);
      card.appendChild(r); return r;
    });
    let memo = null;
    if (data.note) {
      memo = glass('hero kg-memo', `top:${R0 + n * RH + 18}px;`, `<small>${esc(data.noteLead || '')}</small><div class="kg-au">${mark(data.note).replace(/<\/?em>/g, '')}</div>`);
      card.appendChild(memo);
    }
    const coin = h('div', 'kg-coin', 'left:1132px;top:136px;', `${PROPS.ring(132, 3)}<b class="kg-ti">${n}/${n}</b>`);
    el.append(card, coin);
    focusIn(A, card, 0, 1.0, 0.95, 24);
    const t0 = 1.2, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.8 : 1.5)), t0 + 0.75 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    rows.forEach((r, i) => {
      A.add(r, t0 + i * stp - 0.35, 0.5, { o: 0.25, x: -10 }, { o: 1, x: 0 });
      A.add(r.querySelector('.glow'), t0 + i * stp + 0.05, 0.7, { sx: 0, o: 0 }, { sx: 1, o: 1 }, 'soft');
      A.add(r.querySelector('.glow'), -1, 0.01, { o: 0 }, { o: 0 });
    });
    const cks = rows.map((r) => r.querySelector('.kg-ck'));
    const cis = rows.map((r) => r.querySelector('.ci'));
    const rg = coin.querySelector('.kg-rg'), rc = +rg.dataset.c;
    A.fn((t) => {
      cks.forEach((c, i) => {
        const p = EASE.out(clamp01((t - (t0 + i * stp)) / 0.35));
        c.setAttribute('stroke-dashoffset', (44 * (1 - p)).toFixed(1));
        cis[i].style.borderColor = p > 0.05 ? 'rgba(96,165,250,.7)' : '';
        cis[i].style.boxShadow = p > 0.05 ? `0 0 ${(18 * p).toFixed(0)}px rgba(96,165,250,.45)` : '';
      });
      let done = 0; cks.forEach((_, i) => { done += clamp01((t - (t0 + i * stp)) / 0.35); });
      rg.setAttribute('stroke-dashoffset', (rc * (1 - (n ? done / n : 0))).toFixed(1));
    });
    focusIn(A, coin, 0.8, 0.8, 0.85, 14);
    if (memo) rise(A, memo, D - 2.2, 0.8, 24, 12);
    const bottom = 110 + H, endY = 520 + Math.max(0, bottom - 960) * 0.6;
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 540, 1.06, 0, -1, 0), CAM(1.2, 700, 520, 0.99, 0, -0.4, 0), CAM(D, 704, endY, 1.0, 0, 0.5, 0)] };
  }

  // ============================== 5. compare 暗淡旧法 vs 极光新法 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'kg-zone');
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const hd = head(data.title, 'left:58px;top:160px;font-size:88px;');
    const L = glass('kg-cmp wrong', 'left:60px;',
      `<div class="band">${esc(w.label || '✕ BEFORE')}</div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div>${w.stamp ? `<div class="xs">${esc(w.stamp)}</div>` : ''}<svg class="strike" width="480" height="150"><path d="M4 40 L380 40" stroke="#F87171" stroke-opacity=".75" stroke-width="4" stroke-linecap="round" fill="none" stroke-dasharray="376" stroke-dashoffset="376"/><path d="M4 106 L380 106" stroke="#F87171" stroke-opacity=".75" stroke-width="4" stroke-linecap="round" fill="none" stroke-dasharray="376" stroke-dashoffset="376"/></svg>`);
    const R = glass('kg-cmp right hero', 'left:780px;',
      `<div class="band">${esc(r.label || '✓ AFTER')}</div><div class="t kg-ti">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div><div class="ok">${PROPS.check(40, 5, '#FFFFFF')}</div>`);
    const vs = glass('kg-vs', null, 'VS');
    const verdict = glass('kg-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span>`);
    el.append(kick, hd, L, R, vs, verdict);
    rise(A, kick, 0.1, 0.6, 16, 8);
    rise(A, hd, 0.25, 0.8, 40, 16);
    rise(A, L, 0.6, 0.9, 60, 20);
    const tStrike = Math.min(D * 0.3, 1.8);
    const strikes = L.querySelectorAll('path');
    const xs = L.querySelector('.xs');
    if (xs) rise(A, xs, tStrike + 0.6, 0.6, 12, 8);
    focusIn(A, vs, tStrike + 0.3, 0.8, 0.7, 12);
    const tR = Math.min(D * 0.48, tStrike + 1.2);
    rise(A, R, tR, 0.9, 60, 20);
    const ok = R.querySelector('.ok'), ck = ok.querySelector('.kg-ck');
    focusIn(A, ok, tR + 0.6, 0.6, 0.5, 8);
    const tV = Math.min(D - 1.6, tR + 1.4);
    rise(A, verdict, tV, 0.9, 40, 16);
    A.fn((t) => {
      strikes.forEach((p, i) => p.setAttribute('stroke-dashoffset', (376 * (1 - EASE.inOut(clamp01((t - tStrike - i * 0.25) / 0.5)))).toFixed(1)));
      ck.setAttribute('stroke-dashoffset', (44 * (1 - EASE.out(clamp01((t - tR - 0.9) / 0.35)))).toFixed(1));
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 545, 1.08, 0, -1.2, 0), CAM(1.3, 700, 512, 1.0, 0, -0.4, 0), CAM(D, 706, 512, 1.02, 0, 0.6, 0)] };
  }

  // ============================== 6. timeline 发光节点时间轴 ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 230, SP = n <= 5 ? Math.min(330, (1280 - NWD) / Math.max(1, n - 1)) : 290;
    const W = n <= 5 ? 1400 : 60 + (n - 1) * SP + NWD + 60, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'kg-zone', `width:${W}px;`);
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const hd = head(data.title, 'left:58px;top:160px;font-size:88px;');
    const LY = 566;
    const track = h('div', 'kg-track', `left:${60 + 24}px;top:${LY}px;width:${(n - 1) * SP}px;`, '<i></i>');
    el.append(kick, hd, track);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.4), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 60 + i * SP, up = i % 2 === 0, top = up ? 316 : 616, at = t0 + i * stp, isNow = i === now;
      const card = glass(`kg-tl-node${isNow ? ' hero' : ''}`, `left:${x}px;top:${top}px;`,
        `<div class="tm ${isNow ? 'kg-au' : 'kg-ti'}">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', `kg-tl-stem${up ? '' : ' dn'}`, `left:${x + 24}px;top:${up ? top + 196 : LY}px;height:${up ? LY - top - 196 : top - LY}px;`);
      const dot = h('div', `kg-track-dot`, `left:${x + 24}px;top:${LY}px;`);
      el.append(stem, dot, card);
      A.add(dot, at - 0.1, 0.5, { s: 0.3, o: 0 }, { s: 1, o: 1 });
      A.add(stem, at, 0.4, { o: 0 }, { o: 1 });
      rise(A, card, at + 0.05, 0.9, up ? 40 : -40, 18);
      return { x, up, top, at, dot, isNow };
    });
    let pulse = null;
    if (parts[now]) {
      const p = parts[now];
      pulse = h('div', 'kg-pulse', `left:${p.x + 24}px;top:${LY}px;`); el.appendChild(pulse);
      if (data.nowLabel) {
        const nb = h('div', 'kg-pill hero', `right:${Math.max(60, W - (p.x + 230))}px;top:${p.up ? LY + 52 : p.top + 214}px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 26px 12px;`,
          `<span>${esc(data.nowLabel)}</span>${data.nowSmall ? `<small style="font-family:var(--kg-font-latin);font-size:12px;letter-spacing:.22em;color:#CBD5E1">${esc(data.nowSmall)}</small>` : ''}`);
        el.appendChild(nb);
        focusIn(A, nb, Math.min(D - 1.2, p.at + 0.8), 0.7, 0.85, 10);
      }
    }
    rise(A, kick, 0.1, 0.6, 16, 8);
    rise(A, hd, 0.25, 0.8, 40, 16);
    A.add(track, 0.5, 0.4, { o: 0 }, { o: 1 });
    A.add(track.querySelector('i'), t0, Math.max(0.6, tEnd - t0 + 0.1), { sx: 0 }, { sx: 1 }, 'inOut');
    A.fn((t) => {
      parts.forEach((p) => p.dot.classList.toggle('on', t >= p.at + 0.1));
      if (pulse) {
        const pn = parts[now], k = t - pn.at - 0.3;
        if (k < 0) { pulse.style.opacity = '0'; return; }
        const ph = (k % 1.6) / 1.6;
        pulse.style.opacity = (0.9 * (1 - ph)).toFixed(3);
        pulse.style.transform = `scale(${(0.5 + ph * 1.4).toFixed(3)})`;
      }
    });
    const endX = W - 700;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 545, 1.08, 0, -1.2, 0), CAM(1.0, 700, 515, 1.0, 0, -0.4, 0), CAM(Math.max(1.1, tEnd + 0.3), endX, 515, 1.0, 0, 0.4, 0), CAM(D, endX + 6, 512, 1.02, 0, 0.6, 0)] };
  }

  // ============================== 7. diagram 玻璃节点 + 流光连线 ==============================
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
  const NODE_DOT = ['#60A5FA', '#A78BFA', '#22D3EE', '#94A3B8'];
  let DG_SEQ = 0;
  function diagram(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8), links = (data.links || []).slice(0, 12);
    const L = 60, T = 300, AW = 1280, AH = 600, NW = 250, NH = 116;
    const el = h('div', 'kg-zone');
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const hd = head(data.title, 'left:58px;top:160px;font-size:88px;');
    el.append(kick, hd);
    const pos = {}, appear = {};
    const stp = Math.min(0.45, (D * 0.38) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp;
      const e = glass('kg-dg-node', `left:${x}px;top:${y}px;`, `<div class="l"><i style="background:${NODE_DOT[i % 4]};box-shadow:0 0 12px ${NODE_DOT[i % 4]}"></i>${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div>`);
      el.appendChild(e);
      focusIn(A, e, appear[nd.id], 0.8, 0.86, 16);
      return e;
    });
    const mid = `kgdg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.4 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#CBD5E1"/></marker><filter id="${mid}g" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="4"/></filter></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="rgba(203,213,225,.55)" stroke-width="2" fill="none" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mid})"/>`;
      inner += `<g class="pl" data-j="${j}" opacity="0"><circle r="11" fill="#60A5FA" filter="url(#${mid}g)"/><circle r="4.5" fill="#FFFFFF"/></g>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'kg-dg-svg'); svg.setAttribute('width', '1400'); svg.setAttribute('height', '1100');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'kg-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'kg-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      focusIn(A, tg, tDraw[j] + 0.4, 0.6, 0.8, 8);
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 2.0, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const side = p.x + NW + 270 <= 1340;
      const fb = h('div', 'kg-pill hero', `${side ? `left:${p.x + NW + 18}px;top:${p.y + 34}px;` : `left:${Math.min(1100, p.x + 40)}px;top:${p.y - 62}px;`}display:flex;align-items:baseline;gap:12px;z-index:5;`,
        `<span>${esc(data.focusLabel)}</span>${data.focusSmall ? `<small style="font-family:var(--kg-font-latin);font-size:13px;letter-spacing:.24em;color:var(--kg-silver)">${esc(data.focusSmall)}</small>` : ''}`);
      el.appendChild(fb);
      focusIn(A, fb, tF + 0.25, 0.7, 0.85, 10);
    }
    rise(A, kick, 0.1, 0.6, 16, 8);
    rise(A, hd, 0.25, 0.8, 40, 16);
    A.fn((t) => {
      lnEls.forEach((p) => { const j = +p.dataset.j, g = geo[j]; p.setAttribute('stroke-dashoffset', (g.len * (1 - EASE.inOut(clamp01((t - tDraw[j]) / 0.6)))).toFixed(1)); });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.7;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const u = (live * 0.45) % 1;
        const q = bez(g.p0, g.c1, g.c2, g.p1, u);
        r.setAttribute('opacity', (Math.sin(u * Math.PI)).toFixed(3)); r.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hero', t >= tF);
    });
    return { el, layer: 'world', avatar: 'pip', update: (t) => A.update(t),
      cams: [CAM(0, 700, 560, 1.08, 0, -1.2, 0), CAM(1.3, 700, 520, 1.0, 0, -0.4, 0), CAM(D, 706, 516, 1.02, 0, 0.5, 0)] };
  }

  // ============================== 8. showcase 玻璃窗口 / 代码打字 / 文档 / 录屏 / 产品 ==============================
  const DEVICE_SVG = `<svg viewBox="0 0 400 300"><defs><linearGradient id="kg-dev-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2E8F0"/><stop offset="1" stop-color="#64748B"/></linearGradient></defs><rect x="70" y="60" width="260" height="170" rx="18" fill="rgba(255,255,255,.04)" stroke="url(#kg-dev-g)" stroke-width="3"/><rect x="88" y="78" width="224" height="134" rx="8" fill="#0B0D14"/><circle cx="200" cy="145" r="40" fill="none" stroke="url(#kg-au-grad)" stroke-width="3"/><circle cx="200" cy="145" r="14" fill="url(#kg-au-grad)"/><path d="M140 252 H260" stroke="url(#kg-dev-g)" stroke-width="3" stroke-linecap="round"/><text x="200" y="292" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="600" fill="#94A3B8" letter-spacing="5">PRODUCT IMAGE</text></svg>`;
  function productPanel(data) {
    const el = h('div', 'kg-prod');
    const pic = h('div', 'pic');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.innerHTML = DEVICE_SVG;
    const info = h('div', 'info', null, `<div class="nm kg-ti">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg kg-au">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? badge(data.price, data.priceSmall || '', 'right:44px;bottom:34px;font-size:42px;') : null;
    if (price) el.appendChild(price);
    return { el, pic, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'kg-zone');
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const hd = head(data.title, 'left:58px;top:156px;font-size:80px;');
    const dark = kind === 'code' || kind === 'terminal';
    const panel = glass(`kg-panel${dark ? '' : ' doc'}`, null, `<div class="bar"><div class="dots"><i></i><i></i><i></i></div>${esc(data.file || kind.toUpperCase())}</div>`);
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'kg-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'kg-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', 'kg-code'); panel.appendChild(codeEl); }
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 60 + 1240 * (((nt.at && nt.at[0]) || 60) / 100), py = 270 + 640 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      return h('div', 'kg-callout', `left:${(px - 6).toFixed(0)}px;top:${(py - 24).toFixed(0)}px;`, `<div class="dot"></div><div class="ln"></div><div class="tx">${esc(nt.text)}</div>`);
    });
    const tag = pill(kind.toUpperCase(), 'right:60px;top:180px;', 'mono');
    el.append(kick, hd, panel, ...notes, tag);
    rise(A, kick, 0.1, 0.6, 16, 8);
    rise(A, hd, 0.25, 0.8, 40, 16);
    focusIn(A, panel, 0.45, 1.0, 0.94, 22);
    rise(A, tag, 0.8, 0.6, 14, 8);
    const tType0 = 1.1, tType1 = Math.max(tType0 + 0.6, D * 0.6);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 1.0 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => { A.add(p, tN0 + i * nStep, 0.7, { x: -16, o: 0, b: 8 }, { x: 0, o: 1, b: 0 }); A.add(p.querySelector('.ln'), tN0 + i * nStep, 0.5, { sx: 0 }, { sx: 1 }); });
    if (prod) {
      focusIn(A, prod.pic, 0.9, 0.9, 0.9, 14);
      prod.rows.forEach((r, i) => A.add(r, 1.1 + i * 0.25, 0.6, { x: 30, o: 0, b: 6 }, { x: 0, o: 1, b: 0 }));
      if (prod.price) focusIn(A, prod.price, Math.min(D - 1.3, 1.4 + prod.rows.length * 0.25 + 0.3), 0.7, 0.85, 10);
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
        if (!cur && Math.floor(t * 1.6) % 2 === 0) html = html.replace(/\n$/, '<span class="cur">_</span>\n');
        codeEl.innerHTML = html;
      }
      if (media && media.tagName === 'VIDEO' && media.readyState >= 1 && media.duration) {
        const want = Math.max(0, t - 0.3) % media.duration;
        if (media.paused && Math.abs(media.currentTime - want) > 0.08) { try { media.currentTime = want; } catch (_) {} }
      }
    });
    return { el, layer: 'world', avatar: 'corner', update: (t) => A.update(t), media,
      cams: [CAM(0, 700, 580, 1.0, 0, -1, 0), CAM(1.4, 700, 530, 1.0, 0, -0.4, 0), CAM(D, 708, 536, 1.03, 0, 0.5, 0)] };
  }

  // ============================== 9. quote 全屏人像 + 毛玻璃金句（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'kg-screen', 'position:absolute;inset:0;pointer-events:none;');
    const right = data.pos === 'right';
    const side = right ? 'right:110px;' : 'left:110px;';
    const card = glass('kg-q', side, `<div class="kg-kicker"><i></i><span>${esc(data.kicker || 'KEY TAKEAWAY')}</span></div><div class="t kg-ti">${mark(data.text)}</div><div class="ft"><div class="by">${esc(data.by || '')}</div></div>`);
    let bd = null;
    if (data.stamp) { bd = badge(data.stamp, data.stampSmall || '', 'font-size:34px;'); card.querySelector('.ft').appendChild(bd); }
    el.append(card);
    A.add(card, 0.35, 1.1, { x: right ? 60 : -60, o: 0, b: 26, s: 0.97 }, { x: 0, o: 1, b: 0, s: 1 }, 'soft');
    const tt = card.querySelector('.t');
    rise(A, tt, 0.7, 1.0, 30, 14);
    if (bd) focusIn(A, bd, Math.min(D - 1.2, D * 0.45), 0.8, 0.85, 12);
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 10. outro 行动卡 + 极光 CTA ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'kg-zone');
    const kick = kicker(data.kicker, 'left:64px;top:118px;');
    const hd = head(data.title, 'left:58px;top:156px;font-size:88px;');
    const acts = (data.actions || []).slice(0, 3).map((a, i) => glass('kg-act', `top:${290 + i * 170}px;`,
      `<div class="tg">${esc(a.tag || 'ACTION')}</div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div><div class="no kg-num-thin">${String(i + 1).padStart(2, '0')}</div>`));
    const c = data.cta || {};
    const cta = glass('kg-cta hero', null, `<div class="kg-kicker" style="position:relative"><i></i><span>${esc(c.kicker || 'OPEN SOURCE')}</span></div><div class="t kg-au">${esc(c.title || '')}</div><div class="repo">${esc(c.repo || '')}</div><div class="btns">${(c.buttons || []).slice(0, 3).map((b, i) => `<span class="${i === 0 ? 'pri' : ''}">${esc(b)}</span>`).join('')}</div>`);
    const go = h('div', 'kg-go', 'left:1176px;top:668px;', `<b>${esc(c.stamp || 'GO')}</b>${c.stampSmall ? `<small>${esc(c.stampSmall)}</small>` : ''}`);
    el.append(kick, hd, ...acts, cta, go);
    rise(A, kick, 0.1, 0.6, 16, 8);
    rise(A, hd, 0.25, 0.8, 40, 16);
    const t0 = 0.8, stp = Math.min(0.5, (D * 0.3) / Math.max(1, acts.length));
    acts.forEach((a, i) => A.add(a, t0 + i * stp, 0.9, { x: -50, o: 0, b: 18 }, { x: 0, o: 1, b: 0 }));
    const tC = t0 + acts.length * stp + 0.1;
    focusIn(A, cta, tC, 1.0, 0.94, 24);
    const btns = Array.from(cta.querySelectorAll('.btns span'));
    const tP = tC + 1.0;
    A.fn((t) => btns.forEach((b, i) => {
      // 依次轻按：微缩 + 亮边高光 → 回弹（克制）
      const p = clamp01((t - (tP + i * 0.4)) / 0.45), k = p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI);
      b.style.transform = `scale(${(1 - 0.05 * k).toFixed(3)})`;
      b.style.boxShadow = k > 0 ? `0 0 ${(30 * k).toFixed(0)}px rgba(96,165,250,${(0.6 * k).toFixed(2)})${i === 0 ? ',0 10px 40px rgba(59,130,246,.45)' : ''}` : '';
    }));
    focusIn(A, go, Math.min(D - 1.1, tP + btns.length * 0.4 + 0.2), 0.8, 0.6, 14);
    A.fn((t) => { const k = Math.min(D - 1.1, tP + btns.length * 0.4 + 0.2) + 0.8; if (t > k) go.style.boxShadow = `0 0 ${(70 + 25 * Math.sin((t - k) * 2.4)).toFixed(0)}px rgba(96,165,250,.5),inset 0 1px 0 rgba(255,255,255,.5)`; });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 700, 545, 1.08, 0, -1.2, 0), CAM(1.3, 700, 510, 1.0, 0, -0.4, 0), CAM(D, 704, 506, 0.99, 0, 0.5, 0)] };
  }

  global.StageGlass = {
    version: '1.0.0',
    PROPS, Animator, EASE, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, stat: { create: stat }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, timeline: { create: timeline }, diagram: { create: diagram },
      showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro }
    }
  };
})(window);
