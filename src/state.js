  // Resolve font URLs because resource CSS is injected into the forum page.
  GM_addStyle(GM_getResourceText('katexCSS').replace(/url\((['"]?)fonts\//g,
    'url($1https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/fonts/'));
  const letters = [...'ABCDEFGH'];
  const attempts = new Map();
  const examMode = { active: false, startedAt: 0, endsAt: 0, timerId: null, answers: new Map(), summary: null };
  const reviewRound = { active: false, queue: [], remaining: new Set() };
  const reviewKey = 'fuoReview:' + location.pathname;
  const savedReview = GM_getValue(reviewKey, {});
  const review = new Map(Object.entries(savedReview?.questions || {}));
  let autoExported = Boolean(savedReview?.autoExported);
  let catalog = new Map();

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

  function saveReview() {
    GM_setValue(reviewKey, { questions: Object.fromEntries(review), autoExported });
    flushOcrCache();
  }

  function examName() {
    return document.querySelector('h1.p-title-value')?.textContent.trim()
      || document.querySelector('meta[property="og:title"]')?.content
      || document.title.replace(/\s*\|\s*FuOverflow.*$/i, '').trim() || 'FUOverflow';
  }

  // Attachment filenames are stable; signed URLs and thumbnail URLs are not.
  const questionImage = /^[^<>/\\]+\.(?:webp|jpe?g|png|gif|avif)$/i;

  const titleCache = new WeakMap();
  function attachmentTitle(link) {
    const sig = (link.getAttribute('data-caption') || '') + '\u0000' + (link.getAttribute('title') || '') + '\u0000' + link.textContent;
    const cached = titleCache.get(link);
    if (cached && cached.sig === sig) return cached.title;
    const title = computeAttachmentTitle(link);
    titleCache.set(link, { sig, title });
    return title;
  }

  function computeAttachmentTitle(link) {
    const caption = document.createElement('template');
    caption.innerHTML = link.getAttribute('data-caption') || '';
    const values = [caption.content.querySelector('h4')?.textContent,
      link.querySelector('img')?.alt, link.getAttribute('title'), link.textContent];
    for (const value of values) {
      const title = value?.trim();
      if (questionImage.test(title || '')) return title;
    }
    return null;
  }

  function stableImageURL(value) {
    try { const url = new URL(value, location.href); return url.origin + url.pathname; }
    catch { return ''; }
  }

  // Per-frame index of title -> distinct stable URLs, rebuilt at most once per animation frame.
  let titleIndex = null;
  let titleIndexLinks = null;
  function pageLinks() {
    if (!titleIndexLinks) {
      titleIndexLinks = [...document.querySelectorAll('a[href]')].filter(a => !a.closest('.fancybox__container'));
      requestAnimationFrame(() => { titleIndexLinks = null; titleIndex = null; });
    }
    return titleIndexLinks;
  }
  function questionKey(title, url) {
    if (!titleIndex) {
      titleIndex = new Map();
      for (const a of pageLinks()) {
        const t = attachmentTitle(a);
        if (!t) continue;
        if (!titleIndex.has(t)) titleIndex.set(t, new Set());
        titleIndex.get(t).add(stableImageURL(a.href));
      }
    }
    const urls = titleIndex.get(title);
    // Preserve existing practice keys unless a filename is ambiguous.
    return urls && urls.size > 1 ? title + ' | ' + stableImageURL(url) : title;
  }

  function discoverQuestions(target) {
    const links = pageLinks();
    const source = links.find(a => stableImageURL(a.href) === stableImageURL(target?.image?.src))
      || links.find(a => attachmentTitle(a) === target?.title);
    // Gallery attachments can live outside .bbWrapper.
    const group = source?.getAttribute('data-fancybox');
    const owner = source?.closest('.bbWrapper, .message');
    const candidates = group ? links.filter(a => a.getAttribute('data-fancybox') === group)
      : owner ? [...owner.querySelectorAll('a[href]')] : links;
    const found = new Map();
    for (const a of candidates) {
      const title = attachmentTitle(a);
      if (!title) continue;
      // Arbitrary names follow gallery order; numbered question names keep numeric order.
      const number = title.match(/^Q(\d+)/i)?.[1] || title.match(/\((\d+)\)\.[^.]+$/)?.[1];
      const key = questionKey(title, a.href);
      if (!found.has(key)) found.set(key, { key, title, url: a.href, link: a, number: number ? Number(number) : found.size + 1 });
    }
    catalog = found;
  }

  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportReview() {
    const rows = [['Tên đề', 'Câu hỏi', 'Đã trả lời sai', 'Đánh dấu sao', 'Bạn chọn', 'Đáp án tham khảo', 'Nguồn đáp án', 'Ảnh câu hỏi', 'Link đề']];
    for (const [title, item] of [...review].sort((a, b) => Number(a[0].match(/\d+/)?.[0]) - Number(b[0].match(/\d+/)?.[0]))) {
      if (!item.wrong && !item.starred) continue;
      rows.push([examName(), title, item.wrong ? 'Có' : 'Không', item.starred ? 'Có' : 'Không',
        item.wrongSelected || item.selected || '', item.answer || '', item.source || '', item.url || '', location.href.split('#')[0]]);
    }
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = examName().replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 140) + '_cau-can-on.csv';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return rows.length - 1;
  }

  function maybeExport() {
    if (autoExported || !catalog.size) return;
    const last = [...catalog.values()].sort((a, b) => b.number - a.number)[0];
    // Only successful grading completes a question; viewing AI alone does not.
    const completed = attempts.get(last.key);
    if (!completed?.answer || completed.busy) return;
    exportReview();
    autoExported = true;
    saveReview();
    completed.message += ' · Đã xuất CSV ôn tập.';
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

  function exportAnkiTSV() {
    const exam = examName();
    const examTag = exam.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
      .replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'fuoverflow';
    const threadUrl = location.href.split('#')[0];
    const lines = [];
    for (const [key, item] of [...review].sort((a, b) => (Number(a[0].match(/\d+/)?.[0]) || 0) - (Number(b[0].match(/\d+/)?.[0]) || 0))) {
      if (!item.wrong && !item.starred) continue;
      const title = key.split(' | ')[0];
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

  function buildBackupPayload() {
    return {
      app: 'fuo-reui',
      version: 1,
      exportedAt: new Date().toISOString(),
      pathname: location.pathname,
      examName: examName(),
      review: { questions: Object.fromEntries(review), autoExported },
      ocrCache: { ...persistedOcrCache },
      aiConfig: loadAIConfig()
    };
  }

  function exportBackupJSON() {
    const payload = buildBackupPayload();
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    triggerDownload(blob, safeFilename(examName()) + '_backup_' + date + '.json');
    return Object.keys(payload.review.questions).length;
  }

  function sanitizeReviewQuestions(raw) {
    const clean = new Map();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const [key, item] of Object.entries(raw)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (!key || !item || typeof item !== 'object' || Array.isArray(item)) continue;
      const entry = {};
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

  function importBackupJSON(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('File sao lưu không phải JSON hợp lệ.');
    }
    if (!parsed || typeof parsed !== 'object' || parsed.app !== 'fuo-reui') {
      throw new Error('File JSON không đúng định dạng sao lưu của FUO reUI.');
    }
    const restoredQuestions = sanitizeReviewQuestions(parsed.review?.questions);
    review.clear();
    for (const [k, v] of restoredQuestions) review.set(k, v);
    autoExported = Boolean(parsed.review?.autoExported);
    if (parsed.ocrCache && typeof parsed.ocrCache === 'object') {
      const cleanOcr = sanitizeOcrCache(parsed.ocrCache);
      for (const [k, v] of Object.entries(cleanOcr)) rememberOcrType(k, v);
    }
    if (parsed.aiConfig && typeof parsed.aiConfig === 'object') {
      saveAIConfig(parsed.aiConfig);
    }
    saveReview();
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
    document.body.append(backdrop);
    ankiBtn.focus();
    return backdrop;
  }

  GM_registerMenuCommand('Xuất CSV câu sai / đánh dấu', exportReview);
  GM_registerMenuCommand('Xuất thẻ Anki (.tsv)', exportAnkiTSV);
  GM_registerMenuCommand('Sao lưu / Khôi phục tiến độ (JSON)', () => openBackupModal());
  GM_registerMenuCommand('Bắt đầu lượt luyện đề mới', () => {
    if (!confirm('Xóa kết quả và dấu sao của đề này để bắt đầu lượt mới?')) return;
    GM_setValue(reviewKey, { questions: {}, autoExported: false });
    location.reload();
  });

