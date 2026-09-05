-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "students_userId_key";

-- AlterTable
ALTER TABLE "students" DROP COLUMN IF EXISTS "userId";

-- AlterTable users default role to ADMIN
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';

-- Remove student users from users table
DELETE FROM "users" WHERE "role" = 'STUDENT';
