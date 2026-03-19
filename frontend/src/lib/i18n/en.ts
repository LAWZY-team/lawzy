import type { TranslationKey } from "./vi";

const en: Record<TranslationKey, string> = {
  // Sidebar
  sidebar_workspaces: "Workspaces",
  sidebar_dashboard: "Dashboard",
  sidebar_documents: "Documents",
  sidebar_sources: "Sources",
  sidebar_library: "Library",
  sidebar_templates: "Contract Templates",
  sidebar_settings: "Settings",
  sidebar_workspace: "Workspace",
  sidebar_files: "Files & Storage",
  sidebar_payment: "Payment & Quota",

  // Dashboard
  dash_this_week: "This week",
  dash_this_month: "This month",
  dash_this_year: "This year",
  dash_documents: "Documents",
  dash_storage: "Storage",
  dash_quota: "Quota",
  dash_period: "Period",
  dash_chart_title: "Documents by period",
  dash_total_docs: "Total Documents",
  dash_completed: "Completed",
  dash_drafting: "In Progress",
  dash_total_files: "Total Files",
  dash_contracts_in_ws: "contracts in workspace",
  dash_effective_docs: "effective documents",
  dash_drafts: "drafts",
  dash_uploaded_files: "uploaded files",
  dash_stats_by_ws: "Statistics by Workspace",
  dash_docs_per_ws: "Documents per workspace",
  dash_no_data: "No data yet",
  dash_n_documents: "{n} documents",
  dash_usage_stats: "Usage Statistics",
  dash_total_docs_created: "total documents created",
  dash_files: "files",
  dash_sources: "reference sources",
  dash_storage_label: "Storage",
  dash_file_upload_docs: "Uploaded files & documents",
  dash_share_lawzy: "Share Lawzy with friends and colleagues",

  // Referral
  referral_title: "Refer Friends",
  referral_credits: "Earn 10 credits for every friend who signs up",
  referral_copied: "Referral link copied!",
  referral_copy_fail: "Failed to copy link",

  // Recent docs
  recent_docs_title: "Recent Documents",
  recent_docs_view_all: "View all",
  recent_docs_name: "Document name",
  recent_docs_type: "Type",
  recent_docs_status: "Status",
  recent_docs_updated: "Updated",
  recent_docs_empty: "No documents yet",
  recent_docs_open: "Open",
  recent_docs_share: "Share",

  // Status labels
  status_draft: "Draft",
  status_review: "In Review",
  status_approved: "Approved",
  status_signed: "Signed",
  status_completed: "Completed",
  status_archived: "Archived",

  // Documents page
  docs_my_documents: "My Documents",
  docs_manage_all: "Manage all your contracts",
  docs_create_new: "Create new contract",
  docs_empty: "No documents yet. Create your first document!",
  docs_deleted: "Document deleted",
  docs_delete_failed: "Failed to delete document",
  docs_shared: "Documents shared with you",
  docs_archived: "Archived Documents",
  docs_archive: "Archive",

  // Templates
  tmpl_title: "Contract Templates",
  tmpl_library: "Library of {n} contract templates",
  tmpl_system: "System",
  tmpl_community: "Community",
  tmpl_not_found: "No templates found",
  tmpl_try_different: "Try different filters or search terms",
  tmpl_found: "Found {n} templates",
  tmpl_view: "View",
  tmpl_use: "Use",
  tmpl_use_this: "Use template",
  tmpl_close: "Close",
  tmpl_preview: "Content preview",
  tmpl_info: "Template info",
  tmpl_general: "General",
  tmpl_type: "Type",
  tmpl_scope: "Scope",
  tmpl_time: "Timeline",
  tmpl_created: "Created",
  tmpl_updated: "Updated",
  tmpl_source: "Legal sources",
  tmpl_merge_fields: "Merge fields ({n})",
  tmpl_more_fields: "+ {n} more fields",
  tmpl_no_preview: "No content preview available.",

  // Files
  files_title: "File Management",
  files_subtitle: "Manage storage and uploaded files",
  files_empty: "No files uploaded yet",
  files_not_found: "No files found",

  // Sources
  sources_subtitle: "Legal / business reference documents for AI citation when drafting contracts",
  sources_empty: "No sources yet. Add PDF, DOCX or TXT files for AI reference when drafting contracts.",

  // Payment
  payment_subtitle: "Manage subscription plans and usage quotas",

  // Workspace
  ws_manage: "Manage members and workspace settings",

  // Settings
  settings_title: "Settings",
  settings_subtitle: "Account and application settings.",
  settings_account: "Account",
  settings_account_desc: "Manage your account settings and email preferences.",
  settings_fields: "Custom Fields",
  settings_fields_desc: "Manage your custom fields and default visibility.",
  settings_profile: "Profile",
  settings_appearance: "Appearance",
  settings_notifications: "Notifications",
  settings_display: "Display",

  // Common
  common_search: "Search...",
  common_save: "Save",
  common_cancel: "Cancel",
  common_delete: "Delete",
  common_edit: "Edit",
  common_download: "Download",
  common_upload: "Upload",
  common_close: "Close",
  common_loading: "Loading...",
  common_no_results: "No results",

  // Auth
  auth_login: "Log in",
  auth_register: "Sign up",
  auth_logout: "Log out",
  auth_email: "Email",
  auth_password: "Password",
  auth_name: "Full name",
  auth_forgot_password: "Forgot password?",
  
  // Save Draft Modal
  save_draft_title: "Save Draft?",
  save_draft_description: "You have unsaved changes. Would you like to save them as a draft before leaving?",
  save_draft_save: "Save Draft",
  save_draft_discard: "Discard Changes",
  save_draft_status_label: "Contract Status",
};

export default en;
