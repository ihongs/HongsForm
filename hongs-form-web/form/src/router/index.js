import { createRouter, createWebHistory } from 'vue-router'
import FormView from '../views/FormView.vue'
import SuccessView from '../views/SuccessView.vue'

const router = createRouter({
  history: createWebHistory('/form/'),
  routes: [
    {
      path: '/:id',
      name: 'form',
      component: FormView
    },
    {
      path: '/:id/success',
      name: 'success',
      component: SuccessView
    }
  ]
})

export default router
