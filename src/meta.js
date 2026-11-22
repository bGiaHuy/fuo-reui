// ==UserScript==
// @name         FUOverflow — Luyện đề
// @namespace    fuoverflow-quiz-local
// @version      3.0.1
// @description  Luyện đề trắc nghiệm ngay trong trình xem ảnh FUOverflow: chọn A-H, chấm theo bình luận hoặc AI (BYOK), thi thử bấm giờ, vòng ôn tập và xuất CSV/Anki/JSON.
// @author       Gia Huy Bùi, Phùng Xuân Bách, thanh huy
// @license      MIT
// @homepageURL  https://github.com/bGiaHuy/fuo-reui
// @supportURL   https://github.com/bGiaHuy/fuo-reui/issues
// @updateURL    https://raw.githubusercontent.com/bGiaHuy/fuo-reui/main/fuo-reui.user.js
// @downloadURL  https://raw.githubusercontent.com/bGiaHuy/fuo-reui/main/fuo-reui.user.js
// @match        https://fuoverflow.com/threads/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceText
// @require      https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.js
// @require      https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/contrib/auto-render.min.js
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js
// @resource     katexCSS https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css
// @connect      api.deepseek.com
// @connect      api.openai.com
// @connect      api.anthropic.com
// @connect      generativelanguage.googleapis.com
// @connect      openrouter.ai
// @connect      *
// @run-at       document-start
// ==/UserScript==
