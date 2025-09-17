// App.tsx
import React, { useState } from 'react';
import UploadSection from './components/UploadSection';
import ScanningLoader from './components/ScanningLoader';
import ResultsSection from './components/ResultsSection';
import Header from './components/Header';

export interface ResumeAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  keywords: string[];
  experience: {
    years: number;
    level: string;
  };
  skills: {
    technical: string[];
    soft: string[];
  };
  education: string;
  contact: {
    email: boolean;
    phone: boolean;
    linkedin: boolean;
  };
  jobMatches: JobMatch[];
}

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  alignmentScore: number;
  requiredSkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  description: string;
  requirements: string[];
  url: string;
  improvementAdvice: string[];
}

type AppState = 'upload' | 'scanning' | 'results' | 'error';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('upload');
  const [analysisResults, setAnalysisResults] = useState<ResumeAnalysis | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setCurrentState('scanning');
    setErrorMessage(null);

    try {
      // Step 1: Validate file
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Step 2: Upload resume to /upload_resume
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('http://localhost:5001/upload_resume', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      const resumeData = await uploadResponse.json();

      // Step 3: Call /match-jobs with parsed resume data
      const matchJobsResponse = await fetch('http://localhost:5001/match-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resumeData),
      });

      if (!matchJobsResponse.ok) {
        const errorText = await matchJobsResponse.text();
        throw new Error(`Match jobs failed: ${matchJobsResponse.status} ${matchJobsResponse.statusText} - ${errorText}`);
      }

      const matchJobsData = await matchJobsResponse.json();

      // Step 4: Construct ResumeAnalysis object from /match-jobs response
      const mockAnalysis: ResumeAnalysis = {
        score: Math.floor(Math.random() * 30) + 70, // Placeholder
        strengths: [
          'Strong technical background in relevant technologies',
          'Clear and concise work experience descriptions',
          'Good educational qualifications',
          'Professional email and contact information',
          'Well-structured resume format',
        ],
        improvements: [
          'Add more quantified achievements with specific metrics',
          'Include relevant certifications or training',
          'Expand on leadership experience',
          'Add volunteer work or side projects',
          'Include a brief professional summary',
        ],
        keywords: resumeData.technical_skills,
        experience: {
          years: Math.floor(Math.random() * 8) + 2, // Placeholder
          level: Math.random() > 0.6 ? 'Senior' : Math.random() > 0.3 ? 'Mid-level' : 'Junior',
        },
        skills: {
          technical: resumeData.technical_skills,
          soft: ['Leadership', 'Communication', 'Problem-solving', 'Team collaboration'], // Placeholder
        },
        education: 'Bachelor\'s Degree in Computer Science', // Placeholder
        contact: {
          email: true, // Placeholder
          phone: Math.random() > 0.3,
          linkedin: Math.random() > 0.4,
        },
        jobMatches: matchJobsData.matches.map((job: any, index: number) => ({
          id: String(index + 1),
          title: job.title,
          company: job.company,
          location: 'Unknown', // Placeholder
          salary: 'Unknown', // Placeholder
          type: 'Full-time', // Placeholder
          alignmentScore: Math.round(job.score * 100),
          requiredSkills: job.required_skills || [],
          matchingSkills: job.matched_skills || [],
          missingSkills: job.missing_skills || [],
          description: 'No description available', // Placeholder
          requirements: job.requirements || [],
          url: job.url,
          improvementAdvice: job.improvement_advice || [],
        })),
      };

      setAnalysisResults(mockAnalysis);
      setCurrentState('results');
    } catch (error) {
      console.error('Error during resume analysis:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      setCurrentState('error');
    }
  };

  const handleStartOver = () => {
    setCurrentState('upload');
    setAnalysisResults(null);
    setFileName('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {currentState === 'upload' && <UploadSection onFileUpload={handleFileUpload} />}
        {currentState === 'scanning' && <ScanningLoader fileName={fileName} />}
        {currentState === 'results' && analysisResults && (
          <ResultsSection results={analysisResults} fileName={fileName} onStartOver={handleStartOver} />
        )}
        {currentState === 'error' && (
          <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-300 rounded-xl text-red-800">
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p>{errorMessage}</p>
            <button
              onClick={handleStartOver}
              className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;