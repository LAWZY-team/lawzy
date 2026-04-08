/**
 * Tool declarations for Lawzy AI Agent (Gemini function-calling).
 * Model uses these to decide when to gather info, research, then generate.
 */

export const LAWZY_AGENT_TOOLS = [
  // === Phase 1: Thu thập thông tin ===
  {
    name: 'get_merge_fields',
    description:
      'Lấy danh sách trường trộn (merge fields) và giá trị đã điền sẵn. Gọi khi cần dùng thông tin động như tên bên A, số HĐ, giá trị hợp đồng.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_document_context',
    description:
      'Lấy nội dung hiện tại của document (hợp đồng đang soạn), metadata. Gọi khi cần chỉnh sửa/bổ sung dựa trên nội dung có sẵn.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_sources',
    description:
      'Liệt kê nguồn trong workspace và nguồn Lawzy (theo gói plan). Gọi khi user nói "dựa trên nguồn", "theo mẫu workspace". Không bắt buộc workspaceId — hệ thống dùng workspace phiên làm việc.',
    parameters: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'string',
          description:
            'Tùy chọn. Chỉ truyền nếu chắc chắn là UUID workspace; thường để trống.',
        },
        limit: {
          type: 'number',
          description: 'Số kết quả tối đa (mặc định 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_source_content',
    description:
      'Đọc nội dung chi tiết 1 nguồn tham chiếu. Gọi sau list_sources khi cần nội dung cụ thể để soạn/đối chiếu.',
    parameters: {
      type: 'object',
      properties: {
        sourceId: {
          type: 'string',
          description: 'ID của nguồn',
        },
      },
      required: ['sourceId'],
    },
  },
  {
    name: 'get_attached_files',
    description:
      'Lấy nội dung file user đính kèm trong chat. Gọi khi user có gửi file đính kèm và cần đọc nội dung.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  // === Phase 2: Nghiên cứu ===
  {
    name: 'search_sources',
    description:
      'Tìm đoạn nguồn liên quan (workspace + Lawzy theo plan) theo từ khóa. Gọi khi cần trích xuất căn cứ từ tài liệu. Không bắt buộc workspaceId — để trống để dùng workspace phiên.',
    parameters: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'string',
          description:
            'Tùy chọn. UUID workspace; nếu không chắc chắn thì để trống.',
        },
        query: { type: 'string', description: 'Từ khóa tìm kiếm' },
        topK: {
          type: 'number',
          description: 'Số đoạn trả về (mặc định 10, tối đa 20)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags lọc (optional)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'cite_law',
    description:
      'Trích dẫn văn bản pháp luật Việt Nam theo câu hỏi. Gọi khi cần căn cứ pháp lý, điều luật.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Câu hỏi/nội dung cần trích dẫn (VD: "thuê nhà có cần đăng ký không")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_documents',
    description:
      'Tìm document trong workspace theo từ khóa. Gọi khi cần tham khảo hợp đồng đã có. workspaceId tùy chọn — để trống dùng workspace phiên.',
    parameters: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'string',
          description: 'Tùy chọn. UUID workspace; thường để trống.',
        },
        query: { type: 'string', description: 'Từ khóa tìm kiếm' },
        limit: { type: 'number', description: 'Số kết quả tối đa (mặc định 5)' },
      },
      required: ['query'],
    },
  },
]
