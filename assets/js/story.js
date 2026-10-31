/* The stories behind the pictures (since version 3.00; Ali's ideas of 28 and 30 October 2026), an easter egg.
   Each animated picture (the logo on the home page, the 404 of the page-not-found page, the shelf of Books &
   Guidelines and the seal of Standards in Medicine) keeps all its stories (content/*.toml, [stories]), and each
   visit shows the next one, as with the lines that change on each visit: the page head numbers the visit
   (data-pick2 to data-pick5 on the page), and the story is the remainder of that number divided by the number of
   stories. Claude wrote them; each language has its own.

   Nothing shows until someone lingers: the card opens under the picture when the pointer rests still on it for
   about two and a half seconds (moving the pointer starts the count again), when a finger holds the picture as
   long (a tap does nothing), or when the keyboard rests on the picture (it takes the focus; Enter opens the card
   at once). It closes when the pointer leaves the picture and the card, when the keyboard moves on, with a tap or
   a click on the picture or anywhere else, and with Escape. Screen readers hear the visit's story as the
   picture's description. Without this script the card never shows. On the page-not-found page, the picture's
   name and story follow the language shown. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  if (!doc.querySelectorAll || !window.addEventListener) return;
  var hosts = Array.prototype.slice.call(doc.querySelectorAll('[data-story]'));
  if (!hosts.length) return;
  var REST = 2500;        // how long the pointer, a finger or the keyboard rests on the picture (ms): Ali's "2 or 3 seconds"
  var STILL = 8;          // how far (px) the pointer may drift and still count as resting
  var SLIP = 12;          // how far (px) a finger may slip while holding
  var GRACE = 250;        // after the pointer leaves the picture and the card, so a small slip doesn't close it
  var open = null;        // the open story: { host, card, pinned }
  var timer = null;       // the count before a story opens
  var anchor = null;      // where the pointer started resting
  var hold = null;        // a finger holding the picture: { id, x, y }
  var swallow = false;    // the click that may follow a hold that opened the card

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function cards(host) { return host.querySelectorAll('.story-card'); }
  function cardOf(host) {             // the page-not-found page has one per language: the one shown
    var list = cards(host);
    if (list.length < 2) return list[0] || null;
    var lang = root.getAttribute('data-nf') || root.lang;
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute('lang') === lang) return list[i];
    return list[0];
  }
  function pick(card) {               // this visit's story
    var n = card.querySelectorAll('p').length;
    var k = n > 1 ? parseInt(root.getAttribute('data-pick' + n), 10) : 0;
    return k >= 0 && k < n ? k : 0;
  }
  function prepare(host) {            // show the visit's story in each card, and describe the picture with it
    each(cards(host), function (card) {
      var k = pick(card);
      each(card.querySelectorAll('p'), function (p, i) { p.hidden = i !== k; });
    });
    var pic = host.querySelector('[data-story-pic]');
    var card = cardOf(host);
    if (!pic || !card) return;
    var p = card.querySelectorAll('p')[pick(card)];
    if (p) pic.setAttribute('aria-describedby', p.id);
    if (card.getAttribute('data-label')) pic.setAttribute('aria-label', card.getAttribute('data-label'));
  }
  function wait() { clearTimeout(timer); timer = null; }
  function close() {
    wait();
    if (!open) return;
    open.card.classList.remove('is-open');
    open = null;
  }
  function show(host, pinned) {
    wait();
    var card = cardOf(host);
    if (!card) return;
    if (open && open.card !== card) close();
    card.classList.add('is-open');
    open = { host: host, card: card, pinned: !!pinned };
  }
  function isOpen(host) { return !!open && open.host === host; }

  hosts.forEach(function (host) {
    var pic = host.querySelector('[data-story-pic]');
    if (!pic) return;
    prepare(host);
    pic.tabIndex = 0;

    // The pointer resting still on the picture (a mouse).
    function rest(ev) {
      if (ev.pointerType !== 'mouse' || isOpen(host)) return;
      if (anchor && Math.abs(ev.clientX - anchor.x) <= STILL && Math.abs(ev.clientY - anchor.y) <= STILL) return;
      anchor = { x: ev.clientX, y: ev.clientY };
      wait();
      timer = setTimeout(function () { show(host, false); }, REST);
    }
    pic.addEventListener('pointerenter', rest);
    pic.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'mouse') { rest(ev); return; }
      if (hold && ev.pointerId === hold.id &&
          (Math.abs(ev.clientX - hold.x) > SLIP || Math.abs(ev.clientY - hold.y) > SLIP)) { hold = null; wait(); }
    });
    pic.addEventListener('pointerleave', function (ev) {
      if (ev.pointerType === 'mouse') { anchor = null; if (!isOpen(host)) wait(); }
    });
    host.addEventListener('pointerleave', function (ev) {
      if (ev.pointerType !== 'mouse' || !isOpen(host) || open.pinned) return;
      wait();
      timer = setTimeout(close, GRACE);
    });
    host.addEventListener('pointerenter', function (ev) {
      if (ev.pointerType === 'mouse' && isOpen(host)) wait();          // back on the card or the picture in time
    });

    // A finger holding the picture (a tap does nothing). Scrolling, or slipping off, stops the count.
    pic.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'mouse' || isOpen(host)) return;
      hold = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
      wait();
      timer = setTimeout(function () { hold = null; show(host, true); swallow = true; }, REST);
    });
    each(['pointerup', 'pointercancel'], function (type) {
      pic.addEventListener(type, function (ev) {
        if (hold && ev.pointerId === hold.id) { hold = null; wait(); }
      });
    });
    pic.addEventListener('contextmenu', function (ev) {       // a long press would open the browser's own menu
      if (hold || isOpen(host)) ev.preventDefault();
    });

    // A tap or a click on the picture closes an open card; it never opens one.
    pic.addEventListener('click', function () {
      if (swallow) { swallow = false; return; }
      if (isOpen(host)) close();
    });

    // The keyboard resting on the picture, or Enter (or Space) on it.
    pic.addEventListener('focus', function () {
      var keyboard = true;
      try { keyboard = pic.matches(':focus-visible'); } catch (e) { /* older browsers: assume the keyboard */ }
      if (!keyboard || isOpen(host)) return;
      wait();
      timer = setTimeout(function () { show(host, false); }, REST);
    });
    pic.addEventListener('blur', function () {
      if (isOpen(host) && !open.pinned) close();
      else if (!isOpen(host)) wait();
    });
    pic.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
      ev.preventDefault();
      if (isOpen(host)) close();
      else show(host, false);
    });
  });

  doc.addEventListener('keydown', function (ev) {
    if ((ev.key === 'Escape' || ev.key === 'Esc') && (open || timer)) close();
  });
  // A press anywhere else closes it (also the page-not-found page's language buttons).
  doc.addEventListener('pointerdown', function (ev) {
    swallow = false;
    if (open && !open.host.contains(ev.target)) close();
  }, true);
  // The page-not-found page: a new language brings the picture's name and story in that language.
  if (window.MutationObserver && root.hasAttribute('data-nf')) {
    new MutationObserver(function () {
      close();
      hosts.forEach(prepare);
    }).observe(root, { attributes: true, attributeFilter: ['data-nf'] });
  }
})();
