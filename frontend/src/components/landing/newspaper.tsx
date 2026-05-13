"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "./language-provider";
import { InfiniteMarquee } from "./infinite-marquee";
import { Section, SectionHeader, sectionContainer } from "./landing-section";

const NEWSPAPERS = [
  {
    name: "The Business Times",
    logo: "/partners_logo/newpaper/businesstimess.svg",
    logo_alt: "The Business Times",
    title: "Vietnam-Singapore partnership seen catalyst scaling sustainable innovation",
    url: "https://www.businesstimes.com.sg/international/asean/vietnam-singapore-partnership-seen-catalyst-scaling-sustainable-innovation",
  },
  {
    name: "VnEconomy",
    logo: "/partners_logo/newpaper/vneconomy.svg",
    logo_alt: "VnEconomy",
    title: "Quỹ đầu tư Singapore rót vốn vào các công ty công nghệ Việt",
    url: "https://vneconomy.vn/quy-dau-tu-singapore-rot-von-vao-cac-startup-viet.htm",
  },
  {
    name: "HCMU Law",
    logo: "/partners_logo/newpaper/ulaw.png",
    logo_alt: "Trường Đại học Luật TPHCM",
    title: "Dự án legal tech của sinh viên Trường Đại học Luật TP. Hồ Chí Minh vào Top 10 UniVentures 2025",
    url: "https://hcmulaw.edu.vn/vi/thong-tin-dao-tao/du-an-legal-tech-cua-sinh-vien-truong-dai-hoc-luat-tp-ho-chi-minh-vao-top-10-univentures-2025",
    extraClasses: "scale-150",
  },
  {
    name: "Nhan Dan",
    logo: "/partners_logo/newpaper/nhandan.png",
    logo_alt: "Báo Nhân dân",
    title: "Trao giải Cuộc thi Khởi nghiệp và Đổi mới sáng tạo năm 2025",
    url: "https://nhandan.vn/trao-giai-cuoc-thi-khoi-nghiep-va-doi-moi-sang-tao-nam-2025-post916375.html",
  },
  {
    name: "HTV",
    logo: "/partners_logo/newpaper/htv.png",
    logo_alt: "Đài truyền hình TP.HCM (HTV)",
    title: "10 ĐỘI START-UP TỪ CÁC TRƯỜNG ĐẠI HỌC VIỆT NAM ĐƯỢC NHẬN NGUỒN HỖ TRỢ ĐỔI MỚI SÁNG TẠO QUỐC TẾ",
    url: "https://www.youtube.com/watch?v=PQ0dLH6Hs6Y",
  },
];

export function Newspaper() {
  const { t } = useI18n();
  return (
    <Section id="newspaper" spacing="relaxed" className="border-t border-gray-100/80 bg-white/50 dark:border-gray-800/80">
      <div className={sectionContainer}>
        <SectionHeader title={t("newspaper_title")} margin="default" highlightWord={t("newspaper_title_highlight")} />
        <div className="mx-auto mt-4 max-w-7xl">
          <InfiniteMarquee
            durationSeconds={34}
            trackClassName="gap-8 pr-8 sm:gap-10 sm:pr-10"
            items={NEWSPAPERS.map((item) => (
              <Link
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-[280px] flex-col items-center text-center transition-transform duration-300 hover:-translate-y-0.5"
              >
                <div
                  className={`relative mb-3 flex h-14 w-full items-center justify-center grayscale transition-all duration-300 group-hover:grayscale-0 dark:invert dark:group-hover:invert-0 sm:mb-4 sm:h-16 ${item.extraClasses || ""}`}
                >
                  <Image src={item.logo} alt={item.logo_alt} width={150} height={60} className="max-h-full max-w-[150px] object-contain" loading="lazy" />
                </div>
                <p className="line-clamp-3 text-sm font-medium text-muted-foreground transition-colors group-hover:text-blue-600 sm:text-base">
                  {item.title}
                </p>
              </Link>
            ))}
          />
        </div>
      </div>
    </Section>
  );
}
