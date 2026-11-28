/**
 * Mushanhe Video Engine — Avatar Halftone Stipple Scatter & Re-coalesce Morph FX (core/avatar-morph-fx.js)
 * 参考高端点阵人像转场：人像切换形态（竖窗 ↔ 圆窗 ↔ 全屏 ↔ 1/4窗）时，不再呆板拉伸方框，
 * 而是先化作数千颗高密度点阵粒子散开（Halftone Stipple Dispersion），沿优雅曲线流向目标位置，
 * 再精准聚拢凝结成新形态的人像窗口！100% 由时间 t 确定性驱动，任意拖拽进度条完全可逆还原。
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function samplePointInRect(rect, isCircle, rand) {
    if (isCircle) {
      const ang = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * (rect.width * 0.49);
      return {
        x: rect.left + rect.width * 0.5 + Math.cos(ang) * r,
        y: rect.top + rect.height * 0.5 + Math.sin(ang) * r
      };
    }
    return {
      x: rect.left + rand() * rect.width,
      y: rect.top + rand() * rect.height
    };
  }

  class AvatarMorphFX {
    constructor(canvas, avatarPresets) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = 1920;
      this.H = 1080;
      this.presets = avatarPresets;
      this.transitions = [];
    }

    /**
     * 注册一次人像“点阵散开 -> 聚拢成新形态”转场
     * @param {{ time: number, duration: number, fromMode: string, toMode: string, count?: number, seed?: number }} cfg
     */
    addMorph(cfg) {
      const fromRect = this.presets[cfg.fromMode];
      const toRect = this.presets[cfg.toMode];
      if (!fromRect || !toRect) return;

      const fromCircle = cfg.fromMode === 'pip-circle';
      const toCircle = cfg.toMode === 'pip-circle';
      const rand = mulberry32(cfg.seed || 202694);
      const count = cfg.count || 920;

      // 模拟人像主体轮廓 + 暗色演播室的真实点阵色阶（深墨炭 / 暗翡翠 / 肤色暖白 / 黄铜微光）
      const palette = ['#0D1318', '#141D24', '#1A2B28', '#24363A', '#3B4852', '#D9C5B2', '#E8A838', '#00C49A'];
      const weights = [0.28, 0.24, 0.16, 0.10, 0.08, 0.07, 0.04, 0.03];

      const pickColor = () => {
        const r = rand();
        let acc = 0;
        for (let i = 0; i < weights.length; i++) {
          acc += weights[i];
          if (r <= acc) return palette[i];
        }
        return palette[0];
      };

      const dots = [];
      for (let i = 0; i < count; i++) {
        const p0 = samplePointInRect(fromRect, fromCircle, rand);
        const p1 = samplePointInRect(toRect, toCircle, rand);
        // 计算散开时的有机漩涡偏移（中间帧先炸散成优雅的点阵云，再聚拢）
        const scatterAng = rand() * Math.PI * 2;
        const scatterDist = 48 + rand() * 190;
        // 越靠近边缘的粒子越早散开、越晚聚拢，形成极强的设计感
        const delay = rand() * 0.16;
        dots.push({
          x0: p0.x, y0: p0.y,
          x1: p1.x, y1: p1.y,
          sx: Math.cos(scatterAng) * scatterDist,
          sy: Math.sin(scatterAng) * scatterDist,
          r: 1.5 + rand() * 2.8,
          delay,
          color: pickColor()
        });
      }

      this.transitions.push({
        time: cfg.time,
        duration: cfg.duration || 0.62,
        fromMode: cfg.fromMode,
        toMode: cfg.toMode,
        snap: !!cfg.snap,   // v3.4.1 利落版（不写 = 原样）：人像不整体变淡，改半色调网点缩散 / 长回，粒子先快后慢
        dots
      });
    }

    /**
     * 在当前时间 t 渲染点阵粒子并返回建议的 #avatar-stage 透明度（在散开/飞行中段渐隐实体人像，聚拢后丝滑显现！）
     */
    render(t) {
      const g = this.ctx;
      g.clearRect(0, 0, this.W, this.H);

      let avatarOpacity = 1;
      this.halftone = 1;   // 利落版：人像网点半径（1 = 实心不加遮罩，0 = 全散开）；原版恒为 1
      for (const tr of this.transitions) {
        if (t < tr.time || t > tr.time + tr.duration) continue;
        const p = (t - tr.time) / tr.duration; // 0 -> 1
        if (tr.snap) { avatarOpacity = Math.min(avatarOpacity, this._renderSnap(tr, p)); continue; }

        // 实体人像窗口透明度曲线：0~0.24 快速淡出化为粒子，0.24~0.76 由纯点阵粒子云接管飞行，0.76~1.0 重新凝结显现
        if (p < 0.24) {
          avatarOpacity = Math.min(avatarOpacity, 1 - p / 0.24);
        } else if (p < 0.76) {
          avatarOpacity = 0;
        } else {
          avatarOpacity = Math.min(avatarOpacity, (p - 0.76) / 0.24);
        }

        // 点阵粒子整体包络透明度（起止柔和衔接）
        const envAlpha = p < 0.12 ? (p / 0.12) : (p > 0.86 ? (1 - p) / 0.14 : 1);

        for (let i = 0; i < tr.dots.length; i++) {
          const d = tr.dots[i];
          const localP = Math.max(0, Math.min(1, (p - d.delay) / (1 - 0.16)));
          const e = easeInOutCubic(localP);
          // sin(pi * localP) 在中段达到峰值 1，完美实现“先散开 -> 再聚拢”
          const scatter = Math.sin(localP * Math.PI);

          const x = d.x0 + (d.x1 - d.x0) * e + d.sx * scatter;
          const y = d.y0 + (d.y1 - d.y0) * e + d.sy * scatter;
          const radius = d.r * (0.75 + 0.55 * scatter);

          g.globalAlpha = envAlpha * (0.68 + 0.32 * scatter);
          g.fillStyle = d.color;
          g.beginPath();
          g.arc(x, y, radius, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      return avatarOpacity;
    }

    /**
     * v3.4.1 利落版散聚（addMorph({ snap: true })）：粒子颜色 / 数量 / 大小与原版同一套，只改节奏和人像的退出方式。
     *   人像：前 0.21 保持清楚完整（粒子从人像上剥离）→ 0.21–0.283 一口气散尽（30fps 下最多 1 帧落在中间，
     *         也是实色网点，不出现整片半透明发白）→ 全散开时换形态 → 新形态网点 0→1 长回（先快后慢，最后一下就是实心）。
     *         看不见人（网点覆盖 < 10%）约 0.075 × duration/0.3 秒。
     *   粒子：先快后慢（easeOutCubic），炸散峰值提前到前 30%，尾巴 20% 淡出不拖。
     *   时刻（占 duration 的比例）：0.21 起散 · 0.283 散尽 · 0.50 起长 · 0.833 长满 —— 换形态放在 SNAP_SWAP（0.39）。
     */
    _renderSnap(tr, p) {
      const g = this.ctx, cl = (x) => Math.max(0, Math.min(1, x));
      let k = 1;
      if (p >= 0.21 && p < 0.5) k = 1 - cl((p - 0.21) / 0.073);
      else if (p >= 0.5) { const x = cl((p - 0.5) / 0.333); k = 1 - (1 - x) * (1 - x); }
      if (k < 0.25) k = 0;   // 网点半径 < 1/4（覆盖 < 10%）那一帧不画网点：单看像一层网格噪点，反正也看不出人
      this.halftone = Math.min(this.halftone, k);
      const envAlpha = p < 0.06 ? p / 0.06 : (p > 0.8 ? (1 - p) / 0.2 : 1);
      for (let i = 0; i < tr.dots.length; i++) {
        const d = tr.dots[i];
        const lp = cl((p - d.delay * 0.5) / 0.92);
        const e = 1 - Math.pow(1 - lp, 3);
        const scatter = Math.sin(Math.PI * Math.pow(lp, 0.6));
        const x = d.x0 + (d.x1 - d.x0) * e + d.sx * scatter;
        const y = d.y0 + (d.y1 - d.y0) * e + d.sy * scatter;
        g.globalAlpha = envAlpha * (0.68 + 0.32 * scatter);
        g.fillStyle = d.color;
        g.beginPath();
        g.arc(x, y, d.r * (0.75 + 0.55 * scatter), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      return k > 0.001 ? 1 : 0;
    }

    /** 把 render() 之后的 this.halftone 套到人像框上：k < 1 → 16px 网格圆点遮罩（半径 k × 11.4px），k = 1 → 去掉遮罩 */
    static applyHalftone(el, k, cell = 16) {
      if (!el) return;
      if (!(k < 1)) { if (el.style.maskImage || el.style.webkitMaskImage) { el.style.maskImage = el.style.webkitMaskImage = ''; el.style.maskSize = el.style.webkitMaskSize = ''; } return; }
      const R = Math.max(0, k * cell * 0.7125);
      const img = `radial-gradient(circle at center, #000 ${R.toFixed(2)}px, transparent ${(R + 0.6).toFixed(2)}px)`;
      el.style.maskImage = el.style.webkitMaskImage = img;
      el.style.maskSize = el.style.webkitMaskSize = `${cell}px ${cell}px`;
    }
  }
  AvatarMorphFX.SNAP_SWAP = 0.39;   // 利落版：人像全散开的中点（占 duration 比例），宿主页在这一刻换形态 / 切 is-full

  MHEngine.AvatarMorphFX = AvatarMorphFX;
})(window);
