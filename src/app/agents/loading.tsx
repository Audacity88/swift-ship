export default function AgentsLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 