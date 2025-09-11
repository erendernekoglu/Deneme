import React from 'react';
import type { AvailabilityRequest, Department } from '../types/api';
import { api } from '../lib/api';
import { toHHmm } from '../lib/time';

type Props = {
  selectedDepartment: string;
  departments: Department[];
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
const iso = (d: Date) => new Date(d).toISOString();

const AvailabilityRequestsPage: React.FC<Props> = ({ selectedDepartment, departments }) => {
  const [status, setStatus] = React.useState<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('');
  const [startDate, setStartDate] = React.useState<Date>(startOfWeek(new Date()));
  const [endDate, setEndDate] = React.useState<Date>(endOfWeek(new Date()));
  const [dept, setDept] = React.useState<string>(selectedDepartment);
  const [list, setList] = React.useState<AvailabilityRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ startDate: iso(startDate), endDate: iso(endDate) });
      if (dept && dept !== 'all') qs.set('departmentId', dept);
      if (status) qs.set('status', status);
      const data = await api.get<AvailabilityRequest[]>(`/availability-requests?${qs.toString()}`);
      setList(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Talepler getirilemedi');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    setDept(selectedDepartment);
  }, [selectedDepartment]);

  React.useEffect(() => { fetchList(); }, [dept, status, startDate.getTime(), endDate.getTime()]);

  const approve = async (id: string) => {
    try {
      const upd = await api.post<AvailabilityRequest>(`/availability-requests/${id}/approve`, {});
      if (!upd) return;
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, status: upd.status, decidedAt: upd.decidedAt } : r)));
      try {
        const detail = { id: (upd as any).id, employeeId: (upd as any).employeeId, date: (upd as any).date, startMinutes: (upd as any).startMinutes ?? null, endMinutes: (upd as any).endMinutes ?? null, status: (upd as any).status } as any;
        window.dispatchEvent(new CustomEvent('availability:approved', { detail }));
      } catch {}
    } catch (e: any) {
      setError(e?.message ?? 'Onay baÅŸarÄ±sÄ±z');
    }
  };
  const reject = async (id: string) => {
    try {
      const upd = await api.post<AvailabilityRequest>(`/availability-requests/${id}/reject`, {});
      if (!upd) return;
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, status: upd.status, decidedAt: upd.decidedAt } : r)));
    } catch (e: any) {
      setError(e?.message ?? 'Reddetme başarısız');
    }
  };

  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? '';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">MÃ¼saitlik Talepleri</h1>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Durum</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="px-3 py-2 border rounded">
            <option value="">Hepsi</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Birim</label>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="px-3 py-2 border rounded">
            <option value="all">TÃ¼m Birimler</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">BaÅŸlangÄ±Ã§</label>
          <input type="date" className="px-3 py-2 border rounded" value={startDate.toISOString().slice(0,10)} onChange={(e) => setStartDate(new Date(e.target.value + 'T00:00:00'))} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">BitiÅŸ</label>
          <input type="date" className="px-3 py-2 border rounded" value={endDate.toISOString().slice(0,10)} onChange={(e) => setEndDate(new Date(e.target.value + 'T23:59:59'))} />
        </div>
        <button onClick={fetchList} className="px-3 py-2 border rounded hover:bg-gray-50">Yenile</button>
      </div>

      {loading && <div className="mb-3 p-3 bg-white border rounded">YÃ¼kleniyorâ€¦</div>}
      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

      <div className="bg-white rounded shadow overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Ã‡alÄ±ÅŸan</th>
              <th className="px-4 py-3">Birim</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Saat</th>
              <th className="px-4 py-3">Not</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const dateStr = (r.date || '').slice(0,10);
              const time = (r.startMinutes != null && r.endMinutes != null) ? `${toHHmm(r.startMinutes)}-${toHHmm(r.endMinutes)}` : '-';
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 text-sm text-gray-800">{r.employee?.fullName ?? r.employeeId}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{deptName(r.employee?.departmentId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{dateStr}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{time}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.note ?? ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.status}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        className={`px-2 py-1 rounded text-white ${r.status !== 'PENDING' ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                        disabled={r.status !== 'PENDING'}
                        onClick={() => approve(r.id)}
                      >Onayla</button>
                      <button
                        className={`px-2 py-1 rounded text-white ${r.status !== 'PENDING' ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                        disabled={r.status !== 'PENDING'}
                        onClick={() => reject(r.id)}
                      >Reddet</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500 text-sm">KayÄ±t yok</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AvailabilityRequestsPage;











