import React from 'react';
import { Users, Calendar, Clock, Building2 } from 'lucide-react';
import type { Employee, ShiftTemplate, ShiftAssignment, Department } from '../types/api';
import { api } from '../lib/api';
import StatsCards from './admin/StatsCards';
import RecentAssignments from './admin/RecentAssignments';
import ShiftDistribution from './admin/ShiftDistribution';

interface AdminDashboardProps {
  departments: Department[];
  employees: Employee[];
  shiftTemplates: ShiftTemplate[];
  shiftAssignments: ShiftAssignment[];
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
  onNavigate?: (tab: 'dashboard' | 'departments' | 'employees' | 'templates' | 'schedules') => void;
}

const sameYMD = (a: string | Date, b: string | Date) => {
  const A = new Date(a);
  const B = new Date(b);
  return (
    A.getFullYear() === B.getFullYear() &&
    A.getMonth() === B.getMonth() &&
    A.getDate() === B.getDate()
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  departments,
  employees,
  shiftTemplates,
  shiftAssignments,
  selectedDepartment,
  setSelectedDepartment,
  onNavigate,
}) => {
  const today = new Date();

  const [assignments, setAssignments] = React.useState<ShiftAssignment[]>(shiftAssignments ?? []);
  const [empList, setEmpList] = React.useState<Employee[]>(employees ?? []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Backend'ten yakın tarihli atamaları getir (Son Atamalar için daha doğru)
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        const end = new Date(now);
        end.setDate(now.getDate() + 30);
        const qs = new URLSearchParams({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          ...(selectedDepartment !== 'all' ? { departmentId: selectedDepartment } : {}),
        });
        const list = await api.get<ShiftAssignment[]>(`/assignments?${qs.toString()}`);
        setAssignments(list ?? []);
        const allEmps = await api.get<Employee[]>(`/employees`);
        setEmpList(allEmps ?? []);
      } catch (e: any) {
        // Başarısız olursa props ile devam et
        setAssignments(shiftAssignments ?? []);
        setEmpList(employees ?? []);
        setError(e?.message ?? 'Atamalar yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDepartment]);

  const filteredEmployees =
    selectedDepartment === 'all'
      ? empList
      : empList.filter((emp) => emp.departmentId === selectedDepartment);

  const filteredShiftTemplates =
    selectedDepartment === 'all'
      ? shiftTemplates
      : shiftTemplates.filter((t) => t.departmentId === selectedDepartment);

  const filteredAssignments = assignments;

  // Aktif vardiya sayımı: şu anda devam eden atamalar
  const activeShiftCount = React.useMemo(() => {
    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth();
    const nowD = now.getDate();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const isSameYMD = (d: Date) => d.getFullYear() === nowY && d.getMonth() === nowM && d.getDate() === nowD;
    const isYesterday = (d: Date) => {
      const y = new Date(now);
      y.setDate(nowD - 1);
      return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
    };

    let count = 0;
    for (const a of filteredAssignments) {
      const ad = new Date(a.date);
      const start = a.startMinutes ?? 0;
      const end = a.endMinutes ?? 0;
      const crossesMidnight = end < start; // e.g., 22:00-06:00

      if (isSameYMD(ad)) {
        if (!crossesMidnight) {
          if (nowMinutes >= start && nowMinutes < end) count++;
        } else {
          // today part is from start..1440
          if (nowMinutes >= start || nowMinutes < end) count++;
        }
      } else if (crossesMidnight && isYesterday(ad)) {
        // overnight spill from yesterday into today: active if now < end
        if (nowMinutes < end) count++;
      }
    }
    return count;
  }, [filteredAssignments]);

  const todayAssignments = filteredAssignments.filter((a) =>
    sameYMD(a.date, today)
  );

  // Son atamalar: createdAt varsa ona göre, yoksa tarih/saatine göre azalan sırada
  const sortedAssignmentsDesc = React.useMemo(() => {
    const key = (x: any) => new Date(x?.createdAt ?? x?.date ?? 0).getTime();
    return [...filteredAssignments].sort((a: any, b: any) => {
      const ka = key(a), kb = key(b);
      if (kb !== ka) return kb - ka;
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (db !== da) return db - da;
      return (b.startMinutes ?? 0) - (a.startMinutes ?? 0);
    });
  }, [filteredAssignments]);

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
      value: activeShiftCount,
      icon: Clock,
      color: 'bg-green-500',
    },
    {
      title: 'Bugünkü Atamalar',
      value: todayAssignments.length,
      icon: Calendar,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Gösterge Paneli</h1>
        <p className="text-gray-600">Vardiya yönetimi sistemine genel bakış</p>
      </div>

      {/* Birim Filtresi */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="department-select" className="text-sm font-medium text-gray-700">
            Birim Filtresi:
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

      <StatsCards stats={stats} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentAssignments
          assignments={sortedAssignmentsDesc.slice(0, 5)}
          employees={empList}
          shiftTemplates={filteredShiftTemplates}
          departments={departments}
        />
        <ShiftDistribution
          assignments={filteredAssignments}
          shiftTemplates={filteredShiftTemplates}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
