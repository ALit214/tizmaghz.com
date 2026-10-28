/* Ali TizMaghz — site behaviour. No libraries, no tracking.
   Everything on the page can be read without this script; it adds the theme and menu controls,
   the logo animation, the copy button and the Explore & learn activities.
   Choices are remembered in this browser only (theme, language, sound), when the browser allows it,
   and so is the visit number that picks the lines that change on each visit (set in the page head). */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var dataEl = doc.getElementById('site-data');
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var T = DATA.t;
  var LANG = DATA.lang;

  // ---------------------------------------------------------------- small helpers
  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $all(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }
  function on(el, type, fn, opts) { if (el) el.addEventListener(type, fn, opts || false); }
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked: carry on */ } }
  };
  var session = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    remove: function (k) { try { window.sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  function media(q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; }
  function onMediaChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  var DIGITS = { fa: '۰۱۲۳۴۵۶۷۸۹', ar: '٠١٢٣٤٥٦٧٨٩' };
  function digits(n) {
    var s = String(n);
    if (!DIGITS[LANG]) return s;
    return s.replace(/[0-9]/g, function (d) { return DIGITS[LANG].charAt(+d); });
  }
  function fill(tpl, vals) {
    return tpl.replace(/\{(\w+)\}/g, function (m, k) {
      if (!(k in vals)) return m;
      return typeof vals[k] === 'number' ? digits(vals[k]) : vals[k];
    });
  }
  var reduceMotion = media('(prefers-reduced-motion: reduce)');
  // Move the page at once, without the smooth scrolling the style sheet asks for (works in every browser).
  function jumpTo(y) {
    var style = doc.documentElement.style, before = style.scrollBehavior;
    style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    style.scrollBehavior = before;
  }

  // ---------------------------------------------------------------- theme: System / Light / Dark
  var themeButtons = $all('[data-theme-choice]');
  function showThemeChoice(choice) {
    themeButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme-choice') === choice ? 'true' : 'false'); });
  }
  var savedTheme = store.get('theme');
  showThemeChoice(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system');
  themeButtons.forEach(function (b) {
    on(b, 'click', function () {
      var choice = b.getAttribute('data-theme-choice');
      if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
      else root.removeAttribute('data-theme');
      store.set('theme', choice);
      showThemeChoice(choice);
    });
  });

  // ---------------------------------------------------------------- keyboard or pointer
  // Whether the visitor is moving around with the keyboard (true) or by tapping, clicking or scrolling.
  // The header stays in view while keyboard focus is in it; focus left on a tapped button doesn't count.
  var keyboardUser = false;
  on(doc, 'keydown', function (ev) { if (!/^(Shift|Control|Alt|Meta)$/.test(ev.key)) keyboardUser = true; }, true);
  on(doc, 'pointerdown', function () { keyboardUser = false; }, true);
  on(doc, 'wheel', function () { keyboardUser = false; }, { passive: true });
  on(doc, 'touchstart', function () { keyboardUser = false; }, { passive: true });

  // ---------------------------------------------------------------- phone menu
  // Closes with the menu button, a link in it, a tap or click anywhere outside it, Escape, or the
  // keyboard focus moving out of it. The button tells screen readers whether it is open (aria-expanded);
  // on screen its icon changes, and its label stays "Menu", so the header never changes width.
  var menuToggle = $('.menu-toggle');
  var menu = doc.getElementById('site-menu');
  var compact = media('(max-width: 759.98px)');
  function menuOpen() { return !!(menu && menu.classList.contains('open')); }
  function setMenu(open) {
    if (!menuToggle || !menu) return;
    menu.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  on(menuToggle, 'click', function () { setMenu(!menuOpen()); });
  on(menu, 'click', function (ev) {
    if (compact.matches && ev.target.closest && ev.target.closest('.site-nav a')) setMenu(false);
  });
  // pointerdown rather than click: iPhones send no click for a tap on plain text.
  on(doc, 'pointerdown', function (ev) {
    if (menuOpen() && !menu.contains(ev.target) && !menuToggle.contains(ev.target)) setMenu(false);
  }, true);
  on(doc, 'keydown', function (ev) {
    if ((ev.key === 'Escape' || ev.key === 'Esc') && menuOpen()) {
      var inside = menu.contains(doc.activeElement);
      setMenu(false);
      if (inside) menuToggle.focus();
    }
  });
  on(menu, 'focusout', function (ev) {
    var to = ev.relatedTarget;
    if (menuOpen() && to && !menu.contains(to) && to !== menuToggle) setMenu(false);
  });
  onMediaChange(compact, function () { setMenu(false); });

  // ---------------------------------------------------------------- Explore & learn's short list (computers)
  // Since version 2.00, Explore & learn opens a short list on computers: the activities and the pages of their own.
  // A click or tap on its button (or Enter or Space) opens and closes it; it also closes with a link in it, a click
  // or tap anywhere outside it, Escape (which brings the keyboard focus back to the button), or the keyboard focus
  // moving out of it. On phones the list is part of the menu itself, and the button is hidden.
  var subItem = $('.nav-explore');
  var subToggle = $('.nav-explore-toggle');
  function subOpen() { return !!(subItem && subItem.classList.contains('open')); }
  function setSub(open) {
    if (!subItem || !subToggle) return;
    subItem.classList.toggle('open', open);
    subToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  on(subToggle, 'click', function () { setSub(!subOpen()); });
  on(subItem, 'click', function (ev) {
    if (ev.target.closest && ev.target.closest('.nav-sub a')) setSub(false);
  });
  on(doc, 'pointerdown', function (ev) {
    if (subOpen() && !subItem.contains(ev.target)) setSub(false);
  }, true);
  on(doc, 'keydown', function (ev) {
    if ((ev.key === 'Escape' || ev.key === 'Esc') && subOpen()) {
      var inside = subItem.contains(doc.activeElement);
      setSub(false);
      if (inside) subToggle.focus();
    }
  });
  on(subItem, 'focusout', function (ev) {
    var to = ev.relatedTarget;
    if (subOpen() && to && !subItem.contains(to)) setSub(false);
  });
  onMediaChange(compact, function () { setSub(false); });

  // ---------------------------------------------------------------- the header slides away while reading down
  // and comes back on scrolling up. It stays near the top of the page, while the menu or Explore & learn's list is
  // open, and while keyboard focus is in it.
  var Masthead = (function () {
    var mast = $('.masthead');
    if (!mast) return { settle: function () {}, away: function () {}, bottom: function () { return 0; }, height: function () { return 0; } };
    var lastY = window.pageYOffset;
    var down = 0;
    var up = 0;
    var ticking = false;
    var jumping = false;   // the page is gliding to a section the reader chose in the header
    var jumpTimer = 0;
    function endJump() { jumping = false; lastY = window.pageYOffset; down = 0; up = 0; }
    function update() {
      ticking = false;
      var y = window.pageYOffset;
      if (jumping) {
        // Keep the header away until the page stops (it would come back while going up the page and cover
        // the section's heading), except at the very top.
        lastY = y;
        mast.classList.toggle('is-stuck', y > 8);
        mast.classList.toggle('is-hidden', y >= 140);
        clearTimeout(jumpTimer);
        jumpTimer = setTimeout(endJump, 200);
        return;
      }
      if (y > lastY) { down += y - lastY; up = 0; } else if (y < lastY) { up += lastY - y; down = 0; }
      lastY = y;
      mast.classList.toggle('is-stuck', y > 8);
      var keep = y < 140 || menuOpen() || subOpen() || (keyboardUser && mast.contains(doc.activeElement));
      if (keep || up > 12) mast.classList.remove('is-hidden');
      else if (down > 24) mast.classList.add('is-hidden');
    }
    on(window, 'scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    on(mast, 'focusin', function () { mast.classList.remove('is-hidden'); });
    // A page that opens partway down (after a refresh, Back or Forward, or at an address with a section)
    // starts with the header away, as if the reader had scrolled there, so it covers nothing; it comes
    // back on scrolling up.
    if (lastY >= 140) mast.classList.add('is-hidden');
    update();
    return {
      // After the page has been moved for the reader (a language switch): header in view, counting afresh.
      settle: function () {
        lastY = window.pageYOffset; down = 0; up = 0;
        mast.classList.remove('is-hidden');
        mast.classList.toggle('is-stuck', lastY > 8);
      },
      // A section link in the header was followed: the header slides away for the jump, up or down the
      // page, so it covers nothing where the page stops; it comes back on scrolling up.
      away: function () {
        jumping = true;
        mast.classList.add('is-hidden');
        clearTimeout(jumpTimer);
        jumpTimer = setTimeout(endJump, 1200);   // in case the page doesn't move at all
      },
      // Where the header ends, from the top of the window (0 while it is away).
      bottom: function () { return mast.classList.contains('is-hidden') ? 0 : Math.max(0, mast.getBoundingClientRect().bottom); },
      height: function () { return mast.offsetHeight; }
    };
  })();
  // The section links in the header (also in the phone menu). Keyboard users keep the header in view:
  // their focus is still in it.
  $all('.site-nav a[href^="#"]:not([href="#top"])').forEach(function (a) {
    on(a, 'click', function (ev) {
      if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || keyboardUser) return;
      Masthead.away();
    });
  });

  // ---------------------------------------------------------------- where the reader is
  // The reading position is the first line below the header: its section, the heading, paragraph or list
  // item there (counted within the section: the three language versions are built alike, so the same
  // count finds the same item in another language) and how far into that item.
  // A page of its own lists its parts on its <main> (data-sections); the home page has its six sections.
  var SECTION_IDS = (function () {
    var main = $('main[data-sections]');
    return main ? main.getAttribute('data-sections').split(' ') : ['top', 'work', 'expertise', 'experience', 'explore', 'contact'];
  })();
  var BLOCKS = 'h1, h2, h3, h4, p, li, fieldset, figure';
  function readingPosition() {
    var root = doc.documentElement;
    if (window.pageYOffset < 2) return { at: 'start' };
    if (window.pageYOffset + window.innerHeight >= root.scrollHeight - 2) return { at: 'end' };
    var line = Masthead.bottom() + 8;
    var first = null;
    for (var s = 0; s < SECTION_IDS.length; s++) {
      var section = doc.getElementById(SECTION_IDS[s]);
      if (!section || section.getBoundingClientRect().bottom <= line) continue;
      var blocks = $all(BLOCKS, section);
      var pos = { section: SECTION_IDS[s], block: -1, frac: 0, gap: 0 };
      for (var i = 0; i < blocks.length; i++) {
        var r = blocks[i].getBoundingClientRect();
        if (r.height < 2 || r.bottom <= line) continue;
        if (r.top <= line) { pos.block = i; pos.frac = (line - r.top) / r.height; continue; }   // a smaller one inside may follow
        if (pos.block < 0) { pos.block = i; pos.gap = r.top - line; }
        break;
      }
      if (pos.block >= 0) return pos;
      first = first || pos;              // only the space after this section's last item: look in the next one
    }
    return first || { at: 'start' };
  }
  // Where to scroll so that the same place is at the first line below the header (shown).
  function scrollTarget(pos) {
    var root = doc.documentElement;
    if (pos.at === 'start') return 0;
    if (pos.at === 'end') return Math.max(0, root.scrollHeight - window.innerHeight);
    var section = doc.getElementById(pos.section);
    if (!section) return null;
    var el = pos.block >= 0 ? $all(BLOCKS, section)[pos.block] : null;
    var r = el && el.getBoundingClientRect();
    var frac = pos.frac || 0;
    var gap = pos.gap || 0;
    if (!r || r.height < 2) { r = section.getBoundingClientRect(); frac = 0; gap = 0; }   // not here: its section
    var y = r.top + window.pageYOffset + (frac ? frac * r.height : -gap) - (Masthead.height() + 8);
    return Math.max(0, Math.round(y));
  }

  // ---------------------------------------------------------------- logo animation in the specimen dish
  // The logo builds itself with its true transparency, in one of three ways, tried in this order:
  //  'video'   Chrome, Edge, Firefox, Android: a video with transparency (VP9 WebM).
  //  'canvas'  iPhone, iPad, Mac (Safari can't show video transparency): an ordinary video holding the
  //            colours on top and the transparency below; the page combines the two halves in a canvas.
  //  'image'   fallback if neither works: the animation on black, blended into the dark dish.
  // Reduced motion and data saver get the still logo; the button can still start the animation.
  (function () {
    var dish = $('.dish');
    if (!dish) return;
    var view = $('.dish-view', dish);
    var still = $('.dish-still', dish);
    var anim = $('.dish-anim:not(.dish-anim-still)', dish);
    var animStill = $('.dish-anim-still', dish);
    var video = $('.dish-video', dish);
    var canvas = $('.dish-canvas', dish);
    var button = $('.dish-pause', dish);
    // The finished logo holds from HOLD_START to HOLD_END seconds into the loop (tools/make_logo_transparent.py).
    var HOLD_START = parseFloat(view.getAttribute('data-hold-start')) || 0;
    var HOLD_END = parseFloat(view.getAttribute('data-hold-end')) || 0;
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var userChoice = null;          // null until the visitor presses the button
    var mode = pickMode();
    var player = null;              // the <video> that plays: the transparent one, or the canvas's source
    var ready = false;              // the chosen animation has loaded
    var loading = false;
    var fallbackTimer = null;
    var stillShown = false;         // the still logo is showing while the animation downloads
    var onScreen = true;
    var gl = null;
    var drawing = false;            // the canvas is being redrawn while the video plays
    var frameCallbacks = true;      // the browser announces each new video frame (until it stays silent)
    var lastAnnounced = 0;          // when the browser last announced a new video frame
    var emptyChecked = false;       // the canvas has been checked once for an empty picture
    var stillReady = false;         // the finished logo's picture is loaded and decoded: pausing shows it at once

    function transparentVideoWorks() {
      if (!video || !video.canPlayType) return false;
      var ua = navigator.userAgent;
      var apple = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (apple || !/Chrome\/|Chromium\/|Firefox\//.test(ua)) return false;
      return video.canPlayType('video/webm; codecs="vp9"') !== '';
    }
    function twoLayerVideoWorks() {
      if (!canvas || !window.WebGLRenderingContext) return false;
      var v = doc.createElement('video');
      return !!(v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.4D401F"'));
    }
    function pickMode() { return transparentVideoWorks() ? 'video' : twoLayerVideoWorks() ? 'canvas' : 'image'; }
    function wantsMotion() { return userChoice === null ? !(reduceMotion.matches || saveData) : userChoice === 'play'; }
    function layer() { return mode === 'canvas' ? canvas : mode === 'video' ? video : anim; }
    function showOnly(el) { [still, anim, animStill, video, canvas].forEach(function (x) { if (x) x.hidden = x !== el; }); }
    function picture(el) { if (!el.getAttribute('src')) el.src = el.getAttribute('data-src'); showOnly(el); }
    function loaded(el) { return el.complete && el.naturalWidth > 0; }
    // The picture a pause shows: the blended fallback pauses on its own finished logo, so its look doesn't change.
    function pausePicture() { return mode === 'image' ? animStill : still; }
    // Once the animation runs, fetch and decode that picture, so the first pause shows it without a wait.
    function prepareStill() {
      var el = pausePicture();
      if (!el.getAttribute('src')) el.src = el.getAttribute('data-src');
      var done = function () { if (el === pausePicture() && loaded(el)) stillReady = true; };
      if (el.decode) el.decode().then(done, function () { /* not ready: a pause waits for it */ });
      else on(el, 'load', done);
    }
    function showStill() {
      if (player && !player.paused) player.pause();
      var el = mode === 'image' && userChoice === 'pause' ? animStill : still;
      // Pausing the fallback before its picture has arrived: keep the animation until the picture can be shown.
      if (el === animStill && !anim.hidden && !loaded(el)) {
        if (!el.getAttribute('src')) el.src = el.getAttribute('data-src');
        var swap = function () { if (!wantsMotion()) showOnly(el); };
        if (el.decode) el.decode().then(swap, swap); else on(el, 'load', swap);
        return;
      }
      picture(el);
    }
    function startImage() {
      showOnly(anim);
      anim.removeAttribute('src');       // restart from the first frame
      anim.src = anim.getAttribute('data-src');
    }
    function playVideo() {
      // Before the first frame is ready, keep showing what is there; after a pause, wait until the video
      // has reached the finished logo it is to carry on from.
      if (ready) {
        if (player.seeking) on(player, 'seeked', function () { if (wantsMotion() && ready) showOnly(layer()); }, { once: true });
        else showOnly(layer());
      }
      var p = player.play();
      // Autoplay switched off (for example in low-power mode): use the blended fallback, which still moves.
      if (p && p.catch) p.catch(function (err) { if (err && err.name === 'NotAllowedError') useImageInstead(); });
    }
    function canJumpTo(t) {
      var s = player.seekable;
      for (var i = 0; s && i < s.length; i++) if (s.start(i) <= t && t <= s.end(i)) return true;
      return false;
    }
    function pauseOnFinishedLogo() {
      player.pause();
      var t = player.currentTime;
      if (t > HOLD_START + 0.1 && t < HOLD_END - 0.1) return;        // already showing the finished logo
      if (HOLD_END > HOLD_START && canJumpTo(HOLD_START + 0.4)) {
        try {
          player.currentTime = HOLD_START + 0.4;
          // Moving the video there can take a moment: meanwhile the finished logo's picture, when ready.
          if (stillReady) showOnly(still);
          return;
        } catch (e) { /* fall through */ }
      }
      // This video can't jump to a point in time: show the finished logo as a picture; Play starts again.
      try { player.currentTime = 0; } catch (e) { /* ignore */ }
      showStill();
    }
    function stopPlayer() {
      if (!player) return;
      try { player.onerror = null; player.pause(); player.removeAttribute('src'); player.load(); } catch (e) { /* ignore */ }
      if (player !== video && player.parentNode) player.parentNode.removeChild(player);
      player = null;
    }
    function switchTo(next) {
      stopPlayer();
      video.hidden = true;
      canvas.hidden = true;
      mode = next;
      ready = false;
      loading = false;
      drawing = false;
      stillReady = false;
      render();
    }
    function useImageInstead() { if (mode !== 'image') switchTo('image'); }
    // If a browser draws the transparent video without its transparency, use the two-layer video instead.
    function checkTransparency() {
      setTimeout(function () {
        if (mode !== 'video' || video.hidden || video.readyState < 2) return;
        try {
          var c = doc.createElement('canvas');
          c.width = 16;
          c.height = 16;
          var ctx = c.getContext('2d');
          ctx.drawImage(video, 0, 0, 16, 16);
          if (ctx.getImageData(0, 0, 1, 1).data[3] > 200) switchTo(twoLayerVideoWorks() ? 'canvas' : 'image');
        } catch (e) { /* cannot check: keep the video */ }
      }, 1200);
    }

    // ---- the canvas: combines the colours (top half) and the transparency (bottom half) with WebGL
    var VERT = 'attribute vec2 p; varying vec2 uv;' +
      'void main() { uv = vec2((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5); gl_Position = vec4(p, 0.0, 1.0); }';
    var FRAG = 'precision mediump float; varying vec2 uv; uniform sampler2D t;' +
      'void main() {' +
      ' vec3 c = texture2D(t, vec2(uv.x, uv.y * 0.5)).rgb;' +
      ' float a = clamp((texture2D(t, vec2(uv.x, 0.5 + uv.y * 0.5)).g - 0.01) / 0.97, 0.0, 1.0);' +
      ' gl_FragColor = vec4(min(c, vec3(a)), a);' +
      '}';
    function startCanvas() {
      var opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };
      try { gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts); } catch (e) { gl = null; }
      if (!gl) return false;
      function shader(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader');
        return s;
      }
      try {
        var prog = gl.createProgram();
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('program');
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(prog, 't'), 0);
      } catch (e) { gl = null; return false; }
      on(canvas, 'webglcontextlost', function (ev) { ev.preventDefault(); gl = null; useImageInstead(); });
      return true;
    }
    function now() { return window.performance && performance.now ? performance.now() : +new Date(); }
    function drawFrame() {
      if (!gl || !player || player.readyState < 2) return;
      try {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, player);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // Some browsers give WebGL empty video frames. Once the logo is well on its way (from 1.5 seconds until
        // the end of the hold), check once that a line across its middle isn't empty; if it is, use the fallback.
        var t = player.currentTime;
        if (!emptyChecked && t > 1.5 && t < HOLD_END - 0.2) {
          emptyChecked = true;
          var row = new Uint8Array(canvas.width * 4);
          gl.readPixels(0, Math.round(canvas.width / 2), canvas.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
          var seen = false;
          for (var i = 3; i < row.length && !seen; i += 4) seen = row[i] > 0;
          if (!seen) useImageInstead();
        }
      } catch (e) { useImageInstead(); }
    }
    // Redraw the canvas for each new frame of the video, as the browser announces them
    // (requestVideoFrameCallback); without those announcements, on screen refreshes when the video has moved on.
    function drawOnRefresh(el) {
      drawing = true;
      var last = -1;
      var at = -1e9;
      function step(time) {
        if (el !== player) return;
        if (el.currentTime !== last && time - at > 30) { last = el.currentTime; at = time; drawFrame(); }
        if (el.paused) { drawing = false; return; }
        window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }
    function drawWhilePlaying() {
      var el = player;
      if (!el) return;
      if (!drawing) {
        if (!el.requestVideoFrameCallback || !frameCallbacks) return drawOnRefresh(el);
        drawing = true;
        var tick = function () {
          if (el !== player || !frameCallbacks) return;
          lastAnnounced = now();
          drawFrame();
          if (el.paused) { drawing = false; return; }
          el.requestVideoFrameCallback(tick);
        };
        el.requestVideoFrameCallback(tick);
      }
      // If the video moves on but no frame is announced, stop waiting for announcements and use screen refreshes.
      if (!frameCallbacks) return;
      var since = now();
      var from = el.currentTime;
      setTimeout(function check() {
        if (el !== player || !frameCallbacks || el.paused || lastAnnounced >= since) return;
        if (el.currentTime > from + 0.5) { frameCallbacks = false; drawOnRefresh(el); }
        else setTimeout(check, 1000);   // still starting: look again
      }, 1500);
    }

    // Load the whole (small) video first and play it from memory: then the pause button can stop on the
    // finished logo even on servers that can't send part of a file. If that fails, play it from its address.
    function setSource(el, src) {
      function go() { if (wantsMotion() && onScreen && !doc.hidden) playVideo(); else el.load(); }
      function direct() { el.onerror = useImageInstead; el.src = src; go(); }
      if (!window.fetch || !window.URL || !URL.createObjectURL) { direct(); return; }
      fetch(src).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(function (b) {
          if (el !== player) return;
          el.onerror = function () { el.onerror = null; direct(); };
          el.src = URL.createObjectURL(b);
          go();
        }, function () { if (el === player) direct(); });
    }
    function load() {
      if (loading) return;
      loading = true;
      if (!fallbackTimer) fallbackTimer = setTimeout(function () {
        if (!ready && wantsMotion()) { picture(still); stillShown = true; }
      }, 2500);
      if (mode === 'image') {
        var loader = new Image();
        loader.onload = function () { ready = true; clearTimeout(fallbackTimer); if (wantsMotion()) startImage(); setTimeout(prepareStill, 400); };
        loader.onerror = function () { clearTimeout(fallbackTimer); showStill(); };
        loader.src = anim.getAttribute('data-src');
        return;
      }
      if (mode === 'canvas') {
        if (!startCanvas()) { switchTo('image'); return; }
        player = doc.createElement('video');
        player.className = 'dish-feed';
        player.muted = true;
        player.loop = true;
        player.playsInline = true;
        player.setAttribute('muted', '');
        player.setAttribute('loop', '');
        player.setAttribute('playsinline', '');
        player.setAttribute('aria-hidden', 'true');
        player.setAttribute('tabindex', '-1');
        view.insertBefore(player, view.firstChild);   // behind the dish artwork: never seen, but kept "visible"
        on(player, 'play', drawWhilePlaying);
        on(player, 'seeked', drawFrame);
      } else {
        player = video;
      }
      var el = player;
      var arrived = false;
      function started() {
        if (arrived || el !== player) return;
        arrived = true;
        clearTimeout(fallbackTimer);
        // If the still logo has been showing while the animation downloaded (a slow connection), carry on
        // from the finished logo in the animation: it holds, fades and builds again, so nothing jumps.
        if (stillShown && HOLD_END > HOLD_START && canJumpTo(HOLD_START + 0.05)) {
          stillShown = false;
          try {
            el.currentTime = HOLD_START + 0.05;
            el.addEventListener('seeked', reveal, { once: true });
            setTimeout(reveal, 1500);
            return;
          } catch (e) { /* show it from where it is */ }
        }
        reveal();
      }
      function reveal() {
        if (ready || el !== player) return;
        ready = true;
        setTimeout(prepareStill, 400);
        if (mode === 'canvas') drawFrame();
        if (wantsMotion() && onScreen && !doc.hidden) {
          showOnly(layer());
          if (mode === 'video') checkTransparency();
        }
      }
      on(el, 'loadeddata', started);
      on(el, 'playing', started);
      setSource(el, layer().getAttribute('data-src'));
    }
    function render() {
      var motion = wantsMotion();
      button.setAttribute('data-state', motion ? 'playing' : 'paused');
      button.setAttribute('aria-label', motion ? T.pause : T.play);
      if (!motion) {
        // A visitor's pause stops the animation on the finished logo, so Play carries on smoothly from there.
        if (mode !== 'image' && ready && player && userChoice === 'pause' && !layer().hidden) pauseOnFinishedLogo();
        else showStill();
        return;
      }
      if (!ready) { load(); return; }
      if (mode === 'image') { if (anim.hidden) startImage(); }
      else if (onScreen && !doc.hidden) playVideo();
    }
    // Pause the video while the dish is off-screen or the tab is hidden, and carry on afterwards.
    function syncVisibility() {
      if (mode === 'image' || !ready || !player) return;
      if (!onScreen || doc.hidden) { if (!player.paused) player.pause(); }
      else if (wantsMotion() && player.paused) playVideo();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; syncVisibility(); }).observe(dish);
    }
    on(doc, 'visibilitychange', syncVisibility);
    on(button, 'click', function () { userChoice = wantsMotion() ? 'pause' : 'play'; render(); });
    onMediaChange(reduceMotion, function () { if (userChoice === null) render(); });
    render();

    // Gentle response to the pointer: the membranes drift a little. Off for reduced motion.
    var hero = $('.hero');
    var frame = null;
    var target = { x: 0, y: 0 };
    function apply() { frame = null; dish.style.setProperty('--px', target.x.toFixed(3)); dish.style.setProperty('--py', target.y.toFixed(3)); }
    function move(ev) {
      if (reduceMotion.matches || !onScreen || doc.hidden) return;
      var r = dish.getBoundingClientRect();
      var x = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var y = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
      target.x = Math.max(-1, Math.min(1, x));
      target.y = Math.max(-1, Math.min(1, y));
      if (!frame) frame = window.requestAnimationFrame(apply);
    }
    function rest() { target.x = 0; target.y = 0; if (!frame) frame = window.requestAnimationFrame(apply); }
    on(hero, 'pointermove', function (ev) { if (ev.pointerType !== 'touch') move(ev); }, { passive: true });
    on(hero, 'pointerleave', rest);
    on(dish, 'pointerdown', function (ev) { if (ev.pointerType === 'touch') move(ev); }, { passive: true });
    on(dish, 'pointermove', function (ev) { if (ev.pointerType === 'touch') move(ev); }, { passive: true });
    on(dish, 'pointerup', function (ev) { if (ev.pointerType === 'touch') rest(); });
    on(dish, 'pointercancel', rest);
  })();

  // ---------------------------------------------------------------- equipment categories under the reports
  // The list starts closed through the style sheet (.js .categories), so the page doesn't move when this
  // script arrives; the button opens and closes it.
  $all('[data-toggle-list]').forEach(function (button) {
    var list = doc.getElementById(button.getAttribute('aria-controls'));
    if (!list) return;
    on(button, 'click', function () {
      var open = !list.classList.contains('is-open');
      list.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.textContent = open ? T.hideList : T.showList;
    });
  });

  // ---------------------------------------------------------------- copy the email address
  (function () {
    var button = $('[data-copy]');
    var address = $('[data-email]');
    var status = $('[data-copy-status]');
    if (!button || !address || !status) return;
    function say(text, failed) {
      status.textContent = '';
      status.setAttribute('data-result', failed ? 'failed' : 'copied');
      setTimeout(function () { status.textContent = text; }, 30);
    }
    function selectAddress() {
      try {
        var range = doc.createRange();
        range.selectNodeContents(address);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) { /* ignore */ }
    }
    on(button, 'click', function () {
      var failed = function () { selectAddress(); say(T.copyFailed, true); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(DATA.email).then(function () { say(T.copied, false); }, failed);
      } else {
        failed();
      }
    });
  })();

  // ---------------------------------------------------------------- the year in the footer
  (function () {
    var el = $('[data-year]');
    if (!el) return;
    var now = new Date();
    var year = String(now.getFullYear());
    if (LANG === 'fa') {
      try {
        var parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric' }).formatToParts(now);
        parts.forEach(function (p) { if (p.type === 'year') year = p.value.replace(/[^0-9]/g, ''); });
      } catch (e) { return; }
    }
    if (/^[0-9]{4}$/.test(year)) el.textContent = digits(year);
  })();

  // ---------------------------------------------------------------- sound effects (Explore & learn only)
  var Sound = (function () {
    var button = $('[data-sound]');
    var stateEl = button ? $('.sound-state', button) : null;
    var enabled = store.get('sound') === 'on';
    var ctx = null;
    function render() {
      if (!button) return;
      button.setAttribute('aria-checked', enabled ? 'true' : 'false');
      stateEl.textContent = ': ' + (enabled ? T.soundOn : T.soundOff);
    }
    on(button, 'click', function () { enabled = !enabled; store.set('sound', enabled ? 'on' : 'off'); render(); if (enabled) play('right'); });
    render();
    // Tones made in the browser: original, nothing to download, and only after a visitor's action.
    function play(kind) {
      if (!enabled) return;
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        if (!ctx) ctx = new Ctx();
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        var t0 = ctx.currentTime + 0.02;
        var out = ctx.createGain();
        out.gain.value = 0.9;
        out.connect(ctx.destination);
        var note = function (freq, at, dur, type, peak, glideTo) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = type;
          o.frequency.setValueAtTime(freq, t0 + at);
          if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + at + dur);
          g.gain.setValueAtTime(0.0001, t0 + at);
          g.gain.exponentialRampToValueAtTime(peak, t0 + at + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
          o.connect(g);
          g.connect(out);
          o.start(t0 + at);
          o.stop(t0 + at + dur + 0.05);
        };
        if (kind === 'right') { note(659.25, 0, 0.16, 'sine', 0.16); note(987.77, 0.09, 0.26, 'sine', 0.13); }
        else if (kind === 'again') { note(311.13, 0, 0.28, 'triangle', 0.13, 261.63); }
        else { note(523.25, 0, 0.32, 'sine', 0.12); note(659.25, 0.09, 0.32, 'sine', 0.11); note(783.99, 0.18, 0.34, 'sine', 0.10); note(1046.5, 0.27, 0.6, 'sine', 0.09); }
      } catch (e) { /* no sound: the result is always shown on screen */ }
    }
    return { play: play };
  })();

  // Short messages for screen readers, put in a hidden area that is always on the page (a "live
  // region"): screen readers say what appears there. Text appearing in a box that was hidden until
  // then is not reliably read out, so the activities use this instead.
  var announcer = $('[data-announce]');
  function announce(text) {
    if (!announcer || !text) return;
    announcer.textContent = '';
    setTimeout(function () { announcer.textContent = text; }, 150);
  }
  // The text of a box as it should be read out: without its "Source" link or buttons, and with headings and
  // paragraphs kept apart (so a title and the text under it aren't read as one long word).
  function spokenText(box) {
    var copy = box.cloneNode(true);
    $all('.source-link, button', copy).forEach(function (a) { a.parentNode.removeChild(a); });
    $all('h1, h2, h3, h4, h5, h6', copy).forEach(function (h) {
      h.appendChild(doc.createTextNode(/[.:!?\u061F]\s*$/.test(h.textContent) ? ' ' : '. '));
    });
    $all('p, li', copy).forEach(function (el) { el.appendChild(doc.createTextNode(' ')); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  // A burst of cells for a right answer: about 0.6 seconds, in time with the sound. Small cells in the
  // site's five colours spring from the answer's tick (or its middle) and fade, like the cells in the
  // specimen dish. Nothing moves with reduced motion, and the "Correct." text always shows.
  var reduceMotion = media('(prefers-reduced-motion: reduce)');
  function burst(el) {
    if (!el || reduceMotion.matches || !el.animate) return;
    var mark = $('.mark-right', el);
    var r = (mark && mark.getBoundingClientRect().width ? mark : el).getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    var layer = doc.createElement('div');
    layer.className = 'burst';
    layer.setAttribute('aria-hidden', 'true');
    var tones = ['teal', 'coral', 'magenta', 'gold', 'violet'];
    var n = 14;
    for (var k = 0; k < n; k++) {
      var cell = doc.createElement('span');
      var size = 7 + (k * 7) % 6;                        // 7 to 12 px, the same pattern every time
      var angle = (k / n) * Math.PI * 2 + (k % 2 ? 0.18 : -0.12);
      var dist = 30 + (k * 13) % 26;                     // 30 to 55 px
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      cell.className = 'burst-cell tone-' + tones[k % 5];
      cell.style.width = cell.style.height = size + 'px';
      cell.style.left = (x - size / 2) + 'px';
      cell.style.top = (y - size / 2) + 'px';
      layer.appendChild(cell);
      cell.animate([
        { transform: 'translate(0, 0) scale(0.3)', opacity: 1 },
        { transform: 'translate(' + (dx * 0.72) + 'px, ' + (dy * 0.72) + 'px) scale(1)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(0.7)', opacity: 0 }
      ], { duration: 600, delay: (k % 3) * 20, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'both' });
    }
    doc.body.appendChild(layer);
    setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 760);
  }

  // A verdict ("Correct." / "Not quite.") shown before an explanation that is already on the page.
  function showFeedback(box, right) {
    box.setAttribute('data-result', right ? 'right' : 'wrong');
    var verdict = $('.verdict', box);
    if (verdict) verdict.textContent = right ? T.correct : T.notQuite;
    box.classList.add('is-shown');
    announce(spokenText(box));
  }

  // ---------------------------------------------------------------- activities
  var activities = {};

  // Build a tissue, then a blood vessel
  (function () {
    var panel = $('#act-build');
    if (!panel) return;
    var box = $('.build', panel);
    var buttons = $all('[data-ingredient]', $('.ingredients', box));
    var steps = $all('.build-step', box);
    var log = $('.build-log', box);
    var result = $('[data-build-result]', box);
    var progress = $('[data-build-progress]', box);
    var reset = $('[data-build-reset]', box);
    var added = [];
    function slots() {
      var s = {};
      added.forEach(function (id) { buttons.forEach(function (b) { if (b.getAttribute('data-ingredient') === id) s[b.getAttribute('data-slot')] = id; }); });
      return s;
    }
    function render() {
      var s = slots();
      var count = Object.keys(s).length;
      box.setAttribute('data-cells', s.cells ? '1' : '0');
      box.setAttribute('data-signals', s.signals ? '1' : '0');
      box.setAttribute('data-scaffold', s.scaffold || '');
      box.classList.toggle('is-complete', count === 3);
      buttons.forEach(function (b) {
        var id = b.getAttribute('data-ingredient');
        var used = !!s[b.getAttribute('data-slot')];
        b.setAttribute('aria-disabled', used ? 'true' : 'false');
        if (s[b.getAttribute('data-slot')] === id) b.setAttribute('data-state', 'added'); else b.removeAttribute('data-state');
      });
      steps.forEach(function (li) { li.classList.toggle('is-added', added.indexOf(li.getAttribute('data-ingredient')) !== -1); });
      added.forEach(function (id) { steps.forEach(function (li) { if (li.getAttribute('data-ingredient') === id) log.appendChild(li); }); });
      progress.textContent = fill(T.buildProgress, { n: count, total: 3 });
      result.classList.toggle('is-shown', count === 3);
      reset.hidden = count === 0;
    }
    buttons.forEach(function (b) {
      on(b, 'click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        var id = b.getAttribute('data-ingredient');
        added.push(id);
        render();
        var done = Object.keys(slots()).length === 3;
        Sound.play(done ? 'done' : 'right');
        // The count is read out by its own live region; also say the explanation that appeared.
        var step = steps.filter(function (li) { return li.getAttribute('data-ingredient') === id; })[0];
        announce((step ? spokenText(step) : '') + (done ? ' ' + spokenText(result) : ''));
      });
    });
    on(reset, 'click', function () { added = []; render(); buttons[0].focus(); });

    // The second round, below the first: a blood vessel in four steps. Cells and the scaffold can come in either
    // order; the bioreactor needs both, and removing the cells needs the bioreactor ("needs" on each button).
    // A step chosen too early says what has to come first.
    var vessel = $('[data-vessel]', panel);
    var vgrid = vessel && $('.vessel-grid', vessel);
    var vbuttons = vessel ? $all('[data-vstep]', $('.ingredients', vessel)) : [];
    var vsteps = vessel ? $all('.vessel-step', vessel) : [];
    var vlog = vessel && $('.vessel-log', vessel);
    var vresult = vessel && $('[data-vessel-result]', vessel);
    var vprogress = vessel && $('[data-vessel-progress]', vessel);
    var vwait = vessel && $('[data-vessel-wait]', vessel);
    var vreset = vessel && $('[data-vessel-reset]', vessel);
    var vtitle = vessel && $('#vessel-title', vessel);
    var vstart = $('[data-vessel-start]', panel);
    var open = false;
    var done = [];
    function needs(b) { return (b.getAttribute('data-needs') || '').split(' ').filter(Boolean); }
    function renderVessel() {
      if (!vessel) return;
      vessel.classList.toggle('is-open', open);
      vbuttons.forEach(function (b) {
        var id = b.getAttribute('data-vstep');
        var has = done.indexOf(id) !== -1;
        vgrid.setAttribute('data-v-' + id, has ? '1' : '0');
        b.setAttribute('aria-disabled', has ? 'true' : 'false');
        if (has) b.setAttribute('data-state', 'added'); else b.removeAttribute('data-state');
      });
      vgrid.classList.toggle('is-complete', done.length === vbuttons.length);
      vsteps.forEach(function (li) { li.classList.toggle('is-added', done.indexOf(li.getAttribute('data-vstep')) !== -1); });
      done.forEach(function (id) { vsteps.forEach(function (li) { if (li.getAttribute('data-vstep') === id) vlog.appendChild(li); }); });
      vprogress.textContent = fill(T.vesselProgress, { n: done.length, total: vbuttons.length });
      vresult.classList.toggle('is-shown', done.length === vbuttons.length);
      vreset.hidden = done.length === 0;
    }
    vbuttons.forEach(function (b) {
      on(b, 'click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        var id = b.getAttribute('data-vstep');
        var missing = needs(b).filter(function (n) { return done.indexOf(n) === -1; });
        if (missing.length) {
          vwait.textContent = T.vesselWait[id] || '';
          vwait.hidden = false;
          Sound.play('again');
          announce(vwait.textContent);
          return;
        }
        vwait.hidden = true;
        done.push(id);
        renderVessel();
        var complete = done.length === vbuttons.length;
        Sound.play(complete ? 'done' : 'right');
        var step = vsteps.filter(function (li) { return li.getAttribute('data-vstep') === id; })[0];
        announce((step ? spokenText(step) : '') + (complete ? ' ' + spokenText(vresult) : ''));
      });
    });
    // Opening the second round: it appears below, and the page goes to its heading, which takes the keyboard.
    on(vstart, 'click', function () {
      if (!vessel) return;
      open = true;
      renderVessel();
      try { vtitle.focus({ preventScroll: true }); } catch (e) { vtitle.focus(); }
      var margin = parseFloat(window.getComputedStyle(vessel).scrollMarginTop) || 0;
      var y = Math.max(0, Math.round(vessel.getBoundingClientRect().top + window.pageYOffset - margin - 16));
      if (reduceMotion.matches) jumpTo(y);
      else try { window.scrollTo({ top: y, left: 0, behavior: 'smooth' }); } catch (e) { jumpTo(y); }
    });
    on(vreset, 'click', function () { done = []; vwait.hidden = true; renderVessel(); vbuttons[0].focus(); });
    render();
    renderVessel();
    activities.build = {
      state: function () { return { added: added.slice(), vessel: open, vsteps: done.slice() }; },
      restore: function (st) {
        if (!st) return;
        if (st.added) { added = st.added.filter(function (id) { return buttons.some(function (b) { return b.getAttribute('data-ingredient') === id; }); }); render(); }
        if (vessel && st.vessel) {
          open = true;
          done = [];
          (st.vsteps || []).forEach(function (id) {
            var b = vbuttons.filter(function (x) { return x.getAttribute('data-vstep') === id; })[0];
            if (b && done.indexOf(id) === -1 && needs(b).every(function (n) { return done.indexOf(n) !== -1; })) done.push(id);
          });
          renderVessel();
        }
      }
    };
  })();

  // How a wound heals
  (function () {
    var panel = $('#act-wound');
    if (!panel) return;
    var box = $('.wound', panel);
    var slider = $('#wound-slider', panel);
    var panels = $all('.stage-panel', panel);
    var ticks = $all('.ticks li', panel);
    function render() {
      var stage = parseInt(slider.value, 10) || 1;
      box.setAttribute('data-stage', String(stage));
      slider.setAttribute('aria-valuetext', DATA.wound[stage - 1]);
      panels.forEach(function (p, k) { p.classList.toggle('is-current', k === stage - 1); });
      ticks.forEach(function (t, k) { t.classList.toggle('is-current', k === stage - 1); });
    }
    on(slider, 'input', render);
    on(slider, 'change', render);
    render();
    activities.wound = {
      state: function () { return { step: parseInt(slider.value, 10) || 1 }; },
      restore: function (st) { if (st && st.step) { slider.value = String(st.step); render(); } }
    };
  })();

  // The life of a medical device, then Repair or replace?
  (function () {
    var panel = $('#act-lifecycle');
    if (!panel) return;
    var box = $('.lifecycle', panel);
    var panels = $all('.stage-panel', box);
    var prev = $('[data-lc-prev]', panel);
    var next = $('[data-lc-next]', panel);
    var progress = $('[data-lc-progress]', panel);
    var live = $('[data-lc-live]', panel);
    var total = panels.length;
    var step = 1;
    function render(announce) {
      box.setAttribute('data-step', String(step));
      panels.forEach(function (p, k) { p.classList.toggle('is-current', k === step - 1); });
      progress.textContent = fill(T.stageProgress, { n: step, total: total });
      prev.setAttribute('aria-disabled', step === 1 ? 'true' : 'false');
      next.setAttribute('aria-disabled', step === total ? 'true' : 'false');
      if (announce) live.textContent = progress.textContent + ': ' + DATA.lifecycle[step - 1];
    }
    on(prev, 'click', function () { if (step > 1) { step -= 1; render(true); } });
    on(next, 'click', function () { if (step < total) { step += 1; render(true); } });
    render(false);
    activities.lifecycle = {
      state: function () { return { step: step }; },
      restore: function (st) { if (st && st.step >= 1 && st.step <= total) { step = st.step; render(false); } }
    };
  })();

  // Repair or replace? and Myth or fact: each case has its own buttons and explanation.
  $all('.subactivity .case').forEach(function (item) {
    var answer = item.getAttribute('data-answer');
    var choices = $all('.choice', item);
    var feedback = $('.feedback', item);
    choices.forEach(function (c) {
      on(c, 'click', function () {
        var right = c.getAttribute('data-choice') === answer;
        choices.forEach(function (o) {
          var isAnswer = o.getAttribute('data-choice') === answer;
          if (o === c) o.setAttribute('data-state', right ? 'right' : 'wrong');
          else if (isAnswer && !right) o.setAttribute('data-state', 'answer');
          else o.removeAttribute('data-state');
        });
        showFeedback(feedback, right);
        Sound.play(right ? 'right' : 'again');
        if (right) burst(c);
      });
    });
  });

  // Sort the equipment: one device at a time, into the classes of each round. In the first round, the FDA's three
  // classes: the answer shows with its reason and a link to the device's entry in the FDA's database. Once all
  // eight are sorted, a button opens the second round below: eight more devices in Iran's four classes, A to D,
  // each shown with its group in the guide.
  (function () {
    var panel = $('#act-sort');
    if (!panel || !DATA.sort) return;
    function sorter(root, data) {
      var card = $('[data-sort-card]', root);
      var itemEl = $('[data-sort-item]', root);
      var groupEl = $('[data-sort-group]', root);
      var nameEl = $('[data-sort-name]', root) || itemEl;
      var choicesEl = $('[data-sort-choices]', root);
      var choices = $all('.choice', choicesEl);
      var feedback = $('[data-sort-feedback]', root);
      var verdict = $('[data-sort-verdict]', root);
      var reason = $('[data-sort-reason]', root);
      var source = $('[data-sort-source]', root);
      var nextBtn = $('[data-sort-next]', root);
      var done = $('[data-sort-done]', root);
      var again = $('[data-sort-again]', root);
      var dots = $all('.sort-dots span', root);
      var items = data.items;
      var cats = data.categories;
      var index = 0;
      function show(focusItem) {
        card.hidden = index >= items.length;
        done.hidden = index < items.length;
        dots.forEach(function (d, k) { d.className = k < index ? 'is-done' : (k === index ? 'is-current' : ''); });
        if (index >= items.length) { if (focusItem) $('.sort-done-text', done).focus(); return; }
        if (groupEl) groupEl.textContent = items[index].group || '';
        nameEl.textContent = items[index].name;
        choices.forEach(function (o) { o.removeAttribute('data-state'); o.setAttribute('aria-disabled', 'false'); });
        feedback.hidden = true;
        feedback.classList.remove('is-shown');
        nextBtn.hidden = true;
        if (focusItem) itemEl.focus();
      }
      on(choicesEl, 'click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('.choice') : null;
        if (!b || b.getAttribute('aria-disabled') === 'true' || index >= items.length) return;
        var item = items[index];
        var right = parseInt(b.getAttribute('data-choice'), 10) === item.answer;
        choices.forEach(function (o) {
          var isAnswer = parseInt(o.getAttribute('data-choice'), 10) === item.answer;
          if (o === b) o.setAttribute('data-state', right ? 'right' : 'wrong');
          else if (isAnswer && !right) o.setAttribute('data-state', 'answer');
          else o.removeAttribute('data-state');
          o.setAttribute('aria-disabled', 'true');
        });
        verdict.textContent = fill(right ? T.sortRight : T.sortWrong, { category: cats[item.answer - 1] });
        reason.textContent = item.reason;
        if (source && item.source) source.setAttribute('href', item.source);
        feedback.setAttribute('data-result', right ? 'right' : 'wrong');
        feedback.hidden = false;
        feedback.classList.add('is-shown');
        nextBtn.hidden = false;
        announce(spokenText(feedback));
        Sound.play(right ? 'right' : 'again');
        if (right) burst(b);
      });
      on(nextBtn, 'click', function () {
        index += 1;
        show(true);
        if (index >= items.length) Sound.play('done');
      });
      on(again, 'click', function () { index = 0; show(true); });
      show(false);
      return {
        step: function () { return index; },
        restore: function (step) { if (step >= 0 && step <= items.length) { index = step; show(false); } }
      };
    }
    var fda = sorter($('[data-sort-round="fda"]', panel), DATA.sort);
    // The second round: it appears below the first, and the page goes to its heading, which takes the keyboard.
    var iranBox = $('[data-sort-iran]', panel);
    var iran = iranBox && DATA.sortIran ? sorter($('[data-sort-round="iran"]', iranBox), DATA.sortIran) : null;
    var iranTitle = iranBox && $('#sort-iran-title', iranBox);
    var iranStart = $('[data-sort-iran-start]', panel);
    var open = false;
    function renderIran() { if (iranBox) iranBox.classList.toggle('is-open', open); }
    on(iranStart, 'click', function () {
      if (!iran) return;
      open = true;
      renderIran();
      try { iranTitle.focus({ preventScroll: true }); } catch (e) { iranTitle.focus(); }
      var margin = parseFloat(window.getComputedStyle(iranBox).scrollMarginTop) || 0;
      var y = Math.max(0, Math.round(iranBox.getBoundingClientRect().top + window.pageYOffset - margin - 16));
      if (reduceMotion.matches) jumpTo(y);
      else try { window.scrollTo({ top: y, left: 0, behavior: 'smooth' }); } catch (e) { jumpTo(y); }
    });
    renderIran();
    activities.sort = {
      state: function () { return { step: fda.step(), iran: open, istep: iran ? iran.step() : 0 }; },
      restore: function (st) {
        if (!st) return;
        fda.restore(st.step);
        if (iran && st.iran) { open = true; renderIran(); iran.restore(st.istep || 0); }
      }
    };
  })();

  // From lab to clinic: the seven stages are put in place one at a time. Each step asks which stage comes
  // next and shows that step's answers (all in the page, one group per step). Right or wrong, the right
  // stage then goes in place: its stop on the path lights up, its explanation shows, and it joins the list.
  (function () {
    var panel = $('#act-trials');
    if (!panel || !DATA.trials) return;
    var box = $('.trials', panel);
    var card = $('[data-tr-card]', panel);
    var question = $('[data-tr-question]', panel);
    var groups = $all('[data-tr-step]', panel);
    var feedback = $('[data-tr-feedback]', panel);
    var nextBtn = $('[data-tr-next]', panel);
    var done = $('[data-tr-done]', panel);
    var again = $('[data-tr-again]', panel);
    var progress = $('[data-tr-progress]', panel);
    var stages = $all('.tr-stage', panel);
    var art = $all('.tr-item', panel);
    var total = stages.length;
    var step = 0;          // the step being asked (0 to total; total = all done)
    var answered = false;  // the current step has been answered, and its stage is in place
    function placed() { return answered ? step + 1 : step; }
    function render() {
      var n = placed();
      var finished = step >= total;
      box.setAttribute('data-placed', String(n));
      art.forEach(function (el) {
        var k = parseInt(el.getAttribute('data-tr'), 10);
        el.classList.toggle('is-on', k <= n);
        el.classList.toggle('is-next', !answered && !finished && k === step + 1);
      });
      stages.forEach(function (li, k) { li.classList.toggle('is-placed', k < n); });
      groups.forEach(function (g, k) { g.hidden = k !== step; });
      progress.textContent = fill(T.trProgress, { n: n, total: total });
      card.hidden = finished;
      done.hidden = !finished;
      if (finished) return;
      question.textContent = step === 0 ? T.trFirst : T.trNext;
      nextBtn.hidden = !answered;
      if (!answered) {
        feedback.classList.remove('is-shown');
        feedback.removeAttribute('data-result');
      }
    }
    // The explanation of stage k (from 0), as the list in the page holds it, after the verdict.
    function explain(k, right) {
      var p = $('p', feedback);
      var li = stages[k];
      p.textContent = '';
      var verdict = doc.createElement('span');
      verdict.className = 'verdict';
      verdict.textContent = right === null ? '' : (right ? T.correct : T.notQuite);
      var name = doc.createElement('strong');
      name.textContent = fill(T.trPlaced, { n: k + 1, stage: DATA.trials[k] });
      p.appendChild(verdict);
      if (right !== null) p.appendChild(doc.createTextNode(' '));
      p.appendChild(name);
      p.appendChild(doc.createTextNode(' ' + $('.tr-asks', li).textContent + ' '));
      Array.prototype.forEach.call($('.tr-text', li).childNodes, function (node) { p.appendChild(node.cloneNode(true)); });
      feedback.setAttribute('data-result', right === false ? 'wrong' : 'right');
      feedback.classList.add('is-shown');
    }
    function reset(g) {
      $all('.choice', g).forEach(function (o) { o.removeAttribute('data-state'); o.setAttribute('aria-disabled', 'false'); });
    }
    groups.forEach(function (g) {
      on(g, 'click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('.choice') : null;
        if (!b || answered || b.getAttribute('aria-disabled') === 'true') return;
        var answer = String(step + 1);
        var right = b.getAttribute('data-choice') === answer;
        $all('.choice', g).forEach(function (o) {
          var isAnswer = o.getAttribute('data-choice') === answer;
          if (o === b) o.setAttribute('data-state', right ? 'right' : 'wrong');
          else if (isAnswer && !right) o.setAttribute('data-state', 'answer');
          else o.removeAttribute('data-state');
          o.setAttribute('aria-disabled', 'true');
        });
        answered = true;
        render();
        explain(step, right);
        announce(spokenText(feedback) + ' ' + progress.textContent);
        Sound.play(right ? 'right' : 'again');
        if (right) burst(b);
        // The answers are now locked: the keyboard moves on to the button that goes on.
        if (g.contains(doc.activeElement)) nextBtn.focus();
      });
    });
    on(nextBtn, 'click', function () {
      step += 1;
      answered = false;
      if (step < total) reset(groups[step]);
      render();
      if (step >= total) { Sound.play('done'); $('.tr-done-text', done).focus(); }
      else question.focus();
    });
    on(again, 'click', function () {
      step = 0;
      answered = false;
      groups.forEach(reset);
      render();
      question.focus();
    });
    render();
    activities.trials = {
      state: function () { return { step: step, answered: answered }; },
      restore: function (st) {
        if (!st || !(st.step >= 0) || st.step > total) return;
        step = st.step;
        answered = !!st.answered && step < total;
        groups.forEach(reset);
        render();
        if (answered) {
          // Show the answer as it was: the right stage marked, the answers locked, and its explanation.
          $all('.choice', groups[step]).forEach(function (o) {
            if (o.getAttribute('data-choice') === String(step + 1)) o.setAttribute('data-state', 'answer');
            o.setAttribute('aria-disabled', 'true');
          });
          explain(step, null);
        }
      }
    };
  })();

  // Quick quiz
  (function () {
    var panel = $('#act-quiz');
    if (!panel) return;
    var form = $('[data-quiz]', panel);
    var questions = $all('.question', form);
    var progress = $('[data-quiz-progress]', form);
    var reminder = $('[data-quiz-reminder]', form);
    var main = $('[data-quiz-main]', form);
    var actions = $('.quiz-actions', form);
    var result = $('[data-quiz-result]', form);
    var score = $('[data-quiz-score]', form);
    var restart = $('[data-quiz-restart]', form);
    var total = questions.length;
    var current = 0;
    var correct = 0;
    var checked = false;
    function render() {
      var finished = current >= total;
      questions.forEach(function (q, k) { q.classList.toggle('is-current', k === current); });
      progress.hidden = finished;
      actions.hidden = finished;
      result.hidden = !finished;
      if (finished) {
        score.textContent = fill(T.result, { n: correct, total: total });
        return;
      }
      progress.textContent = fill(T.questionProgress, { n: current + 1, total: total });
      main.textContent = checked ? (current === total - 1 ? T.seeResult : T.nextQuestion) : T.checkAnswer;
    }
    function resetQuestion(q) {
      $all('input', q).forEach(function (i) { i.checked = false; i.disabled = false; });
      $all('.option', q).forEach(function (o) { o.removeAttribute('data-state'); });
      var fb = $('.feedback', q);
      fb.classList.remove('is-shown');
      fb.removeAttribute('data-result');
    }
    on(form, 'submit', function (ev) {
      ev.preventDefault();
      if (current >= total) return;
      var q = questions[current];
      if (!checked) {
        var chosen = $('input:checked', q);
        if (!chosen) { reminder.hidden = false; return; }
        reminder.hidden = true;
        var focusInside = q.contains(doc.activeElement);
        var answer = q.getAttribute('data-answer');
        var right = chosen.value === answer;
        if (right) correct += 1;
        $all('.option', q).forEach(function (o) {
          var v = o.getAttribute('data-option');
          if (v === chosen.value) o.setAttribute('data-state', right ? 'right' : 'wrong');
          else if (v === answer) o.setAttribute('data-state', 'answer');
        });
        $all('input', q).forEach(function (i) { i.disabled = true; });
        showFeedback($('.feedback', q), right);
        checked = true;
        Sound.play(right ? 'right' : 'again');
        if (right) burst($('.option[data-option="' + chosen.value + '"]', q));
        render();
        // The answers are now locked. If the keyboard was on one of them, move it to the button that
        // goes on, so it isn't lost.
        if (focusInside) main.focus();
        return;
      }
      current += 1;
      checked = false;
      render();
      if (current >= total) { Sound.play('done'); score.focus(); }
      else { var first = $('input', questions[current]); if (first) first.focus(); }
    });
    on(form, 'change', function () { reminder.hidden = true; });
    on(restart, 'click', function () {
      questions.forEach(resetQuestion);
      current = 0; correct = 0; checked = false;
      render();
      var first = $('input', questions[0]);
      if (first) first.focus();
    });
    render();
    activities.quiz = {
      state: function () { return { step: checked ? current + 1 : current, score: correct }; },
      restore: function (st) {
        if (!st || !(st.step >= 0) || st.step > total) return;
        questions.forEach(resetQuestion);
        current = st.step; correct = Math.min(st.score || 0, st.step); checked = false;
        render();
      }
    };
  })();

  // ---------------------------------------------------------------- Explore & learn menu: one activity at a time
  var Explore = (function () {
    var links = $all('.act-link');
    var panels = $all('.activity');
    if (!links.length) return { current: function () { return null; }, show: function () {} };
    var current = null;
    function show(key) {
      if (!activities[key] && !doc.getElementById('act-' + key)) return;
      current = key;
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-activity') !== key; });
      links.forEach(function (a) {
        if (a.getAttribute('data-activity') === key) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    // (2.00, Ali's request) On phones (the layout with the phone menu, under 760 px) the activity menu is tall
    // and the activity opens below it, out of sight: after a tap the page glides to the activity's top (at
    // once with reduced motion), with the header away as for the section links, so it covers nothing. On
    // wider screens the menu is short and the activity is usually in view, so the page moves only when the
    // activity's heading isn't. The keyboard (Enter) keeps its place in the menu, so the page doesn't move
    // away from the focused button.
    var phoneLayout = media('(max-width: 759.98px)');
    function bringIntoView(panel) {
      var rect = panel.getBoundingClientRect();
      var view = window.innerHeight || doc.documentElement.clientHeight;
      if (!phoneLayout.matches && rect.top >= Masthead.bottom() && rect.top <= view - 120) return;
      var margin = parseFloat(window.getComputedStyle(panel).scrollMarginTop) || 0;
      var y = Math.max(0, Math.round(rect.top + window.pageYOffset - margin));
      if (Math.abs(y - window.pageYOffset) < 4) return;
      Masthead.away();
      if (reduceMotion.matches) jumpTo(y);
      else try { window.scrollTo({ top: y, left: 0, behavior: 'smooth' }); } catch (e) { jumpTo(y); }
    }
    links.forEach(function (a) {
      on(a, 'click', function (ev) {
        ev.preventDefault();
        var key = a.getAttribute('data-activity');
        show(key);
        var panel = doc.getElementById('act-' + key);
        if (ev.detail && panel && !panel.hidden) bringIntoView(panel);
      });
    });
    var fromHash = (location.hash || '').replace(/^#act-/, '');
    show(fromHash && doc.getElementById('act-' + fromHash) ? fromHash : links[0].getAttribute('data-activity'));
    // From now on the script says which activity shows (the style sheet showed the first one until now).
    var box = $('.activities');
    if (box) box.classList.add('is-ready');
    return { current: function () { return current; }, show: show };
  })();

  // A link from one activity to another (such as "Next: ..."): shows that activity, goes to the place the
  // link names (the activity's top, or a heading inside it) and puts the keyboard on that heading.
  // Without the script the link simply goes there.
  $all('[data-goto]').forEach(function (a) {
    on(a, 'click', function (ev) {
      if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      var key = a.getAttribute('data-goto');
      var panel = doc.getElementById('act-' + key);
      if (!panel) return;
      var named = doc.getElementById((a.getAttribute('href') || '').replace(/^#/, ''));
      var target = named && panel.contains(named) ? named : panel;
      ev.preventDefault();
      Explore.show(key);
      var title = target === panel ? $('h3', panel) : target;
      if (title) {
        if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
        try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); }
      }
      var margin = parseFloat(window.getComputedStyle(panel).scrollMarginTop) || 0;
      var y = Math.max(0, Math.round(target.getBoundingClientRect().top + window.pageYOffset - margin));
      if (reduceMotion.matches) jumpTo(y);
      else try { window.scrollTo({ top: y, left: 0, behavior: 'smooth' }); } catch (e) { jumpTo(y); }
    });
  });

  // ---------------------------------------------------------------- back to the top
  // "Back to top" and the name in the header go to the very top of the page. (The browser's own jump
  // stops at the opening section, under the header.) Keyboard focus moves to the name.
  $all('a[href="#top"]').forEach(function (a) {
    on(a, 'click', function (ev) {
      if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      setMenu(false);
      var name = doc.getElementById('name') || $('main h1');
      if (name) {
        if (!name.hasAttribute('tabindex')) name.setAttribute('tabindex', '-1');
        try { name.focus({ preventScroll: true }); } catch (e) { name.focus(); }
      }
      if (reduceMotion.matches) jumpTo(0);
      else try { window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
      try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    });
  });

  // ---------------------------------------------------------------- an address with a section after #
  // The browser goes to the section (#experience, #act-quiz ...) while the page loads. On a slow connection
  // the fonts can arrive after that and move the text, so once they are in, the section is put back where
  // the browser meant it to be, unless the reader has moved meanwhile. A refresh, Back or Forward, and a
  // language switch (below) keep the reader's own place instead.
  (function () {
    var id = '';
    try { id = decodeURIComponent((location.hash || '').slice(1)); } catch (e) { return; }
    var target = id && doc.getElementById(id);
    if (!target || session.get('resume')) return;
    var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (nav && nav.type !== 'navigate') return;
    var moved = false;
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (type) {
      on(window, type, function () { moved = true; }, { passive: true });
    });
    function settle() {
      if (moved || !target.getClientRects().length) return;
      var margin = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      var end = Math.max(0, doc.documentElement.scrollHeight - window.innerHeight);
      var y = Math.min(end, Math.max(0, Math.round(target.getBoundingClientRect().top + window.pageYOffset - margin)));
      if (Math.abs(y - window.pageYOffset) <= 4) return;
      if (y > 0) Masthead.away();
      jumpTo(y);
    }
    // After the browser's own glide to the section (well under a second).
    function later() { setTimeout(settle, 900); }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(later);
    on(window, 'load', later);
  })();

  // ---------------------------------------------------------------- language switcher: remember the choice, keep the place
  // The place (reading position, open activity and its step) is handed to the other page in this tab's
  // session storage, and that page puts it back. If session storage is blocked, the link points to the section.
  $all('[data-lang-link]').forEach(function (a) {
    on(a, 'click', function () {
      store.set('lang', a.getAttribute('data-lang-link'));
      var pos = readingPosition();
      var key = Explore.current();
      var state = JSON.stringify({ pos: pos, activity: key, explore: key && activities[key] ? activities[key].state() : null });
      session.set('resume', state);
      var base = a.getAttribute('href').split('#')[0];
      var hash = '';
      if (session.get('resume') !== state) hash = pos.section === 'explore' && key ? 'act-' + key : (pos.section === 'top' ? '' : pos.section);
      a.setAttribute('href', base + (hash ? '#' + hash : ''));
    });
  });

  (function resume() {
    var raw = session.get('resume');
    if (!raw) return;
    session.remove('resume');
    var state;
    try { state = JSON.parse(raw); } catch (e) { return; }
    if (state.activity) {
      Explore.show(state.activity);
      if (state.explore && activities[state.activity]) activities[state.activity].restore(state.explore);
    }
    var pos = state.pos || (state.section ? { section: state.section, block: -1 } : null);   // (or from version 1.00)
    if (!pos) return;
    var moved = false;
    function place() {
      if (moved) return;
      var y = scrollTarget(pos);
      if (y === null) return;
      if (Math.abs(y - window.pageYOffset) > 1) jumpTo(y);
      Masthead.settle();
    }
    place();
    // Fonts and pictures that arrive later can shift the text: put the place back, until the reader moves.
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (type) {
      on(window, type, function () { moved = true; }, { passive: true });
    });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(place);
    on(window, 'load', function () { place(); setTimeout(place, 300); });
  })();
})();
