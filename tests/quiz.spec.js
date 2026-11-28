const { test, expect } = require('@playwright/test');
const fs = require('fs');
const script = fs.readFileSync('fuo-reui.user.js', 'utf8');

async function fixture(page, spec = {}, opts = {}) {
  await page.route('https://fuoverflow.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><head><title>Đề Thi FE - AIG202c - SU26 - FE | FuOverflow Community</title></head><body></body></html>' }));
  await page.goto(opts.url || 'https://fuoverflow.com/threads/aig202c-su26-fe.7263/');
  await page.evaluate(({ spec, opts }) => {
    window.gmStore = opts.store || {};
    window.saved = {};
    window.calls = 0;
    window.ocrCalls = 0;
    window.GM_addStyle = css => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); };
    window.GM_getResourceText = () => '';
    window.GM_getValue = (key, value) => Object.hasOwn(gmStore, key) ? gmStore[key] : key === 'deepseekKey' ? (opts.key || '') : value;
    window.GM_setValue = (key, value) => { gmStore[key] = value; window.saved[key] = value; };
    window.GM_registerMenuCommand = () => {};
    window.fetch = async url => {
      if (opts.corsFailCdn && String(url).includes('cdn.fuoverflow.com')) throw new TypeError('CORS blocked');
      return { ok: true, blob: async () => new Blob(['test'], { type: 'image/png' }) };
    };
    window.GM_xmlhttpRequest = args => {
      if ((args.method || 'POST').toUpperCase() === 'GET' && String(args.url).includes('cdn.fuoverflow.com')) {
        setTimeout(() => args.onload({ status: 200, response: new Blob(['cdn-img'], { type: 'image/webp' }) }), 0);
        return;
      }
      window.calls++;
      window.lastAIRequest = args.data ? JSON.parse(args.data) : null;
      setTimeout(() => args.onload({
        status: opts.aiError ? 500 : 200,
        responseText: JSON.stringify({
          choices: [{
            message: {
              content: opts.aiRaw ?? JSON.stringify({
                answer: opts.ai || 'AC',
                explanation: opts.explanation || 'Các phương án này thỏa mãn điều kiện của câu hỏi.'
              })
            }
          }]
        })
      }), opts.aiDelay || 0);
    };
    window.Tesseract = {
      createWorker: async () => ({
        recognize: async () => {
          window.ocrCalls++;
          await new Promise(r => setTimeout(r, opts.ocrDelay || 0));
          if (opts.ocrError) throw Error('OCR');
          return { data: { text: opts.text || 'Select one answer' } };
        },
        terminate: async () => {}
      })
    };

    function createPoll(s) {
      const sec = document.createElement('section');
      sec.setAttribute('aria-label', 'Bình chọn đáp án');
      const counts = { ...(s.counts || { A: 2, B: 0, C: 0, D: 0 }) };
      let totalVoters = s.totalVoters ?? Object.values(counts).reduce((a, b) => a + b, 0);
      const pressed = new Set(s.pressed || []);
      let multiOn = Boolean(s.multiOn);

      const header = document.createElement('header');
      const titleWrap = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = 'Bình chọn đáp án';
      const votersP = document.createElement('p');
      votersP.innerHTML = '<span class="font-num">' + totalVoters + '</span> người đã chọn';
      titleWrap.append(h2, votersP);
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-checked', String(multiOn));
      sw.textContent = 'Nhiều đáp án';
      sw.onclick = () => { multiOn = !multiOn; sw.setAttribute('aria-checked', String(multiOn)); };
      header.append(titleWrap, sw);

      const group = document.createElement('div');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', 'Các phương án');

      function renderBtns() {
        group.replaceChildren();
        const denom = Math.max(1, totalVoters);
        for (const key of Object.keys(counts)) {
          const cnt = counts[key];
          const pct = Math.round((cnt / denom) * 100);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('aria-pressed', String(pressed.has(key)));
          btn.setAttribute('aria-label', 'Phương án ' + key + ', ' + cnt + ' người chọn, ' + pct + '%');
          btn.innerHTML =
            '<span aria-hidden="true" style="transform: scaleX(' + (pct / 100) + ');"></span>' +
            '<span aria-hidden="true">' + key + '</span>' +
            '<span aria-hidden="true"></span>' +
            '<span aria-hidden="true"><span>' + cnt + '</span><span>' + pct + '%</span></span>';
          btn.onclick = () => {
            if (!s.noMutateOnClick) {
              const was = pressed.has(key);
              if (!multiOn) {
                for (const k of [...pressed]) { pressed.delete(k); counts[k] = Math.max(0, counts[k] - 1); }
                if (!was) { pressed.add(key); counts[key] = (counts[key] || 0) + 1; }
              } else {
                if (was) { pressed.delete(key); counts[key] = Math.max(0, counts[key] - 1); }
                else { pressed.add(key); counts[key] = (counts[key] || 0) + 1; }
              }
              if (pressed.size > 0 && !(s.pressed || []).length) totalVoters = (s.totalVoters ?? 0) + 1;
              votersP.querySelector('.font-num').textContent = String(totalVoters);
              renderBtns();
            }
          };
          group.append(btn);
        }
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = 'Thêm phương án';
        group.append(addBtn);
      }
      renderBtns();
      sec.append(header, group);
      return sec;
    }

    function createComments(s, standalone) {
      const wrap = document.createElement(standalone ? 'section' : 'div');
      if (standalone) wrap.setAttribute('aria-label', 'Bình luận về ảnh');
      const hWrap = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = 'Bình luận · ' + (s.comments?.length || 0);
      hWrap.append(h2);
      wrap.append(hWrap);

      if (s.fuoAi) {
        const aiEl = document.createElement('div');
        aiEl.className = 'fuo-ai-card';
        aiEl.innerHTML = '<div><span>FUO AI</span></div><div class="rich-text"></div><div>Đã ghim</div>';
        aiEl.querySelector('.rich-text').textContent = s.fuoAi;
        wrap.append(aiEl);
      }

      const ul = document.createElement('ul');
      ul.setAttribute('aria-label', 'Bình luận');
      for (const [i, c] of (s.comments || []).entries()) {
        const li = document.createElement('li');
        li.id = 'media-comment-' + i;
        const author = typeof c === 'string' ? 'user' + i : (c.author || 'user' + i);
        const html = typeof c === 'object' && c.html ? c.html : null;
        const text = typeof c === 'string' ? c : (c.text || '');
        li.innerHTML = '<a href="/u/' + author + '">' + author + '</a><div class="rich-text"></div>';
        if (html) li.querySelector('.rich-text').innerHTML = html;
        else { const p = document.createElement('p'); p.textContent = text; li.querySelector('.rich-text').append(p); }
        ul.append(li);
      }
      wrap.append(ul);

      const comp = document.createElement('div');
      comp.innerHTML = '<div contenteditable="true" role="textbox" aria-multiline="true" aria-label="Viết bình luận về ảnh này" class="tiptap"></div>';
      wrap.append(comp);

      if (s.turnstile) {
        const tsWrap = document.createElement('div');
        const iframe = document.createElement('iframe');
        iframe.title = 'Cloudflare Turnstile';
        tsWrap.append(iframe);
        wrap.append(tsWrap);
      }
      return wrap;
    }

    window.slideSpecs = null;
    window.setSlide = (s = {}) => {
      document.querySelector('dialog')?.remove();
      document.querySelector('main')?.remove();
      const index = s.index || 1;
      const total = s.total || 2;
      const mediaPath = s.mediaPath || ('/media/q' + index + '-webp.' + (138416 + index) + '/');
      if (s.pushState) history.pushState({}, '', mediaPath);

      if (s.standalone) {
        const main = document.createElement('main');
        main.innerHTML =
          '<nav aria-label="Đường dẫn"><a href="/threads/aig202c-su26-fe.7263/">Đề Thi FE - AIG202c - SU26 - FE</a></nav>' +
          '<h1>Đề Thi FE - AIG202c - SU26 - FE — ảnh ' + index + '/' + total + '</h1>' +
          '<figure><img src="' + (s.imgSrc || '/q' + index + '.png') + '" alt="Ảnh ' + index + '"><figcaption>Ảnh ' + index + '/' + total + ' <a href="/threads/aig202c-su26-fe.7263/#post-1">Bài viết gốc</a></figcaption></figure>';
        if (s.loading) {
          const skel = document.createElement('div');
          skel.setAttribute('aria-label', 'Đang tải bình chọn đáp án');
          main.append(skel);
        } else {
          main.append(createPoll(s));
        }
        main.append(createComments(s, true));
        document.body.append(main);
        return;
      }

      const dlg = document.createElement('dialog');
      dlg.open = true;
      dlg.setAttribute('aria-label', 'Ảnh trong bài #1');
      dlg.innerHTML =
        '<div>' +
          '<div><p aria-live="polite">' + index + ' / ' + total + '</p><a aria-label="Mở trang ảnh" href="' + mediaPath + '">Mở trang ảnh</a></div>' +
          '<div><img data-lightbox-img="" alt="Ảnh ' + index + ' trên ' + total + '" src="' + (s.imgSrc || '/q' + index + '.png') + '"></div>' +
          '<nav aria-label="Ảnh thu nhỏ"><ol></ol></nav>' +
          '<aside aria-label="Thảo luận về ảnh">' +
            '<div><div><a href="/u/ngochoa87">ngochoa87</a><p>Ảnh ' + (s.asideIndex || index) + '/' + total + '</p></div><p>Bài viết gốc: <a href="/threads/aig202c-su26-fe.7263/#post-1">Đề Thi FE - AIG202c - SU26 - FE</a></p></div>' +
          '</aside>' +
        '</div>';
      const ol = dlg.querySelector('nav[aria-label="Ảnh thu nhỏ"] ol');
      for (let i = 1; i <= total; i++) {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Ảnh ' + i);
        if (i === index) btn.setAttribute('aria-current', 'true');
        btn.onclick = () => {
          const nextSpec = window.slideSpecs?.[i - 1] || { index: i, total, pushState: true };
          window.setSlide(nextSpec);
        };
        li.append(btn);
        ol.append(li);
      }
      const aside = dlg.querySelector('aside');
      if (s.loading) {
        const skel = document.createElement('div');
        skel.setAttribute('aria-label', 'Đang tải bình chọn đáp án');
        aside.append(skel);
      } else {
        aside.append(createPoll(s));
      }
      aside.append(createComments(s, false));
      document.body.append(dlg);
    };

    window.setSlide(spec);
  }, { spec, opts });
  await page.addScriptTag({ content: script });
  return page.locator('.fuo-quiz');
}

