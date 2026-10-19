import { createWhatsAppLink } from "../Components/WhatsApp/whatsapp"
import { getTierFromFollowers } from "../Components/Models/creatorTierData"

export function buildCreatorWhatsAppMessage(payload) {
  const tier = getTierFromFollowers(payload.followerCount)
  const lines = [
    "✨ *VELISQA — Creator Program Application*",
    "",
    "*Applicant details*",
    `Name: ${payload.fullName}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `City: ${payload.city}`,
    "",
    "*Social presence*",
    `Platform: ${payload.platform}`,
    `Handle: ${payload.handle}`,
    `Followers: ${payload.followerCount}${tier ? ` (${tier.name})` : ""}`,
    `Niche: ${payload.niche}`,
    payload.portfolioUrl ? `Portfolio: ${payload.portfolioUrl}` : null,
    "",
    payload.message ? `*About their content:*\n${payload.message}` : null,
    "",
    "Please review and confirm onboarding. Thank you!",
  ].filter(Boolean)

  return lines.join("\n")
}

export function submitCreatorApplication(payload) {
  window.open(createWhatsAppLink(buildCreatorWhatsAppMessage(payload)), "_blank", "noopener,noreferrer")
  return { ok: true, channel: "whatsapp" }
}
