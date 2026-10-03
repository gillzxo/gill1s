// =====================================================================
// Admin portal shared client-side helpers: sidebar toggle, toast
// notifications, drag-drop image upload, rich text editor toolbar, and
// a generic "delete with confirm" handler for admin tables.
// =====================================================================
(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Mobile sidebar toggle
  // ---------------------------------------------------------------
  var menuToggle = document.getElementById('admin-menu-toggle');
  var sidebar = document.getElementById('admin-sidebar');
  var backdrop = document.getElementById('admin-backdrop');
  if (menuToggle && sidebar && backdrop) {
    menuToggle.addEventListener('click', function () {
      sidebar.classList.remove('-translate-x-full');
      backdrop.classList.remove('hidden');
    });
    backdrop.addEventListener('click', function () {
      sidebar.classList.add('-translate-x-full');
      backdrop.classList.add('hidden');
    });
  }

  // ---------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------
  window.showToast = function (message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .3s';
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2800);
  };

  // ---------------------------------------------------------------
  // Generic "confirm + submit" for delete buttons: <button data-confirm-delete data-form="form-id">
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-confirm-delete]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var msg = btn.getAttribute('data-confirm-delete') || 'Are you sure you want to delete this?';
      if (!confirm(msg)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });

  // ---------------------------------------------------------------
  // Image dropzone upload — POSTs to /admin/api/upload, writes the
  // returned URL into a hidden input, and shows a preview.
  // Markup contract:
  //   <div class="dropzone" data-dropzone data-folder="visa-results">
  //     <input type="file" accept="image/*" class="hidden" data-dropzone-input />
  //     <img data-dropzone-preview class="hidden" />
  //   </div>
  //   <input type="hidden" name="image_url" data-dropzone-target />
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-dropzone]').forEach(function (zone) {
    var input = zone.querySelector('[data-dropzone-input]');
    var preview = zone.querySelector('[data-dropzone-preview]');
    var targetSelector = zone.getAttribute('data-target') || null;
    var target = targetSelector ? document.querySelector(targetSelector) : zone.parentElement.querySelector('[data-dropzone-target]');
    var folder = zone.getAttribute('data-folder') || 'misc';
    var promptEl = zone.querySelector('[data-dropzone-prompt]');

    function handleFiles(files) {
      if (!files || !files.length) return;
      var file = files[0];
      if (!file.type.startsWith('image/')) {
        window.showToast('Please select an image file', 'error');
        return;
      }
      var formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      if (promptEl) promptEl.textContent = 'Uploading...';
      fetch('/admin/api/upload', { method: 'POST', body: formData })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (!data.ok) throw new Error(data.error || 'Upload failed');
          if (target) target.value = data.url;
          if (preview) {
            preview.src = data.url;
            preview.classList.remove('hidden');
          }
          if (promptEl) promptEl.textContent = 'Image uploaded! Click to replace.';
          window.showToast('Image uploaded successfully', 'success');
        })
        .catch(function (err) {
          if (promptEl) promptEl.textContent = 'Upload failed. Click to try again.';
          window.showToast(err.message, 'error');
        });
    }

    zone.addEventListener('click', function () {
      if (input) input.click();
    });
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    if (input) {
      input.addEventListener('change', function () {
        handleFiles(input.files);
      });
    }
  });

  // ---------------------------------------------------------------
  // Rich text editor toolbar (uses document.execCommand — simple,
  // dependency-free, works great for the headings/images/links scope
  // needed here). Writes HTML into a hidden <textarea name="content_html">.
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-rte-toolbar]').forEach(function (toolbar) {
    var contentId = toolbar.getAttribute('data-rte-toolbar');
    var content = document.getElementById(contentId);
    var hiddenField = document.querySelector('[data-rte-output="' + contentId + '"]');
    if (!content) return;

    function sync() {
      if (hiddenField) hiddenField.value = content.innerHTML;
    }
    content.addEventListener('input', sync);
    sync();

    toolbar.querySelectorAll('[data-cmd]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var cmd = btn.getAttribute('data-cmd');
        var value = btn.getAttribute('data-value') || undefined;
        content.focus();
        if (cmd === 'createLink') {
          var url = prompt('Enter the URL:');
          if (!url) return;
          document.execCommand('createLink', false, url);
        } else if (cmd === 'insertImage') {
          var imgUrl = prompt('Enter the image URL (upload it first via Visa/News image upload, or paste any image URL):');
          if (!imgUrl) return;
          document.execCommand('insertImage', false, imgUrl);
        } else {
          document.execCommand(cmd, false, value);
        }
        sync();
      });
    });
  });

  // ---------------------------------------------------------------
  // Auto-generate slug from title field: <input data-slug-source> -> <input data-slug-target>
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-slug-source]').forEach(function (source) {
    var targetId = source.getAttribute('data-slug-source');
    var target = document.getElementById(targetId);
    if (!target) return;
    var userEdited = false;
    target.addEventListener('input', function () {
      userEdited = true;
    });
    source.addEventListener('input', function () {
      if (userEdited) return;
      target.value = source.value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    });
  });

  // ---------------------------------------------------------------
  // Dynamic list editor for JSON array fields (universities, documents)
  // Markup: <div data-json-list data-json-target="#hidden-input">
  //   <div data-json-list-items></div>
  //   <button data-json-add>Add Row</button>
  //   <template data-json-row-template>...</template>
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-json-list-simple]').forEach(function (container) {
    // Simple string-array list (e.g. documents checklist)
    var targetSel = container.getAttribute('data-json-target');
    var target = document.querySelector(targetSel);
    var itemsWrap = container.querySelector('[data-json-list-items]');
    var addBtn = container.querySelector('[data-json-add]');

    function serialize() {
      var values = Array.prototype.slice
        .call(itemsWrap.querySelectorAll('input[type="text"]'))
        .map(function (i) {
          return i.value.trim();
        })
        .filter(Boolean);
      if (target) target.value = JSON.stringify(values);
    }

    function addRow(value) {
      var row = document.createElement('div');
      row.className = 'flex gap-2 mb-2';
      row.innerHTML =
        '<input type="text" class="admin-input" value="' +
        (value ? value.replace(/"/g, '&quot;') : '') +
        '" placeholder="e.g. Valid Passport" />' +
        '<button type="button" class="admin-btn-danger shrink-0" data-remove-row><i class="fa-solid fa-trash"></i></button>';
      itemsWrap.appendChild(row);
      row.querySelector('input').addEventListener('input', serialize);
      row.querySelector('[data-remove-row]').addEventListener('click', function () {
        row.remove();
        serialize();
      });
    }

    // Initialise from existing JSON value
    try {
      var existing = JSON.parse((target && target.value) || '[]');
      existing.forEach(function (v) {
        addRow(v);
      });
    } catch (e) {
      /* ignore malformed existing JSON */
    }

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addRow('');
      });
    }
  });

  // University list editor (name, location, ranking objects)
  document.querySelectorAll('[data-json-list-university]').forEach(function (container) {
    var targetSel = container.getAttribute('data-json-target');
    var target = document.querySelector(targetSel);
    var itemsWrap = container.querySelector('[data-json-list-items]');
    var addBtn = container.querySelector('[data-json-add]');

    function serialize() {
      var rows = Array.prototype.slice.call(itemsWrap.children).map(function (row) {
        var inputs = row.querySelectorAll('input');
        return { name: inputs[0].value.trim(), location: inputs[1].value.trim(), ranking: inputs[2].value.trim() };
      }).filter(function (u) { return u.name; });
      if (target) target.value = JSON.stringify(rows);
    }

    function addRow(u) {
      u = u || {};
      var row = document.createElement('div');
      row.className = 'grid grid-cols-3 gap-2 mb-2';
      row.innerHTML =
        '<input type="text" class="admin-input" placeholder="University name" value="' + escapeAttr(u.name) + '" />' +
        '<input type="text" class="admin-input" placeholder="Location" value="' + escapeAttr(u.location) + '" />' +
        '<div class="flex gap-2"><input type="text" class="admin-input" placeholder="Ranking note" value="' + escapeAttr(u.ranking) + '" />' +
        '<button type="button" class="admin-btn-danger shrink-0" data-remove-row><i class="fa-solid fa-trash"></i></button></div>';
      itemsWrap.appendChild(row);
      row.querySelectorAll('input').forEach(function (i) {
        i.addEventListener('input', serialize);
      });
      row.querySelector('[data-remove-row]').addEventListener('click', function () {
        row.remove();
        serialize();
      });
    }

    try {
      var existing = JSON.parse((target && target.value) || '[]');
      existing.forEach(function (u) {
        addRow(u);
      });
    } catch (e) {}

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addRow({});
      });
    }
  });

  function escapeAttr(str) {
    return (str || '').toString().replace(/"/g, '&quot;');
  }
})();
