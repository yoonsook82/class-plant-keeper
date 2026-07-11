"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import confetti from 'canvas-confetti';
import { supabase, getSupabaseClient } from "@/lib/supabaseClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReportModal, { Plant, Record } from "@/components/ReportModal";
import GardenModal from "@/components/GardenModal";
import PlantSearchModal from "@/components/PlantSearchModal";
import React from "react";
import { Joyride, STATUS } from "react-joyride";

const CustomTooltip = ({
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}: any) => {
  return (
    <div
      {...tooltipProps}
      className="bg-[#ffebf0] border-[5px] border-[#4a3f35] rounded-[35px] p-6 pt-8 w-[90vw] sm:w-auto max-w-[340px] md:max-w-[400px] relative shadow-[0_6px_0_#4a3f35] mx-auto z-[10000]"
    >
      {/* Content */}
      <div className="font-body text-[#4a3f35] text-base md:text-lg leading-relaxed break-keep text-center mb-6 z-10 relative">
        {step.content}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between z-10 relative">
        {!isLastStep ? (
          <button {...skipProps} className="text-[#888] font-title text-sm hover:text-[#555] transition-colors">
            건너뛰기
          </button>
        ) : <div />}
        <div className="flex items-center gap-3">
          {index > 0 && (
            <button {...backProps} className="text-[#4a3f35] font-title text-sm hover:text-black transition-colors">
              이전
            </button>
          )}
          <button
            {...primaryProps}
            className="bg-[#4a3f35] text-white px-5 py-2 rounded-full font-title text-sm md:text-base hover:bg-black transition-all shadow-[0_3px_0_#222] active:translate-y-1 active:shadow-none"
          >
            {isLastStep ? '시작하기!' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function StudentDashboard() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState<"boy" | "girl">("boy");
  const [className, setClassName] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  
  const [plants, setPlants] = useState<Plant[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  
  // 날씨 연동 스마트 알림 상태
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weather, setWeather] = useState<{ temp: number; icon: string; status: string } | null>(null);
  const [weatherTip, setWeatherTip] = useState("");

  // Tutorial state
  const [runTutorial, setRunTutorial] = useState(false);
  const [tutorialKey, setTutorialKey] = useState(0);

  const tutorialSteps = [
    {
      target: "body",
      content: (
        <div className="text-left space-y-3 font-body text-base text-gray-700 leading-relaxed break-keep">
          <p><strong>안녕하세요! 우리 반 식집사에 온 것을 환영해요!</strong></p>
          <p className="indent-4">여러분은 새콤달콤한 딸기나 노란 해바라기처럼 특별히 좋아하는 식물이 있나요? 어제 먹은 음식 중에는 어떤 채소가 있었나요?</p>
          <p className="indent-4">내가 좋아하는 식물이 어떻게 싹을 틔우고 쑥쑥 자라나는지 직접 키우면서 알아보아요. 작은 씨앗이 커다란 생명으로 자라나는 신기한 마법 같은 여정, 지금부터 시작해 볼까요?</p>
          <p className="pt-2 text-brand-green font-bold text-center">먼저 사용법을 알아볼까요?</p>
        </div>
      ),
      placement: "center",
    },
    {
      target: "#tutorial-step-1",
      content: <div className="break-keep font-body leading-relaxed text-sm md:text-base">가장 먼저 식물 마스터에 들어가서 식물 가꾸는 방법을 배워보아요!</div>,
      placement: "bottom",
    },
    {
      target: "#tutorial-step-2",
      content: <div className="break-keep font-body leading-relaxed text-sm md:text-base">안녕하세요! 여기가 우리가 키울 식물의 자리예요. 먼저 귀여운 반려식물을 등록하고 예쁜 별명도 지어볼까요?</div>,
      placement: "right",
    },
    {
      target: "#tutorial-step-3",
      content: <div className="break-keep font-body leading-relaxed text-sm md:text-base">물을 주었거나 새잎이 돋았다면? 여기를 눌러서 식물의 변화를 사진과 글로 기록해 주세요!</div>,
      placement: "bottom",
    },
    {
      target: "#tutorial-step-4",
      content: <div className="break-keep font-body leading-relaxed text-sm md:text-base">그동안 기록한 식물의 변화를 한눈에 볼 수 있어요! 관찰 보고서를 확인해 보아요.</div>,
      placement: "bottom",
    },
    {
      target: "#tutorial-step-5",
      content: <div className="break-keep font-body leading-relaxed text-sm md:text-base">식물이 아프거나 궁금한 점이 있으면 AI 식물 진단을 통해 확인할 수 있어요!</div>,
      placement: "bottom",
    },
    {
      target: "#tutorial-step-6",
      content: <div className="break-keep font-body leading-relaxed text-sm md:text-base">친구들의 식물은 어떻게 자라고 있을까요? 우리 반 정원에서 친구의 반려 식물도 구경하고 응원 메시지도 남겨보아요!</div>,
      placement: "bottom",
    },
    {
      target: "#tutorial-step-7",
      content: <div className="break-keep font-body leading-relaxed text-sm md:text-base">오늘의 날씨를 확인하고 식물이 햇빛과 물을 얼마나 필요로 할지 생각해 볼 수도 있어요. 이제 진짜 식집사가 될 준비 완료!</div>,
      placement: "bottom",
    }
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTutorial(false);
      localStorage.setItem("tutorialCompleted", "true");
    }
  };
  
  // Modal States
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCareOpen, setIsCareOpen] = useState(false);
  const [isGardenOpen, setIsGardenOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // New Plant Form State
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const [newPlantNickname, setNewPlantNickname] = useState("");
  const [newPlantType, setNewPlantType] = useState("");
  const [newPlantDate, setNewPlantDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 효과음 재생 함수
  const playPopSound = () => {
    const audio = new Audio("/sound/u_8e8ungop1x-pop-268648.mp3");
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked:", e));
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const sId = localStorage.getItem("studentId");
    const sName = localStorage.getItem("studentName");
    const sGender = localStorage.getItem("studentGender") as "boy" | "girl";
    const cName = localStorage.getItem("className");
    const cId = localStorage.getItem("classId");

    if (role !== "student" || !sId) {
      alert("학생 로그인이 필요합니다.");
      router.push("/");
      return;
    }

    const hasSeenTutorial = localStorage.getItem("tutorialCompleted");
    if (!hasSeenTutorial) {
      setRunTutorial(true);
    }

    setStudentId(sId);
    setStudentName(sName || "");
    setStudentGender(sGender || "boy");
    setClassName(cName || "");
    setClassId(cId || null);

    fetchData(sId, true);
    fetchWeather();
  }, []);

  // 실시간 날씨 데이터 조회 및 초등 교과 조건 알고리즘
  const fetchWeather = () => {
    setWeatherLoading(true);
    const defaultLat = 37.5665;
    const defaultLon = 126.9780;

    const getWeatherData = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          
          // 날씨 코드 매핑
          let icon = "🌱";
          let status = "맑음";
          let isRaining = false;
          let isSnowing = false;

          if (code === 0) { icon = "☀️"; status = "맑음"; }
          else if ([1, 2, 3].includes(code)) { icon = "☁️"; status = "흐림"; }
          else if ([45, 48].includes(code)) { icon = "🌫️"; status = "안개"; }
          else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) { icon = "☔"; status = "비"; isRaining = true; }
          else if ([71, 73, 75, 77, 85, 86].includes(code)) { icon = "❄️"; status = "눈"; isSnowing = true; }
          else if ([95, 96, 99].includes(code)) { icon = "⚡"; status = "뇌우"; isRaining = true; }

          setWeather({ temp, icon, status });

          // 초등 교과 융합 조건문 알고리즘 적용
          if (isRaining) {
            setWeatherTip("오늘 비가 내려요. 실내 습도가 높을 수 있으니 물 주기는 화분 흙을 손가락으로 만져본 뒤 평소보다 조금 미뤄보세요! ☔");
          } else if (isSnowing) {
            setWeatherTip("바깥에 눈이 오고 추워요! 화분이 너무 차가워지지 않게 창가에서 살짝 교실 안쪽으로 옮겨 냉해를 막아주세요. ❄️");
          } else if (temp >= 28) {
            setWeatherTip(`오늘 낮 기온이 ${temp}℃로 매우 무더워요! 햇볕이 강해 화분 흙이 평소보다 빨리 마를 수 있으니 아침/저녁으로 수분을 잘 챙겨주세요! ☀️`);
          } else if (temp <= 10) {
            setWeatherTip(`오늘 기온이 ${temp}℃로 쌀쌀해요. 식물이 추위를 타서 성장이 느려지지 않게 따뜻한 실내 환경과 온도(15~25℃)를 유지해 주세요. 🌡️`);
          } else {
            setWeatherTip(`오늘 기온은 ${temp}℃로 식물이 무럭무럭 자라기 좋은 날씨예요! 기분 좋은 하루와 함께 초록 친구에게 눈인사를 건네보세요.`);
          }
        }
      } catch (err) {
        console.error("날씨 정보 호출 실패:", err);
        setWeather({ temp: 20, icon: "🌱", status: "적당함" });
        setWeatherTip("반려식물이 건강하게 자라고 있나요? 오늘 날씨를 확인해보고 물과 바람, 햇빛을 챙겨주세요!");
      } finally {
        setWeatherLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          getWeatherData(position.coords.latitude, position.coords.longitude);
        },
        () => {
          getWeatherData(defaultLat, defaultLon);
        },
        { timeout: 5000 }
      );
    } else {
      getWeatherData(defaultLat, defaultLon);
    }
  };

  const fetchData = async (sId: string, isInitial = false) => {
    if (isInitial) setIsLoading(true);
    
    try {
      // 1. Fetch Plants
      const { data: plantsData } = await getSupabaseClient()
        .from("plants")
        .select("*")
        .eq("student_id", sId)
        .order("created_at", { ascending: false });
      
      setPlants(plantsData || []);
      if (plantsData && plantsData.length > 0 && !selectedPlantId) {
        setSelectedPlantId(plantsData[0].id);
      }

      // 2. Fetch Latest Records
      if (plantsData && plantsData.length > 0) {
        const plantIds = plantsData.map(p => p.id);
        const { data: recordsData } = await getSupabaseClient()
          .from("records")
          .select("*")
          .in("plant_id", plantIds)
          .order("created_at", { ascending: true });
        
        const mappedRecords = recordsData?.map(r => ({
          ...r,
          plant_nickname: plantsData.find(p => p.id === r.plant_id)?.plant_nickname || "알 수 없는 식물"
        })) || [];

        setRecords(mappedRecords);
      }
    } catch (error) {
      console.error("데이터 불러오기 오류:", error);
    }
    
    if (isInitial) setIsLoading(false);
  };

  const handleRegisterPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !newPlantNickname || !newPlantType || !newPlantDate) {
      alert("모든 정보를 입력해주세요!");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseClient()
        .from("plants")
        .insert({
          student_id: studentId,
          plant_nickname: newPlantNickname,
          plant_type: newPlantType,
          planted_at: newPlantDate
        });

      if (error) {
        alert(`식물 등록 실패: ${error.message}`);
        console.error("식물 등록 오류 상세:", error);
      } else {
        setNewPlantNickname("");
        setNewPlantType("");
        setIsAddingPlant(false);
        fetchData(studentId);
      }
    } catch (err) {
      console.error("예상치 못한 오류:", err);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
    setIsSubmitting(false);
  };

  const handleDeletePlant = async (plantId: string, nickname: string) => {
    if (!studentId) return;
    
    if (confirm(`'${nickname}' 식물을 정말 삭제할까요? 모든 관찰 기록도 함께 삭제됩니다.`)) {
      const { error } = await getSupabaseClient()
        .from("plants")
        .delete()
        .eq("id", plantId);

      if (error) {
        alert("식물 삭제 중 오류가 발생했습니다.");
        console.error(error);
      } else {
        fetchData(studentId);
      }
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm("이 관찰 기록을 삭제할까요?")) {
      const { error } = await getSupabaseClient().from("records").delete().eq("id", recordId);
      if (error) {
        alert("삭제 중 오류가 발생했습니다.");
      } else {
        fetchData(studentId!);
      }
    }
  };
  
  const handleSaveReflection = async (plantId: string, reflection: string) => {
    const { error } = await getSupabaseClient()
      .from("plants")
      .update({ reflection })
      .eq("id", plantId);
    
    if (error) {
      alert("저장 중 오류가 발생했습니다.");
    } else {
      alert("성공적으로 저장되었습니다.");
      fetchData(studentId!);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  // Plant Image Mapping
  const getPlantImage = (type: string) => {
    if (type.includes("선인장")) return "/images/cactus.png";
    if (type.includes("토마토")) return "/images/tomato.png";
    if (type.includes("해바라기")) return "/images/sunflower.png";
    if (type.includes("콩")) return "/images/bean.png";
    if (type.includes("꽃")) return "/images/flower.png";
    if (type.includes("관엽")) return "/images/leaf.png";
    if (type.includes("감자") || type.includes("고구마")) return "/images/potato.png";
    return "/images/leaf.png"; // Default to leaf
  };

  // D-Day calculation
  const getDDay = (dateString: string) => {
    if (!dateString) return "D+1";
    const start = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? `D+${diff + 1}` : `D${diff}`;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-title text-2xl bg-[#f9f8f0] text-brand-green">정원 가꾸는 중... 🌱</div>;

  return (
    <>
    {React.createElement(Joyride as any, {
      key: tutorialKey,
      steps: tutorialSteps,
      run: runTutorial,
      continuous: true,
      callback: handleJoyrideCallback,
      tooltipComponent: CustomTooltip,
      floaterProps: { hideArrow: true },
      styles: {
        options: {
          arrowColor: 'transparent',
        }
      }
    })}
    <div 
      className="min-h-screen bg-cover bg-fixed bg-center relative dashboard-root print:hidden"
      style={{ backgroundImage: "url('/images/bg-student.jpg')" }}
    >
      <div className="absolute inset-0 bg-[#f9f8f0]/80 backdrop-blur-[2px]"></div>

      <div className="relative z-10 p-6 max-w-[1200px] mx-auto animate-in fade-in duration-700">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-10 bg-white/60 backdrop-blur-md p-4 md:p-6 rounded-[25px] md:rounded-[30px] shadow-sm border border-white/50">
          <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-0 w-full md:w-auto">
            <div className="bg-white p-2 md:p-3 rounded-2xl md:rounded-3xl shadow-md border-2 border-brand-green/20 relative group shrink-0">
              <Image 
                src={studentGender === 'girl' ? "/images/girl.png" : "/images/boy.png"} 
                alt="student" width={70} height={70} className="object-contain animate-float md:w-[90px] md:h-[90px]" 
              />
            </div>
            <div className="flex flex-col items-start text-left ml-1">
              <h1 className="font-title text-2xl md:text-4xl text-brand-brown mb-0 leading-tight">{studentName} 식집사</h1>
              <p className="font-body text-gray-500 text-sm md:text-base whitespace-nowrap text-left w-full">
                {className || "우리 반"}의 식물 관리사 🌱
              </p>
            </div>
          </div>
          <div className="flex gap-2 md:gap-4 w-full md:w-auto">
             <button id="tutorial-step-6" onClick={() => setIsGardenOpen(true)} className="flex-1 md:flex-none bg-brand-green text-white px-4 md:px-6 py-2 rounded-full text-base md:text-lg font-title hover:bg-[#5e741e] hover:shadow-md transition-all active:scale-95 shadow-sm">
                우리 반 정원
             </button>
             <button onClick={handleLogout} className="flex-1 md:flex-none bg-orange-500 text-white px-4 md:px-6 py-2 rounded-full text-base md:text-lg font-title hover:bg-orange-600 transition-all active:scale-95 shadow-sm">
                로그아웃
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: My Plants */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[40px] shadow-xl border border-white/80">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-title text-2xl text-brand-brown">나의 반려 식물</h2>
                <span className="bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-sm font-bold">{plants.length}개</span>
              </div>

              <div className="flex flex-col gap-4">
                {plants.map((plant) => (
                  <div 
                    key={plant.id} 
                    onClick={() => setSelectedPlantId(plant.id)}
                    className={`bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all border group cursor-pointer hover:-translate-y-1 relative ${
                      selectedPlantId === plant.id ? 'ring-4 ring-brand-green border-transparent' : 'border-gray-50'
                    }`}
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlant(plant.id, plant.plant_nickname);
                      }}
                      className="absolute top-3 right-3 w-7 h-7 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-20 shadow-sm touch-delete-btn"
                      title="식물 삭제"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-brand-bg rounded-2xl overflow-hidden flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                        <Image src={getPlantImage(plant.plant_type)} alt={plant.plant_nickname} width={60} height={60} className="object-contain" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-brand-green font-bold mb-0.5 uppercase tracking-wider">{plant.plant_type}</p>
                        <h3 className="font-title text-2xl text-brand-text mb-1">{plant.plant_nickname}</h3>
                        <div className="flex justify-between items-end">
                          <p className="text-xs text-gray-400 font-body">만난 날: {plant.planted_at}</p>
                          <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            {getDDay(plant.planted_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!isAddingPlant ? (
                  <div className="flex flex-col gap-2">
                    <button 
                      id="tutorial-step-2"
                      onClick={() => setIsAddingPlant(true)}
                      className="w-full py-6 mt-2 rounded-[30px] border-4 border-dashed border-gray-200 text-gray-400 font-title text-xl hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-colors">
                        <span className="text-3xl">+</span>
                      </div>
                      새 식물 등록하기
                    </button>
                    <button 
                      onClick={() => {
                        setTutorialKey(prev => prev + 1);
                        setRunTutorial(true);
                      }}
                      className="w-full py-2 rounded-[20px] bg-gray-100 text-gray-500 font-title text-sm hover:bg-gray-200 transition-all"
                    >
                      튜토리얼 다시보기
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterPlant} className="bg-brand-bg rounded-[30px] p-6 border-2 border-brand-green/30 animate-in zoom-in-95 duration-200">
                    <h3 className="font-title text-xl text-brand-green mb-4 text-center">새로운 초록 친구 등록</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 ml-2 mb-1 block">식물 종류</label>
                        <select 
                          value={newPlantType}
                          onChange={(e) => setNewPlantType(e.target.value)}
                          className="w-full bg-white border-none rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green transition-all"
                          required
                        >
                          <option value="">선택해주세요</option>
                          <option value="선인장">선인장 🌵</option>
                          <option value="토마토">토마토 🍅</option>
                          <option value="해바라기">해바라기 🌻</option>
                          <option value="콩">콩 🫛</option>
                          <option value="감자고구마">감자/고구마 🥔</option>
                          <option value="꽃">꽃 🌸</option>
                          <option value="관엽식물">관엽식물 🌿</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 ml-2 mb-1 block">식물 애칭</label>
                        <input 
                          type="text" 
                          placeholder="예: 토리, 초록이" 
                          value={newPlantNickname}
                          onChange={(e) => setNewPlantNickname(e.target.value)}
                          className="w-full bg-white border-none rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 ml-2 mb-1 block">심은 날</label>
                        <input 
                          type="date" 
                          value={newPlantDate}
                          onChange={(e) => setNewPlantDate(e.target.value)}
                          className="w-full bg-white border-none rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                      <button 
                        type="button" 
                        onClick={() => setIsAddingPlant(false)}
                        className="flex-1 bg-gray-200 text-gray-500 font-title py-3 rounded-2xl hover:bg-gray-300 transition-all"
                      >
                        취소
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="flex-2 bg-brand-green text-white font-title py-3 rounded-2xl hover:bg-[#5e741e] transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? "등록 중..." : "등록하기"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Observations & Logs */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* 오늘의 초록 날씨 & 스마트 케어 알림 배너 */}
            <div id="tutorial-step-7" className="bg-white/80 backdrop-blur-md p-5 rounded-[30px] border border-brand-green/20 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-left">
              <div className="flex items-center gap-3 shrink-0 bg-[#f0f7ec] px-4 py-2.5 rounded-2xl border border-brand-green/10 w-full sm:w-auto justify-center sm:justify-start">
                {weatherLoading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-brand-green border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-title text-brand-green text-sm">기상 분석 중...</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl animate-sway">{weather?.icon}</span>
                    <div className="flex flex-col text-left">
                      <span className="font-title text-2xl text-brand-brown leading-tight">{weather?.temp}℃</span>
                      <span className="font-body text-[10px] text-brand-green font-bold">{weather?.status}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1">
                <p className="font-title text-xs text-[#a65d00] mb-1 tracking-wider">오늘의 스마트 관찰 가이드</p>
                <p className="font-body text-xs md:text-sm text-gray-600 leading-relaxed break-keep">
                  {weatherLoading ? "오늘의 날씨 데이터를 분석하여 초록 식집사용 조건 알고리즘을 계산하는 중입니다..." : weatherTip}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              <div 
                id="tutorial-step-1"
                onMouseEnter={playPopSound}
                onClick={() => {
                  setIsCareOpen(true);
                }}
                className="bg-[#fff0f0] p-4 md:p-6 rounded-[30px] md:rounded-[40px] shadow-sm border border-[#ffdada] flex flex-col items-center justify-center gap-2 md:gap-4 cursor-pointer hover:scale-105 transition-all hover:shadow-md group"
              >
                <div className="transition-transform group-hover:scale-110 duration-300">
                  <Image src="/images/plant.png" alt="plant" width={48} height={48} className="md:w-16 md:h-16 drop-shadow-sm" />
                </div>
                <span className="font-title text-base md:text-lg text-pink-700">식물 마스터</span>
              </div>
              <div 
                id="tutorial-step-3"
                onMouseEnter={playPopSound}
                onClick={() => {
                  setIsLogOpen(true);
                }}
                className="bg-[#fdf3e7] p-4 md:p-6 rounded-[30px] md:rounded-[40px] shadow-sm border border-[#f5e1c8] flex flex-col items-center justify-center gap-2 md:gap-4 cursor-pointer hover:scale-105 transition-all hover:shadow-md group"
              >
                <div className="transition-transform group-hover:scale-110 duration-300">
                  <Image src="/images/log-icon.png" alt="log" width={48} height={48} className="md:w-16 md:h-16 drop-shadow-sm" />
                </div>
                <span className="font-title text-base md:text-lg text-[#5a4a42]">새 관찰일지</span>
              </div>
              <div 
                id="tutorial-step-4"
                onMouseEnter={playPopSound}
                onClick={async () => {
                  if (studentId) await fetchData(studentId);
                  setIsReportOpen(true);
                }}
                className="bg-[#e7f3fd] p-4 md:p-6 rounded-[30px] md:rounded-[40px] shadow-sm border border-[#c8e1f5] flex flex-col items-center justify-center gap-2 md:gap-4 cursor-pointer hover:scale-105 transition-all hover:shadow-md group"
              >
                <div className="transition-transform group-hover:scale-110 duration-300">
                  <Image src="/images/report-icon.png" alt="report" width={48} height={48} className="md:w-16 md:h-16 drop-shadow-sm" />
                </div>
                <span className="font-title text-base md:text-lg text-[#424a5a]">관찰 보고서</span>
              </div>
              <div 
                id="tutorial-step-5"
                onMouseEnter={playPopSound}
                onClick={() => {
                  setIsAiOpen(true);
                }}
                className="bg-[#f3fde7] p-4 md:p-6 rounded-[30px] md:rounded-[40px] shadow-sm border border-[#e1f5c8] flex flex-col items-center justify-center gap-2 md:gap-4 cursor-pointer hover:scale-105 transition-all hover:shadow-md group"
              >
                <div className="transition-transform group-hover:scale-110 duration-300">
                  <Image src="/images/ai-icon.png" alt="ai" width={48} height={48} className="md:w-16 md:h-16 drop-shadow-sm" />
                </div>
                <span className="font-title text-base md:text-lg text-[#4a5a42]">AI 식물 진단</span>
              </div>
              <div 
                onMouseEnter={playPopSound}
                onClick={() => setIsSearchOpen(true)}
                className="col-span-2 md:col-span-1 bg-[#f0f5ff] p-4 md:p-6 rounded-[30px] md:rounded-[40px] shadow-sm border border-[#dceaff] flex flex-col items-center justify-center gap-2 md:gap-4 cursor-pointer hover:scale-105 transition-all hover:shadow-md group"
              >
                <div className="transition-transform group-hover:scale-110 duration-300 flex items-center justify-center">
                  <span className="text-[40px] md:text-[50px] leading-none drop-shadow-sm">📸🌿</span>
                </div>
                <span className="font-title text-base md:text-lg text-[#424d5a]">AI 식물 찾기</span>
              </div>
            </div>

            {/* Latest Logs */}
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-[40px] shadow-xl border border-white/80 flex-1">
              <h2 className="font-title text-2xl text-brand-green mb-8 flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3 items-start">
                <span className="whitespace-nowrap">
                  📖 {selectedPlantId ? `'${plants.find(p => p.id === selectedPlantId)?.plant_nickname}'의 기록` : "최근 관찰 기록"}
                </span>
                <span className="text-sm font-body text-gray-400 font-normal mt-1 md:mt-0 whitespace-nowrap">정성을 담아 기록해 보아요</span>
              </h2>

              <div className="space-y-6">
                {[...records]
                  .filter(r => !selectedPlantId || r.plant_id === selectedPlantId)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((record) => (
                  <div key={record.id} className="relative pl-10 before:absolute before:left-3 before:top-2 before:bottom-0 before:w-[2px] before:bg-gray-100 last:before:hidden">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-brand-green border-4 border-white shadow-sm z-10"></div>
                    <div className="bg-white rounded-[35px] p-5 shadow-sm border border-gray-100 hover:shadow-lg transition-all relative group/item">
                      {/* Delete Button */}
                      <button 
                        onClick={() => handleDeleteRecord(record.id)}
                        className="absolute top-4 right-4 w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm z-20 font-bold touch-delete-btn"
                      >
                        ✕
                      </button>

                      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {/* Left: Image */}
                        <div className="w-full md:w-40 h-48 md:h-40 shrink-0 rounded-[20px] md:rounded-[25px] overflow-hidden border-2 border-gray-50 bg-brand-bg flex items-center justify-center p-1">
                          <img 
                            src={record.image_url || getPlantImage(plants.find(p => p.id === record.plant_id)?.plant_type || "")} 
                            alt="observation" 
                            className="w-full h-full object-cover rounded-[15px] md:rounded-[20px]" 
                          />
                        </div>

                        {/* Right: Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-xs font-bold font-title">
                              {record.plant_nickname}
                            </span>
                            <span className="text-gray-400 text-xs font-body">
                              {new Date(record.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                            <div className="bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100/50 flex items-center justify-center gap-2">
                              <div className="text-right leading-tight">
                                <p className="text-[10px] text-orange-400 font-bold">성장</p>
                                <p className="text-[10px] text-orange-400 font-bold">단계</p>
                              </div>
                              <div className="w-10 h-10 shrink-0">
                                <Image 
                                  src={
                                    record.growth_stage === "씨앗" ? "/images/stage-seed.png" :
                                    record.growth_stage === "새싹" ? "/images/stage-sprout.png" :
                                    record.growth_stage === "줄기" ? "/images/stage-stem.png" :
                                    record.growth_stage === "꽃" ? "/images/stage-flower.png" :
                                    record.growth_stage === "열매" ? "/images/fruit.png" :
                                    "/images/stage-sprout.png"
                                  } 
                                  alt="stage" width={40} height={40} className="object-contain" 
                                />
                              </div>
                            </div>
                            <div className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                              <p className="text-[10px] text-blue-400 font-bold">키 (cm)</p>
                              <p className="text-sm font-title text-blue-600">{record.height_cm || 0}cm</p>
                            </div>
                            <div className="bg-green-50 px-3 py-1.5 rounded-xl border border-green-100/50">
                              <p className="text-[10px] text-green-500 font-bold">잎 / 꽃 / 열매</p>
                              <p className="text-sm font-title text-brand-green">
                                {record.leaf_count || 0} / {record.flower_count || 0} / {record.fruit_count || 0}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <p className="font-body text-gray-600 leading-relaxed text-sm italic">
                              "{record.observation_text}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(selectedPlantId ? records.filter(r => r.plant_id === selectedPlantId) : records).length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <Image src="/images/sprout.png" alt="empty" width={80} height={80} className="opacity-20" />
                    <p className="font-body text-gray-400">아직 기록이 없습니다. 첫 번째 관찰 일지를 써보세요!</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Modals */}
        {isLogOpen && (
          <ObservationModal 
            onClose={() => setIsLogOpen(false)} 
            plantId={selectedPlantId!} 
            plantNickname={plants.find(p => p.id === selectedPlantId)?.plant_nickname || ""}
            onSuccess={() => { fetchData(studentId!); setIsLogOpen(false); }}
          />
        )}
      </div>
    </div>

    {isReportOpen && (
      <ReportModal 
        onClose={() => setIsReportOpen(false)} 
        plant={plants.find(p => p.id === selectedPlantId)!}
        records={records.filter(r => r.plant_id === selectedPlantId)}
        studentName={studentName}
        studentGender={studentGender}
        className={className || "우리 반"}
        mode="student"
        allPlants={plants}
        onPlantChange={(p) => setSelectedPlantId(p.id)}
        onSaveReflection={handleSaveReflection}
        onDeleteRecord={handleDeleteRecord}
      />
    )}
    {isAiOpen && (
      <AiModal 
        onClose={() => setIsAiOpen(false)} 
        plantNickname={plants.find(p => p.id === selectedPlantId)?.plant_nickname || ""}
      />
    )}
    {isCareOpen && (
      <CareModal 
        onClose={() => setIsCareOpen(false)} 
        plantNickname={plants.find(p => p.id === selectedPlantId)?.plant_nickname || ""}
      />
    )}
    {isGardenOpen && (
      <GardenModal 
        className={className || "우리 반"}
        classId={classId || ""}
        mode="student"
        onClose={() => setIsGardenOpen(false)}
      />
    )}
    {isSearchOpen && (
      <PlantSearchModal onClose={() => setIsSearchOpen(false)} />
    )}
  </>
);
}

// Observation Modal Component
function ObservationModal({ onClose, plantId, plantNickname, onSuccess }: { onClose: () => void, plantId: string, plantNickname: string, onSuccess: () => void }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [stage, setStage] = useState("씨앗");
  const [height, setHeight] = useState("0");
  const [leafCount, setLeafCount] = useState("0");
  const [flowerCount, setFlowerCount] = useState("0");
  const [fruitCount, setFruitCount] = useState("0");
  const [isListening, setIsListening] = useState(false);
  const [randomQuestion, setRandomQuestion] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const questionTemplates = [
      "잎이나 줄기에 새로운 변화가 보이나요?",
      "줄기의 길이나 두께는 어떻게 달라졌나요?",
      "꽃이나 봉오리가 생겼나요, 혹은 다른 변화가 있나요?",
      "흙의 상태는 어떤가요? 물을 줘야 할까요?",
      "식물에서 냄새가 나나요? 어떤 냄새인지 구체적으로 표현해 볼까요?",
      "잎이나 줄기를 만졌을 때 느낌은 어떤가요?",
      "오늘 날씨는 어떤가요? 햇빛을 얼마나 받았나요?",
      "식물에 벌레나 다른 작은 생물이 있나요?",
      "줄기나 잎이 어느 방향으로 자라고 있나요?",
      "식물의 크기가 지난번과 비교해 달라졌나요?",
      "바람이나 날씨가 식물에 어떤 영향을 준 것 같나요?",
      "오늘 식물의 기분을 상상해 본다면 어떤가요?",
      "식물이 자라는 속도가 빠른가요, 느린가요?",
      "식물의 모양이 특별히 재미있거나 신기한 부분이 있나요?"
    ];
    const randomIndex = Math.floor(Math.random() * questionTemplates.length);
    setRandomQuestion(questionTemplates[randomIndex]);
  }, []);

  const stages = [
    { name: "씨앗", img: "/images/stage-seed.png" },
    { name: "새싹", img: "/images/stage-sprout.png" },
    { name: "줄기", img: "/images/stage-stem.png" },
    { name: "꽃", img: "/images/stage-flower.png" },
    { name: "열매", img: "/images/fruit.png" },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new (window as any).Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setImage(dataUrl);
        };
        img.src = event.target?.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const startListening = () => {
    // 이미 음성인식이 동작 중인 경우, 두 번 이상 동시 실행되는 것을 방지하고 멈춤 처리
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    // 음성 인식을 시작하는 순간의 텍스트 상태 스냅샷을 캡처
    const startText = text.trim();

    // 모든 주요 브라우저(크롬, 사파리, 파이어폭스, 엣지, 오페라 등)의 벤더 프리픽스 호환성 최대 보장
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition || 
      (window as any).mozSpeechRecognition || 
      (window as any).msSpeechRecognition || 
      (window as any).oSpeechRecognition;

    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. 구글 크롬(Chrome), 마이크로소프트 엣지(Edge) 등 표준 브라우저의 최신 버전을 이용해주세요. 💻");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    
    recognition.onresult = (event: any) => {
      // 0번 인덱스부터 event.results 전체를 검사하여 이번 음성인식 세션에서 확정된(isFinal) 모든 텍스트를 누적
      let speechToText = "";
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript) {
            speechToText += (speechToText ? " " : "") + transcript + ".";
          }
        }
      }

      if (speechToText.trim()) {
        // 시작 시점 원본 텍스트 + 공백 + 이번 인식된 전체 텍스트
        setText(startText ? startText + " " + speechToText.trim() : speechToText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      recognitionRef.current = null;
      
      if (event.error === 'not-allowed') {
        alert(
          "마이크 권한이 차단되어 음성 인식을 시작할 수 없습니다. 🎤\n\n" +
          "[해결 방법]\n" +
          "1. 브라우저 주소창 왼쪽의 '자물쇠' 또는 '설정' 아이콘을 클릭하여 마이크 권한을 '허용'으로 변경해주세요.\n" +
          "2. 운영체제 설정(윈도우 '마이크 개인 정보 설정' 또는 맥의 '개인 정보 보호')에서 브라우저의 마이크 사용 권한이 켜져 있는지 확인해주세요."
        );
      } else if (event.error === 'no-speech') {
        // 음성이 감지되지 않은 경우 자연스럽게 마감
      } else if (event.error === 'network') {
        alert("인터넷 연결이 원활하지 않아 음성 인식 네트워크 오류가 발생했습니다. 연결을 확인해주세요.");
      } else {
        alert(`음성 인식 오류 (${event.error}): 마이크 장치 연결이나 시스템 장치 설정을 점검해주세요.`);
      }
    };

    try {
      recognition.start();
    } catch (e: any) {
      console.error("Speech Recognition Start Fail:", e);
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSubmitting(true);
    
    // Note: image_url will store the base64 for now, or you'd upload to Supabase Storage
    const { error } = await getSupabaseClient().from("records").insert({
      plant_id: plantId,
      observation_text: text.trim(),
      image_url: image,
      growth_stage: stage,
      height_cm: height ? parseFloat(height) : 0,
      leaf_count: leafCount ? parseInt(leafCount) : 0,
      flower_count: flowerCount ? parseInt(flowerCount) : 0,
      fruit_count: fruitCount ? parseInt(fruitCount) : 0
    });

    if (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다. (데이터베이스 컬럼을 확인해주세요)");
    } else {
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[20000] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-[500px] rounded-[35px] p-6 shadow-2xl animate-in zoom-in-95 duration-300 my-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-title text-3xl text-brand-green mb-1">새 관찰일지 작성</h3>
            <p className="text-sm text-gray-500 font-bold font-body">'{plantNickname}'의 오늘을 기록해 주세요.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Growth Stage Selection */}
          <div>
            <label className="font-title text-base text-brand-brown mb-3 block">현재 성장 단계</label>
            <div className="grid grid-cols-5 gap-3">
              {stages.map(s => (
                <div 
                  key={s.name}
                  onClick={() => setStage(s.name)}
                  className={`flex flex-col items-center p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                    stage === s.name ? 'border-brand-green bg-brand-green/5 scale-105' : 'border-gray-100 hover:border-brand-green/20'
                  }`}
                >
                  <div className="w-10 h-10 mb-0.5">
                    <Image src={s.img} alt={s.name} width={40} height={40} className="object-contain" />
                  </div>
                  <span className={`text-xs font-black mt-1 ${stage === s.name ? 'text-brand-green' : 'text-gray-500'}`}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Photo & Measurements Combined Row */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="font-title text-base text-brand-brown mb-3 block">식물 사진</label>
              <div className="flex gap-2">
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all">
                  <span className="text-xl text-gray-400">+</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                {image && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-brand-green relative group">
                    <img src={image} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => setImage(null)} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs">✕</button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-500 ml-1">키(cm)</label>
                <input type="number" min="0" step="0.5" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-base font-bold text-gray-700 outline-none border border-gray-200 focus:border-brand-green" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 ml-1">잎(개)</label>
                <input type="number" min="0" step="1" value={leafCount} onChange={e => setLeafCount(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-base font-bold text-gray-700 outline-none border border-gray-200 focus:border-brand-green" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 ml-1">꽃(개)</label>
                <input type="number" min="0" step="1" value={flowerCount} onChange={e => setFlowerCount(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-base font-bold text-gray-700 outline-none border border-gray-200 focus:border-brand-green" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 ml-1">열매(개)</label>
                <input type="number" min="0" step="1" value={fruitCount} onChange={e => setFruitCount(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-base font-bold text-gray-700 outline-none border border-gray-200 focus:border-brand-green" />
              </div>
            </div>
          </div>

          {/* Observation Text */}
          <div className="relative">
            <label className="font-title text-base text-brand-brown mb-3 block">관찰 내용</label>
            <div className="relative group">
              <textarea 
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full h-28 bg-gray-50 rounded-[30px] p-6 pr-16 font-body text-lg font-medium text-gray-800 outline-none border border-gray-200 focus:border-brand-green transition-all resize-none placeholder:text-gray-400"
                placeholder={`오늘의 초록 질문: 오늘 식물은 어떤가요? ${randomQuestion}`}
                required
              />
              <button 
                type="button" 
                onClick={startListening}
                className="absolute right-4 bottom-4 w-10 h-10 flex items-center justify-center transition-all z-20"
              >
                {isListening && (
                  <span className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75"></span>
                )}
                <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-white shadow-md hover:bg-brand-green/10 border border-gray-100'}`}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className={`w-4 h-4 ${isListening ? 'text-white' : 'text-gray-500'}`}
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10a1 1 0 0 0-1 1v1a6 6 0 1 1-12 0v-1a1 1 0 0 0-2 0v1a8 8 0 0 0 7 7.93V21a1 1 0 1 0 2 0v-2.07A8 8 0 0 0 21 11v-1a1 1 0 0 0-1-1Z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-2 bg-[#e2e8d0] text-[#4a5a18] font-title text-base rounded-full hover:bg-[#d6dec0] transition-all disabled:opacity-50 shadow-sm border border-[#c5cdb0] active:scale-95"
            >
              {isSubmitting ? "저장 중..." : "기록 저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function AiModal({ onClose, plantNickname }: { onClose: () => void, plantNickname: string }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const diagnosisData = [
    { id: 1, problem: "잎이 노랗게 변해요", solution: "물을 너무 많이 줬거나 영양분이 부족할 수 있어요. 겉흙이 말랐을 때 물을 주고, 액체 비료를 조금 줘보세요.", icon: "🍂" },
    { id: 2, problem: "잎 끝이 갈색으로 타요", solution: "공기가 너무 건조하거나 직사광선이 너무 강해요. 분무기로 물을 뿌려 습도를 높여주고 반그늘로 옮겨주세요.", icon: "🔥" },
    { id: 3, problem: "식물이 시들시들해요", solution: "물이 부족하거나 뿌리가 상했을 수 있어요. 흙을 확인해보고 물을 충분히 주거나, 물 빠짐이 잘 되는지 확인하세요.", icon: "🥀" },
    { id: 4, problem: "하얀 가루가 생겼어요", solution: "흰가루병일 가능성이 커요. 통풍이 잘 되는 곳으로 옮기고, 심한 잎은 따주거나 전용 약제를 사용하세요.", icon: "❄️" },
    { id: 5, problem: "벌레가 생겼어요", solution: "진딧물이나 응애일 수 있어요. 잎 뒷면을 잘 닦아주고, 친환경 살충제나 비눗물을 살짝 뿌려주세요.", icon: "🐛" },
    { id: 6, problem: "성장이 너무 느려요", solution: "햇빛이 부족하거나 화분이 너무 작을 수 있어요. 좀 더 밝은 곳으로 옮거나 큰 화분으로 분갈이를 해주세요.", icon: "🐢" },
    { id: 7, problem: "흙에 곰팡이가 생겼어요", solution: "흙이 너무 습하고 통풍이 안 되는 상태예요. 물 주기를 멈추고 흙을 말려주세요. 통풍이 아주 중요해요!", icon: "🍄" },
    { id: 8, problem: "잎이 툭툭 떨어져요", solution: "갑작스러운 온도 변화나 환경 변화 때문일 수 있어요. 식물을 자주 옮기지 말고 일정한 온도를 유지해 주세요.", icon: "🍃" },
    { id: 9, problem: "꽃이 피지 않아요", solution: "꽃을 피울 영양(인산)이 부족하거나 햇빛이 더 필요해요. 꽃눈이 생길 때는 햇빛을 충분히 보여주세요.", icon: "🌸" },
    { id: 10, problem: "줄기가 가늘고 길어요", solution: "햇빛을 보려고 위로만 자란 '웃자람' 현상이에요. 더 밝은 곳으로 옮기고 적절히 가지치기를 해주세요.", icon: "🎋" },
  ];

  const selectedDiagnosis = diagnosisData.find(d => d.id === selectedId);

  return (
    <div className="fixed inset-0 bg-black/60 z-[20000] flex items-start md:items-center justify-center p-4 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-[850px] rounded-[40px] p-6 md:p-10 shadow-2xl flex flex-col my-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-green/10 rounded-2xl flex items-center justify-center">
              <Image src="/images/ai-icon.png" alt="ai" width={32} height={32} />
            </div>
            <div>
              <h3 className="font-title text-2xl md:text-3xl text-brand-green">AI 식물 진단</h3>
              <p className="text-xs md:text-sm font-body text-gray-400 break-keep">'{plantNickname}'의 증상을 선택해 주세요.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl md:text-2xl shrink-0 p-1">✕</button>
        </div>

        <div className="flex-1">
          {!selectedId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {diagnosisData.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className="bg-brand-bg/30 hover:bg-brand-bg/60 p-4 rounded-3xl flex items-center gap-4 transition-all group text-left border-2 border-transparent hover:border-brand-green/20"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform shrink-0">{d.icon}</span>
                  <span className="font-body font-bold text-gray-700 whitespace-nowrap">{d.problem}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-brand-green/5 rounded-[35px] p-8 mb-6 border-2 border-brand-green/10 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 text-[120px] opacity-5 rotate-12">{selectedDiagnosis?.icon}</div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-5xl">{selectedDiagnosis?.icon}</span>
                    <h4 className="font-title text-2xl text-brand-brown">진단: {selectedDiagnosis?.problem}</h4>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-white shadow-sm">
                    <p className="font-title text-brand-green mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
                      AI 처방전
                    </p>
                    <p className="font-body text-gray-700 leading-relaxed text-lg break-keep">
                      {selectedDiagnosis?.solution}
                    </p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedId(null)}
                className="w-full py-4 rounded-2xl bg-gray-100 text-gray-500 font-title text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                ← 다른 증상 선택하기
              </button>
            </div>
          )}
        </div>

        {!selectedId && (
          <div className="mt-8 p-4 bg-gray-50 rounded-2xl">
            <p className="text-[11px] text-gray-400 font-body text-center leading-tight">
              * 이 진단은 일반적인 식물 관리 정보를 바탕으로 제공됩니다.<br/>
              정확한 진단을 위해 식물의 품종과 환경을 고려해 주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CareModal({ onClose, plantNickname }: { onClose: () => void, plantNickname: string }) {
  const [step, setStep] = useState(1); // 1: Supplies, 2: Coding, 3: Environment, 4: Final Success
  const [method, setMethod] = useState<"seed" | "seedling" | "potato" | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [codingBlocks, setCodingBlocks] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 선택 효과음 재생 함수 (도구 등)
  const playSelectSound = () => {
    const audio = new Audio("/sound/floraphonic-casual-click-pop-ui-3-262120.mp3");
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked:", e));
  };

  // 블록 선택 효과음 재생 함수 (코딩 블록)
  const playBlockSound = () => {
    const audio = new Audio("/sound/floraphonic-minimal-pop-click-ui-1-198301.mp3");
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked:", e));
  };

  // 성공 시퀀스 효과음 재생 함수
  const playSuccessSound = () => {
    const audio = new Audio("/sound/floraphonic-minimal-pop-click-ui-15-198315.mp3");
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked:", e));
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (step === 4) { // Success stage
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [step]);
  
  const supplies = [
    // Essential
    { id: "pot", name: "화분", img: "/images/plantpot1.png", essential: true },
    { id: "soil", name: "배양토", img: "/images/soil.png", essential: true },
    { id: "seed", name: "씨앗", img: "/images/seed.png", essential: true },
    { id: "trowel", name: "모종삽", img: "/images/trowel1.png", essential: true },
    { id: "watering", name: "물조리개", img: "/images/watering_can.png", essential: true },
    { id: "gloves", name: "장갑", img: "/images/gloves.png", essential: true },
    
    // Distractors
    { id: "clock", name: "시계", img: "/images/clock.png", essential: false },
    { id: "dice", name: "주사위", img: "/images/dice.png", essential: false },
    { id: "toothbrush", name: "칫솔", img: "/images/toothbrush.png", essential: false },
    { id: "bell", name: "종", img: "/images/bell.png", essential: false },
  ];

  // Random positions for irregular layout
  const positions = [
    { top: '10%', left: '5%', rotate: '-15deg' },
    { top: '15%', left: '25%', rotate: '10deg' },
    { top: '5%', left: '50%', rotate: '-5deg' },
    { top: '20%', left: '75%', rotate: '20deg' },
    { top: '40%', left: '10%', rotate: '15deg' },
    { top: '50%', left: '35%', rotate: '-10deg' },
    { top: '35%', left: '60%', rotate: '5deg' },
    { top: '45%', left: '85%', rotate: '-20deg' },
    { top: '65%', left: '20%', rotate: '12deg' },
    { top: '60%', left: '70%', rotate: '-8deg' },
  ];

  const [shuffledSupplies, setShuffledSupplies] = useState<any[]>([]);

  useEffect(() => {
    setShuffledSupplies([...supplies].sort(() => Math.random() - 0.5));
  }, []);

  const seedSteps = [
    { id: "s1", name: "화분에 흙 채우기", img: "/images/seed1.png" },
    { id: "s2", name: "씨앗 넣기", img: "/images/seed2.png" },
    { id: "s3", name: "흙 덮어주기", img: "/images/seed3.png" },
    { id: "s4", name: "물 주기", img: "/images/seed4.png" },
    { id: "s5", name: "암발아 씨앗이면 신문지 덮기", img: "/images/seed5.png" },
    { id: "s6", name: "햇빛 보여주기 (광발아/새싹)", img: "/images/seed6.png" }
  ];

  const seedlingSteps = [
    { id: "m1", name: "화분에 흙 채우기", img: "/images/grow1.png" },
    { id: "m2", name: "흙에 구멍파기", img: "/images/grow2.png" },
    { id: "m3", name: "모종 심기", img: "/images/grow3.png" },
    { id: "m4", name: "흙덮고 다지기", img: "/images/grow4.png" },
    { id: "m5", name: "물 주기", img: "/images/grow5.png" },
    { id: "m6", name: "햇빛 보여주기", img: "/images/grow6.png" }
  ];

  const potatoSteps = [
    { id: "p1", name: "씨감자 자르기", img: "/images/11.png" },
    { id: "p2", name: "흙에 씨감자 넣고 흙 덮기", img: "/images/12.jpg" },
    { id: "p3", name: "물주기", img: "/images/13.jpg" },
    { id: "p4", name: "싹이 나면 북주기", img: "/images/14.png" },
    { id: "p5", name: "곁순지르기", img: "/images/15.png" },
    { id: "p6", name: "꽃이 피면 꽃대 자르기", img: "/images/16.png" }
  ];

  const getBlocks = () => {
    let list: any[] = [];
    if (method === "seed") {
      list = [...seedSteps];
    } else if (method === "seedling") {
      list = [...seedlingSteps];
    } else if (method === "potato") {
      list = [...potatoSteps];
    }
    return list.sort(() => Math.random() - 0.5);
  };

  const [availableBlocks, setAvailableBlocks] = useState<any[]>([]);

  useEffect(() => {
    if (step === 2) {
      setAvailableBlocks(getBlocks());
    }
  }, [step, method]);

  const toggleItem = (id: string) => {
    playSelectSound();
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const addBlock = (id: string) => {
    playBlockSound();
    if (!codingBlocks.includes(id)) {
      setCodingBlocks([...codingBlocks, id]);
    }
  };

  const removeBlock = (index: number) => {
    setCodingBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const checkOrder = () => {
    let isCorrect = false;
    
    if (method === "seed") {
      const darkGermination = ["s1", "s2", "s3", "s4", "s5", "s6"];
      const lightGermination = ["s1", "s2", "s3", "s4", "s6"];
      const current = JSON.stringify(codingBlocks);
      
      if (current === JSON.stringify(darkGermination) || current === JSON.stringify(lightGermination)) {
        isCorrect = true;
      }
    } else if (method === "seedling") {
      const correct = ["m1", "m2", "m3", "m4", "m5", "m6"];
      if (JSON.stringify(codingBlocks) === JSON.stringify(correct)) {
        isCorrect = true;
      }
    } else if (method === "potato") {
      const correct = ["p1", "p2", "p3", "p4", "p5", "p6"];
      if (JSON.stringify(codingBlocks) === JSON.stringify(correct)) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      setIsExecuting(true);
      let idx = 0;
      const interval = setInterval(() => {
        if (idx < codingBlocks.length) {
          setHighlightIndex(idx);
          playSuccessSound();
          idx++;
        } else {
          clearInterval(interval);
          setHighlightIndex(null);
          setIsExecuting(false);
          setStep(3);
        }
      }, 400);
    } else {
      alert("순서가 조금 틀린 것 같아요! 이미지를 다시 한 번 살펴볼까요? 🤔");
      setCodingBlocks([]);
    }
  };

  const essentialSupplies = supplies.filter(s => s.essential).map(s => s.id);
  const selectedEssentials = supplies.filter(s => s.essential && selectedItems.includes(s.id));
  const selectedDistractors = supplies.filter(s => !s.essential && selectedItems.includes(s.id));
  const hasOnlyEssentials = selectedEssentials.length === essentialSupplies.length && selectedDistractors.length === 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[20000] flex items-center justify-center p-2 md:p-4 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-[950px] rounded-[30px] p-3 sm:p-4 md:p-6 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-50 rounded-xl flex items-center justify-center text-lg sm:text-xl">✨</div>
            <div>
              <h3 className="font-title text-lg sm:text-2xl text-pink-500">식물 가꾸기 마스터</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl sm:text-2xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {step === 1 && (
            <div className="flex flex-col">
              <div className="text-center mb-2">
                <h4 className="font-title text-xl text-brand-brown">Step 1. 식물 심기에 꼭 필요한 <span className="text-pink-500">도구</span> 고르기</h4>
              </div>
              
              <div className={`bg-gray-50/50 rounded-[30px] border-2 border-dashed border-gray-200 ${isMobile ? 'grid grid-cols-3 gap-2 p-3 min-h-[380px] overflow-y-auto' : 'relative overflow-hidden h-[380px]'}`}>
                {shuffledSupplies.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    style={isMobile ? { transform: `rotate(${positions[idx].rotate})` } : {
                      position: 'absolute',
                      top: positions[idx].top,
                      left: positions[idx].left,
                      transform: `rotate(${positions[idx].rotate})`,
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-3 rounded-[15px] sm:rounded-[25px] border-2 sm:border-4 transition-all hover:scale-105 active:scale-95 ${isMobile ? 'relative w-full' : ''} ${
                      selectedItems.includes(item.id) 
                        ? (item.essential ? 'border-pink-400 bg-pink-50 z-20 shadow-md' : 'border-red-300 bg-red-50 z-20 shadow-md') 
                        : 'border-white bg-white/50 shadow-sm hover:border-pink-100 z-10'
                    }`}
                  >
                    <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center text-2xl sm:text-4xl overflow-hidden">
                      {item.img.startsWith('/') ? (
                        <Image src={item.img} alt={item.name} width={80} height={80} className="object-contain w-full h-full" />
                      ) : (
                        item.img
                      )}
                    </div>
                    <span className={`font-title text-xs sm:text-base mt-0.5 sm:mt-1 ${selectedItems.includes(item.id) ? 'text-pink-600 font-bold' : 'text-gray-500'}`}>
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center mt-4">
                <button
                  disabled={!hasOnlyEssentials}
                  onClick={() => setStep(1.5)}
                  className={`px-12 py-3 rounded-full font-title text-xl shadow-lg transition-all ${
                    hasOnlyEssentials ? 'bg-pink-500 text-white hover:bg-pink-600 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  준비 완료! →
                </button>
                {selectedDistractors.length > 0 && <p className="text-red-400 mt-1 font-body font-bold animate-bounce text-xs">앗! 필요 없는 물건이 섞여 있어요! 🙅‍♂️</p>}
              </div>
            </div>
          )}

          {step === 1.5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-4 sm:py-6">
              <h4 className="font-title text-xl sm:text-2xl text-brand-brown mb-4 sm:mb-6">어떤 방법으로 식물을 심을까요?</h4>
              <div className="flex flex-row flex-wrap gap-3 sm:gap-4 justify-center">
                <button 
                  onClick={() => { playSelectSound(); setMethod("seed"); setStep(2); }}
                  className="bg-amber-50 hover:bg-amber-100 p-3 sm:p-6 rounded-[25px] sm:rounded-[40px] border-4 border-amber-200 transition-all hover:scale-105 group w-[120px] sm:w-[180px]"
                >
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full mx-auto mb-2 sm:mb-4 flex items-center justify-center shadow-sm overflow-hidden p-2 sm:p-3">
                    <img src="/images/seed.png" alt="씨앗" className="object-contain w-full h-full" />
                  </div>
                  <span className="font-title text-base sm:text-2xl text-amber-700 block mb-1">씨뿌리기</span>
                </button>
                <button 
                  onClick={() => { playSelectSound(); setMethod("seedling"); setStep(2); }}
                  className="bg-green-50 hover:bg-green-100 p-3 sm:p-6 rounded-[25px] sm:rounded-[40px] border-4 border-green-200 transition-all hover:scale-105 group w-[120px] sm:w-[180px]"
                >
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full mx-auto mb-2 sm:mb-4 flex items-center justify-center shadow-sm overflow-hidden p-2 sm:p-3">
                    <img src="/images/stem.png" alt="모종" className="object-contain w-full h-full" />
                  </div>
                  <span className="font-title text-base sm:text-2xl text-green-700 block mb-1">모종 심기</span>
                </button>
                <button 
                  onClick={() => { playSelectSound(); setMethod("potato"); setStep(2); }}
                  className="bg-yellow-50 hover:bg-yellow-100 p-3 sm:p-6 rounded-[25px] sm:rounded-[40px] border-4 border-yellow-200 transition-all hover:scale-105 group w-[120px] sm:w-[180px]"
                >
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full mx-auto mb-2 sm:mb-4 flex items-center justify-center shadow-sm overflow-hidden p-2 sm:p-3">
                    <img src="/images/potato1.png" alt="감자" className="object-contain w-full h-full" />
                  </div>
                  <span className="font-title text-base sm:text-2xl text-yellow-700 block mb-1">감자 심기</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <h4 className="font-title text-2xl text-brand-brown">
                  Step 2. {method === "seed" ? "씨뿌리기" : method === "seedling" ? "모종 심기" : "감자 심기"} <span className="text-blue-500">이미지 코딩</span>
                </h4>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Available Blocks */}
                <div className="w-full md:w-[320px]">
                  <div className="grid grid-cols-3 gap-1.5">
                    {availableBlocks.map((block) => (
                      <button
                        key={block.id}
                        disabled={codingBlocks.includes(block.id)}
                        onClick={() => addBlock(block.id)}
                        className={`p-1 sm:p-1.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-0.5 ${
                          codingBlocks.includes(block.id)
                            ? 'bg-gray-100 border-gray-200 grayscale opacity-30'
                            : 'bg-white border-blue-400 hover:bg-blue-50 hover:scale-105 shadow-sm'
                        }`}
                      >
                        <div className="w-[74px] h-[74px] flex items-center justify-center">
                          <img src={block.img} alt={block.name} className="object-contain w-[58px] h-[58px]" />
                        </div>
                        <span className="text-[9px] sm:text-xs font-body font-bold text-gray-700 leading-tight text-center break-keep whitespace-normal w-full px-0.5 min-h-[2.2rem] flex items-center justify-center">
                          {block.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Flow */}
                <div className={`flex-1 w-full bg-blue-50/50 p-4 rounded-[30px] border-2 border-dashed border-blue-200 flex flex-col items-center ${isMobile ? 'h-[280px]' : 'h-[350px]'}`}>
                  <p className="font-title text-blue-400 mb-2 text-sm flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px]">▷</span>
                    코딩 실행창
                  </p>
                  <div className="relative w-full flex-1 flex items-center justify-center">
                    {codingBlocks.map((blockId, index) => {
                      const block = (
                        method === "seed" 
                          ? seedSteps 
                          : method === "seedling" 
                            ? seedlingSteps 
                            : potatoSteps
                      ).find(s => s.id === blockId);
                      const maxItems = 6;
                      const angle = (index * (360 / maxItems)) - 90;
                      const radius = isMobile ? 65 : 95; // Compact radius
                      const x = Math.cos(angle * Math.PI / 180) * radius;
                      const y = Math.sin(angle * Math.PI / 180) * radius;

                      return (
                        <div 
                          key={index} 
                          className={`absolute p-0.5 sm:p-1 rounded-full border-2 shadow-md flex items-center justify-center group animate-in zoom-in-50 duration-300 transition-all ${
                            highlightIndex === index ? 'bg-yellow-100 border-yellow-400 scale-125 z-30 shadow-yellow-200' : 'bg-white border-blue-500 z-20'
                          }`}
                          style={{ 
                            left: '50%', 
                            top: '50%',
                            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                          }}
                        >
                          <div className="absolute -top-1.5 -left-1.5 w-5 h-5 sm:-top-2 sm:-left-2 sm:w-6 sm:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-title text-[10px] sm:text-xs shadow-sm z-10">
                            {index + 1}
                          </div>
                          <button 
                            onClick={() => removeBlock(index)} 
                            className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-[8px] sm:text-[10px] transition-opacity shadow-md z-10 touch-delete-btn"
                            title="제거"
                          >
                            ✕
                          </button>
                          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 flex items-center justify-center bg-blue-50/50 rounded-full overflow-hidden">
                            <img src={block?.img || ""} alt="" className="object-contain w-7 h-7 sm:w-10 sm:h-10 md:w-14 md:h-14" />
                          </div>
                        </div>
                      );
                    })}
                    {codingBlocks.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-center text-blue-400 text-sm font-body font-bold bg-white/60 px-4 py-2 rounded-full backdrop-blur-sm border border-blue-100 shadow-sm">
                          블록을 골라주세요!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6 gap-4">
                <button onClick={() => { setStep(1.5); setCodingBlocks([]); }} className="px-6 py-2 rounded-full font-title text-base bg-white border-2 border-gray-200 text-gray-400">뒤로</button>
                <button
                  disabled={codingBlocks.length < 5 || isExecuting}
                  onClick={checkOrder}
                  className={`px-10 py-2 rounded-full font-title text-lg shadow-lg transition-all ${
                    codingBlocks.length >= 5 && !isExecuting ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isExecuting ? '실행 중...' : '실행 ▶'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-1.5 sm:mb-2">
                <h4 className="font-title text-lg sm:text-2xl text-brand-brown">Step 3. 식물이 자라기 좋은 <span className="text-brand-green">환경</span> 만들기</h4>
              </div>

              <div className="bg-brand-bg/20 rounded-[20px] sm:rounded-[30px] p-3 sm:p-4 max-w-[650px] mx-auto border-2 border-white shadow-sm relative">
                {method === "seed" ? (
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-3xl">🌑</div>
                      <h5 className="font-title text-base sm:text-2xl text-amber-700">씨앗은 빛이 필요할까요?</h5>
                    </div>
                    <div className="space-y-1.5 sm:space-y-3 font-body text-gray-700 text-[11px] sm:text-lg leading-normal sm:leading-relaxed break-keep">
                      <p>많은 씨앗들은 싹이 틀 때까지 <span className="font-bold text-amber-600">어둡고 따뜻한 곳</span>을 좋아해요. 이것을 <span className="font-bold text-amber-600">'암발아'</span>라고 불러요.</p>
                      <p>하지만 상추나 당근처럼 싹이 틀 때 <span className="font-bold text-amber-600">빛이 필요한 '광발아'</span> 씨앗도 있답니다!</p>
                      <p className="bg-white/70 p-2 rounded-xl border border-amber-200 mt-1.5 text-[10px] sm:text-base font-bold">
                        💡 <span className="text-amber-800">미션:</span> 내가 심은 식물을 검색해보고, 알맞은 장소에 놓아주세요!
                      </p>
                    </div>
                  </div>
                ) : method === "potato" ? (
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-3xl">🥔</div>
                      <h5 className="font-title text-base sm:text-2xl text-yellow-700">감자는 어디서 잘 자랄까요?</h5>
                    </div>
                    <div className="space-y-1.5 sm:space-y-3 font-body text-gray-700 text-[11px] sm:text-lg leading-normal sm:leading-relaxed break-keep">
                      <p>감자는 <span className="font-bold text-yellow-600">햇빛이 아주 잘 들고 바람이 잘 통하는 곳</span>을 좋아해요.</p>
                      <p>특히 <span className="font-bold text-yellow-600">감자에 꽃이 필 때는 물을 충분히 주어</span> 감자가 커질 수 있게 해주세요!</p>
                      <p className="bg-white/70 p-2 rounded-xl border border-yellow-200 mt-1.5 text-[10px] sm:text-base font-bold">
                        💡 <span className="text-yellow-800">미션:</span> 감자에 곁순이 자라면 순지르기를 해서 덩이줄기에 양분이 집중되도록 해주세요!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-3xl">🌿</div>
                      <h5 className="font-title text-base sm:text-2xl text-green-700">모종은 어디에 두면 좋을까요?</h5>
                    </div>
                    <div className="space-y-1.5 sm:space-y-3 font-body text-gray-700 text-[11px] sm:text-lg leading-normal sm:leading-relaxed break-keep">
                      <p>식물마다 좋아하는 햇빛의 양이 달라요!</p>
                      <ul className="space-y-1 sm:space-y-2 list-disc list-inside ml-1">
                        <li><span className="font-bold text-green-600">양지 식물</span> (토마토, 고추): 햇빛이 잘 드는 <span className="font-bold text-green-600">창가</span>를 좋아해요.</li>
                        <li><span className="font-bold text-green-600">음지 식물</span> (스킨답서스, 고사리): 직접적인 햇빛보다는 <span className="font-bold text-green-600">실내 안쪽</span>을 좋아해요.</li>
                      </ul>
                      <p className="bg-white/70 p-2 rounded-xl border border-green-200 mt-1.5 text-[10px] sm:text-base font-bold">
                        💡 <span className="text-green-800">미션:</span> 우리 식물이 좋아하는 장소를 찾아주세요!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-3 sm:mt-6">
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 sm:px-12 sm:py-3 bg-brand-green text-white rounded-full font-title text-sm sm:text-xl shadow-xl hover:bg-brand-green/90 transition-all active:scale-95"
                >
                  식물 가꾸러 가기 🚀
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in zoom-in duration-500 text-center py-4 sm:py-8">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto relative z-10">
                  <Image src="/images/stage-sprout.png" alt="success" width={60} height={60} className="animate-bounce" />
                </div>
                <div className="absolute -top-3 -right-3 text-xl sm:text-3xl">🎉</div>
              </div>
              <h3 className="font-title text-xl sm:text-3xl text-brand-brown mb-2">참 잘했어요!</h3>
              <p className="font-body text-gray-600 text-sm sm:text-lg mb-4 sm:mb-8">당신은 훌륭한 식집사가 될 준비가 되었군요!</p>
              <button onClick={onClose} className="px-8 py-2 sm:px-12 sm:py-3 bg-brand-green text-white rounded-full font-title text-sm sm:text-xl shadow-xl hover:bg-brand-green/90 transition-all active:scale-95">완료!</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
