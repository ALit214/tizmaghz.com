/* Ali TizMaghz — the quiet drawings in the empty places (since version 3.05). No libraries, no tracking.
   Decoration only: every drawing here is hidden from screen readers, takes no keyboard focus and no pointer, and the
   pages read the same without this script. Ali's choices of 18 November 2026 (brief\UPDATE-PLAN.md, Decisions):
   1. A box alone in its row, or a row of boxes that is not full (the doors of "Go further" and of Inside Medical
      Devices, the calendar cards of the device tutorials): a few cells along a fibre, faint, in the part's colour,
      in the empty place. Computers only (from 900 px); no box changes its size.
   2. Books & Guidelines and Standards in Medicine: the same drawing beside each group's heading, in the group's
      colour. It never meets the words: beside the title where the title leaves 300 px or more; otherwise lower,
      beside the lead paragraph, as tall as that paragraph; none under 160 px.
   3. Wide screens (from 1,700 px): the ten lines of the home page's dish in the far margin (the right in English,
      the left in Persian and Arabic) beside every part's heading, in the part's colour (a group's on Books &
      Guidelines and Standards in Medicine, the same as the drawing at its heading); where the part has no colour,
      in the page's colour (its bullet's in the menu), or the site's violet on a page with no bullet. A part shorter
      than the drawing takes none.
   The ten lines are in a file of their own, assets/js/dish-lines.js, fetched only when they are needed (a window of
   1,700 px or more, or the hidden game opening), so that they add nothing to a page's first download. */
