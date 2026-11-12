/** npm run test:images — matching rules of the arogga image import (no network, no DB). */
import assert from "node:assert/strict";
import {
  extractImage,
  indexProducts,
  matchMedicine,
  parseAroggaSlug,
  placeholderHashes,
  sameStrength,
  strengthParts,
  type AroggaProduct,
} from "../scripts/arogga/lib";

const product = (id: string, slug: string): AroggaProduct => ({ id, slug, url: `https://www.arogga.com/product/${id}/${slug}` });
const byBrand = indexProducts([
  product("1", "napa-500-tablet-500mg"),
  product("2", "napa-extra-tablet-65mg-500mg"),
  product("3", "napa-syrup-120mg-5ml"),
  product("4", "napa-250-suppository-250mg"),
  product("5", "seclo-20-capsule-20mg"),
  product("6", "seclo-40-capsule-40mg"),
  product("7", "seclo-mups-20-tablet-20mg"),
  product("8", "alatrol-paediatric-drops-pediatric-drops-2-5mg-ml"),
  product("9", "3-geocef-powder-for-suspension-200mg-5ml"),
  product("10", "ace-100ml-syrup-120mg-5ml"),
  product("11", "ace-60ml-syrup-120mg-5ml"),
  product("12", "seclo-40-injection-40mg-vial"),
]);
const match = (brand: string, strength: string | null, formSlug: string) => {
  const r = matchMedicine({ slug: "x", brand, strength, formSlug }, byBrand);
  return `${r.status}:${r.best?.product.id ?? "-"}`;
};

// parsing
assert.deepEqual(parseAroggaSlug("napa-500-tablet-500mg"), { brands: ["napa500", "napa"], form: "tablet", strength: ["500mg"] });
assert.deepEqual(parseAroggaSlug("napa-paediatric-drops-pediatric-drops-80mg-ml")?.strength, ["80mg", "ml"]);
assert.equal(parseAroggaSlug("3-geocef-powder-for-suspension-200mg-5ml")?.form, "suspension");
assert.equal(parseAroggaSlug("arm-sling-dyna"), null); // not a medicine form
assert.deepEqual(parseAroggaSlug("cefim-3-tablet-200mg")?.brands, ["cefim3"]); // "3" is part of the brand, not the strength
assert.deepEqual(parseAroggaSlug("ace-100ml-syrup-120mg-5ml")?.brands, ["ace100ml", "ace"]); // pack size dropped

// strength
assert.ok(sameStrength(strengthParts("500 mg+65 mg"), ["65mg", "500mg"])); // order ignored
assert.ok(sameStrength(strengthParts("2.5 mg/ml"), ["2", "5mg", "ml"])); // decimal written as "2-5mg"
assert.ok(!sameStrength(strengthParts("25 mg"), ["2", "5mg"])); // 25 mg is not 2.5 mg
assert.ok(!sameStrength(strengthParts("2.5 mg"), ["25mg"]));
assert.ok(sameStrength(strengthParts("40 mg/vial"), ["40mg", "vial"]));
assert.ok(!sameStrength(null, ["500mg"]));

// matching: sure only with brand + strength + form and a single candidate
assert.equal(match("Napa", "500 mg", "tablet"), "sure:1");
assert.equal(match("Napa Extra", "500 mg+65 mg", "tablet"), "sure:2");
assert.equal(match("Napa", "120 mg/5 ml", "syrup"), "sure:3");
assert.equal(match("Seclo", "20 mg", "capsule-delayed-release"), "sure:5");
assert.equal(match("Seclo", "40 mg/vial", "iv-injection"), "sure:12");
assert.equal(match("Alatrol", "2.5 mg/ml", "pediatric-drops"), "sure:8");
assert.equal(match("3-Geocef", "200 mg/5 ml", "powder-for-suspension"), "sure:9");
assert.equal(match("Napa", "500 mg", "suppository").split(":")[0], "ambiguous"); // strength/form don't both match one product
assert.equal(match("Napa", "1000 mg", "tablet").split(":")[0], "ambiguous");
assert.equal(match("Ace", "120 mg/5 ml", "syrup").split(":")[0], "ambiguous"); // two pack sizes → not sure
assert.equal(match("Seclo", "20 mg", "tablet"), "ambiguous:5"); // "Seclo MUPS" is a different brand
assert.equal(match("Zzzz", "500 mg", "tablet"), "none:-");

// product page image
const cdn = (key: string) => `https://cdn2.arogga.com/${Buffer.from(JSON.stringify({ bucket: "arogga", key })).toString("base64")}`;
const page = (url: string) => `<meta property="og:image" content="${url}"/>`;
assert.equal(extractImage(page(cdn("Product-p_images/1023/1023-no-image-m7w34a.jpeg"))).placeholder, true);
assert.equal(extractImage(page(cdn("Product-p_images/1/1-napa.jpeg"))).imageUrl, cdn("Product-p_images/1/1-napa.jpeg"));
assert.equal(extractImage("<html></html>").imageUrl, null);

// "no image" pictures: known hashes, or the same file on 3+ products
const blocked = placeholderHashes(["aaa", "aaa", "aaa", "bbb", "bbb", "ccc"]);
assert.ok(blocked.has("aaa")); // same file on 3 products
assert.ok(!blocked.has("bbb") && !blocked.has("ccc")); // two strengths may share one real photo
assert.ok(blocked.has("5ea46adbd35e810f863d743eadaab6a9")); // known arogga placeholder

console.log("arogga-match: all assertions passed");
