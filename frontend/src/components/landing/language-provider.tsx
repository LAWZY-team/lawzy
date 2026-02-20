"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Locale = "vi" | "en";
type Messages = Record<string, string>;
type Dictionary = Record<Locale, Messages>;

const messages: Dictionary = {
  vi: {
    nav_features: "Tính năng",
    nav_target: "Đối tượng",
    nav_team: "Đội ngũ",
    nav_achievement: "Thành tựu",
    nav_contact: "Liên hệ",
    nav_newspaper: "Báo chí",
    try_free: "Đăng ký trải nghiệm",
    login: "Đăng nhập",
    survey_modal_title: "Đăng ký trải nghiệm Lawzy",
    survey_close: "Đóng form",
    survey_loading: "Đang chuẩn bị form...",
    hero_title_1: "Lawzy ký kết an toàn",
    hero_title_2: " Quản lý nhẹ nhàng",
    hero_subtitle: "Giúp bạn tiết kiệm thời gian, công sức và hạn chế rủi ro cho hợp đồng",
    features_title: "Tính năng nổi bật",
    features_subtitle: "Lawzy mang đến trải nghiệm pháp lý hoàn toàn mới với công nghệ AI tiên tiến",
    feature_card1_title: "Soạn thảo hợp đồng dễ dàng",
    feature_card1_desc: "Tạo hợp đồng chuyên nghiệp trong vài phút với các mẫu có sẵn và gợi ý AI thông minh.",
    feature_card2_title: "Rà soát rủi ro tự động",
    feature_card2_desc: "AI phân tích và cảnh báo các điều khoản bất lợi, giúp bạn ký kết an toàn hơn.",
    feature_card3_title: "Quản lý hợp đồng tập trung",
    feature_card3_desc: "Theo dõi trạng thái, nhắc nhở nghĩa vụ và lưu trữ an toàn mọi hợp đồng của bạn.",
    target_title: "Ai nên sử dụng Lawzy?",
    target_subtitle: "Giải pháp tối ưu dành cho các đối tượng thường xuyên làm việc với hợp đồng",
    target_sme_title: "Doanh nghiệp vừa và nhỏ (SME)",
    target_sme_desc: "Tối ưu quy trình, giảm chi phí pháp lý và quản lý hợp đồng hiệu quả mà không cần phòng pháp chế riêng.",
    target_sme_feat1: "Tiết kiệm chi phí thuê luật sư",
    target_sme_feat2: "Giảm thiểu rủi ro pháp lý",
    target_sme_feat3: "Quản lý tập trung, dễ dàng tra cứu",
    target_legal_title: "Đội ngũ pháp lý & Nhân sự",
    target_legal_desc: "Công cụ đắc lực giúp rà soát nhanh, chuẩn hóa quy trình và giảm tải khối lượng công việc lặp lại.",
    target_legal_feat1: "Rà soát hợp đồng tự động",
    target_legal_feat2: "Chuẩn hóa mẫu hợp đồng",
    target_legal_feat3: "Tăng năng suất làm việc",
    achievement_title: "Thành tựu",
    achievement_item_title: "Giải nhì Cuộc thi Khởi nghiệp và Đổi mới sáng tạo TP.HCM 2025",
    members_title: "Đội ngũ phát triển",
    member_thu_role: "Trưởng nhóm / Quản lý sản phẩm",
    member_quan_ly_role: "Kỹ sư phần mềm",
    member_quan_huynh_role: "Kỹ sư phần mềm",
    newspaper_title: "Báo chí nói về chúng tôi",
    incubation_by: "Được ươm tạo bởi",
    footer_contact: "Liên hệ",
    footer_tagline: "An tâm. Kịp thời. Đồng hành cùng bạn",
    language_english: "EN",
    language_vietnamese: "VI",
  },
  en: {
    nav_features: "Features",
    nav_target: "Target",
    nav_team: "Team",
    nav_achievement: "Achievements",
    nav_contact: "Contact",
    nav_newspaper: "Press",
    try_free: "Try for free",
    login: "Log in",
    survey_modal_title: "Register for Lawzy early access",
    survey_close: "Close form",
    survey_loading: "Preparing the form...",
    hero_title_1: "Lawzy signs safely –",
    hero_title_2: " Manage with ease",
    hero_subtitle: "Helping you save time, effort, and reduce risks in contracts",
    features_title: "Key features",
    features_subtitle: "Lawzy delivers a new legal experience powered by advanced AI",
    feature_card1_title: "Draft contracts effortlessly",
    feature_card1_desc: "Create professional contracts in minutes with ready-made templates and smart AI suggestions.",
    feature_card2_title: "Automated risk review",
    feature_card2_desc: "AI analyzes and flags unfavorable clauses, helping you sign with confidence.",
    feature_card3_title: "Centralized contract management",
    feature_card3_desc: "Track status, get obligation reminders, and store all your contracts securely.",
    target_title: "Who is Lawzy for?",
    target_subtitle: "Optimal solutions for those who frequently work with contracts",
    target_sme_title: "SMEs & Startups",
    target_sme_desc: "Optimize processes, reduce legal costs, and manage contracts effectively without a dedicated legal department.",
    target_sme_feat1: "Save on lawyer fees",
    target_sme_feat2: "Minimize legal risks",
    target_sme_feat3: "Centralized management, easy lookup",
    target_legal_title: "Legal Teams & HR",
    target_legal_desc: "A powerful tool to speed up review, standardize processes, and reduce repetitive workload.",
    target_legal_feat1: "Automated contract review",
    target_legal_feat2: "Standardize contract templates",
    target_legal_feat3: "Increase productivity",
    achievement_title: "Achievements",
    achievement_item_title: "2nd Prize - Startup & Innovation Competition HCMC 2025",
    members_title: "Our Team",
    member_thu_role: "Leader / Product Manager",
    member_quan_ly_role: "Software Developer",
    member_quan_huynh_role: "Software Developer",
    newspaper_title: "Highlight in the press",
    incubation_by: "Incubated by",
    footer_contact: "Contact",
    footer_tagline: "Peace of mind. On time. By your side",
    language_english: "EN",
    language_vietnamese: "VI",
  },
};

type I18nContextValue = {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LandingLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lawzy_lang") as Locale | null;
      if (stored === "en" || stored === "vi") return stored;
      return navigator.language.startsWith("vi") ? "vi" : "en";
    }
    return "vi";
  });

  const t = useCallback(
    (key: string) => messages[locale][key] ?? key,
    [locale]
  );

  const setLocale = useCallback((next: Locale) => {
    if (typeof window !== "undefined") localStorage.setItem("lawzy_lang", next);
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LandingLanguageProvider");
  return ctx;
}
