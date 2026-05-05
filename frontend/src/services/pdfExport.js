import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const PDF_WIDTH = 1400

export async function exportHtmlToPdf({
  title = 'Document',
  subtitle = '',
  filename = 'document.pdf',
  contentHtml = '',
  footer = 'EduSchedule Pro',
}) {
  const style = document.createElement('style')
  style.textContent = getPdfStyles()
  document.body.appendChild(style)

  const pageChunks = extractPdfPages(contentHtml)

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  try {
    for (let index = 0; index < pageChunks.length; index += 1) {
      const wrapper = document.createElement('div')
      wrapper.className = 'pdf-export-wrapper'

      wrapper.innerHTML = `
        <div class="pdf-document">
          <div class="pdf-header">
            <div class="pdf-brand">
              <div class="pdf-logo">ES</div>
              <div>
                <strong>EduSchedule Pro</strong>
                <span>Gestion académique intelligente</span>
              </div>
            </div>

            <div class="pdf-meta">
              <div>Date : ${new Date().toLocaleDateString('fr-FR')}</div>
              <div>Heure : ${new Date().toLocaleTimeString('fr-FR')}</div>
            </div>
          </div>

          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="pdf-subtitle">${escapeHtml(subtitle)}</p>` : ''}

          ${pageChunks[index]}

          <div class="pdf-footer">
            <span>${escapeHtml(footer)}</span>
            <span>Document généré automatiquement</span>
          </div>
        </div>
      `

      document.body.appendChild(wrapper)

      const documentNode = wrapper.querySelector('.pdf-document')

      const canvas = await html2canvas(documentNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: PDF_WIDTH,
      })

      if (index > 0) {
        pdf.addPage()
      }

      addCanvasToPdfPage(pdf, canvas)

      document.body.removeChild(wrapper)
    }

    pdf.save(filename)
  } finally {
    document.body.removeChild(style)
  }
}

function extractPdfPages(contentHtml) {
  const temp = document.createElement('div')
  temp.innerHTML = contentHtml

  const pages = [...temp.querySelectorAll('.pdf-page')]

  if (pages.length === 0) {
    return [contentHtml]
  }

  return pages.map((page) => page.innerHTML)
}

function addCanvasToPdfPage(pdf, canvas) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const margin = 8
  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - margin * 2

  const imgData = canvas.toDataURL('image/jpeg', 0.96)

  const ratioWidth = usableWidth / canvas.width
  const ratioHeight = usableHeight / canvas.height
  const ratio = Math.min(ratioWidth, ratioHeight)

  const imgWidth = canvas.width * ratio
  const imgHeight = canvas.height * ratio

  const x = (pageWidth - imgWidth) / 2
  const y = margin

  pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight)
}

export function buildTableHtml(headers, rows) {
  return `
    <table>
      <thead>
        <tr>
          ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
        </tr>
      </thead>

      <tbody>
        ${
          rows.length > 0
            ? rows
                .map(
                  (row) => `
                    <tr>
                      ${row
                        .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                        .join('')}
                    </tr>
                  `,
                )
                .join('')
            : `<tr><td colspan="${headers.length}">Aucune donnée disponible</td></tr>`
        }
      </tbody>
    </table>
  `
}

export function buildCardsHtml(cards) {
  return `
    <div class="pdf-grid">
      ${cards
        .map(
          (card) => `
            <div class="pdf-card">
              <span>${escapeHtml(card.label)}</span>
              <strong>${escapeHtml(card.value)}</strong>
            </div>
          `,
        )
        .join('')}
    </div>
  `
}

export function buildSignaturesHtml(signatures = []) {
  return `
    <div class="signature-row">
      ${signatures
        .map(
          (signature) => `
            <div class="signature-box">
              <strong>${escapeHtml(signature.label)}</strong>
              ${
                signature.image
                  ? `<img src="${signature.image}" alt="${escapeHtml(
                      signature.label,
                    )}" />`
                  : `<span>Signature non disponible</span>`
              }
            </div>
          `,
        )
        .join('')}
    </div>
  `
}

function getPdfStyles() {
  return `
    .pdf-export-wrapper {
      position: fixed;
      left: -30000px;
      top: 0;
      width: ${PDF_WIDTH}px;
      background: #ffffff;
      z-index: -9999;
    }

    .pdf-document {
      width: ${PDF_WIDTH}px;
      padding: 42px;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.42;
    }

    .pdf-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 20px;
      margin-bottom: 26px;
      border-bottom: 4px solid #4f46e5;
    }

    .pdf-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .pdf-logo {
      width: 58px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      background: #4f46e5;
      color: #ffffff;
      font-size: 20px;
      font-weight: 900;
    }

    .pdf-brand strong {
      display: block;
      color: #0f172a;
      font-size: 23px;
      font-weight: 900;
    }

    .pdf-brand span {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
    }

    .pdf-meta {
      text-align: right;
      color: #64748b;
      font-size: 13px;
      line-height: 1.7;
      font-weight: 700;
      white-space: nowrap;
    }

    .pdf-document h1 {
      margin: 0 0 8px;
      color: #0f172a;
      font-size: 34px;
      line-height: 1.15;
      font-weight: 900;
    }

    .pdf-subtitle {
      margin: 0 0 24px;
      color: #475569;
      font-size: 15px;
      font-weight: 700;
    }

    .pdf-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin: 20px 0 26px;
    }

    .pdf-card {
      min-height: 96px;
      padding: 16px;
      border-radius: 16px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    .pdf-card span {
      display: block;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0;
      white-space: normal;
    }

    .pdf-card strong {
      display: block;
      margin-top: 10px;
      color: #0f172a;
      font-size: 22px;
      line-height: 1.15;
      font-weight: 900;
      white-space: normal;
      overflow-wrap: break-word;
    }

    .pdf-section {
      margin-top: 24px;
      margin-bottom: 24px;
    }

    .pdf-section h2 {
      margin: 0 0 14px;
      color: #111827;
      font-size: 22px;
      font-weight: 900;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
    }

    th {
      background: #eef2ff;
      color: #3730a3;
      text-align: left;
      font-size: 10.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    th,
    td {
      padding: 9px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
      word-break: normal;
      overflow-wrap: break-word;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .signature-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-top: 32px;
    }

    .signature-box {
      min-height: 110px;
      padding: 14px;
      border: 1px dashed #94a3b8;
      border-radius: 12px;
    }

    .signature-box strong {
      display: block;
      margin-bottom: 14px;
    }

    .signature-box img {
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
    }

    .pdf-footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
    }
  `
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}