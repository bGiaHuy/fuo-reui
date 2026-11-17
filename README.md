# FUOverflow luyện đề userscript

## v1.5.2 AI reading interface

AI references now separate the provider, answer badge, explanation paragraphs,
and comment-disagreement notice. The sidebar scrolls as a whole so long answers
remain reachable, with a wider desktop reading area and mobile wrapping.
Button hover and answer reveal effects respect reduced-motion preferences.
Styling adapts button/badge/separator patterns inspected with shadcn CLI to native
userscript HTML; React and a build step are not required.

Run `npm ci`, `npx playwright install chromium`, and `npm test` in Codespaces.
AI calls remain mocked in tests; live forum integration needs a manual check.

Install `fuo-reui.user.js` in Tampermonkey. This workspace is based on
`bGiaHuy/fuo-reui`, upstream script SHA `82cfaaefb18ccd488bf170fd1f4c3717d7ecac2e`.

## Answer workflow

- One valid vote per author. Any multi-letter vote enables multiple selection.
- Without valid votes, Tesseract.js 5.1.1 reads the image in English/Vietnamese.
  Recognized multi-answer instructions enable multiple selection; otherwise single.
  Failed/loading classification locks choices and offers retry. OCR startup and
  recognition each time out after 60 seconds. One worker is reused serially;
  successful classification is cached by image URL for the session.
- Single selection grades immediately. Multiple selection requires Submit and an
  exact answer-set match. The most frequent complete answer set wins; ties or
  missing votes call the existing AI integration automatically.
- The result shows percentages of valid comment votes per answer set. These are
  vote shares, not confidence that an answer is correct.
- Configure the existing DeepSeek API key through the Tampermonkey menu for AI
  fallback/reference. Missing keys and AI errors retain selections for retry.
- Reset clears the current attempt while preserving question classification and
  stars. CSV exports preserve complete selected/reference answer sets.

## Development and verification

```sh
npm ci
npx playwright install chromium
npm test
```

Tests mock OCR/AI deliberately, covering desktop and mobile. For manual fixtures:

```sh
python3 -m http.server 8765
```

Open `/tests/fixture.html` for the comment-driven UI, or `/tests/ocr.html` for
real CDN-loaded Tesseract OCR on a generated image. The latter requires network
access and is intentionally separate from deterministic regression tests.

## v1.5.1 consistency fix

AI grading and the reference panel share one cached structured result containing
`answer` and `explanation`. Both action orders and Reset reuse it. Invalid JSON,
unknown answers, missing explanations, and explicit contradictory answer headings
remain ungraded and retryable. The request uses DeepSeek's documented
[JSON output mode](https://api-docs.deepseek.com/guides/json_mode/).

Comment parsing also reads explicit conclusions after prose, including `-> A`,
`→ A`, and `Đáp án: A`. HTML line breaks are preserved and quoted replies excluded.
When AI disagrees with the comment winner, the reference panel names both answers
and makes clear that grading still follows comments.

Verified: 68 Playwright cases passed across desktop/mobile, including shared AI
cache, rejected malformed/conflicting responses, multiline comment conclusions,
CSV, and existing OCR/Submit flows. Interactive fixture checks confirmed aligned
answer/explanation, one AI request across grading/reference/reset, and no horizontal
overflow at 390px. AI API responses in these checks were mocked.

Live verification on Q37 of `/threads/dbi202-su26-re.7208/` read the actual
multiline comment and graded B as incorrect against A, with source “1 bình luận”
and A: 100%. This used an injected script with isolated GM storage shims, without
changing installed Tampermonkey scripts or persistent practice records. Live
DeepSeek requests were not exercised. Earlier real Tesseract worker/core smoke
verification classified a generated “Select all that apply” image successfully.

The existing `Q<number>.<image extension>` filename restriction remains.
Changes are delivered on `add_features` without merging into `main`.
