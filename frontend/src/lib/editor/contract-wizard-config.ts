import type { ContractTypeId } from './contract-questionnaires'

export type { ContractTypeId }

export interface WizardRole {
  id: string
  title: string
  description: string
}

export type WizardFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'toggle'

export interface WizardField {
  key: string
  label: string
  type: WizardFieldType
  required?: boolean
  placeholder?: string
  hint?: string
  options?: string[]
  defaultValue?: string
  unit?: string
  fullWidth?: boolean
}

export interface WizardFormStep {
  id: string
  title: string
  description?: string
  tip?: string
  fields: WizardField[]
}

export interface ContractWizardConfig {
  typeId: ContractTypeId
  title: string
  icon: string
  color: string
  roleQuestion?: string
  roles?: WizardRole[]
  getSteps: (roleId: string | null) => WizardFormStep[]
}

// ─── Labor Contract ───────────────────────────────────────────────────────────

const LABOR_CONFIG: ContractWizardConfig = {
  typeId: 'labor',
  title: 'Hợp đồng lao động',
  icon: 'Briefcase',
  color: 'blue',
  roleQuestion: 'Bạn đóng vai trò gì trong hợp đồng này?',
  roles: [
    { id: 'employer', title: 'Người sử dụng lao động', description: 'Tôi đang tuyển dụng nhân viên' },
    { id: 'employee', title: 'Người lao động', description: 'Tôi đang xin việc hoặc ký hợp đồng' },
  ],
  getSteps: () => [
    {
      id: 'parties',
      title: 'Thông tin các bên',
      description: 'Cung cấp thông tin cơ bản về người sử dụng lao động và người lao động',
      tip: 'Thông tin này sẽ được sử dụng để xác định chính xác các bên trong hợp đồng. Đảm bảo thông tin chính xác và đầy đủ.',
      fields: [
        { key: 'EMPLOYER_NAME', label: 'Tên công ty / Người sử dụng lao động', type: 'text', required: true, placeholder: 'Ví dụ: Công ty TNHH ABC' },
        { key: 'EMPLOYER_ADDRESS', label: 'Địa chỉ công ty', type: 'text', required: true, placeholder: 'Số nhà, đường, phường, quận, thành phố' },
        { key: 'EMPLOYER_TAX_CODE', label: 'Mã số thuế (MST)', type: 'text', placeholder: 'Mã số thuế doanh nghiệp' },
        { key: 'EMPLOYER_REPRESENTATIVE', label: 'Người đại diện', type: 'text', required: true, placeholder: 'Họ và tên người đại diện', hint: 'Thường là Giám đốc hoặc người có thẩm quyền ký hợp đồng' },
        { key: 'EMPLOYEE_NAME', label: 'Tên người lao động', type: 'text', required: true, placeholder: 'Họ và tên đầy đủ' },
        { key: 'EMPLOYEE_ID', label: 'Số CMND/CCCD', type: 'text', required: true, placeholder: 'Số căn cước công dân' },
        { key: 'EMPLOYEE_ADDRESS', label: 'Địa chỉ thường trú', type: 'text', required: true, placeholder: 'Địa chỉ theo CMND/CCCD' },
      ],
    },
    {
      id: 'position',
      title: 'Vị trí & Công việc',
      description: 'Xác định vị trí làm việc và mô tả công việc cụ thể',
      tip: 'Mô tả rõ ràng về công việc giúp tránh hiểu nhầm về trách nhiệm và quyền hạn của người lao động.',
      fields: [
        { key: 'JOB_TITLE', label: 'Chức danh / Vị trí', type: 'text', required: true, placeholder: 'Ví dụ: Nhân viên Marketing, Kế toán trưởng' },
        { key: 'DEPARTMENT', label: 'Phòng ban', type: 'text', placeholder: 'Phòng ban làm việc' },
        { key: 'WORK_LOCATION', label: 'Địa điểm làm việc', type: 'text', required: true, placeholder: 'Văn phòng hoặc chi nhánh cụ thể' },
        { key: 'JOB_DESCRIPTION', label: 'Mô tả công việc', type: 'textarea', required: true, placeholder: 'Mô tả chi tiết nhiệm vụ và trách nhiệm công việc', fullWidth: true },
      ],
    },
    {
      id: 'duration',
      title: 'Thời hạn & Thời gian',
      description: 'Xác định thời hạn hợp đồng và giờ làm việc',
      tip: 'Theo Bộ luật Lao động, có 3 loại hợp đồng: không xác định thời hạn, xác định thời hạn, và theo mùa vụ/công việc.',
      fields: [
        { key: 'CONTRACT_TYPE', label: 'Loại hợp đồng', type: 'select', required: true, options: ['Hợp đồng không xác định thời hạn', 'Hợp đồng xác định thời hạn', 'Hợp đồng theo mùa vụ / công việc'], fullWidth: true },
        { key: 'START_DATE', label: 'Ngày bắt đầu làm việc', type: 'date', required: true },
        { key: 'END_DATE', label: 'Ngày kết thúc', type: 'date', hint: 'Không áp dụng cho hợp đồng không xác định thời hạn' },
        { key: 'PROBATION_MONTHS', label: 'Thời gian thử việc (tháng)', type: 'number', defaultValue: '0', hint: 'Tối đa 60 ngày cho công nhân, 180 ngày cho chuyên môn cao' },
        { key: 'WORK_HOURS_PER_WEEK', label: 'Số giờ làm việc/tuần', type: 'number', required: true, defaultValue: '40', hint: 'Theo quy định, không quá 48 giờ/tuần' },
      ],
    },
    {
      id: 'salary',
      title: 'Lương & Phúc lợi',
      description: 'Quy định về mức lương và các khoản phụ cấp',
      tip: 'Lương phải được trả bằng tiền VND, định kỳ ít nhất 1 lần/tháng. Có thể thỏa thuận thêm các khoản thưởng và phụ cấp.',
      fields: [
        { key: 'SALARY', label: 'Mức lương cơ bản', type: 'number', required: true, defaultValue: '0', unit: 'VND', fullWidth: true },
        { key: 'SALARY_CYCLE', label: 'Chu kỳ trả lương', type: 'select', required: true, options: ['Hàng tháng', 'Hai tuần một lần', 'Hàng tuần'], fullWidth: true },
        { key: 'HAS_ALLOWANCE', label: 'Có phụ cấp thêm', type: 'toggle', defaultValue: 'false' },
        { key: 'HAS_PERFORMANCE_BONUS', label: 'Có thưởng hiệu suất', type: 'toggle', defaultValue: 'false' },
      ],
    },
    {
      id: 'insurance',
      title: 'Bảo hiểm & Quyền lợi',
      description: 'Các quyền lợi về bảo hiểm và nghỉ phép',
      tip: 'Người sử dụng lao động phải đóng bảo hiểm xã hội, y tế, thất nghiệp theo quy định pháp luật.',
      fields: [
        { key: 'BHXH', label: 'Tham gia BHXH', type: 'toggle', defaultValue: 'true' },
        { key: 'BHYT', label: 'Tham gia BHYT', type: 'toggle', defaultValue: 'true' },
        { key: 'BHTN', label: 'Tham gia BHTN', type: 'toggle', defaultValue: 'true' },
        { key: 'ANNUAL_LEAVE_DAYS', label: 'Số ngày nghỉ phép/năm', type: 'number', required: true, defaultValue: '12', hint: 'Tối thiểu 12 ngày theo quy định', fullWidth: true },
        { key: 'OTHER_BENEFITS', label: 'Quyền lợi khác', type: 'textarea', placeholder: 'Ví dụ: Khám sức khỏe định kỳ, đào tạo nâng cao nghiệp vụ...', hint: 'Các quyền lợi ngoài quy định bắt buộc', fullWidth: true },
      ],
    },
  ],
}

