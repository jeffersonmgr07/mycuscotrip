/**
 * My Cusco Trip · Black Friday 2026. Módulo PRIVADO de Apps Script.
 * No copiar a GitHub Pages ni publicar el inventario.
 * Utiliza el mismo Spreadsheet privado que Code.gs, pero dos hojas separadas.
 * Instalar este archivo JUNTO a Code.gs, no en lugar de Code.gs.
 */
var MCT_BF26 = Object.freeze({
  coupons: 'MCT_BF26_Cupones', leads: 'MCT_BF26_Registros',
  start: Date.parse('2026-11-23T00:00:00-05:00'),
  end: Date.parse('2026-11-30T00:00:00-05:00'),
  durationMs: 5 * 3600000, holdMs: 25 * 60000,
  timezone: 'America/Lima', manual: 20, auto: 80,
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  headers: ['HashSHA256','CodigoPrivado','Distribucion','Estado','CorreoAsignado','Cliente',
    'FechaEmision','PrimeraAplicacion','Vencimiento','PorcentajeFijo',
    'ReservaCodigo','ReservaBloqueadaHasta','OrdenPago','TransaccionPago',
    'FechaUso','Actualizado','Notas'],
  leadHeaders: ['Correo','Nombre','Apellido','CodigoPais','WhatsApp','Privacidad','Marketing',
    'OtpHash','OtpVence','OtpIntentos','UltimoEnvio','EnviosHoy','VerificadoEn',
    'CuponHash','CreadoEn','ActualizadoEn','DiaEnvios']
});
function mctBfClean_(value,max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max||300);
}
function mctBfSheetSafe_(value) {
  var s=mctBfClean_(value,260);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function mctBfEmail_(value) { return mctBfClean_(value,254).toLowerCase(); }
function mctBfCode_(value) { return mctBfClean_(value,40).toUpperCase(); }
function mctBfIsCode_(code) {
  return /^MCT26-(?:[A-HJ-NP-Z2-9]{4}-){3}[A-HJ-NP-Z2-9]{4}$/.test(mctBfCode_(code));
}
function mctBfHash_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8)
    .map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
}
function mctBfDateMs_(value) {
  if (!value) return 0;
  var d=value instanceof Date?value:new Date(value);
  var n=d.getTime();
  return isFinite(n)?n:0;
}
function mctBfToday_(time) {
  return Utilities.formatDate(new Date(time||Date.now()),MCT_BF26.timezone,'yyyy-MM-dd');
}
function mctBfInWindow_(time) {
  var now=time||Date.now();
  return now>=MCT_BF26.start && now<MCT_BF26.end;
}
function mctBfSheet_(name,headers) {
  var sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) {
    sheet=SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(name);
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#073b2b').setFontColor('#fff');
    sheet.setFrozenRows(1);
  } else {
    var current=sheet.getRange(1,1,1,headers.length).getValues()[0].map(String);
    if (current.join('|')!==headers.join('|')) throw new Error('Esquema de '+name+' diferente. Revisa la hoja antes de modificar.');
  }
  return sheet;
}
function mctBfCouponsSheet_() { return mctBfSheet_(MCT_BF26.coupons,MCT_BF26.headers); }
function mctBfLeadsSheet_() { return mctBfSheet_(MCT_BF26.leads,MCT_BF26.leadHeaders); }
function mctBfRows_(sheet) {
  var rows=sheet.getDataRange().getValues();
  return rows.length<2?[]:rows.slice(1).map(function(data,i){return {row:i+2,data:data};});
}
function mctBfFind_(code) {
  if(!mctBfIsCode_(code))throw new Error('Cupón no disponible.');
  var sheet=mctBfCouponsSheet_(),hash=mctBfHash_(mctBfCode_(code));
  var item=mctBfRows_(sheet).find(function(r){return r.data[0]===hash;});
  if(!item)throw new Error('Cupón no disponible.');
  return {sheet:sheet,row:item.row,data:item.data,hash:hash};
}
function mctBfCodeGenerate_() {
  var hex=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  var symbols='';
  for(var i=0;i<16;i++)symbols+=MCT_BF26.alphabet[parseInt(hex.slice(i*2,i*2+2),16)%32];
  return 'MCT26-'+symbols.match(/.{4}/g).join('-');
}
/** Ejecutar manualmente en Apps Script. No es un endpoint HTTP.
 * La operación es idempotente y genera 20 códigos manuales + 80 automáticos.
 */
