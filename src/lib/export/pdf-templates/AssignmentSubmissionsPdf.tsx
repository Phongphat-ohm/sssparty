import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { registerThaiFonts } from "../comprehensive-evaluation-pdf";

export interface AssignmentSubmissionsPdfData {
  reportCode: string;
  isOfficial: boolean;
  qrDataUrl?: string | null;
  verifyUrl?: string | null;
  assignmentTitle: string;
  assignmentDescription?: string | null;
  maxScore: number;
  dueDateStr: string;
  submissionType: string;
  academicTerm: string;
  clubName: string;
  targetClass: string;
  printDateStr: string;
  printedByName: string;
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  passedCount: number;
  avgScore: number;
  maxAchievedScore: number;
  minAchievedScore: number;
  students: Array<{
    studentNumber: number;
    studentCode: string;
    name: string;
    className: string;
    submissionStatus: "SUBMITTED" | "LATE" | "DRAFT" | "NOT_SUBMITTED";
    submittedAtStr: string;
    score: number | null;
    passed: boolean;
  }>;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Sarabun",
    fontSize: 8,
    paddingTop: 20,
    paddingBottom: 24,
    paddingLeft: 22,
    paddingRight: 22,
    color: "#111111",
    backgroundColor: "#FFFFFF",
  },
  // Top Header Area
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
    paddingBottom: 6,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  clubTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#222222",
    marginBottom: 2,
  },
  subMeta: {
    fontSize: 8,
    color: "#444444",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaBox: {
    textAlign: "right",
    fontSize: 7.5,
    color: "#333333",
    lineHeight: 1.3,
  },
  reportCodeText: {
    fontWeight: "bold",
    color: "#000000",
    fontSize: 8,
  },
  draftBadge: {
    color: "#C2410C",
    fontWeight: "bold",
    fontSize: 8,
  },
  qrImage: {
    width: 44,
    height: 44,
    borderWidth: 0.5,
    borderColor: "#CCCCCC",
  },

  // Assignment Summary Card
  summaryCard: {
    backgroundColor: "#F9F9F9",
    borderWidth: 0.6,
    borderColor: "#DDDDDD",
    padding: 6,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCol: {
    flex: 1,
    fontSize: 7.5,
    lineHeight: 1.4,
  },
  boldLabel: {
    fontWeight: "bold",
    color: "#000000",
  },

  // Table
  table: {
    width: "100%",
    borderTopWidth: 0.8,
    borderTopColor: "#000000",
    borderLeftWidth: 0.8,
    borderLeftColor: "#000000",
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    minHeight: 14,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#F0F0F0",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 7.5,
  },
  tableCell: {
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    paddingVertical: 2,
    paddingHorizontal: 3,
    fontSize: 7.5,
  },
  cellCenter: {
    textAlign: "center",
  },
  cellRight: {
    textAlign: "right",
  },

  // Widths
  colNo: { width: "5%" },
  colCode: { width: "12%" },
  colName: { width: "26%" },
  colClass: { width: "12%" },
  colStatus: { width: "13%" },
  colSubmitDate: { width: "16%" },
  colScore: { width: "10%" },
  colResult: { width: "6%" },

  // Footer & Signature Area
  footerSection: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsBox: {
    width: "48%",
    borderWidth: 0.6,
    borderColor: "#DDDDDD",
    padding: 6,
    fontSize: 7.5,
    lineHeight: 1.3,
  },
  signatureBox: {
    width: "48%",
    textAlign: "center",
    fontSize: 8,
    lineHeight: 1.5,
    paddingTop: 4,
  },
  signatureLine: {
    marginTop: 22,
    borderBottomWidth: 0.8,
    borderBottomColor: "#000000",
    width: "70%",
    alignSelf: "center",
    marginBottom: 4,
  },
  pageNumber: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7,
    color: "#666666",
  },
});

