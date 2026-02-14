import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkspaceMember {
  userId: string
  role: 'admin' | 'editor' | 'viewer'
  joinedAt: string
}

export interface Workspace {
  workspaceId: string
  name: string
  logo?: string
  plan: string
  members: WorkspaceMember[]
  settings: {
    allowPublicSharing: boolean
    requireApproval: boolean
    defaultVisibility: 'workspace' | 'private' | 'public'
  }
  subscription: {
    plan: string
    status: 'active' | 'cancelled' | 'expired'
    startDate: string
    renewDate: string
    seats: number
    usedSeats: number
  }
  createdAt: string
  updatedAt: string
}

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  setCurrentWorkspace: (workspace: Workspace) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  addMember: (workspaceId: string, member: WorkspaceMember) => void
  removeMember: (workspaceId: string, userId: string) => void
  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceMember['role']) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspace: null,
      workspaces: [],
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      addMember: (workspaceId, member) => {
        const { workspaces, currentWorkspace } = get()
        const updated = workspaces.map((ws) =>
          ws.workspaceId === workspaceId
            ? { ...ws, members: [...ws.members, member] }
            : ws
        )
        set({ workspaces: updated })
        if (currentWorkspace?.workspaceId === workspaceId) {
          set({
            currentWorkspace: {
              ...currentWorkspace,
              members: [...currentWorkspace.members, member],
            },
          })
        }
      },
      removeMember: (workspaceId, userId) => {
        const { workspaces, currentWorkspace } = get()
        const updated = workspaces.map((ws) =>
          ws.workspaceId === workspaceId
            ? { ...ws, members: ws.members.filter((m) => m.userId !== userId) }
            : ws
        )
        set({ workspaces: updated })
        if (currentWorkspace?.workspaceId === workspaceId) {
          set({
            currentWorkspace: {
              ...currentWorkspace,
              members: currentWorkspace.members.filter((m) => m.userId !== userId),
            },
          })
        }
      },
      updateMemberRole: (workspaceId, userId, role) => {
        const { workspaces, currentWorkspace } = get()
        const updated = workspaces.map((ws) =>
          ws.workspaceId === workspaceId
            ? {
                ...ws,
                members: ws.members.map((m) =>
                  m.userId === userId ? { ...m, role } : m
                ),
              }
            : ws
        )
        set({ workspaces: updated })
        if (currentWorkspace?.workspaceId === workspaceId) {
          set({
            currentWorkspace: {
              ...currentWorkspace,
              members: currentWorkspace.members.map((m) =>
                m.userId === userId ? { ...m, role } : m
              ),
            },
          })
        }
      },
    }),
    {
      name: 'lawzy-workspace',
    }
  )
)
