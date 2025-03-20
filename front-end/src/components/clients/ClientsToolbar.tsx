import { Search } from "lucide-react"

interface ClientsToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
}

const ClientsToolbar = ({ searchQuery, onSearchChange }: ClientsToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-gray-800 text-white rounded-md py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

    </div>
  )
}

export default ClientsToolbar