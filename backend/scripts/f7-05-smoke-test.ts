import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ConsistencyValidatorService } from '../src/modules/projects/consistency-validator.service';
import { PrismaService } from '../src/integrations/prisma/prisma.service';

async function runTest() {
  console.log('=== KHỞI ĐỘNG SMOKE TEST LAW-F7-05 (Change Propagation & Consistency) ===');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const validatorService = app.get(ConsistencyValidatorService);

  // 1. Tạo dữ liệu giả lập
  console.log('1. Khởi tạo Workspace, Dự án và Users...');
  const userA = await prisma.user.create({
    data: {
      email: `test-f7-05-a-${Date.now()}@example.com`,
      name: 'User A (F7-05)',
      password: 'password-hash-123',
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: `test-f7-05-b-${Date.now()}@example.com`,
      name: 'User B (F7-05)',
      password: 'password-hash-123',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Test F7-05',
      companyCode: `LWZF75-${Date.now().toString().slice(-8)}`,
    },
  });

  // Đăng ký thành viên cho cả hai
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: userA.id, role: 'admin' },
  });
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: userB.id, role: 'member' },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Dự án Điện mặt trời Bình Phước',
      code: 'BP-SOLAR-2026',
      workspaceId: workspace.id,
    },
  });

  // Khởi tạo các ID để dọn dẹp
  let doc1Id: string | null = null;
  let doc2Id: string | null = null;
  let doc3Id: string | null = null;

  try {
    // 2. Tạo tài liệu 1 (Hợp đồng chính) và tài liệu 2 (Biên bản nghiệm thu) có thông số công suất bị lệch
    console.log('\n2. Tạo các tài liệu có thông số công suất lệch nhau (50MWp vs 45MWp)...');
    
    const doc1 = await prisma.document.create({
      data: {
        title: 'Hợp đồng EPC dự án Bình Phước',
        workspaceId: workspace.id,
        projectId: project.id,
        createdBy: userA.id,
        visibility: 'workspace',
        status: 'completed',
        metadata: {
          contractNumber: 'EPC-BP-01',
          projectName: 'Dự án Điện mặt trời Bình Phước',
          capacity: '50MWp',
          location: 'Huyện Lộc Ninh, Tỉnh Bình Phước',
          developerName: 'Công ty Cổ phần Năng lượng Xanh Lộc Ninh',
        },
      },
    });
    doc1Id = doc1.id;

    const doc2 = await prisma.document.create({
      data: {
        title: 'Biên bản nghiệm thu lắp đặt tuabin',
        workspaceId: workspace.id,
        projectId: project.id,
        createdBy: userA.id,
        visibility: 'workspace',
        status: 'completed',
        metadata: {
          contractNumber: 'REC-BP-01',
          projectName: 'Dự án Điện mặt trời Bình Phước',
          capacity: '45MWp', // Lệch công suất (50MWp vs 45MWp)
          location: 'Huyện Lộc Ninh, Tỉnh Bình Phước',
          developerName: 'Công ty Cổ phần Năng lượng Xanh Lộc Ninh',
        },
      },
    });
    doc2Id = doc2.id;

    // 3. Chạy kiểm tra nhất quán lần đầu (AC-1)
    console.log('\n3. Gọi validatorService.validateConsistency()...');
    const initialAlerts = await validatorService.validateConsistency(userA.id, project.id);
    console.log('Các cảnh báo lệch thông số thu được:', JSON.stringify(initialAlerts, null, 2));

    if (initialAlerts.length === 0) {
      throw new Error('AI không phát hiện ra sai lệch công suất.');
    }

    const capacityAlert = initialAlerts.find((a) => a.fieldKey === 'capacity');
    if (!capacityAlert || capacityAlert.status !== 'unresolved') {
      throw new Error('Không tạo cảnh báo lệch công suất hoặc trạng thái không phải unresolved.');
    }
    console.log('✅ [PASS] Phát hiện chính xác các sai lệch giá trị công suất và lưu vào bảng MismatchAlert.');

    // 4. Kiểm thử RBAC lọc cảnh báo (AC-3)
    console.log('\n4. Kiểm thử phân quyền lọc cảnh báo theo RBAC (AC-3)...');
    
    // Tạo tài liệu 3 (Tài liệu mật của User B, User A không có quyền xem)
    const doc3 = await prisma.document.create({
      data: {
        title: 'Báo cáo chi phí phát sinh nội bộ (Secret)',
        workspaceId: workspace.id,
        projectId: project.id,
        createdBy: userB.id,
        visibility: 'private', // User A không thể đọc tài liệu này
        status: 'completed',
        metadata: {
          contractNumber: 'SEC-BP-01',
          projectName: 'Dự án Điện mặt trời Bình Phước',
          capacity: '99MWp', // Rất lệch
          developerName: 'Tên khác hoàn toàn',
        },
      },
    });
    doc3Id = doc3.id;

    // Gọi validate làm phát sinh thêm alert cho Doc 3
    await validatorService.validateConsistency(userB.id, project.id);

    // Truy vấn alerts bằng User A
    const userAAlerts = await validatorService.getMismatchAlerts(userA.id, project.id);
    console.log('Cảnh báo hiển thị với User A:', JSON.stringify(userAAlerts, null, 2));
    
    // User A không được phép thấy alert của Doc 3
    const hasDoc3AlertForUserA = userAAlerts.some((a) => a.documentId === doc3Id);
    if (hasDoc3AlertForUserA) {
      throw new Error('User A vẫn nhìn thấy cảnh báo thuộc tài liệu private của User B!');
    }

    // Truy vấn alerts bằng User B
    const userBAlerts = await validatorService.getMismatchAlerts(userB.id, project.id);
    console.log('Cảnh báo hiển thị với User B:', JSON.stringify(userBAlerts, null, 2));
    const hasDoc3AlertForUserB = userBAlerts.some((a) => a.documentId === doc3Id);
    if (!hasDoc3AlertForUserB) {
      throw new Error('User B không nhìn thấy cảnh báo của chính tài liệu private của mình.');
    }
    console.log('✅ [PASS] Phân quyền hiển thị cảnh báo (RBAC) hoạt động chính xác.');

    // 5. Kiểm thử tự động giải phóng cảnh báo khi thông số đồng nhất (AC-2)
    console.log('\n5. Đồng nhất lại thông số và chạy lại kiểm tra (AC-2)...');
    
    // Cập nhật Biên bản nghiệm thu (Doc 2) về 50MWp cho đồng nhất với Hợp đồng chính (Doc 1)
    const updatedMetadata = {
      ...(doc2.metadata as any),
      capacity: '50MWp', // Đồng nhất thông số
    };
    await prisma.document.update({
      where: { id: doc2Id },
      data: { metadata: updatedMetadata },
    });
    console.log(`Đã cập nhật công suất của Biên bản nghiệm thu về 50MWp.`);

    // Chạy lại kiểm tra bằng User B (vì User B có quyền xem cả Doc 3 nữa)
    const finalAlerts = await validatorService.validateConsistency(userB.id, project.id);
    console.log('Cảnh báo sau khi đồng nhất thông số:', JSON.stringify(finalAlerts, null, 2));

    // Lấy trạng thái alert cũ của Doc 2 trong DB
    const oldAlertRecord = await prisma.mismatchAlert.findFirst({
      where: {
        documentId: doc2Id,
        fieldKey: 'capacity',
      },
    });

    console.log(`Trạng thái của alert cũ sau khi đồng nhất: ${oldAlertRecord?.status}`);
    if (oldAlertRecord?.status !== 'resolved') {
      throw new Error('Alert chưa tự động chuyển trạng thái thành resolved sau khi đồng nhất.');
    }

    console.log('✅ [PASS] Chuyển trạng thái alert thành resolved thành công sau khi đồng nhất thông số.');

  } finally {
    // 6. Dọn dẹp dữ liệu
    console.log('\n6. Dọn dẹp dữ liệu kiểm thử...');
    if (doc1Id || doc2Id || doc3Id) {
      const docIds = [doc1Id, doc2Id, doc3Id].filter((id): id is string => id !== null);
      await prisma.mismatchAlert.deleteMany({
        where: { documentId: { in: docIds } },
      }).catch(() => {});
    }

    if (doc3Id) await prisma.document.delete({ where: { id: doc3Id } }).catch(() => {});
    if (doc2Id) await prisma.document.delete({ where: { id: doc2Id } }).catch(() => {});
    if (doc1Id) await prisma.document.delete({ where: { id: doc1Id } }).catch(() => {});
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    await prisma.workspaceMember.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } }).catch(() => {});
    await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } }).catch(() => {});

    console.log('🧹 Đã dọn dẹp sạch sẽ DB.');
    await app.close();
  }

  console.log('\n🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===');
}

runTest().catch((e) => {
  console.error('❌ Lỗi chạy Smoke Test:', e);
  process.exit(1);
});
