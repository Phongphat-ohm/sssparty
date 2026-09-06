import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import { ComprehensiveEvaluationReportData } from "@/actions/reports";

// ลงทะเบียนฟอนต์ Sarabun เพื่อรองรับภาษาไทยคมชัด ถูกต้องตามแบบฟอร์มเอกสารทางการ
let fontRegistered = false;
export function registerThaiFonts() {
  if (fontRegistered) return;
  try {
    const regularFontPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf");
    const boldFontPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Bold.ttf");

    Font.register({
      family: "Sarabun",
      fonts: [
        { src: regularFontPath, fontWeight: "normal" },
        { src: boldFontPath, fontWeight: "bold" },
      ],
    });
    fontRegistered = true;
  } catch (err) {
    console.warn("Font registration notice:", err);
  }
}

// กำหนด Stylesheet สำหรับเอกสารทางการ A4 แนวนอน (Landscape)
const styles = StyleSheet.create({
  page: {
    fontFamily: "Sarabun",
    fontSize: 7.5,
    paddingTop: 18,
    paddingBottom: 22,
    paddingLeft: 18,
    paddingRight: 18,
    color: "#111111",
    backgroundColor: "#FFFFFF",
  },
  // Header Section
  headerContainer: {
    marginBottom: 8,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#000000",
  },
  headerSubTitle: {
    fontSize: 8.5,
    color: "#333333",
    marginBottom: 4,
  },
  metaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#444444",
    borderBottomStyle: "solid",
    paddingBottom: 4,
    marginBottom: 6,
    fontSize: 8,
  },
  metaItem: {
    flexDirection: "row",
  },
  metaLabel: {
    fontWeight: "bold",
    color: "#222222",
  },
  metaValue: {
    color: "#000000",
  },

  // Table Structure
  table: {
    width: "100%",
    borderTopWidth: 0.8,
    borderTopColor: "#000000",
    borderLeftWidth: 0.8,
    borderLeftColor: "#000000",
    marginBottom: 8,
  },
  tableHeaderRowTop: {
    flexDirection: "row",
    backgroundColor: "#EEEEEE",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  tableHeaderRowBottom: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 0.8,
    borderBottomColor: "#000000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    minHeight: 14,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  thCell: {
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    paddingVertical: 2,
    paddingHorizontal: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  thText: {
    fontSize: 6.5,
    fontWeight: "bold",
    textAlign: "center",
    color: "#000000",
  },
  tdCell: {
    borderRightWidth: 0.5,
    borderRightColor: "#CCCCCC",
    paddingVertical: 2,
    paddingHorizontal: 1.5,
    justifyContent: "center",
  },
  tdText: {
    fontSize: 7,
    textAlign: "center",
    color: "#000000",
  },
  tdTextLeft: {
    fontSize: 7,
    textAlign: "left",
    paddingLeft: 3,
    color: "#000000",
  },
  badgePass: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
  },
  badgeFail: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
  },

  // Summary and Stats Box
  summarySection: {
    marginTop: 6,
    marginBottom: 10,
    padding: 6,
    backgroundColor: "#FAFAFA",
    borderWidth: 0.8,
    borderColor: "#000000",
    borderRadius: 2,
  },
  summaryTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#000000",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryBoxItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 7,
    color: "#666666",
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#111111",
  },
  criteriaNote: {
    marginTop: 3,
    fontSize: 6.5,
    color: "#777777",
  },

  // Signature Section
  signatureContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  signatureBox: {
    width: "30%",
    textAlign: "center",
    alignItems: "center",
  },
  signatureLine: {
    fontSize: 7.5,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 7.5,
    fontWeight: "bold",
    marginBottom: 2,
  },
  signatureRole: {
    fontSize: 7,
    color: "#444444",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 10,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#888888",
    borderTopWidth: 0.5,
    borderTopColor: "#DDDDDD",
    paddingTop: 3,
  },
});

interface Props {
  data: ComprehensiveEvaluationReportData;
}

