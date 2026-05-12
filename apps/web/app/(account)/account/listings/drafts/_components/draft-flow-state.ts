import type {
  ListingDraft,
  ListingImageListResponse,
} from "@/lib/api/account"

type DraftFlowStepStatus = "complete" | "current" | "pending" | "blocked"

type DraftFlowStep = {
  description: string
  status: DraftFlowStepStatus
  title: string
}

export type DraftFlowState = {
  dataComplete: boolean
  imageComplete: boolean
  reviewReady: boolean
  reviewMessage: string
  steps: [DraftFlowStep, DraftFlowStep, DraftFlowStep]
}

export function getDraftFlowState(
  draft?: ListingDraft,
  images?: ListingImageListResponse | null
): DraftFlowState {
  const dataComplete = draft ? isDraftDataComplete(draft) : false
  const imageComplete = Boolean(
    draft &&
      images &&
      images.meta.readyCount > 0 &&
      images.meta.pendingCount === 0 &&
      images.meta.rejectedCount === 0
  )
  const reviewReady = dataComplete && imageComplete
  const imageStepStatus = resolveImageStepStatus({
    dataComplete,
    draft,
    imageComplete,
    images,
  })
  const imageDescription = getImageDescription({ draft, images })
  const reviewMessage = getReviewMessage({
    dataComplete,
    draft,
    imageComplete,
    imageDescription,
    reviewReady,
  })

  return {
    dataComplete,
    imageComplete,
    reviewReady,
    reviewMessage,
    steps: [
      {
        description: dataComplete
          ? "Dati essenziali salvati."
          : "Completa titolo, descrizione e comune.",
        status: dataComplete ? "complete" : "current",
        title: "Dati",
      },
      {
        description: imageDescription,
        status: imageStepStatus,
        title: "Foto",
      },
      {
        description: reviewMessage,
        status: reviewReady ? "current" : "pending",
        title: "Revisione",
      },
    ],
  }
}

function isDraftDataComplete(draft: ListingDraft) {
  const hasRequiredText =
    draft.title.trim().length >= 3 && draft.description.trim().length >= 10
  const hasLocation = Boolean(draft.location)
  const hasValidAgeRange =
    draft.ageMonthsMin === null ||
    draft.ageMonthsMax === null ||
    draft.ageMonthsMin <= draft.ageMonthsMax
  const hasValidContribution =
    draft.isFree ||
    (draft.contributionCents !== null && draft.contributionCents > 0)

  return (
    hasRequiredText && hasLocation && hasValidAgeRange && hasValidContribution
  )
}

function resolveImageStepStatus({
  dataComplete,
  draft,
  imageComplete,
  images,
}: {
  dataComplete: boolean
  draft: ListingDraft | undefined
  imageComplete: boolean
  images: ListingImageListResponse | null | undefined
}): DraftFlowStepStatus {
  if (!draft || !dataComplete) {
    return "pending"
  }

  if (imageComplete) {
    return "complete"
  }

  if (images?.meta.rejectedCount) {
    return "blocked"
  }

  return "current"
}

function getImageDescription({
  draft,
  images,
}: {
  draft: ListingDraft | undefined
  images: ListingImageListResponse | null | undefined
}) {
  if (!draft) {
    return "Salva i dati per caricare le foto."
  }

  if (!images) {
    return "Immagini non disponibili. Riprova tra poco."
  }

  if (images.meta.rejectedCount > 0) {
    return "Rimuovi le foto rifiutate prima della revisione."
  }

  if (images.meta.pendingCount > 0) {
    return "Attendi che le foto in preparazione diventino Pronte."
  }

  if (images.meta.readyCount > 0) {
    return `${images.meta.readyCount} foto pronte.`
  }

  return "Aggiungi almeno una foto."
}

function getReviewMessage({
  dataComplete,
  draft,
  imageComplete,
  imageDescription,
  reviewReady,
}: {
  dataComplete: boolean
  draft: ListingDraft | undefined
  imageComplete: boolean
  imageDescription: string
  reviewReady: boolean
}) {
  if (reviewReady) {
    return "Pronto per l'invio a revisione."
  }

  if (!draft) {
    return "Dopo il salvataggio potrai aggiungere foto e inviare."
  }

  if (!dataComplete) {
    return "Completa i dati obbligatori prima di inviare."
  }

  if (!imageComplete) {
    return imageDescription
  }

  return "Completa i passaggi precedenti."
}
