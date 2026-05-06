"use strict";

/**
 * My Cusco Trip - Data Loader
 * Carga centralizada de archivos JSON del sistema.
 * No hardcodea itinerarios. Solo carga datos.
 */

const MCT_DATA_PATHS = {
  toursCusco: "assets/data/tours-cusco.json",
  toursMachuPicchu: "assets/data/tours-machu-picchu.json",
  toursPeru: "assets/data/tours-peru.json",
  trekkingsCusco: "assets/data/trekkings-cusco.json",
  packagesCusco: "assets/data/packages-cusco.json",
  packagesPeru: "assets/data/packages-peru.json",
  trains: "assets/data/trains.json",
  hotels: "assets/data/hotels.json",
  currencyConfig: "assets/data/currency-config.json",
  paymentConfig: "assets/data/payment-config.json",
  destinations: "assets/data/destinations.json"
};

async function loadJson(path) {
  if (!path || typeof path !== "string") {
    console.warn("[MyCuscoTrip DataLoader] Ruta inválida:", path);
    return null;
  }

  try {
    const response = await fetch(path, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[MyCuscoTrip DataLoader] No se pudo cargar: ${path}`, error);
    return null;
  }
}

function getDataSources() {
  return { ...MCT_DATA_PATHS };
}

async function loadAllData() {
  const sources = getDataSources();
  const entries = Object.entries(sources);

  const results = await Promise.allSettled(
    entries.map(async ([key, path]) => {
      const data = await loadJson(path);
      return [key, data];
    })
  );

  const loadedData = {};
  const errors = [];

  results.forEach((result, index) => {
    const [key, path] = entries[index];

    if (result.status === "fulfilled") {
      loadedData[key] = result.value[1];

      if (!result.value[1]) {
        errors.push({
          key,
          path,
          message: "Archivo no cargado o JSON vacío."
        });
      }
    } else {
      loadedData[key] = null;
      errors.push({
        key,
        path,
        message: result.reason?.message || "Error desconocido."
      });
    }
  });

  return {
    data: loadedData,
    sources,
    errors,
    hasErrors: errors.length > 0
  };
}

window.MyCuscoTripDataLoader = {
  loadJson,
  loadAllData,
  getDataSources,
  DATA_PATHS: MCT_DATA_PATHS
};
