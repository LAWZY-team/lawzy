"use client"

import * as React from "react"
import { AutofillFullEditorView } from "@/app/lpms/autofill/components/AutofillFullEditorView"

export default function LpmsAutofillEditorPage({
  params,
}: {
  params: Promise<{ bundleId: string; docId: string }>
}) {
  const resolvedParams = React.use(params)
  return <AutofillFullEditorView bundleId={resolvedParams.bundleId} docId={resolvedParams.docId} />
}
