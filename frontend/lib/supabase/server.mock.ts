import { cookies } from 'next/headers'

export async function createClient() {
  // Secara dinamis membaca cookie untuk mengecek status login dari WebdriverIO
  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.has('fintrack_fake_session')

  const mockUser = {
    id: 'mock-user-id',
    email: process.env.AUTHORIZED_EMAIL || 'ci@example.com',
    role: 'authenticated',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  }

  return {
    auth: {
      getUser: async () => {
        if (isLoggedIn) {
          return { data: { user: mockUser }, error: null }
        }
        return { data: { user: null }, error: { message: 'Auth session missing!' } }
      },
      getSession: async () => {
        if (isLoggedIn) {
          return { data: { session: { user: mockUser, access_token: 'dummy' } }, error: null }
        }
        return { data: { session: null }, error: null }
      },
      signInWithPassword: async ({ email, password }: any) => {
        // Kembalikan sukses palsu, logika route handler Anda yang harus mengatur cookie
        if (email === process.env.AUTHORIZED_EMAIL) {
          return { data: { user: mockUser, session: { access_token: 'dummy' } }, error: null }
        }
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } }
      },
      signInWithOAuth: async () => {
        // Secara langsung kembalikan URL utama ('/') agar Server Action mem-bypass callback
        // Karena cookie fintrack_fake_session sudah diset oleh wdio.conf.js di awal tes
        return { data: { url: '/' }, error: null }
      },
      signOut: async () => {
        // Berhasil secara instan. Menghapus cookie biasanya ditangani oleh route handler/action Next.js
        return { error: null }
      }
    },
    // Operasi database tidak lagi relevan di sini karena Anda sudah menggunakan Repository Pattern (FakeCashFlowRepository)
    // Tapi kita sisakan sebagai pencegahan error jika ada fitur yang masih menembak Supabase langsung.
    from: (table: string) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
    })
  } as any;
}

