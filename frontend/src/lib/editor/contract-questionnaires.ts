import type { QuestionnaireSchema } from "@/types/questionnaire";

export type ContractTypeId = "labor" | "service" | "nda" | "goods" | "rental";

export interface ContractTypeDefinition {
  id: ContractTypeId;
  title: string;
  description: string;
  // examples: string
  icon: string;
  color: string;
  questionnaire: QuestionnaireSchema;
}

const LABOR_QUESTIONNAIRE: QuestionnaireSchema = {
  title: "Thông tin hợp đồng lao động",
  description: "Vui lòng điền đầy đủ thông tin để tạo hợp đồng lao động",
  sections: [
    {
      title: "Thông tin người sử dụng lao động",
      fields: [
        {
          key: "EMPLOYER_NAME",
          label: "Tên công ty / người sử dụng lao động",
          type: "text",
          required: true,
          placeholder: "VD: Công ty TNHH ABC",
          mergeFieldKey: "EMPLOYER_NAME",
        },
        {
          key: "EMPLOYER_ADDRESS",
          label: "Địa chỉ trụ sở",
          type: "text",
          required: true,
          placeholder: "VD: 123 Nguyễn Huệ, Quận 1, TP.HCM",
          mergeFieldKey: "EMPLOYER_ADDRESS",
        },
        {
          key: "EMPLOYER_TAX_CODE",
          label: "Mã số thuế",
          type: "text",
          placeholder: "VD: 0123456789",
          mergeFieldKey: "EMPLOYER_TAX_CODE",
        },
        {
          key: "EMPLOYER_REPRESENTATIVE",
          label: "Người đại diện ký kết",
          type: "text",
          required: true,
          placeholder: "VD: Nguyễn Văn A",
          mergeFieldKey: "EMPLOYER_REPRESENTATIVE",
        },
        {
          key: "EMPLOYER_POSITION",
          label: "Chức vụ người đại diện",
          type: "text",
          placeholder: "VD: Giám đốc",
          mergeFieldKey: "EMPLOYER_POSITION",
        },
      ],
    },
    {
      title: "Thông tin người lao động",
      fields: [
        {
          key: "EMPLOYEE_NAME",
          label: "Họ và tên người lao động",
          type: "text",
          required: true,
          placeholder: "VD: Trần Thị B",
          mergeFieldKey: "EMPLOYEE_NAME",
        },
        {
          key: "EMPLOYEE_DOB",
          label: "Ngày sinh",
          type: "date",
          mergeFieldKey: "EMPLOYEE_DOB",
        },
        {
          key: "EMPLOYEE_ID",
          label: "Số CCCD / CMND",
          type: "text",
          placeholder: "VD: 079200012345",
          mergeFieldKey: "EMPLOYEE_ID",
        },
        {
          key: "EMPLOYEE_ADDRESS",
          label: "Địa chỉ thường trú",
          type: "text",
          placeholder: "VD: 45 Lê Lợi, Quận 3, TP.HCM",
          mergeFieldKey: "EMPLOYEE_ADDRESS",
        },
        {
          key: "EMPLOYEE_PHONE",
          label: "Số điện thoại",
          type: "text",
          placeholder: "VD: 0901234567",
          mergeFieldKey: "EMPLOYEE_PHONE",
        },
      ],
    },
    {
      title: "Điều khoản hợp đồng",
      fields: [
        {
          key: "CONTRACT_TYPE",
          label: "Loại hợp đồng",
          type: "select",
          required: true,
          options: [
            "Hợp đồng thử việc",
            "Hợp đồng xác định thời hạn",
            "Hợp đồng không xác định thời hạn",
          ],
          mergeFieldKey: "CONTRACT_TYPE",
        },
        {
          key: "CONTRACT_DURATION",
          label: "Thời hạn hợp đồng (tháng)",
          type: "text",
          placeholder: "VD: 12 (để trống nếu không xác định thời hạn)",
          mergeFieldKey: "CONTRACT_DURATION",
        },
        {
          key: "START_DATE",
          label: "Ngày bắt đầu làm việc",
          type: "date",
          required: true,
          mergeFieldKey: "START_DATE",
        },
        {
          key: "JOB_TITLE",
          label: "Chức danh / Vị trí công việc",
          type: "text",
          required: true,
          placeholder: "VD: Kỹ sư phần mềm",
          mergeFieldKey: "JOB_TITLE",
        },
        {
          key: "DEPARTMENT",
          label: "Phòng / Ban",
          type: "text",
          placeholder: "VD: Phòng Kỹ thuật",
          mergeFieldKey: "DEPARTMENT",
        },
        {
          key: "WORK_LOCATION",
          label: "Địa điểm làm việc",
          type: "text",
          placeholder: "VD: 123 Nguyễn Huệ, Quận 1, TP.HCM",
          mergeFieldKey: "WORK_LOCATION",
        },
      ],
    },
    {
      title: "Lương và phúc lợi",
      fields: [
        {
          key: "SALARY",
          label: "Mức lương cơ bản (VNĐ/tháng)",
          type: "text",
          required: true,
          placeholder: "VD: 15.000.000",
          mergeFieldKey: "SALARY",
        },
        {
          key: "PAYMENT_DATE",
          label: "Ngày trả lương hàng tháng",
          type: "text",
          placeholder: "VD: Ngày 10 hàng tháng",
          mergeFieldKey: "PAYMENT_DATE",
        },
        {
          key: "ALLOWANCES",
          label: "Phụ cấp (nếu có)",
          type: "textarea",
          placeholder: "VD: Phụ cấp xăng xe 500.000đ/tháng",
          mergeFieldKey: "ALLOWANCES",
        },
        {
          key: "PROBATION_SALARY",
          label: "Lương thử việc (nếu có)",
          type: "text",
          placeholder: "VD: 85% lương chính thức",
          mergeFieldKey: "PROBATION_SALARY",
        },
      ],
    },
  ],
};

