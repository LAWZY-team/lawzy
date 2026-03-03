"use client";

import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
// import { trackEvent } from "@/lib/analytics/track";

interface HeroSectionProps {
  onCreateContract?: () => void;
}

export default function HeroSection({ onCreateContract }: HeroSectionProps) {
  const { t } = useI18n();
  const router = useRouter();

  const handleCreateContract = () => {
    // trackEvent("CLICK_CREATE_CONTRACT_LP");
    if (onCreateContract) return onCreateContract();
    router.push("/editor/new");
  };

  return (
    <section className="lg:px-2 pt-32 pb-16 md:pt-30 lg:pt-30 lg:pb-5 overflow-hidden">
      <FadeInOnScroll>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left lg:mb-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.2]">
                {t("hero_title_1")}
                <br />
                <span className="text-orange-600">{t("hero_title_2")}</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed font-light max-w-xl mx-auto lg:mx-0">
                {t("hero_subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button
                  type="button"
                  size="lg"
                  className="bg-black hover:bg-gray-800 text-white text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
                  onClick={handleCreateContract}
                >
                  {t("try_free")}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
            <div className="relative w-full max-w-2xl mx-auto lg:max-w-none lg:mb-8">
              <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-gray-50 relative">
                <Image
                  src="/hero.gif"
                  alt="Lawzy product hero"
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                  unoptimized={true}
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-100 rounded-full z-[-1] blur-2xl" aria-hidden />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-50 rounded-full z-[-1] blur-2xl" aria-hidden />
            </div>
          </div>
        </div>
      </FadeInOnScroll>
    </section>
  );
}
