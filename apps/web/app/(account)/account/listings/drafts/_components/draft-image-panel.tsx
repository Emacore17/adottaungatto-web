import Image from "next/image"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ImageIcon,
  ImageUpIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"

import {
  deleteDraftImageAction,
  moveDraftImageAction,
  setDraftImageCoverAction,
  uploadDraftImageAction,
} from "@/app/(account)/account/actions"
import { getPublicObjectUrl } from "@/lib/api/assets"
import type {
  ListingImage,
  ListingImageListResponse,
} from "@/lib/api/account"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type DraftImagePanelProps = {
  draftId: string
  images: ListingImageListResponse | null
  nextPath: string
}

const imageStatusLabels: Record<ListingImage["status"], string> = {
  uploaded: "Da preparare",
  processing: "In preparazione",
  ready: "Pronta",
  rejected: "Rifiutata",
}

function DraftImagePanel({ draftId, images, nextPath }: DraftImagePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Immagini</CardTitle>
        <CardDescription>
          Carica foto JPG, PNG o WebP fino a 10 MB. Dopo il caricamento vengono
          preparate automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {images ? (
          <DraftImageGallery
            draftId={draftId}
            images={images}
            nextPath={nextPath}
          />
        ) : (
          <div
            role="status"
            className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
          >
            Immagini non disponibili.
          </div>
        )}

        <form
          action={uploadDraftImageAction}
          className="grid gap-5"
          encType="multipart/form-data"
        >
          <input name="draftId" type="hidden" value={draftId} />
          <input name="nextPath" type="hidden" value={nextPath} />

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="image">File</FieldLabel>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="isCover" name="isCover" value="true" />
              <FieldContent>
                <FieldLabel htmlFor="isCover">Immagine principale</FieldLabel>
                <FieldDescription>
                  Se non ci sono immagini, la prima foto diventa principale.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button type="submit" variant="outline">
              <ImageUpIcon data-icon="inline-start" aria-hidden="true" />
              Aggiungi foto
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DraftImageGallery({
  draftId,
  images,
  nextPath,
}: {
  draftId: string
  images: ListingImageListResponse
  nextPath: string
}) {
  const imageIds = images.items.map((image) => image.id)

  if (images.items.length === 0) {
    return (
      <Empty className="rounded-md p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImageIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Nessuna immagine</EmptyTitle>
          <EmptyDescription>
            Aggiungi almeno una foto: diventera Pronta prima dell&apos;invio a
            revisione.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          {images.meta.total}/{images.meta.maxItems} immagini
        </span>
        <span className="text-muted-foreground">
          {images.meta.readyCount} pronte, {images.meta.pendingCount} in corso,{" "}
          {images.meta.rejectedCount} rifiutate
        </span>
      </div>

      <div className="grid gap-3">
        {images.items.map((image, index) => (
          <DraftImageItem
            key={image.id}
            canMoveDown={index < images.items.length - 1}
            canMoveUp={index > 0}
            draftId={draftId}
            image={image}
            imageIds={imageIds}
            nextPath={nextPath}
          />
        ))}
      </div>
    </div>
  )
}

function DraftImageItem({
  canMoveDown,
  canMoveUp,
  draftId,
  image,
  imageIds,
  nextPath,
}: {
  canMoveDown: boolean
  canMoveUp: boolean
  draftId: string
  image: ListingImage
  imageIds: string[]
  nextPath: string
}) {
  const previewUrl = getPublicObjectUrl(
    image.status === "ready"
      ? (image.objectKeyThumb ?? image.objectKeyLarge)
      : null
  )

  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
        <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Anteprima immagine annuncio"
              fill
              className="object-cover"
              sizes="88px"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(image.status)}>
              {imageStatusLabels[image.status]}
            </Badge>
            {image.isCover ? <Badge variant="secondary">Copertina</Badge> : null}
          </div>

          <p className="text-sm text-muted-foreground">
            {formatImageDetails(image)}
          </p>

          {image.rejectionReason ? (
            <p className="text-sm text-destructive">{image.rejectionReason}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <MoveImageForm
          direction="up"
          disabled={!canMoveUp}
          draftId={draftId}
          image={image}
          imageIds={imageIds}
          nextPath={nextPath}
        />
        <MoveImageForm
          direction="down"
          disabled={!canMoveDown}
          draftId={draftId}
          image={image}
          imageIds={imageIds}
          nextPath={nextPath}
        />

        {!image.isCover ? (
          <form action={setDraftImageCoverAction}>
            <DraftImageActionInputs
              draftId={draftId}
              imageId={image.id}
              nextPath={nextPath}
            />
            <Button type="submit" size="sm" variant="outline">
              <StarIcon data-icon="inline-start" aria-hidden="true" />
              Copertina
            </Button>
          </form>
        ) : null}

        <form action={deleteDraftImageAction}>
          <DraftImageActionInputs
            draftId={draftId}
            imageId={image.id}
            nextPath={nextPath}
          />
          <Button type="submit" size="sm" variant="destructive">
            <Trash2Icon data-icon="inline-start" aria-hidden="true" />
            Elimina
          </Button>
        </form>
      </div>
    </div>
  )
}

function MoveImageForm({
  direction,
  disabled,
  draftId,
  image,
  imageIds,
  nextPath,
}: {
  direction: "up" | "down"
  disabled: boolean
  draftId: string
  image: ListingImage
  imageIds: string[]
  nextPath: string
}) {
  const Icon = direction === "up" ? ArrowUpIcon : ArrowDownIcon

  return (
    <form action={moveDraftImageAction}>
      <DraftImageActionInputs
        draftId={draftId}
        imageId={image.id}
        nextPath={nextPath}
      />
      <input name="direction" type="hidden" value={direction} />
      {imageIds.map((imageId) => (
        <input key={imageId} name="imageIds" type="hidden" value={imageId} />
      ))}
      <Button disabled={disabled} type="submit" size="sm" variant="outline">
        <Icon data-icon="inline-start" aria-hidden="true" />
        {direction === "up" ? "Su" : "Giu"}
      </Button>
    </form>
  )
}

function DraftImageActionInputs({
  draftId,
  imageId,
  nextPath,
}: {
  draftId: string
  imageId: string
  nextPath: string
}) {
  return (
    <>
      <input name="draftId" type="hidden" value={draftId} />
      <input name="imageId" type="hidden" value={imageId} />
      <input name="nextPath" type="hidden" value={nextPath} />
    </>
  )
}

function getStatusVariant(
  status: ListingImage["status"]
): "secondary" | "outline" | "destructive" {
  if (status === "rejected") {
    return "destructive"
  }

  if (status === "ready") {
    return "secondary"
  }

  return "outline"
}

function formatImageDetails(image: ListingImage) {
  const dimensions =
    image.width && image.height ? `${image.width} x ${image.height}px` : null

  return [dimensions, formatFileSize(image.sizeBytes)]
    .filter(Boolean)
    .join(" - ")
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

export { DraftImagePanel }
