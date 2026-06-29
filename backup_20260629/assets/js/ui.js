(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const U = window.QSUtils;
  const D = window.QSDomain;

  function renderBankOptions() {
    $('bankOptions').innerHTML = D.BANKS.map(([value, label]) => `<option value="${U.escapeHtml(value)}">${U.escapeHtml(label)}</option>`).join('');
  }

  function renderTabs(state) {
    document.querySelectorAll('[data-screen-tab]').forEach((button) => {
      const active = button.dataset.screenTab === state.screen;
      button.className = `screen-tab rounded-2xl px-4 py-3 text-sm font-extrabold transition ${active ? 'tab-active' : 'tab-inactive hover:bg-white'}`;
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('[data-screen-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.screenPanel !== state.screen);
    });
  }

  function renderSessionList(state) {
    const list = $('sessionList');
    if (state.data.sessions.length === 0) {
      list.innerHTML = `<div class="rounded-3xl border border-dashed border-felt/20 p-4 text-sm text-ink/60">Chưa có phiên nào. Tạo phiên mới để bắt đầu.</div>`;
      return;
    }

    list.innerHTML = state.data.sessions.map((session) => {
      const active = session.id === state.currentSessionId && !state.forceCreateView;
      const net = D.calculateNet(session);
      const pot = Object.values(net).filter((value) => value > 0).reduce((a, b) => a + b, 0);
      const playing = D.activePlayers(session).length;
      return `<button data-session-id="${session.id}" class="session-item w-full rounded-3xl border p-4 text-left transition ${active ? 'border-felt bg-felt text-card' : 'border-felt/10 bg-white/55 hover:bg-white'}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-bold ${active ? 'text-card' : 'text-ink'}">${U.escapeHtml(session.name)}</p>
            <p class="mt-1 font-mono text-xs ${active ? 'text-card/60' : 'text-ink/50'}">${U.escapeHtml(session.roomCode)} · ${playing}/${session.players.length} đang chơi · ${session.rounds.length} ván</p>
          </div>
          <span class="rounded-full px-2 py-1 text-[10px] font-extrabold ${session.status === 'SETTLED' ? 'bg-mint text-felt' : active ? 'bg-card/15 text-card' : 'bg-felt/10 text-felt'}">${session.status === 'SETTLED' ? 'CHỐT' : 'MỞ'}</span>
        </div>
        <p class="mt-2 text-xs ${active ? 'text-card/65' : 'text-ink/55'}">Tổng cần thanh toán: ${U.money(pot)}</p>
      </button>`;
    }).join('');
  }

  function renderEmptyState(state) {
    $('emptyState').classList.remove('hidden');
    $('sessionView').classList.add('hidden');
    $('statPlayers').textContent = '0';
    $('statRounds').textContent = '0';
    $('statTransfers').textContent = '0';
    $('totalSessionBadge').textContent = state.data.sessions.length;
  }

  function renderSessionShell(session) {
    const net = D.calculateNet(session);
    const totalNet = Object.values(net).reduce((a, b) => a + b, 0);
    const totalPositive = Object.values(net).filter((value) => value > 0).reduce((a, b) => a + b, 0);
    const totalNegative = Object.values(net).filter((value) => value < 0).reduce((a, b) => a + Math.abs(b), 0);

    $('emptyState').classList.add('hidden');
    $('sessionView').classList.remove('hidden');
    $('statPlayers').textContent = `${D.activePlayers(session).length}/${session.players.length}`;
    $('statRounds').textContent = session.rounds.length;
    $('statTransfers').textContent = session.transactions.length;
    $('sessionTitle').textContent = session.name;
    $('sessionMeta').textContent = `Tạo lúc ${U.formatDate(session.createdAt)}${session.settledAt ? ' · chốt lúc ' + U.formatDate(session.settledAt) : ''}`;
    $('roomCode').textContent = 'Mã bàn ' + session.roomCode;
    $('statusBadge').textContent = session.status === 'SETTLED' ? 'Đã chốt sổ' : 'Đang mở';
    $('statusBadge').className = `rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[.15em] ${session.status === 'SETTLED' ? 'bg-mint text-felt' : 'bg-brass/20 text-felt'}`;
    $('cashRail').innerHTML = [
      ['Tổng người thắng', totalPositive, 'text-mint bg-felt'],
      ['Tổng người thua', totalNegative, 'text-clay bg-white'],
      ['Sai lệch NET', totalNet, totalNet === 0 ? 'text-felt bg-white' : 'text-clay bg-white']
    ].map(([label, value, cls]) => `<div class="rounded-3xl ${cls} p-4"><p class="text-xs font-bold uppercase tracking-wide opacity-65">${label}</p><p class="mt-1 font-mono text-xl font-extrabold">${label === 'Sai lệch NET' ? U.signedMoney(value) : U.money(value)}</p></div>`).join('');

    return { net, totalNet };
  }

  function renderPlayers(state, session, net) {
    $('playerCountBadge').textContent = `${D.activePlayers(session).length}/${session.players.length} đang chơi`;
    const editForm = $('editPlayerForm');
    const editing = state.editingPlayerId ? D.playerById(session, state.editingPlayerId) : null;
    editForm.classList.toggle('hidden', !editing);
    if (editing) {
      $('editPlayerTitle').textContent = `Sửa ${editing.displayName}`;
      $('editPlayerNameInput').value = editing.displayName || '';
      $('editPlayerBankInput').value = editing.bankId || '';
      $('editPlayerAccountInput').value = editing.accountNo || '';
      $('editPlayerAccountNameInput').value = editing.accountName || '';
    }

    const list = $('playersList');
    if (session.players.length === 0) {
      list.innerHTML = `<div class="rounded-3xl border border-dashed border-felt/20 p-4 text-sm text-ink/60">Thêm người chơi trước khi nhập ván.</div>`;
      return;
    }

    list.innerHTML = session.players.map((player, index) => {
      const amount = net[player.id] || 0;
      const tone = amount > 0 ? 'text-emerald-700 bg-emerald-50' : amount < 0 ? 'text-red-700 bg-red-50' : 'text-ink/65 bg-white';
      const bankReady = Boolean(player.bankId && player.accountNo);
      const canDelete = session.status === 'ACTIVE' && !D.playerHasRounds(session, player.id);
      return `<article class="rounded-3xl bg-white/70 p-4 ${player.isActive === false ? 'opacity-75' : ''}">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${player.isActive === false ? 'bg-ink/30' : 'bg-felt'} font-mono text-xs font-bold text-card">${index + 1}</span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-bold">${U.escapeHtml(player.displayName)}</p>
                <span class="rounded-full px-2 py-1 text-[10px] font-extrabold ${player.isActive === false ? 'bg-ink/10 text-ink/50' : 'bg-mint/20 text-felt'}">${player.isActive === false ? 'NGHỈ' : 'ĐANG CHƠI'}</span>
              </div>
              <p class="mt-1 text-xs text-ink/50">${bankReady ? `${U.escapeHtml(player.bankId)} · ${U.escapeHtml(player.accountNo)} · ${U.escapeHtml(player.accountName || player.displayName)}` : 'Chưa nhập tài khoản nhận QR'}</p>
            </div>
          </div>
          <span class="rounded-full px-3 py-1 font-mono text-xs font-extrabold ${tone}">${U.signedMoney(amount)}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button data-edit-player="${player.id}" class="rounded-full border border-felt/15 px-3 py-1.5 text-xs font-bold hover:bg-white">Sửa</button>
          <button data-toggle-player="${player.id}" class="${session.status === 'ACTIVE' ? '' : 'hidden'} rounded-full border border-felt/15 px-3 py-1.5 text-xs font-bold hover:bg-white">${player.isActive === false ? 'Cho chơi lại' : 'Nghỉ ngang'}</button>
          <button data-remove-player="${player.id}" class="${canDelete ? '' : 'hidden'} rounded-full px-3 py-1.5 text-xs font-bold text-clay hover:bg-clay/10">Xóa</button>
        </div>
      </article>`;
    }).join('');
  }

  function getRoundFormPlayers(state, session) {
    if (state.editingRoundId) {
      const round = session.rounds.find((item) => item.id === state.editingRoundId);
      if (!round) return [];
      return round.results.map((result) => D.playerById(session, result.playerId)).filter(Boolean);
    }
    return D.activePlayers(session);
  }

  function renderRoundForm(state, session) {
    const players = getRoundFormPlayers(state, session);
    const editingRound = state.editingRoundId ? session.rounds.find((round) => round.id === state.editingRoundId) : null;
    const draft = state.loadRoundDraft(session.id);

    $('roundFormTitle').textContent = editingRound ? `Sửa ván ${editingRound.roundNumber}` : 'Nhập ván mới';
    $('roundFormHint').textContent = editingRound ? 'Đang sửa lại ván cũ. Danh sách người chơi giữ theo thời điểm của ván đó.' : 'Chỉ người đang chơi mới hiện trong form ván mới. Ô cuối có thể tự cân bằng.';
    $('cancelEditRoundBtn').classList.toggle('hidden', !editingRound);
    $('saveRoundBtn').textContent = editingRound ? 'Lưu ván đã sửa' : 'Lưu ván';
    $('roundNoteInput').value = editingRound ? editingRound.notes || '' : draft.notes || '';

    if (players.length === 0) {
      $('roundInputs').innerHTML = `<div class="rounded-3xl border border-dashed border-felt/20 p-4 text-sm text-ink/60">Cần thêm ít nhất 2 người chơi đang hoạt động.</div>`;
      updateRoundSumBadge();
      return;
    }

    $('roundInputs').innerHTML = players.map((player) => {
      const existing = editingRound?.results.find((result) => result.playerId === player.id)?.amount;
      const value = editingRound ? existing ?? 0 : draft.amounts?.[player.id] ?? '';
      return `<label class="grid gap-2 rounded-[1.3rem] bg-white/65 p-3 sm:grid-cols-[1fr_220px] sm:items-center">
        <span class="font-bold">${U.escapeHtml(player.displayName)}</span>
        <input data-round-input data-player-id="${player.id}" inputmode="numeric" class="min-h-11 rounded-2xl border border-felt/15 bg-white px-4 text-right font-mono font-bold outline-none focus:border-felt focus:ring-4 focus:ring-mint/25" placeholder="+100000 hoặc -100000" value="${U.escapeHtml(value)}" />
      </label>`;
    }).join('');
    updateRoundSumBadge();
  }

  function updateRoundSumBadge() {
    const inputs = [...document.querySelectorAll('[data-round-input]')];
    const sum = inputs.reduce((total, input) => {
      const value = U.parseAmount(input.value);
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);
    const badge = $('roundSumBadge');
    badge.textContent = 'Tổng ' + U.signedMoney(sum);
    badge.className = `rounded-full px-3 py-1 font-mono text-xs font-extrabold ${sum === 0 ? 'bg-mint/20 text-felt' : 'bg-clay/10 text-clay'}`;
  }

  function renderNetResults(session, net, totalNet) {
    $('netCheckBadge').textContent = totalNet === 0 ? 'CÂN' : 'LỆCH';
    $('netCheckBadge').className = `rounded-full px-3 py-1 font-mono text-xs font-extrabold ${totalNet === 0 ? 'bg-mint/20 text-felt' : 'bg-clay/10 text-clay'}`;
    const sorted = [...session.players].sort((a, b) => (net[b.id] || 0) - (net[a.id] || 0));
    if (sorted.length === 0) {
      $('netResults').innerHTML = `<div class="rounded-3xl border border-dashed border-felt/20 p-4 text-sm text-ink/60">Chưa có người chơi.</div>`;
      return;
    }
    $('netResults').innerHTML = sorted.map((player) => {
      const amount = net[player.id] || 0;
      const barWidth = Math.min(100, Math.abs(amount) / Math.max(1, Math.max(...Object.values(net).map(Math.abs))) * 100);
      const color = amount > 0 ? 'bg-emerald-600' : amount < 0 ? 'bg-clay' : 'bg-ink/20';
      return `<div class="rounded-3xl bg-white/70 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-bold">${U.escapeHtml(player.displayName)}</p>
            <p class="text-xs text-ink/50">${player.isActive === false ? 'Đã nghỉ' : 'Đang chơi'}</p>
          </div>
          <p class="font-mono text-sm font-extrabold ${amount > 0 ? 'text-emerald-700' : amount < 0 ? 'text-clay' : 'text-ink/60'}">${U.signedMoney(amount)}</p>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-felt/10"><div class="h-full ${color}" style="width:${barWidth}%"></div></div>
      </div>`;
    }).join('');
  }

  function renderActionHints(session) {
    const hints = [];
    if (session.players.length < 2) hints.push(['Thêm người chơi', 'Cần ít nhất 2 người để nhập ván và chốt sổ.', 'players']);
    if (D.activePlayers(session).length >= 2 && session.status === 'ACTIVE') hints.push(['Nhập ván mới', 'Ghi số dương cho người thắng, số âm cho người thua.', 'rounds']);
    if (session.rounds.length > 0 && session.status === 'ACTIVE') hints.push(['Chốt sổ', 'Tạo danh sách chuyển khoản tối ưu và QR nếu đã nhập tài khoản.', 'settlement']);
    if (session.status === 'SETTLED') hints.push(['Phiên đã chốt', 'Có thể in kết quả hoặc mở lại phiên để sửa dữ liệu.', 'settlement']);
    $('actionHints').innerHTML = hints.map(([title, text, screen]) => `<button data-jump-screen="${screen}" class="w-full rounded-3xl bg-white/70 p-4 text-left hover:bg-white">
      <p class="font-bold">${title}</p><p class="mt-1 text-sm text-ink/60">${text}</p>
    </button>`).join('') || `<div class="rounded-3xl bg-white/70 p-4 text-sm text-ink/60">Dữ liệu đã sẵn sàng. Có thể kiểm tra lại các ván hoặc chốt sổ.</div>`;
  }

  function renderRounds(session) {
    const wrap = $('roundsList');
    if (session.rounds.length === 0) {
      wrap.innerHTML = `<div class="rounded-3xl border border-dashed border-felt/20 p-4 text-sm text-ink/60">Chưa có ván nào. Nhập ván đầu tiên ở form phía trên.</div>`;
      return;
    }

    wrap.innerHTML = session.rounds.map((round) => {
      const sum = round.results.reduce((total, item) => total + item.amount, 0);
      const rows = round.results.map((result) => {
        const player = D.playerById(session, result.playerId);
        return `<div class="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2">
          <span class="font-semibold">${U.escapeHtml(player?.displayName || 'Người chơi đã xóa')}</span>
          <span class="font-mono text-sm font-extrabold ${result.amount > 0 ? 'text-emerald-700' : result.amount < 0 ? 'text-clay' : 'text-ink/60'}">${U.signedMoney(result.amount)}</span>
        </div>`;
      }).join('');
      return `<article class="rounded-3xl bg-white/55 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-bold">Ván ${round.roundNumber}</p>
            <p class="text-xs text-ink/50">${U.formatDate(round.createdAt)}${round.notes ? ' · ' + U.escapeHtml(round.notes) : ''}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="shrink-0 rounded-full ${sum === 0 ? 'bg-felt/10 text-felt' : 'bg-clay/10 text-clay'} px-3 py-1 font-mono text-xs font-bold">sum ${U.signedMoney(sum)}</span>
            <button data-edit-round="${round.id}" class="${session.status === 'ACTIVE' ? '' : 'hidden'} rounded-full border border-felt/15 px-3 py-1 text-xs font-bold hover:bg-white">Sửa</button>
            <button data-delete-round="${round.id}" class="${session.status === 'ACTIVE' ? '' : 'hidden'} rounded-full px-3 py-1 text-xs font-bold text-clay hover:bg-clay/10">Xóa</button>
          </div>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">${rows}</div>
      </article>`;
    }).join('');
  }

  function renderSettlement(session) {
    const wrap = $('settlementResults');
    if (session.status !== 'SETTLED') {
      wrap.innerHTML = `<div class="rounded-3xl border border-dashed border-felt/20 p-5 text-sm text-ink/60">Bấm “Chốt sổ” để tạo danh sách chuyển khoản. Bạn vẫn có thể sửa người chơi hoặc sửa ván trước khi chốt.</div>`;
      return;
    }
    if (session.transactions.length === 0) {
      wrap.innerHTML = `<div class="rounded-3xl bg-mint/15 p-5 text-sm font-semibold text-felt">Mọi người đang cân bằng, không cần chuyển khoản.</div>
      <button data-reopen-session class="w-fit rounded-2xl border border-felt/15 px-4 py-2 text-sm font-bold hover:bg-white">Mở lại phiên để sửa</button>`;
      return;
    }
    wrap.innerHTML = session.transactions.map((tx, index) => {
      const payer = D.playerById(session, tx.fromPlayerId);
      const payee = D.playerById(session, tx.toPlayerId);
      const qrUrl = D.buildVietQrUrl(session, tx);
      return `<article class="rounded-[1.8rem] bg-white/70 p-4">
        <div class="grid gap-4 md:grid-cols-[1fr_180px] md:items-center">
          <div>
            <p class="font-mono text-xs font-bold uppercase tracking-[.18em] text-clay">Lệnh ${index + 1}</p>
            <h4 class="mt-1 text-xl font-extrabold">${U.escapeHtml(payer?.displayName || 'Người trả')} → ${U.escapeHtml(payee?.displayName || 'Người nhận')}</h4>
            <p class="mt-2 font-mono text-2xl font-extrabold text-felt">${U.money(tx.amount)}</p>
            <p class="mt-2 text-sm text-ink/55">${qrUrl ? `${U.escapeHtml(payee.bankId)} · ${U.escapeHtml(payee.accountNo)} · ${U.escapeHtml(payee.accountName || payee.displayName)}` : 'Người nhận chưa đủ thông tin để hiện QR.'}</p>
          </div>
          <div class="flex justify-center">
            ${qrUrl ? `<a href="${qrUrl}" target="_blank" rel="noreferrer" class="block rounded-3xl bg-white p-3 shadow-sm"><img class="h-40 w-40 object-contain" alt="QR chuyển khoản cho ${U.escapeHtml(payee?.displayName || 'người nhận')}" src="${qrUrl}" /></a>` : `<div class="flex h-40 w-40 items-center justify-center rounded-3xl border border-dashed border-felt/20 p-4 text-center text-xs text-ink/50">Nhập mã ngân hàng và số tài khoản của người nhận để hiện QR</div>`}
          </div>
        </div>
      </article>`;
    }).join('') + `<button data-reopen-session class="w-fit rounded-2xl border border-felt/15 px-4 py-2 text-sm font-bold hover:bg-white">Mở lại phiên để sửa</button>`;
  }

  function render(state, session) {
    $('totalSessionBadge').textContent = state.data.sessions.length;
    renderBankOptions();
    renderSessionList(state);
    if (!session) {
      renderEmptyState(state);
      return;
    }
    const { net, totalNet } = renderSessionShell(session);
    renderTabs(state);
    renderPlayers(state, session, net);
    renderRoundForm(state, session);
    renderNetResults(session, net, totalNet);
    renderActionHints(session);
    renderRounds(session);
    renderSettlement(session);
  }

  window.QSUI = {
    render,
    updateRoundSumBadge,
    getRoundFormPlayers
  };
})();
