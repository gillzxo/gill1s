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
  // "Open enquiry modal pre-filled" buttons (used by loan calculators)
  // Looks for [data-open-enquiry] buttons and a <dialog id="enquiry-modal">
  // ---------------------------------------------------------------
  var modal = document.getElementById('enquiry-modal');
  document.querySelectorAll('[data-open-enquiry]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!modal) return;
      var prefillService = modal.querySelector('[name="service"]');
      var prefillMessage = modal.querySelector('[name="message"]');
      var extraField = modal.querySelector('[name="extra_json"]');
      if (prefillService) prefillService.value = btn.getAttribute('data-service') || 'Loan';
      if (prefillMessage) prefillMessage.value = btn.getAttribute('data-message') || '';
      if (extraField) extraField.value = btn.getAttribute('data-extra') || '';
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.classList.remove('hidden');
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = btn.closest('dialog') || document.getElementById('enquiry-modal');
      if (dlg && typeof dlg.close === 'function') dlg.close();
      else if (dlg) dlg.classList.add('hidden');
    });
  });
})();
