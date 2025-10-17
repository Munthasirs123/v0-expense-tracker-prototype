"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { TransactionPreview } from "@/components/transaction-preview"
import { parseStatementFile, analyzeTransactions } from "@/lib/mock-analyzer"
import { saveTransactions, getTransactions, saveMonths, getMonths, getLearningRules } from "@/lib/storage"
import type { Transaction, Category, Month } from "@/lib/types"

export default function UploadPage() {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return

    setIsAnalyzing(true)

    try {
      // Parse all files
      const allRawTransactions = []
      for (const file of selectedFiles) {
        const rawTransactions = await parseStatementFile(file)
        allRawTransactions.push(...rawTransactions)
      }

      // Determine month from transactions
      const dates = allRawTransactions.map((t) => new Date(t.date))
      const latestDate = new Date(Math.max(...dates.map((d) => d.getTime())))
      const monthId = `${latestDate.toLocaleString("en-US", { month: "long" }).toLowerCase()}-${latestDate.getFullYear()}`

      // Get learning rules and analyze
      const learningRules = getLearningRules()
      const analyzedTransactions = analyzeTransactions(allRawTransactions, monthId, learningRules)

      setTransactions(analyzedTransactions)
      setShowPreview(true)
    } catch (error) {
      console.error("Error analyzing files:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleUpdateCategory = (transactionId: string, category: Category) => {
    setTransactions((prev) => prev.map((t) => (t.id === transactionId ? { ...t, category } : t)))
  }

  const handleConfirm = () => {
    // Save transactions
    const existingTransactions = getTransactions()
    const allTransactions = [...existingTransactions, ...transactions]
    saveTransactions(allTransactions)

    // Update or create month
    const monthId = transactions[0].monthId
    const existingMonths = getMonths()
    const monthTransactions = allTransactions.filter((t) => t.monthId === monthId)

    const totalSpend = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
    const [monthName, yearStr] = monthId.split("-")
    const year = Number.parseInt(yearStr)

    const monthData: Month = {
      id: monthId,
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      year,
      totalSpend,
      transactionCount: monthTransactions.length,
    }

    const existingMonthIndex = existingMonths.findIndex((m) => m.id === monthId)
    if (existingMonthIndex >= 0) {
      existingMonths[existingMonthIndex] = monthData
    } else {
      existingMonths.push(monthData)
    }

    saveMonths(existingMonths)

    // Navigate to month view
    router.push(`/month/${monthId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="text-lg font-semibold">Statement Intelligence</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Upload Statements</h1>
              <p className="text-muted-foreground">Upload one or more bank statements to analyze your spending</p>
            </div>
          </div>

          {!showPreview ? (
            <>
              <FileUpload
                onFilesSelected={handleFilesSelected}
                selectedFiles={selectedFiles}
                onRemoveFile={handleRemoveFile}
              />

              {selectedFiles.length > 0 && (
                <div className="flex justify-end">
                  <Button size="lg" onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Statements"
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <TransactionPreview
              transactions={transactions}
              onUpdateCategory={handleUpdateCategory}
              onConfirm={handleConfirm}
            />
          )}
        </div>
      </main>
    </div>
  )
}
