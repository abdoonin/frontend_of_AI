/**
 * Subscription helper for Doctor accounts and users.
 * Calculates remaining days, active/expiring/expired status,
 * localized plan names, and provides standard contact email.
 */

export const SUPPORT_EMAIL = "abdoonin9@gmail.com"

export interface SubscriptionDetails {
  planId: string
  planNameAr: string
  planNameEn: string
  months: number
  price: number
  expiresAt: Date | null
  formattedExpiresAt: string
  formattedExpiresAtEn: string
  remainingDays: number
  isExpired: boolean
  isExpiringSoon: boolean // 10 days or fewer remaining (and > 0)
  statusTextAr: string
  statusTextEn: string
  badgeVariant: "default" | "warning" | "destructive" | "outline"
  percentageRemaining: number // 0-100%
}

export function formatRemainingDaysAr(days: number): string {
  if (days <= 0) return "انتهت الصلاحية"
  if (days === 1) return "يوم واحد"
  if (days === 2) return "يومان"
  if (days >= 3 && days <= 10) return `${days} أيام`
  return `${days} يوماً`
}

export function getSubscriptionDetails(user: {
  role?: string
  subscriptionPlan?: string | null
  subscriptionMonths?: number | null
  subscriptionPrice?: number | null
  subscriptionExpiresAt?: string | null
  createdAt?: string | null
} | null): SubscriptionDetails | null {
  if (!user) return null

  // Check if doctor or user with assigned subscription
  const isDoctor = user.role?.toLowerCase() === "doctor"
  if (!isDoctor && !user.subscriptionPlan) {
    return null
  }

  const months = user.subscriptionMonths || 1
  const price = user.subscriptionPrice ?? (months === 12 ? 190 : months === 6 ? 100 : months === 3 ? 55 : 20)
  const planId = user.subscriptionPlan || (months === 12 ? "yearly" : months === 6 ? "biannual" : months === 3 ? "quarterly" : "monthly")

  let planNameAr = "شهري (1 شهر)"
  let planNameEn = "Monthly (1 Mo)"
  if (planId === "yearly" || months === 12) {
    planNameAr = "سنوي (12 شهر)"
    planNameEn = "1 Year (12 Mos)"
  } else if (planId === "biannual" || months === 6) {
    planNameAr = "نصف سنوي (6 أشهر)"
    planNameEn = "6 Months"
  } else if (planId === "quarterly" || months === 3) {
    planNameAr = "فصلي (3 أشهر)"
    planNameEn = "3 Months"
  }

  let expiresAt: Date | null = null
  if (user.subscriptionExpiresAt) {
    const parsed = new Date(user.subscriptionExpiresAt)
    if (!isNaN(parsed.getTime())) {
      expiresAt = parsed
    }
  }

  // Fallback if missing
  if (!expiresAt) {
    const base = user.createdAt ? new Date(user.createdAt) : new Date()
    expiresAt = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000)
  }

  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const isExpired = remainingDays <= 0
  const isExpiringSoon = !isExpired && remainingDays <= 10

  const totalPeriodDays = months * 30
  const percentageRemaining = isExpired
    ? 0
    : Math.min(100, Math.max(0, Math.round((remainingDays / totalPeriodDays) * 100)))

  const formattedExpiresAt = expiresAt.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const formattedExpiresAtEn = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  let statusTextAr = `نشط (باقي ${formatRemainingDaysAr(remainingDays)})`
  let statusTextEn = `Active (${remainingDays} days left)`
  let badgeVariant: SubscriptionDetails["badgeVariant"] = "default"

  if (isExpired) {
    statusTextAr = "انتهى الاشتراك"
    statusTextEn = "Expired"
    badgeVariant = "destructive"
  } else if (isExpiringSoon) {
    statusTextAr = `ينتهي قريباً (باقي ${formatRemainingDaysAr(remainingDays)})`
    statusTextEn = `Expiring soon (${remainingDays} days left)`
    badgeVariant = "warning"
  }

  return {
    planId,
    planNameAr,
    planNameEn,
    months,
    price,
    expiresAt,
    formattedExpiresAt,
    formattedExpiresAtEn,
    remainingDays: Math.max(0, remainingDays),
    isExpired,
    isExpiringSoon,
    statusTextAr,
    statusTextEn,
    badgeVariant,
    percentageRemaining,
  }
}
