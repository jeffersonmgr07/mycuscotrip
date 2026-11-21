/* Cotizador V2: asistente de preparación y preferencias; conserva el motor y precios de la V1. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const ready = params.get("v2ready") === "1";
  const form = $("v2Form");
  if (!form) return;
  document.body.classList.toggle("v2-ready", ready);
  let step = 1;
  const pad = n => String(n).padStart(2, "0");
  const iso = d => [d.getFullYear(), pad(d.getMonth()+1), pad(d.getDate())].join("-");
  const now = new Date();
  const today = iso(now);
  ["v2Start", "v2End"].forEach(id => { $(id).min = today; });
  function value(id) { return ($(id) && $(id).value) || ""; }
  function chosenFlightStatus() { return (form.querySelector('input[name="v2FlightStatus"]:checked') || {}).value || "complete"; }
  function switchStep(next) {
    step = Math.max(1,Math.min(3,next));
    document.querySelectorAll(".v2-step").forEach(el => el.hidden = Number(el.dataset.step) !== step);
    document.querySelectorAll(".v2-progress span").forEach((el,i) => {
      el.classList.toggle("is-current",i+1===step);
      el.classList.toggle("is-done",i+1<step);
    });
    $("v2Back").hidden = step === 1;
    $("v2Next").textContent = step === 3 ? "Crear mi itinerario" : "Continuar";
    $("v2Error").textContent = "";
    $("v2Wizard").scrollIntoView({ behavior:"smooth", block:"start" });
  }
  function flightNotice() {
    const status = chosenFlightStatus();
    $("v2OriginWrap").hidden = status !== "none";
    $("v2LimaNightWrap").hidden = status !== "lima";
    $("v2FlightNotice").textContent = status === "complete"
      ? "Perfecto. Usa las fechas y horas de llegada y salida de Cusco para armar los recorridos."
      : status === "lima"
        ? "Para calcular los tours necesitamos las fechas de Cusco. El vuelo Lima–Cusco y una posible noche en Lima se revisarán aparte: todavía no están incluidos en el total."
        : "Primero recomendamos comparar tus vuelos hasta Cusco. Puedes continuar con fechas tentativas y corregir el itinerario cuando confirmes tus horarios.";
  }
  form.querySelectorAll('input[name="v2FlightStatus"]').forEach(r => r.addEventListener("change",flightNotice));
  $("v2Start").addEventListener("change", () => {
    $("v2End").min = value("v2Start") || today;
    if(value("v2End") && value("v2End") < value("v2Start")) $("v2End").value = "";
  });
  function validStep() {
    $("v2Error").textContent = "";
    if (step === 1) {
      if (chosenFlightStatus() === "none" && !value("v2Origin")) return "Selecciona tu ciudad de origen.";
    }
    if (step === 2) {
      const a = value("v2Start"), b = value("v2End");
      if (!a || !b || a < today || b < a) return "Indica fechas de llegada y salida válidas.";
      const days = Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/86400000)+1;
      if (days < 3 || days > 10) return "El motor actual arma paquetes de 3 a 10 días. Para otras duraciones, solicita un viaje personalizado.";
      if (!value("v2ArrivalTime") || !value("v2DepartureTime")) return "Indica tus horarios aproximados en Cusco.";
    }
    if (step === 3) {
      if (Number(value("v2Adults")) < 1 || Number(value("v2Adults")) > 12 || Number(value("v2Children")) < 0) return "Revisa la cantidad de viajeros.";
    }
    return "";
  }
  function buildFlightLink() {
    const status = params.get("v2FlightStatus") || chosenFlightStatus();
    if (status === "complete") return "";
    const rawOrigin=params.get("v2Origin")||value("v2Origin");
    if(status==="none" && (rawOrigin==="BAQ" || rawOrigin==="OTHER")) {
      const place=rawOrigin==="BAQ"?"Barranquilla":"mi ciudad";
      const msg="Hola, necesito cotizar vuelos desde "+place+" a Cusco para viajar del "+(params.get("startDate")||value("v2Start"))+" al "+(params.get("endDate")||value("v2End"))+". ¿Podrían ayudarme con opciones y horarios?";
      return "https://wa.me/51900608980?text="+encodeURIComponent(msg);
    }
    const q = new URLSearchParams({
      origin: status === "lima" ? "LIM" : (params.get("v2Origin") || value("v2Origin") || "LIM"),
      destination:"CUZ", trip:"roundtrip",
      departure:params.get("startDate") || value("v2Start"),
      return:params.get("endDate") || value("v2End"),
      adults:params.get("adults") || value("v2Adults") || "2",
      children:params.get("children") || value("v2Children") || "0",
      cabin:"economy"
    });
    return "https://latamexpeditions.com/vuelos.html?" + q.toString();
  }
  function completeWizard() {
    const url = new URL(window.location.href);
    const inputs = {
      v2ready:"1", source:"cotizador-v2-publico",
      startDate:value("v2Start"), endDate:value("v2End"),
      arrivalTime:value("v2ArrivalTime"), departureTime:value("v2DepartureTime"),
      adults:value("v2Adults"), children:value("v2Children"),
      nationality:value("v2Nationality"), currency:value("v2Nationality")==="national"?"PEN":"USD",
      v2FlightStatus:chosenFlightStatus(),v2Origin:value("v2Origin"),
      v2LimaNight:$("v2LimaNight").checked?"1":"0",
      v2Seniors:$("v2Seniors").checked?"1":"0",
      v2Teen:$("v2Teen").checked?"1":"0",
      v2Pace:value("v2Pace"),v2Car:$("v2Car").checked?"1":"0"
    };
    Object.keys(inputs).forEach(key => url.searchParams.set(key,inputs[key]));
    window.location.assign(url.href);
  }
  $("v2Back").addEventListener("click", () => switchStep(step-1));
  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const error = validStep();
    if (error) { $("v2Error").textContent = error; return; }
    if (step < 3) switchStep(step+1);
    else completeWizard();
  });
  function populatePrefill() {
    const keys = {
      "v2Start":"startDate","v2End":"endDate","v2ArrivalTime":"arrivalTime",
      "v2DepartureTime":"departureTime","v2Adults":"adults","v2Children":"children",
      "v2Nationality":"nationality","v2Origin":"v2Origin","v2Pace":"v2Pace"
    };
    Object.entries(keys).forEach(([id,key])=>{if(params.has(key) && $(id)) $(id).value=params.get(key);});
    ["v2LimaNight","v2Seniors","v2Teen","v2Car"].forEach(id=>{if(params.get(id)==="1")$(id).checked=true;});
    const status=params.get("v2FlightStatus");
    const radio = status && form.querySelector('input[name="v2FlightStatus"][value="'+status+'"]');
    if(radio) radio.checked=true;
    $("v2End").min=value("v2Start")||today;
  }
  populatePrefill();
  flightNotice();
  switchStep(1);
  if (!ready) return;
  const flightStatus = params.get("v2FlightStatus")||"complete";
  const flightLink = buildFlightLink();
  const message = $("v2ReadyMessage"),link=$("v2FlightLink");
  if(flightStatus==="complete") {
    message.textContent="Tu itinerario se calcula con los horarios que indicaste. Elige hoteles y trenes para obtener un total estimado. Los servicios se confirman al verificar disponibilidad.";
    link.hidden=true;
  }else{
    message.textContent=flightStatus==="lima"
      ? "Tienes vuelos hasta Lima. Revisa el tramo Lima–Cusco antes de confirmar horarios; la posible noche en Lima no está incluida en el presupuesto."
      : "Aún no tienes vuelos. Revisa rutas y tarifas verificables antes de cerrar el itinerario; el presupuesto de vuelos internacionales no está incluido.";
    link.href=flightLink; link.hidden=false;
    const assisted=flightLink.startsWith("https://wa.me/");
    link.textContent=assisted?"Solicitar búsqueda asistida de vuelos":"Consultar vuelos en Latam Expeditions";
    if(assisted)message.textContent+=" Para este aeropuerto todavía no hay selección directa en el buscador de Latam Expeditions.";
  }
  $("v2Edit").addEventListener("click",()=>{
    const url=new URL(window.location.href);url.searchParams.delete("v2ready");window.location.assign(url.href);
  });
  const note = $("clientNotes");
  const snippets=[
    "Preferencias del viajero (asistente V2):",
    "Estado de vuelos: "+({none:"sin vuelos",lima:"hasta Lima",complete:"confirmados a Cusco"}[flightStatus] || flightStatus),
    "Estilo: "+(params.get("v2Pace")||"equilibrado"),
    params.get("v2Seniors")==="1"?"Viajan personas de 60 años o más: priorizar rutas suaves.":"",
    params.get("v2Teen")==="1"?"Viajan menores entre 12 y 15 años.":"",
    params.get("v2Car")==="1"?"Desea consultar opción económica por Hidroeléctrica (NO cotizada en el total).":"",
    params.get("v2LimaNight")==="1"?"Desea evaluar una noche adicional en Lima (NO cotizada).":""
  ].filter(Boolean).join("\n");
  if(note && !note.value.includes("asistente V2")) note.value=(note.value?note.value+"\n":"")+snippets;
  function showRecommendation() {
    const container = $("packageOptions");
    const engine=window.MCTQuotePackages;
    const state=engine&&engine.getState&&engine.getState();
    if(!container || !state || !Array.isArray(state.options) || !state.options.length)return;
    const pace=params.get("v2Pace")||"equilibrado";
    const sensitive=params.get("v2Seniors")==="1"||params.get("v2Teen")==="1"||Number(params.get("children"))>0;
    const trekking=new Set(["CUZ006","CUZ007","CUZ008","CUZ009"]);
    const cards=Array.from(container.querySelectorAll(".quote-package-option[data-option-index]"));
    if (!cards.length) return;
    const score=card=>{
      const o=state.options[Number(card.dataset.optionIndex)]||{};
      const codes=Array.isArray(o.includedTourCodes)?o.includedTourCodes:[];
      const risk=codes.filter(code=>trekking.has(code)).length;
      if(sensitive && risk) {
        card.classList.add("v2-risk-option");
        if(!card.querySelector(".v2-option-warning")){
          const warning=document.createElement("span");
          warning.className="v2-option-warning";
          warning.textContent="Incluye caminata en altura. Revisa la exigencia física con un asesor antes de elegirla.";
          card.appendChild(warning);
        }
      }
      return sensitive ? risk*20+codes.length/10 : pace==="tranquilo" ? risk*10+codes.length/10 : pace==="aventurero" ? -risk*10 : risk+codes.length/10;
    };
    const sorted=cards.map(card=>({card,rank:score(card)})).sort((a,b)=>a.rank-b.rank);
    if(sorted.some((x,i)=>x.card!==cards[i]))sorted.forEach(x=>container.appendChild(x.card));
    if(!$("v2Guidance")) {
      const help=document.createElement("p");
      help.id="v2Guidance";help.className="v2-recommendation";
      help.textContent=sensitive
        ? "Ordenamos las alternativas para priorizar paseos culturales y menor exigencia física. La elección final depende de la movilidad, altitud y preferencias de cada persona."
        : "Prioriza Machu Picchu y Valle Sagrado; la ruta y horario de ingreso a Machu Picchu se confirman según cupos oficiales, no solo por la anticipación.";
      container.before(help);
    }
  }
  const options=$("packageOptions");
  if(options) {
    const observer=new MutationObserver(()=>showRecommendation());
    observer.observe(options,{childList:true,subtree:true});
  }
  const summary=$("quoteSummaryPanel");
  if(summary && !$("v2QuoteHelpBtn")){
    const help=document.createElement("div");help.className="v2-summary-help";
    const button=document.createElement("button");
    button.id="v2QuoteHelpBtn";button.type="button";
    button.textContent="Solicitar disponibilidad por WhatsApp";
    button.addEventListener("click",()=>{
      const state=window.MCTQuotePackages?.getState?.();
      const selected=state?.options?.[state.selectedOptionIndex];
      const text=[
        "Hola, quiero confirmar esta cotización de My Cusco Trip:",
        "Fechas: "+(params.get("startDate")||"")+" al "+(params.get("endDate")||""),
        "Viajeros: "+(params.get("adults")||"2")+" adultos, "+(params.get("children")||"0")+" niños",
        "Paquete: "+(selected?.title||"A definir"),
        "Total estimado: "+($("quoteGrandTotal")?.textContent?.trim()||"pendiente"),
        snippets,
        "Quiero confirmar circuitos, trenes, hoteles y tarifa final antes de reservar."
      ].join("\n");
      window.open("https://wa.me/51900608980?text="+encodeURIComponent(text),"_blank","noopener,noreferrer");
    });
    help.appendChild(button);summary.appendChild(help);
  }
  const quoteTotal=$("quoteGrandTotal");
  if(quoteTotal) {
    const syncTotal=()=>{if($("v2FloatingTotal"))$("v2FloatingTotal").textContent=quoteTotal.textContent;};
    new MutationObserver(syncTotal).observe(quoteTotal,{childList:true,characterData:true,subtree:true});
    syncTotal();
  }
  $("v2GoSummary").addEventListener("click",()=>{
    window.MCTQuotePackages?.setMobileSummaryExpanded?.(true);
    $("quoteSummaryPanel")?.scrollIntoView({behavior:"smooth",block:"center"});
  });
})();