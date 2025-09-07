import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import { api } from '../lib/api';
import type { Department, ShiftTemplate } from '../types/api';
import { toHHmm, toMinutes } from '../lib/time';

interface ShiftTemplatesPageProps {
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
  departments: Department[];
}

const colorOptions = [
  { name: 'Sarý',   value: '#FEF3C7', text: 'text-yellow-800' },
  { name: 'Turuncu', value: '#FED7AA', text: 'text-orange-800' },
  { name: 'Mor',    value: '#E9D5FF', text: 'text-purple-800' },
  { name: 'Mavi',   value: '#DBEAFE', text: 'text-blue-800' },
  { name: 'Yeþil',  value: '#D1FAE5', text: 'text-green-800' },
  { name: 'Kýrmýzý', value: '#FEE2E2', text: 'text-red-800' },
];

const getColorOption = (color: string) =>
  colorOptions.find((o) => o.value === color) || colorOptions[0];

const ShiftTemplatesPage: React.FC<ShiftTemplatesPageProps> = ({
  selectedDepartment,
  setSelectedDepartment,
  departments,
}) => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    color: string;
    departmentId: string;
  }>({
    name: '',
    code: '',
    startTime: '',
    endTime: '',
    color: '#FEF3C7',
    departmentId: '',
  });

  // Þablonlarý yükle
  useEffect(() => {
    (async () => {
      try {
        const tpls = await api.get<ShiftTemplate[]>('/shift-templates');
        setTemplates(tpls);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 'Genel' (global) þablon desteði: adý 'Genel' veya 'General' olan birim tüm birimlerde geçerli sayýlýr
  const generalDeptId = useMemo(() => {
    const m = departments.find((d) => d.name?.toLowerCase() === 'genel' || d.name?.toLowerCase() === 'general');
    return m?.id ?? null;
  }, [departments]);

  // Departman filtresi (seçili birim + Genel)
  const list = useMemo(() => {
    if (selectedDepartment === 'all') return templates;
    return templates.filter(
      (t) => t.departmentId === selectedDepartment || (generalDeptId && t.departmentId === generalDeptId)
    );
  }, [templates, selectedDepartment, generalDeptId]);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      name: '',
      code: '',
      startTime: '',
      endTime: '',
      color: '#FEF3C7',
      departmentId: selectedDepartment !== 'all' ? selectedDepartment : '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (t: ShiftTemplate) => {
    setEditing(t);
    setFormData({
      name: t.name,
      code: t.code,
      startTime: toHHmm(t.startMinutes),
      endTime: toHHmm(t.endMinutes),
      color: t.color,
      departmentId: t.departmentId,
    });
    setIsModalOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm('Bu vardiya þablonunu silmek istediðinize emin misiniz?')) return;
    await api.del(`/shift-templates/${id}`);
    setTemplates((prev) => prev.filter((x) => x.id !== id));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      color: formData.color,
      departmentId: formData.departmentId,
      // Server accepts either (start,end) as HH:mm or numeric minutes
      start: formData.startTime,
      end: formData.endTime,
    };

    if (editing) {
      const updated = await api.patch<ShiftTemplate>(
        `/shift-templates/${editing.id}`,
        payload
      );
      setTemplates((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } else {
      const created = await api.post<ShiftTemplate>('/shift-templates', payload);
      setTemplates((prev) => [created, ...prev]);
    }
    setIsModalOpen(false);
    setEditing(null);
  };

  if (loading) return <div className="p-8">Yükleniyor…</div>;

  return (
    <div className="p-8">
      {/* Baþlýk */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Vardiya Þablonlarý</h1>
          <p className="text-gray-600">Vardiya türlerini ve saat aralýklarýný yönetin</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Yeni Þablon Ekle
        </button>
      </div>

      {/* Birim Filtresi */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label htmlFor="department-select" className="text-sm font-medium text-gray-700">
            Birim Filtresi
          </label>
          <select
            id="department-select"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Birimler</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((t) => {
          const col = getColorOption(t.color);
          const dept = departments.find((d) => d.id === t.departmentId);
          return (
            <div key={t.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="h-24 rounded-t-lg flex items-center justify-center" style={{ backgroundColor: t.color }}>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${col.text} mb-1`}>{t.code}</div>
                  <div className={`text-sm ${col.text} font-medium`}>{t.name}</div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-gray-600">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm">
                      {toHHmm(t.startMinutes)} - {toHHmm(t.endMinutes)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Düzenle"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => remove(t.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {dept && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: dept.color || '#CBD5E1' }}
                    />
                    {dept.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="text-center py-12">
          <Clock size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Henüz vardiya þablonu eklenmemiþ.</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editing ? 'Þablon Düzenle' : 'Yeni Þablon Ekle'}
            </h2>
            <form onSubmit={submit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vardiya Adý</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="örn. Gündüz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kýsa Kod</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="örn. G"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Birim Seçin</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Baþlangýç Saati</label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bitiþ Saati</label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renk Seçimi</label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: o.value })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === o.value ? 'border-gray-800 scale-110' : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: o.value }}
                        title={o.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Önizleme */}
                <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Önizleme:</h4>
                  <div className="rounded-lg p-4 text-center" style={{ backgroundColor: formData.color }}>
                    <div className={`text-2xl font-bold ${getColorOption(formData.color).text} mb-1`}>
                      {formData.code || 'KOD'}
                    </div>
                    <div className={`text-sm ${getColorOption(formData.color).text} font-medium mb-2`}>
                      {formData.name || 'Vardiya Adý'}
                    </div>
                    <div className={`text-xs ${getColorOption(formData.color).text}`}>
                      {(formData.startTime || '00:00')} - {(formData.endTime || '00:00')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditing(null);
                  }}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Ýptal
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {editing ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftTemplatesPage;
