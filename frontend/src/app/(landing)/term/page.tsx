"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/components/landing/language-provider";
import { ArrowLeft } from "lucide-react";
import legalContent from "@/lib/i18n/legal.json";

export default function TermPage() {
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
        <h1 className="text-3xl font-bold mb-8">{t("term_title")}</h1>
        <article
          className="lawzy-terms prose prose-lg max-w-none text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{
            __html: locale === "vi" ? termContentVi : termContentEn,
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

const termContentVi = `
<h1>CHƯƠNG 1. ĐIỀU KHOẢN SỬ DỤNG</h1>
<h2>Điều 1. Chấp thuận điều khoản sử dụng</h2>
<p>Bằng việc truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ tính năng nào của nền tảng Lawzy ("Nền tảng"), người dùng xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi Điều khoản sử dụng này cùng các chính sách liên quan bao gồm chính sách miễn trừ trách nhiệm, chính sách sử dụng AI, chính sách bảo mật dữ liệu, điều khoản giới hạn trách nhiệm.</p>
<p>Việc nhấn chọn "Tôi đồng ý", "Đăng ký", "Tiếp tục" hoặc hành vi tương tự được xem là sự chấp thuận dưới hình thức điện tử có giá trị pháp lý theo quy định pháp luật Việt Nam.</p>
<p>Nếu người dùng không đồng ý với bất kỳ nội dung nào, người dùng phải ngừng sử dụng Nền tảng ngay lập tức.</p>

<h2>Điều 2. Tư cách pháp lý của Lawzy</h2>
<p>Lawzy là nền tảng công nghệ hỗ trợ pháp lý (legal-tech platform), không phải là tổ chức hành nghề luật sư, công ty luật, văn phòng luật sư hoặc tổ chức cung cấp dịch vụ tư vấn pháp lý theo Luật Luật sư.</p>
<p>Lawzy không cung cấp dịch vụ đại diện pháp lý, không tham gia tố tụng, không đưa ra ý kiến pháp lý chính thức và không thay mặt người dùng thực hiện bất kỳ giao dịch nào với bên thứ ba.</p>

<h2>Điều 3. Phạm vi dịch vụ</h2>
<p>Lawzy cung cấp các công cụ công nghệ nhằm hỗ trợ người dùng trong việc soạn thảo, chỉnh sửa, rà soát và chuẩn hóa tài liệu pháp lý, bao gồm hợp đồng và các văn bản thương mại khác.</p>
<p>Các nội dung do hệ thống tạo ra chỉ mang tính tham khảo và không được xem là tư vấn pháp lý chính thức.</p>

<h2>Điều 4. Tài khoản và thông tin người dùng</h2>
<p>Người dùng có trách nhiệm cung cấp thông tin chính xác, đầy đủ khi đăng ký tài khoản và duy trì tính cập nhật của thông tin đó trong suốt quá trình sử dụng.</p>
<p>Người dùng chịu trách nhiệm bảo mật thông tin đăng nhập và toàn bộ hoạt động phát sinh từ tài khoản của mình.</p>

<h2>Điều 5. Luật áp dụng và giải quyết tranh chấp</h2>
<p>Điều khoản sử dụng này được điều chỉnh và giải thích theo pháp luật Việt Nam.</p>
<p>Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết thông qua thương lượng thiện chí; nếu không đạt được thỏa thuận, tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền tại Việt Nam.</p>

<h1>CHƯƠNG 2. CHÍNH SÁCH MIỄN TRỪ TRÁCH NHIỆM</h1>
<h2>Điều 6. Tính chất tham khảo của nội dung</h2>
<p>Tất cả nội dung, tài liệu, mẫu hợp đồng, gợi ý và thông tin được cung cấp trên Nền tảng Lawzy chỉ mang tính chất tham khảo và hỗ trợ kỹ thuật.</p>
<p>Các nội dung này không cấu thành ý kiến pháp lý, tư vấn pháp lý chính thức hoặc sự đảm bảo về kết quả pháp lý.</p>

<h1>CHƯƠNG 3. CHÍNH SÁCH SỬ DỤNG AI</h1>
<h2>Điều 7. Cơ chế hoạt động của AI</h2>
<p>Nền tảng Lawzy sử dụng hệ thống trí tuệ nhân tạo (AI) để tạo nội dung dựa trên dữ liệu đầu vào do người dùng cung cấp.</p>
<p>AI hoạt động theo cơ chế xác suất, không phải chuyên gia pháp lý và không có khả năng thay thế luật sư.</p>

<h1>CHƯƠNG 4. ĐIỀU KHOẢN GIỚI HẠN TRÁCH NHIỆM</h1>
<h2>Điều 8. Không bảo đảm kết quả pháp lý cụ thể</h2>
<p>Lawzy không bảo đảm rằng việc sử dụng Nền tảng sẽ giúp người dùng đạt được kết quả pháp lý mong muốn.</p>
<p>Trong phạm vi pháp luật cho phép, Lawzy không chịu trách nhiệm đối với các thiệt hại gián tiếp, mất lợi nhuận hoặc thiệt hại phát sinh từ hành vi của bên thứ ba.</p>
`;

const termContentEn = `
<h1>CHAPTER 1. TERMS OF USE</h1>
<h2>Article 1. Acceptance of terms</h2>
<p>By accessing, registering an account, or using any feature of the Lawzy platform ("Platform"), users confirm that they have read, understood, and agree to be bound by these Terms of Use and related policies including the disclaimer policy, AI usage policy, data privacy policy, and liability limitation terms.</p>
<p>Clicking "I agree", "Register", "Continue" or similar actions constitutes electronic acceptance with legal validity under Vietnamese law.</p>
<p>If users do not agree with any content, they must stop using the Platform immediately.</p>

<h2>Article 2. Legal status of Lawzy</h2>
<p>Lawzy is a legal technology platform, not a law firm, law office, or organization providing legal advisory services under the Lawyers Law.</p>
<p>Lawzy does not provide legal representation, participate in litigation, issue official legal opinions, or act on behalf of users in any transaction with third parties.</p>

<h2>Article 3. Scope of services</h2>
<p>Lawzy provides technology tools to support users in drafting, editing, reviewing, and standardizing legal documents, including contracts and other commercial documents.</p>
<p>Content generated by the system is for reference only and shall not be considered official legal advice.</p>

<h2>Article 4. Account and user information</h2>
<p>Users are responsible for providing accurate and complete information when registering and maintaining the currency of such information throughout use.</p>
<p>Users are responsible for securing login credentials and all activities arising from their accounts.</p>

<h2>Article 5. Governing law and dispute resolution</h2>
<p>These Terms of Use are governed by and construed in accordance with the laws of Vietnam.</p>
<p>Any disputes shall first be resolved through good-faith negotiation; if no agreement is reached, disputes shall be resolved by a competent court in Vietnam.</p>

<h1>CHAPTER 2. DISCLAIMER POLICY</h1>
<h2>Article 6. Reference nature of content</h2>
<p>All content, documents, contract templates, suggestions, and information provided on the Lawzy Platform are for reference and technical support only.</p>
<p>Such content does not constitute legal opinion, legal advice, or guarantee of legal outcomes.</p>

<h1>CHAPTER 3. AI USAGE POLICY</h1>
<h2>Article 7. AI operation mechanism</h2>
<p>The Lawzy Platform uses artificial intelligence (AI) systems to generate content based on user-provided input data.</p>
<p>AI operates on a probabilistic basis and is not a legal expert nor capable of replacing lawyers.</p>

<h1>CHAPTER 4. LIABILITY LIMITATION</h1>
<h2>Article 8. No guarantee of specific legal outcomes</h2>
<p>Lawzy does not guarantee that use of the Platform will help users achieve desired legal outcomes.</p>
<p>To the extent permitted by law, Lawzy is not liable for indirect damages, lost profits, or damages arising from third-party conduct.</p>
`;
