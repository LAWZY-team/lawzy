import { create } from 'zustand'
import { api } from '@/lib/api/client'

const SCOPED_KEY = 'login_scoped_workspace_id';

function getScopedWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SCOPED_KEY);
}

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
  loginScopedWorkspaceId: string | null
  setCurrentWorkspace: (workspace: Workspace) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  setLoginScopedWorkspaceId: (id: string | null) => void
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (data: { name: string; plan?: string }) => Promise<Workspace>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  workspaces: [],
  loading: false,
  loginScopedWorkspaceId: null,
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setLoginScopedWorkspaceId: (id) => {
    if (typeof window !== 'undefined') {
      if (id) sessionStorage.setItem(SCOPED_KEY, id);
      else sessionStorage.removeItem(SCOPED_KEY);
    }
    set({ loginScopedWorkspaceId: id });
  },
  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const workspaces = await api.get<Workspace[]>('/workspaces');
      let scopedId = get().loginScopedWorkspaceId;
      if (!scopedId) {
        scopedId = getScopedWorkspaceId();
        if (scopedId) set({ loginScopedWorkspaceId: scopedId });
      }
      const filtered =
        scopedId && workspaces.some((w) => w.id === scopedId)
          ? workspaces.filter((w) => w.id === scopedId)
          : workspaces;
      set({ workspaces: filtered });
      const { currentWorkspace } = get();
      const stillMember = currentWorkspace && filtered.some((w) => w.id === currentWorkspace.id);
      if (!currentWorkspace && filtered.length > 0) {
        set({ currentWorkspace: filtered[0] });
      } else if (currentWorkspace && !stillMember) {
        set({ currentWorkspace: filtered[0] ?? null });
      } else if (stillMember) {
        const updated = filtered.find((w) => w.id === currentWorkspace!.id);
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
