interface FetchTicketsParams {
  filters?: {
    status?: string[];
    priority?: string[];
    search?: string;
  };
  page?: number;
  per_page?: number;
}

export const fetchTickets = async (params?: FetchTicketsParams) => {
  // Mock implementation for testing
  return Promise.resolve({
    data: [],
    pagination: {
      total: 0,
      current_page: params?.page || 1,
      per_page: params?.per_page || 10,
    },
  })
} 