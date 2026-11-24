"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname,"..","assets/js/components/black-friday-badge.js"),"utf8");
let clock = Date.parse("2026-11-24T00:00:00-05:00");
class TestDate extends Date { static now() { return clock; } }

let liveNode = null;
let activeTimer = null;
let timerCleared = false;
let observed = false;
const language = {lang:"es"};
const elements = {};
function createBox() {
  const values = {};
  const states = new Set();
  const node = {
    id:"",
    className:"",
    innerHTML:"",
    querySelector(selector) {
      if (!values[selector]) values[selector] = {textContent:""};
      return values[selector];
    },
    classList: {
      toggle(name, enabled) {
        if (enabled) states.add(name);
        else states.delete(name);
      },
      contains(name) {return states.has(name);}
    },
    remove() {liveNode = null;}
  };
  node.values = values;
  return node;
}
const anchor = {parentNode:{},insertAdjacentElement(position,box) {
  assert.equal(position,"afterend");
  liveNode = box;
}};
const doc = {
  documentElement:language,body:{},
  getElementById(id) {return id==="mct-bf26-badge"?liveNode:null;},
  querySelector(selector) {return selector==="#discountMessage"?anchor:null;},
  createElement(tag) {assert.equal(tag,"div");return createBox();}
};
const sandbox = {
  window:{},document:doc,Date:TestDate,Intl,
  setInterval(fn,ms) {assert.equal(ms,1000);activeTimer=fn;timerCleared=false;return 1;},
  clearInterval() {activeTimer=null;timerCleared=true;},
  MutationObserver:class {
    constructor(fn) {this.fn=fn;}
    observe() {observed=true;}
    disconnect() {observed=false;}
  }
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const component=sandbox.window.MCTBlackFridayBadge;
assert.equal(typeof component.mount,"function");
const expiresAt = new Date(clock + 5*3600000).toISOString();
const claim={campaign:"black_friday_2026",discountPercent:20,discountAmount:49.5,
  currency:"USD",expiresAt};
component.mount("#discountMessage",claim);
assert.ok(activeTimer,"countdown must schedule every second");
assert.ok(observed);
assert.match(liveNode.innerHTML,/data-bf-timer-label/);
assert.match(liveNode.innerHTML,/data-bf-timer-value/);
function read(key) {return liveNode.querySelector("[data-bf-"+key+"]").textContent;}
assert.equal(read("title"),"Descuento del 20% aplicado");
assert.equal(read("timer-label"),"Cupón caduca en");
assert.equal(read("timer-value"),"05:00:00");
clock+=1000;
activeTimer();
assert.equal(read("timer-value"),"04:59:59","timer must decrement, not freeze");
clock+=60000;
activeTimer();
assert.equal(read("timer-value"),"04:58:59");
component.mount("#discountMessage",claim);
assert.equal(read("timer-value"),"04:58:59","reapplying cannot restart five hours");
language.lang="en";
activeTimer();
assert.equal(read("title"),"20% discount applied");
assert.equal(read("timer-label"),"Coupon expires in");
language.lang="pt-BR";
activeTimer();
assert.equal(read("title"),"Desconto de 20% aplicado");
assert.equal(read("timer-label"),"Cupom expira em");
clock=Date.parse(expiresAt)+1000;
activeTimer();
assert.equal(read("timer-value"),"00:00:00");
assert.equal(liveNode.classList.contains("is-expired"),true);
assert.equal(timerCleared,true);
component.clear();
assert.equal(liveNode,null);
assert.equal(observed,false);
console.log("PASS: Black Friday badge renders compact labels, correct language, ticks every second and preserves original server expiry.");
