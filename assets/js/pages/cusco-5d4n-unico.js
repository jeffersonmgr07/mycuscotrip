"use strict";
(function () {
  const PRODUCT_ID = "MCT-CUSCO-5D4N-UNICO";
  const PRICE = 729.90;
  // Tipo de cambio manual vigente en assets/data/currency-config.json.
  // Mantener sincronizado con validateCusco5d4nFixedFare_() en Apps Script.
  const USD_PEN = 3.75;
  const UPGRADE_USD_PER_NIGHT = 10;
  const CUSCO_NIGHTS = 3;
  const EXTRAS = { "": { title: "Sin servicios extra", price: 0 }, "panoramico": { title: "Bus panorámico opcional (día 5)", price: 30 } };
  const HOTELS = {
    "cusco-boutique-3s": { title: "Hotel Cusco Boutique", cover: "./assets/img/hotels/cusco-boutique/cover.jpg", gallery: ["./assets/img/hotels/cusco-boutique/1.jpg","./assets/img/hotels/cusco-boutique/3.jpg"], fee: 0 },
    "royal-qosqo-3s": { title: "Hotel Royal Qosqo", cover: "./assets/img/hotels/royal-qosqo/cover.jpg", gallery: ["./assets/img/hotels/royal-qosqo/1.jpg","./assets/img/hotels/royal-qosqo/2.jpg"], fee: UPGRADE_USD_PER_NIGHT * CUSCO_NIGHTS * USD_PEN }
  };
  const DAYS = [
    { title: "Llegada a Cusco y City Tour", hours: "13:30 · Duración aproximada: 5 horas", image: "./assets/img/packages/cusco/5d4n/cover.jpg", description: "Recepción en el aeropuerto o terminal terrestre de acuerdo con el horario de llegada y traslado al hotel. Mañana libre para aclimatarse. A las 13:30, encuentro en la Plaza de Armas del Cusco para visitar el Templo Qoricancha, Sacsayhuamán, Qenqo, Pucapucara y Tambomachay. Noche en Cusco." },
    { title: "Maras, salineras y Moray", hours: "08:00–08:30 a 14:30 · Aproximadamente 6 horas", image: "./assets/img/tours/maras-moray/cover.jpg", description: "Recojo del hotel de 08:00 a 08:30. Visita al poblado de Maras, las salineras de Maras y el complejo arqueológico de Moray. Retorno a Cusco alrededor de las 14:30. Noche en Cusco." },
    { title: "Valle Sagrado y tren a Machu Picchu Pueblo", hours: "07:50–08:20 · Tren de referencia: 16:30", image: "./assets/img/tours/valle-sagrado/cover.jpg", description: "Recojo del hotel entre las 07:50 y las 08:20. Se desocupa el alojamiento en Cusco y se prepara equipaje para la noche en Aguas Calientes. Visitamos el mercado artesanal y el complejo arqueológico de Pisac, Urubamba y Ollantaytambo. Tren de referencia a las 16:30, con llegada estimada a Machu Picchu Pueblo a las 18:10. Noche en Hotel Luz Garden. Los horarios dependerán del tren confirmado." },
    { title: "Machu Picchu y retorno a Cusco", hours: "06:30–07:00 · Jornada aproximada: 14 horas", image: "./assets/img/tours/machu-picchu-full-day/cover.jpg", description: "Encuentro en la Plaza de Armas de Aguas Calientes entre las 06:30 y las 07:00. Visita guiada a Machu Picchu alrededor de las 08:00, según circuito y entrada disponibles. Descenso en bus al pueblo hacia las 13:00. Tren de retorno de referencia a las 14:30; recojo en Ollantaytambo hacia las 16:00 y llegada prevista a Cusco a las 18:30. Noche en Cusco. Todos los horarios de tren y visita pueden variar." },
    { title: "Despedida y traslado al aeropuerto o terminal", hours: "Según horario de salida", image: "./assets/img/packages/cusco/5d4n/cover.jpg", description: "Traslado al aeropuerto unas 2 horas antes del vuelo o al terminal terrestre 1 hora antes de la salida del bus. Si el horario permite, se puede agregar un paseo de 2 horas en bus panorámico por lugares emblemáticos de Cusco, por S/ 30 adicionales por persona." }
  ];
  const INCLUDED = [
    "Recojo de llegada en aeropuerto o terminal terrestre y traslado al hotel.",
    "Traslado de salida del hotel al aeropuerto o terminal terrestre.",
    "Cuatro noches de alojamiento: 3 en Hotel Cusco Boutique (o Royal Qosqo, con recargo) y 1 en Hotel Luz Garden, Aguas Calientes.",
    "Desayuno correspondiente a las cuatro noches de alojamiento.",
    "City Tour de Cusco, Maras y Moray, Valle Sagrado y excursión guiada a Machu Picchu.",
    "Recojos desde el hotel donde corresponda según el itinerario.",
    "Guía profesional en español o inglés.",
    "Boleto turístico general para las visitas que correspondan.",
    "Entrada oficial a Machu Picchu y bus de subida y bajada según el programa.",
    "Tren turístico de ida a Aguas Calientes y de retorno a Ollantaytambo según horarios confirmados.",
    "Asistencia durante toda la experiencia y traslados turísticos indicados."
  ];
  const EXCLUDED = [
    "Pasajes aéreos nacionales o internacionales.",
    "Entrada al Templo Qoricancha.",
    "Almuerzos, cenas, bebidas y gastos personales no señalados.",
    "Tour opcional en bus panorámico del día 5 (S/ 30 por persona, seleccionable como extra).",
    "Cualquier otro ingreso o servicio no expresamente indicado como incluido."
  ];
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = (value) => "S/ " + Number(value).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2});
  const state = { date:"", adults:2, children:0, hotel:"cusco-boutique-3s", rooms:[], extra:"", submitting:false, review:false };
  function travelers() { return state.adults + state.children; }
  function combinations(n) {
    const result=[];
    for(let t=0;t<=Math.floor(n/3);t++) { const remain=n-3*t; if(remain>=0 && remain%2===0) result.push({doubles:remain/2,triples:t}); }
    return result.sort((a,b)=>(a.doubles+a.triples)-(b.doubles+b.triples) || b.triples-a.triples);
  }
  function roomLabel(c) {
    const pieces=[];
    if(c.doubles) pieces.push(c.doubles+" habitación"+(c.doubles>1?"es":"")+" doble"+(c.doubles>1?"s":""));
    if(c.triples) pieces.push(c.triples+" habitación"+(c.triples>1?"es":"")+" triple"+(c.triples>1?"s":""));
    return pieces.join(" + ");
  }
  function ensureRooms() {
    const choices=combinations(travelers());
    if(!choices.length){state.rooms=[];return;}
    if(!choices.some(c=>c.doubles===state.rooms.doubles && c.triples===state.rooms.triples)) state.rooms=choices[0];
  }
  function summary() {
    const count=travelers(), base=count*PRICE, hotel= HOTELS[state.hotel].fee*count, extra=EXTRAS[state.extra].price*count;
    return { base,hotel,extra,total:Math.round((base+hotel+extra)*100)/100 };
  }
  function renderGallery() {
    const images = [
      "./assets/img/packages/cusco/5d4n/cover.jpg",
      "./assets/img/tours/maras-moray/cover.jpg",
      "./assets/img/tours/valle-sagrado/cover.jpg",
      "./assets/img/tours/machu-picchu-full-day/cover.jpg"
    ];
    $("productGallery").innerHTML =
      '<div class="experience-gallery__main"><img src="'+esc(images[0])+'" alt="Cusco y Machu Picchu en 5 días" loading="eager"></div>'+
      '<div class="experience-gallery__side experience-gallery__slider" data-single-gallery>'+
      images.slice(1).map((src,i)=>'<img class="experience-gallery__slide '+(!i?'is-active':'')+'" src="'+esc(src)+'" alt="Galería del paquete '+(i+2)+'" loading="lazy">').join("")+'</div>'+
      '<div class="experience-gallery__mobile-slider experience-gallery__slider" data-single-gallery>'+
      images.map((src,i)=>'<img class="experience-gallery__slide '+(!i?'is-active':'')+'" src="'+esc(src)+'" alt="Cusco 5 días, imagen '+(i+1)+'" loading="lazy">').join("")+'</div>';
    document.querySelectorAll("[data-single-gallery]").forEach(function(slider){
      const slides=[...slider.querySelectorAll("img")]; let current=0;
      if(slides.length>1) window.setInterval(function(){slides[current].classList.remove("is-active");current=(current+1)%slides.length;slides[current].classList.add("is-active");},4500);
    });
  }
  function renderContent() {
    document.title="Cusco 5 días y 4 noches | My Cusco Trip";
    $("productBadge").textContent="Programa único · Hotel incluido";
    $("productTitle").textContent="Cusco, Valle Sagrado y Machu Picchu · 5 días / 4 noches";
    $("productDescription").textContent="Descubre Cusco en cinco días con City Tour, Maras y Moray, Valle Sagrado y Machu Picchu. Incluye cuatro noches de hotel, desayunos y coordinación local. Un solo itinerario y un precio por persona en soles.";
    $("detailCapacity").textContent="Mínimo 2 viajeros · Máximo 9 por reserva";
    $("detailDuration").textContent="5 días / 4 noches";
    $("detailLanguages").textContent="Guía profesional en español e inglés";
    $("detailLocation").textContent="Cusco · Maras y Moray · Valle Sagrado · Machu Picchu";
    $("productHighlights").innerHTML = [
      "Un itinerario fijo de cinco días sin variantes ni rutas alternativas.",
      "3 noches en Cusco y 1 noche en Hotel Luz Garden de Aguas Calientes.",
      "Entrada y visita guiada a Machu Picchu, trenes y traslados según programa.",
      "Hotel Cusco Boutique incluido; Royal Qosqo con mejora opcional."
    ].map(x=>"<li>"+esc(x)+"</li>").join("");
    $("productIncludes").innerHTML=INCLUDED.map(x=>"<li>"+esc(x)+"</li>").join("");
    $("productExcludes").innerHTML=EXCLUDED.map(x=>"<li>"+esc(x)+"</li>").join("");
    $("productItinerary").innerHTML=DAYS.map((d,i)=>
      '<div class="experience-itinerary-item experience-itinerary-item--visual" data-itinerary-day="'+(i+1)+'"><div class="experience-itinerary-item__content">'+
      '<div class="experience-itinerary-day-meta"><span class="experience-itinerary-day-pill">Día '+(i+1)+'</span><span class="experience-itinerary-date-pill" data-day-date="'+i+'" hidden></span></div>'+
      '<h3 class="experience-itinerary-day-title">'+esc(d.title)+'</h3><p class="mct-single-day-hours">'+esc(d.hours)+'</p><p>'+esc(d.description)+'</p></div>'+
      '<div class="experience-itinerary-item__media"><img src="'+esc(d.image)+'" alt="'+esc(d.title)+'" loading="lazy"></div></div>'
    ).join("");
    $("productFaq").innerHTML=[
      ["¿Cuántos viajeros pueden reservar?","El programa se ofrece a partir de 2 personas. El selector permite combinar adultos y niños hasta 9 personas."],
      ["¿Cómo funciona la elección del hotel?","Hotel Cusco Boutique está incluido por las tres noches en Cusco. Puedes cambiarlo a Hotel Royal Qosqo con un adicional de US$ 10 por persona y por noche (3 noches), convertido a soles. La noche en Hotel Luz Garden está siempre incluida."],
      ["¿Las horas del tren y el acceso a Machu Picchu son definitivos?","No. El horario de tren, el circuito y la hora de ingreso se confirman según disponibilidad para la fecha elegida."],
      ["¿Qué pasa con los niños?","Hasta que se publique una tarifa infantil diferenciada, el importe por niño es igual a la tarifa general indicada."],
      ["¿Cómo pago?","La página registra una pre-reserva y redirige a Mercado Pago para pagar en soles, siempre que el backend esté actualizado y confirme el importe."],
      ["¿Se incluye la entrada al Qoricancha?","No, la entrada al Templo Qoricancha se abona por separado."]
    ].map(x=>'<details class="mct-single-faq"><summary>'+esc(x[0])+'</summary><p>'+esc(x[1])+'</p></details>').join("");
    renderGallery();
    document.querySelectorAll('a[href="#similar-mobile"]').forEach(x=>x.hidden=true);
    $("similar-mobile").hidden=true;$("similar-desktop").hidden=true;
    $("packageOptions").hidden=true;
    document.querySelector(".booking-panel__price > span").textContent="Precio único";
    $("productBasePrice").textContent=money(PRICE);
    document.querySelector(".booking-panel__price > small").textContent="por persona · hoteles incluidos";
    const benefits=document.querySelector(".experience-benefits");
    if(benefits) benefits.innerHTML=
      '<div class="benefit-item"><i class="fas fa-hotel"></i><div><strong>Hoteles incluidos</strong><p>3 noches en Cusco y 1 noche en Aguas Calientes, con desayuno.</p></div></div>'+
      '<div class="benefit-item"><i class="fas fa-calendar-check"></i><div><strong>Disponibilidad a confirmar</strong><p>Horarios de tren y circuito oficial de Machu Picchu sujetos a confirmación.</p></div></div>'+
      '<div class="benefit-item"><i class="fas fa-headset"></i><div><strong>Asistencia local</strong><p>Coordinación de traslados, excursiones y servicios en español o inglés.</p></div></div>';
    document.querySelector(".booking-benefits-box").innerHTML='<div class="booking-benefit-line"><i class="fas fa-shield-heart"></i><p><strong>Reserva segura</strong> · Se verificará la disponibilidad de entradas, trenes y hotel. Pago completo por Mercado Pago.</p></div>';
    document.querySelector(".booking-discount-box").hidden=true;
    $("paymentMode").innerHTML='<option value="full">Pago completo · Mercado Pago</option>';
    $("departureTimeSection").hidden=true;$("trainSelectionSection").hidden=true;$("serviceModeSection").hidden=true;
    $("packageAccommodationSection").hidden=false;$("extrasSection").hidden=false;
    $("hotelSelectorsContainer").innerHTML=
      '<label class="mct-single-label">Alojamiento incluido</label><div class="mct-single-hotel-summary" id="hotelSummary"></div>'+
      '<button type="button" class="btn booking-secondary-btn mct-single-edit-hotel" id="chooseHotelBtn">Elegir hotel y habitaciones</button>'+
      '<p class="booking-field-help">Siempre incluye 1 noche en Hotel Luz Garden (Aguas Calientes). Las otras 3 noches son en Cusco.</p>';
    $("extrasContainer").innerHTML='<select id="singleExtraSelect" aria-label="Servicios extra"><option value="">Sin servicios extra</option><option value="panoramico">Bus panorámico, día 5 (+S/ 30.00 por persona)</option></select>';
    const totals=document.querySelector(".booking-summary");
    totals.innerHTML=
      '<div class="booking-summary__line"><span>Viajeros</span><strong id="adultChildTotal">—</strong></div>'+
      '<div class="booking-summary__line"><span>Mejora de hotel</span><strong id="hotelTotal">—</strong></div>'+
      '<div class="booking-summary__line"><span>Servicios extra</span><strong id="singleExtraTotal">—</strong></div>'+
      '<div class="booking-summary__total mct-single-total"><span>Total a pagar</span><strong id="singleTotal">—</strong></div>';
    $("paymentInfo").textContent="Importe final en soles. Los servicios se confirman de acuerdo con disponibilidad.";
    $("paypalButton").textContent="Reservar y pagar con Mercado Pago";
    const infoText = document.querySelector('[data-i18n="product.pickupMeetingText"]');
    if(infoText) infoText.textContent="Llegada: recojo en aeropuerto o terminal según horario. Tours de días 2 y 3: recojo desde el hotel. Día 1: encuentro a las 13:30 en la Plaza de Armas.";
    const important = document.querySelector('[data-i18n="product.importantInfoText"]');
    if(important) important.textContent="El horario y circuito de Machu Picchu dependerán de las entradas oficiales y trenes disponibles. Se recomienda aclimatarse a la altitud y reservar con anticipación.";
    $("printProductItineraryBtn").addEventListener("click",()=>window.print());
    document.querySelectorAll(".experience-action-btn").forEach(btn=>{
      if(btn.id!=="printProductItineraryBtn")btn.addEventListener("click",async()=>{if(navigator.share) await navigator.share({title:document.title,url:location.href}).catch(()=>{});else if(navigator.clipboard)await navigator.clipboard.writeText(location.href);});
    });
  }
  function updateDates() {
    document.querySelectorAll("[data-day-date]").forEach(el=>{
      if(!state.date){el.hidden=true;return;}
      const date=new Date(state.date+"T12:00:00");date.setDate(date.getDate()+Number(el.dataset.dayDate));
      el.textContent=date.toLocaleDateString("es-PE",{day:"numeric",month:"long",year:"numeric"});el.hidden=false;
    });
  }
  function renderPrice() {
    ensureRooms();
    const s=summary();
    $("adultsCount").textContent=state.adults;$("childrenCount").textContent=state.children;
    $("adultChildTotal").textContent=money(s.base);
    $("hotelTotal").textContent=money(s.hotel);
    $("singleExtraTotal").textContent=money(s.extra);
    $("singleTotal").textContent=money(s.total);
    $("hotelSummary").innerHTML='<strong>'+esc(HOTELS[state.hotel].title)+' · 3 noches</strong><span>'+esc(roomLabel(state.rooms))+'</span><small>+ Hotel Luz Garden · 1 noche incluido</small>'+
      (state.hotel==="royal-qosqo-3s"?'<small class="mct-single-surcharge">+ US$ 10 × 3 noches × '+travelers()+' viajeros · '+money(s.hotel)+'</small>':'<small class="mct-single-included">Sin costo adicional</small>');
    const btn=$("paypalButton");btn.disabled=travelers()<2 || travelers()>9 || !state.date;
    btn.title=!state.date?"Selecciona primero la fecha de viaje":(travelers()<2?"Mínimo 2 viajeros":"");
  }
  function renderHotelsModal() {
    ensureRooms();
    $("hotelModalTitle").textContent="Elige tu hotel y habitaciones";
    $("hotelModalSubtitle").textContent="Las 3 noches en Cusco incluyen alojamiento y desayuno. La noche en Luz Garden no cambia. Ocupación para "+travelers()+" viajero(s).";
    $("hotelModalList").innerHTML=Object.entries(HOTELS).map(([code,h])=>
      '<label class="mct-single-hotel-card '+(state.hotel===code?'is-selected':'')+'"><input type="radio" name="mctHotel" value="'+esc(code)+'" '+(state.hotel===code?'checked':'')+'>'+
      '<img src="'+esc(h.cover)+'" loading="lazy" alt="'+esc(h.title)+'">'+
      '<span><strong>'+esc(h.title)+'</strong><small>3 noches en Cusco · Desayuno incluido</small><em>'+(h.fee?'+ US$ 10 por persona / noche · '+money(h.fee)+' por persona (3 noches)':'Incluido · S/ 0.00 adicional')+'</em></span></label>'
    ).join("")+
    '<div class="mct-single-room-picker"><label for="mctRoomOption">Distribución de habitaciones</label><select id="mctRoomOption">'+combinations(travelers()).map((c,i)=>
      '<option value="'+i+'" '+(c.doubles===state.rooms.doubles&&c.triples===state.rooms.triples?'selected':'')+'>'+esc(roomLabel(c))+'</option>').join("")+
      '</select><p>Las habitaciones se asignarán según la capacidad elegida y disponibilidad.</p></div>'+
      '<div class="mct-single-fixed-hotel"><img src="./assets/img/hotels/luz-garden/cover.jpg" loading="lazy" alt="Hotel Luz Garden"><span><strong>Hotel Luz Garden</strong><small>Aguas Calientes · 1 noche con desayuno · Incluido</small></span></div>';
    document.querySelectorAll('input[name="mctHotel"]').forEach(x=>x.addEventListener("change",()=>{
      state.hotel=x.value;renderHotelsModal();renderPrice();
    }));
    $("mctRoomOption").addEventListener("change",()=>{
      state.rooms=combinations(travelers())[Number($("mctRoomOption").value)];renderPrice();
    });
  }
  function closeModal(id) {$(id).hidden=true;document.body.classList.remove("mct-single-modal-open");}
  function openHotel() {renderHotelsModal();$("hotelSelectionModal").hidden=false;document.body.classList.add("mct-single-modal-open");}
  function renderExtraPassengers() {
    const holderTravels=$("holderTravelsCheckbox").checked;
    const count=travelers()-(holderTravels?1:0);
    $("additionalPassengersContainer").innerHTML=Array.from({length:count},(_,i)=>{
      const n=i+(holderTravels?2:1);
      return '<fieldset class="mct-single-passenger"><legend>Pasajero '+n+'</legend>'+
        '<label>Nombre <input name="passenger_'+n+'_firstName" type="text" placeholder="Opcional por ahora"></label>'+
        '<label>Apellidos <input name="passenger_'+n+'_lastName" type="text" placeholder="Opcional por ahora"></label>'+
        '<label>Documento <input name="passenger_'+n+'_documentNumber" type="text" placeholder="Opcional por ahora"></label>'+
        '<span>Podrás completar los datos de este pasajero con nuestro equipo antes de emitir tickets.</span></fieldset>';
    }).join("");
  }
  function reservationCode() {
    const random=new Uint32Array(1); if(window.crypto && crypto.getRandomValues) crypto.getRandomValues(random);else random[0]=Math.floor(Math.random()*999999999);
    return "CUZ"+String(random[0]%100000000).padStart(8,"0");
  }
  function openPassenger() {
    if(!state.date || travelers()<2 || travelers()>9) {alert("Selecciona fecha y mínimo 2 viajeros (máximo 9).");return;}
    $("passengerReservationCode").textContent=reservationCode();
    $("passengerPayNowAmount").textContent=money(summary().total);
    $("passengerPaymentSnapshot").innerHTML='<p><strong>'+esc(state.date)+'</strong> · '+travelers()+' pasajeros · '+esc(HOTELS[state.hotel].title)+' · '+esc(roomLabel(state.rooms))+'<p><strong>'+money(summary().total)+'</strong></p>';
    $("passengerCheckoutReview").hidden=true;$("passengerCheckoutReview").innerHTML="";
    $("passengerReservationForm").dataset.review="";
    $("passengerReservationForm").querySelector('[type="submit"]').textContent="Continuar";
    $("passengerReservationForm").reset();$("holderTravelsCheckbox").checked=true;
    renderExtraPassengers();
    $("passengerReservationModal").hidden=false;
    document.body.classList.add("mct-single-modal-open");
  }
  function formPayload() {
    const fd=new FormData($("passengerReservationForm")), count=travelers(), isPassenger=$("holderTravelsCheckbox").checked;
    const holder={firstName:String(fd.get("holderFirstName")||"").trim(),lastName:String(fd.get("holderLastName")||"").trim(),documentType:String(fd.get("holderDocumentType")||""),documentNumber:String(fd.get("holderDocumentNumber")||"").trim(),nationality:String(fd.get("holderNationality")||""),birthdate:String(fd.get("holderBirthdate")||""),whatsappCountryCode:String(fd.get("holderWhatsappCountryCode")||"+51"),whatsapp:String(fd.get("holderWhatsapp")||"").trim(),email:String(fd.get("holderEmail")||"").trim(),language:String(fd.get("holderLanguage")||"Español"),travels:isPassenger};
    const passengers=[];
    if(isPassenger) passengers.push({passengerNumber:1,role:"holder_passenger",completionStatus:"complete",...holder});
    const start=isPassenger?2:1;
    for(let i=start;i<=count;i++){const firstName=String(fd.get("passenger_"+i+"_firstName")||"").trim(),lastName=String(fd.get("passenger_"+i+"_lastName")||"").trim(),documentNumber=String(fd.get("passenger_"+i+"_documentNumber")||"").trim();passengers.push({passengerNumber:i,role:"traveler",completionStatus:(firstName&&lastName&&documentNumber)?"provided":"pending",firstName,lastName,documentNumber,completeLater:!(firstName&&lastName&&documentNumber)});}
    const price=summary();const code=$("passengerReservationCode").textContent;
    return {code,reservationCode:code,source:"cusco-5d4n-unico",productId:PRODUCT_ID,productSlug:"cusco-5-dias-4-noches-unico",productTitle:"Cusco, Valle Sagrado y Machu Picchu · 5 días / 4 noches",date:state.date,adults:state.adults,children:state.children,infants:0,totalPassengers:count,selectedHotel:state.hotel,roomAllocation:{doubles:state.rooms.doubles,triples:state.rooms.triples},extraCode:state.extra,currency:"PEN",paymentMode:"full",paymentProvider:"mercado_pago",accommodationIncluded:true,availabilityConfirmed:false,serviceTotalValue:price.total,payNowValue:price.total,payLaterValue:0,holderIsPassenger:isPassenger,holder,passengers,pricing:{subtotal:price.total,total:price.total,discount:0},checkoutPayload:{reservationCode:code,currency:"PEN",amountToPayNowValue:price.total,productId:PRODUCT_ID,provider:"mercado_pago"}};
  }
  async function submitReservation(ev) {
    ev.preventDefault();
    const form=$("passengerReservationForm"),message=document.querySelector("[data-passenger-message]"),submit=form.querySelector('[type="submit"]');
    if(!form.reportValidity())return;
    if(state.submitting)return;
    if(form.dataset.review!=="done"){
      const p=formPayload();
      $("passengerCheckoutReview").hidden=false;
      $("passengerCheckoutReview").innerHTML='<strong>Revisa tu reserva antes del pago</strong><p>'+esc(p.date)+' · '+travelers()+' viajeros · '+esc(HOTELS[state.hotel].title)+' · '+esc(roomLabel(state.rooms))+'</p><p>Total a pagar: <strong>'+money(p.payNowValue)+'</strong></p><p>La disponibilidad de trenes, entradas y habitaciones será verificada por el equipo.</p>';
      form.dataset.review="done";submit.textContent="Confirmar y pagar en Mercado Pago";message.textContent="";return;
    }
    state.submitting=true;submit.disabled=true;submit.textContent="Conectando con Mercado Pago…";message.textContent="";
    try {
      const api=window.MyCuscoTripApiClient;
      if(!api)throw Error("No se cargó el servicio de reservas.");
      const payload=formPayload();
      const created=await api.createPreReservation(payload);
      if(!created || created.mock || created.ok===false)throw Error(created&&created.error || "No se pudo crear la pre-reserva en el servidor.");
      const code=created.reservationCode||created.code||payload.code;
      const pay=await api.createMercadoPagoPreference({reservationCode:code,code,currency:"PEN",amountToPayNowValue:payload.payNowValue,productId:PRODUCT_ID,productTitle:payload.productTitle});
      if(!pay || pay.ok===false || !pay.approvalUrl)throw Error(pay&&pay.error || "Mercado Pago no devolvió un enlace de pago.");
      const url=new URL(pay.approvalUrl);
      if(url.protocol!=="https:" || !/(^|\.)mercadopago\.(com|com\.[a-z]{2}|[a-z]{2})$/i.test(url.hostname))throw Error("El enlace de pago no es válido.");
      window.location.assign(url.href);
    }catch(error){console.error("Error al reservar:",error);message.textContent=error.message||"No se pudo iniciar el pago.";message.classList.add("is-error");submit.disabled=false;submit.textContent="Reintentar pago";}finally{state.submitting=false;}
  }
  function setup() {
    renderContent();
    ensureRooms();renderPrice();
    if(window.flatpickr)flatpickr($("travelDate"),{locale:flatpickr.l10ns.es,minDate:"today",dateFormat:"Y-m-d",altInput:true,altFormat:"d M Y",onChange:function(_,date){state.date=date;updateDates();renderPrice();}});
    document.querySelectorAll(".qty-btn").forEach(btn=>btn.addEventListener("click",()=>{
      const target=btn.dataset.target,delta=btn.dataset.action==="plus"?1:-1;
      if(target==="adults")state.adults=Math.max(1,Math.min(9,state.adults+delta));
      else state.children=Math.max(0,Math.min(9,state.children+delta));
      if(travelers()>9){if(target==="adults")state.adults-=1;else state.children-=1;}
      ensureRooms();renderPrice();
    }));
    $("singleExtraSelect").addEventListener("change",e=>{state.extra=e.target.value;renderPrice();});
    $("chooseHotelBtn").addEventListener("click",openHotel);
    ["closeHotelModalBtn","cancelHotelModalBtn"].forEach(id=>$(id).addEventListener("click",()=>closeModal("hotelSelectionModal")));
    document.querySelector("[data-close-hotel-modal]").addEventListener("click",()=>closeModal("hotelSelectionModal"));
    $("cancelHotelModalBtn").textContent="Guardar selección";
    $("paypalButton").addEventListener("click",openPassenger);
    $("holderTravelsCheckbox").addEventListener("change",renderExtraPassengers);
    ["closePassengerModalBtn"].forEach(id=>$(id).addEventListener("click",()=>closeModal("passengerReservationModal")));
    document.querySelectorAll("[data-close-passenger-modal]").forEach(el=>el.addEventListener("click",()=>closeModal("passengerReservationModal")));
    $("passengerReservationCodeCopy").addEventListener("click",()=>navigator.clipboard?.writeText($("passengerReservationCode").textContent));
    $("passengerDetailsToggle").addEventListener("click",()=>{
      const snap=$("passengerPaymentSnapshot");snap.hidden=!snap.hidden;
    });
    $("passengerPaymentSnapshot").hidden=true;
    $("passengerReservationForm").addEventListener("submit",submitReservation);
    const countries=[["PE","Perú","+51"],["CO","Colombia","+57"],["CL","Chile","+56"],["VE","Venezuela","+58"],["MX","México","+52"],["AR","Argentina","+54"],["BO","Bolivia","+591"],["EC","Ecuador","+593"],["BR","Brasil","+55"],["US","Estados Unidos","+1"],["ES","España","+34"],["OT","Otro país","+51"]];
    const national=document.querySelector('[name="holderNationality"]');countries.forEach(c=>national.add(new Option(c[1],c[0])));national.value="PE";
    const phone=document.querySelector('[name="holderWhatsappCountryCode"]');countries.forEach(c=>phone.add(new Option(c[1]+" ("+c[2]+")",c[2])));phone.value="+51";
    document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal("hotelSelectionModal");closeModal("passengerReservationModal");}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();