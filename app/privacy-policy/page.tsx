import type { Metadata } from "next";
import PrivacyPolicy, { generateMetadata as baseGenerateMetadata } from "../privacy/page";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await baseGenerateMetadata();
  return {
    ...meta,
    alternates: {
      canonical: "/privacy",
    },
  };
}

export const revalidate = 86400;

export default PrivacyPolicy;
