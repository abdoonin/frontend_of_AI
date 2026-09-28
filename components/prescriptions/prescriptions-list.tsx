"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Printer,
  Plus,
  Search,
  FileText,
  Calendar,
  User,
  Trash2,
  Eye,
  Pill,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  fetchPrescriptions,
  fetchPrescriptionById,
  deletePrescription,
  type PrescriptionSummary,
  type FullPrescription,
} from "@/lib/api/prescriptions"
import { PrescriptionPrintModal } from "./prescription-print-modal"
import { PrescriptionBuilder } from "./prescription-builder"
import { useLanguage } from "@/lib/language-context"

interface PrescriptionsListProps {
  patientId?: number
  patientName?: string
}

export function PrescriptionsList({ patientId, patientName }: PrescriptionsListProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showBuilder, setShowBuilder] = useState(false)
  const [activePrescription, setActivePrescription] = useState<FullPrescription | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState(false)

  const loadPrescriptions = async () => {
    try {
      setLoading(true)
      const data = await fetchPrescriptions(patientId)
      setPrescriptions(data)
    } catch (err) {
      console.error("Failed to load prescriptions:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrescriptions()
  }, [patientId])

  const handleViewPrint = async (rxId: number) => {
    try {
      const fullRx = await fetchPrescriptionById(rxId)
      setActivePrescription(fullRx)
      setPrintModalOpen(true)
    } catch (err) {
      console.error("Failed to fetch full prescription:", err)
    }
  }

  const handleDelete = async (rxId: number) => {
    if (!window.confirm("Are you sure you want to delete this prescription?")) return
    try {
      await deletePrescription(rxId)
      setPrescriptions(prescriptions.filter((p) => p.id !== rxId))
    } catch (err) {
      alert("Failed to delete prescription")
    }
  }

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      const matchesSearch =
        rx.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rx.prescription_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rx.diagnosis && rx.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesSearch
    })
  }, [prescriptions, searchTerm])

  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {patientName ? `${t('Clinical Prescriptions (Rx)')}: ${patientName}` : t('Clinical Prescriptions (Rx)')}
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage, prescribe, and print official clinical prescriptions and therapy protocols
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowBuilder(!showBuilder)}
          className="gap-2 gradient-primary"
        >
          {showBuilder ? (
            <>
              <FileText className="h-4 w-4" />
              {t('View Prescriptions List', 'View Prescriptions List')}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t('New Prescription')}
            </>
          )}
        </Button>
      </div>

      {/* Prescription Builder Form (when active) */}
      {showBuilder && (
        <PrescriptionBuilder
          initialPatientId={patientId}
          initialPatientName={patientName}
          onSuccess={() => {
            loadPrescriptions()
          }}
        />
      )}

      {/* Prescriptions List Table & Search */}
      {!showBuilder && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Issued Prescriptions ({filtered.length})</CardTitle>
                <CardDescription className="text-xs">
                  Complete archive of patient prescriptions with instant print and review
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name, diagnosis or Rx #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading prescriptions...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <Pill className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold">No prescriptions issued yet</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click &quot;New Prescription&quot; to issue your first clinical prescription using predefined clinical protocols
                </p>
                <Button size="sm" onClick={() => setShowBuilder(true)} className="gap-1.5 text-xs">
                  <Plus className="h-4 w-4" />
                  Write Prescription Now
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                          {rx.prescription_number}
                        </Badge>
                        <span className="font-bold text-sm text-foreground">{rx.patient_name}</span>
                        {rx.patient_code && (
                          <span className="text-xs text-muted-foreground font-mono">({rx.patient_code})</span>
                        )}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}
                        </span>
                      </div>

                      {rx.diagnosis && (
                        <p className="text-xs text-muted-foreground font-mono">
                          <strong className="text-foreground">Diagnosis:</strong> {rx.diagnosis}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>
                          <strong className="text-foreground">Items: </strong>
                          {rx.item_count} medications
                        </span>
                        {rx.follow_up_date && (
                          <span>
                            <strong className="text-foreground">Follow-up: </strong>
                            {rx.follow_up_date}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewPrint(rx.id)}
                        className="gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View & Print
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(rx.id)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prescription Print Modal */}
      <PrescriptionPrintModal
        prescription={activePrescription}
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
      />
    </div>
  )
}
