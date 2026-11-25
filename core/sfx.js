/**
 * Mushanhe Video Engine — Procedural Micro-SFX Engine (Web Audio API)
 * 极克制的微交互拟音层（零外部音频文件依赖、零版权风险、毫秒级触发）
 * 支持: pop (入袋), thud (合盖), click (点击), unlock (授权解锁), node (节点点亮), impact (印章重击)
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  class MicroSFX {
    constructor(opts = {}) {
      this.enabled = opts.enabled !== false;
      this.volume = typeof opts.volume === 'number' ? opts.volume : 0.28;
      this.ctx = null;
      this.cues = [];
      this.fired = new Set();
    }

    ensureContext() {
      if (!this.ctx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    setCues(cues) {
      this.cues = (cues || []).map((c, idx) => ({ id: idx, time: c.time, type: c.type }));
      this.fired.clear();
    }

    resetAt(t) {
      this.fired.clear();
      // 跳过已经过去的时间点，避免拖动进度条时乱响
      for (const c of this.cues) {
        if (c.time < t - 0.04) this.fired.add(c.id);
      }
    }

    tick(t) {
      if (!this.enabled) return;
      for (const c of this.cues) {
        if (!this.fired.has(c.id) && t >= c.time && t <= c.time + 0.18) {
          this.fired.add(c.id);
          this.play(c.type);
        }
      }
    }

    play(type) {
      if (!this.enabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const v = this.volume;

      if (type === 'pop') {
        // 清脆温润的磁吸落袋声
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.065);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(v * 0.42, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'thud') {
        // 温润低沉的文件夹合盖声
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.14);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(v * 0.55, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
      } else if (type === 'click') {
        // 干净的苹果触控板式点击声
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.032);
        gain.gain.setValueAtTime(v * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.045);
      } else if (type === 'unlock') {
        // 双音柔和解锁提示音
        [523.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t0 = now + i * 0.075;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t0);
          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.linearRampToValueAtTime(v * 0.28, t0 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.2);
        });
      } else if (type === 'node') {
        // 能力节点激活的科技感轻音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.11);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(v * 0.32, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'impact') {
        // 印章落地的扎实低频重击
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.22);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(v * 0.85, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'whoosh') {
        // 极克制的电影转场柔和气流感（带通滤波噪声扫频）
        const dur = 0.34;
        const bufSize = Math.floor(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.6;
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.exponentialRampToValueAtTime(1350, now + dur * 0.48);
        filter.frequency.exponentialRampToValueAtTime(360, now + dur);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(v * 0.26, now + dur * 0.42);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(now);
        src.stop(now + dur + 0.02);
      }
    }
  }

  MHEngine.MicroSFX = MicroSFX;
})(window);
