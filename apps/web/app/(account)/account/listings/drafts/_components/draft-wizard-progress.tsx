import {
  CameraIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  CircleDashedIcon,
  SendIcon,
} from "lucide-react"

import {
  getDraftFlowState,
  type DraftFlowState,
} from "@/app/(account)/account/listings/drafts/_components/draft-flow-state"
import type {
  ListingDraft,
  ListingImageListResponse,
} from "@/lib/api/account"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

type DraftWizardProgressProps = {
  draft?: ListingDraft
  images?: ListingImageListResponse | null
}

const stepIcons = [ClipboardListIcon, CameraIcon, SendIcon] as const

function DraftWizardProgress({ draft, images }: DraftWizardProgressProps) {
  const flow = getDraftFlowState(draft, images)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flusso guidato</CardTitle>
        <CardDescription>
          Segui i passaggi in ordine: dati, foto pronta e invio a revisione.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-3">
          {flow.steps.map((step, index) => {
            const Icon = stepIcons[index] ?? CircleDashedIcon
            const status = getStepStatusContent(step.status)

            return (
              <li
                key={step.title}
                aria-current={step.status === "current" ? "step" : undefined}
                className={cn(
                  "flex min-w-0 gap-3 rounded-md border border-border p-3",
                  step.status === "current" ? "bg-muted/45" : "bg-background"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md border",
                    step.status === "complete"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {step.status === "complete" ? (
                    <CheckCircle2Icon aria-hidden="true" className="size-4" />
                  ) : (
                    <Icon aria-hidden="true" className="size-4" />
                  )}
                </span>

                <div className="grid min-w-0 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{step.title}</span>
                    <Badge variant={status.variant}>
                      {status.icon ? (
                        <CircleDashedIcon
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                      ) : null}
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

function getStepStatusContent(
  status: DraftFlowState["steps"][number]["status"]
): {
  icon: boolean
  label: string
  variant: "default" | "destructive" | "outline" | "secondary"
} {
  if (status === "complete") {
    return { icon: false, label: "Fatto", variant: "secondary" }
  }

  if (status === "current") {
    return { icon: true, label: "Ora", variant: "default" }
  }

  if (status === "blocked") {
    return { icon: false, label: "Da correggere", variant: "destructive" }
  }

  return { icon: false, label: "In attesa", variant: "outline" }
}

export { DraftWizardProgress }
