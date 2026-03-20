"use client";

import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Button } from "@/components/ui/button";
import { ChevronRight, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import { trackEvent } from "@/lib/analytics/track";
import { useGuestFlowStore } from "@/stores/guest-flow-store";

interface HeroSectionProps {
  onCreateContract?: () => void;
}

export default function HeroSection({ onCreateContract }: HeroSectionProps) {
  const { t } = useI18n();
  const router = useRouter();

  const handleCreateContract = () => {
    // trackEvent("CLICK_CREATE_CONTRACT_LP");
    useGuestFlowStore.getState().startFromLanding();
    if (onCreateContract) return onCreateContract();
    router.push("/editor/new");
  };

  return (
    <section className="lg:px-2 pt-32 pb-16 md:pt-30 lg:pt-30 lg:pb-5 overflow-hidden">
      <FadeInOnScroll>
        <div className="container mx-auto px-4">
          {/* Hero content: centered title, subtitle, buttons */}
          <div className="flex flex-col items-center justify-center w-full text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.2]">
              {t("hero_title_1")}
              <br />
              <span className="text-orange-600">{t("hero_title_2")}</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground leading-relaxed font-light max-w-2xl mx-auto">
              {t("hero_subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <Button
                type="button"
                size="lg"
                className="bg-black hover:bg-gray-800 text-white text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
                onClick={handleCreateContract}
              >
                {t("try_free")}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-full border-gray-300" asChild>
                <Link href="/login">
                  <LogIn className="w-5 h-5 mr-2" />
                  {t("login")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero image: below content */}
          <div className="relative w-full max-w-3xl mx-auto mt-16 lg:mt-20">
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-gray-50 relative">
              <Image
                src="/hero.gif"
                alt="Lawzy product hero"
                fill
                priority
                sizes="(min-width: 1024px) 896px, 100vw"
                className="object-cover"
                unoptimized={true}
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-100 rounded-full z-[-1] blur-2xl" aria-hidden />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-50 rounded-full z-[-1] blur-2xl" aria-hidden />
          </div>
        </div>
      </FadeInOnScroll>
    </section>
  );
}
