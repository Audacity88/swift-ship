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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// Guidance for the local app workflows.
const faqs = [
  {
    question: 'How do I track my shipment?',
    answer: 'Open Shipments to view your shipments and any recorded tracking events. If an update is missing, create a support ticket with your tracking number.',
  },
  {
    question: 'What shipping methods are available?',
    answer: 'The quote form supports full truckload, less than truckload, sea container, and bulk freight. Route estimates require the optional Radar configuration.',
  },
  {
    question: 'How do I change my shipping address?',
    answer: 'You can edit pickup and delivery details on an open quote. For a shipment that is already in progress, create a support ticket to request a change.',
  },
  {
    question: 'What should I do if my package is delayed?',
    answer: 'Check the recorded events on your shipment, then create a support ticket with the tracking number and a description of the delay.',
  },
  {
    question: 'How can I request a refund?',
    answer: 'Create a support ticket with the relevant shipment or quote number and explain your billing question. This app does not process refunds or define a refund policy.',
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
    title: 'Create a Support Ticket',
    icon: MessageCircle,
    description: 'Describe an issue for the support team',
    href: '/portal/tickets/new',
  },
  {
    title: 'Your Support Tickets',
    icon: MessageCircle,
    description: 'View your requests and replies',
    href: '/portal/tickets',
  },
  {
    title: 'Search Articles',
    icon: Search,
    description: 'Search published knowledge base articles',
    href: '/portal/search',
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
              className="h-auto w-full whitespace-normal flex justify-between items-center gap-3"
              onClick={() => toggleFaq(index)}
            >
              <span className="text-left font-medium">{faq.question}</span>
              {expandedFaqs.includes(index) ? (
                <ChevronUp className="h-5 w-5 shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0" />
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
          If the articles do not answer your question, create a support ticket.
        </p>
        <Button asChild><Link href="/portal/tickets/new">Contact Support</Link></Button>
      </div>
    </div>
  )
} 