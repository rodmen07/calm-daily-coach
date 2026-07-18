import { describe, expect, it } from "vitest";
import { buildMembershipCheckoutUrl, getStripePaymentLink } from "@/lib/billing";

describe("getStripePaymentLink", () => {
  it("returns null when unset, empty, or whitespace", () => {
    expect(getStripePaymentLink(undefined)).toBeNull();
    expect(getStripePaymentLink("")).toBeNull();
    expect(getStripePaymentLink("   ")).toBeNull();
  });

  it("returns the trimmed URL for a padded https value", () => {
    expect(getStripePaymentLink("  https://buy.stripe.com/test_abc  ")).toBe(
      "https://buy.stripe.com/test_abc",
    );
  });

  it("rejects non-https values", () => {
    expect(getStripePaymentLink("http://buy.stripe.com/test_abc")).toBeNull();
    expect(getStripePaymentLink("javascript:alert(1)")).toBeNull();
    expect(getStripePaymentLink("buy.stripe.com/test_abc")).toBeNull();
  });
});

describe("buildMembershipCheckoutUrl", () => {
  const LINK = "https://buy.stripe.com/test_abc";

  it("appends client_reference_id and prefilled_email", () => {
    const url = new URL(
      buildMembershipCheckoutUrl(LINK, { uid: "uid-123", email: "user@example.com" }),
    );
    expect(url.searchParams.get("client_reference_id")).toBe("uid-123");
    expect(url.searchParams.get("prefilled_email")).toBe("user@example.com");
  });

  it("omits params that are absent", () => {
    const uidOnly = new URL(buildMembershipCheckoutUrl(LINK, { uid: "uid-123", email: null }));
    expect(uidOnly.searchParams.get("client_reference_id")).toBe("uid-123");
    expect(uidOnly.searchParams.has("prefilled_email")).toBe(false);

    const bare = new URL(buildMembershipCheckoutUrl(LINK, {}));
    expect(bare.searchParams.has("client_reference_id")).toBe(false);
    expect(bare.searchParams.has("prefilled_email")).toBe(false);
  });

  it("preserves query params already on the link", () => {
    const url = new URL(
      buildMembershipCheckoutUrl(`${LINK}?locale=en`, { uid: "uid-123" }),
    );
    expect(url.searchParams.get("locale")).toBe("en");
    expect(url.searchParams.get("client_reference_id")).toBe("uid-123");
  });
});
