import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
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
  const [showPromo, setShowPromo] = useState(true);

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

      {/* Promo banner */}
      {showPromo && (
        <div className="relative bg-gradient-to-r from-[#A10727] via-[#BF092F] to-[#A10727] text-white px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-widest shadow">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span> **** VERSION BETA ::: GRATUITO POR TIEMPO LIMITADO ***** </span>
          <button
            onClick={() => setShowPromo(false)}
            aria-label="Cerrar aviso"
            className="absolute right-3 p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

  // Contador de visitas: 1 hit por pestaña (sessionStorage), persistente en PG
  useEffect(() => {
    if (sessionStorage.getItem('ialegal_visit_hit')) return;
    sessionStorage.setItem('ialegal_visit_hit', '1');
    fetch(`${import.meta.env.BASE_URL}api/visits/hit`, { method: 'POST' }).catch(() => {});
  }, []);

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
