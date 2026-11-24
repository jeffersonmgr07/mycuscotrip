"use strict";
(() => {
  const state = { selector: "", data: null, timer: null, observer: null };
  function locale() { return document.documentElement.lang || "es"; }
  function textSet(percent, time) {
    const lang=locale();
    return lang.startsWith("en")
      ? {header:percent+"% discount applied",timer:"Coupon expires in "+time,note:"(Does not apply to flights or extras)"}
      : lang.startsWith("pt")
        ? {header:"Desconto de "+percent+"% aplicado",timer:"Cupom expira em "+time,note:"(Não se aplica a voos ou extras)"}
        : {header:"Descuento del "+percent+"% aplicado",timer:"Cupón caduca en "+time,note:"(No aplica para vuelos y extras)"};
  }
  function fmt(ms) {
    const seconds=Math.max(0,Math.ceil(ms/1000));
    return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(v=>String(v).padStart(2,"0")).join(":");
  }
  function refresh() {
    if(!state.data)return;
    const expires=new Date(state.data.expiresAt).getTime();
    const remaining=expires-Date.now(),lang=textSet(state.data.discountPercent,fmt(remaining));
    const node=document.getElementById("mct-bf26-badge");
    if(!node)return;
    node.querySelector("[data-bf-title]").textContent=lang.header;
    node.querySelector("[data-bf-timer]").textContent=lang.timer;
    node.querySelector("[data-bf-note]").textContent=lang.note;
    const detail=node.querySelector("[data-bf-savings]");
    const money=new Intl.NumberFormat(lang.startsWith("en")?"en-US":"es-PE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(state.data.discountAmount||0);
    detail.textContent=lang.startsWith("en")?"You save "+(state.data.currency||"USD")+" "+money:
      lang.startsWith("pt")?"Você economiza "+(state.data.currency||"USD")+" "+money:
        "Ahorras "+(state.data.currency||"USD")+" "+money;
    node.classList.toggle("is-expired",remaining<=0);
    if(remaining<=0)clearInterval(state.timer);
  }
  function place() {
    if(!state.data||!state.selector)return;
    const anchor=document.querySelector(state.selector);
    if(!anchor||!anchor.parentNode||document.getElementById("mct-bf26-badge"))return;
    const box=document.createElement("div");
    box.id="mct-bf26-badge";box.className="mct-bf26-wrap";
    box.innerHTML='<div class="mct-bf26-glow"><strong data-bf-title></strong><span data-bf-savings></span><span data-bf-timer></span></div><p class="mct-bf26-note" data-bf-note></p>';
    anchor.insertAdjacentElement("afterend",box);
    refresh();
  }
  function mount(selector,result,options={}) {
    if(result?.campaign!=="black_friday_2026") {clear();return;}
    clear();
    state.selector=selector;
    state.data={expiresAt:result.expiresAt,discountPercent:Number(result.discountPercent??result.value??0),
      discountAmount:Number(options.discountAmount??result.discountAmount??0),currency:options.currency||result.currency||"USD"};
    place();
    state.observer=new MutationObserver(place);
    state.observer.observe(document.body,{childList:true,subtree:true});
    state.timer=setInterval(refresh,1000);
  }
  function clear() {
    if(state.timer)clearInterval(state.timer);
    if(state.observer)state.observer.disconnect();
    state.selector="";state.data=null;state.timer=null;state.observer=null;
    document.getElementById("mct-bf26-badge")?.remove();
  }
  window.MCTBlackFridayBadge={mount,clear};
})();