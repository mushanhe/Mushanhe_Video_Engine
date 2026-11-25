/**
 * Mushanhe Video Engine — Deterministic 5-Mood Procedural Live Background Engine
 * 100% 纯代码 Canvas 确定性动态背景（支持 60fps 丝滑播放 + 任意时间点精确抽帧）
 * 5 种可复用活体背景:
 *   1. warm-silk    (暖白瓷感: 流体光丝 + 呼吸式测绘点阵)
 *   2. emerald-grid (墨绿暗场: 3D 透视波浪网格 + 电路光脉冲)
 *   3. indigo-radar (午夜蓝紫: 精密雷达同心圆环 + 扫描光束 + 星尘)
 *   4. silver-topo  (亮银纸感: 动态有机拓扑等高线)
 *   5. amber-rays   (暖金收尾: 电影体积光束 + 琥珀金上升微尘)
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  class LiveBackground {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.w = canvas.width || 1920;
      this.h = canvas.height || 1080;

      // 确定性预生成星尘与琥珀微尘
      this.dust = Array.from({ length: 70 }, (_, i) => ({
        x: ((i * 271) % 1920),
        y: ((i * 193) % 1080),
        r: 1.2 + (i % 5) * 0.9,
        vy: 14 + (i % 7) * 5.5,
        vx: ((i % 5) - 2) * 4,
        phase: i * 1.13
      }));

      // 确定性电路脉冲路径
      this.pulses = Array.from({ length: 12 }, (_, i) => ({
        y: 140 + (i % 6) * 150,
        dir: i % 2 === 0 ? 1 : -1,
        speed: 220 + (i % 4) * 90,
        offset: i * 190,
        color: i % 3 === 0 ? '#23D2CE' : i % 3 === 1 ? '#FAB540' : '#38BDF8'
      }));
    }

    render(t, mood) {
      const ctx = this.ctx;
      const w = this.w, h = this.h;
      ctx.clearRect(0, 0, w, h);

      if (mood === 'warm-silk') {
        this.drawWarmSilk(ctx, w, h, t);
      } else if (mood === 'emerald-grid') {
        this.drawEmeraldGrid(ctx, w, h, t);
      } else if (mood === 'indigo-radar') {
        this.drawIndigoRadar(ctx, w, h, t);
      } else if (mood === 'silver-topo') {
        this.drawSilverTopo(ctx, w, h, t);
      } else if (mood === 'amber-rays') {
        this.drawAmberRays(ctx, w, h, t);
      }
    }

    /* 1. 暖白开场：流体光丝 + 呼吸式建筑测绘点阵 */
    drawWarmSilk(ctx, w, h, t) {
      // 3 道柔滑起伏的彩色半透明丝绸光带
      const ribbons = [
        { y0: 260, amp: 58, freq: 0.0022, speed: 0.7, color: 'rgba(35, 210, 206, 0.14)', width: 120 },
        { y0: 680, amp: 70, freq: 0.0018, speed: -0.55, color: 'rgba(250, 181, 64, 0.16)', width: 150 },
        { y0: 490, amp: 44, freq: 0.0028, speed: 0.9, color: 'rgba(240, 80, 42, 0.075)', width: 90 }
      ];
      for (const rb of ribbons) {
        ctx.save();
        ctx.beginPath();
        for (let x = 0; x <= w; x += 32) {
          const y = rb.y0 + Math.sin(x * rb.freq + t * rb.speed) * rb.amp + Math.cos(x * rb.freq * 0.5 - t * 0.4) * 26;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rb.color;
        ctx.lineWidth = rb.width;
        ctx.lineCap = 'round';
        ctx.filter = 'blur(34px)';
        ctx.stroke();
        ctx.restore();
      }

      // 呼吸式建筑测绘点阵 + 细微十字准星
      const step = 88;
      const ox = -((t * 16) % step);
      const oy = -((t * 8) % step);
      ctx.save();
      for (let gx = ox; gx < w + step; gx += step) {
        for (let gy = oy; gy < h + step; gy += step) {
          const pulse = Math.sin(gx * 0.006 + gy * 0.006 + t * 1.4);
          const isCross = (Math.round((gx - ox) / step) + Math.round((gy - oy) / step)) % 5 === 0;
          if (isCross) {
            ctx.strokeStyle = `rgba(180, 120, 45, ${0.14 + pulse * 0.08})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy);
            ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + 6);
            ctx.stroke();
          } else {
            ctx.fillStyle = `rgba(20, 28, 36, ${0.09 + pulse * 0.04})`;
            ctx.beginPath();
            ctx.arc(gx, gy, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    /* 2. 墨绿暗场：3D 透视波浪网格 + 电路光脉冲 */
    drawEmeraldGrid(ctx, w, h, t) {
      ctx.save();
      // 底部 3D 透视俯视地形波浪网格
      const horizon = h * 0.46;
      ctx.strokeStyle = 'rgba(35, 210, 206, 0.13)';
      ctx.lineWidth = 1.2;

      // 透视横线（缓慢向观众推进）
      for (let i = 1; i <= 14; i++) {
        const p = ((i + (t * 0.9) % 1) / 14);
        const y = horizon + Math.pow(p, 2.1) * (h - horizon + 80);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 48) {
          const wave = Math.sin(x * 0.004 + t * 1.1 + i * 0.5) * 14 * p;
          if (x === 0) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
        }
        ctx.globalAlpha = Math.min(1, p * 1.4) * 0.65;
        ctx.stroke();
      }

      // 透视放射纵线
      ctx.globalAlpha = 0.25;
      const cx = w * 0.46;
      for (let k = -10; k <= 10; k++) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 42, horizon);
        ctx.lineTo(cx + k * 230, h + 40);
        ctx.stroke();
      }

      // 水平流动的极细电路光脉冲
      ctx.globalAlpha = 1;
      for (const pl of this.pulses) {
        const px = ((t * pl.speed * pl.dir + pl.offset) % (w + 400) + (w + 400)) % (w + 400) - 200;
        const grad = ctx.createLinearGradient(px - 110 * pl.dir, pl.y, px, pl.y);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, pl.color);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.moveTo(px - 110 * pl.dir, pl.y);
        ctx.lineTo(px, pl.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* 3. 午夜蓝紫：精密雷达同心圆环 + 扫描光束 + 星尘 */
    drawIndigoRadar(ctx, w, h, t) {
      ctx.save();
      const cx = 650, cy = 490;

      // 柔和旋转扫描扇形光束
      const angle = t * 0.55;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const sweepGrad = ctx.createRadialGradient(0, 0, 40, 0, 0, 620);
      sweepGrad.addColorStop(0, 'rgba(96, 165, 250, 0.2)');
      sweepGrad.addColorStop(1, 'rgba(96, 165, 250, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 620, -0.32, 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4 道缓慢反向旋转的虚线精密刻度圆环
      const radii = [200, 340, 490, 650];
      radii.forEach((r, idx) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * (idx % 2 === 0 ? 0.08 : -0.06) + idx);
        ctx.strokeStyle = idx % 2 === 0 ? 'rgba(129, 140, 248, 0.22)' : 'rgba(250, 181, 64, 0.16)';
        ctx.lineWidth = idx === 1 ? 2 : 1.2;
        ctx.setLineDash(idx % 2 === 0 ? [12, 18] : [4, 14]);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 漂浮冰蓝星尘
      for (const d of this.dust) {
        const x = (d.x + t * d.vx + w) % w;
        const y = (d.y - t * d.vy * 0.35 + h) % h;
        const a = 0.22 + 0.22 * Math.sin(t * 1.8 + d.phase);
        ctx.fillStyle = `rgba(165, 180, 252, ${a})`;
        ctx.beginPath();
        ctx.arc(x, y, d.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* 4. 亮银纸感：动态有机拓扑等高线波纹 */
    drawSilverTopo(ctx, w, h, t) {
      ctx.save();
      // 左上与右下两组流动有机等高线
      for (let k = 0; k < 10; k++) {
        ctx.beginPath();
        const baseY = 120 + k * 105;
        for (let x = 0; x <= w; x += 28) {
          const dy =
            Math.sin(x * 0.0028 + t * 0.55 + k * 0.45) * 42 +
            Math.cos(x * 0.0052 - t * 0.35 + k * 0.8) * 18;
          if (x === 0) ctx.moveTo(x, baseY + dy); else ctx.lineTo(x, baseY + dy);
        }
        ctx.strokeStyle = k % 3 === 0 ? 'rgba(13, 148, 136, 0.13)' : 'rgba(100, 116, 139, 0.11)';
        ctx.lineWidth = k % 3 === 0 ? 1.8 : 1.1;
        ctx.stroke();
      }

      // 极简四角测绘坐标刻度
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 16; i++) {
        const tx = 140 + i * 108;
        ctx.beginPath();
        ctx.moveTo(tx, 26); ctx.lineTo(tx, i % 4 === 0 ? 40 : 33);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* 5. 暖金收尾：电影感丁达尔体积光束 + 琥珀金上升微尘 */
    drawAmberRays(ctx, w, h, t) {
      ctx.save();
      // 4 道顶部斜射缓慢摇曳的暖金体积光束
      for (let i = 0; i < 4; i++) {
        const sway = Math.sin(t * 0.42 + i * 1.4) * 55;
        const xTop = 260 + i * 380 + sway;
        const grad = ctx.createLinearGradient(xTop, 0, xTop + 260, h * 0.92);
        grad.addColorStop(0, 'rgba(253, 231, 147, 0.14)');
        grad.addColorStop(0.55, 'rgba(250, 181, 64, 0.055)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(xTop - 55, 0);
        ctx.lineTo(xTop + 95, 0);
        ctx.lineTo(xTop + 420, h);
        ctx.lineTo(xTop + 140, h);
        ctx.closePath();
        ctx.fill();
      }

      // 缓慢上升的电影琥珀金微尘（带微弱散景发光）
      for (const d of this.dust) {
        const x = (d.x + Math.sin(t * 0.8 + d.phase) * 28 + w) % w;
        const y = ((d.y - t * d.vy) % h + h) % h;
        const a = 0.25 + 0.35 * Math.sin(t * 2.1 + d.phase);
        ctx.fillStyle = d.phase % 2 > 1 ? `rgba(253, 231, 147, ${a})` : `rgba(250, 181, 64, ${a * 0.85})`;
        ctx.shadowColor = '#FAB540';
        ctx.shadowBlur = d.r * 3.5;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  MHEngine.LiveBackground = LiveBackground;
})(window);
