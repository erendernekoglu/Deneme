import React from 'react';
import type {
  ShiftAssignment,
  Employee,
  ShiftTemplate,
  Department,
} from '../../types/api';
import { toHHmm } from '../../lib/time';

const ymd = (d: string | Date) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

type AssignmentWithDetails = ShiftAssignment & {
  employee?: Employee;
  template?: ShiftTemplate;
  roster?: { departmentId?: string | null };
};

interface RecentAssignmentsProps {
  assignments: AssignmentWithDetails[];
  employees: Employee[];
  shiftTemplates: ShiftTemplate[];
  departments: Department[];
}

const RecentAssignments: React.FC<RecentAssignmentsProps> = ({
  assignments,
  employees,
  shiftTemplates,
  departments,
}) => {
  const getShiftTemplate = (id?: string | null) =>
    shiftTemplates.find((t) => t.id === id);
  const getEmployee = (id: string) => employees.find((e) => e.id === id);
  const getDepartment = (id?: string | null) =>
    departments.find((d) => d.id === id);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Son Atamalar</h2>
      <div className="space-y-3">
        {assignments.map((assignment) => {
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
                  <p className="font-medium text-gray-800">{employee?.fullName}</p>
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
  );
};

export default RecentAssignments;

