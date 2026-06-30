"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { supabase, getSupabaseClient } from "@/lib/supabaseClient";
import ReportModal, { Plant, Record } from "@/components/ReportModal";
import GardenModal from "@/components/GardenModal";
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
      className="bg-[#e6f4ea] border-[5px] border-[#4a3f35] rounded-[35px] p-6 pt-8 max-w-[340px] md:max-w-[400px] relative shadow-[0_6px_0_#4a3f35] mx-auto z-[10000]"
    >
      {/* Sprout Icon (Teacher Theme) */}
      <div className="absolute -top-6 -left-4 w-14 h-14 z-20 bg-white rounded-full border-[4px] border-[#4a3f35] flex items-center justify-center shadow-sm">
         <span className="text-3xl drop-shadow-sm -translate-y-0.5">🌱</span>
      </div>

      {/* Tail merging with the box (Only show if not center placement) */}
      {step.placement !== 'center' && (
        <>
          <div className="absolute -bottom-[15px] right-[40px] w-8 h-8 bg-[#4a3f35] transform rotate-45 rounded-sm z-[-1]"></div>
          <div className="absolute -bottom-[10px] right-[40px] w-8 h-8 bg-[#e6f4ea] transform rotate-45 z-[1]"></div>
        </>
      )}

      {/* Content */}
      <div className="font-body text-[#4a3f35] text-base md:text-lg leading-relaxed break-keep text-center mb-6 z-10 relative font-bold tracking-wide">
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

interface StudentStat {
  id: string;
  student_name: string;
  created_at: string;
  plant_count: number;
  record_count: number;
  gender?: "boy" | "girl";
}

interface PlantRecord {
  id: string;
  plant_nickname: string;
  plant_type: string;
  created_at: string;
  observation_text: string;
  image_url?: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentStat | null>(null);
  const [studentPlants, setStudentPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<Record[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGardenOpen, setIsGardenOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGender, setNewStudentGender] = useState<"boy" | "girl">("boy");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeConfirmInput, setCloseConfirmInput] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  
  const [appUrl, setAppUrl] = useState("");

  // Tutorial state
  const [runTutorial, setRunTutorial] = useState(false);
  const [tutorialKey, setTutorialKey] = useState(0);

