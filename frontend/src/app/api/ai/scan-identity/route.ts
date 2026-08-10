import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const OCR_PROMPT = `Bạn là chuyên gia OCR và trợ lý pháp lý AI hàng đầu tại Việt Nam.
Hãy đọc hình ảnh/tài liệu định danh (Căn cước công dân - CCCD, Chứng minh nhân dân - CMND, Hộ chiếu - Passport, Giấy chứng nhận đăng ký doanh nghiệp - ĐKKD, Mã số thuế) và trích xuất tất cả các thông tin có trên giấy tờ.

HÃY ĐỐI CHIẾU VỚI CÁC FIELD KEY NÀY ĐỂ TRẢ VỀ DỮ LIỆU:

Dành cho Cá nhân (CCCD / CMND / Hộ chiếu):
- f_cn_hoten: Họ và tên
- f_cn_gioitinh: Giới tính
- f_cn_ngaysinh: Ngày sinh (định dạng DD/MM/YYYY)
- f_cn_quoctich: Quốc tịch
- f_cn_cccd: Số CCCD / CMND / Hộ chiếu
- f_cn_diachi: Nơi thường trú / Địa chỉ liên hệ

Dành cho Doanh nghiệp / Tổ chức (Giấy ĐKKD / MST):
- f_to_ten: Tên doanh nghiệp / tổ chức
- f_to_loaihinh: Loại hình doanh nghiệp (Công ty TNHH, Công ty Cổ phần, v.v.)
- f_to_mst: Mã số doanh nghiệp / Mã số thuế
- f_to_ngaycap: Ngày cấp ĐKKD
- f_to_noicap: Nơi cấp (Cục Thuế / Sở Kế hoạch & Đầu tư, v.v.)
- f_to_diachi: Địa chỉ trụ sở chính
- f_to_dienthoai: Số điện thoại trụ sở
- f_to_email: Email liên hệ
- f_to_vondl: Vốn điều lệ

Người đại diện theo pháp luật (từ ĐKKD):
- f_dd_hoten: Họ tên người đại diện pháp luật
- f_dd_chucdanh: Chức danh (Giám đốc, Tổng giám đốc, Chủ tịch, v.v.)
- f_dd_madinhdanh: Số CCCD/CMND của người đại diện
- f_dd_ngaysinh: Ngày sinh của người đại diện
- f_dd_diachi: Địa chỉ người đại diện

YÊU CẦU ĐẦU RA:
Trả về duy nhất 01 chuỗi JSON (không dùng markdown codeblock, không thêm lời thoại) theo cấu trúc chính xác:
{
  "documentType": "cccd" | "passport" | "business_registration" | "other",
  "investorType": "individual" | "organization",
  "suggestions": [
    {
      "fieldKey": "f_cn_hoten",
      "label": "Họ và tên",
      "value": "NGUYỄN VĂN A",
      "group": "individual"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_SANITIZER;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình API Key cho AI Scanner' },
        { status: 500 }
      );
    }

    let mimeType = 'image/jpeg';
    let base64Data = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Không tìm thấy file tải lên' }, { status: 400 });
      }
      mimeType = file.type || 'image/jpeg';
      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const body = await req.json();
      mimeType = body.mimeType || 'image/jpeg';
      base64Data = body.base64 || '';
    }

    if (!base64Data) {
      return NextResponse.json({ error: 'Dữ liệu hình ảnh trống' }, { status: 400 });
    }

    // Standardize mimeType for Gemini Vision
    if (mimeType.includes('pdf')) {
      mimeType = 'application/pdf';
    } else if (!mimeType.startsWith('image/')) {
      mimeType = 'image/jpeg';
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent([
      OCR_PROMPT,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const responseText = result.response.text();
    let parsedJson: {
      documentType?: string;
      investorType?: string;
      suggestions?: Array<{
        fieldKey: string;
        label: string;
        value: string;
        group?: string;
      }>;
    } = {};

    try {
      const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleanJsonStr);
    } catch {
      return NextResponse.json(
        { error: 'AI không thể định dạng kết quả trích xuất', raw: responseText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentType: parsedJson.documentType || 'unknown',
      investorType: parsedJson.investorType || 'individual',
      suggestions: parsedJson.suggestions || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xử lý quét ảnh AI';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
