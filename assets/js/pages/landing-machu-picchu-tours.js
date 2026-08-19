(function () {
  "use strict";

  const LANDING_ID = "landing-machu-picchu-tours";
  const LANDING_NAME = "Machu Picchu + Tours en Perú";
  const DRAFT_KEY = "mct_landing_draft_machu-picchu-y-tours-peru-v5";
  const DRAFT_TTL_MS = 90 * 60 * 1000;
  const UPSELL_SESSION_KEY = "mpt_upsell_shown";
  const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

  const state = {
    data: null,
    adults: 1,
    children: 0,
    infants: 0,
    mainProduct: {
      selected: true,
      date: null,
      circuitId: null,
      outboundTrainId: null,
      returnTrainId: null,
      mealOptionId: "no-meal"
    },
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
        infants: state.infants,
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
      if (typeof snapshot.infants === "number") state.infants = snapshot.infants;
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

  function getPayingPassengerCount() {
    return state.adults + state.children;
  }

  function getTotalTravelerCount() {
    return getPayingPassengerCount() + state.infants;
  }

  function getChildPrice(product) {
    if (Number.isFinite(Number(product?.childPrice))) return Number(product.childPrice);
    if (String(product?.childPricing?.type || "") === "fixed" && Number.isFinite(Number(product?.childPricing?.price))) {
      return Number(product.childPricing.price);
    }
    const childDiscount = Number(product?.childPricing?.discountAmount || 0);
    return Math.max(0, Number(product?.adultPrice || 0) - childDiscount);
  }

  function findSelectedCircuit(product) {
    return (product?.circuitSelection?.options || []).find((item) => item.id === state.mainProduct.circuitId) || null;
  }

  function getCircuitAvailability(circuit, dateStr) {
    if (!circuit || !dateStr) return { available: false, reason: "Selecciona una fecha" };
    const range = (circuit.unavailableRanges || []).find((item) => dateStr >= item.from && dateStr <= item.to);
    return range ? { available: false, reason: range.reason || "No disponible" } : { available: true, reason: "Disponible" };
  }

  function getSelectedTrainPricing(product) {
    const config = product?.trainSelection || {};
    const outbound = (config.outbound || []).find((item) => item.id === state.mainProduct.outboundTrainId) || (config.outbound || [])[0] || null;
    const returnTrain = (config.return || []).find((item) => item.id === state.mainProduct.returnTrainId) || (config.return || [])[0] || null;
    const bundle = (config.bundles || []).find((item) => item.outboundId === outbound?.id && item.returnId === returnTrain?.id) || null;
    const adultSupplement = Number(bundle?.adultSupplement ?? (Number(outbound?.adultSupplement || 0) + Number(returnTrain?.adultSupplement || 0)));
    const childSupplement = Number(bundle?.childSupplement ?? (Number(outbound?.childSupplement || 0) + Number(returnTrain?.childSupplement || 0)));
    return {
      outbound,
      returnTrain,
      bundle,
      adultSupplement,
      childSupplement,
      total: round2((state.adults * adultSupplement) + (state.children * childSupplement))
    };
  }

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

    if (state.mainProduct.selected && state.mainProduct.date) {
      const circuits = state.data?.mainProduct?.circuitSelection?.options || [];
      const availableCircuits = circuits.filter((circuit) => getCircuitAvailability(circuit, state.mainProduct.date).available);
      const selectedCircuit = findSelectedCircuit(state.data.mainProduct);
      if (!availableCircuits.length) {
        valid = false;
        if (!silent) setFieldError("circuit-selection", "No hay circuitos disponibles para esta fecha. Selecciona otro día.");
      } else if (!selectedCircuit) {
        valid = false;
        if (!silent) setFieldError("circuit-selection", "Selecciona uno de los circuitos disponibles.");
      } else if (!getCircuitAvailability(selectedCircuit, state.mainProduct.date).available) {
        valid = false;
        if (!silent) setFieldError("circuit-selection", "El circuito seleccionado no está disponible para esta fecha.");
      }
    }

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
    const payingPax = getPayingPassengerCount();
    const lines = [];
    let subtotal = 0;

    if (state.mainProduct.selected) {
      const p = data.mainProduct;
      const childPrice = getChildPrice(p);
      const adultsTotal = state.adults * p.adultPrice;
      const childrenTotal = state.children * childPrice;
      const meal = (p.mealOptions || []).find((m) => m.id === state.mainProduct.mealOptionId) || p.mealOptions[0];
      const mealTotal = (meal?.pricePerPerson || 0) * payingPax;
      const trainPricing = getSelectedTrainPricing(p);
      const selectedCircuit = findSelectedCircuit(p);
      const circuitAvailable = selectedCircuit && getCircuitAvailability(selectedCircuit, state.mainProduct.date).available;
      const circuitSupplement = circuitAvailable ? Number(selectedCircuit.groupSupplement || 0) : 0;
      const lineTotal = adultsTotal + childrenTotal + mealTotal + trainPricing.total + circuitSupplement;
      subtotal += lineTotal;
      lines.push({
        id: p.id,
        title: p.title,
        date: state.mainProduct.date,
        adultPrice: p.adultPrice,
        childPrice,
        circuitLabel: selectedCircuit?.label || null,
        circuitSupplement,
        outboundTrainLabel: trainPricing.outbound?.label || null,
        returnTrainLabel: trainPricing.returnTrain?.label || null,
        trainBundleLabel: trainPricing.bundle?.label || null,
        trainTotal: trainPricing.total,
        mealLabel: meal && meal.pricePerPerson > 0 ? meal.label : null,
        mealTotal,
        lineTotal
      });
    }

    (data.addons || []).forEach((addon) => {
      const sel = state.addons[addon.id];
      if (!sel || !sel.selected) return;
      const baseTotal = addon.pricePerPerson * payingPax;
      let extrasTotal = 0;
      const extraLabels = [];
      (addon.extras || []).forEach((extra) => {
        if (sel.extras && sel.extras[extra.id]) {
          extrasTotal += extra.pricePerPerson * payingPax;
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
      infants: state.infants,
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
      setCouponMessage("Ingresa un código de descuento.", "error");
      return;
    }

    setCouponMessage("Validando código…", "");

    try {
      if (!window.MyCuscoTripApiClient?.validateCoupon) {
        throw new Error("No pudimos validar el cupón en este momento. Inténtalo nuevamente.");
      }

      const summary = calculateBookingSummary();
      const validationPromise = window.MyCuscoTripApiClient.validateCoupon({
        couponCode: code,
        subtotal: Number(summary.subtotal || 0),
        currency: summary.currency || state.data.currency || "USD",
        locale: "es",
        page: window.location.pathname
      });
      const result = await Promise.race([
        validationPromise,
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("La validación tardó demasiado. Inténtalo nuevamente.")), 12000))
      ]);

      if (!result || result.mock) {
        throw new Error("No pudimos validar el cupón en este momento. Inténtalo nuevamente.");
      }

      if (!result.valid) {
        state.coupon = null;
        renderSummary();
        setCouponMessage(result.message || "Código no válido o inactivo.", "error");
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
      setCouponMessage(`Cupón aplicado: ${result.label || state.coupon.code}.`, "success");
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
      setCouponMessage(error?.message || "No pudimos validar el cupón en este momento. Inténtalo nuevamente.", "error");
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

  function formatTrainSupplement(option, currency) {
    const adult = Number(option?.adultSupplement || 0);
    const child = Number(option?.childSupplement || 0);
    if (!adult && !child) return "Incluido";
    return `+${formatCurrency(adult, currency)} adulto · +${formatCurrency(child, currency)} niño`;
  }

  function renderTrainOptions(options, selectedId, name, currency) {
    return (options || []).map((option) => `
      <label class="mpt-choice-card${selectedId === option.id ? " is-selected" : ""}">
        <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.id)}" ${selectedId === option.id ? "checked" : ""}/>
        <span class="mpt-choice-card__content">
          <span class="mpt-choice-card__title-row">
            <strong>${escapeHtml(option.label)}</strong>
            ${option.badge ? `<small class="mpt-choice-card__badge">${escapeHtml(option.badge)}</small>` : ""}
          </span>
          <small>${escapeHtml(option.schedule || "Horario sujeto a confirmación")}</small>
          <span>${escapeHtml(option.description || "")}</span>
          <b>${escapeHtml(formatTrainSupplement(option, currency))}</b>
        </span>
      </label>
    `).join("");
  }

  function renderCircuitOptions() {
    const target = document.getElementById("mptCircuitOptions");
    if (!target) return;
    const product = state.data.mainProduct;
    const circuits = product.circuitSelection?.options || [];
    const dateStr = state.mainProduct.date;
    if (!dateStr) {
      state.mainProduct.circuitId = null;
      target.innerHTML = `<div class="mpt-circuit-placeholder"><i class="fas fa-calendar-day"></i><span>Selecciona primero la fecha de visita para consultar los circuitos.</span></div>`;
      return;
    }

    const selectedCircuit = findSelectedCircuit(product);
    if (selectedCircuit && !getCircuitAvailability(selectedCircuit, dateStr).available) {
      state.mainProduct.circuitId = null;
    }
    const availableCount = circuits.filter((circuit) => getCircuitAvailability(circuit, dateStr).available).length;
    const payingPax = Math.max(1, getPayingPassengerCount());

    target.innerHTML = `
      <div class="mpt-circuit-date"><i class="fas fa-ticket"></i> Disponibilidad para <strong>${escapeHtml(formatDateSpanish(dateStr))}</strong></div>
      <div class="mpt-circuit-grid" role="radiogroup" aria-label="Circuito de Machu Picchu">
        ${circuits.map((circuit) => {
          const status = getCircuitAvailability(circuit, dateStr);
          const supplement = Number(circuit.groupSupplement || 0);
          const selected = state.mainProduct.circuitId === circuit.id;
          const priceText = supplement > 0
            ? `+${formatCurrency(supplement, state.data.currency)} por reserva · ${formatCurrency(supplement / payingPax, state.data.currency)} por viajero pagante en este grupo`
            : "Incluido en la tarifa base";
          return `
            <label class="mpt-circuit-card${selected ? " is-selected" : ""}${status.available ? "" : " is-disabled"}">
              <input type="radio" name="mptCircuit" value="${escapeHtml(circuit.id)}" ${selected ? "checked" : ""} ${status.available ? "" : "disabled"}/>
              <span class="mpt-circuit-card__body">
                <span class="mpt-circuit-card__head">
                  <strong>${escapeHtml(circuit.label)}</strong>
                  <small class="${status.available ? "is-available" : "is-unavailable"}">${escapeHtml(status.reason)}</small>
                </span>
                <span>${escapeHtml(circuit.description || "")}</span>
                <b>${escapeHtml(priceText)}</b>
              </span>
            </label>`;
        }).join("")}
      </div>
      ${availableCount ? "" : `<div class="mpt-circuit-soldout"><i class="fas fa-circle-xmark"></i><div><strong>Sin circuitos disponibles</strong><span>Los circuitos 1, 2 y 3 están agotados para esta fecha. Elige otro día para continuar.</span></div></div>`}
    `;

    target.querySelectorAll('input[name="mptCircuit"]').forEach((radio) => {
      radio.addEventListener("change", (event) => {
        if (!event.target.checked) return;
        state.mainProduct.circuitId = event.target.value;
        setFieldError("circuit-selection", "");
        renderCircuitOptions();
        renderSummary();
        trackLandingEvent("machu_picchu_circuit_selected", { circuit_id: event.target.value, date: state.mainProduct.date });
      });
    });
  }

  function renderMainProduct() {
    const p = state.data.mainProduct;
    const currency = state.data.currency;
    const childPolicy = state.data.childPolicy;
    const childPrice = getChildPrice(p);
    const container = document.getElementById("mptMainProduct");
    if (state.pickers[p.id]?.destroy) state.pickers[p.id].destroy();

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
              <div class="mpt-price-pill"><span>Adulto</span><strong>${formatCurrency(p.adultPrice, currency)}</strong></div>
              <div class="mpt-price-pill"><span>Niño (${childPolicy.minAge}-${childPolicy.maxAge} años)</span><strong>${formatCurrency(childPrice, currency)}</strong></div>
              <div class="mpt-price-pill"><span>Menor de 2 años</span><strong>Gratis</strong><small>Sin asiento propio</small></div>
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
              <div class="mpt-field">
                <label for="mptInfants">Infantes (&lt; 2 años)</label>
                <select id="mptInfants" aria-label="Cantidad de infantes para toda la reserva">${qtyOptions(0, 5, state.infants)}</select>
              </div>
            </div>
            <section class="mpt-config-block" aria-labelledby="mptCircuitTitle">
              <div class="mpt-config-block__head">
                <div><span class="mpt-step">1</span><div><strong id="mptCircuitTitle">Elige tu circuito de Machu Picchu</strong><small>Las opciones se habilitan según la fecha seleccionada.</small></div></div>
              </div>
              <div id="mptCircuitOptions"></div>
              <span class="mpt-field-error" id="${errorId("circuit-selection")}" role="alert"></span>
            </section>
            <div>
              <strong style="font-size:0.85rem;">Incluye:</strong>
              <ul class="mpt-includes">${(p.includes || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
            </div>
            <section class="mpt-config-block" aria-labelledby="mptTrainTitle">
              <div class="mpt-config-block__head">
                <div><span class="mpt-step">2</span><div><strong id="mptTrainTitle">Personaliza tus trenes</strong><small>El Voyager está incluido. Puedes mejorar uno o ambos trayectos.</small></div></div>
              </div>
              <div class="mpt-train-groups">
                <fieldset class="mpt-choice-group">
                  <legend>Tren de ida</legend>
                  ${renderTrainOptions(p.trainSelection?.outbound, state.mainProduct.outboundTrainId, "mptOutboundTrain", currency)}
                </fieldset>
                <fieldset class="mpt-choice-group">
                  <legend>Tren de retorno</legend>
                  ${renderTrainOptions(p.trainSelection?.return, state.mainProduct.returnTrainId, "mptReturnTrain", currency)}
                </fieldset>
              </div>
              <p class="mpt-bundle-note"><i class="fas fa-tags"></i> Si eliges The Prime y el retorno temprano, se aplica automáticamente la tarifa combinada.</p>
            </section>
            <section class="mpt-config-block" aria-labelledby="mptMealTitle">
              <div class="mpt-config-block__head">
                <div><span class="mpt-step">3</span><div><strong id="mptMealTitle">Añade una experiencia gastronómica</strong><small>El almuerzo es opcional y se calcula por viajero pagante.</small></div></div>
              </div>
              <div class="mpt-meal-options" role="radiogroup" aria-label="Opciones de alimentación">
                ${(p.mealOptions || []).map((m) => `
                  <label class="mpt-meal-option">
                    <span>${escapeHtml(m.label)}${m.pricePerPerson > 0 ? ` (+${formatCurrency(m.pricePerPerson, currency)}/persona)` : " (incluido sin costo)"}</span>
                    <input type="radio" name="mptMeal" value="${escapeHtml(m.id)}" ${state.mainProduct.mealOptionId === m.id ? "checked" : ""}/>
                  </label>
                `).join("")}
              </div>
              <p style="color:var(--mct-muted,#6c7a76); font-size:0.78rem; margin-top:6px;">${escapeHtml(p.mealDisclaimer || "")}</p>
            </section>
          </div>
        </div>
      </div>
    `;

    document.getElementById("mptAdults").addEventListener("change", (e) => {
      state.adults = Math.max(1, Number(e.target.value) || 1);
      trackLandingEvent("traveler_count_changed", { adults: state.adults, children: state.children, infants: state.infants });
      renderCircuitOptions();
      renderSummary();
    });
    document.getElementById("mptChildren").addEventListener("change", (e) => {
      state.children = Math.max(0, Number(e.target.value) || 0);
      trackLandingEvent("traveler_count_changed", { adults: state.adults, children: state.children, infants: state.infants });
      renderCircuitOptions();
      renderSummary();
    });
    document.getElementById("mptInfants").addEventListener("change", (e) => {
      state.infants = Math.max(0, Number(e.target.value) || 0);
      trackLandingEvent("traveler_count_changed", { adults: state.adults, children: state.children, infants: state.infants });
      renderSummary();
    });
    container.querySelectorAll('input[name="mptOutboundTrain"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (!e.target.checked) return;
        state.mainProduct.outboundTrainId = e.target.value;
        renderMainProduct();
        renderSummary();
      });
    });
    container.querySelectorAll('input[name="mptReturnTrain"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (!e.target.checked) return;
        state.mainProduct.returnTrainId = e.target.value;
        renderMainProduct();
        renderSummary();
      });
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
        renderCircuitOptions();
        trackLandingEvent("main_product_date_selected", { date: dateStr });
        validateAllDates();
        renderSummary();
      }
    });
    if (state.mainProduct.date) dateInput.value = state.mainProduct.date;
    renderCircuitOptions();
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
              <div class="mpt-card__price">${formatCurrency(addon.pricePerPerson, currency)} / persona</div>
            </div>
            <button class="mpt-card__disclosure" type="button" data-addon-expand data-addon-id="${escapeHtml(addon.id)}" aria-expanded="${sel.selected ? "true" : "false"}" aria-controls="${escapeHtml(detailsId)}">
              <span>Ver qué incluye</span><i class="fas fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="mpt-card__expandable" id="${escapeHtml(detailsId)}">
              <p class="mpt-card__desc">${escapeHtml(addon.shortDescription)}</p>
              <ul class="mpt-card__includes">${(addon.includes || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
              ${addon.excludesNote ? `<p class="mpt-card__excludes">${escapeHtml(addon.excludesNote)}</p>` : ""}
              <div class="mpt-card__toggle-row">
                <label class="mpt-card__checkbox">
                  <input type="checkbox" data-addon-id="${escapeHtml(addon.id)}" ${sel.selected ? "checked" : ""}/>
                  Añadir a mi viaje
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

    const linesHtml = summary.lines.map((line) => {
      const meta = [
        formatDateSpanish(line.date),
        line.circuitLabel,
        line.trainBundleLabel || ([line.outboundTrainLabel, line.returnTrainLabel].filter(Boolean).join(" + ") || null),
        line.mealLabel,
        line.extras && line.extras.length ? line.extras.join(", ") : null
      ].filter(Boolean).join(" · ");
      return `
      <div class="mpt-summary__item">
        <div>
          <div class="mpt-summary__item-name">${escapeHtml(line.title)}</div>
          <div class="mpt-summary__item-meta">${escapeHtml(meta)}</div>
        </div>
        <strong>${formatCurrency(line.lineTotal, currency)}</strong>
      </div>
    `;
    }).join("");

    content.innerHTML = `
      <div id="mptOperationalWarnings"></div>
      <div class="mpt-summary__travelers">
        <span><i class="fas fa-user"></i> ${summary.adults} adulto(s)</span>
        <span><i class="fas fa-child"></i> ${summary.children} niño(s)</span>
        ${summary.infants ? `<span><i class="fas fa-baby"></i> ${summary.infants} infante(s)</span>` : ""}
      </div>
      <div class="mpt-summary__list">${linesHtml || '<p style="color:var(--mct-muted,#6c7a76); font-size:0.88rem;">Aún no has agregado experiencias.</p>'}</div>

      <div class="mpt-coupon">
        <input id="mptCouponInput" type="text" placeholder="Código de descuento" aria-label="Código de descuento" value="${escapeHtml(state.coupon?.code || state.couponDraftCode || "")}"/>
        <button class="mpt-btn mpt-btn--secondary mpt-coupon__apply" id="mptCouponApply" type="button">Aplicar</button>
      </div>
      ${state.coupon ? `<button class="mpt-card__remove" id="mptCouponRemove" type="button" style="margin-bottom:8px;">Quitar cupón</button>` : ""}
      <p class="mpt-coupon-message${state.couponFeedback?.type === "error" ? " is-error" : state.couponFeedback?.type === "success" ? " is-success" : ""}" id="mptCouponMessage">${escapeHtml(state.couponFeedback?.message || "")}</p>

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

  // ---------- Product-style passenger modal + PayPal checkout ----------

  const CHECKOUT_I18N = {"lang": "es", "locale": "es-PE", "name": "Machu Picchu + Tours en Perú", "data": "assets/data/landing-machu-picchu-tours.json", "copy": "Código copiado", "noDate": "sin fecha", "modalTitle": "Datos de los pasajeros", "codeLabel": "Código de reserva:", "payNow": "Monto a pagar ahora:", "important": "Información importante", "importantText": "Ingresa nombres, apellidos y documentos exactamente como figuran en la documentación oficial. Estos datos se utilizarán para emitir entradas, trenes y servicios turísticos.", "holderTitle": "Titular de reserva / Pasajero 1", "holderOnly": "Titular de reserva", "required": "Datos obligatorios para continuar", "first": "Nombres", "last": "Apellidos", "docType": "Tipo de documento", "select": "Selecciona", "passport": "Pasaporte", "dni": "DNI", "idcard": "Documento de identidad", "other": "Otro", "docNum": "Número de documento", "nationality": "Nacionalidad", "selectCountry": "Selecciona país", "selectCode": "Selecciona código", "birth": "Fecha de nacimiento", "whatsapp": "WhatsApp", "email": "Correo", "language": "Idioma solicitado", "pickup": "Hotel o dirección de recojo en Cusco", "pickupPh": "Nombre del hotel y dirección, si la conoces", "holderTravels": "El titular también forma parte del grupo de pasajeros.", "tourists": "Registro de turistas", "touristsNote": "Puedes completar pasajeros adicionales ahora o hasta 15 a 30 días antes del viaje.", "traveler": "Pasajero", "later": "Completar estos datos después", "cancel": "Cancelar", "edit": "Editar datos", "continue": "Continuar", "pay": "Pagar", "saving": "Generando tu reserva…", "connecting": "Conectando de forma segura con PayPal…", "summaryTitle": "Resumen de tu reserva", "review": "Revisa tu reserva antes de pagar", "holder": "Titular", "pickupShort": "Recojo", "services": "Servicios", "total": "Total a pagar", "paypalNote": "Al continuar serás redirigido de forma segura a PayPal para pagar el 100% de la reserva.", "formRequired": "Completa los datos obligatorios para continuar.", "backendError": "No se pudo registrar la reserva ni iniciar PayPal. Revisa la conexión e inténtalo nuevamente.", "noApproval": "PayPal no devolvió un enlace de pago.", "paymentUnavailable": "El backend de pagos no está disponible.", "dateTransition": "Para viajar entre Lima/Ica y Cusco necesitas al menos un día para el traslado. Selecciona una fecha posterior para continuar.", "selectDate": "Selecciona una fecha para continuar.", "pastDate": "La fecha no puede ser anterior a hoy.", "duplicateDate": "Dos tours no pueden tener la misma fecha.", "statusEdit": "Revisa los datos y pulsa continuar.", "reviewButton": "Continuar", "modalAriaClose": "Cerrar modal", "requestedLanguages": ["Español", "English", "Português", "Italiano", "Français", "Deutsch", "日本語", "中文普通话"], "cancelledReturn": "El pago no se completó. Tu reserva sigue guardada y puedes volver a intentarlo.", "processingTitle": "Estamos preparando tu reserva"};

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
    if (Number.isFinite(Number(reservation.infants))) state.infants = Number(reservation.infants);
    const services = Array.isArray(reservation.services) ? reservation.services : [];
    const mainId = state.data.mainProduct.id;
    const mainService = services.find((service) => String(service.id || service.productId || "") === String(mainId));
    if (mainService) {
      state.mainProduct.selected = true;
      state.mainProduct.date = mainService.date || null;
      const configuration = mainService.configuration || {};
      if (configuration.circuitId) state.mainProduct.circuitId = configuration.circuitId;
      if (configuration.outboundTrainId) state.mainProduct.outboundTrainId = configuration.outboundTrainId;
      if (configuration.returnTrainId) state.mainProduct.returnTrainId = configuration.returnTrainId;
      if (configuration.mealOptionId) state.mainProduct.mealOptionId = configuration.mealOptionId;
      const selectedMealLabel = Array.isArray(mainService.extras) ? mainService.extras[0] : "";
      const meal = (state.data.mainProduct.mealOptions || []).find((option) => option.label === selectedMealLabel);
      if (!configuration.mealOptionId && meal) state.mainProduct.mealOptionId = meal.id;
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
    const totalPax = getTotalTravelerCount();
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
    const totalPax = getTotalTravelerCount();
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
      const circuit = findSelectedCircuit(state.data.mainProduct);
      const trainPricing = getSelectedTrainPricing(state.data.mainProduct);
      const extras = [
        circuit?.label,
        trainPricing.bundle?.label || trainPricing.outbound?.label,
        trainPricing.bundle ? null : trainPricing.returnTrain?.label,
        meal && meal.pricePerPerson > 0 ? meal.label : null
      ].filter(Boolean);
      services.push({
        id: state.data.mainProduct.id,
        productId: state.data.mainProduct.id,
        title: state.data.mainProduct.title,
        date: state.mainProduct.date,
        origin: state.data.mainProduct.origin,
        extras,
        configuration: {
          circuitId: circuit?.id || "",
          circuitLabel: circuit?.label || "",
          circuitSupplement: Number(circuit?.groupSupplement || 0),
          outboundTrainId: trainPricing.outbound?.id || "",
          outboundTrainLabel: trainPricing.outbound?.label || "",
          returnTrainId: trainPricing.returnTrain?.id || "",
          returnTrainLabel: trainPricing.returnTrain?.label || "",
          trainBundleId: trainPricing.bundle?.id || "",
          trainBundleLabel: trainPricing.bundle?.label || "",
          mealOptionId: meal?.id || "no-meal",
          mealLabel: meal?.label || "Sin almuerzo"
        },
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
      infants: state.infants,
      totalPassengers: getTotalTravelerCount(),
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
      travelers: { adults: state.adults, children: state.children, infants: state.infants, passengers },
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
        infants: state.infants,
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
        disclosure.querySelector("span").textContent = expanded ? "Ocultar detalles" : "Ver qué incluye";
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
    state.mainProduct.outboundTrainId = (state.data.mainProduct.trainSelection?.outbound || []).find((item) => item.default)?.id || state.data.mainProduct.trainSelection?.outbound?.[0]?.id || null;
    state.mainProduct.returnTrainId = (state.data.mainProduct.trainSelection?.return || []).find((item) => item.default)?.id || state.data.mainProduct.trainSelection?.return?.[0]?.id || null;
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
