"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<"student" | "teacher" | null>(null);

  const [className, setClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !studentName || !classCode) {
      alert("학급 이름, 학생 이름, 학급 코드를 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("class_name", className)
        .eq("class_code", classCode)
        .maybeSingle();

      if (classError) {
        alert("학급 조회 중 오류가 발생했습니다: " + classError.message);
        setLoading(false);
        return;
      }

      if (!classData) {
        alert("일치하는 학급이 없습니다.");
        setLoading(false);
        return;
      }

      let { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classData.id)
        .eq("student_name", studentName)
        .maybeSingle();

      if (studentError) {
        alert("학생 조회 중 오류가 발생했습니다: " + studentError.message);
        setLoading(false);
        return;
      }

      if (!studentData) {
        const { data: newStudent, error: insertError } = await supabase
          .from("students")
          .insert({ class_id: classData.id, student_name: studentName })
          .select().single();
          
        if (insertError) {
          alert("새 학생 등록 중 오류가 발생했습니다: " + insertError.message);
          setLoading(false);
          return;
        }
        studentData = newStudent;
      }

      localStorage.setItem("userRole", "student");
      localStorage.setItem("classId", classData.id);
      localStorage.setItem("className", className);
      localStorage.setItem("studentId", studentData!.id);
      localStorage.setItem("studentName", studentName);
      
      const { data: stData } = await supabase.from("students").select("gender").eq("id", studentData!.id).single();
      if (stData?.gender) localStorage.setItem("studentGender", stData.gender);
      
      router.push("/student");
    } catch (e: any) { 
      console.error(e);
      alert("로그인 처리 중 오류가 발생했습니다."); 
    }
    setLoading(false);
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !password || !classCode) {
      alert("모든 정보를 입력해주세요.");
      return;
    }

    // 비밀번호 유효성 검사 (영문+숫자 6자리)
    const pwRegex = /^[a-zA-Z0-9]{6}$/;
    if (!pwRegex.test(password)) {
      alert("비밀번호는 영문과 숫자를 조합한 6자리여야 합니다.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .eq("class_name", className)
        .eq("teacher_password", password)
        .eq("class_code", classCode)
        .maybeSingle();

      if (error) {
        console.error("Supabase Error:", error);
        alert("로그인 중 문제가 발생했습니다: " + error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        alert("학급 이름, 비밀번호 또는 코드가 일치하지 않습니다.");
        setLoading(false);
        return;
      }
      
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("classId", data.id);
      localStorage.setItem("className", className);
      router.push("/teacher");
    } catch (e: any) { 
      console.error("System Error:", e);
      alert("시스템 오류가 발생했습니다."); 
    }
    setLoading(false);
  };

  const handleCreateClass = async () => {
    if (!className || !password || !classCode) {
      alert("모든 정보를 입력해주세요.");
      return;
    }

    // 비밀번호 유효성 검사
    const pwRegex = /^[a-zA-Z0-9]{6}$/;
    if (!pwRegex.test(password)) {
      alert("비밀번호는 영문과 숫자를 조합한 6자리여야 합니다.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .insert({ class_name: className, teacher_password: password, class_code: classCode })
        .select().single();
        
      if (error) { 
        console.error("Create Class Error:", error);
        alert("학급 개설 중 오류가 발생했습니다: " + error.message); 
        setLoading(false); 
        return; 
      }
      
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("classId", data.id);
      localStorage.setItem("className", className);
      router.push("/teacher");
    } catch (e: any) { 
      console.error(e);
      alert("시스템 오류가 발생했습니다."); 
    }
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen w-full overflow-hidden relative font-body flex items-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/bg-login-v2.png')" }}
    >
      {/* --- 배경 장식 레이어 (제거됨 - 배경 이미지에 포함됨) --- */}


      <div className="container mx-auto px-4 h-full flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-4 relative z-10 py-4">
        
        {/* --- 좌측: 브랜드 아이덴티티 --- */}
        <div className="flex flex-col items-center space-y-4 w-full lg:w-[45%] lg:max-w-[500px]">

          
          <div className="text-center space-y-4">
            <div className="relative animate-float-slow translate-x-12">
              <Image 
                src="/images/title3.png" 
                alt="우리 반 식집사" 
                width={500} 
                height={250} 
                className="object-contain" 
                priority
              />
            </div>
            <p className="font-title text-2xl md:text-3xl text-[#2D4D1E] tracking-wide font-black drop-shadow-sm">
              학급 식물 관찰 기록 시스템
            </p>
          </div>
        </div>

        {/* --- 우측: 로그인 영역 --- */}
        <div className="flex flex-col items-center justify-center space-y-4 w-full lg:w-[45%] lg:max-w-[500px]">
          <div className="flex gap-6 md:gap-8">
            {[
              { id: 'student', label: '학생', icon: '/images/student-icon.png' },
              { id: 'teacher', label: '선생님', icon: '/images/teacher-icon.png' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setLoginMode(mode.id as any)}
                className={`group flex flex-col items-center space-y-1 transition-all duration-300 ${
                  loginMode === mode.id ? 'scale-105' : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                <div className={`relative p-2 rounded-full bg-white/50 shadow-inner transition-all ${
                  loginMode === mode.id ? 'ring-2 ring-[#77C66E] shadow-md bg-white' : ''
                }`}>
                  <Image src={mode.icon} alt={mode.label} width={80} height={80} className="object-contain" />
                </div>
                <span className="font-title text-lg text-[#5C7C31]">{mode.label}</span>
              </button>
            ))}
          </div>

          <div className="w-full max-w-[400px] min-h-[250px] flex items-start justify-center px-4">
            {!loginMode ? (
              <div className="mt-4 text-center animate-bounce">
                <p className="font-title text-lg text-[#b77a1e] bg-white/80 px-6 py-2 rounded-full shadow-sm border border-orange-100">
                  👆 위 로그인 방법을 선택해주세요!
                </p>
              </div>
            ) : (
              <div className="w-full bg-white/95 backdrop-blur-sm rounded-[1.5rem] p-6 shadow-xl border border-white/50 animate-in fade-in zoom-in duration-300">
                <form 
                  onSubmit={loginMode === 'student' ? handleStudentLogin : handleTeacherLogin}
                  className="flex flex-col gap-3"
                >
                  <div className="space-y-2">
                    <InputGroup label="학급 이름" value={className} onChange={setClassName} placeholder="예: 3학년 2반" disabled={loading} />
                    {loginMode === 'student' ? (
                      <InputGroup label="학생 이름" value={studentName} onChange={setStudentName} placeholder="홍길동" disabled={loading} />
                    ) : (
                      <InputGroup label="비밀번호" value={password} onChange={setPassword} placeholder="영문+숫자 6자리" type="password" disabled={loading} maxLength={6} />
                    )}
                    <InputGroup label="학급 코드" value={classCode} onChange={setClassCode} placeholder="숫자 6자리" type={loginMode === 'student' ? 'password' : 'text'} disabled={loading} maxLength={6} />
                  </div>

                  <div className="flex gap-2 mt-2">
                    {loginMode === 'teacher' && (
                      <button 
                        type="button" 
                        onClick={handleCreateClass}
                        disabled={loading}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-title text-lg py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        학급 개설
                      </button>
                    )}
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="flex-1 bg-[#738b27] hover:bg-[#5f7320] text-white font-title text-lg py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? "통신 중..." : "입장하기"}
                    </button>
                  </div>

                  {loginMode === 'teacher' && (
                    <p className="text-center text-xs text-red-500 font-bold">
                      🚨 학급 이름, 비번, 코드를 꼭 기억하세요!
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder, type = "text", disabled = false, maxLength }: any) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="font-title text-base text-[#5C7C31] ml-4">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className="w-full bg-[#f3f4f0] border-2 border-transparent focus:border-[#77C66E] focus:bg-white outline-none rounded-xl px-5 py-2.5 font-body text-base transition-all"
      />
    </div>
  );
}
