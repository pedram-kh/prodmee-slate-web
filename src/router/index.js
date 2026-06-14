import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/share/:token', name: 'share', component: () => import('../views/ShareView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../views/AppShell.vue'),
    children: [
      { path: '', redirect: '/slate' },
      { path: 'slate', name: 'slate', component: () => import('../views/SlateView.vue') },
      { path: 'sales', name: 'sales', component: () => import('../views/SalesView.vue'), meta: { writer: true } },
      { path: 'team', name: 'team', component: () => import('../views/TeamView.vue'), meta: { admin: true } },
      { path: 'settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { admin: true } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/slate' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!auth.ready) await auth.fetchMe()

  if (to.meta.public) {
    // Logged-in users skip the login screen.
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'slate' }
    return true
  }

  if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }

  // External users are confined to the slate view.
  if (auth.isExternal && to.name !== 'slate') return { name: 'slate' }
  if (to.meta.admin && !auth.isAdmin) return { name: 'slate' }
  if (to.meta.writer && !auth.isWriter) return { name: 'slate' }

  return true
})

export default router
