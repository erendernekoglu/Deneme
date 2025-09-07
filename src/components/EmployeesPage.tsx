import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Search, Mail, User, Key } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, Department, Role } from '../types/api';

interface EmployeesPageProps {
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
  departments: Department[];
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({
  selectedDepartment,
  setSelectedDepartment,
  departments,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    role: Role;
    departmentId: string;
    active: boolean;
  }>({
    fullName: '',
    email: '',
    role: 'EMPLOYEE',
    departmentId: '',
    active: true,
  });

  // ---- Load data
  useEffect(() => {
    (async () => {
      try {
        const emps = await api.get<Employee[]>('/employees');
        setEmployees(emps);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- Helpers
  const allEmployees = useMemo(() => {
    const list =
      selectedDepartment === 'all'
        ? employees
        : employees.filter((e) => e.departmentId === selectedDepartment);

    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [employees, selectedDepartment, searchTerm]);

  const getDepartment = (id?: string | null) =>
    departments.find((d) => d.id === id);

  // ---- CRUD
  const openCreate = () => {
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      email: '',
      role: 'EMPLOYEE',
      departmentId: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      role: employee.role,
      departmentId: employee.departmentId || '',
      active: employee.active,
    });
    setIsModalOpen(true);
  };

  const removeEmployee = async (id: string) => {
    if (!confirm('Bu Çalışanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await api.del(`/employees/${id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      alert('Çalışan başarıyla silindi.');
    } catch (e: any) {
      alert(`Silme işlemi başarısız: ${e?.message ?? 'Bilinmeyen hata'}`);
    }
  };

  const setPassword = async (id: string, email: string) => {
    const pwd = window.prompt(`New password for ${email} (min 6 chars):`);
    if (!pwd) return;
    if (pwd.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    try {
      await api.post(`/employees/${id}/password`, { password: pwd });
      alert('Password updated.');
    } catch (e: any) {
      alert(`Password update failed: ${e?.message ?? 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      email: formData.email.trim(),
      fullName: formData.fullName.trim(),
      role: formData.role,
      departmentId: formData.departmentId || undefined,
      active: formData.active,
    };

    if (editingEmployee) {
      const updated = await api.patch<Employee>(
        `/employees/${editingEmployee.id}`,
        payload
      );
      setEmployees((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
    } else {
      const created = await api.post<Employee>('/employees', payload);
      setEmployees((prev) => [created, ...prev]);
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  if (loading) {
    return <div className="p-8">Yükleniyor.</div>;
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Çalışanlar</h1>
          <p className="text-gray-600">Çalışan bilgilerini yönetin</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <Plus size={20} className="mr-2" />
          Yeni Çalışan Ekle
        </button>
      </div>

      {/* �st filtre/arama */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label htmlFor="department-select" className="text-sm font-medium text-gray-700">
            Birim
          </label>
          <select
            id="department-select"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">T�m Birimler</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="�sim, e-posta veya rol ile ara�"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allEmployees.map((employee) => {
          const dept = getDepartment(employee.departmentId);
          return (
            <div
              key={employee.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-4">
                    <User size={24} className="text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {employee.fullName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                          employee.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {employee.role}
                      </span>
                      {dept && (
                        <span className="inline-flex items-center text-gray-500">
                          <span
                            className="w-2.5 h-2.5 rounded-full mr-1.5"
                            style={{ backgroundColor: dept.color || '#CBD5E1' }}
                          />
                          {dept.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          employee.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {employee.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEdit(employee)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="D�zenle"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setPassword(employee.id, employee.email)}
                    className="text-amber-600 hover:text-amber-800 p-1"
                    title="Set Password"
                  >
                    <Key size={16} />
                  </button>
                  <button
                    onClick={() => removeEmployee(employee.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center">
                  <Mail size={16} className="mr-2 text-gray-500" />
                  {employee.email}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allEmployees.length === 0 && (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            {searchTerm
              ? 'Arama kriterlerinize uygun çalışan bulunamadı.'
              : 'Henüz Çalışan eklenmemiş.'}
          </p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as Role })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durum
                    </label>
                    <select
                      value={formData.active ? '1' : '0'}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.value === '1' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="1">Aktif</option>
                      <option value="0">Pasif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birim
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) =>
                      setFormData({ ...formData, departmentId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seçiniz</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingEmployee ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
