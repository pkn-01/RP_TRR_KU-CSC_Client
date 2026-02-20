type Urgency = "NORMAL" | "URGENT" | "CRITICAL";

interface ManagementPanelProps {
  canEdit: boolean;
  urgency: Urgency;
  setUrgency: (v: Urgency) => void;
  notes: string;
  setNotes: (v: string) => void;
  messageToReporter: string;
  setMessageToReporter: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export default function ManagementPanel({
  canEdit,
  urgency,
  setUrgency,
  notes,
  setNotes,
  messageToReporter,
  setMessageToReporter,
  onSave,
  onCancel,
  saving,
}: ManagementPanelProps) {
  return (
    <div className="border rounded-xl p-5 space-y-4">
      <select
        value={urgency}
        onChange={(e) => setUrgency(e.target.value as Urgency)}
        disabled={!canEdit}
        className="w-full border rounded-lg p-2"
      >
        <option value="NORMAL">ปกติ</option>
        <option value="URGENT">ด่วน</option>
        <option value="CRITICAL">ด่วนมาก</option>
      </select>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={!canEdit}
        className="w-full border rounded-lg p-2"
        placeholder="หมายเหตุ"
      />

      <textarea
        value={messageToReporter}
        onChange={(e) => setMessageToReporter(e.target.value)}
        disabled={!canEdit}
        className="w-full border rounded-lg p-2"
        placeholder="แจ้งผู้แจ้ง"
      />

      {canEdit && (
        <>
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 rounded-lg"
          >
            บันทึก
          </button>

          <button
            onClick={onCancel}
            disabled={saving}
            className="w-full bg-red-500 text-white py-2 rounded-lg"
          >
            ยกเลิกงาน
          </button>
        </>
      )}
    </div>
  );
}
