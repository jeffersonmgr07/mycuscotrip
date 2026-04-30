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
      this.initDesktopQuotePanelFixed();
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
          <h4>Día ${item.day}: ${this.escapeHtml(item.title || "")}</h4>
          <p>${this.escapeHtml(item.description || "")}</p>
          ${timeInfo}
        </div>
      `;
    }).join("");
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
      const hotelImage = this.getHotelCoverImage(selection?.hotel);

      return `
        <div class="quote-accommodation-card ${hotelImage ? "has-hotel-image" : ""}">
          <div class="quote-accommodation-card__header">
            <strong>${this.escapeHtml(destinationLabel)}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="quote-accommodation-card__body">

            ${
              hotelImage
                ? `<img class="quote-accommodation-card__image" src="${this.resolveAssetPath(hotelImage)}" />`
                : ""
            }

            <div class="quote-accommodation-card__content">
              <p><strong>${selection?.hotel?.hotelName || "Sin hotel seleccionado"}</strong></p>
              <p class="quote-accommodation-card__price">
                + ${this.formatCurrency(additional, this.quoteCurrency)}
              </p>

              <button type="button" class="btn quote-secondary-btn open-hotel-modal-btn" data-destination="${item.destination}">
                Elegir hotel
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

  getHotelCoverImage(hotel) {
    if (!hotel) return "";

    // FIX PARA TU JSON
    if (hotel.images?.cover) return hotel.images.cover;
    if (Array.isArray(hotel.images)) return hotel.images[0];
    if (hotel.image) return hotel.image;

    return "";
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
      location: this.getDestinationLabel(destination),
      address: "",
      summary: "El cliente gestionará su alojamiento por cuenta propia.",
      features: [],
      amenities: {},
      images: {
        cover: "",
        gallery: []
      },
      rooms: [
        {
          roomType: "no-room",
          roomCode: "no-room",
          roomName: "Sin habitación",
          label: "Sin habitación",
          bedType: "No incluye alojamiento",
          capacity: 99,
          currency: this.quoteCurrency,
          pricePerNight: 0
        }
      ]
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
    const destinationData = this.hotelsData?.destinations?.[destination];

    if (destinationData?.label) return destinationData.label;

    const labels = {
      cusco: "Cusco",
      "aguas-calientes": "Aguas Calientes",
      aguas_calientes: "Aguas Calientes",
      machu_picchu: "Machu Picchu Pueblo",
      sacred_valley: "Valle Sagrado"
    };

    return labels[destination] || String(destination || "").replace(/_/g, " ").replace(/-/g, " ");
  }

  getHotelImages(hotel) {
    if (!hotel) return [];

    const images = [];

    if (hotel.images?.cover) images.push(hotel.images.cover);

    if (Array.isArray(hotel.images?.gallery)) {
      hotel.images.gallery.forEach((image) => images.push(image));
    }

    if (Array.isArray(hotel.images)) {
      hotel.images.forEach((image) => images.push(image));
    }

    if (Array.isArray(hotel.gallery)) {
      hotel.gallery.forEach((image) => images.push(image));
    }

    if (hotel.image) images.push(hotel.image);
    if (hotel.cover) images.push(hotel.cover);

    return [...new Set(images.filter(Boolean))];
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
      roomCode: room.roomCode || room.code || room.id || room.roomType || room.roomName || room.label || "room",
      roomName: room.roomName || room.name || room.label || room.roomType || "Habitación",
      capacity: Number(room.capacity || room.maxOccupancy || room.guests || 1),
      pricePerNight: Number(room.pricePerNight || room.price || room.rate || 0),
      currency: room.currency || "USD"
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
              <p>
                ${
                  isNoHotel
                    ? "No se agregará alojamiento a la cotización."
                    : `${Number(hotel.stars || 0)} estrellas · ${this.escapeHtml(hotel.location || this.getDestinationLabel(destination))}`
                }
              </p>
              ${hotel.address ? `<p>${this.escapeHtml(hotel.address)}</p>` : ""}
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

    list.querySelectorAll(".hotel-gallery-thumb").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".hotel-option-card");
        const mainImage = card?.querySelector(".hotel-gallery-main-img");
        const thumbImage = button.querySelector("img");

        if (!mainImage || !thumbImage) return;

        mainImage.src = thumbImage.src;

        card.querySelectorAll(".hotel-gallery-thumb").forEach((thumb) => {
          thumb.classList.toggle("is-active", thumb === button);
        });
      });
    });
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
      outboundCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de ida", "outbound");
      returnCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de retorno", "return");
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
      sacred_valley_connection: {
        outboundRoute: "sacred_valley_connection_outbound",
        returnRoute: "machu_picchu_return"
      },
      connection: {
        outboundRoute: "sacred_valley_connection_outbound",
        returnRoute: "machu_picchu_return"
      },
      overnight: {
        outboundRoute: "sacred_valley_connection_outbound",
        returnRoute: "machu_picchu_return"
      },
      mixed: {
        outboundRoute: "machu_picchu_full_day_outbound",
        returnRoute: "machu_picchu_return"
      }
    };

    const fallbackRoutes = modeRoutes[optionTrainMode] || modeRoutes.full_day;

    let outboundRoute =
      this.selectedItineraryOption?.outboundRoute ||
      packageConfig.outboundRoute ||
      fallbackRoutes.outboundRoute;

    let returnRoute =
      this.selectedItineraryOption?.returnRoute ||
      packageConfig.returnRoute ||
      fallbackRoutes.returnRoute;

    if (!outboundRoute || outboundRoute === "dynamic_by_itinerary_option") {
      outboundRoute = fallbackRoutes.outboundRoute;
    }

    if (!returnRoute || returnRoute === "dynamic_by_itinerary_option") {
      returnRoute = fallbackRoutes.returnRoute;
    }

    if (!this.trainsData?.routes?.[outboundRoute]) {
      outboundRoute = fallbackRoutes.outboundRoute;
    }

    if (!this.trainsData?.routes?.[returnRoute]) {
      returnRoute = fallbackRoutes.returnRoute;
    }

    return {
      required: packageConfig.required !== false,
      mode: optionTrainMode,
      outboundRoute,
      returnRoute
    };
  }

  getTrainSelectorEmptyHtml(label, direction = "") {
    return `
      <div>
        <span>${this.escapeHtml(label)}</span>
        <strong>Sin selección</strong>
        <p>Elige una opción de tren para completar la cotización.</p>
      </div>
      <button
        type="button"
        class="btn quote-secondary-btn"
        data-train-direction="${this.escapeHtml(direction)}"
      >
        Elegir tren
      </button>
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
        const direction = dynamicButton.dataset.trainDirection;
        if (direction === "outbound" || direction === "return") {
          this.openTrainSelectionModal(direction);
        }
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

    const route = this.trainsData?.routes?.[routeCode];
    const directionLabel = direction === "outbound" ? "ida" : "retorno";

    if (title) {
      title.textContent = `Elige tu tren de ${directionLabel}`;
    }

    if (intro) {
      intro.textContent = route?.description || "Selecciona una opción disponible para completar la cotización.";
    }

    this.renderTrainModalOptions(routeCode);

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  renderTrainModalOptions(routeCode) {
    const list = document.getElementById("trainSelectionModalList");
    if (!list) return;

    const route = this.trainsData?.routes?.[routeCode];
    const allOptions = Array.isArray(route?.options) ? route.options : [];
    const options = allOptions.filter((train) => this.isTrainAllowedForNationality(train));

    if (!options.length) {
      list.innerHTML = `
        <div class="quote-empty-state">
          No hay trenes disponibles para esta ruta y nacionalidad seleccionada.
        </div>
      `;
      return;
    }

    list.innerHTML = options.map((train) => {
      const isSelected = this.pendingTrainCode === train.code;
      const category = this.trainsData?.trainCategories?.[train.categoryCode] || {};
      const logo = this.getTrainCompanyLogo(train);
      const companyLabel = this.getTrainCompanyLabel(train);
      const price = this.convertCurrency(
        Number(train.pricePerPerson || 0),
        train.currency || "USD",
        this.quoteCurrency
      );

      return `
        <article
          class="train-option-card ${isSelected ? "is-selected" : ""} ${train.isLocalTrain ? "train-option-card--local" : ""}"
          data-train-code="${this.escapeHtml(train.code)}"
        >
          <div class="train-option-card__header">
            <div class="train-option-card__company">
              ${
                logo
                  ? `<img class="train-option-card__logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />`
                  : ""
              }
              <div>
                <h3>${this.escapeHtml(this.getTrainDisplayName(train))}</h3>
                <p>${this.escapeHtml(companyLabel)} · ${this.escapeHtml(train.displayCategory || category.displayCategory || "Tren")}</p>
              </div>
            </div>

            <span class="train-option-card__price">
              ${train.isLocalTrain ? "Sujeto a disponibilidad" : this.formatCurrency(price, this.quoteCurrency)}
            </span>
          </div>

          <div class="train-option-card__body">
            <div class="train-option-card__schedule">
              <div>
                <span>Salida</span>
                <strong>${this.escapeHtml(train.departureTime || "Por confirmar")}</strong>
                <small>${this.escapeHtml(train.origin || "")}</small>
              </div>

              <div>
                <span>Llegada</span>
                <strong>${this.escapeHtml(train.arrivalTime || "Por confirmar")}</strong>
                <small>${this.escapeHtml(train.destination || "")}</small>
              </div>

              <div>
                <span>Duración</span>
                <strong>${this.escapeHtml(train.duration || "Por confirmar")}</strong>
                <small>${this.escapeHtml(train.transferInfo || train.routeType || "")}</small>
              </div>
            </div>

            ${
              category.shortDescription
                ? `<p class="train-option-card__description">${this.escapeHtml(category.shortDescription)}</p>`
                : ""
            }

            ${
              train.warning
                ? `<p class="train-option-card__warning">${this.escapeHtml(train.warning)}</p>`
                : ""
            }

            <div class="train-option-card__actions">
              <button type="button" class="btn quote-secondary-btn train-select-btn" data-train-code="${this.escapeHtml(train.code)}">
                ${isSelected ? "Seleccionado" : "Seleccionar"}
              </button>

              <button type="button" class="btn quote-secondary-btn train-details-btn" data-train-code="${this.escapeHtml(train.code)}" data-route-code="${this.escapeHtml(routeCode)}">
                Ver detalles
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll(".train-select-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.pendingTrainCode = button.dataset.trainCode;
        this.renderTrainModalOptions(routeCode);
      });
    });

    list.querySelectorAll(".train-details-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.openTrainDetailsModal(button.dataset.routeCode, button.dataset.trainCode);
      });
    });
  }

  confirmTrainSelection() {
    if (!this.activeTrainDirection || !this.pendingTrainCode) {
      this.closeTrainSelectionModal();
      return;
    }

    if (this.activeTrainDirection === "outbound") {
      this.selectedOutboundTrainCode = this.pendingTrainCode;
    }

    if (this.activeTrainDirection === "return") {
      this.selectedReturnTrainCode = this.pendingTrainCode;
    }

    this.renderTrainSelectors();
    this.updatePricing();
    this.updatePrintQuotation();
    this.closeTrainSelectionModal();
  }

  closeTrainSelectionModal() {
    const modal = document.getElementById("trainSelectionModal");
    if (modal) modal.hidden = true;

    this.activeTrainDirection = null;
    this.pendingTrainCode = "";

    document.body.classList.remove("quote-modal-open");
  }

  openTrainDetailsModal(routeCode, trainCode) {
    const modal = document.getElementById("trainDetailsModal");
    const title = document.getElementById("trainDetailsModalTitle");
    const intro = document.getElementById("trainDetailsModalIntro");
    const content = document.getElementById("trainDetailsModalContent");

    if (!modal || !content) return;

    const train = this.getTrainByCode(routeCode, trainCode);
    if (!train) return;

    const category = this.trainsData?.trainCategories?.[train.categoryCode] || {};
    const logo = this.getTrainCompanyLogo(train);
    const companyLabel = this.getTrainCompanyLabel(train);

    if (title) title.textContent = this.getTrainDisplayName(train);
    if (intro) intro.textContent = `${companyLabel} · ${train.displayCategory || category.displayCategory || "Tren"}`;

    content.innerHTML = `
      <div class="train-detail-box">
        ${
          logo
            ? `<img class="train-detail-logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />`
            : ""
        }

        <p>${this.escapeHtml(category.shortDescription || train.description || "Opción de tren disponible para Machu Picchu.")}</p>

        <ul>
          <li><strong>Salida:</strong> ${this.escapeHtml(train.departureTime || "Por confirmar")} - ${this.escapeHtml(train.origin || "")}</li>
          <li><strong>Llegada:</strong> ${this.escapeHtml(train.arrivalTime || "Por confirmar")} - ${this.escapeHtml(train.destination || "")}</li>
          <li><strong>Duración:</strong> ${this.escapeHtml(train.duration || "Por confirmar")}</li>
          <li><strong>Tipo de ruta:</strong> ${this.escapeHtml(train.transferInfo || train.routeType || "Tren")}</li>
        </ul>

        ${
          category.importantMessage
            ? `<p class="train-option-card__warning">${this.escapeHtml(category.importantMessage)}</p>`
            : ""
        }

        ${
          Array.isArray(category.purchaseRequirements) && category.purchaseRequirements.length
            ? `
              <h4>Condiciones importantes</h4>
              <ul>
                ${category.purchaseRequirements.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
              </ul>
            `
            : ""
        }
      </div>
    `;

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  getTrainByCode(routeCode, trainCode) {
    if (!routeCode || !trainCode) return null;

    const route = this.trainsData?.routes?.[routeCode];
    const options = Array.isArray(route?.options) ? route.options : [];

    return options.find((train) => train.code === trainCode) || null;
  }

  isTrainAllowedForNationality(train) {
    if (!train) return false;

    const allowed = Array.isArray(train.allowedNationalities)
      ? train.allowedNationalities
      : [];

    if (!allowed.length) return true;

    return allowed.includes(this.nationality);
  }

  getTrainDisplayName(train) {
    if (!train) return "Tren";

    return [
      train.serviceName || train.name || train.label || "Tren",
      train.company ? `- ${train.company}` : ""
    ].filter(Boolean).join(" ");
  }

  getTrainShortScheduleText(train, direction = "") {
    if (!train) return "Selecciona horario y categoría.";

    const departure = train.departureTime || "Por confirmar";
    const arrival = train.arrivalTime || "Por confirmar";
    const route = direction === "return" ? "retorno" : "ida";

    return `${route}: ${departure} → ${arrival}`;
  }

  getTrainCompanyLabel(train) {
    if (!train) return "";

    if (train.company) return train.company;

    const category = this.trainsData?.trainCategories?.[train.categoryCode];
    return category?.company || "";
  }

  getTrainCompanyLogo(train) {
    const company = this.getTrainCompanyLabel(train).toLowerCase();

    if (company.includes("perurail") || company.includes("peru rail")) {
      return this.resolveAssetPath("assets/img/trains/perurail-logo.png");
    }

    if (company.includes("inca rail") || company.includes("incarail")) {
      return this.resolveAssetPath("assets/img/trains/inca-rail-logo.png");
    }

    return "";
  }
  renderExtras() {
    const section = document.getElementById("extrasSection");
    const container = document.getElementById("extrasContainer");

    if (!section || !container) return;

    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];

    if (!this.selectedPackage || !extras.length) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;

    container.innerHTML = extras.map((extra) => {
      const checked = this.selectedExtras.has(extra.code);
      const price = this.convertCurrency(Number(extra.price || 0), extra.currency || "USD", this.quoteCurrency);

      return `
        <label class="quote-extra-item ${checked ? "is-selected" : ""}">
          <input type="checkbox" value="${this.escapeHtml(extra.code)}" ${checked ? "checked" : ""} />
          <div>
            <strong>${this.escapeHtml(extra.label || "Extra")}</strong>
            <p>${this.formatCurrency(price, this.quoteCurrency)} ${extra.perPerson ? "por persona" : "por reserva"}</p>
          </div>
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

  getPricingBreakdown() {
    const basePricing = this.getBasePricing();
    const adultBase = this.convertCurrency(basePricing.adult, basePricing.currency, this.quoteCurrency);
    const childBase = this.convertCurrency(basePricing.child, basePricing.currency, this.quoteCurrency);

    const adultTotal = adultBase * this.adults;
    const childTotal = childBase * this.children;

    const hotelTotal = this.getAccommodationTotal();
    const trainTotal = this.getTrainTotal();
    const extrasTotal = this.getExtrasTotal();

    const subtotal = adultTotal + childTotal + hotelTotal + trainTotal + extrasTotal;

    const discountTotal = this.calculateManualDiscount(subtotal);
    const fullPaymentDiscount = this.paymentMode === "full"
      ? this.calculateFullPaymentDiscount(subtotal - discountTotal)
      : 0;

    const total = Math.max(0, subtotal - discountTotal - fullPaymentDiscount);

    const paymentOptions = this.packagesData.paymentOptions || {};
    const partialPercent = Number(paymentOptions.partialPaymentPercent || 30);

    const advancePayment = this.paymentMode === "partial"
      ? total * (partialPercent / 100)
      : total;

    const balance = Math.max(0, total - advancePayment);

    return {
      adultBase,
      childBase,
      adultTotal,
      childTotal,
      hotelTotal,
      trainTotal,
      extrasTotal,
      subtotal,
      discountTotal,
      fullPaymentDiscount,
      total,
      advancePayment,
      balance
    };
  }

  getBasePricing() {
    const byNationality = this.selectedPackage?.basePricingByNationality?.[this.nationality];

    if (byNationality) {
      return {
        adult: Number(byNationality.adult || 0),
        child: Number(byNationality.child || byNationality.adult || 0),
        currency: byNationality.currency || this.selectedPackage?.currency || "PEN"
      };
    }

    return {
      adult: Number(this.selectedPackage?.basePricing?.adult || 0),
      child: Number(this.selectedPackage?.basePricing?.child || this.selectedPackage?.basePricing?.adult || 0),
      currency: this.selectedPackage?.currency || "PEN"
    };
  }

  getAccommodationTotal() {
    return this.getAccommodationSummary().reduce((total, item) => {
      return total + this.calculateAccommodationAdditional(item.destination);
    }, 0);
  }

  getTrainTotal() {
    if (!this.selectedPackage || !this.selectedItineraryOption) return 0;

    const config = this.getTrainSelectionConfig();
    const outbound = this.getTrainByCode(config.outboundRoute, this.selectedOutboundTrainCode);
    const returning = this.getTrainByCode(config.returnRoute, this.selectedReturnTrainCode);
    const passengers = this.getTotalPassengers();

    const outboundTotal = outbound
      ? this.convertCurrency(Number(outbound.pricePerPerson || 0), outbound.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    const returnTotal = returning
      ? this.convertCurrency(Number(returning.pricePerPerson || 0), returning.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    return outboundTotal + returnTotal;
  }

  getExtrasTotal() {
    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
    const passengers = this.getTotalPassengers();

    return extras.reduce((total, extra) => {
      if (!this.selectedExtras.has(extra.code)) return total;

      const price = this.convertCurrency(Number(extra.price || 0), extra.currency || "USD", this.quoteCurrency);
      return total + (extra.perPerson ? price * passengers : price);
    }, 0);
  }

  calculateManualDiscount(subtotal) {
    if (!this.appliedDiscountCode) return 0;

    if (this.appliedDiscountCode.type === "percent") {
      return subtotal * (Number(this.appliedDiscountCode.value || 0) / 100);
    }

    if (this.appliedDiscountCode.type === "fixed") {
      return this.convertCurrency(
        Number(this.appliedDiscountCode.value || 0),
        this.appliedDiscountCode.currency || this.quoteCurrency,
        this.quoteCurrency
      );
    }

    return 0;
  }

  calculateFullPaymentDiscount(amount) {
    const percent = Number(this.packagesData?.paymentOptions?.fullPaymentDiscountPercent || 0);
    return Math.max(0, amount) * (percent / 100);
  }

  updatePricing() {
    const breakdown = this.getPricingBreakdown();

    this.setText("adultSummaryLabel", `Adultos x${this.adults}`);
    this.setText("adultSummaryTotal", this.formatCurrency(breakdown.adultTotal, this.quoteCurrency));

    const childrenRow = document.getElementById("childrenSummaryRow");
    if (childrenRow) childrenRow.hidden = this.children <= 0;
    this.setText("childrenSummaryLabel", `Niños x${this.children}`);
    this.setText("childrenSummaryTotal", this.formatCurrency(breakdown.childTotal, this.quoteCurrency));

    const hotelRow = document.getElementById("hotelSummaryRow");
    if (hotelRow) hotelRow.hidden = breakdown.hotelTotal <= 0;
    this.setText("hotelSummaryTotal", this.formatCurrency(breakdown.hotelTotal, this.quoteCurrency));

    const trainRow = document.getElementById("trainSummaryRow");
    if (trainRow) trainRow.hidden = breakdown.trainTotal <= 0;
    this.setText("trainSummaryTotal", this.formatCurrency(breakdown.trainTotal, this.quoteCurrency));

    const extrasRow = document.getElementById("extrasSummaryRow");
    if (extrasRow) extrasRow.hidden = breakdown.extrasTotal <= 0;
    this.setText("extrasSummaryTotal", this.formatCurrency(breakdown.extrasTotal, this.quoteCurrency));

    const discountRow = document.getElementById("discountSummaryRow");
    const totalDiscount = breakdown.discountTotal + breakdown.fullPaymentDiscount;
    if (discountRow) discountRow.hidden = totalDiscount <= 0;
    this.setText("discountSummaryTotal", `- ${this.formatCurrency(totalDiscount, this.quoteCurrency)}`);

    this.setText("quoteGrandTotal", this.formatCurrency(breakdown.total, this.quoteCurrency));
    this.setText("advanceSummaryTotal", this.formatCurrency(breakdown.advancePayment, this.quoteCurrency));
    this.setText("balanceSummaryTotal", this.formatCurrency(breakdown.balance, this.quoteCurrency));

    const balanceRow = document.getElementById("balanceSummaryRow");
    if (balanceRow) balanceRow.hidden = this.paymentMode !== "partial";

    this.setText("advanceSummaryLabel", this.paymentMode === "partial" ? "Pagar ahora" : "Pagar ahora");

    const paymentInfoText = document.getElementById("paymentInfoText");
    if (paymentInfoText) {
      paymentInfoText.textContent = this.paymentMode === "full"
        ? `Pagando el total ahora accedes al descuento por pago completo.`
        : `Reserva con un anticipo y completa el saldo antes del viaje.`;
    }
  }

  applyManualDiscountCode() {
    const input = document.getElementById("discountCodeInput");
    const message = document.getElementById("discountCodeMessage");
    const rawCode = String(input?.value || "").trim().toUpperCase();

    this.clearDiscountMessage();

    if (!rawCode) {
      this.appliedDiscountCode = null;
      if (message) {
        message.textContent = "Ingresa un código de descuento.";
        message.classList.add("is-error");
      }
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    const found = this.discountCodes.find((item) => {
      return String(item.code || "").toUpperCase() === rawCode && item.active !== false;
    });

    if (!found) {
      this.appliedDiscountCode = null;
      if (message) {
        message.textContent = "Código no válido o inactivo.";
        message.classList.add("is-error");
      }
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    this.appliedDiscountCode = found;

    if (message) {
      message.textContent = found.label || "Código aplicado correctamente.";
      message.classList.add("is-success");
    }

    this.updatePricing();
    this.updatePrintQuotation();
  }

  clearAppliedDiscountCode(update = true) {
    this.appliedDiscountCode = null;

    const input = document.getElementById("discountCodeInput");
    if (input) input.value = "";

    this.clearDiscountMessage();

    if (update) {
      this.updatePricing();
      this.updatePrintQuotation();
    }
  }

  clearDiscountMessage() {
    const message = document.getElementById("discountCodeMessage");
    if (!message) return;

    message.classList.remove("is-success", "is-error");
    message.textContent = "Ingresa tu código promocional si tienes uno.";
  }

  updatePrintQuotation() {
    const breakdown = this.getPricingBreakdown();

    this.setText("printQuoteReference", this.quoteReference);
    this.setText("quoteReference", this.quoteReference);
    this.setText("printIssueDate", this.formatDisplayDate(new Date()));

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + Number(this.packagesData?.paymentOptions?.quoteValidityDays || 2));
    this.setText("printValidUntil", this.formatDisplayDate(validUntil));

    this.setText("printCouponCode", this.printCoupon);
    this.setText("printCouponDiscount", `${Number(this.packagesData?.paymentOptions?.fullPaymentDiscountPercent || 5)}%`);

    this.setText("printClientName", this.getInputValue("clientName") || "Por completar");
    this.setText("printClientPhone", this.getInputValue("clientPhone") || "Por completar");
    this.setText("printClientEmail", this.getInputValue("clientEmail") || "Por completar");
    this.setText("printClientDocument", this.getInputValue("clientDocument") || "Por completar");
    this.setText("printClientNotes", this.getInputValue("clientNotes") || "Sin comentarios adicionales");

    this.setText("printTravelDates", this.travelStartDate && this.travelEndDate ? `${this.travelStartDate} al ${this.travelEndDate}` : "Por completar");
    this.setText("printTravelDuration", this.travelDays ? `${this.travelDays} días / ${this.travelNights} noches` : "Por completar");
    this.setText("printArrivalTime", this.arrivalTime || "Por completar");
    this.setText("printDepartureTime", this.departureTime || "Por completar");
    this.setText("printNationality", this.getNationalityLabel());
    this.setText("printCurrency", this.quoteCurrency);

    const itineraryTarget = document.getElementById("printItinerary");
    if (itineraryTarget) {
      const itinerary = this.selectedItineraryOption?.itinerary || [];

      itineraryTarget.innerHTML = itinerary.length
        ? itinerary.map((item) => `
          <div class="print-itinerary-item">
            <h4>Día ${this.escapeHtml(item.day)}: ${this.escapeHtml(item.title || "")}</h4>
            <p>${this.escapeHtml(item.description || "")}</p>
          </div>
        `).join("")
        : "<p>Itinerario por confirmar.</p>";
    }

    const servicesTarget = document.getElementById("printSelectedServices");
    if (servicesTarget) {
      servicesTarget.innerHTML = `
        <p><strong>Paquete:</strong> ${this.escapeHtml(this.selectedPackage?.title || "Por confirmar")}</p>
        <p><strong>Itinerario:</strong> ${this.escapeHtml(this.selectedItineraryOption?.label || "Por confirmar")}</p>
        <p><strong>Alojamiento:</strong> ${this.escapeHtml(this.getSelectedHotelsText())}</p>
        <p><strong>Trenes:</strong> ${this.escapeHtml(this.getSelectedTrainsText())}</p>
        <p><strong>Extras:</strong> ${this.escapeHtml(this.getSelectedExtrasText())}</p>
      `;
    }

    const paymentTarget = document.getElementById("printPaymentDetails");
    if (paymentTarget) {
      paymentTarget.innerHTML = `
        <p><strong>Adultos:</strong> ${this.formatCurrency(breakdown.adultTotal, this.quoteCurrency)}</p>
        ${this.children > 0 ? `<p><strong>Niños:</strong> ${this.formatCurrency(breakdown.childTotal, this.quoteCurrency)}</p>` : ""}
        ${breakdown.hotelTotal > 0 ? `<p><strong>Alojamiento:</strong> ${this.formatCurrency(breakdown.hotelTotal, this.quoteCurrency)}</p>` : ""}
        ${breakdown.trainTotal > 0 ? `<p><strong>Trenes:</strong> ${this.formatCurrency(breakdown.trainTotal, this.quoteCurrency)}</p>` : ""}
        ${breakdown.extrasTotal > 0 ? `<p><strong>Extras:</strong> ${this.formatCurrency(breakdown.extrasTotal, this.quoteCurrency)}</p>` : ""}
        ${breakdown.discountTotal + breakdown.fullPaymentDiscount > 0 ? `<p><strong>Descuentos:</strong> - ${this.formatCurrency(breakdown.discountTotal + breakdown.fullPaymentDiscount, this.quoteCurrency)}</p>` : ""}
        <p><strong>Total cotizado:</strong> ${this.formatCurrency(breakdown.total, this.quoteCurrency)}</p>
        <p><strong>Pagar ahora:</strong> ${this.formatCurrency(breakdown.advancePayment, this.quoteCurrency)}</p>
        ${this.paymentMode === "partial" ? `<p><strong>Saldo pendiente:</strong> ${this.formatCurrency(breakdown.balance, this.quoteCurrency)}</p>` : ""}
      `;
    }
  }

  continueToPayment() {
    if (!this.selectedPackage) {
      alert("Primero selecciona tus fechas para detectar un itinerario.");
      return;
    }

    const breakdown = this.getPricingBreakdown();

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
      departureTime: this.departureTime,
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
    } finally {
      wrapper.remove();
    }
  }

  renderPackageIncludes() {
    const existing = document.getElementById("packageIncludesBox");
    if (existing) existing.remove();

    if (!this.selectedPackage) return;

    const itinerarySection = document.getElementById("itinerarySection");
    if (!itinerarySection) return;

    const includes = Array.isArray(this.selectedPackage.includes) ? this.selectedPackage.includes : [];
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
    if (preview) preview.insertAdjacentElement("afterend", box);
    else itinerarySection.appendChild(box);
  }

  updateItinerarySectionIntro(optionsCount = 0) {
    const headerText = document.querySelector("#itinerarySection .quote-card__header p");
    if (!headerText || !this.selectedPackage) return;

    headerText.innerHTML = `
      Estas son las opciones de itinerario disponibles para tus fechas.
      ${optionsCount ? `Actualmente tienes ${optionsCount} opción${optionsCount !== 1 ? "es" : ""} compatible${optionsCount !== 1 ? "s" : ""}.` : ""}
    `;
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

  getItineraryMarketingDescription(option) {
    if (option.summary) return option.summary;

    return "Itinerario disponible para tus fechas, con servicios organizados según la duración seleccionada.";
  }

  getSelectedHotelsText() {
    const summary = this.getAccommodationSummary();

    if (!summary.length) return "Sin alojamiento seleccionado";

    return summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      return `${this.getDestinationLabel(item.destination)}: ${selection?.hotel?.hotelName || "Sin alojamiento"}`;
    }).join(" | ");
  }

  getSelectedTrainsText() {
    if (!this.selectedPackage || !this.selectedItineraryOption) return "Sin tren seleccionado";

    const config = this.getTrainSelectionConfig();
    const outbound = this.getTrainByCode(config.outboundRoute, this.selectedOutboundTrainCode);
    const returning = this.getTrainByCode(config.returnRoute, this.selectedReturnTrainCode);

    return [
      outbound ? `Ida: ${this.getTrainDisplayName(outbound)}` : "Ida: sin selección",
      returning ? `Retorno: ${this.getTrainDisplayName(returning)}` : "Retorno: sin selección"
    ].join(" | ");
  }

  getSelectedExtrasText() {
    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
    const selected = extras.filter((extra) => this.selectedExtras.has(extra.code));

    if (!selected.length) return "Sin extras";

    return selected.map((extra) => extra.label).join(", ");
  }

  getTotalPassengers() {
    return Math.max(1, Number(this.adults || 0) + Number(this.children || 0));
  }

  updatePassengersUI() {
    this.setText("adultsCount", this.adults);
    this.setText("childrenCount", this.children);
  }

  updateReferenceUI() {
    this.setText("quoteReference", this.quoteReference);
    this.setText("printQuoteReference", this.quoteReference);
  }

  updateExchangeRateHelp() {
    const help = document.getElementById("exchangeRateHelp");
    if (!help) return;

    help.textContent = `Tipo de cambio referencial: 1 USD = S/ ${this.exchangeRate.toFixed(2)}.`;
  }

  convertCurrency(amount, fromCurrency, toCurrency) {
    const value = Number(amount || 0);
    const from = fromCurrency || "USD";
    const to = toCurrency || "USD";

    if (from === to) return value;

    if (from === "USD" && to === "PEN") return value * this.exchangeRate;
    if (from === "PEN" && to === "USD") return value / this.exchangeRate;

    return value;
  }

  formatCurrency(amount, currency = this.quoteCurrency) {
    const value = Number(amount || 0);

    if (currency === "PEN") {
      return `S/ ${value.toFixed(2)}`;
    }

    return `USD ${value.toFixed(2)}`;
  }

  formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  formatDisplayDate(date) {
    if (!(date instanceof Date)) return "";

    return date.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  timeToMinutes(value) {
    if (!value || typeof value !== "string") return null;

    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return hours * 60 + minutes;
  }

  minutesToTimeLabel(minutes) {
    const value = Number(minutes);
    if (Number.isNaN(value)) return "";

    const hours = Math.floor(value / 60);
    const mins = value % 60;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  getNationalityLabel() {
    const option = this.packagesData?.nationalityOptions?.find((item) => item.code === this.nationality);
    return option?.label || this.nationality;
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

  initDesktopQuotePanelFixed() {
    const panel = document.querySelector(".quote-summary-panel");
    const sidebar = document.querySelector(".quote-sidebar");

    if (!panel || !sidebar) return;

    const apply = () => {
      if (window.innerWidth < 1101) {
        panel.classList.remove("is-desktop-fixed");
        panel.style.left = "";
        panel.style.width = "";
        return;
      }

      const sidebarRect = sidebar.getBoundingClientRect();
      panel.style.width = `${sidebarRect.width}px`;
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, { passive: true });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.myCuscoTripQuotePackages = new MyCuscoTripQuotePackages();
});
