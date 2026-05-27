"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";

export interface Plant {
  id: string;
  student_id: string;
  plant_nickname: string;
  plant_type: string;
  planted_at: string;
  created_at: string;
  reflection?: string;
  teacher_feedback?: string;
  teacher_stamp?: string;
}

export interface Record {
  id: string;
  plant_id: string;
  observation_text: string;
  created_at: string;
  image_url?: string;
  growth_stage?: string;
  height_cm?: number;
  leaf_count?: number;
  flower_count?: number;
  fruit_count?: number;
  plant_nickname?: string;
}

interface ReportModalProps {
  onClose: () => void;
  plant: Plant;
  records: Record[];
  studentName: string;
  studentGender: string;
  className: string;
  mode?: "student" | "teacher";
  allPlants?: Plant[];
  onPlantChange?: (plant: Plant) => void;
  onSaveReflection?: (id: string, text: string) => void;
  onSaveFeedback?: (id: string, feedback: string, stamp: string | null) => void;
  onDeleteRecord?: (id: string) => void;
}

export default function ReportModal({ 
  onClose, 
  plant, 
  records, 
  studentName, 
  studentGender,
  className,
  mode = "student",
  allPlants = [],
  onPlantChange,
  onSaveReflection,
  onSaveFeedback,
  onDeleteRecord
}: ReportModalProps) {
  let initialFeedback = plant.teacher_feedback || "";
  let initialStamp = plant.teacher_stamp || null;
  if (initialFeedback.includes("||STAMP:")) {
    const parts = initialFeedback.split("||STAMP:");
    initialFeedback = parts[0];
    initialStamp = parts[1] || null;
  }

  const [reflection, setReflection] = useState(plant.reflection || "");
  const [stamp, setStamp] = useState<string | null>(initialStamp);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let freshFeedback = plant.teacher_feedback || "";
    let freshStamp = plant.teacher_stamp || null;
    if (freshFeedback.includes("||STAMP:")) {
      const parts = freshFeedback.split("||STAMP:");
      freshFeedback = parts[0];
      freshStamp = parts[1] || null;
    }
    setReflection(plant.reflection || "");
    setFeedback(freshFeedback);
    setStamp(freshStamp);
  }, [plant]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setReflection(prev => prev.trim() + " " + transcript.trim() + ".");
    };
    recognition.start();
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  // Graph Data - Show ALL records to ensure all points appear on the X-axis
  const graphData = [...records]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((r, idx) => ({
      displayDate: `${new Date(r.created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} (${idx + 1})`,
      height: Number(r.height_cm) || 0,
      id: r.id
    }));

  // Calculate dynamic print height based on plant growth
  const maxVal = graphData.length > 0 ? Math.max(...graphData.map(d => d.height)) : 0;
  // Make the graph fill the first page more completely (increased base height)
  const dynamicPrintHeight = Math.min(800, Math.max(550, 400 + maxVal * 8));

  // Timeline Data
  const timelineData = [...records]
    .filter(r => r.image_url)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const handlePrint = () => {
    window.print();
  };

  const handleSaveTeacherFeedback = async () => {
    if (!onSaveFeedback) return;
    setIsSubmitting(true);
    try {
      await onSaveFeedback(plant.id, feedback, stamp);
      alert("선생님의 피드백이 저장되었습니다! 📝");
    } catch (e) {
      // Error is already alerted in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="print-modal-container" className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-start p-2 md:p-10 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:overflow-visible" onClick={onClose}>
      <div 
        ref={scrollRef} 
        className="bg-[#fdfbf7] w-full max-w-[1200px] max-h-[95vh] rounded-[30px] md:rounded-[50px] shadow-2xl overflow-hidden flex flex-col relative z-20 animate-in zoom-in-95 duration-300 border-[4px] md:border-[8px] border-white print:max-h-none print:max-w-none print:rounded-none print:border-none print:shadow-none print:block print:min-h-0 print:overflow-visible" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Print Header Override */}
        <div className="print-header">
          <span>{new Date().toLocaleString('ko-KR', { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: 'numeric', 
            hour12: true 
          })}</span>
          <span>우리 반 식집사</span>
        </div>

        {/* Header */}
        <div className="relative shrink-0 overflow-hidden print:bg-white print:border-b-4 print:border-orange-500 print:overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-400 opacity-90 print:hidden"></div>
          <div className="absolute inset-0 opacity-40 print:hidden" style={{ backgroundImage: "radial-gradient(circle at 4px 4px, white 2.5px, transparent 0)", backgroundSize: "36px 36px" }}></div>
          
          <div className="relative p-4 md:px-8 flex justify-between items-start z-10 print:p-0 print:pb-4">
            <div className="text-white text-left flex flex-col w-full print:text-black">
              <div className="inline-flex items-center gap-2 bg-white/25 px-4 py-1.5 rounded-full text-xs md:text-sm font-title mb-2 backdrop-blur-md border border-white/30 tracking-wide shadow-sm print:bg-white print:border-none print:shadow-none print:mb-1 print:mr-0 print:ml-auto print:text-xs print:font-bold">
                <span className="print:hidden">🍊</span> {className}
              </div>
              <h3 className="font-title text-xl md:text-3xl drop-shadow-md flex flex-wrap items-center gap-x-3 gap-y-1 print:drop-shadow-none print:text-black print:text-3xl">
                <span className="text-white print:text-black font-black drop-shadow-sm print:drop-shadow-none">{studentName} 꼬마 식집사의 관찰 보고서</span>
                <img src="/images/report-icon.png" className="w-8 h-8 md:w-12 md:h-12 object-contain animate-bounce duration-[2000ms] print:animate-none print:w-10 print:h-10" alt="report" />
              </h3>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0 ml-4 items-center print:!hidden print-hide-important">
              <button onClick={onClose} className="bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all shadow-lg border border-white/30 backdrop-blur-md">✕</button>
              {mode === "teacher" && (
                <button 
                  onClick={handlePrint}
                  className="bg-white/10 hover:bg-white/30 text-white/90 px-3 py-1.5 rounded-xl font-title text-sm transition-all shadow-sm border border-white/20 backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="text-base">🖨️</span>
                  <span>출력</span>
                </button>
              )}
            </div>
          </div>

          {allPlants.length > 1 && (
            <div id="plant-selector-container" className="relative z-10 px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar print:hidden">
              {allPlants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPlantChange && onPlantChange(p)}
                  className={`px-3 py-1.5 rounded-full font-title text-base transition-all border-2 whitespace-nowrap shadow-sm ${
                    p.id === plant.id
                      ? "bg-white text-orange-600 border-white scale-105 font-black"
                      : "bg-white/20 text-white border-white/30 hover:bg-white/30 font-bold"
                  }`}
                >
                  🌱 {p.plant_nickname}
                </button>
              ))}
            </div>
          )}
          
          {/* Removed stickers to prevent overlap and white dots */}
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 print:overflow-visible print:p-4 print:space-y-6">
          
          {/* Combined Plant Info & Graph Section for Better Flow */}
          <section className="space-y-6 print:space-y-4 print:mb-0">
            <div className="bg-white p-8 md:p-10 rounded-[40px] border border-gray-100 shadow-sm print:p-0 print:border-none print:shadow-none">
              <div className="flex flex-col md:flex-row items-center gap-10 mb-10 print:mb-4 print:flex-row print:gap-4 print:items-start">
                {/* Screen Plant Pot Frame */}
                <div className="relative shrink-0 print:hidden">
                  <div className="w-40 h-40 bg-gradient-to-br from-brand-bg to-white rounded-[50px] flex items-center justify-center shadow-inner border-4 border-brand-bg/30 relative z-10">
                    <img 
                      src={
                        plant.plant_type.includes("선인장") ? "/images/cactus.png" :
                        plant.plant_type.includes("토마토") ? "/images/tomato.png" :
                        plant.plant_type.includes("해바라기") ? "/images/sunflower.png" :
                        plant.plant_type.includes("콩") ? "/images/bean.png" :
                        plant.plant_type.includes("꽃") ? "/images/flower.png" :
                        plant.plant_type.includes("관엽") ? "/images/leaf.png" :
                        "/images/leaf.png"
                      } 
                      alt="plant" className="w-[100px] h-[100px] object-contain drop-shadow-md"
                    />
                  </div>
                </div>

                {/* Print Plant Pot Frame */}
                <div className="hidden print:flex items-center justify-center border-2 border-gray-200 rounded-2xl bg-[#f4f1ea] shrink-0" style={{ width: '90px', height: '90px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <img 
                    src={
                      plant.plant_type.includes("선인장") ? "/images/cactus.png" :
                      plant.plant_type.includes("토마토") ? "/images/tomato.png" :
                      plant.plant_type.includes("해바라기") ? "/images/sunflower.png" :
                      plant.plant_type.includes("콩") ? "/images/bean.png" :
                      plant.plant_type.includes("꽃") ? "/images/flower.png" :
                      plant.plant_type.includes("관엽") ? "/images/leaf.png" :
                      "/images/leaf.png"
                    } 
                    alt="plant" style={{ width: '60px', height: '60px', objectFit: 'contain', display: 'block', visibility: 'visible', opacity: 1 }}
                  />
                </div>

                <div className="flex-1 text-left print:flex print:flex-col print:justify-center">
                  <div className="mb-4 print:mb-1">
                    <h3 className="font-title text-4xl text-gray-800 mb-1 print:text-2xl">{plant.plant_nickname}</h3>
                    <p className="text-brand-green font-bold text-base flex items-center gap-2 print:text-[10px]">
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-green animate-pulse print:hidden"></span>
                      사랑으로 쑥쑥 자라고 있어요
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 print:grid-cols-4 print:gap-1">
                    <div className="bg-green-50/50 p-2.5 rounded-2xl border border-green-100 shadow-sm print:p-1 print:rounded-lg print:bg-white print:border-gray-100">
                      <p className="text-[10px] font-black text-green-600 mb-0.5 uppercase tracking-wider print:text-[7px] print:mb-0">식물 종류</p>
                      <p className="text-base font-bold text-gray-800 print:text-xs">{plant.plant_type}</p>
                    </div>
                    <div className="bg-blue-50/50 p-2.5 rounded-2xl border border-blue-100 shadow-sm print:p-1 print:rounded-lg print:bg-white print:border-gray-100">
                      <p className="text-[10px] font-black text-blue-600 mb-0.5 uppercase tracking-wider print:text-[7px] print:mb-0">심은 날짜</p>
                      <p className="text-base font-bold text-gray-800 print:text-xs">{new Date(plant.planted_at).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-orange-50/50 p-2.5 rounded-2xl border border-orange-100 shadow-sm print:p-1 print:rounded-lg print:bg-white print:border-gray-100">
                      <p className="text-[10px] font-black text-orange-600 mb-0.5 uppercase tracking-wider print:text-[7px] print:mb-0">학생 이름</p>
                      <p className="text-base font-bold text-gray-800 print:text-xs">{studentName}</p>
                    </div>
                    <div className="bg-red-50/50 p-2.5 rounded-2xl border border-red-100 shadow-sm print:p-1 print:rounded-lg print:bg-white print:border-gray-100">
                      <p className="text-[10px] font-black text-red-600 mb-0.5 uppercase tracking-wider print:text-[7px] print:mb-0">학급 명</p>
                      <p className="text-base font-bold text-gray-800 print:text-xs">{className}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Graph Integrated into the same card */}
              <div className="pt-8 border-t border-gray-100 min-h-[600px] print:pt-4 print:min-h-[450px]">
                <div className="flex justify-between items-center mb-6 print:mb-2">
                  <h4 className="font-title text-2xl text-orange-600 flex items-center gap-3 print:text-xl">
                    <span>📈</span> 성장 그래프
                  </h4>
                  <p className="text-sm font-bold text-gray-500 print:text-[10px]">단위: cm / 날짜별 키의 변화</p>
                </div>
                
                {/* Screen Graph */}
                <div className="w-full h-[400px] md:h-[500px] print:hidden overflow-visible">
                  {graphData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={graphData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="displayDate" 
                          axisLine={{ stroke: '#eee' }}
                          tickLine={false} 
                          tick={{fontSize: 9, fill: "#666", fontWeight: "bold"}} 
                          dy={10}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          domain={[0, (dataMax: number) => Math.max(dataMax + 2, 10)]} 
                          axisLine={{ stroke: '#eee' }}
                          tickLine={false} 
                          tick={{fontSize: 11, fill: "#666"}} 
                          dx={-5}
                          tickCount={10}
                          width={40}
                        />
                        <Tooltip 
                          contentStyle={{borderRadius: "20px", border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", padding: "15px"}}
                          labelStyle={{fontWeight: "bold", color: "#f97316", marginBottom: "5px"}}
                          cursor={{stroke: "#f97316", strokeWidth: 1, strokeDasharray: "5 5"}}
                          labelFormatter={(value) => `기록: ${value}`}
                        />
                        <Line 
                          type="linear" 
                          dataKey="height" 
                          stroke="#f97316" 
                          strokeWidth={5} 
                          dot={{r: 7, fill: "#f97316", strokeWidth: 3, stroke: "#fff"}} 
                          activeDot={{r: 10, strokeWidth: 0}} 
                          animationDuration={1000}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                      <div className="text-4xl opacity-20 print:text-2xl">📊</div>
                      <p className="font-body italic text-lg print:text-sm">기록이 쌓이면 멋진 성장 곡선이 그려집니다.</p>
                    </div>
                  )}
                </div>

                {/* Print Graph (A4 optimized fixed sizing) */}
                <div className="hidden print:block w-full print-graph-container overflow-visible">
                  {graphData.length > 0 ? (
                    <LineChart data={graphData} width={630} height={580} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="displayDate" 
                        axisLine={{ stroke: '#eee' }}
                        tickLine={false} 
                        tick={{fontSize: 9, fill: "#666", fontWeight: "bold"}} 
                        dy={10}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        domain={[0, (dataMax: number) => Math.max(dataMax + 2, 10)]} 
                        axisLine={{ stroke: '#eee' }}
                        tickLine={false} 
                        tick={{fontSize: 11, fill: "#666"}} 
                        dx={-5}
                        tickCount={10}
                        width={40}
                      />
                      <Line 
                        type="linear" 
                        dataKey="height" 
                        stroke="#f97316" 
                        strokeWidth={5} 
                        dot={{r: 7, fill: "#f97316", strokeWidth: 3, stroke: "#fff"}} 
                        activeDot={{r: 10, strokeWidth: 0}} 
                        connectNulls={true}
                      />
                    </LineChart>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                      <p className="font-body italic text-sm">기록이 쌓이면 멋진 성장 곡선이 그려집니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Photo Timeline - Forced to Page 2 for print */}
          <section className="print:break-before-page print:pt-10 print:mt-0 print:mb-6">
            <h4 className="font-title text-2xl text-brand-brown mb-6 flex items-center gap-3 print:text-xl print:mb-3">
              <img src="/images/camera.png" className="w-10 h-10 object-contain print:w-6 print:h-6" alt="camera" />
              찰칵! 식물 성장 타임라인
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-2">
              {timelineData.map((item) => (
                <div key={item.id} className="w-full">
                  <div className="aspect-square rounded-3xl overflow-hidden border-4 border-white shadow-md mb-2 print:shadow-none print:border-2 print:rounded-xl">
                    <img src={item.image_url} alt="step" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] text-center font-bold text-gray-500 font-body">{new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</p>
                </div>
              ))}
              {timelineData.length === 0 && <p className="text-gray-400 italic print:text-sm">아직 등록된 사진이 없습니다.</p>}
            </div>
          </section>

          {/* Section 4: Observation Records */}
          <section className="print:mb-6">
            <h4 className="font-title text-2xl text-brand-brown mb-6 flex items-center gap-3 print:text-xl print:mb-3">
              <img src="/images/log-icon.png" className="w-10 h-10 object-contain print:w-6 print:h-6" alt="log" />
              전체 관찰 기록
            </h4>
            <div className="space-y-6 print:space-y-3">
              {[...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(r => (
                <div key={r.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 relative group print:break-inside-avoid print:shadow-none print:border-2 print:p-3 print:gap-4 print:flex-row">
                  {/* Delete Button (Student Mode Only) */}
                  {mode === "student" && onDeleteRecord && (
                    <button 
                      onClick={() => onDeleteRecord(r.id)}
                      className="absolute top-4 right-4 w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-sm z-20 font-bold print:hidden"
                    >
                      ✕
                    </button>
                  )}
                  {r.image_url && (
                    <div className="w-full md:w-32 h-32 shrink-0 rounded-2xl overflow-hidden border border-gray-50 print:w-20 print:h-20">
                      <img src={r.image_url} alt="log" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-start mb-3 print:mb-1">
                      <span className="text-gray-400 text-xs font-body print:text-[10px]">{new Date(r.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3 print:mb-1 print:gap-1">
                       {r.height_cm && <span className="bg-blue-50 text-blue-600 px-3 py-0.5 rounded-full text-[10px] font-bold print:px-1.5 print:py-0 print:text-[8px]">키: {r.height_cm}cm</span>}
                       {(r.leaf_count || r.flower_count || r.fruit_count) && (
                         <span className="bg-green-50 text-brand-green px-3 py-0.5 rounded-full text-[10px] font-bold print:px-1.5 print:py-0 print:text-[8px]">
                           잎:{r.leaf_count || 0} / 꽃:{r.flower_count || 0} / 열매:{r.fruit_count || 0}
                         </span>
                       )}
                    </div>
                    <p className="font-body text-gray-700 leading-relaxed text-left print:text-xs">"{r.observation_text}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Reflection & Feedback */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100 print:block print:grid print:grid-cols-2 print:gap-4 print:space-y-0 print:pt-4">
            {/* Reflection */}
            <div className="bg-[#fff9e6] p-8 rounded-[40px] shadow-sm border border-[#f5e1c8] print:bg-white print:border-2 print:break-inside-avoid print:p-3 print:rounded-2xl">
              <h4 className="font-title text-2xl text-[#a67c00] mb-8 flex items-center gap-4 text-left print:text-lg print:mb-2 print:gap-2">
                <img src="/images/student-icon.png" className="w-14 h-14 object-contain shadow-sm rounded-full bg-white/50 p-1 print:w-6 print:h-6" alt="student" />
                관찰 후 느낀 점
              </h4>
              <div className="relative group/reflect">
                <div className="w-full min-h-[100px] bg-white/50 rounded-3xl p-6 font-body text-base print:p-1 print:text-[10px] print:min-h-0 print:bg-transparent">
                  {mode === "student" ? (
                    <textarea 
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="아직 작성된 내용이 없습니다."
                      className="w-full min-h-[100px] bg-transparent resize-none outline-none text-gray-700 leading-relaxed placeholder:text-gray-400 placeholder:italic print:hidden"
                    />
                  ) : reflection ? (
                    <p className="text-gray-700 leading-relaxed text-left">"{reflection}"</p>
                  ) : (
                    <p className="text-gray-400 italic text-center py-2">아직 작성된 내용이 없습니다.</p>
                  )}
                  {/* Print version of textarea text */}
                  {mode === "student" && reflection && (
                    <p className="hidden print:block text-gray-700 leading-relaxed text-left">"{reflection}"</p>
                  )}
                  {mode === "student" && !reflection && (
                    <p className="hidden print:block text-gray-400 italic text-center py-2">아직 작성된 내용이 없습니다.</p>
                  )}
                </div>
                {mode === "student" && (
                  <button 
                    type="button" 
                    onClick={startListening}
                    className="absolute right-4 bottom-10 w-10 h-10 flex items-center justify-center transition-all z-20 print:hidden"
                  >
                    {isListening && (
                      <span className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75"></span>
                    )}
                    <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-gray-100 hover:bg-orange-500/10'}`}>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor" 
                        className={`w-4 h-4 ${isListening ? 'text-white' : 'text-gray-400'}`}
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10a1 1 0 0 0-1 1v1a6 6 0 1 1-12 0v-1a1 1 0 0 0-2 0v1a8 8 0 0 0 7 7.93V21a1 1 0 1 0 2 0v-2.07A8 8 0 0 0 21 11v-1a1 1 0 0 0-1-1Z" />
                      </svg>
                    </div>
                  </button>
                )}
              </div>
              {mode === "student" && onSaveReflection && (
                <div className="flex justify-center gap-3 mt-4 print:hidden">
                  <button 
                    onClick={() => onSaveReflection(plant.id, reflection)}
                    className="px-8 py-2 bg-orange-500 text-white rounded-full font-title text-lg font-black shadow-md hover:bg-orange-600 transition-all active:scale-95"
                  >
                    저장하기
                  </button>
                  <button 
                    onClick={() => { setReflection(""); onSaveReflection(plant.id, ""); }}
                    className="px-8 py-2 bg-white text-gray-700 rounded-full font-title text-lg font-bold border-2 border-gray-100 hover:bg-gray-50 transition-all"
                  >
                    지우기
                  </button>
                </div>
              )}
            </div>

            {/* Teacher Feedback */}
            <div className="bg-[#fff0e6] p-8 rounded-[40px] shadow-sm border border-[#f5d9c8] relative print:bg-white print:border-2 print:break-inside-avoid print:p-3 print:rounded-2xl">
              <div className="flex items-center gap-4 mb-8 print:mb-2 print:gap-2">
                <img src="/images/teacher-icon.png" className="w-14 h-14 object-contain shadow-sm rounded-full bg-white/50 p-1 print:w-6 print:h-6" alt="teacher" />
                <h4 className="font-title text-2xl text-[#a65d00] print:text-lg">선생님의 피드백</h4>
              </div>
              
              {mode === "teacher" ? (
                <div className="space-y-4 print:space-y-1">
                  <div className="relative">
                    <textarea 
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      className="w-full h-40 bg-white rounded-3xl p-6 font-body text-base outline-none border-2 border-transparent focus:border-orange-500 transition-all resize-none shadow-inner print:hidden"
                      placeholder="선생님의 따뜻한 격려를 남겨주세요."
                    />
                    <div className="hidden print:block w-full min-h-[40px] bg-white rounded-xl p-1 font-body text-[10px] border border-gray-50">
                      {feedback || "아직 작성된 내용이 없습니다."}
                    </div>
                    {stamp && (
                      <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 w-24 h-24 pointer-events-none animate-in zoom-in-50 duration-500 rotate-12 z-20 print:w-14 print:h-14 print:static print:translate-x-0 print:translate-y-0 print:ml-auto print:mt-0.5">
                        <img src={`/images/${stamp}`} alt="preview" className="w-full h-full object-contain drop-shadow-xl" />
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white/50 p-6 rounded-3xl border border-orange-200 print:hidden">
                    <p className="font-title text-[#a65d00] mb-4 text-center">칭찬도장 선택하기</p>
                    <div className="grid grid-cols-5 gap-3 mb-6">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          onClick={() => setStamp(`stemp${num}.png`)}
                          className={`relative aspect-square rounded-2xl p-1 transition-all border-2 ${
                            stamp === `stemp${num}.png`
                              ? "bg-orange-100 border-orange-500 scale-110 shadow-md"
                              : "bg-white border-gray-100 hover:border-orange-300"
                          }`}
                        >
                          <img src={`/images/stemp${num}.png`} alt={`stemp${num}`} className="w-full h-full object-contain" />
                          {stamp === `stemp${num}.png` && (
                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => setStamp(null)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-[10px] font-bold transition-all border-2 ${
                          stamp === null
                            ? "bg-gray-200 border-gray-400"
                            : "bg-white border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        지우기
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button 
                        onClick={handleSaveTeacherFeedback}
                        disabled={isSubmitting}
                        className="bg-orange-500 text-white px-12 py-3 rounded-2xl font-title text-xl shadow-lg hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? "저장 중..." : "피드백 완료"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full min-h-[100px] bg-white/50 rounded-3xl p-6 font-body text-base relative z-10 print:p-1 print:text-[10px] print:min-h-0 print:border-none">
                  {feedback ? (
                    <>
                      <p className="text-gray-700 leading-relaxed text-left font-medium text-lg print:text-[10px]">"{feedback}"</p>
                      {stamp && (
                        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-6 w-32 h-32 pointer-events-none animate-in zoom-in-50 duration-500 rotate-12 z-20 print:w-16 print:h-16 print:static print:translate-x-0 print:translate-y-0 print:ml-auto print:mt-0.5 print:rotate-0">
                          <img 
                            src={`/images/${stamp}`} 
                            alt="stamp" 
                            className="w-full h-full object-contain drop-shadow-2xl"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400 italic text-center py-10 print:py-1 print:text-[10px]">선생님의 따뜻한 한마디를 기다려 보아요.</p>
                  )}
                </div>
              )}
            </div>
          </section>

        </div>
        

      </div>
      
      <style jsx global>{`
        .print-header {
          display: none !important;
        }
        @media print {
          @page {
            size: A4;
            margin: 20mm !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide everything by default using visibility */
          body * {
            visibility: hidden !important;
          }

          /* Show only the modal and its contents */
          #print-modal-container,
          #print-modal-container * {
            visibility: visible !important;
          }

          .print-header {
            display: flex !important;
            justify-content: space-between !important;
            width: 100% !important;
            font-size: 11px !important;
            color: #9ca3af !important; /* text-gray-400 */
            font-weight: bold !important;
            border-bottom: 1px solid #f3f4f6 !important;
            padding-bottom: 8px !important;
            margin-bottom: 16px !important;
          }

          #print-modal-container {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            display: block !important;
            overflow: visible !important;
            z-index: 99999 !important;
            padding: 0 !important; /* Handled natively by @page margin */
            margin: 0 !important;
            box-sizing: border-box !important;
          }

          #print-modal-container > div {
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: white !important;
            display: block !important;
          }

          .text-orange-500, .text-brand-brown, .text-brand-green, .text-[#a67c00], .text-[#a65d00] {
            color: black !important;
            -webkit-print-color-adjust: exact !important;
          }

          section {
            display: block !important;
            margin-bottom: 25px !important;
            clear: both !important;
          }

          /* Set graph A4 height & alignment */
          .print-graph-container {
            height: 580px !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          img {
            max-width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
          }

          .flex { display: flex !important; }
          .grid { display: grid !important; }

          /* Strictly hide UI elements - must come after layout styles */
          .print-hide-important,
          .print\\:hidden,
          button, 
          .no-scrollbar,
          .bg-black\\/60,
          #print-modal-container button,
          #print-modal-container .print-hide-important {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            opacity: 0 !important;
          }

          /* Natural flow and spacing */
          section:nth-of-type(1) {
            margin-bottom: 20px !important;
          }

          section {
            padding: 0 !important;
            margin-top: 0 !important;
            margin-bottom: 25px !important;
          }

          /* Photo Timeline forced to new page */
          section.print\:break-before-page {
            break-before: page !important;
            page-break-before: always !important;
            padding-top: 0 !important; /* Handled natively by @page margin */
          }

          .space-y-12 { margin-top: 0 !important; }
          .p-6, .md\\:p-10 { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
