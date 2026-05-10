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
  nextPath: string
}

function DraftSubmitPanel({ draftId, nextPath }: DraftSubmitPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderazione</CardTitle>
        <CardDescription>
          La richiesta richiede dati completi e almeno una foto processata.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submitDraftForReviewAction} className="flex justify-end">
          <input name="draftId" type="hidden" value={draftId} />
          <input name="nextPath" type="hidden" value={nextPath} />
          <Button type="submit">
            <SendIcon data-icon="inline-start" aria-hidden="true" />
            Invia a revisione
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export { DraftSubmitPanel }
