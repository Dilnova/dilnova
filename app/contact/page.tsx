import SupportPage, { generateMetadata as generateSupportMetadata } from "../support/page";

export const revalidate = 3600;

export async function generateMetadata() {
  return generateSupportMetadata();
}

export default function ContactPage() {
  return <SupportPage />;
}
