import { createClient } from '@supabase/supabase-js';

const defaultUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const defaultAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(defaultUrl, defaultAnonKey);

/**
 * 브라우저 로컬 스토리지에 개인용 custom_supabase_url과 custom_supabase_anon_key가 존재할 시,
 * 해당 Supabase 인스턴스를 동적으로 스위칭하여 리턴하는 팩토리 헬퍼 함수입니다.
 */
export const getSupabaseClient = () => {
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("custom_supabase_url");
    const customAnonKey = localStorage.getItem("custom_supabase_anon_key");
    if (customUrl && customAnonKey) {
      try {
        return createClient(customUrl, customAnonKey);
      } catch (e) {
        console.error("Custom Supabase 클라이언트 생성 실패, 기본 서버로 전환합니다:", e);
      }
    }
  }
  return supabase;
};
