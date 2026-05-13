import { ImageResponse } from "next/og"

export const alt = "adottaungatto.it"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#fffbf5",
        color: "#2a2421",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: "72px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: "820px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "14px",
            height: "10px",
            width: "360px",
          }}
        >
          {["#ee5659", "#f7a010", "#00a9aa", "#89ad35"].map((color) => (
            <div
              key={color}
              style={{
                background: color,
                borderRadius: "999px",
                flex: 1,
              }}
            />
          ))}
        </div>
        <div
          style={{
            color: "#006f72",
            fontSize: "34px",
            fontWeight: 600,
          }}
        >
          adottaungatto.it
        </div>
        <div
          style={{
            fontSize: "76px",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          Gatti in adozione
        </div>
        <div
          style={{
            color: "#70635c",
            fontSize: "30px",
            lineHeight: 1.35,
          }}
        >
          Annunci verificati, ricerca locale e schede essenziali.
        </div>
      </div>
    </div>,
    size
  )
}