// ─── Service Contract ─────────────────────────────────────────────────────────

const SERVICE_CONFIG: ContractWizardConfig = {
  typeId: 'service',
  title: 'Hợp đồng cung cấp dịch vụ',
  icon: 'FileText',
  color: 'purple',
  roleQuestion: 'Bạn đóng vai trò gì trong hợp đồng này?',
  roles: [
    { id: 'client', title: 'Bên thuê dịch vụ', description: 'Tôi cần thuê dịch vụ từ bên khác' },
    { id: 'provider', title: 'Bên cung cấp dịch vụ', description: 'Tôi cung cấp dịch vụ cho khách hàng' },
  ],
  getSteps: () => [
    {
      id: 'parties',
      title: 'Thông tin các bên',
      description: 'Thông tin về bên thuê dịch vụ và bên cung cấp dịch vụ',
      tip: 'Đảm bảo thông tin pháp lý chính xác của cả hai bên để hợp đồng có giá trị pháp lý.',
      fields: [
        { key: 'PARTY_A_NAME', label: 'Tên công ty / Bên thuê dịch vụ', type: 'text', required: true, placeholder: 'Ví dụ: Công ty Cổ phần XYZ' },
        { key: 'PARTY_A_ADDRESS', label: 'Địa chỉ Bên A', type: 'text', required: true, placeholder: 'Địa chỉ trụ sở' },
        { key: 'PARTY_A_TAX_CODE', label: 'Mã số thuế Bên A', type: 'text', placeholder: 'Mã số thuế / CCCD' },
        { key: 'PARTY_A_REPRESENTATIVE', label: 'Người đại diện Bên A', type: 'text', required: true, placeholder: 'Họ và tên người đại diện' },
        { key: 'PARTY_B_NAME', label: 'Tên công ty / Bên cung cấp dịch vụ', type: 'text', required: true, placeholder: 'Ví dụ: Công ty TNHH Dịch vụ ABC' },
        { key: 'PARTY_B_ADDRESS', label: 'Địa chỉ Bên B', type: 'text', required: true, placeholder: 'Địa chỉ trụ sở' },
        { key: 'PARTY_B_TAX_CODE', label: 'Mã số thuế Bên B', type: 'text', placeholder: 'Mã số thuế / CCCD' },
        { key: 'PARTY_B_REPRESENTATIVE', label: 'Người đại diện Bên B', type: 'text', required: true, placeholder: 'Họ và tên người đại diện' },
      ],
    },
    {
      id: 'service',
      title: 'Nội dung dịch vụ',
      description: 'Mô tả chi tiết về dịch vụ được cung cấp',
      tip: 'Mô tả rõ ràng và đầy đủ giúp tránh tranh chấp về phạm vi công việc sau này.',
      fields: [
        { key: 'SERVICE_DESCRIPTION', label: 'Mô tả dịch vụ', type: 'textarea', required: true, placeholder: 'Mô tả chi tiết dịch vụ cần thực hiện', fullWidth: true },
        { key: 'DELIVERABLES', label: 'Kết quả bàn giao', type: 'textarea', placeholder: 'Ví dụ: Mã nguồn, tài liệu kỹ thuật, hướng dẫn sử dụng', fullWidth: true },
        { key: 'SERVICE_START_DATE', label: 'Ngày bắt đầu', type: 'date', required: true },
        { key: 'SERVICE_END_DATE', label: 'Ngày hoàn thành dự kiến', type: 'date' },
      ],
    },
    {
      id: 'payment',
      title: 'Giá trị & Thanh toán',
      description: 'Quy định về giá trị hợp đồng và phương thức thanh toán',
      tip: 'Nên quy định rõ các mốc thanh toán gắn với tiến độ thực hiện để bảo vệ quyền lợi hai bên.',
      fields: [
        { key: 'CONTRACT_VALUE', label: 'Giá trị hợp đồng', type: 'number', required: true, unit: 'VND', defaultValue: '0', fullWidth: true },
        { key: 'PAYMENT_METHOD', label: 'Hình thức thanh toán', type: 'select', required: true, options: ['Chuyển khoản ngân hàng', 'Tiền mặt', 'Séc'], fullWidth: true },
        { key: 'PAYMENT_TERMS', label: 'Điều khoản thanh toán', type: 'textarea', placeholder: 'Ví dụ: 30% khi ký hợp đồng, 70% khi nghiệm thu', fullWidth: true },
      ],
    },
  ],
}

