"use client";

import { PolicyModal } from "./policy-modal";

/** Modal Chính Sách Bảo Mật - wrapper của PolicyModal */
export function PrivacyModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  requireScrollToBottom?: boolean;
}) {
  return (
    <PolicyModal
      {...props}
      slug="privacy-policy"
      title="Chính Sách Bảo Mật"
      requireScrollToBottom={props.requireScrollToBottom ?? true}
    />
  );
}
