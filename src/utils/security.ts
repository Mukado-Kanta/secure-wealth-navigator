/**
 * セキュリティユーティリティ
 * - CSV Injection（数式・DDEインジェクション）対策
 * - XSS / 特殊文字サニタイズ
 * - ステルス（覗き見防止）マスキング
 */

/**
 * CSVインジェクション対策
 * ExcelやGoogleスプレッドシート等で、先頭が =, +, -, @, \t, \r のセルが
 * 悪意ある数式やDDEコマンドとして実行されるのを防ぐため、先頭に ' を付加する
 */
export function sanitizeCsvCell(cell: string): string {
  if (!cell) return '';
  const str = String(cell);
  const trimmed = str.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + str;
  }
  return str;
}

/**
 * HTMLエスケープ（XSS対策）
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 覗き見防止（プライバシー・ステルスモード）用の金額マスク
 */
export function maskValue(value: string | number, isStealth: boolean, placeholder: string = '••••••'): string {
  if (!isStealth) {
    return typeof value === 'number' ? value.toLocaleString() : value;
  }
  return placeholder;
}
