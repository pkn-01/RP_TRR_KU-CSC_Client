"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  Plus,
  Search,
  Edit2,
  Trash2,
  Minus,
  PackagePlus,
  History,
  ChevronLeft,
  ChevronRight,
  X,
  BookX,
  AlertTriangle,
  Package,
  CheckCircle2,
  XCircle,
  Upload,
} from "lucide-react";
import {
  stockService,
  StockItem,
  StockTransaction,
} from "@/services/stock.service";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

export default function StockClient() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<StockItem> | null>(
    null,
  );
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewBrand, setIsNewBrand] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [withdrawItem, setWithdrawItem] = useState<StockItem | null>(null);
  const [withdrawData, setWithdrawData] = useState({
    quantity: 1,
    reference: "",
    note: "",
  });
  const [addStockItem, setAddStockItem] = useState<StockItem | null>(null);
  const [addStockData, setAddStockData] = useState({
    quantity: 1,
    reference: "",
    note: "",
  });
  const [transactionItem, setTransactionItem] = useState<StockItem | null>(
    null,
  );
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<Partial<StockItem>[]>([]);
  const [isImporting, setIsImporting] = useState(false);

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

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [items]);

  const brands = useMemo(() => {
    const b = new Set(items.map((i) => i.name).filter(Boolean));
    return Array.from(b).sort();
  }, [items]);

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

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStockItem) return;

    try {
      const userId = localStorage.getItem("userId");
      await stockService.addStockItem(addStockItem.id, {
        ...addStockData,
        userId: userId ? parseInt(userId) : undefined,
      });

      Swal.fire({
        icon: "success",
        title: "รับสินค้าเข้าสำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });

      setAddStockItem(null);
      setAddStockData({ quantity: 1, reference: "", note: "" });
      fetchItems();
    } catch (error: any) {
      Swal.fire(
        "ข้อผิดพลาด",
        error.message || "ไม่สามารถรับสินค้าเข้าได้",
        "error",
      );
    }
  };

  const handleViewTransactions = async (item: StockItem) => {
    setTransactionItem(item);
    setLoadingTransactions(true);
    try {
      const data = await stockService.getTransactions(item.id);
      setTransactions(data);
    } catch {
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดประวัติได้", "error");
    } finally {
      setLoadingTransactions(false);
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

  const handleDeleteCategory = async (name: string) => {
    const result = await Swal.fire({
      title: `ลบสี/ประเภท "${name}"?`,
      text: "รายการสินค้าในสี/ประเภทนี้ทั้งหมดจะถูกเปลี่ยนเป็น 'ไม่ระบุ'",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        await stockService.deleteCategory(name);
        await fetchItems();
        Swal.fire("สำเร็จ", "ลบสี/ประเภทเรียบร้อยแล้ว", "success");
      } catch (error: any) {
        Swal.fire(
          "ข้อผิดพลาด",
          error.message || "ไม่สามารถลบสี/ประเภทได้",
          "error",
        );
      }
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredItems.map((item) => ({
      ยี่ห้อ: item.name,
      รหัส: item.code,
      "สี/ประเภท": item.category || "-",
      จำนวน: item.quantity,
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

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // อ่าน header ตาม column ลำดับเป็น fallback
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        }) as any[][];
        const headerRow =
          rawRows.length > 0
            ? rawRows[0].map((h: any) => String(h ?? "").trim())
            : [];

        const mappedData: Partial<StockItem>[] = jsonData.map((row, rowIdx) => {
          const keys = Object.keys(row);

          // ฟังก์ชัน match ที่ยืดหยุ่นกว่าเดิม — ใช้ includes แทน exact match
          const getVal = (possibleNames: string[]) => {
            const foundKey = keys.find((k) =>
              possibleNames.some((pn) => {
                const kNorm = k.trim().toLowerCase();
                const pnNorm = pn.toLowerCase();
                return (
                  kNorm === pnNorm ||
                  kNorm.includes(pnNorm) ||
                  pnNorm.includes(kNorm)
                );
              }),
            );
            if (!foundKey) return "";
            const val = row[foundKey];
            if (val === null || val === undefined) return "";
            return String(val).trim();
          };

          let name = getVal(["ยี่ห้อ", "brand", "ชื่อ", "name", "ชื่อสินค้า"]);
          let code = getVal(["รหัส", "code", "model", "รหัสสินค้า", "sku"]);

          let category = getVal([
            "สี/ประเภท",
            "สี",
            "ประเภท",
            "color",
            "type",
            "category",
            "หมวดหมู่",
          ]);
          // Fallback: column ที่มี suffix _1 หรือ _2 (XLSX จะเปลี่ยนชื่อ column ซ้ำ)
          if (!category) {
            const altKey = keys.find(
              (k) => k.includes("_1") || k.includes("_2"),
            );
            if (altKey) {
              const val = row[altKey];
              if (val !== null && val !== undefined) {
                category = String(val).trim();
              }
            }
          }

          let quantity =
            parseInt(
              getVal(["จำนวน", "qty", "quantity", "stock", "จำนวนคงเหลือ"]) ||
                "0",
            ) || 0;

          // Fallback: ถ้า name หรือ code ยังว่าง ให้ลอง map ตาม column ลำดับ (A=name, B=code, C=category, D=qty)
          if (!name || !code) {
            const dataRow = rawRows[rowIdx + 1]; // +1 เพราะ row 0 = header
            if (dataRow && dataRow.length >= 2) {
              if (!name && dataRow[0] !== null && dataRow[0] !== undefined) {
                name = String(dataRow[0]).trim();
              }
              if (!code && dataRow[1] !== null && dataRow[1] !== undefined) {
                code = String(dataRow[1]).trim();
              }
              if (
                !category &&
                dataRow[2] !== null &&
                dataRow[2] !== undefined
              ) {
                category = String(dataRow[2]).trim();
              }
              if (
                !quantity &&
                dataRow[3] !== null &&
                dataRow[3] !== undefined
              ) {
                quantity = parseInt(String(dataRow[3])) || 0;
              }
            }
          }

          return { name, code, category, quantity };
        });

        const validItems = mappedData.filter((i) => i.code && i.name);
        const skippedCount = mappedData.length - validItems.length;

        if (validItems.length === 0) {
          Swal.fire(
            "ไม่พบข้อมูล",
            "กรุณาตรวจสอบว่าชื่อหัวคอลัมน์ใน Excel ถูกต้อง (ยี่ห้อ, รหัส, จำนวน)",
            "warning",
          );
          return;
        }

        // แจ้งเตือนถ้ามีรายการที่ถูกกรองออก
        if (skippedCount > 0) {
          console.warn(
            `⚠️ Bulk import: ข้ามไป ${skippedCount} แถว (ไม่มี code หรือ name)`,
          );
          console.table(mappedData.filter((i) => !i.code || !i.name));
        }

        setImportData(validItems);
        setIsImportModalOpen(true);
        // Reset input
        e.target.value = "";
      } catch (error) {
        console.error("Import error:", error);
        Swal.fire("ข้อผิดพลาด", "ไม่สามารถอ่านไฟล์ Excel ได้", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    if (importData.length === 0) return;

    try {
      setIsImporting(true);
      const result = await stockService.bulkImportStockItems(importData);

      const errorCount = result.errors?.length || 0;
      let htmlMsg = `สร้างใหม่: ${result.created} รายการ<br/>อัปเดต: ${result.updated} รายการ`;
      if (errorCount > 0) {
        htmlMsg += `<br/><span style="color:red">ผิดพลาด: ${errorCount} รายการ</span>`;
        htmlMsg += `<br/><small>${result.errors
          .slice(0, 5)
          .map((e: any) => `${e.code}: ${e.error}`)
          .join("<br/>")}</small>`;
        if (errorCount > 5)
          htmlMsg += `<br/><small>...และอีก ${errorCount - 5} รายการ</small>`;
      }

      Swal.fire({
        icon: errorCount > 0 ? "warning" : "success",
        title:
          errorCount > 0 ? "นำเข้าข้อมูลบางส่วนสำเร็จ" : "นำเข้าข้อมูลสำเร็จ",
        html: htmlMsg,
      });

      setIsImportModalOpen(false);
      fetchItems();
    } catch (error: any) {
      Swal.fire(
        "ข้อผิดพลาด",
        error.message || "ไม่สามารถนำเข้าข้อมูลได้",
        "error",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !categoryFilter || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getStockLevel = (item: StockItem) => {
    if (item.quantity <= 0)
      return {
        label: "หมด",
        bg: "bg-red-100",
        text: "text-red-700",
      };
    if (item.quantity <= 5)
      return {
        label: "ใกล้หมด",
        bg: "bg-yellow-100",
        text: "text-yellow-700",
      };
    return {
      label: "ปกติ",
      bg: "bg-green-100",
      text: "text-green-700",
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Export
            </button>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileImport}
                className="hidden"
                id="import-excel"
              />
              <label
                htmlFor="import-excel"
                className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium cursor-pointer"
              >
                <Upload size={16} />
                Import
              </label>
            </div>
            <button
              onClick={() => {
                setEditingItem({
                  code: "",
                  name: "",
                  quantity: 0,
                  category: "",
                });
                setIsNewCategory(false);
                setIsNewBrand(false);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-[#795548] text-white px-4 py-2 rounded-lg hover:bg-[#6d4c41] transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              เพิ่มรายการใหม่
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                รายการทั้งหมด
              </p>
              <p className="text-2xl font-bold mt-1">{items.length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                มีของในสต๊อก
              </p>
              <p className="text-2xl font-bold mt-1 text-green-600">
                {items.filter((i) => i.quantity > 0).length}
              </p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                สินค้าหมด
              </p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {items.filter((i) => i.quantity <= 0).length}
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="ค้นหายี่ห้อ, รหัส หรือ สี/ประเภท..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548] text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548] bg-white"
            >
              <option value="">สี/ประเภททั้งหมด</option>
              {categories.map((cat) => (
                <option key={cat} value={cat!}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              title="จัดการสี/ประเภท"
              className="p-2 text-gray-400 hover:text-[#795548] hover:bg-[#795548]/5 rounded-lg transition-colors border border-gray-200"
            >
              <BookX size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ยี่ห้อ
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    รหัส
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    สี/ประเภท
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    จำนวน
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    สถานะ
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
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
                  paginatedItems.map((item) => {
                    const level = getStockLevel(item);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-600">
                          {item.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.category || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold text-gray-900">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${level.bg} ${level.text}`}
                          >
                            {level.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <button
                              title="รับสินค้าเข้า"
                              onClick={() => {
                                setAddStockItem(item);
                                setAddStockData({
                                  quantity: 1,
                                  reference: "",
                                  note: "",
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Plus size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setWithdrawItem(item);
                                setWithdrawData({
                                  quantity: 1,
                                  reference: "",
                                  note: "",
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={item.quantity <= 0}
                            >
                              <Minus size={18} />
                            </button>
                            <button
                              title="ดูประวัติ"
                              onClick={() => handleViewTransactions(item)}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <History size={18} />
                            </button>
                            <button
                              title="แก้ไข"
                              onClick={() => {
                                setEditingItem(item);
                                setIsNewCategory(false);
                                setIsNewBrand(false);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              title="ลบ"
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                แสดง{" "}
                {Math.min(
                  (currentPage - 1) * itemsPerPage + 1,
                  filteredItems.length,
                )}{" "}
                - {Math.min(currentPage * itemsPerPage, filteredItems.length)}{" "}
                จาก {filteredItems.length} รายการ
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="p-2 border border-gray-300"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="p-2 border border-gray-300"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Modal */}
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
                className="hover:bg-white/10 px-2 py-1 rounded transition-colors text-sm"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    รหัส <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={editingItem?.code || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem!, code: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    จำนวน <span className="text-red-500">*</span>
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  ยี่ห้อ <span className="text-red-500">*</span>
                </label>
                {!isNewBrand ? (
                  <select
                    value={editingItem?.name || ""}
                    onChange={(e) => {
                      if (e.target.value === "__new_brand__") {
                        setIsNewBrand(true);
                        setEditingItem({
                          ...editingItem!,
                          name: "",
                        });
                      } else {
                        setEditingItem({
                          ...editingItem!,
                          name: e.target.value,
                        });
                      }
                    }}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548] bg-white"
                  >
                    <option value="">-- เลือกยี่ห้อ --</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                    <option value="__new_brand__">+ เพิ่มยี่ห้อใหม่...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="พิมพ์ชื่อยี่ห้อใหม่"
                      value={editingItem?.name || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem!,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewBrand(false);
                        setEditingItem({
                          ...editingItem!,
                          name: "",
                        });
                      }}
                      className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    สี/ประเภท
                  </label>
                  {!isNewCategory ? (
                    <select
                      value={editingItem?.category || ""}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setIsNewCategory(true);
                          setEditingItem({
                            ...editingItem!,
                            category: "",
                          });
                        } else {
                          setEditingItem({
                            ...editingItem!,
                            category: e.target.value,
                          });
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548] bg-white"
                    >
                      <option value="">-- เลือกสี/ประเภท --</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat!}>
                          {cat}
                        </option>
                      ))}
                      <option value="__new__">+ เพิ่มสี/ประเภทใหม่...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="พิมพ์สี/ประเภทใหม่"
                        value={editingItem?.category || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem!,
                            category: e.target.value,
                          })
                        }
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#795548]/20 focus:border-[#795548]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCategory(false);
                          setEditingItem({
                            ...editingItem!,
                            category: "",
                          });
                        }}
                        className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#795548] text-white hover:bg-[#6d4c41] transition-colors text-sm font-medium"
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
                className="hover:bg-white/10 px-2 py-1 rounded transition-colors text-sm"
              >
                <X size={20} />
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[80px]"
                />
              </div>
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWithdrawItem(null)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={withdrawItem.quantity <= 0}
                  className="flex-1 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                >
                  ยืนยันการเบิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {addStockItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-600 text-white">
              <h2 className="text-lg font-bold text-white">
                รับสินค้าเข้า: {addStockItem.name}
              </h2>
              <button
                onClick={() => setAddStockItem(null)}
                className="hover:bg-white/10 px-2 py-1 rounded transition-colors text-sm"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  จำนวนที่รับเข้า (คงเหลือ: {addStockItem.quantity})
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={addStockData.quantity}
                  onChange={(e) =>
                    setAddStockData({
                      ...addStockData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  เลขอ้างอิง / ใบสั่งซื้อ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น PO-20240305-001"
                  value={addStockData.reference}
                  onChange={(e) =>
                    setAddStockData({
                      ...addStockData,
                      reference: e.target.value,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  หมายเหตุ
                </label>
                <textarea
                  placeholder="ระบุรายละเอียด"
                  value={addStockData.note}
                  onChange={(e) =>
                    setAddStockData({ ...addStockData, note: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 min-h-[80px]"
                />
              </div>
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAddStockItem(null)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  ยืนยันรับเข้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {transactionItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#6d4c41] text-white">
              <h2 className="text-lg font-bold text-white">
                ประวัติ: {transactionItem.name} ({transactionItem.code})
              </h2>
              <button
                onClick={() => setTransactionItem(null)}
                className="hover:bg-white/10 px-2 py-1 rounded transition-colors text-sm"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingTransactions ? (
                <div className="p-8 text-center text-gray-400">
                  กำลังโหลดประวัติ...
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  ยังไม่มีประวัติการเคลื่อนไหว
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                        วันที่
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                        ประเภท
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                        จำนวน
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                        ก่อน → หลัง
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                        อ้างอิง
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                        หมายเหตุ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {new Date(tx.createdAt).toLocaleString("th-TH", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tx.type === "IN"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {tx.type === "IN" ? "รับเข้า" : "เบิกออก"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {tx.type === "IN" ? "+" : "-"}
                          {tx.quantity}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {tx.previousQty} → {tx.newQty}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {tx.reference || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">
                          {tx.note || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 text-gray-700">
              <h2 className="text-lg font-bold">จัดการสี/ประเภท</h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="hover:bg-gray-200 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  ยังไม่มีสี/ประเภท
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {cat}
                      </span>
                      <button
                        onClick={() => handleDeleteCategory(cat!)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="ลบสี/ประเภท"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Upload size={20} />
                <h2 className="text-lg font-bold text-white">
                  ตรวจสอบข้อมูลก่อนนำเข้า
                </h2>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="hover:bg-white/10 px-2 py-1 rounded transition-colors text-sm text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
              <p>
                พบข้อมูลทั้งหมด <strong>{importData.length}</strong> รายการ
                กรุณาตรวจสอบความถูกต้องก่อนกดบันทึก
              </p>
              <p className="mt-1 text-xs opacity-80">
                * หากมีข้อมูล <strong>(รหัส + ยี่ห้อ + สี/ประเภท)</strong>{" "}
                ซ้ำกับในระบบ ระบบจะทำการอัปเดตจำนวนคงเหลือแทนการเพิ่มใหม่
              </p>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      ยี่ห้อ
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      รหัส
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      สี/ประเภท
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                      จำนวน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-sm">{item.name}</td>
                      <td className="px-4 py-2.5 text-sm font-mono text-gray-600">
                        {item.code}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {item.category || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right font-medium">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-100 flex items-center gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={isImporting || importData.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    กำลังนำเข้า...
                  </>
                ) : (
                  "ยืนยันนำเข้าข้อมูล"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