function prepararCampanaBlackFridayMCT() {
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    var sh=mctBfCouponsSheet_();mctBfLeadsSheet_();
    var rows=mctBfRows_(sh),known={};
    rows.forEach(function(r){known[String(r.data[0])]=true;});
    var targets=[['MANUAL',MCT_BF26.manual],['AUTOMATICO',MCT_BF26.auto]];
    var created=0;
    targets.forEach(function(t) {
      var count=rows.filter(function(r){return String(r.data[2])===t[0];}).length;
      if(count>t[1])throw new Error('Inventario excedido para '+t[0]+'.');
      var batch=[];
      for(var i=count;i<t[1];i++) {
        var code,hash;
        do {code=mctBfCodeGenerate_();hash=mctBfHash_(code);}while(known[hash]);
        known[hash]=true;
        batch.push([hash,code,t[0],'DISPONIBLE','','',new Date(),'','','','','','','','',new Date(),'']);
      }
      if(batch.length)sh.getRange(sh.getLastRow()+1,1,batch.length,MCT_BF26.headers.length).setValues(batch);
      created+=batch.length;
    });
    var result={ok:true,total:mctBfRows_(sh).length,manual:MCT_BF26.manual,
      automaticos:MCT_BF26.auto,creadosAhora:created,hoja:MCT_BF26.coupons};
    Logger.log(JSON.stringify(result));return result;
  } finally {lock.releaseLock();}
}
/** Fecha base: día de primera aplicación en Perú, no fecha actual en visitas posteriores. */
function mctBfRate_(travelDate, appliedTime) {
  var day=String(travelDate||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Selecciona una fecha de viaje válida.');
  var p=day.split('-').map(Number),target=Date.UTC(p[0],p[1]-1,p[2]);
  if(new Date(target).toISOString().slice(0,10)!==day)throw new Error('Fecha de viaje inválida.');
  var base=mctBfToday_(appliedTime).split('-').map(Number);
  var days=Math.round((target-Date.UTC(base[0],base[1]-1,base[2]))/86400000);
  if(days<0)throw new Error('Selecciona una fecha de viaje futura.');
  return {days:days,percent:days<=30?10:days<=60?20:days<=75?30:days<=100?40:50};
}
function mctBfState_(v,now) {
  if(String(v[3])==='UTILIZADO')return 'UTILIZADO';
  if(String(v[3])==='BLOQUEADO')return 'BLOQUEADO';
  if(mctBfDateMs_(v[8]) && now>=mctBfDateMs_(v[8]))return 'VENCIDO';
  if(now>=MCT_BF26.end)return 'VENCIDO';
  if(v[10]&&(mctBfDateMs_(v[11])>now||Boolean(v[12])))return 'RESERVADO';
  if(v[7])return 'ACTIVO';
  if(v[4])return 'ASIGNADO';
  return 'DISPONIBLE';
}
function mctBfValidate_(params,activate) {
  var p=params||{},locale=String(p.locale||'es');
  var code=mctBfCode_(p.couponCode||p.code),now=Date.now();
  if(!mctBfIsCode_(code))return {ok:true,valid:false,reason:'FORMAT',message:'Cupón no disponible.'};
  try {
    if(!mctBfInWindow_(now))throw new Error('La campaña Black Friday ha finalizado.');
    var lock=LockService.getScriptLock();
    if(activate)lock.waitLock(30000);
    try {
      var x=mctBfFind_(code),v=x.data;
      var state=mctBfState_(v,now);
      if(state==='UTILIZADO'||state==='BLOQUEADO')throw new Error('Este cupón ya no está disponible.');
      if(state==='VENCIDO')throw new Error('Este cupón ha caducado.');
      var buyer=mctBfEmail_(p.email||p.holderEmail||'');
      var assigned=mctBfEmail_(v[4]);
      if(assigned && buyer && assigned!==buyer)throw new Error('Este cupón corresponde a otro correo.');
      if(p.reservationCode && assigned!==buyer)throw new Error('Debes reservar con el correo asociado al cupón.');
      var reserved=String(v[10]||''),until=mctBfDateMs_(v[11]);
      if(reserved&&(until>now||Boolean(v[12]))&&reserved!==String(p.reservationCode||''))throw new Error('Este cupón está reservado en otra compra.');
      var activated=mctBfDateMs_(v[7]);
      if(!activated&&activate) {
        activated=now;v[7]=new Date(now);
        v[8]=new Date(Math.min(now+MCT_BF26.durationMs,MCT_BF26.end-1000));
        v[3]='ACTIVO';v[15]=new Date();
        x.sheet.getRange(x.row,1,1,v.length).setValues([v]);
      } else if(!activated) {
        throw new Error('Primero aplica el cupón antes de reservar.');
      }
      var expires=mctBfDateMs_(v[8]);
      if(!expires||now>=expires)throw new Error('Este cupón ha caducado.');
      var rate=mctBfRate_(p.travelDate||p.date,activated);
      var fixed=String(v[9]||'')!==''?Number(v[9]):null;
      var percent=fixed!==null&&Number.isInteger(fixed)&&fixed>=1&&fixed<=50?fixed:rate.percent;
      var eligible=Math.max(0,Number(p.eligibleSubtotal!=null?p.eligibleSubtotal:(p.subtotal||0)));
      var subtotal=Math.max(0,Number(p.subtotal||eligible));
      if(!isFinite(eligible)||!isFinite(subtotal)||eligible>subtotal+0.01)throw new Error('Importe elegible incorrecto.');
      var discount=Math.round(eligible*percent)/100;
      return {ok:true,valid:true,couponCode:code,type:'percent',value:percent,
        discountPercent:percent,discountAmount:Math.round(discount*100)/100,
        currency:p.currency||'USD',campaign:'black_friday_2026',expiresAt:new Date(expires).toISOString(),
        activatedAt:new Date(activated).toISOString(),daysUntilTravel:rate.days,
        eligibleSubtotal:eligible,label:percent+'% de descuento',requiresEmailMatch:Boolean(assigned),
        message:'Cupón válido.'};
    } finally {if(activate)lock.releaseLock();}
  } catch(err) {return {ok:true,valid:false,reason:'BF_UNAVAILABLE',message:String(err.message||'Cupón no disponible.')};}
}
/** Bloquear únicamente al crear una pre-reserva; nunca en el momento de solicitar código. */
function mctBfReserve_(code,reservationCode,email,date,eligible,total,currency) {
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    var r=mctBfValidate_({couponCode:code,reservationCode:reservationCode,email:email,
      travelDate:date,eligibleSubtotal:eligible,subtotal:total,currency:currency},false);
    if(!r.valid)return r;
    var x=mctBfFind_(code),v=x.data;
    v[3]='RESERVADO';v[10]=String(reservationCode);
    v[11]=new Date(Math.min(Date.now()+MCT_BF26.holdMs,mctBfDateMs_(v[8])));
    v[15]=new Date();
    x.sheet.getRange(x.row,1,1,v.length).setValues([v]);
    return r;
  }finally{lock.releaseLock();}
}
function mctBfBindOrder_(code,reservationCode,providerOrder) {
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    var x=mctBfFind_(code),v=x.data;
    if(String(v[10])!==String(reservationCode)||mctBfState_(v,Date.now())!=='RESERVADO')
      throw new Error('Cupón no reservado por esta compra.');
    v[12]=mctBfClean_(providerOrder,120);
    // La orden de la pasarela puede capturarse después del hold inicial;
    // mantener exclusividad hasta el vencimiento de cinco horas.
    v[11]=new Date(mctBfDateMs_(v[8]));
    v[15]=new Date();
    x.sheet.getRange(x.row,1,1,v.length).setValues([v]);
  }finally{lock.releaseLock();}
}
/** Operación manual, solo editor. Verificar previamente que la orden no se haya cobrado.
 * No recupera las cinco horas; la primera aplicación y vencimiento no cambian.
 */
