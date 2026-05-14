type DraftActionMessageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

const messages = {
  created: "Annuncio salvato. Puoi aggiungere o ordinare le foto.",
  saved: "Modifiche salvate.",
  submitted: "Annuncio inviato in revisione.",
  uploaded: "Foto aggiornata.",
} as const

const errors = {
  api: "Salvataggio non riuscito. Riprova.",
  invalid: "Controlla titolo, descrizione, comune e prezzo.",
  "invalid-image": "Usa JPG, PNG o WebP fino a 10 MB. Max 10 foto.",
  "image-api": "Foto non caricata. Riprova.",
  "image-storage": "Upload interrotto. Riprova.",
  "image-confirm": "Foto non confermata. Riprova.",
  "image-cover": "Copertina non aggiornata.",
  "image-delete": "Foto non eliminata.",
  "image-order": "Ordine foto non salvato.",
  "not-ready": "Aggiungi i dati obbligatori e una foto pronta.",
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
