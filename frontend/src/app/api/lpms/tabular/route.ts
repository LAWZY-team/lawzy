import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, columnId, columnDef } = body;

    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // MOCK DATA GENERATION:
    // This is currently a MOCK implementation. 
    // To complete this:
    // 1. We need to extract the text from the actual document `documentId` from R2 storage or DB.
    // 2. We need to use @google/genai or langchain to call the Gemini API using `GEMINI_API_KEY`.
    // 3. We use `columnDef.description` as the prompt to extract the specific clause.

    let content = "";

    if (columnDef?.name?.toLowerCase().includes("tên")) {
      content = "Công ty CP Năng lượng Xanh (GreenPower) và Công ty TNHH Giải pháp Lawzy (Lawzy).";
    } else if (columnDef?.name?.toLowerCase().includes("thời hạn")) {
      content = "Hợp đồng có hiệu lực 12 tháng kể từ ngày ký. Tự động gia hạn thêm 1 năm nếu không có thông báo chấm dứt.";
    } else if (columnDef?.name?.toLowerCase().includes("giá")) {
      content = "Tổng giá trị: 500.000.000 VNĐ. Thanh toán làm 3 đợt (30% - 40% - 30%).";
    } else {
      content = `Đã tìm thấy thông tin liên quan đến "${columnDef?.name}". Mức phạt vi phạm hợp đồng là 8% giá trị phần nghĩa vụ bị vi phạm.`;
    }

    return NextResponse.json({
      status: "done",
      content: content
    });

  } catch (error) {
    console.error("Tabular API Error:", error);
    return NextResponse.json({ error: "Failed to generate cell" }, { status: 500 });
  }
}
