/* The pages of their own (learn/...): the picture at the top of each page, drawn in the specimen dish of the
   home page and the page-not-found page. Each page has its own (its canvas names it: data-art).

   Books & Guidelines (Ali's choice, 27 October 2026, the second of three ideas he compared; the others are
   kept in the project's archive and in artifacts\books-pictures): a shelf appears in the dish, and one pale
   cell divides again and again; the cells take their colours and stack up on the shelf into books of
   different heights, in the site's five colours, the rows nearest the shelf first, the way tissue grows on a
   scaffold. The books' covers appear around them, and at the end the gold book leans out of the row. The
   row reads the way the page does: on the English page it starts at the left and the gold book stands at its
   right end; on the Persian and Arabic pages the other way round.

   It plays once when the page opens (about five seconds) and then rests on its last frame, so nothing keeps
   moving while people read. With reduced motion, the last frame shows straight away. It is decoration only:
   hidden from screen readers, and the page's text never depends on it. */
(function () {
  'use strict';
  var SIZE = 600;                      // drawing units: the dish is 600 x 600, centre at 300, 300
  var TAU = Math.PI * 2;
  // the five print colours, lit for the dark dish, and the pale colour of a cell before it takes its own
  var COLORS = { pale: '#EFE8F8', teal: '#5ED6C8', coral: '#FF8A78', magenta: '#F07BBE', gold: '#E6C36A', violet: '#B98CFF' };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------- shared helpers
  // A repeatable "random" sequence, so the cells take the same paths every time.
  function seeded(n) {
    return function () { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; };
  }
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function clamp01(p) { return p < 0 ? 0 : p > 1 ? 1 : p; }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, p) { return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function bez(a, b, c, d, p) {
    var q = 1 - p;
    return q * q * q * a + 3 * q * q * p * b + 3 * q * p * p * c + p * p * p * d;
  }

  // One cell, as on the page-not-found page: a soft glow, a translucent body with its membrane, and a nucleus.
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

  // A colony: one pale cell at the centre divides again and again, and each cell travels to its place.
  // places: where the cells end, each { x, y, r, color, and if it isn't the usual: arrive (time), keep (its
  // colour from the start), detour (two points of a long way round), late (drawn by the picture itself) }.
  // The places without a fixed order form a family tree: cell i divides into cells 2i+1 and 2i+2; each branch
  // gets one part of the picture (the places split in two, again and again), so cells that divide stay close.
  // opts.extra: places for cells born after the tree's (in order), such as the bookmark.
  function colony(places, opts) {
    opts = opts || {};
    var rnd = seeded(opts.seed || 7);
    var R0 = opts.r0 || 7;                       // a cell's size while it divides
    var n = places.length;
    var order = [];
    function size(i) { return i < n ? 1 + size(2 * i + 1) + size(2 * i + 2) : 0; }
    function assign(i, pts) {
      if (i >= n || !pts.length) return;
      var cx = 0, cy = 0;
      pts.forEach(function (q) { cx += q.x; cy += q.y; });
      cx /= pts.length; cy /= pts.length;
      var best = 0;
      pts.forEach(function (q, k) { if (Math.hypot(q.x - cx, q.y - cy) < Math.hypot(pts[best].x - cx, pts[best].y - cy)) best = k; });
      order[i] = pts[best];
      var rest = pts.filter(function (q, k) { return k !== best; });
      var xs = rest.map(function (q) { return q.x; }), ys = rest.map(function (q) { return q.y; });
      var wide = Math.max.apply(null, xs.concat([0])) - Math.min.apply(null, xs.concat([600])) >= Math.max.apply(null, ys.concat([0])) - Math.min.apply(null, ys.concat([600]));
      rest.sort(function (a, b) { return wide ? a.x - b.x : a.y - b.y; });
      var left = size(2 * i + 1);
      assign(2 * i + 1, rest.slice(0, left));
      assign(2 * i + 2, rest.slice(left));
    }
    assign(0, places);
    order = order.concat(opts.extra || []);
    var pale = rgb(COLORS.pale);
    var cells = order.map(function (t, i) {
      var gen = Math.floor(Math.log(i + 1) / Math.LN2);
      return {
        target: t,
        parent: i ? (i - 1) >> 1 : -1,
        born: (opts.born || 0.15) + gen * (opts.step || 0.19),
        arrive: t.arrive != null ? t.arrive : (opts.from || 2.35) + rnd() * (opts.spread || 0.95),
        split: rnd() * TAU,
        bend: (rnd() - 0.5) * 110
      };
    });
    // Where a cell is at time t. It starts just beside where its parent was when it was born, as if it had
    // divided off, then travels to its place along a gentle curve (or its long way round).
    var starts = [];
    function startOf(i) {
      if (starts[i]) return starts[i];
      var c = cells[i];
      if (!i) return (starts[i] = { x: 300, y: 300 });
      var from = at(c.parent, c.born);
      return (starts[i] = { x: from.x + Math.cos(c.split) * R0 * 1.6, y: from.y + Math.sin(c.split) * R0 * 1.6 });
    }
    function progress(i, t) { var c = cells[i]; return ease(clamp01((t - c.born) / (c.arrive - c.born))); }
    function at(i, t) {
      var c = cells[i], s = startOf(i), e = progress(i, t), d = c.target.detour;
      if (d) return { x: bez(s.x, d[0].x, d[1].x, c.target.x, e), y: bez(s.y, d[0].y, d[1].y, c.target.y, e) };
      var dx = c.target.x - s.x, dy = c.target.y - s.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var arc = Math.sin(Math.PI * e) * c.bend * Math.min(1, len / 200);
      return { x: s.x + dx * e - dy / len * arc, y: s.y + dy * e + dx / len * arc };
    }
    // How a cell looks at time t: it grows to full size when born, takes its colour on the way to its place
    // (pale until then, unless it keeps its colour), and settles with a small swell when it arrives.
    function look(i, t) {
      var c = cells[i], e = progress(i, t);
      var grown = clamp01((t - c.born) / 0.35);
      var since = t - c.arrive;
      var swell = since >= 0 ? 1 + 0.12 * Math.max(0, 1 - since / 0.5) * Math.sin(since * 14) : 1;
      var p = at(i, t);
      return {
        x: p.x, y: p.y, e: e,
        r: (R0 + (c.target.r - R0) * e) * (0.55 + 0.45 * grown) * swell,
        color: c.target.keep ? c.target.color : mix(pale, c.target.color, Math.pow(e, 0.8)),
        alpha: 0.35 + 0.65 * grown
      };
    }
    // Draws the cells born by time t; the late ones are returned for the picture to draw itself.
    function draw(ctx, t) {
      var late = [];
      for (var i = 0; i < cells.length; i++) {
        if (t < cells[i].born) continue;
        var l = look(i, t);
        if (cells[i].target.late) { l.target = cells[i].target; late.push(l); continue; }
        cell(ctx, l.x, l.y, l.r, l.color, l.alpha);
      }
      return late;
    }
    return { cells: cells, at: at, look: look, draw: draw, progress: progress };
  }

  var kit = { SIZE: SIZE, TAU: TAU, COLORS: COLORS, seeded: seeded, ease: ease, clamp01: clamp01, rgb: rgb, mix: mix,
              rgba: rgba, bez: bez, cell: cell, colony: colony };      // (and the pictures, below: for review copies)

  // ---------------------------------------------------------------- Books & Guidelines: a shelf that grows
  function shelf(ctx, dir) {
    var rnd = seeded(77);
    var SHELF = 418;                                  // the top of the shelf
    // The books, from the start of the row (the left in English): width, height and colour. The last, gold,
    // stands a little apart and leans on its neighbour at the end.
    var BOOKS = [[36, 190, COLORS.teal], [30, 218, COLORS.coral], [42, 168, COLORS.magenta], [32, 232, COLORS.violet],
                 [38, 198, COLORS.teal], [30, 162, COLORS.coral], [40, 210, COLORS.magenta], [34, 184, COLORS.gold]];
    var GAP = 3, LEAN_GAP = 40;
    var total = BOOKS.reduce(function (s, b) { return s + b[0]; }, 0) + GAP * (BOOKS.length - 2) + LEAN_GAP;
    var x = 300 - total / 2;
    var books = BOOKS.map(function (b, k) {
      var o = { w: b[0], h: b[1], color: rgb(b[2]), gold: k === BOOKS.length - 1 };
      o.x = x;                                       // its left edge in English; mirrored for Persian and Arabic
      x += b[0] + (k === BOOKS.length - 2 ? LEAN_GAP : GAP);
      if (dir < 0) o.x = 600 - o.x - o.w;
      return o;
    });
    // The gold book's lean: it tips on its bottom corner nearest the row, until its top rests on its neighbour.
    var gold = books[books.length - 1];
    var pivot = { x: dir > 0 ? gold.x : gold.x + gold.w, y: SHELF };
    var LEAN = -dir * Math.asin(LEAN_GAP / gold.h);   // radians: the top tips towards the row
    function leanAt(t) { return LEAN * ease(clamp01((t - 4.05) / 0.75)); }
    function turn(p, a) {
      var s = Math.sin(a), c = Math.cos(a), dx = p.x - pivot.x, dy = p.y - pivot.y;
      return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c };
    }
    // Each book is a little grid of cells; the rows nearest the shelf settle first, so the books grow upwards.
    var places = [];
    var STEP = 14;
    books.forEach(function (b) {
      var cols = Math.max(2, Math.round((b.w - 8) / STEP)), rows = Math.round((b.h - 22) / STEP);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var px = b.x + b.w / 2 + (c - (cols - 1) / 2) * ((b.w - 14) / Math.max(1, cols - 1));
          var py = SHELF - 13 - r * STEP;
          places.push({ x: px + (rnd() - 0.5) * 1.4, y: py + (rnd() - 0.5) * 1.4, r: 5, color: b.color, late: b.gold,
                        arrive: 2.05 + 1.25 * (r / 16) + rnd() * 0.18 + (b.gold ? 0.35 : 0) });
        }
      }
    });
    var cells = colony(places, { seed: 31, r0: 6.5 });

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    function cover(b, a) {                           // a book's outline, its tint and two bands on its spine
      roundRect(b.x, SHELF - b.h, b.w, b.h, 4);
      ctx.fillStyle = rgba(b.color, 0.16 * a);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + 0.55 * a + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + 0.45 * a + ')';
      ctx.lineWidth = 1.2;
      [16, b.h - 12].forEach(function (d) {
        ctx.beginPath(); ctx.moveTo(b.x + 4, SHELF - d); ctx.lineTo(b.x + b.w - 4, SHELF - d); ctx.stroke();
      });
    }
    function frame(t) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      // a soft shadow behind the row, so it stands out from the dish's own membranes
      var a0 = clamp01((t - 1.0) / 1.2);
      if (a0 > 0) {
        var shade = ctx.createRadialGradient(300, 330, 30, 300, 330, 270);
        shade.addColorStop(0, 'rgba(12,6,24,' + 0.5 * a0 + ')');
        shade.addColorStop(1, 'rgba(12,6,24,0)');
        ctx.fillStyle = shade;
        ctx.beginPath(); ctx.arc(300, 330, 270, 0, TAU); ctx.fill();
        // the shelf: a plank with its front edge, appearing before the books grow on it
        ctx.fillStyle = 'rgba(185,140,255,' + 0.16 * a0 + ')';
        ctx.fillRect(112, SHELF, 376, 12);
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * a0 + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(112, SHELF); ctx.lineTo(488, SHELF); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.3 * a0 + ')';
        ctx.beginPath(); ctx.moveTo(112, SHELF + 12); ctx.lineTo(488, SHELF + 12); ctx.stroke();
      }
      var a1 = clamp01((t - 2.9) / 0.9);
      books.forEach(function (b) { if (!b.gold && a1 > 0) cover(b, a1); });
      var late = cells.draw(ctx, t);
      // the gold book: its cover and its cells, leaning at the end
      var lean = leanAt(t);
      ctx.save();
      ctx.translate(pivot.x, pivot.y); ctx.rotate(lean); ctx.translate(-pivot.x, -pivot.y);
      var a2 = clamp01((t - 3.3) / 0.8);
      if (a2 > 0) cover(gold, a2);
      ctx.restore();
      late.forEach(function (l) {
        var p = turn(l, lean);
        cell(ctx, p.x, p.y, l.r, l.color, l.alpha);
      });
    }
    return { duration: 5.0, frame: frame };
  }

  // ---------------------------------------------------------------- playing a picture
  kit.shelf = shelf;
  var ART = { reading: shelf };
  var ideas = window.pageArtIdeas || {};          // review copies can bring other pictures (see their page)
  Object.keys(ideas).forEach(function (k) { ART[k] = function (ctx, dir) { return ideas[k](ctx, dir, kit); }; });

  function Dish(canvas) {
    var make = ART[canvas.getAttribute('data-art')];
    if (!make || !canvas.getContext) return null;
    var ctx = canvas.getContext('2d');
    var dir = (canvas.closest('[dir]') || document.documentElement).getAttribute('dir') === 'rtl' ? -1 : 1;
    var art = make(ctx, dir);
    var raf = null, elapsed = 0, last = 0;
    function fit() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var px = Math.round((canvas.clientWidth || SIZE) * ratio);
      if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
      ctx.setTransform(px / SIZE, 0, 0, px / SIZE, 0, 0);
    }
    function tick(now) {
      raf = null;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;   // a hidden tab doesn't count
      last = now;
      elapsed += dt;
      fit();
      art.frame(Math.min(elapsed, art.duration));
      if (elapsed < art.duration) raf = window.requestAnimationFrame(tick);
    }
    function play() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
      elapsed = 0;
      last = 0;
      fit();
      if (reduce || !window.requestAnimationFrame) { art.frame(art.duration); return; }
      art.frame(0);
      raf = window.requestAnimationFrame(tick);
    }
    window.addEventListener('resize', function () { if (!raf) { fit(); art.frame(Math.min(elapsed, art.duration) || art.duration); } });
    play();
    // For review copies and the automatic checks: play again, or draw the picture at a given moment.
    return { play: play, duration: art.duration,
             draw: function (t) { if (raf) window.cancelAnimationFrame(raf); raf = null; elapsed = t; fit(); art.frame(t); } };
  }

  function setup(root) {
    var list = [];
    Array.prototype.forEach.call(root.querySelectorAll('.page-cells'), function (canvas) {
      var d = Dish(canvas);
      if (d) list.push(d);
    });
    return list;
  }
  var dishes = setup(document);
  window.pageArt = dishes[0];
  window.pageArts = dishes;
  window.pageArtSetup = setup;                    // review copies: start their pictures again after changing them
})();