const SERVICE_QUESTIONNAIRE: QuestionnaireSchema = {
  title: "Thông tin hợp đồng cung cấp dịch vụ",
  description:
    "Vui lòng điền đầy đủ thông tin để tạo hợp đồng cung cấp dịch vụ",
  sections: [
    {
      title: "Bên thuê dịch vụ (Bên A)",
      fields: [
        {
          key: "PARTY_A_NAME",
          label: "Tên công ty / cá nhân",
          type: "text",
          required: true,
          placeholder: "VD: Công ty Cổ phần XYZ",
          mergeFieldKey: "PARTY_A_NAME",
        },
        {
          key: "PARTY_A_ADDRESS",
          label: "Địa chỉ",
          type: "text",
          required: true,
          placeholder: "VD: 100 Đinh Tiên Hoàng, Quận Bình Thạnh, TP.HCM",
          mergeFieldKey: "PARTY_A_ADDRESS",
        },
        {
          key: "PARTY_A_TAX_CODE",
          label: "Mã số thuế / CCCD",
          type: "text",
          placeholder: "VD: 0987654321",
          mergeFieldKey: "PARTY_A_TAX_CODE",
        },
        {
          key: "PARTY_A_REPRESENTATIVE",
          label: "Người đại diện",
          type: "text",
          required: true,
          placeholder: "VD: Lê Văn C",
          mergeFieldKey: "PARTY_A_REPRESENTATIVE",
        },
        {
          key: "PARTY_A_POSITION",
          label: "Chức vụ",
          type: "text",
          placeholder: "VD: Giám đốc",
          mergeFieldKey: "PARTY_A_POSITION",
        },
      ],
    },
    {
      title: "Bên cung cấp dịch vụ (Bên B)",
      fields: [
        {
          key: "PARTY_B_NAME",
          label: "Tên công ty / cá nhân",
          type: "text",
          required: true,
          placeholder: "VD: Công ty TNHH Dịch vụ DEF",
          mergeFieldKey: "PARTY_B_NAME",
        },
        {
          key: "PARTY_B_ADDRESS",
          label: "Địa chỉ",
          type: "text",
          required: true,
          placeholder: "VD: 55 Pasteur, Quận 3, TP.HCM",
          mergeFieldKey: "PARTY_B_ADDRESS",
        },
        {
          key: "PARTY_B_TAX_CODE",
          label: "Mã số thuế / CCCD",
          type: "text",
          placeholder: "VD: 0321456789",
          mergeFieldKey: "PARTY_B_TAX_CODE",
        },
        {
          key: "PARTY_B_REPRESENTATIVE",
          label: "Người đại diện",
          type: "text",
          required: true,
          placeholder: "VD: Phạm Thị D",
          mergeFieldKey: "PARTY_B_REPRESENTATIVE",
        },
        {
          key: "PARTY_B_POSITION",
          label: "Chức vụ",
          type: "text",
          placeholder: "VD: Giám đốc",
          mergeFieldKey: "PARTY_B_POSITION",
        },
      ],
    },
    {
      title: "Nội dung dịch vụ",
      fields: [
        {
          key: "SERVICE_DESCRIPTION",
          label: "Mô tả dịch vụ cần cung cấp",
          type: "textarea",
          required: true,
          placeholder:
            "VD: Dịch vụ phát triển phần mềm quản lý bán hàng theo yêu cầu",
          mergeFieldKey: "SERVICE_DESCRIPTION",
        },
        {
          key: "SERVICE_START_DATE",
          label: "Ngày bắt đầu thực hiện",
          type: "date",
          required: true,
          mergeFieldKey: "SERVICE_START_DATE",
        },
        {
          key: "SERVICE_END_DATE",
          label: "Ngày hoàn thành dự kiến",
          type: "date",
          mergeFieldKey: "SERVICE_END_DATE",
        },
        {
          key: "DELIVERABLES",
          label: "Kết quả bàn giao",
          type: "textarea",
          placeholder: "VD: Mã nguồn, tài liệu kỹ thuật, hướng dẫn sử dụng",
          mergeFieldKey: "DELIVERABLES",
        },
      ],
    },
    {
      title: "Giá trị và thanh toán",
      fields: [
        {
          key: "CONTRACT_VALUE",
          label: "Giá trị hợp đồng (VNĐ)",
          type: "text",
          required: true,
          placeholder: "VD: 50.000.000",
          mergeFieldKey: "CONTRACT_VALUE",
        },
        {
          key: "PAYMENT_TERMS",
          label: "Điều khoản thanh toán",
          type: "textarea",
          placeholder: "VD: 30% khi ký hợp đồng, 70% khi nghiệm thu",
          mergeFieldKey: "PAYMENT_TERMS",
        },
        {
          key: "PAYMENT_METHOD",
          label: "Hình thức thanh toán",
          type: "select",
          options: ["Chuyển khoản ngân hàng", "Tiền mặt", "Séc"],
          mergeFieldKey: "PAYMENT_METHOD",
        },
      ],
    },
  ],
};

