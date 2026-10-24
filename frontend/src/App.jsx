// src/App.jsx - decides which page to show for each URL (React Router)
//
// Every page is loaded with React.lazy(), so a page's code is only downloaded the first time
// someone visits it ("code splitting"). While it downloads, the <Suspense> fallback in Layout.jsx shows.
// Based on App.jsx in the Week 8 React Showcase.
import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'


import Layout from './components/layout/Layout.jsx'   // not lazy: it is on screen for every page

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const LoginPage = lazy(() => import('./pages/login.jsx'))
const SignUpPage = lazy(() => import('./pages/signup.jsx'))
const AccountPage = lazy(() => import('./pages/account.jsx'))

export default function App() {
  return (
    <Routes>
      {/* Layout draws the header and footer; the matching page appears in its <Outlet /> */}
      <Route element={<Layout />}>
        {/* Default address: HomePage */}
        <Route index element={<HomePage />} />

        {/* Account pages: opened from the account menu in Layout.jsx (navigate('/login') etc.) */}
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="account" element={<AccountPage />} />

        {/* More pages go here, e.g. <Route path="documentation" element={<DocumentationPage />} /> */}

        {/* Any other address: 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
