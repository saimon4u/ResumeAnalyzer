import React, { useState, useEffect } from 'react';
import { FileText, Search, Cpu, CheckCircle } from 'lucide-react';

interface ScanningLoaderProps {
  fileName: string;
}

const ScanningLoader: React.FC<ScanningLoaderProps> = ({ fileName }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: FileText, label: 'Reading document structure', duration: 800 },
    { icon: Search, label: 'Extracting text and content', duration: 1000 },
    { icon: Cpu, label: 'Analyzing with AI engine', duration: 1200 },
    { icon: CheckCircle, label: 'Generating insights', duration: 500 }
  ];

  useEffect(() => {
    let totalDuration = 0;
    const intervals: NodeJS.Timeout[] = [];

    steps.forEach((step, index) => {
      const timeout = setTimeout(() => {
        setCurrentStep(index);
      }, totalDuration);
      intervals.push(timeout);
      totalDuration += step.duration;
    });

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 35);

    return () => {
      intervals.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
        {/* Document Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-24 h-32 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-200/50 to-transparent animate-pulse"></div>
              
              {/* Scanning line animation */}
              <div 
                className="absolute left-0 right-0 h-1 bg-blue-500 transition-all duration-200 ease-out"
                style={{ top: `${(progress / 100) * 100}%` }}
              ></div>
              
              {/* Document lines */}
              <div className="p-3 space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 bg-slate-300 rounded transition-all duration-300 ${
                      (progress / 100) * 100 > (i * 12.5) ? 'bg-blue-400' : ''
                    }`}
                    style={{ width: `${Math.random() * 40 + 60}%` }}
                  ></div>
                ))}
              </div>
            </div>
            
            {/* Floating particles */}
            <div className="absolute -top-2 -right-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-100"></div>
            </div>
            <div className="absolute -bottom-2 -left-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>
        </div>

        {/* File name */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Analyzing Resume</h3>
          <p className="text-slate-600 bg-slate-100 rounded-full px-4 py-2 inline-block">
            {fileName}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div 
                key={index}
                className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-50 border-2 border-blue-200' 
                    : isCompleted 
                      ? 'bg-green-50 border-2 border-green-200'
                      : 'bg-slate-50 border-2 border-transparent'
                }`}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isActive 
                    ? 'bg-blue-500 text-white animate-pulse' 
                    : isCompleted 
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-300 text-slate-500'
                  }
                `}>
                  <StepIcon className="w-5 h-5" />
                </div>
                <span className={`font-medium transition-colors duration-300 ${
                  isActive 
                    ? 'text-blue-700' 
                    : isCompleted 
                      ? 'text-green-700'
                      : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
                {isActive && (
                  <div className="flex space-x-1 ml-auto">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScanningLoader;