export type ListingLifecyclePolicy = {
  cleanupBatchSize: number
  cleanupIntervalSeconds: number
  defaultActiveLimit: number
  organizationActiveLimit: number
  publishedTtlDays: number
  retainTerminalDays: number
  staleDraftTtlDays: number
}

export const defaultListingLifecyclePolicy: ListingLifecyclePolicy = {
  defaultActiveLimit: 5,
  organizationActiveLimit: 50,
  publishedTtlDays: 60,
  staleDraftTtlDays: 30,
  retainTerminalDays: 180,
  cleanupIntervalSeconds: 3600,
  cleanupBatchSize: 100,
}

export function getActiveListingLimit(
  profileType: string,
  policy: Pick<
    ListingLifecyclePolicy,
    "defaultActiveLimit" | "organizationActiveLimit"
  > = defaultListingLifecyclePolicy
) {
  return profileType === "association" || profileType === "shelter"
    ? policy.organizationActiveLimit
    : policy.defaultActiveLimit
}
