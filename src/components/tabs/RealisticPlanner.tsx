import { usePrivacy } from '../../context/PrivacyContext';
import React, { useState, useEffect, useMemo, useTransition } from 'react';
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
  Dices,
  Target,
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  TrendingDown,
  RefreshCw,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { RealisticMonteCarloInput, SavingsStage } from '../../types';
import { run5000MonthlyMonteCarlo, formatManYen } from '../../utils/finance';

const STORAGE_KEY = 'secure_wealth_realistic_input_v2';

const DEFAULT_REALISTIC_INPUT: RealisticMonteCarloInput = {
  currentAge: 19, // 山口大学工学部1年 (現在地)
  targetAge: 65,
  initialAmount: 300, // 現在の実質純金融資産 307万円ベース
  expectedReturn: 6.0, // 年利 6.0% (全世界株・S&P500実質リターン)
  volatility: 18.0, // 年率標準偏差 18.0%
  stages: [
    { id: '1', fromAge: 19, toAge: 23, monthlyDeposit: 2.0 }, // 19〜23歳: 山大学部生期・宇部転居・経験投資優先 月2万
    { id: '2', fromAge: 23, toAge: 28, monthlyDeposit: 6.0 }, // 23〜28歳: 社会人・若手エンジニア加速期 月6万
    { id: '3', fromAge: 28, toAge: 35, monthlyDeposit: 10.0 }, // 28〜35歳: 昇給・新NISA最速枠埋め期 月10万
    { id: '4', fromAge: 35, toAge: 45, monthlyDeposit: 6.0 }, // 35〜45歳: ライフイベント・住宅・家族支出期 月6万
    { id: '5', fromAge: 45, toAge: 65, monthlyDeposit: 15.0 }, // 45〜65歳: 最終資産完成ラストスパート 月15万
  ],
  targetAmount: 3000, // 30代で3,000万円到達目標
  goalAge: 35, // 35歳目標
  crashEnabled: true, // ランダム暴落ショック
  crashAnnualProbability: 5.0, // 年間5%の確率で暴落発生（約20年に1回）
  crashDropMin: 25, // -25%
  crashDropMax: 45, // -45%
  applyNisa: true,
};

