import { notFound } from "next/navigation";
import { obtenerReservaPorCodigo } from "@/lib/reservas";

type Props = {
  params: {
    codigo: string;
  };
};

export default function ReservaDetallePage({ params }: Props) {
  const reserva = obtenerReservaPorCodigo(params.codigo);

  if (!reserva) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Detalle de Reserva
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            {reserva.destino}
          </h1>
          <p className="mt-2 text-gray-600">
            Código de reserva:{" "}
            <span className="font-semibold text-gray-900">{reserva.codigo}</span>
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-8 shadow lg:col-span-2">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Itinerario
            </h2>

            <div className="space-y-5">
              {reserva.itinerario.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.titulo}
                  </h3>
                  <p className="mt-2 text-gray-600">{item.detalle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Pago</h2>

            <div className="space-y-5">
              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">Tarifa base</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  S/ {reserva.tarifaBase.pen}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  USD {reserva.tarifaBase.usd}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="mb-3 text-sm text-gray-500">Tarifas extras</p>

                <div className="space-y-3">
                  {reserva.tarifasExtras.map((extra, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-4 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {extra.concepto}
                        </p>
                      </div>

                      <div className="text-right text-sm text-gray-700">
                        <p>S/ {extra.pen}</p>
                        <p>USD {extra.usd}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href={reserva.paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-2xl bg-black px-4 py-3 text-center font-semibold text-white transition hover:opacity-90"
              >
                Generar pago
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Datos de los turistas
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Nombres
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Apellidos
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Nacionalidad
                  </th>
                </tr>
              </thead>

              <tbody>
                {reserva.turistas.map((turista, index) => (
                  <tr key={index} className="bg-gray-50">
                    <td className="rounded-l-2xl px-4 py-4 text-sm text-gray-800">
                      {turista.nombres}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-800">
                      {turista.apellidos}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-800">
                      {turista.documento}
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-sm text-gray-800">
                      {turista.nacionalidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
