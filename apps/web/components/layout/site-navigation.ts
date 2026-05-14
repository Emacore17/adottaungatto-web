import { routes } from "@/lib/routes"

export type SiteNavigationIcon =
  | "file-text"
  | "home"
  | "log-in"
  | "search"
  | "user"
  | "user-plus"

export type SiteNavigationItem = {
  href: string
  label: string
  description: string
  activePaths: readonly string[]
  activeMatch?: "exact" | "section"
  icon: SiteNavigationIcon
  variant?: "accent"
}

export type SiteHeaderNavigation = {
  left: readonly SiteNavigationItem[]
  right: readonly SiteNavigationItem[]
  mobile: readonly SiteNavigationItem[]
}

const homeNavigationItem = {
  href: routes.home,
  label: "Home",
  description: "Torna alla pagina iniziale.",
  activePaths: [routes.home],
  icon: "home",
} as const satisfies SiteNavigationItem

const listingsNavigationItem = {
  href: routes.listings(),
  label: "Annunci",
  description: "Sfoglia i gatti disponibili per l'adozione.",
  activePaths: ["/listings"],
  icon: "search",
} as const satisfies SiteNavigationItem

const loginNavigationItem = {
  href: routes.login(routes.accountDrafts),
  label: "Accedi",
  description: "Entra nel tuo profilo personale.",
  activePaths: ["/login"],
  activeMatch: "exact",
  icon: "log-in",
} as const satisfies SiteNavigationItem

const registerNavigationItem = {
  href: routes.register,
  label: "Registrati",
  description: "Apri un account per gestire le adozioni.",
  activePaths: ["/register"],
  activeMatch: "exact",
  icon: "user-plus",
  variant: "accent",
} as const satisfies SiteNavigationItem

const accountNavigationItem = {
  href: routes.account,
  label: "Account",
  description: "Gestisci profilo e preferenze.",
  activePaths: ["/account"],
  activeMatch: "exact",
  icon: "user",
} as const satisfies SiteNavigationItem

const draftsNavigationItem = {
  href: routes.accountDraftNew,
  label: "Inserisci annuncio",
  description: "Avvia un nuovo annuncio.",
  activePaths: [routes.accountDraftNew],
  activeMatch: "exact",
  icon: "file-text",
  variant: "accent",
} as const satisfies SiteNavigationItem

const publicRightNavigation = [
  loginNavigationItem,
  registerNavigationItem,
] as const satisfies readonly SiteNavigationItem[]

const accountRightNavigation = [
  draftsNavigationItem,
] as const satisfies readonly SiteNavigationItem[]

const leftNavigation = [
  homeNavigationItem,
  listingsNavigationItem,
] as const satisfies readonly SiteNavigationItem[]

export function createSiteHeaderNavigation(
  isAuthenticated: boolean
): SiteHeaderNavigation {
  const right = isAuthenticated ? accountRightNavigation : publicRightNavigation
  const mobile = isAuthenticated
    ? [...leftNavigation, accountNavigationItem, draftsNavigationItem]
    : [...leftNavigation, ...right]

  return {
    left: leftNavigation,
    right,
    mobile,
  }
}

export function isActiveNavigationItem(
  pathname: string,
  item: SiteNavigationItem
) {
  return item.activePaths.some((activePath) => {
    if (activePath === routes.home || item.activeMatch === "exact") {
      return pathname === activePath
    }

    return pathname === activePath || pathname.startsWith(`${activePath}/`)
  })
}

export function isCurrentNavigationItem(
  pathname: string,
  item: SiteNavigationItem
) {
  return item.activePaths.some((activePath) => pathname === activePath)
}
