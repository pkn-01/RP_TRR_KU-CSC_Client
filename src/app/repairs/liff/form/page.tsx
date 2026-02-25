"use client";

import React, {
  useState,
  useEffect,
  Suspense,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Camera,
  MapPinHouse,
  Phone,
  X,
  Building2,
  User,
  ChevronDown,
} from "lucide-react";

import { uploadData } from "@/services/uploadService";
import { departmentService, Department } from "@/services/department.service";
import RepairSuccess from "@/components/repairs/RepairSuccess";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/* ================================
   Constants
================================ */

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const URGENCY_OPTIONS = [
  { id: "NORMAL", label: "ปกติ" },
  { id: "URGENT", label: "ด่วน" },
  { id: "CRITICAL", label: "ด่วนมาก" },
];

/* ================================
   Alert Helper
================================ */

const showAlert = (options: {
  icon?: "success" | "error" | "warning";
  title: string;
  text?: string;
}) => Swal.fire(options);

/* ================================
   Main Form Component
================================ */

function RepairFormContent() {
  const router = useRouter();

  /* ---------- State ---------- */

  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDeptLoading, setIsDeptLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    dept: "",
    phone: "",
    details: "",
    urgency: "NORMAL",
    location: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [successData, setSuccessData] = useState<{
    ticketCode: string;
  } | null>(null);

  /* ================================
     Fetch Departments (Dynamic)
  ================================= */

  useEffect(() => {
    let isMounted = true;

    const loadDepartments = async () => {
      try {
        const data = await departmentService.getAllDepartments();
        if (isMounted) setDepartments(data);
      } catch (err) {
        console.error("Failed to load departments:", err);
        showAlert({
          icon: "error",
          title: "ไม่สามารถโหลดแผนกได้",
        });
      } finally {
        if (isMounted) setIsDeptLoading(false);
      }
    };

    loadDepartments();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ================================
     Handlers
  ================================= */

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { id, value } = e.target;

      if (id === "phone") {
        const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
        setFormData((prev) => ({ ...prev, phone: digitsOnly }));
        return;
      }

      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    []
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;

      const selectedFile = e.target.files[0];

      if (selectedFile.size > MAX_FILE_SIZE) {
        showAlert({
          icon: "warning",
          title: "ไฟล์ใหญ่เกินไป",
          text: "ไม่เกิน 5MB",
        });
        return;
      }

      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
        showAlert({
          icon: "warning",
          title: "ไฟล์ไม่รองรับ",
          text: "รองรับเฉพาะ JPG, PNG, WebP",
        });
        return;
      }

      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    },
    []
  );

  const clearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
  };

  /* ================================
     Validation
  ================================= */

  const validateForm = () => {
    if (!formData.name.trim())
      return "กรุณาระบุชื่อผู้แจ้ง";

    if (!formData.dept.trim())
      return "กรุณาเลือกแผนก";

    if (
      formData.phone.length !== 10 ||
      !formData.phone.startsWith("0")
    )
      return "กรุณากรอกเบอร์ 10 หลัก";

    if (!formData.details.trim())
      return "กรุณาระบุปัญหา";

    return null;
  };

  /* ================================
     Submit
  ================================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const error = validateForm();
    if (error) {
      showAlert({ icon: "warning", title: "แจ้งเตือน", text: error });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        reporterName: formData.name,
        reporterDepartment: formData.dept,
        reporterPhone: formData.phone,
        problemTitle: formData.details,
        problemDescription: formData.details,
        location: formData.location,
        urgency: formData.urgency,
      };

      const response = await uploadData(
        "/api/repairs/liff/create",
        payload,
        file || undefined
      );

      setSuccessData({
        ticketCode: response.ticketCode,
      });
    } catch (err: any) {
      showAlert({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "กรุณาลองใหม่",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================================
     Success Page
  ================================= */

  if (successData) {
    return (
      <RepairSuccess
        ticketCode={successData.ticketCode}
        onNewRequest={() => {
          setSuccessData(null);
          setFormData({
            name: "",
            dept: "",
            phone: "",
            details: "",
            urgency: "NORMAL",
            location: "",
          });
          clearFile();
        }}
      />
    );
  }

  /* ================================
     Render
  ================================= */

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ชื่อผู้แจ้ง *
            </label>
            <input
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium mb-2">
              แผนก *
            </label>
            <select
              id="dept"
              value={formData.dept}
              onChange={handleChange}
              disabled={isDeptLoading}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl"
            >
              <option value="">
                {isDeptLoading
                  ? "กำลังโหลดแผนก..."
                  : "เลือกแผนก"}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">
              เบอร์โทร *
            </label>
            <input
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength={10}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl"
            />
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ปัญหา *
            </label>
            <textarea
              id="details"
              rows={4}
              value={formData.details}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium mb-2">
              ความเร่งด่วน
            </label>
            <select
              id="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl"
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* File */}
          <div>
            <label className="block text-sm font-medium mb-2">
              รูปภาพ (ไม่บังคับ)
            </label>
            <input type="file" onChange={handleFileChange} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#5D3A29] text-white rounded-xl"
          >
            {isSubmitting
              ? "กำลังส่ง..."
              : "ส่งแจ้งซ่อม"}
          </button>
        </form>
      </main>
    </div>
  );
}

/* ================================
   Export Page
================================ */

export default function RepairLiffFormPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <RepairFormContent />
      </Suspense>
    </ErrorBoundary>
  );
}