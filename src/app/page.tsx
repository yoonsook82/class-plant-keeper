"use client";

import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<"student" | "teacher" | null>(null);

  // Form states
  const [className, setClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [password, setPassword] = useState("");

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implement actual login
    console.log("Student Login", { className, studentName, classCode });
    if (!className || !studentName || !classCode) {
      alert("학급 이름, 학생 이름, 학급 코드를 모두 입력해주세요.");
      return;
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implement actual login
    console.log("Teacher Login", { className, password, classCode });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 max-w-[1200px] mx-auto">
      <div className="flex w-full items-center justify-between gap-12 flex-col md:flex-row">
        
        {/* Left Illustration Section */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-[300px] h-[200px] bg-[#e5733c] rounded-[10px] mb-8 flex justify-center items-center shadow-[inset_0_-30px_0_rgba(0,0,0,0.1)] border-4 border-[#c85a2b] overflow-hidden">
             {/* If there's an illustration, we can place it here. Using a placeholder for now as per style.css */}
             <Image src="/images/garden.png" alt="정원" width={150} height={150} className="object-contain" />
          </div>
          <h1 className="font-title text-brand-brown text-6xl mb-2 drop-shadow-sm">우리 반 식집사</h1>
          <h2 className="font-title text-brand-green text-3xl">함께 키우는 초록빛 마음</h2>
        </div>

        {/* Right Form Section */}
        <div className="flex-1 max-w-[450px] w-full flex flex-col items-center">
          
          {/* Mode Selection */}
          <div className="flex gap-10 mb-10">
            <div 
              className={`flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110 ${loginMode === 'student' ? 'scale-110 opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => setLoginMode("student")}
            >
              <div className="mb-2 flex justify-center items-center h-[100px]">
                <Image src="/images/student-icon.png" alt="학생" width={80} height={80} className="object-contain" />
              </div>
              <span className="font-bold text-xl">학생 입장</span>
            </div>
            
            <div 
              className={`flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110 ${loginMode === 'teacher' ? 'scale-110 opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => setLoginMode("teacher")}
            >
              <div className="mb-2 flex justify-center items-center h-[100px]">
                <Image src="/images/teacher-icon.png" alt="선생님" width={80} height={80} className="object-contain" />
              </div>
              <span className="font-bold text-xl">선생님 입장</span>
            </div>
          </div>

          {/* Forms */}
          {loginMode === "student" && (
            <form onSubmit={handleStudentLogin} className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center bg-brand-input rounded-full px-6 py-3 shadow-inner">
                <label className="font-title text-2xl w-32 shrink-0">학급 이름</label>
                <input 
                  type="text" 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xl flex-1 placeholder:text-gray-400" 
                  placeholder="예: 씨앗반" 
                />
              </div>
              <div className="flex items-center bg-brand-input rounded-full px-6 py-3 shadow-inner">
                <label className="font-title text-2xl w-32 shrink-0">학생 이름</label>
                <input 
                  type="text" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xl flex-1 placeholder:text-gray-400" 
                  placeholder="홍길동" 
                />
              </div>
              <div className="flex items-center bg-brand-input rounded-full px-6 py-3 shadow-inner">
                <label className="font-title text-2xl w-32 shrink-0">학급 코드</label>
                <input 
                  type="text" 
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xl flex-1 placeholder:text-gray-400 tracking-widest" 
                  placeholder="숫자 6자리" 
                  maxLength={6}
                />
              </div>
              <button type="submit" className="mt-4 bg-brand-green text-white font-title text-3xl py-4 rounded-full hover:bg-[#5e741e] hover:-translate-y-1 transition-all shadow-md active:scale-95">
                입장하기
              </button>
            </form>
          )}

          {loginMode === "teacher" && (
            <form onSubmit={handleTeacherLogin} className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center bg-brand-input rounded-full px-6 py-3 shadow-inner">
                <label className="font-title text-2xl w-32 shrink-0">학급 이름</label>
                <input 
                  type="text" 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xl flex-1 placeholder:text-gray-400" 
                  placeholder="예: 씨앗반" 
                />
              </div>
              <div className="flex items-center bg-brand-input rounded-full px-6 py-3 shadow-inner">
                <label className="font-title text-2xl w-32 shrink-0">비밀번호</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xl flex-1 placeholder:text-gray-400 tracking-widest" 
                  placeholder="영문+숫자 6자리" 
                />
              </div>
              <div className="flex items-center bg-brand-input rounded-full px-6 py-3 shadow-inner">
                <label className="font-title text-2xl w-32 shrink-0">학급 코드</label>
                <input 
                  type="text" 
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xl flex-1 placeholder:text-gray-400 tracking-widest" 
                  placeholder="숫자 6자리" 
                  maxLength={6}
                />
              </div>
              
              <div className="flex items-center gap-2 mt-2 text-sm text-red-500 font-bold justify-center bg-red-50 py-2 rounded-lg border border-red-200">
                <span className="text-xl">🚨</span> 학급 이름, 비밀번호, 코드를 꼭 기억하세요!
              </div>

              <div className="flex gap-4 mt-2">
                <button type="button" className="flex-1 bg-brand-brown text-white font-title text-2xl py-4 rounded-full hover:bg-[#9a6416] hover:-translate-y-1 transition-all shadow-md active:scale-95">
                  학급 개설
                </button>
                <button type="submit" className="flex-1 bg-brand-green text-white font-title text-2xl py-4 rounded-full hover:bg-[#5e741e] hover:-translate-y-1 transition-all shadow-md active:scale-95">
                  학급 입장
                </button>
              </div>
            </form>
          )}

          {!loginMode && (
            <div className="text-center text-gray-400 mt-10 font-title text-2xl animate-pulse">
              입장할 역할을 선택해주세요
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
