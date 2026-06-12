-- Supabase Database Schema for Invoice Generator SaaS
-- Copy and paste this script into the Supabase SQL Editor.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. PROFILES TABLE
-- =========================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  company_name text,
  email text,
  phone text,
  address text,
  gstin text,
  pan text,
  payment_details jsonb default '{"bankName": "", "accountNumber": "", "ifscCode": "", "routingNumber": "", "paypalEmail": "", "upiId": "", "additionalInstructions": ""}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Allow users to select their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Allow users to insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

create policy "Allow users to update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- =========================================================================
-- 2. CLIENTS TABLE
-- =========================================================================
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text,
  phone text,
  address text,
  gstin text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for clients
alter table public.clients enable row level security;

create policy "Allow users to manage their own clients" 
  on public.clients for all 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create index on user_id for faster queries
create index if not exists clients_user_id_idx on public.clients(user_id);

-- =========================================================================
-- 3. INVOICES TABLE
-- =========================================================================
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  invoice_number text not null,
  client_id uuid references public.clients on delete set null,
  client_name text,
  client_email text,
  client_address text,
  client_phone text,
  client_gstin text,
  issue_date text,
  due_date text,
  items jsonb default '[]'::jsonb not null,
  subtotal numeric default 0 not null,
  discount_rate numeric default 0 not null,
  discount_amount numeric default 0 not null,
  taxable_value numeric default 0 not null,
  gst_rate numeric default 0 not null,
  gst_type text default 'intra' not null,
  gst_amount numeric default 0 not null,
  cgst_amount numeric default 0 not null,
  sgst_amount numeric default 0 not null,
  igst_amount numeric default 0 not null,
  total numeric default 0 not null,
  notes text,
  status text default 'draft' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for invoices
alter table public.invoices enable row level security;

-- Allow users full access to their own invoices
create policy "Allow users to manage their own invoices" 
  on public.invoices for all 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow public access to read a single invoice (for sharing public links)
create policy "Allow public to view shared invoices" 
  on public.invoices for select 
  using (true);

-- Create indexes for faster queries
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);

-- =========================================================================
-- 4. AUTOMATIC PROFILE CREATION TRIGGER
-- =========================================================================
-- Automatically create a profile row in the profiles table when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, company_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'businessName', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
