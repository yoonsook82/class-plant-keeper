"use client";

import { useState, useRef } from "react";

interface PlantSearchModalProps {
  onClose: () => void;
  className?: string;
}

interface PlantResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship: string;
    genus: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
    };
    family: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
    };
    commonNames: string[];
  };
}

export default function PlantSearchModal({ onClose, className = "" }: PlantSearchModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<PlantResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResults([]);
      setError(null);
    }
  };

  const handleSearch = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_PLANTNET_API_KEY || "YOUR_API_KEY_HERE";
      
      const formData = new FormData();
      formData.append("images", imageFile);
      formData.append("organs", "auto"); // 'auto' allows the API to automatically detect the plant organ

      const response = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("API 키가 유효하지 않거나 설정되지 않았습니다. 관리자에게 문의하세요.");
        } else if (response.status === 404) {
          throw new Error("식물을 인식할 수 없습니다. 식물이 잘 보이는 다른 사진으로 다시 시도해주세요.");
        }
        throw new Error("서버와의 통신에 실패했습니다.");
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setResults(data.results.slice(0, 3)); // 상위 3개 결과만 표시
      } else {
        throw new Error("인식된 식물이 없습니다.");
      }

    } catch (err: any) {
      setError(err.message || "식물을 분석하는 중에 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 배경 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ${className}`}
      onClick={handleBackdropClick}
    >
      <div className="bg-[#fdfcf5] w-full max-w-lg rounded-[30px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-white animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-brand-green to-[#7a9624] px-6 py-5 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-3xl drop-shadow-md">🌿</span>
            <h2 className="font-title text-2xl text-white drop-shadow-sm">AI 식물 찾기</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all z-10 font-bold"
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
          
          <div className="text-center">
            <p className="font-body text-gray-600 mb-4">
              궁금한 식물의 사진을 찍거나 올려주세요.<br />
              AI가 어떤 식물인지 찾아줄게요! 🤖✨
            </p>

            {/* Image Upload Area */}
            <div 
              className={`w-full h-64 border-4 border-dashed rounded-[20px] flex flex-col items-center justify-center relative overflow-hidden transition-all ${imagePreview ? 'border-brand-green/50 bg-brand-green/5' : 'border-gray-300 bg-gray-50 hover:border-brand-green hover:bg-brand-green/5 cursor-pointer'}`}
              onClick={() => !imagePreview && fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                      setResults([]);
                      setError(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-3 right-3 bg-red-500/80 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors shadow-md"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-4">
                  <span className="text-5xl">📷</span>
                  <span className="font-title text-gray-500">이곳을 눌러 사진 선택하기</span>
                  <span className="font-body text-xs text-gray-400">카메라로 직접 찍거나 갤러리에서 고르세요</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*" 
                capture="environment" 
                className="hidden" 
              />
            </div>
          </div>

          {/* Search Button */}
          {imagePreview && results.length === 0 && !error && (
            <button
              onClick={handleSearch}
              disabled={isAnalyzing}
              className="w-full py-4 bg-brand-green text-white rounded-[20px] font-title text-xl shadow-md hover:bg-[#6c8621] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  AI가 분석 중입니다...
                </>
              ) : (
                "이 식물 이름 찾기 🔍"
              )}
            </button>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-[15px] text-center font-body border border-red-100 break-keep">
              {error}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
              <h3 className="font-title text-xl text-brand-brown mb-3 flex items-center gap-2">
                <span>💡</span> AI 분석 결과
              </h3>
              <div className="space-y-3">
                {results.map((result, index) => {
                  const probability = Math.round(result.score * 100);
                  const commonName = result.species.commonNames?.[0] || "한국어 이름 없음";
                  const scientificName = result.species.scientificNameWithoutAuthor;
                  
                  return (
                    <div key={index} className={`p-4 rounded-[20px] border-2 flex items-center gap-4 ${index === 0 ? 'bg-[#f0f7ec] border-brand-green/30' : 'bg-white border-gray-100'}`}>
                      <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 ${index === 0 ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-600'}`}>
                        <span className="font-title text-lg">{probability}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-title text-lg text-brand-brown truncate">
                          {commonName}
                        </p>
                        <p className="font-body text-sm text-gray-500 italic truncate">
                          {scientificName}
                        </p>
                      </div>
                      {index === 0 && <span className="text-2xl animate-bounce">👑</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">
                Powered by Pl@ntNet API
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
