import { NextResponse } from "next/server";

// 영문 식물 이름을 한국어로 번역하는 함수
async function translateToKorean(text: string): Promise<string> {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data[0][0][0];
    }
  } catch (error) {
    console.error("Translation error:", error);
  }
  return text;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // 백엔드에서 환경 변수를 우선 확인하고, 없으면 fallback 사용
    const envKey = process.env.NEXT_PUBLIC_PLANTNET_API_KEY || process.env.PLANTNET_API_KEY;
    const apiKey = envKey && envKey !== "YOUR_PLANTNET_API_KEY_HERE" && envKey !== "YOUR_API_KEY_HERE"
      ? envKey
      : "2b109BnBKM6D9mzTIyLrIYx8";

    // Pl@ntNet API로 전송할 새 FormData 생성
    const plantNetFormData = new FormData();
    const imageFile = formData.get("images");
    if (!imageFile) {
      return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
    }
    
    plantNetFormData.append("images", imageFile);
    plantNetFormData.append("organs", "auto");

    // Pl@ntNet API는 한국어를 미지원하므로 기본 영어(en)로 요청
    const response = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=en`, {
      method: "POST",
      body: plantNetFormData,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Pl@ntNet API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 상위 3개 결과에 대해 한국어 번역 수행
    if (data.results && Array.isArray(data.results)) {
      await Promise.all(data.results.slice(0, 3).map(async (result: any) => {
        if (result.species) {
          const engName = result.species.commonNames?.[0];
          if (engName) {
            const korName = await translateToKorean(engName);
            result.species.commonNames[0] = korName;
          } else if (result.species.scientificNameWithoutAuthor) {
            // 일반 이름이 없으면 학명이라도 번역 시도
            const sciName = result.species.scientificNameWithoutAuthor;
            const korName = await translateToKorean(sciName);
            result.species.commonNames = [korName];
          }
        }
      }));
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { error: "내부 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
