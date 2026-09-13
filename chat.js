/* =========================================================
   CYBER AI — chat.js
   Message rendering, markdown, code blocks, conversation logic
   ========================================================= */

const Chat = (() => {

  /* =========================================================
     Minimal markdown renderer (headings, bold, italic, lists,
     links, inline code, fenced code blocks, tables, blockquotes)
     ========================================================= */

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderInline(text) {
    let out = escapeHTML(text);
    // inline code (protect from further transforms)
    const codeStore = [];
    out = out.replace(/`([^`]+)`/g, (_, code) => {
      codeStore.push(code);
      return `\u0000CODE${codeStore.length - 1}\u0000`;
    });
    // bold
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic
    out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    // links
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // restore code
    out = out.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => `<code>${codeStore[parseInt(i, 10)]}</code>`);
    return out;
  }

  function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let i = 0;
    let inList = null; // 'ul' | 'ol'
    let tableBuffer = [];

    function closeList() {
      if (inList) { html += `</${inList}>`; inList = null; }
    }

    function flushTable() {
      if (tableBuffer.length < 2) { tableBuffer = []; return; }
      const header = tableBuffer[0].split('|').map(c => c.trim()).filter(Boolean);
      const rows = tableBuffer.slice(2).map(r => r.split('|').map(c => c.trim()).filter(Boolean));
      html += '<table><thead><tr>';
      header.forEach(h => html += `<th>${renderInline(h)}</th>`);
      html += '</tr></thead><tbody>';
      rows.forEach(r => {
        html += '<tr>';
        r.forEach(c => html += `<td>${renderInline(c)}</td>`);
        html += '</tr>';
      });
      html += '</tbody></table>';
      tableBuffer = [];
    }

    while (i < lines.length) {
      const line = lines[i];

      // fenced code block
      const fenceMatch = line.match(/^```(\w*)\s*$/);
      if (fenceMatch) {
        closeList();
        const lang = fenceMatch[1] || 'text';
        const codeLines = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        const codeId = 'code_' + Math.random().toString(36).slice(2, 9);
        const codeText = codeLines.join('\n');
        const previewable = typeof Preview !== 'undefined' && Preview.isPreviewable(lang, codeText);
        html += `
          <div class="code-block">
            <div class="code-block-head">
              <span class="code-block-lang">${escapeHTML(lang)}</span>
              <div class="code-block-actions">
                ${previewable ? `
                <button data-preview-code="${codeId}" type="button">
                  <span class="icon"><svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></span>
                  Preview
                </button>` : ''}
                <button data-copy-code="${codeId}" type="button">
                  <span class="icon"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg></span>
                  Copy
                </button>
                <button data-download-code="${codeId}" data-lang="${escapeHTML(lang)}" type="button">
                  <span class="icon"><svg viewBox="0 0 24 24"><path d="M12 3v12M6 11l6 6 6-6M5 21h14"/></svg></span>
                  Download
                </button>
              </div>
            </div>
            <pre id="${codeId}">${escapeHTML(codeText)}</pre>
          </div>`;
        continue;
      }

      // table detection
      if (/^\|.*\|$/.test(line.trim()) || (line.includes('|') && lines[i + 1] && /^\s*\|?\s*[-:]+[-:| ]*\s*\|?\s*$/.test(lines[i + 1]))) {
        tableBuffer.push(line);
        i++;
        continue;
      } else if (tableBuffer.length) {
        flushTable();
      }

      // headings
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        closeList();
        const level = h[1].length;
        html += `<h${level}>${renderInline(h[2])}</h${level}>`;
        i++;
        continue;
      }

      // blockquote
      if (/^>\s?/.test(line)) {
        closeList();
        html += `<blockquote>${renderInline(line.replace(/^>\s?/, ''))}</blockquote>`;
        i++;
        continue;
      }

      // unordered list
      if (/^\s*[-*]\s+/.test(line)) {
        if (inList !== 'ul') { closeList(); html += '<ul>'; inList = 'ul'; }
        html += `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ''))}</li>`;
        i++;
        continue;
      }

      // ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        if (inList !== 'ol') { closeList(); html += '<ol>'; inList = 'ol'; }
        html += `<li>${renderInline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`;
        i++;
        continue;
      }

      closeList();

      // blank line
      if (line.trim() === '') { i++; continue; }

      // paragraph
      html += `<p>${renderInline(line)}</p>`;
      i++;
    }

    closeList();
    if (tableBuffer.length) flushTable();
    return html;
  }

  /* =========================================================
     Message DOM builders
     ========================================================= */

  function buildUserMessage(content, attachmentsMeta) {
    const row = document.createElement('div');
    row.className = 'msg-row user';
    const attachmentsHTML = (typeof Attachments !== 'undefined') ? Attachments.renderInMessage(attachmentsMeta) : '';
    row.innerHTML = `
      <div class="msg-avatar">
        <span class="icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg></span>
      </div>
      <div class="msg-col">
        ${attachmentsHTML}
        ${content ? `<div class="msg-bubble">${escapeHTML(content)}</div>` : ''}
      </div>`;
    if (typeof Attachments !== 'undefined') Attachments.bindLightbox(row);
    return row;
  }

  function buildAssistantMessage(modelId, content, isError, errorType) {
    const model = getModel(modelId);
    const row = document.createElement('div');
    row.className = 'msg-row assistant';

    if (isError) {
      row.innerHTML = `
        <div class="msg-avatar"><svg viewBox="0 0 24 24"><path d="${model.icon.match(/d="([^"]+)"/)?.[1] || ''}"/></svg></div>
        <div class="msg-col">
          <div class="error-card">
            <span class="icon"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L2.5 18a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg></span>
            <div class="error-card-body">
              <div class="error-card-title">${errorTitle(errorType)}</div>
              <div class="error-card-desc">${escapeHTML(content)}</div>
              <button class="error-card-retry" data-retry="1" type="button">
                <span class="icon"><svg viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.5 9A9 9 0 003.6 6.4M3.5 15a9 9 0 0016.9 2.6"/></svg></span>
                Retry
              </button>
            </div>
          </div>
        </div>`;
      return row;
    }

    row.innerHTML = `
      <div class="msg-avatar"><svg viewBox="0 0 24 24">${model.icon}</svg></div>
      <div class="msg-col">
        <div class="msg-meta"><span class="model-name">${model.label}</span></div>
        <div class="msg-bubble">${renderMarkdown(content)}</div>
        <div class="msg-actions">
          <button data-action="copy" type="button" aria-label="Copy response">
            <span class="icon"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg></span>
          </button>
          <button data-action="regenerate" type="button" aria-label="Regenerate response">
            <span class="icon"><svg viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.5 9A9 9 0 003.6 6.4M3.5 15a9 9 0 0016.9 2.6"/></svg></span>
          </button>
          <button data-action="like" type="button" aria-label="Like response">
            <span class="icon"><svg viewBox="0 0 24 24"><path d="M7 22V11l5-9 1 1v6h6l1 2-3 11H9a2 2 0 01-2-2z"/></svg></span>
          </button>
          <button data-action="dislike" type="button" aria-label="Dislike response">
            <span class="icon"><svg viewBox="0 0 24 24"><path d="M17 2v11l-5 9-1-1v-6H5l-1-2 3-11h8a2 2 0 012 2z"/></svg></span>
          </button>
        </div>
      </div>`;
    return row;
  }

  function errorTitle(type) {
    switch (type) {
      case 'auth': return 'Invalid API key';
      case 'rate_limit': return 'Rate limit reached';
      case 'timeout': return 'Request timed out';
      case 'network': return 'Network error';
      case 'provider_unavailable': return 'Provider unavailable';
      case 'no_provider': return 'No provider configured';
      case 'empty': return 'Empty response';
      case 'malformed': return 'Malformed response';
      default: return 'Unable to connect to provider';
    }
  }

  function buildThinkingStatus(text) {
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.id = 'thinking-row';
    row.innerHTML = `
      <div class="msg-avatar"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.6.55 1 1.3 1 2.5h6c0-1.2.4-1.95 1-2.5A6 6 0 0012 3z"/></svg></div>
      <div class="msg-col">
        <div class="thinking-status">
          <span class="thinking-dots"><span></span><span></span><span></span></span>
          <span data-thinking-text>${escapeHTML(text)}</span>
        </div>
      </div>`;
    return row;
  }

  function buildTypingIndicator(modelId) {
    const model = getModel(modelId);
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.id = 'typing-row';
    row.innerHTML = `
      <div class="msg-avatar"><svg viewBox="0 0 24 24">${model.icon}</svg></div>
      <div class="msg-col">
        <div class="msg-bubble" style="padding:0;">
          <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    return row;
  }

  function genId() {
    return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function titleFromMessage(text) {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    return trimmed.length > 42 ? trimmed.slice(0, 42) + '…' : (trimmed || 'New conversation');
  }

  return {
    renderMarkdown,
    escapeHTML,
    buildUserMessage,
    buildAssistantMessage,
    buildThinkingStatus,
    buildTypingIndicator,
    genId,
    titleFromMessage
  };
})();
