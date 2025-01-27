'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  MessageCircle,
  Book,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// Mock data - replace with real data from your backend
const faqs = [
  {
    question: 'How do I track my shipment?',
    answer: 'You can track your shipment by entering your tracking number in the tracking section of our platform. Real-time updates are provided for all shipments.',
  },
  {
    question: 'What shipping methods are available?',
    answer: 'We offer various shipping methods including Standard Ground, Express, and Next-Day delivery. The available options will be shown during checkout.',
  },
  {
    question: 'How do I change my shipping address?',
    answer: 'You can update your shipping address in your account settings or during the checkout process. For active shipments, please contact support.',
  },
  {
    question: 'What should I do if my package is delayed?',
    answer: 'If your package is delayed, first check the tracking information for updates. If there are no updates for 24 hours, please contact our support team.',
  },
  {
    question: 'How can I request a refund?',
    answer: 'To request a refund, please contact our support team with your order number and reason for the refund. We will process your request within 2-3 business days.',
  },
]

const quickLinks = [
  {
    title: 'Documentation',
    icon: Book,
    description: 'Browse our detailed documentation',
    href: '/portal/knowledge-base',
  },
  {
    title: 'Live Chat',
    icon: MessageCircle,
    description: 'Chat with our support team',
    href: '/portal/contact',
  },
  {
    title: 'Phone Support',
    icon: Phone,
    description: 'Call us at 1-800-SHIP-NOW',
    href: 'tel:1-800-SHIP-NOW',
  },
  {
    title: 'Email Support',
    icon: Mail,
    description: 'Email our support team',
    href: 'mailto:support@swiftship.com',
  },
]

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([])

  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Help Center</h1>

      <div className="relative mb-8">
        <Input
          type="search"
          placeholder="Search FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {quickLinks.map((link, index) => {
          const Icon = link.icon
          return (
            <Link key={index} href={link.href}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{link.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {link.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
      
      <div className="space-y-4">
        {filteredFaqs.map((faq, index) => (
          <Card key={index} className="p-4">
            <Button
              variant="ghost"
              className="w-full flex justify-between items-center"
              onClick={() => toggleFaq(index)}
            >
              <span className="text-left font-medium">{faq.question}</span>
              {expandedFaqs.includes(index) ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
            {expandedFaqs.includes(index) && (
              <div className="mt-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                {faq.answer}
              </div>
            )}
          </Card>
        ))}

        {filteredFaqs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No FAQs found matching your search.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-primary/5 rounded-lg">
        <h3 className="font-semibold mb-2">Still need help?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          If you couldn't find what you're looking for, our support team is here to help.
        </p>
        <Link href="/portal/contact">
          <Button>Contact Support</Button>
        </Link>
      </div>
    </div>
  )
} 