import { getOrdinalSuffix, isPromotionTerm } from '@/lib/academic-utils'
import { ReportCardData, ReportRemarks, ReportCardTheme } from './types'

// Helper to get promotion status text
function getPromotionStatusText(report: ReportCardData): string {
  // If we have a stored decision from DB, use it
  if (report.promotionDecision) {
    const status = report.promotionDecision.toLowerCase()
    if (status === 'promoted') return 'PROMOTED'
    if (status === 'promoted_probation') return 'PROMOTED ON PROBATION'
    if (status === 'repeated') return 'REPEATED'
    if (status === 'graduated') return 'GRADUATED'
    return status.toUpperCase()
  }

  // Fallback to calculation if no DB record
  if (!isPromotionTerm(report.termName)) return ''
  const avg = report.averageScore || 0
  if (avg >= 30) return 'PROMOTED'
  return 'REPEATED'
}

const getReportStyles = (watermarkImage?: string) => `
          @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
          @page {
            size: A4;
            margin: 5mm;
          }
          @media print {
            html, body {
              width: 210mm;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .report-card {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              min-height: 260mm !important;
              height: auto !important;
              page-break-inside: avoid !important;
              page-break-after: always;
            }
            .report-card:last-child {
                page-break-after: auto;
            }
            .watermark-overlay {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 9pt;
            line-height: 1.25;
            padding: 0;
            color: #00008B;
            background: white;
          }
          .report-card {
            border: 3px solid #00008B;
            padding: 10px;
            width: 100%;
            min-height: 285mm;
            margin: 0 auto;
            position: relative;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            background: white;
            isolation: isolate;
            margin-bottom: 20px;
          }
          .watermark-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: ${watermarkImage ? `url('${watermarkImage}')` : 'none'};
            background-repeat: no-repeat;
            background-position: center center;
            background-size: 90%;
            opacity: 0.08;
            z-index: -1;
            pointer-events: none;
          }
          .report-card > *:not(.watermark-overlay) {
            position: relative;
            z-index: 1;
          }
          .header {
            border: 2px solid #00008B;
            padding: 8px 15px;
            margin-bottom: 10px;
            position: relative;
            box-shadow: 5px 5px 10px rgba(0,0,0,0.15);
          }
          .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 5px 15px;
          }
          .header-logo {
            width: 95px;
            height: 95px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .header-logo img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          .header-top {
            text-align: center;
            flex: 1;
            padding: 0 10px;
          }
          .school-name {
            font-size: 26pt;
            font-weight: bold;
            font-family: Impact, 'Arial Black', sans-serif;
            color: #00008B;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }
          .school-address {
            font-size: 18pt;
            margin: 1px 0;
            color: #00008B;
          }
          .school-address.box {
            font-size: 20pt;
          }
          .school-motto {
            font-size: 16pt;
            font-style: italic;
            margin-top: 4px;
            font-weight: bold;
            color: #00008B;
          }
          .report-title {
            background: #fff;
            border: 2px solid #00008B;
            padding: 4px;
            text-align: center;
            font-weight: bold;
            font-size: 19pt;
            margin: 10px 40px 20px 40px;
            color: #00008B;
            box-shadow: 3px 3px 5px rgba(0,0,0,0.2);
          }
          .student-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            margin-bottom: 6px;
            border: 1px solid #00008B;
          }
          .info-row {
            display: contents;
          }
          .info-cell {
            padding: 3px 6px;
            border: 1px solid #00008B;
            font-size: 11pt;
            color: #00008B;
            text-transform: uppercase;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px;
          }
          .info-label {
            font-weight: bold;
            color: #00008B;
            position: relative;
            padding-right: 8px;
          }
          .info-label::after {
            content: '';
            position: absolute;
            right: 0;
            top: -3px;
            bottom: -3px;
            width: 1px;
            background-color: transparent;
            border-right: 1px solid #00008B;
          }
          .info-value {
            padding-left: 8px;
          }
          .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
            font-size: 11pt;
            font-family: 'Times New Roman', Times, serif;
          }
          .grades-table th,
          .grades-table td {
            border: 1px solid #00008B;
            padding: 2.5px;
            text-align: center;
            color: #00008B;
            font-size: 11pt;
          }
          .grades-table th {
            background: #f0f0f0;
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
            color: #00008B;
          }
          .grades-table td:first-child,
          .grades-table th:first-child {
            text-align: left;
          }
          .grades-table td:last-child,
          .grades-table th:last-child {
            text-align: left;
          }
          .sn-col { width: 30px; }
          .subject-col { width: 180px; }
          .score-col { width: 60px; }
          .total-col { width: 60px; }
          .rank-col { width: 50px; }
          .remarks-col { width: 180px; white-space: nowrap; }
          .total-row { font-weight: bold; }
          .bottom-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-top: 5px;
          }
          .attendance-box,
          .promotion-box {
            border: 1px solid #00008B;
            padding: 3px;
            font-size: 11pt;
            color: #00008B;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 2px;
            text-transform: uppercase;
            font-size: 11pt;
            color: #00008B;
          }
          .remarks-section {
            border: 1px solid #00008B;
            margin-top: 5px;
          }
          .remarks-row {
            display: grid;
            grid-template-columns: 220px 1fr;
            border-bottom: 1px solid #00008B;
          }
          .remarks-row:last-child { border-bottom: none; }
          .remarks-label {
            padding: 6px 10px 6px 8px;
            font-weight: bold;
            border-right: 1px solid #00008B;
            font-size: 11pt;
            color: #00008B;
            white-space: nowrap;
            position: relative;
          }
          .remarks-content {
            padding: 6px 8px;
            min-height: 22px;
            color: #00008B;
            font-size: 11pt;
            border-left: 1px solid #00008B;
          }
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 2px solid #00008B;
            margin-top: 6px;
            min-height: 80px;
          }
          .signature-box {
            text-align: center;
            font-size: 11pt;
            color: #00008B;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .signature-box:first-child {
            border-right: 2px solid #00008B;
          }
          .signature-line {
            color: #00008B;
            font-size: 11pt;
            font-weight: bold;
          }
          .footer-note {
            margin-top: 4px;
            font-size: 5pt;
            text-align: center;
            font-style: italic;
            border-top: 1px solid #00008B;
            padding-top: 2px;
            color: #00008B;
          }
          .copyright-footer {
            position: absolute;
            bottom: 2px;
            right: 5px;
            font-size: 6pt;
            color: #666;
            font-style: italic;
            text-align: right;
          }
          .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            gap: 10px;
          }
          .close-btn {
            background-color: #ef4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
           .print-btn {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
`

