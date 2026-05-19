import React from 'react';
import { NavLink } from 'react-router-dom';
import { cx } from '@platform/ui';

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', to: '/', icon: '⌂' },
  { label: 'Settings', to: '/settings', icon: '⚙' },
] as const;

export function Sidebar(): React.ReactElement {
  return (
    <aside className="flex flex-col w-14 bg-gray-950 border-r border-gray-800 h-full py-3 items-center gap-1 shrink-0">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          title={item.label}
          className={({ isActive }) =>
            cx(
              'flex items-center justify-center w-10 h-10 rounded-md text-lg transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            )
          }
        >
          {item.icon}
        </NavLink>
      ))}
    </aside>
  );
}
