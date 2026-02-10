"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { uploadData } from "@/services/uploadService";
import Swal from "sweetalert2";
import {
  Camera,
  MapPinHouse,
  Phone,
  X,
  Building2,
  User,
  ShieldAlert,
  CirclePlus,
  Pencil,
  ChevronDown,
  Bell,
} from "lucide-react";
import { DEPARTMENT_OPTIONS } from "@/constants/departments";

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

  // Read lineUserId from URL (fallback for when passed from another page)
  const lineUserIdFromUrl = searchParams.get("lineUserId") || "";

  // State for LINE user ID (from LIFF SDK or URL)
  const [lineUserId, setLineUserId] = useState<string>(lineUserIdFromUrl);
  const [liffInitialized, setLiffInitialized] = useState(false);

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
  const [successData, setSuccessData] = useState<{
    ticketCode: string;
    linkingCode?: string;
    hasLineUserId?: boolean;
  } | null>(null);

  // Initialize LIFF SDK to get user profile (optional - no login required)
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

        if (!liffId) {
          console.warn("LIFF ID not configured, using URL param or guest mode");
          setLiffInitialized(true);
          return;
        }

        await liff.init({ liffId, withLoginOnExternalBrowser: false });
        setLiffInitialized(true);

        // Try to get profile only if already logged in (don't force login)
        if (liff.isInClient() || liff.isLoggedIn()) {
          try {
            const profile = await liff.getProfile();
            if (profile.userId) {
              setLineUserId(profile.userId);
            }
          } catch (profileError) {
            console.warn("Failed to get LINE profile:", profileError);
          }
        }
      } catch (error) {
        console.warn("LIFF initialization failed, using guest mode:", error);
        setLiffInitialized(true);
      }
    };

    // Only init if we don't already have a lineUserId from URL
    if (!lineUserIdFromUrl) {
      initLiff();
    } else {
      setLiffInitialized(true);
    }
  }, [lineUserIdFromUrl]);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { id, value } = e.target;
      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    [],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);

        // Use object URL for faster preview and lower memory usage
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

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
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

    if (!formData.phone.trim()) {
      await showAlert({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาระบุเบอร์โทรติดต่อ",
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
    try {
      // Include lineUserId if user comes from LINE OA (either via URL or LIFF SDK)
      const dataPayload = {
        reporterName: formData.name.trim(),
        reporterLineId: lineUserId || "Guest",
        lineUserId: lineUserId || undefined, // For direct LINE notification
        reporterDepartment: formData.dept,
        reporterPhone: formData.phone,
        problemTitle: formData.details,
        problemDescription: formData.details,
        location: formData.location,
        urgency: formData.urgency,
        problemCategory: "OTHER",
      };

      // Call backend directly to avoid proxy issues with FormData
      // Use production URL always since NEXT_PUBLIC_* env vars are baked at build time
      const backendUrl =
        typeof window !== "undefined" &&
        window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://rp-trr-ku-csc-server-smoky.vercel.app";
      const response = await uploadData(
        `${backendUrl}/api/repairs/liff/create`,
        dataPayload,
        file || undefined,
      );

      // Show success state - if user came from LINE, no linking code needed
      setSuccessData({
        ticketCode: response.ticketCode,
        linkingCode: lineUserId ? undefined : response.linkingCode, // No linking code if already linked via LINE
        hasLineUserId: !!lineUserId,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง";
      await showAlert({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset form for new request
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50/50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            ส่งเรื่องแจ้งซ่อมสำเร็จ
          </h1>
          <p className="text-slate-500 mb-6">
            ทีมงานจะดำเนินการตรวจสอบโดยเร็วที่สุด
          </p>

          {/* Ticket Code Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <p className="text-sm text-slate-500 mb-2">รหัสการแจ้งซ่อม</p>
            <p className="text-2xl font-mono font-bold text-emerald-600 tracking-wider">
              {successData.ticketCode}
            </p>
          </div>

          {/* LINE Notification Registration */}
          {successData.hasLineUserId ? (
            /* Auto-notification enabled (user came from LINE) */
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-green-100 p-1.5 rounded-full">
                  <Bell className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 text-sm mb-1">
                    ✅ เชื่อมต่อ LINE เรียบร้อย
                  </h3>
                  <p className="text-xs text-green-600 leading-relaxed">
                    คุณจะได้รับแจ้งเตือนสถานะการซ่อมผ่าน LINE โดยอัตโนมัติ
                    <br />
                    ไม่ต้องลงทะเบียนเพิ่มเติม
                  </p>
                </div>
              </div>
            </div>
          ) : successData.linkingCode ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-blue-100 p-1.5 rounded-full">
                  <Bell className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800 text-sm mb-1">
                    รับแจ้งเตือนผ่าน LINE
                  </h3>
                  <p className="text-xs text-blue-600 mb-3 leading-relaxed">
                    1. เพิ่มเพื่อน LINE Official Account
                    <br />
                    2. ส่งรหัสนี้ไปที่แชทเพื่อลงทะเบียน
                  </p>

                  <div className="bg-white rounded-lg border border-blue-200 p-2 text-center mb-3">
                    <span className="font-mono font-bold text-blue-700 text-lg tracking-wider">
                      {successData.linkingCode}
                    </span>
                  </div>

                  <a
                    href="https://line.me/R/ti/p/@YOUR_LINE_OA_ID" // TODO: Replace with actual LINE OA ID
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-semibold rounded-lg text-center transition-colors shadow-sm"
                  >
                    เพิ่มเพื่อน LINE OA
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Important Note (Fallback if no linking code) */
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-amber-800 font-medium mb-1">
                กรุณาจดรหัสนี้ไว้
              </p>
              <p className="text-xs text-amber-700">
                ใช้รหัสนี้เพื่อติดตามสถานะการแจ้งซ่อมของคุณ
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleNewRequest}
              className="w-full py-3 bg-[#5D3A29] hover:bg-[#4A2E21] text-white rounded-xl font-medium transition-all duration-200"
            >
              แจ้งซ่อมรายการใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-[#518EE5]">
              แจ้งซ่อมออนไลน์
            </h1>
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="text-sm">
                กรุณากรอกรายละเอียดปัญหาพี่แจ้งเจ้าหน้าที่
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
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
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
                    placeholder="0XX-XXX-XXXX"
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
                <div className="relative">
                  <textarea
                    id="details"
                    rows={4}
                    value={formData.details}
                    onChange={handleChange}
                    placeholder="อธิบายอาการเสียหรือปัญหาที่พบเพิ่มเติม............"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-0 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5D3A29] transition-all resize-none"
                  />
                </div>
              </div>

              {/* Urgency */}
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
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin text-white" />
              ) : (
                "ส่งแบบฟอร์มแจ้งซ่อม"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function RepairLiffFormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RepairFormContent />
    </Suspense>
  );
}
