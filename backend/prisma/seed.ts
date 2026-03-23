import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  TERM_CONTENT_VI,
  TERM_CONTENT_EN,
  PRIVACY_CONTENT_VI,
  PRIVACY_CONTENT_EN,
} from './policy-content.js';

const prisma = new PrismaClient();

const SYSTEM_TEMPLATES = [
  {
    title: 'Mẫu hợp đồng NDA (Bảo mật thông tin)',
    description: 'Hợp đồng bảo mật thông tin chuẩn theo BLDS 2026, phù hợp cho mọi loại hình doanh nghiệp',
    category: 'NDA',
    scope: 'system',
    contentJSON: {"type":"doc","content":[{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"}]},{"type":"heading","attrs":{"level":2,"align":"center"},"content":[{"type":"text","text":"Độc lập - Tự do - Hạnh phúc"}]},{"type":"paragraph","attrs":{"align":"center","divider":true},"content":[]},{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"HỢP ĐỒNG BẢO MẬT THÔNG TIN"}]},{"type":"paragraph","attrs":{"align":"center"},"content":[{"type":"text","text":"Số: "},{"type":"field","attrs":{"fieldKey":"CONTRACT_NUMBER","label":"Số HĐ","fieldType":"string"}},{"type":"text","text":"/2023/HDBM"}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ nhu cầu và khả năng thực tế của các bên trong hợp đồng,","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"Hôm nay, ngày "},{"type":"field","attrs":{"fieldKey":"SIGNING_DATE","label":"Ngày ký","fieldType":"date"}},{"type":"text","text":", tại "},{"type":"field","attrs":{"fieldKey":"SIGNING_LOCATION","label":"Địa điểm ký","fieldType":"string"}},{"type":"text","text":" chúng tôi gồm có:"}]},{"type":"clause","attrs":{"clauseId":"c1","riskLevel":"low","lawCitations":["BLDS 2026 - Điều 388","BLDS 2026 - Điều 395"],"title":"Điều 1. Đối tượng hợp đồng"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bên tiết lộ thông tin: "},{"type":"field","attrs":{"fieldKey":"PARTY_A_NAME","label":"Tên Bên A","fieldType":"string"}}]},{"type":"paragraph","content":[{"type":"text","text":"Bên nhận thông tin: "},{"type":"field","attrs":{"fieldKey":"PARTY_B_NAME","label":"Tên Bên B","fieldType":"string"}}]}]},{"type":"clause","attrs":{"clauseId":"c2","riskLevel":"medium","lawCitations":["BLDS 2026 - Điều 389"],"title":"Điều 2. Phạm vi bảo mật"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Thông tin bảo mật bao gồm: "},{"type":"field","attrs":{"fieldKey":"CONFIDENTIAL_SCOPE","label":"Phạm vi bảo mật","fieldType":"text"}}]}]},{"type":"clause","attrs":{"clauseId":"c3","riskLevel":"low","lawCitations":["BLDS 2026 - Điều 401"],"title":"Điều 3. Thời hạn"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Hợp đồng có hiệu lực từ ngày "},{"type":"field","attrs":{"fieldKey":"EFFECTIVE_DATE","label":"Ngày hiệu lực","fieldType":"date"}},{"type":"text","text":" trong thời hạn "},{"type":"field","attrs":{"fieldKey":"DURATION","label":"Thời hạn","fieldType":"string"}}]}]},{"type":"clause","attrs":{"clauseId":"c4","riskLevel":"low","lawCitations":["BLDS 2026 - Điều 397","BLDS 2026 - Điều 398"],"title":"Điều 4. Quyền và nghĩa vụ"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bên nhận thông tin có nghĩa vụ bảo mật toàn bộ thông tin được tiết lộ; không được chuyển giao, sao chép hoặc sử dụng cho mục đích ngoài phạm vi đã thỏa thuận."}]}]},{"type":"clause","attrs":{"clauseId":"c5","riskLevel":"medium","lawCitations":["Luật TTĐT 2024 - Điều 13","BLDS 2026 - Điều 389"],"title":"Điều 5. Bảo mật dữ liệu"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Các bên cam kết tuân thủ quy định pháp luật về bảo vệ dữ liệu cá nhân và bảo mật thông tin trong quá trình xử lý thông tin bảo mật."}]}]},{"type":"clause","attrs":{"clauseId":"c6","riskLevel":"high","lawCitations":["BLDS 2026 - Điều 351","BLDS 2026 - Điều 585"],"title":"Điều 6. Xử lý vi phạm"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bên vi phạm nghĩa vụ bảo mật phải bồi thường thiệt hại theo quy định pháp luật và chịu phạt vi phạm theo thỏa thuận giữa hai bên."}]}]},{"type":"clause","attrs":{"clauseId":"c7","riskLevel":"medium","lawCitations":["BLDS 2026 - Điều 317","Bộ luật Tố tụng dân sự 2015"],"title":"Điều 7. Giải quyết tranh chấp"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Mọi tranh chấp phát sinh được giải quyết trước hết bằng thương lượng; nếu không thành, sẽ được đưa ra Tòa án có thẩm quyền theo quy định pháp luật."}]}]},{"type":"clause","attrs":{"clauseId":"c8","riskLevel":"low","lawCitations":["BLDS 2026 - Điều 401"],"title":"Điều 8. Hiệu lực"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Hợp đồng có hiệu lực kể từ ngày ký. Các bên thừa nhận đã đọc, hiểu và đồng ý toàn bộ nội dung hợp đồng."}]}]}]},
    mergeFields: [
      { fieldKey: 'CONTRACT_NUMBER', label: 'Số HĐ', dataType: 'string', required: true },
      { fieldKey: 'PARTY_A_NAME', label: 'Tên Bên A', dataType: 'string', required: true },
      { fieldKey: 'PARTY_B_NAME', label: 'Tên Bên B', dataType: 'string', required: true },
      { fieldKey: 'EFFECTIVE_DATE', label: 'Ngày hiệu lực', dataType: 'date', required: true },
      { fieldKey: 'CONFIDENTIAL_SCOPE', label: 'Phạm vi bảo mật', dataType: 'text', required: true },
      { fieldKey: 'DURATION', label: 'Thời hạn', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_DATE', label: 'Ngày ký', dataType: 'date', required: true },
      { fieldKey: 'SIGNING_LOCATION', label: 'Địa điểm ký', dataType: 'string', required: true },
    ],
    metadata: { type: 'NDA', industry: ['All'], lawVersions: ['BLDS 2026', 'Luật TTĐT 2024'], complexityTag: 'medium', useCaseTag: 'partnership' },
  },
  {
    title: 'Hợp đồng dịch vụ SaaS B2B',
    description: 'Hợp đồng cung cấp dịch vụ phần mềm SaaS cho doanh nghiệp, tuân thủ luật Việt Nam',
    category: 'SaaS',
    scope: 'system',
    contentJSON: {"type":"doc","content":[{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"}]},{"type":"heading","attrs":{"level":2,"align":"center"},"content":[{"type":"text","text":"Độc lập - Tự do - Hạnh phúc"}]},{"type":"paragraph","attrs":{"align":"center","divider":true},"content":[]},{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"HỢP ĐỒNG DỊCH VỤ"}]},{"type":"paragraph","attrs":{"align":"center"},"content":[{"type":"text","text":"Số: "},{"type":"field","attrs":{"fieldKey":"CONTRACT_NUMBER","label":"Số HĐ","fieldType":"string"}},{"type":"text","text":"/2023/HDDV"}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ Luật Thương mại và các văn bản hướng dẫn thi hành;","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ nhu cầu và khả năng thực tế của các bên trong hợp đồng,","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"Hôm nay, ngày "},{"type":"field","attrs":{"fieldKey":"SIGNING_DAY","label":"Ngày","fieldType":"string"}},{"type":"text","text":" tháng "},{"type":"field","attrs":{"fieldKey":"SIGNING_MONTH","label":"Tháng","fieldType":"string"}},{"type":"text","text":" năm "},{"type":"field","attrs":{"fieldKey":"SIGNING_YEAR","label":"Năm","fieldType":"string"}},{"type":"text","text":", tại "},{"type":"field","attrs":{"fieldKey":"SIGNING_PLACE","label":"Địa điểm","fieldType":"string"}},{"type":"text","text":" chúng tôi gồm có:"}]},{"type":"heading","attrs":{"level":2,"align":"left"},"content":[{"type":"text","text":"BÊN SỬ DỤNG DỊCH VỤ (sau đây gọi tắt là bên A):"}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Tên doanh nghiệp: "},{"type":"field","attrs":{"fieldKey":"PARTY_A_COMPANY","label":"Tên doanh nghiệp","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Địa chỉ trụ sở chính: "},{"type":"field","attrs":{"fieldKey":"PARTY_A_ADDRESS","label":"Địa chỉ trụ sở chính","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Mã số doanh nghiệp: "},{"type":"field","attrs":{"fieldKey":"PARTY_A_TAX_ID","label":"Mã số doanh nghiệp","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Người đại diện theo pháp luật: "},{"type":"field","attrs":{"fieldKey":"PARTY_A_REP","label":"Người đại diện","fieldType":"string"}},{"type":"text","text":"; Chức vụ: "},{"type":"field","attrs":{"fieldKey":"PARTY_A_REP_TITLE","label":"Chức vụ","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Điện thoại liên hệ: "},{"type":"field","attrs":{"fieldKey":"PARTY_A_PHONE","label":"Điện thoại","fieldType":"string"}}]},{"type":"heading","attrs":{"level":2,"align":"left"},"content":[{"type":"text","text":"BÊN CUNG CẤP DỊCH VỤ (sau đây gọi tắt là bên B):"}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Tên doanh nghiệp: "},{"type":"field","attrs":{"fieldKey":"PARTY_B_COMPANY","label":"Tên doanh nghiệp","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Địa chỉ trụ sở chính: "},{"type":"field","attrs":{"fieldKey":"PARTY_B_ADDRESS","label":"Địa chỉ trụ sở chính","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Mã số doanh nghiệp: "},{"type":"field","attrs":{"fieldKey":"PARTY_B_TAX_ID","label":"Mã số doanh nghiệp","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Người đại diện theo pháp luật: "},{"type":"field","attrs":{"fieldKey":"PARTY_B_REP","label":"Người đại diện","fieldType":"string"}},{"type":"text","text":"; Chức vụ: "},{"type":"field","attrs":{"fieldKey":"PARTY_B_REP_TITLE","label":"Chức vụ","fieldType":"string"}}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Điện thoại liên hệ: "},{"type":"field","attrs":{"fieldKey":"PARTY_B_PHONE","label":"Điện thoại","fieldType":"string"}}]},{"type":"clause","attrs":{"clauseId":"c1","riskLevel":"low","lawCitations":["BLDS 2026 - Điều 518","Luật Thương mại 2025 - Điều 3"],"title":"Điều 1. Dịch vụ cung cấp"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bên cung cấp (Provider): "},{"type":"field","attrs":{"fieldKey":"PROVIDER_NAME","label":"Bên cung cấp","fieldType":"string"}}]},{"type":"paragraph","content":[{"type":"text","text":"Bên sử dụng (Customer): "},{"type":"field","attrs":{"fieldKey":"CUSTOMER_NAME","label":"Bên sử dụng","fieldType":"string"}}]},{"type":"paragraph","content":[{"type":"text","text":"Mô tả dịch vụ: "},{"type":"field","attrs":{"fieldKey":"SERVICE_DESCRIPTION","label":"Mô tả dịch vụ","fieldType":"text"}}]}]},{"type":"clause","attrs":{"clauseId":"c2","riskLevel":"medium","lawCitations":["BLDS 2026 - Điều 466","Luật Thương mại 2025 - Điều 58"],"title":"Điều 2. Điều khoản thanh toán"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Giá trị: "},{"type":"field","attrs":{"fieldKey":"PRICING","label":"Giá trị hợp đồng","fieldType":"currency"}}]},{"type":"paragraph","content":[{"type":"text","text":"Điều khoản thanh toán: "},{"type":"field","attrs":{"fieldKey":"PAYMENT_TERMS","label":"Điều khoản thanh toán","fieldType":"string"}}]}]},{"type":"clause","attrs":{"clauseId":"c3","riskLevel":"medium","lawCitations":["Luật TTĐT 2024 - Điều 13","BLDS 2026 - Điều 389"],"title":"Điều 3. Bảo vệ dữ liệu"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bên cung cấp cam kết xử lý dữ liệu của Bên sử dụng theo đúng quy định pháp luật về bảo vệ dữ liệu cá nhân và bảo mật thông tin."}]}]},{"type":"clause","attrs":{"clauseId":"c4","riskLevel":"high","lawCitations":["BLDS 2026 - Điều 351","BLDS 2026 - Điều 585"],"title":"Điều 4. Trách nhiệm và giới hạn bồi thường"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Trách nhiệm bồi thường của Bên cung cấp giới hạn trong phạm vi thiệt hại trực tiếp và có thể chứng minh, trừ trường hợp vi phạm nghiêm trọng hoặc cố ý."}]}]},{"type":"clause","attrs":{"clauseId":"c5","riskLevel":"medium","lawCitations":["BLDS 2026 - Điều 401","Luật Thương mại 2025 - Điều 42"],"title":"Điều 5. Chấm dứt và hiệu lực"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Hợp đồng có hiệu lực từ ngày ký. Mỗi bên có quyền chấm dứt trước hạn khi bên kia vi phạm nghiêm trọng và không khắc phục trong thời hạn thông báo."}]}]}]},
    mergeFields: [
      { fieldKey: 'CONTRACT_NUMBER', label: 'Số HĐ', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_DAY', label: 'Ngày ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_MONTH', label: 'Tháng ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_YEAR', label: 'Năm ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_PLACE', label: 'Địa điểm ký', dataType: 'string', required: true },
      { fieldKey: 'PARTY_A_COMPANY', label: 'Tên doanh nghiệp (Bên A)', dataType: 'string', required: true },
      { fieldKey: 'PARTY_A_ADDRESS', label: 'Địa chỉ Bên A', dataType: 'string', required: true },
      { fieldKey: 'PARTY_A_TAX_ID', label: 'Mã số DN Bên A', dataType: 'string', required: false },
      { fieldKey: 'PARTY_A_REP', label: 'Người đại diện Bên A', dataType: 'string', required: true },
      { fieldKey: 'PARTY_A_REP_TITLE', label: 'Chức vụ Bên A', dataType: 'string', required: true },
      { fieldKey: 'PARTY_A_PHONE', label: 'Điện thoại Bên A', dataType: 'string', required: false },
      { fieldKey: 'PARTY_B_COMPANY', label: 'Tên doanh nghiệp (Bên B)', dataType: 'string', required: true },
      { fieldKey: 'PARTY_B_ADDRESS', label: 'Địa chỉ Bên B', dataType: 'string', required: true },
      { fieldKey: 'PARTY_B_TAX_ID', label: 'Mã số DN Bên B', dataType: 'string', required: false },
      { fieldKey: 'PARTY_B_REP', label: 'Người đại diện Bên B', dataType: 'string', required: true },
      { fieldKey: 'PARTY_B_REP_TITLE', label: 'Chức vụ Bên B', dataType: 'string', required: true },
      { fieldKey: 'PARTY_B_PHONE', label: 'Điện thoại Bên B', dataType: 'string', required: false },
      { fieldKey: 'PROVIDER_NAME', label: 'Bên cung cấp', dataType: 'string', required: true },
      { fieldKey: 'CUSTOMER_NAME', label: 'Bên sử dụng', dataType: 'string', required: true },
      { fieldKey: 'SERVICE_DESCRIPTION', label: 'Mô tả dịch vụ', dataType: 'text', required: true },
      { fieldKey: 'PRICING', label: 'Giá trị hợp đồng', dataType: 'currency', required: true },
      { fieldKey: 'PAYMENT_TERMS', label: 'Điều khoản thanh toán', dataType: 'string', required: true },
    ],
    metadata: { type: 'SaaS', industry: ['Technology', 'Software'], lawVersions: ['BLDS 2026', 'Luật Thương mại 2025'], complexityTag: 'advanced', useCaseTag: 'b2b' },
  },
  {
    title: 'Hợp đồng lao động',
    description: 'Mẫu hợp đồng lao động chuẩn theo Bộ luật Lao động 2019',
    category: 'Labor',
    scope: 'system',
    contentJSON: {"type":"doc","content":[{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"}]},{"type":"heading","attrs":{"level":2,"align":"center"},"content":[{"type":"text","text":"Độc lập - Tự do - Hạnh phúc"}]},{"type":"paragraph","attrs":{"align":"center","divider":true},"content":[]},{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"HỢP ĐỒNG LAO ĐỘNG"}]},{"type":"paragraph","attrs":{"align":"center"},"content":[{"type":"text","text":"Số: "},{"type":"field","attrs":{"fieldKey":"CONTRACT_NUMBER","label":"Số HĐ","fieldType":"string"}},{"type":"text","text":"/2023/HDLD"}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ nhu cầu và khả năng thực tế của các bên,","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"Hôm nay, ngày "},{"type":"field","attrs":{"fieldKey":"SIGNING_DAY","label":"Ngày","fieldType":"string"}},{"type":"text","text":" tháng "},{"type":"field","attrs":{"fieldKey":"SIGNING_MONTH","label":"Tháng","fieldType":"string"}},{"type":"text","text":" năm "},{"type":"field","attrs":{"fieldKey":"SIGNING_YEAR","label":"Năm","fieldType":"string"}},{"type":"text","text":", tại "},{"type":"field","attrs":{"fieldKey":"SIGNING_PLACE","label":"Địa điểm","fieldType":"string"}},{"type":"text","text":" chúng tôi gồm có:"}]},{"type":"clause","attrs":{"clauseId":"c1","riskLevel":"low","lawCitations":["Bộ luật Lao động 2019 - Điều 13","Điều 14"],"title":"Điều 1. Bên tham gia hợp đồng"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Người sử dụng lao động: "},{"type":"field","attrs":{"fieldKey":"EMPLOYER_NAME","label":"Người sử dụng lao động","fieldType":"string"}}]},{"type":"paragraph","content":[{"type":"text","text":"Người lao động: "},{"type":"field","attrs":{"fieldKey":"EMPLOYEE_NAME","label":"Người lao động","fieldType":"string"}}]}]},{"type":"clause","attrs":{"clauseId":"c2","riskLevel":"low","lawCitations":["Bộ luật Lao động 2019 - Điều 27","Điều 28"],"title":"Điều 2. Công việc và địa điểm làm việc"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Vị trí công việc: "},{"type":"field","attrs":{"fieldKey":"POSITION","label":"Vị trí công việc","fieldType":"string"}}]},{"type":"paragraph","content":[{"type":"text","text":"Địa điểm làm việc: theo quy định của Người sử dụng lao động."}]}]},{"type":"clause","attrs":{"clauseId":"c3","riskLevel":"medium","lawCitations":["Bộ luật Lao động 2019 - Điều 90","Điều 93"],"title":"Điều 3. Tiền lương và phụ cấp"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Mức lương: "},{"type":"field","attrs":{"fieldKey":"SALARY","label":"Mức lương","fieldType":"currency"}}]}]},{"type":"clause","attrs":{"clauseId":"c4","riskLevel":"low","lawCitations":["Bộ luật Lao động 2019 - Điều 22"],"title":"Điều 4. Thời hạn và ngày bắt đầu"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Ngày bắt đầu làm việc: "},{"type":"field","attrs":{"fieldKey":"START_DATE","label":"Ngày bắt đầu","fieldType":"date"}}]}]},{"type":"clause","attrs":{"clauseId":"c5","riskLevel":"high","lawCitations":["Bộ luật Lao động 2019 - Điều 34","Điều 36","Điều 37"],"title":"Điều 5. Chấm dứt hợp đồng"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Việc chấm dứt hợp đồng lao động thực hiện theo quy định tại Bộ luật Lao động 2019."}]}]}]},
    mergeFields: [
      { fieldKey: 'CONTRACT_NUMBER', label: 'Số HĐ', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_DAY', label: 'Ngày ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_MONTH', label: 'Tháng ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_YEAR', label: 'Năm ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_PLACE', label: 'Địa điểm ký', dataType: 'string', required: true },
      { fieldKey: 'EMPLOYER_NAME', label: 'Người sử dụng lao động', dataType: 'string', required: true },
      { fieldKey: 'EMPLOYEE_NAME', label: 'Người lao động', dataType: 'string', required: true },
      { fieldKey: 'POSITION', label: 'Vị trí công việc', dataType: 'string', required: true },
      { fieldKey: 'SALARY', label: 'Mức lương', dataType: 'currency', required: true },
      { fieldKey: 'START_DATE', label: 'Ngày bắt đầu', dataType: 'date', required: true },
    ],
    metadata: { type: 'Labor', industry: ['All'], lawVersions: ['Bộ luật Lao động 2019'], complexityTag: 'medium', useCaseTag: 'employment' },
  },
  {
    title: 'Hợp đồng mua bán hàng hóa',
    description: 'Hợp đồng mua bán hàng hóa theo Luật Thương mại 2025',
    category: 'Sale',
    scope: 'system',
    contentJSON: {"type":"doc","content":[{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"}]},{"type":"heading","attrs":{"level":2,"align":"center"},"content":[{"type":"text","text":"Độc lập - Tự do - Hạnh phúc"}]},{"type":"paragraph","attrs":{"align":"center","divider":true},"content":[]},{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"HỢP ĐỒNG MUA BÁN HÀNG HÓA"}]},{"type":"paragraph","attrs":{"align":"center"},"content":[{"type":"text","text":"Số: "},{"type":"field","attrs":{"fieldKey":"CONTRACT_NUMBER","label":"Số HĐ","fieldType":"string"}},{"type":"text","text":"/2023/HDMB"}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ Bộ luật Dân sự số 91/2015/QH13;","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ Luật Thương mại và các văn bản hướng dẫn thi hành;","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"- Căn cứ nhu cầu và khả năng thực tế của các bên trong hợp đồng,","marks":[{"type":"italic"}]}]},{"type":"paragraph","attrs":{"align":"left"},"content":[{"type":"text","text":"Hôm nay, ngày "},{"type":"field","attrs":{"fieldKey":"SIGNING_DAY","label":"Ngày","fieldType":"string"}},{"type":"text","text":" tháng "},{"type":"field","attrs":{"fieldKey":"SIGNING_MONTH","label":"Tháng","fieldType":"string"}},{"type":"text","text":" năm "},{"type":"field","attrs":{"fieldKey":"SIGNING_YEAR","label":"Năm","fieldType":"string"}},{"type":"text","text":", tại "},{"type":"field","attrs":{"fieldKey":"SIGNING_PLACE","label":"Địa điểm","fieldType":"string"}},{"type":"text","text":" chúng tôi gồm có:"}]},{"type":"clause","attrs":{"clauseId":"c1","riskLevel":"low","lawCitations":["Luật Thương mại 2025 - Điều 3","BLDS 2026 - Điều 430"],"title":"Điều 1. Bên bán và Bên mua"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bên bán: "},{"type":"field","attrs":{"fieldKey":"SELLER_NAME","label":"Bên bán","fieldType":"string"}}]},{"type":"paragraph","content":[{"type":"text","text":"Bên mua: "},{"type":"field","attrs":{"fieldKey":"BUYER_NAME","label":"Bên mua","fieldType":"string"}}]}]},{"type":"clause","attrs":{"clauseId":"c2","riskLevel":"low","lawCitations":["Luật Thương mại 2025 - Điều 25"],"title":"Điều 2. Đối tượng và số lượng"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Mô tả hàng hóa: "},{"type":"field","attrs":{"fieldKey":"GOODS_DESCRIPTION","label":"Mô tả hàng hóa","fieldType":"text"}}]},{"type":"paragraph","content":[{"type":"text","text":"Số lượng: "},{"type":"field","attrs":{"fieldKey":"QUANTITY","label":"Số lượng","fieldType":"string"}}]}]},{"type":"clause","attrs":{"clauseId":"c3","riskLevel":"medium","lawCitations":["Luật Thương mại 2025 - Điều 58","BLDS 2026 - Điều 466"],"title":"Điều 3. Giá cả và thanh toán"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Tổng giá trị: "},{"type":"field","attrs":{"fieldKey":"TOTAL_AMOUNT","label":"Tổng giá trị","fieldType":"currency"}}]}]},{"type":"clause","attrs":{"clauseId":"c4","riskLevel":"medium","lawCitations":["Luật Thương mại 2025 - Điều 35","BLDS 2026 - Điều 441"],"title":"Điều 4. Giao hàng và chuyển rủi ro"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Thời hạn và địa điểm giao hàng theo thỏa thuận. Rủi ro về tài sản chuyển cho Bên mua kể từ thời điểm nhận hàng."}]}]},{"type":"clause","attrs":{"clauseId":"c5","riskLevel":"high","lawCitations":["BLDS 2026 - Điều 435","Luật Thương mại 2025 - Điều 42"],"title":"Điều 5. Bảo hành và trách nhiệm"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bên bán chịu trách nhiệm bảo hành theo quy định pháp luật. Tranh chấp được giải quyết tại Tòa án có thẩm quyền theo pháp luật Việt Nam."}]}]}]},
    mergeFields: [
      { fieldKey: 'CONTRACT_NUMBER', label: 'Số HĐ', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_DAY', label: 'Ngày ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_MONTH', label: 'Tháng ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_YEAR', label: 'Năm ký', dataType: 'string', required: true },
      { fieldKey: 'SIGNING_PLACE', label: 'Địa điểm ký', dataType: 'string', required: true },
      { fieldKey: 'SELLER_NAME', label: 'Bên bán', dataType: 'string', required: true },
      { fieldKey: 'BUYER_NAME', label: 'Bên mua', dataType: 'string', required: true },
      { fieldKey: 'GOODS_DESCRIPTION', label: 'Mô tả hàng hóa', dataType: 'text', required: true },
      { fieldKey: 'QUANTITY', label: 'Số lượng', dataType: 'string', required: true },
      { fieldKey: 'TOTAL_AMOUNT', label: 'Tổng giá trị', dataType: 'currency', required: true },
    ],
    metadata: { type: 'Sale', industry: ['Retail', 'Commerce'], lawVersions: ['Luật Thương mại 2025', 'BLDS 2026'], complexityTag: 'medium', useCaseTag: 'commerce' },
  },
];

