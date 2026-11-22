(() => {
  'use strict';

  const store = Object.create(null);
  const menuCommands = new Map();

  window.GM_addStyle = css => {
    const style = document.createElement('style');
    style.textContent = String(css || '');
    (document.head || document.documentElement).append(style);
    return style;
  };

  window.GM_getResourceText = () => '';

  window.GM_getValue = (key, fallback) =>
    Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback;

  window.GM_setValue = (key, value) => {
    store[key] = value;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [key]: value });
    }
  };

  window.GM_registerMenuCommand = (name, fn) => {
    if (typeof name === 'string' && typeof fn === 'function') {
      menuCommands.set(name, fn);
    }
  };

  window.GM_xmlhttpRequest = args => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      args?.onerror?.({ error: 'Extension runtime unavailable' });
      return;
    }
    chrome.runtime.sendMessage(
      {
        type: 'FUO_XHR',
        payload: {
          method: args.method || 'GET',
          url: args.url,
          headers: args.headers || {},
          data: args.data,
          timeout: args.timeout || 60000
        }
      },
      response => {
        if (chrome.runtime.lastError || !response) {
          args?.onerror?.({ error: chrome.runtime.lastError?.message || 'Request failed' });
          return;
        }
        if (response.timeout) {
          args?.ontimeout?.();
          return;
        }
        if (!response.ok) {
          args?.onerror?.({ error: response.error || 'Network error' });
          return;
        }
        args?.onload?.({
          status: response.status,
          statusText: response.statusText || '',
          responseText: response.responseText || ''
        });
      }
    );
  };

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message) return;
      if (message.type === 'FUO_LIST_COMMANDS') {
        sendResponse({ commands: [...menuCommands.keys()] });
        return;
      }
      if (message.type === 'FUO_RUN_COMMAND') {
        const fn = menuCommands.get(message.name);
        if (fn) {
          fn();
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false });
        }
      }
    });
  }

  function startCore() {
    if (typeof window.__fuoStartCore === 'function') {
      window.__fuoStartCore();
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(null, items => {
      if (items && typeof items === 'object') {
        for (const [k, v] of Object.entries(items)) {
          if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
            store[k] = v;
          }
        }
      }
      startCore();
    });
  } else {
    startCore();
  }
})();
