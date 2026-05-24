import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../api'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import FormsView from '../views/FormsView.vue'
import DesignerView from '../views/DesignerView.vue'
import DataView from '../views/DataView.vue'
import ApiKeyView from '../views/ApiKeyView.vue'

const router = createRouter({
  history: createWebHistory('/agent/'),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView },
    { path: '/dashboard', component: DashboardView, meta: { auth: true } },
    { path: '/forms', component: FormsView, meta: { auth: true } },
    { path: '/forms/new', component: DesignerView, meta: { auth: true } },
    { path: '/forms/:id/design', component: DesignerView, meta: { auth: true } },
    { path: '/forms/:id/data', component: DataView, meta: { auth: true } },
    { path: '/api-keys', component: ApiKeyView, meta: { auth: true } }
  ]
})

router.beforeEach((to) => {
  if (to.meta.auth && !getToken()) {
    return '/login'
  }
  if (to.path === '/login' && getToken()) {
    return '/dashboard'
  }
})

export default router
