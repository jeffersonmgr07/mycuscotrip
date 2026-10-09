(function () {
  "use strict";

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function siteUrl(value) {
    const base = location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";
    try {
      const url = new URL(value, new URL(base, location.origin));
      return url.origin === location.origin ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function supports(reserva) {
    const format = reserva?.formatoImpresion;
    return reserva?.codigo === "CUZDC9949" &&
      format?.tipo === "voucher-aprobado-svg-v1" &&
      format.codigo === reserva.codigo &&
      Array.isArray(format.paginas) && format.paginas.length === 3 &&
      format.paginas.every((page) => siteUrl(page.url).endsWith(".svg"));
  }

  function render(reserva) {
    if (!supports(reserva)) return "";
    return `<div class="mct-approved-print" aria-label="Travel Voucher ${escape(reserva.codigo)}">${
      reserva.formatoImpresion.paginas.map((page) => {
        const links = (page.enlaces || []).map((link) => {
          // PDF-approved links remain clickable when the browser saves a PDF.
          // Their host is fixed to the My Cusco Trip site in the source record.
          let url;
          try { url = new URL(link.url); } catch (_) { return ""; }
          if (url.protocol !== "https:" || url.hostname !== "mycuscotrip.com") return "";
          const coordinates = [link.left, link.top, link.width, link.height].map(Number);
          if (coordinates.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) return "";
          const [left, top, width, height] = coordinates;
          return `<a class="mct-approved-print-link" href="${escape(url.href)}" aria-label="${escape(url.pathname.includes('/tickets/') ? 'Descargar tickets de Machu Picchu' : 'Consultar Mi Reserva')}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%">&#160;</a>`;
        }).join("");
        return `<section class="mct-approved-print-page"><img src="${escape(siteUrl(page.url))}" alt="${escape(page.descripcion)}" loading="eager" decoding="sync" width="595" height="842">${links}</section>`;
      }).join("")
    }</div>`;
  }

  async function print() {
    if (!document.body.classList.contains("mct-approved-voucher")) {
      window.print();
      return;
    }
    const button = document.getElementById("printBtn");
    const images = [...document.querySelectorAll("#voucherPrint .mct-approved-print-page img")];
    if (button) button.disabled = true;
    try {
      if (images.length !== 3) throw new Error("Missing voucher pages");
      await Promise.all(images.map((image) => {
        if (image.complete) return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error("Missing page"));
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Page loading timed out")), 15000);
          image.addEventListener("load", () => { clearTimeout(timeout); resolve(); }, { once: true });
          image.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Page loading failed")); }, { once: true });
        });
      }));
      window.print();
    } catch (error) {
      console.error("Voucher print pages could not be loaded", error);
      window.alert("No se pudieron cargar las páginas del voucher. Recarga la página e intenta imprimir nuevamente.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  window.MyCuscoTripApprovedVoucher = { supports, render, print };
})();
