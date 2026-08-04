(function () {
  "use strict";

  const LANDING_ID = "landing-machu-picchu-tours";
  const LANDING_NAME = "Machu Picchu + Tours in Peru";
  const DRAFT_KEY = "mct_landing_draft_machu-picchu-y-tours-peru-v5";
  const DRAFT_TTL_MS = 90 * 60 * 1000;
  const UPSELL_SESSION_KEY = "mpt_upsell_shown";
  const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

  const state = {
    data: null,
    adults: 1,
    children: 0,
    mainProduct: { selected: true, date: null, mealOptionId: "no-meal" },
    addons: {},
    coupon: null,
    couponDraftCode: "",
    couponFeedback: { message: "", type: "" },
    upsellModalShown: false,
    restoredFromDraft: false,
    pickers: {},
    activeModal: null,
    lastReservation: null
  };

  // ---------- Generic helpers ----------

  function getSiteBasePath() {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    if (window.location.hostname.includes("github.io") && pathParts.length) {
      return `/${pathParts[0]}/`;
    }
    return "/";
  }

  function toRelativeAssetPath(value, basePath) {
    if (!value || !basePath || basePath === "/") return value;
    if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(value)) return value;
    if (value.startsWith("/")) return `${basePath}${value.replace(/^\/+/, "")}`.replace(/([^:]\/)\/{2,}/g, "$1");
    return value;
  }

  async function loadLandingComponent(componentName, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const basePath = getSiteBasePath();
    const componentUrl = `${basePath}components/${componentName}.html`.replace(/([^:]\/)\/{2,}/g, "$1");
    try {
      const response = await fetch(componentUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      target.innerHTML = await response.text();
      if (basePath !== "/") {
        target.querySelectorAll("img[src], a[href]").forEach((node) => {
          const attr = node.tagName.toLowerCase() === "img" ? "src" : "href";
          node.setAttribute(attr, toRelativeAssetPath(node.getAttribute(attr), basePath));
        });
      }
    } catch (error) {
      console.warn(`Could not load component ${componentName}:`, error);
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatCurrency(value, currency) {
    return `${currency} ${formatMoney(value)}`;
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function qtyOptions(min, max, selected) {
    let html = "";
    for (let n = min; n <= max; n += 1) {
      html += `<option value="${n}" ${n === selected ? "selected" : ""}>${n}</option>`;
    }
    return html;
  }

  function parseISODate(value) {
    if (!value) return null;
    const parts = String(value).split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDateSpanish(value) {
    const date = parseISODate(value);
    if (!date) return "date not selected";
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  function daysBetween(dateAStr, dateBStr) {
    const a = parseISODate(dateAStr);
    const b = parseISODate(dateBStr);
    if (!a || !b) return null;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function dateInputId(tourId) {
    return `mpt-date-${tourId}`;
  }

  function errorId(tourId) {
    return `mpt-error-${tourId}`;
  }

  function setFieldError(tourId, message) {
    const el = document.getElementById(errorId(tourId));
    if (el) el.textContent = message || "";
  }

  function clearAllFieldErrors() {
    document.querySelectorAll(".mpt-field-error").forEach((el) => {
      el.textContent = "";
    });
  }

  // ---------- Attribution / tracking ----------

  function captureAttribution() {
    const params = new URLSearchParams(window.location.search);
    const current = {};
    ATTRIBUTION_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) current[key] = value;
    });
    current.referrer = document.referrer || "";
    current.landing_page = window.location.pathname;

    let firstTouch = null;
    try {
      firstTouch = JSON.parse(localStorage.getItem("mct_first_touch") || "null");
    } catch (error) {
      firstTouch = null;
    }
    if (!firstTouch) {
      firstTouch = { ...current, first_touch_source: current.utm_source || (document.referrer ? "referral" : "direct") };
      try {
        localStorage.setItem("mct_first_touch", JSON.stringify(firstTouch));
      } catch (error) {
        /* storage unavailable */
      }
    }

    const lastTouch = { ...current, last_touch_source: current.utm_source || (document.referrer ? "referral" : "direct") };
    try {
      sessionStorage.setItem("mct_last_touch", JSON.stringify(lastTouch));
    } catch (error) {
      /* storage unavailable */
    }
  }

  function getAttribution() {
    let firstTouch = {};
    let lastTouch = {};
    try {
      firstTouch = JSON.parse(localStorage.getItem("mct_first_touch") || "{}");
    } catch (error) {
      firstTouch = {};
    }
    try {
      lastTouch = JSON.parse(sessionStorage.getItem("mct_last_touch") || "{}");
    } catch (error) {
      lastTouch = {};
    }
    return {
      utm_source: lastTouch.utm_source || "",
      utm_medium: lastTouch.utm_medium || "",
      utm_campaign: lastTouch.utm_campaign || "",
      utm_content: lastTouch.utm_content || "",
      utm_term: lastTouch.utm_term || "",
      fbclid: lastTouch.fbclid || "",
      gclid: lastTouch.gclid || "",
      referrer: lastTouch.referrer || "",
      landing_page: lastTouch.landing_page || "",
      first_touch_source: firstTouch.first_touch_source || "",
      last_touch_source: lastTouch.last_touch_source || ""
    };
  }

  function trackLandingEvent(eventName, params, options) {
    if (typeof window.mctTrack !== "function") return;
    window.mctTrack(eventName, {
      landing_id: LANDING_ID,
      landing_name: LANDING_NAME,
      event_category: "landing",
      ...getAttribution(),
      ...(params || {})
    }, options || {});
  }

  // ---------- Reservation code (mirrors product.js CUZ + 6-hex FNV pattern) ----------

  function buildReservationCodeCandidate(nonce) {
    const epochMs = Date.now();
    const performanceMicros = Math.floor((window.performance?.now?.() || 0) * 1000);
    const source = `${epochMs}:${performanceMicros}:${nonce}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    const hex = (hash & 0xffffff).toString(16).toUpperCase().padStart(6, "0");
    return `CUZ${hex}`;
  }

  function generateReservationCode() {
    let nonce = 0;
    let code = buildReservationCodeCandidate(nonce);
    while (nonce < 32 && localStorage.getItem(`mct_landing_reservation_${code}`)) {
      nonce += 1;
      code = buildReservationCodeCandidate(nonce);
    }
    return code;
  }

  // ---------- Draft persistence ----------

  function persistDraftState() {
    try {
      const snapshot = {
        updatedAt: Date.now(),
        adults: state.adults,
        children: state.children,
        mainProduct: state.mainProduct,
        addons: state.addons,
        coupon: state.coupon,
        couponDraftCode: state.couponDraftCode
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      /* storage unavailable */
    }
  }

  function restoreDraftIfAny() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const snapshot = JSON.parse(raw);
      if (!snapshot?.updatedAt || Date.now() - snapshot.updatedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (typeof snapshot.adults === "number") state.adults = snapshot.adults;
      if (typeof snapshot.children === "number") state.children = snapshot.children;
      if (snapshot.mainProduct) state.mainProduct = { ...state.mainProduct, ...snapshot.mainProduct };
      Object.keys(snapshot.addons || {}).forEach((id) => {
        if (state.addons[id]) state.addons[id] = { ...state.addons[id], ...snapshot.addons[id] };
      });
      if (snapshot.coupon) { state.coupon = snapshot.coupon; state.couponDraftCode = snapshot.coupon.code || ""; }
      else if (snapshot.couponDraftCode) state.couponDraftCode = snapshot.couponDraftCode;
      state.restoredFromDraft = true;
    } catch (error) {
      /* corrupted draft, ignore */
    }
  }

  function clearDraftState() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      /* storage unavailable */
    }
  }

  // ---------- Core reusable business logic ----------

  function getSelectedToursWithDates() {
    const list = [];
    if (state.mainProduct.selected) {
      list.push({ id: state.data.mainProduct.id, origin: state.data.mainProduct.origin, date: state.mainProduct.date });
    }
    Object.keys(state.addons).forEach((id) => {
      const sel = state.addons[id];
      if (!sel.selected) return;
      const addon = state.data.addons.find((a) => a.id === id);
      list.push({ id, origin: addon?.origin || "", date: sel.date });
    });
    return list;
  }

  /**
   * Single source of truth for the Lima/Ica <-> Cusco transfer rule.
   * Order-independent: checks every pair of selected+dated tours regardless
   * of which one the user added first.
   */
  function validateDestinationTransition(selectedTours) {
    const minGap = Number(state.data?.minGapDaysBetweenGroups || 1);
    const dated = (selectedTours || []).filter((t) => t.date);
    for (let i = 0; i < dated.length; i += 1) {
      for (let j = i + 1; j < dated.length; j += 1) {
        const a = dated[i];
        const b = dated[j];
        if (!a.origin || !b.origin || a.origin === b.origin) continue;
        const diff = Math.abs(daysBetween(a.date, b.date));
        if (diff !== null && diff < minGap + 1) {
          return {
            valid: false,
            message: "Travel between Lima/Ica and Cusco requires at least one transfer day. Select a later date to continue.",
            conflictingIds: [a.id, b.id]
          };
        }
      }
    }
    return { valid: true, message: "", conflictingIds: [] };
  }

  function checkOperationalWarnings(selectedTours) {
    const warnings = [];
    const dated = (selectedTours || []).filter((t) => t.date);
    (state.data?.operationalWarnings || []).forEach((rule) => {
      const first = dated.find((t) => t.id === rule.condition.firstServiceId);
      const second = dated.find((t) => t.id === rule.condition.secondServiceId);
      if (!first || !second) return;
      const diff = daysBetween(first.date, second.date);
      if (diff === rule.condition.daysApart) {
        warnings.push({ id: rule.id, message: rule.message });
      }
    });
    return warnings;
  }

  function validateAllDates(options) {
    const silent = Boolean(options?.silent);
    clearAllFieldErrors();
    let valid = true;
    const selectedTours = getSelectedToursWithDates();
    const todayStr = formatDateISO(new Date());

    selectedTours.forEach((t) => {
      if (!t.date) {
        valid = false;
        if (!silent) setFieldError(t.id, "Select a date to continue.");
      } else if (t.date < todayStr) {
        valid = false;
        if (!silent) setFieldError(t.id, "The date cannot be earlier than today.");
      }
    });

    const dated = selectedTours.filter((t) => t.date);
    const byDate = {};
    dated.forEach((t) => {
      byDate[t.date] = byDate[t.date] || [];
      byDate[t.date].push(t.id);
    });
    Object.values(byDate).forEach((ids) => {
      if (ids.length > 1) {
        valid = false;
        if (!silent) ids.forEach((id) => setFieldError(id, "Two tours cannot be scheduled for the same date."));
      }
    });

    const transition = validateDestinationTransition(dated);
    if (!transition.valid) {
      valid = false;
      if (!silent) transition.conflictingIds.forEach((id) => setFieldError(id, transition.message));
    }

    renderOperationalWarnings(checkOperationalWarnings(dated));
    return valid;
  }

  /**
   * Single source of truth for all pricing. Every price shown on screen
   * (cards, summary, mobile bar, WhatsApp message, reservation payload)
   * must be derived from this function's output, never computed locally.
   */
  function calculateBookingSummary() {
    const data = state.data;
    const currency = data.currency;
    const totalPax = state.adults + state.children;
    const lines = [];
    let subtotal = 0;

    if (state.mainProduct.selected) {
      const p = data.mainProduct;
      const childDiscount = Number(p.childPricing?.discountAmount || 0);
      const childPrice = Math.max(0, p.adultPrice - childDiscount);
      const adultsTotal = state.adults * p.adultPrice;
      const childrenTotal = state.children * childPrice;
      const meal = (p.mealOptions || []).find((m) => m.id === state.mainProduct.mealOptionId) || p.mealOptions[0];
      const mealTotal = (meal?.pricePerPerson || 0) * totalPax;
      const lineTotal = adultsTotal + childrenTotal + mealTotal;
      subtotal += lineTotal;
      lines.push({
        id: p.id,
        title: p.title,
        date: state.mainProduct.date,
        adultPrice: p.adultPrice,
        childPrice,
        mealLabel: meal && meal.pricePerPerson > 0 ? meal.label : null,
        mealTotal,
        lineTotal
      });
    }

    (data.addons || []).forEach((addon) => {
      const sel = state.addons[addon.id];
      if (!sel || !sel.selected) return;
      const baseTotal = addon.pricePerPerson * totalPax;
      let extrasTotal = 0;
      const extraLabels = [];
      (addon.extras || []).forEach((extra) => {
        if (sel.extras && sel.extras[extra.id]) {
          extrasTotal += extra.pricePerPerson * totalPax;
          extraLabels.push(extra.label);
        }
      });
      const lineTotal = baseTotal + extrasTotal;
      subtotal += lineTotal;
      lines.push({
        id: addon.id,
        title: addon.title,
        date: sel.date,
        pricePerPerson: addon.pricePerPerson,
        extras: extraLabels,
        extrasTotal,
        lineTotal
      });
    });

    let discount = 0;
    if (state.coupon) {
      if (state.coupon.type === "percent") discount = subtotal * (Number(state.coupon.value || 0) / 100);
      else if (state.coupon.type === "fixed") discount = Math.min(subtotal, Number(state.coupon.value || 0));
    }
    discount = round2(discount);
    const total = round2(Math.max(0, subtotal - discount));

    const selectedTours = getSelectedToursWithDates();
    const dated = selectedTours.filter((t) => t.date);

    return {
      currency,
      adults: state.adults,
      children: state.children,
      lines,
      subtotal: round2(subtotal),
      discount,
      total,
      transition: validateDestinationTransition(dated),
      warnings: checkOperationalWarnings(dated)
    };
  }

  /**
   * The shared MyCuscoTripApiClient talks to a live Google Apps Script backend
   * on this site (see assets/data/backend-config.json) and has no internal
   * timeout. Wrap every call from this landing page so a slow/unreachable
   * backend degrades to the local fallback instead of freezing the UI.
   */
  function withTimeout(promise, ms) {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, ms);
      Promise.resolve(promise).then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      }).catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      });
    });
  }

  // ---------- Coupon module ----------

  function setCouponMessage(message, type) {
    state.couponFeedback = { message: message || "", type: type || "" };
    const el = document.getElementById("mptCouponMessage");
    if (!el) return;
    el.textContent = state.couponFeedback.message;
    el.classList.remove("is-error", "is-success");
    if (state.couponFeedback.type === "error") el.classList.add("is-error");
    if (state.couponFeedback.type === "success") el.classList.add("is-success");
  }

  async function applyCoupon(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    state.couponDraftCode = code;

    if (!code) {
      state.coupon = null;
      renderSummary();
      setCouponMessage("Enter a discount code.", "error");
      return;
    }

    setCouponMessage("Validating code…", "");

    try {
      if (!window.MyCuscoTripApiClient?.validateCoupon) {
        throw new Error("We could not validate the coupon right now. Please try again.");
      }

      const summary = calculateBookingSummary();
      const validationPromise = window.MyCuscoTripApiClient.validateCoupon({
        couponCode: code,
        subtotal: Number(summary.subtotal || 0),
        currency: summary.currency || state.data.currency || "USD",
        locale: "en",
        page: window.location.pathname
      });
      const result = await Promise.race([
        validationPromise,
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("Coupon validation took too long. Please try again.")), 12000))
      ]);

      if (!result || result.mock) {
        throw new Error("We could not validate the coupon right now. Please try again.");
      }

      if (!result.valid) {
        state.coupon = null;
        renderSummary();
        setCouponMessage(result.message || "Invalid or inactive code.", "error");
        trackLandingEvent("coupon_applied", { coupon_code: code, coupon_valid: false, coupon_reason: result.reason || "" });
        return;
      }

      const couponType = String(result.type || (result.discountPercent ? "percent" : "percent")).toLowerCase() === "fixed" ? "fixed" : "percent";
      state.coupon = {
        code: result.couponCode || code,
        type: couponType,
        value: Number(result.value ?? result.discountPercent ?? 0),
        currency: result.currency || summary.currency || state.data.currency || "USD",
        expiresAt: result.expiresAt || ""
      };
      state.couponDraftCode = state.coupon.code;

      renderSummary();
      setCouponMessage(`Coupon applied: ${result.label || state.coupon.code}.`, "success");
      trackLandingEvent("coupon_applied", {
        coupon_code: state.coupon.code,
        coupon_valid: true,
        coupon_type: state.coupon.type,
        coupon_value: state.coupon.value
      });
    } catch (error) {
      console.error("Coupon validation failed:", error);
      state.coupon = null;
      renderSummary();
      setCouponMessage(error?.message || "We could not validate the coupon right now. Please try again.", "error");
      trackLandingEvent("coupon_applied", { coupon_code: code, coupon_valid: false, coupon_reason: "backend_unavailable" });
    }
  }

  function removeCoupon() {
    state.coupon = null;
    state.couponDraftCode = "";
    state.couponFeedback = { message: "", type: "" };
    renderSummary();
  }

  // ---------- Rendering: main product ----------

  function renderMainProduct() {
    const p = state.data.mainProduct;
    const currency = state.data.currency;
    const childPolicy = state.data.childPolicy;
    const childDiscount = Number(p.childPricing?.discountAmount || 0);
    const childPrice = Math.max(0, p.adultPrice - childDiscount);
    const container = document.getElementById("mptMainProduct");

    container.innerHTML = `
      <div class="mpt-main-product">
        <span class="mpt-main-product__flag">${escapeHtml(p.badge || "Bestseller")}</span>
        <div class="mpt-main-product__grid">
          <div class="mpt-main-product__media">
            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="eager" fetchpriority="high"/>
          </div>
          <div class="mpt-main-product__body">
            <h3>${escapeHtml(p.title)}</h3>
            <p class="mpt-main-product__desc">${escapeHtml(p.shortDescription)}</p>
            <div class="mpt-price-row">
              <div class="mpt-price-pill"><span>Adult</span><strong>${formatCurrency(p.adultPrice, currency)}</strong></div>
              <div class="mpt-price-pill"><span>Child (${childPolicy.minAge}-${childPolicy.maxAge} years)</span><strong>${formatCurrency(childPrice, currency)}</strong></div>
            </div>
            <div class="mpt-field-grid">
              <div class="mpt-field">
                <label for="${dateInputId(p.id)}">Date</label>
                <input id="${dateInputId(p.id)}" type="text" placeholder="Select a date" readonly aria-describedby="${errorId(p.id)}"/>
                <span class="mpt-field-error" id="${errorId(p.id)}" role="alert"></span>
              </div>
              <div class="mpt-field">
                <label for="mptAdults">Adults</label>
                <select id="mptAdults" aria-label="Number of adults for the entire booking">${qtyOptions(1, 10, state.adults)}</select>
              </div>
              <div class="mpt-field">
                <label for="mptChildren">Children</label>
                <select id="mptChildren" aria-label="Number of children for the entire booking">${qtyOptions(0, 10, state.children)}</select>
              </div>
            </div>
            <div>
              <strong style="font-size:0.85rem;">Includes:</strong>
              <ul class="mpt-includes">${(p.includes || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
            </div>
            <div>
              <strong style="font-size:0.85rem;">Meals (optional):</strong>
              <div class="mpt-meal-options" role="radiogroup" aria-label="Meal options">
                ${(p.mealOptions || []).map((m) => `
                  <label class="mpt-meal-option">
                    <span>${escapeHtml(m.label)}${m.pricePerPerson > 0 ? ` (+${formatCurrency(m.pricePerPerson, currency)}/person)` : " (included at no extra cost)"}</span>
                    <input type="radio" name="mptMeal" value="${escapeHtml(m.id)}" ${state.mainProduct.mealOptionId === m.id ? "checked" : ""}/>
                  </label>
                `).join("")}
              </div>
              <p style="color:var(--mct-muted,#6c7a76); font-size:0.78rem; margin-top:6px;">${escapeHtml(p.mealDisclaimer || "")}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("mptAdults").addEventListener("change", (e) => {
      state.adults = Math.max(1, Number(e.target.value) || 1);
      trackLandingEvent("traveler_count_changed", { adults: state.adults, children: state.children });
      renderSummary();
    });
    document.getElementById("mptChildren").addEventListener("change", (e) => {
      state.children = Math.max(0, Number(e.target.value) || 0);
      trackLandingEvent("traveler_count_changed", { adults: state.adults, children: state.children });
      renderSummary();
    });
    container.querySelectorAll('input[name="mptMeal"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          state.mainProduct.mealOptionId = e.target.value;
          renderSummary();
        }
      });
    });

    const dateInput = document.getElementById(dateInputId(p.id));
    state.pickers[p.id] = window.flatpickr(dateInput, {
      minDate: "today",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "M j, Y",
      locale: "default",
      defaultDate: state.mainProduct.date || undefined,
      onChange(selectedDates, dateStr) {
        state.mainProduct.date = dateStr || null;
        trackLandingEvent("main_product_date_selected", { date: dateStr });
        validateAllDates();
        renderSummary();
      }
    });
    if (state.mainProduct.date) dateInput.value = state.mainProduct.date;
  }

  // ---------- Rendering: add-ons ----------

  function renderAddons() {
    const grid = document.getElementById("mptAddonsGrid");
    const currency = state.data.currency;
    grid.innerHTML = (state.data.addons || []).map((addon) => {
      const sel = state.addons[addon.id];
      const detailsId = `mpt-addon-content-${addon.id}`;
      return `
        <article class="mpt-card${sel.selected ? " is-selected is-expanded" : ""}" data-addon-id="${escapeHtml(addon.id)}">
          <div class="mpt-card__media">
            <img src="${escapeHtml(addon.image)}" alt="${escapeHtml(addon.title)}" loading="lazy"/>
          </div>
          <div class="mpt-card__body">
            <div class="mpt-card__summary">
              <h3>${escapeHtml(addon.title)}</h3>
              <div class="mpt-card__price">${formatCurrency(addon.pricePerPerson, currency)} / person</div>
            </div>
            <button class="mpt-card__disclosure" type="button" data-addon-expand data-addon-id="${escapeHtml(addon.id)}" aria-expanded="${sel.selected ? "true" : "false"}" aria-controls="${escapeHtml(detailsId)}">
              <span>See what is included</span><i class="fas fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="mpt-card__expandable" id="${escapeHtml(detailsId)}">
              <p class="mpt-card__desc">${escapeHtml(addon.shortDescription)}</p>
              <ul class="mpt-card__includes">${(addon.includes || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
              ${addon.excludesNote ? `<p class="mpt-card__excludes">${escapeHtml(addon.excludesNote)}</p>` : ""}
              <div class="mpt-card__toggle-row">
                <label class="mpt-card__checkbox">
                  <input type="checkbox" data-addon-id="${escapeHtml(addon.id)}" ${sel.selected ? "checked" : ""}/>
                  Add to my trip
                </label>
              </div>
              <div class="mpt-card__details">
                <div class="mpt-field">
                  <label for="${dateInputId(addon.id)}">Date for ${escapeHtml(addon.title)}</label>
                  <input id="${dateInputId(addon.id)}" type="text" placeholder="Select a date" readonly aria-describedby="${errorId(addon.id)}"/>
                  <span class="mpt-field-error" id="${errorId(addon.id)}" role="alert"></span>
                </div>
                ${(addon.extras || []).map((extra) => `
                  <label class="mpt-card__extra">
                    <input type="checkbox" data-extra-toggle data-addon-id="${escapeHtml(addon.id)}" data-extra-id="${escapeHtml(extra.id)}" ${sel.extras?.[extra.id] ? "checked" : ""}/>
                    ${escapeHtml(extra.label)} (+${formatCurrency(extra.pricePerPerson, currency)}/person)
                  </label>
                `).join("")}
                <button type="button" class="mpt-card__remove" data-addon-remove data-addon-id="${escapeHtml(addon.id)}">Remove from my trip</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    (state.data.addons || []).forEach((addon) => {
      const sel = state.addons[addon.id];
      const dateInput = document.getElementById(dateInputId(addon.id));
      state.pickers[addon.id] = window.flatpickr(dateInput, {
        minDate: "today",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "M j, Y",
        locale: "default",
        defaultDate: sel.date || undefined,
        onChange(selectedDates, dateStr) {
          state.addons[addon.id].date = dateStr || null;
          trackLandingEvent("addon_date_selected", { addon_id: addon.id, date: dateStr });
          validateAllDates();
          renderSummary();
        }
      });
      if (sel.date) dateInput.value = sel.date;
    });
  }

  function toggleAddon(id, selected) {
    state.addons[id].selected = selected;
    const card = document.querySelector(`.mpt-card[data-addon-id="${id}"]`);
    card?.classList.toggle("is-selected", selected);
    if (selected) card?.classList.add("is-expanded");
    const disclosure = card?.querySelector("[data-addon-expand]");
    if (disclosure) disclosure.setAttribute("aria-expanded", card.classList.contains("is-expanded") ? "true" : "false");
    if (selected) {
      trackLandingEvent("addon_added", { addon_id: id });
      if (!state.addons[id].date) state.pickers[id]?.open();
    } else {
      trackLandingEvent("addon_removed", { addon_id: id });
      state.addons[id].date = null;
      state.pickers[id]?.clear();
      setFieldError(id, "");
    }
    validateAllDates({ silent: true });
    renderSummary();
  }

  function highlightAddonCards() {
    document.querySelectorAll(".mpt-card").forEach((card) => {
      card.classList.add("is-highlighted");
      setTimeout(() => card.classList.remove("is-highlighted"), 2600);
    });
  }

  // ---------- Rendering: operational warnings ----------

  function renderOperationalWarnings(warnings) {
    const el = document.getElementById("mptOperationalWarnings");
    if (!el) return;
    if (!warnings.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = warnings.map((w) => `
      <div class="mpt-warning"><i class="fas fa-triangle-exclamation"></i><span>${escapeHtml(w.message)}</span></div>
    `).join("");
    warnings.forEach((w) => trackLandingEvent("operational_warning_view", { warning_id: w.id }));
  }

  // ---------- Rendering: summary panel ----------

  function renderSummary() {
    const summary = calculateBookingSummary();
    const content = document.getElementById("mptSummaryContent");
    const currency = summary.currency;

    const linesHtml = summary.lines.map((line) => `
      <div class="mpt-summary__item">
        <div>
          <div class="mpt-summary__item-name">${escapeHtml(line.title)}</div>
          <div class="mpt-summary__item-meta">${escapeHtml(formatDateSpanish(line.date))}${line.mealLabel ? ` · ${escapeHtml(line.mealLabel)}` : ""}${line.extras && line.extras.length ? ` · ${line.extras.map(escapeHtml).join(", ")}` : ""}</div>
        </div>
        <strong>${formatCurrency(line.lineTotal, currency)}</strong>
      </div>
    `).join("");

    content.innerHTML = `
      <div id="mptOperationalWarnings"></div>
      <div class="mpt-summary__travelers">
        <span><i class="fas fa-user"></i> ${summary.adults} adult(s)</span>
        <span><i class="fas fa-child"></i> ${summary.children} child(ren)</span>
      </div>
      <div class="mpt-summary__list">${linesHtml || '<p style="color:var(--mct-muted,#6c7a76); font-size:0.88rem;">You have not added any experiences yet.</p>'}</div>

      <div class="mpt-coupon">
        <input id="mptCouponInput" type="text" placeholder="Discount code" aria-label="Discount code" value="${escapeHtml(state.coupon?.code || state.couponDraftCode || "")}"/>
        <button class="mpt-btn mpt-btn--secondary mpt-coupon__apply" id="mptCouponApply" type="button">Apply</button>
      </div>
      ${state.coupon ? `<button class="mpt-card__remove" id="mptCouponRemove" type="button" style="margin-bottom:8px;">Remove coupon</button>` : ""}
      <p class="mpt-coupon-message${state.couponFeedback?.type === "error" ? " is-error" : state.couponFeedback?.type === "success" ? " is-success" : ""}" id="mptCouponMessage">${escapeHtml(state.couponFeedback?.message || "")}</p>

      <div class="mpt-summary__totals">
        <div class="mpt-summary__totals-row"><span>Subtotal</span><strong>${formatCurrency(summary.subtotal, currency)}</strong></div>
        ${summary.discount > 0 ? `<div class="mpt-summary__totals-row mpt-summary__discount"><span>Discount</span><strong>-${formatCurrency(summary.discount, currency)}</strong></div>` : ""}
        <div class="mpt-summary__totals-row mpt-summary__total"><span>Total</span><span aria-live="polite">${formatCurrency(summary.total, currency)}</span></div>
      </div>

      <button class="mpt-btn mpt-btn--primary" id="mptSummaryContinue" type="button" style="margin-top:14px;">Continue with my booking</button>
      <p class="mpt-availability-note">Dates and times are subject to availability. Our team will verify tickets, trains and operating conditions before issuing the services.</p>
    `;

    renderOperationalWarnings(summary.warnings);
    updateMobileBar(summary);
    persistDraftState();
  }

  function updateMobileBar(summary) {
    const totalEl = document.getElementById("mptMobileBarTotal");
    if (totalEl) totalEl.textContent = formatCurrency(summary.total, summary.currency);
  }

  // ---------- Modals ----------

  function handleModalKeydown(e) {
    if (!state.activeModal) return;
    if (e.key === "Escape") closeModal(state.activeModal);
    if (e.key === "Tab") trapFocus(e, state.activeModal);
  }

  function trapFocus(e, modalEl) {
    const focusables = Array.from(modalEl.querySelectorAll('input,button,select,textarea,[href]')).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(modalEl) {
    modalEl.hidden = false;
    state.activeModal = modalEl;
    document.addEventListener("keydown", handleModalKeydown);
    const focusable = modalEl.querySelector("input,button,select,textarea");
    focusable?.focus();
  }

  function closeModal(modalEl) {
    modalEl.hidden = true;
    document.removeEventListener("keydown", handleModalKeydown);
    state.activeModal = null;
  }

  function shouldShowUpsell() {
    const hasAddon = Object.values(state.addons).some((a) => a.selected);
    return state.mainProduct.selected && !hasAddon && !state.upsellModalShown;
  }

  function openUpsellModal() {
    trackLandingEvent("upsell_modal_view", {});
    openModal(document.getElementById("mptUpsellModal"));
  }

  function markUpsellShown() {
    state.upsellModalShown = true;
    try {
      sessionStorage.setItem(UPSELL_SESSION_KEY, "1");
    } catch (error) {
      /* storage unavailable */
    }
  }

  // ---------- Product-style passenger modal + PayPal checkout ----------

  const CHECKOUT_I18N = {"lang": "en", "locale": "en-US", "name": "Machu Picchu + Tours in Peru", "data": "assets/data/i18n/en/landing-machu-picchu-tours.json", "copy": "Code copied", "noDate": "date not selected", "modalTitle": "Traveler details", "codeLabel": "Booking code:", "payNow": "Amount due now:", "important": "Important information", "importantText": "Enter names, surnames and document details exactly as they appear on the official travel document. These details will be used to issue admission tickets, train tickets and tour services.", "holderTitle": "Booking holder / Traveler 1", "holderOnly": "Booking holder", "required": "Required details to continue", "first": "First name(s)", "last": "Last name(s)", "docType": "Document type", "select": "Select", "passport": "Passport", "dni": "National ID (DNI)", "idcard": "Identity card", "other": "Other", "docNum": "Document number", "nationality": "Nationality", "selectCountry": "Select country", "selectCode": "Select code", "birth": "Date of birth", "whatsapp": "WhatsApp", "email": "Email", "language": "Requested language", "pickup": "Hotel or pickup address in Cusco", "pickupPh": "Hotel name and address, if known", "holderTravels": "The booking holder is also traveling.", "tourists": "Traveler registration", "touristsNote": "You may enter additional traveler details now or 15 to 30 days before travel.", "traveler": "Traveler", "later": "Complete these details later", "cancel": "Cancel", "edit": "Edit details", "continue": "Continue", "pay": "Pay", "saving": "Creating your reservation…", "connecting": "Connecting securely to PayPal…", "summaryTitle": "Booking summary", "review": "Review your booking before payment", "holder": "Booking holder", "pickupShort": "Pickup", "services": "Services", "total": "Total due", "paypalNote": "You will be securely redirected to PayPal to pay 100% of the booking.", "formRequired": "Complete the required details to continue.", "backendError": "The booking could not be registered or PayPal could not be started. Check your connection and try again.", "noApproval": "PayPal did not return a payment approval link.", "paymentUnavailable": "The payment backend is unavailable.", "dateTransition": "Travel between Lima/Ica and Cusco requires at least one transfer day. Select a later date to continue.", "selectDate": "Select a date to continue.", "pastDate": "The date cannot be earlier than today.", "duplicateDate": "Two tours cannot be scheduled for the same date.", "statusEdit": "Review the details and continue.", "reviewButton": "Continue", "modalAriaClose": "Close modal", "requestedLanguages": ["English", "Español", "Português", "Italiano", "Français", "Deutsch", "日本語", "中文普通话"], "cancelledReturn": "The payment was not completed. Your booking is still saved and you can try again.", "processingTitle": "We are preparing your booking"};

  function setPassengerMessage(message, isError) {
    const target = document.getElementById("mptPassengerMessage");
    if (!target) return;
    target.textContent = message || "";
    target.classList.toggle("is-error", Boolean(isError));
  }


  function ensureCheckoutProcessingOverlay() {
    let overlay = document.getElementById("mptCheckoutProcessing");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "mptCheckoutProcessing";
    overlay.className = "mpt-checkout-processing";
    overlay.hidden = true;
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-busy", "true");
    overlay.innerHTML = `
      <div class="mpt-checkout-processing__card">
        <span class="mpt-checkout-processing__spinner" aria-hidden="true"></span>
        <strong>${escapeHtml(CHECKOUT_I18N.processingTitle)}</strong>
        <p id="mptCheckoutProcessingMessage"></p>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showCheckoutProcessing(message) {
    const overlay = ensureCheckoutProcessingOverlay();
    const target = overlay.querySelector("#mptCheckoutProcessingMessage");
    if (target) target.textContent = message || CHECKOUT_I18N.saving;
    overlay.hidden = false;
    document.body.classList.add("mpt-checkout-processing-open");
  }

  function hideCheckoutProcessing() {
    const overlay = document.getElementById("mptCheckoutProcessing");
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("mpt-checkout-processing-open");
  }

  function buildLandingPaymentUrl(status, reservationCode) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("payment", status);
    if (reservationCode) url.searchParams.set("reservationCode", reservationCode);
    return url.toString();
  }

  function buildPayPalReturnUrl(reservationCode) {
    const url = new URL(`${getSiteBasePath()}paypal-retorno.html`.replace(/([^:]\/)\/{2,}/g, "$1"), window.location.origin);
    if (reservationCode) url.searchParams.set("reservationCode", reservationCode);
    return url.toString();
  }

  function getPendingPaymentRecord(reservationCode) {
    if (!reservationCode) return null;
    const keys = [
      `mct_pending_payment_${reservationCode}`,
      `mct_pre_reservation_${reservationCode}`
    ];
    for (const storage of [window.sessionStorage, window.localStorage]) {
      for (const key of keys) {
        try {
          const raw = storage.getItem(key);
          if (raw) return JSON.parse(raw);
        } catch (error) {
          /* storage unavailable or invalid record */
        }
      }
    }
    return null;
  }

  function getCancelledPaymentContext() {
    const params = new URLSearchParams(window.location.search);
    const payment = String(params.get("payment") || params.get("paypal") || "").toLowerCase();
    if (!payment.includes("cancel")) return null;
    const reservationCode = String(params.get("reservationCode") || params.get("codigo") || params.get("code") || "").trim().toUpperCase();
    const record = getPendingPaymentRecord(reservationCode);
    const reservation = record?.payload || record || null;
    return reservation ? { reservationCode, record, reservation } : null;
  }

  function applyReservationSelectionToState(reservation) {
    if (!reservation || !state.data) return;
    if (Number(reservation.adults) > 0) state.adults = Number(reservation.adults);
    if (Number.isFinite(Number(reservation.children))) state.children = Number(reservation.children);
    const services = Array.isArray(reservation.services) ? reservation.services : [];
    const mainId = state.data.mainProduct.id;
    const mainService = services.find((service) => String(service.id || service.productId || "") === String(mainId));
    if (mainService) {
      state.mainProduct.selected = true;
      state.mainProduct.date = mainService.date || null;
      const selectedMealLabel = Array.isArray(mainService.extras) ? mainService.extras[0] : "";
      const meal = (state.data.mainProduct.mealOptions || []).find((option) => option.label === selectedMealLabel);
      if (meal) state.mainProduct.mealOptionId = meal.id;
    }
    (state.data.addons || []).forEach((addon) => {
      const service = services.find((item) => String(item.id || item.productId || "") === String(addon.id));
      state.addons[addon.id] = {
        ...(state.addons[addon.id] || { selected: false, date: null, extras: {} }),
        selected: Boolean(service),
        date: service?.date || null,
        extras: service ? Object.fromEntries((service.extras || []).map((key) => [key, true])) : {}
      };
    });
    if (reservation.appliedCoupon) state.coupon = reservation.appliedCoupon;
    state.reservationCode = reservation.reservationCode || reservation.code || state.reservationCode;
    state.lastReservation = reservation;
  }

  function setPassengerFieldValue(form, name, value) {
    const field = form?.elements?.namedItem(name);
    if (!field || value == null) return;
    field.value = String(value);
  }

  async function populatePassengerFormFromReservation(reservation) {
    const form = document.getElementById("mptPassengerForm");
    const fields = document.getElementById("mptPassengerFields");
    if (!form || !fields || !reservation) return;
    await populateCheckoutCountrySelects(fields);
    const holder = reservation.holder || {};
    const holderTravels = reservation.holderIsPassenger !== false && holder.travels !== false;
    setPassengerFieldValue(form, "holderFirstName", holder.firstName);
    setPassengerFieldValue(form, "holderLastName", holder.lastName);
    setPassengerFieldValue(form, "holderDocumentType", holder.documentType);
    setPassengerFieldValue(form, "holderDocumentNumber", holder.documentNumber);
    setPassengerFieldValue(form, "holderNationality", holder.nationality);
    setPassengerFieldValue(form, "holderBirthdate", holder.birthdate);
    const phoneCode = holder.whatsappCountryCode || "+51";
    const phoneNumber = holder.whatsappNumber || String(holder.whatsapp || "").replace(phoneCode, "").trim();
    setPassengerFieldValue(form, "holderWhatsappCountryCode", phoneCode);
    setPassengerFieldValue(form, "holderWhatsapp", phoneNumber);
    setPassengerFieldValue(form, "holderEmail", holder.email);
    setPassengerFieldValue(form, "holderLanguage", holder.language);
    setPassengerFieldValue(form, "holderPickupLocation", holder.pickupLocation || reservation.pickup?.location);
    const holderCheckbox = document.getElementById("mptHolderTravels");
    if (holderCheckbox) holderCheckbox.checked = holderTravels;
    const title = document.getElementById("mptHolderSectionTitle");
    if (title) title.textContent = holderTravels ? CHECKOUT_I18N.holderTitle : CHECKOUT_I18N.holderOnly;
    renderAdditionalPassengerFields(holderTravels);
    const additional = document.getElementById("mptAdditionalPassengers");
    if (additional) await populateCheckoutCountrySelects(additional);
    const passengers = (reservation.passengers || []).filter((passenger) => passenger.role !== "holder_passenger");
    passengers.forEach((passenger, index) => {
      const number = Number(passenger.passengerNumber) || ((holderTravels ? 2 : 1) + index);
      const later = form.elements.namedItem(`passenger_${number}_complete_later`);
      if (later) {
        later.checked = passenger.completeLater || passenger.completionStatus === "pending";
        toggleAdditionalPassengerFields(later);
      }
      setPassengerFieldValue(form, `passenger_${number}_firstName`, passenger.firstName);
      setPassengerFieldValue(form, `passenger_${number}_lastName`, passenger.lastName);
      setPassengerFieldValue(form, `passenger_${number}_documentType`, passenger.documentType);
      setPassengerFieldValue(form, `passenger_${number}_documentNumber`, passenger.documentNumber);
      setPassengerFieldValue(form, `passenger_${number}_nationality`, passenger.nationality);
      setPassengerFieldValue(form, `passenger_${number}_birthdate`, passenger.birthdate);
    });
    const codeSelect = form.elements.namedItem("holderWhatsappCountryCode");
    if (codeSelect) compactPhoneCodeSelect(codeSelect);
  }

  function passengerDocumentOptions() {
    return `
      <option value="">${escapeHtml(CHECKOUT_I18N.select)}</option>
      <option value="passport">${escapeHtml(CHECKOUT_I18N.passport)}</option>
      <option value="dni">${escapeHtml(CHECKOUT_I18N.dni)}</option>
      <option value="id_card">${escapeHtml(CHECKOUT_I18N.idcard)}</option>
      <option value="other">${escapeHtml(CHECKOUT_I18N.other)}</option>`;
  }

  function requestedLanguageOptions() {
    return CHECKOUT_I18N.requestedLanguages.map((language, index) => `<option value="${escapeHtml(language)}" ${index === 0 ? "selected" : ""}>${escapeHtml(language)}</option>`).join("");
  }

  let checkoutCountriesPromise = null;

  function loadCheckoutCountries() {
    if (checkoutCountriesPromise) return checkoutCountriesPromise;
    const url = `${getSiteBasePath()}assets/data/countries.json`.replace(/([^:]\/)\/{2,}/g, "$1");
    checkoutCountriesPromise = fetch(url, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Countries ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        console.warn("Could not load country list:", error);
        return [
          { name: "Perú", dialCode: "+51" },
          { name: "Estados Unidos", dialCode: "+1" },
          { name: "México", dialCode: "+52" },
          { name: "Colombia", dialCode: "+57" },
          { name: "Brasil", dialCode: "+55" },
          { name: "Chile", dialCode: "+56" },
          { name: "Argentina", dialCode: "+54" },
          { name: "España", dialCode: "+34" },
          { name: "Portugal", dialCode: "+351" }
        ];
      });
    return checkoutCountriesPromise;
  }

  function compactPhoneCodeSelect(select) {
    if (!select) return;
    const selectedValue = select.value || "+51";
    Array.from(select.options || []).forEach((option) => {
      const fullLabel = option.dataset.fullLabel || option.textContent || option.value;
      option.dataset.fullLabel = fullLabel;
      option.textContent = option.value === selectedValue ? option.value : fullLabel;
    });
  }

  function expandPhoneCodeSelect(select) {
    if (!select) return;
    Array.from(select.options || []).forEach((option) => {
      if (option.dataset.fullLabel) option.textContent = option.dataset.fullLabel;
    });
  }

  async function populateCheckoutCountrySelects(scope) {
    if (!scope) return;
    const countries = await loadCheckoutCountries();
    scope.querySelectorAll("select[data-country-select]").forEach((select) => {
      const current = select.value || select.dataset.default || "Perú";
      select.innerHTML = `<option value="">${escapeHtml(CHECKOUT_I18N.selectCountry)}</option>${countries.map((country) => `<option value="${escapeHtml(country.name)}">${escapeHtml(country.name)}</option>`).join("")}`;
      select.value = current;
      if (!select.value) select.value = "Perú";
    });
    scope.querySelectorAll("select[data-phone-code-select]").forEach((select) => {
      const current = select.value || "+51";
      select.innerHTML = `<option value="">${escapeHtml(CHECKOUT_I18N.selectCode)}</option>${countries.map((country) => {
        const label = `${country.dialCode} · ${country.name}`;
        return `<option value="${escapeHtml(country.dialCode)}" data-full-label="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
      }).join("")}`;
      select.value = current;
      if (!select.value) select.value = "+51";
      if (select.dataset.phoneSelectBound !== "true") {
        select.dataset.phoneSelectBound = "true";
        select.addEventListener("mousedown", () => expandPhoneCodeSelect(select));
        select.addEventListener("focus", () => expandPhoneCodeSelect(select));
        select.addEventListener("change", () => window.setTimeout(() => compactPhoneCodeSelect(select), 0));
        select.addEventListener("blur", () => compactPhoneCodeSelect(select));
      }
      compactPhoneCodeSelect(select);
    });
  }


  function renderAdditionalPassengerFields(holderTravels) {
    const target = document.getElementById("mptAdditionalPassengers");
    if (!target) return;
    const totalPax = state.adults + state.children;
    const startNumber = holderTravels ? 2 : 1;
    const slots = holderTravels ? Math.max(totalPax - 1, 0) : totalPax;
    if (!slots) {
      target.innerHTML = "";
      return;
    }
    target.innerHTML = Array.from({ length: slots }, (_, index) => {
      const number = startNumber + index;
      return `
        <details class="passenger-modal__optional-passenger" open>
          <summary><span>${escapeHtml(CHECKOUT_I18N.traveler)} ${number}</span><i class="fas fa-chevron-down"></i></summary>
          <div class="passenger-modal__passenger-content">
            <label class="passenger-modal__check">
              <input type="checkbox" name="passenger_${number}_complete_later" data-passenger-later="${number}"/>
              <span>${escapeHtml(CHECKOUT_I18N.later)}</span>
            </label>
            <div class="passenger-modal__grid" data-passenger-fields="${number}">
              <label><span>${escapeHtml(CHECKOUT_I18N.first)}</span><input name="passenger_${number}_firstName" minlength="2" required type="text"/></label>
              <label><span>${escapeHtml(CHECKOUT_I18N.last)}</span><input name="passenger_${number}_lastName" minlength="2" required type="text"/></label>
              <label><span>${escapeHtml(CHECKOUT_I18N.docType)}</span><select name="passenger_${number}_documentType" required>${passengerDocumentOptions()}</select></label>
              <label><span>${escapeHtml(CHECKOUT_I18N.docNum)}</span><input name="passenger_${number}_documentNumber" required type="text"/></label>
              <label><span>${escapeHtml(CHECKOUT_I18N.nationality)}</span><select autocomplete="country-name" data-country-select data-default="Perú" name="passenger_${number}_nationality" required><option value="">${escapeHtml(CHECKOUT_I18N.selectCountry)}</option></select></label>
              <label><span>${escapeHtml(CHECKOUT_I18N.birth)}</span><input name="passenger_${number}_birthdate" required type="date"/></label>
            </div>
          </div>
        </details>`;
    }).join("");
    populateCheckoutCountrySelects(target);
    target.querySelectorAll("[data-passenger-later]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => toggleAdditionalPassengerFields(checkbox));
    });
  }

  function toggleAdditionalPassengerFields(checkbox) {
    const number = checkbox.dataset.passengerLater;
    const fields = document.querySelector(`[data-passenger-fields="${number}"]`);
    if (!fields) return;
    fields.classList.toggle("is-disabled", checkbox.checked);
    fields.querySelectorAll("input,select").forEach((field) => {
      field.disabled = checkbox.checked;
      field.required = !checkbox.checked;
    });
  }

  function renderPassengerFields() {
    const container = document.getElementById("mptPassengerFields");
    if (!container) return;
    container.innerHTML = `
      <section class="passenger-modal__section passenger-modal__section--holder">
        <div class="passenger-modal__section-title">
          <strong id="mptHolderSectionTitle">${escapeHtml(CHECKOUT_I18N.holderTitle)}</strong>
          <span>${escapeHtml(CHECKOUT_I18N.required)}</span>
        </div>
        <div class="passenger-modal__grid">
          <label><span>${escapeHtml(CHECKOUT_I18N.first)}</span><input autocomplete="given-name" minlength="2" name="holderFirstName" required type="text"/></label>
          <label><span>${escapeHtml(CHECKOUT_I18N.last)}</span><input autocomplete="family-name" minlength="2" name="holderLastName" required type="text"/></label>
          <label><span>${escapeHtml(CHECKOUT_I18N.docType)}</span><select name="holderDocumentType" required>${passengerDocumentOptions()}</select></label>
          <label><span>${escapeHtml(CHECKOUT_I18N.docNum)}</span><input name="holderDocumentNumber" required type="text"/></label>
          <label><span>${escapeHtml(CHECKOUT_I18N.nationality)}</span><select autocomplete="country-name" data-country-select data-default="Perú" name="holderNationality" required><option value="">${escapeHtml(CHECKOUT_I18N.selectCountry)}</option></select></label>
          <label><span>${escapeHtml(CHECKOUT_I18N.birth)}</span><input name="holderBirthdate" required type="date"/></label>
          <label class="passenger-phone-field"><span>${escapeHtml(CHECKOUT_I18N.whatsapp)}</span><div class="passenger-phone-row"><select aria-label="${escapeHtml(CHECKOUT_I18N.selectCode)}" data-phone-code-select name="holderWhatsappCountryCode" required><option value="+51">+51</option></select><input autocomplete="tel" inputmode="tel" name="holderWhatsapp" placeholder="900 000 000" required type="tel"/></div></label>
          <label><span>${escapeHtml(CHECKOUT_I18N.email)}</span><input autocomplete="email" name="holderEmail" required type="email"/></label>
          <label><span>${escapeHtml(CHECKOUT_I18N.language)}</span><select name="holderLanguage" required>${requestedLanguageOptions()}</select></label>
          <label class="is-wide"><span>${escapeHtml(CHECKOUT_I18N.pickup)}</span><input name="holderPickupLocation" placeholder="${escapeHtml(CHECKOUT_I18N.pickupPh)}" required type="text"/></label>
        </div>
        <label class="passenger-modal__check">
          <input checked id="mptHolderTravels" name="holderTravels" type="checkbox"/>
          <span>${escapeHtml(CHECKOUT_I18N.holderTravels)}</span>
        </label>
      </section>
      <section class="passenger-modal__section">
        <div class="passenger-modal__section-title">
          <strong>${escapeHtml(CHECKOUT_I18N.tourists)}</strong>
          <span>${escapeHtml(CHECKOUT_I18N.touristsNote)}</span>
        </div>
        <div class="passenger-modal__additional" id="mptAdditionalPassengers"></div>
      </section>`;
    populateCheckoutCountrySelects(container);
    renderAdditionalPassengerFields(true);
    document.getElementById("mptHolderTravels")?.addEventListener("change", (event) => {
      const holderTravels = event.currentTarget.checked;
      const title = document.getElementById("mptHolderSectionTitle");
      if (title) title.textContent = holderTravels ? CHECKOUT_I18N.holderTitle : CHECKOUT_I18N.holderOnly;
      renderAdditionalPassengerFields(holderTravels);
    });
  }

  function collectPassengerForm() {
    const form = document.getElementById("mptPassengerForm");
    if (!form) return null;
    if (!form.checkValidity()) {
      form.reportValidity();
      setPassengerMessage(CHECKOUT_I18N.formRequired, true);
      return null;
    }
    const data = new FormData(form);
    const holderTravels = data.get("holderTravels") === "on";
    const holder = {
      role: "holder",
      firstName: String(data.get("holderFirstName") || "").trim(),
      lastName: String(data.get("holderLastName") || "").trim(),
      documentType: String(data.get("holderDocumentType") || "").trim(),
      documentNumber: String(data.get("holderDocumentNumber") || "").trim(),
      nationality: String(data.get("holderNationality") || "").trim(),
      birthdate: String(data.get("holderBirthdate") || "").trim(),
      whatsappCountryCode: String(data.get("holderWhatsappCountryCode") || "+51").trim(),
      whatsappNumber: String(data.get("holderWhatsapp") || "").trim(),
      whatsapp: `${String(data.get("holderWhatsappCountryCode") || "+51").trim()} ${String(data.get("holderWhatsapp") || "").trim()}`.trim(),
      email: String(data.get("holderEmail") || "").trim(),
      language: String(data.get("holderLanguage") || "").trim(),
      pickupLocation: String(data.get("holderPickupLocation") || "").trim(),
      travels: holderTravels
    };
    const totalPax = state.adults + state.children;
    const startNumber = holderTravels ? 2 : 1;
    const slots = holderTravels ? Math.max(totalPax - 1, 0) : totalPax;
    const passengers = [];
    if (holderTravels) {
      passengers.push({
        passengerNumber: 1,
        role: "holder_passenger",
        completionStatus: "complete",
        firstName: holder.firstName,
        lastName: holder.lastName,
        documentType: holder.documentType,
        documentNumber: holder.documentNumber,
        nationality: holder.nationality,
        birthdate: holder.birthdate,
        email: holder.email,
        whatsapp: holder.whatsapp,
        language: holder.language
      });
    }
    for (let index = 0; index < slots; index += 1) {
      const number = startNumber + index;
      const completeLater = data.get(`passenger_${number}_complete_later`) === "on";
      passengers.push({
        passengerNumber: number,
        role: "traveler",
        completionStatus: completeLater ? "pending" : "provided",
        completeLater,
        firstName: completeLater ? "" : String(data.get(`passenger_${number}_firstName`) || "").trim(),
        lastName: completeLater ? "" : String(data.get(`passenger_${number}_lastName`) || "").trim(),
        documentType: completeLater ? "" : String(data.get(`passenger_${number}_documentType`) || "").trim(),
        documentNumber: completeLater ? "" : String(data.get(`passenger_${number}_documentNumber`) || "").trim(),
        nationality: completeLater ? "" : String(data.get(`passenger_${number}_nationality`) || "").trim(),
        birthdate: completeLater ? "" : String(data.get(`passenger_${number}_birthdate`) || "").trim()
      });
    }
    return { holder, holderTravels, passengers };
  }

  function buildReservationObject(holder, holderTravels, passengers) {
    const summary = calculateBookingSummary();
    const services = [];
    if (state.mainProduct.selected) {
      const meal = (state.data.mainProduct.mealOptions || []).find((item) => item.id === state.mainProduct.mealOptionId);
      services.push({
        id: state.data.mainProduct.id,
        productId: state.data.mainProduct.id,
        title: state.data.mainProduct.title,
        date: state.mainProduct.date,
        origin: state.data.mainProduct.origin,
        extras: meal && meal.pricePerPerson > 0 ? [meal.label] : [],
        lineTotal: summary.lines.find((line) => line.id === state.data.mainProduct.id)?.lineTotal || 0
      });
    }
    (state.data.addons || []).forEach((addon) => {
      const selected = state.addons[addon.id];
      if (!selected?.selected) return;
      services.push({
        id: addon.id,
        productId: addon.id,
        title: addon.title,
        date: selected.date,
        origin: addon.origin,
        extras: Object.keys(selected.extras || {}).filter((key) => selected.extras[key]),
        lineTotal: summary.lines.find((line) => line.id === addon.id)?.lineTotal || 0
      });
    });
    if (!state.reservationCode) state.reservationCode = generateReservationCode();
    const now = new Date();
    const serviceNames = services.map((service) => service.title).join(" + ");
    return {
      code: state.reservationCode,
      reservationCode: state.reservationCode,
      createdAt: now.toISOString(),
      createdAtLabel: now.toLocaleString(CHECKOUT_I18N.locale),
      source: LANDING_ID,
      landingId: LANDING_ID,
      sourcePage: window.location.pathname,
      landingPath: window.location.pathname,
      productSlug: "machu-picchu-y-tours-peru",
      productId: LANDING_ID,
      productTitle: serviceNames || LANDING_NAME,
      date: state.mainProduct.date,
      adults: state.adults,
      children: state.children,
      totalPassengers: state.adults + state.children,
      currency: summary.currency,
      paymentMode: "full",
      serviceTotal: formatCurrency(summary.subtotal, summary.currency),
      payNow: formatCurrency(summary.total, summary.currency),
      payLater: formatCurrency(0, summary.currency),
      serviceTotalValue: summary.subtotal,
      payNowValue: summary.total,
      payLaterValue: 0,
      status: "pre_reservation",
      paymentStatus: "pending",
      holderIsPassenger: holderTravels,
      holder,
      passengers,
      travelers: { adults: state.adults, children: state.children, passengers },
      pickup: { location: holder.pickupLocation, city: "Cusco" },
      services,
      couponCode: state.coupon?.code || "",
      appliedCoupon: state.coupon || null,
      discount: state.coupon ? { code: state.coupon.code, type: state.coupon.type, value: state.coupon.value, amount: summary.discount } : {},
      pricing: { subtotal: summary.subtotal, discount: summary.discount, total: summary.total, currency: summary.currency },
      summary: {
        title: serviceNames || LANDING_NAME,
        date: state.mainProduct.date,
        adults: state.adults,
        children: state.children,
        services: services.map((service) => ({ id: service.id, title: service.title, date: service.date, lineTotal: service.lineTotal })),
        serviceTotal: formatCurrency(summary.subtotal, summary.currency),
        payNow: formatCurrency(summary.total, summary.currency),
        payLater: formatCurrency(0, summary.currency),
        rawServiceTotal: summary.subtotal,
        rawPayNow: summary.total,
        rawPayLater: 0,
        paymentMode: "full",
        couponCode: state.coupon?.code || ""
      },
      passengerDataPolicy: "additional_passengers_can_be_completed_15_to_30_days_before_travel",
      attribution: getAttribution()
    };
  }

  function renderPaymentReview(reservation) {
    const target = document.getElementById("mptPassengerReview");
    if (!target) return;
    const modalTitle = document.getElementById("mptPassengerModalTitle");
    if (modalTitle) modalTitle.textContent = CHECKOUT_I18N.summaryTitle;
    target.hidden = false;
    target.innerHTML = `
      <h3>${escapeHtml(CHECKOUT_I18N.review)}</h3>
      <div class="mpt-payment-review__grid">
        <div class="mpt-payment-review__card"><span>${escapeHtml(CHECKOUT_I18N.holder)}</span><strong>${escapeHtml(`${reservation.holder.firstName} ${reservation.holder.lastName}`)}</strong></div>
        <div class="mpt-payment-review__card"><span>${escapeHtml(CHECKOUT_I18N.pickupShort)}</span><strong>${escapeHtml(reservation.pickup.location)}</strong></div>
      </div>
      <h4>${escapeHtml(CHECKOUT_I18N.services)}</h4>
      <ul class="mpt-payment-review__services">
        ${reservation.services.map((service) => {
          const formattedPrice = formatCurrency(service.lineTotal, reservation.currency);
          const priceParts = String(formattedPrice).trim().split(/\s+/);
          const priceCurrency = priceParts.shift() || reservation.currency || "USD";
          const priceAmount = priceParts.join(" ");
          return `<li>
            <span class="mpt-payment-review__service-info">
              <strong class="mpt-payment-review__service-title">${escapeHtml(service.title)}</strong>
              <small class="mpt-payment-review__service-date">${escapeHtml(formatDateSpanish(service.date))}</small>
            </span>
            <strong class="mpt-payment-review__service-price">
              <small>${escapeHtml(priceCurrency)}</small>
              <span>${escapeHtml(priceAmount)}</span>
            </strong>
          </li>`;
        }).join("")}
      </ul>
      <div class="mpt-payment-review__total"><span>${escapeHtml(CHECKOUT_I18N.total)}</span><strong>${escapeHtml(formatCurrency(reservation.pricing.total, reservation.currency))}</strong></div>
      <p class="mpt-availability-note">${escapeHtml(CHECKOUT_I18N.paypalNote)}</p>`;
    const modal = document.getElementById("mptPassengerModal");
    modal?.classList.add("passenger-modal--review");
    const dialog = modal?.querySelector(".passenger-modal__dialog");
    if (modal) modal.scrollTop = 0;
    if (dialog) dialog.scrollTop = 0;
    const modalBody = modal?.querySelector(".passenger-modal__body");
    if (modalBody) modalBody.scrollTop = 0;
    const cancel = document.getElementById("mptPassengerCancel");
    const submit = document.getElementById("mptPassengerSubmit");
    if (cancel) cancel.textContent = CHECKOUT_I18N.edit;
    if (submit) submit.textContent = CHECKOUT_I18N.pay;
  }

  function resetPassengerReview() {
    const form = document.getElementById("mptPassengerForm");
    const review = document.getElementById("mptPassengerReview");
    const modalTitle = document.getElementById("mptPassengerModalTitle");
    if (modalTitle) modalTitle.textContent = CHECKOUT_I18N.modalTitle;
    document.getElementById("mptPassengerModal")?.classList.remove("passenger-modal--review");
    if (form) delete form.dataset.reviewConfirmed;
    if (review) { review.hidden = true; review.innerHTML = ""; }
    const cancel = document.getElementById("mptPassengerCancel");
    const submit = document.getElementById("mptPassengerSubmit");
    if (cancel) cancel.textContent = CHECKOUT_I18N.cancel;
    if (submit) submit.textContent = CHECKOUT_I18N.continue;
    setPassengerMessage("", false);
  }

  async function openPassengerModal(options = {}) {
    const modal = document.getElementById("mptPassengerModal");
    if (!modal) return;
    const restoredReservation = options?.reservation || null;
    if (restoredReservation) {
      state.reservationCode = restoredReservation.reservationCode || restoredReservation.code || state.reservationCode;
      state.lastReservation = restoredReservation;
    }
    if (!state.reservationCode) state.reservationCode = generateReservationCode();
    renderPassengerFields();
    resetPassengerReview();
    if (restoredReservation) await populatePassengerFormFromReservation(restoredReservation);
    const summary = calculateBookingSummary();
    document.getElementById("mptReservationCode").textContent = state.reservationCode;
    document.getElementById("mptPassengerPayNow").textContent = formatCurrency(restoredReservation?.pricing?.total ?? summary.total, restoredReservation?.currency || summary.currency);
    modal.hidden = false;
    modal.scrollTop = 0;
    const dialog = modal.querySelector(".passenger-modal__dialog");
    if (dialog) dialog.scrollTop = 0;
    const modalBody = modal.querySelector(".passenger-modal__body");
    if (modalBody) modalBody.scrollTop = 0;
    state.activeModal = modal;
    document.body.classList.add("passenger-modal-open");
    document.addEventListener("keydown", handleModalKeydown);
    if (restoredReservation) {
      const form = document.getElementById("mptPassengerForm");
      renderPaymentReview(restoredReservation);
      if (form) form.dataset.reviewConfirmed = "true";
      setPassengerMessage(CHECKOUT_I18N.cancelledReturn, false);
    }
    modal.querySelector("input,button,select")?.focus();
    trackLandingEvent("passenger_modal_open", { reservation_code: state.reservationCode, value: restoredReservation?.pricing?.total ?? summary.total, currency: restoredReservation?.currency || summary.currency });
  }

  function closePassengerModal() {
    const modal = document.getElementById("mptPassengerModal");
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove("passenger-modal--review");
    state.activeModal = null;
    document.body.classList.remove("passenger-modal-open");
    document.removeEventListener("keydown", handleModalKeydown);
    hideCheckoutProcessing();
  }

  async function copyReservationCode() {
    const button = document.getElementById("mptReservationCodeCopy");
    const code = document.getElementById("mptReservationCode")?.textContent?.trim();
    if (!button || !code) return;
    try { await navigator.clipboard.writeText(code); } catch (error) {
      const area = document.createElement("textarea"); area.value = code; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
    }
    button.dataset.copiedLabel = CHECKOUT_I18N.copy;
    button.classList.add("is-copied");
    window.setTimeout(() => button.classList.remove("is-copied"), 1800);
  }

  function persistPendingPayment(reservation) {
    const record = { reservationCode: reservation.code, lastName: reservation.holder.lastName, holderEmail: reservation.holder.email, createdAt: reservation.createdAt, payload: reservation };
    try {
      sessionStorage.setItem(`mct_pending_payment_${reservation.code}`, JSON.stringify(record));
      localStorage.setItem(`mct_pending_payment_${reservation.code}`, JSON.stringify(record));
      localStorage.setItem(`mct_landing_reservation_${reservation.code}`, "1");
    } catch (error) { /* storage unavailable */ }
  }

  async function processPayPalCheckout(reservation) {
    const submit = document.getElementById("mptPassengerSubmit");
    if (submit) {
      submit.disabled = true;
      submit.textContent = CHECKOUT_I18N.pay;
    }
    setPassengerMessage("", false);
    showCheckoutProcessing(CHECKOUT_I18N.saving);
    try {
      if (!window.MyCuscoTripApiClient?.createPreReservation || !window.MyCuscoTripApiClient?.createPayPalOrder) throw new Error(CHECKOUT_I18N.paymentUnavailable);
      const apiResult = await withTimeout(window.MyCuscoTripApiClient.createPreReservation(reservation), 20000);
      if (!apiResult || apiResult.ok === false || apiResult.mock) throw new Error(apiResult?.message || CHECKOUT_I18N.paymentUnavailable);
      const finalCode = String(apiResult.reservationCode || apiResult.code || reservation.code).trim();
      reservation.code = finalCode;
      reservation.reservationCode = finalCode;
      reservation.sourcePage = window.location.pathname;
      reservation.landingPath = window.location.pathname;
      state.reservationCode = finalCode;
      document.getElementById("mptReservationCode").textContent = finalCode;
      persistPendingPayment(reservation);
      showCheckoutProcessing(CHECKOUT_I18N.connecting);
      const cancelUrl = buildLandingPaymentUrl("cancelled", finalCode);
      const returnUrl = buildPayPalReturnUrl(finalCode);
      const paypalResult = await withTimeout(window.MyCuscoTripApiClient.createPayPalOrder({
        code: finalCode,
        reservationCode: finalCode,
        currency: reservation.currency,
        total: Number(reservation.payNowValue || reservation.pricing.total || 0),
        amountToPayNowValue: Number(reservation.payNowValue || reservation.pricing.total || 0),
        productId: reservation.productId,
        productTitle: reservation.productTitle,
        source: LANDING_ID,
        landingId: LANDING_ID,
        sourcePage: window.location.pathname,
        landingPath: window.location.pathname,
        cancelUrl,
        cancel_url: cancelUrl,
        returnUrl,
        return_url: returnUrl
      }), 20000);
      if (!paypalResult || paypalResult.ok === false || paypalResult.mock) throw new Error(paypalResult?.message || CHECKOUT_I18N.paymentUnavailable);
      if (!paypalResult.approvalUrl) throw new Error(CHECKOUT_I18N.noApproval);
      trackLandingEvent("begin_payment", { reservation_code: finalCode, currency: reservation.currency, value: reservation.pricing.total, payment_provider: "paypal" }, { metaEventName: "InitiateCheckout" });
      window.location.assign(paypalResult.approvalUrl);
    } catch (error) {
      console.error("Landing PayPal checkout error:", error);
      hideCheckoutProcessing();
      setPassengerMessage(error?.body?.message || error?.body?.error || error?.message || CHECKOUT_I18N.backendError, true);
      if (submit) {
        submit.disabled = false;
        submit.textContent = CHECKOUT_I18N.pay;
      }
    }
  }

  async function handlePassengerFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.reviewConfirmed !== "true") {
      const result = collectPassengerForm();
      if (!result) return;
      const reservation = buildReservationObject(result.holder, result.holderTravels, result.passengers);
      state.lastReservation = reservation;
      renderPaymentReview(reservation);
      form.dataset.reviewConfirmed = "true";
      setPassengerMessage("", false);
      return;
    }
    if (!state.lastReservation) { resetPassengerReview(); return; }
    await processPayPalCheckout(state.lastReservation);
  }

  function bindPassengerModalEvents() {
    const modal = document.getElementById("mptPassengerModal");
    modal?.querySelectorAll("[data-close-passenger-modal]").forEach((button) => button.addEventListener("click", closePassengerModal));
    document.getElementById("mptPassengerClose")?.addEventListener("click", closePassengerModal);
    document.getElementById("mptReservationCodeCopy")?.addEventListener("click", copyReservationCode);
    document.getElementById("mptPassengerForm")?.addEventListener("submit", handlePassengerFormSubmit);
    document.getElementById("mptPassengerCancel")?.addEventListener("click", () => {
      const form = document.getElementById("mptPassengerForm");
      if (form?.dataset.reviewConfirmed === "true") { resetPassengerReview(); return; }
      closePassengerModal();
    });
  }

  function onContinueClick() {
    const valid = validateAllDates();
    if (!valid) {
      trackLandingEvent("date_validation_error", {});
      const firstError = document.querySelector(".mpt-field-error:not(:empty)");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (shouldShowUpsell()) { openUpsellModal(); return; }
    openPassengerModal();
  }

  function syncStickySummaryOffset() {
    const header = document.querySelector("#header-container header, #header-container .header, #header-container .site-header");
    const height = Math.ceil(header?.getBoundingClientRect?.().height || 80);
    document.documentElement.style.setProperty("--mpt-sticky-offset", `${height + 16}px`);
  }

    // ---------- Event wiring ----------

  function bindGlobalEvents() {
    document.querySelectorAll("[data-mpt-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".mpt-modal");
        if (modal) closeModal(modal);
      });
    });

    document.getElementById("mptUpsellViewAddons").addEventListener("click", () => {
      markUpsellShown();
      closeModal(document.getElementById("mptUpsellModal"));
      trackLandingEvent("upsell_modal_addons_click", {});
      document.getElementById("tours-complementarios").scrollIntoView({ behavior: "smooth", block: "start" });
      highlightAddonCards();
    });

    document.getElementById("mptUpsellContinueAlone").addEventListener("click", () => {
      markUpsellShown();
      closeModal(document.getElementById("mptUpsellModal"));
      trackLandingEvent("upsell_modal_continue_single", {});
      openPassengerModal();
    });

    bindPassengerModalEvents();

    document.getElementById("mptMobileBarContinue").addEventListener("click", onContinueClick);

    document.querySelectorAll("[data-mpt-scroll-to]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.mptScrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });


    const addonsGrid = document.getElementById("mptAddonsGrid");
    addonsGrid.addEventListener("change", (e) => {
      const checkbox = e.target.closest('.mpt-card__checkbox input[type="checkbox"]');
      if (checkbox) {
        toggleAddon(checkbox.dataset.addonId, checkbox.checked);
        return;
      }
      const extraToggle = e.target.closest("[data-extra-toggle]");
      if (extraToggle) {
        const id = extraToggle.dataset.addonId;
        const extraId = extraToggle.dataset.extraId;
        state.addons[id].extras = state.addons[id].extras || {};
        state.addons[id].extras[extraId] = extraToggle.checked;
        renderSummary();
      }
    });
    addonsGrid.addEventListener("click", (e) => {
      const disclosure = e.target.closest("[data-addon-expand]");
      if (disclosure) {
        const id = disclosure.dataset.addonId;
        const card = addonsGrid.querySelector(`.mpt-card[data-addon-id="${id}"]`);
        const expanded = !card.classList.contains("is-expanded");
        card.classList.toggle("is-expanded", expanded);
        disclosure.setAttribute("aria-expanded", expanded ? "true" : "false");
        disclosure.querySelector("span").textContent = expanded ? "Hide details" : "See what is included";
        return;
      }
      const removeBtn = e.target.closest("[data-addon-remove]");
      if (!removeBtn) return;
      const id = removeBtn.dataset.addonId;
      const checkbox = addonsGrid.querySelector(`.mpt-card__checkbox input[data-addon-id="${id}"]`);
      if (checkbox) checkbox.checked = false;
      toggleAddon(id, false);
    });

    const summaryEl = document.getElementById("mptSummary");
    summaryEl.addEventListener("click", (e) => {
      if (e.target.closest("#mptCouponApply")) {
        applyCoupon(document.getElementById("mptCouponInput").value);
      } else if (e.target.closest("#mptCouponRemove")) {
        removeCoupon();
      } else if (e.target.closest("#mptSummaryContinue")) {
        onContinueClick();
      }
    });
    summaryEl.addEventListener("keydown", (e) => {
      if (e.target.id === "mptCouponInput" && e.key === "Enter") {
        e.preventDefault();
        applyCoupon(e.target.value);
      }
    });
  }

  // ---------- Init ----------

  function initState() {
    state.mainProduct.selected = Boolean(state.data.mainProduct.selectedByDefault);
    state.mainProduct.mealOptionId = (state.data.mainProduct.mealOptions || []).find((m) => m.default)?.id || "no-meal";
    (state.data.addons || []).forEach((addon) => {
      state.addons[addon.id] = { selected: false, date: null, extras: {} };
    });
    try {
      state.upsellModalShown = sessionStorage.getItem(UPSELL_SESSION_KEY) === "1";
    } catch (error) {
      state.upsellModalShown = false;
    }
  }

  async function fetchLandingData() {
    const basePath = getSiteBasePath();
    const response = await fetch(`${basePath}assets/data/i18n/en/landing-machu-picchu-tours.json`.replace(/([^:]\/)\/{2,}/g, "$1"), { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the landing page information.");
    return response.json();
  }

  async function initLanding() {
    captureAttribution();

    await Promise.all([
      loadLandingComponent("header", "header-container"),
      loadLandingComponent("footer", "footer-container")
    ]);
    if (typeof window.initMyCuscoTripHeader === "function") {
      try {
        window.initMyCuscoTripHeader();
      } catch (error) {
        console.warn("Header JavaScript was not initialized:", error);
      }
    }
    syncStickySummaryOffset();
    window.addEventListener("resize", syncStickySummaryOffset, { passive: true });

    document.querySelectorAll(".mpt-hero__video--desktop").forEach((video) => { video.playbackRate = 0.6; });
    document.querySelectorAll(".mpt-hero__video--mobile").forEach((video) => { video.playbackRate = 0.8; });

    try {
      state.data = await fetchLandingData();
    } catch (error) {
      console.error(error);
      return;
    }

    initState();
    restoreDraftIfAny();
    const cancelledPayment = getCancelledPaymentContext();
    if (cancelledPayment?.reservation) applyReservationSelectionToState(cancelledPayment.reservation);
    renderMainProduct();
    renderAddons();
    bindGlobalEvents();
    validateAllDates({ silent: true });
    renderSummary();
    trackLandingEvent("landing_view", {});
    if (cancelledPayment?.reservation) {
      await openPassengerModal({ reservation: cancelledPayment.reservation, paymentCancelled: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLanding, { once: true });
  } else {
    initLanding();
  }

  // Exposed for automated testing (Playwright) — not used by the page itself.
  window.__mptLanding = { validateDestinationTransition, calculateBookingSummary, getState: () => state };
})();
