export type ItinerarioItem = {
  titulo: string;
  detalle: string;
};

export type Tarifa = {
  pen: number;
  usd: number;
};

export type TarifaExtra = {
  concepto: string;
  pen: number;
  usd: number;
};

export type Turista = {
  nombres: string;
  apellidos: string;
  documento: string;
  nacionalidad: string;
};

export type Reserva = {
  codigo: string;
  apellido: string;
  destino: string;
  itinerario: ItinerarioItem[];
  tarifaBase: Tarifa;
  tarifasExtras: TarifaExtra[];
  paypalUrl: string;
  turistas: Turista[];
};
