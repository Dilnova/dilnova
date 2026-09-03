import { PinterestPinParams } from "../types";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
  imageThumbnailUrl?: string;
}

export interface PinterestUserAccount {
  username: string;
  businessName?: string;
  profileImage?: string;
  accountType?: string;
}

/**
 * Verifies vendor's Pinterest Access Token by fetching user account details.
 */
export async function verifyPinterestAccount(accessToken: string): Promise<{
  success: boolean;
  user?: PinterestUserAccount;
  error?: string;
}> {
  try {
    const cleanToken = accessToken.trim();
    if (!cleanToken) {
      return { success: false, error: "Missing Pinterest access token." };
    }

    const res = await fetch(`${PINTEREST_API_BASE}/user_account`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      const msg =
        data?.message || data?.error?.message || `Pinterest API returned status ${res.status}`;
      return { success: false, error: msg };
    }

    return {
      success: true,
      user: {
        username: data.username,
        businessName: data.business_name || data.username,
        profileImage: data.profile_image,
        accountType: data.account_type,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to connect to Pinterest API.",
    };
  }
}

/**
 * Lists all boards owned by the authenticated Pinterest user account.
 */
export async function fetchPinterestBoards(accessToken: string): Promise<{
  success: boolean;
  boards: PinterestBoard[];
  error?: string;
}> {
  try {
    const cleanToken = accessToken.trim();
    if (!cleanToken) {
      return { success: false, boards: [], error: "Missing Pinterest access token." };
    }

    const res = await fetch(`${PINTEREST_API_BASE}/boards?page_size=50`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message || data?.error?.message || `Pinterest API error (${res.status})`;
      return { success: false, boards: [], error: msg };
    }

    const rawBoards = (data.items || []) as Array<{
      id: string;
      name: string;
      description?: string;
      privacy?: string;
      media?: { image_cover_url?: string };
    }>;

    const boards: PinterestBoard[] = rawBoards.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      privacy: b.privacy,
      imageThumbnailUrl: b.media?.image_cover_url,
    }));

    return { success: true, boards };
  } catch (err) {
    return {
      success: false,
      boards: [],
      error: err instanceof Error ? err.message : "Failed to fetch Pinterest boards.",
    };
  }
}

/**
 * Publishes a Product Pin to a specified Pinterest Board via Pinterest API v5.
 */
export async function createPinterestProductPin({
  boardId,
  accessToken,
  product,
  currency = "LKR",
  storeUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dilnova.com",
  brandName = "Dilnova",
}: PinterestPinParams): Promise<{
  success: boolean;
  pinId?: string;
  error?: string;
}> {
  try {
    const cleanToken = accessToken.trim();
    const cleanBoardId = boardId.trim();

    if (!cleanToken || !cleanBoardId) {
      return { success: false, error: "Missing Pinterest board ID or access token." };
    }

    const imageUrl = product.imageUrl || product.media?.[0]?.url;
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return {
        success: false,
        error: "Product has no valid public image URL required for Pinterest.",
      };
    }

    const cleanStoreUrl = storeUrl.replace(/\/+$/, "");
    const productUrl = `${cleanStoreUrl}/products/${product.id}`;
    const formattedPrice = `${currency.toUpperCase()} ${(product.price / 100).toFixed(2)}`;

    // Build title (max 100 characters per Pinterest API v5 specs)
    const title = (product.name || "Product").slice(0, 100);

    // Build description (max 800 characters per Pinterest API v5 specs)
    const descParts = [
      `🛍️ ${product.name}`,
      `💵 Price: ${formattedPrice}`,
      product.description ? `\n${product.description.slice(0, 500)}` : "",
      `\n🛒 Available on ${brandName || "Dilnova"}: ${productUrl}`,
    ].filter(Boolean);

    const description = descParts.join("\n").slice(0, 800);

    const payload = {
      board_id: cleanBoardId,
      media_source: {
        source_type: "image_url",
        url: imageUrl,
      },
      title,
      description,
      link: productUrl,
      alt_text: title.slice(0, 500),
    };

    const res = await fetch(`${PINTEREST_API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg =
        data?.message || data?.error?.message || `Pinterest Pin creation failed (${res.status})`;
      return { success: false, error: msg };
    }

    return {
      success: true,
      pinId: data.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish Pin to Pinterest.",
    };
  }
}

/**
 * Deletes a Pin from Pinterest by Pin ID.
 */
export async function deletePinterestPin(
  pinId: string,
  accessToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanToken = accessToken.trim();
    const cleanPinId = pinId.trim();

    if (!cleanToken || !cleanPinId) {
      return { success: false, error: "Missing Pin ID or access token." };
    }

    const res = await fetch(`${PINTEREST_API_BASE}/pins/${cleanPinId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok && res.status !== 404) {
      const data = await res.json().catch(() => null);
      const msg = data?.message || `Failed to delete Pin (${res.status})`;
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete Pin from Pinterest.",
    };
  }
}
