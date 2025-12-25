import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine, Area, AreaChart } from 'recharts';
import { Calculator, Calendar, TrendingUp, DollarSign, Save, RefreshCw, Plus, Minus, Activity, Loader2 } from 'lucide-react';

// ★ここにGASのウェブアプリURLを貼り付けてください
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwK7d3G3B7VM-rGL325iGzZwLVsYhdmD1A2EzyYXx9NEMFlV5mLrGNrmdIo0KNu-nMe/exec';

// 初期データ生成ヘルパー（初回アクセス時やデータがない場合用）
const generateInitialData = () => {
  const data = [];
  const startDate = new Date(2025, 8, 1);
  const totalMonths = 16;
  
  for (let i = 0; i < totalMonths; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + i);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    
    // デフォルト値
    let baseSales = 3000000;
    if (month === 1) baseSales *= 2.5;
    if (month === 3) baseSales *= 1.8;
    if (month === 10 || month === 11) baseSales *= 1.5;
    if (month === 8) baseSales *= 0.8;

    data.push({
      id: i,
      monthStr: key,
      year: year,
      month: month,
      sales: Math.round(baseSales),
      cogs: Math.round(baseSales * 0.35),
      fixedCost: 800000,
      fixedCostMemo: '',
      spotCost: 200000,
      spotCostMemo: '',
      personnel: 600000,
      personnelMemo: '',
      memo: month === 1 ? '成人式' : (month === 3 ? '卒業式' : ''),
    });
  }
  return data;
};

