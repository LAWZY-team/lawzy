type JsonLdProps = { data: Record<string, unknown> | Record<string, unknown>[] };

/**
 * Injects Schema.org JSON-LD. Use only with trusted, server-built objects.
 */
export function JsonLdScript({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} suppressHydrationWarning />
  );
}
