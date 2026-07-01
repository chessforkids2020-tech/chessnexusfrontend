// Frontend Stockfish service
import { Chess } from 'chess.js';

// True if the first UCI move of `pv` is legal in `fen`. Used to reject stale
// `info` lines whose PV belongs to a previous position (the engine keeps emitting
// the old search's lines for a moment after we switch positions).
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Normalize the various "start position" spellings to a real FEN. `new Chess(fen)`
// THROWS on 'start'/'startpos'/'' — which would make every PV fail validation and
// the panel hang on "Analysing…" at the initial position.
function normalizeFen(fen) {
  if (!fen || fen === 'start' || fen === 'startpos') return START_FEN;
  return fen;
}

function pvMatchesPosition(fen, pv) {
  if (!Array.isArray(pv) || pv.length === 0) return false;
  const uci = pv[0];
  if (!uci || uci.length < 4) return false;
  try {
    const c = new Chess(normalizeFen(fen));
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    return !!mv;
  } catch { return false; }
}

class StockfishService {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.callbacks = new Map();
    this.messageId = 0;
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        
        // Check if Web Workers are supported
        if (typeof Worker === 'undefined') {
          reject(new Error('Web Workers not supported'));
          return;
        }
        
        // Load Stockfish as a web worker
        this.worker = new Worker('/stockfish.js');
        
        this.worker.onmessage = (e) => {
          const message = e.data;
          this.handleMessage(message);
        };

        this.worker.onerror = (error) => {
          this.worker = null;
          reject(new Error(`Stockfish worker error: ${error.message}`));
        };

        // Send UCI initialization
        this.worker.postMessage('uci');
        
        // Wait for uciok response
        const checkReady = (msg) => {
          if (msg.includes('uciok')) {
            this.ready = true;
            resolve();
          }
        };
        
