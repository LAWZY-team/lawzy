import PublicShareTokenClient from "./public-share-token-client"

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <PublicShareTokenClient token={token} />
}

