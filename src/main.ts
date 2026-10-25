import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { initTheme } from '@/composables/useTheme'

initTheme()

const app = createApp(App)
app.use(createPinia())
app.use(Vant)
app.use(router)
app.mount('#app')
