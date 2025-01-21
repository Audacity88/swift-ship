'use client'

import { Check } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface PricingTier {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
}

export default function UpgradePage() {
  const tiers: PricingTier[] = [
    {
      name: 'Basic',
      price: '$9',
      description: 'Essential features for small teams',
      features: [
        'Up to 3 team members',
        '100 tickets per month',
        'Email support',
        'Basic analytics',
        'Knowledge base',
      ],
    },
    {
      name: 'Professional',
      price: '$29',
      description: 'Advanced features for growing businesses',
      features: [
        'Up to 10 team members',
        'Unlimited tickets',
        'Priority email & chat support',
        'Advanced analytics',
        'Custom branding',
        'API access',
        'SLA management',
      ],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: '$99',
      description: 'Complete solution for large organizations',
      features: [
        'Unlimited team members',
        'Unlimited tickets',
        '24/7 phone & priority support',
        'Custom analytics',
        'Custom branding',
        'API access',
        'SLA management',
        'Dedicated account manager',
        'Custom integrations',
        'SSO & advanced security',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your team's needs. All plans include our core features with additional capabilities as you grow.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl bg-white p-8 shadow-lg ${
                tier.highlighted ? 'ring-2 ring-primary' : ''
              }`}
            >
              {tier.highlighted && (
                <span
                  className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  Most Popular
                </span>
              )}

              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-x-2">
                  <span className="text-5xl font-bold">{tier.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="mt-4 text-gray-600">{tier.description}</p>
              </div>

              <ul className="mt-8 space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                  tier.highlighted
                    ? 'text-white hover:bg-primary/90'
                    : 'text-primary border border-primary hover:bg-gray-50'
                }`}
                style={tier.highlighted ? { backgroundColor: COLORS.primary } : {}}
              >
                {tier.highlighted ? 'Upgrade Now' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Can I change plans later?</h3>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards, PayPal, and bank transfers for annual plans.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Is there a free trial?</h3>
              <p className="text-gray-600">Yes, all paid plans come with a 14-day free trial. No credit card required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 