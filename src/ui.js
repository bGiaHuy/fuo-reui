  function isEditableTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  }

  function orderedReviewKeys(examInfo, predicate) {
    const rev = currentReview(examInfo);
    const matched = [];
    const seen = new Set();
    for (const [key] of catalog) {
      const item = rev.get(key);
      if (item && predicate(item)) {
        matched.push(key);
        seen.add(key);
      }
    }
    const extra = [];
    for (const [key, item] of rev) {
      if (!seen.has(key) && item && predicate(item)) extra.push(key);
    }
    extra.sort((a, b) => {
      const numA = rev.get(a)?.index || Number(a.match(/\d+/)?.[0]) || 0;
      const numB = rev.get(b)?.index || Number(b.match(/\d+/)?.[0]) || 0;
      return numA - numB || a.localeCompare(b);
    });
    return matched.concat(extra);
  }

  function computeProgress(examInfo, currentTarget) {
    const rev = currentReview(examInfo);
    const keys = new Set([...catalog.keys(), ...attempts.keys(), ...rev.keys()]);
    let answered = 0;
    let right = 0;
    for (const key of keys) {
      const att = attempts.get(key);
      const item = rev.get(key);
      const answer = att?.answer || item?.answer || '';
      if (!answer) continue;
      answered++;
      const selected = att?.answer ? att.selected : (item?.selected || '');
      if (selected && selected === answer) right++;
    }
    const wrongKeys = orderedReviewKeys(examInfo, item => Boolean(item.wrong));
    const starredKeys = orderedReviewKeys(examInfo, item => Boolean(item.starred));
    const total = Math.max(catalog.size, currentTarget?.total || 0);
    return { total, answered, right, wrongKeys, starredKeys };
  }

  function jumpToQuestion(ctx, key) {
    const rev = currentReview(activeExamInfo);
    const entry = catalog.get(key);
    const revItem = rev.get(key);
    const idx = entry?.index || revItem?.index || Number(key.match(/^q(\d+)/i)?.[1]) || 0;
    if (ctx.mode === 'lightbox' && idx > 0) {
      const thumbBtn = ctx.root.querySelector('nav[aria-label="Ảnh thu nhỏ"] li button[aria-label="Ảnh ' + idx + '"]')
        || ctx.root.querySelectorAll('nav[aria-label="Ảnh thu nhỏ"] li button')[idx - 1];
      if (thumbBtn) {
        thumbBtn.click();
        return true;
      }
    }
    const targetUrl = entry?.url || revItem?.url || '';
    let targetPath = '';
    try { targetPath = targetUrl ? new URL(targetUrl, location.origin).pathname : ''; } catch {}
    const links = [...document.querySelectorAll('a[href]')];
    const matchLink = links.find(a => {
      const href = a.getAttribute('href') || '';
      if (!href.includes('/media/')) return false;
      try {
        const p = new URL(href, location.origin).pathname;
        return (targetPath && p === targetPath) || p.includes('/' + key);
      } catch {
        return false;
      }
    });
    if (matchLink) {
      matchLink.click();
      return true;
    }
    return false;
  }

  function mount(ctx) {
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

    const multiHint = document.createElement('div');
    multiHint.className = 'fuo-multi-hint';
    multiHint.hidden = true;
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    const commentsBtn = document.createElement('button');
    commentsBtn.title = 'Hiện / Ẩn kết quả & bình luận (M)';
    const reset = document.createElement('button');
    reset.title = 'Làm lại câu hiện tại (R)';
    const star = document.createElement('button');
    star.type = 'button';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = 'Xuất CSV';
    exportButton.onclick = () => {
      if (!question || !state) return;
      const count = exportReview(question.exam);
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
      if (!question || !state) return;
      const store = getReviewStore(question.exam);
      const item = store.questions.get(question.key) || {};
      item.starred = !item.starred;
      item.title = question.title;
      item.index = question.index || item.index || 0;
      item.url = question.mediaUrl || question.image?.src || item.url || '';
      store.questions.set(question.key, item);
      saveReview(question.exam);
      render();
    };
    const ai = document.createElement('button');
    ai.className = 'fuo-ai-trigger';
    ai.type = 'button';
    ai.textContent = 'Xem đáp án AI';
    ai.title = 'Xem đáp án và lời giải AI (I)';
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
    submit.className = 'fuo-submit-btn';
    submit.type = 'button';
    submit.textContent = 'Chấm đáp án';
    submit.title = 'Nộp đáp án đã chọn (Enter)';
    submit.onclick = () => grade();
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Thử lại phân loại';
    retry.onclick = () => prepare(question, state);
    commentsBtn.type = reset.type = 'button';
    reset.textContent = 'Làm lại';

    let question = null;
    let state = null;

    function attachPanel() {
      if (ctx.mode === 'lightbox') {
        if (panel.parentElement !== ctx.sidebar || ctx.sidebar.firstElementChild !== panel) {
          ctx.sidebar.prepend(panel);
        }
        return;
      }
      const pollSection = findPollSection(ctx.sidebar);
      if (pollSection?.parentElement) {
        if (panel.parentElement !== pollSection.parentElement || panel.nextElementSibling !== pollSection) {
          pollSection.parentElement.insertBefore(panel, pollSection);
        }
      } else if (!panel.isConnected) {
        ctx.sidebar.prepend(panel);
      }
    }

    function setToggleClass(el, cls, active) {
      if (el && el.classList.contains(cls) !== Boolean(active)) {
        el.classList.toggle(cls, Boolean(active));
      }
    }

    function setAttrIfChanged(el, name, val) {
      if (val === null || val === undefined || val === '') {
        if (el.hasAttribute(name)) el.removeAttribute(name);
      } else if (el.getAttribute(name) !== String(val)) {
        el.setAttribute(name, String(val));
      }
    }

    function syncNativeDOM() {
      const poll = readPollData(ctx.sidebar, false);
      const pollSection = poll?.section;
      const commentsContainer = findCommentsContainer(ctx.sidebar);
      const synced = Boolean(question && isSlideSynced(ctx, question));

      if (pollSection) {
        const revealed = Boolean(!examMode.active && state?.revealed && synced);
        const retrying = Boolean(!examMode.active && state?.retrying && !state?.revealed && synced);
        setToggleClass(pollSection, 'fuo-revealed', revealed);
        setToggleClass(pollSection, 'fuo-retrying', retrying);
        for (const opt of poll.options) {
          if (!state || !synced) {
            setAttrIfChanged(opt.button, 'data-fuo-mark', null);
            setAttrIfChanged(opt.button, 'data-fuo-selected', null);
            continue;
          }
          const isSelected = state.selected.includes(opt.key);
          const isRight = !examMode.active && state.answer && opt.key.length === 1 && state.answer.includes(opt.key);
          const isExactComboRight = !examMode.active && state.answer && opt.key.length > 1 && state.answer === opt.key;
          const isWrong = !examMode.active && state.answer && isSelected && !(isRight || isExactComboRight);
          const mark = (isRight || isExactComboRight) ? 'right' : isWrong ? 'wrong' : null;
          setAttrIfChanged(opt.button, 'data-fuo-mark', mark);
          setAttrIfChanged(opt.button, 'data-fuo-selected', (!state.answer && isSelected) ? 'true' : null);
        }
      }

      if (commentsContainer) {
        setToggleClass(commentsContainer, 'fuo-comments-visible', Boolean(!examMode.active && state?.revealed && synced));
      }

      const revealed = Boolean(state?.revealed);
      const nextLabel = revealed ? 'Ẩn kết quả & bình luận' : 'Hiện kết quả & bình luận';
      if (commentsBtn.textContent !== nextLabel) commentsBtn.textContent = nextLabel;
      setAttrIfChanged(commentsBtn, 'aria-expanded', String(revealed));
      return poll;
    }

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
      const total = Math.max(catalog.size, question?.total || 0, examMode.answers.size, 1);
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
      if (s.ungradedCount > 0) parts.push('Chưa chấm (thiếu đáp án cộng đồng/FUO AI): ' + s.ungradedCount);
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
          btn.textContent = (catalog.get(key)?.title || currentReview(activeExamInfo).get(key)?.title || key.split(' | ')[0]).replace(/\.[^.]+$/, '');
          btn.onclick = () => jumpToQuestion(ctx, key);
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
      const store = getReviewStore(question?.exam || activeExamInfo);
      let gradedCount = 0;
      let rightCount = 0;
      let ungradedCount = 0;
      const wrongList = [];
      for (const [key, selected] of examMode.answers.entries()) {
        if (!selected) continue;
        const att = attempts.get(key);
        const revItem = store.questions.get(key);
        const community = att ? resolveCommunityAnswer(att.type || 'single', att.baselinePoll, att.humanVotes || []) : null;
        const answer = community?.answer || att?.fuoAi?.answer || revItem?.answer || '';
        if (!answer) {
          ungradedCount++;
          continue;
        }
        const origin = community ? community.origin : (att?.fuoAi?.answer ? 'fuo-ai' : 'ai');
        const source = community ? community.source : (att?.fuoAi?.answer ? 'FUO AI (bình luận ghim)' : (revItem?.source || 'lịch sử đã chấm'));
        gradedCount++;
        const isRight = answer === selected;
        if (isRight) rightCount++;
        else wrongList.push(key);
        if (att) {
          att.selected = selected;
          att.answer = answer;
          att.answerOrigin = origin;
          att.revealed = true;
          att.message = (isRight ? 'Đúng' : 'Sai') + ' · Nguồn ' + source;
        }
        const item = store.questions.get(key) || {};
        item.title = catalog.get(key)?.title || item.title || key;
        item.index = catalog.get(key)?.index || item.index || 0;
        item.selected = selected;
        item.answer = answer;
        item.source = source;
        item.url = catalog.get(key)?.url || item.url || '';
        if (!isRight) {
          item.wrong = true;
          item.wrongSelected = selected;
        }
        store.questions.set(key, item);
      }
      if (gradedCount > 0) saveReview(question?.exam || activeExamInfo);
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
      for (const att of attempts.values()) {
        att.selected = '';
        att.answer = '';
        att.answerOrigin = '';
        att.aiText = '';
        att.message = '';
        att.revealed = false;
        att.retrying = true;
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
      const exam = question?.exam || activeExamInfo;
      const queue = orderedReviewKeys(exam, item => Boolean(item.wrong || item.starred));
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
          att.revealed = false;
          att.retrying = true;
        }
      }
      if (!question || question.key !== queue[0]) {
        jumpToQuestion(ctx, queue[0]);
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

    commentsBtn.onclick = () => {
      if (examMode.active || !state) return;
      state.revealed = !state.revealed;
      render();
    };

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
      if (!jumpToQuestion(ctx, targetKey)) {
        const label = (catalog.get(targetKey)?.title || currentReview(question?.exam).get(targetKey)?.title || targetKey.split(' | ')[0]).replace(/\.[^.]+$/, '');
        state.message = 'Không tìm thấy slide của ' + label + ' trong thư viện ảnh hiện tại.';
        render();
      }
    }

    let currentWrongKeys = [];
    let currentStarredKeys = [];
    jumpWrongBtn.onclick = () => handleJump(currentWrongKeys);
    jumpStarredBtn.onclick = () => handleJump(currentStarredKeys);

    function renderProgress() {
      const stats = computeProgress(question?.exam || activeExamInfo, question);
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
      attachPanel();
      panel.hidden = !state;
      if (!state || !question) {
        syncNativeDOM();
        return;
      }
      const livePoll = syncNativeDOM();
      const nativeMultiOn = Boolean(livePoll?.multiSwitchOn);
      const isMulti = state.type === 'multiple' || nativeMultiOn;

      title.textContent = question.title + (state.type
        ? (state.type === 'multiple' ? ' · Chọn nhiều đáp án' : ' · Chọn một đáp án')
        : ' · Đang phân loại');
      renderExamBar();
      renderExamSummary();
      renderReviewBar();
      renderProgress();

      multiHint.hidden = !( !examMode.active && state.type === 'multiple' && !nativeMultiOn && !state.answer );
      if (!multiHint.hidden) {
        multiHint.textContent = 'Câu chọn nhiều — bật "Nhiều đáp án" bên dưới rồi chọn và bấm Chấm đáp án.';
      }

      submit.hidden = examMode.active || !isMulti;
      submit.disabled = Boolean(!state.selected || state.busy || state.aiBusy || state.answer);
      retry.hidden = !state.typeError;
      retry.disabled = Boolean(state.busy);

      const store = getReviewStore(question.exam);
      const starred = Boolean(store.questions.get(question.key)?.starred);
      star.textContent = starred ? '★ Đã đánh dấu' : '☆ Đánh dấu';
      star.setAttribute('aria-pressed', String(starred));
      star.title = 'Đánh dấu câu nghi vấn để ôn lại (S)';
      commentsBtn.disabled = examMode.active;
      reset.disabled = Boolean(state.busy || state.aiBusy || (!state.selected && !state.answer));
      ai.disabled = Boolean(examMode.active || state.busy || state.aiBusy);
      ai.textContent = state.aiBusy ? 'Đang hỏi ' + getActiveProvider().name + '…' : 'Xem đáp án AI';
      examButton.hidden = examMode.active;

      aiResult.hidden = examMode.active || !state.aiText;
      const fuoAiDiffers = !examMode.active && state.answer && (state.answerOrigin === 'poll' || state.answerOrigin === 'comments') && state.fuoAi?.answer && state.fuoAi.answer !== state.answer
        ? ' Lưu ý: FUO AI chọn ' + [...state.fuoAi.answer].join(',') + ', khác đáp án cộng đồng ' + [...state.answer].join(',') + '.'
        : '';
      const disagreement = state.answer && (state.answerOrigin === 'poll' || state.answerOrigin === 'comments' || state.answerOrigin === 'fuo-ai') && state.aiSolution && state.aiSolution.answer !== state.answer
        ? '\n\nLưu ý: AI chọn ' + [...state.aiSolution.answer].join(',') + ', khác đáp án ' + [...state.answer].join(',') + '. Kết quả chấm vẫn giữ nguyên.'
        : '';
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

      const defaultMsg = state.type
        ? (isMulti
          ? (state.selected ? 'Đã chọn: ' + [...state.selected].join(',') + ' — bấm Chấm đáp án để kiểm tra.' : 'Chọn các đáp án bên dưới rồi bấm Chấm đáp án.')
          : 'Bấm trực tiếp phương án bên dưới để chấm ngay.')
        : 'Đang phân loại câu hỏi…';
      status.textContent = examMode.active
        ? (state.selected ? 'Đã lưu lựa chọn ' + [...state.selected].join(',') + ' (chưa chấm).' : 'Chế độ thi thử: chọn đáp án rồi chuyển câu tiếp.')
        : ((state.message || defaultMsg) + (state.message && fuoAiDiffers ? fuoAiDiffers : ''));
    }

    ai.onclick = async () => {
      const target = currentQuestion(ctx);
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
      if (!state) return;
      state.selected = '';
      if (examMode.active && question) examMode.answers.delete(question.key);
      state.aiText = '';
      state.answer = '';
      state.answerOrigin = '';
      state.message = '';
      state.revealed = false;
      state.retrying = true;
      render();
    };

    async function grade() {
      const target = currentQuestion(ctx);
      if (!state || !target || target.key !== question.key || !state.type || !state.selected || state.busy || state.aiBusy || state.answer) return;
      const submission = state;
      const selected = submission.selected;
      submission.busy = true;
      submission.message = 'Đang kiểm tra đáp án…';
      render();
      try {
        const resolved = await resolveAnswer(target, submission);
        if (resolved.solution) {
          submission.aiText = aiSolutionText(resolved.solution);
        }
        submission.answer = resolved.answer;
        submission.answerOrigin = resolved.origin;
        submission.revealed = true;
        const store = getReviewStore(target.exam);
        const item = store.questions.get(target.key) || {};
        item.title = target.title;
        item.index = target.index || item.index || 0;
        item.selected = selected;
        item.answer = resolved.answer;
        item.source = resolved.source;
        item.url = target.mediaUrl || target.image?.src || item.url || '';
        if (resolved.answer !== selected) {
          item.wrong = true;
          item.wrongSelected = selected;
        }
        store.questions.set(target.key, item);
        saveReview(target.exam);
        const result = resolved.answer === selected ? 'Đúng' : 'Sai';
        if (reviewRound.active && resolved.answer === selected) {
          reviewRound.remaining.delete(target.key);
        }
        submission.message = result + ' · Nguồn ' + resolved.source;
      } catch (error) {
        submission.message = error.message || 'Chưa chấm được câu này.';
      } finally {
        submission.busy = false;
        maybeExport(target, submission);
        if (state === submission) render();
      }
    }

    function captureBaseline(submission, excludeOwn) {
      const poll = readPollData(ctx.sidebar, excludeOwn);
      const commentsContainer = findCommentsContainer(ctx.sidebar);
      const fuoAi = readFuoAI(commentsContainer);
      const humanVotes = readHumanComments(commentsContainer, fuoAi?.element || null);
      submission.baselinePoll = poll;
      submission.fuoAi = fuoAi;
      submission.humanVotes = humanVotes;
      return { poll, fuoAi, humanVotes };
    }

    async function prepare(target, submission) {
      if (!target || !submission || submission.busy) return;
      submission.busy = true;
      submission.typeError = false;
      submission.message = 'Đang phân loại câu hỏi…';
      render();
      try {
        const ready = await waitForQuestionReady(ctx, target);
        if (!ready) throw new Error('Bình luận chưa tải xong. Bấm Thử lại phân loại.');
        const { poll, fuoAi, humanVotes } = captureBaseline(submission, true);
        submission.type = await classifyQuestion(poll, humanVotes, fuoAi, target.image);
        submission.message = '';
      } catch (error) {
        submission.typeError = true;
        submission.message = error.message || 'Không phân loại được câu hỏi.';
      } finally {
        submission.busy = false;
        if (state === submission) render();
      }
    }

    function refreshAsyncBaseline() {
      if (!question || !state || state.busy || state.answer || state.selected || state.retrying || !state.type) return;
      if (!isSlideSynced(ctx, question) || isPollLoading(ctx.sidebar)) return;
      const { poll, fuoAi, humanVotes } = captureBaseline(state, true);
      const totalOptionVotes = poll ? poll.options.reduce((sum, o) => sum + o.communityCount, 0) : 0;
      if (state.type === 'single' && (
        humanVotes.some(v => v.length > 1) ||
        (fuoAi?.answer && fuoAi.answer.length > 1) ||
        poll?.multiSwitchOn ||
        poll?.options.some(o => o.key.length > 1 && o.communityCount > 0) ||
        (poll && poll.communityTotalVoters > 0 && totalOptionVotes > poll.communityTotalVoters)
      )) {
        state.type = 'multiple';
        render();
      }
    }

    // Capture-phase delegation runs BEFORE React mutates poll counts/aria-pressed.
    ctx.sidebar.addEventListener('click', event => {
      const targetEl = event.target instanceof Element ? event.target : null;
      if (!targetEl) return;
      if (targetEl.closest('section[aria-label="Bình chọn đáp án"] button[role="switch"]')) {
        requestAnimationFrame(render);
        return;
      }
      const optionBtn = targetEl.closest('section[aria-label="Bình chọn đáp án"] [role="group"][aria-label="Các phương án"] button[aria-pressed]');
      if (!optionBtn) return;
      if (!question || !state || !state.type || state.busy || state.aiBusy) return;
      if (!isSlideSynced(ctx, question)) return;
      if (!state.baselinePoll) {
        captureBaseline(state, true);
      }
      const letter = parsePollOptionLetter(optionBtn);
      if (!letter) return;
      if (examMode.active) {
        if (state.type === 'single') {
          state.selected = state.selected === letter ? '' : letter;
        } else if (letter.length === 1) {
          state.selected = state.selected.includes(letter)
            ? state.selected.replace(letter, '') : normalize(state.selected + letter);
        } else {
          state.selected = state.selected === letter ? '' : letter;
        }
        if (state.selected) examMode.answers.set(question.key, state.selected);
        else examMode.answers.delete(question.key);
        render();
        return;
      }
      if (state.answer) return;
      const livePoll = readPollData(ctx.sidebar, false);
      const isMulti = state.type === 'multiple' || Boolean(livePoll?.multiSwitchOn);
      state.retrying = false;
      if (!isMulti) {
        state.selected = letter;
        grade();
      } else {
        if (letter.length === 1) {
          state.selected = state.selected.includes(letter)
            ? state.selected.replace(letter, '')
            : normalize(state.selected + letter);
        } else {
          state.selected = state.selected === letter ? '' : letter;
        }
        render();
      }
    }, true);

    panel.hidden = true;
    panel.append(title, examBar, examSummary, reviewBar, progressBox, multiHint, submit, retry, reset, commentsBtn, ai, aiSettings, star, exportButton, backupButton, examButton, status, aiResult);
    attachPanel();

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
      const pollOpts = readPollData(ctx.sidebar, false)?.options || [];
      const letterIdx = letters.indexOf(upper);
      const canChoose = Boolean(state.type && !state.busy && !state.aiBusy && (examMode.active || !state.answer));
      if (letterIdx !== -1 && canChoose) {
        const match = pollOpts.find(o => o.key === upper) || pollOpts[letterIdx];
        if (match && !match.button.disabled) {
          event.preventDefault();
          match.button.click();
          return;
        }
      }
      if (upper >= '1' && upper <= '8' && canChoose) {
        const idx = Number(upper) - 1;
        if (pollOpts[idx] && !pollOpts[idx].button.disabled) {
          event.preventDefault();
          pollOpts[idx].button.click();
          return;
        }
      }
      if (upper === 'R' && !reset.disabled) {
        event.preventDefault();
        reset.click();
      } else if (upper === 'S') {
        event.preventDefault();
        star.click();
      } else if (upper === 'M' && !commentsBtn.disabled) {
        event.preventDefault();
        commentsBtn.click();
      } else if ((upper === 'I' || (upper === 'E' && pollOpts.length < 5)) && !ai.disabled) {
        event.preventDefault();
        ai.click();
      }
    }
    document.addEventListener('keydown', onQuizKeyDown);

    function onAIConfigChange() {
      if (!ctx.sidebar.isConnected) {
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
      const next = currentQuestion(ctx);
      if (next?.exam) activeExamInfo = next.exam;
      if (next) discoverQuestions(ctx, next);
      if (question?.key === next?.key) {
        refreshAsyncBaseline();
        render();
        return;
      }
      question = next;
      if (question && !attempts.has(question.key)) {
        attempts.set(question.key, {
          selected: '',
          answer: '',
          message: '',
          busy: false,
          aiBusy: false,
          aiText: '',
          aiSolution: null,
          aiPending: null,
          aiConfigSig: '',
          aiPendingSig: '',
          answerOrigin: '',
          type: '',
          typeError: false,
          revealed: false,
          retrying: false,
          baselinePoll: null,
          fuoAi: null,
          humanVotes: []
        });
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
      for (const ctx of findActiveContainers()) {
        if (!sidebars.has(ctx.sidebar)) sidebars.set(ctx.sidebar, mount(ctx));
        sidebars.get(ctx.sidebar)();
      }
    });
  }

  for (const method of ['pushState', 'replaceState']) {
    const orig = history[method];
    if (typeof orig === 'function') {
      history[method] = function (...args) {
        const res = orig.apply(this, args);
        schedule();
        return res;
      };
    }
  }
  window.addEventListener('popstate', schedule);

  // Ignore mutations caused by our own panel/dialogs to avoid a render feedback loop.
  const isOwnNode = node => {
    const el = node instanceof Element ? node : node?.parentElement;
    return Boolean(el?.closest('.fuo-quiz, .fuo-settings-backdrop'));
  };
  new MutationObserver(records => {
    if (records.every(r => isOwnNode(r.target))) return;
    schedule();
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'src', 'href', 'alt', 'aria-pressed', 'aria-checked', 'aria-busy', 'aria-current', 'aria-label', 'open']
  });
  window.addEventListener('resize', schedule);
  schedule();
