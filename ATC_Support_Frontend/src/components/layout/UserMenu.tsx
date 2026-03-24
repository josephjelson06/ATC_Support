import { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { appPaths } from '../../lib/navigation';

export default function UserMenu({
  name,
  designation,
  onLogout,
}: {
  name: string;
  designation: string;
  onLogout: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition-colors hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="hidden text-left lg:block">
          <p className="max-w-[10rem] truncate text-sm font-bold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{designation}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen ? (
        <div className="fixed inset-x-4 top-20 z-[135] max-h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:absolute lg:right-0 lg:top-[calc(100%+0.75rem)] lg:left-auto lg:w-64 lg:max-h-none">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-sm font-bold text-slate-900">{name}</p>
            <p className="mt-1 text-xs text-slate-500">{designation}</p>
          </div>
          <div className="p-2">
            <Link
              to={appPaths.account}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <UserRound className="h-4 w-4 text-slate-400" />
              My Profile
            </Link>
            <Link
              to={appPaths.account}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4 text-slate-400" />
              Account & Security
            </Link>
            <button
              onClick={() => void onLogout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
