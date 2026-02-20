const statusLabels: Record<string, string> = {
  PENDING: "รอรับงาน",
  ASSIGNED: "มอบหมายแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  WAITING_PARTS: "รออะไหล่",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  WAITING_PARTS: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};

interface HeaderProps {
  data: {
    ticketCode: string;
    createdAt: string;
    status: string;
  };
}

export default function Header({ data }: HeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-xl font-bold">{data.ticketCode}</h1>
        <p className="text-sm text-gray-400">
          {new Date(data.createdAt).toLocaleString("th-TH")}
        </p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[data.status] || "bg-gray-200 text-gray-600"}`}
      >
        {statusLabels[data.status] || data.status}
      </span>
    </div>
  );
}
