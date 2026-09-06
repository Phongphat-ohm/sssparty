import { StudentSubmissionRow } from "@/components/admin/AssignmentSubmissionsClient";
import {
  GradebookReportData,
  AttendanceSummaryReportData,
  ComprehensiveEvaluationReportData,
} from "@/actions/reports";
import { StudentAttendanceRow } from "@/components/admin/AttendanceSheetClient";

/**
 * 1. สร้าง HTML รายงานผลการส่งงานและการประเมินคะแนนภาระงาน (ขาว-ดำ มาตรฐานทางการ)
 */
export function generateAssignmentReportHtml(params: {
  assignmentTitle: string;
  maxScore: number;
  dueDate?: string;
  academicTerm?: string;
  selectedClass?: string;
  rows: StudentSubmissionRow[];
}): string {
  const {
    assignmentTitle,
    maxScore,
    dueDate,
    academicTerm = "1/2569",
    selectedClass = "ALL",
    rows,
  } = params;

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    : "-";

  const total = rows.length;
  const submitted = rows.filter(
    (r) => r.status === "SUBMITTED" || r.status === "LATE" || r.status === "GRADED"
  ).length;
  const graded = rows.filter((r) => r.status === "GRADED").length;
  const unsubmitted = total - submitted;

  const gradedRows = rows.filter((r) => typeof r.score === "number");
  const avgScore =
    gradedRows.length > 0
      ? (
          gradedRows.reduce((acc, r) => acc + (r.score || 0), 0) / gradedRows.length
        ).toFixed(1)
      : "-";

  const maxAttained =
    gradedRows.length > 0 ? Math.max(...gradedRows.map((r) => r.score || 0)) : "-";
  const minAttained =
    gradedRows.length > 0 ? Math.min(...gradedRows.map((r) => r.score || 0)) : "-";

  const tableRowsHtml = rows
    .map((r, i) => {
      let statusText = "ยังไม่ส่ง";
      if (r.status === "GRADED") statusText = "ตรวจแล้ว";
      else if (r.status === "SUBMITTED") statusText = "รอตรวจ";
      else if (r.status === "LATE") statusText = "ส่งช้า";

      const hasScore = typeof r.score === "number";
      const percent =
        hasScore && maxScore > 0 ? ((r.score! / maxScore) * 100).toFixed(0) + "%" : "-";

      const submittedTimeStr = r.submittedAt
        ? new Date(r.submittedAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";

      return `<tr>
        <td class="text-center font-mono">${i + 1}</td>
        <td class="text-center font-mono">${r.studentCode}</td>
        <td class="text-left">${r.firstName} ${r.lastName}</td>
        <td class="text-center">${r.className}</td>
        <td class="text-center font-mono">${r.studentNumber}</td>
        <td class="text-center">${statusText}</td>
        <td class="text-center" style="font-size: 11pt;">${submittedTimeStr}</td>
        <td class="text-center font-bold">${hasScore ? r.score : "-"}</td>
        <td class="text-center font-mono">${percent}</td>
      </tr>`;
    })
    .join("\n");

  return `
    <div class="report-header">
      <h2>ชุมนุมสื่อสร้างสรรค์ (3S Party • Creative Media Club)</h2>
      <h1>แบบรายงานผลการส่งงานและการประเมินคะแนนภาระงาน</h1>
      <p>ภาคเรียนที่ ${academicTerm} • กลุ่มเป้าหมาย: <strong>${
    selectedClass === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${selectedClass}`
  }</strong> • วันที่ออกรายงาน: ${printDateStr}</p>
    </div>

    <div class="summary-box">
      <table style="width: 100%; border: none; font-size: 13pt;">
        <tr>
          <td style="border: none; width: 55%; vertical-align: top;">
            <div><strong>ชื่องาน:</strong> ${assignmentTitle}</div>
            <div style="margin-top: 4px;"><strong>คะแนนเต็ม:</strong> ${maxScore} คะแนน</div>
            <div style="margin-top: 4px;"><strong>กำหนดส่ง:</strong> ${formattedDueDate}</div>
          </td>
          <td style="border: none; width: 45%; vertical-align: top; text-align: right;">
            <div><strong>จำนวนทั้งหมด:</strong> ${total} คน (ส่งแล้ว: ${submitted}, ยังไม่ส่ง: ${unsubmitted})</div>
            <div style="margin-top: 4px;"><strong>ตรวจแล้ว:</strong> ${graded} คน • <strong>คะแนนเฉลี่ย:</strong> ${avgScore}</div>
            <div style="margin-top: 4px;"><strong>คะแนนสูงสุด / ต่ำสุด:</strong> ${maxAttained} / ${minAttained} คะแนน</div>
          </td>
        </tr>
      </table>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 40px;">ลำดับ</th>
          <th style="width: 75px;">รหัสนักเรียน</th>
          <th style="text-align: left;">ชื่อ-สกุล</th>
          <th style="width: 50px;">ห้อง</th>
          <th style="width: 45px;">เลขที่</th>
          <th style="width: 80px;">สถานะ</th>
          <th style="width: 110px;">เวลาที่ส่ง</th>
          <th style="width: 70px;">คะแนน (${maxScore})</th>
          <th style="width: 60px;">ร้อยละ</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div class="signature-container">
      <div style="font-size: 11pt; color: #333; width: 45%;">
        * เอกสารรายงานนี้จัดพิมพ์จากระบบฐานข้อมูลชุมนุมสื่อสร้างสรรค์<br>
        * เกณฑ์การให้คะแนนอ้างอิงตามเกณฑ์รูบริก (Rubric Assessment)
      </div>
      <div class="signature-block">
        <p>ผู้รายงาน / ครูที่ปรึกษาชุมนุม</p>
        <div class="signature-space"></div>
        <p>ลงชื่อ ..........................................................................</p>
        <p style="font-size: 13pt; margin-top: 4px;">( .......................................................................... )</p>
        <p style="font-size: 13pt; margin-top: 4px;">ตำแหน่ง ..........................................................................</p>
        <p style="font-size: 12pt; margin-top: 4px;">วันที่ ........ เดือน ................................. พ.ศ. ............</p>
      </div>
    </div>
  `;
}

/**
 * 2. สร้าง HTML สมุดบันทึกผลการเรียนรู้และสรุปคะแนนรวม (Gradebook Report ขาว-ดำ แนวนอน)
 */
export function generateGradebookReportHtml(data: GradebookReportData): string {
  const {
    academicTerm,
    className,
    totalStudents,
    totalMaxPossibleScore,
    assignments,
    students,
    stats,
  } = data;

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const assignmentHeaders = assignments
    .map(
      (a) =>
        `<th style="width: 70px; font-size: 11pt;"><div>${a.title}</div><div style="font-weight: normal; font-size: 9.5pt;">(${a.maxScore})</div></th>`
    )
    .join("");

  const rowsHtml = students
    .map((st, i) => {
      const scoreCols = assignments
        .map((a) => {
          const sc = st.scores[a.id];
          return `<td class="text-center font-mono">${sc !== null && sc !== undefined ? sc : "0"}</td>`;
        })
        .join("");

      return `<tr>
        <td class="text-center font-mono">${i + 1}</td>
        <td class="text-center font-mono" style="font-size: 11pt;">${st.studentCode}</td>
        <td class="text-left">${st.name}</td>
        <td class="text-center">${st.className}</td>
        <td class="text-center font-mono">${st.studentNumber}</td>
        ${scoreCols}
        <td class="text-center font-bold font-mono">${st.totalScore}</td>
        <td class="text-center font-mono">${st.percentage}%</td>
        <td class="text-center font-bold">${st.passed ? "ผ่าน" : "ไม่ผ่าน"}</td>
      </tr>`;
    })
    .join("\n");

  return `
    <div class="report-header">
      <h2>ชุมนุมสื่อสร้างสรรค์ (3S Party • Creative Media Club)</h2>
      <h1>สมุดบันทึกผลการเรียนรู้และสรุปคะแนนรวม (Gradebook Report)</h1>
      <p>ภาคเรียนที่ ${academicTerm} • กลุ่มเป้าหมาย: <strong>${
    className === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${className}`
  }</strong> • วันที่ออกรายงาน: ${printDateStr}</p>
    </div>

    <div class="summary-box">
      <table style="width: 100%; border: none; font-size: 13pt;">
        <tr>
          <td style="border: none; width: 33%;"><strong>จำนวนสมาชิก:</strong> ${totalStudents} คน</td>
          <td style="border: none; width: 33%;"><strong>ภาระงานทั้งหมด:</strong> ${assignments.length} ชิ้น (เต็ม ${totalMaxPossibleScore} คะแนน)</td>
          <td style="border: none; width: 34%; text-align: right;"><strong>ผ่านเกณฑ์ (&ge; 50%):</strong> ${stats.passedCount} คน • <strong>คะแนนเฉลี่ย:</strong> ${stats.avgTotalScore} (${stats.avgPercentage}%)</td>
        </tr>
      </table>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 35px;">ลำดับ</th>
          <th style="width: 65px;">รหัส</th>
          <th style="text-align: left;">ชื่อ-สกุล</th>
          <th style="width: 45px;">ห้อง</th>
          <th style="width: 40px;">เลขที่</th>
          ${assignmentHeaders}
          <th style="width: 55px;">รวม (${totalMaxPossibleScore})</th>
          <th style="width: 50px;">ร้อยละ</th>
          <th style="width: 60px;">ผลประเมิน</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signature-container">
      <div style="font-size: 11pt; color: #333; width: 50%;">
        * เกณฑ์การตัดสินกิจกรรมชุมนุม: ได้คะแนนรวมไม่ต่ำกว่าร้อยละ ๕๐ ถือว่า "ผ่าน"<br>
        * เอกสารแบบสรุปผลคะแนนอย่างเป็นทางการสำหรับบันทึกผลการเรียนรู้
      </div>
      <div class="signature-block">
        <p>ผู้รายงาน / ครูที่ปรึกษาชุมนุม</p>
        <div class="signature-space"></div>
        <p>ลงชื่อ ..........................................................................</p>
        <p style="font-size: 13pt; margin-top: 4px;">( .......................................................................... )</p>
        <p style="font-size: 13pt; margin-top: 4px;">ตำแหน่ง ..........................................................................</p>
        <p style="font-size: 12pt; margin-top: 4px;">วันที่ ........ เดือน ................................. พ.ศ. ............</p>
      </div>
    </div>
  `;
}

/**
 * 3. สร้าง HTML รายงานผลการเข้าร่วมกิจกรรมประจำรอบ (Single Attendance Session Report)
 */
export function generateAttendanceSessionReportHtml(params: {
  sessionTitle: string;
  sessionDate: string;
  academicTerm: string;
  sessionNote?: string | null;
  selectedClass?: string;
  records: StudentAttendanceRow[];
}): string {
  const {
    sessionTitle,
    sessionDate,
    academicTerm,
    sessionNote,
    selectedClass = "ALL",
    records,
  } = params;

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedSessionDate = new Date(sessionDate).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const leave = records.filter((r) => r.status === "LEAVE").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const presentPercent =
    total > 0 ? (((present + late * 0.5) / total) * 100).toFixed(0) : "0";

  const rowsHtml = records
    .map((rec, idx) => {
      let statusText = "ขาดเรียน";
      if (rec.status === "PRESENT") statusText = "มาเรียน";
      else if (rec.status === "LATE") statusText = "มาสาย";
      else if (rec.status === "LEAVE") statusText = "ลา";

      return `<tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="text-center font-mono">${rec.studentCode}</td>
        <td class="text-left">${rec.firstName} ${rec.lastName}</td>
        <td class="text-center">${rec.className}</td>
        <td class="text-center font-mono">${rec.studentNumber}</td>
        <td class="text-center font-bold">${statusText}</td>
        <td class="text-left" style="font-size: 11pt;">${rec.note || "-"}</td>
      </tr>`;
    })
    .join("\n");

  return `
    <div class="report-header">
      <h2>ชุมนุมสื่อสร้างสรรค์ (3S Party • Creative Media Club)</h2>
      <h1>แบบรายงานผลการเข้าร่วมกิจกรรมชุมนุมประจำรอบ</h1>
      <p>ภาคเรียนที่ ${academicTerm} • กลุ่มเป้าหมาย: <strong>${
    selectedClass === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${selectedClass}`
  }</strong> • วันที่ออกรายงาน: ${printDateStr}</p>
    </div>

    <div class="summary-box">
      <table style="width: 100%; border: none; font-size: 13pt;">
        <tr>
          <td style="border: none; width: 55%; vertical-align: top;">
            <div><strong>กิจกรรม:</strong> ${sessionTitle}</div>
            <div style="margin-top: 4px;"><strong>วันที่จัด:</strong> ${formattedSessionDate}</div>
            ${
              sessionNote
                ? `<div style="margin-top: 4px;"><strong>หมายเหตุ:</strong> ${sessionNote}</div>`
                : ""
            }
          </td>
          <td style="border: none; width: 45%; vertical-align: top; text-align: right;">
            <div><strong>มาเรียน:</strong> ${present} คน • <strong>มาสาย:</strong> ${late} คน • <strong>ลา:</strong> ${leave} คน • <strong>ขาด:</strong> ${absent} คน</div>
            <div style="margin-top: 6px;"><strong>ร้อยละการเข้าร่วมกิจกรรม:</strong> ${presentPercent}% (จากทั้งหมด ${total} คน)</div>
          </td>
        </tr>
      </table>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 40px;">ลำดับ</th>
          <th style="width: 80px;">รหัสนักเรียน</th>
          <th style="text-align: left;">ชื่อ-สกุล</th>
          <th style="width: 50px;">ห้อง</th>
          <th style="width: 45px;">เลขที่</th>
          <th style="width: 80px;">สถานะ</th>
          <th style="text-align: left;">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signature-container">
      <div style="font-size: 11pt; color: #333; width: 45%;">
        * ข้อมูลการเช็กชื่อบันทึกผ่านระบบฐานข้อมูลออนไลน์ของชุมนุม
      </div>
      <div class="signature-block">
        <p>ผู้บันทึก / ครูที่ปรึกษาชุมนุม</p>
        <div class="signature-space"></div>
        <p>ลงชื่อ ..........................................................................</p>
        <p style="font-size: 13pt; margin-top: 4px;">( .......................................................................... )</p>
        <p style="font-size: 13pt; margin-top: 4px;">ตำแหน่ง ..........................................................................</p>
        <p style="font-size: 12pt; margin-top: 4px;">วันที่ ........ เดือน ................................. พ.ศ. ............</p>
      </div>
    </div>
  `;
}

/**
 * 4. สร้าง HTML รายงานสรุปเวลาเรียนกิจกรรมชุมนุมทั้งภาคเรียน (Overall Attendance Summary)
 */
export function generateAttendanceSummaryReportHtml(
  data: AttendanceSummaryReportData
): string {
  const {
    academicTerm,
    className,
    totalStudents,
    totalSessions,
    students,
    stats,
  } = data;

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rowsHtml = students
    .map(
      (st, idx) => `<tr>
      <td class="text-center font-mono">${idx + 1}</td>
      <td class="text-center font-mono" style="font-size: 11pt;">${st.studentCode}</td>
      <td class="text-left">${st.name}</td>
      <td class="text-center">${st.className}</td>
      <td class="text-center font-mono">${st.studentNumber}</td>
      <td class="text-center font-mono">${st.present}</td>
      <td class="text-center font-mono">${st.late}</td>
      <td class="text-center font-mono">${st.leave}</td>
      <td class="text-center font-mono">${st.absent}</td>
      <td class="text-center font-mono font-bold">${totalSessions}</td>
      <td class="text-center font-mono font-bold">${st.percentage}%</td>
      <td class="text-center font-bold">${st.passed ? "ผ่าน" : "ไม่ผ่าน (มส.)"}</td>
    </tr>`
    )
    .join("\n");

  return `
    <div class="report-header">
      <h2>ชุมนุมสื่อสร้างสรรค์ (3S Party • Creative Media Club)</h2>
      <h1>แบบรายงานสรุปเวลาเรียนกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)</h1>
      <p>ภาคเรียนที่ ${academicTerm} • กลุ่มเป้าหมาย: <strong>${
    className === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${className}`
  }</strong> • วันที่ออกรายงาน: ${printDateStr}</p>
    </div>

    <div class="summary-box">
      <table style="width: 100%; border: none; font-size: 13pt;">
        <tr>
          <td style="border: none; width: 33%;"><strong>จำนวนสมาชิก:</strong> ${totalStudents} คน</td>
          <td style="border: none; width: 33%;"><strong>จำนวนคาบทั้งหมด:</strong> ${totalSessions} คาบ</td>
          <td style="border: none; width: 34%; text-align: right;"><strong>ผ่านเกณฑ์เวลาเรียน (&ge; 80%):</strong> ${stats.passedCount} คน (ไม่ผ่าน: ${stats.failedCount} คน)</td>
        </tr>
      </table>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 35px;">ลำดับ</th>
          <th style="width: 65px;">รหัส</th>
          <th style="text-align: left;">ชื่อ-สกุล</th>
          <th style="width: 45px;">ห้อง</th>
          <th style="width: 40px;">เลขที่</th>
          <th style="width: 45px;">มา</th>
          <th style="width: 45px;">สาย</th>
          <th style="width: 45px;">ลา</th>
          <th style="width: 45px;">ขาด</th>
          <th style="width: 55px;">รวมคาบ</th>
          <th style="width: 55px;">ร้อยละ</th>
          <th style="width: 75px;">ผลประเมิน</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signature-container">
      <div style="font-size: 11pt; color: #333; width: 50%;">
        * ตามระเบียบกระทรวงศึกษาธิการ นักเรียนต้องมีเวลาเข้าร่วมกิจกรรมไม่น้อยกว่าร้อยละ ๘๐ จึงจะได้รับการตัดสิน "ผ่าน"<br>
        * เอกสารสรุปเวลาเรียนอย่างเป็นทางการเพื่อนำส่งงานทะเบียนวัดผล
      </div>
      <div class="signature-block">
        <p>ผู้รายงาน / ครูที่ปรึกษาชุมนุม</p>
        <div class="signature-space"></div>
        <p>ลงชื่อ ..........................................................................</p>
        <p style="font-size: 13pt; margin-top: 4px;">( .......................................................................... )</p>
        <p style="font-size: 13pt; margin-top: 4px;">ตำแหน่ง ..........................................................................</p>
        <p style="font-size: 12pt; margin-top: 4px;">วันที่ ........ เดือน ................................. พ.ศ. ............</p>
      </div>
    </div>
  `;
}

