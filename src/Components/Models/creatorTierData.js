export const CREATOR_TIERS = [
  {
    id: "nano",
    name: "Nano Creator",
    range: "1K – 10K",
    minFollowers: 1000,
    maxFollowers: 9999,
    accent: "#b97189",
    perks: [
      "Complimentary signature piece (up to ₹2,499)",
      "15% creator discount on all orders",
      "Early access to new drops",
      "Featured on Velisqa stories",
    ],
  },
  {
    id: "micro",
    name: "Micro Creator",
    range: "10K – 50K",
    minFollowers: 10000,
    maxFollowers: 49999,
    accent: "#d4af37",
    perks: [
      "Complimentary curated set (up to ₹4,999)",
      "20% creator discount on all orders",
      "Priority campaign briefings",
      "Monthly gifting allowance",
    ],
    featured: true,
  },
  {
    id: "mid",
    name: "Mid-Tier Creator",
    range: "50K – 250K",
    minFollowers: 50000,
    maxFollowers: 249999,
    accent: "#afa0d1",
    perks: [
      "Premium jewellery gift box (up to ₹9,999)",
      "25% creator discount + exclusive codes",
      "Paid collaboration opportunities",
      "Dedicated brand liaison",
    ],
  },
  {
    id: "macro",
    name: "Macro Creator",
    range: "250K – 1M",
    minFollowers: 250000,
    maxFollowers: 999999,
    accent: "#e9c349",
    perks: [
      "Luxury campaign wardrobe (up to ₹19,999)",
      "30% creator discount + revenue share",
      "Co-branded content shoots",
      "VIP event invitations",
    ],
  },
  {
    id: "mega",
    name: "Mega Creator",
    range: "1M+",
    minFollowers: 1000000,
    maxFollowers: null,
    accent: "#f7ead0",
    perks: [
      "Bespoke high-jewellery pieces",
      "Custom commission structure",
      "Exclusive brand ambassador status",
      "Private atelier experiences",
    ],
  },
]

export const CONTENT_NICHES = [
  "Fashion & Styling",
  "Beauty & Skincare",
  "Lifestyle & Vlogs",
  "Wedding & Bridal",
  "Luxury & Travel",
  "Dance & Performance",
  "Other",
]

export const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "other", label: "Other" },
]

export function getTierFromFollowers(count) {
  const n = Number(count)
  if (!Number.isFinite(n) || n < 1000) return null

  return (
    CREATOR_TIERS.find((tier) => {
      if (tier.maxFollowers == null) return n >= tier.minFollowers
      return n >= tier.minFollowers && n <= tier.maxFollowers
    }) ?? null
  )
}

export function formatFollowerCount(count) {
  const n = Number(count)
  if (!Number.isFinite(n)) return ""
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
  return String(n)
}
