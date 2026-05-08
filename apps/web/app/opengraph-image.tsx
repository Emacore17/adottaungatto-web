import { ImageResponse } from "next/og"

export const alt = "adottaungatto.it"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#fbfbfb",
          color: "#20191f",
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
              color: "#6f6670",
              fontSize: "30px",
              lineHeight: 1.35,
            }}
          >
            Annunci verificati, ricerca locale e schede essenziali.
          </div>
        </div>
      </div>
    ),
    size
  )
}
