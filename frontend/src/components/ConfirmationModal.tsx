import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  requiresTextConfirmation?: boolean;
  requiredText?: string;
  userInput?: string;
  onInputChange?: (value: string) => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  requiresTextConfirmation = false,
  requiredText = '',
  userInput = '',
  onInputChange
}) => {
  if (!isOpen) return null;

  const isConfirmDisabled = requiresTextConfirmation && userInput !== requiredText;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        
        <div className="mb-6">
          <p className="text-gray-700 whitespace-pre-line">{message}</p>
        </div>
        
        {requiresTextConfirmation && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type "{requiredText}" to confirm:
            </label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => onInputChange?.(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={requiredText}
            />
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 ${
              isConfirmDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;