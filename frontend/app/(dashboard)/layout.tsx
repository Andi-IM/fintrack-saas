import { getCachedUser } from '@/lib/supabase/cached-user'
import { Topbar } from '@/components/layout/Topbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden">
      <Suspense fallback={<TopbarSkeleton />}>
        <UserTopbar />
      </Suspense>
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)]">
        <Suspense fallback={<div className="w-64 bg-white border-r border-slate-200 hidden md:block"></div>}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 relative">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
      <Suspense fallback={<div className="h-16 bg-white border-t border-slate-200 fixed bottom-0 w-full md:hidden"></div>}>
        <BottomNav />
      </Suspense>
    </div>
  )
}