export const RealisticPlanner: React.FC = () => {
  const { isStealth } = usePrivacy();
  const [, startTransition] = useTransition();

  // シミュレーション条件ステート（ローカルストレージから復元）
  const [input, setInput] = useState<RealisticMonteCarloInput>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse realistic input from storage', e);
      }
    }
    return DEFAULT_REALISTIC_INPUT;
  });

  // 変更時に自動保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  // 再計算トリガー（乱数更新用）
  const [seed, setSeed] = useState(0);

  // グラフ系列の表示/非表示トグル
  const [visibleLines, setVisibleLines] = useState({
    top25: true,
    median: true,
    bottom25: true,
    principal: true,
  });

  // モンテカルロ5000回シミュレーション実行
  const summary = useMemo(() => {
    return run5000MonthlyMonteCarlo(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, seed]);

  // ステージ追加
  const handleAddStage = () => {
    const lastStage = input.stages[input.stages.length - 1];
    const newFrom = lastStage ? lastStage.toAge : input.currentAge;
    if (newFrom >= input.targetAge) {
      alert('これ以上ステージを追加できません（終了年齢に達しています）');
      return;
    }
    const newTo = Math.min(input.targetAge, newFrom + 5);
    const newStage: SavingsStage = {
      id: Date.now().toString(),
      fromAge: newFrom,
      toAge: newTo,
      monthlyDeposit: 5.0,
    };
    setInput((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
  };

  // ステージ削除
  const handleRemoveStage = (id: string) => {
    if (input.stages.length <= 1) {
      alert('最低1つの積立ステージが必要です');
      return;
    }
    setInput((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== id),
    }));
  };

  // ステージ編集
  const handleStageChange = (id: string, field: keyof SavingsStage, val: number) => {
    startTransition(() => {
      setInput((prev) => ({
        ...prev,
        stages: prev.stages.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
      }));
    });
  };

  // プリセット適用
  const applyAssetPreset = (preset: 'all_country' | 'sp500' | 'balanced') => {
    if (preset === 'all_country') {
      setInput((prev) => ({ ...prev, expectedReturn: 6.0, volatility: 18.0 }));
    } else if (preset === 'sp500') {
      setInput((prev) => ({ ...prev, expectedReturn: 7.5, volatility: 20.0 }));
    } else if (preset === 'balanced') {
      setInput((prev) => ({ ...prev, expectedReturn: 4.0, volatility: 10.0 }));
    }
  };

  // マイルストーン年齢の抽出（例: 35歳, 40歳, 45歳, 50歳, 55歳, 60歳, 65歳）
  const milestones = useMemo(() => {
    const targetAges = [35, 40, 45, 50, 55, 60, 65];
    return summary.yearlyPoints.filter((pt) =>
      targetAges.includes(pt.age) || pt.age === input.targetAge || pt.age === input.goalAge
    );
  }, [summary, input.targetAge, input.goalAge]);

  return (
    <div className="space-y-8">
      {/* 上部ヘッダーバナー */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Dices className="w-4 h-4 text-indigo-400" />
              <span>毎月ステップ × 5,000回 モンテカルロ試行エンジン</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              現実的ライフプラン ＆ リスク分析
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              机上の固定利回りではなく、相場の荒波（年率リスク・標準偏差）とランダムに襲いかかる歴史的暴落ショックを各試行ごとにシミュレーション。
              <strong>上位25%・中央値・下位25%・元本</strong>を年齢軸でリアルに可視化します。
            </p>
          </div>

          <button
            onClick={() => setSeed((s) => s + 1)}
            className="flex items-center justify-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>5,000回 再試行する</span>
          </button>
        </div>
      </div>

      {/* 目標達成メーター ＆ 主要サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 目標達成確率カード */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center">
                <Target className="w-3.5 h-3.5 mr-1 text-rose-500" />
                {input.goalAge}歳で{formatManYen(input.targetAmount, isStealth)}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  summary.goalProbability >= 70
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : summary.goalProbability >= 40
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                }`}
              >
                {summary.goalProbability >= 70
                  ? '達成可能性 高'
                  : summary.goalProbability >= 40
                  ? '達成可能性 中'
                  : '要見直し'}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              {summary.goalProbability} <span className="text-lg font-normal text-slate-400">%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              5,000回の相場展開中、目標を上回った確率
            </p>
          </div>
          {/* プログレスバー */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.goalProbability >= 70
                  ? 'bg-emerald-500'
                  : summary.goalProbability >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${summary.goalProbability}%` }}
            />
          </div>
        </div>

        {/* 終了年齢時点の上位25% (好調) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {input.targetAge}歳時点: 上位25% (好調相場)
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatManYen(summary.top25AtEnd, isStealth)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            元本比 +{Math.round(((summary.top25AtEnd - summary.totalPrincipalAtEnd) / summary.totalPrincipalAtEnd) * 100)}%
          </div>
        </div>

        {/* 終了年齢時点の中央値 (標準) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {input.targetAge}歳時点: 中央値 (標準シナリオ)
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatManYen(summary.medianAtEnd, isStealth)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            元本比 +{Math.round(((summary.medianAtEnd - summary.totalPrincipalAtEnd) / summary.totalPrincipalAtEnd) * 100)}%
          </div>
        </div>

        {/* 終了年齢時点の下位25% (軟調・暴落被災) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {input.targetAge}歳時点: 下位25% (堅実・軟調)
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatManYen(summary.bottom25AtEnd, isStealth)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>元本割れ確率:</span>
            <span className="font-bold text-rose-500">{summary.capitalLossProbability}%</span>
          </div>
        </div>
      </div>

      {/* グラフ ＆ フィルタ表示 */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-indigo-500" />
              年齢別 資産推移ファンチャート（5,000回試行分布）
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              横軸は年齢です。任意の年齢で積立額を増減させた影響や、各パーセンタイルの乖離が確認できます
            </p>
          </div>

          {/* 系列のON/OFF切り替えチェックボックス */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() =>
                setVisibleLines((v) => ({ ...v, top25: !v.top25 }))
              }
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                visibleLines.top25
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>上位25% (好調)</span>
            </button>
            <button
              onClick={() =>
                setVisibleLines((v) => ({ ...v, median: !v.median }))
              }
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                visibleLines.median
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>中央値 (標準)</span>
            </button>
            <button
              onClick={() =>
                setVisibleLines((v) => ({ ...v, bottom25: !v.bottom25 }))
              }
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                visibleLines.bottom25
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>下位25% (軟調)</span>
            </button>
            <button
              onClick={() =>
                setVisibleLines((v) => ({ ...v, principal: !v.principal }))
              }
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                visibleLines.principal
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-slate-800 dark:text-slate-200 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>積立元本</span>
            </button>
          </div>
        </div>

        {/* チャート描画 */}
        <div className="h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={summary.yearlyPoints}
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
                    top25: '上位25%（好調）',
                    median: '中央値（標準）',
                    bottom25: '下位25%（軟調）',
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

              {visibleLines.top25 && (
                <Line
                  type="monotone"
                  dataKey="top25"
                  name="top25"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                />
              )}
              {visibleLines.median && (
                <Line
                  type="monotone"
                  dataKey="median"
                  name="median"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={false}
                />
              )}
              {visibleLines.bottom25 && (
                <Line
                  type="monotone"
                  dataKey="bottom25"
                  name="bottom25"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                />
              )}
              {visibleLines.principal && (
                <Line
                  type="stepAfter"
                  dataKey="principal"
                  name="principal"
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 「何歳時点でなんぼ？」年齢別マイルストーンカード一覧 */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <Clock className="w-4 h-4 mr-2 text-indigo-500" />
              何歳時点でなんぼ？ 節目年齢での資産比較表
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              各年齢に到達した時点の、上位25%・中央値・下位25%・元本の資産額です
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-3 py-3 rounded-l-xl">到達年齢</th>
                <th className="px-3 py-3">月積立額</th>
                <th className="px-3 py-3">積立元本</th>
                <th className="px-3 py-3 text-amber-600 dark:text-amber-400">下位25%</th>
                <th className="px-3 py-3 text-blue-600 dark:text-blue-400">中央値総額</th>
                <th className="px-3 py-3 text-emerald-600 dark:text-emerald-400">NISA資産</th>
                <th className="px-3 py-3 text-sky-600 dark:text-sky-400">特定(税引後)</th>
                <th className="px-3 py-3 text-rose-500">税金で減る額</th>
                <th className="px-3 py-3 text-emerald-600 dark:text-emerald-400 rounded-r-xl">
                  上位25%
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {milestones.map((item) => (
                <tr
                  key={item.age}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    item.age === input.goalAge ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white flex items-center">
                    <span>{item.age} 歳</span>
                    {item.age === input.goalAge && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold">
                        目標
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                    {item.monthlyDeposit}万
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                    {formatManYen(item.principal, isStealth)}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-amber-600 dark:text-amber-400">
                    {formatManYen(item.bottom25, isStealth)}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">
                    {formatManYen(item.median, isStealth)}
                  </td>
                  <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400">
                    {formatManYen(item.nisaBalance, isStealth)}
                  </td>
                  <td className="px-3 py-2.5 text-sky-600 dark:text-sky-400">
                    {formatManYen(item.taxableNetBalance, isStealth)}
                  </td>
                  <td className="px-3 py-2.5 text-rose-500 font-semibold">
                    {item.taxAmount > 0 ? `-${formatManYen(item.taxAmount, isStealth)}` : '0円'}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                    {formatManYen(item.top25, isStealth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2カラム設定エリア: [ステージ別積立設定] ＆ [相場リスク・ランダム暴落・目標設定] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左: 任意の年齢での積立額変更（ライフステージ積立エディタ） */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <Sliders className="w-4 h-4 mr-2 text-brand-600" />
                ライフステージ別 積立プラン設定
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                任意の年齢で毎月の積立額を柔軟に変化させられます
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (window.confirm('ライフプラン設定を初期値に戻しますか？')) {
                    setInput(DEFAULT_REALISTIC_INPUT);
                  }
                }}
                title="初期設定に戻す"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleAddStage}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-950/40 rounded-xl hover:bg-brand-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ステージ追加</span>
              </button>
            </div>
          </div>

          {/* 基本年齢設定 */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">開始年齢</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={input.currentAge}
                  onChange={(e) =>
                    setInput({ ...input, currentAge: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-400">歳</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">終了年齢</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="20"
                  max="90"
                  value={input.targetAge}
                  onChange={(e) =>
                    setInput({ ...input, targetAge: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-400">歳</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">初期資産</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={input.initialAmount}
                  onChange={(e) =>
                    setInput({ ...input, initialAmount: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-400">万円</span>
              </div>
            </div>
          </div>

          {/* 各ステージのカードリスト */}
          <div className="space-y-3">
            {input.stages.map((stage, idx) => (
              <div
                key={stage.id}
                className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-sm shadow-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    {idx + 1}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={input.currentAge}
                      max={input.targetAge}
                      value={stage.fromAge}
                      onChange={(e) =>
                        handleStageChange(stage.id, 'fromAge', Number(e.target.value))
                      }
                      className="w-14 px-2 py-1 text-center font-bold border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900"
                    />
                    <span className="text-slate-400">〜</span>
                    <input
                      type="number"
                      min={input.currentAge}
                      max={input.targetAge}
                      value={stage.toAge}
                      onChange={(e) =>
                        handleStageChange(stage.id, 'toAge', Number(e.target.value))
                      }
                      className="w-14 px-2 py-1 text-center font-bold border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-400">歳</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">毎月:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={stage.monthlyDeposit}
                    onChange={(e) =>
                      handleStageChange(stage.id, 'monthlyDeposit', Number(e.target.value))
                    }
                    className="w-20 px-2 py-1 font-bold text-brand-600 dark:text-brand-400 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-right"
                  />
                  <span className="text-xs text-slate-500">万円</span>

                  <button
                    onClick={() => handleRemoveStage(stage.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors ml-1"
                    title="このステージを削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右: 利回り・リスク設定 ＆ ランダム暴落設定 ＆ 目標設定 */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
              市場リスク ＆ ランダム暴落設定
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              各シミュレーションごとに確率的に起こる市場ショックのパラメータです
            </p>
          </div>

          {/* プリセット選択 */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 self-center mr-1">想定資産:</span>
            <button
              onClick={() => applyAssetPreset('all_country')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              全世界株式 (リターン6% / リスク18%)
            </button>
            <button
              onClick={() => applyAssetPreset('sp500')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              米国S&P500 (リターン7.5% / リスク20%)
            </button>
            <button
              onClick={() => applyAssetPreset('balanced')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              バランス型 (リターン4% / リスク10%)
            </button>
          </div>

          {/* 想定年利 ＆ リスク（標準偏差） */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">想定年利（リターン）</span>
                <span className="text-brand-600 dark:text-brand-400">{input.expectedReturn}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={input.expectedReturn}
                onChange={(e) =>
                  setInput({ ...input, expectedReturn: Number(e.target.value) })
                }
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">年率リスク（標準偏差 σ）</span>
                <span className="text-indigo-600 dark:text-indigo-400">{input.volatility}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="0.5"
                value={input.volatility}
                onChange={(e) =>
                  setInput({ ...input, volatility: Number(e.target.value) })
                }
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* ランダム暴落ショック（リーマンショック級）設定 */}
          <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.crashEnabled}
                  onChange={(e) =>
                    setInput({ ...input, crashEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1 text-rose-500" />
                  確率的ランダム暴落ショックを発生させる
                </span>
              </label>
              <span className="text-xs font-bold text-rose-600">
                年率 {input.crashAnnualProbability}% の発生確率
              </span>
            </div>

            {input.crashEnabled && (
              <div className="space-y-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-xs">
                <div className="flex justify-between">
                  <span className="text-rose-800 dark:text-rose-300">
                    暴落発生時の急落幅:
                  </span>
                  <span className="font-bold text-rose-700 dark:text-rose-300">
                    -{input.crashDropMin}% 〜 -{input.crashDropMax}% (ランダム)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={input.crashAnnualProbability}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      crashAnnualProbability: Number(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-rose-200 dark:bg-rose-900 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <p className="text-[11px] text-rose-600/80 leading-normal">
                  ※ 各試行（5,000回それぞれ）において、毎月ランダムに暴落判定が行われます。暴落に当たった試行もあれば、無傷で推移した試行もすべて確率統計としてパーセンタイルに反映されます。
                </p>
              </div>
            )}
          </div>

          {/* 目標設定 */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                目指す目標金額
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={input.targetAmount}
                  onChange={(e) =>
                    setInput({ ...input, targetAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-500">万円</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                目標達成希望年齢
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min={input.currentAge}
                  max={input.targetAge}
                  value={input.goalAge}
                  onChange={(e) =>
                    setInput({ ...input, goalAge: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-500">歳</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
