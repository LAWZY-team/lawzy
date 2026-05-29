"use client";

import Image from "next/image";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";

type MemberCardProps = {
  name: string;
  rolePrimary: string;
  roleSecondary?: string;
  imageSrc: string;
};

const MemberCard = ({ name, rolePrimary, roleSecondary, imageSrc }: MemberCardProps) => (
  <article className="relative overflow-hidden rounded-2xl bg-gray-100 sm:rounded-3xl">
    <div className="relative aspect-[4/5] w-full">
      <Image src={imageSrc} alt={name} fill className="object-cover object-top" sizes="(max-width:640px) 100vw, 25vw" />
      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/95 px-3 py-3 shadow-md shadow-black/[0.06] backdrop-blur-sm sm:inset-x-4 sm:bottom-4 sm:px-4">
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{rolePrimary}</p>
        {roleSecondary ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground/90">{roleSecondary}</p>
        ) : null}
      </div>
    </div>
  </article>
);

const parseMemberRoles = (role: string): { rolePrimary: string; roleSecondary?: string } => {
  if (role.includes(";")) {
    const [primary, secondary] = role.split(";").map((part) => part.trim());
    return { rolePrimary: primary, roleSecondary: secondary || undefined };
  }
  return { rolePrimary: role };
};

export default function VisionTeamSection() {
  const { t } = useI18n();
  const members = [
    { name: t("member_dharma_name"), role: t("member_dharma_role"), imageSrc: "/profile_pic/dharma.webp" },
    { name: t("member_thu_name"), role: t("member_thu_role"), imageSrc: "/profile_pic/Thu_2.jpg" },
    { name: t("member_quan_ly_name"), role: t("member_quan_ly_role"), imageSrc: "/profile_pic/LAQ-white-bg.png" },
    { name: t("member_quan_huynh_name"), role: t("member_quan_huynh_role"), imageSrc: "/profile_pic/HMQ_2.jpg" },
  ].map((m) => ({ ...m, ...parseMemberRoles(m.role) }));
  return (
    <Section id="team" spacing="compact" className="border-t border-gray-200/80 bg-[#faf9f5]">
      <div className={sectionContainer}>
        <SectionHeader title={t("vision_title")} subtitle={t("vision_subtitle")} margin="tight" align="left" className="mx-0 max-w-3xl" />
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("vision_card_title")}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t("vision_card_desc")}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("solution_card_title")}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t("solution_card_desc")}</p>
          </div>
        </div>
        <h3 className="mt-16 text-xl font-semibold text-foreground sm:mt-20 sm:text-2xl">{t("members_title")}</h3>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {members.map((member) => (
            <MemberCard
              key={member.name}
              name={member.name}
              rolePrimary={member.rolePrimary}
              roleSecondary={member.roleSecondary}
              imageSrc={member.imageSrc}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