export const ComprehensiveEvaluationPdfDocument: React.FC<Props> = ({ data }) => {
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

  // คำนวณความกว้างคอลัมน์ (% ของความกว้างตาราง)
  // ส่วนข้อมูลนักเรียน (5 คอลัมน์) = ~28%
  const colNo = "2.8%";
  const colCode = "6.2%";
  const colName = "15.0%";
  const colClass = "4.0%";
  const colNumber = "2.8%";

  // ส่วนเวลาเรียน (7 คอลัมน์) = ~21%
  const colPres = "2.8%";
  const colLate = "2.8%";
  const colLeave = "2.8%";
  const colAbs = "2.8%";
  const colTotAtt = "3.2%";
  const colPctAtt = "3.6%";
  const colAttPass = "3.2%";

  // ส่วนสรุปผลการประเมิน (ผ/มผ) = 4.0%
  const colFinal = "4.0%";

  // ส่วนคะแนนงาน (Assignments + Total + %) = 100% - (28% + 21% + 4%) = 47%
  const colTotalScore = "4.5%";
  const colPctScore = "4.0%";
  const assignmentsRemainingWidth = 47 - 4.5 - 4.0; // 38.5%
  const numAssignments = assignments.length > 0 ? assignments.length : 1;
  const colAssignmentWidth = `${(assignmentsRemainingWidth / numAssignments).toFixed(2)}%`;

  const targetGroupText =
    className === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ชั้นมัธยมศึกษาปีที่ ${className}`;

  const thaiDateStr = new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const passPercent =
    totalStudents > 0
      ? Number(((stats.passedCount / totalStudents) * 100).toFixed(1))
      : 0;
  const failPercent =
    totalStudents > 0
      ? Number(((stats.failedCount / totalStudents) * 100).toFixed(1))
      : 0;

  return (
    <Document title={`รายงานผลการเรียนรู้_${clubName}_${academicTerm.replace("/", "-")}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header (Fixed on each page) */}
        <View style={styles.headerContainer} fixed>
          <Text style={styles.headerTitle}>
            แบบรายงานสรุปผลการเรียนรู้และการเข้าร่วมกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)
          </Text>
          <Text style={styles.headerSubTitle}>
            หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง ๒๕๖๐) สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
          </Text>

          <View style={styles.metaBar}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>กิจกรรมชุมนุม: </Text>
              <Text style={styles.metaValue}>{clubName}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>ภาคเรียนที่: </Text>
              <Text style={styles.metaValue}>{academicTerm}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>กลุ่มเป้าหมาย: </Text>
              <Text style={styles.metaValue}>{targetGroupText}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>วันที่จัดพิมพ์: </Text>
              <Text style={styles.metaValue}>{thaiDateStr}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header Level 1 (Fixed across page breaks) */}
          <View style={styles.tableHeaderRowTop} fixed>
            {/* 1. Student Info Group */}
            <View style={[styles.thCell, { width: "30.8%" }]}>
              <Text style={styles.thText}>ข้อมูลนักเรียน</Text>
            </View>
            {/* 2. Attendance Group */}
            <View style={[styles.thCell, { width: "21.2%" }]}>
              <Text style={styles.thText}>
                การประเมินเวลาเรียน (รวม {totalSessions} คาบ - เกณฑ์ 80%)
              </Text>
            </View>
            {/* 3. Assignment & Score Group */}
            <View style={[styles.thCell, { width: `${(assignmentsRemainingWidth + 8.5).toFixed(2)}%` }]}>
              <Text style={styles.thText}>
                การประเมินภาระงานและคะแนนเก็บ (คะแนนเต็มรวม {totalMaxPossibleScore} คะแนน)
              </Text>
            </View>
            {/* 4. Final Evaluation */}
            <View style={[styles.thCell, { width: colFinal }]}>
              <Text style={styles.thText}>ผลสรุป</Text>
            </View>
          </View>

          {/* Table Header Level 2 (Fixed across page breaks) */}
          <View style={styles.tableHeaderRowBottom} fixed>
            {/* Student Info */}
            <View style={[styles.thCell, { width: colNo }]}>
              <Text style={styles.thText}>ที่</Text>
            </View>
            <View style={[styles.thCell, { width: colCode }]}>
              <Text style={styles.thText}>รหัส</Text>
            </View>
            <View style={[styles.thCell, { width: colName }]}>
              <Text style={styles.thText}>ชื่อ - นามสกุล</Text>
            </View>
            <View style={[styles.thCell, { width: colClass }]}>
              <Text style={styles.thText}>ห้อง</Text>
            </View>
            <View style={[styles.thCell, { width: colNumber }]}>
              <Text style={styles.thText}>เลขที่</Text>
            </View>

            {/* Attendance */}
            <View style={[styles.thCell, { width: colPres }]}>
              <Text style={styles.thText}>มา</Text>
            </View>
            <View style={[styles.thCell, { width: colLate }]}>
              <Text style={styles.thText}>สาย</Text>
            </View>
            <View style={[styles.thCell, { width: colLeave }]}>
              <Text style={styles.thText}>ลา</Text>
            </View>
            <View style={[styles.thCell, { width: colAbs }]}>
              <Text style={styles.thText}>ขาด</Text>
            </View>
            <View style={[styles.thCell, { width: colTotAtt }]}>
              <Text style={styles.thText}>รวม</Text>
            </View>
            <View style={[styles.thCell, { width: colPctAtt }]}>
              <Text style={styles.thText}>%เวลา</Text>
            </View>
            <View style={[styles.thCell, { width: colAttPass }]}>
              <Text style={styles.thText}>ผลเวลา</Text>
            </View>

            {/* Assignments */}
            {assignments.length > 0 ? (
              assignments.map((a, idx) => (
                <View key={a.id} style={[styles.thCell, { width: colAssignmentWidth }]}>
                  <Text style={styles.thText}>
                    งาน {idx + 1}
                  </Text>
                  <Text style={[styles.thText, { fontSize: 5.5, color: "#555555" }]}>
                    ({a.maxScore}ค.)
                  </Text>
                </View>
              ))
            ) : (
              <View style={[styles.thCell, { width: `${assignmentsRemainingWidth}%` }]}>
                <Text style={styles.thText}>ไม่มีภาระงาน</Text>
              </View>
            )}
            <View style={[styles.thCell, { width: colTotalScore }]}>
              <Text style={styles.thText}>รวมคะแนน</Text>
            </View>
            <View style={[styles.thCell, { width: colPctScore }]}>
              <Text style={styles.thText}>%คะแนน</Text>
            </View>

            {/* Final */}
            <View style={[styles.thCell, { width: colFinal }]}>
              <Text style={styles.thText}>ผ / มผ</Text>
            </View>
          </View>

          {/* Student Rows */}
          {students.map((st, index) => {
            const isAlt = index % 2 === 1;
            return (
              <View
                key={st.studentCode || index}
                style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
                wrap={false}
              >
                {/* Student Info */}
                <View style={[styles.tdCell, { width: colNo }]}>
                  <Text style={styles.tdText}>{index + 1}</Text>
                </View>
                <View style={[styles.tdCell, { width: colCode }]}>
                  <Text style={styles.tdText}>{st.studentCode}</Text>
                </View>
                <View style={[styles.tdCell, { width: colName }]}>
                  <Text style={styles.tdTextLeft}>
                    {st.name}
                  </Text>
                </View>
                <View style={[styles.tdCell, { width: colClass }]}>
                  <Text style={styles.tdText}>{st.className}</Text>
                </View>
                <View style={[styles.tdCell, { width: colNumber }]}>
                  <Text style={styles.tdText}>{st.studentNumber || "-"}</Text>
                </View>

                {/* Attendance */}
                <View style={[styles.tdCell, { width: colPres }]}>
                  <Text style={styles.tdText}>{st.present}</Text>
                </View>
                <View style={[styles.tdCell, { width: colLate }]}>
                  <Text style={styles.tdText}>{st.late}</Text>
                </View>
                <View style={[styles.tdCell, { width: colLeave }]}>
                  <Text style={styles.tdText}>{st.leave}</Text>
                </View>
                <View style={[styles.tdCell, { width: colAbs }]}>
                  <Text style={styles.tdText}>{st.absent}</Text>
                </View>
                <View style={[styles.tdCell, { width: colTotAtt }]}>
                  <Text style={[styles.tdText, { fontWeight: "bold" }]}>
                    {st.effectivePresent}
                  </Text>
                </View>
                <View style={[styles.tdCell, { width: colPctAtt }]}>
                  <Text style={styles.tdText}>{st.attendancePercentage}%</Text>
                </View>
                <View style={[styles.tdCell, { width: colAttPass }]}>
                  <Text style={st.attendancePassed ? styles.badgePass : styles.badgeFail}>
                    {st.attendancePassed ? "ผ่าน" : "มส."}
                  </Text>
                </View>

                {/* Assignments */}
                {assignments.length > 0 ? (
                  assignments.map((a) => {
                    const score = st.scores[a.id];
                    return (
                      <View key={a.id} style={[styles.tdCell, { width: colAssignmentWidth }]}>
                        <Text style={styles.tdText}>
                          {score !== null && score !== undefined ? score : "-"}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={[styles.tdCell, { width: `${assignmentsRemainingWidth}%` }]}>
                    <Text style={styles.tdText}>-</Text>
                  </View>
                )}
                <View style={[styles.tdCell, { width: colTotalScore }]}>
                  <Text style={[styles.tdText, { fontWeight: "bold" }]}>
                    {st.totalScore}
                  </Text>
                </View>
                <View style={[styles.tdCell, { width: colPctScore }]}>
                  <Text style={styles.tdText}>{st.scorePercentage}%</Text>
                </View>

                {/* Final Grade */}
                <View style={[styles.tdCell, { width: colFinal }]}>
                  <Text style={st.finalGrade === "ผ" ? styles.badgePass : styles.badgeFail}>
                    {st.finalGrade}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Summary Statistics & Signature Block (Kept together) */}
        <View wrap={false}>
          {/* Summary Box */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>สรุปผลการประเมินและสถิติภาพรวม</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryBoxItem}>
                <Text style={styles.summaryLabel}>จำนวนนักเรียนทั้งหมด</Text>
                <Text style={styles.summaryValue}>{totalStudents} คน</Text>
              </View>
              <View style={styles.summaryBoxItem}>
                <Text style={styles.summaryLabel}>ผ่านเกณฑ์การประเมิน (ผ)</Text>
                <Text style={styles.summaryValue}>
                  {stats.passedCount} คน ({passPercent}%)
                </Text>
              </View>
              <View style={styles.summaryBoxItem}>
                <Text style={styles.summaryLabel}>ไม่ผ่านเกณฑ์การประเมิน (มผ)</Text>
                <Text style={styles.summaryValue}>
                  {stats.failedCount} คน ({failPercent}%)
                </Text>
              </View>
              <View style={styles.summaryBoxItem}>
                <Text style={styles.summaryLabel}>เวลาเรียนเฉลี่ย</Text>
                <Text style={styles.summaryValue}>{stats.avgAttendancePercentage}%</Text>
              </View>
              <View style={styles.summaryBoxItem}>
                <Text style={styles.summaryLabel}>คะแนนเฉลี่ย</Text>
                <Text style={styles.summaryValue}>
                  {stats.avgTotalScore} / {totalMaxPossibleScore} ({stats.avgScorePercentage}%)
                </Text>
              </View>
            </View>
            <Text style={styles.criteriaNote}>
              * หมายเหตุเกณฑ์การตัดสิน: 1. มีเวลาเรียนไม่น้อยกว่าร้อยละ 80 ของเวลาเรียนทั้งหมด (อย่างน้อย{" "}
              {Math.ceil(totalSessions * 0.8)} คาบจาก {totalSessions} คาบ) | 2. มีผลงานและการประเมินผ่านเกณฑ์ร้อยละ 50
            </Text>
          </View>

          {/* Signature Section */}
          <View style={styles.signatureContainer}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>ลงชื่อ............................................................</Text>
              <Text style={styles.signatureName}>(............................................................)</Text>
              <Text style={styles.signatureRole}>ครูผู้สอน / ครูที่ปรึกษากิจกรรมชุมนุม</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>ลงชื่อ............................................................</Text>
              <Text style={styles.signatureName}>(............................................................)</Text>
              <Text style={styles.signatureRole}>หัวหน้างานกิจกรรมพัฒนาผู้เรียน</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>ลงชื่อ............................................................</Text>
              <Text style={styles.signatureName}>(............................................................)</Text>
              <Text style={styles.signatureRole}>ผู้อำนวยการสถานศึกษา / รองฯ ฝ่ายวิชาการ</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ระบบบริหารจัดการกิจกรรมชุมนุม (3S Party Media Club) — เอกสารทางการ</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `หน้าที่ ${pageNumber} จาก ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

/**
 * ฟังก์ชันสร้าง PDF Buffer จาก ComprehensiveEvaluationReportData โดยใช้ @react-pdf/renderer
 */
export async function renderComprehensiveEvaluationPdfBuffer(
  data: ComprehensiveEvaluationReportData
): Promise<Buffer> {
  registerThaiFonts();
  const doc = <ComprehensiveEvaluationPdfDocument data={data} />;
  return await renderToBuffer(doc);
}
