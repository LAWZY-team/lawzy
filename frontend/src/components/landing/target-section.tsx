"use client";

import FadeInOnScroll from "./fade-in-on-scroll";
import { useI18n } from "./language-provider";
import { Building2, Scale, CheckCircle2 } from "lucide-react";

export default function TargetSection() {
  const { t } = useI18n();
  const targets = [
    { icon: Building2, titleKey: "target_sme_title", descKey: "target_sme_desc", featuresKey: ["target_sme_feat1", "target_sme_feat2", "target_sme_feat3"], color: "text-blue-600", bg: "bg-blue-50", border: "hover:border-blue-200" },
    { icon: Scale, titleKey: "target_legal_title", descKey: "target_legal_desc", featuresKey: ["target_legal_feat1", "target_legal_feat2", "target_legal_feat3"], color: "text-orange-600", bg: "bg-orange-50", border: "hover:border-orange-200" },
  ];

  return (
    <section className="py-24 overflow-hidden" id="target">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="text-center mb-16 space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">{t("target_title")}</h2>
            <p className="text-xl text-gray-500">{t("target_subtitle")}</p>
          </div>
        </FadeInOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {targets.map((target, index) => {
            const Icon = target.icon;
            return (
              <FadeInOnScroll key={index} delay={index * 0.2}>
                <div className={`group h-full p-8 rounded-3xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${target.border}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${target.bg} ${target.color}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{t(target.titleKey)}</h3>
                  <p className="text-gray-600 mb-8 leading-relaxed">{t(target.descKey)}</p>
                  <ul className="space-y-3">
                    {target.featuresKey.map((featureKey, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <CheckCircle2 className={`w-5 h-5 mr-3 flex-shrink-0 ${target.color}`} />
                        <span className="font-medium">{t(featureKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
