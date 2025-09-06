import React, { useState } from 'react';
import { Plus, Edit, Trash2, Clock, Palette } from 'lucide-react';
import { ShiftTemplate, Department } from '../types';

interface ShiftTemplatesPageProps {
  shiftTemplates: ShiftTemplate[];
  setShiftTemplates: React.Dispatch<React.SetStateAction<ShiftTemplate[]>>;
  departments: Department[];
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
}

const ShiftTemplatesPage: React.FC<ShiftTemplatesPageProps> = ({ 
  shiftTemplates, 
  setShiftTemplates, 
  departments, 
  selectedDepartment, 
  setSelectedDepartment 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startTime: '',
    endTime: '',
    color: '#FEF3C7',
    departmentId: ''
  });

  const colorOptions = [
    { name: 'Sarı', value: '#FEF3C7', text: 'text-yellow-800' },
    { name: 'Turuncu', value: '#FED7AA', text: 'text-orange-800' },
    { name: 'Mor', value: '#E9D5FF', text: 'text-purple-800' },
    { name: 'Mavi', value: '#DBEAFE', text: 'text-blue-800' },
    { name: 'Yeşil', value: '#D1FAE5', text: 'text-green-800' },
    { name: 'Kırmızı', value: '#FEE2E2', text: 'text-red-800' },
  ];

  const allTemplates = selectedDepartment === 'all' 
    ? shiftTemplates 
    : shiftTemplates.filter(template => template.departmentId === selectedDepartment);

  const getDepartment = (id: string) => departments.find(d => d.id === id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      setShiftTemplates(prev => prev.map(template => 
        template.id === editingTemplate.id 
          ? { ...template, ...formData }
          : template
      ));
    } else {
      const newTemplate: ShiftTemplate = {
        id: Date.now().toString(),
        ...formData
      };
      setShiftTemplates(prev => [...prev, newTemplate]);
    }
    resetForm();
  };

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      code: template.code,
      startTime: template.startTime,
      endTime: template.endTime,
      color: template.color,
      departmentId: template.departmentId
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu vardiya şablonunu silmek istediğinizden emin misiniz?')) {
      setShiftTemplates(prev => prev.filter(template => template.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', code: '', startTime: '', endTime: '', color: '#FEF3C7', departmentId: '' });
    setEditingTemplate(null);
    setIsModalOpen(false);
  };

  const getColorOption = (color: string) => {
    return colorOptions.find(option => option.value === color) || colorOptions[0];
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Vardiya Şablonları</h1>
          <p className="text-gray-600">Vardiya türlerini ve saat aralıklarını yönetin</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Yeni Şablon Ekle
        </button>
      </div>

      {/* Department Filter */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Birim Filtresi:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Birimler</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allTemplates.map((template) => {
          const colorOption = getColorOption(template.color);
          const department = getDepartment(template.departmentId);
          return (
            <div key={template.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div 
                className="h-24 rounded-t-lg flex items-center justify-center"
                style={{ backgroundColor: template.color }}
              >
                <div className="text-center">
                  <div className={`text-4xl font-bold ${colorOption.text} mb-1`}>
                    {template.code}
                  </div>
                  <div className={`text-sm ${colorOption.text} font-medium`}>
                    {template.name}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-gray-600">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm">
                      {template.startTime} - {template.endTime}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">
                    Renk: {colorOption.name}
                  </div>
                  {department && (
                    <div className="flex items-center text-sm text-gray-500">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: department.color }}
                      ></div>
                      {department.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allTemplates.length === 0 && (
        <div className="text-center py-12">
          <Clock size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Henüz vardiya şablonu eklenmemiş.</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Ekle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vardiya Adı
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kısa Kod
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="örn. G"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birim
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Birim Seçin</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlangıç Saati
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bitiş Saati
                    </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Renk Seçimi
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: option.value })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === option.value 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: option.value }}
                        title={option.name}
                      />
                    ))}
                  </div>
                </div>
                {/* Preview */}
                <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Önizleme:</h4>
                  <div 
                    className="rounded-lg p-4 text-center"
                    style={{ backgroundColor: formData.color }}
                  >
                    <div className={`text-2xl font-bold ${getColorOption(formData.color).text} mb-1`}>
                      {formData.code || 'KOD'}
                    </div>
                    <div className={`text-sm ${getColorOption(formData.color).text} font-medium mb-2`}>
                      {formData.name || 'Vardiya Adı'}
                    </div>
                    <div className={`text-xs ${getColorOption(formData.color).text}`}>
                      {formData.startTime || '00:00'} - {formData.endTime || '00:00'}
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
                  {editingTemplate ? 'Güncelle' : 'Ekle'}
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