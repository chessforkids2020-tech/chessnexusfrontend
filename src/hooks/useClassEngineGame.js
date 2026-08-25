// src/hooks/useClassEngineGame.js
//
// "Everyone plays this position vs the computer" — the student half.
//
// The coach sets ONE position in the live classroom and every student plays it
// against Stockfish. The engine runs HERE, in the student's own browser, via the
// shared stockfishService (WASM). That is what makes the feature cheap:
//
//   * no engine on the server — nothing added to EC2 load
//   * no work for the coach — unlike a simul they are not playing anyone
//   * it scales to any class size, because each laptop computes its own opponent
//
// The server still validates every move with chess.js, so a tampered client
// cannot make an illegal move — it could only feed itself a weak engine reply,
// which just cheats its own practice.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import stockfishService from '../services/stockfishService';

export default function useClassEngineGame({ socket, sessionId, myBoard, skillLevel, studentColor }) {
  const [thinking, setThinking] = useState(false);
  // Guards against two engine searches running at once for the same board — a
  // fast double-move would otherwise send two replies for one position.
  const busyRef = useRef(false);

  const myTurn = useCallback(() => {
    if (!myBoard?.fen) return false;
    try { return (new Chess(myBoard.fen).turn() === 'w' ? 'white' : 'black') === studentColor; }
    catch { return false; }
  }, [myBoard?.fen, studentColor]);

  // Send the student's own move. The engine reply is triggered by the effect
  // below once the server has echoed the new position back — never optimistically,
  // so the client and server can't drift apart.
  const playMove = useCallback((from, to, promotion) => {
    if (!socket || !sessionId || !myBoard || myBoard.status !== 'active') return false;
    if (!myTurn()) return false;
    // Validate locally first so an obviously illegal drag doesn't hit the wire.
    try {
      const c = new Chess(myBoard.fen);
      if (!c.move({ from, to, promotion: promotion || 'q' })) return false;
    } catch { return false; }
    socket.emit('engine:move', { sessionId, boardId: myBoard.id, from, to, promotion });
    return true;
  }, [socket, sessionId, myBoard, myTurn]);

  // When it becomes the ENGINE's turn on this student's board, compute its reply
  // locally and send it as a normal move.
  useEffect(() => {
    if (!socket || !sessionId || !myBoard || myBoard.status !== 'active') return;
    if (myTurn() || busyRef.current) return;

    let cancelled = false;
    busyRef.current = true;
    setThinking(true);

    (async () => {
      // ONE RETRY. A single failed search used to leave the board waiting for a
      // move that would never come, and the only way out was a page reload —
      // which is what students were doing. A transient failure (a timeout while
      // the shared worker was busy) now heals itself.
      const search = async () => stockfishService.getBestMove(myBoard.fen, {
        // Short think time: this is a classroom, not a serious game, and a
        // 2s pause per move on 12 laptops feels like the app has hung.
        moveTime: 600,
        depth: 12,
        skill: skillLevel,
      });

      try {
        await stockfishService.init?.();
        let res;
        try {
          res = await search();
        } catch (firstErr) {
          if (cancelled) return;
          // Reset the engine before trying again: the previous search may have
          // left it mid-think.
          try { stockfishService.stop?.(); } catch { /* ignore */ }
          await new Promise(r => setTimeout(r, 250));
          if (cancelled) return;
          res = await search();
        }
        const uci = res?.bestMove;
        if (cancelled || !uci) return;
        socket.emit('engine:move', {
          sessionId,
          boardId: myBoard.id,
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] || undefined,
        });
      } catch {
        // Engine unavailable (old device, WASM blocked). The board simply waits
        // rather than breaking the whole class — the coach can end the activity.
      } finally {
        // ALWAYS release the lock, even when this run was superseded.
        //
        // This used to be guarded by `if (!cancelled)`, so a run that was
        // cancelled mid-search left `thinking` true forever — the board showed
        // "Computer is thinking…" with nothing left to finish it. The engine
        // service now ignores superseded searches on its own, so releasing here
        // is safe and is what lets the next move start.
        busyRef.current = false;
        if (!cancelled) setThinking(false);
      }
    })();

    return () => {
      cancelled = true;
      busyRef.current = false;
      // Stop the in-flight search at the engine too. Leaving it running meant
      // its late `bestmove` could still arrive and be mistaken for the next
      // search's answer.
      stockfishService.stop?.();
    };
  }, [socket, sessionId, myBoard?.id, myBoard?.fen, myBoard?.status, myTurn, skillLevel]);

  return { playMove, thinking, isMyTurn: myTurn() };
}
