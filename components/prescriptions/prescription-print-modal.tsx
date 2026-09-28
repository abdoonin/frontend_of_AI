"use client"

import React, { useRef } from "react"
import { Printer } from "lucide-react"
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

interface PrescriptionPrintModalProps {
  prescription: FullPrescription | null
  open: boolean
  onClose: () => void
  doctorHeader?: {
    name?: string
    nameAr?: string
    specialty?: string
    specialtyAr?: string
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
    clinicName: "Diqqa Center for Hepatic & Internal Medicine",
    address: "Medical City Complex, Baghdad / Mosul, Iraq",
    phone: "+964 770 123 4567",
  },
}: PrescriptionPrintModalProps) {
  const { t, isRtl } = useLanguage()
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!prescription) return null

  const handlePrint = () => {
    window.print()
  }

  const getAge = (birthDateStr?: string | null) => {
    if (!birthDateStr) return "N/A"
    const birthYear = parseInt(birthDateStr.split("-")[0], 10)
    if (isNaN(birthYear)) return "N/A"
    const currentYear = new Date().getFullYear()
    return `${currentYear - birthYear} ${isRtl ? "سنة" : "yrs"}`
  }

  const formattedDate = prescription.created_at
    ? new Date(prescription.created_at).toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString(isRtl ? "ar-EG" : "en-US")

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-border bg-card">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between no-print">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Printer className="h-5 w-5 text-primary" />
            {t("Official Prescription Slip (Rx)")}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="gap-2 gradient-primary">
              <Printer className="h-4 w-4" />
              {t("Print Prescription (A5/A4)")}
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Rx Sheet */}
        <div className="p-6 md:p-8 flex justify-center bg-muted/20">
          <div
            ref={printAreaRef}
            id="printable-rx"
            className="w-full max-w-[650px] bg-white text-slate-900 rounded-lg shadow-sm border border-slate-200 p-8 font-sans selection:bg-slate-100 print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Header / Clinic Letterhead */}
            <header className="border-b-2 border-slate-800 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="text-left">
                  <h1 className="text-xl font-bold text-slate-950 mb-0.5">
                    {doctorHeader.name || prescription.doctor_name || "Clinic Physician"}
                  </h1>
                  <p className="text-xs font-semibold text-emerald-800 mb-1">
                    {doctorHeader.specialty}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {doctorHeader.clinicName} • {doctorHeader.address}
                  </p>
                  <p className="text-[11px] font-mono text-slate-600">
                    Tel: {doctorHeader.phone}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-slate-50 min-w-[90px]">
                  <span className="font-serif text-3xl font-extrabold text-slate-800 italic">℞</span>
                  <span className="text-[10px] tracking-wider font-semibold uppercase text-slate-500">HEPATIQ</span>
                </div>
              </div>
            </header>

            {/* Patient Info Row */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 block text-[11px]">{t("Patient Name:")}</span>
                <span className="font-bold text-slate-900">{prescription.patient_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">{t("Age:")}</span>
                <span className="font-semibold text-slate-900">{getAge(prescription.patient_birth_date)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">{t("Date:")}</span>
                <span className="font-medium text-slate-900">{formattedDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">{t("Prescription #:")}</span>
                <span className="font-mono font-bold text-primary">{prescription.prescription_number}</span>
              </div>
            </div>

            {/* Diagnosis (if provided) */}
            {prescription.diagnosis && (
              <div className="mb-4 px-3 py-1.5 rounded bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
                <span className="font-semibold text-emerald-950">{t("Diagnosis:")}</span>
                <span className="font-medium text-emerald-900 font-mono">{prescription.diagnosis}</span>
              </div>
            )}

            {/* Rx Symbol Divider */}
            <div className="flex items-center gap-2 mb-3 text-slate-400">
              <span className="font-serif text-2xl font-bold text-slate-700 italic">℞</span>
              <div className="h-[1px] flex-1 bg-slate-300"></div>
            </div>

            {/* Medications List */}
            <div className="space-y-4 min-h-[260px]">
              {prescription.items && prescription.items.length > 0 ? (
                prescription.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-500">{index + 1}.</span>
                        <span className="text-base font-bold text-slate-950" dir="ltr">{item.medication_name}</span>
                        {item.generic_name && (
                          <span className="text-xs text-slate-500 italic" dir="ltr">({item.generic_name})</span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200" dir="ltr">
                        {item.dose}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 font-medium">
                      <span>
                        <strong className="text-slate-500">{t("Frequency:")} </strong>
                        <span dir="ltr">{item.frequency}</span>
                      </span>
                      {item.timing && (
                        <span>
                          <strong className="text-slate-500">{t("Timing:")} </strong>
                          <span>{item.timing}</span>
                        </span>
                      )}
                      {item.duration && (
                        <span>
                          <strong className="text-slate-500">{t("Duration:")} </strong>
                          <span>{item.duration}</span>
                        </span>
                      )}
                    </div>

                    {item.instructions_ar && (
                      <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-1.5 rounded border-l-2 border-emerald-600">
                        <span className="font-semibold text-emerald-900">{t("Directions:")} </span>
                        {item.instructions_ar}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-8">{t("No medications added.")}</p>
              )}
            </div>

            {/* General Advice & Clinical Notes */}
            {prescription.notes && (
              <div className="mt-4 p-2.5 rounded bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold block mb-0.5">{t("Clinical Instructions & Notes:")}</span>
                <p className="whitespace-pre-line">{prescription.notes}</p>
              </div>
            )}

            {/* Follow-up Note & Doctor Stamp Area */}
            <footer className="mt-8 pt-4 border-t-2 border-slate-800 flex items-end justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">{t("Follow-up Review:")}</span>
                <span className="font-bold text-emerald-900 text-sm">
                  {prescription.follow_up_date || t("As clinically required")}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  {t("Please present this prescription and lab results on your next visit.")}
                </p>
              </div>

              <div className="text-center min-w-[140px]">
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <span className="text-[11px] font-semibold text-slate-700 block mt-1">{t("Physician Signature & Stamp")}</span>
              </div>
            </footer>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/40 no-print flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            {t("Close")}
          </Button>
          <Button onClick={handlePrint} className="gap-2 gradient-primary">
            <Printer className="h-4 w-4" />
            {t("Print Prescription")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
