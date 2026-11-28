'use strict';

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'FUO_XHR') return;
  const { method = 'GET', url, headers = {}, data, timeout = 60000, responseType = '' } = message.payload || {};
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
      if (responseType === 'blob') {
        const buffer = await response.arrayBuffer();
        sendResponse({
          ok: true,
          status: response.status,
          statusText: response.statusText,
          responseType: 'blob',
          contentType: response.headers.get('content-type') || 'application/octet-stream',
          base64: bufferToBase64(buffer)
        });
        return;
      }
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
