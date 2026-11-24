/**
 * Message patterns (the "API" of each microservice over TCP).
 * Gateway and services import these constants so names never drift apart.
 */
export const MEMBER = {
	SIGNUP: 'member.signup',
	LOGIN: 'member.login',
	UPDATE: 'member.update',
	GET: 'member.get',
	AGENTS: 'member.agents',
	LIKE: 'member.like',
	ADMIN_LIST: 'member.admin.list',
	ADMIN_UPDATE: 'member.admin.update',
	STATS: 'member.stats',
	BY_IDS: 'member.byIds',
	BATCH_ROLLBACK: 'member.batch.rollback',
	BATCH_RANK: 'member.batch.rank',
} as const;

export const PROPERTY = {
	CREATE: 'property.create',
	GET: 'property.get',
	UPDATE: 'property.update',
	LIST: 'property.list',
	AGENT_LIST: 'property.agentList',
	LIKE: 'property.like',
	ADMIN_LIST: 'property.admin.list',
	ADMIN_UPDATE: 'property.admin.update',
	ADMIN_REMOVE: 'property.admin.remove',
	STATS: 'property.stats',
	BY_IDS: 'property.byIds',
	FOR_AI: 'property.forAi',
	BATCH_ROLLBACK: 'property.batch.rollback',
	BATCH_RANK: 'property.batch.rank',
} as const;

export const ARTICLE = {
	CREATE: 'article.create',
	GET: 'article.get',
	UPDATE: 'article.update',
	LIST: 'article.list',
	LIKE: 'article.like',
	ADMIN_LIST: 'article.admin.list',
	ADMIN_UPDATE: 'article.admin.update',
	ADMIN_REMOVE: 'article.admin.remove',
	STATS: 'article.stats',
} as const;

export const COMMENT = {
	CREATE: 'comment.create',
	UPDATE: 'comment.update',
	LIST: 'comment.list',
	ADMIN_REMOVE: 'comment.admin.remove',
} as const;

export const SOCIAL = {
	VIEW_RECORD: 'view.record',
	VIEW_VISITED: 'view.visited',
	LIKE_TOGGLE: 'like.toggle',
	LIKE_CHECK: 'like.check',
	LIKE_CHECK_MANY: 'like.checkMany',
	LIKE_FAVORITES: 'like.favorites',
	FOLLOW_SUBSCRIBE: 'follow.subscribe',
	FOLLOW_UNSUBSCRIBE: 'follow.unsubscribe',
	FOLLOW_FOLLOWINGS: 'follow.followings',
	FOLLOW_FOLLOWERS: 'follow.followers',
	FOLLOW_CHECK: 'follow.check',
} as const;

export const AI = {
	CHAT: 'ai.chat',
} as const;
