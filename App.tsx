import React, { useState, useEffect } from 'react';
import { useLessons, useLesson } from './hooks/useLessons';
import { ParsedLesson, LANGUAGE_OPTIONS, LEVEL_OPTIONS, TAG_OPTIONS } from './types';
import { LessonView } from './components/Lesson/LessonView';
import { Button } from './components/UI/Button';
import { BookOpen, Search, FlaskConical, Video, Feather, FileText, X, LogIn, LogOut, AlertTriangle, User, ChevronDown } from 'lucide-react';
import { BrowserSupportWarning } from './components/UI/BrowserSupportWarning';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { LessonEditor } from './components/Admin/LessonEditorRefactored';
import { WebComponentPreview } from './components/Lesson/WebComponentPreview';
import { SearchableSelect } from './components/UI/SearchableSelect';
import { LoginForm } from './components/Admin/LoginForm';
import { isAuthenticated, isAdmin, requireAdmin, logout, getCurrentUser } from './services/pocketbase';
import logo from './assets/tj-logo.svg';

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(isAdmin());
    const [view, setView] = useState<'home' | 'lesson' | 'admin' | 'create'>('home');
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    // Filter States
    const [language, setLanguage] = useState('English');
    const [level, setLevel] = useState('All');
    const [tag, setTag] = useState('All');

    const { data: lessons = [], isLoading: loading } = useLessons(language, level, isLoggedIn);
    const { data: currentLessonFromQuery, isLoading: loadingLesson } = useLesson(selectedLessonId, isLoggedIn);

    // On mount, refresh the auth token to confirm the current user still has
    // isAdmin=true. Catches stale tokens (logged in before the flag was set)
    // and revoked admin access.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const ok = await requireAdmin();
            if (!cancelled) setIsLoggedIn(ok);
        })();
        return () => { cancelled = true; };
    }, []);

    const handleLogout = () => {
        logout();
        setIsLoggedIn(false);
        setView('home');
        setSelectedLessonId(null);
        setCurrentLesson(null);
        updateURL({ lesson: '', view: '', language, level, category: tag });
    };

    // currentLesson state is kept for cases where it's passed from admin/create preview
    const [currentLesson, setCurrentLesson] = useState<ParsedLesson | null>(null);

    // Sync currentLesson with query result when viewing a specific lesson
    useEffect(() => {
        if (currentLessonFromQuery && view === 'lesson') {
            setCurrentLesson(currentLessonFromQuery);
        }
    }, [currentLessonFromQuery, view]);

    // Parse URL params for routing
    useEffect(() => {
        const syncParams = () => {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view');
            const lessonId = params.get('lesson');
            const editId = params.get('edit');

            // Sync filters from URL if present
            const urlLang = params.get('language');
            const urlLevel = params.get('level');
            const urlTag = params.get('category');

            if (urlLang) setLanguage(urlLang);
            if (urlLevel) setLevel(urlLevel);
            if (urlTag) setTag(urlTag);

            if (viewParam === 'admin' || editId) {
                setView('admin');
            } else if (viewParam === 'create') {
                setView('create');
            } else if (lessonId && selectedLessonId !== lessonId) {
                handleSelectLesson(lessonId);
            } else if (!lessonId && view === 'lesson') {
                setView('home');
                setSelectedLessonId(null);
                setCurrentLesson(null);
            }
        };

        syncParams();
        window.addEventListener('popstate', syncParams);
        return () => window.removeEventListener('popstate', syncParams);
    }, [selectedLessonId, view]);

    const updateURL = (params: Record<string, string>) => {
        try {
            const url = new URL(window.location.href);
            Object.keys(params).forEach(key => {
                const value = params[key];
                if (value !== undefined && value !== null) {
                    if (value === '') {
                        url.searchParams.delete(key);
                    } else {
                        url.searchParams.set(key, value);
                    }
                }
            });

            // Avoid pushing redundant state
            if (url.toString() !== window.location.href) {
                window.history.pushState({}, '', url.toString());
            }
        } catch (e) {
            console.error("Failed to update URL", e);
        }
    };

    useEffect(() => {
        // Update URL to reflect filters without touching the active lesson param.
        // (Clearing `lesson` is handled explicitly when returning to Home.)
        updateURL({ language, level, category: tag });
    }, [language, level, tag]);

    const handleSelectLesson = async (id: string) => {
        if (!id) return;
        setSelectedLessonId(id);
        setView('lesson');
        window.scrollTo(0, 0);
        updateURL({ lesson: id, language, level, category: tag });
    };

    const handleViewChange = (newView: 'home' | 'lesson' | 'admin' | 'create') => {
        setView(newView);
        if (newView === 'home') {
            setSelectedLessonId(null);
            setCurrentLesson(null);
            updateURL({ lesson: '', view: '', language, level, category: tag });
        } else if (newView === 'admin') {
            setSelectedLessonId(null);
            setCurrentLesson(null);
            updateURL({ lesson: '', view: 'admin' });
        } else if (newView === 'create') {
            setSelectedLessonId(null);
            setCurrentLesson(null);
            updateURL({ lesson: '', view: 'create' });
        }
    };

    const filteredLessons = lessons.filter(l => {
        if (tag === 'All') return true;
        return l.tags?.some(t => t.toLowerCase() === tag.toLowerCase());
    }).sort((a, b) => {
        // If "All Categories" and "All Levels" view, show most recent first (descending by created)
        if (tag === 'All' && level === 'All') {
            return b.created.localeCompare(a.created);
        }
        // Otherwise, filtered views should be sorted alphabetically by title (ascending)
        return a.title.localeCompare(b.title);
    });

    const getIconForTag = (tags: string[]) => {
        const mainTag = tags?.[0]?.toLowerCase() || '';
        if (mainTag.includes('science')) return <FlaskConical className="w-6 h-6 text-purple-500" />;
        if (mainTag.includes('m1-2')) return <FlaskConical className="w-6 h-6 text-green-500" />;
        if (mainTag.includes('video')) return <Video className="w-6 h-6 text-red-500" />;
        if (mainTag.includes('fable')) return <Feather className="w-6 h-6 text-amber-600" />;
        return <FileText className="w-6 h-6 text-green-500" />;
    };

    return (
        <div className="tj-worksheet-wrapper tj-printable-worksheet min-h-screen font-sans print:min-h-0 print:bg-white bg-gray-50 text-gray-800">
            <BrowserSupportWarning />
            {/* Navbar - Hidden on print */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleViewChange('home')}>
                            {/* <img src="https://blog.teacherjake.com/apps/assets/tj-logo.png" alt="Logo" className="h-10 w-auto" /> */}
                            <a href="https://www.teacherjake.com" className="hover:opacity-80 transition-opacity">
                                <img src={logo} alt="Teacher Jake Logo"
                                    className="h-10 w-auto "></img>
                            </a>
                            <span className="hidden md:block font-bold text-gray-700">Worksheets</span>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 ml-4">
                            <button
                                onClick={() => handleViewChange('home')}
                                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                                    (view === 'home' || view === 'lesson')
                                        ? 'text-green-700 bg-green-50 border border-green-150 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                                }`}
                            >
                                Library
                            </button>
                            <button
                                onClick={() => handleViewChange('admin')}
                                title="Manage live worksheets in the online library"
                                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                                    view === 'admin'
                                        ? 'text-green-700 bg-green-50 border border-green-150 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                                }`}
                            >
                                Admin
                            </button>
                            <button
                                onClick={() => handleViewChange('create')}
                                title="Generate standalone HTML files for offline/personal use"
                                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                                    view === 'create'
                                        ? 'text-green-700 bg-green-50 border border-green-150 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                                }`}
                            >
                                Create
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isLoggedIn ? (
                            <>
                                {view === 'lesson' && (
                                    <>
                                        <div className="hidden lg:block text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px]" title={currentLesson?.title}>
                                            {currentLesson?.title}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                navigator.clipboard.writeText(window.location.href);
                                                alert('Link copied to clipboard!');
                                            }}
                                            className="hidden sm:inline-flex"
                                        >
                                            Share
                                        </Button>

                                        <button 
                                            onClick={() => {
                                                handleViewChange('home');
                                                try {
                                                    localStorage.removeItem(`lesson-progress-${currentLesson?.id}`);
                                                } catch (e) {}
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            title="Close Lesson"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </>
                                )}

                                <div className="relative">
                                    <button
                                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                        className="flex items-center gap-1.5 p-1.5 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all font-semibold text-sm"
                                        title="Profile menu"
                                    >
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span className="hidden sm:inline max-w-[100px] truncate">
                                            {getCurrentUser()?.name || getCurrentUser()?.username || getCurrentUser()?.email || 'User'}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    </button>

                                    {showProfileDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                                            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                                <div className="px-4 py-2.5 border-b border-gray-100">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Signed In As</p>
                                                    <p className="text-sm font-semibold text-gray-700 truncate" title={getCurrentUser()?.email || getCurrentUser()?.username}>
                                                        {getCurrentUser()?.email || getCurrentUser()?.username || 'User'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowProfileDropdown(false);
                                                        handleLogout();
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold transition-colors flex items-center gap-2"
                                                >
                                                    <LogOut className="w-4 h-4" /> Logout
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <span className="text-sm font-medium text-gray-400">Please sign in</span>
                        )}
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-0 py-4 print:p-0 print:m-0 print:max-w-none">
                {view === 'create' ? (
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <LessonEditor 
                            lessonId={null} 
                            isPublicCreator={true}
                            onSave={() => handleViewChange('home')} 
                            onCancel={() => handleViewChange('home')} 
                            onPreview={(lesson) => {
                                setCurrentLesson(lesson);
                                setShowPreview(true);
                            }}
                        />
                    </div>
                ) : !isLoggedIn ? (
                    <div className="py-12 px-4">
                        <div className="max-w-md mx-auto bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-900 leading-relaxed font-medium">
                                    This site is for development purposes only. You can find the same lessons and more on{' '}
                                    <a 
                                        href="https://www.teacherjake.com" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-bold underline decoration-amber-300 hover:decoration-amber-500 transition-all text-amber-700 hover:text-amber-800"
                                    >
                                        www.teacherjake.com
                                    </a>{' '}
                                    which is located on a faster server.
                                </div>
                            </div>
                        </div>
                        <LoginForm 
                            onLoginSuccess={() => setIsLoggedIn(true)} 
                            title="Worksheets Sign In"
                            subtitle="Please sign in to view and practice worksheets"
                            className="mt-4"
                        />
                    </div>
                ) : view === 'home' ? (
                    <div className="max-w-3xl mx-auto print:hidden">
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-900 leading-relaxed font-medium">
                                    This site is for development purposes only. You can find the same lessons and more on{' '}
                                    <a 
                                        href="https://www.teacherjake.com" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-bold underline decoration-amber-300 hover:decoration-amber-500 transition-all text-amber-700 hover:text-amber-800"
                                    >
                                        www.teacherjake.com
                                    </a>{' '}
                                    which is located on a faster server.
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-extrabold text-green-900 mb-4 tracking-tight">Interactive Worksheets</h1>
                            <p className="text-lg text-gray-600">Select a language and level to start learning.</p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Language</label>
                                    <SearchableSelect
                                        value={language}
                                        onChange={setLanguage}
                                        options={LANGUAGE_OPTIONS}
                                        placeholder="Select language..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Level</label>
                                    <select
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                                    >
                                        <option value="All">All Levels</option>
                                        {LEVEL_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                    <select
                                        value={tag}
                                        onChange={(e) => setTag(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                                    >
                                        <option value="All">All Categories</option>
                                        {TAG_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Available Lessons</h2>

                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                                        <p className="text-gray-500">Loading lessons...</p>
                                    </div>
                                ) : filteredLessons.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        <p className="text-gray-500">No lessons found matching your criteria.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                                        {filteredLessons.map(l => (
                                            <div
                                                key={l.id}
                                                onClick={() => handleSelectLesson(l.id)}
                                                className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 cursor-pointer flex flex-col h-full"
                                            >
                                                {/* Image Header */}
                                                <div className="aspect-video w-full shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden relative rounded-t-2xl">
                                                    {l.imageUrl ? (
                                                        <img
                                                            src={l.imageUrl}
                                                            alt={l.title}
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 rounded-t-2xl"
                                                        />
                                                    ) : (
                                                        <div className="p-12 opacity-40">
                                                            {getIconForTag(l.tags)}
                                                        </div>
                                                    )}

                                                    {/* Date overlay */}
                                                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                        {new Date(l.created).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                {/* Content logic */}
                                                <div className="grow p-6 flex flex-col">
                                                    <div className="mb-4">
                                                        {/* Badge / Code-like Ref */}
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="text-[11px] font-black tracking-wider text-[#1a933f] uppercase bg-[#f4fff7] px-2 py-0.5 rounded border border-[#e0f7e9]">
                                                                {l.language === 'English' ? 'EN' : l.language.substring(0, 2).toUpperCase()}-{l.level}
                                                            </span>
                                                            <span className="text-[11px] font-black tracking-wider text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                {l.lessonType.replace('-', ' ')}
                                                            </span>
                                                            <div className="h-1 w-1 rounded-full bg-gray-200"></div>
                                                            <span className="text-[11px] text-gray-400 font-medium">#{l.id.substring(0, 4)}</span>
                                                        </div>

                                                        <h3 className="font-extrabold text-primary text-xl leading-tight mb-3 group-hover:text-green-700 transition-colors line-clamp-2 min-h-12">
                                                            {l.title}
                                                        </h3>

                                                        {((l.content as any).seo_intro || l.seo || l.description) && (
                                                            <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-0">
                                                                {(l.content as any).seo_intro || l.seo || l.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Footer / Read More style */}
                                                    <div className="pt-4 mt-auto border-t border-gray-100 flex items-center justify-between">
                                                        <span className="text-[12px] font-extrabold tracking-widest text-primary uppercase transition-colors">
                                                            READ MORE
                                                        </span>
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white shadow-sm group-hover:shadow-md transition-all duration-300">
                                                            <Search size={18} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {loadingLesson && (
                                <div className="flex justify-center items-center py-4 text-green-600">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Loading Lesson content...
                                </div>
                            )}
                        </div>

                        <div className="mt-12 flex justify-center text-green-200">
                            <BookOpen size={64} opacity={0.5} />
                        </div>
                    </div>
                ) : view === 'admin' ? (
                    <AdminDashboard 
                        onBack={() => handleViewChange('home')} 
                        onPreview={(lesson) => {
                            setCurrentLesson(lesson);
                            setShowPreview(true);
                        }}
                        onLogout={handleLogout}
                    />
                ) : (
                    currentLesson && <LessonView lesson={currentLesson} />
                )}
            </main>

            {showPreview && currentLesson && (
                <WebComponentPreview 
                    lesson={currentLesson} 
                    onClose={() => setShowPreview(false)} 
                />
            )}
        </div>
    );
};

export default App;