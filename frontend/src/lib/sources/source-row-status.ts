/**
 * Shared status badge config for source tables and the source detail modal.
 */
export const SOURCE_ROW_STATUS_BADGE: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  pending: { variant: "outline", label: "Pending" },
  processing: { variant: "secondary", label: "Processing" },
  completed: { variant: "default", label: "Completed" },
  error: { variant: "destructive", label: "Error" },
}
