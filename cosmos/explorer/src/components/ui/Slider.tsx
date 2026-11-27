import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '@/lib/format';

interface Props {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (v: number) => void;
  label: string;
  className?: string;
}

export function Slider({ value, min = 0, max = 1, step = 0.01, onValueChange, label, className }: Props) {
  return (
    <RadixSlider.Root
      value={[value]}
      onValueChange={([v]) => v !== undefined && onValueChange(v)}
      min={min} max={max} step={step}
      aria-label={label}
      className={cn('relative flex h-5 w-full touch-none items-center', className)}
    >
      <RadixSlider.Track className="relative h-1 grow rounded-full bg-border-subtle">
        <RadixSlider.Range className="absolute h-full rounded-full bg-accent-dim" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className={cn(
          'block h-3 w-3 rounded-full border border-accent bg-base',
          'hover:bg-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
        )}
      />
    </RadixSlider.Root>
  );
}
