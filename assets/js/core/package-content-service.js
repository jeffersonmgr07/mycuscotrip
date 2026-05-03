"use strict";

/**
 * My Cusco Trip - Package Content Service
 * Genera contenido dinámico para paquetes:
 * - Incluye base
 * - No incluye
 * - Extras disponibles
 * - Extras seleccionados
 * - Modo todo incluido
 */

(function () {
  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function dedupeTextList(items = []) {
    const seen = new Set();

    return toArray(items)
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((item) => {
        const key = normalizeText(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function collectTourIncludes(option = {}) {
    const includes = [];

    toArray(option.includedTours).forEach((tour) => {
      const raw = tour.raw || tour;
      includes.push(...toArray(raw.includes));
    });

    return dedupeTextList(includes);
  }

  function collectTourExcludes(option = {}) {
    const excludes = [];

    toArray(option.includedTours).forEach((tour) => {
      const raw = tour.raw || tour;
      excludes.push(...toArray(raw.excludes));
    });

    return dedupeTextList(excludes);
  }

  function collectPackageExtras(option = {}) {
    const extras = [];

    toArray(option.includedTours).forEach((tour) => {
      const raw = tour.raw || tour;

      toArray(raw.extras).forEach((extra) => {
        extras.push({
          ...extra,
          sourceTourCode: raw.internalCode || tour.internalCode || "",
          sourceTourTitle: raw.title || tour.title || ""
        });
      });

      if (Array.isArray(raw.ticketPricingByNationality)) {
        raw.ticketPricingByNationality.forEach((extra) => {
          extras.push({
            ...extra,
            sourceTourCode: raw.internalCode || tour.internalCode || "",
            sourceTourTitle: raw.title || tour.title || ""
          });
        });
      }
    });

    return dedupeExtras(extras);
  }

  function dedupeExtras(extras = []) {
    const seen = new Set();

    return toArray(extras).filter((extra) => {
      const key = normalizeText(extra.code || extra.label || extra.sourceTourCode);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isRecommendedExtra(extra) {
    if (!extra) return false;

    if (extra.required) return true;

    const label = normalizeText(extra.label || extra.code || "");
    const type = normalizeText(extra.type || "");

    if (type === "ticket") return true;
    if (label.includes("boleto")) return true;
    if (label.includes("ingreso")) return true;
    if (label.includes("entrada")) return true;
    if (label.includes("almuerzo")) return true;

    return false;
  }

  function getRecommendedExtras(option = {}) {
    return collectPackageExtras(option).filter(isRecommendedExtra);
  }

  function getSelectedExtras(option = {}, selectedExtraCodes = []) {
    const selectedSet = new Set(toArray(selectedExtraCodes));
    return collectPackageExtras(option).filter((extra) => selectedSet.has(extra.code));
  }

  function getAllInclusiveExtraCodes(option = {}) {
    return getRecommendedExtras(option)
      .map((extra) => extra.code)
      .filter(Boolean);
  }

  function buildBaseIncludes(option = {}, accommodationPlan = []) {
    const base = [
      "Transfer IN al inicio del paquete",
      "Transfer OUT al finalizar el paquete",
      "Asistencia de viaje antes y durante la experiencia",
      "Tours indicados en el itinerario",
      "Transporte turístico según programa",
      "Guía profesional en español o inglés según operación"
    ];

    const hasMachuPicchu = toArray(option.includedTourCodes).some((code) => /^MAPI/i.test(code));

    if (hasMachuPicchu) {
      base.push("Experiencia Machu Picchu según modalidad seleccionada");
      base.push("Tren turístico según selección o configuración del paquete");
      base.push("Bus Consettur de subida y bajada a Machu Picchu");
      base.push("Ingreso oficial a Machu Picchu según disponibilidad");
    }

    if (toArray(accommodationPlan).length) {
      base.push("Alojamiento según categoría y habitación seleccionada");
    }

    return dedupeTextList(base);
  }

  function buildPackageIncludes(option = {}, accommodationPlan = [], selectedExtraCodes = []) {
    const baseIncludes = buildBaseIncludes(option, accommodationPlan);
    const selectedExtras = getSelectedExtras(option, selectedExtraCodes);

    const selectedExtraIncludes = selectedExtras.map((extra) => {
      return extra.label || extra.code;
    });

    return dedupeTextList([
      ...baseIncludes,
      ...selectedExtraIncludes
    ]);
  }

  function buildPackageExcludes(option = {}, selectedExtraCodes = []) {
    const selectedSet = new Set(toArray(selectedExtraCodes));
    const tourExcludes = collectTourExcludes(option);

    const dynamicExcludes = [
      "Vuelos nacionales o internacionales",
      "Gastos personales",
      "Servicios no mencionados expresamente",
      "Propinas voluntarias",
      "Upgrades opcionales no seleccionados"
    ];

    const extras = collectPackageExtras(option);

    extras.forEach((extra) => {
      if (!selectedSet.has(extra.code)) {
        dynamicExcludes.push(extra.label || extra.code);
      }
    });

    return dedupeTextList([
      ...dynamicExcludes,
      ...tourExcludes
    ]);
  }

  function buildExtrasViewModel(option = {}, selectedExtraCodes = []) {
    const selectedSet = new Set(toArray(selectedExtraCodes));

    return collectPackageExtras(option).map((extra) => ({
      code: extra.code || "",
      label: extra.label || extra.code || "Extra",
      type: extra.type || "extra",
      required: Boolean(extra.required),
      optional: Boolean(extra.optional),
      recommended: isRecommendedExtra(extra),
      selected: selectedSet.has(extra.code),
      perPerson: extra.perPerson !== false,
      sourceTourCode: extra.sourceTourCode || "",
      sourceTourTitle: extra.sourceTourTitle || "",
      raw: extra
    }));
  }

  function buildPackageContent(option = {}, context = {}) {
    const accommodationPlan = context.accommodationPlan || [];
    const selectedExtraCodes = context.selectedExtraCodes || [];

    const extras = buildExtrasViewModel(option, selectedExtraCodes);

    return {
      title: option.title || "",
      baseIncludes: buildBaseIncludes(option, accommodationPlan),
      includes: buildPackageIncludes(option, accommodationPlan, selectedExtraCodes),
      excludes: buildPackageExcludes(option, selectedExtraCodes),
      extras,
      recommendedExtraCodes: getAllInclusiveExtraCodes(option),
      allInclusiveAvailable: extras.some((extra) => extra.recommended),
      selectedExtraCodes: toArray(selectedExtraCodes)
    };
  }

  function applyAllInclusive(option = {}) {
    return getAllInclusiveExtraCodes(option);
  }

  window.MyCuscoTripPackageContentService = {
    dedupeTextList,
    collectTourIncludes,
    collectTourExcludes,
    collectPackageExtras,
    getRecommendedExtras,
    getSelectedExtras,
    getAllInclusiveExtraCodes,
    buildBaseIncludes,
    buildPackageIncludes,
    buildPackageExcludes,
    buildExtrasViewModel,
    buildPackageContent,
    applyAllInclusive
  };
})();
