const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function main() {
  const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'fuo-reui.user.js'), 'utf8');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Create an SVG for the English question
  const svgQuestion = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="25" y="25" width="850" height="600" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    
    <!-- Question Header -->
    <rect x="45" y="45" width="140" height="34" rx="6" fill="#2563eb"/>
    <text x="60" y="68" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">QUESTION 24</text>
    <text x="200" y="68" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="500" fill="#64748b">CEA201 — Computer Organization &amp; Architecture</text>

    <!-- Question Prompt -->
    <text x="50" y="125" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="600" fill="#0f172a">
      What is the primary function of the Program Counter (PC) register
    </text>
    <text x="50" y="155" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="600" fill="#0f172a">
      in the classic Von Neumann CPU architecture?
    </text>

    <!-- Code / Architecture diagram box -->
    <rect x="50" y="185" width="800" height="95" rx="8" fill="#1e293b"/>
    <text x="75" y="222" font-family="Consolas, Monaco, monospace" font-size="14" fill="#38bdf8">Instruction Cycle: Fetch -&gt; Decode -&gt; Execute -&gt; Store</text>
    <text x="75" y="252" font-family="Consolas, Monaco, monospace" font-size="14" fill="#94a3b8">MAR &lt;= [PC];  IR &lt;= M[MAR];  PC &lt;= PC + 4;</text>

    <!-- Options -->
    <!-- Option A -->
    <rect x="50" y="300" width="800" height="65" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="65" y="315" width="34" height="34" rx="6" fill="#f1f5f9"/>
    <text x="76" y="338" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="700" fill="#475569">A</text>
    <text x="115" y="338" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" fill="#334155">Holds the operand data currently being processed by the ALU.</text>

    <!-- Option B -->
    <rect x="50" y="380" width="800" height="65" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="65" y="395" width="34" height="34" rx="6" fill="#f1f5f9"/>
    <text x="76" y="418" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="700" fill="#475569">B</text>
    <text x="115" y="418" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" fill="#334155">Stores the memory address of the next instruction to be fetched.</text>

    <!-- Option C -->
    <rect x="50" y="460" width="800" height="65" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="65" y="475" width="34" height="34" rx="6" fill="#f1f5f9"/>
    <text x="76" y="498" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="700" fill="#475569">C</text>
    <text x="115" y="498" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" fill="#334155">Decodes machine opcodes into micro-operations for execution.</text>

    <!-- Option D -->
    <rect x="50" y="540" width="800" height="65" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="65" y="555" width="34" height="34" rx="6" fill="#f1f5f9"/>
    <text x="76" y="578" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="700" fill="#475569">D</text>
    <text x="115" y="578" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" fill="#334155">Maintains status flags such as Zero, Carry, Overflow, and Sign.</text>
  </svg>
  `;

  const questionDataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgQuestion);

  await page.route('https://fuoverflow.com/**', route => {
    route.fulfill({
      contentType: 'text/html',
      body: `<!DOCTYPE html>
