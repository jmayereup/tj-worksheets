import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser, fetchLessonById } from '../../services/pocketbase';
import { usePaginatedLessons, useDeleteLesson } from '../../hooks/useLessons';
import { Button } from '../UI/Button';
import { Edit, Trash2, ExternalLink, RefreshCw, Layers, Globe, Calendar, Eye, EyeOff, Search, FileText, CheckSquare, Square, Rocket, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { extractVocabularyFromLessons } from '../../utils/vocabularyExtractor';
import { LANGUAGE_OPTIONS, LESSON_TYPE_OPTIONS, formatLessonType } from '../../types';

interface LessonListProps {
    onEdit: (id: string) => void;
    onPreview: (lesson: any) => void;
    onAddNew: (initialData?: any) => void;
}

export const LessonList: React.FC<LessonListProps> = ({ onEdit, onPreview, onAddNew }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('All');
    const [selectedType, setSelectedType] = useState('All');
    const [page, setPage] = useState(1);
    const perPage = 20;
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
    const [isBuilding, setIsBuilding] = useState(false);
    const currentUser = getCurrentUser();

    const isSystemAdmin = currentUser?.collectionName === '_superusers' || currentUser?.isAdmin === true;
    const filterCreatorId = isSystemAdmin ? undefined : currentUser?.id;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset page on new search
        }, 800);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Focus search input after data fetch completes
    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [selectedLanguage, selectedType]);

    const { data: paginationData, isLoading: loading, error: fetchError } = usePaginatedLessons(
        page, 
        perPage, 
        debouncedSearch, 
        filterCreatorId,
        selectedLanguage,
        selectedType
    );
    const lessons = paginationData?.items || [];
    const deleteMutation = useDeleteLesson();

    // Focus search input after data fetch completes
    useEffect(() => {
        if (!loading && searchInputRef.current && document.activeElement !== searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [loading]);

    const handlePreview = async (lessonStub: any) => {
        try {
            // Fetch the full lesson object
            const fullLesson = await fetchLessonById(lessonStub.id);
            onPreview(fullLesson);
        } catch (error) {
            console.error("Failed to fetch full lesson for preview", error);
            alert("Failed to load lesson details.");
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (err) {
                alert('Failed to delete lesson');
            }
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedLessonIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBuildWordBlaster = async () => {
        if (selectedLessonIds.size === 0) return;
        setIsBuilding(true);
        try {
            // Fetch fully-hydrated lessons for extraction
            const selectedLessonsFull = await Promise.all(
                Array.from(selectedLessonIds).map(id => fetchLessonById(id))
            );

            const vocabWords = await extractVocabularyFromLessons(selectedLessonsFull);
            
            // Calculate Highest Level
            const levelOrder = ['A1', 'A2', 'B1', 'B2'];
            let maxLevel = 'A1';
            let maxLevelIndex = -1;
            
            selectedLessonsFull.forEach(l => {
                const index = levelOrder.indexOf(l.level);
                if (index > maxLevelIndex) {
                    maxLevelIndex = index;
                    maxLevel = l.level;
                }
            });
            
            // Generate SEO string
            const lessonTitles = selectedLessonsFull.map(l => l.title).join(', ');
            const generatedSeo = `A vocabulary review game covering words from the following worksheets: ${lessonTitles}.`;
            
            const initialData = {
                title: 'New Word Blaster Game',
                lessonType: 'word-blaster',
                language: selectedLessonsFull[0]?.language || 'English',
                level: maxLevel,
                seo: generatedSeo,
                content: { words: vocabWords }
            };

            // Navigate to editor by signaling to AdminDashboard
            onAddNew(initialData);
        } catch (error) {
            console.error('Error building Word Blaster lesson', error);
            alert('Failed to generate Word Blaster content.');
        } finally {
            setIsBuilding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <RefreshCw className="w-10 h-10 text-green-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Fetching lessons registry...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
                <p className="text-red-600 font-bold mb-4">{"Failed to load lessons"}</p>
                <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
            </div>
        );
    }

    const filteredLessons = lessons;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search worksheets by title..."
                        className="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                    />
                </div>
                
                <div className="flex gap-2 shrink-0">
                    <div className="relative group/select">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Globe className="h-3.5 w-3.5 text-gray-400 group-focus-within/select:text-green-500 transition-colors" />
                        </div>
                        <select
                            className="block w-full md:w-44 pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm appearance-none cursor-pointer"
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                        >
                            <option value="All">All Languages</option>
                            {LANGUAGE_OPTIONS.map(ln => (
                                <option key={ln} value={ln}>{ln}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                    </div>

                    <div className="relative group/select">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FileText className="h-3.5 w-3.5 text-gray-400 group-focus-within/select:text-green-500 transition-colors" />
                        </div>
                        <select
                            className="block w-full md:w-44 pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm appearance-none cursor-pointer"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            {LESSON_TYPE_OPTIONS.map(type => (
                                <option key={type} value={type}>{formatLessonType(type)}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                    </div>
                </div>
            </div>

            {selectedLessonIds.size > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-indigo-900">{selectedLessonIds.size} worksheet{selectedLessonIds.size > 1 ? 's' : ''} selected</div>
                            <div className="text-sm text-indigo-600">Select multiple worksheets to combine their vocabulary into a new game.</div>
                        </div>
                    </div>
                    <Button 
                        onClick={handleBuildWordBlaster}
                        disabled={isBuilding}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 border-transparent"
                    >
                        {isBuilding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                        {isBuilding ? 'Building...' : 'Build Word Blaster'}
                    </Button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Desktop view: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 w-12 text-center text-xs font-black text-gray-500 uppercase tracking-widest">Select</th>
                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Worksheet</th>
                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Details</th>
                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Created</th>
                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredLessons.map((lesson) => (
                            <tr key={lesson.id} className={`hover:bg-green-50/30 transition-colors group ${selectedLessonIds.has(lesson.id) ? 'bg-indigo-50/20' : ''}`}>
                                <td className="px-6 py-5 text-center">
                                    <button 
                                        onClick={() => toggleSelection(lesson.id)}
                                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {selectedLessonIds.has(lesson.id) ? (
                                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="w-16 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => window.open(`/?lesson=${lesson.id}`, '_blank')}
                                            title="Open in library view"
                                        >
                                            {lesson.imageUrl ? (
                                                <img src={lesson.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <RefreshCw className="w-4 h-4 opacity-20" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div 
                                                className="font-extrabold text-gray-900 group-hover:text-green-700 cursor-pointer hover:underline transition-colors line-clamp-1"
                                                onClick={() => window.open(`/?lesson=${lesson.id}`, '_blank')}
                                                title="Open in library view"
                                            >
                                                {lesson.title}
                                            </div>
                                            <div className="text-[10px] font-mono text-gray-400 mt-0.5">ID: {lesson.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100 uppercase">
                                            <Globe className="w-3 h-3" /> {lesson.language}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-100 uppercase">
                                            <Layers className="w-3 h-3" /> {lesson.level}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-black border border-green-100 uppercase">
                                            <FileText className="w-3 h-3" /> {formatLessonType(lesson.lessonType)}
                                        </span>
                                        {lesson.notForBlog && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-100 uppercase" title="Excluded from blog">
                                                <EyeOff className="w-3 h-3" /> Not For Blog
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(lesson.created).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right whitespace-nowrap">
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={() => handlePreview(lesson)}
                                            title="Preview Worksheet"
                                            className="p-0 h-9 w-9 text-green-600 border-green-200 hover:bg-green-50"
                                        >
                                            <Eye className="w-4 h-4 p-0" /> 
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={() => window.open(`https://www.teacherjake.com/pb/${lesson.id}`, '_blank')}
                                            title="View Public Worksheet"
                                            className="p-2 h-9 w-9"
                                        >
                                            <ExternalLink className="w-4 h-4" /> 
                                        </Button>
                                        {(lesson.creatorId === currentUser?.id || isSystemAdmin) && (
                                            <>
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    onClick={() => onEdit(lesson.id)}
                                                    title="Edit Worksheet"
                                                    className="h-9 gap-2"
                                                >
                                                    <Edit className="w-4 h-4" /> Edit
                                                </Button>
                                                <Button 
                                                    variant="danger" 
                                                    size="icon" 
                                                    onClick={() => handleDelete(lesson.id, lesson.title)}
                                                    title="Delete Worksheet"
                                                    className="p-2 h-9 w-9"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {/* Mobile view: Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                    {filteredLessons.map((lesson) => (
                        <div key={lesson.id} className={`p-4 space-y-4 hover:bg-green-50/20 transition-colors ${selectedLessonIds.has(lesson.id) ? 'bg-indigo-50/20' : ''}`}>
                            <div className="flex items-start gap-3">
                                <button 
                                    onClick={() => toggleSelection(lesson.id)}
                                    className="mt-1 text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                                >
                                    {selectedLessonIds.has(lesson.id) ? (
                                        <CheckSquare className="w-6 h-6 text-indigo-600" />
                                    ) : (
                                        <Square className="w-6 h-6" />
                                    )}
                                </button>
                                <div 
                                    className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(`/?lesson=${lesson.id}`, '_blank')}
                                    title="Open in library view"
                                >
                                    {lesson.imageUrl ? (
                                        <img src={lesson.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <RefreshCw className="w-5 h-5 opacity-20" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div 
                                        className="font-extrabold text-gray-900 leading-snug line-clamp-2 cursor-pointer hover:text-green-700 hover:underline transition-colors"
                                        onClick={() => window.open(`/?lesson=${lesson.id}`, '_blank')}
                                        title="Open in library view"
                                    >
                                        {lesson.title}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-black border border-blue-100 uppercase">
                                            <Globe className="w-2.5 h-2.5" /> {lesson.language}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[9px] font-black border border-purple-100 uppercase">
                                            <Layers className="w-2.5 h-2.5" /> {lesson.level}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[9px] font-black border border-green-100 uppercase">
                                            <FileText className="w-2.5 h-2.5" /> {formatLessonType(lesson.lessonType)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                                <div className="text-[10px] font-mono text-gray-400">ID: {lesson.id}</div>
                                <div className="flex items-center gap-1 text-gray-500 text-[10px] font-medium">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(lesson.created).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handlePreview(lesson)}
                                    className="flex flex-col items-center justify-center h-auto py-2 px-1 text-green-600 border-green-200 gap-1"
                                >
                                    <Eye className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Preview</span>
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => window.open(`/?lesson=${lesson.id}`, '_blank')}
                                    className="flex flex-col items-center justify-center h-auto py-2 px-1 gap-1"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Public</span>
                                </Button>
                                {(lesson.creatorId === currentUser?.id || isSystemAdmin) && (
                                    <>
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => onEdit(lesson.id)}
                                            className="flex flex-col items-center justify-center h-auto py-2 px-1 gap-1"
                                        >
                                            <Edit className="w-4 h-4" />
                                            <span className="text-[9px] font-black uppercase tracking-tighter">Edit</span>
                                        </Button>
                                        <Button 
                                            variant="danger" 
                                            size="sm" 
                                            onClick={() => handleDelete(lesson.id, lesson.title)}
                                            className="flex flex-col items-center justify-center h-auto py-2 px-1 gap-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="text-[9px] font-black uppercase tracking-tighter">Delete</span>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {filteredLessons.length === 0 && (
                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                        <Search className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">
                        {searchQuery ? `No worksheets matching "${searchQuery}"` : 'No worksheets found in the registry.'}
                    </p>
                    {searchQuery && paginationData && paginationData.totalItems > 0 && (
                        <p className="text-sm text-gray-400 mt-2">
                            Found {paginationData.totalItems} total result{paginationData.totalItems !== 1 ? 's' : ''} across all pages
                        </p>
                    )}
                </div>
            )}

            {paginationData && paginationData.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{(page - 1) * perPage + 1}</span> to <span className="font-medium">{Math.min(page * perPage, paginationData.totalItems)}</span> of{' '}
                                <span className="font-medium">{paginationData.totalItems}</span> {searchQuery ? 'matching worksheets' : 'worksheets'}
                                {searchQuery && <span className="text-green-600 ml-1">for "{searchQuery}"</span>}
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <Button
                                    variant="outline"
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 hover:bg-gray-50 focus:z-20 border-gray-300 pointer-events-auto"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </Button>
                                {/* Simple page display */}
                                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 border-y border-gray-300">
                                    Page {page} of {paginationData.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 hover:bg-gray-50 focus:z-20 border-gray-300"
                                    disabled={page === paginationData.totalPages}
                                    onClick={() => setPage(p => Math.min(paginationData.totalPages, p + 1))}
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </Button>
                            </nav>
                        </div>
                    </div>
                    {/* Mobile Pagination */}
                    <div className="flex flex-1 justify-between sm:hidden">
                        <Button
                            variant="outline"
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-gray-700 self-center">
                            Page {page} of {paginationData.totalPages}
                            {searchQuery && <span className="text-green-600 ml-1">({paginationData.totalItems} results)</span>}
                        </span>
                        <Button
                            variant="outline"
                            disabled={page === paginationData.totalPages}
                            onClick={() => setPage(p => Math.min(paginationData.totalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
