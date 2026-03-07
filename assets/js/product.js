import { loadTranslations, applyTranslations, getLocaleFromUrl } from "./i18n.js";
import { getTourBySlug, getTourContent, getTourReviews } from "./api.js";
import { setupBookingModal } from "./booking-modal.js";
import { setupPricing } from "./pricing.js";

document.addEventListener("DOMContentLoaded", async () => {
  const locale = getLocaleFromUrl();
  const slug = getSlugFromUrl();

  const dict = await loadTranslations(locale);
  applyTranslations(dict);

  const tour = await getTourBySlug(slug);
  const content = await getTourContent(slug, locale);
  const reviews = await getTourReviews(slug, locale);

  renderTour(tour, content, reviews);
  setupDatePicker(tour);
  setupPricing(tour);
  setupBookingModal({ tour, content, locale });
});

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || "machu-picchu-full-day";
}

function renderTour(tour, content, reviews) {
  document.querySelector("[data-tour-name]").textContent = content.name;
  document.querySelector("[data-tour-summary]").textContent = content.shortDescription;
  document.querySelector("[data-tour-duration]").textContent = content.durationLabel;
  document.querySelector("[data-tour-location]").textContent = tour.location || "Cusco";
  document.querySelector("[data-tour-price]").textContent = `${tour.currency} ${tour.basePricing.adult}`;
  document.querySelector("[data-product-type]").textContent = tour.typeLabel || tour.type;

  renderList("[data-tour-includes]", content.includes);
  renderList("[data-tour-excludes]", content.excludes);
  renderItinerary(content.itinerary);
  renderReviews(reviews);
  renderTrainCategories(tour);
  document.querySelector("[data-tour-price]").textContent = `USD ${getInitialPrice(tour)}`;
}

function renderList(selector, items = []) {
  const root = document.querySelector(selector);
  root.innerHTML = items.map(item => `<li>${item}</li>`).join("");
}

function renderItinerary(items = []) {
  const root = document.querySelector("[data-tour-itinerary]");
  root.innerHTML = items.map(item => `
    <article class="itinerary-item">
      <small>${item.time || ""}</small>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    </article>
  `).join("");
}

function renderReviews(items = []) {
  const root = document.querySelector("[data-tour-reviews]");
  root.innerHTML = items.map(item => `
    <article class="review-card">
      <strong>${item.author}</strong>
      <p>${item.comment}</p>
    </article>
  `).join("");
}

function setupDatePicker(tour) {
  const input = document.getElementById("travelDate");
  const mode = tour.supportsDateRange ? "range" : "single";

  flatpickr(input, {
    locale: flatpickr.l10ns.es,
    minDate: "today",
    mode,
    altInput: true,
    altFormat: "d M Y",
    dateFormat: "Y-m-d"
  });
}
function renderTrainCategories(tour) {
  const select = document.getElementById("trainCategory");
  if (!select || !tour.trainCategories) return;

  select.innerHTML = tour.trainCategories
    .map(option => `<option value="${option.code}">${option.label} — USD ${option.price}</option>`)
    .join("");
}

function getInitialPrice(tour) {
  return tour.trainCategories?.[0]?.price || tour.basePricing?.adult || 0;
}
