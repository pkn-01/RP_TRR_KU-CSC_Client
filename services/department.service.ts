import { apiFetch } from './api';

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  headName?: string;
  createdAt: string;
  updatedAt: string;
}

export const departmentService = {
  async getAllDepartments(): Promise<Department[]> {
    return apiFetch(`/departments`);
  },

  async getDepartmentById(id: number): Promise<Department> {
    return apiFetch(`/departments/${id}`);
  },

  async createDepartment(data: Partial<Department>): Promise<Department> {
    return apiFetch('/departments', 'POST', data);
  },

  async updateDepartment(id: number, data: Partial<Department>): Promise<Department> {
    // Backend uses PATCH
    return apiFetch(`/departments/${id}`, 'PATCH', data);
  },

  async deleteDepartment(id: number): Promise<void> {
    return apiFetch(`/departments/${id}`, 'DELETE');
  },
};
