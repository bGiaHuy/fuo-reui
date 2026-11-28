  // Zero-flash spoiler shield + companion panel styles (injected at document-start).
  GM_addStyle(`
    section[aria-label="Bình chọn đáp án"]:not(.fuo-revealed) > header p { display: none !important; }
    section[aria-label="Bình chọn đáp án"]:not(.fuo-revealed) [role="group"][aria-label="Các phương án"] button[aria-pressed] > span:first-child {
      opacity: 0 !important;
      transform: scaleX(0) !important;
      transition: none !important;
    }
    section[aria-label="Bình chọn đáp án"]:not(.fuo-revealed) [role="group"][aria-label="Các phương án"] button[aria-pressed] > span:last-child {
      visibility: hidden !important;
      opacity: 0 !important;
    }
    section[aria-label="Bình chọn đáp án"].fuo-retrying:not(.fuo-revealed) [role="group"][aria-label="Các phương án"] button[aria-pressed="true"]:not([data-fuo-selected="true"]) {
      border-color: var(--line-strong, #3f3f46) !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    section[aria-label="Bình chọn đáp án"] [role="group"][aria-label="Các phương án"] button[data-fuo-selected="true"] {
      border-color: #67e8f9 !important;
      background: rgba(22, 78, 99, 0.35) !important;
    }
    section[aria-label="Bình chọn đáp án"] [role="group"][aria-label="Các phương án"] button[data-fuo-mark="right"] {
      border-color: #4ade80 !important;
      background: rgba(18, 69, 47, 0.45) !important;
    }
    section[aria-label="Bình chọn đáp án"] [role="group"][aria-label="Các phương án"] button[data-fuo-mark="right"]::after {
      content: '✓';
      margin-left: 6px;
      color: #bbf7d0;
      font-weight: 700;
      font-size: 13px;
    }
    section[aria-label="Bình chọn đáp án"] [role="group"][aria-label="Các phương án"] button[data-fuo-mark="wrong"] {
      border-color: #f87171 !important;
      background: rgba(104, 37, 44, 0.45) !important;
    }
    section[aria-label="Bình chọn đáp án"] [role="group"][aria-label="Các phương án"] button[data-fuo-mark="wrong"]::after {
      content: '✗';
      margin-left: 6px;
      color: #fee2e2;
      font-weight: 700;
      font-size: 13px;
    }
    section[aria-label="Bình luận về ảnh"]:not(.fuo-comments-visible) > :not(:has(h2)):not(:has([role="textbox"])):not(:has(iframe)):not(.fuo-quiz):not(.fuo-spoiler-notice),
    aside[aria-label="Thảo luận về ảnh"] div:has(> div > h2):has(ul[aria-label="Bình luận"], [role="textbox"]):not(.fuo-comments-visible) > :not(:has(h2)):not(:has([role="textbox"])):not(:has(iframe)):not(.fuo-quiz):not(.fuo-spoiler-notice),
    section[aria-label="Bình luận về ảnh"]:not(.fuo-comments-visible) ul[aria-label="Bình luận"],
    aside[aria-label="Thảo luận về ảnh"] div:has(> div > h2):has(ul[aria-label="Bình luận"], [role="textbox"]):not(.fuo-comments-visible) ul[aria-label="Bình luận"] {
      display: none !important;
    }
    .fuo-quiz{box-sizing:border-box;position:relative;z-index:2;flex:none;width:100%;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 14px;margin:0 0 12px;background:#18181b;color:#fafafa;border:1px solid #3f3f46;border-radius:10px;font:500 13px/1.45 system-ui,-apple-system,sans-serif}
    aside[aria-label="Thảo luận về ảnh"] > .fuo-quiz{border-radius:0;border-left:0;border-right:0;border-top:0;margin:0;padding:12px 16px}
    .fuo-quiz[hidden]{display:none}
    .fuo-quiz strong{flex-basis:100%;font-size:14px;font-weight:650;letter-spacing:-.01em;color:#fafafa}
    .fuo-quiz button{font:inherit;font-weight:600;color:#fafafa;background:#27272a;border:1px solid #3f3f46;border-radius:8px;min-height:34px;padding:5px 10px;cursor:pointer;transition:background-color .16s,border-color .16s,box-shadow .16s}
    .fuo-quiz button:enabled:hover{background:#3f3f46;border-color:#71717a}
    .fuo-quiz button:focus-visible{outline:2px solid #a1a1aa;outline-offset:2px;box-shadow:0 0 0 4px #18181b}
    .fuo-quiz button[aria-pressed=true]{background:#164e63;border-color:#67e8f9}
    .fuo-quiz button:disabled{opacity:.55;cursor:default}
    .fuo-quiz button[hidden]{display:none}
    .fuo-quiz .fuo-submit-btn{background:#155e75;border-color:#22d3ee;color:#ecfeff}
    .fuo-quiz .fuo-submit-btn:enabled:hover{background:#0e7490;border-color:#67e8f9}
    .fuo-quiz .fuo-ai-trigger{background:#fafafa;color:#18181b;border-color:#fafafa}
    .fuo-quiz .fuo-ai-trigger:enabled:hover{background:#e4e4e7;color:#18181b}
    .fuo-quiz [role=status]{flex-basis:100%;text-align:left;color:#dbe6f5;min-height:1.3em;font-size:13px;overflow-wrap:anywhere}
    .fuo-quiz .fuo-multi-hint{flex-basis:100%;font-size:12px;color:#fde68a;background:#202023;border-left:2px solid #fbbf24;padding:6px 10px;border-radius:4px}
    .fuo-quiz .fuo-multi-hint[hidden]{display:none}
    .fuo-quiz .fuo-ai-result{box-sizing:border-box;flex-basis:100%;width:100%;min-width:0;padding:14px;background:#202023;border:1px solid #3f3f46;border-radius:10px;white-space:normal;overflow-wrap:anywhere;font-weight:400;animation:fuo-reveal .2s ease-out}
    .fuo-quiz .fuo-ai-result[hidden]{display:none}
    .fuo-quiz .fuo-ai-result[role=status]{font-size:14px;line-height:1.7;color:#e4e4e7}
    .fuo-ai-result .katex{white-space:normal;font-size:1.05em}.fuo-ai-result .katex-display{max-width:100%;overflow-x:auto;overflow-y:hidden;padding:4px 0}.fuo-ai-result .katex-display>.katex{white-space:nowrap}
    .fuo-ai-heading{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid #3f3f46;font-size:12px;line-height:1.5;color:#a1a1aa}
    .fuo-ai-provider{font-weight:650;color:#fafafa;font-size:14px}
    .fuo-ai-meta{font-size:11px;color:#a1a1aa;margin-left:auto;max-width:100%;overflow-wrap:anywhere}
    .fuo-ai-answer{display:block;width:fit-content;margin:0 0 12px;padding:5px 10px;border:1px solid #155e75;border-radius:6px;background:#083344;color:#a5f3fc;font-weight:650}
    .fuo-ai-result p{margin:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}
    .fuo-ai-result p:last-child{margin-bottom:0}
    .fuo-ai-note{border-left:2px solid #fbbf24;padding-left:10px;color:#fde68a}
    .fuo-ai-result:focus-visible{outline:2px solid #a1a1aa;outline-offset:2px}
    .fuo-settings-backdrop{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}
    .fuo-settings-dialog{background:#18181b;color:#fafafa;border:1px solid #3f3f46;border-radius:12px;width:min(520px,100%);max-height:calc(100dvh - 24px);overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:16px;font:500 14px/1.45 system-ui,sans-serif;display:flex;flex-direction:column;gap:10px;animation:fuo-reveal .2s ease-out}
    .fuo-settings-dialog:focus{outline:none}
    .fuo-settings-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid #3f3f46}
    .fuo-settings-header h2{margin:0;font-size:16px;font-weight:650;letter-spacing:-.02em;color:#fafafa}
    .fuo-settings-field{display:flex;flex-direction:column;gap:4px;min-width:0}
    .fuo-settings-field label,.fuo-settings-label{font-size:13px;font-weight:600;color:#e4e4e7}
    .fuo-settings-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}
    .fuo-settings-row>input,.fuo-settings-row>select{flex:1 1 200px;min-width:0}
    .fuo-settings-dialog input,.fuo-settings-dialog select{box-sizing:border-box;width:100%;max-width:100%;min-width:0;min-height:36px;padding:6px 10px;background:#27272a;color:#fafafa;border:1px solid #3f3f46;border-radius:8px;font:400 14px/1.4 system-ui,sans-serif}
    .fuo-settings-dialog input:disabled{opacity:.65;cursor:not-allowed;color:#a1a1aa}
    .fuo-settings-dialog button{box-sizing:border-box;min-height:36px;max-width:100%;padding:6px 12px;background:#27272a;color:#fafafa;border:1px solid #3f3f46;border-radius:8px;font:600 13px/1.4 system-ui,sans-serif;cursor:pointer;transition:background-color .16s,border-color .16s,box-shadow .16s}
    .fuo-settings-dialog button:enabled:hover{background:#3f3f46;border-color:#71717a}
    .fuo-settings-dialog button:disabled{opacity:.55;cursor:default}
    .fuo-settings-dialog input:focus-visible,.fuo-settings-dialog select:focus-visible,.fuo-settings-dialog button:focus-visible,.fuo-settings-dialog:focus-visible{outline:2px solid #a1a1aa;outline-offset:2px;box-shadow:0 0 0 4px #18181b}
    .fuo-settings-dialog .fuo-settings-primary{background:#fafafa;color:#18181b;border-color:#fafafa}
    .fuo-settings-dialog .fuo-settings-primary:enabled:hover{background:#e4e4e7;border-color:#e4e4e7}
    .fuo-settings-dialog .fuo-settings-danger{background:#68252c;border-color:#fca5a5;color:#fee2e2}
    .fuo-settings-dialog .fuo-settings-danger:enabled:hover{background:#7f2e36;border-color:#fecaca}
    .fuo-settings-dialog .fuo-settings-close{min-width:32px;min-height:32px;padding:4px 10px;background:transparent;border-color:#3f3f46;color:#a1a1aa}
    .fuo-settings-dialog .fuo-settings-close:enabled:hover{background:#27272a;color:#fafafa}
    .fuo-key-status{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid #3f3f46;background:#202023;color:#e4e4e7;max-width:100%;overflow-wrap:anywhere}
    .fuo-key-status[data-state=ok]{background:#12452f;border-color:#86efac;color:#bbf7d0}
    .fuo-key-status[data-state=local]{background:#164e63;border-color:#67e8f9;color:#a5f3fc}
    .fuo-key-status[data-state=invalid]{background:#68252c;border-color:#fca5a5;color:#fee2e2}
    .fuo-settings-warn{padding:8px 10px;border-radius:8px;background:#202023;border:1px solid #3f3f46;border-left:3px solid #fbbf24;color:#fde68a;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
    .fuo-settings-alert{padding:8px 10px;border-radius:8px;background:#68252c;border:1px solid #fca5a5;color:#fee2e2;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
    .fuo-settings-alert[data-tone=notice]{background:#164e63;border-color:#67e8f9;color:#a5f3fc}
    .fuo-models-status{font-size:12px;color:#a1a1aa;min-height:1.2em;overflow-wrap:anywhere}
    .fuo-settings-footer{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding-top:10px;border-top:1px solid #3f3f46}
    .fuo-settings-dialog [hidden]{display:none}
    .fuo-progress{flex-basis:100%;display:flex;flex-direction:column;gap:6px;padding:8px 10px;background:#202023;border:1px solid #2e2e33;border-radius:8px;font-size:12px;color:#d4d4d8}
    .fuo-progress[hidden]{display:none}
    .fuo-progress-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px}
    .fuo-progress-track{width:100%;height:5px;background:#27272a;border-radius:999px;overflow:hidden}
    .fuo-progress-fill{height:100%;background:#22c55e;border-radius:999px;transition:width .2s ease}
    .fuo-jump-row{display:flex;flex-wrap:wrap;gap:6px}
    .fuo-quiz .fuo-jump-btn{min-height:28px;padding:2px 9px;font-size:12px;font-weight:600;border-radius:6px}
    .fuo-quiz .fuo-jump-btn[data-kind=wrong]{background:#3f1d22;border-color:#991b1b;color:#fecaca}
    .fuo-quiz .fuo-jump-btn[data-kind=wrong]:enabled:hover{background:#5c242b;border-color:#f87171}
    .fuo-quiz .fuo-jump-btn[data-kind=starred]{background:#3b2f13;border-color:#854d0e;color:#fde68a}
    .fuo-quiz .fuo-jump-btn[data-kind=starred]:enabled:hover{background:#524119;border-color:#facc15}
    .fuo-quiz .fuo-jump-btn[data-kind=review]{background:#1e3a5f;border-color:#3b82f6;color:#bfdbfe}
    .fuo-quiz .fuo-jump-btn[data-kind=review]:enabled:hover{background:#1d4ed8;border-color:#93c5fd}
    .fuo-exam-bar,.fuo-review-bar{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:8px;font-size:13px}
    .fuo-exam-bar{background:#172554;border:1px solid #3b82f6;color:#dbeafe}
    .fuo-review-bar{background:#1e293b;border:1px solid #38bdf8;color:#e0f2fe}
    .fuo-exam-bar[hidden],.fuo-review-bar[hidden],.fuo-exam-summary[hidden]{display:none}
    .fuo-exam-actions{display:flex;flex-wrap:wrap;gap:6px}
    .fuo-quiz .fuo-exam-bar button,.fuo-quiz .fuo-review-bar button{min-height:30px;padding:3px 10px;font-size:12px}
    .fuo-exam-summary{flex-basis:100%;display:flex;flex-direction:column;gap:8px;padding:12px;background:#202023;border:1px solid #3f3f46;border-radius:10px;font-size:13px;color:#e4e4e7}
    .fuo-exam-wrong-list{display:flex;flex-wrap:wrap;gap:6px}
    .fuo-backup-note{font-size:13px;line-height:1.5;color:#d4d4d8;padding:8px 10px;background:#202023;border:1px solid #3f3f46;border-radius:8px}
    @media(max-width:480px){.fuo-quiz{padding:10px 12px}.fuo-quiz .fuo-ai-result{padding:12px}.fuo-settings-dialog{padding:14px;gap:10px}.fuo-settings-row>input,.fuo-settings-row>select{flex-basis:100%}.fuo-settings-row>button{flex:1 1 auto}.fuo-settings-footer{justify-content:stretch}.fuo-settings-footer>button{flex:1 1 0}}
    @keyframes fuo-reveal{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    @media(prefers-reduced-motion:reduce){.fuo-quiz button,.fuo-settings-dialog button{transition:none}.fuo-quiz .fuo-ai-result,.fuo-settings-dialog{animation:none}}
  `);
