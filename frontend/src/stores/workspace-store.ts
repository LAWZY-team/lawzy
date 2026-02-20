import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api/client'

export interface WorkspaceMember {
  id: string
  userId: string
  role: 'admin' | 'editor' | 'viewer'
  joinedAt: string
  user?: { name: string; email: string; avatar?: string }
}

export interface Workspace {
  id: string
  name: string
  logo?: string
  plan: string
  members?: WorkspaceMember[]
  settings: Record<string, unknown>
  quotaLimits?: Record<string, unknown>
  aiConfig?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  _count?: { members: number; documents: number; files: number }
}

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  loading: boolean
  setCurrentWorkspace: (workspace: Workspace) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (data: { name: string; plan?: string }) => Promise<Workspace>
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspace: null,
      workspaces: [],
      loading: false,
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      fetchWorkspaces: async () => {
        set({ loading: true });
        try {
          const workspaces = await api.get<Workspace[]>('/workspaces');
          set({ workspaces });
          const { currentWorkspace } = get();
          if (!currentWorkspace && workspaces.length > 0) {
            set({ currentWorkspace: workspaces[0] });
          } else if (currentWorkspace) {
            const updated = workspaces.find((w) => w.id === currentWorkspace.id);
            if (updated) set({ currentWorkspace: updated });
          }
        } catch (err) {
          console.error('Failed to fetch workspaces:', err);
        } finally {
          set({ loading: false });
        }
      },
      createWorkspace: async (data) => {
        const workspace = await api.post<Workspace>('/workspaces', data);
        const { workspaces } = get();
        set({ workspaces: [...workspaces, workspace], currentWorkspace: workspace });
        return workspace;
      },
    }),
    {
      name: 'lawzy-workspace',
    }
  )
)
