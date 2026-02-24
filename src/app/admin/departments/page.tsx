"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Plus, Trash2, Edit2 } from "lucide-react";
import AdminDepartmentModal from "@/components/modals/AdminDepartmentModal";
import Swal from "sweetalert2";
import { departmentService, Department } from "@/services/department.service";

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = {
    total: departments.length,
  };

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await departmentService.getAllDepartments();
      setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      return dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [departments, searchQuery]);

  const handleSaveDepartment = async (data: Partial<Department>) => {
    try {
      if (!selectedDepartment) {
        await departmentService.createDepartment(data);
        Swal.fire("สำเร็จ", "เพิ่มแผนกเรียบร้อยแล้ว", "success");
      } else {
        await departmentService.updateDepartment(selectedDepartment.id, data);
        Swal.fire("สำเร็จ", "แก้ไขข้อมูลแผนกเรียบร้อยแล้ว", "success");
      }
      // แจ้ง event ไปยังหน้าอื่น ๆ ว่ามีการอัปเดตแผนก
      window.dispatchEvent(new Event("departments-updated"));
      fetchDepartments();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving department:", err);
      const isConflict =
        err.message?.includes("409") || err.response?.status === 409;
      Swal.fire(
        "เกิดข้อผิดพลาด",
        isConflict ? "รหัสแผนกนี้มีการใช้งานแล้ว" : "ไม่สามารถบันทึกข้อมูลได้",
        "error",
      );
    }
  };

  const confirmDelete = async (dept: Department) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบแผนก",
      text: `ต้องการลบแผนก "${dept.name}" หรือไม่? การลบอาจมีผลกับข้อมูลที่เชื่อมโยง`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      await departmentService.deleteDepartment(dept.id);
      await Swal.fire("ลบสำเร็จ!", "ข้อมูลแผนกถูกลบแล้ว", "success");
      // แจ้ง event ไปยังหน้าอื่น ๆ ว่ามีการอัปเดตแผนก
      window.dispatchEvent(new Event("departments-updated"));
      fetchDepartments();
    } catch {
      Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  if (isLoading && departments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">จัดการแผนก</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <span className="text-sm text-gray-600">จำนวนแผนกทั้งหมด</span>
            <div className="mt-2 text-3xl font-bold text-[#795548]">
              {stats.total}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="ค้นหาชื่อแผนก"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#795548]"
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          <button
            onClick={() => {
              setSelectedDepartment(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-[#795548] text-white rounded-lg text-sm hover:bg-[#5d3f35] flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
          >
            <Plus size={16} />
            เพิ่มแผนกใหม่
          </button>
        </div>

        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                    ชื่อแผนก
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 text-right">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {dept.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedDepartment(dept);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => confirmDelete(dept)}
                          className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDepartments.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลแผนก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminDepartmentModal
        department={selectedDepartment}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDepartment(null);
        }}
        onSave={handleSaveDepartment}
      />
    </div>
  );
}
