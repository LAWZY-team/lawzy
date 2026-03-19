import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { useAuthStore } from './auth-store'
import { api } from '@/lib/api/client'

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

type ServerCustomField = {
  key: string
  label: string
  defaultValue: string | null
  isHidden: boolean
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

let syncTimer: ReturnType<typeof setTimeout> | null = null
let suppressNextSync = false

function scheduleServerSync() {
  if (typeof window === 'undefined') return
  const { isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated) return
  if (suppressNextSync) return

  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    try {
      const { customFields, hiddenFieldKeys } = useUserFieldsStore.getState()
      await api.put('/users/me/custom-fields', {
        fields: customFields.map((f) => ({
          key: f.key,
          label: f.label,
          defaultValue: f.defaultValue ?? '',
          isHidden: hiddenFieldKeys.includes(f.key),
        })),
      })
    } catch (e) {
      // Best-effort; keep local state and retry on next change
      console.error(e)
    }
  }, 600)
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
        scheduleServerSync()
        return key
      },

      updateCustomField: (key, updates) =>
        set(() => {
          const next = {
            customFields: get().customFields.map((f) => (f.key === key ? { ...f, ...updates } : f)),
          }
          queueMicrotask(scheduleServerSync)
          return next
        }),

      removeCustomField: (key) =>
        set({
          customFields: get().customFields.filter((f) => f.key !== key),
          hiddenFieldKeys: get().hiddenFieldKeys.filter((k) => k !== key),
        }),

      setHiddenFieldKeys: (keys) => {
        set({ hiddenFieldKeys: Array.from(new Set(keys)) })
        scheduleServerSync()
      },

      toggleHiddenFieldKey: (key) => {
        const { hiddenFieldKeys } = get()
        set({
          hiddenFieldKeys: hiddenFieldKeys.includes(key)
            ? hiddenFieldKeys.filter((k) => k !== key)
            : [...hiddenFieldKeys, key],
        })
        scheduleServerSync()
      },

      hideAll: (keys) => {
        set({ hiddenFieldKeys: Array.from(new Set(keys)) })
        scheduleServerSync()
      },
      showAll: () => {
        set({ hiddenFieldKeys: [] })
        scheduleServerSync()
      },
    }),
    {
      name: 'lawzy-user-fields', // Base name, actual key is handled by custom storage
      storage: createJSONStorage(() => userFieldsStorage),
      version: 1,
    }
  )
)

function parsePersistedState(raw: string | null): { customFields: UserCustomField[]; hiddenFieldKeys: string[] } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return {
      customFields: parsed.state?.customFields ?? [],
      hiddenFieldKeys: parsed.state?.hiddenFieldKeys ?? [],
    }
  } catch {
    return null
  }
}

async function fetchServerFields(): Promise<{ customFields: UserCustomField[]; hiddenFieldKeys: string[] }> {
  const rows = await api.get<Array<ServerCustomField & { id?: string }>>('/users/me/custom-fields')
  const safe = Array.isArray(rows) ? rows : []
  return {
    customFields: safe.map((r) => ({
      key: String(r.key),
      label: String(r.label ?? r.key),
      defaultValue: typeof r.defaultValue === 'string' ? r.defaultValue : '',
    })),
    hiddenFieldKeys: safe.filter((r) => !!r.isHidden).map((r) => String(r.key)),
  }
}

// Subscribe to auth changes to reload fields when user logs in/out.
// Guest: use localStorage. Auth: hydrate from server and sync changes.
if (typeof window !== 'undefined') {
  let previousUserId: string | null = useAuthStore.getState().user?.id ?? null
  
  useAuthStore.subscribe((state) => {
    const currentUserId = state.user?.id ?? null
    // Only reload if the user ID actually changed
    if (currentUserId !== previousUserId) {
      previousUserId = currentUserId
      suppressNextSync = true
      queueMicrotask(() => {
        suppressNextSync = false
      })

      if (!currentUserId) {
        // Guest: load from local persisted key
        const guestRaw = localStorage.getItem('lawzy-user-fields-guest')
        const guest = parsePersistedState(guestRaw)
        useUserFieldsStore.setState({
          customFields: guest?.customFields ?? [],
          hiddenFieldKeys: guest?.hiddenFieldKeys ?? [],
        })
        return
      }

      // Authenticated: hydrate from server and merge guest fields once
      void (async () => {
        try {
          const server = await fetchServerFields()
          const guestRaw = localStorage.getItem('lawzy-user-fields-guest')
          const guest = parsePersistedState(guestRaw)

          const serverByKey = new Map(server.customFields.map((f) => [f.key, f]))
          const mergedCustom: UserCustomField[] = [...server.customFields]

          for (const gf of guest?.customFields ?? []) {
            if (!serverByKey.has(gf.key)) mergedCustom.push(gf)
          }

          const mergedHidden = Array.from(new Set([...(server.hiddenFieldKeys ?? []), ...(guest?.hiddenFieldKeys ?? [])]))

          suppressNextSync = true
          useUserFieldsStore.setState({
            customFields: mergedCustom,
            hiddenFieldKeys: mergedHidden,
          })
          suppressNextSync = false

          // Push merged result to server (best-effort)
          await api.put('/users/me/custom-fields', {
            fields: mergedCustom.map((f) => ({
              key: f.key,
              label: f.label,
              defaultValue: f.defaultValue ?? '',
              isHidden: mergedHidden.includes(f.key),
            })),
          })

          // Clear guest local fields after merge
          try {
            localStorage.removeItem('lawzy-user-fields-guest')
          } catch {
            // ignore
          }
        } catch (e) {
          console.error(e)
          suppressNextSync = false
        }
      })()
    }
  })
}