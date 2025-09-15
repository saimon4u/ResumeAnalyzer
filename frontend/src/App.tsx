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
}

type AppState = 'upload' | 'scanning' | 'results';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('upload');
  const [analysisResults, setAnalysisResults] = useState<ResumeAnalysis | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setCurrentState('scanning');
    
    // Simulate analysis process
    setTimeout(() => {
      const mockResults: ResumeAnalysis = {
        score: Math.floor(Math.random() * 30) + 70, // 70-100
        strengths: [
          'Strong technical background in relevant technologies',
          'Clear and concise work experience descriptions',
          'Good educational qualifications',
          'Professional email and contact information',
          'Well-structured resume format'
        ],
        improvements: [
          'Add more quantified achievements with specific metrics',
          'Include relevant certifications or training',
          'Expand on leadership experience',
          'Add volunteer work or side projects',
          'Include a brief professional summary'
        ],
        keywords: [
          'JavaScript', 'React', 'Node.js', 'Python', 'SQL', 
          'Leadership', 'Problem-solving', 'Communication'
        ],
        experience: {
          years: Math.floor(Math.random() * 8) + 2,
          level: Math.random() > 0.6 ? 'Senior' : Math.random() > 0.3 ? 'Mid-level' : 'Junior'
        },
        skills: {
          technical: ['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python', 'SQL'],
          soft: ['Leadership', 'Communication', 'Problem-solving', 'Team collaboration']
        },
        education: 'Bachelor\'s Degree in Computer Science',
        contact: {
          email: true,
          phone: Math.random() > 0.3,
          linkedin: Math.random() > 0.4
        },
        jobMatches: [
          {
            id: '1',
            title: 'Senior Frontend Developer',
            company: 'TechCorp Inc.',
            location: 'San Francisco, CA',
            salary: '$120k - $160k',
            type: 'Full-time',
            alignmentScore: 92,
            requiredSkills: ['React', 'TypeScript', 'Node.js', 'CSS', 'JavaScript', 'Git', 'Agile'],
            matchingSkills: ['React', 'TypeScript', 'JavaScript', 'CSS'],
            missingSkills: ['Node.js', 'Git', 'Agile'],
            description: 'We are looking for a Senior Frontend Developer to join our dynamic team...',
            requirements: [
              '5+ years of React experience',
              'Strong TypeScript skills',
              'Experience with modern CSS frameworks',
              'Knowledge of state management'
            ]
          },
          {
            id: '2',
            title: 'Full Stack Engineer',
            company: 'StartupXYZ',
            location: 'Remote',
            salary: '$100k - $140k',
            type: 'Full-time',
            alignmentScore: 78,
            requiredSkills: ['React', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'REST APIs'],
            matchingSkills: ['React', 'Python'],
            missingSkills: ['PostgreSQL', 'Docker', 'AWS', 'REST APIs'],
            description: 'Join our fast-growing startup as a Full Stack Engineer...',
            requirements: [
              '3+ years full-stack development',
              'Experience with cloud platforms',
              'Database design knowledge',
              'API development experience'
            ]
          },
          {
            id: '3',
            title: 'React Developer',
            company: 'Digital Agency Pro',
            location: 'New York, NY',
            salary: '$90k - $120k',
            type: 'Contract',
            alignmentScore: 85,
            requiredSkills: ['React', 'JavaScript', 'HTML', 'CSS', 'Figma', 'Responsive Design'],
            matchingSkills: ['React', 'JavaScript', 'HTML', 'CSS'],
            missingSkills: ['Figma', 'Responsive Design'],
            description: 'We need a skilled React Developer for client projects...',
            requirements: [
              '3+ years React development',
              'Strong CSS and HTML skills',
              'Experience with design tools',
              'Portfolio of responsive websites'
            ]
          },
          {
            id: '4',
            title: 'Software Engineer',
            company: 'Enterprise Solutions Ltd',
            location: 'Austin, TX',
            salary: '$110k - $150k',
            type: 'Full-time',
            alignmentScore: 65,
            requiredSkills: ['Java', 'Spring Boot', 'Microservices', 'Kubernetes', 'Jenkins', 'SQL'],
            matchingSkills: ['SQL'],
            missingSkills: ['Java', 'Spring Boot', 'Microservices', 'Kubernetes', 'Jenkins'],
            description: 'Looking for a Software Engineer to work on enterprise applications...',
            requirements: [
              '4+ years Java development',
              'Microservices architecture experience',
              'DevOps knowledge',
              'Enterprise software experience'
            ]
          }
        ]
      };
      
      setAnalysisResults(mockResults);
      setCurrentState('results');
    }, 3500);
  };

  const handleStartOver = () => {
    setCurrentState('upload');
    setAnalysisResults(null);
    setFileName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {currentState === 'upload' && (
          <UploadSection onFileUpload={handleFileUpload} />
        )}
        
        {currentState === 'scanning' && (
          <ScanningLoader fileName={fileName} />
        )}
        
        {currentState === 'results' && analysisResults && (
          <ResultsSection 
            results={analysisResults} 
            fileName={fileName}
            onStartOver={handleStartOver}
          />
        )}
      </main>
    </div>
  );
}

export default App;