"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function MiReservaPage() {
  const router = useRouter();

  const [codigo, setCodigo] = useState("");
  const [apellido, setApellido] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const response = await fetch("/api/reservas/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          codigo,
          apellido
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message || "No se pudo validar la reserva.");
        setCargando(false);
        return;
      }

      router.push(`/mi-reserva/${encodeURIComponent(data.codigo)}`);
    } catch (err) {
      setError("Ocurrió un error al procesar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Mi Reserva
            </p>

            <h1 className="mb-4 text-4xl font-bold text-gray-900">
              Consulta tu reserva
            </h1>

            <p className="max-w-lg text-lg text-gray-600">
              Ingresa tu código de reserva y tus apellidos para ver el
              itinerario, tarifas, pago y datos de los turistas.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="codigo"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Código de reserva
                </label>
                <input
                  id="codigo"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej. CUS12345"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-black"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="apellido"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Apellidos
                </label>
                <input
                  id="apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Ej. Garcia"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-black"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-2xl bg-black px-4 py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cargando ? "Validando..." : "Ver Reserva"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
