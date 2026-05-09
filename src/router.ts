import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import TemplateEditor from './pages/TemplateEditor.vue'
import Settings from './pages/Settings.vue'

const routes = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/editor/:id', name: 'editor', component: TemplateEditor },
  { path: '/settings', name: 'settings', component: Settings },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
