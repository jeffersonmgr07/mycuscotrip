"use strict";
(function () {
  const key=document.body.dataset.cuscoVariant;
  const OFFER=window.MCT_FIXED_CUSCO_VARIANTS?.[key];
  if(!OFFER)throw Error("Paquete no encontrado");
  const PRODUCT_ID=OFFER.id;
  let PRICE=OFFER.price, CHILD_PRICE=null, BOOKABLE=false;
  const DAYS=OFFER.days, INCLUDED=OFFER.includes, EXCLUDED=OFFER.excludes;
  const HOTELS={"cusco-boutique-3s":{title:"Hotel Cusco Boutique",fee:0}};
  const EXTRAS={"":{title:"Sin servicios extra",price:0}};
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
    const count=travelers(), base=Number.isFinite(PRICE)&&(!state.children||Number.isFinite(CHILD_PRICE))?state.adults*PRICE+state.children*(CHILD_PRICE||0):NaN, hotel=0, extra=0;
    return { base,hotel,extra,total:Math.round((base+hotel+extra)*100)/100 };
  }
  function renderGallery() {
    const images=[...new Set([OFFER.cover,...DAYS.map(d=>d.image)])];
    $("productGallery").innerHTML =
      '<div class="experience-gallery__main"><img src="'+esc(images[0])+'" alt="Cusco y Machu Picchu" loading="eager"></div>'+
      '<div class="experience-gallery__side experience-gallery__slider" data-single-gallery>'+
      images.slice(1).map((src,i)=>'<img class="experience-gallery__slide '+(!i?'is-active':'')+'" src="'+esc(src)+'" alt="Galería del paquete '+(i+2)+'" loading="lazy">').join("")+'</div>'+
      '<div class="experience-gallery__mobile-slider experience-gallery__slider" data-single-gallery>'+
      images.map((src,i)=>'<img class="experience-gallery__slide '+(!i?'is-active':'')+'" src="'+esc(src)+'" alt="Cusco, imagen '+(i+1)+'" loading="lazy">').join("")+'</div>';
    document.querySelectorAll("[data-single-gallery]").forEach(function(slider){
      const slides=[...slider.querySelectorAll("img")]; let current=0;
      if(slides.length>1) window.setInterval(function(){slides[current].classList.remove("is-active");current=(current+1)%slides.length;slides[current].classList.add("is-active");},4500);
    });
  }
  function renderContent() {
    document.title=OFFER.title+" "+OFFER.n+" días / "+(OFFER.n-1)+" noches | My Cusco Trip";
    $("productBadge").textContent="Paquete organizado de "+OFFER.n+" días y "+(OFFER.n-1)+" noches";
    $("productTitle").textContent=OFFER.title;
    $("productDescription").textContent="Descubre Cusco en "+OFFER.n+" días con "+OFFER.activities+". El programa contempla "+(OFFER.n-1)+" noches de alojamiento, desayuno y asistencia durante tu viaje.";
    $("detailCapacity").textContent="Mínimo 2 viajeros · Máximo 9 por reserva";
    $("detailDuration").textContent=OFFER.n+" días / "+(OFFER.n-1)+" noches";
    $("detailLanguages").textContent="Guía profesional en español e inglés";
    $("detailLocation").textContent=OFFER.loc;
    $("productHighlights").innerHTML=[OFFER.activities+".",OFFER.nightsLabel+".","Visita guiada a Machu Picchu y coordinación local durante el viaje."].map(x=>"<li>"+esc(x)+"</li>").join("");
    $("productIncludes").innerHTML=INCLUDED.map(x=>"<li>"+esc(x)+"</li>").join("");
    $("productExcludes").innerHTML=EXCLUDED.map(x=>"<li>"+esc(x)+"</li>").join("");
    $("productItinerary").innerHTML=DAYS.map((d,i)=>
      '<div class="experience-itinerary-item experience-itinerary-item--visual" data-itinerary-day="'+(i+1)+'"><div class="experience-itinerary-item__content">'+
      '<div class="experience-itinerary-day-meta"><span class="experience-itinerary-day-pill">Día '+(i+1)+'</span><span class="experience-itinerary-date-pill" data-day-date="'+i+'" hidden></span></div>'+
      '<h3 class="experience-itinerary-day-title">'+esc(d.title)+'</h3><p class="mct-single-day-hours">'+esc(d.hours)+'</p><p>'+esc(d.description)+'</p></div>'+
      '<div class="experience-itinerary-item__media"><img src="'+esc(d.image)+'" alt="'+esc(d.title)+'" loading="lazy"></div></div>'
    ).join("");
    $("productFaq").innerHTML=[
      ["¿Cuántos viajeros pueden reservar?","Desde 2 viajeros por reserva, con alojamiento en ocupación compartida."],
      ["¿Qué alojamiento contempla el paquete?",OFFER.nightsLabel+". Sujeto a disponibilidad."],
      ["¿Se incluye la entrada a Machu Picchu?","No. Los boletos de ingreso no están incluidos en este programa de referencia."],
      ["¿Qué ocurre con los horarios del tren?","Los horarios del itinerario son referenciales y se coordinan según disponibilidad."],
      ["¿Qué pasa con los niños?","Consulta las condiciones y tarifa infantil antes de reservar."],
      ["¿Cómo pago?","La tarifa se presenta en soles. Antes de pagar podrás revisar el equivalente en dólares y completar el pago seguro con PayPal."]
    ].map(x=>'<details class="mct-single-faq"><summary>'+esc(x[0])+'</summary><p>'+esc(x[1])+'</p></details>').join("");
    renderGallery();
    document.querySelectorAll('a[href="#similar-mobile"]').forEach(x=>x.hidden=true);
    $("similar-mobile").hidden=true;$("similar-desktop").hidden=true;
    $("packageOptions").hidden=true;
    document.querySelector(".booking-panel__price > span").textContent="Precio único";
    $("productBasePrice").textContent=Number.isFinite(PRICE)?money(PRICE):"Por confirmar";
    document.querySelector(".booking-panel__price > small").textContent="por persona";
    const benefits=document.querySelector(".experience-benefits");
    if(benefits) benefits.innerHTML=
      '<div class="benefit-item"><i class="fas fa-hotel"></i><div><strong>Hoteles incluidos</strong><p>'+esc(OFFER.nightsLabel)+', con desayuno.</p></div></div>'+
      '<div class="benefit-item"><i class="fas fa-calendar-check"></i><div><strong>Disponibilidad a confirmar</strong><p>Horarios de tren y circuito oficial de Machu Picchu sujetos a confirmación.</p></div></div>'+
      '<div class="benefit-item"><i class="fas fa-headset"></i><div><strong>Asistencia local</strong><p>Coordinación de traslados, excursiones y servicios en español o inglés.</p></div></div>';
    document.querySelector(".booking-benefits-box").innerHTML='<div class="booking-benefit-line"><i class="fas fa-shield-heart"></i><p><strong>Reserva segura</strong> · Se verificará la disponibilidad de entradas, trenes y hotel. Pago seguro en línea.</p></div>';
    document.querySelector(".booking-discount-box").hidden=true;
    $("paymentMode").closest(".booking-field").hidden=true;
    $("departureTimeSection").hidden=true;$("trainSelectionSection").hidden=true;$("serviceModeSection").hidden=true;
    $("packageAccommodationSection").hidden=true;$("extrasSection").hidden=true;
    $("hotelSelectorsContainer").innerHTML='<div id="hotelSummary"></div><button type="button" id="chooseHotelBtn" hidden>Hotel</button>';
    $("extrasContainer").innerHTML='<select id="singleExtraSelect" hidden><option value="">Sin extras</option></select>';
    const totals=document.querySelector(".booking-summary");
    totals.innerHTML='<div class="booking-summary__line"><span id="adultLabel">Adultos</span><strong id="adultsTotal">—</strong></div><div class="booking-summary__line" id="childLine"><span id="childLabel">Niños</span><strong id="childrenTotal">—</strong></div><div class="booking-summary__total mct-single-total"><span>Total a pagar</span><strong id="singleTotal">—</strong></div>';
    $("paymentInfo").hidden=true;
    $("paypalButton").textContent="Iniciar reserva";
    const infoText = document.querySelector('[data-i18n="product.pickupMeetingText"]');
    if(infoText) infoText.textContent="Llegada: recojo en aeropuerto o terminal según horario. Recojos y puntos de encuentro conforme al itinerario. Día 1: encuentro a las 13:30 en la Plaza de Armas.";
    const important = document.querySelector('[data-i18n="product.importantInfoText"]');
    if(important) important.textContent="Programa dirigido a turistas peruanos. Consulta disponibilidad antes de reservar. Los horarios de tren y el circuito de Machu Picchu dependen de las entradas y servicios disponibles. Los trenes no están incluidos; puedes agregarlos al paquete. Consulta el bus de subida y bajada. Se recomienda aclimatarse a la altitud.";
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
    $("adultLabel").textContent="Adultos ("+state.adults+")";
    $("childLabel").textContent="Niños ("+state.children+")";
    $("adultsTotal").textContent=Number.isFinite(PRICE)?money(state.adults*PRICE):"Por confirmar";
    $("childrenTotal").textContent=Number.isFinite(CHILD_PRICE)?money(state.children*CHILD_PRICE):"Consultar";
    $("childLine").hidden=state.children===0;
    $("singleTotal").textContent=Number.isFinite(s.total)?money(s.total):"Por confirmar";
    $("productBasePrice").textContent=Number.isFinite(PRICE)?money(PRICE):"Por confirmar";
    const btn=$("paypalButton");btn.disabled=!Number.isFinite(s.total)||travelers()<2||travelers()>9||!state.date;
    const info=$("paymentInfo");
    info.hidden=BOOKABLE&&Number.isFinite(s.total);
    info.textContent=state.children&&!Number.isFinite(CHILD_PRICE)?"Consulta la tarifa para niños antes de reservar.":"La reserva en línea estará disponible cuando se confirme la tarifa.";
    window.MCTFixedTrains?.refresh();
  }
  function renderHotelsModal() {}
  async function loadOfferPrice(){
    try {
      const api=window.MyCuscoTripApiClient;
      if(!api)return;
      const data=await api.postAction("getFixedCuscoOffer",{productId:PRODUCT_ID,source:OFFER.source});
      if(data?.ok===true){
        if(data.adultPrice!==OFFER.price){BOOKABLE=false;renderPrice();return;}
        PRICE=OFFER.price;
        CHILD_PRICE=typeof data.childPrice==="number"&&data.childPrice>=0?data.childPrice:null;
        BOOKABLE=data.bookable===true&&Number.isFinite(PRICE);
        renderPrice();
      }
    }catch(err){console.warn("Tarifa no disponible",err);}
  }
  function closeModal(id) {closePicker();$(id).hidden=true;document.body.classList.remove("mct-single-modal-open");}
  function openHotel() {renderHotelsModal();$("hotelSelectionModal").hidden=false;document.body.classList.add("mct-single-modal-open");}
  // Custom controls keep the original form values for the reservation API.
  let activePicker=null, pickerSerial=0;
  const monthNames=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  function closePicker(restore=false){
    if(!activePicker)return;
    const {panel,trigger}=activePicker;
    activePicker=null;panel.remove();trigger.setAttribute("aria-expanded","false");
    if(restore&&trigger.isConnected)trigger.focus({preventScroll:true});
  }
  function positionPicker(){
    if(!activePicker)return;
    const {panel,trigger}=activePicker;
    const r=trigger.getBoundingClientRect(), gap=6, pad=10;
    if(r.bottom<0||r.top>window.innerHeight||!trigger.isConnected){closePicker();return;}
    const width=Math.min(window.innerWidth-2*pad,Math.max(r.width,panel.classList.contains("mct-birth-picker")?306:260));
    panel.style.width=width+"px";
    panel.style.left=Math.max(pad,Math.min(r.left,window.innerWidth-width-pad))+"px";
    const below=window.innerHeight-r.bottom-gap-pad,above=r.top-gap-pad;
    const useAbove=below<245&&above>below;
    panel.style.maxHeight=Math.max(100,useAbove?above:below)+"px";
    const height=panel.getBoundingClientRect().height;
    panel.style.top=Math.max(pad,useAbove?r.top-gap-height:r.bottom+gap)+"px";
  }
  function showPicker(trigger,kind){
    closePicker();
    const panel=document.createElement("div");
    panel.id="mct-picker-"+(++pickerSerial);
    panel.className="mct-picker "+kind;
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-label",trigger.getAttribute("aria-label")||"Seleccionar");
    document.body.appendChild(panel);
    trigger.setAttribute("aria-expanded","true");trigger.setAttribute("aria-controls",panel.id);
    activePicker={panel,trigger};
    return panel;
  }
  function buttonFor(el,kind,label){
    const trigger=document.createElement("button");
    trigger.type="button";trigger.className="mct-picker-trigger "+kind;
    trigger.setAttribute("aria-haspopup","dialog");trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-label",label);
    el.classList.add("mct-original-control");el.tabIndex=-1;el.setAttribute("aria-hidden","true");
    if(el.required){el.dataset.mctRequired="true";el.required=false;}
    el.after(trigger);
    return trigger;
  }
  function styleSelects(root=document){
    root.querySelectorAll("#passengerReservationForm select, select[data-mct-custom]").forEach(el=>{
      if(el.dataset.mctStyled)return;
      el.dataset.mctStyled="true";
      const phone=el.name==="holderWhatsappCountryCode", label=phone?"Código de país para WhatsApp":(el.closest("label")?.querySelector("span")?.textContent?.trim()||el.closest("label")?.childNodes[0]?.textContent?.trim()||"Seleccionar opción");
      const trigger=buttonFor(el,phone?"mct-phone-trigger":"mct-select-trigger",label);
      const full=o=>o?.dataset.fullLabel||o?.textContent||"";
      const refresh=()=>{const opt=el.options[el.selectedIndex];trigger.textContent=phone?(el.value||"+51"):(full(opt)||"Selecciona");trigger.classList.toggle("is-placeholder",!el.value);trigger.removeAttribute("aria-invalid");};
      el._mctRefresh=refresh;el._mctTrigger=trigger;refresh();
      el.addEventListener("change",refresh);
      trigger.addEventListener("click",()=>{
        if(activePicker?.trigger===trigger){closePicker(true);return;}
        const panel=showPicker(trigger,"mct-option-picker");
        const heading=document.createElement("div");heading.className="mct-picker-heading";heading.textContent=label;panel.append(heading);
        const options=Array.from(el.options).filter(o=>!o.disabled && o.value!=="");
        let search;
        if(options.length>10){search=document.createElement("input");search.type="search";search.className="mct-picker-search";search.placeholder=phone?"Buscar país o código":"Buscar país";search.setAttribute("aria-label",search.placeholder);panel.append(search);}
        const list=document.createElement("div");list.className="mct-picker-options";list.setAttribute("role","listbox");panel.append(list);
        const normalize=v=>String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
        function draw(){
          const q=normalize(search?.value||"");
          list.replaceChildren();
          options.filter(o=>normalize(full(o)).includes(q)).forEach(o=>{
            const item=document.createElement("button");item.type="button";item.className="mct-picker-option";item.setAttribute("role","option");item.setAttribute("aria-selected",String(o.index===el.selectedIndex));item.textContent=full(o);
            item.addEventListener("click",()=>{el.selectedIndex=o.index;el.dispatchEvent(new Event("change",{bubbles:true}));refresh();closePicker(true);});
            list.append(item);
          });
          if(!list.children.length){const empty=document.createElement("p");empty.className="mct-picker-empty";empty.textContent="Sin resultados";list.append(empty);}
        }
        draw();search?.addEventListener("input",()=>{draw();positionPicker();});
        panel.addEventListener("keydown",e=>{
          if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();const items=[...list.querySelectorAll("button")];const i=items.indexOf(document.activeElement);items[Math.max(0,Math.min(items.length-1,i+(e.key==="ArrowDown"?1:-1)))]?.focus();}
        });
        positionPicker();if(search&&!matchMedia("(pointer:coarse)").matches)search.focus({preventScroll:true});
        else if(!search)list.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});
      });
    });
  }
  function styleBirthdates(root=document) {
    root.querySelectorAll('input[data-birthdate],input[name="holderBirthdate"]').forEach(el=>{
      if(el.dataset.mctStyled)return;
      el.dataset.mctStyled="true";el.type="text";
      const trigger=buttonFor(el,"mct-date-trigger","Fecha de nacimiento");
      const refresh=()=>{trigger.textContent=/^\d{4}-\d{2}-\d{2}$/.test(el.value)?el.value.split("-").reverse().join("/"):"dd/mm/aaaa";trigger.classList.toggle("is-placeholder",!el.value);trigger.removeAttribute("aria-invalid");};
      el._mctRefresh=refresh;el._mctTrigger=trigger;refresh();
      trigger.addEventListener("click",()=>{
        if(activePicker?.trigger===trigger){closePicker(true);return;}
        const now=new Date(), current=el.value?new Date(el.value+"T12:00:00"):null;
        let year=current&&!isNaN(current)?current.getFullYear():now.getFullYear()-30;
        let month=current&&!isNaN(current)?current.getMonth():0;
        let view=el.value?"days":"years", decade=Math.floor(year/12)*12;
        const panel=showPicker(trigger,"mct-birth-picker");
        const make=(label,fn,cls="")=>{const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.addEventListener("click",fn);return b;};
        const maxYear=now.getFullYear(), minYear=maxYear-120;
        function draw(){
          panel.replaceChildren();
          const head=document.createElement("div");head.className="mct-picker-heading";head.textContent="Fecha de nacimiento";panel.append(head);
          const nav=document.createElement("div");nav.className="mct-date-nav";
          function move(delta){
            if(view==="years")decade=Math.max(minYear-11,Math.min(maxYear,decade+12*delta));
            else if(view==="months")year=Math.max(minYear,Math.min(maxYear,year+delta));
            else{const d=new Date(year,month+delta,1);if(d.getFullYear()>=minYear&&d<=now){year=d.getFullYear();month=d.getMonth();}}
            draw();
          }
          const prev=make("‹",()=>move(-1),"mct-date-arrow"), next=make("›",()=>move(1),"mct-date-arrow");prev.setAttribute("aria-label","Anterior");next.setAttribute("aria-label","Siguiente");
          const title=make(view==="years"?decade+" – "+(decade+11):view==="months"?String(year):monthNames[month]+" "+year,()=>{if(view==="days"){view="months";}else if(view==="months"){view="years";decade=Math.floor(year/12)*12;}draw();},"mct-date-title");
          nav.append(prev,title,next);panel.append(nav);
          const help=document.createElement("p");help.className="mct-date-hint";help.textContent=view==="years"?"Selecciona el año":view==="months"?"Selecciona el mes":"Selecciona el día";panel.append(help);
          const grid=document.createElement("div");grid.className="mct-date-grid "+(view==="days"?"mct-date-days":"mct-date-choices");
          if(view==="years"){
            for(let y=decade;y<decade+12;y++){const btn=make(String(y),()=>{year=y;view="months";draw();},y===year?"is-selected":"");btn.disabled=y<minYear||y>maxYear;grid.append(btn);}
          }else if(view==="months"){
            monthNames.forEach((m,i)=>{const btn=make(m.slice(0,3),()=>{month=i;view="days";draw();},i===month?"is-selected":"");btn.disabled=year===maxYear&&i>now.getMonth();grid.append(btn);});
          }else{
            ["Lu","Ma","Mi","Ju","Vi","Sá","Do"].forEach(d=>{const span=document.createElement("span");span.textContent=d;grid.append(span);});
            const offset=(new Date(year,month,1).getDay()+6)%7;
            for(let i=0;i<offset;i++)grid.append(document.createElement("span"));
            const count=new Date(year,month+1,0).getDate();
            for(let day=1;day<=count;day++){
              const iso=String(year)+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
              const btn=make(String(day),()=>{el.value=iso;el.dispatchEvent(new Event("change",{bubbles:true}));refresh();closePicker(true);},el.value===iso?"is-selected":"");
              btn.disabled=new Date(year,month,day)>now;grid.append(btn);
            }
          }
          panel.append(grid);
          if(view!=="years")panel.append(make("Cambiar año",()=>{view="years";decade=Math.floor(year/12)*12;draw();},"mct-date-back"));
          positionPicker();
        }
        draw();
      });
    });
  }
  function stylePassengerControls(){
    styleSelects($("passengerReservationForm"));styleBirthdates($("passengerReservationForm"));
    $("passengerReservationForm").querySelectorAll(".mct-original-control").forEach(el=>el._mctRefresh?.());
  }
  function renderExtraPassengers() {
    const holderTravels=$("holderTravelsCheckbox").checked;
    const count=travelers()-(holderTravels?1:0);
    const options=document.querySelector('[name="holderNationality"]').innerHTML;
    $("additionalPassengersContainer").innerHTML=Array.from({length:count},(_,i)=>{
      const n=i+(holderTravels?2:1), prefix="passenger_"+n+"_";
      return '<fieldset class="mct-single-passenger"><legend>Pasajero '+n+'</legend>'+
        '<label>Nombres <input required name="'+prefix+'firstName" type="text" autocomplete="off"></label>'+
        '<label>Apellidos <input required name="'+prefix+'lastName" type="text" autocomplete="off"></label>'+
        '<label>Tipo de documento <select required name="'+prefix+'documentType"><option value="">Selecciona</option><option value="passport">Pasaporte</option><option value="dni">DNI</option><option value="id_card">Documento de identidad</option><option value="other">Otro</option></select></label>'+
        '<label>Número de documento <input required name="'+prefix+'documentNumber" type="text" autocomplete="off"></label>'+
        '<label>Nacionalidad <select required name="'+prefix+'nationality">'+options+'</select></label>'+
        '<label>Fecha de nacimiento <input required data-birthdate name="'+prefix+'birthdate" placeholder="dd/mm/aaaa" type="text"></label></fieldset>';
    }).join("");
    // Initialize after the dialog becomes visible.
  }
  function reservationCode() {
    const random=new Uint32Array(1); if(window.crypto && crypto.getRandomValues) crypto.getRandomValues(random);else random[0]=Math.floor(Math.random()*999999999);
    return "CUZ"+String(random[0]%100000000).padStart(8,"0");
  }
  function openPassenger() {
    if(!Number.isFinite(summary().total))return;
    if(window.MCTFixedTrains&&!window.MCTFixedTrains.guard())return;
    if(!state.date || travelers()<2 || travelers()>9) {alert("Selecciona fecha y mínimo 2 viajeros (máximo 9).");return;}
    resetFxStep();
    $("passengerReservationCode").textContent=reservationCode();
    $("passengerPayNowAmount").textContent=money(summary().total);
    $("passengerPaymentSnapshot").innerHTML='<p><strong>'+esc(state.date)+'</strong> · '+travelers()+' pasajeros · '+esc(HOTELS[state.hotel].title)+' · '+esc(roomLabel(state.rooms))+'<p><strong>'+money(summary().total)+'</strong></p>';
    $("passengerCheckoutReview").hidden=true;$("passengerCheckoutReview").innerHTML="";
    $("passengerReservationForm").dataset.review="";
    $("passengerReservationForm").querySelector('[type="submit"]').textContent="Pagar";
    $("passengerReservationForm").reset();$("holderTravelsCheckbox").checked=true;
    renderExtraPassengers();
    $("passengerReservationModal").hidden=false;
    stylePassengerControls();
    document.body.classList.add("mct-single-modal-open");
  }
  function formPayload() {
    const fd=new FormData($("passengerReservationForm")), count=travelers(), isPassenger=$("holderTravelsCheckbox").checked;
    const holder={firstName:String(fd.get("holderFirstName")||"").trim(),lastName:String(fd.get("holderLastName")||"").trim(),documentType:String(fd.get("holderDocumentType")||""),documentNumber:String(fd.get("holderDocumentNumber")||"").trim(),nationality:String(fd.get("holderNationality")||""),birthdate:String(fd.get("holderBirthdate")||""),whatsappCountryCode:String(fd.get("holderWhatsappCountryCode")||"+51"),whatsapp:String(fd.get("holderWhatsapp")||"").trim(),email:String(fd.get("holderEmail")||"").trim(),language:String(fd.get("holderLanguage")||"Español"),travels:isPassenger};
    const passengers=[];
    if(isPassenger) passengers.push({passengerNumber:1,role:"holder_passenger",completionStatus:"complete",...holder});
    const start=isPassenger?2:1;
    for(let i=start;i<=count;i++){
      const read=k=>String(fd.get("passenger_"+i+"_"+k)||"").trim();
      passengers.push({passengerNumber:i,role:"traveler",completionStatus:"complete",firstName:read("firstName"),lastName:read("lastName"),documentType:read("documentType"),documentNumber:read("documentNumber"),nationality:read("nationality"),birthdate:read("birthdate")});
    }
    const price=summary();const code=$("passengerReservationCode").textContent;
    return {code,reservationCode:code,source:OFFER.source,productId:PRODUCT_ID,productSlug:OFFER.slug,productTitle:OFFER.title+" · "+OFFER.n+" días / "+(OFFER.n-1)+" noches",duration:OFFER.n+" días / "+(OFFER.n-1)+" noches",productIncludes:INCLUDED,productExcludes:EXCLUDED,date:state.date,adults:state.adults,children:state.children,infants:0,totalPassengers:count,selectedHotel:state.hotel,roomAllocation:{doubles:state.rooms.doubles,triples:state.rooms.triples},extraCode:state.extra,currency:"PEN",paymentMode:"full",paymentProvider:"paypal",accommodationIncluded:true,availabilityConfirmed:false,serviceTotalValue:price.total,payNowValue:price.total,payLaterValue:0,holderIsPassenger:isPassenger,holder,passengers,pricing:{subtotal:price.total,total:price.total,discount:0},checkoutPayload:{reservationCode:code,currency:"PEN",amountToPayNowValue:price.total,productId:PRODUCT_ID,provider:"paypal"}};
  }
  let fxQuote=null, fxPayload=null, savedReservation=null;
  function usd(value){return "US$ "+Number(value).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function rateLabel(value){return Number(value).toFixed(3);}
  function resetFxStep(){
    fxQuote=null;fxPayload=null;savedReservation=null;
    const modal=$("passengerReservationModal");
    modal.classList.remove("mct-fx-step");
    $("passengerCheckoutReview").hidden=true;$("passengerCheckoutReview").replaceChildren();
    $("passengerModalTitle").textContent="Datos de los pasajeros";
    const form=$("passengerReservationForm");form.querySelector('[type="submit"]').textContent="Pagar";
    const message=form.querySelector("[data-passenger-message]");message.textContent="";message.classList.remove("is-error");
  }
  function renderFxStep(q){
    const panel=$("passengerCheckoutReview");
    const parts=String(q.date).split("-");
    const formattedDate=parts.length===3?parts.reverse().join("/"):q.date;
    panel.innerHTML='<div class="mct-fx-card"><div class="mct-fx-intro"><i class="fas fa-lock" aria-hidden="true"></i><h3>Pago seguro</h3><p>El pago se procesará en dólares estadounidenses a través de PayPal. Revisa el importe antes de continuar.</p></div>'+
      '<div class="mct-fx-lines"><div><span>Importe de tu reserva</span><strong>'+esc(money(q.penTotal))+'</strong></div>'+
      '<div class="mct-fx-reference"><span>Tipo de cambio aplicado</span><strong>S/ '+esc(rateLabel(q.rate))+'</strong></div></div>'+
      '<p class="mct-fx-source">Referencia: BCRP (SBS) · '+esc(formattedDate)+'.</p>'+
      '<div class="mct-fx-total"><span>Total a pagar en dólares</span><strong>'+esc(usd(q.usdTotal))+'</strong></div>'+
      '<p class="mct-fx-note">Tu banco o PayPal podría aplicar su propio tipo de cambio si tu medio de pago está en otra moneda. Esta conversión es válida por 15 minutos antes de iniciar el pago.</p>'+
      '<button type="button" class="mct-fx-back">Volver a los datos de los pasajeros</button></div>';
    panel.querySelector(".mct-fx-back").addEventListener("click",()=>{if(!state.submitting&&!savedReservation)resetFxStep();});
    panel.hidden=false;$("passengerReservationModal").classList.add("mct-fx-step");
    $("passengerModalTitle").textContent="Detalles del pago";
    const dialog=$("passengerReservationModal").querySelector(".passenger-modal__dialog");
    if(dialog)dialog.scrollTop=0;
    panel.scrollIntoView({block:"nearest"});
  }
  async function requestFx(api,payload){
    const {holder,passengers,...fare}=payload;
    const quote=await api.postAction("quoteCusco5d4nPayPal",fare);
    if(!quote||quote.ok!==true||quote.version!=="cusco5d4n-paypal-v2"||
      !quote.quoteId||!(quote.rate>0)||!(quote.usdTotal>0)||
      Math.abs(Number(quote.penTotal)-payload.payNowValue)>0.005)
      throw Error("No pudimos consultar el tipo de cambio.");
    return quote;
  }
  async function submitReservation(ev) {
    ev.preventDefault();
    const form=$("passengerReservationForm"),message=document.querySelector("[data-passenger-message]"),submit=form.querySelector('[type="submit"]');
    if(state.submitting)return;
    if(!BOOKABLE){message.textContent="El pago en línea todavía no está disponible para esta tarifa. Contáctanos para reservar.";message.classList.add("is-error");return;}
    if(window.MCTFixedTrains&&!window.MCTFixedTrains.guard())return;
    if(!fxQuote){
      if(!form.reportValidity())return;
      const missing=[...form.querySelectorAll('[data-mct-required="true"]')].find(el=>!el.value);
      if(missing){missing._mctTrigger?.setAttribute("aria-invalid","true");missing._mctTrigger?.focus();message.textContent="Completa todos los campos obligatorios de los pasajeros.";message.classList.add("is-error");return;}
      const checked=formPayload();
      if(!checked.holder.birthdate||checked.passengers.some(p=>!p.birthdate)){message.textContent="Completa las fechas de nacimiento de todos los pasajeros.";message.classList.add("is-error");return;}
      if(checked.passengers.some(p=>!/^per[uú]$/i.test(String(p.nationality||"").trim()))){message.textContent="Esta tarifa está dirigida a turistas peruanos. Consulta con nosotros para otras nacionalidades.";message.classList.add("is-error");return;}
      fxPayload=checked;
    }
    state.submitting=true;submit.disabled=true;submit.textContent=fxQuote?"Procesando…":"Consultando tipo de cambio…";message.textContent="";message.classList.remove("is-error");
    let phase="quote";
    try {
      const api=window.MyCuscoTripApiClient;
      if(!api)throw Error("Servicio de pago no disponible.");
      if(!fxQuote||(!savedReservation&&Date.now()>=Number(fxQuote.expiresAt))){
        fxQuote=await requestFx(api,fxPayload);
        renderFxStep(fxQuote);
        return; // The customer must explicitly accept the displayed USD amount.
      }
      phase="reserve";
      if(!savedReservation){
        const payload={...fxPayload,fxQuoteId:fxQuote.quoteId,acceptedUsdTotal:fxQuote.usdTotal};
        const created=await api.createPreReservation(payload);
        if(!created||created.mock||created.ok!==true||created.currency!=="USD"||
           Math.abs(Number(created.amountToPayNow)-fxQuote.usdTotal)>0.005)throw Error("No se pudo registrar la reserva.");
        savedReservation=created.reservationCode||created.code;
        if(!savedReservation)throw Error("No se pudo identificar la reserva.");
        const back=$("passengerCheckoutReview").querySelector(".mct-fx-back");if(back)back.hidden=true;
      }
      phase="paypal";
      const pay=await api.createPayPalOrder({reservationCode:savedReservation,currency:"USD",amountToPayNowValue:fxQuote.usdTotal,productId:PRODUCT_ID,productTitle:fxPayload.productTitle});
      if(!pay||pay.ok!==true||!pay.approvalUrl)throw Error("No se pudo abrir PayPal.");
      const url=new URL(pay.approvalUrl);
      if(url.protocol!=="https:"||!/(^|\.)paypal\.com$/i.test(url.hostname))throw Error("Enlace de pago no disponible.");
      window.location.assign(url.href);
    }catch(error){
      console.error("Error de reserva:",error);
      if(!savedReservation&&phase==="reserve"&&/conversión ha vencido|tipo de cambio antes/i.test(error.message||"")){
        fxQuote=null;
        $("passengerReservationModal").classList.remove("mct-fx-step");
        $("passengerCheckoutReview").hidden=true;$("passengerModalTitle").textContent="Datos de los pasajeros";
      }
      message.textContent=phase==="quote"?"No pudimos consultar el tipo de cambio en este momento. Por favor, inténtalo nuevamente.":phase==="paypal"?"No pudimos abrir el pago. Vuelve a intentarlo.": "No pudimos completar tu reserva. Por favor, revisa tus datos o inténtalo nuevamente.";
      message.classList.add("is-error");
    }finally{state.submitting=false;submit.disabled=false;submit.textContent="Pagar";}
  }
  function setup() {
    renderContent();
    ensureRooms();renderPrice();window.MCTFixedTrains?.init({days:OFFER.n,travelers:()=>({adults:state.adults,children:state.children}),travelDate:()=>state.date});loadOfferPrice();
    if(window.flatpickr)flatpickr($("travelDate"),{locale:flatpickr.l10ns.es,minDate:"today",dateFormat:"Y-m-d",altInput:true,altFormat:"d M Y",disableMobile:true,onChange:function(_,date){state.date=date;updateDates();renderPrice();}});
    document.querySelectorAll(".qty-btn").forEach(btn=>btn.addEventListener("click",()=>{
      const target=btn.dataset.target,delta=btn.dataset.action==="plus"?1:-1;
      if(target==="adults")state.adults=Math.max(1,Math.min(9,state.adults+delta));
      else state.children=Math.max(0,Math.min(9,state.children+delta));
      if(travelers()>9){if(target==="adults")state.adults-=1;else state.children-=1;}
      ensureRooms();renderPrice();
    }));
    $("singleExtraSelect").addEventListener("change",e=>{state.extra=e.target.value;renderPrice();});
    $("productBookingForm").addEventListener("submit",e=>{e.preventDefault();openPassenger();});
    $("chooseHotelBtn").addEventListener("click",openHotel);
    ["closeHotelModalBtn","cancelHotelModalBtn"].forEach(id=>$(id).addEventListener("click",()=>closeModal("hotelSelectionModal")));
    document.querySelector("[data-close-hotel-modal]").addEventListener("click",()=>closeModal("hotelSelectionModal"));
    $("cancelHotelModalBtn").textContent="Guardar selección";
    $("paypalButton").addEventListener("click",openPassenger);
    $("holderTravelsCheckbox").addEventListener("change",()=>{closePicker();renderExtraPassengers();stylePassengerControls();});
    $("holderLanguageSelect").innerHTML='<option value="Español">Español</option><option value="English">English</option>';
    $("holderLanguageWarning").hidden=true;
    ["closePassengerModalBtn"].forEach(id=>$(id).addEventListener("click",()=>closeModal("passengerReservationModal")));
    document.querySelectorAll("[data-close-passenger-modal]").forEach(el=>el.addEventListener("click",()=>closeModal("passengerReservationModal")));
    $("passengerReservationCodeCopy").addEventListener("click",()=>navigator.clipboard?.writeText($("passengerReservationCode").textContent));
    $("passengerDetailsToggle").addEventListener("click",()=>{
      const snap=$("passengerPaymentSnapshot");snap.hidden=!snap.hidden;
    });
    $("passengerPaymentSnapshot").hidden=true;
    $("passengerReservationForm").addEventListener("submit",submitReservation);
    const countries=[["Perú","+51"],["México","+52"],["Colombia","+57"],["Chile","+56"],["Argentina","+54"],["Brasil","+55"],["Bolivia","+591"],["Ecuador","+593"],["Uruguay","+598"],["Paraguay","+595"],["Venezuela","+58"],["España","+34"],["Reino Unido","+44"],["Francia","+33"],["Alemania","+49"],["Italia","+39"],["Portugal","+351"],["Países Bajos","+31"],["Bélgica","+32"],["Suiza","+41"],["Austria","+43"],["Irlanda","+353"],["Noruega","+47"],["Suecia","+46"],["Dinamarca","+45"],["Finlandia","+358"],["Polonia","+48"],["República Checa","+420"],["Hungría","+36"],["Grecia","+30"],["Rumanía","+40"],["Turquía","+90"],["Rusia","+7"],["Ucrania","+380"],["Australia","+61"],["Nueva Zelanda","+64"],["Japón","+81"],["China","+86"],["Hong Kong","+852"],["Taiwán","+886"],["Corea del Sur","+82"],["India","+91"],["Indonesia","+62"],["Tailandia","+66"],["Vietnam","+84"],["Filipinas","+63"],["Malasia","+60"],["Singapur","+65"],["Israel","+972"],["Emiratos Árabes Unidos","+971"],["Arabia Saudita","+966"],["Qatar","+974"],["Sudáfrica","+27"],["Marruecos","+212"],["Egipto","+20"],["Kenia","+254"],["Tanzania","+255"],["Ghana","+233"],["Nigeria","+234"],["Costa Rica","+506"],["Panamá","+507"],["Guatemala","+502"],["El Salvador","+503"],["Honduras","+504"],["Nicaragua","+505"],["República Dominicana","+1"],["Puerto Rico","+1"],["Cuba","+53"],["Jamaica","+1"],["Afganistán","+93"],["Albania","+355"],["Argelia","+213"],["Andorra","+376"],["Angola","+244"],["Antigua y Barbuda","+1"],["Armenia","+374"],["Azerbaiyán","+994"],["Bahamas","+1"],["Bangladés","+880"],["Barbados","+1"],["Baréin","+973"],["Belice","+501"],["Benín","+229"],["Bielorrusia","+375"],["Bosnia y Herzegovina","+387"],["Botsuana","+267"],["Brunéi","+673"],["Bulgaria","+359"],["Burkina Faso","+226"],["Burundi","+257"],["Bután","+975"],["Cabo Verde","+238"],["Camboya","+855"],["Camerún","+237"],["Chad","+235"],["Chipre","+357"],["Comoras","+269"],["Congo","+242"],["Costa de Marfil","+225"],["Croacia","+385"],["Dominica","+1"],["Eritrea","+291"],["Eslovaquia","+421"],["Eslovenia","+386"],["Estonia","+372"],["Etiopía","+251"],["Fiyi","+679"],["Gabón","+241"],["Gambia","+220"],["Georgia","+995"],["Granada","+1"],["Guinea","+224"],["Guinea-Bisáu","+245"],["Guyana","+592"],["Haití","+509"],["Irán","+98"],["Irak","+964"],["Islandia","+354"],["Jordania","+962"],["Kazajistán","+7"],["Kirguistán","+996"],["Kuwait","+965"],["Laos","+856"],["Letonia","+371"],["Líbano","+961"],["Lituania","+370"],["Luxemburgo","+352"],["Madagascar","+261"],["Malaui","+265"],["Maldivas","+960"],["Malí","+223"],["Malta","+356"],["Mauricio","+230"],["Moldavia","+373"],["Mónaco","+377"],["Mongolia","+976"],["Montenegro","+382"],["Mozambique","+258"],["Myanmar","+95"],["Namibia","+264"],["Nepal","+977"],["Níger","+227"],["Omán","+968"],["Pakistán","+92"],["Palestina","+970"],["Papúa Nueva Guinea","+675"],["Ruanda","+250"],["Serbia","+381"],["Seychelles","+248"],["Sri Lanka","+94"],["Túnez","+216"],["Uganda","+256"],["Uzbekistán","+998"],["Zambia","+260"],["Zimbabue","+263"],["Corea del Norte","+850"],["Congo Democrático","+243"],["Djibouti","+253"],["Guinea Ecuatorial","+240"],["Islas Marshall","+692"],["Islas Salomón","+677"],["Kiribati","+686"],["Lesoto","+266"],["Liberia","+231"],["Libia","+218"],["Liechtenstein","+423"],["Mauritania","+222"],["Micronesia","+691"],["Nauru","+674"],["Palaos","+680"],["República Centroafricana","+236"],["Samoa","+685"],["San Cristóbal y Nieves","+1"],["San Marino","+378"],["San Vicente y las Granadinas","+1"],["Santa Lucía","+1"],["Santo Tomé y Príncipe","+239"],["Senegal","+221"],["Sierra Leona","+232"],["Siria","+963"],["Somalia","+252"],["Sudán","+249"],["Sudán del Sur","+211"],["Surinam","+597"],["Tayikistán","+992"],["Timor Oriental","+670"],["Togo","+228"],["Tonga","+676"],["Trinidad y Tobago","+1"],["Turkmenistán","+993"],["Tuvalu","+688"],["Vanuatu","+678"],["Vaticano","+39"],["Yemen","+967"],["Esuatini","+268"],["Kosovo","+383"],["Macedonia del Norte","+389"],["Sáhara Occidental","+212"],["Guam","+1"],["Islas Vírgenes de EE. UU.","+1"],["Islas Vírgenes Británicas","+1"],["Bermudas","+1"],["Islas Caimán","+1"],["Aruba","+297"],["Curazao","+599"],["Bonaire","+599"],["Guadalupe","+590"],["Martinica","+596"],["Guayana Francesa","+594"],["Reunión","+262"],["Mayotte","+262"],["Nueva Caledonia","+687"],["Polinesia Francesa","+689"],["Wallis y Futuna","+681"],["Groenlandia","+299"],["Islas Feroe","+298"],["Gibraltar","+350"],["Macao","+853"],["Islas Cook","+682"],["Niue","+683"],["Tokelau","+690"],["Islas Malvinas","+500"],["Santa Elena","+290"],["San Pedro y Miquelón","+508"],["Islas Marianas del Norte","+1"],["Samoa Americana","+1"],["Anguila","+1"],["Montserrat","+1"],["Turcas y Caicos","+1"],["San Martín","+590"],["Sint Maarten","+1"],["Jersey","+44"],["Guernsey","+44"],["Isla de Man","+44"],["Isla Norfolk","+672"],["Isla de Navidad","+61"],["Islas Cocos","+61"],["San Bartolomé","+590"],["Svalbard y Jan Mayen","+47"],["Islas Pitcairn","+64"],["Canadá","+1"],["Estados Unidos","+1"]];
    const national=document.querySelector('[name="holderNationality"]');
    national.replaceChildren(new Option("Selecciona país",""));
    [...countries].sort((a,b)=>a[0].localeCompare(b[0],"es")).forEach(([name])=>national.add(new Option(name,name)));
    national.value="Perú";
    const phone=document.querySelector('[name="holderWhatsappCountryCode"]');
    phone.replaceChildren();
    countries.forEach(([name,code])=>{const option=new Option(code+" · "+name,code);option.dataset.fullLabel=option.textContent;phone.add(option);});
    phone.value="+51";
    national.querySelector('option[value="Perú"]').defaultSelected=true;
    phone.options[phone.selectedIndex].defaultSelected=true;
    document.addEventListener("pointerdown",e=>{if(activePicker&&!activePicker.panel.contains(e.target)&&!activePicker.trigger.contains(e.target))closePicker();},true);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&activePicker){e.preventDefault();e.stopImmediatePropagation();closePicker(true);}},true);
    window.addEventListener("resize",positionPicker);window.addEventListener("scroll",positionPicker,true);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal("hotelSelectionModal");closeModal("passengerReservationModal");}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();