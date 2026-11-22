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
    '.fuo-quiz .fuo-ai-result{flex-basis:100%;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;font-weight:400;background:#202d41;padding:10px;border-radius:7px}.fuo-quiz .fuo-ai-result[hidden]{display:none}.fuo-quiz button:disabled{opacity:.6;cursor:default}' +
    '.fuo-quiz .fuo-ai-result[role=status]{text-align:left;line-height:1.65}.fuo-ai-result .katex{white-space:normal;font-size:1.05em}.fuo-ai-result .katex-display{max-width:100%;overflow-x:auto;overflow-y:hidden;padding:4px 0}.fuo-ai-result .katex-display>.katex{white-space:nowrap}' +
    '.fuo-quiz [role=status]{flex-basis:100%;text-align:center;color:#dbe6f5;min-height:1.4em}'
  );

  // The quiz must scroll with the sidebar, including long AI answers.
  GM_addStyle(`
    .fancybox-sidebar:has(> .fuo-quiz:not([hidden])){max-height:100dvh;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
    .fancybox-sidebar:has(> .fuo-quiz:not([hidden])) > .fancybox-sidebar-content{flex:0 0 auto;overflow:visible}
    .fuo-quiz{box-sizing:border-box;min-width:0;padding:18px;gap:10px;background:#18181b;color:#fafafa;font-weight:500;line-height:1.5;border-top:1px solid #3f3f46}
    .fuo-quiz strong{font-size:15px;letter-spacing:-.02em}
    .fuo-quiz button{min-height:40px;border-color:#3f3f46;background:#27272a;border-radius:8px;transition:background-color .16s,border-color .16s,box-shadow .16s}
    .fuo-quiz button:enabled:hover{background:#3f3f46;border-color:#71717a}
    .fuo-quiz button:focus-visible{outline:2px solid #a1a1aa;outline-offset:3px;box-shadow:0 0 0 4px #18181b}
    .fuo-quiz button[aria-pressed=true]{background:#164e63;border-color:#67e8f9}
    .fuo-quiz button[data-mark=right]{background:#12452f;border-color:#86efac;color:#bbf7d0}
    .fuo-quiz button[data-mark=wrong]{background:#68252c;border-color:#fca5a5;color:#fee2e2}
    .fuo-quiz .fuo-ai-trigger{background:#fafafa;color:#18181b;border-color:#fafafa}
    .fuo-quiz .fuo-ai-trigger:enabled:hover{background:#e4e4e7;color:#18181b}
    .fuo-quiz .fuo-ai-result{box-sizing:border-box;width:100%;padding:18px;background:#202023;border:1px solid #3f3f46;border-radius:12px;white-space:normal;animation:fuo-reveal .2s ease-out}
    .fuo-quiz .fuo-ai-result[role=status]{font-size:15px;line-height:1.8;color:#e4e4e7}
    .fuo-ai-heading{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid #3f3f46;font-size:12px;line-height:1.5;color:#a1a1aa}
    .fuo-ai-provider{font-weight:650;color:#fafafa;font-size:14px}
    .fuo-ai-meta{font-size:11px;color:#a1a1aa;margin-left:auto;max-width:100%;overflow-wrap:anywhere}
    .fuo-ai-answer{display:block;width:fit-content;margin:0 0 18px;padding:6px 12px;border:1px solid #155e75;border-radius:6px;background:#083344;color:#a5f3fc;font-weight:650}
    .fuo-ai-result p{margin:0 0 16px;white-space:pre-wrap;overflow-wrap:anywhere}
    .fuo-ai-result p:last-child{margin-bottom:0}
    .fuo-ai-note{border-left:2px solid #fbbf24;padding-left:12px;color:#fde68a}
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
    @media(min-width:768px){.fancybox-show-sidebar .fancybox-sidebar:has(> .fuo-quiz:not([hidden])){width:420px;max-width:45vw}}
    @media(max-width:480px){.fuo-quiz{padding:12px}.fuo-quiz .fuo-ai-result{padding:14px}.fuo-settings-dialog{padding:14px;gap:10px}.fuo-settings-row>input,.fuo-settings-row>select{flex-basis:100%}.fuo-settings-row>button{flex:1 1 auto}.fuo-settings-footer{justify-content:stretch}.fuo-settings-footer>button{flex:1 1 0}}
    @keyframes fuo-reveal{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    @media(prefers-reduced-motion:reduce){.fuo-quiz button,.fuo-settings-dialog button{transition:none}.fuo-quiz .fuo-ai-result,.fuo-settings-dialog{animation:none}}
  `);

