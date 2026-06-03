import { createRouter, createWebHistory } from 'vue-router'
import FormView from '../views/FormView.vue'
import SuccessView from '../views/SuccessView.vue'
import VoteCountsView from '../views/VoteCountsView.vue'

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
    },
    {
      path: '/:formId/counts',
      name: 'counts',
      component: VoteCountsView
    }
  ]
})

export default router
