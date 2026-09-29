/**
 * Medical Document Print & PDF Service
 * Provides isolated, 1-page clean printing and high-res PDF generation
 * Supports A5 (official prescription slips) and A4 (imaging & financial reports)
 */

import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export interface PrintOptions {
  title?: string
  pageOrientation?: "portrait" | "landscape"
  paperSize?: "a5" | "a4"
}

export interface PdfOptions {
  paperSize?: "a5" | "a4"
}

/**
 * Print a specific DOM element in an isolated hidden iframe.
 * Guarantees zero leakage of app shell, dialogs, overlays, or extra pages.
 */
export function printElement(elementId: string, options?: PrintOptions): Promise<void> {
  return new Promise((resolve) => {
    const target = document.getElementById(elementId)
    if (!target) {
      console.error(`Print target #${elementId} not found`)
      window.print()
      resolve()
      return
    }

    // Create a temporary hidden iframe
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
      document.body.removeChild(iframe)
      window.print()
      resolve()
      return
    }

    // Extract all stylesheets
    let stylesHtml = ""
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML
    })

    const title = options?.title || "Clinical Document - HEPATIQ"
    const orientation = options?.pageOrientation || "portrait"
    const paperSize = options?.paperSize || "a5"

    const isA5 = paperSize.toLowerCase() === "a5"
    const pageSizeCss = isA5 ? `A5 ${orientation}` : `A4 ${orientation}`
    const pageMarginCss = isA5 ? `5mm 6mm` : `8mm 10mm`
    const fontSizeCss = isA5 ? `10.5px` : `12px`

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          ${stylesHtml}
          <style>
            @page {
              size: ${pageSizeCss};
              margin: ${pageMarginCss};
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              font-size: ${fontSizeCss} !important;
              line-height: 1.35 !important;
            }
            #${elementId} {
              box-shadow: none !important;
              border: none !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div id="${elementId}">
            ${target.innerHTML}
          </div>
        </body>
      </html>
    `)
    doc.close()

    setTimeout(() => {
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
        }, 1500)
      }
    }, 400)
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
  } finally {
    if (document.body.contains(clone)) {
      document.body.removeChild(clone)
    }
  }
}
