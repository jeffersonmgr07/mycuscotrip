"use strict";

/**
 * My Cusco Trip - Itinerary Builder
 * Convierte combinaciones de tours en itinerarios por día.
 * No genera paquetes, solo organiza.
 *
 * Modos:
 * - showcase: vitrina comercial. Día 1 con Transfer IN + hasta 2 actividades suaves.
 * - dynamic: preparado para cotizador futuro con horarios reales.
 */

(function () {
  function createEmptyDays(totalDays) {
    return Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      items: []
    }));
  }

  function insertTransferIn(days, config) {
    if (!days.length || !config?.arrival) return;

    days[0].items.push({
      type: "logistics",
      code: config.arrival.code,
      title: config.arrival.title,
      description: config.arrival.description
    });
  }

  function insertTransferOut(days, config) {
    if (!days.length || !config?.departure) return;

    const lastDay = days[days.length - 1];

    lastDay.items.push({
      type: "logistics",
      code: config.departure.code,
      title: config.departure.title,
      description: config.departure.description
    });
  }

  function getTourCode(tour) {
    return tour?.internalCode || tour?.code || tour?.id || "";
  }

  function getTourTitle(tour) {
    return String(tour?.title || "").toLowerCase();
  }

  function isCityTour(tour) {
    const code = getTourCode(tour);
    const title = getTourTitle(tour);

    return code === "CUZ002" || title.includes("city tour");
  }

  function isWelcomeTour(tour) {
    const code = getTourCode(tour);
    const title = getTourTitle(tour);

    return (
      code === "CUZ001" ||
      title.includes("bienvenida") ||
      title.includes("ancestral") ||
      title.includes("panorámico") ||
      title.includes("panoramico")
    );
  }

  function isMachuPicchu(tour) {
    const code = getTourCode(tour);
    const title = getTourTitle(tour);

    return /^MAPI/i.test(code) || title.includes("machu picchu");
  }

  function isLightFirstDayTour(tour) {
    return isWelcomeTour(tour) || isCityTour(tour);
  }

  function toItineraryItem(tour) {
    return {
      type: "tour",
      code: getTourCode(tour),
      title: tour?.title || "Actividad",
      description: tour?.shortDescription || tour?.description || "",
      duration: tour?.duration?.label || tour?.typeLabel || ""
    };
  }

  function sortToursByPriority(tours = []) {
    return [...tours].sort((a, b) => {
      const aScore = getTourPriority(a);
      const bScore = getTourPriority(b);

      if (aScore !== bScore) return aScore - bScore;

      return String(a.title || "").localeCompare(String(b.title || ""), "es");
    });
  }

  function getTourPriority(tour) {
    if (isWelcomeTour(tour)) return 10;
    if (isCityTour(tour)) return 20;
    if (isMachuPicchu(tour)) return 80;

    return 50;
  }

  function removeTours(sourceTours, toursToRemove) {
    const removeKeys = new Set(toursToRemove.map((tour) => getTourCode(tour)));

    return sourceTours.filter((tour) => !removeKeys.has(getTourCode(tour)));
  }

  function pickShowcaseDay1Tours(tours = []) {
    const welcome = tours.find(isWelcomeTour);
    const cityTour = tours.find(isCityTour);

    const selected = [];

    if (welcome) selected.push(welcome);
    if (cityTour && getTourCode(cityTour) !== getTourCode(welcome)) selected.push(cityTour);

    if (!selected.length) {
      const lightTours = tours.filter(isLightFirstDayTour).slice(0, 2);
      selected.push(...lightTours);
    }

    return selected.slice(0, 2);
  }

  function placeShowcaseTours(days, tours = []) {
    if (!days.length) return;

    let remainingTours = sortToursByPriority(tours);

    const day1Tours = pickShowcaseDay1Tours(remainingTours);

    day1Tours.forEach((tour) => {
      days[0].items.push(toItineraryItem(tour));
    });

    remainingTours = removeTours(remainingTours, day1Tours);

    const middleStartIndex = 1;
    const lastAvailableTourDayIndex = Math.max(days.length - 2, 0);

    let currentDayIndex = middleStartIndex;

    remainingTours.forEach((tour) => {
      if (currentDayIndex > lastAvailableTourDayIndex) return;

      days[currentDayIndex].items.push(toItineraryItem(tour));
      currentDayIndex += 1;
    });
  }

  function parseTimeToMinutes(time) {
    if (!time || typeof time !== "string") return null;

    const [hoursRaw, minutesRaw = "0"] = time.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    return (hours * 60) + minutes;
  }

  function canUseDay1Dynamic(arrivalTime, cutoffHour = 15) {
    const arrivalMinutes = parseTimeToMinutes(arrivalTime);

    if (arrivalMinutes === null) return false;

    const availableMinutes = arrivalMinutes + 120;
    const cutoffMinutes = cutoffHour * 60;

    return availableMinutes <= cutoffMinutes;
  }

  function placeDynamicTours(days, tours = [], context = {}) {
    if (!days.length) return;

    let remainingTours = sortToursByPriority(tours);

    const arrivalTime = context.arrivalTime || "15:00";
    const canDoDay1 = canUseDay1Dynamic(arrivalTime, 16);

    if (canDoDay1) {
      const day1Tours = pickShowcaseDay1Tours(remainingTours).slice(0, 1);

      day1Tours.forEach((tour) => {
        days[0].items.push(toItineraryItem(tour));
      });

      remainingTours = removeTours(remainingTours, day1Tours);
    }

    const middleStartIndex = 1;
    const lastAvailableTourDayIndex = Math.max(days.length - 2, 0);

    let currentDayIndex = middleStartIndex;

    remainingTours.forEach((tour) => {
      if (currentDayIndex > lastAvailableTourDayIndex) return;

      days[currentDayIndex].items.push(toItineraryItem(tour));
      currentDayIndex += 1;
    });
  }

  function cleanEmptyDays(days) {
    return days.map((day) => {
      if (!day.items.length) {
        return {
          ...day,
          items: [
            {
              type: "free",
              title: "Tiempo libre"
            }
          ]
        };
      }

      return day;
    });
  }

  function buildItinerary(option, context = {}) {
    if (!option) return [];

    const totalDays = Number(option.days || 0);

    if (!Number.isFinite(totalDays) || totalDays <= 0) return [];

    const days = createEmptyDays(totalDays);
    const logistics = context.packagesCusco?.defaultLogisticsServices;
    const mode = context.mode || "showcase";

    insertTransferIn(days, logistics);

    if (mode === "dynamic") {
      placeDynamicTours(days, option.includedTours || [], context);
    } else {
      placeShowcaseTours(days, option.includedTours || []);
    }

    insertTransferOut(days, logistics);

    return cleanEmptyDays(days);
  }

  window.MyCuscoTripItineraryBuilder = {
    buildItinerary
  };
})();
