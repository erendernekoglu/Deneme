import React, { useState } from 'react';
import { Users, Calendar, Settings, BarChart3, User, LogOut, Building2 } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import EmployeeView from './components/EmployeeView';
import EmployeesPage from './components/EmployeesPage';
import ShiftTemplatesPage from './components/ShiftTemplatesPage';
import SchedulesPage from './components/SchedulesPage';
import DepartmentsPage from './components/DepartmentsPage';
import { UserRole, Employee, ShiftTemplate, ShiftAssignment, Department } from './types';

// Mock data
const mockDepartments: Department[] = [
  { id: '1', name: 'AR-GE Birimi', color: '#3B82F6', description: 'Araştırma ve Geliştirme' },
  { id: '2', name: 'Muhasebe Birimi', color: '#10B981', description: 'Mali İşler ve Muhasebe' },
  { id: '3', name: 'Yönetim Birimi', color: '#8B5CF6', description: 'Üst Düzey Yönetim' },
  { id: '4', name: 'İnsan Kaynakları', color: '#F59E0B', description: 'İK ve Personel İşleri' },
];

const mockEmployees: Employee[] = [
  { id: '1', name: 'Ahmet Yılmaz', email: 'ahmet@firma.com', position: 'Yazılım Geliştirici', phone: '0555 123 4567', departmentId: '1' },
  { id: '2', name: 'Fatma Demir', email: 'fatma@firma.com', position: 'Mali Müşavir', phone: '0555 234 5678', departmentId: '2' },
  { id: '3', name: 'Mehmet Kara', email: 'mehmet@firma.com', position: 'Genel Müdür', phone: '0555 345 6789', departmentId: '3' },
  { id: '4', name: 'Ayşe Öz', email: 'ayse@firma.com', position: 'İK Uzmanı', phone: '0555 456 7890', departmentId: '4' },
  { id: '5', name: 'Can Özkan', email: 'can@firma.com', position: 'Araştırmacı', phone: '0555 567 8901', departmentId: '1' },
  { id: '6', name: 'Zeynep Kaya', email: 'zeynep@firma.com', position: 'Muhasebeci', phone: '0555 678 9012', departmentId: '2' },
];

const mockShiftTemplates: ShiftTemplate[] = [
  { id: '1', name: 'Gündüz', code: 'G', startTime: '08:00', endTime: '16:00', color: '#FEF3C7', departmentId: '1' },
  { id: '2', name: 'Akşam', code: 'A', startTime: '16:00', endTime: '00:00', color: '#FED7AA', departmentId: '1' },
  { id: '3', name: 'Gece', code: 'N', startTime: '00:00', endTime: '08:00', color: '#E9D5FF', departmentId: '1' },
  { id: '4', name: 'Normal Mesai', code: 'M', startTime: '09:00', endTime: '17:00', color: '#DBEAFE', departmentId: '2' },
  { id: '5', name: 'Esnek Mesai', code: 'E', startTime: '10:00', endTime: '18:00', color: '#D1FAE5', departmentId: '3' },
  { id: '6', name: 'Yarım Gün', code: 'Y', startTime: '09:00', endTime: '13:00', color: '#FEE2E2', departmentId: '4' },
];

const mockShiftAssignments: ShiftAssignment[] = [
  { id: '1', employeeId: '1', date: '2024-01-15', shiftTemplateId: '1' },
  { id: '2', employeeId: '1', date: '2024-01-16', shiftTemplateId: '1' },
  { id: '3', employeeId: '2', date: '2024-01-15', shiftTemplateId: '4' },
  { id: '4', employeeId: '3', date: '2024-01-15', shiftTemplateId: '5' },
  { id: '5', employeeId: '4', date: '2024-01-15', shiftTemplateId: '6' },
  { id: '6', employeeId: '5', date: '2024-01-15', shiftTemplateId: '2' },
  { id: '7', employeeId: '6', date: '2024-01-15', shiftTemplateId: '4' },
];

function App() {
  const [currentUser] = useState<UserRole>('admin'); // In real app, this would come from auth
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>(mockShiftTemplates);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>(mockShiftAssignments);

  const adminMenuItems = [
    { id: 'dashboard', label: 'Gösterge Paneli', icon: BarChart3 },
    { id: 'departments', label: 'Birimler', icon: Building2 },
    { id: 'employees', label: 'Çalışanlar', icon: Users },
    { id: 'templates', label: 'Vardiya Şablonları', icon: Settings },
    { id: 'schedules', label: 'Programlar', icon: Calendar },
  ];

  const filteredEmployees = selectedDepartment === 'all' 
    ? employees 
    : employees.filter(emp => emp.departmentId === selectedDepartment);

  const filteredShiftTemplates = selectedDepartment === 'all' 
    ? shiftTemplates 
    : shiftTemplates.filter(template => template.departmentId === selectedDepartment);

  const renderAdminContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard 
          departments={departments}
          employees={employees} 
          shiftTemplates={shiftTemplates} 
          shiftAssignments={shiftAssignments} 
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
        />;
      case 'departments':
        return <DepartmentsPage departments={departments} setDepartments={setDepartments} />;
      case 'employees':
        return <EmployeesPage 
          employees={filteredEmployees} 
          setEmployees={setEmployees} 
          departments={departments}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
        />;
      case 'templates':
        return <ShiftTemplatesPage 
          shiftTemplates={filteredShiftTemplates} 
          setShiftTemplates={setShiftTemplates} 
          departments={departments}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
        />;
      case 'schedules':
        return <SchedulesPage 
          employees={filteredEmployees} 
          shiftTemplates={filteredShiftTemplates} 
          shiftAssignments={shiftAssignments} 
          setShiftAssignments={setShiftAssignments}
          departments={departments}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
        />;
      default:
        return <AdminDashboard 
          departments={departments}
          employees={employees} 
          shiftTemplates={shiftTemplates} 
          shiftAssignments={shiftAssignments} 
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
        />;
    }
  };

  if (currentUser === 'employee') {
    // In real app, get current employee's department
    const currentEmployee = employees.find(emp => emp.id === '1');
    const employeeDepartmentTemplates = shiftTemplates.filter(template => 
      template.departmentId === currentEmployee?.departmentId
    );
    return <EmployeeView 
      shiftTemplates={employeeDepartmentTemplates} 
      shiftAssignments={shiftAssignments.filter(a => a.employeeId === '1')}
      departments={departments}
      currentEmployee={currentEmployee}
    />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Vardiya Yönetimi</h1>
          <p className="text-sm text-gray-600 mt-1">Admin Paneli</p>
        </div>
        
        <nav className="mt-6">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activeTab === item.id ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700' : 'text-gray-700'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">Admin Kullanıcı</p>
              <p className="text-xs text-gray-600">Yönetici</p>
            </div>
            <LogOut size={16} className="ml-auto text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderAdminContent()}
      </div>
    </div>
  );
}

export default App;