(function () {
  'use strict';
  var doc = document;
  if (!window.matchMedia || !doc.querySelectorAll || !window.getComputedStyle) return;

  function all(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }
  function cell(x, y, r) {                        // the site's cell in outline: a body and its nucleus
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>' +
           '<circle cx="' + (x - r * 0.18).toFixed(1) + '" cy="' + (y - r * 0.18).toFixed(1) + '" r="' + (r * 0.36).toFixed(1) + '"/>';
  }
  var FIBRE = '<svg class="fill-cells" viewBox="0 0 520 200" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false">' +
      '<path d="M6,138 C96,52 196,186 306,104 S 452,58 514,96"/>' +
      '<path d="M6,166 C120,108 236,204 356,142 S 470,128 514,150" opacity="0.5"/>' +
      cell(98, 100, 27) + cell(196, 150, 17) +
      '<path d="M306,82 a23,23 0 1 0 0,44"/><path d="M306,82 a23,23 0 1 1 0,44"/><path d="M306,84 L306,124" opacity="0.6"/>' +
      '<circle cx="290" cy="100" r="7.5"/><circle cx="322" cy="100" r="7.5"/>' +
      cell(414, 78, 15) + cell(468, 132, 9.5) + cell(40, 150, 11) + '</svg>';
  var WIDTHS = [1.3, 1.3, 1.3, 1.3, 1, 1, 1, 1.4, 1.2, 1];
  function dish(lines) {
    return '<svg viewBox="60 90 480 430" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true" focusable="false">' +
      lines.map(function (d, i) { return '<path d="' + d + '" stroke-width="' + WIDTHS[i] + '" vector-effect="non-scaling-stroke"/>'; }).join('') + '</svg>';
  }
  // The dish's ten lines, fetched once, when first asked for (this script's own address, with the other file's name).
  var me = doc.currentScript || doc.querySelector('script[src$="fill.js"]'), asked = false, waiting = [];
  function lines(then) {
    if (window.SiteDish) { then(window.SiteDish); return; }
    waiting.push(then);
    if (asked || !me || !me.src) return;
    asked = true;
    var s = doc.createElement('script');
    s.src = me.src.replace(/fill\.js(\?.*)?$/, 'dish-lines.js');
    s.onload = function () { waiting.splice(0).forEach(function (f) { if (window.SiteDish) f(window.SiteDish); }); };
    s.onerror = function () { asked = false; waiting = []; };          // no lines, no drawing; the pages read the same
    doc.head.appendChild(s);
  }
  window.SiteArt = { lines: lines };              // game.js draws the same lines in its dish

  function make(tag, cls, html) {
    var el = doc.createElement(tag);
    el.className = cls; el.setAttribute('aria-hidden', 'true'); el.innerHTML = html;
    return el;
  }
  function textBox(el) { var r = doc.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); }
  function toneOf(el) { return el ? getComputedStyle(el).getPropertyValue('--tone').replace(/^\s+|\s+$/g, '') : ''; }

  function clear() {
    all('.row-fill, .head-art, .margin-art').forEach(function (el) { el.parentNode.removeChild(el); });
    all('.has-head-art').forEach(function (el) { el.classList.remove('has-head-art'); });
    all('.has-margin-art').forEach(function (el) { el.classList.remove('has-margin-art'); });
  }
  // 1. the empty place of a row of boxes that is not full
  function rowFills() {
    all('ul.doors, ul.lx-checks').forEach(function (list) {
      var kids = Array.prototype.filter.call(list.children, function (k) { return k.getBoundingClientRect().width > 0; });
      var cols = getComputedStyle(list).gridTemplateColumns.split(' ').map(parseFloat).filter(function (x) { return x > 0; }).length;
      if (cols < 2 || !kids.length) return;
      var rest = kids.length < cols ? cols - kids.length : (cols - kids.length % cols) % cols;
      if (!rest) return;
      var li = make('li', 'row-fill', FIBRE);
      li.style.gridColumn = 'span ' + rest;
      list.appendChild(li);
    });
  }
  // A part's colour: its own (a tutorial's parts, the parts of Inside Medical Devices), or its group's (the groups of
  // Books & Guidelines and of Standards in Medicine, data-art-tone, from the build's FIELD_TONES and FAMILY_TONES);
  // a part with no colour at all takes the page's colour, which is its bullet's in the menu, and the site's violet
  // on a page with no bullet. (Ali, 18 November 2026; "Where to get them" has none, so it takes the page's.)
  function pageColour() {
    var here = doc.querySelector('.site-nav .nav-sub-page a[aria-current="page"]');
    return here ? toneOf(here.parentNode) : '';
  }
  function partColour(band, page) {
    if (/(^|\s)tone-/.test(band.className)) return toneOf(band);
    var group = band.getAttribute('data-art-tone');
    return group ? 'var(--' + group + ')' : (page || 'var(--violet)');
  }
  // 2. beside each group's heading on Books & Guidelines and Standards in Medicine (main[data-head-art])
  function headArt() {
    var page = pageColour();
    all('main[data-head-art] section.band > .wrap > .section-head').forEach(function (head) {
      var title = head.querySelector('h2'), lead = head.querySelector('p');
      if (!title) return;
      var hb = head.getBoundingClientRect(), tb = textBox(title), pb = lead ? textBox(lead) : tb;
      var freeTitle = hb.width - Math.max(tb.width, pb.width), freeLead = hb.width - pb.width;
      var art = make('div', 'head-art', FIBRE), w;
      art.style.color = partColour(head.parentNode.parentNode, page);
      if (freeTitle >= 300) w = Math.min(410, freeTitle - 56);
      else {
        w = Math.min(410, freeLead - 56, Math.min(pb.height + 28, 130) * 2.6);
        art.style.top = Math.round(pb.top - hb.top + pb.height / 2) + 'px';
      }
      if (w < 160) return;
      art.style.width = Math.round(w) + 'px';
      head.classList.add('has-head-art');
      head.appendChild(art);
    });
  }
  // 3. the dish's lines in the far margin, beside every part's heading: every band of <main>, a <section> or not
  // ("What a standard is" on Standards in Medicine is a <div>; Ali found it without lines, 18 November 2026)
  function marginArt(drawn) {
    var page = pageColour(), DISH = dish(drawn);
    all('main .band').forEach(function (band) {
      var wrap = band.querySelector('.wrap'), title = band.querySelector('h2');
      if (!wrap || !title) return;
      var b = band.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var margin = wr.left + parseFloat(getComputedStyle(wrap).paddingLeft) - b.left;      // from the window's edge to the column
      var size = Math.round(margin * 1.2);
      if (margin < 100 || b.height < size) return;                                         // a part shorter than the drawing takes none
      var rtl = getComputedStyle(band).direction === 'rtl';
      var art = make('div', 'margin-art', DISH), svg = art.firstChild, tr = title.getBoundingClientRect();
      art.style.color = partColour(band, page);
      art.style.width = Math.round(margin) + 'px';
      svg.style.width = svg.style.height = size + 'px';
      svg.style.top = Math.round(tr.top - b.top + tr.height / 2 - size / 2) + 'px';
      // its middle stands 0.28 of the margin in from the window's edge, so it ends 0.88 in, short of the column
      svg.style[rtl ? 'left' : 'right'] = Math.round(margin * 0.28 - size / 2) + 'px';
      if (!rtl) svg.style.transform = 'scaleX(-1)';
      band.classList.add('has-margin-art');
      band.appendChild(art);
    });
  }

  var wide = window.matchMedia('(min-width: 900px)'), far = window.matchMedia('(min-width: 1700px)');
  var timer = null, round = 0;
  function layout() {
    var mine = ++round;
    clear();
    if (wide.matches) { rowFills(); headArt(); }
    if (far.matches) lines(function (drawn) { if (mine === round) marginArt(drawn); });   // not after a later layout
  }
  function later() { clearTimeout(timer); timer = setTimeout(layout, 160); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', layout); else layout();
  window.addEventListener('resize', later);
  window.addEventListener('load', later);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(later);
})();
