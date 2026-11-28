/**
 * Mushanhe Video Engine — 宿主页公共能力 HostKit（v3.5，把 06 金样片宿主页的新能力搬成 12 套通用）
 * ---------------------------------------------------------------------------------------------
 * 全部按剧本字段开关；不写这些字段 → 每个函数都返回「不处理」，宿主页走自己原来的代码（逐帧不变）。
 *   meta.layout: "fill"          铺满版式：侧栏卡 520×700（右 60、上下居中）/ 圆窗 260（右下各 60）；组件区 ctx.area
 *   meta.avatar.fullFrame:"inset" 全屏一律缩进画框（四边 48px）；画框边 / 投影 / 暗角由风格包 CSS 变量定（见下）
 *   meta.avatar.morph / morphStyle:"snap"  换形态粒子散聚时长 / 利落版（看不见人约 3 帧，不出半透明发白帧）
 *   meta.cardDetail: "trim"       卡片细节（CueKit 组件读 html[data-mh-card]）
 *   data.badges（任何图表句型）   牌子层叠在屏幕层；ctx.coverAt = 本段被转场盖住的局部秒，牌子在这之前退完
 *   ?chrome=0（导出 / 抽帧）       转场 / 装饰里不出英文句型名：label() / typeText() 没写 label 就返回空
 * 画框样式变量（风格包写在自己的 CSS 里，不写用默认）：
 *   --mh-frame-bw 边框粗细 · --mh-frame-bs 边框线型（solid / double…）· --mh-frame-color 边框色 · --mh-frame-shadow 投影 · --mh-frame-radius 圆角（数字，px）
 *   --mh-frame-vig 暗角强度（0–1，默认 .25）
 *
 * 用法（宿主页，按原来的顺序插进去）：
 *   const HK = MHEngine.HostKit.init(script, document.getElementById('avatar-stage'));
 *   ctx.area = HK.area(sc, { CAM_DX, CAM_ZOOM, SX, SY });  ctx.coverAt = coverAt[i];   // coverAt = HK.coverAt(script.scenes, 转场盖上提前量)
 *   const comp = MHEngine.CueKit.create(sc.type, data, ctx) || factory.create(data, ctx);
 *   const badges = HK.badges(sc, comp, ctx, screenLayerEl);
 *   new MHEngine.AvatarController(HK.presets(原来的 presets));
 *   if (!HK.scheduleMorphs({ segs: AVSEG, avatar, morph, tl, mapAv, seed })) { 原来的换形态代码 }
 *   每帧：HK.frame(t, stageEl, morph)；is-full / 画布隐藏的延迟用 HK.fullDelay(原值) 包一下。
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});
  const CSS = `
  #avatar-stage .mh-look{position:absolute;inset:0;z-index:3;pointer-events:none;opacity:0}
  html[data-mh-full="frame"] .mh-look-dark{background:
    linear-gradient(90deg,rgba(0,0,0,var(--mh-frame-vig,.25)) 0%,rgba(0,0,0,0) 29.17%,rgba(0,0,0,0) 70.83%,rgba(0,0,0,var(--mh-frame-vig,.25)) 100%),
    linear-gradient(180deg,rgba(0,0,0,calc(var(--mh-frame-vig,.25) * .48)) 0%,rgba(0,0,0,0) 20%,rgba(0,0,0,0) 82%,rgba(0,0,0,calc(var(--mh-frame-vig,.25) * .48)) 100%)}
  html[data-mh-full="frame"] #avatar-stage.is-full{border:var(--mh-frame-bw,4px) var(--mh-frame-bs,solid) var(--mh-frame-color,#111111) !important;box-shadow:var(--mh-frame-shadow,10px 10px 0 #111111) !important}
  html[data-mh-full="frame"] #avatar-stage.is-full #avatar-tag{opacity:0 !important}
  `;

  function init(script, stage) {
    const meta = (script && script.meta) || {}, av = meta.avatar || {};
    const root = document.documentElement;
    const FILL = meta.layout === 'fill';
    const LOOK = av.fullFrame === 'inset' ? 'frame' : '';
    const SNAP = av.morphStyle === 'snap';
    const CUSTOM_MD = Number.isFinite(+av.morph) && +av.morph > 0.1;
    const MD = CUSTOM_MD ? +av.morph : 0.5, MK = MD / 0.5;
    const SWAP = SNAP && MHEngine.AvatarMorphFX ? MD * MHEngine.AvatarMorphFX.SNAP_SWAP : 0;
    const CHROME_OFF = root.classList.contains('mh-chrome-off') || new URLSearchParams(global.location.search).get('chrome') === '0';
    if (FILL) root.setAttribute('data-mh-layout', 'fill');
    if (meta.cardDetail === 'trim') root.setAttribute('data-mh-card', 'trim');
    if (FILL || LOOK || SNAP || meta.cardDetail === 'trim') {
      if (!document.getElementById('mh-host-kit-css')) { const st = document.createElement('style'); st.id = 'mh-host-kit-css'; st.textContent = CSS; document.head.appendChild(st); }
    }
    if (LOOK && stage) {
      root.setAttribute('data-mh-full', LOOK);
      const tag = stage.querySelector('#avatar-tag');
      const d = document.createElement('div'); d.className = 'mh-look mh-look-dark';
      if (tag) stage.insertBefore(d, tag); else stage.appendChild(d);
    }
    const cssNum = (name, fb) => { const v = parseFloat(global.getComputedStyle(root).getPropertyValue(name)); return Number.isFinite(v) ? v : fb; };

    const HK = { FILL, LOOK, SNAP, MD, MK, SWAP, CHROME_OFF, CUSTOM_MD };

    /** 人像形态：原 presets + 铺满版式 / 画框全屏（没开就原样返回） */
    HK.presets = (base) => {
      const out = Object.assign({}, base);
      if (FILL) {
        const c = base.card || {}, p = base.pip || {};
        const round = p.borderRadius != null && p.width && p.borderRadius >= p.width / 2 - 1;
        out.card = Object.assign({}, c, { left: 1340, top: 190, width: 520, height: 700, borderRadius: c.borderRadius != null ? Math.min(c.borderRadius, 40) : 0 });
        out.pip = Object.assign({}, p, { left: 1600, top: 760, width: 260, height: 260, borderRadius: round ? 130 : (p.borderRadius || 0), tagOpacity: 0 });
      }
      if (LOOK) {
        const f = base.fullscreen || {};
        out.fullscreen = Object.assign({}, f, { left: 48, top: 48, width: 1824, height: 984, borderRadius: cssNum('--mh-frame-radius', 0), borderWidth: cssNum('--mh-frame-bw', 4), tagOpacity: 0 });
      }
      return out;
    };

    /** 组件区（组件局部坐标）：屏幕 x 80→1260（侧栏卡）/ 80→1500（圆窗）/ 80→1360（角落），y 150→930；map = 宿主页的机位换算常数 */
    const AREA_X = { card: [80, 1260], pip: [80, 1500], corner: [80, 1360] };
    HK.area = (sc, map) => {
      if (!FILL) return null;
      const modes = [sc.avatar || 'card', ...((sc.avatarCues || []).map((c) => c && c[1]))].filter((m) => m && m !== 'full');
      const m = modes[modes.length - 1];
      if (!AREA_X[m]) return null;
      const Z = map.CAM_ZOOM || 1, cx = map.cx != null ? map.cx : 700, cy = map.cy != null ? map.cy : 500;
      const lx = (sx) => cx - (map.CAM_DX || 0) + (sx - map.SX) / Z, ly = (sy) => cy + (sy - map.SY) / Z;
      return { x0: lx(AREA_X[m][0]), x1: lx(AREA_X[m][1]), y0: ly(150), y1: ly(930), k: 1 / Z, mode: m };
    };

    /** 每段被下一次转场盖住的局部秒：lead = 转场在段边界前多少秒开始盖（数字或 (i) => 秒）；最后一段 null */
    HK.coverAt = (scenesRaw, lead) => {
      const SS = scenesRaw || [];
      return SS.map((sc, i) => (i < SS.length - 1 ? (sc.dur || 6) - (typeof lead === 'function' ? lead(i + 1) : lead) : null));
    };

    /** 牌子层：图表句型写了 data.badges → 叠在屏幕层（talk 自己画，跳过） */
    HK.badges = (sc, comp, ctx, layerEl) => {
      if (!comp || comp.handlesBadges || !MHEngine.Badges || !sc.data || !Array.isArray(sc.data.badges) || !sc.data.badges.length) return null;
      const b = MHEngine.Badges.create(sc.data.badges, ctx);
      b.el.style.display = 'none';
      (layerEl || document.getElementById('screen-layer') || document.getElementById('viewport')).appendChild(b.el);
      return b;
    };
    /** 每帧显示 / 更新当前段的牌子 */
    HK.updateBadges = (scenes, cur, t) => scenes.forEach((s, i) => {
      if (!s.badges) return;
      s.badges.el.style.display = i === cur ? 'block' : 'none';
      if (i === cur) s.badges.update(t - s.start);
    });

    /** 换形态：开了 snap / 自定义时长才接管；返回 false = 宿主页走原来的代码 */
    HK.scheduleMorphs = ({ segs, avatar, morph, tl, mapAv, seed, count }) => {
      if (!SNAP && !CUSTOM_MD) return false;
      segs.forEach((s, i) => {
        if (i === 0) return;
        const prev = mapAv(segs[i - 1].avatar), cur = mapAv(s.avatar);
        if (prev === cur) return;
        if (SNAP) {
          morph.addMorph({ time: s.start, duration: MD, fromMode: prev, toMode: cur, count: count || 1000, seed: seed + i, snap: true });
          avatar.animateOnTimeline(tl, cur, s.start + SWAP, 0.001, 0.001);
        } else {
          morph.addMorph({ time: s.start + 0.02 * MK, duration: MD, fromMode: prev, toMode: cur, count: count || 1000, seed: seed + i });
          avatar.animateOnTimeline(tl, cur, s.start + 0.06 * MK, 0.48 * MK);
        }
      });
      return true;
    };
    /** is-full / 画布隐藏的延迟：原值（0.2 / 0.15）→ snap 时 = 换形态那一刻，自定义时长时按比例 */
    HK.fullDelay = (orig) => (SNAP ? SWAP : CUSTOM_MD ? orig * MK : orig);

    /** 每帧：画框暗角按人像框宽度渐变；snap 时人像网点遮罩 */
    HK.frame = (t, stageEl, morph) => {
      if (LOOK) {
        const sw = parseFloat(stageEl.style.width) || 0, va = Math.max(0, Math.min(1, (sw - 600) / (1824 - 600)));
        stageEl.querySelectorAll('.mh-look').forEach((e) => { e.style.opacity = va.toFixed(3); });
      }
      if (SNAP && morph) MHEngine.AvatarMorphFX.applyHalftone(stageEl, morph.halftone);
    };

    /** 转场 / 装饰上的段名：导出时（?chrome=0）没写 label 就不出（不显示英文句型名）；预览页照旧 */
    HK.label = (sc) => (sc.label || (CHROME_OFF ? '' : sc.type));
    HK.typeText = (sc, upper = true) => (CHROME_OFF ? '' : (upper ? String(sc.type).toUpperCase() : String(sc.type)));
    return HK;
  }

  MHEngine.HostKit = { init };
})(window);
