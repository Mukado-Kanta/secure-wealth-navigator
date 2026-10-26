import { usePrivacy } from '../../context/PrivacyContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Download,
  Upload,
  Coins,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { AssetItem, AssetCategory } from '../../types';
import { ASSET_CATEGORIES, formatManYen } from '../../utils/finance';
import { parseRakutenSecuritiesCsv } from '../../utils/csvParser';

const STORAGE_KEY = 'secure_wealth_my_assets_v2';

// 初期サンプルデータ (Kanata確定資産アンカー 307万円モデル)
const INITIAL_ASSETS: AssetItem[] = [
  {
    id: '1',
    name: '普通預金 (生活防衛 ＆ 宇部転居予備資金)',
    category: 'cash',
    amount: 55,
    memo: 'メガバンク/ゆうちょ (キャッシュ比率18%)',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'eMAXIS Slim 全世界株式 (オール・カントリー)',
    category: 'foreign_stocks',
    amount: 170,
    memo: '楽天証券 (新NISA つみたて・成長枠 主軸)',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: '国内高配当株 (三菱商事 8058 ほか)',
    category: 'domestic_stocks',
    amount: 73,
    memo: '楽天証券 (配当キャッシュフロー用)',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: '米国株式 / 高配当ETF (SPYD/VYM等)',
    category: 'foreign_stocks',
    amount: 9,
    memo: '楽天証券 (米ドル資産)',
    updatedAt: new Date().toISOString(),
  },
];

