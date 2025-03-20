import Navbar from "../Navbar"
import PageTransition from "../PageTransition"

const ClientDetailsSkeleton = () => {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-between items-center mb-8">
            <div className="h-10 w-48 bg-gray-800 animate-pulse rounded"></div>
            <div className="h-10 w-32 bg-gray-800 animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-64 bg-gray-800/50 animate-pulse rounded-md"></div>
            ))}
          </div>
        </main>
      </div>
    </PageTransition>
  )
}

export default ClientDetailsSkeleton