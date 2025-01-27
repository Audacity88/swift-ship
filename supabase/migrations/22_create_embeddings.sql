-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store document embeddings
create table if not exists embeddings (
  id bigint primary key generated always as identity,
  title text not null,
  content text not null,
  url text not null,
  embedding vector(1536),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to search embeddings by similarity
create or replace function match_embeddings (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  title text,
  content text,
  url text,
  similarity float
)
language sql stable
as $$
  select
    id,
    title,
    content,
    url,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  where 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- Create down migration
create or replace function revert_20240328_create_embeddings()
returns void
language plpgsql
as $$
begin
  drop function if exists match_embeddings;
  drop table if exists embeddings;
  drop extension if exists vector;
end;
$$; 