/* Inside an Ultrasound Scanner (learn/devices/ultrasound/, since version 3.04): the parts of the tutorial built for
   it, which do something. This file is loaded on that page only, and does nothing where its parts are missing (each
   part looks for its own). No libraries, no tracking, nothing sent anywhere. Everything the page says is in it before
   this script runs; without the script each part shows all it has to say, and the style sheet sets each part's first
   state from the first moment (the page's class "js"), so nothing moves when the script arrives. Nothing moves by
   itself: each change follows a press, a key or a finger, and screen readers hear it, politely, through the page's
   live region (data-announce); with reduced motion the pulse does not travel and nothing flows (site.css). The numbers
   come ready from the page, in its own digits.
   - Time the echo: "Choose the pitch" (a range: the arrow keys, Home and End, a finger or the pointer): the two bars,
     Detail and Reach, follow it, and the line under them. Then the game, four echoes in turn: "Send a pulse" sends the
     pulse to the boundary and back; then the echo's time and the depths to choose from (buttons); a right answer
     draws the dot and says how the page worked it out; a wrong one says how, and the reader tries again. The fourth
     echo crossed a layer of fat: three answers. "Next echo", and at the end "Start again".
   - What it shows, and what it cannot: Read the clues (a button under each picture, or the picture itself; the answer
     marked, the pictures' lines shown in full, the words after the answer; the cells' celebration when right); What
     is that whooshing sound? (a switch: while it is on, the blood flows and the speaker's waves show, without a
     sound). */
