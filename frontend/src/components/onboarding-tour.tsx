"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-provider"
import onboardingData from "@/lib/i18n/onboarding.json"
import { useAuthStore } from "@/stores/auth-store"

import { useOnboardingStore } from "@/stores/onboarding-store"

type Step = {
  id: string
  targetId: string
  sidebarId: string // The ID in sidebar/main to highlight for transition/interact
  dropdownId?: string // Specifically for dropdown items
  route: string
  titleKey: string
  descriptionKey: string
}

const STEPS: Step[] = [
  {
    id: "welcome",
    targetId: "",
    sidebarId: "",
    route: "",
    titleKey: "welcome.title",
    descriptionKey: "welcome.description",
  },
  {
    id: "dashboard",
    targetId: "",
    sidebarId: "sidebar--dashboard",
    route: "/dashboard",
    titleKey: "dashboard.title",
    descriptionKey: "dashboard.description",
  },
  {
    id: "documents",
    targetId: "",
    sidebarId: "sidebar--documents",
    route: "/documents",
    titleKey: "documents.title",
    descriptionKey: "documents.description",
  },
  {
    id: "fields",
    targetId: "",
    sidebarId: "sidebar--fields",
    route: "/fields",
    titleKey: "fields.title",
    descriptionKey: "fields.description",
  },
  {
    id: "templates",
    targetId: "",
    sidebarId: "sidebar--templates",
    route: "/templates",
    titleKey: "templates.title",
    descriptionKey: "templates.description",
  },
  {
    id: "sources",
    targetId: "",
    sidebarId: "sidebar--sources",
    route: "/sources",
    titleKey: "sources.title",
    descriptionKey: "sources.description",
  },
  {
    id: "editor",
    targetId: "",
    sidebarId: "sidebar--editor-new",
    route: "/editor/new", // Forces navigation explicitly
    titleKey: "editor.title",
    descriptionKey: "editor.description",
  },
  {
    id: "finish",
    targetId: "",
    sidebarId: "",
    route: "",
    titleKey: "finish.title",
    descriptionKey: "finish.description",
  },
]

