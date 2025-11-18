import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@store'

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Routes will be added here */}
          <Route path="/" element={<div>DFC Application</div>} />
        </Routes>
      </Router>
    </Provider>
  )
}

export default App
