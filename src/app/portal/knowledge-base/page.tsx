'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Book, Package, Truck, Settings, HelpCircle } from 'lucide-react'

// Mock data - replace with real data from your backend
const categories = [
  {
    id: 'c1b1b1b1-1111-1111-1111-111111111111',
    title: 'Getting Started',
    icon: Book,
    description: 'Learn the basics of using our platform',
    articles: [
      {
        id: 'a1111112-1111-1111-1111-111111111112',
        title: 'Platform Overview',
        slug: 'platform-overview'
      },
      {
        id: 'a1111113-1111-1111-1111-111111111113',
        title: 'Creating Your First Shipment',
        slug: 'creating-your-first-shipment'
      }
    ],
  },
  {
    id: '9145394c-3e4e-40ea-9f5e-ea8efc40547d',
    title: 'Shipping',
    icon: Package,
    description: 'Everything about shipping processes',
    articles: [
      {
        id: 'a2222223-2222-2222-2222-222222222223',
        title: 'Shipping Methods',
        slug: 'shipping-methods'
      },
      {
        id: 'a2222224-2222-2222-2222-222222222224',
        title: 'Packaging Guidelines',
        slug: 'packaging-guidelines'
      },
      {
        id: 'a2222225-2222-2222-2222-222222222225',
        title: 'International Shipping',
        slug: 'international-shipping'
      }
    ],
  },
  {
    id: 'c3b3b3b3-3333-3333-3333-333333333333',
    title: 'Tracking',
    icon: Truck,
    description: 'Track and manage your shipments',
    articles: [
      {
        id: 'a3333334-3333-3333-3333-333333333334',
        title: 'Real-time Tracking',
        slug: 'real-time-tracking'
      },
      {
        id: 'a3333335-3333-3333-3333-333333333335',
        title: 'Delivery Updates',
        slug: 'delivery-updates'
      },
      {
        id: 'a3333336-3333-3333-3333-333333333336',
        title: 'Lost Package Protocol',
        slug: 'lost-package-protocol'
      }
    ],
  },
  {
    id: 'c4b4b4b4-4444-4444-4444-444444444444',
    title: 'Account Settings',
    icon: Settings,
    description: 'Manage your account and preferences',
    articles: [
      {
        id: 'a4444445-4444-4444-4444-444444444445',
        title: 'Profile Management',
        slug: 'profile-management'
      },
      {
        id: 'a4444446-4444-4444-4444-444444444446',
        title: 'Notification Settings',
        slug: 'notification-settings'
      },
      {
        id: 'a4444447-4444-4444-4444-444444444447',
        title: 'Billing Information',
        slug: 'billing-information'
      }
    ],
  },
  {
    id: 'c5b5b5b5-5555-5555-5555-555555555555',
    title: 'Troubleshooting',
    icon: HelpCircle,
    description: 'Common issues and solutions',
    articles: [
      {
        id: 'a5555556-5555-5555-5555-555555555556',
        title: 'Common Issues',
        slug: 'common-issues'
      },
      {
        id: 'a5555557-5555-5555-5555-555555555557',
        title: 'Error Messages',
        slug: 'error-messages'
      },
      {
        id: 'a5555558-5555-5555-5555-555555555558',
        title: 'Contact Support',
        slug: 'contact-support'
      }
    ],
  },
]

export default function KnowledgeBasePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = categories.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.articles.some(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>

      <div className="relative mb-8">
        <Input
          type="search"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => {
          const Icon = category.icon
          return (
            <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{category.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.articles.map((article) => (
                      <li key={article.id}>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-sm text-primary hover:text-primary/80"
                          onClick={() => router.push(`/articles/${article.slug}`)}
                        >
                          {article.title}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No articles found matching your search.
          </p>
        </div>
      )}
    </div>
  )
} 