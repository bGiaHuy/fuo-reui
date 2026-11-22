'use strict';

const hint = document.getElementById('hint');
const list = document.getElementById('list');

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs && tabs[0];
  if (!tab || !tab.id || !/^https:\/\/fuoverflow\.com\/threads\//.test(tab.url || '')) {
    hint.innerHTML = 'Mở một bài viết đề thi tại <a href="https://fuoverflow.com/" target="_blank" rel="noreferrer">fuoverflow.com/threads/…</a> để dùng bảng luyện đề.';
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: 'FUO_LIST_COMMANDS' }, response => {
    if (chrome.runtime.lastError || !response || !Array.isArray(response.commands)) {
      hint.textContent = 'Hãy tải lại trang FUOverflow để kích hoạt tiện ích.';
      return;
    }
    hint.textContent = 'Thao tác nhanh trên đề đang mở:';
    for (const name of response.commands) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = name;
      btn.onclick = () => {
        chrome.tabs.sendMessage(tab.id, { type: 'FUO_RUN_COMMAND', name }, () => window.close());
      };
      list.append(btn);
    }
  });
});
