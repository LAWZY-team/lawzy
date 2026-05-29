import Image from "next/image";
import { cn } from "@/lib/utils";

type LandingPartnerLogoProps = {
  src: string;
  /** Descriptive alt for SEO and accessibility (organization name). */
  alt: string;
  maxWidthClass?: string;
  className?: string;
};

/**
 * Partner / press logo with intrinsic aspect ratio preserved (Next.js Image warning-safe).
 */
export const LandingPartnerLogo = ({
  src,
  alt,
  maxWidthClass = "max-w-[150px]",
  className,
}: LandingPartnerLogoProps) => (
  <Image
    src={src}
    alt={alt}
    width={220}
    height={88}
    sizes="(max-width: 640px) 140px, 180px"
    loading="lazy"
    className={cn("h-auto w-auto max-h-full object-contain", maxWidthClass, className)}
  />
);
