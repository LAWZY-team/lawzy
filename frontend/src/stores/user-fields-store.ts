import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { useAuthStore } from './auth-store'
import { api } from '@/lib/api/client'

export interface UserCustomField {
  /** Unique key used by mergeField nodes and mergeFieldValues map */
  key: string
  label: string
  defaultValue: string
  /** Optional custom group/category name shown on the fields settings page */
  category?: string
}

/** Trường mẫu tiêu chuẩn trong hợp đồng & thủ tục hành chính — người dùng có thể chỉnh sửa sau */
export const DEFAULT_SAMPLE_FIELDS: UserCustomField[] = []

export interface AutofillClientProfile {
  id: string
  name: string
  description?: string
  category?: string
  values: Record<string, string>
  createdAt: string
  updatedAt: string
}

interface UserFieldsState {
  customFields: UserCustomField[]
  /** Keys that should be hidden/masked in UI + export/print */
  hiddenFieldKeys: string[]

  clientProfiles: AutofillClientProfile[]
  currentProfileId: string | null

  createProfile: (name: string, description?: string, initialValues?: Record<string, string>) => string
  updateProfile: (id: string, updates: Partial<AutofillClientProfile>) => void
  deleteProfile: (id: string) => void
  setCurrentProfileId: (id: string | null) => void
  duplicateAndSupplementProfile: (originalId: string, newName: string, deltaValues: Record<string, string>) => string
  addSampleProfileIfEmpty: () => void

