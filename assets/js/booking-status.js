import { getReservationStatus } from "./api.js";
import { loadTranslations, applyTranslations, getLocaleFromUrl } from "./i18n.js";

document.addEventListener("DOMContentLoaded", async () => {
  const locale = getLocaleFromUrl();
  const dict = await loadTranslations(locale);
  applyTranslations(dict);

  const form = document.getElementById("reservationLookupForm");
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const lastName = params.get("lastName");

  if (code && lastName) {
    await loadReservation(code, lastName);
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const reservationCode = document.getElementById("reservationCode").value.trim();
    const reservationLastName = document.getElementById("reservationLastName").value.trim();

    await loadReservation(reservationCode, reservationLastName);
  });
});

async function loadReservation(code, lastName) {
  const data = await getReservationStatus(code, lastName);

  document.getElementById("reservationStatusResult").hidden = false;
  document.querySelector("[data-reservation-code]").textContent = data.reservationCode;
  document.querySelector("[data-booking-status]").textContent = data.bookingStatus;
  document.querySelector("[data-days-until-trip]").textContent = getDaysUntilTrip(data.travelDate);

  document.querySelector("[data-reservation-tour]").innerHTML = `
    <p><strong>${data.tourName}</strong></p>
    <p>${data.travelDate}</p>
    <p>${data.locale}</p>
  `;

  document.querySelector("[data-reservation-passengers]").innerHTML =
    data.passengers.map(p => `<p>${p.firstName} ${p.lastName}</p>`).join("");

  document.querySelector("[data-reservation-payment]").innerHTML = `
    <p>Estado: ${data.paymentStatus}</p>
    <p>Total: ${data.pricing.currency} ${data.pricing.total}</p>
  `;

  document.querySelector("[data-reservation-services]").innerHTML =
    (data.extras || []).map(s => `<p>${s.label}</p>`).join("") || "<p>Sin extras</p>";
}

function getDaysUntilTrip(travelDate) {
  const today = new Date();
  const trip = new Date(travelDate);
  const diff = trip - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
