/* Inside an MRI (learn/devices/mri/, since version 3.03): the parts of the tutorial built for it, which do something.
   This file is loaded on that page only, and does nothing where its parts are missing (each part looks for its own).
   No libraries, no tracking, nothing sent anywhere. Everything the page says is in it before this script runs; without
   the script each part shows all it has to say, and the style sheet sets each part's first state from the first moment
   (the page's class "js"), so nothing moves when the script arrives. Nothing moves by itself: each change follows a
   press, a key or a finger, and screen readers hear it, politely, through the page's live region (data-announce); with
   reduced motion nothing glides, and the knocking stays still (site.css). The numbers come ready from the page, in its
   own digits; the few the script writes ({n}) it writes in them too.
   - Pick a slice: the warm-up's slider (a range: the arrow keys, Home and End, a finger or the pointer) sets the
     magnet's strength; the readouts follow, and hydrogen's mark moves along the little scale, against the FM band. In
     the game, the gradient's switch (Gradient: off / on); with it on, the five bands under the body (buttons, one at a
     time, aria-pressed) light their slice, and "Narrower band" (off while the gradient is) halves the bands and the
     slices.
   - Many pictures, one exam: Spot the fluid (a button under each picture, or the picture itself; the answer marked, the
     pictures' lines shown in full, the words after the answer; the cells' celebration when right); Why is it so loud?
     (the gradient's switch: while it is on, the coil knocks, without a sound).
   - Safety by design, Four zones, one door: each of the seven to the door, the staff's answer, in or back; Start again. */
