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
      // this.initDesktopQuotePanelFixed();
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
      disableMobile: !isMobile,
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

    target.innerHTML = `
      <article class="quote-package-card is-selected quote-package-card--detected" aria-label="Itinerario detectado automáticamente">
        <div class="quote-package-card__top">
          <div>
            <span class="quote-badge quote-badge--muted">Itinerario detectado según tus fechas</span>
          </div>
          <span class="quote-badge quote-duration-badge">${this.travelDays} días / ${this.travelNights} noches</span>
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
      this.selectedItineraryOption = null;
      this.selectedOutboundTrainCode = "";
      this.selectedReturnTrainCode = "";
      this.renderItineraryOptions();
      this.renderTrainSelectors();
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    const currentStillAvailable = availableOptions.some((option) => {
      return option.code === this.selectedItineraryOption?.code;
    });

    if (!currentStillAvailable) {
      this.selectedItineraryOption =
        availableOptions.find((option) => option.recommended) ||
        availableOptions[0];

      this.selectedOutboundTrainCode = "";
      this.selectedReturnTrainCode = "";
    }

    this.renderItineraryOptions();
    this.renderTrainSelectors();
    this.updatePricing();
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
    const itinerary = Array.isArray(option?.itinerary) ? option.itinerary : [];
    if (!itinerary.length) return true;

    const arrivalMinutes = this.getEffectiveArrivalMinutes();
    const departureMinutes = this.getEffectiveDepartureMinutes();

    const firstDay = this.getFirstItineraryDay(itinerary);
    const lastDay = this.getLastItineraryDay(itinerary);

    const firstDayStart = this.getItineraryDayStartMinutes(firstDay);
    const lastDayEnd = this.getItineraryDayEndMinutes(lastDay);

    if (arrivalMinutes !== null && firstDayStart !== null && firstDayStart < arrivalMinutes) {
      return false;
    }

    if (departureMinutes !== null && lastDayEnd !== null && lastDayEnd > departureMinutes) {
      return false;
    }

    return true;
  }

  getFirstItineraryDay(itinerary) {
    if (!Array.isArray(itinerary) || !itinerary.length) return null;

    return itinerary.reduce((first, item) => {
      const firstDay = Number(first?.day || 9999);
      const currentDay = Number(item?.day || 9999);
      return currentDay < firstDay ? item : first;
    }, itinerary[0]);
  }

  getLastItineraryDay(itinerary) {
    if (!Array.isArray(itinerary) || !itinerary.length) return null;

    return itinerary.reduce((last, item) => {
      const lastDay = Number(last?.day || 0);
      const currentDay = Number(item?.day || 0);
      return currentDay > lastDay ? item : last;
    }, itinerary[0]);
  }

  getItineraryDayStartMinutes(dayItem) {
    if (!dayItem) return null;

    const directTime =
      dayItem.startTime ||
      dayItem.start ||
      dayItem.startHour ||
      dayItem.horaInicio ||
      dayItem.hora_inicio ||
      dayItem.timeStart;

    const directMinutes = this.timeToMinutes(directTime);
    if (directMinutes !== null) return directMinutes;

    const text = `${dayItem.title || ""} ${dayItem.description || ""}`.toLowerCase();

    if (text.includes("machu picchu full day") || text.includes("machu picchu express")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("vinicunca") || text.includes("montaña de colores")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("humantay")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("siete lagunas") || text.includes("ausangate")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("city tour")) {
      return this.timeToMinutes("13:00");
    }

    if (text.includes("bienvenida") || text.includes("ancestral")) {
      return this.timeToMinutes("09:00");
    }

    return null;
  }

  getItineraryDayEndMinutes(dayItem) {
    if (!dayItem) return null;

    const directTime =
      dayItem.endTime ||
      dayItem.end ||
      dayItem.endHour ||
      dayItem.horaFin ||
      dayItem.hora_fin ||
      dayItem.timeEnd;

    const directMinutes = this.timeToMinutes(directTime);
    if (directMinutes !== null) return directMinutes;

    const text = `${dayItem.title || ""} ${dayItem.description || ""}`.toLowerCase();

    if (text.includes("machu picchu full day")) {
      return this.timeToMinutes("23:30");
    }

    if (text.includes("machu picchu express")) {
      return this.timeToMinutes("19:00");
    }

    if (
      text.includes("vinicunca") ||
      text.includes("montaña de colores") ||
      text.includes("humantay") ||
      text.includes("siete lagunas") ||
      text.includes("ausangate")
    ) {
      return this.timeToMinutes("17:00");
    }

    if (
      text.includes("maras") ||
      text.includes("moray") ||
      text.includes("valle sur")
    ) {
      return this.timeToMinutes("15:00");
    }

    if (text.includes("city tour")) {
      return this.timeToMinutes("18:00");
    }

    if (text.includes("bienvenida") || text.includes("ancestral")) {
      return this.timeToMinutes("18:00");
    }

    return null;
  }

  getEffectiveArrivalMinutes() {
    const rawArrivalMinutes = this.timeToMinutes(this.arrivalTime);
    return rawArrivalMinutes === null ? null : Math.min(rawArrivalMinutes + 120, 1439);
  }

  getEffectiveDepartureMinutes() {
    const rawDepartureMinutes = this.timeToMinutes(this.departureTime);
    return rawDepartureMinutes === null ? null : Math.max(rawDepartureMinutes - 120, 0);
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
      const timeLabel = this.getItineraryOptionTimeLabel(option);

      return `
        <article class="quote-itinerary-option ${isSelected ? "is-selected" : ""}" data-itinerary-code="${this.escapeHtml(option.code)}">
          <h3>${this.escapeHtml(option.label)}</h3>
          <p>${this.escapeHtml(description)}</p>
          ${timeLabel ? `<span class="quote-itinerary-time">${this.escapeHtml(timeLabel)}</span>` : ""}
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

  getItineraryOptionTimeLabel(option) {
    const itinerary = Array.isArray(option?.itinerary) ? option.itinerary : [];
    if (!itinerary.length) return "";

    const firstDay = this.getFirstItineraryDay(itinerary);
    const lastDay = this.getLastItineraryDay(itinerary);

    const start = this.getItineraryDayStartMinutes(firstDay);
    const end = this.getItineraryDayEndMinutes(lastDay);

    if (start === null && end === null) return "";

    const startText = start !== null ? this.minutesToTimeLabel(start) : "Por confirmar";
    const endText = end !== null ? this.minutesToTimeLabel(end) : "Por confirmar";

    return `Primer día desde ${startText} · Último día hasta ${endText}`;
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

    preview.innerHTML = itinerary.map((item) => {
      const start = this.getItineraryDayStartMinutes(item);
      const end = this.getItineraryDayEndMinutes(item);

      const timeInfo =
        start !== null || end !== null
          ? `
            <span class="quote-itinerary-time">
              ${start !== null ? `Inicio ${this.minutesToTimeLabel(start)}` : "Inicio por confirmar"}
              ·
              ${end !== null ? `Fin ${this.minutesToTimeLabel(end)}` : "Fin por confirmar"}
            </span>
          `
          : "";

      return `
        <div class="quote-itinerary-item">
          <h4>${this.buildDatedDayTitleHtml(item)}</h4>
          <p>${this.escapeHtml(item.description || "")}</p>
          ${timeInfo}
        </div>
      `;
    }).join("");
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

    if (text.includes("machu picchu express")) {
      return "Itinerario express con retorno más temprano desde Machu Picchu, ideal para combinarlo con actividades al día siguiente.";
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

      const currentCombinationKey = this.selectedCombinationsByDestination[item.destination];

      const stillValid = combinations.some((combo) => combo.key === currentCombinationKey);

      if (!stillValid) {
        this.selectedCombinationsByDestination[item.destination] = combinations[0]?.key || "";
      }
    });

    this.renderAccommodationOptions();
  }
    getAccommodationSummary() {
    if (!this.selectedPackage) return [];

    const fromItinerary = this.selectedItineraryOption?.accommodationSummary;
    if (Array.isArray(fromItinerary) && fromItinerary.length) return fromItinerary;

    const fromPackage = this.selectedPackage.accommodationSummary;
    if (Array.isArray(fromPackage) && fromPackage.length) return fromPackage;

    return [];
  }

  getNoHotelOption(destination) {
    return {
      hotelCode: "no-hotel",
      hotelName: "Sin alojamiento",
      destination,
      stars: 0,
      rooms: [
        {
          roomCode: "no-room",
          roomName: "Sin habitación",
          capacity: 99,
          currency: this.quoteCurrency,
          pricePerNight: 0
        }
      ],
      images: []
    };
  }

  getHotelsByDestination(destination) {
    const destinationData = this.hotelsData?.destinations?.[destination];

    if (Array.isArray(destinationData)) return destinationData;
    if (Array.isArray(destinationData?.hotels)) return destinationData.hotels;

    return [];
  }

  getHotelByCode(destination, hotelCode) {
    if (!hotelCode || hotelCode === "no-hotel") return null;

    return this.getHotelsByDestination(destination).find((hotel) => {
      return hotel.hotelCode === hotelCode || hotel.code === hotelCode || hotel.id === hotelCode;
    }) || null;
  }

  getSelectedAccommodationForDestination(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];
    const isNoHotel = hotelCode === "no-hotel";

    const hotel = isNoHotel
      ? this.getNoHotelOption(destination)
      : this.getHotelByCode(destination, hotelCode);

    if (!hotel) return null;

    const summary = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summary?.nights || 0);
    const combinations = this.generateAccommodationCombinations(
      hotel.rooms || [],
      this.getTotalPassengers(),
      nights
    );

    const selectedCombinationKey = this.selectedCombinationsByDestination[destination];
    const combination = combinations.find((item) => item.key === selectedCombinationKey) || combinations[0] || null;

    return { hotel, combination };
  }

  calculateAccommodationAdditional(destination) {
    const selection = this.getSelectedAccommodationForDestination(destination);
    if (!selection?.hotel || !selection?.combination) return 0;

    return this.convertCurrency(
      Number(selection.combination.total || 0),
      selection.combination.currency || this.quoteCurrency,
      this.quoteCurrency
    );
  }

  getDestinationLabel(destination) {
    const labels = {
      cusco: "Cusco",
      aguas_calientes: "Aguas Calientes",
      machu_picchu: "Machu Picchu Pueblo",
      sacred_valley: "Valle Sagrado"
    };

    return labels[destination] || String(destination || "").replace(/_/g, " ");
  }

  getHotelCoverImage(hotel) {
    if (!hotel) return "";

    if (hotel.image) return hotel.image;
    if (hotel.cover) return hotel.cover;
    if (Array.isArray(hotel.images) && hotel.images.length) return hotel.images[0];
    if (Array.isArray(hotel.gallery) && hotel.gallery.length) return hotel.gallery[0];

    return "";
  }

  generateAccommodationCombinations(rooms = [], passengers = 1, nights = 1) {
    const safePassengers = Math.max(1, Number(passengers || 1));
    const safeNights = Math.max(0, Number(nights || 0));

    if (!Array.isArray(rooms) || !rooms.length) {
      return [
        {
          key: "no-room",
          label: "Sin habitación",
          description: "No se agregará costo de alojamiento.",
          total: 0,
          currency: this.quoteCurrency,
          rooms: []
        }
      ];
    }

    const normalizedRooms = rooms.map((room) => ({
      ...room,
      roomCode: room.roomCode || room.code || room.id || room.roomName || "room",
      roomName: room.roomName || room.name || room.label || "Habitación",
      capacity: Number(room.capacity || room.maxOccupancy || room.guests || 1),
      pricePerNight: Number(room.pricePerNight || room.price || room.rate || 0),
      currency: room.currency || this.quoteCurrency
    }));

    const exact = normalizedRooms
      .filter((room) => room.capacity >= safePassengers)
      .map((room) => ({
        key: `${room.roomCode}-x1`,
        label: `${room.roomName} x 1`,
        description: `${safeNights} noche${safeNights !== 1 ? "s" : ""}`,
        total: room.pricePerNight * safeNights,
        currency: room.currency,
        rooms: [{ room, quantity: 1 }]
      }));

    const combinations = [...exact];

    normalizedRooms.forEach((room) => {
      const quantity = Math.ceil(safePassengers / Math.max(1, room.capacity));
      if (quantity > 1) {
        combinations.push({
          key: `${room.roomCode}-x${quantity}`,
          label: `${room.roomName} x ${quantity}`,
          description: `${safeNights} noche${safeNights !== 1 ? "s" : ""}`,
          total: room.pricePerNight * safeNights * quantity,
          currency: room.currency,
          rooms: [{ room, quantity }]
        });
      }
    });

    combinations.sort((a, b) => {
      const aValue = this.convertCurrency(a.total, a.currency, this.quoteCurrency);
      const bValue = this.convertCurrency(b.total, b.currency, this.quoteCurrency);
      return aValue - bValue;
    });

    return combinations.length ? combinations : [
      {
        key: "no-room",
        label: "Sin habitación",
        description: "No se agregará costo de alojamiento.",
        total: 0,
        currency: this.quoteCurrency,
        rooms: []
      }
    ];
  }

  openHotelModal(destination) {
    this.activeHotelModalDestination = destination;

    const modal = document.getElementById("hotelModal");
    const list = document.getElementById("hotelModalList");
    const title = document.getElementById("hotelModalTitle");
    const intro = document.getElementById("hotelModalIntro");

    if (!modal || !list) return;

    const destinationLabel = this.getDestinationLabel(destination);
    const summary = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summary?.nights || 0);

    if (title) title.textContent = `Elige alojamiento en ${destinationLabel}`;
    if (intro) intro.textContent = `Selecciona una opción para ${nights} noche${nights !== 1 ? "s" : ""}.`;

    this.pendingHotelSelection = {
      hotelCode: this.selectedHotelsByDestination[destination] || "no-hotel",
      combinationKey: this.selectedCombinationsByDestination[destination] || ""
    };

    this.renderHotelModalOptions(destination);

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  renderHotelModalOptions(destination) {
    const list = document.getElementById("hotelModalList");
    if (!list) return;

    const summary = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summary?.nights || 0);
    const hotels = [this.getNoHotelOption(destination), ...this.getHotelsByDestination(destination)];
    const passengers = this.getTotalPassengers();

    list.innerHTML = hotels.map((hotel) => {
      const isSelectedHotel = this.pendingHotelSelection?.hotelCode === hotel.hotelCode;
      const isNoHotel = hotel.hotelCode === "no-hotel";
      const images = isNoHotel ? [] : this.getHotelImages(hotel);
      const combinations = this.generateAccommodationCombinations(hotel.rooms || [], passengers, nights);

      const comboHtml = combinations.map((combo) => {
        const isSelectedCombo =
          isSelectedHotel &&
          (this.pendingHotelSelection?.combinationKey === combo.key || !this.pendingHotelSelection?.combinationKey);

        return `
          <button
            type="button"
            class="hotel-combo-btn ${isSelectedCombo ? "is-selected" : ""}"
            data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
            data-combo-key="${this.escapeHtml(combo.key)}"
          >
            <span class="hotel-combo-btn__radio"></span>
            <span class="hotel-combo-btn__main">${this.escapeHtml(combo.label)}</span>
            <span class="hotel-combo-btn__sub">
              ${this.escapeHtml(combo.description)} · ${this.formatCurrency(
                this.convertCurrency(combo.total, combo.currency, this.quoteCurrency),
                this.quoteCurrency
              )}
            </span>
          </button>
        `;
      }).join("");

      return `
        <article class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""} ${isNoHotel ? "hotel-option-card--no-hotel" : ""}">
          <div class="hotel-option-card__header">
            <div>
              <h3>${this.escapeHtml(hotel.hotelName || hotel.name || "Hotel")}</h3>
              <p>${isNoHotel ? "No se agregará alojamiento a la cotización." : `${Number(hotel.stars || 0)} estrellas · ${this.escapeHtml(this.getDestinationLabel(destination))}`}</p>
            </div>
            <span class="hotel-option-card__badge">${isNoHotel ? "Sin costo" : "Hotel"}</span>
          </div>

          <div class="hotel-option-card__content">
            <div class="hotel-option-card__media">
              ${
                images.length
                  ? `
                    <div class="hotel-gallery-main">
                      <img class="hotel-gallery-main-img" src="${this.escapeHtml(this.resolveAssetPath(images[0]))}" alt="${this.escapeHtml(hotel.hotelName || "Hotel")}" loading="lazy" />
                    </div>
                    <div class="hotel-gallery-thumbs">
                      ${images.map((image, index) => `
                        <button type="button" class="hotel-gallery-thumb ${index === 0 ? "is-active" : ""}">
                          <img src="${this.escapeHtml(this.resolveAssetPath(image))}" alt="${this.escapeHtml(hotel.hotelName || "Hotel")}" loading="lazy" />
                        </button>
                      `).join("")}
                    </div>
                  `
                  : `
                    <div class="hotel-gallery-main--empty">
                      <div class="hotel-gallery-empty-state">
                        <strong>${isNoHotel ? "Sin alojamiento" : "Imagen no disponible"}</strong>
                        <span>${isNoHotel ? "El cliente gestionará su hotel por cuenta propia." : "Puedes agregar fotos del hotel en hotels.json."}</span>
                      </div>
                    </div>
                  `
              }
            </div>

            <div class="hotel-option-card__body">
              <label>Opciones disponibles</label>
              <div class="hotel-option-card__options">
                ${comboHtml}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll(".hotel-combo-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.pendingHotelSelection = {
          hotelCode: button.dataset.hotelCode,
          combinationKey: button.dataset.comboKey
        };
        this.renderHotelModalOptions(destination);
      });
    });
  }

  getHotelImages(hotel) {
    if (!hotel) return [];
    if (Array.isArray(hotel.images)) return hotel.images;
    if (Array.isArray(hotel.gallery)) return hotel.gallery;
    if (hotel.image) return [hotel.image];
    if (hotel.cover) return [hotel.cover];
    return [];
  }
    bindHotelModalEvents() {
    document.addEventListener("click", (event) => {
      const closeBtn = event.target.closest("[data-close-modal], .quote-modal__close");
      if (closeBtn && closeBtn.closest("#hotelModal")) {
        this.closeHotelModal();
      }
    });
  
    document.getElementById("confirmHotelSelectionBtn")?.addEventListener("click", () => {
      if (!this.activeHotelModalDestination || !this.pendingHotelSelection) {
        this.closeHotelModal();
        return;
      }
  
      this.selectedHotelsByDestination[this.activeHotelModalDestination] =
        this.pendingHotelSelection.hotelCode;
  
      this.selectedCombinationsByDestination[this.activeHotelModalDestination] =
        this.pendingHotelSelection.combinationKey;
  
      this.renderAccommodationOptions();
      this.updatePricing();
      this.updatePrintQuotation();
      this.closeHotelModal();
    });
  }

  closeHotelModal() {
    const modal = document.getElementById("hotelModal");
    if (modal) modal.hidden = true;

    this.activeHotelModalDestination = null;
    this.pendingHotelSelection = null;

    document.body.classList.remove("quote-modal-open");
  }

  renderTrainSelectors() {
    const section = document.getElementById("trainSection");
    const outboundCard = document.getElementById("outboundTrainSelected");
    const returnCard = document.getElementById("returnTrainSelected");

    if (!section || !outboundCard || !returnCard) return;

    if (!this.selectedPackage || !this.selectedItineraryOption) {
      section.hidden = true;
      outboundCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de ida");
      returnCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de retorno");
      return;
    }

    const trainConfig = this.getTrainSelectionConfig();

    if (!trainConfig.required) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const outboundTrain = this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode);
    const returnTrain = this.getTrainByCode(trainConfig.returnRoute, this.selectedReturnTrainCode);

    outboundCard.innerHTML = this.getTrainSelectorCardHtml({
      direction: "outbound",
      label: "Tren de ida",
      train: outboundTrain,
      routeCode: trainConfig.outboundRoute
    });

    returnCard.innerHTML = this.getTrainSelectorCardHtml({
      direction: "return",
      label: "Tren de retorno",
      train: returnTrain,
      routeCode: trainConfig.returnRoute
    });
  }

  getTrainSelectionConfig() {
    const packageConfig = this.selectedPackage?.trainSelection || {};
    const optionTrainMode = this.selectedItineraryOption?.trainMode || packageConfig.mode || "full_day";

    const modeRoutes = {
      full_day: {
        outboundRoute: "machu_picchu_full_day_outbound",
        returnRoute: "machu_picchu_return"
      },
      express: {
        outboundRoute: "machu_picchu_full_day_outbound",
        returnRoute: "machu_picchu_return"
      },
      overnight: {
        outboundRoute: "machu_picchu_overnight_outbound",
        returnRoute: "machu_picchu_return"
      },
      connection: {
        outboundRoute: "machu_picchu_overnight_outbound",
        returnRoute: "machu_picchu_return"
      }
    };

    const fallbackRoutes = modeRoutes[optionTrainMode] || modeRoutes.full_day;

    return {
      required: packageConfig.required !== false,
      mode: optionTrainMode,
      outboundRoute: this.selectedItineraryOption?.outboundRoute || packageConfig.outboundRoute || fallbackRoutes.outboundRoute,
      returnRoute: this.selectedItineraryOption?.returnRoute || packageConfig.returnRoute || fallbackRoutes.returnRoute
    };
  }

  getTrainSelectorEmptyHtml(label) {
    return `
      <div>
        <span>${this.escapeHtml(label)}</span>
        <strong>Sin selección</strong>
        <p>Elige una opción de tren para completar la cotización.</p>
      </div>
      <button type="button" class="btn quote-secondary-btn">Elegir tren</button>
    `;
  }

  getTrainSelectorCardHtml({ direction, label, train, routeCode }) {
    const companyLogo = train ? this.getTrainCompanyLogo(train) : "";
    const companyLabel = train ? this.getTrainCompanyLabel(train) : "";
    const buttonText = train ? "Cambiar tren" : "Elegir tren";
    const trainName = train ? this.getTrainDisplayName(train) : "Sin selección";
    const timeText = train ? this.getTrainShortScheduleText(train, direction) : "Selecciona horario y categoría.";

    return `
      <div>
        <span>${this.escapeHtml(label)}</span>
        ${
          companyLogo
            ? `
              <div class="train-option-card__company">
                <img class="train-option-card__logo" src="${this.escapeHtml(companyLogo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />
                <strong>${this.escapeHtml(trainName)}</strong>
              </div>
            `
            : `<strong>${this.escapeHtml(trainName)}</strong>`
        }
        <p>${this.escapeHtml(timeText)}</p>
      </div>
      <button
        type="button"
        class="btn quote-secondary-btn"
        id="${direction === "outbound" ? "openOutboundTrainModalBtnDynamic" : "openReturnTrainModalBtnDynamic"}"
        data-train-direction="${this.escapeHtml(direction)}"
        data-route-code="${this.escapeHtml(routeCode)}"
      >
        ${this.escapeHtml(buttonText)}
      </button>
    `;
  }

  bindTrainSelectionModalEvents() {
    document.addEventListener("click", (event) => {
      const closeBtn = event.target.closest("[data-close-modal], .quote-modal__close");
  
      if (closeBtn && closeBtn.closest("#trainSelectionModal")) {
        this.closeTrainSelectionModal();
        return;
      }
  
      const dynamicButton = event.target.closest("[data-train-direction]");
      if (dynamicButton) {
        this.openTrainSelectionModal(dynamicButton.dataset.trainDirection);
      }
    });
  
    document.getElementById("confirmTrainSelectionBtn")?.addEventListener("click", () => {
      this.confirmTrainSelection();
    });
  }

  bindTrainDetailsModalEvents() {
    const modal = document.getElementById("trainDetailsModal");
    if (!modal) return;

    modal.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => {
        modal.hidden = true;
        document.body.classList.remove("quote-modal-open");
      });
    });
  }

  openTrainSelectionModal(direction) {
    const trainConfig = this.getTrainSelectionConfig();
    const routeCode = direction === "outbound" ? trainConfig.outboundRoute : trainConfig.returnRoute;

    this.activeTrainDirection = direction;
    this.pendingTrainCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;

    const modal = document.getElementById("trainSelectionModal");
    const title = document.getElementById("trainSelectionModalTitle");
    const intro = document.getElementById("trainSelectionModalIntro");

    if (!modal) return;

    if (title) {
      title.textContent = direction === "outbound" ? "Elige tren de ida" : "Elige tren de retorno";
    }

    if (intro) {
      intro.textContent =
        direction === "outbound"
          ? "Selecciona el tren de ida hacia Machu Picchu según empresa, horario y categoría."
          : "Selecciona el tren de retorno. Si ya elegiste una empresa en la ida, aquí solo verás trenes de esa misma empresa.";
    }

    this.renderTrainModalOptions(routeCode, direction);

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  closeTrainSelectionModal() {
    const modal = document.getElementById("trainSelectionModal");
    if (modal) modal.hidden = true;

    this.activeTrainDirection = null;
    this.pendingTrainCode = "";

    document.body.classList.remove("quote-modal-open");
  }

  confirmTrainSelection() {
    if (!this.activeTrainDirection) {
      this.closeTrainSelectionModal();
      return;
    }

    if (this.activeTrainDirection === "outbound") {
      this.selectedOutboundTrainCode = this.pendingTrainCode || "";

      const outboundCompany = this.getSelectedOutboundTrainCompany();
      const returnTrainConfig = this.getTrainSelectionConfig();
      const currentReturnTrain = this.getTrainByCode(returnTrainConfig.returnRoute, this.selectedReturnTrainCode);

      if (
        outboundCompany &&
        currentReturnTrain &&
        this.normalizeTrainCompany(currentReturnTrain.company || currentReturnTrain.operator || currentReturnTrain.provider) !== outboundCompany
      ) {
        this.selectedReturnTrainCode = "";
      }
    }

    if (this.activeTrainDirection === "return") {
      this.selectedReturnTrainCode = this.pendingTrainCode || "";
    }

    this.renderTrainSelectors();
    this.updatePricing();
    this.updatePrintQuotation();
    this.closeTrainSelectionModal();
  }

  renderTrainModalOptions(routeCode, direction) {
    const list = document.getElementById("trainSelectionModalList");
    if (!list) return;

    const trains = this.getAvailableTrainsForRoute(routeCode, direction);

    if (!trains.length) {
      list.innerHTML = `
        <div class="quote-empty-state">
          No hay trenes disponibles para esta ruta o empresa. Cambia el tren de ida o revisa trains.json.
        </div>
      `;
      return;
    }

    const recommendedCode = this.getRecommendedTrainCode(trains, direction);

    list.innerHTML = trains.map((train) => {
      const trainCode = this.getTrainCode(train);
      const isSelected = this.pendingTrainCode === trainCode;
      const isRecommended = recommendedCode && trainCode === recommendedCode;
      const companyLogo = this.getTrainCompanyLogo(train);
      const companyLabel = this.getTrainCompanyLabel(train);
      const schedule = this.getTrainSchedule(train);
      const routeText = this.getTrainRouteText(train, direction);
      const price = this.getTrainPrice(train);

      return `
        <article
          class="train-option-card ${isSelected ? "is-selected" : ""} ${isRecommended ? "is-recommended" : ""}"
          data-train-code="${this.escapeHtml(trainCode)}"
        >
          ${isRecommended ? `<span class="train-badge-recommended">Recomendado</span>` : ""}

          <div class="train-option-card__content">
            <div class="train-option-card__company">
              ${
                companyLogo
                  ? `<img class="train-option-card__logo" src="${this.escapeHtml(companyLogo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />`
                  : ""
              }
              <div>
                <h3>${this.escapeHtml(this.getTrainDisplayName(train))}</h3>
                <p>${this.escapeHtml(companyLabel)}</p>
              </div>
            </div>

            <p>${this.escapeHtml(routeText)}</p>

            <div class="train-option-card__schedule">
              <div class="train-time-box">
                <span>Hora de partida</span>
                <strong>${this.escapeHtml(schedule.departureLabel)}</strong>
              </div>
              <div class="train-time-box">
                <span>Hora de llegada</span>
                <strong>${this.escapeHtml(schedule.arrivalLabel)}</strong>
              </div>
            </div>
          </div>

          <div class="train-option-card__price">
            <strong>${this.formatCurrency(price.amount, price.currency)}</strong>
            <span>por persona</span>
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll(".train-option-card").forEach((card) => {
      card.addEventListener("click", () => {
        this.pendingTrainCode = card.dataset.trainCode || "";
        this.renderTrainModalOptions(routeCode, direction);
      });
    });
  }
    getAvailableTrainsForRoute(routeCode, direction) {
      const routes = this.trainsData?.routes || {};
      const route = routes[routeCode];
    
      let rawTrains = [];
    
      if (Array.isArray(route?.trains)) {
        rawTrains = route.trains;
      } else if (Array.isArray(route?.options)) {
        rawTrains = route.options;
      } else if (Array.isArray(route?.items)) {
        rawTrains = route.items;
      } else if (Array.isArray(route)) {
        rawTrains = route;
      } else if (Array.isArray(this.trainsData?.trains)) {
        rawTrains = this.trainsData.trains.filter((train) => {
          return (
            train.route === routeCode ||
            train.routeCode === routeCode ||
            train.routeId === routeCode ||
            train.direction === direction
          );
        });
      }
    
      let trains = rawTrains.filter((train) => this.isTrainAvailableForNationality(train));
    
      if (direction === "return") {
        const outboundCompany = this.getSelectedOutboundTrainCompany();
    
        if (outboundCompany) {
          trains = trains.filter((train) => {
            const company = this.normalizeTrainCompany(
              train.company || train.operator || train.provider || train.companyName
            );
            return company === outboundCompany;
          });
        }
      }
    
      return trains;
    }

  isTrainAvailableForNationality(train) {
    if (!train) return false;

    if (train.status && train.status !== "published") return false;

    const allowedNationalities = train.allowedNationalities || train.nationalities || [];

    if (Array.isArray(allowedNationalities) && allowedNationalities.length) {
      return allowedNationalities.includes(this.nationality);
    }

    if (train.onlyForNational === true) {
      return this.nationality === "national";
    }

    if (train.localOnly === true) {
      return this.nationality === "national";
    }

    return true;
  }

  getSelectedOutboundTrainCompany() {
    if (!this.selectedOutboundTrainCode) return "";

    const trainConfig = this.getTrainSelectionConfig();
    const train = this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode);

    if (!train) return "";

    return this.normalizeTrainCompany(train.company || train.operator || train.provider);
  }

  normalizeTrainCompany(company) {
    const value = String(company || "").trim().toLowerCase();

    if (!value) return "";

    if (
      value.includes("inca") ||
      value.includes("incarail") ||
      value.includes("inca rail")
    ) {
      return "inca_rail";
    }

    if (
      value.includes("peru") ||
      value.includes("perurail") ||
      value.includes("peru rail") ||
      value.includes("perú rail")
    ) {
      return "peru_rail";
    }

    return value.replace(/\s+/g, "_");
  }

  getTrainCompanyLabel(train) {
    const company = this.normalizeTrainCompany(train?.company || train?.operator || train?.provider);

    if (company === "inca_rail") return "Inca Rail";
    if (company === "peru_rail") return "Peru Rail";

    return train?.company || train?.operator || train?.provider || "Empresa ferroviaria";
  }

  getTrainCompanyLogo(train) {
    const company = this.normalizeTrainCompany(train?.company || train?.operator || train?.provider);

    if (company === "inca_rail") {
      return this.resolveAssetPath("assets/img/trenes/Inca Rail.png");
    }

    if (company === "peru_rail") {
      return this.resolveAssetPath("assets/img/trenes/Peru Rail.png");
    }

    return "";
  }

  getTrainByCode(routeCode, trainCode) {
    if (!routeCode || !trainCode) return null;
  
    const trains = this.getAvailableTrainsForRoute(routeCode, "lookup");
  
    return trains.find((train) => this.getTrainCode(train) === trainCode) || null;
  }

  getTrainCode(train) {
    return String(
      train?.code ||
      train?.trainCode ||
      train?.id ||
      train?.serviceCode ||
      ""
    );
  }

  getTrainDisplayName(train) {
    if (!train) return "Tren por seleccionar";

    const categoryName =
      train.categoryName ||
      train.trainName ||
      train.name ||
      train.service ||
      train.category ||
      "Tren turístico";

    const company = this.getTrainCompanyLabel(train);

    if (String(categoryName).toLowerCase().includes(company.toLowerCase())) {
      return categoryName;
    }

    return `${company} · ${categoryName}`;
  }

  getTrainSchedule(train) {
    const departure =
      train?.departureTime ||
      train?.departure ||
      train?.departTime ||
      train?.startTime ||
      train?.horaSalida ||
      train?.hora_salida ||
      train?.time;

    const arrival =
      train?.arrivalTime ||
      train?.arrival ||
      train?.arriveTime ||
      train?.endTime ||
      train?.horaLlegada ||
      train?.hora_llegada;

    return {
      departureMinutes: this.timeToMinutes(departure),
      arrivalMinutes: this.timeToMinutes(arrival),
      departureLabel: this.formatTrainTime(departure),
      arrivalLabel: this.formatTrainTime(arrival)
    };
  }

  getTrainShortScheduleText(train, direction) {
    const schedule = this.getTrainSchedule(train);
    const departure = schedule.departureLabel || "Por confirmar";
    const arrival = schedule.arrivalLabel || "Por confirmar";
    const routeText = this.getTrainRouteText(train, direction);

    return `${routeText}. Parte ${departure} · llega ${arrival}`;
  }

  getTrainRouteText(train, direction) {
    const origin =
      train?.origin ||
      train?.from ||
      train?.departureStation ||
      train?.stationFrom ||
      "";

    const destination =
      train?.destination ||
      train?.to ||
      train?.arrivalStation ||
      train?.stationTo ||
      "";

    if (origin && destination) {
      return `${origin} → ${destination}`;
    }

    if (direction === "outbound") {
      return "Ruta hacia Machu Picchu Pueblo";
    }

    return "Ruta de retorno desde Machu Picchu Pueblo";
  }

  formatTrainTime(value) {
    const minutes = this.timeToMinutes(value);
    if (minutes === null) return "Por confirmar";
    return this.minutesToTimeLabel(minutes);
  }

  getTrainPrice(train) {
    const pricing = train?.pricing || train?.prices || train?.priceByNationality;
    const nationalityPricing = pricing?.[this.nationality];

    if (nationalityPricing) {
      return {
        amount: Number(nationalityPricing.amount || nationalityPricing.price || nationalityPricing.adult || 0),
        currency: nationalityPricing.currency || train.currency || this.quoteCurrency
      };
    }

    return {
      amount: Number(train?.price || train?.adultPrice || train?.amount || 0),
      currency: train?.currency || this.quoteCurrency
    };
  }

  getRecommendedTrainCode(trains, direction) {
    if (!Array.isArray(trains) || !trains.length || !this.selectedItineraryOption) return "";

    const mode = this.getCurrentTrainMode();
    const normalizedCompany =
      direction === "return"
        ? this.getSelectedOutboundTrainCompany()
        : "";

    let candidates = trains;

    if (direction === "return" && normalizedCompany) {
      candidates = candidates.filter((train) => {
        const company = this.normalizeTrainCompany(train.company || train.operator || train.provider);
        return company === normalizedCompany;
      });
    }

    const byRange = (start, end) => {
      const startMinutes = this.timeToMinutes(start);
      const endMinutes = this.timeToMinutes(end);

      return candidates.filter((train) => {
        const schedule = this.getTrainSchedule(train);
        const departure = schedule.departureMinutes;
        return departure !== null && departure >= startMinutes && departure <= endMinutes;
      });
    };

    const byExactOrNear = (target, toleranceMinutes = 45, company = "") => {
      const targetMinutes = this.timeToMinutes(target);

      return candidates.filter((train) => {
        const schedule = this.getTrainSchedule(train);
        const departure = schedule.departureMinutes;
        const trainCompany = this.normalizeTrainCompany(train.company || train.operator || train.provider);

        if (departure === null) return false;
        if (company && trainCompany !== company) return false;

        return Math.abs(departure - targetMinutes) <= toleranceMinutes;
      });
    };

    let recommended = [];

    if (mode === "express") {
      recommended = direction === "outbound"
        ? byRange("04:00", "06:00")
        : byRange("14:00", "16:00");
    } else if (mode === "overnight" || mode === "connection") {
      if (direction === "outbound") {
        recommended = byExactOrNear("16:36", 60, "inca_rail");

        if (!recommended.length) {
          recommended = byRange("15:30", "17:30");
        }
      } else {
        const company = normalizedCompany || "";

        if (company === "inca_rail") {
          recommended = byExactOrNear("20:20", 60, "inca_rail");
        } else if (company === "peru_rail") {
          recommended = byExactOrNear("19:00", 75, "peru_rail");
        } else {
          recommended = [
            ...byExactOrNear("20:20", 60, "inca_rail"),
            ...byExactOrNear("19:00", 75, "peru_rail")
          ];
        }

        if (!recommended.length) {
          recommended = byRange("19:00", "21:00");
        }
      }
    } else {
      recommended = direction === "outbound"
        ? byRange("04:00", "06:00")
        : byRange("19:00", "21:00");
    }

    if (!recommended.length) return "";

    recommended.sort((a, b) => {
      const priceA = this.convertCurrency(this.getTrainPrice(a).amount, this.getTrainPrice(a).currency, this.quoteCurrency);
      const priceB = this.convertCurrency(this.getTrainPrice(b).amount, this.getTrainPrice(b).currency, this.quoteCurrency);
      return priceA - priceB;
    });

    return this.getTrainCode(recommended[0]);
  }

  getCurrentTrainMode() {
    const text = `
      ${this.selectedItineraryOption?.trainMode || ""}
      ${this.selectedItineraryOption?.label || ""}
      ${this.selectedItineraryOption?.summary || ""}
      ${(this.selectedItineraryOption?.itinerary || []).map((item) => `${item.title || ""} ${item.description || ""} ${(item.tourCodes || []).join(" ")}`).join(" ")}
    `.toLowerCase();

    if (text.includes("express") || text.includes("machu_express")) return "express";

    if (
      text.includes("overnight") ||
      text.includes("connection") ||
      text.includes("conexión") ||
      text.includes("aguas calientes") ||
      text.includes("machu_connection")
    ) {
      return "overnight";
    }

    return "full_day";
  }
    calculateTrainAdditional() {
    const trainConfig = this.getTrainSelectionConfig();
    if (!trainConfig.required) return 0;

    const outboundTrain = this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode);
    const returnTrain = this.getTrainByCode(trainConfig.returnRoute, this.selectedReturnTrainCode);

    const passengers = this.getTotalPassengers();

    const outboundPrice = outboundTrain ? this.getTrainPrice(outboundTrain) : { amount: 0, currency: this.quoteCurrency };
    const returnPrice = returnTrain ? this.getTrainPrice(returnTrain) : { amount: 0, currency: this.quoteCurrency };

    const outboundTotal = this.convertCurrency(outboundPrice.amount, outboundPrice.currency, this.quoteCurrency) * passengers;
    const returnTotal = this.convertCurrency(returnPrice.amount, returnPrice.currency, this.quoteCurrency) * passengers;

    return outboundTotal + returnTotal;
  }

  renderExtras() {
    const section = document.getElementById("extrasSection");
    const container = document.getElementById("extrasOptions");

    if (!section || !container) return;

    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];

    if (!this.selectedPackage || !extras.length) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;

    container.innerHTML = extras.map((extra) => {
      const isSelected = this.selectedExtras.has(extra.code);
      const price = this.convertCurrency(Number(extra.price || 0), extra.currency || this.quoteCurrency, this.quoteCurrency);
      const suffix = extra.perPerson ? "por persona" : "por reserva";

      return `
        <label class="quote-extra-item ${isSelected ? "is-selected" : ""}">
          <input type="checkbox" value="${this.escapeHtml(extra.code)}" ${isSelected ? "checked" : ""} />
          <span>
            <strong>${this.escapeHtml(extra.label || extra.name || "Extra")}</strong>
            <small>${this.formatCurrency(price, this.quoteCurrency)} ${suffix}</small>
          </span>
        </label>
      `;
    }).join("");

    container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) this.selectedExtras.add(input.value);
        else this.selectedExtras.delete(input.value);

        this.renderExtras();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });
  }

  calculateExtrasAdditional() {
    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
    const passengers = this.getTotalPassengers();

    return extras.reduce((total, extra) => {
      if (!this.selectedExtras.has(extra.code)) return total;

      const base = this.convertCurrency(Number(extra.price || 0), extra.currency || this.quoteCurrency, this.quoteCurrency);
      return total + (extra.perPerson ? base * passengers : base);
    }, 0);
  }

  getBasePackagePricing() {
    if (!this.selectedPackage) {
      return { adult: 0, child: 0, currency: this.quoteCurrency };
    }

    const pricingByNationality = this.selectedPackage.basePricingByNationality?.[this.nationality];

    if (pricingByNationality) {
      return {
        adult: Number(pricingByNationality.adult || 0),
        child: Number(pricingByNationality.child || pricingByNationality.adult || 0),
        currency: pricingByNationality.currency || this.selectedPackage.currency || this.quoteCurrency
      };
    }

    const basePricing = this.selectedPackage.basePricing || {};

    return {
      adult: Number(basePricing.adult || 0),
      child: Number(basePricing.child || basePricing.adult || 0),
      currency: this.selectedPackage.currency || this.quoteCurrency
    };
  }

  calculateBasePackageTotal() {
    const pricing = this.getBasePackagePricing();

    const adultTotal = this.convertCurrency(pricing.adult, pricing.currency, this.quoteCurrency) * this.adults;
    const childTotal = this.convertCurrency(pricing.child, pricing.currency, this.quoteCurrency) * this.children;

    return adultTotal + childTotal;
  }

  calculateHotelAdditionalTotal() {
    return this.getAccommodationSummary().reduce((total, item) => {
      return total + this.calculateAccommodationAdditional(item.destination);
    }, 0);
  }

  getPricingBreakdown() {
    const baseTotal = this.calculateBasePackageTotal();
    const hotelTotal = this.calculateHotelAdditionalTotal();
    const trainTotal = this.calculateTrainAdditional();
    const extrasTotal = this.calculateExtrasAdditional();

    const subtotalBeforeDiscount = baseTotal + hotelTotal + trainTotal + extrasTotal;
    const discountTotal = this.calculateDiscount(subtotalBeforeDiscount);
    const subtotalAfterDiscount = Math.max(0, subtotalBeforeDiscount - discountTotal);

    const paymentRules = this.packagesData.paymentOptions || {};
    const fullDiscountPercent = Number(paymentRules.fullPaymentDiscountPercent || 0);
    const partialPercent = Number(paymentRules.partialPaymentPercent || 30);

    let fullPaymentDiscount = 0;
    let total = subtotalAfterDiscount;

    if (this.paymentMode === "full" && fullDiscountPercent > 0) {
      fullPaymentDiscount = subtotalAfterDiscount * (fullDiscountPercent / 100);
      total = Math.max(0, subtotalAfterDiscount - fullPaymentDiscount);
    }

    const advancePayment = this.paymentMode === "partial"
      ? total * (partialPercent / 100)
      : total;

    const balance = Math.max(0, total - advancePayment);

    return {
      baseTotal,
      hotelTotal,
      trainTotal,
      extrasTotal,
      subtotalBeforeDiscount,
      discountTotal,
      fullPaymentDiscount,
      total,
      advancePayment,
      balance
    };
  }

  updatePricing() {
    const breakdown = this.getPricingBreakdown();

    this.setText("basePackageTotal", this.selectedPackage ? this.formatCurrency(breakdown.baseTotal, this.quoteCurrency) : "");
    this.setText("hotelTotal", this.formatCurrency(breakdown.hotelTotal, this.quoteCurrency));
    this.setText("trainTotal", this.formatCurrency(breakdown.trainTotal, this.quoteCurrency));
    this.setText("extrasTotal", this.formatCurrency(breakdown.extrasTotal, this.quoteCurrency));
    this.setText("discountTotal", `- ${this.formatCurrency(breakdown.discountTotal + breakdown.fullPaymentDiscount, this.quoteCurrency)}`);
    this.setText("quoteTotal", this.formatCurrency(breakdown.total, this.quoteCurrency));
    this.setText("advancePaymentTotal", this.formatCurrency(breakdown.advancePayment, this.quoteCurrency));
    this.setText("balancePaymentTotal", this.formatCurrency(breakdown.balance, this.quoteCurrency));

    const childrenRow = document.getElementById("childrenSummaryRow");
    if (childrenRow) childrenRow.hidden = this.children <= 0;

    const hotelRow = document.getElementById("hotelSummaryRow");
    if (hotelRow) hotelRow.hidden = breakdown.hotelTotal <= 0;

    const trainRow = document.getElementById("trainSummaryRow");
    if (trainRow) trainRow.hidden = breakdown.trainTotal <= 0;

    const extrasRow = document.getElementById("extrasSummaryRow");
    if (extrasRow) extrasRow.hidden = breakdown.extrasTotal <= 0;

    const discountRow = document.getElementById("discountSummaryRow");
    if (discountRow) discountRow.hidden = (breakdown.discountTotal + breakdown.fullPaymentDiscount) <= 0;

    const advanceRow = document.getElementById("advanceSummaryRow");
    if (advanceRow) advanceRow.hidden = false;

    const balanceRow = document.getElementById("balanceSummaryRow");
    if (balanceRow) balanceRow.hidden = this.paymentMode !== "partial";

    const paymentInfo = document.getElementById("paymentInfo");
    if (paymentInfo) {
      if (this.paymentMode === "full") {
        paymentInfo.textContent = "Pagando el total ahora accedes al descuento vigente de pago total.";
      } else {
        paymentInfo.textContent = `Reserva con ${this.formatCurrency(breakdown.advancePayment, this.quoteCurrency)} y completa el saldo antes del viaje.`;
      }
    }
  }

  calculateDiscount(subtotal) {
    if (!this.appliedDiscountCode) return 0;

    const type = this.appliedDiscountCode.type || this.appliedDiscountCode.discountType;
    const value = Number(this.appliedDiscountCode.value || this.appliedDiscountCode.amount || 0);

    if (type === "percent" || type === "percentage") {
      return subtotal * (value / 100);
    }

    if (type === "fixed") {
      return this.convertCurrency(value, this.appliedDiscountCode.currency || this.quoteCurrency, this.quoteCurrency);
    }

    return 0;
  }

  applyManualDiscountCode() {
    const input = document.getElementById("discountCodeInput");
    const message = document.getElementById("discountCodeMessage");

    const code = String(input?.value || "").trim().toUpperCase();

    if (!code) {
      this.clearAppliedDiscountCode(true);
      return;
    }

    const found = this.discountCodes.find((item) => {
      return String(item.code || "").trim().toUpperCase() === code;
    });

    if (!found) {
      this.appliedDiscountCode = null;
      if (message) {
        message.textContent = "Código no válido.";
        message.className = "is-error";
      }
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    this.appliedDiscountCode = found;

    if (message) {
      message.textContent = "Código aplicado correctamente.";
      message.className = "is-success";
    }

    this.updatePricing();
    this.updatePrintQuotation();
  }

  clearAppliedDiscountCode(showMessage = false) {
    this.appliedDiscountCode = null;

    const input = document.getElementById("discountCodeInput");
    const message = document.getElementById("discountCodeMessage");

    if (input) input.value = "";

    if (message) {
      message.textContent = showMessage ? "Código eliminado." : "";
      message.className = "";
    }

    this.updatePricing();
  }
    updatePassengersUI() {
    this.setText("adultCount", String(this.adults));
    this.setText("childCount", String(this.children));
  }

  updateExchangeRateHelp() {
    const help = document.getElementById("exchangeRateHelp");
    if (!help) return;

    help.textContent = `Tipo de cambio referencial: 1 USD = ${this.exchangeRate.toFixed(2)} PEN.`;
  }

  updateReferenceUI() {
    this.setText("quoteReference", this.quoteReference);
    this.setText("printQuoteReference", this.quoteReference);
    this.setText("printCouponCode", this.printCoupon);
  }

  updatePrintQuotation() {
    const breakdown = this.getPricingBreakdown();

    this.setText("printQuoteReference", this.quoteReference);
    this.setText("printCouponCode", this.printCoupon);

    this.setText("printClientName", this.getInputValue("clientName") || "Por completar");
    this.setText("printClientPhone", this.getInputValue("clientPhone") || "Por completar");
    this.setText("printClientEmail", this.getInputValue("clientEmail") || "Por completar");
    this.setText("printClientDocument", this.getInputValue("clientDocument") || "Por completar");

    this.setText("printTravelDates", this.travelStartDate && this.travelEndDate ? `${this.travelStartDate} al ${this.travelEndDate}` : "Por definir");
    this.setText("printTravelDuration", this.travelDays ? `${this.travelDays} días / ${this.travelNights} noches` : "Por definir");
    this.setText("printPassengers", `${this.adults} adulto${this.adults !== 1 ? "s" : ""}${this.children ? ` + ${this.children} niño${this.children !== 1 ? "s" : ""}` : ""}`);
    this.setText("printNationality", this.getNationalityLabel());

    const adjustedArrival = this.getEffectiveArrivalMinutes();
    const adjustedDeparture = this.getEffectiveDepartureMinutes();

    this.setText(
      "printArrivalTime",
      this.arrivalTime
        ? `${this.formatTrainTime(this.arrivalTime)} (disponible desde ${this.minutesToTimeLabel(adjustedArrival)})`
        : "Por definir"
    );

    this.setText(
      "printDepartureTime",
      this.departureTime
        ? `${this.formatTrainTime(this.departureTime)} (disponible hasta ${this.minutesToTimeLabel(adjustedDeparture)})`
        : "Por definir"
    );

    this.setText("printPackageTitle", this.selectedPackage?.title || "Por definir");
    this.setText("printItineraryOption", this.selectedItineraryOption?.label || "Por definir");

    const printItinerary = document.getElementById("printItineraryList");
    if (printItinerary) {
      const itinerary = this.selectedItineraryOption?.itinerary || [];

      printItinerary.innerHTML = itinerary.length
        ? itinerary.map((item) => {
          const start = this.getItineraryDayStartMinutes(item);
          const end = this.getItineraryDayEndMinutes(item);
          const time = start !== null || end !== null
            ? ` (${start !== null ? this.minutesToTimeLabel(start) : "Inicio por confirmar"} - ${end !== null ? this.minutesToTimeLabel(end) : "Fin por confirmar"})`
            : "";

          return `
            <div class="print-itinerary-item">
              <strong>${this.buildDatedDayTitleHtml(item)}${this.escapeHtml(time)}</strong>
              <p>${this.escapeHtml(item.description || "")}</p>
            </div>
          `;
        }).join("")
        : `<p>Itinerario por confirmar.</p>`;
    }

    const printHotel = document.getElementById("printHotelSummary");
    if (printHotel) {
      const summary = this.getAccommodationSummary();

      printHotel.innerHTML = summary.length
        ? summary.map((item) => {
          const selection = this.getSelectedAccommodationForDestination(item.destination);
          const isNoHotel = selection?.hotel?.hotelCode === "no-hotel";
          const title = isNoHotel
            ? "Sin alojamiento"
            : selection?.hotel?.hotelName || "Hotel por confirmar";
          const combo = isNoHotel
            ? "El cliente gestionará su alojamiento."
            : selection?.combination?.label || "Acomodación por confirmar";

          return `
            <tr>
              <th>${this.escapeHtml(this.getDestinationLabel(item.destination))}</th>
              <td>${this.escapeHtml(title)} · ${this.escapeHtml(combo)}</td>
            </tr>
          `;
        }).join("")
        : `<tr><td colspan="2">Sin alojamiento agregado.</td></tr>`;
    }

    const trainConfig = this.getTrainSelectionConfig();
    const outboundTrain = this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode);
    const returnTrain = this.getTrainByCode(trainConfig.returnRoute, this.selectedReturnTrainCode);

    const printTrain = document.getElementById("printTrainSummary");
    if (printTrain) {
      printTrain.innerHTML = `
        <tr>
          <th>Tren de ida</th>
          <td>${outboundTrain ? this.escapeHtml(this.getTrainShortScheduleText(outboundTrain, "outbound")) : "Por seleccionar"}</td>
        </tr>
        <tr>
          <th>Tren de retorno</th>
          <td>${returnTrain ? this.escapeHtml(this.getTrainShortScheduleText(returnTrain, "return")) : "Por seleccionar"}</td>
        </tr>
      `;
    }

    const printExtras = document.getElementById("printExtrasSummary");
    if (printExtras) {
      const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
      const selected = extras.filter((item) => this.selectedExtras.has(item.code));

      printExtras.innerHTML = selected.length
        ? selected.map((item) => `<li>${this.escapeHtml(item.label || item.name || item.code)}</li>`).join("")
        : `<li>Sin extras agregados.</li>`;
    }

    this.setText("printBaseTotal", this.formatCurrency(breakdown.baseTotal, this.quoteCurrency));
    this.setText("printHotelTotal", this.formatCurrency(breakdown.hotelTotal, this.quoteCurrency));
    this.setText("printTrainTotal", this.formatCurrency(breakdown.trainTotal, this.quoteCurrency));
    this.setText("printExtrasTotal", this.formatCurrency(breakdown.extrasTotal, this.quoteCurrency));
    this.setText("printDiscountTotal", `- ${this.formatCurrency(breakdown.discountTotal + breakdown.fullPaymentDiscount, this.quoteCurrency)}`);
    this.setText("printQuoteTotal", this.formatCurrency(breakdown.total, this.quoteCurrency));
    this.setText("printAdvanceTotal", this.formatCurrency(breakdown.advancePayment, this.quoteCurrency));
    this.setText("printBalanceTotal", this.formatCurrency(breakdown.balance, this.quoteCurrency));

    const notes = this.getInputValue("clientNotes");
    this.setText("printClientNotes", notes || "Sin observaciones adicionales.");
  }

  continueToPayment() {
    const breakdown = this.getPricingBreakdown();

    if (!this.selectedPackage) {
      alert("Primero selecciona tus fechas para detectar un itinerario.");
      return;
    }

    const paymentData = {
      quoteReference: this.quoteReference,
      packageId: this.selectedPackage?.id || "",
      packageTitle: this.selectedPackage?.title || "",
      itineraryCode: this.selectedItineraryOption?.code || "",
      itineraryLabel: this.selectedItineraryOption?.label || "",
      travelStartDate: this.travelStartDate,
      travelEndDate: this.travelEndDate,
      travelDays: this.travelDays,
      travelNights: this.travelNights,
      arrivalTime: this.arrivalTime,
      effectiveArrivalTime: this.getEffectiveArrivalMinutes() !== null ? this.minutesToTimeLabel(this.getEffectiveArrivalMinutes()) : "",
      departureTime: this.departureTime,
      effectiveDepartureTime: this.getEffectiveDepartureMinutes() !== null ? this.minutesToTimeLabel(this.getEffectiveDepartureMinutes()) : "",
      adults: this.adults,
      children: this.children,
      nationality: this.nationality,
      currency: this.quoteCurrency,
      paymentMode: this.paymentMode,
      selectedHotelsByDestination: this.selectedHotelsByDestination,
      selectedCombinationsByDestination: this.selectedCombinationsByDestination,
      selectedOutboundTrainCode: this.selectedOutboundTrainCode,
      selectedReturnTrainCode: this.selectedReturnTrainCode,
      selectedExtras: Array.from(this.selectedExtras),
      totals: breakdown
    };

    sessionStorage.setItem("myCuscoTripQuotePayment", JSON.stringify(paymentData));

    alert("Cotización lista para continuar al pago.");
  }

  async saveQuotationAsPdf() {
    this.updatePrintQuotation();

    const source = document.getElementById("printQuotation");
    if (!source) {
      alert("No se encontró la plantilla de impresión.");
      return;
    }

    if (typeof html2pdf === "undefined") {
      window.print();
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "pdf-export-wrapper";

    const clone = source.cloneNode(true);
    clone.classList.add("print-quotation--pdf-export");
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const filename = `${this.quoteReference || "cotizacion-my-cusco-trip"}.pdf`;

    try {
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff"
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
          }
        })
        .from(clone)
        .save();
    } catch (error) {
      console.error("Error generando PDF:", error);
      window.print();
    } finally {
      wrapper.remove();
    }
  }

  getTotalPassengers() {
    return Math.max(1, Number(this.adults || 0) + Number(this.children || 0));
  }

  getNationalityLabel() {
    const labels = {
      national: "Nacional peruano",
      foreign: "Extranjero",
      andean_community: "Comunidad Andina"
    };

    return labels[this.nationality] || this.nationality;
  }

  timeToMinutes(value) {
    if (!value) return null;

    const text = String(value).trim();

    const amPmMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (amPmMatch) {
      let hours = Number(amPmMatch[1]);
      const minutes = Number(amPmMatch[2]);
      const period = amPmMatch[3].toUpperCase();

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    }

    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return hours * 60 + minutes;
  }

  minutesToTimeLabel(minutes) {
    if (minutes === null || typeof minutes === "undefined" || Number.isNaN(Number(minutes))) {
      return "Por confirmar";
    }

    const safeMinutes = Math.max(0, Math.min(1439, Number(minutes)));
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  formatDateInput(date) {
    if (!(date instanceof Date)) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  getDateForDay(dayNumber) {
    if (!this.travelStartDate || !dayNumber) return "";

    const base = new Date(`${this.travelStartDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) return "";

    base.setDate(base.getDate() + Number(dayNumber || 1) - 1);

    return base.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }
    convertCurrency(amount, fromCurrency, toCurrency) {
    const value = Number(amount || 0);
    const from = String(fromCurrency || this.quoteCurrency || "USD").toUpperCase();
    const to = String(toCurrency || this.quoteCurrency || "USD").toUpperCase();

    if (from === to) return value;

    if (from === "USD" && to === "PEN") {
      return value * this.exchangeRate;
    }

    if (from === "PEN" && to === "USD") {
      return value / this.exchangeRate;
    }

    return value;
  }

  formatCurrency(amount, currency = this.quoteCurrency) {
    const safeAmount = Number(amount || 0);
    const safeCurrency = String(currency || this.quoteCurrency || "USD").toUpperCase();

    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount);
  }

  getInputValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
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

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  resolvePath(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) return path;

    const cleanPath = String(path).replace(/^\.?\//, "");

    if (this.basePath.endsWith("/")) {
      return `${this.basePath}${cleanPath}`;
    }

    return `${this.basePath}/${cleanPath}`;
  }

  resolveAssetPath(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) return path;

    const cleanPath = String(path).replace(/^\.?\//, "");

    if (cleanPath.startsWith("assets/")) {
      return this.resolvePath(cleanPath);
    }

    return this.resolvePath(`assets/${cleanPath}`);
  }

  getStableQuoteReference() {
    const key = "myCuscoTripQuoteReference";
    const existing = sessionStorage.getItem(key);

    if (existing) return existing;

    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("");

    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    const reference = `COT-${datePart}-${randomPart}`;

    sessionStorage.setItem(key, reference);

    return reference;
  }

  getStablePrintCoupon() {
    const key = "myCuscoTripPrintCoupon";
    const existing = sessionStorage.getItem(key);

    if (existing) return existing;

    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    const coupon = `MCT-${randomPart}`;

    sessionStorage.setItem(key, coupon);

    return coupon;
  }

  ensureMobileSummaryToggle() {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel || panel.querySelector(".quote-mobile-summary-toggle")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "quote-mobile-summary-toggle";
    button.innerHTML = `<span>Ver detalles</span>`;

    button.addEventListener("click", () => {
      const expanded = panel.classList.toggle("is-expanded");
      button.querySelector("span").textContent = expanded ? "Ocultar detalles" : "Ver detalles";
    });

    panel.insertBefore(button, panel.firstChild);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.myCuscoTripQuotePackages = new MyCuscoTripQuotePackages();
});
