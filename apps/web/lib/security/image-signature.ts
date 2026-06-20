import type { ListingImageMimeType } from "@workspace/validation/listings"

// Verifica che i byte iniziali del file corrispondano davvero al tipo immagine
// dichiarato. Il mimeType inviato dal client (File.type) è spoofabile: senza
// questo controllo un utente potrebbe far passare contenuto arbitrario (HTML,
// SVG, ecc.) etichettato come immagine. Difesa sincrona, prima dello storage.

const imageSignatureChecks: Record<
  ListingImageMimeType,
  (header: Uint8Array) => boolean
> = {
  "image/jpeg": (header) =>
    header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
  "image/png": (header) =>
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a,
  // RIFF....WEBP
  "image/webp": (header) =>
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50,
}

export async function hasAllowedImageSignature(
  file: Blob,
  mimeType: ListingImageMimeType
): Promise<boolean> {
  const check = imageSignatureChecks[mimeType]

  if (!check) {
    return false
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())

  if (header.length < 12) {
    return false
  }

  return check(header)
}
