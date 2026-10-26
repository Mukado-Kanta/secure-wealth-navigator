import {
  AssetCategoryMeta,
  RealisticMonteCarloInput,
  AgeDataPoint,
  MonteCarloSummary,
  GoalPlannerMonteCarloInput,
  GoalPlannerMonteCarloResult,
} from '../types';

export const ASSET_CATEGORIES: AssetCategoryMeta[] = [
  { key: 'cash', label: '預貯金・現金', color: '#64748b', defaultShare: 20 },
  { key: 'foreign_stocks', label: '全世界・先進国株式', color: '#2563eb', defaultShare: 40 },
  { key: 'domestic_stocks', label: '日本株式', color: '#38bdf8', defaultShare: 15 },
  { key: 'bonds', label: '債券', color: '#10b981', defaultShare: 15 },
  { key: 'reit', label: '不動産 (REIT)', color: '#f59e0b', defaultShare: 5 },
  { key: 'crypto', label: '暗号資産', color: '#8b5cf6', defaultShare: 0 },
  { key: 'other', label: 'その他（金・コモディティ等）', color: '#ec4899', defaultShare: 5 },
];

export const NISA_LIFETIME_LIMIT_MAN = 1800; // 新NISA 生涯非課税限度額 1,800万円
export const CAPITAL_GAINS_TAX_RATE = 0.20315; // 申告分離課税 20.315%

// -------------------------------------------------------------
// 高速・正規乱数ジェネレータ（Box-Muller変換ペアキャッシュ）
// -------------------------------------------------------------
let spareNormal: number | null = null;
function getStandardNormal(): number {
  if (spareNormal !== null) {
    const val = spareNormal;
    spareNormal = null;
    return val;
  }
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const mag = Math.sqrt(-2.0 * Math.log(u));
  const z0 = mag * Math.cos(2.0 * Math.PI * v);
  const z1 = mag * Math.sin(2.0 * Math.PI * v);
  spareNormal = z1;
  return z0;
}

/**
 * 指定した年齢での毎月積立額を取得
 */
function getMonthlyDepositForAge(
  age: number,
  stages: RealisticMonteCarloInput['stages']
): number {
  for (const s of stages) {
    if (age >= s.fromAge && age < s.toAge) {
      return s.monthlyDeposit;
    }
  }
  if (stages.length > 0) {
    return stages[stages.length - 1].monthlyDeposit;
  }
  return 0;
}

/**
 * 毎月ステップ × 5,000回 モンテカルロシミュレーション
 * （ランダム暴落ショック ＋ NISA枠1800万超過分の特定口座課税分離）
 */
