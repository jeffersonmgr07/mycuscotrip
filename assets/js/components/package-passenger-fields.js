"use strict";
// Passenger fields reused from the product experience modal.
window.MctPackagePassengerFields = class {
 escapeHtml(value) { const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML; }
 constructor(count) { this.getTotalPassengers = count; }
 t(key, fallback, replacements = {}) { return Object.entries(replacements).reduce((s, [k,v]) => s.replaceAll(`{${k}}`,v), fallback); }
getCountryOptionsHtml() {
    const countries = [
      "Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda", "Arabia Saudita", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán",
      "Bahamas", "Bangladés", "Barbados", "Baréin", "Bélgica", "Belice", "Benín", "Bielorrusia", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi", "Bulgaria", "Burkina Faso", "Burundi", "Bután",
      "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Chile", "China", "Chipre", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Cuba",
      "Dinamarca", "Dominica", "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Etiopía",
      "Filipinas", "Finlandia", "Fiyi", "Francia", "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guinea", "Guinea-Bisáu", "Guinea Ecuatorial", "Guyana",
      "Haití", "Honduras", "Hungría", "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall", "Islas Salomón", "Israel", "Italia",
      "Jamaica", "Japón", "Jordania", "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kuwait", "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania", "Luxemburgo",
      "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta", "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco", "Mongolia", "Montenegro", "Mozambique", "Myanmar",
      "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda", "Omán", "Países Bajos", "Pakistán", "Palaos", "Panamá", "Papúa Nueva Guinea", "Paraguay", "Perú", "Polonia", "Portugal", "Reino Unido", "República Centroafricana", "República Checa", "República del Congo", "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumanía", "Rusia",
      "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas", "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona", "Singapur", "Siria", "Somalia", "Sri Lanka", "Sudáfrica", "Sudán", "Sudán del Sur", "Suecia", "Suiza", "Surinam",
      "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental", "Togo", "Tonga", "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu", "Ucrania", "Uganda", "Uruguay", "Uzbekistán", "Vanuatu", "Vaticano", "Venezuela", "Vietnam", "Yemen", "Yibuti", "Zambia", "Zimbabue"
    ];

    return `<option value="">${this.t("product.selectCountry", "Selecciona país")}</option>${countries.map((country) => `<option value="${this.escapeHtml(country)}">${this.escapeHtml(country)}</option>`).join("")}`;
  }
populateCountrySelects(scope = document) {
    const options = this.getCountryOptionsHtml();
    scope.querySelectorAll?.("select[data-country-select]").forEach((select) => {
      const current = select.value;
      if (select.dataset.countriesLoaded === "true") return;
      select.innerHTML = options;
      if (current) select.value = current;
      select.dataset.countriesLoaded = "true";
    });
  }
renderAdditionalPassengerFields() {
    const container = document.getElementById("additionalPassengersContainer");
    if (!container) return;

    const holderTravels = document.getElementById("holderTravelsCheckbox")?.checked !== false;
    const totalPassengers = this.getTotalPassengers();
    const additionalCount = holderTravels ? Math.max(totalPassengers - 1, 0) : Math.max(totalPassengers, 0);
    const startNumber = holderTravels ? 2 : 1;

    if (!additionalCount) {
      container.innerHTML = `<p class="passenger-modal__note">${this.t("product.noAdditionalPassengers", "No hay pasajeros adicionales según la cantidad seleccionada.")}</p>`;
      return;
    }

    container.innerHTML = Array.from({ length: additionalCount }, (_, index) => {
      const passengerNumber = startNumber + index;
      return `
        <details class="passenger-modal__optional-passenger" open>
          <summary>Pasajero ${passengerNumber} <span>Datos del turista</span></summary>
          <label class="passenger-modal__check passenger-modal__check--later">
            <input type="checkbox" name="passenger_${passengerNumber}_complete_later" data-passenger-later="${passengerNumber}" />
            <span>${this.t("product.passengerLater", "Ingresaré los datos de este pasajero más adelante.")}</span>
          </label>
          <div class="passenger-modal__grid" data-passenger-fields="${passengerNumber}">
            <label>
              <span>Nombres</span>
              <input type="text" name="passenger_${passengerNumber}_firstName" autocomplete="given-name" />
            </label>
            <label>
              <span>Apellidos</span>
              <input type="text" name="passenger_${passengerNumber}_lastName" autocomplete="family-name" />
            </label>
            <label>
              <span>Tipo de documento</span>
              <select name="passenger_${passengerNumber}_documentType">
                <option value="">Selecciona</option>
                <option value="passport">Pasaporte</option>
                <option value="dni">DNI</option>
                <option value="id_card">${this.t("product.docTypeIdCard", "Documento de identidad")}</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label>
              <span>Número de documento</span>
              <input type="text" name="passenger_${passengerNumber}_documentNumber" autocomplete="off" />
            </label>
            <label>
              <span>Nacionalidad</span>
              <select name="passenger_${passengerNumber}_nationality" autocomplete="country-name" data-country-select></select>
            </label>
            <label>
              <span>Fecha de nacimiento</span>
              <input type="date" name="passenger_${passengerNumber}_birthdate" />
            </label>
          </div>
        </details>
      `;
    }).join("");

    this.populateCountrySelects(container);

    container.querySelectorAll("[data-passenger-later]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const number = checkbox.dataset.passengerLater;
        const fields = container.querySelector(`[data-passenger-fields="${CSS.escape(number)}"]`);
        fields?.classList.toggle("is-disabled", checkbox.checked);
        fields?.querySelectorAll("input, select").forEach((field) => {
          field.disabled = checkbox.checked;
        });
      });
    });
  }
};
