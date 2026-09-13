/* =========================================================
   CYBER AI — preview.js
   Live-render HTML/CSS/JS code blocks in a side canvas panel
   ========================================================= */

const Preview = (() => {

  let currentBlocks = null; // { html, css, js, title }
  let currentTab = 'render';

  const PREVIEWABLE_LANGS = ['html', 'htm', 'xhtml'];

  function isPreviewable(lang, code) {
    const l = (lang || '').toLowerCase();
    if (PREVIEWABLE_LANGS.includes(l)) return true;
    // Heuristic: raw code that clearly contains an HTML document/structure
    if (!l || l === 'text') {
      return /<\/?(html|body|div|svg)[\s>]/i.test(code) && /<[a-z]/i.test(code);
    }
    return false;
  }

  function buildDocument(htmlCode) {
    // If it's a full document already, use as-is. Otherwise wrap fragment.
    const hasDoctypeOrHtml = /<html[\s>]/i.test(htmlCode);
    if (hasDoctypeOrHtml) return htmlCode;
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body{font-family:sans-serif;margin:16px;}</style></head>
<body>
${htmlCode}
</body>
</html>`;
  }

  function open(code, lang, title) {
    currentBlocks = { html: buildDocument(code), raw: code, title: title || 'Preview' };
    currentTab = 'render';

    const panel = document.getElementById('preview-panel');
    const titleEl = document.getElementById('preview-title');
    const emptyState = document.getElementById('preview-empty-state');
    const iframe = document.getElementById('preview-iframe');
    const errorBanner = document.getElementById('preview-error-banner');

    titleEl.textContent = currentBlocks.title;
    emptyState.style.display = 'none';
    errorBanner.classList.remove('show');

    renderIframe();
    updateCodeView();
    setActiveTab('render');

    panel.classList.add('open');
    document.body.classList.add('preview-active');
  }

  function renderIframe() {
    const iframe = document.getElementById('preview-iframe');
    const errorBanner = document.getElementById('preview-error-banner');
    const errorText = document.getElementById('preview-error-text');
    if (!currentBlocks) return;

    iframe.style.display = 'block';
    errorBanner.classList.remove('show');

    // Listen once for runtime errors surfaced by the injected handler
    const messageHandler = (e) => {
      if (e.data && e.data.__cyberPreviewError) {
        errorText.textContent = e.data.message || 'A script error occurred in the preview.';
        errorBanner.classList.add('show');
      }
    };
    window.removeEventListener('message', window.__cyberPreviewMsgHandler || (() => {}));
    window.__cyberPreviewMsgHandler = messageHandler;
    window.addEventListener('message', messageHandler);

    const errorTrapScript = `
      <script>
        window.onerror = function(msg) {
          window.parent.postMessage({ __cyberPreviewError: true, message: String(msg) }, '*');
          return true;
        };
      </script>`;

    let doc = currentBlocks.html;
    if (/<head[\s>]/i.test(doc)) {
      doc = doc.replace(/<head([^>]*)>/i, `<head$1>${errorTrapScript}`);
    } else {
      doc = errorTrapScript + doc;
    }

    iframe.srcdoc = doc;
  }

  function updateCodeView() {
    const codeText = document.getElementById('preview-code-text');
    if (currentBlocks) codeText.textContent = currentBlocks.raw;
  }

  function setActiveTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.preview-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.previewTab === tab);
    });
    const iframe = document.getElementById('preview-iframe');
    const codeView = document.getElementById('preview-code-view');
    if (tab === 'render') {
      iframe.style.display = currentBlocks ? 'block' : 'none';
      codeView.classList.remove('active');
    } else {
      iframe.style.display = 'none';
      codeView.classList.add('active');
    }
  }

  function refresh() {
    if (!currentBlocks) return;
    const btn = document.getElementById('btn-preview-refresh');
    btn.classList.add('spin');
    setTimeout(() => btn.classList.remove('spin'), 500);
    renderIframe();
  }

  function openInNewTab() {
    if (!currentBlocks) return;
    const blob = new Blob([currentBlocks.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function close() {
    document.getElementById('preview-panel').classList.remove('open');
    document.body.classList.remove('preview-active');
    const mainCol = document.querySelector('.main-col');
    if (mainCol) mainCol.style.marginRight = '';
    const panel = document.getElementById('preview-panel');
    if (panel) panel.style.width = '';
  }

  function isOpen() {
    return document.getElementById('preview-panel').classList.contains('open');
  }

  function bindGlobalControls() {
    document.querySelectorAll('.preview-tab').forEach(tab => {
      tab.addEventListener('click', () => setActiveTab(tab.dataset.previewTab));
    });
    document.getElementById('btn-preview-refresh').addEventListener('click', refresh);
    document.getElementById('btn-preview-newtab').addEventListener('click', openInNewTab);
    document.getElementById('btn-preview-close').addEventListener('click', close);

    const handle = document.getElementById('preview-resize-handle');
    const panel = document.getElementById('preview-panel');
    let dragging = false;

    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      handle.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(Math.max(newWidth, 380), Math.min(900, window.innerWidth - 260));
      panel.style.width = clamped + 'px';
      if (window.innerWidth > 1024) {
        document.querySelector('.main-col').style.marginRight = clamped + 'px';
      }
    });
    window.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        handle.classList.remove('dragging');
      }
    });
  }

  return {
    isPreviewable,
    open,
    close,
    refresh,
    openInNewTab,
    isOpen,
    bindGlobalControls
  };
})();