const NDA_QUESTIONNAIRE: QuestionnaireSchema = {
  title: "Thông tin thỏa thuận bảo mật (NDA)",
  description: "Vui lòng điền đầy đủ thông tin để tạo thỏa thuận bảo mật",
  sections: [
    {
      title: "Bên tiết lộ thông tin (Bên A)",
      fields: [
        {
          key: "DISCLOSING_PARTY_NAME",
          label: "Tên công ty / cá nhân",
          type: "text",
          required: true,
          placeholder: "VD: Công ty TNHH Công nghệ GHI",
          mergeFieldKey: "DISCLOSING_PARTY_NAME",
        },
        {
          key: "DISCLOSING_PARTY_ADDRESS",
          label: "Địa chỉ",
          type: "text",
          required: true,
          placeholder: "VD: 200 Nguyễn Văn Linh, Quận 7, TP.HCM",
          mergeFieldKey: "DISCLOSING_PARTY_ADDRESS",
        },
        {
          key: "DISCLOSING_PARTY_TAX_CODE",
          label: "Mã số thuế / CCCD",
          type: "text",
          placeholder: "VD: 0112233445",
          mergeFieldKey: "DISCLOSING_PARTY_TAX_CODE",
        },
        {
          key: "DISCLOSING_REPRESENTATIVE",
          label: "Người đại diện",
          type: "text",
          required: true,
          placeholder: "VD: Nguyễn Thị E",
          mergeFieldKey: "DISCLOSING_REPRESENTATIVE",
        },
      ],
    },
    {
      title: "Bên nhận thông tin (Bên B)",
      fields: [
        {
          key: "RECEIVING_PARTY_NAME",
          label: "Tên công ty / cá nhân",
          type: "text",
          required: true,
          placeholder: "VD: Freelancer Trần Văn F",
          mergeFieldKey: "RECEIVING_PARTY_NAME",
        },
        {
          key: "RECEIVING_PARTY_ADDRESS",
          label: "Địa chỉ",
          type: "text",
          required: true,
          placeholder: "VD: 78 Trần Hưng Đạo, Quận 5, TP.HCM",
          mergeFieldKey: "RECEIVING_PARTY_ADDRESS",
        },
        {
          key: "RECEIVING_PARTY_ID",
          label: "Số CCCD / Mã số thuế",
          type: "text",
          placeholder: "VD: 079200098765",
          mergeFieldKey: "RECEIVING_PARTY_ID",
        },
        {
          key: "RECEIVING_REPRESENTATIVE",
          label: "Người đại diện (nếu là tổ chức)",
          type: "text",
          placeholder: "VD: Giám đốc",
          mergeFieldKey: "RECEIVING_REPRESENTATIVE",
        },
      ],
    },
    {
      title: "Phạm vi bảo mật",
      fields: [
        {
          key: "CONFIDENTIAL_INFO",
          label: "Thông tin được bảo mật",
          type: "textarea",
          required: true,
          placeholder:
            "VD: Mã nguồn, kế hoạch kinh doanh, thông tin khách hàng, dữ liệu tài chính",
          mergeFieldKey: "CONFIDENTIAL_INFO",
        },
        {
          key: "PURPOSE",
          label: "Mục đích tiết lộ thông tin",
          type: "textarea",
          required: true,
          placeholder:
            "VD: Hợp tác phát triển phần mềm, đánh giá khả năng hợp tác kinh doanh",
          mergeFieldKey: "PURPOSE",
        },
        {
          key: "NDA_DURATION",
          label: "Thời hạn bảo mật (năm)",
          type: "text",
          required: true,
          placeholder: "VD: 2",
          mergeFieldKey: "NDA_DURATION",
        },
        {
          key: "EFFECTIVE_DATE",
          label: "Ngày hiệu lực",
          type: "date",
          required: true,
          mergeFieldKey: "EFFECTIVE_DATE",
        },
        {
          key: "EXCLUSIONS",
          label: "Thông tin không thuộc phạm vi bảo mật",
          type: "textarea",
          placeholder:
            "VD: Thông tin đã công khai, thông tin bên nhận biết từ nguồn khác",
          mergeFieldKey: "EXCLUSIONS",
        },
      ],
    },
  ],
};

