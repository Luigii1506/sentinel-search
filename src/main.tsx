import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Dark is the principal theme. attribute="class" toggles `.dark` on
        <html>, which drives the CSS-variable split in index.css and every
        Tailwind dark: / shadcn token. enableSystem disabled so the product
        opens in its branded dark mode, light is an explicit opt-in. */}
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="sentinel-theme"
      disableTransitionOnChange
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
)
