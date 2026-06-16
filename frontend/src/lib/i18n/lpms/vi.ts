export const lpmsVi = {
  // Sidebar
  lpms_nav_dashboard: "Tổng quan LPMS",
  lpms_nav_assistant: "Trợ lý & Án lệ",
  lpms_nav_matters: "Vụ việc (Matters)",
  lpms_nav_tabular: "Bóc tách hàng loạt",
  lpms_nav_workflows: "Quy trình (Workflows)",
  lpms_sidebar_new_chat: "Tạo chat mới",
  lpms_sidebar_loading_chats: "Đang tải lịch sử...",
  lpms_sidebar_no_chats: "Chưa có hội thoại nào",
  lpms_sidebar_default_chat_title: "Cuộc trò chuyện mới",
  lpms_sidebar_delete_chat: "Xóa",
  lpms_sidebar_all_matters: "Tất cả vụ việc",

  // Dashboard
  lpms_dashboard_title: "Tổng quan LPMS",
  lpms_dashboard_cta_title: "Bắt đầu với AI Legal Assistant",
  lpms_dashboard_cta_desc:
    "Tự động hoá quy trình pháp lý của bạn. Tạo vụ việc mới, tải lên hàng loạt hợp đồng để bóc tách điều khoản, hoặc trò chuyện với Trợ lý AI để tra cứu án lệ nhanh chóng.",
  lpms_dashboard_cta_tabular: "Bóc tách hợp đồng",
  lpms_dashboard_cta_chat: "Chat với AI",
  lpms_dashboard_stat_matters: "Tổng số Vụ việc",
  lpms_dashboard_stat_matters_hint: "vụ việc trong workspace",
  lpms_dashboard_stat_tabular: "Phiên bóc tách",
  lpms_dashboard_stat_tabular_hint: "phân tích tabular review",
  lpms_dashboard_stat_workflows: "Workflows",
  lpms_dashboard_stat_workflows_hint: "workflow đang có",
  lpms_dashboard_stat_ai: "Lượt hỏi AI",
  lpms_dashboard_stat_ai_hint: "tin nhắn trong tháng này",
  lpms_dashboard_stat_storage: "Dữ liệu lưu trữ",
  lpms_dashboard_stat_storage_hint: "trên tổng {limit}",
  lpms_dashboard_stat_storage_used: "dung lượng đã dùng",
  lpms_dashboard_recent: "Hoạt động gần đây",
  lpms_dashboard_recent_empty:
    "Chưa có hoạt động nào. Hãy tạo vụ việc, bóc tách hợp đồng hoặc chat với AI.",
  lpms_dashboard_pending: "Đang chờ xử lý",
  lpms_dashboard_pending_count: "mục cần xử lý",
  lpms_dashboard_pending_cells: "{n} ô bóc tách đang chờ",
  lpms_dashboard_pending_docs: "{n} tài liệu đang xử lý",
  lpms_dashboard_go_tabular: "Đi tới không gian bóc tách",
  lpms_dashboard_load_error: "Không tải được số liệu dashboard. Vui lòng thử lại.",
  lpms_dashboard_retry: "Thử lại",

  // Matters
  lpms_matters_title: "Vụ việc",
  lpms_matters_search: "Tìm vụ việc…",
  lpms_matters_new: "Vụ việc mới",
  lpms_matters_filter_all: "Tất cả",
  lpms_matters_filter_mine: "Của tôi",
  lpms_matters_filter_shared: "Được chia sẻ",
  lpms_matters_col_name: "Tên",
  lpms_matters_col_cm: "CM",
  lpms_matters_col_owner: "Chủ sở hữu",
  lpms_matters_col_files: "Tài liệu",
  lpms_matters_col_chats: "Chat",
  lpms_matters_col_reviews: "Bóc tách",
  lpms_matters_col_created: "Ngày tạo",
  lpms_matters_owner_me: "Tôi",
  lpms_matters_owner_shared: "Được chia sẻ",
  lpms_matters_load_error: "Không tải được danh sách vụ việc.",
  lpms_matters_empty_title: "Chưa có vụ việc nào",
  lpms_matters_empty_desc: "Tạo vụ việc để quản lý tài liệu, chat và bóc tách theo hồ sơ.",
  lpms_matters_empty_cta: "Tạo vụ việc",
  lpms_matters_empty_shared: "Chưa có vụ việc được chia sẻ với bạn.",
  lpms_matters_delete_selected: "Xóa đã chọn",
  lpms_matters_cm_placeholder: "Số CM",

  // Tabular
  lpms_tabular_title: "Bóc tách hàng loạt",
  lpms_tabular_search: "Tìm bóc tách…",
  lpms_tabular_new: "Bóc tách mới",
  lpms_tabular_col_name: "Tên",
  lpms_tabular_col_columns: "Cột",
  lpms_tabular_col_docs: "Tài liệu",
  lpms_tabular_col_matter: "Vụ việc",
  lpms_tabular_col_created: "Ngày tạo",
  lpms_tabular_untitled: "Chưa đặt tên",

  // Workflows
  lpms_workflows_title: "Quy trình (Workflows)",
  lpms_workflows_search: "Tìm workflow…",
  lpms_workflows_new: "Workflow mới",
  lpms_workflows_tab_all: "Tất cả",
  lpms_workflows_tab_builtin: "Tích hợp sẵn",
  lpms_workflows_tab_custom: "Tùy chỉnh",
  lpms_workflows_tab_hidden: "Đã ẩn",
  lpms_workflows_filter_type: "Lọc theo loại",
  lpms_workflows_filter_practice: "Lọc theo lĩnh vực",
  lpms_workflows_type_assistant: "Trợ lý",
  lpms_workflows_type_tabular: "Bóc tách",
  lpms_workflows_back: "Quay lại Workflows",
  lpms_workflows_breadcrumb: "Workflows",

  // Assistant
  lpms_assistant_disclaimer:
    "AI có thể mắc lỗi. Câu trả lời không phải là tư vấn pháp lý.",

  // Common
  lpms_common_delete: "Xóa",
  lpms_common_loading: "Đang tải…",
} as const;

export type LpmsTranslationKey = keyof typeof lpmsVi;
