import { useMemo } from 'react';
import axios, { AxiosError } from 'axios';

export function useApiClient(token: string | null, handleLogout: () => void) {
    const apiClient = useMemo(() => {
        const client = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            headers: { Authorization: token ? `Bearer ${token}` : '' },
        });

        client.interceptors.response.use(
            response => response,
            (error: AxiosError) => {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    handleLogout();
                }
                return Promise.reject(error);
            }
        );
        return client;
    }, [token, handleLogout]);

    return apiClient;
}
