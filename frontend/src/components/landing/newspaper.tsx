"use client";

import Link from "next/link";
import { useI18n } from "./language-provider";
import { InfiniteMarquee } from "./infinite-marquee";
import { LandingPartnerLogo } from "./landing-partner-logo";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import FadeInOnScroll from "./fade-in-on-scroll";

type NewspaperItem = {
  name: string;
  logo: string;
  logo_alt: string;
  title: string;
  url: string;
  logoMaxWidthClass?: string;
};

const NEWSPAPERS: NewspaperItem[] = [
  {
    name: "The Business Times",
    logo: "/partners_logo/newpaper/businesstimess.svg",
    logo_alt: "The Business Times",
    title: "Vietnam-Singapore partnership seen catalyst scaling sustainable innovation",
    url: "https://www.businesstimes.com.sg/international/asean/vietnam-singapore-partnership-seen-catalyst-scaling-sustainable-innovation",
  },
  {
    name: "NUS Enterprise",
    logo: "/partners_logo/newpaper/nusenterprise-logo.avif",
    logo_alt: "NUS Enterprise",
    title: "Singapore and Vietnam to boost cross-border start-up innovation pipeline through BLOCK71 UniVentures ",
    url: "https://enterprise.nus.edu.sg/news/singapore-and-vietnam-to-boost-cross-border-start-up-innovation-pipeline-through-block71-univentures/",
    logoMaxWidthClass: "max-w-[150px]",
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
    logo_alt: "Trường Đại học Luật TP. Hồ Chí Minh",
    title: "Dự án legal tech của sinh viên Trường Đại học Luật TP. Hồ Chí Minh vào Top 10 UniVentures 2025",
    url: "https://hcmulaw.edu.vn/vi/thong-tin-dao-tao/du-an-legal-tech-cua-sinh-vien-truong-dai-hoc-luat-tp-ho-chi-minh-vao-top-10-univentures-2025",
    logoMaxWidthClass: "max-w-[120px]",
  },
  {
    name: "Nhan Dan",
    logo: "/partners_logo/newpaper/nhandan.png",
    logo_alt: "Báo Nhân Dân",
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
    <Section
      id="newspaper"
      spacing="compact"
      className="border-t border-gray-100/80 bg-[#faf9f5] dark:border-gray-800/80"
      aria-labelledby="newspaper-heading"
    >
      <div className={sectionContainer}>
        <FadeInOnScroll>
          <SectionHeader
            titleId="newspaper-heading"
            title={t("newspaper_title")}
            subtitle={t("newspaper_subtitle")}
            highlightWord={t("newspaper_title_highlight")}
            margin="default"
            as="h2"
            titleClassName="lg:text-[2.5rem]"
          />
        </FadeInOnScroll>
        <div className="mx-auto max-w-7xl">
          <InfiniteMarquee
            durationSeconds={34}
            pauseOnHover
            trackClassName="gap-8 pr-8 sm:gap-10 sm:pr-10"
            items={NEWSPAPERS.map((item) => (
              <article key={item.url} className="lawzy-marquee__item w-[280px] shrink-0">
                <Link
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.logo_alt}: ${item.title}`}
                  className="group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <div className="relative mb-3 flex h-14 w-full items-center justify-center sm:mb-4 sm:h-16">
                    <LandingPartnerLogo
                      src={item.logo}
                      alt={item.logo_alt}
                      maxWidthClass={item.logoMaxWidthClass ?? "max-w-[150px]"}
                    />
                  </div>
                  <h3 className="line-clamp-3 text-sm font-medium text-muted-foreground transition-colors group-hover:text-orange-600 sm:text-base">
                    {item.title}
                  </h3>
                </Link>
              </article>
            ))}
          />
        </div>
      </div>
    </Section>
  );
}
