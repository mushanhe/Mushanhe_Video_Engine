/**
 * Mushanhe Video Engine — Director Review & Feedback Notes Overlay
 * 导演审片打点批注工具：随时暂停记一条带精准时间点/场景/字幕的修改意见，一键复制发给 AI 修改
 */
(function (global) {
  const MHEngine = (global.MHEngine = global.MHEngine || {});

  class ReviewNotes {
    constructor(opts) {
      this.templateId = opts.templateId || 'default';
      this.getCurrentTime = opts.getCurrentTime;
      this.getCurrentSubtitle = opts.getCurrentSubtitle;
      this.getActiveScene = opts.getActiveScene;
      this.pausePlayback = opts.pausePlayback;
      this.seekTo = opts.seekTo;

      this.storageKey = `mh_review_notes_${this.templateId}`;
      this.notes = this.load();
      this.mountUI();
      this.renderList();
      this.updateButtons();
    }

    load() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      } catch (_) {
        return [];
      }
    }

    save() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
      } catch (_) {}
      this.renderList();
      this.updateButtons();
    }

    mountUI() {
      const panel = document.createElement('div');
      panel.id = 'review-panel';
      panel.className = 'hidden';
      panel.innerHTML = `
        <div class="rv-header">
          <span>📝 审片修改意见清单</span>
          <div class="rv-actions">
            <button id="rv-copy-all" title="复制全部意见发给 AI">📋 复制全部</button>
            <button id="rv-clear-all" title="清空清单">清空</button>
            <button id="rv-close" title="收起面板">✕</button>
          </div>
        </div>
        <div class="rv-editor">
          <div class="rv-meta" id="rv-meta">时间点：0.00s</div>
          <textarea id="rv-input" rows="3" placeholder="写下这里的修改意见，例如：字再大一点 / 人像换圆窗 / 节奏慢0.3秒...（Ctrl+Enter 保存）"></textarea>
          <div class="rv-editor-bar">
            <span class="rv-hint">点击下方列表时间可一键跳转回看</span>
            <button id="rv-save-btn">＋ 保存意见</button>
          </div>
        </div>
        <div class="rv-list" id="rv-list"></div>
      `;
      document.body.appendChild(panel);

      this.panelEl = panel;
      this.metaEl = panel.querySelector('#rv-meta');
      this.inputEl = panel.querySelector('#rv-input');
      this.listEl = panel.querySelector('#rv-list');

      panel.querySelector('#rv-close').addEventListener('click', () => this.close());
      panel.querySelector('#rv-save-btn').addEventListener('click', () => this.addCurrentNote());
      panel.querySelector('#rv-copy-all').addEventListener('click', () => this.copyAll());
      panel.querySelector('#rv-clear-all').addEventListener('click', () => {
        if (!this.notes.length) return;
        this.notes = [];
        this.save();
      });

      this.inputEl.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.addCurrentNote();
        } else if (e.key === 'Escape') {
          this.close();
        }
      });

      this.btnAdd = document.getElementById('btn-review-add');
      this.btnCopy = document.getElementById('btn-review-copy');

      if (this.btnAdd) this.btnAdd.addEventListener('click', () => this.openForCurrentTime());
      if (this.btnCopy) this.btnCopy.addEventListener('click', () => this.copyAll());
    }

    openForCurrentTime() {
      if (typeof this.pausePlayback === 'function') this.pausePlayback();
      const t = +(this.getCurrentTime ? this.getCurrentTime() : 0).toFixed(2);
      const sub = this.getCurrentSubtitle ? this.getCurrentSubtitle() : '';
      const scene = this.getActiveScene ? this.getActiveScene(t) : '';
      this.pendingContext = { time: t, subtitle: sub, scene };

      this.metaEl.textContent = `⏱ ${t.toFixed(2)}s${scene ? ` · 场景: ${scene}` : ''}${sub ? ` · 「${sub}」` : ''}`;
      this.panelEl.classList.remove('hidden');
      this.inputEl.focus();
    }

    close() {
      this.panelEl.classList.add('hidden');
    }

    addCurrentNote() {
      const text = this.inputEl.value.trim();
      if (!text) return;
      const ctx = this.pendingContext || {
        time: +(this.getCurrentTime ? this.getCurrentTime() : 0).toFixed(2),
        subtitle: this.getCurrentSubtitle ? this.getCurrentSubtitle() : '',
        scene: ''
      };
      this.notes.push({
        id: Date.now(),
        time: ctx.time,
        scene: ctx.scene,
        subtitle: ctx.subtitle,
        text
      });
      this.notes.sort((a, b) => a.time - b.time);
      this.inputEl.value = '';
      this.save();
    }

    renderList() {
      if (!this.listEl) return;
      if (!this.notes.length) {
        this.listEl.innerHTML = `<div class="rv-empty">暂无修改意见。播放到需要调整的地方，点「📝 提意见」或按 N 键即可打点记录。</div>`;
        return;
      }
      this.listEl.innerHTML = this.notes.map((n, idx) => `
        <div class="rv-item">
          <div class="rv-item-top">
            <button class="rv-jump" data-t="${n.time}">#${idx + 1} · ${n.time.toFixed(2)}s${n.scene ? ` (${n.scene})` : ''}</button>
            <button class="rv-del" data-id="${n.id}" title="删除">✕</button>
          </div>
          ${n.subtitle ? `<div class="rv-item-sub">台词：「${n.subtitle}」</div>` : ''}
          <div class="rv-item-text">${n.text.replace(/</g, '&lt;')}</div>
        </div>
      `).join('');

      this.listEl.querySelectorAll('.rv-jump').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = parseFloat(btn.dataset.t);
          if (typeof this.seekTo === 'function') this.seekTo(t);
        });
      });

      this.listEl.querySelectorAll('.rv-del').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id, 10);
          this.notes = this.notes.filter(x => x.id !== id);
          this.save();
        });
      });
    }

    updateButtons() {
      const count = this.notes.length;
      if (this.btnCopy) {
        this.btnCopy.textContent = count > 0 ? `📋 复制意见 (${count})` : '📋 复制意见';
        this.btnCopy.classList.toggle('on', count > 0);
      }
    }

    formatMarkdown() {
      if (!this.notes.length) return '';
      const lines = [`请按以下审片时间点修改（模板：${this.templateId}）：`, ''];
      this.notes.forEach((n, idx) => {
        const scenePart = n.scene ? ` [${n.scene}]` : '';
        const subPart = n.subtitle ? `（台词：“${n.subtitle}”）` : '';
        lines.push(`${idx + 1}. **${n.time.toFixed(2)}s**${scenePart}${subPart}：${n.text}`);
      });
      return lines.join('\n');
    }

    async copyAll() {
      if (!this.notes.length) {
        this.openForCurrentTime();
        return;
      }
      const md = this.formatMarkdown();
      try {
        await navigator.clipboard.writeText(md);
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = md;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (this.btnCopy) {
        const old = this.btnCopy.textContent;
        this.btnCopy.textContent = '✅ 已复制！粘贴发给AI';
        setTimeout(() => { this.btnCopy.textContent = old; }, 1800);
      }
    }
  }

  MHEngine.ReviewNotes = ReviewNotes;
})(window);
