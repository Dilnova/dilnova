'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedId: string;
  onChange: (id: string) => void;
}

interface SelectableItem {
  id: string;
  name: string;
  isParent: boolean;
  parentId: string | null;
  parentName?: string;
  displayName: string;
}

export default function CategorySelector({
  categories,
  selectedId,
  onChange,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Map of categories by ID for quick parent lookups
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Generate flat list of options for keyboard navigation & rendering
  const selectableItems = useMemo((): SelectableItem[] => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      // Return hierarchical list (parents first, then their children)
      const list: SelectableItem[] = [];
      const parents = categories.filter((c) => !c.parentId);
      
      parents.forEach((parent) => {
        // Add parent itself
        list.push({
          id: parent.id,
          name: parent.name,
          isParent: true,
          parentId: null,
          displayName: `${parent.name} (All)`,
        });

        // Add subcategories
        const children = categories.filter((c) => c.parentId === parent.id);
        children.forEach((child) => {
          list.push({
            id: child.id,
            name: child.name,
            isParent: false,
            parentId: parent.id,
            parentName: parent.name,
            displayName: child.name,
          });
        });
      });

      return list;
    } else {
      // Return search filtered list
      return categories
        .filter((c) => c.name.toLowerCase().includes(query))
        .map((c) => {
          const parent = c.parentId ? categoryMap.get(c.parentId) : null;
          return {
            id: c.id,
            name: c.name,
            isParent: !c.parentId,
            parentId: c.parentId,
            parentName: parent?.name,
            displayName: c.name,
          };
        });
    }
  }, [categories, searchQuery, categoryMap]);

  // Sync active index to ensure it is within bounds when list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  // Find currently selected category name/path for the display button
  const selectedCategoryLabel = useMemo(() => {
    if (!selectedId) return 'Select Category';
    const selected = categoryMap.get(selectedId);
    if (!selected) return 'Select Category';
    
    if (selected.parentId) {
      const parent = categoryMap.get(selected.parentId);
      return parent ? `${parent.name} › ${selected.name}` : selected.name;
    }
    return `${selected.name} (All)`;
  }, [selectedId, categoryMap]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure dropdown rendering is complete
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close dropdown handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (selectableItems.length > 0 ? (prev + 1) % selectableItems.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (selectableItems.length > 0 ? (prev - 1 + selectableItems.length) % selectableItems.length : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectableItems[activeIndex]) {
          handleSelect(selectableItems[activeIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        // Let natural tab order occur but close dropdown
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Helper to highlight matching text in results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-left bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedId ? 'text-zinc-800 dark:text-zinc-150 font-medium' : 'text-zinc-400 dark:text-zinc-500'}>
          {selectedCategoryLabel}
        </span>
        <div className="flex items-center gap-1.5 pl-2">
          {selectedId && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-all"
              title="Clear selection"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div className="absolute z-[70] mt-1.5 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {/* Search Header */}
          <div className="relative flex items-center bg-zinc-50/80 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 px-3.5 py-2">
            <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search category by name..."
              className="w-full bg-transparent border-none text-zinc-800 dark:text-zinc-150 text-sm focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 py-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-full cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
            role="listbox"
          >
            {selectableItems.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                No matching categories found.
              </div>
            ) : (
              selectableItems.map((item, index) => {
                const isSelected = item.id === selectedId;
                const isActive = index === activeIndex;

                // When displaying normal hierarchical view, we render header prefixes when groups change
                const showHeader =
                  !searchQuery.trim() &&
                  (index === 0 ||
                    (item.isParent && selectableItems[index - 1]?.parentId !== item.id) ||
                    (!item.isParent && selectableItems[index - 1]?.parentId !== item.parentId));

                return (
                  <div key={item.id}>
                    {/* Header category title, purely visual */}
                    {showHeader && (
                      <div className="px-3.5 py-1.5 mt-1.5 first:mt-0 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-50/40 dark:bg-zinc-900/20 tracking-wider">
                        {item.isParent ? item.name : item.parentName}
                      </div>
                    )}

                    {/* Selectable category option row */}
                    <button
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      data-active={isActive}
                      className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 sm:py-2 text-sm transition-colors cursor-pointer select-none ${
                        !searchQuery.trim() && !item.isParent ? 'pl-7' : 'pl-3.5'
                      } ${
                        isActive
                          ? 'bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200'
                          : 'text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex flex-col min-w-0">
                        {/* Selected label rendering */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 flex-shrink-0" />
                          )}
                          <span className={`truncate font-normal ${isSelected ? 'font-semibold text-purple-700 dark:text-purple-300' : ''}`}>
                            {searchQuery.trim()
                              ? highlightMatch(item.displayName, searchQuery)
                              : item.displayName}
                          </span>
                        </div>

                        {/* Subtitle breadcrumb under active search */}
                        {searchQuery.trim() && item.parentName && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium pl-3 mt-0.5 truncate">
                            under {item.parentName}
                          </span>
                        )}
                      </div>

                      {/* Checkmark icon for selected option */}
                      {isSelected && (
                        <svg className="w-4 h-4 text-purple-650 dark:text-purple-400 flex-shrink-0 ml-2 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
