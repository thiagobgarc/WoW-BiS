import { boolean, integer, jsonb, pgTable, real, serial, text, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { Source } from '@/lib/bis/types';

export const bisLists = pgTable(
  'bis_lists',
  {
    id: serial('id').primaryKey(),
    season: text('season').notNull(),
    class: text('class').notNull(),
    spec: text('spec').notNull(),
    armorType: text('armor_type').notNull(),
    statPriority: jsonb('stat_priority').$type<string[]>().notNull(),
  },
  (table) => [unique('bis_lists_season_class_spec_unique').on(table.season, table.class, table.spec)],
);

export const bisListsRelations = relations(bisLists, ({ many }) => ({
  entries: many(bisEntries),
}));

export const bisEntries = pgTable('bis_entries', {
  id: serial('id').primaryKey(),
  bisListId: integer('bis_list_id')
    .notNull()
    .references(() => bisLists.id, { onDelete: 'cascade' }),
  slot: text('slot').notNull(),
  contentType: text('content_type').notNull(),
  rank: integer('rank').notNull(),
  itemId: integer('item_id').notNull(),
  itemName: text('item_name').notNull(),
  itemLevel: integer('item_level').notNull(),
  source: jsonb('source').$type<Source>().notNull(),
  tierPiece: boolean('tier_piece').notNull().default(false),
  catalystable: boolean('catalystable').notNull().default(false),
  statPriorityFit: real('stat_priority_fit').notNull(),
  notes: text('notes'),
});

export const bisEntriesRelations = relations(bisEntries, ({ one }) => ({
  list: one(bisLists, { fields: [bisEntries.bisListId], references: [bisLists.id] }),
}));
