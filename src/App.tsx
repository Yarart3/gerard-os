import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { UiGallery } from './dev/UiGallery'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { GeneralSettingsPage } from './features/settings/GeneralSettingsPage'
import { CutoffSync } from './features/today/CutoffSync'
import { ThemeSync } from './features/settings/ThemeSync'
import { AppLayout } from './layout/AppLayout'
import { SECTIONS } from './layout/sections'
import { SectionScreen } from './layout/SectionScreen'
import { persistOptions } from './lib/offline/persister'
import { registerOfflineMutations } from './lib/offline/register'
import { resumeOfflineQueue } from './lib/offline/restore'
import { queryClient } from './lib/queryClient'

// Antes de restaurar la caché: las mutaciones pausadas recuperan su función por mutationKey.
registerOfflineMutations(queryClient)

export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => resumeOfflineQueue(queryClient)}
    >
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dev/ui" element={<UiGallery />} />
              <Route element={<RequireAuth />}>
                <Route
                  element={
                    <>
                      <ThemeSync />
                      <CutoffSync />
                      <AppLayout />
                    </>
                  }
                >
                  {SECTIONS.map((section) =>
                    section.path === '/' ? (
                      <Route key={section.id} index element={<SectionScreen section={section} />} />
                    ) : (
                      <Route
                        key={section.id}
                        path={`${section.path.slice(1)}/:sub?`}
                        element={<SectionScreen key={section.id} section={section} />}
                      />
                    ),
                  )}
                  <Route path="ajustes" element={<GeneralSettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}