const generateReportCardContent = (
  student: any,
  reportData: ReportCardData,
  remarks: ReportRemarks,
  academicSettings: any,
  theme: ReportCardTheme,
  classScorePercentage: number,
  examScorePercentage: number
) => {
  const { logoImage, methodistLogoImage, signatureImage: signatureBase64 } = theme
  const studentName = student.profiles?.full_name || `${student.last_name || ''} ${student.first_name || ''}`.trim()
  const className = (student.classes?.name || student.classes?.class_name || '').toUpperCase()
  const vacationDate = academicSettings?.vacation_start_date 
    ? new Date(academicSettings.vacation_start_date).toLocaleDateString() 
    : 'TBA'
  const reopeningDate = academicSettings?.school_reopening_date 
    ? new Date(academicSettings.school_reopening_date).toLocaleDateString() 
    : 'TBA'

  return `
        <div class="report-card">
          <div class="watermark-overlay"></div>
          <!-- Header -->
          <div class="header">
            <div class="header-content">
              <div class="header-logo">
                ${logoImage ? `<img src="${logoImage}" alt="School Crest" />` : ''}
              </div>
              <div class="header-top">
                <div class="school-name">BIRIWA METHODIST 'C' BASIC SCHOOL</div>
                <div class="school-address box">POST OFFICE BOX 5</div>
                <div class="school-address">TEL: +233244930752</div>
                <div class="school-address">E-mail: biriwamethodistcschool@gmail.com</div>
                <div class="school-motto">MOTTO: DISCIPLINE WITH HARD WORK</div>
              </div>
              <div class="header-logo">
                ${methodistLogoImage ? `<img src="${methodistLogoImage}" alt="Methodist Logo" />` : ''}
              </div>
            </div>
          </div>
          <div class="report-title">STUDENT'S REPORT SHEET</div>

          <!-- Student Information -->
          <div class="student-info-grid">
            <div class="info-row">
              <div class="info-cell"><span class="info-label">NAME:</span><span class="info-value">${studentName}</span></div>
              <div class="info-cell"><span class="info-label">TERM:</span><span class="info-value">${reportData.termName}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">STD ID:</span><span class="info-value">${student.student_id || 'N/A'} | ACAD. YR.: ${reportData.year || ''}</span></div>
              <div class="info-cell"><span class="info-label">AVG SCORE:</span><span class="info-value">${reportData.averageScore}%${(reportData.aggregate !== null && reportData.aggregate !== undefined) ? ` | AGG: ${reportData.aggregate}` : ''}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">GENDER:</span><span class="info-value">${student.gender || 'N/A'}</span></div>
              <div class="info-cell"><span class="info-label">POS. IN CLASS:</span><span class="info-value">${reportData.position ? `${reportData.position}${getOrdinalSuffix(reportData.position)}` : 'N/A'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">CLASS:</span><span class="info-value">${className}</span></div>
              <div class="info-cell"><span class="info-label">VACATION DATE:</span><span class="info-value">${vacationDate || 'TBA'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">NO. ON ROLL:</span><span class="info-value">${reportData.totalClassSize || ''}</span></div>
              <div class="info-cell"><span class="info-label">REOPENING DATE:</span><span class="info-value">${reopeningDate || 'TBA'}</span></div>
            </div>
          </div>

          <!-- Grades Table -->
          <table class="grades-table">
            <thead>
              <tr>
                <th class="sn-col">S/N</th>
                <th class="subject-col">SUBJECT</th>
                <th class="score-col">CLASS SCORE<br/>${classScorePercentage}%</th>
                <th class="score-col">EXAM SCORE<br/>${examScorePercentage}%</th>
                <th class="total-col">TOTAL SCORE<br/>100MARKS</th>
                <th class="rank-col">RANK</th>
                <th class="remarks-col">REMARKS</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.grades.map((grade: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td style="text-align: left;">${(grade.subject_name || '').replace(/\s*\(\s*(LP|UP|JHS)\s*\)\s*$/i, '').toUpperCase()}</td>
                    <td>${grade.class_score != null ? Number(grade.class_score).toFixed(1) : ''}</td>
                    <td>${grade.exam_score != null ? Number(grade.exam_score).toFixed(1) : ''}</td>
                  <td><strong>${grade.total !== null && grade.total !== undefined ? Number(grade.total).toFixed(1) : ''}</strong></td>
                  <td>${grade.rank ? `${grade.rank}${getOrdinalSuffix(grade.rank)}` : ''}</td>
                  <td style="text-align: left;">${grade.remarks || ''}</td>     
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2" style="text-align: right; padding-right: 10px;">TOTAL</td>
                <td></td>
                <td></td>
                <td><strong>${reportData.grades.reduce((sum: number, g: any) => sum + (g.total || 0), 0).toFixed(1)}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <!-- Bottom Section -->
          <div class="bottom-section">
            <div class="attendance-box">
              <div class="section-title">ATTENDANCE: ${reportData.attendance?.present ?? 0} OUT OF ${reportData.attendance?.total ?? 0}</div>
            </div>
            <div class="promotion-box">
              <div class="section-title">PROMOTION STATUS: ${getPromotionStatusText(reportData)}</div>
            </div>
          </div>

          <!-- Remarks Section -->
          <div class="remarks-section">
            <div class="remarks-row">
              <div class="remarks-label">ATTITUDE</div>
              <div class="remarks-content">${remarks.attitude}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">INTEREST</div>
              <div class="remarks-content">${remarks.interest}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">CONDUCT</div>
              <div class="remarks-content">${remarks.conduct}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">CLASS TEACHER'S REMARKS</div>
              <div class="remarks-content">${remarks.classTeacher}</div>        
            </div>
            <div class="remarks-row">
              <div class="remarks-label">HEADTEACHER'S REMARKS</div>
              <div class="remarks-content">${remarks.headTeacher}</div>
            </div>
          </div>

          <!-- Signatures -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">HEADMASTER'S STAMP<br/>&<br/>SIGNATURE</div>
            </div>
            <div class="signature-box" style="padding: 2px; position: relative;">
               ${signatureBase64 ? `<img src="${signatureBase64}" alt="Signature" style="width: 90%; height: auto; max-height: 120px; object-fit: contain; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" />` : ''}
            </div>
          </div>

          <!-- Footer Note -->
          <div class="footer-note">
            © Biriwa Methodist School. All rights reserved. This document is official only when presented in its original color format with the blue textured watermark. Generated on: ${new Date().toLocaleDateString()}.
          </div>
          <div class="copyright-footer">@2025 FortSoft. All rights reserved.</div>
        </div>
  `
}