const pollOption = (page, letter) => page.locator('section[aria-label="Bình chọn đáp án"] [role="group"][aria-label="Các phương án"] button[aria-pressed][aria-label^="Phương án ' + letter + ',"]');

test('zero-flash spoiler shield hides poll counts, fill bars, FUO AI and comments while keeping composer & turnstile visible', async ({ page }) => {
  const p = await fixture(page, {
    counts: { A: 2, B: 0, C: 0, D: 0 },
    totalVoters: 2,
    fuoAi: 'Đáp án: A\nGiải thích của FUO AI.',
    comments: ['A'],
    turnstile: true
  });
  await expect(p).toBeVisible();
  const poll = page.locator('section[aria-label="Bình chọn đáp án"]');
  await expect(poll.locator('header p')).toBeHidden();
  const optA = pollOption(page, 'A');
  await expect(optA.locator('> span').first()).toHaveCSS('opacity', '0');
  await expect(optA.locator('> span').last()).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.fuo-ai-card')).toBeHidden();
  await expect(page.locator('ul[aria-label="Bình luận"]')).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Viết bình luận về ảnh này' })).toBeVisible();
  await expect(page.locator('iframe[title="Cloudflare Turnstile"]')).toBeVisible();
});

test('in-place single-answer click grades against pre-click baseline and auto-reveals poll, FUO AI & comments', async ({ page }) => {
  const p = await fixture(page, {
    counts: { A: 2, B: 0, C: 0, D: 0 },
    totalVoters: 2,
    fuoAi: 'Đáp án: A\nGiải thích AI.',
    comments: ['A']
  });
  await expect(p.locator('strong')).toContainText('Q1 · Chọn một đáp án');
  await pollOption(page, 'B').click();
  await expect(p).toContainText('Sai · Nguồn bình chọn cộng đồng (2 người)');
  await expect(pollOption(page, 'A')).toHaveAttribute('data-fuo-mark', 'right');
  await expect(pollOption(page, 'B')).toHaveAttribute('data-fuo-mark', 'wrong');
  await expect(page.locator('section[aria-label="Bình chọn đáp án"] header p')).toBeVisible();
  await expect(pollOption(page, 'A').locator('> span').last()).toHaveCSS('visibility', 'visible');
  await expect(page.locator('.fuo-ai-card')).toBeVisible();
  await expect(page.locator('ul[aria-label="Bình luận"]')).toBeVisible();
});

