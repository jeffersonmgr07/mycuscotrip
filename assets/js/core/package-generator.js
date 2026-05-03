"use strict";

/**
 * My Cusco Trip - Package Generator
 * Genera combinaciones dinámicas, no itinerarios hardcodeados.
 *
 * Versión Cusco con reglas operativas:
 * - Valle Sagrado conexión solo combina con Machu Picchu Overnight.
 * - Valle Sagrado full day solo combina con Machu Picchu Full Day.
 * - Valle Sagrado conexión NO combina con Machu Picchu Full Day.
 * - Valle Sagrado full day NO combina con Machu Picchu Overnight.
 * - Machu Picchu Full Day / Overnight normal NO debe ir antes de trekking pesado.
 * - Machu Picchu Express / Overnight Express sí puede combinar con trekking pesado.
 * - Máximo una experiencia Machu Picchu por paquete.
 * - No duplica tours por contenido.
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

  function getTourByCode(code, tourIndex) {
    return tourIndex.get(code) || null;
  }

  function getTourCode(tour) {
    return tour?.internalCode || tour?.code || tour?.id || "";
  }

  function getTourTitle(tour) {
    return normalizeText(tour?.title || tour?.name || "");
  }

  function getTourSlug(tour) {
    return normalizeText(tour?.slug || "");
  }

  function hasWord(tour, words = []) {
    const text = `${getTourCode(tour)} ${getTourTitle(tour)} ${getTourSlug(tour)} ${normalizeText(tour?.productFamily || "")} ${normalizeText(tour?.category || "")}`;
    return words.some((word) => text.includes(normalizeText(word)));
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

  function hasCode(codes, code) {
    return toArray(codes).includes(code);
  }

  function removeCodes(codes, codesToRemove) {
    const removeSet = new Set(toArray(codesToRemove));
    return toArray(codes).filter((code) => !removeSet.has(code));
  }

  function isMachuPicchuCode(code) {
    return /^MAPI/i.test(String(code || ""));
  }

  function isTrekkingCode(code, packagesCusco) {
    const trekkingCodes = toArray(packagesCusco?.tourReferences?.cusco?.trekkings);
    return trekkingCodes.includes(code);
  }

  function isHeavyTrekkingCode(code, packagesCusco, tourIndex) {
    if (isTrekkingCode(code, packagesCusco)) return true;

    const tour = getTourByCode(code, tourIndex);
    if (!tour) return false;

    return hasWord(tour, [
      "montana de colores",
      "montaña de colores",
      "vinicunca",
      "humantay",
      "palcoyo",
      "7 lagunas",
      "siete lagunas",
      "ausangate"
    ]);
  }

  function isWelcomeCode(code, packagesCusco, tourIndex) {
    const refs = packagesCusco?.tourReferences?.cusco || {};
    const known = [
      ...toArray(refs.welcome),
      ...toArray(refs.bienvenida),
      ...toArray(refs.ancestral),
      ...toArray(refs.panorama),
      ...toArray(refs.panoramic)
    ];

    if (known.includes(code)) return true;

    const tour = getTourByCode(code, tourIndex);
    if (!tour) return false;

    return hasWord(tour, [
      "bienvenida",
      "ancestral",
      "panoramico",
      "panorámico"
    ]);
  }

  function isCityTourCode(code, packagesCusco, tourIndex) {
    const refs = packagesCusco?.tourReferences?.cusco || {};
    if (toArray(refs.cityTour).includes(code)) return true;
    if (code === "CUZ002") return true;

    const tour = getTourByCode(code, tourIndex);
    if (!tour) return false;

    return hasWord(tour, ["city tour"]);
  }

  function isSacredValleyCode(code, packagesCusco) {
    return toArray(packagesCusco?.tourReferences?.cusco?.sacredValley).includes(code);
  }

  function isSacredValleyConnectionCode(code, packagesCusco, tourIndex) {
    const refs = packagesCusco?.tourReferences?.cusco || {};
    const explicit = [
      ...toArray(refs.sacredValleyConnection),
      ...toArray(refs.sacredValleyConnections),
      ...toArray(refs.connection)
    ];

    if (explicit.includes(code)) return true;

    const tour = getTourByCode(code, tourIndex);
    if (!tour) return false;

    return isSacredValleyCode(code, packagesCusco) && hasWord(tour, [
      "conexion",
      "conexión",
      "ollantaytambo",
      "aguas calientes"
    ]);
  }

  function isSacredValleyFullDayCode(code, packagesCusco, tourIndex) {
    if (!isSacredValleyCode(code, packagesCusco)) return false;
    if (isSacredValleyConnectionCode(code, packagesCusco, tourIndex)) return false;

    const tour = getTourByCode(code, tourIndex);
    if (!tour) return true;

    return hasWord(tour, ["full day", "dia completo", "día completo", "valle sagrado"]);
  }

  function getMachuPicchuModeByCode(code, packagesCusco, tourIndex) {
    const mapiRefs = packagesCusco?.tourReferences?.machuPicchu || {};
    const tour = getTourByCode(code, tourIndex);

    if (toArray(mapiRefs.fullDayExpress).includes(code)) return "full-day-express";
    if (toArray(mapiRefs.overnightExpress).includes(code)) return "overnight-express";
    if (toArray(mapiRefs.fullDayClassic).includes(code)) return "full-day";
    if (toArray(mapiRefs.overnightClassic).includes(code)) return "overnight";
    if (toArray(mapiRefs.fullDay).includes(code)) return hasWord(tour, ["express"]) ? "full-day-express" : "full-day";
    if (toArray(mapiRefs.overnight).includes(code)) return hasWord(tour, ["express"]) ? "overnight-express" : "overnight";

    if (!tour) return "none";

    if (hasWord(tour, ["overnight", "2 dias", "2 días"])) {
      return hasWord(tour, ["express"]) ? "overnight-express" : "overnight";
    }

    if (hasWord(tour, ["full day", "dia completo", "día completo"])) {
      return hasWord(tour, ["express"]) ? "full-day-express" : "full-day";
    }

    return "full-day";
  }

  function isMachuPicchuExpressMode(mode) {
    return mode === "full-day-express" || mode === "overnight-express";
  }

  function getCodesByMachuMode(packagesCusco, mode) {
    const mapiRefs = packagesCusco?.tourReferences?.machuPicchu || {};

    if (mode === "full-day") {
      return uniqueCodes([
        ...toArray(mapiRefs.fullDayClassic),
        ...toArray(mapiRefs.fullDay)
      ]);
    }

    if (mode === "full-day-express") {
      return uniqueCodes([
        ...toArray(mapiRefs.fullDayExpress),
        ...toArray(mapiRefs.fullDay)
      ]);
    }

    if (mode === "overnight") {
      return uniqueCodes([
        ...toArray(mapiRefs.overnightClassic),
        ...toArray(mapiRefs.overnight)
      ]);
    }

    if (mode === "overnight-express") {
      return uniqueCodes([
        ...toArray(mapiRefs.overnightExpress),
        ...toArray(mapiRefs.overnight)
      ]);
    }

    return [];
  }

  function chooseFirstAvailable(codes, tourIndex) {
    return toArray(codes).find((code) => tourIndex.has(code)) || toArray(codes)[0] || null;
  }

  function createSignature(option) {
    const codes = uniqueCodes(option.includedTourCodes).sort();

    const flags = [
      option.machuPicchuMode || "",
      option.connectionMode || "",
      option.sacredValleyMode || "",
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

  function getCandidatePools(durationConfig, packagesCusco) {
    const refs = packagesCusco?.tourReferences?.cusco || {};

    const allowedTours = uniqueCodes(durationConfig?.allowedTours);
    const requiredTours = uniqueCodes(durationConfig?.requiredTours);

    return {
      requiredTours,
      allowedTours,
      welcome: uniqueCodes([
        ...toArray(refs.welcome),
        ...toArray(refs.bienvenida),
        ...toArray(refs.ancestral),
        ...toArray(refs.panorama),
        ...toArray(refs.panoramic)
      ]).filter((code) => allowedTours.includes(code)),
      cityTour: toArray(refs.cityTour).filter((code) => allowedTours.includes(code)),
      sacredValley: toArray(refs.sacredValley).filter((code) => allowedTours.includes(code)),
      sacredValleyConnection: uniqueCodes([
        ...toArray(refs.sacredValleyConnection),
        ...toArray(refs.sacredValleyConnections),
        ...toArray(refs.connection)
      ]).filter((code) => allowedTours.includes(code)),
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

  function chooseMachuPicchuCode(params, durationConfig, packagesCusco, context = {}) {
    const rules = packagesCusco?.globalRules || {};
    const days = Number(params.days);
    const nights = Number(params.nights);
    const tourIndex = context.tourIndex || new Map();

    if (context.forceMode) {
      return chooseFirstAvailable(getCodesByMachuMode(packagesCusco, context.forceMode), tourIndex);
    }

    if (rules.threeDaysTwoNightsRequiresFullDayMachuPicchu && days === 3 && nights === 2) {
      return chooseFirstAvailable(getCodesByMachuMode(packagesCusco, "full-day"), tourIndex);
    }

    if (context.requiresOvernightExpress) {
      return chooseFirstAvailable(getCodesByMachuMode(packagesCusco, "overnight-express"), tourIndex);
    }

    if (context.requiresOvernight) {
      return chooseFirstAvailable(getCodesByMachuMode(packagesCusco, "overnight"), tourIndex);
    }

    if (durationConfig?.allowOvernightMachuPicchu) {
      return chooseFirstAvailable(getCodesByMachuMode(packagesCusco, "overnight"), tourIndex);
    }

    if (durationConfig?.allowFullDayMachuPicchu !== false) {
      return chooseFirstAvailable(getCodesByMachuMode(packagesCusco, "full-day"), tourIndex);
    }

    return null;
  }

  function detectSacredValleyMode(codes, packagesCusco, tourIndex) {
    const sacredCodes = toArray(codes).filter((code) => isSacredValleyCode(code, packagesCusco));

    if (!sacredCodes.length) return "none";

    if (sacredCodes.some((code) => isSacredValleyConnectionCode(code, packagesCusco, tourIndex))) {
      return "connection";
    }

    return "full-day";
  }

  function detectCurrentMachuMode(codes, packagesCusco, tourIndex) {
    const machuCode = toArray(codes).find(isMachuPicchuCode);
    if (!machuCode) return "none";
    return getMachuPicchuModeByCode(machuCode, packagesCusco, tourIndex);
  }

  function replaceMachuPicchuByMode(codes, mode, packagesCusco, tourIndex) {
    const withoutMachu = removeCodes(codes, toArray(codes).filter(isMachuPicchuCode));
    const selected = chooseMachuPicchuCode({}, {}, packagesCusco, {
      tourIndex,
      forceMode: mode
    });

    if (selected) withoutMachu.push(selected);

    return uniqueCodes(withoutMachu);
  }

  function hasHeavyTrekking(codes, packagesCusco, tourIndex) {
    return toArray(codes).some((code) => isHeavyTrekkingCode(code, packagesCusco, tourIndex));
  }

  function applyValleyMachuPicchuRules(option, params, durationConfig, packagesCusco, tourIndex) {
    let codes = uniqueCodes(option.includedTourCodes);
    if (option.forceSacredValleyConnection === true) {
      codes = replaceMachuPicchuByMode(codes, "overnight", packagesCusco, tourIndex);
    
      option.connectionMode = "sacred-valley-connection";
      option.sacredValleyMode = "connection";
      option.requiresOvernight = true;
      option.includedTourCodes = uniqueCodes(codes);
    
      return option;
    }

    const sacredValleyMode = detectSacredValleyMode(codes, packagesCusco, tourIndex);

    if (sacredValleyMode === "connection") {
      codes = replaceMachuPicchuByMode(codes, "overnight", packagesCusco, tourIndex);
      option.connectionMode = "sacred-valley-connection";
      option.sacredValleyMode = "connection";
      option.requiresOvernight = true;
    }

    if (sacredValleyMode === "full-day") {
      codes = replaceMachuPicchuByMode(codes, "full-day", packagesCusco, tourIndex);
      option.connectionMode = "none";
      option.sacredValleyMode = "full-day";
      option.requiresOvernight = false;
    }

    option.includedTourCodes = uniqueCodes(codes);

    return option;
  }

  function applyTrekkingAfterMachuPicchuRules(option, params, durationConfig, packagesCusco, tourIndex) {
    let codes = uniqueCodes(option.includedTourCodes);

    const trekking = hasHeavyTrekking(codes, packagesCusco, tourIndex);
    const machuMode = detectCurrentMachuMode(codes, packagesCusco, tourIndex);

    option.hasTrekkingAfterMachuPicchu = false;
    option.requiresOvernightExpress = false;

    if (!trekking || machuMode === "none") {
      option.includedTourCodes = codes;
      return option;
    }

    if (isMachuPicchuExpressMode(machuMode)) {
      option.hasTrekkingAfterMachuPicchu = true;
      option.includedTourCodes = codes;
      return option;
    }

    const replacementMode = machuMode === "overnight" ? "overnight-express" : "full-day-express";
    const replaced = replaceMachuPicchuByMode(codes, replacementMode, packagesCusco, tourIndex);

    const newMode = detectCurrentMachuMode(replaced, packagesCusco, tourIndex);

    if (isMachuPicchuExpressMode(newMode)) {
      option.hasTrekkingAfterMachuPicchu = true;
      option.requiresOvernightExpress = newMode === "overnight-express";
      option.includedTourCodes = replaced;
      return option;
    }

    option.includedTourCodes = codes.filter((code) => !isHeavyTrekkingCode(code, packagesCusco, tourIndex));
    option.hasTrekkingAfterMachuPicchu = false;

    return option;
  }

  function applyOperationalRules(option, params, durationConfig, packagesCusco, tourIndex) {
    option.connectionMode = "none";
    option.sacredValleyMode = "none";
    option.machuPicchuMode = "none";
    option.hasTrekkingAfterMachuPicchu = false;
    option.requiresOvernight = false;
    option.requiresOvernightExpress = false;

    option.includedTourCodes = uniqueCodes(option.includedTourCodes);

    option = applyValleyMachuPicchuRules(option, params, durationConfig, packagesCusco, tourIndex);
    option = applyTrekkingAfterMachuPicchuRules(option, params, durationConfig, packagesCusco, tourIndex);

    const hasMachu = option.includedTourCodes.some(isMachuPicchuCode);

    if (!hasMachu) {
      const selectedMachu = chooseMachuPicchuCode(params, durationConfig, packagesCusco, {
        tourIndex,
        requiresOvernight: option.requiresOvernight,
        requiresOvernightExpress: option.requiresOvernightExpress
      });

      if (selectedMachu) option.includedTourCodes.push(selectedMachu);
    }

    option.includedTourCodes = uniqueCodes(option.includedTourCodes);
    option.machuPicchuMode = detectCurrentMachuMode(option.includedTourCodes, packagesCusco, tourIndex);
    option.sacredValleyMode = detectSacredValleyMode(option.includedTourCodes, packagesCusco, tourIndex);

    if (option.sacredValleyMode === "connection") {
      option.connectionMode = "sacred-valley-connection";
    }

    return option;
  }

  function isValidPackageOption(option, params, durationConfig, packagesCusco, tourIndex) {
    const codes = uniqueCodes(option.includedTourCodes);

    const sacredValleyMode = detectSacredValleyMode(codes, packagesCusco, tourIndex);
    const machuMode = detectCurrentMachuMode(codes, packagesCusco, tourIndex);
    const trekking = hasHeavyTrekking(codes, packagesCusco, tourIndex);

    if (sacredValleyMode === "connection" && !["overnight", "overnight-express"].includes(machuMode)) {
      return false;
    }

    if (sacredValleyMode === "full-day" && ["overnight", "overnight-express"].includes(machuMode)) {
      return false;
    }

    if (trekking && ["full-day", "overnight"].includes(machuMode)) {
      return false;
    }

    const machuCodes = codes.filter(isMachuPicchuCode);
    if (machuCodes.length > 1) return false;

    return true;
  }

  function ensureShowcaseBaseTours(codes, pools, packagesCusco, tourIndex) {
    let result = uniqueCodes(codes);

    const welcomeCode =
      pools.welcome.find((code) => !result.includes(code)) ||
      pools.halfDay.find((code) => isWelcomeCode(code, packagesCusco, tourIndex) && !result.includes(code));

    const cityCode =
      pools.cityTour.find((code) => !result.includes(code)) ||
      pools.halfDay.find((code) => isCityTourCode(code, packagesCusco, tourIndex) && !result.includes(code));

    if (welcomeCode) result.push(welcomeCode);
    if (cityCode) result.push(cityCode);

    return uniqueCodes(result);
  }
  function ensureMachuPicchuRequired(codes, params, durationConfig, packagesCusco, tourIndex) {
    let result = uniqueCodes(codes);
  
    if (result.some(isMachuPicchuCode)) {
      return result;
    }
  
    const days = Number(params.days || 0);
    const nights = Number(params.nights || 0);
  
    let preferredMode = "overnight";
  
    if (days === 3 && nights === 2) {
      preferredMode = "full-day";
    }
  
    const selectedMachu = chooseMachuPicchuCode(params, durationConfig, packagesCusco, {
      tourIndex,
      forceMode: preferredMode
    });
  
    if (selectedMachu) {
      result.push(selectedMachu);
    }
  
    return uniqueCodes(result);
  }
  
  function ensureDefaultValleyConnectionMachuPicchu(codes, params, durationConfig, packagesCusco, tourIndex, pools) {
    let result = uniqueCodes(codes);
  
    const days = Number(params.days || 0);
    const nights = Number(params.nights || 0);
  
    if (days === 3 && nights === 2) {
      return ensureMachuPicchuRequired(result, params, durationConfig, packagesCusco, tourIndex);
    }
  
    const connectionCode =
      pools.sacredValleyConnection.find((code) => !result.includes(code)) ||
      pools.sacredValley.find((code) => isSacredValleyConnectionCode(code, packagesCusco, tourIndex));
  
    if (connectionCode) {
      result = result.filter((code) => !isSacredValleyCode(code, packagesCusco));
      result.push(connectionCode);
    }
  
    result = removeCodes(result, result.filter(isMachuPicchuCode));
  
    const overnightCode = chooseMachuPicchuCode(params, durationConfig, packagesCusco, {
      tourIndex,
      forceMode: "overnight"
    });
  
    if (overnightCode) {
      result.push(overnightCode);
    }
  
    return uniqueCodes(result);
  }

  function expandOptionalTours(baseOption, pools, durationConfig, packagesCusco, tourIndex) {
    const maxOptions = Number(packagesCusco?.generationEngine?.maxGeneratedOptionsPerDuration || 36);
    const maxTrekkings = Number(durationConfig?.maxTrekkings || 1);
    const options = [];

    const baseCodes = uniqueCodes(baseOption.includedTourCodes);
    const optionalFullDays = pools.fullDay.filter((code) => !baseCodes.includes(code));
    const optionalHalfDays = pools.halfDay.filter((code) => !baseCodes.includes(code));

    options.push({
      ...baseOption,
      includedTourCodes: [...baseCodes],
      generationReason: "recommended-base"
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
  
    const codes = option.includedTourCodes || [];
  
    // Base comercial
    if (codes.some((code) => code === "CUZ001")) score += 24; // Bienvenida ancestral
    if (codes.some((code) => code === "CUZ002")) score += 22; // City Tour
    if (codes.some((code) => code === "CUZ003")) score += 18; // Valle Sagrado
    if (codes.some(isMachuPicchuCode)) score += 30; // Machu Picchu obligatorio
  
    // Prioridad principal: opción recomendada comercial
    if (option.connectionMode === "sacred-valley-connection") score += 40;
    if (option.sacredValleyMode === "connection") score += 25;
    if (option.machuPicchuMode === "overnight") score += 35;
  
    // Opciones express útiles, pero no por encima del default comercial
    if (option.machuPicchuMode === "overnight-express") score += 20;
    if (option.machuPicchuMode === "full-day-express") score += 12;
  
    // Penalizar opciones menos recomendadas para vitrina
    if (option.sacredValleyMode === "full-day") score -= 12;
    if (option.machuPicchuMode === "full-day") score -= 10;
  
    // Tours adicionales de alto valor
    if (codes.some((code) => /^CUZ00[6-9]/.test(code))) score += 10; // Trekkings/naturaleza
  
    // Bonus para la opción base recomendada
    if (option.generationReason === "recommended-base") score += 30;
  
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
      forceSacredValleyConnection: generationReason === "recommended-base",
      sourceConfig: durationConfig,
      rawCard: card || null,
      score: 0
    };

    applyRequiredTours(option, packagesCusco?.globalRules || {});
    applyOperationalRules(option, params, durationConfig, packagesCusco, tourIndex);
    applyRequiredTours(option, packagesCusco?.globalRules || {});

    option.includedTours = resolveCodes(option.includedTourCodes, tourIndex);
    option.score = calculateOptionScore(option);
    option.signature = createSignature(option);

    return option;
  }
  function ensureMinimumShowcaseActivities(codes, pools, params, packagesCusco, tourIndex) {
    let result = uniqueCodes(codes);
  
    const minimumTourCount = Math.max(Number(params.days || 0), result.length);
  
    const candidates = uniqueCodes([
      ...pools.fullDay,
      ...pools.cultural,
      ...pools.halfDay,
      ...pools.trekkings
    ]).filter((code) => !result.includes(code));
  
    for (const candidate of candidates) {
      if (result.length >= minimumTourCount) break;
  
      const testCodes = uniqueCodes([...result, candidate]);
  
      const tempOption = {
        includedTourCodes: testCodes
      };
  
      applyOperationalRules(
        tempOption,
        params,
        {
          days: params.days,
          nights: params.nights,
          maxTrekkings: 1
        },
        packagesCusco,
        tourIndex
      );
  
      if (
        isValidPackageOption(
          tempOption,
          params,
          {
            days: params.days,
            nights: params.nights,
            maxTrekkings: 1
          },
          packagesCusco,
          tourIndex
        )
      ) {
        result = uniqueCodes(tempOption.includedTourCodes);
      }
    }
  
    return result;
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

    let baseCodes = uniqueCodes([
      ...pools.requiredTours
    ]);

    baseCodes = ensureShowcaseBaseTours(baseCodes, pools, packagesCusco, tourIndex);

    baseCodes = ensureDefaultValleyConnectionMachuPicchu(
      baseCodes,
      params,
      effectiveConfig,
      packagesCusco,
      tourIndex,
      pools
    );
    
    baseCodes = ensureMachuPicchuRequired(
      baseCodes,
      params,
      effectiveConfig,
      packagesCusco,
      tourIndex
    );
    
    baseCodes = ensureMinimumShowcaseActivities(
      baseCodes,
      pools,
      params,
      packagesCusco,
      tourIndex
    );

    const selectedMachu = chooseMachuPicchuCode(params, effectiveConfig, packagesCusco, {
      tourIndex
    });

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
      generationReason: "recommended-base"
    });

    const expanded = expandOptionalTours(baseOption, pools, effectiveConfig, packagesCusco, tourIndex)
      .map((option) => buildPackageOption({
        params,
        card,
        durationConfig: effectiveConfig,
        profile,
        codes: ensureMachuPicchuRequired(
          option.includedTourCodes,
          params,
          effectiveConfig,
          packagesCusco,
          tourIndex
        ),
        tourIndex,
        packagesCusco,
        generationReason: option.generationReason
      }))
      .filter((option) => option.includedTourCodes.some(isMachuPicchuCode))
      .filter((option) => isValidPackageOption(option, params, effectiveConfig, packagesCusco, tourIndex));

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
    rankPackageOptions,
    isValidPackageOption
  };
})();
