class MyCuscoTripQuotePackages {
  constructor() {
    this.basePath = window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";

    this.packagesData = { packages: [], paymentOptions: {} };
    this.trainsData = { routes: {}, trainCategories: {}, exchangeRate: {} };
    this.hotelsData = { destinations: {} };

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

    this.exchangeRate = 3.75;

    this.selectedHotelsByDestination = {};
    this.selectedCombinationsByDestination = {};
    this.activeHotelModalDestination = null;

    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";
    this.selectedExtras = new Set();

    this.quoteReference = this.generateReference();

    this.init();
  }

  async init() {
    try {
      await this.loadAllData();
      this.bindBaseEvents();
      this.initDatePicker();
      this.updateReferenceUI();
      this.updatePassengersUI();
      this.updateExchangeRateHelp();
      this.renderInitialState();
      this.updatePricing();
    } catch (error) {
      console.error("Error inicializando cotizador:", error);
      alert("No se pudo cargar el cotizador. Revisa que existan packages-peru.json, trains.json y hotels.json.");
    }
  }

  async loadAllData() {
    const [packagesData, trainsData, hotelsData] = await Promise.all([
      this.fetchJson("assets/data/packages-peru.json"),
      this.fetchJson("assets/data/trains.json"),
      this.fetchJson("assets/data/hotels.json")
    ]);

    this.packagesData = packagesData || { packages: [], paymentOptions: {} };
    this.trainsData = trainsData || { routes: {}, trainCategories: {}, exchangeRate: {} };
    this.hotelsData = hotelsData || { destinations: {} };

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
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });

    document.getElementById("nationality")?.addEventListener("change", (event) => {
      this.nationality = event.target.value;
      this.selectedOutboundTrainCode = "";
      this.selectedReturnTrainCode = "";
      this.renderTrainOptions();
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("quoteCurrency")?.addEventListener("change", (event) => {
      this.quoteCurrency = event.target.value;
      this.updateExchangeRateHelp();
      this.renderPackageOptions();
      this.renderAccommodationOptions();
      this.renderTrainOptions();
      this.renderExtras();
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("paymentMode")?.addEventListener("change", (event) => {
      this.paymentMode = event.target.value;
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("printQuoteBtn")?.addEventListener("click", () => {
      this.updatePrintQuotation();
      window.print();
    });

    document.getElementById("emailQuoteBtn")?.addEventListener("click", () => {
      this.sendQuoteEmail();
    });

    ["clientName", "clientPhone", "clientEmail", "clientDocument", "clientNotes"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => this.updatePrintQuotation());
    });

    this.bindHotelModalEvents();
    this.bindTrainModalEvents();
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
      onReady: (_, __, instance) => {
        if (instance.altInput) {
          instance.altInput.setAttribute("readonly", "readonly");
        }
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

          this.renderPackageOptions();
          this.updatePricing();
          this.updatePrintQuotation();
        }
      }
    });
  }

  renderInitialState() {
    this.renderPackageOptions();
    this.hideSection("itinerarySection");
    this.hideSection("hotelSection");
    this.hideSection("trainSection");
    this.hideSection("extrasSection");
  }

  renderPackageOptions() {
    const target = document.getElementById("packageOptions");
    if (!target) return;

    if (!this.travelDays || !this.travelNights) {
      target.innerHTML = `<div class="quote-empty-state">Selecciona tus fechas de viaje para ver paquetes disponibles.</div>`;
      return;
    }

    const compatible = this.packages.filter((pkg) => {
      return Number(pkg.days) === this.travelDays && Number(pkg.nights) === this.travelNights;
    });

    if (!compatible.length) {
      target.innerHTML = `
        <div class="quote-empty-state">
          No tenemos un paquete configurado para ${this.travelDays} días / ${this.travelNights} noches.
          Puedes ajustar las fechas o crear una versión personalizada.
        </div>
      `;
      return;
    }

    target.innerHTML = compatible.map((pkg) => {
      const isSelected = this.selectedPackage?.id === pkg.id;
      const adultPrice = this.convertMoney(Number(pkg.basePricing?.adult || 0), pkg.currency || "PEN", this.quoteCurrency);
      const childPrice = this.convertMoney(Number(pkg.basePricing?.child || pkg.basePricing?.adult || 0), pkg.currency || "PEN", this.quoteCurrency);

      return `
        <article class="quote-package-card ${isSelected ? "is-selected" : ""}" data-package-id="${this.escapeHtml(pkg.id)}">
          <div class="quote-package-card__top">
            <div>
              <h3>${this.escapeHtml(pkg.title)}</h3>
              <p>${this.escapeHtml(pkg.shortDescription || pkg.description || "")}</p>
            </div>
            <span class="quote-badge">${this.escapeHtml(pkg.typeLabel || "")}</span>
          </div>
          <p>
            <strong>Desde ${this.formatCurrency(adultPrice, this.quoteCurrency)} por adulto</strong>
            ${this.children > 0 ? ` · Niño ${this.formatCurrency(childPrice, this.quoteCurrency)}` : ""}
          </p>
          <p>Precio base sin tren ni alojamiento.</p>
        </article>
      `;
    }).join("");

    target.querySelectorAll(".quote-package-card").forEach((card) => {
      card.addEventListener("click", () => {
        const packageId = card.dataset.packageId;
        const pkg = compatible.find((item) => item.id === packageId);

        if (!pkg) return;

        this.selectPackage(pkg);
      });
    });

    if (compatible.length === 1 && !this.selectedPackage) {
      this.selectPackage(compatible[0]);
    }
  }

  selectPackage(pkg) {
    this.selectedPackage = pkg;
    this.selectedItineraryOption =
      Array.isArray(pkg.itineraryOptions) && pkg.itineraryOptions.length
        ? pkg.itineraryOptions.find((item) => item.recommended) || pkg.itineraryOptions[0]
        : null;

    this.selectedHotelsByDestination = {};
    this.selectedCombinationsByDestination = {};
    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";
    this.selectedExtras.clear();

    this.renderPackageOptions();
    this.renderItineraryOptions();
    this.refreshAccommodationSelections();
    this.renderTrainOptions();
    this.renderExtras();
    this.updatePricing();
    this.updatePrintQuotation();

    this.showSection("itinerarySection");
    this.showSection("hotelSection");
    this.showSection("trainSection");

    if (Array.isArray(pkg.extras) && pkg.extras.length) {
      this.showSection("extrasSection");
    } else {
      this.hideSection("extrasSection");
    }
  }

  renderItineraryOptions() {
    const section = document.getElementById("itinerarySection");
    const target = document.getElementById("itineraryOptions");
    const preview = document.getElementById("itineraryPreview");

    if (!section || !target || !preview || !this.selectedPackage) return;

    const options = this.selectedPackage.itineraryOptions || [];

    if (!options.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    target.innerHTML = options.map((option) => {
      const isSelected = this.selectedItineraryOption?.code === option.code;

      return `
        <article class="quote-itinerary-option ${isSelected ? "is-selected" : ""}" data-itinerary-code="${this.escapeHtml(option.code)}">
          <h3>${this.escapeHtml(option.label)}</h3>
          <p>${this.escapeHtml(option.summary || "")}</p>
          ${option.recommended ? `<span class="quote-badge quote-badge--gold">Recomendado</span>` : ""}
        </article>
      `;
    }).join("");

    target.querySelectorAll(".quote-itinerary-option").forEach((card) => {
      card.addEventListener("click", () => {
        const code = card.dataset.itineraryCode;
        this.selectedItineraryOption = options.find((item) => item.code === code) || options[0];
        this.renderItineraryOptions();
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

    preview.innerHTML = itinerary.map((item) => `
      <div class="quote-itinerary-item">
        <h4>${this.escapeHtml(item.title || `Día ${item.day || ""}`)}</h4>
        <p>${this.escapeHtml(item.description || "")}</p>
      </div>
    `).join("");
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

      return `
        <div class="quote-accommodation-card">
          <div class="quote-accommodation-card__header">
            <strong>${this.escapeHtml(destinationLabel)}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="quote-accommodation-card__body">
            <p>
              ${selection?.hotel
                ? `${this.escapeHtml(selection.hotel.hotelName)}${selection.hotel.stars > 0 ? ` · ${selection.hotel.stars}★` : ""}`
                : "Sin hotel seleccionado"}
            </p>
            <p>${selection?.combination ? this.escapeHtml(selection.combination.label) : "Acomodación por confirmar"}</p>
            <p class="quote-accommodation-card__price">
              + ${this.formatCurrency(additional, this.quoteCurrency)} por estadía
            </p>
            <button type="button" class="btn quote-secondary-btn open-hotel-modal-btn" data-destination="${this.escapeHtml(item.destination)}">
              ${hasSelection ? "Cambiar hotel" : "Elegir hotel"}
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".open-hotel-modal-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.openHotelModal(button.dataset.destination);
      });
    });
  }

  refreshAccommodationSelections() {
    if (!this.selectedPackage) return;

    const summary = this.getAccommodationSummary();
    const passengers = this.getTotalPassengers();

    summary.forEach((item) => {
      const hotels = this.getHotelsByDestination(item.destination);
      const allHotels = [
        this.getNoHotelOption(item.destination),
        ...hotels
      ];

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

    const destinationLabel = this.getDestinationLabel(destination);
    const summaryItem = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summaryItem?.nights || 0);
    const passengers = this.getTotalPassengers();

    title.textContent = `Elige tu hotel en ${destinationLabel}`;
    subtitle.textContent = `Compara opciones para ${nights} noche${nights !== 1 ? "s" : ""} y ${passengers} pasajero${passengers !== 1 ? "s" : ""}.`;

    const hotels = [
      this.getNoHotelOption(destination),
      ...this.getHotelsByDestination(destination)
    ];

    list.innerHTML = hotels.map((hotel) => {
      const combinations = this.generateAccommodationCombinations(hotel.rooms || [], passengers, nights);
      const selectedHotelCode = this.selectedHotelsByDestination[destination];
      const selectedComboKey = this.selectedCombinationsByDestination[destination]?.key || "";
      const isSelectedHotel = selectedHotelCode === hotel.hotelCode;
      const initialCombo =
        combinations.find((combo) => isSelectedHotel && combo.key === selectedComboKey) ||
        combinations[0] ||
        null;

      const images = [...new Set([
        ...(hotel.images?.cover ? [hotel.images.cover] : []),
        ...(Array.isArray(hotel.images?.gallery) ? hotel.images.gallery : [])
      ])];

      const firstPrice = combinations[0]
        ? this.convertMoney(Number(combinations[0].totalForStay || 0), "USD", this.quoteCurrency)
        : 0;

      return `
        <article
          class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""} ${hotel.hotelCode === "no-hotel" ? "hotel-option-card--no-hotel" : ""}"
          data-destination="${this.escapeHtml(destination)}"
          data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
          data-selected-combo-key="${this.escapeHtml(initialCombo?.key || "")}"
        >
          <div class="hotel-option-card__header">
            <div>
              <h3>${this.escapeHtml(hotel.hotelName)}</h3>
              ${hotel.hotelCode === "no-hotel"
                ? `<p>Opción sin alojamiento. El costo de hotel será 0.</p>`
                : `<p>${hotel.stars || 0}★ · ${this.escapeHtml(hotel.location || destinationLabel)}</p>`}
              ${hotel.address ? `<p>${this.escapeHtml(hotel.address)}</p>` : ""}
            </div>
            <div class="hotel-option-card__badge">
              ${hotel.hotelCode === "no-hotel" ? "S/ 0.00" : `Desde ${this.formatCurrency(firstPrice, this.quoteCurrency)}`}
            </div>
          </div>

          <div class="hotel-option-card__content ${hotel.hotelCode === "no-hotel" ? "hotel-option-card__content--no-hotel" : ""}">
            ${hotel.hotelCode === "no-hotel" ? "" : `
              <div class="hotel-option-card__media">
                ${this.renderHotelGallery(images, hotel.hotelName)}
                <div class="hotel-option-card__meta">
                  ${hotel.amenities?.checkin ? `<span>Check-in: ${this.escapeHtml(hotel.amenities.checkin)}</span>` : ""}
                  ${hotel.amenities?.checkout ? `<span>Check-out: ${this.escapeHtml(hotel.amenities.checkout)}</span>` : ""}
                  ${hotel.amenities?.breakfast ? `<span>Desayuno: ${this.escapeHtml(hotel.amenities.breakfast)}</span>` : ""}
                </div>
              </div>
            `}

            <div class="hotel-option-card__body">
              ${hotel.hotelCode === "no-hotel" ? "" : `<label>Selecciona acomodación</label>`}
              <div class="hotel-option-card__options">
                ${combinations.length ? combinations.map((combo) => {
                  const totalStay = this.convertMoney(Number(combo.totalForStay || 0), "USD", this.quoteCurrency);
                  const perPerson = passengers > 0 ? totalStay / passengers : 0;

                  return `
                    <button
                      type="button"
                      class="hotel-combo-btn ${isSelectedHotel && selectedComboKey === combo.key ? "is-selected" : ""}"
                      data-destination="${this.escapeHtml(destination)}"
                      data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
                      data-combo-key="${this.escapeHtml(combo.key)}"
                    >
                      <span class="hotel-combo-radio" aria-hidden="true"></span>
                      <span class="hotel-combo-btn__main">${this.escapeHtml(combo.label)}</span>
                      <span class="hotel-combo-btn__sub">
                        ${hotel.hotelCode === "no-hotel"
                          ? "No se agregará costo de alojamiento."
                          : `${combo.totalRooms} hab. · Total estadía ${this.formatCurrency(totalStay, this.quoteCurrency)} · ${this.formatCurrency(perPerson, this.quoteCurrency)} por persona`}
                      </span>
                    </button>
                  `;
                }).join("") : `<p>No hay acomodaciones válidas para ${passengers} pasajero${passengers !== 1 ? "s" : ""}.</p>`}
              </div>

              <button type="button" class="btn quote-main-btn confirm-hotel-selection-btn">
                Seleccionar hotel y acomodación
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    this.bindHotelModalSelectionEvents();
    this.bindHotelGalleryEvents();

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  bindHotelModalEvents() {
    const modal = document.getElementById("hotelSelectionModal");
    const closeBtn = document.getElementById("closeHotelModalBtn");
    const cancelBtn = document.getElementById("cancelHotelModalBtn");

    closeBtn?.addEventListener("click", () => this.closeHotelModal());
    cancelBtn?.addEventListener("click", () => this.closeHotelModal());

    modal?.querySelectorAll("[data-close-hotel-modal]").forEach((el) => {
      el.addEventListener("click", () => this.closeHotelModal());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.hidden) {
        this.closeHotelModal();
      }
    });
  }

  bindHotelModalSelectionEvents() {
    document.querySelectorAll(".hotel-combo-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".hotel-option-card");
        if (!card) return;

        card.dataset.selectedComboKey = button.dataset.comboKey || "";

        card.querySelectorAll(".hotel-combo-btn").forEach((btn) => {
          btn.classList.toggle("is-selected", btn.dataset.comboKey === button.dataset.comboKey);
        });
      });
    });

    document.querySelectorAll(".confirm-hotel-selection-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".hotel-option-card");
        if (!card) return;

        const destination = card.dataset.destination;
        const hotelCode = card.dataset.hotelCode;
        const comboKey = card.dataset.selectedComboKey || "";

        if (!destination || !hotelCode || !comboKey) return;

        const hotel =
          hotelCode === "no-hotel"
            ? this.getNoHotelOption(destination)
            : this.getHotelByCode(destination, hotelCode);

        const summaryItem = this.getAccommodationSummary().find((item) => item.destination === destination);
        const combinations = this.generateAccommodationCombinations(
          hotel?.rooms || [],
          this.getTotalPassengers(),
          Number(summaryItem?.nights || 0)
        );

        const combo = combinations.find((item) => item.key === comboKey);

        if (!hotel || !combo) return;

        this.selectedHotelsByDestination[destination] = hotelCode;
        this.selectedCombinationsByDestination[destination] = combo;

        this.renderAccommodationOptions();
        this.updatePricing();
        this.updatePrintQuotation();
        this.closeHotelModal();
      });
    });
  }

  closeHotelModal() {
    const modal = document.getElementById("hotelSelectionModal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("quote-modal-open");
    this.activeHotelModalDestination = null;
  }

  renderHotelGallery(images, hotelName) {
    const finalImages = images.length ? images : ["assets/img/tours/machu-picchu-full-day/cover.jpg"];
    const json = this.escapeHtml(JSON.stringify(finalImages));

    return `
      <div class="hotel-gallery-main" data-images='${json}' data-current-image-index="0">
        <img class="hotel-gallery-main-img" src="${this.resolveAssetPath(finalImages[0])}" alt="${this.escapeHtml(hotelName)}" loading="lazy" />
        ${finalImages.length > 1 ? `
          <button type="button" class="hotel-gallery-nav hotel-gallery-prev" aria-label="Imagen anterior">‹</button>
          <button type="button" class="hotel-gallery-nav hotel-gallery-next" aria-label="Imagen siguiente">›</button>
        ` : ""}
      </div>
    `;
  }

  bindHotelGalleryEvents() {
    document.querySelectorAll(".hotel-gallery-prev, .hotel-gallery-next").forEach((button) => {
      button.addEventListener("click", () => {
        const gallery = button.closest(".hotel-gallery-main");
        const img = gallery?.querySelector(".hotel-gallery-main-img");
        if (!gallery || !img) return;

        let images = [];
        try {
          images = JSON.parse(gallery.dataset.images || "[]");
        } catch {
          images = [];
        }

        if (!images.length) return;

        const current = Number(gallery.dataset.currentImageIndex || 0);
        const next = button.classList.contains("hotel-gallery-next")
          ? (current + 1) % images.length
          : (current - 1 + images.length) % images.length;

        gallery.dataset.currentImageIndex = String(next);
        img.src = this.resolveAssetPath(images[next]);
      });
    });
  }

  renderTrainOptions() {
    const section = document.getElementById("trainSection");
    const outboundTarget = document.getElementById("outboundTrainOptions");
    const returnTarget = document.getElementById("returnTrainOptions");

    if (!section || !outboundTarget || !returnTarget) return;

    section.hidden = true;
    outboundTarget.innerHTML = "";
    returnTarget.innerHTML = "";

    if (!this.selectedPackage?.trainSelection?.required) return;

    section.hidden = false;

    const outboundRouteCode = this.selectedPackage.trainSelection.outboundRoute;
    const returnRouteCode = this.selectedPackage.trainSelection.returnRoute;

    const outboundOptions = this.getTrainOptionsForRoute(outboundRouteCode);
    const returnOptions = this.getTrainOptionsForRoute(returnRouteCode);

    outboundTarget.innerHTML = outboundOptions.length
      ? outboundOptions.map((train) => this.renderTrainCard(train, "outbound")).join("")
      : `<div class="quote-empty-state">No hay trenes de ida configurados.</div>`;

    returnTarget.innerHTML = returnOptions.length
      ? returnOptions.map((train) => this.renderTrainCard(train, "return")).join("")
      : `<div class="quote-empty-state">No hay trenes de retorno configurados.</div>`;

    this.bindTrainSelectionEvents();
    this.autoSelectRecommendedTrains(outboundOptions, returnOptions);
  }

  getTrainOptionsForRoute(routeCode) {
    const route = this.trainsData.routes?.[routeCode];
    const options = Array.isArray(route?.options) ? route.options : [];

    return options.filter((train) => {
      const allowed = Array.isArray(train.allowedNationalities) ? train.allowedNationalities : [];
      if (allowed.length && !allowed.includes(this.nationality)) return false;
      if (train.isLocalTrain && this.nationality !== "national") return false;
      return true;
    });
  }

  autoSelectRecommendedTrains(outboundOptions, returnOptions) {
    if (!this.selectedOutboundTrainCode && outboundOptions.length) {
      const recommended = outboundOptions.find((item) => item.isRecommended && !item.isLocalTrain) || outboundOptions[0];
      this.selectedOutboundTrainCode = recommended.code;
    }

    if (!this.selectedReturnTrainCode && returnOptions.length) {
      const recommended = returnOptions.find((item) => item.isRecommended && !item.isLocalTrain) || returnOptions[0];
      this.selectedReturnTrainCode = recommended.code;
    }

    this.updateTrainSelectedClasses();
  }

  renderTrainCard(train, direction) {
    const category = this.trainsData.trainCategories?.[train.categoryCode] || {};
    const price = this.convertMoney(Number(train.pricePerPerson || 0), train.currency || "USD", this.quoteCurrency);
    const regular = Number(train.regularPricePerPerson || 0) > 0
      ? this.convertMoney(Number(train.regularPricePerPerson), train.currency || "USD", this.quoteCurrency)
      : 0;

    const selectedCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;
    const isSelected = selectedCode === train.code;

    const tier = category.tier || "";
    const tierClass = tier.includes("premium") ? "quote-train-card__category--premium" : tier.includes("luxury") ? "quote-train-card__category--luxury" : "";

    return `
      <article class="quote-train-card ${isSelected ? "is-selected" : ""}" data-train-code="${this.escapeHtml(train.code)}" data-direction="${direction}">
        <div class="quote-train-card__category ${tierClass}">
          ${this.escapeHtml(category.label || train.serviceName || "Tren")}
        </div>

        <div class="quote-train-card__body">
          <div>
            <div class="quote-train-service">${this.escapeHtml(train.company || "")}</div>
            <p>${this.escapeHtml(train.serviceName || "")}</p>
            ${train.isRecommended ? `<span class="quote-badge quote-badge--gold">Recomendado</span>` : ""}
          </div>

          <div class="quote-train-time">
            <strong>${this.escapeHtml(train.departureTime || "--:--")}</strong>
            <span>${this.escapeHtml(train.origin || "Origen por confirmar")}</span>
          </div>

          <div class="quote-train-middle">
            <div class="quote-train-duration">${this.escapeHtml(train.duration || "Horario sujeto a disponibilidad")}</div>
            <div>→</div>
            <small>${this.escapeHtml(train.transferInfo || train.routeType || "")}</small>
          </div>

          <div class="quote-train-time">
            <strong>${this.escapeHtml(train.arrivalTime || "--:--")}</strong>
            <span>${this.escapeHtml(train.destination || "Destino por confirmar")}</span>
          </div>

          <div class="quote-train-price">
            <small>Por persona</small>
            <strong>${this.formatCurrency(price, this.quoteCurrency)}</strong>
            ${regular > price ? `<del>${this.formatCurrency(regular, this.quoteCurrency)}</del>` : ""}
            <div class="quote-train-actions">
              <button type="button" class="quote-small-btn select-train-btn">
                Elegir
              </button>
              <button type="button" class="quote-small-btn view-train-details-btn">
                Detalles
              </button>
            </div>
          </div>
        </div>

        ${train.isLocalTrain ? `
          <div class="quote-local-warning">
            ${this.escapeHtml(train.warning || category.importantMessage || "Tren local sujeto a disponibilidad presencial.")}
          </div>
        ` : ""}
      </article>
    `;
  }

  bindTrainSelectionEvents() {
    document.querySelectorAll(".quote-train-card").forEach((card) => {
      const trainCode = card.dataset.trainCode;
      const direction = card.dataset.direction;

      card.querySelector(".select-train-btn")?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.selectTrain(direction, trainCode);
      });

      card.addEventListener("click", () => {
        this.selectTrain(direction, trainCode);
      });

      card.querySelector(".view-train-details-btn")?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.openTrainModal(trainCode);
      });
    });
  }

  selectTrain(direction, trainCode) {
    if (direction === "outbound") this.selectedOutboundTrainCode = trainCode;
    if (direction === "return") this.selectedReturnTrainCode = trainCode;

    this.updateTrainSelectedClasses();
    this.updatePricing();
    this.updatePrintQuotation();
  }

  updateTrainSelectedClasses() {
    document.querySelectorAll(".quote-train-card").forEach((card) => {
      const direction = card.dataset.direction;
      const trainCode = card.dataset.trainCode;
      const selectedCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;

      card.classList.toggle("is-selected", trainCode === selectedCode);
    });
  }

  openTrainModal(trainCode) {
    const train = this.findTrainByCode(trainCode);
    if (!train) return;

    const category = this.trainsData.trainCategories?.[train.categoryCode] || {};
    const modal = document.getElementById("trainDetailsModal");
    const title = document.getElementById("trainModalTitle");
    const subtitle = document.getElementById("trainModalSubtitle");
    const content = document.getElementById("trainModalContent");

    if (!modal || !title || !subtitle || !content) return;

    title.textContent = category.label || train.serviceName || "Tren";
    subtitle.textContent = `${train.company || ""} · ${train.serviceName || ""}`;

    content.innerHTML = `
      <p><strong>Descripción:</strong> ${this.escapeHtml(category.shortDescription || "Servicio de tren turístico.")}</p>
      <p><strong>Ruta:</strong> ${this.escapeHtml(train.origin || "")} → ${this.escapeHtml(train.destination || "")}</p>
      <p><strong>Horario:</strong> ${this.escapeHtml(train.departureTime || "--:--")} - ${this.escapeHtml(train.arrivalTime || "--:--")}</p>
      <p><strong>Duración:</strong> ${this.escapeHtml(train.duration || "Sujeto a disponibilidad")}</p>
      ${train.isLocalTrain && category.importantMessage ? `
        <p><strong>Importante:</strong> ${this.escapeHtml(category.importantMessage)}</p>
        ${Array.isArray(category.purchaseRequirements) ? `
          <ul>
            ${category.purchaseRequirements.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
          </ul>
        ` : ""}
      ` : ""}
    `;

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  bindTrainModalEvents() {
    const modal = document.getElementById("trainDetailsModal");
    const closeBtn = document.getElementById("closeTrainModalBtn");
    const cancelBtn = document.getElementById("cancelTrainModalBtn");

    closeBtn?.addEventListener("click", () => this.closeTrainModal());
    cancelBtn?.addEventListener("click", () => this.closeTrainModal());

    modal?.querySelectorAll("[data-close-train-modal]").forEach((el) => {
      el.addEventListener("click", () => this.closeTrainModal());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.hidden) {
        this.closeTrainModal();
      }
    });
  }

  closeTrainModal() {
    const modal = document.getElementById("trainDetailsModal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("quote-modal-open");
  }

  renderExtras() {
    const section = document.getElementById("extrasSection");
    const target = document.getElementById("extrasContainer");

    if (!section || !target) return;

    const extras = this.selectedPackage?.extras || [];

    if (!extras.length) {
      section.hidden = true;
      target.innerHTML = "";
      return;
    }

    section.hidden = false;

    target.innerHTML = extras.map((extra) => {
      const price = this.convertMoney(Number(extra.price || 0), extra.currency || this.selectedPackage.currency || "PEN", this.quoteCurrency);
      const isChecked = this.selectedExtras.has(extra.code);

      return `
        <label class="quote-extra-item ${isChecked ? "is-selected" : ""}" for="extra-${this.escapeHtml(extra.code)}">
          <input type="checkbox" id="extra-${this.escapeHtml(extra.code)}" data-extra-code="${this.escapeHtml(extra.code)}" ${isChecked ? "checked" : ""} />
          <div>
            <strong>${this.escapeHtml(extra.label)}</strong>
            <p>${extra.perPerson ? "Por persona" : "Por reserva"} · ${this.formatCurrency(price, this.quoteCurrency)}</p>
          </div>
        </label>
      `;
    }).join("");

    target.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const code = checkbox.dataset.extraCode;
        if (checkbox.checked) this.selectedExtras.add(code);
        else this.selectedExtras.delete(code);

        this.renderExtras();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });
  }

  updatePricing() {
    const summary = this.calculateQuote();

    this.setText("basePackageTotal", summary.basePackageFormatted);
    this.setText("childrenTotal", summary.childrenFormatted);
    this.setText("hotelsTotal", summary.hotelsFormatted);
    this.setText("trainsTotal", summary.trainsFormatted);
    this.setText("extrasTotal", summary.extrasFormatted);
    this.setText("quoteSubtotal", summary.subtotalFormatted);
    this.setText("discountTotal", `- ${summary.discountFormatted}`);
    this.setText("quoteTotal", summary.totalFormatted);
    this.setText("advanceTotal", summary.advanceFormatted);
    this.setText("balanceTotal", summary.balanceFormatted);

    this.toggleRow("childrenSummaryRow", this.children > 0);
    this.toggleRow("hotelSummaryRow", summary.hotelsTotal > 0);
    this.toggleRow("trainSummaryRow", summary.trainsTotal > 0);
    this.toggleRow("extrasSummaryRow", summary.extrasTotal > 0);
    this.toggleRow("discountSummaryRow", summary.discount > 0);
    this.toggleRow("advanceSummaryRow", this.paymentMode === "partial");
    this.toggleRow("balanceSummaryRow", this.paymentMode === "partial");

    const paymentInfo = document.getElementById("paymentInfo");
    if (paymentInfo) {
      if (!this.selectedPackage) {
        paymentInfo.textContent = "Selecciona paquete, hotel y tren para generar la cotización.";
      } else if (this.paymentMode === "full") {
        paymentInfo.textContent = `Pago 100%: se aplica ${summary.fullDiscountPercent}% de descuento sobre el subtotal.`;
      } else {
        paymentInfo.textContent = `Anticipo: se paga el ${summary.partialPaymentPercent}% del total. No aplica descuento.`;
      }
    }
  }

  calculateQuote() {
    const currency = this.quoteCurrency;
    const fullDiscountPercent = Number(this.packagesData.paymentOptions?.fullPaymentDiscountPercent || 5);
    const partialPaymentPercent = Number(this.packagesData.paymentOptions?.partialPaymentPercent || 30);

    if (!this.selectedPackage) {
      return this.emptySummary(currency, fullDiscountPercent, partialPaymentPercent);
    }

    const adultBase = this.convertMoney(
      Number(this.selectedPackage.basePricing?.adult || 0),
      this.selectedPackage.currency || "PEN",
      currency
    );

    const childBase = this.convertMoney(
      Number(this.selectedPackage.basePricing?.child || this.selectedPackage.basePricing?.adult || 0),
      this.selectedPackage.currency || "PEN",
      currency
    );

    const adultsTotal = adultBase * this.adults;
    const childrenTotal = childBase * this.children;
    const basePackageTotal = adultsTotal + childrenTotal;
    const hotelsTotal = this.calculateAccommodationTotal();
    const trainsTotal = this.calculateTrainTotal();
    const extrasTotal = this.calculateExtrasTotal();

    const subtotal = basePackageTotal + hotelsTotal + trainsTotal + extrasTotal;
    const discount = this.paymentMode === "full" ? subtotal * (fullDiscountPercent / 100) : 0;
    const total = subtotal - discount;
    const advance = this.paymentMode === "partial" ? total * (partialPaymentPercent / 100) : total;
    const balance = this.paymentMode === "partial" ? total - advance : 0;

    return {
      currency,
      adultBase,
      childBase,
      adultsTotal,
      childrenTotal,
      basePackageTotal,
      hotelsTotal,
      trainsTotal,
      extrasTotal,
      subtotal,
      discount,
      total,
      advance,
      balance,
      fullDiscountPercent,
      partialPaymentPercent,
      basePackageFormatted: this.formatCurrency(basePackageTotal, currency),
      childrenFormatted: this.formatCurrency(childrenTotal, currency),
      hotelsFormatted: this.formatCurrency(hotelsTotal, currency),
      trainsFormatted: this.formatCurrency(trainsTotal, currency),
      extrasFormatted: this.formatCurrency(extrasTotal, currency),
      subtotalFormatted: this.formatCurrency(subtotal, currency),
      discountFormatted: this.formatCurrency(discount, currency),
      totalFormatted: this.formatCurrency(total, currency),
      advanceFormatted: this.formatCurrency(advance, currency),
      balanceFormatted: this.formatCurrency(balance, currency)
    };
  }

  emptySummary(currency, fullDiscountPercent, partialPaymentPercent) {
    return {
      currency,
      adultBase: 0,
      childBase: 0,
      adultsTotal: 0,
      childrenTotal: 0,
      basePackageTotal: 0,
      hotelsTotal: 0,
      trainsTotal: 0,
      extrasTotal: 0,
      subtotal: 0,
      discount: 0,
      total: 0,
      advance: 0,
      balance: 0,
      fullDiscountPercent,
      partialPaymentPercent,
      basePackageFormatted: this.formatCurrency(0, currency),
      childrenFormatted: this.formatCurrency(0, currency),
      hotelsFormatted: this.formatCurrency(0, currency),
      trainsFormatted: this.formatCurrency(0, currency),
      extrasFormatted: this.formatCurrency(0, currency),
      subtotalFormatted: this.formatCurrency(0, currency),
      discountFormatted: this.formatCurrency(0, currency),
      totalFormatted: this.formatCurrency(0, currency),
      advanceFormatted: this.formatCurrency(0, currency),
      balanceFormatted: this.formatCurrency(0, currency)
    };
  }

  calculateAccommodationTotal() {
    if (!this.selectedPackage) return 0;

    return this.getAccommodationSummary().reduce((sum, item) => {
      const hotelCode = this.selectedHotelsByDestination[item.destination];
      const combo = this.selectedCombinationsByDestination[item.destination];

      if (!hotelCode || hotelCode === "no-hotel" || !combo) return sum;

      return sum + this.convertMoney(Number(combo.totalForStay || 0), "USD", this.quoteCurrency);
    }, 0);
  }

  calculateAccommodationAdditional(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];
    const combo = this.selectedCombinationsByDestination[destination];

    if (!hotelCode || hotelCode === "no-hotel" || !combo) return 0;

    return this.convertMoney(Number(combo.totalForStay || 0), "USD", this.quoteCurrency);
  }

  calculateTrainTotal() {
    const outbound = this.findTrainByCode(this.selectedOutboundTrainCode);
    const returned = this.findTrainByCode(this.selectedReturnTrainCode);
    const passengers = this.getTotalPassengers();

    const outboundTotal = outbound
      ? this.convertMoney(Number(outbound.pricePerPerson || 0), outbound.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    const returnTotal = returned
      ? this.convertMoney(Number(returned.pricePerPerson || 0), returned.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    return outboundTotal + returnTotal;
  }

  calculateExtrasTotal() {
    const extras = this.selectedPackage?.extras || [];
    const passengers = this.getTotalPassengers();

    return extras.reduce((sum, extra) => {
      if (!this.selectedExtras.has(extra.code)) return sum;

      const price = this.convertMoney(
        Number(extra.price || 0),
        extra.currency || this.selectedPackage.currency || "PEN",
        this.quoteCurrency
      );

      return sum + (extra.perPerson ? price * passengers : price);
    }, 0);
  }

  updatePrintQuotation() {
    const summary = this.calculateQuote();
    const packageTitle = this.selectedPackage?.title || "Paquete no seleccionado";
    const packageDescription = this.selectedPackage?.description || "Selecciona un paquete para completar esta sección.";
    const itinerary = this.selectedItineraryOption?.itinerary || [];

    this.setText("printReference", this.quoteReference);
    this.setText("printIssueDate", this.formatDateDisplay(new Date()));
    this.setText("printValidUntil", this.formatDateDisplay(this.addDays(new Date(), Number(this.packagesData.paymentOptions?.quoteValidityDays || 2))));

    this.setText("printClientName", this.valueOrDefault("clientName"));
    this.setText("printClientPhone", this.valueOrDefault("clientPhone"));
    this.setText("printClientEmail", this.valueOrDefault("clientEmail"));
    this.setText("printClientDocument", this.valueOrDefault("clientDocument"));

    this.setText("printTravelDates", this.travelStartDate && this.travelEndDate ? `${this.travelStartDate} al ${this.travelEndDate}` : "Por completar");
    this.setText("printDuration", this.travelDays ? `${this.travelDays} días / ${this.travelNights} noches` : "Por completar");
    this.setText("printTravelers", `${this.adults} adulto${this.adults !== 1 ? "s" : ""}${this.children > 0 ? `, ${this.children} niño${this.children !== 1 ? "s" : ""}` : ""}`);
    this.setText("printNationality", this.getNationalityLabel(this.nationality));

    this.setText("printPackageTitle", packageTitle);
    this.setText("printPackageDescription", packageDescription);
    this.setText("printItineraryOption", this.selectedItineraryOption?.label || "Por completar");

    const itineraryList = document.getElementById("printItineraryList");
    if (itineraryList) {
      itineraryList.innerHTML = itinerary.length
        ? itinerary.map((item) => `
          <div class="print-itinerary-item">
            <strong>${this.escapeHtml(item.title || "")}</strong>
            <span>${this.escapeHtml(item.description || "")}</span>
          </div>
        `).join("")
        : "Por completar";
    }

    this.setText("printHotels", this.getHotelsPrintText());
    this.setText("printOutboundTrain", this.getTrainPrintText(this.selectedOutboundTrainCode));
    this.setText("printReturnTrain", this.getTrainPrintText(this.selectedReturnTrainCode));
    this.setText("printExtras", this.getExtrasPrintText());

    this.setText("printBaseTotal", summary.basePackageFormatted);
    this.setText("printHotelsTotal", summary.hotelsFormatted);
    this.setText("printTrainsTotal", summary.trainsFormatted);
    this.setText("printExtrasTotal", summary.extrasFormatted);
    this.setText("printSubtotal", summary.subtotalFormatted);
    this.setText("printDiscount", `- ${summary.discountFormatted}`);
    this.setText("printTotal", summary.totalFormatted);
    this.setText("printPaymentMode", this.paymentMode === "full" ? "Pago 100% con descuento" : "Anticipo sin descuento");
    this.setText("printAdvance", summary.advanceFormatted);
    this.setText("printBalance", summary.balanceFormatted);
  }

  sendQuoteEmail() {
    this.updatePrintQuotation();

    const summary = this.calculateQuote();
    const clientName = document.getElementById("clientName")?.value.trim() || "Cliente no indicado";
    const email = "reservas@mycuscotrip.com";
    const subject = `Solicitud de cotización ${this.quoteReference} - ${clientName}`;

    const bodyLines = [
      `Nueva solicitud de cotización`,
      ``,
      `Código: ${this.quoteReference}`,
      `Cliente: ${clientName}`,
      `Teléfono: ${document.getElementById("clientPhone")?.value.trim() || "No indicado"}`,
      `Email: ${document.getElementById("clientEmail")?.value.trim() || "No indicado"}`,
      `Documento: ${document.getElementById("clientDocument")?.value.trim() || "No indicado"}`,
      ``,
      `Fechas: ${this.travelStartDate || "No indicada"} al ${this.travelEndDate || "No indicada"}`,
      `Duración: ${this.travelDays || "--"} días / ${this.travelNights || "--"} noches`,
      `Nacionalidad: ${this.getNationalityLabel(this.nationality)}`,
      `Viajeros: ${this.adults} adultos, ${this.children} niños`,
      ``,
      `Paquete: ${this.selectedPackage?.title || "No seleccionado"}`,
      `Itinerario: ${this.selectedItineraryOption?.label || "No seleccionado"}`,
      `Hoteles: ${this.getHotelsPrintText()}`,
      `Tren ida: ${this.getTrainPrintText(this.selectedOutboundTrainCode)}`,
      `Tren retorno: ${this.getTrainPrintText(this.selectedReturnTrainCode)}`,
      `Extras: ${this.getExtrasPrintText()}`,
      ``,
      `Modalidad de pago: ${this.paymentMode === "full" ? "Pago 100% con descuento" : "Anticipo sin descuento"}`,
      `Subtotal: ${summary.subtotalFormatted}`,
      `Descuento: ${summary.discountFormatted}`,
      `Total cotizado: ${summary.totalFormatted}`,
      `Anticipo: ${summary.advanceFormatted}`,
      `Saldo: ${summary.balanceFormatted}`,
      ``,
      `Comentarios: ${document.getElementById("clientNotes")?.value.trim() || "Sin comentarios"}`
    ];

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  }

  getHotelsPrintText() {
    const summary = this.getAccommodationSummary();

    if (!summary.length) return "No aplica";

    const parts = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);

      if (!selection?.hotel || selection.hotel.hotelCode === "no-hotel") {
        return `${this.getDestinationLabel(item.destination)}: Sin hotel`;
      }

      return `${this.getDestinationLabel(item.destination)}: ${selection.hotel.hotelName} - ${selection.combination?.label || "Acomodación por confirmar"} (${item.nights} noche${item.nights !== 1 ? "s" : ""})`;
    });

    return parts.join(" | ");
  }

  getTrainPrintText(trainCode) {
    const train = this.findTrainByCode(trainCode);

    if (!train) return "Por completar";

    return `${train.company} - ${train.serviceName} | ${train.departureTime || "--:--"} a ${train.arrivalTime || "--:--"} | ${train.origin || ""} → ${train.destination || ""}`;
  }

  getExtrasPrintText() {
    const extras = this.selectedPackage?.extras || [];
    const selected = extras.filter((extra) => this.selectedExtras.has(extra.code));

    if (!selected.length) return "Ninguno";

    return selected.map((extra) => extra.label).join(", ");
  }

  getAccommodationSummary() {
    return Array.isArray(this.selectedPackage?.accommodationSummary)
      ? this.selectedPackage.accommodationSummary
      : [];
  }

  getHotelsByDestination(destination) {
    return this.hotelsData?.destinations?.[destination]?.hotels || [];
  }

  getHotelByCode(destination, hotelCode) {
    return this.getHotelsByDestination(destination).find((hotel) => hotel.hotelCode === hotelCode) || null;
  }

  getDestinationLabel(destination) {
    return this.hotelsData?.destinations?.[destination]?.label || this.titleCase(String(destination || "").replaceAll("-", " "));
  }

  getSelectedAccommodationForDestination(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];

    let hotel = null;
    if (hotelCode === "no-hotel") hotel = this.getNoHotelOption(destination);
    else hotel = this.getHotelByCode(destination, hotelCode);

    const combination = this.selectedCombinationsByDestination[destination] || null;
    return { hotel, combination };
  }

  getNoHotelOption(destination) {
    return {
      hotelCode: "no-hotel",
      hotelName: "Sin hotel",
      stars: 0,
      location: this.getDestinationLabel(destination),
      address: "",
      images: { cover: "", gallery: [] },
      amenities: {},
      rooms: [
        {
          roomType: "no-hotel",
          label: "Sin hotel",
          bedType: "No incluye alojamiento",
          capacity: Math.max(this.getTotalPassengers(), 1),
          pricePerNight: 0
        }
      ]
    };
  }

  generateAccommodationCombinations(rooms, passengers, nights) {
    const defs = (Array.isArray(rooms) ? rooms : [])
      .map((room) => ({
        roomType: String(room.roomType || ""),
        label: room.label || room.roomType || "Habitación",
        bedType: room.bedType || "",
        capacity: Number(room.capacity || 0),
        pricePerNight: Number(room.pricePerNight || 0),
        helperText: room.helperText || ""
      }))
      .filter((room) => room.capacity > 0 && room.pricePerNight >= 0)
      .sort((a, b) => a.capacity - b.capacity || a.pricePerNight - b.pricePerNight);

    if (!defs.length || passengers <= 0) return [];

    const results = [];
    const seen = new Set();

    const backtrack = (index, remaining, counts) => {
      if (index === defs.length) {
        if (remaining === 0) {
          const used = counts
            .map((count, i) => ({ room: defs[i], count }))
            .filter((entry) => entry.count > 0);

          if (!used.length) return;

          const key = used.map((entry) => `${entry.room.roomType}:${entry.count}`).join("|");
          if (seen.has(key)) return;

          seen.add(key);

          const totalRooms = used.reduce((sum, entry) => sum + entry.count, 0);
          const totalPerNight = used.reduce((sum, entry) => sum + (entry.room.pricePerNight * entry.count), 0);
          const totalForStay = totalPerNight * Number(nights || 0);

          results.push({
            key,
            rooms: used.map((entry) => ({
              roomType: entry.room.roomType,
              label: entry.room.label,
              bedType: entry.room.bedType,
              capacity: entry.room.capacity,
              pricePerNight: entry.room.pricePerNight,
              count: entry.count
            })),
            totalRooms,
            totalPerNight,
            totalForStay,
            additionalPerPerson: passengers > 0 ? totalForStay / passengers : 0,
            label: this.buildCombinationLabel(used)
          });
        }
        return;
      }

      const room = defs[index];
      const maxCount = Math.ceil(remaining / room.capacity);

      for (let count = 0; count <= maxCount; count += 1) {
        const covered = count * room.capacity;
        if (covered > remaining) break;

        counts[index] = count;
        backtrack(index + 1, remaining - covered, counts);
      }

      counts[index] = 0;
    };

    backtrack(0, passengers, new Array(defs.length).fill(0));

    return results.sort((a, b) => {
      if (a.totalForStay !== b.totalForStay) return a.totalForStay - b.totalForStay;
      if (a.totalRooms !== b.totalRooms) return a.totalRooms - b.totalRooms;
      return a.label.localeCompare(b.label, "es");
    });
  }

  buildCombinationLabel(usedRooms) {
    return usedRooms.map((entry) => {
      if (entry.room.roomType === "no-hotel") return entry.room.label;

      return `${entry.count} ${entry.room.label}${entry.count > 1 ? "s" : ""}`;
    }).join(" + ");
  }

  findTrainByCode(code) {
    if (!code) return null;

    const allRoutes = Object.values(this.trainsData.routes || {});
    for (const route of allRoutes) {
      const found = (route.options || []).find((train) => train.code === code);
      if (found) return found;
    }

    return null;
  }

  getTotalPassengers() {
    return this.adults + this.children;
  }

  convertMoney(amount, fromCurrency, toCurrency) {
    const value = Number(amount || 0);
    const from = String(fromCurrency || "PEN").toUpperCase();
    const to = String(toCurrency || "PEN").toUpperCase();

    if (from === to) return value;

    if (from === "USD" && to === "PEN") return value * this.exchangeRate;
    if (from === "PEN" && to === "USD") return value / this.exchangeRate;

    return value;
  }

  formatCurrency(amount, currency = this.quoteCurrency) {
    const value = Number(amount || 0);

    if (currency === "USD") {
      return `USD ${value.toFixed(2)}`;
    }

    return `S/ ${value.toFixed(2)}`;
  }

  updatePassengersUI() {
    this.setText("adultsCount", String(this.adults));
    this.setText("childrenCount", String(this.children));
  }

  updateReferenceUI() {
    this.setText("quoteReference", this.quoteReference);
  }

  updateExchangeRateHelp() {
    const help = document.getElementById("exchangeRateHelp");
    if (!help) return;

    help.textContent = `Tipo de cambio referencial: 1 USD = S/ ${this.exchangeRate.toFixed(3)}. Se actualiza automáticamente si la fuente online responde.`;
  }

  getNationalityLabel(code) {
    const options = {
      national: "Nacionales peruanos",
      foreign: "Extranjeros",
      andean_community: "Comunidad Andina"
    };

    return options[code] || code || "Por completar";
  }

  generateReference() {
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);

    return `COT-PE-${y}${m}${d}-${rand}`;
  }

  formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  formatDateDisplay(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + Number(days || 0));
    return copy;
  }

  valueOrDefault(id) {
    const value = document.getElementById(id)?.value?.trim();
    return value || "Por completar";
  }

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  toggleRow(id, show) {
    const row = document.getElementById(id);
    if (row) row.hidden = !show;
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
    const cleanPath = String(path || "").replace(/^\.?\//, "");
    return `${this.basePath}${cleanPath}`;
  }

  resolveAssetPath(path) {
    const raw = String(path || "");
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return this.resolvePath(raw);
  }

  titleCase(value) {
    return String(value || "").replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
    });
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MyCuscoTripQuotePackages();
});
