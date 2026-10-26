export type AssetCategory =
  | 'cash'
  | 'domestic_stocks'
  | 'foreign_stocks'
  | 'bonds'
  | 'reit'
  | 'crypto'
  | 'other';

export interface AssetCategoryMeta {
  key: AssetCategory;
  label: string;
  color: string;
  defaultShare: number;
}

// -------------------------------------------------------------
// ライフステージ積立定義
// -------------------------------------------------------------
export interface SavingsStage {
  id: string;
  fromAge: number;
  toAge: number;
  monthlyDeposit: number; // 万円 / 月
}

// -------------------------------------------------------------
// モンテカルロシミュレーション共通入力条件
// -------------------------------------------------------------
export interface RealisticMonteCarloInput {
  currentAge: number;
  targetAge: number;
  initialAmount: number; // 万円
  expectedReturn: number; // 想定年利 %
  volatility: number; // 年率リスク・標準偏差 %
  stages: SavingsStage[];
  targetAmount: number; // 目標金額 (万円)
  goalAge: number; // 目標達成目標年齢
  crashEnabled: boolean; // ランダム暴落ショック
  crashAnnualProbability: number; // 年間発生確率 %
  crashDropMin: number; // 最小急落率 %
  crashDropMax: number; // 最大急落率 %
  applyNisa: boolean; // NISA枠1800万優先＆特定口座課税分離
}

// -------------------------------------------------------------
// 年齢（年次）ごとの集計データポイント
// -------------------------------------------------------------
export interface AgeDataPoint {
  age: number;
  year: number;
  principal: number; // 投資累計元本
  nisaPrincipal: number; // NISA枠元本
  taxablePrincipal: number; // 特定口座元本
  monthlyDeposit: number; // その年の月積立額

  // 実質総資産（NISA + 特定税引後）のパーセンタイル
  top25: number; // 上位25% (好調)
  median: number; // 中央値 (標準)
  bottom25: number; // 下位25% (軟調・暴落被災)
  min10?: number;
  max90?: number;

  // 中央値基準での内訳
  nisaBalance: number; // NISA口座資産 (非課税)
  taxableNetBalance: number; // 特定口座資産 (税引後手取り)
  taxAmount: number; // 税金で減る額 (20.315%)
  taxSaved: number; // NISAによる節税効果
}

// -------------------------------------------------------------
// モンテカルロシミュレーション全体の集計結果
// -------------------------------------------------------------
export interface MonteCarloSummary {
  yearlyPoints: AgeDataPoint[];
  goalProbability: number; // 目標達成確率 % (0 - 100)
  capitalLossProbability: number; // 元本割れ確率 % (0 - 100)
  totalPrincipalAtEnd: number;
  medianAtEnd: number;
  top25AtEnd: number;
  bottom25AtEnd: number;
  nisaBalanceAtEnd: number;
  taxableNetBalanceAtEnd: number;
  taxAmountAtEnd: number;
  taxSavedAtEnd: number;
}

// -------------------------------------------------------------
// 目標逆算プランナー用入力＆結果
// -------------------------------------------------------------
export interface GoalPlannerMonteCarloInput {
  currentAge: number;
  goalAge: number;
  initialAmount: number;
  targetAmount: number;
  expectedReturn: number;
  volatility: number;
  crashEnabled: boolean;
  crashAnnualProbability: number;
  crashDropMin: number;
  crashDropMax: number;
  applyNisa: boolean;
}

export interface GoalPlannerMonteCarloResult {
  // 各シナリオでの必要月額積立額
  deterministicMonthly: number; // 机上のフラット計算 (参考)
  medianMonthly: number; // 現実標準（確率50%達成）
  safeMonthly: number; // 現実堅実（確率75%達成・下位25%でも到達）
  ultraSafeMonthly: number; // 超安心（確率90%達成・暴落直撃でも到達）

  // 選択された推奨プランでのシミュレーション結果
  selectedMonthly: number;
  simulationSummary: MonteCarloSummary;
}

// -------------------------------------------------------------
// マイ資産ダッシュボード型定義
// -------------------------------------------------------------
export interface AssetItem {
  id: string;
  name: string;
  category: AssetCategory;
  amount: number; // 万円
  memo?: string;
  updatedAt: string;
}
