export async function getTourBySlug(slug) {
  const local = JSON.parse(localStorage.getItem("experiences") || "[]");

  const found = local.find(t => t.slug === slug);
  if (found) return found;

  const response = await fetch("/assets/data/tours.json");
  const tours = await response.json();
  return tours.find(t => t.slug === slug);
}
