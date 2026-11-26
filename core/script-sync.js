/**
 * Mushanhe Video Engine — ScriptSync：剧本 ↔ 真人素材同步小工具（templates/01–12 共用，零依赖）
 *
 * 全部能力都是「剧本里有才生效」，剧本里没有对应字段时模板行为与原版逐帧一致：
 *   1. sc.words      [["字或词", start, end], ...]（本页时间轴秒数）→ 真实词级字幕；
 *                    分行优先按 sc.sub 的每一行，否则按停顿 ≥0.3s / 每行 ≤14 字自动切分。
 *   2. sc.avatarCues [[t, "card|pip|corner|full"], ...]（本页秒数）→ 一段之内按词级时间连续切人像形态。
 *   3. meta.avatar.offset  人像 <video> 对齐：video.currentTime = offset + t。
 *   4. meta.audio    "voice.wav" 或 { src, offset, volume } → 挂载 <audio id="voice-audio">，
 *                    播放时以人声音轨为主时钟（seek / 播放 / 暂停全部同步）。
 *   5. meta.themeCues [[t, "obsidian", "可选角标文字"], ...] → 按时间确定性切换 01–06 的实时皮肤（seek 可逆）。
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  const LATIN = /^[A-Za-z0-9.\-_/@#:+%]+$/;
  const STRIP = /[\s，。、！？；：,!?;:“”"'‘’（）()《》【】「」…—·~～]/g;
  const norm = (s) => String(s == null ? '' : s).replace(STRIP, '');
  const width = (tk) => (LATIN.test(tk) ? Math.max(1, Math.round(tk.length * 0.55)) : norm(tk).length);

  /** 把一段 sc.words 按行推进 WORD_DATA；返回 true 表示已处理（调用方跳过均分逻辑） */
  function pushWords(sc, words, lines) {
    const W = (sc && Array.isArray(sc.words) ? sc.words : []).filter((w) => Array.isArray(w) && w.length >= 3 && String(w[0]).trim());
    if (!W.length) return false;
    const groups = [];
    const subs = (sc.sub || []).map(norm).filter(Boolean);
    let k = 0;
    if (subs.length) {
      subs.forEach((line) => {
        const g = []; let n = 0;
        while (k < W.length && n < line.length) { g.push(W[k]); n += norm(W[k][0]).length || 1; k++; }
        if (g.length) groups.push(g);
      });
    }
    // 剩余（或没有 sub）：按停顿 / 每行 ≤14 字自动切
    let g = [], n = 0;
    for (; k < W.length; k++) {
      const w = W[k], wd = width(w[0]);
      const gap = g.length ? w[1] - g[g.length - 1][2] : 0;
      if (g.length && (gap >= 0.3 || n + wd > 14)) { groups.push(g); g = []; n = 0; }
      g.push(w); n += wd;
    }
    if (g.length) groups.push(g);

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

    return {
      audio, video,
      seek(t) { target = t; setT(video, vOff, t); if (video) video.playbackRate = 1; setT(audio, aOff, t); },
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
    const name = cur ? cur[1] : st.base;
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
    ['03', '03_vox_desk', 'Vox 侦探', '#FFD60A'],
    ['04', '04_nodegraph', 'ComfyUI 节点', '#00E5C3'],
    ['05', '05_pro_nle', 'Pro NLE 剪辑台', '#3B82F6'],
    ['06', '06_neobrutalism', '撞色潮刊', '#FF4D6D'],
    ['07', '07_chalkboard', '学院黑板', '#7BC47F'],
    ['08', '08_song_ink', '宋韵水墨', '#B82925'],
    ['09', '09_analog_film', '日系胶片', '#E8A838'],
    ['10', '10_retro_crt', '复古 CRT', '#33FF66'],
    ['11', '11_keynote_glass', 'Keynote 流光', '#8B7BFF'],
    ['12', '12_bloomberg_fin', '华尔街金融', '#F59E0B']
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

  function mountStyleSwitcher() {
    const doc = global.document;
    const m = /\/templates\/((0[1-9]|1[0-2])_[^/]+)\//.exec(global.location.pathname);
    if (!m || doc.getElementById(SW_ID)) return;
    let embedded = true;
    try { embedded = global.self !== global.top; } catch (_) {}
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

  MHEngine.ScriptSync = { pushWords, avatarSegments, avatarAt, mediaClock, renderCues, styleSwitchHref };
})(window);
