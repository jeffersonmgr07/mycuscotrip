#!/usr/bin/env python3
"""Check catalog publication gates, identity, assets and quote handoff for 4 pages."""
import copy
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("package_builder", ROOT / "scripts/build_package_landings.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.meta, self.inputs, self.images, self.schemas, self.form = {}, {}, [], [], {}
        self._schema = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            key = attrs.get("property") or attrs.get("name")
            self.meta.setdefault(key, []).append(attrs.get("content"))
        elif tag == "input":
            self.inputs[attrs.get("name")] = attrs
        elif tag == "form":
            self.form = attrs
        elif tag == "img":
            self.images.append(attrs["src"])
        elif tag == "script" and attrs.get("type") == "application/ld+json":
            self._schema = ""

    def handle_data(self, value):
        if self._schema is not None:
            self._schema += value

    def handle_endtag(self, tag):
        if tag == "script" and self._schema is not None:
            self.schemas.append(json.loads(self._schema))
            self._schema = None


class PackageLandings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = builder.load_config()
        cls.assets = set(subprocess.check_output(["git", "ls-tree", "-r", "--name-only", "HEAD"], cwd=ROOT, text=True).splitlines())

    def test_static_pages_and_quote_destinations(self):
        ids = {"machu-picchu-full-day", "machu-picchu-overnight"}
        covers = set()
        for package in self.config["packages"]:
            with self.subTest(package=package["id"]):
                source = (ROOT / "landing" / f"{package['slug']}.html").read_text()
                self.assertEqual(source, builder.render(package, self.config), "Regenerate HTML after changing source data")
                page = Page(source)
                self.assertNotIn(package["id"], ids)
                ids.add(package["id"])
                self.assertNotIn(package["image"], covers)
                covers.add(package["image"])
                self.assertIn(package["image"], self.assets)
                self.assertEqual(page.form["action"], "../quote-packages.html")
                self.assertEqual(page.form["method"], "get")
                self.assertEqual(page.inputs["package"]["value"], package["packageSlug"])
                self.assertEqual(int(page.inputs["days"]["value"]), package["days"])
                self.assertEqual(int(page.inputs["nights"]["value"]), package["nights"])
                self.assertIn("start", page.inputs)
                self.assertEqual(page.inputs["adults"]["min"], "1")
                self.assertEqual(len(page.schemas[0]["itinerary"]["itemListElement"]), package["days"])
                self.assertEqual(page.meta["og:image"], [builder.ORIGIN + "/" + package["image"]])
                if package["catalogPriceUSD"] is None:
                    self.assertEqual(page.meta["robots"], ["noindex, follow"])
                    self.assertFalse(any(str(key).startswith("product:") for key in page.meta))
                    self.assertFalse(any(schema["@type"] == "Product" for schema in page.schemas))
        self.assertEqual(len(ids), 6)

    def test_approved_offer_includes_static_price_and_matching_id(self):
        for package in self.config["packages"]:
            # A test fixture, never saved to the catalog source or a generated page.
            approved = copy.deepcopy(package)
            approved["catalogPriceUSD"] = 1234.56
            approved["priceBasis"] = "Por adulto en habitación doble compartida; servicios de esta propuesta."
            page = Page(builder.render(approved, self.config))
            self.assertEqual(page.meta["product:retailer_item_id"], [package["id"]])
            self.assertEqual(page.meta["product:price:amount"], ["1234.56"])
            self.assertEqual(page.meta["product:price:currency"], ["USD"])
            self.assertEqual(page.meta["product:availability"], ["available for order"])
            product = next(schema for schema in page.schemas if schema["@type"] == "Product")
            self.assertEqual(product["sku"], package["id"])
            self.assertEqual(product["offers"]["price"], "1234.56")
            self.assertIn("US$1234.56", builder.render(approved, self.config))
            self.assertEqual(page.meta["robots"], ["index, follow, max-image-preview:large"])

    def test_invalid_fares_and_missing_conditions_are_rejected(self):
        for fare in [0, -1, "499.90", True, float("nan"), float("inf"), 123.456]:
            with self.subTest(fare=fare), self.assertRaises(ValueError):
                builder.approved_price({"id": "test", "catalogPriceUSD": fare, "priceBasis": "Por persona"})
        with self.assertRaises(ValueError):
            builder.approved_price({"id": "test", "catalogPriceUSD": 499.90, "priceBasis": ""})


if __name__ == "__main__":
    unittest.main(verbosity=2)
