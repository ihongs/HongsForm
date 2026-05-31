import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../api'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import FormsView from '../views/FormsView.vue'
import FormRecordView from '../views/FormRecordView.vue'
import UsersView from '../views/UsersView.vue'
import ApiKeyView from '../views/ApiKeyView.vue'
import AccountView from '../views/AccountView.vue'

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView },
    { path: '/dashboard', component: DashboardView, meta: { auth: true } },
    { path: '/forms', component: FormsView, meta: { auth: true } },
    { path: '/forms/:id/record', component: FormRecordView, meta: { auth: true } },
    { path: '/users', component: UsersView, meta: { auth: true } },
    { path: '/api-keys', component: ApiKeyView, meta: { auth: true } },
    { path: '/account', component: AccountView, meta: { auth: true } }
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