  const tutorialSteps = [
    {
      target: "body",
      content: (
        <div className="text-left space-y-2 font-body text-base md:text-lg text-[#4a3f35] leading-relaxed break-keep">
          <p><strong>선생님, 환영합니다! ☕</strong></p>
          <p>아이들이 식물과 교감하며 생명의 소중함을 배울 수 있도록, '우리 반 식집사'가 든든한 보조 교사가 되어 드릴게요.</p>
          <p className="pt-2 text-brand-green font-bold text-center">어떻게 학급 정원을 관리할 수 있는지<br/>함께 알아볼까요?</p>
        </div>
      ),
      placement: "center",
    },
    {
      target: "#tutorial-step-1",
      content: <div className="break-keep">가장 먼저 여기에 우리 반 학생을 추가해 주세요! 추가된 학생은 오른쪽 목록에 나타납니다. QR 코드를 띄워주면 우리 반 학급 코드가 자동으로 뜨며, 이름을 정확히 입력하면 로그인됩니다.</div>,
      placement: "bottom",
    },
    {
      target: "#tutorial-step-2",
      content: <div className="break-keep">등록된 학생들은 이 목록에 나타납니다. 학생 카드를 클릭하면 식물의 상세 정보와 성장 과정을 모니터링할 수 있어요.</div>,
      placement: "top",
    },
    {
      target: "#tutorial-step-2",
      content: <div className="break-keep">학생의 관찰 일지를 읽고 따뜻한 칭찬과 피드백을 남겨주세요! 작성된 관찰보고서는 PDF로 저장하고, 출력할 수도 있답니다.</div>,
      placement: "top",
    },
    {
      target: "#tutorial-step-4",
      content: <div className="break-keep">쉬는 시간이나 아침 조회 시간에 '우리 반 정원'을 교실 화면에 띄워두고 다 함께 식물들의 성장을 응원해 보는 건 어떨까요?</div>,
      placement: "bottom",
    },
    {
      target: "#tutorial-step-5",
      content: <div className="break-keep">또한 '개인정보 처리방침' 메뉴에서 학부모님께 안내할 '학생 가입동의서' 양식을 확인하실 수 있습니다.</div>,
      placement: "top",
    }
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTutorial(false);
      localStorage.setItem("teacherTutorialCompleted", "true");
    }
  };

  useEffect(() => {
    setAppUrl(window.location.origin);
    const role = localStorage.getItem("userRole");
    const storedClassId = localStorage.getItem("classId");
    const storedClassName = localStorage.getItem("className");
    const storedClassCode = localStorage.getItem("classCode");

    if (role !== "teacher" || !storedClassId) {
      alert("선생님 로그인이 필요합니다.");
      router.push("/");
      return;
    }

    const completed = localStorage.getItem("teacherTutorialCompleted");
    if (!completed) {
      setRunTutorial(true);
    }

    setClassId(storedClassId);
    setClassName(storedClassName || "");
    if (storedClassCode) setClassCode(storedClassCode);
    fetchClassInfo(storedClassId);
    fetchStudents(storedClassId);
  }, []);

  const fetchClassInfo = async (cId: string) => {
    const { data } = await supabase.from("classes").select("class_code").eq("id", cId).single();
    if (data) setClassCode(data.class_code);
  };

  const fetchStudents = async (cId: string) => {
    const { data: studentsData } = await getSupabaseClient()
      .from("students")
      .select("id, student_name, created_at, gender")
      .eq("class_id", cId)
      .order("created_at", { ascending: true });

    if (!studentsData) return;

    const stats: StudentStat[] = await Promise.all(
      studentsData.map(async (st) => {
        const { count: pCount } = await getSupabaseClient().from("plants").select("id", { count: "exact" }).eq("student_id", st.id);
        
        const { data: pData } = await getSupabaseClient().from("plants").select("id").eq("student_id", st.id);
        const pIds = pData?.map(p => p.id) || [];
        
        let rCount = 0;
        if (pIds.length > 0) {
           const { count } = await getSupabaseClient().from("records").select("id", { count: "exact" }).in("plant_id", pIds);
           rCount = count || 0;
        }

        return {
          id: st.id,
          student_name: st.student_name,
          created_at: st.created_at,
          plant_count: pCount || 0,
          record_count: rCount,
          gender: st.gender
        };
      })
    );

    setStudents(stats);
  };

  const fetchStudentReport = async (student: StudentStat) => {
    setSelectedStudent(student);
    
    // Fetch all plants of this student
    const { data: plants } = await getSupabaseClient()
      .from("plants")
      .select("*")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (plants && plants.length > 0) {
      setStudentPlants(plants);
      handlePlantChange(plants[0]);
      setIsReportOpen(true);
    } else {
      alert("이 학생은 아직 등록된 식물이 없습니다.");
    }
  };

  const handlePlantChange = async (plant: Plant) => {
    setSelectedPlant(plant);
    
    // Fetch all records for this specific plant
    const { data: records } = await getSupabaseClient()
      .from("records")
      .select("*")
      .eq("plant_id", plant.id)
      .order("created_at", { ascending: true });

    setSelectedRecords(records || []);
  };

  const handleSaveFeedback = async (plantId: string, feedback: string, stamp: string | null) => {
    const combinedFeedback = stamp ? `${feedback}||STAMP:${stamp}` : feedback;
    const { error } = await getSupabaseClient()
      .from("plants")
      .update({ 
        teacher_feedback: combinedFeedback
      })
      .eq("id", plantId);

    if (error) {
      console.error("Feedback Save Error:", error);
      alert(`피드백 저장 중 오류가 발생했습니다: ${error.message}`);
      throw error;
    } else {
      // Refresh local state
      if (selectedPlant && selectedPlant.id === plantId) {
        setSelectedPlant({ ...selectedPlant, teacher_feedback: combinedFeedback });
      }
      
      // Update studentPlants list so reopening works
      setStudentPlants(prev => prev.map(p => 
        p.id === plantId ? { ...p, teacher_feedback: combinedFeedback } : p
      ));
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  const handleCloseClass = async () => {
    if (closeConfirmInput !== className) {
      alert("학급명이 정확하지 않습니다.");
      return;
    }

    setIsClosing(true);
    try {
      // 1. 해당 학급에 속한 모든 학생의 ID 조회
      const { data: studentList, error: stFetchError } = await getSupabaseClient()
        .from("students")
        .select("id")
        .eq("class_id", classId);

      if (stFetchError) throw stFetchError;
      const studentIds = studentList?.map(s => s.id) || [];

      if (studentIds.length > 0) {
        // 2. 해당 학생들의 모든 식물 ID 조회
        const { data: plantList, error: plFetchError } = await getSupabaseClient()
          .from("plants")
          .select("id")
          .in("student_id", studentIds);

        if (plFetchError) throw plFetchError;
        const plantIds = plantList?.map(p => p.id) || [];

        // 3. records(관찰 일지) 삭제
        if (plantIds.length > 0) {
          const { error: recDelError } = await getSupabaseClient()
            .from("records")
            .delete()
            .in("plant_id", plantIds);
          if (recDelError) throw recDelError;
        }

        // 4. plants(반려 식물) 삭제
        const { error: plDelError } = await getSupabaseClient()
          .from("plants")
          .delete()
          .in("student_id", studentIds);
        if (plDelError) throw plDelError;
      }

      // 5. students(학생) 삭제
      const { error: stDelError } = await getSupabaseClient()
        .from("students")
        .delete()
        .eq("class_id", classId);
      if (stDelError) throw stDelError;

      // 6. classes(학급 및 교사 가입 정보) 최종 삭제
      const { error: classDelError } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);
      if (classDelError) throw classDelError;

      alert("학급이 폐쇄되었으며 모든 데이터가 영구 삭제되었습니다. 🚪");
      localStorage.clear();
      router.push("/");
    } catch (error: any) {
      console.error("Class Closure Error:", error);
      alert(`학급 폐쇄 진행 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setIsClosing(false);
      setIsCloseModalOpen(false);
      setCloseConfirmInput("");
    }
  };

  const getPlantImage = (type: string) => {
    if (type.includes("선인장")) return "/images/cactus.png";
    if (type.includes("토마토")) return "/images/tomato.png";
    if (type.includes("해바라기")) return "/images/sunflower.png";
    if (type.includes("콩")) return "/images/bean.png";
    if (type.includes("꽃")) return "/images/flower.png";
    if (type.includes("관엽")) return "/images/leaf.png";
    if (type.includes("감자") || type.includes("고구마")) return "/images/potato.png";
    return "/images/leaf.png";
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !classId) {
      alert("학생 이름을 입력해주세요.");
      return;
    }
    
    setIsAdding(true);
    const { error } = await getSupabaseClient()
      .from("students")
      .insert({ 
        class_id: classId, 
        student_name: newStudentName.trim(),
        gender: newStudentGender 
      });
      
    if (error) {
      console.error("Student Add Error:", error);
      if (error.code === '42703' || (error.message && error.message.includes("column \"gender\""))) {
        alert("데이터베이스에 'gender' 컬럼이 아직 없습니다.\n\n[해결 방법]\n1. Supabase 대시보드 접속\n2. SQL Editor 클릭\n3. 아래 명령 입력 후 Run:\n   ALTER TABLE students ADD COLUMN gender text DEFAULT 'boy';");
      } else if (error.code === '23505') {
        alert("이미 존재하는 학생 이름입니다.");
      } else {
        alert(`학생 추가 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
      }
    } else {
      setNewStudentName("");
      await fetchStudents(classId);
    }
    setIsAdding(false);
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    try {
      // 1. 식물 ID 목록 가져오기
      const { data: plants } = await getSupabaseClient().from("plants").select("id").eq("student_id", studentId);
      const plantIds = plants?.map(p => p.id) || [];

      // 2. 기록 삭제
      if (plantIds.length > 0) {
        await getSupabaseClient().from("records").delete().in("plant_id", plantIds);
      }

      // 3. 식물 삭제
      await getSupabaseClient().from("plants").delete().eq("student_id", studentId);

      // 4. 학생 삭제
      const { error } = await getSupabaseClient().from("students").delete().eq("id", studentId);

      if (error) throw error;

      alert("삭제되었습니다.");
      setDeletingStudentId(null);
      fetchStudents(classId!);
    } catch (error: any) {
      console.error(error);
      alert("삭제 실패: " + (error.message || "알 수 없는 오류"));
    }
  };

  if (!classId) return <div className="min-h-screen flex items-center justify-center font-title text-2xl">로딩 중...</div>;

  return (
    <>
    {React.createElement(Joyride as any, {
      key: tutorialKey,
      steps: tutorialSteps,
      run: runTutorial,
      continuous: true,
      callback: handleJoyrideCallback,
      tooltipComponent: CustomTooltip,
    })}
    <div 
      className="min-h-screen bg-cover bg-fixed bg-center relative dashboard-root print:hidden"
      style={{ backgroundImage: "url('/images/bg-teacher.jpg')" }}
    >
      <div className="absolute inset-0 bg-[#f9f8f0]/80 backdrop-blur-[2px]"></div>

      <div className="relative z-10 p-6 max-w-[1400px] mx-auto pb-20 animate-in fade-in duration-500">
      {/* QR Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setIsQrModalOpen(false)}>
          <div className="bg-white p-8 rounded-[30px] shadow-2xl animate-in zoom-in-95 duration-200 max-w-[400px] w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-title text-2xl text-center text-brand-green mb-6">학생 간편 입장 QR</h2>
            <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 flex justify-center">
              {appUrl && <QRCodeCanvas value={`${appUrl}?code=${classCode}`} size={260} fgColor="#333333" />}
            </div>
            <div className="mt-6 text-center bg-brand-input py-4 rounded-xl">
               <p className="font-body text-gray-400 text-sm mb-1">학급 코드</p>
               <p className="font-title text-4xl text-brand-brown tracking-[0.2em]">{classCode}</p>
            </div>
            <button onClick={() => setIsQrModalOpen(false)} className="mt-6 bg-brand-green text-white w-full py-4 rounded-xl text-xl font-title hover:bg-[#5e741e] transition-colors shadow-lg active:scale-95">
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-6 md:mb-8 border-b-4 border-brand-green pb-4 md:pb-3 gap-4">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-center md:justify-start overflow-hidden">
          <Image src="/images/teacher-icon.png" alt="선생님 아이콘" width={50} height={50} className="w-[40px] h-[40px] md:w-[70px] md:h-[70px] object-contain shrink-0 drop-shadow-md" />
          <h1 className="font-title text-lg sm:text-2xl md:text-4xl text-brand-brown drop-shadow-sm pt-2 whitespace-nowrap overflow-hidden text-ellipsis">
            {className} 정원 통합 관리실
          </h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            id="tutorial-step-4"
            onClick={() => setIsGardenOpen(true)}
            className="flex-1 md:flex-none bg-brand-green text-white px-4 md:px-5 py-2 rounded-full text-base md:text-lg font-title hover:bg-[#5e741e] hover:shadow-md transition-all active:scale-95 shadow-sm"
          >
            우리 반 정원
          </button>
          <button onClick={handleLogout} className="flex-1 md:flex-none bg-[#f5a623] text-white px-4 md:px-5 py-2 rounded-full text-base md:text-lg font-title hover:bg-[#e0961f] transition-all shadow-sm active:scale-95">
            로그아웃
          </button>
        </div>
      </div>

      <div className="flex gap-10 flex-col md:flex-row">
        {/* Left Side: QR & Class Info */}
        <div className="w-full md:w-[300px] flex flex-col gap-6 shrink-0">
          <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-brand-green flex flex-col items-center text-center">
            <h3 className="font-title text-2xl text-brand-green mb-4">학생 간편 입장 QR</h3>
            <div 
              className="bg-white p-2 rounded-xl mb-4 border-2 border-gray-100 cursor-pointer hover:scale-105 hover:shadow-md transition-all group relative"
              onClick={() => setIsQrModalOpen(true)}
            >
              {appUrl && <QRCodeCanvas value={`${appUrl}?code=${classCode}`} size={180} fgColor="#333333" />}
              <div className="absolute inset-0 bg-black/5 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-white/90 text-brand-green font-bold px-3 py-1 rounded-full text-sm shadow-sm backdrop-blur-sm">확대하기 🔍</span>
              </div>
            </div>
            <p className="font-body text-gray-600 text-sm mb-2">QR코드를 클릭하면 확대됩니다.</p>
            <div className="bg-brand-input w-full py-3 rounded-xl mt-2">
              <span className="font-body text-gray-500 text-sm block">학급 코드</span>
              <span className="font-title text-3xl text-brand-brown tracking-widest">{classCode}</span>
            </div>
          </div>
          
          <div id="tutorial-step-1" className="bg-[#f4e8d3] p-6 rounded-3xl shadow-md border-2 border-[#5a4a42]">
             <h3 className="font-title text-xl text-[#5a4a42] mb-3 text-center">학생 직접 추가</h3>
             <form onSubmit={handleAddStudent} className="flex flex-col gap-3">
               <input 
                 type="text" 
                 value={newStudentName}
                 onChange={(e) => setNewStudentName(e.target.value)}
                 className="px-3 py-2 rounded-lg font-body outline-none w-full border border-transparent focus:border-[#5a4a42]"
                 placeholder="학생 이름"
                 disabled={isAdding}
               />
               <div className="flex gap-2">
                 <button 
                   type="button" 
                   onClick={() => setNewStudentGender("boy")}
                   className={`flex-1 py-2 rounded-lg font-bold transition-all ${newStudentGender === 'boy' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}
                 >
                   남학생
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setNewStudentGender("girl")}
                   className={`flex-1 py-2 rounded-lg font-bold transition-all ${newStudentGender === 'girl' ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}
                 >
                   여학생
                 </button>
               </div>
                <button disabled={isAdding} type="submit" className="bg-[#5a4a42] text-white py-3 rounded-lg font-bold hover:bg-[#3d322c] transition-colors active:scale-95 disabled:opacity-50 mt-2">
                  {isAdding ? "추가 중..." : "학생 추가하기 ➕"}
                </button>
              </form>
           </div>

           {/* 개인정보 처리방침 메뉴 */}
           <div 
             id="tutorial-step-5"
             onClick={() => setIsPrivacyOpen(true)}
             className="bg-white p-5 rounded-3xl shadow-md border-2 border-brand-green/30 hover:border-brand-green hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group"
           >
             <div className="flex items-center gap-3">
               <span className="text-2xl group-hover:scale-110 transition-transform">🔒</span>
               <span className="font-title text-base md:text-lg text-brand-brown">개인정보 처리방침</span>
             </div>
             <span className="text-gray-400 group-hover:text-brand-green group-hover:translate-x-1 transition-all">➔</span>
           </div>

           {/* 튜토리얼 다시보기 메뉴 */}
           <div 
             onClick={() => {
               setTutorialKey(prev => prev + 1);
               setRunTutorial(true);
             }}
             className="bg-white p-5 rounded-3xl shadow-md border-2 border-brand-green/30 hover:border-brand-green hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group mt-2"
           >
             <div className="flex items-center gap-3">
               <span className="text-2xl group-hover:scale-110 transition-transform">💡</span>
               <span className="font-title text-base md:text-lg text-brand-brown">튜토리얼 다시보기</span>
             </div>
             <span className="text-gray-400 group-hover:text-brand-green group-hover:translate-x-1 transition-all">➔</span>
           </div>

           {/* 학급 폐쇄 메뉴 */}
           <div 
             onClick={() => {
               setCloseConfirmInput("");
               setIsCloseModalOpen(true);
             }}
             className="bg-red-50 p-5 rounded-3xl shadow-md border-2 border-red-200 hover:border-red-500 hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group mt-2"
           >
             <div className="flex items-center gap-3">
               <span className="text-2xl group-hover:scale-110 transition-transform">⚠️</span>
               <span className="font-title text-base md:text-lg text-red-600">학급 폐쇄 및 데이터 삭제</span>
             </div>
             <span className="text-red-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all">➔</span>
           </div>
         </div>

        {/* Right Side: Student Grid */}
        <div id="tutorial-step-2" className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-title text-2xl text-brand-green">우리 반 식집사들 ({students.length}명)</h2>
            {selectedStudent && (
              <div className="animate-in slide-in-from-right fade-in bg-brand-green/10 px-4 py-1.5 rounded-full border border-brand-green/30 flex items-center gap-2">
                <span className="font-title text-brand-green">선택됨:</span>
                <span className="font-title text-brand-brown">{selectedStudent.student_name} 식집사</span>
                <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-red-500 ml-2">✕</button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-6 gap-x-6 mt-4">
            {students.map((student) => (
              <div 
                key={student.id} 
                onClick={() => fetchStudentReport(student)}
                className={`w-full flex flex-col items-center justify-center cursor-pointer group transition-all duration-300 relative py-4 rounded-3xl ${
                  selectedStudent?.id === student.id ? 'bg-white/80 ring-4 ring-brand-green shadow-xl scale-105 z-10' : 'hover:bg-white/30'
                }`}
              >
                
                {/* 학생 삭제 버튼 */}
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    setDeletingStudentId(student.id); 
                  }}
                  className="absolute -top-1 -right-1 w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center shadow-sm z-30 hover:bg-red-500 transition-all border-2 border-white text-xs opacity-60 hover:opacity-100"
                  title="학생 삭제"
                >
                  ✕
                </button>

                {/* 삭제 확인 오버레이 */}
                {deletingStudentId === student.id && (
                  <div 
                    className="absolute inset-0 bg-red-500/90 backdrop-blur-sm z-40 rounded-[2rem] flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-white font-title text-sm mb-3">정말 삭제할까요?</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStudent(student.id, student.student_name);
                        }}
                        className="bg-white text-red-500 px-3 py-1 rounded-lg font-title text-xs shadow-md hover:bg-red-50"
                      >
                        삭제
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingStudentId(null);
                        }}
                        className="bg-gray-800/30 text-white px-3 py-1 rounded-lg font-title text-xs hover:bg-gray-800/50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* 학생 이미지 (성별에 따라) */}
                <div className="mb-2 transform transition-all duration-300">
                  <div className={`relative flex items-center justify-center ${selectedStudent?.id === student.id ? '' : 'animate-bounce-slow group-hover:animate-none'}`}>
                    {/* 모서리가 둥근 직사각형 배경 */}
                    <div className={`absolute inset-0 backdrop-blur-sm rounded-[2rem] border-2 transition-all duration-300 ${
                      selectedStudent?.id === student.id ? 'bg-white border-brand-green/60 shadow-md' : 'bg-white/60 border-brand-green/20 shadow-inner group-hover:bg-white group-hover:border-brand-green/40'
                    }`}></div>
                    
                    <div className={`absolute inset-0 bg-brand-green/5 blur-lg rounded-full transition-transform ${selectedStudent?.id === student.id ? 'scale-110' : 'scale-0 group-hover:scale-100'}`}></div>
                    <Image 
                      src={student.gender === 'girl' ? "/images/girl.png" : "/images/boy.png"} 
                      alt={student.gender || 'student'} 
                      width={140} 
                      height={140} 
                      className={`object-contain drop-shadow-md relative z-10 p-2 transition-transform ${selectedStudent?.id === student.id ? 'scale-110' : 'group-hover:scale-105'}`} 
                    />
                  </div>
                </div>
                
                {/* 이름 및 관찰 현황 (항상 노출) */}
                <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
                  <div className={`name-tag-heart w-full max-w-[130px] h-[34px] rounded-xl flex items-center justify-center font-title shadow-sm transition-all duration-300 text-sm border-2 relative ${
                    selectedStudent?.id === student.id ? 'bg-brand-green text-white border-brand-green scale-105 shadow-md' : 'bg-white text-brand-text border-brand-green group-hover:bg-brand-green group-hover:text-white'
                  }`}>
                    {student.student_name} 식집사
                  </div>
                  
                  <div className="flex gap-3 font-body text-xs text-gray-500 bg-white/40 px-3 py-1 rounded-full border border-gray-200/50">
                    <div>식물: <span className="font-bold text-brand-green">{student.plant_count}</span></div>
                    <div className="w-[1px] h-3 bg-gray-300 mt-0.5"></div>
                    <div>기록: <span className="font-bold text-brand-brown">{student.record_count}</span></div>
                  </div>
                </div>
              </div>
            ))}

            {students.length === 0 && (
              <div className="col-span-full py-20 text-center font-title text-2xl text-gray-400 bg-white/50 rounded-3xl border-2 border-dashed border-gray-300 shadow-inner mt-10">
                아직 입장한 학생이 없습니다.<br/>좌측에서 <b>학생 직접 추가</b>를 통해 학생을 등록해보세요!
              </div>
            )}
          </div>
        </div>
      </div>

      </div>
    </div>

    {/* Observation Report Modal */}
    {isReportOpen && selectedStudent && selectedPlant && (
      <ReportModal 
        mode="teacher"
        plant={selectedPlant}
        records={selectedRecords}
        studentName={selectedStudent.student_name}
        studentGender={selectedStudent.gender || "boy"}
        className={className}
        allPlants={studentPlants}
        onPlantChange={handlePlantChange}
        onClose={() => setIsReportOpen(false)}
        onSaveFeedback={handleSaveFeedback}
      />
    )}

    {/* Garden Gallery Modal */}
    {isGardenOpen && (
      <GardenModal 
        className={className}
        classId={classId}
        mode="teacher"
        onClose={() => setIsGardenOpen(false)}
      />
    )}

    {/* 개인정보 처리방침 모달 */}
    {isPrivacyOpen && (
      <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
        onClick={() => setIsPrivacyOpen(false)}
      >
        <div 
          className="bg-[#fdfbf7] p-6 md:p-8 rounded-[35px] shadow-2xl animate-in zoom-in-95 duration-200 max-w-[850px] md:max-w-[900px] w-full max-h-[85vh] flex flex-col border-[6px] border-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center mb-6 shrink-0 pb-3 border-b-2 border-brand-green/10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <h3 className="font-title text-2xl text-brand-brown">개인정보 처리방침</h3>
            </div>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 font-body text-gray-700 leading-relaxed text-sm md:text-base text-left">
            
            <div className="bg-brand-green/5 p-4 rounded-2xl border border-brand-green/10 text-brand-green font-bold text-xs md:text-sm">
              💡 '우리 반 식집사'는 아동과 교사의 소중한 개인정보를 안전하게 보호하며, 수집된 모든 정보는 Supabase 암호화 보안 데이터베이스에 안전하게 보관됩니다.
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제1조 (개인정보의 처리 목적, 항목, 보유 및 이용 기간)</h4>
              <p className="mb-3">본 서비스는 필요 최소한의 범위 내에서 개인정보를 처리하며, 목적 외의 용도로는 절대 사용되지 않습니다.</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs md:text-sm border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                      <th className="p-3 border-r border-gray-200 whitespace-nowrap text-center w-[10%] min-w-[60px]">구분</th>
                      <th className="p-3 border-r border-gray-200 text-center w-[30%]">처리 목적</th>
                      <th className="p-3 border-r border-gray-200 text-center w-[30%]">수집 항목</th>
                      <th className="p-3 text-center w-[30%]">보유 및 이용 기간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-600">
                    <tr>
                      <td className="p-3 border-r border-gray-200 font-bold text-center whitespace-nowrap bg-gray-50/40">교사</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-white break-keep leading-relaxed">학급 생성, 학생 관리, 도장 피드백</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-white break-keep leading-relaxed">이메일 주소, 비밀번호, 학급 이름</td>
                      <td className="p-3 text-left bg-white break-keep leading-relaxed">회원 탈퇴 또는 학급 폐쇄 시까지</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="p-3 border-r border-gray-200 font-bold text-center whitespace-nowrap bg-gray-50/40">학생</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-gray-50/50 break-keep leading-relaxed">대시보드 로그인, 관찰기록 연동</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-gray-50/50 break-keep leading-relaxed">학생 이름, 성별 (일러스트 구분용)</td>
                      <td className="p-3 text-left bg-gray-50/50 break-keep leading-relaxed">학년도 종료 또는 학급 폐쇄 시 즉시 파기</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-gray-200 font-bold text-center whitespace-nowrap bg-gray-50/40">활동</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-white break-keep leading-relaxed">일지 기록, 성장 곡선 시각화</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-white break-keep leading-relaxed">식물 정보, 관찰 일지 텍스트, 성장 수치, 관찰 사진</td>
                      <td className="p-3 text-left bg-white break-keep leading-relaxed">학년도 종료 또는 학급 폐쇄 시 즉시 파기</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="p-3 border-r border-gray-200 font-bold text-center whitespace-nowrap bg-gray-50/40">위치</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-gray-50/50 break-keep leading-relaxed">날씨 정보 연동 (식물 관리 환경 제공)</td>
                      <td className="p-3 border-r border-gray-200 text-left bg-gray-50/50 break-keep leading-relaxed">기기의 현재 위치 정보 (위도·경도, 서버에 저장되지 않음)</td>
                      <td className="p-3 text-left bg-gray-50/50 break-keep leading-relaxed">날씨 조회 후 즉시 파기 (저장 없음)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제2조 (개인정보의 제3자 제공 및 처리 위탁에 관한 사항)</h4>
              <p>① 본 서비스는 정보주체의 개인정보를 제3자에게 임의 제공하지 않으며, 학급의 독립된 교육 환경에서만 관리됩니다.</p>
              <p>② 본 서비스는 원활한 개인정보 처리를 위하여 외부 업체에 업무를 위탁하고 있지 않습니다.</p>
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제3조 (만 14세 미만 아동의 개인정보 처리에 관한 사항)</h4>
              <p>① 본 서비스는 만 14세 미만 아동이 안전하게 이용할 수 있도록 교사가 학급 코드를 발급해 아동을 등록하는 일괄 등록 방식을 채택하고 있습니다.</p>
              <p>② 교사는 아동 등록 및 개인정보 처리를 수행하기 전, 법정대리인(보호자)의 이용약관 및 개인정보 수집·이용 위임 절차를 반드시 확보해야 합니다.</p>
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제4조 (개인정보의 파기 절차 및 방법)</h4>
              <p>① 목적 달성(학년도 종료, 교사의 학급 데이터 폐쇄 등) 시 수집된 개인정보는 지체 없이 완전히 삭제됩니다.</p>
              <p>② 데이터베이스 내 모든 데이터는 복구 불가능한 기술적 방법으로 영구 파기 처리됩니다.</p>
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제5조 (정보주체와 법정대리인의 권리·의무 및 그 행사방법)</h4>
              <p>① 아동 및 법정대리인은 언제든지 아동의 개인정보 및 관찰 일지 데이터의 열람, 정정, 개별 삭제 및 처리 정지를 요구할 수 있습니다.</p>
              <p>② 이 권리 행사는 서비스 내 개별 일지 삭제 버튼을 이용하시거나 담임교사를 통해 즉각 처리하실 수 있습니다.</p>
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제6조 (개인정보의 안전성 확보 조치)</h4>
              <p>① 클라우드 데이터 보안: 글로벌 보안 인증 규격을 갖춘 Supabase 데이터베이스의 암호화 저장 기법을 적용해 외부 침입 위험을 차단합니다.</p>
              <p>② 전송 데이터 암호화: 전 구간 SSL/HTTPS 보안 프로토콜을 탑재하여 통신 중 정보 가로채기를 철저히 차단합니다.</p>
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제7조 (개인정보 보호책임자 및 담당자)</h4>
              <p>① 개인정보 보호책임: 본 서비스의 개인정보 처리에 관한 모든 문의사항, 의견 수렴 및 불만 처리는 해당 학급 담임교사에게 연락하여 안내받으실 수 있습니다.</p>
            </div>

            <div>
              <h4 className="font-title text-lg text-brand-green mb-2">제8조 (위치정보의 처리)</h4>
              <p>① 본 서비스는 학생 대시보드에서 식물 관리에 도움이 되는 날씨 정보를 제공하기 위해 기기의 현재 위치 정보(위도·경도)를 일시적으로 수집합니다.</p>
              <p>② 수집된 위치 정보는 날씨 API 조회 목적으로만 사용되며, 서버 또는 데이터베이스에 저장되지 않고 조회 즉시 파기됩니다.</p>
              <p>③ 위치 정보 수집은 브라우저의 위치 정보 제공 동의(사용자 허용) 시에만 이루어지며, 거부 시 날씨 기능은 제공되지 않으나 나머지 서비스 이용에는 영향이 없습니다.</p>
            </div>

            {/* PDF 동의서 다운로드 카드 */}
            <div className="pt-4 border-t border-brand-green/10">
              <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <p className="font-title text-base text-orange-700 mb-1 flex items-center gap-1.5">
                    <span>📄</span> 학생 회원 가입을 위한 보호자용 동의서
                  </p>
                  <p className="text-xs text-gray-500 font-body leading-relaxed">교사의 일괄 등록 대행 및 학생 회원 가입을 위한 보호자 동의서 양식입니다.</p>
                </div>
                <a 
                  href="/files/교사 등록을 통한 우리 반 식집사 학생 회원 가입 동의서.pdf" 
                  download="교사 등록을 통한 우리 반 식집사 학생 회원 가입 동의서.pdf"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-title px-4 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  다운로드 📥
                </a>
              </div>
            </div>

          </div>

          {/* Footer Buttons */}
          <div className="mt-5 shrink-0 flex justify-center pt-3 border-t border-brand-green/10">
            <button 
              onClick={() => setIsPrivacyOpen(false)}
              className="bg-brand-green text-white px-5 py-1.5 md:px-6 md:py-2 rounded-full text-sm md:text-base font-title hover:bg-[#5e741e] transition-colors shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Class Close 2-step Confirm Modal */}
    {isCloseModalOpen && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setIsCloseModalOpen(false)}>
        <div className="bg-white p-8 rounded-[30px] shadow-2xl animate-in zoom-in-95 duration-200 max-w-[450px] w-full" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-title text-2xl text-center text-red-600 mb-4 flex items-center justify-center gap-2">
            ⚠️ 학급 폐쇄 및 데이터 삭제
          </h2>
          <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 font-body text-sm text-gray-600 leading-relaxed">
            <p className="font-bold text-red-600 text-center mb-3 text-base">⚠️ 정말로 학급을 폐쇄하시겠습니까?</p>
            <p className="mb-2 text-left">학급을 폐쇄하면 다음과 같은 정보가 <b>영구 삭제되며 즉시 소실</b>됩니다.</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-red-800 mb-4 text-left">
              <li>우리 반 모든 학생 정보 및 계정</li>
              <li>등록된 모든 반려식물 정보</li>
              <li>학생들이 정성들여 쓴 모든 관찰일지 및 업로드된 사진</li>
            </ul>
            <p className="text-center font-semibold border-t pt-3 border-red-100">
              안전한 확인을 위해 아래 입력창에<br/>
              현재 학급명 <b className="text-red-600 font-title text-base font-normal">[{className}]</b>을 똑같이 입력해주세요.
            </p>
          </div>

          <div className="mt-5">
            <input 
              type="text" 
              value={closeConfirmInput}
              onChange={(e) => setCloseConfirmInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none font-title text-center text-lg focus:border-red-500 transition-all text-red-600"
              placeholder={className}
              disabled={isClosing}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setIsCloseModalOpen(false)}
              className="flex-1 bg-gray-200 text-gray-500 py-3.5 rounded-xl text-lg font-title hover:bg-gray-300 transition-colors"
              disabled={isClosing}
            >
              취소
            </button>
            <button 
              onClick={handleCloseClass}
              disabled={closeConfirmInput !== className || isClosing}
              className="flex-2 bg-red-600 text-white py-3.5 rounded-xl text-lg font-title hover:bg-red-700 transition-colors shadow-lg active:scale-95 disabled:opacity-30 disabled:scale-100"
            >
              {isClosing ? "폐쇄 처리 중..." : "학급 폐쇄 확정 ⚠️"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
