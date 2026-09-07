import { AuditDriver } from "./types";
import { PostgresAuditDriver } from "./postgres-driver";
import { RedisBufferAuditDriver } from "./redis-driver";

let activeDriver: AuditDriver | null = null;

export function getAuditDriver(): AuditDriver {
  if (activeDriver) {
    return activeDriver;
  }

  const driverType = (process.env.AUDIT_DRIVER || "postgres").toLowerCase();

  if (driverType === "redis") {
    activeDriver = new RedisBufferAuditDriver();
  } else {
    activeDriver = new PostgresAuditDriver();
  }

  return activeDriver;
}

export * from "./types";
export * from "./postgres-driver";
export * from "./redis-driver";
