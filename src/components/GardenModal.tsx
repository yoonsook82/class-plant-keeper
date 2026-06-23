"use client";

import { useEffect, useState } from "react";
import { supabase, getSupabaseClient } from "@/lib/supabaseClient";

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

interface GardenModalProps {
  onClose: () => void;
  className: string;
  classId: string;
  mode?: "student" | "teacher";
}

export default function GardenModal({ onClose, className: userClassName, classId, mode = "student" }: GardenModalProps) {
  const [loading, setLoading] = useState(true);
  const [gardenData, setGardenData] = useState<GardenCardData[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GardenCardData | null>(null);
  const [comment, setComment] = useState("");
  const [interactions, setInteractions] = useState<any[]>([]);

  useEffect(() => {
    if (classId) {
      fetchGardenData();
    }
  }, [classId]);

  const fetchGardenData = async () => {
    setLoading(true);
    try {
      const client = getSupabaseClient();

      // 1단계: 해당 학급의 모든 학생 가져오기
      const { data: classStudents, error: studentsError } = await client
        .from("students")
        .select("id, student_name")
        .eq("class_id", classId);

      if (studentsError) throw studentsError;
      if (!classStudents || classStudents.length === 0) {
        setGardenData([]);
        setLoading(false);
        return;
      }

      const classStudentIds = classStudents.map(s => s.id);

      // 2단계: 해당 학생들의 식물 ID 목록 가져오기
      const { data: classPlants, error: plantsError } = await client
        .from("plants")
        .select("id, plant_nickname, plant_type, student_id")
        .in("student_id", classStudentIds);

      if (plantsError) throw plantsError;
      if (!classPlants || classPlants.length === 0) {
        setGardenData([]);
        setLoading(false);
        return;
      }

      const classPlantIds = classPlants.map(p => p.id);

      // 3단계: 해당 식물들의 관찰 기록 가져오기 (최신순)
      const { data: allRecords, error: recordsError } = await client
        .from("records")
        .select("*")
        .in("plant_id", classPlantIds)
        .order("created_at", { ascending: false });

      if (recordsError) throw recordsError;

      // 4단계: 학생별 최신 기록 1건만 그룹화
      const latestMap = new Map<string, any>();
      allRecords?.forEach(record => {
        const plant = classPlants.find(p => p.id === record.plant_id);
        if (!plant) return;
        const sId = plant.student_id;
        if (sId && !latestMap.has(sId)) {
          latestMap.set(sId, { record, plant });
        }
      });

      // 5단계: 최종 데이터 포맷팅
      const formattedData: GardenCardData[] = Array.from(latestMap.entries())
        .map(([sId, { record, plant }]) => {
          const student = classStudents.find(s => s.id === sId);
          if (!student) return null;
          return {
            student_id: sId,
            student_name: student.student_name,
            plant_nickname: plant.plant_nickname || "이름 없는 식물",
            plant_type: plant.plant_type || "기타",
            latest_record: record
          };
        })
        .filter((item): item is GardenCardData => item !== null);

      setGardenData(formattedData);
    } catch (err) {
      console.error("정원 데이터 로드 오류:", err);
    }
    setLoading(false);
  };


  const loadInteractions = async (recordId: string) => {
    try {
      const { data } = await getSupabaseClient()
        .from("interactions")
        .select("*")
        .eq("record_id", recordId)
        .order("created_at", { ascending: true });
      if (data) setInteractions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDetail = (data: GardenCardData) => {
    setSelectedRecord(data);
    setInteractions([]); // Clear temporary interactions
    loadInteractions(data.latest_record.id);
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedRecord) return;
    const authorName = mode === "teacher" ? "선생님" : (localStorage.getItem("studentName") || "친구");
    
    const newInt = {
      record_id: selectedRecord.latest_record.id,
      author_name: authorName,
      text: comment,
      emoji: "💬"
    };

    // Optimistic UI Update
    const optimisticInt = { ...newInt, id: Date.now().toString() };
    setInteractions(prev => [...prev, optimisticInt]);
    setComment("");

    try {
      await getSupabaseClient().from("interactions").insert(newInt);
      loadInteractions(selectedRecord.latest_record.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddEmoji = async (emoji: string) => {
    if (!selectedRecord) return;
    const authorName = mode === "teacher" ? "선생님" : (localStorage.getItem("studentName") || "친구");
    
    const newInt = {
      record_id: selectedRecord.latest_record.id,
      author_name: authorName,
      text: null,
      emoji: emoji
    };

    // Optimistic UI Update
    const optimisticInt = { ...newInt, id: Date.now().toString() };
    setInteractions(prev => [...prev, optimisticInt]);

    try {
      await getSupabaseClient().from("interactions").insert(newInt);
      loadInteractions(selectedRecord.latest_record.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f9f8f0]/95 z-[100] flex items-center justify-center p-0 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white w-full h-full flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        {/* Header - Matching GardenPage */}
        <div className="px-4 py-4 md:px-10 md:py-6 flex flex-row items-center justify-between border-b-[6px] border-[#738b27] bg-white sticky top-0 z-50 shadow-sm gap-3">
          <div className="flex items-center gap-3 md:gap-5 min-w-0">
            <div className="w-12 h-12 md:w-20 md:h-20 shrink-0 flex items-center justify-center">
              <img src="/images/garden.png" className="w-full h-full object-contain" alt="garden" />
            </div>
            <div className="min-w-0">
              <h1 className="font-title text-xl md:text-4xl text-brand-brown leading-tight break-keep">
                {userClassName}의 정원
              </h1>
              <p className="text-[#738b27] font-body font-bold text-xs md:text-xl truncate md:whitespace-normal">
                친구들의 식물 성장 일기를 함께 보아요!
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="shrink-0 bg-gray-100 text-gray-500 px-3 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-title text-sm md:text-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>✕</span> <span>닫기</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#fdfcf5]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-6 border-brand-green border-t-transparent rounded-full animate-spin" />
              <p className="font-title text-2xl text-brand-green">정원을 불러오는 중...</p>
            </div>
          ) : gardenData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-gray-400">
              <div className="text-8xl">📭</div>
              <p className="font-title text-2xl">아직 관찰 기록이 등록된 친구가 없어요.</p>
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
                      <div className="w-5 h-5 rounded-full bg-[#a389ff] flex items-center justify-center text-[10px] text-white hidden">👤</div>
                      <span className="font-title text-[#738b27] text-base">👤 {data.student_name}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-title text-2xl text-brand-brown mb-0.5">{data.plant_nickname}</h4>
                        <p className="text-brand-green text-xs font-bold uppercase tracking-wider">{data.plant_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Latest</p>
                        <p className="text-xs font-body text-gray-500">
                          {new Date(data.latest_record.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric'
                          }).replace(/\s/g, '').replace(/\.$/, '')}
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
        </div>

        {/* Detailed Popup - Matching GardenPage */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-[#fdfcf5] w-full max-w-[1000px] max-h-[95vh] rounded-[50px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <header className="px-8 py-4 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedRecord(null)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-green transition-all text-2xl">←</button>
                  <div>
                    <h3 className="font-title text-xl text-brand-brown">{selectedRecord.student_name} 식집사의 기록</h3>
                    <p className="text-brand-green font-body font-bold text-xs">반려식물의 성장을 함께 응원해주세요!</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="font-title text-lg text-gray-400 hover:text-red-500 transition-colors">닫기</button>
              </header>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-4">
                  <div className="h-48 md:h-[300px] w-full bg-brand-bg/50 rounded-[35px] overflow-hidden border-4 border-white shadow-sm shrink-0">
                    <img 
                      src={selectedRecord.latest_record.image_url || "/images/leaf.png"} 
                      alt="plant" 
                      className="w-full h-full object-contain backdrop-blur-sm"
                    />
                  </div>
                  <div className="bg-white p-5 rounded-[35px] shadow-sm border border-gray-100 flex-1 flex flex-col">
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
                    <div className="bg-gray-50/50 p-4 rounded-[30px] border border-gray-100 flex-1 flex items-center justify-center">
                      <p className="font-body text-gray-600 leading-relaxed italic text-sm text-center">
                        "{selectedRecord.latest_record.observation_text}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0">
                  <div className="bg-white p-5 rounded-[35px] shadow-lg border border-gray-100 flex-1 flex flex-col min-h-[350px]">
                    <h5 className="font-title text-lg text-brand-brown mb-4 flex items-center gap-2">
                      💬 응원 <span className="bg-brand-green text-white text-[10px] px-2 py-0.5 rounded-full">{interactions.length}</span>
                    </h5>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 custom-scrollbar">
                      {interactions.map((int) => (
                        <div key={int.id} className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 animate-in slide-in-from-right-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-brand-green">{int.author_name}</span>
                            <span className="text-lg">{int.emoji}</span>
                          </div>
                          {int.text && <p className="text-xs text-gray-600 font-body">{int.text}</p>}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between mb-4 bg-brand-bg/30 p-3 rounded-2xl">
                      {['❤️', '👏', '🔥', '🌱', '🌟'].map(e => (
                        <button key={e} onClick={() => handleAddEmoji(e)} className="text-xl hover:scale-125 transition-all">{e}</button>
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
      </div>
    </div>
  );
}
