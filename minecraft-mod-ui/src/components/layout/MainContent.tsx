import type { FC, ReactNode } from 'react';

interface MainContentProps {
  children: ReactNode;
}

const MainContent: FC<MainContentProps> = ({ children }) => {
  return (
    <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
      <div className="h-full flex flex-col">
        {children}
      </div>
    </main>
  );
};

export default MainContent;
