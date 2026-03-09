// ===== แบบฟอร์มแจ้งซ่อม | Repair Request Form =====
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
        createdAt: new Date()
          .toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\//g, "."),
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
      <div className="min-h-screen bg-[#5B77A8] flex flex-col font-sans overflow-hidden">
        {/* LINE Header */}
        <div className="flex justify-between items-center text-white px-4 py-3 bg-[#5B77A8]">
          <button onClick={() => (window.location.href = "/")} className="p-1">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#00E02D] rounded-full flex items-center justify-center">
              <svg
                width="12"
                height="12"
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
            <span className="font-bold text-[17px]">Kanna</span>
          </div>

          <div className="flex items-center gap-3">
            <button>
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
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
            <button>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Area Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 flex flex-col items-center">
          {/* Today Badge */}
          <div className="my-6">
            <span className="bg-black/15 text-white/90 text-[11px] px-3 py-1 rounded-full font-medium">
              Today
            </span>
          </div>

          {/* Ticket Card */}
          <div className="bg-white rounded-[24px] w-full max-w-[340px] shadow-sm overflow-hidden p-6 relative">
            {/* Status Badges */}
            <div className="flex justify-end gap-1.5 mb-2">
              <span className="bg-[#FFC107] text-white px-3 py-0.5 rounded-full text-[13px] font-bold">
                รอรับเรื่อง
              </span>
              {(success.urgency === "URGENT" ||
                success.urgency === "CRITICAL") && (
                <span className="bg-[#FF5D23] text-white px-3 py-0.5 rounded-full text-[13px] font-bold">
                  ด่วน
                </span>
              )}
            </div>

            {/* Ticket ID */}
            <div className="mb-4">
              <h3 className="text-[20px] font-bold text-black tracking-tight">
                ID:{success.ticketCode}
              </h3>
            </div>

            {/* Image Area */}
            <div className="w-full aspect-[4.2/3] bg-[#E1F1FD] rounded-[4px] mb-4 overflow-hidden relative border border-[#D5E6F5] flex items-center justify-center">
              {success.image ? (
                <img
                  src={success.image}
                  alt="Problem"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full bg-[#E1F1FD]">
                  {/* Hills */}
                  <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-[#8CC63F]">
                    <div className="absolute top-0 left-[-20%] w-[80%] h-full bg-[#7BB032] rounded-t-[100%]"></div>
                    <div className="absolute top-[-10%] right-[-10%] w-[70%] h-full bg-[#8CC63F] rounded-t-[100%]"></div>
                  </div>
                  {/* Clouds */}
                  <div className="absolute top-[15%] left-[10%] w-[18%] h-[12%] bg-white/50 rounded-full blur-[2px]"></div>
                  <div className="absolute top-[20%] right-[15%] w-[25%] h-[15%] bg-white/50 rounded-full blur-[2px]"></div>
                </div>
              )}
            </div>

            {/* Description Box */}
            <div className="bg-[#E5E5E5] rounded-[16px] p-4 min-h-[100px] mb-4 text-[#666666] text-[14px] leading-tight flex items-start">
              {success.description || "รายละเอียด..."}
            </div>

            {/* Timestamp */}
            <div className="text-[#666666] text-[12px] font-medium ml-1">
              แจ้งเมื่อ {success.createdAt}
            </div>
          </div>
        </div>

        {/* LINE Taskbar (Bottom) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-3 flex items-center gap-1">
          <button className="p-1 px-2">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9EABB9"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button className="p-1 px-2">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9EABB9"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19 21H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2-3h4l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z"></path>
            </svg>
          </button>
          <button className="p-1 px-2 mr-1">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9EABB9"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>

          <div className="flex-1 bg-[#F5F6F8] rounded-[20px] px-4 py-2 text-[#C4C9D0] text-[16px] flex justify-between items-center border border-gray-100">
            <span>Aa</span>
            <div className="flex gap-2">
              <div className="w-[3px] h-[3px] bg-[#9EABB9] rounded-full"></div>
              <div className="w-[3px] h-[3px] bg-[#9EABB9] rounded-full"></div>
            </div>
          </div>

          <button className="p-1 px-3">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9EABB9"
              strokeWidth="2"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
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
