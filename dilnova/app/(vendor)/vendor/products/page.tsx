import { redirect } from 'next/navigation';

export default async function VendorProductsRedirectPage() {
  redirect('/vendor?tab=catalog');
}
