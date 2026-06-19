/* ============================================================
   NxtLevelKD — Monthly Reporting
   Frontend-only logic. No backend, no database, no JSON export.
   Persists locally via localStorage, keyed by month + year.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Constants ---------- */
  const CORRECT_PIN = "2063";
  const STORAGE_PREFIX = "nxtlevelkd_v1"; // bump this prefix for future schema changes (V2-ready)

  /* ---------- Helpers ---------- */

  // Turns blank / invalid input into 0. Never lets NaN leak into a calculation.
  function num(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  function formatDollar(value) {
    const safe = Number.isFinite(value) ? value : 0;
    const sign = safe < 0 ? "-" : "";
    return sign + "$" + Math.abs(safe).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function setResultValue(el, value) {
    el.textContent = formatDollar(value);
    el.classList.toggle("negative", value < 0);
  }

  function uid() {
    return "store_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  /* ============================================================
     PIN GATE
     ============================================================ */
  const pinGate = document.getElementById("pin-gate");
  const dashboard = document.getElementById("dashboard");
  const pinDots = document.querySelectorAll("#pin-dots .dot");
  const pinInput = document.getElementById("pin-input");
  const pinKeypad = document.getElementById("pin-keypad");
  const pinError = document.getElementById("pin-error");
  const forgotPinBtn = document.getElementById("forgot-pin");
  const forgotPinMsg = document.getElementById("forgot-pin-msg");
  const lockBtn = document.getElementById("lock-btn");

  let currentPin = "";

  function renderDots() {
    pinDots.forEach((dot, i) => {
      dot.classList.toggle("filled", i < currentPin.length);
      dot.classList.remove("error");
    });
  }

  function showPinError(message) {
    pinError.textContent = message;
    pinDots.forEach((dot) => dot.classList.add("error"));
    setTimeout(() => {
      currentPin = "";
      pinInput.value = "";
      renderDots();
    }, 380);
  }

  function attemptUnlock() {
    if (currentPin.length !== 4) return;
    if (currentPin === CORRECT_PIN) {
      pinError.textContent = "";
      unlockDashboard();
    } else {
      showPinError("Incorrect PIN. Please try again.");
    }
  }

  function unlockDashboard() {
    pinGate.classList.add("hidden");
    dashboard.classList.remove("hidden");
    currentPin = "";
    pinInput.value = "";
    forgotPinMsg.textContent = "";
    renderDots();
    initDashboardIfNeeded();
  }

  function lockDashboard() {
    dashboard.classList.add("hidden");
    pinGate.classList.remove("hidden");
    pinInput.focus();
  }

  // Keypad clicks
  pinKeypad.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (!btn) return;
    const key = btn.dataset.key;

    if (key === "clear") {
      currentPin = "";
      pinError.textContent = "";
      renderDots();
      return;
    }
    if (key === "back") {
      currentPin = currentPin.slice(0, -1);
      pinError.textContent = "";
      renderDots();
      return;
    }
    if (currentPin.length < 4) {
      currentPin += key;
      pinError.textContent = "";
      renderDots();
      if (currentPin.length === 4) {
        setTimeout(attemptUnlock, 120);
      }
    }
  });

  // Hidden input lets a manager type the PIN with a physical keyboard too
  pinInput.addEventListener("input", () => {
    currentPin = pinInput.value.replace(/\D/g, "").slice(0, 4);
    pinInput.value = currentPin;
    pinError.textContent = "";
    renderDots();
    if (currentPin.length === 4) {
      setTimeout(attemptUnlock, 120);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (pinGate.classList.contains("hidden")) return;
    if (/^[0-9]$/.test(e.key) && currentPin.length < 4) {
      currentPin += e.key;
      renderDots();
      if (currentPin.length === 4) setTimeout(attemptUnlock, 120);
    } else if (e.key === "Backspace") {
      currentPin = currentPin.slice(0, -1);
      renderDots();
    } else if (e.key === "Enter") {
      attemptUnlock();
    }
  });

  forgotPinBtn.addEventListener("click", () => {
    forgotPinMsg.textContent = "Please contact the owner/manager for access.";
  });

  lockBtn.addEventListener("click", lockDashboard);

  /* ============================================================
     MONTH / YEAR SELECTORS
     ============================================================ */
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function populateMonthYear() {
    const now = new Date();
    const currentMonthIndex = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    monthSelect.innerHTML = "";
    MONTH_NAMES.forEach((name, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = name;
      monthSelect.appendChild(opt);
    });
    monthSelect.value = String(currentMonthIndex);

    yearSelect.innerHTML = "";
    for (let y = currentYear - 3; y <= currentYear + 2; y++) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    }
    yearSelect.value = String(currentYear);
  }

  function currentPeriodKey() {
    return `${STORAGE_PREFIX}_${yearSelect.value}_${monthSelect.value}`;
  }

  /* ============================================================
     SECTION 1 — MONTHLY REPORTING
     ============================================================ */
  const mTotalSales = document.getElementById("m-total-sales");
  const mTotalCash = document.getElementById("m-total-cash");
  const mCashOut = document.getElementById("m-cash-out");
  const mNoteAmount = document.getElementById("m-note-amount");
  const mNoteText = document.getElementById("m-note-text");
  const mAdditionalNotes = document.getElementById("m-additional-notes");
  const mTotalCashOutResult = document.getElementById("m-total-cash-out");
  const mRemainingResult = document.getElementById("m-remaining");

  function calcMonthly() {
    const totalSales = num(mTotalSales.value);
    const totalCash = num(mTotalCash.value);
    const cashOut = num(mCashOut.value);
    const noteAmount = num(mNoteAmount.value);

    const totalCashOut = totalCash + cashOut + noteAmount;
    const remaining = totalSales - totalCashOut;

    setResultValue(mTotalCashOutResult, totalCashOut);
    setResultValue(mRemainingResult, remaining);

    return { totalSales, totalCash, cashOut, noteAmount, totalCashOut, remaining };
  }

  /* ============================================================
     SECTION 2 — STORE SUMMARY
     ============================================================ */
  const storeList = document.getElementById("store-list");
  const storeTemplate = document.getElementById("store-card-template");
  const addStoreBtn = document.getElementById("add-store-btn");

  function createStoreCard(data) {
    const fragment = storeTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".store-card");
    const id = (data && data.id) || uid();
    card.dataset.storeId = id;

    const nameInput = card.querySelector(".store-name-input");
    const salesInput = card.querySelector(".store-sales");
    const cashInput = card.querySelector(".store-cash");
    const cashOutInput = card.querySelector(".store-cash-out");
    const cashSentInput = card.querySelector(".store-cash-sent");
    const cashTakenInput = card.querySelector(".store-cash-taken");
    const noteInput = card.querySelector(".store-note");
    const cashLeftResult = card.querySelector(".store-cash-left");
    const removeBtn = card.querySelector(".remove-store-btn");

    if (data) {
      nameInput.value = data.name || "";
      salesInput.value = data.sales ?? "";
      cashInput.value = data.cash ?? "";
      cashOutInput.value = data.cashOut ?? "";
      cashSentInput.value = data.cashSent ?? "";
      cashTakenInput.value = data.cashTaken ?? "";
      noteInput.value = data.note || "";
    }

    function recalc() {
      const cash = num(cashInput.value);
      const cashOut = num(cashOutInput.value);
      const cashSent = num(cashSentInput.value);
      const cashTaken = num(cashTakenInput.value);
      const cashLeft = cash - (cashOut + cashSent) + cashTaken;
      setResultValue(cashLeftResult, cashLeft);
      saveState();
      updateChart();
    }

    [nameInput, salesInput, cashInput, cashOutInput, cashSentInput, cashTakenInput, noteInput]
      .forEach((el) => el.addEventListener("input", recalc));

    removeBtn.addEventListener("click", () => {
      card.remove();
      saveState();
      updateChart();
    });

    storeList.appendChild(card);
    recalc();
    return card;
  }

  function getAllStoreCards() {
    return Array.from(storeList.querySelectorAll(".store-card"));
  }

  function readStoreCardData(card) {
    return {
      id: card.dataset.storeId,
      name: card.querySelector(".store-name-input").value,
      sales: card.querySelector(".store-sales").value,
      cash: card.querySelector(".store-cash").value,
      cashOut: card.querySelector(".store-cash-out").value,
      cashSent: card.querySelector(".store-cash-sent").value,
      cashTaken: card.querySelector(".store-cash-taken").value,
      note: card.querySelector(".store-note").value
    };
  }

  addStoreBtn.addEventListener("click", () => {
    createStoreCard(null);
    saveState();
    updateChart();
  });

  /* ============================================================
     CHART — Cash In vs Cash Out (Chart.js, live updating)
     ============================================================ */
  let cashChart = null;

  function computeChartTotals() {
    const monthly = calcMonthly();

    let storeCashIn = 0;
    let storeCashOut = 0;

    getAllStoreCards().forEach((card) => {
      const cash = num(card.querySelector(".store-cash").value);
      const cashOut = num(card.querySelector(".store-cash-out").value);
      const cashSent = num(card.querySelector(".store-cash-sent").value);
      storeCashIn += cash;
      storeCashOut += cashOut + cashSent;
    });

    // Cash In = monthly total cash + store-level cash collected
    // Cash Out = monthly cash-out/expenses + store-level cash-out + cash sent to other stores
    const cashIn = monthly.totalCash + storeCashIn;
    const cashOut = monthly.totalCashOut + storeCashOut;

    return { cashIn, cashOut };
  }

  function updateChart() {
    const { cashIn, cashOut } = computeChartTotals();
    if (!cashChart) return;
    cashChart.data.datasets[0].data = [cashIn, cashOut];
    cashChart.update();
  }

  function initChart() {
    const ctx = document.getElementById("cash-chart").getContext("2d");

    // Resolve CSS custom properties to actual color values for Chart.js
    const styles = getComputedStyle(document.documentElement);
    const emerald = styles.getPropertyValue("--emerald-accent").trim();
    const gold = styles.getPropertyValue("--gold").trim();
    const ink = styles.getPropertyValue("--ink").trim();

    cashChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Cash In", "Cash Out"],
        datasets: [{
          label: "Amount ($)",
          data: [0, 0],
          backgroundColor: [emerald, gold],
          borderRadius: 8,
          maxBarThickness: 90
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => formatDollar(item.raw)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: ink,
              callback: (value) => "$" + value.toLocaleString("en-US")
            },
            grid: { color: "rgba(11,61,46,0.08)" }
          },
          x: {
            ticks: { color: ink, font: { weight: 600 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  /* ============================================================
     PERSISTENCE — localStorage, keyed by month + year
     Backend-ready: this save/load layer is the only place that
     would need to change to swap localStorage for a real API in V2.
     ============================================================ */
  function saveState() {
    try {
      const state = {
        monthly: {
          totalSales: mTotalSales.value,
          totalCash: mTotalCash.value,
          cashOut: mCashOut.value,
          noteAmount: mNoteAmount.value,
          noteText: mNoteText.value,
          additionalNotes: mAdditionalNotes.value
        },
        stores: getAllStoreCards().map(readStoreCardData)
      };
      localStorage.setItem(currentPeriodKey(), JSON.stringify(state));
    } catch (err) {
      // localStorage may be unavailable (e.g. private browsing) — fail silently,
      // the dashboard still works for the current session.
      console.warn("NxtLevelKD: could not save to localStorage.", err);
    }
  }

  function clearMonthlyFields() {
    mTotalSales.value = "";
    mTotalCash.value = "";
    mCashOut.value = "";
    mNoteAmount.value = "";
    mNoteText.value = "";
    mAdditionalNotes.value = "";
  }

  function loadState() {
    let state = null;
    try {
      const raw = localStorage.getItem(currentPeriodKey());
      if (raw) state = JSON.parse(raw);
    } catch (err) {
      console.warn("NxtLevelKD: could not read from localStorage.", err);
    }

    clearMonthlyFields();
    storeList.innerHTML = "";

    if (state && state.monthly) {
      mTotalSales.value = state.monthly.totalSales || "";
      mTotalCash.value = state.monthly.totalCash || "";
      mCashOut.value = state.monthly.cashOut || "";
      mNoteAmount.value = state.monthly.noteAmount || "";
      mNoteText.value = state.monthly.noteText || "";
      mAdditionalNotes.value = state.monthly.additionalNotes || "";
    }

    if (state && Array.isArray(state.stores) && state.stores.length > 0) {
      state.stores.forEach((storeData) => createStoreCard(storeData));
    } else {
      // Always show at least one blank store entry to start with
      createStoreCard(null);
    }

    calcMonthly();
    updateChart();
  }

  /* ============================================================
     RESET / CLEAR
     ============================================================ */
  const resetBtn = document.getElementById("reset-btn");
  const confirmModal = document.getElementById("confirm-modal");
  const confirmCancel = document.getElementById("confirm-cancel");
  const confirmClear = document.getElementById("confirm-clear");

  resetBtn.addEventListener("click", () => {
    confirmModal.classList.remove("hidden");
  });

  confirmCancel.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
  });

  confirmClear.addEventListener("click", () => {
    try {
      localStorage.removeItem(currentPeriodKey());
    } catch (err) {
      console.warn("NxtLevelKD: could not clear localStorage.", err);
    }
    clearMonthlyFields();
    storeList.innerHTML = "";
    createStoreCard(null);
    calcMonthly();
    updateChart();
    confirmModal.classList.add("hidden");
  });

  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) confirmModal.classList.add("hidden");
  });

  /* ============================================================
     WIRE UP MONTHLY FIELD LISTENERS
     ============================================================ */
  [mTotalSales, mTotalCash, mCashOut, mNoteAmount, mNoteText, mAdditionalNotes].forEach((el) => {
    el.addEventListener("input", () => {
      calcMonthly();
      saveState();
      updateChart();
    });
  });

  monthSelect.addEventListener("change", loadState);
  yearSelect.addEventListener("change", loadState);

  /* ============================================================
     INIT
     ============================================================ */
  let dashboardInitialized = false;

  function initDashboardIfNeeded() {
    if (dashboardInitialized) return;
    dashboardInitialized = true;
    populateMonthYear();
    initChart();
    loadState();
  }

  // Focus the hidden PIN input immediately so managers can type without clicking
  pinInput.focus();

})();
