"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Zap,
  Loader2,
  Clock,
  Check,
  Eye,
  EyeOff,
  ShoppingBag,
  Send,
  Share2,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  Info,
} from "lucide-react";
import {
  getSocialSettingsAction,
  saveSocialSettingsAction,
  testFacebookPageConnectionAction,
  testInstagramConnectionAction,
  testWebhookAction,
  triggerBatchFacebookFeedPostAction,
  discoverFacebookPagesAction,
  discoverInstagramAccountAction,
} from "@/features/social-share/actions";
import {
  testFacebookShopConnectionAction,
  triggerBatchFacebookShopSyncAction,
  getFacebookShopSyncLogsAction,
} from "@/features/facebook-shop/actions";

interface SyncLogItem {
  id: string;
  action: string;
  status: string;
  productName: string | null;
  productSku: string | null;
  metaBatchHandle: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

type ActiveTab = "facebook_feed" | "meta_catalog" | "instagram_feed" | "webhooks";

export default function SocialSettingsHubPage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("facebook_feed");

  // Form State
  const [catalogId, setCatalogId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [facebookPageAccessToken, setFacebookPageAccessToken] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [customPostTemplate, setCustomPostTemplate] = useState("");

  // Automation Toggles
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoPostFacebookFeed, setAutoPostFacebookFeed] = useState(true);
  const [autoPostInstagramFeed, setAutoPostInstagramFeed] = useState(false);
  const [autoSyncMetaCatalog, setAutoSyncMetaCatalog] = useState(true);
  const [autoTriggerWebhook, setAutoTriggerWebhook] = useState(false);

  // UI state
  const [showCatalogToken, setShowCatalogToken] = useState(false);
  const [showPageToken, setShowPageToken] = useState(false);
  const [hasExistingCatalogToken, setHasExistingCatalogToken] = useState(false);
  const [hasExistingPageToken, setHasExistingPageToken] = useState(false);

