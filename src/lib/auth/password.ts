import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * แฮชรหัสผ่านด้วย bcryptjs
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * เปรียบเทียบรหัสผ่าน Plain text กับ Hash
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
