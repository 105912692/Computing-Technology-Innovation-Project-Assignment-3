// src/App.jsx - decides which page to show for each URL (React Router)
import { Routes, Route } from 'react-router-dom'

import Layout from './components/layout/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Layout draws the header and footer; the matching page appears in its <Outlet /> */}
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {/* Any other address: 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
