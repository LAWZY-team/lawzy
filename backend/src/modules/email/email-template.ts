/**
 * Template email dùng chung theo phong cách quên mật khẩu.
 * Branding: Lawzy, màu #f54900, nền #faf9f5
 */
export function buildLawzyEmailHtml(options: {
  title: string
  greeting?: string
  body: string
  button?: { text: string; url: string }
  footerNote?: string
}): string {
  const { title, greeting = 'Xin chào', body, button, footerNote } = options

  const buttonHtml = button
    ? `
    <div style="text-align: center;">
      <a href="${button.url}" style="display: inline-block; padding: 12px 30px; background-color: #f54900; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">${button.text}</a>
    </div>`
    : ''

  return `
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
      ${footerNote ? `<p style="color: #6b7280; font-size: 13px;">${footerNote}</p>` : ''}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Lawzy. Nền tảng quản lý hợp đồng pháp lý.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