test('excludes pre-existing own vote so single self-vote does not grade as right', async ({ page }) => {
  const p = await fixture(page, {
    counts: { A: 0, B: 1, C: 0, D: 0 },
    totalVoters: 1,
    pressed: ['B'],
    fuoAi: 'Đáp án: A\nB sai vì...'
  });
  await expect(p.locator('strong')).toContainText('Q1 · Chọn một đáp án');
  await pollOption(page, 'B').click();
  await expect(p).toContainText('Sai · Nguồn FUO AI (bình luận ghim)');
  await expect(pollOption(page, 'A')).toHaveAttribute('data-fuo-mark', 'right');
  await expect(pollOption(page, 'B')).toHaveAttribute('data-fuo-mark', 'wrong');
});

test('3-tier priority: community beats FUO AI (shows disagreement), tie falls back to FUO AI free, empty falls back to BYOK', async ({ page }) => {
  let p = await fixture(page, {
    counts: { A: 3, B: 1, C: 0, D: 0 },
    totalVoters: 4,
    fuoAi: 'Đáp án: B\nFUO AI chọn B.'
  }, { key: 'test-secret', ai: 'C' });
  await pollOption(page, 'A').click();
  await expect(p).toContainText('Đúng · Nguồn bình chọn cộng đồng (4 người)');
  await expect(p).toContainText('FUO AI chọn B, khác đáp án cộng đồng A');
  expect(await page.evaluate(() => calls)).toBe(0);

  p = await fixture(page, {
    counts: { A: 2, B: 2, C: 0, D: 0 },
    totalVoters: 4,
    fuoAi: 'Đáp án: B\nFUO AI chọn B.'
  }, { key: 'test-secret', ai: 'C' });
  await pollOption(page, 'B').click();
  await expect(p).toContainText('Đúng · Nguồn FUO AI (bình luận ghim)');
  expect(await page.evaluate(() => calls)).toBe(0);

  p = await fixture(page, {
    counts: { A: 0, B: 0, C: 0, D: 0 },
    totalVoters: 0
  }, { key: 'test-secret', ai: 'A', text: 'Select one answer' });
  await expect(p.locator('strong')).toContainText('Chọn một đáp án');
  await pollOption(page, 'A').click();
  await expect(p).toContainText('Đúng · Nguồn DeepSeek');
  expect(await page.evaluate(() => calls)).toBe(1);
});

test('multi-answer flow waits for Chấm đáp án, requires exact set, and handles sum(counts) > totalVoters', async ({ page }) => {
  const p = await fixture(page, {
    counts: { A: 3, B: 0, C: 3, D: 1 },
    totalVoters: 3,
    comments: ['A,C', 'C,A']
  });
  await expect(p.locator('strong')).toContainText('Chọn nhiều đáp án');
  await expect(p.getByRole('button', { name: 'Chấm đáp án', exact: true })).toBeDisabled();
  await pollOption(page, 'A').click();
  await expect(pollOption(page, 'A')).toHaveAttribute('data-fuo-selected', 'true');
  await expect(p).not.toContainText('Nguồn');
  await pollOption(page, 'C').click();
  await p.getByRole('button', { name: 'Chấm đáp án', exact: true }).click();
  await expect(p).toContainText('Đúng · Nguồn đa số bình luận');
  await expect(page.locator('section[aria-label="Bình chọn đáp án"]')).toHaveClass(/fuo-revealed/);

  const p2 = await fixture(page, { counts: { A: 2, B: 0, C: 2, D: 0 }, totalVoters: 2 });
  await expect(p2.locator('strong')).toContainText('Chọn nhiều đáp án');
  await pollOption(page, 'A').click();
  await p2.getByRole('button', { name: 'Chấm đáp án', exact: true }).click();
  await expect(p2).toContainText('Sai · Nguồn bình chọn cộng đồng (2 người)');
  await expect(pollOption(page, 'C')).toHaveAttribute('data-fuo-mark', 'right');
});

