import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { RealisticPlanner } from './components/tabs/RealisticPlanner';
import { CompoundSimulator } from './components/tabs/CompoundSimulator';
import { GoalPlanner } from './components/tabs/GoalPlanner';
import { MyAssets } from './components/tabs/MyAssets';
import { PrivacyProvider } from './context/PrivacyContext';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('realistic');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  // ダークモードクラス適用
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleDarkMode = () => setIsDark(!isDark);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        toggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fadeIn">
          {activeTab === 'realistic' && <RealisticPlanner />}
          {activeTab === 'compound' && <CompoundSimulator />}
          {activeTab === 'goal' && <GoalPlanner />}
          {activeTab === 'my_assets' && <MyAssets />}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <div className="flex items-center justify-center space-x-2 text-emerald-600 dark:text-emerald-400 font-medium">
            <span>🛡️ 100% Client-Side Only (外部通信・追跡・分析送信一切なし)</span>
          </div>
          <p>
            ※ 入力された資産情報やCSVデータはすべてお使いのブラウザ内部でのみ計算・保存され、サーバーへ送信されることはありません。
          </p>
          <p className="text-[11px] text-slate-400">
            Secure Wealth Navigator — 5,000回モンテカルロ試行 ＆ 楽天証券CSVセキュアナビ
          </p>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PrivacyProvider>
      <AppContent />
    </PrivacyProvider>
  );
};

export default App;