export function AssignmentSubmissionsPdf({ data }: { data: AssignmentSubmissionsPdfData }) {
  registerThaiFonts();

  return (
    <Document title={`รายงานผลการส่งงาน_${data.assignmentTitle}`} author="SSSParty">
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header Section */}
        <View style={styles.topBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.clubTitle}>{data.clubName}</Text>
            <Text style={styles.docTitle}>
              แบบบันทึกผลการส่งงานและการประเมินคะแนน (Assignment Submissions Report)
            </Text>
            <Text style={styles.subMeta}>
              ภาระงาน: {data.assignmentTitle} • ภาคเรียนที่ {data.academicTerm}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.metaBox}>
              <Text>
                รหัสเอกสาร:{" "}
                {data.isOfficial ? (
                  <Text style={styles.reportCodeText}>{data.reportCode}</Text>
                ) : (
                  <Text style={styles.draftBadge}>ตัวอย่างก่อนบันทึก (PREVIEW)</Text>
                )}
              </Text>
              <Text>วันที่จัดพิมพ์: {data.printDateStr}</Text>
              <Text>ผู้พิมพ์: {data.printedByName}</Text>
            </View>

            {data.qrDataUrl && (
              <Image src={data.qrDataUrl} style={styles.qrImage} />
            )}
          </View>
        </View>

        {/* Assignment Information Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text>
              <Text style={styles.boldLabel}>ภาระงาน: </Text>
              {data.assignmentTitle}
            </Text>
            <Text>
              <Text style={styles.boldLabel}>รูปแบบการส่ง: </Text>
              {data.submissionType === "FILE"
                ? "แนบไฟล์ผลงาน"
                : data.submissionType === "LINK"
                ? "ส่งลิงก์ชิ้นงาน"
                : "ตอบคำถาม"}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text>
              <Text style={styles.boldLabel}>กำหนดส่ง: </Text>
              {data.dueDateStr}
            </Text>
            <Text>
              <Text style={styles.boldLabel}>ชั้นเรียนเป้าหมาย: </Text>
              {data.targetClass === "ALL" ? "ทุกระดับชั้น" : data.targetClass}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text>
              <Text style={styles.boldLabel}>คะแนนเต็ม: </Text>
              {data.maxScore} คะแนน
            </Text>
            <Text>
              <Text style={styles.boldLabel}>เกณฑ์ผ่าน: </Text>&ge; 50% ({data.maxScore * 0.5} คะแนน)
            </Text>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNo, styles.cellCenter]}>ลำดับ</Text>
            <Text style={[styles.tableCell, styles.colCode, styles.cellCenter]}>รหัสนักเรียน</Text>
            <Text style={[styles.tableCell, styles.colName]}>ชื่อ - นามสกุล</Text>
            <Text style={[styles.tableCell, styles.colClass, styles.cellCenter]}>ชั้น/เลขที่</Text>
            <Text style={[styles.tableCell, styles.colStatus, styles.cellCenter]}>สถานะส่งงาน</Text>
            <Text style={[styles.tableCell, styles.colSubmitDate, styles.cellCenter]}>วันเวลาที่ส่งงาน</Text>
            <Text style={[styles.tableCell, styles.colScore, styles.cellCenter]}>คะแนนที่ได้</Text>
            <Text style={[styles.tableCell, styles.colResult, styles.cellCenter]}>ผล</Text>
          </View>

          {/* Table Rows */}
          {data.students.map((st, idx) => {
            let statusText = "ยังไม่ส่ง";
            if (st.submissionStatus === "SUBMITTED") statusText = "ส่งตรงเวลา";
            else if (st.submissionStatus === "LATE") statusText = "ส่งช้ากว่ากำหนด";
            else if (st.submissionStatus === "DRAFT") statusText = "แบบร่าง";

            return (
              <View key={st.studentCode} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCell, styles.colNo, styles.cellCenter]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, styles.colCode, styles.cellCenter]}>{st.studentCode}</Text>
                <Text style={[styles.tableCell, styles.colName]}>{st.name}</Text>
                <Text style={[styles.tableCell, styles.colClass, styles.cellCenter]}>
                  {st.className} / {st.studentNumber}
                </Text>
                <Text style={[styles.tableCell, styles.colStatus, styles.cellCenter]}>{statusText}</Text>
                <Text style={[styles.tableCell, styles.colSubmitDate, styles.cellCenter]}>
                  {st.submittedAtStr || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colScore, styles.cellRight]}>
                  {st.score !== null ? `${st.score} / ${data.maxScore}` : "-"}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colResult,
                    styles.cellCenter,
                    { color: st.passed ? "#059669" : "#DC2626", fontWeight: "bold" },
                  ]}
                >
                  {st.passed ? "ผ" : "มผ"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer & Statistics & Signature */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.statsBox}>
            <Text style={styles.boldLabel}>สรุปสถิติภาพรวมการส่งงาน:</Text>
            <Text>
              • นักเรียนทั้งหมด: {data.totalStudents} คน | ส่งงานแล้ว: {data.submittedCount} คน (
              {data.totalStudents > 0
                ? ((data.submittedCount / data.totalStudents) * 100).toFixed(1)
                : 0}
              %)
            </Text>
            <Text>
              • ตรวจและให้คะแนนแล้ว: {data.gradedCount} คน | ผ่านเกณฑ์: {data.passedCount} คน (
              {data.totalStudents > 0
                ? ((data.passedCount / data.totalStudents) * 100).toFixed(1)
                : 0}
              %)
            </Text>
            <Text>
              • คะแนนเฉลี่ย: {data.avgScore} | สูงสุด: {data.maxAchievedScore} | ต่ำสุด:{" "}
              {data.minAchievedScore} (จากเต็ม {data.maxScore})
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>ขอรับรองว่าข้อมูลการประเมินข้างต้นถูกต้องและเป็นจริงทุกประการ</Text>
            <View style={styles.signatureLine} />
            <Text>(ลงชื่อ)...........................................................ครูผู้สอน/ผู้ตรวจประเมิน</Text>
            <Text>วันที่ {data.printDateStr}</Text>
          </View>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `หน้า ${pageNumber} จาก ${totalPages} • เอกสารสารระบบชุมนุมสื่อสร้างสรรค์ (3S Party)`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
