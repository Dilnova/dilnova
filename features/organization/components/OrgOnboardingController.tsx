"use client";

import { useState } from "react";
import OrgOnboardingBanner from "@/features/organization/components/OrgOnboardingBanner";
import OrgOnboardingWizardModal, {
  type TaxClassOption,
} from "@/features/organization/components/OrgOnboardingWizardModal";
import type { OrgOnboardingStatus } from "@/features/organization/onboarding";

interface OrgOnboardingControllerProps {
  status: OrgOnboardingStatus;
  orgName?: string;
  autoOpenOnIncomplete?: boolean;
  taxClasses?: TaxClassOption[];
}

export default function OrgOnboardingController({
  status,
  orgName,
  autoOpenOnIncomplete = true,
  taxClasses = [],
}: OrgOnboardingControllerProps) {
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(
    autoOpenOnIncomplete && !status.isCompleted,
  );

  if (status.isCompleted && !isWizardOpen) {
    return null;
  }

  return (
    <>
      <OrgOnboardingBanner
        status={status}
        onOpenWizard={() => setIsWizardOpen(true)}
        orgName={orgName}
      />

      <OrgOnboardingWizardModal
        status={status}
        orgName={orgName}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        taxClasses={taxClasses}
      />
    </>
  );
}
