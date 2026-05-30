import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ClauseVersioningService } from '../src/modules/projects/clause-versioning.service';
import { PrismaService } from '../src/integrations/prisma/prisma.service';
import { DocumentsService } from '../src/modules/documents/documents.service';

async function runTest() {
  console.log('=== KHỞI ĐỘNG SMOKE TEST LAW-F7-04 (Clause-level Mapping & Versioning) ===');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const versioningService = app.get(ClauseVersioningService);
  const documentsService = app.get(DocumentsService);

  // 1. Tạo dữ liệu giả lập
  console.log('1. Khởi tạo Workspace và User thử nghiệm...');
  const user = await prisma.user.create({
    data: {
      email: `test-f7-04-${Date.now()}@example.com`,
      name: 'F7-04 Test User',
      password: 'password-hash-123',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Test F7-04',
      companyCode: `LWZF74-${Date.now().toString().slice(-8)}`,
    },
  });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: 'admin' },
  });

  // Khởi tạo các ID để dọn dẹp
  let parentDocId: string | null = null;
  let childDocId: string | null = null;
  let linkId: string | null = null;

  try {
    // 2. Tạo Hợp đồng chính (Parent) chứa Clause node "Điều 5. Đơn giá"
    console.log('\n2. Tạo Hợp đồng gốc (Parent) có chứa Clause node...');
    const parentContentJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Đây là hợp đồng chính.' }],
        },
        {
          type: 'clause',
          attrs: {
            id: 'parent-clause-5-uid',
            title: 'Điều 5. Đơn giá',
            status: 'active',
            supersededByDocumentId: '',
            supersededByClauseId: '',
          },
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Đơn giá thi công xây dựng tuabin gió được ấn định là 1.000.000 USD/tuabin.',
                },
              ],
            },
          ],
        },
      ],
    };

    const parentDoc = await prisma.document.create({
      data: {
        title: 'Hợp đồng chính xây dựng tuabin gió',
        workspaceId: workspace.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'completed',
        contentJSON: parentContentJSON,
      },
    });
    parentDocId = parentDoc.id;
    console.log(`Hợp đồng gốc created: ${parentDocId}`);

    // 3. Tạo Phụ lục (Child) chứa Clause node "Mục 2" mô tả sửa đổi Điều 5
    console.log('\n3. Tạo Phụ lục (Child) có chứa Clause node sửa đổi...');
    const childContentJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Đây là phụ lục hợp đồng.' }],
        },
        {
          type: 'clause',
          attrs: {
            id: 'child-clause-2-uid',
            title: 'Mục 2',
            status: 'active',
            supersededByDocumentId: '',
            supersededByClauseId: '',
          },
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Sửa đổi Điều 5. Đơn giá của Hợp đồng chính: Điều chỉnh đơn giá thi công lên thành 1.200.000 USD/tuabin kể từ ngày ký phụ lục này.',
                },
              ],
            },
          ],
        },
      ],
    };

    const childDoc = await prisma.document.create({
      data: {
        title: 'Phụ lục số 02 điều chỉnh đơn giá',
        workspaceId: workspace.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'completed',
        contentJSON: childContentJSON,
      },
    });
    childDocId = childDoc.id;
    console.log(`Phụ lục created: ${childDocId}`);

    // 4. Kiểm thử sinh liên kết và tự động phân tích điều khoản
    console.log('\n4. Tạo liên kết đồ thị và kích hoạt phân tích điều khoản...');
    const link = await documentsService.createLink(user.id, {
      sourceDocumentId: parentDocId,
      targetDocumentId: childDocId,
      linkType: 'dependency',
    });
    linkId = link.id;
    console.log(`Đã tạo liên kết Hợp đồng -> Phụ lục. ID: ${linkId}`);

    console.log('Chờ 6 giây để AI chạy nền phân tích điều khoản...');
    await new Promise((res) => setTimeout(res, 6000));

    // 5. Xác minh trong DB xem đã tạo ClauseMapping chưa
    console.log('\n5. Xác minh kết quả phân tích trong DB...');
    const mappings = await documentsService.getClauseMappings(childDocId, user.id);
    console.log('Các Clause Mapping trích xuất từ DB:', JSON.stringify(mappings, null, 2));

    if (mappings.length === 0) {
      throw new Error('Chưa tạo ClauseMapping trong DB');
    }

    const mapping = mappings[0];
    if (
      mapping.sourceClauseId !== 'parent-clause-5-uid' ||
      mapping.targetClauseId !== 'child-clause-2-uid'
    ) {
      throw new Error('Mối quan hệ ánh xạ ID điều khoản bị sai lệch.');
    }
    console.log('✅ [PASS] AI ánh xạ chính xác điều khoản bị đè (Điều 5) và điều khoản thay thế (Mục 2).');

    // 6. Xác minh xem cây JSON của Hợp đồng chính đã được cập nhật superseded chưa
    const updatedParent = await prisma.document.findUnique({
      where: { id: parentDocId },
    });

    console.log('Cây JSON cập nhật của Hợp đồng gốc:', JSON.stringify(updatedParent?.contentJSON, null, 2));
    const parentJson = updatedParent?.contentJSON as any;
    
    // Tìm node Điều 5 trong cây JSON
    const clauseNode = parentJson?.content?.find((n: any) => n.type === 'clause' && n.attrs?.id === 'parent-clause-5-uid');
    
    if (!clauseNode) {
      throw new Error('Không tìm thấy Clause node gốc trong JSON cập nhật.');
    }

    if (
      clauseNode.attrs.status !== 'superseded' ||
      clauseNode.attrs.supersededByDocumentId !== childDocId ||
      clauseNode.attrs.supersededByClauseId !== 'child-clause-2-uid'
    ) {
      throw new Error('Thuộc tính superseded chưa được cập nhật chính xác trên JSON.');
    }

    console.log('✅ [PASS] Cập nhật thuộc tính Node Clause gốc thành superseded và lưu liên kết thành công.');

  } finally {
    // 7. Dọn dẹp dữ liệu
    console.log('\n7. Dọn dẹp dữ liệu kiểm thử...');
    if (linkId) await prisma.documentLink.delete({ where: { id: linkId } }).catch(() => {});
    
    // Xóa các mappings thủ công
    if (parentDocId && childDocId) {
      await prisma.clauseMapping.deleteMany({
        where: {
          sourceDocId: parentDocId,
          targetDocId: childDocId,
        },
      }).catch(() => {});
    }

    if (childDocId) await prisma.document.delete({ where: { id: childDocId } }).catch(() => {});
    if (parentDocId) await prisma.document.delete({ where: { id: parentDocId } }).catch(() => {});
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
