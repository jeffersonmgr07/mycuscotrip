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

    this.serviceMode = "group";

    // Destino -> hotelCode
    this.selectedHotelsByDestination = {};
    // Destino -> combinación elegida
    this.selectedCombinationsByDestination = {};

    this.activeHotelModalDestination = null;

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

    if (!response.ok) {
      throw new Error("No se pudo cargar tours.json");
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("tours.json no contiene un array válido");
    }

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
        destinations:
          data.destinations && typeof data.destinations === "object"
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
    this.renderServiceModes(product);
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
        this.refreshAccommodationSelections();
        this.updatePricing();
      });
    });

    const paymentMode = document.getElementById("paymentMode");
    paymentMode?.addEventListener("change", () => {
      this.paymentMode = paymentMode.value;
      this.updatePricing();
    });

    const serviceModeSelect = document.getElementById("serviceMode");
    serviceModeSelect?.addEventListener("change", () => {
      this.serviceMode = serviceModeSelect.value;
      this.updatePricing();
    });

    document.getElementById("paypalButton")?.addEventListener("click", () => {
      this.handlePaypalAction();
    });

    document.getElementById("bookingPreviewButton")?.addEventListener("click", () => {
      this.showBookingPreview();
    });

    this.bindAccommodationEvents();
    this.bindHotelModalEvents();

    this.updatePassengersUI();
    this.refreshAccommodationSelections();
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
          <img src="${this.resolvePath("assets/img/tours/machu-picchu-full-day/cover.jpg")}" alt="Imagen referencial" />
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
      container.innerHTML = "";
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

  renderServiceModes(product) {
    const section = document.getElementById("serviceModeSection");
    const select = document.getElementById("serviceMode");
    const help = document.getElementById("serviceModeHelp");

    if (!section || !select) return;

    const modes = product.serviceModes || {};
    const groupEnabled = Boolean(modes.group?.enabled);
    const privateEnabled = Boolean(modes.private?.enabled);

    if (!groupEnabled && !privateEnabled) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    select.innerHTML = `
      ${groupEnabled ? `<option value="group">${this.escapeHtml(modes.group?.label || "Tour en grupo")}</option>` : ""}
      ${privateEnabled ? `<option value="private">${this.escapeHtml(modes.private?.label || "Tour privado")}</option>` : ""}
    `;

    this.serviceMode = groupEnabled ? "group" : "private";

    if (help) {
      help.textContent = privateEnabled
        ? "Selecciona si deseas viajar en servicio compartido o privado."
        : "Esta experiencia se ofrece actualmente en servicio grupal.";
    }
  }

  renderAccommodationOptions(product) {
    const section = document.getElementById("packageAccommodationSection");
    const summaryBox = document.getElementById("accommodationSummary");
    const container = document.getElementById("hotelSelectorsContainer");
    const roomTypeSection = document.getElementById("roomTypeSection");
    const hotelGallerySection = document.getElementById("selectedHotelGallerySection");

    if (!section || !summaryBox || !container || !roomTypeSection || !hotelGallerySection) return;

    section.hidden = true;
    summaryBox.hidden = true;
    container.innerHTML = "";
    roomTypeSection.hidden = true;
    hotelGallerySection.hidden = true;

    if (!this.isPackage(product)) return;

    const summary = this.getAccommodationSummary(product);
    if (!summary.length) return;

    section.hidden = false;
    summaryBox.hidden = false;
    summaryBox.innerHTML = summary
      .map((item) => `<p>${this.escapeHtml(item.label || this.getDestinationLabel(item.destination))}</p>`)
      .join("");

    container.innerHTML = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      const additionalPerPerson = this.calculateAccommodationAdditionalPerPerson(item.destination);

      return `
        <div class="booking-accommodation-card">
          <div class="booking-accommodation-card__header">
            <strong>${this.escapeHtml(item.label || this.getDestinationLabel(item.destination))}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="booking-accommodation-card__body">
            <p class="booking-accommodation-card__selected">
              ${selection?.hotel
                ? `${this.escapeHtml(selection.hotel.hotelName)} · ${selection.hotel.stars || 0}★`
                : "Sin hotel seleccionado"}
            </p>
            <p class="booking-accommodation-card__selected">
              ${selection?.combination
                ? this.escapeHtml(selection.combination.label)
                : "Acomodación por confirmar"}
            </p>
            <p class="booking-accommodation-card__price">
              + ${this.product.currency || "USD"} ${this.formatMoney(additionalPerPerson)} por persona
            </p>

            <button
              type="button"
              class="btn booking-secondary-btn open-hotel-modal-btn"
              data-destination="${this.escapeHtml(item.destination)}"
            >
              Elegir hotel
            </button>
          </div>
        </div>
      `;
    }).join("");

    roomTypeSection.hidden = false;
    this.renderRoomTypeSummary();
    this.renderSelectedHotelGallery();
  }

  bindAccommodationEvents() {
    document.querySelectorAll(".open-hotel-modal-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const destination = button.dataset.destination;
        this.openHotelModal(destination);
      });
    });
  }

  bindHotelModalEvents() {
    const modal = document.getElementById("hotelSelectionModal");
    const closeBtn = document.getElementById("closeHotelModalBtn");
    const cancelBtn = document.getElementById("cancelHotelModalBtn");

    if (!modal) return;

    closeBtn?.addEventListener("click", () => this.closeHotelModal());
    cancelBtn?.addEventListener("click", () => this.closeHotelModal());

    modal.querySelectorAll("[data-close-hotel-modal]").forEach((el) => {
      el.addEventListener("click", () => this.closeHotelModal());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        this.closeHotelModal();
      }
    });
  }

  openHotelModal(destination) {
    const modal = document.getElementById("hotelSelectionModal");
    const title = document.getElementById("hotelModalTitle");
    const subtitle = document.getElementById("hotelModalSubtitle");
    const list = document.getElementById("hotelModalList");

    if (!modal || !title || !subtitle || !list) return;

    this.activeHotelModalDestination = destination;

    const destinationLabel = this.getDestinationLabel(destination);
    const summaryItem = this.getAccommodationSummary(this.product).find((item) => item.destination === destination);
    const nights = Number(summaryItem?.nights || 0);

    title.textContent = `Elige tu hotel en ${destinationLabel}`;
    subtitle.textContent = `Compara hoteles, fotos y opciones de acomodación para ${nights} noche${nights !== 1 ? "s" : ""}. Las opciones están ordenadas de la más económica a la más cara.`;

    const hotels = this.getHotelsByDestination(destination);
    const passengers = this.getTotalPassengers();

    if (!hotels.length) {
      list.innerHTML = `<p>No hay hoteles configurados para este destino.</p>`;
      modal.hidden = false;
      document.body.classList.add("hotel-modal-open");
      return;
    }

    list.innerHTML = hotels.map((hotel) => {
      const combinations = this.generateAccommodationCombinations(hotel.rooms || [], passengers, nights);
      const currentHotelCode = this.selectedHotelsByDestination[destination];
      const currentCombinationKey = this.selectedCombinationsByDestination[destination]?.key;
      const isSelectedHotel = currentHotelCode === hotel.hotelCode;

      const images = [...new Set([
        ...(hotel.images?.cover ? [hotel.images.cover] : []),
        ...(Array.isArray(hotel.images?.gallery) ? hotel.images.gallery : [])
      ])];

      return `
        <article class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""}" data-hotel-card="${this.escapeHtml(hotel.hotelCode)}">
          <div class="hotel-option-card__header">
            <div>
              <h3>${this.escapeHtml(hotel.hotelName)}</h3>
              <p>${hotel.stars || 0}★ · ${this.escapeHtml(hotel.location || destinationLabel)}</p>
              ${hotel.address ? `<p>${this.escapeHtml(hotel.address)}</p>` : ""}
            </div>
            <div class="hotel-option-card__badge">
              ${combinations.length
                ? `Desde + ${this.product.currency || "USD"} ${this.formatMoney(combinations[0].additionalPerPerson)} por persona`
                : "Sin opciones válidas"}
            </div>
          </div>

          <div class="hotel-option-card__gallery">
            ${this.renderHotelModalGallery(images, hotel.hotelName)}
          </div>

          <div class="hotel-option-card__body">
            <label>Selecciona tipo habitación</label>

            <div class="hotel-option-card__options">
              ${combinations.length
                ? combinations.map((combo) => `
                    <button
                      type="button"
                      class="hotel-combo-btn ${isSelectedHotel && currentCombinationKey === combo.key ? "is-selected" : ""}"
                      data-destination="${this.escapeHtml(destination)}"
                      data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
                      data-combo-key="${this.escapeHtml(combo.key)}"
                    >
                      <span class="hotel-combo-btn__main">
                        ${this.escapeHtml(combo.label)}
                      </span>
                      <span class="hotel-combo-btn__sub">
                        ${combo.totalRooms} hab. · ${this.product.currency || "USD"} ${this.formatMoney(combo.totalPerNight)} / noche · + ${this.product.currency || "USD"} ${this.formatMoney(combo.additionalPerPerson)} por persona
                      </span>
                    </button>
                  `).join("")
                : `<p>No hay acomodaciones válidas para ${passengers} pasajero${passengers !== 1 ? "s" : ""}.</p>`
              }
            </div>
          </div>
        </article>
      `;
    }).join("");

    this.bindHotelModalSelectionEvents();
    this.bindHotelModalGalleryEvents();

    modal.hidden = false;
    document.body.classList.add("hotel-modal-open");
  }

  closeHotelModal() {
    const modal = document.getElementById("hotelSelectionModal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("hotel-modal-open");
    this.activeHotelModalDestination = null;
  }

  bindHotelModalSelectionEvents() {
    document.querySelectorAll(".hotel-combo-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const destination = button.dataset.destination;
        const hotelCode = button.dataset.hotelCode;
        const comboKey = button.dataset.comboKey;

        const hotel = this.getHotelByCode(destination, hotelCode);
        const summaryItem = this.getAccommodationSummary(this.product).find((item) => item.destination === destination);
        const combinations = this.generateAccommodationCombinations(
          hotel?.rooms || [],
          this.getTotalPassengers(),
          Number(summaryItem?.nights || 0)
        );
        const combo = combinations.find((item) => item.key === comboKey);

        if (!hotel || !combo) return;

        this.selectedHotelsByDestination[destination] = hotelCode;
        this.selectedCombinationsByDestination[destination] = combo;

        this.renderAccommodationOptions(this.product);
        this.bindAccommodationEvents();
        this.renderRoomTypeSummary();
        this.renderSelectedHotelGallery();
        this.updatePricing();
        this.closeHotelModal();
      });
    });
  }

  bindHotelModalGalleryEvents() {
    document.querySelectorAll(".hotel-gallery-prev, .hotel-gallery-next").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest("[data-hotel-card]");
        if (!card) return;

        const mainImg = card.querySelector(".hotel-gallery-main-img");
        if (!mainImg) return;

        const imagesRaw = card.dataset.images || "[]";
        let images = [];
        try {
          images = JSON.parse(imagesRaw);
        } catch {
          images = [];
        }

        if (!images.length) return;

        const currentIndex = Number(card.dataset.currentImageIndex || 0);
        const isNext = button.classList.contains("hotel-gallery-next");
        const nextIndex = isNext
          ? (currentIndex + 1) % images.length
          : (currentIndex - 1 + images.length) % images.length;

        card.dataset.currentImageIndex = String(nextIndex);
        mainImg.src = this.resolveAssetPath(images[nextIndex]);
      });
    });
  }

  renderHotelModalGallery(images, hotelName) {
    const finalImages = images.length
      ? images
      : ["assets/img/tours/machu-picchu-full-day/cover.jpg"];

    const mainImage = finalImages[0];
    const thumbs = finalImages.slice(1, 3);
    const imagesJson = this.escapeHtml(JSON.stringify(finalImages));

    return `
      <div class="hotel-gallery-main" data-images='${imagesJson}' data-current-image-index="0">
        <img
          class="hotel-gallery-main-img"
          src="${this.resolveAssetPath(mainImage)}"
          alt="${this.escapeHtml(hotelName)}"
          loading="lazy"
        />
        ${finalImages.length > 1 ? `
          <button type="button" class="hotel-gallery-nav hotel-gallery-prev" aria-label="Imagen anterior">‹</button>
          <button type="button" class="hotel-gallery-nav hotel-gallery-next" aria-label="Imagen siguiente">›</button>
        ` : ""}
      </div>
      ${thumbs.length ? thumbs.map((src, index) => `
        <div class="hotel-option-card__gallery-item">
          <img src="${this.resolveAssetPath(src)}" alt="${this.escapeHtml(hotelName)} - ${index + 2}" loading="lazy" />
        </div>
      `).join("") : ""}
    `;
  }

  refreshAccommodationSelections() {
    if (!this.product || !this.isPackage(this.product)) return;

    const summary = this.getAccommodationSummary(this.product);
    const passengers = this.getTotalPassengers();

    summary.forEach((item) => {
      const hotels = this.getHotelsByDestination(item.destination);
      if (!hotels.length) return;

      let hotelCode = this.selectedHotelsByDestination[item.destination];
      if (!hotelCode || !this.getHotelByCode(item.destination, hotelCode)) {
        hotelCode = hotels[0].hotelCode;
        this.selectedHotelsByDestination[item.destination] = hotelCode;
      }

      const hotel = this.getHotelByCode(item.destination, hotelCode);
      const combinations = this.generateAccommodationCombinations(
        hotel?.rooms || [],
        passengers,
        Number(item.nights || 0)
      );

      const currentComboKey = this.selectedCombinationsByDestination[item.destination]?.key;
      const validSelected = combinations.find((combo) => combo.key === currentComboKey);

      if (!validSelected) {
        this.selectedCombinationsByDestination[item.destination] = combinations[0] || null;
      }
    });

    this.renderAccommodationOptions(this.product);
    this.bindAccommodationEvents();
    this.renderRoomTypeSummary();
    this.renderSelectedHotelGallery();
  }

  renderRoomTypeSummary() {
    const section = document.getElementById("roomTypeSection");
    const select = document.getElementById("roomTypeSelect");
    const help = document.getElementById("roomTypeHelp");

    if (!section || !select || !help) return;

    if (!this.product || !this.isPackage(this.product)) {
      section.hidden = true;
      return;
    }

    const summary = this.getAccommodationSummary(this.product);
    if (!summary.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const options = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      return {
        value: `${item.destination}:${selection?.combination?.key || ""}`,
        label: `${item.label || this.getDestinationLabel(item.destination)} · ${selection?.hotel?.hotelName || "Hotel por confirmar"} · ${selection?.combination?.label || "Acomodación por confirmar"}`
      };
    });

    select.innerHTML = options.length
      ? options.map((item) => `<option value="${this.escapeHtml(item.value)}">${this.escapeHtml(item.label)}</option>`).join("")
      : `<option value="">Selecciona una habitación</option>`;

    help.textContent = "Resumen de hotel y acomodación seleccionados por destino.";
  }

  renderSelectedHotelGallery() {
    const section = document.getElementById("selectedHotelGallerySection");
    const info = document.getElementById("selectedHotelInfo");
    const gallery = document.getElementById("selectedHotelGallery");

    if (!section || !info || !gallery) return;

    if (!this.product || !this.isPackage(this.product)) {
      section.hidden = true;
      info.innerHTML = "";
      gallery.innerHTML = "";
      return;
    }

    const summary = this.getAccommodationSummary(this.product);
    if (!summary.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const infoHtml = [];
    const galleryHtml = [];

    summary.forEach((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      if (!selection?.hotel) return;

      infoHtml.push(`
        <div class="booking-hotel-preview-card">
          <div class="booking-hotel-preview-card__content">
            <strong>${this.escapeHtml(item.label || this.getDestinationLabel(item.destination))}</strong>
            <p>${this.escapeHtml(selection.hotel.hotelName)} (${selection.hotel.stars || 0}★)</p>
            <p>${this.escapeHtml(selection.hotel.location || "")}${selection.hotel.address ? ` · ${this.escapeHtml(selection.hotel.address)}` : ""}</p>
            <p>${this.escapeHtml(selection.combination?.label || "Acomodación por confirmar")}</p>
            <p>+ ${this.product.currency || "USD"} ${this.formatMoney(selection.combination?.additionalPerPerson || 0)} por persona</p>
          </div>
        </div>
      `);

      const cover = selection.hotel.images?.cover ? [selection.hotel.images.cover] : [];
      const galleryImages = Array.isArray(selection.hotel.images?.gallery) ? selection.hotel.images.gallery : [];
      const uniqueImages = [...new Set([...cover, ...galleryImages])].slice(0, 3);

      uniqueImages.forEach((src, index) => {
        galleryHtml.push(`
          <div class="booking-hotel-gallery__item">
            <img
              src="${this.resolveAssetPath(src)}"
              alt="${this.escapeHtml(selection.hotel.hotelName)} - ${index + 1}"
              loading="lazy"
            />
          </div>
        `);
      });
    });

    info.innerHTML = infoHtml.join("");
    gallery.innerHTML = galleryHtml.join("");
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
    const adultPrice = Number(this.product.basePricing?.adult || 0);
    const childPrice = Number(this.product.basePricing?.child || adultPrice);

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();
    const accommodationTotal = this.calculateAccommodationTotal();

    const serviceTotal = adultsTotal + childrenTotal + extrasTotal + accommodationTotal;

    const fullDiscountPercent = Number(this.product.paymentOptions?.fullPaymentDiscountPercent || 0);
    const partialPerPerson = Number(this.product.paymentOptions?.partialPaymentPerPerson || 49.9);

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

    const accommodationRow = document.getElementById("accommodationTotalRow");
    if (accommodationRow) {
      accommodationRow.hidden = !this.isPackage(this.product) || accommodationTotal <= 0;
    }

    const serviceModeSummaryRow = document.getElementById("serviceModeSummaryRow");
    if (serviceModeSummaryRow) {
      const hasVisibleMode = Boolean(
        this.product?.serviceModes?.group?.enabled ||
        this.product?.serviceModes?.private?.enabled
      );
      serviceModeSummaryRow.hidden = !hasVisibleMode;
    }

    this.setText(
      "serviceModeSummary",
      this.serviceMode === "private" ? "Tour privado" : "Tour en grupo"
    );

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

      const price = Number(extra.price || 0);
      if (extra.perPerson) return total + (price * passengers);
      return total + price;
    }, 0);
  }

  calculateAccommodationTotal() {
    if (!this.product || !this.isPackage(this.product)) return 0;

    const summary = this.getAccommodationSummary(this.product);

    return summary.reduce((total, item) => {
      const selectedCombo = this.selectedCombinationsByDestination[item.destination];
      if (!selectedCombo) return total;
      return total + Number(selectedCombo.totalForStay || 0);
    }, 0);
  }

  calculateAccommodationAdditionalPerPerson(destination) {
    const combo = this.selectedCombinationsByDestination[destination];
    return Number(combo?.additionalPerPerson || 0);
  }

  getBookingSummary() {
    const currency = this.product.currency || "USD";
    const adultPrice = Number(this.product.basePricing?.adult || 0);
    const childPrice = Number(this.product.basePricing?.child || adultPrice);

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();
    const accommodationTotal = this.calculateAccommodationTotal();
    const serviceTotal = adultsTotal + childrenTotal + extrasTotal + accommodationTotal;

    const fullDiscountPercent = Number(this.product.paymentOptions?.fullPaymentDiscountPercent || 0);
    const partialPerPerson = Number(this.product.paymentOptions?.partialPaymentPerPerson || 49.9);

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
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      if (!selection?.hotel || !selection?.combination) {
        return `${item.label || this.getDestinationLabel(item.destination)}: por confirmar`;
      }

      return `${item.label || this.getDestinationLabel(item.destination)} - ${selection.hotel.hotelName} - ${selection.combination.label}`;
    });

    return {
      title: this.product.title,
      date: this.date || "No seleccionada",
      adults: this.adults,
      children: this.children,
      serviceMode: this.serviceMode === "private" ? "Tour privado" : "Tour en grupo",
      accommodation,
      extras: selectedExtras,
      serviceTotal: `${currency} ${this.formatMoney(serviceTotal)}`,
      payNow: `${currency} ${this.formatMoney(payNow)}`,
      payLater: `${currency} ${this.formatMoney(payLater)}`,
      paymentMode: this.paymentMode === "full" ? "Pago completo" : "Separar cupo"
    };
  }

  handlePaypalAction() {
    const summary = this.getBookingSummary();
    alert(
      `Aquí conectarás PayPal.\n\n` +
      `Tour: ${summary.title}\n` +
      `Fecha: ${summary.date}\n` +
      `Adultos: ${summary.adults}\n` +
      `Niños: ${summary.children}\n` +
      `Modalidad servicio: ${summary.serviceMode}\n` +
      `Alojamiento: ${summary.accommodation.join(" | ") || "No aplica"}\n` +
      `Extras: ${summary.extras.join(", ") || "Ninguno"}\n` +
      `Modalidad pago: ${summary.paymentMode}\n` +
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
      `Modalidad servicio: ${summary.serviceMode}\n` +
      `Alojamiento: ${summary.accommodation.join(" | ") || "No aplica"}\n` +
      `Extras: ${summary.extras.join(", ") || "Ninguno"}\n` +
      `Servicio total: ${summary.serviceTotal}\n` +
      `Pagarás ahora: ${summary.payNow}\n` +
      `Pagarás luego: ${summary.payLater}\n` +
      `Modalidad pago: ${summary.paymentMode}`
    );
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

  getSelectedAccommodationForDestination(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];
    const hotel = this.getHotelByCode(destination, hotelCode);
    const combination = this.selectedCombinationsByDestination[destination] || null;
    return { hotel, combination };
  }

  getTotalPassengers() {
    return this.adults + this.children;
  }

  normalizeRoomDefinition(room) {
    return {
      roomType: String(room.roomType || ""),
      label: room.label || room.roomType || "Habitación",
      bedType: room.bedType || "",
      capacity: Number(room.capacity || 0),
      pricePerNight: Number(room.pricePerNight || 0)
    };
  }

  generateAccommodationCombinations(rooms, passengers, nights) {
    const defs = (Array.isArray(rooms) ? rooms : [])
      .map((room) => this.normalizeRoomDefinition(room))
      .filter((room) => room.capacity > 0 && room.pricePerNight >= 0)
      .sort((a, b) => a.capacity - b.capacity || a.pricePerNight - b.pricePerNight);

    if (!defs.length || passengers <= 0) return [];

    const results = [];
    const seen = new Set();

    const backtrack = (index, remainingPassengers, currentCounts) => {
      if (index === defs.length) {
        if (remainingPassengers === 0) {
          const used = currentCounts
            .map((count, i) => ({ room: defs[i], count }))
            .filter((entry) => entry.count > 0);

          if (!used.length) return;

          const key = used
            .map((entry) => `${entry.room.roomType}:${entry.count}`)
            .join("|");

          if (seen.has(key)) return;
          seen.add(key);

          const totalRooms = used.reduce((sum, entry) => sum + entry.count, 0);
          const totalPerNight = used.reduce(
            (sum, entry) => sum + (entry.room.pricePerNight * entry.count),
            0
          );
          const totalForStay = totalPerNight * Number(nights || 0);
          const additionalPerPerson = totalForStay / passengers;

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
            additionalPerPerson,
            label: this.buildCombinationLabel(used)
          });
        }
        return;
      }

      const room = defs[index];
      const maxCount = Math.ceil(remainingPassengers / room.capacity);

      for (let count = 0; count <= maxCount; count += 1) {
        const covered = count * room.capacity;
        if (covered > remainingPassengers) break;

        currentCounts[index] = count;
        backtrack(index + 1, remainingPassengers - covered, currentCounts);
      }

      currentCounts[index] = 0;
    };

    backtrack(0, passengers, new Array(defs.length).fill(0));

    return results.sort((a, b) => {
      if (a.totalPerNight !== b.totalPerNight) return a.totalPerNight - b.totalPerNight;
      if (a.totalRooms !== b.totalRooms) return a.totalRooms - b.totalRooms;
      return a.label.localeCompare(b.label, "es");
    });
  }

  buildCombinationLabel(usedRooms) {
    return usedRooms
      .map((entry) => `${entry.count} ${entry.room.label}${entry.count > 1 ? "s" : ""}`)
      .join(" + ");
  }

  refreshAccommodationSelections() {
    if (!this.product || !this.isPackage(this.product)) return;

    const summary = this.getAccommodationSummary(this.product);
    const passengers = this.getTotalPassengers();

    summary.forEach((item) => {
      const hotels = this.getHotelsByDestination(item.destination);
      if (!hotels.length) return;

      let hotelCode = this.selectedHotelsByDestination[item.destination];
      if (!hotelCode || !this.getHotelByCode(item.destination, hotelCode)) {
        hotelCode = hotels[0].hotelCode;
        this.selectedHotelsByDestination[item.destination] = hotelCode;
      }

      const hotel = this.getHotelByCode(item.destination, hotelCode);
      const combinations = this.generateAccommodationCombinations(
        hotel?.rooms || [],
        passengers,
        Number(item.nights || 0)
      );

      const selectedKey = this.selectedCombinationsByDestination[item.destination]?.key;
      const stillValid = combinations.find((combo) => combo.key === selectedKey);

      if (!stillValid) {
        this.selectedCombinationsByDestination[item.destination] = combinations[0] || null;
      }
    });

    this.renderAccommodationOptions(this.product);
    this.bindAccommodationEvents();
    this.renderRoomTypeSummary();
    this.renderSelectedHotelGallery();
  }

  renderRoomTypeSummary() {
    const section = document.getElementById("roomTypeSection");
    const select = document.getElementById("roomTypeSelect");
    const help = document.getElementById("roomTypeHelp");

    if (!section || !select || !help) return;

    if (!this.product || !this.isPackage(this.product)) {
      section.hidden = true;
      return;
    }

    const summary = this.getAccommodationSummary(this.product);
    if (!summary.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const options = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      return {
        value: `${item.destination}:${selection?.combination?.key || ""}`,
        label: `${item.label || this.getDestinationLabel(item.destination)} · ${selection?.hotel?.hotelName || "Hotel por confirmar"} · ${selection?.combination?.label || "Acomodación por confirmar"}`
      };
    });

    select.innerHTML = options.length
      ? options.map((item) => `<option value="${this.escapeHtml(item.value)}">${this.escapeHtml(item.label)}</option>`).join("")
      : `<option value="">Selecciona una habitación</option>`;

    help.textContent = "Resumen de hotel y acomodación seleccionados por destino.";
  }

  renderSelectedHotelGallery() {
    const section = document.getElementById("selectedHotelGallerySection");
    const info = document.getElementById("selectedHotelInfo");
    const gallery = document.getElementById("selectedHotelGallery");

    if (!section || !info || !gallery) return;

    if (!this.product || !this.isPackage(this.product)) {
      section.hidden = true;
      info.innerHTML = "";
      gallery.innerHTML = "";
      return;
    }

    const summary = this.getAccommodationSummary(this.product);
    if (!summary.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const infoHtml = [];
    const galleryHtml = [];

    summary.forEach((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      if (!selection?.hotel || !selection?.combination) return;

      infoHtml.push(`
        <div class="booking-hotel-preview-card">
          <div class="booking-hotel-preview-card__content">
            <strong>${this.escapeHtml(item.label || this.getDestinationLabel(item.destination))}</strong>
            <p>${this.escapeHtml(selection.hotel.hotelName)} (${selection.hotel.stars || 0}★)</p>
            <p>${this.escapeHtml(selection.hotel.location || "")}${selection.hotel.address ? ` · ${this.escapeHtml(selection.hotel.address)}` : ""}</p>
            <p>${this.escapeHtml(selection.combination.label)}</p>
            <p>+ ${this.product.currency || "USD"} ${this.formatMoney(selection.combination.additionalPerPerson)} por persona</p>
          </div>
        </div>
      `);

      const cover = selection.hotel.images?.cover ? [selection.hotel.images.cover] : [];
      const galleryImages = Array.isArray(selection.hotel.images?.gallery) ? selection.hotel.images.gallery : [];
      const uniqueImages = [...new Set([...cover, ...galleryImages])].slice(0, 3);

      uniqueImages.forEach((src, index) => {
        galleryHtml.push(`
          <div class="booking-hotel-gallery__item">
            <img
              src="${this.resolveAssetPath(src)}"
              alt="${this.escapeHtml(selection.hotel.hotelName)} - ${index + 1}"
              loading="lazy"
            />
          </div>
        `);
      });
    });

    info.innerHTML = infoHtml.join("");
    gallery.innerHTML = galleryHtml.join("");
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

  getDestinationLabel(destination) {
    return this.hotelsData?.destinations?.[destination]?.label || destination || "Destino";
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
