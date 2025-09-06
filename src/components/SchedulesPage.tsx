import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Save, Download, Upload } from 'lucide-react';
import { Employee, ShiftTemplate, ShiftAssignment, Department } from '../types';

interface SchedulesPageProps {
  employees: Employee[];
  shiftTemplates: ShiftTemplate[];
  shiftAssignments: ShiftAssignment[];
  setShiftAssignments: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>;
  departments: Department[];
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
}

const SchedulesPage: React.FC<SchedulesPageProps> = ({ 
  employees, 
  shiftTemplates, 
  shiftAssignments, 
  setShiftAssignments,
  departments,
  selectedDepartment,
  setSelectedDepartment
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [hasChanges, setHasChanges] = useState(false);

  const filteredEmployees = selectedDepartment === 'all' 
    ? employees 
    : employees.filter(emp => emp.departmentId === selectedDepartment);

  const filteredShiftTemplates = selectedDepartment === 'all' 
    ? shiftTemplates 
    : shiftTemplates.filter(template => template.departmentId === selectedDepartment);

  const getDepartment = (id: string) => departments.find(d => d.id === id);

  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      week.push(weekDate);
    }
    return week;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const getShiftForEmployeeAndDate = (employeeId: string, date: string) => {
    const assignment = shiftAssignments.find(a => a.employeeId === employeeId && a.date === date);
    return assignment ? filteredShiftTemplates.find(t => t.id === assignment.shiftTemplateId) : null;
  };

  const handleShiftChange = (employeeId: string, date: string, shiftTemplateId: string) => {
    const existingAssignmentIndex = shiftAssignments.findIndex(
      a => a.employeeId === employeeId && a.date === date
    );

    if (shiftTemplateId === '') {
      // Remove shift assignment
      if (existingAssignmentIndex !== -1) {
        setShiftAssignments(prev => prev.filter((_, index) => index !== existingAssignmentIndex));
      }
    } else {
      // Add or update shift assignment
      const newAssignment: ShiftAssignment = {
        id: existingAssignmentIndex !== -1 ? shiftAssignments[existingAssignmentIndex].id : Date.now().toString(),
        employeeId,
        date,
        shiftTemplateId
      };

      if (existingAssignmentIndex !== -1) {
        setShiftAssignments(prev => 
          prev.map((assignment, index) => 
            index === existingAssignmentIndex ? newAssignment : assignment
          )
        );
      } else {
        setShiftAssignments(prev => [...prev, newAssignment]);
      }
    }
    setHasChanges(true);
  };

  const saveChanges = () => {
    // In a real app, this would save to backend
    setHasChanges(false);
    alert('Program başarıyla kaydedildi!');
  };

  const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const weekDates = getWeekDates(currentWeek);
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Vardiya Programları</h1>
          <p className="text-gray-600">Haftalık vardiya programlarını düzenleyin</p>
        </div>
        <div className="flex space-x-4">
          <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center">
            <Upload size={16} className="mr-2" />
            İçe Aktar
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <Download size={16} className="mr-2" />
            Dışa Aktar
          </button>
          {hasChanges && (
            <button 
              onClick={saveChanges}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save size={16} className="mr-2" />
              Kaydet
            </button>
          )}
        </div>
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

      {/* Week Navigation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">
              {weekDates[0].getDate()} - {weekDates[6].getDate()} {monthNames[currentWeek.getMonth()]} {currentWeek.getFullYear()}
            </h2>
            <p className="text-gray-600">
              Haftalık Program
              {selectedDepartment !== 'all' && (
                <span className="ml-2">• {getDepartment(selectedDepartment)?.name}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 min-w-[200px]">
                  Çalışan
                </th>
                {weekDates.map((date, index) => (
                  <th key={index} className="px-4 py-4 text-center text-sm font-medium text-gray-600 min-w-[140px]">
                    <div>{weekDays[index]}</div>
                    <div className="text-lg font-bold text-gray-800">{date.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee, employeeIndex) => {
                const department = getDepartment(employee.departmentId);
                return (
                <tr key={employee.id} className={`border-b border-gray-200 ${employeeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3 text-gray-600 font-medium">
                        {employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{employee.name}</p>
                        <p className="text-sm text-gray-600">{employee.position}</p>
                        {department && (
                          <div className="flex items-center mt-1">
                            <div 
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: department.color }}
                            ></div>
                            <p className="text-xs text-gray-500">{department.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {weekDates.map((date, dateIndex) => {
                    const dateStr = formatDate(date);
                    const currentShift = getShiftForEmployeeAndDate(employee.id, dateStr);
                    return (
                      <td key={dateIndex} className="px-4 py-4 text-center">
                        <select
                          value={currentShift?.id || ''}
                          onChange={(e) => handleShiftChange(employee.id, dateStr, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          style={{
                            backgroundColor: currentShift?.color || 'white'
                          }}
                        >
                          <option value="">İzin</option>
                          {filteredShiftTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.code})
                            </option>
                          ))}
                        </select>
                        {currentShift && (
                          <div className="mt-1 text-xs text-gray-600">
                            {currentShift.startTime} - {currentShift.endTime}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md mt-6">
          <p className="text-gray-600">
            {selectedDepartment === 'all' 
              ? 'Henüz çalışan eklenmemiş. Önce çalışan ekleyin.' 
              : 'Bu birimde çalışan bulunmuyor.'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Vardiya Açıklamaları</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {filteredShiftTemplates.map((template) => (
            <div key={template.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
              <div 
                className="w-6 h-6 rounded mr-3 flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: template.color }}
              >
                {template.code}
              </div>
              <div>
                <p className="font-medium text-gray-800">{template.name}</p>
                <p className="text-sm text-gray-600">{template.startTime} - {template.endTime}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulesPage;