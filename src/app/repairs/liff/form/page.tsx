"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { uploadData } from "@/services/uploadService";
import Swal from "sweetalert2";
import RepairSuccess from "@/components/repairs/RepairSuccess";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Camera,
  MapPinHouse,
  Phone,
  X,
  Building2,
  User,
  ChevronDown,
} from "lucide-react";
import { departmentService, Department } from "@/services/department.service";

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Pre-imported SweetAlert for faster alerts
const showAlert = (options: {
  icon?: "success" | "error" | "warning";
  title: string;
  text?: string;
  confirmButtonColor?: string;
}) => {
  return Swal.fire(options);
};

const URGENCY_OPTIONS = [
  {
    id: "NORMAL",
    label: "ปกติ",
    color: "!bg-green-500 hover:!bg-green-600 !text-gray-900",
  },
  {
    id: "URGENT",
    label: "ด่วน",
    color: "!bg-yellow-400 hover:!bg-yellow-500 !text-gray-900",
  },
  {
    id: "CRITICAL",
    label: "ด่วนมาก",
    color: "!bg-red-500 hover:!bg-red-600 !text-gray-900",
  },
];

function RepairFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for LINE user ID (from LIFF SDK only — never trust URL params)
  const [lineUserId, setLineUserId] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);

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
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [successData, setSuccessData] = useState<{
    ticketCode: string;
    linkingCode?: string;
    hasLineUserId?: boolean;
  } | null>(null);

  // Initialize LIFF SDK to get user profile
  // Priority: 1) LIFF SDK profile  2) If unauthenticated -> force login
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

        if (!liffId) {
          console.warn("LIFF ID not configured, continuing as guest");
          setLiffInitialized(true);
          return;
        }

        const liff = (await import("@line/liff")).default;

        // Initialize LIFF with timeout to prevent infinite hang
        const initPromise = liff.init({
          liffId,
          withLoginOnExternalBrowser: false,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("LIFF init timeout")), 5000),
        );
        await Promise.race([initPromise, timeoutPromise]);

        if (liff.isLoggedIn()) {
          // User is logged in via LIFF — get their profile and token
          try {
            const profile = await liff.getProfile();
            const token = liff.getAccessToken();
            if (profile.userId && token) {
              setLineUserId(profile.userId);
              setAccessToken(token);
              setLiffInitialized(true);
              return;
            }
          } catch (profileError) {
            console.warn("Failed to get LINE profile:", profileError);
          }
        }

        // If not logged in, we set as guest instead of forcing login
        // to prevent infinite redirect loops in external browsers
        setLiffInitialized(true);
        return;
      } catch (error: any) {
        console.warn("LIFF initialization failed, using guest mode:", error);

        setLiffError(error?.message || "LIFF Init Failed");
        setLiffInitialized(true);
      }
    };

    initLiff();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await departmentService.getAllDepartments();
        setDepartments(data);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepartments();
  }, []);

  const handleLineLogin = async () => {
    try {
      const liff = (await import("@line/liff")).default;
      if (!liff.isLoggedIn()) {
        liff.login();
      }
    } catch (error) {
      console.error("Login failed:", error);
      await showAlert({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเข้าสู่ระบบ LINE ได้ กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { id, value } = e.target;

      if (id === "phone") {
        const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
        setFormData((prev) => ({ ...prev, phone: digitsOnly }));
        return;
      }

      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    [],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];

        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE) {
          showAlert({
            icon: "warning",
            title: "ไฟล์มีขนาดใหญ่เกินไป",
            text: "กรุณาเลือกไฟล์ขนาดไม่เกิน 5MB",
          });
          e.target.value = "";
          return;
        }

        // Validate file type (MIME type check)
        if (
          !selectedFile.type.startsWith("image/") ||
          !ALLOWED_FILE_TYPES.includes(selectedFile.type)
        ) {
          showAlert({
            icon: "warning",
            title: "ประเภทไฟล์ไม่ถูกต้อง",
            text: "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP) เท่านั้น",
          });
          e.target.value = "";
          return;
        }

        setFile(selectedFile);

        const url = URL.createObjectURL(selectedFile);
        setFilePreview(url);
      }
    },
    [],
  );

  const clearFile = useCallback(() => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFile(null);
    setFilePreview(null);
  }, [filePreview]);

  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    if (!formData.name.trim()) {
      await showAlert({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาระบุชื่อผู้แจ้ง",
      });
      return;
    }

    if (!formData.dept.trim()) {
      await showAlert({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาระบุแผนกของคุณ",
      });
      return;
    }

    if (
      !formData.phone.trim() ||
      formData.phone.length !== 10 ||
      !formData.phone.startsWith("0")
    ) {
      await showAlert({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาระบุเบอร์โทรติดต่อ 10 หลัก (ขึ้นต้นด้วย 0)",
      });
      return;
    }

    if (!formData.details.trim()) {
      await showAlert({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาระบุปัญหา",
      });
      return;
    }

    setIsLoading(true);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      const finalLineUserId = lineUserId || "Guest";

      // Refresh accessToken right before submission to prevent expired errors
      let currentAccessToken = accessToken;
      try {
        const liff = (await import("@line/liff")).default;
        if (liff.isLoggedIn()) {
          const freshToken = liff.getAccessToken();
          if (freshToken) currentAccessToken = freshToken;
        }
      } catch (e) {
        console.warn("Failed to fetch fresh LIFF proxy token before submit", e);
      }

      const dataPayload = {
        reporterName: formData.name.trim(),
        reporterLineId: finalLineUserId,
        accessToken: currentAccessToken || undefined,
        reporterDepartment: formData.dept,
        reporterPhone: formData.phone,
        problemTitle: formData.details,
        problemDescription: formData.details,
        location: formData.location,
        urgency: formData.urgency,
        problemCategory: "OTHER",
      };

      const response = await uploadData(
        `/api/repairs/liff/create`,
        dataPayload,
        file || undefined,
        { signal: abortController.signal },
      );

      setSuccessData({
        ticketCode: response.ticketCode,
        linkingCode: lineUserId ? undefined : response.linkingCode,
        hasLineUserId: !!lineUserId,
      });
    } catch (error: unknown) {
      let errorMessage = "กรุณาลองใหม่อีกครั้ง";
      if (error instanceof DOMException && error.name === "AbortError") {
        errorMessage = "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      await showAlert({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: errorMessage,
      });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleNewRequest = () => {
    setSuccessData(null);
    setFormData({
      name: "",
      dept: "",
      phone: "",
      details: "",
      urgency: "NORMAL",
      location: "",
    });
    setFile(null);
    setFilePreview(null);
  };

  // Success Page
  if (successData) {
    return (
      <RepairSuccess
        ticketCode={successData.ticketCode}
        linkingCode={successData.linkingCode}
        hasLineUserId={successData.hasLineUserId}
        onNewRequest={handleNewRequest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-[5px] border-gray-100 border-t-[#5D3A29] rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              กำลังดำเนินการ
            </h3>
            <p className="text-gray-500 text-center">
              กรุณารอสักครู่ ระบบกำลังบันทึกข้อมูลการแจ้งซ่อมของคุณ...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#5E2C23]">
              แจ้งซ่อมออนไลน์
            </h1>
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="text-sm">
                กรุณากรอกรายละเอียดปัญหาเพื่อแจ้งเจ้าหน้าที่
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Form Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Reporter Info */}
          <section>
            {/* Section Badge */}
            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 bg-[#5D3A29] text-white text-sm font-medium rounded-full">
                ข้อมูลผู้แจ้ง
              </span>
            </div>

            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ชื่อผู้แจ้ง<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="ระบุชื่อผู้แจ้ง"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-0 rounded-full text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5D3A29] transition-all"
                  />
                </div>
              </div>

              {/* Department Field */}
              <div>
                <label
                  htmlFor="dept"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  แผนก/ฝ่าย<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="dept"
                    value={formData.dept}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-10 py-3.5 bg-gray-100 border-0 rounded-full text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#5D3A29] transition-all cursor-pointer"
                  >
                    <option value="" disabled>
                      ระบุแผนก/ฝ่าย
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  เบอร์โทรติดต่อ<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    placeholder="0XXXXXXXXX"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-0 rounded-full text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5D3A29] transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Repair Details */}
          <section>
            {/* Section Badge */}
            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 bg-[#5D3A29] text-white text-sm font-medium rounded-full">
                รายละเอียดการแจ้งซ่อม
              </span>
            </div>

            <div className="space-y-4">
              {/* Location Field */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  สถานที่ (ให้ไปซ่อมที่ไหน)
                </label>
                <div className="relative">
                  <MapPinHouse className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="ระบุอาคาร , ชั้น , ห้อง"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-0 rounded-full text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5D3A29] transition-all"
                  />
                </div>
              </div>

              {/* Details Field */}
              <div>
                <label
                  htmlFor="details"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ปัญหา<span className="text-red-500">*</span>
                </label>

                <textarea
                  id="details"
                  rows={4}
                  value={formData.details}
                  onChange={handleChange}
                  placeholder="อธิบายอาการเสียหรือปัญหาที่พบเพิ่มเติม............"
                  className="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5D3A29] transition-all resize-none"
                />
              </div>

              {/* Urgency*/}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ระดับความเร่งด่วน
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  <select
                    id="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="w-full pl-6 pr-10 py-3.5 bg-gray-200/80 border-0 rounded-2xl text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#5D3A29] transition-all cursor-pointer"
                  >
                    {URGENCY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  รูปภาพประกอบ{" "}
                  <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                </label>
                {filePreview ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all"
                      aria-label="ลบรูปภาพ"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 cursor-pointer transition-all">
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      คลิกเพื่อแนบรูปภาพ
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="pt-4 pb-8">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 !bg-[#5D3A29] hover:!bg-[#4A2E21] disabled:bg-gray-300 disabled:cursor-not-allowed !text-white rounded-full font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? "กำลังส่งข้อมูล..." : "ส่งแบบฟอร์มแจ้งซ่อม"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function RepairLiffFormPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <RepairFormContent />
      </Suspense>
    </ErrorBoundary>
  );
}
