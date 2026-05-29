"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import { LandingSnapCarousel } from "./landing-snap-carousel";
import { MEMBER_PROFILES } from "@/lib/landing/member-profiles";
import { cn } from "@/lib/utils";

type ResolvedHighlight = {
  text: string;
  meta?: string;
};

export type ResolvedMemberProfile = {
  id: string;
  name: string;
  lawzyRole: string;
  rolePrimary: string;
  roleSecondary?: string;
  imageSrc: string;
  achievements: ResolvedHighlight[];
  statuses: ResolvedHighlight[];
};

const parseMemberRoles = (role: string): { rolePrimary: string; roleSecondary?: string } => {
  if (role.includes(";")) {
    const [primary, secondary] = role.split(";").map((part) => part.trim());
    return { rolePrimary: primary, roleSecondary: secondary || undefined };
  }
  return { rolePrimary: role };
};

const resolveHighlights = (
  items: readonly { textKey: string; metaKey?: string }[],
  t: (key: string) => string
): ResolvedHighlight[] =>
  items.map((item) => ({
    text: t(item.textKey),
    meta: item.metaKey ? t(item.metaKey) : undefined,
  }));

type HighlightListProps = {
  title: string;
  items: ResolvedHighlight[];
  variant: "achievement" | "status";
};

const HighlightList = ({ title, items, variant }: HighlightListProps) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={`${variant}-${index}`}>
            {variant === "status" ? (
              <span className="inline-block rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium leading-snug text-foreground">
                {item.text}
              </span>
            ) : (
              <div className="text-xs leading-snug text-foreground">
                <p>{item.text}</p>
                {item.meta ? <p className="mt-0.5 text-[11px] text-muted-foreground">{item.meta}</p> : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

type MemberCardProps = {
  member: ResolvedMemberProfile;
  achievementsLabel: string;
  statusLabel: string;
};

const MemberCard = ({ member, achievementsLabel, statusLabel }: MemberCardProps) => (
  <article
    tabIndex={0}
    aria-label={`${member.name}, ${member.lawzyRole}`}
    className="group relative mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl bg-gray-100 outline-none sm:max-w-[280px] md:max-w-[300px] lg:mx-0 lg:max-w-none sm:rounded-3xl focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2"
  >
    <div className="relative aspect-[4/5] w-full max-h-[420px] lg:max-h-none">
      <Image
        src={member.imageSrc}
        alt={`${member.name}, ${member.lawzyRole} at Lawzy`}
        fill
        className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] group-focus-within:scale-[1.03]"
        sizes="(max-width: 1023px) 300px, (max-width: 1280px) 240px, 280px"
        loading="lazy"
      />
      <div
        className={cn(
          "absolute inset-x-3 bottom-3 rounded-xl bg-white/95 px-3 py-3 shadow-md shadow-black/[0.06] backdrop-blur-sm transition-opacity duration-300 sm:inset-x-4 sm:bottom-4 sm:px-4",
          "group-hover:opacity-0 group-focus-within:opacity-0",
          "max-lg:group-active:opacity-0"
        )}
      >
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{member.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{member.lawzyRole}</p>
      </div>
      <div
        className={cn(
          "absolute inset-0 flex flex-col overflow-hidden bg-white/98 p-4 opacity-0 transition-opacity duration-300 sm:p-5",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          "max-lg:group-active:opacity-100"
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
          <p className="text-sm font-semibold text-foreground sm:text-base">{member.name}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{member.rolePrimary}</p>
          {member.roleSecondary ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/90">{member.roleSecondary}</p>
          ) : null}
          <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
            <HighlightList title={achievementsLabel} items={member.achievements} variant="achievement" />
            <HighlightList title={statusLabel} items={member.statuses} variant="status" />
          </div>
        </div>
      </div>
    </div>
  </article>
);

export default function VisionTeamSection() {
  const { t } = useI18n();
  const members = useMemo(
    () =>
      MEMBER_PROFILES.map((profile) => {
        const role = t(profile.roleKey);
        return {
          id: profile.id,
          imageSrc: profile.imageSrc,
          name: t(profile.nameKey),
          lawzyRole: t(profile.lawzyRoleKey),
          ...parseMemberRoles(role),
          achievements: resolveHighlights(profile.achievements, t),
          statuses: resolveHighlights(profile.statuses, t),
        };
      }),
    [t]
  );
  const achievementsLabel = t("member_overlay_achievements");
  const statusLabel = t("member_overlay_status");
  return (
    <Section
      id="team"
      spacing="compact"
      className="border-t border-gray-200/80 bg-[#faf9f5]"
      aria-labelledby="members-heading"
    >
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
        <h3
          id="members-heading"
          className="mt-16 text-xl font-semibold text-foreground sm:mt-20 sm:text-2xl"
        >
          {t("members_title")}
        </h3>
        <div className="mt-10 lg:hidden">
          <LandingSnapCarousel className="px-8 sm:px-10" itemClassName="flex justify-center">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                achievementsLabel={achievementsLabel}
                statusLabel={statusLabel}
              />
            ))}
          </LandingSnapCarousel>
        </div>
        <div className="mt-10 hidden grid-cols-4 gap-5 lg:grid">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              achievementsLabel={achievementsLabel}
              statusLabel={statusLabel}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
