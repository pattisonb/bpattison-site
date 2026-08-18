//helpers for the game tree explorer on the tic tac toe page
//scores come from my minimax, counting uses the same traversal so the numbers match what it searches
import { checkWin, bestMoveAlphaBeta, human, AI } from "./minimax";

export function whoseTurn(board) {
  let xCount = 0;
  let oCount = 0;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      if (board[i][j] === "X") {
        xCount++;
      }
      if (board[i][j] === "O") {
        oCount++;
      }
    }
  }
  //X always goes first
  if (xCount === oCount) {
    return human;
  }
  return AI;
}

export function countEmpty(board) {
  let empty = 0;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      if (board[i][j] === "-") {
        empty++;
      }
    }
  }
  return empty;
}

//withScores is off when the position is too big to search every branch
export function getMoves(board, player, withScores) {
  const boardSize = board.length;
  const moves = [];
  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      if (board[x][y] === "-") {
        const newBoard = board.map((row) => row.slice());
        newBoard[x][y] = player === AI ? "O" : "X";
        let score = null;
        const result = checkWin(newBoard);
        if (result === "O") {
          score = 10;
        } else if (result === "X") {
          score = -10;
        } else if (result === "Tie") {
          score = 0;
        } else if (withScores) {
          score = bestMoveAlphaBeta(
            newBoard,
            player === AI ? human : AI,
            -100,
            100
          ).score;
        }
        moves.push({ row: x, column: y, score: score, board: newBoard });
      }
    }
  }
  return moves;
}

//same picking logic as bestMove so the highlighted node matches what the algorithm does
export function pickIndex(moves, player) {
  let best = 0;
  if (player === AI) {
    let bestScore = -100;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score > bestScore) {
        best = i;
        bestScore = moves[i].score;
      }
    }
  } else {
    let bestScore = 100;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score < bestScore) {
        best = i;
        bestScore = moves[i].score;
      }
    }
  }
  return best;
}

//counts every position the plain minimax visits
export function countPositions(board, player) {
  const boardSize = board.length;
  const result = checkWin(board);
  if (result === "O" || result === "X" || result === "Tie") {
    return { score: result === "O" ? 10 : result === "X" ? -10 : 0, nodes: 1 };
  }

  let nodes = 1;
  let bestScore = player === AI ? -100 : 100;
  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      if (board[x][y] === "-") {
        board[x][y] = player === AI ? "O" : "X";
        const child = countPositions(board, player === AI ? human : AI);
        nodes += child.nodes;
        board[x][y] = "-";
        if (player === AI && child.score > bestScore) {
          bestScore = child.score;
        }
        if (player === human && child.score < bestScore) {
          bestScore = child.score;
        }
      }
    }
  }
  return { score: bestScore, nodes: nodes };
}

//counts positions with alpha-beta pruning, same cutoff as bestMoveAlphaBeta
export function countPositionsAlphaBeta(board, player, alpha, beta) {
  const boardSize = board.length;
  const result = checkWin(board);
  if (result === "O" || result === "X" || result === "Tie") {
    return { score: result === "O" ? 10 : result === "X" ? -10 : 0, nodes: 1 };
  }

  let nodes = 1;
  let bestScore = player === AI ? -100 : 100;
  for (let x = 0; x < boardSize; x++) {
    //the break below only leaves the inner loop, same as the C++ version
    for (let y = 0; y < boardSize; y++) {
      if (board[x][y] === "-") {
        board[x][y] = player === AI ? "O" : "X";
        const child = countPositionsAlphaBeta(
          board,
          player === AI ? human : AI,
          alpha,
          beta
        );
        nodes += child.nodes;
        board[x][y] = "-";
        if (player === AI) {
          if (child.score > bestScore) {
            bestScore = child.score;
          }
          if (alpha < child.score) {
            alpha = child.score;
          }
        } else {
          if (child.score < bestScore) {
            bestScore = child.score;
          }
          if (beta > child.score) {
            beta = child.score;
          }
        }
        if (beta <= alpha) {
          break;
        }
      }
    }
  }
  return { score: bestScore, nodes: nodes };
}
