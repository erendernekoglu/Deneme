import React from 'react';
import type { SwapRequest } from '../types/api';
import { api } from '../lib/api';
import { toHHmm } from '../lib/time';

const SwapRequestsPage: React.FC = () => {
  const [list, setList] = React.useState<SwapRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SwapRequest[]>(`/swap-requests`);
      setList(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Değişim talepleri getirilemedi');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchList(); }, []);

  const optimistic = (id: string, status: SwapRequest['status']) => {
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const accept = async (id: string) => {
    try {
      optimistic(id, 'ACCEPTED');
      await api.post(`/swap-requests/${id}/accept`, {});
      setToast('Talep kabul edildi');
    } catch (e: any) {
      setError(e?.message ?? 'Kabul işlemi başarısız');
      fetchList();
    }
  };
  const decline = async (id: string) => {
    try {
      optimistic(id, 'DECLINED');
      await api.post(`/swap-requests/${id}/decline`, {});
      setToast('Talep reddedildi');
    } catch (e: any) {
      setError(e?.message ?? 'Reddetme işlemi başarısız');
      fetchList();
    }
  };
  const cancel = async (id: string) => {
    try {
      optimistic(id, 'CANCELED');
      await api.post(`/swap-requests/${id}/cancel`, {});
      setToast('Talep iptal edildi');
    } catch (e: any) {
      setError(e?.message ?? 'İptal işlemi başarısız');
      fetchList();
    }
  };

  const who = (r: SwapRequest) => r.requestedBy?.fullName || r.requestedById;
  const when = (iso: string) => (iso || '').slice(0, 10);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Değişim Talepleri</h1>
        <button onClick={fetchList} className="px-3 py-2 border rounded hover:bg-gray-50">Yenile</button>
      </div>
      {loading && <div className="mb-3 p-3 bg-white border rounded">Yükleniyor…</div>}
      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
      {toast && <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-800 rounded inline-block">{toast}</div>}

      <div className="bg-white rounded shadow overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Talep Eden</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const fromEmp = r.fromAssignment.employee?.fullName || r.fromAssignment.employeeId;
              const toEmp = r.toAssignment.employee?.fullName || r.toAssignment.employeeId;
              const fromTime = `${when(r.fromAssignment.date)} ${toHHmm(r.fromAssignment.startMinutes)}-${toHHmm(r.fromAssignment.endMinutes)}`;
              const toTime = `${when(r.toAssignment.date)} ${toHHmm(r.toAssignment.startMinutes)}-${toHHmm(r.toAssignment.endMinutes)}`;
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 text-sm text-gray-800">{who(r)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{fromEmp} • {fromTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{toEmp} • {toTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.status}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        className={`px-2 py-1 rounded text-white ${r.status !== 'PENDING' ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                        disabled={r.status !== 'PENDING'}
                        onClick={() => accept(r.id)}
                      >Kabul</button>
                      <button
                        className={`px-2 py-1 rounded text-white ${r.status !== 'PENDING' ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                        disabled={r.status !== 'PENDING'}
                        onClick={() => decline(r.id)}
                      >Reddet</button>
                      <button
                        className={`px-2 py-1 rounded border ${r.status !== 'PENDING' ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-50'}`}
                        disabled={r.status !== 'PENDING'}
                        onClick={() => cancel(r.id)}
                      >İptal</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">Kayıt yok</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SwapRequestsPage;

