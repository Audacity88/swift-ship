'use client'

import { useState } from 'react'
import { UserCog } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { AddAgentDialog } from './AddAgentDialog'

export function AddAgentButton() {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <button 
        onClick={() => setShowDialog(true)}
        className="px-4 py-2 text-white rounded-lg flex items-center gap-2"
        style={{ backgroundColor: COLORS.primary }}
      >
        <UserCog className="w-4 h-4" />
        Add Agent
      </button>

      <AddAgentDialog
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </>
  )
} 