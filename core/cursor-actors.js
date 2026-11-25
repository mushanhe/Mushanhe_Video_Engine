/**
 * Mushanhe Video Engine — Living AI Cursor Actors Engine (core/cursor-actors.js)
 * 通用“活体拟人化 AI 光标”确定性演出引擎（Canvas 2D，严格按时间 t 确定性渲染）：
 *   - 支持多枚带名称标签与彩色发光弧线拖尾（Curved Motion Trail）的 AI 协作指针
 *   - 支持精准点击涟漪（Click Ripple）
 *   - 支持高能喜剧名场面：双指针高速对撞 -> 冲击波 -> 翻滚歪倒瘫坐 + 头顶漫画金星旋转（眼冒金星 ✦★✦）
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function easeInOut(x) { const t = clamp01(x); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeSnap(x) { const t = clamp01(x); return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }

  class CursorActorsEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = 1920;
      this.H = 1080;
      this.actors = [];
      this.collision = null;
    }

    /**
     * 添加一枚 AI 光标角色
     * @param {Object} cfg { id, label, color, glow, keyframes: [{t, x, y, click?, visible?}] }
     */
    addActor(cfg) {
      const kfs = (cfg.keyframes || []).slice().sort((a, b) => a.t - b.t);
      this.actors.push({
        id: cfg.id,
        label: cfg.label || 'AI',
        color: cfg.color || '#00E5C3',
        glow: cfg.glow || 'rgba(0, 229, 195, 0.55)',
        kfs
      });
    }

    /**
     * 注册双光标高速对撞“眼冒金星”瘫坐事件
     * @param {Object} cfg { time, duration, x, y }
     */
    setCollision(cfg) {
      this.collision = cfg;
    }

    _sampleActor(actor, t) {
      const kfs = actor.kfs;
      if (!kfs.length || t < kfs[0].t || t > kfs[kfs.length - 1].t) return null;
      let i = 0;
      while (i < kfs.length - 2 && kfs[i + 1].t <= t) i++;
      const a = kfs[i], b = kfs[i + 1];
      if (a.visible === false && b.visible === false) return null;
      const span = Math.max(0.001, b.t - a.t);
      // 高速瞬移弧线逻辑：若两点间隔较长，先在起点灵动悬停，最后 flightDur (默认 0.34s) 极速甩弧飞抵终点！
      const flightDur = Math.min(b.dur ?? 0.34, span * 0.92);
      const moveStart = b.t - flightDur;
      if (t < moveStart) {
        // 停靠期轻微生命感微振
        const jitX = Math.sin(t * 7.5 + i) * 2.2;
        const jitY = Math.cos(t * 6.3 + i) * 2.2;
        return { x: a.x + jitX, y: a.y + jitY, vx: 0, vy: 0, flying: false, visible: a.visible !== false };
      }
      const rawP = (t - moveStart) / Math.max(0.001, flightDur);
      const p = easeSnap(rawP);
      // 大曲率贝塞尔甩弧偏移（视觉冲击力拉满！）
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const bendMag = Math.min(260, Math.max(85, dist * 0.44));
      const bend = bendMag * (b.arc ?? a.arc ?? (i % 2 === 0 ? 1 : -1));
      const nx = dist > 1 ? -dy / dist : 0;
      const ny = dist > 1 ? dx / dist : 0;
      const mx = (a.x + b.x) * 0.5 + nx * bend;
      const my = (a.y + b.y) * 0.5 + ny * bend;
      const inv = 1 - p;
      const x = inv * inv * a.x + 2 * inv * p * mx + p * p * b.x;
      const y = inv * inv * a.y + 2 * inv * p * my + p * p * b.y;
      // 切线速度方向用于指针动态前倾
      const vx = 2 * inv * (mx - a.x) + 2 * p * (b.x - mx);
      const vy = 2 * inv * (my - a.y) + 2 * p * (b.y - my);
      return { x, y, vx, vy, flying: true, visible: a.visible !== false };
    }

    _drawPointer(g, x, y, color, label, rotDeg = 0, scale = 1, dizzy = false) {
      g.save();
      g.translate(x, y);
      g.rotate((rotDeg * Math.PI) / 180);
      g.scale(scale, scale);

      // 外发光阴影
      g.shadowColor = color;
      g.shadowBlur = 16;

      // 精致现代箭头指针
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 30);
      g.lineTo(8, 23);
      g.lineTo(14, 34);
      g.lineTo(19, 31);
      g.lineTo(13, 20);
      g.lineTo(23, 20);
      g.closePath();
      g.fillStyle = color;
      g.fill();
      g.lineWidth = 2.2;
      g.strokeStyle = '#FFFFFF';
      g.stroke();
      g.shadowBlur = 0;

      // 跟随小铭牌（非眩晕时随指针；眩晕时在下方水平绘制确保一眼可读）
      if (label && !dizzy) {
        g.font = '900 13px "JetBrains Mono", Consolas, monospace';
        const tw = g.measureText(label).width + 18;
        g.fillStyle = 'rgba(10, 16, 24, 0.92)';
        g.strokeStyle = color;
        g.lineWidth = 1.6;
        g.beginPath();
        g.roundRect(18, 22, tw, 24, 12);
        g.fill();
        g.stroke();
        g.fillStyle = '#FFFFFF';
        g.fillText(label, 27, 38);
      }
      g.restore();

      // 如果处于撞晕状态，画漫画感旋转金星（✦ ★ ✦）+ 水平高可读气泡铭牌
      if (dizzy) {
        g.save();
        g.translate(x, y - 24);
        g.strokeStyle = 'rgba(255, 212, 82, 0.45)';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(0, 0, 34, 11, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();

        if (label) {
          g.save();
          g.font = '900 14px "Microsoft YaHei", "JetBrains Mono", sans-serif';
          const tw = g.measureText(label).width + 20;
          const bx = x - tw / 2, by = y + 24;
          g.fillStyle = 'rgba(10, 16, 24, 0.94)';
          g.strokeStyle = color;
          g.lineWidth = 1.8;
          g.beginPath();
          g.roundRect(bx, by, tw, 26, 13);
          g.fill();
          g.stroke();
          g.fillStyle = '#FFFFFF';
          g.fillText(label, bx + 10, by + 18);
          g.restore();
        }
      }
    }

    _drawStar(g, x, y, r, color) {
      g.save();
      g.translate(x, y);
      g.fillStyle = color;
      g.shadowColor = color;
      g.shadowBlur = 10;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? r : r * 0.36;
        const a = (i * Math.PI) / 4;
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
      g.restore();
    }

    render(t) {
      const g = this.ctx;
      g.clearRect(0, 0, this.W, this.H);

      // 检查是否处于双光标对撞眼冒金星高潮时段
      const col = this.collision;
      if (col && t >= col.time - 0.55 && t <= col.time + col.duration) {
        const dt = t - col.time;
        if (dt < 0) {
          // 冲刺相撞前 0.55s：两枚光标从左右拖长弧尾疯狂冲向撞击点
          const p = easeInOut((dt + 0.55) / 0.55);
          const lx = col.x - 460 * (1 - p), ly = col.y + Math.sin(p * Math.PI) * -90;
          const rx = col.x + 460 * (1 - p), ry = col.y + Math.sin(p * Math.PI) * 90;
          // 拖尾光弧
          const drawRush = (sx, sy, ex, ey, color) => {
            g.save();
            const grad = g.createLinearGradient(sx, sy, ex, ey);
            grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, color);
            g.strokeStyle = grad; g.lineWidth = 6; g.lineCap = 'round';
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
            g.restore();
          };
          drawRush(col.x - 520, col.y - 40, lx, ly, '#00E5C3');
          drawRush(col.x + 520, col.y + 40, rx, ry, '#FFB84D');
          this._drawPointer(g, lx, ly, '#00E5C3', 'CLAUDE', 18, 1.15);
          this._drawPointer(g, rx, ry, '#FFB84D', 'FFMPEG', -28, 1.15);
        } else {
          // 撞击瞬间 + 翻滚弹开 + 歪倒瘫坐眼冒金星！
          const boomP = clamp01(dt / 0.45);
          if (boomP < 1) {
            // 漫画碰撞闪光环 + 锐角火花
            g.save();
            g.globalAlpha = 1 - boomP;
            g.strokeStyle = '#FFE047'; g.lineWidth = 8 * (1 - boomP);
            g.beginPath(); g.arc(col.x, col.y, 18 + boomP * 140, 0, Math.PI * 2); g.stroke();
            for (let i = 0; i < 10; i++) {
              const a = (i * Math.PI * 2) / 10;
              const r1 = 24 + boomP * 60, r2 = 54 + boomP * 135;
              g.strokeStyle = i % 2 === 0 ? '#FFE047' : '#FF3B5C'; g.lineWidth = 4;
              g.beginPath(); g.moveTo(col.x + Math.cos(a) * r1, col.y + Math.sin(a) * r1);
              g.lineTo(col.x + Math.cos(a) * r2, col.y + Math.sin(a) * r2); g.stroke();
            }
            g.restore();
          }
          // 弹开瘫坐落位（0..0.55s 翻滚弹开，之后瘫坐晃悠冒金星）
          const settle = clamp01(dt / 0.55);
          const bounce = 1 - Math.pow(1 - settle, 3);
          const fadeOut = dt > col.duration - 0.5 ? Math.max(0, (col.duration - dt) / 0.5) : 1;
          g.save();
          g.globalAlpha = fadeOut;

          const lx = col.x - 10 - bounce * 88;
          const ly = col.y + Math.sin(settle * Math.PI) * -54 + bounce * 42;
          const rx = col.x + 10 + bounce * 88;
          const ry = col.y + Math.sin(settle * Math.PI) * -46 + bounce * 44;

          const lRot = -115 * bounce + Math.sin(dt * 4.5) * 6;
          const rRot = 122 * bounce + Math.cos(dt * 4.2) * 6;

          this._drawPointer(g, lx, ly, '#00E5C3', '晕了...', lRot, 1.18, true);
          this._drawPointer(g, rx, ry, '#FFB84D', '撞星了!', rRot, 1.18, true);

          // 头顶滴溜溜旋转的漫画金星（✦ ★ ✦）
          [ { cx: lx, cy: ly - 24 }, { cx: rx, cy: ry - 24 } ].forEach((pt, idx) => {
            for (let s = 0; s < 3; s++) {
              const ang = dt * 5.8 * (idx === 0 ? 1 : -1) + (s * Math.PI * 2) / 3;
              const sx = pt.cx + Math.cos(ang) * 34;
              const sy = pt.cy + Math.sin(ang) * 11;
              this._drawStar(g, sx, sy, s === 0 ? 10 : 7, s === 0 ? '#FFE047' : '#FFFFFF');
            }
          });
          g.restore();
        }
        return;
      }

      // 常规模式：绘制每枚 AI 光标的高速流星三层弧线拖尾 + 动势倾斜指针本体 + 点击涟漪
      this.actors.forEach((actor) => {
        const cur = this._sampleActor(actor, t);
        if (!cur || !cur.visible) return;

        // 采样过去 0.34 秒内的 32 个高密度点，绘制超明显的三层流星弧线光带
        const pts = [];
        const samples = 32;
        for (let s = samples; s >= 0; s--) {
          const pt = this._sampleActor(actor, t - s * 0.0105);
          if (pt && pt.visible) pts.push(pt);
        }
        if (pts.length > 1) {
          g.save();
          g.lineCap = 'round'; g.lineJoin = 'round';
          for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1], p1 = pts[i];
            if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 0.8) continue;
            const frac = i / pts.length;
            const f2 = frac * frac;
            // 第 1 层：宽外发光晕光带
            g.strokeStyle = actor.color;
            g.shadowColor = actor.color;
            g.shadowBlur = 20 * frac;
            g.globalAlpha = f2 * 0.36;
            g.lineWidth = 2.0 + f2 * 14.0;
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
            // 第 2 层：高饱和主色光带
            g.shadowBlur = 8 * frac;
            g.globalAlpha = f2 * 0.88;
            g.lineWidth = 1.2 + f2 * 7.0;
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
            // 第 3 层：炽白高光丝芯
            g.strokeStyle = '#FFFFFF';
            g.shadowBlur = 0;
            g.globalAlpha = f2 * 0.92;
            g.lineWidth = 0.6 + f2 * 2.6;
            g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
          }
          g.restore();
        }

        // 点击涟漪（双环扩散冲击波）
        actor.kfs.forEach((kf) => {
          if (!kf.click) return;
          const cdt = t - kf.t;
          if (cdt >= 0 && cdt < 0.45) {
            const cp = cdt / 0.45;
            g.save();
            g.globalAlpha = (1 - cp) * 0.9;
            g.strokeStyle = actor.color;
            g.lineWidth = 3.5 * (1 - cp * 0.5);
            g.beginPath(); g.arc(kf.x, kf.y, 10 + cp * 56, 0, Math.PI * 2); g.stroke();
            g.strokeStyle = '#FFFFFF';
            g.lineWidth = 2 * (1 - cp);
            g.beginPath(); g.arc(kf.x, kf.y, 4 + cp * 32, 0, Math.PI * 2); g.stroke();
            g.restore();
          }
        });

        // 高速飞行时按横向速度自然前倾 + 微放大
        const speedTilt = cur.flying ? Math.max(-24, Math.min(24, (cur.vx || 0) * 0.025)) : 0;
        const flyScale = cur.flying ? 1.12 : 1.0;
        this._drawPointer(g, cur.x, cur.y, actor.color, actor.label, speedTilt, flyScale, false);
      });
    }
  }

  MHEngine.CursorActorsEngine = CursorActorsEngine;
})(window);
