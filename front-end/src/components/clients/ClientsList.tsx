import Button from "../Button"
import ClientCard from "./ClientCard"
import { Client } from "../../types/Client"

interface ClientsListProps {
  isLoading: boolean;
  clients: Client[];
  searchQuery: string;
  onClearSearch: () => void;
}

const ClientsList = ({ isLoading, clients, searchQuery, onClearSearch }: ClientsListProps) => {
  return (
    <>
      <h3 className="text-xl font-bold mb-4">All Clients</h3>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-20 bg-gray-800/50 animate-pulse rounded-md"></div>
          ))}
        </div>
      ) : clients.length > 0 ? (
        <div className="space-y-4">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No clients found matching your search</p>
          <Button onClick={onClearSearch}>Clear Search</Button>
        </div>
      )}
    </>
  )
}

export default ClientsList