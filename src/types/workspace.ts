/**
 * Workspace types — extended schema for LAWZY MVP
 * Covers: dashboard, billing, quota, permissions, templates, AI config, activity.
 */

export type MemberStatus = 'active' | 'invited' | 'pending';

export type DefaultVisibility = 'workspace' | 'private' | 'public';

export type BillingCycle = 'monthly' | 'annual';

export interface WorkspaceMember {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  status: MemberStatus;
  joinedAt: string | null;
}

export interface WorkspaceSettings {
  allowPublicSharing: boolean;
  requireApproval: boolean;
  defaultVisibility: DefaultVisibility;
  maxCollaborators: number;
}

export interface PaymentMethod {
  type: 'card';
  last4: string;
  provider: string;
}

export interface WorkspaceSubscription {
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  billingCycle?: BillingCycle;
  paymentMethod?: PaymentMethod;
  startDate: string;
  renewDate: string;
  nextPaymentDueDate?: string;
  seats: number;
  usedSeats: number;
}

export interface QuotaWorkspaceUsed {
  dailyDocs: number;
  monthlyAPICalls: number;
}

export interface WorkspaceQuotaLimits {
  dailyDocumentGenerations: number;
  monthlyApiCalls: number;
  workspaceUsed: QuotaWorkspaceUsed;
}

export interface WorkspaceAiConfig {
  preferredLawVersions: string[];
  suggestionSensitivity: 'low' | 'medium' | 'high';
  maxClauseSuggestions: number;
}

export type WorkspacePermissionAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'share'
  | 'billing'
  | 'config'
  | 'view'
  | 'comment';

export interface WorkspacePermissions {
  admin: WorkspacePermissionAction[];
  editor: WorkspacePermissionAction[];
  viewer: WorkspacePermissionAction[];
}

export interface ActivityLogEntry {
  actor: string;
  action: string;
  targetId: string;
  timestamp: string;
}

export interface Workspace {
  workspaceId: string;
  name: string;
  logo: string;
  plan: string;
  settings: WorkspaceSettings;
  subscription: WorkspaceSubscription;
  quotaLimits: WorkspaceQuotaLimits;
  aiConfig: WorkspaceAiConfig;
  permissions: WorkspacePermissions;
  workspaceTemplates: string[];
  activityLogs: ActivityLogEntry[];
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacesResponse {
  workspaces: Workspace[];
}
