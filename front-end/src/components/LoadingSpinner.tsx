const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-radial from-purple-600/20 to-transparent animate-pulse"></div>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    </div>
  )
}

export default LoadingSpinner