/**
 * Membership plans – Cá nhân (monthly/yearly), Team (per-seat), Enterprise (contact sales).
 * AI: hạn mức ~$10/gói, top-up khi vượt. Chi tiết: docs/PLAN_MEMBERSHIP_PRICING_SEATS.md
 */
const DEFAULT_PLANS = [
  {
    slug: 'free',
    name: 'Miễn phí',
    nameEn: 'Free',
    description: 'Dùng thử cá nhân',
    descriptionEn: 'Personal trial',
    price: 0,
    billingCycle: 'monthly',
    sortOrder: 0,
    isHighlighted: false,
    contactSales: false,
    quotaLimits: {
      dailyAiQuota: 5,
      storageBytes: 1 * 1024 * 1024 * 1024, // 1 GB (MVP)
      workspaceMembers: 1,
      templates: 3,
      aiAssistant: false,
    },
  },
  {
    slug: 'pro-monthly',
    name: 'Pro (Tháng)',
    nameEn: 'Pro (Monthly)',
    description: 'Cá nhân & nhóm nhỏ – thanh toán hàng tháng',
    descriptionEn: 'Individuals & small teams – monthly billing',
    price: 199000,
    billingCycle: 'monthly',
    sortOrder: 1,
    isHighlighted: true,
    contactSales: false,
    quotaLimits: {
      dailyAiQuota: 30,
      storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
      workspaceMembers: 3,
      templates: 'unlimited',
      aiAssistant: true,
      aiTopUpPricePerRequest: 1000,
      aiTopUpMinCredits: 50,
    },
  },
  {
    slug: 'pro-yearly',
    name: 'Pro (Năm)',
    nameEn: 'Pro (Yearly)',
    description: 'Cá nhân & nhóm nhỏ – tiết kiệm 2 tháng',
    descriptionEn: 'Individuals & small teams – save 2 months',
    price: 1990000,
    billingCycle: 'yearly',
    sortOrder: 2,
    isHighlighted: false,
    contactSales: false,
    quotaLimits: {
      dailyAiQuota: 30,
      storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
      workspaceMembers: 3,
      templates: 'unlimited',
      aiAssistant: true,
      aiTopUpPricePerRequest: 1000,
      aiTopUpMinCredits: 50,
    },
  },
  {
    slug: 'team',
    name: 'Team',
    nameEn: 'Team',
    description: 'Theo chỗ ngồi – kéo thanh hoặc nhập số',
    descriptionEn: 'Per seat – slider or number input',
    price: 495000, // base = 5 * 99k
    billingCycle: 'monthly',
    sortOrder: 3,
    isHighlighted: false,
    contactSales: false,
    quotaLimits: {
      dailyAiQuota: 50,
      storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB base
      workspaceMembers: 'unlimited',
      templates: 'unlimited',
      aiAssistant: true,
      pricePerSeat: 99000,
      minSeats: 5,
      maxSeats: 100,
      storagePerSeatBytes: 2 * 1024 * 1024 * 1024, // +2 GB/seat
      aiTopUpPricePerRequest: 1000,
      aiTopUpMinCredits: 50,
    },
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    nameEn: 'Enterprise',
    description: 'Liên hệ sales – admin kích hoạt workspace từ xa',
    descriptionEn: 'Contact sales – admin activates workspace remotely',
    price: 0,
    billingCycle: 'yearly',
    sortOrder: 4,
    isHighlighted: false,
    contactSales: true,
    quotaLimits: {
      dailyAiQuota: 'unlimited',
      storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      workspaceMembers: 'unlimited',
      templates: 'unlimited',
      aiAssistant: true,
    },
  },
];