(function () {
  'use strict';
  var doc = document;
  if (!doc.querySelector || !doc.querySelector('[data-mx-tuner], .mx-game, [data-mx-heads], .mx-loud, [data-mx-zones]')) return;
  var LANG = doc.documentElement.lang;
  var DIGITS = { fa: '۰۱۲۳۴۵۶۷۸۹', ar: '٠١٢٣٤٥٦٧٨٩' };
  var SEP = LANG === 'fa' || LANG === 'ar' ? '، ' : ', ';

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
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  // The page's live region (site.js, and linac.js where it runs, use it too): emptied, then filled a moment later, so
  // the same words twice are said twice.
  var announcer = $('[data-announce]');
  var saying = 0;
  function announce(text) {
    if (!announcer || !text) return;
    clearTimeout(saying);
    announcer.textContent = '';
    saying = setTimeout(function () { announcer.textContent = text; }, 150);
  }
  // Words ending as a sentence does (a full stop where they have none of their own).
  function sentence(text) { return /[.:!?؟]$/.test(text) ? text : text + '.'; }
  // A box's words as they should be read out: without its buttons, pictures and hidden words, headings, lines and
  // labels kept apart (each gets a full stop if it has none of its own).
  function spoken(el) {
    var copy = el.cloneNode(true);
    $all('button, svg, [aria-hidden="true"], [hidden]', copy).forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
    $all('h1, h2, h3, h4, p, li, .badge', copy).forEach(function (h) {
      h.appendChild(doc.createTextNode(/[.:!?؟]\s*$/.test(h.textContent) ? ' ' : '. '));
    });
    return sentence(copy.textContent.replace(/\s+/g, ' ').trim());
  }
  // The cells' celebration, the burst of the site's right answers (site.js draws it from el; none with reduced motion).
  function celebrate(el) {
    try { doc.dispatchEvent(new CustomEvent('tz:burst', { detail: el })); } catch (e) { /* an old browser: no burst */ }
  }
  // The gradient's switch: its state, for screen readers (aria-checked) and on screen ("Gradient: on").
  function setSwitch(b, lit) {
    b.setAttribute('aria-checked', lit ? 'true' : 'false');
    var st = $('.mx-state', b);
    if (st) st.textContent = st.getAttribute(lit ? 'data-on' : 'data-off');
  }

  // ---------------------------------------------------------------- 4. Pick a slice: Tune in to hydrogen
  // The slider goes through the stops (data-stops: each stop's strength, frequency and times the Earth's field, ready in
  // the page's digits, and where the frequency sits on the scale); the readouts' numbers follow, the mark moves, and
  // screen readers hear the frequency's two lines a moment after the slider stops (the slider says its own value).
  (function () {
    var tuner = $('[data-mx-tuner]');
    var range = tuner && $('.mx-range', tuner);
    if (!range) return;
    var STOPS = JSON.parse(tuner.getAttribute('data-stops'));
    var tpl = range.getAttribute('data-template');
    var marker = $('[data-mx-marker]', tuner);
    var stops = $all('.mx-stops li', tuner);
    var said = $all('[data-mx-say]', tuner);
    var wait = 0;
    function render(say) {
      var k = Math.max(0, Math.min(STOPS.length - 1, parseInt(range.value, 10) || 0));
      var v = STOPS[k];
      $all('[data-mx-v]', tuner).forEach(function (b) { b.textContent = v[b.getAttribute('data-mx-v')]; });
      if (marker) marker.style.left = (100 * v.at).toFixed(2) + '%';
      stops.forEach(function (li, i) { li.classList.toggle('is-current', i === k); });
      range.setAttribute('aria-valuetext', fill(tpl, { t: v.t }));
      if (!say) return;
      clearTimeout(wait);
      wait = setTimeout(function () { announce(said.map(spoken).join(' ')); }, 450);   // (each line a sentence)
    }
    on(range, 'input', function () { render(true); });
    on(range, 'change', function () { render(true); });
    render(false);
  })();

  // ---------------------------------------------------------------- 4. Pick a slice: the game
  // Off: the whole body lit, the line "off". On: the line "on", and the bands under the body (visible and reachable
  // only then); a band lights its slice, and the line "after" says which ({n}, counted from the feet). "Narrower band"
  // halves the bands (each button's name changes to its narrow band) and the lit slice. Switching the gradient off or on
  // starts again from no band.
  (function () {
    var game = $('.mx-game');
    var sw = game && $('[data-mx-gradient]', game);
    if (!sw) return;
    var narrowBtn = $('[data-mx-narrow]', game);
    var bands = $all('.mx-band', game);
    var status = $('[data-mx-status]', game);
    var lines = $all('[data-when]', status);
    var after = $('[data-when="after"]', status);
    var lit = false, band = 0, narrow = false;
    function say(which) {                  // 'off', 'on' or 'after': the line shown, and its words
      var shown = null;
      if (which === 'after') after.textContent = fill(after.getAttribute('data-template'), { n: band });
      lines.forEach(function (l) { l.hidden = l.getAttribute('data-when') !== which; if (!l.hidden) shown = l; });
      return shown.textContent;
    }
    function render() {
      game.setAttribute('data-gradient', lit ? 'on' : 'off');
      game.setAttribute('data-band', String(band));
      game.setAttribute('data-w', narrow ? 'narrow' : 'wide');
      setSwitch(sw, lit);
      narrowBtn.setAttribute('aria-disabled', lit ? 'false' : 'true');
      narrowBtn.setAttribute('aria-pressed', narrow ? 'true' : 'false');
      bands.forEach(function (b) {
        b.setAttribute('aria-pressed', +b.getAttribute('data-band') === band ? 'true' : 'false');
        $('.mx-band-name', b).textContent = b.getAttribute(narrow ? 'data-narrow' : 'data-wide');
      });
    }
    on(sw, 'click', function () {
      lit = !lit;
      band = 0;
      render();
      announce(say(lit ? 'on' : 'off'));
    });
    bands.forEach(function (b) {
      on(b, 'click', function () {
        if (!lit) return;
        band = +b.getAttribute('data-band');
        render();
        announce(say('after'));
      });
    });
    on(narrowBtn, 'click', function () {
      if (narrowBtn.getAttribute('aria-disabled') === 'true') return;
      narrow = !narrow;
      render();
      if (band) announce(say('after'));
    });
    render();
    say('off');
  })();

  // ---------------------------------------------------------------- 5. Many pictures, one exam: Spot the fluid
  // A button under each picture (the picture itself does the same, for the pointer); the answer is marked in the
  // quizzes' colours (right: a tick; wrong: a cross, and the right one outlined), both pictures' lines show in full, and
  // the words after the answer follow "Correct." or "Not quite.". Another choice can follow.
  (function () {
    var list = $('[data-mx-heads]');
    if (!list) return;
    var answer = list.getAttribute('data-answer');
    var picks = $all('.mx-pick', list);
    var box = list.parentNode;
    var feedback = $('[data-mx-after]', box);
    var verdict = $('.verdict', feedback);
    picks.forEach(function (b) {
      on(b, 'click', function () {
        var right = b.getAttribute('data-choice') === answer;
        picks.forEach(function (o) {
          var isAnswer = o.getAttribute('data-choice') === answer;
          if (o === b) o.setAttribute('data-state', right ? 'right' : 'wrong');
          else if (isAnswer && !right) o.setAttribute('data-state', 'answer');
          else o.removeAttribute('data-state');
          $('.mx-reveal', o).hidden = false;
        });
        list.classList.add('is-answered');
        verdict.textContent = feedback.getAttribute(right ? 'data-right' : 'data-wrong');
        feedback.setAttribute('data-result', right ? 'right' : 'wrong');
        feedback.classList.add('is-shown');
        announce(spoken(feedback));
        if (right) celebrate(b);
      });
    });
    $all('.mx-head-pic', list).forEach(function (pic) {
      on(pic, 'click', function () {
        var b = $('.mx-pick', pic.parentNode);
        if (b) { b.click(); try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
      });
    });
  })();

  // ---------------------------------------------------------------- 5. Many pictures, one exam: Why is it so loud?
  // The switch: while the gradient is on, the coil glows and knocks (site.css; still with reduced motion, the knocks
  // drawn round it). Screen readers hear the switch's state.
  (function () {
    var box = $('.mx-loud');
    var sw = box && $('[data-mx-knock]', box);
    if (!sw) return;
    on(sw, 'click', function () {
      var lit = sw.getAttribute('aria-checked') !== 'true';
      setSwitch(sw, lit);
      box.setAttribute('data-gradient', lit ? 'on' : 'off');
    });
  })();

  // ---------------------------------------------------------------- 7. Safety by design: Four zones, one door
  // A button for each of the seven: its token goes to the door; the staff's answer shows beside the plan (its verdict,
  // after "May go in" or "Stays out") and is said; then, what may pass goes in (the door opens), and the rest goes back
  // where it waited, marked with a cross. Each button then says, after its name, what happened, and carries the
  // quizzes' tick or cross. A new choice finishes the token still moving. Start again sends all back. With reduced
  // motion each token is at once where it ends.
  (function () {
    var grid = $('[data-mx-zones]');
    if (!grid) return;
    var picks = $all('.mx-item', grid);
    var list = $('[data-mx-verdicts]', grid);
    var answers = $all('.mx-verdict', list);
    var again = $('[data-mx-again]', grid);
    var door = $('.mz-door', grid);
    var tokens = {};
    $all('.mz-token', grid).forEach(function (t) { tokens[t.getAttribute('data-item')] = t; });
    function at(attr) { var xy = grid.getAttribute(attr).split(' '); return 'translate(' + xy[0] + 'px, ' + xy[1] + 'px)'; }
    var DOOR = at('data-door'), THROUGH = at('data-through');
    var timers = [], pending = null;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function finish() {                     // the token still moving goes at once where it ends
      timers.forEach(clearTimeout);
      timers = [];
      if (pending) { var f = pending; pending = null; f(); }
    }
    function jump(t, where) {               // without gliding
      t.style.transition = 'none';
      t.style.transform = where;
      t.getBoundingClientRect();
      t.style.transition = '';
    }
    function home(t) { return t.style.getPropertyValue('--home'); }
    function end(t) { return t.style.getPropertyValue('--end'); }
    function pick(b) {
      finish();
      var id = b.getAttribute('data-item');
      var t = tokens[id];
      var inside = b.getAttribute('data-pass') === 'in';
      var li = answers.filter(function (a) { return a.getAttribute('data-item') === id; })[0];
      answers.forEach(function (a) { a.classList.toggle('is-current', a === li); });
      list.classList.add('is-shown');
      list.setAttribute('data-result', inside ? 'in' : 'out');
      b.setAttribute('data-state', inside ? 'in' : 'out');
      $('[data-mx-state]', b).textContent = SEP + $('.mx-badge', li).textContent;
      again.hidden = false;
      announce(spoken(li));
      if (!t) return;
      function done() {
        t.style.transform = inside ? end(t) : home(t);
        t.setAttribute('data-state', inside ? 'in' : 'out');
        if (door) door.classList.remove('is-open');
      }
      t.removeAttribute('data-state');
      if (reduce.matches) { jump(t, inside ? end(t) : home(t)); done(); return; }
      pending = done;
      later(function () { t.style.transform = DOOR; }, 30);       // from where it is (back from the room, if it was in)
      if (inside) {
        later(function () { if (door) door.classList.add('is-open'); }, 620);
        later(function () { t.style.transform = THROUGH; }, 900);
        later(function () { pending = null; done(); }, 1350);
      } else {
        later(function () { t.setAttribute('data-state', 'out'); }, 650);
        later(function () { pending = null; done(); }, 1250);
      }
    }
    picks.forEach(function (b) { on(b, 'click', function () { pick(b); }); });
    on(again, 'click', function () {
      timers.forEach(clearTimeout);
      timers = [];
      pending = null;
      Object.keys(tokens).forEach(function (k) {
        var t = tokens[k];
        t.removeAttribute('data-state');
        if (reduce.matches) jump(t, home(t)); else t.style.transform = home(t);
      });
      if (door) door.classList.remove('is-open');
      picks.forEach(function (b) { b.removeAttribute('data-state'); $('[data-mx-state]', b).textContent = ''; });
      answers.forEach(function (a) { a.classList.remove('is-current'); });
      list.classList.remove('is-shown');
      list.removeAttribute('data-result');
      again.hidden = true;
      try { picks[0].focus({ preventScroll: true }); } catch (e) { picks[0].focus(); }
      announce(spoken(doc.getElementById('safety-zones-intro')));
    });
  })();
})();
