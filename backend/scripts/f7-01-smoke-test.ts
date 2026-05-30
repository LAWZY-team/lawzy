import { PrismaClient } from '@prisma/client';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { WorkspaceAccessService } from '../src/common/workspace-access.service';

const prisma = new PrismaClient();

async function runTest() {
  console.log('=== KHỞI ĐỘNG SMOKE TEST LAW-F7-01 ===');

  // Khởi tạo các Service giả lập
  const workspaceAccess = new WorkspaceAccessService(prisma as any);
  const projectsService = new ProjectsService(prisma as any, workspaceAccess);
  const documentsService = new DocumentsService(prisma as any, workspaceAccess, null as any, null as any, null as any);

  // 1. Tạo dữ liệu giả lập cho kiểm thử
  console.log('1. Khởi tạo Workspace và User thử nghiệm...');
  const user = await prisma.user.create({
    data: {
      email: `test-f7-${Date.now()}@example.com`,
      name: 'F7 Test User',
      password: 'password-hash-123',
    },
  });

  const workspaceA = await prisma.workspace.create({
    data: {
      name: 'Workspace Green Power A',
      companyCode: `GPA-${Date.now()}`,
    },
  });

  const workspaceB = await prisma.workspace.create({
    data: {
      name: 'Workspace Green Power B',
      companyCode: `GPB-${Date.now()}`,
    },
  });

  // Thêm user vào 2 workspace
  await prisma.workspaceMember.create({
    data: { workspaceId: workspaceA.id, userId: user.id, role: 'admin' },
  });
  await prisma.workspaceMember.create({
    data: { workspaceId: workspaceB.id, userId: user.id, role: 'admin' },
  });

  let projectA1Id: string | null = null;
  let projectB1Id: string | null = null;
  let docAId: string | null = null;
  let docBId: string | null = null;
  let docCId: string | null = null;
  let link1Id: string | null = null;
  let link2Id: string | null = null;

  try {
    // 2. Kiểm thử AC-2: Tạo dự án trùng mã code chéo Workspace vs Cùng Workspace
    console.log('\n2. Kiểm thử AC-2 (Multi-tenant uniqueness)...');
    
    // Tạo dự án GP-GIALAI trên Workspace A
    const pA1 = await projectsService.create(user.id, {
      name: 'Dự án Điện Gia Lai 1',
      code: 'GP-GIALAI',
      workspaceId: workspaceA.id,
    });
    projectA1Id = pA1.id;
    console.log(`✅ [PASS] Tạo thành công dự án GP-GIALAI trên Workspace A (ID: ${pA1.id})`);

    // Tạo trùng mã trên Workspace A -> Phải báo lỗi
    try {
      await projectsService.create(user.id, {
        name: 'Dự án Điện Gia Lai 2',
        code: 'GP-GIALAI',
        workspaceId: workspaceA.id,
      });
      console.log('❌ [FAIL] Cho phép tạo trùng mã code trên cùng Workspace');
      throw new Error('AC-2 Fail');
    } catch (e: any) {
      if (e.message.includes('đã tồn tại trong hệ thống')) {
        console.log('✅ [PASS] Chặn tạo trùng dự án trên cùng một Workspace thành công.');
      } else {
        throw e;
      }
    }

    // Tạo trùng mã trên Workspace B -> Phải thành công
    const pB1 = await projectsService.create(user.id, {
      name: 'Dự án Gia Lai ở phân khúc B',
      code: 'GP-GIALAI',
      workspaceId: workspaceB.id,
    });
    projectB1Id = pB1.id;
    console.log(`✅ [PASS] Tạo thành công dự án GP-GIALAI trên Workspace B (ID: ${pB1.id})`);

    // 3. Kiểm thử AC-3: Ngăn chặn liên kết vòng lặp (Circular Dependency)
    console.log('\n3. Kiểm thử AC-3 (Circular Dependency)...');

    // Tạo 3 tài liệu A, B, C trong Workspace A
    const docA = await prisma.document.create({
      data: { title: 'Hợp đồng gốc A', workspaceId: workspaceA.id, createdBy: user.id, visibility: 'workspace' },
    });
    docAId = docA.id;

    const docB = await prisma.document.create({
      data: { title: 'Phụ lục B', workspaceId: workspaceA.id, createdBy: user.id, visibility: 'workspace' },
    });
    docBId = docB.id;

    const docC = await prisma.document.create({
      data: { title: 'Nghiệm thu C', workspaceId: workspaceA.id, createdBy: user.id, visibility: 'workspace' },
    });
    docCId = docC.id;

    // Tạo Link 1: A -> B
    const link1 = await documentsService.createLink(user.id, {
      sourceDocumentId: docA.id,
      targetDocumentId: docB.id,
      linkType: 'dependency',
    });
    link1Id = link1.id;
    console.log(`✅ [PASS] Tạo liên kết Hợp đồng A -> Phụ lục B thành công.`);

    // Tạo Link 2: B -> C
    const link2 = await documentsService.createLink(user.id, {
      sourceDocumentId: docB.id,
      targetDocumentId: docC.id,
      linkType: 'dependency',
    });
    link2Id = link2.id;
    console.log(`✅ [PASS] Tạo liên kết Phụ lục B -> Nghiệm thu C thành công.`);

    // Thử tạo Link xoay vòng: C -> A -> Phải báo lỗi Conflict (409)
    try {
      await documentsService.createLink(user.id, {
        sourceDocumentId: docC.id,
        targetDocumentId: docA.id,
        linkType: 'dependency',
      });
      console.log('❌ [FAIL] Cho phép tạo liên kết vòng lặp C -> A');
      throw new Error('AC-3 Fail');
    } catch (e: any) {
      if (e.message.includes('vòng lặp phụ thuộc')) {
        console.log('✅ [PASS] Chặn tạo liên kết vòng lặp C -> A thành công.');
      } else {
        throw e;
      }
    }

    // 4. Kiểm thử AC-4: Soft delete tài liệu khiến liên kết chuyển sang trạng thái "broken"
    console.log('\n4. Kiểm thử AC-4 (Soft-delete broken link)...');
    
    // Kiểm tra liên kết của B trước khi soft-delete
    let bLinks = await documentsService.getDocumentLinks(docB.id, user.id);
    console.log(`   - Trạng thái link B -> C trước khi xóa C: ${bLinks.outgoing[0].status}`);

    // Thực hiện soft-delete tài liệu C (bằng cách cập nhật deletedAt)
    await prisma.document.update({
      where: { id: docC.id },
      data: { deletedAt: new Date() },
    });
    console.log(`   - Đã soft-delete tài liệu C.`);

    // Lấy lại liên kết của B để xác minh link B -> C đã bị "broken"
    bLinks = await documentsService.getDocumentLinks(docB.id, user.id);
    const linkBToCStatus = bLinks.outgoing[0].status;
    console.log(`   - Trạng thái link B -> C sau khi xóa C: ${linkBToCStatus}`);

    if (linkBToCStatus === 'broken') {
      console.log('✅ [PASS] Trạng thái liên kết tự động chuyển thành broken khi tệp đích bị soft-deleted.');
    } else {
      console.log('❌ [FAIL] Trạng thái liên kết không đổi thành broken.');
      throw new Error('AC-4 Fail');
    }

  } finally {
    // 5. Dọn dẹp dữ liệu kiểm thử
    console.log('\n5. Dọn dẹp dữ liệu kiểm thử...');
    if (link1Id) await prisma.documentLink.delete({ where: { id: link1Id } }).catch(() => {});
    if (link2Id) await prisma.documentLink.delete({ where: { id: link2Id } }).catch(() => {});
    if (docAId) await prisma.document.delete({ where: { id: docAId } }).catch(() => {});
    if (docBId) await prisma.document.delete({ where: { id: docBId } }).catch(() => {});
    if (docCId) await prisma.document.delete({ where: { id: docCId } }).catch(() => {});
    if (projectA1Id) await prisma.project.delete({ where: { id: projectA1Id } }).catch(() => {});
    if (projectB1Id) await prisma.project.delete({ where: { id: projectB1Id } }).catch(() => {});
    await prisma.workspaceMember.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.workspace.delete({ where: { id: workspaceA.id } }).catch(() => {});
    await prisma.workspace.delete({ where: { id: workspaceB.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    console.log('🧹 Đã dọn dẹp sạch sẽ DB.');
  }

  console.log('\n🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===');
}

runTest()
  .catch((e) => {
    console.error('❌ Lỗi chạy Smoke Test:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
