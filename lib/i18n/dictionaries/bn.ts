const bn = {
  meta: {
    title: "MedicineMate — ওষুধের দাম ও সস্তা বিকল্প",
    description: "বাংলাদেশের যেকোনো ওষুধের দাম, একই generic-এর সস্তা বিকল্প আর সতর্কতা এক জায়গায়।",
  },
  nav: { medicines: "ওষুধের তালিকা", interactions: "Interaction checker", scan: "Prescription scan", login: "Login" },
  langToggle: { label: "English", aria: "Switch to English" },
  search: {
    placeholder: "ওষুধের নাম লিখুন — Napa, Paracetamol, নাপা…",
    aria: "ওষুধ খুঁজুন",
    submit: "খুঁজুন",
  },
  home: {
    badge: "বাংলাদেশের ২০,০০০+ ওষুধের তথ্য",
    titleA: "ওষুধের দাম জানুন, ",
    titleHighlight: "সস্তা বিকল্প",
    titleB: " খুঁজুন",
    subtitle: "Brand, generic, বাংলা নাম বা ভুল বানান — যেভাবেই লিখুন, সঠিক ওষুধ খুঁজে পাবেন।",
    examples: "উদাহরণ:",
    scanTitle: "Prescription scan করুন",
    scanBody: "ছবি তুলুন — সব ওষুধ, তাদের সস্তা বিকল্প আর মোট সাশ্রয় একসাথে দেখুন।",
    scanCta: "শুরু করুন",
    popular: "জনপ্রিয় ওষুধ",
    features: {
      alternatives: {
        title: "সস্তা বিকল্প",
        body: "একই generic, strength ও form-এর অন্য brand দাম অনুযায়ী — কত টাকা বাঁচবে তা সহ।",
      },
      interactions: {
        title: "Drug interaction",
        body: "দুই বা তার বেশি ওষুধ একসাথে খাওয়া নিরাপদ কিনা, ঝুঁকির মাত্রা সহ।",
      },
      warnings: {
        title: "সতর্কতা",
        body: "Pregnancy category, contraindication আর সাধারণ side effect এক জায়গায়।",
      },
    },
  },
  medicines: {
    title: "ওষুধের তালিকা",
    subtitle: "বাংলাদেশে পাওয়া সব ওষুধ — brand, generic, কোম্পানি আর দাম।",
    searchPlaceholder: "Brand বা generic নাম…",
    filter: "দেখান",
    reset: "রিসেট",
    types: { all: "সব ধরন", allopathic: "Allopathic", herbal: "Herbal" },
    sorts: { brand: "নাম (A–Z)", "price-asc": "দাম: কম থেকে বেশি", "price-desc": "দাম: বেশি থেকে কম" },
    cols: { brand: "Brand", strength: "Strength", form: "ধরন", generic: "Generic", manufacturer: "কোম্পানি", price: "দাম/একক" },
    total: "মোট {n}টি ওষুধ",
    pageOf: "পৃষ্ঠা {p} / {n}",
    prev: "আগের",
    next: "পরের",
    empty: "কোনো ওষুধ পাওয়া যায়নি।",
    noPrice: "—",
    herbal: "Herbal",
  },
  disclaimer: "এটা শুধু তথ্য। ডাক্তারের পরামর্শ ছাড়া ওষুধ শুরু, বন্ধ বা বদলাবেন না।",
  footer: "শুধু তথ্যের জন্য, চিকিৎসা পরামর্শ নয়।",
};

export type Dictionary = typeof bn;
export default bn;
