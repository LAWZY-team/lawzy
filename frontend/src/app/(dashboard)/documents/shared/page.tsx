import { redirect } from "next/navigation"

export default function SharedDocumentsRedirect() {
  redirect("/documents?tab=shared")
}
