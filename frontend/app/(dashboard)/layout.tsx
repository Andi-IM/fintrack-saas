import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden">
      <Topbar email={user.email} />
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 relative">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
