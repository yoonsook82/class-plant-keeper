import { NextResponse } from "next/server";

// 학명을 기반으로 위키백과에서 정확한 한국어 국명을 찾고, 없으면 영문명을 구글 번역하는 함수
async function getKoreanName(scientificName: string, englishName: string): Promise<string> {
  // 1. 위키백과 API 검색 (학명으로 가장 정확한 한국어 공식 명칭 조회)
  try {
    const wikiUrl = `https://ko.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(scientificName)}&utf8=&format=json`;
    const wikiRes = await fetch(wikiUrl);
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData.query && wikiData.query.search && wikiData.query.search.length > 0) {
        // 첫 번째 검색 결과 제목을 사용하되, 동음이의어 괄호 "(식물)" 등은 제거
        return wikiData.query.search[0].title.replace(/\s*\(.*\)/, "");
      }
    }
  } catch (error) {
    console.error("Wiki API error:", error);
  }

  // 2. 위키백과에 결과가 없으면 기존처럼 구글 번역기로 영문명 번역
  if (englishName) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(englishName)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data[0][0][0];
      }
    } catch (error) {
      console.error("Translation error:", error);
    }
  }

  return englishName || scientificName;
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

    // 상위 3개 결과에 대해 정확한 한국어 명칭 탐색 수행
    if (data.results && Array.isArray(data.results)) {
      await Promise.all(data.results.slice(0, 3).map(async (result: any) => {
        if (result.species) {
          const sciName = result.species.scientificNameWithoutAuthor;
          const engName = result.species.commonNames?.[0] || "";
          
          if (sciName) {
            const korName = await getKoreanName(sciName, engName);
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
