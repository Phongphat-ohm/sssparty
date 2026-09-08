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

export interface AttendanceSummaryPdfData {
  reportCode: string;
  isOfficial: boolean;
  qrDataUrl?: string | null;
  verifyUrl?: string | null;
  clubName: string;
  academicTerm: string;
  targetClass: string;
  printDateStr: string;
  printedByName: string;
  totalSessions: number;
  totalStudents: number;
  passedCount: number;
  failedCount: number;
  avgPercentage: number;
  sessions: Array<{
    id: string;
    title: string;
    date: string;
  }>;
  students: Array<{
    studentNumber: number;
    studentCode: string;
    name: string;
    className: string;
    present: number;
    late: number;
    leave: number;
    absent: number;
    percentage: number;
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
    fontSize: 13,
    fontWeight: "bold",
    color: "#111111",
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 2,
  },
  subMeta: {
    fontSize: 7.5,
    color: "#555555",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaBox: {
    alignItems: "flex-end",
  },
  reportCodeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#111111",
  },
  dateText: {
    fontSize: 7,
    color: "#666666",
    marginTop: 1,
  },
  qrImage: {
    width: 44,
    height: 44,
    borderWidth: 0.5,
    borderColor: "#CCCCCC",
  },

  // Stats Bar
  statsContainer: {
    flexDirection: "row",
    borderWidth: 0.8,
    borderColor: "#333333",
    backgroundColor: "#F9F9F9",
    marginBottom: 10,
    padding: 6,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#DDDDDD",
  },
  statItemLast: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#111111",
  },
  statLabel: {
    fontSize: 6.5,
    color: "#555555",
    marginTop: 1,
  },

  // Table
  table: {
    width: "100%",
    borderWidth: 0.8,
    borderColor: "#333333",
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#EEEEEE",
    borderBottomWidth: 0.8,
    borderBottomColor: "#333333",
    minHeight: 18,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    minHeight: 14,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  th: {
    fontWeight: "bold",
    fontSize: 7,
    color: "#111111",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#DDDDDD",
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  td: {
    fontSize: 7,
    color: "#222222",
    borderRightWidth: 0.5,
    borderRightColor: "#E0E0E0",
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  tdCenter: {
    textAlign: "center",
  },
  tdRight: {
    textAlign: "right",
  },

  // Col widths
  colNo: { width: "5%" },
  colCode: { width: "12%" },
  colName: { width: "27%" },
  colClass: { width: "8%" },
  colPresent: { width: "7%" },
  colLate: { width: "7%" },
  colLeave: { width: "7%" },
  colAbsent: { width: "7%" },
  colTotal: { width: "8%" },
  colPct: { width: "10%" },
  colPass: { width: "8%", borderRightWidth: 0 },

  // Status badges
  passBadge: {
    fontWeight: "bold",
    color: "#15803d",
  },
  failBadge: {
    fontWeight: "bold",
    color: "#b91c1c",
  },

  // Signature area
  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    marginBottom: 4,
    paddingTop: 6,
  },
  signBox: {
    alignItems: "center",
    width: "42%",
  },
  signLine: {
    width: "75%",
    borderBottomWidth: 0.8,
    borderBottomColor: "#333333",
    marginBottom: 4,
    height: 24,
  },
  signName: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#222222",
  },
  signRole: {
    fontSize: 6.5,
    color: "#555555",
    marginTop: 1,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#CCCCCC",
    paddingTop: 3,
    fontSize: 6.5,
    color: "#777777",
  },
});

