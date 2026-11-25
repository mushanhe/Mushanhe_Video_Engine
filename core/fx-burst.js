/**
 * Mushanhe Video Engine — Deterministic Foreground FX Engine (core/fx-burst.js)
 * 纯代码确定性前景特效引擎：支持 6 种高记忆点退场特效
 *   1. warp             - 传送门光速线爆发
 *   2. vortex           - 真·黑洞漩涡吸入（旋转螺旋吸流 + 中心光点闭合）
 *   3. confetti         - 礼花彩纸爆裂（冲击环 + 重力翻滚彩纸）
 *   4. shatter          - 刚体碎裂飞溅（红金锐角碎片）
 *   5. laserDisintegrate- 激光扫过实时离散成像素云（扫描光束 + 逐列像素飞散）
 *   6. launchTrails     - 弹簧弹射向上尾焰与火花团
 * 严守“时间 t 唯一输入”原则：任意拖拽进度条与无头逐帧导出 100% 确定性还原。
 */
(function (global) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class FxBurstEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = 1920;
      this.H = 1080;
      this.events = [];
    }

    /** 1. 传送门光速线爆发 (Portal Warp) */
    addWarpBurst(cfg) {
      const rand = mulberry32(cfg.seed || 202611);
      const streaks = [];
      const count = cfg.count || 44;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.14;
        streaks.push({
          angle,
          rStart: 40 + rand() * 140,
          speed: 900 + rand() * 1400,
          len: 60 + rand() * 160,
          width: 2 + rand() * 4,
          color: rand() > 0.45 ? '#23D2CE' : (rand() > 0.4 ? '#FAB540' : '#FFFFFF')
        });
      }
      this.events.push({
        type: 'warp',
        time: cfg.time,
        duration: cfg.duration || 0.65,
        cx: cfg.cx,
        cy: cfg.cy,
        streaks
      });
    }

    /** 2. 真·黑洞漩涡吸入 (Real Vortex Suction) */
    addVortexSuction(cfg) {
      const rand = mulberry32(cfg.seed || 202622);
      const streams = [];
      const count = cfg.count || 64;
      for (let i = 0; i < count; i++) {
        streams.push({
          startAngle: rand() * Math.PI * 2,
          startRadius: 140 + rand() * 380,
          spinSpeed: 5.5 + rand() * 4.5,
          delay: rand() * 0.16,
          size: 4 + rand() * 8,
          color: rand() > 0.45 ? '#23D2CE' : (rand() > 0.45 ? '#FAB540' : '#E2E8F0')
        });
      }
      this.events.push({
        type: 'vortex',
        time: cfg.time,
        duration: cfg.duration || 0.72,
        cx: cfg.cx,
        cy: cfg.cy,
        streams
      });
    }

    /** 3. 礼花彩纸爆裂 (Confetti Burst) */
    addConfettiBurst(cfg) {
      const rand = mulberry32(cfg.seed || 202601);
      const colors = cfg.colors || ['#23D2CE', '#FAB540', '#FB7185', '#FFFFFF', '#FDE793', '#38BDF8'];
      const count = cfg.countPerOrigin || 38;
      const particles = [];

      for (const origin of cfg.origins) {
        for (let i = 0; i < count; i++) {
          const angle = rand() * Math.PI * 2;
          const speed = 300 + rand() * 780;
          const isRibbon = rand() > 0.35;
          particles.push({
            ox: origin.x + (rand() - 0.5) * 90,
            oy: origin.y + (rand() - 0.5) * 60,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (170 + rand() * 260),
            w: isRibbon ? 15 + rand() * 14 : 9 + rand() * 9,
            h: isRibbon ? 6 + rand() * 6 : 9 + rand() * 9,
            rot: rand() * Math.PI * 2,
            vrot: (rand() - 0.5) * 16,
            flipPhase: rand() * Math.PI * 2,
            flipSpeed: 8 + rand() * 12,
            color: colors[Math.floor(rand() * colors.length)],
            drag: 1.35 + rand() * 1.1,
            gravity: 780 + rand() * 420
          });
        }
      }

      this.events.push({
        type: 'confetti',
        time: cfg.time,
        duration: cfg.duration || 1.35,
        origins: cfg.origins,
        particles
      });
    }

    /** 4. 刚体碎裂飞溅 (Angular Shatter) */
    addShatter(cfg) {
      const rand = mulberry32(cfg.seed || 202644);
      const colors = cfg.colors || ['#FF4E4E', '#FAB540', '#FFE4D6', '#FFFFFF', '#E11D48'];
      const shards = [];
      const count = cfg.count || 46;
      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const speed = 260 + rand() * 720;
        const pts = [];
        const r = 10 + rand() * 22;
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + rand() * 0.7;
          pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        shards.push({
          ox: cfg.cx + (rand() - 0.5) * (cfg.spreadX || 320),
          oy: cfg.cy + (rand() - 0.5) * (cfg.spreadY || 120),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 120,
          rot: rand() * Math.PI * 2,
          vrot: (rand() - 0.5) * 14,
          pts,
          color: colors[Math.floor(rand() * colors.length)],
          gravity: 900 + rand() * 400
        });
      }
      this.events.push({
        type: 'shatter',
        time: cfg.time,
        duration: cfg.duration || 0.9,
        cx: cfg.cx,
        cy: cfg.cy,
        shards
      });
    }

    /** 5. 激光扫描线 + 逐列离散成像素云 (Laser Scan Disintegration) */
    addLaserDisintegration(cfg) {
      const rand = mulberry32(cfg.seed || 202655);
      const { x, y, w, h } = cfg.rect;
      const cols = cfg.cols || 24;
      const rows = cfg.rows || 11;
      const cw = w / cols;
      const ch = h / rows;
      const scanDuration = cfg.scanDuration || 0.36;
      const colors = cfg.colors || ['#23D2CE', '#818CF8', '#FFFFFF', '#FAB540', '#38BDF8'];
      const tiles = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const colFrac = c / cols;
          const triggerT = colFrac * scanDuration + (rand() - 0.5) * 0.03;
          const angle = -0.35 + (rand() - 0.5) * 1.1;
          const speed = 220 + rand() * 520;
          tiles.push({
            x: x + c * cw + cw * 0.5,
            y: y + r * ch + ch * 0.5,
            size: Math.min(cw, ch) * (0.45 + rand() * 0.5),
            triggerT: Math.max(0, triggerT),
            vx: Math.cos(angle) * speed + 140,
            vy: Math.sin(angle) * speed - 90,
            rot: (rand() - 0.5) * 0.5,
            vrot: (rand() - 0.5) * 10,
            color: colors[Math.floor(rand() * colors.length)],
            glow: rand() > 0.5
          });
        }
      }

      this.events.push({
        type: 'laserDisintegrate',
        time: cfg.time,
        duration: cfg.duration || 1.15,
        scanDuration,
        rect: cfg.rect,
        tiles
      });
    }

    /** 6. 弹簧弹射向上尾焰与火花团 (Spring Launch Trails) */
    addLaunchTrails(cfg) {
      const rand = mulberry32(cfg.seed || 202666);
      const sparks = [];
      for (const p of cfg.pads) {
        for (let i = 0; i < (cfg.countPerPad || 26); i++) {
          sparks.push({
            ox: p.x + (rand() - 0.5) * p.w * 0.85,
            oy: p.y + (rand() - 0.5) * 40,
            vx: (rand() - 0.5) * 320,
            vy: 140 + rand() * 440,
            delay: p.delay + rand() * 0.12,
            size: 5 + rand() * 10,
            color: rand() > 0.45 ? '#23D2CE' : (rand() > 0.4 ? '#FAB540' : '#FFFFFF')
          });
        }
      }
      this.events.push({
        type: 'launchTrails',
        time: cfg.time,
        duration: cfg.duration || 0.85,
        pads: cfg.pads,
        sparks
      });
    }

    /** 7. 利落刀光斩切线 (Katana Clean Slash — 零碎片，纯锐利刀光) */
    addKatanaSlash(cfg) {
      this.events.push({
        type: 'katanaSlash',
        time: cfg.time,
        duration: cfg.duration || 0.34,
        x1: cfg.x1, y1: cfg.y1,
        x2: cfg.x2, y2: cfg.y2,
        color: cfg.color || '#FFF6E0'
      });
    }

    /** 8. CRT 显像管关机水平亮线与中心星点熄灭 (CRT Power-Off Flash) */
    addCrtFlash(cfg) {
      this.events.push({
        type: 'crtFlash',
        time: cfg.time,
        duration: cfg.duration || 0.42,
        cx: cfg.cx, cy: cfg.cy, w: cfg.w
      });
    }

    render(t) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);

      for (const ev of this.events) {
        const dt = t - ev.time;
        if (dt < 0 || dt > ev.duration) continue;

        if (ev.type === 'warp') this._renderWarp(ctx, ev, dt);
        else if (ev.type === 'vortex') this._renderVortex(ctx, ev, dt);
        else if (ev.type === 'confetti') this._renderConfetti(ctx, ev, dt);
        else if (ev.type === 'shatter') this._renderShatter(ctx, ev, dt);
        else if (ev.type === 'laserDisintegrate') this._renderLaserDisintegrate(ctx, ev, dt);
        else if (ev.type === 'launchTrails') this._renderLaunchTrails(ctx, ev, dt);
        else if (ev.type === 'katanaSlash') this._renderKatanaSlash(ctx, ev, dt);
        else if (ev.type === 'crtFlash') this._renderCrtFlash(ctx, ev, dt);
        else if (ev.type === 'energyConverge') this._renderEnergyConverge(ctx, ev, dt);
        else if (ev.type === 'irisShutter') this._renderIrisShutter(ctx, ev, dt);
      }
    }

    _renderWarp(ctx, ev, dt) {
      const p = dt / ev.duration;
      ctx.save();
      // 中心传送门光环
      if (p < 0.7) {
        const rp = p / 0.7;
        ctx.beginPath();
        ctx.arc(ev.cx, ev.cy, 25 + rp * 420, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(35, 210, 206, ${(1 - rp) * 0.8})`;
        ctx.lineWidth = Math.max(1.5, (1 - rp) * 14);
        ctx.stroke();
      }
      // 放射光速线
      for (const s of ev.streaks) {
        const r1 = s.rStart + dt * s.speed;
        const r0 = Math.max(0, r1 - s.len * (1 - p * 0.4));
        ctx.beginPath();
        ctx.moveTo(ev.cx + Math.cos(s.angle) * r0, ev.cy + Math.sin(s.angle) * r0);
        ctx.lineTo(ev.cx + Math.cos(s.angle) * r1, ev.cy + Math.sin(s.angle) * r1);
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = Math.max(0, (1 - p) * 0.9);
        ctx.lineWidth = s.width * (1 - p * 0.5);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    _renderVortex(ctx, ev, dt) {
      const p = dt / ev.duration;
      const openScale = p < 0.18 ? (p / 0.18) : (p > 0.78 ? Math.max(0, (1 - p) / 0.22) : 1);

      ctx.save();
      ctx.translate(ev.cx, ev.cy);

      // 漩涡中心黑洞发光吸口 + 3 层旋转螺旋环
      const coreR = 74 * openScale;
      if (coreR > 1) {
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreR * 2.4);
        grad.addColorStop(0, 'rgba(6, 12, 16, 0.96)');
        grad.addColorStop(0.38, 'rgba(35, 210, 206, 0.52)');
        grad.addColorStop(0.7, 'rgba(250, 181, 64, 0.24)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 2.4, 0, Math.PI * 2);
        ctx.fill();

        for (let ring = 0; ring < 3; ring++) {
          ctx.save();
          ctx.rotate(dt * (7 + ring * 3.5) * (ring % 2 === 0 ? 1 : -1));
          ctx.beginPath();
          ctx.arc(0, 0, (28 + ring * 28) * openScale, 0, Math.PI * 1.35);
          ctx.strokeStyle = ring === 1 ? 'rgba(250, 181, 64, 0.85)' : 'rgba(35, 210, 206, 0.85)';
          ctx.lineWidth = 4 - ring * 0.8;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
        }
      }

      // 64 道螺旋吸入轨迹粒子（从外圈急剧卷入中心吸口）
      for (const st of ev.streams) {
        const lt = dt - st.delay;
        if (lt < 0) continue;
        const life = Math.max(0.25, ev.duration - st.delay - 0.12);
        const sp = Math.min(1, lt / life);
        if (sp >= 1) continue;

        const r = st.startRadius * Math.pow(1 - sp, 1.55);
        const ang = st.startAngle + lt * st.spinSpeed + sp * 4.2;
        const rPrev = st.startRadius * Math.pow(Math.max(0, 1 - Math.max(0, sp - 0.08)), 1.55);
        const angPrev = st.startAngle + Math.max(0, lt - 0.04) * st.spinSpeed + Math.max(0, sp - 0.08) * 4.2;

        ctx.beginPath();
        ctx.moveTo(Math.cos(angPrev) * rPrev, Math.sin(angPrev) * rPrev);
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        ctx.strokeStyle = st.color;
        ctx.globalAlpha = Math.sin(sp * Math.PI) * 0.92;
        ctx.lineWidth = Math.max(1.5, st.size * (1 - sp * 0.65));
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 闭合瞬间小白闪点
      if (p > 0.78 && p < 0.98) {
        const fp = (p - 0.78) / 0.20;
        ctx.globalAlpha = 1 - fp;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, (1 - fp) * 28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _renderConfetti(ctx, ev, dt) {
      const p = dt / ev.duration;
      if (dt < 0.24) {
        const rp = dt / 0.24;
        ctx.save();
        for (const o of ev.origins) {
          const rad = 24 + rp * 195;
          ctx.beginPath();
          ctx.arc(o.x, o.y, rad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 232, 165, ${(1 - rp) * 0.78})`;
          ctx.lineWidth = Math.max(1, (1 - rp) * 11);
          ctx.stroke();
        }
        ctx.restore();
      }

      for (const pt of ev.particles) {
        const damp = (1 - Math.exp(-pt.drag * dt)) / pt.drag;
        const px = pt.ox + pt.vx * damp;
        const py = pt.oy + pt.vy * damp + 0.5 * pt.gravity * dt * dt;
        const alpha = p < 0.68 ? 1 : Math.max(0, 1 - (p - 0.68) / 0.32);
        const flipScale = Math.cos(pt.flipPhase + dt * pt.flipSpeed);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);
        ctx.rotate(pt.rot + pt.vrot * dt);
        ctx.scale(1, Math.max(0.18, Math.abs(flipScale)));
        ctx.fillStyle = pt.color;
        ctx.fillRect(-pt.w * 0.5, -pt.h * 0.5, pt.w, pt.h);
        ctx.restore();
      }
    }

    _renderShatter(ctx, ev, dt) {
      const p = dt / ev.duration;
      if (dt < 0.16) {
        const fp = dt / 0.16;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 100, 78, ${(1 - fp) * 0.9})`;
        ctx.lineWidth = (1 - fp) * 8;
        ctx.beginPath();
        ctx.moveTo(ev.cx - 240, ev.cy - 90);
        ctx.lineTo(ev.cx + 240, ev.cy + 90);
        ctx.stroke();
        ctx.restore();
      }

      for (const sh of ev.shards) {
        const px = sh.ox + sh.vx * dt * 0.85;
        const py = sh.oy + sh.vy * dt * 0.85 + 0.5 * sh.gravity * dt * dt;
        const alpha = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);
        ctx.rotate(sh.rot + sh.vrot * dt);
        ctx.fillStyle = sh.color;
        ctx.beginPath();
        ctx.moveTo(sh.pts[0].x, sh.pts[0].y);
        ctx.lineTo(sh.pts[1].x, sh.pts[1].y);
        ctx.lineTo(sh.pts[2].x, sh.pts[2].y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    _renderLaserDisintegrate(ctx, ev, dt) {
      // 1. 亮青色垂直激光扫描线从左向右横扫
      if (dt <= ev.scanDuration + 0.08) {
        const sp = Math.min(1, dt / ev.scanDuration);
        const lx = ev.rect.x + sp * ev.rect.w;
        const alpha = dt <= ev.scanDuration ? 1 : Math.max(0, 1 - (dt - ev.scanDuration) / 0.08);
        ctx.save();
        ctx.globalAlpha = alpha;
        const glowGrad = ctx.createLinearGradient(lx - 48, 0, lx + 20, 0);
        glowGrad.addColorStop(0, 'rgba(35, 210, 206, 0)');
        glowGrad.addColorStop(0.7, 'rgba(35, 210, 206, 0.55)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(lx - 48, ev.rect.y - 24, 68, ev.rect.h + 48);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(lx - 2, ev.rect.y - 30, 5, ev.rect.h + 60);
        ctx.restore();
      }

      // 2. 激光扫过之处实时爆出发光像素方块云
      for (const tl of ev.tiles) {
        const lt = dt - tl.triggerT;
        if (lt < 0) continue;
        const life = Math.max(0.35, ev.duration - tl.triggerT);
        const p = Math.min(1, lt / life);
        const ease = 1 - Math.pow(1 - p, 2.1);

        const px = tl.x + tl.vx * ease * 0.72;
        const py = tl.y + tl.vy * ease * 0.72;
        const scale = Math.max(0.15, 1 - p * 0.72);
        const alpha = p < 0.12 ? (p / 0.12) : Math.max(0, 1 - (p - 0.12) / 0.88);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);
        ctx.rotate(tl.rot + tl.vrot * lt);
        ctx.scale(scale, scale);
        if (tl.glow) {
          ctx.shadowColor = tl.color;
          ctx.shadowBlur = 14;
        }
        ctx.fillStyle = tl.color;
        const s = tl.size;
        ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
        ctx.restore();
      }
    }

    _renderLaunchTrails(ctx, ev, dt) {
      // 向上弹射垂直光带尾焰
      ctx.save();
      for (const pad of ev.pads) {
        const lt = dt - pad.delay;
        if (lt < 0 || lt > 0.42) continue;
        const p = lt / 0.42;
        const trailH = 520 * (1 - p * 0.3);
        const topY = pad.y - lt * 2200;
        const grad = ctx.createLinearGradient(0, topY, 0, topY + trailH);
        grad.addColorStop(0, `rgba(255, 255, 255, ${(1 - p) * 0.7})`);
        grad.addColorStop(0.35, `rgba(35, 210, 206, ${(1 - p) * 0.48})`);
        grad.addColorStop(1, 'rgba(250, 181, 64, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(pad.x - pad.w * 0.32, topY, pad.w * 0.64, trailH);
      }
      ctx.restore();

      // 弹射底部喷出的火星粒子
      for (const sp of ev.sparks) {
        const lt = dt - sp.delay;
        if (lt < 0 || lt > 0.55) continue;
        const p = lt / 0.55;
        const px = sp.ox + sp.vx * lt;
        const py = sp.oy + sp.vy * lt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(px, py, sp.size * (1 - p * 0.6), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    _renderKatanaSlash(ctx, ev, dt) {
      const p = dt / ev.duration;
      const drawP = Math.min(1, p / 0.35);
      const fade = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.65);
      const ex = ev.x1 + (ev.x2 - ev.x1) * drawP;
      const ey = ev.y1 + (ev.y2 - ev.y1) * drawP;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.shadowColor = '#FF644E';
      ctx.shadowBlur = 24;
      ctx.strokeStyle = '#FF644E';
      ctx.lineWidth = Math.max(2, 16 * fade);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ev.x1, ev.y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1.5, 6 * fade);
      ctx.beginPath();
      ctx.moveTo(ev.x1, ev.y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    }

    _renderCrtFlash(ctx, ev, dt) {
      const p = dt / ev.duration;
      ctx.save();
      if (p < 0.55) {
        // 阶段1：水平亮白青色扫线横贯面板中轴
        const lp = p / 0.55;
        const halfW = (ev.w * 0.52) * (lp < 0.45 ? 1 : 1 - ((lp - 0.45) / 0.55) * 0.94);
        const h = lp < 0.45 ? (16 - lp * 22) : 6;
        ctx.shadowColor = '#23D2CE';
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(ev.cx - halfW, ev.cy - h * 0.5, halfW * 2, Math.max(3, h));
      } else {
        // 阶段2：中心高光星点闪一下彻底熄灭
        const sp = (p - 0.55) / 0.45;
        const alpha = Math.max(0, 1 - sp);
        const rad = (1 - sp * 0.7) * 26;
        ctx.globalAlpha = alpha;
        const g = ctx.createRadialGradient(ev.cx, ev.cy, 0, ev.cx, ev.cy, rad * 2.2);
        g.addColorStop(0, '#FFFFFF');
        g.addColorStop(0.4, 'rgba(35, 210, 206, 0.85)');
        g.addColorStop(1, 'rgba(35, 210, 206, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ev.cx, ev.cy, rad * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /** 9. 多源能量光流汇聚 + 黄金光学冲击环 (Energy Converge) */
    addEnergyConverge(cfg) {
      const rand = mulberry32(cfg.seed || 202691);
      const origins = cfg.origins || [{ x: 320, y: 540 }, { x: 740, y: 540 }, { x: 1180, y: 540 }, { x: 1600, y: 540 }];
      const colors = cfg.colors || ['#00D4AA', '#FF9500', '#0A84FF', '#FF2D55'];
      const sparks = [];
      origins.forEach((o, idx) => {
        for (let i = 0; i < (cfg.perOrigin || 16); i++) {
          sparks.push({
            ox: o.x + (rand() - 0.5) * 140,
            oy: o.y + (rand() - 0.5) * 180,
            ctrlOffset: (rand() - 0.5) * 260,
            delay: rand() * 0.16,
            size: 4 + rand() * 6,
            color: colors[idx % colors.length]
          });
        }
      });
      this.events.push({
        type: 'energyConverge',
        time: cfg.time,
        duration: cfg.duration || 0.92,
        cx: cfg.cx ?? 960,
        cy: cfg.cy ?? 540,
        sparks
      });
    }

    _renderEnergyConverge(ctx, ev, dt) {
      const p = dt / ev.duration;
      ctx.save();
      // 阶段 1 (0 ~ 0.62)：彩色能量光束沿贝塞尔曲线高速汇入中心
      if (p < 0.72) {
        ev.sparks.forEach((s) => {
          const sp = Math.max(0, Math.min(1, (p - s.delay) / 0.52));
          if (sp <= 0 || sp >= 1) return;
          const ease = sp * sp * (3 - 2 * sp);
          const mx = (s.ox + ev.cx) * 0.5;
          const my = (s.oy + ev.cy) * 0.5 + s.ctrlOffset;
          const inv = 1 - ease;
          const x = inv * inv * s.ox + 2 * inv * ease * mx + ease * ease * ev.cx;
          const y = inv * inv * s.oy + 2 * inv * ease * my + ease * ease * ev.cy;
          const prevE = Math.max(0, ease - 0.14);
          const pinv = 1 - prevE;
          const px = pinv * pinv * s.ox + 2 * pinv * prevE * mx + prevE * prevE * ev.cx;
          const py = pinv * pinv * s.oy + 2 * pinv * prevE * my + prevE * prevE * ev.cy;

          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.size * (1 - ease * 0.4);
          ctx.lineCap = 'round';
          ctx.globalAlpha = Math.sin(sp * Math.PI) * 0.95;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
        });
      }
      // 阶段 2 (0.45 ~ 1.0)：中心汇聚点炸出精密双层光学冲击环
      if (p > 0.42) {
        const rp = Math.min(1, (p - 0.42) / 0.58);
        const rease = 1 - Math.pow(1 - rp, 3);
        const alpha = Math.max(0, 1 - rp);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#FFD066';
        ctx.lineWidth = Math.max(2, 14 * (1 - rp));
        ctx.beginPath();
        ctx.arc(ev.cx, ev.cy, 40 + rease * 520, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#00E5C3';
        ctx.lineWidth = Math.max(1.5, 6 * (1 - rp));
        ctx.setLineDash([28, 18]);
        ctx.beginPath();
        ctx.arc(ev.cx, ev.cy, 20 + rease * 380, rp * 2, rp * 2 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    /** 10. 精密光学 8 叶片机械光圈快门 (Iris Shutter) */
    addIrisShutter(cfg) {
      this.events.push({
        type: 'irisShutter',
        time: cfg.time,
        duration: cfg.duration || 0.65,
        cx: cfg.cx ?? 960,
        cy: cfg.cy ?? 540,
        radius: cfg.radius ?? 460
      });
    }

    _renderIrisShutter(ctx, ev, dt) {
      const p = dt / ev.duration;
      const closeP = p < 0.45 ? (p / 0.45) : Math.max(0, 1 - (p - 0.45) / 0.55);
      const blades = 8;
      ctx.save();
      ctx.translate(ev.cx, ev.cy);
      ctx.rotate(closeP * 0.65);
      ctx.globalAlpha = closeP * 0.92;
      for (let i = 0; i < blades; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / blades);
        ctx.fillStyle = i % 2 === 0 ? '#141C24' : '#1E2A36';
        ctx.strokeStyle = '#F0C264';
        ctx.lineWidth = 2.5;
        const innerR = ev.radius * (1 - closeP * 0.92);
        ctx.beginPath();
        ctx.moveTo(innerR, 0);
        ctx.lineTo(ev.radius * 1.25, -ev.radius * 0.52);
        ctx.lineTo(ev.radius * 1.25, ev.radius * 0.52);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  global.MHEngine = global.MHEngine || {};
  global.MHEngine.FxBurstEngine = FxBurstEngine;
})(window);
