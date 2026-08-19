import React, { useState, useEffect, useMemo } from "react";
import { FaGithub, FaHashtag } from "react-icons/fa";
import {
  makeBoard,
  checkWin,
  bestMove,
  bestMoveAlphaBeta,
  AI,
} from "../utils/minimax";
import {
  whoseTurn,
  getMoves,
  pickIndex,
  countEmpty,
  countPositions,
  countPositionsAlphaBeta,
} from "../utils/gameTree";
import "../styles/TicTacToe.css";

//most empty squares the search can handle before the browser chokes
const searchLimitPruned = 10;
const searchLimitPlain = 9;
//scoring every branch in the tree explorer runs a search per branch, so it needs a lower cutoff
const scoreLimit = 9;

const cellSizes = { 3: 96, 4: 72, 5: 58 };
const miniCellSizes = { 3: 22, 4: 18, 5: 14 };

function MiniBoard({ board, highlight }) {
  const size = board.length;
  const px = miniCellSizes[size];
  return (
    <span
      className={"mini-board size-" + size}
      style={{
        gridTemplateColumns: `repeat(${size}, ${px}px)`,
        gridTemplateRows: `repeat(${size}, ${px}px)`,
      }}
    >
      {board.map((row, i) =>
        row.map((cell, j) => (
          <span
            key={`${i}-${j}`}
            className={
              "mini-cell" +
              (cell === "X" ? " x" : "") +
              (cell === "O" ? " o" : "") +
              (highlight && highlight.row === i && highlight.column === j
                ? " new"
                : "")
            }
          >
            {cell !== "-" ? cell : ""}
          </span>
        ))
      )}
    </span>
  );
}

