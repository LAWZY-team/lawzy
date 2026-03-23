import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface OnboardingState {
  isActive: boolean
  currentStepIndex: number
  isCompleted: boolean
  
  startTour: () => void
  stopTour: () => void
  setStepIndex: (index: number) => void
  completeTour: () => void
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  isActive: false,
  currentStepIndex: 0,
  isCompleted: false,

  startTour: () => set({ isActive: true, currentStepIndex: 0 }),
  stopTour: () => set({ isActive: false }),
  setStepIndex: (index) => set({ currentStepIndex: index }),
  completeTour: () => set({ isCompleted: true, isActive: false }),
}))
