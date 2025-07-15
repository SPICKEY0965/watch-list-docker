import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { useAuth } from './useAuth';

interface Keyword {
  text: string;
  score: number;
}

interface AttributeAnalysis {
  [category: string]: {
    [item: string]: number;
  };
}

interface PreferenceAnalysisData {
  keywordAnalysis: Keyword[];
  attributeAnalysis: AttributeAnalysis;
  userPreferenceVector: number[];
}

export function usePreferenceAnalysis(userId: number | null) {
  const { token, handleLogout } = useAuth();
  const apiClient = useApiClient(token, handleLogout);
  const [data, setData] = useState<PreferenceAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!userId || !token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/users/${userId}/preference-analysis`);
      setData(response.data);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch preference analysis:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, token, apiClient]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return { data, isLoading, error, refetch: fetchAnalysis };
}
