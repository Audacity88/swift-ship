import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  value: string;
  items: string[];
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  renderInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.ReactNode;
}

export function Combobox({
  value,
  items,
  onChange,
  onSelect,
  placeholder,
  className,
  renderInput,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <CommandPrimitive
      className={cn(
        'relative max-w-lg rounded-lg border bg-white text-sm shadow-md',
        className
      )}
      shouldFilter={false}
      filter={(value, search) => {
        if (value.toLowerCase().includes(search.toLowerCase())) return 1;
        return 0;
      }}
    >
      {renderInput({
        value,
        onChange: (e) => onChange(e.target.value),
        onFocus: () => setOpen(true),
        placeholder,
      })}

      {open && items.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-white py-1 shadow-md">
          {items.map((item) => (
            <button
              key={item}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onClick={() => {
                onSelect(item);
                setOpen(false);
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </CommandPrimitive>
  );
} 