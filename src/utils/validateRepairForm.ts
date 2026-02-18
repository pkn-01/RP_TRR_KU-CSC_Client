/**
 * Validation utility for repair form
 * Centralized validation logic for both frontend use and consistency with backend
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface RepairFormData {
  name: string;
  dept: string;
  phone: string;
  details: string;
  urgency: string;
  location: string;
}

/**
 * Validate reporter name
 */
export function validateName(name: string): string | null {
  if (!name.trim()) return "กรุณาระบุชื่อผู้แจ้ง";
  if (name.trim().length > 100) return "ชื่อผู้แจ้งต้องไม่เกิน 100 ตัวอักษร";
  return null;
}

/**
 * Validate department
 */
export function validateDepartment(dept: string): string | null {
  if (!dept.trim()) return "กรุณาระบุแผนกของคุณ";
  return null;
}

/**
 * Validate phone number (Thai format: 0XXXXXXXXX)
 */
export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return "กรุณาระบุเบอร์โทรติดต่อ";
  if (phone.length !== 10) return "กรุณาระบุเบอร์โทรติดต่อ 10 หลัก (ขึ้นต้นด้วย 0)";
  if (!phone.startsWith("0")) return "เบอร์โทรต้องขึ้นต้นด้วย 0";
  if (!/^\d{10}$/.test(phone)) return "เบอร์โทรต้องเป็นตัวเลข 10 หลัก";
  return null;
}

/**
 * Validate problem details
 */
export function validateDetails(details: string): string | null {
  if (!details.trim()) return "กรุณาระบุปัญหา";
  return null;
}

/**
 * Validate file (optional)
 */
export function validateFile(file: File | null): string | null {
  if (!file) return null; // File is optional
  if (file.size > MAX_FILE_SIZE) return "กรุณาเลือกไฟล์ขนาดไม่เกิน 5MB";
  if (!file.type.startsWith("image/") || !ALLOWED_FILE_TYPES.includes(file.type)) {
    return "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP) เท่านั้น";
  }
  return null;
}

/**
 * Validate entire repair form — returns first error message or null if valid
 */
export function validateRepairForm(data: RepairFormData, file?: File | null): string | null {
  return (
    validateName(data.name) ||
    validateDepartment(data.dept) ||
    validatePhone(data.phone) ||
    validateDetails(data.details) ||
    validateFile(file ?? null)
  );
}