function mctBfAdminLiberarReserva(codigo, codigoReserva, verificacion) {
  if(verificacion!=='PAGO_NO_APROBADO_VERIFICADO')
    throw new Error('Comprueba primero en la pasarela que no existe pago aprobado.');
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    var x=mctBfFind_(codigo),v=x.data;
    if(String(v[10])!==String(codigoReserva)||v[3]==='UTILIZADO')
      throw new Error('Reserva no encontrada o ya pagada.');
    v[10]='';v[11]='';v[12]='';v[3]=v[7]?'ACTIVO':(v[4]?'ASIGNADO':'DISPONIBLE');
    v[15]=new Date();
    x.sheet.getRange(x.row,1,1,v.length).setValues([v]);
    return {ok:true,venceEn:v[8]};
  }finally{lock.releaseLock();}
}
/** Se llama SOLO desde la confirmación de pago verificada por servidor. */
function mctBfConsume_(code,reservationCode,paymentId) {
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    var x=mctBfFind_(code),v=x.data;
    if(String(v[3])==='UTILIZADO') {
      if(String(v[10])===String(reservationCode)&&String(v[13])===String(paymentId))return {ok:true,alreadyUsed:true};
      throw new Error('Cupón ya utilizado en otra compra.');
    }
    if(String(v[10])!==String(reservationCode)||!paymentId)
      throw new Error('No se puede confirmar un cupón sin pago asociado.');
    v[3]='UTILIZADO';v[13]=mctBfClean_(paymentId,125);v[14]=new Date();v[15]=new Date();
    x.sheet.getRange(x.row,1,1,v.length).setValues([v]);
    return {ok:true,used:true};
  }finally{lock.releaseLock();}
}
/** Editor de Apps Script: dar un cupón MANUAL a un correo. */
function mctBfAdminAsignarManual(codigo,correo,nombre) {
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    var email=mctBfEmail_(correo);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Correo inválido.');
    var x=mctBfFind_(codigo),v=x.data;
    if(v[2]!=='MANUAL'||v[4]||v[7]||v[14])throw new Error('Este código manual no está disponible.');
    var assigned=mctBfRows_(x.sheet).find(function(r){return mctBfEmail_(r.data[4])===email;});
    if(assigned)throw new Error('Este correo ya tiene otro cupón de campaña.');
    v[4]=email;v[5]=mctBfSheetSafe_(nombre);v[3]='ASIGNADO';v[15]=new Date();
    x.sheet.getRange(x.row,1,1,v.length).setValues([v]);
    return {ok:true,hash:x.hash};
  }finally{lock.releaseLock();}
}
/** Editor únicamente; no está disponible por HTTP. null => vuelve a automático. */
function mctBfAdminPorcentajeFijo(codigo,percent) {
  var fixed=percent===null||percent===''?'':Number(percent);
  if(fixed!==''&&(!Number.isInteger(fixed)||fixed<1||fixed>50))throw new Error('Porcentaje de 1 a 50.');
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try {var x=mctBfFind_(codigo),v=x.data;
    if(v[14])throw new Error('No modificar cupones utilizados.');
    v[9]=fixed;v[15]=new Date();x.sheet.getRange(x.row,1,1,v.length).setValues([v]);
    return {ok:true,fijo:fixed};
  }finally{lock.releaseLock();}
}
/** Resumen administrativo accesible SOLO al ejecutar desde editor, sin códigos legibles. */
function mctBfReporteAdministrativo() {
  var rows=mctBfRows_(mctBfCouponsSheet_()),counts={};
  rows.forEach(function(r){var state=mctBfState_(r.data,Date.now());counts[state]=(counts[state]||0)+1;});
  var result={total:rows.length,manual:rows.filter(function(r){return r.data[2]==='MANUAL';}).length,
    automaticos:rows.filter(function(r){return r.data[2]==='AUTOMATICO';}).length,
    estados:counts,enviosDisponibles:MailApp.getRemainingDailyQuota()};
  Logger.log(JSON.stringify(result));return result;
}
function mctBfLeadFind_(sh,email) {
  return mctBfRows_(sh).find(function(r){return mctBfEmail_(r.data[0])===email;});
}
function mctBfOtpHash_(email,otp) {
  var props=PropertiesService.getScriptProperties();
  var secret=props.getProperty('MCT_BF26_OTP_SECRET');
  if(!secret){secret=Utilities.getUuid()+Utilities.getUuid();props.setProperty('MCT_BF26_OTP_SECRET',secret);}
  return mctBfHash_(secret+'|'+email+'|'+otp);
}
/** Registro inicial y recuperación usan SIEMPRE verificación del correo. */
function mctBfLeadStart_(data) {
  try{
    if(!mctBfInWindow_())throw new Error('La campaña ha finalizado.');
    var p=data||{},first=mctBfClean_(p.firstName,70),last=mctBfClean_(p.lastName,90),
      email=mctBfEmail_(p.email),country=mctBfClean_(p.countryCode,8),
      phone=mctBfClean_(p.whatsapp,18);
    if(first.length<2||last.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
       !/^\+[1-9]\d{0,3}$/.test(country)||!/^\d{6,14}$/.test(phone))
       throw new Error('Revisa los datos del formulario.');
    if(p.privacyAccepted!==true)throw new Error('Debes aceptar la política de privacidad.');
    if(p.honeypot)throw new Error('No se pudo validar el formulario.');
    var lock=LockService.getScriptLock();lock.waitLock(30000);
    try {
      var now=new Date(),today=mctBfToday_(),sh=mctBfLeadsSheet_(),old=mctBfLeadFind_(sh,email);
      var v=old?old.data.slice():Array(MCT_BF26.leadHeaders.length).fill('');
      if(mctBfDateMs_(v[10])&&Date.now()-mctBfDateMs_(v[10])<60000)
        throw new Error('Ya enviamos un código. Revisa tu correo.');
      if(v[16]===today&&Number(v[11]||0)>=5)
        throw new Error('Has alcanzado el límite diario de solicitudes.');
      var props=PropertiesService.getScriptProperties(),dailyKey='MCT_BF26_DAILY_'+today;
      var globalSends=Number(props.getProperty(dailyKey)||0);
      if(globalSends>=180||MailApp.getRemainingDailyQuota()<2)
        throw new Error('No es posible enviar correos por ahora.');
      var couponRows=mctBfRows_(mctBfCouponsSheet_());
      var already=couponRows.some(function(r){return mctBfEmail_(r.data[4])===email;});
      if(!already&&!couponRows.some(function(r){return r.data[2]==='AUTOMATICO'&&r.data[3]==='DISPONIBLE'&&!r.data[4];}))
        throw new Error('Los cupones de esta campaña se han agotado.');
      var code=String(parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,8),16)%1000000).padStart(6,'0');
      var digest=mctBfOtpHash_(email,code);
      var nextCount=v[16]===today?Number(v[11]||0)+1:1;
      v=[old?v[14]:now,mctBfSheetSafe_(first),mctBfSheetSafe_(last),country,phone,true,
        p.marketingAccepted===true,digest,new Date(Date.now()+600000),0,now,nextCount,
        old?v[12]:'',old?v[13]:'',old?v[14]:now,now,today];
      // Orden de columnas: primer campo Correo (no timestamp)
      v[0]=email;
      try {MailApp.sendEmail({to:email,name:'My Cusco Trip',
        subject:'Verifica tu correo · Black Friday My Cusco Trip',
        body:'Hola '+first+',\n\nTu código de verificación es '+code+
          '. Caduca en 10 minutos. Si no lo solicitaste, ignora este correo.\n\nMy Cusco Trip'});}
      catch(ex){throw new Error('No se pudo enviar el correo. Inténtalo nuevamente.');}
      if(old)sh.getRange(old.row,1,1,v.length).setValues([v]);
      else sh.appendRow(v);
      props.setProperty(dailyKey,String(globalSends+1));
      return {ok:true,verificationRequired:true,message:'Te enviamos un código de seis dígitos.'};
    }finally{lock.releaseLock();}
  }catch(err){return {ok:false,error:String(err.message||'No se pudo registrar.')};}
}
function mctBfLeadVerify_(data) {
  try{
    if(!mctBfInWindow_())throw new Error('La campaña ha finalizado.');
    var email=mctBfEmail_(data.email),otp=String(data.otp||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{6}$/.test(otp))
      throw new Error('Ingresa el código de seis dígitos.');
    var lock=LockService.getScriptLock();lock.waitLock(30000);
    var code='',first='';
    try{
      var sh=mctBfLeadsSheet_(),lead=mctBfLeadFind_(sh,email);
      if(!lead)throw new Error('Solicita un código de verificación.');
      var v=lead.data;
      if(!mctBfDateMs_(v[8])||Date.now()>=mctBfDateMs_(v[8]))throw new Error('El código ha vencido. Solicita otro.');
      if(Number(v[9]||0)>=5)throw new Error('Demasiados intentos. Solicita otro código.');
      if(String(v[7])!==mctBfOtpHash_(email,otp)) {
        sh.getRange(lead.row,10).setValue(Number(v[9]||0)+1);
        throw new Error('Código de verificación incorrecto.');
      }
      var sheet=mctBfCouponsSheet_(),rows=mctBfRows_(sheet);
      var c=rows.find(function(r){return mctBfEmail_(r.data[4])===email;});
      if(!c)c=rows.find(function(r){return r.data[2]==='AUTOMATICO'&&r.data[3]==='DISPONIBLE'&&!r.data[4];});
      if(!c)throw new Error('Los cupones se han agotado.');
      code=String(c.data[1]||'');first=String(v[1]||'');
      if(!code)throw new Error('Cupón no disponible para recuperar.');
      if(!c.data[4]){c.data[4]=email;c.data[5]=mctBfSheetSafe_(v[1]+' '+v[2]);
        c.data[3]='ASIGNADO';c.data[15]=new Date();
        sheet.getRange(c.row,1,1,c.data.length).setValues([c.data]);}
      v[7]='';v[8]='';v[9]=0;v[12]=new Date();v[13]=String(c.data[0]);v[15]=new Date();
      sh.getRange(lead.row,1,1,v.length).setValues([v]);
    } finally {lock.releaseLock();}
    try {MailApp.sendEmail({to:email,name:'My Cusco Trip',subject:'Tu cupón exclusivo · Black Friday My Cusco Trip',
      body:'Hola '+first+',\n\nTu cupón exclusivo es: '+code+
        '\n\nUtilízalo en mycuscotrip.com. El plazo de cinco horas empieza la primera vez que pulsas Aplicar. Es personal y de un solo uso.\n\nMy Cusco Trip'});}
    catch(err){/* El código ya está asignado; se permite recuperarlo con un nuevo OTP. */}
    return {ok:true,code:code,message:'Correo verificado. Tu cupón es personal y de un solo uso.'};
  }catch(err){return {ok:false,error:String(err.message||'No se pudo verificar.')};}
}
/** Prueba administrativa sin correo ni pago. */
function pruebaCampanaBlackFridayMCT() {
  var sh=mctBfCouponsSheet_(),rows=mctBfRows_(sh),unique={};
  rows.forEach(function(r){if(unique[r.data[0]])throw new Error('Hash duplicado.');unique[r.data[0]]=true;});
  if(rows.length!==100)throw new Error('Inventario incompleto: '+rows.length);
  var base=Date.UTC(2026,10,23);
  [[0,10],[30,10],[31,20],[60,20],[61,30],[75,30],[76,40],[100,40],[101,50]].forEach(function(pair){
    var day=new Date(base+pair[0]*86400000).toISOString().slice(0,10);
    if(mctBfRate_(day,Date.parse('2026-11-23T12:00:00-05:00')).percent!==pair[1])
      throw new Error('Error en límite: '+pair[0]);
  });
  return {ok:true,total:rows.length,rangosVerificados:true};
}
