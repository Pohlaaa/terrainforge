/**
 * create-portal-session
 *
 * Creates a Stripe Customer Portal session so a subscriber can manage their
 * payment method, view invoices, and cancel/change their plan.
 *
 * Request body:
 *   { org_id, return_url? }
 *
 * Response:
 *   { url }  — the Stripe Customer Portal URL the client should redirect to.
 *
 * Org lookup: uses owner_id = org_id (Phase 1 MVP: user.id === org.owner_id).
 * Returns 404 if the org has no linked Stripe customer (i.e. never subscribed).
 */

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RequestBody {
  org_id?: string;
  return_url?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Validate env ──────────────────────────────────────────────────────────

  const stripeSecretKey    = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl        = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('create-portal-session: missing required environment variables');
    return new Response('Server configuration error', { status: 500 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { org_id, return_url } = body;

  if (!org_id) {
    return new Response('Missing required field: org_id', { status: 400 });
  }

  // ── Build clients ─────────────────────────────────────────────────────────

  const stripe   = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // ── Look up org's Stripe customer ─────────────────────────────────────────

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('owner_id', org_id)
    .single();

  if (orgError || !org) {
    console.error('create-portal-session: org not found', { org_id, orgError });
    return new Response('Organization not found', { status: 404 });
  }

  const customerId = (org as { stripe_customer_id?: string | null }).stripe_customer_id;

  if (!customerId) {
    return new Response(
      'No billing account found for this organisation — subscribe first',
      { status: 404 }
    );
  }

  // ── Create portal session ─────────────────────────────────────────────────

  // Resolve the return URL — prefer the caller-supplied value, fall back to
  // the SITE_URL env var (set in the Supabase project dashboard), then '/billing'.
  const resolvedReturnUrl =
    return_url ??
    (Deno.env.get('SITE_URL') ? `${Deno.env.get('SITE_URL')}/billing` : '/billing');

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: resolvedReturnUrl,
  });

  console.log(`create-portal-session: created portal session for customer ${customerId}`);

  return new Response(JSON.stringify({ url: portalSession.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
