"use strict";
(() => {
  const state = { selector: "", data: null, timer: null, observer: null };
  function locale() {
    return String(document.documentElement?.lang || "es").toLowerCase();
  }
  function textSet(percent) {
    const language = locale();
    if (language.startsWith("en")) {
      return { language, header: percent + "% discount applied",
        timerLabel: "Coupon expires in", note: "(Does not apply to flights or extras)" };
    }
    if (language.startsWith("pt")) {
      return { language, header: "Desconto de " + percent + "% aplicado",
        timerLabel: "Cupom expira em", note: "(Não se aplica a voos ou extras)" };
    }
    return { language, header: "Descuento del " + percent + "% aplicado",
      timerLabel: "Cupón caduca en", note: "(No aplica para vuelos y extras)" };
  }
  function fmt(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
      .map(value => String(value).padStart(2, "0")).join(":");
  }
  function refresh() {
    if (!state.data) return;
    const expires = Date.parse(String(state.data.expiresAt || ""));
    const remaining = Number.isFinite(expires) ? Math.max(0, expires - Date.now()) : 0;
    const labels = textSet(state.data.discountPercent);
    const node = document.getElementById("mct-bf26-badge");
    if (!node) return;
    node.querySelector("[data-bf-title]").textContent = labels.header;
    node.querySelector("[data-bf-timer-label]").textContent = labels.timerLabel;
    node.querySelector("[data-bf-timer-value]").textContent = fmt(remaining);
    node.querySelector("[data-bf-note]").textContent = labels.note;
    const formatter = new Intl.NumberFormat(labels.language.startsWith("en") ? "en-US" : "es-PE",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amount = formatter.format(state.data.discountAmount || 0);
    node.querySelector("[data-bf-savings]").textContent = labels.language.startsWith("en")
      ? "You save " + state.data.currency + " " + amount
      : labels.language.startsWith("pt")
        ? "Você economiza " + state.data.currency + " " + amount
        : "Ahorras " + state.data.currency + " " + amount;
    node.classList.toggle("is-expired", remaining <= 0);
    if (remaining <= 0 && state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }
  function place() {
    if (!state.data || !state.selector) return;
    const anchor = document.querySelector(state.selector);
    if (!anchor || !anchor.parentNode || document.getElementById("mct-bf26-badge")) return;
    const box = document.createElement("div");
    box.id = "mct-bf26-badge";
    box.className = "mct-bf26-wrap";
    box.innerHTML = '<div class="mct-bf26-glow"><span data-bf-title></span></div>' +
      '<div class="mct-bf26-time"><span data-bf-timer-label></span> <strong data-bf-timer-value></strong></div>' +
      '<p class="mct-bf26-note" data-bf-note></p><p class="mct-bf26-savings" data-bf-savings></p>';
    anchor.insertAdjacentElement("afterend", box);
    refresh();
  }
  function mount(selector, result, options = {}) {
    if (result?.campaign !== "black_friday_2026") { clear(); return; }
    clear();
    state.selector = selector;
    state.data = {
      expiresAt: result.expiresAt,
      discountPercent: Number(result.discountPercent ?? result.value ?? 0),
      discountAmount: Number(options.discountAmount ?? result.discountAmount ?? 0),
      currency: String(options.currency || result.currency || "USD")
    };
    place();
    state.observer = new MutationObserver(place);
    state.observer.observe(document.body, { childList: true, subtree: true });
    state.timer = setInterval(refresh, 1000);
  }
  function clear() {
    if (state.timer) clearInterval(state.timer);
    if (state.observer) state.observer.disconnect();
    state.selector = ""; state.data = null; state.timer = null; state.observer = null;
    document.getElementById("mct-bf26-badge")?.remove();
  }
  window.MCTBlackFridayBadge = { mount, clear };
})();