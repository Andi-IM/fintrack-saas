import { getCachedUser } from '@/lib/supabase/cached-user'
import { Topbar } from '@/components/layout/Topbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Suspense } from 'react'

async function UserTopbar() {
  const user = await getCachedUser()
  // Redirect handled by middleware.ts — no need to redirect here.
  return <Topbar email={user?.email} />
}

function TopbarSkeleton() {
  return (
    <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-6 flex-shrink-0 z-20 relative">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-200 rounded-md animate-pulse"></div>
        <div className="w-24 h-5 bg-slate-200 rounded animate-pulse"></div>
      </div>
      <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-[100dvh] bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden w-full">
      <Suspense fallback={<TopbarSkeleton />}>
        <UserTopbar />
      </Suspense>
      <div className="flex flex-1 overflow-hidden relative w-full">
        <Suspense fallback={<div className="w-20 lg:w-64 bg-white border-r border-slate-200 hidden md:block shrink-0"></div>}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 pb-6 md:p-8 relative scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-8">
            <Suspense fallback={<div className="mb-4 h-5 w-48 rounded bg-slate-200 animate-pulse"></div>}>
              <Breadcrumbs />
            </Suspense>
            {children}
          </div>
        </main>
      </div>
      <Suspense fallback={<div className="h-16 shrink-0 bg-white border-t border-slate-200 w-full md:hidden box-content pb-[env(safe-area-inset-bottom)]"></div>}>
        <BottomNav />
      </Suspense>
    </div>
  )
}
