// =====================================================================
// IELTS <-> PTE Academic <-> approximate CLB score converter.
// No build step — vanilla JS, loaded only on /score-charts.
// =====================================================================
(function () {
  'use strict';

  // PTE Academic -> IELTS official concordance (ascending by PTE score)
  var PTE_TO_IELTS = [
    { pte: 24, ielts: 4.5 },
    { pte: 31, ielts: 5.0 },
    { pte: 39, ielts: 5.5 },
    { pte: 47, ielts: 6.0 },
    { pte: 55, ielts: 6.5 },
    { pte: 63, ielts: 7.0 },
    { pte: 71, ielts: 7.5 },
    { pte: 79, ielts: 8.0 },
    { pte: 86, ielts: 8.5 },
    { pte: 90, ielts: 9.0 }
  ];

  // IELTS (GT) -> CLB — approximate single-number mapping using the overall
  // band (actual CLB requires per-skill IELTS GT or PTE Core scores; this is
  // a reasonable single-score approximation for the quick-converter tool).
  var IELTS_TO_CLB = [
    { ielts: 4.0, clb: 4 },
    { ielts: 4.5, clb: 4 },
    { ielts: 5.0, clb: 5 },
    { ielts: 5.5, clb: 6 },
    { ielts: 6.0, clb: 7 },
    { ielts: 6.5, clb: 8 },
    { ielts: 7.0, clb: 9 },
    { ielts: 7.5, clb: 9 },
    { ielts: 8.0, clb: 10 },
    { ielts: 8.5, clb: 10 },
    { ielts: 9.0, clb: 10 }
  ];

  function ieltsFromPte(pte) {
    if (pte < PTE_TO_IELTS[0].pte) return null;
    for (var i = PTE_TO_IELTS.length - 1; i >= 0; i--) {
      if (pte >= PTE_TO_IELTS[i].pte) return PTE_TO_IELTS[i].ielts;
    }
    return null;
  }

  function pteFromIelts(ielts) {
    // find nearest band at or below, then return its minimum PTE score
    var match = null;
    for (var i = 0; i < PTE_TO_IELTS.length; i++) {
      if (PTE_TO_IELTS[i].ielts <= ielts) match = PTE_TO_IELTS[i];
    }
    return match ? match.pte : PTE_TO_IELTS[0].pte;
  }

  function clbFromIelts(ielts) {
    var match = null;
    for (var i = 0; i < IELTS_TO_CLB.length; i++) {
      if (IELTS_TO_CLB[i].ielts <= ielts) match = IELTS_TO_CLB[i];
    }
    return match ? match.clb : null;
  }

  function roundToHalf(n) {
    return Math.round(n * 2) / 2;
  }

  var ieltsInput = document.querySelector('[data-converter-input="ielts"]');
  var pteInput = document.querySelector('[data-converter-input="pte"]');
  var resultBox = document.getElementById('converter-result');
  var resultIelts = document.getElementById('result-ielts');
  var resultPte = document.getElementById('result-pte');
  var resultClb = document.getElementById('result-clb');

  if (!ieltsInput || !pteInput || !resultBox) return;

  function showResult(ielts, pte, clb) {
    resultBox.classList.remove('hidden');
    resultIelts.textContent = ielts !== null ? ielts.toFixed(1) : '-';
    resultPte.textContent = pte !== null ? pte : '-';
    resultClb.textContent = clb !== null ? 'CLB ' + clb : '-';
  }

  ieltsInput.addEventListener('input', function () {
    var val = parseFloat(ieltsInput.value);
    if (isNaN(val) || val < 4 || val > 9) {
      resultBox.classList.add('hidden');
      return;
    }
    val = roundToHalf(val);
    pteInput.value = '';
    var pte = pteFromIelts(val);
    var clb = clbFromIelts(val);
    showResult(val, pte, clb);
  });

  pteInput.addEventListener('input', function () {
    var val = parseInt(pteInput.value, 10);
    if (isNaN(val) || val < 24 || val > 90) {
      resultBox.classList.add('hidden');
      return;
    }
    ieltsInput.value = '';
    var ielts = ieltsFromPte(val);
    var clb = ielts !== null ? clbFromIelts(ielts) : null;
    showResult(ielts, val, clb);
  });
})();
