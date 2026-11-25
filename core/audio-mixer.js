/**
 * Mushanhe Video Engine — Voice + Avatar Video + BGM Synchronized Mixer
 * 口播主音轨 + 抠像人像视频 + 精选 BGM 多曲目切换与严格同步
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  class AudioMixer {
    constructor(opts) {
      this.voiceEl = opts.voiceEl;
      this.videoEl = opts.videoEl;
      this.bgmEl = opts.bgmEl;
      this.voiceOffset = opts.voiceOffset || 0;
      this.duration = opts.duration || 21.5;
      this.bgmTracks = opts.bgmTracks || [];
      this.currentTrack = null;
      this.bgmVolume = typeof opts.bgmVolume === 'number' ? opts.bgmVolume : 0.12;
      this.bgmEnabled = true;

      if (this.bgmEl) {
        this.bgmEl.loop = true;
        this.bgmEl.volume = this.bgmVolume;
      }
      if (this.bgmTracks.length > 0) {
        this.selectBgm(this.bgmTracks[0].id, false);
      }
    }

    selectBgm(trackId, autoSync = true) {
      if (!this.bgmEl) return;
      if (trackId === 'off') {
        this.bgmEnabled = false;
        this.bgmEl.pause();
        return;
      }
      const track = this.bgmTracks.find(tr => tr.id === trackId) || this.bgmTracks[0];
      if (!track) return;
      this.bgmEnabled = true;
      this.currentTrack = track;
      const wasPlaying = !this.voiceEl.paused;
      this.bgmEl.src = track.src;
      this.bgmEl.volume = this.bgmVolume;
      if (autoSync) {
        const curT = this.getCurrentTime();
        this.syncBgmTo(curT);
        if (wasPlaying) this.bgmEl.play().catch(() => {});
      }
    }

    setBgmVolume(vol) {
      this.bgmVolume = Math.max(0, Math.min(1, vol));
      if (this.bgmEl) this.bgmEl.volume = this.bgmVolume;
    }

    getCurrentTime() {
      if (!this.voiceEl) return 0;
      return Math.max(0, this.voiceEl.currentTime - this.voiceOffset);
    }

    syncBgmTo(t) {
      if (!this.bgmEl || !this.bgmEnabled || !this.currentTrack) return;
      const startOff = this.currentTrack.startOffset || 0;
      const dur = this.bgmEl.duration && isFinite(this.bgmEl.duration) ? this.bgmEl.duration : 999;
      const target = (t + startOff) % dur;
      if (Math.abs(this.bgmEl.currentTime - target) > 0.12) {
        try { this.bgmEl.currentTime = target; } catch (_) {}
      }
    }

    seekTo(t) {
      const targetVoice = t + this.voiceOffset;
      if (this.voiceEl && Math.abs(this.voiceEl.currentTime - targetVoice) > 0.06) {
        try { this.voiceEl.currentTime = targetVoice; } catch (_) {}
      }
      if (this.videoEl && Math.abs(this.videoEl.currentTime - t) > 0.06) {
        try { this.videoEl.currentTime = t; } catch (_) {}
      }
      this.syncBgmTo(t);
    }

    play() {
      const curT = this.getCurrentTime();
      if (curT >= this.duration - 0.1 || (this.voiceEl && this.voiceEl.currentTime < this.voiceOffset - 0.05)) {
        this.seekTo(0);
      }
      if (this.voiceEl) this.voiceEl.play().catch(() => {});
      if (this.videoEl) this.videoEl.play().catch(() => {});
      if (this.bgmEl && this.bgmEnabled && this.currentTrack) {
        this.syncBgmTo(this.getCurrentTime());
        this.bgmEl.play().catch(() => {});
      }
    }

    pause() {
      if (this.voiceEl) this.voiceEl.pause();
      if (this.videoEl) this.videoEl.pause();
      if (this.bgmEl) this.bgmEl.pause();
    }

    isPaused() {
      return !this.voiceEl || this.voiceEl.paused;
    }
  }

  MHEngine.AudioMixer = AudioMixer;
})(window);
