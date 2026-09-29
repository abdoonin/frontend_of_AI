"use client"

import React, { useRef, useState } from "react"
import { Printer, Download, Loader2, CheckCircle2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/language-context"
import type { FullPrescription } from "@/lib/api/prescriptions"
import { printElement, downloadElementAsPdf } from "@/lib/print-service"
import { toastSuccess, toastError } from "@/components/common/toast-notifications"

interface PrescriptionPrintModalProps {
  prescription: FullPrescription | null
  open: boolean
  onClose: () => void
  doctorHeader?: {
    name?: string
    specialty?: string
    clinicName?: string
    address?: string
    phone?: string
  }
}

export function PrescriptionPrintModal({
  prescription,
  open,
  onClose,
  doctorHeader = {
    name: "Dr. Ali A. Al-Hakeem, MD",
    specialty: "Consultant of Gastroenterology & Hepatology",
    clinicName: "HEPATIQ Advanced Liver & Digestive Center",
    address: "Medical City Complex, Baghdad / Mosul, Iraq",
    phone: "+964 770 123 4567",
  },
}: PrescriptionPrintModalProps) {
  const { t } = useLanguage()
  const printAreaRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  if (!prescription) return null

  const handlePrint = async () => {
    try {
      setPrinting(true)
      await printElement("printable-rx", {
        title: `Rx - ${prescription.prescription_number} - ${prescription.patient_name}`,
        paperSize: "a5",
      })
    } catch (err) {
      console.error("Print error:", err)
      window.print()
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      const fileName = `Prescription_${prescription.prescription_number}_${prescription.patient_name.replace(/\s+/g, "_")}.pdf`
      await downloadElementAsPdf("printable-rx", fileName, { paperSize: "a5" })
      toastSuccess("A5 PDF generated successfully!", {
        description: `Saved as ${fileName}`,
      })
    } catch (err: any) {
      console.error("PDF generation failed:", err)
      toastError("Failed to generate PDF. You can use 'Print (Save as PDF)' instead.")
    } finally {
      setDownloadingPdf(false)
    }
  }

  const getAge = (birthDateStr?: string | null) => {
    if (!birthDateStr) return "Adult"
    const birthYear = parseInt(birthDateStr.split("-")[0], 10)
    if (isNaN(birthYear)) return "Adult"
    const currentYear = new Date().getFullYear()
    return `${currentYear - birthYear} yrs`
  }

  const formattedDate = prescription.created_at
    ? new Date(prescription.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 border-border bg-card">
        {/* Modal Header */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between no-print gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Printer className="h-4 w-4 text-emerald-600" />
                Prescription Slip (Rx)
              </DialogTitle>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                A5 Paper Format
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Calibrated strictly for standard A5 clinic prescription printers (148 × 210 mm).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || printing}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-semibold border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloadingPdf ? "Generating..." : "Download PDF (A5)"}
            </Button>

            <Button
              onClick={handlePrint}
              disabled={printing || downloadingPdf}
              size="sm"
              className="gap-1.5 text-xs gradient-primary font-semibold shadow-xs"
            >
              {printing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              {printing ? "Preparing..." : "Print (A5)"}
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Rx Sheet Container (A5 Optimized Width: max-w-[500px]) */}
        <div className="p-4 md:p-6 flex justify-center bg-muted/30">
          <div
            ref={printAreaRef}
            id="printable-rx"
            className="w-full max-w-[500px] bg-white text-slate-900 rounded-lg shadow-sm border border-slate-200 p-5 sm:p-6 font-sans selection:bg-slate-100"
          >
            {/* Header / Clinic Letterhead */}
            <header className="border-b-2 border-slate-900 pb-3 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="text-left">
                  <h1 className="text-lg font-bold text-slate-950 tracking-tight leading-tight">
                    {prescription.doctor_name || doctorHeader.name || "Dr. Ali A. Al-Hakeem, MD"}
                  </h1>
                  <p className="text-xs font-semibold text-emerald-800 leading-normal">
                    {doctorHeader.specialty || "Consultant of Gastroenterology & Hepatology"}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {doctorHeader.clinicName} • {doctorHeader.address}
                  </p>
                  <p className="text-[11px] font-mono text-slate-600">
                    Tel: {doctorHeader.phone}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-slate-50 min-w-[85px] text-center">
                  <span className="font-serif text-3xl font-black text-slate-900 leading-none italic">℞</span>
                  <span className="text-[9px] tracking-wider font-extrabold uppercase text-slate-600 mt-1">HEPATIQ</span>
                </div>
              </div>
            </header>

            {/* Patient & Prescription Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Patient Name:</span>
                <span className="font-bold text-slate-950 text-xs truncate block">{prescription.patient_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Age:</span>
                <span className="font-semibold text-slate-900 text-xs">{getAge(prescription.patient_birth_date)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Date:</span>
                <span className="font-medium text-slate-900 text-xs">{formattedDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Rx Number:</span>
                <span className="font-mono font-bold text-primary text-xs">{prescription.prescription_number}</span>
              </div>
            </div>

            {/* Diagnosis (if provided) */}
            {prescription.diagnosis && (
              <div className="mb-3 px-3 py-1.5 rounded bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-[11px]">Clinical Diagnosis:</span>
                <span className="font-semibold text-emerald-900 font-mono text-xs">{prescription.diagnosis}</span>
              </div>
            )}

            {/* Rx Symbol Divider */}
            <div className="flex items-center gap-2 mb-2 text-slate-400">
              <span className="font-serif text-xl font-bold text-slate-800 italic">℞</span>
              <div className="h-[1px] flex-1 bg-slate-300"></div>
            </div>

            {/* Medications List (Compact, Single-Page Fitting) */}
            <div className="space-y-2 mb-3">
              {prescription.items && prescription.items.length > 0 ? (
                prescription.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">{index + 1}.</span>
                        <span className="text-sm font-bold text-slate-950">{item.medication_name}</span>
                        {item.generic_name && (
                          <span className="text-xs text-slate-500 italic">({item.generic_name})</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0 font-mono">
                        {item.dose}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-medium">
                      <span>
                        <strong className="text-slate-500">Frequency: </strong>
                        <span>{item.frequency}</span>
                      </span>
                      {item.timing && (
                        <span>
                          <strong className="text-slate-500">Timing: </strong>
                          <span>{item.timing}</span>
                        </span>
                      )}
                      {item.duration && (
                        <span>
                          <strong className="text-slate-500">Duration: </strong>
                          <span>{item.duration}</span>
                        </span>
                      )}
                    </div>

                    {item.instructions_ar && (
                      <p className="mt-1 text-[11px] text-slate-700 bg-slate-50/80 p-1 rounded border-l-2 border-emerald-600">
                        <span className="font-semibold text-emerald-900">Directions: </span>
                        {item.instructions_ar}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">No medications added.</p>
              )}
            </div>

            {/* General Advice & Clinical Notes */}
            {prescription.notes && (
              <div className="mb-3 p-2 rounded bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
                <span className="font-bold text-[11px] block mb-0.5">Clinical Instructions & Dietary Advice:</span>
                <p className="text-[11px] whitespace-pre-line leading-relaxed">{prescription.notes}</p>
              </div>
            )}

            {/* Follow-up Note & Doctor Stamp Area (Fixed Bottom of 1-Page Slip) */}
            <footer className="pt-3 border-t-2 border-slate-900 flex items-end justify-between text-xs mt-4">
              <div className="max-w-[340px]">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Follow-up Review:</span>
                <span className="font-bold text-emerald-950 text-xs">
                  {prescription.follow_up_date || "As clinically required"}
                </span>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                  Please bring this prescription and recent laboratory test results on your next clinic visit.
                </p>
              </div>

              <div className="text-center min-w-[130px]">
                <div className="h-8 border-b border-dashed border-slate-400 flex items-end justify-center">
                  <span className="text-[9px] text-slate-400 italic">Signature / Stamp</span>
                </div>
                <span className="text-[10px] font-bold text-slate-800 block mt-1">
                  Physician Signature
                </span>
              </div>
            </footer>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t bg-muted/40 no-print flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || printing}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-semibold border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloadingPdf ? "Generating..." : "Download PDF (A5)"}
            </Button>

            <Button
              onClick={handlePrint}
              disabled={printing || downloadingPdf}
              size="sm"
              className="gap-1.5 text-xs gradient-primary font-semibold"
            >
              {printing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              {printing ? "Preparing..." : "Print Prescription (A5)"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