async function main() {
  for (const p of DEFAULT_PLANS) {
    await prisma.membershipPlan.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        nameEn: p.nameEn,
        description: p.description,
        descriptionEn: p.descriptionEn,
        price: p.price,
        billingCycle: (p as { billingCycle?: string }).billingCycle ?? 'monthly',
        sortOrder: p.sortOrder,
        isHighlighted: p.isHighlighted,
        contactSales: p.contactSales,
        quotaLimits: p.quotaLimits as object,
      },
      update: {
        name: p.name,
        nameEn: p.nameEn,
        description: p.description,
        descriptionEn: p.descriptionEn,
        price: p.price,
        billingCycle: (p as { billingCycle?: string }).billingCycle ?? 'monthly',
        sortOrder: p.sortOrder,
        isHighlighted: p.isHighlighted,
        contactSales: p.contactSales,
        quotaLimits: p.quotaLimits as object,
      },
    });
  }
  console.log('Membership plans seeded');

  // Migration: workspace plan "pro" -> "pro-monthly"
  const updated = await prisma.workspace.updateMany({
    where: { plan: 'pro' },
    data: { plan: 'pro-monthly' },
  });
  if (updated.count > 0) {
    console.log(`Migrated ${updated.count} workspace(s) from plan "pro" to "pro-monthly"`);
  }

  const adminEmail = 'admin@lawzy.vn';
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashed = await bcrypt.hash('Lawzy@2026', 12);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin Lawzy',
        password: hashed,
        roles: JSON.stringify(['admin']),
        isVerified: true,
      },
    });
    console.log('Admin user created: admin@lawzy.vn');
  }

  // Ensure UserCredit exists for admin
  await prisma.userCredit.upsert({
    where: { userId: adminUser.id },
    create: {
      userId: adminUser.id,
      aiCreditsUsed: 0,
      aiCreditsLimit: 100,
      renewalStartedAt: new Date(),
    },
    update: {},
  });

  const roles: string[] =
    typeof adminUser.roles === 'string'
      ? (JSON.parse(adminUser.roles as string) as string[])
      : Array.isArray(adminUser.roles)
        ? (adminUser.roles as string[])
        : [];
  if (!roles.map((r) => r.toLowerCase()).includes('admin')) {
    const updated = [...roles.filter((r) => r.toLowerCase() !== 'user'), 'admin'];
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { roles: JSON.stringify(updated.length ? updated : ['admin']) },
    });
    console.log('Admin role added to existing admin@lawzy.vn');
  } else {
    console.log('Admin user already exists');
  }

  // Công ty cổ phần Lawzy - main workspace
  const lawzyCompanyName = 'Công ty cổ phần Lawzy';
  let lawzyWorkspace = await prisma.workspace.findFirst({
    where: { name: lawzyCompanyName },
  });

  if (!lawzyWorkspace) {
    lawzyWorkspace = await prisma.workspace.create({
      data: {
        name: lawzyCompanyName,
        plan: 'pro-monthly',
        settings: JSON.stringify({
          allowPublicSharing: false,
          requireApproval: false,
          defaultVisibility: 'workspace',
          maxCollaborators: 50,
        }),
        quotaLimits: JSON.stringify({
          dailyDocumentGenerations: 500,
          monthlyApiCalls: 10000,
        }),
      },
    });
    console.log(`Workspace created: ${lawzyCompanyName}`);
  }

  const existingAdminMembership = await prisma.workspaceMember.findFirst({
    where: { userId: adminUser.id, workspaceId: lawzyWorkspace.id },
  });
  if (!existingAdminMembership) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: lawzyWorkspace.id,
        userId: adminUser.id,
        role: 'admin',
      },
    });
    console.log('Admin added to Lawzy workspace');
  }

  // Lawzy user (lawzy@lawzy.vn)
  const lawzyEmail = 'lawzy@lawzy.vn';
  let lawzyUser = await prisma.user.findUnique({
    where: { email: lawzyEmail },
  });
  if (!lawzyUser) {
    const lawzyHashed = await bcrypt.hash('Lawzy@2026', 12);
    lawzyUser = await prisma.user.create({
      data: {
        email: lawzyEmail,
        name: 'Lawzy',
        password: lawzyHashed,
        roles: JSON.stringify(['admin', 'user']),
        isVerified: true,
      },
    });
    await prisma.workspaceMember.create({
      data: {
        workspaceId: lawzyWorkspace.id,
        userId: lawzyUser.id,
        role: 'admin',
      },
    });
    console.log('Lawzy user created: lawzy@lawzy.vn');
  }

  if (lawzyUser) {
    await prisma.userCredit.upsert({
      where: { userId: lawzyUser.id },
      create: {
        userId: lawzyUser.id,
        aiCreditsUsed: 0,
        aiCreditsLimit: 100,
        renewalStartedAt: new Date(),
      },
      update: {},
    });
  }

  // Policy articles (term, privacy-policy)
  const POLICY_ARTICLES = [
    {
      slug: 'term',
      type: 'policy' as const,
      titleVi: 'Điều khoản sử dụng',
      titleEn: 'Terms of Use',
      content: { vi: TERM_CONTENT_VI, en: TERM_CONTENT_EN },
    },
    {
      slug: 'privacy-policy',
      type: 'policy' as const,
      titleVi: 'Chính sách bảo mật',
      titleEn: 'Privacy Policy',
      content: { vi: PRIVACY_CONTENT_VI, en: PRIVACY_CONTENT_EN },
    },
  ];
  for (const pa of POLICY_ARTICLES) {
    await prisma.article.upsert({
      where: { slug: pa.slug },
      create: {
        type: pa.type,
        title: pa.titleVi,
        slug: pa.slug,
        excerpt: pa.type === 'policy' ? (pa.slug === 'term' ? 'Điều khoản và chính sách sử dụng nền tảng Lawzy' : 'Chính sách bảo mật dữ liệu cá nhân') : '',
        content: pa.content as unknown as object,
        contentText: (pa.content as { vi: string }).vi?.substring(0, 500) ?? '',
        status: 'published',
        publishedAt: new Date(),
        authorId: adminUser.id,
        metadata: { titleEn: pa.titleEn },
      },
      update: {
        content: pa.content as unknown as object,
        contentText: (pa.content as { vi: string }).vi?.substring(0, 500) ?? '',
        metadata: { titleEn: pa.titleEn },
      },
    });
    console.log(`Policy article upserted: ${pa.slug}`);
  }

  const existingTemplateCount = await prisma.template.count({
    where: { scope: 'system' },
  });

  if (existingTemplateCount === 0) {
    for (const tmpl of SYSTEM_TEMPLATES) {
      await prisma.template.create({
        data: {
          title: tmpl.title,
          description: tmpl.description,
          category: tmpl.category,
          scope: tmpl.scope,
          contentJSON: tmpl.contentJSON,
          mergeFields: tmpl.mergeFields,
          metadata: tmpl.metadata,
        },
      });
    }
    console.log(`Seeded ${SYSTEM_TEMPLATES.length} system templates`);
  } else {
    console.log(`System templates already exist (${existingTemplateCount})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