export function AttendanceSummaryPdf({ data }: { data: AttendanceSummaryPdfData }) {
  registerThaiFonts();

  return (
    <Document
      title={`รายงานสรุปเวลาเรียน_${data.academicTerm.replace("/", "-")}_${data.targetClass}`}
      author="SSSParty"
    >
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.clubTitle}>{data.clubName}</Text>
            <Text style={styles.docTitle}>
              แบบรายงานสรุปเวลาเรียนกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)
            </Text>
            <Text style={styles.subMeta}>
              ภาคเรียนที่ {data.academicTerm} • กลุ่มเป้าหมาย:{" "}
              {data.targetClass === "ALL" ? "นักเรียนทั้งหมดในชุมนุม" : `ห้อง ${data.targetClass}`} •
              เกณฑ์การผ่านเวลาเรียน: ร้อยละ 80 (≥ 80%)
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.metaBox}>
              <Text style={styles.reportCodeText}>
                {data.isOfficial ? data.reportCode : "เอกสารฉบับร่าง (PREVIEW)"}
              </Text>
              <Text style={styles.dateText}>วันที่พิมพ์: {data.printDateStr}</Text>
              <Text style={styles.dateText}>ผู้พิมพ์: {data.printedByName}</Text>
            </View>
            {data.isOfficial && data.qrDataUrl && (
              <Image src={data.qrDataUrl} style={styles.qrImage} />
            )}
          </View>
        </View>

        {/* Stats Summary Bar */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.totalSessions}</Text>
            <Text style={styles.statLabel}>คาบกิจกรรมทั้งหมด</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.totalStudents}</Text>
            <Text style={styles.statLabel}>จำนวนนักเรียน</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.passedCount}</Text>
            <Text style={styles.statLabel}>ผ่านเกณฑ์เวลาเรียน</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.failedCount}</Text>
            <Text style={styles.statLabel}>ไม่ผ่านเกณฑ์เวลาเรียน</Text>
          </View>
          <View style={styles.statItemLast}>
            <Text style={styles.statValue}>{data.avgPercentage}%</Text>
            <Text style={styles.statLabel}>เวลาเรียนเฉลี่ย</Text>
          </View>
        </View>

        {/* Attendance Summary Table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colNo]}>ที่</Text>
            <Text style={[styles.th, styles.colCode]}>รหัสนักเรียน</Text>
            <Text style={[styles.th, styles.colName]}>ชื่อ - สกุล</Text>
            <Text style={[styles.th, styles.colClass]}>ห้อง</Text>
            <Text style={[styles.th, styles.colPresent]}>มา (วัน)</Text>
            <Text style={[styles.th, styles.colLate]}>สาย</Text>
            <Text style={[styles.th, styles.colLeave]}>ลา</Text>
            <Text style={[styles.th, styles.colAbsent]}>ขาด</Text>
            <Text style={[styles.th, styles.colTotal]}>รวมนับ</Text>
            <Text style={[styles.th, styles.colPct]}>ร้อยละ (%)</Text>
            <Text style={[styles.th, styles.colPass]}>ผลประเมิน</Text>
          </View>

          {data.students.map((st, idx) => {
            const isAlt = idx % 2 === 1;
            const effectiveTotal = (st.present + st.late * 0.5).toFixed(1);

            return (
              <View
                key={st.studentCode}
                style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[styles.td, styles.colNo, styles.tdCenter]}>{idx + 1}</Text>
                <Text style={[styles.td, styles.colCode, styles.tdCenter]}>
                  {st.studentCode}
                </Text>
                <Text style={[styles.td, styles.colName]}>{st.name}</Text>
                <Text style={[styles.td, styles.colClass, styles.tdCenter]}>
                  {st.className}
                </Text>
                <Text style={[styles.td, styles.colPresent, styles.tdCenter]}>
                  {st.present}
                </Text>
                <Text style={[styles.td, styles.colLate, styles.tdCenter]}>{st.late}</Text>
                <Text style={[styles.td, styles.colLeave, styles.tdCenter]}>
                  {st.leave}
                </Text>
                <Text style={[styles.td, styles.colAbsent, styles.tdCenter]}>
                  {st.absent}
                </Text>
                <Text style={[styles.td, styles.colTotal, styles.tdCenter]}>
                  {effectiveTotal}
                </Text>
                <Text style={[styles.td, styles.colPct, styles.tdCenter]}>
                  {st.percentage.toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.colPass,
                    styles.tdCenter,
                    st.passed ? styles.passBadge : styles.failBadge,
                  ]}
                >
                  {st.passed ? "ผ่าน" : "ไม่ผ่าน"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Signatures */}
        <View style={styles.signatureArea} wrap={false}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signName}>( {data.printedByName} )</Text>
            <Text style={styles.signRole}>ครูที่ปรึกษากิจกรรมชุมนุม</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signName}>( .................................................... )</Text>
            <Text style={styles.signRole}>หัวหน้างานกิจกรรมพัฒนาผู้เรียน</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            ระบบบริหารจัดการชุมนุม (SSSParty) • รายงานสรุปเวลาเรียนสะสมตลอดภาคเรียน
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `หน้าที่ ${pageNumber} จาก ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
