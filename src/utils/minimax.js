//ported from my C++ tic tac toe assignment (github.com/pattisonb/PA04-Minimax)
//easier to name the strings here than to deal with X's and O's the whole time
const person = "X";
const ai = "O";

//need to pass a player to bestMove functions to use the right string
export const human = 0;
export const AI = 1;

export function makeBoard(boardSize) {
  //fill board with - to easily check if spot is taken
  const board = [];
  for (let i = 0; i < boardSize; i++) {
    const row = [];
    for (let j = 0; j < boardSize; j++) {
      row.push("-");
    }
    board.push(row);
  }
  return board;
}

function sameRow(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function checkWin(newBoard) {
  //separate checkWin function to check a win for both players rather than calling checkPlayer win twice everytime
  if (checkPlayerWin(newBoard, human) === "X") {
    return "X";
  }
  if (checkPlayerWin(newBoard, AI) === "O") {
    return "O";
  }
  const boardSize = newBoard.length;
  let isTie = true;
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (newBoard[i][j] !== person && newBoard[i][j] !== ai) {
        isTie = false;
      }
    }
  }

  if (isTie) {
    return "Tie";
  }
  //rerturning the literal value null if it's a tie
  return "null";
}

function checkPlayerWin(newBoard, player) {
  const boardSize = newBoard.length;
  let playerMark;
  let returnValue;
  if (player === human) {
    playerMark = person;
    returnValue = "X";
  } else {
    playerMark = ai;
    returnValue = "O";
  }

  //fill a vector with either X or O depending on the player passed
  const winChecker = [];
  for (let i = 0; i < boardSize; i++) {
    winChecker.push(playerMark);
  }
  //checking horizontal
  for (let i = 0; i < boardSize; i++) {
    if (sameRow(newBoard[i], winChecker)) {
      return returnValue;
    }
  }
  //checking vertical
  let check = [];
  for (let j = 0; j < boardSize; j++) {
    for (let i = 0; i < boardSize; i++) {
      check.push(newBoard[i][j]);
    }
    if (sameRow(check, winChecker)) {
      return returnValue;
    }
    check = [];
  }

  check = [];

  //checking right diagonal
  let count = 0;
  for (let i = 0; i < boardSize; i++) {
    check.push(newBoard[i][count]);
    count++;
  }

  if (sameRow(check, winChecker)) {
    return returnValue;
  }

  check = [];

  //checking left diagonal
  count = boardSize - 1;
  for (let i = 0; i < boardSize; i++) {
    check.push(newBoard[i][count]);
    count--;
  }

  if (sameRow(check, winChecker)) {
    return returnValue;
  }
  //other wise it's just null
  return "null";
}

//minimax function
export function bestMove(board, player) {
  const boardSize = board.length;
  //base case for the MiniMax recursion
  const result = checkWin(board);
  //return a 10 if ai wins, -10 if person wins and a 0 if tie
  if (result === ai) {
    return { score: 10 };
  } else if (result === person) {
    return { score: -10 };
  } else if (result === "Tie") {
    return { score: 0 };
  }

  //vector of moves to keep track of all of them to find the one the results in the either min or max score depening on the player
  //AI is trying to max while player is trying to min
  const moves = [];

  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      //find the first available space and make that move
      if (board[x][y] === "-") {
        const move = {};
        move.row = x;
        move.column = y;
        if (player === AI) {
          board[x][y] = ai;
          //get the score of that move by running the game to completion once that move is made
          move.score = bestMove(board, human).score;
        } else if (player === human) {
          board[x][y] = person;
          move.score = bestMove(board, AI).score;
        }
        //add that move to the vector
        moves.push(move);
        //set the position back to nothing because we were only checking not placing yet
        board[x][y] = "-";
      }
    }
  }

  //bestMove is the index of the moves vector to be returned
  let best = 0;
  if (player === AI) {
    //since AI is trying to max, bestScore has to be set really low
    //since it's low any move will be greater than it at first
    let bestScore = -100;
    for (let i = 0; i < moves.length; i++) {
      //set bestMove to the index of the move with the highest possible score
      if (moves[i].score > bestScore) {
        best = i;
        bestScore = moves[i].score;
      }
    }
  } else if (player === human) {
    let bestScore = 100;
    //same as above but since it's the human it needs to minimize
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score < bestScore) {
        best = i;
        bestScore = moves[i].score;
      }
    }
  }

  //return that best move
  return moves[best];
}

export function bestMoveAlphaBeta(board, player, alpha, beta) {
  //almost the exact same as minimax except for the integers alpha and beta
  const boardSize = board.length;
  //base case for the MiniMax recursion
  const result = checkWin(board);
  //return a 10 if ai wins, -10 if person wins and a 0 if tie
  if (result === ai) {
    return { score: 10 };
  } else if (result === person) {
    return { score: -10 };
  } else if (result === "Tie") {
    return { score: 0 };
  }

  //vector of moves to keep track of all of them to find the one the results in the either min or max score depening on the player
  //AI is trying to max while player is trying to min
  const moves = [];

  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      //find the first available space and make that move
      if (board[x][y] === "-") {
        const move = {};
        move.row = x;
        move.column = y;
        if (player === AI) {
          board[x][y] = ai;
          //get the score of that move by running the game to completion once that move is made
          move.score = bestMoveAlphaBeta(board, human, alpha, beta).score;
          if (alpha < move.score) {
            alpha = move.score;
            //set alpha to the highest score we've seen so fair
          }
        } else if (player === human) {
          board[x][y] = person;
          move.score = bestMoveAlphaBeta(board, AI, alpha, beta).score;
          if (beta > move.score) {
            beta = move.score;
            //set beta to the lowest score seen so far
          }
        }
        //add that move to the vector
        moves.push(move);
        //set the position back to nothing because we were only checking not placing yet
        board[x][y] = "-";
        //if beta is ever less than alpha than that means the branch will not result in a better result than a perviously
        //found move so we leave it
        if (beta <= alpha) {
          break;
        }
      }
    }
  }

  //bestMove is the index of the moves vector to be returned
  let best = 0;
  if (player === AI) {
    //since AI is trying to max, bestScore has to be set really low
    //since it's low any move will be greater than it at first
    let bestScore = -100;
    for (let i = 0; i < moves.length; i++) {
      //set bestMove to the index of the move with the highest possible score
      if (moves[i].score > bestScore) {
        best = i;
        bestScore = moves[i].score;
      }
    }
  } else if (player === human) {
    let bestScore = 100;
    //same as above but since it's the human it needs to minimize
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score < bestScore) {
        best = i;
        bestScore = moves[i].score;
      }
    }
  }

  //return that best move
  return moves[best];
}
