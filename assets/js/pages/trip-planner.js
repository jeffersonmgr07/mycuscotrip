"use strict";

/**
 * My Cusco Trip - Planificador de viaje / calificación de prospectos
 * Página: /planifica-tu-viaje.html
 * Guarda el prospecto directamente y muestra confirmación sin verificación OTP.
 */
(function () {
  const TOTAL_STEPS = 5;
  const WHATSAPP_BUSINESS = "51900608980";
  const STORAGE_CLIENT_KEY = "mct_trip_planner_client_request_id";

  const DESTINATION_LABELS = {
    machu_picchu: "Machu Picchu",
    cusco: "Cusco",
    sacred_valley: "Valle Sagrado",
    rainbow_mountain: "Montaña de 7 Colores",
    humantay: "Laguna Humantay",
    lima: "Lima",
    paracas_ica: "Paracas / Ica",
    arequipa: "Arequipa",
    puno: "Puno / Lago Titicaca",
    amazon: "Amazonía",
    other: "Otros",
    recommend: "Quiero que me recomienden"
  };

  const SERVICE_LABELS = {
    tours: "Solo tours y experiencias",
    tours_hotel: "Tours + alojamiento",
    tours_hotel_transfers: "Tours + alojamiento + traslados",
    complete: "Viaje completo",
    unsure: "Todavía no estoy seguro/a"
  };

  const FLIGHT_LABELS = {
    purchased: "Sí, ya los compré",
    dates_no_ticket: "Tengo fechas pero aún no compro los vuelos",
    planning: "Todavía estoy planificando"
  };

  const DATE_STATUS_LABELS = {
    exact: "Sí, ya tengo fechas",
    approximate: "Tengo una fecha aproximada",
    planning: "Todavía estoy planificando"
  };

  const DURATION_LABELS = {
    "3-4": "3–4 días",
    "5": "5 días",
    "6": "6 días",
    "7": "7 días",
    "8-10": "8–10 días",
    "11+": "Más de 10 días",
    unknown: "Todavía no lo sé"
  };

  const WEEK_LABELS = {
    first: "Primera semana",
    second: "Segunda semana",
    third: "Tercera semana",
    fourth: "Cuarta semana",
    flexible: "Última semana / flexible"
  };

  function q(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function qa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  function safeStorageGet(key) {
    try { return sessionStorage.getItem(key); } catch (error) { return null; }
  }

  function safeStorageSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (error) { /* no-op */ }
  }

  function safeStorageRemove(key) {
    try { sessionStorage.removeItem(key); } catch (error) { /* no-op */ }
  }

  function getClientRequestId() {
    let id = safeStorageGet(STORAGE_CLIENT_KEY);
    if (id) return id;
    if (window.crypto?.randomUUID) id = window.crypto.randomUUID();
    else id = `mct-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    safeStorageSet(STORAGE_CLIENT_KEY, id);
    return id;
  }

  function getLocale() {
    const fromUrl = window.MyCuscoTripI18n?.getLocaleFromUrl?.();
    if (fromUrl) return fromUrl;
    const first = location.pathname.split("/").filter(Boolean)[0] || "";
    return ["en", "pt", "fr", "de", "it", "zh", "ja"].includes(first) ? first : "es";
  }

  function getBasePath() {
    return window.MyCuscoTripI18n?.getBasePath?.() || (location.hostname.includes("github.io") ? "/mycuscotrip/" : "/");
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function monthLabel(monthValue, yearValue) {
    if (!monthValue || !yearValue) return "";
    const date = new Date(Number(yearValue), Number(monthValue) - 1, 1, 12, 0, 0);
    const month = new Intl.DateTimeFormat("es-PE", { month: "long" }).format(date);
    return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${yearValue}`;
  }

  function computeDays(start, end) {
    if (!start || !end) return 0;
    const a = new Date(`${start}T12:00:00`);
    const b = new Date(`${end}T12:00:00`);
    const diff = Math.floor((b.getTime() - a.getTime()) / 86400000);
    return diff >= 0 ? diff + 1 : 0;
  }

  function parsePhoneParam(raw) {
    return String(raw || "").replace(/[^0-9+]/g, "");
  }

  function countryFlag(code) {
    const clean = String(code || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) return "";
    return String.fromCodePoint(...clean.split("").map(char => 127397 + char.charCodeAt(0)));
  }

  function maskEmail(email) {
    const [user, domain] = String(email || "").split("@");
    if (!user || !domain) return email || "";
    const visible = user.length <= 2 ? user[0] || "" : user.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(2, user.length - visible.length))}@${domain}`;
  }

  class TripPlanner {
    constructor() {
      this.form = q("#tripPlannerForm");
      if (!this.form) return;

      this.currentStep = 1;
      this.countries = [];
      this.state = {
        adults: 2,
        children: 0,
        childAges: [],
        dateStatus: "",
        exactDays: 0,
        durationChoice: "",
        flightStatus: "",
        serviceType: "",
        destinations: []
      };

      this.cacheDom();
      this.bindEvents();
      this.populateYears();
      this.setDateMinimums();
      this.loadCountries().finally(() => this.applyUrlPrefill());
      this.renderCounters();
      this.renderStep();
    }

    cacheDom() {
      this.steps = qa(".tp-step", this.form);
      this.progressFill = q("#tpProgressFill");
      this.progressStep = q("#tpProgressStep");
      this.progressLabel = q("#tpProgressLabel");
      this.formError = q("#tpFormError");
      this.overlay = q("#tpProcessingOverlay");
      this.overlayText = q("#tpProcessingText");
      this.successModal = q("#tpSuccessModal");
      this.summary = q("#tpSummary");
    }

    bindEvents() {
      this.form.addEventListener("submit", event => event.preventDefault());

      qa("[data-next]", this.form).forEach(button => button.addEventListener("click", () => this.nextStep()));
      qa("[data-back]", this.form).forEach(button => button.addEventListener("click", () => this.previousStep()));
      q("#tpEditBtn")?.addEventListener("click", () => this.goToStep(1));
      q("#tpRequestBtn")?.addEventListener("click", () => this.submitLead());

      qa("[data-counter-action]", this.form).forEach(button => {
        button.addEventListener("click", () => this.changeCounter(button.dataset.counterAction, button.dataset.counterTarget));
      });

      this.form.addEventListener("change", event => this.handleFieldChange(event));
      this.form.addEventListener("input", event => {
        const field = event.target.closest(".tp-field");
        field?.classList.remove("is-invalid");
        this.hideError();
      });

      q("#tpSuccessClose")?.addEventListener("click", () => this.closeSuccessModal());
      this.successModal?.addEventListener("click", event => {
        if (event.target === this.successModal) this.closeSuccessModal();
      });
    }

    async loadCountries() {
      const select = q("#tpPhoneCountry");
      if (!select) return;
      try {
        const response = await fetch(`${getBasePath()}assets/data/countries.json`, { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.countries = await response.json();
      } catch (error) {
        console.warn("[TripPlanner] No se pudo cargar countries.json", error);
        this.countries = [
          { code: "PE", name: "Perú", dialCode: "+51" },
          { code: "CO", name: "Colombia", dialCode: "+57" },
          { code: "CL", name: "Chile", dialCode: "+56" },
          { code: "BR", name: "Brasil", dialCode: "+55" },
          { code: "US", name: "Estados Unidos", dialCode: "+1" }
        ];
      }

      select.innerHTML = this.countries.map(country => {
        const flag = countryFlag(country.code);
        return `<option value="${country.code}" data-dial="${country.dialCode}">${flag} ${country.dialCode} · ${country.name}</option>`;
      }).join("");
      select.value = "PE";
    }

    applyUrlPrefill() {
      const params = new URLSearchParams(location.search);
      const countryParam = String(params.get("country") || "").toUpperCase();
      const phoneParam = parsePhoneParam(params.get("phone"));
      const countrySelect = q("#tpPhoneCountry");
      const phoneInput = q("#tpPhone");

      if (countryParam && this.countries.some(c => c.code === countryParam)) {
        countrySelect.value = countryParam;
      }

      if (phoneParam && phoneInput) {
        const digits = phoneParam.replace(/\D/g, "");
        const matches = this.countries
          .filter(c => digits.startsWith(String(c.dialCode || "").replace(/\D/g, "")))
          .sort((a, b) => b.dialCode.length - a.dialCode.length);
        const country = matches[0];
        if (country) {
          countrySelect.value = country.code;
          const prefix = country.dialCode.replace(/\D/g, "");
          phoneInput.value = digits.slice(prefix.length);
        } else {
          phoneInput.value = digits;
        }
      }
    }

    populateYears() {
      const currentYear = new Date().getFullYear();
      qa("[data-year-select]", this.form).forEach(select => {
        select.innerHTML = '<option value="">Año</option>';
        for (let year = currentYear; year <= currentYear + 4; year += 1) {
          const option = document.createElement("option");
          option.value = String(year);
          option.textContent = String(year);
          select.appendChild(option);
        }
      });
    }

    setDateMinimums() {
      const now = new Date();
      const min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const start = q("#tpStartDate");
      const end = q("#tpEndDate");
      if (start) start.min = min;
      if (end) end.min = min;
    }

    changeCounter(action, target) {
      const key = target === "children" ? "children" : "adults";
      const min = key === "adults" ? 1 : 0;
      const max = 20;
      let value = this.state[key];
      value += action === "increase" ? 1 : -1;
      value = Math.max(min, Math.min(max, value));
      this.state[key] = value;
      if (key === "children") {
        this.state.childAges = this.state.childAges.slice(0, value);
        while (this.state.childAges.length < value) this.state.childAges.push("");
        this.renderChildAges();
      }
      this.renderCounters();
    }

    renderCounters() {
      q("#tpAdultsValue").textContent = String(this.state.adults);
      q("#tpChildrenValue").textContent = String(this.state.children);
      this.renderChildAges();
    }

    renderChildAges() {
      const wrapper = q("#tpChildAgesWrapper");
      const container = q("#tpChildAges");
      if (!wrapper || !container) return;
      if (this.state.children <= 0) {
        wrapper.hidden = true;
        container.innerHTML = "";
        return;
      }
      wrapper.hidden = false;
      container.innerHTML = Array.from({ length: this.state.children }, (_, index) => {
        const current = this.state.childAges[index] ?? "";
        const options = Array.from({ length: 18 }, (_v, age) => `<option value="${age}" ${String(current) === String(age) ? "selected" : ""}>${age} ${age === 1 ? "año" : "años"}</option>`).join("");
        return `<div class="tp-field"><label for="tpChildAge${index}">Edad del niño ${index + 1}</label><select id="tpChildAge${index}" data-child-age="${index}"><option value="">Edad</option>${options}</select></div>`;
      }).join("");
      qa("[data-child-age]", container).forEach(select => {
        select.addEventListener("change", () => {
          this.state.childAges[Number(select.dataset.childAge)] = select.value;
          select.closest(".tp-field")?.classList.remove("is-invalid");
        });
      });
    }

    handleFieldChange(event) {
      const target = event.target;
      if (target.name === "dateStatus") {
        this.state.dateStatus = target.value;
        this.toggleDateFields();
      }
      if (target.name === "flightStatus") {
        this.state.flightStatus = target.value;
        q("#tpFlightOriginWrap").hidden = target.value !== "purchased";
      }
      if (target.name === "duration") this.state.durationChoice = target.value;
      if (target.name === "serviceType") this.state.serviceType = target.value;
      if (target.name === "destination") {
        this.state.destinations = qa('input[name="destination"]:checked', this.form).map(input => input.value);
        q("#tpOtherDestinationWrap").hidden = !this.state.destinations.includes("other");
      }
      if (target.id === "tpStartDate" || target.id === "tpEndDate") this.updateExactDuration();
    }

    toggleDateFields() {
      q("#tpExactDates").hidden = this.state.dateStatus !== "exact";
      q("#tpApproxDates").hidden = this.state.dateStatus !== "approximate";
      q("#tpPlanningDates").hidden = this.state.dateStatus !== "planning";
      q("#tpDurationQuestion").hidden = this.state.dateStatus === "exact" || !this.state.dateStatus;
      q("#tpExactDuration").hidden = this.state.dateStatus !== "exact";
      const flightsSection = q("#tpFlightsSection");
      if (flightsSection) flightsSection.hidden = this.state.dateStatus === "planning";
      if (this.state.dateStatus === "planning") {
        this.state.flightStatus = "planning";
        q("#tpFlightOriginWrap").hidden = true;
      }
      this.updateExactDuration();
    }

    updateExactDuration() {
      const start = q("#tpStartDate")?.value || "";
      const end = q("#tpEndDate")?.value || "";
      this.state.exactDays = computeDays(start, end);
      const label = q("#tpExactDurationText");
      if (label) label.textContent = this.state.exactDays > 0 ? `${this.state.exactDays} días` : "Completa las dos fechas para calcular la duración.";
    }

    nextStep() {
      if (!this.validateStep(this.currentStep)) return;
      if (this.currentStep < TOTAL_STEPS) this.goToStep(this.currentStep + 1);
    }

    previousStep() {
      if (this.currentStep > 1) this.goToStep(this.currentStep - 1);
    }

    goToStep(step) {
      this.currentStep = Math.max(1, Math.min(TOTAL_STEPS, step));
      if (this.currentStep === 5) this.renderSummary();
      this.renderStep();
      const top = q(".trip-planner-card")?.getBoundingClientRect().top + window.scrollY - 94;
      window.scrollTo({ top: Math.max(0, top || 0), behavior: "smooth" });
    }

    renderStep() {
      this.steps.forEach(section => section.classList.toggle("is-active", Number(section.dataset.step) === this.currentStep));
      const percent = (this.currentStep / TOTAL_STEPS) * 100;
      if (this.progressFill) this.progressFill.style.width = `${percent}%`;
      if (this.progressStep) this.progressStep.textContent = `Paso ${this.currentStep} de ${TOTAL_STEPS}`;
      const labels = ["Tus datos", "Fechas", "Qué organizamos", "Experiencias", "Resumen"];
      if (this.progressLabel) this.progressLabel.textContent = labels[this.currentStep - 1] || "";
      this.hideError();
    }

    invalidate(selector) {
      const element = q(selector, this.form);
      element?.closest(".tp-field")?.classList.add("is-invalid");
    }

    validateStep(step) {
      this.hideError();
      if (step === 1) {
        const firstName = q("#tpFirstName").value.trim();
        const lastName = q("#tpLastName").value.trim();
        const email = q("#tpEmail").value.trim();
        const phone = q("#tpPhone").value.replace(/\D/g, "");
        if (firstName.length < 2) return this.validationFail("Ingresa tu nombre.", "#tpFirstName");
        if (lastName.length < 2) return this.validationFail("Ingresa tu apellido.", "#tpLastName");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.validationFail("Ingresa un correo electrónico válido.", "#tpEmail");
        if (phone.length < 8 || phone.length > 15) return this.validationFail("Ingresa un número de WhatsApp válido.", "#tpPhone");
        if (this.state.children > 0 && this.state.childAges.some(age => age === "" || age == null)) {
          this.showError("Indica la edad de cada niño.");
          const firstEmpty = qa("[data-child-age]", this.form).find(select => !select.value);
          firstEmpty?.closest(".tp-field")?.classList.add("is-invalid");
          firstEmpty?.focus();
          return false;
        }
      }

      if (step === 2) {
        const dateStatus = q('input[name="dateStatus"]:checked')?.value || "";
        if (!dateStatus) return this.validationFail("Cuéntanos si ya tienes fechas definidas.");
        this.state.dateStatus = dateStatus;
        if (dateStatus === "exact") {
          const start = q("#tpStartDate").value;
          const end = q("#tpEndDate").value;
          if (!start) return this.validationFail("Selecciona la fecha de llegada.", "#tpStartDate");
          if (!end) return this.validationFail("Selecciona la fecha de salida.", "#tpEndDate");
          if (computeDays(start, end) <= 0) return this.validationFail("La fecha de salida debe ser igual o posterior a la llegada.", "#tpEndDate");
        }
        if (dateStatus === "approximate") {
          if (!q("#tpApproxMonth").value || !q("#tpApproxYear").value) return this.validationFail("Selecciona el mes y año aproximados.");
          if (!q('input[name="approxWeek"]:checked')) return this.validationFail("Selecciona una semana aproximada.");
        }
        if (dateStatus === "planning") {
          if (!q("#tpPlanningMonth").value || !q("#tpPlanningYear").value) return this.validationFail("Selecciona el mes y año en que te gustaría viajar.");
        }
        if (dateStatus === "planning") {
          this.state.flightStatus = "planning";
        } else {
          const flightStatus = q('input[name="flightStatus"]:checked')?.value || "";
          if (!flightStatus) return this.validationFail("Indica el estado de tus vuelos.");
          this.state.flightStatus = flightStatus;
        }
        if (dateStatus !== "exact") {
          const duration = q('input[name="duration"]:checked')?.value || "";
          if (!duration) return this.validationFail("Selecciona una duración aproximada.");
          this.state.durationChoice = duration;
        }
      }

      if (step === 3) {
        const service = q('input[name="serviceType"]:checked')?.value || "";
        if (!service) return this.validationFail("Selecciona qué te gustaría que organicemos.");
        this.state.serviceType = service;
      }

      if (step === 4) {
        const destinations = qa('input[name="destination"]:checked').map(input => input.value);
        if (!destinations.length) return this.validationFail("Selecciona al menos un destino o pide una recomendación.");
        this.state.destinations = destinations;
      }
      return true;
    }

    validationFail(message, selector) {
      this.showError(message);
      if (selector) {
        this.invalidate(selector);
        q(selector, this.form)?.focus();
      }
      return false;
    }

    showError(message) {
      if (!this.formError) return;
      this.formError.textContent = message;
      this.formError.classList.add("is-visible");
    }

    hideError() {
      if (!this.formError) return;
      this.formError.textContent = "";
      this.formError.classList.remove("is-visible");
    }

    getPhoneData() {
      const select = q("#tpPhoneCountry");
      const selected = select?.selectedOptions?.[0];
      const country = select?.value || "";
      const dialCode = selected?.dataset?.dial || this.countries.find(c => c.code === country)?.dialCode || "";
      const number = q("#tpPhone").value.replace(/\D/g, "");
      return { country, dialCode, number, full: `${dialCode}${number}`.replace(/\s/g, "") };
    }

    getEstimatedDateData() {
      if (this.state.dateStatus === "approximate") {
        const month = q("#tpApproxMonth").value;
        const year = q("#tpApproxYear").value;
        const week = q('input[name="approxWeek"]:checked')?.value || "";
        return { month, year, value: `${year}-${month}`, label: monthLabel(month, year), week };
      }
      if (this.state.dateStatus === "planning") {
        const month = q("#tpPlanningMonth").value;
        const year = q("#tpPlanningYear").value;
        return { month, year, value: `${year}-${month}`, label: monthLabel(month, year), week: "" };
      }
      return { month: "", year: "", value: "", label: "", week: "" };
    }

    buildPayload() {
      const params = new URLSearchParams(location.search);
      const phone = this.getPhoneData();
      const estimate = this.getEstimatedDateData();
      const startDate = q("#tpStartDate").value || "";
      const endDate = q("#tpEndDate").value || "";
      const exactDays = computeDays(startDate, endDate);
      const durationValue = this.state.dateStatus === "exact" ? String(exactDays) : (q('input[name="duration"]:checked')?.value || "");
      const destinationValues = qa('input[name="destination"]:checked').map(input => input.value);

      return {
        clientRequestId: getClientRequestId(),
        locale: getLocale(),
        name: q("#tpFirstName").value.trim(),
        lastName: q("#tpLastName").value.trim(),
        email: q("#tpEmail").value.trim().toLowerCase(),
        whatsapp: phone.full,
        phoneCountry: phone.country,
        phoneDialCode: phone.dialCode,
        adults: this.state.adults,
        children: this.state.children,
        childAges: this.state.childAges.map(value => Number(value)),
        dateStatus: this.state.dateStatus,
        startDate,
        endDate,
        estimatedMonth: estimate.value,
        estimatedMonthLabel: estimate.label,
        estimatedWeek: estimate.week,
        duration: durationValue,
        flightStatus: this.state.dateStatus === "planning" ? "planning" : (q('input[name="flightStatus"]:checked')?.value || ""),
        travelOrigin: this.state.dateStatus === "planning" ? "" : q("#tpFlightOrigin").value.trim(),
        serviceType: q('input[name="serviceType"]:checked')?.value || "",
        destinations: destinationValues,
        otherDestination: q("#tpOtherDestination").value.trim(),
        scope: "",
        scopeExtras: [],
        comments: q("#tpComments").value.trim(),
        originLead: this.detectOriginLead(params),
        campaignCountry: String(params.get("country") || "").toUpperCase(),
        campaignParam: String(params.get("campaign") || ""),
        utmSource: String(params.get("utm_source") || ""),
        utmMedium: String(params.get("utm_medium") || ""),
        utmCampaign: String(params.get("utm_campaign") || ""),
        utmContent: String(params.get("utm_content") || ""),
        utmTerm: String(params.get("utm_term") || ""),
        fbclid: String(params.get("fbclid") || ""),
        pageOrigin: location.href,
        referrer: document.referrer || ""
      };
    }

    detectOriginLead(params) {
      const source = String(params.get("utm_source") || "").toLowerCase();
      if (params.get("fbclid") || /facebook|instagram|meta/.test(source)) return "META";
      if (/whatsapp|wa/.test(source) || params.get("phone")) return "WHATSAPP";
      return "WEB";
    }

    renderSummary() {
      const payload = this.buildPayload();
      const travelers = `${payload.adults} ${payload.adults === 1 ? "adulto" : "adultos"}${payload.children ? ` · ${payload.children} ${payload.children === 1 ? "niño" : "niños"}` : ""}`;
      let when = "Todavía en planificación";
      if (payload.dateStatus === "exact") when = `${formatDate(payload.startDate)} → ${formatDate(payload.endDate)}`;
      else if (payload.estimatedMonthLabel) when = `${payload.estimatedMonthLabel}${payload.estimatedWeek ? ` · ${WEEK_LABELS[payload.estimatedWeek] || payload.estimatedWeek}` : ""}`;
      const duration = payload.dateStatus === "exact" ? `${payload.duration} días` : (DURATION_LABELS[payload.duration] || payload.duration);
      const destinations = payload.destinations.map(value => DESTINATION_LABELS[value] || value).join(", ");

      const summaryItems = [
        ["Viajeros", travelers],
        ["Cuándo", when],
        ["Duración", duration || "Por definir"]
      ];
      if (payload.dateStatus !== "planning") summaryItems.push(["Vuelos", FLIGHT_LABELS[payload.flightStatus] || ""]);
      summaryItems.push(["Qué organizamos", SERVICE_LABELS[payload.serviceType] || ""]);
      summaryItems.push(["Destinos", destinations]);

      this.summary.innerHTML = summaryItems
        .map(([label, value]) => `<div class="tp-summary__item"><div class="tp-summary__label">${label}</div><div class="tp-summary__value">${this.escapeHtml(value)}</div></div>`)
        .join("");
    }

    async submitLead() {
      for (let step = 1; step <= 4; step += 1) {
        if (!this.validateStep(step)) {
          this.goToStep(step);
          return;
        }
      }

      const button = q("#tpRequestBtn");
      button.disabled = true;
      this.setProcessing(true, "Enviando tus datos…");
      const payload = this.buildPayload();

      try {
        if (!window.MyCuscoTripApiClient?.postAction) throw new Error("No se pudo conectar con el sistema de solicitudes.");
        const result = await window.MyCuscoTripApiClient.postAction("createTravelLead", payload);
        this.showSuccess(result);
        this.trackSubmittedLead(result);
      } catch (error) {
        const message = error?.body?.error || error?.body?.message || error?.message || "No pudimos guardar tu solicitud. Inténtalo nuevamente.";
        this.showError(message);
      } finally {
        button.disabled = false;
        this.setProcessing(false);
      }
    }

    setProcessing(active, text) {
      if (!this.overlay) return;
      this.overlay.hidden = !active;
      if (text && this.overlayText) this.overlayText.textContent = text;
    }

    showSuccess(result) {
      if (!this.successModal) return;
      this.successModal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    closeSuccessModal() {
      if (!this.successModal) return;
      this.successModal.hidden = true;
      document.body.style.overflow = "";
    }

    trackSubmittedLead(result) {
      if (!result?.shouldTrackLead) return;
      const leadId = result.leadId || "";
      if (!leadId) return;
      const key = `mct_submitted_lead_pixel_${leadId}`;
      try {
        if (localStorage.getItem(key) === "1") return;
      } catch (error) { /* no-op */ }

      const payload = this.buildPayload();
      const params = {
        event_category: "lead",
        lead_id: leadId,
        lead_source: payload.originLead,
        campaign_country: payload.campaignCountry,
        utm_source: payload.utmSource,
        utm_medium: payload.utmMedium,
        utm_campaign: payload.utmCampaign
      };

      if (window.MyCuscoTripTracking?.track) {
        window.MyCuscoTripTracking.track("generate_lead", params, {
          metaEventName: "Lead",
          eventID: result.metaEventId || `trip-lead-${leadId}`
        });
      } else if (typeof window.fbq === "function") {
        window.fbq("track", "Lead", params, { eventID: result.metaEventId || `trip-lead-${leadId}` });
      }

      try { localStorage.setItem(key, "1"); } catch (error) { /* no-op */ }
    }

    escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
    }
  }

  function init() {
    window.MyCuscoTripTripPlanner = new TripPlanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
