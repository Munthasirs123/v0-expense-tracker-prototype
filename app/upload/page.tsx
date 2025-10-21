// app/upload/page.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Loader2, AlertCircle } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import ProtectedPage from "@/components/protected-page"
import { useSupabase } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"

type Step = "SELECT_FILES" | "SHOWING_PREVIEW"

type PreviewData = {
  uploadId: string
  fileName: string
  preview: string
}

export default function UploadPage() {
  const router = useRouter()
  const { user } = useSupabase()

  const [step, setStep] = useState<Step>("SELECT_FILES")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
    setError(null)
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleExtractText = async () => {
    if (selectedFiles.length === 0) return
    setIsProcessing(true)
    setError(null)

    try {
      const form = new FormData()
      selectedFiles.forEach((f) => form.append("files", f))

      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to extract text from files")
      }

      const data = await res.json()

      if (!data.ok) {
        throw new Error(data.error || "Text extraction failed")
      }

      setPreviewData(data.data)
      setStep("SHOWING_PREVIEW")
    } catch (e: any) {
      setError(e.message || "An error occurred during text extraction")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProceed = async () => {
    if (previewData.length === 0) return
    setIsProcessing(true)
    setError(null)

    try {
      const uploadIds = previewData.map((p) => p.uploadId)
      const res = await fetch("/api/process-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadIds }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to process transactions")
      }

      const json = await res.json()

      if (!json.ok) {
        throw new Error(json.error || "Transaction processing failed")
      }

      // Backend returns the redirect URL after processing
      router.push(json.redirectUrl ?? "/upload")
    } catch (e: any) {
      setError(e.message || "An error occurred while processing transactions")
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setSelectedFiles([])
    setPreviewData([])
    setError(null)
    setStep("SELECT_FILES")
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-lg font-semibold">Statement Intelligence</span>
            </div>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const supabase = createClient()
                  const { error } = await supabase.auth.signOut()
                  if (!error) router.push("/login")
                }}
              >
                Sign Out
              </Button>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {step === "SELECT_FILES" ? (
              <>
                <div>
                  <h1 className="text-3xl font-bold">Upload Statements</h1>
                  <p className="text-muted-foreground">
                    Select one or more PDF bank statements to begin
                  </p>
                </div>

                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  selectedFiles={selectedFiles}
                  onRemoveFile={handleRemoveFile}
                />

                {selectedFiles.length > 0 && (
                  <div className="flex justify-end">
                    <Button size="lg" onClick={handleExtractText} disabled={isProcessing} className="gap-2">
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        "Extract Text"
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-3xl font-bold">Confirm Extracted Text</h1>
                  <p className="text-muted-foreground">
                    Review the raw text extracted from your documents before processing
                  </p>
                </div>

                <Card>
                  <CardContent className="p-4 h-96 overflow-auto bg-muted/50 rounded-lg">
                    {previewData.map(({ uploadId, fileName, preview }) => (
                      <div key={uploadId} className="mb-6 last:mb-0">
                        <h3 className="font-semibold text-sm mb-2 border-b pb-1">{fileName}</h3>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                          {preview}
                        </pre>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={reset} disabled={isProcessing}>
                    Start Over
                  </Button>
                  <Button size="lg" onClick={handleProceed} disabled={isProcessing} className="gap-2">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Proceed & Categorize"
                    )}
                  </Button>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedPage>
  )
}