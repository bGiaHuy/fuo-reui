  const COMPATIBLE_TYPES = Object.freeze(['openai', 'deepseek', 'anthropic', 'gemini']);
  const THINKING_LEVELS = Object.freeze(['default', 'off', 'low', 'medium', 'high']);
  const MAX_CUSTOM_PROVIDERS = 20;
  const MAX_MODELS_DISPLAY = 500;
  const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
  const MAX_ERROR_LENGTH = 240;

  const BUILTIN_PROVIDERS = Object.freeze({
    deepseek: Object.freeze({ id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', compatibleType: 'deepseek', model: 'deepseek-flash', thinking: 'off', custom: false }),
    openai: Object.freeze({ id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', compatibleType: 'openai', model: 'gpt-4.1-mini', thinking: 'default', custom: false }),
    anthropic: Object.freeze({ id: 'anthropic', name: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1', compatibleType: 'anthropic', model: 'claude-sonnet-4-5', thinking: 'off', custom: false }),
    gemini: Object.freeze({ id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', compatibleType: 'gemini', model: 'gemini-2.5-flash', thinking: 'off', custom: false }),
    openrouter: Object.freeze({ id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', compatibleType: 'openai', model: 'openai/gpt-4.1-mini', thinking: 'default', custom: false })
  });

  const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  const PROFILE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,159}$/;

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function defineSafeProp(obj, key, value) {
    // Define enumerable own properties without invoking Object.prototype.__proto__ setter.
    Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
  }

  function cloneProvider(provider) {
    return {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      compatibleType: provider.compatibleType,
      model: provider.model,
      thinking: provider.thinking,
      custom: Boolean(provider.custom)
    };
  }

  function validateBaseUrl(raw) {
    if (typeof raw !== 'string' || !raw) {
      throw new Error('Base URL không được để trống.');
    }
    if (raw.length > 512) {
      throw new Error('Base URL quá dài (tối đa 512 ký tự).');
    }
    if (/[\s\x00-\x1F\x7F]/.test(raw)) {
      throw new Error('Base URL không được chứa khoảng trắng hoặc ký tự điều khiển.');
    }
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error('Base URL không đúng định dạng URL.');
    }
    if (parsed.username || parsed.password || /^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/]*@/.test(raw)) {
      throw new Error('Base URL không được chứa thông tin đăng nhập (user:pass@).');
    }
    if (parsed.search || parsed.hash || raw.includes('?') || raw.includes('#')) {
      throw new Error('Base URL không được chứa query string (?) hoặc fragment (#).');
    }
    let isLocalHttp = false;
    if (parsed.protocol === 'https:') {
      isLocalHttp = false;
    } else if (parsed.protocol === 'http:') {
      if (!LOCAL_HTTP_HOSTS.has(parsed.hostname.toLowerCase())) {
        throw new Error('Chỉ cho phép HTTP cục bộ (localhost, 127.0.0.1, [::1]); endpoint từ xa phải dùng HTTPS.');
      }
      isLocalHttp = true;
    } else {
      throw new Error('Base URL phải dùng giao thức https:// (hoặc http:// cho localhost).');
    }
    if (!parsed.hostname || !parsed.origin || parsed.origin === 'null') {
      throw new Error('Base URL thiếu tên miền hợp lệ.');
    }
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return { url: parsed.origin + pathname, origin: parsed.origin, isLocalHttp };
  }

  function validateApiKey(raw) {
    if (typeof raw !== 'string') {
      throw new Error('API key không hợp lệ.');
    }
    const key = raw.trim();
    if (!key) return '';
    if (key.length > 512) {
      throw new Error('API key quá dài (tối đa 512 ký tự).');
    }
    if (/[^\x21-\x7E]/.test(key)) {
      throw new Error('API key chứa ký tự không hợp lệ (chỉ cho phép ASCII in được, không khoảng trắng hoặc xuống dòng).');
    }
    return key;
  }

  function validateModelId(raw) {
    if (typeof raw !== 'string') {
      throw new Error('Model ID không hợp lệ.');
    }
    const id = raw.trim();
    if (!MODEL_ID_PATTERN.test(id) || id.includes('..') || id.includes('//') || id.endsWith('/')) {
      throw new Error('Model ID không hợp lệ (chỉ dùng chữ, số và . _ : / @ + -, không chứa .. hoặc //).');
    }
    return id;
  }

  function validateProviderName(raw) {
    if (typeof raw !== 'string') {
      throw new Error('Tên nhà cung cấp không hợp lệ.');
    }
    const name = raw.trim();
    if (!name || name.length > 60 || /[\x00-\x1F\x7F]/.test(name)) {
      throw new Error('Tên nhà cung cấp phải dài 1–60 ký tự và không chứa ký tự điều khiển.');
    }
    return name;
  }

  function redactSecret(text, secret) {
    let out = String(text ?? '');
    if (typeof secret === 'string' && secret.length > 0) {
      out = out.split(secret).join('[REDACTED]');
      try {
        const encoded = encodeURIComponent(secret);
        if (encoded && encoded !== secret) {
          out = out.split(encoded).join('[REDACTED]');
        }
      } catch {}
    }
    out = out.replace(/(?<![A-Za-z0-9])(?:sk-ant-|sk-|AIza)[A-Za-z0-9_.=-]*[A-Za-z0-9_=-]/g, '[REDACTED]');
    if (out.length > MAX_ERROR_LENGTH) {
      out = out.slice(0, MAX_ERROR_LENGTH - 1) + '…';
    }
    return out;
  }

  let aiConfigVersion = 0;

  function sanitizeBuiltinProfile(id, rawEntry) {
    const profile = cloneProvider(BUILTIN_PROVIDERS[id]);
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      return profile;
    }
    if (hasOwn(rawEntry, 'compatibleType') && COMPATIBLE_TYPES.includes(rawEntry.compatibleType)) {
      profile.compatibleType = rawEntry.compatibleType;
    }
    if (hasOwn(rawEntry, 'baseUrl')) {
      try {
        profile.baseUrl = validateBaseUrl(rawEntry.baseUrl).url;
      } catch {}
    }
    if (hasOwn(rawEntry, 'model')) {
      try {
        profile.model = validateModelId(rawEntry.model);
      } catch {}
    }
    if (hasOwn(rawEntry, 'thinking') && THINKING_LEVELS.includes(rawEntry.thinking)) {
      profile.thinking = rawEntry.thinking;
    }
    return profile;
  }

  function sanitizeCustomProfile(id, rawEntry) {
    if (!PROFILE_ID_PATTERN.test(id) || FORBIDDEN_KEYS.has(id) || hasOwn(BUILTIN_PROVIDERS, id)) {
      return null;
    }
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      return null;
    }
    if (!hasOwn(rawEntry, 'compatibleType') || !COMPATIBLE_TYPES.includes(rawEntry.compatibleType)) {
      return null;
    }
    if (!hasOwn(rawEntry, 'name') || !hasOwn(rawEntry, 'baseUrl') || !hasOwn(rawEntry, 'model')) {
      return null;
    }
    try {
      const name = validateProviderName(rawEntry.name);
      const baseUrl = validateBaseUrl(rawEntry.baseUrl).url;
      const model = validateModelId(rawEntry.model);
      const thinking = hasOwn(rawEntry, 'thinking') && THINKING_LEVELS.includes(rawEntry.thinking) ? rawEntry.thinking : 'default';
      return {
        id,
        name,
        baseUrl,
        compatibleType: rawEntry.compatibleType,
        model,
        thinking,
        custom: true
      };
    } catch {
      return null;
    }
  }

  function sanitizeConfig(raw) {
    const providers = {};
    const hasValidRaw = raw && typeof raw === 'object' && !Array.isArray(raw);
    const rawProviders = hasValidRaw && hasOwn(raw, 'providers')
      && raw.providers && typeof raw.providers === 'object' && !Array.isArray(raw.providers)
      ? raw.providers : null;

    for (const id of Object.keys(BUILTIN_PROVIDERS)) {
      const rawEntry = rawProviders && hasOwn(rawProviders, id) ? rawProviders[id] : null;
      defineSafeProp(providers, id, sanitizeBuiltinProfile(id, rawEntry));
    }

    if (rawProviders) {
      let customCount = 0;
      for (const id of Object.keys(rawProviders)) {
        if (!hasOwn(rawProviders, id) || FORBIDDEN_KEYS.has(id) || hasOwn(BUILTIN_PROVIDERS, id)) continue;
        if (customCount >= MAX_CUSTOM_PROVIDERS) break;
        const customProfile = sanitizeCustomProfile(id, rawProviders[id]);
        if (!customProfile) continue;
        defineSafeProp(providers, id, customProfile);
        customCount++;
      }
    }

    const rawActiveId = hasValidRaw && hasOwn(raw, 'activeId') ? raw.activeId : '';
    const activeId = typeof rawActiveId === 'string' && !FORBIDDEN_KEYS.has(rawActiveId) && hasOwn(providers, rawActiveId)
      ? rawActiveId : 'deepseek';

    return { version: 1, activeId, providers };
  }

  function loadAIConfig() {
    return sanitizeConfig(GM_getValue('fuoAIConfig', null));
  }

  function saveAIConfig(config) {
    const clean = sanitizeConfig(config);
    GM_setValue('fuoAIConfig', clean);
    aiConfigVersion++;
  }

  function getActiveProvider() {
    const config = loadAIConfig();
    return config.providers[config.activeId] || cloneProvider(BUILTIN_PROVIDERS.deepseek);
  }

  function configSignature(provider) {
    if (!provider) return '';
    return [provider.id, provider.baseUrl, provider.compatibleType, provider.model, provider.thinking].join('|');
  }

  function sanitizeKeys(raw) {
    const clean = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const id of Object.keys(raw)) {
      if (!hasOwn(raw, id) || FORBIDDEN_KEYS.has(id) || !PROFILE_ID_PATTERN.test(id)) continue;
      const entry = raw[id];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      if (!hasOwn(entry, 'origin') || !hasOwn(entry, 'key')) continue;
      if (typeof entry.origin !== 'string' || typeof entry.key !== 'string') continue;
      let parsedOrigin;
      try {
        parsedOrigin = validateBaseUrl(entry.origin).origin;
      } catch {
        continue;
      }
      if (parsedOrigin !== entry.origin) continue;
      let validKey;
      try {
        validKey = validateApiKey(entry.key);
      } catch {
        continue;
      }
      defineSafeProp(clean, id, { origin: parsedOrigin, key: validKey });
    }
    return clean;
  }

  function getProviderKey(provider) {
    if (!provider || typeof provider.id !== 'string' || FORBIDDEN_KEYS.has(provider.id)) return '';
    let origin;
    try {
      origin = validateBaseUrl(provider.baseUrl).origin;
    } catch {
      return '';
    }
    const rawKeys = GM_getValue('fuoAIKeys', {});
    const keys = sanitizeKeys(rawKeys);
    if (hasOwn(keys, provider.id)) {
      const entry = keys[provider.id];
      return entry.origin === origin ? entry.key : '';
    }
    if (rawKeys && typeof rawKeys === 'object' && !Array.isArray(rawKeys) && hasOwn(rawKeys, provider.id)) {
      return '';
    }
    if (provider.id === 'deepseek' && origin === 'https://api.deepseek.com') {
      try {
        return validateApiKey(GM_getValue('deepseekKey', ''));
      } catch {
        return '';
      }
    }
    return '';
  }

  function setProviderKey(provider, rawKey) {
    if (!provider || typeof provider.id !== 'string' || FORBIDDEN_KEYS.has(provider.id) || !PROFILE_ID_PATTERN.test(provider.id)) {
      throw new Error('Hồ sơ nhà cung cấp không hợp lệ.');
    }
    const { origin } = validateBaseUrl(provider.baseUrl);
    const key = validateApiKey(rawKey);
    const keys = sanitizeKeys(GM_getValue('fuoAIKeys', {}));
    defineSafeProp(keys, provider.id, { origin, key });
    GM_setValue('fuoAIKeys', keys);
    if (provider.id === 'deepseek') {
      // Clear legacy deepseekKey whenever fuoAIKeys.deepseek is written so superseded keys cannot resurface.
      GM_setValue('deepseekKey', '');
    }
    return { saved: true };
  }

  function deleteProviderKey(profileId) {
    if (typeof profileId !== 'string' || !profileId || FORBIDDEN_KEYS.has(profileId)) return;
    const rawKeys = GM_getValue('fuoAIKeys', {});
    const keys = sanitizeKeys(rawKeys);
    if (hasOwn(keys, profileId) || (rawKeys && typeof rawKeys === 'object' && !Array.isArray(rawKeys) && hasOwn(rawKeys, profileId))) {
      delete keys[profileId];
      GM_setValue('fuoAIKeys', keys);
    }
  }

  function clearProviderKeyIfOriginChanged(profileId, oldBaseUrl, newBaseUrl) {
    if (typeof profileId !== 'string' || !profileId || FORBIDDEN_KEYS.has(profileId)) return false;
    let newOrigin;
    try {
      newOrigin = validateBaseUrl(newBaseUrl).origin;
    } catch {
      return false;
    }
    let cleared = false;
    const keys = sanitizeKeys(GM_getValue('fuoAIKeys', {}));
    const hadProfileEntry = hasOwn(keys, profileId);
    if (hadProfileEntry) {
      // Only wipe if the stored key belongs to a different origin; preserve keys already bound to newOrigin
      // (e.g. when a user updates baseUrl, sets a new key for the new origin, and then clicks Save).
      if (keys[profileId].origin !== newOrigin) {
        if (keys[profileId].key) cleared = true;
        delete keys[profileId];
        GM_setValue('fuoAIKeys', keys);
      }
    }
    if (profileId === 'deepseek' && newOrigin !== 'https://api.deepseek.com') {
      const legacy = GM_getValue('deepseekKey', '');
      if (legacy !== '') {
        if (!hadProfileEntry && typeof legacy === 'string' && legacy.trim()) {
          cleared = true;
        }
        GM_setValue('deepseekKey', '');
      }
    }
    return cleared;
  }

  function hasProviderKey(provider) {
    return Boolean(getProviderKey(provider));
  }

  function promptApiKeyForProvider(provider) {
    let baseInfo;
    try {
      baseInfo = validateBaseUrl(provider?.baseUrl);
    } catch (err) {
      return { changed: false, cleared: false, error: err?.message || 'Base URL không hợp lệ.' };
    }
    const localNote = baseInfo.isLocalHttp ? ' (tùy chọn với endpoint cục bộ)' : '';
    const message = 'Nhập API key mới cho ' + provider.name + ' (' + baseInfo.origin + ')' + localNote
      + '. Để trống để xóa. Script chỉ gửi ảnh câu hỏi tới endpoint này khi bạn bấm Xem đáp án AI hoặc chấm bằng AI.';
    const raw = prompt(message);
    if (raw === null) return { changed: false, cleared: false };
    try {
      const cleanKey = validateApiKey(raw);
      setProviderKey(provider, cleanKey);
      return { changed: true, cleared: cleanKey === '' };
    } catch (err) {
      return { changed: false, cleared: false, error: err?.message || 'API key không hợp lệ.' };
    }
  }

  const aiConfigListeners = new Set();
  function notifyAIConfigChanged() {
    aiConfigVersion++;
    for (const attempt of attempts.values()) {
      attempt.aiSolution = null;
      attempt.aiConfigSig = '';
      attempt.aiText = '';
    }
    for (const listener of [...aiConfigListeners]) {
      try {
        listener();
      } catch {}
    }
  }

  const COMPATIBLE_TYPE_LABELS = Object.freeze({
    openai: 'OpenAI-compatible (Chat Completions)',
    deepseek: 'DeepSeek-compatible',
    anthropic: 'Anthropic Claude (Messages API)',
    gemini: 'Google Gemini (GenerateContent)'
  });

  const THINKING_LEVEL_LABELS = Object.freeze({
    default: 'Mặc định (default)',
    off: 'Tắt (off)',
    low: 'Thấp (low)',
    medium: 'Trung bình (medium)',
    high: 'Cao (high)'
  });

  function createSettingsField(id, labelText, control, ...extras) {
    const wrap = document.createElement('div');
    wrap.className = 'fuo-settings-field';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    control.id = id;
    if (extras.length) {
      const row = document.createElement('div');
      row.className = 'fuo-settings-row';
      row.append(control, ...extras);
      wrap.append(label, row);
    } else {
      wrap.append(label, control);
    }
    return wrap;
  }

  function validateDraftProfile(draft) {
    const name = draft.custom ? validateProviderName(draft.name) : BUILTIN_PROVIDERS[draft.id].name;
    const compatibleType = COMPATIBLE_TYPES.includes(draft.compatibleType) ? draft.compatibleType : '';
    if (!compatibleType) {
      throw new Error('Loại tương thích AI không hợp lệ.');
    }
    const baseUrl = validateBaseUrl(String(draft.baseUrl ?? '').trim()).url;
    const model = validateModelId(draft.model);
    const thinking = THINKING_LEVELS.includes(draft.thinking) ? draft.thinking : '';
    if (!thinking) {
      throw new Error('Mức suy nghĩ (Thinking) không hợp lệ.');
    }
    return {
      id: draft.id,
      name,
      baseUrl,
      compatibleType,
      model,
      thinking,
      custom: Boolean(draft.custom)
    };
  }

  function openAISettingsModal(openerEl) {
    const existing = document.querySelector('.fuo-settings-backdrop');
    if (existing) {
      existing.querySelector('.fuo-settings-dialog')?.focus();
      return existing;
    }

    const returnFocusTo = openerEl instanceof HTMLElement
      ? openerEl
      : document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const saved = loadAIConfig();
    const profileDrafts = new Map();
    for (const id of Object.keys(BUILTIN_PROVIDERS)) {
      profileDrafts.set(id, cloneProvider(saved.providers[id] || BUILTIN_PROVIDERS[id]));
    }
    for (const id of Object.keys(saved.providers)) {
      if (hasOwn(saved.providers, id) && !hasOwn(BUILTIN_PROVIDERS, id)) {
        profileDrafts.set(id, cloneProvider(saved.providers[id]));
      }
    }
    let selectedId = profileDrafts.has(saved.activeId) ? saved.activeId : 'deepseek';
    let loadedModels = [];
    let modelsFetchSeq = 0;

    const backdrop = document.createElement('div');
    backdrop.className = 'fuo-settings-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'fuo-settings-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'fuo-settings-title');
    dialog.tabIndex = -1;

    const header = document.createElement('div');
    header.className = 'fuo-settings-header';
    const heading = document.createElement('h2');
    heading.id = 'fuo-settings-title';
    heading.textContent = 'Cài đặt AI (BYOK)';
    const closeTopBtn = document.createElement('button');
    closeTopBtn.type = 'button';
    closeTopBtn.className = 'fuo-settings-close';
    closeTopBtn.setAttribute('aria-label', 'Đóng hộp thoại');
    closeTopBtn.textContent = '×';
    header.append(heading, closeTopBtn);

    const providerSelect = document.createElement('select');
    const addCustomBtn = document.createElement('button');
    addCustomBtn.type = 'button';
    addCustomBtn.textContent = '+ Tùy chỉnh';
    const deleteCustomBtn = document.createElement('button');
    deleteCustomBtn.type = 'button';
    deleteCustomBtn.className = 'fuo-settings-danger';
    deleteCustomBtn.textContent = 'Xóa';
    const resetPresetBtn = document.createElement('button');
    resetPresetBtn.type = 'button';
    resetPresetBtn.textContent = 'Mặc định';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 60;

    const compatibleSelect = document.createElement('select');
    for (const type of COMPATIBLE_TYPES) {
      compatibleSelect.append(new Option(COMPATIBLE_TYPE_LABELS[type], type));
    }

    const baseUrlInput = document.createElement('input');
    baseUrlInput.type = 'url';
    baseUrlInput.spellcheck = false;

    const localWarn = document.createElement('div');
    localWarn.className = 'fuo-settings-warn';
    localWarn.hidden = true;

    const keySection = document.createElement('div');
    keySection.className = 'fuo-settings-field';
    const keyLabel = document.createElement('span');
    keyLabel.className = 'fuo-settings-label';
    keyLabel.textContent = 'API Key (chỉ ghi, ẩn khỏi DOM)';
    const keyRow = document.createElement('div');
    keyRow.className = 'fuo-settings-row';
    const keyStatus = document.createElement('span');
    keyStatus.className = 'fuo-key-status';
    const setKeyBtn = document.createElement('button');
    setKeyBtn.type = 'button';
    setKeyBtn.textContent = 'Đặt / đổi API key';
    const clearKeyBtn = document.createElement('button');
    clearKeyBtn.type = 'button';
    clearKeyBtn.textContent = 'Xóa key';
    keyRow.append(keyStatus, setKeyBtn, clearKeyBtn);
    keySection.append(keyLabel, keyRow);

    const modelInput = document.createElement('input');
    modelInput.type = 'text';
    modelInput.spellcheck = false;
    const fetchModelsBtn = document.createElement('button');
    fetchModelsBtn.type = 'button';
    fetchModelsBtn.textContent = 'Tải danh sách (/models)';
    const modelFilterInput = document.createElement('input');
    modelFilterInput.type = 'search';
    modelFilterInput.className = 'fuo-models-filter';
    modelFilterInput.placeholder = 'Lọc model…';
    modelFilterInput.setAttribute('aria-label', 'Lọc model');
    modelFilterInput.hidden = true;
    const modelSelect = document.createElement('select');
    modelSelect.className = 'fuo-models-select';
    modelSelect.setAttribute('aria-label', 'Danh sách model');
    modelSelect.hidden = true;
    const modelsStatus = document.createElement('div');
    modelsStatus.className = 'fuo-models-status';

    const modelField = createSettingsField('fuo-settings-model', 'Model', modelInput, fetchModelsBtn);
    modelField.append(modelFilterInput, modelSelect, modelsStatus);

    const thinkingSelect = document.createElement('select');
    for (const level of THINKING_LEVELS) {
      thinkingSelect.append(new Option(THINKING_LEVEL_LABELS[level], level));
    }

    const alertBox = document.createElement('div');
    alertBox.className = 'fuo-settings-alert';
    alertBox.setAttribute('role', 'alert');
    alertBox.hidden = true;

    const footer = document.createElement('div');
    footer.className = 'fuo-settings-footer';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Đóng';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'fuo-settings-primary';
    saveBtn.textContent = 'Lưu cấu hình';
    footer.append(closeBtn, saveBtn);

    function showAlert(message, tone = 'error') {
      alertBox.textContent = message;
      alertBox.dataset.tone = tone;
      alertBox.hidden = !message;
    }

    function clearAlert() {
      alertBox.textContent = '';
      delete alertBox.dataset.tone;
      alertBox.hidden = true;
    }

    function resetModelsUI() {
      modelsFetchSeq++;
      loadedModels = [];
      modelFilterInput.value = '';
      modelFilterInput.hidden = true;
      modelSelect.replaceChildren();
      modelSelect.hidden = true;
      modelsStatus.textContent = '';
    }

    function renderModelOptions() {
      const query = modelFilterInput.value.trim().toLowerCase();
      const filtered = query
        ? loadedModels.filter(m => m.id.toLowerCase().includes(query) || m.label.toLowerCase().includes(query))
        : loadedModels;
      modelSelect.replaceChildren();
      modelSelect.append(new Option('-- Chọn model (' + filtered.length + ') --', ''));
      for (const item of filtered) {
        modelSelect.append(new Option(item.label, item.id));
      }
      const currentModel = modelInput.value.trim();
      modelSelect.value = filtered.some(m => m.id === currentModel) ? currentModel : '';
      if (loadedModels.length > 0) {
        modelsStatus.textContent = query
          ? 'Hiển thị ' + filtered.length + '/' + loadedModels.length + ' model.'
          : 'Đã tải ' + loadedModels.length + ' model.';
      }
    }

    function updateUrlWarningAndKeyStatus() {
      const draft = profileDrafts.get(selectedId);
      if (!draft) return;
      let baseInfo;
      try {
        baseInfo = validateBaseUrl(baseUrlInput.value.trim());
      } catch {
        localWarn.hidden = true;
        localWarn.textContent = '';
        keyStatus.textContent = 'URL chưa hợp lệ';
        keyStatus.dataset.state = 'invalid';
        return;
      }
      if (baseInfo.isLocalHttp) {
        localWarn.hidden = false;
        localWarn.textContent = 'Cảnh báo: đang dùng HTTP cục bộ (chỉ an toàn trên máy cá nhân).';
      } else {
        localWarn.hidden = true;
        localWarn.textContent = '';
      }
      const configured = hasProviderKey({ id: draft.id, name: draft.name, baseUrl: baseInfo.url });
      if (configured && baseInfo.isLocalHttp) {
        keyStatus.textContent = 'Đã cấu hình (tùy chọn)';
        keyStatus.dataset.state = 'ok';
      } else if (configured) {
        keyStatus.textContent = 'Đã cấu hình';
        keyStatus.dataset.state = 'ok';
      } else if (baseInfo.isLocalHttp) {
        keyStatus.textContent = 'Không bắt buộc (local HTTP)';
        keyStatus.dataset.state = 'local';
      } else {
        keyStatus.textContent = 'Chưa cài';
        keyStatus.dataset.state = 'missing';
      }
    }

    function rebuildProviderSelect() {
      providerSelect.replaceChildren();
      for (const id of Object.keys(BUILTIN_PROVIDERS)) {
        const draft = profileDrafts.get(id);
        if (draft) providerSelect.append(new Option(draft.name, id));
      }
      for (const [id, draft] of profileDrafts.entries()) {
        if (draft.custom) {
          providerSelect.append(new Option('[Tùy chỉnh] ' + draft.name, id));
        }
      }
      providerSelect.value = selectedId;
    }

    function syncInputsToCurrentDraft() {
      const draft = profileDrafts.get(selectedId);
      if (!draft) return;
      if (draft.custom) draft.name = nameInput.value;
      draft.compatibleType = compatibleSelect.value;
      draft.baseUrl = baseUrlInput.value;
      draft.model = modelInput.value;
      draft.thinking = thinkingSelect.value;
    }

    function populateFormFromSelected() {
      const draft = profileDrafts.get(selectedId);
      if (!draft) return;
      providerSelect.value = selectedId;
      nameInput.value = draft.name;
      nameInput.disabled = !draft.custom;
      nameInput.readOnly = !draft.custom;
      compatibleSelect.value = COMPATIBLE_TYPES.includes(draft.compatibleType) ? draft.compatibleType : 'openai';
      baseUrlInput.value = draft.baseUrl;
      modelInput.value = draft.model;
      thinkingSelect.value = THINKING_LEVELS.includes(draft.thinking) ? draft.thinking : 'default';
      deleteCustomBtn.hidden = !draft.custom;
      deleteCustomBtn.disabled = !draft.custom;
      resetPresetBtn.hidden = Boolean(draft.custom);
      resetPresetBtn.disabled = Boolean(draft.custom);
      updateUrlWarningAndKeyStatus();
    }

    function close() {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      if (returnFocusTo && returnFocusTo.isConnected) {
        returnFocusTo.focus();
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button,input,select')]
          .filter(el => !el.disabled && el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }

    providerSelect.addEventListener('change', () => {
      syncInputsToCurrentDraft();
      selectedId = providerSelect.value;
      clearAlert();
      resetModelsUI();
      populateFormFromSelected();
    });

    nameInput.addEventListener('input', () => {
      syncInputsToCurrentDraft();
      const opt = [...providerSelect.options].find(o => o.value === selectedId);
      const draft = profileDrafts.get(selectedId);
      if (opt && draft?.custom) {
        opt.textContent = '[Tùy chỉnh] ' + (nameInput.value.trim() || 'Nhà cung cấp tùy chỉnh');
      }
    });

    compatibleSelect.addEventListener('change', () => {
      syncInputsToCurrentDraft();
      resetModelsUI();
    });

    baseUrlInput.addEventListener('input', () => {
      syncInputsToCurrentDraft();
      updateUrlWarningAndKeyStatus();
      resetModelsUI();
    });

    modelInput.addEventListener('input', syncInputsToCurrentDraft);
    thinkingSelect.addEventListener('change', syncInputsToCurrentDraft);

    modelFilterInput.addEventListener('input', renderModelOptions);
    modelSelect.addEventListener('change', () => {
      if (!modelSelect.value) return;
      modelInput.value = modelSelect.value;
      syncInputsToCurrentDraft();
    });

    addCustomBtn.addEventListener('click', () => {
      clearAlert();
      syncInputsToCurrentDraft();
      let customCount = 0;
      for (const draft of profileDrafts.values()) {
        if (draft.custom) customCount++;
      }
      if (customCount >= MAX_CUSTOM_PROVIDERS) {
        showAlert('Đã đạt giới hạn tối đa ' + MAX_CUSTOM_PROVIDERS + ' nhà cung cấp tùy chỉnh.');
        return;
      }
      const baseId = 'custom-' + Date.now().toString(36);
      let newId = baseId;
      let suffix = 1;
      while (profileDrafts.has(newId) || hasOwn(BUILTIN_PROVIDERS, newId)) {
        newId = baseId + '-' + (++suffix);
      }
      profileDrafts.set(newId, {
        id: newId,
        name: 'Nhà cung cấp tùy chỉnh',
        baseUrl: 'https://api.openai.com/v1',
        compatibleType: 'openai',
        model: 'gpt-4.1-mini',
        thinking: 'default',
        custom: true
      });
      selectedId = newId;
      resetModelsUI();
      rebuildProviderSelect();
      populateFormFromSelected();
      nameInput.focus();
      nameInput.select();
    });

    deleteCustomBtn.addEventListener('click', () => {
      const draft = profileDrafts.get(selectedId);
      if (!draft || !draft.custom) return;
      const deletingId = selectedId;
      deleteProviderKey(deletingId);
      profileDrafts.delete(deletingId);
      const persisted = loadAIConfig();
      if (hasOwn(persisted.providers, deletingId)) {
        delete persisted.providers[deletingId];
        if (persisted.activeId === deletingId) {
          persisted.activeId = 'deepseek';
        }
        saveAIConfig(persisted);
        notifyAIConfigChanged();
      }
      selectedId = 'deepseek';
      resetModelsUI();
      rebuildProviderSelect();
      populateFormFromSelected();
      showAlert('Đã xóa nhà cung cấp tùy chỉnh.', 'notice');
    });

    resetPresetBtn.addEventListener('click', () => {
      if (!hasOwn(BUILTIN_PROVIDERS, selectedId)) return;
      profileDrafts.set(selectedId, cloneProvider(BUILTIN_PROVIDERS[selectedId]));
      clearAlert();
      resetModelsUI();
      populateFormFromSelected();
    });

    setKeyBtn.addEventListener('click', () => {
      clearAlert();
      const draft = profileDrafts.get(selectedId);
      if (!draft) return;
      let validName;
      let baseInfo;
      try {
        validName = draft.custom ? validateProviderName(nameInput.value) : BUILTIN_PROVIDERS[draft.id].name;
        baseInfo = validateBaseUrl(baseUrlInput.value.trim());
      } catch (err) {
        showAlert(err?.message || 'Cấu hình không hợp lệ.');
        return;
      }
      const result = promptApiKeyForProvider({ id: draft.id, name: validName, baseUrl: baseInfo.url });
      if (result.error) {
        showAlert(result.error);
        return;
      }
      if (result.changed) {
        updateUrlWarningAndKeyStatus();
        notifyAIConfigChanged();
      }
    });

    clearKeyBtn.addEventListener('click', () => {
      clearAlert();
      const draft = profileDrafts.get(selectedId);
      if (!draft) return;
      let baseInfo;
      try {
        baseInfo = validateBaseUrl(baseUrlInput.value.trim());
      } catch (err) {
        showAlert(err?.message || 'Base URL không hợp lệ.');
        return;
      }
      try {
        setProviderKey({ id: draft.id, name: draft.name, baseUrl: baseInfo.url }, '');
        updateUrlWarningAndKeyStatus();
        notifyAIConfigChanged();
      } catch (err) {
        showAlert(err?.message || 'Không xóa được API key.');
      }
    });

    fetchModelsBtn.addEventListener('click', async () => {
      clearAlert();
      const draft = profileDrafts.get(selectedId);
      if (!draft) return;
      let validName;
      let baseInfo;
      try {
        validName = draft.custom ? validateProviderName(nameInput.value) : BUILTIN_PROVIDERS[draft.id].name;
        baseInfo = validateBaseUrl(baseUrlInput.value.trim());
      } catch (err) {
        showAlert(err?.message || 'Base URL hoặc tên nhà cung cấp không hợp lệ.');
        return;
      }
      const compatibleType = COMPATIBLE_TYPES.includes(compatibleSelect.value) ? compatibleSelect.value : '';
      if (!compatibleType) {
        showAlert('Loại tương thích AI không hợp lệ.');
        return;
      }
      const draftProvider = {
        id: draft.id,
        name: validName,
        baseUrl: baseInfo.url,
        compatibleType
      };
      const key = getProviderKey(draftProvider);
      const seq = ++modelsFetchSeq;
      fetchModelsBtn.disabled = true;
      modelsStatus.textContent = 'Đang tải danh sách model…';
      try {
        const models = await fetchProviderModels(draftProvider, key, { force: true });
        if (!backdrop.isConnected || seq !== modelsFetchSeq || selectedId !== draftProvider.id) return;
        loadedModels = models;
        modelFilterInput.value = '';
        modelFilterInput.hidden = models.length <= 10;
        renderModelOptions();
        if (models.length > 0) {
          modelSelect.hidden = false;
        } else {
          modelSelect.hidden = true;
          modelsStatus.textContent = 'Endpoint không trả về model nào. Hãy nhập Model ID thủ công.';
        }
      } catch (err) {
        if (!backdrop.isConnected || seq !== modelsFetchSeq) return;
        loadedModels = [];
        modelFilterInput.hidden = true;
        modelSelect.hidden = true;
        modelsStatus.textContent = '';
        showAlert(err?.message || 'Không tải được danh sách model.');
      } finally {
        if (fetchModelsBtn.isConnected) fetchModelsBtn.disabled = false;
      }
    });

    saveBtn.addEventListener('click', () => {
      clearAlert();
      syncInputsToCurrentDraft();
      const activeDraft = profileDrafts.get(selectedId);
      if (!activeDraft) return;
      const validated = new Map();
      try {
        validated.set(selectedId, validateDraftProfile(activeDraft));
      } catch (err) {
        showAlert(err?.message || 'Cấu hình không hợp lệ.');
        return;
      }
      for (const [id, draft] of profileDrafts.entries()) {
        if (id === selectedId) continue;
        try {
          validated.set(id, validateDraftProfile(draft));
        } catch (err) {
          selectedId = id;
          resetModelsUI();
          rebuildProviderSelect();
          populateFormFromSelected();
          showAlert('[' + (draft.name || id) + '] ' + (err?.message || 'Cấu hình không hợp lệ.'));
          return;
        }
      }
      const nextProviders = {};
      let customCount = 0;
      for (const [id, profile] of validated.entries()) {
        if (profile.custom) {
          if (customCount >= MAX_CUSTOM_PROVIDERS) break;
          customCount++;
        }
        defineSafeProp(nextProviders, id, profile);
      }
      const previousSaved = loadAIConfig();
      saveAIConfig({ version: 1, activeId: selectedId, providers: nextProviders });
      let activeKeyWiped = false;
      for (const [id, profile] of Object.entries(nextProviders)) {
        const oldBase = hasOwn(previousSaved.providers, id) ? previousSaved.providers[id].baseUrl : '';
        const wiped = clearProviderKeyIfOriginChanged(id, oldBase, profile.baseUrl);
        if (id === selectedId && wiped) activeKeyWiped = true;
      }
      notifyAIConfigChanged();
      if (activeKeyWiped) {
        updateUrlWarningAndKeyStatus();
        showAlert('Đã lưu cấu hình. Domain đã đổi nên API key cũ đã bị xóa — hãy cài lại API key.', 'notice');
        return;
      }
      close();
    });

    closeTopBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) close();
    });
    document.addEventListener('keydown', onKeyDown);

    const providerField = createSettingsField(
      'fuo-settings-provider',
      'Nhà cung cấp',
      providerSelect,
      addCustomBtn,
      deleteCustomBtn,
      resetPresetBtn
    );
    const nameField = createSettingsField('fuo-settings-name', 'Tên hiển thị', nameInput);
    const compatibleField = createSettingsField('fuo-settings-compatible', 'Loại tương thích', compatibleSelect);
    const baseUrlField = createSettingsField('fuo-settings-baseurl', 'Base URL', baseUrlInput);
    baseUrlField.append(localWarn);
    const thinkingField = createSettingsField('fuo-settings-thinking', 'Mức suy nghĩ (Thinking)', thinkingSelect);

    dialog.append(
      header,
      providerField,
      nameField,
      compatibleField,
      baseUrlField,
      keySection,
      modelField,
      thinkingField,
      alertBox,
      footer
    );
    backdrop.append(dialog);
    rebuildProviderSelect();
    populateFormFromSelected();
    document.body.append(backdrop);
    providerSelect.focus();
    return backdrop;
  }

  GM_registerMenuCommand('Cấu hình AI (BYOK / Model / Thinking)', () => openAISettingsModal());
  GM_registerMenuCommand('Cài / xóa API key (nhà cung cấp hiện tại)', () => {
    const result = promptApiKeyForProvider(getActiveProvider());
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.changed) notifyAIConfigChanged();
  });

