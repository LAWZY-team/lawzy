import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { useAuthStore } from './auth-store'

export interface UserCustomField {
  /** Unique key used by mergeField nodes and mergeFieldValues map */
  key: string
  label: string
  defaultValue: string
}

interface UserFieldsState {
  customFields: UserCustomField[]
  /** Keys that should be hidden/masked in UI + export/print */
  hiddenFieldKeys: string[]

  addCustomField: (field: Omit<UserCustomField, 'key'> & { key?: string }) => string
  updateCustomField: (key: string, updates: Partial<Omit<UserCustomField, 'key'>>) => void
  removeCustomField: (key: string) => void

  setHiddenFieldKeys: (keys: string[]) => void
  toggleHiddenFieldKey: (key: string) => void
  hideAll: (keys: string[]) => void
  showAll: () => void
}

/** Get storage key based on user ID */
function getStorageKey(): string {
  const user = useAuthStore.getState().user
  if (user?.id) {
    return `lawzy-user-fields-${user.id}`
  }
  return 'lawzy-user-fields-guest'
}

/** Custom storage that uses user-specific keys */
const userFieldsStorage: StateStorage = {
  getItem: (_name: string): string | null => {
    const key = getStorageKey()
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (_name: string, value: string): void => {
    const key = getStorageKey()
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (_name: string): void => {
    const key = getStorageKey()
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore storage errors
    }
  },
}

function slugifyKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

function makeUniqueKey(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let i = 2
  while (existing.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

export const useUserFieldsStore = create<UserFieldsState>()(
  persist(
    (set, get) => ({
      customFields: [],
      hiddenFieldKeys: [],

      addCustomField: (field) => {
        const existing = new Set(get().customFields.map((f) => f.key))
        const base = slugifyKey(field.key || field.label || 'field') || 'field'
        const key = makeUniqueKey(base, existing)
        set({
          customFields: [
            ...get().customFields,
            {
              key,
              label: field.label,
              defaultValue: field.defaultValue ?? '',
            },
          ],
        })
        return key
      },

      updateCustomField: (key, updates) =>
        set({
          customFields: get().customFields.map((f) => (f.key === key ? { ...f, ...updates } : f)),
        }),

      removeCustomField: (key) =>
        set({
          customFields: get().customFields.filter((f) => f.key !== key),
          hiddenFieldKeys: get().hiddenFieldKeys.filter((k) => k !== key),
        }),

      setHiddenFieldKeys: (keys) => set({ hiddenFieldKeys: Array.from(new Set(keys)) }),

      toggleHiddenFieldKey: (key) => {
        const { hiddenFieldKeys } = get()
        set({
          hiddenFieldKeys: hiddenFieldKeys.includes(key)
            ? hiddenFieldKeys.filter((k) => k !== key)
            : [...hiddenFieldKeys, key],
        })
      },

      hideAll: (keys) => set({ hiddenFieldKeys: Array.from(new Set(keys)) }),
      showAll: () => set({ hiddenFieldKeys: [] }),
    }),
    {
      name: 'lawzy-user-fields', // Base name, actual key is handled by custom storage
      storage: createJSONStorage(() => userFieldsStorage),
      version: 1,
    }
  )
)

// Subscribe to auth changes to reload fields when user logs in/out
if (typeof window !== 'undefined') {
  let previousUserId: string | null = useAuthStore.getState().user?.id ?? null
  
  useAuthStore.subscribe((state) => {
    const currentUserId = state.user?.id ?? null
    // Only reload if the user ID actually changed
    if (currentUserId !== previousUserId) {
      previousUserId = currentUserId
      // When user changes, reload the store from the new storage key
      const key = getStorageKey()
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = JSON.parse(stored)
          useUserFieldsStore.setState({
            customFields: parsed.state?.customFields ?? [],
            hiddenFieldKeys: parsed.state?.hiddenFieldKeys ?? [],
          })
        } else {
          // Clear if no data for this user
          useUserFieldsStore.setState({
            customFields: [],
            hiddenFieldKeys: [],
          })
        }
      } catch {
        // Ignore parse errors
      }
    }
  })
}