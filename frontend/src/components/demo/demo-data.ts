import type { DemoContract, DemoTemplate } from "./demo-types";

const today = new Date();

function daysFromNow(days: number): string {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const demoTemplates: DemoTemplate[] = [
  {
    id: "service-vn",
    name: "Hợp đồng dịch vụ cơ bản",
    category: "Dịch vụ",
    description:
      "Mẫu hợp đồng ngắn gọn cho doanh nghiệp thuê nhà cung cấp dịch vụ, tập trung vào phạm vi công việc, phí dịch vụ và nghiệm thu.",
    fields: [
      { key: "company_name", label: "Công ty của bạn", type: "text", required: true },
      { key: "counterparty_name", label: "Đối tác", type: "text", required: true },
      { key: "service_scope", label: "Phạm vi dịch vụ", type: "text", required: true },
      { key: "contract_value", label: "Giá trị hợp đồng", type: "money", required: true },
      { key: "start_date", label: "Ngày bắt đầu", type: "date", required: true },
      { key: "end_date", label: "Ngày kết thúc", type: "date", required: true },
      {
        key: "payment_term",
        label: "Kỳ hạn thanh toán",
        type: "select",
        required: true,
        options: ["Thanh toán sau nghiệm thu", "Thanh toán hằng tháng", "Tạm ứng 50%"],
      },
    ],
    sections: [
      "Bên A là {{company_name}} và Bên B là {{counterparty_name}} cùng thống nhất ký kết hợp đồng dịch vụ này.",
      "Bên B thực hiện công việc: {{service_scope}}. Kết quả bàn giao phải phù hợp với yêu cầu đã thống nhất bằng văn bản.",
      "Tổng giá trị hợp đồng là {{contract_value}} VND. Phương thức thanh toán: {{payment_term}}.",
      "Thời hạn hợp đồng từ ngày {{start_date}} đến ngày {{end_date}}. Hai bên sẽ lập biên bản nghiệm thu khi hoàn thành.",
    ],
    defaultObligations: [
      { title: "Kiểm tra kết quả bàn giao đầu tiên", dueInDays: 14, owner: "Vận hành" },
      { title: "Nhắc lịch nghiệm thu và thanh toán", dueInDays: 30, owner: "Kế toán" },
    ],
  },
  {
    id: "labor-vn",
    name: "Hợp đồng lao động đơn giản",
    category: "Nhân sự",
    description:
      "Mẫu hợp đồng lao động rút gọn để HR tạo nhanh bản thảo trước khi gửi người lao động xem.",
    fields: [
      { key: "company_name", label: "Công ty", type: "text", required: true },
      { key: "employee_name", label: "Người lao động", type: "text", required: true },
      { key: "position", label: "Chức danh", type: "text", required: true },
      { key: "monthly_salary", label: "Lương hằng tháng", type: "money", required: true },
      { key: "start_date", label: "Ngày bắt đầu", type: "date", required: true },
      {
        key: "contract_term",
        label: "Thời hạn",
        type: "select",
        required: true,
        options: ["12 tháng", "24 tháng", "Không xác định thời hạn"],
      },
    ],
    sections: [
      "{{company_name}} tiếp nhận {{employee_name}} vào làm việc với chức danh {{position}}.",
      "Người lao động bắt đầu làm việc từ ngày {{start_date}}. Thời hạn hợp đồng: {{contract_term}}.",
      "Mức lương hằng tháng là {{monthly_salary}} VND, chưa bao gồm các khoản thưởng hoặc phụ cấp nếu có.",
      "Hai bên có trách nhiệm bảo mật thông tin kinh doanh và tuân thủ nội quy lao động của công ty.",
    ],
    defaultObligations: [
      { title: "Thu thập hồ sơ nhân sự", dueInDays: 3, owner: "HR" },
      { title: "Đánh giá thử việc", dueInDays: 55, owner: "Quản lý trực tiếp" },
    ],
  },
  {
    id: "nda-vn",
    name: "Thỏa thuận bảo mật NDA",
    category: "Bảo mật",
    description:
      "Mẫu NDA ngắn gọn cho buổi trao đổi với đối tác, nhà cung cấp hoặc ứng viên cấp cao.",
    fields: [
      { key: "company_name", label: "Bên tiết lộ thông tin", type: "text", required: true },
      { key: "counterparty_name", label: "Bên nhận thông tin", type: "text", required: true },
      { key: "purpose", label: "Mục đích trao đổi", type: "text", required: true },
      { key: "effective_date", label: "Ngày hiệu lực", type: "date", required: true },
      {
        key: "confidentiality_period",
        label: "Thời hạn bảo mật",
        type: "select",
        required: true,
        options: ["12 tháng", "24 tháng", "36 tháng"],
      },
    ],
    sections: [
      "{{company_name}} và {{counterparty_name}} ký thỏa thuận bảo mật này cho mục đích: {{purpose}}.",
      "Thông tin bảo mật bao gồm tài liệu, dữ liệu, trao đổi thương mại và thông tin kỹ thuật được chia sẻ bằng bất kỳ hình thức nào.",
      "Bên nhận thông tin phải giữ bí mật trong thời hạn {{confidentiality_period}} kể từ ngày {{effective_date}}.",
      "Bên nhận thông tin không được tiết lộ cho bên thứ ba nếu không có chấp thuận bằng văn bản.",
    ],
    defaultObligations: [
      { title: "Xác nhận danh sách tài liệu đã chia sẻ", dueInDays: 2, owner: "Người phụ trách" },
      { title: "Thu hồi quyền truy cập sau trao đổi", dueInDays: 21, owner: "IT" },
    ],
  },
];

export const demoKnowledgeBase = [
  {
    id: "kb-1",
    title: "Checklist trước khi ký hợp đồng dịch vụ",
    category: "Vận hành",
    summary: "Kiểm tra phạm vi, phí, nghiệm thu, đầu mối liên hệ và điều kiện chấm dứt.",
  },
  {
    id: "kb-2",
    title: "Các mốc cần nhớ sau khi hợp đồng có hiệu lực",
    category: "Theo dõi",
    summary: "Ngày thanh toán, ngày nghiệm thu, ngày gia hạn và người chịu trách nhiệm từng việc.",
  },
  {
    id: "kb-3",
    title: "Khi nào cần nhờ luật sư xem lại",
    category: "Rủi ro",
    summary: "Hợp đồng giá trị lớn, điều khoản phạt cao, dữ liệu cá nhân hoặc độc quyền dài hạn.",
  },
];

export const demoParties = [
  {
    id: "party-1",
    name: "BrightClean",
    type: "Nhà cung cấp",
    contact: "ops@brightclean.vn",
    note: "Dịch vụ vệ sinh văn phòng.",
  },
  {
    id: "party-2",
    name: "Nguyễn Văn An",
    type: "Nhân sự",
    contact: "an.nguyen@example.com",
    note: "Ứng viên kinh doanh.",
  },
  {
    id: "party-3",
    name: "Saigon Logistics",
    type: "Đối tác",
    contact: "bd@saigonlogistics.vn",
    note: "Trao đổi hợp tác logistics nội thành.",
  },
];

export const initialDemoContracts: DemoContract[] = [
  {
    id: "contract-1",
    templateId: "service-vn",
    title: "Dịch vụ vệ sinh văn phòng Q3",
    counterparty: "BrightClean",
    owner: "Vận hành",
    status: "active",
    values: {
      company_name: "Công ty Lawzy",
      counterparty_name: "BrightClean",
      service_scope: "Vệ sinh văn phòng định kỳ và tổng vệ sinh hằng tháng",
      contract_value: "120000000",
      start_date: daysFromNow(-30),
      end_date: daysFromNow(45),
      payment_term: "Thanh toán hằng tháng",
    },
    obligations: [
      {
        id: "obl-1",
        title: "Kiểm tra chất lượng dịch vụ tháng này",
        owner: "Vận hành",
        dueInDays: 0,
        dueDate: daysFromNow(7),
        done: false,
      },
      {
        id: "obl-2",
        title: "Đối chiếu hóa đơn tháng",
        owner: "Kế toán",
        dueInDays: 0,
        dueDate: daysFromNow(14),
        done: false,
      },
    ],
    versions: [
      {
        id: "ver-1",
        label: "Bản tạo đầu tiên",
        createdAt: daysFromNow(-35),
        summary: "Tạo từ mẫu hợp đồng dịch vụ cơ bản.",
        values: {},
      },
    ],
    comments: [
      {
        id: "cmt-1",
        author: "Vận hành",
        body: "Cần kiểm tra kỹ đầu mục tổng vệ sinh hằng tháng trước khi gia hạn.",
        createdAt: daysFromNow(-5),
        status: "open",
      },
    ],
    attachments: [
      {
        id: "att-1",
        name: "Báo giá BrightClean.pdf",
        kind: "Báo giá",
        addedAt: daysFromNow(-36),
      },
    ],
    auditLogs: [
      {
        id: "log-1",
        action: "Tạo hồ sơ từ mẫu hợp đồng dịch vụ",
        actor: "Vận hành",
        createdAt: daysFromNow(-35),
      },
      {
        id: "log-2",
        action: "Đánh dấu hợp đồng đang hiệu lực",
        actor: "Vận hành",
        createdAt: daysFromNow(-30),
      },
    ],
    createdAt: daysFromNow(-35),
  },
  {
    id: "contract-2",
    templateId: "labor-vn",
    title: "Hợp đồng lao động Nguyễn Văn An",
    counterparty: "Nguyễn Văn An",
    owner: "HR",
    status: "draft",
    values: {
      company_name: "Công ty Lawzy",
      employee_name: "Nguyễn Văn An",
      position: "Chuyên viên kinh doanh",
      monthly_salary: "18000000",
      start_date: daysFromNow(10),
      contract_term: "12 tháng",
    },
    obligations: [
      {
        id: "obl-3",
        title: "Bổ sung CCCD và thông tin tài khoản",
        owner: "HR",
        dueInDays: 0,
        dueDate: daysFromNow(3),
        done: false,
      },
    ],
    versions: [],
    comments: [],
    attachments: [],
    auditLogs: [
      {
        id: "log-3",
        action: "Tạo bản thảo hợp đồng lao động",
        actor: "HR",
        createdAt: daysFromNow(-2),
      },
    ],
    createdAt: daysFromNow(-2),
  },
  {
    id: "contract-3",
    templateId: "nda-vn",
    title: "NDA với đối tác Saigon Logistics",
    counterparty: "Saigon Logistics",
    owner: "Kinh doanh",
    status: "ready_to_sign",
    values: {
      company_name: "Công ty Lawzy",
      counterparty_name: "Saigon Logistics",
      purpose: "Đánh giá khả năng hợp tác trong dự án logistics nội thành",
      effective_date: daysFromNow(1),
      confidentiality_period: "24 tháng",
    },
    obligations: [],
    versions: [
      {
        id: "ver-2",
        label: "Bản gửi ký",
        createdAt: daysFromNow(-1),
        summary: "Đã đủ thông tin cơ bản để gửi đối tác ký.",
        values: {},
      },
    ],
    comments: [
      {
        id: "cmt-2",
        author: "Kinh doanh",
        body: "Giữ thời hạn bảo mật 24 tháng cho buổi trao đổi đầu tiên.",
        createdAt: daysFromNow(-1),
        status: "resolved",
      },
    ],
    attachments: [],
    auditLogs: [
      {
        id: "log-4",
        action: "Tạo NDA và chuyển sang sẵn sàng ký",
        actor: "Kinh doanh",
        createdAt: daysFromNow(-1),
      },
    ],
    createdAt: daysFromNow(-1),
  },
];
