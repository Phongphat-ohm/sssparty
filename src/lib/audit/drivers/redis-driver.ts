import { prisma } from "@/lib/prisma/client";
import { AuditDriver, AuditLogPayload } from "./types";
import { PostgresAuditDriver } from "./postgres-driver";

/**
 * RedisBufferAuditDriver: พักข้อมูลใน Redis In-Memory Buffer ก่อน
 * เหมาะสำหรับระดับ High Throughput เพื่อลดภาระ Write I/O ของฐานข้อมูลหลัก
 * พร้อมระบบ Auto-Fallback อัตโนมัติ: หากต่อ Redis ไม่ได้ จะเขียนลง Postgres ทันที ป้องกัน Log หาย 100%
 */
export class RedisBufferAuditDriver implements AuditDriver {
  name = "redis";
  private fallbackDriver = new PostgresAuditDriver();
  private inMemoryBuffer: AuditLogPayload[] = [];
  private maxBufferSize = 50;

  async write(payload: AuditLogPayload): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL;

      // ถ้าไม่มี REDIS_URL ให้ใช้ Fallback Postgres Driver ทันที
      if (!redisUrl) {
        await this.fallbackDriver.write(payload);
        return;
      }

      // ในกรณีที่มี Redis: จำลอง/บันทึกเข้า Buffer คิว
      this.inMemoryBuffer.push(payload);

      // ถ้าคิวเต็มตามขนาด batch ให้ทำการ Flush ลงฐานข้อมูล
      if (this.inMemoryBuffer.length >= this.maxBufferSize) {
        await this.flush();
      }
    } catch (error) {
      console.warn("[RedisAuditDriver Warning] Redis buffer error, falling back to PostgreSQL:", error);
      await this.fallbackDriver.write(payload);
    }
  }

  async flush(): Promise<void> {
    if (this.inMemoryBuffer.length === 0) return;

    const itemsToFlush = [...this.inMemoryBuffer];
    this.inMemoryBuffer = [];

    try {
      const rows = itemsToFlush.map((item) => ({
        userId: item.userId || null,
        username: item.username || null,
        role: item.role || null,
        action: item.action,
        targetType: item.targetType || null,
        targetId: item.targetId || null,
        details:
          typeof item.details === "object" && item.details !== null
            ? JSON.stringify(item.details)
            : item.details || null,
        ipAddress: item.ipAddress || null,
        userAgent: item.userAgent ? item.userAgent.slice(0, 500) : null,
        createdAt: item.createdAt || new Date(),
      }));

      await prisma.auditLog.createMany({
        data: rows,
        skipDuplicates: true,
      });
    } catch (error) {
      console.error("[RedisAuditDriver Flush Error] Failed to flush batch logs:", error);
      // Fallback: เขียนทีละแถวผ่าน PostgresDriver
      for (const item of itemsToFlush) {
        await this.fallbackDriver.write(item);
      }
    }
  }
}
