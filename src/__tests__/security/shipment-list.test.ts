import { GET } from '@/app/api/shipments/route'
import { getRouteSupabase } from '@/lib/supabase-server'
import { shipmentService } from '@/lib/services/shipment-service'

jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, options?: { status: number }) => ({ status: options?.status ?? 200, json: async () => body }) },
}))
jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('@/lib/supabase-server', () => ({ getRouteSupabase: jest.fn() }))
jest.mock('@/lib/services/shipment-service', () => ({ shipmentService: { listShipments: jest.fn() } }))

beforeEach(() => jest.clearAllMocks())

it('returns service data as shipments, supplies status as an array, and retains the request client', async () => {
  const supabase = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'customer' } }, error: null }) } }
  ;(getRouteSupabase as jest.Mock).mockResolvedValue(supabase)
  ;(shipmentService.listShipments as jest.Mock).mockResolvedValue({ data: [{ id: 'shipment' }], total: 7 })
  const response = await GET({ url: 'http://localhost/api/shipments?status=in_transit&page=2&limit=3' } as Request)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ shipments: [{ id: 'shipment' }], total: 7, page: 2, limit: 3 })
  expect(shipmentService.listShipments).toHaveBeenCalledWith(undefined, expect.objectContaining({ status: ['in_transit'], page: 2, limit: 3 }), supabase)
})

it('stops signed-out requests before the listing service', async () => {
  ;(getRouteSupabase as jest.Mock).mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) } })
  const response = await GET({ url: 'http://localhost/api/shipments' } as Request)
  expect(response.status).toBe(401)
  expect(shipmentService.listShipments).not.toHaveBeenCalled()
})
