/**
 * Mushanhe Video Engine — 内核句型 talk + 牌子层 Badges（v3.4 起，12 套风格包通用）
 *
 * 1) talk：普通聊天 / 观点 / 过渡句。人像全屏出镜，屏幕两侧按口播「说到哪个词就弹哪个词」，最多 2 个关键词。
 *   { "type": "talk", "avatar": "full", "sub": [...], "words": [...],
 *     "data": { "keywords": ["开源", { "text": "十二套", "cue": "十二", "side": "right" }], "badges": [ ...见下... ] } }
 *   - keywords：1–2 个，字符串或 { text, cue?, side? }；text 只能是口播原话里的词（不要编）。
 *   - cue：这个词在 words 里怎么写（默认 = text）；可写 ["词", 第几次]。没有 words 时按段内固定节奏出现。
 *   - side："left" | "right"；默认第 1 个在左、第 2 个在右。两侧都避开画面中线 ±240px（人脸一般在中间）。
 *   - data.side：只有 1 个关键词时放哪边（默认 left）。
 *
 * 2) 牌子层 MHEngine.Badges（v3.4.1）：任何句型的 data.badges 都能用（talk 自己画；图表句型由宿主页叠在屏幕层，本轮 06 已接）。
 *   { "text": "开源了！", "kind": "stamp", "cue": "开源", "pos": "top-right" }
 *   - kind：keyword（关键词牌，默认）| big（多色大字）| stamp（印章，砸下带弹跳）| sticker（贴纸）| tag（标签）| label（下方长标签）
 *   - pos ：left | right | top-left | top-right | bottom-left | bottom-right | bottom（居中）；都避开画面中线 ±240px 的人脸区（bottom 除外）
 *   - parts：[{ "text": "接下来：", "cue": "后面" }, { "text": "从头跑一遍", "cue": "从头" }] → 同一块牌子按词分段亮出（第一段的 cue = 入场）
 *   - outLead（v3.5，可选）：比 out 那个词提前几秒开始退（例：换全屏前标题先退完）。
 *   - out ：退场词（可选）。不写时 **在所属分句最后一个字结束后 0.08s 开始退场、0.24s 内退完**（分句 = 字幕里 ，。！？；… 之间）；
 *           没有 words 时退回旧规则（段尾 0.2s 淡出）。shake: true → 落定后轻抖一下。size：字号（可选，默认按 kind）。
 * 风格：按页面所在风格包（templates/NN_*）取该包的 CSS 变量，01–06 换皮肤时颜色跟着变；06 有专门的印章 / 贴纸 / 多色大字造型，
 *       其余 11 套用 Badges.registerKinds(包号, 造型) 注册自己的印章 / 贴纸 / 标签 / 多色大字（v3.5）；没注册的退回该包关键词牌造型。
 * 接口与风格包组件一致：create(data, ctx) → { el, layer:'screen', avatar:'full', cams:[], update(localT) }，update 确定性。
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const backOut = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  /** 硬砸落：快速到位 + 两次衰减回弹（与 06 EASE.slam 同） */
  const slam = (x) => { if (x < 0.45) return Math.pow(x / 0.45, 3); const k = (x - 0.45) / 0.55; return 1 + Math.sin(k * Math.PI * 2) * 0.06 * (1 - k); };

  // 每套风格包的关键词卡样式（只用该包自己的 CSS 变量 / 字体，形状规则跟包走：直角 / 圆角 / 粗黑边 / 发光）
  const STYLES = {
    '01': { bg: 'rgba(244,245,247,.94)', fg: 'var(--id-ink)', bd: '2px solid rgba(21,24,29,.18)', bar: 'var(--id-orange)', rad: '14px', sh: '0 22px 48px rgba(0,0,0,.38)', font: 'var(--id-font-cn)', w: 900 },
    '02': { bg: 'var(--sp-sheet)', fg: 'var(--sp-ink)', bd: '0', bar: 'var(--sp-red)', rad: '0', sh: 'var(--sp-shadow-lg)', font: 'var(--sp-font-cn)', w: 900 },
    '03': { bg: 'var(--vx-yellow)', fg: 'var(--vx-ink)', bd: '0', bar: 'var(--vx-red)', rad: '2px', sh: 'var(--vx-shadow-lg)', font: 'var(--vx-font-serif)', w: 900, rot: 1.4 },
    '04': { bg: 'rgba(12,16,24,.92)', fg: 'var(--ng-text)', bd: '1.5px solid var(--ng-cyan)', bar: 'var(--ng-jade)', rad: '6px', sh: '0 0 34px rgba(56,189,248,.35), 0 24px 56px rgba(0,0,0,.6)', font: 'var(--ng-font-cn)', w: 800 },
    '05': { bg: 'rgba(10,13,18,.9)', fg: 'var(--pn-text)', bd: '1px solid var(--pn-border)', bar: 'var(--pn-amber)', rad: '6px', sh: '0 24px 56px rgba(0,0,0,.6)', font: 'var(--pn-font-cn)', w: 800 },
    '06': { bg: 'var(--nb-yellow)', fg: 'var(--nb-ink)', bd: '4px solid var(--nb-ink)', bar: '', rad: '0', sh: '9px 9px 0 var(--nb-ink)', font: 'var(--nb-font-cn)', w: 900, rot: 2.2 },
    '07': { bg: 'rgba(24,48,40,.86)', fg: 'var(--cb-yellow)', bd: '3px dashed rgba(244,244,238,.72)', bar: '', rad: '10px', sh: '0 18px 40px rgba(0,0,0,.45)', font: 'var(--cb-font)', w: 900, ts: 'var(--cb-glow-lg)', rot: 1.2 },
    '08': { bg: 'var(--si-paper)', fg: 'var(--si-ink)', bd: '2px solid var(--si-cinnabar)', bar: 'var(--si-cinnabar)', rad: '0', sh: '0 18px 40px rgba(28,27,24,.35)', font: 'var(--si-font-serif)', w: 900 },
    '09': { bg: 'var(--af-white)', fg: 'var(--af-ink)', bd: '0', bar: 'var(--af-date)', rad: '2px', sh: '0 16px 36px rgba(0,0,0,.32)', font: 'var(--af-font-serif-cn)', w: 900, rot: 1.6 },
    '10': { bg: 'rgba(7,12,8,.9)', fg: 'var(--rc-green)', bd: '2px solid var(--rc-green)', bar: '', rad: '0', sh: '0 0 26px rgba(51,255,102,.35)', font: 'var(--rc-font)', w: 700, ts: '0 0 10px rgba(51,255,102,.65)', pre: '&gt; ' },
    '11': { bg: 'rgba(22,22,30,.55)', fg: 'var(--kg-white)', bd: '1px solid rgba(255,255,255,.24)', bar: 'var(--kg-accent)', rad: '28px', sh: '0 24px 60px rgba(0,0,0,.5)', font: 'var(--kg-font)', w: 800, blur: 18 },
    '12': { bg: 'var(--bf-navy)', fg: 'var(--bf-amber)', bd: '2px solid var(--bf-amber)', bar: '', rad: '2px', sh: '0 24px 56px rgba(0,0,0,.55)', font: 'var(--bf-font-cn)', w: 800 }
  };
  const DEFAULT = { bg: '#FFFFFF', fg: '#111111', bd: '3px solid #111111', bar: '', rad: '8px', sh: '0 18px 40px rgba(0,0,0,.35)', font: "'Noto Sans SC','Microsoft YaHei',sans-serif", w: 900 };

  // 06 撞色潮刊专属牌子造型（其余包 kind 一律退回关键词牌造型，下一轮补）
  const KINDS_06 = {
    big: { pal: ['var(--nb-yellow)', 'var(--nb-mint)', 'var(--nb-blue)', 'var(--nb-coral)'] },
    stamp: 'padding:12px 34px 16px;background:var(--nb-coral);color:#FFFFFF;border:6px solid var(--nb-ink);box-shadow:9px 9px 0 var(--nb-ink);outline:4px solid #FFFFFF;outline-offset:-15px;font-family:var(--nb-font-cn);font-weight:900;',
    sticker: 'padding:12px 28px 14px;background:var(--nb-mint);color:var(--nb-ink);border:4px solid var(--nb-ink);box-shadow:7px 7px 0 var(--nb-ink);font-family:var(--nb-font-cn);font-weight:900;',
    tag: 'padding:12px 26px 14px;background:var(--nb-ink);color:var(--nb-yellow);border:4px solid var(--nb-ink);box-shadow:8px 8px 0 var(--nb-yellow);font-family:var(--nb-font-cn);font-weight:900;',
    label: 'padding:14px 34px 16px;background:#FFFFFF;color:var(--nb-ink);border:5px solid var(--nb-ink);box-shadow:10px 10px 0 var(--nb-ink);font-family:var(--nb-font-cn);font-weight:900;'
  };
  const KIND_ROT = { stamp: -7, sticker: 5, tag: -2.5, label: -1, big: -3 };
  // v3.5：其余 11 套的牌子造型（各包宿主页 index.html 或 components.js 里 MHEngine.Badges.registerKinds('07', { stamp, sticker, tag, label, big:{pal,ink,shadow}, rot }) 注册；没注册 = 关键词牌造型，原样）
  const KINDS_PACK = {};
  const KIND_SIZE = { keyword: 0, big: 132, stamp: 92, sticker: 96, tag: 76, label: 66 };

  function packNo() {
    const m = /\/templates\/(\d\d)_[^/]+\//.exec((global.location && global.location.pathname) || '');
    return m ? m[1] : '';
  }

  /** 估字宽（em）：中文 1、拉丁 / 数字 0.6 */
  function ems(s) {
    let n = 0;
    for (const ch of Array.from(String(s))) n += /[\x00-\x7F]/.test(ch) ? 0.6 : 1;
    return Math.max(1, n);
  }

  const X_LEFT = 96, X_RIGHT = 96, MAX_W = 600;   // 左卡右沿 ≤ 696、右卡左沿 ≥ 1224：都在中线 ±240px（720–1200）之外
  const TOP = { left: 318, right: 452 };
  // 牌子位置（屏幕 1920×1080）：[css, transform-origin, 最大宽]；bottom 居中（在人像胸口、字幕条上方）
  const POS = {
    left: [`left:${X_LEFT}px;top:${TOP.left}px;`, '0% 50%', MAX_W],
    right: [`right:${X_RIGHT}px;top:${TOP.right}px;`, '100% 50%', MAX_W],
    'top-left': [`left:${X_LEFT}px;top:120px;`, '0% 0%', MAX_W],
    'top-right': [`right:${X_RIGHT}px;top:112px;`, '100% 0%', MAX_W],
    'bottom-left': [`left:${X_LEFT}px;bottom:236px;`, '0% 100%', 780],
    'bottom-right': [`right:${X_RIGHT}px;bottom:236px;`, '100% 100%', 780],
    bottom: ['', '50% 100%', 1200]
  };

  /**
   * 牌子层：list = data.badges（或 talk 的 keywords 换算），ctx = 组件 ctx（{ dur, cue, cueEnd, clauseEnd }）。
   * 返回 { el, update(localT), items:[{ at, out, el }] }。没有 words 时 cue 返回兜底时间、退场走段尾淡出（与 v3.4 talk 一致）。
   */
  function createBadges(list, ctx, opt) {
    const D = (ctx && ctx.dur) || 6;
    const cue = ctx && typeof ctx.cue === 'function' ? ctx.cue : (s, fb) => fb;
    const clauseEnd = ctx && typeof ctx.clauseEnd === 'function' ? ctx.clauseEnd : null;
    const P = packNo(), S = STYLES[P] || DEFAULT, K6 = P === '06' ? KINDS_06 : (KINDS_PACK[P] || null);   // v3.5：其余 11 套可用 Badges.registerKinds 注册自己的牌子造型
    const el = (opt && opt.el) || document.createElement('div');
    if (!opt || !opt.el) { el.className = 'mh-badges'; el.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; }
    const step = Math.min(1.2, D / 3);
    const items = (list || []).map((b, i) => {
      const k = typeof b === 'string' ? { text: b } : (b || {});
      const parts = Array.isArray(k.parts) && k.parts.length
        ? k.parts.map((p) => (typeof p === 'string' ? { text: p } : p || {})).filter((p) => String(p.text || '').length)
        : [{ text: String(k.text == null ? '' : k.text), cue: k.cue }];
      const full = parts.map((p) => String(p.text)).join('');
      if (!full.trim()) return null;   // 空牌子整块不渲染
      const kind = KIND_SIZE[k.kind] != null ? k.kind : 'keyword';
      let side = POS[k.pos] ? k.pos : (k.side === 'left' || k.side === 'right' ? k.side : (opt && opt.side ? opt.side(i) : 'left'));
      let [pcss, origin, maxW] = POS[side];
      // v3.4.1：xy: [左, 上]（屏幕像素）→ 牌子左上角钉在这里，向右下长；maxW 默认到人像区左沿（x 600）为止
      // v3.4.1 dock：{ cue, xy, size } → 牌子先在 xy / size 亮出（全屏时），说到 dock.cue 时同一个元素滑到 dock.xy、变成 dock.size（变成标题），之后一直挂着
      const dock = k.dock && Array.isArray(k.dock.xy) ? k.dock : null;
      if (dock) {
        side = 'xy';
        pcss = `left:${+dock.xy[0]}px;top:${+dock.xy[1]}px;`; origin = '0% 0%'; maxW = 1400;
      } else if (Array.isArray(k.xy) && k.xy.length === 2) {
        side = 'xy';
        pcss = `left:${+k.xy[0]}px;top:${+k.xy[1]}px;`; origin = '0% 0%'; maxW = +k.maxW > 0 ? +k.maxW : Math.max(200, 600 - +k.xy[0]);
      }
      const lines = full.split('\n'), longest = lines.reduce((a, b) => (ems(b) > ems(a) ? b : a), '');
      const pad = kind === 'keyword' ? 70 : kind === 'big' ? 30 : 90;
      const want = +k.size || KIND_SIZE[kind] || 96;
      const fs = dock ? Math.round(+dock.size || 80) : kind === 'keyword' && !k.size
        ? Math.round(Math.max(44, Math.min(96, (MAX_W - 70) / ems(longest))))
        : Math.round(Math.max(36, Math.min(want, (maxW - pad) / ems(longest))));
      const box = document.createElement('div');
      box.className = `mh-badge mh-badge-${kind} ${side}`;
      const special = K6 && kind !== 'keyword' ? K6[kind] : null;
      let look;
      if (kind === 'big' && special) look = `padding:0 6px;font-family:${S.font};font-weight:900;letter-spacing:.02em;`;
      else if (special) look = special;
      else look = `padding:16px 30px 18px ${S.bar ? 40 : 30}px;background:${S.bg};color:${S.fg};border:${S.bd};border-radius:${S.rad};box-shadow:${S.sh};font-family:${S.font};font-weight:${S.w};` +
        (S.ts ? `text-shadow:${S.ts};` : '') + (S.blur ? `backdrop-filter:blur(${S.blur}px);-webkit-backdrop-filter:blur(${S.blur}px);` : '');
      box.style.cssText = `position:${side === 'bottom' ? 'relative' : 'absolute'};${side === 'bottom' ? '' : pcss}max-width:${maxW}px;box-sizing:border-box;${look}` +
        `font-size:${fs}px;line-height:1.12;white-space:nowrap;overflow:${kind === 'big' ? 'visible' : 'hidden'};opacity:0;transform-origin:${origin};`;
      let host = box;
      if (side === 'bottom') {   // 居中：外层整宽 flex，动画只动里层
        host = document.createElement('div');
        host.style.cssText = 'position:absolute;left:0;right:0;bottom:168px;display:flex;justify-content:center;pointer-events:none;';
        host.appendChild(box);
      }
      if (!special && S.bar) box.innerHTML = `<i style="position:absolute;left:0;top:0;bottom:0;width:12px;background:${S.bar};"></i>`;
      if (!special && S.pre) box.insertAdjacentHTML('beforeend', S.pre);
      // 每段文字一个 span（多色大字：每个字一个 span，按包色板轮换 + 粗黑描边 + 实体投影）
      let ci = 0;
      const spans = parts.map((p) => {
        const sp = document.createElement('span');
        sp.style.display = 'inline-block'; sp.style.whiteSpace = 'pre';
        if (kind === 'big' && special) {
          sp.innerHTML = Array.from(String(p.text)).map((ch) => {
            const c = special.pal[ci++ % special.pal.length];
            if (ch === '\n') return '<br/>';
            return /\s/.test(ch) ? '&nbsp;' : `<b style="display:inline-block;font-weight:900;color:${c};-webkit-text-stroke:${Math.max(4, Math.round(fs * 0.045))}px ${special.ink || 'var(--nb-ink)'};paint-order:stroke fill;text-shadow:${special.shadow ? special.shadow : `${Math.round(fs * 0.06)}px ${Math.round(fs * 0.06)}px 0 ${special.ink || 'var(--nb-ink)'}`};">${esc(ch)}</b>`;
          }).join('');
        } else sp.textContent = String(p.text);
        if (p.br) { const br = document.createElement('br'); box.appendChild(br); sp._br = br; }   // parts[i].br：这一段另起一行（念到之前换行也不占位）
        box.appendChild(sp);
        return sp;
      });
      el.appendChild(host);
      const fb = Math.min(D - 0.6, 0.4 + i * step);
      const ats = parts.map((p, j) => {
        const c = cue(p.cue != null ? p.cue : (j === 0 && k.cue != null ? k.cue : p.text), j === 0 ? fb : null);
        return c == null ? null : Math.max(0, +c || 0);
      });
      const at = ats[0] == null ? Math.max(0, fb) : ats[0];
      for (let j = 1; j < ats.length; j++) if (ats[j] == null || ats[j] < at) ats[j] = at;
      // 退场：写了 out → 那个词起点；否则分句最后一个字结束后 0.08s 开始（0.16s 退完 = 分句结束后 ≤0.24s）；没有 words → 段尾 0.2s 淡出（旧规则）
      let out = null, exit = 0.16, legacy = false;
      if (k.out === 'end') { const ce = clauseEnd ? clauseEnd(D, null) : null; out = ce == null ? null : ce + 0.08; }   // 本段最后一个字念完
      else if (k.out != null && k.out !== false) { out = cue(k.out, null); if (out != null && +k.outLead > 0) out -= +k.outLead; }   // v3.5 outLead：比退场词提前几秒退（如人像换全屏前先退完）
      if (out == null && dock) out = D + 1;   // 停靠成标题后一直挂到本段结束
      // v3.4.1：宿主页给了 ctx.coverAt（本段被转场色块盖住的局部秒）→ 牌子必须在色块到达前退完（牌子在色块上层，不许浮在色块上）
      const cov = ctx && Number.isFinite(+ctx.coverAt) && ctx.coverAt != null ? +ctx.coverAt : null;
      if (out == null && clauseEnd) { const ce = clauseEnd(ats[ats.length - 1], null); if (ce != null) out = ce + 0.08; }
      if (out == null) { out = D - 0.2; exit = 0.2; legacy = true; }
      const rot = kind === 'keyword' ? (S.rot || 0) * (side.indexOf('left') >= 0 ? -1 : 1) : (k.rot != null ? +k.rot : (K6 ? ((K6.rot || KIND_ROT)[kind] || 0) : (S.rot || 0)));
      const estW = fs * ems(longest) + (kind === 'stamp' && special ? 92 : pad + 20);   // 印章外框估宽（左右内边距 68 + 边框 12 + 余量）
      const dk = dock ? { t: cue(dock.cue, null), ox: (Array.isArray(k.xy) ? +k.xy[0] : +dock.xy[0]) - +dock.xy[0], oy: (Array.isArray(k.xy) ? +k.xy[1] : +dock.xy[1]) - +dock.xy[1], so: (+k.size || fs) / fs } : null;
      let outF = Math.max(at + 0.2, out);
      if (cov != null && outF + exit > cov) { outF = Math.max(at + 0.05, cov - exit - 0.02); legacy = false; }
      return { box, spans, kind, side, estW, dk, at, ats, out: outF, exit, legacy, rot, shake: !!k.shake, text: full };
    }).filter(Boolean);

    function update(t) {
      items.forEach((it) => {
        const dt = t - it.at;
        if (dt < 0 || t >= it.out + it.exit) { it.box.style.opacity = '0'; it.box.style.transform = 'scale(0.6)'; return; }
        let s, r, x = 0, y = 0, o = Math.min(1, 0.35 + dt / 0.08);   // 词起点所在那一帧就可见
        if (it.kind === 'stamp') {   // 印章：放大透明 → 狠砸到位 + 回弹
          // v3.4.1：放大量按位置封顶 —— 入场时放大的印章外沿也不越过画面中线 ±240px 的人脸区（bottom 居中位除外）
          //         宽度按字号 × 字数估算（不读排版：seek 到本段第一帧时组件还没显示，读到的宽度是 0）
          const room = 1920 - X_RIGHT - 1200;   // 外侧边固定，向内放大可用的宽度（左右对称）
          const s0 = it.side === 'bottom' ? 1.9 : Math.max(1.08, Math.min(1.9, room / it.estW)), p = clamp01(dt / 0.26);
          s = s0 - (s0 - 1) * slam(p); r = it.rot - 6 * (1 - Math.min(1, p * 1.4)); o = Math.min(1, dt / 0.06 + 0.2);
        } else if (it.kind === 'big') {
          const p = clamp01(dt / 0.34); s = 0.5 + 0.5 * backOut(p); r = it.rot * p; y = 40 * (1 - Math.min(1, p * 1.5));
        } else if (it.kind === 'tag' || it.kind === 'label') {
          const p = clamp01(dt / 0.28); s = 0.85 + 0.15 * backOut(p); r = it.rot * p; y = 50 * (1 - backOut(p));
        } else {
          const p = clamp01(dt / 0.32); s = 0.6 + 0.4 * backOut(p); r = it.rot * p;
        }
        if (it.shake) {   // 落定后轻抖一下
          const ds = dt - 0.3;
          if (ds > 0 && ds < 0.4) { const d = 1 - ds / 0.4; x += 9 * Math.sin(ds * 55) * d; r += 2.2 * Math.sin(ds * 55 + 1) * d; }
        }
        if (it.legacy) o *= clamp01((it.out + it.exit - t) / it.exit);   // 段尾线性淡出（v3.4 talk 原规则）
        else if (t > it.out) { const q = clamp01((t - it.out) / it.exit); o *= 1 - q; s *= 1 - 0.18 * q; y -= 14 * q; }
        it.box.style.opacity = o.toFixed(3);
        let pre = '';
        if (it.dk) {   // 停靠前：整块平移 + 缩放到全屏时的位置 / 大小；说到 dock.cue 起 0.3s 滑到标题位
          const q = it.dk.t == null ? 0 : clamp01((t - it.dk.t) / 0.3), e = 1 - Math.pow(1 - q, 3);   // 先快后慢：词那一帧就开始滑
          pre = `translate(${(it.dk.ox * (1 - e)).toFixed(1)}px, ${(it.dk.oy * (1 - e)).toFixed(1)}px) scale(${(it.dk.so + (1 - it.dk.so) * e).toFixed(4)}) `;
        }
        it.box.style.transform = `${pre}translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`;
        // 分段亮出：后面的段在自己的词起点弹出
        if (it.spans.length > 1) it.spans.forEach((sp, j) => {
          const d2 = t - it.ats[j];
          if (j === 0) return;
          if (d2 < 0) { sp.style.display = 'none'; if (sp._br) sp._br.style.display = 'none'; return; }   // 还没念到：不占位（牌子不出空白尾巴），念到时牌子跟着长出来
          sp.style.display = 'inline-block'; if (sp._br) sp._br.style.display = '';
          const p2 = clamp01(d2 / 0.26);
          sp.style.opacity = Math.min(1, 0.35 + d2 / 0.08).toFixed(3);
          sp.style.transform = `translateY(${(18 * (1 - p2)).toFixed(1)}px) scale(${(0.4 + 0.6 * backOut(p2)).toFixed(4)})`;
        });
      });
    }
    return { el, update, items: items.map((it) => ({ at: it.at, out: it.out, end: it.out + it.exit, text: it.text, el: it.box })) };
  }

  function create(data, ctx) {
    const raw = Array.isArray(data.keywords) ? data.keywords : data.keyword ? [data.keyword] : [];
    const kws = raw.map((k) => (typeof k === 'string' ? { text: k } : k || {})).filter((k) => String(k.text || '').trim()).slice(0, 2);
    const n = kws.length;
    const el = document.createElement('div');
    el.className = 'mh-talk';
    el.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    const kw = createBadges(kws.map((k) => ({ text: k.text, cue: k.cue, side: k.side, out: k.out, kind: 'keyword' })), ctx,
      { el, side: (i) => (n === 1 ? (data.side === 'right' ? 'right' : 'left') : (i === 0 ? 'left' : 'right')) });
    const bd = Array.isArray(data.badges) && data.badges.length ? createBadges(data.badges, ctx) : null;
    if (bd) el.appendChild(bd.el);
    const update = (t) => { kw.update(t); if (bd) bd.update(t); };
    return { el, layer: 'screen', avatar: 'full', cams: [], update, handlesBadges: true,
      keywords: kw.items.map((it) => ({ at: it.at, el: it.el })), badges: bd ? bd.items : [] };
  }

  MHEngine.Badges = { create: createBadges, STYLES, registerKinds: (pack, kinds) => { KINDS_PACK[String(pack)] = kinds || null; } };
  MHEngine.CoreComponents = Object.assign(MHEngine.CoreComponents || {}, { talk: { create } });
})(window);
