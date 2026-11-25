/**
 * Mushanhe Video Engine — 9 Universal Parametric 3D Narrative Modules (core/modules-3d.js)
 * 从 V9.4 正式沉淀的 9 大高复用口播 3D 叙事母组件（纯数据参数驱动，供全片多章节及后续多期视频直接调用）：
 *   1. FolderCollector   — 3D 归类收纳盒（3-5 张 4K 油墨卡片飞入 + 蓝宝石玻璃前盖）
 *   2. ConsoleSwitch     — 3D 清单控制台 + 实体物理黄铜拨动总闸
 *   3. CapabilityBays    — 3D 多核能力展台（2-4 座蓝宝石能量舱 + 立体光柱 + 贯穿光缆）
 *   4. DualClamp         — 3D 双边夹紧护栏 + 中央圆形金属锁芯
 *   5. CartridgeDock     — 3D 镀金金手指卡带 + 实体卡扣金属主机
 *   6. PipelineMachine   — 3D 涡轮核心处理器（吞入原料 -> 吐出成品）
 *   7. HookShowcaseStage — 3D 三连高能钩子监视器（实时动态画面 / 逐字变色 / 停顿剪除波形）
 *   8. OrchestratorHub   — 3D 中枢神经总控台 + 4 路光纤卫星工具节点
 *   9. RoadmapRail       — 3D 精密导轨四步工程里程碑阵列
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  function easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function recoilAt(t, hitT) {
    const dt = t - hitT;
    if (dt < 0 || dt > 0.65) return 0;
    return -Math.sin(dt * 18.0) * Math.exp(-dt * 7.5) * 0.16;
  }

  function createInkCardTexture(cfg) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 640;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 512, 640);
    grad.addColorStop(0, cfg.c1); grad.addColorStop(1, cfg.c2);
    g.fillStyle = grad; g.fillRect(0, 0, 512, 640);
    g.save();
    if (cfg.pattern === 'notes') {
      g.strokeStyle = 'rgba(255,255,255,0.24)'; g.lineWidth = 3;
      for (let y = 110; y < 600; y += 44) { g.beginPath(); g.moveTo(32, y); g.lineTo(480, y); g.stroke(); }
    } else if (cfg.pattern === 'wave') {
      g.fillStyle = 'rgba(255,255,255,0.28)';
      [42, 86, 128, 72, 148, 108, 60, 132, 92, 54, 118, 78].forEach((h, i) => {
        g.beginPath(); g.roundRect(44 + i * 36, 440 - h / 2, 16, h, 8); g.fill();
      });
    } else if (cfg.pattern === 'code') {
      for (let r = 0; r < 6; r++) for (let col = 0; col < 10; col++) {
        g.fillStyle = ((r * 7 + col * 3) % 5) !== 0 ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.1)';
        g.beginPath(); g.roundRect(42 + col * 43, 320 + r * 42, 30, 30, 7); g.fill();
      }
    } else if (cfg.pattern === 'clap') {
      g.fillStyle = '#14191F'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#FFFFFF';
      for (let x = -40; x < 540; x += 68) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 34, 0); g.lineTo(x + 10, 64); g.lineTo(x - 24, 64); g.closePath(); g.fill();
      }
    }
    g.restore();
    g.font = '900 34px "JetBrains Mono", Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,0.88)';
    g.fillText(cfg.num, 38, cfg.pattern === 'clap' ? 124 : 78);
    g.font = '900 72px "Noto Sans SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#FFFFFF';
    g.shadowColor = 'rgba(0,0,0,0.26)'; g.shadowBlur = 12;
    g.fillText(cfg.title, 36, cfg.pattern === 'clap' ? 212 : 168); g.shadowBlur = 0;
    g.font = '700 30px "JetBrains Mono", Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,0.86)';
    g.fillText(cfg.ext, 38, cfg.pattern === 'clap' ? 268 : 226);
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 6; g.strokeRect(12, 12, 488, 616);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return tex;
  }

  const Modules3D = {};

  /** 1. 3D 归类收纳盒 */
  Modules3D.createFolderCollector = function (studio, cfg) {
    const { roundedRectShape, folderBackShape, makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -1.68, cfg.posY ?? -0.48, 0);
    studio.scene.add(root);

    const body = new THREE.Group();
    root.add(body);
    const shadow = studio.makeShadow(6.4, 2.1, 0, -1.78, 0);
    root.add(shadow);

    const backGeo = new THREE.ExtrudeGeometry(folderBackShape(4.15, 2.75, 0.24), {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 6, curveSegments: 24
    });
    backGeo.translate(0, 0, -0.22);
    body.add(new THREE.Mesh(backGeo, M.gunmetal));

    const tabRail = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.045, 0.06), M.brass);
    tabRail.position.set(-1.32, 1.53, -0.08); body.add(tabRail);

    const pinGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.44, 24);
    const lPin = new THREE.Mesh(pinGeo, M.brass);
    lPin.rotation.z = Math.PI / 2; lPin.position.set(-2.12, -1.16, 0.14); body.add(lPin);
    const rPin = lPin.clone(); rPin.position.x = 2.12; body.add(rPin);

    const frontPivot = new THREE.Group();
    frontPivot.position.set(0, -1.36, 0.20); body.add(frontPivot);

    const glassGeo = new THREE.ExtrudeGeometry(roundedRectShape(4.22, 1.98, 0.22), {
      depth: 0.055, bevelEnabled: true, bevelThickness: 0.028, bevelSize: 0.028, bevelSegments: 6, curveSegments: 24
    });
    glassGeo.translate(0, 1.02, 0);
    frontPivot.add(new THREE.Mesh(glassGeo, M.sapphireGlass));

    const frontTopTrim = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.028, 0.09), M.brass);
    frontTopTrim.position.set(0, 2.02, 0.03); frontPivot.add(frontTopTrim);

    const cards = cfg.cards || [];
    const dotColors = cards.map(c => c.c1);
    let lastCount = -1;
    const label = createCanvasPanel(3.96, 1.92, 1024, 512, (g, W, H, count) => {
      g.strokeStyle = 'rgba(255, 255, 255, 0.32)'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(24, 24, W - 48, H - 48, 28); g.stroke();
      g.fillStyle = '#00E5C3'; g.beginPath(); g.arc(76, 86, 8, 0, Math.PI * 2); g.fill();
      g.font = '800 25px "JetBrains Mono", Consolas, monospace'; g.fillStyle = 'rgba(255, 255, 255, 0.86)';
      g.fillText(cfg.status || 'LOCAL WORKSPACE · MOUNTED', 102, 95);
      g.font = '900 76px "Noto Sans SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#FFFFFF';
      g.shadowColor = 'rgba(0, 0, 0, 0.55)'; g.shadowBlur = 16;
      g.fillText(cfg.folderName || 'Video_Project_01', 64, 232); g.shadowBlur = 0;

      const px = 786, py = 168, pw = 172, ph = 74;
      g.fillStyle = 'rgba(16, 24, 30, 0.80)'; g.strokeStyle = '#F6C56B'; g.lineWidth = 3.5;
      g.beginPath(); g.roundRect(px, py, pw, ph, 37); g.fill(); g.stroke();
      g.font = '900 42px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFE499'; g.textAlign = 'center';
      g.fillText(`${count} / ${cards.length}`, px + pw / 2, py + 51); g.textAlign = 'left';

      g.font = '700 30px "JetBrains Mono", Consolas, monospace'; g.fillStyle = 'rgba(230, 242, 248, 0.88)';
      g.fillText(cfg.path || '~/Projects/Video_Project_01', 64, 418);
      for (let i = 0; i < cards.length; i++) {
        g.beginPath(); g.arc(816 + i * 42, 406, 11, 0, Math.PI * 2);
        g.fillStyle = i < count ? dotColors[i] : 'rgba(255, 255, 255, 0.24)';
        if (i < count) { g.shadowColor = dotColors[i]; g.shadowBlur = 14; }
        g.fill(); g.shadowBlur = 0;
      }
    });
    label.mesh.position.set(0, 1.02, 0.09); frontPivot.add(label.mesh); label.update(0);

    const cardGeo = makeExtrudedBox(0.86, 1.38, 0.032, 0.11, 0.016);
    const cardMeshes = cards.map((spec) => {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(cardGeo, new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(spec.c1), metalness: 0.12, roughness: 0.28, clearcoat: 0.55, envMapIntensity: 0.85
      })));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.32), new THREE.MeshPhysicalMaterial({
        map: createInkCardTexture(spec), roughness: 0.42, metalness: 0, clearcoat: 0.24, envMapIntensity: 0.4
      }));
      face.position.z = 0.034; group.add(face);
      group.visible = false; body.add(group);
      return { group, spec };
    });

    return {
      update(t) {
        const show = t >= (cfg.startT ?? 0) && t < cfg.exitT + 0.40;
        root.visible = show;
        if (!show) return;
        const diveP = clamp01((t - cfg.exitT) / 0.34);
        const diveEase = diveP * diveP;
        const introEase = easeOutBack(clamp01((t - ((cfg.startT ?? 0) + 0.2)) / 0.85));
        let recoilY = 0, recoilPitch = 0, cnt = 0;
        cards.forEach((s) => {
          const hitT = s.startT + 0.42;
          if (t >= hitT) cnt++;
          const r = recoilAt(t, hitT);
          recoilY += r; recoilPitch += r * 0.45;
        });
        if (cnt !== lastCount) { lastCount = cnt; label.update(cnt); }
        const closeP = clamp01((t - cfg.closeT) / 0.52);
        const closeEase = easeOutBack(closeP);
        const showP = clamp01((t - (cfg.closeT + 0.2)) / 2.0);
        const sweepY = Math.sin(t * 1.15) * 0.13 + Math.sin(showP * Math.PI) * 0.32;
        const sweepX = 0.08 + Math.cos(t * 0.9) * 0.04 - easeInOutCubic(closeP) * 0.10;

        body.scale.setScalar(Math.max(0.001, introEase) * (1 + diveEase * 1.45));
        body.position.set(0, (1 - introEase) * -1.4 + Math.sin(t * 1.6) * 0.05 + recoilY, diveEase * 4.5);
        body.rotation.set(sweepX + recoilPitch + (1 - introEase) * 0.35, -0.22 + sweepY + (1 - introEase) * -0.45, 0);
        frontPivot.rotation.x = 0.34 * (1 - closeEase);
        shadow.material.opacity = 1 - diveEase;

        cardMeshes.forEach(({ group, spec }) => {
          const dt = t - spec.startT;
          if (dt < 0) { group.visible = false; return; }
          group.visible = true;
          const p1 = clamp01(dt / 0.28), p2 = clamp01((dt - 0.26) / 0.22);
          const e1 = easeOutCubic(p1), e2 = easeInOutCubic(p2);
          const midX = spec.slotX * 0.92, midY = 1.85, midZ = 0.65;
          const endY = 0.42 - closeEase * 0.22, endZ = 0.01;
          if (p2 <= 0) {
            group.position.set(spec.from[0] + (midX - spec.from[0]) * e1, spec.from[1] + (midY - spec.from[1]) * e1, spec.from[2] + (midZ - spec.from[2]) * e1);
            group.rotation.set((1 - e1) * 0.55, (1 - e1) * (spec.from[0] < 0 ? 0.85 : -0.85), (1 - e1) * (spec.from[0] < 0 ? -0.35 : 0.35));
            group.scale.setScalar(0.72 + 0.34 * e1);
          } else {
            group.position.set(midX + (spec.slotX - midX) * e2, midY + (endY - midY) * e2, midZ + (endZ - midZ) * e2);
            group.rotation.set(0, 0, 0);
            group.scale.setScalar(1.06 - 0.06 * e2);
          }
        });
      }
    };
  };

  /** 2. 3D 清单控制台 + 实体物理拨动总闸 */
  Modules3D.createConsoleSwitch = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -1.58, cfg.posY ?? -0.36, 0);
    root.visible = false;
    studio.scene.add(root);

    const body = new THREE.Group(); root.add(body);
    root.add(studio.makeShadow(6.8, 2.2, 0, -1.92, 0));

    body.add(new THREE.Mesh(makeExtrudedBox(5.15, 2.86, 0.24, 0.22, 0.04), M.gunmetal));
    const rim = new THREE.Mesh(makeExtrudedBox(5.22, 2.93, 0.06, 0.24, 0.02), M.brass);
    rim.position.z = -0.06; body.add(rim);

    let lastState = '';
    const screen = createCanvasPanel(4.86, 2.58, 1280, 680, (g, W, H, rowsVis, logVis, isAuth) => {
      g.fillStyle = '#0E151B'; g.beginPath(); g.roundRect(0, 0, W, H, 26); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, 0, W, 86);
      g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 86); g.lineTo(W, 86); g.stroke();
      ['#FF5F56', '#FFBD2E', '#27C93F'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(46 + i * 32, 43, 10, 0, Math.PI * 2); g.fill(); });
      g.font = '800 28px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFE499';
      g.fillText(cfg.windowTitle || 'CLAUDE CODE · ~/Video_Project_01', 175, 53);

      g.fillStyle = isAuth ? 'rgba(0, 212, 170, 0.2)' : 'rgba(255, 149, 0, 0.16)';
      g.strokeStyle = isAuth ? '#00D4AA' : '#FF9500'; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(W - 236, 20, 200, 46, 23); g.fill(); g.stroke();
      g.font = '800 22px "JetBrains Mono", Consolas, monospace'; g.fillStyle = isAuth ? '#66F5D8' : '#FFD066'; g.textAlign = 'center';
      g.fillText(isAuth ? (cfg.statusOn || 'AUTHORIZED ✓') : (cfg.statusOff || 'CONNECTED'), W - 136, 51); g.textAlign = 'left';

      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 88, 390, H - 88);
      g.font = '800 26px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFD066';
      g.fillText(cfg.treeRoot || '▾ Video_Project_01/', 34, 146);
      (cfg.rows || []).forEach((d, idx) => {
        if (idx >= rowsVis) return;
        const y = 186 + idx * 96;
        g.fillStyle = 'rgba(255,255,255,0.055)'; g.beginPath(); g.roundRect(34, y, 320, 72, 16); g.fill();
        g.fillStyle = d.c; g.beginPath(); g.roundRect(34, y, 8, 72, 4); g.fill();
        g.font = '800 28px "Noto Sans SC", sans-serif'; g.fillStyle = '#F2F6FA'; g.fillText(d.name, 62, y + 46);
      });

      g.font = '800 42px "JetBrains Mono", Consolas, monospace';
      g.fillStyle = '#00D4AA'; g.fillText('$', 440, 204);
      g.fillStyle = '#FFFFFF'; g.fillText(cfg.cmd || 'claude .', 488, 204);
      if (logVis) {
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.roundRect(440, 248, 790, 98, 18); g.fill();
        g.fillStyle = '#FF9500'; g.fillRect(440, 248, 8, 98);
        g.font = '700 28px "Noto Sans SC", sans-serif'; g.fillStyle = '#C8D8E4';
        g.fillText(cfg.log || '已挂载项目根目录，自动索引 4 个标准子目录', 474, 308);
      }
      g.fillStyle = isAuth ? 'rgba(0, 212, 170, 0.14)' : 'rgba(255,255,255,0.05)';
      g.strokeStyle = isAuth ? '#00D4AA' : 'rgba(255,255,255,0.18)'; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(440, 396, 790, 148, 22); g.fill(); g.stroke();
      g.font = '900 32px "Noto Sans SC", sans-serif'; g.fillStyle = '#FFFFFF';
      g.fillText(cfg.switchTitle || '✦ 授予本地读写与工具执行权限', 474, 464);
      g.font = '700 22px "JetBrains Mono", Consolas, monospace'; g.fillStyle = isAuth ? '#66F5D8' : '#8FA4B4';
      g.fillText(isAuth ? 'POWER BUS: ONLINE · FULL ACCESS' : 'SWITCH TO ACTIVATE LOCAL BUS →', 474, 510);
    });
    screen.mesh.position.set(0, 0, 0.165); body.add(screen.mesh); screen.update(0, false, false);

    const sw = new THREE.Group(); sw.position.set(1.88, -0.58, 0.22); body.add(sw);
    sw.add(new THREE.Mesh(makeExtrudedBox(0.76, 0.42, 0.12, 0.21, 0.02), M.slateDark));
    const lever = new THREE.Group(); lever.position.set(-0.18, 0, 0.08); sw.add(lever);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.14, 28), M.brass);
    knob.rotation.x = Math.PI / 2; lever.add(knob);
    const lampMat = M.amberGlow.clone();
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 20), lampMat);
    lamp.position.set(0.26, 0, 0.08); sw.add(lamp);

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.exitT + 0.58;
        root.visible = show;
        if (!show) return;
        const inP = easeOutBack(clamp01((t - (cfg.enterT + 0.04)) / 0.48));
        const vEase = Math.pow(clamp01((t - (cfg.exitT + 0.04)) / 0.52), 3);
        const rowsVis = (cfg.rows || []).filter((_, i) => t >= cfg.enterT + 0.18 + i * 0.07).length;
        const logVis = t >= cfg.enterT + 0.32;
        const authP = clamp01((t - cfg.switchT) / 0.26);
        const isAuth = authP > 0.5;
        const key = `${rowsVis}-${logVis}-${isAuth}`;
        if (key !== lastState) { lastState = key; screen.update(rowsVis, logVis, isAuth); }
        lever.position.x = -0.18 + easeOutBack(authP) * 0.24;
        lampMat.color.setHex(isAuth ? 0x00D4AA : 0xFF9500);
        lampMat.emissive.setHex(isAuth ? 0x00D4AA : 0xFF9500);
        lampMat.emissiveIntensity = isAuth ? 1.2 : 0.35;
        body.scale.setScalar(Math.max(0.001, inP * (1 - vEase)));
        body.position.set(0, Math.sin(t * 1.6) * 0.04 - vEase * 0.8, 0);
        body.rotation.set(0.06, -0.12 + Math.sin(t * 1.1) * 0.06, vEase * Math.PI * 2.4);
      }
    };
  };

  /** 3. 3D 多核能力展台 */
  Modules3D.createCapabilityBays = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(0, cfg.posY ?? -0.42, 0);
    root.visible = false;
    studio.scene.add(root);

    const railBg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 5.4, 16), M.slateDark);
    railBg.rotation.z = Math.PI / 2; railBg.position.set(0, 0, -0.24); root.add(railBg);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 5.4, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x00D4AA, emissive: 0x00C49A, emissiveIntensity: 1.0, roughness: 0.2 }));
    beam.rotation.z = Math.PI / 2; beam.position.set(0, 0, -0.24); beam.scale.set(1, 0.001, 1); root.add(beam);

    const bays = (cfg.bays || []).map((spec) => {
      const g = new THREE.Group(); g.position.set(spec.x, 0, 0); root.add(g);
      g.add(studio.makeShadow(3.1, 1.4, 0, -1.62, 0));
      g.add(new THREE.Mesh(makeExtrudedBox(2.38, 2.52, 0.28, 0.24, 0.04), M.gunmetal));
      const dome = new THREE.Mesh(makeExtrudedBox(2.06, 0.64, 0.22, 0.14, 0.02), M.acrylicTint);
      dome.position.set(0, 0.50, 0.18); g.add(dome);
      const glowMat = new THREE.MeshPhysicalMaterial({ color: spec.hex, emissive: spec.hex, emissiveIntensity: 0.2, roughness: 0.22, metalness: 0.1, clearcoat: 0.8 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.14, 0.10), glowMat);
      bar.position.set(0, 0.34, 0.18); bar.scale.x = 0.01; g.add(bar);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), glowMat);
      led.position.set(0.86, 1.00, 0.18); g.add(led);
      const panel = createCanvasPanel(2.14, 2.24, 640, 680, (ctx) => {
        ctx.font = '800 24px "JetBrains Mono", Consolas, monospace'; ctx.fillStyle = spec.color; ctx.fillText(spec.idx, 24, 46);
        ctx.font = '700 26px "JetBrains Mono", Consolas, monospace'; ctx.fillStyle = '#D4E4F0'; ctx.fillText(spec.cmd, 40, 198);
        ctx.font = '900 54px "Noto Sans SC", sans-serif'; ctx.fillStyle = '#FFFFFF'; ctx.fillText(spec.title, 24, 434);
        ctx.font = '700 30px "Noto Sans SC", sans-serif'; ctx.fillStyle = '#B0C2D0';
        ctx.fillText(spec.l1, 24, 502); ctx.fillText(spec.l2, 24, 548);
      });
      panel.mesh.position.set(0, 0, 0.19); panel.update(); g.add(panel.mesh);
      return { g, bar, glowMat, spec };
    });

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.popT + 0.14;
        root.visible = show;
        if (!show) return;
        const inP = easeOutBack(clamp01((t - (cfg.enterT + 0.06)) / 0.48));
        const shakeP = t >= cfg.shakeT && t < cfg.popT;
        const shakeX = shakeP ? Math.sin((t - cfg.shakeT) * 95) * 0.14 : 0;
        const shakeZ = shakeP ? Math.cos((t - cfg.shakeT) * 85) * 0.06 : 0;
        const popP = clamp01((t - cfg.popT) / 0.12);
        const b1 = cfg.bays[1]?.hitT ?? 999, b2 = cfg.bays[2]?.hitT ?? 999;
        beam.scale.set(1, Math.max(0.001, clamp01((t - (b1 - 0.14)) / 0.38) * 0.5 + clamp01((t - (b2 - 0.14)) / 0.38) * 0.5), 1);
        bays.forEach(({ g, bar, glowMat, spec }, idx) => {
          const hitP = clamp01((t - spec.hitT) / 0.45);
          const barP = easeOutCubic(clamp01((t - (spec.hitT + 0.08)) / 0.55));
          g.position.set(spec.x + shakeX, (1 - inP) * -1.4 + Math.sin(t * 1.8 + idx) * 0.045 + recoilAt(t, spec.hitT) * -0.8, 0);
          g.rotation.set(0.05, Math.sin(t * 0.9 + idx * 0.7) * 0.07, shakeZ);
          g.scale.setScalar(Math.max(0.001, inP * (1 + popP * 0.35) * (1 - popP)));
          bar.scale.x = Math.max(0.01, barP); bar.position.x = -0.88 * (1 - barP);
          glowMat.emissiveIntensity = 0.18 + hitP * 1.1;
        });
      }
    };
  };

  /** 4. 3D 双边夹紧护栏 + 中央圆形金属锁芯 */
  Modules3D.createDualClamp = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -1.58, cfg.posY ?? -0.10, 0);
    root.visible = false;
    studio.scene.add(root);
    root.add(studio.makeShadow(6.8, 2.0, 0, -1.48, 0));

    function buildJaw(j, edgeX) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(makeExtrudedBox(2.38, 1.88, 0.26, 0.20, 0.036), M.gunmetal));
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.62, 0.34), new THREE.MeshPhysicalMaterial({
        color: j.hex, emissive: j.hex, emissiveIntensity: 0.45, roughness: 0.2, clearcoat: 0.8
      }));
      edge.position.set(edgeX, 0, 0.02); g.add(edge);
      const panel = createCanvasPanel(2.14, 1.66, 680, 520, (ctx) => {
        ctx.font = '800 24px "JetBrains Mono", Consolas, monospace'; ctx.fillStyle = j.color; ctx.fillText(j.kicker, 30, 74);
        ctx.font = '900 58px "Noto Sans SC", sans-serif'; ctx.fillStyle = '#FFFFFF'; ctx.fillText(j.title, 30, 168);
        ctx.font = '700 32px "Noto Sans SC", sans-serif'; ctx.fillStyle = '#B8C8D8';
        ctx.fillText(j.line1, 30, 260); ctx.fillText(j.line2, 30, 314);
      });
      panel.mesh.position.set(0, 0, 0.175); panel.update(); g.add(panel.mesh);
      return g;
    }

    const leftJaw = buildJaw(cfg.left, 1.18);
    const rightJaw = buildJaw(cfg.right, -1.18);
    root.add(leftJaw); root.add(rightJaw);

    const lockCore = new THREE.Group(); root.add(lockCore);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.22, 40), M.slateDark);
    disc.rotation.x = Math.PI / 2; lockCore.add(disc);
    const ringMat = M.brass.clone();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.048, 20, 48), ringMat);
    ring.position.z = 0.04; lockCore.add(ring);
    const lockText = createCanvasPanel(0.76, 0.76, 256, 256, (ctx, W, H, unlocked) => {
      ctx.font = '900 54px "JetBrains Mono", Consolas, monospace';
      ctx.fillStyle = unlocked ? '#00E5C3' : '#FFE499';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cfg.lockLabel || 'LOCK', W / 2, H / 2);
    });
    lockText.mesh.position.z = 0.14; lockText.update(false); lockCore.add(lockText.mesh);
    let lastReady = false;

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.crtT + 0.36;
        root.visible = show;
        if (!show) return;
        const crtP1 = clamp01((t - cfg.crtT) / 0.17), crtP2 = clamp01((t - (cfg.crtT + 0.19)) / 0.15);
        root.scale.set(Math.max(0.001, (1 + crtP1 * 0.08) * (1 - crtP2)), Math.max(0.001, 1 - crtP1 * 0.98), 1);

        const lIn = easeOutBack(clamp01((t - cfg.leftT) / 0.45));
        const rIn = easeOutBack(clamp01((t - cfg.rightT) / 0.45));
        const lockIn = easeOutBack(clamp01((t - (cfg.rightT + 0.22)) / 0.36));
        const pulse = recoilAt(t, cfg.pulseT);
        const ready = t >= cfg.pulseT;
        if (ready !== lastReady) { lastReady = ready; lockText.update(ready); ringMat.color.setHex(ready ? 0x00D4AA : 0xF0C264); }

        leftJaw.position.set(-2.9 + lIn * 1.25, Math.sin(t * 1.5) * 0.03, 0); leftJaw.rotation.y = 0.14 - lIn * 0.06; leftJaw.visible = t >= cfg.leftT - 0.05;
        rightJaw.position.set(2.9 - rIn * 1.25, Math.sin(t * 1.5 + 1.2) * 0.03, 0); rightJaw.rotation.y = -0.14 + rIn * 0.06; rightJaw.visible = t >= cfg.rightT - 0.05;
        lockCore.visible = t >= cfg.rightT + 0.20;
        lockCore.scale.setScalar(Math.max(0.001, lockIn + Math.abs(pulse) * 1.2));
        lockCore.rotation.z = (1 - lockIn) * -1.4 + (ready ? Math.sin(t * 2) * 0.06 : 0);
      }
    };
  };

  /** 5. 3D 镀金金手指卡带 + 实体金属卡槽主机 */
  Modules3D.createCartridgeDock = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -2.38, cfg.posY ?? -0.78, 0);
    root.visible = false;
    studio.scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const shadow = studio.makeShadow(4.6, 1.8, 0, -1.28, 0); root.add(shadow);

    const base = new THREE.Mesh(makeExtrudedBox(3.12, 1.38, 0.72, 0.22, 0.04), M.gunmetal);
    base.position.set(0, -0.45, 0); body.add(base);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.045, 0.76), M.brass);
    trim.position.set(0, 0.24, 0.01); body.add(trim);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 0.28), M.slateDark);
    slot.position.set(0, 0.27, 0); body.add(slot);

    let lastLocked = false;
    const frontPanel = createCanvasPanel(2.76, 1.04, 800, 300, (ctx, W, H, locked) => {
      ctx.font = '800 32px "JetBrains Mono", Consolas, monospace';
      ctx.fillStyle = locked ? '#00E5C3' : '#94A8B8';
      ctx.fillText(locked ? 'LOCKED · BUS ONLINE ✓' : 'WAITING CARTRIDGE...', 24, 110);
      ctx.font = '700 24px "JetBrains Mono", Consolas, monospace';
      ctx.fillStyle = 'rgba(200, 218, 232, 0.65)';
      ctx.fillText(cfg.busLabel || 'CLAUDE CODE · LOCAL MEMORY BUS', 24, 240);
    });
    frontPanel.mesh.position.set(0, -0.46, 0.405); frontPanel.update(false); body.add(frontPanel.mesh);

    const leds = [0, 1, 2, 3].map((i) => {
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x334155, emissive: 0x00D4AA, emissiveIntensity: 0, roughness: 0.2 });
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 20), mat);
      m.position.set(0.62 + i * 0.21, -0.40, 0.41); body.add(m);
      return mat;
    });

    const latchL = new THREE.Group(); latchL.position.set(-1.32, 0.24, 0.02); body.add(latchL);
    const arm = new THREE.Mesh(makeExtrudedBox(0.16, 0.64, 0.24, 0.06, 0.016), M.silverAlu);
    arm.position.y = 0.26; latchL.add(arm);
    const latchR = new THREE.Group(); latchR.position.set(1.32, 0.24, 0.02); body.add(latchR);
    latchR.add(arm.clone());

    const cart = new THREE.Group(); body.add(cart);
    cart.add(new THREE.Mesh(makeExtrudedBox(2.36, 1.46, 0.18, 0.16, 0.028), M.slateDark));
    const cRim = new THREE.Mesh(makeExtrudedBox(2.42, 1.52, 0.05, 0.18, 0.016), M.brass);
    cRim.position.z = -0.02; cart.add(cRim);
    for (let i = 0; i < 6; i++) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.20), M.brass);
      pin.position.set(-0.85 + i * 0.34, -0.62, 0.01); cart.add(pin);
    }
    const cFace = createCanvasPanel(2.18, 1.12, 680, 350, (ctx) => {
      ctx.font = '900 58px "JetBrains Mono", Consolas, monospace'; ctx.fillStyle = '#FFE499'; ctx.fillText(cfg.cartName || 'CLAUDE.md', 26, 98);
      ctx.fillStyle = 'rgba(255, 149, 0, 0.22)'; ctx.strokeStyle = '#FF9500'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(450, 44, 198, 56, 14); ctx.fill(); ctx.stroke();
      ctx.font = '800 24px "JetBrains Mono", Consolas, monospace'; ctx.fillStyle = '#FFD066'; ctx.textAlign = 'center';
      ctx.fillText(cfg.cartBadge || 'RULE CHIP', 549, 80); ctx.textAlign = 'left';
      ctx.font = '700 34px "Noto Sans SC", sans-serif'; ctx.fillStyle = '#D8E4EE';
      ctx.fillText(cfg.cartSub || '目录约定 · 视觉宪法 · 抽帧验货', 26, 192);
    });
    cFace.mesh.position.set(0, 0.06, 0.125); cFace.update(); cart.add(cFace.mesh);

    return {
      update(t) {
        const show = t >= cfg.dockT + 0.12 && t < cfg.dropT + 0.54;
        root.visible = show;
        if (!show) return;
        const inP = easeOutBack(clamp01((t - (cfg.dockT + 0.18)) / 0.48));
        const drop1 = clamp01((t - cfg.dropT) / 0.18), drop2 = clamp01((t - (cfg.dropT + 0.18)) / 0.34);
        const cartIn = easeOutBack(clamp01((t - (cfg.dockT + 0.35)) / 0.42));
        const cartInsert = easeInOutCubic(clamp01((t - (cfg.dockT + 0.95)) / 0.30));
        body.position.set(0, (1 - inP) * -2.2 + recoilAt(t, cfg.hitT) * 1.1 - drop1 * 0.22 - drop2 * drop2 * 6.8, 0);
        body.rotation.set(0.10, 0.22 + Math.sin(t * 1.0) * 0.05, drop1 * 0.38 + drop2 * 0.55);
        shadow.material.opacity = Math.max(0, 1 - drop1);
        cart.visible = t >= cfg.dockT + 0.34;
        cart.position.set(0, 1.85 - cartIn * 0.45 - cartInsert * 0.92, 0.01);
        const latchP = easeOutBack(clamp01((t - (cfg.hitT + 0.04)) / 0.22));
        latchL.rotation.z = 0.48 - latchP * 0.64; latchR.rotation.z = -0.48 + latchP * 0.64;
        const locked = t >= cfg.hitT + 0.10;
        if (locked !== lastLocked) { lastLocked = locked; frontPanel.update(locked); }
        leds.forEach((mat, i) => {
          const on = t >= cfg.hitT + 0.14 + i * 0.08;
          mat.color.setHex(on ? 0x00E5C3 : 0x334155); mat.emissiveIntensity = on ? 1.15 : 0;
        });
      }
    };
  };

  /** 6. 3D 涡轮核心处理器 */
  Modules3D.createPipelineMachine = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -1.32, cfg.posY ?? -0.34, 0);
    root.visible = false;
    studio.scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const shadow = studio.makeShadow(3.4, 1.5, 0, -1.62, 0); root.add(shadow);

    body.add(new THREE.Mesh(makeExtrudedBox(1.96, 2.28, 0.72, 0.28, 0.045), M.gunmetal));
    const rim = new THREE.Mesh(makeExtrudedBox(2.02, 2.34, 0.08, 0.30, 0.02), M.brass);
    rim.position.z = 0.24; body.add(rim);

    const rotor = new THREE.Group(); rotor.position.set(0, 0.28, 0.44); body.add(rotor);
    rotor.add(new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 20, 48), M.brass));
    rotor.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 16, 36), M.jadeGlow));
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.045, 0.04), M.brass);
      spoke.rotation.z = (i * Math.PI) / 4; rotor.add(spoke);
    }

    const total = (cfg.eatTimes || []).length || 3;
    let lastCount = -1;
    const label = createCanvasPanel(1.68, 0.86, 512, 260, (ctx, W, H, count) => {
      ctx.font = '800 32px "JetBrains Mono", Consolas, monospace'; ctx.fillStyle = '#FFE499'; ctx.textAlign = 'center';
      ctx.fillText(cfg.label || 'AI COMPILER', W / 2, 74);
      ctx.fillStyle = 'rgba(255, 149, 0, 0.22)'; ctx.strokeStyle = '#FF9500'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(148, 118, 216, 86, 43); ctx.fill(); ctx.stroke();
      ctx.font = '900 44px "JetBrains Mono", Consolas, monospace'; ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${count} / ${total}`, W / 2, 176);
    });
    label.mesh.position.set(0, -0.58, 0.42); label.update(0); body.add(label.mesh);

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.exitT + 0.45;
        root.visible = show;
        if (!show) return;
        const inP = easeOutBack(clamp01((t - (cfg.enterT + 0.04)) / 0.50));
        const shiftP = easeInOutCubic(clamp01((t - (cfg.ejectT - 0.18)) / 0.42));
        const exitP = clamp01((t - cfg.exitT) / 0.42);
        const eatTimes = cfg.eatTimes || [44.35, 45.05, 45.75];
        const cnt = eatTimes.filter(et => t >= et).length;
        if (cnt !== lastCount) { lastCount = cnt; label.update(cnt); }
        let pulse = 0;
        eatTimes.forEach(et => { pulse += Math.abs(recoilAt(t, et)); });
        body.position.set(-shiftP * 2.25 - exitP * exitP * 3.8, (1 - inP) * -1.8 + Math.sin(t * 1.6) * 0.04, 0);
        body.rotation.set(0.08, 0.24 - shiftP * 0.12 + Math.sin(t * 1.1) * 0.05, 0);
        body.scale.setScalar(Math.max(0.001, (inP + pulse * 0.6) * (1 - exitP)));
        rotor.rotation.z = -(t - cfg.enterT) * (t >= cfg.ejectT ? 5.2 : 1.8);
        shadow.position.x = body.position.x;
        shadow.material.opacity = Math.max(0, 1 - exitP);
      }
    };
  };

  /** 7. 3D 三连高能钩子监视器（支持实时动态画面 / 逐字变色 / 波形去停顿 3 种动画模式） */
  Modules3D.createHookShowcaseStage = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -1.62, cfg.posY ?? -0.44, 0);
    studio.scene.add(root);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 0.16), M.gunmetal);
    rail.position.set(0, -1.52, -0.14);
    root.add(rail);
    const railTrim = new THREE.Mesh(new THREE.BoxGeometry(5.64, 0.028, 0.18), M.brass);
    railTrim.position.set(0, -1.47, -0.14);
    root.add(railTrim);
    const shadow = studio.makeShadow(6.8, 2.0, 0, -1.82, 0);
    root.add(shadow);

    const items = cfg.items || [];
    const cards = items.map((spec, idx) => {
      const cardState = { lastBucket: -1 };
      // 预加载可选的真实图片素材（用于 gallery-reel 交错画面墙 与 timeline-trim 真实口播轨道）
      const loadedImgs = [];
      if (Array.isArray(spec.images)) {
        spec.images.forEach((src) => {
          const im = new Image();
          im.onload = () => { cardState.lastBucket = -1; };
          im.src = src;
          loadedImgs.push(im);
        });
      }
      const loadedClips = {};
      if (spec.clips && typeof spec.clips === 'object') {
        Object.keys(spec.clips).forEach((k) => {
          const im = new Image();
          im.onload = () => { cardState.lastBucket = -1; };
          im.src = spec.clips[k];
          loadedClips[k] = im;
        });
      }

      const grp = new THREE.Group();
      const baseX = spec.x ?? (-1.92 + idx * 1.92);
      grp.position.set(baseX, 0, 0);
      root.add(grp);

      grp.add(new THREE.Mesh(makeExtrudedBox(1.74, 2.46, 0.20, 0.16, 0.032), M.gunmetal));
      const brassRim = new THREE.Mesh(makeExtrudedBox(1.80, 2.52, 0.06, 0.18, 0.018), M.brass);
      brassRim.position.z = -0.05;
      grp.add(brassRim);

      const ledMat = new THREE.MeshPhysicalMaterial({
        color: spec.hex || 0x00D4AA, emissive: spec.hex || 0x00D4AA,
        emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.1
      });
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.055, 0.06), ledMat);
      led.position.set(0, 1.15, 0.11);
      grp.add(led);

      const panel = createCanvasPanel(1.56, 2.22, 468, 666, (g, W, H, lit, animT) => {
        g.fillStyle = '#0D141A';
        g.beginPath(); g.roundRect(0, 0, W, H, 22); g.fill();
        g.strokeStyle = lit ? spec.color : 'rgba(255,255,255,0.12)';
        g.lineWidth = lit ? 5 : 2;
        g.stroke();

        // 顶部编号与状态点
        g.fillStyle = lit ? spec.color : 'rgba(255,255,255,0.32)';
        g.beginPath(); g.arc(40, 48, 8, 0, Math.PI * 2); g.fill();
        g.font = '800 22px "JetBrains Mono", Consolas, monospace';
        g.fillStyle = lit ? '#FFE499' : 'rgba(255,255,255,0.42)';
        g.fillText(spec.tag || `0${idx + 1}`, 62, 56);

        // 中央动态可视化画布区 (y: 92..382)
        g.fillStyle = 'rgba(255,255,255,0.04)';
        g.beginPath(); g.roundRect(28, 92, W - 56, 290, 18); g.fill();

        const mode = spec.mode || 'motion';
        if (mode === 'gallery-reel') {
          // 真实 3D 精彩成片双列交错滚动照片墙
          g.save();
          g.beginPath(); g.roundRect(28, 92, W - 56, 290, 18); g.clip();
          const colW = 192, cardH = 110, gap = 14, step = cardH + gap;
          const totalH = step * 3;
          const speed = 135;
          for (let col = 0; col < 2; col++) {
            const x = 36 + col * (colW + 12);
            const dir = col === 0 ? -1 : 1;
            const offset = ((animT * speed * dir) % totalH + totalH) % totalH;
            for (let k = -1; k <= 3; k++) {
              const imgIdx = ((k + col * 3) % loadedImgs.length + loadedImgs.length) % loadedImgs.length;
              const y = 98 + k * step + offset - (dir > 0 ? totalH : 0);
              if (y > 390 || y + cardH < 84) continue;
              const im = loadedImgs[imgIdx];
              g.save();
              g.beginPath(); g.roundRect(x, y, colW, cardH, 10); g.clip();
              if (im && im.complete && im.naturalWidth > 0) {
                g.drawImage(im, x, y, colW, cardH);
              } else {
                g.fillStyle = '#1E2C38'; g.fillRect(x, y, colW, cardH);
              }
              g.restore();
              g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 2;
              g.beginPath(); g.roundRect(x, y, colW, cardH, 10); g.stroke();
            }
          }
          // 上下渐隐压暗遮罩 + 底部标签胶囊
          const fadeTop = g.createLinearGradient(0, 92, 0, 134);
          fadeTop.addColorStop(0, 'rgba(13,20,26,0.78)'); fadeTop.addColorStop(1, 'rgba(13,20,26,0)');
          g.fillStyle = fadeTop; g.fillRect(28, 92, W - 56, 42);
          const fadeBot = g.createLinearGradient(0, 326, 0, 382);
          fadeBot.addColorStop(0, 'rgba(13,20,26,0)'); fadeBot.addColorStop(1, 'rgba(13,20,26,0.92)');
          g.fillStyle = fadeBot; g.fillRect(28, 326, W - 56, 56);
          g.font = '800 19px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#66F5D8';
          g.fillText('LIVE 3D REEL · 6 SCENES', 44, 366);
          g.restore();
        } else if (mode === 'timeline-trim') {
          // 真实口播视频帧 + 双轨时间轴自动剪除静音停顿动画
          g.save();
          g.beginPath(); g.roundRect(28, 92, W - 56, 290, 18); g.clip();
          const cutP = clamp01((animT - 0.55) / 0.42);   // 静音段掉落进度
          const snapP = easeInOutCubic(clamp01((animT - 0.95) / 0.45)); // 右侧磁吸拼合进度
          const merged = snapP > 0.85;

          // 顶部时间轴标尺
          g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(28, 92, W - 56, 36);
          g.font = '700 16px "JetBrains Mono", Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,0.48)';
          ['00:01', '00:02', '00:03', '00:04'].forEach((ts, ti) => g.fillText(ts, 44 + ti * 102, 116));

          // 上轨：视频帧轨 (y: 142..232) | 下轨：声波轨 (y: 248..330)
          const leftW = 122, midW = 128, rightW = 136;
          const xL = 38;
          const xM = xL + leftW + 4;
          const xR = xM + midW + 4 - snapP * (midW + 4);

          const drawClip = (img, x, y, w, h, borderCol, labelTxt) => {
            g.save();
            g.beginPath(); g.roundRect(x, y, w, h, 8); g.clip();
            if (img && img.complete && img.naturalWidth > 0) {
              g.drawImage(img, x, y, w, h);
            } else {
              g.fillStyle = '#20303D'; g.fillRect(x, y, w, h);
            }
            g.restore();
            g.strokeStyle = borderCol; g.lineWidth = 3;
            g.beginPath(); g.roundRect(x, y, w, h, 8); g.stroke();
            if (labelTxt) {
              g.fillStyle = 'rgba(10,16,22,0.78)'; g.fillRect(x + 4, y + h - 24, w - 8, 20);
              g.font = '800 14px "Noto Sans SC", sans-serif'; g.fillStyle = '#FFFFFF';
              g.fillText(labelTxt, x + 10, y + h - 9);
            }
          };

          // 左段真实口播帧 + 活跃声波
          drawClip(loadedClips.talk1, xL, 142, leftW, 88, '#38BDF8', '口播片段 A');
          g.fillStyle = 'rgba(56, 189, 248, 0.14)'; g.beginPath(); g.roundRect(xL, 244, leftW, 74, 8); g.fill();
          [32, 54, 42, 60, 48, 36, 52].forEach((bh, bi) => {
            g.fillStyle = '#38BDF8'; g.beginPath(); g.roundRect(xL + 10 + bi * 15, 281 - bh / 2, 8, bh, 4); g.fill();
          });

          // 中间段：真实闭嘴停顿帧 + 静音红区（掉落消失）
          if (cutP < 0.98) {
            g.save();
            g.globalAlpha = 1 - cutP;
            g.translate(xM + midW / 2, 186 + cutP * 140);
            g.rotate(cutP * 0.28);
            drawClip(loadedClips.pause, -midW / 2, -44, midW, 88, '#FF2D55', '空白停顿 1.4s');
            // 红色警示覆盖与平直静音线
            g.fillStyle = 'rgba(255, 45, 85, 0.28)'; g.fillRect(-midW / 2, -44, midW, 88);
            g.fillStyle = 'rgba(255, 45, 85, 0.16)'; g.beginPath(); g.roundRect(-midW / 2, 58, midW, 74, 8); g.fill();
            g.strokeStyle = '#FF2D55'; g.lineWidth = 4; g.beginPath(); g.moveTo(-midW / 2 + 10, 95); g.lineTo(midW / 2 - 10, 95); g.stroke();
            g.restore();
          }

          // 右段真实口播帧 + 活跃声波（向左磁吸拼合）
          drawClip(loadedClips.talk3, xR, 142, rightW, 88, merged ? '#00E5C3' : '#38BDF8', '口播片段 B');
          g.fillStyle = merged ? 'rgba(0, 229, 195, 0.16)' : 'rgba(56, 189, 248, 0.14)';
          g.beginPath(); g.roundRect(xR, 244, rightW, 74, 8); g.fill();
          [44, 58, 36, 54, 62, 40, 48, 30].forEach((bh, bi) => {
            g.fillStyle = merged ? '#00E5C3' : '#38BDF8';
            g.beginPath(); g.roundRect(xR + 10 + bi * 15, 281 - bh / 2, 8, bh, 4); g.fill();
          });

          // 红色剪切刀线（阶段 1）或 翡翠绿无缝拼合光束（阶段 3）
          if (cutP < 0.4) {
            g.strokeStyle = '#FF2D55'; g.lineWidth = 4; g.setLineDash([7, 5]);
            g.beginPath(); g.moveTo(xM, 132); g.lineTo(xM, 330); g.moveTo(xM + midW, 132); g.lineTo(xM + midW, 330); g.stroke();
            g.setLineDash([]);
          } else if (merged) {
            g.strokeStyle = '#00E5C3'; g.lineWidth = 5;
            g.shadowColor = '#00E5C3'; g.shadowBlur = 16;
            g.beginPath(); g.moveTo(xL + leftW + 2, 136); g.lineTo(xL + leftW + 2, 326); g.stroke();
            g.shadowBlur = 0;
          }

          // 底部中文状态反馈条
          g.fillStyle = merged ? '#00C49A' : '#FF2D55';
          g.beginPath(); g.roundRect(44, 334, W - 88, 36, 10); g.fill();
          g.font = '900 20px "Noto Sans SC", sans-serif'; g.fillStyle = merged ? '#0A1218' : '#FFFFFF'; g.textAlign = 'center';
          g.fillText(merged ? '静音停顿已自动剪除 · 无缝拼接 ✓' : '✂ 自动识别并裁切多余静音...', W / 2, 359);
          g.textAlign = 'left';
          g.restore();
        } else if (mode === 'motion') {
          // 实时 3D 轨迹波与 60FPS 物理曲线
          g.save();
          g.beginPath(); g.roundRect(28, 92, W - 56, 290, 18); g.clip();
          g.strokeStyle = 'rgba(0, 212, 170, 0.18)'; g.lineWidth = 2;
          for (let gx = 60; gx < W - 40; gx += 48) { g.beginPath(); g.moveTo(gx, 92); g.lineTo(gx, 382); g.stroke(); }
          for (let gy = 132; gy < 382; gy += 48) { g.beginPath(); g.moveTo(28, gy); g.lineTo(W - 28, gy); g.stroke(); }
          g.strokeStyle = '#00E5C3'; g.lineWidth = 5;
          g.beginPath();
          for (let x = 44; x <= W - 44; x += 8) {
            const p = (x - 44) / (W - 88);
            const y = 236 + Math.sin(p * Math.PI * 3 - animT * 4.5) * 68 * Math.sin(p * Math.PI);
            if (x === 44) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.stroke();
          // 运动节点方块
          const bx = 96 + ((animT * 110) % (W - 192));
          const bp = (bx - 44) / (W - 88);
          const by = 236 + Math.sin(bp * Math.PI * 3 - animT * 4.5) * 68 * Math.sin(bp * Math.PI);
          g.fillStyle = '#FFE499';
          g.beginPath(); g.arc(bx, by, 14, 0, Math.PI * 2); g.fill();
          g.font = '800 20px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#66F5D8';
          g.fillText('THREE.JS · 60FPS', 48, 356);
          g.restore();
        } else if (mode === 'subtitle') {
          // 逐字变色卡字条演示
          const chars = ['逐', '字', '变', '色', '同', '步', '字', '幕'];
          const activeIdx = Math.floor((animT * 5.2) % (chars.length + 1));
          chars.forEach((ch, ci) => {
            const col = ci % 4, row = Math.floor(ci / 4);
            const cx = 48 + col * 94, cy = 148 + row * 94;
            const passed = ci <= activeIdx;
            const cur = ci === activeIdx;
            g.fillStyle = cur ? '#FF9500' : (passed ? 'rgba(255, 208, 102, 0.24)' : 'rgba(255,255,255,0.08)');
            g.beginPath(); g.roundRect(cx, cy, 80, 72, 14); g.fill();
            g.font = '900 36px "Noto Sans SC", sans-serif';
            g.fillStyle = cur ? '#0D141A' : (passed ? '#FFD066' : 'rgba(255,255,255,0.46)');
            g.textAlign = 'center';
            g.fillText(ch, cx + 40, cy + 49);
          });
          g.textAlign = 'left';
          g.font = '800 20px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFD066';
          g.fillText('WORD-LEVEL SYNC', 48, 356);
        } else if (mode === 'silence') {
          // 声波波形 + 红色剪除停顿空白段
          const cutP = clamp01((animT - 0.35) / 0.85);
          const bars = [48, 92, 66, 114, 82, 10, 8, 9, 10, 74, 108, 62, 96, 54];
          bars.forEach((bh, bi) => {
            const isGap = bi >= 5 && bi <= 8;
            const bx = 46 + bi * 27;
            if (isGap) {
              g.fillStyle = `rgba(255, 45, 85, ${(0.22 + 0.25 * Math.sin(animT * 8)).toFixed(2)})`;
              g.fillRect(bx - 3, 146, 22, 168);
            }
            g.fillStyle = isGap ? '#FF2D55' : '#38BDF8';
            g.beginPath(); g.roundRect(bx, 230 - bh / 2, 14, bh, 7); g.fill();
          });
          // 红色剪刀裁切线
          g.strokeStyle = '#FF2D55'; g.lineWidth = 4; g.setLineDash([8, 6]);
          g.beginPath(); g.moveTo(176, 128); g.lineTo(176, 330); g.moveTo(286, 128); g.lineTo(286, 330); g.stroke();
          g.setLineDash([]);
          g.fillStyle = '#FF2D55'; g.beginPath(); g.roundRect(184, 134, 94, 34, 10); g.fill();
          g.font = '900 18px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFFFFF'; g.textAlign = 'center';
          g.fillText(cutP > 0.5 ? 'TRIMMED' : 'SILENCE', 231, 157); g.textAlign = 'left';
          g.font = '800 20px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#7DD3FC';
          g.fillText('AUTO-CUT PAUSES', 48, 356);
        }

        // 底部大标题与副文
        g.font = '900 44px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        g.fillStyle = '#FFFFFF';
        g.fillText(spec.title, 30, 466);
        g.font = '700 24px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        g.fillStyle = lit ? '#E2ECF5' : 'rgba(200,216,228,0.65)';
        g.fillText(spec.sub1 || '', 30, 520);
        g.fillText(spec.sub2 || '', 30, 558);

        g.fillStyle = lit ? spec.color : 'rgba(255,255,255,0.14)';
        g.beginPath(); g.roundRect(30, 594, W - 60, 40, 12); g.fill();
        g.font = '800 20px "JetBrains Mono", Consolas, monospace';
        g.fillStyle = lit ? '#0D141A' : 'rgba(255,255,255,0.5)';
        g.textAlign = 'center';
        g.fillText(lit ? (spec.badge || 'AUTO GENERATED') : 'STANDBY', W / 2, 621);
        g.textAlign = 'left';
      });
      panel.mesh.position.z = 0.14;
      grp.add(panel.mesh);

      const glass = new THREE.Mesh(makeExtrudedBox(1.66, 2.34, 0.025, 0.14, 0.012), M.acrylicTint);
      glass.position.z = 0.16;
      grp.add(glass);

      return { grp, baseX, spec, ledMat, panel, state: cardState };
    });

    return {
      update(t) {
        const show = t >= (cfg.startT ?? 0) && t < cfg.exitT + 0.42;
        root.visible = show;
        if (!show) return;

        const exitP = clamp01((t - cfg.exitT) / 0.36);
        const exitEase = exitP * exitP;
        shadow.material.opacity = Math.max(0, 1 - exitEase);
        rail.scale.x = Math.max(0.001, 1 - exitEase);
        railTrim.scale.x = Math.max(0.001, 1 - exitEase);

        cards.forEach((c, idx) => {
          const dt = t - c.spec.hitT;
          const inP = easeOutBack(clamp01((dt + 0.18) / 0.52));
          const lit = t >= c.spec.hitT;
          // 20fps 确定性刷新画布动画，丝滑且省性能
          const bucket = lit ? Math.floor((t - c.spec.hitT) * 20) : -1;
          if (bucket !== c.state.lastBucket) {
            c.state.lastBucket = bucket;
            c.panel.update(lit, Math.max(0, t - c.spec.hitT));
          }
          c.ledMat.emissiveIntensity = lit ? 1.45 : 0.12;

          const activeBoost = lit && (idx === cards.length - 1 || t < cards[idx + 1].spec.hitT) ? 1.06 : 0.98;
          const flyOutY = exitEase * (idx % 2 === 0 ? 3.2 : -3.2);
          const flyOutX = exitEase * (idx - 1) * 2.8;
          c.grp.position.set(
            c.baseX + flyOutX,
            (1 - inP) * -2.2 + Math.sin(t * 2.0 + idx * 1.4) * 0.045 + flyOutY,
            (lit ? 0.22 : 0) + (activeBoost > 1 ? 0.18 : 0) + exitEase * 2.0
          );
          c.grp.rotation.set(
            0.05 + exitEase * 0.4,
            (idx - 1) * -0.14 + Math.sin(t * 1.1 + idx) * 0.04,
            exitEase * (idx - 1) * 0.35
          );
          c.grp.scale.setScalar(Math.max(0.001, inP * activeBoost * (1 - exitEase * 0.6)));
        });
      }
    };
  };

  /** 8. 3D 中枢神经总控台 + 4 路光纤卫星工具节点 */
  Modules3D.createOrchestratorHub = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -0.25, cfg.posY ?? -0.28, 0);
    root.visible = false;
    studio.scene.add(root);

    const shadow = studio.makeShadow(8.2, 2.2, 0, -1.96, 0);
    root.add(shadow);

    // 中央 Claude Code 3D 主控核心柱
    const core = new THREE.Group();
    root.add(core);
    core.add(new THREE.Mesh(makeExtrudedBox(2.26, 2.48, 0.56, 0.24, 0.045), M.gunmetal));
    const coreRim = new THREE.Mesh(makeExtrudedBox(2.34, 2.56, 0.08, 0.26, 0.02), M.brass);
    coreRim.position.z = 0.14;
    core.add(coreRim);

    // 旋转光环涡轮
    const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 20, 56), M.brass);
    ringOuter.position.set(0, 0.36, 0.38);
    core.add(ringOuter);
    const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.028, 16, 48), M.jadeGlow);
    ringInner.position.set(0, 0.36, 0.39);
    core.add(ringInner);

    const coreFace = createCanvasPanel(2.04, 2.22, 612, 666, (g, W, H, activeCount) => {
      g.fillStyle = '#0D151C'; g.beginPath(); g.roundRect(0, 0, W, H, 28); g.fill();
      g.strokeStyle = 'rgba(240, 194, 100, 0.55)'; g.lineWidth = 4; g.stroke();
      g.font = '800 22px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFE499'; g.textAlign = 'center';
      g.fillText(cfg.coreKicker || 'AI ORCHESTRATOR', W / 2, 64);
      g.font = '900 54px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFFFFF';
      g.fillText(cfg.coreTitle || 'Claude', W / 2, 456);
      g.fillStyle = '#00E5C3';
      g.fillText(cfg.coreTitle2 || 'Code', W / 2, 514);
      g.fillStyle = 'rgba(0, 212, 170, 0.18)'; g.strokeStyle = '#00D4AA'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(106, 556, W - 212, 64, 32); g.fill(); g.stroke();
      g.font = '900 28px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#66F5D8';
      g.fillText(`TOOLS: ${activeCount} / 4`, W / 2, 598);
      g.textAlign = 'left';
    });
    coreFace.mesh.position.z = 0.345;
    core.add(coreFace.mesh);
    coreFace.update(0);
    let lastActiveCount = -1;

    // 4 颗卫星工具节点 + 发光光纤连接臂
    const nodes = (cfg.nodes || []).map((spec) => {
      const grp = new THREE.Group();
      root.add(grp);

      const cableMat = new THREE.MeshPhysicalMaterial({
        color: spec.hex || 0x00D4AA, emissive: spec.hex || 0x00D4AA,
        emissiveIntensity: 0.18, roughness: 0.25, metalness: 0.2
      });
      const dx = spec.x, dy = spec.y;
      const dist = Math.hypot(dx, dy);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, dist, 16), cableMat);
      arm.position.set(dx * 0.5, dy * 0.5, -0.08);
      arm.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
      root.add(arm);

      grp.add(new THREE.Mesh(makeExtrudedBox(2.32, 1.06, 0.22, 0.16, 0.028), M.gunmetal));
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.78, 0.26), cableMat);
      trim.position.set(-1.02, 0, 0.02);
      grp.add(trim);

      const panel = createCanvasPanel(2.12, 0.90, 636, 270, (g, W, H, lit) => {
        g.fillStyle = '#0E161D'; g.beginPath(); g.roundRect(0, 0, W, H, 18); g.fill();
        g.strokeStyle = lit ? spec.color : 'rgba(255,255,255,0.12)'; g.lineWidth = lit ? 4 : 2; g.stroke();
        g.font = '800 24px "JetBrains Mono", Consolas, monospace'; g.fillStyle = lit ? spec.color : 'rgba(255,255,255,0.4)';
        g.fillText(spec.kicker, 42, 64);
        g.font = '900 44px "Noto Sans SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#FFFFFF';
        g.fillText(spec.title, 42, 146);
        g.font = '700 25px "Noto Sans SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#B8CBD8';
        g.fillText(spec.desc, 42, 212);
      });
      panel.mesh.position.z = 0.14;
      panel.update(false);
      grp.add(panel.mesh);

      return { grp, arm, cableMat, panel, spec, wasLit: false };
    });

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.exitT + 0.55;
        root.visible = show;
        if (!show) return;

        const inP = easeOutBack(clamp01((t - cfg.enterT) / 0.56));
        const exitP = clamp01((t - cfg.exitT) / 0.48);
        const suck = 1 - exitP * exitP;

        let activeCnt = 0;
        nodes.forEach(n => { if (t >= n.spec.hitT) activeCnt++; });
        if (activeCnt !== lastActiveCount) { lastActiveCount = activeCnt; coreFace.update(activeCnt); }

        core.scale.setScalar(Math.max(0.001, inP * suck));
        core.position.set(0, (1 - inP) * -1.5 + Math.sin(t * 1.9) * 0.04, 0);
        core.rotation.set(0.06, Math.sin(t * 1.1) * 0.10 + exitP * 2.2, exitP * 0.8);
        ringOuter.rotation.z = t * 1.6;
        ringInner.rotation.z = -t * 2.8;
        shadow.material.opacity = Math.max(0, inP * suck);

        nodes.forEach((n, idx) => {
          const nIn = easeOutBack(clamp01((t - (n.spec.hitT - 0.12)) / 0.45));
          const lit = t >= n.spec.hitT;
          if (lit !== n.wasLit) { n.wasLit = lit; n.panel.update(lit); }
          n.cableMat.emissiveIntensity = lit ? 1.5 : 0.1;

          const angle = exitP * 3.2;
          const rx = n.spec.x * Math.cos(angle) - n.spec.y * Math.sin(angle);
          const ry = n.spec.x * Math.sin(angle) + n.spec.y * Math.cos(angle);
          n.grp.position.set(rx * suck, ry * suck + Math.sin(t * 2.2 + idx * 1.5) * 0.04, (lit ? 0.18 : 0));
          n.grp.scale.setScalar(Math.max(0.001, nIn * suck));
          n.grp.rotation.set(0.04, n.spec.x < 0 ? 0.14 : -0.14, 0);
          n.arm.visible = nIn > 0.08 && suck > 0.08;
          n.arm.scale.set(1, Math.max(0.001, nIn * suck), 1);
        });
      }
    };
  };

  /** 9. 3D 精密导轨四步工程里程碑阵列（片头总览 / 章节导航高复用组件） */
  Modules3D.createRoadmapRail = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -0.25, cfg.posY ?? -0.16, 0);
    root.visible = false;
    studio.scene.add(root);

    const shadow = studio.makeShadow(9.4, 2.0, 0, -1.72, 0);
    root.add(shadow);

    // 底部精密 CNC 导轨与发光进度条
    const railBase = new THREE.Mesh(makeExtrudedBox(8.9, 0.22, 0.34, 0.08, 0.02), M.gunmetal);
    railBase.position.set(0, -1.36, -0.06);
    root.add(railBase);
    const railBrass = new THREE.Mesh(new THREE.BoxGeometry(8.92, 0.04, 0.38), M.brass);
    railBrass.position.set(0, -1.23, -0.06);
    root.add(railBrass);

    const railGlowMat = new THREE.MeshPhysicalMaterial({
      color: 0x00E5C3, emissive: 0x00C49A, emissiveIntensity: 1.4, roughness: 0.2
    });
    const railGlow = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.06, 0.08), railGlowMat);
    railGlow.position.set(-4.2, -1.36, 0.14);
    root.add(railGlow);

    const steps = cfg.steps || [];
    const cards = steps.map((spec, idx) => {
      const grp = new THREE.Group();
      const baseX = spec.x ?? (-3.36 + idx * 2.24);
      grp.position.set(baseX, 0, 0);
      root.add(grp);

      // 底座连接支柱
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 20), M.brass);
      stand.position.set(0, -1.16, -0.04);
      grp.add(stand);

      grp.add(new THREE.Mesh(makeExtrudedBox(1.88, 2.18, 0.22, 0.18, 0.032), M.gunmetal));
      const rim = new THREE.Mesh(makeExtrudedBox(1.94, 2.24, 0.06, 0.20, 0.018), M.brass);
      rim.position.z = -0.05;
      grp.add(rim);

      const ledMat = new THREE.MeshPhysicalMaterial({
        color: spec.hex || 0x00D4AA, emissive: spec.hex || 0x00D4AA,
        emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.1
      });
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.08), ledMat);
      led.position.set(0, 1.02, 0.14);
      grp.add(led);

      const panel = createCanvasPanel(1.70, 1.98, 510, 594, (g, W, H, state) => {
        // state: 0=dim, 1=active, 2=detail, 3=allLit
        g.fillStyle = '#0D151C'; g.beginPath(); g.roundRect(0, 0, W, H, 22); g.fill();
        const lit = state >= 1;
        g.strokeStyle = lit ? spec.color : 'rgba(255,255,255,0.14)';
        g.lineWidth = state === 3 ? 6 : (lit ? 4.5 : 2);
        g.stroke();

        // 顶部巨型序号水印
        g.font = '900 116px "JetBrains Mono", Consolas, monospace';
        g.fillStyle = lit ? `${spec.color}28` : 'rgba(255,255,255,0.06)';
        g.fillText(spec.num, 244, 148);

        // 顶部 STEP 标签
        g.fillStyle = lit ? spec.color : 'rgba(255,255,255,0.22)';
        g.beginPath(); g.roundRect(34, 42, 138, 42, 21); g.fill();
        g.font = '900 22px "JetBrains Mono", Consolas, monospace';
        g.fillStyle = lit ? '#0D151C' : 'rgba(255,255,255,0.6)';
        g.textAlign = 'center';
        g.fillText(`STEP ${spec.num}`, 103, 71);
        g.textAlign = 'left';

        // 主标题
        g.font = '900 54px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        g.fillStyle = '#FFFFFF';
        g.fillText(spec.title, 34, 218);

        // 分割线
        g.fillStyle = lit ? spec.color : 'rgba(255,255,255,0.14)';
        g.fillRect(34, 248, 86, 6);

        // 副标题两行
        g.font = '700 28px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        g.fillStyle = lit ? '#DDE8F2' : 'rgba(180,196,210,0.5)';
        g.fillText(spec.line1 || '', 34, 314);
        g.fillText(spec.line2 || '', 34, 360);

        // 底部具体做法规格胶囊（state >= 2 亮起）
        const showDetail = state >= 2;
        g.fillStyle = showDetail ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        g.strokeStyle = showDetail ? spec.color : 'rgba(255,255,255,0.08)';
        g.lineWidth = 2.5;
        g.beginPath(); g.roundRect(30, 418, W - 60, 136, 18); g.fill(); g.stroke();

        g.font = '800 21px "JetBrains Mono", Consolas, monospace';
        g.fillStyle = showDetail ? '#FFE499' : 'rgba(255,255,255,0.34)';
        g.fillText(spec.methodKicker || 'METHOD', 52, 462);
        g.font = '800 28px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        g.fillStyle = showDetail ? '#FFFFFF' : 'rgba(255,255,255,0.4)';
        g.fillText(spec.method || '', 52, 518);
      });
      panel.mesh.position.z = 0.155;
      panel.update(0);
      grp.add(panel.mesh);

      const glass = new THREE.Mesh(makeExtrudedBox(1.80, 2.08, 0.025, 0.16, 0.012), M.acrylicTint);
      glass.position.z = 0.18;
      grp.add(glass);

      return { grp, baseX, spec, ledMat, panel, lastState: -1 };
    });

    return {
      update(t) {
        const show = t >= cfg.enterT && (cfg.exitT == null || t < cfg.exitT + 0.5);
        root.visible = show;
        if (!show) return;

        const railIn = easeOutCubic(clamp01((t - cfg.enterT) / 0.48));
        railBase.scale.x = Math.max(0.001, railIn);
        railBrass.scale.x = Math.max(0.001, railIn);
        shadow.material.opacity = railIn;

        // 计算导轨发光进度
        let progress = 0;
        steps.forEach((s, i) => {
          if (t >= s.hitT) progress = Math.max(progress, (i + 1) / steps.length);
        });
        const glowW = Math.max(0.001, progress);
        railGlow.scale.x = glowW;
        railGlow.position.x = -4.2 + 4.2 * glowW;

        const allLit = cfg.allLitT != null && t >= cfg.allLitT;
        const detailOn = cfg.detailT != null && t >= cfg.detailT;
        const finaleP = cfg.finaleT != null ? easeInOutCubic(clamp01((t - cfg.finaleT) / 0.65)) : 0;
        const convP = cfg.convergeT != null ? easeInOutCubic(clamp01((t - cfg.convergeT) / 0.44)) : 0;

        if (convP > 0) {
          const shrink = Math.max(0.001, 1 - convP);
          railBase.scale.x = shrink;
          railBrass.scale.x = shrink;
          railGlow.scale.x = glowW * shrink;
          shadow.material.opacity = shrink;
        }

        cards.forEach((c, idx) => {
          const inP = easeOutBack(clamp01((t - (c.spec.hitT - 0.16)) / 0.50));
          const lit = t >= c.spec.hitT;
          const st = allLit ? 3 : (detailOn && lit ? 2 : (lit ? 1 : 0));
          if (st !== c.lastState) { c.lastState = st; c.panel.update(st); }

          const pulse = allLit ? (1.6 + 0.6 * Math.sin(t * 6.5 - idx * 0.8)) : (lit ? 1.35 : 0.12);
          c.ledMat.emissiveIntensity = pulse;

          const arcZ = finaleP * (idx === 1 || idx === 2 ? 0.34 : -0.05);
          const arcRotY = finaleP * (idx - 1.5) * -0.14;
          const liftY = allLit ? 0.14 : (lit ? 0.05 : 0);

          c.grp.position.set(
            c.baseX * (1 - convP),
            (1 - inP) * -1.8 + liftY + Math.sin(t * 1.9 + idx * 1.1) * 0.04,
            (lit ? 0.18 : 0) + arcZ - convP * 0.6
          );
          c.grp.rotation.set(0.04, arcRotY + Math.sin(t * 1.0 + idx) * 0.03 + convP * (idx - 1.5) * 0.8, 0);
          c.grp.scale.setScalar(Math.max(0.001, inP * (allLit ? 1.03 : 1.0) * (1 - convP)));
        });
      }
    };
  };

  /** 10. 3D 金属+蓝宝石主标题牌 / 章节封面卡（高复用片头落版 & 章节过门组件） */
  Modules3D.createTitleCard3D = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -0.22, cfg.posY ?? -0.18, 0);
    root.visible = false;
    studio.scene.add(root);

    const body = new THREE.Group();
    root.add(body);
    const shadow = studio.makeShadow(7.8, 2.2, 0, -1.78, 0);
    root.add(shadow);

    // 深枪灰 CNC 主牌 + 香槟黄铜外框 + 蓝宝石高光玻璃
    body.add(new THREE.Mesh(makeExtrudedBox(6.40, 2.86, 0.30, 0.24, 0.042), M.gunmetal));
    const brassRim = new THREE.Mesh(makeExtrudedBox(6.50, 2.96, 0.08, 0.26, 0.022), M.brass);
    brassRim.position.z = -0.05;
    body.add(brassRim);

    // 顶部 4 颗彩色步骤呼吸灯条
    const dotColors = cfg.dotColors || [0x00D4AA, 0xFF9500, 0x0A84FF, 0xFF2D55];
    const leds = dotColors.map((hex, i) => {
      const mat = new THREE.MeshPhysicalMaterial({
        color: hex, emissive: hex, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.1
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.065, 0.08), mat);
      m.position.set(-2.04 + i * 1.36, 1.32, 0.17);
      body.add(m);
      return mat;
    });

    const panel = createCanvasPanel(6.04, 2.52, 1510, 630, (g, W, H) => {
      g.fillStyle = '#0D151C'; g.beginPath(); g.roundRect(0, 0, W, H, 28); g.fill();
      g.strokeStyle = 'rgba(240, 194, 100, 0.45)'; g.lineWidth = 4; g.stroke();

      // 微型网格装饰线
      g.strokeStyle = 'rgba(255,255,255,0.04)'; g.lineWidth = 2;
      for (let gx = 90; gx < W - 60; gx += 120) { g.beginPath(); g.moveTo(gx, 24); g.lineTo(gx, H - 24); g.stroke(); }

      g.font = '800 28px "JetBrains Mono", Consolas, monospace';
      g.fillStyle = '#FFE499'; g.textAlign = 'center';
      g.fillText(cfg.kicker || 'MUSHANHE AI WORKFLOW · EP02', W / 2, 118);

      g.font = '900 94px "Noto Sans SC", "Microsoft YaHei", sans-serif';
      g.fillStyle = '#FFFFFF';
      g.fillText(cfg.title || 'AI 全流程视频制作', W / 2, 266);

      g.font = '800 42px "Noto Sans SC", "Microsoft YaHei", sans-serif';
      g.fillStyle = '#00E5C3';
      g.fillText(cfg.subtitle || '准备素材 · 撰写文案 · 录制口播 · 智能剪辑', W / 2, 366);

      // 底部 4 个步骤胶囊 + NEXT 按钮
      const badges = cfg.badges || ['01 素材规范', '02 协作文案', '03 实录去停顿', '04 代码剪辑'];
      const bCols = ['#00D4AA', '#FF9500', '#0A84FF', '#FF2D55'];
      const bw = 248, gap = 22, startX = (W - (bw * 4 + gap * 3)) / 2;
      badges.forEach((txt, i) => {
        const bx = startX + i * (bw + gap);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.strokeStyle = bCols[i % bCols.length]; g.lineWidth = 3;
        g.beginPath(); g.roundRect(bx, 434, bw, 62, 16); g.fill(); g.stroke();
        g.font = '800 26px "Noto Sans SC", sans-serif'; g.fillStyle = '#F0F6FA';
        g.fillText(txt, bx + bw / 2, 475);
      });

      g.fillStyle = 'rgba(255, 208, 102, 0.16)';
      g.strokeStyle = '#FFD066'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(W / 2 - 330, 526, 660, 62, 31); g.fill(); g.stroke();
      g.font = '900 26px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFE499';
      g.fillText(cfg.nextLabel || 'NEXT ▸ CHAPTER 01 · WORKSPACE SETUP', W / 2, 567);
      g.textAlign = 'left';
    });
    panel.mesh.position.z = 0.21;
    panel.update();
    body.add(panel.mesh);

    const glass = new THREE.Mesh(makeExtrudedBox(6.24, 2.70, 0.025, 0.22, 0.012), M.acrylicTint);
    glass.position.z = 0.235;
    body.add(glass);

    return {
      update(t) {
        const show = t >= cfg.enterT && (cfg.exitT == null || t < cfg.exitT + 0.5);
        root.visible = show;
        if (!show) return;
        const inP = easeOutBack(clamp01((t - cfg.enterT) / 0.54));
        const exitP = cfg.exitT != null ? clamp01((t - cfg.exitT) / 0.4) : 0;
        body.scale.setScalar(Math.max(0.001, inP * (1 - exitP)));
        body.position.set(0, Math.sin(t * 1.8) * 0.05, (1 - inP) * -1.4);
        body.rotation.set(0.04 + (1 - inP) * 0.28, Math.sin(t * 0.95) * 0.07, 0);
        leds.forEach((m, i) => { m.emissiveIntensity = 1.4 + 0.6 * Math.sin(t * 6.0 - i * 0.9); });
        shadow.material.opacity = Math.max(0, inP * (1 - exitP));
      }
    };
  };

  /** 11. 3D 素材盘点扫描台 (AssetScanner3D) — 盘点项目素材 -> 组织文案骨架 */
  Modules3D.createAssetScanner3D = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -1.58, cfg.posY ?? -0.36, 0);
    root.visible = false;
    studio.scene.add(root);

    const body = new THREE.Group();
    root.add(body);
    const shadow = studio.makeShadow(6.6, 2.2, 0, -1.88, 0);
    root.add(shadow);

    // 主机底板 + 黄铜外框
    body.add(new THREE.Mesh(makeExtrudedBox(5.26, 2.86, 0.24, 0.22, 0.038), M.gunmetal));
    const rim = new THREE.Mesh(makeExtrudedBox(5.34, 2.94, 0.06, 0.24, 0.02), M.brass);
    rim.position.z = -0.05;
    body.add(rim);

    // 3D 发光激光扫描横梁（在左侧素材列表上方上下扫动）
    const scanBar = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.055, 0.09), M.jadeGlow);
    scanBar.position.set(-1.18, 0.9, 0.19);
    body.add(scanBar);

    const assets = cfg.assets || [
      { name: '01_实拍与录屏素材', tag: 'VIDEO · 1080P', color: '#00D4AA' },
      { name: '02_项目源码与脚本', tag: 'CODE · CORE',   color: '#FF9500' },
      { name: '03_界面与过程截图', tag: 'IMG · UI',      color: '#0A84FF' },
      { name: '04_真实踩坑与记录', tag: 'NOTES · LOG',   color: '#FF2D55' }
    ];
    const outlineRows = cfg.outline || [
      '01. 开篇反差：真实效果先亮相',
      '02. 实操流程：四步全链路拆解',
      '03. 核心细节：防 AI 幻觉铁律',
      '04. 个人观点：人定方向 AI 执行'
    ];

    let lastKey = '';
    const screen = createCanvasPanel(4.96, 2.58, 1280, 666, (g, W, H, scannedCnt, outlineCnt) => {
      g.fillStyle = '#0D151B'; g.beginPath(); g.roundRect(0, 0, W, H, 24); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, 0, W, 76);
      g.font = '800 24px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFE499';
      g.fillText(cfg.windowTitle || 'CLAUDE CODE // ASSET SCANNER & OUTLINE', 38, 48);

      // 左侧：现有素材盘点区
      g.font = '800 22px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#66F5D8';
      g.fillText(`PROJECT ASSETS (${scannedCnt}/${assets.length})`, 38, 126);
      assets.forEach((a, i) => {
        const y = 152 + i * 116;
        const done = i < scannedCnt;
        g.fillStyle = done ? 'rgba(0, 212, 170, 0.10)' : 'rgba(255,255,255,0.04)';
        g.strokeStyle = done ? a.color : 'rgba(255,255,255,0.10)'; g.lineWidth = done ? 3 : 1.5;
        g.beginPath(); g.roundRect(38, y, 566, 94, 16); g.fill(); g.stroke();
        g.fillStyle = a.color; g.beginPath(); g.roundRect(38, y, 10, 94, 5); g.fill();
        g.font = '900 30px "Noto Sans SC", sans-serif'; g.fillStyle = '#FFFFFF';
        g.fillText(a.name, 68, y + 44);
        g.font = '700 20px "JetBrains Mono", Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillText(a.tag, 68, y + 78);
        if (done) {
          g.fillStyle = '#00C49A'; g.beginPath(); g.roundRect(474, y + 26, 108, 42, 21); g.fill();
          g.font = '900 22px "Noto Sans SC", sans-serif'; g.fillStyle = '#0A1218'; g.textAlign = 'center';
          g.fillText('可用 ✓', 528, y + 55); g.textAlign = 'left';
        }
      });

      // 中央分隔箭头
      g.strokeStyle = 'rgba(240, 194, 100, 0.35)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(638, 120); g.lineTo(638, 620); g.stroke();

      // 右侧：围绕主题组织文案骨架
      g.font = '800 22px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFD066';
      g.fillText('STRUCTURED SCRIPT OUTLINE', 676, 126);
      outlineRows.forEach((txt, i) => {
        const y = 152 + i * 116;
        const vis = i < outlineCnt;
        g.fillStyle = vis ? 'rgba(255, 196, 86, 0.11)' : 'rgba(255,255,255,0.025)';
        g.strokeStyle = vis ? '#F0C264' : 'rgba(255,255,255,0.08)'; g.lineWidth = vis ? 3 : 1.5;
        g.beginPath(); g.roundRect(676, y, 566, 94, 16); g.fill(); g.stroke();
        g.font = '800 28px "Noto Sans SC", sans-serif';
        g.fillStyle = vis ? '#FFFFFF' : 'rgba(255,255,255,0.22)';
        g.fillText(vis ? txt : '等待素材盘点汇入...', 706, y + 57);
      });
    });
    screen.mesh.position.z = 0.165;
    body.add(screen.mesh);

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.exitT + 0.5;
        root.visible = show;
        if (!show) return;
        const inP = easeOutBack(clamp01((t - cfg.enterT) / 0.54));
        const exitP = clamp01((t - cfg.exitT) / 0.42);
        const scanDur = (cfg.outlineT - cfg.scanT);
        const scanP = clamp01((t - cfg.scanT) / Math.max(0.5, scanDur));
        const scannedCnt = Math.min(assets.length, Math.floor(scanP * (assets.length + 0.35)));
        const outP = clamp01((t - cfg.outlineT) / 1.45);
        const outlineCnt = t < cfg.outlineT ? 0 : Math.min(outlineRows.length, Math.floor(outP * (outlineRows.length + 0.5)));

        const key = `${scannedCnt}_${outlineCnt}`;
        if (key !== lastKey) { lastKey = key; screen.update(scannedCnt, outlineCnt); }

        scanBar.visible = t >= cfg.scanT && t < cfg.outlineT + 0.2;
        scanBar.position.y = 0.78 - scanP * 1.85;

        body.scale.setScalar(Math.max(0.001, inP * (1 - exitP * 0.85)));
        body.position.set(0, (1 - inP) * -1.6 + Math.sin(t * 1.5) * 0.04, 0);
        body.rotation.set(0.05, -0.10 + Math.sin(t * 0.9) * 0.04, 0);
        shadow.material.opacity = Math.max(0, inP * (1 - exitP));
      }
    };
  };

  /** 12. 3D 案头指令铁律卡槽架 (EditorialChecklist3D) — 3 条核心铁律逐条翻起锁死 */
  Modules3D.createEditorialChecklist3D = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -0.22, cfg.posY ?? -0.20, 0);
    root.visible = false;
    studio.scene.add(root);

    const shadow = studio.makeShadow(9.0, 2.0, 0, -1.78, 0);
    root.add(shadow);

    const rail = new THREE.Mesh(makeExtrudedBox(8.6, 0.16, 0.28, 0.06, 0.02), M.gunmetal);
    rail.position.set(0, -1.42, -0.06);
    root.add(rail);
    const railBrass = new THREE.Mesh(new THREE.BoxGeometry(8.64, 0.036, 0.32), M.brass);
    railBrass.position.set(0, -1.32, -0.06);
    root.add(railBrass);

    const rules = cfg.rules || [];
    const cards = rules.map((spec, idx) => {
      const grp = new THREE.Group();
      const baseX = spec.x ?? (-2.82 + idx * 2.82);
      grp.position.set(baseX, 0, 0);
      root.add(grp);

      grp.add(new THREE.Mesh(makeExtrudedBox(2.48, 2.46, 0.24, 0.18, 0.034), M.gunmetal));
      const rim = new THREE.Mesh(makeExtrudedBox(2.54, 2.52, 0.06, 0.20, 0.018), M.brass);
      rim.position.z = -0.05;
      grp.add(rim);

      const ledMat = new THREE.MeshPhysicalMaterial({
        color: spec.hex || 0x00D4AA, emissive: spec.hex || 0x00D4AA,
        emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.1
      });
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.065, 0.08), ledMat);
      led.position.set(0, 1.14, 0.14);
      grp.add(led);

      const panel = createCanvasPanel(2.26, 2.22, 678, 666, (g, W, H, locked) => {
        g.fillStyle = '#0D151B'; g.beginPath(); g.roundRect(0, 0, W, H, 22); g.fill();
        g.strokeStyle = locked ? spec.color : 'rgba(255,255,255,0.14)'; g.lineWidth = locked ? 5 : 2; g.stroke();

        g.fillStyle = locked ? spec.color : 'rgba(255,255,255,0.20)';
        g.beginPath(); g.roundRect(38, 42, 300, 44, 22); g.fill();
        g.font = '900 22px "JetBrains Mono", Consolas, monospace';
        g.fillStyle = locked ? '#0A1218' : 'rgba(255,255,255,0.6)'; g.textAlign = 'center';
        g.fillText(spec.kicker || `RULE 0${idx + 1}`, 188, 72); g.textAlign = 'left';

        g.font = '900 54px "Noto Sans SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#FFFFFF';
        g.fillText(spec.title, 38, 174);
        g.fillStyle = locked ? spec.color : 'rgba(255,255,255,0.18)'; g.fillRect(38, 204, 110, 6);

        g.font = '700 32px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        g.fillStyle = locked ? '#E4EEF6' : 'rgba(200,214,226,0.48)';
        g.fillText(spec.line1 || '', 38, 276);
        g.fillText(spec.line2 || '', 38, 326);

        // 底部规范示例块
        g.fillStyle = locked ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
        g.strokeStyle = locked ? spec.color : 'rgba(255,255,255,0.08)'; g.lineWidth = 2.5;
        g.beginPath(); g.roundRect(36, 388, W - 72, 146, 18); g.fill(); g.stroke();
        g.font = '800 22px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FFE499';
        g.fillText(spec.boxKicker || 'PROMPT CONSTRAINT', 58, 434);
        g.font = '800 29px "Noto Sans SC", sans-serif'; g.fillStyle = '#FFFFFF';
        g.fillText(spec.boxText || '', 58, 494);

        g.fillStyle = locked ? spec.color : 'rgba(255,255,255,0.12)';
        g.beginPath(); g.roundRect(36, 566, W - 72, 58, 16); g.fill();
        g.font = '900 26px "Noto Sans SC", sans-serif';
        g.fillStyle = locked ? '#0A1218' : 'rgba(255,255,255,0.45)'; g.textAlign = 'center';
        g.fillText(locked ? (spec.badge || '已写入核心指令 ✓') : '待确认...', W / 2, 604);
        g.textAlign = 'left';
      });
      panel.mesh.position.z = 0.165;
      panel.update(false);
      grp.add(panel.mesh);

      return { grp, baseX, spec, ledMat, panel, wasLocked: false };
    });

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.exitT + 0.55;
        root.visible = show;
        if (!show) return;
        const exitP = clamp01((t - cfg.exitT) / 0.46);
        const suck = 1 - exitP * exitP;
        rail.scale.x = Math.max(0.001, suck);
        railBrass.scale.x = Math.max(0.001, suck);
        shadow.material.opacity = Math.max(0, suck);

        cards.forEach((c, idx) => {
          const inP = easeOutBack(clamp01((t - (c.spec.hitT - 0.18)) / 0.52));
          const locked = t >= c.spec.hitT;
          if (locked !== c.wasLocked) { c.wasLocked = locked; c.panel.update(locked); }
          c.ledMat.emissiveIntensity = locked ? 1.55 : 0.12;
          const angle = exitP * 2.8;
          const rx = c.baseX * Math.cos(angle);
          const ry = Math.sin(angle) * (idx - 1) * 0.9;
          c.grp.position.set(rx * suck, (1 - inP) * -2.0 + Math.sin(t * 1.8 + idx) * 0.04 + ry * exitP, locked ? 0.20 : 0);
          c.grp.rotation.set(0.04, (idx - 1) * -0.10 + exitP * 1.4, exitP * 0.6);
          c.grp.scale.setScalar(Math.max(0.001, inP * suck));
        });
      }
    };
  };

  /** 13. 3D 稿件红笔审校与重铸双屏台 (ScriptDiff3D) — 指出问题 -> AI 重新组织 */
  Modules3D.createScriptDiff3D = function (studio, cfg) {
    const { makeExtrudedBox, createCanvasPanel } = MHEngine.Studio3D;
    const M = studio.mats;
    const root = new THREE.Group();
    root.position.set(cfg.posX ?? -1.58, cfg.posY ?? -0.34, 0);
    root.visible = false;
    studio.scene.add(root);

    const body = new THREE.Group();
    root.add(body);
    const shadow = studio.makeShadow(6.6, 2.1, 0, -1.84, 0);
    root.add(shadow);

    // 左屏（原稿问题段）+ 右屏（AI 重组清晰版）+ 中央发光箭头桥
    const leftGrp = new THREE.Group(); leftGrp.position.set(-1.38, 0, 0); body.add(leftGrp);
    const rightGrp = new THREE.Group(); rightGrp.position.set(1.38, 0, 0); body.add(rightGrp);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.10, 0.10), M.amberGlow);
    body.add(bridge);

    leftGrp.add(new THREE.Mesh(makeExtrudedBox(2.42, 2.52, 0.22, 0.18, 0.032), M.gunmetal));
    rightGrp.add(new THREE.Mesh(makeExtrudedBox(2.42, 2.52, 0.22, 0.18, 0.032), M.gunmetal));

    let lastPhase = -1;
    const leftPanel = createCanvasPanel(2.22, 2.30, 666, 690, (g, W, H, flagged) => {
      g.fillStyle = '#0E151B'; g.beginPath(); g.roundRect(0, 0, W, H, 22); g.fill();
      g.strokeStyle = flagged ? '#FF2D55' : 'rgba(255,255,255,0.16)'; g.lineWidth = flagged ? 5 : 2; g.stroke();
      g.font = '800 24px "JetBrains Mono", Consolas, monospace'; g.fillStyle = '#FF6B81';
      g.fillText(cfg.leftKicker || 'DRAFT v1 // ISSUE', 38, 64);
      g.font = '900 44px "Noto Sans SC", sans-serif'; g.fillStyle = '#FFFFFF';
      g.fillText(cfg.leftTitle || '某段没讲明白', 38, 144);

      // 模拟三行稿件文字 + 红框圈出问题段落
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect(38, 186, W - 76, 260, 16); g.fill();
      g.font = '700 28px "Noto Sans SC", sans-serif'; g.fillStyle = 'rgba(255,255,255,0.75)';
      (cfg.leftLines || ['“这个工具挺好用的，', '能自动把视频做好，', '大家都可以试试看。”']).forEach((ln, i) => {
        g.fillText(ln, 62, 250 + i * 62);
      });
      if (flagged) {
        g.strokeStyle = '#FF2D55'; g.lineWidth = 5; g.setLineDash([10, 6]);
        g.beginPath(); g.roundRect(48, 200, W - 96, 232, 12); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#FF2D55'; g.beginPath(); g.roundRect(38, 488, W - 76, 152, 16); g.fill();
        g.font = '900 28px "Noto Sans SC", sans-serif'; g.fillStyle = '#FFFFFF';
        g.fillText(cfg.feedbackTitle || '✎ 直接指出问题：', 64, 544);
        g.font = '700 26px "Noto Sans SC", sans-serif';
        g.fillText(cfg.feedbackText || '太笼统，补上具体做法与因果！', 64, 602);
      }
    });
    leftPanel.mesh.position.z = 0.155;
    leftGrp.add(leftPanel.mesh);

    const rightPanel = createCanvasPanel(2.22, 2.30, 666, 690, (g, W, H, rewritten) => {
      g.fillStyle = '#0E151B'; g.beginPath(); g.roundRect(0, 0, W, H, 22); g.fill();
      g.strokeStyle = rewritten ? '#00D4AA' : 'rgba(255,255,255,0.14)'; g.lineWidth = rewritten ? 5 : 2; g.stroke();
      g.font = '800 24px "JetBrains Mono", Consolas, monospace'; g.fillStyle = rewritten ? '#66F5D8' : 'rgba(255,255,255,0.4)';
      g.fillText(cfg.rightKicker || 'REVISED v2 // CLEAR', 38, 64);
      g.font = '900 44px "Noto Sans SC", sans-serif'; g.fillStyle = '#FFFFFF';
      g.fillText(cfg.rightTitle || 'AI 重新组织', 38, 144);

      g.fillStyle = rewritten ? 'rgba(0, 212, 170, 0.10)' : 'rgba(255,255,255,0.04)';
      g.beginPath(); g.roundRect(38, 186, W - 76, 260, 16); g.fill();
      g.font = '700 28px "Noto Sans SC", sans-serif';
      g.fillStyle = rewritten ? '#FFFFFF' : 'rgba(255,255,255,0.28)';
      (cfg.rightLines || ['“先盘点素材确保有出处，', '确认提纲再动笔写全稿，', '亲身经历由本人亲自补充。”']).forEach((ln, i) => {
        g.fillText(rewritten ? ln : '等待指令重写...', 62, 250 + i * 62);
      });

      g.fillStyle = rewritten ? '#00C49A' : 'rgba(255,255,255,0.12)';
      g.beginPath(); g.roundRect(38, 520, W - 76, 92, 18); g.fill();
      g.font = '900 32px "Noto Sans SC", sans-serif';
      g.fillStyle = rewritten ? '#0A1218' : 'rgba(255,255,255,0.4)'; g.textAlign = 'center';
      g.fillText(rewritten ? (cfg.rightBadge || '逻辑清晰 · 精准表达 ✓') : 'STANDBY', W / 2, 578);
      g.textAlign = 'left';
    });
    rightPanel.mesh.position.z = 0.155;
    rightGrp.add(rightPanel.mesh);

    return {
      update(t) {
        const show = t >= cfg.enterT && t < cfg.exitT + 0.45;
        root.visible = show;
        if (!show) return;
        const inP = easeOutBack(clamp01((t - cfg.enterT) / 0.48));
        const exitP = clamp01((t - cfg.exitT) / 0.36);
        const flagged = t >= cfg.flagT;
        const rewritten = t >= cfg.rewriteT;
        const phase = (flagged ? 1 : 0) + (rewritten ? 2 : 0);
        if (phase !== lastPhase) {
          lastPhase = phase;
          leftPanel.update(flagged);
          rightPanel.update(rewritten);
        }
        const rIn = easeOutBack(clamp01((t - (cfg.rewriteT - 0.15)) / 0.45));
        leftGrp.rotation.y = 0.12;
        rightGrp.rotation.y = -0.12;
        rightGrp.scale.setScalar(Math.max(0.001, 0.85 + 0.15 * rIn));
        bridge.scale.x = Math.max(0.001, rIn);
        body.scale.setScalar(Math.max(0.001, inP * (1 - exitP * 0.8)));
        body.position.set(0, (1 - inP) * -1.4 + Math.sin(t * 1.6) * 0.04, exitP * 2.8);
        shadow.material.opacity = Math.max(0, inP * (1 - exitP));
      }
    };
  };

  MHEngine.Modules3D = Modules3D;
})(window);
