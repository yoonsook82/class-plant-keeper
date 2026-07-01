import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Supabase 프로젝트의 일시정지를 방지하기 위해 간단한 쿼리를 실행합니다.
    // 'classes' 테이블의 데이터 1건만 조회하여 DB를 깨웁니다.
    const { data, error } = await supabase.from('classes').select('id').limit(1);

    if (error) {
      console.error('Supabase keep-alive 쿼리 에러:', error);
      return NextResponse.json(
        { status: 'error', message: 'DB query failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { status: 'success', message: 'Supabase connection is alive' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Supabase keep-alive 처리 중 에러 발생:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
