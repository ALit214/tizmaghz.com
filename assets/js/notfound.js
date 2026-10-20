/* Page not found: a short animation in the specimen dish. One cell divides again and again, and the cells
   gather into 404 in the site's five colours; one gold cell never finds its place and ends up on its own.
   It plays once when the page opens (about five seconds) and then rests on its last frame, so nothing keeps
   moving. With reduced motion, the last frame shows straight away. The page's text never depends on it. */
(function () {
  'use strict';
  var canvas = document.querySelector('.nf-cells');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var SIZE = 600;                      // drawing units: the dish is 600 x 600, centre at 300, 300
  var TAU = Math.PI * 2;
  var COLORS = ['#5ED6C8', '#FF8A78', '#F07BBE', '#E6C36A', '#B98CFF'];   // the five print colours, lit for the dark dish
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var raf = null;
  var elapsed = 0;
  var last = 0;

  // A repeatable "random" sequence, so the cells take the same paths every time.
  function seeded(n) {
    return function () { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; };
  }
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function clamp01(p) { return p < 0 ? 0 : p > 1 ? 1 : p; }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function fit() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var px = Math.round((canvas.clientWidth || SIZE) * ratio);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    ctx.setTransform(px / SIZE, 0, 0, px / SIZE, 0, 0);
  }

  // One cell: a soft glow, a translucent body with its membrane, and a nucleus.
  function cell(x, y, r, color, alpha) {
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

  // ---------------------------------------------------------------- the cells, and their places in the 404
  var GLYPHS = {
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']
  };
  var grow = (function () {
    var STEP = 22, R = 8.5;
    var rnd = seeded(404);
    var targets = [];
    ['4', '0', '4'].forEach(function (g, k) {
      GLYPHS[g].forEach(function (row, r) {
        for (var c = 0; c < 5; c++) {
          if (row.charAt(c) === '#') {
            targets.push({ x: 300 + ((k * 6 + c) - 8) * STEP + (rnd() - 0.5) * 5, y: 300 + (r - 3) * STEP + (rnd() - 0.5) * 5 });
          }
        }
      });
    });
    // The cells form a family tree: cell i divides into cells 2i+1 and 2i+2. Give each branch of the tree one
    // part of the 404 (splitting the places in two, again and again), so cells that divide stay close.
    var n = targets.length;
    var places = [];
    function size(i) { return i < n ? 1 + size(2 * i + 1) + size(2 * i + 2) : 0; }
    function assign(i, pts) {
      if (i >= n || !pts.length) return;
      var cx = 0, cy = 0;
      pts.forEach(function (q) { cx += q.x; cy += q.y; });
      cx /= pts.length; cy /= pts.length;
      var best = 0;
      pts.forEach(function (q, k) { if (Math.hypot(q.x - cx, q.y - cy) < Math.hypot(pts[best].x - cx, pts[best].y - cy)) best = k; });
      places[i] = pts[best];
      var rest = pts.filter(function (q, k) { return k !== best; });
      var xs = rest.map(function (q) { return q.x; }), ys = rest.map(function (q) { return q.y; });
      var wide = Math.max.apply(null, xs.concat([0])) - Math.min.apply(null, xs.concat([600])) >= Math.max.apply(null, ys.concat([0])) - Math.min.apply(null, ys.concat([600]));
      rest.sort(function (a, b) { return wide ? a.x - b.x : a.y - b.y; });
      var left = size(2 * i + 1);
      assign(2 * i + 1, rest.slice(0, left));
      assign(2 * i + 2, rest.slice(left));
    }
    assign(0, targets);
    var lost = n;                     // one more cell, which never finds its place
    places.push({ x: 432, y: 438 });
    var cells = places.map(function (t, i) {
      var gen = Math.floor(Math.log(i + 1) / Math.LN2);
      return {
        target: t,
        parent: i ? (i - 1) >> 1 : -1,
        born: 0.15 + gen * 0.2,
        arrive: i === lost ? 4.7 : 2.5 + rnd() * 1.0,
        split: rnd() * TAU,
        bend: (rnd() - 0.5) * 120,
        color: i === lost ? '#E6C36A' : COLORS[i % COLORS.length]
      };
    });
    // The lost cell takes a long way round: towards the 404, then away.
    var detour = [{ x: 220, y: 170 }, { x: 540, y: 250 }];

    function bez(a, b, c, d, p) {
      var q = 1 - p;
      return q * q * q * a + 3 * q * q * p * b + 3 * q * p * p * c + p * p * p * d;
    }
    // Where a cell is at time t. It starts just beside where its parent was when it was born, as if it
    // had divided off, then travels to its place in the 404 along a gentle curve.
    var starts = [];
    function startOf(i) {
      if (starts[i]) return starts[i];
      var c = cells[i];
      if (!i) return (starts[i] = { x: 300, y: 300 });
      var from = at(c.parent, c.born);
      return (starts[i] = { x: from.x + Math.cos(c.split) * R * 1.6, y: from.y + Math.sin(c.split) * R * 1.6 });
    }
    function at(i, t) {
      var c = cells[i], s = startOf(i);
      var e = ease(clamp01((t - c.born) / (c.arrive - c.born)));
      if (i === lost) {
        return { x: bez(s.x, detour[0].x, detour[1].x, c.target.x, e), y: bez(s.y, detour[0].y, detour[1].y, c.target.y, e) };
      }
      var dx = c.target.x - s.x, dy = c.target.y - s.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var arc = Math.sin(Math.PI * e) * c.bend * Math.min(1, len / 200);
      return { x: s.x + dx * e - dy / len * arc, y: s.y + dy * e + dx / len * arc };
    }
    function frame(t) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        if (t < c.born) continue;
        var q = at(i, t);
        // a new cell grows to full size, and settles with a small swell when it arrives
        var grown = clamp01((t - c.born) / 0.35);
        var since = t - c.arrive;
        var swell = since >= 0 ? 1 + 0.12 * Math.max(0, 1 - since / 0.5) * Math.sin(since * 14) : 1;
        cell(q.x, q.y, R * (0.55 + 0.45 * grown) * swell, c.color, 0.35 + 0.65 * grown);
      }
    }
    return { duration: 5.0, frame: frame };
  })();

  function tick(now) {
    raf = null;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;   // a hidden tab doesn't count
    last = now;
    elapsed += dt;
    fit();
    grow.frame(Math.min(elapsed, grow.duration));
    if (elapsed < grow.duration) raf = window.requestAnimationFrame(tick);
  }
  function start() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = null;
    elapsed = 0;
    last = 0;
    fit();
    if (reduce || !window.requestAnimationFrame) { grow.frame(grow.duration); return; }
    grow.frame(0);
    raf = window.requestAnimationFrame(tick);
  }
  window.addEventListener('resize', function () { if (!raf) { fit(); grow.frame(grow.duration); } });
  // Lets a review copy of the page play the animation again.
  window.notFoundAnimation = { play: start };
  start();
})();

