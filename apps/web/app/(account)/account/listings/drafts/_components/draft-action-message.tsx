type DraftActionMessageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

const messages = {
  created:
    "Dati salvati. Aggiungi almeno una foto e attendi che diventi Pronta.",
  saved: "Modifiche salvate.",
  submitted:
    "Annuncio inserito e inviato in revisione. Riceverai una notifica quando sara pubblicato.",
  uploaded:
    "Immagine caricata. Il worker la prepara automaticamente: se resta In preparazione, attendi qualche secondo e aggiorna.",
} as const

const errors = {
  api: "Operazione non completata. Riprova tra poco.",
  invalid: "Controlla i campi dell'annuncio.",
  "invalid-image": "Seleziona un file JPG, PNG o WebP fino a 10 MB.",
  "image-api": "Upload non inizializzato. Riprova tra poco.",
  "image-storage": "Upload file non completato.",
  "image-confirm": "Upload non confermato.",
  "image-cover": "Copertina non aggiornata.",
  "image-delete": "Immagine non eliminata.",
  "image-order": "Ordine immagini non aggiornato.",
  "not-ready":
    "Annuncio non pronto: servono dati completi, comune e almeno una immagine Pronta. Se una foto e In preparazione, attendi qualche secondo e riprova.",
} as const

function DraftActionMessage({ searchParams }: DraftActionMessageProps) {
  const success = pickMessage(searchParams, messages)
  const error = pickMessage(searchParams, errors, "error")

  if (!success && !error) {
    return null
  }

  return (
    <div
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          : "rounded-md border border-brand-olive/30 bg-brand-olive-soft px-4 py-3 text-sm text-brand-teal-ink"
      }
    >
      {error ?? success}
    </div>
  )
}

function pickMessage<T extends Record<string, string>>(
  searchParams: Record<string, string | string[] | undefined>,
  dictionary: T,
  singleKey?: string
) {
  if (singleKey) {
    const value = readParam(searchParams[singleKey])

    return value && Object.hasOwn(dictionary, value)
      ? dictionary[value as keyof T]
      : null
  }

  for (const [key, message] of Object.entries(dictionary)) {
    if (readParam(searchParams[key])) {
      return message
    }
  }

  return null
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export { DraftActionMessage }
