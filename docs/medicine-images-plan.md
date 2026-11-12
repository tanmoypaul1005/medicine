# Medicine Images (arogga → Cloudinary) — Implementation Plan

> Status (2026-11-12): **কোড implement হয়েছে; upload এখনো হয়নি** (Cloudinary key নেই)। DB-তে কোনো ছবি লেখা হয়নি।
>
> **চালানোর ক্রম:** `npm run images:sitemap` → `npm run images:match -- --limit=100` (dry-run, `data/arogga/report.csv`) → রিপোর্ট দেখা → `npm run images:upload -- --confirm` → Cloudinary-তে চোখে দেখা → `npm run images:approve -- --all` (বা `--slugs=a,b`; `--undo` দিয়ে লুকানো) → `POST /api/revalidate {"tags":["medicines"]}`। Test: `npm run test:images`।
>
> **Plan থেকে যা আলাদা হয়েছে:**
> - Watermark: বিকল্প **B** (arogga যেমন দেয় তেমন, watermark-সহ)। arogga থেকে মূল ছবি পেলে `report.csv`-এর `imageUrl` বদলে একই upload script চলবে।
> - Scope: `--top=100`-এর বদলে `--limit=N`: সব medicine match হয় (network লাগে না), তারপর সবচেয়ে প্রচলিত generic-এর প্রথম N টা নিশ্চিত match-এর page fetch হয়। `--all` = সব।
> - Model-এ `matchScore` রাখা হয়নি (শুধু score 6 upload হয়)। Progress file = `data/arogga/images.json`।
> - Brand-এর শেষের সংখ্যা বাদ যায় শুধু pack size (`ace-100ml`) বা strength-এর পুনরাবৃত্তি (`napa-500` + `500mg`) হলে; `cefim-3` আলাদা brand থাকে।
> - ছবি না থাকলে icon placeholder দেখানো হয় না; page আগের মতোই থাকে।
> - Unit test `tsx` + `node:assert` দিয়ে (আলাদা test runner নেই)।
>
> **প্রথম dry-run-এর ফল:** arogga product 58,295; আমাদের 21,714 medicine-এর মধ্যে নিশ্চিত match 13,716, ambiguous 4,775, match নেই 3,223। প্রথম 100 টা page-এর 70 টায় আসল ছবি, 30 টায় placeholder।

## 1. লক্ষ্য
- Medicine detail page (`/[lang]/medicine/[slug]`) এ প্রতিটা ওষুধের ছবি দেখানো।
- ছবির উৎস: arogga.com, ওদের permission নিয়ে। আমাদের নিজস্ব copy থাকবে Cloudinary-তে।
- ভুল ছবি দেখানো যাবে না: শুধু নিশ্চিত match আর approved ছবি দেখাবে।

## 2. নীতি (non-negotiable)
- **Permission লিখিত থাকতে হবে** (email/চুক্তি)। প্রতিটা ছবিতে `source` লেখা থাকবে।
- **Watermark মোছা হবে না।** CDN URL থেকে `overlayWith` সরিয়ে ছবি নেওয়া হবে না। দুটো বিকল্প (§9 সিদ্ধান্ত ১):
  - A. arogga থেকে watermark ছাড়া মূল ছবি (S3 export, API, বা CSV of image URLs) নেওয়া। **(Recommended)**
  - B. সাইটে যেমন আছে তেমন watermark-সহ ছবি নেওয়া।
- **ভদ্র crawling**: ১ request/সেকেন্ড, `robots.txt` মেনে চলা, retry-তে backoff, স্পষ্ট User-Agent (generic, ব্যক্তিগত তথ্য ছাড়া)।
- **DB-তে bulk write শুধু dry-run রিপোর্ট দেখে user-এর সম্মতির পরে।**
- **Placeholder ছবি বাদ** (key-তে `no-image` থাকলে)।

## 3. arogga-র গঠন (যাচাই করা, 2026-11-12)
| বিষয় | তথ্য |
|---|---|
| robots.txt | `Allow: /`; শুধু `/account/*` disallow |
| Sitemap | `https://www.arogga.com/sitemap.xml` → `/sitemap/0.xml` … `/sitemap/20.xml` (+ lab, doctor) |
| Product URL | `https://www.arogga.com/product/<id>/<slug>`, slug = name-strength-form, যেমন `amoxycillin-capsule-250mg` |
| ছবি | product page-এর `<meta property="og:image">`, host `cdn2.arogga.com` |
| CDN URL | base64 JSON: `{bucket:"arogga", key:"Product-p_images/<id>/<file>", edits:{resize 1000×1000, overlayWith misc/wm.png}}` |
| Placeholder | key-তে `no-image` (যেমন product 1023) |