// ─── NDA ──────────────────────────────────────────────────────────────────────

const NDA_CONFIG: ContractWizardConfig = {
  typeId: 'nda',
  title: 'Thỏa thuận bảo mật (NDA)',
  icon: 'Shield',
  color: 'green',
  roleQuestion: 'Bạn đóng vai trò gì trong thỏa thuận này?',
  roles: [
    { id: 'disclosing', title: 'Bên tiết lộ thông tin', description: 'Tôi sẽ chia sẻ thông tin bảo mật cho bên kia' },
    { id: 'receiving', title: 'Bên nhận thông tin', description: 'Tôi nhận thông tin và cam kết bảo mật' },
  ],
  getSteps: () => [
    {
      id: 'parties',
      title: 'Thông tin các bên',
      description: 'Thông tin về bên tiết lộ và bên nhận thông tin bảo mật',
      tip: 'NDA có hiệu lực pháp lý khi hai bên xác định rõ danh tính và thông tin pháp lý.',
      fields: [
        { key: 'DISCLOSING_PARTY_NAME', label: 'Bên tiết lộ thông tin', type: 'text', required: true, placeholder: 'Tên công ty hoặc cá nhân' },
        { key: 'DISCLOSING_PARTY_ADDRESS', label: 'Địa chỉ Bên tiết lộ', type: 'text', required: true, placeholder: 'Địa chỉ đầy đủ' },
        { key: 'DISCLOSING_REPRESENTATIVE', label: 'Người đại diện Bên tiết lộ', type: 'text', required: true, placeholder: 'Họ và tên người đại diện' },
        { key: 'DISCLOSING_TAX_CODE', label: 'Mã số thuế / CCCD', type: 'text', placeholder: 'Mã số thuế hoặc số CCCD' },
        { key: 'RECEIVING_PARTY_NAME', label: 'Bên nhận thông tin', type: 'text', required: true, placeholder: 'Tên công ty hoặc cá nhân' },
        { key: 'RECEIVING_PARTY_ADDRESS', label: 'Địa chỉ Bên nhận', type: 'text', required: true, placeholder: 'Địa chỉ đầy đủ' },
        { key: 'RECEIVING_REPRESENTATIVE', label: 'Người đại diện Bên nhận', type: 'text', placeholder: 'Họ và tên người đại diện (nếu là tổ chức)' },
        { key: 'RECEIVING_ID', label: 'Mã số thuế / CCCD Bên nhận', type: 'text', placeholder: 'Mã số thuế hoặc số CCCD' },
      ],
    },
    {
      id: 'scope',
      title: 'Phạm vi bảo mật',
      description: 'Xác định thông tin bảo mật và điều kiện bảo mật',
      tip: 'Phạm vi bảo mật càng cụ thể, thỏa thuận càng có hiệu lực pháp lý mạnh hơn.',
      fields: [
        { key: 'CONFIDENTIAL_INFO', label: 'Thông tin được bảo mật', type: 'textarea', required: true, placeholder: 'Ví dụ: Mã nguồn, kế hoạch kinh doanh, thông tin khách hàng, dữ liệu tài chính', fullWidth: true },
        { key: 'PURPOSE', label: 'Mục đích tiết lộ thông tin', type: 'textarea', required: true, placeholder: 'Ví dụ: Đánh giá khả năng hợp tác, phát triển dự án chung', fullWidth: true },
        { key: 'EFFECTIVE_DATE', label: 'Ngày hiệu lực', type: 'date', required: true },
        { key: 'NDA_DURATION', label: 'Thời hạn bảo mật (năm)', type: 'number', required: true, defaultValue: '2', hint: 'Thông thường từ 1-5 năm' },
        { key: 'EXCLUSIONS', label: 'Thông tin không thuộc phạm vi bảo mật', type: 'textarea', placeholder: 'Ví dụ: Thông tin đã công khai, thông tin bên nhận biết từ nguồn khác', hint: 'Liệt kê các ngoại lệ rõ ràng', fullWidth: true },
      ],
    },
  ],
}

