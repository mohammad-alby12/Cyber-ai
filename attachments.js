/* =========================================================
   CYBER AI — attachments.js
   File & image upload: pending tray, base64 encoding, message rendering
   ========================================================= */

const Attachments = (() => {

  const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB per file, frontend-only sanity limit
  const MAX_FILES = 6;

  let pending = []; // [{id, file, name, size, type, isImage, dataUrl, status}]

  const TEXTY_EXT = ['txt', 'md', 'csv', 'json', 'js', 'ts', 'py', 'html', 'css', 'java', 'php', 'cpp', 'c'];

  function genId() {
    return 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function extOf(name) {
    const m = name.match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toLowerCase() : '';
  }

  function fileIcon(name) {
    const ext = extOf(name);
    if (ext === 'pdf') return '<path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M15 2v5h5"/><path d="M9 15h1M9 12h2M9 18h4"/>';
    if (['js', 'ts', 'py', 'java', 'php', 'cpp', 'c', 'html', 'css', 'json'].includes(ext)) {
      return '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/>';
    }
    return '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>';
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsText(file);
    });
  }

  async function addFiles(fileList, onChange) {
    const files = Array.from(fileList);
    if (pending.length + files.length > MAX_FILES) {
      UI.toast(`You can attach up to ${MAX_FILES} files at once.`, 'error');
    }
    const room = Math.max(0, MAX_FILES - pending.length);
    const toAdd = files.slice(0, room);

    for (const file of toAdd) {
      if (file.size > MAX_FILE_BYTES) {
        UI.toast(`${file.name} is too large (max 8MB).`, 'error');
        continue;
      }
      const isImage = file.type.startsWith('image/');
      const item = {
        id: genId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        isImage,
        dataUrl: null,
        textContent: null,
        status: 'loading'
      };
      pending.push(item);
      onChange();

      try {
        if (isImage) {
          item.dataUrl = await readFileAsDataURL(file);
        } else if (TEXTY_EXT.includes(extOf(file.name))) {
          item.textContent = await readFileAsText(file);
        }
        item.status = 'ready';
      } catch (e) {
        item.status = 'error';
        UI.toast(`Unable to read ${file.name}.`, 'error');
      }
      onChange();
    }
  }

  function removeFile(id, onChange) {
    pending = pending.filter(f => f.id !== id);
    onChange();
  }

  function clearPending() {
    pending = [];
  }

  function getPending() {
    return pending;
  }

  function hasPending() {
    return pending.length > 0;
  }

  /* ---------- Rendering: pending tray (before send) ---------- */

  function renderTray(container, onRemove) {
    if (!container) return;
    if (pending.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = pending.map(item => {
      if (item.isImage) {
        return `
          <div class="attachment-chip image-chip" data-att-id="${item.id}">
            ${item.dataUrl ? `<img src="${item.dataUrl}" alt="${UI.escapeHTML(item.name)}">` : ''}
            ${item.status === 'loading' ? '<div class="attachment-uploading"><span class="spinner"></span></div>' : ''}
            <button class="attachment-remove" data-remove-att="${item.id}" type="button" aria-label="Remove attachment">
              <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>`;
      }
      return `
        <div class="attachment-chip file-chip" data-att-id="${item.id}">
          <span class="attachment-file-icon"><svg viewBox="0 0 24 24">${fileIcon(item.name)}</svg></span>
          <div class="attachment-file-info">
            <div class="attachment-file-name">${UI.escapeHTML(item.name)}</div>
            <div class="attachment-file-size">${formatSize(item.size)}</div>
          </div>
          ${item.status === 'loading' ? '<div class="attachment-uploading"><span class="spinner"></span></div>' : ''}
          <button class="attachment-remove" data-remove-att="${item.id}" type="button" aria-label="Remove attachment">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>`;
    }).join('');

    container.querySelectorAll('[data-remove-att]').forEach(btn => {
      btn.addEventListener('click', () => onRemove(btn.dataset.removeAtt));
    });
  }

  /* ---------- Rendering: attachments inside a sent message ---------- */

  function renderInMessage(attachmentsMeta) {
    if (!attachmentsMeta || attachmentsMeta.length === 0) return '';
    const parts = attachmentsMeta.map(a => {
      if (a.isImage) {
        return `
          <div class="msg-attachment-image" data-lightbox-src="${a.dataUrl}">
            <img src="${a.dataUrl}" alt="${UI.escapeHTML(a.name)}" loading="lazy">
          </div>`;
      }
      return `
        <div class="msg-attachment-file">
          <span class="attachment-file-icon"><svg viewBox="0 0 24 24">${fileIcon(a.name)}</svg></span>
          <div class="attachment-file-info">
            <div class="attachment-file-name">${UI.escapeHTML(a.name)}</div>
            <div class="attachment-file-size">${formatSize(a.size)}</div>
          </div>
        </div>`;
    }).join('');
    return `<div class="msg-attachments">${parts}</div>`;
  }

  function bindLightbox(container) {
    if (!container) return;
    container.querySelectorAll('[data-lightbox-src]').forEach(el => {
      el.addEventListener('click', () => {
        openLightbox(el.dataset.lightboxSrc);
      });
    });
  }

  function openLightbox(src) {
    const overlay = document.getElementById('lightbox-overlay');
    const img = document.getElementById('lightbox-img');
    if (!overlay || !img) return;
    img.src = src;
    overlay.classList.add('open');
  }

  function closeLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  /* ---------- Snapshot for persisting into a conversation message ---------- */

  function snapshotForMessage() {
    // Only keep serializable, storage-safe metadata (images kept as dataUrl for redisplay;
    // large text files are inlined as content for the prompt but not duplicated in UI meta).
    return pending
      .filter(f => f.status === 'ready')
      .map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        isImage: f.isImage,
        dataUrl: f.isImage ? f.dataUrl : null,
        textContent: f.textContent || null
      }));
  }

  return {
    addFiles,
    removeFile,
    clearPending,
    getPending,
    hasPending,
    renderTray,
    renderInMessage,
    bindLightbox,
    openLightbox,
    closeLightbox,
    snapshotForMessage,
    formatSize
  };
})();