বিকল্প A বেছে নিলে §5.2-এর crawl-এর ধাপ বাদ যাবে, ছবির URL আসবে arogga-র export থেকে।

## 4. Data model পরিবর্তন (`models/Medicine.ts`)
এখনকার `image: { url, source, approved }` বাড়িয়ে এটা হবে:
```ts
image: {
  url: String,          // Cloudinary secure_url
  publicId: String,     // "oshudkhuji/medicines/<slug>"; replace/delete করার জন্য
  width: Number,
  height: Number,
  source: String,       // "arogga (permission 2026-11)"
  sourceUrl: String,    // arogga product URL, audit-এর জন্য
  matchScore: Number,   // §6 অনুযায়ী
  approved: { type: Boolean, default: false },
  importedAt: Date,
}
```
- কোনো migration লাগবে না: field গুলো optional, পুরোনো doc-এ `image` নেই।
- Search hit-এ ছবি লাগবে না, তাই `MEDICINE_SEARCH_STORED`-এ যোগ করার দরকার নেই (index rebuild নয়)।

## 5. Pipeline
তিন ধাপের script, প্রতিটা আলাদা চালানো যাবে আর মাঝে থামলে আবার শুরু করা যাবে (resumable):

### 5.1 `scripts/arogga/1-sitemap.ts`: product তালিকা
- সব product sitemap পড়ে `{ aroggaId, slug, url }` বের করবে।
- ফল রাখবে `data/arogga/products.json`-এ (git-ignored)। DB-তে কিছু লিখবে না।
- আনুমানিক ২০টা request।

### 5.2 `scripts/arogga/2-match.ts`: match + ছবির URL (dry-run)
1. DB থেকে medicine পড়বে (`slug brand strength dosageForm formSlug manufacturerName image`)।
2. প্রতিটা arogga slug parse করে তিন ভাগ করবে: `brand`, `strength` (যেমন `250mg`, `120mg-5ml`), `form` (tablet, capsule, syrup, suspension…)। Form-এর জন্য একটা map লাগবে: `powder-for-suspension` → আমাদের `formSlug`।
3. §6 অনুযায়ী score করবে। শুধু **নিশ্চিত match**-এর product page fetch করে `og:image` বের করবে (১ req/sec)।
4. `scope` অনুযায়ী কাজ সীমিত থাকবে: `--top=100` (`topMedicineSlugs(100)` থেকে, sitemap-এর একই তালিকা) অথবা `--all`।
5. Output: `data/arogga/report.csv`, কলামগুলো হলো:
   `ourSlug, ourBrand, ourStrength, ourForm, aroggaUrl, imageUrl, score, status(sure|ambiguous|none|placeholder)`
6. চাইলে `--resume` দিয়ে আগের progress থেকে আবার শুরু করা যাবে (`data/arogga/progress.json`)।

### 5.3 `scripts/arogga/3-upload.ts`: Cloudinary upload + DB write
- শুধু `report.csv`-এর `status=sure` সারিগুলো নেবে, আর user-এর পর্যালোচনার পরে `--confirm` flag দিয়েই চলবে।
- প্রতিটা ছবির জন্য:
  - Cloudinary `upload(imageUrl, { public_id: "oshudkhuji/medicines/<slug>", overwrite: false, resource_type: "image" })`। Cloudinary নিজেই URL থেকে টেনে আনে, তাই local download লাগে না।
  - তারপর `Medicine.updateOne({ slug }, { $set: { image: {..., approved: false } } })`।
- যে medicine-এ আগে থেকে `image.approved = true` আছে সেটা ছোঁবে না।
- সব শেষে revalidate: `POST /api/revalidate` `{"tags":["medicines"]}`।

## 6. Matching নিয়ম
| শর্ত | Score |
|---|---|
| Brand exact (lowercase, শুধু অক্ষর/সংখ্যা) | +3 |
| Strength সমান (normalize: `500 mg` = `500mg`, `120 mg/5 ml` = `120mg-5ml`) | +2 |
| Form সমান (form map দিয়ে) | +1 |

