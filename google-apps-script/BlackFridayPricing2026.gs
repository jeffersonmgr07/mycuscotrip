/**
 * MCT Black Friday 2026: authoritative fare verification before any payment.
 * Private Apps Script file; it fetches immutable *public price catalog* from
 * the My Cusco Trip website (NOT prices sent by the browser).
 * Keep the 3 backend files together: Code.gs, BlackFriday2026.gs, BlackFridayPricing2026.gs.
 * Failure closed: API/canonical pricing errors do not create discounted charges.
 */
function mctBfFareEqual_(actual,expected) {
  return isFinite(Number(actual)) && Math.abs(Math.round(Number(actual)*100)-Math.round(expected*100))<=1;
}
function mctBfCatalog2026_(filename,language) {
  const allowed = [
    'landing-machu-picchu-tours.json','landing-machu-picchu-overnight-tours.json',
    'tours-cusco.json','tours-peru.json','trekkings-cusco.json','tours-machu-picchu.json'
  ];
  if (allowed.indexOf(filename)<0) throw new Error('Catálogo fuera de los productos autorizados.');
  const lang = ['en','pt','it','de','fr'].indexOf(language)>=0?language:'es';
  const localized = lang!=='es' && filename.indexOf('landing-')===0;
  const path = '/assets/data/'+(localized?'i18n/'+lang+'/':'')+filename;
  const key = 'MCT_BF26_CATALOG_'+path;
  const cache = CacheService.getScriptCache();
  let json=cache.get(key);
  if (!json) {
    const url='https://mycuscotrip.com'+path;
    const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:true,validateHttpsCertificates:true});
    if(response.getResponseCode()!==200) throw new Error('Tarifas web temporalmente no disponibles. Inténtalo nuevamente.');
    json=response.getContentText();
    if(json.length<30||json.length>300000)throw new Error('Catálogo de tarifas no válido.');
    cache.put(key,json,120);
  }
  return JSON.parse(json);
}
function mctBfLandingLanguage_(p) {
  const path=String(p.landingPath||p.sourcePage||'');
  const match=path.match(/^\/(en|pt|it|de|fr)\//);
  return match?match[1]:'es';
}
function mctBfCheckoutPricing_(p) {
  const payload=p||{},currency=String(payload.currency||'USD').toUpperCase();
  if(currency!=='USD')return {ok:false,error:'Cotización Black Friday requiere validación de moneda.'};
  const fixedFare=payload.source==='landing-paquetes-cusco';
  if(fixedFare) {
    // validatePackageFare_ recalculates the correct complete fare and coupon.
    const fare=validatePackageFare_(payload);
    if(!fare.ok)return fare;
    if(!mctBfFareEqual_(payload.eligibleSubtotalValue, fare.baseTotal))
      return {ok:false,error:'La base elegible no coincide con la tarifa del paquete.'};
    return {ok:true,serviceTotal:fare.baseTotal,eligible:fare.baseTotal,kind:'fixed_package'};
  }
  const source=String(payload.landingId||payload.source||'');
  if(source==='machu-picchu-y-tours-peru' ||
     source==='machu-picchu-overnight-y-tours-peru') {
    const overnight=source==='machu-picchu-overnight-y-tours-peru';
    const filename=overnight?'landing-machu-picchu-overnight-tours.json':'landing-machu-picchu-tours.json';
    const data=mctBfCatalog2026_(filename,mctBfLandingLanguage_(payload));
    const main=data.mainProduct,adults=Number(payload.adults),children=Number(payload.children),
      infants=Number(payload.infants||0);
    if(!Number.isInteger(adults)||adults<1||adults>30||
       !Number.isInteger(children)||children<0||children>30||
       !Number.isInteger(infants)||infants<0||infants>30||
       adults+children+infants!==Number(payload.totalPassengers))
      return {ok:false,error:'Número de viajeros no válido.'};
    if(!Array.isArray(payload.services)||payload.services.length<1||payload.services.length>20)
      return {ok:false,error:'Selección de servicios incompleta.'};
    const services=payload.services,seen={};
    for(const service of services){
      const id=String(service.id||service.productId||'');
      if(!id||seen[id])return {ok:false,error:'Servicios duplicados o no válidos.'};
      seen[id]=true;
    }
    const mainService=services.find(s=>String(s.id||s.productId)===main.id);
    if(!mainService||String(mainService.date)!==String(payload.date))
      return {ok:false,error:'Fecha o excursión principal incorrecta.'};
    const config=mainService.configuration||{},pax=adults+children;
    const circuit=(main.circuitSelection.options||[]).find(x=>x.id===config.circuitId);
    if(!circuit||circuit.enabled===false||(circuit.unavailableRanges||[]).some(r=>payload.date>=r.from&&payload.date<=r.to))
      return {ok:false,error:'Circuito no disponible para la fecha.'};
    const outward=(main.trainSelection.outbound||[]).find(x=>x.id===config.outboundTrainId);
    const backward=(main.trainSelection.return||[]).find(x=>x.id===config.returnTrainId);
    if(!outward||!backward)return {ok:false,error:'Selección de tren no válida.'};
    const bundle=(main.trainSelection.bundles||[]).find(b=>b.outboundId===outward.id&&b.returnId===backward.id);
    if(String(config.trainBundleId||'')!==String(bundle?.id||''))
      return {ok:false,error:'Tren combinado no coincide con los servicios.'};
    const supplementAdults=Number(bundle?bundle.adultSupplement:Number(outward.adultSupplement||0)+Number(backward.adultSupplement||0));
    const supplementChildren=Number(bundle?bundle.childSupplement:Number(outward.childSupplement||0)+Number(backward.childSupplement||0));
    const meal=(main.mealOptions||[]).find(x=>x.id===(config.mealOptionId||'no-meal'));
    if(!meal)return {ok:false,error:'Selección de alimentación incorrecta.'};
    let hotelSupplement=0;
    if(overnight){
      const hotel=(main.hotelSelection.options||[]).find(x=>x.id===config.hotelId);
      if(!hotel||hotel.available===false)return {ok:false,error:'Hotel no disponible.'};
      hotelSupplement=Math.max(1,Math.ceil(Math.max(1,pax)/Math.max(1,Number(hotel.roomCapacity||2))))*
        Number(hotel.supplementPerRoom||0);
    }
    let eligible=adults*Number(main.adultPrice)+children*Number(main.childPrice);
    let total=eligible+(supplementAdults*adults)+(supplementChildren*children)+
      Number(circuit.groupSupplement||0)+Number(meal.pricePerPerson||0)*pax+hotelSupplement;
    if(!mctBfFareEqual_(mainService.lineTotal,total))
      return {ok:false,error:'La tarifa principal no coincide con los trenes, circuito o servicios seleccionados.'};
    for(const service of services){
      const id=String(service.id||service.productId||'');
      if(id===main.id)continue;
      const addon=(data.addons||[]).find(x=>x.id===id);
      if(!addon||!/^\d{4}-\d{2}-\d{2}$/.test(String(service.date||'')))
        return {ok:false,error:'Tour complementario no disponible.'};
      const includedExtras=Array.isArray(service.extras)?service.extras:[];
      if(new Set(includedExtras).size!==includedExtras.length)
        return {ok:false,error:'Servicios adicionales duplicados.'};
      const addonsTotal=includedExtras.reduce(function(sum,extraId){
        const extra=(addon.extras||[]).find(x=>x.id===extraId);
        if(!extra)throw new Error('Extra no reconocido en el catálogo del tour.');
        return sum+Number(extra.pricePerPerson||0)*pax;
      },0);
      const addonBase=Number(addon.pricePerPerson||0)*pax;
      if(!mctBfFareEqual_(service.lineTotal,addonBase+addonsTotal))
        return {ok:false,error:'Tarifa del tour complementario incorrecta.'};
      eligible+=addonBase;total+=addonBase+addonsTotal;
    }
    if(!mctBfFareEqual_(payload.eligibleSubtotalValue,eligible) ||
       !mctBfFareEqual_(payload.serviceTotalValue,total) ||
       (payload.pricing&&!mctBfFareEqual_(payload.pricing.subtotal,total)))
      return {ok:false,error:'Los totales de la reserva no coinciden con las tarifas oficiales.'};
    return {ok:true,kind:'mapi_landing',serviceTotal:Math.round(total*100)/100,
      eligible:Math.round(eligible*100)/100,source:source};
  }
  // Simple tours without upgrades: allow payment when the total is exactly
  // the public authoritative base fare, not a value invented in the browser.
  const noExtras=(!payload.selectedExtraCodes||payload.selectedExtraCodes.length===0) &&
    !payload.selectedPackageExtraCodes?.length;
  const trainIds=payload.selectedTrainIds||{};
  const noTrainUpgrades=!trainIds.outbound&&!trainIds.return;
  if(noExtras&&noTrainUpgrades&&!payload.selectedHotelsByDestination) {
    const id=String(payload.productId||'');
    if(!id)return {ok:false,error:'Falta identificar el tour.'};
    for(const file of ['tours-cusco.json','tours-peru.json','trekkings-cusco.json','tours-machu-picchu.json']){
      const catalog=mctBfCatalog2026_(file,'es');
      const items=catalog.products||catalog.tours||[];
      const product=items.find(x=>String(x.id)===id);
      if(!product)continue;
      const adults=Number(payload.adults),children=Number(payload.children);
      if(!Number.isInteger(adults)||adults<1||adults>30||!Number.isInteger(children)||children<0||children>30)
        return {ok:false,error:'Cantidad de viajeros no válida.'};
      const base=adults*Number(product.basePricing?.adult||0)+children*Number(product.basePricing?.child??product.basePricing?.adult??0);
      if(!base||!mctBfFareEqual_(payload.serviceTotalValue,base)||
        !mctBfFareEqual_(payload.eligibleSubtotalValue,base))
        return {ok:false,error:'La cotización personalizada necesita confirmar su tarifa antes del pago.'};
      return {ok:true,kind:'simple_tour',serviceTotal:Math.round(base*100)/100,eligible:Math.round(base*100)/100};
    }
  }
  return {ok:false,error:'Esta selección requiere una cotización verificada por un asesor antes de aplicar el descuento al pago.'};
}
