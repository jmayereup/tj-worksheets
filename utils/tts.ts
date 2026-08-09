
export const getVoiceQualityScore = (
    voice: SpeechSynthesisVoice,
    targetLangCode: string,
): number => {
    let score = 0;
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase().replace('_', '-');
    const target = targetLangCode.toLowerCase().replace('_', '-');
    const targetPrimary = target.split('-')[0];

    // 1. Language matching precision
    if (lang === target) {
        score += 10;
    } else if (
        lang.startsWith(targetPrimary) ||
        targetPrimary.startsWith(lang.split('-')[0])
    ) {
        score += 5;
    } else if (name.includes('multilingual') || name.includes('multi-lingual')) {
        score += 5;
    } else {
        // Heavy penalty for non-matching language
        score -= 100;
    }

    // 2. High-Quality / Neural / Multilingual Tier
    if (name.includes('multilingual') || name.includes('multi-lingual'))
        score += 25;
    if (name.includes('enhanced')) score += 25;
    if (name.includes('premium')) score += 25;
    if (name.includes('natural')) score += 20;
    if (name.includes('neural')) score += 20;
    if (name.includes('wavenet')) score += 20;

    // 3. Siri & Alex Apple Voices
    if (name.includes('siri')) score += 15;
    if (name.includes('alex')) score += 15;

    // 4. Android / Google / Online Voices
    if (name.includes('google')) score += 12;
    if (name.includes('online')) score += 10;

    // 5. System Defaults & Local Service
    if (voice.default) score += 5;
    if (voice.localService) score += 2;

    // 6. Low-Quality Penalties
    if (name.includes('compact')) score -= 20;
    if (
        /novelty|boing|whisper|deranged|cellos|zarvox|pipe|bad news|albert|fred|trinoids/i.test(
            name,
        )
    ) {
        score -= 30;
    }

    return score;
};

export const getBestVoice = (lang: string): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const sorted = [...voices].sort(
        (a, b) => getVoiceQualityScore(b, lang) - getVoiceQualityScore(a, lang),
    );

    return sorted[0] || null;
};

export const getVoicesForLang = (lang: string): SpeechSynthesisVoice[] => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang.split(/[-_]/)[0].toLowerCase();

    const matchingVoices = voices.filter(
        (v) =>
            v.lang.toLowerCase() === lang.toLowerCase() ||
            v.lang.split(/[-_]/)[0].toLowerCase() === langPrefix ||
            v.name.toLowerCase().includes('multilingual') ||
            v.name.toLowerCase().includes('multi-lingual'),
    );

    return matchingVoices.sort(
        (a, b) => getVoiceQualityScore(b, lang) - getVoiceQualityScore(a, lang),
    );
};

export const speak = (text: string, lang: string, rate: number = 1.0, voiceName?: string | null) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (voiceName) {
        const selectedVoice = voices.find(v => v.name === voiceName);
        if (selectedVoice) {
            const langPrefix = lang.split(/[-_]/)[0].toLowerCase();
            const voicePrefix = selectedVoice.lang.split(/[-_]/)[0].toLowerCase();
            if (langPrefix === voicePrefix) {
                utterance.voice = selectedVoice;
            }
        }
    }

    if (!utterance.voice) {
        const bestVoice = getBestVoice(lang);
        if (bestVoice) {
            utterance.voice = bestVoice;
        }
    }

    utterance.lang = lang; // Always set lang

    utterance.rate = rate;
    try {
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('speechSynthesis.speak() failed:', e);
    }
    return utterance;
};