// ─── Goods Purchase Contract ──────────────────────────────────────────────────

const GOODS_CONFIG: ContractWizardConfig = {
  typeId: 'goods',
  title: 'Hợp đồng mua bán hàng hóa',
  icon: 'Package',
  color: 'orange',
  roleQuestion: 'Bạn đóng vai trò gì trong hợp đồng này?',
  roles: [
    { id: 'seller', title: 'Bên bán', description: 'Tôi đang bán hàng hóa / sản phẩm' },
    { id: 'buyer', title: 'Bên mua', description: 'Tôi đang mua hàng hóa / sản phẩm' },
  ],
  getSteps: () => [
    {
      id: 'parties',
      title: 'Thông tin các bên',
      description: 'Thông tin pháp lý của bên bán và bên mua',
      tip: 'Thông tin chính xác về hai bên là cơ sở pháp lý quan trọng để giải quyết tranh chấp nếu có.',
      fields: [
        { key: 'SELLER_NAME', label: 'Tên bên bán', type: 'text', required: true, placeholder: 'Tên công ty hoặc cá nhân bán hàng' },
        { key: 'SELLER_ADDRESS', label: 'Địa chỉ bên bán', type: 'text', required: true, placeholder: 'Địa chỉ trụ sở / địa chỉ kinh doanh' },
        { key: 'SELLER_TAX_CODE', label: 'Mã số thuế bên bán', type: 'text', placeholder: 'Mã số thuế doanh nghiệp' },
        { key: 'SELLER_REPRESENTATIVE', label: 'Người đại diện bên bán', type: 'text', required: true, placeholder: 'Họ và tên người ký hợp đồng' },
        { key: 'SELLER_BANK', label: 'Tài khoản ngân hàng bên bán', type: 'text', placeholder: 'Số TK - Tên ngân hàng - Chi nhánh' },
        { key: 'BUYER_NAME', label: 'Tên bên mua', type: 'text', required: true, placeholder: 'Tên công ty hoặc cá nhân mua hàng' },
        { key: 'BUYER_ADDRESS', label: 'Địa chỉ bên mua', type: 'text', required: true, placeholder: 'Địa chỉ trụ sở / địa chỉ kinh doanh' },
        { key: 'BUYER_REPRESENTATIVE', label: 'Người đại diện bên mua', type: 'text', required: true, placeholder: 'Họ và tên người ký hợp đồng' },
      ],
    },
    {
      id: 'goods',
      title: 'Thông tin hàng hóa',
      description: 'Mô tả chi tiết hàng hóa giao dịch',
      tip: 'Mô tả hàng hóa càng chi tiết càng tốt để tránh tranh chấp về chất lượng và số lượng.',
      fields: [
        { key: 'GOODS_DESCRIPTION', label: 'Tên / Mô tả hàng hóa', type: 'textarea', required: true, placeholder: 'Mô tả chi tiết: tên hàng, nhãn hiệu, quy cách, thông số kỹ thuật', fullWidth: true },
        { key: 'GOODS_QUANTITY', label: 'Số lượng', type: 'text', required: true, placeholder: 'Ví dụ: 100 chiếc, 500 kg' },
        { key: 'UNIT_PRICE', label: 'Đơn giá', type: 'number', required: true, unit: 'VND', defaultValue: '0' },
        { key: 'TOTAL_VALUE', label: 'Tổng giá trị hợp đồng', type: 'number', required: true, unit: 'VND', defaultValue: '0' },
        { key: 'GOODS_QUALITY', label: 'Tiêu chuẩn / Chất lượng', type: 'textarea', placeholder: 'Ví dụ: Hàng mới 100%, đúng quy cách, có xuất xứ rõ ràng', fullWidth: true },
      ],
    },
    {
      id: 'delivery',
      title: 'Giao hàng & Thanh toán',
      description: 'Điều khoản về giao nhận hàng và thanh toán',
      tip: 'Quy định rõ trách nhiệm vận chuyển, kiểm hàng và tiến độ thanh toán để tránh rủi ro.',
      fields: [
        { key: 'DELIVERY_ADDRESS', label: 'Địa điểm giao hàng', type: 'text', required: true, placeholder: 'Địa chỉ giao hàng cụ thể', fullWidth: true },
        { key: 'DELIVERY_DATE', label: 'Thời gian giao hàng', type: 'text', required: true, placeholder: 'Ví dụ: Trong vòng 7 ngày kể từ ngày ký' },
        { key: 'WARRANTY', label: 'Bảo hành', type: 'text', placeholder: 'Ví dụ: 12 tháng bảo hành chính hãng' },
        { key: 'PAYMENT_TERMS', label: 'Điều khoản thanh toán', type: 'textarea', required: true, placeholder: 'Ví dụ: Thanh toán 50% khi đặt hàng, 50% khi nhận hàng', fullWidth: true },
      ],
    },
  ],
}

