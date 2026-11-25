/**
 * Mushanhe Video Engine — Shared 4K Studio 3D Hardware Engine (core/studio-3d.js)
 * 通用 3D 影棚物理材质与几何底座：
 *   所有 6 大口播通用 3D 母组件共享同一套柔光箱 HDR 环境贴图、拉丝枪灰金属、香槟黄铜、
 *   清泉光学蓝宝石玻璃、4K 纯色油墨卡片纹理生成器与地面接触阴影，实现 100% 同厂美学与极低复用成本。
 */
(function (global) {
  'use strict';
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  function createBrushedTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y++) {
      const v = 112 + Math.floor((Math.sin(y * 12.9898) * 43758.5453 % 1 + 1) * 18);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, y, 512, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  function buildBrightStudioEnvMap(renderer) {
    const envScene = new THREE.Scene();
    // 明亮通透的影棚穹顶底色，让深色枪灰金属在浅色画廊背景上折射出高级银白与暖金高光
    envScene.background = new THREE.Color(0xD8E2EC);
    const addSoftbox = (w, h, color, intensity, pos, rot) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      m.position.set(...pos);
      m.rotation.set(...rot);
      envScene.add(m);
    };
    addSoftbox(16, 6, 0xFFFFFF, 2.8, [0, 8, 5], [Math.PI * 0.42, 0, -0.18]);
    addSoftbox(10, 2.6, 0xFFE6B0, 3.0, [7, 4.5, 6], [0.2, -0.7, -0.32]);
    addSoftbox(8, 6, 0xB4F5F0, 2.0, [-9, 2.5, 5], [0, 0.9, 0.15]);
    addSoftbox(14, 4, 0xF4F7FA, 1.5, [0, -6, 7], [-Math.PI * 0.3, 0, 0]);
    addSoftbox(16, 3, 0xFFF2D6, 2.2, [-2, 3, -8], [0, 0, 0]);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(envScene, 0.035);
    pmrem.dispose();
    return envRT.texture;
  }

  function roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    const rad = Math.min(r, w / 2, h / 2);
    s.moveTo(x + rad, y);
    s.lineTo(x + w - rad, y);
    s.quadraticCurveTo(x + w, y, x + w, y + rad);
    s.lineTo(x + w, y + h - rad);
    s.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    s.lineTo(x + rad, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - rad);
    s.lineTo(x, y + rad);
    s.quadraticCurveTo(x, y, x + rad, y);
    return s;
  }

  function folderBackShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    const tabW = 1.65, tabH = 0.34;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + tabW + 0.22, y + h);
    s.quadraticCurveTo(x + tabW + 0.05, y + h, x + tabW - 0.04, y + h + tabH * 0.5);
    s.quadraticCurveTo(x + tabW - 0.14, y + h + tabH, x + tabW - 0.34, y + h + tabH);
    s.lineTo(x + r, y + h + tabH);
    s.quadraticCurveTo(x, y + h + tabH, x, y + h + tabH - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function makeExtrudedBox(w, h, depth, radius, bevel = 0.032) {
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, radius), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 5,
      curveSegments: 20
    });
    geo.translate(0, 0, -depth / 2);
    return geo;
  }

  function createShadowTexture(opacity = 0.36) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(256, 128, 16, 256, 128, 236);
    grad.addColorStop(0, `rgba(14, 24, 34, ${opacity})`);
    grad.addColorStop(0.55, `rgba(14, 24, 34, ${opacity * 0.42})`);
    grad.addColorStop(1, 'rgba(14, 24, 34, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 256);
    return new THREE.CanvasTexture(c);
  }

  function createCanvasPanel(w, h, pixelW, pixelH, drawFn) {
    const c = document.createElement('canvas');
    c.width = pixelW; c.height = pixelH;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const update = (...args) => {
      ctx.clearRect(0, 0, pixelW, pixelH);
      drawFn(ctx, pixelW, pixelH, ...args);
      tex.needsUpdate = true;
    };
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    return { mesh, tex, update };
  }

  class Studio3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(1920, 1080, false);
      this.renderer.setPixelRatio(1);
      // 4K 纯净清泉色彩铁律：LinearToneMapping 杜绝发白发灰
      this.renderer.toneMapping = THREE.LinearToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.setClearColor(0x000000, 0);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 100);
      this.camera.position.set(0, 0.3, 9.6);
      this.camera.lookAt(0, -0.1, 0);

      this.scene.environment = buildBrightStudioEnvMap(this.renderer);

      // 影棚三点布光
      const key = new THREE.DirectionalLight(0xFFF9EE, 2.0);
      key.position.set(-4.5, 6.5, 8.0);
      this.scene.add(key);

      const rim = new THREE.DirectionalLight(0x4EE8E0, 1.3);
      rim.position.set(-7.5, 2.5, -3.5);
      this.scene.add(rim);

      this.brassLight = new THREE.PointLight(0xFFB84D, 2.6, 16);
      this.brassLight.position.set(1.5, 2.6, 4.5);
      this.scene.add(this.brassLight);

      this.brushedTex = createBrushedTexture();
      this.shadowTex = createShadowTexture(0.32);

      // 共享同厂 3D 物理材质库
      this.mats = {
        gunmetal: new THREE.MeshPhysicalMaterial({
          color: 0x1D2832, metalness: 0.82, roughness: 0.30,
          roughnessMap: this.brushedTex, bumpMap: this.brushedTex, bumpScale: 0.006,
          clearcoat: 0.42, clearcoatRoughness: 0.22, envMapIntensity: 1.15
        }),
        slateDark: new THREE.MeshPhysicalMaterial({
          color: 0x131B22, metalness: 0.72, roughness: 0.36,
          roughnessMap: this.brushedTex, clearcoat: 0.32, envMapIntensity: 1.0
        }),
        silverAlu: new THREE.MeshPhysicalMaterial({
          color: 0xDCE4EC, metalness: 0.78, roughness: 0.24,
          roughnessMap: this.brushedTex, clearcoat: 0.5, envMapIntensity: 1.1
        }),
        brass: new THREE.MeshPhysicalMaterial({
          color: 0xF0C264, metalness: 0.90, roughness: 0.18,
          roughnessMap: this.brushedTex, clearcoat: 0.65, envMapIntensity: 1.4
        }),
        sapphireGlass: new THREE.MeshPhysicalMaterial({
          color: 0xFFFFFF, metalness: 0.02, roughness: 0.04,
          transmission: 0.88, thickness: 0.36, ior: 1.50,
          transparent: true, opacity: 1.0, clearcoat: 1.0, clearcoatRoughness: 0.03,
          envMapIntensity: 1.25, attenuationColor: new THREE.Color(0xFFFFFF), attenuationDistance: 14.0
        }),
        acrylicTint: new THREE.MeshPhysicalMaterial({
          color: 0xE8F4FA, metalness: 0.05, roughness: 0.08,
          transparent: true, opacity: 0.28, clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 1.4
        }),
        jadeGlow: new THREE.MeshPhysicalMaterial({
          color: 0x00D4AA, emissive: 0x00A886, emissiveIntensity: 0.65,
          roughness: 0.2, metalness: 0.1, clearcoat: 0.8
        }),
        amberGlow: new THREE.MeshPhysicalMaterial({
          color: 0xFF9500, emissive: 0xD97300, emissiveIntensity: 0.65,
          roughness: 0.2, metalness: 0.1, clearcoat: 0.8
        }),
        cobaltGlow: new THREE.MeshPhysicalMaterial({
          color: 0x0A84FF, emissive: 0x0055CC, emissiveIntensity: 0.65,
          roughness: 0.2, metalness: 0.1, clearcoat: 0.8
        }),
        crimsonGlow: new THREE.MeshPhysicalMaterial({
          color: 0xFF2D55, emissive: 0xCC1138, emissiveIntensity: 0.65,
          roughness: 0.2, metalness: 0.1, clearcoat: 0.8
        })
      };
    }

    makeShadow(w, h, x, y, z = 0) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      return m;
    }

    render(t) {
      this.brassLight.position.x = 0.8 + Math.sin(t * 1.3) * 2.4;
      this.brassLight.position.y = 2.4 + Math.cos(t * 1.0) * 0.7;
      this.renderer.render(this.scene, this.camera);
    }
  }

  Studio3D.roundedRectShape = roundedRectShape;
  Studio3D.folderBackShape = folderBackShape;
  Studio3D.makeExtrudedBox = makeExtrudedBox;
  Studio3D.createCanvasPanel = createCanvasPanel;
  MHEngine.Studio3D = Studio3D;
})(window);
