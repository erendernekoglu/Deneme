import React, { useState } from 'react';
import { Plus, Edit, Trash2, Building2, Users } from 'lucide-react';
import type { Department } from '../types';
import type { Department as ApiDepartment } from '../types/api';
import { api } from '../lib/api';

interface DepartmentsPageProps {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
}

const DepartmentsPage: React.FC<DepartmentsPageProps> = ({ departments, setDepartments }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const colorOptions = [
    { name: 'Mavi', value: '#3B82F6' },
    { name: 'Yeşil', value: '#10B981' },
    { name: 'Mor', value: '#8B5CF6' },
    { name: 'Turuncu', value: '#F59E0B' },
    { name: 'Kırmızı', value: '#EF4444' },
    { name: 'Pembe', value: '#EC4899' },
    { name: 'İndigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDepartment) {
      const updated = await api.put<ApiDepartment>(`/departments/${editingDepartment.id}`, {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description,
      });
      setDepartments((prev) =>
        prev.map((dept) =>
          dept.id === editingDepartment.id
            ? {
                id: updated.id,
                name: updated.name,
                color: updated.color ?? formData.color,
                description: updated.description ?? formData.description,
              }
            : dept
        )
      );
    } else {
      const created = await api.post<ApiDepartment>('/departments', {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description,
      });
      const newDepartment: Department = {
        id: created.id,
        name: created.name,
        color: created.color ?? formData.color,
        description: created.description ?? formData.description,
      };
      setDepartments((prev) => [newDepartment, ...prev]);
    }
    resetForm();
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description,
      color: department.color,
    });
    setIsModalOpen(true);
  };

  // Persisted delete via API
  const handleDeleteApi = async (id: string) => {
    if (window.confirm('Bu birimi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      await api.del(`/departments/${id}`);
      setDepartments((prev) => prev.filter((dept) => dept.id !== id));
    }
  };

  // Safer variant with better confirmations and error handling
  const handleDeleteApiSafe = async (id: string) => {
    if (!window.confirm('Bu birimi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await api.del(`/departments/${id}`);
      setDepartments((prev) => prev.filter((dept) => dept.id !== id));
      alert('Birim silindi.');
    } catch (e: any) {
      alert(`Silme başarısız: ${e?.message ?? 'Bilinmeyen hata'}`);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu birimi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      setDepartments((prev) => prev.filter((dept) => dept.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setEditingDepartment(null);
    setIsModalOpen(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Birimler</h1>
          <p className="text-gray-600">Şirket birimlerini yönetin</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Yeni Birim Ekle
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <div key={department.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div
              className="h-20 rounded-t-lg flex items-center justify-center"
              style={{ backgroundColor: department.color }}
            >
              <Building2 size={32} className="text-white" />
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">{department.name}</h3>
                  <p className="text-sm text-gray-600">{department.description}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(department)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Düzenle"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteApiSafe(department.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Users size={16} className="mr-2" />
                <span>Birim Rengi: </span>
                <div className="w-4 h-4 rounded-full ml-2" style={{ backgroundColor: department.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Henüz birim eklenmemiş.</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingDepartment ? 'Birim Düzenle' : 'Yeni Birim Ekle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim Adı</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="örn. AR-GE Birimi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Birim açıklaması"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Birim Rengi</label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: option.value })}
                        className={`w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center ${
                          formData.color === option.value ? 'border-gray-800 scale-110' : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: option.value }}
                        title={option.name}
                      >
                        {formData.color === option.value && <Building2 size={20} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Önizleme:</h4>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div
                      className="h-16 rounded-t-lg flex items-center justify-center"
                      style={{ backgroundColor: formData.color }}
                    >
                      <Building2 size={24} className="text-white" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800">{formData.name || 'Birim Adı'}</h3>
                      <p className="text-sm text-gray-600 mt-1">{formData.description || 'Birim açıklaması'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingDepartment ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
