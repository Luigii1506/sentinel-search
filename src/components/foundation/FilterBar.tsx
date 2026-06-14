/**
 * FilterBar — composable toolbar for list pages.
 *
 * Five list pages were hand-rolling this exact layout: search input on
 * the left, 1-3 selects in the middle, action buttons on the right.
 * Each invented its own spacing, focus ring, mobile-stack behavior,
 * and "reset" semantics. This collapses all five into one shape:
 *
 *   <FilterBar>
 *     <FilterBar.Search value={q} onChange={setQ} />
 *     <FilterBar.Select label="Estado" value={status} options={…} onChange={setStatus} />
 *     <FilterBar.Spacer />
 *     <FilterBar.Actions>
 *       <Button onClick={reset}>Limpiar</Button>
 *       <Button onClick={apply}>Aplicar</Button>
 *     </FilterBar.Actions>
 *   </FilterBar>
 *
 * Why subcomponents instead of one big props object: the order and
 * presence of controls varies wildly per page (some have 2 selects +
 * date range, others just a search). Composition keeps each call site
 * readable without paying for an N-knob props API that grows forever.
 *
 * Why a wrapping component at all instead of raw divs: it enforces
 *   - consistent height (40px controls everywhere)
 *   - consistent focus ring (electric, not the default blue)
 *   - consistent mobile collapse (stack vertically below md)
 *   - consistent surface (navy-700 border-white/10 rounded-md)
 * across every list page without each page having to remember.
 */
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { Search as SearchIcon, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: ReactNode;
  /** Drop the surrounding card chrome — useful when nesting inside a
   *  card that already provides the border + bg. */
  bare?: boolean;
  className?: string;
}

export function FilterBar({ children, bare, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center gap-3',
        !bare && 'rounded-md border border-white/10 bg-navy-700/60 px-3 py-2.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Auto-fire onChange when the user clears the input via the X
   *  button (default true). Disable if the parent debounces and
   *  prefers an explicit submit. */
  clearable?: boolean;
  /** Make the search input expand to fill remaining row space. The
   *  default is `flex-1` which is what most pages want. */
  className?: string;
}

function Search({
  value,
  onChange,
  placeholder = 'Buscar…',
  clearable = true,
  className,
}: SearchProps) {
  return (
    <div className={cn('relative flex-1 min-w-[200px]', className)}>
      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-200" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 pl-8 pr-8 rounded-md bg-navy-800 border border-white/10',
          'text-sm text-white placeholder:text-navy-300',
          'focus:outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500/40',
        )}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-300 hover:text-white"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  /** Optional caption rendered above the select on md+; hidden on mobile to keep the bar compact. */
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  /** Placeholder option rendered as the first entry. Pass `null` to omit. */
  placeholder?: string | null;
  className?: string;
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Todos',
  className,
  ...rest
}: SelectProps) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-[10px] uppercase tracking-wider text-navy-200 hidden md:block">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 px-3 pr-8 rounded-md bg-navy-800 border border-white/10',
          'text-sm text-white',
          'focus:outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500/40',
          // Custom chevron via background image — avoids the browser's
          // native dropdown arrow which doesn't theme.
          "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22><path stroke=%22%2394A3B8%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/></svg>')]",
          'bg-no-repeat bg-right-2 bg-[length:18px_18px]',
        )}
        {...rest}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Pushes subsequent children to the right edge of the bar. */
function Spacer() {
  return <div className="flex-1 hidden md:block" />;
}

/** Right-aligned action cluster — buttons live here so they wrap as a
 *  group below the controls on mobile instead of mixing in. */
function Actions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 justify-end', className)}>{children}</div>
  );
}

FilterBar.Search = Search;
FilterBar.Select = Select;
FilterBar.Spacer = Spacer;
FilterBar.Actions = Actions;
