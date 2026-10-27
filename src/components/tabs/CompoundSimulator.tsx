import { usePrivacy } from '../../context/PrivacyContext';
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Zap,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  Receipt,
} from 'lucide-react';
import { RealisticMonteCarloInput } from '../../types';
import {
  run5000MonthlyMonteCarlo,
  formatManYen,
} from '../../utils/finance';

const STORAGE_KEY = 'secure_wealth_compound_input_v3';

const DEFAULT_COMPOUND_INPUT = {
  currentAge: 19, // 山口大学工学部1年
  years: 30,
  initialAmount: 300, // 現在の純資産300万円
  monthlyDeposit: 3, // 学部生〜初期平均3万円
  expectedReturn: 7.2,
  volatility: 16.5,
  crashEnabled: true,
  crashAnnualProbability: 5.0,
  applyNisa: true,
};

export const CompoundSimulator: React.FC = () => {
  const { isStealth } = usePrivacy();
  const [params, setParams] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse compound input from storage', e);
      }
    }
    return DEFAULT_COMPOUND_INPUT;
  });

  const [showTable, setShowTable] = useState(false);

  // 自動保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  }, [params]);

  // モンテカルロシミュレーション入力形式に変換して共通エンジン実行
  const summary = useMemo(() => {
    const mcInput: RealisticMonteCarloInput = {
      currentAge: params.currentAge,
      targetAge: params.currentAge + params.years,
      initialAmount: params.initialAmount,
      expectedReturn: params.expectedReturn,
      volatility: params.volatility,
      stages: [
        {
          id: 'single',
          fromAge: params.currentAge,
          toAge: params.currentAge + params.years,
          monthlyDeposit: params.monthlyDeposit,
        },
      ],
      targetAmount: 3000,
      goalAge: params.currentAge + params.years,
      crashEnabled: params.crashEnabled,
      crashAnnualProbability: params.crashAnnualProbability,
      crashDropMin: 25,
      crashDropMax: 45,
      applyNisa: params.applyNisa,
    };
    return run5000MonthlyMonteCarlo(mcInput);
  }, [params]);

  const lastPoint = summary.yearlyPoints[summary.yearlyPoints.length - 1] || {
    principal: 0,
    nisaPrincipal: 0,
    taxablePrincipal: 0,
    nisaBalance: 0,
    taxableNetBalance: 0,
    taxAmount: 0,
    median: 0,
    top25: 0,
    bottom25: 0,
  };

  // プリセット適用
  const applyPreset = (preset: Partial<typeof DEFAULT_COMPOUND_INPUT>) => {
    setParams((prev: typeof DEFAULT_COMPOUND_INPUT) => ({ ...prev, ...preset }));
  };

  return (
    <div className="space-y-8">
      {/* プリセット選択 */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm">
        <span className="flex items-center text-slate-500 font-medium mr-2">
          <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
          積立プリセット:
        </span>
        <button
          onClick={() =>
            applyPreset({
              initialAmount: 300,
              monthlyDeposit: 15,
              expectedReturn: 6.5,
              volatility: 16.5,
              years: 20,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium text-xs"
        >
          超積極積立 (月15万・元本3900万・20年)
        </button>
        <button
          onClick={() =>
            applyPreset({
              initialAmount: 100,
              monthlyDeposit: 10,
              expectedReturn: 7.2,
              volatility: 16.5,
              years: 25,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium text-xs"
        >
          NISA枠超え長期 (月10万・元本3100万・25年)
        </button>
        <button
          onClick={() =>
            applyPreset({
              initialAmount: 0,
              monthlyDeposit: 10,
              expectedReturn: 5.0,
              volatility: 15.0,
              years: 15,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium text-xs"
        >
          NISA枠ジャスト (月10万・元本1800万・15年)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 入力フォーム */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Zap className="w-5 h-5 mr-2 text-brand-600" />
                積立条件設定
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                5,000回モンテカルロ ＋ NISA枠超過特定分離
              </p>
            </div>
            <button
              onClick={() => setParams(DEFAULT_COMPOUND_INPUT)}
              title="初期値に戻す"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* 初期投資額 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <label className="text-slate-600 dark:text-slate-300">初期投資額</label>
              <span className="font-bold text-slate-900 dark:text-white">
                {params.initialAmount} 万円
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="3000"
              step="50"
              value={params.initialAmount}
              onChange={(e) =>
                setParams({ ...params, initialAmount: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* 毎月の積立額 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <label className="text-slate-600 dark:text-slate-300">毎月の積立額</label>
              <span className="font-bold text-slate-900 dark:text-white">
                {params.monthlyDeposit} 万円 (年間 {Math.round(params.monthlyDeposit * 12)} 万円)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={params.monthlyDeposit}
              onChange={(e) =>
                setParams({ ...params, monthlyDeposit: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* 積立期間 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <label className="text-slate-600 dark:text-slate-300">積立年数</label>
              <span className="font-bold text-slate-900 dark:text-white">
                {params.years} 年間
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={params.years}
              onChange={(e) =>
                setParams({ ...params, years: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* リターン・リスク */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                想定年利: {params.expectedReturn}%
              </label>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={params.expectedReturn}
                onChange={(e) =>
                  setParams({ ...params, expectedReturn: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                年率リスク: {params.volatility}%
              </label>
              <input
                type="range"
                min="5"
                max="35"
                step="0.5"
                value={params.volatility}
                onChange={(e) =>
                  setParams({ ...params, volatility: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* 暴落トグル ＆ NISAトグル */}
          <div className="space-y-2 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.crashEnabled}
                  onChange={(e) =>
                    setParams({ ...params, crashEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ランダム暴落ショックを発生させる
                </span>
              </label>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.applyNisa}
                  onChange={(e) =>
                    setParams({ ...params, applyNisa: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  新NISA枠（1,800万円）を優先利用
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 結果サマリー ＆ チャート */}
        <div className="lg:col-span-8 space-y-6">
          {/* 4分割サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* ① 実質総資産（中央値） */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-5 rounded-3xl text-white shadow-lg border border-indigo-800/50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                税引後 総資産 (中央値)
              </span>
              <div className="text-2xl md:text-3xl font-black mt-1 text-white">
                {formatManYen(lastPoint.median, isStealth)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                元本: {formatManYen(lastPoint.principal, isStealth)}
              </div>
            </div>

            {/* ② NISA口座 (非課税手取り) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  NISA口座 (非課税)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
                  無税
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatManYen(lastPoint.nisaBalance, isStealth)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                元本 {formatManYen(lastPoint.nisaPrincipal, isStealth)}
              </div>
            </div>

            {/* ③ 特定口座 (税引後手取り) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-sky-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  特定口座 (税引後)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 font-bold">
                  超過分
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                {formatManYen(lastPoint.taxableNetBalance, isStealth)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                元本 {formatManYen(lastPoint.taxablePrincipal, isStealth)}
              </div>
            </div>

            {/* ④ 税金で減る額 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center">
                  <Receipt className="w-3 h-3 mr-1 text-rose-500" />
                  税金で減る額
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold">
                  20.315%
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                -{formatManYen(lastPoint.taxAmount, isStealth)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                特定口座の利益課税分
              </div>
            </div>
          </div>

          {/* 上位25% ＆ 下位25% インフォ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                好調シナリオ (上位25%):
              </span>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatManYen(lastPoint.top25, isStealth)}
              </div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs">
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                軟調・暴落シナリオ (下位25%):
              </span>
              <div className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5">
                {formatManYen(lastPoint.bottom25, isStealth)}
              </div>
            </div>
          </div>

          {/* モンテカルロ＆口座別グラフ */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  5,000回試行 資産推移ファンチャート
                </h3>
                <p className="text-xs text-slate-400">
                  上位25%・中央値・下位25%のパーセンタイル推移です
                </p>
              </div>
              <button
                onClick={() => setShowTable(!showTable)}
                className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"
              >
                <TableIcon className="w-3.5 h-3.5 mr-1.5" />
                {showTable ? 'グラフのみ表示' : '詳細推移表を表示'}
              </button>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={summary.yearlyPoints}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(val) => `${val}年`}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(val) => `${val}万`}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => {
                      const labelMap: Record<string, string> = {
                        top25: '上位25% (好調)',
                        median: '中央値 (標準)',
                        bottom25: '下位25% (軟調・暴落)',
                        principal: '積立元本',
                      };
                      return [`${formatManYen(Number(val), isStealth)}`, labelMap[name] || name];
                    }}
                    labelFormatter={(label) => `${label} 年目`}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      padding: '10px 14px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />

                  <Line
                    type="monotone"
                    dataKey="top25"
                    name="top25"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="median"
                    name="median"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bottom25"
                    name="bottom25"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="principal"
                    name="principal"
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 年次推移詳細テーブル */}
          {showTable && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                年次別 資産推移・口座内訳詳細
              </h3>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-3 py-3 rounded-l-xl">年数</th>
                      <th className="px-3 py-3">累計元本</th>
                      <th className="px-3 py-3 text-amber-600 dark:text-amber-400">下位25%</th>
                      <th className="px-3 py-3 text-blue-600 dark:text-blue-400">中央値総額</th>
                      <th className="px-3 py-3 text-emerald-600 dark:text-emerald-400">NISA資産</th>
                      <th className="px-3 py-3 text-rose-600 dark:text-rose-400">税金で減る額</th>
                      <th className="px-3 py-3 text-sky-600 dark:text-sky-400">特定(税引後)</th>
                      <th className="px-3 py-3 text-emerald-600 dark:text-emerald-400 rounded-r-xl">上位25%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {summary.yearlyPoints.map((item) => (
                      <tr
                        key={item.year}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                          {item.year === 0 ? '開始時' : `${item.year} 年目`}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                          {formatManYen(item.principal, isStealth)}
                        </td>
                        <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400 font-semibold">
                          {formatManYen(item.bottom25, isStealth)}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">
                          {formatManYen(item.median, isStealth)}
                        </td>
                        <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400">
                          {formatManYen(item.nisaBalance, isStealth)}
                        </td>
                        <td className="px-3 py-2.5 text-rose-500 font-semibold">
                          {item.taxAmount > 0 ? `-${formatManYen(item.taxAmount, isStealth)}` : '0円'}
                        </td>
                        <td className="px-3 py-2.5 text-sky-600 dark:text-sky-400">
                          {formatManYen(item.taxableNetBalance, isStealth)}
                        </td>
                        <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatManYen(item.top25, isStealth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
