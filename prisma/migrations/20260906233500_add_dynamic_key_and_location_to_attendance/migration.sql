-- AlterTable attendance_sessions
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "keySecret" TEXT;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "isKeyActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "centerLatitude" DOUBLE PRECISION;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "centerLongitude" DOUBLE PRECISION;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "expectedRadius" DOUBLE PRECISION DEFAULT 100;

-- AlterTable attendance_records
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "checkInMethod" TEXT DEFAULT 'MANUAL';
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "locationAccuracy" DOUBLE PRECISION;
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "distanceFromSession" DOUBLE PRECISION;
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "hasLocation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
