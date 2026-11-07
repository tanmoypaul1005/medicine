import type { MetadataRoute } from "next";

// /manifest.webmanifest — name, icons and colours for "Add to home screen" (Android/Chrome).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedicineMate — ওষুধের দাম ও সস্তা বিকল্প",
    short_name: "MedicineMate",
    description: "বাংলাদেশের যেকোনো ওষুধের দাম, সস্তা বিকল্প, সতর্কতা ও drug interaction।",
    start_url: "/bn",
    display: "standalone",
    background_color: "#0b1215",
    theme_color: "#0f766e",
    lang: "bn",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
