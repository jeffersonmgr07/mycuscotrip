class MyCuscoTripProductPage {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.slug = this.params.get("slug");

    this.product = null;
    this.tours = [];
    this.hotelsData = null;

    this.adults = 2;
    this.children = 0;
    this.selectedExtras = new Set();
    this.paymentMode = "full";
    this.date = "";

    this.packageSelections = {
      destinations: {},
      roomType: ""
    };

    this.init();
  }

  async init() {
    if (!this.slug) {
      this.renderNotFound("No se recibió un tour válido.");
      return;
    }

    try {
      const [tours, hotelsData] = await Promise.all([
        this.loadTours(),
        this.loadHotels().catch((error) => {
          console.warn("No se pudo cargar hotels.json:", error);
          return null;
        })
      ]);

      this.tours = tours;
      this.hotelsData = hotelsData;

      const product = this.tours.find((item) => item.slug === this.slug);

      if (!product) {
        this.renderNotFound("No encontramos esta experiencia.");
        return;
      }

      this.product = product;

      this.renderProduct(product);
      this.initBookingLogic();
      this.updatePassengersUI();
      this.updatePricing();
    } catch (error) {
      console.error("Error loading product:", error);
      this.renderNotFound("No se pudo cargar la experiencia.");
    }
  }

  async loadTours() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");
    if (localProducts.length > 0) {
      return localProducts.filter((item) => item.status !== "draft");
    }

    const response = await fetch("./assets/data/tours.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar tours.json");

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("tours.json no contiene un array válido");

    return data.filter((item) => item.status !== "draft");
  }

  async loadHotels() {
    const response = await fetch("./assets/data/hotels.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar hotels.json");

    const data = await response.json();
    if (!data || typeof data !== "object" || !data.destinations) {
      throw new Error("hotels.json no contiene la estructura esperada");
    }

    return data;
  }

  isPackageProduct(product = this.product) {
    if (!product) return false;

    const type = String(product.type || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();

    return (
      Array.isArray(product.accommodationSummary) ||
      Array.isArray(product.accommodationPlan) ||
      type.includes("package") ||
      type.includes("custom-package") ||
      category === "paquetes"
    );
  }

  getAccommodationSummary(product = this.product) {
    if (!product) return [];

    if (Array.isArray(product.accommodationSummary) && product.accommodationSummary.length) {
      return product.accommodationSummary
        .map((item) => ({
          destination: item.destination,
          nights: Number(item.nights || 0),
          label: item.label || `${this.getDestinationLabel(item.destination)} - ${Number(item.nights || 0)} noche(s)`
        }))
        .filter((item) => item.destination && item.nights > 0);
    }

    if (Array.isArray(product.accommodationPlan) && product.accommodationPlan.length) {
      const grouped = {};

      product.accommodationPlan.forEach((night) => {
        const destination = night.destination;
        if (!destination) return;
        grouped[destination] = (grouped[destination] || 0) + 1;
      });

      return Object.entries(grouped).map(([destination, nights]) => ({
        destination,
        nights,
        label: `${this.getDestinationLabel(destination)} - ${nights} noche${nights > 1 ? "s" : ""}`
      }));
    }

    return [];
  }

  getDestinationLabel(destinationCode) {
    if (!destinationCode) return "Destino";
    return (
      this.hotelsData?.destinations?.[destinationCode]?.label ||
      destinationCode.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
  }

  getHotelsForDestination(destinationCode) {
    return this.hotelsData?.destinations?.[destinationCode]?.hotels || [];
  }

  getCurrentPassengerCount() {
    return this.adults + this.children;
  }

  getAvailableRoomTypes(passengerCount = this.getCurrentPassengerCount()) {
    const allRoomTypes = [
      { roomType: "single", label: "Habitación simple", min: 1, max: 1 },
      { roomType: "double-twin", label: "Habitación doble", min: 2, max: 2 },
      { roomType: "double-matrimonial", label: "Habitación matrimonial", min: 2, max: 2 },
      { roomType: "triple", label: "Habitación triple", min: 3, max: 3 }
    ];

    return allRoomTypes.filter((room) => passengerCount >= room.min);
  }

  renderProduct(product) {
    const title = product.title || "Experiencia";
    const description =
      product.description ||
      product.shortDescription ||
      "Pronto agregaremos más detalles de esta experiencia.";

    const badge = product.badge || "Destacado";
    const basePrice = product.basePricing?.adult || 0;
    const currency = product.currency || "USD";
    const location = product.location || "Cusco, Perú";
    const duration = product.duration?.label || "Duración por confirmar";
    const languages = product.duration?.guideLanguages?.length
      ? product.duration.guideLanguages.join(", ")
      : "Por confirmar";
    const capacity = product.capacity || product.duration?.maxGroupSize || "Por confirmar";

    document.title = `${title} | My Cusco Trip`;

    this.setText("productBadge", badge);
    this.setText("productTitle", title);
    this.setText("productDescription", description);
    this.setText("productBasePrice", `${currency} ${this.formatMoney(basePrice)}`);

    this.setText("detailCapacity", `Máximo ${capacity} viajeros por grupo`);
    this.setText("detailDuration", duration);
    this.setText("detailLanguages", `Guía en ${languages}`);
    this.setText("detailLocation", location);

    this.renderGallery(product.images);
    this.renderIncludes(product.includes || []);
    this.renderExcludes(product.excludes || []);
    this.renderHighlights(product);
    this.renderItinerary(product.itinerary || []);
    this.renderFaq(product.faq || []);
    this.renderPackageConfigurator(product);
    this.renderExtras(product.extras || []);
    this.renderSimilarExperiences();
  }

  initBookingLogic() {
    const dateInput = document.getElementById("travelDate");
    if (dateInput && typeof flatpickr !== "undefined") {
      flatpickr(dateInput, {
        locale: flatpickr.l10ns.es,
        minDate: "today",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y",
        onReady: (_, __, instance) => {
          if (instance.altInput) {
            instance.altInput.setAttribute("readonly", "readonly");
            instance.altInput.style.width = "100%";
            instance.altInput.style.maxWidth = "100%";
            instance.altInput.style.boxSizing = "border-box";
          }
        },
        onChange: (_, dateStr, instance) => {
          this.date = dateStr;
          if (instance.altInput) {
            instance.altInput.style.width = "100%";
            instance.altInput.style.maxWidth = "100%";
            instance.altInput.style.boxSizing = "border-box";
          }
        }
      });
    }

    document.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const target = btn.dataset.target;

        if (target === "adults") {
          if (action === "minus") this.adults = Math.max(1, this.adults - 1);
          if (action === "plus") this.adults += 1;
        }

        if (target === "children") {
          if (action === "minus") this.children = Math.max(0, this.children - 1);
          if (action === "plus") this.children += 1;
        }

        this.updatePassengersUI();
        this.refreshPackageRoomOptions();
        this.updatePricing();
      });
    });

    const paymentMode = document.getElementById("paymentMode");
    paymentMode?.addEventListener("change", () => {
      this.paymentMode = paymentMode.value;
      this.updatePricing();
    });

    document.getElementById("paypalButton")?.addEventListener("click", () => {
      this.handlePaypalAction();
    });

    document.getElementById("bookingPreviewButton")?.addEventListener("click", () => {
      this.showBookingPreview();
    });
  }

  renderPackageConfigurator(product) {
    const form = document.getElementById("productBookingForm");
    if (!form) return;

    const oldConfig = document.getElementById("packageConfigSection");
    if (oldConfig) oldConfig.remove();

    if (!this.isPackageProduct(product) || !this.hotelsData) return;

    const accommodationSummary = this.getAccommodationSummary(product);
    if (!accommodationSummary.length) return;

    const packageSection = document.createElement("div");
    packageSection.id = "packageConfigSection";
    packageSection.className = "booking-field";
    packageSection.innerHTML = `
      <label>Hoteles del paquete</label>
      <div id="packageConfigContainer" class="booking-package-config"></div>
      <div class="booking-field" style="margin-top: 16px;">
        <label for="packageRoomType">Tipo de habitación</label>
        <select id="packageRoomType"></select>
      </div>
      <div id="selectedHotelGallery" class="booking-selected-hotel-gallery" style="margin-top: 16px;"></div>
    `;

    const extrasSection = document.getElementById("extrasSection");
    if (extrasSection) {
      form.insertBefore(packageSection, extrasSection);
    } else {
      const paymentField = document.getElementById("paymentMode")?.closest(".booking-field");
      if (paymentField) {
        form.insertBefore(packageSection, paymentField);
      } else {
        form.appendChild(packageSection);
      }
    }

    const packageContainer = document.getElementById("packageConfigContainer");
    if (!packageContainer) return;

    packageContainer.innerHTML = accommodationSummary.map((stay) => {
      const hotels = this.getHotelsForDestination(stay.destination);
      const optionsHtml = hotels.map((hotel) => {
        return `<option value="${this.escapeHtml(hotel.hotelCode)}">${this.escapeHtml(hotel.hotelName)} (${hotel.stars}★)</option>`;
      }).join("");

      return `
        <div class="booking-field" style="margin-bottom: 14px;">
          <label for="hotel-${this.escapeHtml(stay.destination)}">${this.escapeHtml(stay.label)}</label>
          <select id="hotel-${this.escapeHtml(stay.destination)}" data-destination="${this.escapeHtml(stay.destination)}">
            <option value="">Selecciona hotel</option>
            ${optionsHtml}
          </select>
        </div>
      `;
    }).join("");

    accommodationSummary.forEach((stay) => {
      const hotels = this.getHotelsForDestination(stay.destination);
      if (hotels.length) {
        this.packageSelections.destinations[stay.destination] = hotels[0].hotelCode;
      }
    });

    packageContainer.querySelectorAll("select[data-destination]").forEach((select) => {
      const destination = select.dataset.destination;
      if (destination && this.packageSelections.destinations[destination]) {
        select.value = this.packageSelections.destinations[destination];
      }

      select.addEventListener("change", () => {
        this.packageSelections.destinations[destination] = select.value;
        this.renderSelectedHotelGallery();
        this.updatePricing();
      });
    });

    this.refreshPackageRoomOptions();
    this.renderSelectedHotelGallery();
  }

  refreshPackageRoomOptions() {
    const roomSelect = document.getElementById("packageRoomType");
    if (!roomSelect || !this.isPackageProduct()) return;

    const passengerCount = this.getCurrentPassengerCount();
    const roomTypes = this.getAvailableRoomTypes(passengerCount);

    roomSelect.innerHTML = roomTypes.map((room) => {
      return `<option value="${this.escapeHtml(room.roomType)}">${this.escapeHtml(room.label)}</option>`;
    }).join("");

    const currentValue = this.packageSelections.roomType;
    const stillValid = roomTypes.some((room) => room.roomType === currentValue);

    if (stillValid) {
      roomSelect.value = currentValue;
    } else {
      this.packageSelections.roomType = roomTypes[0]?.roomType || "";
      roomSelect.value = this.packageSelections.roomType;
    }

    roomSelect.onchange = () => {
      this.packageSelections.roomType = roomSelect.value;
      this.updatePricing();
    };
  }

  renderSelectedHotelGallery() {
    const gallery = document.getElementById("selectedHotelGallery");
    if (!gallery || !this.isPackageProduct()) return;

    const selectedHotels = this.getSelectedHotels();
    if (!selectedHotels.length) {
      gallery.innerHTML = "";
      return;
    }

    gallery.innerHTML = selectedHotels.map((entry) => {
      const cover = entry.hotel.images?.cover || "";
      const destinationLabel = this.getDestinationLabel(entry.destination);

      return `
        <div class="booking-selected-hotel-card" style="margin-bottom: 16px;">
          <p style="margin: 0 0 8px;"><strong>${this.escapeHtml(destinationLabel)}:</strong> ${this.escapeHtml(entry.hotel.hotelName)}</p>
          ${cover ? `<img src="${cover}" alt="${this.escapeHtml(entry.hotel.hotelName)}" style="width:100%; border-radius:12px; margin-bottom:8px;" loading="lazy" />` : ""}
          <div style="font-size: 14px; color: #555;">
            ${entry.hotel.address ? `<p style="margin:0;">${this.escapeHtml(entry.hotel.address)}</p>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  getSelectedHotels() {
    if (!this.isPackageProduct() || !this.hotelsData) return [];

    return Object.entries(this.packageSelections.destinations)
      .map(([destination, hotelCode]) => {
        const hotel = this.getHotelsForDestination(destination).find((item) => item.hotelCode === hotelCode);
        if (!hotel) return null;
        return { destination, hotel };
      })
      .filter(Boolean);
  }

  calculateAccommodationTotal() {
    if (!this.isPackageProduct()) return 0;

    const roomType = this.packageSelections.roomType;
    const accommodationSummary = this.getAccommodationSummary();

    if (!roomType || !accommodationSummary.length) return 0;

    let total = 0;

    for (const stay of accommodationSummary) {
      const hotelCode =
