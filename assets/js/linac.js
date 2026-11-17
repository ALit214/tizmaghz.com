/* Inside a LINAC (learn/tutorials/linac/, since version 3.01): the parts of the tutorial that do something. This
   file is loaded on that page only. No libraries, no tracking, nothing sent anywhere. Everything the page says is in
   it before this script runs; without the script each part shows all it has to say, and the style sheet sets each
   part's first state from the first moment (the page's class "js"), so nothing moves when the script arrives.
   Nothing moves by itself: each change follows a press, a key or a finger, and screen readers hear it, politely,
   through the page's live region (data-announce); with reduced motion nothing glides (site.css).
   - Meet the machine: a button on each part of the room shows that part's text, one at a time (aria-pressed);
     "Show as a list" shows them all, in columns, each title a button back to its part on the drawing (3.04), and
     "Show the drawing" brings the drawing back.
   - From an electron to a beam: Next and Back go through the seven steps, "Step n of 7", lighting each step's part of
     the drawing and drawing the beam's path so far; at the last step, Start again.
   - Shape the beam: each leaf is a slider. Tab reaches it, and choosing it (the keyboard, a click or a tap) makes it
     the one Move in and Move out move; the arrow keys move it the way they point (the drawing isn't mirrored), Home
     and End as far as it goes; a finger or the pointer can drag it. Since 2 November 2026 (Ali's choices) a game of
     three tumors: "Turn on the beam" lights the opening and gives the verdict (stars, a sentence, three figures);
     moving a leaf turns it off; "Show a good shape" after a try; "Next tumor" at three stars. "Open all the leaves"
     starts the tumor again.
   - Many angles, one target: Add a beam (five, then it stops), Clear the beams.
   - Your treatment journey: the stages mixed up (the first time the same way in every language), Move up and Move
     down (the keyboard stays on the button, which moves with its stage), Check the order, Mix them up again. Since
     3 November 2026 (Ali's idea) the check marks each stage, in the quizzes' colours: in its place, a tick; not yet, a
     cross; and in words for screen readers; moving a stage clears the marks.
   - The cells' celebration (site.js's burst) when the journey is in order and at three stars on Shape the beam.
   - Safety by design: the pretend door, a button that says what it will do: opening it stops the beam (the lamp goes
     out); closing it doesn't start it again; the second button switches it on again, as from the control area, only
     while the door is closed.
   - Who does what: where the cards stand side by side, all one size; a card whose text doesn't fit shows its first
     lines and "Show more" (since 4 November 2026, Ali's idea). (Who checks the machine and the three principles: one
     size side by side, by site.js, as Where to start learning on Standards in Medicine.) */