export function run5000MonthlyMonteCarlo(
  input: RealisticMonteCarloInput
): MonteCarloSummary {
  const NUM_PATHS = 5000;
  const totalYears = Math.max(1, input.targetAge - input.currentAge);
  const totalMonths = totalYears * 12;

  const mu = input.expectedReturn / 100;
  const sigma = input.volatility / 100;
  const dt = 1 / 12; // 1ヶ月

  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const volSqrtDt = sigma * Math.sqrt(dt);

  const annualCrashProb = input.crashEnabled ? input.crashAnnualProbability / 100 : 0;
  const monthlyCrashProb = 1 - Math.pow(1 - annualCrashProb, 1 / 12);

  // 初期資産の割り当て
  let initialNisa = 0;
  let initialTaxable = 0;
  if (input.applyNisa) {
    initialNisa = Math.min(NISA_LIFETIME_LIMIT_MAN, input.initialAmount);
    initialTaxable = Math.max(0, input.initialAmount - NISA_LIFETIME_LIMIT_MAN);
  } else {
    initialTaxable = input.initialAmount;
  }

  // 5,000パスの口座残高
  const nisaBalances = new Float64Array(NUM_PATHS);
  const taxableBalances = new Float64Array(NUM_PATHS);
  nisaBalances.fill(initialNisa);
  taxableBalances.fill(initialTaxable);

  // 元本追跡（決定論的）
  let nisaPrincipal = initialNisa;
  let taxablePrincipal = initialTaxable;

  const principalHistory: {
    total: number;
    nisa: number;
    taxable: number;
  }[] = [
    {
      total: input.initialAmount,
      nisa: nisaPrincipal,
      taxable: taxablePrincipal,
    },
  ];

  // 年次ごとの税引後実質手取り資産を記録する配列 (年数 -> Float64Array)
  const yearlyNetAssets: Float64Array[] = [];
  const yearlyNisaAssets: Float64Array[] = [];
  const yearlyTaxableNetAssets: Float64Array[] = [];
  const yearlyTaxDeductions: Float64Array[] = [];

  for (let y = 0; y <= totalYears; y++) {
    yearlyNetAssets.push(new Float64Array(NUM_PATHS));
    yearlyNisaAssets.push(new Float64Array(NUM_PATHS));
    yearlyTaxableNetAssets.push(new Float64Array(NUM_PATHS));
    yearlyTaxDeductions.push(new Float64Array(NUM_PATHS));
  }

  // 0年目の記録
  for (let p = 0; p < NUM_PATHS; p++) {
    yearlyNetAssets[0][p] = input.initialAmount;
    yearlyNisaAssets[0][p] = initialNisa;
    yearlyTaxableNetAssets[0][p] = initialTaxable;
    yearlyTaxDeductions[0][p] = 0;
  }

  // 月次シミュレーション実行ループ
  for (let m = 1; m <= totalMonths; m++) {
    const currentAge = input.currentAge + (m - 1) / 12;
    const monthlyDeposit = getMonthlyDepositForAge(Math.floor(currentAge), input.stages);

    // 積立枠の配分
    let nisaContrib = 0;
    let taxableContrib = 0;

    if (input.applyNisa) {
      const remainingNisa = Math.max(0, NISA_LIFETIME_LIMIT_MAN - nisaPrincipal);
      nisaContrib = Math.min(remainingNisa, monthlyDeposit);
      taxableContrib = monthlyDeposit - nisaContrib;
    } else {
      taxableContrib = monthlyDeposit;
    }

    nisaPrincipal += nisaContrib;
    taxablePrincipal += taxableContrib;

    for (let p = 0; p < NUM_PATHS; p++) {
      // 1. 月次ボラティリティ
      const z = getStandardNormal();
      const monthFactor = Math.exp(drift + volSqrtDt * z);

      let nb = nisaBalances[p] * monthFactor;
      let tb = taxableBalances[p] * monthFactor;

      // 2. ランダム暴落ショック
      if (annualCrashProb > 0 && Math.random() < monthlyCrashProb) {
        const dropPercent =
          input.crashDropMin +
          Math.random() * (input.crashDropMax - input.crashDropMin);
        const dropRatio = 1 - dropPercent / 100;
        nb *= dropRatio;
        tb *= dropRatio;
      }

      // 3. 拠出加算
      nb += nisaContrib;
      tb += taxableContrib;

      nisaBalances[p] = Math.max(0, nb);
      taxableBalances[p] = Math.max(0, tb);
    }

    // 1年（12ヶ月）経過時の記録
    if (m % 12 === 0) {
      const yearIdx = m / 12;
      principalHistory.push({
        total: Math.round((nisaPrincipal + taxablePrincipal) * 10) / 10,
        nisa: Math.round(nisaPrincipal * 10) / 10,
        taxable: Math.round(taxablePrincipal * 10) / 10,
      });

      for (let p = 0; p < NUM_PATHS; p++) {
        const nb = nisaBalances[p];
        const tb = taxableBalances[p];
        const taxableGain = Math.max(0, tb - taxablePrincipal);
        const taxDue = taxableGain * CAPITAL_GAINS_TAX_RATE;
        const taxableNet = Math.max(0, tb - taxDue);
        const netTotal = nb + taxableNet;

        yearlyNetAssets[yearIdx][p] = netTotal;
        yearlyNisaAssets[yearIdx][p] = nb;
        yearlyTaxableNetAssets[yearIdx][p] = taxableNet;
        yearlyTaxDeductions[yearIdx][p] = taxDue;
      }
    }
  }

  // -----------------------------------------------------------
  // パーセンタイル集計（上位25%, 中央値, 下位25%等）
  // -----------------------------------------------------------
  const yearlyPoints: AgeDataPoint[] = [];

  const idxBottom10 = Math.floor(NUM_PATHS * 0.10);
  const idxBottom25 = Math.floor(NUM_PATHS * 0.25);
  const idxMedian = Math.floor(NUM_PATHS * 0.50);
  const idxTop25 = Math.floor(NUM_PATHS * 0.75);
  const idxTop10 = Math.floor(NUM_PATHS * 0.90);

  const goalYearIdx = Math.min(
    totalYears,
    Math.max(0, input.goalAge - input.currentAge)
  );
  let goalAchievedCount = 0;

  for (let y = 0; y <= totalYears; y++) {
    const age = input.currentAge + y;
    const netArr = yearlyNetAssets[y];
    const nisaArr = yearlyNisaAssets[y];
    const taxableNetArr = yearlyTaxableNetAssets[y];
    const taxArr = yearlyTaxDeductions[y];

    // インデックス付きでソート（中央値のインデックスを他口座にも対応させる）
    const indices = Array.from({ length: NUM_PATHS }, (_, i) => i);
    indices.sort((a, b) => netArr[a] - netArr[b]);

    const medianIdx = indices[idxMedian];

    const p10 = netArr[indices[idxBottom10]];
    const p25 = netArr[indices[idxBottom25]];
    const p50 = netArr[medianIdx];
    const p75 = netArr[indices[idxTop25]];
    const p90 = netArr[indices[idxTop10]];

    const medianNisa = nisaArr[medianIdx];
    const medianTaxableNet = taxableNetArr[medianIdx];
    const medianTax = taxArr[medianIdx];
    const nisaGain = Math.max(0, medianNisa - principalHistory[y].nisa);
    const taxSaved = nisaGain * CAPITAL_GAINS_TAX_RATE;

    const depositAtAge = getMonthlyDepositForAge(age, input.stages);

    yearlyPoints.push({
      age,
      year: y,
      principal: principalHistory[y].total,
      nisaPrincipal: principalHistory[y].nisa,
      taxablePrincipal: principalHistory[y].taxable,
      monthlyDeposit: depositAtAge,
      top25: Math.round(p75 * 10) / 10,
      median: Math.round(p50 * 10) / 10,
      bottom25: Math.round(p25 * 10) / 10,
      min10: Math.round(p10 * 10) / 10,
      max90: Math.round(p90 * 10) / 10,
      nisaBalance: Math.round(medianNisa * 10) / 10,
      taxableNetBalance: Math.round(medianTaxableNet * 10) / 10,
      taxAmount: Math.round(medianTax * 10) / 10,
      taxSaved: Math.round(taxSaved * 10) / 10,
    });

    if (y === goalYearIdx) {
      for (let p = 0; p < NUM_PATHS; p++) {
        if (netArr[p] >= input.targetAmount) {
          goalAchievedCount++;
        }
      }
    }
  }

  // 元本割れ確率
  const finalNet = yearlyNetAssets[totalYears];
  const finalPrincipal = principalHistory[totalYears].total;
  let capitalLossCount = 0;
  for (let p = 0; p < NUM_PATHS; p++) {
    if (finalNet[p] < finalPrincipal) {
      capitalLossCount++;
    }
  }

  const lastPoint = yearlyPoints[yearlyPoints.length - 1];

  return {
    yearlyPoints,
    goalProbability: Math.round((goalAchievedCount / NUM_PATHS) * 1000) / 10,
    capitalLossProbability: Math.round((capitalLossCount / NUM_PATHS) * 1000) / 10,
    totalPrincipalAtEnd: lastPoint.principal,
    medianAtEnd: lastPoint.median,
    top25AtEnd: lastPoint.top25,
    bottom25AtEnd: lastPoint.bottom25,
    nisaBalanceAtEnd: lastPoint.nisaBalance,
    taxableNetBalanceAtEnd: lastPoint.taxableNetBalance,
    taxAmountAtEnd: lastPoint.taxAmount,
    taxSavedAtEnd: lastPoint.taxSaved,
  };
}

