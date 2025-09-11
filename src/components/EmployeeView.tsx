import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Employee, ShiftTemplate, ShiftAssignment, AvailabilityRequest } from '../types/api';
import { api } from '../lib/api';
import { toHHmm } from '../lib/time';
import useAuthToken from '../lib/useAuthToken';

const weekStartOf = (d: Date) => {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const isoFull = (d: Date) => {
  const x = new Date(d);
  x.setUTCHours(12, 0, 0, 0); // noon to avoid TZ edge cases
  return x.toISOString();
};

function decodeJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

const EmployeeView: React.FC = () => {
  const [me, setMe] = useState<Employee | null>(null);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [requests, setRequests] = useState<AvailabilityRequest[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = useAuthToken();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        let selectedId: string | null = null;
        try {
          const t = token;
          if (t) {
            const payload = t.split('.')[1];
            const p = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            if (p && p.sub) selectedId = String(p.sub);
          }
        } catch {}
        const [emps, tpls] = await Promise.all([
          api.get<Employee[]>('/employees'),
          api.get<ShiftTemplate[]>('/shift-templates'),
        ]);
        if (!selectedId) {
          // No token/sub: force login
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
          return;
        }
        const candidate = (emps ?? []).find((e) => e.id === selectedId) ?? null;
        if (!candidate) {
          setError('Kullanıcı bulunamadı');
          return;
        }
        setMe(candidate);
        setTemplates(tpls ?? []);
      } catch (e: any) {
        setError(e?.message ?? 'Yükleme hatası');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      if (!me) return;
      try {
        setLoading(true);
        setError(null);
        const start = new Date(weekStart);
        const end = new Date(weekStart);
        end.setUTCDate(end.getUTCDate() + 6);
        const qs = new URLSearchParams({
          employeeId: me.id,
          startDate: isoFull(start),
          endDate: isoFull(end),
        }).toString();
        const [list, reqs] = await Promise.all([
          api.get<ShiftAssignment[]>(`/assignments?${qs}`),
          api.get<AvailabilityRequest[]>(`/availability-requests?${qs}`),
        ]);
        setAssignments(list ?? []);
        setRequests(reqs ?? []);
      } catch (e: any) {
        setError(e?.message ?? 'Atamalar yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [me, weekStart]);

  const days = useMemo(() => (
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      return d;
    })
  ), [weekStart]);

  const getAssignmentsFor = (date: Date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const iso = `${y}-${m}-${dd}`;
    const dayAssns = assignments
      .filter((a) => (a.date ?? '').slice(0, 10) === iso)
      .sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
    // Onaylanan müsaitlik talepleri varsa, çakışan vardiyaları gizle
    const approved = requests.filter((r) => (r.status === 'APPROVED') && ((r.date ?? '').slice(0, 10) === iso));
    if (approved.length === 0) return dayAssns;
    // Eğer tüm gün onaylanmışsa boş liste döndür
    if (approved.some((r) => r.startMinutes == null || r.endMinutes == null)) return [];
    const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;
    return dayAssns.filter((a) => !approved.some((r) => overlap(a.startMinutes ?? 0, a.endMinutes ?? 0, r.startMinutes!, r.endMinutes!)));
  };

  const getTemplate = (id?: string | null) =>
    id ? templates.find((t) => t.id === id) : undefined;

  const weekLabel = () => {
    const end = new Date(weekStart);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    return `${fmt(weekStart)} – ${fmt(end)}`;
  };

  // Modal state for availability request
  const [reqOpen, setReqOpen] = useState(false);
  const [reqDate, setReqDate] = useState<Date | null>(null);
  const [reqStart, setReqStart] = useState<string>('');
  const [reqEnd, setReqEnd] = useState<string>('');
  const [reqAssignmentId, setReqAssignmentId] = useState<string | null>(null);
  const [reqNote, setReqNote] = useState<string>('');
  const [reqBusy, setReqBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  // Admin tarafında bir talep onaylandığında canlı güncelleme
  useEffect(() => {
    const handler = (ev: any) => {
      const d = ev?.detail;
      if (!d || !me) return;
      if (String(d.employeeId) !== String(me.id)) return;
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === d.id);
        const rec: AvailabilityRequest = {
          id: d.id,
          employeeId: String(d.employeeId),
          date: d.date,
          startMinutes: d.startMinutes ?? null,
          endMinutes: d.endMinutes ?? null,
          note: null,
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          decidedAt: new Date().toISOString(),
        } as any;
        return exists ? prev.map((r) => (r.id === d.id ? { ...r, ...rec } : r)) : [...prev, rec];
      });
    };
    window.addEventListener('availability:approved', handler as any);
    return () => window.removeEventListener('availability:approved', handler as any);
  }, [me]);

  const openRequestModal = (d: Date) => {
    setReqDate(new Date(d));
    setReqStart('');
    setReqEnd('');
    setReqNote('');
    const todays = getAssignmentsFor(d);
    setReqAssignmentId(todays.length > 0 ? todays[0].id : null);
    setReqOpen(true);
  };

  const submitRequest = async () => {
    if (!reqDate) return;
    try {
      setReqBusy(true);
      const body: any = { date: isoFull(reqDate) };
      if (reqStart) body.start = reqStart;
      if (reqEnd) body.end = reqEnd;
      if (reqNote) body.note = reqNote;
      const created = await api.post<AvailabilityRequest>('/availability-requests', body);
      if (created) setRequests((prev) => [...prev, created]);
      setReqOpen(false);
      setToast('Talebiniz iletildi');
    } catch (e: any) {
      setError(e?.message ?? 'Talep gönderilemedi');
    } finally {
      setReqBusy(false);
    }
  };

  const submitRequestFromAssignment = async () => {
    if (!reqDate || !reqAssignmentId) return;
    try {
      setReqBusy(true);
      const a = assignments.find((x) => x.id === reqAssignmentId);
      const body: any = { date: isoFull(reqDate) };
      if (a) {
        if (typeof a.startMinutes === 'number') body.start = toHHmm(a.startMinutes);
        if (typeof a.endMinutes === 'number') body.end = toHHmm(a.endMinutes);
      }
      if (reqNote) body.note = reqNote;
      const created = await api.post<AvailabilityRequest>('/availability-requests', body);
      if (created) setRequests((prev) => [...prev, created]);
      setReqOpen(false);
      setToast('Talebiniz iletildi');
    } catch (e: any) {
      setError(e?.message ?? 'Talep gönderilemedi');
    } finally {
      setReqBusy(false);
    }
  };

  const requestForDate = (d: Date): AvailabilityRequest | undefined => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const iso = `${y}-${m}-${dd}`;
    return requests.find((r) => (r.date ?? '').slice(0, 10) === iso);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Vardiya Takviminiz</h1>
            <p className="text-sm text-gray-600 mt-1">
              {me ? me.fullName : 'Çalışan yükleniyor...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-gray-100 rounded"
              onClick={() => setWeekStart((d) => {
                const x = new Date(d);
                x.setUTCDate(x.getUTCDate() - 7);
                return x;
              })}
              title="Hafta Geri"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-[220px] text-center font-semibold text-gray-800">{weekLabel()}</div>
            <button
              className="p-2 hover:bg-gray-100 rounded"
              onClick={() => setWeekStart((d) => {
                const x = new Date(d);
                x.setUTCDate(x.getUTCDate() + 7);
                return x;
              })}
              title="Hafta İleri"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {me && (() => {
        const start = new Date(weekStart);
        const end = new Date(weekStart); end.setUTCDate(end.getUTCDate() + 30);
        const startISO = isoFull(start);
        const endISO = isoFull(end);
        const base = typeof location !== 'undefined' ? location.origin : '';
        const href = `${base}/api/ical/employee/${me.id}.ics?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`;
        return (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-end gap-2">
              <a href={href} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50" title="Google Calendar / Apple Calendar’da ‘URL ile abone ol’ seçin.">Takvime abone ol (iCal)</a>
              <button onClick={async () => { try { await navigator.clipboard.writeText(href); } catch {} }} className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50" title="Linki panoya kopyala">Kopyala</button>
              <button onClick={() => { try { sessionStorage.removeItem('token'); } catch {}; try { localStorage.removeItem('token'); } catch {}; if (typeof window !== 'undefined') window.location.replace('/login'); }} className="ml-2 px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50" title="Çıkış Yap">Çıkış</button>
            </div>
          </div>
        );
      })()}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <div className="bg-white border rounded p-4 text-gray-600">Yükleniyor...</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, i) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
                  <div>{day}</div>
                  <div className="text-xl font-bold text-gray-800">{days[i].getUTCDate()}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d, idx) => {
                const dayAssignments = getAssignmentsFor(d);
                return (
                  <div key={idx} className="min-h-[140px] p-3 border-r last:border-r-0">
                    {dayAssignments.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {dayAssignments.map((a) => {
                          const t = getTemplate(a.templateId ?? null);
                          const label = t?.code ?? `${toHHmm(a.startMinutes)} - ${toHHmm(a.endMinutes)}`;
                          const bg = t?.color ?? '#F3F4F6';
                          return (
                            <div key={a.id} className="rounded-md px-2 py-2 text-center text-sm font-medium" style={{ backgroundColor: bg }}>
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-sm mt-8">—</div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                        title="Bu gün için müsait değilim"
                        onClick={() => openRequestModal(d)}
                      >
                        Müsait değilim
                      </button>
                      {(() => {
                        const r = requestForDate(d);
                        if (!r) return null;
                        const cls = r.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : r.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200';
                        const time = (r.startMinutes != null && r.endMinutes != null)
                          ? `${toHHmm(r.startMinutes)}-${toHHmm(r.endMinutes)}`
                          : '';
                        return (
                          <span className={`px-2 py-1 text-xs rounded border ${cls}`} title={r.note || ''}>
                            {r.status}{time ? ` • ${time}` : ''}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {toast && <div className="mt-4 p-2 text-sm rounded bg-green-50 text-green-800 border border-green-200 inline-block">{toast}</div>}
      </div>

      {reqOpen && reqDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { if (!reqBusy) setReqOpen(false); }} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Müsaitlik Talebi</h3>
            <p className="text-sm text-gray-600 mb-4">Tarih: {reqDate.toLocaleDateString()}</p>
            <div className="space-y-3">
              {(() => {
                const todays = getAssignmentsFor(reqDate);
                if (todays.length > 0) {
                  return (
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Vardiya seçin</label>
                      <div className="space-y-2 max-h-40 overflow-auto pr-1">
                        {todays.map((a) => (
                          <label key={a.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="req-assignment"
                              value={a.id}
                              checked={reqAssignmentId === a.id}
                              onChange={() => setReqAssignmentId(a.id)}
                            />
                            <span>
                              {toHHmm(a.startMinutes)} - {toHHmm(a.endMinutes)}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Saat girişi gerekmiyor; seçilen vardiya saatleri kullanılacaktır.</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Başlangıç (opsiyonel)</label>
                      <input type="time" value={reqStart} onChange={(e) => setReqStart(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Bitiş (opsiyonel)</label>
                      <input type="time" value={reqEnd} onChange={(e) => setReqEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
                    </div>
                  </div>
                );
              })()}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Not (opsiyonel)</label>
                <textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50" disabled={reqBusy} onClick={() => setReqOpen(false)}>İptal</button>
                <button className={`px-4 py-2 text-sm rounded text-white ${reqBusy ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={reqAssignmentId ? submitRequestFromAssignment : submitRequest} disabled={reqBusy}>Gönder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeView;
