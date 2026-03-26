// Stripe is loaded lazily when billing features are used.
// Install: npm install @stripe/stripe-js
// Then restore the full implementation from the service scaffold.

export const getStripe = async () => {
  // TODO: import { loadStripe } from '@stripe/stripe-js' when billing sprint begins
  return null
}

export const stripeService = {
  async createPaymentIntent(amount: number, currency: string = 'usd') {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency }),
    })

    if (!response.ok) {
      throw new Error('Failed to create payment intent')
    }

    return response.json()
  },

  async handlePayment(token: string, amount: number) {
    const response = await fetch('/api/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, amount }),
    })

    if (!response.ok) {
      throw new Error('Payment processing failed')
    }

    return response.json()
  },
}
