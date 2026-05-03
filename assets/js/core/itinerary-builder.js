"use strict";

/**
 * My Cusco Trip - Itinerary Builder
 * Convierte combinaciones de tours en itinerarios por día.
 * No genera paquetes, solo organiza.
 */

(function () {

  function createEmptyDays(totalDays) {
    return Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      items: []
    }));
  }

  function insertTransferIn(days, config) {
    if (!config?.arrival) return;

    days[0].items.push({
      type: "logistics",
      code: config.arrival.code,
      title: config.arrival.title,
      description: config.arrival.description
    });
  }

  function insertTransferOut(days, config) {
    if (!config?.departure) return;

    const lastDay = days[days.length - 1];

    lastDay.items.push({
      type: "logistics",
      code: config.departure.code,
      title: config.departure.title,
      description: config.departure.description
    });
  }

  function sortToursByPriority(tours = []) {
    return [...tours].sort((a, b) => {
      const aCode = a.internalCode || "";
      const bCode = b.internalCode || "";

      if (aCode === "CUZ002") return -1; // City Tour primero
      if (bCode === "CUZ002") return 1;

      if (/MAPI/.test(aCode)) return 1; // Machu Picchu al final
      if (/MAPI/.test(bCode)) return -1;

      return 0;
    });
  }

  function placeTours(days, tours = []) {
    const orderedTours = sortToursByPriority(tours);

    let currentDay = 1;

    orderedTours.forEach((tour) => {
      if (currentDay >= days.length) return;

      days[currentDay].items.push({
        type: "tour",
        code: tour.internalCode || tour.id,
        title: tour.title,
        duration: tour.duration?.label || ""
      });

      currentDay++;
    });
  }

  function cleanEmptyDays(days) {
    return days.map((day) => {
      if (!day.items.length) {
        return {
          ...day,
          items: [{
            type: "free",
            title: "Tiempo libre"
          }]
        };
      }
      return day;
    });
  }

  function buildItinerary(option, context = {}) {
    if (!option) return [];

    const totalDays = Number(option.days || 0);
    const days = createEmptyDays(totalDays);

    const logistics = context.packagesCusco?.defaultLogisticsServices;

    insertTransferIn(days, logistics);
    insertTransferOut(days, logistics);

    placeTours(days, option.includedTours);

    return cleanEmptyDays(days);
  }

  window.MyCuscoTripItineraryBuilder = {
    buildItinerary
  };

})();
