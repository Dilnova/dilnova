"use client";

import type { SocialSettingsHubState } from "./useSocialSettingsHub";
import { FacebookFeedSettings } from "./FacebookFeedSettings";
import { WhatsAppSettings } from "./WhatsAppSettings";
import { InstagramFeedSettings } from "./InstagramFeedSettings";
import { PinterestSettings } from "./PinterestSettings";
import { PostTemplatesSettings } from "./PostTemplatesSettings";
import { MetaCatalogSettings } from "./MetaCatalogSettings";
import { WebhooksSettings } from "./WebhooksSettings";

export interface ActiveChannelSettingsProps {
  hub: SocialSettingsHubState;
}

export function ActiveChannelSettings({ hub }: ActiveChannelSettingsProps) {
  return (
    <div
      role="tabpanel"
      id={`panel-${hub.activeTab}`}
      aria-labelledby={`tab-${hub.activeTab}`}
      className="space-y-6"
    >
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
  );
}

export default ActiveChannelSettings;
