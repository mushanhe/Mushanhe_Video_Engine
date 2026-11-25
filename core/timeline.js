/**
 * Mushanhe Video Engine — Word-Level Timeline Resolver
 * 彻底告别手算秒数：所有场景与动效均由 stable-ts 词级时间戳自动触发
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  class TimelineResolver {
    constructor(wordData) {
      this.words = (wordData && wordData.words) || [];
      this.lines = (wordData && wordData.lines) || [];
      this.fps = (wordData && wordData.fps) || 30;
    }

    /**
     * 按词索引获取开始时间（秒）
     */
    wordTime(index, offset = -0.05) {
      if (index == null || !this.words[index]) return 0;
      return Math.max(0, +(this.words[index][1] + offset).toFixed(3));
    }

    /**
     * 按词索引获取结束时间（秒）
     */
    wordEnd(index, offset = 0) {
      if (index == null || !this.words[index]) return 0;
      return Math.max(0, +(this.words[index][2] + offset).toFixed(3));
    }

    /**
     * 通用时间点解析：
     * - number: 直接作为秒数
     * - { word: number, offset?: number, edge?: 'start'|'end' }
     */
    resolve(spec, defaultOffset = -0.05) {
      if (typeof spec === 'number') return Math.max(0, spec);
      if (!spec || typeof spec !== 'object') return 0;
      if (typeof spec.time === 'number') return Math.max(0, spec.time);
      if (typeof spec.word === 'number') {
        const off = typeof spec.offset === 'number' ? spec.offset : defaultOffset;
        return spec.edge === 'end'
          ? this.wordEnd(spec.word, off)
          : this.wordTime(spec.word, off);
      }
      return 0;
    }

    getTotalDuration(fallback = 21.5) {
      if (!this.words.length) return fallback;
      const last = this.words[this.words.length - 1];
      return +(last[2] + 0.45).toFixed(2);
    }
  }

  MHEngine.TimelineResolver = TimelineResolver;
})(window);
