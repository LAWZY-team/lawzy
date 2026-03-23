import { create } from 'zustand'
import { api } from '@/lib/api/client'

export interface WorkspaceMember {
  id: string
  userId: string
  role: 'admin' | 'editor' | 'viewer' | string
  joinedAt: string
  user?: { id?: string; name: string; email: string; avatar?: string | null }
}

export interface Workspace {
  id: string
  name: string
  logo?: string
  plan: string
  role?: string
  joinedAt?: string
  members?: WorkspaceMember[]
  memberCount?: number
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

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
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
      const stillMember = currentWorkspace && workspaces.some((w) => w.id === currentWorkspace.id);
      if (!currentWorkspace && workspaces.length > 0) {
        set({ currentWorkspace: workspaces[0] });
      } else if (currentWorkspace && !stillMember) {
        set({ currentWorkspace: workspaces[0] ?? null });
      } else if (stillMember) {
        const updated = workspaces.find((w) => w.id === currentWorkspace!.id);
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
}))
