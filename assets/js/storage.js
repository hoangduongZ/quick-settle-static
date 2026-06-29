(function () {
  'use strict';

  const KEYS = {
    data: 'quickSettle.data.v3',
    legacyData: 'quickSettle.static.v1',
    currentSession: 'quickSettle.currentSessionId',
    activeScreen: 'quickSettle.activeScreen',
    roundDraftPrefix: 'quickSettle.roundDraft.'
  };

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function loadData() {
    const current = readJson(KEYS.data, null);
    if (current && Array.isArray(current.sessions)) return current;

    const legacy = readJson(KEYS.legacyData, null);
    if (legacy && Array.isArray(legacy.sessions)) {
      saveData(legacy);
      return legacy;
    }

    return { version: 3, sessions: [] };
  }

  function saveData(data) {
    window.localStorage.setItem(KEYS.data, JSON.stringify(data));
  }

  function getCurrentSessionId() {
    return window.sessionStorage.getItem(KEYS.currentSession) || null;
  }

  function setCurrentSessionId(id) {
    if (id) window.sessionStorage.setItem(KEYS.currentSession, id);
    else window.sessionStorage.removeItem(KEYS.currentSession);
  }

  function getActiveScreen() {
    return window.sessionStorage.getItem(KEYS.activeScreen) || 'overview';
  }

  function setActiveScreen(screen) {
    window.sessionStorage.setItem(KEYS.activeScreen, screen);
  }

  function loadRoundDraft(sessionId) {
    try {
      return JSON.parse(window.sessionStorage.getItem(KEYS.roundDraftPrefix + sessionId) || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveRoundDraft(sessionId, draft) {
    window.sessionStorage.setItem(KEYS.roundDraftPrefix + sessionId, JSON.stringify(draft || {}));
  }

  function clearRoundDraft(sessionId) {
    window.sessionStorage.removeItem(KEYS.roundDraftPrefix + sessionId);
  }

  function clearAll(dataOnly) {
    window.localStorage.removeItem(KEYS.data);
    window.localStorage.removeItem(KEYS.legacyData);
    window.sessionStorage.removeItem(KEYS.currentSession);
    window.sessionStorage.removeItem(KEYS.activeScreen);
    Object.keys(window.sessionStorage).forEach((key) => {
      if (key.startsWith(KEYS.roundDraftPrefix)) window.sessionStorage.removeItem(key);
    });
    if (!dataOnly) saveData({ version: 3, sessions: [] });
  }

  window.QSStorage = {
    KEYS,
    loadData,
    saveData,
    getCurrentSessionId,
    setCurrentSessionId,
    getActiveScreen,
    setActiveScreen,
    loadRoundDraft,
    saveRoundDraft,
    clearRoundDraft,
    clearAll
  };
})();
