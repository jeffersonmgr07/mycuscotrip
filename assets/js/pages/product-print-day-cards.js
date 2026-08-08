/*
 * My Cusco Trip — plantilla de impresión por días (V99)
 *
 * Objetivo:
 * - No modifica el HTML normal del producto.
 * - No modifica precios, hoteles, trenes, reservas ni pagos.
 * - En impresión, convierte cada día de un circuito en una tarjeta con:
 *     1) badge "Día N"
 *     2) badge secundario con la fecha exacta calculada desde la fecha de inicio
 *     3) imagen correspondiente a ese día
 *
 * Productos habilitados actualmente:
 * - Perú Lima/Paracas/Ica/Cusco/Machu Picchu/Montaña de Colores 8D/7N
 * - Perú 7D/6N Humantay (se conserva la mejora existente)
 *
 * Para reutilizar esta plantilla en otro circuito basta con añadir su product.id
 * a PRINT_DAY_CARD_PRODUCT_IDS, siempre que tenga dailyItinerary (o itinerary)
 * con campo day e imágenes por día.
 */
(function () {
  "use strict";

  const PRINT_DAY_CARD_PRODUCT_IDS = new Set([
    "pkg_peru_8d7n_lima_cusco",
    "pkg_peru_7d6n_humantay"
  ]);

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

  function getLanguage() {
    return String(
      window.MyCuscoTripI18n?.getLocaleFromUrl?.()
      || document.documentElement.lang
      || "es"
    ).toLowerCase().split("-")[0];
  }

  function getLocale() {
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
    return locales[getLanguage()] || "es-PE";
  }

  function getSelectedStartDate(context) {
    // La fuente principal es el valor interno ISO YYYY-MM-DD que usa product.js.
    if (context?.date) return String(context.date);

    // Fallback defensivo por si en el futuro se guarda el ISO en el input.
    const input = document.getElementById("travelDate");
    const candidate = input?.dataset?.isoDate || input?.getAttribute?.("data-iso-date") || "";
    return String(candidate || "");
  }

  function formatDayDate(context, dayNumber) {
    const selectedDate = getSelectedStartDate(context);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return "";

    // Mediodía evita saltos de fecha por zona horaria/DST al parsear YYYY-MM-DD.
    const start = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(start.getTime())) return "";

    const date = new Date(start);
    date.setDate(start.getDate() + Math.max(Number(dayNumber || 1) - 1, 0));

    // En impresión mostramos siempre el año para que la fecha sea inequívoca.
    return date.toLocaleDateString(getLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
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

    const numbered = itinerary.filter((item) => Number.isFinite(Number(item?.day)));
    return numbered.length ? numbered : [];
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
    const source = collected[0]
      || gallery[index]
      || productImages.cover
      || context?.product?.image
      || context?.product?.fallbackImage
      || "./assets/img/placeholder/experience.jpg";

    return source && typeof context?.resolveAssetPath === "function"
      ? context.resolveAssetPath(source)
      : source;
  }

  function getDayLabel(context, dayNumber) {
    const translated = context?.t?.("product.print.dayLabel", "Día {n}", { n: dayNumber });
    if (translated && !String(translated).includes("{n}")) return String(translated);

    const languageLabels = {
      es: `Día ${dayNumber}`,
      en: `Day ${dayNumber}`,
      pt: `Dia ${dayNumber}`,
      fr: `Jour ${dayNumber}`,
      de: `Tag ${dayNumber}`,
      it: `Giorno ${dayNumber}`,
      ja: `${dayNumber}日目`,
      zh: `第${dayNumber}天`
    };
    return languageLabels[getLanguage()] || `Día ${dayNumber}`;
  }

  function renderDayCards(context) {
    const items = getDailyItems(context);
    if (!items.length) return "";

    return items.map((item, index) => {
      const dayNumber = Math.max(1, Number(item?.day || index + 1));
      const dayLabel = getDayLabel(context, dayNumber);
      const dateLabel = formatDayDate(context, dayNumber);
      const title = item?.title
        || context?.t?.("product.print.activityFallback", "Actividad {n}", { n: dayNumber })
        || `Actividad ${dayNumber}`;
      const description = item?.description || "";
      const image = getDayImage(context, item, index);

      return `<article class="print-itinerary-item print-itinerary-item--day-card-mct">
        ${image ? `<figure class="print-itinerary-day-image-mct"><img src="${escapeHtml(context, image)}" alt="${escapeHtml(context, `${dayLabel}: ${title}`)}" loading="eager" decoding="sync"></figure>` : ""}
        <div class="print-itinerary-day-content-mct">
          <div class="print-itinerary-day-meta-mct">
            <span class="print-itinerary-day-badge-mct">${escapeHtml(context, dayLabel)}</span>
            ${dateLabel ? `<span class="print-itinerary-day-date-badge-mct">${escapeHtml(context, dateLabel)}</span>` : ""}
          </div>
          <h3>${escapeHtml(context, title)}</h3>
          ${description ? `<p>${escapeHtml(context, description)}</p>` : ""}
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
        const done = () => resolve();
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
      });
    });

    return Promise.race([
      Promise.all(pending),
      new Promise((resolve) => window.setTimeout(resolve, timeoutMs))
    ]);
  }

  function isEnabledProduct(context) {
    const id = String(context?.product?.id || context?.product?.raw?.id || "");
    return PRINT_DAY_CARD_PRODUCT_IDS.has(id);
  }

  function patchPrint() {
    const page = window.MyCuscoTripProductPage;
    if (!page || page.__mctPrintDayCardsV99Applied) return Boolean(page);

    const proto = Object.getPrototypeOf(page) || page;
    const previousPrint = proto.printProductItineraryV78;
    if (typeof previousPrint !== "function") return false;

    proto.printProductItineraryV78 = function () {
      if (!isEnabledProduct(this)) {
        return previousPrint.apply(this, arguments);
      }

      // Conservamos el print real antes de que los parches anteriores lo intercepten.
      const realPrint = window.print.bind(window);
      let restored = false;
      const restorePrint = () => {
        if (restored) return;
        restored = true;
        window.print = realPrint;
      };

      // Los generadores previos de impresión llaman a window.print() automáticamente.
      // Lo bloqueamos hasta haber reemplazado el itinerario y cargado sus imágenes.
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
          area?.querySelector(".print-sheet")?.classList.add("print-sheet--day-cards-mct");
          area?.classList.add("is-preparing-print-day-cards-mct");
        }

        Promise.all([
          waitForImages(area, 3500),
          // Da tiempo a que terminen los setTimeout de impresión heredados.
          new Promise((resolve) => window.setTimeout(resolve, 520))
        ]).finally(() => {
          area?.classList.remove("is-preparing-print-day-cards-mct");
          restorePrint();
          window.setTimeout(() => realPrint(), 60);
        });
      } catch (error) {
        restorePrint();
        throw error;
      }

      // Salvaguarda para no dejar window.print interceptado ante una excepción externa.
      window.setTimeout(restorePrint, 5500);
      return result;
    };

    page.__mctPrintDayCardsV99Applied = true;
    return true;
  }

  if (!patchPrint()) {
    document.addEventListener("DOMContentLoaded", patchPrint, { once: true });
    [150, 500, 1000, 1800, 2800].forEach((delay) => window.setTimeout(patchPrint, delay));
  }
})();
