import { generateReservationCode } from "./reservation-code.js";
import { createReservation, createPaypalOrder } from "./api.js";

export function setupBookingModal({ tour, content, locale }) {
  const bookingForm = document.getElementById("productBookingForm");

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    openBookingModal({ tour, content, locale });
  });

  document.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-booking-modal]")) {
      closeBookingModal();
    }
  });

  document.addEventListener("click", async (event) => {
    if (event.target.id === "reserveOnlyBtn") {
      await handleReserveOnly({ tour, locale });
    }

    if (event.target.id === "payNowBtn") {
      await handlePayNow({ tour, locale });
    }
  });
}

function openBookingModal() {
  const modal = document.getElementById("bookingModal");
  if (modal) modal.hidden = false;
}

function closeBookingModal() {
  const modal = document.getElementById("bookingModal");
  if (modal) modal.hidden = true;
}

async function handleReserveOnly({ tour, locale }) {
  const reservationCode = generateReservationCode();

  const payload = collectReservationPayload({
    reservationCode,
    bookingMode: "reserve_only",
    paymentStatus: "unpaid",
    bookingStatus: "awaiting_payment",
    tour,
    locale
  });

  const result = await createReservation(payload);

  window.location.href = `/booking-status.html?code=${result.reservationCode}&lastName=${encodeURIComponent(result.holder.lastName)}&lang=${locale}`;
}

async function handlePayNow({ tour, locale }) {
  const reservationCode = generateReservationCode();

  const payload = collectReservationPayload({
    reservationCode,
    bookingMode: "pay_now",
    paymentStatus: "pending",
    bookingStatus: "awaiting_payment",
    tour,
    locale
  });

  const reservation = await createReservation(payload);
  const paypal = await createPaypalOrder(reservation.reservationCode);

  if (paypal.approvalUrl) {
    window.location.href = paypal.approvalUrl;
  }
}

function collectReservationPayload(base) {
  const form = document.getElementById("reservationForm");
  const formData = new FormData(form);

  const fullName = formData.get("fullName") || "";
  const nameParts = String(fullName).trim().split(" ");

  return {
    ...base,
    holder: {
      fullName,
      lastName: nameParts[nameParts.length - 1] || "",
      email: formData.get("email"),
      whatsapp: formData.get("whatsapp"),
      nationality: formData.get("nationality"),
      documentType: formData.get("documentType"),
      documentNumber: formData.get("documentNumber")
    }
  };
}
