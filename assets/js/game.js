/* Ali TizMaghz — Tic-Tac-Toe with the cells, the site's first hidden game (since version 3.05). No libraries, no
   tracking, nothing remembered. No page loads it at its start: site.js fetches it when a quiz ends with a full score
   and the door shows (the home page's Quick quiz, Standards in Medicine's quiz and Check your understanding on the
   device tutorials), so it adds nothing to a page's first download. Ali's choices of 16 to 18 November 2026
   (brief\UPDATE-PLAN.md, Decisions):
   - It opens in its own panel in the middle of the window, over the dimmed page, which does not move. Close, the
     cross, Escape or a press outside close it, and the keyboard goes back to the door.
   - The visitor plays crosses of five cells, the cells answer with rings of eight cells, each ring in the next of
     the five colours. Each round is medium (the cells win when they can, block when they must, otherwise play
     anywhere) or impossible (they never lose), at random.
   - The visitor starts; the winner of a round starts the next one, and after a draw the other side starts.
   - It follows the theme: all light with the violet in the dish's centre and black crosses in the light theme, dark
     with white crosses in the dark theme; in both the dish's own lines, a bolder table and rim and fainter lines
     inside the dish.
   - The line through the winning marks is a thin strip of the site's scaffold (9 of the dish's 600 units), on the
     marks, in the next of the five colours at each win.
   - A celebration only when the visitor wins: 8 cells from each winning mark, then 26 from the centre, all of one
     size range (6 to 11 units). None with reduced motion, where nothing moves at all.
   - Nine real buttons that say what is on them, the arrow keys between them, no clock. What the cells play and how
     a round ends is put into one hidden live region for screen readers; the words on screen are not live regions.
   The cell is drawn as the site draws it (cell() in assets/js/learn.js); the dish's lines are the home page's
   (assets/js/dish-lines.js, through window.SiteArt.lines of assets/js/fill.js); the celebration follows the pattern of the site's burst for a right
   answer (burst() in assets/js/site.js). The words are in the content files, under [explore.game]. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var dataEl = doc.getElementById('site-data');
  if (!dataEl || !doc.querySelector) return;
  var DATA = JSON.parse(dataEl.textContent), t = DATA.game, LANG = DATA.lang;
  if (!t) return;
  var TAU = Math.PI * 2;
  var TONES_DARK = [[94, 214, 200], [255, 138, 120], [240, 123, 190], [230, 195, 106], [185, 140, 255]];
  var TONES_LIGHT = [[14, 138, 131], [226, 85, 63], [179, 45, 122], [201, 140, 22], [101, 39, 217]];
  var SKIN = {
    dark:  { cross: [239, 232, 248], tones: TONES_DARK, dish: ['#3A1E6E', '#1A0E33', '#0C0618'], grid: 'rgba(230,195,106,0.9)',
             contour: '#E6C36A', lineA: 0.29, contourK: 0.5, rimA: 0.95 },
    light: { cross: [23, 18, 43], tones: TONES_LIGHT, dish: ['#D2BCFA', '#ECE3FF', '#FCFAFF'], grid: 'rgba(74,31,168,0.9)',
             contour: '#6527D9', lineA: 0.42, contourK: 0.7, rimA: 0.95 }
  };
  var GRID_W = 2.8, RIM_W = 4.5, STRIP_W = 9;
  var DIGITS = { fa: '۰۱۲۳۴۵۶۷۸۹', ar: '٠١٢٣٤٥٦٧٨٩' };
  var ROWS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var turn = { win: 0, lose: 0, draw: 0 };     // which line comes next, for the whole visit
  var wins = 0;                                // which of the five colours the next winning strip takes
  var starter = 'x';                           // who places the first mark of the next round, for the whole visit

  function dark() {
    var set = root.getAttribute('data-theme');
    return set === 'dark' || (set !== 'light' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  // One cell, as on the site: a soft glow, a translucent body with its membrane, and a nucleus.
  function cell(ctx, x, y, r, color, alpha) {
    if (alpha <= 0.01 || r <= 0.2) return;
    var glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.4);
    glow.addColorStop(0, rgba(color, 0.42 * alpha));
    glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(color, 0.78 * alpha);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * alpha) + ')';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.62 * alpha) + ')';
    ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.18, r * 0.36, 0, TAU); ctx.fill();
  }
  function winner(b) {
    for (var i = 0; i < ROWS.length; i++) {
      var l = ROWS[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { who: b[l[0]], line: l };
    }
    return b.indexOf('') < 0 ? { who: 'draw', line: null } : null;
  }
  function free(b) { var f = []; for (var i = 0; i < 9; i++) if (!b[i]) f.push(i); return f; }
  function any(list) { return list[Math.floor(Math.random() * list.length)]; }
  function finishing(b, who) {
    var f = free(b);
    for (var i = 0; i < f.length; i++) { b[f[i]] = who; var w = winner(b); b[f[i]] = ''; if (w && w.who === who) return f[i]; }
    return -1;
  }
  function minimax(b, who) {                // +1: the cells win, 0: a draw, -1: the visitor wins
    var w = winner(b);
    if (w) return w.who === 'o' ? 1 : w.who === 'x' ? -1 : 0;
    var f = free(b), best = who === 'o' ? -2 : 2;
    for (var i = 0; i < f.length; i++) {
      b[f[i]] = who; var s = minimax(b, who === 'o' ? 'x' : 'o'); b[f[i]] = '';
      best = who === 'o' ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }
  function cellsMove(b, hard) {
    var f = free(b), k;
    if (hard) {                             // never loses: the best reply, any of the best when several are equal
      if (f.length === 9) return any([0, 2, 4, 6, 8]);      // an empty board: any corner or the middle is a best start
      var best = -2, picks = [];
      for (var i = 0; i < f.length; i++) {
        b[f[i]] = 'o'; var s = minimax(b, 'x'); b[f[i]] = '';
        if (s > best) { best = s; picks = [f[i]]; } else if (s === best) picks.push(f[i]);
      }
      return any(picks);
    }
    if ((k = finishing(b, 'o')) >= 0) return k;   // medium: wins when it can, blocks when it must, otherwise anywhere
    if ((k = finishing(b, 'x')) >= 0) return k;
    return any(f);
  }
  function mark(kind) {                     // the cross and the ring that stand in the game's name
    return kind === 'x'
      ? '<svg class="ttt-mk ttt-mk-x" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/></g></svg>'
      : '<svg class="ttt-mk ttt-mk-o" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="12" cy="3.5" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="20.5" cy="12" r="2.6"/><circle cx="18" cy="18" r="2.6"/><circle cx="12" cy="20.5" r="2.6"/><circle cx="6" cy="18" r="2.6"/><circle cx="3.5" cy="12" r="2.6"/><circle cx="6" cy="6" r="2.6"/></g></svg>';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function build(box, onClose) {
    var still = !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paths = [];                         // the dish's lines come when their file has (fill.js fetches it once)
    var name = esc(t.name_marked).replace('{x}', mark('x')).replace('{o}', mark('o'));
    box.innerHTML =
      '<div class="ttt-head"><h2 class="ttt-title" id="ttt-title" aria-label="' + esc(t.name) + '">' +
      '<span class="ttt-word" aria-hidden="true">' + name + '</span><span class="ttt-sub" aria-hidden="true">' + esc(t.name_sub) + '</span></h2>' +
      '<button type="button" class="ttt-x" data-close aria-label="' + esc(t.close) + '"><span aria-hidden="true">✕</span></button></div>' +
      '<p class="ttt-intro">' + esc(t.intro) + '</p>' +
      '<div class="ttt-bowl"><canvas width="600" height="600" aria-hidden="true"></canvas><div class="ttt-grid" role="group" aria-label="' + esc(t.board) + '"></div></div>' +
      '<p class="ttt-status"></p><p class="ttt-note"></p>' +
      '<p class="vh" aria-live="polite" aria-atomic="true" data-say></p>' +
      '<div class="ttt-actions"><button type="button" class="ttt-btn ttt-btn-solid" data-again>' + esc(t.again) + '</button>' +
      '<button type="button" class="ttt-btn" data-close>' + esc(t.close) + '</button></div>';
    var $ = function (s) { return box.querySelector(s); };
    var grid = $('.ttt-grid'), ctx = $('canvas').getContext('2d'), status = $('.ttt-status'), note = $('.ttt-note'), live = $('[data-say]');
    var board, over, busy, hard, turnO, marks, squares = [], sparks = [], raf = 0, wait = 0, lastLine = null, stripTone = 0, S;
    function num(n) { return DIGITS[LANG] ? DIGITS[LANG].charAt(n) : String(n); }
    function label(i) {
      return t.square.replace('{r}', num(Math.floor(i / 3) + 1)).replace('{c}', num(i % 3 + 1))
                     .replace('{s}', board[i] === 'x' ? t.cross : board[i] === 'o' ? t.ring : t.empty);
    }
    function centre(i) { return { x: 300 + (i % 3 - 1) * 124, y: 300 + (Math.floor(i / 3) - 1) * 124 }; }
    function strip(line) {                  // Ali's idea: a thin strip of the site's scaffold on the winning marks
      var a = centre(line[0]), b = centre(line[2]), K = STRIP_W / 17, len = Math.hypot(b.x - a.x, b.y - a.y);
      var ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      var off = doc.createElement('canvas'); off.width = 600; off.height = 600; var o = off.getContext('2d');
      o.strokeStyle = rgba(S.tones[stripTone % 5], 0.9); o.lineWidth = STRIP_W; o.lineCap = 'round';
      o.beginPath(); o.moveTo(a.x - ux * 40, a.y - uy * 40); o.lineTo(b.x + ux * 40, b.y + uy * 40); o.stroke();
      o.globalCompositeOperation = 'destination-out';
      for (var q = 0, d = 4 * K; d < len + 78; q++, d += 11.5 * K) {    // its pores, two sizes, a little off the middle line
        var side = (q % 2 ? 1 : -1) * 2.6 * K, rr = (q % 3 ? 3.3 : 2.1) * K;
        o.beginPath(); o.arc(a.x - ux * 40 + ux * d - uy * side, a.y - uy * 40 + uy * d + ux * side, rr, 0, TAU); o.fill();
      }
      ctx.drawImage(off, 0, 0);
    }
    function draw(line, now) {
      S = SKIN[dark() ? 'dark' : 'light'];                              // the game follows the theme
      ctx.clearRect(0, 0, 600, 600);
      var g = ctx.createRadialGradient(300, 276, 0, 300, 300, 330);
      g.addColorStop(0, S.dish[0]); g.addColorStop(0.55, S.dish[1]); g.addColorStop(1, S.dish[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(300, 300, 290, 0, TAU); ctx.fill();
      var iri = ctx.createLinearGradient(0, 0, 600, 600);
      iri.addColorStop(0, '#B57BFF'); iri.addColorStop(0.35, '#5ED6C8'); iri.addColorStop(0.68, '#FF8A78'); iri.addColorStop(1, '#E6C36A');
      // the dish's own lines: four membranes (iridescent), three contour lines and three fibres, fainter than the table
      ctx.save(); ctx.beginPath(); ctx.arc(300, 300, 288, 0, TAU); ctx.clip(); ctx.lineCap = 'round';
      paths.forEach(function (p, i) {
        if (!p) return;
        if (i < 4) { ctx.strokeStyle = iri; ctx.lineWidth = 1.5; ctx.globalAlpha = S.lineA; }
        else { ctx.strokeStyle = S.contour; ctx.lineWidth = i < 7 ? 1 : 1.4; ctx.globalAlpha = S.contourK * [0.3, 0.2, 0.1, 0.3, 0.3, 0.2][i - 4]; }
        ctx.stroke(p);
      });
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.strokeStyle = iri; ctx.lineWidth = RIM_W; ctx.globalAlpha = S.rimA;
      ctx.beginPath(); ctx.arc(300, 300, 290 - RIM_W / 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = S.grid; ctx.lineWidth = GRID_W; ctx.lineCap = 'round';
      [238, 362].forEach(function (p) {
        ctx.beginPath(); ctx.moveTo(p, 122); ctx.lineTo(p, 478); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(122, p); ctx.lineTo(478, p); ctx.stroke();
      });
      for (var i = 0; i < 9; i++) {
        var c = centre(i), big = line && line.indexOf(i) >= 0 ? 1.12 : 1, k;
        if (board[i] === 'x') {                 // a cross of five cells
          cell(ctx, c.x, c.y, 10.5 * big, S.cross, 1);
          for (k = 0; k < 4; k++) cell(ctx, c.x + (k < 2 ? -1 : 1) * 25 * big, c.y + (k % 2 ? 1 : -1) * 25 * big, 10.5 * big, S.cross, 1);
        } else if (board[i] === 'o') {          // a ring of eight cells, in the next of the five colours
          for (k = 0; k < 8; k++) cell(ctx, c.x + Math.cos(k * TAU / 8) * 33 * big, c.y + Math.sin(k * TAU / 8) * 33 * big, 9 * big, S.tones[marks[i] % 5], 1);
        }
      }
      if (line) strip(line);                    // on the marks: it comes after they are placed
      if (now) sparks.forEach(function (s) {    // the celebration: cells that spring out and fade
        var p = (now - s.t0) / s.dur; if (p <= 0 || p >= 1) return;
        var e = 1 - Math.pow(1 - p, 3), a = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
        var sc = p < 0.55 ? 0.3 + 0.7 * (p / 0.55) : 1 - 0.3 * ((p - 0.55) / 0.45);
        cell(ctx, s.x + s.dx * e, s.y + s.dy * e, s.r * sc, S.tones[s.c], a);
      });
    }
    function burst(x, y, n, dMin, dSpan, dur, delay) {     // the site's pattern: the same cells every time, 6 to 11 units
      var t0 = performance.now() + delay;
      for (var k = 0; k < n; k++) {
        var angle = (k / n) * TAU + (k % 2 ? 0.18 : -0.12), dist = dMin + (k * 13) % dSpan;
        sparks.push({ x: x, y: y, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, r: 6 + (k * 7) % 6, c: k % 5, t0: t0 + (k % 3) * 20, dur: dur });
      }
    }
    function animate() {
      cancelAnimationFrame(raf);
      (function frame() {
        var now = performance.now();
        sparks = sparks.filter(function (s) { return now < s.t0 + s.dur; });
        draw(lastLine, now);
        if (sparks.length) raf = requestAnimationFrame(frame);
      })();
    }
    function celebrate(line) {                  // only when the visitor wins; nothing moves with reduced motion
      if (still) return;
      sparks = [];
      line.forEach(function (i, k) { var c = centre(i); burst(c.x, c.y, 8, 46, 30, 600, k * 130); });
      burst(300, 300, 26, 110, 120, 950, 420);
      animate();
    }
    function refresh(line) {
      lastLine = line; draw(line, 0);
      squares.forEach(function (s, i) { s.setAttribute('aria-label', label(i)); s.setAttribute('aria-disabled', board[i] || over ? 'true' : 'false'); });
    }
    function say(kind) { var list = t[kind]; var s = list[turn[kind] % list.length]; turn[kind]++; return s; }
    function end(w, before) {
      over = true;
      var kind = w.who === 'x' ? 'win' : w.who === 'o' ? 'lose' : 'draw';
      status.textContent = say(kind);
      note.textContent = hard ? t.hard : t.medium;
      live.textContent = (before ? before + ' ' : '') + status.textContent + ' ' + note.textContent;
      // the winner keeps the first move for as long as they win; after a draw the other side starts
      starter = kind === 'draw' ? (starter === 'x' ? 'o' : 'x') : w.who;
      if (w.line) stripTone = wins++;
      refresh(w.line);
      if (kind === 'win') celebrate(w.line);
    }
    function reply() {
      var k = cellsMove(board, hard);
      board[k] = 'o'; marks[k] = turnO++;
      busy = false;
      var w = winner(board), played = label(k) + '.';
      if (w) end(w, played); else { status.textContent = t.your_turn; live.textContent = played + ' ' + t.your_turn; refresh(null); }
    }
    function play(i) {
      if (over || busy || board[i]) return;
      board[i] = 'x';
      var w = winner(board);
      if (w) { end(w, ''); return; }
      busy = true; status.textContent = t.cells_turn; refresh(null);
      if (still) reply(); else wait = setTimeout(reply, 520);
    }
    function start() {
      cancelAnimationFrame(raf); clearTimeout(wait); sparks = [];
      board = ['', '', '', '', '', '', '', '', '']; marks = {}; turnO = Math.floor(Math.random() * 5);
      over = false; busy = false;
      hard = Math.random() < 0.5;               // each round medium or impossible, at random
      note.textContent = '';
      if (starter === 'o') {
        busy = true; status.textContent = t.cells_start; live.textContent = t.cells_start; refresh(null);
        if (still) reply(); else wait = setTimeout(reply, 700);
      } else { status.textContent = t.your_turn; live.textContent = ''; refresh(null); }
    }
    for (var i = 0; i < 9; i++) (function (i) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'ttt-sq';
      b.addEventListener('click', function () { play(i); });
      b.addEventListener('keydown', function (ev) {
        var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[ev.key];
        if (!d) return;
        if ((d === -1 && i % 3 === 0) || (d === 1 && i % 3 === 2)) return;
        var n = i + d; if (n < 0 || n > 8) return;
        ev.preventDefault(); squares[n].focus();
      });
      grid.appendChild(b); squares.push(b);
    })(i);
    $('[data-again]').addEventListener('click', function () { start(); squares[4].focus(); });
    Array.prototype.forEach.call(box.querySelectorAll('[data-close]'), function (c) { c.addEventListener('click', onClose); });
    start();
    if (window.SiteArt) window.SiteArt.lines(function (drawn) {
      paths = drawn.map(function (d) { try { return new Path2D(d); } catch (e) { return null; } });
      if (!sparks.length) draw(lastLine, 0);
    });
    return { squares: squares, redraw: function () { draw(lastLine, 0); }, stop: function () { cancelAnimationFrame(raf); clearTimeout(wait); } };
  }

  var openNow = null;
  function open(opener) {
    if (openNow) return;
    var back = doc.createElement('div'); back.className = 'ttt-back';
    var box = doc.createElement('div'); box.className = 'ttt';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'ttt-title');
    box.lang = LANG; box.dir = LANG === 'en' ? 'ltr' : 'rtl';
    back.appendChild(box); doc.body.appendChild(back);
    // the page behind is out of reach while the panel is open (keyboard, pointer and screen readers)
    var behind = Array.prototype.filter.call(doc.body.children, function (el) { return el !== back && !el.hasAttribute('inert') && /^(HEADER|MAIN|FOOTER|A|DIV)$/.test(el.tagName); });
    behind.forEach(function (el) { el.setAttribute('inert', ''); });
    var game;
    function close() {
      game.stop(); openNow = null;
      behind.forEach(function (el) { el.removeAttribute('inert'); });
      back.parentNode.removeChild(back);
      doc.removeEventListener('keydown', key, true);
      if (scheme && scheme.removeEventListener) scheme.removeEventListener('change', game.redraw);
      if (opener && opener.focus) opener.focus();
    }
    function key(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
      if (ev.key !== 'Tab') return;                       // the keyboard stays inside the panel while it is open
      var f = box.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
      if (!box.contains(doc.activeElement)) { ev.preventDefault(); first.focus(); }
      else if (ev.shiftKey && doc.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && doc.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
    doc.addEventListener('keydown', key, true);
    // a press outside the panel closes it: on the click, so that the keyboard's place, given back to the door, stays there
    var pressed = null;
    back.addEventListener('pointerdown', function (ev) { pressed = ev.target; });
    back.addEventListener('click', function (ev) { if (ev.target === back && pressed === back) close(); });
    game = build(box, close);
    var scheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (scheme && scheme.addEventListener) scheme.addEventListener('change', game.redraw);
    openNow = close;
    game.squares[4].focus();
  }
  window.SiteGame = { open: open };         // site.js calls it when a door's button is pressed
})();
