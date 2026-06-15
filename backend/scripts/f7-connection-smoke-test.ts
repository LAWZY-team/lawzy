import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/integrations/prisma/prisma.service';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

async function runTest() {
  console.log('=== KHỞI ĐỘNG SMOKE TEST F7 CONNECTION API ===');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const documentsService = app.get(DocumentsService);
  const projectsService = app.get(ProjectsService);

  // 1. Tạo dữ liệu giả lập
  console.log('1. Khởi tạo Workspace và User thử nghiệm...');
  const user = await prisma.user.create({
    data: {
      email: `test-f7-conn-${Date.now()}@example.com`,
      name: 'F7 Connection Test User',
      password: 'password-hash-123',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Test F7 Connection',
      companyCode: `LWZCON-${Date.now().toString().slice(-8)}`,
    },
  });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: 'admin' },
  });

  // Tạo một dự án
  console.log('2. Tạo dự án mới...');
  const project = await projectsService.create(user.id, {
    name: 'Dự án Cảng hàng không',
    code: 'GP-AIRPORT-2026',
    workspaceId: workspace.id,
  });
  const projectId = String(project.id);
  console.log(`Dự án đã tạo: ${project.name} (${project.cm_number})`);

  let doc1Id: string | null = null;
  let doc2Id: string | null = null;

  try {
    // 3. Tạo tài liệu mới đã gán vào dự án
    console.log('\n3. Tạo tài liệu mới và gán projectId...');
    const doc1 = await documentsService.create({
      title: 'Hợp đồng EPC Cảng Hàng Không',
      workspaceId: workspace.id,
      createdBy: user.id,
      status: 'draft',
      projectId,
    });
    doc1Id = doc1.id;
    console.log(`Tài liệu 1 được tạo với ID: ${doc1Id}, projectId: ${doc1.projectId}`);
    if (doc1.projectId !== projectId) {
      throw new Error('Gán projectId khi tạo tài liệu thất bại.');
    }
    console.log('✅ [PASS] Gán projectId khi tạo tài liệu thành công.');

    // 4. Tạo tài liệu thứ 2 không có dự án
    const doc2 = await documentsService.create({
      title: 'Phụ lục số 01 - Điều chỉnh tiến độ',
      workspaceId: workspace.id,
      createdBy: user.id,
      status: 'draft',
    });
    doc2Id = doc2.id;
    console.log(`Tài liệu 2 được tạo với ID: ${doc2Id}, parentId: ${doc2.parentId}`);

    // 5. Cập nhật tài liệu 2: gán projectId và parentId (doc1)
    console.log('\n5. Cập nhật tài liệu 2 để gán projectId và parentId...');
    const updatedDoc2 = await documentsService.update(
      doc2Id,
      {
        projectId,
        parentId: doc1Id,
      },
      user.id,
    );
    console.log(`Tài liệu 2 sau cập nhật: projectId: ${updatedDoc2.projectId}, parentId: ${updatedDoc2.parentId}`);
    if (updatedDoc2.projectId !== projectId || updatedDoc2.parentId !== doc1Id) {
      throw new Error('Cập nhật projectId và parentId thất bại.');
    }
    console.log('✅ [PASS] Cập nhật projectId và parentId thành công.');

    // 6. Kiểm tra chặn liên kết vòng lặp (Circular Dependency)
    console.log('\n6. Kiểm tra chặn liên kết vòng lặp: Cố gắng đặt doc2 làm cha của doc1...');
    try {
      await documentsService.update(
        doc1Id,
        {
          parentId: doc2Id,
        },
        user.id,
      );
      throw new Error('Lỗi: Đáng lẽ hệ thống phải chặn liên kết vòng lặp!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log('✅ [PASS] Hệ thống đã chặn thành công liên kết vòng lặp và ném ConflictException.');
      } else {
        throw err;
      }
    }

  } finally {
    // Dọn dẹp dữ liệu
    console.log('\n7. Dọn dẹp dữ liệu kiểm thử...');
    if (doc2Id) await prisma.document.delete({ where: { id: doc2Id } }).catch(() => {});
    if (doc1Id) await prisma.document.delete({ where: { id: doc1Id } }).catch(() => {});
    await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
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
