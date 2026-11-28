/**
 * Mushanhe Video Engine — 跟词组件套件 CueKit（v3.5，12 套通用；06 用它自己的原版实现，其余 11 套用这里）
 * ---------------------------------------------------------------------------------------------
 * 把 06 金样片里定下来的「cue 版」组件搬成公共层，样子由每套风格包自己的 CSS 变量决定（只接功能，不改风格）：
 *   cover   写了 parts            → 封面：不带字的装饰第 0 帧就在，标题按词分段砸出，stamp + stampCue，then 同段接下一个句型
 *   steps   铺满版式 + items[].cue → 卡跟词出 + 聚光 + doneCue 一起亮 + progress 进度条 + exitCue + 卡上贴纸 + intake 文件卡飞进 AI 框
 *   compare 铺满版式 + wrong/right.cue → 以前 / 现在：行跟词出、印章、按钮被点换样子、stat 数字条（数字和进度条同一个进度）
 *   outro   actions[].cue          → 收尾铭牌（1–3 块，品字排）+ 聚光 + cta 大横条 + 铭牌底板（和第一块铭牌同帧出）
 *   stat    铺满版式 + cue          → 大数字条：数字和进度条同一个进度，endCue 念完那一刻到位
 * 不写这些字段 = 不走这里，各风格包原版组件逐帧不变（宿主页先问 CueKit.create，返回 null 再走原版）。
 *
 * 样式变量（风格包在自己的 CSS 里写 :root { --mk-…: … }，引用自己的颜色变量，皮肤切换时跟着变；没写的用默认值）：
 *   --mk-ink 线 / 字 · --mk-paper 底色 · --mk-panel 中性卡底 · --mk-muted 旧做法卡底 · --mk-muted-ink 旧做法字
 *   --mk-c1..c4 四个强调色（卡片轮换）· --mk-on1..on4 强调色上的字色 · --mk-accent 聚光亮边色
 *   --mk-dark / --mk-on-dark 深色块（AI 框 / 大横条 / 标签底）和上面的字色
 *   --mk-bw 边框粗细 · --mk-bs 边框线型 · --mk-rad 圆角 · --mk-sh 卡投影 · --mk-sh-lg 大卡投影 · --mk-sh-sm 小件投影
 *   --mk-font 中文字体 · --mk-font-num 数字 / 拉丁字体 · --mk-tex 卡面纹理（background-image，可 none）
 *   --mk-sw0..sw3 「换风格」色块点击前的样子（默认 paper / c1 / c2 / c4）· --mk-sw-bg 色票框底 · --mk-pg-bg 进度条底 · --mk-tl-bg 小时间线底 · --mk-stamp-fg / --mk-stamp-ol 印章字色 / 内框线 · --mk-sticker-fg 贴纸字色 · --mk-ear 文件卡折角底
 *   --mk-board 铭牌底板底色 · --mk-board-tex 底板纹理 · --mk-tape 胶带色
 *   风格包还可以直接改写 .mk-* 类（例：黑板把边框改成粉笔虚线），只要不改版位 / 时间。
 * 接口与风格包组件一致：create(data, ctx) → { el, layer:'world', avatar, cams, update(localT) }，update 确定性。
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  // ============================== 工具（与 06 同一套补间 / 缓动） ==============================
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const EASE = {
    linear: (x) => x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    in: (x) => x * x * x,
    back: (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    slam: (x) => { if (x < 0.45) return EASE.in(x / 0.45); const k = (x - 0.45) / 0.55; return 1 + Math.sin(k * Math.PI * 2) * 0.06 * (1 - k); }
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function h(tag, cls, style, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (style) el.setAttribute('style', style);
    if (html != null) el.innerHTML = html;
    return el;
  }
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
        el.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) rotate(${(st.r * ROT()).toFixed(2)}deg) scale(${(st.s * st.sx).toFixed(4)}, ${st.s.toFixed(4)})`;
        el.style.opacity = clamp01(st.o).toFixed(3);
      });
      this.fns.forEach((f) => f(t));
    }
  }
  /** 风格包可以把歪斜角度整体缩放（--mk-tilt：06 式潮刊 1，规整的终端 / 玻璃 0）；首次读取后缓存 */
  let TILT = null;
  const ROT = () => {
    if (TILT == null) { const v = parseFloat(global.getComputedStyle(document.documentElement).getPropertyValue('--mk-tilt')); TILT = Number.isFinite(v) ? v : 1; }
    return TILT;
  };
  const PAL = ['var(--mk-c1)', 'var(--mk-c2)', 'var(--mk-c3)', 'var(--mk-c4)'];
  const ONC = ['var(--mk-on1)', 'var(--mk-on2)', 'var(--mk-on3)', 'var(--mk-on4)'];
  const blank = (s) => !String(s == null ? '' : s).trim();
  const CAM = (t, x = 700, y = 500, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  const FX = () => MHEngine.Focus || null;
  const TRIM = () => document.documentElement.getAttribute('data-mh-card') === 'trim';
  const ARROW = (w = 70, hg = 50, c = 'currentColor') => { const m = hg / 2; return `<svg width="${w}" height="${hg}" viewBox="0 0 ${w} ${hg}" style="overflow:visible"><path d="M0 ${m - 8} H${w - 26} V2 L${w} ${m} L${w - 26} ${hg - 2} V${m + 8} H0 Z" fill="${c}"/></svg>`; };
  const CHECK = (size = 60, stroke = 11) => `<svg width="${size}" height="${size}" viewBox="0 0 60 60" style="overflow:visible"><path class="mk-ck" d="M6 30 L22 46 L54 8" stroke="currentColor" stroke-width="${stroke}" fill="none" stroke-linecap="square" stroke-linejoin="miter" stroke-dasharray="74" stroke-dashoffset="74"/></svg>`;
  function shakeAt(el, t, t0, amp = 9) {
    const ds = t - t0;
    if (ds <= 0 || ds >= 0.4) return;
    const d = 1 - ds / 0.4;
    el.style.transform = `translate(${(amp * Math.sin(ds * 55) * d).toFixed(1)}px, 0px) rotate(${(1.6 * Math.sin(ds * 55 + 1) * d * ROT()).toFixed(2)}deg) ${el.style.transform}`;
  }
  const slamCue = (A, el, at, r = -8, s0 = 1.9) => { A.add(el, -1, 0.01, { o: 0 }, { o: 0 }); A.add(el, at, 0.22, { s: s0, o: 0.4, r: r - 6 }, { s: 1, o: 1, r }, 'slam'); };
  const clauseOut = (ctx, at) => { const ce = ctx.clauseEnd ? ctx.clauseEnd(at, null) : null; return ce == null ? null : ce + 0.08; };
  const decOf = (v) => { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; };
  const fmtNum = (v, dec) => Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function stamp(text, style) { const e = h('div', 'mk-stamp', style, esc(text)); if (blank(text)) e.style.display = 'none'; return e; }

  /** 线稿插图（与 06 同一套图形，线色 = currentColor，跟卡片字色走） */
  const ICON = {
    motion: '<svg viewBox="0 0 120 120"><rect x="8" y="22" width="104" height="76" fill="none" stroke="currentColor" stroke-width="8"/><path d="M48 42 L80 60 L48 78 Z" fill="currentColor"/><path d="M8 108 H40 M54 108 H70 M84 108 H112" stroke="currentColor" stroke-width="8"/></svg>',
    clock: '<svg viewBox="0 0 120 120"><circle cx="60" cy="64" r="44" fill="none" stroke="currentColor" stroke-width="8"/><path d="M60 38 V64 L80 76" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="square"/><path d="M44 8 H76" stroke="currentColor" stroke-width="8"/></svg>',
    gift: '<svg viewBox="0 0 120 120"><rect x="12" y="46" width="96" height="62" fill="none" stroke="currentColor" stroke-width="8"/><rect x="6" y="30" width="108" height="20" fill="currentColor"/><path d="M60 30 V108" stroke="currentColor" stroke-width="8"/><path d="M60 30 C44 6 22 14 32 30 M60 30 C76 6 98 14 88 30" fill="none" stroke="currentColor" stroke-width="7"/></svg>',
    palette: '<svg viewBox="0 0 120 120"><rect x="8" y="8" width="48" height="48" fill="currentColor"/><rect x="64" y="8" width="48" height="48" fill="none" stroke="currentColor" stroke-width="8"/><rect x="8" y="64" width="48" height="48" fill="none" stroke="currentColor" stroke-width="8"/><rect x="64" y="64" width="48" height="48" fill="currentColor" opacity=".45"/></svg>',
    script: '<svg viewBox="0 0 120 120"><path d="M20 6 H80 L104 30 V114 H20 Z" fill="none" stroke="currentColor" stroke-width="8"/><path d="M36 48 H88 M36 66 H88 M36 84 H70" stroke="currentColor" stroke-width="8"/></svg>',
    subtitle: '<svg viewBox="0 0 120 120"><rect x="6" y="14" width="108" height="70" fill="none" stroke="currentColor" stroke-width="8"/><rect x="22" y="94" width="76" height="18" fill="currentColor"/><path d="M24 38 H96 M24 58 H70" stroke="currentColor" stroke-width="8" opacity=".5"/></svg>',
    preview: '<svg viewBox="0 0 120 120"><rect x="6" y="18" width="108" height="72" fill="none" stroke="currentColor" stroke-width="8"/><path d="M50 36 L76 54 L50 72 Z" fill="currentColor"/><path d="M6 104 H114" stroke="currentColor" stroke-width="8"/><rect x="6" y="98" width="58" height="12" fill="currentColor"/></svg>',
    film: '<svg viewBox="0 0 120 120"><rect x="8" y="14" width="104" height="92" fill="none" stroke="currentColor" stroke-width="8"/><path d="M32 14 V106 M88 14 V106" stroke="currentColor" stroke-width="6"/><path d="M14 30 H26 M14 50 H26 M14 70 H26 M14 90 H26 M94 30 H106 M94 50 H106 M94 70 H106 M94 90 H106" stroke="currentColor" stroke-width="8"/><path d="M50 44 L72 60 L50 76 Z" fill="currentColor"/></svg>',
    doc: '<svg viewBox="0 0 120 120"><path d="M20 6 H80 L104 30 V114 H20 Z" fill="none" stroke="currentColor" stroke-width="8"/><path d="M78 6 V32 H104" fill="none" stroke="currentColor" stroke-width="7"/><path d="M36 52 H88 M36 70 H88 M36 88 H68" stroke="currentColor" stroke-width="8"/></svg>',
    unlock: '<svg viewBox="0 0 120 120"><rect x="14" y="54" width="92" height="60" fill="none" stroke="currentColor" stroke-width="9"/><path d="M34 54 V34 C34 6 80 4 84 30" fill="none" stroke="currentColor" stroke-width="9"/><rect x="54" y="72" width="12" height="24" fill="currentColor"/></svg>',
    nocode: '<svg viewBox="0 0 120 120"><path d="M42 34 L16 60 L42 86 M78 34 L104 60 L78 86" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="square"/><path d="M68 22 L52 98" stroke="currentColor" stroke-width="8"/><circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="7"/><path d="M22 98 L98 22" stroke="currentColor" stroke-width="7"/></svg>'
  };

  // ============================== 样式（全部走 --mk-* 变量；默认值 = 中性直角卡） ==============================
  const CSS = `
  :root{--mk-ink:#111111;--mk-paper:#F6F1E3;--mk-panel:#FFFFFF;--mk-muted:#DEDAD0;--mk-muted-ink:#5E5A52;
    --mk-c1:#FFE500;--mk-c2:#3B82F6;--mk-c3:#00E599;--mk-c4:#FF4D6D;--mk-on1:#111111;--mk-on2:#FFFFFF;--mk-on3:#111111;--mk-on4:#FFFFFF;
    --mk-accent:var(--mk-c4);--mk-dark:var(--mk-ink);--mk-on-dark:var(--mk-c1);--mk-bw:4px;--mk-bs:solid;--mk-rad:0px;
    --mk-sh:8px 8px 0 var(--mk-ink);--mk-sh-lg:12px 12px 0 var(--mk-ink);--mk-sh-sm:5px 5px 0 var(--mk-ink);
    --mk-font:'Noto Sans SC','Microsoft YaHei',sans-serif;--mk-font-num:'Arial Black','Noto Sans SC',sans-serif;--mk-tex:none;
    --mk-board:var(--mk-muted);--mk-sw-bg:#fff;--mk-pg-bg:rgba(255,255,255,.45);--mk-tl-bg:rgba(17,17,17,.12);--mk-stamp-fg:#fff;--mk-stamp-ol:rgba(255,255,255,.9);--mk-sticker-fg:#fff;--mk-ear:var(--mk-paper);--mk-board-tex:radial-gradient(rgba(17,17,17,.15) 2px,transparent 2px);--mk-tape:var(--mk-c3);--mk-trim:rgba(17,17,17,.3);--mk-trim-c:rgba(17,17,17,.72)}
  .mk-zone{position:absolute;width:1400px;height:1100px;font-family:var(--mk-font);color:var(--mk-ink)}
  .mk-box{position:absolute;border:var(--mk-bw) var(--mk-bs) var(--mk-ink);border-radius:var(--mk-rad);box-shadow:var(--mk-sh);box-sizing:border-box;background-image:var(--mk-tex)}
  .mk-box.lg{box-shadow:var(--mk-sh-lg)}
  .mk-zone .mh-focus-ring{position:absolute;inset:-18px;border:7px solid var(--mk-accent);border-radius:calc(var(--mk-rad) + 10px);box-shadow:var(--mk-sh);pointer-events:none;z-index:9}
  .mk-stamp{position:absolute;z-index:8;padding:10px 26px 12px;background:var(--mk-accent);color:var(--mk-stamp-fg);border:5px solid var(--mk-ink);border-radius:var(--mk-rad);box-shadow:var(--mk-sh);font-weight:900;line-height:1.02;white-space:nowrap;outline:3px solid var(--mk-stamp-ol);outline-offset:-12px}
  .mk-sticker{position:absolute;z-index:10;padding:12px 24px 14px;background:var(--mk-accent);color:var(--mk-sticker-fg);border:4px solid var(--mk-ink);border-radius:var(--mk-rad);box-shadow:var(--mk-sh-sm);font-weight:900;white-space:nowrap;line-height:1.1}
  .mk-tape{position:absolute;z-index:7;background:var(--mk-tape);border:3px solid var(--mk-ink);box-sizing:border-box;opacity:.92;background-image:repeating-linear-gradient(45deg,rgba(17,17,17,.16) 0 6px,transparent 6px 14px)}
  .mk-head{position:absolute;font-weight:900;line-height:1.06;white-space:nowrap}
  /* cover */
  .mk-cv{position:absolute;left:0;top:0;width:1400px;height:1100px}
  .mk-cv-block{position:absolute;background-color:var(--mk-c1);background-image:radial-gradient(rgba(17,17,17,.08) 2px,transparent 2px);background-size:22px 22px}
  .mk-cv-title{position:absolute;font-weight:900;letter-spacing:-.03em;line-height:1.04;white-space:nowrap;color:var(--mk-on1)}
  .mk-cv-title span{display:inline-block}
  .mk-cv-blue{position:absolute;background:var(--mk-c2);color:var(--mk-on2);display:flex;align-items:center;justify-content:center}
  .mk-cv-blue svg{display:block;width:100%;height:100%}
  .mk-cv-dots{position:absolute;background-color:var(--mk-c4);background-image:radial-gradient(rgba(17,17,17,.3) 3px,transparent 3px);background-size:22px 22px}
  .mk-cv-chip{position:absolute;border:var(--mk-bw) var(--mk-bs) var(--mk-ink);border-radius:var(--mk-rad);box-shadow:var(--mk-sh-sm);box-sizing:border-box}
  .mk-cv-ring{position:absolute;border-radius:50%;border:10px solid var(--mk-c3);box-shadow:var(--mk-sh-sm);box-sizing:border-box}
  .mk-cv-ring::after{content:'';position:absolute;inset:22%;border-radius:50%;background:var(--mk-c3);opacity:.55}
  .mk-cv-wave{position:absolute;height:28px}
  .mk-cv-wave svg{display:block}
  /* steps */
  .mk-ticket{position:absolute;color:var(--mk-ink);box-sizing:border-box}
  .mk-ticket .no{position:absolute;left:calc(var(--mk-bw) * -1);top:calc(var(--mk-bw) * -1);background:var(--mk-dark);color:var(--mk-on-dark);font-family:var(--mk-font-num);font-weight:900;display:flex;align-items:center;justify-content:center;border-radius:var(--mk-rad) 0 var(--mk-rad) 0}
  .mk-ticket .nm{font-weight:900;line-height:1.05;white-space:nowrap}
  .mk-ticket .ico{position:absolute;right:22px;opacity:.9}
  .mk-ticket .ico svg{display:block;width:100%;height:100%}
  .mk-ticket .pgb{position:absolute;left:22px;right:22px;bottom:22px;background:var(--mk-pg-bg);border:4px solid var(--mk-ink);box-sizing:border-box;border-radius:calc(var(--mk-rad) * .5);overflow:hidden}
  .mk-ticket .pgb i{position:absolute;left:0;top:0;bottom:0;width:100%;background:repeating-linear-gradient(-45deg,var(--mk-dark) 0 10px,var(--mk-on-dark) 10px 20px);transform-origin:left center;transform:scaleX(0)}
  .mk-arrow{position:absolute;z-index:5;color:var(--mk-ink)}
  .mk-arrow svg{display:block}
  .mk-file{position:absolute;box-sizing:border-box;color:var(--mk-ink);transform-origin:50% 50%}
  .mk-file .ic{position:absolute}
  .mk-file .ic svg{display:block;width:100%;height:100%}
  .mk-file .lb{position:absolute;font-weight:900;line-height:1;white-space:nowrap;letter-spacing:-.01em}
  .mk-file .ear{position:absolute;right:calc(var(--mk-bw) * -1);top:calc(var(--mk-bw) * -1);background:linear-gradient(225deg,var(--mk-ear) 0 50%,var(--mk-ink) 50% calc(50% + 4px),rgba(17,17,17,.2) calc(50% + 4px))}
  .mk-ai{position:absolute;box-sizing:border-box;background:var(--mk-dark);display:flex;align-items:center;justify-content:center;transform-origin:50% 50%}
  .mk-ai b{font-family:var(--mk-font-num);font-weight:900;color:var(--mk-on-dark);letter-spacing:-.04em;line-height:1}
  .mk-ai .mini{position:absolute;display:flex;align-items:center;gap:12px;color:var(--mk-on-dark)}
  .mk-ai .mini i{display:block;height:100%;flex:none}
  .mk-ai .mini i svg{display:block;width:100%;height:100%}
  .mk-ai .mini u{display:block;flex:1;height:40%;border:3px solid var(--mk-on-dark);background:repeating-linear-gradient(-45deg,var(--mk-on-dark) 0 7px,transparent 7px 14px)}
  .mk-ai.lit{box-shadow:var(--mk-sh-lg),0 0 46px 14px color-mix(in srgb,var(--mk-on-dark) 55%,transparent)}
  /* compare */
  .mk-cmp{position:absolute;overflow:visible}
  .mk-cmp.wrong{background-color:var(--mk-muted)}
  .mk-cmp.right{background-color:var(--mk-c3)}
  .mk-cmp .t{position:absolute;font-weight:900;line-height:1.1;white-space:nowrap}
  .mk-cmp.wrong .t{color:var(--mk-muted-ink)}
  .mk-cmp.right .t{color:var(--mk-on3)}
  .mk-cmp .rws{position:absolute;left:30px;right:30px}
  .mk-cmp .rw{position:relative;display:flex;align-items:center;gap:18px;font-weight:900;white-space:nowrap;color:var(--mk-ink)}
  .mk-cmp .rw i{width:26px;height:26px;background:var(--mk-accent);border:4px solid var(--mk-ink);flex:none;border-radius:calc(var(--mk-rad) * .4)}
  .mk-cmp .badge{position:absolute;right:-22px;top:-26px;width:76px;height:76px;background:var(--mk-dark);color:var(--mk-c3);border:4px solid var(--mk-ink);border-radius:var(--mk-rad);box-shadow:var(--mk-sh-sm);display:flex;align-items:center;justify-content:center}
  .mk-cmp .sw{position:absolute;left:30px;right:30px;border:4px solid var(--mk-ink);border-radius:var(--mk-rad);box-shadow:var(--mk-sh-sm);box-sizing:border-box;overflow:hidden;background:var(--mk-sw-bg)}
  .mk-cmp .sw i{position:absolute;top:0;bottom:0;border-left:4px solid var(--mk-ink)}
  .mk-cmp .sw i:first-child{border-left:0}
  .mk-cmp .btn{position:absolute;left:30px;bottom:30px;padding:10px 30px 12px;background:var(--mk-c1);color:var(--mk-on1);border:4px solid var(--mk-ink);border-radius:var(--mk-rad);box-shadow:var(--mk-sh-sm);font-weight:900;white-space:nowrap;line-height:1.1}
  .mk-cmp .tlx{position:absolute;left:30px;right:30px;border:4px solid var(--mk-ink);border-radius:calc(var(--mk-rad) * .5);background:var(--mk-tl-bg);box-sizing:border-box;overflow:hidden}
  .mk-cmp .tlx .trk{position:absolute;left:0;right:0;border-bottom:3px solid rgba(17,17,17,.3)}
  .mk-cmp .tlx .clp{position:absolute;border:3px solid var(--mk-ink);box-sizing:border-box;border-radius:calc(var(--mk-rad) * .3)}
  .mk-cmp .tlx .ph{position:absolute;top:0;bottom:0;width:5px;background:var(--mk-accent)}
  .mk-vs{position:absolute;width:136px;height:136px;z-index:6}
  .mk-vs .dm{position:absolute;inset:0;background:var(--mk-dark);transform:rotate(45deg);border-radius:var(--mk-rad);box-shadow:var(--mk-sh-sm)}
  .mk-vs .tx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--mk-font-num);font-size:56px;font-weight:900;color:var(--mk-on-dark)}
  .mk-cursor{position:absolute;z-index:12;left:0;top:0;width:58px;height:58px;pointer-events:none}
  .mk-cursor svg{display:block;width:100%;height:100%;overflow:visible}
  .mk-ripple{position:absolute;z-index:11;left:0;top:0;width:130px;height:130px;margin:-65px 0 0 -65px;border:7px solid var(--mk-ink);border-radius:50%;box-sizing:border-box;pointer-events:none}
  .mk-cstat{position:absolute;background-color:var(--mk-c1);display:flex;align-items:center;padding:0 34px;z-index:7;box-sizing:border-box;color:var(--mk-on1)}
  .mk-cstat .lb{padding:8px 16px;background:var(--mk-dark);color:var(--mk-on-dark);font-weight:900;white-space:nowrap;border-radius:calc(var(--mk-rad) * .5)}
  .mk-cstat .num{font-family:var(--mk-font-num);font-weight:900;letter-spacing:-.04em;line-height:1;white-space:nowrap}
  .mk-cstat .num b{display:inline-block;min-width:1.25em;text-align:right}
  .mk-cstat .num .u{font-family:var(--mk-font);margin-left:8px;letter-spacing:0}
  .mk-cstat .pg{flex:1;background:var(--mk-panel);border:4px solid var(--mk-ink);position:relative;box-sizing:border-box;border-radius:calc(var(--mk-rad) * .5);overflow:hidden}
  .mk-cstat .pg i{position:absolute;left:0;top:0;bottom:0;width:100%;background:var(--mk-accent);transform-origin:left center;transform:scaleX(0)}
  /* outro */
  .mk-board{position:absolute;background-color:var(--mk-board);background-image:var(--mk-board-tex);background-size:24px 24px}
  .mk-screw{position:absolute;border-radius:50%;background:rgba(17,17,17,.12);border:3px solid var(--mk-ink);box-sizing:border-box}
  .mk-screw::after{content:'';position:absolute;left:1px;right:1px;top:50%;height:3px;margin-top:-1.5px;background:var(--mk-ink);transform:rotate(-35deg)}
  .mk-plate{position:absolute;display:flex;align-items:center;box-sizing:border-box;white-space:nowrap;transform-origin:50% 50%}
  .mk-plate .tx{font-weight:900;line-height:1;letter-spacing:-.02em}
  .mk-plate .ic{margin-left:auto;flex:none}
  .mk-plate .ic svg{display:block;width:100%;height:100%}
  .mk-banner{position:absolute;display:flex;align-items:center;box-sizing:border-box;background:var(--mk-dark);color:var(--mk-on-dark);border-radius:var(--mk-rad);box-shadow:var(--mk-sh);font-weight:900;white-space:nowrap}
  .mk-banner .ar{margin-left:auto;flex:none;color:var(--mk-on-dark)}
  /* 卡片细节（meta.cardDetail = "trim"）：内沿细线 + 四角 L 角标 + 聚光同色柔光 + 进度条裁切 */
  html[data-mh-card="trim"] .mk-zone .mk-ticket::before,html[data-mh-card="trim"] .mk-zone .mk-cmp::before,html[data-mh-card="trim"] .mk-zone .mk-cstat::before,html[data-mh-card="trim"] .mk-zone .mk-file::before,html[data-mh-card="trim"] .mk-zone .mk-plate::before{content:'';position:absolute;inset:8px;border:1.5px solid var(--mk-trim);border-radius:calc(var(--mk-rad) * .6);pointer-events:none}
  html[data-mh-card="trim"] .mk-zone .mk-ticket::after,html[data-mh-card="trim"] .mk-zone .mk-cmp::after,html[data-mh-card="trim"] .mk-zone .mk-cstat::after,html[data-mh-card="trim"] .mk-zone .mk-file::after,html[data-mh-card="trim"] .mk-zone .mk-plate::after{content:'';position:absolute;inset:8px;pointer-events:none;--c:var(--mk-trim-c);
    background:linear-gradient(var(--c),var(--c)) left top/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) left top/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) right top/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) right top/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) left bottom/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) left bottom/3px 22px no-repeat,
      linear-gradient(var(--c),var(--c)) right bottom/22px 3px no-repeat,linear-gradient(var(--c),var(--c)) right bottom/3px 22px no-repeat}
  html[data-mh-card="trim"] .mk-zone .mk-cmp.wrong{--mk-glow:var(--mk-muted)}
  html[data-mh-card="trim"] .mk-zone .mk-cmp.right{--mk-glow:var(--mk-c3)}
  html[data-mh-card="trim"] .mk-zone .mh-focus-ring:not(.row){box-shadow:var(--mk-sh),0 0 34px 10px color-mix(in srgb,var(--mk-glow,var(--mk-c1)) 62%,transparent)}
  html[data-mh-card="trim"] .mk-ticket .pgb::before{content:'';position:absolute;z-index:1;top:0;bottom:0;width:4px;left:calc(var(--p,0) * 100% - 2px);background:var(--mk-ink);opacity:var(--pe,0)}
  html[data-mh-card="trim"] .mk-ticket .pgb i{top:-1px;bottom:-1px;left:-1px;width:calc(100% + 2px);transform:none;clip-path:inset(0 calc((1 - var(--p,0)) * 100%) 0 0)}
  `;
  function injectCSS() {
    if (document.getElementById('mh-cue-kit-css')) return;
    const st = document.createElement('style'); st.id = 'mh-cue-kit-css'; st.textContent = CSS;
    document.head.insertBefore(st, document.head.firstChild);   // 放在最前：风格包自己的 :root --mk-* / .mk-* 改写写在后面，优先级更高
  }
  const AREA0 = { x0: 60, x1: 1340, y0: 120, y1: 960, k: 1 };

  // ============================== cover（封面炸场，写了 parts 才走） ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const AR = ctx.area || AREA0;
    const k = AR.k, X = (u) => AR.x0 + u * k, Y = (v) => AR.y0 + v * k, S = (p) => p * k;
    const AW = (AR.x1 - AR.x0) / k;
    const cue = (c, fb = null) => (ctx.cue ? ctx.cue(c, fb) : fb);
    const el = h('div', 'mk-zone');
    const cv = h('div', 'mk-cv');
    const fs = +data.size > 0 ? +data.size : 168, bw = Math.min(900, AW - 280), bh = Math.max(420, Math.round(fs * 2.08 + 44));
    // ---- 不带字的装饰：第 0 帧就在 ----
    const chips = [2, 3, 4].map((c, i) => h('div', 'mk-cv-chip', `left:${X(bw + 70 + i * 22)}px;top:${Y(36 + i * 76)}px;width:${S(200)}px;height:${S(56)}px;background:var(--mk-c${c});`));
    const blue = h('div', 'mk-box lg mk-cv-blue', `left:${X(0)}px;top:${Y(Math.max(490, bh + 60))}px;width:${S(300)}px;height:${S(270)}px;padding:${S(50)}px;`, ICON.motion);
    const dots = h('div', 'mk-box mk-cv-dots', `left:${X(340)}px;top:${Y(Math.max(500, bh + 70))}px;width:${S(bw - 360)}px;height:${S(240)}px;`);
    const block = h('div', 'mk-box lg mk-cv-block', `left:${X(0)}px;top:${Y(20)}px;width:${S(bw)}px;height:${S(bh)}px;transform-origin:20% 80%;`);
    const title = h('div', 'mk-cv-title', `left:${S(44)}px;top:${S(26)}px;font-size:${S(fs)}px;`);
    block.appendChild(title);
    const t1 = h('div', 'mk-tape', `left:${X(-34)}px;top:${Y(34)}px;width:${S(170)}px;height:${S(42)}px;`);
    const t2 = h('div', 'mk-tape', `left:${X(bw - 130)}px;top:${Y(bh - 4)}px;width:${S(150)}px;height:${S(40)}px;`);
    const ring = h('div', 'mk-cv-ring', `left:${X(bw + 90)}px;top:${Y(530)}px;width:${S(170)}px;height:${S(170)}px;`);
    let wd = 'M0 14'; for (let x = 0; x < 220; x += 26) wd += ' q13 -16 26 0';
    const wave = h('div', 'mk-cv-wave', `left:${X(bw + 40)}px;top:${Y(752)}px;`, `<svg width="${S(220)}" height="${S(28)}" viewBox="0 0 220 28"><path d="${wd}" stroke="var(--mk-c4)" stroke-width="7" fill="none"/></svg>`);
    // ---- 带字的：跟词出 ----
    const parts = data.parts.map((p) => (typeof p === 'string' ? { text: p } : p || {})).filter((p) => !blank(p.text));
    let fb = 0.4;
    const groups = parts.map((p, j) => {
      if (p.br && j > 0) title.appendChild(document.createElement('br'));
      const at = cue(p.cue != null ? p.cue : p.text, fb); fb = (at == null ? fb : at) + 0.5;
      const cs = Array.from(String(p.text)).map((c) => { const s = h('span', null, null, c === ' ' ? '&nbsp;' : esc(c)); title.appendChild(s); return s; });
      return { at: at == null ? fb - 0.5 : at, cs };
    });
    const tS = !blank(data.stamp) ? cue(data.stampCue != null ? data.stampCue : data.stamp, null) : null;
    const st = stamp(tS == null ? '' : data.stamp, `right:${1400 - X(Math.min(AW - 70, bw + 200))}px;top:${Y(bh - 76)}px;font-size:${S(104)}px;transform-origin:100% 100%;`);
    cv.append(chips[0], chips[1], chips[2], blue, dots, block, t1, t2, ring, wave, st);
    el.appendChild(cv);
    const REST = new Map([[block, -1.2], [blue, 1.6], [dots, -0.8], [t1, -24], [t2, 16], [chips[0], -3], [chips[1], 2], [chips[2], -1.5]]);
    REST.forEach((r, e) => A.add(e, -1, 0.01, { r }, { r }));
    groups.forEach((g) => g.cs.forEach((c, m) => {
      A.add(c, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(c, g.at + m * 0.03, 0.3, { s: 1.8, o: 0.5, r: m % 2 ? 10 : -10 }, { s: 1, o: 1, r: 0 }, 'slam');
    }));
    if (groups.length) A.add(block, groups[0].at, 0.32, { s: 1.035, r: -2.4 }, { s: 1, r: -1.2 }, 'out');
    if (tS != null) {
      slamCue(A, st, tS, -8, 1.45);
      const o = clauseOut(ctx, tS);
      if (o != null) A.add(st, o, 0.16, { s: 1, o: 1, r: -8 }, { s: 0.75, o: 0, r: -8 }, 'in');
    }
    let child = null;
    const th = data.then;
    if (th && th.type && KIT[th.type] && th.type !== 'cover') {
      child = KIT[th.type](th.data || {}, ctx);
      if (child && child.layer === 'world') {
        child.el.style.left = '0px'; child.el.style.top = '0px'; el.appendChild(child.el);
        let tT = cue(th.cue, null); if (tT == null) tT = D * 0.5;
        A.add(cv, tT, 0.01, { o: 1 }, { o: 0 });   // 硬切收起：这一帧起封面整块不见
      } else child = null;
    }
    A.fn((t) => {
      ring.style.transform = `rotate(${(t * 14).toFixed(1)}deg) scale(${(1 + 0.03 * Math.sin(t * 2)).toFixed(4)})`;
      wave.style.transform = `translateX(${(6 * Math.sin(t * 2.2)).toFixed(1)}px)`;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => { A.update(t); if (child) child.update(t); },
      cams: child && child.cams ? child.cams : [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)] };
  }

  // ============================== steps（铺满版式 + cue 版，含 intake 文件卡进 AI） ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator(), AR = ctx.area || AREA0;
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const cue = (c, fb = null) => (ctx.cue ? ctx.cue(c, fb) : fb);
    const el = h('div', 'mk-zone');
    const k = AR.k, W = AR.x1 - AR.x0, g = (n <= 2 ? 100 : 48) * k, cwF = (W - g * (n - 1)) / n, chF = (n <= 2 ? 560 : 440) * k;
    const hasTitle = !blank(data.title) || +data.titleSpace > 0, top0 = hasTitle ? AR.y0 + (+data.titleSpace > 0 ? +data.titleSpace : 116) * k : AR.y0, topC = top0 + Math.max(0, (AR.y1 - top0 - chF) / 2);
    const head = h('div', 'mk-head', `left:${AR.x0}px;top:${AR.y0}px;font-size:${Math.round(84 * k)}px;`, esc(data.title || '').replace(/\n/g, '<br/>'));
    if (blank(data.title)) head.style.display = 'none';
    el.appendChild(head);
    const cards = items.map((it, i) => h('div', 'mk-box lg mk-ticket', `left:${AR.x0 + i * (cwF + g)}px;top:${topC}px;width:${cwF}px;height:${chF}px;padding:${108 * k}px 0 0 ${26 * k}px;background-color:${PAL[i % 4]};color:${ONC[i % 4]};--mk-glow:${PAL[i % 4]};`,
      `<div class="no" style="width:${96 * k}px;height:${76 * k}px;font-size:${36 * k}px;">${esc(it.no || String(i + 1).padStart(2, '0'))}</div><div class="nm" style="font-size:${Math.round((n <= 2 ? 86 : 64) * k)}px;">${esc(it.title).replace(/\n/g, '<br/>')}</div>`));
    cards.forEach((c, i) => {
      const ic = ICON[items[i].icon];
      const pgH = data.progress ? 34 * k : 0, isz = Math.min(cwF - 44, (n <= 2 ? 190 : 150) * k);
      if (ic) c.appendChild(h('div', 'ico', `width:${isz}px;height:${isz}px;bottom:${22 + (pgH ? pgH + 18 * k : 0)}px;`, ic));
      if (pgH) c.appendChild(h('div', 'pgb', `height:${pgH}px;`, '<i></i>'));
    });
    const arrows = items.slice(1).map((_, i) => h('div', 'mk-arrow', `left:${AR.x0 + (i + 1) * (cwF + g) - g / 2 - 22}px;top:${topC + chF / 2 - 23}px;`, ARROW(44, 46)));
    el.append(...cards, ...arrows);
    const tH = cue(data.titleCue, null);
    if (tH != null) { A.add(head, -1, 0.01, { o: 0 }, { o: 0 }); A.add(head, tH, 0.4, { y: -40, o: 0.45 }, { y: 0, o: 1 }, 'back'); }
    else A.add(head, 0.2, 0.45, { y: -60, o: 0 }, { y: 0, o: 1 }, 'back');
    const t0 = 1.1, t1 = Math.min(Math.max(t0 + 0.5, D - 2.2), t0 + 0.6 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const tc = items.map((it, i) => cue(it.cue, t0 + i * stp));
    const REST = [-1.6, 1.4, -1.2, 1.6, -1.4];
    cards.forEach((c, i) => { c.style.transformOrigin = '50% 0%'; A.add(c, -1, 0.01, { o: 0 }, { o: 0 }); A.add(c, tc[i], 0.32, { s: 1.06, o: 0.45, r: [-4, 3, -3, 4, -3][i] }, { s: 1, o: 1, r: REST[i] }, 'slam'); });
    arrows.forEach((a, i) => A.add(a, tc[i + 1] + 0.25, 0.3, { s: 0, o: 0, x: -20 }, { s: 1, o: 1, x: 0 }, 'back'));
    // v3.5 收尾（12 套打分）：还没出齐时，已出的卡整组居中；下一张的词前 0.15s 起 0.2s 滑到新的居中位（全部出齐 = 原并排位）
    const SHIFT = n >= 2 && tc.every((x, i) => Number.isFinite(x) && (i === 0 || x > tc[i - 1])) && data.center !== false;
    const offAt = (m) => ((n - m) * (cwF + g)) / 2;
    const offOf = (t) => {
      let o = offAt(1);
      for (let j = 1; j < n; j++) { const p = EASE.inOut(clamp01((t - (tc[j] - 0.15)) / 0.2)); if (p > 0) o = offAt(j) + (offAt(j + 1) - offAt(j)) * p; }
      return o;
    };
    // ---- intake：步骤卡之前的「素材丢给 AI」（文件卡跟词出，飞进 AI 框，第一张步骤卡出现时收起） ----
    const IN = data.intake || null, inFx = [];
    if (IN) {
      const X = (u) => AR.x0 + u * k, Y = (v) => AR.y0 + v * k;
      const files = (IN.files || []).map((f) => (typeof f === 'string' ? { text: f } : f || {})).filter((f) => !blank(f.text)).slice(0, 3);
      const ai = IN.ai && !blank(IN.ai.text) ? IN.ai : null;
      const sz = Array.isArray(IN.size) ? IN.size : [], FW = +sz[0] || 360, FH = +sz[1] || 240, AIW = +IN.aiW || 280, G1 = 48;
      const fk = Math.max(1, Math.min(FW / 360, FH / 240));
      const tot = files.length * FW + Math.max(0, files.length - 1) * G1;
      const AWs = (AR.x1 - AR.x0) / k, AHs = (AR.y1 - AR.y0) / k, top0s = +data.titleSpace > 0 ? +data.titleSpace : 116;
      const u0 = Math.max(0, (AWs - tot) / 2), vMid = (AHs - FH) / 2, v0 = vMid >= top0s ? vMid : top0s + Math.max(0, (AHs - top0s - FH) / 2);
      const FI = ['film', 'doc', 'script'], FC = [1, 3, 4];
      const fEls = files.map((f, i) => h('div', 'mk-box lg mk-file', `left:${X(u0 + i * (FW + G1))}px;top:${Y(v0)}px;width:${FW * k}px;height:${FH * k}px;background-color:var(--mk-c${FC[i % 3]});color:var(--mk-on${FC[i % 3]});`,
        `<div class="ear" style="width:${54 * fk * k}px;height:${54 * fk * k}px;"></div><div class="ic" style="left:${26 * fk * k}px;top:${24 * fk * k}px;width:${96 * fk * k}px;height:${96 * fk * k}px;">${ICON[f.icon] || ICON[FI[i % 3]]}</div>` +
        `<div class="lb" style="left:${26 * fk * k}px;bottom:${22 * fk * k}px;font-size:${Math.round(Math.min(80 * fk, (FW - 60 * fk) / Math.max(1, Array.from(String(f.text)).length)) * k)}px;">${esc(f.text)}</div>`));
      const uA = (AWs - AIW) / 2;
      const aiEl = ai ? h('div', 'mk-box lg mk-ai', `left:${X(uA)}px;top:${Y(v0)}px;width:${AIW * k}px;height:${FH * k}px;`, `<b style="font-size:${Math.round(Math.min(128 * fk, (AIW - 50) / (0.62 * Math.max(1, String(ai.text).length))) * k)}px;margin-bottom:${54 * fk * k}px;">${esc(ai.text)}</b>` +
        `<div class="mini" style="left:${22 * fk * k}px;right:${22 * fk * k}px;bottom:${18 * fk * k}px;height:${Math.round(FH * 0.2) * k}px;">${files.map((f, i) => `<i style="width:${Math.round(FH * 0.2) * k}px;">${ICON[f.icon] || ICON[FI[i % 3]]}</i>`).join('')}<u></u></div>`) : null;
      [aiEl, ...fEls].filter(Boolean).forEach((e) => el.insertBefore(e, cards[0] || null));
      const tF = files.map((f, i) => cue(f.cue != null ? f.cue : f.text, tc[0] - 1.2 + i * 0.4));
      const tA = ai ? cue(ai.cue != null ? ai.cue : ai.text, null) : null, tE = tc[0], FLY = 0.38, RR = [-1.5, 1.2, -1];
      fEls.forEach((e, i) => {
        A.add(e, -1, 0.01, { o: 0 }, { o: 0 });
        const offAt = (m) => ((files.length - m) * (FW + G1) / 2) * k;
        A.add(e, tF[i], 0.3, { s: 1.08, o: 0.45, r: RR[i] * 2.5, x: offAt(i + 1) }, { s: 1, o: 1, r: RR[i], x: offAt(i + 1) }, 'slam');
        for (let m = i + 1; m < files.length; m++) if (tF[m] != null && (tA == null || tF[m] < tA)) A.add(e, Math.max(tF[i] + 0.3, tF[m] - 0.15), 0.2, { s: 1, o: 1, r: RR[i], x: offAt(m) }, { s: 1, o: 1, r: RR[i], x: offAt(m + 1) }, 'out');
        if (tA != null) {
          const dx = (uA + AIW / 2 - (u0 + i * (FW + G1) + FW / 2)) * k;
          A.add(e, tA, FLY, { x: 0, y: 0, s: 1, o: 1, r: RR[i] }, { x: dx, y: 0, s: 0.18, o: 0.3, r: RR[i] * 6 }, 'inOut');
          A.add(e, tA + FLY, 0.02, { x: dx, y: 0, s: 0.18, o: 0 }, { x: dx, y: 0, s: 0.18, o: 0 });
        } else if (tE != null) A.add(e, tE, 0.2, { o: 1, s: 1, r: RR[i] }, { o: 0, s: 0.6, r: RR[i] }, 'out');
      });
      if (aiEl) {
        A.add(aiEl, -1, 0.01, { o: 0 }, { o: 0 });
        A.add(aiEl, tA, 0.3, { s: 1.2, o: 0.5, r: 2 }, { s: 1, o: 1, r: 1 }, 'slam');
        const SC = +IN.aiScale > 0 ? +IN.aiScale : 1.3;
        A.add(aiEl, tA + FLY, 0.42, { s: 1.12, o: 1, r: 1 }, { s: SC, o: 1, r: 0 }, 'inOut');
        if (tE != null) A.add(aiEl, tE, 0.2, { s: SC, o: 1, r: 0 }, { s: 0.6, o: 0, r: 0, y: -30 * k }, 'out');
        const mini = aiEl.querySelector('.mini'), mIs = Array.from(mini.querySelectorAll('i')), run = mini.querySelector('u');
        mIs.forEach((e, i) => A.add(e, -1, 0.01, { o: 0 }, { o: 0 }).add(e, tA + FLY - 0.04 + i * 0.05, 0.22, { s: 1.6, o: 0.5 }, { s: 1, o: 1 }, 'back'));
        A.add(run, -1, 0.01, { o: 0 }, { o: 0 }).add(run, tA + FLY + 0.1, 0.2, { o: 0 }, { o: 1 });
        inFx.push((t) => { aiEl.classList.toggle('lit', t >= tA && (tE == null || t < tE)); run.style.backgroundPosition = `${(-(t * 60) % 28).toFixed(1)}px 0`; });
      }
    }
    const F = FX();
    const fo = F && data.focus !== false ? cards.map((c) => F.attach(c)) : null;
    const tDones = (Array.isArray(data.doneCue) ? data.doneCue : [data.doneCue]).map((c) => cue(c, null)).filter((x) => x != null);
    let tOut = null;
    if (data.exitCue != null) tOut = data.exitCue === 'end' ? (ctx.clauseEnd ? ctx.clauseEnd(D, null) : null) : cue(data.exitCue, null);
    const stks = items.map((it, i) => {
      const o = typeof it.sticker === 'string' ? { text: it.sticker } : it.sticker;
      if (!o || blank(o.text)) return null;
      const s = h('div', 'mk-sticker', `right:26px;top:-44px;font-size:${Math.round(56 * k)}px;`, esc(o.text));
      cards[i].appendChild(s);
      const at = cue(o.cue != null ? o.cue : o.text, tc[i] + 0.8), out = clauseOut(ctx, at);
      slamCue(A, s, at, 6, 1.9);
      if (out != null) A.add(s, out, 0.16, { s: 1, o: 1, r: 6 }, { s: 0.75, o: 0, r: 6 }, 'in');
      return { at, shake: o.shake !== false, card: cards[i] };
    });
    if (tOut != null) {
      [head, ...arrows].forEach((e) => A.add(e, tOut, 0.22, { o: 1 }, { o: 0 }, 'in'));
      cards.forEach((c, i) => A.add(c, tOut + i * 0.035, 0.26, { y: 0, o: 1, r: REST[i], s: 1 }, { y: -120, o: 0, r: REST[i] * 4, s: 0.55 }, 'in'));
    }
    let fitted = false;
    A.fn((t) => {
      if (SHIFT) { const o = `${offOf(t).toFixed(1)}px 0px`; cards.forEach((c) => { c.style.translate = o; }); arrows.forEach((a) => { a.style.translate = o; }); }
      if (!fitted) cards.forEach((c) => { const nm = c.querySelector('.nm'); const room = c.clientWidth - 52 * k; if (room > 0) { fitted = true; if (nm.scrollWidth > room + 1) nm.style.fontSize = `${Math.floor(parseFloat(global.getComputedStyle(nm).fontSize) * room / nm.scrollWidth)}px`; } });
      if (fo) {
        const f = F.track(t, tc, { flashes: tDones.map((x) => [x, x + 0.6]) });
        fo.forEach((o, i) => F.apply(o, tOut != null && t >= tOut ? 0 : f[i], 'fade'));
      }
      stks.forEach((sk) => { if (sk && sk.shake) shakeAt(sk.card, t, sk.at + 0.24, 8); });
      inFx.forEach((f) => f(t));
      if (data.progress) cards.forEach((c, i) => {
        const bar = c.querySelector('.pgb i'); if (!bar) return;
        const ends = [tc[i + 1], ...tDones].filter((x) => x != null && x > tc[i] + 0.05);
        const te = ends.length ? Math.min(...ends) : tc[i] + 0.6;
        const v = clamp01((t - tc[i] - 0.15) / Math.max(0.2, te - tc[i] - 0.15));
        if (TRIM()) { const pb = bar.parentElement; pb.style.setProperty('--p', v.toFixed(4)); pb.style.setProperty('--pe', v > 0.002 && v < 0.998 ? '1' : '0'); }
        else bar.style.transform = `scaleX(${v.toFixed(4)})`;
      });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), cams: [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)] };
  }

  // ============================== 数字条（compare.stat / 单独的 stat 共用） ==============================
  function statBar(stc, ctx, A, k) {
    const cue = (c, fb = null) => (ctx.cue ? ctx.cue(c, fb) : fb);
    const cueEnd = (c, fb = null) => (ctx.cueEnd ? ctx.cueEnd(c, fb) : fb);
    const D = ctx.dur;
    const el = h('div', 'mk-box lg mk-cstat', `gap:${34 * k}px;`, `${blank(stc.label) ? '' : `<span class="lb" style="font-size:${Math.round(40 * k)}px;">${esc(stc.label)}</span>`}<span class="num" style="font-size:${Math.round(124 * k)}px;"><b>0</b><span class="u" style="font-size:${Math.round(56 * k)}px;">${esc(stc.unit || '')}</span></span><span class="pg" style="height:${50 * k}px;"><i></i></span>`);
    const tS = cue(stc.cue, D - 1.2);
    const tSe = Math.max(tS + 0.2, cueEnd(stc.endCue != null ? stc.endCue : stc.cue, tS + 0.9));
    const tSin = Math.min(tS, cue(stc.inCue, tS - 0.35));
    el.style.transformOrigin = '50% 0%';
    A.add(el, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(el, tSin, 0.32, { s: 1.02, o: 0.5, r: 1 }, { s: 1, o: 1, r: -0.6 }, 'slam');
    const numEl = el.querySelector('.num'), nb = el.querySelector('.num b'), pg = el.querySelector('.pg i');
    const dec = decOf(stc.value), q = Math.pow(10, dec);
    const fn = (t) => {
      const pr = clamp01((t - tS) / (tSe - tS));
      numEl.style.opacity = t < tS ? '0' : '1';
      const pop = clamp01((t - tSe) / 0.25);
      numEl.style.display = 'inline-block';
      numEl.style.transform = t >= tSe ? `scale(${(1 + 0.22 * (1 - EASE.out(pop))).toFixed(4)})` : 'none';
      const shown = pr >= 0.9999 ? +stc.value : Math.round(+stc.value * pr * q) / q;
      nb.textContent = fmtNum(shown, dec);
      pg.style.transform = `scaleX(${((+stc.value ? shown / +stc.value : pr) * clamp01(stc.bar != null ? +stc.bar : 1)).toFixed(4)})`;
    };
    return { el, fn, tS, tSe, tSin };
  }

  // ============================== compare（以前 / 现在，铺满版式 + cue 版） ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator(), AR = ctx.area || AREA0;
    const w = data.wrong || {}, r = data.right || {};
    const cue = (spec, fb = null) => (ctx.cue ? ctx.cue(spec, fb) : fb);
    const cueEnd = (spec, fb = null) => (ctx.cueEnd ? ctx.cueEnd(spec, fb) : fb);
    const el = h('div', 'mk-zone');
    const k = AR.k, cw = 520 * k, ch = 480 * k, gp = 40 * k, sh = 150 * k;
    const rowsOf = (side) => (side.rows || []).map((x) => (typeof x === 'string' ? { text: x } : x || {})).filter((o) => !blank(o.text)).slice(0, 4);
    const wRows = rowsOf(w), rRows = rowsOf(r);
    const card = (side, cls, rows, extra) => h('div', `mk-box lg mk-cmp ${cls}`, `width:${cw}px;height:${ch}px;`,
      `<div class="t" style="font-size:${Math.round(70 * k)}px;left:${30 * k}px;top:${26 * k}px;">${esc(side.title || '').replace(/\n/g, '<br/>')}</div>` +
      (rows.length ? `<div class="rws" style="top:${150 * k}px;">${rows.map((o) => `<div class="rw"><i></i>${esc(o.text)}</div>`).join('')}</div>` : '') + (extra || ''));
    const btn = r.button && !blank(r.button.text) ? r.button : null;
    const SK = Array.isArray(r.swatches) && r.swatches.length ? r.swatches.slice(0, 4)
      : (Array.isArray(MHEngine.CueKit.swatches) && MHEngine.CueKit.swatches.length ? MHEngine.CueKit.swatches
        : [['#FFFFFF', '#000000', '#FF2A2A', '#000000'], ['#111111', '#CCFF00', '#A855F7', '#FF2E93'], ['#FFF0F5', '#FF3385', '#38BDF8', '#FFE500']]);
    const swHtml = btn ? `<div class="sw" style="top:${196 * k}px;height:${140 * k}px;">${[0, 1, 2].map((q) => `<i style="left:${(q * 100 / 3).toFixed(3)}%;width:${(100 / 3).toFixed(3)}%;"></i>`).join('')}</div><div class="btn" style="font-size:${Math.round(48 * k)}px;">${esc(btn.text)}</div>` : '';
    const L = card(w, 'wrong', wRows, '');
    const R = card(r, 'right', rRows, `<div class="badge">${CHECK(50, 11)}</div>${swHtml}`);
    const vs = h('div', 'mk-vs', null, `<div class="dm"></div><div class="tx">${esc(data.vs == null ? '→' : data.vs)}</div>`);
    if (data.vs === false || data.vs === '') vs.style.display = 'none';
    const xs = stamp(w.stamp || '', `left:${150 * k}px;top:${ch - 150 * k - 6}px;font-size:${Math.round(52 * k)}px;`);
    const stc = data.stat && Number.isFinite(+data.stat.value) ? data.stat : null;
    const SB = stc ? statBar(stc, ctx, A, k) : null;
    const cursor = btn ? h('div', 'mk-cursor', null, '<svg viewBox="0 0 40 40"><path d="M5 2 L5 33 L13 26 L19 39 L26 36 L20 23 L31 23 Z" fill="#111111" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/></svg>') : null;
    const ripple = btn ? h('div', 'mk-ripple') : null;
    el.append(L, R, vs);
    L.appendChild(xs);
    const top = AR.y0 + Math.max(0, (AR.y1 - AR.y0 - (ch + (SB ? gp + sh : 0))) / 2);
    const cTopS = top, cTop = SB ? AR.y0 + Math.max(0, (AR.y1 - AR.y0 - ch) / 2) : top;
    let tlx = null, tlPh = null; const tlClips = [];
    if (w.illus === 'timeline') {
      const th = 140 * k, tw = cw - 60;
      tlx = h('div', 'tlx', `top:${ch - th - 30 * k}px;height:${th}px;`);
      const COLS = ['var(--mk-c1)', 'var(--mk-c2)', 'var(--mk-c3)'];
      [0, 1, 2].forEach((r2) => {
        const rh = th / 3;
        tlx.appendChild(h('div', 'trk', `top:${(r2 + 1) * rh - 3}px;height:0;`));
        [[0.02, 0.26], [0.32, 0.22], [0.6, 0.3]].forEach(([x, wd], j) => {
          const e = h('div', 'clp', `left:${((x + (r2 % 2) * 0.05) * tw).toFixed(1)}px;width:${(wd * tw).toFixed(1)}px;top:${(r2 * rh + 6).toFixed(1)}px;height:${(rh - 12).toFixed(1)}px;background:${COLS[(r2 + j) % 3]};`);
          tlx.appendChild(e); tlClips.push({ e, bg: COLS[(r2 + j) % 3], order: j * 3 + r2 });
        });
      });
      tlClips.sort((a, b) => a.order - b.order);
      tlPh = h('div', 'ph'); tlx.appendChild(tlPh);
      L.insertBefore(tlx, xs);
    }
    [[L, AR.x0], [R, AR.x1 - cw]].forEach(([e, x]) => Object.assign(e.style, { left: `${x}px`, top: `${top}px` }));
    Object.assign(vs.style, { left: `${(AR.x0 + AR.x1) / 2 - 68}px`, top: `${top + ch / 2 - 68}px` });
    L.querySelectorAll('.rw').forEach((rw) => { rw.style.fontSize = `${Math.round(54 * k)}px`; rw.style.height = `${(tlx ? 70 : 84) * k}px`; });
    R.querySelectorAll('.rw').forEach((rw) => { rw.style.fontSize = `${Math.round(54 * k)}px`; rw.style.height = `${84 * k}px`; });
    if (SB) { Object.assign(SB.el.style, { left: `${AR.x0}px`, top: `${top + ch + gp}px`, width: `${AR.x1 - AR.x0}px`, height: `${sh}px` }); el.appendChild(SB.el); }
    if (btn) R.append(ripple, cursor);
    const tL = cue(w.cue, 0.4), tR = cue(r.cue, Math.min(D * 0.48, tL + 2.5));
    [L, R].forEach((c) => { c.style.transformOrigin = '50% 0%'; });
    A.add(L, -1, 0.01, { o: 0 }, { o: 0 }); A.add(L, tL, 0.32, { s: 1.06, o: 0.45, r: -3 }, { s: 1, o: 1, r: -1.5 }, 'slam');
    A.add(R, -1, 0.01, { o: 0 }, { o: 0 }); A.add(R, tR, 0.32, { s: 1.06, o: 0.45, r: 3 }, { s: 1, o: 1, r: 1.5 }, 'slam');
    A.add(vs, -1, 0.01, { o: 0 }, { o: 0 }); A.add(vs, tR - 0.05, 0.45, { s: 0, o: 0, r: -180 }, { s: 1, o: 1, r: 0 }, 'back');
    const badge = R.querySelector('.badge'), bck = badge.querySelector('.mk-ck');
    A.add(badge, -1, 0.01, { o: 0 }, { o: 0 }); A.add(badge, tR + 0.45, 0.35, { s: 0, o: 0, r: -40 }, { s: 1, o: 1, r: 6 }, 'back');
    const rowAt = (rows, el0, tCard) => Array.from(el0.querySelectorAll('.rw')).forEach((rw, i) => {
      const at = Math.max(tCard + 0.12, cue(rows[i].cue != null ? rows[i].cue : rows[i].text, tCard + 0.5 + i * 0.6));
      A.add(rw, -1, 0.01, { o: 0, x: -40 }, { o: 0, x: -40 });
      A.add(rw, at, 0.3, { o: 0, x: -40, s: 0.9 }, { o: 1, x: 0, s: 1 }, 'back');
    });
    rowAt(wRows, L, tL); rowAt(rRows, R, tR);
    const tX = blank(w.stamp) ? null : cue(w.stampCue != null ? w.stampCue : w.stamp, Math.min(D - 1.5, tR - 1.2));
    let tXo = null;
    if (tX != null) { slamCue(A, xs, tX, -8); tXo = clauseOut(ctx, tX); if (tXo != null) A.add(xs, tXo, 0.16, { s: 1, o: 1, r: -8 }, { s: 0.75, o: 0, r: -8 }, 'in'); }
    const tB = btn ? cue(btn.cue, tR + 1.2) : null;
    const tBe = btn ? Math.max(tB + 0.6, cueEnd(btn.until, tB + 1.4)) : null;
    const tRoom = SB ? Math.min(SB.tSin - 0.4, cue(stc.roomCue, SB.tSin - 0.4)) : null;
    const F = FX(), fL = F ? F.attach(L) : null, fR = F ? F.attach(R) : null;
    const sws = btn ? Array.from(R.querySelectorAll('.sw i')) : [], swBox = btn ? R.querySelector('.sw') : null, bEl = btn ? R.querySelector('.btn') : null;
    const paint = (dots) => { swBox.style.background = dots[0]; sws.forEach((e, q) => { e.style.background = dots[q + 1] || dots[0]; }); };
    const BASE = ['var(--mk-sw0, var(--mk-paper))', 'var(--mk-sw1, var(--mk-c1))', 'var(--mk-sw2, var(--mk-c2))', 'var(--mk-sw3, var(--mk-c4))'];
    if (btn) paint(BASE);
    let lastSkin = -2;
    A.fn((t) => {
      bck.setAttribute('stroke-dashoffset', (74 * (1 - EASE.out(clamp01((t - tR - 0.7) / 0.25)))).toFixed(1));
      const pu = SB ? EASE.inOut(clamp01((t - tRoom) / 0.35)) : 0, tp = cTop + (cTopS - cTop) * pu;
      [L, R].forEach((e) => { e.style.top = `${tp.toFixed(1)}px`; });
      vs.style.top = `${(tp + ch / 2 - 68).toFixed(1)}px`;
      if (tlx) {
        const a0 = tX != null ? tX : tR - 1.5, a1 = tXo != null ? tXo : a0 + 1.2, nC = tlClips.length;
        tlClips.forEach((cl, j) => {
          const at = a0 + (j / nC) * Math.max(0.4, a1 - a0 - 0.2), p = clamp01((t - at) / 0.18), back = clamp01((t - at - 0.22) / 0.16), on = p * (1 - back);
          cl.e.style.transform = `translate(${(10 * on).toFixed(1)}px, ${(-8 * on).toFixed(1)}px)`;
          cl.e.style.background = t >= at + 0.1 ? 'var(--mk-accent)' : cl.bg;
        });
        tlPh.style.left = `${(clamp01((t - tL) / Math.max(1, (tX != null ? tX : tR) - tL)) * 100).toFixed(2)}%`;
      }
      if (F && data.focus !== false) {
        F.apply(fL, F.stepv(t, [[tL, 1], [tR, -0.6]], 0), 'fade');
        F.apply(fR, F.stepv(t, [[tR, 1]], 0), 'fade');
      }
      if (tX != null) shakeAt(L, t, tX + 0.2, 10);
      // 右卡出现前，左卡（连同印章、时间线）居中放大 1.3 倍；「现在」那一帧起 0.25s 滑回左边的位子
      const LS = +data.soloScale > 0 ? +data.soloScale : 1.45, mv = EASE.inOut(clamp01((t - (tR - 1 / 30)) / 0.25)), ls = LS + (1 - LS) * mv;
      const dx = ((AR.x0 + AR.x1) / 2 - (AR.x0 + cw / 2)) * (1 - mv), dy = -(ls - 1) * ch / 2;
      L.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      L.style.scale = (((F && data.focus !== false) ? (parseFloat(L.style.scale) || 1) : 1) * ls).toFixed(4);
      if (btn) {
        const bx = bEl.offsetLeft + bEl.offsetWidth * 0.55, by = bEl.offsetTop + bEl.offsetHeight * 0.55;
        const pIn = EASE.inOut(clamp01((t - (tB - 0.55)) / 0.5));
        const cx = bx + 230 * (1 - pIn), cy = by + 170 * (1 - pIn), press = t >= tB && t < tB + 0.16 ? 0.86 : 1;
        cursor.style.opacity = (t < tB - 0.55 ? 0 : t > tBe + 0.3 ? clamp01(1 - (t - tBe - 0.3) / 0.2) : 1).toFixed(3);
        cursor.style.transform = `translate(${(cx - 6).toFixed(1)}px, ${(cy - 4).toFixed(1)}px) scale(${press})`;
        const rp = clamp01((t - tB) / 0.45);
        ripple.style.opacity = t < tB || rp >= 1 ? '0' : (1 - rp).toFixed(3);
        ripple.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) scale(${(0.2 + 1.6 * EASE.out(rp)).toFixed(4)})`;
        const kk = t >= tB && t < tB + 0.18 ? 1 : 0;
        bEl.style.translate = `${6 * kk}px ${6 * kk}px`;
        const idx = t < tB + 0.08 ? -1 : Math.min(SK.length - 1, Math.floor((t - tB - 0.08) / Math.max(0.12, (tBe - tB - 0.08) / SK.length)));
        if (idx !== lastSkin) { paint(idx < 0 ? BASE : SK[idx]); lastSkin = idx; }
      }
      if (SB) SB.fn(t);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), cams: [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)] };
  }

  // ============================== stat（单独的大数字条，铺满版式 + cue） ==============================
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator(), AR = ctx.area || AREA0, k = AR.k;
    const el = h('div', 'mk-zone');
    const v = data.value != null ? data.value : (Array.isArray(data.items) && data.items[0] ? data.items[0].value : null);
    const stc = { label: data.label, value: v, unit: data.unit, cue: data.cue, endCue: data.endCue, inCue: data.inCue != null ? data.inCue : data.cue, bar: data.bar };
    const SB = statBar(stc, ctx, A, k * 1.25);
    const sh = 190 * k;
    Object.assign(SB.el.style, { left: `${AR.x0}px`, top: `${(AR.y0 + AR.y1) / 2 - sh / 2}px`, width: `${AR.x1 - AR.x0}px`, height: `${sh}px` });
    el.appendChild(SB.el);
    A.fn(SB.fn);
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), cams: [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)] };
  }

  // ============================== outro（收尾铭牌 + 大横条，actions[].cue 写了才走） ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator(), AR = ctx.area || AREA0, k = AR.k;
    const TS = +data.titleSpace > 0 ? +data.titleSpace : 0;
    const AW = (AR.x1 - AR.x0) / k, AH = (AR.y1 - AR.y0) / k - TS;
    const X = (u) => AR.x0 + u * k, Y = (v) => AR.y0 + (v + TS) * k, S = (p) => p * k;
    const cue = (c, fb = null) => (ctx.cue ? ctx.cue(c, fb) : fb);
    const el = h('div', 'mk-zone');
    const acts = (data.actions || []).map((a) => (typeof a === 'string' ? { title: a } : a || {})).filter((a) => !blank(a.title)).slice(0, 3);
    const c = data.cta || {}, hasBan = !blank(c.title);
    const BH = hasBan ? 116 : 0, GAP = hasBan ? 60 : 0, boardH = AH - BH - GAP, PAD = 26;
    let board = null;
    if (data.board !== false) {
      board = h('div', 'mk-box lg mk-board', `left:${X(0)}px;top:${Y(0)}px;width:${S(AW)}px;height:${S(boardH)}px;`);
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => board.appendChild(h('i', 'mk-screw', `${a ? 'right' : 'left'}:${S(5)}px;${b ? 'bottom' : 'top'}:${S(5)}px;width:${S(16)}px;height:${S(16)}px;`)));
      el.appendChild(board);
    }
    const n = acts.length, iw = AW - PAD * 2, ih = boardH - PAD * 2, half = (iw - PAD) / 2, h1 = (ih - PAD) * 0.53, h2 = ih - PAD - h1;
    const geo = n === 1 ? [[PAD, PAD, iw, ih]] : n === 2 ? [[PAD, PAD, half, ih], [PAD * 2 + half, PAD, half, ih]]
      : [[PAD, PAD, half, h1], [PAD * 2 + half, PAD, half, h1], [PAD, PAD * 2 + h1, iw, h2]];
    const BGI = [1, 3, 4], DEF_IC = ['unlock', 'gift', 'nocode'];
    const plates = acts.map((a, i) => {
      const [u, v, w, hh] = geo[i], ics = Math.min(hh * 0.5, 150), txt = String(a.title);
      const fz = Math.round(Math.min(200, hh * 0.6, (w - ics - 110) / Math.max(1, Array.from(txt).length)));
      return h('div', 'mk-box lg mk-plate', `left:${X(u)}px;top:${Y(v)}px;width:${S(w)}px;height:${S(hh)}px;background-color:var(--mk-c${BGI[i]});color:var(--mk-on${BGI[i]});--mk-glow:var(--mk-c${BGI[i]});padding:0 ${S(46)}px 0 ${S(50)}px;`,
        `<div class="tx" style="font-size:${S(fz)}px;">${esc(txt)}</div><div class="ic" style="width:${S(ics)}px;height:${S(ics)}px;">${ICON[a.icon] || ICON[DEF_IC[i]]}</div>`);
    });
    plates.forEach((p) => el.appendChild(p));
    const ban = hasBan ? h('div', 'mk-banner', `left:${X(0)}px;top:${Y(AH - BH - 24)}px;width:${S(AW)}px;height:${S(BH)}px;padding:0 ${S(40)}px;font-size:${S(Math.max(56, Math.min(64, (AW - 200) / Math.max(1, Array.from(String(c.title)).length))))}px;`,
      `<span>${esc(c.title)}</span><span class="ar">${ARROW(S(86), S(56))}</span>`) : null;
    if (ban) el.appendChild(ban);
    const tc = acts.map((a, i) => cue(a.cue != null ? a.cue : a.title, 0.6 + i * 0.6));
    const REST = [-1.2, 1.1, -0.6];
    plates.forEach((p, i) => { A.add(p, -1, 0.01, { o: 0 }, { o: 0 }); A.add(p, tc[i], 0.32, { s: 1.1, o: 0.45, r: REST[i] * 3 }, { s: 1, o: 1, r: REST[i] }, 'slam'); });
    if (board) {
      const tb = tc.length && tc[0] != null ? tc[0] : 0;
      board.style.transformOrigin = '50% 0%';
      A.add(board, -1, 0.01, { o: 0, r: -0.4 }, { o: 0, r: -0.4 }); A.add(board, tb, 0.24, { s: 1.03, o: 0.5, r: -1.2 }, { s: 1, o: 1, r: -0.4 }, 'slam');
      if (n === 3 && Number.isFinite(tc[2]) && data.boardGrow !== false) {   // v3.5 收尾：底板跟着铭牌长，第三块的词前 0.06s 起 0.2s 长到全高
        const h0 = PAD * 2 + h1;
        A.fn((t) => { board.style.height = `${S(h0 + (boardH - h0) * EASE.out(clamp01((t - (tc[2] - 0.06)) / 0.2))).toFixed(1)}px`; });
      }
    }
    const tB = ban ? cue(c.cue != null ? c.cue : c.title, null) : null;
    if (ban) { A.add(ban, -1, 0.01, { o: 0 }, { o: 0 }); A.add(ban, tB == null ? D - 1.5 : tB, 0.3, { x: -S(80), o: 0.45, r: 0.8 }, { x: 0, o: 1, r: -0.4 }, 'back'); }
    const F = FX(), fo = F && data.focus !== false ? plates.map((p) => F.attach(p)) : null;
    if (fo) A.fn((t) => {
      const f = F.track(t, tc);
      fo.forEach((o, i) => { let v = f[i]; if (tB != null && t >= tB) v += (-0.75 - v) * clamp01((t - tB) / 0.16); F.apply(o, v, 'fade'); });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t), cams: [CAM(0, 700, 500, 1.0, 0.3, -0.4, 0), CAM(D, 700, 500, 1.012, 0.2, 0.4, 0)] };
  }

  const KIT = { cover, steps, compare, stat, outro };

  /**
   * 宿主页入口：要不要走 CueKit（剧本写了新字段才走；不写返回 null，宿主页走风格包原版组件 → 逐帧不变）。
   *   cover：写了 parts；steps / compare / stat：铺满版式（ctx.area）且读到了 cue；outro：actions 里写了 cue。
   */
  function wants(type, data, ctx) {
    const d = data || {}, c = (x) => ctx && ctx.cue && x != null && ctx.cue(x, null) != null;
    if (type === 'cover') return Array.isArray(d.parts) && d.parts.length > 0;
    if (type === 'outro') return Array.isArray(d.actions) && d.actions.some((a) => a && typeof a === 'object' && a.cue != null);
    if (!ctx || !ctx.area) return false;
    if (type === 'steps') return Array.isArray(d.items) && d.items.some((it) => it && c(it.cue));
    if (type === 'compare') return c((d.wrong || {}).cue) || c((d.right || {}).cue);
    if (type === 'stat') return d.value != null && c(d.cue);
    return false;
  }
  function create(type, data, ctx) {
    if (!wants(type, data, ctx)) return null;
    injectCSS();
    const comp = KIT[type](data || {}, ctx);
    // 建好就先按「本段开始前」渲染一次：宿主页只更新当前段 ±1 段，转场运镜扫过更远的段时，
    // 它的卡 / 数字条不能以默认的完全可见状态露出来（不带字的封面装饰本来就第 0 帧在，照样在）
    try { comp.update(-1); } catch (_) {}
    return comp;
  }

  MHEngine.CueKit = { create, wants, injectCSS, ICON, KIT, swatches: null };
})(window);
