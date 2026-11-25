/**
 * Mushanhe Video Engine — Director & Scene Registry
 * 通用内核总装配器：读取 JSON 剧本 + stable-ts 词级时间轴 + 模板注册的场景积木，自动建轴并驱动渲染
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});
  const registry = {};

  MHEngine.registerScene = function (type, definition) {
    registry[type] = definition;
  };

  function fitViewport() {
    const vp = document.getElementById('viewport');
    if (!vp) return;
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    vp.style.transform = `scale(${s})`;
  }

  async function loadStoryboard(url) {
    if (url) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) return await res.json();
      } catch (_) {
        // file:// 双击直开时自动回退到 window.STORYBOARD_DATA
      }
    }
    if (global.STORYBOARD_DATA) return global.STORYBOARD_DATA;
    throw new Error('Failed to load storyboard.json (and no window.STORYBOARD_DATA fallback).');
  }

  MHEngine.boot = async function (options = {}) {
    fitViewport();
    window.addEventListener('resize', fitViewport);

    const storyboard = await loadStoryboard(options.storyboardUrl || 'storyboard.json');
    const wordData = global.WORD_DATA || { words: [], lines: [], fps: 30 };
    const resolver = new MHEngine.TimelineResolver(wordData);

    const duration = storyboard.duration || resolver.getTotalDuration(21.5);
    const media = storyboard.media || {};

    // 绑定媒体资源
    const voiceEl = document.getElementById('voice-audio');
    const videoEl = document.getElementById('avatar-video');
    const bgmEl = document.getElementById('bgm-audio');
    const studioBgEl = document.getElementById('avatar-studio-bg');
    const avatarNameEl = document.getElementById('avatar-name');

    if (voiceEl && media.voice) voiceEl.src = media.voice;
    if (videoEl && media.avatarVideo) videoEl.src = media.avatarVideo;
    if (studioBgEl && media.studioBg) studioBgEl.src = media.studioBg;
    if (avatarNameEl && storyboard.creator) avatarNameEl.textContent = storyboard.creator;

    // 顶栏章节徽章
    if (storyboard.chapter) {
      const numEl = document.querySelector('#chapter-pill .pill-num');
      const labelEl = document.querySelector('#chapter-pill .pill-label');
      const subEl = document.querySelector('#chapter-pill .pill-sub');
      if (numEl) numEl.textContent = storyboard.chapter.number || '01';
      if (labelEl) labelEl.textContent = storyboard.chapter.title || '';
      if (subEl) subEl.textContent = storyboard.chapter.subtitle || '';
    }

    // 注册自定义弹性曲线
    gsap.registerPlugin(CustomEase);
    const snappy = CustomEase.create('snappy', 'M0,0 C0.12,0.88 0.24,1.06 0.44,1.02 0.68,0.99 0.84,1 1,1');

    const avatar = new MHEngine.AvatarController(storyboard.avatarPresets);
    const subtitle = new MHEngine.SubtitleRenderer(document.getElementById('subtitle-bar'), wordData);
    const mixer = new MHEngine.AudioMixer({
      voiceEl,
      videoEl,
      bgmEl,
      voiceOffset: media.voiceOffset || 0,
      duration,
      bgmTracks: media.bgmTracks || [],
      bgmVolume: typeof media.bgmVolume === 'number' ? media.bgmVolume : 0.12
    });

    // 初始人像形态
    const initialAvatar = (storyboard.avatarCues && storyboard.avatarCues[0] && storyboard.avatarCues[0].mode) || 'portrait-card';
    avatar.setImmediate(initialAvatar);

    // 挂载 HUD 元素
    const scrubber = document.getElementById('scrubber');
    const timeReadout = document.getElementById('time-readout');
    const btnPlay = document.getElementById('btn-play');
    const btnReplay = document.getElementById('btn-replay');
    const bgmSelect = document.getElementById('bgm-select');
    const bgmVol = document.getElementById('bgm-vol');

    if (scrubber) {
      scrubber.max = duration;
      scrubber.value = 0;
    }

    if (bgmSelect && media.bgmTracks) {
      bgmSelect.innerHTML = media.bgmTracks
        .map(tr => `<option value="${tr.id}">${tr.label}</option>`)
        .join('') + `<option value="off">静音 BGM</option>`;
      bgmSelect.addEventListener('change', (e) => mixer.selectBgm(e.target.value, true));
    }
    if (bgmVol) {
      bgmVol.value = Math.round(mixer.bgmVolume * 100);
      bgmVol.addEventListener('input', (e) => mixer.setBgmVolume(parseFloat(e.target.value) / 100));
    }

    // 建立主时间轴
    const tl = gsap.timeline({
      paused: true,
      onUpdate: () => {
        const t = tl.time();
        subtitle.render(t);
        if (scrubber) scrubber.value = t.toFixed(2);
        if (timeReadout) timeReadout.textContent = `${t.toFixed(2)} / ${duration.toFixed(2)}s`;
      }
    });

    // 背景缓慢呼吸推镜
    if (document.getElementById('stage-bg')) {
      tl.fromTo('#stage-bg', { scale: 1.0 }, { scale: 1.07, duration, ease: 'none' }, 0);
    }

    // 应用人像形态切换序列
    (storyboard.avatarCues || []).forEach((cue, idx) => {
      if (idx === 0 && !cue.at) return;
      const at = resolver.resolve(cue.at, -0.15);
      avatar.animateOnTimeline(tl, cue.mode, at, cue.duration || 0.65);
    });

    // 动态渲染并编排所有参数化场景积木
    const scenesLayer = document.getElementById('scenes-layer');
    const fgLayer = document.getElementById('foreground-layer');
    const ctx = {
      resolver,
      snappy,
      duration,
      resolveTime: (spec, defOff = -0.05) => resolver.resolve(spec, defOff)
    };

    (storyboard.scenes || []).forEach((sceneCfg, idx) => {
      const def = registry[sceneCfg.type];
      if (!def) {
        console.warn(`[MHEngine] Unknown scene type: "${sceneCfg.type}"`);
        return;
      }
      const el = def.render(sceneCfg, ctx, idx);
      if (!el) return;
      const host = def.layer === 'foreground' ? fgLayer : scenesLayer;
      host.appendChild(el);
      if (typeof def.animate === 'function') {
        def.animate(tl, el, sceneCfg, ctx);
      }
    });

    // 锁定总时长尾部
    tl.to({}, { duration: 0.05 }, duration);

    // 播放循环
    let rafId = null;
    function syncAll(t) {
      const clamped = Math.max(0, Math.min(duration, t));
      tl.pause(clamped);
      mixer.seekTo(clamped);
      subtitle.render(clamped);
      if (scrubber) scrubber.value = clamped.toFixed(2);
      if (timeReadout) timeReadout.textContent = `${clamped.toFixed(2)} / ${duration.toFixed(2)}s`;
    }

    function tick() {
      if (mixer.isPaused()) return;
      const t = mixer.getCurrentTime();
      if (t >= duration) {
        pauseAll();
        syncAll(duration);
        return;
      }
      tl.time(t);
      if (videoEl && Math.abs(videoEl.currentTime - t) > 0.08) {
        try { videoEl.currentTime = t; } catch (_) {}
      }
      rafId = requestAnimationFrame(tick);
    }

    function playAll() {
      mixer.play();
      if (btnPlay) btnPlay.textContent = '⏸ 暂停';
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    }

    function pauseAll() {
      mixer.pause();
      cancelAnimationFrame(rafId);
      if (btnPlay) btnPlay.textContent = '▶ 播放';
    }

    if (btnPlay) btnPlay.addEventListener('click', () => (mixer.isPaused() ? playAll() : pauseAll()));
    if (btnReplay) btnReplay.addEventListener('click', () => { syncAll(0); playAll(); });
    if (scrubber) scrubber.addEventListener('input', (e) => { pauseAll(); syncAll(parseFloat(e.target.value)); });

    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => avatar.previewMode(btn.dataset.mode));
    });

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
      if (e.code === 'Space') { e.preventDefault(); if (btnPlay) btnPlay.click(); }
      else if (e.key === 'h' || e.key === 'H') { const h = document.getElementById('hud'); if (h) h.classList.toggle('hidden'); }
      else if (e.key === 'r' || e.key === 'R') { if (btnReplay) btnReplay.click(); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (review) review.openForCurrentTime(); }
    });

    // 挂载导演审片批注工具（随时打点提修改意见，一键复制发给 AI）
    let review = null;
    if (MHEngine.ReviewNotes) {
      review = new MHEngine.ReviewNotes({
        templateId: storyboard.template || 'default',
        getCurrentTime: () => tl.time(),
        getCurrentSubtitle: () => {
          const el = document.getElementById('subtitle-bar');
          return el ? el.textContent.trim() : '';
        },
        getActiveScene: (t) => {
          const list = storyboard.scenes || [];
          for (let i = list.length - 1; i >= 0; i--) {
            const sc = list[i];
            const s = resolver.resolve(sc.enter, -0.15);
            const e = sc.exit ? resolver.resolve(sc.exit, -0.15) : duration + 1;
            if (t >= s && t <= e) return sc.id;
          }
          return '';
        },
        pausePlayback: pauseAll,
        seekTo: (t) => { pauseAll(); syncAll(t); }
      });
    }

    // 暴露给无头抽帧/渲染管线的确定性接口
    global.__MH_ENGINE__ = {
      duration,
      seek: syncAll,
      timeline: tl,
      storyboard
    };

    // URL 参数 ?t=6.5&clean=1 精准抽帧
    const params = new URLSearchParams(window.location.search);
    if (params.get('clean') === '1') {
      const hud = document.getElementById('hud');
      if (hud) hud.classList.add('hidden');
    }
    if (params.has('t')) {
      const targetT = parseFloat(params.get('t'));
      if (!isNaN(targetT)) {
        if (videoEl) videoEl.addEventListener('loadeddata', () => syncAll(targetT), { once: true });
        syncAll(targetT);
      }
    } else {
      syncAll(0);
    }
  };
})(window);
