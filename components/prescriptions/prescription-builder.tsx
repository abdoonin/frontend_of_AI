"use client"

import React, { useState, useEffect } from "react"
import {
  Plus,
  Trash2,
  Printer,
  Save,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Pill,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  fetchMedications,
  createPrescription,
  CLINICAL_PROTOCOLS,
  type Medication,
  type PrescriptionItemInput,
  type FullPrescription,
} from "@/lib/api/prescriptions"
import { listPatients, type PatientRecord } from "@/lib/api/patients"
import { useLanguage } from "@/lib/language-context"
import { toastSuccess, toastError } from "@/components/common/toast-notifications"
import { PrescriptionPrintModal } from "./prescription-print-modal"

interface PrescriptionBuilderProps {
  initialPatientId?: number
  initialPatientName?: string
  initialDiagnosis?: string
  onSuccess?: (prescriptionId: number) => void
}

export function PrescriptionBuilder({
  initialPatientId,
  initialPatientName,
  initialDiagnosis = "",
  onSuccess,
}: PrescriptionBuilderProps) {
  const { t } = useLanguage()
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    initialPatientId || null
  )
  const [medicationsList, setMedicationsList] = useState<Medication[]>([])
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis)
  const [notes, setNotes] = useState("")
  const [followUpDate, setFollowUpDate] = useState("After 2 weeks")
  const [items, setItems] = useState<PrescriptionItemInput[]>([
    {
      medication_name: "",
      generic_name: "",
      dose: "250mg",
      frequency: "BID (Twice daily)",
      timing: "After meals",
      duration: "1 month",
      instructions_ar: "Take with plenty of water after meals",
    },
  ])

  const [saving, setSaving] = useState(false)
  const [savedPrescription, setSavedPrescription] = useState<FullPrescription | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load patients and medications on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [patientsData, medsData] = await Promise.all([
          listPatients("active"),
          fetchMedications(),
        ])
        setPatients(patientsData)
        setMedicationsList(medsData)
      } catch (err) {
        console.error("Error loading prescription data:", err)
      }
    }
    loadData()
  }, [])

  // Auto-fill protocol items
  const applyProtocol = (protocolId: string) => {
    const protocol = CLINICAL_PROTOCOLS.find((p) => p.id === protocolId)
    if (!protocol) return

    setDiagnosis(protocol.diagnosis)
    setFollowUpDate(protocol.follow_up)
    setItems(
      protocol.items.map((it) => ({
        ...it,
      }))
    )
    setNotes(
      `Treatment protocol: ${protocol.name_en}\n* Strict avoidance of NSAIDs (Ibuprofen, Diclofenac).\n* Low-sodium, low-fat dietary compliance.`
    )
  }

  // Handle drug selection in a row
  const handleSelectMedication = (index: number, medTradeName: string) => {
    const med = medicationsList.find((m) => m.trade_name === medTradeName)
    const newItems = [...items]
    if (med) {
      newItems[index] = {
        ...newItems[index],
        medication_id: med.id,
        medication_name: med.trade_name,
        generic_name: med.generic_name,
        dose: med.default_dose || "1 tablet",
        frequency: med.default_freq || "QD (Once daily)",
        timing:
          med.timing === "before_meal"
            ? "30 min before meals"
            : med.timing === "after_meal"
            ? "After meals"
            : "With meals",
        instructions_ar: med.notes_ar || "",
      }
    } else {
      newItems[index].medication_name = medTradeName
    }
    setItems(newItems)
  }

  const updateItemField = (index: number, field: keyof PrescriptionItemInput, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const addItemRow = () => {
    setItems([
      ...items,
      {
        medication_name: "",
        generic_name: "",
        dose: "1 tablet",
        frequency: "BID (Twice daily)",
        timing: "After meals",
        duration: "1 month",
        instructions_ar: "",
      },
    ])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleResetForm = () => {
    setSavedPrescription(null)
    setDiagnosis(initialDiagnosis || "")
    setNotes("")
    setFollowUpDate("After 2 weeks")
    setItems([
      {
        medication_name: "",
        generic_name: "",
        dose: "250mg",
        frequency: "BID (Twice daily)",
        timing: "After meals",
        duration: "1 month",
        instructions_ar: "Take with plenty of water after meals",
      },
    ])
    setErrorMsg(null)
  }

  const currentPatient = patients.find((p) => p.id === selectedPatientId)

  // Save Prescription
  const handleSave = async (andPrint = false) => {
    if (!selectedPatientId) {
      setErrorMsg("Please select a patient first")
      toastError("Please select a patient first")
      return
    }

    const validItems = items.filter((it) => it.medication_name.trim().length > 0)
    if (validItems.length === 0) {
      setErrorMsg("Please add at least one medication to the prescription")
      toastError("Please add at least one medication")
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      const res = await createPrescription({
        patient_id: selectedPatientId,
        diagnosis,
        notes,
        follow_up_date: followUpDate,
        items: validItems,
      })

      const previewRx: FullPrescription = {
        id: res.prescription_id,
        prescription_number: res.prescription_number,
        patient_id: selectedPatientId,
        patient_name: currentPatient?.name || initialPatientName || "Patient",
        patient_code: currentPatient?.patientId || "",
        patient_birth_date: currentPatient?.birthDate || null,
        patient_phone: currentPatient?.phone || null,
        doctor_name: "Consultant Physician",
        diagnosis,
        notes,
        follow_up_date: followUpDate,
        status: "active",
        item_count: validItems.length,
        created_at: new Date().toISOString(),
        items: validItems.map((it, idx) => ({ ...it, id: idx + 1 })),
      }

      setSavedPrescription(previewRx)

      toastSuccess("Prescription saved successfully!", {
        description: `Prescription #${res.prescription_number} has been recorded in the medical chart.`,
      })

      if (onSuccess) {
        onSuccess(res.prescription_id)
      }

      if (andPrint) {
        setPrintModalOpen(true)
      }
    } catch (err: any) {
      const msg = err.message || "Failed to save prescription"
      setErrorMsg(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Prominent Success Notification Banner */}
      {savedPrescription && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Prescription Saved Successfully!</span>
                <Badge variant="outline" className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-400/50 font-mono">
                  #{savedPrescription.prescription_number}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved for {savedPrescription.patient_name}. The prescription is ready for review or printing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              onClick={() => setPrintModalOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Prescription (Rx)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetForm}
              className="gap-1.5 text-xs border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Rx
            </Button>
          </div>
        </div>
      )}

      {/* Protocol Quick-Picks Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Standard Clinical Protocols</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              1-Click Templates
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Select a verified clinical protocol to auto-fill proven medications, dosages, and safety precautions:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CLINICAL_PROTOCOLS.map((protocol) => (
              <Button
                key={protocol.id}
                variant="outline"
                size="sm"
                onClick={() => applyProtocol(protocol.id)}
                className="text-xs bg-background/80 hover:bg-primary hover:text-primary-foreground border-border/80 transition-all"
              >
                {protocol.name_en}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Prescription Form */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg font-bold">New Prescription (Rx)</CardTitle>
            </div>
            {savedPrescription && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Prescription #{savedPrescription.prescription_number} Saved
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Patient Selector and Diagnosis Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Patient *</Label>
              {initialPatientId ? (
                <div className="p-2.5 rounded-lg border bg-muted/30 text-sm font-medium">
                  {initialPatientName || `Patient #${initialPatientId}`}
                </div>
              ) : (
                <Select
                  value={selectedPatientId ? String(selectedPatientId) : ""}
                  onValueChange={(val) => setSelectedPatientId(Number(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose patient from database..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.patientId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Diagnosis / Clinical Indication</Label>
              <Input
                placeholder="e.g. Non-Alcoholic Fatty Liver Disease (Grade II)"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="font-mono text-xs"
                dir="ltr"
              />
            </div>
          </div>

          {/* Medications Item List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <span>Prescribed Medications</span>
                <span className="text-xs font-normal text-muted-foreground">({items.length} items)</span>
              </Label>
              <Button onClick={addItemRow} size="sm" variant="outline" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Medication
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const matchedMed = medicationsList.find(
                  (m) => m.trade_name.toLowerCase() === item.medication_name.toLowerCase()
                )

                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all space-y-3 shadow-xs"
                  >
                    {/* Row 1: Drug Name + Quick Select + Dose + Delete */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-4 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Trade Name / Formulary</Label>
                        <div className="flex gap-1.5">
                          <Select
                            value={matchedMed?.trade_name || ""}
                            onValueChange={(val) => handleSelectMedication(index, val)}
                          >
                            <SelectTrigger className="w-[140px] text-xs">
                              <SelectValue placeholder="Formulary" />
                            </SelectTrigger>
                            <SelectContent>
                              {medicationsList.map((m) => (
                                <SelectItem key={m.id} value={m.trade_name} className="text-xs">
                                  {m.trade_name} ({m.generic_name})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            placeholder="Type brand name"
                            value={item.medication_name}
                            onChange={(e) => updateItemField(index, "medication_name", e.target.value)}
                            className="flex-1 text-xs"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Generic Name</Label>
                        <Input
                          placeholder="Generic name"
                          value={item.generic_name || ""}
                          onChange={(e) => updateItemField(index, "generic_name", e.target.value)}
                          className="text-xs"
                          dir="ltr"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Dosage</Label>
                        <Input
                          placeholder="250mg"
                          value={item.dose}
                          onChange={(e) => updateItemField(index, "dose", e.target.value)}
                          className="text-xs font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Frequency</Label>
                        <Select
                          value={item.frequency}
                          onValueChange={(val) => updateItemField(index, "frequency", val)}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QD (Once daily)">Once daily (QD)</SelectItem>
                            <SelectItem value="BID (Twice daily)">Twice daily (BID)</SelectItem>
                            <SelectItem value="TDS (Three times daily)">3 times daily (TDS)</SelectItem>
                            <SelectItem value="QID (Four times daily)">4 times daily (QID)</SelectItem>
                            <SelectItem value="PRN (As needed)">As needed (PRN)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemRow(index)}
                          disabled={items.length <= 1}
                          className="text-muted-foreground hover:text-destructive h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: Timing + Duration + Instructions */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-dashed border-border/50 text-xs">
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Meal Timing</Label>
                        <Select
                          value={item.timing || "After meals"}
                          onValueChange={(val) => updateItemField(index, "timing", val)}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30 min before meals">30 min before meals</SelectItem>
                            <SelectItem value="After meals">After meals</SelectItem>
                            <SelectItem value="With meals">With meals</SelectItem>
                            <SelectItem value="Bedtime">Bedtime</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Duration</Label>
                        <Input
                          placeholder="1 month / 14 days"
                          value={item.duration || ""}
                          onChange={(e) => updateItemField(index, "duration", e.target.value)}
                          className="text-xs"
                          dir="ltr"
                        />
                      </div>

                      <div className="md:col-span-7 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Special Instructions</Label>
                        <Input
                          placeholder="e.g. Take with a large glass of water after food"
                          value={item.instructions_ar || ""}
                          onChange={(e) => updateItemField(index, "instructions_ar", e.target.value)}
                          className="text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Liver Safety Alert Badge if applicable */}
                    {matchedMed?.liver_warning && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span><strong>Clinical Liver Warning: </strong>{matchedMed.liver_warning}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Follow-up & Doctor Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Next Follow-Up Visit Date:</Label>
                <div className="flex gap-1">
                  {["After 2 weeks", "After 1 month", "After 2 months"].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setFollowUpDate(time)}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                placeholder="e.g. After 2 weeks with repeat LFT & Ultrasound"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Dietary & Lifestyle Advice</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dietary instructions, salt restrictions, physical exercise..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              * Prescriptions are saved directly to the patient's medical record.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1 sm:flex-none gap-2 text-xs"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Only"}
              </Button>

              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex-1 sm:flex-none gap-2 text-xs gradient-primary"
              >
                <Printer className="h-4 w-4" />
                {saving ? "Saving..." : "Save & Preview Print (Rx)"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescription Print Modal */}
      <PrescriptionPrintModal
        prescription={savedPrescription}
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
      />
    </div>
  )
}
