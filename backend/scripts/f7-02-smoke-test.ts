import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProjectMetadataExtractorService } from '../src/modules/projects/project-metadata-extractor.service';
import { PrismaService } from '../src/integrations/prisma/prisma.service';
import { DocumentsService } from '../src/modules/documents/documents.service';

async function runTest() {
  console.log('=== KHỞI ĐỘNG SMOKE TEST LAW-F7-02 (AI Metadata Extractor) ===');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const extractor = app.get(ProjectMetadataExtractorService);
  const documentsService = app.get(DocumentsService);

  // 1. Tạo dữ liệu giả lập cho kiểm thử
  console.log('1. Khởi tạo Workspace và User thử nghiệm...');
  const user = await prisma.user.create({
    data: {
      email: `test-f7-02-${Date.now()}@example.com`,
      name: 'F7-02 Test User',
      password: 'password-hash-123',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Test F7-02',
      companyCode: `LWZF72-${Date.now().toString().slice(-8)}`,
    },
  });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: 'admin' },
  });

  // Khởi tạo các ID để dọn dẹp
  let doc1Id: string | null = null;
  let doc2Id: string | null = null;
  let doc3Id: string | null = null;
  let fakeFileId: string | null = null;

  try {
    // 2. Nội dung văn bản hợp đồng mẫu bằng tiếng Việt (TipTap JSON)
    const sampleContentJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nHỢP ĐỒNG EPC XÂY DỰNG NHÀ MÁY ĐIỆN MẶT TRỜI\nDự án: Nhà máy điện mặt trời Lộc Ninh 3 (công suất 50MWp)\nĐịa điểm: Huyện Lộc Ninh, Tỉnh Bình Phước, Việt Nam.\n\nBÊN A (Chủ đầu tư):\nCông ty Cổ phần Năng lượng Xanh Lộc Ninh\nĐại diện bởi: Nguyễn Văn A - Chức vụ: Giám đốc\n\nBÊN B (Nhà thầu):\nCông ty TNHH Kỹ thuật và Xây dựng EPC Global\nĐại diện bởi: Trần Văn B - Chức vụ: Tổng Giám đốc\n\nCăn cứ pháp lý:\n- Luật Xây dựng số 50/2014/QH13;\n- Nghị định số 06/2021/NĐ-CP của Chính phủ.',
            },
          ],
        },
      ],
    };

    console.log('\n2. Kiểm thử Trích xuất trực tiếp từ Editor contentJSON...');
    const doc1 = await prisma.document.create({
      data: {
        title: 'Hợp đồng EPC Lộc Ninh 3',
        workspaceId: workspace.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'draft',
        contentJSON: sampleContentJSON,
      },
    });
    doc1Id = doc1.id;

    console.log(`Document 1 created with ID: ${doc1Id}. Gọi extractor.extractMetadata()...`);
    const metadataResult = await extractor.extractMetadata(doc1Id);

    console.log('Kết quả trích xuất từ Gemini:', JSON.stringify(metadataResult, null, 2));

    // Xác minh các trường dữ liệu được trích xuất
    if (!metadataResult) {
      throw new Error('extractor.extractMetadata trả về null');
    }

    const requiredFields = ['projectName', 'developerName', 'contractorName', 'capacity', 'location', 'legalBases'];
    for (const field of requiredFields) {
      if (metadataResult[field] === undefined) {
        throw new Error(`Thiếu trường ${field} trong kết quả trích xuất`);
      }
    }

    console.log('✅ [PASS] Trích xuất trực tiếp thành công và đầy đủ các trường.');

    // Kiểm tra DB để đảm bảo dữ liệu đã được lưu
    const updatedDoc1 = await prisma.document.findUnique({
      where: { id: doc1Id },
    });
    console.log('Kiểm tra metadata trong DB:', JSON.stringify(updatedDoc1?.metadata, null, 2));
    if (!updatedDoc1?.metadata) {
      throw new Error('Metadata chưa được lưu vào DB');
    }
    console.log('✅ [PASS] Metadata lưu vào DB chính xác.');


    // 3. Kiểm thử Background Trigger qua update status thành 'completed'
    console.log('\n3. Kiểm thử Background Trigger qua update()...');
    const doc2 = await prisma.document.create({
      data: {
        title: 'Hợp đồng EPC Lộc Ninh 3 - Auto Trigger',
        workspaceId: workspace.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'draft',
        contentJSON: sampleContentJSON,
      },
    });
    doc2Id = doc2.id;

    console.log(`Cập nhật status của Document 2 thành completed...`);
    await documentsService.update(doc2Id, { status: 'completed' }, user.id);

    console.log('Chờ 5 giây để AI chạy background...');
    await new Promise((res) => setTimeout(res, 5000));

    const updatedDoc2 = await prisma.document.findUnique({
      where: { id: doc2Id },
    });

    console.log('Kiểm tra metadata tự động trích xuất trong DB cho Document 2:', JSON.stringify(updatedDoc2?.metadata, null, 2));
    const doc2Metadata = updatedDoc2?.metadata as any;
    if (!doc2Metadata || !doc2Metadata.projectName) {
      throw new Error('Background metadata extraction không chạy hoặc không lưu thành công');
    }
    console.log('✅ [PASS] Tự động kích hoạt trích xuất metadata khi hoàn thành tài liệu thành công.');


    // 4. Kiểm thử OCR / Đọc tệp đính kèm vật lý lỗi và fallback sang TipTap contentJSON
    console.log('\n4. Kiểm thử đính kèm tệp lỗi và fallback sang Editor contentJSON...');
    
    // Tạo document kèm 1 file đính kèm ảo
    const doc3 = await prisma.document.create({
      data: {
        title: 'Hợp đồng có file đính kèm lỗi',
        workspaceId: workspace.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'draft',
        contentJSON: sampleContentJSON,
      },
    });
    doc3Id = doc3.id;

    // Tạo file đính kèm ảo (input_upload) có s3Key không tồn tại
    const attachedFile = await prisma.file.create({
      data: {
        name: 'non_existent_contract.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        s3Key: `fake-s3-key-for-test-${Date.now()}`,
        category: 'input_upload',
        documentId: doc3Id,
        userId: user.id,
        workspaceId: workspace.id,
      },
    });
    fakeFileId = attachedFile.id;

    console.log(`Đã tạo tệp đính kèm lỗi cho Document 3 (ID: ${doc3Id}). Gọi extractor.extractMetadata()...`);
    const fallbackMetadataResult = await extractor.extractMetadata(doc3Id);

    console.log('Kết quả trích xuất sau khi fallback:', JSON.stringify(fallbackMetadataResult, null, 2));
    if (!fallbackMetadataResult || !fallbackMetadataResult.projectName) {
      throw new Error('Không fallback thành công sang contentJSON khi đọc tệp bị lỗi');
    }
    console.log('✅ [PASS] Fallback sang contentJSON khi gặp lỗi đọc tệp thành công.');


    // 5. Kiểm thử Ghi nhận lỗi và Không crash khi gặp lỗi hoàn toàn (trống dữ liệu)
    console.log('\n5. Kiểm thử error logging khi tài liệu hoàn toàn không có nội dung...');
    const docEmpty = await prisma.document.create({
      data: {
        title: 'Tài liệu trống',
        workspaceId: workspace.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'draft',
        contentJSON: {}, // content trống rỗng
      },
    });
    const docEmptyId = docEmpty.id;

    // Do contentJSON trống và không có tệp đính kèm, extractor nên ghi nhận warn/error
    // Hoặc nếu gọi trực tiếp, ta kiểm tra lỗi
    console.log(`Gọi extractMetadata cho tài liệu trống...`);
    const emptyResult = await extractor.extractMetadata(docEmptyId);
    console.log(`Kết quả trả về cho tài liệu trống:`, emptyResult);

    const updatedDocEmpty = await prisma.document.findUnique({
      where: { id: docEmptyId },
    });
    
    // Xóa tài liệu trống ngay sau đó
    await prisma.document.delete({ where: { id: docEmptyId } });

    console.log('✅ [PASS] Xử lý tài liệu trống thành công (không crash).');

  } finally {
    // 6. Dọn dẹp dữ liệu
    console.log('\n6. Dọn dẹp dữ liệu kiểm thử...');
    if (fakeFileId) {
      await prisma.file.delete({ where: { id: fakeFileId } }).catch(() => {});
    }
    if (doc1Id) {
      await prisma.document.delete({ where: { id: doc1Id } }).catch(() => {});
    }
    if (doc2Id) {
      await prisma.document.delete({ where: { id: doc2Id } }).catch(() => {});
    }
    if (doc3Id) {
      await prisma.document.delete({ where: { id: doc3Id } }).catch(() => {});
    }
    await prisma.workspaceMember.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    
    console.log('🧹 Đã dọn dẹp sạch sẽ DB.');
    await app.close();
  }

  console.log('\n🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===');
}

runTest().catch((e) => {
  console.error('❌ Lỗi chạy Smoke Test:', e);
  process.exit(1);
});
