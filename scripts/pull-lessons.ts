import 'dotenv/config';
import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connection details from services/pocketbase.ts
const PB_URL = process.env.POCKETBASE_URL || process.env.PUBLIC_POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'https://pb.teacherjake.com';
const pb = new PocketBase(PB_URL);

async function authenticate() {
    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;
    if (email && password) {
        console.log(`Authenticating with admin credentials from .env (${email})...`);
        try {
            // Try to authenticate as a regular user first
            await pb.collection('users').authWithPassword(email, password);
            console.log('Successfully authenticated as user.');
        } catch (e) {
            try {
                // Try to authenticate as a superuser (admin) in PocketBase v0.23+
                await pb.collection('_superusers').authWithPassword(email, password);
                console.log('Successfully authenticated as superuser.');
            } catch (se) {
                console.warn('Failed to authenticate as user or superuser:', se.message);
            }
        }
    } else {
        console.log('No admin credentials found in .env. Attempting anonymous request...');
    }
}

async function pullLessons() {
    console.log(`Connecting to ${PB_URL}...`);
    await authenticate();
    
    try {
        // Fetch all lessons from the worksheets collection
        // Based on pocketbase-types.ts, the collection is 'worksheets'
        // and the tags are WorksheetsTagsOptions[]
        const records = await pb.collection('worksheets').getFullList({
            sort: '-created',
        });

        console.log(`Found ${records.length} total lessons.`);

        // Filter for M1-2 or science tags
        const filteredLessons = records.filter(record => {
            const tags = record.tags || [];
            return tags.includes('M1-2') || tags.includes('science');
        });

        console.log(`Filtered down to ${filteredLessons.length} lessons with 'M1-2' or 'science' tags.`);

        // Format into markdown links: [title](https://www.teacherjake.com/pb/[id])
        const markdownLines = filteredLessons.map(lesson => {
            const title = lesson.title || 'Untitled Lesson';
            const url = `https://www.teacherjake.com/pb/${lesson.id}`;
            return `[${title}](${url})`;
        });

        const outputContent = markdownLines.join('\n');
        const outputPath = path.resolve(__dirname, '../Reference/pocketbase_lessons.md');

        // Ensure directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, outputContent);
        console.log(`Successfully wrote ${markdownLines.length} links to ${outputPath}`);

    } catch (error) {
        console.error('Error pulling lessons:', error);
        process.exit(1);
    }
}

pullLessons();
