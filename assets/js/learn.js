/* The pages of their own (learn/...) and, since version 3.01, the page Accessibility: the picture at the top of
   each page, drawn in the specimen dish of the home page and the page-not-found page. Each page has its own (its
   canvas names it: data-art): Books & Guidelines a shelf, Standards in Medicine (since version 3.00) a seal, and
   since version 3.01 Inside Medical Devices a look inside a medical device (a heartbeat on its screen and a
   magnifying glass), Inside a LINAC the machine from the side, Accessibility the accessibility sign, and the Site Map
   a pin landing on a map; see each one below.

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

  // ---------------------------------------------------------------- Standards in Medicine: a seal of cells
  // (since version 3.00; Ali's choice of three ideas, 28 October 2026, who kept its straight tick after comparing
  // three curved ones): one pale cell divides again and again, and the cells settle into a ring in the five
  // families' colours, drawn round from the top the way the page reads (clockwise in English, the other way in
  // Persian and Arabic), like a seal of approval; two thin edges close round it, and the last cells draw a tick
  // inside it, stroke by stroke. The tick is the same in every language.
  function seal(ctx, dir) {
    var rnd = seeded(53);
    var TONES = [COLORS.teal, COLORS.coral, COLORS.magenta, COLORS.gold, COLORS.violet];
    var RING = 40, R = 192;
    var places = [];
    for (var k = 0; k < RING; k++) {
      var a = -Math.PI / 2 + dir * (k / RING) * TAU;
      places.push({ x: 300 + Math.cos(a) * R + (rnd() - 0.5) * 2, y: 300 + Math.sin(a) * R + (rnd() - 0.5) * 2, r: 9,
                    color: rgb(TONES[Math.floor(k / (RING / TONES.length))]), arrive: 2.0 + 1.45 * (k / RING) + rnd() * 0.1 });
    }
    // the tick: a short stroke down to its corner, then a long one up, a cell every 14 units or so
    var TICK = [{ x: 226, y: 300 }, { x: 278, y: 354 }, { x: 386, y: 236 }];
    var dots = [];
    for (var s = 0; s < 2; s++) {
      var p0 = TICK[s], p1 = TICK[s + 1];
      var n = Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 14);
      for (var i = s ? 1 : 0; i <= n; i++) dots.push({ x: p0.x + (p1.x - p0.x) * i / n, y: p0.y + (p1.y - p0.y) * i / n });
    }
    var white = rgb('#FFFFFF');
    dots.forEach(function (d, i) {
      places.push({ x: d.x, y: d.y, r: 8, color: white, arrive: 3.7 + 0.85 * (i / (dots.length - 1)) });
    });
    var cells = colony(places, { seed: 19, r0: 7 });
    function frame(t) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      // the seal's two thin edges, once the ring has closed
      var a0 = clamp01((t - 3.35) / 0.8);
      if (a0 > 0) {
        ctx.lineWidth = 1.4;
        [R - 26, R + 26].forEach(function (rr) {
          ctx.strokeStyle = 'rgba(255,255,255,' + 0.42 * a0 + ')';
          ctx.beginPath(); ctx.arc(300, 300, rr, 0, TAU); ctx.stroke();
        });
      }
      cells.draw(ctx, t);
    }
    return { duration: 5.0, frame: frame };
  }

  // ---------------------------------------------------------------- the device pictures (since version 3.01)
  // The device tutorials share one family of pictures (Ali's choice, 31 October and 1 November 2026, from version 2 of
  // the picture ideas for "Inside a LINAC"): each device is drawn as you'd meet it, standing on the same floor line at
  // the same size in the dish, in cells along its outline, in its page's colour (its group's: teal for the LINAC), with
  // a little white or colour where it meets the patient, who lies in pale cells; then one movement shows what the
  // device does, in the site's five colours; about five seconds, once, resting on the last frame. Every cell is "late"
  // (the colony hands them back undrawn), so each picture draws its parts back to front: a part in front hides what is
  // behind it. (The section's own page had one of this family too, five machines round one patient, in orange, until
  // Ali chose "Look inside" for it on 2 November 2026: see below.)

  // An outline through the corners pts ([x, y], or [x, y, r] to round that corner), as a dense list of [x, y] points:
  // the cells sit along it, and the part's thin edge and faint fill are drawn through it.
  function outline(pts, closed) {
    var out = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var p = pts[i], r = p[2] || 0;
      if (!r || (!closed && (i === 0 || i === n - 1))) { out.push([p[0], p[1]]); continue; }
      var a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      var ux = p[0] - a[0], uy = p[1] - a[1], lu = Math.hypot(ux, uy);
      var vx = b[0] - p[0], vy = b[1] - p[1], lv = Math.hypot(vx, vy);
      ux /= lu; uy /= lu; vx /= lv; vy /= lv;
      var turn = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      if (Math.abs(turn) < 1e-3) { out.push([p[0], p[1]]); continue; }
      var cut = Math.min(r * Math.tan(Math.abs(turn) / 2), lu / 2, lv / 2);
      r = cut / Math.tan(Math.abs(turn) / 2);
      var sx = p[0] - ux * cut, sy = p[1] - uy * cut, side = turn > 0 ? 1 : -1;
      var cx = sx - uy * r * side, cy = sy + ux * r * side, a0 = Math.atan2(sy - cy, sx - cx);
      var steps = Math.max(2, Math.ceil(Math.abs(turn) / 0.15));
      for (var k = 0; k <= steps; k++) out.push([cx + Math.cos(a0 + turn * k / steps) * r, cy + Math.sin(a0 + turn * k / steps) * r]);
    }
    if (closed) out.push([out[0][0], out[0][1]]);
    return out;
  }
  // A circle (or part of one) as a dense outline, from angle a0 to a1 (radians, 0 = to the right, clockwise on screen).
  function arcLine(cx, cy, r, a0, a1) {
    var out = [], steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 4));
    for (var k = 0; k <= steps; k++) { var a = a0 + (a1 - a0) * k / steps; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  }
  // Evenly spaced points along a dense outline, about gap apart, each with s: how far along it is (0 to 1).
  function spaced(line, gap, closed) {
    var lens = [], total = 0, i;
    for (i = 1; i < line.length; i++) { var l = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); lens.push(l); total += l; }
    var n = Math.max(1, Math.round(total / gap)), out = [], j = 0, acc = 0;
    for (var k = 0; k < (closed ? n : n + 1); k++) {
      var want = total * k / n;
      while (j < lens.length - 1 && acc + lens[j] < want) { acc += lens[j]; j++; }
      var f = lens[j] ? Math.min(1, Math.max(0, (want - acc) / lens[j])) : 0;
      out.push({ x: line[j][0] + (line[j + 1][0] - line[j][0]) * f, y: line[j][1] + (line[j + 1][1] - line[j][1]) * f, s: k / n });
    }
    return out;
  }
  // A loose honeycomb of points inside a shape (test), its rows centred on ox, oy.
  function honeycomb(test, gap, ox, oy) {
    var out = [];
    for (var row = -30; row <= 30; row++) {
      var y = oy + row * gap * 0.87;
      for (var m = -30; m <= 30; m++) {
        var x = ox + (m + (row & 1 ? 0.5 : 0)) * gap;
        if (test(x, y)) out.push({ x: x, y: y, row: row, col: m });
      }
    }
    return out;
  }

  // What every device picture shares: the ground, the couch and the patient, and how its parts are drawn. tone: the
  // device's colour (its page's).
  function family(ctx, dir, tone) {
    var F = { FLOOR: 470, I: { x: 300, y: 272 }, BODY: { x: 300, y: 272, a: 56, b: 36 } };
    F.MAIN = rgb(COLORS[tone]); F.WHITE = rgb('#FFFFFF'); F.PALE = rgb(COLORS.pale);
    F.TONES = [COLORS.teal, COLORS.coral, COLORS.magenta, COLORS.gold, COLORS.violet].map(rgb);
    F.X = function (x) { return dir > 0 ? x : 600 - x; };                 // mirrored on the Persian and Arabic pages
    F.flip = function (line) { return line.map(function (p) { return [F.X(p[0]), p[1]]; }); };
    F.trace = function (line, closed) {
      ctx.beginPath();
      line.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      if (closed) ctx.closePath();
    };
    // The ground, the same in every picture: a soft shade behind the drawing, so it stands out from the dish's own
    // membranes, and the floor line the device stands on; both appear first, as the shelf does on Books & Guidelines.
    F.ground = function (t) {
      var a = clamp01((t - 0.5) / 0.9);
      if (a <= 0) return;
      var shade = ctx.createRadialGradient(300, 300, 40, 300, 300, 282);
      shade.addColorStop(0, 'rgba(12,6,24,' + 0.6 * a + ')');
      shade.addColorStop(1, 'rgba(12,6,24,0)');
      ctx.fillStyle = shade;
      ctx.beginPath(); ctx.arc(300, 300, 282, 0, TAU); ctx.fill();
      var g = ctx.createLinearGradient(80, 0, 520, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.2, 'rgba(255,255,255,' + 0.5 * a + ')');
      g.addColorStop(0.8, 'rgba(255,255,255,' + 0.5 * a + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(80, F.FLOOR); ctx.lineTo(520, F.FLOOR); ctx.stroke();
    };
    // A part of the device, once its cells are in place: its faint fill and thin edge. o.solid: a dark fill first,
    // which hides what is behind the part; o.open: the edge is left open (at the floor).
    F.part = function (line, a, o) {
      o = o || {};
      if (a <= 0) return;
      F.trace(line, true);
      if (o.solid) { ctx.fillStyle = 'rgba(16,8,32,' + o.solid * a + ')'; ctx.fill(); }
      ctx.fillStyle = rgba(o.color || F.MAIN, (o.fill == null ? 0.12 : o.fill) * a);
      ctx.fill();
      if (o.open) F.trace(line, false);
      ctx.strokeStyle = 'rgba(255,255,255,' + (o.edge == null ? 0.5 : o.edge) * a + ')';
      ctx.lineWidth = o.width || 1.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    // Cells along an outline: places for the colony, arriving in order along it (from the floor up, or round the
    // way the page reads), so the outline seems to be drawn. o.kind names the part, for drawing back to front.
    F.beads = function (places, line, gap, o) {
      spaced(line, gap, o.closed).forEach(function (p) {
        places.push({ x: p.x, y: p.y, r: o.r || 6, color: o.white && o.white(p) ? F.WHITE : (o.color || F.MAIN),
                      arrive: o.from + o.span * p.s + o.rnd() * 0.06, late: true, kind: o.kind });
      });
    };
    // Draws the cells of the given parts (kinds), as they are at this moment; move(l) may place one elsewhere, or
    // give it another colour.
    F.draw = function (looks, kinds, move, alpha) {
      looks.forEach(function (l) {
        if (kinds.indexOf(l.target.kind) < 0) return;
        var p = move ? move(l) : l;
        if (p) cell(ctx, p.x, p.y, p.r || l.r, p.color || l.color, l.alpha * (alpha || 1));
      });
    };
    // The couch, the same in every front view: its top under the patient and its column down to the floor.
    F.PLANK = outline([[238, 310, 5], [362, 310, 5], [362, 324, 5], [238, 324, 5]], true);
    F.COLUMN = outline([[290, 324], [310, 324], [310, F.FLOOR], [290, F.FLOOR]], true);
    F.FOOT = outline([[262, 463, 3], [338, 463, 3], [338, F.FLOOR], [262, F.FLOOR]], true);
    F.couch = function (places, rnd, from) {
      F.beads(places, [[300, 458], [300, 336]], 15.5, { rnd: rnd, from: from, span: 0.25, r: 5.6, kind: 'couch' });
      F.beads(places, F.flip([[246, 317], [354, 317]]), 15.5, { rnd: rnd, from: from + 0.25, span: 0, r: 5.6, kind: 'couch' });
    };
    F.couchParts = function (a) {
      F.part(F.FOOT, a, { solid: 0.8, fill: 0.12, edge: 0.4 });
      F.part(F.COLUMN, a, { solid: 0.8, fill: 0.12, edge: 0.4 });
      F.part(F.PLANK, a, { solid: 0.8, fill: 0.16, edge: 0.55 });
    };
    // The patient, the same in every front view: the body in cross-section, pale cells in a loose honeycomb, drawn
    // paler than the device (F.PATIENT).
    F.PATIENT = 0.6;
    F.body = function (places, rnd, from) {
      var B = F.BODY;
      honeycomb(function (x, y) {
        var dx = (x - B.x) / (B.a - 7), dy = (y - B.y) / (B.b - 7);
        return dx * dx + dy * dy <= 1;
      }, 14, B.x, B.y).forEach(function (p) {
        places.push({ x: F.X(p.x) + (rnd() - 0.5) * 2.4, y: p.y + (rnd() - 0.5) * 2.4, r: 5.4, color: F.PALE,
                      arrive: from + 0.3 * rnd(), late: true, kind: 'body' });
      });
    };
    F.skin = function (a) {                                  // the body's thin edge
      if (a <= 0) return;
      var B = F.BODY;
      ctx.fillStyle = 'rgba(239,232,248,' + 0.06 * a + ')';
      ctx.strokeStyle = 'rgba(239,232,248,' + 0.45 * a + ')';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(F.X(B.x), B.y, B.a, B.b, 0, 0, TAU); ctx.fill(); ctx.stroke();
    };
    // light that adds up where it overlaps: the glow round a target
    F.glow = function (x, y, r, a) {
      var g = ctx.createRadialGradient(x, y, 3, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, a) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    };
    return F;
  }

  // ---------------------------------------------------------------- Inside Medical Devices: look inside
  // (Ali's choice, 2 November 2026, of the review page "Inside Medical Devices Pictures": Claude's "Look inside", with a
  // heartbeat on the screen at Claude's suggestion and a small magenta heart at its top left, Ali's idea; in the site's
  // five colours, like the shelf and the seal, not in the section's orange; it took the place of five machines round
  // one patient.) A medical device appears in pale cells: its case, a wide screen at the top and three knobs at the end
  // of the page's line. The screen comes on: a small magenta heart at its top left, then a heartbeat drawn across it in
  // teal. A magnifying glass forms at the start of the page's line and glides over the middle of the device, and
  // through it you see the inside: a chip (coral), a gear (teal), a coil (magenta), a battery (gold), a fan and the
  // lines between them (violet). At the end the heartbeat lights up twice and the heart flashes with each beat; with
  // the second a light blinks on the chip, and the gear turns a little. The screen is the monitor's own, so the
  // heartbeat and the heart are the same way round on every page (mirrored, a heartbeat would run backwards in time);
  // the rest is mirrored on the Persian and Arabic pages, where the glass comes from the right.
  function lookInside(ctx, dir) {
    var X = function (x) { return dir > 0 ? x : 600 - x; };
    var T = [COLORS.teal, COLORS.coral, COLORS.magenta, COLORS.gold, COLORS.violet].map(rgb);
    var PALE = [178, 164, 214], WHITE = [255, 255, 255];          // the case a quiet lavender, the glass white
    var rnd = seeded(97);
    // a rounded rectangle as a dense outline, from the middle of its top edge, clockwise
    function rounded(x0, y0, x1, y1, r) {
      var pts = [[(x0 + x1) / 2, y0]];
      [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]].forEach(function (q) {
        for (var k = 0; k <= 8; k++) { var a = q[2] + (Math.PI / 2) * k / 8; pts.push([q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r]); }
      });
      pts.push([(x0 + x1) / 2, y0]);
      return pts;
    }
    function glow(x, y, r, color, a) {                            // light that adds up where it overlaps
      var g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, rgba(color, Math.min(1, a)));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    var places = [];
    // the device: its case, a wide screen at the top and three knobs at the end of the line, in pale cells
    spaced(rounded(150, 156, 450, 448, 28), 13, true).forEach(function (p) {
      places.push({ x: X(p.x), y: p.y, r: 5, color: PALE, arrive: 1.8 + 0.7 * p.s + rnd() * 0.04 });
    });
    spaced(rounded(176, 182, 424, 266, 12), 12.5, true).forEach(function (p) {
      places.push({ x: X(p.x), y: p.y, r: 4.2, color: PALE, arrive: 2.1 + 0.45 * p.s + rnd() * 0.04 });
    });
    [316, 356, 396].forEach(function (y, i) { places.push({ x: X(404), y: y, r: 10, color: PALE, arrive: 2.5 + 0.08 * i }); });
    // the screen: the heartbeat, two beats from left to right, the same way round on every page
    function ecg(p) {
      var y = 0;
      if (p > 0.06 && p < 0.16) y -= 5 * Math.sin(Math.PI * (p - 0.06) / 0.1);
      if (p >= 0.24 && p < 0.26) y += 6 * (p - 0.24) / 0.02;
      else if (p >= 0.26 && p < 0.29) y += 6 - 40 * (p - 0.26) / 0.03;
      else if (p >= 0.29 && p < 0.32) y += -34 + 44 * (p - 0.29) / 0.03;
      else if (p >= 0.32 && p < 0.34) y += 10 - 10 * (p - 0.32) / 0.02;
      if (p > 0.46 && p < 0.64) y -= 9 * Math.sin(Math.PI * (p - 0.46) / 0.18);
      return y;
    }
    var EL = 194, EW = 212, EY = 234, beat = [];
    for (var e = 0; e <= 600; e++) { var es = e / 600; beat.push([EL + EW * es, EY + ecg(((2 * es + 0.75) % 1 + 1) % 1)]); }
    spaced(beat, 6.5).forEach(function (p) {
      places.push({ x: p.x, y: p.y, r: 3.4, color: T[0], arrive: 2.6 + 0.8 * (p.x - EL) / EW + rnd() * 0.02 });
    });
    var PEAKS = [0.27, 0.77].map(function (s) { return { x: EL + EW * s, y: EY - 34 }; });
    // and a small magenta heart at its top left, in cells, as a monitor shows one beside the heartbeat
    var HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], HG = 4.8, HC = { x: 207, y: 206 };
    HEART.forEach(function (row, r) {
      row.split('').forEach(function (ch, c) {
        if (ch === 'X') places.push({ x: HC.x + (c - 3) * HG, y: HC.y + (r - 2.5) * HG, r: 2.8, color: T[2], arrive: 2.5 + 0.012 * (r * 7 + c) });
      });
    });
    // the glass: its rim and its handle, in white, at the start of the page's line, ready to glide in
    var LR = 74, S0 = { x: X(186), y: 356 }, S1 = { x: X(300), y: 356 };
    var rim = [];
    for (var k = 0; k <= 72; k++) { var ra = -Math.PI / 2 + dir * TAU * k / 72; rim.push([S0.x + Math.cos(ra) * LR, S0.y + Math.sin(ra) * LR]); }
    spaced(rim, 10.5, true).forEach(function (p) { places.push({ x: p.x, y: p.y, r: 5, color: WHITE, arrive: 2.45 + 0.4 * p.s, late: true }); });
    var HX = dir * Math.cos(Math.PI / 4), HY = Math.sin(Math.PI / 4);   // the handle, down towards the end of the line
    for (var h = 0; h < 7; h++) {
      var d = LR + 10 + h * 9;
      places.push({ x: S0.x + HX * d, y: S0.y + HY * d, r: 7, color: WHITE, arrive: 2.75 + 0.03 * h, late: true });
    }
    var cells = colony(places, { seed: 21, r0: 6.5, step: 0.17 });
    // the inside, seen only through the glass
    var INSIDE = [], DY = 94;
    function part(color, r, pts) { pts.forEach(function (p) { INSIDE.push({ x: X(p[0]), y: p[1], r: r, color: color }); }); }
    function along(line, gap) { return spaced(line, gap).map(function (p) { return [p.x, p.y]; }); }
    var chip = [];
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) chip.push([300 + i * 12.5, 262 + DY + j * 12.5]);
    part(T[1], 5, chip);
    part(T[1], 2.6, [[273, 249 + DY], [273, 262 + DY], [273, 275 + DY], [327, 249 + DY], [327, 262 + DY], [327, 275 + DY]]);
    var GEAR = { x: 248, y: 228 + DY }, TEETH = [];
    for (var g = 0; g < 44; g++) TEETH.push({ a: TAU * g / 44, r0: (Math.floor(g / 2) % 2) ? 20 : 26 });
    part(T[3], 3.1, along(rounded(272, 302 + DY, 328, 330 + DY, 6), 7.5));
    part(T[3], 3, [[332, 316 + DY]]);
    var coil = [];
    for (var c = 0; c <= 60; c++) { var u = c / 60; coil.push([352 + 11 * Math.sin(TAU * 3 * u), 220 + DY + 82 * u]); }
    part(T[2], 3.1, along(coil, 6.5));
    [[[273, 262], [262, 262], [250, 250]], [[327, 262], [341, 262]], [[300, 288], [300, 302]], [[328, 316], [352, 316], [352, 302]],
     [[248, 208], [248, 192]], [[214, 266], [244, 266], [262, 275]]].forEach(function (line) {
      part(T[4], 2.4, along(line.map(function (q) { return [q[0], q[1] + DY]; }), 6.5));
    });
    var fan = [];                                                // a fan, further in, seen as the glass passes
    for (var f = 0; f < 18; f++) { var fa = TAU * f / 18; fan.push([196 + Math.cos(fa) * 16, 266 + DY + Math.sin(fa) * 16]); }
    part(T[0], 2.6, fan);
    part(T[0], 2.6, [[196, 266 + DY], [196, 257 + DY], [204, 270 + DY], [188, 270 + DY]]);
    function lensAt(t) { var gl = ease(clamp01((t - 3.0) / 1.35)); return { x: S0.x + (S1.x - S0.x) * gl, y: S0.y + (S1.y - S0.y) * gl }; }
    function frame(t) {
      ctx.save();                                                // (nothing set here outlasts the frame)
      draw(t);
      ctx.restore();
    }
    function draw(t) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      var looks = cells.draw(ctx, t);                            // the case and the screen first
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(HC.x, HC.y + 1, 19, T[2], 0.3 * clamp01((t - 2.6) / 0.3));   // the heart's own soft light
      PEAKS.forEach(function (p, n) {                            // at the end the heartbeat lights up, twice
        var lit = clamp01((t - 3.95 - 0.35 * n) / 0.12) * (1 - clamp01((t - 4.07 - 0.35 * n) / 0.4));
        if (lit > 0) { glow(p.x, p.y, 22, WHITE, 0.85 * lit); glow(HC.x, HC.y, 20, T[2], 0.95 * lit); }
      });
      ctx.restore();
      var C = lensAt(t), al = clamp01((t - 2.55) / 0.45);
      if (al > 0) {                                              // through the glass, the inside
        ctx.save();
        ctx.beginPath(); ctx.arc(C.x, C.y, LR - 4, 0, TAU); ctx.clip();
        ctx.fillStyle = 'rgba(14,7,28,' + 0.9 * al + ')'; ctx.fillRect(0, 0, SIZE, SIZE);
        INSIDE.forEach(function (p) { cell(ctx, p.x, p.y, p.r, p.color, al); });
        var spin = dir * (TAU / 10) * ease(clamp01((t - 4.4) / 0.5));   // the gear turns a little
        TEETH.forEach(function (q) {
          cell(ctx, X(GEAR.x) + Math.cos(q.a * dir + spin) * q.r0, GEAR.y + Math.sin(q.a * dir + spin) * q.r0, 3.1, T[0], al);
        });
        cell(ctx, X(GEAR.x), GEAR.y, 5.5, T[0], al);
        var blink = clamp01((t - 4.3) / 0.1) * (1 - clamp01((t - 4.4) / 0.3));   // a light on the chip, with the second beat
        if (blink > 0) { ctx.globalCompositeOperation = 'lighter'; glow(X(300), 262 + DY, 22, WHITE, 0.9 * blink); }
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.16 * al + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';   // the glass's shine
        ctx.beginPath(); ctx.arc(C.x, C.y, LR - 16, Math.PI * 1.12, Math.PI * 1.42); ctx.stroke();
      }
      var off = { x: C.x - S0.x, y: C.y - S0.y };                // the glass, on its way
      looks.forEach(function (l) { cell(ctx, l.x + off.x, l.y + off.y, l.r, l.color, l.alpha); });
    }
    return { duration: 5.0, frame: frame };
  }

  // ---------------------------------------------------------------- Inside a LINAC: from the side
  // (since version 3.01; Ali's choice of the picture ideas, 1 November 2026, "From the side", in the LINAC's colour,
  // teal, its group's in Inside Medical Devices): the view most people know. The stand at one end, the arm reaching
  // over the couch, the head pointing down at the patient, who lies on the couch with the head towards the machine
  // and a small tumor (white cells) under the treatment head. Five cells, one in each colour (the electrons), gather
  // at the start of the arm, run along it one after another, faster and faster, turn down at the bend into the head,
  // and each flashes there; the beam opens down through the tumor, a little brighter with each. On the Persian and
  // Arabic pages the machine stands on the right.
  function side(ctx, dir) {
    var F = family(ctx, dir, 'teal'), rnd = seeded(41), X = F.X;
    var places = [];
    // the stand at one end, the arm reaching over the couch, the head at its end and the collimator under it
    var STAND = F.flip(outline([[100, F.FLOOR], [100, 134, 20], [208, 134, 20], [208, F.FLOOR]], false));
    var ARM = F.flip(outline([[196, 142], [330, 142], [330, 192], [196, 192]], true));
    var HEAD = F.flip(outline([[318, 126, 22], [424, 126, 22], [424, 262, 14], [318, 262, 14]], true));
    var COLL = F.flip(outline([[344, 262, 3], [398, 262, 3], [398, 290, 5], [344, 290, 5]], true));
    F.beads(places, STAND, 17, { rnd: rnd, from: 1.4, span: 0.6, r: 6, kind: 'stand' });
    // the arm's two edges; the upper one starts where the arm leaves the stand, so the top line runs on from the stand's
    // corner (4 November 2026, Ali: a cell seemed missing there; it started at 222, 26 from the corner's last cell)
    F.beads(places, F.flip([[210, 142], [306, 142]]), 16, { rnd: rnd, from: 1.75, span: 0.15, r: 6, kind: 'arm' });
    F.beads(places, F.flip([[222, 192], [306, 192]]), 16.8, { rnd: rnd, from: 1.75, span: 0.15, r: 6, kind: 'arm' });
    F.beads(places, HEAD, 16, { rnd: rnd, from: 1.85, span: 0.3, r: 6, closed: true, kind: 'head' });
    F.beads(places, COLL, 13, { rnd: rnd, from: 2.05, span: 0.15, r: 5.4, closed: true, kind: 'head',
                                white: function (p) { return p.y > 287; } });
    // the couch: its top, with the patient lying on it, and its column at the far end
    var PLANK = F.flip(outline([[262, 384, 6], [526, 384, 6], [526, 398, 6], [262, 398, 6]], true));
    var COLUMN = F.flip(outline([[452, 398], [480, 398], [480, F.FLOOR], [452, F.FLOOR]], true));
    var FOOT = F.flip(outline([[428, 463, 3], [504, 463, 3], [504, F.FLOOR], [428, F.FLOOR]], true));
    F.beads(places, F.flip([[466, 458], [466, 408]]), 16, { rnd: rnd, from: 1.5, span: 0.2, r: 5.6, kind: 'couch' });
    F.beads(places, F.flip([[270, 391], [518, 391]]), 16.5, { rnd: rnd, from: 1.7, span: 0.3, r: 5.6, kind: 'couch' });
    // the patient lying on it, head towards the machine: pale cells, and the tumor under the head
    function inBody(x, y) {
      if (Math.hypot(x - 286, y - 366) <= 11) return true;                 // the head
      if (x >= 309 && x <= 440 && y >= 356 && y <= 377) return true;       // the trunk
      if (x >= 440 && x <= 498 && y >= 361 && y <= 377) return true;       // the legs
      return x >= 497 && x <= 507 && y >= 350 && y <= 377;                  // the feet
    }
    // the body's outline: the head, the neck, the trunk and the legs, and the feet pointing up
    var SKIN = F.flip(arcLine(286, 366, 16, 0.55, TAU - 0.55).concat(outline([[303, 357], [310, 350, 6], [442, 350, 10],
      [450, 356, 6], [496, 356, 4], [498, 342, 5], [512, 342, 5], [512, 383], [303, 383], [303, 375]], false)));
    var TUMOR = { x: 371, y: 366 };
    honeycomb(inBody, 11.5, 300, 366).forEach(function (p) {
      if (Math.hypot(p.x - TUMOR.x, p.y - TUMOR.y) < 12) return;
      places.push({ x: X(p.x) + (rnd() - 0.5) * 1.6, y: p.y + (rnd() - 0.5) * 1.6, r: 5, color: F.PALE,
                    arrive: 1.85 + 0.3 * rnd(), late: true, kind: 'body' });
    });
    [[0, 0, 7], [-9, -3, 5.5], [9, -2, 5.5], [0, 7, 5]].forEach(function (c, i) {
      places.push({ x: X(TUMOR.x + c[0]), y: TUMOR.y + c[1], r: c[2], color: F.WHITE, arrive: 2.25 + 0.04 * i, late: true, kind: 'core' });
    });
    // the electrons: five cells, one in each colour, gathering at the start of the arm
    var GUN = { x: 150, y: 167 };
    [[0, 0], [-9, -7], [-9, 7], [-18, 0], [-27, 0]].forEach(function (c, k) {
      places.push({ x: X(GUN.x + c[0]), y: GUN.y + c[1], r: 7, color: F.TONES[k], arrive: 2.2 + 0.05 * k, late: true, kind: 'e', k: k });
    });
    var cells = colony(places, { seed: 29, r0: 6.5, step: 0.16 });
    // their way: along the arm, round the bend into the head, and down to where the beam is made
    var SRC = { x: 371, y: 210 }, NOSE = 290;
    var PATH = outline([[GUN.x, GUN.y], [SRC.x, GUN.y, 22], [SRC.x, SRC.y]], false), LEN = 0, SEG = [];
    for (var i = 1; i < PATH.length; i++) { var l = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); SEG.push(l); LEN += l; }
    function along(d) {
      d = Math.max(0, Math.min(LEN, d));
      for (var j = 0; j < SEG.length; j++) {
        if (d <= SEG[j] || j === SEG.length - 1) {
          var f = SEG[j] ? Math.min(1, d / SEG[j]) : 0;
          return { x: X(PATH[j][0] + (PATH[j + 1][0] - PATH[j][0]) * f), y: PATH[j][1] + (PATH[j + 1][1] - PATH[j][1]) * f };
        }
        d -= SEG[j];
      }
    }
    var GO = 2.6, GAP = 0.11, RUN = 0.95;                   // each starts a little after the one before, faster and faster
    function run(k, t) { var p = (t - GO - GAP * k) / RUN; return p <= 0 ? 0 : LEN * Math.pow(p, 1.8); }
    function hit(k) { return GO + GAP * k + RUN; }
    function beam(t) {
      var open = ease(clamp01((t - hit(0)) / 0.45));
      if (open <= 0) return 0;
      var bottom = NOSE + 150 * open, lit = 0, sx = X(SRC.x);
      function w(y) { return (y - SRC.y) * 0.19; }
      for (var k = 0; k < 5; k++) {
        var e = ease(clamp01((t - hit(k)) / 0.25));
        if (e <= 0) continue;
        lit += e;
        var g = ctx.createLinearGradient(0, NOSE, 0, bottom), c = F.TONES[k];
        g.addColorStop(0, rgba(c, 0.3 * e));
        g.addColorStop(Math.min(0.99, (TUMOR.y - NOSE) / (bottom - NOSE)), rgba(c, 0.22 * e));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - w(NOSE), NOSE); ctx.lineTo(sx + w(NOSE), NOSE);
        ctx.lineTo(sx + w(bottom), bottom); ctx.lineTo(sx - w(bottom), bottom);
        ctx.closePath(); ctx.fill();
      }
      return lit;
    }
    function frame(t) {
      ctx.save();                                            // (nothing set here outlasts the frame)
      draw(t);
      ctx.restore();
    }
    function draw(t) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      F.ground(t);
      var a1 = clamp01((t - 2.0) / 0.5), looks = cells.draw(ctx, t);
      F.part(STAND, a1, { solid: 0.5, fill: 0.1, edge: 0.45, open: true });
      F.draw(looks, ['stand']);
      F.part(ARM, a1, { solid: 0.85, fill: 0.14, edge: 0 });
      F.draw(looks, ['arm']);
      F.part(HEAD, a1, { solid: 0.85, fill: 0.16, edge: 0.55 });
      F.part(COLL, a1, { solid: 0.85, fill: 0.2, edge: 0.55 });
      if (a1 > 0) {                                          // the arm's edges, and the electrons' way, faint and dashed
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.5 * a1 + ')'; ctx.lineWidth = 1.4;
        [142, 192].forEach(function (y) { ctx.beginPath(); ctx.moveTo(X(208), y); ctx.lineTo(X(318), y); ctx.stroke(); });
        ctx.save();
        ctx.setLineDash([3, 7]);
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.3 * a1 + ')'; ctx.lineWidth = 1.2;
        F.trace(F.flip(PATH), false); ctx.stroke();
        ctx.restore();
      }
      F.draw(looks, ['head']);
      F.part(FOOT, a1, { solid: 0.8, fill: 0.12, edge: 0.4 });
      F.part(COLUMN, a1, { solid: 0.8, fill: 0.12, edge: 0.4 });
      F.part(PLANK, a1, { solid: 0.8, fill: 0.16, edge: 0.55 });
      F.draw(looks, ['couch']);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var lit = beam(t);
      ctx.restore();
      if (a1 > 0) {
        F.trace(SKIN, false);
        ctx.strokeStyle = 'rgba(239,232,248,' + 0.5 * a1 + ')'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      F.draw(looks, ['body'], null, F.PATIENT);
      if (lit > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; F.glow(X(TUMOR.x), TUMOR.y, 40, 0.14 * lit); ctx.restore(); }
      F.draw(looks, ['core']);
      looks.forEach(function (l) {                           // the electrons
        if (l.target.kind !== 'e') return;
        var k = l.target.k, d = run(k, t);
        if (d >= LEN) return;                                // it has reached the head and become part of the beam
        var p = along(d), keep = 1 - Math.min(1, d / 30);    // it leaves its place in the group and joins the way
        var x = p.x + (l.x - X(GUN.x)) * keep, y = p.y + (l.y - GUN.y) * keep;
        if (d > 0) {                                         // a short streak behind it as it speeds up
          var q = along(run(k, t - 0.05));
          ctx.strokeStyle = rgba(l.color, 0.5); ctx.lineWidth = l.r * 1.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(x, y); ctx.stroke();
        }
        cell(ctx, x, y, l.r, l.color, l.alpha);
      });
      for (var k = 0; k < 5; k++) {                          // a flash where each one strikes
        var f = clamp01((t - hit(k)) / 0.08) * (1 - clamp01((t - hit(k) - 0.08) / 0.3));
        if (f > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; F.glow(X(SRC.x), SRC.y, 26, 0.8 * f); ctx.restore(); }
      }
    }
    return { duration: 5.0, frame: frame };
  }

  // ---------------------------------------------------------------- Accessibility: the accessibility sign
  // (since version 3.01; Ali's idea, 2 November 2026: the sign people know for accessibility, drawn in cells like the
  // seal of Standards in Medicine): a ring of cells in the site's five colours, mixed together, that closes round the
  // way the page reads (in English clockwise from the top, in Persian and Arabic the other way), with two thin edges
  // round it; then, in white cells, the figure in the middle, with room round it (Ali's wish): its head, one larger
  // cell, then its body, then its arms, opening out to both sides, and its legs. As the arms open, the one at the start
  // of the page's line rises instead, bent at the elbow, and waves twice (Ali's idea), then comes down into the sign.
  // All in five seconds, like the other pictures. (Ali's first picture for the page, a little house with steps and a
  // ramp up to its door, is in the preview's version 53 and in the work saved on 2 November 2026.)
  function sign(ctx, dir) {
    var rnd = seeded(67);
    var TONES = [COLORS.teal, COLORS.coral, COLORS.magenta, COLORS.gold, COLORS.violet].map(rgb);
    var RING = 40, R = 192, white = rgb('#FFFFFF');
    var places = [];
    for (var k = 0; k < RING; k++) {
      var a = -Math.PI / 2 + dir * (k / RING) * TAU;
      places.push({ x: 300 + Math.cos(a) * R + (rnd() - 0.5) * 2, y: 300 + Math.sin(a) * R + (rnd() - 0.5) * 2, r: 9,
                    color: TONES[k % TONES.length], arrive: 1.85 + 1.25 * (k / RING) + rnd() * 0.1 });
    }
    // the figure, four fifths of the ring's first drawing: its head, one larger cell; its body, down from the shoulders;
    // its arms, out from the shoulders to both hands; its legs, down from the hips to both feet (a cell every 11 units
    // or so along each stroke). A stroke's cells gather where it starts, then spread along it, the farthest last, so
    // it grows like a limb.
    function at(x, y) { return { x: 300 + (x - 300) * 0.8, y: 300 + (y - 300) * 0.8 }; }
    var HEAD = at(300, 186), NECK = at(300, 222), HIP = at(300, 318);
    var HANDS = [at(186, 210), at(414, 210)], FEET = [at(256, 414), at(344, 414)];
    var WAVER = dir > 0 ? 0 : 1;                                             // the arm at the start of the page's line
    places.push({ x: HEAD.x, y: HEAD.y, r: 14, color: white, arrive: 3.05 });
    function stroke(p0, p1, from, span, r, skipFirst, wave) {
      var n = Math.max(1, Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 11.2));
      for (var i = skipFirst ? 1 : 0; i <= n; i++) {
        places.push({ x: p0.x, y: p0.y, r: r, color: white, arrive: from - 0.12, late: true, u: i / n, wave: wave,
                      from: p0, to: { x: p0.x + (p1.x - p0.x) * i / n, y: p0.y + (p1.y - p0.y) * i / n },
                      move: [from, from + 0.1 + span * (i / n)] });
      }
    }
    stroke(NECK, HIP, 3.15, 0.3, 7, false, false);                           // the body
    stroke(NECK, HANDS[0], 3.4, 0.35, 6.5, true, WAVER === 0);               // the arms
    stroke(NECK, HANDS[1], 3.4, 0.35, 6.5, true, WAVER === 1);
    stroke(HIP, FEET[0], 3.6, 0.35, 6.5, true, false);                       // the legs
    stroke(HIP, FEET[1], 3.6, 0.35, 6.5, true, false);
    var cells = colony(places, { seed: 31, r0: 7 });
    // The wave: the upper arm raised a little, the forearm up from the elbow (halfway along the arm); the forearm swings
    // twice, then the whole arm comes down, straight, into the sign. Angles turn the hand upwards on either side.
    var UPPER = 20 * Math.PI / 180, FORE = 70 * Math.PI / 180, SWING = 18 * Math.PI / 180;
    function pose(t) {
      if (t < 3.75) return [UPPER, FORE];
      if (t < 4.45) return [UPPER, FORE + SWING * Math.sin(TAU * 2 * (t - 3.75) / 0.7)];
      var k = 1 - ease(clamp01((t - 4.45) / 0.35));
      return [UPPER * k, FORE * k];
    }
    function turn(x, y, a) { var c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c }; }
    var ARM = { x: HANDS[WAVER].x - NECK.x, y: HANDS[WAVER].y - NECK.y };
    function waving(along, t) {                                             // a point 'along' of the way down the raised arm
      var p = pose(t), up = dir * p[0], fore = dir * (p[0] + p[1]), e = Math.min(along, 0.5);
      var q = turn(ARM.x * e, ARM.y * e, up);
      if (along > 0.5) { var f = turn(ARM.x * (along - 0.5), ARM.y * (along - 0.5), fore); q.x += f.x; q.y += f.y; }
      return { x: NECK.x + q.x, y: NECK.y + q.y };
    }
    function frame(t) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      var a0 = clamp01((t - 3.0) / 0.6);                                      // the ring's two thin edges, once it has closed
      if (a0 > 0) {
        ctx.lineWidth = 1.4;
        [R - 26, R + 26].forEach(function (rr) {
          ctx.strokeStyle = 'rgba(255,255,255,' + 0.42 * a0 + ')';
          ctx.beginPath(); ctx.arc(300, 300, rr, 0, TAU); ctx.stroke();
        });
      }
      cells.draw(ctx, t).forEach(function (l) {                              // the figure's cells, on their way
        var g = l.target, m = g.move, f = ease(clamp01((t - m[0]) / (m[1] - m[0]))), p;
        if (t < m[0]) p = l;
        else if (g.wave) p = waving(g.u * f, t);
        else p = { x: g.from.x + (g.to.x - g.from.x) * f, y: g.from.y + (g.to.y - g.from.y) * f };
        cell(ctx, p.x, p.y, l.r, l.color, l.alpha);
      });
    }
    return { duration: 5.0, frame: frame };
  }

  // ---------------------------------------------------------------- Site Map: you are here
  // (since version 3.01; Ali's choice, 2 November 2026, of three ideas on the review page "Site Map Pictures"): four
  // streets of pale cells cross the dish like a map's, with five places on them, one in each of the site's colours; then
  // a pin drops onto the map where the first two streets cross (an outline of white cells round a gold cell, its head),
  // bounces once, and a ring spreads round it: you are here. Nothing in it depends on the site's pages, so it stays right
  // as tutorials are added (Ali's point). The magenta place sits up its street, clear of the pin's head even at the top
  // of the bounce (Ali's wish: where it was first, under the head, the gold cell hid it). On the Persian and Arabic
  // pages it is mirrored.
  function youAreHere(ctx, dir) {
    var X = function (x) { return dir > 0 ? x : SIZE - x; };
    var PALE = rgb(COLORS.pale), WHITE = [255, 255, 255], rnd = seeded(53);
    function curve(a, b, c, d) {                              // a cubic curve through four points, dense
      var out = [];
      for (var k = 0; k <= 60; k++) {
        var s = k / 60;
        out.push([bez(a[0], b[0], c[0], d[0], s), bez(a[1], b[1], c[1], d[1], s)]);
      }
      return out;
    }
    var ROADS = [
      curve([110, 250], [220, 210], [360, 300], [490, 250]),
      curve([130, 380], [240, 340], [360, 420], [480, 360]),
      curve([230, 110], [260, 230], [210, 360], [260, 490]),
      curve([380, 120], [350, 240], [420, 350], [370, 480])
    ];
    var places = [];
    ROADS.forEach(function (road, k) {
      spaced(road, 10).forEach(function (p) {
        places.push({ x: X(p.x), y: p.y, r: 2.7, color: PALE, arrive: 1.9 + 0.12 * k + 0.6 * p.s + rnd() * 0.03 });
      });
    });
    // the five places: their colour, their street, and how far along it (the magenta one near the top of its street,
    // 61 units from the middle of the pin's head, 8 clear of its outline at the top of the bounce; on the review page it
    // was 10 from the middle, under the gold cell)
    var SPOTS = [['teal', 0, 0.18], ['coral', 1, 0.82], ['magenta', 2, 0.06], ['gold', 3, 0.85], ['violet', 1, 0.3]];
    SPOTS.forEach(function (q, k) {
      var line = spaced(ROADS[q[1]], 4), p = line[Math.round(q[2] * (line.length - 1))];
      places.push({ x: X(p.x), y: p.y, r: 9, color: rgb(COLORS[q[0]]), arrive: 2.7 + 0.1 * k });
    });
    var cells = colony(places, { seed: 29, r0: 6.5, step: 0.17 });
    // the pin's point: where the first two streets cross (near the middle, nearer the start of the page's line)
    var HERE = (function () {
      var a = spaced(ROADS[0], 2), b = spaced(ROADS[2], 2), best = null;
      a.forEach(function (p) {
        b.forEach(function (q) {
          var d = Math.hypot(p.x - q.x, p.y - q.y);
          if (!best || d < best.d) best = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, d: d };
        });
      });
      return { x: X(best.x), y: best.y };
    })();
    // the pin's outline: a round head and a point, as a dense line (the point at 0, 0, the head above it)
    var HR = 26, HY = -50, T0 = Math.PI / 2 + Math.acos(HR / -HY), T1 = Math.PI / 2 - Math.acos(HR / -HY) + TAU, head = [];
    for (var k = 0; k <= 48; k++) {                           // round the head, over its top, from one side of the point
      var a = T0 + (T1 - T0) * k / 48;                        // to the other (canvas angles: 90 degrees is down)
      head.push([Math.cos(a) * HR, HY + Math.sin(a) * HR]);
    }
    var PIN = spaced([[0, 0]].concat(head).concat([[0, 0]]), 7.5, true);
    function drop(t) {                                        // how far above its place the pin is, with one bounce
      var s = clamp01((t - 3.45) / 0.55);
      if (s < 1) return -260 * (1 - s * s);
      return -14 * Math.sin(Math.PI * clamp01((t - 4.0) / 0.35));
    }
    function frame(t) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      cells.draw(ctx, t);
      var ring = clamp01((t - 4.25) / 0.6);
      if (ring > 0 && ring < 1) {                             // a ring spreads round it, once
        ctx.strokeStyle = rgba(WHITE, 0.5 * (1 - ring));
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(HERE.x, HERE.y, 10 + 46 * ease(ring), 4 + 18 * ease(ring), 0, 0, TAU); ctx.stroke();
      }
      if (t < 3.45) return;
      var dy = drop(t), alpha = clamp01((t - 3.45) / 0.2), near = clamp01(1 + dy / 260);
      ctx.save();
      ctx.globalAlpha = 0.9 * alpha;                          // its shadow on the map, growing as it lands
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(HERE.x, HERE.y + 2, 9 * near, 3.5 * near, 0, 0, TAU); ctx.fill();
      ctx.restore();
      PIN.forEach(function (p) { cell(ctx, HERE.x + p.x, HERE.y + dy + p.y, 4.4, WHITE, alpha); });
      cell(ctx, HERE.x, HERE.y + dy + HY, 9, rgb(COLORS.gold), alpha);
    }
    return { duration: 5.0, frame: frame };
  }

  // ---------------------------------------------------------------- playing a picture
  kit.shelf = shelf;
  kit.seal = seal;
  kit.devices = lookInside;
  kit.side = side;
  kit.sign = sign;
  kit.pin = youAreHere;
  var ART = { reading: shelf, standards: seal, devices: lookInside, linac: side, accessibility: sign, sitemap: youAreHere };
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
