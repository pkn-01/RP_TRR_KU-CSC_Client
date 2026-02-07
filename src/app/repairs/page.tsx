"use client";

import React, {
  useState,
  useEffect,
  Suspense,
  useCallback,
  FormEvent,
  ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { apiFetch } from "@/services/api";
import { uploadData } from "@/services/uploadService";

const PROBLEM_CATEGORIES = [
  { value: "HARDWARE", label: "💻 Hardware (คอมพิวเตอร์, อุปกรณ์)" },
  { value: "SOFTWARE", label: "📱 Software (โปรแกรม, ระบบ)" },
  { value: "NETWORK", label: "🌐 Network (อินเทอร์เน็ต, Wi-Fi)" },
  { value: "PERIPHERAL", label: "🖥️ Peripheral (เมาส์, คีย์บอร์ด, จอภาพ)" },
  { value: "EMAIL_OFFICE365", label: "📧 Email/Office 365" },
  { value: "ACCOUNT_PASSWORD", label: "🔐 Account/Password" },
  { value: "OTHER", label: "🔧 อื่นๆ" },
];

const URGENCY_LEVELS = [
  { value: "NORMAL", label: "🟢 ปกติ (สามารถทำงานได้ต่อ)", emoji: "🟢" },
  {
    value: "URGENT",
    label: "🟡 ด่วน (ส่งผลต่อการทำงาน)",
    emoji: "🟡",
  },
  {
    value: "CRITICAL",
    label: "🔴 ด่วนมาก (หยุดงานทันที)",
    emoji: "🔴",
  },
];

interface SuccessState {
  show: boolean;
  ticketCode?: string;
  ticketId?: string;
  description?: string;
  image?: string;
  createdAt?: string;
  urgency?: string;
}

function RepairPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lineUserId = searchParams.get("userId");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState>({ show: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    reporterName: "",
    reporterDepartment: "",
    reporterPhone: "",
    reporterLineId: "",
    problemCategory: "",
    problemTitle: "",
    problemDescription: "",
    location: "",
    urgency: "NORMAL",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const totalFiles = files.length + selectedFiles.length;

      if (totalFiles > 3) {
        alert("สามารถแนบรูปภาพได้สูงสุด 3 รูป");
        return;
      }

      setFiles((prev) => [...prev, ...selectedFiles]);

      const newPreviews = selectedFiles.map((file) =>
        URL.createObjectURL(file),
      );
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setFilePreviews((prev) => {
      const newPreviews = prev.filter((_, index) => index !== indexToRemove);
      URL.revokeObjectURL(prev[indexToRemove]);
      return newPreviews;
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.reporterName.trim()) {
      newErrors.reporterName = "กรุณาระบุชื่อผู้แจ้ง";
    }
    if (!formData.reporterDepartment) {
      newErrors.reporterDepartment = "กรุณาเลือกแผนก";
    }
    if (!formData.problemCategory) {
      newErrors.problemCategory = "กรุณาเลือกประเภทปัญหา";
    }
    if (!formData.problemTitle.trim()) {
      newErrors.problemTitle = "กรุณาระบุหัวข้อปัญหา";
    }
    if (!formData.location.trim()) {
      newErrors.location = "กรุณาระบุสถานที่";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare payload object for uploadData
      const dataPayload = {
        reporterName: formData.reporterName,
        reporterDepartment: formData.reporterDepartment,
        reporterPhone: formData.reporterPhone || "-",
        reporterLineId:
          formData.reporterLineId || (lineUserId ? lineUserId : undefined),
        lineUserId: lineUserId || undefined, // สำหรับส่ง LINE notification กลับไปหาผู้แจ้ง
        problemCategory: formData.problemCategory,
        problemTitle: formData.problemTitle,
        problemDescription: formData.problemDescription,
        location: formData.location,
        urgency: formData.urgency,
      };

      // Use LIFF endpoint if lineUserId is present, otherwise use protected endpoint
      const endpoint = lineUserId ? "/api/repairs/liff/create" : "/api/repairs";

      const data = await uploadData(endpoint, dataPayload, files);

      // Create a preview URL for the first file if available
      let imagePreview = undefined;
      if (files.length > 0) {
        imagePreview = URL.createObjectURL(files[0]);
      }

      setSuccess({
        show: true,
        ticketCode: data.ticketCode,
        ticketId: data.id,
        description: formData.problemDescription,
        image: imagePreview,
        createdAt: new Date().toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        urgency: formData.urgency,
      });
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่ง",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success.show) {
    return (
      <div className="min-h-screen bg-[#4A6FA5] p-4 flex flex-col">
        {/* Helper Header */}
        <div className="flex justify-between items-center text-white mb-4 px-2">
          <button onClick={() => (window.location.href = "/")} className="p-1">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-semibold text-lg">Kanna</span>
          </div>
          <div className="flex gap-4">
            <button>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
            <button>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center pt-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-6 pb-8">
              {/* Status Badges */}
              <div className="flex justify-end gap-2 mb-4 absolute top-0 right-0 p-4 z-10">
                <span className="bg-[#FFC107] text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                  รอรับเรื่อง
                </span>
                {(success.urgency === "URGENT" ||
                  success.urgency === "CRITICAL") && (
                  <span className="bg-[#FF5722] text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                    ด่วน
                  </span>
                )}
              </div>

              {/* Ticket ID */}
              <div className="mb-4 mt-8">
                <h3 className="text-xl font-bold text-gray-800">
                  ID: {success.ticketCode}
                </h3>
              </div>

              {/* Image Area */}
              <div className="w-full aspect-[4/3] bg-blue-50 rounded-xl mb-4 overflow-hidden relative border border-blue-100 flex items-center justify-center">
                {success.image ? (
                  <img
                    src={success.image}
                    alt="Problem"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="w-20 h-20 bg-blue-100/50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-8 h-8 text-blue-300" />
                    </div>
                    <p className="text-blue-300 text-sm font-medium">
                      ไม่มีรูปภาพ
                    </p>

                    {/* Decorative clouds/hills for empty state similar to design */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[#8BC34A] rounded-t-[50%] scale-150 translate-y-1/4 opacity-80"></div>
                    <div className="absolute top-10 left-10 w-16 h-10 bg-white/40 rounded-full blur-sm"></div>
                    <div className="absolute top-6 right-20 w-24 h-14 bg-white/40 rounded-full blur-sm"></div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-gray-100 rounded-xl p-4 min-h-[100px] mb-4 text-gray-600 text-sm relative">
                {success.description || "รายละเอียด..."}
              </div>

              {/* Timestamp */}
              <div className="text-gray-500 text-xs mt-2">
                แจ้งเมื่อ {success.createdAt}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions - mimicking standard app/chat interface */}
        <div className="mt-auto bg-white p-3 flex items-center gap-3 rounded-t-xl opacity-90 mx-[-16px] mb-[-16px]">
          <button className="p-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button className="p-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <button className="p-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <polyline points="11 3 11 11 14 8 17 11 17 3"></polyline>
            </svg>
          </button>
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-gray-400 text-sm">
            Aa
          </div>
          <button className="p-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-8 md:py-12 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 md:p-10 border border-gray-100 dark:border-slate-800">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4 text-blue-600 dark:text-blue-400">
              <Upload className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
              แจ้งซ่อมอุปกรณ์ IT
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
              กรอกข้อมูลด้านล่างเพื่อให้ทีมงาน IT ช่วยเหลือคุณ{" "}
              <br className="hidden md:block" />
              เราพร้อมดูแลทุกปัญหาการใช้งาน
            </p>
          </div>

          {/* Error Alert */}
          {errors.submit && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">
                  เกิดข้อผิดพลาดในการส่งข้อมูล
                </h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                  {errors.submit}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ชื่อเล่น */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  ชื่อเล่นผู้แจ้ง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="reporterName"
                  value={formData.reporterName}
                  onChange={handleInputChange}
                  placeholder="เช่น ปอนด์, แนน"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
                {errors.reporterName && (
                  <p className="text-red-500 text-xs mt-1 font-medium">
                    {errors.reporterName}
                  </p>
                )}
              </div>

              {/* แผนก */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  แผนก <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="reporterDepartment"
                    value={formData.reporterDepartment}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition duration-200"
                  >
                    <option value="" disabled className="text-gray-400">
                      -- เลือกแผนก --
                    </option>
                    <option value="ฝ่ายบัญชี">ฝ่ายบัญชี</option>
                    <option value="ฝ่ายขาย">ฝ่ายขาย</option>
                    <option value="ฝ่ายผลิต">ฝ่ายผลิต</option>
                    <option value="ฝ่ายบริหาร">ฝ่ายบริหาร</option>
                    <option value="ฝ่ายบุคคล">ฝ่ายบุคคล</option>
                    <option value="ฝ่าย IT">ฝ่าย IT</option>
                  </select>
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
                {errors.reporterDepartment && (
                  <p className="text-red-500 text-xs mt-1 font-medium">
                    {errors.reporterDepartment}
                  </p>
                )}
              </div>
            </div>

            {/* เบอร์โทร */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                เบอร์โทรศัพท์ติดต่อ (ไม่บังคับ)
              </label>
              <input
                type="tel"
                name="reporterPhone"
                value={formData.reporterPhone}
                onChange={handleInputChange}
                placeholder="0xx-xxx-xxxx"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
            </div>

            <div className="h-px bg-gray-200 dark:bg-slate-700 my-6" />

            {/* ประเภทปัญหา */}
            <div className="space-y-3">
              <label className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full inline-block"></span>
                เลือกประเภทปัญหา <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROBLEM_CATEGORIES.map((category) => (
                  <label
                    key={category.value}
                    className={`
                      relative flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-200
                      ${
                        formData.problemCategory === category.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500 dark:border-blue-500"
                          : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transform hover:scale-[1.01]"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="problemCategory"
                      value={category.value}
                      checked={formData.problemCategory === category.value}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                    />
                    <span
                      className={`ml-3 font-medium ${
                        formData.problemCategory === category.value
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.problemCategory && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  {errors.problemCategory}
                </p>
              )}
            </div>

            {/* ปัญหาที่พบ */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                หัวข้อปัญหา <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="problemTitle"
                value={formData.problemTitle}
                onChange={handleInputChange}
                placeholder="เช่น คอมพิวเตอร์เปิดไม่ติด, จอภาพดับ"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
              <div className="flex justify-between items-center text-xs">
                {errors.problemTitle ? (
                  <p className="text-red-500 font-medium">
                    {errors.problemTitle}
                  </p>
                ) : (
                  <span></span>
                )}
                <span className="text-gray-500 dark:text-gray-400">
                  {formData.problemTitle.length}/100
                </span>
              </div>
            </div>

            {/* สถานที่ */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                สถานที่/ห้องทำงาน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="ระบุตึก ชั้น หรือเลขห้องให้ชัดเจน"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
              {errors.location && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  {errors.location}
                </p>
              )}
            </div>

            {/* รายละเอียด */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                รายละเอียดเพิ่มเติม
              </label>
              <textarea
                name="problemDescription"
                value={formData.problemDescription}
                onChange={handleInputChange}
                placeholder="อธิบายอาการอย่างละเอียด เพื่อให้ทีมงานวิเคราะห์ปัญหาได้เร็วขึ้น..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-none"
              />
              <div className="flex justify-end text-xs text-gray-500 dark:text-gray-400">
                {formData.problemDescription.length}/500
              </div>
            </div>

            {/* รูปภาพ */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                แนบรูปภาพ (สูงสุด 3 รูป)
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-200 group cursor-pointer">
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-gray-400 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    คลิกเพื่อเลือกรูปภาพ
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    JPG, PNG ขนาดไม่เกิน 5MB ต่อรูป
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={files.length >= 3}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title=""
                />
              </div>

              {/* Preview */}
              {filePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {filePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative group rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-700 aspect-square"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors backdrop-blur-sm shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-gray-200 dark:bg-slate-700 my-6" />

            {/* ความเร่งด่วน */}
            <div className="space-y-3">
              <label className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-orange-500 rounded-full inline-block"></span>
                ระดับความเร่งด่วน
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {URGENCY_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={`
                      relative flex flex-col md:flex-row items-center justify-center md:justify-start p-4 border rounded-xl cursor-pointer transition-all duration-200 gap-3 text-center md:text-left
                      ${
                        formData.urgency === level.value
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-500 dark:border-orange-500"
                          : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transform hover:scale-[1.01]"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={level.value}
                      checked={formData.urgency === level.value}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <span className="text-2xl">{level.emoji}</span>
                    <div className="flex flex-col">
                      <span
                        className={`font-semibold ${
                          formData.urgency === level.value
                            ? "text-orange-900 dark:text-orange-100"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {level.label.split(" ")[1]}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {level.label.split("(")[1]?.replace(")", "") || "ปกติ"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>กำลังส่งข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <span>ส่งแจ้งซ่อม</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RepairPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <RepairPageContent />
    </Suspense>
  );
}
