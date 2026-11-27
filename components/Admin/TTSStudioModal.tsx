import React, { useEffect, useId, useRef } from 'react';
import { Mic, X, Zap } from 'lucide-react';
import { TTSGenerator } from './TTSGenerator';

interface TTSStudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAudioGenerated?: (r2Url: string | null, localUrl: string) => void;
}

export const TTSStudioModal: React.FC<TTSStudioModalProps> = ({
    isOpen,
    onClose,
    onAudioGenerated,
}) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleClose = () => {
            dialog.returnValue = '';
            if (isOpen) {
                onClose();
            }
        };

        dialog.addEventListener('close', handleClose);
        return () => dialog.removeEventListener('close', handleClose);
    }, [isOpen, onClose]);

    // Fallback light-dismiss for browsers without <dialog closedby="any"> support (e.g., Safari)
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

        const isOutside = (e: PointerEvent) => {
            const rect = dialog.getBoundingClientRect();
            return (
                e.clientX < rect.left ||
                e.clientX > rect.right ||
                e.clientY < rect.top ||
                e.clientY > rect.bottom
            );
        };

        let pressedOutside = false;
        const handlePointerDown = (e: PointerEvent) => {
            pressedOutside = isOutside(e);
        };
        const handlePointerUp = (e: PointerEvent) => {
            if (pressedOutside && isOutside(e)) {
                dialog.close();
            }
            pressedOutside = false;
        };

        dialog.addEventListener('pointerdown', handlePointerDown);
        dialog.addEventListener('pointerup', handlePointerUp);
        return () => {
            dialog.removeEventListener('pointerdown', handlePointerDown);
            dialog.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            {...({ closedby: 'any' } as any)}
            className="tts-studio-dialog m-auto w-[min(96vw,72rem)] max-h-[90vh] flex-col rounded-3xl bg-gray-50 p-0 shadow-2xl border border-gray-200 overflow-hidden"
        >
            <div className="flex items-center justify-between gap-4 bg-white px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                        <Mic className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 id={titleId} className="text-lg font-bold text-gray-900 leading-tight">
                            TTS Audio Studio
                        </h1>
                        <p className="text-xs text-gray-500">
                            Generate MP3 audio without leaving your worksheet
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                        <Zap className="w-3.5 h-3.5" /> High-Efficiency VBR MP3
                    </span>
                    <button
                        type="button"
                        onClick={() => dialogRef.current?.close()}
                        aria-label="Close TTS Audio Studio"
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
                {isOpen && (
                    <TTSGenerator
                        isModal
                        onBack={() => dialogRef.current?.close()}
                        onAudioGenerated={onAudioGenerated}
                    />
                )}
            </div>
        </dialog>
    );
};
