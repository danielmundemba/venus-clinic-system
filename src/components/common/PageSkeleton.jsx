const Bar = ({ w = 'w-full', h = 'h-4' }) => (
  <div className={`${w} ${h} rounded-md skeleton-shimmer`} />
);

const PageSkeleton = ({ variant = 'table', statCards = 4, rows = 6 }) => {
  const statsGrid = (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${statCards} gap-6`}>
      {Array.from({ length: statCards }).map((_, i) => (
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
  );

  const filtersBar = (
    <div className="card">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-1.5">
          <Bar w="w-20" h="h-8" />
          <Bar w="w-20" h="h-8" />
          <Bar w="w-20" h="h-8" />
        </div>
        <Bar w="w-80" h="h-9" />
      </div>
    </div>
  );

  const tableRows = (
    <div className="card space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Bar w="w-40" h="h-5" />
        <Bar w="w-9" h="h-9" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-1">
          <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
          <Bar w="w-1/4" />
          <Bar w="w-1/5" />
          <Bar w="w-1/6" />
          <Bar w="w-1/6" />
        </div>
      ))}
    </div>
  );

  if (variant === 'table') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Bar w="w-48" h="h-7" />
            <Bar w="w-64" h="h-4" />
          </div>
          <Bar w="w-40" h="h-10" />
        </div>
        {statsGrid}
        {filtersBar}
        {tableRows}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="p-6 space-y-6">
        <Bar w="w-64" h="h-7" />
        <div className="card space-y-3">
          <Bar w="w-1/2" />
          <Bar w="w-3/4" />
          <Bar w="w-2/3" />
        </div>
        <div className="card space-y-3">
          <Bar w="w-1/3" />
          <Bar w="w-full" />
          <Bar w="w-5/6" />
        </div>
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className="p-6 space-y-6 max-w-2xl">
        <Bar w="w-56" h="h-7" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bar w="w-32" h="h-3" />
            <Bar w="w-full" h="h-11" />
          </div>
        ))}
      </div>
    );
  }

  // dashboard
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bar w="w-56" h="h-7" />
        <Bar w="w-72" h="h-4" />
      </div>
      {statsGrid}
      <div className="card">
        <Bar w="w-1/4" h="h-5" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} w="w-full" h="h-4" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;