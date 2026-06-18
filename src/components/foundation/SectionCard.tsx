import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
}

export function SectionCard({
  title,
  icon: Icon,
  children,
  className,
  contentClassName,
  titleClassName,
}: SectionCardProps) {
  return (
    <Card className={cn('bg-card border-foreground/5', className)}>
      <CardContent className={cn('p-6', contentClassName)}>
        <h3 className={cn('text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2', titleClassName)}>
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}