  addCustomField: (field: Omit<UserCustomField, 'key'> & { key?: string }) => string
  addSampleFields: () => void
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

/** Get storage key */
function getStorageKey(): string {
  return 'lawzy-user-fields-guest'
}

/** Custom storage that uses guest-only key in sessionStorage */
const userFieldsStorage: StateStorage = {
  getItem: (name: string): string | null => {
    void name
    const user = useAuthStore.getState().user
    if (user?.id) return null
    try {
      return sessionStorage.getItem(getStorageKey())
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    void name
    const user = useAuthStore.getState().user
    if (user?.id) return
    try {
      sessionStorage.setItem(getStorageKey(), value)
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name: string): void => {
    void name
    try {
      sessionStorage.removeItem(getStorageKey())
      localStorage.removeItem(getStorageKey()) // cleanup legacy
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

      clientProfiles: [],
      currentProfileId: null,

      createProfile: (name, description, initialValues = {}) => {
        const id = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newProfile: AutofillClientProfile = {
          id,
          name,
          description: description || '',
          values: initialValues,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set({
          clientProfiles: [newProfile, ...(get().clientProfiles || [])],
          currentProfileId: id,
        })
        return id
      },

      updateProfile: (id, updates) => {
        set({
          clientProfiles: (get().clientProfiles || []).map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })
      },

      deleteProfile: (id) => {
        const next = (get().clientProfiles || []).filter((p) => p.id !== id)
        set({
          clientProfiles: next,
          currentProfileId: get().currentProfileId === id ? (next[0]?.id || null) : get().currentProfileId,
        })
      },

      setCurrentProfileId: (id) => set({ currentProfileId: id }),

      duplicateAndSupplementProfile: (originalId, newName, deltaValues) => {
        const original = (get().clientProfiles || []).find((p) => p.id === originalId)
        const id = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newValues = { ...(original?.values || {}), ...deltaValues }
        const newProfile: AutofillClientProfile = {
          id,
          name: newName,
          description: `Nhân bản & bổ sung từ "${original?.name || 'Gốc'}"`,
          category: original?.category || 'Bổ sung',
          values: newValues,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set({
          clientProfiles: [newProfile, ...(get().clientProfiles || [])],
          currentProfileId: id,
        })
        return id
      },

      addSampleProfileIfEmpty: () => {
        // Không tạo bộ hồ sơ giả lập nữa, để người dùng hoàn toàn bắt đầu từ đầu
      },

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
              ...(field.category ? { category: field.category } : {}),
            },
          ],
        })
        scheduleServerSync()
        return key
      },

      addSampleFields: () => {
        // Không thêm trường mẫu định sẵn nào
      },

      updateCustomField: (key, updates) =>
        set(() => {
          const nextFields = get().customFields.map((f) => (f.key === key ? { ...f, ...updates } : f))
          let nextProfiles = get().clientProfiles || []
          const currentId = get().currentProfileId
          if (typeof updates.defaultValue === 'string' && currentId) {
            nextProfiles = nextProfiles.map((p) =>
              p.id === currentId
                ? { ...p, values: { ...p.values, [key]: updates.defaultValue as string }, updatedAt: new Date().toISOString() }
                : p
            )
          }
          queueMicrotask(scheduleServerSync)
          return { customFields: nextFields, clientProfiles: nextProfiles }
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

function parsePersistedState(raw: string | null): {
  customFields: UserCustomField[]
  hiddenFieldKeys: string[]
  clientProfiles: AutofillClientProfile[]
  currentProfileId: string | null
} | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const profiles: AutofillClientProfile[] = parsed.state?.clientProfiles || []
    const currentId = parsed.state?.currentProfileId || (profiles[0]?.id || null)

    return {
      customFields: parsed.state?.customFields ?? [],
      hiddenFieldKeys: parsed.state?.hiddenFieldKeys ?? [],
      clientProfiles: profiles,
      currentProfileId: currentId,
    }
  } catch {
    return null
  }
}

async function fetchServerFields(): Promise<{ customFields: UserCustomField[]; hiddenFieldKeys: string[] }> {
  const rows = await api.get<Array<ServerCustomField & { id?: string }>>('/users/me/custom-fields')
  const safe = Array.isArray(rows) ? rows : []
  const customFields = safe.map((r) => ({
    key: String(r.key),
    label: String(r.label ?? r.key),
    defaultValue: typeof r.defaultValue === 'string' ? r.defaultValue : '',
  }))
  return {
    customFields,
    hiddenFieldKeys: safe.filter((r) => !!r.isHidden).map((r) => String(r.key)),
  }
}

/**
 * Hydrate user custom fields for the signed-in user (server + optional guest merge).
 * Must run when user id changes and also once on load if the auth store already has a user —
 * otherwise client-side navigation can leave `customFields` empty until a full reload.
 */
function runAuthenticatedUserFieldsHydration(): void {
  void (async () => {
    try {
      const server = await fetchServerFields()
      const guestRaw =
        sessionStorage.getItem('lawzy-user-fields-guest') || localStorage.getItem('lawzy-user-fields-guest')
      const guest = parsePersistedState(guestRaw)
      const serverByKey = new Map(server.customFields.map((f) => [f.key, f]))
      const mergedCustom: UserCustomField[] = [...server.customFields]
      for (const gf of guest?.customFields ?? []) {
        if (!serverByKey.has(gf.key)) mergedCustom.push(gf)
      }
      const mergedHidden = Array.from(
        new Set([...(server.hiddenFieldKeys ?? []), ...(guest?.hiddenFieldKeys ?? [])])
      )

      const profiles = useUserFieldsStore.getState().clientProfiles || []
      const currentId = useUserFieldsStore.getState().currentProfileId || (profiles[0]?.id || null)

      suppressNextSync = true
      useUserFieldsStore.setState({
        customFields: mergedCustom,
        hiddenFieldKeys: mergedHidden,
        clientProfiles: profiles,
        currentProfileId: currentId,
      })
      suppressNextSync = false
      await api.put('/users/me/custom-fields', {
        fields: mergedCustom.map((f) => ({
          key: f.key,
          label: f.label,
          defaultValue: f.defaultValue ?? '',
          isHidden: mergedHidden.includes(f.key),
        })),
      })
      try {
        sessionStorage.removeItem('lawzy-user-fields-guest')
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

function applyGuestUserFieldsFromStorage(): void {
  const guestRaw =
    sessionStorage.getItem('lawzy-user-fields-guest') || localStorage.getItem('lawzy-user-fields-guest')
  const guest = parsePersistedState(guestRaw)
  const guestFields = guest?.customFields ?? []
  useUserFieldsStore.setState({
    customFields: guestFields,
    hiddenFieldKeys: guest?.hiddenFieldKeys ?? [],
    ...(guest?.clientProfiles?.length
      ? { clientProfiles: guest.clientProfiles, currentProfileId: guest.currentProfileId }
      : {}),
  })
}

// Subscribe to auth changes to reload fields when user logs in/out.
// Guest: use localStorage. Auth: hydrate from server and sync changes.
if (typeof window !== 'undefined') {
  let previousUserId: string | null = useAuthStore.getState().user?.id ?? null

  useAuthStore.subscribe((state) => {
    const currentUserId = state.user?.id ?? null
    if (currentUserId !== previousUserId) {
      previousUserId = currentUserId
      suppressNextSync = true
      queueMicrotask(() => {
        suppressNextSync = false
      })
      if (!currentUserId) {
        applyGuestUserFieldsFromStorage()
        return
      }
      runAuthenticatedUserFieldsHydration()
    }
  })

  // Auth resolved before this module evaluated (common on client navigations): hydrate once.
  if (previousUserId) {
    suppressNextSync = true
    queueMicrotask(() => {
      suppressNextSync = false
    })
    runAuthenticatedUserFieldsHydration()
  }
}