<html>
<head>
  <title>CEA201 Final Exam Practice Questions | FUOverflow</title>
  <style>
    body { margin: 0; padding: 0; background: #09090b; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #f4f4f5; }
    .fancybox__container { position: fixed; inset: 0; display: flex; z-index: 999; }
    .fancybox__slide { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000000; padding: 24px; position: relative; }
    .fancybox__caption { position: absolute; bottom: 20px; color: #a1a1aa; font-size: 14px; }
    .fancybox-image { max-width: 90%; max-height: 80vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border-radius: 8px; }
    .fancybox-sidebar { width: 440px; background: #121215; border-left: 1px solid #27272a; display: flex; flex-direction: column; overflow-y: auto; }
    .fancybox-sidebar-content { padding: 20px; font-size: 14px; }
    .xfmgInfoBlock-title h2 { margin: 0 0 12px; font-size: 18px; color: #fafafa; font-weight: 600; }
    .meta-sub { color: #71717a; font-size: 13px; margin-bottom: 20px; }
    .js-comment { padding: 12px 14px; margin-bottom: 10px; background: #18181b; border: 1px solid #27272a; border-radius: 8px; }
    .comment-author { font-weight: 600; color: #60a5fa; margin-bottom: 4px; font-size: 13px; }
    .comment-body { color: #d4d4d8; font-size: 13px; }
  </style>
</head>
<body>
  <div class="fancybox__container fancybox-show-sidebar">
    <div class="fancybox__slide is-selected">
      <img class="fancybox-image" src="${questionDataUri}" alt="CEA201_FE_Q24.png">
      <div class="fancybox__caption"><h4>CEA201_FE_Q24.png</h4></div>
    </div>
    <aside class="fancybox-sidebar">
      <div class="fancybox-sidebar-content">
        <div class="xfmgInfoBlock-title"><h2>CEA201_FE_Q24.png</h2></div>
        <div class="meta-sub">Đăng bởi <strong>fptu_coder</strong> • 12 bình luận thảo luận</div>
        <div class="js-messageResponses">
          <div class="js-comment" data-author="101">
            <div class="comment-author">hoanglong_k18</div>
            <div class="comment-body"><div class="bbWrapper">B nha mng, Program Counter lưu địa chỉ lệnh tiếp theo được fetch</div></div>
          </div>
          <div class="js-comment" data-author="102">
            <div class="comment-author">minhtri_fu</div>
            <div class="comment-body"><div class="bbWrapper">Đáp án B chuẩn 100% slide thầy giảng</div></div>
          </div>
          <div class="js-comment" data-author="103">
            <div class="comment-author">lananh_it</div>
            <div class="comment-body"><div class="bbWrapper">B</div></div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</body>
</html>`
    });
  });

  await page.goto('https://fuoverflow.com/threads/cea201-fe-full-practice/');

  // Set up mock GM environment
  await page.evaluate(() => {
    window.gmStore = {
      fuoReview: {
        questions: {
          'CEA201_FE_Q24.png': { answer: 'B', right: true, starred: true }
        }
      }
    };
    window.GM_addStyle = css => {
      const s = document.createElement('style');
      s.textContent = css;
      document.head.append(s);
    };
    window.GM_getResourceText = () => '';
    window.GM_getValue = (k, def) => (k in window.gmStore ? window.gmStore[k] : def);
    window.GM_setValue = (k, v) => { window.gmStore[k] = v; };
    window.GM_registerMenuCommand = () => {};
    window.fetch = async () => ({ ok: true, blob: async () => new Blob(['fake'], { type: 'image/png' }) });
    window.GM_xmlhttpRequest = args => {
      setTimeout(() => {
        const solution = {
          answer: "B",
          explanation: "Đáp án chính xác: **B**\\n\\nTrong kiến trúc Von Neumann:\\n- **Program Counter (PC)**: Chứa địa chỉ trong bộ nhớ của lệnh tiếp theo cần được CPU nạp (fetch) và thực thi. Sau mỗi chu kỳ fetch, PC tăng tự động trỏ sang lệnh tiếp theo.\\n- Phương án A sai: Đây là vai trò của thanh ghi **Accumulator (AC)**.\\n- Phương án C sai: Thuộc trách nhiệm của **Instruction Register (IR)** và Khối điều khiển (Control Unit).\\n- Phương án D sai: Thuộc thanh ghi cờ trạng thái (**Flags Register**)."
        };
        args.onload({
          status: 200,
          responseText: JSON.stringify({
            choices: [{ message: { content: JSON.stringify(solution) } }]
          })
        });
      }, 50);
    };
    window.Tesseract = {
      createWorker: async () => ({
        recognize: async () => ({ data: { text: 'What is the primary function Select one answer' } }),
        terminate: async () => {}
      })
    };
  });

  // Inject userscript
  await page.addScriptTag({ content: scriptContent });

  // Wait for fuo-quiz panel
  const panel = page.locator('.fuo-quiz');
  await panel.waitFor({ state: 'visible' });

  // Select Option B (correct)
  const btnB = panel.locator('.fuo-options button').filter({ hasText: /^B/ });
  await btnB.click();

  // Click "Xem đáp án AI"
  const aiBtn = panel.getByRole('button', { name: 'Xem đáp án AI' });
  await aiBtn.click();

  // Wait for AI explanation to show
  await panel.locator('.fuo-ai-result').waitFor({ state: 'visible' });

  // Toggle star
  const starBtn = panel.locator('button').filter({ hasText: /Đánh dấu/ });
  await starBtn.click();

  // Take full desktop screenshot
  const outDir = path.join(__dirname, '..', 'docs', 'images');
  await page.screenshot({
    path: path.join(outDir, 'fuo-reui-quiz-desktop.png'),
    fullPage: false
  });
  console.log('Saved fuo-reui-quiz-desktop.png');

  // Open AI Settings Modal
  const settingsBtn = panel.getByRole('button', { name: 'Cài đặt AI', exact: true });
  await settingsBtn.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });

  // Screenshot settings modal
  await page.screenshot({
    path: path.join(outDir, 'fuo-reui-settings-modal.png'),
    fullPage: false
  });
  console.log('Saved fuo-reui-settings-modal.png');

  // Mobile screenshot
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.route('https://fuoverflow.com/**', route => {
    route.fulfill({
      contentType: 'text/html',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CEA201 Mobile | FUOverflow</title>
  <style>
    body { margin: 0; background: #09090b; font-family: -apple-system, sans-serif; color: #f4f4f5; }
    .fancybox__container { display: flex; flex-direction: column; min-height: 100vh; }
    .fancybox__slide { padding: 12px; display: flex; justify-content: center; background: #000; }
    .fancybox-image { width: 100%; max-height: 40vh; object-fit: contain; }
    .fancybox__caption { font-size: 12px; color: #a1a1aa; padding: 4px 0; }
    .fancybox-sidebar { flex: 1; background: #121215; }
    .fancybox-sidebar-content { padding: 12px; }
  </style>
</head>
<body>
  <div class="fancybox__container fancybox-show-sidebar">
    <div class="fancybox__slide is-selected">
      <img class="fancybox-image" src="${questionDataUri}" alt="Q24.png">
      <div class="fancybox__caption"><h4>CEA201_FE_Q24.png</h4></div>
    </div>
    <aside class="fancybox-sidebar">
      <div class="fancybox-sidebar-content">
        <div class="xfmgInfoBlock-title"><h2>CEA201_FE_Q24.png</h2></div>
        <div class="js-messageResponses">
          <div class="js-comment" data-author="1"><div class="comment-body">B</div></div>
        </div>
      </div>
    </aside>
  </div>
</body>
</html>`
    });
  });
  await mobilePage.goto('https://fuoverflow.com/threads/mobile-test/');
  await mobilePage.evaluate(() => {
    window.gmStore = {};
    window.GM_addStyle = css => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); };
    window.GM_getResourceText = () => '';
    window.GM_getValue = (k, def) => (k in window.gmStore ? window.gmStore[k] : def);
    window.GM_setValue = (k, v) => { window.gmStore[k] = v; };
    window.GM_registerMenuCommand = () => {};
    window.fetch = async () => ({ ok: true, blob: async () => new Blob(['fake'], { type: 'image/png' }) });
    window.GM_xmlhttpRequest = args => {
      setTimeout(() => {
        args.onload({
          status: 200,
          responseText: JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ answer: "B", explanation: "PC giữ địa chỉ lệnh tiếp theo." }) } }]
          })
        });
      }, 50);
    };
    window.Tesseract = {
      createWorker: async () => ({
        recognize: async () => ({ data: { text: 'Select one answer' } }),
        terminate: async () => {}
      })
    };
  });
  await mobilePage.addScriptTag({ content: scriptContent });
  const mPanel = mobilePage.locator('.fuo-quiz');
  await mPanel.waitFor({ state: 'visible' });
  await mPanel.locator('.fuo-options button').filter({ hasText: /^B/ }).click();
  await mobilePage.screenshot({
    path: path.join(outDir, 'fuo-reui-mobile.png'),
    fullPage: false
  });
  console.log('Saved fuo-reui-mobile.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
