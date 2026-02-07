import React from 'react';
import { cn } from '@/lib/utils';
import { AdContainer } from './AdContainer';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  showAds?: boolean; // Option to conditionally disable ads
}

export function PageContainer({ 
  children, 
  className,
  showAds = true 
}: PageContainerProps) {
  return (
    <div className={cn("layout-page-wrapper min-h-[calc(100vh-4rem)] flex flex-col w-full bg-background", className)}>
      {/* 
        Main Layout Grid/Flex Wrapper 
        - Uses flexbox to create the 3-column layout
        - Centered horizontally on large screens
        - Responsive gaps and padding
      */}
      <div className="layout-grid-container flex-1 w-full flex justify-center p-4 md:p-6 gap-4 lg:gap-8 max-w-[1600px] mx-auto relative">
        
        {/* Left Ad Column */}
        {/* 
           - Visible on Tablet (md) and up
           - Hidden on Mobile
           - Sticky positioning handled by AdContainer 
        */}
        {showAds && (
          <AdContainer 
            position="left" 
            width="w-[160px] lg:w-[200px]"
            className="hidden md:block" 
          />
        )}

        {/* Main Content Area */}
        {/* 
           - Takes remaining width
           - Max-width ensures readability on very wide screens
           - Centered by flex-1 when ads are present or absent
        */}
        <main className="layout-main-content flex-1 min-w-0 w-full max-w-[1100px] flex flex-col">
          {children}
        </main>

        {/* Right Ad Column */}
        {/* 
           - Visible ONLY on Desktop (xl/1280px) and up
           - Hidden on Tablet and Mobile
        */}
        {showAds && (
          <AdContainer 
            position="right" 
            width="w-[160px] lg:w-[200px]"
            className="hidden xl:block" 
          />
        )}
      </div>
    </div>
  );
}