export function OnboardingTour() {
  const pathname = usePathname()
  const router = useRouter()
  const { locale, setLocale } = useT()
  const { isAuthenticated, authResolved, user } = useAuthStore()
  const { isActive, currentStepIndex, isCompleted, startTour, stopTour, setStepIndex, completeTour } = useOnboardingStore()
  
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  
  const tOnboarding = (key: string) => {
    const keys = key.split(".")
    let val: unknown = (onboardingData as Record<string, unknown>)[locale]
    for (const k of keys) {
      val = (val as Record<string, unknown>)?.[k]
    }
    return typeof val === "string" ? val : key
  }

  const currentStep = STEPS[currentStepIndex]

  // Update target rect for spotlight
  const updateTargetRect = useCallback(() => {
    const id = currentStep.sidebarId || currentStep.targetId
    if (!id) {
      setTargetRect(null)
      return
    }
    const element = document.getElementById(id)
    if (element) {
      setTargetRect(element.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [currentStep.sidebarId, currentStep.targetId])

  const markTourCompleted = useCallback(() => {
    if (user) {
      localStorage.setItem(`lawzy_onboarding_completed_${user.id}`, 'true')
    }
    completeTour()
  }, [user, completeTour])

  useEffect(() => {
    if (!authResolved || !isAuthenticated || !user) return
    
    // Chỉ khởi chạy tour nếu đang ở trong khu vực ứng dụng (Dashboard)
    const isAppRoute = /^\/(dashboard|documents|fields|templates|sources|editor|usage|payment|workspace|settings|admin)/.test(pathname)
    if (!isAppRoute) return
    
    const storageKey = `lawzy_onboarding_completed_${user.id}`
    const hasCompletedLocal = localStorage.getItem(storageKey) === 'true'
    
    // Đã hoàn thành trong storage -> Đẩy cờ lên Zustand để báo cáo trạng thái tắt
    if (hasCompletedLocal && !isCompleted) {
      completeTour()
      return
    }

    if (!hasCompletedLocal && !isCompleted && !isActive) {
      if (user.createdAt) {
        // Nếu tuổi thọ tài khoản lớn hơn 7 ngày, bỏ qua tour hoàn toàn
        const accountAgeDays = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 3600 * 24)
        if (accountAgeDays > 7) {
          localStorage.setItem(storageKey, 'true')
          completeTour()
          return
        }
      }
      startTour()
    }
  }, [isAuthenticated, authResolved, isCompleted, isActive, user, startTour, completeTour, pathname])

  // Poll for target visibility
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(updateTargetRect, 500)
      return () => clearInterval(interval)
    }
  }, [isActive, updateTargetRect])

  const handleNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentStepIndex + 1];
      if (nextStep.route && !pathname.startsWith(nextStep.route)) {
        router.push(nextStep.route);
      }
      setStepIndex(currentStepIndex + 1)
    } else {
      markTourCompleted()
    }
  }, [currentStepIndex, setStepIndex, markTourCompleted, pathname, router])

  // Special handling for dropdown interaction - Poll for state
  useEffect(() => {
    if (isActive && currentStep.id === "settings_trigger") {
        const interval = setInterval(() => {
            const trigger = document.getElementById("user-menu-trigger")
            if (trigger?.getAttribute("data-state") === "open") {
                handleNext()
                clearInterval(interval)
            }
        }, 500)
        return () => clearInterval(interval)
    }
  }, [isActive, currentStep.id, handleNext])

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevStep = STEPS[currentStepIndex - 1];
      if (prevStep.route && !pathname.startsWith(prevStep.route)) {
        router.push(prevStep.route);
      }
      setStepIndex(currentStepIndex - 1)
    }
  }

  const handleSkip = () => {
    stopTour()
    markTourCompleted()
  }

  if (!isActive) return null

  const isAppRoute = /^\/(dashboard|documents|fields|templates|sources|editor|usage|payment|workspace|settings|admin)/.test(pathname)
  if (!isAppRoute) return null

  return (
    <div className="fixed inset-0 z-[40] flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Dim Overlay and Spotlight */}
      <AnimatePresence>
        {(targetRect) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[-1] pointer-events-none"
          >
            <svg className="h-full w-full pointer-events-none">
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <motion.rect
                      initial={false}
                      animate={{
                        x: targetRect.left - 4,
                        y: targetRect.top - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                      }}
                      rx="6"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="black" fillOpacity="0.4" mask="url(#spotlight-mask)" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none bg-black/[0.02]" />

      {/* Info Card / Interaction Hint */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentStep.id}`}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            // Position near sidebar link if possible
            ...((targetRect) ? {
                top: Math.min(Math.max(20, targetRect.top - 20), window.innerHeight - 250),
                left: targetRect.right + 20,
                x: 0,
                y: 0,
                position: 'absolute'
            } : {})
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={cn(
            "pointer-events-auto w-[400px] max-w-[90vw]",
            !targetRect && "relative"
          )}
        >
          <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-sm">
            <CardHeader className="pb-0 pt-4 px-6 flex flex-row items-center justify-between space-y-0 text-primary">
              <CardTitle className="text-lg font-bold">
                {tOnboarding(currentStep.titleKey)}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
              >
                {locale === "vi" ? "EN" : "VI"}
              </Button>
            </CardHeader>
            <CardContent className="pt-2 px-6 pb-2">
              <p className="text-base text-muted-foreground leading-relaxed">
                {tOnboarding(currentStep.descriptionKey)}
              </p>
              
              <div className="mt-6 flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === currentStepIndex ? "w-6 bg-primary" : "w-1.5 bg-primary/20"
                    )} 
                  />
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4">
              <div className="flex-1">
                  <Button variant="ghost" size="sm" onClick={handleSkip} className="text-sm font-medium">
                    {tOnboarding("buttons.skip")}
                  </Button>
              </div>
              <div className="flex gap-2">
                {currentStepIndex > 0 && currentStepIndex < STEPS.length - 1 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {tOnboarding("buttons.prev")}
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="min-w-[100px]">
                  {currentStepIndex === STEPS.length - 1 ? (
                    <>
                      {tOnboarding("buttons.finish")}
                      <Check className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      {tOnboarding("buttons.next")}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
