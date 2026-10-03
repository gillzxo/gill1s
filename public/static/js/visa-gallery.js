// =====================================================================
// Visa Results gallery — client-side filtering + accessible lightbox.
// =====================================================================
(function () {
  'use strict';

  var countryFilter = document.getElementById('filter-country');
  var typeFilter = document.getElementById('filter-type');
  var countEl = document.getElementById('filter-count');
  var noResults = document.getElementById('no-results');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.visa-card'));

  function applyFilters() {
    var country = countryFilter ? countryFilter.value : '';
    var type = typeFilter ? typeFilter.value : '';
    var visibleCount = 0;

    cards.forEach(function (card) {
      var matchCountry = !country || card.getAttribute('data-country') === country;
      var matchType = !type || card.getAttribute('data-type') === type;
      var visible = matchCountry && matchType;
      card.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    if (countEl) countEl.textContent = visibleCount + ' results';
    if (noResults) noResults.classList.toggle('hidden', visibleCount > 0);
  }

  if (countryFilter) countryFilter.addEventListener('change', applyFilters);
  if (typeFilter) typeFilter.addEventListener('change', applyFilters);

  // ---------------------------------------------------------------
  // Lightbox
  // ---------------------------------------------------------------
  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lightbox-image');
  var lightboxName = document.getElementById('lightbox-name');
  var lightboxMeta = document.getElementById('lightbox-meta');
  var closeBtn = document.getElementById('lightbox-close');
  var prevBtn = document.getElementById('lightbox-prev');
  var nextBtn = document.getElementById('lightbox-next');
  var currentIndex = 0;

  function visibleCards() {
    return cards.filter(function (c) {
      return c.style.display !== 'none';
    });
  }

  function openLightbox(index) {
    var visible = visibleCards();
    if (!visible.length) return;
    currentIndex = ((index % visible.length) + visible.length) % visible.length;
    var card = visible[currentIndex];
    var img = card.querySelector('img');
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxName.textContent = card.querySelector('.font-bold').textContent;
    lightboxMeta.textContent = card.querySelector('.text-slate-400').textContent;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }

  cards.forEach(function (card, i) {
    card.addEventListener('click', function () {
      var visible = visibleCards();
      var idx = visible.indexOf(card);
      openLightbox(idx >= 0 ? idx : 0);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', function () { openLightbox(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { openLightbox(currentIndex + 1); });
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (lightbox && lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') openLightbox(currentIndex - 1);
    if (e.key === 'ArrowRight') openLightbox(currentIndex + 1);
  });
})();