const GOODS_QUESTIONNAIRE: QuestionnaireSchema = {
  title: "Thông tin hợp đồng mua bán hàng hóa",
  description:
    "Vui lòng điền đầy đủ thông tin để tạo hợp đồng mua bán hàng hóa",
  sections: [
    {
      title: "Bên bán (Bên A)",
      fields: [
        {
          key: "SELLER_NAME",
          label: "Tên công ty / cá nhân bán hàng",
          type: "text",
          required: true,
          placeholder: "VD: Công ty CP Thương mại JKL",
          mergeFieldKey: "SELLER_NAME",
        },
        {
          key: "SELLER_ADDRESS",
          label: "Địa chỉ",
          type: "text",
          required: true,
          placeholder: "VD: 500 Lý Thường Kiệt, Quận 10, TP.HCM",
          mergeFieldKey: "SELLER_ADDRESS",
        },
        {
          key: "SELLER_TAX_CODE",
          label: "Mã số thuế",
          type: "text",
          placeholder: "VD: 0556677889",
          mergeFieldKey: "SELLER_TAX_CODE",
        },
        {
          key: "SELLER_REPRESENTATIVE",
          label: "Người đại diện",
          type: "text",
          required: true,
          placeholder: "VD: Hoàng Văn G",
          mergeFieldKey: "SELLER_REPRESENTATIVE",
        },
        {
          key: "SELLER_BANK",
          label: "Tài khoản ngân hàng",
          type: "text",
          placeholder: "VD: 0123456789 - Vietcombank CN Bình Thạnh",
          mergeFieldKey: "SELLER_BANK",
        },
      ],
    },
    {
      title: "Bên mua (Bên B)",
      fields: [
        {
          key: "BUYER_NAME",
          label: "Tên công ty / cá nhân mua hàng",
          type: "text",
          required: true,
          placeholder: "VD: Công ty TNHH MNO",
          mergeFieldKey: "BUYER_NAME",
        },
        {
          key: "BUYER_ADDRESS",
          label: "Địa chỉ",
          type: "text",
          required: true,
          placeholder: "VD: 25 Hai Bà Trưng, Quận 1, TP.HCM",
          mergeFieldKey: "BUYER_ADDRESS",
        },
        {
          key: "BUYER_TAX_CODE",
          label: "Mã số thuế",
          type: "text",
          placeholder: "VD: 0334455667",
          mergeFieldKey: "BUYER_TAX_CODE",
        },
        {
          key: "BUYER_REPRESENTATIVE",
          label: "Người đại diện",
          type: "text",
          required: true,
          placeholder: "VD: Trần Thị H",
          mergeFieldKey: "BUYER_REPRESENTATIVE",
        },
      ],
    },
    {
      title: "Thông tin hàng hóa",
      fields: [
        {
          key: "GOODS_DESCRIPTION",
          label: "Tên / Mô tả hàng hóa",
          type: "textarea",
          required: true,
          placeholder:
            "VD: Máy tính xách tay Dell Inspiron 15, màu đen, RAM 16GB, SSD 512GB",
          mergeFieldKey: "GOODS_DESCRIPTION",
        },
        {
          key: "GOODS_QUANTITY",
          label: "Số lượng",
          type: "text",
          required: true,
          placeholder: "VD: 10 chiếc",
          mergeFieldKey: "GOODS_QUANTITY",
        },
        {
          key: "UNIT_PRICE",
          label: "Đơn giá (VNĐ)",
          type: "text",
          required: true,
          placeholder: "VD: 18.000.000",
          mergeFieldKey: "UNIT_PRICE",
        },
        {
          key: "TOTAL_VALUE",
          label: "Tổng giá trị hợp đồng (VNĐ)",
          type: "text",
          required: true,
          placeholder: "VD: 180.000.000",
          mergeFieldKey: "TOTAL_VALUE",
        },
        {
          key: "GOODS_QUALITY",
          label: "Tiêu chuẩn / Chất lượng",
          type: "textarea",
          placeholder: "VD: Hàng mới 100%, còn nguyên hộp, đúng cấu hình",
          mergeFieldKey: "GOODS_QUALITY",
        },
      ],
    },
    {
      title: "Giao hàng và thanh toán",
      fields: [
        {
          key: "DELIVERY_ADDRESS",
          label: "Địa điểm giao hàng",
          type: "text",
          required: true,
          placeholder: "VD: Tại địa chỉ của Bên B",
          mergeFieldKey: "DELIVERY_ADDRESS",
        },
        {
          key: "DELIVERY_DATE",
          label: "Thời gian giao hàng",
          type: "text",
          required: true,
          placeholder: "VD: Trong vòng 7 ngày kể từ ngày ký hợp đồng",
          mergeFieldKey: "DELIVERY_DATE",
        },
        {
          key: "PAYMENT_TERMS",
          label: "Phương thức và điều khoản thanh toán",
          type: "textarea",
          placeholder: "VD: Thanh toán 50% khi đặt hàng, 50% khi nhận hàng",
          mergeFieldKey: "PAYMENT_TERMS",
        },
        {
          key: "WARRANTY",
          label: "Bảo hành (nếu có)",
          type: "text",
          placeholder: "VD: 12 tháng bảo hành chính hãng",
          mergeFieldKey: "WARRANTY",
        },
      ],
    },
  ],
};

