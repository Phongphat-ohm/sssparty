import { AuditActionType, AuditTargetType } from "../logger";

export interface AuditLogPayload {
  userId?: string | null;
  username?: string | null;
  role?: "ADMIN" | "STUDENT" | null;
  action: AuditActionType | string;
  targetType?: AuditTargetType | string | null;
  targetId?: string | null;
  details?: string | Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  durationMs?: number | null;
  status?: "SUCCESS" | "FAILED" | "ERROR";
  createdAt?: Date;
}

export interface AuditDriver {
  name: string;
  write(payload: AuditLogPayload): Promise<void>;
  flush?(): Promise<void>;
}
