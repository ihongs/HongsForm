import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../api'
import LoginView from '../views/LoginView.vue'
import FormsView from '../views/FormsView.vue'
import DesignerView from '../views/DesignerView.vue'
import DataView from '../views/DataView.vue'

const router = createRouter({
  history: createWebHistory('/agent/'),
  routes: [
    { path: '/', redirect: '/forms' },
    { path: '/login', component: LoginView },
    { path: '/forms', component: FormsView, meta: { auth: true } },
    { path: '/forms/new', component: DesignerView, meta: { auth: true } },
    { path: '/forms/:id/design', component: DesignerView, meta: { auth: true } },
    { path: '/forms/:id/data', component: DataView, meta: { auth: true } }
  ]
})

router.beforeEach((to) => {
  if (to.meta.auth && !getToken()) {
    return '/login'
  }
  if (to.path === '/login' && getToken()) {
    return '/forms'
  }
})

export default router
