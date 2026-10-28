#!/usr/bin/env python3
"""Build static package pages. Publish catalog offers only with approved prices."""
import argparse
from decimal import Decimal, InvalidOperation
import html
import json
from pathlib import Path
import re
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/data/landing-paquetes-cusco.json"
ORIGIN = "https://mycuscotrip.com"
VERSION = "20261028-clean-modal-4"


def esc(value):
    return html.escape(str(value), quote=True)


def json_script(value):
    return json.dumps(value, ensure_ascii=False, indent=2).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def approved_price(package):
    value = package.get("catalogPriceUSD")
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{package['id']}: catalogPriceUSD must be a positive JSON number or null")
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount <= 0 or amount != amount.quantize(Decimal("0.01")):
            raise ValueError("invalid fare")
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"{package['id']}: fare must be positive, finite and have at most two decimals") from error
    if not str(package.get("priceBasis", "")).strip():
        raise ValueError(f"{package['id']}: specify the per-person fare conditions in priceBasis")
    return format(amount, ".2f")


def load_config():
    config = json.loads(SOURCE.read_text(encoding="utf-8"))
    cards = json.loads((ROOT / "assets/data/packages-cusco.json").read_text(encoding="utf-8"))["packageCards"]
    cards_by_id = {card["id"]: card for card in cards}
    if config.get("currency") != "USD" or not re.fullmatch(r"[0-9]{8,15}", config.get("whatsapp", "")):
        raise ValueError("Use USD fares and a valid international WhatsApp number")
    seen_ids, seen_slugs = set(), set()
    for package in config["packages"]:
        if not re.fullmatch(r"[a-z0-9-]+", package["slug"]) or not re.fullmatch(r"[a-z0-9_-]+", package["id"]):
            raise ValueError("Unsafe or invalid package slug / ID")
        if package["id"] in seen_ids or package["slug"] in seen_slugs:
            raise ValueError("Duplicate catalog ID or canonical page")
        seen_ids.add(package["id"])
        seen_slugs.add(package["slug"])
        card = cards_by_id.get(package["packageId"])
        if not card or (card["days"], card["nights"], card["slug"]) != (package["days"], package["nights"], package["packageSlug"]):
            raise ValueError(f"{package['id']}: package duration or quote slug disagrees with the existing catalog")
        if package["nights"] != package["days"] - 1 or len(package["itinerary"]) != package["days"]:
            raise ValueError(f"{package['id']}: day and night counts do not match the itinerary")
        if not package["image"].startswith("assets/img/") or ".." in package["image"]:
            raise ValueError("Use a repository image path")
        approved_price(package)
    return config


