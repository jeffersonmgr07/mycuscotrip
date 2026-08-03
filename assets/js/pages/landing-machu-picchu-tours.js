(function () {
  "use strict";

  const LANDING_ID = "landing-machu-picchu-tours";
  const LANDING_NAME = "Machu Picchu + Tours en Perú";
  const DRAFT_KEY = "mct_landing_draft_machu-picchu-y-tours-peru";
  const DRAFT_TTL_MS = 90 * 60 * 1000;
  const UPSELL_SESSION_KEY = "mpt_upsell_shown";
  const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

  const state = {
    data: null,
    adults: 2,
    children: 0,
    mainProduct: { selected: true, date: null, mealOptionId: "no-meal" },
    addons: {},
    coupon: null,
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
      console.warn(`No se pudo cargar el componente ${componentName}:`, error);
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
    return Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    if (!date) return "sin fecha";
    return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
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
        coupon: state.coupon
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
      if (snapshot.coupon) state.coupon = snapshot.coupon;
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
            message: "Para viajar entre Lima/Ica y Cusco necesitas al menos un día para el traslado. Selecciona una fecha posterior para continuar.",
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
        if (!silent) setFieldError(t.id, "Selecciona una fecha para continuar.");
      } else if (t.date < todayStr) {
        valid = false;
        if (!silent) setFieldError(t.id, "La fecha no puede ser anterior a hoy.");
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
        if (!silent) ids.forEach((id) => setFieldError(id, "Dos tours no pueden tener la misma fecha."));
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
    const el = document.getElementById("mptCouponMessage");
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("is-error", "is-success");
    if (type === "error") el.classList.add("is-error");
    if (type === "success") el.classList.add("is-success");
  }

  async function validateCouponLocally(code) {
    try {
      const basePath = getSiteBasePath();
      const response = await fetch(`${basePath}assets/data/discount-codes.json`.replace(/([^:]\/)\/{2,}/g, "$1"), { cache: "no-store" });
      const list = await response.json();
      const found = (Array.isArray(list) ? list : []).find((item) => String(item.code || "").toUpperCase() === code);
      if (!found || !found.active) {
        return { valid: false, message: "Código no válido o inactivo." };
      }
      if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
        return { valid: false, message: "Este código de descuento ha expirado." };
      }
      return { valid: true, couponCode: found.code, type: found.type, value: found.value, currency: found.currency, label: found.label };
    } catch (error) {
      return { valid: false, message: "No se pudo validar el cupón en este momento." };
    }
  }

  async function applyCoupon(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) {
      state.coupon = null;
      setCouponMessage("Ingresa un código de descuento.", "error");
      renderSummary();
      return;
    }
    setCouponMessage("Validando código…", "");

    let result = null;
    try {
      if (window.MyCuscoTripApiClient?.validateCoupon) {
        const apiResult = await withTimeout(window.MyCuscoTripApiClient.validateCoupon(code), 4000);
        if (apiResult && !apiResult.mock) result = apiResult;
      }
    } catch (error) {
      result = null;
    }
    if (!result) result = await validateCouponLocally(code);

    if (!result.valid) {
      state.coupon = null;
      setCouponMessage(result.message || "Código no válido o inactivo.", "error");
      renderSummary();
      trackLandingEvent("coupon_applied", { coupon_code: code, coupon_valid: false });
      return;
    }

    state.coupon = {
      code: result.couponCode || code,
      type: result.type || "percent",
      value: Number(result.value ?? result.discountPercent ?? 0),
      currency: result.currency || state.data.currency
    };
    setCouponMessage(`Cupón aplicado: ${result.label || state.coupon.code}.`, "success");
    renderSummary();
    trackLandingEvent("coupon_applied", {
      coupon_code: state.coupon.code,
      coupon_valid: true,
      coupon_type: state.coupon.type,
      coupon_value: state.coupon.value
    });
  }

  function removeCoupon() {
    state.coupon = null;
    const input = document.getElementById("mptCouponInput");
    if (input) input.value = "";
    setCouponMessage("", "");
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
        <span class="mpt-main-product__flag"><i class="fas fa-star"></i> ${escapeHtml(p.badge || "Experiencia principal")}</span>
        <div class="mpt-main-product__grid">
          <div class="mpt-main-product__media">
            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="eager" fetchpriority="high"/>
          </div>
          <div class="mpt-main-product__body">
            <h3>${escapeHtml(p.title)}</h3>
            <p class="mpt-main-product__desc">${escapeHtml(p.shortDescription)}</p>
            <div class="mpt-price-row">
              <div class="mpt-price-pill"><span>Adulto</span><strong>${formatCurrency(p.adultPrice, currency)}</strong></div>
              <div class="mpt-price-pill"><span>Niño (${childPolicy.minAge}-${childPolicy.maxAge} años)</span><strong>${formatCurrency(childPrice, currency)}</strong></div>
            </div>
            <div class="mpt-field-grid">
              <div class="mpt-field">
                <label for="${dateInputId(p.id)}">Fecha</label>
                <input id="${dateInputId(p.id)}" type="text" placeholder="Selecciona una fecha" readonly aria-describedby="${errorId(p.id)}"/>
                <span class="mpt-field-error" id="${errorId(p.id)}" role="alert"></span>
              </div>
              <div class="mpt-field">
                <label for="mptAdults">Adultos</label>
                <select id="mptAdults" aria-label="Cantidad de adultos para toda la reserva">${qtyOptions(1, 10, state.adults)}</select>
              </div>
              <div class="mpt-field">
                <label for="mptChildren">Niños</label>
                <select id="mptChildren" aria-label="Cantidad de niños para toda la reserva">${qtyOptions(0, 10, state.children)}</select>
              </div>
            </div>
            <div>
              <strong style="font-size:0.85rem;">Incluye:</strong>
              <ul class="mpt-includes">${(p.includes || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
            </div>
            <div>
              <strong style="font-size:0.85rem;">Alimentación (opcional):</strong>
              <div class="mpt-meal-options" role="radiogroup" aria-label="Opciones de alimentación">
                ${(p.mealOptions || []).map((m) => `
                  <label class="mpt-meal-option">
                    <span>${escapeHtml(m.label)}${m.pricePerPerson > 0 ? ` (+${formatCurrency(m.pricePerPerson, currency)}/persona)` : " (incluido sin costo)"}</span>
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
      altFormat: "d M Y",
      locale: "es",
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
      return `
        <div class="mpt-card${sel.selected ? " is-selected" : ""}" data-addon-id="${escapeHtml(addon.id)}">
          <div class="mpt-card__media">
            <img src="${escapeHtml(addon.image)}" alt="${escapeHtml(addon.title)}" loading="lazy"/>
          </div>
          <div class="mpt-card__body">
            <h3>${escapeHtml(addon.title)}</h3>
            <div class="mpt-card__price">${formatCurrency(addon.pricePerPerson, currency)} / persona</div>
            <p class="mpt-card__desc">${escapeHtml(addon.shortDescription)}</p>
            <ul class="mpt-card__includes">${(addon.includes || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
            ${addon.excludesNote ? `<p style="color:#b3261e; font-size:0.8rem; font-weight:700;">${escapeHtml(addon.excludesNote)}</p>` : ""}
            <div class="mpt-card__toggle-row">
              <label class="mpt-card__checkbox">
                <input type="checkbox" data-addon-id="${escapeHtml(addon.id)}" ${sel.selected ? "checked" : ""}/>
                Agregar a mi viaje
              </label>
            </div>
            <div class="mpt-card__details">
              <div class="mpt-field">
                <label for="${dateInputId(addon.id)}">Fecha de ${escapeHtml(addon.title)}</label>
                <input id="${dateInputId(addon.id)}" type="text" placeholder="Selecciona una fecha" readonly aria-describedby="${errorId(addon.id)}"/>
                <span class="mpt-field-error" id="${errorId(addon.id)}" role="alert"></span>
              </div>
              ${(addon.extras || []).map((extra) => `
                <label class="mpt-card__extra">
                  <input type="checkbox" data-extra-toggle data-addon-id="${escapeHtml(addon.id)}" data-extra-id="${escapeHtml(extra.id)}" ${sel.extras?.[extra.id] ? "checked" : ""}/>
                  ${escapeHtml(extra.label)} (+${formatCurrency(extra.pricePerPerson, currency)}/persona)
                </label>
              `).join("")}
              <button type="button" class="mpt-card__remove" data-addon-remove data-addon-id="${escapeHtml(addon.id)}">Quitar de mi viaje</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    (state.data.addons || []).forEach((addon) => {
      const sel = state.addons[addon.id];
      const dateInput = document.getElementById(dateInputId(addon.id));
      state.pickers[addon.id] = window.flatpickr(dateInput, {
        minDate: "today",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y",
        locale: "es",
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

  // ---------- Rendering: "qué incluye" grid (section 6, static per JSON) ----------

  function renderIncludesGrid() {
    const grid = document.getElementById("mptIncludesGrid");
    if (!grid) return;
    const items = [state.data.mainProduct, ...(state.data.addons || [])];
    grid.innerHTML = items.map((item) => `
      <div class="mpt-card">
        <div class="mpt-card__media"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy"/></div>
        <div class="mpt-card__body">
          <h3>${escapeHtml(item.title)}</h3>
          <ul class="mpt-card__includes">${(item.includes || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
          ${item.excludesNote ? `<p style="color:#b3261e; font-size:0.8rem; font-weight:700;">${escapeHtml(item.excludesNote)}</p>` : ""}
        </div>
      </div>
    `).join("");
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

    const restoredNote = state.restoredFromDraft
      ? `<div class="mpt-summary__alert"><i class="fas fa-clock-rotate-left"></i> Recuperamos tu selección anterior.</div>`
      : "";

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
      ${restoredNote}
      <div id="mptOperationalWarnings"></div>
      <div class="mpt-summary__travelers">
        <span><i class="fas fa-user"></i> ${summary.adults} adulto(s)</span>
        <span><i class="fas fa-child"></i> ${summary.children} niño(s)</span>
      </div>
      <div class="mpt-summary__list">${linesHtml || '<p style="color:var(--mct-muted,#6c7a76); font-size:0.88rem;">Aún no has agregado experiencias.</p>'}</div>

      <div class="mpt-coupon">
        <input id="mptCouponInput" type="text" placeholder="Código de descuento" aria-label="Código de descuento" value="${escapeHtml(state.coupon?.code || "")}"/>
        <button class="mpt-btn mpt-btn--secondary" id="mptCouponApply" type="button" style="width:auto; padding:0 18px;">Aplicar</button>
      </div>
      ${state.coupon ? `<button class="mpt-card__remove" id="mptCouponRemove" type="button" style="margin-bottom:8px;">Quitar cupón</button>` : ""}
      <p class="mpt-coupon-message" id="mptCouponMessage"></p>

      <div class="mpt-summary__totals">
        <div class="mpt-summary__totals-row"><span>Subtotal</span><strong>${formatCurrency(summary.subtotal, currency)}</strong></div>
        ${summary.discount > 0 ? `<div class="mpt-summary__totals-row mpt-summary__discount"><span>Descuento</span><strong>-${formatCurrency(summary.discount, currency)}</strong></div>` : ""}
        <div class="mpt-summary__totals-row mpt-summary__total"><span>Total</span><span aria-live="polite">${formatCurrency(summary.total, currency)}</span></div>
      </div>

      <button class="mpt-btn mpt-btn--primary" id="mptSummaryContinue" type="button" style="margin-top:14px;">Continuar con mi reserva</button>
      <p class="mpt-availability-note">Las fechas y horarios están sujetos a disponibilidad. Nuestro equipo verificará entradas, trenes y operación antes de emitir los servicios.</p>
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

  // ---------- Passenger form ----------

  function renderPassengerFields() {
    const totalPax = state.adults + state.children;
    const container = document.getElementById("mptPassengerFields");
    let html = `
      <fieldset style="border:none; padding:0; margin:0 0 18px;">
        <legend style="font-weight:800; color:var(--color-primary,#062803); margin-bottom:10px;">Titular de la reserva (viajero 1)</legend>
        <div class="mpt-field-grid">
          <div class="mpt-field"><label for="holderFirstName">Nombres</label><input id="holderFirstName" name="holderFirstName" required minlength="2" type="text"/></div>
          <div class="mpt-field"><label for="holderLastName">Apellidos</label><input id="holderLastName" name="holderLastName" required minlength="2" type="text"/></div>
          <div class="mpt-field">
            <label for="holderDocumentType">Tipo de documento</label>
            <select id="holderDocumentType" name="holderDocumentType" required>
              <option value="">Selecciona</option>
              <option value="passport">Pasaporte</option>
              <option value="dni">DNI</option>
              <option value="id_card">Documento de identidad</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div class="mpt-field"><label for="holderDocumentNumber">N° de documento</label><input id="holderDocumentNumber" name="holderDocumentNumber" required type="text"/></div>
          <div class="mpt-field"><label for="holderNationality">Nacionalidad</label><input id="holderNationality" name="holderNationality" required type="text"/></div>
          <div class="mpt-field"><label for="holderBirthdate">Fecha de nacimiento</label><input id="holderBirthdate" name="holderBirthdate" required type="date"/></div>
          <div class="mpt-field"><label for="holderEmail">Correo</label><input id="holderEmail" name="holderEmail" required type="email"/></div>
          <div class="mpt-field"><label for="holderWhatsapp">WhatsApp (con código de país)</label><input id="holderWhatsapp" name="holderWhatsapp" required type="tel" placeholder="+51 900 000 000"/></div>
        </div>
      </fieldset>
    `;
    for (let n = 2; n <= totalPax; n += 1) {
      html += `
        <fieldset style="border:1px solid var(--mct-border,rgba(23,43,39,.14)); border-radius:12px; padding:14px; margin-bottom:14px;">
          <legend style="font-weight:800; color:var(--color-primary,#062803); padding:0 6px;">Viajero ${n}</legend>
          <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; margin-bottom:10px;">
            <input type="checkbox" name="passenger_${n}_complete_later"/> Completar estos datos después
          </label>
          <div class="mpt-field-grid" data-passenger-fields="${n}">
            <div class="mpt-field"><label for="passenger_${n}_firstName">Nombres</label><input id="passenger_${n}_firstName" name="passenger_${n}_firstName" type="text"/></div>
            <div class="mpt-field"><label for="passenger_${n}_lastName">Apellidos</label><input id="passenger_${n}_lastName" name="passenger_${n}_lastName" type="text"/></div>
            <div class="mpt-field">
              <label for="passenger_${n}_documentType">Tipo de documento</label>
              <select id="passenger_${n}_documentType" name="passenger_${n}_documentType">
                <option value="">Selecciona</option>
                <option value="passport">Pasaporte</option>
                <option value="dni">DNI</option>
                <option value="id_card">Documento de identidad</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div class="mpt-field"><label for="passenger_${n}_documentNumber">N° de documento</label><input id="passenger_${n}_documentNumber" name="passenger_${n}_documentNumber" type="text"/></div>
            <div class="mpt-field"><label for="passenger_${n}_nationality">Nacionalidad</label><input id="passenger_${n}_nationality" name="passenger_${n}_nationality" type="text"/></div>
            <div class="mpt-field"><label for="passenger_${n}_birthdate">Fecha de nacimiento</label><input id="passenger_${n}_birthdate" name="passenger_${n}_birthdate" type="date"/></div>
          </div>
        </fieldset>
      `;
    }
    container.innerHTML = html;
  }

  function validateAndCollectPassengerForm() {
    const form = document.getElementById("mptPassengerForm");
    if (!form.reportValidity()) return null;
    const data = new FormData(form);
    const holder = {
      role: "holder",
      firstName: String(data.get("holderFirstName") || "").trim(),
      lastName: String(data.get("holderLastName") || "").trim(),
      documentType: String(data.get("holderDocumentType") || "").trim(),
      documentNumber: String(data.get("holderDocumentNumber") || "").trim(),
      nationality: String(data.get("holderNationality") || "").trim(),
      birthdate: String(data.get("holderBirthdate") || "").trim(),
      email: String(data.get("holderEmail") || "").trim(),
      whatsapp: String(data.get("holderWhatsapp") || "").trim()
    };
    const totalPax = state.adults + state.children;
    const passengers = [];
    for (let n = 2; n <= totalPax; n += 1) {
      const completeLater = data.get(`passenger_${n}_complete_later`) === "on";
      passengers.push({
        role: "traveler",
        completionStatus: completeLater ? "pending" : "provided",
        firstName: String(data.get(`passenger_${n}_firstName`) || "").trim(),
        lastName: String(data.get(`passenger_${n}_lastName`) || "").trim(),
        documentType: String(data.get(`passenger_${n}_documentType`) || "").trim(),
        documentNumber: String(data.get(`passenger_${n}_documentNumber`) || "").trim(),
        nationality: String(data.get(`passenger_${n}_nationality`) || "").trim(),
        birthdate: String(data.get(`passenger_${n}_birthdate`) || "").trim()
      });
    }
    return { holder, passengers };
  }

  // ---------- Reservation building + hand-off ----------

  function buildReservationObject(holder, passengers) {
    const summary = calculateBookingSummary();
    const services = [];
    if (state.mainProduct.selected) {
      services.push({
        id: state.data.mainProduct.id,
        title: state.data.mainProduct.title,
        date: state.mainProduct.date,
        extras: state.mainProduct.mealOptionId && state.mainProduct.mealOptionId !== "no-meal" ? [state.mainProduct.mealOptionId] : []
      });
    }
    (state.data.addons || []).forEach((addon) => {
      const sel = state.addons[addon.id];
      if (!sel?.selected) return;
      services.push({
        id: addon.id,
        title: addon.title,
        date: sel.date,
        extras: Object.keys(sel.extras || {}).filter((k) => sel.extras[k])
      });
    });

    if (!state.reservationCode) state.reservationCode = generateReservationCode();

    return {
      reservationCode: state.reservationCode,
      source: LANDING_ID,
      createdAt: new Date().toISOString(),
      travelers: { adults: state.adults, children: state.children, passengers: [holder, ...passengers] },
      services,
      discount: state.coupon ? { code: state.coupon.code, type: state.coupon.type, value: state.coupon.value, amount: summary.discount } : {},
      pricing: { subtotal: summary.subtotal, discount: summary.discount, total: summary.total, currency: summary.currency },
      attribution: getAttribution()
    };
  }

  function buildWhatsAppLink(reservation) {
    const template = state.data.whatsapp.messageTemplate;
    const servicesSummary = reservation.services.map((s) => `${s.title} (${formatDateSpanish(s.date)})`).join(", ");
    const text = template
      .replace("{reservationCode}", reservation.reservationCode)
      .replace("{servicesSummary}", servicesSummary)
      .replace("{totalPassengers}", String(reservation.travelers.adults + reservation.travelers.children))
      .replace("{currency}", reservation.pricing.currency)
      .replace("{total}", formatMoney(reservation.pricing.total))
      .replace("{source}", reservation.source);
    return `https://wa.me/${state.data.whatsapp.phone}?text=${encodeURIComponent(text)}`;
  }

  async function finalizeReservation(holder, passengers, options) {
    trackLandingEvent("passenger_form_started", {});
    const reservation = buildReservationObject(holder, passengers);

    try {
      localStorage.setItem(`mct_landing_reservation_${reservation.reservationCode}`, "1");
    } catch (error) {
      /* storage unavailable */
    }
    clearDraftState();

    trackLandingEvent("pre_reservation_created", {
      reservation_code: reservation.reservationCode,
      total: reservation.pricing.total,
      currency: reservation.pricing.currency,
      services_count: reservation.services.length
    });

    try {
      trackLandingEvent("checkout_started", { reservation_code: reservation.reservationCode });
      trackLandingEvent("payment_started", { reservation_code: reservation.reservationCode }, { metaEventName: "InitiateCheckout" });
      if (window.MyCuscoTripApiClient?.createPreReservation) {
        await withTimeout(window.MyCuscoTripApiClient.createPreReservation(reservation), 4000);
      }
    } catch (error) {
      /* mock-safe: pre-reservation still recorded locally */
    }

    closeModal(document.getElementById("mptPassengerModal"));

    if (options?.openWhatsapp) {
      trackLandingEvent("whatsapp_click", { reservation_code: reservation.reservationCode });
      window.open(buildWhatsAppLink(reservation), "_blank", "noopener");
    }

    showConfirmation(reservation);
  }

  function showConfirmation(reservation) {
    state.lastReservation = reservation;
    document.getElementById("mptConfirmationCode").textContent = reservation.reservationCode;
    openModal(document.getElementById("mptConfirmationModal"));
  }

  function openPassengerModal() {
    renderPassengerFields();
    openModal(document.getElementById("mptPassengerModal"));
  }

  function onContinueClick() {
    const valid = validateAllDates();
    if (!valid) {
      trackLandingEvent("date_validation_error", {});
      const firstError = document.querySelector(".mpt-field-error:not(:empty)");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (shouldShowUpsell()) {
      openUpsellModal();
      return;
    }
    openPassengerModal();
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

    document.getElementById("mptPassengerForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const result = validateAndCollectPassengerForm();
      if (!result) return;
      finalizeReservation(result.holder, result.passengers, { openWhatsapp: false });
    });

    document.getElementById("mptPassengerWhatsapp").addEventListener("click", () => {
      const result = validateAndCollectPassengerForm();
      if (!result) return;
      finalizeReservation(result.holder, result.passengers, { openWhatsapp: true });
    });

    document.getElementById("mptPassengerFields").addEventListener("change", (e) => {
      const checkbox = e.target.closest('[name$="_complete_later"]');
      if (!checkbox) return;
      const match = checkbox.name.match(/passenger_(\d+)_complete_later/);
      if (!match) return;
      const fieldsWrap = document.querySelector(`[data-passenger-fields="${match[1]}"]`);
      fieldsWrap?.querySelectorAll("input,select").forEach((el) => {
        el.disabled = checkbox.checked;
      });
    });

    document.getElementById("mptMobileBarContinue").addEventListener("click", onContinueClick);

    document.querySelectorAll("[data-mpt-scroll-to]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.mptScrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.getElementById("mptConfirmationWhatsapp").addEventListener("click", () => {
      if (state.lastReservation) window.open(buildWhatsAppLink(state.lastReservation), "_blank", "noopener");
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
    const response = await fetch(`${basePath}assets/data/landing-machu-picchu-tours.json`.replace(/([^:]\/)\/{2,}/g, "$1"), { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar la información de la landing.");
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
        console.warn("Header JS no inicializado:", error);
      }
    }

    try {
      state.data = await fetchLandingData();
    } catch (error) {
      console.error(error);
      return;
    }

    initState();
    restoreDraftIfAny();
    renderMainProduct();
    renderAddons();
    renderIncludesGrid();
    bindGlobalEvents();
    validateAllDates({ silent: true });
    renderSummary();
    trackLandingEvent("landing_view", {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLanding, { once: true });
  } else {
    initLanding();
  }

  // Exposed for automated testing (Playwright) — not used by the page itself.
  window.__mptLanding = { validateDestinationTransition, calculateBookingSummary, getState: () => state };
})();
