import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  verifyPinterestAccount,
  fetchPinterestBoards,
  createPinterestProductPin,
  deletePinterestPin,
} from "@/features/social-share/services/pinterest";

describe("features/social-share/services/pinterest", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("verifyPinterestAccount", () => {
    it("returns error early when access token is missing or empty", async () => {
      const result = await verifyPinterestAccount("   ");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing Pinterest access token.");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("successfully verifies user account on valid response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          username: "dilnova_artisan",
          business_name: "Dilnova Handcrafted",
          profile_image: "https://example.com/avatar.jpg",
          account_type: "BUSINESS",
        }),
      });

      const result = await verifyPinterestAccount("valid_token_123");

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        username: "dilnova_artisan",
        businessName: "Dilnova Handcrafted",
        profileImage: "https://example.com/avatar.jpg",
        accountType: "BUSINESS",
      });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/user_account",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer valid_token_123",
          }),
        }),
      );
    });

    it("provides guided remediation when consumer type is not supported (trial access)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: "consumer type is not supported for this endpoint" }),
      });

      const result = await verifyPinterestAccount("token_pending");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Trial Access Pending");
    });

    it("provides guided instructions when HTTP 401 unauthorized occurs", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Authentication failed" }),
      });

      const result = await verifyPinterestAccount("invalid_token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Pinterest Authentication Failed (HTTP 401)");
    });

    it("catches network and fetch exceptions gracefully", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("DNS resolution timeout"),
      );

      const result = await verifyPinterestAccount("any_token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("DNS resolution timeout");
    });
  });

  describe("fetchPinterestBoards", () => {
    it("returns error early if access token is empty", async () => {
      const result = await fetchPinterestBoards("");

      expect(result.success).toBe(false);
      expect(result.boards).toEqual([]);
      expect(result.error).toBe("Missing Pinterest access token.");
    });

    it("fetches and maps Pinterest boards including cover thumbnail", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "board_100",
              name: "Living Room Decor",
              description: "Handcrafted lamps and clay pots",
              privacy: "PUBLIC",
              media: { image_cover_url: "https://example.com/cover1.jpg" },
            },
            {
              id: "board_200",
              name: "Handmade Gifts",
              description: null,
              privacy: "PROTECTED",
            },
          ],
        }),
      });

      const result = await fetchPinterestBoards("token_boards");

      expect(result.success).toBe(true);
      expect(result.boards).toHaveLength(2);
      expect(result.boards[0]).toEqual({
        id: "board_100",
        name: "Living Room Decor",
        description: "Handcrafted lamps and clay pots",
        privacy: "PUBLIC",
        imageThumbnailUrl: "https://example.com/cover1.jpg",
      });
      expect(result.boards[1].imageThumbnailUrl).toBeUndefined();
    });

    it("handles API error responses during board fetch", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Forbidden scope" }),
      });

      const result = await fetchPinterestBoards("token_no_scope");

      expect(result.success).toBe(false);
      expect(result.boards).toEqual([]);
      expect(result.error).toBe("Forbidden scope");
    });

    it("handles network failure during board fetch", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network connection dropped"),
      );

      const result = await fetchPinterestBoards("token_net_fail");

      expect(result.success).toBe(false);
      expect(result.boards).toEqual([]);
      expect(result.error).toBe("Network connection dropped");
    });
  });

  describe("createPinterestProductPin", () => {
    const mockProduct = {
      id: "prod_ceramic_vase",
      name: "Ceramic Floral Vase",
      description: "Artisan glazed vase designed for fresh blossoms.",
      price: 6500, // 65.00
      imageUrl: "https://res.cloudinary.com/demo/image/upload/vase.jpg",
    };

    it("returns error if boardId or token is missing", async () => {
      const res = await createPinterestProductPin({
        boardId: "",
        accessToken: "valid_tok",
        product: mockProduct,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Missing Pinterest board ID or access token.");
    });

    it("returns error if product lacks a public image URL", async () => {
      const res = await createPinterestProductPin({
        boardId: "123456",
        accessToken: "valid_tok",
        product: {
          ...mockProduct,
          imageUrl: undefined,
        },
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("no valid public image URL");
    });

    it("creates a pin with numeric board ID, formatted price, description and link", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "pin_created_789" }),
      });

      const res = await createPinterestProductPin({
        boardId: "987654321",
        accessToken: "tok_pin",
        product: mockProduct,
        currency: "LKR",
        storeUrl: "https://artisan.dilnova.com",
        brandName: "Artisan Co",
      });

      expect(res.success).toBe(true);
      expect(res.pinId).toBe("pin_created_789");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/pins",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"board_id":"987654321"'),
        }),
      );

      const requestBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(requestBody.title).toBe("Ceramic Floral Vase");
      expect(requestBody.description).toContain("LKR 65.00");
      expect(requestBody.description).toContain(
        "https://artisan.dilnova.com/products/prod_ceramic_vase",
      );
      expect(requestBody.link).toBe("https://artisan.dilnova.com/products/prod_ceramic_vase");
      expect(requestBody.media_source).toEqual({
        source_type: "image_url",
        url: "https://res.cloudinary.com/demo/image/upload/vase.jpg",
      });
    });

    it("resolves board slug to numeric board ID when board name is provided instead of ID", async () => {
      // First fetch: fetchPinterestBoards to resolve slug
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [{ id: "numeric_board_555", name: "Ceramics Pottery" }],
        }),
      });

      // Second fetch: POST /pins with resolved numeric ID
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "pin_with_slug_id" }),
      });

      const res = await createPinterestProductPin({
        boardId: "https://www.pinterest.com/dilnova/ceramics-pottery/",
        accessToken: "tok_pin",
        product: mockProduct,
      });

      expect(res.success).toBe(true);
      expect(res.pinId).toBe("pin_with_slug_id");

      const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      const parsedBody = JSON.parse(postCall[1].body);
      expect(parsedBody.board_id).toBe("numeric_board_555");
    });

    it("handles API failure when Pinterest rejects Pin payload", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: "Image aspect ratio unsupported" }),
      });

      const res = await createPinterestProductPin({
        boardId: "123456",
        accessToken: "tok_pin",
        product: mockProduct,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Image aspect ratio unsupported");
    });
  });

  describe("deletePinterestPin", () => {
    it("returns error if pinId or accessToken is missing", async () => {
      const res = await deletePinterestPin("", "valid_tok");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Missing Pin ID or access token.");
    });

    it("deletes pin successfully on HTTP 204/200 response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const res = await deletePinterestPin("pin_to_remove", "tok_delete");

      expect(res.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.pinterest.com/v5/pins/pin_to_remove",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: "Bearer tok_delete",
          }),
        }),
      );
    });

    it("treats HTTP 404 (already deleted) as a successful deletion", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const res = await deletePinterestPin("pin_gone", "tok_delete");

      expect(res.success).toBe(true);
    });

    it("returns error when deletion fails with non-404 error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Cannot delete pin created by another user" }),
      });

      const res = await deletePinterestPin("pin_forbidden", "tok_delete");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Cannot delete pin created by another user");
    });
  });
});
