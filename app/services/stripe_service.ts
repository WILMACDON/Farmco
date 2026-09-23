import Stripe from 'stripe'
import env from '#start/env'

class StripeService {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(env.get('STRIPE_SECRET_KEY')!)
  }

  /**
   * Get the underlying Stripe client instance
   */
  getClient() {
    return this.stripe
  }

  /**
   * Create a new product in Stripe
   */
  async createProduct(name: string, description?: string) {
    return this.stripe.products.create({
      name,
      description,
    })
  }

  /**
   * Create a recurring price for a product
   */
  async createRecurringPrice(params: {
    productId: string
    unitAmount: number // in cents
    currency: string
    interval: 'month' | 'year'
    lookupKey?: string
  }) {
    return this.stripe.prices.create({
      product: params.productId,
      unit_amount: params.unitAmount,
      currency: params.currency,
      recurring: { interval: params.interval },
      lookup_key: params.lookupKey,
    })
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(params: {
    email: string
    name?: string
    metadata?: Record<string, string>
  }) {
    // Search for existing customer by email
    const existingCustomers = await this.stripe.customers.list({
      email: params.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    return this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    })
  }

  /**
   * Create a checkout session for a subscription
   */
  async createCheckoutSession(params: {
    customerId: string
    priceId: string
    successUrl: string
    cancelUrl: string
    clientReferenceId?: string
    metadata?: Record<string, string>
  }) {
    return this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],

      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.clientReferenceId,
      metadata: params.metadata,
      allow_promotion_codes: true,
    })
  }

  /**
   * Create a billing portal session for managing subscriptions
   */
  async createPortalSession(customerId: string, returnUrl: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
  }

  async retrieveCheckoutSession(sessionId: string) {
    return this.getClient().checkout.sessions.retrieve(sessionId)
  }

  /**
   * List invoices for a customer
   */
  async getInvoices(customerId: string) {
    return this.stripe.invoices.list({
      customer: customerId,
      limit: 24,
    })
  }
}

const stripeService = new StripeService()
export default stripeService