/**
 * 5. สร้าง HTML รายงานผลการเรียนรู้และการเข้าร่วมกิจกรรมพัฒนาผู้เรียน (รวมส่งงาน & เวลาเรียน)
 * แนวนอน (Landscape) มาตรฐานทางการ
 */
export function generateComprehensiveEvaluationReportHtml(
  data: ComprehensiveEvaluationReportData
): string {
  const {
    academicTerm,
    clubName,
    className,
    totalStudents,
    totalSessions,
    totalMaxPossibleScore,
    assignments,
    students,
    stats,
  } = data;

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const showIndividualAssignments = assignments.length <= 5;

  const assignmentHeadersHtml = showIndividualAssignments
    ? assignments
        .map(
          (a, i) =>
            `<th style="width: 45px; font-size: 10pt;" title="${a.title} (${a.maxScore} คะแนน)">งาน ${i + 1}<br><span style="font-size: 8pt; font-weight: normal;">(${a.maxScore})</span></th>`
        )
        .join("")
    : `<th style="width: 55px; font-size: 10pt;">ภาระงาน<br><span style="font-size: 8pt; font-weight: normal;">(${assignments.length} งาน)</span></th>`;

  const rowsHtml = students
    .map((st, idx) => {
      const assignmentCellsHtml = showIndividualAssignments
        ? assignments
            .map((a) => {
              const val = st.scores[a.id];
              return `<td class="text-center font-mono" style="font-size: 10pt;">${
                typeof val === "number" ? val : "-"
              }</td>`;
            })
            .join("")
        : `<td class="text-center font-mono" style="font-size: 10pt;">${
            Object.values(st.scores).filter((v) => typeof v === "number").length
          }/${assignments.length}</td>`;

      const finalGradeClass = "color: #000000; font-weight: bold;";

      return `<tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="text-center font-mono" style="font-size: 10pt;">${st.studentCode}</td>
        <td class="text-left" style="white-space: nowrap;">${st.name}</td>
        <td class="text-center">${st.className}</td>
        <td class="text-center font-mono">${st.studentNumber}</td>
        
        <!-- เวลาเรียน -->
        <td class="text-center font-mono">${st.present}</td>
        <td class="text-center font-mono">${st.late}</td>
        <td class="text-center font-mono">${st.leave}</td>
        <td class="text-center font-mono">${st.absent}</td>
        <td class="text-center font-mono font-bold">${st.effectivePresent}</td>
        <td class="text-center font-mono font-bold">${st.attendancePercentage}%</td>
        <td class="text-center font-bold" style="font-size: 10pt; color: #000000;">${st.attendancePassed ? "ผ่าน" : "มส."}</td>

        <!-- ผลคะแนนภาระงาน -->
        ${assignmentCellsHtml}
        <td class="text-center font-mono font-bold">${st.totalScore}/${totalMaxPossibleScore}</td>
        <td class="text-center font-mono font-bold">${st.scorePercentage}%</td>

        <!-- ตัดสินผลการประเมิน -->
        <td class="text-center" style="${finalGradeClass}; font-size: 12pt;">
          ${st.finalGrade}
        </td>
      </tr>`;
    })
    .join("\n");

  return `
    <div class="report-header">
      <h2>${clubName}</h2>
      <h1>แบบรายงานสรุปผลการเรียนรู้และการเข้าร่วมกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)</h1>
      <p>ภาคเรียนที่ ${academicTerm} • กลุ่มเป้าหมาย: <strong>${
    className === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${className}`
  }</strong> • วันที่ออกรายงาน: ${printDateStr}</p>
    </div>

    <div class="summary-box">
      <table style="width: 100%; border: none; font-size: 12pt;">
        <tr>
          <td style="border: none; width: 25%;"><strong>จำนวนสมาชิก:</strong> ${totalStudents} คน</td>
          <td style="border: none; width: 25%;"><strong>จำนวนคาบกิจกรรม:</strong> ${totalSessions} คาบ</td>
          <td style="border: none; width: 25%;"><strong>จำนวนภาระงาน:</strong> ${assignments.length} ชิ้น (${totalMaxPossibleScore} คะแนน)</td>
          <td style="border: none; width: 25%; text-align: right;">
            <strong>สรุปผลการตัดสิน:</strong> 
            <span style="color: #000000; font-weight: bold;">ผ่าน (ผ): ${stats.passedCount} คน</span> • 
            <span style="color: #000000; font-weight: bold;">ไม่ผ่าน (มผ): ${stats.failedCount} คน</span>
          </td>
        </tr>
        <tr>
          <td colspan="4" style="border: none; padding-top: 4px; font-size: 11pt; color: #444;">
            เวลาเรียนเฉลี่ย: ${stats.avgAttendancePercentage}% • คะแนนเฉลี่ยรวม: ${stats.avgTotalScore} คะแนน (${stats.avgScorePercentage}%)
          </td>
        </tr>
      </table>
    </div>

    <table class="report-table" style="font-size: 10.5pt;">
      <thead>
        <tr>
          <th rowspan="2" style="width: 30px;">ลำดับ</th>
          <th rowspan="2" style="width: 60px;">รหัส</th>
          <th rowspan="2" style="text-align: left; min-width: 130px;">ชื่อ-สกุล</th>
          <th rowspan="2" style="width: 40px;">ห้อง</th>
          <th rowspan="2" style="width: 35px;">เลขที่</th>
          
          <th colspan="7" style="background-color: #EEEEEE;">การเข้าร่วมกิจกรรม (เวลาเรียน)</th>
          
          <th colspan="${showIndividualAssignments ? assignments.length + 2 : 3}" style="background-color: #F4F4F4;">การประเมินภาระงาน (ชิ้นงาน)</th>
          
          <th rowspan="2" style="width: 55px; background-color: #EAEAEA;">ผลสรุป<br>(ผ/มผ)</th>
        </tr>
        <tr>
          <!-- เวลาเรียน sub-headers -->
          <th style="width: 35px;">มา</th>
          <th style="width: 35px;">สาย</th>
          <th style="width: 35px;">ลา</th>
          <th style="width: 35px;">ขาด</th>
          <th style="width: 40px;">รวม</th>
          <th style="width: 48px;">% เวลา</th>
          <th style="width: 42px;">ผล</th>

          <!-- ภาระงาน sub-headers -->
          ${assignmentHeadersHtml}
          <th style="width: 50px;">รวมคะแนน</th>
          <th style="width: 48px;">% คะแนน</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signature-container" style="margin-top: 20px;">
      <div style="font-size: 10.5pt; color: #333; width: 52%; line-height: 1.6;">
        <strong>* เกณฑ์การตัดสินผลการประเมินกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม):</strong><br>
        ๑. มีเวลาเข้าร่วมกิจกรรมไม่น้อยกว่าร้อยละ ๘๐ ของเวลาเรียนทั้งหมด (เวลาเรียนผ่านเกณฑ์)<br>
        ๒. ปฏิบัติกิจกรรมและมีผลงาน/ภาระงานผ่านเกณฑ์การประเมินตามที่สถานศึกษากำหนด<br>
        ๓. ผู้ที่ผ่านเกณฑ์ครบทั้งสองข้อจะได้รับการตัดสินผลการประเมินเป็น <strong>"ผ" (ผ่าน)</strong><br>
        ๔. เอกสารนี้เป็นแบบรายงานผลการเรียนรู้ทางการเพื่อนำส่งงานทะเบียนและวัดผล
      </div>
      <div class="signature-block">
        <p>ผู้รายงาน / ครูที่ปรึกษาชุมนุม</p>
        <div class="signature-space"></div>
        <p>ลงชื่อ ..........................................................................</p>
        <p style="font-size: 12pt; margin-top: 4px;">( .......................................................................... )</p>
        <p style="font-size: 12pt; margin-top: 4px;">ตำแหน่ง ..........................................................................</p>
        <p style="font-size: 11pt; margin-top: 4px;">วันที่ ........ เดือน ................................. พ.ศ. ............</p>
      </div>
    </div>
  `;
}

