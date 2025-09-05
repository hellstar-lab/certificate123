import React from 'react';

interface BulkDownloadProgressProps {
  progress: {
    operation: string;
    status: string;
    total: number;
    processed: number;
    added: number;
    currentFile?: string;
    message: string;
    percentage: number;
    zipFileName?: string;
    error?: string;
  } | null;
  onClose: () => void;
}

const BulkDownloadProgress: React.FC<BulkDownloadProgressProps> = ({ progress, onClose }) => {
  if (!progress) return null;

  const isError = progress.operation === 'bulk_download_error';
  const isComplete = progress.operation === 'bulk_download_complete';
  const isProcessing = progress.status === 'processing' || progress.status === 'finalizing';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 animate-scale-in glass-effect border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            {isError ? (
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mr-3 shadow-glow">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
            ) : isComplete ? (
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3 shadow-glow-green animate-pulse">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 shadow-glow-purple">
                <svg className="w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            )}
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {isError ? 'Download Error' : isComplete ? 'Download Complete' : 'Bulk Download Progress'}
            </h3>
          </div>
          {(isError || isComplete) && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-110 transition-all duration-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isError ? (
          <div className="text-center animate-slide-up">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900 dark:to-pink-900 mb-6 shadow-glow animate-pulse">
              <svg className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Download Failed</h4>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                {progress.error || 'An error occurred during the bulk download process.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-destructive btn-md hover-lift shadow-glow transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        ) : isComplete ? (
          <div className="text-center animate-slide-up">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 mb-6 shadow-glow-green animate-pulse">
              <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Download Complete!</h4>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                {progress.message}
              </p>
              {progress.zipFileName && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  File: {progress.zipFileName}
                </p>
              )}
              <div className="flex items-center justify-center mt-3">
                <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">{progress.added}</span> of <span className="font-medium">{progress.total}</span> certificates included
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-success btn-md hover-lift shadow-glow-green transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Done
            </button>
          </div>
        ) : (
          <div className="animate-slide-up">
            {/* Enhanced Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center text-sm mb-3">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Processing certificates...</span>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent font-bold">
                  {progress.processed} / {progress.total}
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out shadow-glow-purple relative overflow-hidden"
                    style={{ width: `${progress.percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                  </div>
                </div>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs px-2 py-1 rounded-md shadow-lg">
                    {progress.percentage}%
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Estimated time remaining: {Math.max(0, Math.ceil((progress.total - progress.processed) * 0.5))}s
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  {progress.percentage}% complete
                </div>
              </div>
            </div>

            {/* Enhanced Status Message */}
            {progress.message && (
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {progress.message}
                </div>
              </div>
            )}

            {/* Current File Processing */}
            {progress.currentFile && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Currently processing:</span>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-mono bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                  {progress.currentFile}
                </div>
              </div>
            )}

            {/* Enhanced Progress Details */}
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {progress.processed}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Processed
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {progress.added}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Added
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {progress.total}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Total
                </div>
              </div>
            </div>

            {/* Enhanced Loading Animation */}
            {isProcessing && (
              <div className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="relative">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 dark:border-blue-700"></div>
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-600 absolute top-0 left-0"></div>
                </div>
                <span className="ml-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {progress.status === 'finalizing' ? 'Finalizing download...' : 'Processing certificates...'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkDownloadProgress;