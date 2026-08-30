/*
 * My Cusco Trip — V100
 * Machu Picchu Overnight Clásico (MAPI003)
 *
 * Alcance puntual:
 * - selector de circuito 1 / 2 / 3 como preferencia sujeta a disponibilidad;
 * - fechas visibles en trenes y hotel;
 * - impresión organizada por Día 1 / Día 2 con fecha real seleccionada;
 * - horas de impresión sin etiquetas "aprox.";
 * - horas de tren tomadas exactamente del tren seleccionado;
 * - retorno nocturno controla correctamente el cambio de fecha después de medianoche;
 * - circuito seleccionado reflejado en impresión y en el resumen de la pre-reserva.
 *
 * No modifica precios, costos, backend, voucher, pasarelas ni productos distintos de MAPI003.
 */
(function () {
  "use strict";

  const TARGET_CODE = "MAPI003";
  const TARGET_SLUGS = new Set([
    "machu-picchu-overnight-clasico",
    "machu-picchu-overnight-classic"
  ]);

  function patchV100() {
    const page = window.MyCuscoTripProductPage;
    if (!page) return false;

    const proto = Object.getPrototypeOf(page) || page;
    if (proto.__mctOvernightClassicV100Applied) return true;

    const esc = (ctx, value) => typeof ctx?.escapeHtml === "function"
      ? ctx.escapeHtml(value ?? "")
      : String(value ?? "").replace(/[&<>'"]/g, (char) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
        }[char]));

    const localeCode = (ctx) => String(ctx?.getLocale?.() || window.MCT_LOCALE || document.documentElement.lang || "es")
      .toLowerCase().slice(0, 2);

    const isEnglish = (ctx) => localeCode(ctx) === "en";

    const text = (ctx, es, en) => isEnglish(ctx) ? en : es;

    const productCode = (ctx) => String(
      ctx?.product?.internalCode
      || ctx?.product?.code
      || ctx?.product?.raw?.internalCode
      || ""
    ).trim().toUpperCase();

    const productSlug = (ctx) => String(ctx?.product?.slug || ctx?.slug || "").trim();

    const isTarget = (ctx) => productCode(ctx) === TARGET_CODE || TARGET_SLUGS.has(productSlug(ctx));

    function parseIsoDate(value) {
      const raw = String(value || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
      const date = new Date(`${raw}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function addCalendarDays(date, amount) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
      const copy = new Date(date);
      copy.setDate(copy.getDate() + Number(amount || 0));
      return copy;
    }

    function formatDate(ctx, date, includeYear = true) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
      const locale = isEnglish(ctx) ? "en-US" : "es-PE";
      const options = { day: "numeric", month: "long" };
      if (includeYear) options.year = "numeric";
      return date.toLocaleDateString(locale, options);
    }

    function getTripDates(ctx) {
      const start = parseIsoDate(ctx?.date);
      if (!start) return { day1: null, day2: null };
      return { day1: start, day2: addCalendarDays(start, 1) };
    }

    function timeToMinutes(value) {
      const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    }

    function minutesToTime(value) {
      if (!Number.isFinite(Number(value))) return "";
      let total = Number(value) % 1440;
      if (total < 0) total += 1440;
      const hour = Math.floor(total / 60);
      const minute = total % 60;
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    function addMinutes(value, delta) {
      const minutes = timeToMinutes(value);
      return minutes == null ? "" : minutesToTime(minutes + Number(delta || 0));
    }

    function formatClock(ctx, value) {
      const minutes = timeToMinutes(value);
      if (minutes == null) return String(value || "");
      const hour24 = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const hour12 = ((hour24 + 11) % 12) + 1;
      const minuteText = String(minute).padStart(2, "0");
      if (isEnglish(ctx)) return `${hour12}:${minuteText} ${hour24 >= 12 ? "PM" : "AM"}`;
      return `${hour12}:${minuteText} ${hour24 >= 12 ? "p. m." : "a. m."}`;
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

    function trainStation(train, field, fallback) {
      return String(train?.[field] || train?.raw?.[field] || fallback || "").trim();
    }

    function trainCompany(train) {
      return String(train?.companyName || train?.company || "").trim();
    }

    function trainName(train) {
      return String(train?.label || train?.serviceName || train?.raw?.serviceName || "").trim();
    }

    function isArrivalNextDay(train) {
      const departure = timeToMinutes(train?.departureTime);
      const arrival = timeToMinutes(train?.arrivalTime);
      return departure != null && arrival != null && arrival < departure;
    }

    function isCuscoArrival(train) {
      const station = trainStation(train, "arrivalStation", "").toLowerCase();
      return /cusco|av\.?.*sol|san pedro/.test(station);
    }

    function getCircuitValue(ctx) {
      return String(ctx?.selectedMachuPicchuCircuit || "").trim();
    }

    function circuitNumber(value) {
      const match = String(value || "").match(/[123]/);
      return match ? match[0] : "";
    }

    function circuitLabel(ctx, value = getCircuitValue(ctx)) {
      const number = circuitNumber(value);
      if (!number) return text(ctx, "Circuito por confirmar", "Circuit to be confirmed");
      return text(ctx, `Circuito ${number}`, `Circuit ${number}`);
    }

    function circuitWarning(ctx) {
      return text(
        ctx,
        "La elección del circuito expresa tu preferencia. Los circuitos de Machu Picchu están sujetos a disponibilidad oficial de boletos para la fecha seleccionada. Si el circuito elegido no estuviera disponible, un asesor coordinará contigo la mejor alternativa antes de confirmar la emisión.",
        "Your circuit choice records your preference. Machu Picchu circuits are subject to official ticket availability for the selected date. If your chosen circuit is unavailable, a travel advisor will coordinate the best alternative with you before ticket issuance is confirmed."
      );
    }

    proto.ensureMachuPicchuCircuitSelectorV100 = function () {
      if (!isTarget(this)) return false;

      let section = document.getElementById("machuPicchuCircuitSectionV100");
      if (!section) {
        section = document.createElement("div");
        section.id = "machuPicchuCircuitSectionV100";
        section.className = "booking-field booking-field--circuit-v100";
        section.innerHTML = `
          <label for="machuPicchuCircuitSelectV100">${esc(this, text(this, "Circuito de Machu Picchu", "Machu Picchu circuit"))}</label>
          <select id="machuPicchuCircuitSelectV100">
            <option value="">${esc(this, text(this, "Selecciona tu circuito preferido", "Select your preferred circuit"))}</option>
            <option value="circuito-1">${esc(this, text(this, "Circuito 1", "Circuit 1"))}</option>
            <option value="circuito-2">${esc(this, text(this, "Circuito 2", "Circuit 2"))}</option>
            <option value="circuito-3">${esc(this, text(this, "Circuito 3", "Circuit 3"))}</option>
          </select>
          <div class="booking-circuit-alert-v100" role="note">
            <i class="fas fa-circle-info" aria-hidden="true"></i>
            <span>${esc(this, circuitWarning(this))}</span>
          </div>
        `;

        const trainSection = document.getElementById("trainSelectionSection");
        const travelersField = document.querySelector("#productBookingForm .booking-travelers")?.closest(".booking-field");
        if (trainSection?.parentNode) trainSection.insertAdjacentElement("afterend", section);
        else if (travelersField?.parentNode) travelersField.parentNode.insertBefore(section, travelersField);
        else document.getElementById("productBookingForm")?.prepend(section);
      }

      const select = section.querySelector("#machuPicchuCircuitSelectV100");
      if (select) {
        select.value = getCircuitValue(this);
        if (!select.dataset.boundV100) {
          select.dataset.boundV100 = "1";
          select.addEventListener("change", () => {
            this.selectedMachuPicchuCircuit = String(select.value || "");
          });
        }
      }
      return true;
    };

    proto.enhanceOvernightScreenDatesV100 = function () {
      if (!isTarget(this)) return false;
      const { day1, day2 } = getTripDates(this);
      if (!day1 || !day2) return false;

      const trainCards = Array.from(document.querySelectorAll("#trainUpgradeSummaryCards .booking-train-mini"));
      [day1, day2].forEach((date, index) => {
        const card = trainCards[index];
        if (!card) return;
        let dateNode = card.querySelector(".booking-train-mini__date-v100");
        if (!dateNode) {
          dateNode = document.createElement("small");
          dateNode.className = "booking-train-mini__date-v100";
          const timeNode = card.querySelector(".booking-train-mini__time") || card.querySelector("small");
          if (timeNode) timeNode.insertAdjacentElement("beforebegin", dateNode);
          else card.appendChild(dateNode);
        }
        dateNode.textContent = `${index === 0 ? text(this, "Fecha de ida", "Outbound date") : text(this, "Fecha de retorno", "Return date")}: ${formatDate(this, date, true)}`;
      });

      const hotelCard = document.querySelector(".booking-accommodation-card--overnight-v85, .booking-accommodation-card--overnight-v84");
      if (hotelCard) {
        let nightNode = hotelCard.querySelector(".booking-hotel-night-date-v100");
        if (!nightNode) {
          nightNode = document.createElement("p");
          nightNode.className = "booking-accommodation-card__selected booking-hotel-night-date-v100";
          const body = hotelCard.querySelector(".booking-accommodation-card__body");
          if (body) body.prepend(nightNode);
        }
        nightNode.textContent = `${text(this, "Noche", "Night")}: ${formatDate(this, day1, true)} → ${formatDate(this, day2, true)}`;
      }

      return true;
    };

    proto.getOvernightPrintScheduleV100 = function () {
      const out = selectedOutbound(this);
      const ret = selectedReturn(this);
      const { day1, day2 } = getTripDates(this);

      const outDeparture = out?.departureTime || "06:40";
      const outArrival = out?.arrivalTime || "08:01";
      const pickup = addMinutes(outDeparture, -160) || "04:00";
      const stationArrival = addMinutes(pickup, 120) || addMinutes(outDeparture, -40) || "06:00";
      const retDeparture = ret?.departureTime || "20:20";
      const retArrival = ret?.arrivalTime || "00:10";
      const boarding = addMinutes(retDeparture, -30) || "19:50";
      const returnArrivalDate = isArrivalNextDay(ret) ? addCalendarDays(day2, 1) : day2;
      const directCusco = isCuscoArrival(ret);

      const day1Items = [
        {
          time: pickup,
          title: text(this, "Recojo en Cusco y traslado a Ollantaytambo", "Pickup in Cusco and transfer to Ollantaytambo"),
          description: text(this, "Recojo desde tu hotel o punto coordinado en Cusco y traslado hacia la estación de tren de Ollantaytambo.", "Pickup from your hotel or agreed point in Cusco and transfer to Ollantaytambo train station.")
        },
        {
          time: stationArrival,
          title: text(this, "Llegada a la estación de Ollantaytambo", "Arrival at Ollantaytambo station"),
          description: text(this, "Llegada programada a la estación para registro y embarque del tren seleccionado.", "Scheduled arrival at the station for check-in and boarding of the selected train.")
        },
        {
          time: outDeparture,
          title: text(this, "Tren de ida a Aguas Calientes", "Outbound train to Aguas Calientes"),
          description: text(
            this,
            `${trainCompany(out) || "Tren turístico"}${trainName(out) ? ` · ${trainName(out)}` : ""}. ${trainStation(out, "departureStation", "Ollantaytambo")} → ${trainStation(out, "arrivalStation", "Machu Picchu")}.`,
            `${trainCompany(out) || "Tourist train"}${trainName(out) ? ` · ${trainName(out)}` : ""}. ${trainStation(out, "departureStation", "Ollantaytambo")} → ${trainStation(out, "arrivalStation", "Machu Picchu")}.`
          )
        },
        {
          time: outArrival,
          title: text(this, "Llegada a Aguas Calientes y traslado al hotel", "Arrival in Aguas Calientes and transfer to the hotel"),
          description: text(this, "Llegada a Machu Picchu Pueblo y asistencia hacia el hotel seleccionado para realizar el check-in.", "Arrival in Machu Picchu Pueblo and assistance to the selected hotel for check-in.")
        },
        {
          time: text(this, "Noche", "Night"),
          title: text(this, "Noche en Aguas Calientes", "Overnight in Aguas Calientes"),
          description: text(this, "Noche en el hotel seleccionado antes de la visita a Machu Picchu del día siguiente.", "Overnight at the selected hotel before the Machu Picchu visit the following day.")
        }
      ];

      const day2Items = [
        {
          time: "09:00",
          title: text(this, "Encuentro con el guía en Aguas Calientes", "Meet your guide in Aguas Calientes"),
          description: text(this, "Encuentro y coordinación con el guía para iniciar la visita a Machu Picchu.", "Meet and coordinate with your guide to begin the Machu Picchu visit.")
        },
        {
          time: "09:30",
          title: text(this, "Bus Consettur hacia Machu Picchu", "Consettur bus to Machu Picchu"),
          description: text(this, "Embarque en el bus turístico de subida hacia la puerta de ingreso del sitio arqueológico.", "Board the tourist bus uphill to the entrance of the archaeological site.")
        },
        {
          time: "10:00",
          title: text(this, `Tour guiado en Machu Picchu · ${circuitLabel(this)}`, `Guided Machu Picchu tour · ${circuitLabel(this)}`),
          description: getCircuitValue(this)
            ? text(this, `${circuitLabel(this)} seleccionado como preferencia para la visita guiada. Su emisión está sujeta a disponibilidad oficial.`, `${circuitLabel(this)} selected as your preferred route for the guided visit. Ticket issuance is subject to official availability.`)
            : text(this, "El circuito se confirmará de acuerdo con la disponibilidad oficial de boletos.", "The circuit will be confirmed according to official ticket availability.")
        },
        {
          time: "13:00",
          title: text(this, "Fin del tour guiado y tiempo para almorzar", "End of guided tour and time for lunch"),
          description: text(this, "Finaliza la visita guiada. Puedes utilizar el tiempo disponible para almorzar en Aguas Calientes o usar un almuerzo agregado a la reserva.", "The guided visit ends. You may use the available time for lunch in Aguas Calientes or use a lunch added to your booking.")
        },
        {
          time: "15:00",
          title: text(this, "Bus de bajada hacia Aguas Calientes", "Bus down to Aguas Calientes"),
          description: text(this, "Retorno en bus Consettur hacia Machu Picchu Pueblo y tiempo libre antes del tren de retorno.", "Return by Consettur bus to Machu Picchu Pueblo and free time before the return train.")
        },
        {
          time: boarding,
          title: text(this, "Embarque para el tren de retorno", "Boarding for the return train"),
          description: text(this, "Presentación en la estación de Aguas Calientes para abordar el tren de retorno seleccionado.", "Report to Aguas Calientes station to board the selected return train.")
        },
        {
          time: retDeparture,
          title: text(this, "Tren de retorno", "Return train"),
          description: text(
            this,
            `${trainCompany(ret) || "Tren turístico"}${trainName(ret) ? ` · ${trainName(ret)}` : ""}. ${trainStation(ret, "departureStation", "Machu Picchu")} → ${trainStation(ret, "arrivalStation", "Cusco")}.`,
            `${trainCompany(ret) || "Tourist train"}${trainName(ret) ? ` · ${trainName(ret)}` : ""}. ${trainStation(ret, "departureStation", "Machu Picchu")} → ${trainStation(ret, "arrivalStation", "Cusco")}.`
          )
        }
      ];

      if (directCusco) {
        day2Items.push({
          time: retArrival,
          date: returnArrivalDate,
          title: text(this, "Llegada a Cusco y fin de servicios", "Arrival in Cusco and end of services"),
          description: text(this, `Llegada programada a ${trainStation(ret, "arrivalStation", "Cusco")}.`, `Scheduled arrival at ${trainStation(ret, "arrivalStation", "Cusco")}.`)
        });
      } else {
        day2Items.push({
          time: retArrival,
          date: returnArrivalDate,
          title: text(this, `Llegada a ${trainStation(ret, "arrivalStation", "la estación")} y traslado a Cusco`, `Arrival at ${trainStation(ret, "arrivalStation", "the station")} and transfer to Cusco`),
          description: text(this, "Al llegar a la estación se realiza el traslado terrestre coordinado hacia la ciudad de Cusco.", "Upon arrival at the station, the coordinated ground transfer continues to Cusco city.")
        });
        const finalTime = addMinutes(retArrival, 100) || retArrival;
        const finalCrossesDay = (timeToMinutes(retArrival) ?? 0) + 100 >= 1440;
        day2Items.push({
          time: finalTime,
          date: finalCrossesDay ? addCalendarDays(returnArrivalDate, 1) : returnArrivalDate,
          title: text(this, "Llegada a Cusco y fin de servicios", "Arrival in Cusco and end of services"),
          description: text(this, "Llegada a la ciudad de Cusco y fin de los servicios del itinerario.", "Arrival in Cusco city and end of itinerary services.")
        });
      }

      return { day1, day2, day1Items, day2Items, out, ret, returnArrivalDate };
    };

    proto.renderOvernightPrintItineraryV100 = function () {
      if (!isTarget(this)) return "";
      const schedule = this.getOvernightPrintScheduleV100?.();
      if (!schedule?.day1 || !schedule?.day2) return "";

      const renderItem = (item, groupDate) => {
        const rowDate = item?.date instanceof Date ? item.date : groupDate;
        const dateChanged = rowDate && groupDate && rowDate.toDateString() !== groupDate.toDateString();
        const timeText = /^\d{1,2}:\d{2}$/.test(String(item.time || "")) ? formatClock(this, item.time) : String(item.time || "");
        return `<article class="print-itinerary-activity-v100">
          <div class="print-itinerary-activity-time-v100">
            <strong>${esc(this, timeText)}</strong>
            ${dateChanged ? `<small>${esc(this, formatDate(this, rowDate, true))}</small>` : ""}
          </div>
          <div class="print-itinerary-activity-copy-v100">
            <h3>${esc(this, item.title || "")}</h3>
            ${item.description ? `<p>${esc(this, item.description)}</p>` : ""}
          </div>
        </article>`;
      };

      const renderDay = (number, date, items) => `<section class="print-itinerary-day-v100">
        <header class="print-itinerary-day-header-v100">
          <span>${esc(this, text(this, `Día ${number}`, `Day ${number}`))}</span>
          <strong>${esc(this, formatDate(this, date, true))}</strong>
        </header>
        <div class="print-itinerary-day-activities-v100">
          ${items.map((item) => renderItem(item, date)).join("")}
        </div>
      </section>`;

      return `${renderDay(1, schedule.day1, schedule.day1Items)}${renderDay(2, schedule.day2, schedule.day2Items)}`;
    };

    proto.enhanceOvernightPrintV100 = function () {
      if (!isTarget(this)) return false;
      const area = document.getElementById("productPrintArea");
      if (!area) return false;

      const schedule = this.getOvernightPrintScheduleV100?.();
      if (!schedule?.day1 || !schedule?.day2) return false;

      area.querySelector(".print-sheet")?.classList.add("print-sheet--overnight-v100");

      // Trenes: fecha de salida + fecha real de llegada cuando cruza medianoche.
      const trainCards = Array.from(area.querySelectorAll(".print-section--trains .print-train-card"));
      [
        { train: schedule.out, date: schedule.day1, direction: "outbound" },
        { train: schedule.ret, date: schedule.day2, direction: "return" }
      ].forEach((entry, index) => {
        const card = trainCards[index];
        const train = entry.train;
        if (!card || !train) return;
        const arrivalDate = isArrivalNextDay(train) ? addCalendarDays(entry.date, 1) : entry.date;
        const title = entry.direction === "outbound" ? text(this, "TREN DE IDA", "OUTBOUND TRAIN") : text(this, "TREN DE RETORNO", "RETURN TRAIN");
        const from = trainStation(train, "departureStation", entry.direction === "outbound" ? "Ollantaytambo" : "Machu Picchu");
        const to = trainStation(train, "arrivalStation", entry.direction === "outbound" ? "Machu Picchu" : "Cusco");
        card.classList.add("print-train-card--dated-v100");
        card.innerHTML = `
          <span>${esc(this, title)}</span>
          <b>${esc(this, `${trainCompany(train) || text(this, "Tren turístico", "Tourist train")}${trainName(train) ? ` · ${trainName(train)}` : ""}`)}</b>
          <small class="print-train-date-v100"><strong>${esc(this, entry.direction === "outbound" ? text(this, "Fecha de ida:", "Outbound date:") : text(this, "Fecha de retorno:", "Return date:"))}</strong> ${esc(this, formatDate(this, entry.date, true))}</small>
          <small>${esc(this, `${from} ${formatClock(this, train.departureTime)} → ${to} ${formatClock(this, train.arrivalTime)}`)}</small>
          ${arrivalDate && entry.direction === "return" && arrivalDate.toDateString() !== entry.date.toDateString() ? `<small class="print-train-arrival-date-v100">${esc(this, `${text(this, "Llegada:", "Arrival:")} ${formatDate(this, arrivalDate, true)} · ${formatClock(this, train.arrivalTime)}`)}</small>` : ""}
        `;
      });

      // Hotel: la noche corresponde al Día 1 y termina el Día 2.
      const hotelSection = area.querySelector(".print-section--hotel-v85");
      if (hotelSection) {
        let night = hotelSection.querySelector(".print-hotel-night-date-v100");
        if (!night) {
          night = document.createElement("p");
          night.className = "print-hotel-night-date-v100";
          const summary = hotelSection.querySelector(".print-hotel-summary-v85");
          summary?.insertAdjacentElement("afterend", night);
        }
        night.innerHTML = `<strong>${esc(this, text(this, "Noche incluida:", "Included night:"))}</strong> ${esc(this, `${formatDate(this, schedule.day1, true)} → ${formatDate(this, schedule.day2, true)}`)}`;
      }

      // Circuito seleccionado + alerta de disponibilidad.
      area.querySelector(".print-section--circuit-v100")?.remove();
      const circuitSection = document.createElement("section");
      circuitSection.className = "print-section print-section--circuit-v100";
      const circuitSelected = getCircuitValue(this);
      circuitSection.innerHTML = `
        <h2>${esc(this, text(this, "Circuito de Machu Picchu", "Machu Picchu circuit"))}</h2>
        <div class="print-circuit-card-v100">
          <div>
            <span>${esc(this, circuitSelected ? text(this, "Circuito seleccionado", "Selected circuit") : text(this, "Circuito", "Circuit"))}</span>
            <strong>${esc(this, circuitLabel(this))}</strong>
          </div>
          <p><i class="fas fa-circle-info" aria-hidden="true"></i> ${esc(this, circuitWarning(this))}</p>
        </div>
      `;
      const hotelAnchor = area.querySelector(".print-section--hotel-v85") || area.querySelector(".print-section--trains");
      if (hotelAnchor) hotelAnchor.insertAdjacentElement("afterend", circuitSection);

      // Itinerario: reemplaza el listado lineal por Día 1 / Día 2 con fecha real.
      const itineraryList = area.querySelector(".print-section--itinerary .print-itinerary-list");
      const itineraryHtml = this.renderOvernightPrintItineraryV100?.() || "";
      if (itineraryList && itineraryHtml) {
        itineraryList.className = "print-itinerary-list print-itinerary-list--overnight-v100";
        itineraryList.innerHTML = itineraryHtml;
      }

      // "Incluye": refleja el circuito elegido sin prometer disponibilidad garantizada.
      const includeItems = Array.from(area.querySelectorAll(".print-section--includes .print-list li"));
      const circuitInclude = includeItems.find((li) => /circuito|circuit/i.test(li.textContent || ""));
      if (circuitInclude) {
        circuitInclude.textContent = circuitSelected
          ? text(this, `Ticket de ingreso oficial a Machu Picchu · ${circuitLabel(this)} seleccionado, sujeto a disponibilidad oficial.`, `Official Machu Picchu entrance ticket · ${circuitLabel(this)} selected, subject to official availability.`)
          : text(this, "Ticket de ingreso oficial a Machu Picchu · circuito sujeto a disponibilidad oficial.", "Official Machu Picchu entrance ticket · circuit subject to official availability.");
      }

      // Evita cualquier resto heredado de "approx./aprox." dentro del itinerario V100.
      area.querySelectorAll(".print-itinerary-list--overnight-v100 .print-time-approx").forEach((node) => node.remove());
      return true;
    };

    // Selector y fechas en pantalla después de los renderizados existentes.
    const previousRenderProduct = proto.renderProduct;
    proto.renderProduct = function () {
      const result = previousRenderProduct?.apply(this, arguments);
      if (isTarget(this)) {
        this.ensureMachuPicchuCircuitSelectorV100?.();
        window.setTimeout(() => this.enhanceOvernightScreenDatesV100?.(), 0);
      }
      return result;
    };

    const previousRenderTrains = proto.renderTrainSelectionOptions;
    proto.renderTrainSelectionOptions = function () {
      const result = previousRenderTrains?.apply(this, arguments);
      if (isTarget(this)) window.setTimeout(() => this.enhanceOvernightScreenDatesV100?.(), 0);
      return result;
    };

    const previousUpdateTrainState = proto.updateTrainSelectionState;
    proto.updateTrainSelectionState = function () {
      const result = previousUpdateTrainState?.apply(this, arguments);
      if (isTarget(this)) window.setTimeout(() => this.enhanceOvernightScreenDatesV100?.(), 0);
      return result;
    };

    const previousRenderAccommodation = proto.renderAccommodationOptions;
    proto.renderAccommodationOptions = function () {
      const result = previousRenderAccommodation?.apply(this, arguments);
      if (isTarget(this)) window.setTimeout(() => this.enhanceOvernightScreenDatesV100?.(), 0);
      return result;
    };

    const previousRefreshDates = proto.refreshItineraryDates;
    proto.refreshItineraryDates = function () {
      const result = previousRefreshDates?.apply(this, arguments);
      if (isTarget(this)) window.setTimeout(() => this.enhanceOvernightScreenDatesV100?.(), 0);
      return result;
    };

    // Conserva la preferencia del circuito dentro del resumen y la pre-reserva.
    const previousBookingSummary = proto.getBookingSummary;
    proto.getBookingSummary = function () {
      const summary = previousBookingSummary?.apply(this, arguments) || {};
      if (!isTarget(this)) return summary;
      return {
        ...summary,
        machuPicchuCircuit: circuitLabel(this),
        machuPicchuCircuitCode: getCircuitValue(this),
        machuPicchuCircuitSubjectToAvailability: true
      };
    };

    const previousPreReservation = proto.generatePreReservation;
    proto.generatePreReservation = function () {
      const payload = previousPreReservation?.apply(this, arguments) || {};
      if (!isTarget(this)) return payload;
      return {
        ...payload,
        machuPicchuCircuit: circuitLabel(this),
        machuPicchuCircuitCode: getCircuitValue(this),
        machuPicchuCircuitSubjectToAvailability: true
      };
    };

    // Último parche de impresión: espera a que los generadores heredados terminen,
    // transforma el DOM y luego abre una sola vez el diálogo nativo de impresión.
    const previousPrint = proto.printProductItineraryV78;
    if (typeof previousPrint === "function") {
      proto.printProductItineraryV78 = function () {
        if (!isTarget(this)) return previousPrint.apply(this, arguments);
        if (!this.date) return previousPrint.apply(this, arguments);

        const nativePrint = window.print.bind(window);
        let restored = false;
        const restore = () => {
          if (restored) return;
          restored = true;
          window.print = nativePrint;
        };

        // Impide que los parches V83/V95 abran el diálogo antes de aplicar V100.
        window.print = function () {};

        let result;
        try {
          result = previousPrint.apply(this, arguments);
          this.enhanceOvernightPrintV100?.();
        } catch (error) {
          restore();
          throw error;
        }

        const area = document.getElementById("productPrintArea");
        const images = Array.from(area?.querySelectorAll?.("img") || []);
        const waitImages = Promise.all(images.map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            const done = () => resolve();
            image.addEventListener("load", done, { once: true });
            image.addEventListener("error", done, { once: true });
          });
        }));

        Promise.race([
          waitImages,
          new Promise((resolve) => window.setTimeout(resolve, 2200))
        ]).finally(() => {
          window.setTimeout(() => {
            // Reaplica por si un parche heredado modificó el DOM durante su temporizador.
            this.enhanceOvernightPrintV100?.();
            restore();
            nativePrint();
          }, 520);
        });

        window.setTimeout(restore, 4200);
        return result;
      };
    }

    proto.__mctOvernightClassicV100Applied = true;

    const kick = () => {
      if (!isTarget(page)) return;
      page.ensureMachuPicchuCircuitSelectorV100?.();
      page.enhanceOvernightScreenDatesV100?.();
    };
    kick();
    [120, 350, 800, 1500, 2600].forEach((delay) => window.setTimeout(kick, delay));
    return true;
  }

  if (!patchV100()) {
    document.addEventListener("DOMContentLoaded", patchV100, { once: true });
    [100, 300, 700, 1300, 2200].forEach((delay) => window.setTimeout(patchV100, delay));
  }
})();
