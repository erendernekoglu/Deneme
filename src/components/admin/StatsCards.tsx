import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatItem {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

interface StatsCardsProps {
  stats: StatItem[];
  onNavigate?: (tab: 'departments' | 'employees' | 'templates' | 'schedules') => void;
}

const targetFor = (
  title: string
): 'departments' | 'employees' | 'templates' | 'schedules' => {
  if (title.includes('Birim')) return 'departments';
  if (title.includes('Vardiya')) return 'templates';
  if (title.includes('Bug')) return 'schedules';
  return 'employees';
};

const StatsCards: React.FC<StatsCardsProps> = ({ stats, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
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
      })}
    </div>
  );
};

export default StatsCards;

