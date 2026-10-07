(() => {
  'use strict';

  const STORAGE_KEY = 'ghostCanyonPlaytestV2';
  const modal = document.querySelector('#feedbackModal');
  const form = document.querySelector('#feedbackForm');
  const error = document.querySelector('#feedbackError');
  const countLabel = document.querySelector('#feedbackCount');

  function readAll() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function refreshCount() {
    const count = readAll().length;
    countLabel.textContent = `本机已保存 ${count} 份`;
  }

  function open() {
    error.textContent = '';
    modal.hidden = false;
    const first = form.querySelector('select');
    if (first) first.focus();
  }

  function close() {
    modal.hidden = true;
  }

  function download() {
    const records = readAll();
    if (!records.length) {
      open();
      error.textContent = '还没有试玩反馈；完成一局后可填写并保存。';
      return;
    }
    const payload = {
      project: '幽影峡谷 · 幽影守卫',
      exportedAt: new Date().toISOString(),
      storage: 'local-only',
      records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ghost-canyon-playtest-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  document.querySelector('#feedbackOpen').addEventListener('click', open);
  document.querySelector('#feedbackOpen2').addEventListener('click', open);
  document.querySelector('#exportFeedbackBtn').addEventListener('click', download);
  modal.querySelectorAll('[data-close-feedback]').forEach((node) => node.addEventListener('click', close));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.rating || !values.readability || !values.difficulty) {
      error.textContent = '请先完成总体体验、招式易读性和难度三项。';
      return;
    }
    const game = window.ghostCanyonScene;
    const run = game && typeof game.getRunSummary === 'function' ? game.getRunSummary() : null;
    const record = {
      id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `gc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      survey: {
        rating: Number(values.rating),
        readability: Number(values.readability),
        difficulty: values.difficulty,
        favoriteDefense: values.favoriteDefense || '',
        comment: (values.comment || '').trim(),
      },
      run,
    };
    try {
      const records = readAll();
      records.push(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (_) {
      error.textContent = '浏览器无法保存本机记录；可检查本地存储空间或浏览器隐私设置。';
      return;
    }
    refreshCount();
    form.reset();
    close();
    const note = document.querySelector('#feedback');
    note.textContent = '反馈已保存在当前浏览器本机；可使用“导出记录”下载 JSON。';
  });

  refreshCount();
  window.ghostCanyonFeedback = { open, close, readAll, download, refreshCount };
})();
