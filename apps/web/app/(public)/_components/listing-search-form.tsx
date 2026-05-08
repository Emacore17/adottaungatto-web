import { SearchIcon } from "lucide-react"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type ListingSearchFormProps = {
  defaultQuery?: string | null
}

function ListingSearchForm({ defaultQuery }: ListingSearchFormProps) {
  return (
    <form action={routes.listings()} className="w-full">
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="q">Cerca per razza, luogo o parola chiave</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="q"
              name="q"
              defaultValue={defaultQuery ?? ""}
              minLength={2}
              maxLength={120}
              placeholder="Siamese Roma"
              autoComplete="off"
            />
            <Button type="submit" className="sm:w-auto">
              <SearchIcon data-icon="inline-start" aria-hidden="true" />
              Cerca
            </Button>
          </div>
        </Field>
      </FieldGroup>
    </form>
  )
}

export { ListingSearchForm }
