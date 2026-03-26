import { NextRequest, NextResponse } from "next/server";
import { buscarReserva } from "@/lib/reservas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, apellido } = body;

    if (!codigo || !apellido) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes completar el código de reserva y los apellidos."
        },
        { status: 400 }
      );
    }

    const reserva = buscarReserva(codigo, apellido);

    if (!reserva) {
      return NextResponse.json(
        {
          ok: false,
          message: "No encontramos una reserva con esos datos."
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      codigo: reserva.codigo
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error al validar la reserva."
      },
      { status: 500 }
    );
  }
}