const RENTAL_QUESTIONNAIRE: QuestionnaireSchema = {
  title: "Thông tin hợp đồng thuê",
  description: "Vui lòng điền đầy đủ thông tin để tạo hợp đồng thuê",
  sections: [
    {
      title: "Bên cho thuê (Bên A)",
      fields: [
        {
          key: "LESSOR_NAME",
          label: "Tên công ty / cá nhân cho thuê",
          type: "text",
          required: true,
          placeholder: "VD: Nguyễn Văn I hoặc Công ty Địa ốc PQR",
          mergeFieldKey: "LESSOR_NAME",
        },
        {
          key: "LESSOR_ADDRESS",
          label: "Địa chỉ liên hệ",
          type: "text",
          required: true,
          placeholder: "VD: 88 Hoàng Diệu, Quận 4, TP.HCM",
          mergeFieldKey: "LESSOR_ADDRESS",
        },
        {
          key: "LESSOR_ID",
          label: "Số CCCD / Mã số thuế",
          type: "text",
          placeholder: "VD: 079200011111",
          mergeFieldKey: "LESSOR_ID",
        },
        {
          key: "LESSOR_PHONE",
          label: "Số điện thoại",
          type: "text",
          placeholder: "VD: 0912345678",
          mergeFieldKey: "LESSOR_PHONE",
        },
        {
          key: "LESSOR_BANK",
          label: "Tài khoản ngân hàng (để nhận tiền thuê)",
          type: "text",
          placeholder: "VD: 9876543210 - Techcombank",
          mergeFieldKey: "LESSOR_BANK",
        },
      ],
    },
    {
      title: "Bên thuê (Bên B)",
      fields: [
        {
          key: "LESSEE_NAME",
          label: "Tên công ty / cá nhân thuê",
          type: "text",
          required: true,
          placeholder: "VD: Công ty TNHH STU",
          mergeFieldKey: "LESSEE_NAME",
        },
        {
          key: "LESSEE_ADDRESS",
          label: "Địa chỉ liên hệ",
          type: "text",
          required: true,
          placeholder: "VD: 10 Bùi Thị Xuân, Quận Tân Bình, TP.HCM",
          mergeFieldKey: "LESSEE_ADDRESS",
        },
        {
          key: "LESSEE_ID",
          label: "Số CCCD / Mã số thuế",
          type: "text",
          placeholder: "VD: 0312233445",
          mergeFieldKey: "LESSEE_ID",
        },
        {
          key: "LESSEE_REPRESENTATIVE",
          label: "Người đại diện (nếu là doanh nghiệp)",
          type: "text",
          placeholder: "VD: Vũ Thị J",
          mergeFieldKey: "LESSEE_REPRESENTATIVE",
        },
      ],
    },
    {
      title: "Tài sản cho thuê",
      fields: [
        {
          key: "RENTAL_OBJECT_TYPE",
          label: "Loại tài sản cho thuê",
          type: "select",
          required: true,
          options: [
            "Văn phòng",
            "Nhà ở",
            "Mặt bằng kinh doanh",
            "Kho / Xưởng",
            "Thiết bị / Máy móc",
            "Phương tiện vận tải",
            "Khác",
          ],
          mergeFieldKey: "RENTAL_OBJECT_TYPE",
        },
        {
          key: "RENTAL_OBJECT_ADDRESS",
          label: "Địa chỉ / Vị trí tài sản",
          type: "text",
          required: true,
          placeholder: "VD: Tầng 3, 123 Nguyễn Đình Chiểu, Quận 3, TP.HCM",
          mergeFieldKey: "RENTAL_OBJECT_ADDRESS",
        },
        {
          key: "RENTAL_OBJECT_AREA",
          label: "Diện tích / Thông số kỹ thuật",
          type: "text",
          placeholder: "VD: 80m², 3 phòng",
          mergeFieldKey: "RENTAL_OBJECT_AREA",
        },
        {
          key: "RENTAL_OBJECT_DESCRIPTION",
          label: "Mô tả tình trạng tài sản",
          type: "textarea",
          placeholder: "VD: Tình trạng tốt, có điều hòa, có nội thất cơ bản",
          mergeFieldKey: "RENTAL_OBJECT_DESCRIPTION",
        },
      ],
    },
    {
      title: "Điều khoản thuê",
      fields: [
        {
          key: "RENTAL_START_DATE",
          label: "Ngày bắt đầu thuê",
          type: "date",
          required: true,
          mergeFieldKey: "RENTAL_START_DATE",
        },
        {
          key: "RENTAL_DURATION",
          label: "Thời hạn thuê",
          type: "text",
          required: true,
          placeholder: "VD: 12 tháng, 2 năm",
          mergeFieldKey: "RENTAL_DURATION",
        },
        {
          key: "MONTHLY_RENT",
          label: "Giá thuê hàng tháng (VNĐ)",
          type: "text",
          required: true,
          placeholder: "VD: 15.000.000",
          mergeFieldKey: "MONTHLY_RENT",
        },
        {
          key: "DEPOSIT",
          label: "Tiền đặt cọc (VNĐ)",
          type: "text",
          placeholder: "VD: 30.000.000 (tương đương 2 tháng tiền thuê)",
          mergeFieldKey: "DEPOSIT",
        },
        {
          key: "PAYMENT_DUE_DATE",
          label: "Ngày thanh toán tiền thuê",
          type: "text",
          placeholder: "VD: Ngày 5 hàng tháng",
          mergeFieldKey: "PAYMENT_DUE_DATE",
        },
        {
          key: "UTILITIES",
          label: "Chi phí tiện ích",
          type: "textarea",
          placeholder:
            "VD: Bên B chịu tiền điện, nước theo thực tế; internet 500.000đ/tháng",
          mergeFieldKey: "UTILITIES",
        },
      ],
    },
  ],
};

