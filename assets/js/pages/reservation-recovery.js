(function () {
  const copy = {
    es: { hero: "Ingresa tu código de reserva y uno o ambos apellidos del titular para revisar el viaje, abrir tu travel voucher y consultar tus tickets.", identifier: "Apellido del titular (uno o ambos)", placeholder: "Ej. Villanueva o Villanueva Cortés", help: "Puedes ingresar un solo apellido o los dos. No es necesario escribir tildes para que la búsqueda coincida.", search: "Buscar reserva", searching: "Buscando...", required: "Ingresa el código de reserva y al menos un apellido del titular.", notFound: "No encontramos una reserva con esos datos.", error: "No se pudo consultar la reserva. Verifica los datos o contacta a tu asesor." },
    en: { hero: "Enter your reservation code and the registered email address —or the holder's last name— to review the trip and resume a pending payment.", identifier: "Email address or last name", placeholder: "e.g. traveler@email.com", help: "For security, the code must match the registered email address or last name.", search: "Find reservation", searching: "Searching...", required: "Enter the reservation code and the registered email or last name.", notFound: "We could not find a reservation with those details.", error: "The reservation could not be retrieved. Check the details or contact your advisor." },
    pt: { hero: "Insira o código da reserva e o e-mail cadastrado —ou o sobrenome do titular— para revisar a viagem e retomar um pagamento pendente.", identifier: "E-mail ou sobrenome", placeholder: "Ex. viajante@email.com", help: "Por segurança, o código deve coincidir com o e-mail ou sobrenome cadastrado.", search: "Buscar reserva", searching: "Buscando...", required: "Insira o código da reserva e o e-mail ou sobrenome cadastrado.", notFound: "Não encontramos uma reserva com esses dados.", error: "Não foi possível consultar a reserva. Verifique os dados ou fale com seu consultor." },
    fr: { hero: "Saisissez le code de réservation et l’e-mail enregistré —ou le nom du titulaire— pour consulter le voyage et reprendre un paiement en attente.", identifier: "E-mail ou nom de famille", placeholder: "Ex. voyageur@email.com", help: "Pour votre sécurité, le code doit correspondre à l’e-mail ou au nom enregistré.", search: "Rechercher la réservation", searching: "Recherche...", required: "Saisissez le code et l’e-mail ou le nom enregistré.", notFound: "Aucune réservation ne correspond à ces informations.", error: "Impossible de consulter la réservation. Vérifiez les informations ou contactez votre conseiller." },
    de: { hero: "Geben Sie den Buchungscode und die registrierte E-Mail-Adresse —oder den Nachnamen des Inhabers— ein, um die Reise aufzurufen und eine ausstehende Zahlung fortzusetzen.", identifier: "E-Mail-Adresse oder Nachname", placeholder: "z. B. reisender@email.com", help: "Aus Sicherheitsgründen muss der Code mit der registrierten E-Mail-Adresse oder dem Nachnamen übereinstimmen.", search: "Buchung suchen", searching: "Suche...", required: "Geben Sie Buchungscode und registrierte E-Mail-Adresse oder Nachnamen ein.", notFound: "Mit diesen Angaben wurde keine Buchung gefunden.", error: "Die Buchung konnte nicht abgerufen werden. Prüfen Sie die Angaben oder kontaktieren Sie Ihren Berater." },
    it: { hero: "Inserisci il codice di prenotazione e l’e-mail registrata —o il cognome del titolare— per consultare il viaggio e riprendere un pagamento in sospeso.", identifier: "E-mail o cognome", placeholder: "Es. viaggiatore@email.com", help: "Per sicurezza, il codice deve corrispondere all’e-mail o al cognome registrato.", search: "Cerca prenotazione", searching: "Ricerca...", required: "Inserisci il codice e l’e-mail o il cognome registrato.", notFound: "Non abbiamo trovato una prenotazione con questi dati.", error: "Non è stato possibile consultare la prenotazione. Controlla i dati o contatta il tuo consulente." },
    zh: { hero: "请输入预订代码和登记邮箱（或预订人姓氏），以查看行程并继续未完成的付款。", identifier: "电子邮箱或姓氏", placeholder: "例如 traveler@email.com", help: "为保障安全，预订代码必须与登记邮箱或姓氏一致。", search: "查找预订", searching: "正在查找...", required: "请输入预订代码以及登记邮箱或姓氏。", notFound: "未找到与这些信息匹配的预订。", error: "无法查询预订。请检查信息或联系旅行顾问。" },
    ja: { hero: "予約コードと登録済みメールアドレス（または予約者の姓）を入力して、旅行内容の確認と未完了の支払いを再開してください。", identifier: "メールアドレスまたは姓", placeholder: "例 traveler@email.com", help: "安全のため、コードは登録済みメールアドレスまたは姓と一致する必要があります。", search: "予約を検索", searching: "検索中...", required: "予約コードと登録済みメールアドレスまたは姓を入力してください。", notFound: "入力された情報に一致する予約が見つかりません。", error: "予約を取得できませんでした。情報を確認するか、担当者へお問い合わせください。" }
  };

  function locale() {
    const param = new URLSearchParams(location.search).get("lang");
    const folder = location.pathname.split("/").filter(Boolean)[0];
    return copy[param] ? param : (copy[folder] ? folder : "es");
  }

  function normalized(value) {
    return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }

  function reservationEmail(record) {
    return String(record?.holderEmail || record?.email || record?.holder?.email || record?.payload?.holder?.email || "").trim();
  }

  function reservationLastName(record) {
    return String(record?.apellido || record?.lastName || record?.holder?.lastName || record?.payload?.holder?.lastName || "").trim();
  }

  function surnameMatches(storedSurname, suppliedSurname) {
    const stored = normalized(storedSurname).split(/\s+/).filter(Boolean);
    const supplied = normalized(suppliedSurname).split(/\s+/).filter(Boolean);
    if (!stored.length || !supplied.length) return false;
    if (stored.join(" ") === supplied.join(" ")) return true;
    // Permite ingresar uno o ambos apellidos del titular, sin exigir tildes.
    return supplied.every((token) => stored.includes(token));
  }

  function identityMatches(record, identifier) {
    const value = String(identifier || "").trim();
    if (!value) return false;
    if (value.includes("@")) return normalized(reservationEmail(record)) === normalized(value);
    return surnameMatches(reservationLastName(record), value);
  }

  function rememberAccess(code, identifier) {
    try {
      const access = { code, identifier, expiresAt: Date.now() + 30 * 60 * 1000 };
      sessionStorage.setItem(`mct_reservation_access_${code}`, JSON.stringify(access));
    } catch (_) {}
  }

  function findLocal(code, identifier) {
    const keys = [
      `mct_pending_payment_${code}`,
      `mct_pre_reservation_${code}`
    ];
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of keys) {
        try {
          const raw = storage.getItem(key);
          if (!raw) continue;
          const record = JSON.parse(raw);
          if (identityMatches(record, identifier)) return record;
        } catch (_) {}
      }
    }
    return null;
  }

  function basePath() {
    return window.MyCuscoTripI18n?.getBasePath?.() || (location.hostname.includes("github.io") ? "/mycuscotrip/" : "/");
  }

  function localizedPrefix() {
    const lang = locale();
    return lang === "es" ? basePath() : `${basePath()}${lang}/`;
  }

  function productRecoveryUrl(record, code) {
    const data = record?.payload || record || {};
    const slug = data.productSlug || data.slug || "";
    const prefix = localizedPrefix();
    const params = new URLSearchParams({ payment: "cancelled", reservationCode: code });
    if (slug) params.set("slug", slug);
    return `${prefix}product.html?${params}`;
  }

  async function fetchStaticReservations() {
    const base = location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";
    const response = await fetch(`${base}data/reservas.json`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async function lookupBackend(code, identifier) {
    if (!window.MyCuscoTripApiClient?.lookupReservation) return null;
    try {
      const result = await window.MyCuscoTripApiClient.lookupReservation({
        code,
        reservationCode: code,
        email: String(identifier).includes("@") ? String(identifier).trim().toLowerCase() : "",
        lastName: String(identifier).includes("@") ? "" : String(identifier).trim(),
        identifier: String(identifier).trim()
      });
      if (result?.found || result?.reservation || result?.payload || result?.voucher) {
        return result.reservation || result.payload || result.voucher || result;
      }
    } catch (error) {
      console.warn("Reservation backend lookup failed", error);
    }
    return null;
  }

  function applyCopy() {
    const c = copy[locale()] || copy.es;
    const hero = document.querySelector(".reserva-copy p");
    const label = document.querySelector('label[for="identifier"]');
    const input = document.getElementById("identifier");
    const help = document.querySelector(".reserva-help");
    const button = document.getElementById("buscarBtn");
    if (hero) hero.textContent = c.hero;
    if (label) label.textContent = c.identifier;
    if (input) input.placeholder = c.placeholder;
    if (help) help.textContent = c.help;
    if (button) button.textContent = c.search;
  }

  async function init() {
    const form = document.getElementById("reservaForm");
    if (!form) return;
    applyCopy();
    const params = new URLSearchParams(location.search);
    const codeInput = document.getElementById("codigo");
    const identifierInput = document.getElementById("identifier");
    if (codeInput && params.get("codigo")) codeInput.value = params.get("codigo").toUpperCase();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const c = copy[locale()] || copy.es;
      const errorBox = document.getElementById("errorMessage");
      const button = document.getElementById("buscarBtn");
      const code = String(codeInput?.value || "").trim().toUpperCase();
      const identifier = String(identifierInput?.value || "").trim();
      errorBox.style.display = "none";
      errorBox.textContent = "";
      if (!code || !identifier) {
        errorBox.textContent = c.required;
        errorBox.style.display = "block";
        return;
      }
      button.disabled = true;
      button.textContent = c.searching;
      try {
        const local = findLocal(code, identifier);
        if (local) {
          rememberAccess(code, identifier);
          location.assign(productRecoveryUrl(local, code));
          return;
        }

        const backend = await lookupBackend(code, identifier);
        if (backend) {
          rememberAccess(code, identifier);
          const data = backend.payload || backend;
          if (data.productSlug || data.slug || data.paymentStatus === "pending") {
            try { localStorage.setItem(`mct_pre_reservation_${code}`, JSON.stringify(data)); } catch (_) {}
            location.assign(productRecoveryUrl(data, code));
          } else {
            localStorage.setItem("reservaSeleccionada", JSON.stringify(data));
            const prefix = localizedPrefix();
            location.assign(`${prefix}detalle-reserva.html?codigo=${encodeURIComponent(code)}`);
          }
          return;
        }

        const staticReservations = await fetchStaticReservations();
        const record = staticReservations.find((item) => normalized(item?.codigo) === normalized(code));
        if (record && identityMatches(record, identifier)) {
          rememberAccess(code, identifier);
          localStorage.setItem("reservaSeleccionada", JSON.stringify(record));
          const prefix = localizedPrefix();
          location.assign(`${prefix}detalle-reserva.html?codigo=${encodeURIComponent(code)}`);
          return;
        }

        errorBox.textContent = c.notFound;
        errorBox.style.display = "block";
      } catch (error) {
        console.error(error);
        errorBox.textContent = c.error;
        errorBox.style.display = "block";
      } finally {
        button.disabled = false;
        button.textContent = c.search;
      }
    });
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
