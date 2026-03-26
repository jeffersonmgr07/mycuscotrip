import { FormEvent, useState } from "react";
import { useRouter } from "next/router";

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
        body: JSON.stringify({ codigo, apellido })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message || "No se pudo validar la reserva.");
        setCargando(false);
        return;
      }

      router.push(`/mi-reserva/${encodeURIComponent(data.codigo)}`);
    } catch {
      setError("Ocurrió un error al procesar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Mi Reserva</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Código de reserva
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Apellidos
            </label>
            <input
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3"
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
            className="w-full rounded-2xl bg-black px-4 py-3 font-semibold text-white"
          >
            {cargando ? "Validando..." : "Ver Reserva"}
          </button>
        </form>
      </div>
    </main>
  );
}
