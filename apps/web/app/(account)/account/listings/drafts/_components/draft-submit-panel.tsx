import { MailWarningIcon, SendIcon } from "lucide-react"

import {
  resendEmailVerificationAction,
  submitDraftForReviewAction,
} from "@/app/(account)/account/actions"
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
  emailVerified: boolean
  isReady: boolean
  nextPath: string
  readinessMessage: string
}

function DraftSubmitPanel({
  draftId,
  emailVerified,
  isReady,
  nextPath,
  readinessMessage,
}: DraftSubmitPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invio a revisione</CardTitle>
        <CardDescription>Serve almeno una foto pronta.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{readinessMessage}</p>
        {emailVerified ? null : (
          <div className="grid gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <MailWarningIcon
                className="mt-0.5 size-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <span>
                Verifica il tuo indirizzo email prima di pubblicare. Apri il
                link che ti abbiamo inviato per email.
              </span>
            </div>
            <form action={resendEmailVerificationAction}>
              <input name="nextPath" type="hidden" value={nextPath} />
              <Button type="submit" variant="outline" size="sm">
                Invia di nuovo l&apos;email
              </Button>
            </form>
          </div>
        )}
        <form action={submitDraftForReviewAction} className="flex justify-end">
          <input name="draftId" type="hidden" value={draftId} />
          <input name="nextPath" type="hidden" value={nextPath} />
          <Button disabled={!isReady || !emailVerified} type="submit">
            <SendIcon data-icon="inline-start" aria-hidden="true" />
            Invia a revisione
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export { DraftSubmitPanel }
