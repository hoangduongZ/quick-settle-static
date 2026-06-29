(function () {
  'use strict';

  const MAX_AMOUNT = 1_000_000_000;
  const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const BANKS = [
    ['MBBank', 'MBBank / MB Bank'], ['VCB', 'Vietcombank'], ['TCB', 'Techcombank'], ['ACB', 'ACB'],
    ['BIDV', 'BIDV'], ['Vietinbank', 'VietinBank'], ['VPB', 'VPBank'], ['TPB', 'TPBank'],
    ['VIB', 'VIB'], ['MSB', 'MSB'], ['OCB', 'OCB'], ['STB', 'Sacombank'], ['HDB', 'HDBank'],
    ['EIB', 'Eximbank'], ['SHB', 'SHB'], ['SEAB', 'SeABank'], ['LPB', 'LPBank'], ['BAB', 'Bac A Bank'],
    ['970422', 'MBBank BIN 970422'], ['970436', 'Vietcombank BIN 970436'], ['970407', 'Techcombank BIN 970407'],
    ['970416', 'ACB BIN 970416'], ['970418', 'BIDV BIN 970418'], ['970415', 'VietinBank BIN 970415']
  ];

  function nowIso() { return new Date().toISOString(); }

  function uid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function parseAmount(value) {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/[₫đ,\s]/gi, '');
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return NaN;
    return Math.trunc(parsed);
  }

  function money(amount) {
    const abs = Math.abs(Number(amount || 0));
    return new Intl.NumberFormat('vi-VN').format(abs) + ' ₫';
  }

  function signedMoney(amount) {
    if (amount > 0) return '+' + money(amount);
    if (amount < 0) return '-' + money(amount);
    return '0 ₫';
  }

  function formatDate(iso) {
    try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); }
    catch (_) { return iso || ''; }
  }

  function clampText(text, max) { return String(text || '').trim().slice(0, max); }
  function normalizeAccountNo(value) { return String(value || '').trim().replace(/\s+/g, '').slice(0, 30); }
  function normalizeBank(value) { return String(value || '').trim().replace(/\s+/g, '').slice(0, 20); }

  function stripVietnamese(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  function normalizeQrInfo(value) {
    return stripVietnamese(value).replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50) || 'Quick Settle';
  }

  function normalizeData(data) {
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    return {
      version: 3,
      sessions: sessions.map((session) => ({
        id: session.id || uid(),
        name: session.name || 'Phiên chốt khoản',
        roomCode: session.roomCode || 'ROOM01',
        status: session.status === 'SETTLED' ? 'SETTLED' : 'ACTIVE',
        createdAt: session.createdAt || nowIso(),
        settledAt: session.settledAt || null,
        players: Array.isArray(session.players) ? session.players.map((player) => ({
          id: player.id || uid(),
          displayName: player.displayName || player.name || 'Thành viên',
          createdAt: player.createdAt || nowIso(),
          isActive: player.isActive !== false,
          bankId: player.bankId || '',
          accountNo: player.accountNo || '',
          accountName: player.accountName || player.displayName || player.name || ''
        })) : [],
        rounds: Array.isArray(session.rounds) ? session.rounds.map((round, index) => ({
          id: round.id || uid(),
          roundNumber: index + 1,
          notes: round.notes || '',
          createdAt: round.createdAt || nowIso(),
          results: Array.isArray(round.results) ? round.results.map((result) => ({ playerId: result.playerId, amount: Number(result.amount || 0) })) : []
        })) : [],
        transactions: Array.isArray(session.transactions) ? session.transactions.map((tx) => ({
          id: tx.id || uid(),
          fromPlayerId: tx.fromPlayerId,
          toPlayerId: tx.toPlayerId,
          amount: Number(tx.amount || 0),
          createdAt: tx.createdAt || nowIso()
        })) : []
      }))
    };
  }

  function playerById(session, id) { return session?.players.find((player) => player.id === id) || null; }
  function activePlayers(session) { return (session?.players || []).filter((player) => player.isActive !== false); }
  function playerHasRounds(session, playerId) { return (session?.rounds || []).some((round) => round.results.some((result) => result.playerId === playerId)); }

  function resetSettlement(session) {
    session.transactions = [];
    if (session.status === 'SETTLED') {
      session.status = 'ACTIVE';
      session.settledAt = null;
    }
  }

  function createRoomCode(data) {
    for (let tries = 0; tries < 20; tries++) {
      let code = '';
      for (let i = 0; i < 6; i++) code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
      if (!data.sessions.some((session) => session.roomCode === code)) return code;
    }
    return 'ROOM' + Math.floor(Math.random() * 100).toString().padStart(2, '0');
  }

  function createSession(data, name) {
    const safeName = clampText(name || 'Phiên mới', 60);
    if (!safeName) throw new Error('Tên phiên không được để trống');
    const session = {
      id: uid(),
      name: safeName,
      roomCode: createRoomCode(data),
      status: 'ACTIVE',
      createdAt: nowIso(),
      settledAt: null,
      players: [],
      rounds: [],
      transactions: []
    };
    data.sessions.unshift(session);
    return session;
  }

  function addPlayer(session, payload) {
    if (!session) throw new Error('Không tìm thấy phiên');
    if (session.status !== 'ACTIVE') throw new Error('Phiên đã chốt khoản. Hãy mở lại phiên trước khi thêm thành viên.');
    const name = clampText(payload.displayName, 30);
    if (!name) throw new Error('Tên thành viên không được để trống');
    if (session.players.some((player) => player.displayName.toLowerCase() === name.toLowerCase())) throw new Error(`Tên thành viên "${name}" đã tồn tại`);
    session.players.push({
      id: uid(),
      displayName: name,
      createdAt: nowIso(),
      isActive: true,
      bankId: normalizeBank(payload.bankId),
      accountNo: normalizeAccountNo(payload.accountNo),
      accountName: clampText(payload.accountName || name, 80)
    });
  }

  function updatePlayer(session, playerId, payload) {
    if (!session) throw new Error('Không tìm thấy phiên');
    const player = playerById(session, playerId);
    if (!player) throw new Error('Không tìm thấy thành viên');
    const name = clampText(payload.displayName, 30);
    if (!name) throw new Error('Tên thành viên không được để trống');
    if (session.players.some((item) => item.id !== playerId && item.displayName.toLowerCase() === name.toLowerCase())) throw new Error(`Tên thành viên "${name}" đã tồn tại`);
    player.displayName = name;
    player.bankId = normalizeBank(payload.bankId);
    player.accountNo = normalizeAccountNo(payload.accountNo);
    player.accountName = clampText(payload.accountName || name, 80);
  }

  function togglePlayerActive(session, playerId) {
    if (!session) throw new Error('Không tìm thấy phiên');
    if (session.status !== 'ACTIVE') throw new Error('Phiên đã chốt khoản. Hãy mở lại phiên trước khi đổi trạng thái tham gia.');
    const player = playerById(session, playerId);
    if (!player) throw new Error('Không tìm thấy thành viên');
    player.isActive = player.isActive === false;
  }

  function removePlayer(session, playerId) {
    if (!session) throw new Error('Không tìm thấy phiên');
    if (session.status !== 'ACTIVE') throw new Error('Phiên đã chốt khoản. Hãy mở lại phiên trước khi xóa thành viên.');
    if (playerHasRounds(session, playerId)) throw new Error('Thành viên đã có dữ liệu lượt ghi nhận. Hãy dùng “Ngừng tham gia” thay vì xóa để giữ lịch sử.');
    session.players = session.players.filter((player) => player.id !== playerId);
  }

  function validateRoundAmounts(players, amountsByPlayer) {
    if (players.length < 2) throw new Error('Cần ít nhất 2 thành viên để lưu lượt');
    const results = players.map((player) => {
      const amount = parseAmount(amountsByPlayer[player.id]);
      if (Number.isNaN(amount)) throw new Error(`Số tiền của ${player.displayName} không hợp lệ`);
      if (amount < -MAX_AMOUNT || amount > MAX_AMOUNT) throw new Error('Số tiền vượt quá giới hạn cho phép (±1,000,000,000)');
      return { playerId: player.id, amount };
    });
    const sum = results.reduce((total, item) => total + item.amount, 0);
    if (sum !== 0) throw new Error(`Tổng các khoản phải bằng 0, hiện tại: ${signedMoney(sum)}`);
    return results;
  }

  function addRound(session, amountsByPlayer, notes, playerScope) {
    if (!session || session.status !== 'ACTIVE') throw new Error('Không thể thêm lượt: phiên đã chốt khoản');
    const results = validateRoundAmounts(playerScope || activePlayers(session), amountsByPlayer);
    session.rounds.push({ id: uid(), roundNumber: session.rounds.length + 1, notes: clampText(notes, 120), createdAt: nowIso(), results });
    resetSettlement(session);
  }

  function updateRound(session, roundId, amountsByPlayer, notes) {
    if (!session || session.status !== 'ACTIVE') throw new Error('Không thể sửa lượt: phiên đã chốt khoản');
    const round = session.rounds.find((item) => item.id === roundId);
    if (!round) throw new Error('Không tìm thấy lượt cần sửa');
    const players = round.results.map((result) => playerById(session, result.playerId)).filter(Boolean);
    round.results = validateRoundAmounts(players, amountsByPlayer);
    round.notes = clampText(notes, 120);
    resetSettlement(session);
  }

  function deleteRound(session, roundId) {
    if (!session || session.status !== 'ACTIVE') throw new Error('Phiên đã chốt khoản. Hãy mở lại phiên trước khi xóa lượt.');
    const round = session.rounds.find((item) => item.id === roundId);
    if (!round) throw new Error('Không tìm thấy lượt cần xóa');
    session.rounds = session.rounds.filter((item) => item.id !== roundId);
    session.rounds.forEach((item, index) => { item.roundNumber = index + 1; });
    resetSettlement(session);
  }

  function undoLastRound(session) {
    if (!session || session.rounds.length === 0) throw new Error('Chưa có lượt để hoàn tác');
    if (session.status !== 'ACTIVE') throw new Error('Phiên đã chốt khoản. Hãy mở lại phiên trước khi hoàn tác.');
    session.rounds.pop();
    session.rounds.forEach((round, index) => { round.roundNumber = index + 1; });
    resetSettlement(session);
  }

  function reopenSession(session) {
    session.status = 'ACTIVE';
    session.settledAt = null;
    session.transactions = [];
  }

  function calculateNet(session) {
    const net = Object.fromEntries((session?.players || []).map((player) => [player.id, 0]));
    for (const round of session?.rounds || []) {
      for (const result of round.results) net[result.playerId] = (net[result.playerId] || 0) + Number(result.amount || 0);
    }
    return net;
  }

  function settleSession(session) {
    if (!session) throw new Error('Không tìm thấy phiên');
    if (session.players.length < 2) throw new Error('Cần ít nhất 2 thành viên để chốt khoản');
    if (session.rounds.length < 1) throw new Error('Cần ít nhất 1 lượt ghi nhận để chốt khoản');
    const net = calculateNet(session);
    const total = Object.values(net).reduce((sum, value) => sum + value, 0);
    if (total !== 0) throw new Error(`Dữ liệu không hợp lệ: tổng số dư không bằng 0 (${signedMoney(total)})`);

    const debtors = [];
    const creditors = [];
    for (const [playerId, amount] of Object.entries(net)) {
      if (amount < 0) debtors.push({ playerId, balance: amount });
      if (amount > 0) creditors.push({ playerId, balance: amount });
    }
    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const transactions = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(-debtor.balance, creditor.balance);
      transactions.push({ id: uid(), fromPlayerId: debtor.playerId, toPlayerId: creditor.playerId, amount, createdAt: nowIso() });
      debtor.balance += amount;
      creditor.balance -= amount;
      if (debtor.balance === 0) i += 1;
      if (creditor.balance === 0) j += 1;
    }

    session.transactions = transactions;
    session.status = 'SETTLED';
    session.settledAt = nowIso();
  }

  function buildVietQrUrl(session, tx) {
    const payee = playerById(session, tx.toPlayerId);
    if (!payee || !payee.bankId || !payee.accountNo) return '';
    const bank = encodeURIComponent(normalizeBank(payee.bankId));
    const accountNo = encodeURIComponent(normalizeAccountNo(payee.accountNo));
    const amount = Math.max(1, Math.trunc(Math.abs(tx.amount || 0)));
    const addInfo = encodeURIComponent(normalizeQrInfo(`QuickSettle ${session.roomCode}`));
    const accountName = encodeURIComponent(clampText(stripVietnamese(payee.accountName || payee.displayName), 80));
    return `https://img.vietqr.io/image/${bank}-${accountNo}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
  }

  function createSampleSession(data) {
    const session = createSession(data, 'Du lịch cuối tuần');
    const samplePlayers = [
      { displayName: 'Hoàng', bankId: 'MBBank', accountNo: '0123456789', accountName: 'DUONG VIET HOANG' },
      { displayName: 'Tuấn', bankId: 'VCB', accountNo: '0987654321', accountName: 'NGUYEN VAN TUAN' },
      { displayName: 'Linh', bankId: 'TCB', accountNo: '', accountName: 'TRAN LINH' },
      { displayName: 'Minh', bankId: 'ACB', accountNo: '', accountName: 'LE MINH' }
    ];
    samplePlayers.forEach((player) => addPlayer(session, player));
    addRound(session, Object.fromEntries([[session.players[0].id, 120000], [session.players[1].id, -50000], [session.players[2].id, -70000], [session.players[3].id, 0]]), 'Tiền taxi sân bay');
    addRound(session, Object.fromEntries([[session.players[0].id, -30000], [session.players[1].id, 90000], [session.players[2].id, -20000], [session.players[3].id, -40000]]), 'Bữa tối nhóm');
    session.players[3].isActive = false;
    return session;
  }

  window.QSUtils = {
    nowIso,
    escapeHtml,
    parseAmount,
    money,
    signedMoney,
    formatDate,
    clampText
  };

  window.QSDomain = {
    BANKS,
    normalizeData,
    playerById,
    activePlayers,
    playerHasRounds,
    createSession,
    addPlayer,
    updatePlayer,
    togglePlayerActive,
    removePlayer,
    addRound,
    updateRound,
    deleteRound,
    undoLastRound,
    reopenSession,
    calculateNet,
    settleSession,
    buildVietQrUrl,
    createSampleSession
  };
})();
