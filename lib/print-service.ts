/**
 * Medical Document Print & PDF Service
 * Provides isolated, 1-page clean printing and high-res PDF generation
 * Supports A5 (official prescription slips) and A4 (imaging & financial reports)
 */

import jsPDF from "jspdf"
import html2canvas from "html2canvas-pro"

export interface PrintOptions {
  title?: string
  pageOrientation?: "portrait" | "landscape"
  paperSize?: "a5" | "a4"
}

export interface PdfOptions {
  paperSize?: "a5" | "a4"
}

/**
 * Print a specific DOM element using high-res snapshot rendering in an isolated hidden iframe.
 * Guarantees 100% identical styling, colors, and layout to the PDF download,
 * with zero leakage of app shell, dialogs, overlays, or extra pages.
 */
export async function printElement(elementId: string, options?: PrintOptions): Promise<void> {
  const target = document.getElementById(elementId)
  if (!target) {
    console.error(`Print target #${elementId} not found`)
    window.print()
    return
  }

  const title = options?.title || "Clinical Document - HEPATIQ"
  const orientation = options?.pageOrientation || "portrait"
  const paperSize = options?.paperSize || "a5"
  const isA5 = paperSize.toLowerCase() === "a5"
  const renderWidth = isA5 ? 560 : 794 // 560px for A5, 794px for A4

  // Clone element temporarily for high-res snapshot to capture 100% computed styles
  const clone = target.cloneNode(true) as HTMLElement
  clone.style.width = `${renderWidth}px`
  clone.style.maxWidth = `${renderWidth}px`
  clone.style.minHeight = "auto"
  clone.style.position = "fixed"
  clone.style.left = "-9999px"
  clone.style.top = "0"
  clone.style.background = "#ffffff"
  clone.style.color = "#0f172a"
  clone.style.padding = isA5 ? "16px 20px" : "24px 32px"
  clone.style.boxShadow = "none"
  clone.style.border = "none"
  document.body.appendChild(clone)

  let imgData = ""
  try {
    const canvas = await html2canvas(clone, {
      scale: 2.5, // Crisp retina print quality
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: renderWidth,
    })
    imgData = canvas.toDataURL("image/png")
  } catch (err) {
    console.error("Print snapshot generation failed, falling back to window.print():", err)
    window.print()
    return
  } finally {
    if (document.body.contains(clone)) {
      document.body.removeChild(clone)
    }
  }

  // Create temporary hidden iframe to host the print preview
  return new Promise((resolve) => {
    const iframeId = `print-iframe-${Date.now()}`
    const iframe = document.createElement("iframe")
    iframe.id = iframeId
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.style.visibility = "hidden"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
      window.print()
      resolve()
      return
    }

    const pageSizeCss = isA5 ? `A5 ${orientation}` : `A4 ${orientation}`

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          <style>
            @page {
              size: ${pageSizeCss};
              margin: 0;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              min-height: 100% !important;
              background: #ffffff !important;
            }
            .print-page-wrapper {
              width: 100%;
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding: ${isA5 ? "4mm 5mm" : "6mm 8mm"};
              box-sizing: border-box;
            }
            img {
              width: 100%;
              max-width: 100%;
              height: auto;
              max-height: calc(100vh - ${isA5 ? "8mm" : "12mm"});
              object-fit: contain;
              display: block;
              margin: 0 auto;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="print-page-wrapper">
            <img id="print-snapshot-img" src="${imgData}" alt="Medical Document" />
          </div>
        </body>
      </html>
    `)
    doc.close()

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        resolve()
      } catch (err) {
        console.error("Iframe print error:", err)
        window.print()
        resolve()
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 2000)
      }
    }

    const printImg = doc.getElementById("print-snapshot-img") as HTMLImageElement | null
    if (printImg) {
      if (printImg.complete) {
        setTimeout(triggerPrint, 150)
      } else {
        printImg.onload = () => setTimeout(triggerPrint, 150)
        printImg.onerror = () => triggerPrint()
      }
    } else {
      setTimeout(triggerPrint, 300)
    }
  })
}

/**
 * Direct PDF Download: Renders the DOM element as a crisp 1-page A5 or A4 PDF file
 */
export async function downloadElementAsPdf(
  elementId: string,
  fileName: string = "Document.pdf",
  options?: PdfOptions
): Promise<void> {
  const target = document.getElementById(elementId)
  if (!target) {
    throw new Error(`Element #${elementId} not found`)
  }

  const paperSize = options?.paperSize || "a5"
  const isA5 = paperSize.toLowerCase() === "a5"
  const renderWidth = isA5 ? 560 : 794 // 560px for A5, 794px for A4

  // Clone element temporarily for high-res snapshot
  const clone = target.cloneNode(true) as HTMLElement
  clone.style.width = `${renderWidth}px`
  clone.style.maxWidth = `${renderWidth}px`
  clone.style.minHeight = "auto"
  clone.style.position = "fixed"
  clone.style.left = "-9999px"
  clone.style.top = "0"
  clone.style.background = "#ffffff"
  clone.style.color = "#0f172a"
  clone.style.padding = isA5 ? "16px 20px" : "24px 32px"
  clone.style.boxShadow = "none"
  clone.style.border = "none"
  document.body.appendChild(clone)

  try {
    const canvas = await html2canvas(clone, {
      scale: 2.5, // Crisp retina quality
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: renderWidth,
    })

    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: isA5 ? "a5" : "a4",
      compress: true,
    })

    const pdfWidth = pdf.internal.pageSize.getWidth() // A5: 148mm, A4: 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight() // A5: 210mm, A4: 297mm

    const sideMargin = isA5 ? 6 : 10
    const topMargin = isA5 ? 6 : 10

    const canvasRatio = canvas.height / canvas.width
    let finalWidth = pdfWidth - sideMargin * 2
    let finalHeight = finalWidth * canvasRatio

    // If canvas height exceeds printable vertical space, fit strictly to page height (1 page guarantee)
    const maxAvailableHeight = pdfHeight - topMargin * 2
    if (finalHeight > maxAvailableHeight) {
      finalHeight = maxAvailableHeight
      finalWidth = finalHeight / canvasRatio
    }

    const xOffset = (pdfWidth - finalWidth) / 2
    const yOffset = topMargin

    pdf.addImage(imgData, "PNG", xOffset, yOffset, finalWidth, finalHeight, undefined, "FAST")

    const safeName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`
    pdf.save(safeName)
  } catch (err) {
    console.warn("Direct PDF generation failed, launching native print/PDF engine:", err)
    await printElement(elementId, { paperSize })
  } finally {
    if (document.body.contains(clone)) {
      document.body.removeChild(clone)
    }
  }
}
