import React, { useState, useCallback } from 'react';
import { Search, Replace, X } from 'lucide-react';
import { Modal, Button, LoadingSpinner, Input, Checkbox } from '../shared';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string, options: SearchOptions) => void;
  onReplace?: (query: string, replacement: string, options: SearchOptions) => void;
  className?: string;
}

export interface SearchOptions {
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
}

export const SearchReplaceModal: React.FC<SearchReplaceModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  onReplace,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim() || !onSearch) return;

    const options: SearchOptions = {
      caseSensitive,
      useRegex,
      wholeWord,
    };

    setIsLoading(true);
    try {
      onSearch(searchQuery, options);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, caseSensitive, useRegex, wholeWord, onSearch]);

  const handleReplace = useCallback(() => {
    if (!searchQuery.trim() || !onReplace) return;

    const options: SearchOptions = {
      caseSensitive,
      useRegex,
      wholeWord,
    };

    setIsLoading(true);
    try {
      onReplace(searchQuery, replaceValue, options);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, replaceValue, caseSensitive, useRegex, wholeWord, onReplace]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setReplaceValue('');
    setCaseSensitive(false);
    setUseRegex(false);
    setWholeWord(false);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} noPadding={false}>
      <div className={`flex flex-col w-full max-w-2xl ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Replace className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Search and Replace</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Query */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search for</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter search term or regex pattern"
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        {/* Replace Value */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Replace with</label>
          <div className="relative">
            <Replace className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              placeholder="Enter replacement text"
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
            />
          </div>
        </div>

        {/* Options */}
        <div className="mb-6 space-y-2">
          <Checkbox
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            label="Case sensitive"
          />

          <Checkbox
            checked={useRegex}
            onChange={(e) => setUseRegex(e.target.checked)}
            label="Use regex"
          />

          <Checkbox
            checked={wholeWord}
            onChange={(e) => setWholeWord(e.target.checked)}
            label="Match whole word"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="md" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Processing...</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>

          {onSearch && (
            <Button onClick={handleSearch} disabled={!searchQuery.trim() || isLoading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          )}

          {onReplace && (
            <Button onClick={handleReplace} disabled={!searchQuery.trim() || isLoading}>
              <Replace className="w-4 h-4 mr-2" />
              Replace
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
