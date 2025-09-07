import React from 'react';
import { Users, Calendar, Clock, Building2 } from 'lucide-react';
import type { Employee, ShiftTemplate, ShiftAssignment, Department } from '../types/api';
import { toHHmm } from '../lib/time';
import { api } from '../lib/api';

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

const ymd = (d: string | Date) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
        setAssignments(list);
        const allEmps = await api.get<Employee[]>(`/employees`);
        setEmpList(allEmps);
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

  // Vardiya Dağılımı: atamaları şablona göre grupla
  const distribution = React.useMemo(() => {
    const map = new Map<string, { templateId: string; name: string; color: string; count: number }>();
    for (const a of filteredAssignments as any[]) {
      const t = (a as any).template as any | undefined;
      const id = t?.id ?? (a as any).templateId;
      if (!id) continue;
      const name = t?.name ?? 'Bilinmeyen';
      const color = t?.color ?? '#E5E7EB';
      const entry = map.get(id) ?? { templateId: id, name, color, count: 0 };
      entry.count += 1;
      map.set(id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
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

  const getShiftTemplate = (id?: string | null) =>
    filteredShiftTemplates.find((t) => t.id === id);
  const getEmployee = (id: string) => employees.find((e) => e.id === id);
  const getDepartment = (id?: string | null) =>
    departments.find((d) => d.id === id);

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

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {(() => {
          const targetFor = (title: string): 'departments' | 'employees' | 'templates' | 'schedules' => {
            if (title.includes('Birim')) return 'departments';
            if (title.includes('Vardiya')) return 'templates';
            if (title.includes('Bug')) return 'schedules';
            return 'employees';
          };
          return stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onNavigate?.(targetFor(stat.title))}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left w-full"
              >
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                  </div>
                </div>
              </button>
            );
          });
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Son Atamalar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Son Atamalar</h2>
          <div className="space-y-3">
            {sortedAssignmentsDesc.slice(0, 5).map((assignment: any) => {
              const employee = assignment.employee ?? getEmployee(assignment.employeeId);
              const shift = assignment.template ?? getShiftTemplate(assignment.templateId);
              const deptId = assignment?.roster?.departmentId ?? employee?.departmentId ?? null;
              const department = getDepartment(deptId);
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: shift?.color }}
                    />
                    <div>
                      <p className="font-medium text-gray-800">
                        {employee?.fullName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ymd(assignment.date)} • {department?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">{shift?.name}</p>
                    <p className="text-sm text-gray-600">
                      {toHHmm(assignment.startMinutes)} - {toHHmm(assignment.endMinutes)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vardiya Dağılımı */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Vardiya Dağılımı</h2>
          <div className="space-y-4">
            {distribution.map((item) => {
              const percentage = filteredAssignments.length > 0 ? (item.count / filteredAssignments.length) * 100 : 0;
              return (
                <div key={item.templateId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded mr-3" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-800 font-medium">{item.name}</span>
                    </div>
                    <span className="text-gray-600">{item.count} atama</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-300" style={{ backgroundColor: item.color, width: `${percentage}%` }} />
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
