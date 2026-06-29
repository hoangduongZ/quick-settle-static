(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = window.QSStorage;
  const D = window.QSDomain;
  const U = window.QSUtils;
  const UI = window.QSUI;
  const SCREENS = ['overview', 'players', 'rounds', 'settlement'];

  const initialHash = window.location.hash.replace('#', '');
  const state = {
    data: D.normalizeData(S.loadData()),
    currentSessionId: S.getCurrentSessionId(),
    screen: SCREENS.includes(initialHash) ? initialHash : S.getActiveScreen(),
    toastTimer: null,
    forceCreateView: false,
    editingPlayerId: null,
    editingRoundId: null,
    loadRoundDraft: S.loadRoundDraft
  };

  function save() {
    S.saveData(state.data);
  }

  function setCurrentSession(id) {
    state.currentSessionId = id || null;
    state.editingPlayerId = null;
    state.editingRoundId = null;
    S.setCurrentSessionId(state.currentSessionId);
  }

  function setScreen(screen, syncHash = true) {
    state.screen = SCREENS.includes(screen) ? screen : 'overview';
    S.setActiveScreen(state.screen);
    if (syncHash && window.location.hash.replace('#', '') !== state.screen) {
      window.history.replaceState(null, '', '#' + state.screen);
    }
  }

  function getCurrentSession() {
    return state.data.sessions.find((session) => session.id === state.currentSessionId) || null;
  }

  function ensureCurrentSession() {
    if (state.forceCreateView) return;
    if (getCurrentSession()) return;
    const latest = [...state.data.sessions].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    setCurrentSession(latest ? latest.id : null);
  }

  function showToast(message, type = 'info') {
    const toast = $('toast');
    const color = type === 'error' ? 'border-danger/60' : type === 'success' ? 'border-accent/50' : 'border-white/15';
    toast.className = `no-print pointer-events-none fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border ${color} bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur soft-pop`;
    toast.innerHTML = `<p class="font-semibold">${U.escapeHtml(message)}</p>`;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
  }

  function render() {
    ensureCurrentSession();
    const session = state.forceCreateView ? null : getCurrentSession();
    UI.render(state, session);
    bindDynamicEvents(session);
  }

  function collectRoundAmounts() {
    const amounts = {};
    document.querySelectorAll('[data-round-input]').forEach((input) => {
      amounts[input.dataset.playerId] = input.value;
    });
    return amounts;
  }

  function saveRoundDraft() {
    const session = getCurrentSession();
    if (!session || state.editingRoundId) return;
    S.saveRoundDraft(session.id, {
      notes: $('roundNoteInput').value,
      amounts: collectRoundAmounts()
    });
  }

  function balanceLastInput() {
    const inputs = [...document.querySelectorAll('[data-round-input]')];
    if (inputs.length < 2) return;
    let sumExceptLast = 0;
    inputs.slice(0, -1).forEach((input) => {
      const value = U.parseAmount(input.value);
      sumExceptLast += Number.isNaN(value) ? 0 : value;
    });
    inputs[inputs.length - 1].value = String(-sumExceptLast);
    UI.updateRoundSumBadge();
    saveRoundDraft();
  }

  function openGuide() {
    $('guideModal').classList.remove('hidden');
    $('guideModal').classList.add('flex');
    $('closeGuideBtn').focus();
  }

  function closeGuide() {
    $('guideModal').classList.add('hidden');
    $('guideModal').classList.remove('flex');
    $('guideBtn').focus();
  }

  function downloadBackup() {
    const payload = JSON.stringify({ ...state.data, exportedAt: U.nowIso() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quick-settle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tạo bản sao dữ liệu', 'success');
  }

  async function importBackup(file) {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.sessions)) throw new Error('File khôi phục không đúng định dạng');
    state.data = D.normalizeData({ version: 3, sessions: parsed.sessions });
    state.forceCreateView = false;
    setCurrentSession(state.data.sessions[0]?.id || null);
    save();
  }

  function bindDynamicEvents(session) {
    document.querySelectorAll('.session-item').forEach((button) => {
      button.addEventListener('click', () => {
        state.forceCreateView = false;
        setCurrentSession(button.dataset.sessionId);
        render();
      });
    });

    document.querySelectorAll('[data-jump-screen]').forEach((button) => {
      button.addEventListener('click', () => {
        setScreen(button.dataset.jumpScreen);
        render();
      });
    });

    document.querySelectorAll('[data-edit-player]').forEach((button) => {
      button.addEventListener('click', () => {
        state.editingPlayerId = button.dataset.editPlayer;
        setScreen('players');
        render();
        $('editPlayerForm')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    document.querySelectorAll('[data-toggle-player]').forEach((button) => {
      button.addEventListener('click', () => {
        try {
          D.togglePlayerActive(session, button.dataset.togglePlayer);
          save();
          render();
          showToast('Đã cập nhật trạng thái thành viên', 'success');
        } catch (error) { showToast(error.message, 'error'); }
      });
    });

    document.querySelectorAll('[data-remove-player]').forEach((button) => {
      button.addEventListener('click', () => {
        try {
          D.removePlayer(session, button.dataset.removePlayer);
          save();
          render();
          showToast('Đã xóa thành viên', 'success');
        } catch (error) { showToast(error.message, 'error'); }
      });
    });

    document.querySelectorAll('[data-round-input]').forEach((input) => {
      input.addEventListener('input', () => {
        UI.updateRoundSumBadge();
        saveRoundDraft();
      });
    });

    document.querySelectorAll('[data-edit-round]').forEach((button) => {
      button.addEventListener('click', () => {
        state.editingRoundId = button.dataset.editRound;
        setScreen('rounds');
        render();
        $('roundFormTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.querySelectorAll('[data-delete-round]').forEach((button) => {
      button.addEventListener('click', () => {
        const round = session?.rounds.find((item) => item.id === button.dataset.deleteRound);
        if (!round || !window.confirm(`Xóa lượt ${round.roundNumber}?`)) return;
        try {
          D.deleteRound(session, button.dataset.deleteRound);
          state.editingRoundId = null;
          save();
          render();
          showToast('Đã xóa lượt', 'success');
        } catch (error) { showToast(error.message, 'error'); }
      });
    });

    document.querySelectorAll('[data-reopen-session]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!session) return;
        D.reopenSession(session);
        save();
        render();
        showToast('Đã mở lại phiên để sửa', 'success');
      });
    });
  }

  function bindStaticEvents() {
    document.querySelectorAll('[data-screen-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        setScreen(button.dataset.screenTab);
        render();
      });
    });

    $('homeBtn').addEventListener('click', () => {
      state.forceCreateView = false;
      setCurrentSession(null);
      render();
    });

    $('newSessionTopBtn').addEventListener('click', () => {
      state.forceCreateView = true;
      setCurrentSession(null);
      render();
      $('sessionNameInput')?.focus();
    });

    $('guideBtn').addEventListener('click', openGuide);
    $('closeGuideBtn').addEventListener('click', closeGuide);
    $('guideModal').addEventListener('click', (event) => {
      if (event.target === $('guideModal')) closeGuide();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('guideModal').classList.contains('hidden')) closeGuide();
    });

    $('printBtn').addEventListener('click', () => window.print());

    $('createSessionForm').addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const session = D.createSession(state.data, $('sessionNameInput').value);
        $('sessionNameInput').value = '';
        setCurrentSession(session.id);
        setScreen('players');
        state.forceCreateView = false;
        save();
        render();
        showToast(`Đã tạo phiên ${session.name}`, 'success');
      } catch (error) { showToast(error.message, 'error'); }
    });

    $('addPlayerForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const session = getCurrentSession();
      try {
        D.addPlayer(session, {
          displayName: $('playerNameInput').value,
          bankId: $('playerBankInput').value,
          accountNo: $('playerAccountInput').value,
          accountName: $('playerAccountNameInput').value
        });
        $('playerNameInput').value = '';
        $('playerBankInput').value = '';
        $('playerAccountInput').value = '';
        $('playerAccountNameInput').value = '';
        save();
        render();
        showToast('Đã thêm thành viên', 'success');
      } catch (error) { showToast(error.message, 'error'); }
    });

    $('editPlayerForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const session = getCurrentSession();
      try {
        D.updatePlayer(session, state.editingPlayerId, {
          displayName: $('editPlayerNameInput').value,
          bankId: $('editPlayerBankInput').value,
          accountNo: $('editPlayerAccountInput').value,
          accountName: $('editPlayerAccountNameInput').value
        });
        state.editingPlayerId = null;
        save();
        render();
        showToast('Đã cập nhật thành viên', 'success');
      } catch (error) { showToast(error.message, 'error'); }
    });

    $('cancelEditPlayerBtn').addEventListener('click', () => {
      state.editingPlayerId = null;
      render();
    });

    $('balanceLastBtn').addEventListener('click', balanceLastInput);

    $('roundNoteInput').addEventListener('input', saveRoundDraft);

    $('cancelEditRoundBtn').addEventListener('click', () => {
      state.editingRoundId = null;
      render();
    });

    $('addRoundForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const session = getCurrentSession();
      if (!session) return;
      try {
        const amounts = collectRoundAmounts();
        const wasEditingRound = Boolean(state.editingRoundId);
        if (wasEditingRound) {
          D.updateRound(session, state.editingRoundId, amounts, $('roundNoteInput').value);
          state.editingRoundId = null;
        } else {
          D.addRound(session, amounts, $('roundNoteInput').value, D.activePlayers(session));
          S.clearRoundDraft(session.id);
        }
        save();
        render();
        showToast(wasEditingRound ? 'Đã cập nhật lượt' : 'Đã lưu lượt mới', 'success');
      } catch (error) { showToast(error.message, 'error'); }
    });

    $('settleBtn').addEventListener('click', () => {
      const session = getCurrentSession();
      try {
        D.settleSession(session);
        setScreen('settlement');
        save();
        render();
        showToast('Đã chốt khoản tối ưu', 'success');
      } catch (error) { showToast(error.message, 'error'); }
    });

    $('undoRoundBtn').addEventListener('click', () => {
      const session = getCurrentSession();
      try {
        D.undoLastRound(session);
        save();
        render();
        showToast('Đã hoàn tác lượt cuối', 'success');
      } catch (error) { showToast(error.message, 'error'); }
    });

    $('exportBtn').addEventListener('click', downloadBackup);

    $('importInput').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        await importBackup(file);
        render();
        showToast('Khôi phục dữ liệu thành công', 'success');
      } catch (error) { showToast(error.message, 'error'); }
      event.target.value = '';
    });

    $('clearSessionBtn').addEventListener('click', () => {
      const session = getCurrentSession();
      if (!session) return showToast('Chưa chọn phiên', 'error');
      if (!window.confirm(`Xóa phiên "${session.name}"?`)) return;
      state.data.sessions = state.data.sessions.filter((item) => item.id !== session.id);
      state.forceCreateView = false;
      setCurrentSession(state.data.sessions[0]?.id || null);
      save();
      render();
      showToast('Đã xóa phiên', 'success');
    });

    $('clearAllBtn').addEventListener('click', () => {
      if (!window.confirm('Xóa toàn bộ dữ liệu Quick Settle trên thiết bị này?')) return;
      state.data = { version: 3, sessions: [] };
      state.forceCreateView = false;
      setCurrentSession(null);
      S.clearAll(true);
      save();
      render();
      showToast('Đã xóa toàn bộ dữ liệu', 'success');
    });

    $('seedSampleBtn').addEventListener('click', () => {
      const session = D.createSampleSession(state.data);
      setCurrentSession(session.id);
      setScreen('settlement');
      state.forceCreateView = false;
      save();
      render();
      showToast('Đã nạp dữ liệu mẫu', 'success');
    });

    window.addEventListener('hashchange', () => {
      const next = window.location.hash.replace('#', '');
      if (!SCREENS.includes(next) || next === state.screen) return;
      setScreen(next, false);
      render();
    });
  }

  save();
  bindStaticEvents();
  render();
})();
