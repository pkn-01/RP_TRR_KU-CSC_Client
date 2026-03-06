"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  User,
  Wrench,
  MapPin,
  Mail,
  Phone,
  Users,
  Badge,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/services/api";
import Loading from "@/components/Loading";

interface RepairItem {
  id: number;
  ticketCode: string;
  problemTitle: string;
  problemDescription: string;
  status:
    | "PENDING"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "WAITING_PARTS"
    | "COMPLETED"
    | "CANCELLED";
  urgency: "NORMAL" | "URGENT" | "CRITICAL";
  equipmentName: string;
  location: string;
  assignees?: {
    userId: number;
    user: {
      id: number;
      name: string;
      email: string;
      phone?: string;
    };
  }[];
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TechnicianInfo {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
}

const statusLabels = {
  PENDING: {
    label: "รอดำเนินการ",
    color: "bg-gray-100 text-gray-800",
    bgColor: "bg-gray-50",
  },
  ASSIGNED: {
    label: "มอบหมายแล้ว",
    color: "bg-blue-100 text-blue-800",
    bgColor: "bg-blue-50",
  },
  IN_PROGRESS: {
    label: "กำลังดำเนินการ",
    color: "bg-blue-100 text-blue-800",
    bgColor: "bg-blue-50",
  },
  WAITING_PARTS: {
    label: "รออะไหล่",
    color: "bg-yellow-100 text-yellow-800",
    bgColor: "bg-yellow-50",
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    color: "bg-green-100 text-green-800",
    bgColor: "bg-green-50",
  },
  CANCELLED: {
    label: "ยกเลิก",
    color: "bg-red-100 text-red-800",
    bgColor: "bg-red-50",
  },
};

const urgencyLabels = {
  NORMAL: { label: "ปกติ", color: "bg-gray-100 text-gray-800" },
  URGENT: { label: "ด่วน", color: "bg-yellow-100 text-yellow-800" },
  CRITICAL: { label: "ด่วนที่สุด", color: "bg-red-100 text-red-800" },
};

export default function AssignRepairPage() {
  const router = useRouter();
  const params = useParams();
  const repairId = params.id as string;

  const [repair, setRepair] = useState<RepairItem | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianInfo[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<number | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch repair and technicians data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch repair details
        const repairData = await apiFetch(`/api/repairs/code/${repairId}`);
        setRepair(repairData);
        if (repairData.assignees && repairData.assignees.length > 0) {
          setSelectedTechnician(repairData.assignees[0].userId);
        }

        // Fetch technicians (IT users)
        try {
          const techData = await apiFetch("/api/users?role=IT");
          setTechnicians(techData || []);
        } catch {
          // Fallback: use empty array if users endpoint doesn't exist
          setTechnicians([]);
        }
      } catch (err: Error | unknown) {
        console.error("Error fetching data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลได้";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [repairId]);

  const handleAssign = async () => {
    if (!selectedTechnician) {
      setError("กรุณาเลือกผู้รับผิดชอบ");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await apiFetch(`/api/repairs/${repair?.id}`, "PUT", {
        assigneeIds: [selectedTechnician],
        status: "ASSIGNED",
      });

      setSuccessMessage("มอบหมายงานเรียบร้อย");
      setTimeout(() => {
        router.push("/admin/repairs");
      }, 1500);
    } catch (err: Error | unknown) {
      console.error("Error assigning repair:", err);
      const errorMessage =
        err instanceof Error ? err.message : "ไม่สามารถมอบหมายงานได้";
      setError(errorMessage);
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!repair) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-gray-600 text-lg font-medium">ไม่พบข้อมูลงาน</p>
        </div>
      </div>
    );
  }

  const selectedTechnicianInfo = technicians.find(
    (t) => t.id === selectedTechnician,
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">มอบหมายงานซ่อม</h1>
            <p className="text-gray-600 mt-1">รหัส: {repair.ticketCode}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">เกิดข้อผิดพลาด</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-start gap-3">
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">สำเร็จ</h3>
            <p className="text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Repair Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              รายละเอียดงานซ่อม
            </h2>

            <div className="space-y-4">
              {/* Ticket Code */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
                <Badge size={20} className="text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">รหัสงาน</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {repair.ticketCode}
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
                <FileText
                  size={20}
                  className="text-orange-600 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">
                    ชื่อเรื่อง
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {repair.problemTitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
                <FileText
                  size={20}
                  className="text-gray-600 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium mb-2">
                    คำอธิบาย
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm border border-gray-200">
                    {repair.problemDescription}
                  </div>
                </div>
              </div>

              {/* Equipment */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
                <Wrench
                  size={20}
                  className="text-purple-600 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">อุปกรณ์</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {repair.equipmentName}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
                <MapPin size={20} className="text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">สถานที่</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {repair.location || "ไม่ระบุ"}
                  </p>
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-lg border border-red-100">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      ความสำคัญ
                    </p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${urgencyLabels[repair.urgency].color}`}
                    >
                      {urgencyLabels[repair.urgency].label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-100">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      สถานะ
                    </p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusLabels[repair.status].color}`}
                    >
                      {statusLabels[repair.status].label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requester Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User size={24} className="text-blue-600" />
              ข้อมูลผู้แจ้ง
            </h2>

            <div className="space-y-4">
              {repair.user ? (
                <>
                  {/* Name */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <User size={20} className="text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">ชื่อ</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {repair.user.name}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <Mail size={20} className="text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">อีเมล</p>
                      <p className="text-gray-900 mt-1 break-all">
                        {repair.user.email}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  {repair.user.phone && (
                    <div className="flex items-center gap-4">
                      <Phone
                        size={20}
                        className="text-orange-600 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 font-medium">
                          เบอร์โทรศัพท์
                        </p>
                        <p className="text-gray-900 mt-1">
                          {repair.user.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">ไม่มีข้อมูลผู้แจ้ง</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Assignment Section */}
        <div className="lg:col-span-1 space-y-6">
          {/* Assignment Form */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users size={24} className="text-blue-600" />
              เลือกผู้รับผิดชอบ
            </h2>

            <div className="space-y-4">
              {/* Technician List */}
              {repair.assignees && repair.assignees.length > 0 ? (
                <div className="bg-white rounded-lg p-6 border-2 border-green-200 text-center">
                  <CheckCircle
                    size={48}
                    className="mx-auto text-green-500 mb-3"
                  />
                  <h3 className="text-lg font-bold text-gray-900">
                    งานนี้ถูกมอบหมายแล้ว
                  </h3>
                  <p className="text-gray-600 mt-1">
                    ผู้รับผิดชอบ: {repair.assignees?.[0]?.user?.name}
                  </p>
                  <button
                    onClick={() => router.back()}
                    className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    ย้อนกลับ
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      ผู้เชี่ยวชาญด้านไอที
                    </label>
                    {technicians.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {technicians.map((tech) => (
                          <label
                            key={tech.id}
                            className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedTechnician === tech.id
                                ? "border-blue-600 bg-white shadow-md"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="technician"
                              value={tech.id}
                              checked={selectedTechnician === tech.id}
                              onChange={(e) =>
                                setSelectedTechnician(Number(e.target.value))
                              }
                              className="w-4 h-4 text-blue-600 cursor-pointer"
                            />
                            <div className="ml-3 flex-1">
                              <p className="font-semibold text-gray-900">
                                {tech.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {tech.email}
                              </p>
                              {tech.phone && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {tech.phone}
                                </p>
                              )}
                              {tech.department && (
                                <p className="text-xs text-gray-500 mt-1 bg-gray-100 px-2 py-1 rounded w-fit">
                                  {tech.department}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <AlertCircle
                          size={20}
                          className="mx-auto text-yellow-600 mb-2"
                        />
                        <p className="text-sm text-yellow-800">
                          ไม่มีข้อมูลผู้เชี่ยวชาญ
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      หมายเหตุ (ทางเลือก)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="เพิ่มหมายเหตุหรือคำแนะนำเพิ่มเติม..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Selected Technician Summary */}
                  {selectedTechnicianInfo && (
                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                      <p className="text-xs text-gray-600 font-medium mb-2">
                        ผู้รับผิดชอบที่เลือก
                      </p>
                      <p className="font-bold text-gray-900">
                        {selectedTechnicianInfo.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedTechnicianInfo.email}
                      </p>
                    </div>
                  )}

                  {/* Confirmation */}
                  {showConfirm ? (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-900">
                        ยืนยันการมอบหมายงานให้{" "}
                        <span className="text-blue-600">
                          {selectedTechnicianInfo?.name}
                        </span>
                        ?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAssign}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                        >
                          <CheckCircle size={18} />
                          {saving ? "กำลังบันทึก..." : "ยืนยัน"}
                        </button>
                        <button
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                        >
                          <X size={18} />
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!selectedTechnician) {
                          setError("กรุณาเลือกผู้รับผิดชอบ");
                          return;
                        }
                        setShowConfirm(true);
                      }}
                      disabled={!selectedTechnician || saving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={20} />
                      มอบหมายงาน
                    </button>
                  )}

                  <button
                    onClick={() => router.back()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    <X size={20} />
                    ยกเลิก
                  </button>
                </>
              )}{" "}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">
              💡 เคล็ดลับ
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• เลือกผู้เชี่ยวชาญที่มีความเชี่ยวชาญ</li>
              <li>• เพิ่มหมายเหตุเพื่อให้ข้อมูลเพิ่มเติม</li>
              <li>• ตรวจสอบข้อมูลก่อนยืนยัน</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
