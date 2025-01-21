'use client'

import { UserCog, Mail, Phone, Shield } from 'lucide-react'

export default function AgentsPage() {
  const agents = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@example.com',
      role: 'Senior Agent',
      phone: '+1 (555) 123-4567',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      role: 'Support Agent',
      phone: '+1 (555) 234-5678',
      status: 'Away',
    },
    {
      id: 3,
      name: 'Michael Brown',
      email: 'michael.b@example.com',
      role: 'Team Lead',
      phone: '+1 (555) 345-6789',
      status: 'Active',
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-gray-600">Manage your support team members</p>
        </div>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
          style={{ backgroundColor: '#0066FF' }}
        >
          <UserCog className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} className="border-b border-gray-200">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <UserCog className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span>{agent.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {agent.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {agent.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    agent.status === 'Active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {agent.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-sm text-primary hover:text-primary-dark">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 