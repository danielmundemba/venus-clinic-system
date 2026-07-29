const Bar = ({ w = 'w-full', h = 'h-4', className = '' }) => (
  <div className={`${w} ${h} rounded-md skeleton-shimmer ${className}`} />
);

const AppShellSkeleton = () => {
  return (
    <div className="min-h-screen flex bg-venus-bg-primary">
      {/* Sidebar shell */}
      <aside className="h-screen w-64 bg-venus-bg-secondary border-r border-venus-border flex flex-col sticky top-0">
        <div className="p-6 border-b border-venus-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg skeleton-shimmer shrink-0" />
            <div className="space-y-2">
              <Bar w="w-20" h="h-4" />
              <Bar w="w-16" h="h-3" />
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-5 h-5 rounded skeleton-shimmer shrink-0" />
              <Bar w="w-28" h="h-3.5" />
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-venus-border space-y-3">
          <div className="px-4 py-2 bg-venus-bg-tertiary rounded-lg space-y-2">
            <Bar w="w-24" h="h-3.5" />
            <Bar w="w-16" h="h-3" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-5 h-5 rounded skeleton-shimmer shrink-0" />
            <Bar w="w-16" h="h-3.5" />
          </div>
        </div>
      </aside>

      {/* Right side: navbar + main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar shell */}
        <header className="h-16 shrink-0 bg-venus-bg-secondary border-b border-venus-border flex items-center justify-between px-6">
          <Bar w="w-40" h="h-4" />
          <div className="flex items-center gap-4">
            <Bar w="w-56" h="h-9" className="hidden md:block rounded-lg" />
            <div className="w-9 h-9 rounded-lg skeleton-shimmer shrink-0" />
            <div className="w-9 h-9 rounded-full skeleton-shimmer shrink-0" />
          </div>
        </header>

        {/* Main content shell */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <Bar w="w-56" h="h-7" />
            <Bar w="w-72" h="h-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Bar w="w-2/3" h="h-3" />
                    <Bar w="w-1/3" h="h-7" />
                  </div>
                  <div className="w-11 h-11 rounded-lg skeleton-shimmer shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <div className="card space-y-4">
            <Bar w="w-40" h="h-5" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
                <Bar w="w-1/4" />
                <Bar w="w-1/5" />
                <Bar w="w-1/6" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShellSkeleton;