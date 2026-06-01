export type ContactModalIntent = "default" | "lpms";

export const LPMS_PRODUCT_PATH = "/products/lpms";

export const isLpmsContactPath = (pathname: string | null): boolean =>
  pathname != null && pathname.includes(LPMS_PRODUCT_PATH);

type ContactModalCopyKey =
  | "title"
  | "subtitle"
  | "benefit_1"
  | "benefit_2"
  | "company"
  | "company_placeholder"
  | "message"
  | "message_placeholder"
  | "submit"
  | "success_desc";

const CONTACT_MODAL_COPY_KEYS: Record<ContactModalIntent, Record<ContactModalCopyKey, string>> = {
  default: {
    title: "contact_modal_title",
    subtitle: "contact_modal_subtitle",
    benefit_1: "contact_modal_benefit_1",
    benefit_2: "contact_modal_benefit_2",
    company: "contact_modal_company",
    company_placeholder: "contact_modal_company_placeholder",
    message: "contact_modal_message",
    message_placeholder: "contact_modal_message_placeholder",
    submit: "contact_modal_submit",
    success_desc: "contact_modal_success_desc",
  },
  lpms: {
    title: "contact_modal_lpms_title",
    subtitle: "contact_modal_lpms_subtitle",
    benefit_1: "contact_modal_lpms_benefit_1",
    benefit_2: "contact_modal_lpms_benefit_2",
    company: "contact_modal_lpms_company",
    company_placeholder: "contact_modal_lpms_company_placeholder",
    message: "contact_modal_lpms_message",
    message_placeholder: "contact_modal_lpms_message_placeholder",
    submit: "contact_modal_lpms_submit",
    success_desc: "contact_modal_lpms_success_desc",
  },
};

export const getContactModalCopyKey = (intent: ContactModalIntent, field: ContactModalCopyKey): string =>
  CONTACT_MODAL_COPY_KEYS[intent][field];
