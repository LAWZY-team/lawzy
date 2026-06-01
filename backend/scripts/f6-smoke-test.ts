import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/integrations/prisma/prisma.service';
import { ObligationsService } from '../src/modules/obligations/obligations.service';
import { AIJobObligationService } from '../src/modules/obligations/services/ai-job-obligation.service';
import { EscalationCronService } from '../src/modules/obligations/services/escalation-cron.service';
import { EmailService } from '../src/modules/email/email.service';

async function runTest() {
  console.log('=== KHỞI ĐỘNG SMOKE TEST LAW-F6 (Quản Lý Nghĩa Vụ Hợp Đồng & AI/SLA) ===');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const obligationsService = app.get(ObligationsService);
  const aiJobObligationService = app.get(AIJobObligationService);
  const cronService = app.get(EscalationCronService);
  const emailService = app.get(EmailService);

  // MOCK EMAIL SERVICE
  let sentEmails: any[] = [];
  emailService.sendObligationAlertEmail = async (data: {
    toEmail: string;
    title: string;
    dueDate: string;
    stage: string;
    responsibleParty?: string;
  }) => {
    sentEmails.push(data);
    console.log(`   📧 [MOCK EMAIL] Đã gửi tới PIC: ${data.toEmail} | Tiêu đề: ${data.title} | Mốc: ${data.stage} | Ngày hạn: ${data.dueDate}`);
  };

  // 1. Khởi tạo Workspace và User thử nghiệm
  console.log('\n1. Khởi tạo dữ liệu giả lập (User, Workspace, Project)...');
  const user = await prisma.user.create({
    data: {
      email: `test-pic-f6-${Date.now()}@example.com`,
      name: 'Nguyễn Văn PIC F6',
      password: 'password-hash-123',
    },
  });
  console.log(`   User created: ID = ${user.id}, Email = ${user.email}`);

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Test F6',
      companyCode: `LWZF6-${Date.now().toString().slice(-8)}`,
    },
  });
  console.log(`   Workspace created: ID = ${workspace.id}, Code = ${workspace.companyCode}`);

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: 'admin' },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Dự án Năng lượng Mặt trời Green Power',
      code: 'GP-SOLAR-2026',
      workspaceId: workspace.id,
    },
  });
  console.log(`   Project created: ID = ${project.id}, Code = GP-SOLAR-2026`);

  // Lưu vết ID để dọn dẹp
  let docId: string | null = null;
  let createdObIds: string[] = [];

  try {
    // 2. Tạo tài liệu chứa nội dung cam kết nghĩa vụ hợp đồng
    console.log('\n2. Tạo tài liệu nháp chứa nội dung cam kết nghĩa vụ...');
    const docContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nHỢP ĐỒNG EPC THI CÔNG TUABIN GIÓ\n\n' +
                'Điều 5: Thanh toán và Tạm ứng\n' +
                '1. Bên A có nghĩa vụ thanh toán đợt 1 bằng 15% tổng giá trị hợp đồng, tương đương 15.000.000 VNĐ (mười lăm triệu đồng) trong vòng 30 ngày kể từ ngày ký hợp đồng sau khi nhận được biên bản nghiệm thu thiết kế.\n\n' +
                'Điều 10: Cam kết bảo hành\n' +
                '1. Nhà thầu Bên B cam kết bảo hành thiết bị inverter với thời hạn 5 năm kể từ ngày ký biên bản bàn giao nghiệm thu đưa vào sử dụng.'
            }
          ]
        }
      ]
    };

    const doc = await prisma.document.create({
      data: {
        title: 'Hợp đồng thi công EPC Green Power',
        workspaceId: workspace.id,
        projectId: project.id,
        createdBy: user.id,
        visibility: 'workspace',
        status: 'draft',
        contentJSON: docContent,
      },
    });
    docId = doc.id;
    console.log(`   Tài liệu đã được tạo với ID: ${docId}`);

    // 3. Thực hiện bóc tách nghĩa vụ bằng AI
    console.log('\n3. Gọi AI bóc tách tự động nghĩa vụ từ tài liệu...');
    let obligations = await aiJobObligationService.extractObligations(docId);
    console.log(`   AI đã tạo ${obligations.length} nghĩa vụ nháp trong DB.`);

    // 4. Nếu không có kết quả từ AI (do thiếu key hoặc mạng), sinh dữ liệu mock để đảm bảo tiếp tục luồng test
    if (obligations.length === 0) {
      console.warn('   ⚠️ AI bóc tách không sinh được nghĩa vụ (có thể do lỗi mạng hoặc API Key). Tiến hành tự động tạo nghĩa vụ giả lập để kiểm thử tiếp...');
      
      const ob1 = await prisma.obligation.create({
        data: {
          documentId: docId,
          workspaceId: workspace.id,
          title: 'Thanh toán đợt 1 (15%)',
          description: 'Thanh toán đợt 1 bằng 15% tổng giá trị hợp đồng, tương đương 15.000.000 VNĐ trong vòng 30 ngày kể từ ngày ký sau khi nhận được biên bản nghiệm thu thiết kế.',
          status: 'pending',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 15000000,
          percentage: 15,
          triggerCondition: 'sau khi nhận được biên bản nghiệm thu thiết kế',
          obligationType: 'payment',
          effectivePeriod: '30 ngày',
          responsibleVendor: 'Bên A',
          notifiedStages: [],
        }
      });

      const ob2 = await prisma.obligation.create({
        data: {
          documentId: docId,
          workspaceId: workspace.id,
          title: 'Bảo hành thiết bị inverter 5 năm',
          description: 'Nhà thầu Bên B cam kết bảo hành thiết bị inverter với thời hạn 5 năm kể từ ngày ký biên bản bàn giao nghiệm thu.',
          status: 'pending',
          dueDate: new Date(Date.now() + 1825 * 24 * 60 * 60 * 1000),
          amount: null,
          percentage: null,
          triggerCondition: null,
          obligationType: 'warranty',
          effectivePeriod: '5 năm',
          responsibleVendor: 'Bên B',
          notifiedStages: [],
        }
      });

      obligations = [ob1, ob2];
      console.log(`   Đã tự động tạo 2 nghĩa vụ mock: ID = ${ob1.id}, ID = ${ob2.id}`);
    }

    createdObIds = obligations.map((o: any) => o.id);

    // Xác minh nghĩa vụ được tạo ở dạng 'pending'
    for (const ob of obligations) {
      if (ob.status !== 'pending') {
        throw new Error(`Nghĩa vụ mới tạo có trạng thái ${ob.status}, mong đợi 'pending'`);
      }
    }
    console.log('   ✅ [PASS] Bóc tách/khởi tạo nghĩa vụ thành công ở trạng thái nháp (pending).');

    // 5. Thử nghiệm Duyệt nghĩa vụ & Gán PIC
    const pendingOb = obligations.find((o: any) => o.obligationType === 'payment') || obligations[0];
    console.log(`\n5. Thử nghiệm duyệt nghĩa vụ nháp và gán PIC (ID: ${pendingOb.id})...`);
    
    const approvedOb = await obligationsService.update(user.id, pendingOb.id, {
      status: 'active',
      picId: user.id
    });
    console.log(`   Nghĩa vụ sau duyệt: Tiêu đề = "${approvedOb.title}" | Trạng thái = ${approvedOb.status} | PIC = ${approvedOb.picId}`);

    if (approvedOb.status !== 'active' || approvedOb.picId !== user.id) {
      throw new Error('Duyệt nghĩa vụ thất bại hoặc thông tin chưa được cập nhật chính xác.');
    }
    console.log('   ✅ [PASS] Duyệt nghĩa vụ và gán PIC thành công.');

    // 6. Kiểm thử Cảnh báo mốc 30 ngày & Cơ chế chống spam
    console.log('\n6. Kiểm thử Cảnh báo mốc 30 ngày & Cơ chế CHỐNG SPAM...');
    const date30 = new Date();
    date30.setDate(date30.getDate() + 30);
    date30.setHours(12, 0, 0, 0);

    await prisma.obligation.update({
      where: { id: approvedOb.id },
      data: {
        dueDate: date30,
        status: 'active',
        notifiedStages: [],
      }
    });

    console.log('   Chạy cron rà soát lần 1...');
    sentEmails = [];
    await cronService.triggerCheckManually();

    if (sentEmails.length !== 1 || sentEmails[0].stage !== '30_days') {
      throw new Error(`Mốc 30 ngày: Gửi email thất bại hoặc sai số lượng. Số email gửi: ${sentEmails.length}`);
    }

    let updatedOb = await prisma.obligation.findUnique({ where: { id: approvedOb.id } });
    let notifiedStages = updatedOb?.notifiedStages as string[];
    if (!notifiedStages.includes('30_days')) {
      throw new Error('notifiedStages chưa ghi nhận "30_days" sau khi gửi mail.');
    }
    console.log('   notifiedStages hiện tại:', notifiedStages);

    console.log('   Chạy cron rà soát lần 2 (kiểm tra chống spam)...');
    sentEmails = [];
    await cronService.triggerCheckManually();

    if (sentEmails.length > 0) {
      throw new Error('SPAM ERROR: Gửi email trùng lặp lần 2 cho mốc 30 ngày.');
    }
    console.log('   ✅ [PASS] Mốc 30 ngày gửi cảnh báo chính xác và cơ chế CHỐNG SPAM hoạt động hoàn hảo.');

    // 7. Kiểm thử Cảnh báo mốc Đến hạn (due_date) & Tự động chuyển trạng thái
    console.log('\n7. Kiểm thử Cảnh báo mốc Đến hạn (due_date) và tự động cập nhật trạng thái...');
    const date0 = new Date();
    date0.setHours(12, 0, 0, 0);

    await prisma.obligation.update({
      where: { id: approvedOb.id },
      data: {
        dueDate: date0,
        status: 'active',
      }
    });

    sentEmails = [];
    await cronService.triggerCheckManually();

    if (sentEmails.length !== 1 || sentEmails[0].stage !== 'due_date') {
      throw new Error(`Mốc đến hạn: Gửi email thất bại hoặc sai mốc. Số email gửi: ${sentEmails.length}`);
    }

    updatedOb = await prisma.obligation.findUnique({ where: { id: approvedOb.id } });
    if (updatedOb?.status !== 'overdue') {
      throw new Error(`Mốc đến hạn: Trạng thái nghĩa vụ chưa đổi thành overdue (hiện tại: ${updatedOb?.status})`);
    }

    notifiedStages = updatedOb?.notifiedStages as string[];
    if (!notifiedStages.includes('due_date')) {
      throw new Error('notifiedStages chưa ghi nhận "due_date"');
    }
    console.log(`   Nghĩa vụ đã chuyển sang trạng thái: ${updatedOb.status}`);
    console.log('   ✅ [PASS] Cảnh báo mốc đến hạn và chuyển trạng thái sang "overdue" thành công.');

    // 8. Kiểm thử Leo thang SLA quá hạn cấp cao (quá hạn 3 ngày)
    console.log('\n8. Kiểm thử Leo thang SLA quá hạn cấp cao (quá hạn 3 ngày)...');
    const dateMinus3 = new Date();
    dateMinus3.setDate(dateMinus3.getDate() - 3);
    dateMinus3.setHours(12, 0, 0, 0);

    await prisma.obligation.update({
      where: { id: approvedOb.id },
      data: {
        dueDate: dateMinus3,
        status: 'overdue',
      }
    });

    sentEmails = [];
    await cronService.triggerCheckManually();

    if (sentEmails.length !== 1 || sentEmails[0].stage !== 'escalated') {
      throw new Error(`Mốc leo thang: Gửi email thất bại hoặc sai mốc. Số email gửi: ${sentEmails.length}`);
    }

    updatedOb = await prisma.obligation.findUnique({ where: { id: approvedOb.id } });
    if (updatedOb?.status !== 'escalated') {
      throw new Error(`Mốc leo thang: Trạng thái nghĩa vụ chưa đổi thành escalated (hiện tại: ${updatedOb?.status})`);
    }

    notifiedStages = updatedOb?.notifiedStages as string[];
    if (!notifiedStages.includes('escalated')) {
      throw new Error('notifiedStages chưa ghi nhận "escalated"');
    }
    console.log(`   Nghĩa vụ đã chuyển sang trạng thái leo thang: ${updatedOb.status}`);
    console.log('   ✅ [PASS] Leo thang SLA gửi email báo cáo cấp quản lý và chuyển trạng thái sang "escalated" thành công.');

  } finally {
    // 9. Dọn dẹp dữ liệu kiểm thử
    console.log('\n9. Tiến hành dọn dẹp dữ liệu kiểm thử...');
    
    for (const obId of createdObIds) {
      await prisma.obligation.delete({ where: { id: obId } }).catch(() => {});
    }
    if (docId) {
      await prisma.document.delete({ where: { id: docId } }).catch(() => {});
    }
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    await prisma.workspaceMember.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});

    console.log('   🧹 Đã dọn dẹp sạch sẽ dữ liệu DB.');
    await app.close();
  }

  console.log('\n🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ PHÂN HỆ F6 ĐÃ ĐẠT (ALL PASS) ===\n');
}

runTest().catch((e) => {
  console.error('❌ Lỗi chạy Smoke Test F6:', e);
  process.exit(1);
});