test('manual reveal toggle and Làm lại re-masks spoilers and preserves stars', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2, fuoAi: 'Đáp án: A\nOK', comments: ['A'] });
  const toggleBtn = p.getByRole('button', { name: 'Hiện kết quả & bình luận', exact: true });
  await toggleBtn.click();
  await expect(page.locator('section[aria-label="Bình chọn đáp án"] header p')).toBeVisible();
  await expect(page.locator('.fuo-ai-card')).toBeVisible();
  await p.getByRole('button', { name: 'Ẩn kết quả & bình luận', exact: true }).click();
  await expect(page.locator('.fuo-ai-card')).toBeHidden();

  await p.getByRole('button', { name: '☆ Đánh dấu', exact: true }).click();
  await pollOption(page, 'B').click();
  await expect(p).toContainText('Sai');
  await expect(page.locator('.fuo-ai-card')).toBeVisible();
  await p.getByRole('button', { name: 'Làm lại', exact: true }).click();
  await expect(page.locator('.fuo-ai-card')).toBeHidden();
  await expect(page.locator('section[aria-label="Bình chọn đáp án"]')).toHaveClass(/fuo-retrying/);
  await expect(p.getByRole('button', { name: '★ Đã đánh dấu', exact: true })).toBeVisible();
});

test('SPA slide navigation groups review under parent thread and auto-exports CSV on final slide', async ({ page }) => {
  const p = await fixture(page, { index: 1, total: 2, counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 });
  await pollOption(page, 'B').click();
  await expect(p).toContainText('Sai');

  await page.evaluate(() => setSlide({ index: 2, total: 2, pushState: true, counts: { A: 0, B: 3, C: 0, D: 0 }, totalVoters: 3 }));
  await expect(p.locator('strong')).toContainText('Q2 · Chọn một đáp án');
  await expect(page.locator('section[aria-label="Bình chọn đáp án"] header p')).toBeHidden();

  const downloadPromise = page.waitForEvent('download');
  await pollOption(page, 'B').click();
  const download = await downloadPromise;
  await expect(p).toContainText('Đã xuất CSV');
  const csv = fs.readFileSync(await download.path(), 'utf8');
  expect(csv).toContain('Q1');
  expect(csv).toContain('"B","A"');
  expect(csv).toContain('/threads/aig202c-su26-fe.7263/');
  expect(await page.evaluate(() => Object.keys(saved))).toEqual(['fuoReview:/threads/aig202c-su26-fe.7263/']);
});

