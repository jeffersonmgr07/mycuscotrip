(function(){
  "use strict";
  const cfg=window.MyCuscoTripPublicFormsConfig||{};
  let countriesPromise=null;
  const escapeHtml=(value)=>String(value??"").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const normalizeBase=(url)=>{
    if(!url) return url;
    if(url.startsWith("/") && location.hostname.includes("github.io")) return `/mycuscotrip${url}`;
    return url;
  };
  function loadCountries(){
    if(countriesPromise) return countriesPromise;
    const url=normalizeBase(cfg.countriesUrl||"/assets/data/countries.json");
    countriesPromise=fetch(url,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error("No se pudo cargar la lista de países.");return r.json();});
    return countriesPromise;
  }
  function populateSelect(select,items,kind){
    if(!select||select.dataset.populated==="true") return;
    const selected=select.dataset.default||select.value||"";
    const first=kind==="dial"?"Selecciona código":"Selecciona país";
    select.innerHTML=`<option value="">${first}</option>`+items.map(c=>{
      const value=kind==="dial"?c.dialCode:c.name;
      const label=kind==="dial"?`${c.name} (${c.dialCode})`:c.name;
      return `<option value="${escapeHtml(value)}" data-country-code="${escapeHtml(c.code)}">${escapeHtml(label)}</option>`;
    }).join("");
    if(selected) select.value=selected;
    if(!select.value && kind==="dial") select.value="+51";
    if(!select.value && kind==="country") select.value="Perú";
    select.dataset.populated="true";
  }
  async function initCountrySelects(root=document){
    const dials=[...root.querySelectorAll("[data-country-dial]")];
    const countries=[...root.querySelectorAll("[data-country-name]")];
    if(!dials.length&&!countries.length) return;
    try{
      const items=await loadCountries();
      dials.forEach(el=>populateSelect(el,items,"dial"));
      countries.forEach(el=>populateSelect(el,items,"country"));
    }catch(error){console.error(error);}
  }
  function setStatus(form,message,type="success",allowHtml=false){
    const status=form.querySelector("[data-form-status]")||form.querySelector(".special-form__status");
    if(!status) return;
    status.className=status.className.replace(/\bis-(success|error|loading|visible)\b/g,"").trim();
    status.classList.add("is-visible",`is-${type}`);
    if(allowHtml) status.innerHTML=message; else status.textContent=message;
    status.setAttribute("role",type==="error"?"alert":"status");
    status.scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function formToObject(form){
    const fd=new FormData(form); const data={};
    for(const [key,value] of fd.entries()){
      if(Object.prototype.hasOwnProperty.call(data,key)) data[key]=Array.isArray(data[key])?[...data[key],value]:[data[key],value];
      else data[key]=value;
    }
    form.querySelectorAll('input[type="checkbox"]').forEach(input=>{data[input.name]=input.checked?input.value||"yes":"";});
    data.page=location.href;
    data.submittedAt=new Date().toISOString();
    data.userAgent=navigator.userAgent;
    data.adminEmails=cfg.adminEmails||[];
    return data;
  }
  async function sendPayload(payload){
    if(!cfg.endpoint) throw new Error("El canal de envío todavía no está configurado.");
    await fetch(cfg.endpoint,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
    return {ok:true};
  }
  function validatePhone(form){
    const number=form.querySelector('[name="whatsappNumber"], [name="phoneNumber"]');
    if(number&&number.value&&!/^[0-9\s-]{6,18}$/.test(number.value.trim())){
      number.setCustomValidity("Ingresa solo el número, entre 6 y 18 dígitos.");
      number.reportValidity(); return false;
    }
    if(number) number.setCustomValidity("");
    return true;
  }
  function initMinorToggles(root=document){
    root.querySelectorAll("[data-minor-toggle]").forEach(toggle=>{
      const target=document.querySelector(toggle.dataset.minorToggle);
      const sync=()=>{
        const show=toggle.checked||toggle.value==="yes";
        if(target){target.hidden=!show;target.querySelectorAll("[data-required-when-visible]").forEach(el=>el.required=show);}
      };
      toggle.addEventListener("change",sync);sync();
    });
  }
  function generateClaimCode(){
    const date=new Date(); const ymd=[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("");
    const random=(crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0].toString(36):Math.random().toString(36).slice(2)).slice(0,6).toUpperCase();
    return `LR-${ymd}-${random}`;
  }
  function initPublicForms(root=document){
    root.querySelectorAll("form[data-public-form]").forEach(form=>{
      if(form.dataset.initialized==="true") return; form.dataset.initialized="true";
      const dateField=form.querySelector('[name="claimDate"]'); if(dateField&&!dateField.value) dateField.value=new Date().toISOString().slice(0,10);
      const codeField=form.querySelector('[name="claimCode"]'); if(codeField&&!codeField.value) codeField.value=generateClaimCode();
      form.addEventListener("submit",async(event)=>{
        event.preventDefault();
        if(!validatePhone(form)||!form.reportValidity()) return;
        const submit=form.querySelector('[type="submit"]'); const original=submit?.innerHTML;
        if(submit){submit.disabled=true;submit.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Enviando…';}
        setStatus(form,"Estamos registrando tu solicitud…","loading");
        try{
          const data=formToObject(form);
          const payload={action:"public_form",formType:form.dataset.formType||"general_contact",data};
          await sendPayload(payload);
          const claimCode=data.claimCode?`<br><strong>Código de seguimiento:</strong> <span class="public-form__code">${escapeHtml(data.claimCode)}</span>`:"";
          const success=form.dataset.success||"Hemos recibido tu solicitud. Nuestro equipo la revisará y se comunicará contigo por los datos registrados.";
          setStatus(form,`${escapeHtml(success)}${claimCode}`,"success",true);
          form.reset();
          await initCountrySelects(form);
          if(codeField) codeField.value=generateClaimCode();
          if(dateField) dateField.value=new Date().toISOString().slice(0,10);
        }catch(error){setStatus(form,error.message||"No pudimos enviar la solicitud. Inténtalo nuevamente o escríbenos a reservas@mycuscotrip.com.","error");}
        finally{if(submit){submit.disabled=false;submit.innerHTML=original;}}
      });
    });
  }
  function jsonp(url,timeout=15000){
    return new Promise((resolve,reject)=>{
      const callback=`mctJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script=document.createElement("script"); let timer;
      window[callback]=(data)=>{clearTimeout(timer);delete window[callback];script.remove();resolve(data);};
      script.onerror=()=>{clearTimeout(timer);delete window[callback];script.remove();reject(new Error("No se pudo consultar la reserva."));};
      const connector=url.includes("?")?"&":"?";
      script.src=`${url}${connector}callback=${encodeURIComponent(callback)}`;
      document.head.appendChild(script);
      timer=setTimeout(()=>{delete window[callback];script.remove();reject(new Error("La consulta tardó demasiado. Inténtalo nuevamente."));},timeout);
    });
  }
  function getDocIcon(type){
    const v=String(type||"").toLowerCase();
    if(v.includes("tren"))return "fa-train";if(v.includes("machu"))return "fa-mountain-sun";if(v.includes("consetur")||v.includes("bus"))return "fa-bus";if(v.includes("voucher"))return "fa-file-lines";return "fa-ticket";
  }
  function renderDocuments(container,documents,mode){
    if(!documents?.length){container.innerHTML='<div class="lookup-empty"><i class="fa-regular fa-folder-open"></i><p>No encontramos documentos disponibles para los datos ingresados. Verifica el código y el correo o comunícate con reservas.</p></div>';return;}
    container.innerHTML=documents.map(doc=>{
      const title=escapeHtml(doc.title||doc.name||"Documento de viaje");
      const type=escapeHtml(doc.type||"Servicio");
      const desc=escapeHtml(doc.description||doc.status||"Documento asignado a tu reserva.");
      const url=escapeHtml(doc.url||"");
      const print=mode==="voucher"?'<button type="button" data-print-document><i class="fa-solid fa-print"></i> Imprimir</button>':"";
      const action=url?`<a href="${url}" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Descargar</a>`:'<span class="document-card__type">Pendiente de asignación</span>';
      return `<article class="document-card"><div class="document-card__head"><div><span class="document-card__type"><i class="fa-solid ${getDocIcon(type)}"></i>${type}</span><h3>${title}</h3><p>${desc}</p></div></div><div class="document-card__actions">${action}${print}</div></article>`;
    }).join("");
    container.querySelectorAll("[data-print-document]").forEach(btn=>btn.addEventListener("click",()=>window.print()));
  }
  function initDocumentLookups(root=document){
    root.querySelectorAll("form[data-document-lookup]").forEach(form=>{
      if(form.dataset.initialized==="true")return;form.dataset.initialized="true";
      form.addEventListener("submit",async(event)=>{
        event.preventDefault(); if(!form.reportValidity())return;
        const results=document.querySelector(form.dataset.results||"#lookupResults");
        const submit=form.querySelector('[type="submit"]');const original=submit?.innerHTML;
        if(submit){submit.disabled=true;submit.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Buscando…';}
        if(results) results.innerHTML='<div class="lookup-empty"><i class="fa-solid fa-spinner fa-spin"></i><p>Consultando documentos…</p></div>';
        try{
          const params=new URLSearchParams({action:cfg.documentLookupAction||"lookup_documents",reservationCode:form.reservationCode.value.trim(),email:form.email.value.trim().toLowerCase(),documentType:form.dataset.documentType||"all"});
          const response=await jsonp(`${cfg.endpoint}?${params.toString()}`);
          if(!response?.ok) throw new Error(response?.message||"No encontramos la reserva.");
          renderDocuments(results,response.documents||[],form.dataset.documentType);
        }catch(error){if(results)results.innerHTML=`<div class="public-form__status is-visible is-error" role="alert">${escapeHtml(error.message)}</div>`;}
        finally{if(submit){submit.disabled=false;submit.innerHTML=original;}}
      });
    });
  }
  function initBlogFilters(root=document){
    root.querySelectorAll("[data-blog-filter]").forEach(button=>button.addEventListener("click",()=>{
      root.querySelectorAll("[data-blog-filter]").forEach(b=>b.classList.toggle("is-active",b===button));
      const category=button.dataset.blogFilter;
      root.querySelectorAll("[data-blog-category]").forEach(card=>card.hidden=category!=="all"&&!String(card.dataset.blogCategory||"").split(" ").includes(category));
    }));
  }
  function init(){initCountrySelects();initMinorToggles();initPublicForms();initDocumentLookups();initBlogFilters();}
  window.MyCuscoTripPublicForms={init,initCountrySelects,initPublicForms,initDocumentLookups};
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();
