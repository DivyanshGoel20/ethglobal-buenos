import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Web3Providers } from './providers/Web3Providers.tsx'
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider'
import { MiniKit } from '@worldcoin/minikit-js'

// Check if MiniKit is installed and ready to use
console.log('MiniKit is installed:', MiniKit.isInstalled())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MiniKitProvider>
      <Web3Providers>
        <App />
      </Web3Providers>
    </MiniKitProvider>
  </StrictMode>,
)
