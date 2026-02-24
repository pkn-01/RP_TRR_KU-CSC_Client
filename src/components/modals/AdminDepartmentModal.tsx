"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { Department } from "@/services/department.service";

interface AdminDepartmentModalProps {
  department: Department | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Department>) => Promise<void>;
}

export default function AdminDepartmentModal({
  department,
  isOpen,
  onClose,
  onSave,
}: AdminDepartmentModalProps) {
  const [formData, setFormData] = useState<Partial<Department>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!department;

  useEffect(() => {
    if (isOpen) {
      if (department) {
        setFormData({
          name: department.name || "",
        });
      } else {
        setFormData({
          name: "",
        });
      }
      setErrors({});
    }
  }, [department, isOpen]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "กรุณากรอกชื่อแผนก";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Auto-generate a dummy code based on the name or a timestamp since the backend requires it
      const payload = { ...formData };
      if (!isEditMode) {
        payload.code = `DEPT_${Date.now()}`;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditMode ? "แก้ไขแผนก" : "เพิ่มแผนกใหม่"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditMode ? `ID: ${department?.id}` : "กรอกข้อมูลด้านล่าง"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อแผนก<span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={`w-full px-4 py-2.5 rounded-xl border ${errors.name ? "border-rose-300 bg-rose-50" : "border-slate-200"} focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm`}
              placeholder=""
            />
            {errors.name && (
              <p className="text-xs text-rose-500 mt-1">{errors.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึก"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
