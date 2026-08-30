/*
 * My Cusco Trip — PRINT ONLY V102
 * Machu Picchu Overnight Clásico
 *
 * Alcance EXCLUSIVO del formato de impresión:
 * - agrega encabezados Día 1 / Día 2 con la fecha real seleccionada;
 * - conserva todas las actividades y sus horas;
 * - agrega la fecha de viaje a las tarjetas de tren de ida y retorno;
 * - agrega la fecha de la noche en la tarjeta del hotel;
 * - no modifica la vista web, precios, reservas, trenes, hoteles ni estilos CSS.
 */
(function () {
  "use strict";

  const TARGET_SLUGS = new Set([
    "machu-picchu-overnight-clasico",
    "machu-picchu-overnight-classic"
  ]);
  const TARGET_CODE = "MAPI003";

  function applyPatch() {
    const page = window.MyCuscoTripProductPage;
    if (!page) return false;

    const proto = Object.getPrototypeOf(page) || page;
    if (proto.__mctPrintOnlyOvernightDatesV102Applied) return true;

    const previousPrint = proto.printProductItineraryV78;
    if (typeof previousPrint !== "function") return false;

    const escapeHtml = (ctx, value) => {
      if (typeof ctx?.escapeHtml === "function") return ctx.escapeHtml(value ?? "");
      return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
      }[char]));
    };

    function currentSlug(ctx) {
      const fromProduct = String(ctx?.product?.slug || ctx?.slug || "").trim();
      if (fromProduct) return fromProduct;
      try {
        return String(new URL(window.location.href).searchParams.get("slug") || "").trim();
      } catch (_) {
        return "";
      }
    }

    function productCode(ctx) {
      return String(
        ctx?.product?.internalCode
        || ctx?.product?.code
        || ctx?.product?.raw?.internalCode
        || ctx?.product?.raw?.code
        || ""
      ).trim().toUpperCase();
    }

    function isTarget(ctx) {
      return productCode(ctx) === TARGET_CODE || TARGET_SLUGS.has(currentSlug(ctx));
    }

    function isEnglish(ctx) {
      return String(ctx?.getLocale?.() || document.documentElement.lang || "es").toLowerCase().startsWith("en");
    }

    function parseTripDate(value) {
      const raw = String(value || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
      const date = new Date(`${raw}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function addDays(date, amount) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
      const copy = new Date(date);
      copy.setDate(copy.getDate() + Number(amount || 0));
      return copy;
    }

    function formatDate(ctx, date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString(isEnglish(ctx) ? "en-US" : "es-PE", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }

    function getTripDates(ctx) {
      const day1 = parseTripDate(ctx?.date);
      return { day1, day2: day1 ? addDays(day1, 1) : null };
    }

    function selectedOutbound(ctx) {
      return ctx?.getSelectedOutboundTrain?.()
        || ctx?.findTrainById?.(ctx?.selectedOutboundTrainId, ctx?.availableOutboundTrains)
        || null;
    }

    function selectedReturn(ctx) {
      return ctx?.getSelectedReturnTrain?.()
        || ctx?.findTrainById?.(ctx?.selectedReturnTrainId, ctx?.availableReturnTrains)
        || null;
    }

    function trainStation(train, key, fallback) {
      const raw = train?.raw || {};
      const value = raw[key] || train?.[key] || fallback || "";
      const map = {
        OLLA_MAPI: "Ollantaytambo",
        MAPI_OLLA: "Ollantaytambo",
        CUSCO_MAPI: "Cusco",
        MAPI_CUSCO: "Cusco",
        URU_MAPI: "Urubamba",
        MAPI_URU: "Urubamba",
        HIDRO_MAPI: "Hidroeléctrica",
        MAPI_HIDRO: "Hidroeléctrica",
        MAPI: "Machu Picchu",
        OLLA: "Ollantaytambo"
      };
      return map[String(value || "").trim()] || String(value || fallback || "");
    }

    function trainCompany(train) {
      return String(train?.companyName || train?.company || train?.raw?.companyName || "").trim();
    }

    function trainName(train) {
      return String(train?.label || train?.serviceName || train?.raw?.serviceName || "").trim();
    }

    function format24HourToPrint(timeValue) {
      const raw = String(timeValue || "").trim();
      const match = raw.match(/^(\d{1,2})\s*[:.]\s*(\d{2})$/);
      if (!match) return raw;
      const hour24 = Number(match[1]);
      const minute = Number(match[2]);
      if (hour24 > 23 || minute > 59) return raw;
      const suffix = hour24 >= 12 ? "p.m." : "a.m.";
      let hour12 = hour24 % 12;
      if (hour12 === 0) hour12 = 12;
      return `${String(hour12).padStart(2, "0")}.${String(minute).padStart(2, "0")} ${suffix}`;
    }

    function renderActivityTime(ctx, value) {
      const raw = String(value || "").trim();
      if (!raw) return "";

      const hasApprox = /\b(?:aprox|approx)\.?\b/i.test(raw);
      let clean = raw.replace(/\b(?:aprox|approx)\.?\b/gi, "").trim();

      // Si el dato ya viene en 12 horas, conserva explícitamente a.m./p.m.
      const twelveHour = clean.match(/(\d{1,2})\s*[:.]\s*(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)/i);
      let display = clean;
      if (twelveHour) {
        const hour = Number(twelveHour[1]);
        const minute = Number(twelveHour[2]);
        const marker = String(twelveHour[3]).toLowerCase();
        const suffix = marker.startsWith("p") ? "p.m." : "a.m.";
        display = `${String(hour).padStart(2, "0")}.${String(minute).padStart(2, "0")} ${suffix}`;
      } else if (/^\d{1,2}\s*[:.]\s*\d{2}$/.test(clean)) {
        display = format24HourToPrint(clean.replace(".", ":"));
      }

      return `<span class="print-time-main">${escapeHtml(ctx, display)}</span>${hasApprox ? `<span class="print-time-approx">(approx.)</span>` : ""}`;
    }

    function splitDayAndTime(value) {
      const raw = String(value || "").trim();
      const match = raw.match(/^(?:D[ií]a|Day)\s*(\d+)\s*[·\-:]\s*(.+)$/i);
      if (!match) return { day: null, time: raw };
      return { day: Number(match[1]), time: String(match[2] || "").trim() };
    }

    function getSourceItinerary(ctx) {
      const candidates = [
        ctx?.getProductPrintItineraryItemsV83?.(),
        ctx?.getProductPrintItineraryItemsV80?.(),
        ctx?.product?.itinerary
      ];
      for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length) return candidate;
      }
      return [];
    }

    function renderStandardItinerary(ctx, day1, day2) {
      const source = getSourceItinerary(ctx);
      if (!source.length) return "";

      const parsed = source.map((item, index) => {
        const split = splitDayAndTime(item?.time);
        let day = split.day;
        if (!day) {
          // En Overnight, si una fila heredada perdió la etiqueta de día,
          // todo lo posterior a "Noche en Aguas Calientes" pertenece al Día 2.
          const previous = source.slice(0, index).map((entry) => `${entry?.title || ""} ${entry?.time || ""}`.toLowerCase());
          const afterNight = previous.some((text) => text.includes("noche en aguas calientes") || /d[ií]a\s*1\s*[·\-:]\s*noche/i.test(text));
          day = afterNight ? 2 : 1;
        }
        return { item, day, time: split.time };
      });

      const rows = [];
      let lastDay = null;
      parsed.forEach(({ item, day, time }, index) => {
        const normalizedDay = day === 2 ? 2 : 1;
        if (normalizedDay !== lastDay) {
          const date = normalizedDay === 1 ? day1 : day2;
          const dayLabel = isEnglish(ctx) ? `Day ${normalizedDay}` : `Día ${normalizedDay}`;
          rows.push(`<div class="print-itinerary-day-title-v102"><strong>${escapeHtml(ctx, dayLabel)}</strong>&nbsp;·&nbsp;<span>${escapeHtml(ctx, formatDate(ctx, date))}</span></div>`);
          lastDay = normalizedDay;
        }

        rows.push(`<article class="print-itinerary-item">
          <div class="print-itinerary-time">${renderActivityTime(ctx, time || ctx?.t?.("product.print.stepFallback", "Paso {n}", { n: index + 1 }) || `Paso ${index + 1}`)}</div>
          <div>
            <h3>${escapeHtml(ctx, item?.title || ctx?.t?.("product.print.activityFallback", "Actividad {n}", { n: index + 1 }) || `Actividad ${index + 1}`)}</h3>
            <p>${escapeHtml(ctx, item?.description || "")}</p>
          </div>
        </article>`);
      });

      return rows.join("");
    }

    function rewriteTrainCard(ctx, card, train, direction, date) {
      if (!card || !train || !date) return;
      const isReturn = direction === "return";
      const from = isReturn
        ? trainStation(train, "departureStation", "Machu Picchu")
        : trainStation(train, "departureStation", "Ollantaytambo");
      const to = isReturn
        ? trainStation(train, "arrivalStation", "Cusco")
        : trainStation(train, "arrivalStation", "Machu Picchu");
      const label = isEnglish(ctx)
        ? (isReturn ? "Return train" : "Outbound train")
        : (isReturn ? "Tren de retorno" : "Tren de ida");
      const dateLabel = isEnglish(ctx) ? "Date" : "Fecha";
      const company = trainCompany(train) || (isEnglish(ctx) ? "Tourist train" : "Tren turístico");
      const name = trainName(train);

      // Mantiene exactamente las mismas etiquetas/clases de la tarjeta existente.
      card.className = "print-train-card print-train-card--v83";
      card.innerHTML = `
        <span>${escapeHtml(ctx, label)}</span>
        <b>${escapeHtml(ctx, `${company}${name ? ` · ${name}` : ""}`)}</b>
        <small><strong>${escapeHtml(ctx, dateLabel)}:</strong> ${escapeHtml(ctx, formatDate(ctx, date))}</small>
        <small>${escapeHtml(ctx, from)} ${escapeHtml(ctx, format24HourToPrint(train?.departureTime))} → ${escapeHtml(ctx, to)} ${escapeHtml(ctx, format24HourToPrint(train?.arrivalTime))}</small>
      `;
    }

    function addHotelNightDate(ctx, area, day1) {
      if (!day1) return;
      const hotelSection = area?.querySelector(".print-section--hotel-v85");
      const summary = hotelSection?.querySelector(".print-hotel-summary-v85");
      const info = summary?.querySelector("div");
      if (!info) return;

      // Retira únicamente fechas añadidas por parches de impresión anteriores.
      hotelSection.querySelectorAll(".print-hotel-night-date-v100, [data-mct-print-hotel-night-v102]").forEach((node) => node.remove());

      const row = document.createElement("small");
      row.setAttribute("data-mct-print-hotel-night-v102", "true");
      row.innerHTML = `<strong>${escapeHtml(ctx, isEnglish(ctx) ? "Night date:" : "Fecha de la noche:")}</strong> ${escapeHtml(ctx, formatDate(ctx, day1))}`;
      info.appendChild(row);
    }

    function ensurePrintOnlyStyles() {
      const styleId = "mct-print-only-overnight-v102-style";
      if (document.getElementById(styleId)) return;
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .product-print-sheet .print-itinerary-day-title-v102 {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          margin: 2px 0 1px;
          padding: 7px 12px;
          border-radius: 10px;
          background: #0b4a33;
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          line-height: 1.2;
          break-inside: avoid;
          page-break-inside: avoid;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .product-print-sheet .print-itinerary-day-title-v102 strong {
          color: inherit;
          font-size: inherit;
          font-weight: 900;
        }
        .product-print-sheet .print-itinerary-day-title-v102 span {
          color: inherit;
          font-size: inherit;
          font-weight: 700;
          opacity: 0.98;
        }
      `;
      document.head.appendChild(style);
    }

    function removeQrScanCount(area) {
      const bookSection = area?.querySelector('.print-section--book-v83');
      if (!bookSection) return;
      const candidates = Array.from(bookSection.querySelectorAll('small, p, span, div'));
      candidates.forEach((node) => {
        const text = String(node.textContent || '').trim();
        if (!text) return;
        if (/\b\d+\s*(?:escanead[oa]s?|scans?|scanne?d)\b/i.test(text) || /escanead[oa]s?/i.test(text)) {
          node.remove();
        }
      });
    }

    function applyPrintOnlyEnhancement(ctx) {
      if (!isTarget(ctx)) return false;
      const area = document.getElementById("productPrintArea");
      if (!area) return false;

      const { day1, day2 } = getTripDates(ctx);
      if (!day1 || !day2) return false;

      ensurePrintOnlyStyles();

      const itineraryList = area.querySelector(".print-section--itinerary .print-itinerary-list");
      const itineraryHtml = renderStandardItinerary(ctx, day1, day2);
      if (itineraryList && itineraryHtml) {
        // Volvemos a las clases estándar para conservar el diseño actual de impresión.
        itineraryList.className = "print-itinerary-list";
        itineraryList.innerHTML = itineraryHtml;
      }

      const cards = Array.from(area.querySelectorAll(".print-section--trains .print-train-card"));
      rewriteTrainCard(ctx, cards[0], selectedOutbound(ctx), "outbound", day1);
      rewriteTrainCard(ctx, cards[1], selectedReturn(ctx), "return", day2);

      addHotelNightDate(ctx, area, day1);
      removeQrScanCount(area);
      return true;
    }

    proto.printProductItineraryV78 = function () {
      if (!isTarget(this) || !this.date) return previousPrint.apply(this, arguments);

      const realPrint = window.print.bind(window);
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        window.print = realPrint;
      };

      // Bloquea temporalmente los window.print() internos de V83/V95/V100.
      window.print = function () {};

      let result;
      try {
        result = previousPrint.apply(this, arguments);
      } catch (error) {
        restore();
        throw error;
      }

      // Los parches heredados tienen temporizadores de impresión de hasta ~520 ms.
      // Aplicamos esta corrección al final para que sea la versión definitiva del DOM impreso.
      window.setTimeout(() => {
        try {
          applyPrintOnlyEnhancement(this);
        } finally {
          restore();
          window.setTimeout(() => realPrint(), 40);
        }
      }, 760);

      window.setTimeout(restore, 4500);
      return result;
    };

    proto.applyPrintOnlyOvernightDatesV102 = function () {
      return applyPrintOnlyEnhancement(this);
    };

    proto.__mctPrintOnlyOvernightDatesV102Applied = true;
    return true;
  }

  if (!applyPatch()) {
    document.addEventListener("DOMContentLoaded", applyPatch, { once: true });
    [100, 300, 700, 1400, 2400, 3800].forEach((delay) => window.setTimeout(applyPatch, delay));
  }
})();
