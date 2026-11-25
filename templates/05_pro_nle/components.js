/**
 * Mushanhe Video Engine — 风格包 05 · 未来感 Pro NLE 多轨剪辑台（Pro NLE Studio）
 * ---------------------------------------------------------------------------
 * 与 06_neobrutalism / 02_swiss_print 完全相同的组件签名与 { meta, theme, scenes } 剧本格式，10 大句型：
 * cover · steps · checklist · compare · showcase[code|terminal|doc|image|video|product] · quote · outro · stat · timeline · diagram
 *
 *   const comp = ProNLE.COMPONENTS[type].create(data, ctx)
 *     data : 剧本 JSON 中 scene.data（字段与 06 完全一致，同一份剧本可跨风格包复用）
 *     ctx  : { dur }  本段时长（秒）
 *   返回   : {
 *     el      : HTMLElement  组件根节点（1240×620 的局部坐标区 = 主监视器画面；可选 w 加宽，如 timeline）
 *     layer   : 'world' | 'screen'   world=挂在监视器内的 3D 画布上 / screen=屏幕层（全屏人像上的取景器贴卡）
 *     avatar  : 'card' | 'pip' | 'corner' | 'full'
 *     cams    : [{ t, x, y, zoom, rx, ry, rz }]  局部坐标运镜关键帧（交给 core/camera-rig.js）
 *     update(localT)                 按本段局部时间渲染（确定性，任意 seek 可还原）
 *   }
 *
 * 局部坐标安全区：x 40–1200，y 30–600（宿主页把 1240×620 区域放进 Program Monitor 画面区）。
 * 物理参数：#0A0D12 演播室底 · #171D28→#10151E 面板渐变 · 1.5px rgba(255,255,255,.11) 细边 · 12px 面板圆角 / 6px 片段圆角
 *          · 等宽大写 0.14em 字距标签 · 青 #38BDF8 / 翡翠 #00E5C3 / 琥珀 #FFB84D / 绯红 #FF3B5C 监视器高光辉光。
 * 动效语言：开机自检打字 · 光纤传包 · 手风琴逐条展开 · IDE 实时打字 · 红框标注 · 渲染进度条 · LED 电平表。
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
    expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

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
        el.style.opacity = clamp01(st.o).toFixed(3);
      });
      this.fns.forEach((f) => f(t));
    }
  }

  const ACC = ['var(--pn-cyan)', 'var(--pn-jade)', 'var(--pn-amber)', 'var(--pn-crimson)'];

  // ============================== 纯 SVG 实体道具 ==============================
  const PROPS = {
    check(size = 28, color = '#061014', stroke = 5) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 30 30" style="overflow:visible;display:block"><path class="pn-ck" d="M5 15.5 L12.5 23 L25.5 8" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="34" stroke-dashoffset="34"/></svg>`;
    },
    /** 电影机线稿（产品图占位） */
    camera() {
      return `<svg viewBox="0 0 420 300"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round">
        <rect x="70" y="96" width="210" height="130" rx="12" fill="#121A26"/>
        <rect x="110" y="62" width="120" height="34" rx="6" fill="#121A26"/>
        <path d="M280 120 L340 96 L340 226 L280 202 Z" fill="#121A26"/>
        <circle cx="365" cy="161" r="40" fill="#0B1018"/><circle cx="365" cy="161" r="24" stroke="var(--pn-cyan)"/>
        <rect x="30" y="112" width="40" height="60" rx="6" fill="#121A26"/>
        <path d="M120 226 L110 270 M230 226 L240 270 M100 270 H250"/></g>
        <circle cx="365" cy="161" r="10" fill="var(--pn-cyan)"/>
        <rect x="92" y="118" width="96" height="62" rx="5" fill="#0B1018" stroke="var(--pn-jade)" stroke-width="3"/>
        <circle cx="252" cy="118" r="7" fill="var(--pn-crimson)"/>
        <rect x="100" y="190" width="70" height="8" rx="4" fill="var(--pn-amber)"/>
        <text x="210" y="296" text-anchor="middle" font-family="Consolas, monospace" font-size="15" font-weight="800" fill="#64748B" letter-spacing="4">PRODUCT IMAGE</text></svg>`;
    }
  };

  function kicker(text, style) { return h('div', 'pn-kicker', style, esc(text)); }
  function head(text, style) { return h('div', 'pn-head', style, mark(text)); }
  /** 监视器高光印章：发光描边胶囊 */
  function badge(text, small, color, style) {
    return h('div', 'pn-badge', `--c:${color};${style || ''}`, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`);
  }
  function chip(text, color, style) { return h('div', 'pn-chip', `color:${color};${style || ''}`, esc(text)); }
  function winbar(title, right) {
    return `<div class="pn-bar"><i></i><i></i><i></i><span class="tab">${esc(title)}</span>${right ? `<span class="r">${right}</span>` : ''}</div>`;
  }
  /** "这句**关键词**话" → ** 包裹部分做翡翠高亮块 */
  function mark(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br/>'); }
  /** 文本宽度超出可用宽时按比例缩小字号（首帧测量一次） */
  function fitWidth(el, avail) {
    const w = el.scrollWidth; if (w > avail && w > 0) el.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(el).fontSize) * avail / w)}px`;
    return w > 0;
  }

  // ============================== 样式注入（主题色走 CSS 变量） ==============================
  const CSS = `
  .pn-zone{position:absolute;width:1240px;height:620px;font-family:var(--pn-font-cn);color:var(--pn-text)}
  .pn-zone *,.pn-scr *{box-sizing:border-box}
  .pn-kicker{position:absolute;display:inline-flex;align-items:center;gap:10px;padding:5px 12px;border-radius:5px;border:1px solid ${mix('var(--pn-cyan)', 50)};background:${mix('var(--pn-cyan)', 12)};color:var(--pn-cyan);font-family:var(--pn-font-mono);font-size:15px;font-weight:800;letter-spacing:.16em;white-space:nowrap}
  .pn-kicker::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
  .pn-head{position:absolute;font-size:56px;font-weight:900;letter-spacing:-.005em;line-height:1.12;color:#fff;white-space:nowrap;text-shadow:0 4px 24px rgba(0,0,0,.6)}
  .pn-zone em,.pn-scr em{font-style:normal;color:#061014;background:var(--pn-jade);padding:0 .14em;border-radius:6px;box-shadow:0 0 22px ${mix('var(--pn-jade)', 45)};text-shadow:none}
  .pn-panel{position:absolute;border-radius:12px;background:linear-gradient(180deg,#171D28 0%,#10151E 100%);border:1.5px solid rgba(255,255,255,.11);box-shadow:0 22px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08)}
  .pn-chip{position:absolute;z-index:6;padding:6px 14px;border-radius:6px;font-family:var(--pn-font-mono);font-size:16px;font-weight:900;letter-spacing:.1em;white-space:nowrap;border:1.5px solid currentColor;background:rgba(8,12,18,.92);box-shadow:0 0 18px rgba(0,0,0,.4)}
  .pn-badge{position:absolute;z-index:8;padding:10px 24px 12px;border-radius:10px;border:3px solid var(--c);color:var(--c);background:rgba(10,13,18,.95);font-weight:900;line-height:1.05;text-align:center;white-space:nowrap;
    box-shadow:0 0 0 4px rgba(10,13,18,.85),0 0 34px ${mix('var(--c)', 55)},inset 0 0 20px ${mix('var(--c)', 22)};text-shadow:0 0 16px ${mix('var(--c)', 70)}}
  .pn-badge small{display:block;font-family:var(--pn-font-mono);font-size:.36em;letter-spacing:.24em;margin-top:6px}
  .pn-bar{height:40px;display:flex;align-items:center;gap:8px;padding:0 16px;background:linear-gradient(180deg,#1B2230,#141A24);border-bottom:1px solid rgba(255,255,255,.1);border-radius:11px 11px 0 0;font-family:var(--pn-font-mono);font-size:13px;font-weight:800;color:#94A3B8;letter-spacing:.12em;white-space:nowrap}
  .pn-bar i{width:11px;height:11px;border-radius:50%;background:var(--pn-crimson);display:inline-block}
  .pn-bar i:nth-child(2){background:var(--pn-amber)}.pn-bar i:nth-child(3){background:var(--pn-jade)}
  .pn-bar .tab{margin-left:10px;padding:4px 12px;border-radius:5px;background:${mix('var(--pn-cyan)', 14)};border:1px solid ${mix('var(--pn-cyan)', 45)};color:#7DD3FC}
  .pn-bar .r{margin-left:auto;color:#64748B}
  .pn-led{position:absolute;display:flex;align-items:center;gap:9px;font-family:var(--pn-font-mono);font-size:14px;font-weight:800;color:var(--pn-jade);letter-spacing:.14em;white-space:nowrap}
  .pn-led i{width:8px;height:8px;border-radius:50%;background:var(--pn-jade);box-shadow:0 0 10px var(--pn-jade)}
  /* cover */
  .pn-cover-title{position:absolute;left:40px;top:78px;font-size:120px;font-weight:900;letter-spacing:-.02em;line-height:1.08;white-space:nowrap;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)}
  .pn-cover-title span{display:inline-block}
  .pn-cover-title span.g{background-image:linear-gradient(90deg,var(--pn-cyan),var(--pn-jade),var(--pn-amber));-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 0 18px ${mix('var(--pn-jade)', 35)})}
  .pn-cover-ch{left:900px;top:84px;width:300px;height:226px;overflow:hidden;border-color:${mix('var(--pn-cyan)', 40)}}
  .pn-cover-ch .l{position:absolute;left:20px;top:18px;font-family:var(--pn-font-mono);font-size:14px;font-weight:900;letter-spacing:.22em;color:var(--pn-cyan)}
  .pn-cover-ch .m{position:absolute;right:20px;top:18px;font-family:var(--pn-font-mono);font-size:12px;font-weight:800;letter-spacing:.12em;color:#64748B}
  .pn-cover-ch .n{position:absolute;left:14px;bottom:-14px;font-family:var(--pn-font-mono);font-size:168px;font-weight:900;letter-spacing:-.06em;line-height:1;background:linear-gradient(180deg,#FFFFFF 0%,var(--pn-cyan) 70%,#0B4A6E 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .pn-cover-ch .sc{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(56,189,248,.05) 0 2px,transparent 2px 4px);pointer-events:none}
  .pn-cover-sub{left:40px;top:370px;width:560px;height:140px;padding:22px 28px;font-size:32px;font-weight:900;line-height:1.42;color:#fff;border-left:4px solid var(--pn-jade);white-space:nowrap}
  .pn-boot{left:630px;top:370px;width:570px;height:140px;padding:18px 22px;font-family:var(--pn-font-mono);font-size:16px;font-weight:800;line-height:34px;color:#CBD5E1;white-space:nowrap;overflow:hidden}
  .pn-boot .ok{color:var(--pn-jade);font-weight:900;margin-right:10px}
  .pn-boot .cur{display:inline-block;width:9px;height:17px;background:var(--pn-cyan);vertical-align:-2px;margin-left:2px}
  .pn-track{position:absolute;height:10px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;border:1px solid rgba(255,255,255,.08)}
  .pn-track i{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:99px;transform-origin:left center;background:linear-gradient(90deg,var(--pn-cyan),var(--pn-jade),var(--pn-amber));box-shadow:0 0 18px ${mix('var(--pn-jade)', 60)}}
  .pn-meta{position:absolute;font-family:var(--pn-font-mono);font-size:14px;font-weight:800;letter-spacing:.14em;color:#64748B;white-space:nowrap}
  /* stat */
  .pn-stat{top:168px;height:300px;padding:22px 26px;overflow:hidden}
  .pn-stat.hot{border-color:${mix('var(--pn-cyan)', 60)};box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 36px ${mix('var(--pn-cyan)', 22)},inset 0 1px 0 rgba(255,255,255,.08)}
  .pn-stat .lb{display:inline-block;padding:5px 12px;border-radius:5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:20px;font-weight:900;color:#CBD5E1;white-space:nowrap}
  .pn-stat.hot .lb{background:${mix('var(--pn-cyan)', 16)};border-color:${mix('var(--pn-cyan)', 50)};color:#fff}
  .pn-stat .num{position:absolute;left:26px;top:76px;font-family:var(--pn-font-mono);font-weight:900;letter-spacing:-.05em;line-height:1;white-space:nowrap;color:#fff}
  .pn-stat.hot .num{color:var(--pn-jade);text-shadow:0 0 34px ${mix('var(--pn-jade)', 50)}}
  .pn-stat .num .u,.pn-stat .num .pf{font-family:var(--pn-font-cn);font-size:.24em;letter-spacing:0;margin-left:.2em;color:#94A3B8;text-shadow:none}
  .pn-stat .num .pf{margin:0 .1em 0 0}
  .pn-meter{position:absolute;left:26px;right:26px;top:222px;height:24px;display:flex;gap:3px}
  .pn-meter s{flex:1;border-radius:2px;background:rgba(255,255,255,.06);text-decoration:none}
  .pn-stat .sc{position:absolute;left:26px;right:26px;top:256px;display:flex;justify-content:space-between;font-family:var(--pn-font-mono);font-size:14px;font-weight:800;letter-spacing:.14em;color:#64748B}
  .pn-note{position:absolute;padding:10px 18px;border-radius:8px;background:rgba(8,12,18,.9);border:1.5px solid rgba(255,255,255,.14);border-left:4px solid var(--pn-cyan);font-size:24px;font-weight:900;color:#E2E8F0;white-space:nowrap}
  .pn-note small{font-family:var(--pn-font-mono);font-size:13px;letter-spacing:.16em;color:var(--pn-cyan);margin-right:12px}
  /* steps */
  .pn-node{top:196px;height:214px;overflow:hidden;transition:none}
  .pn-node .hd{height:44px;display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.08);font-family:var(--pn-font-mono);font-size:13px;font-weight:800;letter-spacing:.14em;color:#64748B}
  .pn-node .no{padding:3px 9px;border-radius:5px;background:var(--a);color:#061014;font-size:15px;font-weight:900;letter-spacing:.04em}
  .pn-node .pt{margin-left:auto;width:12px;height:12px;border-radius:50%;border:2px solid var(--a);background:#0B0F16}
  .pn-node .nm{position:absolute;left:18px;right:12px;top:66px;font-size:44px;font-weight:900;color:#fff;white-space:nowrap}
  .pn-node .fn{position:absolute;left:14px;right:14px;bottom:16px;padding:9px 12px;border-radius:6px;background:#0B0F16;border:1px solid rgba(255,255,255,.1);font-family:var(--pn-font-mono);font-size:16px;font-weight:800;color:#94A3B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pn-node.on{border-color:var(--a);box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 30px ${mix('var(--a)', 30)},inset 0 1px 0 rgba(255,255,255,.08)}
  .pn-node.on .fn{color:var(--a);border-color:${mix('var(--a)', 45)}}
  .pn-rail{position:absolute;left:40px;top:438px;width:1160px;height:4px;border-radius:2px;background:rgba(255,255,255,.08)}
  .pn-rail i{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:2px;transform-origin:left center;background:linear-gradient(90deg,var(--pn-cyan),var(--pn-jade),var(--pn-amber),var(--pn-crimson));box-shadow:0 0 14px ${mix('var(--pn-jade)', 70)}}
  .pn-stub{position:absolute;top:410px;width:2px;height:30px;background:rgba(255,255,255,.12)}
  .pn-pkt{position:absolute;top:432px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:#fff;box-shadow:0 0 10px #fff,0 0 22px var(--a),0 0 40px var(--a);z-index:3}
  .pn-bin{left:40px;top:470px;width:1160px;height:84px;display:flex;align-items:center;gap:20px;padding:0 24px}
  .pn-bin .f{font-family:var(--pn-font-mono);font-size:24px;font-weight:900;color:var(--pn-cyan);letter-spacing:.04em;white-space:nowrap}
  .pn-bin .b{padding:4px 14px;border-radius:6px;background:var(--pn-amber);color:#0B0F16;font-family:var(--pn-font-mono);font-size:30px;font-weight:900;white-space:nowrap}
  .pn-bin .m{margin-left:auto;font-family:var(--pn-font-mono);font-size:13px;font-weight:800;letter-spacing:.12em;color:#64748B;line-height:1.5;text-align:right;white-space:nowrap}
  .pn-bin .lbl{padding:8px 16px;border-radius:7px;border:1.5px solid var(--pn-jade);background:${mix('var(--pn-jade)', 14)};color:#fff;font-size:24px;font-weight:900;white-space:nowrap;box-shadow:0 0 20px ${mix('var(--pn-jade)', 30)}}
  .pn-bin .lbl small{font-family:var(--pn-font-mono);font-size:12px;letter-spacing:.16em;color:var(--pn-jade);margin-left:10px}
  /* checklist（IDE 手风琴） */
  .pn-ide{left:170px;top:12px;width:900px;height:596px;overflow:hidden}
  .pn-ide .ttl{position:absolute;left:30px;top:56px;font-family:var(--pn-font-mono);font-size:52px;font-weight:900;color:#fff;letter-spacing:-.02em;white-space:nowrap}
  .pn-ide .sub{position:absolute;left:32px;top:122px;font-size:22px;font-weight:800;color:#94A3B8;white-space:nowrap}
  .pn-ide .hr{position:absolute;left:28px;right:28px;top:164px;height:1px;background:rgba(255,255,255,.1)}
  .pn-ide .pass{position:absolute;right:26px;top:64px;padding:6px 14px;border-radius:6px;font-family:var(--pn-font-mono);font-size:16px;font-weight:900;letter-spacing:.1em;border:1.5px solid #475569;color:#64748B}
  .pn-ide .pass.ok{border-color:var(--pn-jade);color:var(--pn-jade);box-shadow:0 0 18px ${mix('var(--pn-jade)', 35)}}
  .pn-acc{position:absolute;left:28px;right:28px;border-radius:9px;border:1px solid rgba(255,255,255,.07);border-left:3px solid rgba(255,255,255,.12);background:rgba(255,255,255,.02);overflow:hidden}
  .pn-acc.open{border-color:${mix('var(--a)', 55)};border-left-color:var(--a);background:${mix('var(--a)', 9)}}
  .pn-acc .no{position:absolute;left:16px;top:17px;font-family:var(--pn-font-mono);font-size:15px;font-weight:900;color:#475569}
  .pn-acc .box{position:absolute;left:52px;top:13px;width:30px;height:30px;border-radius:7px;border:2px solid #475569}
  .pn-acc .box svg{position:absolute;left:-1px;top:-1px}
  .pn-acc.done .box{background:var(--a);border-color:var(--a);box-shadow:0 0 14px ${mix('var(--a)', 60)}}
  .pn-acc .k{position:absolute;left:100px;top:9px;font-size:28px;font-weight:900;color:#E2E8F0;white-space:nowrap}
  .pn-acc .bd{position:absolute;right:16px;top:16px;padding:3px 10px;border-radius:5px;font-family:var(--pn-font-mono);font-size:12px;font-weight:900;letter-spacing:.12em;background:rgba(255,255,255,.06);color:#64748B}
  .pn-acc.open .bd,.pn-acc.done .bd{background:var(--a);color:#061014}
  .pn-acc .d{position:absolute;left:100px;right:20px;top:58px;padding:8px 14px;border-radius:7px;background:rgba(0,0,0,.36);border-left:3px solid var(--a);font-size:20px;font-weight:800;color:#CBD5E1;white-space:nowrap}
  .pn-memo{position:absolute;left:28px;right:28px;bottom:20px;height:62px;display:flex;align-items:center;gap:16px;padding:0 20px;border-radius:9px;background:${mix('var(--pn-amber)', 10)};border:1.5px solid ${mix('var(--pn-amber)', 55)};font-size:28px;font-weight:900;color:#fff;white-space:nowrap}
  .pn-memo small{font-family:var(--pn-font-mono);font-size:14px;letter-spacing:.14em;color:var(--pn-amber)}
  /* compare */
  .pn-cmp{top:166px;width:530px;height:304px;overflow:visible}
  .pn-cmp .band{height:46px;display:flex;align-items:center;padding:0 22px;border-radius:11px 11px 0 0;font-family:var(--pn-font-mono);font-size:17px;font-weight:900;letter-spacing:.14em;white-space:nowrap}
  .pn-cmp.wrong .band{background:${mix('var(--pn-crimson)', 16)};color:#FFB3C0;border-bottom:1px solid ${mix('var(--pn-crimson)', 45)}}
  .pn-cmp.right{border-color:${mix('var(--pn-jade)', 55)};box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 34px ${mix('var(--pn-jade)', 18)}}
  .pn-cmp.right .band{background:${mix('var(--pn-jade)', 16)};color:var(--pn-jade);border-bottom:1px solid ${mix('var(--pn-jade)', 45)}}
  .pn-cmp .t{position:absolute;left:28px;top:70px;font-size:48px;font-weight:900;line-height:1.16;white-space:nowrap;color:#fff}
  .pn-cmp.wrong .t{color:#7C8696}
  .pn-cmp .d{position:absolute;left:28px;right:28px;top:210px;font-size:21px;font-weight:800;line-height:1.5;color:#CBD5E1}
  .pn-cmp.wrong .d{color:#64748B}
  .pn-redbox{position:absolute;left:14px;top:62px;border:3px solid var(--pn-crimson);border-radius:9px;background:${mix('var(--pn-crimson)', 8)};box-shadow:0 0 24px ${mix('var(--pn-crimson)', 45)}}
  .pn-redbox b{position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;background:var(--pn-crimson);color:#fff;font-family:var(--pn-font-mono);font-size:17px;font-weight:900;display:flex;align-items:center;justify-content:center}
  .pn-cmp svg.strike{position:absolute;left:20px;top:70px;overflow:visible}
  .pn-cmp .ok{position:absolute;right:-18px;top:-22px;width:64px;height:64px;border-radius:50%;background:var(--pn-jade);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px #0B0F16,0 0 30px ${mix('var(--pn-jade)', 70)}}
  .pn-vs{position:absolute;left:580px;top:278px;width:80px;height:80px;border-radius:50%;background:#0B0F16;border:2px solid var(--pn-amber);display:flex;align-items:center;justify-content:center;font-family:var(--pn-font-mono);font-size:28px;font-weight:900;color:var(--pn-amber);box-shadow:0 0 26px ${mix('var(--pn-amber)', 40)};z-index:5}
  .pn-verdict{left:40px;top:500px;width:1160px;height:84px;display:flex;align-items:center;gap:22px;padding:0 26px;z-index:6;border-color:${mix('var(--pn-amber)', 50)}}
  .pn-verdict b{padding:6px 14px;border-radius:6px;background:var(--pn-amber);color:#0B0F16;font-family:var(--pn-font-mono);font-size:16px;letter-spacing:.18em;white-space:nowrap}
  .pn-verdict span{font-size:36px;font-weight:900;color:#fff;white-space:nowrap}
  /* showcase */
  .pn-show{left:40px;top:150px;width:1160px;height:446px;overflow:hidden;background:#0B0F16}
  .pn-code{position:absolute;left:0;right:0;top:40px;bottom:0;padding:18px 0;font-family:var(--pn-font-mono);font-size:24px;font-weight:700;line-height:1.62;white-space:pre;color:#E2E8F0}
  .pn-code .row{display:block;padding:0 26px}
  .pn-code .row.hi{background:${mix('var(--pn-cyan)', 14)};box-shadow:inset 3px 0 0 var(--pn-cyan)}
  .pn-code .ln{display:inline-block;width:52px;color:#475569}
  .pn-code .c{color:#64748B}.pn-code .k{color:var(--pn-cyan)}.pn-code .ok{color:var(--pn-jade)}.pn-code .s{color:var(--pn-amber)}
  .pn-code .cur{display:inline-block;width:.6em;height:1.05em;vertical-align:-.15em;background:var(--pn-cyan);box-shadow:0 0 10px var(--pn-cyan)}
  .pn-code.doc{font-family:var(--pn-font-cn);font-size:28px;font-weight:800}
  .pn-media{position:absolute;left:0;right:0;top:40px;width:100%;height:calc(100% - 40px);object-fit:cover;background:#000}
  .pn-prod{position:absolute;left:0;right:0;top:40px;bottom:0}
  .pn-prod .pic{position:absolute;left:22px;top:22px;bottom:22px;width:400px;border-radius:10px;border:1.5px solid ${mix('var(--pn-cyan)', 35)};display:flex;align-items:center;justify-content:center;overflow:hidden;color:#CBD5E1;
    background:radial-gradient(circle at 50% 45%,${mix('var(--pn-cyan)', 18)} 0%,transparent 62%),linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px),#0D131C;background-size:auto,24px 24px,24px 24px,auto}
  .pn-prod .pic img{width:100%;height:100%;object-fit:contain}
  .pn-prod .pic svg{width:84%;height:auto}
  .pn-prod .pic .cb{position:absolute;width:18px;height:18px;border-color:var(--pn-cyan);border-style:solid;border-width:0}
  .pn-prod .info{position:absolute;left:452px;right:30px;top:22px}
  .pn-prod .nm{font-size:42px;font-weight:900;line-height:1.1;color:#fff;white-space:nowrap}
  .pn-prod .tg{display:inline-block;margin-top:10px;padding:4px 12px;border-radius:6px;background:${mix('var(--pn-jade)', 14)};border:1.5px solid var(--pn-jade);color:var(--pn-jade);font-size:19px;font-weight:900;white-space:nowrap}
  .pn-prod .specs{margin-top:14px;border-top:1px solid rgba(255,255,255,.14)}
  .pn-prod .row{display:flex;justify-content:space-between;align-items:center;gap:20px;height:44px;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap}
  .pn-prod .row .k{font-family:var(--pn-font-mono);font-size:15px;font-weight:800;letter-spacing:.12em;color:#64748B}
  .pn-prod .row .v{font-size:22px;font-weight:900;color:#E2E8F0}
  .pn-call{position:absolute;display:flex;align-items:center;z-index:7}
  .pn-call .dot{width:14px;height:14px;border-radius:50%;background:var(--a);box-shadow:0 0 0 4px ${mix('var(--a)', 25)},0 0 16px var(--a)}
  .pn-call .ln{width:54px;height:2px;background:var(--a)}
  .pn-call span{padding:8px 14px;border-radius:7px;background:rgba(8,12,18,.94);border:1.5px solid var(--a);color:#fff;font-size:21px;font-weight:900;white-space:nowrap;box-shadow:0 0 18px ${mix('var(--a)', 35)}}
  /* quote（屏幕层 · 取景器） */
  .pn-scr{position:absolute;inset:0;pointer-events:none;font-family:var(--pn-font-cn)}
  .pn-vf{position:absolute;width:56px;height:56px;border-color:rgba(255,255,255,.75);border-style:solid;border-width:0}
  .pn-rec{position:absolute;left:96px;top:92px;display:flex;align-items:center;gap:10px;padding:6px 14px;border-radius:6px;background:rgba(8,12,18,.78);font-family:var(--pn-font-mono);font-size:17px;font-weight:900;letter-spacing:.12em;color:#fff}
  .pn-rec i{width:10px;height:10px;border-radius:50%;background:var(--pn-crimson);box-shadow:0 0 10px var(--pn-crimson)}
  .pn-q{position:absolute;top:200px;width:fit-content;min-width:400px;max-width:560px;padding:30px 36px 34px;border-radius:14px;background:rgba(8,12,18,.88);border:1.5px solid rgba(255,255,255,.14);border-left:5px solid var(--pn-amber);box-shadow:0 30px 70px rgba(0,0,0,.6),0 0 40px ${mix('var(--pn-amber)', 14)}}
  .pn-q .k{display:inline-block;padding:5px 12px;border-radius:5px;background:${mix('var(--pn-amber)', 16)};border:1px solid ${mix('var(--pn-amber)', 55)};color:var(--pn-amber);font-family:var(--pn-font-mono);font-size:15px;font-weight:900;letter-spacing:.18em}
  .pn-q .t{font-size:58px;font-weight:900;line-height:1.3;margin-top:18px;color:#fff}
  .pn-q .by{margin-top:20px;font-family:var(--pn-font-mono);font-size:16px;font-weight:800;letter-spacing:.12em;color:#94A3B8}
  /* outro */
  .pn-job{left:40px;width:560px;height:120px;padding:16px 20px;overflow:hidden}
  .pn-job .tg{display:inline-block;padding:3px 10px;border-radius:5px;background:var(--a);color:#061014;font-family:var(--pn-font-mono);font-size:14px;font-weight:900;letter-spacing:.14em}
  .pn-job .t{position:absolute;left:20px;top:46px;font-size:32px;font-weight:900;color:#fff;white-space:nowrap}
  .pn-job .d{position:absolute;left:20px;top:88px;font-family:var(--pn-font-mono);font-size:15px;font-weight:800;color:#64748B;white-space:nowrap}
  .pn-job .st{position:absolute;right:20px;top:56px;font-family:var(--pn-font-mono);font-size:15px;font-weight:900;letter-spacing:.1em;color:#94A3B8;white-space:nowrap}
  .pn-job .st.ok{color:var(--pn-jade)}
  .pn-job .no{position:absolute;right:18px;top:12px;font-family:var(--pn-font-mono);font-size:30px;font-weight:900;color:transparent;-webkit-text-stroke:1.5px #475569;line-height:1}
  .pn-job .pb{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.06)}
  .pn-job .pb i{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left center;background:var(--a);box-shadow:0 0 12px var(--a)}
  .pn-cta{left:640px;top:160px;width:560px;height:400px;padding:26px 30px;border-color:${mix('var(--pn-cyan)', 55)};box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 40px ${mix('var(--pn-cyan)', 18)},inset 0 1px 0 rgba(255,255,255,.08)}
  .pn-cta .k{display:inline-block;padding:5px 12px;border-radius:5px;background:${mix('var(--pn-cyan)', 14)};border:1px solid ${mix('var(--pn-cyan)', 50)};color:var(--pn-cyan);font-family:var(--pn-font-mono);font-size:15px;font-weight:900;letter-spacing:.18em}
  .pn-cta .t{font-size:52px;font-weight:900;margin-top:14px;line-height:1.12;color:#fff;white-space:nowrap}
  .pn-cta .repo{margin-top:18px;height:54px;padding:0 16px;display:flex;align-items:center;border-radius:8px;background:#0B0F16;border:1px solid rgba(255,255,255,.12);font-family:var(--pn-font-mono);font-size:17px;font-weight:800;color:#E2E8F0;white-space:nowrap;overflow:hidden}
  .pn-cta .repo .p{color:var(--pn-jade);margin-right:12px}
  .pn-cta .btns{display:flex;gap:14px;margin-top:22px}
  .pn-cta .btns span{flex:1;height:62px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1.5px solid var(--a);color:#fff;font-size:28px;font-weight:900;background:${mix('var(--a)', 8)}}
  .pn-cta .ex{position:absolute;left:30px;bottom:26px;font-family:var(--pn-font-mono);font-size:14px;font-weight:800;letter-spacing:.12em;color:#64748B;white-space:nowrap}
  /* timeline */
  .pn-tl-ruler{position:absolute;left:40px;top:362px;height:16px;border-radius:4px;background:#141A24;border:1px solid rgba(255,255,255,.08);
    background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 1px,transparent 1px 20px);background-size:100% 7px;background-repeat:no-repeat;background-position:0 bottom}
  .pn-tl-fill{position:absolute;left:40px;top:368px;height:4px;transform-origin:left center;background:linear-gradient(90deg,var(--pn-cyan),var(--pn-jade));box-shadow:0 0 12px var(--pn-jade)}
  .pn-tl-ph{position:absolute;top:336px;width:2.5px;height:66px;margin-left:-1px;background:var(--pn-crimson);box-shadow:0 0 12px var(--pn-crimson);z-index:6}
  .pn-tl-ph::before{content:'';position:absolute;top:-8px;left:-7px;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid var(--pn-crimson)}
  .pn-tl-kf{position:absolute;top:360px;width:20px;height:20px;margin-left:-10px;transform:rotate(45deg);background:#0B0F16;border:2.5px solid var(--a);z-index:5}
  .pn-tl-kf.lit{background:var(--a);box-shadow:0 0 16px var(--a)}
  .pn-tl-stem{position:absolute;width:2px;background:rgba(255,255,255,.18)}
  .pn-tl-node{width:220px;height:150px;padding:14px 16px;overflow:hidden}
  .pn-tl-node .tm{display:inline-block;padding:2px 9px;border-radius:5px;background:${mix('var(--a)', 16)};border:1px solid ${mix('var(--a)', 55)};color:var(--a);font-family:var(--pn-font-mono);font-size:24px;font-weight:900;white-space:nowrap}
  .pn-tl-node .t{font-size:28px;font-weight:900;margin-top:10px;color:#fff;white-space:nowrap}
  .pn-tl-node .d{font-size:17px;font-weight:800;margin-top:4px;color:#94A3B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pn-tl-node.now{border-color:var(--pn-crimson);box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 32px ${mix('var(--pn-crimson)', 35)}}
  /* diagram */
  .pn-dg-node{width:210px;height:92px;z-index:3;overflow:visible}
  .pn-dg-node .hd{height:10px;border-radius:11px 11px 0 0;background:var(--a);opacity:.85}
  .pn-dg-node .l{padding:8px 16px 0;font-size:30px;font-weight:900;color:#fff;white-space:nowrap}
  .pn-dg-node .s{padding:0 16px;font-family:var(--pn-font-mono);font-size:14px;font-weight:800;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pn-dg-node .p{position:absolute;top:44px;width:12px;height:12px;border-radius:50%;background:#0B0F16;border:2px solid var(--a)}
  .pn-dg-node.hot{border-color:var(--pn-amber);box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 40px ${mix('var(--pn-amber)', 45)}}
  .pn-dg-node.hot .hd{background:var(--pn-amber);opacity:1}
  .pn-dg-svg{position:absolute;left:0;top:0;overflow:visible;z-index:2;pointer-events:none}
  .pn-dg-tagw{position:absolute;z-index:4;transform:translate(-50%,-50%)}
  .pn-dg-tag{padding:3px 10px;border-radius:5px;background:#0B0F16;border:1px solid rgba(255,255,255,.2);color:#CBD5E1;font-family:var(--pn-font-mono);font-size:14px;font-weight:900;letter-spacing:.06em;white-space:nowrap}
  `;
  function injectCSS() {
    if (document.getElementById('pn-components-css')) return;
    const st = document.createElement('style'); st.id = 'pn-components-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  const CAM = (t, x = 620, y = 310, zoom = 1, rx = 0, ry = 0, rz = 0) => ({ t, x, y, zoom, rx, ry, rz });
  /** 监视器印章：放大发光 → 收拢到位 */
  const stampIn = (A, el, at, r = -5) => A.add(el, at, 0.3, { s: 1.6, o: 0, r: r - 4 }, { s: 1, o: 1, r }, 'back');
  /** 面板上浮淡入（NLE 面板统一入场） */
  const rise = (A, el, at, dy = 40, d = 0.5) => { A.add(el, -1, 0.01, { o: 0, y: dy }, { o: 0, y: dy }); A.add(el, at, d, { o: 0, y: dy, s: 0.98 }, { o: 1, y: 0, s: 1 }, 'out'); };
  const headIn = (A, kick, hd) => { A.add(kick, 0.1, 0.3, { o: 0, x: -20 }, { o: 1, x: 0 }); if (hd) A.add(hd, 0.2, 0.45, { y: 26, o: 0 }, { y: 0, o: 1 }); };

  // ============================== 1. cover 主监视器开机自检 ==============================
  function cover(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'pn-zone');
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const led = h('div', 'pn-led', 'right:40px;top:34px;', `<i></i>${esc(data.led || 'GPU ACCEL READY')}`);
    const title = h('div', 'pn-cover-title');
    const lines = String(data.title || '').split('\n');
    const chars = [];
    lines.forEach((ln, li) => {
      if (li) title.appendChild(document.createElement('br'));
      const arr = Array.from(ln), N = arr.length, grad = lines.length > 1 && li === lines.length - 1;
      arr.forEach((c, ci) => {
        const s = h('span', grad ? 'g' : null, grad ? `background-size:${N * 100}% 100%;background-position:${N > 1 ? (ci / (N - 1)) * 100 : 0}% 0;` : null, c === ' ' ? '&nbsp;' : esc(c));
        title.appendChild(s); chars.push(s);
      });
    });
    const ch = h('div', 'pn-panel pn-cover-ch', null, `<div class="sc"></div><div class="l">${esc(data.chapterLabel || 'CHAPTER')}</div><div class="m">SEQ · TAKE 1</div><div class="n">${esc(data.chapter || '01')}</div>`);
    const sub = h('div', 'pn-panel pn-cover-sub', null, mark(data.subtitle));
    const bootLines = (data.boot && data.boot.length ? data.boot : ['MOUNTING demo_data.json ··· SCENES ×10', 'LOADING components.js · 10 SENTENCE TYPES', 'BOOTING CAMERA RIG + AVATAR MORPH FX']).slice(0, 3);
    const boot = h('div', 'pn-panel pn-boot');
    const track = h('div', 'pn-track', 'left:40px;top:540px;width:1160px;', '<i></i>');
    const fill = track.querySelector('i');
    const dim = h('div', 'pn-meta', 'left:40px;top:562px;color:#94A3B8;', esc(data.dim || ''));
    const pct = h('div', 'pn-meta', 'right:40px;top:562px;color:var(--pn-jade);', 'BOOT 0%');
    const st = badge(data.stamp || '', data.stampSmall || '', 'var(--pn-crimson)', 'left:1004px;top:280px;font-size:40px;');
    el.append(kick, led, title, ch, sub, boot, track, dim, pct, st);
    A.add(kick, 0.1, 0.3, { x: -30, o: 0 }, { x: 0, o: 1 });
    A.add(led, 0.3, 0.3, { o: 0 }, { o: 1 });
    chars.forEach((c, i) => A.add(c, 0.3 + i * 0.06, 0.4, { y: 40, o: 0, s: 1.25 }, { y: 0, o: 1, s: 1 }, 'out'));
    const tB = 0.5 + chars.length * 0.06;
    rise(A, ch, tB, 30);
    rise(A, sub, tB + 0.25, 30);
    rise(A, boot, tB + 0.35, 30);
    A.add(dim, tB + 0.5, 0.3, { o: 0 }, { o: 1 });
    const tL0 = tB + 0.6, tL1 = Math.min(D - 1.6, tL0 + 2.2);
    stampIn(A, st, Math.min(D - 1.0, tL1 + 0.3), -5);
    let fitted = false;
    A.fn((t) => {
      if (!fitted) fitted = fitWidth(title, 830);
      const p = clamp01((t - tL0) / (tL1 - tL0));
      fill.style.transform = `scaleX(${EASE.inOut(p).toFixed(4)})`;
      pct.textContent = `BOOT ${Math.round(EASE.inOut(p) * 100)}%`;
      const per = (tL1 - tL0) / bootLines.length;
      let html = '';
      bootLines.forEach((ln, i) => {
        const q = clamp01((t - tL0 - i * per) / (per * 0.8));
        if (q <= 0) return;
        const k = Math.round(ln.length * q);
        html += `<div><span class="ok">${q >= 1 ? '[OK]' : '[··]'}</span>${esc(ln.slice(0, k))}${q < 1 ? '<span class="cur"></span>' : ''}</div>`;
      });
      boot.innerHTML = html;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 420, 230, 1.16, 2, -3, -0.5), CAM(1.6, 620, 310, 1.0, 1, -1, 0), CAM(D, 628, 314, 1.03, 0.4, 1, 0.2)] };
  }

  // ============================== 2. stat LED 电平表大数字 ==============================
  function decOf(v) { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; }
  function fmtNum(v, dec) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  const SEG = 32;
  function stat(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 3); const n = Math.max(1, items.length);
    const el = h('div', 'pn-zone');
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const hd = head(data.title, 'left:38px;top:64px;');
    const gap = 40, w = (1160 - gap * (n - 1)) / n, fs = n === 1 ? 190 : n === 2 ? 140 : 100;
    const cards = items.map((it, i) => h('div', `pn-panel pn-stat${i === n - 1 && n > 1 ? ' hot' : ''}`, `left:${40 + i * (w + gap)}px;width:${w}px;`,
      `<div class="lb">${esc(it.label || '')}</div><div class="num" style="font-size:${fs}px;">${it.prefix ? `<span class="pf">${esc(it.prefix)}</span>` : ''}<b>0</b><span class="u">${esc(it.unit || '')}</span></div><div class="pn-meter">${'<s></s>'.repeat(SEG)}</div><div class="sc"><span>LEVEL</span><span class="pc">0%</span></div>`));
    const nums = cards.map((c) => c.querySelector('.num'));
    const segs = cards.map((c) => Array.from(c.querySelectorAll('.pn-meter s')));
    const pcs = cards.map((c) => c.querySelector('.pc'));
    const decs = items.map((it) => (it.decimals != null ? it.decimals : decOf(it.value || 0)));
    const finals = items.map((it, i) => fmtNum(it.value || 0, decs[i]));
    const st = data.delta ? badge(data.delta, data.deltaSmall || '', 'var(--pn-amber)', 'right:40px;top:490px;font-size:40px;') : null;
    const note = data.note ? h('div', 'pn-note', 'left:40px;top:506px;', `<small>NOTE</small>${esc(data.note)}`) : null;
    el.append(kick, hd, ...cards);
    if (note) el.appendChild(note);
    if (st) el.appendChild(st);
    headIn(A, kick, hd);
    const tIn = cards.map((_, i) => 0.6 + i * 0.45);
    cards.forEach((c, i) => rise(A, c, tIn[i], 50));
    if (note) { A.add(note, -1, 0.01, { o: 0 }, { o: 0 }); A.add(note, D - 2.6, 0.4, { o: 0, x: -30 }, { o: 1, x: 0 }); }
    if (st) stampIn(A, st, Math.min(D - 1.3, tIn[n - 1] + 2.0), -4);
    let fitted = false;
    A.fn((t) => {
      if (!fitted && nums[0] && nums[0].scrollWidth > 0) {
        nums.forEach((nEl, i) => { const b = nEl.querySelector('b'), keep = b.textContent; b.textContent = finals[i]; const ww = nEl.scrollWidth; if (ww > w - 60) nEl.style.fontSize = `${Math.floor(fs * (w - 60) / ww)}px`; b.textContent = keep; });
        fitted = true;
      }
      items.forEach((it, i) => {
        const p = EASE.out(clamp01((t - tIn[i] - 0.3) / 1.3));
        nums[i].querySelector('b').textContent = fmtNum((it.value || 0) * p, decs[i]);
        const lvl = clamp01(it.bar != null ? it.bar : 1) * p, lit = Math.round(lvl * SEG);
        segs[i].forEach((s, k) => {
          const f = k / SEG, col = f < 0.6 ? 'var(--pn-jade)' : f < 0.85 ? 'var(--pn-amber)' : 'var(--pn-crimson)';
          s.style.background = k < lit ? col : 'rgba(255,255,255,.06)';
          s.style.boxShadow = k < lit ? `0 0 8px ${col}` : 'none';
        });
        pcs[i].textContent = `${Math.round(lvl * 100)}%`;
      });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 620, 360, 1.12, 1.5, -2.5, -0.4), CAM(1.2, 620, 312, 1.0, 1, -1, 0), CAM(D, 626, 310, 1.03, 0.4, 1, 0.2)] };
  }

  // ============================== 3. steps 节点流水线 + 光纤传包 ==============================
  function steps(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const el = h('div', 'pn-zone');
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const hd = head(data.title, 'left:38px;top:64px;');
    const tag = chip(data.dim || `${n} STEPS`, 'var(--pn-amber)', 'right:40px;top:84px;font-size:20px;');
    const AW = 50, cw = (1160 - AW * (n - 1)) / n;
    const cx = (i) => 40 + i * (cw + AW) + cw / 2;
    const cards = items.map((it, i) => h('div', 'pn-panel pn-node', `left:${40 + i * (cw + AW)}px;width:${cw}px;--a:${ACC[i % 4]};`,
      `<div class="hd"><span class="no">${esc(it.no || String(i + 1).padStart(2, '0'))}</span>NODE<span class="pt"></span></div><div class="nm">${esc(it.title)}</div><div class="fn">${esc(it.desc || '')}</div>`));
    const stubs = items.map((_, i) => h('div', 'pn-stub', `left:${cx(i) - 1}px;`));
    const rail = h('div', 'pn-rail', null, '<i></i>');
    const rfill = rail.querySelector('i');
    const pkts = items.slice(1).map((_, i) => h('div', 'pn-pkt', `--a:${ACC[(i + 1) % 4]};`));
    const bin = h('div', 'pn-panel pn-bin', null,
      `<div class="f">▣ ${esc(data.folder || 'PROJECT /')}</div><div class="b">${esc(data.folderBig || '')}</div><div class="m">${esc(data.folderMeta || '').replace(/\n/g, '<br/>')}</div>${data.label ? `<div class="lbl">${esc(data.label)}${data.labelSmall ? `<small>${esc(data.labelSmall)}</small>` : ''}</div>` : ''}`);
    const lbl = bin.querySelector('.lbl');
    el.append(kick, hd, tag, rail, ...stubs, ...cards, ...pkts, bin);
    headIn(A, kick, hd);
    A.add(tag, 0.5, 0.3, { o: 0, s: 1.3 }, { o: 1, s: 1 }, 'back');
    rise(A, bin, 0.6, 40);
    A.add(rail, 0.5, 0.3, { o: 0 }, { o: 1 });
    const t0 = 1.0, t1 = Math.min(Math.max(t0 + 0.5, D - 2.6), t0 + 0.8 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const at = items.map((_, i) => t0 + i * stp);
    cards.forEach((c, i) => rise(A, c, at[i] - 0.25, 60, 0.45));
    stubs.forEach((s, i) => { A.add(s, -1, 0.01, { o: 0 }, { o: 0 }); A.add(s, at[i], 0.2, { o: 0 }, { o: 1 }); });
    if (lbl) { A.add(lbl, -1, 0.01, { o: 0 }, { o: 0 }); A.add(lbl, D - 1.6, 0.4, { o: 0, s: 1.4 }, { o: 1, s: 1 }, 'back'); }
    A.fn((t) => {
      cards.forEach((c, i) => c.classList.toggle('on', t >= at[i]));
      // 光纤：传包从节点 i 沿底部光轨滑到 i+1，到达点亮下一节点
      const x0 = cx(0), xN = cx(n - 1);
      let head = x0;
      pkts.forEach((p, i) => {
        const a = at[i] + 0.05, b = at[i + 1], q = clamp01((t - a) / Math.max(0.1, b - a));
        const x = cx(i) + (cx(i + 1) - cx(i)) * EASE.inOut(q);
        if (t >= a) head = Math.max(head, x);
        p.style.left = `${x.toFixed(1)}px`;
        p.style.opacity = t >= a && q < 1 ? '1' : '0';
      });
      const span = (head - 40) / 1160;
      rfill.style.transform = `scaleX(${(t >= at[0] ? clamp01(span + (t >= at[n - 1] ? clamp01((t - at[n - 1]) / 0.5) * (1 - (xN - 40) / 1160) : 0)) : 0).toFixed(4)})`;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 620, 380, 1.14, 2, -2.5, -0.4), CAM(1.2, 620, 312, 1.0, 1, -1, 0), CAM(D, 626, 310, 1.03, 0.4, 1, 0.2)] };
  }

  // ============================== 4. checklist IDE 手风琴逐条展开 ==============================
  function checklist(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const items = (data.items || []).slice(0, 5); const n = Math.max(1, items.length);
    const RH = n >= 5 ? 52 : 60, EX = 52, R0 = 180;
    const el = h('div', 'pn-zone');
    const ide = h('div', 'pn-panel pn-ide', null,
      `${winbar(data.kicker || 'RULES.md', 'UTF-8 · LF')}<div class="ttl">${esc(data.title)}</div><div class="sub">${esc(data.subtitle || '')}</div><div class="pass">0/${n} PASSED</div><div class="hr"></div>`);
    const pass = ide.querySelector('.pass');
    const rows = items.map((it, i) => {
      const r = h('div', 'pn-acc', `--a:${ACC[i % 4]};height:${RH}px;`,
        `<div class="no">${String(i + 1).padStart(2, '0')}</div><div class="box">${PROPS.check(30, '#061014', 4)}</div><div class="k">${esc(it.k)}</div><div class="bd">RULE</div><div class="d">${esc(it.d || '')}</div>`);
      ide.appendChild(r); return r;
    });
    const memo = data.note ? h('div', 'pn-memo', null, `<small>${esc(data.noteLead || 'NOTE')}</small>${mark(data.note)}`) : null;
    if (memo) ide.appendChild(memo);
    el.appendChild(ide);
    rise(A, ide, 0.05, 50, 0.55);
    const t0 = 1.0, t1 = Math.min(Math.max(t0 + 0.4, D - (memo ? 2.6 : 1.4)), t0 + 1.0 * (n - 1)), stp = n > 1 ? (t1 - t0) / (n - 1) : 0;
    const tO = items.map((_, i) => t0 + i * stp);
    rows.forEach((r, i) => { A.add(r, -1, 0.01, { o: 0 }, { o: 0 }); A.add(r, tO[i] - 0.45, 0.3, { o: 0, x: -20 }, { o: 1, x: 0 }); });
    if (memo) { A.add(memo, -1, 0.01, { o: 0 }, { o: 0 }); A.add(memo, D - 2.0, 0.45, { o: 0, y: 20 }, { o: 1, y: 0 }); }
    const cks = rows.map((r) => r.querySelector('.pn-ck'));
    A.fn((t) => {
      let y = R0, done = 0;
      rows.forEach((r, i) => {
        const open = EASE.out(clamp01((t - tO[i]) / 0.3)) * (i < n - 1 ? 1 - EASE.out(clamp01((t - tO[i + 1]) / 0.3)) : 1);
        const hh = RH + EX * open;
        r.style.top = `${y.toFixed(1)}px`; r.style.height = `${hh.toFixed(1)}px`;
        r.querySelector('.d').style.opacity = open.toFixed(3);
        r.classList.toggle('open', open > 0.5);
        const isDone = t >= tO[i] + 0.45;
        r.classList.toggle('done', isDone); if (isDone) done++;
        cks[i].setAttribute('stroke-dashoffset', (34 * (1 - EASE.out(clamp01((t - tO[i] - 0.45) / 0.25)))).toFixed(1));
        y += hh + 10;
      });
      pass.textContent = `${done}/${n} PASSED`;
      pass.classList.toggle('ok', done === n);
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 620, 330, 1.08, 1.5, -2, 0), CAM(1.0, 620, 312, 1.0, 1, -1, 0), CAM(D, 624, 312, 1.02, 0.3, 0.8, 0)] };
  }

  // ============================== 5. compare 红框标注 vs 翡翠通过 ==============================
  function compare(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const w = data.wrong || {}, r = data.right || {};
    const el = h('div', 'pn-zone');
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const hd = head(data.title, 'left:38px;top:64px;');
    const L = h('div', 'pn-panel pn-cmp wrong', 'left:40px;',
      `<div class="band">${esc(w.label || '✕ WRONG')}</div><div class="t">${esc(w.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(w.desc || '')}</div><div class="pn-redbox"><b>1</b></div>`);
    const R = h('div', 'pn-panel pn-cmp right', 'left:670px;',
      `<div class="band">${esc(r.label || '✓ RIGHT')}</div><div class="t">${esc(r.title).replace(/\n/g, '<br/>')}</div><div class="d">${esc(r.desc || '')}</div><div class="ok">${PROPS.check(34, '#061014', 5)}</div>`);
    const vs = h('div', 'pn-vs', null, 'VS');
    const xs = badge(w.stamp || '✕', '', 'var(--pn-crimson)', 'left:330px;top:438px;font-size:30px;');
    const verdict = h('div', 'pn-panel pn-verdict', null, `<b>${esc(data.verdictLabel || 'VERDICT')}</b><span>${mark(data.verdict || '')}</span>`);
    el.append(kick, hd, L, R, vs, xs, verdict);
    headIn(A, kick, hd);
    rise(A, L, 0.5, 50);
    const box = L.querySelector('.pn-redbox'), tW = L.querySelector('.t'), okb = R.querySelector('.ok'), ck = okb.querySelector('.pn-ck');
    const tBox = Math.min(D * 0.26, 1.6);
    A.add(box, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(box, tBox, 0.32, { o: 0, s: 1.15 }, { o: 1, s: 1 }, 'out');
    stampIn(A, xs, tBox + 0.6, -6);
    A.add(vs, tBox + 0.3, 0.4, { s: 0, o: 0, r: -90 }, { s: 1, o: 1, r: 0 }, 'back');
    const tR = Math.min(D * 0.46, tBox + 1.3);
    rise(A, R, tR, 50);
    A.add(okb, -1, 0.01, { o: 0 }, { o: 0 });
    A.add(okb, tR + 0.5, 0.35, { s: 0, o: 0 }, { s: 1, o: 1 }, 'back');
    const tV = Math.min(D - 1.6, tR + 1.3);
    rise(A, verdict, tV, 40);
    let sized = false;
    A.fn((t) => {
      if (!sized && tW.offsetWidth > 0) { box.style.width = `${tW.offsetWidth + 28}px`; box.style.height = `${tW.offsetHeight + 16}px`; sized = true; }
      ck.setAttribute('stroke-dashoffset', (34 * (1 - EASE.out(clamp01((t - tR - 0.75) / 0.25)))).toFixed(1));
      // 红框标注后错误项整体压暗
      L.style.filter = `saturate(${(1 - 0.5 * clamp01((t - tBox - 0.4) / 0.4)).toFixed(3)})`;
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 620, 350, 1.1, 1, -2.5, 0), CAM(1.0, 620, 312, 1.0, 0.5, -1, 0), CAM(D, 622, 314, 1.02, 0.4, 1.2, 0)] };
  }

  // ============================== 6. showcase IDE 实时打字 / 产品规格 / 录屏 ==============================
  function productPanel(data) {
    const el = h('div', 'pn-prod');
    const pic = h('div', 'pic', null, '<i class="cb" style="left:12px;top:12px;border-left-width:2px;border-top-width:2px"></i><i class="cb" style="right:12px;top:12px;border-right-width:2px;border-top-width:2px"></i><i class="cb" style="left:12px;bottom:12px;border-left-width:2px;border-bottom-width:2px"></i><i class="cb" style="right:12px;bottom:12px;border-right-width:2px;border-bottom-width:2px"></i>');
    if (data.src) { const im = h('img'); im.src = data.src; pic.appendChild(im); } else pic.insertAdjacentHTML('beforeend', PROPS.camera());
    const info = h('div', 'info', null, `<div class="nm">${esc(data.name || '')}</div>${data.tagline ? `<div class="tg">${esc(data.tagline)}</div>` : ''}`);
    const specs = h('div', 'specs');
    const rows = (data.specs || []).slice(0, 6).map((sp) => { const r = h('div', 'row', null, `<span class="k">${esc(sp.k)}</span><span class="v">${esc(sp.v)}</span>`); specs.appendChild(r); return r; });
    info.appendChild(specs); el.append(pic, info);
    const price = data.price ? badge(data.price, data.priceSmall || '', 'var(--pn-amber)', 'right:16px;top:16px;font-size:28px;padding:6px 16px 8px;') : null;
    if (price) pic.appendChild(price);
    return { el, pic, rows, price };
  }
  function showcase(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const kind = data.kind || 'code';
    const el = h('div', 'pn-zone');
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const hd = head(data.title, 'left:38px;top:64px;font-size:52px;');
    const panel = h('div', 'pn-panel pn-show', null, winbar(data.file || kind.toUpperCase(), `<span style="color:var(--pn-amber)">● ${esc(kind.toUpperCase())}</span>`));
    let codeEl = null, media = null, prod = null;
    const lines = data.lines || [];
    if (kind === 'product') { prod = productPanel(data); panel.appendChild(prod.el); }
    else if (kind === 'image' && data.src) { media = h('img', 'pn-media'); media.src = data.src; panel.appendChild(media); }
    else if (kind === 'video' && data.src) { media = h('video', 'pn-media'); media.src = data.src; media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'auto'; panel.appendChild(media); }
    else { codeEl = h('div', `pn-code${kind === 'doc' ? ' doc' : ''}`); panel.appendChild(codeEl); }
    // 标注挂在 zone 上（不被面板裁切），坐标按面板百分比换算
    const NC = ['var(--pn-amber)', 'var(--pn-jade)', 'var(--pn-crimson)'];
    const notes = (data.notes || []).slice(0, 3).map((nt, i) => {
      const px = 40 + 1160 * (((nt.at && nt.at[0]) || 60) / 100), py = 150 + 446 * (((nt.at && nt.at[1]) || 30 + i * 20) / 100);
      return h('div', 'pn-call', `left:${(px - 7).toFixed(0)}px;top:${(py - 22).toFixed(0)}px;--a:${NC[i]};`, `<i class="dot"></i><i class="ln"></i><span>${esc(nt.text)}</span>`);
    });
    el.append(kick, hd, panel, ...notes);
    headIn(A, kick, hd);
    rise(A, panel, 0.35, 70, 0.6);
    const tType0 = 0.95, tType1 = Math.max(tType0 + 0.6, D * 0.6);
    const total = lines.reduce((a, l) => a + String(l.t != null ? l.t : l).length, 0);
    const tN0 = tType1 + 0.2, nStep = notes.length ? Math.max(0.4, (D - 1.0 - tN0) / notes.length) : 0;
    notes.forEach((p, i) => { A.add(p, -1, 0.01, { o: 0 }, { o: 0 }); A.add(p, tN0 + i * nStep, 0.35, { o: 0, x: 24 }, { o: 1, x: 0 }); });
    if (prod) {
      A.add(prod.pic, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(prod.pic, 0.8, 0.5, { s: 0.92, o: 0 }, { s: 1, o: 1 });
      prod.rows.forEach((r, i) => { A.add(r, -1, 0.01, { o: 0 }, { o: 0 }); A.add(r, 1.2 + i * 0.32, 0.3, { x: 30, o: 0 }, { x: 0, o: 1 }); });
      if (prod.price) stampIn(A, prod.price, Math.min(D - 1.2, 1.5 + prod.rows.length * 0.32 + 0.3), -4);
    }
    A.fn((t) => {
      if (codeEl) {
        let budget = Math.floor(total * clamp01((t - tType0) / (tType1 - tType0))), html = '', cur = false;
        const blink = Math.floor(t * 2.4) % 2 === 0;
        lines.forEach((l, i) => {
          const tx = String(l.t != null ? l.t : l), cls = l.c || '';
          const k = Math.min(tx.length, budget); budget -= k;
          if (k <= 0 && i > 0) return;
          const typing = k < tx.length && !cur;
          html += `<span class="row${typing ? ' hi' : ''}"><span class="ln">${String(i + 1).padStart(2, '0')}</span>${cls ? `<span class="${cls}">${esc(tx.slice(0, k))}</span>` : esc(tx.slice(0, k))}${typing && blink ? '<span class="cur"></span>' : ''}</span>`;
          if (typing) cur = true;
        });
        codeEl.innerHTML = html;
      }
      if (media && media.tagName === 'VIDEO' && media.readyState >= 1 && media.duration) {
        const want = Math.max(0, t - 0.3) % media.duration;
        if (media.paused && Math.abs(media.currentTime - want) > 0.08) { try { media.currentTime = want; } catch (_) {} }
      }
    });
    return { el, layer: 'world', avatar: 'corner', update: (t) => A.update(t), media,
      cams: [CAM(0, 620, 400, 0.96, 1.5, -1.5, 0), CAM(1.2, 620, 318, 1.0, 1, -1.2, 0), CAM(D, 628, 330, 1.04, 0.6, 1.2, 0)] };
  }

  // ============================== 7. quote 全屏人像 + 取景器金句卡（屏幕层） ==============================
  function quote(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'pn-scr');
    const right = data.pos === 'right';
    const side = right ? 'right:96px;' : 'left:96px;';
    // 取景器四角 + REC 计时
    const vf = [['left:80px;top:76px;', 'border-left-width:3px;border-top-width:3px;'], ['right:80px;top:76px;', 'border-right-width:3px;border-top-width:3px;'],
      ['left:80px;bottom:110px;', 'border-left-width:3px;border-bottom-width:3px;'], ['right:80px;bottom:110px;', 'border-right-width:3px;border-bottom-width:3px;']]
      .map(([p, b]) => h('div', 'pn-vf', p + b));
    const rec = h('div', 'pn-rec', right ? 'left:auto;right:96px;' : '', '<i></i><span>REC 00:00:00:00</span>');
    const recTx = rec.querySelector('span');
    const card = h('div', 'pn-q', side, `<div class="k">${esc(data.kicker || 'QUOTE')}</div><div class="t">${mark(data.text)}</div><div class="by">${esc(data.by || '')}</div>`);
    const st = badge(data.stamp || '', data.stampSmall || '', 'var(--pn-amber)', `${right ? 'right:110px;' : 'left:110px;'}top:${data.stampTop || 690}px;font-size:46px;`);
    el.append(...vf, rec, card, st);
    vf.forEach((v, i) => A.add(v, 0.25 + i * 0.05, 0.4, { o: 0, s: 1.4 }, { o: 1, s: 1 }));
    A.add(rec, 0.4, 0.3, { o: 0 }, { o: 1 });
    const dir = right ? 1 : -1;
    A.add(card, -1, 0.01, { o: 0, x: dir * 80 }, { o: 0, x: dir * 80 });
    A.add(card, 0.5, 0.6, { x: dir * 80, o: 0 }, { x: 0, o: 1 });
    stampIn(A, st, Math.min(D - 1.0, D * 0.42), right ? 4 : -4);
    A.fn((t) => {
      const f = Math.floor(t * 30), ss = Math.floor(f / 30), ff = f % 30;
      recTx.textContent = `REC 00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
      rec.querySelector('i').style.opacity = Math.floor(t * 2) % 2 ? '0.25' : '1';
    });
    return { el, layer: 'screen', avatar: 'full', update: (t) => A.update(t), cams: [CAM(0), CAM(D)] };
  }

  // ============================== 8. outro 渲染队列 + 开源 CTA ==============================
  function outro(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const el = h('div', 'pn-zone');
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const hd = head(data.title, 'left:38px;top:64px;');
    const jobs = (data.actions || []).slice(0, 3).map((a, i) => h('div', 'pn-panel pn-job', `top:${160 + i * 136}px;--a:${ACC[i % 4]};`,
      `<span class="tg">${esc(a.tag || 'JOB')}</span><div class="t">${esc(a.title)}</div><div class="d">${esc(a.desc || '')}</div><div class="no">${String(i + 1).padStart(2, '0')}</div><div class="st">QUEUED</div><div class="pb"><i></i></div>`));
    const c = data.cta || {};
    const BA = ['var(--pn-amber)', 'var(--pn-crimson)', 'var(--pn-jade)'];
    const cta = h('div', 'pn-panel pn-cta', null, `<div class="k">${esc(c.kicker || 'OPEN SOURCE')}</div><div class="t">${esc(c.title || '')}</div><div class="repo"><span class="p">$ git clone</span><span class="rp"></span></div><div class="btns">${(c.buttons || []).slice(0, 3).map((b, i) => `<span style="--a:${BA[i]}">${esc(b)}</span>`).join('')}</div><div class="ex">⬇ EXPORT · H.264 · 1080p30</div>`);
    const go = badge(c.stamp || 'GO', c.stampSmall || '', 'var(--pn-jade)', 'left:1010px;top:500px;font-size:48px;');
    el.append(kick, hd, ...jobs, cta, go);
    headIn(A, kick, hd);
    const t0 = 0.6, stp = Math.min(0.45, (D * 0.25) / Math.max(1, jobs.length));
    jobs.forEach((j, i) => rise(A, j, t0 + i * stp, 40));
    const tC = t0 + jobs.length * stp;
    rise(A, cta, tC, 50, 0.55);
    const repo = String(c.repo || ''), rp = cta.querySelector('.rp');
    const btns = Array.from(cta.querySelectorAll('.btns span'));
    const tR0 = tC + 0.4, tR1 = tR0 + 0.9, tP = tR1 + 0.2;
    stampIn(A, go, Math.min(D - 0.9, tP + btns.length * 0.35 + 0.2), -6);
    const tJ0 = 0.9, jDur = Math.max(1.2, (D - 2.2 - tJ0) / Math.max(1, jobs.length));
    A.fn((t) => {
      jobs.forEach((j, i) => {
        const p = clamp01((t - tJ0 - i * jDur * 0.7) / jDur);
        j.querySelector('.pb i').style.transform = `scaleX(${EASE.inOut(p).toFixed(4)})`;
        const s = j.querySelector('.st');
        s.textContent = p <= 0 ? 'QUEUED' : p < 1 ? `RENDER ${Math.round(EASE.inOut(p) * 100)}%` : 'DONE ✓';
        s.classList.toggle('ok', p >= 1);
      });
      const k = Math.round(repo.length * clamp01((t - tR0) / (tR1 - tR0)));
      rp.textContent = repo.slice(0, k) + (k < repo.length && t >= tR0 ? '▌' : '');
      btns.forEach((b, i) => {
        const p = clamp01((t - (tP + i * 0.35)) / 0.3), d = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6, kk = p <= 0 || p >= 1 ? 0 : d, on = p >= 0.4;
        b.style.transform = `scale(${(1 - 0.06 * kk).toFixed(3)})`;
        if (on) { b.style.background = 'var(--a)'; b.style.color = '#061014'; b.style.boxShadow = '0 0 24px var(--a)'; }
        else { b.style.background = ''; b.style.color = ''; b.style.boxShadow = ''; }
      });
    });
    return { el, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 620, 350, 1.08, 1, -2.5, 0), CAM(1.2, 620, 312, 1.0, 0.5, -0.8, 0), CAM(D, 618, 310, 0.99, 0, 0.8, 0)] };
  }

  // ============================== 9. timeline 关键帧时间线 + 播放头扫描 ==============================
  function timeline(data, ctx) {
    const D = ctx.dur, A = new Animator();
    const nodes = (data.nodes || []).slice(0, 8); const n = Math.max(1, nodes.length);
    const NWD = 220, SP = n <= 5 ? Math.min(300, (1160 - NWD) / Math.max(1, n - 1)) : 250;
    const W = n <= 5 ? 1240 : 40 + (n - 1) * SP + NWD + 40, now = data.now != null ? data.now : n - 1;
    const el = h('div', 'pn-zone', `width:${W}px;`);
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const hd = head(data.title, 'left:38px;top:64px;');
    const ruler = h('div', 'pn-tl-ruler', `width:${W - 80}px;`);
    const fill = h('div', 'pn-tl-fill', `width:${W - 80}px;`);
    const ph = h('div', 'pn-tl-ph');
    el.append(kick, hd, ruler, fill);
    const t0 = 1.0, tEnd = Math.max(t0 + 0.5, D - 2.4), stp = n > 1 ? (tEnd - t0) / (n - 1) : 0;
    const parts = nodes.map((nd, i) => {
      const x = 40 + i * SP, up = i % 2 === 0, top = up ? 186 : 410, at = t0 + i * stp, isNow = i === now, kx = x + NWD / 2;
      const a = isNow ? 'var(--pn-crimson)' : ACC[i % 3];
      const card = h('div', `pn-panel pn-tl-node${isNow ? ' now' : ''}`, `left:${x}px;top:${top}px;--a:${a};`,
        `<div class="tm">${esc(nd.time || '')}</div><div class="t">${esc(nd.title || '')}</div><div class="d">${esc(nd.desc || '')}</div>`);
      const stem = h('div', 'pn-tl-stem', `left:${kx - 1}px;top:${up ? 336 : 380}px;height:${up ? 26 : 30}px;`);
      const kf = h('div', 'pn-tl-kf', `left:${kx}px;--a:${a};`);
      el.append(stem, kf, card);
      A.add(kf, -1, 0.01, { o: 0.35 }, { o: 0.35 });
      A.add(kf, at - 0.05, 0.25, { o: 0.35, s: 1.6 }, { o: 1, s: 1 }, 'back');
      A.add(stem, -1, 0.01, { o: 0 }, { o: 0 }); A.add(stem, at, 0.2, { o: 0 }, { o: 1 });
      A.add(card, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(card, at + 0.02, 0.4, { y: up ? -30 : 30, o: 0 }, { y: 0, o: 1 });
      return { x, kx, up, top, at, kf };
    });
    el.appendChild(ph);
    if (parts[now] && data.nowLabel) {
      const p = parts[now];
      const ns = badge(data.nowLabel, data.nowSmall || '', 'var(--pn-crimson)', `left:${Math.min(W - 270, p.x + 10)}px;top:${p.up ? 426 : 196}px;font-size:32px;`);
      el.appendChild(ns);
      stampIn(A, ns, Math.min(D - 0.9, p.at + 0.6), -4);
    }
    headIn(A, kick, hd);
    A.add(ruler, 0.4, 0.4, { o: 0 }, { o: 1 });
    A.fn((t) => {
      // 播放头：按节点时间逐个扫描到 NOW
      let x = parts[0] ? parts[0].kx : 40;
      for (let i = 0; i < parts.length; i++) {
        if (t >= parts[i].at && i + 1 < parts.length && i < now) x = parts[i].kx + (parts[i + 1].kx - parts[i].kx) * EASE.inOut(clamp01((t - parts[i].at) / Math.max(0.1, stp)));
        else if (t >= parts[i].at && i <= now) x = parts[i].kx;
      }
      if (parts[now] && t >= parts[now].at) x = parts[now].kx;
      ph.style.left = `${x.toFixed(1)}px`;
      ph.style.opacity = t >= 0.6 ? '1' : '0';
      fill.style.transform = `scaleX(${clamp01((x - 40) / (W - 80)).toFixed(4)})`;
      parts.forEach((p) => p.kf.classList.toggle('lit', t >= p.at));
    });
    const endX = W > 1240 ? W - 620 : 620;
    return { el, w: W, layer: 'world', avatar: 'card', update: (t) => A.update(t),
      cams: [CAM(0, 620, 360, 1.08, 1.5, -2.5, -0.4), CAM(0.9, 620, 312, 1.0, 1, -1, 0), CAM(Math.max(1.0, tEnd + 0.3), endX, 312, 1.0, 0.5, 1, 0), CAM(D, endX + 6, 310, 1.02, 0.3, 1, 0.2)] };
  }

  // ============================== 10. diagram 节点编辑器（贝塞尔连线 + 光纤脉冲） ==============================
  const bez = (p0, c1, c2, p1, u) => { const m = 1 - u; return { x: m * m * m * p0.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * p1.x, y: m * m * m * p0.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * p1.y }; };
  /** 节点 a→b 的连线：节点编辑器风格，从右端口出、左端口入（反向时走上下） */
  function linkGeom(a, b, NW, NH) {
    const ax = a.x + NW / 2, ay = a.y + NH / 2, bx = b.x + NW / 2, by = b.y + NH / 2, dx = bx - ax, dy = by - ay;
    let p0, p1, c1, c2;
    if (Math.abs(dx) > NW * 0.6) {
      const sx = Math.sign(dx) || 1; p0 = { x: ax + sx * (NW / 2 + 6), y: ay }; p1 = { x: bx - sx * (NW / 2 + 16), y: by };
      const k = Math.max(60, Math.abs(p1.x - p0.x) * 0.5); c1 = { x: p0.x + sx * k, y: p0.y }; c2 = { x: p1.x - sx * k, y: p1.y };
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
    const L = 40, T = 168, AW = 1160, AH = 420, NW = 210, NH = 92;
    const el = h('div', 'pn-zone');
    const kick = kicker(data.kicker, 'left:40px;top:28px;');
    const hd = head(data.title, 'left:38px;top:64px;');
    el.append(kick, hd);
    const pos = {}, appear = {}, col = {};
    const stp = Math.min(0.45, (D * 0.36) / Math.max(1, nodes.length));
    const nodeEls = nodes.map((nd, i) => {
      const at = nd.at || [0, 0], x = L + (AW - NW) * clamp01(at[0] / 100), y = T + (AH - NH) * clamp01(at[1] / 100);
      pos[nd.id] = { x, y }; appear[nd.id] = 0.6 + i * stp; col[nd.id] = ACC[i % 4];
      const e = h('div', 'pn-panel pn-dg-node', `left:${x}px;top:${y}px;--a:${col[nd.id]};`,
        `<div class="hd"></div><div class="l">${esc(nd.label || nd.id)}</div><div class="s">${esc(nd.sub || '')}</div><i class="p" style="left:-7px"></i><i class="p" style="right:-7px"></i>`);
      el.appendChild(e);
      A.add(e, -1, 0.01, { o: 0, s: 0.8 }, { o: 0, s: 0.8 });
      A.add(e, appear[nd.id], 0.4, { s: 0.8, o: 0 }, { s: 1, o: 1 }, 'back');
      return e;
    });
    const mid = `pndg${++DG_SEQ}`;
    const geo = links.map((lk) => (pos[lk.from] && pos[lk.to] ? linkGeom(pos[lk.from], pos[lk.to], NW, NH) : null));
    const tDraw = links.map((lk) => (pos[lk.from] && pos[lk.to] ? Math.max(appear[lk.from], appear[lk.to]) + 0.35 : 0));
    let inner = `<defs><marker id="${mid}" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L11 6 L0 11 Z" fill="#CBD5E1"/></marker></defs>`;
    geo.forEach((g, j) => {
      if (!g) return;
      const c = col[links[j].from];
      inner += `<path d="${g.d}" stroke="rgba(255,255,255,.06)" stroke-width="9" fill="none"/>`;
      inner += `<path class="ln" data-j="${j}" d="${g.d}" stroke="${c}" stroke-width="3" fill="none" style="filter:drop-shadow(0 0 5px ${c})" stroke-dasharray="${g.len.toFixed(1)}" stroke-dashoffset="${g.len.toFixed(1)}" marker-end="url(#${mid})"/>`;
      inner += `<circle class="pl" data-j="${j}" data-k="0" r="6" fill="#fff" style="filter:drop-shadow(0 0 6px ${c}) drop-shadow(0 0 12px ${c})" opacity="0"/><circle class="pl" data-j="${j}" data-k="1" r="4.5" fill="${c}" style="filter:drop-shadow(0 0 8px ${c})" opacity="0"/>`;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pn-dg-svg'); svg.setAttribute('width', '1240'); svg.setAttribute('height', '620');
    svg.innerHTML = inner; el.insertBefore(svg, el.firstChild);
    const lnEls = Array.from(svg.querySelectorAll('.ln')), plEls = Array.from(svg.querySelectorAll('.pl'));
    geo.forEach((g, j) => {
      if (!g || !links[j].label) return;
      const wrap = h('div', 'pn-dg-tagw', `left:${g.mid.x.toFixed(0)}px;top:${g.mid.y.toFixed(0)}px;`);
      const tg = h('div', 'pn-dg-tag', null, esc(links[j].label));
      wrap.appendChild(tg); el.appendChild(wrap);
      A.add(tg, -1, 0.01, { o: 0 }, { o: 0 });
      A.add(tg, tDraw[j] + 0.4, 0.3, { s: 0.6, o: 0 }, { s: 1, o: 1 }, 'back');
    });
    const fi = nodes.findIndex((nd) => nd.id === data.focus);
    const tF = Math.max(D - 1.8, 0.6 + nodes.length * stp + 0.9);
    if (fi >= 0 && data.focusLabel) {
      const p = pos[data.focus];
      const st = badge(data.focusLabel, data.focusSmall || '', 'var(--pn-amber)', `left:${Math.min(1080, p.x + 110)}px;top:${p.y - 70}px;font-size:26px;padding:6px 16px 8px;`);
      el.appendChild(st);
      stampIn(A, st, tF + 0.25, -4);
    }
    headIn(A, kick, hd);
    A.fn((t) => {
      lnEls.forEach((p) => { const j = +p.dataset.j, g = geo[j]; p.setAttribute('stroke-dashoffset', (g.len * (1 - EASE.inOut(clamp01((t - tDraw[j]) / 0.45)))).toFixed(1)); });
      plEls.forEach((r) => {
        const j = +r.dataset.j, g = geo[j], live = t - tDraw[j] - 0.55;
        if (live < 0) { r.setAttribute('opacity', '0'); return; }
        const q = bez(g.p0, g.c1, g.c2, g.p1, (live * 0.6 + (+r.dataset.k) * 0.5) % 1);
        r.setAttribute('opacity', '1'); r.setAttribute('cx', q.x.toFixed(1)); r.setAttribute('cy', q.y.toFixed(1));
      });
      if (fi >= 0) nodeEls[fi].classList.toggle('hot', t >= tF);
    });
    return { el, layer: 'world', avatar: 'pip', update: (t) => A.update(t),
      cams: [CAM(0, 620, 380, 1.1, 1.5, -2.5, -0.4), CAM(1.2, 620, 318, 1.0, 1, -1, 0), CAM(D, 626, 316, 1.03, 0.4, 1, 0.2)] };
  }

  global.ProNLE = {
    version: '1.1.0',
    PROPS, Animator, EASE, ACC, injectCSS,
    COMPONENTS: {
      cover: { create: cover }, steps: { create: steps }, checklist: { create: checklist },
      compare: { create: compare }, showcase: { create: showcase }, quote: { create: quote }, outro: { create: outro },
      stat: { create: stat }, timeline: { create: timeline }, diagram: { create: diagram }
    }
  };
})(window);
