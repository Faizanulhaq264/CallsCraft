import { useState } from "react"
import { ChevronDown, ChevronUp, Download, FileText, Check } from "lucide-react"
import Card from "../Card"
import Button from "../Button"

interface CallNotesCardProps {
  clientName: string;
  notes: string;
  callID?: number; // Optional call ID for real downloads
  onDownloadTranscript?: () => Promise<void>; // Optional real download handler
  onDownloadSummary?: () => Promise<void>; // Optional real download handler
}

const CallNotesCard = ({ 
  clientName, 
  notes, 
  callID,
  onDownloadTranscript,
  onDownloadSummary 
}: CallNotesCardProps) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)
  const [isDownloadingTranscript, setIsDownloadingTranscript] = useState(false)
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false)
  const [downloadedTranscript, setDownloadedTranscript] = useState(false)
  const [downloadedSummary, setDownloadedSummary] = useState(false)

  const handleDownloadTranscript = async () => {
    setIsDownloadingTranscript(true)

    try {
      // Use real handler if provided, otherwise use mock
      if (onDownloadTranscript) {
        await onDownloadTranscript();
      } else {
        // Simulate download delay (mock implementation)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const element = document.createElement("a")
        const file = new Blob([`Mock transcript for call with ${clientName}`], { type: "text/plain" })
        element.href = URL.createObjectURL(file)
        element.download = `call-transcript-${clientName.replace(/\s+/g, "-").toLowerCase()}.txt`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
      }
      
      setDownloadedTranscript(true)
    } catch (error) {
      console.error("Error downloading transcript:", error)
    } finally {
      setIsDownloadingTranscript(false)
    }
  }

  const handleDownloadSummary = async () => {
    setIsDownloadingSummary(true)

    try {
      // Use real handler if provided, otherwise use mock
      if (onDownloadSummary) {
        await onDownloadSummary();
      } else {
        // Simulate download delay (mock implementation)
        await new Promise(resolve => setTimeout(resolve, 3000));
        const element = document.createElement("a")
        const file = new Blob([`Mock AI summary for call with ${clientName}`], { type: "text/plain" })
        element.href = URL.createObjectURL(file)
        element.download = `call-summary-${clientName.replace(/\s+/g, "-").toLowerCase()}.txt`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
      }
      
      setDownloadedSummary(true)
    } catch (error) {
      console.error("Error downloading summary:", error)
    } finally {
      setIsDownloadingSummary(false)
    }
  }

  return (
    <Card className="lg:col-span-2 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Last Call Notes</h3>
        <button
          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isNotesExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${isNotesExpanded ? "max-h-96" : "max-h-24"}`}
      >
        <p className="text-gray-300 whitespace-pre-line">{notes}</p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleDownloadTranscript}
          disabled={isDownloadingTranscript || downloadedTranscript || !notes || notes === "No notes available"}
          className="flex items-center justify-center gap-2 flex-1"
        >
          {isDownloadingTranscript ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              Downloading...
            </>
          ) : downloadedTranscript ? (
            <>
              <Check className="h-5 w-5" />
              Transcript Downloaded
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Download Transcript
            </>
          )}
        </Button>

        <Button
          onClick={handleDownloadSummary}
          disabled={isDownloadingSummary || downloadedSummary || !notes || notes === "No notes available"}
          variant="secondary"
          className="flex items-center justify-center gap-2 flex-1"
        >
          {isDownloadingSummary ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              Generating...
            </>
          ) : downloadedSummary ? (
            <>
              <Check className="h-5 w-5" />
              Summary Downloaded
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              Download AI Summary
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}

export default CallNotesCard