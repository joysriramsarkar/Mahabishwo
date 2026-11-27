import { Globe2, ListTree, Clock, GitCompare, Telescope, Compass, Bookmark, Database } from 'lucide-react';
import { cn } from '@/lib/format';
import type { ReactNode } from 'react';

const ITEMS = [
  { id: 'explorer', label: 'এক্সপ্লোরার', Icon: Globe2 },
  { id: 'atlas', label: 'আটলাস', Icon: ListTree },
  { id: 'time', label: 'সময়রেখা', Icon: Clock },
  { id: 'compare', label: 'তুলনা', Icon: GitCompare },
  { id: 'observation', label: 'পর্যবেক্ষণ', Icon: Telescope },
  { id: 'tour', label: 'ভ্রমণ', Icon: Compass },
  { id: 'bookmarks', label: 'সংরক্ষিত', Icon: Bookmark },
  { id: 'data', label: 'ডেটা ও উৎস', Icon: Database },
];

export function NavRail() {
  return (
    <nav
      aria-label="প্রধান নেভিগেশন"
      className="relative z-10 flex flex-col items-center gap-1 border-r border-border-subtle bg-panel py-3"
    >
      {ITEMS.map(({ id, label, Icon }, i) => (
        <RailButton key={id} label={label} active={i === 0}>
          <Icon size={18} />
        </RailButton>
      ))}
    </nav>
  );
}

function RailButton({ children, label, active }: { children: ReactNode; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative grid h-11 w-11 place-items-center rounded-md border transition-colors',
        active
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-transparent text-ink-subtle hover:border-border-subtle hover:bg-elevated hover:text-ink'
      )}
      title={label}
    >
      {children}
      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded bg-elevated px-2 py-1 text-xs text-ink group-hover:block">
        {label}
      </span>
    </button>
  );
}
