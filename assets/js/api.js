export async function getTourBySlug(slug) {
  const local = JSON.parse(localStorage.getItem("experiences") || "[]");
  const found = local.find(t => t.slug === slug);
  if (found) return normalizeExperience(found);

  const response = await fetch("/assets/data/tours.json");
  const tours = await response.json();
  const tour = tours.find(t => t.slug === slug);
  return tour ? normalizeExperience(tour) : null;
}

export async function getTourContent(slug, locale) {
  const response = await fetch("/assets/data/tour-content.json");
  const data = await response.json();
  return (
    data[slug]?.[locale] ||
    data[slug]?.es || {
      name: slug,
      shortDescription: "Experiencia disponible",
      durationLabel: "Duración por confirmar",
      includes: [],
      excludes: [],
      itinerary: []
    }
  );
}

export async function getTourReviews(slug, locale) {
  const response = await fetch("/assets/data/reviews.json");
  const reviews = await response.json();
  return reviews[slug]?.[locale] || reviews[slug]?.es || [];
}

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

export async function createPaypalOrder(reservationCode) {
  return {
    approvalUrl: `/booking-status.html?code=${reservationCode}&lastName=Perez`
  };
}

export async function getReservationStatus(code, lastName) {
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]");

  const found = reservations.find(
    r =>
      r.reservationCode === code &&
      r.holder?.lastName?.toLowerCase() === lastName.toLowerCase()
  );

  if (!found) {
    throw new Error("Reserva no encontrada");
  }

  return {
    reservationCode: found.reservationCode,
    bookingStatus: found.bookingStatus || "awaiting_payment",
    paymentStatus: found.paymentStatus || "unpaid",
    travelDate: found.travelDate || "2026-06-18",
    locale: found.locale || "es",
    tourName: found.tour?.title || found.tourName || "Experiencia",
    passengers: [
      {
        firstName: found.holder?.fullName || "Cliente",
        lastName: found.holder?.lastName || ""
      }
    ],
    pricing: {
      currency: found.tour?.currency || "USD",
      total: found.pricing?.total || found.total || 0
    },
    extras: found.extras || []
  };
}

function normalizeExperience(item) {
  return {
    ...item,
    currency: item.currency || "USD",
    location: item.location || "Cusco",
    type: item.type || "tour",
    typeLabel: item.typeLabel || "Experiencia",
    basePricing: item.basePricing || { adult: 0, child: 0 },
    duration: item.duration || {
      label: "Duración por confirmar",
      maxGroupSize: item.capacity || 0,
      guideLanguages: ["es"]
    },
    images: item.images || {
      cover: "/assets/img/placeholder.jpg",
      gallery: []
    },
    extras: item.extras || [],
    supportsDateRange: item.supportsDateRange || false
  };
}
