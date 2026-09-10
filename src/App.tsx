import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { RamaProvider } from './context/RamaContext';
import { Navbar } from './components/Navbar';
import { ChatView } from './components/ChatView';
import { GraphVisualizer } from './components/GraphVisualizer';
import { DocumentLibrary } from './components/DocumentLibrary';
import { AdminPanel } from './components/AdminPanel';
import { CitationModal } from './components/CitationModal';
import { LoginScreen } from './components/LoginScreen';
import { Citation, TaxDocument } from './types';

function MainAppContent() {
  const [currentTab, setCurrentTab] = useState<'chat' | 'graph' | 'library' | 'admin'>('chat');
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [selectedDocForChat, setSelectedDocForChat] = useState<TaxDocument | null>(null);

  const handleSelectDocForChat = (doc: TaxDocument) => {
    setSelectedDocForChat(doc);
    setCurrentTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased transition-colors duration-200">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* Main Tab Views */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentTab === 'chat' && (
          <ChatView
            onOpenCitation={cit => setActiveCitation(cit)}
            selectedDocForChat={selectedDocForChat}
          />
        )}

        {currentTab === 'graph' && (
          <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
            <GraphVisualizer onSelectNode={node => console.log('Selected node:', node)} />
          </div>
        )}

        {currentTab === 'library' && (
          <DocumentLibrary
            onSelectDocumentForChat={handleSelectDocForChat}
            onOpenUploadModal={() => setCurrentTab('admin')}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel />
        )}
      </main>

      {/* Citation Detail Modal / Drawer */}
      <CitationModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />

    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainAppContent /> : <LoginScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <RamaProvider>
            <AppContent />
          </RamaProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
