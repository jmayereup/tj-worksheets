export const config = {
    deployHookUrl: 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/9bcde703-70bb-4046-8794-fed92562fe0c',
    teacherInfoRecordId: 'sztxr8rn7a7uyun',
    gasSubmissionUrl: (typeof process !== 'undefined' && process.env?.VITE_GAS_SUBMISSION_URL) || (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GAS_SUBMISSION_URL || import.meta.env?.VITE_SUBMISSION_URL)) || ''
};

