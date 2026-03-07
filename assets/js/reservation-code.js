export function generateReservationCode() {
  const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `CUZ${hex}`;
}
