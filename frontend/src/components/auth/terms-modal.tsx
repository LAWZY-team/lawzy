"use client";

import { PolicyModal } from "./policy-modal";

/** Modal Điều Khoản Sử Dụng - wrapper của PolicyModal */
export function TermsModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  requireScrollToBottom?: boolean;
}) {
  return (
    <PolicyModal
      {...props}
      slug="term"
      title="Điều Khoản Sử Dụng"
      requireScrollToBottom={props.requireScrollToBottom ?? true}
    />
  );
}
