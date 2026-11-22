'use strict';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'FUO_XHR') return;
  const { method = 'GET', url, headers = {}, data, timeout = 60000 } = message.payload || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeout) || 60000));

  fetch(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : data,
    credentials: 'omit',
    signal: controller.signal
  })
    .then(async response => {
      const responseText = await response.text();
      sendResponse({
        ok: true,
        status: response.status,
        statusText: response.statusText,
        responseText
      });
    })
    .catch(err => {
      const isTimeout = err && err.name === 'AbortError';
      sendResponse({
        ok: false,
        timeout: isTimeout,
        error: err && err.message ? err.message : 'Network error'
      });
    })
    .finally(() => clearTimeout(timer));

  return true;
});