test('standalone /media/* page mounts cleanly on mobile and desktop without horizontal overflow', async ({ page }) => {
  const p = await fixture(page, {
    standalone: true,
    index: 1,
    total: 60,
    counts: { A: 2, B: 0, C: 0, D: 0 },
    totalVoters: 2,
    fuoAi: 'Đáp án: A\nGiải thích.',
    comments: ['A']
  }, { url: 'https://fuoverflow.com/media/q1-webp.138417/' });
  await expect(p).toBeVisible();
  await expect(page.locator('section[aria-label="Bình chọn đáp án"] header p')).toBeHidden();
  await expect(page.locator('ul[aria-label="Bình luận"]')).toBeHidden();
  await pollOption(page, 'A').click();
  await expect(p).toContainText('Đúng · Nguồn bình chọn cộng đồng (2 người)');
  await expect(page.locator('ul[aria-label="Bình luận"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('cross-origin cdn.fuoverflow.com image loads via GM_xmlhttpRequest fallback while untrusted origins are rejected', async ({ page }) => {
  const p = await fixture(page, {
    counts: { A: 0, B: 0, C: 0, D: 0 },
    totalVoters: 0,
    imgSrc: 'https://cdn.fuoverflow.com/exam-xs/abc123.webp'
  }, { key: 'test-secret', ai: 'A', corsFailCdn: true, text: 'Select one answer' });
  await expect(p.locator('strong')).toContainText('Chọn một đáp án');
  await pollOption(page, 'A').click();
  await expect(p).toContainText('Đúng · Nguồn DeepSeek');

  const pBad = await fixture(page, {
    counts: { A: 0, B: 0, C: 0, D: 0 },
    totalVoters: 0,
    imgSrc: 'https://evil.example.com/q1.webp'
  }, { key: 'test-secret', ai: 'A', text: 'Select one answer' });
  await pBad.getByRole('button', { name: 'Xem đáp án AI' }).click();
  await expect(pBad.locator('.fuo-ai-result')).toContainText('Không đọc được ảnh câu hỏi');
});

test('progress bar tracks stats and quick-jump buttons navigate to wrong/starred slides', async ({ page }) => {
  const p = await fixture(page, { index: 1, total: 3, counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 });
  await page.evaluate(() => {
    window.slideSpecs = [
      { index: 1, total: 3, pushState: true, counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 },
      { index: 2, total: 3, pushState: true, counts: { A: 0, B: 2, C: 0, D: 0 }, totalVoters: 2 },
      { index: 3, total: 3, pushState: true, counts: { A: 0, B: 0, C: 2, D: 0 }, totalVoters: 2 }
    ];
  });
  await expect(p.locator('.fuo-progress')).toContainText('Tiến độ: 0/3');
  await pollOption(page, 'B').click();
  await expect(p.locator('.fuo-progress')).toContainText('Tiến độ: 1/3 · Đúng 0%');
  await expect(p.getByRole('button', { name: 'Câu sai (1)', exact: true })).toBeVisible();
  await page.locator('nav[aria-label="Ảnh thu nhỏ"] button[aria-label="Ảnh 2"]').click();
  await expect(p.locator('strong')).toContainText('Q2');
  await pollOption(page, 'B').click();
  await expect(p.locator('.fuo-progress')).toContainText('Tiến độ: 2/3 · Đúng 50%');
  await p.getByRole('button', { name: '☆ Đánh dấu', exact: true }).click();
  await expect(p.getByRole('button', { name: 'Câu gắn sao (1)', exact: true })).toBeVisible();
  await p.getByRole('button', { name: 'Câu sai (1)', exact: true }).click();
  await expect(p.locator('strong')).toContainText('Q1');
  await p.getByRole('button', { name: 'Câu gắn sao (1)', exact: true }).click();
  await expect(p.locator('strong')).toContainText('Q2');
});

test('persisted OCR cache skips Tesseract across visits and saves after grading', async ({ page }) => {
  const p = await fixture(page, {
    counts: { A: 0, B: 0, C: 0, D: 0 },
    totalVoters: 0,
    imgSrc: 'https://fuoverflow.com/Q1.png'
  }, { store: { fuoOcrTypeCache: { 'https://fuoverflow.com/Q1.png': 'multiple' } } });
  await expect(p.locator('strong')).toContainText('Chọn nhiều đáp án');
  expect(await page.evaluate(() => ocrCalls)).toBe(0);
  await page.evaluate(() => setSlide({ index: 2, total: 2, pushState: true, imgSrc: 'https://fuoverflow.com/Q2.png', counts: { A: 0, B: 0, C: 0, D: 0 }, totalVoters: 0 }));
  await expect(p.locator('strong')).toContainText('Q2 · Chọn một đáp án');
  expect(await page.evaluate(() => ocrCalls)).toBe(1);
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  expect(await page.evaluate(() => gmStore.fuoOcrTypeCache['https://fuoverflow.com/Q2.png'])).toBe('single');
});

test('exam mode hides per-question grading, grades all on submit and jumps to wrong items', async ({ page }) => {
  const p = await fixture(page, { index: 1, total: 2, counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 });
  await page.evaluate(() => {
    window.prompt = () => '30';
    window.slideSpecs = [
      { index: 1, total: 2, pushState: true, counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 },
      { index: 2, total: 2, pushState: true, counts: { A: 0, B: 2, C: 0, D: 0 }, totalVoters: 2 }
    ];
  });
  await p.getByRole('button', { name: 'Thi thử', exact: true }).click();
  await expect(p.locator('.fuo-exam-bar')).toContainText('Thi thử · Đã chọn 0/2');
  await expect(p.getByRole('button', { name: 'Xem đáp án AI' })).toBeDisabled();
  await expect(p.getByRole('button', { name: 'Hiện kết quả & bình luận' })).toBeDisabled();
  await pollOption(page, 'B').click();
  await expect(pollOption(page, 'B')).toHaveAttribute('data-fuo-selected', 'true');
  await expect(pollOption(page, 'B')).not.toHaveAttribute('data-fuo-mark');
  await page.locator('nav[aria-label="Ảnh thu nhỏ"] button[aria-label="Ảnh 2"]').click();
  await expect(p.locator('strong')).toContainText('Q2');
  await pollOption(page, 'B').click();
  await expect(p.locator('.fuo-exam-bar')).toContainText('Đã chọn 2/2');
  await p.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await expect(p.locator('.fuo-exam-summary')).toContainText('Kết quả thi thử: 1/2 đúng (50%)');
  await p.locator('.fuo-exam-wrong-list').getByRole('button', { name: 'Q1', exact: true }).click();
  await expect(p.locator('strong')).toContainText('Q1');
  await expect(pollOption(page, 'B')).toHaveAttribute('data-fuo-mark', 'wrong');
  await expect(pollOption(page, 'A')).toHaveAttribute('data-fuo-mark', 'right');
});

test('review round loops wrong and starred questions until all are answered right', async ({ page }) => {
  const p = await fixture(page, { index: 1, total: 2, counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 });
  await page.evaluate(() => {
    window.slideSpecs = [
      { index: 1, total: 2, pushState: true, counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 },
      { index: 2, total: 2, pushState: true, counts: { A: 0, B: 2, C: 0, D: 0 }, totalVoters: 2 }
    ];
  });
  await pollOption(page, 'B').click();
  await page.locator('nav[aria-label="Ảnh thu nhỏ"] button[aria-label="Ảnh 2"]').click();
  await expect(p.locator('strong')).toContainText('Q2');
  await p.getByRole('button', { name: '☆ Đánh dấu', exact: true }).click();
  await p.getByRole('button', { name: 'Ôn tập (2)', exact: true }).click();
  await expect(p.locator('.fuo-review-bar')).toContainText('Vòng ôn tập: còn 2/2 câu');
  await expect(p.locator('strong')).toContainText('Q1');
  await pollOption(page, 'A').click();
  await expect(p.locator('.fuo-review-bar')).toContainText('Vòng ôn tập: còn 1/2 câu');
  await p.getByRole('button', { name: 'Câu tiếp', exact: true }).click();
  await expect(p.locator('strong')).toContainText('Q2');
  await pollOption(page, 'B').click();
  await expect(p.locator('.fuo-review-bar')).toContainText('Đã ôn đúng hết 2/2 câu.');
});

test('backup modal exports Anki TSV and JSON without API keys and restores progress', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 }, { key: 'super-secret-key' });
  await pollOption(page, 'B').click();
  await p.getByRole('button', { name: '☆ Đánh dấu', exact: true }).click();
  await p.getByRole('button', { name: 'Sao lưu', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Sao lưu & Xuất dữ liệu' });
  const ankiDl = page.waitForEvent('download');
  await d.getByRole('button', { name: 'Xuất Anki (.tsv)', exact: true }).click();
  const ankiContent = fs.readFileSync(await (await ankiDl).path(), 'utf8');
  expect(ankiContent).toContain('Q1');
  expect(ankiContent).toContain('Đáp án:</b> A');
  expect(ankiContent).toContain('sai danh-dau');
  const jsonDl = page.waitForEvent('download');
  await d.getByRole('button', { name: 'Sao lưu JSON', exact: true }).click();
  const backupPath = await (await jsonDl).path();
  const backupText = fs.readFileSync(backupPath, 'utf8');
  expect(backupText).not.toContain('super-secret-key');
  const parsed = JSON.parse(backupText);
  expect(parsed.app).toBe('fuo-reui');
  expect(parsed.review.questions['q1-webp.138417'].wrong).toBe(true);
  parsed.review.questions['q9-webp.138499'] = { title: 'Q9', index: 9, selected: 'C', answer: 'D', wrong: true, starred: true };
  const modified = JSON.stringify(parsed);
  await d.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(modified, 'utf8') });
  await expect(d.getByRole('alert')).toContainText('Đã khôi phục 2 câu');
  await d.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(p.getByRole('button', { name: 'Câu sai (2)', exact: true })).toBeVisible();
});

