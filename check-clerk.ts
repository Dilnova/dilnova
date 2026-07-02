import { clerkClient } from '@clerk/nextjs/server';

async function check() {
  const client1 = await clerkClient();
  console.log('clerkClient() result type:', typeof client1);
}
check();
