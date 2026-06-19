/// <reference types="vite/client" />
import posthog from 'posthog-js';

// Retrieve keys from Vite environment. Safe defaults used to prevent runtime crashes.
const posthogKey = import.meta.env.VITE_POSTHOG_KEY || '';
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isPostHogInitialized = false;

export function initPostHog() {
  if (isPostHogInitialized) return;

  if (posthogKey) {
    try {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        loaded: () => {
          console.log('PostHog analytics loaded successfully');
        },
        capture_pageview: true,
        persistence: 'localStorage',
      });
      isPostHogInitialized = true;
    } catch (e) {
      console.error('Error initiating PostHog SDK:', e);
    }
  } else {
    // Graceful logging for sandbox envs without keys configured yet
    console.warn(
      'PostHog SDK warning: VITE_POSTHOG_KEY is not defined in environments. Operating in graceful tracking simulation mode.'
    );
  }
}

/**
 * Tracks when a shopper opens a specific product detailed screen
 */
export function trackProductViewed(productId: string, name: string, price: number, category?: string) {
  initPostHog();
  const payload = {
    product_id: productId,
    name,
    price,
    category: category || 'Unassigned',
  };

  if (isPostHogInitialized) {
    posthog.capture('product_viewed', payload);
  } else {
    console.log('[PostHog Simulation] event: product_viewed', payload);
  }
}

/**
 * Tracks when a shopper adds an item to their cart
 */
export function trackAddToCart(productId: string, name: string, price: number, quantity: number = 1) {
  initPostHog();
  const payload = {
    product_id: productId,
    name,
    price,
    quantity,
    total_value: price * quantity,
  };

  if (isPostHogInitialized) {
    posthog.capture('add_to_cart', payload);
  } else {
    console.log('[PostHog Simulation] event: add_to_cart', payload);
  }
}

/**
 * Tracks when a shopper initiates checkout/payment popup flow
 */
export function trackCheckoutStarted(
  cartItems: Array<{ id: string; title: string; price: number; quantity: number }>,
  totalAmount: number
) {
  initPostHog();
  const payload = {
    items_count: cartItems.length,
    total_amount: totalAmount,
    items: cartItems.map((item) => ({
      product_id: item.id,
      name: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  };

  if (isPostHogInitialized) {
    posthog.capture('checkout_started', payload);
  } else {
    console.log('[PostHog Simulation] event: checkout_started', payload);
  }
}

/**
 * Tracks when Paystack inline script verifies successful client transfer/charge
 */
export function trackPaymentCompleted(referenceId: string, totalAmount: number, paymentMethod: string) {
  initPostHog();
  const payload = {
    reference_id: referenceId,
    total_amount: totalAmount,
    payment_method: paymentMethod,
  };

  if (isPostHogInitialized) {
    posthog.capture('payment_completed', payload);
  } else {
    console.log('[PostHog Simulation] event: payment_completed', payload);
  }
}

/**
 * Tracks when final local state stores and generates physical Order records on the terminal
 */
export function trackOrderCompleted(orderId: string, totalAmount: number, itemsCount: number) {
  initPostHog();
  const payload = {
    order_id: orderId,
    total_amount: totalAmount,
    items_count: itemsCount,
  };

  if (isPostHogInitialized) {
    posthog.capture('order_completed', payload);
  } else {
    console.log('[PostHog Simulation] event: order_completed', payload);
  }
}
