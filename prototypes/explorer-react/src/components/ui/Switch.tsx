import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@/lib/format';

interface Props {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, label, disabled, className }: Props) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 select-none', className)}>
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className={cn(
          'relative h-5 w-9 rounded-full border transition-colors',
          'data-[state=checked]:bg-accent-dim data-[state=unchecked]:bg-elevated',
          'border-border-strong'
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            'block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform',
            'data-[state=checked]:translate-x-[18px]'
          )}
        />
      </RadixSwitch.Root>
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}
