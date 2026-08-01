/* =========================================================
   My Cusco Trip — complemento puntual para pkg_peru_7d6n_humantay
   Permite retirar por destino los hoteles incluidos en la tarifa base
   y descuenta la asignación hotelera correspondiente por persona.
   No modifica trenes, itinerario, impresión ni otros productos.
   ========================================================= */
(function () {
  "use strict";

  const PACKAGE_ID = "pkg_peru_7d6n_humantay";

  const COPY = {
    es: {
      ownAccommodation: "El cliente organizará su propio alojamiento.",
      deductionPerPerson: "- {price} por persona",
      deductionTotal: "Se descontarán {total} del precio total ({price} por persona).",
      modalIntro: "El hotel base está incluido. Puedes mantenerlo, cambiarlo o elegir sin alojamiento; al retirar el hotel se descontará su valor incluido.",
      noAccommodationIn: "Sin alojamiento en {destination}",
      noAccommodationSummary: "Sin alojamiento",
      chooseNoAccommodation: "Elegir sin alojamiento",
      includedInBase: "Incluido en el precio base",
      noExtraDifference: "Sin diferencia adicional"
    },
    en: {
      ownAccommodation: "The customer will arrange their own accommodation.",
      deductionPerPerson: "- {price} per person",
      deductionTotal: "{total} will be deducted from the total price ({price} per person).",
      modalIntro: "The base hotel is included. You may keep it, change it or choose no accommodation; removing the hotel deducts its included value.",
      noAccommodationIn: "No accommodation in {destination}",
      noAccommodationSummary: "No accommodation",
      chooseNoAccommodation: "Choose no accommodation",
      includedInBase: "Included in the base price",
      noExtraDifference: "No additional difference"
    },
    pt: {
      ownAccommodation: "O cliente organizará sua própria hospedagem.",
      deductionPerPerson: "- {price} por pessoa",
      deductionTotal: "Serão descontados {total} do preço total ({price} por pessoa).",
      modalIntro: "O hotel base está incluído. Você pode mantê-lo, alterá-lo ou escolher sem hospedagem; ao retirar o hotel, o valor incluído será descontado.",
      noAccommodationIn: "Sem hospedagem em {destination}",
      noAccommodationSummary: "Sem hospedagem",
      chooseNoAccommodation: "Escolher sem hospedagem",
      includedInBase: "Incluído no preço base",
      noExtraDifference: "Sem diferença adicional"
    },
    fr: {
      ownAccommodation: "Le client organisera lui-même son hébergement.",
      deductionPerPerson: "- {price} par personne",
      deductionTotal: "{total} seront déduits du prix total ({price} par personne).",
      modalIntro: "L’hôtel de base est inclus. Vous pouvez le conserver, le modifier ou choisir sans hébergement ; sa valeur incluse sera alors déduite.",
      noAccommodationIn: "Sans hébergement à {destination}",
      noAccommodationSummary: "Sans hébergement",
      chooseNoAccommodation: "Choisir sans hébergement",
      includedInBase: "Inclus dans le prix de base",
      noExtraDifference: "Sans différence supplémentaire"
    },
    de: {
      ownAccommodation: "Der Kunde organisiert seine Unterkunft selbst.",
      deductionPerPerson: "- {price} pro Person",
      deductionTotal: "{total} werden vom Gesamtpreis abgezogen ({price} pro Person).",
      modalIntro: "Das Basishotel ist enthalten. Sie können es beibehalten, wechseln oder ohne Unterkunft buchen; der enthaltene Hotelwert wird dann abgezogen.",
      noAccommodationIn: "Ohne Unterkunft in {destination}",
      noAccommodationSummary: "Ohne Unterkunft",
      chooseNoAccommodation: "Ohne Unterkunft wählen",
      includedInBase: "Im Grundpreis enthalten",
      noExtraDifference: "Kein zusätzlicher Aufpreis"
    },
    it: {
      ownAccommodation: "Il cliente organizzerà autonomamente il proprio alloggio.",
      deductionPerPerson: "- {price} a persona",
      deductionTotal: "Saranno detratti {total} dal prezzo totale ({price} a persona).",
      modalIntro: "L’hotel base è incluso. Puoi mantenerlo, cambiarlo o scegliere senza alloggio; rimuovendolo verrà detratto il valore incluso.",
      noAccommodationIn: "Senza alloggio a {destination}",
      noAccommodationSummary: "Senza alloggio",
      chooseNoAccommodation: "Scegli senza alloggio",
      includedInBase: "Incluso nel prezzo base",
      noExtraDifference: "Nessuna differenza aggiuntiva"
    },
    zh: {
      ownAccommodation: "客人将自行安排住宿。",
      deductionPerPerson: "每人减 {price}",
      deductionTotal: "总价将减去 {total}（每人 {price}）。",
      modalIntro: "基础酒店已包含。您可以保留、更换或选择不含住宿；取消酒店后将扣除已包含的酒店费用。",
      noAccommodationIn: "{destination} 不含住宿",
      noAccommodationSummary: "不含住宿",
      chooseNoAccommodation: "选择不含住宿",
      includedInBase: "已包含在基础价格中",
      noExtraDifference: "无额外差价"
    },
    ja: {
      ownAccommodation: "宿泊はお客様ご自身で手配します。",
      deductionPerPerson: "1名あたり - {price}",
      deductionTotal: "合計金額から {total} を差し引きます（1名あたり {price}）。",
      modalIntro: "基本ホテルは料金に含まれています。維持・変更・宿泊なしを選択でき、宿泊を外すと含まれているホテル代が差し引かれます。",
      noAccommodationIn: "{destination}：宿泊なし",
      noAccommodationSummary: "宿泊なし",
      chooseNoAccommodation: "宿泊なしを選択",
      includedInBase: "基本料金に含まれています",
      noExtraDifference: "追加差額なし"
    }
  };

  function localeOf(page) {
    const raw = String(page?.getLocale?.() || document.documentElement.lang || "es").toLowerCase();
    if (raw.startsWith("en")) return "en";
    if (raw.startsWith("pt")) return "pt";
    if (raw.startsWith("fr")) return "fr";
    if (raw.startsWith("de")) return "de";
    if (raw.startsWith("it")) return "it";
    if (raw.startsWith("zh")) return "zh";
    if (raw.startsWith("ja")) return "ja";
    return "es";
  }

  function text(page, key, params = {}) {
    const dictionary = COPY[localeOf(page)] || COPY.es;
    let value = dictionary[key] || COPY.es[key] || key;
    Object.entries(params).forEach(([name, replacement]) => {
      value = value.replace(new RegExp(`\\{${name}\\}`, "g"), String(replacement));
    });
    return value;
  }

  function isTarget(ctx, product) {
    const source = product || ctx?.product || {};
    return String(source?.id || source?.raw?.id || "") === PACKAGE_ID;
  }

  function patch() {
    const page = window.MyCuscoTripProductPage;
    if (!page) return false;
    if (page.__mctV94NoAccommodationApplied) return true;

    const proto = Object.getPrototypeOf(page);
    if (!proto || typeof proto.getV94HotelConfig !== "function") return false;

    const previousCalculateAccommodationAdditionalPerPerson = proto.calculateAccommodationAdditionalPerPerson;
    const previousCalculateAccommodationTotal = proto.calculateAccommodationTotal;
    const previousRenderAccommodationOptions = proto.renderAccommodationOptions;
    const previousOpenHotelModal = proto.openHotelModal;

    const esc = (ctx, value) => ctx.escapeHtml?.(value) || String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

    const money = (ctx, value) => ctx.formatMoney?.(Number(value || 0)) || Number(value || 0).toFixed(2);
    const currencyLabel = (ctx, amount) => `${ctx.product?.currency || "USD"} ${money(ctx, amount)}`;

    proto.getV94NoHotelDefinition = function (destination, passengers) {
      const destinationLabel = this.getDestinationLabel?.(destination) || destination;
      return {
        hotelCode: "no-hotel",
        hotelName: text(this, "noAccommodationSummary"),
        stars: 0,
        location: destinationLabel,
        address: "",
        images: { cover: "", gallery: [] },
        amenities: { checkin: "", checkout: "", breakfast: "" },
        rooms: [{
          roomType: "no-hotel",
          label: text(this, "chooseNoAccommodation"),
          bedType: "",
          capacity: Math.max(Number(passengers || 1), 1),
          pricePerNight: 0,
          helperText: text(this, "ownAccommodation")
        }]
      };
    };

    proto.getV94HotelAdjustmentPerPerson = function (destination, combination, hotelCode) {
      const selectedCode = String(hotelCode || this.selectedHotelsByDestination?.[destination] || "");
      const included = Number(this.getV94IncludedHotelAllowance?.(destination) || 0);
      if (selectedCode === "no-hotel") return -included;
      return Math.max(0, Number(combination?.additionalPerPerson || 0) - included);
    };

    // Preserve the V94 method name because other V94 rendering functions already call it.
    proto.getV94HotelUpgradePerPerson = function (destination, combination, hotelCode) {
      return this.getV94HotelAdjustmentPerPerson?.(destination, combination, hotelCode) || 0;
    };

    proto.ensureV94DefaultHotels = function () {
      if (!isTarget(this)) return;

      const config = this.getV94HotelConfig?.() || {};
      const defaults = config.defaultHotelCodes || this.product?.defaultHotelsByDestination || {};
      const summary = this.getAccommodationSummary?.(this.product) || [];
      const passengers = Math.max(1, Number(this.getTotalPassengers?.() || 1));

      summary.forEach((item) => {
        const destination = String(item.destination || "");
        const defaultCode = String(defaults[destination] || "");
        let hotelCode = String(this.selectedHotelsByDestination?.[destination] || "");

        // Only an empty selection receives the default hotel. An explicit no-hotel
        // choice must never be overwritten by a refresh or passenger change.
        if (!hotelCode) {
          hotelCode = defaultCode;
          if (hotelCode) this.selectedHotelsByDestination[destination] = hotelCode;
        }

        if (hotelCode === "no-hotel") {
          const noHotel = this.getV94NoHotelDefinition?.(destination, passengers);
          const combinations = this.generateAccommodationCombinations?.(
            noHotel?.rooms || [],
            passengers,
            Number(item.nights || 0)
          ) || [];
          this.selectedCombinationsByDestination[destination] = combinations[0] || null;
          return;
        }

        const hotel = this.getHotelByCode?.(destination, hotelCode) || this.getHotelByCode?.(destination, defaultCode);
        if (!hotel) return;

        if (hotel.hotelCode !== hotelCode) {
          hotelCode = hotel.hotelCode;
          this.selectedHotelsByDestination[destination] = hotelCode;
        }

        const combinations = this.generateAccommodationCombinations?.(
          hotel.rooms || [],
          passengers,
          Number(item.nights || 0)
        ) || [];

        const selectedKey = this.selectedCombinationsByDestination?.[destination]?.key;
        const selected = combinations.find((combo) => combo.key === selectedKey);
        this.selectedCombinationsByDestination[destination] = selected || combinations[0] || null;
      });
    };

    proto.calculateAccommodationAdditionalPerPerson = function (destination) {
      if (!isTarget(this)) {
        return previousCalculateAccommodationAdditionalPerPerson?.apply(this, arguments) || 0;
      }
      this.ensureV94DefaultHotels?.();
      const combination = this.selectedCombinationsByDestination?.[destination] || null;
      const hotelCode = this.selectedHotelsByDestination?.[destination] || "";
      return this.getV94HotelAdjustmentPerPerson?.(destination, combination, hotelCode) || 0;
    };

    proto.calculateAccommodationTotal = function () {
      if (!isTarget(this)) {
        return previousCalculateAccommodationTotal?.apply(this, arguments) || 0;
      }
      this.ensureV94DefaultHotels?.();
      const passengers = Math.max(1, Number(this.getTotalPassengers?.() || 1));
      const summary = this.getAccommodationSummary?.(this.product) || [];

      return summary.reduce((total, item) => {
        const destination = String(item.destination || "");
        const combination = this.selectedCombinationsByDestination?.[destination] || null;
        const hotelCode = this.selectedHotelsByDestination?.[destination] || "";
        const adjustmentPerPerson = this.getV94HotelAdjustmentPerPerson?.(destination, combination, hotelCode) || 0;
        return total + (adjustmentPerPerson * passengers);
      }, 0);
    };

    proto.renderAccommodationOptions = function (product) {
      if (!isTarget(this, product)) {
        return previousRenderAccommodationOptions?.apply(this, arguments);
      }

      this.ensureV94DefaultHotels?.();
      const section = document.getElementById("packageAccommodationSection");
      const container = document.getElementById("hotelSelectorsContainer");
      if (!section || !container) return;

      const summary = this.getAccommodationSummary?.(product || this.product) || [];
      if (!summary.length) {
        section.hidden = true;
        container.innerHTML = "";
        return;
      }

      section.hidden = false;
      section.classList.add("booking-field--included-hotels-v94");

      container.innerHTML = summary.map((item) => {
        const destination = String(item.destination || "");
        const hotelCode = String(this.selectedHotelsByDestination?.[destination] || "");
        const isNoHotel = hotelCode === "no-hotel";
        const selection = isNoHotel ? {} : (this.getSelectedAccommodationForDestination?.(destination) || {});
        const hotel = selection.hotel;
        const combination = this.selectedCombinationsByDestination?.[destination] || selection.combination || null;
        const destinationLabel = this.getDestinationLabel?.(destination) || destination;
        const cardTitle = this.t("product.hotelInDestination", "Hotel en {destination}", { destination: destinationLabel });
        const adjustmentPerPerson = this.getV94HotelAdjustmentPerPerson?.(destination, combination, hotelCode) || 0;
        const image = hotel?.images?.cover || hotel?.images?.gallery?.[0] || "";
        const priceText = adjustmentPerPerson < 0
          ? text(this, "deductionPerPerson", { price: currencyLabel(this, Math.abs(adjustmentPerPerson)) })
          : adjustmentPerPerson > 0
            ? this.t("product.upgradePerPersonAmount", "+ {price} por persona", { price: currencyLabel(this, adjustmentPerPerson) })
            : this.t("product.hotelIncludedInPrice", text(this, "includedInBase"));

        return `<div class="booking-accommodation-card booking-accommodation-card--selected booking-accommodation-card--included-v94 ${isNoHotel ? "booking-accommodation-card--no-hotel-v96" : ""}">
          ${image && !isNoHotel ? `<div class="booking-accommodation-card__thumb"><img src="${esc(this, this.resolveAssetPath?.(image) || image)}" alt="${esc(this, hotel?.hotelName || destinationLabel)}" loading="lazy" /></div>` : ""}
          <div class="booking-accommodation-card__header">
            <strong>${esc(this, cardTitle)}</strong>
            <small>${Number(item.nights || 0)} ${esc(this, this.t(Number(item.nights || 0) === 1 ? "product.night" : "product.nights", Number(item.nights || 0) === 1 ? "noche" : "noches"))}</small>
          </div>
          <div class="booking-accommodation-card__body">
            <p class="booking-accommodation-card__selected">${esc(this, isNoHotel ? text(this, "noAccommodationSummary") : (hotel?.hotelName || this.t("product.accommodationPending", "Alojamiento según disponibilidad")))}${!isNoHotel && hotel?.stars ? ` · ${this.renderStars?.(hotel.stars) || `${hotel.stars}★`}` : ""}</p>
            <p class="booking-accommodation-card__selected">${esc(this, isNoHotel ? text(this, "ownAccommodation") : (combination?.label || this.t("product.selectRoomAvailability", "Habitación según disponibilidad")))}</p>
            <p class="booking-accommodation-card__price ${adjustmentPerPerson < 0 ? "booking-accommodation-card__price--deduction-v96" : ""}">${esc(this, priceText)}</p>
            <button type="button" class="btn booking-secondary-btn open-hotel-modal-btn" data-destination="${esc(this, destination)}">
              <i class="fas fa-hotel" aria-hidden="true"></i>
              ${esc(this, this.t("product.changeHotel", "Cambiar hotel"))}
            </button>
          </div>
        </div>`;
      }).join("");

      this.bindAccommodationEvents?.();
    };

    proto.openHotelModal = function (destination) {
      if (!isTarget(this)) {
        return previousOpenHotelModal?.apply(this, arguments);
      }

      this.ensureV94DefaultHotels?.();

      const modal = document.getElementById("hotelSelectionModal");
      const title = document.getElementById("hotelModalTitle");
      const subtitle = document.getElementById("hotelModalSubtitle");
      const list = document.getElementById("hotelModalList");
      const cancelBtn = document.getElementById("cancelHotelModalBtn");
      if (!modal || !title || !subtitle || !list) return;

      this.activeHotelModalDestination = destination;
      if (cancelBtn) cancelBtn.textContent = this.t("product.selectHotelRoom", "Seleccionar hotel y habitación");

      const destinationLabel = this.getDestinationLabel?.(destination) || destination;
      const summaryItem = (this.getAccommodationSummary?.(this.product) || []).find((item) => item.destination === destination);
      const nights = Number(summaryItem?.nights || 0);
      const passengers = Math.max(1, Number(this.getTotalPassengers?.() || 1));
      const config = this.getV94HotelConfig?.() || {};
      const defaultCode = String(config?.defaultHotelCodes?.[destination] || this.product?.defaultHotelsByDestination?.[destination] || "");
      const currentHotelCode = String(this.selectedHotelsByDestination?.[destination] || defaultCode);
      const currentCombinationKey = String(this.selectedCombinationsByDestination?.[destination]?.key || "");
      const noHotel = this.getV94NoHotelDefinition?.(destination, passengers);
      const hotels = [noHotel, ...(this.getHotelsByDestination?.(destination) || []).filter((hotel) => hotel?.hotelCode && hotel.hotelCode !== "no-hotel")];

      title.textContent = this.t("product.chooseHotelInDestination", "Elige tu hotel en {destination}", { destination: destinationLabel });
      subtitle.textContent = text(this, "modalIntro");

      list.innerHTML = hotels.map((hotel) => {
        const isNoHotel = hotel.hotelCode === "no-hotel";
        const combinations = this.generateAccommodationCombinations?.(hotel.rooms || [], passengers, nights) || [];
        const isSelectedHotel = currentHotelCode === hotel.hotelCode;
        const initialCombo = combinations.find((combo) => isSelectedHotel && combo.key === currentCombinationKey) || combinations[0] || null;
        const images = [...new Set([
          ...(hotel.images?.cover ? [hotel.images.cover] : []),
          ...(Array.isArray(hotel.images?.gallery) ? hotel.images.gallery : [])
        ])];
        const adjustmentPerPerson = this.getV94HotelAdjustmentPerPerson?.(destination, initialCombo, hotel.hotelCode) || 0;
        const isBaseHotel = hotel.hotelCode === defaultCode;
        const badgeText = adjustmentPerPerson < 0
          ? text(this, "deductionPerPerson", { price: currencyLabel(this, Math.abs(adjustmentPerPerson)) })
          : adjustmentPerPerson > 0
            ? this.t("product.upgradePerPersonAmount", "+ {price} por persona", { price: currencyLabel(this, adjustmentPerPerson) })
            : (isBaseHotel ? this.t("product.hotelIncludedInPrice", text(this, "includedInBase")) : text(this, "noExtraDifference"));

        return `<article class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""} ${isNoHotel ? "hotel-option-card--no-hotel hotel-option-card--deduction-v96" : "hotel-option-card--included-v94"}" data-hotel-card="${esc(this, hotel.hotelCode)}" data-destination="${esc(this, destination)}" data-hotel-code="${esc(this, hotel.hotelCode)}" data-selected-combo-key="${esc(this, initialCombo?.key || "")}">
          <div class="hotel-option-card__header">
            <div>
              <h3>${esc(this, isNoHotel ? text(this, "noAccommodationIn", { destination: destinationLabel }) : (hotel.hotelName || this.t("quote.hotelGeneric", "Hotel")))}</h3>
              ${isNoHotel ? `<p>${esc(this, text(this, "ownAccommodation"))}</p>` : `<p>${this.renderStars?.(hotel.stars || 0) || `${hotel.stars || 0}★`} · ${esc(this, hotel.location || destinationLabel)}</p>${hotel.summary ? `<p>${esc(this, hotel.summary)}</p>` : ""}`}
            </div>
            <div class="hotel-option-card__badge ${adjustmentPerPerson <= 0 ? "hotel-option-card__badge--included" : ""} ${adjustmentPerPerson < 0 ? "hotel-option-card__badge--deduction-v96" : ""}">${esc(this, badgeText)}</div>
          </div>
          <div class="hotel-option-card__content ${isNoHotel ? "hotel-option-card__content--no-hotel" : ""}">
            ${isNoHotel ? "" : `<div class="hotel-option-card__media"><div class="hotel-option-card__gallery">${this.renderHotelModalGallery?.(images, hotel.hotelName || this.t("quote.hotelGeneric", "Hotel")) || ""}</div>${this.renderHotelFeatures?.(hotel) || ""}</div>`}
            <div class="hotel-option-card__body ${isNoHotel ? "hotel-option-card__body--no-hotel" : ""}">
              ${isNoHotel ? "" : `<label>${esc(this, this.t("booking.selectRoomType", "Selecciona tipo de habitación"))}</label>`}
              <div class="hotel-option-card__options">
                ${combinations.length ? combinations.map((combo) => {
                  const adjustment = this.getV94HotelAdjustmentPerPerson?.(destination, combo, hotel.hotelCode) || 0;
                  const adjustmentTotal = adjustment * passengers;
                  const roomsText = `${combo.totalRooms} ${this.t(combo.totalRooms === 1 ? "product.room" : "product.rooms", combo.totalRooms === 1 ? "habitación" : "habitaciones")}`;
                  const subText = isNoHotel
                    ? text(this, "deductionTotal", {
                        total: currencyLabel(this, Math.abs(adjustmentTotal)),
                        price: currencyLabel(this, Math.abs(adjustment))
                      })
                    : adjustment > 0
                      ? this.t("product.roomsUpgradeTotal", "{rooms} | Upgrade total + {price} · {pricePerPerson} por persona", {
                          rooms: roomsText,
                          price: currencyLabel(this, adjustmentTotal),
                          pricePerPerson: currencyLabel(this, adjustment)
                        })
                      : this.t("product.roomsIncludedInBasePrice", "{rooms} | Incluido en el precio base", { rooms: roomsText });

                  return `<button type="button" class="hotel-combo-btn ${isSelectedHotel && currentCombinationKey === combo.key ? "is-selected" : ""}" data-destination="${esc(this, destination)}" data-hotel-code="${esc(this, hotel.hotelCode)}" data-combo-key="${esc(this, combo.key)}">
                    <span class="hotel-combo-radio" aria-hidden="true"></span>
                    <span class="hotel-combo-btn__main">${esc(this, isNoHotel ? text(this, "chooseNoAccommodation") : combo.label)}</span>
                    <span class="hotel-combo-btn__sub">${esc(this, subText)}</span>
                  </button>`;
                }).join("") : `<p>${esc(this, this.t("product.noValidRoomsForTravelers", "No hay habitaciones válidas para {count} viajeros.", { count: passengers }))}</p>`}
              </div>
            </div>
          </div>
        </article>`;
      }).join("");

      this.bindHotelModalSelectionEvents?.();
      this.bindHotelModalGalleryEvents?.();
      modal.hidden = false;
      document.body.classList.add("hotel-modal-open");
    };

    const previousGetBookingSummary = proto.getBookingSummary;
    proto.getBookingSummary = function () {
      const result = previousGetBookingSummary?.apply(this, arguments) || {};
      if (!isTarget(this)) return result;

      result.accommodation = (this.getAccommodationSummary?.(this.product) || []).map((item) => {
        const destination = String(item.destination || "");
        const hotelCode = String(this.selectedHotelsByDestination?.[destination] || "");
        const label = item.label || this.getDestinationLabel?.(destination) || destination;
        if (hotelCode === "no-hotel") return `${label} - ${text(this, "noAccommodationSummary")}`;
        const selection = this.getSelectedAccommodationForDestination?.(destination);
        if (!selection?.hotel || !selection?.combination) return null;
        return `${label} - ${selection.hotel.hotelName} - ${selection.combination.label}`;
      }).filter(Boolean);

      return result;
    };

    page.__mctV94NoAccommodationApplied = true;

    const refresh = () => {
      try {
        if (!isTarget(page)) return;
        page.ensureV94DefaultHotels?.();
        page.renderAccommodationOptions?.(page.product);
        page.updatePricing?.();
      } catch (error) {
        console.warn("MCT no-accommodation patch warning:", error);
      }
    };

    refresh();
    [250, 700, 1400, 2400].forEach((delay) => window.setTimeout(refresh, delay));
    return true;
  }

  if (!patch()) {
    document.addEventListener("DOMContentLoaded", patch);
    [100, 350, 800, 1500, 2600].forEach((delay) => window.setTimeout(patch, delay));
  }
})();