function TicTacToe() {
  const [craigslist, setCraigslist] = useState(
    document.documentElement.getAttribute("data-style") === "craigslist"
  );
  const [gridSize, setGridSize] = useState(3);
  const [board, setBoard] = useState(makeBoard(3));
  const [status, setStatus] = useState("Your turn");
  const [alphaBeta, setAlphaBeta] = useState(true);
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [treePath, setTreePath] = useState([]);

  //jump the explorer back to the live board whenever it changes
  useEffect(() => {
    setTreePath([]);
  }, [board]);

  //rerender when the craigslist toggle in the navbar flips
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCraigslist(
        document.documentElement.getAttribute("data-style") === "craigslist"
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-style"],
    });
    return () => observer.disconnect();
  }, []);

  const startGame = (size) => {
    setGridSize(size);
    setBoard(makeBoard(size));
    setStatus("Your turn");
    setLastMove(null);
    setThinking(false);
    setGameOver(false);
  };

  const computerMove = (newBoard) => {
    const empty = countEmpty(newBoard);
    const limit = alphaBeta ? searchLimitPruned : searchLimitPlain;

    if (empty > limit) {
      //too many open squares to run the game to completion, just take one
      const open = [];
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          if (newBoard[i][j] === "-") {
            open.push({ row: i, column: j });
          }
        }
      }
      const spot = open[Math.floor(Math.random() * open.length)];
      newBoard[spot.row][spot.column] = "O";
      setLastMove({ searched: false, empty: empty });
    } else {
      const counts = { pruned: null, plain: null };
      counts.pruned = countPositionsAlphaBeta(
        newBoard.map((row) => row.slice()),
        AI,
        -100,
        100
      ).nodes;
      if (empty <= searchLimitPlain) {
        counts.plain = countPositions(
          newBoard.map((row) => row.slice()),
          AI
        ).nodes;
      }

      const t1 = performance.now();
      let AIMove;
      if (!alphaBeta) {
        AIMove = bestMove(newBoard, AI);
      } else {
        AIMove = bestMoveAlphaBeta(newBoard, AI, -100, 100);
      }
      const t2 = performance.now();
      newBoard[AIMove.row][AIMove.column] = "O";
      setLastMove({
        searched: true,
        time: Math.round((t2 - t1) * 1000),
        plain: counts.plain,
        pruned: counts.pruned,
      });
    }

    setBoard(newBoard.map((row) => row.slice()));
    setThinking(false);

    const result = checkWin(newBoard);
    if (result === "O") {
      setStatus("You lost!");
      setGameOver(true);
    } else if (result === "Tie") {
      setStatus("Tie game!");
      setGameOver(true);
    } else {
      setStatus("Your turn");
    }
  };

  const handleClick = (row, col) => {
    if (thinking || gameOver || board[row][col] !== "-") {
      return;
    }
    const newBoard = board.map((r) => r.slice());
    newBoard[row][col] = "X";
    setBoard(newBoard);

    const result = checkWin(newBoard);
    if (result === "X") {
      setStatus("You won!");
      setGameOver(true);
      return;
    }
    if (result === "Tie") {
      setStatus("Tie game!");
      setGameOver(true);
      return;
    }

    setStatus("Computer turn");
    setThinking(true);
    setTimeout(() => computerMove(newBoard), 300);
  };

  //walk from the live board down the clicked path
  const treeBoards = useMemo(() => {
    const boards = [board];
    let current = board;
    for (const step of treePath) {
      const next = current.map((row) => row.slice());
      next[step.row][step.column] = step.mark;
      boards.push(next);
      current = next;
    }
    return boards;
  }, [board, treePath]);

  const treeBoard = treeBoards[treeBoards.length - 1];
  const treeResult = checkWin(treeBoard);
  const treeTurn = whoseTurn(treeBoard);

  const treeMoves = useMemo(() => {
    if (treeResult !== "null") {
      return [];
    }
    return getMoves(treeBoard, treeTurn, countEmpty(treeBoard) <= scoreLimit);
  }, [treeBoard, treeResult, treeTurn]);

  const scored =
    treeMoves.length > 0 && treeMoves.every((move) => move.score !== null);
  const picked = scored ? pickIndex(treeMoves, treeTurn) : -1;

  const descend = (move) => {
    setTreePath([
      ...treePath,
      {
        row: move.row,
        column: move.column,
        mark: treeTurn === AI ? "O" : "X",
      },
    ]);
  };

  const cellPx = cellSizes[gridSize];

  return (
    <div className="tictactoe-page">
      <section className="tictactoe-hero">
        <div className="container">
          <span className="section-label tictactoe-label">
            <FaHashtag /> Tic Tac Toe
          </span>
          <h1>Play my minimax algorithm</h1>
          <p>
            You're X, the computer is O. The computer runs the minimax
            algorithm I wrote in C++ for a class assignment, ported line for
            line to JavaScript. On a 3x3 board it searches the whole game tree
            before every move, so it doesn't lose. You can also expand the grid
            like the original program allowed. Bigger grids blow the tree up so
            fast that a full search isn't possible until the board fills in, so
            early on the computer just takes a square. That tradeoff is what
            the assignment was about.
          </p>
          <a
            className="tictactoe-repo"
            href="https://github.com/pattisonb/PA04-Minimax"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub /> See the original C++
          </a>
        </div>
      </section>

      <div
        className={"container game-area" + (craigslist ? " as-listing" : "")}
      >
        {craigslist && (
          <>
            <div className="listing-nav">◀ prev &nbsp; ▲ &nbsp; next ▶</div>
            <div className="listing-bar">
              <a
                className="listing-reply"
                href="https://github.com/pattisonb/PA04-Minimax"
                target="_blank"
                rel="noopener noreferrer"
              >
                reply
              </a>
              <span className="listing-actions">
                <span>favorite</span>
                <span>hide</span>
                <span>flag</span>
                <span>share</span>
              </span>
              <span>
                Posted <u>just now</u>
              </span>
              <span className="listing-print">print</span>
            </div>
            <h2 className="listing-title">
              Tic tac toe vs my minimax algorithm - it doesn't lose ({gridSize}
              x{gridSize})
            </h2>
          </>
        )}

        <div className="size-picker">
          <span>What size grid would you like?</span>
          {[3, 4, 5].map((size) => (
            <button
              key={size}
              className={"size-option" + (size === gridSize ? " active" : "")}
              onClick={() => startGame(size)}
            >
              {size}x{size}
            </button>
          ))}
        </div>
        <p className="win-note">A win is a full row, column, or diagonal.</p>

        <div className="game-status">{status}</div>

        <div
          className="game-board"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${cellPx}px)`,
          }}
        >
          {board.map((row, i) =>
            row.map((cell, j) => (
              <button
                key={`${i}-${j}`}
                className={
                  "cell size-" +
                  gridSize +
                  (cell === "X" ? " x" : "") +
                  (cell === "O" ? " o" : "")
                }
                onClick={() => handleClick(i, j)}
                disabled={gameOver || thinking || cell !== "-"}
              >
                {cell !== "-" ? cell : ""}
              </button>
            ))
          )}
        </div>

        <div className="game-controls">
          <label className="ab-toggle">
            <input
              type="checkbox"
              checked={alphaBeta}
              onChange={(e) => setAlphaBeta(e.target.checked)}
            />
            Alpha-beta pruning
          </label>
          <button className="btn btn-ghost" onClick={() => startGame(gridSize)}>
            New game
          </button>
        </div>

        {lastMove && lastMove.searched && (
          <div className="move-time">
            Last computer move: {lastMove.time} µs, searched{" "}
            {lastMove.pruned.toLocaleString()} positions with pruning
            {lastMove.plain !== null
              ? `, ${lastMove.plain.toLocaleString()} without`
              : ". Without pruning there are too many to count"}
            .
          </div>
        )}
        {lastMove && !lastMove.searched && (
          <div className="move-time">
            {lastMove.empty} open squares is too many to search, so the
            computer just took one. It starts searching at{" "}
            {alphaBeta ? searchLimitPruned : searchLimitPlain} or fewer.
          </div>
        )}

        {craigslist && (
          <div className="listing-footer">
            <span>post id: 79538{gridSize}2285</span>
            <span>
              posted: <u>just now</u>
            </span>
            <span>
              ♡ <u>best of</u> <sup>[?]</sup>
            </span>
          </div>
        )}
      </div>

      <div className="container tree-section">
        <h2>The game tree</h2>
        <p className="tree-intro">
          Minimax works by playing out every possible game from the current
          position. Each board below is a move it considered from the board
          above, scored by where that branch ends up if both sides play
          perfectly: 10 means O wins, -10 means X wins, 0 means a tie. The
          outlined board is the move it would pick. Click any board to look one
          move deeper.
        </p>

        <div className="tree-crumbs">
          <button
            className={"crumb" + (treePath.length === 0 ? " here" : "")}
            onClick={() => setTreePath([])}
          >
            Current board
          </button>
          {treePath.map((step, i) => (
            <button
              key={i}
              className={"crumb" + (i === treePath.length - 1 ? " here" : "")}
              onClick={() => setTreePath(treePath.slice(0, i + 1))}
            >
              <MiniBoard board={treeBoards[i + 1]} highlight={step} />
            </button>
          ))}
        </div>

        {treeResult !== "null" ? (
          <p className="tree-over">
            This branch is finished:{" "}
            {treeResult === "Tie" ? "tie game" : treeResult + " wins"}.
          </p>
        ) : (
          <>
            <p className="tree-turn">
              {treeTurn === AI ? "O to move" : "X to move"}
            </p>
            {!scored && (
              <p className="tree-note">
                Too many open squares to score these branches. Scores show up
                once {scoreLimit} or fewer are open.
              </p>
            )}
            <div className="tree-row">
              {treeMoves.map((move, i) => (
                <button
                  key={`${move.row}-${move.column}`}
                  className={"tree-node" + (i === picked ? " picked" : "")}
                  onClick={() => descend(move)}
                >
                  <MiniBoard
                    board={move.board}
                    highlight={{ row: move.row, column: move.column }}
                  />
                  {move.score !== null && (
                    <span
                      className={
                        "score-chip" +
                        (move.score > 0 ? " o-wins" : "") +
                        (move.score < 0 ? " x-wins" : "")
                      }
                    >
                      {move.score > 0 ? "+" : ""}
                      {move.score}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TicTacToe;