        this.callbacks.set('init', checkReady);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.ready) {
            this.worker = null;
            reject(new Error('Stockfish initialization timeout'));
          }
        }, 10000);

      } catch (error) {
        this.worker = null;
        reject(error);
      }
    });
  }

  handleMessage(message) {
    
    // Call all registered callbacks
    this.callbacks.forEach((callback, id) => {
      try {
        callback(message);
      } catch (error) {
      }
    });
  }

  sendCommand(command) {
    if (!this.worker || !this.ready) {
      throw new Error('Stockfish not ready');
    }
    this.worker.postMessage(command);
  }

  async getBestMove(fen, options = {}) {
    const { depth = 15, moveTime = 1000, multipv = 1 } = options;
    
    return new Promise((resolve, reject) => {
      if (!this.ready) {
        reject(new Error('Engine not ready'));
        return;
      }

      let bestMove = null;
      let evaluation = null;
      let ponderMove = null;
      // Store multipv lines: { [k]: { move, score, type } }
      const lines = {}; 

      const messageId = `bestmove_${this.messageId++}`;
      
      const messageHandler = (message) => {
        // Parse info lines for MultiPV
        if (message.startsWith('info') && message.includes('score') && message.includes('pv')) {
           // Parse multipv index (default to 1 if not present)
           const multipvMatch = message.match(/multipv (\d+)/);
           const k = multipvMatch ? parseInt(multipvMatch[1]) : 1;
           
           // Parse PV (first move)
           const pvMatch = message.match(/ pv ([a-h0-9]{4,5})/);
           const move = pvMatch ? pvMatch[1] : null;
           
           if (move) {
             // Parse Score
             let scoreVal = 0;
             let scoreType = 'cp';
             
             const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
             if (scoreMatch) {
               scoreType = scoreMatch[1];
               scoreVal = parseInt(scoreMatch[2]);
             }
             
             lines[k] = {
               k: k,
               move: move,
               score: scoreVal,
               type: scoreType,
               depth: parseInt(message.match(/depth (\d+)/)?.[1] || 0)
             };
             
             // Update main evaluation if it's the primary line (k=1)
             if (k === 1) {
                evaluation = {
                    type: scoreType === 'cp' ? 'centipawns' : 'mate',
                    value: scoreVal,
                    pawns: scoreType === 'cp' ? scoreVal / 100 : undefined
                };
             }
           }
        }
        
        if (message.startsWith('bestmove')) {
          const parts = message.split(' ');
          bestMove = parts[1];
          
          // Validate the best move
          if (bestMove && (bestMove === '(none)' || bestMove === 'none' || !this.isValidMoveFormat(bestMove))) {
            bestMove = null;
          }
          
          if (parts[2] === 'ponder' && parts[3]) {
            ponderMove = parts[3];
          }
          
          this.callbacks.delete(messageId);
          resolve({
            bestMove,
            ponderMove,
            evaluation,
            lines: Object.values(lines).sort((a,b) => a.k - b.k), // simplified return
            fen
          });
        }
      };

      this.callbacks.set(messageId, messageHandler);

      // Set position and start analysis
      this.sendCommand('stop'); // Stop any previous
      this.sendCommand(`setoption name MultiPV value ${multipv}`);
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth} movetime ${moveTime}`);

      // Timeout fallback
      setTimeout(() => {
        this.callbacks.delete(messageId);
        reject(new Error('Analysis timeout'));
      }, moveTime + 5000);
    });
  }

  // Analyze a position and stream the top-N lines (MultiPV) with their FULL
  // principal variation (UCI moves). Used by the live "Stockfish" panel in
  // game analysis. Calls onUpdate({ depth, lines }) repeatedly as the engine
  // deepens, and resolves with the final set when 'bestmove' arrives.
  //   lines: [{ k, scoreType:'cp'|'mate', score, depth, pv:[uci,...] }]
  analyzePosition(fenInput, { depth = 18, multipv = 3, onUpdate } = {}) {
    // Normalize 'start'/'startpos'/'' to a real FEN so both the engine command
    // and the PV-legality guard work at the initial position (otherwise the
    // panel hangs on "Analysing…" from the start / a freshly loaded position).
    const fen = normalizeFen(fenInput);
    return new Promise((resolve, reject) => {
      if (!this.ready) { reject(new Error('Engine not ready')); return; }

      // Cancel any previous analyze handler so its in-flight `info` lines (for the
      // OLD position) can't leak into this new analysis. Without this, lingering
      // info lines from the previous position get recorded here and produce a PV
      // whose first move is already played (illegal in the new fen) — which showed
      // up as a blank Best Line or raw UCI in the UI.
      for (const key of [...this.callbacks.keys()]) {
        if (String(key).startsWith('analyze_')) this.callbacks.delete(key);
      }

      const lines = {};
      let lastDepth = 0;
      let started = false;   // becomes true once WE launched `go` for THIS position
      const messageId = `analyze_${this.messageId++}`;

      const handler = (message) => {
        // Ignore everything until our own `go` has been sent. When we switch
        // positions we first send `stop`, which makes the PREVIOUS search emit a
        // final flurry of info lines + a `bestmove`. That stray `bestmove` would
        // otherwise resolve+delete this brand-new handler before its search even
        // starts — leaving the engine idle (stuck at "Analysing…" on the 2nd move).
        if (!started) return;

        if (message.startsWith('info') && message.includes(' pv ') && message.includes('score')) {
          const k = parseInt(message.match(/multipv (\d+)/)?.[1] || '1', 10);
          const d = parseInt(message.match(/depth (\d+)/)?.[1] || '0', 10);
          const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
          const pvMatch = message.match(/ pv (.+)$/);
          if (scoreMatch && pvMatch) {
            const pv = pvMatch[1].trim().split(/\s+/);
            // Authoritative guard: drop any line whose PV doesn't legally start
            // from the position we asked about. This alone kills the stale-PV leak
            // (old search's lines arriving right after we switch positions) without
            // relying on message timing.
            if (!pvMatchesPosition(fen, pv)) return;
            lines[k] = {
              k,
              depth: d,
              scoreType: scoreMatch[1],
              score: parseInt(scoreMatch[2], 10),
              pv,
            };
            lastDepth = Math.max(lastDepth, d);
            if (typeof onUpdate === 'function') {
              onUpdate({ depth: lastDepth, lines: Object.values(lines).sort((a, b) => a.k - b.k) });
            }
          }
        }
        if (message.startsWith('bestmove')) {
          this.callbacks.delete(messageId);
          resolve({ depth: lastDepth, lines: Object.values(lines).sort((a, b) => a.k - b.k) });
        }
      };

      this.callbacks.set(messageId, handler);

      // Stop any current search FIRST, then launch the new one after a short delay.
      // `stop` makes the PREVIOUS search flush a final burst of info lines + a
      // `bestmove`. We must let that stale bestmove arrive and be ignored (handler
      // stays inert while `started` is false) BEFORE we start our own search — the
      // delay guarantees ordering. Sending stop+go synchronously (or on a 0ms tick)
      // races and can leave the engine idle / consume the stale bestmove, which was
      // the "2nd move stuck at Analysing…" bug.
      this.sendCommand('stop');
      setTimeout(() => {
        // If this handler was already superseded (a newer analyze started), don't
        // launch a stale search.
        if (!this.callbacks.has(messageId)) return;
        try {
          this.sendCommand(`setoption name MultiPV value ${multipv}`);
          this.sendCommand(`position fen ${fen}`);
          this.sendCommand(`go depth ${depth}`);
          started = true; // from now on, info/bestmove belong to THIS search
        } catch { /* worker gone */ }
      }, 30);
    });
  }

  // Stop the current search (used when the user steps to another position).
  stop() {
    if (this.worker && this.ready) {
      try { this.worker.postMessage('stop'); } catch { /* ignore */ }
    }
  }

  async getNextMove(fen, puzzle, options = {}) {
    const { followSolution = true, depth = 15 } = options;
    
    // If puzzle has a solution and we want to follow it, try to use it
    if (followSolution && puzzle.solution && puzzle.solution.length > 0) {
      // For now, let's get the best move from Stockfish and see if it matches solution
      try {
        const analysis = await this.getBestMove(fen, { depth });
        
        // Validate the move format
        if (analysis.bestMove && this.isValidMoveFormat(analysis.bestMove)) {
          return analysis.bestMove;
        } else {
          return null;
        }
      } catch (error) {
        return null;
      }
    }
    
    // Otherwise, get Stockfish's best move
    try {
      const analysis = await this.getBestMove(fen, { depth });
      
      // Validate the move format
      if (analysis.bestMove && this.isValidMoveFormat(analysis.bestMove)) {
        return analysis.bestMove;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  // Validate move format (basic check for UCI format)
  isValidMoveFormat(move) {
    if (!move || typeof move !== 'string') return false;
    
    // Check for UCI format: e2e4, e7e8q, etc.
    const uciRegex = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
    return uciRegex.test(move);
  }

  isReady() {
    return this.ready && this.worker !== null;
  }

  quit() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (error) {
      }
      this.worker = null;
    }
    this.ready = false;
    this.callbacks.clear();
  }
}

// Create singleton instance
const stockfishService = new StockfishService();

export default stockfishService;
