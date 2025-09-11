import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { Department, Employee, ShiftTemplate, ShiftAssignment, Roster } from '../types/api';
import { api } from '../lib/api';
import { toHHmm } from '../lib/time';

interface SchedulesPageProps {
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
  departments: Department[];
}

function getMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay() || 7; // 1=Mon ... 7=Sun
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day + 1);
  return x;
}
function iso(date: Date) {
  return date.toISOString();
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameYMD(a: string | Date, b: string | Date) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// DnD helpers
function DraggableAssn({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (props: { setNodeRef: (node: HTMLElement | null) => void; style: React.CSSProperties; attributes: any; listeners: any }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.8 : 1, zIndex: 10, position: isDragging ? 'relative' as const : undefined }
    : {};
  return <>{children({ setNodeRef, style, attributes, listeners })}</>;
}

function DroppableCell({ id, children }: { id: string; children: (props: { setNodeRef: (node: HTMLElement | null) => void; isOver: boolean }) => React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return <>{children({ setNodeRef, isOver })}</>;
}

const SchedulesPage: React.FC<SchedulesPageProps> = ({
  selectedDepartment,
  setSelectedDepartment,
  departments,
}) => {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerEmployee, setPickerEmployee] = useState<Employee | null>(null);
  const [pickerDay, setPickerDay] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  type PendingCreate = {
    employeeId: string;
    date: Date;
    templateId?: string;
    startMinutes?: number;
    endMinutes?: number;
  };
  const [pendingCreates, setPendingCreates] = useState<PendingCreate[]>([]);

  // Add-Shift Modal state
  type ShiftType = 'REGULAR' | 'OVERTIME';
  const [addOpen, setAddOpen] = useState(false);
  const [addEmployee, setAddEmployee] = useState<Employee | null>(null);
  const [addDay, setAddDay] = useState<Date | null>(null);
  const [addTemplateId, setAddTemplateId] = useState<string>('');
  const [addStart, setAddStart] = useState<string>(''); // HH:mm
  const [addEnd, setAddEnd] = useState<string>('');   // HH:mm
  const [addType, setAddType] = useState<ShiftType>('REGULAR');
  const [addBusy, setAddBusy] = useState(false);

  // Toast (success) state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Toast (error) state - mirrors global error banner
  const [toastErr, setToastErr] = useState<string | null>(null);
  useEffect(() => {
    if (error) setToastErr(error);
  }, [error]);
  useEffect(() => {
    if (!toastErr) return;
    const t = setTimeout(() => setToastErr(null), 3000);
    return () => clearTimeout(t);
  }, [toastErr]);

  // Toast (delete) state - red toast for successful delete
  const [toastDel, setToastDel] = useState<string | null>(null);
  useEffect(() => {
    if (!toastDel) return;
    const t = setTimeout(() => setToastDel(null), 2500);
    return () => clearTimeout(t);
  }, [toastDel]);

  // Derived
  const filteredEmployees = useMemo(
    () =>
      selectedDepartment === 'all'
        ? employees
        : employees.filter((e) => e.departmentId === selectedDepartment),
    [employees, selectedDepartment]
  );
  // 'Genel' (global) şablon desteği: runtime'da API'den gerçek 'Genel' id'sini al
  const [generalDeptId, setGeneralDeptId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const fresh = await api.get<Department[]>('/departments');
        const g = fresh?.find((d) => d.name?.toLowerCase() === 'genel' || d.name?.toLowerCase() === 'general');
        setGeneralDeptId(g?.id ?? null);
      } catch {
        // ignore
      }
    })();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (selectedDepartment === 'all') return templates;
    return templates.filter(
      (t) => t.departmentId === selectedDepartment || (generalDeptId && t.departmentId === generalDeptId)
    );
  }, [templates, selectedDepartment, generalDeptId]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  // Load data when department/week changes
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [emps, tpls] = await Promise.all([
          api.get<Employee[]>('/employees'),
          api.get<ShiftTemplate[]>('/shift-templates'),
        ]);
        setEmployees(emps ?? []);
        setTemplates(tpls ?? []);

        // Roster getir (overlap edenler döner)
        const start = weekStart;
        const end = addDays(weekStart, 6);
        const rosterQs = new URLSearchParams({
          startDate: iso(start),
          endDate: iso(end),
          ...(selectedDepartment !== 'all' ? { departmentId: selectedDepartment } : {}),
        });
        const rosters = await api.get<Roster[]>(`/rosters?${rosterQs.toString()}`);

        if (!rosters || rosters.length === 0) {
          // Bu hafta için taslak roster yoksa oluştur
          const deptId =
            selectedDepartment !== 'all'
              ? selectedDepartment
              : departments[0]?.id ?? (emps[0]?.departmentId ?? '');
          if (!deptId) throw new Error('Birim bulunamadı. Lütfen birim ekleyin.');

          const created = await api.post<Roster>('/rosters/draft', {
            departmentId: deptId,
            startDate: iso(start),
            endDate: iso(end),
          });
          if (!created) throw new Error('Taslak oluşturulamadı');
          setRoster(created);
        } else {
          setRoster(rosters[0]);
        }

        // Atamaları getir
        const qs = new URLSearchParams({
          startDate: iso(start),
          endDate: iso(end),
          ...(selectedDepartment !== 'all' ? { departmentId: selectedDepartment } : {}),
        });
        const assigns = await api.get<ShiftAssignment[]>(`/assignments?${qs.toString()}`);
        setAssignments(assigns ?? []);
      } catch (e: any) {
        setError(e?.message ?? 'Yükleme hatası');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDepartment, weekStart, departments]);

  // Onaylanan müsaitlik talebi gelirse, ilgili vardiyaları ekrandan kaldır
  useEffect(() => {
    const handler = (ev: any) => {
      const d = ev?.detail;
      if (!d) return;
      setAssignments((prev) => {
        const sameDay = (a: any) => {
          const da = new Date(a.date);
          const db = new Date(d.date);
          return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth() && da.getUTCDate() === db.getUTCDate();
        };
        const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;
        return prev.filter((a) => {
          if (String(a.employeeId) !== String(d.employeeId)) return true;
          if (!sameDay(a)) return true;
          if (d.startMinutes == null || d.endMinutes == null) return false; // tüm gün kaldır
          return !overlap(a.startMinutes ?? 0, a.endMinutes ?? 0, d.startMinutes, d.endMinutes);
        });
      });
    };
    window.addEventListener('availability:approved', handler as any);
    return () => window.removeEventListener('availability:approved', handler as any);
  }, []);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart((prev) => addDays(prev, direction === 'next' ? 7 : -7));
  };

  // Swap request UI state
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapSource, setSwapSource] = useState<ShiftAssignment | null>(null);
  const [swapTargetId, setSwapTargetId] = useState<string>('');
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapPendingFor, setSwapPendingFor] = useState<Set<string>>(new Set());

  const openSwapModal = (assn: ShiftAssignment) => {
    if ((roster as any)?.locked || roster?.status === 'PUBLISHED') return;
    setSwapSource(assn);
    setSwapTargetId('');
    setSwapOpen(true);
  };

  const swapCandidates = React.useMemo(() => {
    if (!swapSource) return [] as ShiftAssignment[];
    return assignments.filter((a) => {
      if (a.id === swapSource.id) return false;
      const sameDay = sameYMD(a.date, swapSource.date);
      const sameRoster = a.rosterId === swapSource.rosterId;
      const differentEmp = a.employeeId !== swapSource.employeeId;
      return sameDay && sameRoster && differentEmp;
    });
  }, [swapSource, assignments]);

  const submitSwap = async () => {
    if (!swapSource || !swapTargetId) return;
    try {
      setSwapBusy(true);
      await api.post('/swap-requests', { fromAssignmentId: swapSource.id, toAssignmentId: swapTargetId });
      setSwapPendingFor((prev) => new Set([...Array.from(prev), swapSource.id]));
      setSwapOpen(false);
      setToastMsg('Değişim isteği gönderildi');
    } catch (e: any) {
      setError(e?.message ?? 'Değişim isteği gönderilemedi');
    } finally {
      setSwapBusy(false);
    }
  };

  const publishRoster = async () => {
    if (!roster) return;
    try {
      const updated = await api.post<Roster>(`/rosters/${roster.id}/publish`, {});
      if (updated) {
        setRoster(updated);
        setToastMsg('Yayınlandı');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Yayınlama başarısız');
    }
  };

  const cloneRoster = async () => {
    if (!roster) return;
    try {
      const draft = await api.post<Roster>(`/rosters/${roster.id}/clone`, {});
      if (!draft) throw new Error('Taslak oluşturulamadı');
      setRoster(draft);
      setToastMsg('Yeni taslak oluşturuldu');
      const start = weekStart;
      const end = addDays(weekStart, 6);
      const qs = new URLSearchParams({
        startDate: iso(start),
        endDate: iso(end),
        ...(selectedDepartment !== 'all' ? { departmentId: selectedDepartment } : {}),
      });
      const assigns = await api.get<ShiftAssignment[]>(`/assignments?${qs.toString()}`);
      setAssignments(assigns ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Taslak oluşturma başarısız');
    }
  };

  const getDepartment = (id?: string | null) => departments.find((d) => d.id === id);

  const handleCellClick = async (emp: Employee, day: Date) => {
    try {
      // Aynı güne mevcut atama varsa sil (toggle)
      const existing = assignments.find((a) => a.employeeId === emp.id && sameYMD(a.date, day));
      if (existing) {
        await api.del(`/assignments/${existing.id}`);
        setAssignments((prev) => prev.filter((x) => x.id !== existing.id));
        return;
      }

      // Yeni atama için şablon seçtir
      setPickerEmployee(emp);
      setPickerDay(day);
      setPickerOpen(true);
    } catch (e: any) {
      setError(e?.message ?? 'Atama işlemi sırasında hata oluştu');
    }
  };

  const createAssignmentWithTemplate = async (tpl: ShiftTemplate) => {
    if (!pickerEmployee || !pickerDay) return;
    // Çoklu vardiya desteği: aynı güne birden fazla bekleyen atama ekle
    setPendingCreates((prev) => [
      ...prev,
      { employeeId: pickerEmployee.id, date: pickerDay, templateId: tpl.id },
    ]);
    setPickerOpen(false);
    setPickerEmployee(null);
    setPickerDay(null);
  };

  const createAssignmentAdhoc = (start: string, end: string) => {
    if (!pickerEmployee || !pickerDay) return;
    const toMin = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const sm = toMin(start);
    const em = toMin(end);
    if (!(sm >= 0 && em >= 0) || em === sm) return;
    // Çoklu vardiya desteği: aynı güne birden fazla bekleyen atama ekle
    setPendingCreates((prev) => [
      ...prev,
      { employeeId: pickerEmployee.id, date: pickerDay, startMinutes: sm, endMinutes: em },
    ]);
    setPickerOpen(false);
    setPickerEmployee(null);
    setPickerDay(null);
  };

  // Hücreye yeni vardiya ekleme için ayrı bir açıcı (mevcut atamayı silme yerine)
  const openPickerFor = (emp: Employee, day: Date) => {
    // Backward compatibility: kept but unused for + button
    setPickerEmployee(emp);
    setPickerDay(day);
    setPickerOpen(true);
  };

  const openAddModal = (emp: Employee, day: Date) => {
    // Readonly kontrolü: yayınlandıysa açma
    if (roster?.status === 'PUBLISHED') return;
    setError(null);
    setAddEmployee(emp);
    setAddDay(day);
    // Varsayılan şablon ve saatler
    const targetDept =
      selectedDepartment !== 'all'
        ? selectedDepartment
        : emp.departmentId ?? departments[0]?.id ?? '';
    const options = templates.filter(
      (t) => t.departmentId === targetDept || (generalDeptId && t.departmentId === generalDeptId)
    );
    const first = options[0];
    setAddTemplateId(first ? first.id : '');
    setAddStart(first ? toHHmm(first.startMinutes) : '');
    setAddEnd(first ? toHHmm(first.endMinutes) : '');
    setAddType('REGULAR');
    setAddOpen(true);
  };

  // Tek bir mevcut atamayı sil
  const removeAssignment = async (assignmentId: string) => {
    try {
      await api.del(`/assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((x) => x.id !== assignmentId));
      setToastDel('Vardiya silindi');
    } catch (e: any) {
      setError(e?.message ?? 'Atama silinirken hata oluştu');
    }
  };

  // Tek bir bekleyen atamayı kaldır
  const removePending = (p: PendingCreate) => {
    setPendingCreates((prev) =>
      prev.filter((x) => {
        const sameEmp = x.employeeId === p.employeeId;
        const sameDay = sameYMD(x.date, p.date);
        const sameTpl = (!!x.templateId && !!p.templateId && x.templateId === p.templateId);
        const sameAdhoc = (
          x.startMinutes != null && x.endMinutes != null &&
          p.startMinutes != null && p.endMinutes != null &&
          x.startMinutes === p.startMinutes && x.endMinutes === p.endMinutes
        );
        return !(sameEmp && sameDay && (sameTpl || sameAdhoc));
      })
    );
  };

  const savePendingAssignments = async () => {
    if (pendingCreates.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const start = weekStart;
      const end = addDays(weekStart, 6);
      // Roster cache per department
      const rosterByDept = new Map<string, Roster>();

      // Helper to ensure roster exists for a department
      const ensureRoster = async (deptId: string) => {
        const cached = rosterByDept.get(deptId);
        if (cached) return cached;
        // Try to reuse current roster if same dept
        if (roster && roster.departmentId === deptId) {
          rosterByDept.set(deptId, roster);
          return roster;
        }
        // Query existing roster for week+dept
        const qs = new URLSearchParams({
          startDate: iso(start),
          endDate: iso(end),
          departmentId: deptId,
        });
        let rList: Roster[] = [];
        try {
          rList = (await api.get<Roster[]>(`/rosters?${qs.toString()}`)) ?? [];
        } catch {
          rList = [];
        }
        let r: Roster;
        if (rList.length > 0) {
          r = rList[0];
        } else {
          const created = await api.post<Roster>('/rosters/draft', {
            departmentId: deptId,
            startDate: iso(start),
            endDate: iso(end),
          });
          if (!created) throw new Error('Roster oluşturulamadı');
          r = created;
        }
        rosterByDept.set(deptId, r);
        // update main roster if current department matches
        if (selectedDepartment !== 'all' && selectedDepartment === deptId) setRoster(r);
        return r;
      };

      const createdList: ShiftAssignment[] = [];
      for (const p of pendingCreates) {
        const emp = employees.find((e) => e.id === p.employeeId);
        if (!emp) continue;
        const targetDept = selectedDepartment !== 'all' ? selectedDepartment : (emp.departmentId ?? departments[0]?.id ?? '');
        if (!targetDept) throw new Error('Birim bulunamadı. Lütfen birim ekleyin.');
        const r = await ensureRoster(targetDept);
        let created: ShiftAssignment | null = null;
        if (p.templateId) {
          const tpl = templates.find((t) => t.id === p.templateId);
          if (!tpl) continue;
          created = await api.post<ShiftAssignment>('/assignments', {
            rosterId: r.id,
            employeeId: emp.id,
            date: iso(p.date),
            start: toHHmm(tpl.startMinutes),
            end: toHHmm(tpl.endMinutes),
            templateId: tpl.id,
          });
        } else if (p.startMinutes != null && p.endMinutes != null) {
          created = await api.post<ShiftAssignment>('/assignments', {
            rosterId: r.id,
            employeeId: emp.id,
            date: iso(p.date),
            start: toHHmm(p.startMinutes),
            end: toHHmm(p.endMinutes),
          });
        }
        if (created) createdList.push(created);
      }
      if (createdList.length > 0) {
        setAssignments((prev) => [...createdList, ...prev]);
      }
      setPendingCreates([]);
    } catch (e: any) {
      setError(e?.message ?? 'Kaydetme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Yardımcı: HH:mm -> dakika
  const toMinutes = (s: string) => {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s?.trim() || '');
    if (!m) return NaN;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    return h * 60 + mi;
  };

  // Drag & Drop: optimistic update handler
  const handleDragEnd = async (event: any) => {
    try {
      if (!event?.active || !event?.over) return;
      if ((roster as any)?.locked || roster?.status === 'PUBLISHED') return;
      const assnId: string = event.active.id as string;
      const overId: string = event.over.id as string; // employeeId:YYYY-MM-DD
      const [targetEmp, targetDate] = overId.split(':');
      const current = assignments.find((a) => a.id === assnId);
      if (!current) return;
      const curDate = (current.date || '').slice(0, 10);
      if (current.employeeId === targetEmp && curDate === targetDate) return;

      const prev = assignments;
      // optimistic move
      setAssignments(assignments.map((a) => (a.id === assnId ? { ...a, employeeId: targetEmp, date: new Date(targetDate).toISOString() } : a)));
      try {
        const body: any = { employeeId: targetEmp, date: new Date(`${targetDate}T00:00:00`).toISOString() };
        const updated = await api.put<ShiftAssignment>(`/assignments/${assnId}`, body);
        if (updated)
          setAssignments((list) => list.map((a) => (a.id === assnId ? { ...a, ...updated } : a)));
        else setAssignments(prev);
      } catch (e: any) {
        // revert on error
        setAssignments(prev);
        const msg = e?.message || '';
        if (msg.includes('409') || msg.toLowerCase().includes('conflict')) setError('Çakışma: Hedef gün/saatte başka atama var.');
        else setError(e?.message ?? 'Taşıma başarısız');
      }
    } catch {}
  };

  // Belirli departman + hafta için roster oluştur/yeniden kullan
  const ensureRosterForDept = async (deptId: string): Promise<Roster> => {
    const start = weekStart;
    const end = addDays(weekStart, 6);
    if (roster && roster.departmentId === deptId) return roster;
    const qs = new URLSearchParams({ startDate: iso(start), endDate: iso(end), departmentId: deptId });
    let rList: Roster[] = [];
    try {
      rList = (await api.get<Roster[]>(`/rosters?${qs.toString()}`)) ?? [];
    } catch {
      rList = [];
    }
    let r: Roster;
    if (rList.length > 0) {
      r = rList[0];
    } else {
      const created = await api.post<Roster>('/rosters/draft', {
        departmentId: deptId,
        startDate: iso(start),
        endDate: iso(end),
      });
      if (!created) throw new Error('Roster oluşturulamadı');
      r = created;
    }
    // Eğer seçili departman buysa ana roster'ı güncelle
    if (selectedDepartment !== 'all' && selectedDepartment === deptId) setRoster(r);
    return r;
  };

  const handleAddSave = async () => {
    if (!addOpen || !addEmployee || !addDay) return;
    if (roster?.status === 'PUBLISHED') return; // güvenlik
    if (!addTemplateId) {
      setError('Lütfen bir vardiya şablonu seçin.');
      return;
    }
    // Saat doğrulaması
    const sm = toMinutes(addStart);
    const em = toMinutes(addEnd);
    if (!isFinite(sm) || !isFinite(em)) {
      setError('Saat formatı geçersiz. Örn: 09:00');
      return;
    }
    if (sm >= em) {
      setError('Başlangıç saati, bitişten küçük olmalıdır.');
      return;
    }
    setAddBusy(true);
    setError(null);
    try {
      const targetDept =
        selectedDepartment !== 'all'
          ? selectedDepartment
          : addEmployee.departmentId ?? departments[0]?.id ?? '';
      if (!targetDept) throw new Error('Birim bulunamadı. Lütfen birim ekleyin.');
      const r = await ensureRosterForDept(targetDept);
      // POST /assignments
      const body: any = {
        rosterId: r.id,
        employeeId: addEmployee.id,
        date: iso(addDay),
        start: addStart,
        end: addEnd,
      };
      if (addTemplateId) body.templateId = addTemplateId;
      body.type = addType; // REGULAR/OVERTIME
      const created = await api.post<ShiftAssignment>('/assignments', body);
      if (created) setAssignments((prev) => [created, ...prev]);
      // Kapat ve temizle
      setAddOpen(false);
      setAddEmployee(null);
      setAddDay(null);
      setAddTemplateId('');
      setAddStart('');
      setAddEnd('');
      setAddType('REGULAR');
      setToastMsg('Vardiya eklendi');
    } catch (e: any) {
      setError(e?.message ?? 'Vardiya kaydedilirken hata oluştu');
    } finally {
      setAddBusy(false);
    }
  };

  if (loading) return <div className="p-8">Yükleniyor…</div>;

  return (
    <div className="p-8">
      {/* Department Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label htmlFor="department-select" className="text-sm font-medium text-gray-700">
            Birim Filtresi
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

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm">{error}</div>}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Vardiya Programları</h1>
          <p className="text-gray-600">Haftalık vardiya programlarını düzenleyin</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>
          <button
            onClick={savePendingAssignments}
            disabled={pendingCreates.length === 0 || saving}
            className={`ml-2 px-4 py-2 rounded-lg text-white ${pendingCreates.length === 0 || saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            title={pendingCreates.length ? `${pendingCreates.length} bekleyen atama` : 'Kaydedilecek değişiklik yok'}
          >
            Kaydet{pendingCreates.length ? ` (${pendingCreates.length})` : ''}
          </button>
        </div>
      </div>

      {roster && (
        <div className="flex items-center justify-between mb-4">
          {((roster as any)?.locked || roster?.status === 'PUBLISHED') ? (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
              Yayınlanmış (kilitli)
            </span>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              onClick={publishRoster}
              disabled={!!(roster as any)?.locked || roster?.status === 'PUBLISHED'}
              className={`px-4 py-2 rounded-lg text-white ${((roster as any)?.locked || roster?.status === 'PUBLISHED') ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              title="Bu haftayı yayınla"
            >
              Yayınla
            </button>
            <button
              onClick={cloneRoster}
              className="px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700"
              title="Yayınlanmış haftadan yeni taslak oluştur"
            >
              Yeni Taslak
            </button>
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 min-w-[200px]">Çalışan</th>
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
                  <tr
                    key={employee.id}
                    className={`border-b border-gray-200 ${employeeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3 text-gray-600 font-medium">
                          {employee.fullName?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{employee.fullName}</p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          {department && (
                            <div className="flex items-center mt-1">
                              <div
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: department.color }}
                              />
                              <p className="text-xs text-gray-500">{department.name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDates.map((day, dateIndex) => {
                      const cellAssignments = assignments.filter(
                        (x) => x.employeeId === employee.id && sameYMD(x.date, day)
                      );
                      const cellPendings = pendingCreates.filter(
                        (p) => p.employeeId === employee.id && sameYMD(p.date, day)
                      );
                      return (
                        <td key={dateIndex} className="px-2 py-4 text-center">
                          <div className="flex flex-col gap-2">
                            {cellAssignments.map((assn) => {
                              const t = assn.templateId
                                ? templates.find((tpl) => tpl.id === assn.templateId)
                                : undefined;
                              return (
                                <div className="flex flex-col gap-1">
                                <button
                                  key={assn.id}
                                  onClick={() => removeAssignment(assn.id)}
                                  className="w-full p-2 rounded-lg text-sm font-medium flex items-center justify-center"
                                  style={{ backgroundColor: t?.color || '#EEF2FF' }}
                                  title="Silmek için tıklayın"
                                >
                                  <span>
                                    {t ? `${t.code}` : `${toHHmm(assn.startMinutes)} - ${toHHmm(assn.endMinutes)}`}
                                  </span>
                                  {/* remove small cross visually */}
                                </button>
                                <div className="flex items-center justify-between">
                                  <button
                                    className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                                    onClick={() => openSwapModal(assn)}
                                    title="Bu atama için değişim iste"
                                  >
                                    Değişim İste
                                  </button>
                                  {swapPendingFor.has(assn.id) && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">Beklemede</span>
                                  )}
                                </div>
                                </div>
                              );
                            })}
                            {cellPendings.map((p, idx) => {
                              const t = p.templateId ? templates.find((tpl) => tpl.id === p.templateId) : undefined;
                              const label = t
                                ? `${t.code}`
                                : (p.startMinutes != null && p.endMinutes != null
                                  ? `${toHHmm(p.startMinutes)} - ${toHHmm(p.endMinutes)}`
                                  : '+');
                              return (
                                <button
                                  key={`pending-${idx}`}
                                  onClick={() => removePending(p)}
                                  className="w-full p-2 rounded-lg text-sm font-medium border-2 border-dashed flex items-center justify-center"
                                  style={{ backgroundColor: t?.color || '#EEF2FF' }}
                                  title="Bekleyen atamayı kaldır"
                                >
                                  <span>{label}</span>
                                  {/* remove small cross visually */}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => openAddModal(employee, day)}
                              className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500"
                              title="Vardiya ekle"
                            >
                              +
                            </button>
                          </div>
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

      {/* Şablon Seçici Modal */}
      {swapOpen && swapSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { if (!swapBusy) setSwapOpen(false); }} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Değişim İste</h3>
            <p className="text-sm text-gray-600 mb-4">Hangi atama ile değişmek istiyorsun?</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {swapCandidates.length === 0 && (
                <div className="text-sm text-gray-500">Uygun atama bulunamadı (aynı gün/roster).</div>
              )}
              {swapCandidates.map((c) => {
                const emp = employees.find((e) => e.id === c.employeeId);
                const label = `${emp?.fullName ?? c.employeeId} • ${toHHmm(c.startMinutes)}-${toHHmm(c.endMinutes)}`;
                return (
                  <label key={c.id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input type="radio" name="swapTarget" checked={swapTargetId === c.id} onChange={() => setSwapTargetId(c.id)} />
                    <span className="text-sm text-gray-800">{label}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50" disabled={swapBusy} onClick={() => setSwapOpen(false)}>Vazgeç</button>
              <button className={`px-4 py-2 text-sm rounded text-white ${swapBusy || !swapTargetId ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={submitSwap} disabled={swapBusy || !swapTargetId}>Gönder</button>
            </div>
          </div>
        </div>
      )}

      {pickerOpen && pickerEmployee && pickerDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setPickerOpen(false); setPickerEmployee(null); setPickerDay(null); }} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Vardiya Seçin</h3>
            <p className="text-sm text-gray-600 mb-4">
              {pickerEmployee.fullName} — {pickerDay.toLocaleDateString()}
            </p>
            {(() => {
              const targetDept =
                selectedDepartment !== 'all'
                  ? selectedDepartment
                  : pickerEmployee.departmentId ?? departments[0]?.id ?? '';
              const options = templates.filter((t) => t.departmentId === targetDept || (generalDeptId && t.departmentId === generalDeptId));
              if (options.length === 0) {
                return <div className="text-sm text-red-600">Bu birim için tanımlı vardiya şablonu yok.</div>;
              }
              return (
                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-auto mb-4">
                  {options.map((t) => (
                    <button
                      key={t.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                      onClick={() => createAssignmentWithTemplate(t)}
                    >
                      <div
                        className="w-8 h-8 rounded mr-3 flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: t.color }}
                      >
                        {t.code}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{t.name}</div>
                        <div className="text-sm text-gray-600">{toHHmm(t.startMinutes)} - {toHHmm(t.endMinutes)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => { setPickerOpen(false); setPickerEmployee(null); setPickerDay(null); }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Küçük Ekle Modalı */}
      {addOpen && addEmployee && addDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { if (!addBusy) setAddOpen(false); }} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Vardiya Ekle</h3>
            <p className="text-sm text-gray-600 mb-4">{addEmployee.fullName} - {addDay.toLocaleDateString()}</p>
            {(() => {
              const targetDept =
                selectedDepartment !== 'all'
                  ? selectedDepartment
                  : addEmployee.departmentId ?? departments[0]?.id ?? '';
              const options = templates.filter((t) => t.departmentId === targetDept || (generalDeptId && t.departmentId === generalDeptId));
              return (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Template</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={addTemplateId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setAddTemplateId(id);
                        const t = options.find((x) => x.id === id);
                        if (t) {
                          setAddStart(toHHmm(t.startMinutes));
                          setAddEnd(toHHmm(t.endMinutes));
                        }
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {options.map((t) => (
                        <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Başlangıç</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        value={addStart}
                        readOnly
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Bitiş</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        value={addEnd}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Tür</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={addType}
                      onChange={(e) => setAddType((e.target.value as ShiftType) || 'REGULAR')}
                    >
                      <option value="REGULAR">REGULAR</option>
                      <option value="OVERTIME">OVERTIME</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      disabled={addBusy}
                      onClick={() => setAddOpen(false)}
                    >
                      İptal
                    </button>
                    <button
                      className={`px-4 py-2 text-sm rounded text-white ${addBusy || !addTemplateId ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                      onClick={handleAddSave}
                      disabled={addBusy || !addTemplateId}
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
          {filteredTemplates.map((template) => (
            <div key={template.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
              <div
                className="w-6 h-6 rounded mr-3 flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: template.color }}
              >
                {template.code}
              </div>
              <div>
                <p className="font-medium text-gray-800">{template.name}</p>
                <p className="text-sm text-gray-600">
                  {toHHmm(template.startMinutes)} - {toHHmm(template.endMinutes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toasts */}
      {(toastErr || toastMsg || toastDel) && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toastErr && (
            <div className="bg-red-600 text-white px-4 py-2 rounded shadow-lg">
              {toastErr}
            </div>
          )}
          {toastDel && (
            <div className="bg-red-600 text-white px-4 py-2 rounded shadow-lg">
              {toastDel}
            </div>
          )}
          {toastMsg && (
            <div className="bg-green-600 text-white px-4 py-2 rounded shadow-lg">
              {toastMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchedulesPage;

