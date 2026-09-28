"use client"

import React, { useState, useRef } from "react"
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Loader2,
  X,
  ScanLine,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { parseLabTextLocally } from "@/lib/ocr/lab-parser"
import { FIELD_BY_KEY } from "@/lib/assessment/fields"
import { useLanguage } from "@/lib/language-context"

interface OcrScannerDialogProps {
  open: boolean
  onClose: () => void
  onApplyValues: (extractedValues: Record<string, string>) => void
}

export function OcrScannerDialog({
  open,
  onClose,
  onApplyValues,
}: OcrScannerDialogProps) {
  const { t, isRtl } = useLanguage()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progressStatus, setProgressStatus] = useState<string>("")
  const [extractedFields, setExtractedFields] = useState<Record<string, string>>({})
  const [rawText, setRawText] = useState<string>("")
  const [showRawText, setShowRawText] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setImageFile(null)
    setImagePreview(null)
    setProcessing(false)
    setProgressStatus("")
    setExtractedFields({})
    setRawText("")
    setShowRawText(false)
    setErrorMsg(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    setImageFile(file)
    setErrorMsg(null)
    setExtractedFields({})

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    await runOcr(file)
  }

  const runOcr = async (file: File) => {
    setProcessing(true)
    setProgressStatus("Initializing local OCR engine...")

    try {
      // Dynamic import of tesseract.js for optimal code splitting
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker("eng")

      setProgressStatus("Analyzing document and extracting text...")
      const ret = await worker.recognize(file)
      const text = ret.data.text
      setRawText(text)
      await worker.terminate()

      setProgressStatus("Parsing clinical laboratory values...")

      // Attempt parsing via our API (which pairs Groq AI with regex fallback)
      let parsedFields: Record<string, string> = {}
      try {
        const response = await fetch("/api/ocr/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: text }),
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.fields) {
            parsedFields = data.fields
          }
        }
      } catch (apiErr) {
        console.warn("API parsing unavailable, falling back to local parser", apiErr)
      }

      // If API returned nothing or had an error, parse locally
      if (Object.keys(parsedFields).length === 0) {
        const local = parseLabTextLocally(text)
        parsedFields = local.fields
      }

      setExtractedFields(parsedFields)

      if (Object.keys(parsedFields).length === 0) {
        setErrorMsg("No matching laboratory values could be automatically detected. You can review the raw text below.")
      }
    } catch (err: any) {
      console.error("OCR process failed:", err)
      setErrorMsg(err.message || "Failed to process image. Please try a clearer picture.")
    } finally {
      setProcessing(false)
      setProgressStatus("")
    }
  }

  const handleFieldValueChange = (key: string, value: string) => {
    setExtractedFields((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleApply = () => {
    onApplyValues(extractedFields)
    handleClose()
  }

  const detectedCount = Object.keys(extractedFields).length

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {t("AI Laboratory Report Scanner")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("Upload or capture an image of a blood test / LFT report to automatically populate clinical fields")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload Area */}
          {!imagePreview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-8 text-center cursor-pointer transition-colors space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("Click to upload or drag and drop")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Supports JPEG, PNG, WebP lab report scans and smartphone photos")}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Badge variant="outline" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {t("100% Free Local OCR Engine")}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview & Change Action */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Lab Report Preview"
                    className="h-12 w-12 object-cover rounded border"
                  />
                  <div>
                    <p className="text-xs font-semibold truncate max-w-xs">{imageFile?.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(imageFile?.size ? imageFile.size / 1024 : 0).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="text-xs gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("Change Image")}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Progress State */}
              {processing && (
                <div className="p-6 text-center space-y-3 border rounded-xl bg-muted/20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium">{progressStatus}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("This runs securely inside your browser using Tesseract OCR.")}
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && !processing && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Extracted Values Review */}
              {!processing && detectedCount > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-foreground">
                        {t("Detected Values")} ({detectedCount} {t("parameters")})
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t("Review and adjust before applying")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
                    {Object.entries(extractedFields).map(([key, val]) => {
                      const def = FIELD_BY_KEY[key]
                      const label = def?.label || key.toUpperCase()
                      const unit = def?.unit || ""

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs gap-2"
                        >
                          <div className="truncate flex-1">
                            <span className="font-semibold block truncate" dir="ltr">{label}</span>
                            {unit && <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{unit}</span>}
                          </div>
                          <Input
                            value={val}
                            onChange={(e) => handleFieldValueChange(key, e.target.value)}
                            className="w-24 h-7 text-xs font-mono text-right"
                            dir="ltr"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Raw Text Toggle */}
              {rawText && !processing && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    {showRawText ? t("Hide raw recognized text") : t("View raw recognized text")}
                  </button>

                  {showRawText && (
                    <pre className="mt-2 p-3 rounded-lg bg-muted text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border" dir="ltr">
                      {rawText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {t("Cancel")}
          </Button>

          <Button
            size="sm"
            onClick={handleApply}
            disabled={processing || detectedCount === 0}
            className="gap-2 gradient-primary"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t("Apply")} {detectedCount > 0 ? `(${detectedCount})` : ""} {t("Values")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
