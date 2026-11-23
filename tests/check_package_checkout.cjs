// Run with node tests/check_package_checkout.cjs. No external dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'google-apps-script/Code.gs'), 'utf8');
const helper = source.slice(source.indexOf('function validatePackageFare_('), source.indexOf('function createPreReservation_('));
const context = vm.createContext({
  normalizeCode_: value => String(value || '').trim().toUpperCase(),
  number_: (value, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; },
  round2_: value => Math.round(Number(value) * 100) / 100,
  validateCoupon_: ({couponCode, subtotal, travelDate}) => ({
    valid: couponCode === 'TESTBF' && travelDate === '2027-04-10',
    discountAmount: Math.round(Number(subtotal) * 0.4 * 100) / 100,
    message: 'Cupón inválido'
  })
});
vm.runInContext(helper, context);
const config = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/landing-paquetes-cusco.json')));
for (const p of config.packages) {
  for (const [adults, children] of [[1,0],[2,1],[1,3],[30,30]]) {
    const total = adults * p.catalogPriceUSD + children * p.childPriceUSD;
    const payload = { source:'landing-paquetes-cusco', productId:p.id, adults, children, currency:'USD', paymentMode:'full', accommodationIncluded:false, availabilityConfirmed:true, childEligibilityConfirmed:true, date:'2027-04-10', payNowValue:total, serviceTotalValue:total, payLaterValue:0, infants:0, totalPassengers:adults+children, pricing:{total,subtotal:total,discount:0} };
    assert.equal(context.validatePackageFare_(payload).total, total);
    // Validación de tarifas con Black Friday (40%) sin alterar el precio base.
    const discounted = Math.round(total * 0.6 * 100) / 100;
    const blackFriday = {...payload, couponCode:'TESTBF', payNowValue:discounted,
      pricing:{total:discounted, subtotal:total, discount:Math.round((total-discounted)*100)/100}};
    assert.equal(context.validatePackageFare_(blackFriday).total, discounted);
    assert.equal(context.validatePackageFare_({...blackFriday, payNowValue:1}).ok, false);
    assert.equal(context.validatePackageFare_({...blackFriday, couponCode:'INVALID'}).ok, false);
    for (const patch of [{adults:0},{adults:1.5},{children:-1},{children:31},{currency:'PEN'},{payNowValue:1},{serviceTotalValue:1},{accommodationIncluded:true},{availabilityConfirmed:false},{date:'invalid'},{productId:'unknown'},{payLaterValue:10}]) {
      assert.equal(context.validatePackageFare_({...payload,...patch}).ok,false,JSON.stringify(patch));
    }
    if (children) assert.equal(context.validatePackageFare_({...payload,childEligibilityConfirmed:false}).ok,false);
  }
}
assert.match(source,/action === 'validatePackageFare'/);
assert.match(source,/const fareCheck = validatePackageFare_\(storedPackage\)/);
for(const p of config.packages) {
  const html=fs.readFileSync(path.join(root, 'landing',p.slug+'.html'),'utf8');
  assert.ok(!html.includes('quote-packages.html'));
  assert.ok(html.includes('Registrar reserva'));
  assert.ok(html.includes('No incluye alojamiento'));
  assert.ok(html.includes(`"childPrice": ${p.childPriceUSD}`));
}
console.log('PASS: 16 fare scenarios, tampered totals/counts/conditions rejected, four static checkouts and no quote navigation.');


// Las pruebas del motor independiente BF2026 están en check_bf26_100.cjs.
