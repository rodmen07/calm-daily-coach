export function getStripePaymentLink(
  raw = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || !trimmed.startsWith("https://")) {
    return null;
  }

  return trimmed;
}

export function isStripeBillingEnabled(): boolean {
  return getStripePaymentLink() !== null;
}

/**
 * Appends Stripe Payment Link prefill params so a zero-backend static site can
 * still attribute each payment: client_reference_id carries the Firebase uid
 * and prefilled_email seeds Stripe's checkout email field. Existing query
 * params on the link are preserved.
 */
export function buildMembershipCheckoutUrl(
  link: string,
  opts: { uid?: string | null; email?: string | null },
): string {
  const url = new URL(link);
  if (opts.uid) {
    url.searchParams.set("client_reference_id", opts.uid);
  }
  if (opts.email) {
    url.searchParams.set("prefilled_email", opts.email);
  }

  return url.toString();
}
