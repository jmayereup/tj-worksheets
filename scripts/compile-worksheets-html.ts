import 'dotenv/config';
import PocketBase from 'pocketbase';
import readline from 'readline';
import { compileLessonHtml } from '../utils/htmlCompiler';
import { normalizeContent } from '../utils/contentFormat';

const PB_URL = process.env.POCKETBASE_URL || process.env.PUBLIC_POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'https://pb.teacherjake.com';
const FILES_BASE_URL = process.env.FILES_BASE_URL || 'https://files.teacherjake.com';

const pb = new PocketBase(PB_URL);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

// Parse CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const updateAll = args.includes('--all');

const getFileUrl = (record: any, filename: string) => {
  if (!filename) return '';
  const collection = record.collectionId || record.collectionName;
  const id = record.id;
  
  if (collection && id) {
    return `${FILES_BASE_URL}/${collection}/${id}/${filename}`;
  }
  return '';
};

const compileHtmlForRecord = (record: any): string => {
  const imageUrl = record.image ? getFileUrl(record, record.image) : undefined;
  const audioFileUrl = record.audioFile ? getFileUrl(record, record.audioFile) : undefined;
  
  const parseJSON = (val: any) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
    return val;
  };

  const lessonForCompile = {
    id: record.id,
    title: record.title,
    level: record.level,
    language: record.language,
    tags: record.tags || [],
    isVideoLesson: record.isVideoLesson,
    videoUrl: record.videoUrl,
    lessonType: record.lessonType,
    seo: record.seo,
    teacherCode: record.teacherCode,
    customConfig: parseJSON(record.customConfig),
    content: normalizeContent(record.content),
    imageUrl,
    audioFileUrl,
    created: record.created,
    updated: record.updated
  };

  return compileLessonHtml(lessonForCompile, record.html || '');
};

async function authenticate() {
    let email = process.env.POCKETBASE_ADMIN_EMAIL;
    let password = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!email || !password) {
        email = await question('Enter PocketBase Admin/User Email: ');
        password = await question('Enter Password: ');
    } else {
        console.log(`Using admin credentials from .env (${email})`);
    }

    try {
        console.log('Authenticating...');
        try {
            await pb.collection('users').authWithPassword(email, password);
        } catch (err) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log('Successfully authenticated.');
    } catch (err: any) {
        console.error('Authentication failed:', err.message);
        process.exit(1);
    }
}

async function run() {
    console.log(`Connecting to ${PB_URL}...`);
    if (isDryRun) {
        console.log('--- RUNNING IN DRY RUN MODE (No changes will be saved) ---');
    }
    
    await authenticate();

    try {
        console.log('Fetching worksheets...');
        const records = await pb.collection('worksheets').getFullList({
            sort: '-created',
        });

        console.log(`Found ${records.length} total worksheet records.`);

        // Filter worksheets to compile
        const toProcess = records.filter(record => {
            if (updateAll) return true;
            return !record.htmlCompiled;
        });

        console.log(`Selected ${toProcess.length} worksheets for compilation ${updateAll ? '(all records)' : '(records with missing htmlCompiled)'}.`);

        if (toProcess.length === 0) {
            console.log('No worksheets to update.');
            process.exit(0);
        }

        if (!isDryRun) {
            const confirm = await question(`Are you sure you want to compile and update ${toProcess.length} records? (y/n): `);
            if (confirm.toLowerCase() !== 'y') {
                console.log('Cancelled.');
                process.exit(0);
            }
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < toProcess.length; i++) {
            const record = toProcess[i];
            const prefix = `[${i + 1}/${toProcess.length}]`;
            
            try {
                const compiled = compileHtmlForRecord(record);
                
                if (isDryRun) {
                    console.log(`${prefix} [DRY RUN] Compiled HTML for: ${record.title} (${record.id}) - length: ${compiled.length} chars`);
                    successCount++;
                } else {
                    await pb.collection('worksheets').update(record.id, {
                        htmlCompiled: compiled
                    });
                    console.log(`${prefix} Updated htmlCompiled for: ${record.title} (${record.id})`);
                    successCount++;
                }
            } catch (err: any) {
                console.error(`${prefix} Failed to update/compile for ${record.title} (${record.id}):`, err.message);
                failCount++;
            }
        }

        console.log(`\nCompilation complete!`);
        console.log(`Success: ${successCount}`);
        console.log(`Failures: ${failCount}`);

    } catch (error: any) {
        console.error('Error running script:', error.message);
    } finally {
        rl.close();
    }
}

run();
