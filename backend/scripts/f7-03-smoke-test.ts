import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProjectLinkerSuggestionService } from '../src/modules/projects/project-linker-suggestion.service';
import { PrismaService } from '../src/integrations/prisma/prisma.service';
import { DocumentsService } from '../src/modules/documents/documents.service';

async function runTest() {
  console.log('=== KHỞI ĐỘNG SMOKE TEST LAW-F7-03 (AI Suggestion Parent-Child) ===');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const linkerService = app.get(ProjectLinkerSuggestionService);
  const documentsService = app.get(DocumentsService);

  // 1. Tạo dữ liệu giả lập
  console.log('1. Khởi tạo Workspace và User thử nghiệm...');
  const user = await prisma.user.create({
    data: {
      email: `test-f7-03-${Date.now()}@example.com`,
      name: 'F7-03 Test User',
      password: 'password-hash-123',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Test F7-03',
      companyCode: `LWZF73-${Date.now().toString().slice(-8)}`,
    },
  });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: 'admin' },
  });

  // Tạo một dự án
  const project = await prisma.project.create({
    data: {
      name: 'Dự án Điện gió Green Power',
      code: 'GP-WIND-2026',
      workspaceId: workspace.id,
    },
  });

  // Khởi tạo các ID để dọn dẹp
  let parentDocId: string | null = null;
  let childDocId: string | null = null;
  let childDoc2Id: string | null = null;
  let link1Id: string | null = null;
  let link2Id: string | null = null;

  try {
    // 2. Tạo tài liệu gốc (Parent Document) với contractNumber trong metadata
    console.log('\n2. Tạo Hợp đồng gốc (Parent)...');
    const parentDoc = await prisma.document.create({
      data: {
        title: 'Hợp đồng mua bán điện gốc GP-WIND',
        workspaceId: workspace.id,
        projectId: project.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'completed',
        metadata: {
          contractNumber: '15/2026/HĐ-GP', // Số hợp đồng gốc
          projectName: 'Dự án Điện gió Green Power',
        },
      },
    });
    parentDocId = parentDoc.id;
    console.log(`Hợp đồng gốc được tạo với ID: ${parentDocId}, Số HĐ: 15/2026/HĐ-GP`);

    // 3. Tạo tài liệu phụ lục (Child Document) với nội dung tham chiếu đến Số HĐ gốc
    console.log('\n3. Tạo Phụ lục 01 (Child) chứa nội dung tham chiếu số hợp đồng gốc...');
    const childDocContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nPHỤ LỤC HỢP ĐỒNG SỐ 02\n\nPhụ lục này được lập căn cứ vào Hợp đồng số 15/2026/HĐ-GP đã ký ngày 15/01/2026 giữa Công ty Cổ phần Năng lượng Xanh và Công ty EPC Global về việc thi công lắp đặt tuabin gió.',
            },
          ],
        },
      ],
    };

    const childDoc = await prisma.document.create({
      data: {
        title: 'Phụ lục 02 sửa đổi đơn giá',
        workspaceId: workspace.id,
        projectId: project.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'draft',
        contentJSON: childDocContent,
      },
    });
    childDocId = childDoc.id;
    console.log(`Phụ lục được tạo với ID: ${childDocId}`);

    // Gọi generateSuggestions trực tiếp để quét và phát sinh đề xuất
    console.log('Gọi linkerService.generateSuggestions()...');
    const suggestions = await linkerService.generateSuggestions(childDocId);
    console.log('Kết quả sinh đề xuất tự động:', JSON.stringify(suggestions, null, 2));

    if (suggestions.length === 0) {
      throw new Error('AI không sinh ra đề xuất liên kết nào.');
    }

    const proposedLink = suggestions[0];
    link1Id = proposedLink.id;

    if (proposedLink.sourceDocumentId !== parentDocId || proposedLink.status !== 'ai_suggested') {
      throw new Error('Thông số đề xuất liên kết không khớp với hợp đồng gốc hoặc trạng thái không phải ai_suggested');
    }
    console.log('✅ [PASS] AI phát hiện chính xác số hiệu hợp đồng gốc và tạo liên kết đề xuất (ai_suggested).');

    // 4. Kiểm thử GET endpoint /documents/:id/linking-suggestions
    console.log('\n4. Kiểm thử lấy danh sách đề xuất qua documentsService.getSuggestions()...');
    const retrievedSuggestions = await documentsService.getSuggestions(childDocId, user.id);
    console.log('Đề xuất lấy được:', JSON.stringify(retrievedSuggestions, null, 2));
    if (retrievedSuggestions.length === 0 || retrievedSuggestions[0].id !== link1Id) {
      throw new Error('Lấy danh sách đề xuất không thành công.');
    }
    console.log('✅ [PASS] Lấy danh sách đề xuất thành công.');

    // 5. Kiểm thử Chấp nhận liên kết (Accept Suggestion)
    console.log('\n5. Kiểm thử Chấp nhận đề xuất liên kết...');
    const acceptResult = await documentsService.acceptSuggestion(childDocId!, link1Id!, user.id);
    console.log('Kết quả chấp nhận:', JSON.stringify(acceptResult, null, 2));

    if (acceptResult.status !== 'active') {
      throw new Error('Trạng thái link sau khi chấp nhận không phải active');
    }

    // Xác minh document.parentId của Child đã trỏ về Parent
    const updatedChild = await prisma.document.findUnique({
      where: { id: childDocId },
    });
    console.log(`Trạng thái parentId của Child sau khi accept: ${updatedChild?.parentId}`);
    if (updatedChild?.parentId !== parentDocId) {
      throw new Error('parentId của child document chưa được cập nhật chính xác');
    }
    console.log('✅ [PASS] Chấp nhận liên kết thành công. Cây cấu trúc tài liệu được thiết lập.');

    // 6. Kiểm thử Từ chối liên kết (Reject Suggestion)
    console.log('\n6. Kiểm thử Từ chối đề xuất liên kết...');
    
    // Tạo child document thứ 2
    const childDoc2 = await prisma.document.create({
      data: {
        title: 'Phụ lục 03 sửa đổi tiến độ',
        workspaceId: workspace.id,
        projectId: project.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'draft',
        contentJSON: childDocContent, // dùng chung content tham chiếu HĐ gốc
      },
    });
    childDoc2Id = childDoc2.id;

    // Sinh đề xuất cho child 2
    const suggestions2 = await linkerService.generateSuggestions(childDoc2Id);
    if (suggestions2.length === 0) {
      throw new Error('AI không sinh ra đề xuất liên kết cho phụ lục 2.');
    }
    link2Id = suggestions2[0].id;

    // Từ chối đề xuất
    const rejectResult = await documentsService.rejectSuggestion(childDoc2Id!, link2Id!, user.id);
    console.log('Kết quả từ chối:', JSON.stringify(rejectResult, null, 2));

    if (rejectResult.status !== 'ai_rejected') {
      throw new Error('Trạng thái link sau khi từ chối không phải ai_rejected');
    }

    // Đảm bảo parentId vẫn là null
    const updatedChild2 = await prisma.document.findUnique({
      where: { id: childDoc2Id },
    });
    if (updatedChild2?.parentId != null) {
      throw new Error('parentId của tài liệu bị từ chối không được phép có giá trị');
    }
    console.log('✅ [PASS] Từ chối liên kết thành công. Trạng thái lưu là ai_rejected và không đổi cấu trúc cây.');

    // 7. Kiểm thử việc không sinh lại liên kết đã bị từ chối
    console.log('\n7. Kiểm thử AI gợi ý loại trừ các liên kết đã bị từ chối trước đó...');
    const suggestionsAfterReject = await linkerService.generateSuggestions(childDoc2Id);
    console.log('Đề xuất sinh lại sau khi đã từ chối:', suggestionsAfterReject);
    if (suggestionsAfterReject.length > 0) {
      throw new Error('AI vẫn gợi ý lại liên kết đã bị từ chối trước đó.');
    }
    console.log('✅ [PASS] Tránh gợi ý trùng lặp liên kết bị từ chối thành công.');

  } finally {
    // 8. Dọn dẹp dữ liệu
    console.log('\n8. Dọn dẹp dữ liệu kiểm thử...');
    if (link1Id) await prisma.documentLink.delete({ where: { id: link1Id } }).catch(() => {});
    if (link2Id) await prisma.documentLink.delete({ where: { id: link2Id } }).catch(() => {});
    if (childDocId) await prisma.document.delete({ where: { id: childDocId } }).catch(() => {});
    if (childDoc2Id) await prisma.document.delete({ where: { id: childDoc2Id } }).catch(() => {});
    if (parentDocId) await prisma.document.delete({ where: { id: parentDocId } }).catch(() => {});
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
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
