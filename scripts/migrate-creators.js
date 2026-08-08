import 'dotenv/config';
import PocketBase from 'pocketbase';
import readline from 'readline';

/**
 * Migration Script: Assign missing creatorId to worksheets
 * Target ID: hauvrgcm22u94dc
 */

const PB_URL = process.env.POCKETBASE_URL || process.env.PUBLIC_POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'https://pb.teacherjake.com';
const TARGET_CREATOR_ID = 'kjksljovpk623jy';

const pb = new PocketBase(PB_URL);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runMigration() {
    console.log(`Connecting to ${PB_URL}...`);

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
            // Try regular user authentication first
            await pb.collection('users').authWithPassword(email, password);
        } catch (err) {
            // Try superuser authentication next
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log('Successfully authenticated.');

        console.log('Fetching worksheets with missing creatorId...');
        // We fetch records where creatorId is empty
        const records = await pb.collection('worksheets').getFullList({
            filter: 'creatorId = "" || creatorId = null',
            sort: '-created',
        });

        console.log(`Found ${records.length} records to update.`);

        if (records.length === 0) {
            console.log('Nothing to do!');
            process.exit(0);
        }

        const confirm = await question(`Are you sure you want to update ${records.length} records to creatorId "${TARGET_CREATOR_ID}"? (y/n): `);
        
        if (confirm.toLowerCase() !== 'y') {
            console.log('Migration cancelled.');
            process.exit(0);
        }

        let updatedCount = 0;
        for (const record of records) {
            try {
                await pb.collection('worksheets').update(record.id, {
                    creatorId: TARGET_CREATOR_ID
                });
                updatedCount++;
                console.log(`[${updatedCount}/${records.length}] Updated record: ${record.id} (${record.title || 'No Title'})`);
            } catch (err) {
                console.error(`Failed to update record ${record.id}:`, err.message);
            }
        }

        console.log('\nMigration complete!');
        console.log(`Successfully updated ${updatedCount} records.`);

    } catch (err) {
        console.error('Error during migration:', err.message);
    } finally {
        rl.close();
    }
}

runMigration();
