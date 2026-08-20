import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { LessonList } from './LessonList';
import { LessonEditor } from './LessonEditorRefactored';
import { TTSGenerator } from './TTSGenerator';
import { isAdmin, triggerCloudflareRebuild } from '../../services/pocketbase';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { LayoutDashboard, ArrowLeft, Plus, RefreshCw, Rocket, Mic, List } from 'lucide-react';

interface AdminDashboardProps {
    onBack: () => void;
    onPreview: (lesson: any) => void;
    onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onPreview, onLogout }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(isAdmin());
    const [adminView, setAdminView] = useState<'list' | 'add' | 'edit' | 'tts'>('list');
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editorInitData, setEditorInitData] = useState<any>(null);
    const [isRebuilding, setIsRebuilding] = useState(false);
    const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
    const [showRebuildPrompt, setShowRebuildPrompt] = useState(false);

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
    };

    useEffect(() => {
        if (isLoggedIn) {
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('edit');
            if (editId) {
                handleEditLesson(editId);
                // Remove the edit param from the URL to prevent reopening on refresh
                const url = new URL(window.location.href);
                url.searchParams.delete('edit');
                url.searchParams.delete('view');
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, [isLoggedIn]);

    const handleEditLesson = (id: string) => {
        setEditingLessonId(id);
        setEditorInitData(null);
        setAdminView('edit');
    };

    const handleAddNew = (initialData?: any) => {
        setEditingLessonId(null);
        setEditorInitData(initialData || null);
        setAdminView('add');
    };

    const handleBackToList = () => {
        setEditingLessonId(null);
        setEditorInitData(null);
        setAdminView('list');
    };

    const handleSaveLesson = () => {
        handleBackToList();
        setShowRebuildPrompt(true);
    };

    const handleManualRebuild = async () => {
        setIsRebuilding(true);
        setRebuildStatus(null);
        const success = await triggerCloudflareRebuild();
        setIsRebuilding(false);
        if (success) {
            setRebuildStatus('Blog rebuild triggered on Cloudflare!');
            setTimeout(() => setRebuildStatus(null), 4000);
        } else {
            setRebuildStatus('Failed to trigger Cloudflare rebuild.');
            setTimeout(() => setRebuildStatus(null), 4000);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Button variant="outline" onClick={onBack} className="mb-8 items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Lessons
                </Button>
                <LoginForm onLoginSuccess={handleLoginSuccess} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-xl">
                        <LayoutDashboard className="w-8 h-8 text-green-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
                        <p className="text-gray-500 text-sm font-medium">Manage your interactive worksheets</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {adminView === 'tts' ? (
                        <Button 
                            variant="outline" 
                            onClick={handleBackToList}
                            className="items-center gap-2 text-sm"
                        >
                            <List className="w-4 h-4" /> Worksheets List
                        </Button>
                    ) : (
                        <Button 
                            variant="outline" 
                            onClick={() => setAdminView('tts')}
                            className="items-center gap-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200"
                        >
                            <Mic className="w-4 h-4 text-purple-600" /> TTS Audio Studio
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        onClick={handleManualRebuild} 
                        disabled={isRebuilding}
                        className="items-center gap-2 text-sm"
                        title="Trigger Cloudflare Pages build to update blog"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
                        {isRebuilding ? 'Rebuilding...' : 'Rebuild Blog'}
                    </Button>
                    <Button variant="outline" onClick={onLogout} className="text-sm">
                        Log Out
                    </Button>
                </div>
            </header>

            {rebuildStatus && (
                <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium transition-all">
                    {rebuildStatus}
                </div>
            )}

            <main>
                {adminView === 'list' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">All Worksheets</h2>
                            <Button onClick={handleAddNew} className="items-center gap-2 px-6">
                                <Plus className="w-5 h-5" /> Add New Worksheet
                            </Button>
                        </div>
                        <LessonList onEdit={handleEditLesson} onPreview={onPreview} onAddNew={handleAddNew} />
                    </>
                )}

                {(adminView === 'add' || adminView === 'edit') && (
                    <LessonEditor 
                        lessonId={editingLessonId} 
                        initialData={editorInitData}
                        onSave={handleSaveLesson} 
                        onCancel={handleBackToList} 
                        onPreview={onPreview}
                    />
                )}

                {adminView === 'tts' && (
                    <TTSGenerator onBack={handleBackToList} />
                )}
            </main>

            <Modal
                isOpen={showRebuildPrompt}
                onClose={() => setShowRebuildPrompt(false)}
                title="Worksheet Saved"
                maxWidth="max-w-md"
            >
                <div className="p-6 text-center space-y-6">
                    <div className="mx-auto w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                        <Rocket className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Rebuild your blog now?</h3>
                        <p className="text-sm text-gray-600">
                            Your worksheet changes have been saved to PocketBase. Would you like to trigger a blog build on Cloudflare to publish your updates?
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowRebuildPrompt(false)}
                            className="px-5"
                        >
                            Later
                        </Button>
                        <Button 
                            onClick={async () => {
                                setShowRebuildPrompt(false);
                                await handleManualRebuild();
                            }}
                            disabled={isRebuilding}
                            className="items-center gap-2 px-6"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
                            Rebuild Blog Now
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


