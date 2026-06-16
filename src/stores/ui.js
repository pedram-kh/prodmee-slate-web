import { defineStore } from 'pinia'

let seq = 0

export const useUi = defineStore('ui', {
  state: () => ({ toasts: [], sidebarOpen: false, modalCount: 0 }),
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
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },
    closeSidebar() {
      this.sidebarOpen = false
    },
    openModal() {
      this.modalCount++
      this.sidebarOpen = false
    },
    closeModal() {
      this.modalCount = Math.max(0, this.modalCount - 1)
    },
  },
})
