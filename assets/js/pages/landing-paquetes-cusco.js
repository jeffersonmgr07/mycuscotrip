"use strict";
(function () {
  function init() {
    const node = document.getElementById("package-landing-data"), form = document.getElementById("package-quote-form");
    if (!node || !form || form.dataset.ready) return;
    form.dataset.ready = "true";
    const product = JSON.parse(node.textContent), tracking = window.MyCuscoTripTracking;
    tracking?.trackCatalogProduct?.(product, "USD");
    const get = name => form.elements.namedItem(name), money = n => `US$${n.toFixed(2)}`;
    const modal = document.getElementById("passengerReservationModal"), passengerForm = document.getElementById("passengerReservationForm");
    const message = modal.querySelector("[data-passenger-message]"), review = document.getElementById("passengerCheckoutReview");
    const openButton = document.getElementById("package-pay"), payButton = passengerForm.querySelector('[type="submit"]');
    const fields = new window.MctPackagePassengerFields(() => Number(get("adults").value) + Number(get("children").value));
    let busy = false, pending = null, reviewed = false, bookingCode = "", openedSignature = "";
    function newReservationCode() {
      const bytes = new Uint8Array(3);
      crypto.getRandomValues(bytes);
      return "CUZ" + Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    function counts() {
      const adults = Number(get("adults").value), children = Number(get("children").value);
      if (!Number.isInteger(adults) || adults < 1 || adults > 30 || !Number.isInteger(children) || children < 0 || children > 30) return null;
      return { adults, children, total: (adults * Math.round(product.adultPrice * 100) + children * Math.round(product.childPrice * 100)) / 100 };
    }
    function resetReview() { reviewed = false; review.hidden = true; payButton.textContent = "Continuar"; }
    function update() {
      const c = counts();
      document.getElementById("package-total").textContent = c ? money(c.total) : "—";
      const breakdown = document.getElementById("package-breakdown");
      breakdown.replaceChildren();
      if(c) for(const [label,n,price] of [["Adultos",c.adults,product.adultPrice],["Niños",c.children,product.childPrice]]) {
        const dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = `${label}: ${n} × ${money(price)}`; dd.textContent = money(n*price); breakdown.append(dt,dd);
      }
      document.querySelectorAll("[data-step]").forEach(b => { const input=get(b.dataset.count); b.disabled=Number(b.dataset.step)<0 ? Number(input.value)<=Number(input.min) : Number(input.value)>=Number(input.max); });
    }
    document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>{const input=get(b.dataset.count); input.value=Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)+Number(b.dataset.step))); update();}));
    form.addEventListener("input",update); update();
    const today = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    if (window.flatpickr) {
      window.flatpickr(get("start"), { locale: window.flatpickr.l10ns.es, dateFormat:"Y-m-d", altInput:true, altFormat:"j F Y", minDate:today, disableMobile:true, allowInput:false, onReady:(_,__,instance)=>instance.calendarContainer.classList.add("mct-package-calendar") });
      openButton.disabled = false; openButton.type = "submit";
    } else { document.getElementById("package-payment-message").textContent="No se pudo cargar el calendario. Recarga la página o contáctanos por WhatsApp."; }
    // Populate the same country and telephone controls used by the experience modal.
    fields.populateCountrySelects(modal);
    fetch("../assets/data/countries.json").then(r=>{if(!r.ok)throw Error();return r.json();}).then(countries=>{
      const select=passengerForm.elements.namedItem("holderWhatsappCountryCode");
      select.replaceChildren(...countries.map(c=>{const o=new Option(`${c.dialCode} · ${c.name}`,c.dialCode);o.selected=c.code==="PE";return o;}));
    }).catch(()=>{const select=passengerForm.elements.namedItem("holderWhatsappCountryCode");select.replaceChildren(new Option("Código de país", ""));const input=document.createElement("input");input.name=select.name;input.type="tel";input.placeholder="+51";input.required=true;input.setAttribute("aria-label","Código de país");select.replaceWith(input);});
    function close() { if(busy)return; modal.hidden=true;document.body.classList.remove("passenger-modal-open");openButton.focus(); }
    modal.querySelectorAll("[data-close-passenger-modal], #closePassengerModalBtn").forEach(b=>b.addEventListener("click",close));
    document.addEventListener("keydown",e=>{
      if(modal.hidden)return;
      if(e.key==="Escape")close();
      if(e.key==="Tab") { const nodes=[...modal.querySelectorAll('button,input,select,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length); const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();} }
    });
    document.getElementById("passengerReservationCodeCopy").addEventListener("click",()=>navigator.clipboard?.writeText(bookingCode).catch(()=>{}));
    document.getElementById("passengerDetailsToggle").hidden=true;
    document.getElementById("holderTravelsCheckbox").addEventListener("change",()=>{fields.renderAdditionalPassengerFields();document.getElementById("holderSectionTitle").textContent=passengerForm.elements.holderTravels.checked?"Titular de reserva / Pasajero 1":"Titular de reserva";});
    document.getElementById("holderLanguageSelect").addEventListener("change",e=>{document.getElementById("holderLanguageWarning").hidden=["Español","English"].includes(e.target.value);});
    form.addEventListener("submit",event=>{
      event.preventDefault(); if(!form.reportValidity()||!counts())return;
      if(!get("start").value||get("start").value<today){document.getElementById("package-payment-message").textContent="Elige una fecha de llegada válida.";return;}
      const signature=JSON.stringify([get("start").value,counts()]);
      if(signature!==openedSignature){pending=null;bookingCode=newReservationCode();fields.renderAdditionalPassengerFields();openedSignature=signature;}
      document.getElementById("passengerReservationCode").textContent=bookingCode;
      document.getElementById("passengerPayNowAmount").textContent=money(counts().total);
      resetReview();message.textContent="";modal.hidden=false;document.body.classList.add("passenger-modal-open");
      passengerForm.elements.holderFirstName.focus();
      tracking?.track?.("begin_checkout",{item_id:product.id,value:counts().total,currency:"USD"});
    });
    passengerForm.addEventListener("input",()=>{if(!busy){resetReview();if(pending?.saved){bookingCode=newReservationCode();document.getElementById("passengerReservationCode").textContent=bookingCode;}pending=null;}});
    passengerForm.addEventListener("submit",async event=>{
      event.preventDefault();if(busy||!passengerForm.reportValidity())return;
      const c=counts(), data=new FormData(passengerForm), holderTravels=data.get("holderTravels")==="on";
      const holder={};for(const key of ["firstName","lastName","documentType","documentNumber","nationality","birthdate","whatsappCountryCode","whatsapp","email","language"])holder[key]=String(data.get("holder"+key[0].toUpperCase()+key.slice(1))||"").trim();
      if(!holder.firstName||!holder.lastName){message.textContent="Completa los nombres y apellidos del titular.";return;}
      holder.travels=holderTravels;
      const passengers=[];
      if(holderTravels)passengers.push({...holder,passengerNumber:1,role:"holder_passenger",completionStatus:"complete"});
      for(let n=holderTravels?2:1;n<=c.adults+c.children;n++) {
        const later=data.get(`passenger_${n}_complete_later`)==="on";const person={passengerNumber:n,role:"traveler",completeLater:later,completionStatus:later?"pending":"provided"};
        for(const key of ["firstName","lastName","documentType","documentNumber","nationality","birthdate"])person[key]=later?"":String(data.get(`passenger_${n}_${key}`)||"").trim();passengers.push(person);
      }
      if(!reviewed){
        review.replaceChildren();const title=document.createElement("h3");title.textContent="Revisa tu reserva";review.append(title);
        for(const text of [product.title,`Llegada: ${get("start").value}`,`${c.adults} adultos · ${c.children} niños`,`${holder.firstName} ${holder.lastName}`,`Total a pagar: ${money(c.total)}`,"No incluye alojamiento."]){const p=document.createElement("p");p.textContent=text;review.append(p);}
        review.hidden=false;reviewed=true;payButton.textContent="Continuar al pago";review.scrollIntoView?.({block:"nearest",behavior:"smooth"});return;
      }
      busy=true;const controls=[...passengerForm.querySelectorAll("input,select,button")];const disabled=controls.map(x=>x.disabled);controls.forEach(x=>x.disabled=true);
      try {
        const api=window.MyCuscoTripApiClient;
        if(!api||!await api.isBackendEnabled())throw Error("El pago no está disponible. Contáctanos por WhatsApp.");
        if(!pending)pending={code:bookingCode,reservationCode:bookingCode,createdAt:new Date().toISOString(),source:"landing-paquetes-cusco",landingId:product.id,productId:product.id,productSlug:product.slug,productTitle:product.title,productType:"package",sourcePage:location.pathname,landingPath:location.pathname,date:get("start").value,adults:c.adults,children:c.children,infants:0,totalPassengers:c.adults+c.children,currency:"USD",paymentMode:"full",payNowValue:c.total,serviceTotalValue:c.total,payLaterValue:0,status:"pre_reservation",paymentStatus:"pending",holderIsPassenger:holderTravels,holder,passengers,travelers:{adults:c.adults,children:c.children,infants:0,passengers},accommodationIncluded:false,availabilityConfirmed:true,childEligibilityConfirmed:c.children>0,pricing:{subtotal:c.total,discount:0,total:c.total,currency:"USD"},services:[{id:product.id,title:product.title,date:get("start").value,lineTotal:c.total,extras:["Sin alojamiento"]}]};
        if(!pending.saved){
          message.textContent="Registrando tu reserva…";
          let result;
          for (let attempt = 0; attempt < 3; attempt++) {
            result = await api.createPreReservation(pending);
            // Retry only the server's explicit collision rejection, never a timeout.
            if (result?.ok || result?.error !== 'Ya existe una reserva con ese código. Intenta nuevamente.' || attempt === 2) break;
            bookingCode = newReservationCode();
            pending.code = pending.reservationCode = bookingCode;
            document.getElementById("passengerReservationCode").textContent = bookingCode;
          }
          if(!result?.ok||result.mock)throw Error(result?.error||result?.message||"No se pudo registrar la reserva.");
          pending.code=pending.reservationCode=result.reservationCode||result.code||pending.code;pending.saved=true;
          document.getElementById("passengerReservationCode").textContent=pending.code;
        }
        message.textContent="Conectando con PayPal…";
        const result=await api.createPayPalOrder({code:pending.code,reservationCode:pending.code,currency:"USD",amountToPayNowValue:c.total,productId:product.id,productTitle:product.title});
        if(!result?.ok||result.mock||!result.approvalUrl)throw Error(result?.error||result?.message||"PayPal no devolvió el enlace de pago.");
        const url=new URL(result.approvalUrl);if(url.protocol!=="https:"||!/^(?:www\.)?(?:sandbox\.)?paypal\.com$/.test(url.hostname))throw Error("Enlace de pago no válido.");
        try{sessionStorage.setItem(`mct_pending_payment_${pending.code}`,JSON.stringify({payload:{productId:product.id,productTitle:product.title,currency:"USD",payNowValue:c.total}}));}catch(_){}
        location.assign(url.href);
      }catch(error){message.textContent=error.message||"No se pudo iniciar el pago.";}finally{busy=false;controls.forEach((x,i)=>x.disabled=disabled[i]);}
    });
    if(new URLSearchParams(location.search).get("payment")==="cancelled")document.getElementById("package-payment-message").textContent="Pago cancelado. Consulta el estado de tu reserva antes de iniciar otro pago.";
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
