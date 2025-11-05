// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // Custom app-level enhancements can be added here
  }
}
