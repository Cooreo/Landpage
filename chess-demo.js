(() => {
  'use strict';

  const boardElement = document.getElementById('chess-board');
  const statusElement = document.getElementById('chess-status');
  const turnLabel = document.getElementById('turn-label');
  const turnIndicator = document.getElementById('turn-indicator');
  const moveList = document.getElementById('move-list');
  const newGameButton = document.getElementById('new-game');
  const undoButton = document.getElementById('undo-turn');
  if (!boardElement || !statusElement) return;

  if (typeof window.Chess !== 'function') {
    turnLabel.textContent = 'OFFLINE';
    statusElement.textContent = 'The chess rules could not be loaded. Check your connection and refresh to play.';
    boardElement.innerHTML = '<p class="chess-load-error">The board needs an internet connection to load its rules.</p>';
    newGameButton.disabled = true;
    undoButton.disabled = true;
    return;
  }

  const game = new window.Chess();
  const files = 'abcdefgh';
  const glyphs = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };
  const pieceNames = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

  let selectedSquare = null;
  let lastFocusedSquare = 'e2';
  let botThinking = false;
  let botTimer = null;

  function squareName(row, column) {
    return `${files[column]}${8 - row}`;
  }

  function renderBoard(focusSquare) {
    const position = game.board();
    const movesFromSelection = selectedSquare && game.turn() === 'w'
      ? game.moves({ square: selectedSquare, verbose: true })
      : [];
    const lastMoves = game.history({ verbose: true });
    const lastMove = lastMoves[lastMoves.length - 1];
    const isOver = game.game_over();
    const isDisabled = isOver || botThinking || game.turn() !== 'w';
    const checkedKing = game.in_check()
      ? position.flatMap((rank, row) => rank.map((piece, column) => (
        piece && piece.type === 'k' && piece.color === game.turn() ? squareName(row, column) : null
      ))).find(Boolean)
      : null;
    const requestedFocus = focusSquare || lastFocusedSquare;

    boardElement.replaceChildren();
    boardElement.dataset.turn = game.turn() === 'w' ? 'white' : 'black';

    position.forEach((rank, row) => {
      rank.forEach((piece, column) => {
        const square = squareName(row, column);
        const legalMove = movesFromSelection.find((move) => move.to === square);
        const button = document.createElement('button');
        const isLight = (row + column) % 2 === 0;
        button.type = 'button';
        button.className = `chess-square ${isLight ? 'is-light' : 'is-dark'}`;
        button.dataset.square = square;
        button.disabled = isDisabled;
        button.tabIndex = !isDisabled && square === requestedFocus ? 0 : -1;
        button.setAttribute('aria-pressed', String(square === selectedSquare));

        if (square === selectedSquare) button.classList.add('is-selected');
        if (legalMove) {
          button.classList.add('is-legal');
          if (legalMove.flags.includes('c') || legalMove.flags.includes('e')) button.classList.add('is-capture');
        }
        if (lastMove && (square === lastMove.from || square === lastMove.to)) button.classList.add('is-last-move');
        if (square === checkedKing) button.classList.add('is-check');

        const description = piece
          ? `${piece.color === 'w' ? 'White' : 'Black'} ${pieceNames[piece.type]}`
          : 'empty square';
        const extras = [
          square === selectedSquare ? 'selected' : '',
          legalMove ? 'legal destination' : ''
        ].filter(Boolean).join(', ');
        button.setAttribute('aria-label', `${square}, ${description}${extras ? `, ${extras}` : ''}`);

        if (column === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'square-coordinate square-coordinate--rank';
          rankLabel.setAttribute('aria-hidden', 'true');
          rankLabel.textContent = String(8 - row);
          button.append(rankLabel);
        }
        if (row === 7) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'square-coordinate square-coordinate--file';
          fileLabel.setAttribute('aria-hidden', 'true');
          fileLabel.textContent = files[column];
          button.append(fileLabel);
        }
        if (piece) {
          const pieceElement = document.createElement('span');
          pieceElement.className = `chess-piece chess-piece--${piece.color === 'w' ? 'white' : 'black'}`;
          pieceElement.setAttribute('aria-hidden', 'true');
          pieceElement.textContent = glyphs[piece.color][piece.type];
          button.append(pieceElement);
        }
        boardElement.append(button);
      });
    });

    if (focusSquare) {
      boardElement.querySelector(`[data-square="${focusSquare}"]`)?.focus({ preventScroll: true });
    }
  }

  function gameMessage() {
    if (game.in_checkmate()) return game.turn() === 'b' ? 'Checkmate — you win!' : 'Checkmate — the bot wins.';
    if (game.in_stalemate()) return 'Stalemate — this game is a draw.';
    if (game.in_draw()) return 'Draw — no winning position remains.';
    if (botThinking) return 'The bot is choosing from its legal moves…';
    if (game.turn() === 'w') return game.in_check() ? 'You are in check. Find a safe move.' : 'Your turn. Select a white piece.';
    return game.in_check() ? 'The bot is in check.' : 'The bot is thinking.';
  }

  function renderMoveHistory() {
    const history = game.history();
    moveList.replaceChildren();
    if (!history.length) {
      const opening = document.createElement('li');
      opening.className = 'opening-note';
      opening.textContent = 'Opening position';
      moveList.append(opening);
      return;
    }

    for (let index = 0; index < history.length; index += 2) {
      const item = document.createElement('li');
      const number = document.createElement('span');
      const whiteMove = document.createElement('span');
      const blackMove = document.createElement('span');
      number.className = 'move-number';
      number.textContent = `${Math.floor(index / 2) + 1}.`;
      whiteMove.textContent = history[index];
      if (index === history.length - 1) whiteMove.className = 'latest-move';
      blackMove.textContent = history[index + 1] || '…';
      if (index + 1 === history.length - 1) blackMove.className = 'latest-move';
      item.append(number, whiteMove, blackMove);
      moveList.append(item);
    }
    moveList.scrollTop = moveList.scrollHeight;
  }

  function refreshGameInfo() {
    const ended = game.game_over();
    const isBotTurn = game.turn() === 'b' || botThinking;
    turnLabel.textContent = ended ? 'GAME OVER' : (isBotTurn ? 'BOT TO MOVE' : 'YOUR MOVE');
    statusElement.textContent = gameMessage();
    turnIndicator.classList.toggle('is-bot', isBotTurn);
    turnIndicator.classList.toggle('is-check', game.in_check());
    undoButton.disabled = game.history().length === 0;
    renderMoveHistory();
  }

  function playRandomReply() {
    botTimer = null;
    if (game.game_over() || game.turn() !== 'b') {
      botThinking = false;
      renderBoard(lastFocusedSquare);
      refreshGameInfo();
      return;
    }

    const legalMoves = game.moves({ verbose: true });
    if (!legalMoves.length) {
      botThinking = false;
      refreshGameInfo();
      return;
    }
    const choice = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    const move = { from: choice.from, to: choice.to };
    if (choice.promotion) move.promotion = choice.promotion;
    game.move(move);
    botThinking = false;
    selectedSquare = null;
    renderBoard(lastFocusedSquare);
    refreshGameInfo();
  }

  function scheduleRandomReply() {
    botThinking = true;
    renderBoard(lastFocusedSquare);
    refreshGameInfo();
    botTimer = window.setTimeout(playRandomReply, 680);
  }

  function handleSquareClick(event) {
    const squareButton = event.target.closest('.chess-square');
    if (!squareButton || game.game_over() || botThinking || game.turn() !== 'w') return;
    const target = squareButton.dataset.square;
    lastFocusedSquare = target;

    if (selectedSquare) {
      const legalMove = game.moves({ square: selectedSquare, verbose: true }).find((move) => move.to === target);
      if (legalMove) {
        const move = { from: selectedSquare, to: target };
        if (legalMove.promotion) move.promotion = 'q';
        game.move(move);
        selectedSquare = null;
        scheduleRandomReply();
        return;
      }
    }

    const piece = game.get(target);
    if (piece && piece.color === 'w') selectedSquare = selectedSquare === target ? null : target;
    else selectedSquare = null;
    renderBoard(target);
    refreshGameInfo();
  }

  boardElement.addEventListener('click', handleSquareClick);
  boardElement.addEventListener('keydown', (event) => {
    const currentButton = event.target.closest('.chess-square');
    if (!currentButton || !event.key.startsWith('Arrow')) return;
    const current = currentButton.dataset.square;
    const row = 8 - Number(current[1]);
    const column = files.indexOf(current[0]);
    const delta = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1]
    }[event.key];
    if (!delta) return;
    const nextRow = row + delta[0];
    const nextColumn = column + delta[1];
    if (nextRow < 0 || nextRow > 7 || nextColumn < 0 || nextColumn > 7) return;
    event.preventDefault();
    lastFocusedSquare = squareName(nextRow, nextColumn);
    boardElement.querySelectorAll('.chess-square').forEach((button) => {
      button.tabIndex = button.dataset.square === lastFocusedSquare && !button.disabled ? 0 : -1;
    });
    boardElement.querySelector(`[data-square="${lastFocusedSquare}"]`)?.focus({ preventScroll: true });
  });
  boardElement.addEventListener('focusin', (event) => {
    const button = event.target.closest('.chess-square');
    if (button) lastFocusedSquare = button.dataset.square;
  });

  newGameButton.addEventListener('click', () => {
    window.clearTimeout(botTimer);
    botTimer = null;
    botThinking = false;
    selectedSquare = null;
    lastFocusedSquare = 'e2';
    game.reset();
    renderBoard();
    refreshGameInfo();
  });

  undoButton.addEventListener('click', () => {
    window.clearTimeout(botTimer);
    botTimer = null;
    botThinking = false;
    if (!game.history().length) return;

    if (game.turn() === 'w') {
      game.undo(); // remove the bot's reply
      if (game.history().length) game.undo(); // and the matching player move
    } else {
      game.undo(); // undo a player move while the bot is thinking
    }
    selectedSquare = null;
    const previousMove = game.history({ verbose: true }).slice(-1)[0];
    lastFocusedSquare = previousMove ? previousMove.to : 'e2';
    renderBoard(lastFocusedSquare);
    refreshGameInfo();
  });

  renderBoard();
  refreshGameInfo();
})();
