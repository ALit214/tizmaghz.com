/* Ali TizMaghz — site behaviour. No libraries, no tracking.
   Everything on the page can be read without this script; it adds the theme and menu controls,
   the logo animation, the copy button and the Explore & learn activities.
   Choices are remembered in this browser only (theme, language, sound), when the browser allows it. */
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

  // ---------------------------------------------------------------- the header slides away while reading down
  // and comes back on scrolling up. It stays near the top of the page, while the menu is open, and while
  // keyboard focus is in it.
  var Masthead = (function () {
    var mast = $('.masthead');
    if (!mast) return { settle: function () {}, bottom: function () { return 0; }, height: function () { return 0; } };
    var lastY = window.pageYOffset;
    var down = 0;
    var up = 0;
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset;
      if (y > lastY) { down += y - lastY; up = 0; } else if (y < lastY) { up += lastY - y; down = 0; }
      lastY = y;
      mast.classList.toggle('is-stuck', y > 8);
      var keep = y < 140 || menuOpen() || (keyboardUser && mast.contains(doc.activeElement));
      if (keep || up > 12) mast.classList.remove('is-hidden');
      else if (down > 24) mast.classList.add('is-hidden');
    }
    on(window, 'scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    on(mast, 'focusin', function () { mast.classList.remove('is-hidden'); });
    update();
    return {
      // After the page has been moved for the reader (a language switch): header in view, counting afresh.
      settle: function () {
        lastY = window.pageYOffset; down = 0; up = 0;
        mast.classList.remove('is-hidden');
        mast.classList.toggle('is-stuck', lastY > 8);
      },
      // Where the header ends, from the top of the window (0 while it is away).
      bottom: function () { return mast.classList.contains('is-hidden') ? 0 : Math.max(0, mast.getBoundingClientRect().bottom); },
      height: function () { return mast.offsetHeight; }
    };
  })();

  // ---------------------------------------------------------------- where the reader is
  // The reading position is the first line below the header: its section, the heading, paragraph or list
  // item there (counted within the section: the three language versions are built alike, so the same
  // count finds the same item in another language) and how far into that item.
  var SECTION_IDS = ['top', 'work', 'expertise', 'experience', 'explore', 'contact'];
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
  $all('[data-toggle-list]').forEach(function (button) {
    var list = doc.getElementById(button.getAttribute('aria-controls'));
    if (!list) return;
    list.hidden = true;
    on(button, 'click', function () {
      var open = list.hidden;
      list.hidden = !open;
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
  // The text of a box as it should be read out: without its "Source" link, and with headings and
  // paragraphs kept apart (so a title and the text under it aren't read as one long word).
  function spokenText(box) {
    var copy = box.cloneNode(true);
    $all('.source-link', copy).forEach(function (a) { a.parentNode.removeChild(a); });
    $all('h1, h2, h3, h4, h5, h6', copy).forEach(function (h) {
      h.appendChild(doc.createTextNode(/[.:!?\u061F]\s*$/.test(h.textContent) ? ' ' : '. '));
    });
    $all('p, li', copy).forEach(function (el) { el.appendChild(doc.createTextNode(' ')); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
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

  // Build a tissue
  (function () {
    var panel = $('#act-build');
    if (!panel) return;
    var box = $('.build', panel);
    var buttons = $all('[data-ingredient]', $('.ingredients', panel));
    var steps = $all('.build-step', panel);
    var log = $('.build-log', panel);
    var result = $('[data-build-result]', panel);
    var progress = $('[data-build-progress]', panel);
    var reset = $('[data-build-reset]', panel);
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
    render();
    activities.build = {
      state: function () { return { added: added.slice() }; },
      restore: function (st) { if (st && st.added) { added = st.added.filter(function (id) { return buttons.some(function (b) { return b.getAttribute('data-ingredient') === id; }); }); render(); } }
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
      });
    });
  });

  // Sort the equipment
  (function () {
    var panel = $('#act-sort');
    if (!panel || !DATA.sort) return;
    var card = $('[data-sort-card]', panel);
    var itemEl = $('[data-sort-item]', panel);
    var choicesEl = $('[data-sort-choices]', panel);
    var feedback = $('[data-sort-feedback]', panel);
    var nextBtn = $('[data-sort-next]', panel);
    var done = $('[data-sort-done]', panel);
    var again = $('[data-sort-again]', panel);
    var dots = $all('.sort-dots span', panel);
    var items = DATA.sort.items;
    var cats = DATA.sort.categories;
    var markRight = $('.choice-mark.mark-right', doc.getElementById('act-lifecycle')) || null;
    var index = 0;
    function makeChoice(catNumber) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.setAttribute('data-choice', String(catNumber));
      if (markRight) {
        var right = markRight.cloneNode(true);
        var wrong = $('.choice-mark.mark-wrong', markRight.parentNode).cloneNode(true);
        b.appendChild(right);
        b.appendChild(wrong);
      }
      var label = doc.createElement('span');
      label.textContent = cats[catNumber - 1];
      b.appendChild(label);
      return b;
    }
    function show(focusItem) {
      card.hidden = index >= items.length;
      done.hidden = index < items.length;
      dots.forEach(function (d, k) { d.className = k < index ? 'is-done' : (k === index ? 'is-current' : ''); });
      if (index >= items.length) { $('.sort-done-text', done).focus(); return; }
      var item = items[index];
      itemEl.textContent = item.name;
      choicesEl.innerHTML = '';
      item.choices.forEach(function (n) { choicesEl.appendChild(makeChoice(n)); });
      feedback.hidden = true;
      nextBtn.hidden = true;
      if (focusItem) itemEl.focus();
    }
    on(choicesEl, 'click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.choice') : null;
      if (!b) return;
      var item = items[index];
      var right = parseInt(b.getAttribute('data-choice'), 10) === item.answer;
      $all('.choice', choicesEl).forEach(function (o) {
        var isAnswer = parseInt(o.getAttribute('data-choice'), 10) === item.answer;
        if (o === b) o.setAttribute('data-state', right ? 'right' : 'wrong');
        else if (isAnswer && !right) o.setAttribute('data-state', 'answer');
        else o.removeAttribute('data-state');
      });
      var text = fill(right ? T.sortRight : T.sortWrong, { category: cats[item.answer - 1] });
      feedback.setAttribute('data-result', right ? 'right' : 'wrong');
      $('p', feedback).textContent = text;
      feedback.hidden = false;
      feedback.classList.add('is-shown');
      nextBtn.hidden = false;
      announce(text);
      Sound.play(right ? 'right' : 'again');
    });
    on(nextBtn, 'click', function () {
      index += 1;
      show(true);
      if (index >= items.length) Sound.play('done');
    });
    on(again, 'click', function () { index = 0; show(true); });
    show(false);
    activities.sort = {
      state: function () { return { step: index }; },
      restore: function (st) { if (st && st.step >= 0 && st.step <= items.length) { index = st.step; show(false); } }
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
    links.forEach(function (a) {
      on(a, 'click', function (ev) {
        ev.preventDefault();
        show(a.getAttribute('data-activity'));
      });
    });
    var fromHash = (location.hash || '').replace(/^#act-/, '');
    show(fromHash && doc.getElementById('act-' + fromHash) ? fromHash : links[0].getAttribute('data-activity'));
    return { current: function () { return current; }, show: show };
  })();

  // ---------------------------------------------------------------- back to the top
  // "Back to top" and the name in the header go to the very top of the page. (The browser's own jump
  // stops at the opening section, under the header.) Keyboard focus moves to the name.
  $all('a[href="#top"]').forEach(function (a) {
    on(a, 'click', function (ev) {
      if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      setMenu(false);
      var name = doc.getElementById('name');
      if (name) {
        if (!name.hasAttribute('tabindex')) name.setAttribute('tabindex', '-1');
        try { name.focus({ preventScroll: true }); } catch (e) { name.focus(); }
      }
      if (reduceMotion.matches) jumpTo(0);
      else try { window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
      try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    });
  });

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