(function () {
  'use strict';
  var doc = document;
  if (!doc.querySelector || !doc.getElementById('journey')) return;     // (3.03) also on Inside an MRI, which has no leaves
  var LANG = doc.documentElement.lang;
  var DIGITS = { fa: '۰۱۲۳۴۵۶۷۸۹', ar: '٠١٢٣٤٥٦٧٨٩' };

  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $all(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }
  function on(el, type, fn, opts) { if (el) el.addEventListener(type, fn, opts || false); }
  function digits(n) {
    var s = String(n);
    return DIGITS[LANG] ? s.replace(/[0-9]/g, function (d) { return DIGITS[LANG].charAt(+d); }) : s;
  }
  function fill(tpl, vals) {
    return tpl.replace(/\{(\w+)\}/g, function (m, k) { return k in vals ? (typeof vals[k] === 'number' ? digits(vals[k]) : vals[k]) : m; });
  }
  // The page's live region (site.js uses it too): emptied, then filled a moment later, so the same words twice are
  // said twice.
  var announcer = $('[data-announce]');
  var saying = 0;
  function announce(text) {
    if (!announcer || !text) return;
    clearTimeout(saying);
    announcer.textContent = '';
    saying = setTimeout(function () { announcer.textContent = text; }, 150);
  }
  // A box's words as they should be read out: without its buttons and numbers, headings kept apart from the text.
  function spoken(el) {
    var copy = el.cloneNode(true);
    $all('button, [aria-hidden="true"], [hidden]', copy).forEach(function (x) { x.parentNode.removeChild(x); });
    $all('h1, h2, h3, h4', copy).forEach(function (h) {
      h.appendChild(doc.createTextNode(/[.:!?؟]\s*$/.test(h.textContent) ? ' ' : '. '));
    });
    $all('p, li', copy).forEach(function (p) { p.appendChild(doc.createTextNode(' ')); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }
  function disable(b, off) { if (b) b.setAttribute('aria-disabled', off ? 'true' : 'false'); }
  // The cells' celebration, the burst of the site's right answers (site.js draws it, from el; none with reduced
  // motion, and no sound): since 3 November 2026 (Ali's idea), for the journey in order (from the button
  // "Check the order") and for three stars (from the middle star, Ali's choice: the cells spread over all three).
  function celebrate(el) {
    try { doc.dispatchEvent(new CustomEvent('tz:burst', { detail: el })); } catch (e) { /* an old browser: no burst */ }
  }

  // ---------------------------------------------------------------- 2. Meet the machine
  // (3.04, stage 6, item 12; Ali, 15 November 2026) In the list ("Show as a list"), each card's title is a button that
  // takes you back to its part on the drawing: the drawing shows again with that part chosen, its button lit, the
  // drawing in view and the keyboard on that part's button. The titles are buttons only while the list shows (the
  // style sheet puts a small orange cell before each, like the drawing's buttons); screen readers hear the title,
  // then a hidden "(on the drawing)" (data-goto), as the tables' names on Books & Guidelines are followed by "(its
  // card)".
  (function () {
    var box = $('.lx-room');
    if (!box) return;
    var spots = $all('.lx-spot', box);
    var parts = $all('.lx-room-part', box);
    var view = $('[data-lx-view]', box);
    var hint = box.getAttribute('data-goto') || '';
    var heads = parts.map(function (li) {
      var h = $('h3', li), plain = doc.createDocumentFragment();
      while (h.firstChild) plain.appendChild(h.firstChild);
      var b = doc.createElement('button'), t = doc.createElement('span'), vh = doc.createElement('span');
      b.type = 'button';
      b.className = 'lx-goto';
      b.setAttribute('data-part', li.getAttribute('data-part'));
      t.className = 'lx-goto-t';
      vh.className = 'vh';
      vh.textContent = ' (' + hint + ')';
      b.appendChild(t);
      b.appendChild(vh);
      return { h: h, plain: plain, b: b, t: t };
    });
    function titles(list) {
      heads.forEach(function (x) {
        if (list) {
          while (x.h.firstChild) x.t.appendChild(x.h.firstChild);
          if (!x.t.firstChild) x.t.appendChild(x.plain);
          x.h.appendChild(x.b);
        } else if (x.b.parentNode) {
          x.h.removeChild(x.b);
          while (x.t.firstChild) x.h.appendChild(x.t.firstChild);
        } else if (!x.h.firstChild) {
          x.h.appendChild(x.plain);
        }
      });
    }
    titles(false);
    function show(id, say) {
      spots.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-part') === id ? 'true' : 'false'); });
      parts.forEach(function (li) { li.classList.toggle('is-current', li.getAttribute('data-part') === id); });
      if (say) announce(spoken(doc.getElementById('room-' + id)));
    }
    function setView(list) {
      box.setAttribute('data-view', list ? 'list' : 'drawing');
      view.textContent = view.getAttribute(list ? 'data-drawing' : 'data-list');
      titles(list);
    }
    spots.forEach(function (b) { on(b, 'click', function () { show(b.getAttribute('data-part'), true); }); });
    on(view, 'click', function () {
      setView(box.getAttribute('data-view') !== 'list');
      announce(view.textContent);
    });
    heads.forEach(function (x) {
      on(x.b, 'click', function () {
        var id = x.b.getAttribute('data-part');
        setView(false);
        show(id, true);
        var top = box.getBoundingClientRect().top + (window.pageYOffset || 0) - 96;   // under the top bar
        try { window.scrollTo({ top: Math.max(0, top), behavior: 'instant' }); } catch (e) { window.scrollTo(0, Math.max(0, top)); }   // a jump, as in the mock-ups
        var spot = $('.lx-spot[data-part="' + id + '"]', box);
        if (spot) { try { spot.focus({ preventScroll: true }); } catch (e) { spot.focus(); } }
      });
    });
  })();

  // ---------------------------------------------------------------- 3. From an electron to a beam
  (function () {
    var box = $('.lx-journey');
    if (!box) return;
    var steps = $all('.lx-step', box);
    var marks = $all('.lx-mark', box);
    var parts = $all('.lx-part-art', box);
    var beams = $all('.lx-beam-art', box);
    var progress = $('[data-lx-progress]', box);
    var back = $('[data-lx-back]', box);
    var next = $('[data-lx-next]', box);
    var again = $('[data-lx-again]', box);
    var total = steps.length;
    var step = 1;
    function render(say) {
      var id = steps[step - 1].getAttribute('data-part');
      box.setAttribute('data-step', String(step));
      steps.forEach(function (li, k) { li.classList.toggle('is-current', k === step - 1); });
      marks.forEach(function (m) { m.classList.toggle('is-current', m.getAttribute('data-part') === id); });
      parts.forEach(function (g) { g.classList.toggle('is-lit', g.getAttribute('data-part') === id); });
      beams.forEach(function (g) { g.classList.toggle('is-on', +g.getAttribute('data-at') <= step); });
      progress.textContent = fill(progress.getAttribute('data-template'), { n: step, total: total });
      disable(back, step === 1);
      next.hidden = step === total;
      again.hidden = step !== total;
      if (say) announce(progress.textContent + ': ' + spoken(steps[step - 1]));
    }
    on(back, 'click', function () {
      if (step === 1) return;
      step -= 1;
      render(true);
      if (step === total - 1 && doc.activeElement === again) next.focus();
    });
    on(next, 'click', function () {
      if (step === total) return;
      step += 1;
      render(true);
      if (step === total) again.focus();          // Next is gone: the keyboard goes on to Start again
    });
    on(again, 'click', function () { step = 1; render(true); next.focus(); });
    render(false);
  })();

  // ---------------------------------------------------------------- 4. Shape the beam
  // (Since Ali's choices of 2 November 2026, a game.) Three tumors in turn, each with its rows (in each row the tumor's
  // parts and the organ, from and to, in steps) and a good fit. Nothing is judged while the leaves move; screen readers
  // hear the words for the moved leaf's row. "Turn on the beam" lights the opening and gives the verdict: up to three
  // stars, a sentence and three figures. All of the tumor, none of the organ, and no more healthy tissue than the least
  // possible (the good fit's) gives three stars; two, with more; one, if the beam misses part of the tumor or reaches
  // the organ; none, if both. Moving a leaf turns the beam off. After a try, "Show a good shape" sets the leaves to the
  // good fit; at three stars, "Next tumor" (after the last, "Back to the first tumor").
  (function () {
    var field = $('.lx-field');
    var box = field && field.closest('.lx-shape');
    if (!box) return;
    var STEPS = +field.getAttribute('data-steps');              // the light is this many steps wide
    var M = +field.getAttribute('data-margin');                 // a fully open leaf rests in a margin this wide
    var SPAN = STEPS + 2 * M;
    var FIELDS = JSON.parse(field.getAttribute('data-fields'));
    var T = JSON.parse(field.getAttribute('data-texts'));
    var leaves = $all('.lx-leaf', field);
    var arts = $all('.lx-field-art', field);
    var rays = $all('.lx-ray-row', field);
    var inBtn = $('[data-lx-in]', box), outBtn = $('[data-lx-out]', box), openBtn = $('[data-lx-open]', box);
    var beamBtn = $('[data-lx-beam]', box), goodBtn = $('[data-lx-good]', box), nextBtn = $('[data-lx-tumor]', box);
    var which = $('[data-lx-which]', box);
    var status = $('[data-lx-status]', box);
    var hint = $('[data-lx-hint]', status), result = $('[data-lx-result]', status);
    var current = 0, tried = false, lit = false, best = false, said = null;
    var tip = {};                                               // where each leaf's tip is: 'row side' -> 0 (left edge) to STEPS
    var chosen = null;
    var EPS = 1e-6;
    function name(l) { return l.getAttribute('data-row') + ' ' + l.getAttribute('data-side'); }
    function left(l) { return l.getAttribute('data-side') === 'left'; }
    function pct(v) { return (100 * v / SPAN).toFixed(3) + '%'; }
    function number(v, places) {                                // in the page's digits, with its decimal sign
      var s = places ? v.toFixed(places) : String(v);
      if (LANG === 'fa' || LANG === 'ar') s = s.replace('.', '٫');
      return digits(s);
    }
    // A leaf goes from its edge of the field to the other leaf of its row, never past it.
    function range(l) {
      var row = l.getAttribute('data-row');
      return left(l) ? [0, tip[row + ' right']] : [tip[row + ' left'], STEPS];
    }
    function place(l) {
      var v = tip[name(l)];
      if (left(l)) { l.style.left = '0'; l.style.width = pct(v + M); } else { l.style.left = pct(v + M); l.style.width = pct(STEPS - v + M); }
      l.setAttribute('aria-valuenow', String(v));
    }
    function set(l, v) {
      var r = range(l);
      v = Math.max(r[0], Math.min(r[1], v));
      if (v === tip[name(l)]) return false;
      tip[name(l)] = v;
      place(l);
      return true;
    }
    function overlap(a, b, c, d) { return Math.max(0, Math.min(b, d) - Math.max(a, c)); }
    // The beam through the opening: how much of the tumor and of the organ it reaches, and the healthy tissue.
    function measure() {
      var F = FIELDS[current], tumor = 0, organ = 0, organTotal = 0, open = 0;
      F.rows.forEach(function (r, i) {
        var L = tip[i + ' left'], R = tip[i + ' right'];
        open += Math.max(0, R - L);
        r[0].forEach(function (t) { tumor += overlap(L, R, t[0], t[1]); });
        if (r[1]) { organ += overlap(L, R, r[1][0], r[1][1]); organTotal += r[1][1] - r[1][0]; }
      });
      return { tumor: tumor / F.total, organ: organTotal ? organ / organTotal : 0, healthy: open - tumor - organ, least: F.least };
    }
    function verdict(m) {
      var covered = m.tumor >= 1 - EPS, clear = m.organ <= EPS, tight = m.healthy <= m.least + EPS;
      if (covered && clear) return tight ? [3, T.v3] : [2, T.v2];
      if (covered) return [1, T.v1_organ];
      if (clear) return [1, T.v1_tumor];
      return [0, T.v0];
    }
    function amount(m) {
      if (Math.abs(m.healthy - m.least) <= EPS) return T.least;
      if (m.healthy < m.least) return T.under;
      var x = m.healthy / m.least;
      return x < 1.15 ? T.little : fill(T.times, { n: number(x, 1) });
    }
    // The words for a row, said after its leaf moves.
    function rowWords(i) {
      var r = FIELDS[current].rows[i], L = tip[i + ' left'], R = tip[i + ' right'], words;
      if (r[0].length) {
        var all = r[0].every(function (t) { return L <= t[0] + EPS && R >= t[1] - EPS; });
        words = all ? T.row_in : T.row_part;
      } else words = R > L ? T.row_none_open : T.row_none_closed;
      var organ = r[1] ? (overlap(L, R, r[1][0], r[1][1]) > EPS ? T.row_organ_hit : T.row_organ_clear) : '';
      return fill(T.row, { n: i + 1, tumor: words, organ: organ });
    }
    function beam(on) {                                         // the opening lit, or not
      lit = on;
      field.classList.toggle('is-lit', on);
      rays.forEach(function (ray, i) {
        var L = tip[i + ' left'], R = tip[i + ' right'];
        ray.style.left = pct(L + M);
        ray.style.width = pct(Math.max(0, R - L));
      });
      var m = on ? measure() : null;
      field.classList.toggle('is-organ-hit', !!(m && m.organ > EPS));
      if (!on) return null;
      var v = verdict(m);
      best = v[0] === 3;
      $all('.lx-star', status).forEach(function (st, k) { st.classList.toggle('is-on', k < v[0]); });
      $('[data-lx-stars]', status).setAttribute('aria-label', fill(T.stars, { n: v[0] }));
      $('[data-lx-verdict]', status).textContent = v[1];
      $('[data-lx-fig="tumor"]', status).textContent = fill(T.fig_tumor, { n: number(Math.floor(100 * m.tumor + EPS)) });
      $('[data-lx-fig="organ"]', status).textContent = fill(T.fig_organ, { n: number(Math.ceil(100 * m.organ - EPS)) });
      $('[data-lx-fig="healthy"]', status).textContent = fill(T.fig_healthy, { amount: amount(m) });
      $('[data-lx-last]', status).hidden = !(best && current === FIELDS.length - 1);
      return v;
    }
    // What the box under the buttons shows: the hint (or that the beam went off), or the verdict.
    function show(words) {
      if (words) { hint.textContent = words; said = words; }
      hint.hidden = lit;
      result.hidden = !lit;
      if (lit) status.setAttribute('data-result', best ? 'right' : 'tried'); else status.removeAttribute('data-result');
      goodBtn.hidden = !tried;
      nextBtn.hidden = !(lit && best);
      nextBtn.textContent = current === FIELDS.length - 1 ? T.restart : T.next;
    }
    function render() {
      var r = chosen ? range(chosen) : null, v = chosen ? tip[name(chosen)] : 0;
      disable(inBtn, !chosen || v === (left(chosen) ? r[1] : r[0]));
      disable(outBtn, !chosen || v === (left(chosen) ? r[0] : r[1]));
    }
    // A leaf moved: the beam goes off (if it was on), and screen readers hear the row's words.
    function moved(l, say) {
      if (lit) { beam(false); show(T.off); } else if (said === T.good_note) show(T.hint);
      render();
      if (say) announce(rowWords(+l.getAttribute('data-row')));
    }
    function open() {
      leaves.forEach(function (l) { tip[name(l)] = left(l) ? 0 : STEPS; });
      leaves.forEach(place);
    }
    function choose(l) {
      if (chosen === l) return;
      if (chosen) chosen.classList.remove('is-chosen');
      chosen = l;
      l.classList.add('is-chosen');
      render();
    }
    function load(k) {                                          // a tumor: its drawing, all the leaves out, the hint
      current = k;
      arts.forEach(function (a, i) { if (i === k) a.removeAttribute('hidden'); else a.setAttribute('hidden', ''); });   // (an svg has no .hidden)
      if (chosen) { chosen.classList.remove('is-chosen'); chosen = null; }
      which.textContent = T.which[k];
      tried = false;
      open();
      beam(false);
      show(T.hint);
      render();
    }
    leaves.forEach(function (l) {
      on(l, 'focus', function () { choose(l); });
      on(l, 'keydown', function (ev) {
        var r = range(l), v = tip[name(l)], to = null;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') to = v + 1;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') to = v - 1;
        else if (ev.key === 'PageUp') to = v + 3;
        else if (ev.key === 'PageDown') to = v - 3;
        else if (ev.key === 'Home') to = r[0];
        else if (ev.key === 'End') to = r[1];
        if (to === null) return;
        ev.preventDefault();
        if (set(l, to)) moved(l, true);
      });
      // A finger or the pointer dragging the leaf: its tip follows, step by step; the words are said when it lets go.
      on(l, 'pointerdown', function (ev) {
        if (ev.button) return;
        choose(l);
        try { l.focus({ preventScroll: true }); } catch (e) { l.focus(); }
        var dragged = false;
        l.classList.add('is-dragged');
        if (l.setPointerCapture) try { l.setPointerCapture(ev.pointerId); } catch (e) { /* carry on without it */ }
        function move(e) {
          var rect = field.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width * SPAN - M;
          if (set(l, Math.round(x))) { dragged = true; moved(l, false); }
        }
        function up() {
          l.classList.remove('is-dragged');
          l.removeEventListener('pointermove', move);
          l.removeEventListener('pointerup', up);
          l.removeEventListener('pointercancel', up);
          if (dragged) announce(rowWords(+l.getAttribute('data-row')));
        }
        on(l, 'pointermove', move);
        on(l, 'pointerup', up);
        on(l, 'pointercancel', up);
      });
    });
    function step(dir) {          // dir: +1 in, -1 out
      if (!chosen) return;
      if (set(chosen, tip[name(chosen)] + (left(chosen) ? dir : -dir))) moved(chosen, true);
    }
    on(inBtn, 'click', function () { if (inBtn.getAttribute('aria-disabled') !== 'true') step(1); });
    on(outBtn, 'click', function () { if (outBtn.getAttribute('aria-disabled') !== 'true') step(-1); });
    on(openBtn, 'click', function () { open(); beam(false); show(T.hint); render(); announce(T.hint); });
    on(beamBtn, 'click', function () {
      tried = true;
      var v = beam(true);
      show();
      if (v[0] === 3) celebrate($all('.lx-star', status)[1]);         // the middle star (the line spans the panel)
      announce(fill(T.stars, { n: v[0] }) + '. ' + spoken(result));     // (the stars are a picture: their words first)
    });
    on(goodBtn, 'click', function () {
      FIELDS[current].fit.forEach(function (f, i) { tip[i + ' left'] = f[0]; tip[i + ' right'] = f[1]; });
      leaves.forEach(place);
      beam(false);
      show(T.good_note);
      render();
      announce(T.good_note);
    });
    on(nextBtn, 'click', function () {
      load((current + 1) % FIELDS.length);
      announce(T.which[current] + '. ' + T.hint);
      try { beamBtn.focus({ preventScroll: true }); } catch (e) { beamBtn.focus(); }
    });
    load(0);
  })();

  // ---------------------------------------------------------------- 5. Many angles, one target
  (function () {
    var box = $('.lx-angles');
    if (!box) return;
    var beams = $all('.lx-beam', box);
    var counts = $all('.lx-count', box);
    var add = $('[data-lx-add]', box);
    var clear = $('[data-lx-clear]', box);
    var n = 0;
    function render(say) {
      var c = Math.min(n, counts.length - 1);
      box.setAttribute('data-beams', String(n));
      beams.forEach(function (b, k) { b.classList.toggle('is-on', k < n); });
      counts.forEach(function (p, k) { p.classList.toggle('is-current', k === c); });
      disable(add, n >= beams.length);
      disable(clear, n === 0);
      if (say) announce(counts[c].textContent);
    }
    on(add, 'click', function () { if (n < beams.length) { n += 1; render(true); } });
    on(clear, 'click', function () { if (n) { n = 0; render(true); } });
    render(false);
  })();

  // ---------------------------------------------------------------- 6. Your treatment journey
  (function () {
    var list = $('[data-lx-stages]');
    var box = list && list.closest('.lx-pathway');
    if (!box) return;
    var task = $('.lx-task', box);
    var check = $('[data-lx-check]', box);
    var mixBtn = $('[data-lx-mix]', box);
    var feedback = $('[data-lx-path-feedback]', box);
    var right = $('.lx-in-order', feedback);
    var notYet = $('.lx-not-yet', feedback);
    var ORDER = $all('.lx-stage', list).map(function (li) { return li.getAttribute('data-stage'); });   // the usual order
    // The first mix-up, the same in every language: no stage in its place. Six stages on the LINAC page; (3.03) seven on
    // the MRI page, whose seventh stage stayed first, and its fifth in its place, with the six-stage mix-up (found by
    // mri_page.py, 9 November 2026); any other number, each stage one place on.
    var FIRST = { 6: [2, 5, 0, 4, 1, 3], 7: [2, 5, 0, 6, 1, 3, 4] }[ORDER.length] ||
      ORDER.map(function (s, k) { return (k + 1) % ORDER.length; });
    function stages() { return $all('.lx-stage', list); }
    function placed() { return stages().filter(function (li, k) { return li.getAttribute('data-stage') === ORDER[k]; }).length; }
    function buttons() {
      var all = stages();
      all.forEach(function (li, k) {
        disable($('[data-lx-up]', li), k === 0);
        disable($('[data-lx-down]', li), k === all.length - 1);
      });
    }
    var MARK = { right: list.getAttribute('data-mark-right'), wrong: list.getAttribute('data-mark-wrong') };
    var SEP = LANG === 'fa' || LANG === 'ar' ? '، ' : ', ';
    function mark(li, state) {            // after a check: in its place or not yet (never where it belongs)
      if (state) li.setAttribute('data-state', state); else li.removeAttribute('data-state');
      $('[data-lx-state]', li).textContent = state ? SEP + MARK[state] : '';
    }
    function quiet() {
      feedback.classList.remove('is-shown');
      feedback.removeAttribute('data-result');
      stages().forEach(function (li) { mark(li, null); });
    }
    function arrange(order) {
      var by = {};
      stages().forEach(function (li) { by[li.getAttribute('data-stage')] = li; });
      order.forEach(function (k) { list.appendChild(by[ORDER[k]]); });
      buttons();
      quiet();
    }
    function mixed() {             // a new mix-up: no stage in its place, and not the one shown now
      var now = stages().map(function (li) { return ORDER.indexOf(li.getAttribute('data-stage')); });
      for (;;) {
        var o = ORDER.map(function (s, k) { return k; });
        for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = o[i]; o[i] = o[j]; o[j] = t; }
        if (o.every(function (k, i) { return k !== i; }) && o.join() !== now.join()) return o;
      }
    }
    on(list, 'click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-lx-up], [data-lx-down]') : null;
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      var li = b.closest('.lx-stage');
      var up = b.hasAttribute('data-lx-up');
      var other = up ? li.previousElementSibling : li.nextElementSibling;
      if (!other) return;
      if (up) list.insertBefore(li, other); else list.insertBefore(other, li);
      try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }    // the button moved with its stage
      buttons();
      quiet();
      announce(digits(stages().indexOf(li) + 1) + '. ' + $('h3', li).textContent);
    });
    on(check, 'click', function () {
      var n = placed(), ok = n === ORDER.length;
      stages().forEach(function (li, k) { mark(li, li.getAttribute('data-stage') === ORDER[k] ? 'right' : 'wrong'); });
      right.hidden = !ok;
      notYet.hidden = ok;
      if (!ok) notYet.textContent = fill(notYet.getAttribute('data-template'), { n: n });
      feedback.setAttribute('data-result', ok ? 'right' : 'wrong');
      feedback.classList.add('is-shown');
      announce(ok ? $('span:last-child', right).textContent : notYet.textContent);
      if (ok) celebrate(check);
    });
    on(mixBtn, 'click', function () { arrange(mixed()); announce(task.textContent); });
    right.hidden = true;
    arrange(FIRST);
  })();

  // ---------------------------------------------------------------- 8. Who does what
  // (3.04, stage 6, Ali's choice B of 15 November 2026) Each card is as tall as its text, the cards in columns (at most
  // three), in the style sheet alone: nothing to do here any more, and no "Show more". The same for part 6 of Inside a
  // LINAC, Many ways to treat.

  // ---------------------------------------------------------------- A short window (3.04, stage 6, item 11)
  // (Ali's choice B, 15 November 2026) The third part's drawing, which stays in view beside its steps on computers,
  // never has its bottom cut off: first it sits closer to the top bar (76 px tall) than its usual 112 px from the top,
  // never under the bar (10 px below it at the closest); only where that is not enough (below about 550 px of window
  // height at 1,280 px wide, 610 px from 1,440 px) does every activity drawing of the page shrink together, keeping its
  // 4:3 shape, as they share one frame (Ali's rule of 3 November 2026; --lx-fit in the style sheet). Set when the page
  // opens and again if the window is resized, never while scrolling.
  (function () {
    var pic = $('.lx-journey-pic');
    if (!pic || !window.matchMedia) return;
    var root = doc.documentElement, BAR = 76, GAP = 10, TOP = 112, timer = null;
    function fit() {
      root.style.removeProperty('--lx-stick');
      root.style.removeProperty('--lx-fit');
      if (!window.matchMedia('(min-width: 900px)').matches) return;
      var h = pic.getBoundingClientRect().height, win = window.innerHeight;
      if (!h || TOP + h <= win) return;
      var room = win - BAR - GAP;
      if (h <= room) { root.style.setProperty('--lx-stick', Math.floor(win - h) + 'px'); return; }
      root.style.setProperty('--lx-stick', (BAR + GAP) + 'px');
      root.style.setProperty('--lx-fit', Math.floor(room * 4 / 3) + 'px');
    }
    fit();
    on(window, 'resize', function () { clearTimeout(timer); timer = setTimeout(fit, 120); });
  })();

  // ---------------------------------------------------------------- 7. Safety by design: the pretend door
  // The door's button says what it will do ("Open the door", then "Close the door"). Opening the door stops the beam
  // (the lamp goes out), and closing it doesn't start it again: the beam stays off until the second button switches it
  // on, as the team does from the control area (Ali's wish, 2 November 2026: he took the lamp staying dark for a
  // mistake). That button works only while the door is closed (while it is open, the line says the beam can't be
  // switched on), and is off (aria-disabled) while the beam is on. The line under the door says what happened, and
  // screen readers hear it.
  (function () {
    var door = $('.lx-door');
    var toggle = door && $('.lx-door-toggle', door);
    var power = door && $('.lx-beam-on', door);
    if (!toggle || !power) return;
    var lines = $all('[data-when]', door);
    var toOpen = $('[data-label="open"]', toggle);
    var toClose = $('[data-label="close"]', toggle);
    function say(state) {                  // 'on', 'open', 'closed' (the beam off) or 'blocked'
      var shown = null;
      lines.forEach(function (l) { l.hidden = l.getAttribute('data-when') !== state; if (!l.hidden) shown = l; });
      announce(shown.textContent);
    }
    function beam(lit) {
      door.setAttribute('data-beam', lit ? 'on' : 'off');
      power.setAttribute('aria-disabled', lit ? 'true' : 'false');
    }
    on(toggle, 'click', function () {
      var open = door.getAttribute('data-door') !== 'open';
      door.setAttribute('data-door', open ? 'open' : 'closed');
      if (open) beam(false);               // the interlock stops the beam; closing the door doesn't start it again
      toOpen.hidden = open;
      toClose.hidden = !open;
      say(open ? 'open' : 'closed');
    });
    on(power, 'click', function () {
      if (power.getAttribute('aria-disabled') === 'true') return;
      if (door.getAttribute('data-door') === 'open') { say('blocked'); return; }
      beam(true);
      say('on');
    });
  })();
})();
