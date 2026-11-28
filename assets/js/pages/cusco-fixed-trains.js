"use strict";
(function(){
  const $=id=>document.getElementById(id), esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const usd=v=>"US$ "+Number(v).toFixed(2), time=v=>{const m=String(v).match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):-1;};
  let ctx, catalog=[], loading, selected={outbound:null,return:null}, draft={}, modal, ready=false, scrollStateForModal=()=>{};
  const round=x=>Math.round((x+Number.EPSILON)*100)/100;
  function perPerson(t,child){return child?t.price?.child:t.price?.adult;}
  function validPrice(t){return Number.isFinite(t.price?.adult)&&t.price.adult>0&&(!ctx.travelers().children||(Number.isFinite(t.price?.child)&&t.price.child>=0));}
  function fare(t){const {adults,children}=ctx.travelers();return round(adults*perPerson(t,false)+children*(perPerson(t,true)||0));}
  function options(direction){
    const isFull=ctx.days===3;
    return catalog.filter(t=>{
      if(t.direction!==direction||t.isLocalTrain||t.company==="local"||t.category==="hiram_bingham"||t.currency!=="USD"||!validPrice(t))return false;
      const dep=time(t.departureTime),arr=time(t.arrivalTime);
      if(dep<0||arr<0)return false;
      if(direction==="outbound")return t.route==="OLLA_MAPI"&&(isFull?arr<=9*60:dep>=15*60+37);
      if(t.route!=="MAPI_OLLA"||dep<12*60||!draft.outbound||t.company!==draft.outbound.company)return false;
      return !isFull||dep-time(draft.outbound.arrivalTime)>=360;
    }).sort((a,b)=>time(a.departureTime)-time(b.departureTime)||a.price.adult-b.price.adult);
  }
  function current(){return selected.outbound&&selected.return?{outboundCode:selected.outbound.code,returnCode:selected.return.code,usdTotal:round(fare(selected.outbound)+fare(selected.return))}:null;}
  function dateFor(direction){
    const date=ctx.travelDate();if(!date)return "Según fecha del viaje";
    const d=new Date(date+"T12:00:00"), offsets={3:[1,1],4:[1,2],5:[2,3],6:[2,3],7:[3,4]};
    d.setDate(d.getDate()+offsets[ctx.days][direction==="outbound"?0:1]);
    return d.toLocaleDateString("es-PE",{day:"numeric",month:"long",year:"numeric"});
  }
  function setSummary(){
    if(selected.outbound&&selected.return&&(!validPrice(selected.outbound)||!validPrice(selected.return)))selected={outbound:null,return:null};
    const pick=current(), node=$("mctAddTrainsSummary"), remove=$("mctRemoveTrains");
    if(!node)return;
    node.innerHTML=pick?[["Ida",selected.outbound,"outbound"],["Retorno",selected.return,"return"]].map(([label,t,dir])=>'<div class="mct-added-train"><strong>'+label+' · '+esc(t.companyName+" "+t.serviceName)+'</strong><span>'+esc(dateFor(dir))+' · '+esc(t.departureTime+" → "+t.arrivalTime)+'</span><b>'+usd(fare(t))+'</b></div>').join("")+'<p><strong>Total trenes: '+usd(pick.usdTotal)+'</strong></p>':'<p>Los boletos de tren no están incluidos. Puedes añadir los trayectos de ida y retorno a tu paquete.</p>';
    $("mctOpenTrains").textContent=pick?"Modificar trenes":"Agregar trenes";
    remove.hidden=!pick;
    let row=$("mctTrainUsdRow");
    if(!row){row=document.createElement("div");row.id="mctTrainUsdRow";row.className="booking-summary__line mct-train-usd-row";$("singleTotal").closest(".booking-summary__total").after(row);}
    row.hidden=!pick;
    row.innerHTML=pick?'<span>Total en dólares · trenes</span><strong>'+usd(pick.usdTotal)+'</strong>':"";
    const title=$("singleTotal").closest(".booking-summary__total").querySelector("span");title.textContent=pick?"Total en soles":"Total a pagar";
    $("mctTrainPending").hidden=!pick;
  }
  function cards(list,dir){
    return list.length?list.map(t=>'<button type="button" class="mct-add-train-card '+(draft[dir]?.code===t.code?"is-selected":"")+'" data-train-code="'+esc(t.code)+'" data-direction="'+dir+'" aria-pressed="'+(draft[dir]?.code===t.code)+'"><img src="./assets/img/trains/'+(t.company==="incarail"?"inca-rail.png":"perurail.png")+'" alt="'+esc(t.companyName)+'"><span><strong>'+esc(t.serviceName)+'</strong><b>'+esc(t.departureTime+" → "+t.arrivalTime)+'</b><small>'+esc(t.departureStation+" → "+t.arrivalStation)+'</small></span><span class="mct-add-train-price"><strong>'+usd(t.price.adult)+'</strong><small>por persona</small></span></button>').join(""):'<p class="mct-train-empty">No hay horarios compatibles con la selección.</p>';
  }
  function draw(){
    const out=options("outbound"), ret=options("return");
    modal.querySelector("#mctTrainOutbound").innerHTML=cards(out,"outbound");
    modal.querySelector("#mctTrainReturn").innerHTML=draft.outbound?cards(ret,"return"):'<p class="mct-train-empty">Selecciona primero tu tren de ida.</p>';
    modal.querySelector("#mctTrainModalTotal").textContent=usd((draft.outbound?fare(draft.outbound):0)+(draft.return?fare(draft.return):0));
    modal.querySelector("#mctTrainApply").disabled=!(draft.outbound&&draft.return&&out.some(t=>t.code===draft.outbound.code)&&ret.some(t=>t.code===draft.return.code));
    modal.querySelectorAll("[data-train-code]").forEach(btn=>btn.addEventListener("click",()=>{
      const dir=btn.dataset.direction, t=catalog.find(t=>t.code===btn.dataset.trainCode);
      if(!t)return;
      draft[dir]=t;if(dir==="outbound"&&draft.return&&!options("return").some(r=>r.code===draft.return.code))draft.return=null;
      draw();
      const next=modal.querySelector('[data-train-code="'+CSS.escape(t.code)+'"]');next?.focus({preventScroll:true});
    }));
  }
  async function open(){
    modal.showModal();scrollStateForModal();draft={...selected};
    modal.querySelector("#mctTrainOutbound").textContent="Cargando horarios…";
    modal.querySelector("#mctTrainReturn").textContent="";
    modal.querySelector("#mctTrainApply").disabled=true;
    try{
      if(!loading)loading=fetch("./assets/data/trains.json").then(r=>{if(!r.ok)throw Error("catalog");return r.json();}).then(d=>{if(!Array.isArray(d.trains))throw Error("catalog");catalog=d.trains;}).catch(e=>{loading=null;throw e;});
      await loading;if(modal.open)draw();
    }catch(e){modal.querySelector("#mctTrainOutbound").textContent="No pudimos cargar los trenes. Inténtalo nuevamente.";}
  }
  function init(config){
    if(ready)return;ready=true;ctx=config;
    const section=document.createElement("article");section.className="experience-card mct-add-trains";section.id="add-trains";
    section.innerHTML='<div class="experience-card__header"><h2>Agrega trenes a tu paquete</h2></div><div class="mct-add-train-body"><img class="mct-train-hero" src="./assets/img/trenes/hero-trenes-machu-picchu.jpg" alt="Trenes turísticos hacia Machu Picchu" loading="lazy"><div id="mctAddTrainsSummary"></div><div class="mct-train-actions"><button type="button" id="mctOpenTrains">Agregar trenes</button><button type="button" id="mctRemoveTrains" hidden>Quitar trenes</button></div><small>Tarifas referenciales en dólares por persona; horarios y disponibilidad sujetos a confirmación.</small></div>';
    $("faq").before(section);
    modal=document.createElement("dialog");modal.className="mct-add-train-modal";modal.setAttribute("aria-labelledby","mctTrainModalTitle");
    modal.innerHTML='<div class="mct-train-modal-header"><h2 id="mctTrainModalTitle">Agrega tus trenes</h2><button type="button" aria-label="Cerrar" id="mctTrainClose">×</button></div><div class="mct-train-modal-body"><p>Selecciona ambos trayectos. Los precios corresponden al boleto completo, no a un upgrade.</p><h3>Tren de ida</h3><div id="mctTrainOutbound" class="mct-train-list"></div><h3>Tren de retorno</h3><div id="mctTrainReturn" class="mct-train-list"></div></div><div class="mct-train-modal-footer"><div><small>Total para tus viajeros</small><strong id="mctTrainModalTotal">US$ 0.00</strong></div><button type="button" id="mctTrainApply" disabled>Agregar selección</button></div>';
    document.body.append(modal);
    $("mctOpenTrains").onclick=open;$("mctTrainClose").onclick=()=>modal.close();
    $("mctTrainApply").onclick=()=>{selected={...draft};modal.close();setSummary();};
    $("mctRemoveTrains").onclick=()=>{selected={outbound:null,return:null};setSummary();};
    const pending=document.createElement("p");pending.id="mctTrainPending";pending.className="mct-train-pending";pending.hidden=true;pending.textContent="Por el momento, consulta con nosotros para confirmar y pagar los trenes junto con el paquete.";
    $("paypalButton").before(pending);
    const sticky=document.createElement("div");sticky.className="mct-mobile-booking";sticky.hidden=true;
    sticky.innerHTML='<button type="button">Iniciar reserva</button>';document.body.append(sticky);
    const booking=document.querySelector(".booking-panel");
    function setStickyVisible(visible){
      sticky.hidden=!visible;
      document.body.classList.toggle("mct-mobile-booking-visible",visible);
      if(visible)document.body.style.setProperty("--mct-booking-bar-height",Math.ceil(sticky.getBoundingClientRect().height)+"px");
    }
    sticky.querySelector("button").onclick=()=>{setStickyVisible(false);booking.scrollIntoView({behavior:"smooth",block:"start"});};
    function scrollState(){const r=booking.getBoundingClientRect();setStickyVisible(matchMedia("(max-width: 767px)").matches&&r.top>innerHeight-100&&!document.body.classList.contains("mct-single-modal-open")&&!modal.open);}
    scrollStateForModal=scrollState;
    if(window.ResizeObserver)new ResizeObserver(()=>{if(!sticky.hidden)document.body.style.setProperty("--mct-booking-bar-height",Math.ceil(sticky.getBoundingClientRect().height)+"px");}).observe(sticky);
    window.addEventListener("scroll",scrollState,{passive:true});window.addEventListener("resize",scrollState);
    new MutationObserver(scrollState).observe(document.body,{attributes:true,attributeFilter:["class"]});
    modal.addEventListener("close",scrollState);
    setSummary();scrollState();
  }
  window.MCTFixedTrains={init,refresh:()=>{if(ready)setSummary();},selection:current,
    guard:()=>{if(!current())return true;const node=$("mctTrainPending");if(node){node.hidden=false;node.scrollIntoView({block:"nearest"});}return false;}};
})();