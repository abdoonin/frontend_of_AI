'use client'

/**
 * The signed-in user dropdown menu, positioned at the foot of the rail.
 * Displays user profile, doctor subscription plan, remaining days,
 * last-10-days warning alert, contact support email, and sign-out option.
 */

import React, { useState } from 'react'
import {
  LogOut,
  CreditCard,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Mail,
  Copy,
  Check,
  ChevronsUpDown,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/components/ui/sidebar'
import { useLanguage } from '@/lib/language-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getSubscriptionDetails, SUPPORT_EMAIL, formatRemainingDaysAr } from '@/lib/subscription'
import { toast } from 'sonner'

/** Initials from a full name, falling back to the username's first letter. */
function initials(fullName: string, username: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (username[0] ?? '?').toUpperCase()
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const { state } = useSidebar()
  const { isRtl } = useLanguage()
  const collapsed = state === 'collapsed'
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const name = user.fullName?.trim() || user.username
  const sub = getSubscriptionDetails(user)

  const copyEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(SUPPORT_EMAIL)
    setCopied(true)
    toast.success(isRtl ? 'تم نسخ البريد الإلكتروني للتواصل' : 'Support email copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User profile & subscription menu"
          className={[
            'w-full text-left transition-colors duration-150 outline-none group cursor-pointer',
            collapsed
              ? 'flex justify-center border-t border-[var(--line)] pt-[10px]'
              : 'flex items-center gap-[10px] rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--surface)] p-[10px] hover:bg-[var(--surface-chrome)] hover:border-border/80 shadow-xs',
          ].join(' ')}
        >
          {/* Avatar with status indicator dot */}
          <div className="relative flex-none">
            <span
              aria-hidden="true"
              className="grid size-[32px] place-items-center rounded-full bg-[var(--brand)] text-xs font-bold text-[var(--brand-ink)] shadow-xs"
            >
              {initials(user.fullName ?? '', user.username)}
            </span>
            {sub && (
              <span
                className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background ${
                  sub.isExpired
                    ? 'bg-rose-500 animate-pulse'
                    : sub.isExpiringSoon
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-emerald-500'
                }`}
                title={sub.statusTextAr}
              />
            )}
          </div>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="block truncate text-[13px] font-semibold leading-[17px] text-[var(--ink)]">
                    {name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="block text-[11px] leading-[15px] text-[var(--ink-muted)] capitalize">
                    {user.role === 'doctor' ? (isRtl ? 'طبيب' : 'Doctor') : user.role}
                  </span>

                  {/* Doctor subscription quick pill */}
                  {sub && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-medium rounded-full ${
                        sub.isExpired
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                          : sub.isExpiringSoon
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {sub.isExpiringSoon && <AlertTriangle className="size-2.5" />}
                      {sub.isExpired
                        ? isRtl
                          ? 'منتهي'
                          : 'Expired'
                        : isRtl
                        ? `باقي ${sub.remainingDays} يوم`
                        : `${sub.remainingDays}d left`}
                    </span>
                  )}
                </div>
              </div>

              <ChevronsUpDown className="size-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] transition-colors flex-none" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? (isRtl ? 'left' : 'right') : 'top'}
        align={isRtl ? 'end' : 'start'}
        sideOffset={8}
        className="w-72 sm:w-80 p-2.5 rounded-2xl bg-[var(--surface)] backdrop-blur-xl border border-[var(--line)] shadow-xl z-50 text-[var(--ink)]"
      >
        {/* User Profile Header */}
        <div className="flex items-center gap-3 p-2 bg-[var(--surface-chrome)]/60 rounded-xl mb-2">
          <span className="grid size-10 flex-none place-items-center rounded-full bg-[var(--brand)] text-sm font-bold text-[var(--brand-ink)] shadow-xs">
            {initials(user.fullName ?? '', user.username)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-[var(--ink)]">{name}</p>
            <p className="text-[11px] text-[var(--ink-muted)] truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                {user.role === 'doctor' ? (isRtl ? 'طبيب ممارس' : 'Doctor') : user.role}
              </Badge>
              {sub && (
                <Badge
                  variant={sub.isExpired ? 'destructive' : sub.isExpiringSoon ? 'outline' : 'default'}
                  className={`text-[10px] px-1.5 py-0 ${
                    sub.isExpiringSoon
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                      : ''
                  }`}
                >
                  {isRtl ? sub.planNameAr : sub.planNameEn}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ─── Doctor Subscription Details Section ─── */}
        {sub && (
          <div className="space-y-2 p-2.5 rounded-xl border border-border/40 bg-card/60 mb-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <CreditCard className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                {isRtl ? 'تفاصيل الاشتراك' : 'Subscription Plan'}
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                ${sub.price}
              </span>
            </div>

            {/* Plan Name & Expiry */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="space-y-0.5">
                <span className="text-[10px] text-[var(--ink-muted)] block">
                  {isRtl ? 'نوع الاشتراك' : 'Plan Type'}
                </span>
                <span className="font-medium text-[12px] block truncate">
                  {isRtl ? sub.planNameAr : sub.planNameEn}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-[var(--ink-muted)] block flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground" />
                  {isRtl ? 'تاريخ الانتهاء' : 'Expires On'}
                </span>
                <span className="font-medium text-[11px] block text-[var(--ink)]">
                  {isRtl ? sub.formattedExpiresAt : sub.formattedExpiresAtEn}
                </span>
              </div>
            </div>

            {/* Remaining Days Progress Meter */}
            <div className="pt-1.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[var(--ink-muted)] flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  {isRtl ? 'المدة المتبقية:' : 'Time Left:'}
                </span>
                <span
                  className={`font-bold ${
                    sub.isExpired
                      ? 'text-rose-600 dark:text-rose-400'
                      : sub.isExpiringSoon
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isRtl ? formatRemainingDaysAr(sub.remainingDays) : `${sub.remainingDays} days`}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    sub.isExpired
                      ? 'bg-rose-500 w-full'
                      : sub.isExpiringSoon
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${sub.isExpired ? 100 : Math.max(5, sub.percentageRemaining)}%` }}
                />
              </div>
            </div>

            {/* ─── ALERT FOR LAST 10 DAYS (or Expired) ─── */}
            {sub.isExpiringSoon && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{isRtl ? 'تنبيه: اقتراب انتهاء الاشتراك!' : 'Warning: Subscription Expiring Soon!'}</span>
                </div>
                <p className="text-[11px] mt-1 leading-tight text-amber-800 dark:text-amber-300">
                  {isRtl
                    ? `باقي ${formatRemainingDaysAr(sub.remainingDays)} فقط على انتهاء اشتراكك. يرجى التواصل للتجديد قبل الانتهاء.`
                    : `Only ${sub.remainingDays} days left on your subscription. Please renew to avoid service interruption.`}
                </p>
              </div>
            )}

            {sub.isExpired && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-900 dark:text-rose-200">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{isRtl ? 'تنبيه: انتهت صلاحية الاشتراك!' : 'Alert: Subscription Expired!'}</span>
                </div>
                <p className="text-[11px] mt-1 leading-tight text-rose-800 dark:text-rose-300">
                  {isRtl
                    ? 'لقد انتهت فترة الاشتراك الخاصة بك. يرجى التواصل عبر البريد أدناه للتجديد.'
                    : 'Your subscription period has ended. Please contact support below to renew.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── CONTACT & SUPPORT EMAIL AT THE END OF DROPDOWN ─── */}
        <div className="my-1.5 p-2 rounded-xl bg-gradient-to-r from-blue-500/10 via-primary/10 to-emerald-500/10 border border-primary/20">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <Mail className="size-3.5 text-primary shrink-0" />
              {isRtl ? 'للتواصل وتجديد الاشتراك:' : 'Contact & Renewal Support:'}
            </span>
            <button
              type="button"
              onClick={copyEmail}
              className="p-1 rounded hover:bg-background/80 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
              title={isRtl ? 'نسخ البريد الإلكتروني' : 'Copy email'}
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </button>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=MediAI Doctor Subscription Renewal`}
            className="text-[11px] font-mono font-medium text-primary hover:underline flex items-center gap-1 break-all"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

        <DropdownMenuSeparator className="my-1" />

        {/* Sign Out Button */}
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/20 font-medium text-xs py-2 rounded-lg"
        >
          <LogOut className="size-4 mr-2" />
          <span>{isRtl ? 'تسجيل الخروج' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
