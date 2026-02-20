"use client";

import Image from "next/image";
import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Facebook } from "lucide-react";

export default function Members() {
  const { t } = useI18n();
  const members = [
    { name: "Nguyễn Anh Thư", role: t("member_thu_role"), image: "/profile_pic/Thu_2.jpg", linkedin: "https://www.linkedin.com/in/thunguyen267", facebook: "https://www.facebook.com/nathu2607" },
    { name: "Lý Anh Quân", role: t("member_quan_ly_role"), image: "/profile_pic/LAQ_1.jpg", linkedin: "https://www.linkedin.com/in/anhquanly", facebook: "https://www.facebook.com/Lys.Anh.Quan.162" },
    { name: "Huỳnh Minh Quân", role: t("member_quan_huynh_role"), image: "/profile_pic/HMQ_2.jpg", linkedin: "https://www.linkedin.com/in/hmquan191", facebook: "https://www.facebook.com/liam.huynh.50" },
  ];

  return (
    <section className="py-24 overflow-hidden" id="team">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">{t("members_title")}</h2>
          </div>
        </FadeInOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8 max-w-6xl mx-auto">
          {members.map((member, index) => (
            <FadeInOnScroll key={index} delay={index * 0.15}>
              <div className="group flex flex-col items-center">
                <div className="relative w-56 h-56 mb-8">
                  <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl group-hover:shadow-2xl transition-all duration-500">
                    <Image src={member.image} alt={member.name} fill sizes="224px" quality={75} loading="lazy" className="object-cover" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{member.name}</h3>
                  <p className="text-gray-500 font-medium">{member.role}</p>
                  <div className="flex justify-center gap-4 mt-3">
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0077b5] transition-colors" aria-label={`${member.name} LinkedIn`}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
                    </a>
                    <a href={member.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1877F2] transition-colors" aria-label={`${member.name} Facebook`}>
                      <Facebook className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
