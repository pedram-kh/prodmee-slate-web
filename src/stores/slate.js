import { defineStore } from 'pinia'
import api from '../api/client'

// Central store for slate data: meta constants, projects, buyers, pitches.
export const useSlate = defineStore('slate', {
  state: () => ({
    meta: { stages: [], pitchStatuses: [], formats: [], genres: [], budgets: [], checklist: [] },
    projects: [],
    buyers: [],
    pitches: [],
    people: { members: [], collaborators: [] },
    loaded: false,
  }),
  getters: {
    stageById: (s) => (id) => s.meta.stages.find((x) => x.id === id) || s.meta.stages[0] || { label: id, color: '#888' },
    pstageById: (s) => (id) => s.meta.pitchStatuses.find((x) => x.id === id) || s.meta.pitchStatuses[0],
    projectById: (s) => (id) => s.projects.find((p) => p.id === id),
    buyerById: (s) => (id) => s.buyers.find((b) => b.id === id),
    checklistFlat: (s) => s.meta.checklist.flatMap((ph) => ph.items),
  },
  actions: {
    async loadAll() {
      const [meta, projects, buyers, pitches] = await Promise.all([
        api.get('/meta'),
        api.get('/projects'),
        api.get('/buyers'),
        api.get('/pitches'),
      ])
      this.meta = meta.data
      this.projects = projects.data.data
      this.buyers = buyers.data.data
      this.pitches = pitches.data.data
      this.loaded = true
    },
    async loadPeople() {
      try {
        const { data } = await api.get('/people')
        this.people = data
      } catch (e) {
        /* external users can't load the directory; ignore */
      }
    },
    upsertProject(p) {
      const i = this.projects.findIndex((x) => x.id === p.id)
      if (i >= 0) this.projects[i] = p
      else this.projects.unshift(p)
    },
    async refreshProject(id) {
      const { data } = await api.get(`/projects/${id}`)
      this.upsertProject(data.data)
      return data.data
    },
    async createProject(payload) {
      const { data } = await api.post('/projects', payload)
      this.upsertProject(data.data)
      return data.data
    },
    async updateProject(id, payload) {
      const { data } = await api.put(`/projects/${id}`, payload)
      this.upsertProject(data.data)
      return data.data
    },
    async setStage(id, stage) {
      const { data } = await api.post(`/projects/${id}/stage`, { stage })
      this.upsertProject(data.data)
    },
    async deleteProject(id) {
      await api.delete(`/projects/${id}`)
      this.projects = this.projects.filter((p) => p.id !== id)
    },
    async attachUser(id, userId, relation) {
      const { data } = await api.post(`/projects/${id}/access`, { user_id: userId, relation })
      this.upsertProject(data.data)
    },
    async detachUser(id, userId) {
      const { data } = await api.delete(`/projects/${id}/access/${userId}`)
      this.upsertProject(data.data)
    },
    async toggleChecklist(id, itemId, done) {
      await api.post(`/projects/${id}/checklist`, { item_id: itemId, done })
      await this.refreshProject(id)
    },
    async addComment(id, text) {
      await api.post(`/projects/${id}/comments`, { text })
      await this.refreshProject(id)
    },
    async removeComment(id, commentId) {
      await api.delete(`/projects/${id}/comments/${commentId}`)
      await this.refreshProject(id)
    },
    async addLink(id, label, url) {
      await api.post(`/projects/${id}/links`, { label, url })
      await this.refreshProject(id)
    },
    async removeLink(id, linkId) {
      await api.delete(`/projects/${id}/links/${linkId}`)
      await this.refreshProject(id)
    },
    // Share links
    async enableShare(id) {
      const { data } = await api.post(`/projects/${id}/share`)
      await this.refreshProject(id)
      return data
    },
    async regenerateShare(id) {
      const { data } = await api.post(`/projects/${id}/share/regenerate`)
      await this.refreshProject(id)
      return data
    },
    async revokeShare(id) {
      const { data } = await api.delete(`/projects/${id}/share`)
      await this.refreshProject(id)
      return data
    },
    // Sicala AI
    async askSicala(messages, attachments = []) {
      const { data } = await api.post('/ai/assistant', { messages, attachments })
      if (data.changed) await this.loadAll()
      return data
    },
    // Chat attachment: presign -> direct S3 PUT (temp prefix, not tied to a project yet)
    async uploadChatAttachment(file) {
      const { data: presign } = await api.post('/ai/attachments/presign', {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      })
      await fetch(presign.url, {
        method: 'PUT',
        headers: { ...(presign.headers || {}), 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      }).then((r) => {
        if (!r.ok) throw new Error('Upload to storage failed')
      })
      return { key: presign.key, name: file.name, mime_type: file.type || null, size: file.size }
    },
    async autofill(projectId) {
      const { data } = await api.post('/ai/autofill', { project_id: projectId })
      return data.fields || {}
    },
    // Files: presign -> direct S3 PUT -> persist metadata
    async uploadFile(projectId, file, slot, label) {
      const { data: presign } = await api.post(`/projects/${projectId}/files/presign`, {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        slot,
      })
      await fetch(presign.url, {
        method: 'PUT',
        headers: { ...(presign.headers || {}), 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      }).then((r) => {
        if (!r.ok) throw new Error('Upload to storage failed')
      })
      await api.post(`/projects/${projectId}/files`, {
        slot,
        key: presign.key,
        name: file.name,
        label: label || null,
        mime_type: file.type || null,
        size: file.size,
      })
      await this.refreshProject(projectId)
    },
    async deleteFile(projectId, fileId) {
      await api.delete(`/projects/${projectId}/files/${fileId}`)
      await this.refreshProject(projectId)
    },
    // Buyers
    async createBuyer(payload) {
      const { data } = await api.post('/buyers', payload)
      this.buyers.push(data.data)
      return data.data
    },
    async updateBuyer(id, payload) {
      const { data } = await api.put(`/buyers/${id}`, payload)
      const i = this.buyers.findIndex((b) => b.id === id)
      if (i >= 0) this.buyers[i] = data.data
    },
    async deleteBuyer(id) {
      await api.delete(`/buyers/${id}`)
      this.buyers = this.buyers.filter((b) => b.id !== id)
      this.pitches = this.pitches.filter((p) => p.buyer_id !== id)
    },
    // Pitches
    async createPitch(payload) {
      const { data } = await api.post('/pitches', payload)
      this.pitches.push(data.data)
      return data.data
    },
    async updatePitch(id, payload) {
      const { data } = await api.put(`/pitches/${id}`, payload)
      const i = this.pitches.findIndex((p) => p.id === id)
      if (i >= 0) this.pitches[i] = data.data
    },
    async setPitchStatus(id, status) {
      const { data } = await api.post(`/pitches/${id}/status`, { status })
      const i = this.pitches.findIndex((p) => p.id === id)
      if (i >= 0) this.pitches[i] = data.data
    },
    async deletePitch(id) {
      await api.delete(`/pitches/${id}`)
      this.pitches = this.pitches.filter((p) => p.id !== id)
    },
  },
})
