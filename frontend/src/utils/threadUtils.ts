const KEY = 'scheduling_thread_id'

export const threadUtils = {
  get: (): string | null => localStorage.getItem(KEY),

  getOrCreate: (): string => {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  },

  clear: (): void => localStorage.removeItem(KEY),

  set: (id: string): void => localStorage.setItem(KEY, id),
}
