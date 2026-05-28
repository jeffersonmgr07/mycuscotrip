(function () {
  const SUPPORTED = ['es', 'en'];
  const params = new URLSearchParams(window.location.search);
  const pathLang = (window.location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  const requested = (params.get('lang') || (SUPPORTED.includes(pathLang) ? pathLang : '') || localStorage.getItem('site_lang') || 'es').toLowerCase();
  const lang = SUPPORTED.includes(requested) ? requested : 'es';
  localStorage.setItem('site_lang', lang);
  document.documentElement.lang = lang;

  const dictionaries = {
    es: {},
    en: {
      'agency.portalWelcome': 'Welcome to the agency portal',
      'agency.affiliateDefault': 'Partner agency',
      'agency.orders': 'My orders',
      'agency.myData': 'My details',
      'agency.logout': 'Log out',
      'agency.beforeReserveHtml': '<strong>Before booking:</strong> services are subject to availability. To confirm a booking, payment must be validated 100% up to 2 days before the tour date. Entrance tickets not included are paid separately according to the selected experience.',
      'agency.availableExperiences': 'Available experiences',
      'agency.availableHelp': 'Add one or more services to your order. You can book for the same passengers or for different groups.',
      'agency.emptyExperiences': 'We did not find experiences with that filter.',
      'agency.yourOrder': 'Your order',
      'agency.emptyCart': 'You have not added services yet.',
      'agency.subtotalLabel': 'Services + entrance tickets',
      'agency.feesLabel': 'Estimated fees',
      'agency.totalLabel': 'Total to pay',
      'agency.generateOrder': 'Generate booking order',
      'agency.clearOrder': 'Clear order',
      'agency.reserveExperience': 'Book experience',
      'agency.itineraryTitle': 'Detailed itinerary',
      'agency.reserveHelp': 'Complete the main traveler details. Additional passenger details are optional, but they help speed up confirmation.',
      'agency.tourDate': 'Tour date',
      'agency.startTime': 'Start time',
      'agency.passengerCount': 'Number of passengers',
      'agency.includeTickets': 'Include entrance tickets',
      'agency.ticketsApply': 'Applied to all passengers in this booking.',
      'agency.leadData': 'Booking holder details',
      'agency.firstName': 'First name',
      'agency.lastName': 'Last name',
      'agency.docType': 'Document type',
      'agency.docNumber': 'Document number',
      'agency.nationality': 'Nationality',
      'agency.language': 'Language',
      'agency.countryCode': 'Country code',
      'agency.phone': 'Mobile / WhatsApp',
      'agency.pickup': 'Pick-up location',
      'agency.pickupPlaceholder': 'Hotel name and full address',
      'agency.observations': 'Notes',
      'agency.observationsPlaceholder': 'Preferred time, hotel reference, dietary restrictions, etc.',
      'agency.otherPassengers': 'Other passenger details',
      'agency.optional': '(optional)',
      'agency.otherPassengersHelp': 'Enter the details of the other passengers (from the second passenger onwards).',
      'agency.cancel': 'Cancel',
      'agency.addToOrder': 'Add to order',
      'agency.book': 'Book',
      'agency.viewItinerary': 'View itinerary',
      'agency.schedule': 'Schedule',
      'agency.duration': 'Duration',
      'agency.price': 'Price',
      'agency.entrances': 'Tickets',
      'agency.perPerson': 'per person',
      'agency.dailyDeparture': 'Daily departure',
      'agency.confirm': 'To be confirmed',
      'agency.addOneService': 'Add at least one service to your order.',
      'register.sending': 'Sending registration...',
      'agency.perPassenger': 'per passenger',
      'agency.tickets': 'Tickets',
      'agency.generatedOrder': 'Generated order',
      'agency.bookingOrder': 'Booking order',
      'agency.agency': 'Agency',
      'agency.paymentTime': 'Payment time',
      'agency.paymentTimeNote': 'this order is reserved for 3 hours. To confirm the services, payment must be validated within the indicated period and is always subject to operational availability.',
      'agency.payWithPayPal': 'Pay with PayPal',
      'agency.payBooking': 'Pay booking',
      'agency.printOrder': 'Print order',
      'agency.close': 'Close',
      'agency.connectPayPal': 'Connecting with PayPal...',
      'agency.connectMP': 'Connecting with Mercado Pago...',
      'agency.paymentConfirmNoteHtml': '<strong>Confirmation:</strong> every order will be confirmed after payment and will always remain subject to operational availability, available tickets and validation by the reservations team.',
      'agency.loadingItinerary': 'Loading detailed itinerary...',
      'agency.includes': 'Includes',
      'agency.itinerary': 'Itinerary',
      'agency.detail': 'Detail',
      'agency.reserveThisExperience': 'Book this experience',
      'agency.step': 'Step',
      'agency.namePending': 'Name pending',
      'agency.additionalPending': 'Additional details pending.',
      'agency.lead': 'Holder',
      'agency.additionalPassengers': 'Additional passengers',
      'agency.notes': 'Notes',
      'agency.date': 'Date',
      'agency.time': 'Time',
      'agency.group': 'group',
      'agency.orderSent': 'Order saved and sent by email',
      'login.title': 'Agency access',
      'login.subtitle': 'Access for partner agencies and travel agents.',
      'login.email': 'Login email',
      'login.password': 'Password',
      'login.enter': 'Log in',
      'login.register': 'Register my agency',
      'login.show': 'Show',
      'login.hide': 'Hide',
      'register.title': 'Travel agency and agent registration',
      'register.lead': 'Complete the company or authorized contact details to request access to the booking portal.',
      'register.companyData': 'Company details',
      'register.country': 'Country',
      'register.taxType': 'Tax ID type',
      'register.taxNumber': 'Tax ID number',
      'register.legalName': 'Legal name',
      'register.tradeName': 'Trade name',
      'register.contactEmail': 'Contact email',
      'register.website': 'Website or social media',
      'register.representative': 'Representative or authorized contact',
      'register.accessInfo': 'Access information',
      'register.createPassword': 'Create password',
      'register.confirmPassword': 'Confirm password',
      'register.submit': 'Register agency',
      'profile.contactData': 'Contact details',
      'profile.changePassword': 'Change password',
      'orders.title': 'My orders',
      'orders.subtitle': 'Check the status and details of your booking orders.',
      'orders.status': 'Status',
      'orders.all': 'All',
      'orders.pending': 'Pending',
      'orders.paid': 'Paid',
      'orders.expired': 'Expired',
      'orders.refresh': 'Refresh',
      'orders.code': 'Code',
      'orders.date': 'Date',
      'orders.services': 'Services',
      'orders.total': 'Total',
      'orders.action': 'Action',
      'orders.viewDetails': 'View details',
      'orders.noOrders': 'There are no orders to show with this filter.',
      'verify.title': 'Email verification',
      'verify.loading': 'We are verifying your email...',
      'verify.success': 'Email verified successfully.',
      'verify.error': 'We could not verify your email.',
      'verify.login': 'Go to agency access',
      'login.privatePortal': 'Private portal',
      'login.accessEmail': 'Access email',
      'login.emailPlaceholder': 'email@company.com',
      'login.passwordPlaceholder': 'Your password',
      'register.hasAccess': 'I already have access',
      'register.passwordLength': 'Minimum 8 characters',
      'register.passwordLetter': 'Includes one letter',
      'register.passwordNumber': 'Includes one number',
      'register.passwordSpecial': 'Includes one special character',
      'register.passwordMatch': 'Passwords match',
      'register.validEmailTitle': 'Enter a valid email address, for example name@domain.com',
      'register.validTaxTitle': 'Use only letters, numbers, dots or hyphens.',
      'profile.title': 'My details',
      'profile.subtitle': 'Update your contact details or change your password.',
      'profile.accessEmailNote': 'The access email cannot be changed from this section. To update it, please contact us.',
      'profile.company': 'Agency',
      'profile.website': 'Website',
      'profile.saveChanges': 'Save changes',
      'profile.currentPassword': 'Current password',
      'profile.newPassword': 'New password',
      'profile.confirmPassword': 'Confirm new password',
      'profile.updatePassword': 'Update password',
      'profile.saving': 'Saving...',
      'profile.updating': 'Updating...',
      'orders.newBooking': 'New booking',
      'orders.orderSingular': 'order',
      'orders.orderPlural': 'orders',
      'orders.filterByStatus': 'Filter by status',
      'orders.detailTitle': 'Order details',
      'orders.orderCode': 'Order code',
      'orders.servicePickup': 'Service / pick-up',
      'orders.important': 'Important',
      'orders.pageImportantHtml': '<strong>Important:</strong> pending orders must be paid within the indicated period. Paid or expired orders can be updated manually from the control sheet.',
      'orders.importantText': 'review holder, passenger and pick-up details before making the payment. Pending orders are confirmed with payment validated within the indicated period.',
      'orders.generalNotes': 'General notes',
      'orders.noServiceDetail': 'No service details were found for this order.',
      'orders.alreadyPaid': 'This order is already marked as paid.',
      'orders.expiredAlert': 'This order has expired. Please generate a new order or check availability.',
      'orders.paypalCreateError': 'The PayPal payment could not be created.',
      'orders.mpCreateError': 'The Mercado Pago payment could not be created.',
      'orders.paypalConnectError': 'Could not connect to PayPal.',
      'orders.mpConnectError': 'Could not connect to Mercado Pago.',
      'orders.invalidResponse': 'Invalid Apps Script response.',
      'agency.selectCountry': 'Select country',
      'agency.passenger': 'Passenger',
      'agency.service': 'Service',
      'agency.servicesLower': 'service(s)',
      'agency.cartDate': 'Date',
      'agency.cartTime': 'Time',
      'agency.cartPassengers': 'Passengers',
      'agency.holder': 'Holder',
      'agency.remove': 'Remove',
      'agency.viewPrintOrder': 'View / print order',
      'agency.ticket': 'Ticket',
      'agency.rate': 'Rate',
      'agency.orderTableService': 'Service',
      'agency.noAdditionalData': 'Additional details pending.',
      'agency.due': 'Due',
      'agency.noteSheetError': 'Note: delivery to Google Sheets was not confirmed. Please check the connection.',
      'agency.addOneService': 'Add at least one service to your order.',
      'register.sending': 'Sending registration...',
      'agency.perPassenger': 'per passenger'
    }
  };

  const t = (key, vars) => {
    const value = (dictionaries[lang] && dictionaries[lang][key]) || key;
    if (!vars) return value;
    return Object.entries(vars).reduce((txt, [k, v]) => txt.replaceAll(`{${k}}`, v), value);
  };

  function field(obj, name) {
    if (!obj || lang === 'es') return obj ? obj[name] : '';
    const translated = obj[`${name}_en`];
    return translated !== undefined && translated !== null && translated !== '' ? translated : obj[name];
  }

  function localizeSteps(list) {
    if (!Array.isArray(list)) return list;
    return list.map((step) => {
      if (typeof step === 'string') return step;
      return {
        ...step,
        title: step.title_en || step.title,
        description: step.description_en || step.text_en || step.description || step.text,
        text: step.text_en || step.description_en || step.text
      };
    });
  }

  function localizeService(service) {
    if (!service || lang === 'es') return service;
    const copy = { ...service };
    ['name','shortName','category','priceUnit','durationLabel','startLabel','frequency','description','shortDescription','notIncluded','priceAltLabel','title'].forEach((key) => {
      if (copy[`${key}_en`] !== undefined) copy[key] = copy[`${key}_en`];
    });
    if (Array.isArray(copy.includes_en)) copy.includes = copy.includes_en;
    if (Array.isArray(copy.excludes_en)) copy.excludes = copy.excludes_en;
    if (Array.isArray(copy.itinerary_en)) copy.itinerary = copy.itinerary_en;
    if (Array.isArray(copy.timeline_en)) copy.timeline = copy.timeline_en;
    copy.itinerary = localizeSteps(copy.itinerary);
    copy.timeline = localizeSteps(copy.timeline);
    if (Array.isArray(copy.entryTickets)) {
      copy.entryTickets = copy.entryTickets.map((ticket) => ({
        ...ticket,
        name: ticket.name_en || ticket.name,
        note: ticket.note_en || ticket.note
      }));
    }
    return copy;
  }

  function samePathWithLang(targetLang) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', targetLang);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function patchHeaderLanguageLinks() {
    document.querySelectorAll('.lang-switcher__menu a[data-lang]').forEach((link) => {
      const targetLang = link.dataset.lang || 'es';
      if (!SUPPORTED.includes(targetLang)) return;
      link.setAttribute('href', samePathWithLang(targetLang));
      if (link.dataset.agencyLangBound === '1') return;
      link.dataset.agencyLangBound = '1';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        localStorage.setItem('site_lang', targetLang);
        window.location.href = samePathWithLang(targetLang);
      }, true);
    });
    const label = document.querySelector('.lang-switcher__toggle span');
    if (label) label.textContent = lang === 'en' ? 'EN' : 'ES';
  }

  function applyStaticTranslations() {
    if (lang === 'es') { patchHeaderLanguageLinks(); return; }
    const setText = (selector, key) => document.querySelectorAll(selector).forEach((el) => { el.textContent = t(key); });
    const setHtml = (selector, key) => document.querySelectorAll(selector).forEach((el) => { el.innerHTML = t(key); });
    const setPlaceholder = (selector, key) => document.querySelectorAll(selector).forEach((el) => { el.setAttribute('placeholder', t(key)); });

    setText('.agency-intro-bar .eyebrow', 'agency.portalWelcome');
    setText('a[href="./ordenes.html"]', 'agency.orders');
    setText('a[href="./mis-datos.html"]', 'agency.myData');
    setText('#logoutButton', 'agency.logout');
    if (window.location.pathname.endsWith('/agencias/') || window.location.pathname.endsWith('/agencias/index.html') || window.location.pathname.includes('/agencias/index')) setHtml('.info-note', 'agency.beforeReserveHtml');
    setText('#experiencias .section-title h2', 'agency.availableExperiences');
    setText('#experiencias .section-title p', 'agency.availableHelp');
    setText('#checkoutTitle', 'agency.yourOrder');
    setText('#generateOrderButton', 'agency.generateOrder');
    setText('#clearCartButton', 'agency.clearOrder');
    setText('#reserveTitle', 'agency.reserveExperience');
    setText('#itineraryTitle', 'agency.itineraryTitle');
    setText('#reserveForm > .dialog-help', 'agency.reserveHelp');
    setText('label[for="statusFilter"], .requests-toolbar label span', 'orders.status');
    setText('#refreshOrdersButton', 'orders.refresh');
    setText('#ordersTable th:nth-child(1)', 'orders.code');
    setText('#ordersTable th:nth-child(2)', 'orders.date');
    setText('#ordersTable th:nth-child(3)', 'orders.status');
    setText('#ordersTable th:nth-child(4)', 'orders.services');
    setText('#ordersTable th:nth-child(5)', 'orders.total');
    setText('#ordersTable th:nth-child(6)', 'orders.action');

    document.querySelectorAll('label.field span, .field span').forEach((span) => {
      const map = {
        'Fecha del tour': 'agency.tourDate', 'Hora de inicio': 'agency.startTime', 'Cantidad de pasajeros': 'agency.passengerCount',
        'Nombre': 'agency.firstName', 'Apellido': 'agency.lastName', 'Nombres': 'agency.firstName', 'Apellidos': 'agency.lastName',
        'Tipo de documento': 'agency.docType', 'Número de documento': 'agency.docNumber', 'Nacionalidad': 'agency.nationality',
        'Idioma': 'agency.language', 'Código de país': 'agency.countryCode', 'Celular / WhatsApp': 'agency.phone',
        'Lugar de recojo': 'agency.pickup', 'Observaciones': 'agency.observations',
        'Correo de inicio de sesión': 'login.email', 'Correo de acceso': 'login.accessEmail', 'Crear contraseña': 'register.createPassword', 'Confirmar contraseña': 'register.confirmPassword',
        'País': 'register.country', 'Tipo de identificación fiscal': 'register.taxType', 'Número de identificación fiscal': 'register.taxNumber',
        'Razón social': 'register.legalName', 'Razón social / nombre legal': 'register.legalName', 'Nombre comercial': 'register.tradeName', 'Correo de contacto': 'register.contactEmail',
        'Página web o red social': 'register.website', 'Página web': 'profile.website', 'Contraseña': 'login.password',
        'Agencia': 'profile.company', 'Contraseña actual': 'profile.currentPassword', 'Nueva contraseña': 'profile.newPassword', 'Confirmar nueva contraseña': 'profile.confirmPassword',
        'Filtrar por estado': 'orders.filterByStatus'
      };
      const key = map[span.textContent.trim()];
      if (key) span.textContent = t(key);
    });
    setPlaceholder('#pickupPoint', 'agency.pickupPlaceholder');
    setPlaceholder('#bookingNotes', 'agency.observationsPlaceholder');
    setText('.form-subtitle', 'agency.leadData');
    const summary = document.querySelector('#passengersDetails summary');
    if (summary) summary.innerHTML = `${t('agency.otherPassengers')} <span>${t('agency.optional')}</span>`;
    const passHelp = document.querySelector('#passengersDetails .dialog-help');
    if (passHelp) passHelp.textContent = t('agency.otherPassengersHelp');
    setText('#includeTicketsToggle + span', 'agency.includeTickets');
    setText('.entry-tickets-box__head small', 'agency.ticketsApply');
    document.querySelectorAll('[data-close-modal], [data-close-order-detail], [data-close-order-detail-static]').forEach((btn) => {
      if (btn.textContent.trim() === 'Cancelar') btn.textContent = t('agency.cancel');
      if (btn.textContent.trim() === 'Cerrar') btn.textContent = t('agency.close');
    });
    document.querySelectorAll('.dialog-actions button[type="submit"]').forEach((btn) => { if (btn.textContent.trim() === 'Agregar a la orden') btn.textContent = t('agency.addToOrder'); });

    setText('.auth-card h1', window.location.pathname.includes('registro') ? 'register.title' : 'login.title');
    setText('.auth-lead', window.location.pathname.includes('registro') ? 'register.lead' : 'login.subtitle');
    setText('#loginForm button[type="submit"]', 'login.enter');
    setText('a[href="./registro.html"].agency-button, a[href="registro.html"].agency-button', 'login.register');
    document.querySelectorAll('.form-block h2, .profile-card h2').forEach((h2) => {
      const map = {'Datos de la empresa':'register.companyData','Representante o contacto autorizado':'register.representative','Información de acceso':'register.accessInfo','Datos de contacto':'profile.contactData','Cambiar contraseña':'profile.changePassword'};
      const key = map[h2.textContent.trim()]; if (key) h2.textContent = t(key);
    });
    setText('#registerForm button[type="submit"]', 'register.submit');
    setText('#ordersPageTitle, .orders-title', 'orders.title');
    setText('#ordersPageSubtitle, .orders-subtitle', 'orders.subtitle');
    setText('#verifyTitle', 'verify.title');
    setText('#verifyMessage', 'verify.loading');
    setText('a[href="./login.html"].agency-button', 'verify.login');

    const path = window.location.pathname;
    if (path.includes('/login')) {
      setText('.auth-card .eyebrow', 'login.privatePortal');
      setText('label[for="loginEmail"] span, label.field span', 'login.accessEmail');
      const emailLabel = document.querySelector('#loginEmail')?.closest('label')?.querySelector('span');
      if (emailLabel) emailLabel.textContent = t('login.accessEmail');
      const passLabel = document.querySelector('#loginPassword')?.closest('label')?.querySelector('span');
      if (passLabel) passLabel.textContent = t('login.password');
      setPlaceholder('#loginEmail', 'login.emailPlaceholder');
      setPlaceholder('#loginPassword', 'login.passwordPlaceholder');
    }

    if (path.includes('/registro')) {
      setText('.agency-hero h1', 'register.title');
      setText('.agency-hero p', 'register.lead');
      setText('a[href="./login.html"].agency-button', 'register.hasAccess');
      setText('#passwordChecklist [data-rule="length"]', 'register.passwordLength');
      setText('#passwordChecklist [data-rule="letter"]', 'register.passwordLetter');
      setText('#passwordChecklist [data-rule="number"]', 'register.passwordNumber');
      setText('#passwordChecklist [data-rule="special"]', 'register.passwordSpecial');
      setText('#passwordChecklist [data-rule="match"]', 'register.passwordMatch');
      document.querySelectorAll('.password-toggle').forEach((btn) => { if (btn.textContent.trim() === 'Ver') btn.textContent = t('login.show'); });
    }

    if (path.includes('/mis-datos')) {
      setText('.agency-intro-bar .eyebrow', 'agency.portalWelcome');
      setText('.agency-intro-bar h1', 'profile.title');
      const subtitle = document.querySelector('.agency-intro-bar p:not(.eyebrow)');
      if (subtitle) subtitle.textContent = t('profile.subtitle');
      setText('a[href="./index.html"].agency-button', 'orders.newBooking');
      setText('a[href="./ordenes.html"].agency-button', 'agency.orders');
      setText('.profile-card .dialog-help', 'profile.accessEmailNote');
      const saveBtn = document.querySelector('#profileForm button[type="submit"]');
      if (saveBtn) saveBtn.textContent = t('profile.saveChanges');
      const updateBtn = document.querySelector('#passwordForm button[type="submit"]');
      if (updateBtn) updateBtn.textContent = t('profile.updatePassword');
      setText('#profilePasswordChecklist [data-check="length"]', 'register.passwordLength');
      setText('#profilePasswordChecklist [data-check="letter"]', 'register.passwordLetter');
      setText('#profilePasswordChecklist [data-check="number"]', 'register.passwordNumber');
      setText('#profilePasswordChecklist [data-check="special"]', 'register.passwordSpecial');
      document.querySelectorAll('.password-toggle').forEach((btn) => { if (btn.textContent.trim() === 'Ver') btn.textContent = t('login.show'); });
    }

    if (path.includes('/ordenes')) {
      setText('.agency-intro-bar .eyebrow', 'agency.portalWelcome');
      setText('.agency-intro-bar h1', 'orders.title');
      setText('#ordersAgencyName', 'orders.subtitle');
      setText('a[href="./index.html"].agency-button', 'orders.newBooking');
      setText('#logoutButton', 'agency.logout');
      const total = document.querySelector('.toolbar-total');
      const count = document.querySelector('#ordersCount')?.textContent || '0';
      if (total) total.innerHTML = `<span id="ordersCount">${count}</span> ${Number(count) === 1 ? t('orders.orderSingular') : t('orders.orderPlural')}`;
      const label = document.querySelector('label[for="statusFilter"] span, #statusFilter')?.closest('label')?.querySelector('span');
      if (label) label.textContent = t('orders.filterByStatus');
      const options = document.querySelectorAll('#statusFilter option');
      if (options[0]) options[0].textContent = t('orders.all');
      if (options[1]) options[1].textContent = t('orders.pending');
      if (options[2]) options[2].textContent = t('orders.paid');
      if (options[3]) options[3].textContent = t('orders.expired');
      setText('#orderDetailTitle', 'orders.detailTitle');
      const ordersInfo = document.querySelector('main > .info-note');
      if (ordersInfo) ordersInfo.innerHTML = t('orders.pageImportantHtml');
      const loading = document.querySelector('#ordersMessage');
      if (loading && loading.textContent.trim().startsWith('Cargando')) loading.textContent = 'Loading orders...';
    }

    const cartRows = document.querySelectorAll('.cart-total .cart-row span:first-child');
    if (cartRows[0]) cartRows[0].textContent = t('agency.subtotalLabel');
    if (cartRows[1]) cartRows[1].textContent = t('agency.feesLabel');
    if (cartRows[2]) cartRows[2].textContent = t('agency.totalLabel');

    document.querySelectorAll('.password-toggle').forEach((btn) => {
      const text = btn.textContent.trim().toLowerCase();
      if (text === 'ver') btn.textContent = t('login.show');
      if (text === 'ocultar') btn.textContent = t('login.hide');
    });
    setPlaceholder('#accessEmail', 'login.emailPlaceholder');
    patchHeaderLanguageLinks();
  }

  window.MCTAgenciesI18n = { lang, t, field, localizeService, apply: applyStaticTranslations, patchHeaderLanguageLinks };
  document.addEventListener('DOMContentLoaded', () => {
    applyStaticTranslations();
    setTimeout(applyStaticTranslations, 300);
    setTimeout(applyStaticTranslations, 900);
    setTimeout(patchHeaderLanguageLinks, 1400);
  });
})();
