#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");

const source=fs.readFileSync(path.resolve(__dirname,"../google-apps-script/Code.gs"),"utf8");
const begin=source.indexOf("function validateCusco5d4nFixedFare_(");
const end=source.indexOf("\nfunction createPreReservation_",begin);
assert.ok(begin>0 && end>begin,"Falta validador fijo en Code.gs");
const validatorSource=source.slice(begin,end);
const validatorFactory=new Function("getProp_","round2_","number_",validatorSource+"\nreturn validateCusco5d4nFixedFare_;");
const round=x=>Math.round((x+Number.EPSILON)*100)/100;
const num=(x,fall=0)=>Number.isFinite(Number(x))?Number(x):fall;
const validate=(data,enabled=true)=>validatorFactory((_,fallback)=>enabled?"true":fallback,round,num)(data);
const depart=new Date(Date.now()+20*24*3600*1000).toISOString().slice(0,10);
const base={source:"cusco-5d4n-unico",productId:"MCT-CUSCO-5D4N-UNICO",
  date:depart,currency:"PEN",paymentMode:"full",paymentProvider:"mercado_pago",
  accommodationIncluded:true,adults:2,children:0,totalPassengers:2,infants:0,
  selectedHotel:"cusco-boutique-3s",roomAllocation:{doubles:1,triples:0},
  extraCode:"",serviceTotalValue:1459.80,payNowValue:1459.80,payLaterValue:0,
  pricing:{total:1459.80,subtotal:1459.80,discount:0}};
function priced(data, amount){return {...base,...data,serviceTotalValue:amount,payNowValue:amount,pricing:{total:amount,subtotal:amount,discount:0}};}
const examples=[
  ["2 adultos · Boutique",base,1459.80],
  ["2 adultos · Royal Qosqo",priced({selectedHotel:"royal-qosqo-3s"},1684.80),1684.80],
  ["2 adultos · Royal + panorámico",priced({selectedHotel:"royal-qosqo-3s",extraCode:"panoramico"},1744.80),1744.80],
  ["3 viajeros · habitación triple",priced({adults:3,totalPassengers:3,roomAllocation:{doubles:0,triples:1}},2189.70),2189.70]
];
for(const [title,request,amount] of examples){const result=validate(request);assert.equal(result.ok,true,title+": "+result.error);assert.equal(result.total,amount,title);console.log("OK",title);}
for(const [title,request] of [
  ["precio manipulado",{...base,payNowValue:5}],
  ["solo un viajero",{...base,adults:1,totalPassengers:1}],
  ["habitación insuficiente",{...base,roomAllocation:{doubles:0,triples:1}}],
  ["hotel no permitido",{...base,selectedHotel:"unknown-hotel"}],
  ["moneda equivocada",{...base,currency:"USD"}],
  ["extra no permitido",{...base,extraCode:"fake"}]
]) {assert.equal(validate(request).ok,false,title);console.log("RECHAZADO",title);}
assert.equal(validate(base,false).ok,false,"La compuerta de cobro debe bloquear sin activación.");
const frontend=fs.readFileSync(path.resolve(__dirname,"../assets/js/pages/cusco-5d4n-unico.js"),"utf8");
assert.ok(frontend.includes('api.postAction("validateCusco5d4nFare",payload)'),"Falta prevalidación obligatoria antes del checkout");
assert.ok(frontend.includes('api.createMercadoPagoPreference('),"Falta conexión al proveedor ya integrado");
console.log("OK: Casos y controles de checkout del paquete único.");
