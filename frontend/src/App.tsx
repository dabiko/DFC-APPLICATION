import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ThemeToggle } from '@components/ThemeToggle'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Digital Filing Cabinet</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Secure Document Management System - Phase 0 Setup Complete ✅
      </p>

      <div className="card">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          count is {count}
        </button>
        <p className="mt-4">
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Confidentiality Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="px-4 py-2 rounded bg-confidentiality-public text-white">Public</div>
          <div className="px-4 py-2 rounded bg-confidentiality-internal text-white">Internal</div>
          <div className="px-4 py-2 rounded bg-confidentiality-confidential text-white">
            Confidential
          </div>
          <div className="px-4 py-2 rounded bg-confidentiality-highly-confidential text-white">
            Highly Confidential
          </div>
        </div>
      </div>

      <p className="read-the-docs mt-8">
        Click the theme toggle (top right) to switch between Light, Dark, and System modes
      </p>
    </>
  )
}

export default App
