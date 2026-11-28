/**
 * Mushanhe Video Engine — Single-Container Avatar Controller
 * 支持 5 种标准人像形态单容器 GSAP 丝滑形变（竖窗 / 圆窗 / 半屏 / 1/4屏 / 全屏）
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  const DEFAULT_PRESETS = {
    'portrait-card': {
      left: 1320, top: 120, width: 510, height: 760,
      borderRadius: 30, borderWidth: 3, tagOpacity: 1
    },
    'pip-circle': {
      left: 1626, top: 752, width: 236, height: 236,
      borderRadius: 999, borderWidth: 4, tagOpacity: 0
    },
    'half': {
      left: 960, top: 0, width: 960, height: 1080,
      borderRadius: 0, borderWidth: 0, tagOpacity: 1
    },
    'quarter': {
      left: 1240, top: 586, width: 612, height: 392,
      borderRadius: 24, borderWidth: 3, tagOpacity: 1
    },
    'fullscreen': {
      left: 0, top: 0, width: 1920, height: 1080,
      borderRadius: 0, borderWidth: 0, tagOpacity: 0
    }
  };

  class AvatarController {
    constructor(customPresets) {
      this.presets = Object.assign({}, DEFAULT_PRESETS, customPresets || {});
      this.stageEl = document.getElementById('avatar-stage');
      this.tagEl = document.getElementById('avatar-tag');
    }

    getPreset(mode) {
      return this.presets[mode] || this.presets['portrait-card'];
    }

    setImmediate(mode) {
      const p = this.getPreset(mode);
      gsap.set(this.stageEl, {
        left: p.left,
        top: p.top,
        width: p.width,
        height: p.height,
        borderRadius: p.borderRadius,
        borderWidth: p.borderWidth
      });
      if (this.tagEl) gsap.set(this.tagEl, { opacity: p.tagOpacity });
    }

    animateOnTimeline(tl, mode, atTime, dur = 0.65, tagDur = 0.25) {
      const p = this.getPreset(mode);
      tl.to(this.stageEl, {
        left: p.left,
        top: p.top,
        width: p.width,
        height: p.height,
        borderRadius: p.borderRadius,
        borderWidth: p.borderWidth,
        duration: dur,
        ease: 'power3.inOut'
      }, atTime);
      if (this.tagEl) {
        tl.to(this.tagEl, {
          opacity: p.tagOpacity,
          duration: tagDur
        }, atTime);
      }
    }

    previewMode(mode) {
      const p = this.getPreset(mode);
      gsap.to(this.stageEl, {
        left: p.left,
        top: p.top,
        width: p.width,
        height: p.height,
        borderRadius: p.borderRadius,
        borderWidth: p.borderWidth,
        duration: 0.55,
        ease: 'power3.inOut'
      });
      if (this.tagEl) {
        gsap.to(this.tagEl, { opacity: p.tagOpacity, duration: 0.25 });
      }
    }
  }

  MHEngine.AvatarController = AvatarController;
})(window);
