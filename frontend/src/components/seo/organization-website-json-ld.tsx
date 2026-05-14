import { JsonLdScript } from "./json-ld";
import { getPublicSiteUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

/**
 * Organization + WebSite graph for the marketing site (single injection per layout).
 */
export function OrganizationWebsiteJsonLd() {
  const url = getPublicSiteUrl();
  const logoUrl = toAbsoluteUrl("/logo/lawzy-logo-whitebg.png");
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: "LAWZY",
        url,
        logo: { "@type": "ImageObject", url: logoUrl },
        sameAs: [
          "https://www.facebook.com/lawzy.vn",
          "https://www.youtube.com/@Lawzy-vn",
          "https://www.linkedin.com/company/lawzy-vn",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: "LAWZY",
        publisher: { "@id": `${url}/#organization` },
        inLanguage: "vi-VN",
      },
    ],
  };
  return <JsonLdScript data={data} />;
}
