import reservasData from "@/data/reservas.json";
import { Reserva } from "@/types/reserva";

const reservas = reservasData as Reserva[];

export function normalizarTexto(valor: string) {
  return valor
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buscarReserva(codigo: string, apellido: string) {
  const codigoNormalizado = normalizarTexto(codigo);
  const apellidoNormalizado = normalizarTexto(apellido);

  return reservas.find(
    (reserva) =>
      normalizarTexto(reserva.codigo) === codigoNormalizado &&
      normalizarTexto(reserva.apellido) === apellidoNormalizado
  );
}

export function obtenerReservaPorCodigo(codigo: string) {
  const codigoNormalizado = normalizarTexto(codigo);

  return reservas.find(
    (reserva) => normalizarTexto(reserva.codigo) === codigoNormalizado
  );
}
