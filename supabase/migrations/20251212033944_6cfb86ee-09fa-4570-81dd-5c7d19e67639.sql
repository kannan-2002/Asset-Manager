-- Create enum types
CREATE TYPE public.asset_status AS ENUM ('available', 'assigned', 'repair', 'scrapped');
CREATE TYPE public.return_reason AS ENUM ('upgrade', 'repair', 'resignation', 'transfer', 'other');
CREATE TYPE public.history_action AS ENUM ('purchased', 'issued', 'returned', 'repair', 'scrapped');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create asset categories table
CREATE TABLE public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  branch TEXT NOT NULL,
  designation TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  serial_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.asset_categories(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  warranty_expiry DATE,
  branch TEXT NOT NULL,
  status asset_status NOT NULL DEFAULT 'available',
  current_assignee_id UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create asset assignments table
CREATE TABLE public.asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  issued_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_date TIMESTAMPTZ,
  return_reason return_reason,
  notes TEXT,
  issued_by UUID REFERENCES public.profiles(id),
  returned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create asset history table
CREATE TABLE public.asset_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  action history_action NOT NULL,
  action_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  employee_id UUID REFERENCES public.employees(id),
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create RLS policies for asset_categories (all authenticated users can manage)
CREATE POLICY "Authenticated users can view categories" ON public.asset_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert categories" ON public.asset_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories" ON public.asset_categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete categories" ON public.asset_categories
  FOR DELETE TO authenticated USING (true);

-- Create RLS policies for employees
CREATE POLICY "Authenticated users can view employees" ON public.employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert employees" ON public.employees
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees" ON public.employees
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete employees" ON public.employees
  FOR DELETE TO authenticated USING (true);

-- Create RLS policies for assets
CREATE POLICY "Authenticated users can view assets" ON public.assets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assets" ON public.assets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets" ON public.assets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete assets" ON public.assets
  FOR DELETE TO authenticated USING (true);

-- Create RLS policies for asset_assignments
CREATE POLICY "Authenticated users can view assignments" ON public.asset_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assignments" ON public.asset_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignments" ON public.asset_assignments
  FOR UPDATE TO authenticated USING (true);

-- Create RLS policies for asset_history
CREATE POLICY "Authenticated users can view history" ON public.asset_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert history" ON public.asset_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate employee code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.employees;
  RETURN 'EMP' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create function to generate asset code
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(asset_code FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.assets;
  RETURN 'AST-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;