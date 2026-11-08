import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach the JWT issued by the Spring Boot backend (when auth is wired up).
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("pos_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    return {
      message: (error.response?.data as { message?: string })?.message ?? error.message,
      status: error.response?.status,
    };
  }
  return { message: error instanceof Error ? error.message : "Unknown error" };
}