export const CONTRACT_TYPES: ContractTypeDefinition[] = [
  {
    id: "labor",
    title: "Hợp đồng lao động",
    description: "Quản lý nhân sự nội bộ (full-time, part-time, thử việc)",
    // examples: 'Ví dụ: Tuyển nhân viên văn phòng, nhân viên bán hàng, thử việc',
    icon: "Briefcase",
    color: "blue",
    questionnaire: LABOR_QUESTIONNAIRE,
  },
  {
    id: "service",
    title: "Hợp đồng cung cấp dịch vụ",
    description: "Hợp đồng tạo doanh thu chính cho agency, tech, consulting",
    // examples: 'Ví dụ: Dịch vụ marketing, phát triển phần mềm, tư vấn kinh doanh',
    icon: "FileText",
    color: "purple",
    questionnaire: SERVICE_QUESTIONNAIRE,
  },
  {
    id: "nda",
    title: "Thỏa thuận bảo mật (NDA)",
    description: "Bảo vệ thông tin kinh doanh khi làm việc với đối tác",
    // examples: 'Ví dụ: Bảo mật với freelancer, đối tác, nhà đầu tư',
    icon: "Shield",
    color: "green",
    questionnaire: NDA_QUESTIONNAIRE,
  },
  {
    id: "goods",
    title: "Hợp đồng mua bán hàng hóa",
    description: "Điều chỉnh việc mua bán sản phẩm cho SMEs thương mại",
    // examples: 'Ví dụ: Mua bán thiết bị, nguyên vật liệu, hàng hóa số lượng lớn',
    icon: "Package",
    color: "orange",
    questionnaire: GOODS_QUESTIONNAIRE,
  },
  {
    id: "rental",
    title: "Hợp đồng thuê",
    description: "Thuê văn phòng, mặt bằng hoặc thiết bị kinh doanh",
    // examples: 'Ví dụ: Thuê văn phòng, mặt bằng kinh doanh, thiết bị sản xuất',
    icon: "Building2",
    color: "violet",
    questionnaire: RENTAL_QUESTIONNAIRE,
  },
];

export const findContractType = (
  id: ContractTypeId,
): ContractTypeDefinition | undefined =>
  CONTRACT_TYPES.find((ct) => ct.id === id);
