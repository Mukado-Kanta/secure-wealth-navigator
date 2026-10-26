import { AssetItem, AssetCategory } from '../types';
import { sanitizeCsvCell } from './security';

/**
 * 銘柄名やファンド名から資産カテゴリを自動推定する
 */
export function inferCategoryFromName(name: string): AssetCategory {
  const n = name.toLowerCase();

  if (
    n.includes('全世界') ||
    n.includes('オール・カントリー') ||
    n.includes('オルカン') ||
    n.includes('先進国') ||
    n.includes('s&p500') ||
    n.includes('s&p 500') ||
    n.includes('sp500') ||
    n.includes('米国') ||
    n.includes('アメリカ') ||
    n.includes('nasdaq') ||
    n.includes('ナスダック') ||
    n.includes('vti') ||
    n.includes('voo') ||
    n.includes('qqq') ||
    n.includes('新興国') ||
    n.includes('インド') ||
    n.includes('外国株式')
  ) {
    return 'foreign_stocks';
  }

  if (
    n.includes('日本') ||
    n.includes('日経') ||
    n.includes('topix') ||
    n.includes('トピックス') ||
    n.includes('国内株式') ||
    n.includes('高配当')
  ) {
    return 'domestic_stocks';
  }

  if (
    n.includes('債券') ||
    n.includes('国債') ||
    n.includes('社債') ||
    n.includes('bond') ||
    n.includes('agg') ||
    n.includes('bnd')
  ) {
    return 'bonds';
  }

  if (n.includes('reit') || n.includes('リート') || n.includes('不動産')) {
    return 'reit';
  }

  if (
    n.includes('ビットコイン') ||
    n.includes('イーサリアム') ||
    n.includes('crypto') ||
    n.includes('仮想通貨')
  ) {
    return 'crypto';
  }

  if (
    n.includes('ゴールド') ||
    n.includes('金') ||
    n.includes('プラチナ') ||
    n.includes('コモディティ')
  ) {
    return 'other';
  }

  if (
    n.includes('預金') ||
    n.includes('現金') ||
    n.includes('預り金') ||
    n.includes('マネー') ||
    n.includes('mrf')
  ) {
    return 'cash';
  }

  // デフォルトは外国株式（近年の投資信託の大半が外国株/オルカン/S&P500のため）
  return 'foreign_stocks';
}

/**
 * 簡易CSVパーサー（引用符・カンマ対応）
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

/**
 * 楽天証券の保有商品CSVテキストをパースして AssetItem 配列に変換（CSV Injection対策済）
 */
export function parseRakutenSecuritiesCsv(csvText: string): AssetItem[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // ヘッダー行の特定（"ファンド名" や "銘柄名"、"評価額" を含む行を探す）
  let headerIndex = -1;
  let nameColIdx = -1;
  let valColIdx = -1;
  let accountColIdx = -1;

  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const cols = parseCsvLine(lines[i]);
    const lowerCols = cols.map((c) => c.replace(/\s+/g, ''));

    // 銘柄名・ファンド名
    const nIdx = lowerCols.findIndex(
      (c) =>
        c.includes('ファンド名') ||
        c.includes('銘柄名') ||
        c.includes('銘柄・商品') ||
        c.includes('商品名')
    );
    // 評価額
    const vIdx = lowerCols.findIndex(
      (c) =>
        c.includes('評価額[円]') ||
        c.includes('評価額（円）') ||
        c.includes('評価額') ||
        c.includes('時価評価額') ||
        c.includes('現在値×保有数量')
    );

    if (nIdx !== -1 && vIdx !== -1) {
      headerIndex = i;
      nameColIdx = nIdx;
      valColIdx = vIdx;
      accountColIdx = lowerCols.findIndex(
        (c) => c.includes('口座') || c.includes('口座区分')
      );
      break;
    }
  }

  // 見つからなかった場合のフォールバック（一般的なインデックス推定）
  if (headerIndex === -1) {
    headerIndex = 0;
    const cols = parseCsvLine(lines[0]);
    nameColIdx = cols.findIndex((c) => /名/.test(c)) || 1;
    valColIdx = cols.findIndex((c) => /額|円/.test(c)) || 6;
  }

  const items: AssetItem[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    // 合計行やフッター行を除外
    if (
      line.startsWith('合計') ||
      line.startsWith('小計') ||
      line.startsWith('※') ||
      line.startsWith('注') ||
      line.includes('データ作成日時')
    ) {
      continue;
    }

    const cols = parseCsvLine(line);
    if (cols.length <= Math.max(nameColIdx, valColIdx)) continue;

    const rawName = cols[nameColIdx];
    const rawVal = cols[valColIdx];

    if (!rawName || rawName === '-' || rawName === '') continue;

    // 金額文字列からカンマや「円」を除去して数値化
    const cleanValStr = rawVal.replace(/[,円\s]/g, '');
    const amountInYen = parseFloat(cleanValStr);

    if (isNaN(amountInYen) || amountInYen <= 0) continue;

    // 円から万円に変換（小数点第1位に丸め）
    const amountInMan = Math.round((amountInYen / 10000) * 10) / 10;
    if (amountInMan <= 0) continue;

    const accountType =
      accountColIdx !== -1 && cols[accountColIdx] ? cols[accountColIdx] : '';

    // CSV Injection対策のサニタイズ適用
    const safeName = sanitizeCsvCell(rawName);
    const safeMemo = sanitizeCsvCell(accountType ? `楽天証券 (${accountType})` : '楽天証券CSVインポート');

    items.push({
      id: `rakuten-${Date.now()}-${i}`,
      name: safeName,
      category: inferCategoryFromName(rawName),
      amount: amountInMan,
      memo: safeMemo,
      updatedAt: new Date().toISOString(),
    });
  }

  return items;
}

/**
 * 資産データをCSV形式に安全にエクスポート（CSV Injection対策済）
 */
export function exportAssetsToCsv(items: AssetItem[]): string {
  const header = ['ID', '資産名', 'カテゴリ', '評価額(万円)', 'メモ', '最終更新日'];
  const rows = items.map((item) => [
    sanitizeCsvCell(item.id),
    `"${sanitizeCsvCell(item.name).replace(/"/g, '""')}"`,
    sanitizeCsvCell(item.category),
    item.amount.toString(),
    `"${sanitizeCsvCell(item.memo || '').replace(/"/g, '""')}"`,
    sanitizeCsvCell(item.updatedAt || ''),
  ]);

  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
