export async function getTourBySlug(slug) {
  const response = await fetch("/assets/data/tours.json");
  const tours = await response.json();
  return tours.find(t => t.slug === slug);
}

export async function getTourContent(slug, locale) {
  const response = await fetch("/assets/data/tour-content.json");
  const data = await response.json();
  return data[slug]?.[locale] || data[slug]?.es;
}

export async function getTourReviews(slug, locale) {
  const response = await fetch("/assets/data/reviews.json");
  const reviews = await response.json();
  return reviews[slug]?.[locale] || reviews[slug]?.es || [];
}

export async function createReservation(payload) {
  console.log("Simulación createReservation:", payload);
  return payload;
}

export async function createPaypalOrder(reservationCode) {
  console.log("Simulación PayPal para:", reservationCode);
  return {
    approvalUrl: `/booking-status.html?code=${reservationCode}&lastName=Perez`
  };
}

export async function getReservationStatus(code, lastName) {
  console.log("Simulación lookup:", code, lastName);

  return {
    reservationCode: code,
    bookingStatus: "awaiting_payment",
    paymentStatus: "unpaid",
    travelDate: "2026-06-18",
    locale: "es",
    tourName: "Full Day Machu Picchu",
    passengers: [
      { firstName: "Juan", lastName: "Pérez" },
      { firstName: "Ana", lastName: "Pérez" }
    ],
    pricing: {
      currency: "USD",
      total: 590
    },
    extras: [
      { label: "Upgrade tren Vistadome" }
    ]
  };
}
