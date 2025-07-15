'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AttributeAnalysis {
  [category: string]: {
    [item: string]: number;
  };
}

interface AttributeChartProps {
  analysisData: AttributeAnalysis;
  isLoading: boolean;
}

const AttributeChart: React.FC<AttributeChartProps> = ({ analysisData, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>属性分析</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p>分析データを読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysisData || Object.keys(analysisData).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>属性分析</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p>分析対象のデータがありません。</p>
        </CardContent>
      </Card>
    );
  }

  // カテゴリごとにチャートを作成
  const charts = Object.entries(analysisData).map(([category, data]) => {
    const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));
    
    // カテゴリ名を日本語に変換（必要に応じて追加）
    const categoryTitle = {
        contentType: 'コンテンツタイプ別',
        season: 'シーズン別'
    }[category] || category;

    return (
      <div key={category} className="mb-8">
        <h3 className="text-lg font-semibold mb-4">{categoryTitle}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
            <XAxis dataKey="name" tick={{ fill: '#FFFFFF' }} />
            <YAxis allowDecimals={false} tick={{ fill: '#FFFFFF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                borderColor: 'rgba(75, 85, 99, 0.8)',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ color: '#fff' }} />
            <Bar dataKey="value" fill="#38bdf8" name="作品数" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>属性分析チャート</CardTitle>
      </CardHeader>
      <CardContent>
        {charts}
      </CardContent>
    </Card>
  );
};

export default AttributeChart;
