(() => {
  'use strict';

  const CONFIG = Object.assign({
    appsScriptUrl: '',
    trainsJsonPath: '/assets/data/trains.json',
    exchangeRate: 3.38,
    currency: 'USD',
    bookingPrefix: 'CUZ-T'
  }, window.MCT_TRAIN_CONFIG || {});

  const ROUTES = {
    outbound: {
      cusco: 'CUSCO_MAPI',
      ollantaytambo: 'OLLA_MAPI',
      urubamba: 'URUBAMBA_MAPI',
      hidroelectrica: 'HIDRO_MAPI'
    },
    inbound: {
      cusco: 'MAPI_CUSCO',
      ollantaytambo: 'MAPI_OLLA',
      urubamba: 'MAPI_URUBAMBA',
      hidroelectrica: 'MAPI_HIDRO'
    }
  };

  const STATION_OPTIONS = ['ollantaytambo', 'cusco', 'urubamba', 'hidroelectrica'];

  const EXTRAS = {
    guideCircuit1: 15.90,
    guideCircuit3: 15.90,
    conseturRoundtrip: 24,
    breakfast: 8.90,
    lunch: 15.90
  };

  const COUNTRY_CODES = [
    'AF','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BM','BT','BO','BQ','BA','BW','BV','BR','IO','BN','BG','BF','BI','KH','CM','CA','CV','KY','CF','TD','CL','CN','CX','CC','CO','KM','CG','CD','CK','CR','CI','HR','CU','CW','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FK','FO','FJ','FI','FR','GF','PF','TF','GA','GM','GE','DE','GH','GI','GR','GL','GD','GP','GU','GT','GG','GN','GW','GY','HT','HM','VA','HN','HK','HU','IS','IN','ID','IR','IQ','IE','IM','IL','IT','JM','JP','JE','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MO','MG','MW','MY','MV','ML','MT','MH','MQ','MR','MU','YT','MX','FM','MD','MC','MN','ME','MS','MA','MZ','MM','NA','NR','NP','NL','NC','NZ','NI','NE','NG','NU','NF','MK','MP','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PN','PL','PT','PR','QA','RE','RO','RU','RW','BL','SH','KN','LC','MF','PM','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SX','SK','SI','SB','SO','ZA','GS','SS','ES','LK','SD','SR','SJ','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TK','TO','TT','TN','TR','TM','TC','TV','UG','UA','AE','GB','US','UM','UY','UZ','VU','VE','VN','VG','VI','WF','EH','YE','ZM','ZW'
  ];

  const PHONE_CODES = [
    ['PE', '+51'], ['US', '+1'], ['CA', '+1'], ['MX', '+52'], ['AR', '+54'], ['BO', '+591'], ['BR', '+55'], ['CL', '+56'], ['CO', '+57'], ['EC', '+593'], ['PY', '+595'], ['UY', '+598'], ['VE', '+58'], ['ES', '+34'], ['FR', '+33'], ['DE', '+49'], ['IT', '+39'], ['GB', '+44'], ['PT', '+351'], ['NL', '+31'], ['BE', '+32'], ['CH', '+41'], ['JP', '+81'], ['CN', '+86'], ['KR', '+82'], ['AU', '+61'], ['NZ', '+64']
  ];

  const DICTIONARY = {
    es: {
      hero: {
        kicker: 'PeruRail + Inca Rail',
        title: 'Compra tu tren a Machu Picchu y obtén los mejores beneficios',
        badgeGuide: 'Tour guiado gratuito dentro de Machu Picchu',
        badgeAssist: 'Asistencia 24/7',
        badgeBenefits: 'Beneficios exclusivos por tu compra',
        subtitle: 'Por la compra de tus trenes ida y vuelta, accede a beneficios exclusivos, reserva y paga online con asistencia personalizada para disfrutar mejor tu visita.'
      },
      search: {
        roundtrip: 'Ida y vuelta', bestOption: 'Mejor opción', oneway: 'Solo ida', outboundDate: 'Fecha de viaje', returnDate: 'Fecha de retorno', passengers: 'Pasajeros', adults: 'Adultos', adultAge: '12 años o más', children: 'Niños', childAge: '3 a 11 años', childFareNote: 'La tarifa de niño se calcula con el precio cargado en el JSON: adulto × 0.80.', coupon: 'Cupón', couponPlaceholder: 'Opcional', button: 'Buscar'
      },
      routes: { outboundFrom: 'Salida desde', returnTo: 'Retorno hacia' },
      stations: { cusco: 'Cusco', ollantaytambo: 'Ollantaytambo', urubamba: 'Urubamba', hidroelectrica: 'Hidroeléctrica', machuPicchu: 'Machu Picchu' },
      stationLong: { cusco: 'Cusco / Wanchaq / Poroy / Av. El Sol', ollantaytambo: 'Ollantaytambo', urubamba: 'Urubamba', hidroelectrica: 'Hidroeléctrica', machuPicchu: 'Machu Picchu' },
      results: { outboundTitle: 'Elige tu tren de ida', returnTitle: 'Elige tu tren de retorno', selectThisTrain: 'Seleccionar este tren', modifyOutbound: 'Modificar tren de ida', modifyReturn: 'Modificar tren de retorno', selectedTrain: 'Tren seleccionado', companyNote: 'El retorno se filtrará por la misma empresa del tren de ida.', noTrainsTitle: 'No encontramos horarios para esta ruta.', noTrainsText: 'Prueba otra estación o consúltanos para revisar disponibilidad manual.', selectOutboundFirst: 'Primero selecciona tu tren de ida. Luego verás los retornos disponibles con la misma empresa.', sameCompany: 'Como elegiste {company}, el retorno mostrará solo trenes de la misma empresa.', departure: 'Salida', arrival: 'Llegada', adult: 'Adulto', child: 'Niño', perPassenger: 'por pasajero', train: 'Tren turístico' },
      summary: { title: 'Tu selección', empty: 'Busca trenes y selecciona ida para empezar.', outbound: 'Tren de ida', return: 'Tren de retorno', selectOutbound: 'Selecciona un tren de ida para continuar.', selectReturn: 'Selecciona un tren de retorno de la misma empresa.', extra: 'Extra', included: 'Incluido', total: 'Total', note: 'La compra queda sujeta a disponibilidad final de la empresa ferroviaria. Te contactaremos si el horario elegido requiere ajuste.', reserveButton: 'Iniciar reserva' },
      extras: { title: 'Servicios extras', guideTitle: 'Guiado Machu Picchu', guideNone: 'No agregar guiado', circuit2: 'Circuito 2 · Gratis', circuit2Disabled: 'Circuito 2 · Gratis solo con ida y vuelta', circuit1: 'Circuito 1 · Grupo reducido 4 a 6 pax · USD 15.90 p/p', circuit3: 'Circuito 3 · Grupo reducido 4 a 6 pax · USD 15.90 p/p', busTitle: 'Bus Consetur Machu Picchu', busDesc: 'Subida y bajada · USD 24.00 p/p', breakfastTitle: 'Desayuno Power Peruano', breakfastDesc: 'Inca Kola + pan con chicharrón o pan con pollo · USD 8.90 p/p', lunchTitle: 'Almuerzo Power Peruano', lunchDesc: '¼ pollo a la brasa + arroz chaufa + papas fritas + Inca Kola 500 ml · USD 15.90 p/p', guideCircuit2Line: 'Guiado Machu Picchu Circuito 2', guideCircuit1Line: 'Guiado Machu Picchu Circuito 1', guideCircuit3Line: 'Guiado Machu Picchu Circuito 3', reducedGroup: 'Grupo reducido 4 a 6 pax', freeRoundtrip: 'Gratis por compra ida y vuelta', conseturLine: 'Bus Consetur subida y bajada', breakfastLine: 'Desayuno Power Peruano', lunchLine: 'Almuerzo Power Peruano', assistance: 'Asistencia personalizada 24/7 incluida sin costo', assistanceDetail: 'Incluida sin costo', detailsButton: 'Ver detalles', detailClose: 'Cerrar', detailGuideTitle: 'Guiado en Machu Picchu', detailGuideText: 'Acompañamiento profesional dentro de Machu Picchu según el circuito seleccionado. Ideal para entender la historia, los templos, los miradores y aprovechar mejor tu tiempo dentro de la ciudadela. El Circuito 2 puede estar incluido sin costo en compra ida y vuelta, sujeto a disponibilidad operativa. Los Circuitos 1 y 3 se ofrecen en grupo reducido de 4 a 6 pasajeros.', detailBusTitle: 'Bus Consetur Machu Picchu', detailBusText: 'Ticket de bus turístico entre Aguas Calientes y el ingreso de Machu Picchu. Incluye subida y bajada. Es recomendable para ahorrar energía, evitar la caminata en pendiente y llegar con mayor comodidad al horario de ingreso.', detailBreakfastTitle: 'Desayuno Power Peruano', detailBreakfastText: 'Opción práctica para iniciar temprano tu visita: bebida Inca Kola y pan con chicharrón o pan con pollo. Pensado para viajeros que salen muy temprano hacia la estación o hacia Machu Picchu.', detailLunchTitle: 'Almuerzo Power Peruano', detailLunchText: 'Almuerzo contundente después de la visita: ¼ pollo a la brasa, arroz chaufa, papas fritas e Inca Kola de 500 ml. Ideal para recuperar energía antes del retorno en tren.' },
      modal: { title: 'Datos de los pasajeros', subtitle: 'El pasajero 1 será el titular de la reserva.', terms: 'Acepto que la reserva queda sujeta a disponibilidad final, validación de documentos y confirmación operativa de My Cusco Trip.', cancel: 'Cancelar', pay: 'Pagar', passenger: 'Pasajero', adult: 'Adulto', child: 'Niño', lead: 'Titular', firstName: 'Nombres', lastName: 'Apellidos', nationality: 'Nacionalidad', docType: 'Tipo de documento', docNumber: 'Número de documento', birthDate: 'Fecha de nacimiento', whatsapp: 'WhatsApp', whatsappOptional: 'WhatsApp opcional', phoneCode: 'Código', phoneNumber: 'Número', email: 'Correo', emailOptional: 'Correo opcional', dni: 'DNI', passport: 'Pasaporte', ce: 'Carné de extranjería', other: 'Otro', creating: 'Creando orden de reserva...', connecting: 'Conectando con PayPal...', missingAppsScript: 'Falta configurar APPS_SCRIPT_URL en trenes/assets/js/config.js.', invalidResponse: 'Apps Script devolvió una respuesta no válida.', orderError: 'No se pudo crear la orden.', paypalError: 'PayPal no devolvió enlace de aprobación.' },
      pax: { adult: 'adulto', adults: 'adultos', child: 'niño', children: 'niños', ageChild: 'Edad niño' }
    },
    en: {
      hero: { kicker: 'PeruRail + Inca Rail', title: 'Buy your train to Machu Picchu and get the best benefits', badgeGuide: 'Free guided tour inside Machu Picchu', badgeAssist: '24/7 assistance', badgeBenefits: 'Exclusive benefits with your purchase', subtitle: 'When you buy your round-trip train tickets, access exclusive benefits, book and pay online, and enjoy your visit with personalized assistance.' },
      search: { roundtrip: 'Round trip', bestOption: 'Best option', oneway: 'One way', outboundDate: 'Travel date', returnDate: 'Return date', passengers: 'Passengers', adults: 'Adults', adultAge: '12 years or older', children: 'Children', childAge: '3 to 11 years old', childFareNote: 'Child fare uses the price loaded in the JSON: adult × 0.80.', coupon: 'Coupon', couponPlaceholder: 'Optional', button: 'Search' },
      routes: { outboundFrom: 'Departure from', returnTo: 'Return to' },
      stations: { cusco: 'Cusco', ollantaytambo: 'Ollantaytambo', urubamba: 'Urubamba', hidroelectrica: 'Hydroelectric', machuPicchu: 'Machu Picchu' },
      stationLong: { cusco: 'Cusco / Wanchaq / Poroy / Av. El Sol', ollantaytambo: 'Ollantaytambo', urubamba: 'Urubamba', hidroelectrica: 'Hydroelectric', machuPicchu: 'Machu Picchu' },
      results: { outboundTitle: 'Choose your outbound train', returnTitle: 'Choose your return train', selectThisTrain: 'Select this train', modifyOutbound: 'Change outbound train', modifyReturn: 'Change return train', selectedTrain: 'Selected train', companyNote: 'The return train will be filtered by the same company as your outbound train.', noTrainsTitle: 'No schedules found for this route.', noTrainsText: 'Try another station or contact us to check availability manually.', selectOutboundFirst: 'First choose your outbound train. Then you will see return options with the same company.', sameCompany: 'Since you chose {company}, return options will show only the same company.', departure: 'Departure', arrival: 'Arrival', adult: 'Adult', child: 'Child', perPassenger: 'per passenger', train: 'Tourist train' },
      summary: { title: 'Your selection', empty: 'Search trains and choose your outbound option to start.', outbound: 'Outbound train', return: 'Return train', selectOutbound: 'Choose an outbound train to continue.', selectReturn: 'Choose a return train from the same company.', extra: 'Extra', included: 'Included', total: 'Total', note: 'The purchase is subject to final availability from the railway company. We will contact you if your selected schedule needs adjustment.', reserveButton: 'Start booking' },
      extras: { title: 'Extra services', guideTitle: 'Machu Picchu guided tour', guideNone: 'Do not add guide', circuit2: 'Circuit 2 · Free', circuit2Disabled: 'Circuit 2 · Free only with round trip', circuit1: 'Circuit 1 · Small group 4 to 6 pax · USD 15.90 p/p', circuit3: 'Circuit 3 · Small group 4 to 6 pax · USD 15.90 p/p', busTitle: 'Consetur bus to Machu Picchu', busDesc: 'Up and down · USD 24.00 p/p', breakfastTitle: 'Peruvian Power Breakfast', breakfastDesc: 'Inca Kola + pork sandwich or chicken sandwich · USD 8.90 p/p', lunchTitle: 'Peruvian Power Lunch', lunchDesc: '¼ rotisserie chicken + chaufa rice + fries + 500 ml Inca Kola · USD 15.90 p/p', guideCircuit2Line: 'Machu Picchu guided tour Circuit 2', guideCircuit1Line: 'Machu Picchu guided tour Circuit 1', guideCircuit3Line: 'Machu Picchu guided tour Circuit 3', reducedGroup: 'Small group of 4 to 6 travelers', freeRoundtrip: 'Free with round-trip train purchase', conseturLine: 'Consetur bus up and down', breakfastLine: 'Peruvian Power Breakfast', lunchLine: 'Peruvian Power Lunch', assistance: '24/7 personalized assistance included at no extra cost', assistanceDetail: 'Included at no cost', detailsButton: 'View details', detailClose: 'Close', detailGuideTitle: 'Guided tour in Machu Picchu', detailGuideText: 'Professional guidance inside Machu Picchu according to the selected circuit. Ideal to understand the history, temples, viewpoints and make better use of your time inside the citadel. Circuit 2 may be included at no extra cost with a round-trip purchase, subject to operational availability. Circuits 1 and 3 are offered in small groups of 4 to 6 travelers.', detailBusTitle: 'Consetur Bus to Machu Picchu', detailBusText: 'Tourist bus ticket between Aguas Calientes and the entrance to Machu Picchu. Includes uphill and downhill rides. Recommended to save energy, avoid the steep walk and arrive more comfortably for your entry time.', detailBreakfastTitle: 'Peruvian Power Breakfast', detailBreakfastText: 'A practical option for early departures: Inca Kola and a pork or chicken sandwich. Designed for travelers leaving very early for the train station or Machu Picchu.', detailLunchTitle: 'Peruvian Power Lunch', detailLunchText: 'A filling lunch after your visit: ¼ rotisserie chicken, chaufa rice, fries and a 500 ml Inca Kola. Ideal to recover energy before the return train.' },
      modal: { title: 'Passenger details', subtitle: 'Passenger 1 will be the booking holder.', terms: 'I accept that the booking is subject to final availability, document validation, and operational confirmation by My Cusco Trip.', cancel: 'Cancel', pay: 'Pay', passenger: 'Passenger', adult: 'Adult', child: 'Child', lead: 'Booking holder', firstName: 'First name', lastName: 'Last name', nationality: 'Nationality', docType: 'Document type', docNumber: 'Document number', birthDate: 'Date of birth', whatsapp: 'WhatsApp', whatsappOptional: 'WhatsApp optional', phoneCode: 'Code', phoneNumber: 'Number', email: 'Email', emailOptional: 'Email optional', dni: 'National ID', passport: 'Passport', ce: 'Foreigner ID card', other: 'Other', creating: 'Creating booking order...', connecting: 'Connecting to PayPal...', missingAppsScript: 'Missing APPS_SCRIPT_URL configuration in trenes/assets/js/config.js.', invalidResponse: 'Apps Script returned an invalid response.', orderError: 'The order could not be created.', paypalError: 'PayPal did not return an approval link.' },
      pax: { adult: 'adult', adults: 'adults', child: 'child', children: 'children', ageChild: 'Child age' }
    }
  };

  const state = {
    data: { trains: [] },
    locale: getLocale(),
    tripType: 'roundtrip',
    adults: 1,
    children: 0,
    childAges: [],
    outboundFrom: 'ollantaytambo',
    returnTo: 'ollantaytambo',
    outboundDate: '',
    returnDate: '',
    selected: { outbound: null, return: null },
    pending: { outbound: null, return: null },
    extras: {
      guideCircuit: 'none',
      conseturBus: false,
      breakfast: false,
      lunch: false
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => String(value || '').trim();
  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
  const money = (value) => `USD ${Number(value || 0).toFixed(2)}`;

  function getLocale() {
    const fromI18n = window.MyCuscoTripI18n?.getLocaleFromUrl?.() || window.MyCuscoTripI18n?.locale;
    if (fromI18n && DICTIONARY[fromI18n]) return fromI18n;
    const pathLocale = window.location.pathname.split('/').filter(Boolean)[0];
    if (DICTIONARY[pathLocale]) return pathLocale;
    return 'es';
  }

  function t(key, fallback = '') {
    const dict = DICTIONARY[state.locale] || DICTIONARY.es;
    const value = String(key).split('.').reduce((acc, part) => acc && acc[part], dict);
    return value || fallback || key;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function applyTrainTranslations(root = document) {
    state.locale = getLocale();
    root.querySelectorAll?.('[data-train-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.trainI18n, node.textContent || '');
    });
    root.querySelectorAll?.('[data-train-placeholder]').forEach((node) => {
      node.setAttribute('placeholder', t(node.dataset.trainPlaceholder, node.getAttribute('placeholder') || ''));
    });
    document.documentElement.setAttribute('lang', state.locale);
  }

  function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function getPaxTotal() {
    return state.adults + state.children;
  }

  function timeToMinutes(value) {
    const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function durationText(start, end) {
    let diff = timeToMinutes(end) - timeToMinutes(start);
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (!h) return `${m} min`;
    return `${h} h ${String(m).padStart(2, '0')} min`;
  }

  function stationLabel(key, long = false) {
    return t(`${long ? 'stationLong' : 'stations'}.${key}`, key);
  }

  function getTrainOperator(train) {
    return normalize(train?.operatorKey || train?.company || train?.companyName || '');
  }

  function getCompanyLogo(train) {
    const op = getTrainOperator(train);
    if (op.includes('inca')) return '/assets/img/trains/inca-rail.png';
    if (op.includes('peru')) return '/assets/img/trains/perurail.png';
    return '/assets/img/placeholder/experience.jpg';
  }

  function getTrainPrice(train, type = 'adult') {
    if (!train) return 0;
    const adult = Number(train.price?.adult ?? train.pricePerPerson ?? 0);
    if (type === 'child') {
      const rawChild = train.price?.child;
      const child = rawChild === undefined || rawChild === null || rawChild === '' ? adult * 0.8 : Number(rawChild);
      return round(Number.isFinite(child) ? child : adult * 0.8);
    }
    const raw = train.price?.[type];
    const amount = raw === undefined || raw === null || raw === '' ? adult : Number(raw);
    return round(Number.isFinite(amount) ? amount : adult);
  }

  function getTrainTotal(train) {
    if (!train) return 0;
    return round((getTrainPrice(train, 'adult') * state.adults) + (getTrainPrice(train, 'child') * state.children));
  }

  function getRoute(direction) {
    if (direction === 'outbound') return ROUTES.outbound[state.outboundFrom];
    return ROUTES.inbound[state.returnTo];
  }

  function getFilteredTrains(direction) {
    const route = getRoute(direction);
    const outboundOperator = getTrainOperator(state.selected.outbound);
    return state.data.trains
      .filter((train) => !train.isLocalTrain)
      .filter((train) => train.route === route)
      .filter((train) => {
        if (direction === 'outbound') return train.direction === 'outbound';
        return train.direction === 'inbound' || train.direction === 'return';
      })
      .filter((train) => {
        if (direction !== 'return' || state.tripType !== 'roundtrip' || !outboundOperator) return true;
        return getTrainOperator(train) === outboundOperator;
      })
      .sort((a, b) => timeToMinutes(a.departureTime) - timeToMinutes(b.departureTime) || getTrainOperator(a).localeCompare(getTrainOperator(b)));
  }

  function renderStationPills() {
    const outWrap = $('#outboundStationPills');
    const retWrap = $('#returnStationPills');
    if (outWrap) {
      outWrap.innerHTML = STATION_OPTIONS.map((station) => `
        <button type="button" class="route-pill ${station === state.outboundFrom ? 'is-active' : ''}" data-outbound-from="${station}">${escapeHtml(stationLabel(station))} - ${escapeHtml(stationLabel('machuPicchu'))}</button>
      `).join('');
    }
    if (retWrap) {
      retWrap.innerHTML = STATION_OPTIONS.map((station) => `
        <button type="button" class="route-pill ${station === state.returnTo ? 'is-active' : ''}" data-return-to="${station}">${escapeHtml(stationLabel('machuPicchu'))} - ${escapeHtml(stationLabel(station))}</button>
      `).join('');
    }
  }

  function renderSearchState() {
    state.locale = getLocale();
    const paxParts = [`${state.adults} ${state.adults === 1 ? t('pax.adult') : t('pax.adults')}`];
    if (state.children) paxParts.push(`${state.children} ${state.children === 1 ? t('pax.child') : t('pax.children')}`);
    $('#paxLabel').textContent = paxParts.join(', ');
    $('#adultCount').textContent = state.adults;
    $('#childCount').textContent = state.children;
    $('#paxToggle').setAttribute('aria-expanded', String(!$('#paxPanel').hidden));

    $$('.trip-tab').forEach((tab) => {
      const input = $('input', tab);
      tab.classList.toggle('is-active', input?.checked);
    });

    $$('.return-field').forEach((el) => { el.style.display = state.tripType === 'roundtrip' ? '' : 'none'; });
    const shouldShowReturnFilters = state.tripType === 'roundtrip' && Boolean(state.selected.outbound) && !state.selected.return;
    $$('.return-route-block').forEach((el) => { el.style.display = shouldShowReturnFilters ? '' : 'none'; });
    $$('.outbound-route-block').forEach((el) => { el.style.display = state.selected.outbound ? 'none' : ''; });
    $('#returnDate').required = state.tripType === 'roundtrip';
    $('#outboundRouteLabel').textContent = `${stationLabel(state.outboundFrom, true)} → ${stationLabel('machuPicchu')}`;
    $('#returnRouteLabel').textContent = `${stationLabel('machuPicchu')} → ${stationLabel(state.returnTo, true)}`;

    const companyRule = $('#companyRuleNote');
    if (companyRule) {
      if (state.selected.outbound) {
        const company = state.selected.outbound.companyName || state.selected.outbound.company || '';
        companyRule.textContent = t('results.sameCompany').replace('{company}', company);
      } else {
        companyRule.textContent = t('results.companyNote');
      }
    }

    renderChildAges();
    renderStationPills();
    applyTrainTranslations();
  }

  function renderChildAges() {
    const wrapper = $('#childAges');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    state.childAges = state.childAges.slice(0, state.children);
    while (state.childAges.length < state.children) state.childAges.push(6);
    state.childAges.forEach((age, index) => {
      const label = document.createElement('label');
      label.innerHTML = `<span>${escapeHtml(t('pax.ageChild'))} ${index + 1}</span><select data-child-age="${index}">${Array.from({ length: 9 }, (_, i) => i + 3).map((n) => `<option value="${n}" ${n === Number(age) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
      wrapper.appendChild(label);
    });
  }

  function renderResults() {
    renderSearchState();
    renderTrainList('outbound', $('#outboundResults'));
    const shouldShowReturn = state.tripType === 'roundtrip' && Boolean(state.selected.outbound);
    $('#returnBlock').hidden = !shouldShowReturn;
    if (shouldShowReturn) renderTrainList('return', $('#returnResults'));
    renderExtrasState();
    renderSummary();
    renderInlineCheckout();
  }

  function renderTrainList(direction, container) {
    const confirmed = state.selected[direction];
    if (confirmed) {
      container.innerHTML = selectedTrainHTML(direction, confirmed);
      return;
    }

    const trains = getFilteredTrains(direction);
    const pendingCode = state.pending[direction]?.code;
    if (!trains.length) {
      container.innerHTML = `<div class="empty-state"><strong>${escapeHtml(t('results.noTrainsTitle'))}</strong><span>${escapeHtml(t('results.noTrainsText'))}</span></div>`;
      return;
    }

    container.innerHTML = trains.map((train) => {
      const pending = train.code === pendingCode;
      const adult = getTrainPrice(train, 'adult');
      const child = getTrainPrice(train, 'child');
      const logo = getCompanyLogo(train);
      const service = train.serviceName || train.category || t('results.train');
      const category = train.category ? train.category.replace(/_/g, ' ') : '';
      return `
        <article class="train-card ${pending ? 'is-pending' : ''}" data-train-code="${escapeHtml(train.code)}" data-direction="${direction}" tabindex="0" role="button" aria-pressed="${pending ? 'true' : 'false'}">
          <div class="select-rail"><span class="select-dot" aria-hidden="true"></span></div>
          <div class="train-card-body">
            <div class="train-company">
              <img class="company-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(train.companyName || train.company || 'Tren')}" loading="lazy">
              <div class="train-company-text">
                <b>${escapeHtml(service)}</b>
                <small>${escapeHtml(train.companyName || train.company || category)}</small>
              </div>
            </div>
            <div class="schedule-line">
              <div class="time-box"><small>${escapeHtml(t('results.departure'))}</small><strong>${escapeHtml(train.departureTime)}</strong><span>${escapeHtml(train.departureStation)}</span></div>
              <span class="duration">${escapeHtml(durationText(train.departureTime, train.arrivalTime))}</span>
              <div class="time-box"><small>${escapeHtml(t('results.arrival'))}</small><strong>${escapeHtml(train.arrivalTime)}</strong><span>${escapeHtml(train.arrivalStation)}</span></div>
            </div>
            <div class="price-box">
              <div class="fare-line"><small>${escapeHtml(t('results.adult'))}</small><strong>${money(adult)}</strong><em>${escapeHtml(t('results.perPassenger'))}</em></div>
              ${state.children ? `<div class="fare-line child-fare"><small>${escapeHtml(t('results.child'))}</small><strong>${money(child)}</strong><em>${escapeHtml(t('results.perPassenger'))}</em></div>` : ''}
            </div>
            <div class="train-card-action">
              ${pending ? `<button type="button" class="select-train-button" data-confirm-train="${direction}" data-train-code="${escapeHtml(train.code)}">${escapeHtml(t('results.selectThisTrain'))}</button>` : ''}
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function selectedTrainHTML(direction, train) {
    const logo = getCompanyLogo(train);
    const title = direction === 'outbound' ? t('summary.outbound') : t('summary.return');
    const modifyText = direction === 'outbound' ? t('results.modifyOutbound') : t('results.modifyReturn');
    return `
      <article class="selected-train-box" data-selected-direction="${direction}">
        <div class="selected-train-box__main">
          <span class="selected-train-box__label">${escapeHtml(t('results.selectedTrain'))}</span>
          <div class="selected-train-box__content">
            <img class="company-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(train.companyName || train.company || 'Tren')}" loading="lazy">
            <div>
              <strong>${escapeHtml(title)} · ${escapeHtml(train.companyName || train.company || '')} ${escapeHtml(train.serviceName || '')}</strong>
              <small>${escapeHtml(train.departureStation)} ${escapeHtml(train.departureTime)} → ${escapeHtml(train.arrivalStation)} ${escapeHtml(train.arrivalTime)}</small>
            </div>
          </div>
        </div>
        <button type="button" class="secondary-button modify-train-button" data-modify-train="${direction}">${escapeHtml(modifyText)}</button>
      </article>`;
  }

  function renderExtrasState() {
    const canShowExtras = canCheckout();
    $('#summaryExtras').hidden = !canShowExtras;
    const guideSelect = $('#guideCircuit');
    if (guideSelect) {
      const circuit2 = guideSelect.querySelector('option[value="circuit2"]');
      if (circuit2) {
        circuit2.disabled = state.tripType !== 'roundtrip';
        circuit2.textContent = state.tripType === 'roundtrip' ? t('extras.circuit2') : t('extras.circuit2Disabled');
        if (state.tripType !== 'roundtrip' && state.extras.guideCircuit === 'circuit2') {
          state.extras.guideCircuit = 'none';
          guideSelect.value = 'none';
        }
      }
      guideSelect.value = state.extras.guideCircuit;
    }
    const consetur = $('#conseturBusExtra');
    const breakfast = $('#breakfastExtra');
    const lunch = $('#lunchExtra');
    if (consetur) consetur.checked = state.extras.conseturBus;
    if (breakfast) breakfast.checked = state.extras.breakfast;
    if (lunch) lunch.checked = state.extras.lunch;
  }

  function calculateExtras() {
    const pax = getPaxTotal();
    const lines = [];
    let total = 0;

    if (state.extras.guideCircuit === 'circuit2') {
      lines.push({ label: t('extras.guideCircuit2Line'), detail: t('extras.freeRoundtrip'), amount: 0 });
    }
    if (state.extras.guideCircuit === 'circuit1') {
      const amount = EXTRAS.guideCircuit1 * pax;
      lines.push({ label: t('extras.guideCircuit1Line'), detail: t('extras.reducedGroup'), amount });
      total += amount;
    }
    if (state.extras.guideCircuit === 'circuit3') {
      const amount = EXTRAS.guideCircuit3 * pax;
      lines.push({ label: t('extras.guideCircuit3Line'), detail: t('extras.reducedGroup'), amount });
      total += amount;
    }
    if (state.extras.conseturBus) {
      const amount = EXTRAS.conseturRoundtrip * pax;
      lines.push({ label: t('extras.conseturLine'), detail: 'USD 24.00 p/p', amount });
      total += amount;
    }
    if (state.extras.breakfast) {
      const amount = EXTRAS.breakfast * pax;
      lines.push({ label: t('extras.breakfastLine'), detail: t('extras.breakfastDesc'), amount });
      total += amount;
    }
    if (state.extras.lunch) {
      const amount = EXTRAS.lunch * pax;
      lines.push({ label: t('extras.lunchLine'), detail: t('extras.lunchDesc'), amount });
      total += amount;
    }
    lines.push({ label: t('extras.assistance'), detail: '', amount: 0, type: 'assistance' });
    return { total: round(total), lines };
  }

  function calculateTotals() {
    const outbound = getTrainTotal(state.selected.outbound);
    const returned = state.tripType === 'roundtrip' ? getTrainTotal(state.selected.return) : 0;
    const extras = calculateExtras();
    const subtotal = outbound + returned + extras.total;
    return { outbound, returned, extras, total: round(subtotal) };
  }

  function renderSummary() {
    const content = $('#summaryContent');
    const totals = calculateTotals();
    const lines = [];

    if (state.selected.outbound) {
      lines.push(summaryItem(t('summary.outbound'), `${state.selected.outbound.companyName || state.selected.outbound.company} · ${state.selected.outbound.serviceName}`, `${state.selected.outbound.departureStation} ${state.selected.outbound.departureTime} → ${state.selected.outbound.arrivalStation} ${state.selected.outbound.arrivalTime}`, totals.outbound));
    } else {
      lines.push(`<p>${escapeHtml(t('summary.selectOutbound'))}</p>`);
    }

    if (state.tripType === 'roundtrip') {
      if (state.selected.return) {
        lines.push(summaryItem(t('summary.return'), `${state.selected.return.companyName || state.selected.return.company} · ${state.selected.return.serviceName}`, `${state.selected.return.departureStation} ${state.selected.return.departureTime} → ${state.selected.return.arrivalStation} ${state.selected.return.arrivalTime}`, totals.returned));
      } else if (state.selected.outbound) {
        lines.push(`<p>${escapeHtml(t('summary.selectReturn'))}</p>`);
      }
    }

    if (canCheckout()) {
      totals.extras.lines.forEach((line) => {
        if (line.type === 'assistance') {
          lines.push(`<p class="summary-assistance-note">${escapeHtml(line.label)}</p>`);
        } else {
          lines.push(summaryItem(t('summary.extra'), line.label, line.detail, line.amount));
        }
      });
    }

    content.innerHTML = lines.join('');
    $('#summaryTotal').textContent = money(totals.total);
    $('#checkoutButton').disabled = !canCheckout();
  }

  function summaryItem(kicker, title, detail, amount) {
    const amountText = amount === 0 ? t('summary.included') : money(amount);
    return `<div class="summary-item"><strong>${escapeHtml(kicker)} · ${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small><small class="summary-amount">${escapeHtml(amountText)}</small></div>`;
  }

  function canCheckout() {
    if (!state.selected.outbound) return false;
    if (state.tripType === 'roundtrip' && !state.selected.return) return false;
    return true;
  }


  function openCheckoutModal() {
    if (!canCheckout()) return;
    buildPassengerForms();
    $('#paymentMessage').hidden = true;
    $('#passengerModal').hidden = false;
  }

  function renderInlineCheckout() {
    let wrap = $('#inlineCheckoutWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'inlineCheckoutWrap';
      wrap.className = 'inline-checkout-wrap';
      wrap.innerHTML = `<button id="inlineCheckoutButton" type="button" class="checkout-button inline-checkout-button">${escapeHtml(t('summary.reserveButton'))}</button>`;
      const returnBlock = $('#returnBlock');
      returnBlock?.insertAdjacentElement('afterend', wrap);
    }
    const button = $('#inlineCheckoutButton');
    if (button) button.textContent = t('summary.reserveButton');
    wrap.hidden = !canCheckout();
  }

  const EXTRA_DETAILS = {
    guide: { title: 'extras.detailGuideTitle', text: 'extras.detailGuideText', image: '/assets/img/reserva/machu-picchu-card.jpg' },
    bus: { title: 'extras.detailBusTitle', text: 'extras.detailBusText', image: '/assets/img/noticias/machu-picchu-boletos.jpg' },
    breakfast: { title: 'extras.detailBreakfastTitle', text: 'extras.detailBreakfastText', image: '/assets/img/reserva/banner-restaurantes.jpg' },
    lunch: { title: 'extras.detailLunchTitle', text: 'extras.detailLunchText', image: '/assets/img/reserva/banner-restaurantes.jpg' }
  };

  function showExtraDetail(key) {
    const detail = EXTRA_DETAILS[key];
    if (!detail) return;
    let modal = $('#extraDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'extraDetailModal';
      modal.className = 'modal extra-detail-modal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="modal-backdrop" data-close-extra-detail></div>
        <section class="modal-panel extra-detail-panel" role="dialog" aria-modal="true" aria-labelledby="extraDetailTitle">
          <button class="modal-close" type="button" data-close-extra-detail>×</button>
          <img id="extraDetailImage" class="extra-detail-image" src="" alt="" loading="lazy">
          <div class="extra-detail-content">
            <div class="modal-titlebar" id="extraDetailTitle"></div>
            <p id="extraDetailText"></p>
            <button type="button" class="secondary-button" data-close-extra-detail>${escapeHtml(t('extras.detailClose'))}</button>
          </div>
        </section>`;
      document.body.appendChild(modal);
    }
    $('#extraDetailImage', modal).src = detail.image;
    $('#extraDetailImage', modal).alt = t(detail.title);
    $('#extraDetailTitle', modal).textContent = t(detail.title);
    $('#extraDetailText', modal).textContent = t(detail.text);
    const closeBtn = modal.querySelector('.secondary-button');
    if (closeBtn) closeBtn.textContent = t('extras.detailClose');
    modal.hidden = false;
  }

  function closeExtraDetail() {
    const modal = $('#extraDetailModal');
    if (modal) modal.hidden = true;
  }

  function markTrain(direction, code) {
    if (state.selected[direction]) return;
    const train = state.data.trains.find((item) => item.code === code);
    if (!train) return;
    state.pending[direction] = train;
    renderResults();
  }

  function confirmTrain(direction, code) {
    const train = state.data.trains.find((item) => item.code === code) || state.pending[direction];
    if (!train) return;
    state.selected[direction] = train;
    state.pending[direction] = null;
    if (direction === 'outbound') {
      state.pending.return = null;
      if (state.selected.return) {
        const outOp = getTrainOperator(train);
        const retOp = getTrainOperator(state.selected.return);
        if (outOp !== retOp) state.selected.return = null;
      }
      if (state.tripType === 'roundtrip') {
        setTimeout(() => $('#returnBlock')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
    }
    renderResults();
  }

  function modifyTrain(direction) {
    if (!state.selected[direction]) return;
    state.pending[direction] = state.selected[direction];
    state.selected[direction] = null;
    if (direction === 'outbound') {
      state.selected.return = null;
      state.pending.return = null;
    }
    renderResults();
  }

  function getRegionName(code) {
    try {
      const display = new Intl.DisplayNames([state.locale === 'en' ? 'en' : 'es'], { type: 'region' });
      return display.of(code) || code;
    } catch (error) {
      return code === 'PE' ? (state.locale === 'en' ? 'Peru' : 'Perú') : code;
    }
  }

  function countryOptions(selected = 'PE') {
    return COUNTRY_CODES
      .map((code) => ({ code, name: getRegionName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, state.locale === 'en' ? 'en' : 'es'))
      .map(({ code, name }) => `<option value="${escapeHtml(name)}" data-country-code="${code}" ${code === selected ? 'selected' : ''}>${escapeHtml(name)}</option>`)
      .join('');
  }

  function phoneCodeOptions(selected = '+51') {
    return PHONE_CODES.map(([country, code]) => `<option value="${escapeHtml(code)}" ${code === selected ? 'selected' : ''}>${escapeHtml(code)} · ${escapeHtml(country)}</option>`).join('');
  }

  function buildPassengerForms() {
    const wrapper = $('#passengerForms');
    const total = getPaxTotal();
    wrapper.innerHTML = Array.from({ length: total }, (_, i) => {
      const isLead = i === 0;
      const type = i < state.adults ? t('modal.adult') : t('modal.child');
      const whatsappLabel = isLead ? `${t('modal.whatsapp')} *` : t('modal.whatsappOptional');
      const emailLabel = isLead ? `${t('modal.email')} *` : t('modal.emailOptional');
      return `
        <section class="passenger-box" data-passenger-index="${i}">
          <h3>${escapeHtml(t('modal.passenger'))} ${i + 1} · ${escapeHtml(type)}${isLead ? ` · ${escapeHtml(t('modal.lead'))}` : ''}</h3>
          <div class="passenger-grid">
            <label><span>${escapeHtml(t('modal.firstName'))} *</span><input name="firstName_${i}" required autocomplete="given-name"></label>
            <label><span>${escapeHtml(t('modal.lastName'))} *</span><input name="lastName_${i}" required autocomplete="family-name"></label>
            <label><span>${escapeHtml(t('modal.nationality'))} *</span><select name="nationality_${i}" required>${countryOptions('PE')}</select></label>
            <label><span>${escapeHtml(t('modal.docType'))} *</span><select name="docType_${i}" required><option value="DNI">${escapeHtml(t('modal.dni'))}</option><option value="PASSPORT">${escapeHtml(t('modal.passport'))}</option><option value="CE">${escapeHtml(t('modal.ce'))}</option><option value="OTHER">${escapeHtml(t('modal.other'))}</option></select></label>
            <label><span>${escapeHtml(t('modal.docNumber'))} *</span><input name="docNumber_${i}" required></label>
            <label><span>${escapeHtml(t('modal.birthDate'))} *</span><input name="birthDate_${i}" type="date" required></label>
            <label class="phone-field"><span>${escapeHtml(whatsappLabel)}</span><div class="phone-group"><select name="whatsappCode_${i}" ${isLead ? 'required' : ''} aria-label="${escapeHtml(t('modal.phoneCode'))}">${phoneCodeOptions('+51')}</select><input name="whatsappNumber_${i}" ${isLead ? 'required' : ''} autocomplete="tel" placeholder="${escapeHtml(t('modal.phoneNumber'))}"></div></label>
            <label><span>${escapeHtml(emailLabel)}</span><input name="email_${i}" type="email" ${isLead ? 'required' : ''} autocomplete="email"></label>
          </div>
        </section>`;
    }).join('');
  }

  function collectPassengers(form) {
    const total = getPaxTotal();
    return Array.from({ length: total }, (_, i) => {
      const whatsappCode = clean(form[`whatsappCode_${i}`]?.value);
      const whatsappNumber = clean(form[`whatsappNumber_${i}`]?.value);
      return {
        index: i + 1,
        type: i < state.adults ? 'adult' : 'child',
        firstName: clean(form[`firstName_${i}`]?.value),
        lastName: clean(form[`lastName_${i}`]?.value),
        nationality: clean(form[`nationality_${i}`]?.value),
        docType: clean(form[`docType_${i}`]?.value),
        docNumber: clean(form[`docNumber_${i}`]?.value),
        birthDate: clean(form[`birthDate_${i}`]?.value),
        age: i < state.adults ? null : Number(state.childAges[i - state.adults] || 0),
        whatsappCode,
        whatsappNumber,
        whatsapp: clean(`${whatsappCode} ${whatsappNumber}`),
        email: clean(form[`email_${i}`]?.value)
      };
    });
  }

  function buildOrderPayload(passengers) {
    const totals = calculateTotals();
    const code = generateCode();
    const lead = passengers[0] || {};
    return {
      code,
      createdAt: new Date().toISOString(),
      status: 'Pendiente de pago',
      source: 'trenes-web',
      currency: 'USD',
      exchangeRate: CONFIG.exchangeRate,
      tripType: state.tripType,
      dates: { outbound: state.outboundDate, return: state.tripType === 'roundtrip' ? state.returnDate : '' },
      route: {
        outboundFrom: state.outboundFrom,
        outboundRoute: getRoute('outbound'),
        returnTo: state.tripType === 'roundtrip' ? state.returnTo : '',
        returnRoute: state.tripType === 'roundtrip' ? getRoute('return') : ''
      },
      passengers,
      lead,
      pax: { adults: state.adults, children: state.children, childAges: state.childAges },
      trains: {
        outbound: serializeTrain(state.selected.outbound),
        return: state.tripType === 'roundtrip' ? serializeTrain(state.selected.return) : null
      },
      extras: {
        selected: Object.assign({}, state.extras),
        lines: totals.extras.lines
      },
      amounts: {
        outbound: round(totals.outbound),
        return: round(totals.returned),
        extras: round(totals.extras.total),
        totalUsd: round(totals.total),
        totalPen: round(totals.total * CONFIG.exchangeRate)
      }
    };
  }

  function serializeTrain(train) {
    if (!train) return null;
    return {
      code: train.code,
      company: train.company,
      companyName: train.companyName,
      operatorKey: train.operatorKey,
      serviceName: train.serviceName,
      category: train.category,
      route: train.route,
      departureStation: train.departureStation,
      arrivalStation: train.arrivalStation,
      departureTime: train.departureTime,
      arrivalTime: train.arrivalTime,
      price: {
        adult: getTrainPrice(train, 'adult'),
        child: getTrainPrice(train, 'child')
      }
    };
  }

  function generateCode() {
    const hexTime = Date.now().toString(16).toUpperCase();
    const random = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');
    return `${CONFIG.bookingPrefix || 'CUZ-T'}-${hexTime}-${random}`;
  }

  async function sendToAppsScript(action, payload) {
    if (!CONFIG.appsScriptUrl || CONFIG.appsScriptUrl.includes('PEGAR_AQUI')) {
      return { ok: false, message: t('modal.missingAppsScript') };
    }
    const res = await fetch(CONFIG.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch (err) { return { ok: false, message: t('modal.invalidResponse'), raw: text }; }
  }

  function showPaymentMessage(message, type = 'info') {
    const box = $('#paymentMessage');
    box.hidden = false;
    box.className = `payment-message is-${type}`;
    box.textContent = message;
  }

  async function handlePassengerSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const passengers = collectPassengers(form.elements);
    const payload = buildOrderPayload(passengers);
    showPaymentMessage(t('modal.creating'), 'info');
    localStorage.setItem('mct_train_pending_order', JSON.stringify(payload));

    const orderResult = await sendToAppsScript('createTrainOrder', payload);
    if (!orderResult.ok) {
      showPaymentMessage(orderResult.message || t('modal.orderError'), 'error');
      return;
    }

    showPaymentMessage(t('modal.connecting'), 'info');
    const paypalResult = await sendToAppsScript('createPayPalTrainOrder', { code: payload.code, total: payload.amounts.totalUsd, currency: 'USD' });
    if (paypalResult.ok && paypalResult.approvalUrl) {
      localStorage.setItem('mct_train_last_code', payload.code);
      window.location.assign(paypalResult.approvalUrl);
      return;
    }
    showPaymentMessage(paypalResult.message || t('modal.paypalError'), 'error');
  }

  function handleRouteChange() {
    state.selected.outbound = null;
    state.selected.return = null;
    state.pending.outbound = null;
    state.pending.return = null;
    renderResults();
  }

  function handleTripTypeChange() {
    state.tripType = $('input[name="tripType"]:checked')?.value || 'roundtrip';
    if (state.tripType === 'oneway') {
      state.selected.return = null;
      state.pending.return = null;
    }
    renderResults();
  }

  function bindEvents() {
    $('#trainSearchForm').addEventListener('submit', (event) => {
      event.preventDefault();
      state.outboundDate = $('#outboundDate').value;
      state.returnDate = $('#returnDate').value;
      renderResults();
      $('.results-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $$('input[name="tripType"]').forEach((input) => input.addEventListener('change', handleTripTypeChange));
    $('#outboundDate').addEventListener('change', (e) => { state.outboundDate = e.target.value; });
    $('#returnDate').addEventListener('change', (e) => { state.returnDate = e.target.value; });

    $('#paxToggle').addEventListener('click', () => {
      $('#paxPanel').hidden = !$('#paxPanel').hidden;
      $('#paxToggle').setAttribute('aria-expanded', String(!$('#paxPanel').hidden));
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.pax-field')) {
        $('#paxPanel').hidden = true;
        $('#paxToggle')?.setAttribute('aria-expanded', 'false');
      }

      const outbound = event.target.closest('[data-outbound-from]');
      if (outbound) {
        state.outboundFrom = outbound.dataset.outboundFrom;
        handleRouteChange();
        return;
      }

      const returned = event.target.closest('[data-return-to]');
      if (returned) {
        state.returnTo = returned.dataset.returnTo;
        state.selected.return = null;
        state.pending.return = null;
        renderResults();
        return;
      }

      const step = event.target.closest('[data-pax]');
      if (step) {
        const target = step.dataset.pax;
        const delta = Number(step.dataset.delta || 0);
        if (target === 'adults') state.adults = Math.max(1, Math.min(30, state.adults + delta));
        if (target === 'children') state.children = Math.max(0, Math.min(20, state.children + delta));
        renderResults();
        return;
      }

      const confirm = event.target.closest('[data-confirm-train]');
      if (confirm) {
        confirmTrain(confirm.dataset.confirmTrain, confirm.dataset.trainCode);
        return;
      }

      const modify = event.target.closest('[data-modify-train]');
      if (modify) {
        modifyTrain(modify.dataset.modifyTrain);
        return;
      }

      const card = event.target.closest('.train-card[data-train-code]');
      if (card) {
        markTrain(card.dataset.direction, card.dataset.trainCode);
        return;
      }

      if (event.target.matches('[data-close-modal]')) closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.target.closest?.('[data-confirm-train], [data-modify-train]')) return;
        const card = event.target.closest?.('.train-card[data-train-code]');
        if (card) {
          event.preventDefault();
          markTrain(card.dataset.direction, card.dataset.trainCode);
        }
      }
      if (event.key === 'Escape' && !$('#passengerModal').hidden) closeModal();
      if (event.key === 'Escape' && $('#extraDetailModal') && !$('#extraDetailModal').hidden) closeExtraDetail();
    });

    document.addEventListener('change', (event) => {
      if (event.target.matches('[data-child-age]')) {
        state.childAges[Number(event.target.dataset.childAge)] = Number(event.target.value);
        return;
      }
      if (event.target.id === 'guideCircuit') { state.extras.guideCircuit = event.target.value; renderSummary(); }
      if (event.target.id === 'conseturBusExtra') { state.extras.conseturBus = event.target.checked; renderSummary(); }
      if (event.target.id === 'breakfastExtra') { state.extras.breakfast = event.target.checked; renderSummary(); }
      if (event.target.id === 'lunchExtra') { state.extras.lunch = event.target.checked; renderSummary(); }
    });

    $('#checkoutButton').addEventListener('click', openCheckoutModal);
    document.addEventListener('click', (event) => {
      if (event.target.closest('#inlineCheckoutButton')) openCheckoutModal();
      if (event.target.closest('[data-extra-detail]')) showExtraDetail(event.target.closest('[data-extra-detail]').dataset.extraDetail);
      if (event.target.closest('[data-close-extra-detail]')) closeExtraDetail();
    });
    $('#passengerForm').addEventListener('submit', handlePassengerSubmit);

    window.addEventListener('mct:i18n-ready', () => {
      state.locale = getLocale();
      applyTrainTranslations();
      renderResults();
    });
  }

  function closeModal() {
    $('#passengerModal').hidden = true;
  }

  async function loadTrains() {
    const res = await fetch(CONFIG.trainsJsonPath, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar el JSON de trenes.');
    const data = await res.json();
    state.data.trains = Array.isArray(data.trains) ? data.trains : [];
  }

  async function init() {
    const outDate = todayISO(1);
    const retDate = todayISO(2);
    $('#outboundDate').min = todayISO(0);
    $('#returnDate').min = todayISO(0);
    $('#outboundDate').value = outDate;
    $('#returnDate').value = retDate;
    state.outboundDate = outDate;
    state.returnDate = retDate;
    applyTrainTranslations();

    try {
      await loadTrains();
    } catch (err) {
      $('#outboundResults').innerHTML = `<div class="empty-state"><strong>Error cargando trenes.</strong><span>${escapeHtml(err.message)}</span></div>`;
      return;
    }
    bindEvents();
    renderResults();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
