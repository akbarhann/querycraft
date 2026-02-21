import { parseSqlSchema } from './src/utils/parser';

const sampleSql = `
-- This is a sample dump
CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE orders (
    id integer PRIMARY KEY,
    user_id integer,
    total decimal(10,2),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

ALTER TABLE ONLY public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
`;

const result = parseSqlSchema(sampleSql);
console.log(JSON.stringify(result, null, 2));

if (result.tables.length === 2 && result.relations.length === 2 && result.tables[0].columns.includes('username')) {
    console.log("✅ Parser Test Passed!");
} else {
    console.error("❌ Parser Test Failed!");
    process.exit(1);
}
