import { revalidatePath, revalidateTag } from 'next/cache'

export function invalidateCache(paths: string[]): void {
  for (const path of paths) {
    revalidatePath(path)
  }
}

export function invalidateCacheTags(tags: string[]): void {
  for (const tag of tags) {
    revalidateTag(tag, 'max')
  }
}
