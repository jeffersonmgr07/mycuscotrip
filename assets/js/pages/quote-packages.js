"use strict";

/**
 * My Cusco Trip - Cotizador dinámico de paquetes
 * Restaura el flujo inteligente de quote-packages.html:
 * fechas + horarios -> paquetes compatibles -> itinerario -> hoteles -> trenes -> extras -> resumen -> impresión/PDF.
 */
(function () {
  const DATA_PATHS = {
    packagesCusco: "./assets/data/packages-cusco.json",
    toursCusco: "./assets/data/tours-cusco.json",
    toursMachuPicchu: "./assets/data/tours-machu-picchu.json",
    trekkingsCusco: "./assets/data/trekkings-cusco.json",
    hotels: "./assets/data/hotels.json",
    trains: "./assets/data/trains.json",
    discounts: "./assets/data/discount-codes.json"
  };

  const EXCHANGE_FALLBACK = 3.75;
  const STORAGE_KEY = "mct_quote_package_state_v18";

  const state = {
    data: {},
    exchangeRate: EXCHANGE_FALLBACK,
    dates: { start: null, end: null, days: 0, nights: 0 },
    arrivalTime: "09:00",
    departureTime: "20:00",
    adults: 2,
    children: 0,
    nationality: "national",
    currency: "PEN",
    options: [],
    selectedOptionIndex: -1,
    selectedHotels: {},
    selectedTrains: { outbound: null, return: null },
    selectedExtras: new Set(),
    manualDiscount: null,
    activeHotelDestination: null,
    pendingHotelKey: null,
    activeTrainDirection: null,
    pendingTrainCode: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clampNumber(value, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(max, Math.max(min, parsed));
  }

  function parseISODate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const parts = String(value).split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(date) {
    if (!date) return "Por completar";
    try {
      return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
    } catch (_) {
      return date.toISOString().slice(0, 10);
    }
  }

  function formatDateShort(date) {
    if (!date) return "--/--/----";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}/${date.getFullYear()}`;
  }

  function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + Number(days || 0));
    return next;
  }

  function getDateDiffDays(start, end) {
    if (!start || !end) return 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endUTC - startUTC) / oneDay);
  }

  function getPassengerCount() {
    return state.adults + state.children;
  }

  function getSelectedOption() {
    return state.options[state.selectedOptionIndex] || null;
  }

  function getAllTours() {
    return [
      ...toArray(state.data.toursCusco?.products),
      ...toArray(state.data.toursMachuPicchu?.tours),
      ...toArray(state.data.trekkingsCusco?.products)
    ];
  }

  function findTourByCode(code) {
    return getAllTours().find((tour) => tour?.internalCode === code || tour?.id === code || tour?.slug === code) || null;
  }

  function isMachuPicchuTour(tour) {
    return normalizeText(tour?.category).includes("machu") || normalizeText(tour?.internalCode).startsWith("mapi");
  }

  function getOptionTours(option) {
    if (!option) return [];
    const directTours = toArray(option.includedTours);
    const directCodes = new Set(directTours.map((tour) => tour?.internalCode).filter(Boolean));
    const fromCodes = toArray(option.includedTourCodes)
      .filter((code) => !directCodes.has(code))
      .map(findTourByCode)
      .filter(Boolean);
    return [...directTours, ...fromCodes];
  }

  function getMachuTour(option = getSelectedOption()) {
    return getOptionTours(option).find(isMachuPicchuTour) || null;
  }

  function resolveAssetPath(path) {
    if (!path) return "./assets/img/placeholder/experience.jpg";
    const value = String(path);
    if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
    return value.replace(/^\/?assets\//, "./assets/").replace(/^\.\.\/assets\//, "./assets/");
  }

  function getImageFromTour(tour) {
    return resolveAssetPath(tour?.images?.cover || tour?.image || "./assets/img/placeholder/experience.jpg");
  }

  function money(amount, currency = state.currency) {
    const value = Number(amount || 0);
    const code = currency || "USD";
    try {
      return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch (_) {
      const prefix = code === "PEN" ? "S/" : `${code} `;
      return `${prefix} ${value.toFixed(2)}`;
    }
  }

  function convert(amount, fromCurrency = "USD", toCurrency = state.currency) {
    const value = Number(amount || 0);
    const from = String(fromCurrency || "USD").toUpperCase();
    const to = String(toCurrency || "USD").toUpperCase();
    if (from === to) return value;
    if (from === "USD" && to === "PEN") return value * state.exchangeRate;
    if (from === "PEN" && to === "USD") return value / state.exchangeRate;
    return value;
  }

  async function fetchJSON(path, fallback) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.warn(`[quote-packages] No se pudo cargar ${path}:`, error);
      return fallback;
    }
  }

  async function loadData() {
    const [packagesCusco, toursCusco, toursMachuPicchu, trekkingsCusco, hotels, trains, discounts] = await Promise.all([
      fetchJSON(DATA_PATHS.packagesCusco, {}),
      fetchJSON(DATA_PATHS.toursCusco, { products: [] }),
      fetchJSON(DATA_PATHS.toursMachuPicchu, { tours: [] }),
      fetchJSON(DATA_PATHS.trekkingsCusco, { products: [] }),
      fetchJSON(DATA_PATHS.hotels, { destinations: {} }),
      fetchJSON(DATA_PATHS.trains, { trains: [] }),
      fetchJSON(DATA_PATHS.discounts, [])
    ]);

    state.data = { packagesCusco, toursCusco, toursMachuPicchu, trekkingsCusco, hotels, trains, discounts };
    state.exchangeRate = Number(packagesCusco?.exchangeRateUSDToPEN || hotels?.pricingEngine?.exchangeRateUSDToPEN || EXCHANGE_FALLBACK) || EXCHANGE_FALLBACK;
    updateExchangeRateHelp();
  }

  function updateExchangeRateHelp() {
    const help = $("#exchangeRateHelp");
    if (help) help.textContent = `Tipo de cambio referencial: 1 USD = S/ ${state.exchangeRate.toFixed(2)}.`;
  }

  function generateQuoteReference() {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `COT-PE-${stamp}-${rand}`;
  }

  function ensureQuoteReference() {
    const el = $("#quoteReference");
    if (!el) return;
    if (!el.dataset.generated || el.textContent.includes("---")) {
      el.dataset.generated = generateQuoteReference();
      el.textContent = el.dataset.generated;
    }
  }

  function calculateDurationFromDates(selectedDates) {
    const start = selectedDates?.[0] ? parseISODate(selectedDates[0]) : null;
    const end = selectedDates?.[1] ? parseISODate(selectedDates[1]) : null;
    if (!start || !end) {
      state.dates = { start, end, days: 0, nights: 0 };
      return;
    }
    const diff = Math.max(0, getDateDiffDays(start, end));
    state.dates = { start, end, days: diff + 1, nights: diff };
  }

  function getTravelRangeLabel() {
    if (!state.dates.start || !state.dates.end) return "Por completar";
    return `${formatDate(state.dates.start)} al ${formatDate(state.dates.end)}`;
  }

  function updateTravelHelp() {
    const help = $("#travelRangeHelp");
    if (!help) return;
    if (!state.dates.days) {
      help.hidden = true;
      help.textContent = "";
      return;
    }
    help.hidden = false;
    help.textContent = `Duración detectada: ${state.dates.days} días / ${state.dates.nights} noches.`;
  }

  function initPickers() {
    if (typeof flatpickr !== "undefined") {
      const locale = flatpickr.l10ns?.es || flatpickr.l10ns?.default;
      const travelRange = $("#travelRange");
      if (travelRange) {
        flatpickr(travelRange, {
          mode: "range",
          locale,
          dateFormat: "Y-m-d",
          altInput: true,
          altFormat: "d M Y",
          minDate: "today",
          onChange(selectedDates) {
            calculateDurationFromDates(selectedDates);
            state.selectedOptionIndex = -1;
            state.selectedHotels = {};
            state.selectedTrains = { outbound: null, return: null };
            state.selectedExtras.clear();
            updateTravelHelp();
            generateAndRenderOptions();
          }
        });
      }

      const arrival = $("#arrivalTime");
      if (arrival) {
        flatpickr(arrival, {
          enableTime: true,
          noCalendar: true,
          time_24hr: true,
          dateFormat: "H:i",
          defaultDate: state.arrivalTime,
          onChange(_, value) {
            state.arrivalTime = value || "09:00";
            generateAndRenderOptions();
          }
        });
      }

      const departure = $("#departureTime");
      if (departure) {
        flatpickr(departure, {
          enableTime: true,
          noCalendar: true,
          time_24hr: true,
          dateFormat: "H:i",
          defaultDate: state.departureTime,
          onChange(_, value) {
            state.departureTime = value || "20:00";
            generateAndRenderOptions();
          }
        });
      }
    }
  }

  function applyCurrencyRulesByNationality() {
    const currency = $("#quoteCurrency");
    const help = $("#nationalityHelp");
    if (!currency) return;

    if (state.nationality === "national") {
      [...currency.options].forEach((option) => { option.disabled = false; });
      if (help) help.textContent = "Turistas peruanos pueden ver tren local sujeto a disponibilidad presencial con DNI físico vigente.";
    } else {
      state.currency = "USD";
      currency.value = "USD";
      [...currency.options].forEach((option) => { option.disabled = option.value === "PEN"; });
      if (help) help.textContent = "Para extranjeros y Comunidad Andina se cotiza en USD; el tren local no aplica.";
      if (state.selectedTrains.outbound?.isLocalTrain || state.selectedTrains.return?.isLocalTrain) {
        state.selectedTrains = { outbound: null, return: null };
      }
    }
  }

  function generateAndRenderOptions() {
    applyCurrencyRulesByNationality();
    updateTravelHelp();

    const section = $("#itinerarySection");
    const packageOptions = $("#packageOptions");
    const itineraryOptions = $("#itineraryOptions");

    if (!state.dates.days || !state.dates.nights) {
      if (section) section.hidden = true;
      if (packageOptions) packageOptions.innerHTML = "";
      if (itineraryOptions) itineraryOptions.innerHTML = "";
      clearDependentSections();
      updateSummary();
      return;
    }

    const params = {
      days: state.dates.days,
      nights: state.dates.nights,
      arrivalTime: state.arrivalTime,
      departureTime: state.departureTime,
      productFamily: "cusco-package"
    };

    if (window.MyCuscoTripPackageGenerator?.generatePackageOptions) {
      state.options = window.MyCuscoTripPackageGenerator.generatePackageOptions(params, {
        data: {
          packagesCusco: state.data.packagesCusco,
          toursCusco: state.data.toursCusco,
          toursMachuPicchu: state.data.toursMachuPicchu,
          trekkingsCusco: state.data.trekkingsCusco
        }
      });
    } else {
      state.options = getFallbackOptions(params);
    }

    if (section) section.hidden = false;
    renderPackageOptions();

    if (state.options.length) {
      selectPackageOption(state.selectedOptionIndex >= 0 ? state.selectedOptionIndex : 0, { silentScroll: true });
    } else {
      state.selectedOptionIndex = -1;
      clearDependentSections();
      renderItineraryPreview();
      updateSummary();
    }
  }

  function getFallbackOptions(params) {
    const card = toArray(state.data.packagesCusco?.packageCards).find((item) => Number(item.days) === params.days && Number(item.nights) === params.nights);
    if (!card) return [];
    const codes = toArray(card.search?.includedTourCodes);
    return [{
      ...card,
      includedTourCodes: codes,
      includedTours: codes.map(findTourByCode).filter(Boolean),
      arrivalDepartureProfile: { label: "Horario personalizado" },
      generationReason: "fallback-card"
    }];
  }

  function getOptionBaseAdult(option) {
    return getOptionTours(option).reduce((sum, tour) => sum + getTourBasePriceUSD(tour, "adult"), 0);
  }

  function getOptionBaseChild(option) {
    return getOptionTours(option).reduce((sum, tour) => sum + getTourBasePriceUSD(tour, "child"), 0);
  }

  function getTourBasePriceUSD(tour, passengerType = "adult") {
    if (!tour) return 0;
    let price = 0;
    const nationalityPricing = tour.basePricingByNationality?.[state.nationality];
    if (nationalityPricing && Number.isFinite(Number(nationalityPricing[passengerType]))) {
      price = Number(nationalityPricing[passengerType]);
    } else if (Number.isFinite(Number(tour.basePricing?.[passengerType]))) {
      price = Number(tour.basePricing[passengerType]);
    } else if (Number.isFinite(Number(tour.priceFrom))) {
      price = Number(tour.priceFrom);
    }

    if (tour.quotePackageBaseExcludesTrain || tour.priceIncludesTrain || tour.publicPriceIncludesTrain) {
      const defaultTrain = Number(tour.internalPricing?.defaultTrainCostUSD || tour.defaultTrainSelection?.pricingSnapshot?.totalAdultTrainCost || 0);
      price = Math.max(0, price - defaultTrain);
    }

    return price;
  }

  function renderPackageOptions() {
    const target = $("#packageOptions");
    const intro = $("#itinerarySectionIntro");
    if (!target) return;

    if (intro) {
      intro.textContent = state.options.length
        ? `Encontramos ${state.options.length} alternativa(s) compatibles con ${state.dates.days} días / ${state.dates.nights} noches y tus horarios.`
        : `No encontramos paquetes compatibles con ${state.dates.days} días / ${state.dates.nights} noches. Ajusta tus fechas o consulta por WhatsApp.`;
    }

    if (!state.options.length) {
      target.innerHTML = `
        <div class="quote-empty-state">
          <strong>No hay una ruta automática para esta duración.</strong>
          <p>Prueba con una estadía de 3 a 10 días o escríbenos para armar un paquete manual.</p>
        </div>
      `;
      return;
    }

    target.innerHTML = state.options.map((option, index) => {
      const tours = getOptionTours(option);
      const titles = tours.slice(0, 4).map((tour) => tour.title).join(" · ");
      const baseAdult = convert(getOptionBaseAdult(option), "USD", state.currency);
      const isSelected = index === state.selectedOptionIndex;
      return `
        <button type="button" class="quote-package-option ${isSelected ? "is-selected" : ""}" data-option-index="${index}">
          <span class="quote-package-option__badge">${escapeHtml(option.badge || option.rawCard?.badge || "Ruta sugerida")}</span>
          <strong>${escapeHtml(option.rawCard?.recommendedTitle || option.title || `Paquete ${option.days}D/${option.nights}N`)}</strong>
          <small>${escapeHtml(option.arrivalDepartureProfile?.label || "Compatible con tus horarios")}</small>
          <p>${escapeHtml(titles || option.shortDescription || "Itinerario armado desde los JSON del proyecto.")}</p>
          <em>Base desde ${money(baseAdult)} por adulto sin hoteles ni trenes seleccionados</em>
        </button>
      `;
    }).join("");
  }

  function selectPackageOption(index, options = {}) {
    const nextIndex = Number(index);
    if (!Number.isInteger(nextIndex) || !state.options[nextIndex]) return;
    state.selectedOptionIndex = nextIndex;
    state.selectedHotels = {};
    state.selectedTrains = { outbound: null, return: null };
    state.selectedExtras.clear();

    renderPackageOptions();
    renderItineraryPreview();
    renderHotelSelectors();
    renderTrainSelectors();
    renderExtras();
    updateSummary();
    updatePrintableTemplate();

    if (!options.silentScroll) {
      $("#itineraryPreview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function getTourDayLabel(index, total, tour) {
    const title = normalizeText(tour?.title);
    if (index === 0) return "Día 1";
    if (index === total - 1) return `Día ${state.dates.days}`;
    if (title.includes("machu")) return "Día Machu Picchu";
    return `Día ${Math.min(index + 1, state.dates.days)}`;
  }

  function buildItineraryItems(option = getSelectedOption()) {
    if (!option) return [];
    const tours = getOptionTours(option);
    const items = [];
    const startDate = state.dates.start;

    items.push({
      day: 1,
      date: startDate,
      title: "Llegada a Cusco · Recojo y asistencia",
      description: state.arrivalTime >= "15:00"
        ? "Llegada, traslado al hotel, aclimatación y revisión de la ruta. Por el horario, evitamos tours exigentes el primer día."
        : "Llegada, traslado y primera actividad compatible con tu horario de arribo.",
      meta: `Disponible desde aprox. ${getAvailableStartTime(state.arrivalTime)}`,
      synthetic: true
    });

    const realTours = tours.filter((tour) => !normalizeText(tour?.title).includes("transfer"));
    realTours.forEach((tour, idx) => {
      const suggestedDay = Math.min(Math.max(idx + 1, 1), state.dates.days);
      const day = isMachuPicchuTour(tour) ? Math.min(Math.max(2, suggestedDay + 1), Math.max(2, state.dates.days - 1)) : suggestedDay;
      items.push({
        day,
        date: startDate ? addDays(startDate, day - 1) : null,
        title: tour.title || tour.name || tour.internalCode || "Experiencia incluida",
        description: tour.shortDescription || tour.description || `Servicio incluido desde ${tour.internalCode || "JSON"}.`,
        meta: tour.duration?.label || tour.typeLabel || tour.category || "Actividad turística",
        tour
      });
    });

    items.push({
      day: state.dates.days || items.length + 1,
      date: startDate ? addDays(startDate, Math.max(state.dates.days - 1, 0)) : null,
      title: "Traslado de salida",
      description: `Cierre de servicios y traslado al aeropuerto/terminal. Se reserva una ventana operativa antes de tu salida de ${state.departureTime}.`,
      meta: "Transfer OUT",
      synthetic: true
    });

    return items
      .sort((a, b) => Number(a.day) - Number(b.day))
      .map((item, index) => ({ ...item, displayDay: Math.min(index + 1, state.dates.days || index + 1) }));
  }

  function getAvailableStartTime(time) {
    const [h, m] = String(time || "09:00").split(":").map(Number);
    const date = new Date(2000, 0, 1, h || 9, m || 0);
    date.setMinutes(date.getMinutes() + 90);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function renderItineraryPreview() {
    const target = $("#itineraryPreview");
    const optionsTarget = $("#itineraryOptions");
    const option = getSelectedOption();
    if (!target) return;

    if (!option) {
      target.innerHTML = `
        <div class="quote-empty-state">
          <strong>Selecciona tus fechas para generar el itinerario.</strong>
          <p>El cotizador revisará duración y horarios para proponer la ruta compatible.</p>
        </div>
      `;
      if (optionsTarget) optionsTarget.innerHTML = "";
      return;
    }

    const services = getOptionTours(option);
    if (optionsTarget) {
      optionsTarget.innerHTML = `
        <div class="quote-services-strip">
          ${services.map((tour) => `<span>${escapeHtml(tour.internalCode || "SERV")} · ${escapeHtml(tour.title || "Servicio")}</span>`).join("")}
        </div>
      `;
    }

    const items = buildItineraryItems(option);
    target.innerHTML = items.map((item) => `
      <div class="quote-itinerary-item">
        <div class="quote-itinerary-item__day">
          <strong>Día ${item.displayDay}</strong>
          <span>${escapeHtml(formatDate(item.date))}</span>
        </div>
        <div class="quote-itinerary-item__content">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.description)}</p>
          <small>${escapeHtml(item.meta || "")}</small>
        </div>
      </div>
    `).join("");
  }

  function getAccommodationPlan(option = getSelectedOption()) {
    if (!option || !state.dates.nights) return [];
    const requiresAguas = Boolean(option.requiresOvernight || option.connectionMode || getMachuTour(option)?.trainSelection?.allowedRoutes?.outbound?.includes("OLLA_MAPI"));
    const aguasNights = requiresAguas && state.dates.nights > 1 ? 1 : 0;
    const cuscoNights = Math.max(state.dates.nights - aguasNights, 0);
    const plan = [];
    if (cuscoNights > 0) plan.push({ destination: "cusco", label: "Cusco", nights: cuscoNights });
    if (aguasNights > 0) plan.push({ destination: "aguas-calientes", label: "Aguas Calientes", nights: aguasNights });
    return plan;
  }

  function getHotelsForDestination(destination) {
    return toArray(state.data.hotels?.destinations?.[destination]?.hotels).filter(Boolean);
  }

  function getRoomPriceUSD(room) {
    if (!room) return 0;
    const currency = room.publishedPricing?.currency || room.currency || "USD";
    const amount = Number(room.publishedPricing?.amount ?? room.pricePerNight ?? 0);
    return convert(amount, currency, "USD");
  }

  function chooseBestRoom(hotel) {
    const rooms = toArray(hotel?.rooms);
    if (!rooms.length) return null;
    const pax = getPassengerCount();
    const adults = state.adults;
    const children = state.children;
    const candidates = rooms
      .filter((room) => Number(room.capacity || room.maxAdults || 0) >= Math.min(pax, Number(room.capacity || pax)))
      .map((room) => {
        const capacity = Number(room.capacity || room.maxAdults || 1);
        const maxAdults = Number(room.maxAdults || capacity);
        const maxChildren = Number(room.maxChildren ?? capacity);
        const fitsAdults = maxAdults >= adults || capacity >= pax;
        const fitsChildren = maxChildren >= children || capacity >= pax;
        const exact = capacity === pax ? 0 : Math.abs(capacity - pax) + 1;
        return { room, score: (fitsAdults && fitsChildren ? 0 : 100) + exact + getRoomPriceUSD(room) / 1000 };
      })
      .sort((a, b) => a.score - b.score);
    return candidates[0]?.room || rooms[0];
  }

  function getHotelSelectionKey(destination, hotel, room) {
    return `${destination}::${hotel?.hotelCode || "hotel"}::${room?.roomType || "room"}`;
  }

  function buildHotelOptions(destination) {
    const plan = getAccommodationPlan().find((item) => item.destination === destination);
    const hotels = getHotelsForDestination(destination);
    const options = [{
      key: `${destination}::none`,
      destination,
      type: "none",
      label: "Sin hotel / solo tours",
      description: "No se suma alojamiento para este destino.",
      priceUSD: 0,
      nights: plan?.nights || 0
    }];

    hotels.forEach((hotel) => {
      const room = chooseBestRoom(hotel);
      if (!room) return;
      const priceUSD = getRoomPriceUSD(room) * Number(plan?.nights || 1);
      options.push({
        key: getHotelSelectionKey(destination, hotel, room),
        destination,
        type: "hotel",
        hotel,
        room,
        label: hotel.hotelName || "Hotel seleccionado",
        description: `${hotel.stars || ""}★ · ${hotel.location || plan?.label || destination} · ${room.label || room.roomType || "Habitación"}`,
        priceUSD,
        nights: plan?.nights || 0
      });
    });

    return options;
  }

  function getSelectedHotelOption(destination) {
    const selected = state.selectedHotels[destination];
    if (!selected) return null;
    return buildHotelOptions(destination).find((option) => option.key === selected.key) || selected;
  }

  function renderHotelSelectors() {
    const section = $("#hotelSection");
    const target = $("#hotelSelectorsContainer");
    if (!section || !target) return;
    const plan = getAccommodationPlan();
    if (!getSelectedOption() || !plan.length) {
      section.hidden = true;
      target.innerHTML = "";
      return;
    }

    section.hidden = false;
    target.innerHTML = plan.map((item) => {
      const selected = getSelectedHotelOption(item.destination);
      const text = selected ? selected.label : "Por elegir";
      const priceText = selected ? money(convert(selected.priceUSD, "USD", state.currency)) : "No seleccionado";
      return `
        <div class="quote-dynamic-card">
          <div>
            <span>${escapeHtml(item.label)} · ${item.nights} noche(s)</span>
            <strong>${escapeHtml(text)}</strong>
            <p>${escapeHtml(selected?.description || "Puedes elegir hotel o continuar sin alojamiento.")}</p>
            <small>${escapeHtml(priceText)}</small>
          </div>
          <button type="button" class="btn quote-secondary-btn" data-open-hotel="${escapeHtml(item.destination)}">
            <i class="fas fa-hotel"></i> ${selected ? "Cambiar hotel" : "Elegir hotel"}
          </button>
        </div>
      `;
    }).join("");
  }

  function openHotelModal(destination) {
    state.activeHotelDestination = destination;
    state.pendingHotelKey = state.selectedHotels[destination]?.key || null;
    const modal = $("#hotelModal");
    const title = $("#hotelModalTitle");
    const intro = $("#hotelModalIntro");
    const list = $("#hotelModalList");
    const plan = getAccommodationPlan().find((item) => item.destination === destination);
    if (!modal || !list || !plan) return;

    if (title) title.textContent = `Elige alojamiento en ${plan.label}`;
    if (intro) intro.textContent = `Tarifa referencial para ${plan.nights} noche(s), según habitaciones compatibles con ${getPassengerCount()} pasajero(s).`;

    const options = buildHotelOptions(destination);
    list.innerHTML = options.map((option) => {
      const selected = option.key === state.pendingHotelKey || (!state.pendingHotelKey && option.type === "none");
      const img = option.hotel?.images?.cover ? `<img src="${escapeHtml(resolveAssetPath(option.hotel.images.cover))}" alt="${escapeHtml(option.label)}" loading="lazy">` : "";
      return `
        <button type="button" class="quote-modal-card ${selected ? "is-selected" : ""}" data-hotel-key="${escapeHtml(option.key)}">
          ${img}
          <span>${escapeHtml(option.type === "none" ? "Flexible" : `${option.hotel?.stars || ""} estrellas`)}</span>
          <strong>${escapeHtml(option.label)}</strong>
          <p>${escapeHtml(option.description)}</p>
          <em>${option.priceUSD > 0 ? money(convert(option.priceUSD, "USD", state.currency)) : "Sin costo de hotel"}</em>
        </button>
      `;
    }).join("");
    modal.hidden = false;
  }

  function confirmHotelSelection() {
    if (!state.activeHotelDestination) return;
    const options = buildHotelOptions(state.activeHotelDestination);
    const option = options.find((item) => item.key === state.pendingHotelKey) || options[0];
    state.selectedHotels[state.activeHotelDestination] = option;
    closeModals();
    renderHotelSelectors();
    updateSummary();
    updatePrintableTemplate();
  }

  function getTrainSelectionConfig() {
    const tour = getMachuTour();
    return tour?.trainSelection || null;
  }

  function getTrainDirection(direction) {
    return direction === "return" ? "return" : "outbound";
  }

  function isReturnTrain(train) {
    return train?.direction === "return" || train?.direction === "inbound" || String(train?.route || "").startsWith("MAPI_");
  }

  function isOutboundTrain(train) {
    return train?.direction === "outbound" || String(train?.route || "").endsWith("_MAPI");
  }

  function timeToMinutes(value) {
    const [h, m] = String(value || "00:00").split(":").map(Number);
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  }

  function inTimeWindow(train, windowConfig) {
    if (!windowConfig) return true;
    const minutes = timeToMinutes(train.departureTime);
    const min = windowConfig.min ? timeToMinutes(windowConfig.min) : 0;
    const max = windowConfig.max ? timeToMinutes(windowConfig.max) : 24 * 60;
    return minutes >= min && minutes <= max;
  }

  function isAllowedTrainByNationality(train) {
    if (!train) return false;
    if (train.isLocalTrain) return state.nationality === "national";
    const only = toArray(train.operationalUse?.nationalitiesOnly);
    if (!only.length) return true;
    if (state.nationality === "national") return only.includes("PE") || only.includes("national");
    return only.includes(state.nationality);
  }

  function getTrainOptions(direction) {
    const config = getTrainSelectionConfig();
    if (!config) return [];
    const normalizedDirection = getTrainDirection(direction);
    const trains = toArray(state.data.trains?.trains);
    const allowedCodes = toArray(config.allowedTrainCodes?.[normalizedDirection]);
    const allowedRoutes = toArray(config.allowedRoutes?.[normalizedDirection]);
    const allowedCompanies = toArray(config.allowedCompanies).map(normalizeText);
    const defaultCode = config.defaultTrainCodes?.[normalizedDirection];
    const timeWindow = config.timeWindows?.[normalizedDirection];
    const outboundOperator = state.selectedTrains.outbound?.operatorKey || state.selectedTrains.outbound?.company;
    const sameCompanyRequired = normalizedDirection === "return" && config.returnOptionsRule === "same_company_as_outbound" && outboundOperator && outboundOperator !== "local";

    let options = trains.filter((train) => {
      if (normalizedDirection === "outbound" && !isOutboundTrain(train)) return false;
      if (normalizedDirection === "return" && !isReturnTrain(train)) return false;
      if (!isAllowedTrainByNationality(train)) return false;
      if (allowedCodes.length && !allowedCodes.includes(train.code)) return false;
      if (allowedRoutes.length && !allowedRoutes.includes(train.route)) return false;
      if (allowedCompanies.length && !train.isLocalTrain && !allowedCompanies.includes(normalizeText(train.operatorKey || train.company))) return false;
      if (sameCompanyRequired && !train.isLocalTrain && normalizeText(train.operatorKey || train.company) !== normalizeText(outboundOperator)) return false;
      if (!inTimeWindow(train, timeWindow)) return false;
      return true;
    });

    if (!options.length && defaultCode) {
      options = trains.filter((train) => train.code === defaultCode && isAllowedTrainByNationality(train));
    }

    return options
      .sort((a, b) => {
        const localA = a.isLocalTrain ? -1000 : 0;
        const localB = b.isLocalTrain ? -1000 : 0;
        const defaultA = a.code === defaultCode ? -500 : 0;
        const defaultB = b.code === defaultCode ? -500 : 0;
        return (localA + defaultA + timeToMinutes(a.departureTime)) - (localB + defaultB + timeToMinutes(b.departureTime));
      })
      .slice(0, 10);
  }

  function getTrainPriceUSD(train, passengerType = "adult") {
    if (!train) return 0;
    const amount = Number(train.price?.[passengerType] ?? train.price?.adult ?? train.pricePerPerson ?? 0);
    return convert(amount, train.currency || "USD", "USD");
  }

  function renderTrainSelectors() {
    const section = $("#trainSection");
    const outbound = $("#outboundTrainSelected");
    const returned = $("#returnTrainSelected");
    if (!section) return;
    const config = getTrainSelectionConfig();
    if (!getSelectedOption() || !config) {
      section.hidden = true;
      state.selectedTrains = { outbound: null, return: null };
      return;
    }
    section.hidden = false;

    renderTrainSelectedCard(outbound, "outbound", state.selectedTrains.outbound);
    renderTrainSelectedCard(returned, "return", state.selectedTrains.return);
  }

  function renderTrainSelectedCard(container, direction, train) {
    if (!container) return;
    const label = direction === "outbound" ? "Tren de ida" : "Tren de retorno";
    const price = train ? getTrainTotal(train) : 0;
    container.innerHTML = `
      <div>
        <span>${label}</span>
        <strong>${escapeHtml(train ? `${train.companyName || train.company} · ${train.serviceName}` : "Sin selección")}</strong>
        <p>${escapeHtml(train ? `${train.departureStation} ${train.departureTime} → ${train.arrivalStation} ${train.arrivalTime}` : "Elige una opción de tren para completar la cotización.")}</p>
        ${train?.isLocalTrain ? `<small>Tren local referencial: requiere compra presencial con DNI.</small>` : ""}
        ${train ? `<small>${money(price)}</small>` : ""}
      </div>
      <button type="button" class="btn quote-secondary-btn" data-train-direction="${direction}">
        <i class="fas fa-train"></i> ${train ? "Cambiar tren" : "Elegir tren"}
      </button>
    `;
  }

  function getTrainTotal(train) {
    if (!train) return 0;
    const adult = getTrainPriceUSD(train, "adult") * state.adults;
    const child = getTrainPriceUSD(train, "child") * state.children;
    return convert(adult + child, "USD", state.currency);
  }

  function openTrainModal(direction) {
    state.activeTrainDirection = getTrainDirection(direction);
    state.pendingTrainCode = state.selectedTrains[state.activeTrainDirection]?.code || null;
    const modal = $("#trainSelectionModal");
    const title = $("#trainSelectionModalTitle");
    const intro = $("#trainSelectionModalIntro");
    const list = $("#trainSelectionModalList");
    if (!modal || !list) return;

    const label = state.activeTrainDirection === "outbound" ? "ida a Machu Picchu" : "retorno desde Machu Picchu";
    if (title) title.textContent = `Elige tren de ${label}`;
    if (intro) intro.textContent = state.nationality === "national"
      ? "Mostramos trenes turísticos y tren local referencial para peruanos, sujeto a disponibilidad presencial."
      : "Mostramos solo trenes turísticos compatibles con tu nacionalidad y ruta.";

    const options = getTrainOptions(state.activeTrainDirection);
    if (!options.length) {
      list.innerHTML = `
        <div class="quote-empty-state">
          <strong>No hay trenes compatibles para esta ruta.</strong>
          <p>Cambia la ruta seleccionada o consúltanos para revisar disponibilidad manualmente.</p>
        </div>
      `;
    } else {
      list.innerHTML = options.map((train) => {
        const selected = train.code === state.pendingTrainCode;
        const price = getTrainTotal(train);
        return `
          <button type="button" class="quote-modal-card ${selected ? "is-selected" : ""}" data-train-code="${escapeHtml(train.code)}">
            <span>${escapeHtml(train.companyName || train.company || "Tren")}${train.isLocalTrain ? " · Local" : ""}</span>
            <strong>${escapeHtml(train.serviceName || train.category || train.code)}</strong>
            <p>${escapeHtml(`${train.departureStation} ${train.departureTime} → ${train.arrivalStation} ${train.arrivalTime}`)}</p>
            <em>${train.isLocalTrain ? "Precio local referencial / por confirmar" : money(price)}</em>
            ${train.notes ? `<small>${escapeHtml(train.notes)}</small>` : ""}
          </button>
        `;
      }).join("");
    }

    modal.hidden = false;
  }

  function confirmTrainSelection() {
    const direction = state.activeTrainDirection;
    if (!direction) return;
    const train = toArray(state.data.trains?.trains).find((item) => item.code === state.pendingTrainCode);
    if (!train) return;
    state.selectedTrains[direction] = train;
    if (direction === "outbound") {
      const returnTrain = state.selectedTrains.return;
      const config = getTrainSelectionConfig();
      const sameRequired = config?.returnOptionsRule === "same_company_as_outbound";
      if (sameRequired && returnTrain && !returnTrain.isLocalTrain && !train.isLocalTrain && normalizeText(returnTrain.operatorKey || returnTrain.company) !== normalizeText(train.operatorKey || train.company)) {
        state.selectedTrains.return = null;
      }
    }
    closeModals();
    renderTrainSelectors();
    updateSummary();
    updatePrintableTemplate();
  }

  function openTrainDetails(trainCode) {
    const train = toArray(state.data.trains?.trains).find((item) => item.code === trainCode);
    const modal = $("#trainDetailsModal");
    const content = $("#trainDetailsModalContent");
    if (!modal || !content || !train) return;
    $("#trainDetailsModalTitle").textContent = train.serviceName || train.code;
    content.innerHTML = `
      <p><strong>Empresa:</strong> ${escapeHtml(train.companyName || train.company)}</p>
      <p><strong>Ruta:</strong> ${escapeHtml(train.departureStation)} ${escapeHtml(train.departureTime)} → ${escapeHtml(train.arrivalStation)} ${escapeHtml(train.arrivalTime)}</p>
      <p><strong>Categoría:</strong> ${escapeHtml(train.category || "")}</p>
      <p>${escapeHtml(train.notes || "Tarifa referencial sujeta a disponibilidad.")}</p>
    `;
    modal.hidden = false;
  }

  function getExtraPriceUSD(extra) {
    if (!extra) return 0;
    if (Number.isFinite(Number(extra.publishedPriceUSD))) return Number(extra.publishedPriceUSD);
    if (Number.isFinite(Number(extra.costUSD))) return Number(extra.costUSD);
    const byNationality = extra.costByNationality?.[state.nationality];
    if (byNationality) {
      if (Number.isFinite(Number(byNationality.amountUSD))) return Number(byNationality.amountUSD);
      if (Number.isFinite(Number(byNationality.amountPEN))) return convert(Number(byNationality.amountPEN), "PEN", "USD");
      if (Number.isFinite(Number(byNationality.adultPEN))) return convert(Number(byNationality.adultPEN), "PEN", "USD");
    }
    return 0;
  }

  function getAvailableExtras() {
    const option = getSelectedOption();
    if (!option) return [];
    const seen = new Set();
    const extras = [];
    getOptionTours(option).forEach((tour) => {
      toArray(tour.extras).forEach((extra) => {
        const code = extra.code || `${tour.internalCode}-${extra.label}`;
        if (seen.has(code)) return;
        seen.add(code);
        extras.push({ ...extra, code, tourTitle: tour.title, tourCode: tour.internalCode });
      });
    });
    return extras;
  }

  function getExtraTotal(extra) {
    const priceUSD = getExtraPriceUSD(extra);
    const multiplier = extra.perPerson === false ? 1 : getPassengerCount();
    return convert(priceUSD * multiplier, "USD", state.currency);
  }

  function renderExtras() {
    const section = $("#extrasSection");
    const target = $("#extrasContainer");
    if (!section || !target) return;
    const extras = getAvailableExtras().filter((extra) => extra.optional !== false || extra.required !== true);
    if (!getSelectedOption() || !extras.length) {
      section.hidden = true;
      target.innerHTML = "";
      return;
    }
    section.hidden = false;
    target.innerHTML = extras.map((extra) => {
      const checked = state.selectedExtras.has(extra.code);
      return `
        <label class="quote-extra-card ${checked ? "is-selected" : ""}">
          <input type="checkbox" value="${escapeHtml(extra.code)}" ${checked ? "checked" : ""}>
          <span>
            <strong>${escapeHtml(extra.label || "Extra")}</strong>
            <small>${escapeHtml(extra.tourTitle || "Servicio adicional")}</small>
          </span>
          <em>${money(getExtraTotal(extra))}</em>
        </label>
      `;
    }).join("");
  }

  function getBaseTotals() {
    const option = getSelectedOption();
    if (!option) return { adult: 0, child: 0, total: 0 };
    const adultUSD = getOptionBaseAdult(option) * state.adults;
    const childUSD = getOptionBaseChild(option) * state.children;
    return {
      adult: convert(adultUSD, "USD", state.currency),
      child: convert(childUSD, "USD", state.currency),
      total: convert(adultUSD + childUSD, "USD", state.currency)
    };
  }

  function getHotelTotal() {
    return Object.values(state.selectedHotels).reduce((sum, option) => sum + convert(option?.priceUSD || 0, "USD", state.currency), 0);
  }

  function getTrainsTotal() {
    return getTrainTotal(state.selectedTrains.outbound) + getTrainTotal(state.selectedTrains.return);
  }

  function getExtrasTotal() {
    const extras = getAvailableExtras();
    return extras
      .filter((extra) => state.selectedExtras.has(extra.code))
      .reduce((sum, extra) => sum + getExtraTotal(extra), 0);
  }

  function getSubtotalBeforeDiscount() {
    return getBaseTotals().total + getHotelTotal() + getTrainsTotal() + getExtrasTotal();
  }

  function getManualDiscountAmount(subtotal) {
    const discount = state.manualDiscount;
    if (!discount) return 0;
    if (discount.type === "percent") return subtotal * (Number(discount.value || 0) / 100);
    if (discount.type === "fixed") return convert(Number(discount.value || 0), discount.currency || state.currency, state.currency);
    return 0;
  }

  function getPaymentMode() {
    return $("#paymentMode")?.value || "full";
  }

  function getPaymentBreakdown() {
    const subtotal = getSubtotalBeforeDiscount();
    const manualDiscount = Math.min(subtotal, getManualDiscountAmount(subtotal));
    const fullDiscount = getPaymentMode() === "full" && !state.manualDiscount ? subtotal * 0.05 : 0;
    const discount = Math.min(subtotal, manualDiscount + fullDiscount);
    const total = Math.max(0, subtotal - discount);
    const advance = getPaymentMode() === "partial" ? Math.min(total, convert(49.9 * getPassengerCount(), "USD", state.currency)) : total;
    const balance = Math.max(0, total - advance);
    return { subtotal, manualDiscount, fullDiscount, discount, total, advance, balance };
  }

  function updateSummary() {
    ensureQuoteReference();
    const bases = getBaseTotals();
    const hotelTotal = getHotelTotal();
    const trainTotal = getTrainsTotal();
    const extrasTotal = getExtrasTotal();
    const payment = getPaymentBreakdown();

    setText("#adultSummaryLabel", `Adultos x${state.adults}`);
    setText("#adultSummaryTotal", money(bases.adult));
    setText("#childrenSummaryLabel", `Niños x${state.children}`);
    setText("#childrenSummaryTotal", money(bases.child));
    toggleRow("#childrenSummaryRow", state.children > 0);

    setText("#hotelSummaryTotal", money(hotelTotal));
    toggleRow("#hotelSummaryRow", hotelTotal > 0);
    setText("#trainSummaryTotal", money(trainTotal));
    toggleRow("#trainSummaryRow", trainTotal > 0);
    setText("#extrasSummaryTotal", money(extrasTotal));
    toggleRow("#extrasSummaryRow", extrasTotal > 0);
    setText("#discountSummaryTotal", `- ${money(payment.discount)}`);
    toggleRow("#discountSummaryRow", payment.discount > 0);
    setText("#quoteGrandTotal", money(payment.total));
    setText("#advanceSummaryTotal", money(payment.advance));
    setText("#balanceSummaryTotal", money(payment.balance));
    toggleRow("#balanceSummaryRow", payment.balance > 0);

    const info = $("#paymentInfoText");
    if (info) {
      if (!getSelectedOption()) info.textContent = "Selecciona fechas e itinerario para generar la cotización.";
      else if (getTrainSelectionConfig() && (!state.selectedTrains.outbound || !state.selectedTrains.return)) info.textContent = "Elige tren de ida y retorno para completar la cotización final.";
      else info.textContent = `Cotización referencial generada. Total: ${money(payment.total)}.`;
    }
  }

  function setText(selector, text) {
    const el = $(selector);
    if (el) el.textContent = text;
  }

  function toggleRow(selector, visible) {
    const el = $(selector);
    if (el) el.hidden = !visible;
  }

  function applyManualDiscountCode() {
    const input = $("#discountCodeInput");
    const message = $("#discountCodeMessage");
    const code = String(input?.value || "").trim().toUpperCase();
    if (!code) {
      state.manualDiscount = null;
      if (message) message.textContent = "Ingresa tu código promocional si tienes uno.";
      updateSummary();
      updatePrintableTemplate();
      return;
    }
    const found = toArray(state.data.discounts).find((item) => String(item.code || "").toUpperCase() === code);
    if (!found || !found.active) {
      state.manualDiscount = null;
      if (message) message.textContent = "Código no válido o inactivo.";
      updateSummary();
      updatePrintableTemplate();
      return;
    }
    state.manualDiscount = found;
    if (message) message.textContent = `${found.label || "Descuento aplicado"}.`;
    updateSummary();
    updatePrintableTemplate();
  }

  function updatePrintableTemplate() {
    const option = getSelectedOption();
    const payment = getPaymentBreakdown();
    const ref = $("#quoteReference")?.textContent || "COT-PE---";
    const today = new Date();
    const validUntil = addDays(today, 3);

    setText("#printQuoteReference", ref);
    setText("#printIssueDate", formatDateShort(today));
    setText("#printValidUntil", formatDateShort(validUntil));
    setText("#printClientName", $("#clientName")?.value || "Por completar");
    setText("#printClientPhone", $("#clientPhone")?.value || "Por completar");
    setText("#printClientEmail", $("#clientEmail")?.value || "Por completar");
    setText("#printClientDocument", $("#clientDocument")?.value || "Por completar");
    setText("#printClientNotes", $("#clientNotes")?.value || "Sin comentarios adicionales");
    setText("#printTravelDates", getTravelRangeLabel());
    setText("#printTravelDuration", state.dates.days ? `${state.dates.days} días / ${state.dates.nights} noches` : "Por completar");
    setText("#printPassengerSummary", `${state.adults} adulto(s), ${state.children} niño(s)`);
    setText("#printNationality", getNationalityLabel());
    setText("#printArrivalTime", state.arrivalTime || "Por completar");
    setText("#printDepartureTime", state.departureTime || "Por completar");

    const couponBox = $("#printCouponBox");
    if (couponBox) couponBox.hidden = !state.manualDiscount;
    setText("#printCouponCode", state.manualDiscount?.code || "MCT-XXXX");
    setText("#printCouponDiscount", state.manualDiscount?.type === "percent" ? `${state.manualDiscount.value}%` : money(convert(state.manualDiscount?.value || 0, state.manualDiscount?.currency || state.currency, state.currency)));

    const services = $("#printSelectedServices");
    if (services) {
      const hotelItems = Object.values(state.selectedHotels).filter((item) => item?.type === "hotel");
      const trainItems = [state.selectedTrains.outbound, state.selectedTrains.return].filter(Boolean);
      services.innerHTML = `
        <div class="print-service-list">
          ${option ? `<p><strong>Paquete:</strong> ${escapeHtml(option.rawCard?.recommendedTitle || option.title || "Paquete dinámico")}</p>` : ""}
          ${getOptionTours(option).map((tour) => `<p><strong>${escapeHtml(tour.internalCode || "Servicio")}:</strong> ${escapeHtml(tour.title || "")}</p>`).join("")}
          ${hotelItems.map((item) => `<p><strong>Hotel ${escapeHtml(item.destination)}:</strong> ${escapeHtml(item.label)} · ${escapeHtml(item.room?.label || "Habitación")} · ${item.nights} noche(s)</p>`).join("")}
          ${trainItems.map((train) => `<p><strong>Tren:</strong> ${escapeHtml(train.companyName || train.company)} · ${escapeHtml(train.serviceName)} · ${escapeHtml(train.departureTime)} ${escapeHtml(train.departureStation)} → ${escapeHtml(train.arrivalTime)} ${escapeHtml(train.arrivalStation)}</p>`).join("")}
        </div>
      `;
    }

    const paymentTarget = $("#printPaymentDetails");
    if (paymentTarget) {
      paymentTarget.innerHTML = `
        <div class="print-payment-grid">
          <p><strong>Subtotal:</strong> ${money(payment.subtotal)}</p>
          <p><strong>Descuento:</strong> - ${money(payment.discount)}</p>
          <p><strong>Total:</strong> ${money(payment.total)}</p>
          <p><strong>Pagarás ahora:</strong> ${money(payment.advance)}</p>
          ${payment.balance > 0 ? `<p><strong>Saldo pendiente:</strong> ${money(payment.balance)}</p>` : ""}
        </div>
      `;
    }

    const printItinerary = $("#printItinerary");
    if (printItinerary) {
      printItinerary.innerHTML = buildItineraryItems(option).map((item) => `
        <div class="print-itinerary-item">
          <strong>Día ${item.displayDay} · ${escapeHtml(formatDate(item.date))}</strong>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.description)}</p>
        </div>
      `).join("");
    }

    const offer = $("#printBookingOffer");
    if (offer) offer.hidden = !option;
    setText("#printBookingOfferAmount", money(payment.total));
    setText("#printBookingOfferUntil", formatDateShort(validUntil));
  }

  function getNationalityLabel() {
    const select = $("#nationality");
    return select?.selectedOptions?.[0]?.textContent || "Por completar";
  }

  function clearDependentSections() {
    ["#hotelSection", "#trainSection", "#extrasSection"].forEach((selector) => {
      const el = $(selector);
      if (el) el.hidden = true;
    });
    ["#hotelSelectorsContainer", "#extrasContainer", "#itineraryOptions", "#itineraryPreview"].forEach((selector) => {
      const el = $(selector);
      if (el) el.innerHTML = "";
    });
  }

  function closeModals() {
    $$(".quote-modal").forEach((modal) => { modal.hidden = true; });
    state.activeHotelDestination = null;
    state.pendingHotelKey = null;
    state.activeTrainDirection = null;
    state.pendingTrainCode = null;
  }

  function buildWhatsAppText() {
    const option = getSelectedOption();
    const payment = getPaymentBreakdown();
    const lines = [
      "Hola My Cusco Trip, quiero continuar con esta cotización:",
      `Código: ${$("#quoteReference")?.textContent || "COT-PE---"}`,
      `Fechas: ${getTravelRangeLabel()}`,
      `Duración: ${state.dates.days || "--"}D/${state.dates.nights || "--"}N`,
      `Pasajeros: ${state.adults} adulto(s), ${state.children} niño(s)`,
      `Itinerario: ${option?.rawCard?.recommendedTitle || option?.title || "Por definir"}`,
      `Total referencial: ${money(payment.total)}`
    ];
    return `https://wa.me/51900608980?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function continuePayment() {
    updatePrintableTemplate();
    window.open(buildWhatsAppText(), "_blank", "noopener");
  }

  function printQuote() {
    updatePrintableTemplate();
    window.print();
  }

  function savePdf() {
    updatePrintableTemplate();
    const element = $("#printQuotation");
    const ref = $("#quoteReference")?.textContent || "cotizacion-mycuscotrip";
    if (window.html2pdf && element) {
      const previousHidden = element.hidden;
      element.hidden = false;
      window.html2pdf().set({
        margin: [8, 8, 8, 8],
        filename: `${ref}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      }).from(element).save().finally(() => { element.hidden = previousHidden; });
    } else {
      window.print();
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const optionBtn = event.target.closest("[data-option-index]");
      if (optionBtn) selectPackageOption(Number(optionBtn.dataset.optionIndex));

      const hotelBtn = event.target.closest("[data-open-hotel]");
      if (hotelBtn) openHotelModal(hotelBtn.dataset.openHotel);

      const hotelCard = event.target.closest("[data-hotel-key]");
      if (hotelCard) {
        state.pendingHotelKey = hotelCard.dataset.hotelKey;
        $$("#hotelModal [data-hotel-key]").forEach((card) => card.classList.toggle("is-selected", card === hotelCard));
      }

      const trainBtn = event.target.closest("[data-train-direction]");
      if (trainBtn) openTrainModal(trainBtn.dataset.trainDirection);

      const trainCard = event.target.closest("[data-train-code]");
      if (trainCard) {
        state.pendingTrainCode = trainCard.dataset.trainCode;
        $$("#trainSelectionModal [data-train-code]").forEach((card) => card.classList.toggle("is-selected", card === trainCard));
      }

      if (event.target.closest("[data-close-modal]")) closeModals();
    });

    $("#confirmHotelSelectionBtn")?.addEventListener("click", confirmHotelSelection);
    $("#confirmTrainSelectionBtn")?.addEventListener("click", confirmTrainSelection);
    $("#applyDiscountCodeBtn")?.addEventListener("click", applyManualDiscountCode);
    $("#printQuoteBtn")?.addEventListener("click", printQuote);
    $("#savePdfBtn")?.addEventListener("click", savePdf);
    $("#continuePaymentBtn")?.addEventListener("click", continuePayment);

    $("#nationality")?.addEventListener("change", (event) => {
      state.nationality = event.target.value || "national";
      applyCurrencyRulesByNationality();
      state.selectedTrains = { outbound: null, return: null };
      renderTrainSelectors();
      renderExtras();
      updateSummary();
      updatePrintableTemplate();
    });

    $("#quoteCurrency")?.addEventListener("change", (event) => {
      state.currency = event.target.value || "USD";
      renderPackageOptions();
      renderHotelSelectors();
      renderTrainSelectors();
      renderExtras();
      updateSummary();
      updatePrintableTemplate();
    });

    $("#paymentMode")?.addEventListener("change", () => {
      updateSummary();
      updatePrintableTemplate();
    });

    $$(".quote-qty-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.target;
        const delta = button.dataset.action === "plus" ? 1 : -1;
        if (target === "adults") state.adults = clampNumber(state.adults + delta, 1, 30);
        if (target === "children") state.children = clampNumber(state.children + delta, 0, 30);
        setText("#adultsCount", state.adults);
        setText("#childrenCount", state.children);
        state.selectedHotels = {};
        renderHotelSelectors();
        renderExtras();
        updateSummary();
        updatePrintableTemplate();
      });
    });

    document.addEventListener("change", (event) => {
      const extraInput = event.target.closest("#extrasContainer input[type='checkbox']");
      if (extraInput) {
        if (extraInput.checked) state.selectedExtras.add(extraInput.value);
        else state.selectedExtras.delete(extraInput.value);
        renderExtras();
        updateSummary();
        updatePrintableTemplate();
      }
    });

    ["#clientName", "#clientPhone", "#clientEmail", "#clientDocument", "#clientNotes"].forEach((selector) => {
      $(selector)?.addEventListener("input", updatePrintableTemplate);
    });
  }

  async function init() {
    ensureQuoteReference();
    setText("#adultsCount", state.adults);
    setText("#childrenCount", state.children);
    initPickers();
    bindEvents();
    await loadData();
    applyCurrencyRulesByNationality();
    updateSummary();
    updatePrintableTemplate();
    console.info("[quote-packages] Cotizador dinámico restaurado.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
