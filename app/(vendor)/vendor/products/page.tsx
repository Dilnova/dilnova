import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function VendorProductsRedirectPage() {
  const { orgRole } = await auth();
  redirect(orgRole === "org:admin" ? "/vendor?tab=catalog" : "/vendor");
}
