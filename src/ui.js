  function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  }

  function orderedReviewKeys(predicate) {
    const matched = [];
    const seen = new Set();
    for (const [key] of catalog) {
      const item = review.get(key);
      if (item && predicate(item)) {
        matched.push(key);
        seen.add(key);
      }
    }
    const extra = [];
    for (const [key, item] of review) {
      if (!seen.has(key) && item && predicate(item)) extra.push(key);
    }
    extra.sort((a, b) => (Number(a.match(/\d+/)?.[0]) || 0) - (Number(b.match(/\d+/)?.[0]) || 0));
    return matched.concat(extra);
  }

  function computeProgress() {
    const keys = new Set([...catalog.keys(), ...attempts.keys(), ...review.keys()]);
    let answered = 0;
    let right = 0;
    for (const key of keys) {
      const att = attempts.get(key);
      const rev = review.get(key);
      const answer = att?.answer || rev?.answer || '';
      if (!answer) continue;
      answered++;
      const selected = att?.answer ? att.selected : (rev?.selected || '');
      if (selected && selected === answer) right++;
    }
    const wrongKeys = orderedReviewKeys(item => Boolean(item.wrong));
    const starredKeys = orderedReviewKeys(item => Boolean(item.starred));
    return { total: catalog.size, answered, right, wrongKeys, starredKeys };
  }

  function jumpToQuestion(root, key) {
    const entry = catalog.get(key);
    const targetUrl = entry?.url || review.get(key)?.url || '';
    const targetStable = targetUrl ? stableImageURL(targetUrl) : '';
    const targetTitle = entry?.title || key.split(' | ')[0];

    const fb = typeof window.Fancybox?.getInstance === 'function' ? window.Fancybox.getInstance() : null;
    if (fb && typeof fb.jumpTo === 'function' && Array.isArray(fb.carousel?.slides)) {
      const idx = fb.carousel.slides.findIndex(slide => {
        const src = slide?.src || slide?.thumbSrc || '';
        return (targetStable && stableImageURL(src) === targetStable)
          || (slide?.caption && String(slide.caption).includes(targetTitle));
      });
      if (idx >= 0) {
        fb.jumpTo(idx);
        return true;
      }
    }

    const catalogKeys = [...catalog.keys()];
    const catalogIndex = catalogKeys.indexOf(key);
    const thumbs = [...root.querySelectorAll('.fancybox__thumb, .f-thumbs__slide')];
    if (catalogIndex >= 0 && thumbs[catalogIndex]) {
      thumbs[catalogIndex].click();
      return true;
    }

    if (entry?.link?.isConnected) {
      entry.link.click();
      return true;
    }

    const links = [...document.querySelectorAll('a[href]')].filter(a => !a.closest('.fancybox__container'));
    const fallbackLink = links.find(a => {
      const title = attachmentTitle(a);
      return (title && questionKey(title, a.href) === key)
        || (targetStable && stableImageURL(a.href) === targetStable);
    });
    if (fallbackLink) {
      fallbackLink.click();
      return true;
    }
    return false;
  }

  function mount(root, sidebar) {
    const panel = document.createElement('section');
    panel.className = 'fuo-quiz';
    panel.setAttribute('aria-label', 'Trả lời câu hỏi');
    const title = document.createElement('strong');
    const progressBox = document.createElement('div');
    progressBox.className = 'fuo-progress';
    const progressHead = document.createElement('div');
    progressHead.className = 'fuo-progress-head';
    const progressSummary = document.createElement('span');
    const progressCounts = document.createElement('span');
    progressHead.append(progressSummary, progressCounts);
    const progressTrack = document.createElement('div');
    progressTrack.className = 'fuo-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'fuo-progress-fill';
    progressTrack.append(progressFill);
    const jumpRow = document.createElement('div');
    jumpRow.className = 'fuo-jump-row';
    const jumpWrongBtn = document.createElement('button');
    jumpWrongBtn.type = 'button';
    jumpWrongBtn.className = 'fuo-jump-btn';
    jumpWrongBtn.dataset.kind = 'wrong';
    const jumpStarredBtn = document.createElement('button');
    jumpStarredBtn.type = 'button';
    jumpStarredBtn.className = 'fuo-jump-btn';
    jumpStarredBtn.dataset.kind = 'starred';
    const jumpReviewBtn = document.createElement('button');
    jumpReviewBtn.type = 'button';
    jumpReviewBtn.className = 'fuo-jump-btn';
    jumpReviewBtn.dataset.kind = 'review';
    jumpRow.append(jumpWrongBtn, jumpStarredBtn, jumpReviewBtn);
    progressBox.append(progressHead, progressTrack, jumpRow);

    const examBar = document.createElement('div');
    examBar.className = 'fuo-exam-bar';
    examBar.hidden = true;
    const examInfo = document.createElement('span');
    const examActions = document.createElement('div');
    examActions.className = 'fuo-exam-actions';
    const examSubmitBtn = document.createElement('button');
    examSubmitBtn.type = 'button';
    examSubmitBtn.textContent = 'Nộp bài';
    const examCancelBtn = document.createElement('button');
    examCancelBtn.type = 'button';
    examCancelBtn.textContent = 'Thoát thi';
    examActions.append(examSubmitBtn, examCancelBtn);
    examBar.append(examInfo, examActions);

    const examSummary = document.createElement('div');
    examSummary.className = 'fuo-exam-summary';
    examSummary.hidden = true;

    const reviewBar = document.createElement('div');
    reviewBar.className = 'fuo-review-bar';
    reviewBar.hidden = true;
    const reviewInfo = document.createElement('span');
    const reviewActions = document.createElement('div');
    reviewActions.className = 'fuo-exam-actions';
    const reviewNextBtn = document.createElement('button');
    reviewNextBtn.type = 'button';
    reviewNextBtn.textContent = 'Câu tiếp';
    const reviewExitBtn = document.createElement('button');
    reviewExitBtn.type = 'button';
    reviewExitBtn.textContent = 'Thoát ôn';
    reviewActions.append(reviewNextBtn, reviewExitBtn);
    reviewBar.append(reviewInfo, reviewActions);

    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    const comments = document.createElement('button');
    comments.title = 'Hiện / Ẩn bình luận (M hoặc C sau khi chấm)';
    const reset = document.createElement('button');
    reset.title = 'Làm lại câu hiện tại (R)';
    const star = document.createElement('button');
    star.type = 'button';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = 'Xuất CSV';
    exportButton.onclick = () => {
      const count = exportReview();
      state.message = 'Đã xuất CSV: ' + count + ' câu cần ôn.';
      render();
    };
    const backupButton = document.createElement('button');
    backupButton.type = 'button';
    backupButton.textContent = 'Sao lưu';
    backupButton.title = 'Sao lưu / Khôi phục JSON và xuất Anki (.tsv)';
    backupButton.onclick = () => openBackupModal(backupButton);
    const examButton = document.createElement('button');
    examButton.type = 'button';
    examButton.textContent = 'Thi thử';
    examButton.title = 'Bắt đầu chế độ thi thử bấm giờ';
    star.onclick = () => {
      if (!state) return;
      const item = review.get(question.key) || {};
      item.starred = !item.starred;
      item.url = question.image?.src || item.url || '';
      review.set(question.key, item);
      saveReview();
      render();
    };
    const ai = document.createElement('button');
    ai.className = 'fuo-ai-trigger';
    ai.type = 'button';
    ai.textContent = 'Xem đáp án AI';
    ai.title = 'Xem đáp án và lời giải AI (E)';
    const aiSettings = document.createElement('button');
    aiSettings.className = 'fuo-ai-settings-btn';
    aiSettings.type = 'button';
    aiSettings.textContent = 'Cài đặt AI';
    aiSettings.onclick = () => openAISettingsModal(aiSettings);
    const aiResult = document.createElement('div');
    aiResult.className = 'fuo-ai-result';
    aiResult.tabIndex = 0;
    aiResult.setAttribute('aria-label', 'Lời giải AI');
    aiResult.setAttribute('role', 'status');
    aiResult.hidden = true;
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.textContent = 'Submit';
    submit.title = 'Nộp đáp án đã chọn (Enter)';
    submit.onclick = () => grade();
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Thử lại phân loại';
    retry.onclick = () => prepare(question, state);
    const distribution = document.createElement('div');
    distribution.style.flexBasis = '100%';
    const options = document.createElement('div');
    options.className = 'fuo-options';
    comments.type = reset.type = 'button';
    reset.textContent = 'Làm lại';

    let question, state;
    let showComments = false;

    function formatClock(ms) {
      const totalSec = Math.max(0, Math.ceil(ms / 1000));
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      return mins + ':' + secs;
    }

    function stopExamTimer() {
      if (examMode.timerId !== null) {
        clearInterval(examMode.timerId);
        examMode.timerId = null;
      }
    }

    function renderExamBar() {
      examBar.hidden = !examMode.active;
      if (!examMode.active) return;
      const total = catalog.size || Math.max(1, examMode.answers.size);
      const left = Math.max(0, examMode.endsAt - Date.now());
      examInfo.textContent = 'Thi thử · Đã chọn ' + examMode.answers.size + '/' + total + ' · Còn ' + formatClock(left);
    }

    function renderExamSummary() {
      examSummary.hidden = examMode.active || !examMode.summary;
      if (examSummary.hidden) return;
      const s = examMode.summary;
      examSummary.replaceChildren();
      const headline = document.createElement('div');
      const pct = s.gradedCount > 0 ? Math.round(s.rightCount / s.gradedCount * 100) : 0;
      const parts = [
        (s.timedOut ? 'Hết giờ thi thử' : 'Kết quả thi thử') + ': ' + s.rightCount + '/' + s.gradedCount + ' đúng (' + pct + '%)',
        'Thời gian: ' + formatClock(s.elapsed)
      ];
      if (s.ungradedCount > 0) parts.push('Chưa chấm (thiếu bình luận): ' + s.ungradedCount);
      headline.textContent = parts.join(' · ');
      examSummary.append(headline);
      if (s.wrongList.length > 0) {
        const wrongRow = document.createElement('div');
        wrongRow.className = 'fuo-exam-wrong-list';
        for (const key of s.wrongList) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'fuo-jump-btn';
          btn.dataset.kind = 'wrong';
          btn.textContent = (catalog.get(key)?.title || key.split(' | ')[0]).replace(/\.[^.]+$/, '');
          btn.onclick = () => jumpToQuestion(root, key);
          wrongRow.append(btn);
        }
        examSummary.append(wrongRow);
      }
      const dismissBtn = document.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.textContent = 'Ẩn kết quả thi';
      dismissBtn.onclick = () => { examMode.summary = null; examSummary.hidden = true; };
      examSummary.append(dismissBtn);
    }

    function finishExam(timedOut = false) {
      if (!examMode.active) return;
      stopExamTimer();
      const elapsed = Date.now() - examMode.startedAt;
      examMode.active = false;
      let gradedCount = 0;
      let rightCount = 0;
      let ungradedCount = 0;
      const wrongList = [];
      for (const [key, selected] of examMode.answers.entries()) {
        if (!selected) continue;
        const att = attempts.get(key);
        const rev = review.get(key);
        const votes = att?.votes || [];
        const voteAnswer = consensus(votes);
        const answer = voteAnswer || rev?.answer || '';
        if (!answer) {
          ungradedCount++;
          continue;
        }
        const source = voteAnswer ? (votes.length === 1 ? '1 bình luận' : 'đa số bình luận') : (rev?.source || 'lịch sử đã chấm');
        gradedCount++;
        const isRight = answer === selected;
        if (isRight) rightCount++;
        else wrongList.push(key);
        if (att) {
          att.selected = selected;
          att.answer = answer;
          att.answerOrigin = voteAnswer ? 'comments' : 'ai';
          att.message = (isRight ? 'Đúng' : 'Sai') + ' · Nguồn ' + source;
        }
        const item = review.get(key) || {};
        item.selected = selected;
        item.answer = answer;
        item.source = source;
        item.url = catalog.get(key)?.url || item.url || '';
        if (!isRight) {
          item.wrong = true;
          item.wrongSelected = selected;
        }
        review.set(key, item);
      }
      if (gradedCount > 0) saveReview();
      examMode.summary = { timedOut, elapsed, gradedCount, rightCount, ungradedCount, wrongList };
      render();
    }

    examButton.onclick = () => {
      if (examMode.active) {
        finishExam(false);
        return;
      }
      const raw = prompt('Nhập thời gian thi thử (phút, từ 1 đến 300):', '60');
      if (raw === null) return;
      const minutes = Number(raw.trim());
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 300) {
        if (state) {
          state.message = 'Thời gian thi thử phải là số từ 1 đến 300 phút.';
          render();
        }
        return;
      }
      reviewRound.active = false;
      examMode.summary = null;
      examMode.answers.clear();
      examMode.startedAt = Date.now();
      examMode.endsAt = examMode.startedAt + Math.round(minutes * 60 * 1000);
      examMode.active = true;
      showComments = false;
      syncComments();
      for (const att of attempts.values()) {
        att.selected = '';
        att.answer = '';
        att.answerOrigin = '';
        att.aiText = '';
        att.message = '';
      }
      stopExamTimer();
      examMode.timerId = setInterval(() => {
        if (!examMode.active) {
          stopExamTimer();
          return;
        }
        if (Date.now() >= examMode.endsAt) {
          finishExam(true);
          return;
        }
        if (panel.isConnected) renderExamBar();
      }, 1000);
      render();
    };
    examSubmitBtn.onclick = () => finishExam(false);
    examCancelBtn.onclick = () => {
      stopExamTimer();
      examMode.active = false;
      examMode.summary = null;
      examMode.answers.clear();
      render();
    };

    function renderReviewBar() {
      reviewBar.hidden = !reviewRound.active;
      if (!reviewRound.active) return;
      const total = reviewRound.queue.length;
      const left = reviewRound.remaining.size;
      reviewInfo.textContent = left > 0
        ? 'Vòng ôn tập: còn ' + left + '/' + total + ' câu'
        : 'Đã ôn đúng hết ' + total + '/' + total + ' câu.';
      reviewNextBtn.hidden = left === 0;
    }

    function startReviewRound() {
      const queue = orderedReviewKeys(item => Boolean(item.wrong || item.starred));
      if (!queue.length) return;
      if (examMode.active) {
        stopExamTimer();
        examMode.active = false;
      }
      examMode.summary = null;
      reviewRound.active = true;
      reviewRound.queue = queue;
      reviewRound.remaining = new Set(queue);
      for (const key of queue) {
        const att = attempts.get(key);
        if (att) {
          att.selected = '';
          att.answer = '';
          att.answerOrigin = '';
          att.aiText = '';
          att.message = '';
        }
      }
      if (!question || question.key !== queue[0]) {
        jumpToQuestion(root, queue[0]);
      }
      render();
    }

    jumpReviewBtn.onclick = () => startReviewRound();
    reviewNextBtn.onclick = () => {
      const remainingList = reviewRound.queue.filter(k => reviewRound.remaining.has(k));
      handleJump(remainingList);
    };
    reviewExitBtn.onclick = () => {
      reviewRound.active = false;
      reviewRound.queue = [];
      reviewRound.remaining.clear();
      render();
    };

    function syncComments() {
      const content = sidebar.querySelector('.fancybox-sidebar-content');
      const matchesQuestion = question &&
        content?.querySelector('.xfmgInfoBlock-title h2')?.textContent.trim() === question.title;
      content?.classList.toggle('fuo-comments-visible', Boolean(!examMode.active && showComments && matchesQuestion));
      comments.textContent = showComments ? 'Ẩn bình luận' : 'Hiện bình luận';
      comments.setAttribute('aria-expanded', String(showComments));
    }
    comments.onclick = () => {
      if (examMode.active) return;
      showComments = !showComments;
      syncComments();
    };
    const buttons = letters.map(letter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.onclick = () => {
        if (!state?.type || state.busy || state.aiBusy) return;
        if (examMode.active) {
          if (state.type === 'single') {
            state.selected = state.selected === letter ? '' : letter;
          } else {
            state.selected = state.selected.includes(letter)
              ? state.selected.replace(letter, '') : normalize(state.selected + letter);
          }
          if (state.selected) examMode.answers.set(question.key, state.selected);
          else examMode.answers.delete(question.key);
          render();
          return;
        }
        if (state.answer) return;
        if (state.type === 'single') { state.selected = letter; grade(); }
        else {
          state.selected = state.selected.includes(letter)
            ? state.selected.replace(letter, '') : normalize(state.selected + letter);
          render();
        }
      };
      return button;
    });

    function nextJumpTarget(list) {
      if (!list.length) return '';
      if (!question) return list[0];
      const idx = list.indexOf(question.key);
      if (idx === -1) return list[0];
      return list.length > 1 ? list[(idx + 1) % list.length] : list[0];
    }

    function handleJump(list) {
      if (!state) return;
      const targetKey = nextJumpTarget(list);
      if (!targetKey) return;
      if (question && targetKey === question.key && list.length === 1) {
        state.message = 'Bạn đang ở câu duy nhất trong danh sách này.';
        render();
        return;
      }
      if (!jumpToQuestion(root, targetKey)) {
        const label = (catalog.get(targetKey)?.title || targetKey.split(' | ')[0]).replace(/\.[^.]+$/, '');
        state.message = 'Không tìm thấy slide của ' + label + ' trong thư viện ảnh hiện tại.';
        render();
      }
    }

    let currentWrongKeys = [];
    let currentStarredKeys = [];
    jumpWrongBtn.onclick = () => handleJump(currentWrongKeys);
    jumpStarredBtn.onclick = () => handleJump(currentStarredKeys);

    function renderProgress() {
      const stats = computeProgress();
      currentWrongKeys = stats.wrongKeys;
      currentStarredKeys = stats.starredKeys;
      const hasAny = stats.total > 0 || stats.answered > 0 || stats.wrongKeys.length > 0 || stats.starredKeys.length > 0;
      progressBox.hidden = !state || !hasAny;
      if (progressBox.hidden) return;
      const accuracy = stats.answered > 0 ? Math.round(stats.right / stats.answered * 100) : null;
      const headText = stats.total > 0
        ? 'Tiến độ: ' + stats.answered + '/' + stats.total
        : 'Đã làm: ' + stats.answered;
      progressSummary.textContent = accuracy === null ? headText : headText + ' · Đúng ' + accuracy + '%';
      const rightParts = [];
      if (stats.wrongKeys.length > 0) rightParts.push('Sai: ' + stats.wrongKeys.length);
      if (stats.starredKeys.length > 0) rightParts.push('★ ' + stats.starredKeys.length);
      progressCounts.textContent = rightParts.join(' · ');
      progressTrack.hidden = stats.total === 0;
      if (stats.total > 0) {
        const pct = Math.min(100, Math.round(stats.answered / stats.total * 100));
        progressFill.style.width = pct + '%';
      }
      jumpWrongBtn.hidden = stats.wrongKeys.length === 0;
      jumpWrongBtn.textContent = 'Câu sai (' + stats.wrongKeys.length + ')';
      jumpWrongBtn.title = 'Nhảy tới câu đã làm sai tiếp theo';
      jumpStarredBtn.hidden = stats.starredKeys.length === 0;
      jumpStarredBtn.textContent = 'Câu gắn sao (' + stats.starredKeys.length + ')';
      jumpStarredBtn.title = 'Nhảy tới câu đã đánh dấu tiếp theo';
      const reviewCount = new Set([...stats.wrongKeys, ...stats.starredKeys]).size;
      jumpReviewBtn.hidden = reviewCount === 0 || examMode.active || reviewRound.active;
      jumpReviewBtn.textContent = 'Ôn tập (' + reviewCount + ')';
      jumpReviewBtn.title = 'Bắt đầu vòng ôn chỉ gồm câu sai và câu gắn sao';
      jumpRow.hidden = jumpWrongBtn.hidden && jumpStarredBtn.hidden && jumpReviewBtn.hidden;
    }

    function render() {
      panel.hidden = !state;
      if (!state) return;
      title.textContent = question.title.replace(/\.[^.]+$/, '') + (state.type ? (state.type === 'multiple' ? ' · Chọn nhiều đáp án' : ' · Chọn một đáp án') : ' · Đang phân loại');
      renderExamBar();
      renderExamSummary();
      renderReviewBar();
      renderProgress();
      submit.hidden = examMode.active || state.type !== 'multiple';
      submit.disabled = Boolean(!state.selected || state.busy || state.aiBusy || state.answer);
      retry.hidden = !state.typeError;
      retry.disabled = Boolean(state.busy);
      distribution.replaceChildren();
      if (!examMode.active && state.answer && state.votes.length) {
        const counts = new Map();
        state.votes.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
        const label = document.createElement('div');
        label.textContent = 'Tỷ lệ bình luận (không phải xác suất đúng)';
        distribution.append(label);
        for (const [vote, count] of [...counts].sort((a, b) => b[1] - a[1])) {
          const row = document.createElement('div');
          const ratio = count / state.votes.length * 100;
          row.textContent = [...vote].join(',') + ': ' + Number(ratio.toFixed(1)) + '% ';
          const meter = document.createElement('meter');
          meter.min = 0; meter.max = 100; meter.value = ratio;
          meter.setAttribute('aria-label', [...vote].join(','));
          row.append(meter); distribution.append(row);
        }
      }
      for (const [index, button] of buttons.entries()) {
        const letter = letters[index];
        const selected = state.selected.includes(letter);
        const right = !examMode.active && state.answer.includes(letter);
        const wrong = !examMode.active && state.answer && selected && !right;
        button.textContent = letter + (right ? ' ✓' : wrong ? ' ✗' : '');
        button.dataset.mark = right ? 'right' : wrong ? 'wrong' : '';
        button.setAttribute('aria-pressed', String(selected));
        button.disabled = Boolean(!state.type || state.busy || state.aiBusy || (!examMode.active && state.answer));
      }
      const starred = Boolean(review.get(question.key)?.starred);
      star.textContent = starred ? '★ Đã đánh dấu' : '☆ Đánh dấu';
      star.setAttribute('aria-pressed', String(starred));
      star.title = 'Đánh dấu câu nghi vấn để ôn lại (S)';
      comments.disabled = examMode.active;
      reset.disabled = state.busy || state.aiBusy || !state.selected;
      ai.disabled = Boolean(examMode.active || state.busy || state.aiBusy);
      ai.textContent = state.aiBusy ? 'Đang hỏi ' + getActiveProvider().name + '…' : 'Xem đáp án AI';
      examButton.hidden = examMode.active;
      aiResult.hidden = examMode.active || !state.aiText;
      const disagreement = state.answer && state.answerOrigin === 'comments' && state.aiSolution && state.aiSolution.answer !== state.answer
        ? '\n\nLưu ý: AI chọn ' + [...state.aiSolution.answer].join(',') + ', khác đáp án bình luận ' + [...state.answer].join(',') + '. Kết quả chấm vẫn theo bình luận.' : '';
      const aiText = (state.aiText || '') + (state.aiText && disagreement ? disagreement : '');
      if (aiResult.dataset.source !== aiText) {
        aiResult.dataset.source = aiText;
        aiResult.replaceChildren();
        aiResult.setAttribute('aria-busy', String(Boolean(state.aiBusy)));
        if (state.aiSolution && !state.aiBusy && state.aiText === aiSolutionText(state.aiSolution)) {
          const heading = document.createElement('div');
          heading.className = 'fuo-ai-heading';
          const provider = document.createElement('span');
          provider.className = 'fuo-ai-provider';
          provider.textContent = state.aiSolution.providerName || 'DeepSeek';
          const reference = document.createElement('span');
          reference.textContent = 'đáp án tham khảo';
          heading.append(provider, reference);
          if (state.aiSolution.model) {
            const meta = document.createElement('span');
            meta.className = 'fuo-ai-meta';
            const thinkingText = state.aiSolution.thinking && state.aiSolution.thinking !== 'default'
              ? ' · thinking: ' + state.aiSolution.thinking
              : '';
            meta.textContent = state.aiSolution.model + thinkingText;
            heading.append(meta);
          }
          const answer = document.createElement('div');
          answer.className = 'fuo-ai-answer';
          answer.textContent = 'Đáp án: ' + [...state.aiSolution.answer].join(',');
          aiResult.append(heading, answer);
          const paragraphs = state.aiSolution.explanation.split(/\n+|(?=Phương án [A-H]\s)/u).filter(text => text.trim());
          for (const text of paragraphs) {
            const paragraph = document.createElement('p');
            paragraph.textContent = text.trim();
            aiResult.append(paragraph);
          }
          if (disagreement) {
            const note = document.createElement('p');
            note.className = 'fuo-ai-note';
            note.textContent = disagreement.trim();
            aiResult.append(note);
          }
        } else {
          const message = document.createElement('p');
          message.textContent = aiText;
          aiResult.append(message);
        }
        if (aiText && typeof renderMathInElement === 'function') {
          renderMathInElement(aiResult, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false,
            trust: false,
            strict: 'ignore',
            maxExpand: 1000
          });
        }
      }
      status.textContent = examMode.active
        ? (state.selected ? 'Đã lưu lựa chọn ' + [...state.selected].join(',') + ' (chưa chấm).' : 'Chế độ thi thử: chọn đáp án rồi chuyển câu tiếp.')
        : (state.message || (state.type === 'multiple' ? 'Chọn các đáp án rồi bấm Submit.' : 'Bấm một đáp án để chấm ngay.'));
    }

    ai.onclick = async () => {
      const target = currentQuestion(root);
      if (!state || !target || target.key !== question.key || state.busy || state.aiBusy) return;
      if (state.aiSolution && state.aiSelected === normalize(state.selected || '') && state.aiConfigSig === configSignature(getActiveProvider())) {
        state.aiText = aiSolutionText(state.aiSolution);
        render();
        return;
      }
      const submission = state;
      submission.aiBusy = true;
      submission.aiText = 'Đang giải câu hỏi bằng ' + getActiveProvider().name + '…';
      render();
      try {
        const solution = await loadAISolution(target, submission);
        submission.aiText = aiSolutionText(solution);
      } catch (error) {
        submission.aiText = error.message || 'Chưa lấy được đáp án AI. Hãy thử lại.';
      } finally {
        submission.aiBusy = false;
        if (state === submission) render();
      }
    };

    reset.onclick = () => {
      state.selected = '';
      if (examMode.active && question) examMode.answers.delete(question.key);
      state.aiText = '';
      state.answer = '';
      state.answerOrigin = '';
      state.message = '';
      render();
    };

    async function grade() {
      const target = currentQuestion(root);
      if (!state || !target || target.key !== question.key || !state.type || !state.selected || state.busy || state.aiBusy || state.answer) return;
      const submission = state;
      const selected = submission.selected;
      submission.busy = true;
      submission.message = 'Đang kiểm tra đáp án…';
      render();
      try {
        const votes = submission.votes;
        let answer = consensus(votes);
        let source = votes.length === 1 ? '1 bình luận' : 'đa số bình luận';
        let usedAI = false;
        if (!answer) {
          const solution = await loadAISolution(target, submission);
          answer = solution.answer;
          submission.aiText = aiSolutionText(solution);
          source = (solution.providerName || 'AI') + ' · đáp án tham khảo';
          usedAI = true;
        }
        submission.answer = answer;
        submission.answerOrigin = usedAI ? 'ai' : 'comments';
        const item = review.get(target.key) || {};
        item.selected = selected;
        item.answer = answer;
        item.source = source;
        item.url = target.image?.src || item.url || '';
        if (answer !== selected) {
          item.wrong = true;
          item.wrongSelected = selected;
        }
        review.set(target.key, item);
        saveReview();
        const result = answer === selected ? 'Đúng' : 'Sai';
        if (reviewRound.active && answer === selected) {
          reviewRound.remaining.delete(target.key);
        }
        submission.message = result + ' · Nguồn ' + source;
      } catch (error) {
        submission.message = error.message || 'Chưa chấm được câu này.';
      } finally {
        submission.busy = false;
        maybeExport();
        if (state === submission) render();
      }
    }

    async function prepare(target, submission) {
      if (!target || !submission || submission.busy) return;
      submission.busy = true;
      submission.typeError = false;
      submission.message = 'Đang phân loại câu hỏi…';
      render();
      try {
        const content = await waitForComments(root, target);
        if (!content) throw new Error('Bình luận chưa tải xong. Bấm Thử lại phân loại.');
        submission.votes = readVotes(content);
        submission.type = submission.votes.length
          ? (submission.votes.some(v => v.length > 1) ? 'multiple' : 'single')
          : await classifyImage(target.image);
        submission.message = '';
      } catch (error) {
        submission.typeError = true;
        submission.message = error.message || 'Không phân loại được câu hỏi.';
      } finally {
        submission.busy = false;
        if (state === submission) render();
      }
    }

    panel.hidden = true;
    options.append(...buttons);
    panel.append(title, examBar, examSummary, reviewBar, progressBox, options, submit, retry, reset, comments, ai, aiSettings, star, exportButton, backupButton, examButton, status, distribution, aiResult);
    sidebar.prepend(panel);

    function onQuizKeyDown(event) {
      if (!panel.isConnected) {
        document.removeEventListener('keydown', onQuizKeyDown);
        return;
      }
      if (panel.hidden || !state || document.querySelector('.fuo-settings-backdrop')) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      const key = event.key;
      if (!key) return;
      if (key === 'Enter') {
        if (!submit.hidden && !submit.disabled && !(event.target instanceof HTMLElement && event.target.closest('button, a, [role="button"]'))) {
          event.preventDefault();
          submit.click();
        }
        return;
      }
      if (key.length !== 1) return;
      const upper = key.toUpperCase();
      const letterIdx = letters.indexOf(upper);
      if (letterIdx !== -1 && !buttons[letterIdx].disabled) {
        event.preventDefault();
        buttons[letterIdx].click();
        return;
      }
      if (upper >= '1' && upper <= '8') {
        const idx = Number(upper) - 1;
        if (!buttons[idx].disabled) {
          event.preventDefault();
          buttons[idx].click();
        }
        return;
      }
      if (upper === 'R' && !reset.disabled) {
        event.preventDefault();
        reset.click();
      } else if (upper === 'S') {
        event.preventDefault();
        star.click();
      } else if (upper === 'M' || (upper === 'C' && buttons[2].disabled)) {
        event.preventDefault();
        comments.click();
      } else if ((upper === 'I' || (upper === 'E' && buttons[4].disabled)) && !ai.disabled) {
        event.preventDefault();
        ai.click();
      }
    }
    document.addEventListener('keydown', onQuizKeyDown);

    function onAIConfigChange() {
      if (!panel.isConnected) {
        aiConfigListeners.delete(onAIConfigChange);
        return;
      }
      if (state && !state.aiBusy) {
        const activeSig = configSignature(getActiveProvider());
        if (state.aiText && state.aiConfigSig !== activeSig) {
          state.aiText = '';
        }
      }
      render();
    }
    aiConfigListeners.add(onAIConfigChange);
    return () => {
      const next = currentQuestion(root);
      if (next) discoverQuestions(next);
      if (question?.key === next?.key) {
        const content = sidebar.querySelector('.fancybox-sidebar-content');
        const visible = Boolean(showComments && question &&
          content?.querySelector('.xfmgInfoBlock-title h2')?.textContent.trim() === question.title);
        content?.classList.toggle('fuo-comments-visible', visible);
        renderProgress();
        return;
      }
      question = next;
      showComments = false;
      syncComments();
      if (question && !attempts.has(question.key)) {
        attempts.set(question.key, { selected: '', answer: '', message: '', busy: false, aiBusy: false, aiText: '', aiSolution: null, aiPending: null, aiConfigSig: '', aiPendingSig: '', answerOrigin: '', type: '', typeError: false, votes: [] });
      }
      state = question ? attempts.get(question.key) : null;
      render();
      if (state && !state.type && !state.busy) prepare(question, state);
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
    subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'src', 'href', 'data-caption', 'alt']
  });
  window.addEventListener('resize', schedule);
  schedule();
