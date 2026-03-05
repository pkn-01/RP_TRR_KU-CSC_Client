"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Minus,
  History,
} from "lucide-react";
import { stockService, StockItem } from "@/services/stock.service";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

export default function StockClient() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<StockItem> | null>(
    null,
  );
  const [withdrawItem, setWithdrawItem] = useState<StockItem | null>(null);
  const [withdrawData, setWithdrawData] = useState({
    quantity: 1,
    reference: "",
    note: "",
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockService.getStockItems();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch stock items:", error);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลสต๊อกได้", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      if (editingItem.id) {
        await stockService.updateStockItem(editingItem.id, editingItem);
        Swal.fire({
          icon: "success",
          title: "บันทึกสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        await stockService.createStockItem(editingItem);
        Swal.fire({
          icon: "success",
          title: "เพิ่มรายการสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (error: any) {
      Swal.fire(
        "ข้อผิดพลาด",
        error.message || "ไม่สามารถบันทึกข้อมูลได้",
        "error",
      );
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawItem) return;

    try {
      const userId = localStorage.getItem("userId");
      await stockService.withdrawStockItem(withdrawItem.id, {
        ...withdrawData,
        userId: userId ? parseInt(userId) : undefined,
      });

      Swal.fire({
        icon: "success",
        title: "เบิกสินค้าสำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });

      setWithdrawItem(null);
      setWithdrawData({ quantity: 1, reference: "", note: "" });
      fetchItems();
    } catch (error: any) {
      Swal.fire(
        "ข้อผิดพลาด",
        error.message || "ไม่สามารถเบิกสินค้าได้",
        "error",
      );
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณไม่สามารถย้อนกลับการกระทำนี้ได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        await stockService.deleteStockItem(id);
        Swal.fire("ลบสำเร็จ", "ลบรายการเรียบร้อยแล้ว", "success");
        fetchItems();
      } catch (error: any) {
        Swal.fire(
          "ข้อผิดพลาด",
          error.message || "ไม่สามารถลบข้อมูลได้",
          "error",
        );
      }
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredItems.map((item) => ({
      รหัสสินค้า: item.code,
      ชื่อสินค้า: item.name,
      จำนวนคงเหลือ: item.quantity,
      หมวดหมู่: item.category || "-",
      อัปเดตล่าสุด: new Date(item.updatedAt).toLocaleDateString("th-TH"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(
      wb,
      `Stock_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                setEditingItem({
                  code: "",
                  name: "",
                  quantity: 0,
                  category: "",
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-[#795548] text-white px-4 py-2 rounded-lg hover:bg-[#6d4c41] transition-colors"
            >
              <Plus size={18} />
              <span>เพิ่มรายการใหม่</span>
            </button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">รายการทั้งหมด</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">มีของในสต๊อก</p>
              <p className="text-2xl font-bold text-green-600">
                {items.filter((i) => i.quantity > 0).length}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">สินค้าหมด</p>
              <p className="text-2xl font-bold text-red-600">
                {items.filter((i) => i.quantity <= 0).length}
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหารหัสสินค้าชื่อสินค้า หรือหมวดหมู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    รหัส
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    รายการ
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    หมวดหมู่
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    จำนวนคงเหลือ
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-sm">
                        {item.code}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.category || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            item.quantity > 5
                              ? "bg-green-100 text-green-700"
                              : item.quantity > 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setWithdrawItem(item);
                              setWithdrawData({
                                quantity: 1,
                                reference: "",
                                note: "",
                              });
                            }}
                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="เบิกสินค้า"
                          >
                            <Minus size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="บันทึกจำนวน / แก้ไข"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                หน้า {currentPage} จาก {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="p-2 border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="p-2 border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#795548] text-white">
              <h2 className="text-lg font-bold">
                {editingItem?.id
                  ? "แก้ไขรายการ / บันทึกจำนวน"
                  : "เพิ่มรายการใหม่"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="hover:bg-white/10 p-1 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    รหัสสินค้า
                  </label>
                  <input
                    required
                    type="text"
                    value={editingItem?.code || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem!, code: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    จำนวนคงเหลือ
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={editingItem?.quantity ?? ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem!,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  ชื่อรายการ
                </label>
                <input
                  required
                  type="text"
                  value={editingItem?.name || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem!, name: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  หมวดหมู่
                </label>
                <input
                  type="text"
                  value={editingItem?.category || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem!,
                      category: e.target.value,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                />
              </div>
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#795548] text-white hover:bg-[#6d4c41] transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {withdrawItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-600 text-white">
              <h2 className="text-lg font-bold text-white">
                เบิกสินค้า: {withdrawItem.name}
              </h2>
              <button
                onClick={() => setWithdrawItem(null)}
                className="hover:bg-white/10 p-1 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  จำนวนที่เบิก (คงเหลือ: {withdrawItem.quantity})
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  max={withdrawItem.quantity}
                  value={withdrawData.quantity}
                  onChange={(e) =>
                    setWithdrawData({
                      ...withdrawData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  เลขอ้างอิง / ใบงาน (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น REP-20240305-001"
                  value={withdrawData.reference}
                  onChange={(e) =>
                    setWithdrawData({
                      ...withdrawData,
                      reference: e.target.value,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  หมายเหตุ
                </label>
                <textarea
                  placeholder="ระบุเหตุผลการเบิก"
                  value={withdrawData.note}
                  onChange={(e) =>
                    setWithdrawData({ ...withdrawData, note: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[80px]"
                />
              </div>
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWithdrawItem(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={withdrawItem.quantity <= 0}
                  className="flex-1 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  ยืนยันการเบิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
