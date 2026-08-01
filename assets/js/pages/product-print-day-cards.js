/*
 * My Cusco Trip — ajuste exclusivo de impresión para el circuito
 * Perú: Lima, Paracas, Cusco, Machu Picchu y Humantay 7D/6N.
 *
 * No modifica precios, hoteles, trenes, reservas ni el itinerario web.
 */
(function () {
  "use strict";

  const TARGET_PRODUCT_ID = "pkg_peru_7d6n_humantay";

  function escapeHtml(context, value) {
    if (typeof context?.escapeHtml === "function") return context.escapeHtml(value ?? "");
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  function getLocale() {
    const lang = String(
      window.MyCuscoTripI18n?.getLocaleFromUrl?.()
      || document.documentElement.lang
      || "es"
    ).toLowerCase();

    const locales = {
      es: "es-PE",
      en: "en-US",
      pt: "pt-BR",
      fr: "fr-FR",
      de: "de-DE",
      it: "it-IT",
      zh: "zh-CN",
      ja: "ja-JP"
    };

    return locales[lang.split("-")[0]] || lang;
  }

  function formatDayDate(context, dayNumber) {
    if (!context?.date) return "";

    const start = new Date(`${context.date}T12:00:00`);
    if (Number.isNaN(start.getTime())) return "";

    const date = new Date(start);
    date.setDate(start.getDate() + Math.max(Number(dayNumber || 1) - 1, 0));

    const options = { day: "numeric", month: "long" };
    if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";

    return date.toLocaleDateString(getLocale(), options);
  }

  function getDailyItems(context) {
    const daily = Array.isArray(context?.product?.dailyItinerary)
      ? context.product.dailyItinerary
      : Array.isArray(context?.product?.raw?.dailyItinerary)
        ? context.product.raw.dailyItinerary
        : [];

    if (daily.length) return daily;

    const itinerary = Array.isArray(context?.product?.itinerary)
      ? context.product.itinerary
      : Array.isArray(context?.product?.raw?.itinerary)
        ? context.product.raw.itinerary
        : [];

    return itinerary.filter((item) => Number.isFinite(Number(item?.day)));
  }

  function getDayImage(context, item, index) {
    const collected = typeof context?.collectItineraryItemImages === "function"
      ? context.collectItineraryItemImages(item)
      : [
          item?.image,
          ...(Array.isArray(item?.images) ? item.images : []),
          item?.media?.image,
          ...(Array.isArray(item?.media?.images) ? item.media.images : [])
        ].filter(Boolean);

    const productImages = context?.product?.images || context?.product?.raw?.images || {};
    const gallery = Array.isArray(productImages.gallery) ? productImages.gallery : [];
    const source = collected[0] || gallery[index] || productImages.cover || context?.product?.image || "";

    return source && typeof context?.resolveAssetPath === "function"
      ? context.resolveAssetPath(source)
      : source;
  }

  function renderDayCards(context) {
    const items = getDailyItems(context);
    if (!items.length) return "";

    return items.map((item, index) => {
      const dayNumber = Math.max(1, Number(item?.day || index + 1));
      const dayLabel = context.t?.("product.print.dayLabel", "Día {n}", { n: dayNumber }) || `Día ${dayNumber}`;
      const dateLabel = formatDayDate(context, dayNumber);
      const title = item?.title || context.t?.("product.print.activityFallback", "Actividad {n}", { n: dayNumber }) || `Actividad ${dayNumber}`;
      const description = item?.description || "";
      const image = getDayImage(context, item, index);

      return `<article class="print-itinerary-item print-itinerary-item--day-card-mct">
        ${image ? `<figure class="print-itinerary-day-image-mct"><img src="${escapeHtml(context, image)}" alt="${escapeHtml(context, `${dayLabel}: ${title}`)}" loading="eager" decoding="sync"></figure>` : ""}
        <div class="print-itinerary-day-content-mct">
          <div class="print-itinerary-day-meta-mct">
            <span class="print-itinerary-day-badge-mct">${escapeHtml(context, dayLabel)}</span>
            ${dateLabel ? `<span class="print-itinerary-day-date-mct">${escapeHtml(context, dateLabel)}</span>` : ""}
          </div>
          <h3>${escapeHtml(context, title)}</h3>
          <p>${escapeHtml(context, description)}</p>
        </div>
      </article>`;
    }).join("");
  }

  function waitForImages(root, timeoutMs) {
    const images = Array.from(root?.querySelectorAll?.("img") || []);
    if (!images.length) return Promise.resolve();

    const pending = images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    });

    return Promise.race([
      Promise.all(pending),
      new Promise((resolve) => window.setTimeout(resolve, timeoutMs))
    ]);
  }

  function patchPrint() {
    const page = window.MyCuscoTripProductPage;
    if (!page || page.__mctPrintDayCardsOnlyApplied) return Boolean(page);

    const proto = Object.getPrototypeOf(page) || page;
    const previousPrint = proto.printProductItineraryV78;
    if (typeof previousPrint !== "function") return false;

    proto.printProductItineraryV78 = function () {
      if (String(this.product?.id || "") !== TARGET_PRODUCT_ID) {
        return previousPrint.apply(this, arguments);
      }

      const nativePrint = window.print.bind(window);
      let printRestored = false;
      const restorePrint = () => {
        if (printRestored) return;
        printRestored = true;
        window.print = nativePrint;
      };

      // Bloquea únicamente las llamadas automáticas previas mientras cargan las imágenes.
      window.print = function () {};

      let result;
      try {
        result = previousPrint.apply(this, arguments);

        const area = document.getElementById("productPrintArea");
        const list = area?.querySelector(".print-section--itinerary .print-itinerary-list");
        const cards = renderDayCards(this);

        if (list && cards) {
          list.innerHTML = cards;
          list.classList.add("print-itinerary-list--day-cards-mct");
          area.classList.add("is-preparing-print-day-cards-mct");
        }

        // Espera imágenes y, como mínimo, deja transcurrir las llamadas antiguas a print().
        Promise.all([
          waitForImages(area, 3000),
          new Promise((resolve) => window.setTimeout(resolve, 430))
        ]).finally(() => {
          area?.classList.remove("is-preparing-print-day-cards-mct");
          restorePrint();
          nativePrint();
        });
      } catch (error) {
        restorePrint();
        throw error;
      }

      window.setTimeout(restorePrint, 5000);
      return result;
    };

    page.__mctPrintDayCardsOnlyApplied = true;
    return true;
  }

  if (!patchPrint()) {
    document.addEventListener("DOMContentLoaded", patchPrint, { once: true });
    [150, 500, 1000, 1800].forEach((delay) => window.setTimeout(patchPrint, delay));
  }
})();
