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
  MessageCircle,
  Smartphone,
  ShieldCheck,
  Pin,
} from "lucide-react";
import {
  getSocialSettingsAction,
  saveSocialSettingsAction,
  testFacebookPageConnectionAction,
  testInstagramConnectionAction,
  testPinterestConnectionAction,
  discoverPinterestBoardsAction,
  triggerBatchPinterestPublishAction,
  testWebhookAction,
  triggerBatchFacebookFeedPostAction,
  triggerBatchInstagramFeedPostAction,
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

type ActiveTab =
  "facebook_feed" | "whatsapp" | "instagram_feed" | "pinterest" | "meta_catalog" | "webhooks";

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  color = "purple",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  color?: "purple" | "blue" | "pink" | "emerald" | "amber" | "red";
}) {
  const activeColor = {
    purple: "bg-purple-600",
    blue: "bg-blue-600",
    pink: "bg-pink-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-600",
    red: "bg-red-600",
  }[color];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
        checked ? activeColor : "bg-zinc-200 dark:bg-zinc-800"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

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

  // Pinterest Form State
  const [pinterestAccessToken, setPinterestAccessToken] = useState("");
  const [pinterestBoardId, setPinterestBoardId] = useState("");
  const [pinterestBoardName, setPinterestBoardName] = useState("");
  const [autoPostPinterest, setAutoPostPinterest] = useState(false);
  const [showPinterestToken, setShowPinterestToken] = useState(false);
  const [hasExistingPinterestToken, setHasExistingPinterestToken] = useState(false);

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
    alreadySynced?: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [isBulkPostingFeed, setIsBulkPostingFeed] = useState(false);
  const [forceRepostFeed, setForceRepostFeed] = useState(false);

  const [batchInstagramResult, setBatchInstagramResult] = useState<{
    total: number;
    success: number;
    alreadySynced?: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [isBulkPostingInstagram, setIsBulkPostingInstagram] = useState(false);
  const [forceRepostInstagram, setForceRepostInstagram] = useState(false);

  // Pinterest Board Discovery & Batch Sync state
  const [discoveredBoards, setDiscoveredBoards] = useState<
    Array<{ id: string; name: string; description?: string; imageThumbnailUrl?: string }>
  >([]);
  const [isDiscoveringBoards, setIsDiscoveringBoards] = useState(false);
  const [boardDiscoveryError, setBoardDiscoveryError] = useState<string | null>(null);
  const [batchPinterestResult, setBatchPinterestResult] = useState<{
    total: number;
    success: number;
    alreadySynced?: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [isBulkPostingPinterest, setIsBulkPostingPinterest] = useState(false);
  const [forceRepostPinterest, setForceRepostPinterest] = useState(false);

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

  // Logs & Help
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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

        setPinterestBoardId(intg.pinterestBoardId || "");
        setPinterestBoardName(intg.pinterestBoardName || "");
        setAutoPostPinterest(intg.autoPostPinterest ?? false);

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
        setHasExistingPinterestToken(Boolean(intg.hasPinterestAccessToken));

        if (intg.hasAccessToken) {
          setAccessToken("••••••••••••••••••••••••••••••••");
        }
        if (intg.hasPageAccessToken) {
          setFacebookPageAccessToken("••••••••••••••••••••••••••••••••");
        }
        if (intg.hasPinterestAccessToken) {
          setPinterestAccessToken("••••••••••••••••••••••••••••••••");
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
        "Please paste an Access Token in Step 1 first (e.g. from Graph API Explorer or System Users).",
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
            "No managed Facebook Pages found. You can also enter your Page ID (1366821166509556) manually below.",
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
    setSaveSuccess(`Selected ${page.name}! Click "Save Configuration" to apply.`);
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
          facebookPageId: pageIdToUse || undefined,
          accessToken: tokenToUse.includes("••••") ? undefined : tokenToUse || undefined,
          igAccountIdHint: instagramAccountId.trim() || undefined,
        });

        if (res?.data?.account) {
          const acc = res.data.account;
          setInstagramAccountId(acc.id);
          setDiscoveredInstagramAccount(acc);
          setTestResult({
            valid: true,
            message: `Connected to Instagram: @${acc.username}! Click "Save Configuration" to apply.`,
          });
          setSaveSuccess(
            `Found Instagram Account: @${acc.username}! Click "Save Configuration" below.`,
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

  // Pinterest Handlers
  const handleDiscoverBoards = () => {
    const token = pinterestAccessToken.trim();
    if (!token && !hasExistingPinterestToken) {
      setBoardDiscoveryError("Please enter your Pinterest Access Token in Step 1 first.");
      return;
    }

    setBoardDiscoveryError(null);
    setIsDiscoveringBoards(true);

    startTransition(async () => {
      try {
        const res = await discoverPinterestBoardsAction({
          accessToken: token.includes("••••") ? undefined : token || undefined,
        });

        if (res?.data?.boards && res.data.boards.length > 0) {
          setDiscoveredBoards(res.data.boards);
          setSaveSuccess(
            `Found ${res.data.boards.length} Pinterest Board(s)! Select your target board below.`,
          );
        } else {
          setBoardDiscoveryError(
            "No boards found on this Pinterest account. Create a board on Pinterest first.",
          );
        }
      } catch (err) {
        setBoardDiscoveryError(
          err instanceof Error ? err.message : "Failed to fetch Pinterest boards.",
        );
      } finally {
        setIsDiscoveringBoards(false);
      }
    });
  };

  const handleSelectBoard = (board: { id: string; name: string }) => {
    setPinterestBoardId(board.id);
    setPinterestBoardName(board.name);
    setTestResult({
      valid: true,
      message: `Selected Board: "${board.name}" (ID: ${board.id}). Click "Save Configuration" to apply.`,
    });
    setSaveSuccess(`Selected Board "${board.name}"! Click "Save Configuration" to apply.`);
  };

  const handleTestPinterest = () => {
    const token = pinterestAccessToken.trim();
    if (!token && !hasExistingPinterestToken) {
      setTestResult({
        valid: false,
        message: "Please enter your Pinterest Access Token first.",
      });
      return;
    }

    setTestResult(null);
    startTransition(async () => {
      try {
        const res = await testPinterestConnectionAction({
          accessToken: token.includes("••••") ? undefined : token || undefined,
        });

        if (res?.data?.success) {
          setTestResult({
            valid: true,
            message: `Pinterest Verified: @${res.data.username} (${res.data.businessName || "Business"})! Ready to publish Pins.`,
          });
        } else {
          setTestResult({
            valid: false,
            message: res?.serverError || "Failed to verify Pinterest connection.",
          });
        }
      } catch (err) {
        setTestResult({
          valid: false,
          message: err instanceof Error ? err.message : "Network error contacting Pinterest.",
        });
      }
    });
  };

  const handleBatchPinterestPublish = () => {
    setBatchPinterestResult(null);
    setSaveError(null);
    setSaveSuccess(null);
    setIsBulkPostingPinterest(true);

    startTransition(async () => {
      try {
        const res = await triggerBatchPinterestPublishAction({ forceRepost: forceRepostPinterest });
        if (res?.data) {
          setBatchPinterestResult({
            total: res.data.totalCount,
            success: res.data.totalSuccess,
            alreadySynced: res.data.alreadySyncedCount ?? 0,
            skipped: res.data.skippedCount ?? 0,
            failed: res.data.totalFailed,
          });
          setSaveSuccess(res.data.message || "Pinterest batch publishing completed!");
          loadLogs();
        } else {
          setSaveError(res?.serverError || "Pinterest batch sync failed.");
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Unexpected error syncing to Pinterest.");
      } finally {
        setIsBulkPostingPinterest(false);
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
          pinterestAccessToken: pinterestAccessToken.trim() || undefined,
          pinterestBoardId: pinterestBoardId.trim() || undefined,
          pinterestBoardName: pinterestBoardName.trim() || undefined,
          autoPostPinterest,
          isEnabled,
          autoPostFacebookFeed,
          autoPostInstagramFeed,
          autoSyncMetaCatalog,
          autoTriggerWebhook,
        });

        if (res?.data?.success) {
          setSaveSuccess("All multi-channel social publishing settings saved successfully!");
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
        const res = await triggerBatchFacebookFeedPostAction({ forceRepost: forceRepostFeed });
        if (res?.data) {
          setBatchFeedResult({
            total: res.data.totalCount,
            success: res.data.totalSuccess,
            alreadySynced: res.data.alreadySyncedCount ?? 0,
            skipped: res.data.skippedCount ?? 0,
            failed: res.data.totalFailed,
          });
          setSaveSuccess(res.data.message || "Facebook Feed sync completed!");
          loadLogs();
        } else {
          setSaveError(res?.serverError || "Facebook Feed sync failed.");
        }
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Unexpected error syncing Facebook Feed.",
        );
      } finally {
        setIsBulkPostingFeed(false);
      }
    });
  };

  const handleBatchInstagramFeedPublish = () => {
    setBatchInstagramResult(null);
    setSaveError(null);
    setSaveSuccess(null);
    setIsBulkPostingInstagram(true);

    startTransition(async () => {
      try {
        const res = await triggerBatchInstagramFeedPostAction({
          forceRepost: forceRepostInstagram,
        });
        if (res?.data) {
          setBatchInstagramResult({
            total: res.data.totalCount,
            success: res.data.totalSuccess,
            alreadySynced: res.data.alreadySyncedCount ?? 0,
            skipped: res.data.skippedCount ?? 0,
            failed: res.data.totalFailed,
          });
          setSaveSuccess(res.data.message || "Instagram Feed sync completed!");
          loadLogs();
        } else {
          setSaveError(res?.serverError || "Instagram Feed sync failed.");
        }
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Unexpected error syncing Instagram Feed.",
        );
      } finally {
        setIsBulkPostingInstagram(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[450px]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-3" />
        <p className="text-xs font-mono text-zinc-500">Loading multi-channel social hub...</p>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 font-sans">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-5">
        <Link href="/vendor" className="hover:text-zinc-900 dark:hover:text-zinc-200">
          Vendor Console
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
          Social Media & Messaging Automation
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shrink-0">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
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
                    <Check className="h-3 w-3" /> Active & Synced
                  </>
                ) : (
                  "Ready to Connect"
                )}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Official direct publishing to Facebook, WhatsApp, Instagram, Pinterest Product Pins,
              and Meta Commerce Catalogs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-purple-500" />
            {showGuide ? "Hide Setup Guide" : "View Setup Guide"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
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

      {/* Collapsible Interactive Multi-Channel Platform Guide */}
      {showGuide && (
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-purple-50/60 via-indigo-50/40 to-blue-50/40 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 border border-purple-200/80 dark:border-purple-900/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> Multi-Channel Social & Search
              Architecture Guide
            </h2>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Dilnova connects directly to official first-party APIs (Zero Third Parties). Choose the
            tabs below to configure your store&apos;s channels:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
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

            {/* 2. WhatsApp Business & 1-Click */}
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    🟢 WhatsApp Business
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Official Meta
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Links your synced Meta Catalog directly to your WhatsApp Business phone number.
                </p>
                <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> 100% Free & Zero 3rd parties
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Auto-syncs live inventory
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> 1-Click Share to WhatsApp
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
                  Publishes photo posts & captions to your Instagram Business account grid.
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

            {/* 4. Pinterest & Google SEO */}
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-red-100 dark:border-red-950/60 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-700 dark:text-red-400">
                    📌 Pinterest & Google
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                    SEO (DA 94)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Publishes Product Pins with Schema.org markup. Indexed by Google Search & Images.
                </p>
                <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Google Search indexing
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Live prices & in-stock badge
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> 1,000 pins/day free
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Meta Commerce Catalog */}
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

      {/* Unified Channel Status Dashboard (6 Channels) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {/* 1. Facebook Status */}
        <div
          onClick={() => setActiveTab("facebook_feed")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "facebook_feed"
              ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
              📢 Facebook
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                facebookPageId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {facebookPageId ? `Page: ${facebookPageId}` : "Not connected"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoPostFacebookFeed ? "Auto-Post: On" : "Auto-Post: Off"}
          </div>
        </div>

        {/* 2. WhatsApp Status */}
        <div
          onClick={() => setActiveTab("whatsapp")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "whatsapp"
              ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              💬 WhatsApp
            </span>
            <span
              className={`w-2 h-2 rounded-full ${catalogId ? "bg-emerald-500" : "bg-amber-400"}`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {catalogId ? "Catalog Ready" : "Setup Needed"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Shop & 1-Click</div>
        </div>

        {/* 3. Instagram Status */}
        <div
          onClick={() => setActiveTab("instagram_feed")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "instagram_feed"
              ? "bg-pink-50/90 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800 ring-2 ring-pink-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-pink-700 dark:text-pink-400 flex items-center gap-1">
              📸 Instagram
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                instagramAccountId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {instagramAccountId
              ? `@${discoveredInstagramAccount?.username || "dilukalahiru"}`
              : "Not connected"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoPostInstagramFeed ? "Auto-Post: On" : "Auto-Post: Off"}
          </div>
        </div>

        {/* 4. Pinterest Status (Search Engine) */}
        <div
          onClick={() => setActiveTab("pinterest")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "pinterest"
              ? "bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800 ring-2 ring-red-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
              📌 Pinterest
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                pinterestBoardId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {pinterestBoardName || (pinterestBoardId ? "Board Linked" : "Google Indexing")}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoPostPinterest ? "Auto-Pin: On" : "Auto-Pin: Off"}
          </div>
        </div>

        {/* 5. Meta Catalog Status */}
        <div
          onClick={() => setActiveTab("meta_catalog")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "meta_catalog"
              ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
              🛍️ Catalog
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                catalogId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {catalogId ? `ID: ${catalogId}` : "Not set"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoSyncMetaCatalog ? "Auto-Sync: On" : "Auto-Sync: Off"}
          </div>
        </div>

        {/* 6. Custom Webhooks Status */}
        <div
          onClick={() => setActiveTab("webhooks")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "webhooks"
              ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              ⚡ Webhook
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                webhookUrl ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {webhookUrl ? "Active" : "Optional (Dev)"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoTriggerWebhook ? "Dispatches: On" : "Dispatches: Off"}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {lastErrorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Notice:</span>
            <span>{lastErrorMessage}</span>
          </div>
        </div>
      )}

      {/* Segmented 6-Channel Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-900/80 p-1.5 rounded-2xl mb-8 border border-zinc-200/80 dark:border-zinc-800 max-w-4xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab("facebook_feed");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[125px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "facebook_feed"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>📢</span> Facebook
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("whatsapp");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "whatsapp"
              ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>💬</span> WhatsApp
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("instagram_feed");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
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
            setActiveTab("pinterest");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[135px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "pinterest"
              ? "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>📌</span> Pinterest Pins
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("meta_catalog");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[125px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "meta_catalog"
              ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>🛍️</span> Meta Catalog
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("webhooks");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[115px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "webhooks"
              ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>⚡</span> Webhooks
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left 2 Columns: Active Channel Form & Guided Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: Facebook Page Feed */}
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

              {/* Step 1: Choose Your Token Type & Get Meta Access Token */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-mono">
                      1
                    </span>
                    Choose Your Token Type & Get Meta Access Token
                  </span>
                </div>

                {/* Token Comparison: Permanent vs Temporary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Permanent System User Token */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          🛡️ Option 1: System User Token
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white tracking-wide uppercase">
                          Permanent • Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                        Generated in Meta Business Suite under <strong>System Users</strong>.
                      </p>
                      <div className="mt-2.5 space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-1.5 text-emerald-900 dark:text-emerald-200">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>PRO: Never Expires!</strong> Feed posts & sync run 24/7
                            indefinitely without breaking.
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <span className="text-[11px] shrink-0 mt-0.5">ℹ️</span>
                          <span>
                            <strong>CON:</strong> Takes 1–2 minutes to create a System User once in
                            Meta Suite.
                          </span>
                        </div>
                      </div>
                    </div>
                    <a
                      href="https://business.facebook.com/latest/settings/system_users/?business_id=208458023692445&nav_ref=bm_settings_redirect_migration&bm_redirect_migration=true&selected_user_id=61593935072406"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer text-center"
                    >
                      🛡️ Open Meta System Users (Never Expires) <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Option 2: Graph API Explorer Token */}
                  <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          ⚡ Option 2: Graph API Explorer
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 uppercase">
                          Quick Test Only
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                        Generated in Meta Developer Tools Graph Explorer.
                      </p>
                      <div className="mt-2.5 space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-1.5 text-amber-900 dark:text-amber-200">
                          <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>PRO:</strong> Instant 10-second token creation right in your
                            browser.
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                          <span className="text-[11px] shrink-0 mt-0.5">⚠️</span>
                          <span>
                            <strong>CON (Warning):</strong> Hard 24-hour expiry! Auto-posting stops
                            working after 1 day until re-pasted daily.
                          </span>
                        </div>
                      </div>
                    </div>
                    <a
                      href="https://developers.facebook.com/tools/explorer/?method=GET&path=me%2Faccounts&version=v21.0"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs cursor-pointer text-center"
                    >
                      🔑 Open Graph API Explorer (Expires in 24h){" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
                  Required Facebook Page permissions for your token:
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

              {/* Step 2: Select Facebook Page */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-[10px] font-mono">
                      2
                    </span>
                    Select or Enter Your Facebook Page
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
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {page.name.slice(0, 2).toUpperCase()}
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
                </div>
              </div>

              {/* Action Buttons */}
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

          {/* TAB 2: WhatsApp Business */}
          {activeTab === "whatsapp" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-600 font-mono flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Official WhatsApp Business Integration
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Connect your WhatsApp Business account directly to your synced Meta Catalog with
                    zero third parties.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <Smartphone className="h-5 w-5" />
                </span>
              </div>

              {/* Zero Third Parties Official Guarantee Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                    100% Official Meta Infrastructure (Zero Third Parties)
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Meta powers WhatsApp Business Storefronts natively through your{" "}
                    <strong>Meta Commerce Catalog</strong>. Dilnova continuously syncs your products
                    directly to Meta without any middleman (no Zapier, no Make, no extra monthly
                    fees).
                  </p>
                </div>
              </div>

              {/* 3-Step Interactive WhatsApp Connection Wizard */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  Official 3-Step WhatsApp Connection Wizard
                </h3>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-mono">
                        1
                      </span>
                      Get the Official WhatsApp Business App
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                      Free Download
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Download the free <strong>WhatsApp Business app</strong> on your phone (iOS /
                    Android) and register your store phone number.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-mono">
                        2
                      </span>
                      Add Your WhatsApp Number in Meta Business Portfolio
                    </span>
                    <a
                      href="https://business.facebook.com/settings/whatsapp-business-accounts/?business_id=208458023692445"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
                    >
                      Open Meta WhatsApp Accounts <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    In your Meta Business Portfolio (<strong>ĐIŁỮҜΔ ŁΔĦIŘỮ</strong>), click{" "}
                    <strong>Add &rarr; Connect a WhatsApp Business account</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-mono">
                        3
                      </span>
                      Connect Your Synced Dilnova Catalog to WhatsApp
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href="https://business.facebook.com/settings/whatsapp-business-accounts/?business_id=208458023692445"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
                      >
                        WhatsApp Connected Assets (Direct) <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href="https://business.facebook.com/commerce_manager/catalogs/?business_id=208458023692445"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                      >
                        Commerce Manager <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1.5">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Quick 3-Click Linking Guide in Meta Business Settings:
                    </div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        Click the green <strong>WhatsApp Connected Assets</strong> button above.
                      </li>
                      <li>
                        In the right panel, click <strong>Connected Assets</strong> &rarr;{" "}
                        <strong>Add Assets</strong> &rarr; select <strong>Catalogs</strong>.
                      </li>
                      <li>
                        Check <strong>Dilnova Store Catalog</strong> (ID:{" "}
                        <code>{catalogId || "2187911822144469"}</code>) &rarr; click{" "}
                        <strong>Save Changes</strong>.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Live Status Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    Meta Catalog Attached: {catalogId || "2187911822144469"}
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      Auto-Sync Active
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                    Whenever you create or edit products in Dilnova, your WhatsApp catalog updates
                    automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBatchCatalogSync}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Sync Catalog to WhatsApp Now
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Instagram Feed */}
          {activeTab === "instagram_feed" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-pink-600 font-mono flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Instagram Business Auto-Poster
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Automatically publishes photos & captions to your linked Instagram Business or
                    Creator account.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>

              {/* Step 1: Get Access Token with Direct Links */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/80 to-rose-50/50 dark:from-pink-950/40 dark:to-rose-950/20 border border-pink-100 dark:border-pink-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-pink-900 dark:text-pink-300 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-mono">
                      1
                    </span>
                    Choose Your Token Type & Get Meta Token
                  </span>
                </div>

                {/* Token Comparison: Permanent vs Temporary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Permanent System User Token */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          🛡️ Option 1: System User Token
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white tracking-wide uppercase">
                          Permanent • Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                        Generated in Meta Business Suite under <strong>System Users</strong>.
                      </p>
                      <div className="mt-2.5 space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-1.5 text-emerald-900 dark:text-emerald-200">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>PRO: Never Expires!</strong> Instagram feed publishing runs 24/7
                            forever without breaking.
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-400">
                          <span className="text-[11px] shrink-0 mt-0.5">ℹ️</span>
                          <span>
                            <strong>CON:</strong> Takes 1–2 minutes to create a System User once in
                            Meta Suite.
                          </span>
                        </div>
                      </div>
                    </div>
                    <a
                      href="https://business.facebook.com/latest/settings/system_users/?business_id=208458023692445&nav_ref=bm_settings_redirect_migration&bm_redirect_migration=true&selected_user_id=61593935072406"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer text-center"
                    >
                      🛡️ Open Meta System Users (Never Expires) <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Option 2: Graph API Explorer Token */}
                  <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          ⚡ Option 2: Graph API Explorer
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 uppercase">
                          Quick Test Only
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                        Generated in Meta Developer Tools Graph Explorer.
                      </p>
                      <div className="mt-2.5 space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-1.5 text-amber-900 dark:text-amber-200">
                          <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>PRO:</strong> Instant 10-second token creation right in your
                            browser.
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                          <span className="text-[11px] shrink-0 mt-0.5">⚠️</span>
                          <span>
                            <strong>CON (Warning):</strong> Hard 24-hour expiry! Auto-posting stops
                            working after 1 day until re-pasted daily.
                          </span>
                        </div>
                      </div>
                    </div>
                    <a
                      href="https://developers.facebook.com/tools/explorer/?method=GET&path=me%2Faccounts&version=v21.0"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs cursor-pointer text-center"
                    >
                      🔑 Open Graph API Explorer (Expires in 24h){" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
                  Generate your token with these required Instagram & Page permissions:
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                    instagram_basic
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                    instagram_content_publish
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                    pages_show_list
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                    pages_read_engagement
                  </span>
                </div>
              </div>

              {/* Step 2: Connect Instagram Business Account */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-mono">
                      2
                    </span>
                    Connect Instagram Business Account
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

                <div className="pt-2">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Instagram Business Account ID (Numeric)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 17841406751842985"
                    value={instagramAccountId}
                    onChange={(e) => setInstagramAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
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

          {/* TAB 4: 📌 Pinterest Product Pins & Search Engine Indexing */}
          {activeTab === "pinterest" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 font-mono flex items-center gap-2">
                    <Pin className="h-4 w-4" /> Pinterest Product Pins & Search Engine Discovery
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Step-by-step guide to connect Pinterest API v5 and get your products indexed on
                    Google Search & Images.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600">
                  <Pin className="h-5 w-5" />
                </span>
              </div>

              {/* Search Engine Authority Callout */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-50/80 to-amber-50/40 dark:from-red-950/40 dark:to-amber-950/20 border border-red-200/70 dark:border-red-900/60 space-y-2 text-xs">
                <span className="font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-red-600" /> Google Search Discovery Engine
                  (Domain Authority 94):
                </span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Pinterest is crawled aggressively by{" "}
                  <strong>Google Search & Google Images</strong>. Because Dilnova automatically
                  embeds
                  <code>Schema.org/Product</code> JSON-LD on your store pages, Pinterest validates
                  and converts every Pin into an official
                  <strong>Rich Product Pin</strong> with live prices and an in-stock badge.
                </p>
              </div>

              {/* STEP 1: Create Pinterest Developer App (With Exact Form Answers) */}
              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-mono font-bold shrink-0">
                      1
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Create Your Pinterest Developer App
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        100% Free with 1,000 pins/day. Takes 1 minute to submit.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://developers.pinterest.com/apps/connect/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-xs cursor-pointer"
                  >
                    Open Pinterest &rarr; Connect App <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Form Cheat-Sheet Box */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-red-200/80 dark:border-red-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                      📋 &quot;Connect App&quot; Form Cheat-Sheet (Choose these exact options):
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                      Instant Trial Approval
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">
                        App Name
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        Dilnova Store Sync
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">
                        Company Name & Site
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        Dilnova (https://dilnova.com)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">
                        Privacy Policy
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        https://dilnova.com/privacy
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                      <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase tracking-wider font-bold">
                        ⭐️ App Purpose (Important)
                      </span>
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">
                        Personal API access (single, personal use)
                      </span>
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Approved immediately with zero wait time
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">
                        Sharing access with
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                        No one (or Just me)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">
                        Use Cases (Select both)
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        ☑️ Pin creation and scheduling & ☑️ Ecommerce
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">
                        Audience (Select both)
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        ☑️ Merchants & ☑️ Businesses
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">
                        Reads Pins / Boards data
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        🔘 Yes, mine (authenticated Pinner&apos;s own pins)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Generate Access Token */}
              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-mono font-bold shrink-0">
                      2
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Generate Your Access Token
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Open your app dashboard and generate a private token with 4 permissions.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://developers.pinterest.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    Open My Apps Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-2">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Quick 3-Click Token Generation:
                  </div>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Click <strong>Manage</strong> on your app (e.g. <em>Dilnova Store Sync</em>).
                    </li>
                    <li>
                      Scroll down to the <strong>Generate access token</strong> section.
                    </li>
                    <li>
                      Check these 4 permissions:
                      <span className="inline-flex gap-1 flex-wrap ml-1 font-mono font-bold text-[10px] text-red-600 dark:text-red-400">
                        <code>boards:read</code>, <code>pins:read</code>, <code>pins:write</code>,{" "}
                        <code>user_accounts:read</code>
                      </span>
                    </li>
                    <li>
                      Click <strong>Generate token</strong> and paste the copied token below:
                    </li>
                  </ol>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Pinterest API Access Token (pina_...)
                  </label>
                  <div className="relative">
                    <input
                      type={showPinterestToken ? "text" : "password"}
                      placeholder={
                        hasExistingPinterestToken
                          ? "••••••••••••••••••••••••••••••••"
                          : "Paste your generated token starting with pina_..."
                      }
                      value={pinterestAccessToken}
                      onChange={(e) => setPinterestAccessToken(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinterestToken(!showPinterestToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPinterestToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* STEP 3: Select or Create Target Board */}
              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-mono font-bold shrink-0">
                      3
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Select or Create Your Pinterest Board
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Every Product Pin must be placed in a board (e.g. &quot;Store Catalog&quot;,
                        &quot;New Arrivals&quot;).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href="https://www.pinterest.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                      Create Board on Pinterest <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={handleDiscoverBoards}
                      disabled={isDiscoveringBoards || isPending}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isDiscoveringBoards ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      🔍 Auto-Detect My Boards
                    </button>
                  </div>
                </div>

                {boardDiscoveryError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
                    {boardDiscoveryError}
                  </div>
                )}

                {discoveredBoards.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-zinc-500 block uppercase tracking-wider">
                      Click to select your destination board:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {discoveredBoards.map((b) => {
                        const isSelected = pinterestBoardId === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleSelectBoard(b)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? "bg-red-50/90 dark:bg-red-950/50 border-red-400 dark:border-red-700 shadow-xs ring-2 ring-red-500/20"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                                📌 {b.name}
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                                Board ID: {b.id}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                                isSelected
                                  ? "bg-red-600 text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                              }`}
                            >
                              {isSelected ? "Selected ✓" : "Select"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Selected Board ID (Numeric)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-filled or enter e.g. 1029384756102"
                      value={pinterestBoardId}
                      onChange={(e) => setPinterestBoardId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Board Name (Display Label)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-filled e.g. Store Catalog"
                      value={pinterestBoardName}
                      onChange={(e) => setPinterestBoardName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 4: Live Connected Status Banner */}
              {pinterestBoardId && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/40 dark:to-amber-950/30 border border-red-200/80 dark:border-red-900/60 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      📌
                    </div>
                    <div>
                      <div className="text-xs font-bold text-red-950 dark:text-red-100 flex items-center gap-2">
                        <span>
                          Connected Target Board:{" "}
                          <strong>{pinterestBoardName || pinterestBoardId}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          Ready to Sync
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        Products created with images will automatically publish as Product Pins and
                        be indexed by Google Search.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://www.pinterest.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-300 hover:underline px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900 border border-red-200 dark:border-red-800 shadow-2xs"
                  >
                    View Board on Pinterest <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Pinterest Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleTestPinterest}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
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

          {/* TAB 5: Meta Commerce Catalog */}
          {activeTab === "meta_catalog" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600 font-mono">
                    Meta Commerce Catalog & WhatsApp Shop
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Syncs full product catalog to Meta Commerce Manager for Facebook Shop, Instagram
                    Tagging, and WhatsApp Catalog.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                  <ShoppingBag className="h-5 w-5" />
                </span>
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
                    href="https://business.facebook.com/commerce_manager/catalogs/?business_id=208458023692445"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showCatalogToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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

          {/* TAB 6: Webhooks */}
          {activeTab === "webhooks" && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 font-mono">
                    Outbound Webhook (Developer API)
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Optional custom HTTP webhook listener for developers.
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <Send className="h-5 w-5" />
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Webhook Endpoint URL (HTTPS)
                </label>
                <input
                  type="url"
                  placeholder="https://your-custom-domain.com/api/webhooks"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

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

        {/* Right Column: Master Automation Rules & Contextual Actions */}
        <div className="space-y-6">
          {/* Master Automation Rules */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-4 flex items-center justify-between">
              <span>Automatic Triggers</span>
              <span className="text-[10px] text-purple-600 font-semibold">Live Events</span>
            </h2>

            <div className="space-y-3.5">
              {/* Facebook Auto-Post Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                    Facebook Page Feed
                  </span>
                  <span className="text-[11px] text-zinc-400 block truncate">
                    Post to timeline on create
                  </span>
                </div>
                <ToggleSwitch
                  checked={autoPostFacebookFeed}
                  onChange={setAutoPostFacebookFeed}
                  color="blue"
                />
              </div>

              {/* WhatsApp & Meta Catalog Auto-Sync Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                    WhatsApp & Meta Catalog
                  </span>
                  <span className="text-[11px] text-zinc-400 block truncate">
                    Real-time catalog sync
                  </span>
                </div>
                <ToggleSwitch
                  checked={autoSyncMetaCatalog}
                  onChange={setAutoSyncMetaCatalog}
                  color="emerald"
                />
              </div>

              {/* Instagram Auto-Post Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                    Instagram Grid Feed
                  </span>
                  <span className="text-[11px] text-zinc-400 block truncate">
                    Post photo to IG grid
                  </span>
                </div>
                <ToggleSwitch
                  checked={autoPostInstagramFeed}
                  onChange={setAutoPostInstagramFeed}
                  color="pink"
                />
              </div>

              {/* 📌 Pinterest Auto-Post Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                    📌 Pinterest Product Pins
                  </span>
                  <span className="text-[11px] text-zinc-400 block truncate">
                    Auto-pin for Google Indexing
                  </span>
                </div>
                <ToggleSwitch
                  checked={autoPostPinterest}
                  onChange={setAutoPostPinterest}
                  color="red"
                />
              </div>

              {/* Outbound Webhook Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                    Outbound Webhook
                  </span>
                  <span className="text-[11px] text-zinc-400 block truncate">
                    Send JSON to custom server
                  </span>
                </div>
                <ToggleSwitch
                  checked={autoTriggerWebhook}
                  onChange={setAutoTriggerWebhook}
                  color="amber"
                />
              </div>
            </div>
          </div>

          {/* Contextual Action Card: Pinterest */}
          {activeTab === "pinterest" && (
            <div className="bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/40 dark:to-amber-950/40 border border-red-200/70 dark:border-red-900/50 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 dark:text-red-300 font-mono flex items-center gap-1.5">
                <Pin className="h-4 w-4 text-red-600" /> Bulk Pinterest Pin Sync
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Publish all active catalog products as Product Pins to your Pinterest board for
                search engine indexing.
              </p>
              <button
                onClick={handleBatchPinterestPublish}
                disabled={isPending || isBulkPostingPinterest}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                {isBulkPostingPinterest ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Publishing Pins...
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4" /> Bulk Sync to Pinterest Board
                  </>
                )}
              </button>

              <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={forceRepostPinterest}
                  onChange={(e) => setForceRepostPinterest(e.target.checked)}
                  className="rounded border-zinc-300 text-red-600"
                />
                Force repost existing products
              </label>

              {batchPinterestResult && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-red-100 dark:border-zinc-800 space-y-1">
                  <div className="text-emerald-600 font-bold">
                    ✓ {batchPinterestResult.success} Pinned
                  </div>
                  {batchPinterestResult.skipped > 0 && (
                    <div className="text-amber-600">
                      ⏭️ {batchPinterestResult.skipped} Skipped (No media)
                    </div>
                  )}
                  {batchPinterestResult.failed > 0 && (
                    <div className="text-rose-600">✗ {batchPinterestResult.failed} Failed</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contextual Action Card: Facebook */}
          {activeTab === "facebook_feed" && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 font-mono flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-blue-600" /> Bulk Facebook Page Sync
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Publish photos and promotional captions for all active catalog products to your
                Facebook Page timeline.
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

              <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={forceRepostFeed}
                  onChange={(e) => setForceRepostFeed(e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600"
                />
                Force repost existing products
              </label>

              {batchFeedResult && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-blue-100 dark:border-zinc-800 space-y-1">
                  <div className="text-emerald-600 font-bold">
                    ✓ {batchFeedResult.success} Published
                  </div>
                  {batchFeedResult.skipped > 0 && (
                    <div className="text-amber-600">
                      ⏭️ {batchFeedResult.skipped} Skipped (No media)
                    </div>
                  )}
                  {batchFeedResult.failed > 0 && (
                    <div className="text-rose-600">✗ {batchFeedResult.failed} Failed</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contextual Action Card: WhatsApp / Catalog */}
          {(activeTab === "whatsapp" || activeTab === "meta_catalog") && (
            <div className="bg-gradient-to-br from-emerald-50 to-purple-50 dark:from-emerald-950/40 dark:to-purple-950/40 border border-emerald-200/70 dark:border-purple-900/50 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 font-mono flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-emerald-600" /> WhatsApp & Catalog Sync
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Upload your entire active catalog to Meta Commerce Manager. Automatically updates
                products across Facebook Shop and WhatsApp Business.
              </p>
              <button
                onClick={handleBatchCatalogSync}
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading Batch...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Push All Products to Meta & WhatsApp
                  </>
                )}
              </button>

              {batchSyncResult && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-emerald-100 dark:border-zinc-800 space-y-1">
                  <div className="text-emerald-600 font-bold">
                    ✓ {batchSyncResult.success} Products Synced
                  </div>
                  {batchSyncResult.failed > 0 && (
                    <div className="text-rose-600">✗ {batchSyncResult.failed} Failed</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contextual Action Card: Instagram */}
          {activeTab === "instagram_feed" && (
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/40 dark:to-purple-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pink-900 dark:text-pink-300 font-mono flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-pink-600" /> Bulk Instagram Feed Sync
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Publish photos and descriptions for all active products to your Instagram Business
                feed grid.
              </p>
              <button
                onClick={handleBatchInstagramFeedPublish}
                disabled={isPending || isBulkPostingInstagram}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                {isBulkPostingInstagram ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Syncing Instagram...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Bulk Sync to Instagram Grid
                  </>
                )}
              </button>

              <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={forceRepostInstagram}
                  onChange={(e) => setForceRepostInstagram(e.target.checked)}
                  className="rounded border-zinc-300 text-pink-600"
                />
                Force repost existing products
              </label>

              {batchInstagramResult && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-pink-100 dark:border-zinc-800 space-y-1">
                  <div className="text-emerald-600 font-bold">
                    ✓ {batchInstagramResult.success} Published
                  </div>
                  {batchInstagramResult.skipped > 0 && (
                    <div className="text-amber-600">
                      ⏭️ {batchInstagramResult.skipped} Skipped (No media)
                    </div>
                  )}
                  {batchInstagramResult.failed > 0 && (
                    <div className="text-rose-600">✗ {batchInstagramResult.failed} Failed</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Zero Third Parties Guarantee Card */}
          <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
            <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Direct First-Party Architecture
            </span>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Dilnova connects directly to official APIs (Meta Graph API <code>v21.0</code> and
              Pinterest API <code>v5</code>). Your credentials and product data never touch
              third-party servers.
            </p>
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
            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer"
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