/* Page not found: the language and theme buttons. The page's head has already chosen the language (from
   the address, the remembered choice or the browser) before anything was drawn; these buttons switch it in
   place and remember the choice, as the buttons on the rest of the site do. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var dataEl = doc.getElementById('nf-data');
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  function store(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked: carry on */ } }
  function each(sel, fn) { Array.prototype.forEach.call(doc.querySelectorAll(sel), fn); }
  function show(lang) {
    var d = DATA[lang];
    if (!d) return;
    root.setAttribute('data-nf', lang);
    root.lang = lang;
    root.dir = d.dir;
    doc.title = d.title;
    var home = doc.querySelector('[data-nf-home]');
    if (home) home.setAttribute('href', d.home);
    each('[data-nf-choose]', function (b) {
      var k = b.getAttribute('data-nf-choose');
      b.setAttribute('aria-pressed', k === lang ? 'true' : 'false');
      var says = b.querySelector('[data-nf-says]');
      if (says) says.textContent = ' ' + d.languageNames[k];      // for screen readers, in this language
    });
    var langs = doc.querySelector('.nf-langs');
    if (langs) langs.setAttribute('aria-label', d.languageLabel);
    var themes = doc.querySelector('.theme-switch');
    if (themes) themes.setAttribute('aria-label', d.themeLabel);
    each('[data-theme-choice]', function (b, k) {
      b.setAttribute('aria-label', d.themes[k]);
      b.setAttribute('title', d.themes[k]);
    });
  }
  each('[data-nf-choose]', function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-nf-choose');
      store('lang', lang);
      show(lang);
    });
  });
  // Theme: System, Light or Dark, remembered as on the rest of the site.
  function showTheme(choice) {
    each('[data-theme-choice]', function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme-choice') === choice ? 'true' : 'false'); });
  }
  var saved = null;
  try { saved = window.localStorage.getItem('theme'); } catch (e) { /* ignore */ }
  showTheme(saved === 'light' || saved === 'dark' ? saved : 'system');
  each('[data-theme-choice]', function (b) {
    b.addEventListener('click', function () {
      var choice = b.getAttribute('data-theme-choice');
      if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
      else root.removeAttribute('data-theme');
      store('theme', choice);
      showTheme(choice);
    });
  });
  show(root.getAttribute('data-nf') || 'en');
})();
