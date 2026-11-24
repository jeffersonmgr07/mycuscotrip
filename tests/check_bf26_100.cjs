"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const src=fs.readFileSync(path.resolve(__dirname,"../google-apps-script/BlackFriday2026.gs"),"utf8");
let clock=Date.parse("2026-11-23T15:00:00-05:00"),locked=false;
class TestDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
const db={};
class FakeSheet {
 constructor(){this.rows=[];}
 getRange(row,col,n=1,m=1){const self=this;return {
  getValues(){return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>self.rows[row+i-1]?.[col+j-1]??""));},
  setValues(values){for(let i=0;i<n;i++){const at=row+i-1;while(self.rows.length<=at)self.rows.push([]);for(let j=0;j<m;j++)self.rows[at][col+j-1]=values[i][j];}return this;},
  setValue(value){return this.setValues([[value]]);},
  setFontWeight(){return this;},setBackground(){return this;},setFontColor(){return this;}};}
 getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};}
 appendRow(row){this.rows.push(row.slice());}
 getLastRow(){return this.rows.length;}
 setFrozenRows(){}
}
const sheet={getSheetByName:n=>db[n]||null,insertSheet:n=>(db[n]=new FakeSheet())},props={},mails=[];
const context={
 Date:TestDate,SPREADSHEET_ID:"testing",
 SpreadsheetApp:{openById:()=>sheet},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty(k,v){props[k]=v;}})},
 LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false,"nested lock");locked=true;},releaseLock(){locked=false;}})},
 MailApp:{getRemainingDailyQuota:()=>500,sendEmail:m=>mails.push(m)},
 Utilities:{getUuid:()=>crypto.randomUUID(),
  computeDigest:(algo,value)=>Array.from(crypto.createHash("sha256").update(String(value)).digest()).map(x=>x>127?x-256:x),
  DigestAlgorithm:{SHA_256:"SHA_256"},Charset:{UTF_8:"UTF_8"},
  formatDate:(date,tz)=>{const a=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date).map(x=>[x.type,x.value]));return a.year+"-"+a.month+"-"+a.day;}},
 Logger:{log(){}},console
};
vm.createContext(context);vm.runInContext(src,context);
assert.equal(context.prepararCampanaBlackFridayMCT().total,100);
assert.equal(context.prepararCampanaBlackFridayMCT().creadosAhora,0);
const rows=db.MCT_BF26_Cupones.rows.slice(1);
assert.equal(new Set(rows.map(r=>r[0])).size,100);
assert.equal(new Set(rows.map(r=>r[1])).size,100);
assert.equal(rows.filter(r=>r[2]==="MANUAL").length,20);
assert.equal(rows.filter(r=>r[2]==="AUTOMATICO").length,80);
rows.forEach(r=>{assert.match(r[1],/^MCT26-(?:[A-HJ-NP-Z2-9]{4}-){3}[A-HJ-NP-Z2-9]{4}$/);
 assert.equal(crypto.createHash("sha256").update(r[1]).digest("hex"),r[0]);});
const base=Date.UTC(2026,10,23);
for(const [days,pct] of [[0,10],[30,10],[31,20],[60,20],[61,30],[75,30],[76,40],[100,40],[101,50]]){
 const date=new Date(base+days*86400000).toISOString().slice(0,10);
 assert.equal(context.mctBfRate_(date,clock).percent,pct,"day "+days);
}
const claim={firstName:"Marta",lastName:"Reyes",email:"MARTA@example.com",countryCode:"+51",whatsapp:"900608980",privacyAccepted:true,marketingAccepted:false,honeypot:""};
assert.equal(context.mctBfLeadStart_(claim).ok,true);
const otp=mails.at(-1).body.match(/\b\d{6}\b/)[0];
assert.equal(context.mctBfLeadVerify_({email:claim.email,otp:"000000"}).ok,false);
const code=context.mctBfLeadVerify_({email:claim.email,otp}).code;
assert.match(code,/^MCT26-/);
clock+=61000;
assert.equal(context.mctBfLeadStart_(claim).ok,true);
const otp2=mails.at(-1).body.match(/\b\d{6}\b/)[0];
assert.equal(context.mctBfLeadVerify_({email:claim.email,otp:otp2}).code,code);
assert.equal(db.MCT_BF26_Cupones.rows.filter(r=>r[4]==="marta@example.com").length,1);
const date="2027-04-05",input={couponCode:code,date,subtotal:400,eligibleSubtotal:300};
assert.equal(context.mctBfValidate_(input,false).valid,false);
const applied=context.mctBfValidate_(input,true);
assert.equal(applied.valid,true);assert.equal(applied.discountPercent,50);assert.equal(applied.discountAmount,150);
clock+=3600000;
assert.equal(context.mctBfValidate_(input,true).expiresAt,applied.expiresAt);
assert.equal(context.mctBfReserve_(code,"CUZ001","other@example.com",date,300,400,"USD").valid,false);
assert.equal(context.mctBfReserve_(code,"CUZ001","marta@example.com",date,300,400,"USD").valid,true);
assert.equal(context.mctBfReserve_(code,"CUZ002","marta@example.com",date,300,400,"USD").valid,false);
context.mctBfBindOrder_(code,"CUZ001","PAYPAL001");
assert.equal(context.mctBfConsume_(code,"CUZ001","CAPTURE001").used,true);
assert.equal(context.mctBfConsume_(code,"CUZ001","CAPTURE001").alreadyUsed,true);
assert.throws(()=>context.mctBfConsume_(code,"CUZ002","CAPTURE002"));
const manual=rows.find(r=>r[2]==="MANUAL")[1];
assert.equal(context.mctBfAdminAsignarManual(manual,"manual@example.com","Cliente Manual").ok,true);
assert.equal(context.mctBfAdminPorcentajeFijo(manual,35).fijo,35);
assert.equal(context.mctBfValidate_({couponCode:manual,date,subtotal:400,eligibleSubtotal:300},true).discountPercent,35);
const available=db.MCT_BF26_Cupones.rows.slice(1).find(r=>r[2]==="AUTOMATICO"&&r[3]==="DISPONIBLE")[1];
clock=Date.parse("2026-11-29T23:30:00-05:00");
const capped=context.mctBfValidate_({couponCode:available,date,subtotal:400},true);
assert.equal(capped.expiresAt,"2026-11-30T04:59:59.000Z");
clock=Date.parse("2026-11-30T00:00:00-05:00");
assert.equal(context.mctBfValidate_({couponCode:available,date,subtotal:400},true).valid,false);
console.log("PASS: 100 unique 20/80, OTP, repeat registration, tiers, 5h activation, fixed discount, locks, idempotence and campaign expiry");
