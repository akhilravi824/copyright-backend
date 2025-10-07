import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, User, Clock, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { useQuery } from 'react-query';
import axios from 'axios';

const SearchSuggestions = ({ 
  placeholder = "Search cases, incidents, or content...", 
  onSearch, 
  onSuggestionSelect,
  className = "",
  showFilters = false,
  onFilterChange,
  currentFilters = {}
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search suggestions
  const { data: suggestionsData, isLoading } = useQuery(
    ['search-suggestions', debouncedQuery],
    () => axios.get(`/api/cases/search-suggestions?q=${encodeURIComponent(debouncedQuery)}&limit=8`),
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 30000,
      cacheTime: 300000
    }
  );

  const suggestions = suggestionsData?.data?.suggestions || [];

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 2);
    setSelectedIndex(-1);
    
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion.value);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for suggestion type
  const getSuggestionIcon = (suggestion) => {
    switch (suggestion.type) {
      case 'case':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'user':
        return <User className="h-4 w-4 text-green-500" />;
      case 'term':
        return <Search className="h-4 w-4 text-gray-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status icon for cases
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'critical':
      case 'escalated':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={suggestionsRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        
        {/* Loading indicator */}
        {isLoading && query.length >= 2 && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id}`}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-center">
                {getSuggestionIcon(suggestion)}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {suggestion.title}
                    </p>
                    {suggestion.type === 'case' && suggestion.status && (
                      <div className="flex items-center ml-2">
                        {getStatusIcon(suggestion.status)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.subtitle}
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {suggestion.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Filters */}
      {showFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Quick Filters:</label>
          </div>
          
          {[
            { value: 'open', label: 'Open Cases', icon: Clock },
            { value: 'resolved', label: 'Resolved', icon: CheckCircle },
            { value: 'critical', label: 'Critical', icon: AlertTriangle }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => onFilterChange && onFilterChange({ status: filter.value })}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                currentFilters.status === filter.value
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <filter.icon className="h-3 w-3 mr-1" />
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* No suggestions message */}
      {isOpen && suggestions.length === 0 && query.length >= 2 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md py-2 px-3 text-sm text-gray-500">
          No suggestions found for "{query}"
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;