test('keyboard shortcuts select options, star, toggle comments, and ignore editable targets', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2, comments: ['A'] });
  await expect(p.locator('strong')).toContainText('Q1 · Chọn một đáp án');
  await page.getByRole('textbox', { name: 'Viết bình luận về ảnh này' }).focus();
  await page.keyboard.press('a');
  await expect(p).not.toContainText('Nguồn');
  await page.locator('aside[aria-label="Thảo luận về ảnh"] h2').first().click({ force: true });
  await page.keyboard.press('s');
  await expect(p.getByRole('button', { name: '★ Đã đánh dấu', exact: true })).toBeVisible();
  await page.keyboard.press('a');
  await expect(p).toContainText('Đúng · Nguồn bình chọn cộng đồng (2 người)');
  await page.keyboard.press('m');
  await expect(page.locator('ul[aria-label="Bình luận"]')).toBeHidden();
});

test('key deletion invalidates cached AI and keeps secrets outside the dialog', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 }, { key: 'test-secret' });
  await p.getByRole('button', { name: 'Xem đáp án AI' }).click();
  await expect(p.locator('.fuo-ai-answer')).toBeVisible();
  await p.getByRole('button', { name: 'Cài đặt AI', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cài đặt AI (BYOK)' });
  expect(await dialog.evaluate(el => el.outerHTML)).not.toContain('test-secret');
  await dialog.getByRole('button', { name: 'Xóa key', exact: true }).click();
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(p.locator('.fuo-ai-result')).toBeHidden();
  await p.getByRole('button', { name: 'Xem đáp án AI' }).click();
  await expect(p.locator('.fuo-ai-result')).toContainText('Hãy cài API key');
  expect(await page.evaluate(() => calls)).toBe(1);
});

test('key deletion rejects an AI response already in flight', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 }, { key: 'test-secret', aiDelay: 1000 });
  await p.getByRole('button', { name: 'Xem đáp án AI' }).click();
  await expect.poll(() => page.evaluate(() => calls)).toBe(1);
  await p.getByRole('button', { name: 'Cài đặt AI', exact: true }).click();
  await page.getByRole('dialog', { name: 'Cài đặt AI (BYOK)' }).getByRole('button', { name: 'Xóa key', exact: true }).click();
  await page.getByRole('dialog', { name: 'Cài đặt AI (BYOK)' }).getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(p.locator('.fuo-ai-result')).toContainText('Cấu hình AI đã thay đổi');
  await expect(p.locator('.fuo-ai-answer')).toHaveCount(0);
});

for (const type of ['openai', 'deepseek', 'anthropic', 'gemini']) {
  test('BYOK request and response for ' + type, async ({ page }) => {
    const profile = { baseUrl: 'https://example.com/v1', compatibleType: type, model: 'test-model', thinking: 'high' };
    const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 }, {
      store: { fuoAIConfig: { activeId: type, providers: { [type]: profile } }, fuoAIKeys: { [type]: { origin: 'https://example.com', key: 'test-secret' } } }
    });
    await page.evaluate(type => {
      window.GM_xmlhttpRequest = args => {
        window.request = { url: args.url, headers: args.headers, body: JSON.parse(args.data), anonymous: args.anonymous, timeout: args.timeout };
        const text = JSON.stringify({ answer: 'A', explanation: 'Valid explanation.' });
        const result = type === 'anthropic' ? { content: [{ type: 'text', text }] } : type === 'gemini' ? { candidates: [{ content: { parts: [{ text }] } }] } : { choices: [{ message: { content: text } }] };
        setTimeout(() => args.onload({ status: 200, responseText: JSON.stringify(result) }), 0);
      };
    }, type);
    await p.getByRole('button', { name: 'Xem đáp án AI' }).click();
    await expect(p.locator('.fuo-ai-answer')).toHaveText('Đáp án: A');
    const req = await page.evaluate(() => request);
    expect(req.anonymous).toBe(true);
    expect(req.timeout).toBe(120000);
    expect(req.url).not.toContain('test-secret');
    expect(req.body.model || 'test-model').toBe('test-model');
    if (type === 'anthropic') { expect(req.headers['x-api-key']).toBe('test-secret'); expect(req.body.thinking.budget_tokens).toBe(10240); }
    else if (type === 'gemini') { expect(req.headers['x-goog-api-key']).toBe('test-secret'); expect(req.body.generationConfig.thinkingConfig.thinkingBudget).toBe(8192); }
    else { expect(req.headers.Authorization).toBe('Bearer test-secret'); expect(req.body.messages[0].content[2].image_url.url).toMatch(/^data:image\/png;base64,/); }
  });
}

