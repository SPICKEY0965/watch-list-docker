'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import 'echarts-wordcloud';

interface Keyword {
  text: string;
  score: number;
}

interface WordCloudCardProps {
  keywords: Keyword[];
  isLoading: boolean;
}

const WordCloudCard: React.FC<WordCloudCardProps> = ({ keywords, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>キーワード分析</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p>分析データを読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!keywords || keywords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>キーワード分析</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p>分析対象のデータがありません。</p>
        </CardContent>
      </Card>
    );
  }

  const wordCloudData = keywords.map(kw => ({
    name: kw.text,
    // スコアを強調するため、少し増幅させる
    value: Math.max(Math.round(kw.score * 1000), 10),
  }));

  const option = {
    tooltip: {
      show: true,
      formatter: (params: any) => `${params.name} : ${params.value}`,
    },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      left: 'center',
      top: 'center',
      width: '100%',
      height: '100%',
      right: null,
      bottom: null,
      sizeRange: [12, 60],
      rotationRange: [-90, 90],
      rotationStep: 45,
      gridSize: 8,
      drawOutOfBound: false,
      textStyle: {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: function () {
          return 'rgb(' + [
            Math.round(Math.random() * 160),
            Math.round(Math.random() * 160),
            Math.round(Math.random() * 160)
          ].join(',') + ')';
        }
      },
      emphasis: {
        focus: 'self',
        textStyle: {
          shadowBlur: 10,
          shadowColor: '#333'
        }
      },
      data: wordCloudData,
    }],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>キーワード分析 (ワードクラウド)</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: '400px' }} />
      </CardContent>
    </Card>
  );
};

export default WordCloudCard;
