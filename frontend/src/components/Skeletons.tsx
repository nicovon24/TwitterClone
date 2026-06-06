function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse bg-x-border dark:bg-[#2f3336] rounded ${className}`} />
}

export function TweetSkeleton() {
  return (
    <div className="border-b border-x-border dark:border-[#2f3336] px-4 py-3 flex gap-3">
      <Shimmer className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 pt-1">
        <Shimmer className="h-3.5 w-32" />
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-3/4" />
        <div className="flex gap-6 pt-1">
          <Shimmer className="h-3 w-8" />
          <Shimmer className="h-3 w-8" />
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <>
      <div className="h-32 sm:h-44 animate-pulse bg-x-border" />
      <div className="px-4 pb-3 border-b border-x-border dark:border-[#2f3336]">
        <div className="flex items-end justify-between -mt-10 sm:-mt-12">
          <Shimmer className="w-20 h-20 sm:w-28 sm:h-28 rounded-full ring-4 ring-x-bg" />
          <Shimmer className="h-9 w-24 rounded-full mb-1" />
        </div>
        <div className="mt-4 space-y-2">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-3.5 w-24" />
          <Shimmer className="h-3.5 w-64 mt-3" />
        </div>
        <div className="flex gap-5 mt-4">
          <Shimmer className="h-3.5 w-20" />
          <Shimmer className="h-3.5 w-20" />
        </div>
      </div>
      {[...Array(3)].map((_, i) => <TweetSkeleton key={i} />)}
    </>
  )
}

export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-x-border">
      <Shimmer className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-3.5 w-28" />
        <Shimmer className="h-3 w-20" />
      </div>
      <Shimmer className="h-8 w-20 rounded-full" />
    </div>
  )
}
