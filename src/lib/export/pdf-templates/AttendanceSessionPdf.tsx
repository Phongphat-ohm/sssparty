import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { registerThaiFonts } from "../fonts";

registerThaiFonts();

export interface AttendanceSessionPdfData {
  reportCode: string;
  isOfficial: boolean;
  qrDataUrl?: string | null;
  verifyUrl?: string | null;
  sessionTitle: string;
  sessionDateStr: string;
  academicTerm: string;
  clubName: string;
  targetClass: string;
  printDateStr: string;
  printedByName: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  students: Array<{
    studentNumber: number;
    studentCode: string;
    name: string;
    className: string;
    status: "PRESENT" | "LATE" | "LEAVE" | "ABSENT";
    checkedAtStr: string;
    checkInMethod: string;
    distanceStr: string;
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

  colNo: { width: "6%" },
  colCode: { width: "13%" },
  colName: { width: "28%" },
  colClass: { width: "13%" },
  colStatus: { width: "12%" },
  colTime: { width: "14%" },
  colMethod: { width: "14%" },

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
    lineHeight: 1.4,
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

export function AttendanceSessionPdf({ data }: { data: AttendanceSessionPdfData }) {
  registerThaiFonts();

  return (
    <Document title={`รายงานการเช็กชื่อ_${data.sessionTitle}`} author="SSSParty">
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header Section */}
        <View style={styles.topBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.clubTitle}>{data.clubName}</Text>
            <Text style={styles.docTitle}>
              แบบบันทึกเวลาเรียนและการเข้าร่วมกิจกรรม (Attendance Record Report)
            </Text>
            <Text style={styles.subMeta}>
              คาบเรียน: {data.sessionTitle} • วันที่ {data.sessionDateStr}
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

        {/* Info Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text>
              <Text style={styles.boldLabel}>คาบกิจกรรม: </Text>
              {data.sessionTitle}
            </Text>
            <Text>
              <Text style={styles.boldLabel}>วันที่จัดกิจกรรม: </Text>
              {data.sessionDateStr}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text>
              <Text style={styles.boldLabel}>ภาคเรียน: </Text>
              {data.academicTerm}
            </Text>
            <Text>
              <Text style={styles.boldLabel}>ห้องเรียน: </Text>
              {data.targetClass === "ALL" ? "ทุกระดับชั้น" : data.targetClass}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text>
              <Text style={styles.boldLabel}>สมาชิกทั้งหมด: </Text>
              {data.totalStudents} คน
            </Text>
            <Text>
              <Text style={styles.boldLabel}>มาเรียน/สาย: </Text>
              {data.presentCount + data.lateCount} คน (
              {data.totalStudents > 0
                ? (((data.presentCount + data.lateCount) / data.totalStudents) * 100).toFixed(1)
                : 0}
              %)
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNo, styles.cellCenter]}>ลำดับ</Text>
            <Text style={[styles.tableCell, styles.colCode, styles.cellCenter]}>รหัสนักเรียน</Text>
            <Text style={[styles.tableCell, styles.colName]}>ชื่อ - นามสกุล</Text>
            <Text style={[styles.tableCell, styles.colClass, styles.cellCenter]}>ชั้น/เลขที่</Text>
            <Text style={[styles.tableCell, styles.colStatus, styles.cellCenter]}>สถานะ</Text>
            <Text style={[styles.tableCell, styles.colTime, styles.cellCenter]}>เวลาที่เช็กชื่อ</Text>
            <Text style={[styles.tableCell, styles.colMethod, styles.cellCenter]}>วิธี/หมายเหตุ</Text>
          </View>

          {data.students.map((st, idx) => {
            let statusText = "ขาดเรียน";
            let statusColor = "#DC2626";
            if (st.status === "PRESENT") {
              statusText = "มาเรียน";
              statusColor = "#059669";
            } else if (st.status === "LATE") {
              statusText = "มาสาย";
              statusColor = "#D97706";
            } else if (st.status === "LEAVE") {
              statusText = "ลา";
              statusColor = "#2563EB";
            }

            return (
              <View key={st.studentCode} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCell, styles.colNo, styles.cellCenter]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, styles.colCode, styles.cellCenter]}>{st.studentCode}</Text>
                <Text style={[styles.tableCell, styles.colName]}>{st.name}</Text>
                <Text style={[styles.tableCell, styles.colClass, styles.cellCenter]}>
                  {st.className} / {st.studentNumber}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colStatus,
                    styles.cellCenter,
                    { color: statusColor, fontWeight: "bold" },
                  ]}
                >
                  {statusText}
                </Text>
                <Text style={[styles.tableCell, styles.colTime, styles.cellCenter]}>
                  {st.checkedAtStr || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colMethod, styles.cellCenter]}>
                  {st.checkInMethod || "-"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.statsBox}>
            <Text style={styles.boldLabel}>สรุปสถิติการเช็กชื่อในคาบนี้:</Text>
            <Text>• มาเรียน: {data.presentCount} คน | มาสาย: {data.lateCount} คน</Text>
            <Text>• ลา: {data.leaveCount} คน | ขาดเรียน: {data.absentCount} คน</Text>
            <Text>
              • อัตราการเข้าเรียนรวม:{" "}
              {data.totalStudents > 0
                ? (((data.presentCount + data.lateCount * 0.5) / data.totalStudents) * 100).toFixed(1)
                : 0}
              %
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>ขอรับรองว่าบันทึกเวลาเรียนข้างต้นถูกต้องตามความเป็นจริง</Text>
            <View style={styles.signatureLine} />
            <Text>(ลงชื่อ)...........................................................ครูผู้ควบคุมกิจกรรม</Text>
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
