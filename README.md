# Glorai : a personal augmented blog build with Next.js, OpenAI, LangChain and Supabase

The goal of this repo is to allow you to create a personal blog with a personal assistant that will help you
answer question's from your readers. You can see a demo at https://maximeai.com

The stack is Nextjs and Langchain hosted on Vercel and Supabase for the database.

## Installation

Install the packages: `yarn install`

### Create the table that will store the documents

Run this SQL query in your postgresql database to create the table that will store the documents.
⚠️ Your postgresql database must have the [pgvector extension](https://github.com/pgvector/pgvector) installed.
It is installed on your Supabase instances.
You can also use the provided docker-compose example that use the [official docker image](https://hub.docker.com/r/ankane/pgvector).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

create table documents (
id text NOT NULL primary key,
"pageContent" text, -- corresponds to Document.pageContent
"sourceType" text, -- corresponds to the type of the source
"sourceName" text,
hash text, -- corresponds to Document.hash
metadata jsonb, -- corresponds to Document.metadata
embedding vector(1536) -- 1536 works for OpenAI embeddings, change if needed
);

create table users (
 id text not null,
 name text null,
 email text null,
 created_at timestamp without time zone not null default current_timestamp,
 updated_at timestamp without time zone not null,
 constraint users_pkey primary key (id)
);

create unique index users_email_key on users using btree (email) tablespace pg_default;

create table question (
    id text not null,
    content text null,
    answer text null,
    "successFromLLM" boolean not null default false,
    created_at timestamp without time zone not null default current_timestamp,
    published boolean not null default false,
    "authorId" text null,
    constraint Question_pkey primary key (id),
    constraint Question_authorId_fkey foreign key ("authorId") references users (id) on update cascade on delete set null
);
```

### Update the environment variables

Copy the `.env.local.example` file to `.env.local` and update the variables with your own values.

## Run the development server

Run `yarn dev` to start the development server.

## Deploy on Vercel

You can deploy this project on Vercel. You will need to set the environment variables in the Vercel dashboard.

## Credits

It was started from the [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog).
I have left the original README [here](docs/nextjs-starter-README.md).
I changed a bit the code like not using the analytics and the comments.
