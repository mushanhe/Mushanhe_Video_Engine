/**
 * Mushanhe Video Engine — Word-Level Highlight Subtitle Renderer
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  class SubtitleRenderer {
    constructor(el, wordData) {
      this.el = el;
      this.words = (wordData && wordData.words) || [];
      this.lines = (wordData && wordData.lines) || [];
      this.lastLineIdx = -1;
    }

    render(t) {
      if (!this.el || !this.lines.length) return;
      let foundIdx = -1;
      for (let i = 0; i < this.lines.length; i++) {
        const L = this.lines[i];
        const t0 = this.words[L.a][1];
        const t1 = this.words[L.b][2] + 0.25;
        if (t >= t0 - 0.05 && t <= t1) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx === -1) {
        this.el.style.opacity = '0';
        this.lastLineIdx = -1;
        return;
      }

      this.el.style.opacity = '1';
      const L = this.lines[foundIdx];
      if (foundIdx !== this.lastLineIdx) {
        let html = '';
        for (let k = L.a; k <= L.b; k++) {
          html += `<span class="w" data-k="${k}">${this.words[k][0]}</span>`;
          if (L.sp && L.sp.includes(k)) html += ' ';
        }
        this.el.innerHTML = html;
        this.lastLineIdx = foundIdx;
      }

      const spans = this.el.querySelectorAll('.w');
      spans.forEach(sp => {
        const k = parseInt(sp.dataset.k, 10);
        const w = this.words[k];
        sp.classList.toggle('active', t >= w[1] && t <= w[2] + 0.08);
        sp.classList.toggle('passed', t > w[2] + 0.08);
      });
    }
  }

  MHEngine.SubtitleRenderer = SubtitleRenderer;
})(window);
