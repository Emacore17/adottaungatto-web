import { routes } from "@/lib/routes"

export function getSafeNextPath(value: FormDataEntryValue | string | undefined) {
  if (typeof value !== "string") {
    return routes.account
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return routes.account
  }

  return value
}
