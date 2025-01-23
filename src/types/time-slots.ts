export interface TimeSlot {
  id: string
  label: string
  start: string
  end: string
  available: boolean
}

export const TIME_SLOTS: TimeSlot[] = [
  { 
    id: 'morning_1',
    label: '09:00 AM - 11:00 AM',
    start: '09:00 AM', 
    end: '11:00 AM', 
    available: true 
  },
  { 
    id: 'morning_2',
    label: '11:00 AM - 01:00 PM',
    start: '11:00 AM', 
    end: '01:00 PM', 
    available: true 
  },
  { 
    id: 'afternoon_1',
    label: '01:00 PM - 03:00 PM',
    start: '01:00 PM', 
    end: '03:00 PM', 
    available: true 
  },
  { 
    id: 'afternoon_2',
    label: '03:00 PM - 05:00 PM',
    start: '03:00 PM', 
    end: '05:00 PM', 
    available: true 
  },
  { 
    id: 'evening',
    label: '05:00 PM - 07:00 PM',
    start: '05:00 PM', 
    end: '07:00 PM', 
    available: true 
  }
] 