import { createRouter, createWebHistory } from 'vue-router'
import FormView from '../views/FormView.vue'
import SuccessView from '../views/SuccessView.vue'
import VoteCountsView from '../views/VoteCountsView.vue'
import SignView from '../views/SignView.vue'
import SignAgentView from '../views/SignAgentView.vue'
import SignGuestView from '../views/SignGuestView.vue'

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
    },
    {
      path: '/:formId/sign/:id/:checksum',
      name: 'sign',
      component: SignView
    },
    {
      path: '/:formId/sign-agent/:checksum',
      name: 'sign-agent',
      component: SignAgentView
    },
    {
      path: '/:formId/sign-guest/:checksum',
      name: 'sign-guest',
      component: SignGuestView
    }
  ]
})

export default router
