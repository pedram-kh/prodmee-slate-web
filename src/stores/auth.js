import { defineStore } from 'pinia'
import api, { setToken, getToken } from '../api/client'

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false, // becomes true once we've checked the existing token
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'admin',
    isExternal: (s) => s.user?.role === 'external',
    isWriter: (s) => ['admin', 'member'].includes(s.user?.role),
  },
  actions: {
    async requestCode(email) {
      const { data } = await api.post('/auth/request-code', { email })
      return data
    },
    async verifyCode(email, code) {
      const { data } = await api.post('/auth/verify-code', { email, code })
      setToken(data.token)
      this.user = data.user
      return data.user
    },
    async fetchMe() {
      if (!getToken()) {
        this.ready = true
        return null
      }
      try {
        const { data } = await api.get('/auth/me')
        this.user = data.user
      } catch (e) {
        this.user = null
        setToken(null)
      } finally {
        this.ready = true
      }
      return this.user
    },
    async logout() {
      try {
        await api.post('/auth/logout')
      } catch (e) {
        /* ignore */
      }
      setToken(null)
      this.user = null
    },
  },
})
