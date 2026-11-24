"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname,"..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const es = read("black-friday.html");
const en = read("en/black-friday.html");
const script = read("assets/js/black-friday-claim.js");
const header = read("assets/js/components/header.js");

assert.match(es, /<html lang="es">/);
assert.match(en, /<html lang="en">/);
assert.match(en, /rel="canonical" href="https:\/\/mycuscotrip\.com\/en\/black-friday\.html"/);
assert.match(es, /hreflang="en" href="https:\/\/mycuscotrip\.com\/en\/black-friday\.html"/);
assert.match(en, /hreflang="es" href="https:\/\/mycuscotrip\.com\/black-friday\.html"/);
assert.match(en, /window\.MCT_LOCALE="en"/);
assert.match(header, /const prefix = targetLang === "es" \? basePath : /);
for (const part of [
  "YOUR ADVENTURE STARTS HERE",
  "Your next adventure in Cusco deserves something",
  "Claim your coupon",
  "First name",
  "Last name",
  "Email address",
  "WhatsApp number",
  "Choose your country",
  "privacy policy",
  "Claim my coupon",
  "Verification code",
  "Verify and receive my coupon",
  "Resend code",
  "Change email",
  "Your coupon is ready!",
  "Explore tours",
  "Copy my coupon"
]) {
  assert.ok(en.includes(part), "Missing English text: "+part);
}
const ids = [...es.matchAll(/\bid="(bf-[a-z-]+)"/g)].map(x=>x[1]).sort();
const idsEn = [...en.matchAll(/\bid="(bf-[a-z-]+)"/g)].map(x=>x[1]).sort();
assert.deepEqual(idsEn,ids,"English and Spanish must use the same form IDs");
assert.match(en, /href="\.\/machu-picchu-tours\.html"/, "English CTA must go to local English tours");
assert.ok(fs.existsSync(path.join(root,"en/machu-picchu-tours.html")), "English tours destination must exist");
assert.match(en, /href="\.\.\/pages\/legales\/politica-privacidad\.html\?lang=en"/);
assert.ok(fs.existsSync(path.join(root,"pages/legales/politica-privacidad.html")));
for (const m of en.matchAll(/(?:href|src)="(\.\.\/(?:assets|public)\/[^"]+)"/g)) {
  const resource = m[1].split("?")[0].split("#")[0];
  assert.ok(fs.existsSync(path.resolve(root,"en",resource)), "Missing English page asset: "+resource);
}
for (const m of en.matchAll(/(?:href|src)="(\.\/[^"]+\.html)"/g)) {
  assert.ok(fs.existsSync(path.resolve(root,"en",m[1])), "Missing English local link: "+m[1]);
}
assert.match(script, /const isEnglish = /);
assert.match(script, /backendMessagesEn/);
assert.match(script, /Sending verification code/);
assert.match(script, /Incorrect verification code/);
assert.match(script, /new Intl\.DisplayNames\(\["en"\]/);
assert.match(script, /Coupon assigned!/);
assert.match(script, /Coupon copied/);
assert.match(en, /id="bf-registration"/);
assert.match(en, /id="bf-verify"/);
assert.match(en, /id="bf-success"/);
assert.match(en, /black-friday-claim\.js\?v=20261124-en1/);
assert.match(es, /black-friday-claim\.js\?v=20261124-en1/);
console.log("PASS: English Black Friday page, form, SEO, translated OTP messages, shared styles and working ES↔EN routes.");
