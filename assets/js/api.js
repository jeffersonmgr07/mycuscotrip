export async function createReservation(payload) {
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]");

  const newReservation = {
    ...payload,
    createdAt: new Date().toISOString()
  };

  reservations.push(newReservation);
  localStorage.setItem("reservations", JSON.stringify(reservations));

  return newReservation;
}