def render(package, config):
    price = approved_price(package)
    ready = price is not None
    title = package["title"]
    url = f"{ORIGIN}/landing/{package['slug']}.html"
    image_url = f"{ORIGIN}/{package['image']}"
    duration = f"{package['days']} días / {package['nights']} noches"
    wa_url = "https://wa.me/" + config["whatsapp"] + "?" + urlencode({"text": f"Hola, me interesa {title}. Quisiera una propuesta personalizada y confirmar los servicios incluidos."})
    meta = lambda key, value: f'<meta property="{key}" content="{esc(value)}"/>'
    product_meta = ""
    if ready:
        product_meta = "\n".join(meta(key, value) for key, value in {
            "product:retailer_item_id": package["id"], "product:brand": "My Cusco Trip",
            "product:availability": "available for order", "product:condition": "new",
            "product:price:amount": price, "product:price:currency": "USD",
            "og:price:amount": price, "og:price:currency": "USD"
        }.items())
    trip = {
        "@context": "https://schema.org", "@type": "TouristTrip", "name": title,
        "description": package["description"], "url": url, "image": image_url,
        "provider": {"@type": "TravelAgency", "name": "My Cusco Trip", "url": ORIGIN},
        "itinerary": {"@type": "ItemList", "itemListElement": [
            {"@type": "ListItem", "position": i, "name": day["title"], "description": day["description"]}
            for i, day in enumerate(package["itinerary"], 1)
        ]}
    }
    schema = '<script type="application/ld+json">\n' + json_script(trip) + '\n</script>'
    if ready:
        product = {
            "@context": "https://schema.org", "@type": "Product", "sku": package["id"], "productID": package["id"],
            "name": title, "description": package["description"], "url": url, "image": image_url,
            "brand": {"@type": "Brand", "name": "My Cusco Trip"},
            "offers": {"@type": "Offer", "url": url, "price": price, "priceCurrency": "USD",
                       "itemCondition": "https://schema.org/NewCondition", "description": package["priceBasis"]}
        }
        schema += '\n<script type="application/ld+json">\n' + json_script(product) + '\n</script>'
    public_data = {"id": package["id"], "title": title, "slug": package["slug"],
                   "days": package["days"], "nights": package["nights"], "currency": "USD",
                   "adultPrice": float(price) if ready else None, "childPrice": package.get("childPriceUSD"), "whatsapp": config["whatsapp"]}
    navigation = "\n".join(
        f'<a href="{esc(other["slug"])}.html"' + (' aria-current="page"' if other["id"] == package["id"] else '') + f'>{other["days"]} días / {other["nights"]} noches</a>'
        for other in config["packages"]
    )
    benefits = "\n".join(f'<p><span aria-hidden="true">✓</span>{esc(item)}</p>' for item in package["highlights"])
    itinerary = "\n".join(
        f'<li class="day"><span class="day-number">Día<b>{i}</b></span><div><h3>{esc(day["title"])}</h3><p>{esc(day["description"])}</p></div></li>'
        for i, day in enumerate(package["itinerary"], 1)
    )
    price_html = (f'<p class="price"><span>Precio por adulto</span> US${price}</p>'
                  if ready else '<h2>Consulta tu tarifa</h2>')
    product_html = (ROOT / "product.html").read_text(encoding="utf-8")
    modal = product_html.split('<!-- MODAL DE PASAJEROS / PRE-RESERVA -->', 1)[1].split('<div id="footer-container">', 1)[0]
    modal = modal.replace('<i class="fas fa-xmark"></i>', '×')
    # Match the clean experience modal: only title/code in the green header.
    notice = re.search(r'<details class="passenger-modal__warning.*?</details>', modal, re.S).group(0)
    modal = modal.replace(notice, '').replace('<div class="passenger-modal__body">', '<div class="passenger-modal__body">' + notice, 1)
    modal = modal.replace('class="passenger-modal"', 'class="passenger-modal package-clean-modal"', 1)

    return f'''<!DOCTYPE html>
<!-- Generated by scripts/build_package_landings.py from assets/data/landing-paquetes-cusco.json. -->
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{esc(title)} | My Cusco Trip</title>
<meta name="description" content="{esc(package['description'])}"/>
<meta name="robots" content="{'index, follow, max-image-preview:large' if ready else 'noindex, follow'}"/>
<meta name="theme-color" content="#13543a"/>
<link rel="canonical" href="{url}"/>
{meta('og:type', 'product' if ready else 'website')}
{meta('og:locale', 'es_PE')}
{meta('og:site_name', 'My Cusco Trip')}
{meta('og:title', title)}
{meta('og:description', package['description'])}
{meta('og:url', url)}
{meta('og:image', image_url)}
{meta('og:image:secure_url', image_url)}
{meta('og:image:type', 'image/jpeg')}
{meta('og:image:alt', package['imageAlt'])}
{product_meta}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{esc(title)}"/>
<meta name="twitter:description" content="{esc(package['description'])}"/>
<meta name="twitter:image" content="{image_url}"/>
<link rel="icon" href="../public/favicon.ico"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&amp;family=Open+Sans:wght@400;600;700;800&amp;display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css"/>
<link rel="stylesheet" href="../assets/css/landing-reservation-modal.css"/>
<link rel="stylesheet" href="../assets/css/passenger-modal-scroll-fix.css"/>
<link rel="stylesheet" href="../assets/css/landing-paquetes-cusco.css?v={VERSION}"/>
{schema}
</head>
<body>
<a class="skip-link" href="#contenido">Ir al contenido</a>
<header class="site-header"><div class="container header-inner">
  <a class="brand" href="../index.html" aria-label="My Cusco Trip, inicio"><img src="../assets/img/logos/Logo1.png" alt="My Cusco Trip" width="128" height="61"/></a>
  <a class="header-contact" href="{esc(wa_url)}" data-track="click_whatsapp" target="_blank" rel="noopener noreferrer">Habla con nuestro equipo ↗</a>
</div></header>
<main id="contenido">
<section class="hero"><div class="container hero-grid">
  <div><div class="duration">Cusco · {esc(duration)}</div>
    <p class="eyebrow">{esc(package['eyebrow'])}</p>
    <h1>{esc(package['headline'])}</h1>
    <p class="hero-description">{esc(package['description'])}</p>
    <div class="actions"><a class="button" href="#personalizar">Reservar este paquete</a><a class="button button-secondary" href="#itinerario">Ver itinerario ↓</a></div>
    <p class="hero-note">Operador local · Atención en español e inglés · Servicios sujetos a confirmación</p>
  </div>
  <div class="hero-photo"><img class="hero-image" src="../{esc(package['image'])}" alt="{esc(package['imageAlt'])}" width="800" height="600" fetchpriority="high"/><div class="photo-label">{esc(title)}</div></div>
</div></section>
<div class="container benefits">{benefits}</div>
<nav class="container package-nav" aria-label="Elige la duración de tu viaje"><span class="package-nav-label">Explora otras duraciones</span>{navigation}</nav>
<div class="container content-grid">
  <div>
    <section id="itinerario" aria-labelledby="itinerary-heading"><p class="eyebrow">La ruta, día a día</p><h2 id="itinerary-heading" class="section-heading">Así puede ser tu viaje.</h2>
      <p class="section-intro">Una propuesta de {esc(duration)} para empezar a planificar. Ajustamos el orden y los servicios a tus vuelos, intereses y disponibilidad.</p>
      <ol class="itinerary">{itinerary}</ol>
      <div class="callout">No incluye alojamiento. Las noches indican la duración del viaje, no noches de hotel incluidas. Las entradas, el circuito y los trenes se validan antes de confirmar la reserva.</div>
    </section>
    <section class="details-section" aria-labelledby="plan-heading"><p class="eyebrow">Organizamos el viaje contigo</p><h2 id="plan-heading" class="section-heading">Cada detalle, coordinado.</h2>
      <ul class="details-list"><li>Adaptamos la ruta a tus horarios de llegada y salida de Cusco.</li><li>Revisamos trenes, entradas y visitas guiadas para tu fecha.</li><li>¿Necesitas alojamiento? Podemos coordinarlo por WhatsApp y agregarlo con un costo adicional.</li><li>Detallamos traslados, comidas, ingresos y servicios incluidos en la cotización.</li><li>Los vuelos, mejoras de tren y otras experiencias se cotizan según lo que necesites.</li></ul>
    </section>
  </div>
  <aside class="quote-card" id="personalizar" aria-labelledby="quote-heading"><p class="eyebrow" id="quote-heading">Reserva tu viaje · {package['days']} días</p>
    {price_html}
    <form id="package-quote-form" method="post">
      <div class="field"><label for="start">Fecha de llegada a Cusco</label><input type="text" id="start" name="start" placeholder="Elige tu fecha de llegada" autocomplete="off" required/><p class="form-help">Duración: {esc(duration)}</p></div>
      <div class="travelers">
        <div class="traveler-row"><label for="adults"><strong>Adultos</strong><span>12 años o más · US${float(price or 0):.2f}</span></label><div class="stepper"><button type="button" data-step="-1" data-count="adults" aria-label="Quitar un adulto">−</button><input id="adults" name="adults" type="number" min="1" max="30" value="2" required aria-label="Cantidad de adultos"/><button type="button" data-step="1" data-count="adults" aria-label="Agregar un adulto">+</button></div></div>
        <div class="traveler-row"><label for="children"><strong>Niños</strong><span>3 a 11 años · US${package.get('childPriceUSD', 0):.2f}</span></label><div class="stepper"><button type="button" data-step="-1" data-count="children" aria-label="Quitar un niño">−</button><input id="children" name="children" type="number" min="0" max="30" value="0" required aria-label="Cantidad de niños"/><button type="button" data-step="1" data-count="children" aria-label="Agregar un niño">+</button></div></div>
      </div>
      <div class="package-totals" aria-live="polite"><div class="total-line"><strong>Total a pagar</strong><strong id="package-total"></strong></div><dl id="package-breakdown"></dl><p class="form-help">No incluye alojamiento.</p></div>
      <label class="checkout-confirm"><input type="checkbox" name="confirmed" required/><span>He confirmado disponibilidad y acepto los <a href="../pages/legales/terminos-condiciones-generales.html" target="_blank" rel="noopener">términos y condiciones</a>.</span></label>
      <button class="button" type="button" id="package-pay" disabled>Registrar reserva</button>
      <p id="package-payment-message" role="status" aria-live="polite"></p>
      <noscript>Activa JavaScript para registrar tu reserva o contáctanos por WhatsApp.</noscript>
    </form>
    <a class="contact-link" href="{esc(wa_url)}" data-track="click_whatsapp" target="_blank" rel="noopener noreferrer">Consultar disponibilidad o agregar alojamiento ↗</a>
  </aside>
</div>
<section class="faq-section" aria-labelledby="faq-heading"><div class="container faq-inner"><p class="eyebrow">Antes de viajar</p><h2 class="section-heading" id="faq-heading">Lo que necesitas saber.</h2>
  <details><summary>¿Este paquete incluye alojamiento?</summary><p>No. El precio publicado no incluye alojamiento. Si deseas agregarlo, contáctanos por WhatsApp: coordinaremos categoría, habitaciones y precio adicional. El alojamiento no se suma automáticamente al pago de esta página.</p></details>
  <details><summary>¿Las entradas a Machu Picchu están garantizadas?</summary><p>Primero verificamos la disponibilidad para tu fecha. Te indicaremos el circuito, los horarios y las condiciones antes de confirmar la reserva o solicitar el pago de los servicios.</p></details>
  <details><summary>¿Puedo cambiar una experiencia o el orden de los días?</summary><p>Sí. Podemos evaluar cambios según tus vuelos, el tiempo de aclimatación, tus intereses y la operación de cada tour. Tu propuesta final mostrará el itinerario acordado.</p></details>
  <details><summary>¿Cómo se calcula el precio para niños o grupos?</summary><p>El total se calcula sumando adultos por la tarifa de adulto y niños por la tarifa infantil indicada. La tarifa infantil aplica de 3 a 11 años cumplidos a la fecha del viaje. Desde los 12 años se aplica la tarifa de adulto. Para menores de 3 años, consulta por WhatsApp antes de reservar. El alojamiento y otros servicios adicionales se coordinan y cotizan aparte.</p></details>
</div></section>
</main>
<footer class="site-footer"><div class="container footer-inner"><p><span class="footer-brand">My Cusco Trip</span>Experiencias organizadas por un equipo local.</p><p><a href="../all-experiences.html">Explorar experiencias</a> · <a href="{esc(wa_url)}" data-track="click_whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a><br/>© 2026 My Cusco Trip</p></div></footer>
<div class="mobile-action"><span><strong>{esc(duration)}</strong>Cusco y Machu Picchu</span><a href="#personalizar" class="button">Reservar</a></div>
{modal}
<script type="application/json" id="package-landing-data">{json_script(public_data)}</script>
<script src="../assets/js/config/tracking-config.js"></script>
<script src="../assets/js/components/tracking.js?v=20261025-meta-catalog-1"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/es.js"></script>
<script src="../assets/js/components/package-passenger-fields.js?v={VERSION}"></script>
<script src="../assets/js/core/api-client.js"></script>
<script src="../assets/js/pages/landing-paquetes-cusco.js?v={VERSION}"></script>
</body>
</html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated HTML is stale; do not write files")
    parser.add_argument("--require-catalog", action="store_true", help="Fail if any package lacks an approved catalog fare")
    args = parser.parse_args()
    config = load_config()
    stale, pending = [], []
    for package in config["packages"]:
        output = ROOT / "landing" / f"{package['slug']}.html"
        expected = render(package, config)
        if args.check:
            if not output.exists() or output.read_text(encoding="utf-8") != expected:
                stale.append(str(output.relative_to(ROOT)))
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(expected, encoding="utf-8")
        if approved_price(package) is None:
            pending.append(package["id"])
        print(f"{'QUOTE / price pending' if package['id'] in pending else 'CATALOG READY'}: {output.relative_to(ROOT)}")
    if stale:
        raise SystemExit("Regenerate stale pages: " + ", ".join(stale))
    if args.require_catalog and pending:
        raise SystemExit("Catalog publication needs approved per-person fares: " + ", ".join(pending))


if __name__ == "__main__":
    main()
