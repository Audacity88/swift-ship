'use client'

import { useState } from 'react'
import { Search, Filter, Star, MessageSquare, Phone, Mail, Plus } from 'lucide-react'
import Image from 'next/image'
import { COLORS } from '@/lib/constants'

const messages = [
  {
    id: 1,
    sender: 'John Smith',
    title: 'Shipping Delay Query',
    preview: 'Hi, I wanted to check on the status of my shipment...',
    time: '10:30 AM',
    unread: true,
    avatar: 'https://picsum.photos/200',
  },
  {
    id: 2,
    sender: 'Sarah Johnson',
    title: 'Package Insurance',
    preview: 'Could you provide more information about your insurance options?',
    time: 'Yesterday',
    unread: false,
    avatar: 'https://picsum.photos/201',
  },
  {
    id: 3,
    sender: 'Mike Wilson',
    title: 'Bulk Shipping Rates',
    preview: 'We are interested in your bulk shipping rates for our company...',
    time: 'Jan 18',
    unread: true,
    avatar: 'https://picsum.photos/202',
  },
]

const quickReplies = [
  "Thank you for your message. We will get back to you shortly.",
  "Your shipment is currently in transit and on schedule.",
  "I have escalated this to our support team for further assistance.",
  "Could you please provide your tracking number?",
]

export default function InboxPage() {
  const [selectedMessage, setSelectedMessage] = useState(messages[0])

  return (
    <div className="flex h-[calc(100vh-5rem)] -mt-6 -mx-6">
      {/* Message List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {messages.map((message) => (
            <button
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 \
                ${selectedMessage.id === message.id ? 'bg-gray-50' : ''} \
                ${message.unread ? 'bg-blue-50/50' : ''}`}
            >
              <div className="flex gap-3">
                <div className="relative w-10 h-10">
                  <Image
                    src={message.avatar}
                    alt={message.sender}
                    fill
                    className="rounded-full object-cover"
                  />
                  {message.unread && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium truncate">{message.sender}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{message.time}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{message.title}</p>
                  <p className="text-sm text-gray-500 truncate">{message.preview}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation View */}
      <div className="flex-1 bg-white flex flex-col">
        {selectedMessage ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12">
                    <Image
                      src={selectedMessage.avatar}
                      alt={selectedMessage.sender}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedMessage.sender}</h2>
                    <p className="text-sm text-gray-500">{selectedMessage.title}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <Star className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <Mail className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              <div className="max-w-3xl mx-auto">
                <p className="text-gray-600 leading-relaxed">
                  {selectedMessage.preview}
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
                  nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      className="px-4 py-2 bg-gray-100 text-sm text-gray-700 rounded-full whitespace-nowrap \
                        hover:bg-gray-200"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <textarea
                    placeholder="Type your message..."
                    className="flex-1 p-3 border border-gray-200 rounded-lg resize-none \
                      focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={4}
                  />
                  <button
                    className="self-end px-6 py-3 bg-primary text-white rounded-lg font-medium \
                      hover:bg-primary/90 transition-colors"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a message to view
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        className="fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-lg \
          hover:bg-primary/90 transition-colors"
        style={{ backgroundColor: COLORS.primary }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
} 