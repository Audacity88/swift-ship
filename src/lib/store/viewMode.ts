import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'list' | 'grid'

interface ViewModeState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export const useViewMode = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'view-mode-storage',
    }
  )
) 