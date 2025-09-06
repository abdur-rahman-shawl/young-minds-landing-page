import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

// ======== COUNTRIES TABLE ========
// Stores all the countries
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // ISO 3166-1 alpha-2 country code (e.g., 'IN', 'US')
  code: varchar("code", { length: 2 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
});

// ======== STATES TABLE ========
// Stores states, provinces, or regions within a country
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  countryId: integer("country_id")
    .notNull()
    .references(() => countries.id),
  countryCode: varchar("country_code")
  .notNull()
  .references(() => countries.code),
  code: varchar("code", { length: 2 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
});

// ======== CITIES TABLE ========
// Stores cities within a state
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stateId: integer("state_id")
    .notNull()
    .references(() => states.id),
  stateCode: varchar("state_code")
    .notNull()
    .references(() => states.code),
  countryId: integer("country_id")
    .notNull()
    .references(() => countries.id),
  countryCode: varchar("country_code")
  .notNull()
  .references(() => countries.code),
  isActive: boolean("is_active").default(true).notNull(),
});

export const countryRelations = relations(countries, ({ many }) => ({
  // A country can have many states
  states: many(states),
  // A country can also have many cities (based on the direct foreign key)
  cities: many(cities),
}));

export const stateRelations = relations(states, ({ one, many }) => ({
  // Each state belongs to one country
  country: one(countries, {
    fields: [states.countryId],
    references: [countries.id],
  }),
  // A state can have many cities
  cities: many(cities),
}));

export const cityRelations = relations(cities, ({ one }) => ({
  // Each city belongs to one state
  state: one(states, {
    fields: [cities.stateId],
    references: [states.id],
  }),
  // Each city also belongs to one country (based on the direct foreign key)
  country: one(countries, {
    fields: [cities.countryId],
    references: [countries.id],
  }),
}));