(function () {
  'use strict';
  var doc = document;
  if (!doc.querySelector || !doc.querySelector('[data-ux-pitch], [data-ux-game], [data-ux-heads], [data-ux-whoosh]')) return;

  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $all(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }
  function on(el, type, fn, opts) { if (el) el.addEventListener(type, fn, opts || false); }
  function fill(tpl, vals) {
    return tpl.replace(/\{(\w+)\}/g, function (m, k) { return k in vals ? vals[k] : m; });
  }
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  // The page's live region (site.js and linac.js use it too): emptied, then filled a moment later, so the same words
  // twice are said twice.
  var announcer = $('[data-announce]');
  var saying = 0;
  var later = 0;                                  // the pitch's line, said a moment after the slider rests
  function announce(text) {
    if (!announcer || !text) return;
    clearTimeout(later);                          // whatever is said now is newer than a line still waiting
    clearTimeout(saying);
    announcer.textContent = '';
    saying = setTimeout(function () { announcer.textContent = text; }, 150);
  }
  function sentence(text) { return /[.:!?؟]$/.test(text) ? text : text + '.'; }
  // A box's words as they should be read out: without its buttons, pictures and hidden words.
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
  function focus(el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  function setSwitch(b, lit) {
    b.setAttribute('aria-checked', lit ? 'true' : 'false');
    var st = $('.mx-state', b);
    if (st) st.textContent = st.getAttribute(lit ? 'data-on' : 'data-off');
  }

  // ---------------------------------------------------------------- 4. Time the echo: Choose the pitch
  // Five stops, the lowest first (on the left on every page). Detail rises and reach falls, stop by stop; the line
  // under the bars is the low pitch's for the two lowest stops, the high pitch's for the two highest, and the one in
  // between for the middle. Screen readers hear the slider's own value (the stop's name), then the line.
  (function () {
    var box = $('[data-ux-pitch]');
    var range = box && $('.mx-range', box);
    if (!range) return;
    var stops = JSON.parse(range.getAttribute('data-stops'));
    var stop = $('[data-ux-stop]', box);
    var detail = $('[data-ux-detail]', box);
    var reach = $('[data-ux-reach]', box);
    var lines = $all('[data-ux-pitch-lines] p', box);
    var last = stops.length - 1;
    function render(say) {
      var k = +range.value;
      var level = k < last / 2 ? 'low' : (k > last / 2 ? 'high' : 'mid');
      range.setAttribute('aria-valuetext', stops[k]);
      stop.textContent = stops[k];
      detail.style.width = (20 + 80 * k / last) + '%';
      reach.style.width = (100 - 80 * k / last) + '%';
      box.setAttribute('data-level', level);
      lines.forEach(function (p) { p.classList.toggle('is-current', p.getAttribute('data-when') === level); });
      if (say) {
        clearTimeout(later);
        later = setTimeout(function () {
          var line = lines.filter(function (p) { return p.classList.contains('is-current'); })[0];
          if (line) announce(line.textContent);
        }, 700);
      }
    }
    on(range, 'input', function () { render(true); });
    on(range, 'change', function () { render(true); });
    render(false);
  })();

  // ---------------------------------------------------------------- 4. Time the echo: the game
  (function () {
    var game = $('[data-ux-game]');
    if (!game) return;
    var rounds = JSON.parse(game.getAttribute('data-rounds'));
    var fatRight = game.getAttribute('data-fat-right');
    var total = rounds.length;
    var roundLine = $('[data-ux-round]', game);
    var fatLine = $('[data-ux-fat]', game);
    var send = $('[data-ux-send]', game);
    var ask = $('[data-ux-ask]', game);
    var time = $('[data-ux-time]', game);
    var q = $('#echo-q', game);
    var depths = $all('[data-d].ux-choice', game);
    var fats = $all('[data-fat].ux-choice', game);
    var feedback = $('[data-ux-feedback]', game);
    var verdict = $('.verdict', feedback);
    var after = $('[data-ux-after]', feedback);
    var done = $('[data-ux-done]', feedback);
    var next = $('[data-ux-next]', game);
    var again = $('[data-ux-again]', game);
    var CM = 15;                                  // the drawing's units to a centimeter (art_us.ECHO_CM)
    var n = 1;
    var waiting = 0;
    function lock(list, off) {
      list.forEach(function (b) { if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); });
    }
    function start(k, say) {
      clearTimeout(waiting);
      n = k;
      var r = rounds[n - 1];
      game.setAttribute('data-round', String(n));
      game.setAttribute('data-state', 'ready');
      game.removeAttribute('data-dot');
      roundLine.textContent = fill(roundLine.getAttribute('data-template'), { n: rounds[n - 1].n, total: rounds[total - 1].n });
      fatLine.hidden = !r.fat;
      send.hidden = false;
      ask.hidden = true;
      feedback.classList.remove('is-shown');
      feedback.removeAttribute('data-result');
      done.hidden = true;
      next.hidden = true;
      again.hidden = true;
      depths.concat(fats).forEach(function (b) { b.removeAttribute('data-state'); });
      lock(depths.concat(fats), false);
      depths.forEach(function (b) { b.hidden = !!r.fat; });
      fats.forEach(function (b) { b.hidden = !r.fat; });
      if (say) announce(roundLine.textContent + (r.fat ? '. ' + fatLine.textContent : ''));
    }
    function showAsk() {
      var r = rounds[n - 1];
      game.setAttribute('data-state', 'ask');
      send.hidden = true;
      time.hidden = !!r.fat;
      time.textContent = r.fat ? '' : fill(time.getAttribute('data-template'), { t: r.t });
      q.textContent = q.getAttribute(r.fat ? 'data-fat-q' : 'data-q');
      ask.hidden = false;
      announce((r.fat ? '' : time.textContent + ' ') + q.textContent);
      focus((r.fat ? fats : depths)[0]);
    }
    on(send, 'click', function () {
      if (game.getAttribute('data-state') !== 'ready') return;
      var r = rounds[n - 1];
      if (reduce.matches) { showAsk(); return; }
      var secs = 0.5 + r.d * 0.11;                // a deeper boundary keeps the reader waiting longer: time tells depth
      game.style.setProperty('--ue-y', (r.d * CM - 14) + 'px');
      game.style.setProperty('--ue-time', secs + 's');
      game.setAttribute('data-state', 'sent');
      waiting = setTimeout(showAsk, secs * 1000 + 80);
    });
    function answer(b, right, text, last) {
      verdict.textContent = feedback.getAttribute(right ? 'data-right' : 'data-wrong');
      after.textContent = text;
      feedback.setAttribute('data-result', right ? 'right' : 'wrong');
      feedback.classList.add('is-shown');
      depths.concat(fats).forEach(function (o) { if (o !== b && o.getAttribute('data-state') === 'wrong') o.removeAttribute('data-state'); });
      b.setAttribute('data-state', right ? 'right' : 'wrong');
      if (right) {
        game.setAttribute('data-state', 'right');
        lock(depths.concat(fats), true);
        if (last) {
          done.textContent = feedback.getAttribute('data-done');
          done.hidden = false;
          again.hidden = false;
        } else {
          next.hidden = false;
        }
        celebrate(b);
        focus(last ? again : next);
      }
      announce(spoken(feedback));
    }
    depths.forEach(function (b) {
      on(b, 'click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        var r = rounds[n - 1];
        var right = +b.getAttribute('data-d') === r.d;
        if (right) game.setAttribute('data-dot', String(r.d));
        answer(b, right, fill(feedback.getAttribute(right ? 'data-after-right' : 'data-after-wrong'), { s: r.s, d: r.dn }), false);
      });
    });
    fats.forEach(function (b) {
      on(b, 'click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        var right = b.getAttribute('data-fat') === fatRight;
        if (right) game.setAttribute('data-dot', 'deep');
        answer(b, right, right ? feedback.getAttribute('data-fat-after') : fatLine.textContent, true);
      });
    });
    on(next, 'click', function () { start(n + 1, true); focus(send); });
    on(again, 'click', function () { start(1, true); focus(send); });
    start(1, false);
  })();

  // ---------------------------------------------------------------- 5. Read the clues
  // A button under each picture (the picture itself too): the choice is marked right or wrong, as the site's answers
  // are, the right one shown if it was missed, both pictures' lines shown in full, and the words after the answer
  // follow "Correct." or "Not quite."; a right answer gets the cells' celebration. Another try is allowed.
  (function () {
    var list = $('[data-ux-heads]');
    if (!list) return;
    var answer = list.getAttribute('data-answer');
    var picks = $all('.mx-pick', list);
    var feedback = $('[data-ux-after]', list.parentNode);
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
        if (b) { b.click(); focus(b); }
      });
    });
  })();

  // ---------------------------------------------------------------- 5. What is that whooshing sound?
  // The switch: while the Doppler sound is on, the blood flows and the speaker's waves show (site.css; still with
  // reduced motion, the waves drawn). No sound is played. Screen readers hear the switch's state.
  (function () {
    var box = $('[data-ux-whoosh]');
    var sw = box && $('[data-ux-sound]', box);
    if (!sw) return;
    on(sw, 'click', function () {
      var lit = sw.getAttribute('aria-checked') !== 'true';
      setSwitch(sw, lit);
      box.setAttribute('data-flow', lit ? 'on' : 'off');
    });
  })();
})();
