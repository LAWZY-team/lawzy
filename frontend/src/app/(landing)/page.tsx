"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import LandingHeader from "@/components/landing/landing-header";
import HeroSection from "@/components/landing/hero-section";
import { Newspaper } from "@/components/landing/newspaper";
import FeaturesSection from "@/components/landing/features-section";
import TargetSection from "@/components/landing/target-section";
import Achievement from "@/components/landing/achievement";
import Members from "@/components/landing/members";
import { Incubation } from "@/components/landing/incubation";
import SurveySection from "@/components/landing/survey-section";
import { useI18n } from "@/components/landing/language-provider";
import { Mail, Phone, MapPin, Facebook } from "lucide-react";

export default function LandingPage() {
  const { t } = useI18n();
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  useEffect(() => {
    const openIfHash = () => {
      if (window.location.hash === "#survey") setIsSurveyOpen(true);
    };
    openIfHash();
    window.addEventListener("hashchange", openIfHash);
    return () => window.removeEventListener("hashchange", openIfHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      <LandingHeader onOpenSurvey={() => setIsSurveyOpen(true)} />
      <HeroSection onOpenSurvey={() => setIsSurveyOpen(true)} />
      <Newspaper />
      <FeaturesSection />
      <TargetSection />
      <Achievement />
      <Members />
      <Incubation />

      <div id="survey" className="sr-only" aria-hidden />
      <SurveySection isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />

      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-2 gap-8 justify-between">
            <div className="flex flex-col items-start">
              <h4 className="font-semibold mb-4">{t("footer_contact")}</h4>
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>contact@lawzy.vn</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>+84 908716707</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Ho Chi Minh City, Vietnam</span>
                </div>
                <div className="flex items-center space-x-4 pt-4">
                  <a href="https://www.facebook.com/lawzy.vn" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Facebook">
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="https://www.youtube.com/@Lawzy-vn" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="YouTube">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.254.418-4.814a2.506 2.506 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" /></svg>
                  </a>
                  <a href="https://www.linkedin.com/company/lawzy-vn" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="LinkedIn">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="-translate-y-5 md:text-right flex flex-col items-start md:items-end">
              <div className="flex items-center md:justify-end w-full">
                <Image src="/lawzy-logo-white.png" alt="lawzy-logo" width={120} height={120} className="scale-130" />
              </div>
              <p className="text-gray-400 max-w-sm md:ml-auto">{t("footer_tagline")}</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex justify-center items-center">
            <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Lawzy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
