"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/lib/supabaseClient";
import ReportModal, { Plant, Record } from "@/components/ReportModal";
import GardenModal from "@/components/GardenModal";

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
  
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
    const role = localStorage.getItem("userRole");
    const storedClassId = localStorage.getItem("classId");
    const storedClassName = localStorage.getItem("className");

    if (role !== "teacher" || !storedClassId) {
      alert("선생님 로그인이 필요합니다.");
      router.push("/");
      return;
    }

    setClassId(storedClassId);
    setClassName(storedClassName || "");
    fetchClassInfo(storedClassId);
    fetchStudents(storedClassId);
  }, []);

  const fetchClassInfo = async (cId: string) => {
    const { data } = await supabase.from("classes").select("class_code").eq("id", cId).single();
    if (data) setClassCode(data.class_code);
  };

  const fetchStudents = async (cId: string) => {
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_name, created_at, gender")
      .eq("class_id", cId)
      .order("created_at", { ascending: true });

    if (!studentsData) return;

    const stats: StudentStat[] = await Promise.all(
      studentsData.map(async (st) => {
        const { count: pCount } = await supabase.from("plants").select("id", { count: "exact" }).eq("student_id", st.id);
        
        const { data: pData } = await supabase.from("plants").select("id").eq("student_id", st.id);
        const pIds = pData?.map(p => p.id) || [];
        
        let rCount = 0;
        if (pIds.length > 0) {
           const { count } = await supabase.from("records").select("id", { count: "exact" }).in("plant_id", pIds);
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
    const { data: plants } = await supabase
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
    const { data: records } = await supabase
      .from("records")
      .select("*")
      .eq("plant_id", plant.id)
      .order("created_at", { ascending: true });

    setSelectedRecords(records || []);
  };

  const handleSaveFeedback = async (plantId: string, feedback: string, stamp: string | null) => {
    const { error } = await supabase
      .from("plants")
      .update({ 
        teacher_feedback: feedback,
        teacher_stamp: stamp
      })
      .eq("id", plantId);

    if (error) {
      alert("피드백 저장 중 오류가 발생했습니다.");
      console.error(error);
    } else {
      // Refresh local state
      if (selectedPlant && selectedPlant.id === plantId) {
        setSelectedPlant({ ...selectedPlant, teacher_feedback: feedback, teacher_stamp: stamp || undefined });
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
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
    const { error } = await supabase
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
      const { data: plants } = await supabase.from("plants").select("id").eq("student_id", studentId);
      const plantIds = plants?.map(p => p.id) || [];

      // 2. 기록 삭제
      if (plantIds.length > 0) {
        await supabase.from("records").delete().in("plant_id", plantIds);
      }

      // 3. 식물 삭제
      await supabase.from("plants").delete().eq("student_id", studentId);

      // 4. 학생 삭제
      const { error } = await supabase.from("students").delete().eq("id", studentId);

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
              {appUrl && <QRCodeCanvas value={`${appUrl}`} size={260} fgColor="#333333" />}
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
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-center md:justify-start">
          <Image src="/images/teacher-icon.png" alt="선생님 아이콘" width={50} height={50} className="md:w-[70px] md:h-[70px] object-contain drop-shadow-md" />
          <h1 className="font-title text-2xl md:text-4xl text-brand-brown drop-shadow-sm pt-2">
            {className} 정원 통합 관리실
          </h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
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
              {appUrl && <QRCodeCanvas value={`${appUrl}`} size={180} fgColor="#333333" />}
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
          
          <div className="bg-[#f4e8d3] p-6 rounded-3xl shadow-md border-2 border-[#5a4a42]">
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
        </div>

        {/* Right Side: Student Grid */}
        <div className="flex-1">
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
  </>
  );
}
