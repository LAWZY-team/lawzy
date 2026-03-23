"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
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
  isHintOnly?: boolean // If true, only show as a hint near target
  requiresInteraction?: boolean // If true, automatically enters interaction mode (spotlight)
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
    id: "editor",
    targetId: "tour-editor-chat",
    sidebarId: "sidebar--editor-new",
    route: "/editor/new",
    titleKey: "editor.title",
    descriptionKey: "editor.description",
  },
  {
    id: "dashboard",
    targetId: "tour-dashboard-stats",
    sidebarId: "sidebar--dashboard",
    route: "/dashboard",
    titleKey: "dashboard.title",
    descriptionKey: "dashboard.description",
  },
  {
    id: "documents",
    targetId: "tour-documents-create",
    sidebarId: "sidebar--documents",
    route: "/documents",
    titleKey: "documents.title",
    descriptionKey: "documents.description",
  },
  {
    id: "templates",
    targetId: "tour-templates-list",
    sidebarId: "sidebar--templates",
    route: "/templates",
    titleKey: "templates.title",
    descriptionKey: "templates.description",
  },
  {
    id: "settings_trigger",
    targetId: "",
    sidebarId: "user-menu-trigger",
    route: "",
    titleKey: "settings.trigger_title",
    descriptionKey: "settings.trigger_description",
    requiresInteraction: true,
  },
  {
    id: "settings_dropdown",
    targetId: "",
    sidebarId: "dropdown-settings-link",
    route: "/settings",
    titleKey: "settings.dropdown_title",
    descriptionKey: "settings.dropdown_description",
    requiresInteraction: true,
  },
  {
    id: "settings_page",
    targetId: "tour-settings-content",
    sidebarId: "",
    route: "/fields",
    titleKey: "settings.final_title",
    descriptionKey: "settings.final_description",
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
  const { locale } = useT()
  const { isAuthenticated, authResolved, user } = useAuthStore()
  const { isActive, currentStepIndex, isCompleted, startTour, stopTour, setStepIndex, completeTour } = useOnboardingStore()
  
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isInteracting, setIsInteracting] = useState(false) 
  
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
    const id = isInteracting ? currentStep.sidebarId : ""
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
  }, [currentStep.sidebarId, isInteracting])

  const markTourCompleted = useCallback(() => {
    if (user) {
      localStorage.setItem(`lawzy_onboarding_completed_${user.id}`, 'true')
    }
    completeTour()
  }, [user, completeTour])

  useEffect(() => {
    if (!authResolved || !isAuthenticated || !user) return
    
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
  }, [isAuthenticated, authResolved, isCompleted, isActive, user, startTour, completeTour])

  // Poll for target visibility
  useEffect(() => {
    if (isActive && isInteracting) {
      const interval = setInterval(updateTargetRect, 500)
      return () => clearInterval(interval)
    }
  }, [isActive, isInteracting, updateTargetRect])

  // Sync isInteracting with step requirements
  useEffect(() => {
    if (!isActive) return
    const next = currentStep.requiresInteraction ||
      (currentStep.route && !pathname.startsWith(currentStep.route))
    queueMicrotask(() => setIsInteracting(!!next))
  }, [isActive, currentStepIndex, currentStep.requiresInteraction, currentStep.route, pathname])

  const handleNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setStepIndex(currentStepIndex + 1)
    } else {
      markTourCompleted()
    }
  }, [currentStepIndex, setStepIndex, markTourCompleted])

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

  // Proceed automatically when pathname matches the target route
  useEffect(() => {
    if (isActive && isInteracting && currentStep.route && pathname.startsWith(currentStep.route)) {
      queueMicrotask(() => {
        setIsInteracting(false)
        setTargetRect(null)
      })
    }
  }, [pathname, isActive, isInteracting, currentStep.route])

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setStepIndex(currentStepIndex - 1)
      setIsInteracting(false)
    }
  }

  const handleSkip = () => {
    stopTour()
    markTourCompleted()
  }

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Dim Overlay and Spotlight - Only shown when waiting for interaction */}
      <AnimatePresence>
        {isInteracting && (
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
          key={`${currentStep.id}-${isInteracting}`}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            // If interacting, position near sidebar link if possible or just center
            ...(isInteracting && targetRect ? {
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
            !isInteracting && "relative"
          )}
        >
          <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-primary">
              <CardTitle className="text-lg font-bold">
                {isInteracting 
                  ? (currentStep.id === "settings_dropdown" ? tOnboarding("settings.dropdown_title") : (locale === "vi" ? "Click để tiếp tục" : "Click to continue"))
                  : tOnboarding(currentStep.titleKey)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isInteracting 
                  ? (currentStep.id === "settings_dropdown" ? tOnboarding("settings.dropdown_description") : (locale === "vi" ? `Vui lòng click vào mục ${tOnboarding(currentStep.titleKey)} trên thanh menu để khám phá.` : `Please click on ${tOnboarding(currentStep.titleKey)} in the menu to explore.`))
                  : tOnboarding(currentStep.descriptionKey)
                }
              </p>
              
              {!isInteracting && (
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
              )}
            </CardContent>
            {!isInteracting && (
            <CardFooter className="flex justify-between pt-4">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-sm font-medium">
                {tOnboarding("buttons.skip")}
              </Button>
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
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
