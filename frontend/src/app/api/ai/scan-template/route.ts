import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const TEMPLATE_SCAN_PROMPT = `Bạn là trợ lý pháp lý AI hàng đầu tại Việt Nam.
Hãy phân tích văn bản hợp đồng / biểu mẫu pháp lý dưới đây và đề xuất danh sách tất cả các trường dữ liệu cần điền (placeholders / fields).

QUY TẮC PHÂN TÍCH:
1. Phát hiện tất cả các vị trí có ngoặc vuông [TÊN CÔNG TY], {{ngay_ky}}, <<dia_chi>>...
2. Nếu văn bản là văn bản hợp đồng mẫu chưa có ngoặc, hãy tự động nhận diện các vị trí dữ liệu linh hoạt (ví dụ: Tên công ty A, Đại diện bên B, Giá trị hợp đồng, Ngày ký, Số hợp đồng) và đề xuất dưới dạng placeholder [Mô Tả Trường].
3. Ánh xạ (mappedKey) với các field key chuẩn:
   - f_to_ten: Tên công ty / tổ chức
   - f_to_mst: Mã số thuế / Mã số doanh nghiệp
   - f_to_diachi: Địa chỉ công ty
   - f_to_loaihinh: Loại hình doanh nghiệp
   - f_to_vondl: Vốn điều lệ
   - f_cn_hoten: Họ tên cá nhân
   - f_cn_cccd: Số CCCD / CMND
   - f_cn_diachi: Địa chỉ cá nhân
   - f_dd_hoten: Họ tên người đại diện pháp luật
   - f_dd_chucdanh: Chức danh người đại diện

YÊU CẦU ĐẦU RA:
Trả về duy nhất 01 chuỗi JSON (không dùng markdown codeblock, không thêm lời thoại):
{
  "ai": [
    {
      "placeholder": "[TÊN CÔNG TY BÊN A]",
      "mappedKey": "f_to_ten",
      "label": "Tên công ty Bên A",
      "confidence": 0.95,
      "source": "ai"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_SANITIZER;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key' }, { status: 500 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Văn bản cần phân tích trống' }, { status: 400 });
    }

    const textToAnalyze = text.substring(0, 8000);
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent([
      TEMPLATE_SCAN_PROMPT,
      `VĂN BẢN MẪU CẦN PHÂN TÍCH:\n${textToAnalyze}`,
    ]);

    const responseText = result.response.text();
    let parsed: { ai?: Array<{ placeholder: string; mappedKey: string; label: string; confidence?: number; source?: string }> } = {};

    try {
      const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJsonStr);
    } catch {
      return NextResponse.json(
        { error: 'AI không thể định dạng kết quả phân tích', raw: responseText },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      ai: parsed.ai || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi phân tích AI văn bản mẫu';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
