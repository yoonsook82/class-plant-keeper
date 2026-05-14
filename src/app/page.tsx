"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginMode, setLoginMode] = useState<"student" | "teacher" | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setClassCode(code.toUpperCase());
      setLoginMode("student");
    }
  }, [searchParams]);

  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // 6자리 고유 난수 코드 생성 함수
  const generateClassCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 문자(0, O, 1, I) 제외
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!studentName || !classCode) {
      setErrorMsg("학생 이름과 학급 코드를 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, class_name")
        .eq("class_code", classCode.toUpperCase())
        .maybeSingle();

      if (classError) {
        setErrorMsg("학급 조회 중 오류가 발생했습니다: " + classError.message);
        setLoading(false);
        return;
      }

      if (!classData) {
        setErrorMsg("일치하는 학급이 없습니다.");
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
        setErrorMsg("학생 조회 중 오류가 발생했습니다: " + studentError.message);
        setLoading(false);
        return;
      }

      if (!studentData) {
        setErrorMsg("등록되지 않은 학생입니다. 선생님이 대시보드에 등록한 정확한 이름을 입력해주세요.");
        setLoading(false);
        return;
      }

      localStorage.setItem("userRole", "student");
      localStorage.setItem("classId", classData.id);
      localStorage.setItem("className", classData.class_name);
      localStorage.setItem("studentId", studentData!.id);
      localStorage.setItem("studentName", studentName);
      
      const { data: stData } = await supabase.from("students").select("gender").eq("id", studentData!.id).single();
      if (stData?.gender) localStorage.setItem("studentGender", stData.gender);
      
      router.push("/student");
    } catch (e: any) { 
      console.error(e);
      setErrorMsg("로그인 처리 중 오류가 발생했습니다."); 
    }
    setLoading(false);
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 혹시 남아있을 수 있는 세션 클리어 (RLS 충족을 위해)
      await supabase.auth.signOut();
      
      console.log("Attempting to find class for email:", trimmedEmail);
      // 1. 해당 교사의 학급 정보 조회 (teacher_email 컬럼 기준)
      // .ilike를 사용하여 대소문자 구분 없이 검색
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("*")
        .ilike("teacher_email", trimmedEmail)
        .maybeSingle();

      if (classError || !classData) {
        console.error("classError:", classError, "classData:", classData);
        setErrorMsg(`학급 정보를 찾을 수 없습니다. (검색 이메일: ${trimmedEmail}, DB오류: ${classError?.message || '데이터 없음'})`);
        setLoading(false);
        return;
      }

      // 2. Supabase Auth로 로그인
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        if (authError.message === "Email not confirmed") {
          setErrorMsg("이메일 인증이 필요하거나 Supabase 설정에서 'Confirm Email'을 꺼야 합니다.");
        } else {
          setErrorMsg("로그인 실패: " + authError.message);
        }
        setLoading(false);
        return;
      }
      
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("classId", classData.id);
      localStorage.setItem("className", classData.class_name);
      localStorage.setItem("classCode", classData.class_code);
      router.push("/teacher");
    } catch (e: any) { 
      console.error("System Error:", e);
      setErrorMsg("시스템 오류가 발생했습니다."); 
    }
    setLoading(false);
  };

  const handleCreateClass = async () => {
    setErrorMsg("");
    if (!email || !password || !className) {
      setErrorMsg("이메일, 비밀번호, 학급 이름을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 1. Supabase Auth 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setErrorMsg("계정 생성 오류: " + authError.message);
        setLoading(false);
        return;
      }

      // 2. 고유 학급 코드 생성 및 학급 정보 저장
      const newClassCode = generateClassCode();
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .insert({ 
          class_name: className, 
          teacher_email: email, 
          teacher_password: password, // NOT NULL 제약 조건 우회/충족
          class_code: newClassCode 
        })
        .select().single();
        
      if (classError) { 
        console.error("Create Class Error:", classError);
        setErrorMsg("학급 개설 중 오류가 발생했습니다: " + classError.message); 
        setLoading(false); 
        return; 
      }
      
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("classId", classData.id);
      localStorage.setItem("className", className);
      localStorage.setItem("classCode", newClassCode);
      router.push("/teacher");
    } catch (e: any) { 
      console.error(e);
      setErrorMsg("시스템 오류가 발생했습니다."); 
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
                    {loginMode === 'teacher' ? (
                      <>
                        <InputGroup label="이메일" value={email} onChange={setEmail} placeholder="teacher@example.com" disabled={loading} />
                        <InputGroup label="비밀번호" value={password} onChange={setPassword} placeholder="비밀번호를 입력하세요" type="password" disabled={loading} />
                        {isCreatingClass && (
                          <InputGroup label="학급 이름" value={className} onChange={setClassName} placeholder="예: 3학년 2반" disabled={loading} />
                        )}
                      </>
                    ) : (
                      <>
                        <InputGroup label="학급 코드" value={classCode} onChange={setClassCode} placeholder="6자리 코드 입력" type="text" disabled={loading} maxLength={6} />
                        <InputGroup label="학생 이름" value={studentName} onChange={setStudentName} placeholder="홍길동" disabled={loading} />
                      </>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-2">
                    {loginMode === 'teacher' ? (
                      <>
                        {!isCreatingClass ? (
                          <>
                            <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full bg-[#738b27] hover:bg-[#5f7320] text-white font-title text-lg py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                            >
                              {loading ? "통신 중..." : "선생님 로그인"}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setIsCreatingClass(true)}
                              disabled={loading}
                              className="w-full bg-transparent border-2 border-amber-500 text-amber-600 hover:bg-amber-50 font-title text-base py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-1"
                            >
                              새로운 학급 개설하기
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              type="button" 
                              onClick={handleCreateClass}
                              disabled={loading}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-title text-lg py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                            >
                              {loading ? "생성 중..." : "학급 개설 완료"}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setIsCreatingClass(false)}
                              disabled={loading}
                              className="w-full bg-transparent text-gray-500 hover:text-gray-700 font-title text-base py-2 transition-all"
                            >
                              취소하고 로그인으로 돌아가기
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-[#738b27] hover:bg-[#5f7320] text-white font-title text-lg py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? "통신 중..." : "학생으로 입장하기"}
                      </button>
                    )}
                  </div>

                  {loginMode === 'teacher' && (
                    <p className="text-center text-xs text-red-500 font-bold mt-2">
                      🚨 교사 이메일과 비밀번호를 기억해주세요!
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
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
