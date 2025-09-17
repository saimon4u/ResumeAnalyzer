import React from 'react';
import {
  Award,
  TrendingUp,
  AlertTriangle,
  Tag,
  Briefcase,
  Mail,
  Phone,
  Linkedin,
  RefreshCw,
  Star,
  Target,
  Lightbulb,
  Users,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  Building,
} from 'lucide-react';
import type { ResumeAnalysis, JobMatch } from '../App';

interface ResultsSectionProps {
  results: ResumeAnalysis;
  fileName: string;
  onStartOver: () => void;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ results, fileName, onStartOver }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const getAlignmentColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getAlignmentBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-blue-50 border-blue-200';
    if (score >= 50) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const JobCard: React.FC<{ job: JobMatch }> = ({ job }) => (
    <div className={`rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-lg ${getAlignmentBgColor(job.alignmentScore)}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h4 className="text-xl font-bold text-slate-800 mb-1">{job.title}</h4>
          <div className="flex items-center space-x-2 text-slate-600 mb-2">
            <Building className="w-4 h-4" />
            <span className="font-medium">{job.company}</span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-slate-500">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-3 h-3" />
              <span>{job.salary}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{job.type}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getAlignmentColor(job.alignmentScore)}`}>
            {job.alignmentScore}% Match
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className={`w-full h-2 bg-slate-200 rounded-full overflow-hidden`}>
          <div className={`h-full transition-all duration-500 ${getAlignmentColor(job.alignmentScore)}`} style={{ width: `${job.alignmentScore}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h5 className="font-semibold text-green-700 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            Matching Skills ({job.matchingSkills.length})
          </h5>
          <div className="flex flex-wrap gap-1">
            {job.matchingSkills.map((skill, index) => (
              <span key={index} className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h5 className="font-semibold text-red-700 mb-2 flex items-center">
            <XCircle className="w-4 h-4 mr-1" />
            Missing Skills ({job.missingSkills.length})
          </h5>
          <div className="flex flex-wrap gap-1">
            {job.missingSkills.map((skill, index) => (
              <span key={index} className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-slate-700 mb-2">Key Requirements</h5>
        <ul className="space-y-1">
          {job.requirements.slice(0, 3).map((req, index) => (
            <li key={index} className="text-sm text-slate-600 flex items-start">
              <span className="w-1 h-1 bg-slate-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
              {req}
            </li>
          ))}
        </ul>
      </div>

      <a
        href={job.url || '#'} // Safe fallback in case url is undefined
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        <span>View Full Job</span>
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Analysis Complete!</h2>
            <p className="text-slate-600">{fileName}</p>
          </div>
          <button
            onClick={onStartOver}
            className="mt-4 md:mt-0 flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Analyze Another</span>
          </button>
        </div>

        <div className="flex items-center justify-center">
          <div className={`relative w-32 h-32 rounded-full border-8 ${getScoreColor(results.score)} flex items-center justify-center`}>
            <div className="text-center">
              <div className="text-3xl font-bold">{results.score}</div>
              <div className="text-sm font-medium">/ 100</div>
            </div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(results.score)}`}>{getScoreLabel(results.score)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800">Job Matches</h3>
            <p className="text-slate-600">Based on your resume analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.jobMatches.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-green-50/80 backdrop-blur-sm rounded-2xl p-6 border border-green-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-green-800">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {results.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <Star className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-green-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Contact Info</h3>
            </div>
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', present: results.contact.email },
                { icon: Phone, label: 'Phone', present: results.contact.phone },
                { icon: Linkedin, label: 'LinkedIn', present: results.contact.linkedin },
              ].map((contact, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <contact.icon className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-700">{contact.label}</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${contact.present ? 'bg-green-500' : 'bg-red-400'}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-50/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-amber-800">Areas to Improve</h3>
            </div>
            <ul className="space-y-3">
              {results.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                  <span className="text-amber-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Experience</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Years of Experience</span>
                <span className="font-semibold text-slate-800">{results.experience.years}+ years</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Level</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    results.experience.level === 'Senior'
                      ? 'bg-green-100 text-green-800'
                      : results.experience.level === 'Mid-level'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {results.experience.level}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Education</span>
                <p className="font-medium text-slate-800 mt-1">{results.education}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Key Skills Found</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {results.keywords.map((keyword, index) => (
                <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Technical Skills</h3>
            </div>
            <div className="space-y-3">
              {results.skills.technical.map((skill, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-700">{skill}</span>
                  <div className="w-16 h-2 bg-slate-200 rounded-full">
                    <div className="h-2 bg-cyan-500 rounded-full" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Soft Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {results.skills.soft.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 text-white rounded-2xl p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-2xl font-semibold">Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-700/50 rounded-xl p-6">
            <h4 className="font-semibold mb-3 text-blue-300">Skills to Develop</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• Learn Node.js for backend development</li>
              <li>• Get familiar with Docker and containerization</li>
              <li>• Practice with cloud platforms (AWS/Azure)</li>
            </ul>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-6">
            <h4 className="font-semibold mb-3 text-green-300">Resume Improvements</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• Add quantified achievements with metrics</li>
              <li>• Include relevant project portfolios</li>
              <li>• Update with latest technologies used</li>
            </ul>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-6">
            <h4 className="font-semibold mb-3 text-amber-300">Career Strategy</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• Focus on high-match positions (85%+)</li>
              <li>• Build missing skills for dream jobs</li>
              <li>• Network with target companies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsSection;