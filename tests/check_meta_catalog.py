"""Check Meta's static product tags against the landing's existing sales data."""

import json
import re
from decimal import Decimal
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse


ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    ("machu-picchu-y-tours-peru.html", "landing-machu-picchu-tours.json"),
    ("machu-picchu-overnight-y-tours-peru.html", "landing-machu-picchu-overnight-tours.json"),
)
REQUIRED = (
    "og:title", "og:description", "og:url", "og:image", "og:image:secure_url",
    "product:retailer_item_id", "product:brand", "product:availability",
    "product:condition", "product:price:amount", "product:price:currency",
    "og:price:amount", "og:price:currency",
)


class ProductTags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and "property" in attrs:
            self.tags.setdefault(attrs["property"], []).append(attrs.get("content", ""))


def check():
    identifiers = set()
    for page_name, data_name in PAGES:
        page = ROOT / "landing" / page_name
        html = page.read_text(encoding="utf-8")
        data = json.loads((ROOT / "assets/data" / data_name).read_text(encoding="utf-8"))
        product = data["mainProduct"]
        parser = ProductTags()
        parser.feed(html)
        tags = parser.tags
        for name in REQUIRED:
            assert len(tags.get(name, [])) == 1 and tags[name][0].strip(), f"{page_name}: missing or duplicate {name}"
        assert tags["product:retailer_item_id"] == [product["id"]], f"{page_name}: catalog ID differs from sales data"
        assert product["id"] not in identifiers, "Duplicate tour identifier"
        identifiers.add(product["id"])
        assert Decimal(tags["product:price:amount"][0]) == Decimal(str(product["adultPrice"])), f"{page_name}: stale catalog price"
        assert tags["product:price:amount"] == tags["og:price:amount"], f"{page_name}: conflicting prices"
        assert tags["product:price:currency"] == tags["og:price:currency"] == [data["currency"]], f"{page_name}: conflicting currency"
        assert tags["product:availability"] == ["available for order"], f"{page_name}: tour availability must remain subject to confirmation"
        canonical = "https://mycuscotrip.com/landing/" + page_name
        assert tags["og:url"] == [canonical], f"{page_name}: incorrect canonical product URL"
        assert tags["og:image"] == tags["og:image:secure_url"] == [urljoin(canonical, product["image"])], f"{page_name}: product cover differs from sales data"
        assert urlparse(tags["og:image"][0]).scheme == "https", f"{page_name}: insecure cover URL"
        assert html.index('property="product:retailer_item_id"') < html.index("fbq('init'"), f"{page_name}: product data must precede the pixel"
        schemas = [json.loads(value) for value in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]
        tourist = next(schema for schema in schemas if schema.get("@type") == "TouristTrip")
        assert Decimal(str(tourist["offers"]["price"])) == Decimal(str(product["adultPrice"])), f"{page_name}: stale tourist offer price"
        print(f"PASS {page_name}: {product['id']} / {data['currency']} {product['adultPrice']:.2f}")


if __name__ == "__main__":
    check()
