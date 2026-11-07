import { ImageResponse } from "next/og";

// Default share image for every page under /[lang] (Facebook, WhatsApp, X, LinkedIn previews).
// English text only: the OG renderer has no Bangla font bundled.
export const alt = "MedicineMate — medicine prices & cheaper alternatives in Bangladesh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(135deg, #0b1215 0%, #0f2a2a 60%, #0f766e 140%)",
          color: "#e6f2f1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#2dd4bf",
              color: "#0b1215",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 44, fontWeight: 800 }}>MedicineMate</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>
          Know medicine prices. Find cheaper alternatives.
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#9fc9c4" }}>
          21,000+ medicines in Bangladesh · interactions · prescription scan
        </div>
      </div>
    ),
    size
  );
}
