import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QuotaState {
  dailyLimit: number
  dailyRemaining: number
  totalUsed: number
  referralCredits: number
  subscriptionPlan: string
  lastReset: string
  decrementQuota: () => void
  addReferralCredit: (amount?: number) => void
  resetDailyQuota: () => void
  updateQuota: (updates: Partial<Omit<QuotaState, 'decrementQuota' | 'addReferralCredit' | 'resetDailyQuota' | 'updateQuota'>>) => void
}

export const useQuotaStore = create<QuotaState>()(
  persist(
    (set, get) => ({
      dailyLimit: 50,
      dailyRemaining: 35,
      totalUsed: 127,
      referralCredits: 10,
      subscriptionPlan: 'pro',
      lastReset: new Date().toISOString(),
      decrementQuota: () => {
        const { dailyRemaining, referralCredits } = get()
        if (dailyRemaining > 0) {
          set({ 
            dailyRemaining: dailyRemaining - 1, 
            totalUsed: get().totalUsed + 1 
          })
        } else if (referralCredits > 0) {
          set({ 
            referralCredits: referralCredits - 1,
            totalUsed: get().totalUsed + 1
          })
        }
      },
      addReferralCredit: (amount = 1) => {
        set({ referralCredits: get().referralCredits + amount })
      },
      resetDailyQuota: () => {
        set({
          dailyRemaining: get().dailyLimit,
          lastReset: new Date().toISOString(),
        })
      },
      updateQuota: (updates) => set(updates),
    }),
    {
      name: 'lawzy-quota',
    }
  )
)
