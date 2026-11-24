"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const src=fs.readFileSync(path.join(root,"google-apps-script/BlackFridayPricing2026.gs"),"utf8");
const cache={};
const vmContext={
  CacheService:{getScriptCache(){return {get:k=>cache[k]||null,put(k,v){cache[k]=v;}};}},
  UrlFetchApp:{fetch(url){
    const prefix="https://mycuscotrip.com/";
    assert.ok(url.startsWith(prefix));
    const file=path.join(root,url.slice(prefix.length));
    return {getResponseCode:()=>200,getContentText:()=>fs.readFileSync(file,"utf8")};
  }},
  validatePackageFare_(p){
    const fares={pkg_cusco_3d2n:[499,479],pkg_cusco_4d3n:[569,539],
      pkg_cusco_5d4n:[629,599],pkg_cusco_6d5n:[699,669]};
    const fare=fares[p.productId];const base=fare[0]*p.adults+fare[1]*p.children;
    return {ok:true,total:base-(p.discountAmount||0),baseTotal:base};
  }
};
vm.createContext(vmContext);vm.runInContext(src,vmContext);
const check=p=>vmContext.mctBfCheckoutPricing_(p);
function data(name,lang="es"){
  const prefix=lang==="es"?"assets/data/":"assets/data/i18n/"+lang+"/";
  return JSON.parse(fs.readFileSync(path.join(root,prefix+name),"utf8"));
}
function fullDay(lang="es"){
  const model=data("landing-machu-picchu-tours.json",lang),main=model.mainProduct;
  const base=2*main.adultPrice+main.childPrice;
  const date="2027-03-21";
  const config={circuitId:"circuit-2",outboundTrainId:"voyager-outbound",returnTrainId:"voyager-return",trainBundleId:"",mealOptionId:"no-meal"};
  const service={id:main.id,date,configuration:config,lineTotal:base};
  const payload={source:model.landingId,landingId:model.landingId,landingPath:lang==="es"?"/landing/machu-picchu-y-tours-peru.html":"/"+lang+"/landing/machu-picchu-y-tours-peru.html",
    adults:2,children:1,infants:0,totalPassengers:3,date,currency:"USD",
    serviceTotalValue:base,eligibleSubtotalValue:base,services:[service],pricing:{subtotal:base}};
  return {model,payload};
}
const es=fullDay("es"),pt=fullDay("pt");
assert.equal(check(es.payload).ok,true);
assert.equal(check(pt.payload).ok,true);
assert.equal(check(es.payload).eligible,1213.9);
assert.equal(check(pt.payload).eligible,1135.7);
assert.equal(check({...es.payload,serviceTotalValue:100}).ok,false,"cannot undercharge official base");
assert.equal(check({...es.payload,eligibleSubtotalValue:1}).ok,false,"cannot modify eligible base");
assert.equal(check({...es.payload,services:[{...es.payload.services[0],lineTotal:1}]}).ok,false,"line tampering rejected");
const add=es.model.addons.find(x=>x.id==="paracas-ica-huacachina");
const addonBase=add.pricePerPerson*3,extra=20*3,added=addonBase+extra;
const upgraded={...es.payload,services:[...es.payload.services,{
  id:add.id,date:"2027-03-25",extras:["lunch"],lineTotal:added
}],serviceTotalValue:es.payload.serviceTotalValue+added,
eligibleSubtotalValue:es.payload.eligibleSubtotalValue+addonBase,
pricing:{subtotal:es.payload.serviceTotalValue+added}};
const checked=check(upgraded);assert.equal(checked.ok,true,checked.error);
assert.equal(checked.eligible,es.payload.eligibleSubtotalValue+addonBase);
assert.equal(check({...upgraded,services:[upgraded.services[0],{...upgraded.services[1],extras:["unlisted"]}]}).ok,false);
const overnight=data("landing-machu-picchu-overnight-tours.json");
const overnightMain=overnight.mainProduct;
const c=overnightMain.circuitSelection.options.find(x=>x.id==="circuit-1");
const combo=overnightMain.trainSelection.bundles.find(x=>x.id==="prime-early-bundle");
const hotel=overnightMain.hotelSelection.options.find(x=>x.id==="vista-machu-picchu");
const meal=overnightMain.mealOptions.find(x=>x.id==="tinkuy-buffet");
const base=2*overnightMain.adultPrice+1*overnightMain.childPrice;
const total=base+Number(c.groupSupplement)+(2*combo.adultSupplement+combo.childSupplement)+
  3*meal.pricePerPerson+2*hotel.supplementPerRoom;
const overnightPayload={source:overnight.landingId,landingId:overnight.landingId,
 landingPath:"/landing/machu-picchu-overnight-y-tours-peru.html",
 adults:2,children:1,infants:0,totalPassengers:3,date:"2027-03-22",currency:"USD",
 serviceTotalValue:total,eligibleSubtotalValue:base,pricing:{subtotal:total},
 services:[{id:overnightMain.id,date:"2027-03-22",lineTotal:total,configuration:{
  circuitId:c.id,outboundTrainId:combo.outboundId,returnTrainId:combo.returnId,
  trainBundleId:combo.id,hotelId:hotel.id,mealOptionId:meal.id
 }}]};
const oc=check(overnightPayload);
assert.equal(oc.ok,true,oc.error);
assert.equal(oc.eligible,base);
assert.equal(check({...overnightPayload,serviceTotalValue:total-20}).ok,false);
for(const [id,adult,child] of [["pkg_cusco_3d2n",499,479],["pkg_cusco_6d5n",699,669]]) {
  const base=2*adult+child;
  const o=check({source:"landing-paquetes-cusco",productId:id,adults:2,children:1,
    currency:"USD",eligibleSubtotalValue:base});
  assert.equal(o.ok,true);
  assert.equal(o.serviceTotal,base);
}
const simple=data("tours-cusco.json").products[0];
const simplePrice=simple.basePricing.adult*2;
const sr=check({productId:simple.id,adults:2,children:0,currency:"USD",
  serviceTotalValue:simplePrice,eligibleSubtotalValue:simplePrice});
assert.equal(sr.ok,true,sr.error);
assert.equal(check({productId:simple.id,adults:2,children:0,currency:"USD",
  serviceTotalValue:1,eligibleSubtotalValue:1}).ok,false);
console.log("PASS: canonical MCT Black Friday prices; Full Day ES/PT, Overnight upgrades, addons, fixed packages, simple tours and tampering.");
