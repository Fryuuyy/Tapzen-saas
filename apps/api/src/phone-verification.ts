import crypto from "crypto";

const phonePattern = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(value: string): string {
  const phone = value.replace(/[\s()-]/g, "");
  if (!phonePattern.test(phone)) throw new Error("INVALID_PHONE");
  return phone;
}

function config() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!accountSid || !authToken || !serviceSid) throw new Error("SMS_PROVIDER_NOT_CONFIGURED");
  return { accountSid, authToken, serviceSid };
}

async function twilioRequest(path: string, values: Record<string, string>) {
  const { accountSid, authToken, serviceSid } = config();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(values)
  });
  const data = await response.json().catch(() => ({})) as { status?: string; code?: number; message?: string };
  if (!response.ok) {
    const error = new Error("SMS_PROVIDER_REQUEST_FAILED") as Error & { status?: number; detail?: string };
    error.status = response.status;
    error.detail = String(data.message || "SMS provider request failed").slice(0, 300);
    throw error;
  }
  return data;
}

export async function sendPhoneCode(phone: string) {
  const { serviceSid, accountSid, authToken } = config();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ To: phone, Channel: "sms" })
  });
  const data = await response.json().catch(() => ({})) as { status?: string; message?: string };
  if (!response.ok) throw new Error("SMS_SEND_FAILED");
  if (data.status !== "pending") throw new Error("SMS_SEND_FAILED");
  return { sent: true };
}

export async function verifyPhoneCode(phone: string, code: string) {
  const { serviceSid, accountSid, authToken } = config();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ To: phone, Code: code })
  });
  const data = await response.json().catch(() => ({})) as { status?: string };
  if (!response.ok) return false;
  return data.status === "approved";
}

export function signPhoneProof(phone: string) {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return require("jsonwebtoken").sign({ purpose: "phone_verified", phone, nonce: crypto.randomUUID() }, secret, {
    expiresIn: "10m", issuer: "tapzen-api", audience: "tapzen-phone-verification"
  }) as string;
}

export function readPhoneProof(token: string): string | null {
  try {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) return null;
    const jwt = require("jsonwebtoken");
    const payload = jwt.verify(token, secret, { issuer: "tapzen-api", audience: "tapzen-phone-verification" }) as { purpose?: string; phone?: string };
    return payload.purpose === "phone_verified" && typeof payload.phone === "string" && phonePattern.test(payload.phone) ? payload.phone : null;
  } catch {
    return null;
  }
}
