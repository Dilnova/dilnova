"use client";

import { useState, useEffect, useTransition } from "react";
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
import type {
  ActiveTab,
  SyncLogItem,
  DiscoveredPage,
  DiscoveredBoard,
  DiscoveredInstagramAccount,
  BatchSyncResult,
  TestResult,
} from "./types";

export function useSocialSettingsHub() {
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
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [batchSyncResult, setBatchSyncResult] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);

  const [batchFeedResult, setBatchFeedResult] = useState<BatchSyncResult | null>(null);
  const [isBulkPostingFeed, setIsBulkPostingFeed] = useState(false);
  const [forceRepostFeed, setForceRepostFeed] = useState(false);

  const [batchInstagramResult, setBatchInstagramResult] = useState<BatchSyncResult | null>(null);
  const [isBulkPostingInstagram, setIsBulkPostingInstagram] = useState(false);
  const [forceRepostInstagram, setForceRepostInstagram] = useState(false);

  // Pinterest Board Discovery & Batch Sync state
  const [discoveredBoards, setDiscoveredBoards] = useState<DiscoveredBoard[]>([]);
  const [isDiscoveringBoards, setIsDiscoveringBoards] = useState(false);
  const [boardDiscoveryError, setBoardDiscoveryError] = useState<string | null>(null);
  const [batchPinterestResult, setBatchPinterestResult] = useState<BatchSyncResult | null>(null);
  const [isBulkPostingPinterest, setIsBulkPostingPinterest] = useState(false);
  const [forceRepostPinterest, setForceRepostPinterest] = useState(false);

  // Facebook Page Auto-Discovery state
  const [discoveredPages, setDiscoveredPages] = useState<DiscoveredPage[]>([]);
  const [isDiscoveringPages, setIsDiscoveringPages] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Instagram Auto-Discovery state
  const [isDiscoveringInstagram, setIsDiscoveringInstagram] = useState(false);
  const [instagramDiscoveryError, setInstagramDiscoveryError] = useState<string | null>(null);
  const [discoveredInstagramAccount, setDiscoveredInstagramAccount] =
    useState<DiscoveredInstagramAccount | null>(null);

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
            "No managed Facebook Pages found. You can also enter your Page ID manually below.",
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

  const handleSelectDiscoveredPage = (page: DiscoveredPage) => {
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

        if (res?.serverError) {
          setBoardDiscoveryError(res.serverError);
          return;
        }

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

  return {
    isLoading,
    isPending,
    activeTab,
    setActiveTab,
    // Fields
    catalogId,
    setCatalogId,
    accessToken,
    setAccessToken,
    facebookPageId,
    setFacebookPageId,
    facebookPageAccessToken,
    setFacebookPageAccessToken,
    instagramAccountId,
    setInstagramAccountId,
    webhookUrl,
    setWebhookUrl,
    brandName,
    setBrandName,
    customPostTemplate,
    setCustomPostTemplate,
    pinterestAccessToken,
    setPinterestAccessToken,
    pinterestBoardId,
    setPinterestBoardId,
    pinterestBoardName,
    setPinterestBoardName,
    autoPostPinterest,
    setAutoPostPinterest,
    showPinterestToken,
    setShowPinterestToken,
    hasExistingPinterestToken,
    // Automation Toggles
    isEnabled,
    setIsEnabled,
    autoPostFacebookFeed,
    setAutoPostFacebookFeed,
    autoPostInstagramFeed,
    setAutoPostInstagramFeed,
    autoSyncMetaCatalog,
    setAutoSyncMetaCatalog,
    autoTriggerWebhook,
    setAutoTriggerWebhook,
    // UI state
    showCatalogToken,
    setShowCatalogToken,
    showPageToken,
    setShowPageToken,
    hasExistingCatalogToken,
    hasExistingPageToken,
    syncStatus,
    lastSyncAt,
    lastErrorMessage,
    showGuide,
    setShowGuide,
    // Notifications
    saveSuccess,
    setSaveSuccess,
    saveError,
    setSaveError,
    testResult,
    setTestResult,
    // Batch results
    batchSyncResult,
    batchFeedResult,
    isBulkPostingFeed,
    forceRepostFeed,
    setForceRepostFeed,
    batchInstagramResult,
    isBulkPostingInstagram,
    forceRepostInstagram,
    setForceRepostInstagram,
    batchPinterestResult,
    isBulkPostingPinterest,
    forceRepostPinterest,
    setForceRepostPinterest,
    // Discovery
    discoveredPages,
    isDiscoveringPages,
    discoveryError,
    discoveredInstagramAccount,
    isDiscoveringInstagram,
    instagramDiscoveryError,
    discoveredBoards,
    isDiscoveringBoards,
    boardDiscoveryError,
    // Logs
    logs,
    logsLoading,
    loadLogs,
    // Actions
    handleSave,
    handleTestFacebookPage,
    handleTestCatalog,
    handleTestInstagram,
    handleTestPinterest,
    handleTestWebhook,
    handleDiscoverPages,
    handleSelectDiscoveredPage,
    handleDiscoverInstagram,
    handleDiscoverBoards,
    handleSelectBoard,
    handleBatchCatalogSync,
    handleBatchFacebookFeedPublish,
    handleBatchInstagramFeedPublish,
    handleBatchPinterestPublish,
  };
}

export type SocialSettingsHubState = ReturnType<typeof useSocialSettingsHub>;
