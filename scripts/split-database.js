/**
 * One-time migration: copy data from the old single "nestar" database into the
 * per-service databases used by the microservices.
 *
 *   members                -> nestar_member     (member-service)
 *   properties             -> nestar_property   (property-service)
 *   boardArticles,comments -> nestar_community  (community-service)
 *   likes, views, follows  -> nestar_social     (social-service)
 *
 * The source database is only read, never modified.
 * A target collection that already has documents is skipped unless you pass --force
 * (with --force it is emptied first, then copied again).
 *
 * Usage:
 *   npm run db:split                                    (uses MONGO_DEV from .env, source db "nestar")
 *   MONGO_SOURCE_DB=nestar npm run db:split -- --force
 *   docker compose run --rm member-service node scripts/split-database.js
 */
require('dotenv/config');
const { MongoClient } = require('mongoose').mongo;

const PLAN = {
	nestar_member: ['members'],
	nestar_property: ['properties'],
	nestar_community: ['boardArticles', 'comments'],
	nestar_social: ['likes', 'views', 'follows'],
};

const BATCH = 1000;

async function main() {
	const uri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;
	if (!uri) throw new Error('MONGO_DEV (or MONGO_PROD) is not set');
	const sourceName = process.env.MONGO_SOURCE_DB || 'nestar';
	const force = process.argv.includes('--force');

	const client = new MongoClient(uri);
	await client.connect();
	const source = client.db(sourceName);
	const existing = new Set((await source.listCollections().toArray()).map((c) => c.name));
	console.log(`source database: ${sourceName} (${existing.size} collections)`);

	for (const [targetName, collections] of Object.entries(PLAN)) {
		const target = client.db(targetName);
		for (const name of collections) {
			if (!existing.has(name)) {
				console.log(`- ${name}: not in source, skipped`);
				continue;
			}
			const targetCollection = target.collection(name);
			const already = await targetCollection.countDocuments();
			if (already && !force) {
				console.log(`- ${name}: ${targetName} already has ${already} documents, skipped (use --force to copy again)`);
				continue;
			}
			if (already && force) await targetCollection.deleteMany({});

			let copied = 0;
			let buffer = [];
			for await (const doc of source.collection(name).find()) {
				buffer.push(doc);
				if (buffer.length === BATCH) {
					await targetCollection.insertMany(buffer, { ordered: false });
					copied += buffer.length;
					buffer = [];
				}
			}
			if (buffer.length) {
				await targetCollection.insertMany(buffer, { ordered: false });
				copied += buffer.length;
			}

			for (const index of await source.collection(name).indexes()) {
				if (index.name === '_id_') continue;
				const { key, name: indexName, v, ns, ...options } = index;
				await targetCollection.createIndex(key, { name: indexName, ...options }).catch((err) => {
					console.warn(`  index ${indexName} on ${name} not copied: ${err.message}`);
				});
			}
			console.log(`- ${name}: copied ${copied} documents -> ${targetName}`);
		}
	}

	await client.close();
	console.log('done. The old database was not changed; you can drop it later once everything works.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
