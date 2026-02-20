"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Swal from "sweetalert2";
import { apiFetch } from "@/services/api";
import { AuthService } from "@/lib/authService";
import Header from "./component/Header";
import ManagementPanel from "./component/ManagementPanel";

/* ===============================
   Inline Sub-components
================================ */

function ReporterSection({ data }: { data: RepairDetail }) {
  return (
    <div className="border rounded-xl p-5 space-y-2">
      <h2 className="font-semibold text-lg">ข้อมูลผู้แจ้ง</h2>
      <p>
        <span className="text-gray-500">ชื่อ:</span> {data.reporterName || "-"}
      </p>
      <p>
        <span className="text-gray-500">แผนก:</span>{" "}
        {data.reporterDepartment || "-"}
      </p>
      <p>
        <span className="text-gray-500">เบอร์โทร:</span>{" "}
        {data.reporterPhone || "-"}
      </p>
    </div>
  );
}

function DetailSection({ data }: { data: RepairDetail }) {
  return (
    <div className="border rounded-xl p-5 space-y-2">
      <h2 className="font-semibold text-lg">รายละเอียด</h2>
      <p>
        <span className="text-gray-500">หัวข้อ:</span> {data.title}
      </p>
      <p>
        <span className="text-gray-500">รายละเอียด:</span>{" "}
        {data.description || "-"}
      </p>
      <p>
        <span className="text-gray-500">สถานที่:</span> {data.location || "-"}
      </p>
      {data.attachments && data.attachments.length > 0 && (
        <div>
          <span className="text-gray-500">ไฟล์แนบ:</span>
          <ul className="list-disc list-inside mt-1">
            {data.attachments.map((att) => (
              <li key={att.id}>
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  {att.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AssigneeSection({
  data,
  canEdit,
  id,
}: {
  data: RepairDetail;
  canEdit: boolean;
  id: string;
}) {
  const router = useRouter();
  return (
    <div className="border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">ผู้รับผิดชอบ</h2>
        {canEdit && (
          <button
            onClick={() => router.push(`/admin/repairs/${id}/assigned`)}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            มอบหมายงาน
          </button>
        )}
      </div>
      {data.assignees && data.assignees.length > 0 ? (
        <ul className="space-y-2">
          {data.assignees.map((a) => (
            <li
              key={a.userId}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
            >
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                {a.user.name.charAt(0)}
              </span>
              <span className="text-sm text-gray-800">{a.user.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">ยังไม่มีผู้รับผิดชอบ</p>
      )}
    </div>
  );
}

/* ===============================
   Types
================================ */

type Status =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_PARTS"
  | "COMPLETED"
  | "CANCELLED";

type Urgency = "NORMAL" | "URGENT" | "CRITICAL";

interface RepairDetail {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  location: string;
  status: Status;
  urgency: Urgency;
  assignees: { userId: number; user: { id: number; name: string } }[];
  reporterName: string;
  reporterDepartment: string;
  reporterPhone: string;
  createdAt: string;
  notes?: string;
  messageToReporter?: string;
  attachments?: { id: number; fileUrl: string; filename: string }[];
  assignmentHistory?: any[];
}

/* ===============================
   Main Component
================================ */

export default function RepairDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  /* ---------- State ---------- */

  const [data, setData] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [urgency, setUrgency] = useState<Urgency>("NORMAL");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [messageToReporter, setMessageToReporter] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  /* ===============================
     Derived State
  ================================= */

  const isLocked = useMemo(
    () => (data ? ["COMPLETED", "CANCELLED"].includes(data.status) : true),
    [data],
  );

  const isAssignedToMe = useMemo(
    () => (currentUserId ? assigneeIds.includes(currentUserId) : false),
    [currentUserId, assigneeIds],
  );

  const canEdit = useMemo(() => {
    if (!data || isLocked) return false;
    if (isAdmin) return true;
    if (!isAssignedToMe) return false;

    return ["ASSIGNED", "IN_PROGRESS", "WAITING_PARTS"].includes(data.status);
  }, [data, isAdmin, isAssignedToMe, isLocked]);

  /* ===============================
     Fetch
  ================================= */

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/repairs/${id}`);

      const mapped: RepairDetail = {
        ...res,
        title: res.problemTitle,
        description: res.problemDescription,
      };

      setData(mapped);
      setUrgency(res.urgency);
      setAssigneeIds((res.assignees || []).map((a: any) => a.userId));
      setNotes(res.notes || "");
      setMessageToReporter(res.messageToReporter || "");
    } catch (err: any) {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentUserId(AuthService.getUserId());
    setIsAdmin(AuthService.isAdmin());
  }, []);

  /* ===============================
     Actions
  ================================= */

  const handleSave = async () => {
    if (!data) return;

    const confirm = await Swal.fire({
      title: "ยืนยันบันทึก?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
    });

    if (!confirm.isConfirmed) return;

    try {
      setSaving(true);

      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          urgency,
          notes,
          messageToReporter,
          assigneeIds,
        },
      });

      await Swal.fire({
        title: "บันทึกสำเร็จ",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });

      await fetchData(); // ✅ no reload
    } catch (err: any) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err?.message || "ไม่สามารถบันทึกได้",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!data) return;

    const { value } = await Swal.fire({
      title: "ยกเลิกงาน",
      input: "textarea",
      showCancelButton: true,
      inputValidator: (v) => (!v ? "กรุณากรอกเหตุผล" : undefined),
    });

    if (!value) return;

    try {
      setSaving(true);
      await apiFetch(`/api/repairs/${data.id}/cancel`, {
        method: "POST",
        body: { reason: value },
      });

      await fetchData();
    } catch (err: any) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err?.message || "ไม่สามารถยกเลิกงานได้",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ===============================
     UI
  ================================= */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        กำลังโหลด...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <button
        onClick={() => router.push("/admin/repairs")}
        className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
      >
        ← กลับไปหน้ารายการ
      </button>

      <Header data={data} />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <ReporterSection data={data} />
          <AssigneeSection data={data} canEdit={canEdit} id={id as string} />
          <DetailSection data={data} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <ManagementPanel
            canEdit={canEdit}
            urgency={urgency}
            setUrgency={setUrgency}
            notes={notes}
            setNotes={setNotes}
            messageToReporter={messageToReporter}
            setMessageToReporter={setMessageToReporter}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}
