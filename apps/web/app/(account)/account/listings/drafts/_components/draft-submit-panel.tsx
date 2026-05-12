import { SendIcon } from "lucide-react"

import { submitDraftForReviewAction } from "@/app/(account)/account/actions"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type DraftSubmitPanelProps = {
  draftId: string
  isReady: boolean
  nextPath: string
  readinessMessage: string
}

function DraftSubmitPanel({
  draftId,
  isReady,
  nextPath,
  readinessMessage,
}: DraftSubmitPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invio a revisione</CardTitle>
        <CardDescription>
          Puoi inviare quando i dati sono completi e almeno una foto risulta
          Pronta.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {readinessMessage}
        </p>
        <form action={submitDraftForReviewAction} className="flex justify-end">
          <input name="draftId" type="hidden" value={draftId} />
          <input name="nextPath" type="hidden" value={nextPath} />
          <Button disabled={!isReady} type="submit">
            <SendIcon data-icon="inline-start" aria-hidden="true" />
            Invia a revisione
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export { DraftSubmitPanel }
