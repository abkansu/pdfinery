import React from 'react';
import { cn } from '@/lib/utils';

interface AdContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  position: 'left' | 'right';
  width?: string;
}

export function AdContainer({ 
  position, 
  width = "w-[180px]", // Default width
  className,
  ...props 
}: AdContainerProps) {
  // Determine responsive visibility based on position
  // Left: visible on tablet (md) and up
  // Right: visible on desktop (xl) and up
  const visibilityClass = position === 'left' 
    ? 'md:block' 
    : 'xl:block';

  return (
    <aside 
      className={cn(
        `layout-ad-sidebar-${position}`,
        visibilityClass,
        width,
        "flex-shrink-0",
        className
      )}
      {...props}
    >
      <div className="sticky top-24 space-y-4">
        {/* Placeholder for Ad Unit - Invisible/Reserved Space */}
        <div className="
          layout-ad-placeholder
          w-full h-[600px] 
          flex flex-col items-center justify-center text-center p-4
        ">
        </div>
      </div>
    </aside>
  );
}
