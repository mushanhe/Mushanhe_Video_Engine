/**
 * Mushanhe Video Engine — ScriptSync：剧本 ↔ 真人素材同步小工具（templates/01–12 共用，零依赖）
 *
 * 全部能力都是「剧本里有才生效」，剧本里没有对应字段时模板行为与原版逐帧一致：
 *   1. sc.words      [["字或词", start, end], ...]（规范：全片绝对秒）→ 真实词级字幕。
 *                    相对秒自动纠正只在一种情况下发生：sc.start > 0、首词早于段首 0.5s 以上，且整体叠加 sc.start 后
 *                    全部落在本段容差区间 [start-1.0, start+dur+1.0] 内 → 整体平移并 console.warn（全页一次）。
 *                    第 1 段（start = 0）相对秒与绝对秒本来相同，无需纠正；其余情况不改时间，
 *                    但只要仍有词落在该区间之外，就按「段号 + 词序号」逐段 console.warn，不再静默错位。
 *                    分行：有 sc.sub 时按字 LCS 把每行断点映射到实际念出的词上（多念归入最近一行、少念跳过），
 *                    映射后某行宽度超过 14 再按停顿 ≥0.3s / 最大宽度拆开；没有 sub 时按停顿 ≥0.3s / 每行 ≤14 字自动切分。
 *   2. sc.avatarCues [[t, "card|pip|corner|full"], ...]（本页秒数）→ 一段之内按词级时间连续切人像形态。
 *   3. meta.avatar.offset  人像 <video> 对齐：video.currentTime = offset + t。
 *   4. meta.audio    "voice.wav" 或 { src, offset, volume } → 挂载 <audio id="voice-audio">，
 *                    播放时以人声音轨为主时钟（seek / 播放 / 暂停全部同步）。
 *   5. meta.themeCues [[t, "obsidian", "可选角标文字"], ...] → 按时间确定性切换 01–06 的实时皮肤（seek 可逆）。
 *
 * v3.4 新增（同样「剧本里有才生效」）：
 *   6. resolveMedia(script, dataSrc)：meta.audio / meta.avatar.video / meta.avatar.bg 一律以「剧本 JSON 文件」为基准解析
 *      （不再以页面目录为基准），换风格包、剧本放在 work/ 下都不断素材；任一媒体加载失败 → console.error + 页面红条（missing-media）。
 *   7. meta.avatar.focus "50% 30%" → 人像 object-position（竖屏 / 手机素材 full 时不裁脸）；不写保持 center top。
 *   8. meta.avatar.cuts [秒, ...]（rough_cut.py 的剪点）→ 剪点不在换段处时，人像做一次 1.0→1.08 推近盖住跳切（确定性，可逆）。
 *   9. sceneCtx(sc, start, dur) → 组件 ctx = { dur, start, words, cue }；cue("词", 兜底秒) 返回该词在本段的局部起点秒。
 *  10. theme.pip "circle" | "square" → 画中画圆窗 / 方窗由皮肤参数决定；?chrome=0（导出 / 抽帧）隐藏顶部英文页签。
 *
 * v3.4.1（金样片）：
 *  11. ctx.cueEnd("词") → 该词念完的局部秒；ctx.clauseEnd(t) → t 所在分句最后一个字念完的局部秒（牌子按它退场）。
 *  12. sc.avatarPush { cue, zoom=1.08, dur=0.8 } → 说到这个词时人像镜头缓推一次（本段结束复位）。
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  // ==================== v3.4 · 媒体路径以剧本为基准 + 缺素材显式报错 ====================
  const ABS_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
  const MEDIA_LABEL = { 'avatar-video': '人像视频 meta.avatar.video', 'voice-audio': '人声音轨 meta.audio', 'avatar-studio-bg': '人像底图 meta.avatar.bg' };
  const mediaErrors = [];
  function showMediaError(msg) {
    const doc = global.document;
    if (!doc || !doc.body) return;
    let el = doc.getElementById('mh-media-error');
    if (!el) {
      el = doc.createElement('div'); el.id = 'mh-media-error';
      el.style.cssText = 'position:fixed;left:16px;top:16px;z-index:2000;max-width:min(1100px,calc(100vw - 32px));padding:12px 18px;background:#D7263D;color:#FFFFFF;border:3px solid #111111;font:700 15px/1.45 "Noto Sans SC","Microsoft YaHei",sans-serif;white-space:pre-wrap;word-break:break-all;box-shadow:6px 6px 0 #111111;';
      doc.body.appendChild(el);
    }
    el.textContent = `⚠ 素材加载失败（missing-media），成片会没人或没声音：\n${mediaErrors.join('\n')}\n素材路径按「剧本 JSON 所在目录」解析，请检查剧本里的路径。`;
    if (msg) el.dataset.last = msg;
  }
  if (global.addEventListener) {
    // 资源加载失败的 error 事件不冒泡，但可以在捕获阶段统一接住（<video> / <audio> / <img>）
    global.addEventListener('error', (e) => {
      const el = e && e.target;
      if (!el || !/^(VIDEO|AUDIO|IMG|SOURCE)$/.test(el.tagName || '')) return;
      const url = el.currentSrc || el.src || el.getAttribute('src') || '';
      if (!url) return;
      const what = MEDIA_LABEL[el.id] || el.tagName.toLowerCase();
      const line = `${what} → ${url}`;
      if (mediaErrors.includes(line)) return;
      mediaErrors.push(line);
      console.error(`[MHEngine] missing-media 媒体加载失败：${line}`);
      showMediaError(line);
    }, true);
  }

  /** 把剧本里的媒体路径换成「以剧本 JSON 为基准」的绝对 URL（原地修改并返回 script）。绝对 URL / data: / blob: 不动。 */
  function resolveMedia(script, dataSrc) {
    if (!script || typeof script !== 'object') return script;
    let base;
    try { base = new URL(dataSrc || 'demo_data.json', global.location.href); } catch (_) { return script; }
    const fix = (s) => (typeof s === 'string' && s && !ABS_URL.test(s) ? new URL(s, base).href : s);
    const meta = (script.meta = script.meta || {});
    const av = meta.avatar;
    if (av && typeof av === 'object') { if (av.video) av.video = fix(av.video); if (av.bg) av.bg = fix(av.bg); }
    const A = meta.audio;
    if (typeof A === 'string') meta.audio = fix(A);
    else if (A && typeof A === 'object' && A.src) A.src = fix(A.src);
    // 画中画形状交给皮肤参数：theme.pip（或 meta.avatar.pip）= circle / square；不写 = 风格包原样
    const pip = (script.theme && script.theme.pip) || (av && av.pip);
    const root = global.document && global.document.documentElement;
    if (root && (pip === 'circle' || pip === 'square')) root.setAttribute('data-mh-pip', pip);
    return script;
  }

  // ?chrome=0：导出 / 抽帧时隐藏顶部英文页签（engine.css 按 html.mh-chrome-off 隐藏），预览页照常显示
  try {
    if (global.document && new URLSearchParams(global.location.search).get('chrome') === '0') global.document.documentElement.classList.add('mh-chrome-off');
  } catch (_) {}

  /** 剪点推近计划：返回 t → 缩放倍数；没有 meta.avatar.cuts 时返回 null（画面与原版逐帧一致）。
   *  规则：换段（第 2 段起的段首）与 avatarCues 视为「已有镜头切换」，±0.35s 内的剪点不另做处理，并把推近复位到 1.0；
   *        其余剪点在剪点那一帧做一次硬推近（1.0 ↔ cutZoom，默认 1.08，交替），盖住人物位置的跳变。 */
  function cutPlan(meta, scenes) {
    const av = (meta && meta.avatar) || {};
    const cuts = (Array.isArray(av.cuts) ? av.cuts : []).map((c) => +(c && typeof c === 'object' ? c.t : c)).filter(Number.isFinite).sort((a, b) => a - b);
    if (!cuts.length) return null;
    const Z = +av.cutZoom > 1 ? +av.cutZoom : 1.08;
    const bounds = [];
    (scenes || []).forEach((s, i) => {
      if (i) bounds.push(+s.start);
      (s.avatarCues || []).forEach((c) => { if (Array.isArray(c) && Number.isFinite(+c[0])) bounds.push(+c[0]); });
    });
    const ev = bounds.map((b) => [b, 'reset']);
    const list = cuts.map((c) => {
      const covered = bounds.some((b) => Math.abs(b - c) <= 0.35);
      if (!covered) ev.push([c, 'toggle']);
      return { t: c, covered };
    });
    ev.sort((a, b) => a[0] - b[0] || (a[1] === 'reset' ? -1 : 1));
    const at = (t) => {
      let z = 1;
      for (const [x, k] of ev) { if (x > t + 1e-6) break; z = k === 'reset' ? 1 : (z === 1 ? Z : 1); }
      return z;
    };
    return { at, list, zoom: Z };
  }

  /** v3.4.1 · 镜头推近：sc.avatarPush = { cue: "到底", zoom: 1.08, dur: 0.8 }（或数组）→ 说到这个词时人像镜头缓推一次，
   *  到本段结束复位。没写就返回 null（画面逐帧不变）。与剪点推近相乘。 */
  function pushPlan(scenes) {
    const ev = [];
    (scenes || []).forEach((s) => {
      const list = Array.isArray(s.avatarPush) ? s.avatarPush : s.avatarPush ? [s.avatarPush] : [];
      if (!list.length) return;
      const st = +s.start || 0, end = st + (+s.dur || 0), K = cueKit(s, st);
      list.forEach((p) => {
        const o = typeof p === 'string' ? { cue: p } : p || {};
        const at = K.cue(o.cue, typeof o.t === 'number' ? o.t - st : null);
        if (at == null) return;
        ev.push({ t0: st + at, d: Math.max(0.1, +o.dur || 0.8), z: +o.zoom > 1 ? +o.zoom : 1.08, end });
      });
    });
    if (!ev.length) return null;
    const ease = (x) => 1 - Math.pow(1 - x, 3);   // 先快后慢：说到这个词的那一帧镜头就开始动
    return { list: ev, at(t) {
      let z = 1;
      ev.forEach((e) => { if (t >= e.t0 && t < e.end) z *= 1 + (e.z - 1) * ease(Math.max(0, Math.min(1, (t - e.t0) / e.d))); });
      return z;
    } };
  }

  const LATIN = /^[A-Za-z0-9.\-_/@#:+%]+$/;
  const STRIP = /[\s，。、！？；：,!?;:“”"'‘’（）()《》【】「」…—·~～]/g;
  const norm = (s) => String(s == null ? '' : s).replace(STRIP, '');
  const width = (tk) => (LATIN.test(tk) ? Math.max(1, Math.round(tk.length * 0.55)) : norm(tk).length);

  const chars = (s) => Array.from(norm(s).toLowerCase());
  const segCount = new WeakMap();   // words 数组 → 已处理段数（推算段号用）

  /** 自动切行：遇停顿 ≥0.3s 或本行宽度（width() 口径）将超 14 就换行。没有 sub 时就是这条逻辑（与 v3.2.1 逐字一致） */
  function autoSplit(list, groups) {
    let g = [], n = 0;
    for (let k = 0; k < list.length; k++) {
      const w = list[k], wd = width(w[0]);
      const gap = g.length ? w[1] - g[g.length - 1][2] : 0;
      if (g.length && (gap >= 0.3 || n + wd > 14)) { groups.push(g); g = []; n = 0; }
      g.push(w); n += wd;
    }
    if (g.length) groups.push(g);
    return groups;
  }

  /**
   * 不照稿念时的分行兜底：按字做 LCS，把 sc.sub 每行的断点映射到实际念出的 words 上。
   * 返回每个词的行号（单调不减）；多念的词归入时间上最近的已对齐词所在行，少念的字自然跳过；
   * 完全对不上（或规模过大）时返回 null，由调用方退回自动切行。
   */
  function mapLines(subs, W) {
    const S = [], SL = [], C = [], CW = [];
    subs.forEach((line, li) => chars(line).forEach((c) => { S.push(c); SL.push(li); }));
    W.forEach((w, wi) => chars(w[0]).forEach((c) => { C.push(c); CW.push(wi); }));
    const n = S.length, m = C.length;
    if (!n || !m || n * m > 4e6) return null;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = S[i] === C[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    if (!dp[0][0]) return null;
    const votes = W.map(() => ({}));
    for (let i = 0, j = 0; i < n && j < m;) {
      if (S[i] === C[j]) { const v = votes[CW[j]]; v[SL[i]] = (v[SL[i]] || 0) + 1; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    const L = votes.map((v) => {
      let best = -1, cnt = 0;
      Object.keys(v).forEach((k) => { if (v[k] > cnt || (v[k] === cnt && +k < best)) { best = +k; cnt = v[k]; } });
      return best;
    });
    for (let i = 0, run = -1; i < L.length; i++) if (L[i] >= 0) { if (L[i] < run) L[i] = run; run = L[i]; }   // 强制单调
    for (let i = 0; i < L.length; i++) {
      if (L[i] >= 0) continue;
      let p = i - 1, q = i + 1;
      while (p >= 0 && L[p] < 0) p--;
      while (q < L.length && L[q] < 0) q++;
      const gp = p >= 0 ? W[i][1] - W[p][2] : Infinity, gq = q < L.length ? W[q][1] - W[i][2] : Infinity;
      L[i] = gp <= gq ? L[p] : L[q];   // 多念的词：归入时间上更近的一行（左边优先）
    }
    return L;
  }

  /** 把一段 sc.words 按行推进 WORD_DATA；返回 true 表示已处理（调用方跳过均分逻辑）。idx（可选）= 段号，从 0 起 */
  function pushWords(sc, words, lines, idx) {
    // 段号：调用方没传时按同一份 words 数组上的调用次数推算（模板对每一段都会调用一次）
    let seg = segCount.get(words) || 0;
    segCount.set(words, seg + 1);
    if (Number.isInteger(idx)) seg = idx;
    const raw = sc && Array.isArray(sc.words) ? sc.words : [];
    const NO = [];
    let W = raw.filter((w, i) => (Array.isArray(w) && w.length >= 3 && String(w[0]).trim() ? (NO.push(i + 1), true) : false));
    if (!W.length) return false;
    // sc.words 规范：全片绝对秒。若首词早于段首 0.5s 以上，且整体叠加 sc.start 后能落进本段容差区间
    // [start-1.0, start+dur+1.0]，判定为误传本段相对秒 → 自动平移（全页只 warn 一次）
    const st = +sc.start || 0, du = +sc.dur || 0, lo = st - 1.0, hi = st + du + 1.0;
    const inside = (w) => +w[1] >= lo && +w[2] <= hi;
    if (st > 0) {
      const minStart = Math.min(...W.map((w) => +w[1] || 0));
      if (minStart < st - 0.5) {
        const shifted = W.map((w) => [w[0], +w[1] + st, +w[2] + st]);
        if (shifted.every(inside)) {
          W = shifted;
          if (!pushWords._warned) {
            pushWords._warned = true;
            console.warn('[MHEngine.ScriptSync] sc.words 疑似使用本段相对秒，已自动叠加 sc.start；规范要求使用全片绝对秒。');
          }
        }
      }
    }
    // 平移与否，最终仍有词落在本段容差区间之外 → 一律报警（不再静默错字 / 消失）
    const bad = [];
    W.forEach((w, i) => { if (!inside(w)) bad.push(NO[i]); });
    if (bad.length) {
      console.warn(`[MHEngine.ScriptSync] 第 ${seg + 1} 段（start=${st}s, dur=${du}s）有 ${bad.length} 个词落在容差区间 [${lo.toFixed(2)}s, ${hi.toFixed(2)}s] 之外，词序号（从 1 起）：${bad.join(', ')}。请确认 sc.words 使用全片绝对秒。`);
    }

    const groups = [];
    const subs = (sc.sub || []).map(norm).filter(Boolean);
    const L = subs.length ? mapLines(subs, W) : null;
    if (L) {
      // 按映射出的行号分组；某行宽度超过 14（width() 口径）时再按停顿 / 最大宽度拆开
      let g = [];
      const flush = () => {
        if (!g.length) return;
        if (g.reduce((n, w) => n + width(w[0]), 0) > 14) autoSplit(g, groups); else groups.push(g);
        g = [];
      };
      W.forEach((w, i) => { if (i && L[i] !== L[i - 1]) flush(); g.push(w); });
      flush();
    } else {
      autoSplit(W, groups);
    }

    groups.forEach((grp) => {
      const a = words.length, sp = [];
      grp.forEach((w, i) => {
        words.push([String(w[0]), +(+w[1]).toFixed(3), +(+w[2]).toFixed(3)]);
        const nx = grp[i + 1];
        if (nx && (LATIN.test(String(w[0])) || LATIN.test(String(nx[0])))) sp.push(words.length - 1);
      });
      lines.push({ a, b: words.length - 1, sp });
    });
    return true;
  }

  /**
   * v3.4 · 词级 cue：返回 cue(spec, fallback) → 本段局部秒。
   *   spec = "词"（本段第 1 次出现）| ["词", 第几次] | { text, nth } | 数字（直接写本段局部秒）；
   *   本段没有 words → 原样返回 fallback（不写 words / cue 时画面与原版逐帧一致）；有 words 但找不到该词 → console.warn 后用 fallback。
   *   返回的是「该词第一个字的起点 − 模板给本段的起点 start」，元素就在这一帧开始入场。
   */
  function makeCue(sc, start) { return cueKit(sc, start).cue; }

  /** v3.4.1：同一份 words 上的三件套 —— cue（词起点）、cueEnd（词终点）、clauseEnd（某时刻所在分句最后一个字的终点），都是本段局部秒 */
  function cueKit(sc, start) {
    const st = +start || 0, du = +((sc && sc.dur) || 0);
    let W = (sc && Array.isArray(sc.words) ? sc.words : []).filter((w) => Array.isArray(w) && w.length >= 3 && String(w[0]).trim());
    if (W.length && st > 0 && Math.min(...W.map((w) => +w[1] || 0)) < st - 0.5) {   // 与 pushWords 同一条相对秒兜底
      const sh = W.map((w) => [w[0], +w[1] + st, +w[2] + st]);
      if (sh.every((w) => w[1] >= st - 1.0 && w[2] <= st + du + 1.0)) W = sh;
    }
    // 两条字流：原字（「12」）+ 数字展开成读法（「十二」），cue 写哪种都能对上
    const streams = [[], []].map((C, mode) => {
      const CW = [];
      W.forEach((w, wi) => chars(mode ? cnNum(w[0]) : w[0]).forEach((c) => { C.push(c); CW.push(wi); }));
      return { C, CW };
    });
    const warned = new Set();
    /** 找到 spec 在字流里的位置 → [第一个字的词号, 最后一个字的词号]；找不到返回 null */
    function locate(spec) {
      let text = spec, nth = 1;
      if (Array.isArray(spec)) { text = spec[0]; nth = Math.max(1, +spec[1] || 1); }
      else if (typeof spec === 'object') { text = spec.text; nth = Math.max(1, +spec.nth || 1); }
      if (!streams[0].C.length || !chars(text).length) return null;
      let hit = -1, CW = null, KL = 0;
      for (let mode = 0; mode < 2 && hit < 0; mode++) {
        const K = chars(mode ? cnNum(text) : text), C = streams[mode].C;
        let cnt = 0;
        for (let i = 0; i + K.length <= C.length && hit < 0; i++) {
          let ok = true;
          for (let k = 0; k < K.length; k++) if (C[i + k] !== K[k]) { ok = false; break; }
          if (ok && ++cnt === nth) { hit = i; CW = streams[mode].CW; KL = K.length; }
        }
      }
      if (hit < 0) {
        const key = `${text}#${nth}`;
        if (!warned.has(key)) { warned.add(key); console.warn(`[MHEngine.ScriptSync] cue「${text}」（第 ${nth} 次）在本段口播 words 里找不到，已退回模板默认时间；cue 必须和 words 里的字一模一样。`); }
        return null;
      }
      return [CW[hit], CW[hit + KL - 1]];
    }
    const isSpec = (spec) => !(spec == null || spec === '' || spec === false);
    function cue(spec, fallback) {
      if (!isSpec(spec)) return fallback;
      if (typeof spec === 'number' && Number.isFinite(spec)) return spec;
      const L = locate(spec);
      return L ? Math.max(0, +(+W[L[0]][1] - st).toFixed(3)) : fallback;
    }
    /** 这个词（最后一个字）念完的局部秒 */
    function cueEnd(spec, fallback) {
      if (!isSpec(spec) || typeof spec === 'number') return fallback;
      const L = locate(spec);
      return L ? Math.max(0, +(+W[L[1]][2] - st).toFixed(3)) : fallback;
    }
    // 分句终点：sc.sub 里 ，。！？；…（及半角）前面那个字所在的词 = 分句最后一个字；顿号 / 冒号不算。
    // sub 与 words 按字 LCS 对齐（与分行同一套），没有 sub 时按词间停顿 ≥0.35s 兜底；本段最后一个词永远是分句终点。
    let ends = null;
    function clauseEnds() {
      if (ends) return ends;
      ends = W.map(() => false);
      if (!W.length) return ends;
      const subs = (sc && Array.isArray(sc.sub) ? sc.sub : []).map((x) => String(x == null ? '' : x));
      const S = [], F = [];
      subs.forEach((line) => Array.from(line).forEach((ch) => {
        if (/[，。！？；…,.!?;]/.test(ch)) { if (S.length) F[S.length - 1] = true; return; }
        const c = norm(ch).toLowerCase();
        if (c) { S.push(c); F.push(false); }
      }));
      const C = streams[0].C, CW = streams[0].CW, n = S.length, m = C.length;
      if (n && m && n * m <= 4e6 && F.some(Boolean)) {
        const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = S[i] === C[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        let lastW = -1;
        for (let i = 0, j = 0; i < n && j < m;) {
          if (S[i] === C[j]) { lastW = CW[j]; if (F[i]) ends[lastW] = true; i++; j++; }
          else if (dp[i + 1][j] >= dp[i][j + 1]) { if (F[i] && lastW >= 0) ends[lastW] = true; i++; }
          else j++;
        }
      } else {
        for (let i = 0; i + 1 < W.length; i++) if (+W[i + 1][1] - +W[i][2] >= 0.35) ends[i] = true;
      }
      ends[W.length - 1] = true;
      return ends;
    }
    /** 局部秒 t 所在（或之后第一个）分句最后一个字念完的局部秒；没有 words 返回 fallback */
    function clauseEnd(t, fallback) {
      if (!W.length || !Number.isFinite(+t)) return fallback;
      const E = clauseEnds(), abs = st + +t;
      let i = W.findIndex((w) => +w[2] > abs + 0.02);
      if (i < 0) i = W.length - 1;
      while (i < W.length - 1 && !E[i]) i++;
      return Math.max(0, +(+W[i][2] - st).toFixed(3));
    }
    return { cue, cueEnd, clauseEnd, locate };
  }

  /** 阿拉伯数字 → 普通话读法（12→十二、30→三十、105→一百零五、3.5→三点五），只给 cue 比对用（与 align.py num_reading 同规则） */
  function cnNum(s) {
    const D = '零一二三四五六七八九';
    const four = (n) => {
      let out = '', zero = false;
      [[1000, '千'], [100, '百'], [10, '十'], [1, '']].forEach(([v, u]) => {
        const d = Math.floor(n / v) % 10;
        if (d) { if (zero) out += '零'; out += D[d] + u; zero = false; } else if (out) zero = true;
      });
      return out;
    };
    return String(s == null ? '' : s).replace(/(\d+)(?:\.(\d+))?(%?)/g, (m, ip, dp, pct) => {
      const n = +ip;
      let r;
      if (n === 0) r = '零';
      else if (ip.length > 8) r = Array.from(ip).map((c) => D[+c]).join('');
      else {
        const hi = Math.floor(n / 10000), lo = n % 10000;
        r = hi ? four(hi) + '万' + (lo > 0 && lo < 1000 ? '零' : '') + four(lo) : four(lo);
        if (r.startsWith('一十')) r = r.slice(1);
      }
      if (dp) r += '点' + Array.from(dp).map((c) => D[+c]).join('');
      return (pct ? '百分之' : '') + r;
    }).replace(/两/g, '二');
  }

  /** 组件 ctx：{ dur, start, words, cue }。12 套组件原来只读 ctx.dur，多出来的键不影响旧组件 */
  function sceneCtx(sc, start, dur) {
    const K = cueKit(sc, start);
    return { dur, start: +start || 0, words: (sc && Array.isArray(sc.words)) ? sc.words : [], cue: K.cue, cueEnd: K.cueEnd, clauseEnd: K.clauseEnd };
  }

  /** 内核句型（v3.4：talk）：风格包自己没有该 type 时由内核提供，12 套通用 */
  function coreComponent(type) {
    const C = MHEngine.CoreComponents || {};
    return Object.prototype.hasOwnProperty.call(C, type) ? C[type] : null;
  }

  /** 人像形态分段：没有 avatarCues 时与 scenes 一一对应（种子、时间完全不变） */
  function avatarSegments(scenes) {
    const segs = [];
    scenes.forEach((s) => {
      const end = s.start + s.dur;
      const cues = (s.avatarCues || []).filter((c) => Array.isArray(c) && c[0] > s.start && c[0] < end).sort((a, b) => a[0] - b[0]);
      let st = s.start, mode = s.avatar;
      cues.forEach(([t, m]) => { segs.push({ start: st, dur: t - st, avatar: mode, scene: s }); st = t; mode = m; });
      segs.push({ start: st, dur: end - st, avatar: mode, scene: s });
    });
    return segs;
  }

  /** 当前时刻的人像形态段（fallback = 当前场景本身） */
  function avatarAt(segs, t, fallback) {
    if (!segs || !segs.length) return fallback;
    for (let i = segs.length - 1; i >= 0; i--) if (t >= segs[i].start) return segs[i];
    return segs[0];
  }

  /** 人像视频 offset + 可选人声音轨主时钟 */
  function mediaClock(opts) {
    const meta = (opts && opts.meta) || {};
    const video = (opts && opts.video) || null;
    const vOff = +((meta.avatar || {}).offset) || 0;
    const A = meta.audio;
    const aSrc = typeof A === 'string' ? A : (A && A.src) || '';
    const aOff = A && typeof A === 'object' ? +A.offset || 0 : 0;
    let audio = null;
    if (aSrc) {
      audio = document.getElementById('voice-audio') || document.createElement('audio');
      audio.id = 'voice-audio'; audio.preload = 'auto'; audio.src = aSrc;
      if (A && typeof A === 'object' && A.volume != null) audio.volume = +A.volume;
      if (!audio.parentNode) document.body.appendChild(audio);
    }
    let target = 0, lastHard = 0;
    const setT = (el, off, t) => { if (el) { try { el.currentTime = Math.max(0, off + t); } catch (_) {} } };
    // 元数据晚到时补一次定位（无头抽帧 / 首屏 seek 都靠它）
    [video, audio].forEach((el, i) => el && el.addEventListener('loadedmetadata', () => { if (el.paused) setT(el, i ? aOff : vOff, target); }));

    // v3.4：人像焦点（object-position）+ 剪点推近（transform），都只在剧本写了对应字段时才动样式
    const av = meta.avatar || {};
    const focus = typeof av.focus === 'string' && av.focus.trim() ? av.focus.trim() : '';
    if (video && focus) video.style.objectPosition = focus;
    const plan = video ? cutPlan(meta, opts && opts.scenes) : null;
    const push = video ? pushPlan(opts && opts.scenes) : null;
    let lastZ = 1;
    const zoomAt = (t) => {
      if (!plan && !push) return;
      const z = +((plan ? plan.at(t) : 1) * (push ? push.at(t) : 1)).toFixed(4);
      if (z === lastZ && video.style.transform) return;
      lastZ = z;
      video.style.transformOrigin = focus || '50% 30%';
      video.style.transform = z === 1 ? 'scale(1)' : `scale(${z})`;
    };
    if (plan || push) zoomAt(0);

    return {
      audio, video, cuts: plan ? plan.list : [],
      seek(t) { target = t; zoomAt(t); setT(video, vOff, t); if (video) video.playbackRate = 1; setT(audio, aOff, t); },
      play(t) {
        if (t != null && Math.abs(t - target) > 0.05) this.seek(t);
        if (video) video.play().catch(() => {});
        if (audio) audio.play().catch(() => {});
      },
      pause() { if (video) video.pause(); if (audio) audio.pause(); },
      /** 播放中的主时钟：有人声音轨时以音轨为准，否则用调用方传入的 performance 时钟 */
      now(fallback) {
        if (!audio || audio.paused && !audio.ended) return fallback;
        if (audio.ended) return Math.max(fallback, audio.duration - aOff);
        return audio.currentTime - aOff;
      },
      /** 人像视频柔性追帧（漂移 >0.55s 硬切、>0.025s 微调倍速） */
      follow(t) {
        target = t;
        zoomAt(t);
        if (!video || video.seeking || video.readyState < 2) return;
        const drift = vOff + t - video.currentTime, now = performance.now();
        if (Math.abs(drift) > 0.55 && now - lastHard > 900) { video.playbackRate = 1; setT(video, vOff, t); lastHard = now; }
        else if (Math.abs(drift) > 0.025) video.playbackRate = drift > 0 ? 1.05 : 0.95;
        else if (video.playbackRate !== 1) video.playbackRate = 1;
        if (video.paused && audio && !audio.paused) video.play().catch(() => {});
      }
    };
  }

  /** meta.themeCues：按时间确定性切换实时皮肤 + 角标 */
  const cueState = new WeakMap();
  function findThemes() {
    for (const k of Object.keys(global)) {
      if (/Themes$/.test(k) && global[k] && typeof global[k].apply === 'function' && global[k].PRESETS) return global[k];
    }
    return null;
  }
  function renderCues(script, t) {
    const meta = (script && script.meta) || {};
    const cues = meta.themeCues;
    if (!Array.isArray(cues) || !cues.length) return;
    let st = cueState.get(script);
    if (!st) {
      const T = findThemes();
      if (!T) return;
      const vp = document.getElementById('viewport') || document.body;
      const badge = document.createElement('div');
      badge.id = 'mh-cue-badge';
      badge.style.cssText = 'position:absolute;left:50%;bottom:150px;z-index:60;transform:translateX(-50%);padding:12px 26px 12px 20px;display:flex;align-items:center;gap:14px;background:#0B0D12;color:#FFFFFF;border:2px solid #FFFFFF;box-shadow:0 14px 36px rgba(0,0,0,.45);font:800 26px/1.1 "JetBrains Mono","Noto Sans SC","Microsoft YaHei",monospace;letter-spacing:.06em;pointer-events:none;opacity:0;white-space:nowrap;';
      vp.appendChild(badge);
      st = { T, base: T.current ? T.current() : null, name: null, badge, shownKey: '' };
      cueState.set(script, st);
    }
    const sorted = cues.filter((c) => Array.isArray(c)).slice().sort((a, b) => a[0] - b[0]);
    let cur = null;
    sorted.forEach((c) => { if (t >= c[0]) cur = c; });
    // 皮肤名先走风格包自己的 normalize()（大小写 / 连字符 / 旧皮肤名 → 新名），再查 PRESETS，旧名时角标不会为空
    const canon = (n) => (n && typeof st.T.normalize === 'function' && st.T.normalize(n)) || n;
    const name = canon(cur ? cur[1] : st.base);
    if (name && name !== st.name) { st.T.apply(name, { syncUrl: false }); st.name = name; }
    // 角标：切换后 1.6s 内显示（确定性淡入淡出）
    const dt = cur ? t - cur[0] : 99;
    const op = dt < 0 || dt > 1.6 ? 0 : Math.min(1, dt / 0.12, (1.6 - dt) / 0.3);
    st.badge.style.opacity = op.toFixed(3);
    if (op > 0) {
      const P = (st.T.PRESETS || {})[name] || {};
      const key = name + '|' + (cur[2] || '');
      if (key !== st.shownKey) {
        const dots = (P.dots || []).map((c) => `<i style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${c};border:2px solid #FFFFFF;"></i>`).join('');
        st.badge.innerHTML = `<span style="display:flex;gap:6px;">${dots}</span><span>SKIN ▸ ${(P.en || name).toUpperCase()}</span><span style="color:#FFD23F;">${cur[2] || P.label || ''}</span>`;
        st.shownKey = key;
      }
      st.badge.style.transform = `translateX(-50%) scale(${(0.92 + 0.08 * Math.min(1, dt / 0.18)).toFixed(3)})`;
    }
  }

  // ==================== 01–12 风格一键切换器（预览页右上角，自动携带 ?data= 剧本） ====================
  // 只在 templates/01_*–12_* 独立预览页挂载：?clean=1（抽帧 / 导出）与 iframe 嵌入（整期串联）一律不挂。
  const PACKS = [
    ['01', '01_industrial_3d', '工业3D', '#FF5A1F'],
    ['02', '02_swiss_print', '瑞士印刷', '#D92323'],
    ['03', '03_investigative_desk', '深度调查桌面', '#FFD60A'],
    ['04', '04_nodegraph', '3D 节点工作流', '#00E5C3'],
    ['05', '05_pro_nle', 'Pro NLE 剪辑台', '#3B82F6'],
    ['06', '06_neobrutalism', '撞色潮刊', '#FF4D6D'],
    ['07', '07_chalkboard', '学院黑板', '#7BC47F'],
    ['08', '08_song_ink', '宋韵水墨', '#B82925'],
    ['09', '09_analog_film', '日系胶片', '#E8A838'],
    ['10', '10_retro_crt', '复古 CRT', '#33FF66'],
    ['11', '11_stage_glass', '发布会流光', '#8B7BFF'],
    ['12', '12_fin_terminal', '金融终端', '#F59E0B']
  ];
  const SW_ID = 'mh-style-switcher';
  const SW_CSS = `
#${SW_ID}{position:fixed;top:14px;right:16px;z-index:1001;font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;user-select:none}
#${SW_ID}.mh-hide{display:none}
#${SW_ID} .mh-sw-btn{display:flex;align-items:center;gap:7px;height:30px;padding:0 12px 0 10px;border-radius:999px;cursor:pointer;
  background:rgba(14,17,23,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.16);
  box-shadow:0 6px 18px rgba(0,0,0,.35);color:#F1F5F9;font-size:12.5px;font-weight:800;letter-spacing:.02em;white-space:nowrap}
#${SW_ID} .mh-sw-btn:hover{border-color:rgba(255,255,255,.38);background:rgba(14,17,23,.9)}
#${SW_ID} .mh-sw-btn b{font-family:'JetBrains Mono',Consolas,monospace;font-weight:900;color:#94A3B8}
#${SW_ID} .mh-sw-btn .car{opacity:.7;font-size:10px;transition:transform .18s ease}
#${SW_ID}.open .mh-sw-btn .car{transform:rotate(180deg)}
#${SW_ID} .mh-dot{width:10px;height:10px;border-radius:50%;flex:none;box-shadow:0 0 0 1.5px rgba(255,255,255,.55)}
#${SW_ID} .mh-sw-menu{position:absolute;top:36px;right:0;width:212px;max-height:calc(100vh - 80px);overflow:auto;padding:6px;border-radius:12px;
  background:rgba(14,17,23,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.14);
  box-shadow:0 18px 44px rgba(0,0,0,.5);display:none}
#${SW_ID}.open .mh-sw-menu{display:block}
#${SW_ID} .mh-sw-hd{padding:5px 8px 6px;color:#64748B;font:900 10px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:.14em}
#${SW_ID} a{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:7px;color:#CBD5E1;text-decoration:none;font-size:13px;font-weight:700}
#${SW_ID} a:hover{background:rgba(255,255,255,.08);color:#FFFFFF}
#${SW_ID} a b{font-family:'JetBrains Mono',Consolas,monospace;font-size:11.5px;font-weight:900;color:#64748B;width:18px}
#${SW_ID} a.cur{background:rgba(255,255,255,.12);color:#FFFFFF}
#${SW_ID} a.cur b{color:#FFFFFF}
#${SW_ID} a.cur::after{content:'当前';margin-left:auto;font-size:10.5px;font-weight:900;color:#0B0F14;background:#FFFFFF;border-radius:4px;padding:1px 5px}
#${SW_ID} .mh-sw-ft{margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.1)}
#${SW_ID} .mh-sw-ft a{color:#94A3B8;font-size:12px}`;

  /** 从 fromDir（以 / 结尾的路径）到 toPath 的相对路径 */
  function relPath(fromDir, toPath) {
    const a = fromDir.split('/').filter(Boolean), b = toPath.split('/').filter(Boolean);
    let i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    return '../'.repeat(a.length - i) + b.slice(i).join('/');
  }

  /** 切到目标风格包的 URL：?data= 换算成相对目标包目录的路径；不带 ?theme=；当前时间 > 0.5s 时带 &t= */
  function styleSwitchHref(folder, loc) {
    const here = new URL(loc.href);
    const target = new URL(`../${folder}/index.html`, here);
    const q = [];
    const data = here.searchParams.get('data');
    if (data) {
      const abs = new URL(data, here);
      const d = abs.origin === here.origin || here.protocol === 'file:' ? relPath(target.pathname.replace(/[^/]*$/, ''), abs.pathname) + abs.search : abs.href;
      q.push(`data=${encodeURIComponent(decodeURIComponent(d)).replace(/%2F/gi, '/')}`);
    }
    let t = 0;
    try { const E = global.__MH_ENGINE__; t = E && typeof E.time === 'function' ? +E.time() || 0 : 0; } catch (_) {}
    if (t > 0.5) q.push(`t=${t.toFixed(2)}`);
    return `../${folder}/index.html${q.length ? '?' + q.join('&') : ''}`;
  }

  /** 防呆：真人用浏览器打开了带 clean=1 的链接（播放键 / 切换器都被隐藏）→ 右下角提示并给出正常预览链接。
   *  无头抽帧 / 导出（navigator.webdriver = true）不显示，画面不受影响。 */
  function warnCleanLink() {
    try { if (global.navigator && global.navigator.webdriver) return; } catch (_) { return; }
    const doc = global.document;
    const u = new URL(global.location.href);
    ['clean', 't', 'chrome'].forEach((k) => u.searchParams.delete(k));
    const el = doc.createElement('div');
    el.id = 'mh-clean-warn';
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2001;max-width:520px;padding:12px 16px;background:#FFE500;color:#111111;border:3px solid #111111;box-shadow:5px 5px 0 #111111;font:700 14px/1.5 "Noto Sans SC","Microsoft YaHei",sans-serif;';
    el.innerHTML = `这个链接带 <code>clean=1</code>，只给抽帧 / 导出用：播放键和风格切换器都被隐藏了。<br/><a href="${u.pathname + u.search}" style="color:#111111;">→ 打开正常预览（能播放、能换风格）</a>`;
    doc.body.appendChild(el);
  }

  function mountStyleSwitcher() {
    const doc = global.document;
    const m = /\/templates\/((0[1-9]|1[0-2])_[^/]+)\//.exec(global.location.pathname);
    if (!m || doc.getElementById(SW_ID)) return;
    let embedded = true;
    try { embedded = global.self !== global.top; } catch (_) {}
    if (!embedded && new URLSearchParams(global.location.search).get('clean') === '1') warnCleanLink();
    if (embedded || new URLSearchParams(global.location.search).get('clean') === '1') return;
    const curNo = m[2];
    const cur = PACKS.find((p) => p[0] === curNo) || [curNo, m[1], m[1], '#FFFFFF'];

    const st = doc.createElement('style'); st.id = SW_ID + '-css'; st.textContent = SW_CSS; doc.head.appendChild(st);
    const el = doc.createElement('div'); el.id = SW_ID;
    el.innerHTML = `<div class="mh-sw-btn" role="button" tabindex="0" title="切换风格（01–12），自动携带当前 ?data= 剧本">🎨 <b>${cur[0]}</b> ${cur[2]} <span class="car">▾</span></div>
<div class="mh-sw-menu"><div class="mh-sw-hd">SWITCH STYLE · 01–12</div>${PACKS.map((p) =>
      `<a data-folder="${p[1]}" class="${p[0] === curNo ? 'cur' : ''}" href="../${p[1]}/index.html"><i class="mh-dot" style="background:${p[3]}"></i><b>${p[0]}</b>${p[2]}</a>`).join('')}
<div class="mh-sw-ft"><a href="../../index.html">← 返回 12 流派总览</a></div></div>`;
    doc.body.appendChild(el);
    const btn = el.querySelector('.mh-sw-btn');
    const setOpen = (on) => el.classList.toggle('open', !!on);
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!el.classList.contains('open')); });
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(!el.classList.contains('open')); } });
    el.querySelectorAll('a[data-folder]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (a.classList.contains('cur')) { setOpen(false); return; }
      global.location.href = styleSwitchHref(a.dataset.folder, global.location);
    }));
    el.addEventListener('click', (e) => e.stopPropagation());
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    doc.addEventListener('click', () => setOpen(false));
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); }, true);

    // 位置：右上角找一块「零重叠」空位 —— 01–06 换肤胶囊（*-theme-switcher）左侧同排优先；
    // 其余依次试 顶部 14px / 整宽顶栏下方 / 胶囊下方，每排从右往左扫，避开模板自带的顶栏文字、时间码、人像框
    const place = () => {
      const W = global.innerWidth, H = global.innerHeight;
      const b0 = btn.getBoundingClientRect(), w = b0.width || 140, h = b0.height || 30;
      const shown = (n) => {
        if (typeof n.checkVisibility === 'function') return n.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        const cs = global.getComputedStyle(n);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity !== 0;
      };
      const obstacles = [], barRects = [];
      for (const n of doc.querySelectorAll('body *')) {
        if (n === el || el.contains(n)) continue;
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height || r.top > 260) continue;
        if (r.width >= W * 0.9) {                       // 整宽顶栏：只当底板（停靠在它的空白处），不算障碍
          if (r.left <= W * 0.05 && r.right >= W * 0.95 && r.top < 140 && r.height < 140 && shown(n)) barRects.push(r);   // 必须真正横跨视口（排除 3D 世界里屏外的巨型元素）
          continue;
        }
        if (r.width * r.height > W * H * 0.25 || !shown(n)) continue;   // 大背景层 / 不可见的入场前元素
        if (n.childElementCount) {                       // 纯布局包裹层（不画任何东西）不算障碍，只看真正上屏的叶子 / 有底色边框的块
          const cs = global.getComputedStyle(n);
          const paints = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' ||
            parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none';
          if (!paints) continue;
        }
        obstacles.push(r);
      }
      const free = (x, y) => obstacles.every((r) => r.left >= x + w + 6 || r.right <= x - 6 || r.top >= y + h + 4 || r.bottom <= y - 4);
      // 顶部叠放的整宽栏（自上而下连续）
      const bars = [];
      let edge = 0;
      for (let k = 0; k < 4; k++) {
        const nx = barRects.filter((r) => r.top <= edge + 2 && r.bottom > edge + 4).sort((a, b) => b.bottom - a.bottom)[0];
        if (!nx) break;
        bars.push(nx); edge = nx.bottom;
      }
      const cap = doc.querySelector('[id$="-theme-switcher"]');
      const c = cap && cap.offsetWidth ? cap.getBoundingClientRect() : null;
      const capTR = c && c.top < 40 && c.right > W - 60;
      const rows = [];                                   // [y, 起扫 x, 最左 x]
      if (capTR) rows.push([c.top + (c.height - h) / 2, c.left - 10 - w, W * 0.5]);
      bars.slice().reverse().forEach((r) => rows.push([r.top + (r.height - h) / 2, W - 16 - w, 16]));   // 停进栏内空白（最下层优先）
      if (!bars.length) rows.push([14, W - 16 - w, W * 0.5]);
      else rows.push([edge + 8, W - 16 - w, W * 0.5]);
      if (capTR) rows.push([c.bottom + 8, c.right - w, W * 0.5]);
      let pos = null;
      for (const [y, x0, x1] of rows) {
        for (let x = x0; x >= x1; x -= 4) if (free(x, y)) { pos = [x, y]; break; }
        if (pos) break;
      }
      if (!pos) pos = capTR ? [c.left - 10 - w, c.top + (c.height - h) / 2] : [W - 16 - w, 14];
      el.style.top = `${Math.round(pos[1])}px`;
      el.style.right = `${Math.round(W - pos[0] - w)}px`;
    };
    // 与 H 键 / #hud.hidden 100% 同步
    const hud = doc.getElementById('hud');
    const sync = () => { const h = !!(hud && hud.classList.contains('hidden')); el.classList.toggle('mh-hide', h); if (h) setOpen(false); };
    if (hud) new MutationObserver(sync).observe(hud, { attributes: true, attributeFilter: ['class'] });
    else doc.addEventListener('keydown', (e) => { if ((e.key === 'h' || e.key === 'H') && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { el.classList.toggle('mh-hide'); setOpen(false); } });
    // 只在启动阶段跟随换肤胶囊挂载 / 字体加载重新定位，之后位置锁定（播放中不跳位）；窗口缩放时重算
    const mo = new MutationObserver(place);
    mo.observe(doc.body, { childList: true });
    const settle = () => { place(); global.setTimeout(() => { mo.disconnect(); place(); }, 600); };
    if (doc.readyState === 'complete') settle(); else global.addEventListener('load', settle);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(place).catch(() => {});
    global.addEventListener('resize', place);
    sync(); place();
  }
  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', mountStyleSwitcher);
    else mountStyleSwitcher();
  }

  MHEngine.ScriptSync = { pushWords, avatarSegments, avatarAt, mediaClock, renderCues, styleSwitchHref,
    resolveMedia, mediaErrors, cutPlan, pushPlan, makeCue, cueKit, sceneCtx, coreComponent };
})(window);