test('settings validate endpoints, remove keys on origin change and contain keyboard focus', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 }, { key: 'test-secret' });
  await p.getByRole('button', { name: 'Cài đặt AI', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Cài đặt AI (BYOK)' });
  await d.getByRole('button', { name: 'Lưu cấu hình' }).focus();
  await page.keyboard.press('Tab');
  await expect(d.getByRole('button', { name: 'Đóng hộp thoại' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(d.getByRole('button', { name: 'Lưu cấu hình' })).toBeFocused();
  for (const url of ['http://example.com/v1', 'https://user:pass@example.com/v1', 'https://example.com/v1?key=abc']) {
    await d.getByLabel('Base URL', { exact: true }).fill(url);
    await d.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(d.getByRole('alert')).toBeVisible();
    expect(await page.evaluate(() => gmStore.fuoAIConfig)).toBeUndefined();
  }
  await d.getByLabel('Base URL', { exact: true }).fill('https://example.com/v1');
  await d.getByRole('button', { name: 'Lưu cấu hình' }).click();
  await expect(d.getByRole('alert')).toContainText('API key cũ đã bị xóa');
  expect(await page.evaluate(() => gmStore.deepseekKey)).toBe('');
  await page.keyboard.press('Escape');
  await expect(p.getByRole('button', { name: 'Cài đặt AI', exact: true })).toBeFocused();
});

test('model discovery filters invalid IDs and stale lists on endpoint edit', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 }, { key: 'test-secret' });
  await page.evaluate(() => {
    window.GM_xmlhttpRequest = args => {
      window.modelRequest = { url: args.url, anonymous: args.anonymous, headers: args.headers };
      setTimeout(() => args.onload({ status: 200, responseText: JSON.stringify({ data: [{ id: 'valid-model', name: '<script>bad</script>' }, { id: '../bad' }, { id: 'valid-model' }] }) }), 0);
    };
  });
  await p.getByRole('button', { name: 'Cài đặt AI', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Cài đặt AI (BYOK)' });
  await d.getByRole('button', { name: 'Tải danh sách (/models)', exact: true }).click();
  await expect(d.getByLabel('Danh sách model')).toBeVisible();
  expect(await d.getByLabel('Danh sách model').locator('option').count()).toBe(2);
  expect(await d.locator('script').count()).toBe(0);
  expect(await page.evaluate(() => modelRequest)).toMatchObject({ url: 'https://api.deepseek.com/models', anonymous: true });
  await d.getByLabel('Base URL', { exact: true }).fill('https://example.com/v1');
  await expect(d.getByLabel('Danh sách model')).toBeHidden();
});

test('long AI explanations stay structured and reachable in a fixed sidebar', async ({ page }) => {
  const explanation = 'Trong biểu đồ ER, hình chữ nhật kép biểu diễn thực thể yếu. ' + 'Phương án B sai vì thuộc tính đa trị dùng hình elip kép. '.repeat(35) + '\nKết luận: chọn A.';
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 }, { key: 'test', ai: 'A', explanation });
  await page.addStyleTag({ content: 'aside[aria-label="Thảo luận về ảnh"]{position:fixed;right:0;top:0;width:360px;height:100dvh;overflow-y:auto}' });
  await p.getByRole('button', { name: 'Xem đáp án AI' }).click();
  const result = p.locator('.fuo-ai-result');
  await expect(result.locator('.fuo-ai-answer')).toHaveText('Đáp án: A');
  await expect(result.locator('p').last()).toHaveText('Kết luận: chọn A.');
  expect(await result.locator('p').count()).toBeGreaterThan(2);
  await result.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  const sidebar = page.locator('aside[aria-label="Thảo luận về ảnh"]');
  await sidebar.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(result.locator('p').last()).toBeInViewport();
  expect(await sidebar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('OCR multiple, OCR error retry, and loading poll lock', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 0, B: 0, C: 0, D: 0 }, totalVoters: 0 }, { ocrError: true, key: 'test', ai: 'AC' });
  await expect(p.getByRole('button', { name: 'Thử lại phân loại' })).toBeVisible();
  await page.evaluate(() => { Tesseract.createWorker = async () => ({ recognize: async () => ({ data: { text: 'Select two answers' } }), terminate: async () => {} }); });
  await p.getByRole('button', { name: 'Thử lại phân loại' }).click();
  await expect(p.locator('strong')).toContainText('Chọn nhiều đáp án');
  await pollOption(page, 'A').click();
  await pollOption(page, 'C').click();
  await p.getByRole('button', { name: 'Chấm đáp án', exact: true }).click();
  await expect(p).toContainText('Đúng · Nguồn DeepSeek');

  await page.evaluate(() => { window.ocrCalls = 0; setSlide({ index: 2, total: 2, loading: true }); });
  await expect(p.locator('strong')).toContainText('Đang phân loại');
  expect(await page.evaluate(() => ocrCalls)).toBe(0);
});

