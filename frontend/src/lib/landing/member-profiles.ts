/**
 * Team member profiles for the landing page.
 * Update imageSrc, keys, and list items here — copy strings live in landing-messages (vi/en).
 */
export type MemberHighlightItem = {
  /** i18n key for main line */
  textKey: string;
  /** Optional i18n key for year, org, or short label */
  metaKey?: string;
};

export type MemberProfileConfig = {
  id: "dharma" | "thu" | "quan_ly" | "quan_huynh";
  imageSrc: string;
  nameKey: string;
  /** Short Lawzy role on the card (before hover) */
  lawzyRoleKey: string;
  /** Full role / bio in the hover overlay */
  roleKey: string;
  /** Public profile — for reference / future link in UI */
  linkedinUrl?: string;
  achievements: readonly MemberHighlightItem[];
  statuses: readonly MemberHighlightItem[];
};

/** Shared Lawzy team wins (Thu, Lý Anh Quân, Huỳnh Minh Quân) */
const LAWZY_CORE_TEAM_ACHIEVEMENTS: readonly MemberHighlightItem[] = [
  {
    textKey: "member_lawzy_team_achievement_3",
    metaKey: "member_lawzy_team_achievement_3_meta",
  },
  {
    textKey: "member_lawzy_team_achievement_4",
    metaKey: "member_lawzy_team_achievement_4_meta",
  },
  {
    textKey: "member_lawzy_team_achievement_5",
    metaKey: "member_lawzy_team_achievement_5_meta",
  },
  {
    textKey: "member_lawzy_team_achievement_6",
    metaKey: "member_lawzy_team_achievement_6_meta",
  },
];

const LAWZY_CORE_TEAM_STATUSES: readonly MemberHighlightItem[] = [
  { textKey: "member_lawzy_team_status_3" },
  { textKey: "member_lawzy_team_status_4" },
];

export const MEMBER_PROFILES: readonly MemberProfileConfig[] = [
  {
    id: "dharma",
    imageSrc: "/profile_pic/dharma.webp",
    nameKey: "member_dharma_name",
    lawzyRoleKey: "member_dharma_lawzy_role",
    roleKey: "member_dharma_role",
    achievements: [
      {
        textKey: "member_dharma_achievement_1",
        metaKey: "member_dharma_achievement_1_meta",
      },
      { textKey: "member_dharma_achievement_2" },
      {
        textKey: "member_dharma_achievement_3",
        metaKey: "member_dharma_achievement_3_meta",
      },
      {
        textKey: "member_dharma_achievement_4",
        metaKey: "member_dharma_achievement_4_meta",
      },
      {
        textKey: "member_dharma_achievement_5",
        metaKey: "member_dharma_achievement_5_meta",
      },
    ],
    statuses: [
      { textKey: "member_dharma_status_1" },
      { textKey: "member_dharma_status_2" },
      { textKey: "member_dharma_status_3" },
      { textKey: "member_dharma_status_4" },
      { textKey: "member_dharma_status_5" },
    ],
  },
  {
    id: "thu",
    imageSrc: "/profile_pic/THU.jpg",
    nameKey: "member_thu_name",
    lawzyRoleKey: "member_thu_lawzy_role",
    roleKey: "member_thu_role",
    linkedinUrl: "https://www.linkedin.com/in/thunguyen267/",
    achievements: [
      {
        textKey: "member_thu_achievement_1",
        metaKey: "member_thu_achievement_1_meta",
      },
      {
        textKey: "member_thu_achievement_2",
        metaKey: "member_thu_achievement_2_meta",
      },
      ...LAWZY_CORE_TEAM_ACHIEVEMENTS,
    ],
    statuses: [
      { textKey: "member_thu_status_1" },
      ...LAWZY_CORE_TEAM_STATUSES,
    ],
  },
  {
    id: "quan_ly",
    imageSrc: "/profile_pic/LAQ.jpg",
    nameKey: "member_quan_ly_name",
    lawzyRoleKey: "member_quan_ly_lawzy_role",
    roleKey: "member_quan_ly_role",
    achievements: [
      {
        textKey: "member_quan_ly_achievement_1",
        metaKey: "member_quan_ly_achievement_1_meta",
      },
      {
        textKey: "member_lawzy_team_achievement_2",
        metaKey: "member_lawzy_team_achievement_2_meta",
      },
      ...LAWZY_CORE_TEAM_ACHIEVEMENTS,
    ],
    statuses: [
      { textKey: "member_quan_ly_status_1" },
      { textKey: "member_quan_ly_status_2" },
      ...LAWZY_CORE_TEAM_STATUSES,
    ],
  },
  {
    id: "quan_huynh",
    imageSrc: "/profile_pic/HMQ_2.jpg",
    nameKey: "member_quan_huynh_name",
    lawzyRoleKey: "member_quan_huynh_lawzy_role",
    roleKey: "member_quan_huynh_role",
    achievements: [
      {
        textKey: "member_quan_huynh_achievement_1",
        metaKey: "member_quan_huynh_achievement_1_meta",
      },
      {
        textKey: "member_lawzy_team_achievement_2",
        metaKey: "member_lawzy_team_achievement_2_meta",
      },
      ...LAWZY_CORE_TEAM_ACHIEVEMENTS,
    ],
    statuses: [
      { textKey: "member_quan_huynh_status_1" },
      { textKey: "member_quan_huynh_status_2" },
      ...LAWZY_CORE_TEAM_STATUSES,
    ],
  },
] as const;
