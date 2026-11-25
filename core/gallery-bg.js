/**
 * Mushanhe Video Engine — Designed Architectural Studio Gallery Background (core/gallery-bg.js)
 * 彻底告别“空洞发黄的纯色纸”：为 60-30-10 浅色影棚画廊提供 5 套有建筑设计感、有层次、
 * 有瑞士排版微细节（+ 校准十字、巨型低饱和水印字、等高线/罗盘刻度/天窗光束/光学棱镜光斑）的确定性动态背景。
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  class GalleryBackground {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = 1920;
      this.H = 1080;
    }

    /** 绘制瑞士建筑级 + 校准十字矩阵与外框微刻度 */
    drawSwissFiducials(g, inkColor, accentColor) {
      g.save();
      g.strokeStyle = inkColor;
      g.lineWidth = 1;
      const cols = [84, 460, 840, 1220, 1600, 1836];
      const rows = [148, 410, 672, 934];
      for (const x of cols) {
        for (const y of rows) {
          g.beginPath();
          g.moveTo(x - 7, y); g.lineTo(x + 7, y);
          g.moveTo(x, y - 7); g.lineTo(x, y + 7);
          g.stroke();
        }
      }
      // 极细建筑辅助线
      g.strokeStyle = 'rgba(20, 28, 38, 0.045)';
      g.beginPath();
      g.moveTo(84, 148); g.lineTo(1836, 148);
      g.moveTo(84, 934); g.lineTo(1836, 934);
      g.moveTo(1220, 148); g.lineTo(1220, 934);
      g.stroke();

      // 左下角微型建筑图号标尺
      g.fillStyle = accentColor;
      g.font = '700 11px "JetBrains Mono", Consolas, monospace';
      g.fillText('MUSHANHE STUDIO // 1920×1080 · 60-30-10 OPTICAL GALLERY', 84, 962);
      g.restore();
    }

    /** 巨型低饱和编辑部水印字（类似瑞士海报 / 现代设计画廊墙面浮雕） */
    drawWatermark(g, text, sub, x, y, color = 'rgba(18, 26, 36, 0.036)') {
      g.save();
      g.fillStyle = color;
      g.font = '900 220px "Noto Sans SC", "JetBrains Mono", sans-serif';
      g.fillText(text, x, y);
      if (sub) {
        g.font = '800 28px "JetBrains Mono", Consolas, monospace';
        g.fillText(sub, x + 8, y - 190);
      }
      g.restore();
    }

    /** 1. Act 1 (0-8.5s): 瑞士极简纯净珍珠白画廊 + 柔和棱镜光斑 + 精密弧线罗盘 */
    renderSwissPearl(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#FAFBFC');
      bg.addColorStop(0.55, '#F2F4F8');
      bg.addColorStop(1, '#E8ECF2');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 柔和光学棱镜漫射光斑（清爽冰青 + 极淡暖桃，绝不发黄发脏）
      const b1 = g.createRadialGradient(540 + Math.sin(t * 0.4) * 40, 480, 40, 540, 480, 620);
      b1.addColorStop(0, 'rgba(0, 212, 170, 0.09)');
      b1.addColorStop(0.55, 'rgba(10, 132, 255, 0.045)');
      b1.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = b1;
      g.fillRect(0, 0, this.W, this.H);

      const b2 = g.createRadialGradient(1480, 240 + Math.cos(t * 0.35) * 30, 30, 1480, 240, 520);
      b2.addColorStop(0, 'rgba(255, 168, 52, 0.085)');
      b2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = b2;
      g.fillRect(0, 0, this.W, this.H);

      // 巨型背景水印
      this.drawWatermark(g, 'SPACE 01', 'ARCHITECTURAL ARCHIVE', 68, 900);

      // 动态精密同心圆轨道（环绕 3D 文件夹背后）
      g.save();
      g.translate(610, 580);
      g.rotate(t * 0.04);
      g.strokeStyle = 'rgba(20, 30, 44, 0.065)';
      g.lineWidth = 1.2;
      [270, 380, 490].forEach((r, i) => {
        g.beginPath();
        g.setLineDash(i === 1 ? [8, 12] : []);
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.stroke();
      });
      g.setLineDash([]);
      g.restore();

      this.drawSwissFiducials(g, 'rgba(20, 30, 44, 0.22)', 'rgba(20, 30, 44, 0.34)');
    }

    /** 2. Act 2 (8.5-17.1s): 冰川浅蓝工程蓝图 + 流动光学丝带 + 透视网格 */
    renderOpticalBlueprint(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#F7FAFD');
      bg.addColorStop(0.55, '#ECF3FA');
      bg.addColorStop(1, '#DFEBF7');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 流动光学丝带（柔和钴蓝与翡翠青双波）
      g.save();
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const baseY = 260 + k * 170;
        for (let x = 0; x <= this.W; x += 40) {
          const y = baseY + Math.sin(x * 0.0024 + t * 0.65 + k * 1.1) * 58 + Math.cos(x * 0.0012 - t * 0.4) * 28;
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokeStyle = k % 2 === 0 ? 'rgba(10, 132, 255, 0.085)' : 'rgba(0, 184, 148, 0.08)';
        g.lineWidth = 2.2;
        g.stroke();
      }
      g.restore();

      // 柔和顶部蓝青聚光
      const glow = g.createRadialGradient(960, 360, 50, 960, 360, 780);
      glow.addColorStop(0, 'rgba(10, 132, 255, 0.08)');
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, this.W, this.H);

      this.drawWatermark(g, 'SYSTEM', 'LOCAL BUS // EXECUTION', 76, 910, 'rgba(10, 62, 128, 0.04)');
      this.drawSwissFiducials(g, 'rgba(10, 62, 128, 0.20)', 'rgba(10, 62, 128, 0.36)');
    }

    /** 3. Act 4 (21.6-29.2s): 铂金浅冰精密量角仪 + 斜向建筑天窗光束 */
    renderPlatinumCompass(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#F8FAFD');
      bg.addColorStop(0.55, '#EEF2F8');
      bg.addColorStop(1, '#E2E8F3');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 斜向建筑柔光带
      g.save();
      g.translate(640, 520);
      g.rotate(-0.42);
      const beam = g.createLinearGradient(-400, 0, 400, 0);
      beam.addColorStop(0, 'rgba(255,255,255,0)');
      beam.addColorStop(0.5, 'rgba(255,255,255,0.68)');
      beam.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = beam;
      g.fillRect(-380, -800, 760, 1600);
      g.restore();

      // 慢速旋转的精密刻度量角环
      g.save();
      g.translate(640, 510);
      g.rotate(t * 0.05);
      g.strokeStyle = 'rgba(20, 42, 78, 0.08)';
      g.lineWidth = 1.4;
      g.beginPath(); g.arc(0, 0, 390, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0, 0, 430, 0, Math.PI * 2); g.stroke();
      for (let a = 0; a < 72; a++) {
        const ang = (a / 72) * Math.PI * 2;
        const r1 = a % 6 === 0 ? 378 : 386;
        g.beginPath();
        g.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        g.lineTo(Math.cos(ang) * 402, Math.sin(ang) * 402);
        g.stroke();
      }
      g.restore();

      this.drawWatermark(g, 'GUARD', 'BOUNDARY & RULES', 72, 910, 'rgba(20, 42, 78, 0.038)');
      this.drawSwissFiducials(g, 'rgba(20, 42, 78, 0.22)', 'rgba(20, 42, 78, 0.36)');
    }

    /** 4. Act 5 (31.6-41.2s): 瓷白等高线地形纹 + 冰青浅樱棱镜光晕 */
    renderTopographicSilk(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#FAFEFE');
      bg.addColorStop(0.55, '#EEF6F7');
      bg.addColorStop(1, '#F3ECEF');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 丝绸等高线波形（极细腻的青灰与玫瑰灰双色线条）
      g.save();
      for (let i = 0; i < 11; i++) {
        g.beginPath();
        const y0 = 110 + i * 86;
        for (let x = 0; x <= this.W; x += 36) {
          const y = y0 + Math.sin(x * 0.0022 + i * 0.55 + t * 0.45) * 42 + Math.cos(x * 0.004 - t * 0.3) * 16;
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokeStyle = i % 3 === 0 ? 'rgba(0, 168, 134, 0.09)' : 'rgba(20, 35, 45, 0.05)';
        g.lineWidth = i % 3 === 0 ? 1.6 : 1;
        g.stroke();
      }
      g.restore();

      const halo = g.createRadialGradient(480, 560, 40, 480, 560, 560);
      halo.addColorStop(0, 'rgba(0, 212, 170, 0.10)');
      halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = halo;
      g.fillRect(0, 0, this.W, this.H);

      this.drawWatermark(g, 'MEMORY', 'CLAUDE.MD // LONG-TERM BUS', 76, 910, 'rgba(0, 100, 90, 0.036)');
      this.drawSwissFiducials(g, 'rgba(0, 92, 84, 0.20)', 'rgba(0, 92, 84, 0.36)');
    }

    /** 5. Act 6 (41.2-50.5s): 干净珍珠白建筑天窗百叶光束 + 黄金分割弧线（绝不发黄！） */
    renderSkylightGallery(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#FDFDFC');
      bg.addColorStop(0.55, '#F5F4F0');
      bg.addColorStop(1, '#ECEAE4');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 建筑天窗斜射光影（高雅微动）
      g.save();
      const shift = Math.sin(t * 0.35) * 28;
      for (let i = 0; i < 4; i++) {
        const x = 180 + i * 380 + shift;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 170, 0);
        g.lineTo(x - 160, this.H);
        g.lineTo(x - 330, this.H);
        g.closePath();
        const grad = g.createLinearGradient(x, 0, x - 200, this.H);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
        grad.addColorStop(0.5, 'rgba(255, 214, 140, 0.09)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        g.fillStyle = grad;
        g.fill();
      }
      g.restore();

      // 黄金分割建筑弧线
      g.save();
      g.strokeStyle = 'rgba(180, 120, 28, 0.11)';
      g.lineWidth = 1.4;
      g.beginPath(); g.arc(620, 540, 340, -Math.PI * 0.85, Math.PI * 0.35); g.stroke();
      g.beginPath(); g.arc(620, 540, 440, -Math.PI * 0.4, Math.PI * 0.75); g.stroke();
      g.restore();

      this.drawWatermark(g, 'COMPILE', 'AUTO DRAFT // v1.0', 76, 910, 'rgba(30, 26, 20, 0.036)');
      this.drawSwissFiducials(g, 'rgba(30, 26, 20, 0.20)', 'rgba(30, 26, 20, 0.36)');
    }

    /** 6. 暖米色案头草图画廊 · 亚麻稿纸 (editorial-linen) — 专为文案撰写/叙事章设计 */
    renderEditorialLinen(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#FBF7F0');
      bg.addColorStop(0.55, '#F4EDE1');
      bg.addColorStop(1, '#E9DFCE');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 焦糖琥珀 + 鼠尾草暖光漫射
      const b1 = g.createRadialGradient(480 + Math.sin(t * 0.35) * 36, 460, 40, 480, 460, 640);
      b1.addColorStop(0, 'rgba(217, 119, 6, 0.11)');
      b1.addColorStop(0.55, 'rgba(180, 120, 48, 0.04)');
      b1.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = b1;
      g.fillRect(0, 0, this.W, this.H);

      const b2 = g.createRadialGradient(1420, 740 + Math.cos(t * 0.3) * 28, 30, 1420, 740, 560);
      b2.addColorStop(0, 'rgba(16, 138, 108, 0.085)');
      b2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = b2;
      g.fillRect(0, 0, this.W, this.H);

      // 建筑稿纸双栏细线 + 左侧装订竖红线
      g.save();
      g.strokeStyle = 'rgba(120, 88, 52, 0.085)';
      g.lineWidth = 1;
      for (let y = 160; y <= 920; y += 38) {
        g.beginPath(); g.moveTo(84, y); g.lineTo(1836, y); g.stroke();
      }
      g.strokeStyle = 'rgba(198, 68, 48, 0.22)';
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(128, 130); g.lineTo(128, 950); g.stroke();
      g.beginPath(); g.moveTo(134, 130); g.lineTo(134, 950); g.stroke();
      g.restore();

      this.drawWatermark(g, 'SCRIPT', 'EDITORIAL DESK // CH02', 142, 902, 'rgba(72, 48, 24, 0.042)');
      this.drawSwissFiducials(g, 'rgba(84, 58, 32, 0.22)', 'rgba(120, 82, 44, 0.45)');
    }

    /** 7. 暖象牙建筑草图方格 (editorial-grid) — 专为指令规范/逻辑梳理设计 */
    renderEditorialGrid(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#F9F5EC');
      bg.addColorStop(0.55, '#F1E9DA');
      bg.addColorStop(1, '#E6DBC6');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 精密建筑方格与大圆弧草图尺规
      g.save();
      g.strokeStyle = 'rgba(110, 78, 44, 0.065)';
      g.lineWidth = 1;
      for (let x = 84; x <= 1836; x += 64) { g.beginPath(); g.moveTo(x, 120); g.lineTo(x, 960); g.stroke(); }
      for (let y = 120; y <= 960; y += 64) { g.beginPath(); g.moveTo(84, y); g.lineTo(1836, y); g.stroke(); }

      g.strokeStyle = 'rgba(180, 114, 34, 0.14)';
      g.lineWidth = 1.5;
      g.setLineDash([10, 8]);
      g.beginPath(); g.arc(960, 540, 380 + Math.sin(t * 0.6) * 8, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      g.restore();

      const glow = g.createRadialGradient(960, 480, 40, 960, 480, 680);
      glow.addColorStop(0, 'rgba(255, 196, 102, 0.13)');
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, this.W, this.H);

      this.drawWatermark(g, 'OUTLINE', 'RULES & FACT CHECK', 96, 902, 'rgba(72, 48, 24, 0.040)');
      this.drawSwissFiducials(g, 'rgba(84, 58, 32, 0.22)', 'rgba(120, 82, 44, 0.45)');
    }

    /** 8. 暖沙金编辑部光束 (editorial-warm) — 专为审稿重铸/口播匹配铁律设计 */
    renderEditorialWarm(g, t) {
      const bg = g.createLinearGradient(0, 0, this.W, this.H);
      bg.addColorStop(0, '#FCF8F1');
      bg.addColorStop(0.55, '#F3EAD9');
      bg.addColorStop(1, '#E5D8C1');
      g.fillStyle = bg;
      g.fillRect(0, 0, this.W, this.H);

      // 斜射暖阳百叶光束
      g.save();
      const shift = Math.sin(t * 0.32) * 24;
      for (let i = 0; i < 4; i++) {
        const x = 220 + i * 400 + shift;
        g.beginPath();
        g.moveTo(x, 0); g.lineTo(x + 190, 0);
        g.lineTo(x - 140, this.H); g.lineTo(x - 330, this.H);
        g.closePath();
        const grad = g.createLinearGradient(x, 0, x - 180, this.H);
        grad.addColorStop(0, 'rgba(255, 248, 232, 0.72)');
        grad.addColorStop(0.55, 'rgba(234, 158, 56, 0.09)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        g.fillStyle = grad;
        g.fill();
      }
      g.restore();

      this.drawWatermark(g, 'MATCH', 'VOICE TO SUBTITLE', 88, 908, 'rgba(72, 48, 24, 0.042)');
      this.drawSwissFiducials(g, 'rgba(84, 58, 32, 0.22)', 'rgba(120, 82, 44, 0.45)');
    }

    render(t, mood) {
      const g = this.ctx;
      g.clearRect(0, 0, this.W, this.H);
      if (mood === 'swiss-pearl') this.renderSwissPearl(g, t);
      else if (mood === 'optical-blueprint') this.renderOpticalBlueprint(g, t);
      else if (mood === 'platinum-compass') this.renderPlatinumCompass(g, t);
      else if (mood === 'topo-silk') this.renderTopographicSilk(g, t);
      else if (mood === 'editorial-linen') this.renderEditorialLinen(g, t);
      else if (mood === 'editorial-grid') this.renderEditorialGrid(g, t);
      else if (mood === 'editorial-warm') this.renderEditorialWarm(g, t);
      else this.renderSkylightGallery(g, t);
    }
  }

  MHEngine.GalleryBackground = GalleryBackground;
})(window);
