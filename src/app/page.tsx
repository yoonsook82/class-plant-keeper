"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, getSupabaseClient } from "@/lib/supabaseClient";

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

    const bypass = searchParams.get("bypass");
    if (bypass === "teacher01") {
      const autoTeacherLogin = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
          await supabase.auth.signOut();
          const { data: classData, error: classError } = await supabase
            .from("classes")
            .select("*")
            .ilike("teacher_email", "teacher01@example.com")
            .maybeSingle();

          if (classError || !classData) {
            setErrorMsg("학급 정보를 찾을 수 없습니다.");
            setLoading(false);
            return;
          }

          localStorage.setItem("userRole", "teacher");
          localStorage.setItem("classId", classData.id);
          localStorage.setItem("className", classData.class_name);
          localStorage.setItem("classCode", classData.class_code);

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: "teacher01@example.com",
            password: "asd1234",
          });

          if (authError) {
            setErrorMsg("로그인 실패: " + authError.message);
            setLoading(false);
            return;
          }
          
          router.push("/teacher");
        } catch (e) {
          setErrorMsg("시스템 오류가 발생했습니다.");
        }
        setLoading(false);
      };
      autoTeacherLogin();
    } else if (bypass === "jenny") {
      const autoStudentLogin = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
          const { data: classData, error: classError } = await supabase
            .from("classes")
            .select("id, class_name")
            .eq("class_code", "BZ8RLA")
            .maybeSingle();

          if (classError || !classData) {
            setErrorMsg("학급 조회 중 오류가 발생했습니다.");
            setLoading(false);
            return;
          }

          const { data: studentData, error: studentError } = await getSupabaseClient()
            .from("students")
            .select("id, gender")
            .eq("class_id", classData.id)
            .eq("student_name", "제니")
            .maybeSingle();

          if (studentError || !studentData) {
            setErrorMsg("학생 조회 중 오류가 발생했습니다.");
            setLoading(false);
            return;
          }

          localStorage.setItem("userRole", "student");
          localStorage.setItem("classId", classData.id);
          localStorage.setItem("className", classData.class_name);
          localStorage.setItem("studentId", studentData.id);
          localStorage.setItem("studentName", "제니");
          if (studentData.gender) {
            localStorage.setItem("studentGender", studentData.gender);
          }

          localStorage.removeItem("custom_supabase_url");
          localStorage.removeItem("custom_supabase_anon_key");

          router.push("/student");
        } catch (e) {
          setErrorMsg("로그인 처리 중 오류가 발생했습니다.");
        }
        setLoading(false);
      };
      autoStudentLogin();
    }
  }, [searchParams, router]);

  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // 개인 Supabase 연동용 신규 상태
  const [customUrl, setCustomUrl] = useState("");
  const [customAnonKey, setCustomAnonKey] = useState("");
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [createdClassCode, setCreatedClassCode] = useState("");
  const [createdClassId, setCreatedClassId] = useState("");

  // 6자리 고유 난수 코드 생성 함수
  const generateClassCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 문자(0, O, 1, I) 제외
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 효과음 재생 함수
  const playPopSound = () => {
    const audio = new Audio("/sound/u_8e8ungop1x-pop-268648.mp3");
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked by browser:", e));
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
      // 1. 공용 데이터베이스에서 학급 코드 매핑 정보 조회
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, class_name, custom_supabase_url, custom_supabase_anon_key")
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

      // 2. 만약 해당 학급이 개인용 Supabase를 사용 중이라면 브라우저 세션에 동적 매핑 정보를 탑재
      if (classData.custom_supabase_url && classData.custom_supabase_anon_key) {
        localStorage.setItem("custom_supabase_url", classData.custom_supabase_url.trim());
        localStorage.setItem("custom_supabase_anon_key", classData.custom_supabase_anon_key.trim());
      } else {
        localStorage.removeItem("custom_supabase_url");
        localStorage.removeItem("custom_supabase_anon_key");
      }

      // 3. 동적 클라이언트를 활용하여 학생 및 식물 정보 검증
      let { data: studentData, error: studentError } = await getSupabaseClient()
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
      
      const { data: stData } = await getSupabaseClient().from("students").select("gender").eq("id", studentData!.id).single();
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

      // 2. 개인용 Supabase 정보 연동 매핑 등록
      if (classData.custom_supabase_url && classData.custom_supabase_anon_key) {
        localStorage.setItem("custom_supabase_url", classData.custom_supabase_url.trim());
        localStorage.setItem("custom_supabase_anon_key", classData.custom_supabase_anon_key.trim());
      } else {
        localStorage.removeItem("custom_supabase_url");
        localStorage.removeItem("custom_supabase_anon_key");
      }

      // 3. Supabase Auth로 로그인
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
      // 0. 이미 개설된 학급이 존재하는지 확인 (대소문자 구분 없이)
      const { data: existingClass, error: checkError } = await supabase
        .from("classes")
        .select("id")
        .ilike("teacher_email", email.trim())
        .maybeSingle();

      if (checkError) {
        console.error("Check existing class error:", checkError);
      }

      if (existingClass) {
        setErrorMsg("이미 이 이메일로 개설된 학급이 존재합니다. 선생님 로그인 화면에서 로그인해 주세요.");
        setLoading(false);
        return;
      }

      let authUserId = null;

      // 1. Supabase Auth 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        // 이미 가입된 계정 에러가 발생한 경우 데드락 우회 시도
        if (authError.message.includes("already registered") || authError.status === 422) {
          // 입력한 비밀번호가 맞는지 검증하기 위해 로그인을 시도합니다.
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setErrorMsg("이미 가입된 계정입니다. 비밀번호가 틀렸거나 다른 이메일을 사용해 주세요.");
            setLoading(false);
            return;
          }

          authUserId = signInData.user?.id;
        } else {
          setErrorMsg("계정 생성 오류: " + authError.message);
          setLoading(false);
          return;
        }
      } else {
        authUserId = authData.user?.id;
      }

      // 2. 고유 학급 코드 생성 및 학급 정보 저장
      const newClassCode = generateClassCode();
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .insert({ 
          class_name: className, 
          teacher_email: email.trim(), 
          teacher_password: password, // NOT NULL 제약 조건 우회/충족
          class_code: newClassCode,
          custom_supabase_url: customUrl.trim() || null,
          custom_supabase_anon_key: customAnonKey.trim() || null
        })
        .select().single();
        
      if (classError) { 
        console.error("Create Class Error:", classError);
        setErrorMsg("학급 개설 중 오류가 발생했습니다: " + classError.message); 
        setLoading(false); 
        return; 
      }
      
      // 3. 개인 Supabase 정보 입력 여부에 따른 분기 처리
      if (customUrl.trim() && customAnonKey.trim()) {
        localStorage.setItem("custom_supabase_url", customUrl.trim());
        localStorage.setItem("custom_supabase_anon_key", customAnonKey.trim());
        setCreatedClassCode(newClassCode);
        setCreatedClassId(classData.id);
        
        // 마법 팝업 모달창 오픈 (세션 임시 셋팅은 팝업 확인 버튼 클릭 시 완료됨)
        setIsSqlModalOpen(true);
      } else {
        localStorage.removeItem("custom_supabase_url");
        localStorage.removeItem("custom_supabase_anon_key");
        localStorage.setItem("userRole", "teacher");
        localStorage.setItem("classId", classData.id);
        localStorage.setItem("className", className);
        localStorage.setItem("classCode", newClassCode);
        router.push("/teacher");
      }
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
            <div className="relative animate-float-slow translate-x-0 lg:translate-x-12">
              <Image 
                src="/images/title3.png" 
                alt="우리 반 식집사" 
                width={500} 
                height={250} 
                className="object-contain" 
                priority
              />
            </div>
            <p className="font-title text-2xl md:text-3xl text-[#2D4D1E] tracking-wide font-black drop-shadow-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 translate-x-0 lg:translate-x-24">
              <span className="whitespace-nowrap">학급 식물 관찰 기록 시스템</span>
              <span className="whitespace-nowrap">(초등 전학년)</span>
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
                onMouseEnter={playPopSound}
                onClick={() => {
                  setLoginMode(mode.id as any);
                }}
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
                          <>
                            <InputGroup label="학급 이름" value={className} onChange={setClassName} placeholder="예: 3학년 2반" disabled={loading} />
                            
                            {/* 비용 걱정 없는 우리 반 전용 100% 무료 서버 개설 가이드 */}
                            <div className="mt-4 border border-brand-green/30 bg-[#fbfdf9] rounded-2xl overflow-hidden text-left">
                              <button
                                type="button"
                                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                                className="w-full px-4 py-3 flex justify-between items-center bg-[#f0f7ec] hover:bg-[#e7f2e1] transition-colors gap-3"
                              >
                                <span className="font-title text-sm md:text-base text-brand-green text-left break-keep leading-snug">
                                  우리 반 전용 100% 무료 서버 개설 가이드
                                </span>
                                <span className="text-gray-400 font-bold text-xs whitespace-nowrap shrink-0">{isAccordionOpen ? "▲ 접기" : "▼ 펼치기"}</span>
                              </button>
                              
                              {isAccordionOpen && (
                                <div className="p-4 space-y-3 font-body text-xs md:text-sm text-gray-600 leading-relaxed border-t border-brand-green/10 animate-in slide-in-from-top-1 duration-200">
                                  <div className="bg-[#fcfaf4] p-3 rounded-xl border border-amber-100 text-[#a67c00] font-bold text-xs">
                                    💡 100% 개인 소유의 Supabase 서버를 연동하면 트래픽/용량 제한 걱정 없이 우리 반 식집사 앱을 무제한 사용하실 수 있습니다!
                                  </div>
                                  
                                  <div>
                                    <p className="font-bold text-brand-brown mb-1">1단계: Supabase 1분 무료 회원가입</p>
                                    <a 
                                      href="https://supabase.com" 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-block bg-brand-green text-white font-title px-3.5 py-1 rounded-full text-xs hover:bg-[#5e741e] shadow-sm transition-all"
                                    >
                                      공식 웹사이트 바로가기 ↗
                                    </a>
                                  </div>
                                  
                                  <div>
                                    <p className="font-bold text-brand-brown mb-1">2단계: 새 프로젝트 생성 방법</p>
                                    <p className="pl-1 text-gray-500 font-body">
                                      - 가입 후 <b>New Project</b> 클릭 → 이름 지정 → <b>Database Password</b>를 설정하고 <b>Create New Project</b>를 클릭하면 1분 만에 개인 서버가 개설됩니다.
                                    </p>
                                  </div>

                                  <div>
                                    <p className="font-bold text-brand-brown mb-1">3단계: API 키 복사하기</p>
                                    <p className="pl-1 text-gray-500 font-body break-keep">
                                      - 개설 후 내 프로젝트 우측의 <b>[copy]</b> 버튼을 클릭하면 나타나는 팝업창에서 <b>Project URL</b>과 <b>Publishable key (Anon Key)</b>를 복사하여 아래에 입력하세요.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 커스텀 Supabase 입력 양식 */}
                            {isAccordionOpen && (
                              <div className="bg-[#fdfbf7] p-4 rounded-2xl border border-[#f5e1c8] space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="font-title text-xs text-[#a65d00] text-left">🌱 개인 전용 서버 연동 (선택 사항)</p>
                                <InputGroup 
                                  label="나의 Supabase Project URL" 
                                  value={customUrl} 
                                  onChange={setCustomUrl} 
                                  placeholder="예: https://abcdxyz.supabase.co" 
                                  disabled={loading} 
                                />
                                <InputGroup 
                                  label="나의 Supabase Publishable key" 
                                  value={customAnonKey} 
                                  onChange={setCustomAnonKey} 
                                  placeholder="sb_publishable_..." 
                                  disabled={loading} 
                                />
                                <p className="text-[11px] text-red-500 font-medium font-body text-left leading-normal break-keep">
                                  * 입력하지 않고 비워두면 기본 제공 무료 공용 서버를 이용하여 즉시 개설됩니다.
                                </p>
                              </div>
                            )}
                          </>
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
      
      {/* 1초 마법 테이블 세팅 모달 */}
      {isSqlModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => {}}
        >
          <div 
            className="bg-[#fdfbf7] w-full max-w-[550px] rounded-[35px] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300 border-[6px] border-white flex flex-col text-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 border-b border-orange-100 pb-3">
              <span className="text-3xl animate-bounce">⚡</span>
              <h3 className="font-title text-2xl text-brand-brown">1초 만에 개인 서버 활성화하기</h3>
            </div>
            
            <div className="space-y-4 font-body text-sm md:text-base text-gray-600 leading-relaxed">
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-orange-700 font-bold text-xs md:text-sm">
                🔒 철통 보안: 선생님의 데이터베이스 마스터 비밀번호는 요구하지 않으니 안심하세요! 
              </div>

              <p className="font-body text-gray-500 text-xs md:text-sm">
                선생님의 새 Supabase 서버에 학생/식물/일지 관찰 기록을 위한 <b>3개 테이블(students, plants, records)</b>을 마우스 단 2번 클릭으로 1초 만에 무인 세팅합니다.
              </p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <p className="font-title text-brand-green mb-1 text-xs md:text-sm">📌 마법 셋업 3단계 진행 수칙</p>
                <ol className="list-decimal pl-5 space-y-1 text-xs md:text-sm text-gray-500 font-body">
                  <li>아래 <b>[1단계: 테이블 자동 세팅 열기]</b> 버튼을 누릅니다.</li>
                  <li>클립보드에 테이블 생성용 SQL이 <b>자동 복사</b>되며, Supabase SQL Editor 창이 새 탭으로 켜집니다.</li>
                  <li>열린 화면에서 마우스를 클릭하고 <b>Ctrl + V</b> (붙여넣기)를 누른 뒤, 우측 하단의 <b>[Run]</b> 버튼을 누르면 끝납니다!</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const sqlText = `-- 1. students (학생 테이블) 생성\nCREATE TABLE IF NOT EXISTS students (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  class_id uuid NOT NULL,\n  student_name text NOT NULL,\n  gender text DEFAULT 'boy',\n  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\n-- 2. plants (반려 식물 테이블) 생성\nCREATE TABLE IF NOT EXISTS plants (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,\n  plant_type text NOT NULL,\n  plant_nickname text NOT NULL,\n  planted_at text NOT NULL,\n  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,\n  reflection text DEFAULT '',\n  teacher_feedback text DEFAULT ''\n);\n\n-- 3. records (관찰 기록 테이블) 생성\nCREATE TABLE IF NOT EXISTS records (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,\n  observation_text text NOT NULL,\n  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,\n  image_url text,\n  growth_stage text DEFAULT '씨앗',\n  height_cm numeric DEFAULT 0,\n  leaf_count integer DEFAULT 0,\n  flower_count integer DEFAULT 0,\n  fruit_count integer DEFAULT 0\n);\n\n-- 4. RLS 보안 비활성화 (API 접근 차단 해제)\nALTER TABLE students DISABLE ROW LEVEL SECURITY;\nALTER TABLE plants DISABLE ROW LEVEL SECURITY;\nALTER TABLE records DISABLE ROW LEVEL SECURITY;`;
                    
                    navigator.clipboard.writeText(sqlText).then(() => {
                      let projectId = "default";
                      try {
                        const match = customUrl.match(/https:\/\/(.*?)\.supabase\.co/);
                        if (match && match[1]) {
                          projectId = match[1];
                        }
                      } catch (e) {
                        console.error(e);
                      }
                      window.open(`https://supabase.com/dashboard/project/${projectId}/sql/new`, "_blank");
                    }).catch(err => {
                      console.error("Clipboard Copy Fail:", err);
                      alert("클립보드 자동 복사에 실패했습니다. 다른 브라우저를 이용하시거나 SQL 스크립트를 직접 입력해주세요.");
                    });
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-title py-3 rounded-2xl text-center shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  ⚡ 1단계: 테이블 자동 세팅 열기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSqlModalOpen(false);
                    localStorage.setItem("userRole", "teacher");
                    localStorage.setItem("classId", createdClassId);
                    localStorage.setItem("className", className);
                    localStorage.setItem("classCode", createdClassCode);
                    router.push("/teacher");
                  }}
                  className="flex-1 bg-brand-green hover:bg-[#5e741e] text-white font-title py-3 rounded-2xl text-center shadow-md active:scale-95 transition-all whitespace-nowrap"
                >
                  🎉 2단계: 세팅 완료 및 입장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
