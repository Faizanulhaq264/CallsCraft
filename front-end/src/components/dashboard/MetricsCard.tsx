import Card from "../Card"

interface MetricsCardProps {
  title: string;
  value: string | number;
  isLoading: boolean;
}

const MetricsCard = ({ title, value, isLoading }: MetricsCardProps) => {
  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border border-purple-900/30 rounded-xl p-6 shadow-lg hover:shadow-purple-900/10 transition-all duration-300">
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-800 animate-pulse rounded"></div>
      ) : (
        <p className="text-3xl font-bold text-white">{value}</p>
      )}
    </Card>
  )
}

export default MetricsCard