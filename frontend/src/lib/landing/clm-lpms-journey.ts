/**
 * CLM × LPMS journey section — structure and i18n key references.
 * Copy lives in landing-messages.ts (vi/en).
 */
export type JourneySideKeys = {
  titleKey: string;
  badgeKey: string;
  headlineKey: string;
  summaryKey: string;
  expandedKey: string;
  outcomeKey: string;
};

export type JourneyStageConfig = {
  id: string;
  stageKey: string;
  titleKey: string;
  displayTitleKey: string;
  clm: JourneySideKeys;
  lpms: JourneySideKeys;
  bridgeKey?: string;
  bridgeNoteKey?: string;
};

export type JourneyValueBlockKeys = {
  productKey: string;
  systemKey: string;
  valueKey: string;
  audienceKey: string;
};

export const CLM_LPMS_JOURNEY = {
  sectionTitleKey: "journey_section_title",
  sectionSubtitleKey: "journey_section_subtitle",
  sectionHighlightKey: "journey_section_highlight",
  valuePropositionTitleKey: "journey_value_title",
  valueLabelKey: "journey_value_label",
  audienceLabelKey: "journey_audience_label",
  expandMoreKey: "journey_expand_more",
  expandLessKey: "journey_expand_less",
  previousStageKey: "journey_previous_stage",
  nextStageKey: "journey_next_stage",
  bridgeLabelKey: "journey_bridge_label",
  stagesTitleKey: "journey_stages_title",
  clmColumnLabelKey: "journey_clm_column",
  lpmsColumnLabelKey: "journey_lpms_column",
  clmValue: {
    productKey: "journey_clm_product",
    systemKey: "journey_clm_system",
    valueKey: "journey_clm_value",
    audienceKey: "journey_clm_audience",
  } satisfies JourneyValueBlockKeys,
  lpmsValue: {
    productKey: "journey_lpms_product",
    systemKey: "journey_lpms_system",
    valueKey: "journey_lpms_value",
    audienceKey: "journey_lpms_audience",
  } satisfies JourneyValueBlockKeys,
  stages: [
    {
      id: "stage-1",
      stageKey: "01",
      titleKey: "journey_stage1_title",
      displayTitleKey: "journey_stage1_display_title",
      clm: {
        titleKey: "journey_clm_column",
        badgeKey: "journey_stage1_clm_badge",
        headlineKey: "journey_stage1_clm_headline",
        summaryKey: "journey_stage1_clm_summary",
        expandedKey: "journey_stage1_clm_expanded",
        outcomeKey: "journey_stage1_clm_outcome",
      },
      lpms: {
        titleKey: "journey_lpms_column",
        badgeKey: "journey_stage1_lpms_badge",
        headlineKey: "journey_stage1_lpms_headline",
        summaryKey: "journey_stage1_lpms_summary",
        expandedKey: "journey_stage1_lpms_expanded",
        outcomeKey: "journey_stage1_lpms_outcome",
      },
    },
    {
      id: "stage-2",
      stageKey: "02",
      titleKey: "journey_stage2_title",
      displayTitleKey: "journey_stage2_display_title",
      bridgeKey: "journey_stage2_bridge",
      bridgeNoteKey: "journey_stage2_bridge_note",
      clm: {
        titleKey: "journey_clm_column",
        badgeKey: "journey_stage2_clm_badge",
        headlineKey: "journey_stage2_clm_headline",
        summaryKey: "journey_stage2_clm_summary",
        expandedKey: "journey_stage2_clm_expanded",
        outcomeKey: "journey_stage2_clm_outcome",
      },
      lpms: {
        titleKey: "journey_lpms_column",
        badgeKey: "journey_stage2_lpms_badge",
        headlineKey: "journey_stage2_lpms_headline",
        summaryKey: "journey_stage2_lpms_summary",
        expandedKey: "journey_stage2_lpms_expanded",
        outcomeKey: "journey_stage2_lpms_outcome",
      },
    },
    {
      id: "stage-3",
      stageKey: "03",
      titleKey: "journey_stage3_title",
      displayTitleKey: "journey_stage3_display_title",
      clm: {
        titleKey: "journey_clm_column",
        badgeKey: "journey_stage3_clm_badge",
        headlineKey: "journey_stage3_clm_headline",
        summaryKey: "journey_stage3_clm_summary",
        expandedKey: "journey_stage3_clm_expanded",
        outcomeKey: "journey_stage3_clm_outcome",
      },
      lpms: {
        titleKey: "journey_lpms_column",
        badgeKey: "journey_stage3_lpms_badge",
        headlineKey: "journey_stage3_lpms_headline",
        summaryKey: "journey_stage3_lpms_summary",
        expandedKey: "journey_stage3_lpms_expanded",
        outcomeKey: "journey_stage3_lpms_outcome",
      },
    },
    {
      id: "stage-4",
      stageKey: "04",
      titleKey: "journey_stage4_title",
      displayTitleKey: "journey_stage4_display_title",
      clm: {
        titleKey: "journey_clm_column",
        badgeKey: "journey_stage4_clm_badge",
        headlineKey: "journey_stage4_clm_headline",
        summaryKey: "journey_stage4_clm_summary",
        expandedKey: "journey_stage4_clm_expanded",
        outcomeKey: "journey_stage4_clm_outcome",
      },
      lpms: {
        titleKey: "journey_lpms_column",
        badgeKey: "journey_stage4_lpms_badge",
        headlineKey: "journey_stage4_lpms_headline",
        summaryKey: "journey_stage4_lpms_summary",
        expandedKey: "journey_stage4_lpms_expanded",
        outcomeKey: "journey_stage4_lpms_outcome",
      },
    },
  ] as const satisfies readonly JourneyStageConfig[],
} as const;
