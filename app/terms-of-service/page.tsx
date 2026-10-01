import type { Metadata } from "next";
import TermsOfService, { generateMetadata as baseGenerateMetadata } from "../terms/page";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await baseGenerateMetadata();
  return {
    ...meta,
    alternates: {
      canonical: "/terms",
    },
  };
}

export const revalidate = 86400;

export default TermsOfService;