test('HTML line breaks preserve comment votes, exclude quotes, and deduplicate authors', async ({ page }) => {
  const p = await fixture(page, {
    counts: { A: 0, B: 0, C: 0, D: 0 },
    totalVoters: 0,
    comments: [
      { author: 'u1', html: '<blockquote>Đáp án: B</blockquote><p>Lý do:</p><br>-> C,A' },
      { author: 'u1', text: 'B' },
      { author: 'u2', text: 'Có lẽ A hoặc B nhưng mình chưa chắc.' }
    ]
  });
  await expect(p.locator('strong')).toContainText('Chọn nhiều đáp án');
  await pollOption(page, 'A').click();
  await pollOption(page, 'C').click();
  await p.getByRole('button', { name: 'Chấm đáp án', exact: true }).click();
  await expect(p).toContainText('Đúng · Nguồn 1 bình luận');
  expect(await page.evaluate(() => calls + ocrCalls)).toBe(0);
});

test('rejects invalid or contradictory AI results', async ({ page }) => {
  for (const content of ['C', '{}', JSON.stringify({ answer: 'UNKNOWN', explanation: 'Không chắc.' }), JSON.stringify({ answer: 'C', explanation: 'Đáp án: A\nLý do.' })]) {
    const p = await fixture(page, { counts: { A: 0, B: 0, C: 0, D: 0 }, totalVoters: 0 }, { key: 'test', aiRaw: content });
    await expect(p.locator('strong')).toContainText('Chọn một đáp án');
    await pollOption(page, 'B').click();
    await expect(p).toContainText('chưa trả về đáp án và lời giải hợp lệ');
    await expect(pollOption(page, 'A')).not.toHaveAttribute('data-fuo-mark', 'right');
  }
});

test('extension gm-shim hydrates chrome.storage.local and runs shared core.js', async ({ page }) => {
  const coreScript = fs.readFileSync('extension/core.js', 'utf8');
  const shimScript = fs.readFileSync('extension/gm-shim.js', 'utf8');
  await page.route('https://fuoverflow.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
  await page.goto('https://fuoverflow.com/threads/ext-test.100/');
  await page.evaluate(() => {
    window.extStore = {};
    window.chrome = {
      storage: { local: { get: (_k, cb) => cb({ ...window.extStore }), set: obj => Object.assign(window.extStore, obj) } },
      runtime: { sendMessage: (_m, cb) => cb({ ok: true, status: 200, responseText: '{}' }), onMessage: { addListener: () => {} } }
    };
    const dlg = document.createElement('dialog');
    dlg.open = true;
    dlg.innerHTML =
      '<div>' +
        '<div><p aria-live="polite">1 / 1</p><a aria-label="Mở trang ảnh" href="/media/q1-webp.138417/">Mở trang ảnh</a></div>' +
        '<img data-lightbox-img="" src="/Q1.png">' +
        '<aside aria-label="Thảo luận về ảnh">' +
          '<p>Bài viết gốc: <a href="/threads/ext-test.100/#post-1">Ext Test</a></p>' +
          '<section aria-label="Bình chọn đáp án"><header><div><h2>Bình chọn đáp án</h2><p>1 người đã chọn</p></div><button type="button" role="switch" aria-checked="false">Nhiều đáp án</button></header>' +
          '<div role="group" aria-label="Các phương án"><button type="button" aria-pressed="false" aria-label="Phương án A, 1 người chọn, 100%"><span></span><span>A</span><span></span><span><span>1</span><span>100%</span></span></button></div></section>' +
        '</aside>' +
      '</div>';
    document.body.append(dlg);
  });
  await page.addScriptTag({ content: coreScript });
  await page.addScriptTag({ content: shimScript });
  const p = page.locator('.fuo-quiz');
  await expect(p.locator('strong')).toContainText('Q1 · Chọn một đáp án');
  await pollOption(page, 'A').click();
  await expect(p).toContainText('Đúng · Nguồn bình chọn cộng đồng (1 người)');
  expect(await page.evaluate(() => Object.values(window.extStore)[0].questions['q1-webp.138417'].selected)).toBe('A');
});

test('extension manifest and userscript Greasy Fork metadata are valid', async () => {
  const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.version).toBe('4.0.0');
  expect(manifest.content_scripts[0].js).toEqual(['core.js', 'gm-shim.js']);
  expect(manifest.content_scripts[0].matches).toEqual(['https://fuoverflow.com/*']);
  expect(manifest.host_permissions).toContain('https://cdn.fuoverflow.com/*');
  expect(fs.existsSync('extension/icons/icon128.png')).toBe(true);
  expect(script).toContain('@version      4.0.0');
  expect(script).toContain('@license      MIT');
  expect(script).toContain('@match        https://fuoverflow.com/*');
  expect(script).toContain('@connect      cdn.fuoverflow.com');
  expect(script).toContain('@description  ');
});

test('panel mutations do not trigger infinite re-render loop', async ({ page }) => {
  const p = await fixture(page, { counts: { A: 2, B: 0, C: 0, D: 0 }, totalVoters: 2 });
  await expect(p.locator('strong')).toContainText('Q1 · Chọn một đáp án');
  await page.evaluate(() => {
    window.__mutCount = 0;
    new MutationObserver(() => window.__mutCount++).observe(document.querySelector('.fuo-quiz'), { subtree: true, childList: true, attributes: true });
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__mutCount)).toBe(0);
});
