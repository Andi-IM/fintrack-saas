export function createClient() {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'mock-user-id',
            email: process.env.AUTHORIZED_EMAIL || 'ci@example.com',
            role: 'authenticated',
            aud: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          }
        },
        error: null
      }),
      getSession: async () => ({ data: { session: null }, error: null })
    },
    from: (table: string) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
    })
  } as any;
}
