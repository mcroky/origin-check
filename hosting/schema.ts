import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const originBudget=sqliteTable('origin_budget',{
 bucket:text('bucket').primaryKey(),
 used:integer('used').notNull(),
 expiresAt:integer('expires_at').notNull()
});
