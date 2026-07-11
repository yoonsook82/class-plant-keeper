import { NextResponse } from "next/server";

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

    const response = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`, {
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
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { error: "내부 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