  const [syncStatus, setSyncStatus] = useState<string>("disconnected");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  // Feedback notifications
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [batchSyncResult, setBatchSyncResult] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);
  const [batchFeedResult, setBatchFeedResult] = useState<{
    total: number;
    success: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [isBulkPostingFeed, setIsBulkPostingFeed] = useState(false);

  // Facebook Page Auto-Discovery state
  const [discoveredPages, setDiscoveredPages] = useState<
    Array<{ id: string; name: string; link?: string; pictureUrl?: string; accessToken?: string }>
  >([]);
  const [isDiscoveringPages, setIsDiscoveringPages] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Instagram Auto-Discovery state
  const [isDiscoveringInstagram, setIsDiscoveringInstagram] = useState(false);
  const [instagramDiscoveryError, setInstagramDiscoveryError] = useState<string | null>(null);
  const [discoveredInstagramAccount, setDiscoveredInstagramAccount] = useState<{
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
  } | null>(null);

  // Logs
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const res = await getSocialSettingsAction();
      if (res?.data?.integration) {
        const intg = res.data.integration;
        setCatalogId(intg.catalogId || "");
        setBrandName(intg.brandName || "");
        setFacebookPageId(intg.facebookPageId || "");
        setInstagramAccountId(intg.instagramAccountId || "");
        setWebhookUrl(intg.webhookUrl || "");
        setCustomPostTemplate(intg.customPostTemplate || "");

        setIsEnabled(intg.isEnabled);
        setAutoPostFacebookFeed(intg.autoPostFacebookFeed);
        setAutoPostInstagramFeed(intg.autoPostInstagramFeed);
        setAutoSyncMetaCatalog(intg.autoSyncMetaCatalog);
        setAutoTriggerWebhook(intg.autoTriggerWebhook);

        setSyncStatus(intg.syncStatus);
        setLastSyncAt(intg.lastSyncAt ? new Date(intg.lastSyncAt) : null);
        setLastErrorMessage(intg.lastErrorMessage || null);

        setHasExistingCatalogToken(Boolean(intg.hasAccessToken));
        setHasExistingPageToken(Boolean(intg.hasPageAccessToken));

        if (intg.hasAccessToken) {
          setAccessToken("••••••••••••••••••••••••••••••••");
        }
        if (intg.hasPageAccessToken) {
          setFacebookPageAccessToken("••••••••••••••••••••••••••••••••");
        }
      }
    } catch {
      // Gracefully handle load error
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const res = await getFacebookShopSyncLogsAction({ page: 1, pageSize: 20 });
      if (res?.data?.logs) {
        setLogs(res.data.logs as SyncLogItem[]);
      }
    } catch {
      // Ignore
    } finally {
      setLogsLoading(false);
    }
  }

  const handleDiscoverPages = () => {
    const tokenToUse = facebookPageAccessToken.trim() || accessToken.trim();
    if (!tokenToUse && !hasExistingPageToken && !hasExistingCatalogToken) {
      setDiscoveryError(
        "Please paste an Access Token in Step 1 first (e.g. from Graph API Explorer).",
      );
      return;
    }

    setDiscoveryError(null);
    setIsDiscoveringPages(true);

    startTransition(async () => {
      try {
        const res = await discoverFacebookPagesAction({
          accessToken: tokenToUse.includes("••••") ? undefined : tokenToUse || undefined,
          pageIdHint: facebookPageId.trim() || undefined,
        });
        if (res?.data?.pages && res.data.pages.length > 0) {
          setDiscoveredPages(res.data.pages);
          setSaveSuccess(
            `Found ${res.data.pages.length} Facebook Page(s)! Select your page below.`,
          );
        } else {
          setDiscoveryError(
            "No managed Facebook Pages found. You can also enter your Page ID (1366821166509556) in the numeric box below.",
          );
        }
      } catch (err) {
        setDiscoveryError(
          err instanceof Error ? err.message : "Failed to discover Facebook Pages.",
        );
      } finally {
        setIsDiscoveringPages(false);
      }
    });
  };

  const handleSelectDiscoveredPage = (page: {
    id: string;
    name: string;
    link?: string;
    pictureUrl?: string;
    accessToken?: string;
  }) => {
    setFacebookPageId(page.id);
    if (page.accessToken) {
      setFacebookPageAccessToken(page.accessToken);
    }
    setTestResult({
      valid: true,
      message: `Selected Page: "${page.name}" (${page.id}). Ready to save!`,
    });
    setSaveSuccess(`Selected ${page.name}! Click "Save Facebook Settings" below to apply.`);
  };

  const handleTestFacebookPage = () => {
    const pageId = facebookPageId.trim();
    const token = facebookPageAccessToken.trim() || accessToken.trim();

    if (!pageId) {
      setTestResult({
        valid: false,
        message: "Please enter or select a valid Facebook Page ID.",
      });
      return;
    }

    if (!token && !hasExistingPageToken && !hasExistingCatalogToken) {
      setTestResult({
        valid: false,
        message: "Please enter a valid Page Access Token or save your settings first.",
      });
      return;
    }

    setTestResult(null);
    startTransition(async () => {
      try {
        const res = await testFacebookPageConnectionAction({
          facebookPageId: pageId,
          facebookPageAccessToken: token.includes("••••") ? undefined : token || undefined,
        });

        if (res?.data?.success) {
          setTestResult({
            valid: true,
            message: `Facebook Page Verified: "${res.data.pageName || pageId}"! Ready to auto-post.`,
          });
        } else {
          setTestResult({
            valid: false,
            message: res?.serverError || "Failed to connect to Facebook Page.",
          });
        }
      } catch (err) {
        setTestResult({
          valid: false,
          message: err instanceof Error ? err.message : "Network error contacting Facebook.",
        });
      }
    });
  };

  const handleTestCatalog = () => {
    if (!catalogId.trim() || (!accessToken.trim() && !hasExistingCatalogToken)) {
      setTestResult({
        valid: false,
        message: "Please enter a valid Meta Catalog ID and System User Access Token.",
      });
      return;
    }

    setTestResult(null);
    startTransition(async () => {
      try {
        const res = await testFacebookShopConnectionAction({
          catalogId: catalogId.trim(),
          accessToken: accessToken.includes("••••") ? "" : accessToken.trim(),
        });

        if (res?.data?.success) {
          setTestResult({
            valid: true,
            message: `Meta Catalog Verified: "${res.data.catalogName || catalogId}"!`,
          });
        } else {
          setTestResult({
            valid: false,
            message: res?.serverError || "Verification failed.",
          });
        }
      } catch (err) {
        setTestResult({
          valid: false,
          message: err instanceof Error ? err.message : "Network error testing connection.",
        });
      }
    });
  };

  const handleDiscoverInstagram = () => {
    const tokenToUse = facebookPageAccessToken.trim() || accessToken.trim();
    const pageIdToUse = facebookPageId.trim();

    if (!pageIdToUse) {
      setInstagramDiscoveryError(
        "Please configure and save your Facebook Page ID in the Facebook Feed tab first.",
      );
      return;
    }

    if (!tokenToUse && !hasExistingPageToken && !hasExistingCatalogToken) {
      setInstagramDiscoveryError("Please paste or save your Meta Access Token first.");
      return;
    }

    setInstagramDiscoveryError(null);
    setIsDiscoveringInstagram(true);

    startTransition(async () => {
      try {
        const res = await discoverInstagramAccountAction({
          facebookPageId: pageIdToUse,
          accessToken: tokenToUse.includes("••••") ? undefined : tokenToUse || undefined,
        });

        if (res?.data?.account) {
          const acc = res.data.account;
          setInstagramAccountId(acc.id);
          setDiscoveredInstagramAccount(acc);
          setTestResult({
            valid: true,
            message: `Connected to Instagram: @${acc.username}! Click "Save Instagram Settings" to apply.`,
          });
          setSaveSuccess(
            `Found Instagram Account: @${acc.username}! Click "Save Instagram Settings" below.`,
          );
        } else {
          setInstagramDiscoveryError(
            "No linked Instagram Professional/Business account found for this Facebook Page. Link your Instagram account in Meta Business Suite first.",
          );
        }
      } catch (err) {
        setInstagramDiscoveryError(
          err instanceof Error ? err.message : "Failed to find linked Instagram account.",
        );
      } finally {
        setIsDiscoveringInstagram(false);
      }
    });
  };

  const handleTestInstagram = () => {
    const igId = instagramAccountId.trim();
    const token = facebookPageAccessToken.trim() || accessToken.trim();

    if (!igId) {
      setTestResult({
        valid: false,
        message: "Please enter or auto-detect your Instagram Business Account ID.",
      });
      return;
    }

    if (!token && !hasExistingPageToken && !hasExistingCatalogToken) {
      setTestResult({
        valid: false,
        message: "Please enter your Meta Access Token or save your settings first.",
      });
      return;
    }

    setTestResult(null);
    startTransition(async () => {
      try {
        const res = await testInstagramConnectionAction({
          instagramAccountId: igId,
          accessToken: token.includes("••••") ? undefined : token || undefined,
        });

        if (res?.data?.success) {
          setTestResult({
            valid: true,
            message: `Instagram Verified: @${res.data.username || igId}!`,
          });
        } else {
          setTestResult({
            valid: false,
            message: res?.serverError || "Failed to verify Instagram account.",
          });
        }
      } catch (err) {
        setTestResult({
          valid: false,
          message: err instanceof Error ? err.message : "Network error testing connection.",
        });
      }
    });
  };

  const handleTestWebhook = () => {
    if (!webhookUrl.trim()) {
      setTestResult({
        valid: false,
        message: "Please enter a valid Webhook URL.",
      });
      return;
    }

    setTestResult(null);
    startTransition(async () => {
      try {
        const res = await testWebhookAction({ webhookUrl: webhookUrl.trim() });
        if (res?.data?.success) {
          setTestResult({
            valid: true,
            message: "Webhook Ping Successful (HTTP 200 OK)!",
          });
        } else {
          setTestResult({
            valid: false,
            message: res?.serverError || "Webhook returned an error response.",
          });
        }
      } catch (err) {
        setTestResult({
          valid: false,
          message: err instanceof Error ? err.message : "Network error testing webhook.",
        });
      }
    });
  };

  const handleSave = () => {
    setSaveError(null);
    setSaveSuccess(null);

    startTransition(async () => {
      try {
        const res = await saveSocialSettingsAction({
          catalogId: catalogId.trim() || undefined,
          accessToken: accessToken.trim() || undefined,
          facebookPageId: facebookPageId.trim() || undefined,
          facebookPageAccessToken: facebookPageAccessToken.trim() || undefined,
          instagramAccountId: instagramAccountId.trim() || undefined,
          webhookUrl: webhookUrl.trim() || undefined,
          brandName: brandName.trim() || undefined,
          customPostTemplate: customPostTemplate.trim() || undefined,
          isEnabled,
          autoPostFacebookFeed,
          autoPostInstagramFeed,
          autoSyncMetaCatalog,
          autoTriggerWebhook,
        });

        if (res?.data?.success) {
          setSaveSuccess("Social publishing configuration saved successfully!");
          setSyncStatus("connected");
          loadLogs();
        } else {
          setSaveError(res?.serverError || "Failed to save settings.");
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Unexpected error saving settings.");
      }
    });
  };

  const handleBatchCatalogSync = () => {
    setBatchSyncResult(null);
    startTransition(async () => {
      try {
        const res = await triggerBatchFacebookShopSyncAction({ forceAll: true });
        if (res?.data?.success) {
          setBatchSyncResult({
            total: res.data.totalProducts ?? 0,
            success: res.data.totalSuccess ?? 0,
            failed: res.data.totalFailed ?? 0,
          });
          setLastSyncAt(new Date());
          loadLogs();
        } else {
          setSaveError(res?.serverError || "Batch catalog sync failed.");
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Unexpected error during batch sync.");
      }
    });
  };

  const handleBatchFacebookFeedPublish = () => {
    setBatchFeedResult(null);
    setSaveError(null);
    setSaveSuccess(null);
    setIsBulkPostingFeed(true);

    startTransition(async () => {
      try {
        const res = await triggerBatchFacebookFeedPostAction();
        if (res?.data) {
          setBatchFeedResult({
            total: res.data.totalCount,
            success: res.data.totalSuccess,
            skipped: res.data.skippedCount ?? 0,
            failed: res.data.totalFailed,
          });
          setSaveSuccess(res.data.message || "Bulk Facebook Feed publishing completed!");
          loadLogs();
        } else {
          setSaveError(res?.serverError || "Bulk Facebook Feed publishing failed.");
        }
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Unexpected error bulk publishing to Facebook Feed.",
        );
      } finally {
        setIsBulkPostingFeed(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-3" />
        <p className="text-xs font-mono text-zinc-500">Loading social media channels...</p>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 font-sans">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-6">
        <Link href="/vendor" className="hover:text-zinc-900 dark:hover:text-zinc-200">
          Vendor Console
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
          Social Media & Messaging Automation
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-md shrink-0">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
                Multi-Channel Social Publishing
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  syncStatus === "connected"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {syncStatus === "connected" ? (
                  <>
                    <Check className="h-3 w-3" /> Active
                  </>
                ) : (
                  "Ready"
                )}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Publish products to Facebook Page feeds, WhatsApp Status, Instagram, and Meta Catalogs
              with automated triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-purple-500" />
            {showGuide ? "Hide Platform Guide" : "View Platform Guide"}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {lastErrorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Last Sync Notice:</span>
            <span>{lastErrorMessage}</span>
          </div>
        </div>
      )}

      {/* Master Platform Requirements & Restrictions Overview */}
      {showGuide && (
        <div className="bg-gradient-to-br from-zinc-50 to-purple-50/40 dark:from-zinc-900/90 dark:to-purple-950/30 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 mb-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> Platform Comparison, Requirements &
              Restrictions
            </h2>
            <span className="text-[10px] font-mono text-zinc-400">Multi-Vendor Setup Guide</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Facebook Feed */}
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-blue-100 dark:border-blue-950/60 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    📢 Facebook Feed
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Easy (5m)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Auto-posts photos, prices, and links to your Page timeline on product creation.
                </p>
                <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Zero domain verification
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> 100% Global availability
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3" /> Needs Facebook Page Admin
                  </div>
                </div>
              </div>
            </div>

            {/* 2. WhatsApp 1-Click */}
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    🟢 WhatsApp 1-Click
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    0 Setup
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                  1-Tap button in your catalog to share formatted products to WhatsApp Status &
                  chats.
                </p>
                <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Ready out of the box
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Pre-filled price & checkout link
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Works on Mobile & Desktop
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Instagram Auto-Poster */}
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-pink-100 dark:border-pink-950/60 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-pink-700 dark:text-pink-400">
                    📸 Instagram Feed
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Moderate (10m)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Publishes photo posts & captions to your Instagram Business account via Graph API.
                </p>
                <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3" /> Must be IG Business/Creator
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3" /> Must link IG to Facebook Page
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3" /> 25 posts/24h Meta rate limit
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Meta Commerce Catalog */}
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-purple-100 dark:border-purple-950/60 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                    🛍️ Meta Catalog
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    Advanced
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Syncs catalog inventory for Facebook Shop, WhatsApp Business Catalog, and ad tags.
                </p>
                <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Powers WhatsApp Catalog
                  </div>
                  <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="h-3 w-3" /> Shop Tab needs Domain Check
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3" /> System User Token required
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segmented Channel Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-900/80 p-1.5 rounded-2xl mb-8 border border-zinc-200/80 dark:border-zinc-800 max-w-2xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab("facebook_feed");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "facebook_feed"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>📢</span> Facebook Feed
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("meta_catalog");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "meta_catalog"
              ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>🛍️</span> Meta Catalog & Shop
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("instagram_feed");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "instagram_feed"
              ? "bg-white dark:bg-zinc-800 text-pink-600 dark:text-pink-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>📸</span> Instagram
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("webhooks");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "webhooks"
              ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>⚡</span> Webhooks / WhatsApp
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left 2 Columns: Active Channel Form & Configuration Guide */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: Facebook Page Feed Auto-Posting */}
          {activeTab === "facebook_feed" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 font-mono flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Facebook Page Feed Auto-Posting
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Automatically publishes photo posts to your Facebook Page timeline feed whenever
                    a product is added.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>

              {/* Step 1: Get Access Token with Live Meta Redirect Link */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-mono">
                      1
                    </span>
                    Get Your Meta Page Access Token
                  </span>
                  <a
                    href="https://developers.facebook.com/tools/explorer/?method=GET&path=me%2Faccounts&version=v21.0"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm cursor-pointer"
                  >
                    🔑 Open Meta Graph API Explorer <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  In Graph API Explorer, select your Meta App (<strong>Dilnova Catalog Sync</strong>
                  ) and check these 3 permissions:
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    pages_manage_posts
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    pages_read_engagement
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    pages_show_list
                  </span>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Paste Access Token (User or Page Token)
                  </label>
                  <div className="relative">
                    <input
                      type={showPageToken ? "text" : "password"}
                      placeholder={
                        hasExistingPageToken
                          ? "••••••••••••••••••••••••••••••••"
                          : "Paste token starting with EAA..."
                      }
                      value={facebookPageAccessToken}
                      onChange={(e) => setFacebookPageAccessToken(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPageToken(!showPageToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPageToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Auto-Detect & Select Connected Facebook Pages */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-[10px] font-mono">
                      2
                    </span>
                    Select Your Facebook Page
                  </span>
                  <button
                    type="button"
                    onClick={handleDiscoverPages}
                    disabled={isDiscoveringPages || isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDiscoveringPages ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    🔍 Auto-Detect My Facebook Pages
                  </button>
                </div>

                {discoveryError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
                    {discoveryError}
                  </div>
                )}

                {/* Discovered Pages List */}
                {discoveredPages.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-zinc-500 block uppercase tracking-wider">
                      Select your target page:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {discoveredPages.map((page) => {
                        const isSelected = facebookPageId === page.id;
                        return (
                          <div
                            key={page.id}
                            onClick={() => handleSelectDiscoveredPage(page)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? "bg-blue-50/90 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 shadow-xs ring-1 ring-blue-500"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {page.pictureUrl ? (
                                  <img
                                    src={page.pictureUrl}
                                    alt={page.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  page.name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                                  {page.name}
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-blue-600 shrink-0" />
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono truncate">
                                  ID: {page.id}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Manual Numeric Page ID Input */}
                <div className="pt-2">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Facebook Page ID (Numeric)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1366821166509556"
                    value={facebookPageId}
                    onChange={(e) => setFacebookPageId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Your Page ID is automatically filled when selecting from the list above, or you
                    can paste it manually.
                  </span>
                </div>
              </div>

              {/* Step 3: Live Connected Facebook Page Banner (If Page ID set) */}
              {(() => {
                const cleanPageId = facebookPageId.replace(/[^a-zA-Z0-9.-]/g, "");
                if (!cleanPageId) return null;
                const safeUrl = `https://www.facebook.com/${encodeURIComponent(cleanPageId)}`;

                return (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          Connected to Page ID: {cleanPageId}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                          Posts published through Dilnova will appear instantly on this Page
                          timeline feed.
                        </p>
                      </div>
                    </div>
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                    >
                      View Page on Facebook <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                );
              })()}

              {/* Post Caption Customization */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Custom Post Caption Template (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`🛍️ New Arrival: {title}\n💵 Price: {price}\n🛒 Buy: {link}`}
                  value={customPostTemplate}
                  onChange={(e) => setCustomPostTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Supported variables: <code>{"{title}"}</code>, <code>{"{price}"}</code>,{" "}
                  <code>{"{description}"}</code>, <code>{"{link}"}</code>, <code>{"{brand}"}</code>
                </span>
              </div>

              {/* Action Buttons for Facebook Feed */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Facebook Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchFacebookFeedPublish}
                    disabled={isPending || isBulkPostingFeed}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isBulkPostingFeed ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Publishing Feed Posts...
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" /> Bulk Post All to Feed
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestFacebookPage}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" /> Test Connection
                  </button>
                </div>
                {testResult && (
                  <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                      testResult.valid
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                    }`}
                  >
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Meta Commerce Catalog */}
          {activeTab === "meta_catalog" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600 font-mono">
                    Meta Commerce Catalog & WhatsApp Shop
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Syncs full catalog to Meta Commerce Manager for product tagging and WhatsApp
                    Business Catalog.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                  <ShoppingBag className="h-5 w-5" />
                </span>
              </div>

              {/* Catalog Restrictions & Rules Alert */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-2 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Platform Requirements &
                  Restrictions:
                </span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>
                    <strong>WhatsApp Business Catalog</strong>: Fully supported once linked in Meta
                    Commerce Manager under <em>Settings &rarr; Business Assets &rarr; WhatsApp</em>.
                  </li>
                  <li>
                    <strong>Facebook & Instagram Shop Storefront Tabs</strong>: Meta enforces domain
                    ownership verification and region eligibility checks outside the US/EU.
                  </li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Meta Catalog ID (Numeric)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2187911822144469"
                  value={catalogId}
                  onChange={(e) => setCatalogId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Found in{" "}
                  <a
                    href="https://business.facebook.com/commerce"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 underline"
                  >
                    Meta Commerce Manager
                  </a>{" "}
                  under Catalog &rarr; Settings &rarr; Catalog ID.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Meta System User Token
                </label>
                <div className="relative">
                  <input
                    type={showCatalogToken ? "text" : "password"}
                    placeholder={
                      hasExistingCatalogToken
                        ? "••••••••••••••••••••••••••••••••"
                        : "Paste System User Token (EAA...)"
                    }
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCatalogToken(!showCatalogToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showCatalogToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Generated in Meta Business Settings &rarr; System Users with{" "}
                  <code>catalog_management</code> permission.
                </span>
              </div>

              {/* Action Buttons for Catalog */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Catalog Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleTestCatalog}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" /> Test Connection
                  </button>
                </div>
                {testResult && (
                  <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                      testResult.valid
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Instagram Auto-Poster */}
          {activeTab === "instagram_feed" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-pink-600 font-mono flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Instagram Business Auto-Poster
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Automatically publishes photos & promotional captions to your linked Instagram
                    Business or Creator account.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>

              {/* Step 1: Link Instagram to Facebook Page Guide */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/80 to-rose-50/50 dark:from-pink-950/40 dark:to-rose-950/20 border border-pink-100 dark:border-pink-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-pink-900 dark:text-pink-300 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-mono">
                      1
                    </span>
                    Prerequisites for Instagram Publishing
                  </span>
                  <a
                    href="https://business.facebook.com/latest/settings/instagram_account"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white transition-all shadow-sm cursor-pointer"
                  >
                    🔗 Open Meta Instagram Settings <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>
                    Your Instagram must be a <strong>Professional (Business or Creator)</strong>{" "}
                    account.
                  </li>
                  <li>
                    In Meta Business Suite, your Instagram account must be linked to your Facebook
                    Page (<strong>Dil</strong>).
                  </li>
                  <li>
                    Click <strong>Auto-Detect</strong> below to automatically fetch your Instagram
                    Business ID!
                  </li>
                </ol>
              </div>

              {/* Step 2: Auto-Detect Linked Instagram Account */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-[10px] font-mono">
                      2
                    </span>
                    Connect Your Instagram Account
                  </span>
                  <button
                    type="button"
                    onClick={handleDiscoverInstagram}
                    disabled={isDiscoveringInstagram || isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 hover:bg-pink-100 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDiscoveringInstagram ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    🔍 Auto-Detect from Facebook Page
                  </button>
                </div>

                {instagramDiscoveryError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
                    {instagramDiscoveryError}
                  </div>
                )}

                {/* Discovered Instagram Account Card */}
                {discoveredInstagramAccount && (
                  <div className="p-3 rounded-xl bg-pink-50/90 dark:bg-pink-950/50 border border-pink-300 dark:border-pink-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden">
                        {discoveredInstagramAccount.profilePictureUrl ? (
                          <img
                            src={discoveredInstagramAccount.profilePictureUrl}
                            alt={discoveredInstagramAccount.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          "IG"
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-pink-900 dark:text-pink-200 flex items-center gap-1">
                          @{discoveredInstagramAccount.username}
                          <Check className="h-3.5 w-3.5 text-pink-600" />
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          ID: {discoveredInstagramAccount.id}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pink-600 text-white">
                      Connected
                    </span>
                  </div>
                )}

                {/* Manual Numeric Account ID Input */}
                <div className="pt-2">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Instagram Business Account ID (Numeric)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 17841400000000000"
                    value={instagramAccountId}
                    onChange={(e) => setInstagramAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Automatically populated by clicking Auto-Detect above, or found in Meta Business
                    Suite.
                  </span>
                </div>
              </div>

              {/* Step 3: Live Connected Instagram Banner (If Account ID set) */}
              {instagramAccountId && (
                <div className="p-4 rounded-2xl bg-pink-50/70 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      📸
                    </div>
                    <div>
                      <div className="text-xs font-bold text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
                        Connected to Instagram Account ID: {instagramAccountId}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-200/60 dark:bg-pink-900/60 text-pink-800 dark:text-pink-300">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-pink-700/80 dark:text-pink-300/80">
                        Products with images will automatically be published to your Instagram feed
                        grid.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons for Instagram */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Instagram Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleTestInstagram}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-950/30 text-pink-700 dark:text-pink-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" /> Test Connection
                  </button>
                </div>
                {testResult && (
                  <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                      testResult.valid
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                    }`}
                  >
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Webhooks & WhatsApp Bots */}
          {activeTab === "webhooks" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 font-mono">
                    Outbound Webhook / Zapier / WhatsApp Bot
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Dispatches JSON product events to Zapier, Make, n8n, or WhatsApp Cloud API
                    webhook listeners.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <Send className="h-5 w-5" />
                </span>
              </div>

              {/* Webhook Instructions */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 space-y-2 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Integration Capabilities:
                </span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Every product creation or update will POST a structured payload containing{" "}
                  <code>id</code>, <code>name</code>, <code>price</code>, <code>imageUrl</code>, and{" "}
                  <code>currency</code> to your webhook for instant automations in Zapier, Make.com,
                  n8n, or custom WhatsApp Cloud API bots.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Webhook Endpoint URL (HTTPS)
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons for Webhook */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Webhook Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" /> Ping Test
                  </button>
                </div>
                {testResult && (
                  <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                      testResult.valid
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Master Automation Rules & Bulk Push */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-450 font-mono mb-4">
              Automation Triggers
            </h2>

            <div className="space-y-3">
              <label className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Auto-Post to Facebook Feed
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Posts photo on Page when adding product.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoPostFacebookFeed}
                  onChange={(e) => setAutoPostFacebookFeed(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Auto-Post to Instagram Feed
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Publishes photo on Instagram feed.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoPostInstagramFeed}
                  onChange={(e) => setAutoPostInstagramFeed(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Auto-Sync Meta Catalog
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Syncs for Shop & WhatsApp catalog.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSyncMetaCatalog}
                  onChange={(e) => setAutoSyncMetaCatalog(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Trigger Outbound Webhook
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Sends JSON payload on product changes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoTriggerWebhook}
                  onChange={(e) => setAutoTriggerWebhook(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Bulk Facebook Page Feed Publish Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 font-mono mb-1.5 flex items-center gap-1.5">
              <Share2 className="h-4 w-4 text-blue-600" /> Bulk Facebook Page Feed
            </h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-4">
              Publish photos and promotional captions for all active products to your Facebook Page
              timeline.
            </p>
            <button
              onClick={handleBatchFacebookFeedPublish}
              disabled={isPending || isBulkPostingFeed}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {isBulkPostingFeed ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing to Facebook...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Bulk Post All to Facebook Page
                </>
              )}
            </button>

            {batchFeedResult && (
              <div className="mt-3 p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-blue-100 dark:border-zinc-800">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                  Facebook Feed Result:
                </span>
                <div className="flex gap-2.5 text-[11px] flex-wrap">
                  <span className="text-emerald-600 font-bold">
                    ✓ {batchFeedResult.success} Published
                  </span>
                  {batchFeedResult.skipped > 0 && (
                    <span className="text-amber-600 font-bold">
                      ⏭️ {batchFeedResult.skipped} Skipped (No media)
                    </span>
                  )}
                  {batchFeedResult.failed > 0 && (
                    <span className="text-rose-600 font-bold">
                      ✗ {batchFeedResult.failed} Failed
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bulk Sync Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200/70 dark:border-purple-900/50 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 font-mono mb-1.5 flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-purple-600" /> Bulk Catalog Upload
            </h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-4">
              Push your entire active product catalog to Meta in one batch.
            </p>
            <button
              onClick={handleBatchCatalogSync}
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading Batch...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Sync All Products to Meta Catalog
                </>
              )}
            </button>

            {batchSyncResult && (
              <div className="mt-3 p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-purple-100 dark:border-zinc-800">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                  Batch Sync Result:
                </span>
                <div className="flex gap-3 text-[11px]">
                  <span className="text-emerald-600 font-bold">
                    ✓ {batchSyncResult.success} Uploaded
                  </span>
                  {batchSyncResult.failed > 0 && (
                    <span className="text-rose-600 font-bold">
                      ✗ {batchSyncResult.failed} Failed
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Activity & Logs Table */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Recent Multi-Channel Activity
            </h2>
            {lastSyncAt && (
              <span className="text-[10px] text-zinc-400">
                (Last event: {lastSyncAt.toLocaleTimeString()})
              </span>
            )}
          </div>
          <button
            onClick={loadLogs}
            disabled={logsLoading}
            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs font-mono">
            No synchronization activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Channel / Action</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Details / Handle</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : log.status === "SKIPPED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                              : log.status === "PENDING"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}
                      >
                        {log.status === "SUCCESS"
                          ? "✓ Success"
                          : log.status === "SKIPPED"
                            ? "⏭️ Skipped"
                            : log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-900 dark:text-zinc-100 font-medium">
                      {log.productName || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500">
                      {log.errorMessage ? (
                        <span className="text-rose-500">{log.errorMessage}</span>
                      ) : log.metaBatchHandle ? (
                        <span className="truncate block max-w-[200px]">{log.metaBatchHandle}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
