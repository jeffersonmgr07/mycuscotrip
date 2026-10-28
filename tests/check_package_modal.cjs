// NODE_PATH=/path/to/jsdom/node_modules node tests/check_package_modal.cjs
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const config=JSON.parse(fs.readFileSync(path.join(root,'assets/data/landing-paquetes-cusco.json')));
async function run(product,saveFailure=false,collision=false){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'landing',product.slug+'.html'),'utf8'),{url:'https://mycuscotrip.com/landing/'+product.slug+'.html',runScripts:'outside-only'});const w=dom.window,d=w.document,calls=[];
 w.CSS={escape:String};w.fetch=async()=>({ok:true,json:async()=>[{code:'PE',name:'Perú',dialCode:'+51'}]});
 let calendarOptions;
 w.flatpickr=(input,options)=>{calendarOptions=options};w.flatpickr.l10ns={es:{}};
 w.MyCuscoTripApiClient={isBackendEnabled:async()=>true,createPreReservation:async p=>{calls.push(['save',structuredClone(p)]);if(collision&&calls.filter(x=>x[0]==='save').length===1)return {ok:false,error:'Ya existe una reserva con ese código. Intenta nuevamente.'};return saveFailure?{ok:false,error:'backend unavailable'}:{ok:true,code:p.code}},createPayPalOrder:async p=>{calls.push(['paypal',p]);return {ok:false,error:'simulated payment error'}}};
 for(const file of ['assets/js/components/package-passenger-fields.js','assets/js/pages/landing-paquetes-cusco.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,0));
 assert.equal(calendarOptions.disableMobile,true);assert.equal(calendarOptions.dateFormat,'Y-m-d');
 const f=d.getElementById('package-quote-form'),modal=d.getElementById('passengerReservationModal');
 assert.equal(d.getElementById('package-total').textContent,`US$${(product.catalogPriceUSD*2).toFixed(2)}`);
 d.querySelector('[data-count="adults"][data-step="-1"]').click();assert.equal(f.elements.adults.value,'1');assert.equal(d.querySelector('[data-count="adults"][data-step="-1"]').disabled,true);
 d.querySelector('[data-count="adults"][data-step="1"]').click();d.querySelector('[data-count="children"][data-step="1"]').click();
 f.elements.start.value='2027-05-01';f.elements.confirmed.checked=true;f.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(modal.hidden,false);assert.equal(calls.length,0);assert.match(d.getElementById('passengerReservationCode').textContent,/^CUZ[0-9A-F]{6}$/);assert.ok(modal.querySelector('.passenger-modal__body > .passenger-modal__important'));assert.equal(modal.querySelector('.passenger-modal__header .passenger-modal__important'),null);
 const pf=d.getElementById('passengerReservationForm');
 for(const [k,v] of Object.entries({holderFirstName:'Test',holderLastName:'Traveler',holderDocumentType:'passport',holderDocumentNumber:'TEST123',holderNationality:'Perú',holderBirthdate:'1990-01-01',holderWhatsapp:'999999999',holderWhatsappCountryCode:'+51',holderEmail:'test@example.com'}))pf.elements.namedItem(k).value=v;
 pf.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(d.getElementById('passengerCheckoutReview').hidden,false);assert.equal(calls.length,0);
 pf.dispatchEvent(new w.Event('submit',{cancelable:true}));pf.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));
 assert.equal(calls.filter(x=>x[0]==='save').length,collision?2:1);const payload=calls[0][1];assert.equal(payload.payNowValue,product.catalogPriceUSD*2+product.childPriceUSD);assert.equal(payload.passengers.length,3);assert.equal(payload.holder.firstName,'Test');assert.equal(payload.accommodationIncluded,false);
 assert.equal(calls.filter(x=>x[0]==='paypal').length,saveFailure?0:1);
 if(!saveFailure){pf.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(calls.filter(x=>x[0]==='save').length,collision?2:1);assert.equal(calls.filter(x=>x[0]==='paypal').length,2);}
 assert.equal(pf.querySelector('[type="submit"]').disabled,false);d.getElementById('closePassengerModalBtn').click();assert.equal(modal.hidden,true);assert.equal(d.activeElement.id,'package-pay');dom.window.close();
}
(async()=>{for(const p of config.packages){await run(p);await run(p,true);await run(p,false,true)}console.log('PASS: four modal flows, custom calendar, steppers, totals, holder/passengers, two-step review, backend error, duplicate submit and retry.');})().catch(e=>{console.error(e);process.exit(1)});
