import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
  isStealth: boolean;
  toggleStealth: () => void;
  formatMoney: (amountInManYen: number) => string;
  formatRawMoney: (amountInYen: number) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const STEALTH_STORAGE_KEY = 'secure_wealth_stealth_v1';

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isStealth, setIsStealth] = useState<boolean>(() => {
    return localStorage.getItem(STEALTH_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STEALTH_STORAGE_KEY, String(isStealth));
  }, [isStealth]);

  const toggleStealth = () => setIsStealth((prev) => !prev);

  // 万円単位のフォーマット（ステルス対応）
  const formatMoney = (amountInManYen: number): string => {
    if (isStealth) return '•••• 万円';
    if (Math.abs(amountInManYen) >= 10000) {
      const oku = Math.floor(amountInManYen / 10000);
      const man = Math.round(amountInManYen % 10000);
      return man > 0 ? `${oku}億${man.toLocaleString()}万円` : `${oku}億円`;
    }
    return `${Math.round(amountInManYen).toLocaleString()}万円`;
  };

  // 円単位のフォーマット（ステルス対応）
  const formatRawMoney = (amountInYen: number): string => {
    if (isStealth) return '•••••• 円';
    return `${Math.round(amountInYen).toLocaleString()}円`;
  };

  return (
    <PrivacyContext.Provider
      value={{
        isStealth,
        toggleStealth,
        formatMoney,
        formatRawMoney,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = (): PrivacyContextType => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};
