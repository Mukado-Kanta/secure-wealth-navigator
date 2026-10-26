import React from 'react';
import {
  TrendingUp,
  Target,
  Wallet,
  Sun,
  Moon,
  Coins,
  Dices,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';

export type ActiveTab = 'realistic' | 'compound' | 'goal' | 'my_assets';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleDarkMode,
}) => {
  const { isStealth, toggleStealth } = usePrivacy();

  const navItems = [
    {
      id: 'realistic' as ActiveTab,
      label: '現実的プラン (5000回モンテカルロ)',
      icon: Dices,
      badge: '推奨',
    },
    {
      id: 'compound' as ActiveTab,
      label: '積立・複利シミュレーター',
      icon: TrendingUp,
    },
    {
      id: 'goal' as ActiveTab,
      label: '目標逆算プランナー',
      icon: Target,
    },
    {
      id: 'my_assets' as ActiveTab,
      label: 'マイ資産 (楽天証券CSV対応)',
      icon: Wallet,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Secure Wealth Navigator
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  端末内完結
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                5,000回モンテカルロ ＆ 楽天証券CSVセキュアナビ
              </p>
            </div>
          </div>

          {/* デスクトップ用ナビゲーションタブ */}
          <nav className="hidden lg:flex space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded-md font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 右端アクション: ステルスモード切替 ＆ ダークモード切替 */}
          <div className="flex items-center space-x-2">
            {/* ステルスモードトグル */}
            <button
              onClick={toggleStealth}
              title={isStealth ? 'ステルスモード解除 (金額を表示)' : 'ステルスモード有効化 (金額を覗き見防止)'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isStealth
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isStealth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{isStealth ? 'ステルスON' : '覗き見防止'}</span>
            </button>

            {/* ダークモード切替 */}
            <button
              onClick={toggleDarkMode}
              title={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* モバイル用ナビゲーションタブ */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-2 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
