import { clerkClient } from "@clerk/nextjs/server";
import { handleApiError } from "@/shared/errors/error-handler";
import { logger } from "@/shared/logging/logger";

export interface CustomerDeliveryDetails {
  shippingAddress: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone: string;
  shippingPhone2: string;
}

/**
 * Retrieves the stored shipping/delivery details from a customer's Clerk private metadata.
 */
export async function getCustomerDeliveryDetailsService(
  userId: string,
): Promise<CustomerDeliveryDetails | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (user && user.privateMetadata) {
      return {
        shippingAddress: (user.privateMetadata.shippingAddress as string) || "",
        shippingAddressLine2: (user.privateMetadata.shippingAddressLine2 as string) || "",
        shippingCity: (user.privateMetadata.shippingCity as string) || "",
        shippingState: (user.privateMetadata.shippingState as string) || "",
        shippingPostalCode: (user.privateMetadata.shippingPostalCode as string) || "",
        shippingCountry: (user.privateMetadata.shippingCountry as string) || "",
        shippingPhone: (user.privateMetadata.shippingPhone as string) || "",
        shippingPhone2: (user.privateMetadata.shippingPhone2 as string) || "",
      };
    }
    return null;
  } catch (error: unknown) {
    const apiError = handleApiError(error, "Failed to get customer delivery details from Clerk");
    logger.error(apiError.message, { error });
    return null;
  }
}
