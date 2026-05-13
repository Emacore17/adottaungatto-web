import Link from "next/link"

import { loginAction } from "@/app/(auth)/login/actions"
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

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const next = typeof params.next === "string" ? params.next : routes.account
  const hasError = typeof params.error === "string"

  return (
    <Card className="w-full max-w-md ring-brand-teal/20">
      <CardHeader>
        <CardTitle className="text-2xl">Accedi</CardTitle>
        <CardDescription>Entra nel tuo account.</CardDescription>
      </CardHeader>
      <form action={loginAction}>
        <input type="hidden" name="next" value={next} />
        <CardContent>
          <FieldGroup>
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
                autoComplete="current-password"
                required
                aria-invalid={hasError || undefined}
              />
            </Field>
            {hasError ? (
              <p className="text-sm text-destructive">
                Credenziali non valide.
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit">Accedi</Button>
          <Button asChild variant="secondary">
            <Link href={routes.register}>Crea account</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
