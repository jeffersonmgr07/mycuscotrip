"use strict";

/**
 * My Cusco Trip - Package Generator
 * Versión inicial: solo paquetes Cusco.
 * Genera combinaciones dinámicas, no itinerarios hardcodeados.
 */

(function () {
  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getDataPayload(allData) {
    return allData?.data && typeof allData.data === "object" ? allData.data : allData;
  }

  function getProductsFromSource(source) {
    if (!source) return [];
    if (Array.isArray(source)) return source;
    if (Array.isArray(source.products)) return source.products;
    if (Array.isArray(source.tours)) return source.tours;
    return [];
  }

  function buildTourIndex(data) {
    const index = new Map();

    [
      ...getProductsFromSource(data.toursCusco),
      ...getProductsFromSource(data.toursMachuPicchu)
    ].forEach((tour) => {
      if (tour?.internalCode) index.set(tour.internalCode, tour);
      if (tour?.id) index.set(tour.id, tour);
      if (tour?.slug) index.set(tour.slug, tour);
    });

    return index;
  }

  function getDurationConfig(packagesCusco, days, nights) {
    const durationConfigs = toArray(packagesCusco?.durationConfigs);
    const d = Number(days);
    const n = Number(nights);

    return durationConfigs.find((item) => {
      return Number(item.days) === d && Number(item.nights) === n;
    }) || null;
  }

  function getPackageCard(packagesCusco, days, nights) {
    const cards = toArray(packagesCusco?.packageCards);
    const d = Number(days);
    const n = Number(nights);

    return cards.find((card) => {
      return Number(card.days) === d && Number(card.nights) === n;
    }) || null;
  }

  function getArrivalDepartureProfile(packagesCusco, params = {}) {
    const profiles = packagesCusco?.arrivalDepartureProfiles || {};
    const arrivalTime = params.arrivalTime || "09:00";
    const departureTime = params.departureTime || "20:00";

    const arrivalHour = Number(String(arrivalTime).split(":")[0]);
    const departureHour = Number(String(departureTime).split(":")[0]);

    const arrivalProfile = arrivalHour >= 14 ? "late-arrival" : "early-arrival";
    const departureProfile = departureHour <= 12 ? "early-departure" : "late-departure";
    const key = `${arrivalProfile}__${departureProfile}`;

    return profiles[key] || profiles["early-arrival__late-departure"] || null;
  }

  function resolveCodes(codes, tourIndex) {
    return toArray(codes)
      .map((code) => tourIndex.get(code))
      .filter(Boolean);
  }

  function uniqueCodes(codes) {
    return Array.from(new Set(toArray(codes).filter(Boolean)));
  }

  function createSignature(option) {
    const codes = uniqueCodes(option.includedTourCodes).sort();
    const flags = [
      option.machuPicchuMode || "",
      option.connectionMode || "",
      option.vipMode ? "vip" : "",
      option.hasTrekkingAfterMachuPicchu ? "trek-after-mapi" : ""
    ].filter(Boolean);

    return [...codes, ...flags].sort().join("|");
  }

  function dedupePackageOptions(options = []) {
    const seen = new Set();

    return options.filter((option) => {
      const signature = createSignature(option);
      if (seen.has(signature)) return false;
      seen.add(signature);
      option.signature = signature;
      return true;
    });
  }

  function isMachuPicchuCode(code) {
    return /^MAPI/i.test(String(code || ""));
  }

  function isTrekkingCode(code, packagesCusco) {
    const trekkingCodes = toArray(packagesCusco?.tourReferences?.cusco?.trekkings);
    return trekkingCodes.includes(code);
  }

  function hasCode(codes, code) {
    return toArray(codes).includes(code);
  }

  function removeCodes(codes, codesToRemove) {
    const removeSet = new Set(toArray(codesToRemove));
    return toArray(codes).filter((code) => !removeSet.has(code));
  }

  function chooseMachuPicchuCode(params, durationConfig, packagesCusco, context = {}) {
    const rules = packagesCusco?.globalRules || {};
    const mapiRefs = packagesCusco?.tourReferences?.machuPicchu || {};
    const days = Number(params.days);
    const nights = Number(params.nights);

    if (rules.threeDaysTwoNightsRequiresFullDayMachuPicchu && days === 3 && nights === 2) {
      return toArray(mapiRefs.fullDayClassic)[0] || toArray(mapiRefs.fullDay)[0] || null;
    }

    if (context.requiresOvernightExpress) {
      return toArray(mapiRefs.overnightExpress)[0] || toArray(mapiRefs.overnight)[0] || null;
    }

    if (context.requiresOvernight) {
      return toArray(mapiRefs.overnightClassic)[0] || toArray(mapiRefs.overnight)[0] || null;
    }

    if (durationConfig?.allowOvernightMachuPicchu) {
      return toArray(mapiRefs.overnightClassic)[0] || toArray(mapiRefs.overnight)[0] || null;
    }

    if (durationConfig?.allowFullDayMachuPicchu !== false) {
      return toArray(mapiRefs.fullDayClassic)[0] || toArray(mapiRefs.fullDay)[0] || null;
    }

    return null;
  }

  function getCandidatePools(durationConfig, packagesCusco) {
    const refs = packagesCusco?.tourReferences?.cusco || {};

    const allowedTours = uniqueCodes(durationConfig?.allowedTours);
    const requiredTours = uniqueCodes(durationConfig?.requiredTours);

    return {
      requiredTours,
      allowedTours,
      cityTour: toArray(refs.cityTour).filter((code) => allowedTours.includes(code)),
      sacredValley: toArray(refs.sacredValley).filter((code) => allowedTours.includes(code)),
      cultural: toArray(refs.cultural).filter((code) => allowedTours.includes(code)),
      halfDay: toArray(refs.halfDay).filter((code) => allowedTours.includes(code)),
      fullDay: toArray(refs.fullDay).filter((code) => allowedTours.includes(code)),
      trekkings: toArray(refs.trekkings).filter((code) => allowedTours.includes(code))
    };
  }

  function applyRequiredTours(option, rules = {}) {
    option.includedTourCodes = uniqueCodes(option.includedTourCodes);

    if (rules.maximumOneMachuPicchuExperiencePerPackage) {
      const machuCodes = option.includedTourCodes.filter(isMachuPicchuCode);

      if (machuCodes.length > 1) {
        const keep = machuCodes[0];
        option.includedTourCodes = option.includedTourCodes.filter((code) => {
          return !isMachuPicchuCode(code) || code === keep;
        });
      }
    }

    return option;
  }

  function applyOperationalRules(option, params, durationConfig, packagesCusco) {
    const rules = packagesCusco?.globalRules || {};
    const codes = option.includedTourCodes;

    const hasSacredValley = codes.some((code) => {
      return toArray(packagesCusco?.tourReferences?.cusco?.sacredValley).includes(code);
    });

    const hasTrekking = codes.some((code) => isTrekkingCode(code, packagesCusco));
    const hasMachuPicchu = codes.some(isMachuPicchuCode);

    option.connectionMode = "none";
    option.machuPicchuMode = "none";
    option.hasTrekkingAfterMachuPicchu = false;

    if (rules.sacredValleyConnectionRequiresOvernightMachuPicchu && hasSacredValley && durationConfig?.allowConnection) {
      option.connectionMode = "sacred-valley-connection";
      option.requiresOvernight = true;
    }

    if (hasTrekking && hasMachuPicchu && rules.trekkingAfterMachuPicchuRequiresOvernightExpress) {
      option.requiresOvernightExpress = true;
      option.hasTrekkingAfterMachuPicchu = true;
    }

    const selectedMachu = chooseMachuPicchuCode(params, durationConfig, packagesCusco, {
      requiresOvernight: option.requiresOvernight,
      requiresOvernightExpress: option.requiresOvernightExpress
    });

    if (selectedMachu) {
      option.includedTourCodes = removeCodes(option.includedTourCodes, option.includedTourCodes.filter(isMachuPicchuCode));
      option.includedTourCodes.push(selectedMachu);

      option.machuPicchuMode = selectedMachu === "MAPI004"
        ? "overnight-express"
        : selectedMachu === "MAPI003"
          ? "overnight"
          : "full-day";
    }

    option.includedTourCodes = uniqueCodes(option.includedTourCodes);

    return option;
  }

  function expandOptionalTours(baseOption, pools, durationConfig, packagesCusco) {
    const maxOptions = Number(packagesCusco?.generationEngine?.maxGeneratedOptionsPerDuration || 36);
    const maxTrekkings = Number(durationConfig?.maxTrekkings || 1);
    const options = [];

    const baseCodes = uniqueCodes(baseOption.includedTourCodes);
    const optionalFullDays = pools.fullDay.filter((code) => !baseCodes.includes(code));
    const optionalHalfDays = pools.halfDay.filter((code) => !baseCodes.includes(code));

    options.push({
      ...baseOption,
      includedTourCodes: [...baseCodes],
      generationReason: "required-only"
    });

    optionalFullDays.forEach((fullDayCode) => {
      const trekkingCount = isTrekkingCode(fullDayCode, packagesCusco) ? 1 : 0;

      if (trekkingCount <= maxTrekkings) {
        options.push({
          ...baseOption,
          includedTourCodes: uniqueCodes([...baseCodes, fullDayCode]),
          generationReason: `optional-full-day-${fullDayCode}`
        });
      }
    });

    optionalFullDays.forEach((fullDayCode) => {
      optionalHalfDays.forEach((halfDayCode) => {
        const trekkingCount = [fullDayCode, halfDayCode].filter((code) => isTrekkingCode(code, packagesCusco)).length;

        if (trekkingCount <= maxTrekkings) {
          options.push({
            ...baseOption,
            includedTourCodes: uniqueCodes([...baseCodes, fullDayCode, halfDayCode]),
            generationReason: `optional-mixed-${fullDayCode}-${halfDayCode}`
          });
        }
      });
    });

    return options.slice(0, maxOptions);
  }

  function rankPackageOptions(options = []) {
    return [...options].sort((a, b) => {
      const scoreA = Number(a.score || calculateOptionScore(a));
      const scoreB = Number(b.score || calculateOptionScore(b));

      if (scoreA !== scoreB) return scoreB - scoreA;

      return a.includedTourCodes.length - b.includedTourCodes.length;
    });
  }

  function calculateOptionScore(option) {
    let score = 0;

    if (option.includedTourCodes.some((code) => code === "CUZ002")) score += 20;
    if (option.includedTourCodes.some((code) => code === "CUZ003")) score += 18;
    if (option.includedTourCodes.some(isMachuPicchuCode)) score += 30;
    if (option.machuPicchuMode === "overnight") score += 8;
    if (option.machuPicchuMode === "overnight-express") score += 6;
    if (option.connectionMode === "sacred-valley-connection") score += 6;
    if (option.includedTourCodes.some((code) => /^CUZ00[6-9]/.test(code))) score += 10;

    return score;
  }

  function buildPackageOption({ params, card, durationConfig, profile, codes, tourIndex, packagesCusco, generationReason }) {
    const option = {
      id: `dynamic_${card?.slug || "cusco"}_${Math.random().toString(36).slice(2, 8)}`,
      slug: card?.slug || "",
      title: card?.title || `Paquete Cusco ${params.days}D/${params.nights}N`,
      productKind: "package",
      productFamily: "cusco-package",
      days: Number(params.days),
      nights: Number(params.nights),
      typeLabel: card?.typeLabel || `${params.days} días / ${params.nights} noches`,
      location: card?.location || "Cusco / Machu Picchu",
      image: card?.image || "",
      badge: card?.badge || "",
      currency: packagesCusco?.defaultCurrency || "USD",
      priceMode: "dynamic_from_selected_itinerary",
      arrivalDepartureProfile: profile,
      includedTourCodes: uniqueCodes(codes),
      includedTours: [],
      generationReason: generationReason || "dynamic",
      sourceConfig: durationConfig,
      rawCard: card || null,
      score: 0
    };

    applyRequiredTours(option, packagesCusco?.globalRules || {});
    applyOperationalRules(option, params, durationConfig, packagesCusco);

    option.includedTours = resolveCodes(option.includedTourCodes, tourIndex);
    option.score = calculateOptionScore(option);
    option.signature = createSignature(option);

    return option;
  }

  function generateCuscoPackages(params = {}, context = {}) {
    const data = getDataPayload(context.allData || context.data || {});
    const packagesCusco = data.packagesCusco;

    if (!packagesCusco) {
      console.warn("[MyCuscoTrip PackageGenerator] No se encontró packages-cusco.json");
      return [];
    }

    const days = Number(params.days);
    const nights = Number(params.nights);

    if (!Number.isFinite(days) || !Number.isFinite(nights)) {
      console.warn("[MyCuscoTrip PackageGenerator] Duración inválida:", params);
      return [];
    }

    const durationConfig = getDurationConfig(packagesCusco, days, nights);
    const card = getPackageCard(packagesCusco, days, nights);
    const profile = getArrivalDepartureProfile(packagesCusco, params);
    const tourIndex = buildTourIndex(data);

    if (!durationConfig && !card) {
      console.warn("[MyCuscoTrip PackageGenerator] No hay configuración para duración:", days, nights);
      return [];
    }

    const effectiveConfig = durationConfig || {
      days,
      nights,
      allowedTours: card?.search?.includedTourCodes || [],
      requiredTours: card?.search?.includedTourCodes || [],
      allowFullDayMachuPicchu: true,
      allowOvernightMachuPicchu: days >= 4,
      allowConnection: days >= 5,
      maxTrekkings: 1
    };

    const pools = getCandidatePools(effectiveConfig, packagesCusco);

    const baseCodes = uniqueCodes([
      ...pools.requiredTours
    ]);

    const selectedMachu = chooseMachuPicchuCode(params, effectiveConfig, packagesCusco);

    if (selectedMachu && !baseCodes.some(isMachuPicchuCode)) {
      baseCodes.push(selectedMachu);
    }

    const baseOption = buildPackageOption({
      params,
      card,
      durationConfig: effectiveConfig,
      profile,
      codes: baseCodes,
      tourIndex,
      packagesCusco,
      generationReason: "base"
    });

    const expanded = expandOptionalTours(baseOption, pools, effectiveConfig, packagesCusco)
      .map((option) => buildPackageOption({
        params,
        card,
        durationConfig: effectiveConfig,
        profile,
        codes: option.includedTourCodes,
        tourIndex,
        packagesCusco,
        generationReason: option.generationReason
      }));

    const deduped = dedupePackageOptions(expanded);
    const ranked = rankPackageOptions(deduped);

    const maxRendered = Number(packagesCusco?.generationEngine?.maxRenderedOptionsPerPage || 12);

    return ranked.slice(0, maxRendered);
  }

  function generatePeruPackages() {
    console.warn("[MyCuscoTrip PackageGenerator] Paquetes Perú se implementarán después.");
    return [];
  }

  function generatePackageOptions(params = {}, allData = {}) {
    const family = normalizeText(params.productFamily || params.family || "cusco-package");

    if (family === "peru-package") {
      return generatePeruPackages(params, { allData });
    }

    return generateCuscoPackages(params, { allData });
  }

  window.MyCuscoTripPackageGenerator = {
    generatePackageOptions,
    generateCuscoPackages,
    generatePeruPackages,
    applyRequiredTours,
    expandOptionalTours,
    dedupePackageOptions,
    rankPackageOptions
  };
})();
