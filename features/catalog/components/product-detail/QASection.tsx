'use client';

import { logger } from '@/shared/logging/logger';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitQuestionAction, submitAnswerAction } from '@/features/catalog/product-detail.actions';
import Image from 'next/image';
import SignInPrompt from '@/shared/ui/SignInPrompt';
import { toast } from 'sonner';

interface Question {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userImageUrl: string | null;
  content: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: Date | null;
  createdAt: Date;
}

interface QASectionProps {
  productId: string;
  questions: Question[];
  isLoggedIn: boolean;
  productOrgId: string;
  userOrgId: string | null;
}

export default function QASection({
  productId,
  questions,
  isLoggedIn,
  productOrgId,
  userOrgId,
}: QASectionProps) {
  const router = useRouter();
  const [questionContent, setQuestionContent] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isReplyPending, startReplyTransition] = useTransition();

  const isVendorOwner = productOrgId && userOrgId === productOrgId;

  // Handle Question Submission
  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionContent.trim()) {
      toast.error('Question content cannot be empty.');
      return;
    }

    startTransition(async () => {
      try {
        await submitQuestionAction(productId, questionContent);
        toast.success('Your question has been posted.');
        setQuestionContent('');
        router.refresh();
      } catch (err) {
        logger.error('Error posting question:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to post question.');
      }
    });
  };

  // Handle Answer Submission
  const handleAnswerQuestion = (questionId: string) => {
    if (!replyContent.trim()) {
      toast.error('Answer content cannot be empty.');
      return;
    }

    startReplyTransition(async () => {
      try {
        await submitAnswerAction(questionId, replyContent);
        toast.success('Answer posted successfully.');
        setReplyContent('');
        setActiveReplyId(null);
        router.refresh();
      } catch (err) {
        logger.error('Error replying to question:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to save answer.');
      }
    });
  };

  return (
    <div className="space-y-8 bg-white border border-zinc-200 rounded-3xl p-6 lg:p-10 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm mt-8">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Questions & Answers
        </h2>
        <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">
          Community Discussions
        </p>
      </div>

      {/* Questions List */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
        {questions.length === 0 ? (
          <div className="text-center py-10 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl dark:bg-zinc-900/10 dark:border-zinc-800">
            <span className="text-3xl">❓</span>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-450 mt-2">
              No Questions Yet
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-normal">
              Have questions about sizing, customization, or shipping? Ask the vendor below.
            </p>
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="p-5 border border-zinc-150 rounded-2xl bg-zinc-50/10 dark:border-zinc-900 dark:bg-zinc-900/10 space-y-4"
            >
              {/* Question Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {q.userImageUrl ? (
                      <Image
                        src={q.userImageUrl}
                        alt={q.userName}
                        width={24}
                        height={24}
                        className="rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
                        {q.userName.charAt(0)}
                      </div>
                    )}
                    <span className="font-bold text-zinc-800 dark:text-zinc-255">
                      {q.userName}
                    </span>
                    <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[9px] font-semibold dark:bg-zinc-800 dark:text-zinc-400 uppercase tracking-wider">
                      Question
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {new Date(q.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 pl-8 leading-snug">
                  {q.content}
                </p>
              </div>

              {/* Answer Details */}
              {q.answer ? (
                <div className="border-t border-zinc-200/50 dark:border-zinc-900 pt-3 pl-8 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-purple-150 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      Vendor Reply
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      {q.answeredAt &&
                        new Date(q.answeredAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-605 dark:text-zinc-350 leading-relaxed italic">
                    &ldquo;{q.answer}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="border-t border-zinc-100 dark:border-zinc-900/50 pt-3 pl-8">
                  {isVendorOwner ? (
                    activeReplyId === q.id ? (
                      <div className="space-y-3">
                        <textarea
                          rows={2}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Type your response to the customer..."
                          className="w-full text-xs rounded-xl border border-zinc-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-zinc-800 dark:bg-zinc-900/50 transition-all"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAnswerQuestion(q.id)}
                            disabled={isReplyPending}
                            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isReplyPending ? 'Submitting...' : 'Post Answer'}
                          </button>
                          <button
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyContent('');
                            }}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveReplyId(q.id);
                          setReplyContent('');
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        Reply as Vendor &rarr;
                      </button>
                    )
                  ) : (
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-550 font-mono italic">
                      ⏳ Pending response from seller...
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Ask Question Form */}
      {isLoggedIn && !isVendorOwner && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mt-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 font-mono">
            Ask a Question
          </h3>

          <form onSubmit={handleAskQuestion} className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <textarea
                rows={3}
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
                placeholder="Ask about dimensions, services, material configurations, shipping, etc."
                className="w-full text-xs rounded-xl border border-zinc-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:border-zinc-800 dark:bg-zinc-900/50 dark:focus:ring-purple-500 transition-all"
                maxLength={500}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-900/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? 'Posting...' : 'Post Question'}
            </button>
          </form>
        </div>
      )}

      {isLoggedIn && isVendorOwner && (
        <p className="text-xs text-zinc-450 dark:text-zinc-550 border-t border-zinc-100 dark:border-zinc-900 pt-4 font-mono italic">
          ℹ️ You are viewing this page as the product seller. Use the inline buttons on user questions to respond.
        </p>
      )}

      {!isLoggedIn && (
        <SignInPrompt message="🔒 Please sign in to submit a question." />
      )}
    </div>
  );
}
