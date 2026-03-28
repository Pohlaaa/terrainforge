/**
 * create-checkout-session
 *
 * Creates a Stripe-hosted Checkout Session for a given price and org.
 *
 * Request body:
 *   { price_id, org_id, success_url, cancel_url }
 *
 * Response:
 *   { url }  — the Stripe Checkout URL the client should redirect to.
 *
 * Org lookup: uses owner_id = org_id (Phase 1 MVP: user.id === org.owner_id).
 * If no Stripe customer exists for the org yet, one is created and persisted.
 */

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RequestBody {
  price_id?: string;
  org_id?: string;
  success_url?: string;
  cancel_url?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Validate env ──────────────────────────────────────────────────────────

  const stripeSecretKey  = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl      = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('create-checkout-session: missing required environment variables');
    return new Response('Server configuration error', { status: 500 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { price_id, org_id, success_url, cancel_url } = body;

  if (!price_id || !org_id || !success_url || !cancel_url) {
    return new Response(
      'Missing required fields: price_id, org_id, success_url, cancel_url',
      { status: 400 }
    );
  }

  // ── Build clients ─────────────────────────────────────────────────────────

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // ── Look up org ───────────────────────────────────────────────────────────

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('owner_id', org_id)
    .single();

  if (orgError || !org) {
    console.error('create-checkout-session: org not found', { org_id, orgError });
    return new Response('Organization not found', { status: 404 });
  }

  // ── Resolve Stripe customer ───────────────────────────────────────────────

  let customerId: string = (org as { stripe_customer_id?: string | null }).stripe_customer_id ?? '';

  if (!customerId) {
    // Fetch the user's email so the Stripe customer record is recognisable
    const { data: authData } = await supabase.auth.admin.getUserById(org_id);
    const email = authData?.user?.email;

    const customer = await stripe.customers.create({
      ...(email ? { email } : {}),
      name: (org as { name?: string | null }).name ?? undefined,
      metadata: { org_id },
    });
    customerId = customer.id;

    // Persist the new customer ID back to the org row
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', (org as { id: string }).id);
  }

  // ── Create Checkout Session ───────────────────────────────────────────────

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: price_id, quantity: 1 }],
    mode: 'subscription',
    success_url,
    cancel_url,
    // org_id in metadata lets the webhook handler link the subscription back
    // to the org row on checkout.session.completed.
    metadata: { org_id },
  });

  if (!session.url) {
    console.error('create-checkout-session: Stripe returned no session URL', { sessionId: session.id });
    return new Response('Stripe did not return a checkout URL', { status: 500 });
  }

  console.log(`create-checkout-session: created session ${session.id} for org ${org_id}`);

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