/**
 * モンテカルロ法を用いた必要積立額の逆算ソルバー（二分探索法）
 */
export function solveMonteCarloGoalPlanner(
  input: GoalPlannerMonteCarloInput
): GoalPlannerMonteCarloResult {
  const years = Math.max(1, input.goalAge - input.currentAge);
  const n = years * 12;
  const r = input.expectedReturn > 0 ? input.expectedReturn / 100 / 12 : 0;

  // 1. 机上のフラット決定論的計算
  let deterministicMonthly = 0;
  if (r === 0) {
    deterministicMonthly = Math.max(0, input.targetAmount - input.initialAmount) / n;
  } else {
    const futureInitial = input.initialAmount * Math.pow(1 + r, n);
    const needed = Math.max(0, input.targetAmount - futureInitial);
    const annuityFactor = (Math.pow(1 + r, n) - 1) / r;
    deterministicMonthly = needed / annuityFactor;
  }
  deterministicMonthly = Math.round(deterministicMonthly * 10) / 10;

  // 二分探索で目標確率を満たす積立額を探索
  const findMonthlyForProbability = (targetProb: number): number => {
    let low = 0;
    let high = Math.max(50, deterministicMonthly * 3);
    let best = high;

    for (let iter = 0; iter < 12; iter++) {
      const mid = Math.round(((low + high) / 2) * 10) / 10;
      const testSim = run5000MonthlyMonteCarlo({
        currentAge: input.currentAge,
        targetAge: input.goalAge,
        initialAmount: input.initialAmount,
        expectedReturn: input.expectedReturn,
        volatility: input.volatility,
        stages: [
          {
            id: 'search',
            fromAge: input.currentAge,
            toAge: input.goalAge,
            monthlyDeposit: mid,
          },
        ],
        targetAmount: input.targetAmount,
        goalAge: input.goalAge,
        crashEnabled: input.crashEnabled,
        crashAnnualProbability: input.crashAnnualProbability,
        crashDropMin: input.crashDropMin,
        crashDropMax: input.crashDropMax,
        applyNisa: input.applyNisa,
      });

      if (testSim.goalProbability >= targetProb) {
        best = mid;
        high = mid - 0.5; // より少ない積立額で足りるか探す
      } else {
        low = mid + 0.5;
      }
    }
    return Math.max(0, Math.round(best * 10) / 10);
  };

  const medianMonthly = findMonthlyForProbability(50); // 確率50%（中央値）
  const safeMonthly = findMonthlyForProbability(75); // 確率75%（下位25%でも達成）
  const ultraSafeMonthly = findMonthlyForProbability(90); // 確率90%（暴落に耐える安心）

  // 推奨プラン（safeMonthly：確率75%で達成できる手堅い積立額）で最終シミュレーション
  const selectedMonthly = safeMonthly;
  const simulationSummary = run5000MonthlyMonteCarlo({
    currentAge: input.currentAge,
    targetAge: input.goalAge,
    initialAmount: input.initialAmount,
    expectedReturn: input.expectedReturn,
    volatility: input.volatility,
    stages: [
      {
        id: 'final',
        fromAge: input.currentAge,
        toAge: input.goalAge,
        monthlyDeposit: selectedMonthly,
      },
    ],
    targetAmount: input.targetAmount,
    goalAge: input.goalAge,
    crashEnabled: input.crashEnabled,
    crashAnnualProbability: input.crashAnnualProbability,
    crashDropMin: input.crashDropMin,
    crashDropMax: input.crashDropMax,
    applyNisa: input.applyNisa,
  });

  return {
    deterministicMonthly,
    medianMonthly,
    safeMonthly,
    ultraSafeMonthly,
    selectedMonthly,
    simulationSummary,
  };
}

/**
 * 万円をフォーマット（例: 1,234.5 万円 または 1億2,345万円）
 */
export function formatManYen(amountInMan: number, isStealth: boolean = false): string {
  if (isStealth) return "•••• 万円";
  if (isNaN(amountInMan)) return '0 万円';

  if (Math.abs(amountInMan) >= 10000) {
    const oku = Math.floor(amountInMan / 10000);
    const man = Math.round(amountInMan % 10000);
    if (man === 0) {
      return `${oku.toLocaleString()} 億円`;
    }
    return `${oku.toLocaleString()} 億 ${man.toLocaleString()} 万円`;
  }

  return `${amountInMan.toLocaleString(undefined, { maximumFractionDigits: 1 })} 万円`;
}

/**
 * 日本円（通常円）フォーマット
 */
export function formatYen(amountInYen: number, isStealth: boolean = false): string {
  if (isStealth) return "•••••• 円";
  return `¥${Math.round(amountInYen).toLocaleString()}`;
}
