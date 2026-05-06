"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface Record {
  id: string;
  plant_id: string;
  image_url: string | null;
  height_cm: number | null;
  leaf_count: number | null;
  flower_count: number | null;
  fruit_count: number | null;
  observation_text: string | null;
  created_at: string;
}

interface GardenCardData {
  student_id: string;
  student_name: string;
  plant_nickname: string;
  plant_type: string;
  latest_record: Record;
}

export default function GardenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gardenData, setGardenData] = useState<GardenCardData[]>([]);
  const [className, setClassName] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<GardenCardData | null>(null);
  const [comment, setComment] = useState("");
  const [interactions, setInteractions] = useState<any[]>([]);

  useEffect(() => {
    const storedClassName = localStorage.getItem("className");
    setClassName(storedClassName || "우리 반");
    fetchGardenData();

    // Set up Realtime Subscription for automatic updates
    const channel = supabase
      .channel('garden-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'records' },
        () => {
          console.log("새로운 기록이 감지되었습니다! 데이터를 갱신합니다.");
          fetchGardenData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGardenData = async () => {
    setLoading(true);
    try {
      const { data: allRecords, error: recordsError } = await supabase
        .from("records")
        .select(`
          *,
          plants (
            id,
            plant_nickname,
            plant_type,
            student_id,
            students (
              id,
              student_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (recordsError) throw recordsError;

      const latestMap = new Map<string, GardenCardData>();
      
      allRecords?.forEach((record: any) => {
        const student = record.plants?.students;
        const sId = student?.id;
        if (sId && !latestMap.has(sId)) {
          latestMap.set(sId, {
            student_id: sId,
            student_name: student.student_name,
            plant_nickname: record.plants.plant_nickname,
            plant_type: record.plants.plant_type,
            latest_record: record
          });
        }
      });

      let formattedData = Array.from(latestMap.values());

      if (!formattedData.find(d => d.student_name === "김미리")) {
        formattedData.unshift({
          student_id: "miri-id",
          student_name: "김미리",
          plant_nickname: "토리",
          plant_type: "토마토",
          latest_record: {
            id: "miri-rec",
            plant_id: "miri-plant",
            image_url: "/images/tomato.png",
            height_cm: 9,
            leaf_count: 7,
            flower_count: 3,
            fruit_count: 0,
            observation_text: "오늘 보니 꽃이 피었어요! 너무 기뻐요.",
            created_at: "2026-05-01T00:00:00Z"
          }
        });
      }

      setGardenData(formattedData);
    } catch (err) {
      console.error("정원 데이터 로드 오류:", err);
    }
    setLoading(false);
  };

  const handleOpenDetail = (data: GardenCardData) => {
    setSelectedRecord(data);
    setInteractions([
      { id: '1', name: '선생님', text: '정말 잘 자랐구나! 👍', emoji: '🙌' },
      { id: '2', name: '친구1', text: '꽃이 너무 예뻐!', emoji: '🌸' },
    ]);
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    setInteractions([...interactions, { id: Date.now().toString(), name: "나", text: comment, emoji: "📝" }]);
    setComment("");
  };

  return (
    <div className="min-h-screen bg-[#fdfcf5] flex flex-col font-body">
      {/* Header */}
      <header className="px-8 py-6 bg-white border-b-4 border-brand-green shadow-sm flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 flex items-center justify-center">
            <Image src="/images/garden.png" alt="garden" width={80} height={80} className="object-contain" />
          </div>
          <div>
            <h1 className="font-title text-4xl text-brand-brown leading-tight">{className}의 정원</h1>
            <p className="text-brand-green font-body font-bold text-lg">친구들의 식물 성장 일기를 함께 보아요!</p>
          </div>
        </div>
        <button 
          onClick={() => router.back()} 
          className="bg-gray-100 text-gray-500 px-6 py-3 rounded-2xl font-title text-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm flex items-center gap-2"
        >
          <span>✕</span> 닫기
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-[1500px] mx-auto w-full">
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-6 border-brand-green border-t-transparent rounded-full animate-spin" />
            <p className="font-title text-2xl text-brand-green">정원의 문을 여는 중... 🍃</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {gardenData.map((data) => (
              <div 
                key={data.student_id} 
                onClick={() => handleOpenDetail(data)}
                className="bg-white rounded-[45px] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer border-2 border-transparent hover:border-brand-green/20 group relative"
              >
                <div className="h-56 relative bg-brand-bg flex items-center justify-center p-3">
                  <img 
                    src={data.latest_record.image_url || "/images/leaf.png"} 
                    alt="plant" 
                    className="w-full h-full object-cover rounded-[35px] shadow-inner"
                  />
                  <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-xl shadow-lg border border-white">
                    <span className="font-title text-brand-green text-base">👤 {data.student_name}</span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-title text-2xl text-brand-brown mb-0.5">{data.plant_nickname}</h4>
                      <p className="text-brand-green text-xs font-bold uppercase tracking-wider">{data.plant_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Latest</p>
                      <p className="text-xs font-body text-gray-500">
                        {new Date(data.latest_record.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })}.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-blue-50/50 p-2 rounded-xl text-center border border-blue-100">
                      <p className="text-[9px] text-blue-400 font-bold mb-0.5">키</p>
                      <p className="text-sm font-title text-blue-600">{data.latest_record.height_cm || 0}cm</p>
                    </div>
                    <div className="bg-green-50/50 p-2 rounded-xl text-center border border-green-100">
                      <p className="text-[9px] text-green-500 font-bold mb-0.5">잎</p>
                      <p className="text-sm font-title text-brand-green">{data.latest_record.leaf_count || 0}</p>
                    </div>
                    <div className="bg-pink-50/50 p-2 rounded-xl text-center border border-pink-100">
                      <p className="text-[9px] text-pink-400 font-bold mb-0.5">꽃</p>
                      <p className="text-sm font-title text-pink-600">{data.latest_record.flower_count || 0}</p>
                    </div>
                    <div className="bg-orange-50/50 p-2 rounded-xl text-center border border-orange-100">
                      <p className="text-[9px] text-orange-400 font-bold mb-0.5">열매</p>
                      <p className="text-sm font-title text-orange-600">{data.latest_record.fruit_count || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-[#fdfcf5] w-full max-w-[1200px] max-h-[95vh] rounded-[50px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <header className="px-8 py-4 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedRecord(null)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-green transition-all text-2xl">←</button>
                <div>
                  <h3 className="font-title text-xl text-brand-brown">{selectedRecord.student_name} 학생의 기록</h3>
                  <p className="text-brand-green font-body font-bold text-xs">친구의 성장을 축하해주세요!</p>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="font-title text-lg text-gray-400 hover:text-red-500 transition-colors">닫기</button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col lg:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-6">
                <div className="h-60 md:h-72 w-full bg-brand-bg rounded-[35px] overflow-hidden border-4 border-white shadow-md shrink-0">
                  <img 
                    src={selectedRecord.latest_record.image_url || "/images/leaf.png"} 
                    alt="plant" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-100 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-title text-2xl text-brand-brown mb-0.5">{selectedRecord.plant_nickname}</h4>
                      <p className="text-brand-green font-body text-sm font-bold">{selectedRecord.plant_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold mb-0.5 uppercase">Latest</p>
                      <p className="font-title text-base text-brand-brown">{new Date(selectedRecord.latest_record.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    <div className="bg-blue-50/50 p-2 rounded-2xl text-center border border-blue-100/30">
                      <p className="text-[9px] text-blue-400 font-bold mb-1">키</p>
                      <p className="text-base font-title text-blue-600">{selectedRecord.latest_record.height_cm || 0}cm</p>
                    </div>
                    <div className="bg-green-50/50 p-2 rounded-2xl text-center border border-green-100/30">
                      <p className="text-[9px] text-green-500 font-bold mb-1">잎</p>
                      <p className="text-base font-title text-brand-green">{selectedRecord.latest_record.leaf_count || 0}</p>
                    </div>
                    <div className="bg-pink-50/50 p-2 rounded-2xl text-center border border-pink-100/30">
                      <p className="text-[9px] text-pink-400 font-bold mb-1">꽃</p>
                      <p className="text-base font-title text-pink-600">{selectedRecord.latest_record.flower_count || 0}</p>
                    </div>
                    <div className="bg-orange-50/50 p-2 rounded-2xl text-center border border-orange-100/30">
                      <p className="text-[9px] text-orange-400 font-bold mb-1">열매</p>
                      <p className="text-base font-title text-orange-600">{selectedRecord.latest_record.fruit_count || 0}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-6 rounded-[30px] border border-gray-100 flex-1 flex items-center justify-center">
                    <p className="font-body text-gray-600 leading-relaxed italic text-base text-center">
                      "{selectedRecord.latest_record.observation_text}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0">
                <div className="bg-white p-6 rounded-[35px] shadow-lg border border-gray-100 flex-1 flex flex-col min-h-[350px]">
                  <h5 className="font-title text-lg text-brand-brown mb-4 flex items-center gap-2">
                    💬 응원 <span className="bg-brand-green text-white text-[10px] px-2 py-0.5 rounded-full">{interactions.length}</span>
                  </h5>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 custom-scrollbar">
                    {interactions.map((int) => (
                      <div key={int.id} className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 animate-in slide-in-from-right-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-brand-green">{int.name}</span>
                          <span className="text-lg">{int.emoji}</span>
                        </div>
                        <p className="text-xs text-gray-600 font-body">{int.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between mb-4 bg-brand-bg/30 p-3 rounded-2xl">
                    {['❤️', '👏', '🔥', '🌱', '🌟'].map(e => (
                      <button key={e} onClick={() => setInteractions([...interactions, { id: Date.now().toString(), name: "나", text: "", emoji: e }])} className="text-xl hover:scale-125 transition-all">{e}</button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="칭찬 한마디!"
                      className="flex-1 bg-gray-50 border-2 border-transparent focus:border-brand-green rounded-xl px-4 py-2 outline-none font-body text-xs transition-all"
                    />
                    <button onClick={handleAddComment} className="bg-brand-green text-white px-4 py-2 rounded-xl font-title text-sm hover:bg-brand-green/90 transition-all active:scale-95">등록</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
}
