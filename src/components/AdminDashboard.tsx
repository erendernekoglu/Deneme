import React from 'react';
import { Users, Calendar, Clock, TrendingUp, Building2 } from 'lucide-react';
import { Employee, ShiftTemplate, ShiftAssignment, Department } from '../types';

interface AdminDashboardProps {
  departments: Department[];
  employees: Employee[];
  shiftTemplates: ShiftTemplate[];
  shiftAssignments: ShiftAssignment[];
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  departments, 
  employees, 
  shiftTemplates, 
  shiftAssignments, 
  selectedDepartment, 
  setSelectedDepartment 
}) => {
  const today = new Date();
  const todayAssignments = shiftAssignments.filter(a => a.date === today.toISOString().split('T')[0]);

  const filteredEmployees = selectedDepartment === 'all' 
    ? employees 
    : employees.filter(emp => emp.departmentId === selectedDepartment);

  const filteredShiftTemplates = selectedDepartment === 'all' 
    ? shiftTemplates 
    : shiftTemplates.filter(template => template.departmentId === selectedDepartment);

  const filteredAssignments = selectedDepartment === 'all' 
    ? shiftAssignments 
    : shiftAssignments.filter(assignment => {
        const employee = employees.find(emp => emp.id === assignment.employeeId);
        return employee?.departmentId === selectedDepartment;
      });

  const stats = [
    {
      title: 'Toplam Birim',
      value: departments.length,
      icon: Building2,
      color: 'bg-purple-500',
    },
    {
      title: 'Toplam Çalışan',
      value: filteredEmployees.length,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Aktif Vardiyalar',
      value: filteredShiftTemplates.length,
      icon: Clock,
      color: 'bg-green-500',
    },
    {
      title: 'Bugünkü Atamalar',
      value: todayAssignments.filter(assignment => {
        const employee = employees.find(emp => emp.id === assignment.employeeId);
        return selectedDepartment === 'all' || employee?.departmentId === selectedDepartment;
      }).length,
      icon: Calendar,
      color: 'bg-orange-500',
    },
  ];

  const getShiftTemplate = (id: string) => filteredShiftTemplates.find(t => t.id === id);
  const getEmployee = (id: string) => employees.find(e => e.id === id);
  const getDepartment = (id: string) => departments.find(d => d.id === id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Gösterge Paneli</h1>
        <p className="text-gray-600">Vardiya yönetimi sistemine genel bakış</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Assignments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Son Atamalar</h2>
          <div className="space-y-3">
            {filteredAssignments.slice(0, 5).map((assignment) => {
              const employee = getEmployee(assignment.employeeId);
              const shift = getShiftTemplate(assignment.shiftTemplateId);
              const department = getDepartment(employee?.departmentId || '');
              return (
                <div key={assignment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: shift?.color }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-800">{employee?.name}</p>
                      <p className="text-sm text-gray-600">{assignment.date} • {department?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">{shift?.name}</p>
                    <p className="text-sm text-gray-600">{shift?.startTime} - {shift?.endTime}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shift Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Vardiya Dağılımı</h2>
          <div className="space-y-4">
            {filteredShiftTemplates.map((template) => {
              const count = filteredAssignments.filter(a => a.shiftTemplateId === template.id).length;
              const percentage = filteredAssignments.length > 0 ? (count / filteredAssignments.length) * 100 : 0;
              return (
                <div key={template.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded mr-3"
                        style={{ backgroundColor: template.color }}
                      ></div>
                      <span className="text-gray-800 font-medium">{template.name}</span>
                    </div>
                    <span className="text-gray-600">{count} atama</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: template.color,
                        width: `${percentage}%`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;