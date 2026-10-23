/**
 * Tic-Tac-Toe • Neon Edition
 * Features:
 * - 2 Players & AI Modes (Easy, Medium, Unbeatable Minimax)
 * - Synthesized Web Audio API sound effects
 * - Native Canvas Confetti Animation
 * - Responsive UI & Accessible Keyboard Navigation
 */

(() => {
  'use strict';

  // --- Winning Combinations & Strike Line Classes ---
  const WINNING_COMBOS = [
    { combo: [0, 1, 2], className: 'strike-row-0' },
    { combo: [3, 4, 5], className: 'strike-row-1' },
    { combo: [6, 7, 8], className: 'strike-row-2' },
    { combo: [0, 3, 6], className: 'strike-col-0' },
    { combo: [1, 4, 7], className: 'strike-col-1' },
    { combo: [2, 5, 8], className: 'strike-col-2' },
    { combo: [0, 4, 8], className: 'strike-diag-0' },
    { combo: [2, 4, 6], className: 'strike-diag-1' },
  ];

  // --- State Variables ---
  let board = Array(9).fill(null);
  let currentPlayer = 'X';
  let gameActive = true;
  let gameMode = 'pvp'; // 'pvp' | 'pve'
  let aiDifficulty = 'hard'; // 'easy' | 'medium' | 'hard'
  let isAiThinking = false;
  let aiTimeoutId = null;      // so a pending AI move can be cancelled
  let startingPlayer = 'X';    // alternates every round
  let booting = true;          // silences sound while restoring saved state
  const STORAGE_KEY = 'tictactoe-neon-v1';
  const HISTORY_STORAGE_KEY = 'tictactoe-history-v1';
  let matchHistory = [];
  let soundEnabled = true;

  const scores = {
    X: 0,
    O: 0,
    ties: 0,
  };

  // --- DOM Elements ---
  const boardElement = document.getElementById('board');
  const cells = Array.from(document.querySelectorAll('.cell'));
  const strikeLine = document.getElementById('strikeLine');
  const turnBadge = document.getElementById('turnBadge');
  const turnMark = document.getElementById('turnMark');
  const turnText = document.getElementById('turnText');

  const modePvpBtn = document.getElementById('modePvp');
  const modePveBtn = document.getElementById('modePve');
  const difficultyWrapper = document.getElementById('difficultyWrapper');
  const difficultySelect = document.getElementById('difficultySelect');

  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreTiesEl = document.getElementById('scoreTies');
  const labelPlayerO = document.getElementById('labelPlayerO');
  const labelPlayerX = document.getElementById('labelPlayerX');

  const newRoundBtn = document.getElementById('newRoundBtn');
  const resetScoreBtn = document.getElementById('resetScoreBtn');
  const soundToggleBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const historyModal = document.getElementById('historyModal');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const statX = document.getElementById('statX');
  const statO = document.getElementById('statO');
  const statTies = document.getElementById('statTies');

  const resultModal = document.getElementById('resultModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const resultIcon = document.getElementById('resultIcon');
  const modalPlayAgainBtn = document.getElementById('modalPlayAgainBtn');
  const modalViewHistoryBtn = document.getElementById('modalViewHistoryBtn');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // --- Web Audio API Synthesizer ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, gainStart = 0.15) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainStart, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context error fallback
    }
  }

  function playSound(type) {
    if (booting) return;
    initAudio();
    if (!soundEnabled || !audioCtx) return;

    const now = audioCtx.currentTime;

    if (type === 'move-X') {
      // Crisp neon cyan ping (higher pitch)
      playTone(587.33, 'sine', 0.12, 0.18); // D5
    } else if (type === 'move-O') {
      // Warm neon coral pulse (lower pitch)
      playTone(370.0, 'sine', 0.15, 0.18); // F#4
    } else if (type === 'win') {
      // Cheerful ascending major triad
      setTimeout(() => playTone(523.25, 'triangle', 0.15, 0.2), 0); // C5
      setTimeout(() => playTone(659.25, 'triangle', 0.15, 0.2), 110); // E5
      setTimeout(() => playTone(783.99, 'triangle', 0.18, 0.2), 220); // G5
      setTimeout(() => playTone(1046.5, 'sine', 0.35, 0.25), 330); // C6
    } else if (type === 'tie') {
      // Muted descending tone
      setTimeout(() => playTone(440.0, 'sine', 0.18, 0.15), 0);
      setTimeout(() => playTone(392.0, 'sine', 0.25, 0.15), 130);
    } else if (type === 'click') {
      playTone(800, 'sine', 0.05, 0.08);
    }
  }

  // --- Confetti Engine ---
  let confettiAnimationId = null;
  const particles = [];
  const confettiColors = ['#00f2fe', '#4facfe', '#ff3366', '#ff758c', '#f59e0b', '#ffffff', '#a855f7'];

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfettiCanvas);
  resizeConfettiCanvas();

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = confettiCanvas.width / 2 + (Math.random() * 200 - 100);
      this.y = confettiCanvas.height / 2 + (Math.random() * 100 - 50);
      const angle = Math.random() * Math.PI * 2;
      const velocity = 8 + Math.random() * 12;
      this.vx = Math.cos(angle) * velocity;
      this.vy = Math.sin(angle) * velocity - 4;
      this.gravity = 0.35;
      this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      this.size = 6 + Math.random() * 6;
      this.alpha = 1;
      this.decay = 0.012 + Math.random() * 0.015;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.98;
      this.alpha -= this.decay;
      this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.7);
      ctx.restore();
    }
  }

  function launchConfetti(count = 90) {
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
    }
    particles.length = 0;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }

    const ctx = confettiCanvas.getContext('2d');

    function animateConfetti() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let activeCount = 0;

      for (const p of particles) {
        p.update();
        p.draw(ctx);
        if (p.alpha > 0) activeCount++;
      }

      if (activeCount > 0) {
        confettiAnimationId = requestAnimationFrame(animateConfetti);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiAnimationId = null;
      }
    }

    animateConfetti();
  }

  // --- Game Flow & Board Logic ---

  function updateTurnUI() {
    boardElement.classList.remove('turn-x', 'turn-o');
    turnBadge.classList.remove('turn-x', 'turn-o');

    if (!gameActive) {
      turnMark.textContent = '—';
      turnText.textContent = 'Game Over';
      return;
    }

    const turnClass = currentPlayer === 'X' ? 'turn-x' : 'turn-o';
    boardElement.classList.add(turnClass);
    turnBadge.classList.add(turnClass);
    turnMark.textContent = currentPlayer;

    if (gameMode === 'pve') {
      if (currentPlayer === 'X') {
        turnText.textContent = "Your Turn (X)";
      } else {
        turnText.textContent = "AI is thinking...";
      }
    } else {
      turnText.textContent = `Player ${currentPlayer}'s Turn`;
    }
  }

  function checkWin(currentBoard = board) {
    for (const item of WINNING_COMBOS) {
      const [a, b, c] = item.combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return {
          winner: currentBoard[a],
          combo: item.combo,
          className: item.className,
        };
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return { winner: 'tie', combo: null, className: null };
    }
    return null;
  }

  function handleCellClick(e) {
    const cell = e.currentTarget;
    const index = parseInt(cell.dataset.index, 10);

    // Guard conditions
    if (!gameActive || board[index] !== null || isAiThinking) return;

    makeMove(index, currentPlayer);

    if (gameActive && gameMode === 'pve' && currentPlayer === 'O') {
      triggerAiMove();
    }
  }

  function makeMove(index, player) {
    board[index] = player;

    const cell = cells[index];
    cell.textContent = player;
    cell.classList.add('taken', player.toLowerCase());
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, Column ${(index % 3) + 1}, marked by ${player}`);

    playSound(`move-${player}`);

    const result = checkWin();
    if (result) {
      endGame(result);
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      updateTurnUI();
    }
  }

  function endGame(result) {
    gameActive = false;
    startingPlayer = startingPlayer === 'X' ? 'O' : 'X'; // other player starts next round
    updateTurnUI();
    recordMatch(result);

    if (result.winner === 'tie') {
      scores.ties++;
      scoreTiesEl.textContent = scores.ties;
      saveState();
      playSound('tie');
      showModal({
        icon: '🤝',
        title: "It's a Draw!",
        subtitle: "A perfectly matched duel.",
      });
    } else {
      const winner = result.winner;
      scores[winner]++;
      if (winner === 'X') scoreXEl.textContent = scores.X;
      if (winner === 'O') scoreOEl.textContent = scores.O;
      saveState();

      // Highlight winning cells
      result.combo.forEach(idx => {
        cells[idx].classList.add('winner');
      });

      // Show striking line
      strikeLine.className = 'strike-line visible';
      strikeLine.classList.add(winner.toLowerCase() + '-win', result.className);

      playSound('win');
      launchConfetti();

      const isPlayerWinner = gameMode === 'pve' ? (winner === 'X' ? 'You Win!' : 'AI Wins!') : `Player ${winner} Wins!`;
      const subtitle = gameMode === 'pve'
        ? (winner === 'X' ? 'Incredible strategy! You beat the machine.' : 'The algorithm proved superior this round.')
        : `Congratulations to Player ${winner}!`;

      setTimeout(() => {
        showModal({
          icon: winner === 'X' ? '⚡' : '👑',
          title: isPlayerWinner,
          subtitle: subtitle,
        });
      }, 450);
    }
  }

  function showModal({ icon, title, subtitle }) {
    resultIcon.textContent = icon;
    modalTitle.textContent = title;
    modalSubtitle.textContent = subtitle;
    if (typeof resultModal.showModal === 'function') {
      resultModal.showModal();
    } else {
      resultModal.setAttribute('open', 'true');
    }
  }

  function closeModal() {
    if (typeof resultModal.close === 'function') {
      resultModal.close();
    } else {
      resultModal.removeAttribute('open');
    }
  }

  function resetRound() {
    closeModal();
    clearTimeout(aiTimeoutId);   // cancel any pending AI move from the old round
    aiTimeoutId = null;
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    confettiCanvas.getContext('2d').clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    board = Array(9).fill(null);
    gameActive = true;
    currentPlayer = startingPlayer;
    isAiThinking = false;

    // Clear board visuals
    cells.forEach((cell, idx) => {
      cell.textContent = '';
      cell.className = 'cell';
      cell.setAttribute('aria-label', `Row ${Math.floor(idx / 3) + 1}, Column ${(idx % 3) + 1}`);
    });

    strikeLine.className = 'strike-line';
    updateTurnUI();
    playSound('click');

    // If it's the AI's turn to open the round, let it play
    if (gameMode === 'pve' && currentPlayer === 'O') triggerAiMove();
  }

  function resetScores() {
    scores.X = 0;
    scores.O = 0;
    scores.ties = 0;
    startingPlayer = 'X';
    saveState();
    scoreXEl.textContent = '0';
    scoreOEl.textContent = '0';
    scoreTiesEl.textContent = '0';
    resetRound();
  }

  // --- AI Logic (Easy, Medium, Minimax Unbeatable) ---

  function triggerAiMove() {
    isAiThinking = true;
    updateTurnUI();

    // Natural human-like pause before AI makes move
    const delay = 320 + Math.random() * 150;
    aiTimeoutId = setTimeout(() => {
      aiTimeoutId = null;
      if (!gameActive || currentPlayer !== 'O') {
        isAiThinking = false;
        return;
      }

      let bestIndex;
      if (aiDifficulty === 'easy') {
        bestIndex = getEasyAiMove();
      } else if (aiDifficulty === 'medium') {
        bestIndex = getMediumAiMove();
      } else {
        bestIndex = getBestMoveMinimax(board, 'O');
      }

      isAiThinking = false;
      if (bestIndex !== undefined && bestIndex !== null && board[bestIndex] === null) {
        makeMove(bestIndex, 'O');
      }
    }, delay);
  }

  function getAvailableIndices(tempBoard) {
    const available = [];
    for (let i = 0; i < tempBoard.length; i++) {
      if (tempBoard[i] === null) available.push(i);
    }
    return available;
  }

  // Easy AI: purely random valid move
  function getEasyAiMove() {
    const available = getAvailableIndices(board);
    if (available.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }

  // Medium AI: Win if possible, block opponent if needed, otherwise random/center
  function getMediumAiMove() {
    const available = getAvailableIndices(board);
    if (available.length === 0) return null;

    // 1. Can AI win right now?
    for (const index of available) {
      const testBoard = [...board];
      testBoard[index] = 'O';
      const outcome = checkWin(testBoard);
      if (outcome && outcome.winner === 'O') return index;
    }

    // 2. Can player X win on next turn? Block them!
    for (const index of available) {
      const testBoard = [...board];
      testBoard[index] = 'X';
      const outcome = checkWin(testBoard);
      if (outcome && outcome.winner === 'X') return index;
    }

    // 3. Take center if available
    if (board[4] === null && Math.random() > 0.3) {
      return 4;
    }

    // 4. Otherwise pick random
    return available[Math.floor(Math.random() * available.length)];
  }

  // Hard AI: Unbeatable Minimax Algorithm
  function getBestMoveMinimax(currentBoard, aiPlayer) {
    const humanPlayer = aiPlayer === 'O' ? 'X' : 'O';

    function minimax(tempBoard, depth, isMaximizing) {
      const outcome = checkWin(tempBoard);
      if (outcome) {
        if (outcome.winner === aiPlayer) return 10 - depth;
        if (outcome.winner === humanPlayer) return depth - 10;
        if (outcome.winner === 'tie') return 0;
      }

      const availableMoves = getAvailableIndices(tempBoard);

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of availableMoves) {
          tempBoard[move] = aiPlayer;
          const score = minimax(tempBoard, depth + 1, false);
          tempBoard[move] = null;
          maxEval = Math.max(maxEval, score);
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of availableMoves) {
          tempBoard[move] = humanPlayer;
          const score = minimax(tempBoard, depth + 1, true);
          tempBoard[move] = null;
          minEval = Math.min(minEval, score);
        }
        return minEval;
      }
    }

    const available = getAvailableIndices(currentBoard);
    let bestScore = -Infinity;
    let bestMove = available[0];

    for (const move of available) {
      currentBoard[move] = aiPlayer;
      const score = minimax(currentBoard, 0, false);
      currentBoard[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // --- Mode & Setting Handlers ---

  function setGameMode(mode) {
    if (gameMode === mode) return;
    gameMode = mode;

    if (mode === 'pvp') {
      modePvpBtn.classList.add('active');
      modePvpBtn.setAttribute('aria-checked', 'true');
      modePveBtn.classList.remove('active');
      modePveBtn.setAttribute('aria-checked', 'false');
      difficultyWrapper.classList.add('hidden');
      labelPlayerO.textContent = 'PLAYER O';
      labelPlayerX.textContent = 'PLAYER X';
    } else {
      modePveBtn.classList.add('active');
      modePveBtn.setAttribute('aria-checked', 'true');
      modePvpBtn.classList.remove('active');
      modePvpBtn.setAttribute('aria-checked', 'false');
      difficultyWrapper.classList.remove('hidden');
      labelPlayerO.textContent = 'COMPUTER (O)';
      labelPlayerX.textContent = 'YOU (X)';
    }

    resetScores();
  }

  // --- Keyboard Grid Navigation ---

  function handleKeyboardNav(e) {
    const activeElement = document.activeElement;
    if (!activeElement || !activeElement.classList.contains('cell')) {
      // Global shortcut: R restarts the round
      if (e.key === 'r' || e.key === 'R') {
        resetRound();
      }
      return;
    }

    const currentIndex = parseInt(activeElement.dataset.index, 10);
    let targetIndex = null;

    switch (e.key) {
      case 'ArrowUp':
        targetIndex = currentIndex - 3 >= 0 ? currentIndex - 3 : currentIndex + 6;
        break;
      case 'ArrowDown':
        targetIndex = currentIndex + 3 < 9 ? currentIndex + 3 : currentIndex - 6;
        break;
      case 'ArrowLeft':
        targetIndex = currentIndex % 3 !== 0 ? currentIndex - 1 : currentIndex + 2;
        break;
      case 'ArrowRight':
        targetIndex = currentIndex % 3 !== 2 ? currentIndex + 1 : currentIndex - 2;
        break;
      case 'r':
      case 'R':
        resetRound();
        return;
      default:
        return;
    }

    if (targetIndex !== null && cells[targetIndex]) {
      e.preventDefault();
      cells[targetIndex].focus();
    }
  }

  // --- Event Listeners ---

  cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });

  modePvpBtn.addEventListener('click', () => setGameMode('pvp'));
  modePveBtn.addEventListener('click', () => setGameMode('pve'));

  difficultySelect.addEventListener('change', (e) => {
    aiDifficulty = e.target.value;
    resetScores();
  });

  newRoundBtn.addEventListener('click', resetRound);
  resetScoreBtn.addEventListener('click', resetScores);
  modalPlayAgainBtn.addEventListener('click', resetRound);

  if (modalViewHistoryBtn) {
    modalViewHistoryBtn.addEventListener('click', () => {
      closeModal();
      openHistoryModal();
    });
  }

  if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', openHistoryModal);
  }

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', closeHistoryModal);
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearHistory);
  }

  // Close modals when clicking on their backdrops
  resultModal.addEventListener('click', (e) => {
    const rect = resultModal.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      resetRound();
    }
  });

  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      const rect = historyModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        closeHistoryModal();
      }
    });
  }

  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggleBtn.setAttribute('aria-label', soundEnabled ? 'Mute Sound' : 'Unmute Sound');
    if (soundEnabled) playSound('click');
  });

  document.addEventListener('keydown', handleKeyboardNav);

  // --- Match History (localStorage) ---

  function recordMatch(result) {
    const movesCount = board.filter(cell => cell !== null).length;
    let winnerTitle = "Draw";
    if (result.winner === 'X') {
      winnerTitle = gameMode === 'pve' ? 'You (X)' : 'Player X';
    } else if (result.winner === 'O') {
      winnerTitle = gameMode === 'pve' ? 'AI (O)' : 'Player O';
    }

    const match = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      winner: result.winner,
      winnerTitle,
      mode: gameMode,
      difficulty: gameMode === 'pve' ? aiDifficulty : null,
      moves: movesCount,
      timestamp: Date.now()
    };

    matchHistory.unshift(match);
    if (matchHistory.length > 50) {
      matchHistory.pop();
    }
    saveHistory();
    updateHistoryBadge();
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(matchHistory));
    } catch (e) { /* storage unavailable or quota exceeded */ }
  }

  function loadHistory() {
    try {
      const data = localStorage.getItem(HISTORY_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function clearHistory() {
    matchHistory = [];
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {}
    updateHistoryUI();
    updateHistoryBadge();
    playSound('click');
  }

  function formatTime(timestamp) {
    const diff = Math.max(0, Date.now() - timestamp);
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateHistoryBadge() {
    if (!historyCountBadge) return;
    historyCountBadge.textContent = matchHistory.length;
    if (matchHistory.length > 0) {
      historyCountBadge.classList.remove('hidden');
    } else {
      historyCountBadge.classList.add('hidden');
    }
  }

  function updateHistoryUI() {
    updateHistoryBadge();

    // Update Summary Stats
    const xWins = matchHistory.filter(m => m.winner === 'X').length;
    const oWins = matchHistory.filter(m => m.winner === 'O').length;
    const ties = matchHistory.filter(m => m.winner === 'tie').length;
    if (statX) statX.textContent = xWins;
    if (statO) statO.textContent = oWins;
    if (statTies) statTies.textContent = ties;

    if (!historyList) return;

    if (matchHistory.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <span class="history-empty-icon">📜</span>
          <p>No matches recorded yet.</p>
          <small style="color: var(--text-muted)">Play a round to start your match history!</small>
        </div>
      `;
      return;
    }

    historyList.innerHTML = matchHistory.map(m => {
      let badgeClass = 'tie';
      let markChar = '=';
      if (m.winner === 'X') {
        badgeClass = 'x-win';
        markChar = 'X';
      } else if (m.winner === 'O') {
        badgeClass = 'o-win';
        markChar = 'O';
      }

      const modeLabel = m.mode === 'pve'
        ? `🤖 AI (${m.difficulty ? m.difficulty.toUpperCase() : 'AI'})`
        : '👥 2 Players';
      const movesText = `${m.moves} moves`;
      const timeText = formatTime(m.timestamp);

      return `
        <div class="history-item">
          <div class="history-item-left">
            <div class="history-mark-badge ${badgeClass}">${markChar}</div>
            <div class="history-details">
              <div class="history-winner-title">${escapeHtml(m.winnerTitle)}</div>
              <div class="history-meta">${modeLabel} • ${movesText}</div>
            </div>
          </div>
          <div class="history-item-right">${timeText}</div>
        </div>
      `;
    }).join('');
  }

  function openHistoryModal() {
    updateHistoryUI();
    if (typeof historyModal.showModal === 'function') {
      historyModal.showModal();
    } else {
      historyModal.setAttribute('open', 'true');
    }
    playSound('click');
  }

  function closeHistoryModal() {
    if (typeof historyModal.close === 'function') {
      historyModal.close();
    } else {
      historyModal.removeAttribute('open');
    }
  }

  // --- Persistence (scores, mode, difficulty survive a page refresh) ---

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        scores, mode: gameMode, difficulty: aiDifficulty,
      }));
    } catch (e) { /* storage unavailable - ignore */ }
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  // Initialize UI & History
  const saved = loadState();
  if (saved) {
    if (['easy', 'medium', 'hard'].includes(saved.difficulty)) {
      aiDifficulty = saved.difficulty;
      difficultySelect.value = aiDifficulty;
    }
    if (saved.mode === 'pve') setGameMode('pve');
    if (saved.scores) {
      scores.X = Number(saved.scores.X) || 0;
      scores.O = Number(saved.scores.O) || 0;
      scores.ties = Number(saved.scores.ties) || 0;
      scoreXEl.textContent = scores.X;
      scoreOEl.textContent = scores.O;
      scoreTiesEl.textContent = scores.ties;
    }
  }

  matchHistory = loadHistory();
  updateHistoryBadge();

  booting = false;
  updateTurnUI();
})();
