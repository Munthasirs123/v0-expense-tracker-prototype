"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  selectedFiles: File[]
  onRemoveFile: (index: number) => void
}

export function FileUpload({ onFilesSelected, selectedFiles, onRemoveFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === "application/pdf" || file.type === "text/csv" || file.name.endsWith(".csv"),
      )

      if (files.length > 0) {
        onFilesSelected([...selectedFiles, ...files])
      }
    },
    [onFilesSelected, selectedFiles],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected([...selectedFiles, ...files])
    }
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-accent" : "border-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Upload Bank Statements</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop your PDF or CSV files here, or click to browse
            </p>
          </div>
          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.csv"
              multiple
              onChange={handleFileInput}
            />
            <label htmlFor="file-upload">
              <Button asChild>
                <span>Choose Files</span>
              </Button>
            </label>
          </div>
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onRemoveFile(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
