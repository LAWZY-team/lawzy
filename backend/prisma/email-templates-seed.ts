/**
 * Nội dung mẫu email mặc định – seed vào DB thay vì hardcode trong EmailService.
 * Dùng {{var}} để thay thế biến khi gửi.
 */
const LAWZY_HTML_WRAPPER = (title: string, greeting: string, body: string, buttonHtml: string, footerNote = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000000; background-color: #faf9f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background-color: #ffffff; padding: 25px 20px; text-align: center; border-bottom: 2px solid #faf9f5; }
    .content { padding: 30px; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="font-size: 20px; color: #333; margin: 0;">${title}</h1>
    </div>
    <div class="content">
      <p>${greeting},</p>
      ${body}
      ${buttonHtml}
      ${footerNote}
    </div>
    <div class="footer">
      <p>&copy; 2025 Lawzy. Nền tảng quản lý hợp đồng pháp lý.</p>
    </div>
  </div>
</body>
</html>
`.trim();

const BTN = (text: string, urlVar: string) =>
  `<div style="text-align: center;"><a href="{{${urlVar}}}" style="display: inline-block; padding: 12px 30px; background-color: #f54900; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">${text}</a></div>`;

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    code: 'workspace_invite',
    name: 'Mời thành viên vào workspace',
    description: 'Gửi khi Admin/Editor thêm member vào workspace',
    subject: '[Lawzy] Bạn được mời vào workspace "{{workspaceName}}"',
    bodyHtml: LAWZY_HTML_WRAPPER(
      'Bạn đã được mời vào workspace',
      'Xin chào <strong>{{toName}}</strong>',
      `
        <p><strong>{{inviterName}}</strong> đã mời bạn tham gia workspace <strong>{{workspaceName}}</strong> trên Lawzy.</p>
        <p>Vui lòng truy cập dashboard để bắt đầu làm việc cùng team.</p>
      `,
      BTN('Mở Dashboard', 'dashboardUrl'),
      '',
    ),
    variables: ['toName', 'workspaceName', 'inviterName', 'dashboardUrl'],
  },
  {
    code: 'member_removed',
    name: 'Xóa thành viên khỏi workspace',
    description: 'Gửi khi Admin/Editor xóa member khỏi workspace',
    subject: '[Lawzy] Đã xóa khỏi workspace "{{workspaceName}}"',
    bodyHtml: LAWZY_HTML_WRAPPER(
      'Bạn đã bị xóa khỏi workspace',
      'Xin chào <strong>{{toName}}</strong>',
      `
        <p>Bạn đã được <strong>{{removerName}}</strong> xóa khỏi workspace <strong>{{workspaceName}}</strong>.</p>
        <p>Bạn có thể truy cập các workspace khác của mình qua dashboard.</p>
      `,
      BTN('Mở Dashboard', 'dashboardUrl'),
      '',
    ),
    variables: ['toName', 'workspaceName', 'removerName', 'dashboardUrl'],
  },
  {
    code: 'workspace_created',
    name: 'Tạo workspace mới',
    description: 'Gửi khi user tạo workspace mới',
    subject: '[Lawzy] Workspace "{{workspaceName}}" đã sẵn sàng',
    bodyHtml: LAWZY_HTML_WRAPPER(
      'Workspace đã được tạo',
      'Xin chào <strong>{{toName}}</strong>',
      `
        <p>Workspace <strong>{{workspaceName}}</strong> đã được tạo thành công.</p>
        <p>Bạn có thể bắt đầu thêm thành viên, tạo hợp đồng và quản lý tài liệu ngay bây giờ.</p>
      `,
      BTN('Mở Workspace', 'dashboardUrl'),
      '',
    ),
    variables: ['toName', 'workspaceName', 'dashboardUrl'],
  },
  {
    code: 'welcome_back',
    name: 'Đăng nhập trở lại',
    description: 'Gửi khi user đăng nhập (cần throttle, vd: 1 email/7 ngày)',
    subject: '[Lawzy] Chào mừng trở lại',
    bodyHtml: LAWZY_HTML_WRAPPER(
      'Chào mừng trở lại Lawzy',
      'Xin chào <strong>{{toName}}</strong>',
      `
        <p>Chúng tôi nhận thấy bạn vừa đăng nhập vào Lawzy.</p>
        <p>Nếu không phải bạn thực hiện đăng nhập này, vui lòng đổi mật khẩu ngay qua trang cài đặt tài khoản.</p>
      `,
      BTN('Mở Dashboard', 'dashboardUrl'),
      '',
    ),
    variables: ['toName', 'dashboardUrl'],
  },
  {
    code: 'payment_success',
    name: 'Thanh toán thành công',
    description: 'Gửi khi payment webhook status = paid',
    subject: '[Lawzy] Thanh toán thành công - Gói {{planName}}',
    bodyHtml: LAWZY_HTML_WRAPPER(
      'Thanh toán thành công',
      'Xin chào <strong>{{toName}}</strong>',
      `
        <p>Cảm ơn bạn đã thanh toán cho gói <strong>{{planName}}</strong>.</p>
        <p>Số tiền: <strong>{{amount}} VND</strong></p>
        <p>Workspace <strong>{{workspaceName}}</strong> đã được nâng cấp. Bạn có thể bắt đầu sử dụng ngay.</p>
      `,
      BTN('Mở Dashboard', 'dashboardUrl'),
      '',
    ),
    variables: ['toName', 'planName', 'amount', 'workspaceName', 'dashboardUrl'],
  },
  {
    code: 'plan_upgrade',
    name: 'Nâng cấp plan',
    description: 'Gửi khi workspace nâng cấp plan',
    subject: '[Lawzy] Nâng cấp plan - {{newPlanName}}',
    bodyHtml: LAWZY_HTML_WRAPPER(
      'Nâng cấp plan thành công',
      'Xin chào <strong>{{toName}}</strong>',
      `
        <p>Workspace <strong>{{workspaceName}}</strong> đã được nâng cấp lên gói <strong>{{newPlanName}}</strong>.</p>
        <p>Bạn có thể sử dụng các tính năng mới ngay bây giờ.</p>
      `,
      BTN('Mở Dashboard', 'dashboardUrl'),
      '',
    ),
    variables: ['toName', 'workspaceName', 'newPlanName', 'dashboardUrl'],
  },
] as const;
