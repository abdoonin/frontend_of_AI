"use client"

import type React from "react"
import { useState } from "react"

import { Scan, User, ChevronDown, LogOut, CreditCard, Calendar, AlertTriangle, AlertCircle, Mail, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/lib/language-context"
import { useAuth } from "@/lib/auth-context"
import { getSubscriptionDetails, SUPPORT_EMAIL, formatRemainingDaysAr } from "@/lib/subscription"
import { toast } from "sonner"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { t, isRtl } = useLanguage()
  const { user, logout } = useAuth()
  const sub = getSubscriptionDetails(user)

  const handleLogout = async () => {
    await logout()
  }

  const copyEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(SUPPORT_EMAIL)
    setCopied(true)
    toast.success(isRtl ? 'تم نسخ البريد الإلكتروني للتواصل' : 'Support email copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const displayName = user?.fullName || user?.username || "User"
  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "User"

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-border/50 gradient-bg px-4 md:px-6 py-4 md:py-6 min-h-[80px] md:min-h-[100px]">
        <div className="flex items-center justify-between">
          {/* Logo and Welcome Message */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl gradient-primary animate-glow">
                <Scan className="h-6 w-6 md:h-7 md:w-7 text-primary-foreground" />
              </div>
              <span className="text-xl md:text-2xl font-bold gradient-text">{t('mediAI')}</span>
            </div>
            <div className="hidden lg:flex flex-col">
              <h1 className="text-lg md:text-xl font-bold tracking-tight gradient-text">{t('welcome')}</h1>
              <p className="text-sm md:text-base text-muted-foreground">{t('welcomeDesc')}</p>
            </div>
          </div>

          {/* Profile Dropdown */}
          <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover-lift" aria-label="User profile menu">
                <div className="relative">
                  <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full gradient-primary animate-glow">
                    <User className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                  </div>
                  {sub && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background ${
                        sub.isExpired
                          ? "bg-rose-500"
                          : sub.isExpiringSoon
                          ? "bg-amber-500 animate-ping"
                          : "bg-emerald-500"
                      }`}
                    />
                  )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm md:text-base font-medium text-foreground">{displayName}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{displayRole}</span>
                    {sub && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                          sub.isExpired
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold"
                            : sub.isExpiringSoon
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {isRtl ? `باقي ${sub.remainingDays} يوم` : `${sub.remainingDays}d left`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80 p-2.5 gradient-card border-border/50">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>

              {/* Doctor Subscription Details */}
              {sub && (
                <div className="my-2 p-2.5 rounded-xl border border-border/40 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CreditCard className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      {isRtl ? "تفاصيل الاشتراك" : "Subscription Plan"}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      ${sub.price}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">{isRtl ? "نوع الاشتراك" : "Plan"}</span>
                      <span className="font-medium text-[11px] truncate block">
                        {isRtl ? sub.planNameAr : sub.planNameEn}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">{isRtl ? "المتبقي" : "Remaining"}</span>
                      <span
                        className={`font-bold text-[11px] block ${
                          sub.isExpired
                            ? "text-rose-600 dark:text-rose-400"
                            : sub.isExpiringSoon
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isRtl ? formatRemainingDaysAr(sub.remainingDays) : `${sub.remainingDays} days`}
                      </span>
                    </div>
                  </div>

                  {/* 10 Days Warning Alert */}
                  {sub.isExpiringSoon && (
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px]">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                        <span>{isRtl ? "تنبيه: اقتراب انتهاء الاشتراك!" : "Warning: Subscription Expiring!"}</span>
                      </div>
                      <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                        {isRtl
                          ? `باقي ${formatRemainingDaysAr(sub.remainingDays)} فقط على انتهاء اشتراكك. يرجى التجديد.`
                          : `Only ${sub.remainingDays} days left. Please renew to continue.`}
                      </p>
                    </div>
                  )}

                  {sub.isExpired && (
                    <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-[11px]">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertCircle className="size-3.5 text-rose-600 shrink-0" />
                        <span>{isRtl ? "تنبيه: انتهى الاشتراك!" : "Alert: Subscription Expired!"}</span>
                      </div>
                      <p className="mt-0.5 text-rose-800 dark:text-rose-300">
                        {isRtl ? "انتهت فترة الاشتراك. يرجى التواصل للتجديد." : "Subscription expired. Please contact support."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Email at Bottom of Dropdown */}
              <div className="my-1.5 p-2 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary shrink-0" />
                    {isRtl ? "للتواصل وتجديد الاشتراك:" : "Contact & Support:"}
                  </span>
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                    title={isRtl ? "نسخ البريد" : "Copy email"}
                  >
                    {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  </button>
                </div>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=MediAI Subscription Inquiry`}
                  className="text-[11px] font-mono font-medium text-primary hover:underline block break-all"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer hover-lift text-red-600 focus:text-red-600 text-xs py-2"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto p-3 md:p-4 lg:p-6 max-w-7xl">
        {children}
      </main>
    </div>
  )
}

