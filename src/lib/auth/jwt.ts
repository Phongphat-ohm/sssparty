export interface AuthTokenPayload {
  userId: string;
  role: "ADMIN" | "STUDENT";
  username: string;
  studentId?: string;
  studentCode?: string;
  name?: string;
  className?: string;
  studentNumber?: number;
  exp?: number;
  iat?: number;
}

const RAW_JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!RAW_JWT_SECRET || RAW_JWT_SECRET.length < 32 || RAW_JWT_SECRET.includes("fallback-secret")) {
    throw new Error(
      "[SECURITY ALERT] Production deployment requires a secure JWT_SECRET with at least 32 characters set in environment variables."
    );
  }
}

const JWT_SECRET = RAW_JWT_SECRET || "sssparty-fallback-secret-at-least-32-chars-long";

function base64UrlEncode(data: Uint8Array | string): string {
  let base64: string;
  if (typeof data === "string") {
    const bytes = new TextEncoder().encode(data);
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    base64 = Buffer.from(data).toString("base64");
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function getCryptoKey(): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(JWT_SECRET);
  return crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * ลงนามสร้าง JWT Token (หมดอายุ 7 วัน)
 */
export async function signAuthToken(payload: Omit<AuthTokenPayload, "exp" | "iat">): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dataToSign) as BufferSource
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${dataToSign}.${encodedSignature}`;
}

/**
 * ตรวจสอบความถูกต้องและถอดรหัส JWT Token
 */
export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const signatureBytes = base64UrlDecode(encodedSignature);

    const key = await getCryptoKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as BufferSource,
      new TextEncoder().encode(dataToVerify) as BufferSource
    );

    if (!isValid) {
      return null;
    }

    const payloadJson = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    const payload = JSON.parse(payloadJson) as AuthTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}
