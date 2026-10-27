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
  Target,
  Lightbulb,
  Compass,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { GoalPlannerMonteCarloInput } from '../../types';
import {
  solveMonteCarloGoalPlanner,
  formatManYen,
} from '../../utils/finance';

const STORAGE_KEY = 'secure_wealth_goal_monte_carlo_v3';

const DEFAULT_GOAL_INPUT: GoalPlannerMonteCarloInput = {
  currentAge: 19, // 山口大学工学部1年
  goalAge: 35, // 35歳で準富裕層達成
  initialAmount: 300, // 現在の実質純資産300万円
  targetAmount: 3000, // 目標 3,000万円
  expectedReturn: 7.2, // 年利 6.0%
  volatility: 16.5, // 年率リスク 18.0%
  crashEnabled: true,
  crashAnnualProbability: 5.0,
  crashDropMin: 25,
  crashDropMax: 45,
  applyNisa: true,
};

export const GoalPlanner: React.FC = () => {
  const { isStealth } = usePrivacy();
  const [goal, setGoal] = useState<GoalPlannerMonteCarloInput>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse goal input from storage', e);
      }
    }
    return DEFAULT_GOAL_INPUT;
  });

  // 自動保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  }, [goal]);

  // モンテカルロ逆算計算
  const result = useMemo(() => {
    return solveMonteCarloGoalPlanner(goal);
  }, [goal]);

  // プリセット
  const applyPreset = (preset: Partial<GoalPlannerMonteCarloInput>) => {
    setGoal((prev) => ({ ...prev, ...preset }));
  };

  const years = Math.max(1, goal.goalAge - goal.currentAge);

  return (
    <div className="space-y-8">
      {/* プリセット選択 */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm">
        <button
          onClick={() =>
            setGoal({
              ...goal,
              currentAge: 19,
              goalAge: 23,
              targetAmount: 500,
              initialAmount: 300,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 transition-colors text-xs font-bold border border-emerald-300 dark:border-emerald-800"
        >
          🎓 23歳大学卒業時 500万円 (4年)
        </button>
        <span className="flex items-center text-slate-500 font-medium mr-2">
          <Compass className="w-4 h-4 mr-1.5 text-indigo-500" />
          目標プリセット:
        </span>
        <button
          onClick={() =>
            applyPreset({
              currentAge: 30,
              goalAge: 50,
              targetAmount: 2000,
              initialAmount: 50,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-xs font-semibold"
        >
          50歳で老後資金 2,000万 (20年)
        </button>
        <button
          onClick={() =>
            applyPreset({
              currentAge: 30,
              goalAge: 55,
              targetAmount: 3000,
              initialAmount: 100,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-xs font-semibold"
        >
          55歳でアッパーマス 3,000万 (25年)
        </button>
        <button
          onClick={() =>
            applyPreset({
              currentAge: 35,
              goalAge: 60,
              targetAmount: 5000,
              initialAmount: 300,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-xs font-semibold"
        >
          60歳で準富裕層 5,000万 (25年)
        </button>
        <button
          onClick={() =>
            applyPreset({
              currentAge: 30,
              goalAge: 65,
              targetAmount: 10000,
              initialAmount: 200,
            })
          }
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-xs font-semibold"
        >
          65歳で富裕層 1億円 (35年)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 入力フォーム */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Target className="w-5 h-5 mr-2 text-rose-500" />
                目標逆算の条件
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                5,000回のモンテカルロ試行から現実的な必要積立額を導き出します
              </p>
            </div>
            <button
              onClick={() => setGoal(DEFAULT_GOAL_INPUT)}
              title="初期値に戻す"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* 目標金額 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <label className="text-slate-600 dark:text-slate-300">目標金額</label>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
                {formatManYen(goal.targetAmount, isStealth)}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="20000"
              step="100"
              value={goal.targetAmount}
              onChange={(e) =>
                setGoal({ ...goal, targetAmount: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="100"
                max="50000"
                step="50"
                value={goal.targetAmount}
                onChange={(e) =>
                  setGoal({ ...goal, targetAmount: Math.max(0, Number(e.target.value)) })
                }
                className="w-28 px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              />
              <span className="text-sm text-slate-500">万円</span>
            </div>
          </div>

          {/* 年齢設定 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                現在の年齢
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={goal.currentAge}
                  onChange={(e) =>
                    setGoal({ ...goal, currentAge: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-400">歳</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                目標達成年齢
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={goal.currentAge + 1}
                  max="90"
                  value={goal.goalAge}
                  onChange={(e) =>
                    setGoal({ ...goal, goalAge: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-400">歳</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            ※ 積立運用期間: <strong>{years} 年間</strong> ({years * 12} ヶ月)
          </p>

          {/* 現在の元本 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <label className="text-slate-600 dark:text-slate-300">現在の資金（初期元本）</label>
              <span className="font-bold text-slate-900 dark:text-white">
                {goal.initialAmount} 万円
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2000"
              step="50"
              value={goal.initialAmount}
              onChange={(e) =>
                setGoal({ ...goal, initialAmount: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* リターン・リスク */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                想定年利: {goal.expectedReturn}%
              </label>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={goal.expectedReturn}
                onChange={(e) =>
                  setGoal({ ...goal, expectedReturn: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                年率リスク: {goal.volatility}%
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="0.5"
                value={goal.volatility}
                onChange={(e) =>
                  setGoal({ ...goal, volatility: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* 暴落トグル */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={goal.crashEnabled}
                onChange={(e) =>
                  setGoal({ ...goal, crashEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                ランダム暴落ショックを考慮する
              </span>
            </label>
            <p className="text-[11px] text-slate-400 mt-1">
              年率5%の暴落ショック（-25%〜-45%）を織り込んで逆算します
            </p>
          </div>
        </div>

        {/* 逆算結果カード ＆ グラフ */}
        <div className="lg:col-span-8 space-y-6">
          {/* 3段階の現実的必要積立額カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ① 現実・手堅いプラン（推奨：確率75%で達成） */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-lg border border-emerald-500/30 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                推奨プラン
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  手堅いプラン (達成確率 75%)
                </span>
                <div className="text-3xl md:text-4xl font-black mt-2">
                  {result.safeMonthly} <span className="text-base font-normal">万円/月</span>
                </div>
                <p className="text-[11px] text-emerald-100 mt-1.5 leading-relaxed">
                  下位25%（軟調相場や暴落）でも目標の{formatManYen(goal.targetAmount, isStealth)}に到達できる現実的な積立額です。
                </p>
              </div>
            </div>

            {/* ② 標準プラン（中央値50%で達成） */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between border-l-4 border-l-blue-500">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  標準プラン (達成確率 50%)
                </span>
                <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                  {result.medianMonthly} <span className="text-base font-normal text-slate-400">万円/月</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  相場が平均的（中央値）に推移した場合に目標をクリアできる積立額です。
                </p>
              </div>
            </div>

            {/* ③ 超安心プラン（達成確率 90%） */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between border-l-4 border-l-purple-500">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  超安心プラン (達成確率 90%)
                </span>
                <div className="text-2xl md:text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">
                  {result.ultraSafeMonthly} <span className="text-base font-normal text-slate-400">万円/月</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  歴史的暴落が直撃する最悪ケース（下位10%）でも達成できる鉄壁の積立額です。
                </p>
              </div>
            </div>
          </div>

          {/* 机上計算との比較インフォ */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">
                机上のフラット計算（毎年ブレずに{goal.expectedReturn}%で伸び続けた場合）:
                <strong className="text-slate-900 dark:text-white ml-1">毎月 {result.deterministicMonthly} 万円</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              ※ 現実の相場リスクを考慮した「手堅いプラン（月{result.safeMonthly}万）」を推奨
            </span>
          </div>

          {/* 手堅いプランでのモンテカルロ資産成長ファンチャート */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" />
                  手堅いプラン（毎月 {result.safeMonthly} 万円）での年齢別 資産推移
                </h3>
                <p className="text-xs text-slate-400">
                  下位25%（軟調）ラインでも目標金額 {formatManYen(goal.targetAmount, isStealth)} を達成できる軌道です
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                達成確率 {result.simulationSummary.goalProbability}%
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.simulationSummary.yearlyPoints}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="age"
                    tickFormatter={(val) => `${val}歳`}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(val) => `${val}万`}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => {
                      const map: Record<string, string> = {
                        top25: '上位25% (好調)',
                        median: '中央値 (標準)',
                        bottom25: '下位25% (軟調・暴落)',
                        principal: '投資累計元本',
                      };
                      return [`${formatManYen(Number(val), isStealth)}`, map[name] || name];
                    }}
                    labelFormatter={(age) => `${age} 歳時点`}
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
        </div>
      </div>
    </div>
  );
};
