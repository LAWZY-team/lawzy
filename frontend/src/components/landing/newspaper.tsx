"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "./language-provider";

const NEWSPAPERS = [
  { name: "The Business Times", logo: "/partners_logo/newpaper/businesstimess.svg", logo_alt: "The Business Times", title: "Vietnam-Singapore partnership seen catalyst scaling sustainable innovation", url: "https://www.businesstimes.com.sg/international/asean/vietnam-singapore-partnership-seen-catalyst-scaling-sustainable-innovation" },
  { name: "VnEconomy", logo: "/partners_logo/newpaper/vneconomy.svg", logo_alt: "VnEconomy", title: "Quỹ đầu tư Singapore rót vốn vào các startup Việt", url: "https://vneconomy.vn/quy-dau-tu-singapore-rot-von-vao-cac-startup-viet.htm" },
  { name: "HCMU Law", logo: "/partners_logo/newpaper/ulaw.png", logo_alt: "Trường Đại học Luật TPHCM", title: "Dự án legal tech của sinh viên Trường Đại học Luật TP. Hồ Chí Minh vào Top 10 UniVentures 2025", url: "https://hcmulaw.edu.vn/vi/thong-tin-dao-tao/du-an-legal-tech-cua-sinh-vien-truong-dai-hoc-luat-tp-ho-chi-minh-vao-top-10-univentures-2025", extraClasses: "scale-150" },
  { name: "Nhan Dan", logo: "/partners_logo/newpaper/nhandan.png", logo_alt: "Báo Nhân dân", title: "Trao giải Cuộc thi Khởi nghiệp và Đổi mới sáng tạo năm 2025", url: "https://nhandan.vn/trao-giai-cuoc-thi-khoi-nghiep-va-doi-moi-sang-tao-nam-2025-post916375.html" },
  { name: "HTV", logo: "/partners_logo/newpaper/htv.png", logo_alt: "Đài truyền hình TP.HCM (HTV)", title: "10 ĐỘI START-UP TỪ CÁC TRƯỜNG ĐẠI HỌC VIỆT NAM ĐƯỢC NHẬN NGUỒN HỖ TRỢ ĐỔI MỚI SÁNG TẠO QUỐC TẾ", url: "https://www.youtube.com/watch?v=PQ0dLH6Hs6Y" },
];

export function Newspaper() {
  const { t } = useI18n();
  return (
    <section id="newspaper" className="py-16 mt-5">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-12 text-center tracking-tight">{t("newspaper_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {NEWSPAPERS.map((item, index) => (
            <Link key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group transition-transform hover:-translate-y-1">
              <div className={`h-16 w-full relative mb-4 flex items-center justify-center grayscale group-hover:grayscale-0 dark:invert dark:group-hover:invert-0 transition-all duration-300 ${item.extraClasses || ""}`}>
                <Image src={item.logo} alt={item.logo_alt} width={150} height={60} className="object-contain max-h-full max-w-[150px]" />
              </div>
              <p className="text-base text-center text-muted-foreground line-clamp-3 group-hover:text-blue-600 transition-colors font-medium">{item.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