const KimonoBusinessSimulator = () => {
  const [data, setData] = useState([]); // 初期値は空にしてuseEffectでロード
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. データ取得 (Load)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(GAS_API_URL);
        const result = await response.json();
        
        if (result && result.length > 0) {
          setData(result);
        } else {
          // データが空なら初期データを生成してセット
          setData(generateInitialData());
        }
      } catch (error) {
        console.error("Fetch error:", error);
        alert("データの読み込みに失敗しました。初期データを表示します。");
        setData(generateInitialData());
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. データ保存 (Save)
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // GASはPOSTのPreflight(OPTIONS)が苦手なため、no-corsモードやtext/plainを使う工夫が必要
      // ここでは最もシンプルな text/plain でJSON文字列を送る方法をとります
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', 
        },
        body: JSON.stringify(data),
      });
      alert('Google Spreadsheetsに保存しました！');
    } catch (error) {
      console.error("Save error:", error);
      alert('保存に失敗しました。コンソールを確認してください。');
    } finally {
      setIsSaving(false);
    }
  };

  // 集計値の計算
  const summary = useMemo(() => {
    const totalSales = data.reduce((acc, curr) => acc + (Number(curr.sales) || 0), 0);
    const totalCost = data.reduce((acc, curr) => 
      acc + (Number(curr.cogs) || 0) + (Number(curr.fixedCost) || 0) + (Number(curr.spotCost) || 0) + (Number(curr.personnel) || 0), 0);
    const totalProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    return {
      sales: totalSales,
      cost: totalCost,
      profit: totalProfit,
      margin: profitMargin.toFixed(1)
    };
  }, [data]);

  // 入力変更ハンドラ
  const handleInputChange = (id, field, value) => {
    const newData = data.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setData(newData);
  };

  // グラフ用データの整形
  let accSales = 0;
  let accCost = 0;

  const chartData = data.map(d => {
    const sales = Number(d.sales) || 0;
    const cogs = Number(d.cogs) || 0;
    const spotCost = Number(d.spotCost) || 0;
    const fixedCost = Number(d.fixedCost) || 0;
    const personnel = Number(d.personnel) || 0;

    const grossProfit = sales - cogs;
    const totalCost = cogs + fixedCost + spotCost + personnel;
    const operatingProfit = sales - totalCost;

    accSales += sales;
    accCost += totalCost;

    return {
      ...d,
      grossProfit,
      totalCost,
      operatingProfit,
      accumulatedSales: accSales,
      accumulatedTotalCost: accCost,
      profitMargin: sales > 0 ? ((operatingProfit / sales) * 100).toFixed(1) : 0
    };
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">スプレッドシートからデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-wide">着物事業 変動損益シミュレーター</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400 hidden md:block">
              期間: 2025年9月 ～ 2026年12月
            </div>
            {/* 保存ボタンの実装 */}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? '保存中...' : 'シートに保存'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        
        {/* KPI Dashboard */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">予測合計売上</h3>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.sales)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">予測合計コスト</h3>
            <p className="text-2xl font-bold text-gray-600">{formatCurrency(summary.cost)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">予測営業利益</h3>
            <p className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(summary.profit)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">平均営業利益率</h3>
            <div className="flex items-end gap-2">
              <p className={`text-2xl font-bold ${Number(summary.margin) >= 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {summary.margin}%
              </p>
            </div>
          </div>
        </section>

        {/* Chart 1: Main Sales & Profit Trend */}
        <section className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              月次 売上・利益推移
            </h2>
            <div className="flex items-center gap-4 text-xs md:text-sm">
              <div className="flex items-center"><span className="w-3 h-3 bg-indigo-400 inline-block rounded-sm mr-1"></span>売上高</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-emerald-500 inline-block rounded-sm mr-1"></span>営業利益</div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
                <XAxis dataKey="monthStr" tick={{fontSize: 12}} angle={-45} textAnchor="end" height={60} />
                <YAxis tickFormatter={(value) => `${value / 10000}万`} tick={{fontSize: 12}} />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name === 'sales' ? '売上高' : '営業利益']}
                  labelStyle={{ color: '#333' }}
                />
                <Bar dataKey="sales" name="sales" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={30} />
                <Line type="monotone" dataKey="operatingProfit" name="operatingProfit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" opacity={0.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Cumulative Sales vs Cost Comparison */}
        <section className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              累積 売上・コスト推移（回収シミュレーション）
            </h2>
            <div className="flex items-center gap-4 text-xs md:text-sm">
              <div className="flex items-center"><span className="w-8 h-1 bg-indigo-500 inline-block mr-1"></span>累積売上 (Acc Sales)</div>
              <div className="flex items-center"><span className="w-8 h-1 bg-rose-500 inline-block mr-1"></span>累積コスト (Acc Cost)</div>
            </div>
          </div>
          <div className="mb-2 text-xs text-gray-500 text-center">
            ※ 期間を通じた累積収支です。青線が赤線を上回るポイントが、投資回収（トータル黒字化）ラインとなります。
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
                <XAxis dataKey="monthStr" tick={{fontSize: 12}} angle={-45} textAnchor="end" height={60} />
                <YAxis tickFormatter={(value) => `${value / 10000}万`} tick={{fontSize: 12}} />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name === 'accumulatedSales' ? '累積売上' : '累積コスト']}
                  labelStyle={{ color: '#333' }}
                />
                <Line type="monotone" dataKey="accumulatedSales" name="accumulatedSales" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="accumulatedTotalCost" name="accumulatedTotalCost" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Input Table Section */}
        <section className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              月次損益シミュレーション入力
            </h2>
            <div className="text-xs text-gray-500">
              ※セルをクリックして直接編集できます
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200 whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-gray-100 z-10 w-24">年月</th>
                  <th className="px-4 py-3 min-w-[100px] text-right text-indigo-700">売上予測</th>
                  <th className="px-4 py-3 min-w-[100px] text-right text-red-700">売上原価</th>
                  <th className="px-4 py-3 min-w-[100px] text-right">粗利</th>
                  <th className="px-4 py-3 min-w-[100px] text-right text-orange-700">固定費</th>
                  <th className="px-2 py-3 min-w-[80px] text-gray-500">固定費メモ</th>
                  <th className="px-4 py-3 min-w-[100px] text-right text-orange-700">スポット費用</th>
                  <th className="px-2 py-3 min-w-[80px] text-gray-500">スポットメモ</th>
                  <th className="px-4 py-3 min-w-[100px] text-right text-orange-700">人件費</th>
                  <th className="px-2 py-3 min-w-[80px] text-gray-500">人件費メモ</th>
                  <th className="px-4 py-3 min-w-[100px] text-right font-bold bg-emerald-50">営業利益</th>
                  <th className="px-4 py-3 min-w-[80px] text-right bg-emerald-50">利益率</th>
                  <th className="px-4 py-3 min-w-[120px]">全体メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 whitespace-nowrap">
                {chartData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 font-medium sticky left-0 bg-white z-10 shadow-sm border-r border-gray-200">
                      {row.monthStr}
                      {(row.month === 1 || row.month === 3) && (
                        <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-400" title="繁忙期"></span>
                      )}
                    </td>
                    
                    {/* 売上入力 */}
                    <td className="px-2 py-2 text-right">
                      <input 
                        type="number" 
                        value={row.sales} 
                        onChange={(e) => handleInputChange(row.id, 'sales', Number(e.target.value))}
                        className="w-full text-right p-1 border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded bg-transparent focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </td>
                    
                    {/* 原価入力 */}
                    <td className="px-2 py-2 text-right">
                      <input 
                        type="number" 
                        value={row.cogs} 
                        onChange={(e) => handleInputChange(row.id, 'cogs', Number(e.target.value))}
                        className="w-full text-right p-1 border border-transparent hover:border-gray-300 focus:border-red-500 rounded bg-transparent focus:bg-white focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </td>
                    
                    {/* 粗利 */}
                    <td className="px-4 py-2 text-right text-gray-600 font-medium bg-gray-50">
                      {formatCurrency(row.grossProfit)}
                    </td>
                    
                    {/* 固定費入力 */}
                    <td className="px-2 py-2 text-right">
                      <input 
                        type="number" 
                        value={row.fixedCost} 
                        onChange={(e) => handleInputChange(row.id, 'fixedCost', Number(e.target.value))}
                        className="w-full text-right p-1 border border-transparent hover:border-gray-300 focus:border-orange-500 rounded bg-transparent focus:bg-white focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </td>
                    {/* 固定費メモ入力 */}
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={row.fixedCostMemo} 
                        onChange={(e) => handleInputChange(row.id, 'fixedCostMemo', e.target.value)}
                        placeholder="内訳"
                        className="w-full p-1 border border-transparent hover:border-gray-300 focus:border-gray-400 rounded bg-transparent focus:bg-white text-gray-500 text-xs outline-none"
                      />
                    </td>

                    {/* スポット費用入力 */}
                    <td className="px-2 py-2 text-right">
                      <input 
                        type="number" 
                        value={row.spotCost} 
                        onChange={(e) => handleInputChange(row.id, 'spotCost', Number(e.target.value))}
                        className="w-full text-right p-1 border border-transparent hover:border-gray-300 focus:border-orange-500 rounded bg-transparent focus:bg-white focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </td>
                    {/* スポット費用メモ入力 */}
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={row.spotCostMemo} 
                        onChange={(e) => handleInputChange(row.id, 'spotCostMemo', e.target.value)}
                        placeholder="内訳"
                        className="w-full p-1 border border-transparent hover:border-gray-300 focus:border-gray-400 rounded bg-transparent focus:bg-white text-gray-500 text-xs outline-none"
                      />
                    </td>

                    {/* 人件費入力 */}
                    <td className="px-2 py-2 text-right">
                      <input 
                        type="number" 
                        value={row.personnel} 
                        onChange={(e) => handleInputChange(row.id, 'personnel', Number(e.target.value))}
                        className="w-full text-right p-1 border border-transparent hover:border-gray-300 focus:border-orange-500 rounded bg-transparent focus:bg-white focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </td>
                    {/* 人件費メモ入力 */}
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={row.personnelMemo} 
                        onChange={(e) => handleInputChange(row.id, 'personnelMemo', e.target.value)}
                        placeholder="内訳"
                        className="w-full p-1 border border-transparent hover:border-gray-300 focus:border-gray-400 rounded bg-transparent focus:bg-white text-gray-500 text-xs outline-none"
                      />
                    </td>
                    
                    {/* 営業利益 */}
                    <td className={`px-4 py-2 text-right font-bold bg-emerald-50 ${row.operatingProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCurrency(row.operatingProfit)}
                    </td>
                    
                    {/* 利益率 */}
                    <td className={`px-4 py-2 text-right bg-emerald-50 ${Number(row.profitMargin) >= 10 ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {row.profitMargin}%
                    </td>
                    
                    {/* 全体メモ入力 */}
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={row.memo} 
                        onChange={(e) => handleInputChange(row.id, 'memo', e.target.value)}
                        placeholder="イベント等"
                        className="w-full p-1 border border-transparent hover:border-gray-300 focus:border-gray-400 rounded bg-transparent focus:bg-white text-gray-500 text-xs outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        
        <div className="text-center text-xs text-gray-400 pb-8">
          ※ Google Spreadsheetsと連携中。データは自動保存されません。「シートに保存」ボタンを押してください。
        </div>
      </main>
    </div>
  );
};

export default KimonoBusinessSimulator;

