import React, { useEffect, useMemo, useState } from 'react';
import type { Department } from '../types/api';
import { reports as reportsApi } from '../lib/api';

type ReportsPageProps = {
  selectedDepartment: string;
  departments: Department[];
};

type SummaryResponse = {
  range: { startDate?: string; endDate?: string };
  totals: { totalAssignments: number; totalMinutes?: number; totalHours?: number };
  byEmployee: Array<{
    employeeId: string;
    fullName: string;
    departmentId?: string | null;
    minutes?: number;
    hours?: number;
    overtimeMinutes?: number;
    overtimeHours?: number;
    assignmentCount: number;
  }>;
  byTemplate: Array<{
    templateId: string;
    code: string;
    name: string;
    departmentId?: string | null;
    count: number;
    minutes?: number;
    hours?: number;
  }>;
};

const minutesToHours = (mins?: number) => {
  if (!mins || !Number.isFinite(mins)) return 0;
  return Math.round((mins / 60) * 100) / 100;
};

const isoDate = (d: Date) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0); // noon to avoid TZ edges
  return x.toISOString();
};

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay() || 7; // 1..7 Mon..Sun
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day + 1);
  return x;
};

const endOfWeek = (d: Date) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const ReportsPage: React.FC<ReportsPageProps> = ({ selectedDepartment, departments }) => {
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryResponse | null>(null);

  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? '';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        startDate: isoDate(startDate),
        endDate: isoDate(endDate),
      };
      if (selectedDepartment && selectedDepartment !== 'all') params.departmentId = selectedDepartment;
      const resp = await reportsApi.summary(params);
      setData(resp as SummaryResponse);
    } catch (e: any) {
      setError(e?.message ?? 'Rapor getirilemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, startDate.getTime(), endDate.getTime()]);

  const totals = useMemo(() => {
    const totalAssignments = data?.totals?.totalAssignments ?? 0;
    const totalMinutes = data?.totals?.totalMinutes ?? 0;
    const totalHours = data?.totals?.totalHours ?? minutesToHours(totalMinutes);
    const overtimeMinutes = (data?.byEmployee ?? []).reduce((acc, e) => acc + (e.overtimeMinutes ?? 0), 0);
    const overtimeHours = (data?.byEmployee ?? []).reduce((acc, e) => acc + (e.overtimeHours ?? 0), 0) || minutesToHours(overtimeMinutes);
    return { totalAssignments, totalHours, overtimeHours };
  }, [data]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Başlangıç</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={startDate.toISOString().slice(0, 10)}
            onChange={(e) => {
              const v = e.target.value;
              const d = new Date(v + 'T00:00:00');
              setStartDate(d);
            }}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Bitiş</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={endDate.toISOString().slice(0, 10)}
            onChange={(e) => {
              const v = e.target.value;
              const d = new Date(v + 'T23:59:59');
              setEndDate(d);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
            onClick={() => { setStartDate(startOfWeek(new Date())); setEndDate(endOfWeek(new Date())); }}
          >
            Bu Hafta
          </button>
          <button
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
            onClick={() => { const now = new Date(); setStartDate(startOfMonth(now)); setEndDate(endOfMonth(now)); }}
          >
            Bu Ay
          </button>
          <button
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
            onClick={fetchData}
          >
            Yenile
          </button>
          <button
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
            title="CSV indir"
            disabled={!startDate || !endDate}
            onClick={() => {
              const base = (import.meta as any).env?.VITE_API_BASE ?? '/api';
              const params = new URLSearchParams({
                startDate: isoDate(startDate),
                endDate: isoDate(endDate),
              });
              if (selectedDepartment && selectedDepartment !== 'all') params.set('departmentId', selectedDepartment);
              const href = `${base}/payroll/export.csv?${params.toString()}`;
              try { window.location.href = href; } catch {}
            }}
          >
            CSV indir
          </button>
        </div>
      </div>

      {loading && <div className="mb-4 p-3 rounded bg-white border text-gray-600">Yükleniyor...</div>}
      {error && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}

      {!loading && !error && data && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Toplam Atama</div>
              <div className="text-2xl font-bold text-gray-800">{totals.totalAssignments}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Toplam Saat</div>
              <div className="text-2xl font-bold text-gray-800">{totals.totalHours}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Fazla Mesai (saat)</div>
              <div className="text-2xl font-bold text-gray-800">{totals.overtimeHours}</div>
            </div>
          </div>

          {/* By Employee */}
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b text-gray-800 font-semibold">Çalışana Göre</div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm text-gray-600">
                    <th className="px-4 py-3">Ad</th>
                    <th className="px-4 py-3">Birim</th>
                    <th className="px-4 py-3">Atama Sayısı</th>
                    <th className="px-4 py-3">Toplam Saat</th>
                    <th className="px-4 py-3">Fazla Mesai Saat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byEmployee.map((e) => (
                    <tr key={e.employeeId} className="border-t">
                      <td className="px-4 py-3 text-sm text-gray-800">{e.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{deptName(e.departmentId)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.assignmentCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.hours ?? minutesToHours(e.minutes)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.overtimeHours ?? minutesToHours(e.overtimeMinutes)}</td>
                    </tr>
                  ))}
                  {data.byEmployee.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">Kayıt yok</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Template */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b text-gray-800 font-semibold">Şablona Göre</div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm text-gray-600">
                    <th className="px-4 py-3">Kod/Ad</th>
                    <th className="px-4 py-3">Birim</th>
                    <th className="px-4 py-3">Atama Sayısı</th>
                    <th className="px-4 py-3">Toplam Saat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byTemplate.map((t) => (
                    <tr key={t.templateId} className="border-t">
                      <td className="px-4 py-3 text-sm text-gray-800">{t.code} — {t.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{deptName(t.departmentId)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{t.count}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{t.hours ?? minutesToHours(t.minutes)}</td>
                    </tr>
                  ))}
                  {data.byTemplate.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500 text-sm">Kayıt yok</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
