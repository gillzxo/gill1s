// =====================================================================
// Global client-side behaviour: mobile nav drawer, scroll-reveal
// animation, animated stat counters, and the enquiry form handler.
// No build step — vanilla JS, loaded on every page.
// =====================================================================
(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Mobile nav drawer
  // ---------------------------------------------------------------
  var toggle = document.getElementById('mobile-nav-toggle');
  var closeBtn = document.getElementById('mobile-nav-close');
  var drawer = document.getElementById('mobile-nav');
  var backdrop = document.getElementById('mobile-nav-backdrop');

  function openDrawer() {
    drawer.classList.add('open');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    toggle && toggle.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    toggle && toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle) toggle.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // ---------------------------------------------------------------
  // Mobile nav accordion — tap a group heading (Coaching / Study Abroad)
  // to expand/collapse its submenu links.
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-mobile-submenu-toggle]').forEach(function (btn) {
    var targetId = btn.getAttribute('data-mobile-submenu-toggle');
    var panel = document.getElementById(targetId);
    if (!panel) return;
    btn.addEventListener('click', function () {
      var isOpen = panel.classList.contains('open');
      // close any other open submenus for a tidy accordion effect
      document.querySelectorAll('.mobile-submenu.open').forEach(function (p) {
        if (p !== panel) p.classList.remove('open');
      });
      panel.classList.toggle('open', !isOpen);
      var icon = btn.querySelector('i.fa-chevron-down');
      if (icon) icon.style.transform = !isOpen ? 'rotate(180deg)' : '';
    });
  });

  // ---------------------------------------------------------------
  // Dismissible welcome popup — shows ONLY ONCE EVER per browser
  // (localStorage, not sessionStorage), closable via X, "No Thanks",
  // backdrop click, or Esc. Content/enable toggle is admin-configurable
  // via Site Settings (popup_enabled, popup_title, popup_text, etc).
  // ---------------------------------------------------------------
  var popupBackdrop = document.getElementById('welcome-popup-backdrop');
  if (popupBackdrop) {
    var POPUP_KEY = 'fc_welcome_popup_seen_v1';
    var alreadyShown = false;
    try {
      alreadyShown = localStorage.getItem(POPUP_KEY) === '1';
    } catch (e) {
      /* localStorage unavailable (private mode) — fall back to not spamming every load */
      alreadyShown = true;
    }

    function hidePopup() {
      popupBackdrop.classList.add('hidden');
      popupBackdrop.classList.remove('flex');
      try {
        localStorage.setItem(POPUP_KEY, '1');
      } catch (e) {}
    }

    if (!alreadyShown) {
      setTimeout(function () {
        popupBackdrop.classList.remove('hidden');
        popupBackdrop.classList.add('flex');
      }, 2200);
    }

    var popupClose = document.getElementById('welcome-popup-close');
    var popupDismiss = document.getElementById('welcome-popup-dismiss');
    var popupCta = popupBackdrop.querySelector('a[href]');
    if (popupClose) popupClose.addEventListener('click', hidePopup);
    if (popupDismiss) popupDismiss.addEventListener('click', hidePopup);
    if (popupCta) popupCta.addEventListener('click', hidePopup); // clicking through also counts as "seen"
    popupBackdrop.addEventListener('click', function (e) {
      if (e.target === popupBackdrop) hidePopup();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !popupBackdrop.classList.contains('hidden')) hidePopup();
    });
  }

  // ---------------------------------------------------------------
  // Scroll reveal animation
  // ---------------------------------------------------------------
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('revealed');
    });
  }

  // ---------------------------------------------------------------
  // Animated stat counters (elements with [data-counter])
  // ---------------------------------------------------------------
  var counters = document.querySelectorAll('[data-counter]');
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-counter')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1400;
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.floor(eased * target);
      el.textContent = value.toLocaleString('en-IN') + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('en-IN') + suffix;
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && counters.length) {
    var counterIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      counterIo.observe(el);
    });
  } else {
    counters.forEach(animateCounter);
  }

  // ---------------------------------------------------------------
  // Generic enquiry form handler — works for any <form data-enquiry-form>
  // on the page (home hero, coaching page, contact page, etc.)
  // ---------------------------------------------------------------
  var enquiryForms = document.querySelectorAll('form[data-enquiry-form]');
  enquiryForms.forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('[type="submit"]');
      var originalLabel = submitBtn ? submitBtn.innerHTML : '';
      var errorBox = form.querySelector('[data-form-error]');
      var successBox = form.querySelector('[data-form-success]');
      if (errorBox) {
        errorBox.classList.add('hidden');
        errorBox.textContent = '';
      }
      if (successBox) successBox.classList.add('hidden');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner inline-block align-middle mr-2"></span> Sending...';
      }

      try {
        var formData = new FormData(form);
        formData.set('source_page', window.location.pathname);

        // reCAPTCHA v3 (only runs if the site key + grecaptcha script are present)
        if (window.grecaptcha && window.RECAPTCHA_SITE_KEY) {
          await new Promise(function (resolve) {
            window.grecaptcha.ready(resolve);
          });
          var token = await window.grecaptcha.execute(window.RECAPTCHA_SITE_KEY, { action: 'enquiry' });
          formData.set('recaptcha_token', token);
        }

        var resp = await fetch('/api/enquiry', {
          method: 'POST',
          body: formData
        });
        var data = await resp.json();

        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'Something went wrong. Please try again or call us directly.');
        }

        form.reset();
        form.classList.add('hidden');
        if (successBox) {
          successBox.classList.remove('hidden');
          var waBtn = successBox.querySelector('[data-wa-link]');
          if (waBtn && data.whatsappLink) waBtn.setAttribute('href', data.whatsappLink);
        }

        // fire a custom event other widgets (e.g. calculators) can hook into
        window.dispatchEvent(new CustomEvent('enquiry:submitted', { detail: data }));
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message || 'Something went wrong. Please try again.';
          errorBox.classList.remove('hidden');
        } else {
          alert(err.message || 'Something went wrong. Please try again.');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalLabel;
        }
      }
    });
  });

  // ---------------------------------------------------------------
  // "Open enquiry modal pre-filled" buttons — used by every "Enquire
  // Now" / "Free Consultation" button across the site instead of each
  // page embedding its own full form. Prefers a page-local
  // <dialog id="enquiry-modal"> (e.g. the loan calculators, which
  // attach EMI results via extra_json); falls back to the shared
  // <dialog id="global-enquiry-modal"> defined once in renderer.tsx.
  // ---------------------------------------------------------------
  var modal = document.getElementById('enquiry-modal') || document.getElementById('global-enquiry-modal');
  document.querySelectorAll('[data-open-enquiry]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!modal) return;
      var prefillService = modal.querySelector('[name="service"]');
      var prefillCountry = modal.querySelector('[name="preferred_country"]');
      var prefillMessage = modal.querySelector('[name="message"]');
      var extraField = modal.querySelector('[name="extra_json"]');
      if (prefillService && btn.getAttribute('data-service')) prefillService.value = btn.getAttribute('data-service');
      if (prefillCountry && btn.getAttribute('data-country')) prefillCountry.value = btn.getAttribute('data-country');
      if (prefillMessage) prefillMessage.value = btn.getAttribute('data-message') || '';
      if (extraField) extraField.value = btn.getAttribute('data-extra') || '';
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.classList.remove('hidden');
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = btn.closest('dialog') || document.getElementById('enquiry-modal') || document.getElementById('global-enquiry-modal');
      if (dlg && typeof dlg.close === 'function') dlg.close();
      else if (dlg) dlg.classList.add('hidden');
    });
  });
})();