export const generateReportHTML = (
  student: any,
  reportData: ReportCardData,
  remarks: ReportRemarks,
  academicSettings: any,
  theme: ReportCardTheme,
  classScorePercentage: number = 30,
  examScorePercentage: number = 70
) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Report Card - ${student.profiles?.full_name || 'Student'}</title>
        <style>${getReportStyles(theme.watermarkImage)}</style>
      </head>
      <body>
        <div class="print-controls no-print">
          <button onclick="window.print()" class="print-btn">Print Report</button>
          <button onclick="window.close()" class="close-btn">Close</button>     
        </div>
        ${generateReportCardContent(student, reportData, remarks, academicSettings, theme, classScorePercentage, examScorePercentage)}
      </body>
    </html>
  `
}

export const generateBatchReportHTML = (
  reports: Array<{
    student: any,
    reportData: ReportCardData,
    remarks: ReportRemarks
  }>,
  academicSettings: any,
  theme: ReportCardTheme,
  classScorePercentage: number = 30,
  examScorePercentage: number = 70
) => {
  const content = reports.map(r => 
    generateReportCardContent(r.student, r.reportData, r.remarks, academicSettings, theme, classScorePercentage, examScorePercentage)
  ).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Batch Report Cards - ${new Date().toLocaleDateString()}</title>
        <style>${getReportStyles(theme.watermarkImage)}</style>
      </head>
      <body>
        <div class="print-controls no-print">
          <button onclick="window.print()" class="print-btn">Print All</button>
          <button onclick="window.close()" class="close-btn">Close</button>     
        </div>
        ${content}
      </body>
    </html>
  `
}