// ─── Rental Contract ──────────────────────────────────────────────────────────

const RENTAL_CONFIG: ContractWizardConfig = {
  typeId: 'rental',
  title: 'Hợp đồng thuê',
  icon: 'Building2',
  color: 'violet',
  roleQuestion: 'Bạn đóng vai trò gì trong hợp đồng này?',
  roles: [
    { id: 'lessor', title: 'Bên cho thuê', description: 'Tôi đang cho thuê tài sản của mình' },
    { id: 'lessee', title: 'Bên thuê', description: 'Tôi đang thuê tài sản từ bên khác' },
  ],
  getSteps: () => [
    {
      id: 'parties',
      title: 'Thông tin các bên',
      description: 'Thông tin pháp lý của bên cho thuê và bên thuê',
      tip: 'Thông tin chính xác về chủ sở hữu tài sản và người thuê là cơ sở pháp lý quan trọng.',
      fields: [
        { key: 'LESSOR_NAME', label: 'Tên bên cho thuê', type: 'text', required: true, placeholder: 'Tên cá nhân hoặc công ty' },
        { key: 'LESSOR_ADDRESS', label: 'Địa chỉ liên hệ bên cho thuê', type: 'text', required: true, placeholder: 'Địa chỉ thường trú / trụ sở' },
        { key: 'LESSOR_ID', label: 'Số CCCD / Mã số thuế', type: 'text', placeholder: 'Số CCCD hoặc mã số thuế' },
        { key: 'LESSOR_BANK', label: 'Tài khoản ngân hàng', type: 'text', placeholder: 'Số TK - Tên ngân hàng (để nhận tiền thuê)' },
        { key: 'LESSEE_NAME', label: 'Tên bên thuê', type: 'text', required: true, placeholder: 'Tên cá nhân hoặc công ty' },
        { key: 'LESSEE_ADDRESS', label: 'Địa chỉ liên hệ bên thuê', type: 'text', required: true, placeholder: 'Địa chỉ thường trú / trụ sở' },
        { key: 'LESSEE_ID', label: 'Số CCCD / Mã số thuế', type: 'text', placeholder: 'Số CCCD hoặc mã số thuế' },
        { key: 'LESSEE_REPRESENTATIVE', label: 'Người đại diện bên thuê', type: 'text', placeholder: 'Nếu là tổ chức / doanh nghiệp' },
      ],
    },
    {
      id: 'property',
      title: 'Tài sản cho thuê',
      description: 'Mô tả tài sản sẽ được cho thuê',
      tip: 'Mô tả tài sản chi tiết và ghi nhận tình trạng hiện tại giúp tránh tranh chấp khi kết thúc hợp đồng.',
      fields: [
        { key: 'RENTAL_OBJECT_TYPE', label: 'Loại tài sản cho thuê', type: 'select', required: true, options: ['Văn phòng', 'Nhà ở', 'Mặt bằng kinh doanh', 'Kho / Xưởng', 'Thiết bị / Máy móc', 'Phương tiện vận tải', 'Khác'], fullWidth: true },
        { key: 'RENTAL_OBJECT_ADDRESS', label: 'Địa chỉ / Vị trí tài sản', type: 'text', required: true, placeholder: 'Địa chỉ đầy đủ của tài sản', fullWidth: true },
        { key: 'RENTAL_OBJECT_AREA', label: 'Diện tích / Thông số kỹ thuật', type: 'text', placeholder: 'Ví dụ: 80m², 3 phòng ngủ' },
        { key: 'RENTAL_OBJECT_DESCRIPTION', label: 'Tình trạng tài sản', type: 'textarea', placeholder: 'Mô tả tình trạng hiện tại, nội thất kèm theo (nếu có)', fullWidth: true },
      ],
    },
    {
      id: 'terms',
      title: 'Điều khoản thuê',
      description: 'Quy định về thời hạn, giá thuê và nghĩa vụ của hai bên',
      tip: 'Xác định rõ giá thuê, tiền đặt cọc và các nghĩa vụ sẽ tránh hiểu nhầm trong suốt thời gian thuê.',
      fields: [
        { key: 'RENTAL_START_DATE', label: 'Ngày bắt đầu thuê', type: 'date', required: true },
        { key: 'RENTAL_DURATION', label: 'Thời hạn thuê', type: 'text', required: true, placeholder: 'Ví dụ: 12 tháng, 2 năm' },
        { key: 'MONTHLY_RENT', label: 'Giá thuê hàng tháng', type: 'number', required: true, unit: 'VND', defaultValue: '0' },
        { key: 'DEPOSIT', label: 'Tiền đặt cọc', type: 'number', unit: 'VND', defaultValue: '0', hint: 'Thường bằng 1-3 tháng tiền thuê' },
        { key: 'PAYMENT_DUE_DATE', label: 'Ngày thanh toán tiền thuê', type: 'text', placeholder: 'Ví dụ: Ngày 5 hàng tháng' },
        { key: 'UTILITIES', label: 'Chi phí tiện ích', type: 'textarea', placeholder: 'Ví dụ: Tiền điện, nước theo thực tế; internet 500.000đ/tháng', hint: 'Quy định ai chịu các chi phí tiện ích', fullWidth: true },
      ],
    },
  ],
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const CONTRACT_WIZARD_CONFIGS: ContractWizardConfig[] = [
  LABOR_CONFIG,
  SERVICE_CONFIG,
  NDA_CONFIG,
  GOODS_CONFIG,
  RENTAL_CONFIG,
]

export const findWizardConfig = (typeId: ContractTypeId): ContractWizardConfig | undefined =>
  CONTRACT_WIZARD_CONFIGS.find((c) => c.typeId === typeId)
