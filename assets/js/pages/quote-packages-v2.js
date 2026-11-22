/* Cotizador V2: flujo de vuelos condicional. No altera el motor ni la V1. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const ready = params.get("v2ready") === "1";
  const form = $("v2Form");
  if (!form) return;
  document.body.classList.toggle("v2-ready", ready);

  const pad = number => String(number).padStart(2, "0");
  const iso = date => [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join("-");
  const today = iso(new Date());
  ["v2Start","v2End"].forEach(id => { $(id).min=today; });
  const value = id => $(id)?.value || "";
  const radio = name => form.querySelector('input[name="'+name+'"]:checked')?.value || "";
  const chosenFlightStatus = () => radio("v2FlightStatus");
  const chosenFlightChoice = () => radio("v2FlightChoice");
  const limaNights = () => Number(radio("v2LimaOption") || 0);
  const currentFlow = () => chosenFlightStatus()==="complete" ? [1,3,4] : [1,2,3,4];
  let step = 1;

  function updateProgress() {
    const flow=currentFlow(),index=Math.max(0,flow.indexOf(step));
    $("v2ProgressLabel").textContent="Paso "+(index+1)+" de "+flow.length;
    $("v2ProgressFill").style.width=((index+1)/flow.length*100)+"%";
    $("v2Back").hidden=index===0;
    $("v2Next").innerHTML=index===flow.length-1
      ? 'Crear mi itinerario <i class="fas fa-arrow-right" aria-hidden="true"></i>'
      : 'Continuar <i class="fas fa-arrow-right" aria-hidden="true"></i>';
  }
  function switchStep(next,{scroll=true}={}) {
    step=next;
    document.querySelectorAll(".v2-step").forEach(section=>{
      section.hidden=Number(section.dataset.step)!==step;
    });
    syncDetails();
    updateProgress();
    $("v2Error").textContent="";
    if(scroll) {
      $("v2Wizard").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
    }
  }
  function syncDetails() {
    const status=chosenFlightStatus(),choice=chosenFlightChoice();
    $("v2FlightNoGroup").hidden=status!=="none";
    $("v2FlightLimaGroup").hidden=status!=="lima";
    $("v2OriginWrap").hidden=status!=="none" || choice!=="search";
    $("v2LimaTourWrap").hidden=status!=="lima" || limaNights()===0;
    updateFlightSearchLink();
  }
  function buildFlightLink() {
    // Durante la edición se usan las nuevas respuestas, no los parámetros anteriores.
    const status=ready ? (params.get("v2FlightStatus")||chosenFlightStatus()) : chosenFlightStatus();
    const choice=ready ? (params.get("v2FlightChoice")||chosenFlightChoice()) : chosenFlightChoice();
    if(status==="complete" || (status==="none"&&choice!=="search"))return "";
    const origin=status==="lima"?"LIM":(ready ? (params.get("v2Origin")||value("v2Origin")) : value("v2Origin"));
    if(!origin)return "";
    if(origin==="BAQ"||origin==="OTHER"){
      const city=origin==="BAQ"?"Barranquilla":"otra ciudad";
      const text="Hola, quiero buscar vuelos desde "+city+" a Cusco para mi viaje. ¿Podrían ayudarme?";
      return "https://wa.me/51900608980?text="+encodeURIComponent(text);
    }
    const query=new URLSearchParams({origin,destination:"CUZ",trip:"roundtrip",cabin:"economy"});
    const start=ready ? (params.get("startDate")||value("v2Start")) : value("v2Start");
    const end=ready ? (params.get("endDate")||value("v2End")) : value("v2End");
    if(start && start>=today)query.set("departure",start);
    if(end && end>=start && start>=today)query.set("return",end);
    const adults=ready ? (params.get("adults")||value("v2Adults")) : value("v2Adults");
    const children=ready ? (params.get("children")||value("v2Children")) : value("v2Children");
    if(adults)query.set("adults",adults);
    if(children)query.set("children",children);
    return "https://latamexpeditions.com/vuelos.html?"+query.toString();
  }
  function updateFlightSearchLink() {
    const link=$("v2FlightSearch");
    if(chosenFlightStatus()!=="none" || chosenFlightChoice()!=="search" || !value("v2Origin")){
      link.hidden=true;link.removeAttribute("href");return;
    }
    const url=buildFlightLink();
    link.hidden=!url;
    if(url){
      link.href=url;
      link.innerHTML=url.startsWith("https://wa.me/")?'Pedir ayuda con vuelos <i class="fas fa-external-link-alt" aria-hidden="true"></i>':'Ver vuelos a Cusco <i class="fas fa-external-link-alt" aria-hidden="true"></i>';
    }
  }
  form.querySelectorAll('input[name="v2FlightStatus"]').forEach(input=>input.addEventListener("change",()=>{
    syncDetails();updateProgress();
  }));
  form.querySelectorAll('input[name="v2FlightChoice"],input[name="v2LimaOption"]').forEach(input=>input.addEventListener("change",syncDetails));
  $("v2Origin").addEventListener("change",updateFlightSearchLink);
  $("v2Start").addEventListener("change",()=>{
    $("v2End").min=value("v2Start")||today;
    if(value("v2End")&&value("v2End")<value("v2Start"))$("v2End").value="";
  });

  function validateStep() {
    if(step===1 && !chosenFlightStatus())return "Selecciona una opción para continuar.";
    if(step===2){
      if(chosenFlightStatus()==="none"){
        if(!chosenFlightChoice())return "¿Deseas buscar vuelos o continuar sin ellos?";
        if(chosenFlightChoice()==="search"&&!value("v2Origin"))return "Elige tu ciudad de partida.";
      }
      if(chosenFlightStatus()==="lima"&&!radio("v2LimaOption"))return "Elige cómo deseas continuar desde Lima.";
    }
    if(step===3){
      const a=value("v2Start"),b=value("v2End");
      if(!a||!b||a<today||b<a)return "Indica fechas válidas de llegada y salida.";
      const days=Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/86400000)+1;
      if(days<3||days>10)return "Elige entre 3 y 10 días en Cusco.";
      if(!value("v2ArrivalTime")||!value("v2DepartureTime"))return "Indica los horarios de llegada y salida.";
    }
    if(step===4){
      const adults=Number(value("v2Adults")),children=Number(value("v2Children"));
      if(!Number.isInteger(adults)||adults<1||adults>12||!Number.isInteger(children)||children<0||children>9)
        return "Revisa la cantidad de viajeros.";
    }
    return "";
  }

  function completeWizard() {
    const nights=chosenFlightStatus()==="lima" ? limaNights() : 0;
    const url=new URL(window.location.href);
    const choices={
      v2ready:"1",source:"cotizador-v2-publico",
      startDate:value("v2Start"),endDate:value("v2End"),
      arrivalTime:value("v2ArrivalTime"),departureTime:value("v2DepartureTime"),
      adults:value("v2Adults"),children:value("v2Children"),
      nationality:value("v2Nationality"),currency:value("v2Nationality")==="national"?"PEN":"USD",
      v2FlightStatus:chosenFlightStatus(),
      v2FlightChoice:chosenFlightStatus()==="none"?chosenFlightChoice():"",
      v2Origin:chosenFlightStatus()==="none"&&chosenFlightChoice()==="search"?value("v2Origin"):"",
      v2LimaNights:String(nights),v2LimaNight:nights>0?"1":"0",
      v2LimaTours:nights>0&&$("v2LimaTours").checked?"1":"0",
      v2Seniors:$("v2Seniors").checked?"1":"0",
      v2Teen:$("v2Teen").checked?"1":"0",
      v2Pace:value("v2Pace"),v2Car:$("v2Car").checked?"1":"0"
    };
    Object.entries(choices).forEach(([key,val])=>url.searchParams.set(key,val));
    window.location.assign(url.href);
  }

  $("v2Back").addEventListener("click",()=>{
    const flow=currentFlow(),idx=flow.indexOf(step);
    if(idx>0)switchStep(flow[idx-1]);
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const problem=validateStep();
    if(problem){$("v2Error").textContent=problem;return;}
    const flow=currentFlow(),idx=flow.indexOf(step);
    if(idx<flow.length-1)switchStep(flow[idx+1]);
    else completeWizard();
  });

  function populatePrefill(){
    const fields={
      v2Start:"startDate",v2End:"endDate",v2ArrivalTime:"arrivalTime",
      v2DepartureTime:"departureTime",v2Adults:"adults",v2Children:"children",
      v2Nationality:"nationality",v2Origin:"v2Origin",v2Pace:"v2Pace"
    };
    Object.entries(fields).forEach(([id,key])=>{if(params.has(key))$(id).value=params.get(key);});
    ["v2LimaTours","v2Seniors","v2Teen","v2Car"].forEach(id=>{if(params.get(id)==="1")$(id).checked=true;});
    const choices={
      v2FlightStatus:params.get("v2FlightStatus"),
      v2FlightChoice:params.get("v2FlightChoice"),
      v2LimaOption:params.get("v2LimaNights")||(params.get("v2LimaNight")==="1"?"1":null)
    };
    Object.entries(choices).forEach(([name,val])=>{
      if(val!==null&&val!==""){
        const item=[...form.querySelectorAll('input[name="'+name+'"]')].find(input=>input.value===val);
        if(item)item.checked=true;
      }
    });
    $("v2End").min=value("v2Start")||today;
  }
  populatePrefill();
  switchStep(1,{scroll:false});
  if(!ready)return;

  const flightStatus=params.get("v2FlightStatus")||"complete";
  const flightLink=buildFlightLink();
  const message=$("v2ReadyMessage"),link=$("v2FlightLink");
  const nights=Number(params.get("v2LimaNights")||0);
  if(flightStatus==="complete"){
    message.textContent="Elige tus experiencias, hoteles y trenes.";
  } else if(flightStatus==="lima"){
    message.textContent=nights>0?"Elegiste "+nights+" noche"+(nights===1?"":"s")+" en Lima. Se cotiza aparte.":"Revisa tu conexión Lima–Cusco.";
  }else{
    message.textContent=params.get("v2FlightChoice")==="skip"
      ?"Tu paquete se cotiza sin vuelos."
      :"Puedes consultar tus vuelos antes de reservar.";
  }
  if(flightLink){
    link.href=flightLink;
    link.hidden=false;
    link.textContent=flightLink.startsWith("https://wa.me/")?"Solicitar vuelos por WhatsApp":"Ver vuelos";
  }else link.hidden=true;

  $("v2Edit").addEventListener("click",()=>{
    const url=new URL(window.location.href);
    url.searchParams.delete("v2ready");
    window.location.assign(url.href);
  });
  const note = $("clientNotes");
  const snippets=[
    "Preferencias del viajero (asistente V2):",
    "Estado de vuelos: "+({none:"sin vuelos",lima:"hasta Lima",complete:"confirmados a Cusco"}[flightStatus] || flightStatus),
    "Estilo: "+(params.get("v2Pace")||"equilibrado"),
    params.get("v2Seniors")==="1"?"Viajan personas de 60 años o más: priorizar rutas suaves.":"",
    params.get("v2Teen")==="1"?"Viajan menores entre 12 y 15 años.":"",
    params.get("v2Car")==="1"?"Desea consultar opción económica por Hidroeléctrica (NO cotizada en el total).":"",
    Number(params.get("v2LimaNights")||0)>0?"Desea "+params.get("v2LimaNights")+" noche(s) en Lima (NO cotizado).":"",
    params.get("v2LimaTours")==="1"?"Desea turismo en Lima (NO cotizado).":"",
    params.get("v2FlightChoice")==="skip"?"No desea cotizar vuelos por ahora.":""
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