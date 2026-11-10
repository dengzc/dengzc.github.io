/* Progressive enhancement for the "Explore industries" widget.
   Server renders all rows (ranked by take-up). This adds EN/NL, sort and search.
   Without JS the static ranked list still works. */
(function () {
  function init(widget) {
    var list = widget.querySelector('[data-industry-list]');
    if (!list) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll('.industry-row'));
    var search = widget.querySelector('[data-industry-search]');
    var sort = widget.querySelector('[data-industry-sort]');
    var empty = widget.querySelector('[data-industry-empty]');
    var langButtons = Array.prototype.slice.call(widget.querySelectorAll('[data-industry-lang]'));

    function lang() {
      return widget.getAttribute('data-language') === 'nl' ? 'nl' : 'en';
    }

    function applyI18n() {
      var l = lang();
      widget.querySelectorAll('[data-i18n-' + l + ']').forEach(function (el) {
        var text = el.getAttribute('data-i18n-' + l);
        if (text === null) return;
        if (el.getAttribute('data-i18n-attr') === 'placeholder') {
          el.setAttribute('placeholder', text);
        } else {
          el.textContent = text;
        }
      });
    }

    function setLang(l) {
      widget.setAttribute('data-language', l);
      langButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-industry-lang') === l ? 'true' : 'false');
      });
      applyI18n();
      applySort();
      applyFilter();
    }

    function nameFor(row) {
      return (lang() === 'nl' ? row.getAttribute('data-name-nl') : row.getAttribute('data-name-en')) || '';
    }

    function applySort() {
      var mode = sort ? sort.value : 'takeup-desc';
      var sorted = rows.slice().sort(function (a, b) {
        var ta = parseFloat(a.getAttribute('data-takeup'));
        var tb = parseFloat(b.getAttribute('data-takeup'));
        var na = parseInt(a.getAttribute('data-n'), 10) || 0;
        var nb = parseInt(b.getAttribute('data-n'), 10) || 0;
        var la = nameFor(a).toLowerCase();
        var lb = nameFor(b).toLowerCase();
        switch (mode) {
          case 'takeup-asc':
            // keep suppressed (-1) at the end regardless of direction
            if (ta < 0 || tb < 0) return ta - tb === 0 ? la.localeCompare(lb) : tb - ta;
            return ta - tb || la.localeCompare(lb);
          case 'name':
            return la.localeCompare(lb);
          case 'n-desc':
            return nb - na || tb - ta;
          default:
            return tb - ta || la.localeCompare(lb);
        }
      });
      sorted.forEach(function (r) { list.appendChild(r); });
    }

    function applyFilter() {
      var q = (search && search.value || '').trim().toLowerCase();
      var any = false;
      rows.forEach(function (r) {
        var hay = (r.getAttribute('data-name-en') + ' ' + r.getAttribute('data-name-nl') + ' ' + r.getAttribute('data-code')).toLowerCase();
        var show = !q || hay.indexOf(q) >= 0;
        r.classList.toggle('is-hidden', !show);
        if (show) any = true;
      });
      if (empty) empty.hidden = any;
    }

    langButtons.forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-industry-lang')); });
    });
    if (sort) sort.addEventListener('change', applySort);
    if (search) search.addEventListener('input', applyFilter);

    widget.classList.add('is-enhanced');
    applyI18n();
    applySort();
    applyFilter();
  }

  document.querySelectorAll('[data-industry-widget]').forEach(init);
})();
