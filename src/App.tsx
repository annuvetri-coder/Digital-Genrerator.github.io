/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { DashboardOverview } from './components/DashboardOverview';
import { BatchWizard } from './components/wizard/BatchWizard';
import { BatchesManager } from './components/BatchesManager';
import { CertificateRecords } from './components/CertificateRecords';
import { TemplateLibrary } from './components/TemplateLibrary';
import { VerificationPortal } from './components/VerificationPortal';
import { SettingsPage } from './components/SettingsPage';
import { LoginModal } from './components/LoginModal';
import { MarkPortal } from './components/marks/MarkPortal';
import { FrontCoverLoadingScreen } from './components/FrontCoverLoadingScreen';

function MainApp() {
  const [currentTab, setCurrentTab] = useState('website');
  const [verifyCertNumber, setVerifyCertNumber] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Parse path / query on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const params = new URLSearchParams(search);

      if (pathname.includes('/verify') || params.has('verify') || params.has('id')) {
        setCurrentTab('verify');
        if (params.get('id')) {
          setVerifyCertNumber(params.get('id') || '');
        }
      } else if (pathname.includes('/marks') || params.has('marks') || params.get('portal') === 'marks') {
        setCurrentTab('marks');
      } else if (params.get('tab')) {
        setCurrentTab(params.get('tab') || 'website');
      }
    }
  }, []);

  // Keep browser URL searchParams in sync with current view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (currentTab === 'marks') {
        url.searchParams.set('portal', 'marks');
        url.searchParams.delete('tab');
      } else if (currentTab === 'website') {
        url.searchParams.delete('portal');
        url.searchParams.delete('tab');
      } else {
        url.searchParams.delete('portal');
        url.searchParams.set('tab', currentTab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentTab]);

  const handleVerifyCertificate = (certNum?: string) => {
    if (certNum) {
      setVerifyCertNumber(certNum);
    }
    setCurrentTab('verify');
  };

  // If viewing the external mark portal, render it as a standalone portal without the certificate generator layout
  if (currentTab === 'marks') {
    return (
      <MarkPortal
        onBackToMain={() => setCurrentTab('website')}
        onGenerateCertificatesForBatch={(batchCode, studentNames) => {
          setCurrentTab('generator');
        }}
      />
    );
  }

  const isWebsiteView = currentTab === 'website';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <FrontCoverLoadingScreen />
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {isWebsiteView ? (
        /* Full-width Website View */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LandingPage
            onGoToGenerator={() => setCurrentTab('generator')}
            onGoToVerify={(num) => handleVerifyCertificate(num)}
            onGoToAdmin={() => setCurrentTab('dashboard')}
            onGoToMarks={() => setCurrentTab('marks')}
          />
        </main>
      ) : (
        /* Admin Management Suite View with Sidebar */
        <div className="flex-1 max-w-7xl w-full mx-auto flex">
          {/* Sidebar Navigation */}
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {currentTab === 'dashboard' && (
              <DashboardOverview
                onStartGenerator={() => setCurrentTab('generator')}
                onViewBatches={() => setCurrentTab('batches')}
                onViewRecords={() => setCurrentTab('records')}
                onVerifyCertificate={handleVerifyCertificate}
                onOpenTemplates={() => setCurrentTab('templates')}
                onGoToMarks={() => setCurrentTab('marks')}
              />
            )}

            {currentTab === 'generator' && (
              <BatchWizard
                onFinish={() => setCurrentTab('batches')}
                onVerifyCertificate={handleVerifyCertificate}
              />
            )}

            {currentTab === 'batches' && (
              <BatchesManager
                onCreateNewBatch={() => setCurrentTab('generator')}
                onVerifyCertificate={handleVerifyCertificate}
              />
            )}

            {currentTab === 'records' && (
              <CertificateRecords onVerifyCertificate={handleVerifyCertificate} />
            )}

            {currentTab === 'templates' && <TemplateLibrary />}

            {currentTab === 'verify' && (
              <VerificationPortal initialCertNumber={verifyCertNumber} />
            )}

            {currentTab === 'settings' && <SettingsPage />}
          </main>
        </div>
      )}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <MainApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
