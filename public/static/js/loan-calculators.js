// =====================================================================
// Education Loan Calculators — all math runs client-side.
//   A. EMI Calculator (reducing balance + moratorium capitalisation)
//   B. Flat Rate vs Reducing Rate comparison
//   C. Eligibility & Moratorium Calculator (simple interest during study)
// Uses Chart.js for visualisations and jsPDF (+ autotable) for the
// downloadable summary. Degrades gracefully if those CDN scripts fail
// to load (buttons just won't produce a chart/PDF, everything else works).
// =====================================================================
(function () {
  'use strict';

  function formatINR(num) {
    if (!isFinite(num)) return '₹0';
    var rounded = Math.round(num);
    return '₹' + rounded.toLocaleString('en-IN');
  }

  function $(id) {
    return document.getElementById(id);
  }

  // Sync slider <-> number pairs whose data-calc-slider id starts with the
  // given prefix (e.g. "emi-", "cmp-", "elg-") so each calculator only
  // wires its own fields — avoids triple-firing when 3 calculators share
  // one page.
  function wireSliderPairs(prefix, onChange) {
    var sliders = document.querySelectorAll('[data-calc-slider^="' + prefix + '"]');
    sliders.forEach(function (slider) {
      var key = slider.getAttribute('data-calc-slider');
      var number = document.querySelector('[data-calc-number="' + key + '"]');
      if (!number) return;

      slider.addEventListener('input', function () {
        number.value = slider.value;
        onChange();
      });
      number.addEventListener('input', function () {
        var v = parseFloat(number.value);
        if (isNaN(v)) return;
        if (v < parseFloat(slider.min)) v = parseFloat(slider.min);
        if (v > parseFloat(slider.max)) v = parseFloat(slider.max);
        slider.value = v;
        onChange();
      });
    });
  }

  function getVal(id) {
    var el = $(id);
    return el ? parseFloat(el.value) || 0 : 0;
  }

  // -------------------------------------------------------------
  // Core EMI math (reducing balance): EMI = P*r*(1+r)^n / ((1+r)^n - 1)
  // -------------------------------------------------------------
  function calcEMI(principal, annualRatePct, months) {
    var r = annualRatePct / 12 / 100;
    if (r === 0) return principal / months;
    var factor = Math.pow(1 + r, months);
    return (principal * r * factor) / (factor - 1);
  }

  function buildAmortization(principal, annualRatePct, months) {
    var r = annualRatePct / 12 / 100;
    var emi = calcEMI(principal, annualRatePct, months);
    var balance = principal;
    var rows = [];
    for (var m = 1; m <= months; m++) {
      var interest = balance * r;
      var principalPaid = emi - interest;
      var closing = balance - principalPaid;
      if (m === months) closing = 0; // kill floating point dust on last row
      rows.push({
        month: m,
        opening: balance,
        emi: emi,
        principal: principalPaid,
        interest: interest,
        closing: Math.max(closing, 0)
      });
      balance = closing;
    }
    return { emi: emi, rows: rows };
  }

  // =================================================================
  // CALCULATOR A — EMI Calculator with moratorium capitalisation
  // =================================================================
  var emiDonutChart = null;

  function runEmiCalculator() {
    var amount = getVal('emi-amount');
    var rate = getVal('emi-rate');
    var tenureYears = getVal('emi-tenure');
    var studyMonths = getVal('emi-study');
    var graceMonths = getVal('emi-grace');

    var moratoriumMonths = studyMonths + graceMonths;
    var monthlyRate = rate / 12 / 100;

    // Simple interest accrues during moratorium and is added to principal
    // (standard "capitalisation" practice most Indian lenders follow).
    var moratoriumInterest = amount * monthlyRate * moratoriumMonths;
    var capitalizedPrincipal = amount + moratoriumInterest;

    var repaymentMonths = tenureYears * 12;
    var amort = buildAmortization(capitalizedPrincipal, rate, repaymentMonths);
    var totalPayable = amort.emi * repaymentMonths;
    var totalInterest = totalPayable - capitalizedPrincipal;

    setText('emi-monthly', formatINR(amort.emi));
    setText('emi-total-interest', formatINR(totalInterest));
    setText('emi-moratorium-interest', formatINR(moratoriumInterest));
    setText('emi-total-payable', formatINR(totalPayable));

    renderEmiDonut(amount, totalInterest);
    renderSchedule(amort.rows);

    // Store for PDF / enquiry prefill
    window.__emiResult = {
      amount: amount,
      rate: rate,
      tenureYears: tenureYears,
      studyMonths: studyMonths,
      graceMonths: graceMonths,
      moratoriumInterest: moratoriumInterest,
      monthlyEmi: amort.emi,
      totalInterest: totalInterest,
      totalPayable: totalPayable,
      rows: amort.rows
    };

    var ctaBtn = $('emi-cta');
    if (ctaBtn) {
      ctaBtn.setAttribute(
        'data-message',
        'I calculated an EMI of ' + formatINR(amort.emi) + '/month for a loan of ' + formatINR(amount) + '. I would like free assistance with my education loan application.'
      );
      ctaBtn.setAttribute(
        'data-extra',
        JSON.stringify({
          calculator: 'emi',
          loanAmount: amount,
          rate: rate,
          tenureYears: tenureYears,
          monthlyEmi: Math.round(amort.emi),
          totalInterest: Math.round(totalInterest)
        })
      );
    }
  }

  function renderEmiDonut(principal, interest) {
    var canvas = $('emi-donut-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    var ctx = canvas.getContext('2d');
    if (emiDonutChart) emiDonutChart.destroy();
    emiDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal', 'Interest'],
        datasets: [
          {
            data: [Math.round(principal), Math.round(interest)],
            backgroundColor: ['#0b2559', '#f70009'],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (item) {
                return item.label + ': ' + formatINR(item.raw);
              }
            }
          }
        }
      }
    });
  }

  function renderSchedule(rows) {
    var body = $('emi-schedule-body');
    if (!body) return;
    var html = '';
    rows.forEach(function (row) {
      html +=
        '<tr class="border-b border-slate-50">' +
        '<td class="py-2 pr-4">' + row.month + '</td>' +
        '<td class="py-2 pr-4">' + formatINR(row.opening) + '</td>' +
        '<td class="py-2 pr-4">' + formatINR(row.emi) + '</td>' +
        '<td class="py-2 pr-4">' + formatINR(row.principal) + '</td>' +
        '<td class="py-2 pr-4">' + formatINR(row.interest) + '</td>' +
        '<td class="py-2 pr-4">' + formatINR(row.closing) + '</td>' +
        '</tr>';
    });
    body.innerHTML = html;
  }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  var scheduleToggle = $('emi-toggle-schedule');
  if (scheduleToggle) {
    scheduleToggle.addEventListener('click', function () {
      var wrap = $('emi-schedule-wrap');
      var isHidden = wrap.classList.contains('hidden');
      wrap.classList.toggle('hidden');
      scheduleToggle.innerHTML = isHidden
        ? 'Hide Schedule <i class="fa-solid fa-chevron-up ml-1"></i>'
        : 'Show Schedule <i class="fa-solid fa-chevron-down ml-1"></i>';
    });
  }

  var pdfBtn = $('emi-download-pdf');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function () {
      if (typeof window.jspdf === 'undefined' || !window.__emiResult) {
        alert('PDF export is unavailable right now — please try again in a moment.');
        return;
      }
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF();
      var r = window.__emiResult;

      doc.setFontSize(16);
      doc.setTextColor(11, 37, 89);
      doc.text('1st Choice IELTS & Immigration', 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text('Education Loan EMI Summary', 14, 26);

      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      var lines = [
        'Loan Amount: ' + formatINR(r.amount),
        'Interest Rate: ' + r.rate + '% p.a.',
        'Repayment Tenure: ' + r.tenureYears + ' years',
        'Study Period: ' + r.studyMonths + ' months, Grace: ' + r.graceMonths + ' months',
        'Interest Accrued During Moratorium: ' + formatINR(r.moratoriumInterest),
        'Monthly EMI: ' + formatINR(r.monthlyEmi),
        'Total Interest Payable: ' + formatINR(r.totalInterest),
        'Total Payable: ' + formatINR(r.totalPayable)
      ];
      var y = 36;
      lines.forEach(function (line) {
        doc.text(line, 14, y);
        y += 7;
      });

      if (doc.autoTable) {
        var body = r.rows.slice(0, 60).map(function (row) {
          return [
            row.month,
            formatINR(row.opening),
            formatINR(row.emi),
            formatINR(row.principal),
            formatINR(row.interest),
            formatINR(row.closing)
          ];
        });
        doc.autoTable({
          startY: y + 4,
          head: [['Month', 'Opening', 'EMI', 'Principal', 'Interest', 'Closing']],
          body: body,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [11, 37, 89] }
        });
      }

      doc.save('education-loan-emi-summary.pdf');
    });
  }

  // =================================================================
  // CALCULATOR B — Flat Rate vs Reducing Rate
  // =================================================================
  var cmpBarChart = null;

  function runComparisonCalculator() {
    var amount = getVal('cmp-amount');
    var rate = getVal('cmp-rate');
    var tenureYears = getVal('cmp-tenure');
    var months = tenureYears * 12;

    // Flat rate: interest is calculated on the full principal for the
    // entire tenure, then EMI = (P + totalInterest) / months.
    var flatTotalInterest = (amount * rate * tenureYears) / 100;
    var flatEmi = (amount + flatTotalInterest) / months;

    // Reducing balance via the standard EMI formula.
    var reducingEmi = calcEMI(amount, rate, months);
    var reducingTotalPayable = reducingEmi * months;
    var reducingTotalInterest = reducingTotalPayable - amount;

    var savings = flatTotalInterest - reducingTotalInterest;

    setText('cmp-flat-emi', formatINR(flatEmi));
    setText('cmp-flat-interest', formatINR(flatTotalInterest));
    setText('cmp-reducing-emi', formatINR(reducingEmi));
    setText('cmp-reducing-interest', formatINR(reducingTotalInterest));
    setText('cmp-savings', formatINR(Math.max(savings, 0)));

    renderComparisonChart(flatTotalInterest, reducingTotalInterest);
  }

  function renderComparisonChart(flatInterest, reducingInterest) {
    var canvas = $('cmp-bar-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    var ctx = canvas.getContext('2d');
    if (cmpBarChart) cmpBarChart.destroy();
    cmpBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Flat Rate', 'Reducing Rate'],
        datasets: [
          {
            label: 'Total Interest',
            data: [Math.round(flatInterest), Math.round(reducingInterest)],
            backgroundColor: ['#94a3b8', '#16a34a'],
            borderRadius: 8,
            maxBarThickness: 80
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (item) {
                return formatINR(item.raw);
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              callback: function (v) {
                return '₹' + (v / 100000).toFixed(1) + 'L';
              }
            }
          }
        }
      }
    });
  }

  // =================================================================
  // CALCULATOR C — Eligibility & Moratorium Calculator
  // =================================================================
  function getCollateralValue() {
    var checked = document.querySelector('input[name="elg-collateral"]:checked');
    return checked ? checked.value : 'no';
  }

  function runEligibilityCalculator() {
    var courseFee = getVal('elg-fee');
    var livingCost = getVal('elg-living');
    var durationYears = getVal('elg-duration');
    var hasCollateral = getCollateralValue() === 'yes';
    var monthlyIncome = getVal('elg-income');
    var rate = getVal('elg-rate');
    var tenureYears = getVal('elg-tenure');

    var totalCost = courseFee + livingCost * durationYears;

    // Eligibility heuristic:
    //  - With collateral: lenders typically fund up to 100% of total cost.
    //  - Without collateral: capped at ~85% of total cost AND bounded by
    //    the co-applicant's repayment capacity (~55% of monthly income
    //    assumed available for EMI, standard FOIR-style approximation).
    var costBasedEligibility = hasCollateral ? totalCost : totalCost * 0.85;

    var maxAffordableEmi = monthlyIncome * 0.55;
    var repaymentMonths = tenureYears * 12;
    // Back-solve max principal serviceable by maxAffordableEmi at given rate
    var monthlyRate = rate / 12 / 100;
    var incomeBasedEligibility;
    if (monthlyRate === 0) {
      incomeBasedEligibility = maxAffordableEmi * repaymentMonths;
    } else {
      var factor = Math.pow(1 + monthlyRate, repaymentMonths);
      incomeBasedEligibility = (maxAffordableEmi * (factor - 1)) / (monthlyRate * factor);
    }

    var eligibility = hasCollateral
      ? costBasedEligibility
      : Math.min(costBasedEligibility, incomeBasedEligibility);
    eligibility = Math.max(eligibility, 0);

    // Simple interest during study period (moratorium), on the eligible amount
    var studyMonths = durationYears * 12;
    var moratoriumInterest = (eligibility * rate * studyMonths) / (12 * 100);
    var outstandingAtRepaymentStart = eligibility + moratoriumInterest;

    var emi = calcEMI(outstandingAtRepaymentStart, rate, repaymentMonths);

    setText('elg-eligible', formatINR(eligibility));
    setText('elg-moratorium-interest', formatINR(moratoriumInterest));
    setText('elg-outstanding', formatINR(outstandingAtRepaymentStart));
    setText('elg-emi', formatINR(emi));

    var ctaBtn = $('elg-cta');
    if (ctaBtn) {
      ctaBtn.setAttribute(
        'data-message',
        'Based on the eligibility calculator, I may be eligible for ~' + formatINR(eligibility) + ' with an estimated EMI of ' + formatINR(emi) + '/month. I would like free assistance with my education loan.'
      );
      ctaBtn.setAttribute(
        'data-extra',
        JSON.stringify({
          calculator: 'eligibility',
          courseFee: courseFee,
          livingCost: livingCost,
          durationYears: durationYears,
          hasCollateral: hasCollateral,
          monthlyIncome: monthlyIncome,
          estimatedEligibility: Math.round(eligibility),
          estimatedEmi: Math.round(emi)
        })
      );
    }
  }

  // -------------------------------------------------------------
  // Wire everything up once the DOM is ready (only on the Education
  // Loan page — these elements won't exist elsewhere).
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    if ($('emi-amount')) {
      wireSliderPairs('emi-', runEmiCalculator);
      runEmiCalculator();
    }
    if ($('cmp-amount')) {
      wireSliderPairs('cmp-', runComparisonCalculator);
      runComparisonCalculator();
    }
    if ($('elg-fee')) {
      wireSliderPairs('elg-', runEligibilityCalculator);
      document.querySelectorAll('input[name="elg-collateral"]').forEach(function (radio) {
        radio.addEventListener('change', runEligibilityCalculator);
      });
      runEligibilityCalculator();
    }
  });
})();
