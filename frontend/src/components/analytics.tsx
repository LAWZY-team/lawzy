"use client";

import { useEffect } from "react";
import Script from "next/script";
import Clarity from "@microsoft/clarity";

const GA_ID = "G-B3HVV5TRC8";
const CLARITY_ID = "vkam25ucyu";

export function Analytics() {
  useEffect(() => {
    Clarity.init(CLARITY_ID);
  }, []);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
