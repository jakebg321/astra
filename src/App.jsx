import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PreloadIndicator from './components/PreloadIndicator';
import FriendRequestNotification from './components/FriendRequestNotification';
import GameInviteManager from './components/GameInviteNotification';
import GlobalAssetPreloader from './components/GlobalAssetPreloader';

import './game/services/UniversalAssetTracker';
import './game/services/PerformanceMonitor';
import './game/services/SessionLogger';

const Profile = React.lazy(() => import('./pages/Profile'));
const GamePage = React.lazy(() => import('./pages/GamePage'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Clans = React.lazy(() => import('./pages/Clans'));
const ProfileCustomization = React.lazy(() => import('./pages/ProfileCustomization'));
const StatsPage = React.lazy(() => import('./pages/StatsPage'));
const Friends = React.lazy(() => import('./pages/Friends'));
const ArenaViewer = React.lazy(() => import('./pages/ArenaViewer'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-cyan-400 font-mono text-sm">LOADING SYSTEMS...</div>
    </div>
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">{children}</main>
    </div>
  );
};

const App = () => {
  return (
    <UserProvider>
      <GlobalAssetPreloader />

      <PreloadIndicator />

      <FriendRequestNotification />


      <GameInviteManager />

      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={
            <AppLayout>
              <Home />
            </AppLayout>
          } />
          <Route path="/profile" element={
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
            </AppLayout>
          } />
          <Route path="/game" element={
            <div style={{ isolation: 'isolate' }}>
              <Suspense fallback={<PageLoader />}>
                <GamePage />
              </Suspense>
            </div>
          } />
          <Route path="/game/tutorial" element={
            <div style={{ isolation: 'isolate' }}>
              <Suspense fallback={<PageLoader />}>
                <GamePage />
              </Suspense>
            </div>
          } />
          <Route path="/game/training" element={
            <div style={{ isolation: 'isolate' }}>
              <Suspense fallback={<PageLoader />}>
                <GamePage />
              </Suspense>
            </div>
          } />
          <Route path="/auth" element={
            <Suspense fallback={<PageLoader />}>
              <Auth />
            </Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          } />
          <Route path="/clans" element={
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Clans />
              </Suspense>
            </AppLayout>
          } />
          <Route path="/customize" element={
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <ProfileCustomization />
              </Suspense>
            </AppLayout>
          } />
          <Route path="/stats" element={
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <StatsPage />
              </Suspense>
            </AppLayout>
          } />
          <Route path="/friends" element={
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Friends />
              </Suspense>
            </AppLayout>
          } />
          <Route path="/arena" element={
            <Suspense fallback={<PageLoader />}>
              <ArenaViewer />
            </Suspense>
          } />
        </Routes>
      </Router>
      </UserProvider>
  );
};

export default App;
