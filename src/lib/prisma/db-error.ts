import { Prisma } from "@/generated/prisma/client";

export interface DbErrorResult {
  success: false;
  message: string;
  code?: string;
  statusCode: number;
}

/**
 * แปลงข้อผิดพลาดจาก Prisma ORM และ Database เป็นข้อความที่เข้าใจง่าย ปลอดภัย และไม่เปิดเผยโครงสร้างระบบ
 */
export function handleDbError(error: unknown): DbErrorResult {
  console.error("[Database Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(", ")
          : typeof error.meta?.target === "string"
          ? error.meta.target
          : "ข้อมูล";
        return {
          success: false,
          message: `ข้อมูลนี้มีอยู่ในระบบแล้ว ไม่สามารถบันทึกซ้ำได้ (${target})`,
          code: error.code,
          statusCode: 409,
        };
      }
      case "P2025": {
        return {
          success: false,
          message: "ไม่พบข้อมูลที่ระบุ หรือข้อมูลอาจถูกลบไปแล้ว",
          code: error.code,
          statusCode: 404,
        };
      }
      case "P2003": {
        return {
          success: false,
          message: "ข้อมูลที่อ้างอิงไม่ถูกต้อง หรือมีความสัมพันธ์กับข้อมูลอื่นที่ไม่อนุญาตให้ดำเนินการ",
          code: error.code,
          statusCode: 400,
        };
      }
      case "P2028": {
        return {
          success: false,
          message: "การทำรายการใช้เวลานานเกินกำหนด กรุณาลองใหม่อีกครั้ง",
          code: error.code,
          statusCode: 408,
        };
      }
      default: {
        return {
          success: false,
          message: `เกิดข้อผิดพลาดจากระบบฐานข้อมูล (รหัส: ${error.code})`,
          code: error.code,
          statusCode: 500,
        };
      }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      success: false,
      message: "ข้อมูลที่ส่งเข้ามาไม่ตรงตามรูปแบบหรือเงื่อนไขที่กำหนด",
      code: "VALIDATION_ERROR",
      statusCode: 400,
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      success: false,
      message: "ไม่สามารถเชื่อมต่อไปยังฐานข้อมูลได้ กรุณาลองใหม่อีกครั้งในภายหลัง",
      code: "INIT_ERROR",
      statusCode: 503,
    };
  }

  if (error instanceof Error) {
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
      return {
        success: false,
        message: "การเชื่อมต่อฐานข้อมูลขัดข้อง กรุณาตรวจสอบการเชื่อมต่อเครือข่าย",
        code: "NETWORK_ERROR",
        statusCode: 503,
      };
    }

    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูล",
      statusCode: 500,
    };
  }

  return {
    success: false,
    message: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในระบบฐานข้อมูล",
    statusCode: 500,
  };
}
