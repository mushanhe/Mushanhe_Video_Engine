/**
 * Mushanhe Video Engine — 聚光高亮 / 压暗（v3.4.1 · 公共层，照 EP03 ch02 / ch03 原样移植）
 *
 * 讲到哪张卡：这张亮边（ring）+ 微放大；讲过的 / 别的卡自动压暗。全部是 localT 的纯函数，任意 seek 可还原。
 *   const o = MHEngine.Focus.attach(cardEl, 'nb-focus-ring')   // 给卡片挂一个亮边子元素（样式由风格包 CSS 定）
 *   MHEngine.Focus.apply(o, f, 'fade')                          // f：1 当前讲到 · 0 常态 · <0 压暗（-1 最暗）
 *   MHEngine.Focus.stepv(t, [[t1, 1], [t2, -0.6]], 0)           // 阶梯值 + 0.16s 平滑过渡（EP03 stepv）
 *   MHEngine.Focus.track(t, ats, opts)                          // 一组卡按 cue 依次聚光：当前 1、前面的压暗
 *
 * 两种压暗手法（EP03 原样）：
 *   'fade'  浅色底（EP03 ch03 瑞士纸卡）：去色 + 变淡，聚光卡置顶。
 *   'shade' 深色底（EP03 ch02 工业板）  ：降亮度 + 去饱和，保持不透明（叠放的卡不会互相透字）。
 * 与 EP03 唯一的差别：EP03 用 style.opacity 变淡；引擎组件的入场动画已占用 style.opacity / transform，
 * 所以这里改用 filter: opacity() + CSS scale 属性，两者都与入场动画叠乘，互不覆盖。
 * 组件只在「本段真的读到了 cue」时才调用本模块；没有 cue 的旧剧本一个样式都不碰（画面逐像素不变）。
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  /** 阶梯值 + 平滑过渡：list = [[t, v], ...]（按时间顺序），EP03 ch02/ch03 stepv 原样 */
  function stepv(t, list, init = 0, ramp = 0.16) {
    let v = init;
    list.forEach(([tt, vv]) => { if (t >= tt) v += (vv - v) * clamp01((t - tt) / ramp); });
    return v;
  }

  /** 给卡片挂亮边：返回 { w, c, ring }（EP03 plate 的 wrap / card / ring 结构，这里 w = c = 卡片本身） */
  function attach(el, ringClass) {
    const ring = global.document.createElement('i');
    ring.className = `mh-focus-ring${ringClass ? ` ${ringClass}` : ''}`;
    ring.style.opacity = '0';
    el.appendChild(ring);
    return { w: el, c: el, ring };
  }

  const MODES = {
    // EP03 ch03（浅底）：1 = 粗亮边 + 放大 5%；-1 = 褪色 85% + 变淡 50% + 缩 2%；聚光卡置顶
    fade: { up: 0.05, down: 0.02, fn: (off) => `opacity(${(1 - 0.5 * off).toFixed(3)}) grayscale(${(0.85 * off).toFixed(3)})`, z: true },
    // EP03 ch02（深底）：1 = 亮边 + 放大 3.5%；-1 = 亮度 −38% + 饱和度 −60% + 变淡 12% + 缩 2%
    shade: { up: 0.035, down: 0.02, fn: (off) => `opacity(${(1 - 0.12 * off).toFixed(3)}) brightness(${(1 - 0.38 * off).toFixed(3)}) saturate(${(1 - 0.6 * off).toFixed(3)})`, z: false }
  };

  /** 聚光：f = 1 当前讲到（亮边 + 微放大），0 常态，-1 压暗 */
  function apply(o, f, mode) {
    const M = MODES[mode] || MODES.fade;
    const on = Math.max(0, f), off = Math.max(0, -f);
    // 亮边：一开始聚光就至少 0.35 不透明（词起点那一帧就看得见，跟嘴 ≤1 帧），之后随 f 补满
    if (o.ring) o.ring.style.opacity = (on > 0.001 ? Math.min(1, 0.35 + on) : 0).toFixed(3);
    o.c.style.scale = (1 + M.up * on - M.down * off).toFixed(4);
    o.c.style.filter = off > 0.01 ? M.fn(off) : 'none';
    if (M.z) o.w.style.zIndex = on > 0.05 ? '5' : '';
  }

  /**
   * 一组卡按 cue 依次聚光（EP03 ch02 `focus(o, stepv(t, [[o.at, 1], [nx, -0.7]], 0))` 的批量版）：
   *   ats[i] = 第 i 张卡被讲到的局部秒；opts.dim = 讲过的卡压到多暗（默认 -0.6）；
   *   opts.flash = [t0, t1]：这段时间里所有已出现的卡一起亮（完成感），之后回到常态 0；
   *   opts.last = 最后一张讲完后保持亮（默认 true）。返回每张卡的 f。
   */
  function track(t, ats, opts) {
    const o = opts || {}, dim = o.dim != null ? o.dim : -0.6;
    const order = ats.map((a, i) => [a, i]).filter((x) => Number.isFinite(x[0])).sort((a, b) => a[0] - b[0]);
    const flashes = (o.flashes || (o.flash ? [o.flash] : [])).filter((x) => x && Number.isFinite(x[0])).sort((a, b) => a[0] - b[0]);
    const f = ats.map(() => 0);
    order.forEach(([at, i], k) => {
      const nx = order[k + 1] ? order[k + 1][0] : null;
      const mine = flashes.filter((x) => x[0] >= at);   // 一起亮时已经出现的卡：亮完回常态，之后不再压暗
      const list = [[at, 1]];
      if (nx != null && (!mine.length || nx < mine[0][0])) list.push([nx, dim]);
      else if (nx == null && !mine.length && o.last === false) list.push([at + 0.9, 0]);
      mine.forEach((x) => list.push([x[0], 1], [x[1], 0]));
      list.sort((a, b) => a[0] - b[0]);
      f[i] = stepv(t, list, 0);
      mine.forEach((x) => { if (t >= x[0] && t < x[1]) f[i] = Math.max(f[i], Math.min(1, 0.45 + (t - x[0]) / 0.12)); });   // 一起亮：那一帧就亮
    });
    return f;
  }

  MHEngine.Focus = { stepv, attach, apply, track, MODES };
})(window);
