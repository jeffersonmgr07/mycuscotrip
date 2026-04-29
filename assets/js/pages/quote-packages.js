class MyCuscoTripQuotePackages {
  constructor() {
    this.basePath = window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";

    this.packagesData = { packages: [], paymentOptions: {}, currencyRules: {} };
    this.trainsData = { routes: {}, trainCategories: {}, exchangeRate: {} };
    this.hotelsData = { destinations: {} };
    this.discountCodes = [];

    this.packages = [];
    this.selectedPackage = null;
    this.selectedItineraryOption = null;

    this.adults = 2;
    this.children = 0;
    this.nationality = "national";
    this.quoteCurrency = "PEN";
    this.paymentMode = "full";

    this.travelStartDate = "";
    this.travelEndDate = "";
    this.travelDays = 0;
    this.travelNights = 0;
    this.arrivalTime = "";
    this.departureTime = "";

    this.exchangeRate = 3.75;

    this.selectedHotelsByDestination = {};
    this.selectedCombinationsByDestination = {};
    this.activeHotelModalDestination = null;
    this.pendingHotelSelection = null;

    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";
    this.activeTrainDirection = null;
    this.pendingTrainCode = "";

    this.selectedExtras = new Set();
    this.appliedDiscountCode = null;

    this.quoteReference = this.getStableQuoteReference();
    this.printCoupon = this.getStablePrintCoupon();

    this.init();
  }

  async init() {
    try {
      await this.loadAllData();
      this.enhanceDomForCurrentHtml();
      this.bindBaseEvents();
      this.initDatePicker();
      this.initTimePickers();
      this.applyCurrencyRulesByNationality();
      this.updateReferenceUI();
      this.updatePassengersUI();
      this.updateExchangeRateHelp();
      this.renderInitialState();
      this.updatePricing();
      this.updatePrintQuotation();
    } catch (error) {
      console.error("Error inicializando cotizador:", error);
      alert("No se pudo cargar el cotizador. Revisa que existan packages-peru.json, trains.json, hotels.json y discount-codes.json.");
    }
  }

  async loadAllData() {
    const [packagesData, trainsData, hotelsData, discountCodes] = await Promise.all([
      this.fetchJson("assets/data/packages-peru.json"),
      this.fetchJson("assets/data/trains.json"),
      this.fetchJson("assets/data/hotels.json"),
      this.fetchOptionalJson("assets/data/discount-codes.json")
    ]);

    this.packagesData = packagesData || { packages: [], paymentOptions: {}, currencyRules: {} };
    this.trainsData = trainsData || { routes: {}, trainCategories: {}, exchangeRate: {} };
    this.hotelsData = hotelsData || { destinations: {} };
    this.discountCodes = Array.isArray(discountCodes) ? discountCodes : [];

    this.packages = Array.isArray(this.packagesData.packages)
      ? this.packagesData.packages.filter((item) => item.status !== "draft")
      : [];

    this.exchangeRate = Number(this.trainsData?.exchangeRate?.fallbackRate || 3.75);

    await this.loadExchangeRate();
  }

  async fetchJson(path) {
    const response = await fetch(this.resolvePath(path), { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    return response.json();
  }

  async fetchOptionalJson(path) {
    try {
      const response = await fetch(this.resolvePath(path), { cache: "no-store" });
      if (!response.ok) return [];
      return response.json();
    } catch (error) {
      console.warn(`No se pudo cargar ${path}. Se continuará sin códigos de descuento.`);
      return [];
    }
  }

  async loadExchangeRate() {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      const data = await response.json();

      if (data && data.rates && Number(data.rates.PEN) > 0) {
        this.exchangeRate = Number(data.rates.PEN);
      }
    } catch (error) {
      console.warn("No se pudo obtener tipo de cambio online. Se usará respaldo:", this.exchangeRate);
    }
  }

  enhanceDomForCurrentHtml() {
    this.fixTravelFieldLabels();
    this.enhancePrintableTemplate();
    this.ensureMobileSummaryToggle();
    this.addQuoteDetailTitle();
    this.changePdfButtonText();
  }

  fixTravelFieldLabels() {
    const arrivalLabel = document.querySelector('label[for="arrivalTime"]');
    const departureLabel = document.querySelector('label[for="departureTime"]');
    const arrivalHelp = document.getElementById("arrivalTime")?.closest(".quote-field")?.querySelector("small");
    const departureHelp = document.getElementById("departureTime")?.closest(".quote-field")?.querySelector("small");

    if (arrivalLabel) arrivalLabel.textContent = "Hora de llegada";
    if (departureLabel) departureLabel.textContent = "Hora de salida";

    if (arrivalHelp) {
      arrivalHelp.textContent = "Ingresa la hora aproximada de llegada a Cusco para calcular mejor el itinerario.";
    }

    if (departureHelp) {
      departureHelp.textContent = "Ingresa la hora aproximada de salida de Cusco para saber si el último día permite actividades.";
    }
  }

  enhancePrintableTemplate() {
    const printBrand = document.querySelector(".print-header > div:first-child h2");

    if (printBrand) {
      printBrand.outerHTML = `
        <img
          class="print-logo"
          src="${this.resolveAssetPath("assets/img/reserva/logo-color.png")}"
          alt="My Cusco Trip"
        />
      `;
    }

    const printHeader = document.querySelector("#printQuotation .print-header");
    if (printHeader) {
      printHeader.classList.add("print-header--two-columns");
    }

    const packageSection = document.getElementById("printPackageTitle")?.closest(".print-section");
    if (packageSection) {
      packageSection.remove();
    }

    const paymentTitle = Array.from(document.querySelectorAll("#printQuotation .print-section h3"))
      .find((title) => title.textContent.trim().toLowerCase().includes("resumen económico"));

    if (paymentTitle) {
      paymentTitle.textContent = "Detalles de pago";
    }

    const baseLabel = document.getElementById("basePackageTotal")?.closest(".quote-summary__line")?.querySelector("span");
    if (baseLabel) {
      baseLabel.textContent = "Itinerario base";
    }

    const couponValidUntil = document.getElementById("printCouponValidUntil")?.closest("small");
    if (couponValidUntil) {
      couponValidUntil.remove();
    }
  }

  addQuoteDetailTitle() {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel || panel.querySelector(".quote-detail-title")) return;

    const title = document.createElement("h2");
    title.className = "quote-detail-title";
    title.textContent = "Detalle de cotización";
    panel.insertBefore(title, panel.firstChild);
  }

  changePdfButtonText() {
    const pdfBtn = document.getElementById("savePdfBtn");
    if (pdfBtn) {
      const span = pdfBtn.querySelector("span");
      if (span) span.textContent = "Descargar";
    }
  }

  bindBaseEvents() {
    document.querySelectorAll(".quote-qty-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.target;
        const action = button.dataset.action;

        if (target === "adults") {
          if (action === "minus") this.adults = Math.max(1, this.adults - 1);
          if (action === "plus") this.adults += 1;
        }

        if (target === "children") {
          if (action === "minus") this.children = Math.max(0, this.children - 1);
          if (action === "plus") this.children += 1;
        }

        this.updatePassengersUI();
        this.refreshAccommodationSelections();
        this.renderPackageOptions();
        this.renderTrainSelectors();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });

    document.getElementById("nationality")?.addEventListener("change", (event) => {
      this.nationality = event.target.value;
      this.applyCurrencyRulesByNationality();
      this.selectedOutboundTrainCode = "";
      this.selectedReturnTrainCode = "";
      this.renderPackageOptions();
      this.renderTrainSelectors();
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("quoteCurrency")?.addEventListener("change", (event) => {
      this.quoteCurrency = event.target.value;
      this.renderPackageOptions();
      this.renderAccommodationOptions();
      this.renderTrainSelectors();
      this.renderExtras();
      this.updateExchangeRateHelp();
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("paymentMode")?.addEventListener("change", (event) => {
      this.paymentMode = event.target.value;
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("arrivalTime")?.addEventListener("change", (event) => {
      this.arrivalTime = event.target.value || "";
      this.refreshItineraryByTimeRules();
      this.updatePrintQuotation();
    });

    document.getElementById("departureTime")?.addEventListener("change", (event) => {
      this.departureTime = event.target.value || "";
      this.refreshItineraryByTimeRules();
      this.updatePrintQuotation();
    });

    document.getElementById("applyDiscountCodeBtn")?.addEventListener("click", () => {
      this.applyManualDiscountCode();
    });

    document.getElementById("discountCodeInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.applyManualDiscountCode();
      }
    });

    document.getElementById("discountCodeInput")?.addEventListener("input", (event) => {
      event.target.value = event.target.value.toUpperCase();
    });

    document.getElementById("printQuoteBtn")?.addEventListener("click", () => {
      this.updatePrintQuotation();
      window.print();
    });

    document.getElementById("savePdfBtn")?.addEventListener("click", () => {
      this.saveQuotationAsPdf();
    });

    document.getElementById("continuePaymentBtn")?.addEventListener("click", () => {
      this.continueToPayment();
    });

    document.getElementById("openOutboundTrainModalBtn")?.addEventListener("click", () => {
      this.openTrainSelectionModal("outbound");
    });

    document.getElementById("openReturnTrainModalBtn")?.addEventListener("click", () => {
      this.openTrainSelectionModal("return");
    });

    ["clientName", "clientPhone", "clientEmail", "clientDocument", "clientNotes"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => this.updatePrintQuotation());
    });

    this.bindHotelModalEvents();
    this.bindTrainSelectionModalEvents();
    this.bindTrainDetailsModalEvents();
    this.bindMobileSummaryScrollClose();
  }

  initDatePicker() {
    const input = document.getElementById("travelRange");
    if (!input || typeof flatpickr === "undefined") return;

    flatpickr(input, {
      locale: flatpickr.l10ns.es,
      mode: "range",
      minDate: "today",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d M Y",
      appendTo: document.body,
      static: false,
      disableMobile: true,
      onReady: (_, __, instance) => {
        if (instance.altInput) instance.altInput.setAttribute("readonly", "readonly");
      },
      onOpen: () => {
        document.body.classList.add("quote-datepicker-open");
      },
      onClose: () => {
        document.body.classList.remove("quote-datepicker-open");
      },
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          this.travelStartDate = this.formatDateInput(selectedDates[0]);
          this.travelEndDate = this.formatDateInput(selectedDates[1]);

          const diffMs = selectedDates[1].getTime() - selectedDates[0].getTime();
          this.travelNights = Math.max(0, Math.round(diffMs / 86400000));
          this.travelDays = this.travelNights + 1;

          this.setText(
            "travelRangeHelp",
            `${this.travelDays} día${this.travelDays !== 1 ? "s" : ""} / ${this.travelNights} noche${this.travelNights !== 1 ? "s" : ""}`
          );

          this.selectedPackage = null;
          this.selectedItineraryOption = null;
          this.selectedHotelsByDestination = {};
          this.selectedCombinationsByDestination = {};
          this.selectedOutboundTrainCode = "";
          this.selectedReturnTrainCode = "";
          this.selectedExtras.clear();
          this.clearAppliedDiscountCode(false);

          this.detectPackageByDates();
          this.updatePricing();
          this.updatePrintQuotation();
        }
      }
    });
  }

  initTimePickers() {
    if (typeof flatpickr === "undefined") return;

    const isMobile = window.innerWidth < 768;
    const timeConfig = {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      altInput: true,
      altFormat: "h:i K",
      time_24hr: false,
      minuteIncrement: 15,
      allowInput: false,
      disableMobile: !isMobile,   // en móvil se usará el selector nativo tipo reloj
      appendTo: document.body,
      locale: flatpickr.l10ns.es
    };

    const arrivalInput = document.getElementById("arrivalTime");
    const departureInput = document.getElementById("departureTime");

    if (arrivalInput) {
      flatpickr(arrivalInput, {
        ...timeConfig,
        onChange: (_, value) => {
          this.arrivalTime = value || "";
          this.refreshItineraryByTimeRules();
          this.updatePrintQuotation();
        }
      });
    }

    if (departureInput) {
      flatpickr(departureInput, {
        ...timeConfig,
        onChange: (_, value) => {
          this.departureTime = value || "";
          this.refreshItineraryByTimeRules();
          this.updatePrintQuotation();
        }
      });
    }
  }

  bindMobileSummaryScrollClose() {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel) return;

    window.addEventListener("scroll", () => {
      if (panel.classList.contains("is-expanded")) {
        panel.classList.remove("is-expanded");
        const toggle = panel.querySelector(".quote-mobile-summary-toggle");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          toggle.innerHTML = `<i class="fas fa-chevron-up"></i><span>Ver detalles</span>`;
        }
      }
    }, { passive: true });
  }

  renderInitialState() {
    this.renderPackageOptions();
    this.renderTrainSelectors();
    this.hideSection("itinerarySection");
    this.hideSection("hotelSection");
    this.hideSection("trainSection");
    this.hideSection("extrasSection");
  }

  detectPackageByDates() {
    const compatible = this.getCompatiblePackages();

    if (!compatible.length) {
      this.selectedPackage = null;
      this.selectedItineraryOption = null;
      this.renderPackageOptions();
      this.hideSection("itinerarySection");
      this.hideSection("hotelSection");
      this.hideSection("trainSection");
      this.hideSection("extrasSection");
      return;
    }

    const pkg = compatible[0];
    this.selectPackage(pkg);
  }

  getCompatiblePackages() {
    if (!this.travelDays || !this.travelNights) return [];

    return this.packages.filter((pkg) => {
      return Number(pkg.days) === this.travelDays && Number(pkg.nights) === this.travelNights;
    });
  }

  applyCurrencyRulesByNationality() {
    const currencySelect = document.getElementById("quoteCurrency");
    if (!currencySelect) return;

    const rules = this.packagesData.currencyRules?.[this.nationality];
    const allowedCurrencies = rules?.allowedCurrencies || (this.nationality === "national" ? ["PEN", "USD"] : ["USD"]);
    const defaultCurrency = rules?.defaultCurrency || allowedCurrencies[0] || "USD";

    Array.from(currencySelect.options).forEach((option) => {
      option.disabled = !allowedCurrencies.includes(option.value);
      option.hidden = !allowedCurrencies.includes(option.value);
    });

    if (!allowedCurrencies.includes(this.quoteCurrency)) {
      this.quoteCurrency = defaultCurrency;
      currencySelect.value = defaultCurrency;
    } else {
      currencySelect.value = this.quoteCurrency;
    }

    const help = document.getElementById("nationalityHelp");
    if (help) {
      if (this.nationality === "national") {
        help.textContent = "Como turista peruano puedes cotizar en soles o dólares. También podrás ver la opción de tren local, sujeta a disponibilidad presencial.";
      } else if (this.nationality === "andean_community") {
        help.textContent = "Para turistas de Comunidad Andina, la cotización se mostrará en dólares americanos.";
      } else {
        help.textContent = "Para turistas extranjeros, la cotización se mostrará únicamente en dólares americanos.";
      }
    }

    const trainSectionText = document.querySelector("#trainSection .quote-card__header p");
    if (trainSectionText) {
      if (this.nationality === "national") {
        trainSectionText.textContent = "Selecciona tu tren de ida y retorno a Machu Picchu. Como turista nacional peruano, también podrás ver la opción de tren local sujeta a disponibilidad.";
      } else {
        trainSectionText.textContent = "Selecciona tu tren turístico de ida y retorno a Machu Picchu según horario, categoría y disponibilidad.";
      }
    }

    this.updateExchangeRateHelp();
  }

  renderPackageOptions() {
    const target = document.getElementById("packageOptions");
    if (!target) return;

    if (!this.travelDays || !this.travelNights) {
      target.innerHTML = `
        <div class="quote-empty-state">
          Selecciona tus fechas de viaje para detectar automáticamente el itinerario compatible.
        </div>
      `;
      return;
    }

    const compatible = this.getCompatiblePackages();

    if (!compatible.length) {
      target.innerHTML = `
        <div class="quote-empty-state">
          No tenemos un itinerario configurado para ${this.travelDays} días / ${this.travelNights} noches.
          Puedes ajustar las fechas o crear una versión personalizada.
        </div>
      `;
      return;
    }

    const pkg = this.selectedPackage || compatible[0];
    const optionsCount = Array.isArray(pkg.itineraryOptions) ? pkg.itineraryOptions.length : 0;

    target.innerHTML = `
      <article class="quote-package-card is-selected quote-package-card--detected" aria-label="Itinerario detectado automáticamente">
        <div class="quote-package-card__top">
          <div>
            <span class="quote-badge quote-badge--muted">Itinerario detectado según tus fechas</span>
            <h3>${this.escapeHtml(pkg.title)}</h3>
            <p>Tu viaje será de <strong>${this.travelDays} días / ${this.travelNights} noches</strong>.</p>
            <p>${optionsCount} opción${optionsCount !== 1 ? "es" : ""} de itinerario disponible${optionsCount !== 1 ? "s" : ""}. El precio base no incluye tren ni alojamiento.</p>
          </div>
          <span class="quote-badge">${this.escapeHtml(pkg.typeLabel || `${this.travelDays}D/${this.travelNights}N`)}</span>
        </div>
      </article>
    `;
  }

  selectPackage(pkg) {
    this.selectedPackage = pkg;

    const availableOptions = this.getAvailableItineraryOptions();

    this.selectedItineraryOption =
      availableOptions.length
        ? availableOptions.find((item) => item.recommended) || availableOptions[0]
        : Array.isArray(pkg.itineraryOptions) && pkg.itineraryOptions.length
          ? pkg.itineraryOptions.find((item) => item.recommended) || pkg.itineraryOptions[0]
          : null;

    this.selectedHotelsByDestination = {};
    this.selectedCombinationsByDestination = {};
    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";
    this.selectedExtras.clear();
    this.clearAppliedDiscountCode(false);

    this.renderPackageOptions();
    this.renderItineraryOptions();
    this.renderPackageIncludes();
    this.refreshAccommodationSelections();

    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";

    this.renderTrainSelectors();
    this.renderExtras();
    this.updatePricing();
    this.updatePrintQuotation();

    this.showSection("itinerarySection");
    this.showSection("hotelSection");
    this.showSection("trainSection");

    if (Array.isArray(pkg.extras) && pkg.extras.length) this.showSection("extrasSection");
    else this.hideSection("extrasSection");
  }

  refreshItineraryByTimeRules() {
    if (!this.selectedPackage) return;

    const availableOptions = this.getAvailableItineraryOptions();

    if (!availableOptions.length) {
      this.renderItineraryOptions();
      this.updatePrintQuotation();
      return;
    }

    const currentStillAvailable = availableOptions.some((option) => option.code === this.selectedItineraryOption?.code);

    if (!currentStillAvailable) {
      this.selectedItineraryOption =
        availableOptions.find((option) => option.recommended) ||
        availableOptions[0];
    }

    this.renderItineraryOptions();
    this.renderTrainSelectors();
    this.updatePrintQuotation();
  }

  getAvailableItineraryOptions() {
    const options = Array.isArray(this.selectedPackage?.itineraryOptions)
      ? this.selectedPackage.itineraryOptions
      : [];

    if (!options.length) return [];

    return options.filter((option) => this.isItineraryAllowedByTime(option));
  }

  isItineraryAllowedByTime(option) {
    const itinerary = Array.isArray(option.itinerary) ? option.itinerary : [];

    const arrivalMinutes = this.timeToMinutes(this.arrivalTime);
    const departureMinutes = this.timeToMinutes(this.departureTime);

    const firstDay = itinerary.find((item) => Number(item.day || 0) === 1) || itinerary[0] || null;
    const lastDayNumber = itinerary.reduce((max, item) => Math.max(max, Number(item.day || 0)), 0);
    const lastDay = itinerary.find((item) => Number(item.day || 0) === lastDayNumber) || itinerary[itinerary.length - 1] || null;

    const firstDayText = `${firstDay?.title || ""} ${firstDay?.description || ""}`.toLowerCase();
    const lastDayText = `${lastDay?.title || ""} ${lastDay?.description || ""}`.toLowerCase();

    const firstDayHasCityTour =
      firstDayText.includes("city tour") ||
      firstDayText.includes("qoricancha") ||
      firstDayText.includes("sacsayhuamán") ||
      firstDayText.includes("sacsayhuaman");

    const firstDayHasWelcome =
      firstDayText.includes("bienvenida") ||
      firstDayText.includes("ancestral");

    const lastDayHasFullDay =
      lastDayText.includes("montaña de colores") ||
      lastDayText.includes("vinicunca") ||
      lastDayText.includes("humantay") ||
      lastDayText.includes("siete lagunas") ||
      lastDayText.includes("ausangate") ||
      lastDayText.includes("valle sagrado full") ||
      lastDayText.includes("full day valle sagrado") ||
      lastDayText.includes("machu picchu full day");

    const lastDayHasShortActivity =
      lastDayText.includes("maras") ||
      lastDayText.includes("moray") ||
      lastDayText.includes("valle sur") ||
      lastDayText.includes("walking tour") ||
      lastDayText.includes("caminata") ||
      lastDayText.includes("city tour");

    if (arrivalMinutes !== null) {
      if (arrivalMinutes > this.timeToMinutes("12:00") && firstDayHasCityTour) {
        return false;
      }

      if (arrivalMinutes > this.timeToMinutes("17:00") && firstDayHasWelcome) {
        return false;
      }
    }

    if (departureMinutes !== null) {
      if (departureMinutes < this.timeToMinutes("14:00") && lastDayHasShortActivity) {
        return false;
      }

      if (departureMinutes < this.timeToMinutes("19:00") && lastDayHasFullDay) {
        return false;
      }
    }

    return true;
  }

  renderItineraryOptions() {
    const section = document.getElementById("itinerarySection");
    const target = document.getElementById("itineraryOptions");
    const preview = document.getElementById("itineraryPreview");

    if (!section || !target || !preview || !this.selectedPackage) return;

    const allOptions = this.selectedPackage.itineraryOptions || [];
    const options = this.getAvailableItineraryOptions();

    if (!allOptions.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    this.updateItinerarySectionIntro(options.length);

    if (!options.length) {
      target.innerHTML = `
        <div class="quote-empty-state">
          No encontramos una opción compatible con los horarios ingresados.
          Puedes dejar los horarios en blanco o escribirnos para armar una versión personalizada.
        </div>
      `;
      preview.innerHTML = `<div class="quote-empty-state">Itinerario por confirmar.</div>`;
      return;
    }

    if (!options.some((option) => option.code === this.selectedItineraryOption?.code)) {
      this.selectedItineraryOption = options.find((option) => option.recommended) || options[0];
    }

    target.innerHTML = options.map((option) => {
      const isSelected = this.selectedItineraryOption?.code === option.code;
      const description = this.getItineraryMarketingDescription(option);

      return `
        <article class="quote-itinerary-option ${isSelected ? "is-selected" : ""}" data-itinerary-code="${this.escapeHtml(option.code)}">
          <h3>${this.escapeHtml(option.label)}</h3>
          <p>${this.escapeHtml(description)}</p>
          ${option.recommended ? `<span class="quote-badge quote-badge--gold">Recomendado</span>` : ""}
        </article>
      `;
    }).join("");

    target.querySelectorAll(".quote-itinerary-option").forEach((card) => {
      card.addEventListener("click", () => {
        const code = card.dataset.itineraryCode;
        this.selectedItineraryOption = options.find((item) => item.code === code) || options[0];

        this.selectedOutboundTrainCode = "";
        this.selectedReturnTrainCode = "";

        this.renderItineraryOptions();
        this.renderTrainSelectors();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });

    this.renderItineraryPreview();
  }

  buildDatedDayTitleHtml(item) {
    const dayNumber = Number(item.day || 1);
    const cleanTitle = String(item.title || `Día ${dayNumber}`)
      .replace(/^Día\s*\d+\s*:\s*/i, "")
      .replace(/^Dia\s*\d+\s*:\s*/i, "")
      .trim();

    const dateText = this.getDateForDay(dayNumber);
    const dateHtml = dateText ? ` <span class="itinerary-date">(${this.escapeHtml(dateText)})</span>` : "";

    return `Día ${dayNumber}:${dateHtml} ${this.escapeHtml(cleanTitle)}`;
  }

  renderItineraryPreview() {
    const preview = document.getElementById("itineraryPreview");
    if (!preview) return;

    const itinerary = this.selectedItineraryOption?.itinerary || [];

    if (!itinerary.length) {
      preview.innerHTML = `<div class="quote-empty-state">Itinerario por confirmar.</div>`;
      return;
    }

    preview.innerHTML = itinerary.map((item) => `
      <div class="quote-itinerary-item">
        <h4>${this.buildDatedDayTitleHtml(item)}</h4>
        <p>${this.escapeHtml(item.description || "")}</p>
      </div>
    `).join("");
  }

  renderPackageIncludes() {
    const existing = document.getElementById("packageIncludesBox");
    if (existing) existing.remove();

    if (!this.selectedPackage) return;

    const itinerarySection = document.getElementById("itinerarySection");
    if (!itinerarySection) return;

    const includes = Array.isArray(this.selectedPackage.includes)
      ? this.selectedPackage.includes
      : [];

    if (!includes.length) return;

    const box = document.createElement("div");
    box.id = "packageIncludesBox";
    box.className = "quote-package-includes";

    box.innerHTML = `
      <h3>Este itinerario incluye</h3>
      <p>El itinerario base considera los servicios esenciales para operar la ruta seleccionada. El tren y el alojamiento se cotizan aparte según tus preferencias.</p>
      <ul>
        ${includes.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
      </ul>
    `;

    const preview = document.querySelector(".quote-itinerary-preview");
    if (preview) {
      preview.insertAdjacentElement("afterend", box);
    } else {
      itinerarySection.appendChild(box);
    }
  }

  updateItinerarySectionIntro(optionsCount = 0) {
    const headerText = document.querySelector("#itinerarySection .quote-card__header p");
    if (!headerText || !this.selectedPackage) return;

    headerText.innerHTML = `
      Tu viaje será de <strong>${this.travelDays} días / ${this.travelNights} noches</strong>.
      Estas son las opciones de itinerario disponibles para tus fechas.
      ${optionsCount ? `Actualmente tienes ${optionsCount} opción${optionsCount !== 1 ? "es" : ""} compatible${optionsCount !== 1 ? "s" : ""}.` : ""}
    `;
  }

  getItineraryMarketingDescription(option) {
    const text = `${option.label || ""} ${option.summary || ""} ${(option.itinerary || []).map((item) => `${item.title || ""} ${item.description || ""}`).join(" ")}`.toLowerCase();

    if (option.summary && !/tren sugerido|sugerido|tren/i.test(option.summary)) {
      return option.summary;
    }

    if (text.includes("valle sagrado") && text.includes("aguas calientes")) {
      return "Itinerario progresivo con Valle Sagrado conexión, noche en Aguas Calientes y visita a Machu Picchu al día siguiente.";
    }

    if (text.includes("montaña de colores") || text.includes("vinicunca")) {
      return "Itinerario activo y aventurero, ideal para combinar Machu Picchu con una caminata de alta montaña.";
    }

    if (text.includes("humantay")) {
      return "Itinerario natural y fotográfico, pensado para combinar Machu Picchu con una caminata hacia una laguna altoandina.";
    }

    if (text.includes("siete lagunas") || text.includes("ausangate")) {
      return "Itinerario altoandino de mayor exigencia, recomendado para viajeros que buscan paisajes de montaña y una experiencia más aventurera.";
    }

    if (text.includes("bienvenida") || text.includes("ancestral")) {
      return "Itinerario suave para el primer día, ideal para aclimatarte con calma antes de visitar Machu Picchu.";
    }

    if (text.includes("city tour")) {
      return "Itinerario clásico para iniciar con los principales atractivos de Cusco y continuar con Machu Picchu.";
    }

    return "Itinerario disponible para tus fechas, con servicios organizados según la duración seleccionada.";
  }

  renderAccommodationOptions() {
    const section = document.getElementById("hotelSection");
    const container = document.getElementById("hotelSelectorsContainer");

    if (!section || !container) return;

    section.hidden = true;
    container.innerHTML = "";

    if (!this.selectedPackage) return;

    const summary = this.getAccommodationSummary();
    if (!summary.length) return;

    section.hidden = false;

    container.innerHTML = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      const additional = this.calculateAccommodationAdditional(item.destination);
      const destinationLabel = this.getDestinationLabel(item.destination);
      const hasSelection = Boolean(selection?.hotel && selection?.combination);
      const isNoHotel = selection?.hotel?.hotelCode === "no-hotel";
      const hotelImage = !isNoHotel ? this.getHotelCoverImage(selection?.hotel) : "";

      const hotelText = selection?.hotel
        ? isNoHotel
          ? "Sin alojamiento"
          : `${this.escapeHtml(selection.hotel.hotelName)}${selection.hotel.stars > 0 ? ` · ${selection.hotel.stars}★` : ""}`
        : "Sin hotel seleccionado";

      const comboText = selection?.combination
        ? isNoHotel
          ? "No se agregará costo de alojamiento."
          : this.escapeHtml(selection.combination.label)
        : "Acomodación por confirmar";

      return `
        <div class="quote-accommodation-card ${hotelImage ? "has-hotel-image" : ""}">
          <div class="quote-accommodation-card__header">
            <strong>${this.escapeHtml(destinationLabel)}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="quote-accommodation-card__body">
            ${hotelImage
              ? `
                <img
                  class="quote-accommodation-card__image"
                  src="${this.escapeHtml(this.resolveAssetPath(hotelImage))}"
                  alt="${this.escapeHtml(selection.hotel.hotelName)}"
                  loading="lazy"
                />
              `
              : ""
            }

            <div class="quote-accommodation-card__content">
              <p><strong>${hotelText}</strong></p>
              <p>${comboText}</p>
              <p class="quote-accommodation-card__price">
                + ${this.formatCurrency(additional, this.quoteCurrency)} por estadía
              </p>
              <button type="button" class="btn quote-secondary-btn open-hotel-modal-btn" data-destination="${this.escapeHtml(item.destination)}">
                ${hasSelection ? "Cambiar hotel" : "Elegir hotel"}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".open-hotel-modal-btn").forEach((button) => {
      button.addEventListener("click", () => this.openHotelModal(button.dataset.destination));
    });
  }

  refreshAccommodationSelections() {
    if (!this.selectedPackage) return;

    const summary = this.getAccommodationSummary();
    const passengers = this.getTotalPassengers();

    summary.forEach((item) => {
      const hotels = this.getHotelsByDestination(item.destination);
      const allHotels = [this.getNoHotelOption(item.destination), ...hotels];

      let hotelCode = this.selectedHotelsByDestination[item.destination];
      let hotel =
        hotelCode === "no-hotel"
          ? allHotels.find((h) => h.hotelCode === "no-hotel")
          : this.getHotelByCode(item.destination, hotelCode);

      if (!hotel) {
        hotel = allHotels[0];
        hotelCode = hotel.hotelCode;
        this.selectedHotelsByDestination[item.destination] = hotelCode;
      }

      const combinations = this.generateAccommodationCombinations(
        hotel.rooms || [],
        passengers,
        Number(item.nights || 0)
      );

      const selectedKey = this.selectedCombinationsByDestination[item.destination]?.key;
      const stillValid = combinations.find((combo) => combo.key === selectedKey);

      if (!stillValid) {
        this.selectedCombinationsByDestination[item.destination] = combinations[0] || null;
      }
    });

    this.renderAccommodationOptions();
  }

  openHotelModal(destination) {
    const modal = document.getElementById("hotelSelectionModal");
    const title = document.getElementById("hotelModalTitle");
    const subtitle = document.getElementById("hotelModalSubtitle");
    const list = document.getElementById("hotelModalList");

    if (!modal || !title || !subtitle || !list || !this.selectedPackage) return;

    this.activeHotelModalDestination = destination;

    const currentHotelCode = this.selectedHotelsByDestination[destination] || "no-hotel";
    const currentComboKey = this.selectedCombinationsByDestination[destination]?.key || "";

    this.pendingHotelSelection = {
      destination,
      hotelCode: currentHotelCode,
      comboKey: currentComboKey
    };

    const destinationLabel = this.getDestinationLabel(destination);
    const summaryItem = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summaryItem?.nights || 0);
    const passengers = this.getTotalPassengers();

    title.textContent = `Elige tu hotel en ${destinationLabel}`;
    subtitle.textContent = `Compara opciones para ${nights} noche${nights !== 1 ? "s" : ""} y ${passengers} pasajero${passengers !== 1 ? "s" : ""}.`;

    const hotels = [this.getNoHotelOption(destination), ...this.getHotelsByDestination(destination)];

    list.innerHTML = hotels.map((hotel) => {
      const combinations = this.generateAccommodationCombinations(hotel.rooms || [], passengers, nights);
      const isSelectedHotel = this.pendingHotelSelection.hotelCode === hotel.hotelCode;
      const isNoHotel = hotel.hotelCode === "no-hotel";

      const initialCombo =
        combinations.find((combo) => isSelectedHotel && combo.key === this.pendingHotelSelection.comboKey) ||
        combinations[0] ||
        null;

      if (isSelectedHotel && initialCombo) {
        this.pendingHotelSelection.comboKey = initialCombo.key;
      }

      const images = this.getHotelImages(hotel);

      const firstPrice = combinations[0]
        ? this.convertMoney(Number(combinations[0].totalForStay || 0), "USD", this.quoteCurrency)
        : 0;

      if (isNoHotel) {
        return `
          <article
            class="hotel-option-card hotel-option-card--no-hotel ${isSelectedHotel ? "is-selected" : ""}"
            data-destination="${this.escapeHtml(destination)}"
            data-hotel-code="no-hotel"
            data-selected-combo-key="${this.escapeHtml(initialCombo?.key || "no-hotel")}"
          >
            <button
              type="button"
              class="hotel-combo-btn hotel-combo-btn--compact ${isSelectedHotel ? "is-selected" : ""}"
              data-destination="${this.escapeHtml(destination)}"
              data-hotel-code="no-hotel"
              data-combo-key="${this.escapeHtml(initialCombo?.key || "no-hotel")}"
            >
              <span class="hotel-combo-btn__radio" aria-hidden="true"></span>
              <span class="hotel-combo-btn__main">Opción sin alojamiento</span>
              <span class="hotel-combo-btn__sub">${this.formatCurrency(0, this.quoteCurrency)} por estadía</span>
            </button>
          </article>
        `;
      }

      return `
        <article
          class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""}"
          data-destination="${this.escapeHtml(destination)}"
          data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
          data-selected-combo-key="${this.escapeHtml(initialCombo?.key || "")}"
        >
          <div class="hotel-option-card__header">
            <div>
              <h3>${this.escapeHtml(hotel.hotelName)}</h3>
              <p>${hotel.stars || 0}★ · ${this.escapeHtml(hotel.location || destinationLabel)}</p>
              ${hotel.address ? `<p>${this.escapeHtml(hotel.address)}</p>` : ""}
            </div>

            <div class="hotel-option-card__badge">
              Desde ${this.formatCurrency(firstPrice, this.quoteCurrency)}
            </div>
          </div>

          <div class="hotel-option-card__content">
            <div class="hotel-option-card__media">
              ${this.renderHotelModalGallery(images, hotel.hotelName)}
            </div>

            <div class="hotel-option-card__body">
              <label>Selecciona tipo de habitación</label>

              <div class="hotel-option-card__options">
                ${combinations.length
                  ? combinations.map((combo) => {
                      const convertedTotal = this.convertMoney(Number(combo.totalForStay || 0), "USD", this.quoteCurrency);
                      const convertedNight = this.convertMoney(Number(combo.totalPerNight || 0), "USD", this.quoteCurrency);
                      const selectedCombo = isSelectedHotel && initialCombo?.key === combo.key;

                      return `
                        <button
                          type="button"
                          class="hotel-combo-btn ${selectedCombo ? "is-selected" : ""}"
                          data-destination="${this.escapeHtml(destination)}"
                          data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
                          data-combo-key="${this.escapeHtml(combo.key)}"
                        >
                          <span class="hotel-combo-btn__radio" aria-hidden="true"></span>
                          <span class="hotel-combo-btn__main">${this.escapeHtml(combo.label)}</span>
                          <span class="hotel-combo-btn__sub">
                            ${combo.totalRooms} hab. · ${this.formatCurrency(convertedNight, this.quoteCurrency)} / noche · ${this.formatCurrency(convertedTotal, this.quoteCurrency)} total
                          </span>
                        </button>
                      `;
                    }).join("")
                  : `<p>No hay acomodaciones válidas para ${passengers} pasajero${passengers !== 1 ? "s" : ""}.</p>`
                }
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    this.bindHotelModalSelectionEvents();
    this.bindHotelModalGalleryEvents();

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  bindHotelModalSelectionEvents() {
    const list = document.getElementById("hotelModalList");
    if (!list) return;

    list.querySelectorAll(".hotel-combo-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const hotelCode = button.dataset.hotelCode;
        const comboKey = button.dataset.comboKey;

        this.pendingHotelSelection.hotelCode = hotelCode;
        this.pendingHotelSelection.comboKey = comboKey;

        list.querySelectorAll(".hotel-option-card").forEach((item) => {
          item.classList.toggle("is-selected", item.dataset.hotelCode === hotelCode);
        });

        list.querySelectorAll(".hotel-combo-btn").forEach((comboButton) => {
          comboButton.classList.toggle(
            "is-selected",
            comboButton.dataset.hotelCode === hotelCode && comboButton.dataset.comboKey === comboKey
          );
        });
      });
    });
  }

  bindHotelModalEvents() {
    const modal = document.getElementById("hotelSelectionModal");
    const confirmBtn = document.getElementById("confirmHotelSelectionBtn");

    document.querySelectorAll("[data-close-hotel-modal]").forEach((button) => {
      button.addEventListener("click", () => this.closeHotelModal());
    });

    modal?.querySelector(".quote-modal__backdrop")?.addEventListener("click", () => this.closeHotelModal());

    confirmBtn?.addEventListener("click", () => {
      this.confirmHotelSelection();
    });
  }

  confirmHotelSelection() {
    if (!this.pendingHotelSelection) return;

    const { destination, hotelCode, comboKey } = this.pendingHotelSelection;

    const hotel =
      hotelCode === "no-hotel"
        ? this.getNoHotelOption(destination)
        : this.getHotelByCode(destination, hotelCode);

    if (!hotel) return;

    const summaryItem = this.getAccommodationSummary().find((item) => item.destination === destination);

    const combinations = this.generateAccommodationCombinations(
      hotel.rooms || [],
      this.getTotalPassengers(),
      Number(summaryItem?.nights || 0)
    );

    const combination = combinations.find((item) => item.key === comboKey) || combinations[0] || null;

    if (!combination) return;

    this.selectedHotelsByDestination[destination] = hotelCode;
    this.selectedCombinationsByDestination[destination] = combination;

    this.renderAccommodationOptions();
    this.updatePricing();
    this.updatePrintQuotation();
    this.closeHotelModal();
  }

  closeHotelModal() {
    const modal = document.getElementById("hotelSelectionModal");
    if (modal) modal.hidden = true;

    this.activeHotelModalDestination = null;
    this.pendingHotelSelection = null;
    document.body.classList.remove("quote-modal-open");
  }

  getNoHotelOption(destination) {
    const destinationLabel = this.getDestinationLabel(destination);
    const passengers = Math.max(this.getTotalPassengers(), 1);

    return {
      hotelCode: "no-hotel",
      hotelName: "Sin alojamiento",
      stars: 0,
      location: destinationLabel,
      address: "",
      images: {
        cover: "",
        gallery: []
      },
      rooms: [
        {
          roomType: "no-hotel",
          label: "Opción sin alojamiento",
          bedType: "No incluye alojamiento",
          capacity: passengers,
          pricePerNight: 0
        }
      ]
    };
  }

  renderHotelModalGallery(images, hotelName) {
    if (!images.length) {
      return `
        <div class="hotel-gallery-main hotel-gallery-main--empty">
          <div class="hotel-gallery-empty-state">
            <strong>${this.escapeHtml(hotelName || "Hotel")}</strong>
            <span>Imagen referencial no disponible.</span>
          </div>
        </div>
      `;
    }

    const resolvedImages = images.map((image) => this.resolveAssetPath(image));

    return `
      <div class="hotel-gallery">
        <div class="hotel-gallery-main">
          <img
            class="hotel-gallery-main-img"
            src="${this.escapeHtml(resolvedImages[0])}"
            alt="${this.escapeHtml(hotelName)}"
            loading="lazy"
          />
        </div>

        ${resolvedImages.length > 1
          ? `
            <div class="hotel-gallery-thumbs">
              ${resolvedImages.slice(0, 6).map((image, index) => `
                <button
                  type="button"
                  class="hotel-gallery-thumb ${index === 0 ? "is-active" : ""}"
                  data-image="${this.escapeHtml(image)}"
                  aria-label="Ver imagen ${index + 1} de ${this.escapeHtml(hotelName)}"
                >
                  <img src="${this.escapeHtml(image)}" alt="${this.escapeHtml(hotelName)} ${index + 1}" loading="lazy" />
                </button>
              `).join("")}
            </div>
          `
          : ""
        }
      </div>
    `;
  }

  bindHotelModalGalleryEvents() {
    const list = document.getElementById("hotelModalList");
    if (!list) return;

    list.querySelectorAll(".hotel-gallery-thumb").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const gallery = button.closest(".hotel-gallery");
        const mainImage = gallery?.querySelector(".hotel-gallery-main-img");

        if (mainImage && button.dataset.image) {
          mainImage.src = button.dataset.image;
        }

        gallery?.querySelectorAll(".hotel-gallery-thumb").forEach((thumb) => {
          thumb.classList.toggle("is-active", thumb === button);
        });
      });
    });
  }

  getHotelImages(hotel) {
    if (!hotel || hotel.hotelCode === "no-hotel") return [];

    return [...new Set([
      ...(hotel.images?.cover ? [hotel.images.cover] : []),
      ...(Array.isArray(hotel.images?.gallery) ? hotel.images.gallery : [])
    ])].filter(Boolean);
  }

  getHotelCoverImage(hotel) {
    return this.getHotelImages(hotel)[0] || "";
  }

  generateAccommodationCombinations(rooms, passengers, nights) {
    const totalPassengers = Math.max(Number(passengers || 0), 1);
    const totalNights = Math.max(Number(nights || 0), 0);

    const normalizedRooms = Array.isArray(rooms)
      ? rooms
          .map((room) => ({
            ...room,
            capacity: Math.max(Number(room.capacity || room.maxGuests || 1), 1),
            pricePerNight: Number(room.pricePerNight || room.price || 0)
          }))
          .filter((room) => room.capacity > 0)
      : [];

    if (!normalizedRooms.length) return [];

    if (normalizedRooms.some((room) => room.roomType === "no-hotel")) {
      return [
        {
          key: "no-hotel",
          label: "Opción sin alojamiento",
          rooms: [],
          totalRooms: 0,
          totalPerNight: 0,
          totalForStay: 0
        }
      ];
    }

    const sortedRooms = [...normalizedRooms].sort((a, b) => {
      if (a.capacity !== b.capacity) return b.capacity - a.capacity;
      return a.pricePerNight - b.pricePerNight;
    });

    const combinations = [];
    const maxRooms = Math.min(totalPassengers, 6);

    const build = (startIndex, currentRooms, currentCapacity) => {
      if (currentCapacity >= totalPassengers) {
        const totalPerNight = currentRooms.reduce((sum, room) => sum + room.pricePerNight, 0);
        const totalForStay = totalPerNight * totalNights;
        const label = this.buildRoomCombinationLabel(currentRooms);

        combinations.push({
          key: currentRooms.map((room) => room.roomType || room.label).sort().join("|") + `-${currentRooms.length}-${totalForStay}`,
          label,
          rooms: currentRooms,
          totalRooms: currentRooms.length,
          totalPerNight,
          totalForStay
        });
        return;
      }

      if (currentRooms.length >= maxRooms) return;

      for (let index = startIndex; index < sortedRooms.length; index += 1) {
        build(index, [...currentRooms, sortedRooms[index]], currentCapacity + sortedRooms[index].capacity);
      }
    };

    build(0, [], 0);

    const unique = [];
    const seen = new Set();

    combinations
      .sort((a, b) => {
        if (a.totalForStay !== b.totalForStay) return a.totalForStay - b.totalForStay;
        return a.totalRooms - b.totalRooms;
      })
      .forEach((combo) => {
        const signature = `${combo.label}-${combo.totalForStay}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          unique.push(combo);
        }
      });

    return unique.slice(0, 8);
  }

  buildRoomCombinationLabel(rooms) {
    const countMap = new Map();

    rooms.forEach((room) => {
      const label = room.label || room.roomType || "Habitación";
      countMap.set(label, (countMap.get(label) || 0) + 1);
    });

    return Array.from(countMap.entries())
      .map(([label, count]) => `${count} ${label}`)
      .join(" + ");
  }

  getSelectedAccommodationForDestination(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];

    let hotel = null;

    if (hotelCode === "no-hotel") {
      hotel = this.getNoHotelOption(destination);
    } else {
      hotel = this.getHotelByCode(destination, hotelCode);
    }

    const combination = this.selectedCombinationsByDestination[destination] || null;

    return { hotel, combination };
  }

  getAccommodationSummary() {
    return Array.isArray(this.selectedPackage?.accommodationSummary)
      ? this.selectedPackage.accommodationSummary
      : [];
  }

  getHotelsByDestination(destination) {
    const hotels = this.hotelsData?.destinations?.[destination]?.hotels;
    return Array.isArray(hotels) ? hotels : [];
  }

  getHotelByCode(destination, hotelCode) {
    return this.getHotelsByDestination(destination).find((hotel) => hotel.hotelCode === hotelCode) || null;
  }

  getDestinationLabel(destination) {
    return this.hotelsData?.destinations?.[destination]?.label ||
      destination
        .replace(/-/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  calculateAccommodationAdditional(destination) {
    const selection = this.getSelectedAccommodationForDestination(destination);
    return this.convertMoney(Number(selection?.combination?.totalForStay || 0), "USD", this.quoteCurrency);
  }

  renderTrainSelectors() {
    const outboundTitle = document.getElementById("outboundTrainSelectedTitle");
    const outboundMeta = document.getElementById("outboundTrainSelectedMeta");
    const returnTitle = document.getElementById("returnTrainSelectedTitle");
    const returnMeta = document.getElementById("returnTrainSelectedMeta");

    const outboundTrain = this.getSelectedTrain("outbound");
    const returnTrain = this.getSelectedTrain("return");

    if (outboundTitle) {
      outboundTitle.textContent = outboundTrain
        ? this.getTrainDisplayName(outboundTrain)
        : "Por seleccionar";
    }

    if (outboundMeta) {
      outboundMeta.textContent = outboundTrain
        ? this.getTrainMetaText(outboundTrain)
        : "Elige el tren de ida para completar la cotización.";
    }

    if (returnTitle) {
      returnTitle.textContent = returnTrain
        ? this.getTrainDisplayName(returnTrain)
        : "Por seleccionar";
    }

    if (returnMeta) {
      returnMeta.textContent = returnTrain
        ? this.getTrainMetaText(returnTrain)
        : "Elige el tren de retorno para completar la cotización.";
    }
  }

  openTrainSelectionModal(direction) {
    const modal = document.getElementById("trainSelectionModal");
    const title = document.getElementById("trainModalTitle");
    const subtitle = document.getElementById("trainModalSubtitle");
    const list = document.getElementById("trainModalList");

    if (!modal || !title || !subtitle || !list || !this.selectedPackage) return;

    this.activeTrainDirection = direction;
    this.pendingTrainCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;

    const routeKey = this.getTrainRouteKey(direction);
    const route = this.trainsData?.routes?.[routeKey];
    const options = this.getTrainOptionsForDirection(direction);
    const recommendedCodes = this.getRecommendedTrainCodes(direction);

    title.textContent = direction === "outbound" ? "Elige tu tren de ida" : "Elige tu tren de retorno";
    subtitle.textContent = route?.label || "Selecciona el tren disponible según ruta, horario y categoría.";

    if (!options.length) {
      list.innerHTML = `
        <div class="quote-empty-state">
          No hay trenes configurados para esta ruta.
        </div>
      `;
    } else {
      list.innerHTML = options.map((train) => {
        const selected = this.pendingTrainCode === train.code;
        const isRecommended = recommendedCodes.includes(train.code);
        const price = this.convertMoney(Number(train.pricePerPerson || train.price || 0), train.currency || "USD", this.quoteCurrency);
        const displayName = this.getTrainDisplayName(train);
        const meta = this.getTrainMetaText(train);
        const serviceLabel = this.getTrainServiceLabel(train);
        const displayCategory = this.getTrainDisplayCategory(train);

        return `
          <article
            class="train-option-card ${selected ? "is-selected" : ""} ${isRecommended ? "is-recommended" : ""}"
            data-train-code="${this.escapeHtml(train.code)}"
          >
            <div class="train-option-card__content">
              <div class="train-option-card__top">
                <span class="quote-badge quote-badge--muted">${this.escapeHtml(displayCategory)}</span>
                ${isRecommended ? `<span class="quote-badge quote-badge--gold">Recomendado</span>` : ""}
              </div>

              <h3>${this.escapeHtml(displayName)}</h3>

              ${serviceLabel ? `<p><strong>Categoría:</strong> ${this.escapeHtml(serviceLabel)}</p>` : ""}
              <p>${this.escapeHtml(train.description || meta)}</p>

              ${train.departureTime || train.arrivalTime
                ? `<p><strong>Horario:</strong> ${this.escapeHtml(train.departureTime || "")}${train.arrivalTime ? ` - ${this.escapeHtml(train.arrivalTime)}` : ""}</p>`
                : ""}
            </div>

            <div class="train-option-card__price">
              <strong>${this.formatCurrency(price, this.quoteCurrency)}</strong>
              <span>por persona</span>
            </div>
          </article>
        `;
      }).join("");
    }

    list.querySelectorAll(".train-option-card").forEach((card) => {
      card.addEventListener("click", () => {
        this.pendingTrainCode = card.dataset.trainCode || "";

        list.querySelectorAll(".train-option-card").forEach((item) => {
          item.classList.toggle("is-selected", item === card);
        });
      });
    });

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  bindTrainSelectionModalEvents() {
    const modal = document.getElementById("trainSelectionModal");
    const confirmBtn = document.getElementById("confirmTrainSelectionBtn");

    document.querySelectorAll("[data-close-train-modal]").forEach((button) => {
      button.addEventListener("click", () => this.closeTrainSelectionModal());
    });

    modal?.querySelector(".quote-modal__backdrop")?.addEventListener("click", () => this.closeTrainSelectionModal());

    confirmBtn?.addEventListener("click", () => {
      if (!this.activeTrainDirection) return;

      if (this.activeTrainDirection === "outbound") {
        this.selectedOutboundTrainCode = this.pendingTrainCode || "";
      } else {
        this.selectedReturnTrainCode = this.pendingTrainCode || "";
      }

      this.renderTrainSelectors();
      this.updatePricing();
      this.updatePrintQuotation();
      this.closeTrainSelectionModal();
    });
  }

  closeTrainSelectionModal() {
    const modal = document.getElementById("trainSelectionModal");
    if (modal) modal.hidden = true;

    this.activeTrainDirection = null;
    this.pendingTrainCode = "";
    document.body.classList.remove("quote-modal-open");
  }

  bindTrainDetailsModalEvents() {
    document.querySelectorAll("[data-close-train-details-modal]").forEach((button) => {
      button.addEventListener("click", () => {
        const modal = document.getElementById("trainDetailsModal");
        if (modal) modal.hidden = true;
        document.body.classList.remove("quote-modal-open");
      });
    });
  }

  getTrainRouteKey(direction) {
    if (direction === "return") {
      return "machu_picchu_return";
    }
  
    const optionText = this.getSelectedItineraryText();
  
    const isSacredValleyConnection =
      optionText.includes("valle sagrado conexión") ||
      optionText.includes("valle sagrado conexion") ||
      optionText.includes("valle conexión") ||
      optionText.includes("valle conexion") ||
      (optionText.includes("valle sagrado") && optionText.includes("aguas calientes"));
  
    const isFullDayMachuPicchu =
      optionText.includes("full day machu picchu") ||
      optionText.includes("full day a machu picchu") ||
      optionText.includes("machu picchu full day") ||
      optionText.includes("machu picchu en full day") ||
      optionText.includes("recojo desde el hotel de 3:40") ||
      optionText.includes("3:40 am") ||
      optionText.includes("4:00 am");
  
    if (isSacredValleyConnection) {
      return "sacred_valley_connection_outbound";
    }
  
    if (isFullDayMachuPicchu) {
      return "machu_picchu_full_day_outbound";
    }
  
    return this.selectedPackage?.trainSelection?.outboundRoute || "machu_picchu_full_day_outbound";
  }

  getTrainOptionsForDirection(direction) {
    const routeKey = this.getTrainRouteKey(direction);
    const route = this.trainsData?.routes?.[routeKey];
    const options = Array.isArray(route?.options) ? route.options : [];

    return options.filter((train) => {
      const market = String(train.market || train.availableFor || "general").toLowerCase();

      if (market.includes("peru") || market.includes("national") || market.includes("local")) {
        return this.nationality === "national";
      }

      return true;
    });
  }

  getSelectedTrain(direction) {
    const code = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;
    if (!code) return null;

    return this.getTrainOptionsForDirection(direction).find((train) => train.code === code) || null;
  }

  getTrainDisplayName(train) {
    const company = train.company || "";
    const service = this.getTrainServiceLabel(train);

    return [company, service]
      .filter(Boolean)
      .join(" · ");
  }

  getTrainServiceLabel(train) {
    return (
      train.name ||
      train.serviceName ||
      train.service ||
      train.categoryName ||
      train.category ||
      train.trainCategory ||
      train.className ||
      train.type ||
      ""
    );
  }

  getTrainDisplayCategory(train) {
    if (train.displayCategory) {
      return train.displayCategory;
    }

    const category = this.trainsData?.trainCategories?.[train.categoryCode];

    if (category?.displayCategory) {
      return category.displayCategory;
    }

    const tier = String(category?.tier || "").replace(/_/g, "-");

    const labelsByTier = {
      local: "Local",
      economy: "Economy",
      "premium-economy": "Premium Economy",
      premium: "Premium",
      luxury: "Luxury"
    };

    return labelsByTier[tier] || train.company || "Tren";
  }

  getTrainMetaText(train) {
    const parts = [];

    if (train.routeLabel) parts.push(train.routeLabel);
    if (train.scheduleLabel) parts.push(train.scheduleLabel);
    if (train.duration) parts.push(train.duration);

    const service = this.getTrainServiceLabel(train);
    if (service) parts.push(service);

    return parts.length ? parts.join(" · ") : "Tren seleccionado según disponibilidad.";
  }

  getRecommendedTrainCodes(direction) {
    const options = this.getTrainOptionsForDirection(direction);
    const optionText = this.getSelectedItineraryText();

    if (direction !== "outbound") return [];

    const isFullDayMachuPicchu =
      optionText.includes("full day machu picchu") ||
      optionText.includes("full day a machu picchu") ||
      optionText.includes("machu picchu full day") ||
      optionText.includes("machu picchu en full day") ||
      optionText.includes("recojo desde el hotel de 3:40") ||
      optionText.includes("3:40 am") ||
      optionText.includes("4:00 am");

    const isSacredValleyConnection =
      optionText.includes("valle sagrado conexión") ||
      optionText.includes("valle sagrado conexion") ||
      optionText.includes("valle conexión") ||
      optionText.includes("valle conexion") ||
      (optionText.includes("aguas calientes") && optionText.includes("valle sagrado"));

    if (isFullDayMachuPicchu) {
      return options
        .filter((train) => {
          const minutes = this.timeToMinutes(train.departureTime || "");
          return minutes !== null && minutes >= this.timeToMinutes("04:00") && minutes <= this.timeToMinutes("06:00");
        })
        .map((train) => train.code);
    }

    if (isSacredValleyConnection) {
      return options
        .filter((train) => {
          const minutes = this.timeToMinutes(train.departureTime || "");
          const company = String(train.company || "").toLowerCase();
          return company.includes("inca") && minutes !== null && minutes >= this.timeToMinutes("14:00") && minutes <= this.timeToMinutes("18:00");
        })
        .map((train) => train.code);
    }

    return [];
  }

  getSelectedItineraryText() {
    const option = this.selectedItineraryOption || {};
    const itineraryText = Array.isArray(option.itinerary)
      ? option.itinerary.map((item) => `${item.title || ""} ${item.description || ""}`).join(" ")
      : "";

    return `${option.code || ""} ${option.label || ""} ${option.summary || ""} ${itineraryText}`.toLowerCase();
  }

  calculateTrainTotal() {
    const outboundTrain = this.getSelectedTrain("outbound");
    const returnTrain = this.getSelectedTrain("return");
    const passengers = this.getTotalPassengers();

    let total = 0;

    [outboundTrain, returnTrain].forEach((train) => {
      if (!train) return;

      const amount = Number(train.pricePerPerson || train.price || 0);
      total += this.convertMoney(amount, train.currency || "USD", this.quoteCurrency) * passengers;
    });

    return total;
  }

  renderExtras() {
    const section = document.getElementById("extrasSection");
    const container = document.getElementById("extrasContainer");

    if (!section || !container) return;

    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];

    if (!extras.length) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;

    container.innerHTML = extras.map((extra) => {
      const checked = this.selectedExtras.has(extra.code);
      const amount = this.convertMoney(Number(extra.price || 0), extra.currency || "USD", this.quoteCurrency);
      const suffix = extra.perPerson ? "por persona" : "por servicio";

      return `
        <label class="quote-extra-item ${checked ? "is-selected" : ""}">
          <input type="checkbox" value="${this.escapeHtml(extra.code)}" ${checked ? "checked" : ""} />
          <span>
            <strong>${this.escapeHtml(extra.label)}</strong>
            <small>${this.formatCurrency(amount, this.quoteCurrency)} ${suffix}</small>
          </span>
        </label>
      `;
    }).join("");

    container.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) this.selectedExtras.add(input.value);
        else this.selectedExtras.delete(input.value);

        this.renderExtras();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });
  }

  calculateExtrasTotal() {
    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
    const passengers = this.getTotalPassengers();

    return extras.reduce((sum, extra) => {
      if (!this.selectedExtras.has(extra.code)) return sum;

      const amount = this.convertMoney(Number(extra.price || 0), extra.currency || "USD", this.quoteCurrency);
      return sum + amount * (extra.perPerson ? passengers : 1);
    }, 0);
  }

  applyManualDiscountCode() {
    const input = document.getElementById("discountCodeInput");

    const code = String(input?.value || "").trim().toUpperCase();

    if (!code) {
      this.appliedDiscountCode = null;
      this.setDiscountMessage("Ingresa un código para aplicar descuento.", "error");
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    const result = this.validateDiscountCode(code);

    if (!result.valid) {
      this.appliedDiscountCode = null;
      this.setDiscountMessage(result.message, "error");
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    this.appliedDiscountCode = result.discount;
    this.setDiscountMessage(`Código aplicado: ${result.discount.label || result.discount.code}.`, "success");
    this.updatePricing();
    this.updatePrintQuotation();
  }

  validateDiscountCode(code) {
    const discount = this.discountCodes.find((item) => String(item.code || "").toUpperCase() === code);

    if (!discount) {
      return { valid: false, message: "Código no encontrado o inválido." };
    }

    if (discount.active === false) {
      return { valid: false, message: "Este código ya no está activo." };
    }

    const today = this.startOfDay(new Date());

    if (discount.validFrom) {
      const validFrom = this.startOfDay(new Date(`${discount.validFrom}T00:00:00`));
      if (today < validFrom) {
        return { valid: false, message: `Este código estará disponible desde ${this.formatDateHuman(discount.validFrom)}.` };
      }
    }

    if (discount.validUntil || discount.expiresAt || discount.expirationDate) {
      const dateText = discount.validUntil || discount.expiresAt || discount.expirationDate;
      const validUntil = this.endOfDay(new Date(`${dateText}T00:00:00`));

      if (today > validUntil) {
        return { valid: false, message: `Este código venció el ${this.formatDateHuman(dateText)}.` };
      }
    }

    if (Array.isArray(discount.allowedNationalities) && discount.allowedNationalities.length) {
      if (!discount.allowedNationalities.includes(this.nationality)) {
        return { valid: false, message: "Este código no aplica para la nacionalidad seleccionada." };
      }
    }

    if (Array.isArray(discount.allowedCurrencies) && discount.allowedCurrencies.length) {
      if (!discount.allowedCurrencies.includes(this.quoteCurrency)) {
        return { valid: false, message: "Este código no aplica para la moneda seleccionada." };
      }
    }

    if (Number(discount.minTotal || 0) > 0) {
      const totals = this.calculatePricing();

      if (totals.subtotalBeforeDiscount < Number(discount.minTotal)) {
        return {
          valid: false,
          message: `Este código aplica desde ${this.formatCurrency(Number(discount.minTotal), this.quoteCurrency)}.`
        };
      }
    }

    return { valid: true, discount };
  }

  clearAppliedDiscountCode(clearInput = true) {
    this.appliedDiscountCode = null;

    if (clearInput) {
      const input = document.getElementById("discountCodeInput");
      if (input) input.value = "";
    }

    this.setDiscountMessage("", "");
  }

  setDiscountMessage(text, type = "") {
    const message = document.getElementById("discountCodeMessage");
    if (!message) return;

    message.textContent = text || "";
    message.classList.remove("is-success", "is-error");

    if (type === "success") message.classList.add("is-success");
    if (type === "error") message.classList.add("is-error");
  }

  calculatePricing() {
    const pricing = this.getBasePricingForPackage(this.selectedPackage);
    const adultUnit = this.convertMoney(Number(pricing.adult || 0), pricing.currency, this.quoteCurrency);
    const childUnit = this.convertMoney(Number(pricing.child || pricing.adult || 0), pricing.currency, this.quoteCurrency);

    const adultTotal = adultUnit * this.adults;
    const childTotal = childUnit * this.children;
    const baseTotal = adultTotal + childTotal;

    const hotelTotal = this.getAccommodationSummary().reduce((sum, item) => {
      return sum + this.calculateAccommodationAdditional(item.destination);
    }, 0);

    const trainTotal = this.calculateTrainTotal();
    const extrasTotal = this.calculateExtrasTotal();

    const subtotalBeforeDiscount = baseTotal + hotelTotal + trainTotal + extrasTotal;

    let manualDiscount = 0;
    if (this.appliedDiscountCode) {
      manualDiscount = this.calculateDiscountAmount(this.appliedDiscountCode, subtotalBeforeDiscount);
    }

    const paymentOptions = this.packagesData.paymentOptions || {};
    const fullPaymentDiscountPercent = Number(paymentOptions.fullPaymentDiscountPercent || 0);
    const fullPaymentDiscount = this.paymentMode === "full"
      ? subtotalBeforeDiscount * (fullPaymentDiscountPercent / 100)
      : 0;

    const totalDiscount = Math.min(subtotalBeforeDiscount, manualDiscount + fullPaymentDiscount);
    const total = Math.max(0, subtotalBeforeDiscount - totalDiscount);

    const partialPercent = Number(paymentOptions.partialPaymentPercent || 30);
    const advance = this.paymentMode === "partial" ? total * (partialPercent / 100) : total;
    const balance = this.paymentMode === "partial" ? Math.max(0, total - advance) : 0;

    return {
      pricing,
      adultUnit,
      childUnit,
      adultTotal,
      childTotal,
      baseTotal,
      hotelTotal,
      trainTotal,
      extrasTotal,
      subtotalBeforeDiscount,
      manualDiscount,
      fullPaymentDiscount,
      totalDiscount,
      total,
      advance,
      balance,
      partialPercent,
      fullPaymentDiscountPercent
    };
  }

  calculateDiscountAmount(discount, subtotal) {
    if (!discount || subtotal <= 0) return 0;

    if (discount.type === "percent") {
      return subtotal * (Number(discount.value || 0) / 100);
    }

    if (discount.type === "fixed") {
      const currency = discount.currency || this.quoteCurrency;
      return this.convertMoney(Number(discount.value || 0), currency, this.quoteCurrency);
    }

    return 0;
  }

  updatePricing() {
    const totals = this.calculatePricing();

    this.setText("basePackageTotal", "");
    this.setText("adultSummaryLabel", `Adultos x${this.adults}`);
    this.setText("adultSummaryTotal", this.formatCurrency(totals.adultTotal, this.quoteCurrency));

    const childrenRow = document.getElementById("childrenSummaryRow");
    if (childrenRow) childrenRow.hidden = this.children <= 0;
    this.setText("childrenSummaryLabel", `Niños x${this.children}`);
    this.setText("childrenSummaryTotal", this.formatCurrency(totals.childTotal, this.quoteCurrency));

    const hotelRow = document.getElementById("hotelSummaryRow");
    if (hotelRow) hotelRow.hidden = totals.hotelTotal <= 0;
    this.setText("hotelSummaryTotal", this.formatCurrency(totals.hotelTotal, this.quoteCurrency));

    const trainRow = document.getElementById("trainSummaryRow");
    if (trainRow) trainRow.hidden = totals.trainTotal <= 0;
    this.setText("trainSummaryTotal", this.formatCurrency(totals.trainTotal, this.quoteCurrency));

    const extrasRow = document.getElementById("extrasSummaryRow");
    if (extrasRow) extrasRow.hidden = totals.extrasTotal <= 0;
    this.setText("extrasSummaryTotal", this.formatCurrency(totals.extrasTotal, this.quoteCurrency));

    const discountRow = document.getElementById("discountSummaryRow");
    if (discountRow) discountRow.hidden = totals.totalDiscount <= 0;
    this.setText("discountSummaryTotal", `- ${this.formatCurrency(totals.totalDiscount, this.quoteCurrency)}`);

    this.setText("quoteGrandTotal", this.formatCurrency(totals.total, this.quoteCurrency));

    const advanceRow = document.getElementById("advanceSummaryRow");
    const balanceRow = document.getElementById("balanceSummaryRow");

    if (advanceRow) advanceRow.hidden = false;
    if (balanceRow) balanceRow.hidden = this.paymentMode !== "partial";

    this.setText(
      "advanceSummaryLabel",
      this.paymentMode === "partial" ? `Anticipo ${totals.partialPercent}%` : "Pagar ahora"
    );
    this.setText("advanceSummaryTotal", this.formatCurrency(totals.advance, this.quoteCurrency));
    this.setText("balanceSummaryTotal", this.formatCurrency(totals.balance, this.quoteCurrency));

    const paymentInfo = document.getElementById("paymentInfoText");
    if (paymentInfo) {
      if (this.paymentMode === "full") {
        paymentInfo.textContent = totals.fullPaymentDiscountPercent > 0
          ? `Pagando el total ahora accedes a un descuento del ${totals.fullPaymentDiscountPercent}%.`
          : "Pagando el total ahora dejas tu cotización cancelada.";
      } else {
        paymentInfo.textContent = `Reserva con ${this.formatCurrency(totals.advance, this.quoteCurrency)} y completa el saldo antes del viaje.`;
      }
    }

    this.updatePaymentButtonText();
  }

  updatePaymentButtonText() {
    const continuePaymentBtn = document.getElementById("continuePaymentBtn");
    if (!continuePaymentBtn) return;
  
    continuePaymentBtn.innerHTML = `
      <i class="fas fa-credit-card"></i>
      <span class="quote-payment-btn__desktop">Pagar ahora</span>
      <span class="quote-payment-btn__mobile">Pagar</span>
    `;
  }

  getBasePricingForPackage(pkg) {
    if (!pkg) return { adult: 0, child: 0, currency: this.quoteCurrency };

    const byNationality = pkg.basePricingByNationality?.[this.nationality];

    if (byNationality) {
      return {
        adult: Number(byNationality.adult || 0),
        child: Number(byNationality.child || byNationality.adult || 0),
        currency: byNationality.currency || pkg.currency || this.quoteCurrency
      };
    }

    return {
      adult: Number(pkg.basePricing?.adult || 0),
      child: Number(pkg.basePricing?.child || pkg.basePricing?.adult || 0),
      currency: pkg.currency || this.quoteCurrency
    };
  }

  updatePrintQuotation() {
    const totals = this.calculatePricing();
    const client = this.getClientData();

    this.setText("printQuoteReference", this.quoteReference);
    this.setText("printCouponCode", this.printCoupon);
    this.setText("printCouponDiscount", this.appliedDiscountCode?.label || "Especial");

    this.setText("printClientName", client.name || "Por completar");
    this.setText("printClientPhone", client.phone || "Por completar");
    this.setText("printClientEmail", client.email || "Por completar");
    this.setText("printClientDocument", client.document || "Por completar");
    this.setText("printClientNotes", client.notes || "Sin comentarios adicionales");

    this.setText("printTravelDates", this.getTravelDateRangeText());
    this.setText("printTravelDuration", this.travelDays && this.travelNights ? `${this.travelDays} días / ${this.travelNights} noches` : "Por definir");
    this.setText("printArrivalTime", this.arrivalTime || "Por definir");
    this.setText("printDepartureTime", this.departureTime || "Por definir");
    this.setText("printNationality", this.getNationalityLabel());
    this.setText("printCurrency", this.quoteCurrency);

    this.setText("printIssueDate", this.formatDateHuman(this.formatDateInput(new Date())));
    this.setText("printValidUntil", this.formatDateHuman(this.addDaysToDate(new Date(), 7)));

    this.setText("printPackageTitle", "");
    this.setText("printPackageDescription", "");

    this.renderPrintItinerary();
    this.renderPrintSelectedServices();
    this.renderPrintHotelImages();
    this.renderPrintPaymentDetails(totals);
  }

  renderPrintItinerary() {
    const target = document.getElementById("printItinerary");
    if (!target) return;

    const itinerary = this.selectedItineraryOption?.itinerary || [];

    if (!itinerary.length) {
      target.innerHTML = `<p>Itinerario por confirmar.</p>`;
      return;
    }

    target.innerHTML = itinerary.map((item) => `
      <div class="print-itinerary-item">
        <strong>${this.buildDatedDayTitleHtml(item)}</strong>
        <p>${this.escapeHtml(item.description || "")}</p>
      </div>
    `).join("");
  }

  renderPrintSelectedServices() {
    const target = document.getElementById("printSelectedServices");
    if (!target) return;

    const rows = [];

    if (this.selectedPackage) {
      rows.push(["Itinerario base", this.selectedPackage.title || "Itinerario seleccionado"]);
    }

    if (this.selectedItineraryOption) {
      rows.push(["Opción de itinerario", this.selectedItineraryOption.label || "Opción seleccionada"]);
    }

    const outboundTrain = this.getSelectedTrain("outbound");
    const returnTrain = this.getSelectedTrain("return");

    if (outboundTrain) rows.push(["Tren de ida", this.getTrainDisplayName(outboundTrain)]);
    if (returnTrain) rows.push(["Tren de retorno", this.getTrainDisplayName(returnTrain)]);

    this.getAccommodationSummary().forEach((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      const destinationLabel = this.getDestinationLabel(item.destination);

      if (!selection?.hotel || selection.hotel.hotelCode === "no-hotel") {
        rows.push([`Alojamiento ${destinationLabel}`, "Sin alojamiento"]);
        return;
      }

      rows.push([
        `Alojamiento ${destinationLabel}`,
        `${selection.hotel.hotelName}${selection.combination?.label ? ` · ${selection.combination.label}` : ""}`
      ]);
    });

    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
    const selectedExtras = extras.filter((extra) => this.selectedExtras.has(extra.code));

    selectedExtras.forEach((extra) => {
      rows.push(["Extra", extra.label]);
    });

    if (!rows.length) {
      target.innerHTML = `<p>Servicios por confirmar.</p>`;
      return;
    }

    target.innerHTML = `
      <table class="print-table">
        <tbody>
          ${rows.map(([label, value]) => `
            <tr>
              <th>${this.escapeHtml(label)}</th>
              <td>${this.escapeHtml(value)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  renderPrintHotelImages() {
    let target = document.getElementById("printHotelImages");

    if (!target) {
      const services = document.getElementById("printSelectedServices");
      if (!services) return;

      target = document.createElement("div");
      target.id = "printHotelImages";
      target.className = "print-hotel-images";
      services.insertAdjacentElement("afterend", target);
    }

    const hotels = [];

    this.getAccommodationSummary().forEach((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);

      if (!selection?.hotel || selection.hotel.hotelCode === "no-hotel") return;

      hotels.push({
        destination: this.getDestinationLabel(item.destination),
        name: selection.hotel.hotelName,
        nights: Number(item.nights || 0),
        images: this.getHotelImages(selection.hotel).slice(0, 4)
      });
    });

    if (!hotels.length) {
      target.innerHTML = "";
      return;
    }

    target.innerHTML = `
      <div class="print-hotel-list">
        ${hotels.map((hotel) => `
          <div class="print-hotel-row">
            <div class="print-hotel-row__info">
              <strong>${this.escapeHtml(hotel.name)}</strong>
              <span>${this.escapeHtml(hotel.destination)} · ${hotel.nights} noche${hotel.nights !== 1 ? "s" : ""}</span>
            </div>

            <div class="print-hotel-row__images">
              ${hotel.images.length
                ? hotel.images.map((image) => `
                  <img src="${this.escapeHtml(this.resolveAssetPath(image))}" alt="${this.escapeHtml(hotel.name)}" />
                `).join("")
                : `<div class="print-hotel-card__empty">Sin imagen</div>`
              }
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  renderPrintPaymentDetails(totals) {
    const target = document.getElementById("printPaymentDetails") || document.getElementById("printEconomicSummary");
    if (!target) return;

    const rows = [];

    rows.push([`Adultos x${this.adults}`, this.formatCurrency(totals.adultTotal, this.quoteCurrency)]);

    if (this.children > 0) {
      rows.push([`Niños x${this.children}`, this.formatCurrency(totals.childTotal, this.quoteCurrency)]);
    }

    if (totals.hotelTotal > 0) {
      rows.push(["Alojamiento", this.formatCurrency(totals.hotelTotal, this.quoteCurrency)]);
    }

    if (totals.trainTotal > 0) {
      rows.push(["Trenes", this.formatCurrency(totals.trainTotal, this.quoteCurrency)]);
    }

    if (totals.extrasTotal > 0) {
      rows.push(["Extras", this.formatCurrency(totals.extrasTotal, this.quoteCurrency)]);
    }

    if (totals.manualDiscount > 0) {
      rows.push([`Cupón ${this.appliedDiscountCode?.code || ""}`, `- ${this.formatCurrency(totals.manualDiscount, this.quoteCurrency)}`]);
    }

    if (totals.fullPaymentDiscount > 0) {
      rows.push([`Descuento pago total ${totals.fullPaymentDiscountPercent}%`, `- ${this.formatCurrency(totals.fullPaymentDiscount, this.quoteCurrency)}`]);
    }

    rows.push(["Total", this.formatCurrency(totals.total, this.quoteCurrency)]);

    if (this.paymentMode === "partial") {
      rows.push([`Anticipo ${totals.partialPercent}%`, this.formatCurrency(totals.advance, this.quoteCurrency)]);
      rows.push(["Saldo por pagar", this.formatCurrency(totals.balance, this.quoteCurrency)]);
    } else {
      rows.push(["Pago 100%", this.formatCurrency(totals.total, this.quoteCurrency)]);
    }

    target.innerHTML = `
      <table class="print-table print-payment-table">
        <tbody>
          ${rows.map(([label, value], index) => `
            <tr class="${index === rows.length - 1 ? "is-total" : ""}">
              <th>${this.escapeHtml(label)}</th>
              <td>${this.escapeHtml(value)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  saveQuotationAsPdf() {
    const printArea = document.getElementById("printQuotation");

    if (!printArea) {
      window.print();
      return;
    }

    this.updatePrintQuotation();

    if (typeof html2pdf === "undefined") {
      window.print();
      return;
    }

    const clonedPrintArea = printArea.cloneNode(true);
    clonedPrintArea.classList.add("print-quotation--pdf-export");

    clonedPrintArea.style.display = "block";
    clonedPrintArea.style.width = "210mm";
    clonedPrintArea.style.maxWidth = "210mm";
    clonedPrintArea.style.margin = "0 auto";
    clonedPrintArea.style.backgroundColor = "#ffffff";
    clonedPrintArea.style.fontFamily = "'Open Sans', Arial, sans-serif";
    clonedPrintArea.style.fontSize = "10.5px";
    clonedPrintArea.style.lineHeight = "1.32";

    const filename = `${this.quoteReference || "cotizacion-my-cusco-trip"}.pdf`;

    const options = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      },
      pagebreak: {
        mode: ["avoid-all", "css", "legacy"]
      }
    };

    document.body.appendChild(clonedPrintArea);

    html2pdf()
      .set(options)
      .from(clonedPrintArea)
      .save()
      .finally(() => {
        clonedPrintArea.remove();
      });
  }

  continueToPayment() {
    const totals = this.calculatePricing();
    const client = this.getClientData();

    const paymentData = {
      quoteReference: this.quoteReference,
      quoteCoupon: this.printCoupon,
      client,
      travel: {
        startDate: this.travelStartDate,
        endDate: this.travelEndDate,
        days: this.travelDays,
        nights: this.travelNights,
        arrivalTime: this.arrivalTime,
        departureTime: this.departureTime,
        nationality: this.nationality,
        currency: this.quoteCurrency
      },
      package: {
        id: this.selectedPackage?.id || "",
        title: this.selectedPackage?.title || "",
        itineraryOption: this.selectedItineraryOption?.code || ""
      },
      totals,
      paymentMode: this.paymentMode
    };

    try {
      sessionStorage.setItem("myCuscoTripQuotePayment", JSON.stringify(paymentData));
    } catch (error) {
      console.warn("No se pudo guardar la cotización en sessionStorage:", error);
    }

    alert(`Se continuará con el pago de ${this.formatCurrency(totals.advance, this.quoteCurrency)}.`);
  }

  ensureMobileSummaryToggle() {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel || panel.querySelector(".quote-mobile-summary-toggle")) return;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "quote-mobile-summary-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `<i class="fas fa-chevron-up"></i><span>Ver detalles</span>`;

    toggle.addEventListener("click", () => {
      panel.classList.toggle("is-expanded");

      const expanded = panel.classList.contains("is-expanded");
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggle.innerHTML = expanded
        ? `<i class="fas fa-chevron-down"></i><span>Ocultar detalles</span>`
        : `<i class="fas fa-chevron-up"></i><span>Ver detalles</span>`;
    });

    const top = panel.querySelector(".quote-summary-panel__top");
    if (top) top.insertAdjacentElement("afterend", toggle);
    else panel.prepend(toggle);
  }

  buildDatedDayTitle(item) {
    const dayNumber = Number(item.day || 1);
    const cleanTitle = String(item.title || `Día ${dayNumber}`)
      .replace(/^Día\s*\d+\s*:\s*/i, "")
      .replace(/^Dia\s*\d+\s*:\s*/i, "")
      .trim();

    const dateText = this.getDateForDay(dayNumber);

    if (dateText) {
      return `Día ${dayNumber} (${dateText}): ${cleanTitle}`;
    }

    return `Día ${dayNumber}: ${cleanTitle}`;
  }

  getDateForDay(dayNumber) {
    if (!this.travelStartDate || !dayNumber) return "";

    const start = new Date(`${this.travelStartDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return "";

    start.setDate(start.getDate() + Number(dayNumber || 1) - 1);

    return start.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long"
    });
  }

  getTravelDateRangeText() {
    if (!this.travelStartDate || !this.travelEndDate) return "Por definir";
    return `${this.formatDateHuman(this.travelStartDate)} al ${this.formatDateHuman(this.travelEndDate)}`;
  }

  getClientData() {
    return {
      name: document.getElementById("clientName")?.value.trim() || "",
      phone: document.getElementById("clientPhone")?.value.trim() || "",
      email: document.getElementById("clientEmail")?.value.trim() || "",
      document: document.getElementById("clientDocument")?.value.trim() || "",
      notes: document.getElementById("clientNotes")?.value.trim() || ""
    };
  }

  getNationalityLabel() {
    const select = document.getElementById("nationality");
    return select?.selectedOptions?.[0]?.textContent || this.nationality;
  }

  getTotalPassengers() {
    return this.adults + this.children;
  }

  updatePassengersUI() {
    this.setText("adultsCount", this.adults);
    this.setText("childrenCount", this.children);
  }

  updateReferenceUI() {
    this.setText("quoteReference", this.quoteReference);
  }

  updateExchangeRateHelp() {
    const help = document.getElementById("exchangeRateHelp");
    if (!help) return;

    help.textContent = `Tipo de cambio referencial: 1 USD = ${this.exchangeRate.toFixed(2)} PEN.`;
  }

  convertMoney(amount, fromCurrency, toCurrency) {
    const value = Number(amount || 0);
    const from = fromCurrency || toCurrency || this.quoteCurrency;
    const to = toCurrency || this.quoteCurrency;

    if (from === to) return value;

    if (from === "USD" && to === "PEN") return value * this.exchangeRate;
    if (from === "PEN" && to === "USD") return value / this.exchangeRate;

    return value;
  }

  formatCurrency(amount, currency = this.quoteCurrency) {
    const value = Number(amount || 0);

    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  addDaysToDate(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + Number(days || 0));
    return this.formatDateInput(result);
  }

  formatDateHuman(dateText) {
    if (!dateText) return "";

    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateText;

    return date.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  timeToMinutes(timeText) {
    if (!timeText || !/^\d{2}:\d{2}$/.test(timeText)) return null;

    const [hours, minutes] = timeText.split(":").map(Number);
    return hours * 60 + minutes;
  }

  startOfDay(date) {
    const clean = new Date(date);
    clean.setHours(0, 0, 0, 0);
    return clean;
  }

  endOfDay(date) {
    const clean = new Date(date);
    clean.setHours(23, 59, 59, 999);
    return clean;
  }

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  showSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = false;
  }

  hideSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = true;
  }

  resolvePath(path) {
    if (!path) return path;

    const cleanPath = path.replace(/^\.\//, "").replace(/^\//, "");

    if (this.basePath === "/") {
      return `/${cleanPath}`;
    }

    return `${this.basePath}${cleanPath}`;
  }

  resolveAssetPath(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) return path;

    const cleanPath = path.replace(/^\.\//, "").replace(/^\//, "");

    if (this.basePath === "/") {
      return `/${cleanPath}`;
    }

    return `${this.basePath}${cleanPath}`;
  }

  getStableQuoteReference() {
    const key = "myCuscoTripQuoteReference";

    try {
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;

      const reference = `COT-PE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      sessionStorage.setItem(key, reference);
      return reference;
    } catch (error) {
      return `COT-PE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    }
  }

  getStablePrintCoupon() {
    const key = "myCuscoTripPrintCoupon";

    try {
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;

      const coupon = `MCT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      sessionStorage.setItem(key, coupon);
      return coupon;
    } catch (error) {
      return `MCT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.myCuscoTripQuotePackages = new MyCuscoTripQuotePackages();
});
