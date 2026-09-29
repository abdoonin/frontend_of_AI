'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, Loader2 } from 'lucide-react'
import { UltrasoundExam, getFibrosisInfo, getSteatosisInfo } from '@/lib/api/ultrasound'
import { printElement, downloadElementAsPdf } from '@/lib/print-service'

interface UltrasoundPrintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exam: UltrasoundExam | null
  patientName: string
  patientCode: string
}

export function UltrasoundPrintModal({
  open,
  onOpenChange,
  exam,
  patientName,
  patientCode,
}: UltrasoundPrintModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)

  if (!exam) return null

  const fibrosis = getFibrosisInfo(exam.fibroscan_kpa)
  const steatosis = getSteatosisInfo(exam.fibroscan_cap)

  const handlePrint = async () => {
    try {
      setPrinting(true)
      await printElement('ultrasound-report-sheet', {
        title: `Ultrasound Report - ${patientName}`,
      })
    } catch (e) {
      window.print()
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true)
      const fileName = `Ultrasound_Report_${patientName.replace(/\s+/g, '_')}_${exam.exam_date || 'exam'}.pdf`
      await downloadElementAsPdf('ultrasound-report-sheet', fileName)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[880px] sm:!max-w-[880px] w-[92vw] h-[90vh] max-h-[900px] overflow-y-auto bg-card text-card-foreground border border-border shadow-2xl !p-0 rounded-2xl print:p-0 print:m-0 print:border-none print:shadow-none">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border print:hidden bg-muted/40">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Ultrasound & Imaging Clinical Report
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official Clinical Sonography & Elastography Audit
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="gap-1.5 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? 'Saving PDF...' : 'Download PDF'}
              </Button>
              <Button size="sm" onClick={handlePrint} disabled={printing} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-xs">
                {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                {printing ? 'Preparing...' : 'Print Report'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Document Sheet Stage */}
        <div className="p-3 sm:p-6 flex justify-center bg-muted/20">
          <div
            id="ultrasound-report-sheet"
            className="w-full max-w-[820px] p-6 sm:p-8 space-y-6 text-sm text-slate-900 bg-white rounded-xl shadow-md border border-slate-200/90 font-sans"
          >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-4">
            <div>
              <h1 className="text-2xl font-black text-emerald-950 tracking-tight">HEPATIQ CLINICAL REPORT</h1>
              <p className="text-xs text-gray-600 mt-0.5">Hepato-Biliary Ultrasound & Elastography Service</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p className="font-semibold text-gray-800">Doc ID: US-{exam.id.toString().padStart(5, '0')}</p>
              <p>Exam Date: {exam.exam_date ? format(new Date(exam.exam_date), 'd MMMM yyyy, HH:mm') : '—'}</p>
              <p>Physician: {exam.doctor_name || 'Attending Hepatologist'}</p>
            </div>
          </div>

          {/* Patient Info Banner */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            <div>
              <span className="text-gray-500 block">Patient Name:</span>
              <span className="font-bold text-gray-900 text-sm">{patientName}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Medical Record Number:</span>
              <span className="font-semibold text-gray-800">{patientCode}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Modality:</span>
              <span className="font-semibold text-emerald-800 uppercase">{exam.exam_type}</span>
            </div>
          </div>

          {/* Findings Table */}
          <div className="space-y-4">
            <h3 className="font-bold text-emerald-900 uppercase text-xs tracking-wider border-b border-gray-200 pb-1">
              Ultrasonographic & Hemodynamic Measurements
            </h3>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Liver Size:</span>
                <span className="font-semibold">{exam.liver_size}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Parenchymal Echogenicity:</span>
                <span className="font-semibold">{exam.echogenicity}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Surface / Contour:</span>
                <span className="font-semibold">{exam.surface_contour}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Portal Vein Caliber:</span>
                <span className="font-semibold">
                  {exam.portal_vein_mm != null ? `${exam.portal_vein_mm} mm` : 'Not recorded'}{' '}
                  {exam.portal_vein_mm && exam.portal_vein_mm > 13 ? '(Dilated)' : ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Portal Doppler Flow:</span>
                <span className="font-semibold">{exam.portal_flow}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Spleen Size:</span>
                <span className="font-semibold">
                  {exam.spleen_size_cm != null ? `${exam.spleen_size_cm} cm` : 'Not recorded'}{' '}
                  {exam.spleen_size_cm && exam.spleen_size_cm > 12.5 ? '(Splenomegaly)' : ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Peritoneal Ascites:</span>
                <span className="font-semibold">{exam.ascites}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Gallbladder:</span>
                <span className="font-semibold">{exam.gallbladder}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Common Bile Duct (CBD):</span>
                <span className="font-semibold">
                  {exam.cbd_diameter_mm != null ? `${exam.cbd_diameter_mm} mm` : 'Normal'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Focal Liver Lesion:</span>
                <span className="font-semibold">{exam.focal_lesion}</span>
              </div>
            </div>

            {exam.focal_lesion !== 'None' && exam.focal_lesion_desc && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs">
                <span className="font-bold text-red-800 block mb-0.5">Focal Lesion Details:</span>
                <p className="text-red-900">{exam.focal_lesion_desc}</p>
              </div>
            )}
          </div>

          {/* FibroScan Section if measured */}
          {(exam.fibroscan_kpa != null || exam.fibroscan_cap != null) && (
            <div className="space-y-2">
              <h3 className="font-bold text-purple-900 uppercase text-xs tracking-wider border-b border-gray-200 pb-1">
                Transient Elastography (FibroScan)
              </h3>
              <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50/50 border border-purple-200 rounded-lg text-xs">
                <div>
                  <span className="text-gray-500 block">Liver Stiffness (E):</span>
                  <span className="text-sm font-bold text-purple-900">
                    {exam.fibroscan_kpa} kPa — Stage {fibrosis.stage} ({fibrosis.tag})
                  </span>
                  <p className="text-[10px] text-gray-500 mt-0.5">{fibrosis.desc}</p>
                </div>
                <div>
                  <span className="text-gray-500 block">Controlled Attenuation Parameter (CAP):</span>
                  <span className="text-sm font-bold text-purple-900">
                    {exam.fibroscan_cap} dB/m — Grade {steatosis.grade} ({steatosis.tag})
                  </span>
                  <p className="text-[10px] text-gray-500 mt-0.5">{steatosis.desc}</p>
                </div>
              </div>
            </div>
          )}

          {/* Impression */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-emerald-900 uppercase text-xs tracking-wider border-b border-gray-200 pb-1">
              Impression / Diagnostic Conclusion
            </h3>
            <p className="text-xs text-gray-800 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200">
              {exam.impression || 'Examination completed within normal anatomical variations.'}
            </p>
          </div>

          {/* Recommendations */}
          {exam.recommendations && (
            <div className="space-y-1.5">
              <h3 className="font-bold text-emerald-900 uppercase text-xs tracking-wider border-b border-gray-200 pb-1">
                Recommendations & Surveillance Follow-up
              </h3>
              <p className="text-xs text-gray-800 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200">
                {exam.recommendations}
              </p>
            </div>
          )}

          {/* Attached images */}
          {exam.image_urls && exam.image_urls.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-gray-700 uppercase text-[11px] tracking-wider">
                Captured Sonograms ({exam.image_urls.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {exam.image_urls.slice(0, 3).map((url, idx) => {
                  const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`
                  return (
                    <div key={idx} className="border border-gray-300 rounded overflow-hidden aspect-video bg-black">
                      <img src={fullUrl} alt="Sonogram capture" className="w-full h-full object-contain" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer Signature */}
          <div className="pt-8 flex justify-between items-end border-t border-gray-200 text-xs text-gray-500">
            <div>
              <p>Generated by Hepatiq Clinical Intelligence</p>
              <p className="text-[10px]">Confidential Medical Record — For Clinical Use Only</p>
            </div>
            <div className="text-right">
              <div className="h-10 w-36 border-b border-gray-400 mb-1"></div>
              <p className="font-medium text-gray-800">{exam.doctor_name || 'Attending Physician'}</p>
              <p className="text-[10px]">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>

        <DialogFooter className="p-4 bg-muted/30 border-t border-border print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs">
            <Printer className="h-4 w-4" /> Print Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
