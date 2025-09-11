import React from 'react';
import type { ShiftAssignment, ShiftTemplate } from '../../types/api';

type AssignmentWithTemplate = ShiftAssignment & {
  template?: ShiftTemplate | null;
};

interface ShiftDistributionProps {
  assignments: AssignmentWithTemplate[];
  shiftTemplates: ShiftTemplate[];
}

const ShiftDistribution: React.FC<ShiftDistributionProps> = ({
  assignments,
  shiftTemplates,
}) => {
  const distribution = React.useMemo(() => {
    const map = new Map<
      string,
      { templateId: string; name: string; color: string; count: number }
    >();
    for (const a of assignments) {
      const t = a.template ?? shiftTemplates.find((st) => st.id === a.templateId);
      const id = t?.id ?? a.templateId;
      if (!id) continue;
      const name = t?.name ?? 'Bilinmeyen';
      const color = t?.color ?? '#E5E7EB';
      const entry = map.get(id) ?? { templateId: id, name, color, count: 0 };
      entry.count += 1;
      map.set(id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [assignments, shiftTemplates]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Vardiya Dağılımı</h2>
      <div className="space-y-4">
        {distribution.map((item) => {
          const percentage =
            assignments.length > 0 ? (item.count / assignments.length) * 100 : 0;
          return (
            <div key={item.templateId}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded mr-3"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-800 font-medium">{item.name}</span>
                </div>
                <span className="text-gray-600">{item.count} atama</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ backgroundColor: item.color, width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShiftDistribution;

