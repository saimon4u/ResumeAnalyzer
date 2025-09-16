import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file only.';
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  const uploadToBackend = useCallback(async (file: File): Promise<boolean> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5001/upload_resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      // Optional: Parse response if backend returns JSON (e.g., { success: true })
      const data = await response.json();
      console.log('Backend response:', data);

      return true;
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      await uploadToBackend(file);
      onFileUpload(file); // Proceed to scanning/analysis
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload, uploadToBackend]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      await uploadToBackend(file);
      onFileUpload(file); // Proceed to scanning/analysis
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload, uploadToBackend]);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent mb-4 animate-fade-in-down">
          Upload Your Resume
        </h2>
        <p className="text-slate-500 text-lg font-medium animate-fade-in-up">
          Transform your career with our AI-powered resume analysis
        </p>
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-500
          ${isDragOver 
            ? 'border-indigo-500 bg-indigo-50/20 scale-105 shadow-2xl' 
            : 'border-slate-200 bg-white/10 hover:border-indigo-400 hover:bg-indigo-50/10'
          }
          backdrop-blur-lg shadow-lg hover:shadow-xl
          ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="resume-upload"
          disabled={isUploading}
        />
        
        <div className="space-y-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-full flex items-center justify-center transform transition-transform duration-300 hover:scale-110">
            {isUploading ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : (
              <Upload className="w-12 h-12 text-white animate-pulse" />
            )}
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3 animate-fade-in">
              {isUploading 
                ? 'Uploading your resume...' 
                : isDragOver 
                  ? 'Drop your resume here' 
                  : 'Drag & drop your resume'
              }
            </h3>
            <p className="text-slate-500 mb-4 text-base">
              {!isUploading ? (
                <>
                  or <label htmlFor="resume-upload" className="text-indigo-600 hover:text-indigo-800 cursor-pointer font-semibold transition-colors duration-200">browse files</label>
                </>
              ) : (
                <span className="text-indigo-600">Please wait...</span>
              )}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
              <FileText className="w-5 h-5" />
              <span>PDF files only • Max 10MB</span>
            </div>
          </div>
        </div>

        {isDragOver && !isUploading && (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center animate-pulse">
            <div className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
              Drop to upload
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 p-5 bg-red-50/80 border border-red-300 rounded-xl flex items-center space-x-3 text-red-800 animate-slide-up">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: '🔍', title: 'ATS Compliance', desc: 'Ensure your resume passes applicant tracking systems with ease' },
          { icon: '📊', title: 'Skill Analysis', desc: 'Highlight key skills and receive tailored improvement tips' },
          { icon: '🎯', title: 'Score & Tips', desc: 'Get a comprehensive score with actionable feedback' }
        ].map((feature, index) => (
          <div
            key={index}
            className="bg-white/30 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/30 shadow-md hover:shadow-xl transform transition-all duration-300 hover:scale-105"
          >
            <div className="text-3xl mb-4 animate-bounce">{feature.icon}</div>
            <h4 className="font-bold text-slate-800 mb-3 text-lg">{feature.title}</h4>
            <p className="text-sm text-slate-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadSection;