import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Unsubscribe from './pages/Unsubscribe'
import ThankYou from './pages/ThankYou'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/thank-you" element={<ThankYou />} />
      </Routes>
    </div>
  )
}

export default App
