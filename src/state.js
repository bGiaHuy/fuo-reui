  // Resolve font URLs because resource CSS is injected into the forum page.
  GM_addStyle(GM_getResourceText('katexCSS').replace(/url\((['"]?)fonts\//g,
    'url($1https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/fonts/'));
  const letters = [...'ABCDEFGH'];
  const attempts = new Map();
  const examMode = { active: false, startedAt: 0, endsAt: 0, timerId: null, answers: new Map(), summary: null };
  const reviewRound = { active: false, queue: [], remaining: new Set() };
  const reviewCache = new Map();
  let activeExamInfo = null;
  let catalog = new Map();

  function defaultExamInfo() {
    const path = location.pathname.startsWith('/threads/') ? location.pathname : '/threads/unknown/';
    return {
      path,
      name: document.title.replace(/\s*\|\s*FuOverflow.*$/i, '').trim() || 'FUOverflow',
      threadUrl: location.origin + path
    };
  }

  function getExamInfo(root) {
    const scopeLinks = [
      ...(root ? [...root.querySelectorAll('a[href*="/threads/"]')] : []),
      ...document.querySelectorAll('nav[aria-label="Đường dẫn"] a[href*="/threads/"]'),
      ...document.querySelectorAll('a[href*="/threads/"]')
    ];
    for (const link of scopeLinks) {
      const href = link.getAttribute('href');
      if (!href) continue;
      let parsed;
      try {
        parsed = new URL(href, location.origin);
      } catch {
        continue;
      }
      if (!parsed.pathname.includes('/threads/')) continue;
      const path = parsed.pathname.endsWith('/') ? parsed.pathname : parsed.pathname + '/';
      const linkText = link.textContent.trim();
      const breadcrumbText = document.querySelector('nav[aria-label="Đường dẫn"] a[href*="/threads/"]')?.textContent.trim();
      const h1Text = document.querySelector('main h1')?.textContent.replace(/\s*[—–-]\s*ảnh\s+\d+\s*\/\s*\d+.*$/i, '').trim();
      const name = (linkText && !/^bài viết gốc$/i.test(linkText) ? linkText : '')
        || breadcrumbText
        || h1Text
        || document.title.replace(/\s*[—–-]\s*ảnh\s+\d+\s*\/\s*\d+.*$/i, '').replace(/\s*\|\s*FuOverflow.*$/i, '').trim()
        || 'FUOverflow';
      return {
        path,
        name,
        threadUrl: location.origin + path
      };
    }
    if (location.pathname.startsWith('/media/')) {
      const h1Text = document.querySelector('main h1')?.textContent.replace(/\s*[—–-]\s*ảnh\s+\d+\s*\/\s*\d+.*$/i, '').trim();
      const path = location.pathname;
      return {
        path,
        name: h1Text || document.title.replace(/\s*\|\s*FuOverflow.*$/i, '').trim() || 'FUOverflow',
        threadUrl: location.origin + path
      };
    }
    return defaultExamInfo();
  }

  function getReviewStore(examInfo) {
    const info = examInfo || activeExamInfo || defaultExamInfo();
    if (!reviewCache.has(info.path)) {
      const saved = GM_getValue('fuoReview:' + info.path, {});
      reviewCache.set(info.path, {
        questions: new Map(Object.entries(saved?.questions || {})),
        autoExported: Boolean(saved?.autoExported)
      });
    }
    return reviewCache.get(info.path);
  }

  function currentReview(examInfo) {
    return getReviewStore(examInfo).questions;
  }

  function examName(examInfo) {
    return (examInfo || activeExamInfo || getExamInfo(document)).name;
  }

  const MAX_OCR_CACHE = 1000;
  function sanitizeOcrCache(raw) {
    const clean = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    let count = 0;
    for (const [k, v] of Object.entries(raw)) {
      if (count >= MAX_OCR_CACHE) break;
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (typeof k === 'string' && k && (v === 'single' || v === 'multiple')) {
        clean[k] = v;
        count++;
      }
    }
    return clean;
  }
  const persistedOcrCache = sanitizeOcrCache(GM_getValue('fuoOcrTypeCache', {}));
  let ocrCacheDirty = false;
  function rememberOcrType(cacheKey, value) {
    if (!cacheKey || (value !== 'single' && value !== 'multiple')) return;
    if (persistedOcrCache[cacheKey] === value) return;
    const keys = Object.keys(persistedOcrCache);
    if (keys.length >= MAX_OCR_CACHE) delete persistedOcrCache[keys[0]];
    persistedOcrCache[cacheKey] = value;
    ocrCacheDirty = true;
  }
  function flushOcrCache() {
    if (!ocrCacheDirty) return;
    GM_setValue('fuoOcrTypeCache', { ...persistedOcrCache });
    ocrCacheDirty = false;
  }
  window.addEventListener('pagehide', flushOcrCache);

  function saveReview(examInfo) {
    const info = examInfo || activeExamInfo || defaultExamInfo();
    const store = getReviewStore(info);
    GM_setValue('fuoReview:' + info.path, {
      questions: Object.fromEntries(store.questions),
      autoExported: store.autoExported
    });
    flushOcrCache();
  }

  function stableImageURL(value) {
    try { const url = new URL(value, location.href); return url.origin + url.pathname; }
    catch { return ''; }
  }

  function discoverQuestions(ctx, target) {
    const next = new Map(catalog);
    const thumbButtons = [...(ctx?.root?.querySelectorAll('nav[aria-label="Ảnh thu nhỏ"] li button') || [])];
    for (let i = 0; i < thumbButtons.length; i++) {
      const idx = i + 1;
      if (target?.index === idx) {
        next.set(target.key, {
          key: target.key,
          title: target.title,
          url: target.mediaUrl,
          index: idx,
          thumb: thumbButtons[i]
        });
      }
    }
    if (target?.key) {
      next.set(target.key, {
        key: target.key,
        title: target.title,
        url: target.mediaUrl,
        index: target.index || next.size + 1,
        thumb: target.index && thumbButtons[target.index - 1] ? thumbButtons[target.index - 1] : null
      });
    }
    catalog = next;
  }

  function sortReviewEntries(entries) {
    return [...entries].sort((a, b) => {
      const numA = a[1]?.index || Number(a[0].match(/\d+/)?.[0]) || 0;
      const numB = b[1]?.index || Number(b[0].match(/\d+/)?.[0]) || 0;
      return numA - numB || a[0].localeCompare(b[0]);
    });
  }

  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function safeFilename(base) {
    return base.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 140) || 'FUOverflow';
  }

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function exportReview(examInfo) {
    const info = examInfo || activeExamInfo || getExamInfo(document);
    const store = getReviewStore(info);
    const rows = [['Tên đề', 'Câu hỏi', 'Đã trả lời sai', 'Đánh dấu sao', 'Bạn chọn', 'Đáp án tham khảo', 'Nguồn đáp án', 'Ảnh câu hỏi', 'Link đề']];
    for (const [key, item] of sortReviewEntries(store.questions)) {
      if (!item.wrong && !item.starred) continue;
      rows.push([
        info.name,
        item.title || key,
        item.wrong ? 'Có' : 'Không',
        item.starred ? 'Có' : 'Không',
        item.wrongSelected || item.selected || '',
        item.answer || '',
        item.source || '',
        item.url || '',
        info.threadUrl
      ]);
    }
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, safeFilename(info.name) + '_cau-can-on.csv');
    return rows.length - 1;
  }

  function maybeExport(target, submission) {
    const exam = target?.exam || activeExamInfo;
    if (!exam) return;
    const store = getReviewStore(exam);
    if (store.autoExported) return;
    const isFinal = Boolean(target?.index && target?.total && target.index >= target.total);
    if (!isFinal) return;
    if (!submission?.answer || submission.busy) return;
    exportReview(exam);
    store.autoExported = true;
    saveReview(exam);
    submission.message += ' · Đã xuất CSV ôn tập.';
  }

  function exportAnkiTSV(examInfo) {
    const info = examInfo || activeExamInfo || getExamInfo(document);
    const store = getReviewStore(info);
    const exam = info.name;
    const examTag = exam.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
      .replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'fuoverflow';
    const threadUrl = info.threadUrl;
    const lines = [];
    for (const [key, item] of sortReviewEntries(store.questions)) {
      if (!item.wrong && !item.starred) continue;
      const title = item.title || key.split(' | ')[0];
      const imgHref = item.url || '';
      const front = escapeHtml(exam + ' — ' + title)
        + (imgHref ? '<br><a href="' + escapeHtml(imgHref) + '">Xem ảnh câu hỏi</a>' : '');
      const backParts = ['<b>Đáp án:</b> ' + escapeHtml(item.answer || 'Chưa có')];
      const picked = item.wrongSelected || item.selected || '';
      if (picked) backParts.push('<b>Bạn chọn:</b> ' + escapeHtml(picked));
      if (item.source) backParts.push('<b>Nguồn:</b> ' + escapeHtml(item.source));
      backParts.push('<a href="' + escapeHtml(threadUrl) + '">Mở đề trên FUOverflow</a>');
      const tags = ['fuoverflow', examTag];
      if (item.wrong) tags.push('sai');
      if (item.starred) tags.push('danh-dau');
      lines.push([front, backParts.join('<br>'), tags.join(' ')].map(c => c.replace(/[\t\r\n]+/g, ' ')).join('\t'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/tab-separated-values;charset=utf-8;' });
    triggerDownload(blob, safeFilename(exam) + '_anki.tsv');
    return lines.length;
  }

  function buildBackupPayload(examInfo) {
    const info = examInfo || activeExamInfo || getExamInfo(document);
    const store = getReviewStore(info);
    return {
      app: 'fuo-reui',
      version: 1,
      exportedAt: new Date().toISOString(),
      pathname: info.path,
      examName: info.name,
      review: { questions: Object.fromEntries(store.questions), autoExported: store.autoExported },
      ocrCache: { ...persistedOcrCache },
      aiConfig: loadAIConfig()
    };
  }

  function exportBackupJSON(examInfo) {
    const info = examInfo || activeExamInfo || getExamInfo(document);
    const payload = buildBackupPayload(info);
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    triggerDownload(blob, safeFilename(info.name) + '_backup_' + date + '.json');
    return Object.keys(payload.review.questions).length;
  }

  function sanitizeReviewQuestions(raw) {
    const clean = new Map();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const [key, item] of Object.entries(raw)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (!key || !item || typeof item !== 'object' || Array.isArray(item)) continue;
      const entry = {};
      if (typeof item.title === 'string') entry.title = item.title.slice(0, 120);
      if (Number.isFinite(item.index) && item.index > 0) entry.index = Math.floor(item.index);
      if (typeof item.selected === 'string') entry.selected = item.selected.slice(0, 16);
      if (typeof item.answer === 'string') entry.answer = item.answer.slice(0, 16);
      if (typeof item.source === 'string') entry.source = item.source.slice(0, 120);
      if (typeof item.url === 'string') entry.url = item.url.slice(0, 1024);
      if (typeof item.wrongSelected === 'string') entry.wrongSelected = item.wrongSelected.slice(0, 16);
      if (item.wrong) entry.wrong = true;
      if (item.starred) entry.starred = true;
      clean.set(key, entry);
    }
    return clean;
  }

  function importBackupJSON(rawText, examInfo) {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('File sao lưu không phải JSON hợp lệ.');
    }
    if (!parsed || typeof parsed !== 'object' || parsed.app !== 'fuo-reui') {
      throw new Error('File JSON không đúng định dạng sao lưu của FUO reUI.');
    }
    const info = examInfo || activeExamInfo || getExamInfo(document);
    const store = getReviewStore(info);
    const restoredQuestions = sanitizeReviewQuestions(parsed.review?.questions);
    store.questions.clear();
    for (const [k, v] of restoredQuestions) store.questions.set(k, v);
    store.autoExported = Boolean(parsed.review?.autoExported);
    if (parsed.ocrCache && typeof parsed.ocrCache === 'object') {
      const cleanOcr = sanitizeOcrCache(parsed.ocrCache);
      for (const [k, v] of Object.entries(cleanOcr)) rememberOcrType(k, v);
    }
    if (parsed.aiConfig && typeof parsed.aiConfig === 'object') {
      saveAIConfig(parsed.aiConfig);
    }
    saveReview(info);
    notifyAIConfigChanged();
    return restoredQuestions.size;
  }

  function openBackupModal(openerEl) {
    const existing = document.querySelector('.fuo-settings-backdrop');
    if (existing) existing.remove();
    const returnFocusTo = openerEl instanceof HTMLElement
      ? openerEl
      : document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const backdrop = document.createElement('div');
    backdrop.className = 'fuo-settings-backdrop';
    const dialog = document.createElement('div');
    dialog.className = 'fuo-settings-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'fuo-backup-title');
    dialog.tabIndex = -1;

    const header = document.createElement('div');
    header.className = 'fuo-settings-header';
    const heading = document.createElement('h2');
    heading.id = 'fuo-backup-title';
    heading.textContent = 'Sao lưu & Xuất dữ liệu';
    const closeTopBtn = document.createElement('button');
    closeTopBtn.type = 'button';
    closeTopBtn.className = 'fuo-settings-close';
    closeTopBtn.setAttribute('aria-label', 'Đóng hộp thoại');
    closeTopBtn.textContent = '×';
    header.append(heading, closeTopBtn);

    const note = document.createElement('div');
    note.className = 'fuo-backup-note';
    note.textContent = 'Dữ liệu lưu cục bộ trên máy bạn. Bản sao lưu JSON gồm tiến độ làm bài, câu sai/gắn sao, cache OCR và cấu hình AI (không chứa API key).';

    const row = document.createElement('div');
    row.className = 'fuo-settings-row';
    const ankiBtn = document.createElement('button');
    ankiBtn.type = 'button';
    ankiBtn.textContent = 'Xuất Anki (.tsv)';
    const exportJsonBtn = document.createElement('button');
    exportJsonBtn.type = 'button';
    exportJsonBtn.textContent = 'Sao lưu JSON';
    const importJsonBtn = document.createElement('button');
    importJsonBtn.type = 'button';
    importJsonBtn.textContent = 'Khôi phục JSON';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.hidden = true;
    row.append(ankiBtn, exportJsonBtn, importJsonBtn, fileInput);

    const alertBox = document.createElement('div');
    alertBox.className = 'fuo-settings-alert';
    alertBox.setAttribute('role', 'alert');
    alertBox.hidden = true;

    function showStatus(msg, tone = 'notice') {
      alertBox.textContent = msg;
      alertBox.dataset.tone = tone;
      alertBox.hidden = !msg;
    }

    ankiBtn.onclick = () => {
      const count = exportAnkiTSV();
      showStatus('Đã xuất file Anki (.tsv): ' + count + ' thẻ.', 'notice');
    };
    exportJsonBtn.onclick = () => {
      const count = exportBackupJSON();
      showStatus('Đã tải bản sao lưu JSON (' + count + ' câu đã lưu).', 'notice');
    };
    importJsonBtn.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const count = importBackupJSON(text);
        showStatus('Đã khôi phục ' + count + ' câu từ bản sao lưu JSON.', 'notice');
      } catch (err) {
        showStatus(err?.message || 'Không đọc được file sao lưu.', 'error');
      }
    };

    const footer = document.createElement('div');
    footer.className = 'fuo-settings-footer';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Đóng';
    footer.append(closeBtn);

    function close() {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      if (returnFocusTo && returnFocusTo.isConnected) returnFocusTo.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    }
    closeTopBtn.onclick = close;
    closeBtn.onclick = close;
    backdrop.onclick = e => { if (e.target === backdrop) close(); };
    document.addEventListener('keydown', onKey);

    dialog.append(header, note, row, alertBox, footer);
    backdrop.append(dialog);
    let modalHost = document.body;
    try { modalHost = document.querySelector('dialog:modal') || document.body; } catch {}
    modalHost.append(backdrop);
    ankiBtn.focus();
    return backdrop;
  }

  GM_registerMenuCommand('Xuất CSV câu sai / đánh dấu', () => exportReview(activeExamInfo || getExamInfo(document)));
  GM_registerMenuCommand('Xuất thẻ Anki (.tsv)', () => exportAnkiTSV(activeExamInfo || getExamInfo(document)));
  GM_registerMenuCommand('Sao lưu / Khôi phục tiến độ (JSON)', () => openBackupModal());
  GM_registerMenuCommand('Bắt đầu lượt luyện đề mới', () => {
    const info = activeExamInfo || getExamInfo(document);
    if (!confirm('Xóa kết quả và dấu sao của đề này để bắt đầu lượt mới?')) return;
    GM_setValue('fuoReview:' + info.path, { questions: {}, autoExported: false });
    reviewCache.delete(info.path);
    location.reload();
  });
