import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChatWindow } from "@/features/chat";
import { getConversationDetailById } from "@/features/chat/queries";

interface CustomerChatPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function CustomerChatPage({ params }: CustomerChatPageProps) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect("/sign-in");
  }

  const { conversationId } = await params;
  const conversation = await getConversationDetailById(conversationId);

  if (!conversation || conversation.customerUserId !== userId) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
          <span className="text-4xl block mb-3">⚠️</span>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Conversation Not Found
          </h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-6">
            The requested chat thread either does not exist or you do not have permission to view
            it.
          </p>
          <Link
            href="/customer?tab=orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition"
          >
            &larr; Back to Your Orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-3 sm:px-6 py-6 font-sans w-full">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/customer?tab=orders"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition flex items-center gap-1.5"
        >
          &larr; Back to Order History
        </Link>
        <span className="text-xs font-mono text-zinc-400">
          Order #{conversation.orderId.slice(0, 8)}
        </span>
      </div>

      <div className="h-[75vh] min-h-[500px]">
        <ChatWindow
          conversationId={conversationId}
          currentUserId={userId}
          currentUserRole="customer"
          titleOverride={`Order #${conversation.orderId.slice(0, 8)} Assistance`}
        />
      </div>
    </main>
  );
}
