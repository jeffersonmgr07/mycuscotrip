export async function getReservationStatus(code, lastName) {
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]");

  const found = reservations.find(
    r =>
      r.reservationCode === code &&
      r.holder.lastName.toLowerCase() === lastName.toLowerCase()
  );

  if (!found) {
    throw new Error("Reserva no encontrada");
  }

  return {
    reservationCode: found.reservationCode,
    bookingStatus: found.bookingStatus,
    paymentStatus: found.paymentStatus,
    travelDate: found.travelDate || "2026-06-18",
    locale: found.locale,
    tourName: found.tour?.title || "Experiencia",
    passengers: [{ firstName: found.holder.fullName, lastName: "" }],
    pricing: {
      currency: found.tour?.currency || "USD",
      total: 100
    },
    extras: []
  };
}
