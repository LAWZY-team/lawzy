"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/components/landing/language-provider";
import { ArrowLeft } from "lucide-react";
import legalContent from "@/lib/i18n/legal.json";

export default function PrivacyPolicyPage() {
  const { locale } = useI18n();
  const t = (key: string) => (legalContent as Record<string, Record<string, string>>)[locale]?.[key] ?? key;

  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
            {t("back_home")}
          </Link>
          <Image src="/lawzy-logo.png" alt="Lawzy" width={100} height={40} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{t("privacy_title")}</h1>
        <article
          className="lawzy-terms prose prose-lg max-w-none text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{
            __html: locale === "vi" ? privacyContentVi : privacyContentEn,
          }}
        />
      </main>

      <footer className="border-t mt-12 py-8">
        <div className="container mx-auto px-4 text-center">
          <Link href="/" className="text-primary hover:underline">
            {t("back_home")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

const privacyContentVi = `
<h1>CHƯƠNG 4. CHÍNH SÁCH BẢO MẬT DỮ LIỆU</h1>

<h2>Điều 17. Phạm vi thu thập dữ liệu</h2>
<p>Lawzy có thể thu thập các thông tin bao gồm thông tin tài khoản, dữ liệu cá nhân, tài liệu pháp lý do người dùng tải lên, thông tin giao dịch và dữ liệu sử dụng hệ thống nhằm mục đích cung cấp và cải thiện dịch vụ.</p>

<h2>Điều 18. Mục đích xử lý dữ liệu</h2>
<p>Dữ liệu được xử lý nhằm cung cấp chức năng của Nền tảng, hỗ trợ người dùng, nâng cao chất lượng dịch vụ, cải thiện hệ thống AI, đảm bảo an toàn thông tin và tuân thủ nghĩa vụ pháp lý theo quy định của pháp luật Việt Nam.</p>

<h2>Điều 19. Dữ liệu cá nhân và dữ liệu nhạy cảm</h2>
<p>Trường hợp người dùng tải lên dữ liệu cá nhân hoặc dữ liệu nhạy cảm theo quy định pháp luật, người dùng xác nhận đã có đầy đủ quyền và sự đồng ý hợp pháp để cung cấp dữ liệu đó.</p>
<p>Lawzy áp dụng các biện pháp kỹ thuật và tổ chức hợp lý nhằm bảo vệ dữ liệu cá nhân và an ninh mạng bao gồm nhưng không giới hạn ở Luật An ninh quốc gia năm 2004, Luật An ninh mạng năm 2018, Luật Bảo vệ dữ liệu cá nhân năm 2025, Nghị định số 356/2025/NĐ-CP quy định chi tiết một số điều và biện pháp thi hành Luật Bảo vệ dữ liệu cá nhân ngày 31 tháng 12 năm 2025 và các văn bản sửa đổi, bổ sung hoặc thay thế trong từng thời kỳ.</p>

<h2>Điều 20. Quyền của người dùng đối với dữ liệu</h2>
<p>Người dùng có quyền yêu cầu truy cập, chỉnh sửa, cập nhật hoặc xóa dữ liệu cá nhân của mình trong phạm vi pháp luật cho phép.</p>
<p>Yêu cầu có thể được thực hiện thông qua kênh hỗ trợ chính thức của Lawzy.</p>

<h2>Điều 21. Thời gian lưu trữ và bảo mật</h2>
<p>Dữ liệu được lưu trữ trong thời gian cần thiết để thực hiện mục đích thu thập hoặc theo yêu cầu của pháp luật.</p>
<p>Lawzy triển khai các biện pháp bảo mật hợp lý để phòng ngừa truy cập trái phép, mất mát hoặc lạm dụng dữ liệu.</p>
`;

const privacyContentEn = `
<h1>CHAPTER 4. DATA PRIVACY POLICY</h1>

<h2>Article 17. Scope of data collection</h2>
<p>Lawzy may collect information including account information, personal data, legal documents uploaded by users, transaction information, and system usage data for the purpose of providing and improving services.</p>

<h2>Article 18. Purpose of data processing</h2>
<p>Data is processed to provide Platform functionality, support users, improve service quality, enhance the AI system, ensure information security, and comply with legal obligations under Vietnamese law.</p>

<h2>Article 19. Personal data and sensitive data</h2>
<p>Where users upload personal data or sensitive data as defined by law, users confirm that they have full authority and lawful consent to provide such data.</p>
<p>Lawzy implements reasonable technical and organizational measures to protect personal data and cybersecurity, including but not limited to the National Security Law 2004, Cybersecurity Law 2018, Personal Data Protection Law 2025, Decree No. 356/2025/ND-CP detailing certain articles and implementation measures of the Personal Data Protection Law dated December 31, 2025, and any amendments, supplements, or replacements.</p>

<h2>Article 20. User rights regarding data</h2>
<p>Users have the right to request access, correction, update, or deletion of their personal data within the scope permitted by law.</p>
<p>Requests may be submitted through Lawzy's official support channel.</p>

<h2>Article 21. Retention period and security</h2>
<p>Data is retained for as long as necessary to fulfill the collection purpose or as required by law.</p>
<p>Lawzy implements reasonable security measures to prevent unauthorized access, loss, or misuse of data.</p>
`;
