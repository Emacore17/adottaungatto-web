"use client"

import Image from "next/image"
import { useEffect, useState, type ChangeEvent } from "react"
import { StarIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type PreviewImage = {
  id: string
  name: string
  url: string
}

function DraftInitialImageField() {
  const [coverIndex, setCoverIndex] = useState(0)
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [tooManyFiles, setTooManyFiles] = useState(false)

  useEffect(() => {
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [previews])

  function onFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? [])
    const files = selectedFiles.slice(0, 10)

    setTooManyFiles(selectedFiles.length > 10)
    setPreviews((current) => {
      for (const preview of current) {
        URL.revokeObjectURL(preview.url)
      }

      return files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
      }))
    })
    setCoverIndex(0)
  }

  return (
    <Field>
      <FieldLabel htmlFor="images">Foto</FieldLabel>
      <Input
        id="images"
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onFilesChange}
      />
      <input name="initialCoverIndex" type="hidden" value={coverIndex} />
      <FieldDescription
        className={tooManyFiles ? "text-destructive" : undefined}
      >
        {tooManyFiles
          ? "Massimo 10 foto. Rimuovi quelle in piu."
          : "Puoi scegliere subito copertina e ordine."}
      </FieldDescription>

      {previews.length > 0 ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <p className="text-sm font-medium">Copertina</p>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              <Image
                src={previews[coverIndex]?.url ?? previews[0]?.url ?? ""}
                alt="Anteprima copertina"
                fill
                unoptimized
                className="object-cover"
                sizes="(min-width: 768px) 704px, 100vw"
              />
            </div>
          </div>

          <p className="text-sm font-medium">Ordine foto</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {previews.map((preview, index) => (
              <button
                key={preview.id}
                type="button"
                aria-pressed={index === coverIndex}
                className="group grid gap-1 text-left"
                onClick={() => setCoverIndex(index)}
              >
                <span className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={preview.url}
                    alt={preview.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  {index === coverIndex ? (
                    <Badge className="absolute top-1 left-1">Cover</Badge>
                  ) : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {index + 1}. {preview.name}
                </span>
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setCoverIndex(0)}
          >
            <StarIcon data-icon="inline-start" aria-hidden="true" />
            Prima foto come cover
          </Button>
        </div>
      ) : null}
    </Field>
  )
}

export { DraftInitialImageField }
