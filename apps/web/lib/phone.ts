export const phoneCountryCodes = [
  { code: "+39", label: "IT +39" },
  { code: "+41", label: "CH +41" },
  { code: "+33", label: "FR +33" },
  { code: "+49", label: "DE +49" },
  { code: "+34", label: "ES +34" },
  { code: "+43", label: "AT +43" },
  { code: "+386", label: "SI +386" },
  { code: "+385", label: "HR +385" },
  { code: "+44", label: "UK +44" },
  { code: "+1", label: "US/CA +1" },
]

export const phoneE164Pattern = /^\+[1-9]\d{7,14}$/

export function normalizePhoneE164(
  countryCode: string,
  nationalNumber: string
) {
  const normalizedNumber = nationalNumber.trim().replace(/\D/g, "")

  if (!normalizedNumber) {
    return null
  }

  const normalizedCountryCode = countryCode.trim().replace(/[^\d+]/g, "")
  const phoneCountryCode = normalizedCountryCode.startsWith("+")
    ? normalizedCountryCode
    : `+${normalizedCountryCode}`

  return `${phoneCountryCode}${normalizedNumber}`
}

export function splitPhoneNumber(phoneE164: string | null) {
  if (!phoneE164) {
    return {
      countryCode: "+39",
      nationalNumber: "",
    }
  }

  const country = phoneCountryCodes
    .slice()
    .sort((left, right) => right.code.length - left.code.length)
    .find((item) => phoneE164.startsWith(item.code))

  if (!country) {
    return {
      countryCode: "+39",
      nationalNumber: phoneE164.replace(/^\+/, ""),
    }
  }

  return {
    countryCode: country.code,
    nationalNumber: phoneE164.slice(country.code.length),
  }
}
