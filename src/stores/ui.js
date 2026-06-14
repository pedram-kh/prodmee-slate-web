import { defineStore } from 'pinia'

let seq = 0

export const useUi = defineStore('ui', {
  state: () => ({ toasts: [] }),
  actions: {
    toast(message, kind = 'ok') {
      const id = ++seq
      this.toasts.push({ id, message, kind })
      setTimeout(() => this.dismiss(id), 3200)
    },
    error(message) {
      this.toast(message, 'err')
    },
    dismiss(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
  },
})
