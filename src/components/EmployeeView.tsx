import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Building2 } from 'lucide-react';
import { ShiftTemplate, ShiftAssignment, Department, Employee } from '../types';

interface EmployeeViewProps {
  shiftTemplates: ShiftTemplate[];
  shiftAssignments: ShiftAssignment[];
  departments: Department[];
  currentEmployee?: Employee;
}

const EmployeeView: React.FC<EmployeeViewProps> = ({ 
  shiftTemplates, 
  shiftAssignments, 
  departments, 
  currentEmployee 
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const getShiftTemplate = (id: string) => shiftTemplates.find(t => t.id === id);
  const getDepartment = (id: string) => departments.find(d => d.id === id);
  const currentDepartment = currentEmployee ? getDepartment(currentEmployee.departmentId) : null;

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      week.push(weekDate);
    }
    return week;
  };

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const datesArray = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      datesArray.push(new Date(d));
    }
    return datesArray;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getShiftForDate = (date: Date) => {
    const dateStr = formatDate(date);
    const assignment = shiftAssignments.find(a => a.date === dateStr);
    return assignment ? getShiftTemplate(assignment.shiftTemplateId) : null;
  };

  const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Vardiya Takviminiz</h1>
              <div className="flex items-center mt-1">
                <p className="text-gray-600">Kişisel vardiya programınızı görüntüleyin</p>
                {currentEmployee && currentDepartment && (
                  <div className="flex items-center ml-4 px-3 py-1 bg-gray-100 rounded-full">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: currentDepartment.color }}
                    ></div>
                    <span className="text-sm text-gray-700">{currentDepartment.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Haftalık
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Aylık
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-lg font-semibold text-gray-800 min-w-[200px] text-center">
                  {viewMode === 'week' 
                    ? `${getWeekDates(currentDate)[0].getDate()} - ${getWeekDates(currentDate)[6].getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                    : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  }
                </div>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'week' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {weekDays.map((day, index) => {
                const date = getWeekDates(currentDate)[index];
                return (
                  <div key={day} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                    <div className="text-sm font-medium text-gray-600 mb-1">{day}</div>
                    <div className="text-2xl font-bold text-gray-800">{date.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {getWeekDates(currentDate).map((date, index) => {
                const shift = getShiftForDate(date);
                return (
                  <div key={index} className="border-r border-gray-200 last:border-r-0 p-4">
                    {shift && (
                      <div 
                        className="rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        style={{ backgroundColor: shift.color }}
                      >
                        <div className="font-bold text-gray-800 text-lg mb-1">{shift.code}</div>
                        <div className="text-sm text-gray-700 font-medium">{shift.name}</div>
                        <div className="text-xs text-gray-600 mt-2">
                          <Clock size={12} className="inline mr-1" />
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {weekDays.map((day) => (
                <div key={day} className="p-4 text-center font-medium text-gray-600 border-r border-gray-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {getMonthDates(currentDate).map((date, index) => {
                const shift = getShiftForDate(date);
                return (
                  <div key={index} className="bg-white min-h-[120px] p-2">
                    <div className="text-sm font-medium text-gray-800 mb-2">{date.getDate()}</div>
                    {shift && (
                      <div 
                        className="rounded-md p-2 text-center text-xs"
                        style={{ backgroundColor: shift.color }}
                      >
                        <div className="font-bold text-gray-800">{shift.code}</div>
                        <div className="text-gray-700">{shift.startTime}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vardiya Açıklamaları</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shiftTemplates.map((template) => (
              <div key={template.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
                <div 
                  className="w-6 h-6 rounded-full mr-3 flex items-center justify-center font-bold text-sm"
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
    </div>
  );
};

export default EmployeeView;