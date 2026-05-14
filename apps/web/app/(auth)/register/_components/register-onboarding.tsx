"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  Building2Icon,
  ChevronRightIcon,
  HeartHandshakeIcon,
  HomeIcon,
  UserPlusIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"
import type { AuthRegisterInput } from "@workspace/validation/auth"

import { phoneCountryCodes } from "@/lib/phone"
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
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"

type RegisterOnboardingProps = {
  action: (formData: FormData) => Promise<void> | void
  hasError: boolean
}

type ProfileType = AuthRegisterInput["profileType"]

const profileOptions: Array<{
  icon: LucideIcon
  label: string
  tone: string
  value: ProfileType
}> = [
  {
    icon: UserRoundIcon,
    label: "Privato",
    tone: "bg-brand-teal-soft text-brand-teal-ink",
    value: "private",
  },
  {
    icon: HomeIcon,
    label: "Rifugio",
    tone: "bg-brand-amber-soft text-brand-ink",
    value: "shelter",
  },
  {
    icon: HeartHandshakeIcon,
    label: "Associazione",
    tone: "bg-brand-coral-soft text-brand-ink",
    value: "association",
  },
  {
    icon: Building2Icon,
    label: "Allevatore",
    tone: "bg-brand-olive-soft text-brand-teal-ink",
    value: "breeder",
  },
]

function RegisterOnboarding({ action, hasError }: RegisterOnboardingProps) {
  const [step, setStep] = useState<0 | 1>(hasError ? 1 : 0)
  const [profileType, setProfileType] = useState<ProfileType>("private")
  const [phoneNationalNumber, setPhoneNationalNumber] = useState("")
  const selectedProfile = profileOptions.find(
    (option) => option.value === profileType
  )

  return (
    <Card className="w-full max-w-md border-brand-teal/18 bg-card/92 shadow-[0_28px_84px_-60px_color-mix(in_oklab,var(--color-brand-teal-ink)_70%,transparent)] ring-brand-teal/18 supports-backdrop-filter:bg-card/88 supports-backdrop-filter:backdrop-blur-xl">
      <CardHeader className="gap-3 px-5 pt-6 pb-2 sm:px-6 sm:pt-7">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-2xl">
            {step === 0 ? "Partiamo da te" : "Crea account"}
          </CardTitle>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  step === index
                    ? "w-8 bg-primary"
                    : "w-3 bg-muted-foreground/28"
                )}
              />
            ))}
          </div>
        </div>
        <CardDescription>
          {step === 0
            ? "Scegli il profilo, poi completi i dati."
            : selectedProfile
              ? `${selectedProfile.label}: manca solo l'accesso.`
              : "Manca solo l'accesso."}
        </CardDescription>
      </CardHeader>

      {step === 0 ? (
        <>
          <CardContent className="px-5 py-5 motion-safe:animate-[auth-step-in_320ms_ease-out] sm:px-6">
            <FieldSet className="gap-3">
              <FieldLegend className="sr-only">Tipo profilo</FieldLegend>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {profileOptions.map((option) => {
                  const Icon = option.icon
                  const selected = option.value === profileType

                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "group relative flex min-h-32 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border bg-card/76 p-3 shadow-sm transition-[border-color,box-shadow,transform,background-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 hover:-translate-y-0.5 hover:border-primary/35 sm:min-h-36",
                        selected &&
                          "border-primary bg-brand-teal-soft/70 shadow-[0_20px_52px_-42px_color-mix(in_oklab,var(--color-primary)_82%,transparent)]"
                      )}
                    >
                      <input
                        type="radio"
                        name="profile-preview"
                        value={option.value}
                        checked={selected}
                        onChange={() => setProfileType(option.value)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                          option.tone
                        )}
                      >
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="flex items-end justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {option.label}
                        </span>
                        {selected ? (
                          <BadgeCheckIcon
                            aria-hidden="true"
                            className="size-4 text-primary"
                          />
                        ) : null}
                      </span>
                    </label>
                  )
                })}
              </div>
            </FieldSet>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 px-5 pb-6 sm:px-6 sm:pb-7">
            <Button
              type="button"
              size="lg"
              onClick={() => setStep(1)}
              className="w-full"
            >
              Continua
              <ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
            </Button>
            <Button asChild variant="link" className="w-full">
              <Link href={routes.login()}>Ho gia un account</Link>
            </Button>
          </CardFooter>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="profileType" value={profileType} />
          <CardContent className="px-5 py-5 motion-safe:animate-[auth-step-in_320ms_ease-out] sm:px-6">
            <FieldGroup className="gap-4">
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor="displayName">Nome</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  aria-invalid={hasError || undefined}
                  placeholder="Come vuoi apparire"
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
                  placeholder="nome@email.it"
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
                  placeholder="Almeno 10 caratteri"
                />
              </Field>
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor="passwordConfirm">
                  Conferma password
                </FieldLabel>
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                  aria-invalid={hasError || undefined}
                  placeholder="Ripeti la password"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phoneNationalNumber">
                  Telefono facoltativo
                </FieldLabel>
                <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <NativeSelect
                    name="phoneCountryCode"
                    aria-label="Prefisso internazionale"
                    className="w-full"
                    defaultValue="+39"
                  >
                    {phoneCountryCodes.map((country) => (
                      <NativeSelectOption
                        key={country.code}
                        value={country.code}
                      >
                        {country.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Input
                    id="phoneNationalNumber"
                    name="phoneNationalNumber"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="3331234567"
                    value={phoneNationalNumber}
                    onChange={(event) =>
                      setPhoneNationalNumber(event.currentTarget.value)
                    }
                  />
                </div>
              </Field>
              <Field
                orientation="horizontal"
                data-disabled={!phoneNationalNumber.trim()}
              >
                <Checkbox
                  id="showPhoneOnListings"
                  name="showPhoneOnListings"
                  value="true"
                  disabled={!phoneNationalNumber.trim()}
                />
                <FieldContent>
                  <FieldLabel htmlFor="showPhoneOnListings">
                    Mostralo nei miei annunci
                  </FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Il numero sara visibile solo dopo la verifica.
                  </p>
                </FieldContent>
              </Field>
              {hasError ? (
                <p className="text-sm text-destructive">
                  Controlla i dati o cambia email.
                </p>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col-reverse items-stretch gap-3 px-5 pb-6 sm:px-6 sm:pb-7">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setStep(0)}
              aria-label="Torna allo step precedente"
            >
              <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
              Indietro
            </Button>
            <Button type="submit" size="lg" className="w-full">
              <UserPlusIcon aria-hidden="true" data-icon="inline-start" />
              Crea account
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}

export { RegisterOnboarding }
