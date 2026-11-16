// ==UserScript==
// @name         FUOverflow — Luyện đề
// @namespace    fuoverflow-quiz-local
// @version      1.2.0
// @match        https://fuoverflow.com/threads/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      api.deepseek.com
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';
  const letters = [...'ABCDEFGH'];
  const attempts = new Map();

  GM_addStyle(
    '.fancybox__container:has(.fuo-quiz:not([hidden])) .fancybox-sidebar-content:not(.fuo-comments-visible) .js-messageResponses{display:none!important}' +
    '.fancybox-show-sidebar .fancybox-sidebar:has(> .fuo-quiz:not([hidden])){display:flex;flex-direction:column}' +
    '.fancybox-sidebar:has(> .fuo-quiz:not([hidden])) > .fancybox-sidebar-content{flex:1;min-height:0;overflow:auto}' +
    '.fuo-quiz{position:relative;z-index:2;flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px;background:#172030;color:#f1f5f9;font:600 14px/1.4 system-ui}' +
    '.fuo-quiz strong{flex-basis:100%}.fuo-quiz .fuo-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;flex-basis:100%}' +
    '.fuo-quiz[hidden]{display:none}.fuo-quiz button{font:inherit;color:inherit;background:#29364a;border:1px solid #68768c;border-radius:7px;min-height:36px;min-width:36px;padding:4px 9px;cursor:pointer}' +
    '.fuo-quiz button:focus-visible{outline:2px solid white;outline-offset:2px}' +
    '.fuo-quiz button[aria-pressed=true]{background:#15467e;border-color:#93c5fd}' +
    '.fuo-quiz button[data-mark=right]{background:#12452f;border-color:#86efac;color:#bbf7d0}' +
    '.fuo-quiz button[data-mark=wrong]{background:#68252c;border-color:#fca5a5;color:#fee2e2}' +
    '.fuo-quiz [role=status]{flex-basis:100%;text-align:center;color:#dbe6f5;min-height:1.4em}'
  );

  GM_registerMenuCommand('Cài / xóa DeepSeek API key', () => {
    const key = prompt('Nhập DeepSeek API key mới. Để trống để xóa. Khi bình luận thiếu đáp án rõ ràng, script gửi ảnh câu đang chấm đến DeepSeek.');
    if (key !== null) GM_setValue('deepseekKey', key.trim());
  });

  function normalize(value) {
    const options = value.toUpperCase().replace(/[\s,;+&/]/g, '');
    return /^[A-H]{1,8}$/.test(options) && new Set(options).size === options.length
      ? [...options].sort().join('') : '';
  }

  function commentVote(value) {
    const text = value.trim().split('\n')[0].trim();
    const match = text.match(/^(?:(?:đáp án(?:\s+đúng)?|answer|chọn|câu)\s*[:=]?\s*)?([A-H](?:\s*[,;+&/]\s*[A-H]|\s+[A-H]|[A-H]){0,7})(?:[.!?]?$|\s*[:.)–-]\s+.*$|\s+(?:chứ|nhỉ|đúng|nha|nhé)(?:\s.*|[.!?])?$)/iu);
    return match ? normalize(match[1]) : '';
  }

  function consensus(votes) {
    const counts = new Map();
    for (const vote of votes) counts.set(vote, (counts.get(vote) ?? 0) + 1);
    const winner = [...counts].find(([, count]) => count > votes.length / 2);
    // A narrow split such as 3–2 still benefits from the AI fallback.
    return winner && (votes.length === 1 || winner[1] / votes.length >= 2 / 3) ? winner[0] : '';
  }

  const questionImage = /^Q\d+\.(?:webp|jpe?g|png|gif)$/i;

  function currentQuestion(root) {
    const slide = root.querySelector('.fancybox__slide.is-selected');
    const title = slide?.querySelector('.fancybox__caption h4')?.textContent.trim();
    if (!questionImage.test(title ?? '')) return null;
    return { title, image: slide.querySelector('img.fancybox-image') };
  }

  function readVotes(sidebar) {
    const authors = new Set();
    const votes = [];
    for (const comment of sidebar?.querySelectorAll('.js-comment') ?? []) {
      const author = comment.getAttribute('data-author');
      const body = comment.querySelector('.comment-body .bbWrapper');
      if (!body || (author && authors.has(author))) continue;
      const vote = commentVote(body.textContent);
      if (!vote) continue;
      if (author) authors.add(author);
      votes.push(vote);
    }
    return votes;
  }

  async function deepseek(image, key) {
    if (!image?.src) throw new Error('Ảnh chưa tải xong. Hãy thử lại.');
    const url = new URL(image.src, location.href);
    if (url.origin !== location.origin) throw new Error('Không đọc được ảnh câu hỏi từ thread.');
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Không tải được ảnh để gửi DeepSeek.');
    const blob = await response.blob();
    if (!/^image\/(webp|jpeg|png|gif)$/i.test(blob.type)) throw new Error('Ảnh có định dạng không được hỗ trợ.');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Không đọc được dữ liệu ảnh.'));
      reader.readAsDataURL(blob);
    });
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api.deepseek.com/chat/completions',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        anonymous: true,
        timeout: 60000,
        data: JSON.stringify({
          model: 'deepseek-flash',
          messages: [{ role: 'user', content: [
            { type: 'text', text: 'Solve the multiple-choice question in the image. Follow the number of answers requested. Return only the correct letters A through H, separated by commas if needed. If unreadable or uncertain, return UNKNOWN.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
          ] }]
        }),
        onload(result) {
          if (result.status !== 200) {
            reject(new Error('DeepSeek trả lỗi HTTP ' + result.status + '. Kiểm tra API key và số dư.'));
            return;
          }
          try {
            const answer = normalize(JSON.parse(result.responseText).choices[0].message.content.trim());
            if (!answer) throw new Error();
            resolve(answer);
          } catch {
            reject(new Error('DeepSeek chưa xác định được đáp án.'));
          }
        },
        onerror: () => reject(new Error('Không kết nối được DeepSeek.')),
        ontimeout: () => reject(new Error('DeepSeek phản hồi quá lâu. Hãy thử lại.'))
      });
    });
  }

  async function waitForComments(root, title) {
    const deadline = Date.now() + 3000;
    while (currentQuestion(root)?.title === title && root.isConnected) {
      const content = root.querySelector('.fancybox-sidebar-content');
      if (content?.querySelector('.xfmgInfoBlock-title h2')?.textContent.trim() === title) {
        return content;
      }
      if (Date.now() >= deadline) return null;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return null;
  }

  function mount(root, sidebar) {
    const panel = document.createElement('section');
    panel.className = 'fuo-quiz';
    panel.setAttribute('aria-label', 'Trả lời câu hỏi');
    const title = document.createElement('strong');
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    const comments = document.createElement('button');
    const reset = document.createElement('button');
    const options = document.createElement('div');
    options.className = 'fuo-options';
    comments.type = reset.type = 'button';
    reset.textContent = 'Làm lại';

    let question, state;
    let showComments = false;
    function syncComments() {
      const content = sidebar.querySelector('.fancybox-sidebar-content');
      const matchesQuestion = question &&
        content?.querySelector('.xfmgInfoBlock-title h2')?.textContent.trim() === question.title;
      content?.classList.toggle('fuo-comments-visible', Boolean(showComments && matchesQuestion));
      comments.textContent = showComments ? 'Ẩn bình luận' : 'Hiện bình luận';
      comments.setAttribute('aria-expanded', String(showComments));
    }
    comments.onclick = () => {
      showComments = !showComments;
      syncComments();
    };
    const buttons = letters.map(letter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.onclick = () => grade(letter);
      return button;
    });

    function render() {
      panel.hidden = !state;
      if (!state) return;
      title.textContent = question.title.replace(/\.[^.]+$/, '');
      for (const [index, button] of buttons.entries()) {
        const letter = letters[index];
        const selected = state.selected === letter;
        const right = state.answer.includes(letter);
        const wrong = state.answer && selected && !right;
        button.textContent = letter + (right ? ' ✓' : wrong ? ' ✗' : '');
        button.dataset.mark = right ? 'right' : wrong ? 'wrong' : '';
        button.setAttribute('aria-pressed', String(selected));
        button.disabled = Boolean(state.busy || state.answer);
      }
      reset.disabled = state.busy || !state.selected;
      status.textContent = state.message || 'Bấm một đáp án để chấm ngay.';
    }

    reset.onclick = () => {
      state.selected = '';
      state.answer = '';
      state.message = '';
      render();
    };

    async function grade(letter) {
      const target = currentQuestion(root);
      if (!state || !target || target.title !== question.title || state.busy || state.answer) return;
      const submission = state;
      submission.selected = letter;
      submission.busy = true;
      submission.message = 'Đang kiểm tra đáp án…';
      render();
      try {
        const content = await waitForComments(root, target.title);
        if (!root.isConnected || currentQuestion(root)?.title !== target.title) {
          submission.selected = '';
          submission.message = '';
          return;
        }
        const votes = readVotes(content);
        let answer = consensus(votes);
        let source = votes.length === 1 ? '1 bình luận' : 'đa số bình luận';
        if (!answer) {
          const key = GM_getValue('deepseekKey', '');
          if (!key) {
            const reason = !content ? 'Bình luận chưa tải xong. Bấm lại đáp án để thử lại.'
              : votes.length ? 'Bình luận chưa có đa số rõ ràng.' : 'Chưa tìm thấy đáp án trong bình luận.';
            throw new Error(reason + ' Có thể cài DeepSeek API key trong menu Tampermonkey.');
          }
          answer = await deepseek(target.image, key);
          source = 'DeepSeek · đáp án tham khảo';
        }
        submission.answer = answer;
        const correct = answer.includes(letter);
        const result = answer.length > 1
          ? (correct ? 'Lựa chọn đúng' : 'Lựa chọn sai') + ' · Câu có nhiều đáp án'
          : (correct ? 'Đúng' : 'Sai');
        submission.message = result + ' · Nguồn ' + source;
      } catch (error) {
        submission.message = error.message || 'Chưa chấm được câu này.';
      } finally {
        submission.busy = false;
        if (state === submission) render();
      }
    }

    panel.hidden = true;
    options.append(...buttons);
    panel.append(title, options, reset, comments, status);
    sidebar.prepend(panel);
    return () => {
      const next = currentQuestion(root);
      if (question?.title === next?.title) {
        const content = sidebar.querySelector('.fancybox-sidebar-content');
        const visible = Boolean(showComments && question &&
          content?.querySelector('.xfmgInfoBlock-title h2')?.textContent.trim() === question.title);
        content?.classList.toggle('fuo-comments-visible', visible);
        return;
      }
      question = next;
      showComments = false;
      syncComments();
      if (question && !attempts.has(question.title)) {
        attempts.set(question.title, { selected: '', answer: '', message: '', busy: false });
      }
      state = question ? attempts.get(question.title) : null;
      render();
    };
  }

  const sidebars = new WeakMap();
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      for (const root of document.querySelectorAll('.fancybox__container')) {
        const sidebar = root.querySelector('.fancybox-sidebar');
        if (!sidebar) continue;
        if (!sidebars.has(sidebar)) sidebars.set(sidebar, mount(root, sidebar));
        sidebars.get(sidebar)();
      }
    });
  }
  new MutationObserver(schedule).observe(document, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'src']
  });
  window.addEventListener('resize', schedule);
  schedule();
})();