export const MyAssets: React.FC = () => {
  const { isStealth } = usePrivacy();
  const [assets, setAssets] = useState<AssetItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse assets from storage', e);
      }
    }
    return INITIAL_ASSETS;
  });

  // 新規追加フォーム
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<AssetCategory>('foreign_stocks');
  const [newAmount, setNewAmount] = useState<number>(10);
  const [newMemo, setNewMemo] = useState('');

  // 楽天証券CSVインポートモーダル
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreviewItems, setCsvPreviewItems] = useState<AssetItem[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [csvError, setCsvError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 永続化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  }, [assets]);

  // 合計金額
  const totalBalance = useMemo(() => {
    return assets.reduce((sum, item) => sum + item.amount, 0);
  }, [assets]);

  // カテゴリ別集計
  const categoryStats = useMemo(() => {
    return ASSET_CATEGORIES.map((cat) => {
      const sum = assets
        .filter((item) => item.category === cat.key)
        .reduce((acc, item) => acc + item.amount, 0);
      const ratio = totalBalance > 0 ? (sum / totalBalance) * 100 : 0;
      return {
        ...cat,
        sum: Math.round(sum * 10) / 10,
        ratio: Math.round(ratio * 10) / 10,
      };
    }).filter((cat) => cat.sum > 0);
  }, [assets, totalBalance]);

  // 資産手動追加
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: AssetItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      category: newCategory,
      amount: Math.max(0, newAmount),
      memo: newMemo.trim(),
      updatedAt: new Date().toISOString(),
    };

    setAssets([newItem, ...assets]);
    setNewName('');
    setNewAmount(10);
    setNewMemo('');
    setIsAdding(false);
  };

  // 削除
  const handleDelete = (id: string) => {
    if (window.confirm('この資産レコードを削除しますか？')) {
      setAssets(assets.filter((item) => item.id !== id));
    }
  };

  // 金額編集
  const handleAmountChange = (id: string, newAmt: number) => {
    setAssets(
      assets.map((item) =>
        item.id === id
          ? { ...item, amount: Math.max(0, newAmt), updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  // 楽天証券CSVファイルの読み込み（Shift_JIS / UTF-8 両対応）
  const handleCsvFileChange = (file: File) => {
    setCsvError(null);
    setCsvFileName(file.name);

    // まずShift_JISで読み取りを試みる（楽天証券CSVの標準）
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // 文字化けチェック（ヘッダー等の日本語が化けていないか）
      if (content.includes('ファンド名') || content.includes('銘柄') || content.includes('評価額')) {
        processCsvText(content);
      } else {
        // UTF-8 で再読み込み
        const readerUtf8 = new FileReader();
        readerUtf8.onload = (e2) => {
          processCsvText(e2.target?.result as string);
        };
        readerUtf8.readAsText(file, 'utf-8');
      }
    };
    reader.onerror = () => {
      setCsvError('ファイルの読み込みに失敗しました。');
    };
    reader.readAsText(file, 'shift-jis');
  };

  const processCsvText = (text: string) => {
    try {
      const parsed = parseRakutenSecuritiesCsv(text);
      if (parsed.length === 0) {
        setCsvError('有効な銘柄や評価額データが見つかりませんでした。楽天証券の「保有商品一覧」CSVかご確認ください。');
        setCsvPreviewItems([]);
      } else {
        setCsvPreviewItems(parsed);
      }
    } catch (err) {
      console.error(err);
      setCsvError('CSVの解析中にエラーが発生しました。');
    }
  };

  // CSVインポート確定
  const handleConfirmImport = () => {
    if (csvPreviewItems.length === 0) return;

    if (importMode === 'replace') {
      setAssets(csvPreviewItems);
    } else {
      // 既存データに追加
      setAssets([...csvPreviewItems, ...assets]);
    }

    setIsCsvModalOpen(false);
    setCsvPreviewItems([]);
    setCsvFileName('');
    alert(`楽天証券から ${csvPreviewItems.length} 件の保有資産を取り込みました！`);
  };

  // テスト用サンプル楽天証券CSVのワンクリック読み込み
  const loadMockRakutenCsv = () => {
    const mockCsv = `"ファンド名","保有数量[口]","平均取得価額[円]","現在値[円]","前日比[円]","評価額[円]","評価損益[円]","評価損益率[%]","口座"
"ｅＭＡＸＩＳ Ｓｌｉｍ 全世界株式（オール・カントリー）","1,452,300","18,500","24,300","+120","3,529,089","+842,500","+31.35","つみたてNISA"
"ｅＭＡＸＩＳ Ｓｌｉｍ 米国株式（Ｓ＆Ｐ５００）","892,100","21,000","28,400","+150","2,533,564","+660,100","+35.24","特定"
"楽天・全米株式インデックス・ファンド","450,000","19,200","25,100","-30","1,129,500","+265,500","+30.73","成長投資枠"
"ニッセイ 外国債券インデックスファンド","200,000","12,000","13,200","+10","264,000","+24,000","+10.00","特定"
"合計","","","","","7,456,153","+1,792,100","+31.64",""`;
    setCsvFileName('サンプル_楽天証券保有商品一覧.csv');
    processCsvText(mockCsv);
    setIsCsvModalOpen(true);
  };

  // JSONエクスポート
  const exportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(assets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wealth_assets_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // JSONインポート
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setAssets(parsed);
            alert('資産データを正常に読み込みました。');
          }
        } catch (err) {
          alert('ファイルの読み込みに失敗しました。正しいJSON形式か確認してください。');
        }
      };
    }
  };

  return (
    <div className="space-y-8">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-700 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                現在の総資産残高
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-500/20 text-brand-400 border border-brand-500/30">
                {assets.length} 件の資産
              </span>
            </div>
            <div className="text-4xl md:text-5xl font-extrabold text-white mt-3">
              {formatManYen(totalBalance, isStealth)}
            </div>
          </div>

          {/* カテゴリ別プログレスバー */}
          <div className="mt-6">
            <div className="text-xs text-slate-400 mb-2 flex justify-between">
              <span>資産構成比率</span>
              <span>100%</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full flex overflow-hidden">
              {categoryStats.map((cat) => (
                <div
                  key={cat.key}
                  style={{
                    width: `${cat.ratio}%`,
                    backgroundColor: cat.color,
                  }}
                  title={`${cat.label}: ${cat.ratio}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mt-3">
              {categoryStats.map((cat) => (
                <div key={cat.key} className="flex items-center">
                  <span
                    className="w-2.5 h-2.5 rounded-full mr-1.5"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate-300 font-medium">
                    {cat.label}: {cat.ratio}% ({formatManYen(cat.sum, isStealth)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* クイック操作カード */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-brand-600" />
              資産の追加・管理
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              楽天証券のCSVから保有商品を一括取り込みできます。
            </p>
          </div>

          {/* アクションボタン群 */}
          <div className="space-y-2">
            {/* 楽天証券CSVインポートボタン */}
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>楽天証券 CSVインポート</span>
            </button>

            {/* 手動登録ボタン */}
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-semibold transition-all cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>手動で資産を登録</span>
            </button>
          </div>

          {/* バックアップ */}
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={exportData}
              className="flex-1 flex items-center justify-center space-x-1 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>保存(JSON)</span>
            </button>
            <label className="flex-1 flex items-center justify-center space-x-1 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>復元</span>
              <input
                type="file"
                accept=".json"
                onChange={handleJsonImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 楽天証券CSVインポートモーダル */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    楽天証券 保有商品CSVインポート
                  </h3>
                  <p className="text-xs text-slate-400">
                    楽天証券の「保有商品一覧」からダウンロードしたCSVを読み込みます
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ドロップゾーン / ファイル選択 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-300 dark:border-rose-900/60 hover:border-rose-500 rounded-2xl p-6 text-center cursor-pointer bg-rose-50/30 dark:bg-rose-950/10 transition-colors"
            >
              <FileSpreadsheet className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                クリックして楽天証券CSVを選択、またはドラッグ＆ドロップ
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ※ Shift_JIS / UTF-8 の両方に対応。自動で文字化けを防ぎます
              </p>
              {csvFileName && (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  選択中: {csvFileName}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleCsvFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>

            {/* サンプルCSV読み込みボタン */}
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <span>まだ手元にCSVがない場合はサンプルでお試しいただけます：</span>
              <button
                type="button"
                onClick={loadMockRakutenCsv}
                className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
              >
                サンプルCSVを試す
              </button>
            </div>

            {/* エラー表示 */}
            {csvError && (
              <div className="flex items-center p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {/* プレビュー一覧 */}
            {csvPreviewItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                    読み取り結果 ({csvPreviewItems.length} 件 / 合計:{' '}
                    {formatManYen(
                      csvPreviewItems.reduce((acc, c) => acc + c.amount, 0)
                    )}
                    )
                  </h4>
                  <div className="flex items-center space-x-3 text-xs">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>既存資産に追加</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>すべて入れ替え</span>
                    </label>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {csvPreviewItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <div className="space-y-0.5 max-w-sm">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-slate-400 text-[11px]">{item.memo}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatManYen(item.amount, isStealth)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {ASSET_CATEGORIES.find((c) => c.key === item.category)?.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* モーダル下部ボタン */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={csvPreviewItems.length === 0}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                この内容で取り込む
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手動登録フォーム（展開時） */}
      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-brand-500 shadow-md">
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
            <Coins className="w-4 h-4 mr-2 text-brand-600" />
            新しい資産の追加
          </h4>
          <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                資産名称・口座名
              </label>
              <input
                type="text"
                required
                placeholder="例: SBI証券 S&P500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                カテゴリ
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as AssetCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white"
              >
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                残高金額 (万円)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                メモ (任意)
              </label>
              <input
                type="text"
                placeholder="例: 新NISA成長枠"
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="md:col-span-4 flex justify-end space-x-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition-colors"
              >
                追加を保存
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 登録資産一覧テーブル */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center">
            <Layers className="w-4 h-4 mr-2 text-brand-600" />
            保有資産一覧
          </h3>
          <span className="text-xs text-slate-400">
            金額欄を直接書き換えることで数値をすばやく修正できます
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">資産名称</th>
                <th className="px-4 py-3">カテゴリー</th>
                <th className="px-4 py-3">金額 (万円)</th>
                <th className="px-4 py-3">口座・メモ</th>
                <th className="px-4 py-3 rounded-r-xl text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {assets.map((item) => {
                const catMeta = ASSET_CATEGORIES.find((c) => c.key === item.category);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${catMeta?.color || '#94a3b8'}20`,
                          color: catMeta?.color || '#94a3b8',
                        }}
                      >
                        {catMeta?.label || item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.amount}
                          onChange={(e) =>
                            handleAmountChange(item.id, Number(e.target.value))
                          }
                          className="w-28 px-2.5 py-1 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                        />
                        <span className="text-xs text-slate-400">万円</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {item.memo || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="削除"
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    登録されている資産はありません。「楽天証券 CSVインポート」または「手動で資産を登録」から追加してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
