"use client";

import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  useSocialSettingsHub,
  SocialSettingsHeader,
  ChannelNavigationTabs,
  PlatformSetupGuide,
  ChannelStatusDashboard,
  ActiveChannelSettings,
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
      {/* Header, Breadcrumbs & Save Actions */}
      <SocialSettingsHeader
        syncStatus={hub.syncStatus}
        showGuide={hub.showGuide}
        onToggleGuide={() => hub.setShowGuide(!hub.showGuide)}
        isPending={hub.isPending}
        onSave={hub.handleSave}
      />

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
      <ChannelNavigationTabs
        activeTab={hub.activeTab}
        onSelectTab={(tab) => {
          hub.setActiveTab(tab);
          hub.setTestResult(null);
        }}
      />

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left 2 Columns: Active Channel Form */}
        <div className="lg:col-span-2">
          <ActiveChannelSettings hub={hub} />
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
