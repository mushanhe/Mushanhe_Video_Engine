/**
 * Mushanhe Video Engine — 3D Spatial Virtual Camera Rig (core/camera-rig.js)
 * 专为 Vox 真实文档聚焦 × Johnny Harris 侦探大桌面运镜打造的通用 3D 空间摄影机内核：
 *   - 支持 6 自由度确定性运镜关键帧：x, y (凝视桌面坐标), zoom (推拉倍率), rx/ry/rz (俯仰/侧倾/摇镜角度)
 *   - 自动将当前凝视点精准对准视口安全中心（支持按时间偏移视口焦点，如避开右侧人像框）
 *   - 内置电影级平滑插值 (smootherstep) + 微量有机手持呼吸感（100% 确定性，拖拽与导出完全一致）
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smootherstep(x) {
    const t = clamp01(x);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  class CameraRig3D {
    /**
     * @param {HTMLElement} worldEl  大桌面容器元素（例如 3600x2400 的 #desk-world）
     * @param {Object} opts          { viewW: 1920, viewH: 1080, handheld: 1.0 }
     */
    constructor(worldEl, opts = {}) {
      this.worldEl = worldEl;
      this.viewW = opts.viewW || 1920;
      this.viewH = opts.viewH || 1080;
      this.handheld = opts.handheld ?? 1.0;
      this.keyframes = [];
    }

    /**
     * 注册摄像机运镜关键帧
     * @param {Array<Object>} kfs  每帧：{ t, x, y, zoom, rx, ry, rz, screenX, screenY }
     *   screenX/screenY: 凝视点在 1920x1080 屏幕上的落点，默认 (960, 540)，有右侧人像框时可设为 (660, 550)
     */
    setKeyframes(kfs) {
      this.keyframes = kfs.slice().sort((a, b) => a.t - b.t);
    }

    sample(t) {
      const kfs = this.keyframes;
      if (!kfs.length) return { x: 1800, y: 1200, zoom: 1, rx: 0, ry: 0, rz: 0, screenX: 960, screenY: 540 };
      if (t <= kfs[0].t) return Object.assign({ rx: 0, ry: 0, rz: 0, screenX: 960, screenY: 540 }, kfs[0]);
      const last = kfs[kfs.length - 1];
      if (t >= last.t) return Object.assign({ rx: 0, ry: 0, rz: 0, screenX: 960, screenY: 540 }, last);

      let i = 0;
      while (i < kfs.length - 2 && kfs[i + 1].t <= t) i++;
      const a = kfs[i], b = kfs[i + 1];
      const span = Math.max(0.0001, b.t - a.t);
      const p = smootherstep((t - a.t) / span);

      return {
        x: lerp(a.x, b.x, p),
        y: lerp(a.y, b.y, p),
        zoom: lerp(a.zoom ?? 1, b.zoom ?? 1, p),
        rx: lerp(a.rx ?? 0, b.rx ?? 0, p),
        ry: lerp(a.ry ?? 0, b.ry ?? 0, p),
        rz: lerp(a.rz ?? 0, b.rz ?? 0, p),
        screenX: lerp(a.screenX ?? 960, b.screenX ?? 960, p),
        screenY: lerp(a.screenY ?? 540, b.screenY ?? 540, p)
      };
    }

    render(t) {
      const s = this.sample(t);
      // 极克制的电影手持呼吸感（100% 确定性）
      const floatX = Math.sin(t * 0.85) * 4.5 * this.handheld;
      const floatY = Math.cos(t * 0.72) * 3.5 * this.handheld;
      const floatRz = Math.sin(t * 0.55) * 0.28 * this.handheld;

      const tx = s.screenX - s.x + floatX;
      const ty = s.screenY - s.y + floatY;

      this.worldEl.style.transformOrigin = `${s.x.toFixed(1)}px ${s.y.toFixed(1)}px`;
      this.worldEl.style.transform =
        `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0px) ` +
        `scale(${s.zoom.toFixed(4)}) ` +
        `rotateX(${s.rx.toFixed(2)}deg) ` +
        `rotateY(${s.ry.toFixed(2)}deg) ` +
        `rotateZ(${(s.rz + floatRz).toFixed(2)}deg)`;
      return s;
    }
  }

  MHEngine.CameraRig3D = CameraRig3D;
})(window);
