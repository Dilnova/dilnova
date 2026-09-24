"use client";

import Link from "next/link";
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Check,
  Share2,
} from "lucide-react";
import {
  useSocialSettingsHub,
  PlatformSetupGuide,
  ChannelStatusDashboard,
  FacebookFeedSettings,
  WhatsAppSettings,
  InstagramFeedSettings,
  PinterestSettings,
  PostTemplatesSettings,
  MetaCatalogSettings,
  WebhooksSettings,
  AutomationSidebar,
  ActivityLogsTable,
} from "@/features/social-share/components/settings";

export default function SocialSettingsHubPage() {
  const hub = useSocialSettingsHub();

  if (hub.isLoading) {
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
          Social Media &amp; Messaging Automation
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
                Social Media &amp; Messaging Automation
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  hub.syncStatus === "connected"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {hub.syncStatus === "connected" ? (
                  <>
                    <Check className="h-3 w-3" /> Active &amp; Synced
                  </>
                ) : (
                  "Ready to Connect"
                )}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Automated multi-channel publishing to Facebook, WhatsApp, Instagram, and Pinterest,
              with optional enterprise Meta Catalog sync.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => hub.setShowGuide(!hub.showGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-purple-500" />
            {hub.showGuide ? "Hide Setup Guide" : "View Setup Guide"}
          </button>
          <button
            type="button"
            onClick={hub.handleSave}
            disabled={hub.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {hub.isPending ? (
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
      {hub.showGuide && <PlatformSetupGuide onDismiss={() => hub.setShowGuide(false)} />}

      {/* Unified Channel Status Dashboard (6 Channels) */}
      <ChannelStatusDashboard
        activeTab={hub.activeTab}
        onSelectTab={(tab) => {
          hub.setActiveTab(tab);
          hub.setTestResult(null);
        }}
        facebookPageId={hub.facebookPageId}
        autoPostFacebookFeed={hub.autoPostFacebookFeed}
        catalogId={hub.catalogId}
        instagramAccountId={hub.instagramAccountId}
        discoveredInstagramAccount={hub.discoveredInstagramAccount}
        autoPostInstagramFeed={hub.autoPostInstagramFeed}
        pinterestBoardId={hub.pinterestBoardId}
        pinterestBoardName={hub.pinterestBoardName}
        autoPostPinterest={hub.autoPostPinterest}
        autoSyncMetaCatalog={hub.autoSyncMetaCatalog}
        webhookUrl={hub.webhookUrl}
        autoTriggerWebhook={hub.autoTriggerWebhook}
      />

      {/* Feedback Alerts */}
      {hub.saveSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{hub.saveSuccess}</span>
        </div>
      )}

      {hub.saveError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{hub.saveError}</span>
        </div>
      )}

      {hub.lastErrorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Notice:</span>
            <span>{hub.lastErrorMessage}</span>
          </div>
        </div>
      )}

      {/* Segmented 7-Channel Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-900/80 p-1.5 rounded-2xl mb-8 border border-zinc-200/80 dark:border-zinc-800 max-w-4xl">
        <button
          type="button"
          onClick={() => {
            hub.setActiveTab("facebook_feed");
            hub.setTestResult(null);
          }}
          className={`flex-1 min-w-[125px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            hub.activeTab === "facebook_feed"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>📢</span> Facebook
        </button>

        <button
          type="button"
          onClick={() => {
            hub.setActiveTab("whatsapp");
            hub.setTestResult(null);
          }}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            hub.activeTab === "whatsapp"
              ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>💬</span> WhatsApp
        </button>

        <button
          type="button"
          onClick={() => {
            hub.setActiveTab("instagram_feed");
            hub.setTestResult(null);
          }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            hub.activeTab === "instagram_feed"
              ? "bg-white dark:bg-zinc-800 text-pink-600 dark:text-pink-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>📸</span> Instagram
        </button>

        <button
          type="button"
          onClick={() => {
            hub.setActiveTab("pinterest");
            hub.setTestResult(null);
          }}
          className={`flex-1 min-w-[135px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            hub.activeTab === "pinterest"
              ? "bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>📌</span> Pinterest Pins
        </button>

        <button
          type="button"
          onClick={() => {
            hub.setActiveTab("templates");
            hub.setTestResult(null);
          }}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            hub.activeTab === "templates"
              ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>✏️</span> Post Templates
        </button>

        <button
          type="button"
          onClick={() => {
            hub.setActiveTab("meta_catalog");
            hub.setTestResult(null);
          }}
          className={`flex-1 min-w-[145px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            hub.activeTab === "meta_catalog"
              ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>🛍️</span> Meta Catalog{" "}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold ml-0.5">
            Enterprise
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            hub.setActiveTab("webhooks");
            hub.setTestResult(null);
          }}
          className={`flex-1 min-w-[125px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            hub.activeTab === "webhooks"
              ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <span>⚡</span> Webhooks{" "}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold ml-0.5">
            Dev
          </span>
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left 2 Columns: Active Channel Form */}
        <div className="lg:col-span-2 space-y-6">
          {hub.activeTab === "facebook_feed" && (
            <FacebookFeedSettings
              isPending={hub.isPending}
              facebookPageId={hub.facebookPageId}
              setFacebookPageId={hub.setFacebookPageId}
              facebookPageAccessToken={hub.facebookPageAccessToken}
              setFacebookPageAccessToken={hub.setFacebookPageAccessToken}
              hasExistingPageToken={hub.hasExistingPageToken}
              showPageToken={hub.showPageToken}
              setShowPageToken={hub.setShowPageToken}
              discoveredPages={hub.discoveredPages}
              isDiscoveringPages={hub.isDiscoveringPages}
              discoveryError={hub.discoveryError}
              testResult={hub.testResult}
              onDiscoverPages={hub.handleDiscoverPages}
              onSelectDiscoveredPage={hub.handleSelectDiscoveredPage}
              onSave={hub.handleSave}
              onTestConnection={hub.handleTestFacebookPage}
            />
          )}

          {hub.activeTab === "whatsapp" && (
            <WhatsAppSettings
              isPending={hub.isPending}
              catalogId={hub.catalogId}
              onBatchCatalogSync={hub.handleBatchCatalogSync}
            />
          )}

          {hub.activeTab === "instagram_feed" && (
            <InstagramFeedSettings
              isPending={hub.isPending}
              instagramAccountId={hub.instagramAccountId}
              setInstagramAccountId={hub.setInstagramAccountId}
              discoveredInstagramAccount={hub.discoveredInstagramAccount}
              isDiscoveringInstagram={hub.isDiscoveringInstagram}
              instagramDiscoveryError={hub.instagramDiscoveryError}
              testResult={hub.testResult}
              onDiscoverInstagram={hub.handleDiscoverInstagram}
              onSave={hub.handleSave}
              onTestConnection={hub.handleTestInstagram}
            />
          )}

          {hub.activeTab === "pinterest" && (
            <PinterestSettings
              isPending={hub.isPending}
              pinterestAccessToken={hub.pinterestAccessToken}
              setPinterestAccessToken={hub.setPinterestAccessToken}
              hasExistingPinterestToken={hub.hasExistingPinterestToken}
              showPinterestToken={hub.showPinterestToken}
              setShowPinterestToken={hub.setShowPinterestToken}
              pinterestBoardId={hub.pinterestBoardId}
              setPinterestBoardId={hub.setPinterestBoardId}
              pinterestBoardName={hub.pinterestBoardName}
              setPinterestBoardName={hub.setPinterestBoardName}
              discoveredBoards={hub.discoveredBoards}
              isDiscoveringBoards={hub.isDiscoveringBoards}
              boardDiscoveryError={hub.boardDiscoveryError}
              testResult={hub.testResult}
              onDiscoverBoards={hub.handleDiscoverBoards}
              onSelectBoard={hub.handleSelectBoard}
              onSave={hub.handleSave}
              onTestPinterest={hub.handleTestPinterest}
            />
          )}

          {hub.activeTab === "templates" && (
            <PostTemplatesSettings
              isPending={hub.isPending}
              brandName={hub.brandName}
              setBrandName={hub.setBrandName}
              customPostTemplate={hub.customPostTemplate}
              setCustomPostTemplate={hub.setCustomPostTemplate}
              onSave={hub.handleSave}
            />
          )}

          {hub.activeTab === "meta_catalog" && (
            <MetaCatalogSettings
              isPending={hub.isPending}
              catalogId={hub.catalogId}
              setCatalogId={hub.setCatalogId}
              accessToken={hub.accessToken}
              setAccessToken={hub.setAccessToken}
              hasExistingCatalogToken={hub.hasExistingCatalogToken}
              showCatalogToken={hub.showCatalogToken}
              setShowCatalogToken={hub.setShowCatalogToken}
              testResult={hub.testResult}
              onSave={hub.handleSave}
              onTestCatalog={hub.handleTestCatalog}
            />
          )}

          {hub.activeTab === "webhooks" && (
            <WebhooksSettings
              isPending={hub.isPending}
              webhookUrl={hub.webhookUrl}
              setWebhookUrl={hub.setWebhookUrl}
              testResult={hub.testResult}
              onSave={hub.handleSave}
              onTestWebhook={hub.handleTestWebhook}
            />
          )}
        </div>

        {/* Right Column: Master Automation Rules & Contextual Actions */}
        <AutomationSidebar
          activeTab={hub.activeTab}
          isPending={hub.isPending}
          autoPostFacebookFeed={hub.autoPostFacebookFeed}
          setAutoPostFacebookFeed={hub.setAutoPostFacebookFeed}
          autoSyncMetaCatalog={hub.autoSyncMetaCatalog}
          setAutoSyncMetaCatalog={hub.setAutoSyncMetaCatalog}
          autoPostInstagramFeed={hub.autoPostInstagramFeed}
          setAutoPostInstagramFeed={hub.setAutoPostInstagramFeed}
          autoPostPinterest={hub.autoPostPinterest}
          setAutoPostPinterest={hub.setAutoPostPinterest}
          autoTriggerWebhook={hub.autoTriggerWebhook}
          setAutoTriggerWebhook={hub.setAutoTriggerWebhook}
          isBulkPostingPinterest={hub.isBulkPostingPinterest}
          forceRepostPinterest={hub.forceRepostPinterest}
          setForceRepostPinterest={hub.setForceRepostPinterest}
          batchPinterestResult={hub.batchPinterestResult}
          onBatchPinterestPublish={hub.handleBatchPinterestPublish}
          isBulkPostingFeed={hub.isBulkPostingFeed}
          forceRepostFeed={hub.forceRepostFeed}
          setForceRepostFeed={hub.setForceRepostFeed}
          batchFeedResult={hub.batchFeedResult}
          onBatchFacebookFeedPublish={hub.handleBatchFacebookFeedPublish}
          batchSyncResult={hub.batchSyncResult}
          onBatchCatalogSync={hub.handleBatchCatalogSync}
          isBulkPostingInstagram={hub.isBulkPostingInstagram}
          forceRepostInstagram={hub.forceRepostInstagram}
          setForceRepostInstagram={hub.setForceRepostInstagram}
          batchInstagramResult={hub.batchInstagramResult}
          onBatchInstagramFeedPublish={hub.handleBatchInstagramFeedPublish}
        />
      </div>

      {/* Sync Activity & Logs Table */}
      <ActivityLogsTable
        logs={hub.logs}
        logsLoading={hub.logsLoading}
        lastSyncAt={hub.lastSyncAt}
        onRefresh={hub.loadLogs}
      />
    </main>
  );
}