- **sure** = score 6 এবং একটাই candidate। score 6-এর candidate একাধিক হলে → `ambiguous`।
- Strength না থাকা medicine (strength null): brand + form মিললে `ambiguous`, যা হাতে দেখতে হবে।
- `ambiguous`/`none` কখনো auto-upload হবে না।
- Unit test: `tests/arogga-match.test.ts` (Napa 500 tablet, Seclo 20 capsule, syrup `120mg-5ml`, powder for suspension)।

## 7. Approval
Admin panel এখনো নেই, তাই দুই ধাপে approval:
1. **এখন**: upload-এর পরে `scripts/arogga/4-approve.ts --slugs=a,b,c` বা `--all-sure` চালাতে হবে, তার আগে Cloudinary Media Library-তে চোখে দেখে নিতে হবে। অথবা DB-তে সরাসরি `image.approved = true` বসানো যায়।
2. **পরে**: admin panel-এ একটা grid দেখাবে (ছবি + brand/strength/form), যেখানে approve বা reject করা যাবে (Server Action)।

## 8. দেখানো (UI)
- `next.config.ts` → `images.remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/<cloud_name>/**" }]`।
- `getMedicineDetail` select-এ `image` যোগ হবে, তবে শুধু `approved` হলে পাঠাবে।
- `components/medicine/MedicineImage.tsx` (server):
  - `next/image`, square, `sizes="(min-width:768px) 240px, 40vw"`। Cloudinary transform `f_auto,q_auto,w_480` URL-এ থাকবে (অথবা custom `loader`)।
  - `alt` = `"{brand} {strength} {dosageForm}"`।
  - ছবি না থাকলে form অনুযায়ী lucide icon (pill/syringe/bottle) দেখাবে, layout একই থাকবে।
  - নিচে ছোট caption থাকবে: "ছবি: arogga.com" / "Image: arogga.com"। দুই dictionary-তে যোগ হবে।
- SEO: medicine JSON-LD `Drug.image`-এ যোগ হবে। Medicine-এর `og:image` এখন বদলাবে না (site OG image-ই থাকবে), এ বিষয়ে পরে সিদ্ধান্ত।
- Home `PopularGrid`-এ ছবি এখন নয়, পরে বিবেচনা।

## 9. সিদ্ধান্ত বাকি (user)
1. Watermark: **A** (মূল ছবি arogga থেকে) নাকি **B** (watermark-সহ)?
2. Scope: **top 100** দিয়ে শুরু (recommended) নাকি সব?
3. Caption-এ arogga-র নাম দেখানো হবে কি? (permission-এর শর্ত দেখে)
4. Permission-এর লিখিত কপি কোথায় রাখা হবে (reference)?

## 10. Env
```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=      # এখন .env-এ "CLOUDINARRY_API_KEY" (ভুল বানান) → ঠিক করতে হবে
CLOUDINARY_API_SECRET=
```
সবগুলো server-only, `NEXT_PUBLIC_` নয়। Vercel-এও সেট করতে হবে। Package: `cloudinary` (Node SDK)।

## 11. ধাপ ও সময় (আনুমানিক)
| # | কাজ | সময় |
|---|---|---|
| 1 | Model field, env, `cloudinary` package, `remotePatterns` | ছোট |
| 2 | Sitemap script | ছোট |
| 3 | Match logic + unit test + dry-run report (top 100) | মাঝারি |
| 4 | **User report দেখবেন** | — |
| 5 | Upload script (`--confirm`) | ছোট |
| 6 | Approve script + `MedicineImage` UI + i18n + JSON-LD | মাঝারি |
| 7 | যাচাই: `tsc`, lint, medicine page, Lighthouse (CLS), Googlebot UA | ছোট |
| 8 | সব medicine চাইলে: `--all`, ~21k medicine হলে ~১ req/sec হিসেবে কয়েক ঘণ্টা | দীর্ঘ (background) |

## 12. ঝুঁকি
| ঝুঁকি | প্রতিরোধ |
|---|---|
| ভুল ওষুধের ছবি | শুধু score 6 + একক candidate, তার উপর manual approval |
| arogga HTML/CDN বদলায় | script `og:image` না পেলে `none` লিখে এগিয়ে যাবে, crash করবে না |
| arogga block/rate limit | ১ req/sec, 429-এ backoff, resumable |
| Cloudinary free quota | top 100 আগে; `w_480,f_auto` delivery |
| Permission প্রত্যাহার | `publicId` আর `source` থাকায় সব arogga ছবি এক script-এ মুছে ফেলা যাবে |
