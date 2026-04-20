class MyCuscoTripProductPage {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.slug = this.params.get("slug");

    this.basePath = window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";

    this.product = null;
    this.tours = [];
    this.hotelsData = { destinations: {} };

    this.adults = 2;
    this.children = 0;
    this.selectedExtras = new Set();
    this.paymentMode = "full";
    this.date = "";

    this.selectedHotelsByDestination = {};
    this.selectedRoomsByDestination = {};

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
        this.loadHotels()
      ]);

      this.tours = tours;
      this.hotelsData = hotelsData || { destinations: {} };

      const product = this.tours.find((item) => item.slug === this.slug);

      if (!product) {
        this.renderNotFound("No encontramos esta experiencia.");
        return;
      }

      this.product = product;
      this.renderProduct(product);
      this.initBookingLogic();
    } catch (error) {
      console.error("Error loading product:", error);
      this.renderNotFound("No se pudo cargar la experiencia.");
    }
  }

  async loadTours() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");
    if (Array.isArray(localProducts) && localProducts.length > 0) {
      return localProducts.filter((item) => item.status !== "draft");
    }

    const response = await fetch(this.resolvePath("assets/data/tours.json"), {
      cache: "no-store"
    });

    if (!response.ok) throw new Error("No se pudo cargar tours.json");

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("tours.json no contiene un array válido");

    return data.filter((item) => item.status !== "draft");
  }

  async loadHotels() {
    try {
      const response = await fetch(this.resolvePath("assets/data/hotels.json"), {
        cache: "no-store"
      });

      if (!response.ok) {
        console.warn("No se pudo cargar hotels.json. Se continuará sin hoteles dinámicos.");
        return { destinations: {} };
      }

      const data = await response.json();
      if (!data || typeof data !== "object") {
        return { destinations: {} };
      }

      return {
        destinations: data.destinations && typeof data.destinations === "object"
          ? data.destinations
          : {}
      };
    } catch (error) {
      console.warn("Error loading hotels.json:", error);
      return { destinations: {} };
    }
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
    this.renderExtras(product.extras || []);
    this.renderAccommodationOptions(product);
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
        onChange: (selectedDates, dateStr, instance) => {
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
        this.refreshAccommodationRoomOptions();
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

    this.bindAccommodationEvents();

    this.updatePassengersUI();
    this.refreshAccommodationRoomOptions();
    this.updatePricing();
  }

  renderGallery(images = {}) {
    const gallery = document.getElementById("productGallery");
    if (!gallery) return;

    const cover = images.cover ? [this.resolveAssetPath(images.cover)] : [];
    const galleryImages = Array.isArray(images.gallery)
      ? images.gallery.map((src) => this.resolveAssetPath(src))
      : [];
    const finalImages = [...new Set([...cover, ...galleryImages])];

    if (!finalImages.length) {
      gallery.innerHTML = `
        <div class="experience-gallery__main">
          <img src="${this.resolvePath("assets/img/tours/machu-picchu-full-day/cover.jpg")}" alt="Imagen referencial">
        </div>
      `;
      return;
    }

    const mainImage = finalImages[0];
    const sideImages = finalImages.slice(1, 3);

    gallery.innerHTML = `
      <div class="experience-gallery__main">
        <img src="${mainImage}" alt="${this.escapeHtml(this.product?.title || "Experiencia")}" loading="eager" />
      </div>
      <div class="experience-gallery__side">
        ${sideImages.map((src, index) => `
          <div class="experience-gallery__side-item">
            <img src="${src}" alt="Galería ${index + 2}" loading="lazy" />
          </div>
        `).join("")}
      </div>
    `;
  }

  renderIncludes(items) {
    const target = document.getElementById("productIncludes");
    if (!target) return;
    target.innerHTML = items.length
      ? items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")
      : "<li>Información por confirmar.</li>";
  }

  renderExcludes(items) {
    const target = document.getElementById("productExcludes");
    if (!target) return;
    target.innerHTML = items.length
      ? items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")
      : "<li>Información por confirmar.</li>";
  }

  renderHighlights(product) {
    const target = document.getElementById("productHighlights");
    if (!target) return;

    const highlights = [
      product.shortDescription,
      `Ubicación: ${product.location || "Cusco, Perú"}`,
      `Duración: ${product.duration?.label || "Por confirmar"}`,
      product.typeLabel ? `Tipo: ${product.typeLabel}` : null,
      product.duration?.guideLanguages?.length
        ? `Idiomas: ${product.duration.guideLanguages.join(", ")}`
        : null
    ].filter(Boolean);

    target.innerHTML = highlights.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("");
  }

  renderItinerary(items) {
    const target = document.getElementById("productItinerary");
    if (!target) return;

    if (!items.length) {
      target.innerHTML = "<p>Itinerario por confirmar.</p>";
      return;
    }

    target.innerHTML = items.map((item) => `
      <div class="experience-itinerary-item">
        <h3>${this.escapeHtml(item.title || "Paso del itinerario")}</h3>
        <p>${this.escapeHtml(item.description || "")}</p>
      </div>
    `).join("");
  }

  renderFaq(items) {
    const target = document.getElementById("productFaq");
    if (!target) return;

    if (!items.length) {
      target.innerHTML = "<p>Pronto agregaremos preguntas frecuentes.</p>";
      return;
    }

    target.innerHTML = items.map((item) => `
      <div class="experience-faq-item">
        <h3>${this.escapeHtml(item.q || "Pregunta")}</h3>
        <p>${this.escapeHtml(item.a || "")}</p>
      </div>
    `).join("");
  }

  renderExtras(extras) {
    const section = document.getElementById("extrasSection");
    const container = document.getElementById("extrasContainer");

    if (!section || !container) return;

    if (!extras.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    container.innerHTML = extras.map((extra) => {
      const extraPrice = `${this.product.currency || "USD"} ${this.formatMoney(extra.price || 0)}`;
      return `
        <label class="booking-extra-item" for="extra-${extra.code}">
          <input type="checkbox" id="extra-${extra.code}" data-extra-code="${this.escapeHtml(extra.code)}" />
          <div class="booking-extra-text">
            <strong>${this.escapeHtml(extra.label)}</strong>
            <small>${extra.perPerson ? "Precio por persona" : "Precio por reserva"} · ${extraPrice}</small>
          </div>
        </label>
      `;
    }).join("");

    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const code = checkbox.dataset.extraCode;
        if (checkbox.checked) {
          this.selectedExtras.add(code);
        } else {
          this.selectedExtras.delete(code);
        }
        this.updatePricing();
      });
    });
  }

  renderAccommodationOptions(product) {
    const bookingForm = document.getElementById("productBookingForm");
    if (!bookingForm) return;

    this.removeAccommodationSection();
    this.removeAccommodationSummaryRow();

    if (!this.isPackage(product)) return;

    const summary = this.getAccommodationSummary(product);
    if (!summary.length) return;

    const section = document.createElement("div");
    section.id = "accommodationSection";
    section.className = "booking-field";
    section.innerHTML = `
      <label>Alojamiento</label>
      <div id="accommodationContainer" class="booking-accommodation"></div>
      <div id="selectedHotelPreview" class="booking-hotel-preview"></div>
    `;

    const paymentField = document.getElementById("paymentMode")?.closest(".booking-field");
    if (paymentField) {
      bookingForm.insertBefore(section, paymentField);
    } else {
      bookingForm.appendChild(section);
    }

    const container = document.getElementById("accommodationContainer");
    if (!container) return;

    const totalPassengers = this.getTotalPassengers();

    container.innerHTML = summary.map((item) => {
      const destinationHotels = this.getHotelsByDestination(item.destination);
      const firstHotel = destinationHotels[0] || null;

      if (firstHotel && !this.selectedHotelsByDestination[item.destination]) {
        this.selectedHotelsByDestination[item.destination] = firstHotel.hotelCode;
      }

      const selectedHotelCode = this.selectedHotelsByDestination[item.destination];
      const selectedHotel =
        destinationHotels.find((hotel) => hotel.hotelCode === selectedHotelCode) || firstHotel;

      const rooms = this.getRoomOptionsForPassengers(selectedHotel?.rooms || [], totalPassengers);
      const firstRoom = rooms[0] || null;

      if (firstRoom && !this.selectedRoomsByDestination[item.destination]) {
        this.selectedRoomsByDestination[item.destination] = firstRoom.roomType;
      }

      const selectedRoomType = this.selectedRoomsByDestination[item.destination];

      return `
        <div class="booking-accommodation-card" data-destination="${this.escapeHtml(item.destination)}">
          <div class="booking-accommodation-card__header">
            <strong>${this.escapeHtml(item.label || this.getDestinationLabel(item.destination))}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="booking-accommodation-card__body">
            <div class="booking-accommodation-row">
              <label for="hotel-${this.escapeHtml(item.destination)}">Hotel</label>
              <select id="hotel-${this.escapeHtml(item.destination)}" class="hotel-select" data-destination="${this.escapeHtml(item.destination)}">
                ${destinationHotels.length
                  ? destinationHotels.map((hotel) => `
                      <option value="${this.escapeHtml(hotel.hotelCode)}" ${hotel.hotelCode === selectedHotel?.hotelCode ? "selected" : ""}>
                        ${this.escapeHtml(hotel.hotelName)} (${hotel.stars || 0}★)
                      </option>
                    `).join("")
                  : `<option value="">No hay hoteles configurados</option>`
                }
              </select>
            </div>

            <div class="booking-accommodation-row">
              <label for="room-${this.escapeHtml(item.destination)}">Habitación</label>
              <select id="room-${this.escapeHtml(item.destination)}" class="room-select" data-destination="${this.escapeHtml(item.destination)}">
                ${rooms.length
                  ? rooms.map((room) => `
                      <option value="${this.escapeHtml(room.roomType)}" ${room.roomType === selectedRoomType ? "selected" : ""}>
                        ${this.escapeHtml(room.label)} · ${this.escapeHtml(room.bedType || "")} · ${this.product.currency || "USD"} ${this.formatMoney(room.pricePerNight || 0)} / noche
                      </option>
                    `).join("")
                  : `<option value="">No hay habitaciones válidas</option>`
                }
              </select>
            </div>
          </div>
        </div>
      `;
    }).join("");

    this.insertAccommodationSummaryRow();
    this.renderSelectedHotelPreview();
  }

  bindAccommodationEvents() {
    document.querySelectorAll(".hotel-select").forEach((select) => {
      select.addEventListener("change", (event) => {
        const destination = event.target.dataset.destination;
        const hotelCode = event.target.value;

        this.selectedHotelsByDestination[destination] = hotelCode;

        const selectedHotel = this.getHotelByCode(destination, hotelCode);
        const roomOptions = this.getRoomOptionsForPassengers(
          selectedHotel?.rooms || [],
          this.getTotalPassengers()
        );

        if (!roomOptions.find((room) => room.roomType === this.selectedRoomsByDestination[destination])) {
          this.selectedRoomsByDestination[destination] = roomOptions[0]?.roomType || "";
        }

        this.refreshDestinationRoomSelect(destination);
        this.renderSelectedHotelPreview();
        this.updatePricing();
      });
    });

    document.querySelectorAll(".room-select").forEach((select) => {
      select.addEventListener("change", (event) => {
        const destination = event.target.dataset.destination;
        this.selectedRoomsByDestination[destination] = event.target.value;
        this.renderSelectedHotelPreview();
        this.updatePricing();
      });
    });
  }

  refreshAccommodationRoomOptions() {
    if (!this.product || !this.isPackage(this.product)) return;

    const summary = this.getAccommodationSummary(this.product);
    summary.forEach((item) => this.refreshDestinationRoomSelect(item.destination));
    this.renderSelectedHotelPreview();
  }

  refreshDestinationRoomSelect(destination) {
    const roomSelect = document.querySelector(`.room-select[data-destination="${destination}"]`);
    if (!roomSelect) return;

    const selectedHotelCode = this.selectedHotelsByDestination[destination];
    const selectedHotel = this.getHotelByCode(destination, selectedHotelCode);

    const roomOptions = this.getRoomOptionsForPassengers(
      selectedHotel?.rooms || [],
      this.getTotalPassengers()
    );

    if (!roomOptions.find((room) => room.roomType === this.selectedRoomsByDestination[destination])) {
      this.selectedRoomsByDestination[destination] = roomOptions[0]?.roomType || "";
    }

    roomSelect.innerHTML = roomOptions.length
      ? roomOptions.map((room) => `
          <option value="${this.escapeHtml(room.roomType)}" ${room.roomType === this.selectedRoomsByDestination[destination] ? "selected" : ""}>
            ${this.escapeHtml(room.label)} · ${this.escapeHtml(room.bedType || "")} · ${this.product.currency || "USD"} ${this.formatMoney(room.pricePerNight || 0)} / noche
          </option>
        `).join("")
      : `<option value="">No hay habitaciones válidas</option>`;

    this.bindAccommodationEvents();
  }

  renderSelectedHotelPreview() {
    const preview = document.getElementById("selectedHotelPreview");
    if (!preview || !this.product || !this.isPackage(this.product)) return;

    const summary = this.getAccommodationSummary(this.product);
    if (!summary.length) {
      preview.innerHTML = "";
      return;
    }

    const html = summary.map((item) => {
      const hotelCode = this.selectedHotelsByDestination[item.destination];
      const roomType = this.selectedRoomsByDestination[item.destination];

      const hotel = this.getHotelByCode(item.destination, hotelCode);
      const room = (hotel?.rooms || []).find((entry) => entry.roomType === roomType);

      if (!hotel) {
        return `
          <div class="booking-hotel-preview-card">
            <strong>${this.escapeHtml(item.label || this.getDestinationLabel(item.destination))}</strong>
            <p>No hay hotel seleccionado.</p>
          </div>
        `;
      }

      const cover = hotel.images?.cover
        ? this.resolveAssetPath(hotel.images.cover)
        : "";

      return `
        <div class="booking-hotel-preview-card">
          ${cover ? `<img src="${cover}" alt="${this.escapeHtml(hotel.hotelName)}" loading="lazy" />` : ""}
          <div class="booking-hotel-preview-card__content">
            <strong>${this.escapeHtml(item.label || this.getDestinationLabel(item.destination))}</strong>
            <p>${this.escapeHtml(hotel.hotelName)} (${hotel.stars || 0}★)</p>
            <p>${this.escapeHtml(hotel.location || "")}${hotel.address ? ` · ${this.escapeHtml(hotel.address)}` : ""}</p>
            <p>${room ? `${this.escapeHtml(room.label)} · ${this.product.currency || "USD"} ${this.formatMoney(room.pricePerNight || 0)} / noche` : "Habitación por confirmar"}</p>
          </div>
        </div>
      `;
    }).join("");

    preview.innerHTML = html;
  }

  renderSimilarExperiences() {
    const desktopTarget = document.getElementById("similarExperiencesDesktop");
    const mobileTarget = document.getElementById("similarExperiencesMobile");

    const similar = this.tours
      .filter((item) => item.slug !== this.product.slug)
      .filter((item) => item.category === this.product.category || item.featured)
      .slice(0, 3);

    const html = !similar.length
      ? "<p>No hay experiencias similares disponibles por ahora.</p>"
      : similar.map((item) => `
        <article class="similar-card">
          <img src="${this.resolveAssetPath(item.images?.cover || "assets/img/tours/machu-picchu-full-day/cover.jpg")}" alt="${this.escapeHtml(item.title)}" loading="lazy" />
          <div class="similar-card__content">
            <h3>${this.escapeHtml(item.title)}</h3>
            <p>${this.escapeHtml(item.shortDescription || "Experiencia disponible.")}</p>
            <a class="btn" href="${this.resolvePath(`product.html?slug=${encodeURIComponent(item.slug)}`)}">Ver experiencia</a>
          </div>
        </article>
      `).join("");

    if (desktopTarget) desktopTarget.innerHTML = html;
    if (mobileTarget) mobileTarget.innerHTML = html;
  }

  updatePassengersUI() {
    this.setText("adultsCount", String(this.adults));
    this.setText("childrenCount", String(this.children));
  }

  updatePricing() {
    if (!this.product) return;

    const currency = this.product.currency || "USD";
    const adultPrice = this.product.basePricing?.adult || 0;
    const childPrice = this.product.basePricing?.child || adultPrice;

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();
    const accommodationTotal = this.calculateAccommodationTotal();

    const serviceTotal = adultsTotal + childrenTotal + extrasTotal + accommodationTotal;

    const fullDiscountPercent = this.product.paymentOptions?.fullPaymentDiscountPercent || 0;
    const partialPerPerson = this.product.paymentOptions?.partialPaymentPerPerson || 49.9;

    let discount = 0;
    let payNow = serviceTotal;
    let payLater = 0;
    let infoText = "";

    if (this.paymentMode === "full") {
      discount = serviceTotal * (fullDiscountPercent / 100);
      payNow = serviceTotal - discount;
      payLater = 0;

      infoText = fullDiscountPercent > 0
        ? `Pagando el total ahora accedes a un descuento del ${fullDiscountPercent}%.`
        : "Pagarás el total completo ahora.";
    } else {
      const totalPassengers = this.getTotalPassengers();
      payNow = totalPassengers * partialPerPerson;
      payLater = serviceTotal - payNow;

      if (payLater < 0) payLater = 0;

      infoText =
        this.product.paymentOptions?.partialPaymentLabel ||
        `Separas tu cupo pagando ${currency} ${this.formatMoney(partialPerPerson)} por persona.`;
    }

    this.setText("adultsTotal", `${currency} ${this.formatMoney(adultsTotal)}`);
    this.setText("childrenTotal", `${currency} ${this.formatMoney(childrenTotal)}`);
    this.setText("extrasTotal", `${currency} ${this.formatMoney(extrasTotal)}`);
    this.setText("serviceTotal", `${currency} ${this.formatMoney(serviceTotal)}`);
    this.setText("payNowTotal", `${currency} ${this.formatMoney(payNow)}`);
    this.setText("discountTotal", `- ${currency} ${this.formatMoney(discount)}`);
    this.setText("payLaterTotal", `${currency} ${this.formatMoney(payLater)}`);
    this.setText("accommodationTotal", `${currency} ${this.formatMoney(accommodationTotal)}`);

    const payNowLabel = document.getElementById("payNowLabel");
    if (payNowLabel) {
      payNowLabel.textContent = this.paymentMode === "full" ? "Pagar ahora" : "Pagarás ahora";
    }

    const discountRow = document.getElementById("discountRow");
    if (discountRow) {
      discountRow.hidden = !(this.paymentMode === "full" && discount > 0);
    }

    const payLaterRow = document.getElementById("payLaterRow");
    if (payLaterRow) {
      payLaterRow.hidden = this.paymentMode !== "partial";
    }

    const accommodationRow = document.getElementById("accommodationRow");
    if (accommodationRow) {
      accommodationRow.hidden = !this.isPackage(this.product) || accommodationTotal <= 0;
    }

    const paymentInfo = document.getElementById("paymentInfo");
    if (paymentInfo) {
      paymentInfo.textContent = infoText;
    }
  }

  calculateExtrasTotal() {
    if (!this.product?.extras?.length) return 0;

    const passengers = this.getTotalPassengers();

    return this.product.extras.reduce((total, extra) => {
      if (!this.selectedExtras.has(extra.code)) return total;

      const price = extra.price || 0;
      if (extra.perPerson) return total + (price * passengers);
      return total + price;
    }, 0);
  }

  calculateAccommodationTotal() {
    if (!this.product || !this.isPackage(this.product)) return 0;

    const summary = this.getAccommodationSummary(this.product);
    if (!summary.length) return 0;

    const totalPassengers = this.getTotalPassengers();

    return summary.reduce((total, item) => {
      const hotelCode = this.selectedHotelsByDestination[item.destination];
      const roomType = this.selectedRoomsByDestination[item.destination];

      const hotel = this.getHotelByCode(item.destination, hotelCode);
      if (!hotel) return total;

      const room = (hotel.rooms || []).find((entry) => entry.roomType === roomType);
      if (!room) return total;

      const roomCapacity = Number(room.capacity || 1);
      const roomCount = totalPassengers <= 3 ? 1 : Math.ceil(totalPassengers / roomCapacity);

      return total + ((Number(room.pricePerNight || 0) * Number(item.nights || 0)) * roomCount);
    }, 0);
  }

  handlePaypalAction() {
    const summary = this.getBookingSummary();
    alert(
      `Aquí conectarás PayPal.\n\n` +
      `Tour: ${summary.title}\n` +
      `Fecha: ${summary.date}\n` +
      `Adultos: ${summary.adults}\n` +
      `Niños: ${summary.children}\n` +
      `Alojamiento: ${summary.accommodation.join(" | ") || "No aplica"}\n` +
      `Extras: ${summary.extras.join(", ") || "Ninguno"}\n` +
      `Modalidad: ${summary.paymentMode}\n` +
      `Monto a pagar ahora: ${summary.payNow}\n` +
      `Pagarás luego: ${summary.payLater}`
    );
  }

  showBookingPreview() {
    const summary = this.getBookingSummary();
    alert(
      `Resumen de reserva:\n\n` +
      `Tour: ${summary.title}\n` +
      `Fecha: ${summary.date}\n` +
      `Adultos: ${summary.adults}\n` +
      `Niños: ${summary.children}\n` +
      `Alojamiento: ${summary.accommodation.join(" | ") || "No aplica"}\n` +
      `Extras: ${summary.extras.join(", ") || "Ninguno"}\n` +
      `Servicio total: ${summary.serviceTotal}\n` +
      `Pagarás ahora: ${summary.payNow}\n` +
      `Pagarás luego: ${summary.payLater}\n` +
      `Modalidad: ${summary.paymentMode}`
    );
  }

  getBookingSummary() {
    const currency = this.product.currency || "USD";
    const adultPrice = this.product.basePricing?.adult || 0;
    const childPrice = this.product.basePricing?.child || adultPrice;

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();
    const accommodationTotal = this.calculateAccommodationTotal();
    const serviceTotal = adultsTotal + childrenTotal + extrasTotal + accommodationTotal;

    const fullDiscountPercent = this.product.paymentOptions?.fullPaymentDiscountPercent || 0;
    const partialPerPerson = this.product.paymentOptions?.partialPaymentPerPerson || 49.9;

    let payNow = serviceTotal;
    let payLater = 0;

    if (this.paymentMode === "full") {
      payNow = serviceTotal - (serviceTotal * (fullDiscountPercent / 100));
      payLater = 0;
    } else {
      const totalPassengers = this.getTotalPassengers();
      payNow = totalPassengers * partialPerPerson;
      payLater = serviceTotal - payNow;
      if (payLater < 0) payLater = 0;
    }

    const selectedExtras = (this.product.extras || [])
      .filter((extra) => this.selectedExtras.has(extra.code))
      .map((extra) => extra.label);

    const accommodation = this.getAccommodationSummary(this.product).map((item) => {
      const hotel = this.getHotelByCode(item.destination, this.selectedHotelsByDestination[item.destination]);
      const room = (hotel?.rooms || []).find(
        (entry) => entry.roomType === this.selectedRoomsByDestination[item.destination]
      );

      if (!hotel || !room) return `${item.label || this.getDestinationLabel(item.destination)}: por confirmar`;

      return `${item.label || this.getDestinationLabel(item.destination)} - ${hotel.hotelName} - ${room.label}`;
    });

    return {
      title: this.product.title,
      date: this.date || "No seleccionada",
      adults: this.adults,
      children: this.children,
      accommodation,
      extras: selectedExtras,
      serviceTotal: `${currency} ${this.formatMoney(serviceTotal)}`,
      payNow: `${currency} ${this.formatMoney(payNow)}`,
      payLater: `${currency} ${this.formatMoney(payLater)}`,
      paymentMode: this.paymentMode === "full" ? "Pago completo" : "Separar cupo"
    };
  }

  renderNotFound(message) {
    const main = document.querySelector(".product-page");
    if (!main) return;

    main.innerHTML = `
      <section class="experience-content">
        <div class="container">
          <div class="experience-card">
            <h1>Experiencia no disponible</h1>
            <p>${this.escapeHtml(message)}</p>
            <br />
            <a class="btn" href="${this.resolvePath("all-experiences.html")}">Ver todas las experiencias</a>
          </div>
        </div>
      </section>
    `;
  }

  isPackage(product) {
    if (!product) return false;
    if (product.category === "paquetes") return true;
    if (typeof product.type === "string" && product.type.toLowerCase().includes("package")) return true;
    if (Array.isArray(product.accommodationPlan) && product.accommodationPlan.length > 0) return true;
    if (Array.isArray(product.accommodationSummary) && product.accommodationSummary.length > 0) return true;
    return false;
  }

  getAccommodationSummary(product) {
    if (!product) return [];

    if (Array.isArray(product.accommodationSummary) && product.accommodationSummary.length) {
      return product.accommodationSummary
        .map((item) => ({
          destination: item.destination,
          nights: Number(item.nights || 0),
          label: item.label || `${this.getDestinationLabel(item.destination)} - ${item.nights || 0} noche(s)`
        }))
        .filter((item) => item.destination && item.nights > 0);
    }

    if (Array.isArray(product.accommodationPlan) && product.accommodationPlan.length) {
      const grouped = product.accommodationPlan.reduce((acc, item) => {
        const destination = item.destination;
        if (!destination) return acc;
        if (!acc[destination]) {
          acc[destination] = {
            destination,
            nights: 0,
            label: this.getDestinationLabel(destination)
          };
        }
        acc[destination].nights += 1;
        return acc;
      }, {});

      return Object.values(grouped).map((item) => ({
        destination: item.destination,
        nights: item.nights,
        label: `${item.label} - ${item.nights} noche${item.nights > 1 ? "s" : ""}`
      }));
    }

    return [];
  }

  getHotelsByDestination(destination) {
    return this.hotelsData?.destinations?.[destination]?.hotels || [];
  }

  getHotelByCode(destination, hotelCode) {
    return this.getHotelsByDestination(destination).find((hotel) => hotel.hotelCode === hotelCode) || null;
  }

  getRoomOptionsForPassengers(rooms, passengers) {
    if (!Array.isArray(rooms) || !rooms.length) return [];

    if (passengers <= 1) {
      return rooms.filter((room) => Number(room.capacity) === 1);
    }

    if (passengers === 2) {
      return rooms.filter((room) => Number(room.capacity) === 2);
    }

    if (passengers === 3) {
      return rooms.filter((room) => Number(room.capacity) === 3);
    }

    return rooms.filter((room) => [1, 2, 3].includes(Number(room.capacity)));
  }

  getDestinationLabel(destination) {
    return this.hotelsData?.destinations?.[destination]?.label || destination || "Destino";
  }

  getTotalPassengers() {
    return this.adults + this.children;
  }

  insertAccommodationSummaryRow() {
    const summary = document.querySelector(".booking-summary");
    if (!summary || document.getElementById("accommodationRow")) return;

    const row = document.createElement("div");
    row.className = "booking-summary__line";
    row.id = "accommodationRow";
    row.innerHTML = `
      <span>Alojamiento</span>
      <strong id="accommodationTotal">USD 0.00</strong>
    `;

    const serviceTotalRow = document.getElementById("serviceTotal")?.closest(".booking-summary__line");
    if (serviceTotalRow) {
      summary.insertBefore(row, serviceTotalRow);
    } else {
      summary.appendChild(row);
    }
  }

  removeAccommodationSummaryRow() {
    document.getElementById("accommodationRow")?.remove();
  }

  removeAccommodationSection() {
    document.getElementById("accommodationSection")?.remove();
  }

  resolvePath(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/")) return path;
    return `${this.basePath}${String(path).replace(/^\.?\//, "")}`;
  }

  resolveAssetPath(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return this.resolvePath(path);
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  formatMoney(value) {
    return Number(value || 0).toFixed(2);
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
  window.MyCuscoTripProductPage = new MyCuscoTripProductPage();
});
