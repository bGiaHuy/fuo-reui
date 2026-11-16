# FUOverflow luyện đề userscript

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

Verified: 40 Playwright cases passed; interactive desktop/mobile selection,
Submit, grading, and no horizontal overflow at 390px; real Tesseract worker/core
and English/Vietnamese language loading successfully classified a generated
“Select all that apply” image without JavaScript errors.

Limits: live DeepSeek calls were not exercised. Two inspected FUOverflow threads
used image filenames such as `R201m_...webp`; the existing script only recognizes
`Q<number>.<image extension>`, so live end-to-end acceptance on those threads was
not possible. This release retains that existing filename restriction. Changes are delivered on the `add_features` branch without merging into `main`.
