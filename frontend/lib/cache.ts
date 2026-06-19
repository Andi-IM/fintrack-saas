import { revalidatePath } from 'next/cache'

export function invalidateCache(paths: string[]): void {
  for (const path of paths) {
    revalidatePath(path)
  }
}
