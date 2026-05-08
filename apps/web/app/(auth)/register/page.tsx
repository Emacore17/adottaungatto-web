import Link from "next/link"

import { registerAction } from "@/app/(auth)/register/actions"
import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams
  const hasError = typeof params.error === "string"

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Crea account</CardTitle>
        <CardDescription>Apri il tuo profilo personale.</CardDescription>
      </CardHeader>
      <form action={registerAction}>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={hasError || undefined}>
              <FieldLabel htmlFor="displayName">Nome visualizzato</FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={hasError || undefined}
              />
            </Field>
            <Field data-invalid={hasError || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={hasError || undefined}
              />
            </Field>
            <Field data-invalid={hasError || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                aria-invalid={hasError || undefined}
              />
            </Field>
            {hasError ? (
              <p className="text-sm text-destructive">
                I dati inseriti non sono validi.
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit">Crea account</Button>
          <Button asChild variant="ghost">
            <Link href={routes.login()}>Ho gia un account</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
