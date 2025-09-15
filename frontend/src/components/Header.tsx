import React from 'react';
import { FileText, Zap } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <FileText className="w-8 h-8 text-blue-600" />
              <Zap className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ResumeAnalyzer
            </h1>
          </div>
        </div>
        <p className="text-center text-slate-600 mt-2 text-sm">
          AI-powered resume analysis to boost your career prospects
        </p>
      </div>
    </header>
  );
};

export default Header;