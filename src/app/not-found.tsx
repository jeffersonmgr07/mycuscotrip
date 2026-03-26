import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Reserva no encontrada
        </h1>
        <p className="mt-4 text-gray-600">
          No pudimos encontrar la información solicitada.
        </p>
        <Link
          href="/mi-reserva"
          className="mt-6 inline-block rounded-2xl bg-black px-6 py-3 font-semibold text-white"
        >
          Volver a Mi Reserva
        </Link>
      </div>
    </main>
  );
}
