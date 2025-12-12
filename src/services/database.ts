import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AssetCategory = Database['public']['Tables']['asset_categories']['Row'];
type AssetCategoryInsert = Database['public']['Tables']['asset_categories']['Insert'];
type AssetCategoryUpdate = Database['public']['Tables']['asset_categories']['Update'];

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

type Asset = Database['public']['Tables']['assets']['Row'];
type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['assets']['Update'];

type AssetAssignment = Database['public']['Tables']['asset_assignments']['Row'];
type AssetAssignmentInsert = Database['public']['Tables']['asset_assignments']['Insert'];

type AssetHistory = Database['public']['Tables']['asset_history']['Row'];
type AssetHistoryInsert = Database['public']['Tables']['asset_history']['Insert'];

// ============ Categories ============
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('asset_categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function createCategory(category: AssetCategoryInsert) {
  const { data, error } = await supabase
    .from('asset_categories')
    .insert(category)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: AssetCategoryUpdate) {
  const { data, error } = await supabase
    .from('asset_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('asset_categories')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ Employees ============
export async function fetchEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('first_name');
  
  if (error) throw error;
  return data;
}

export async function generateEmployeeCode(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_employee_code');
  if (error) throw error;
  return data as string;
}

export async function createEmployee(employee: EmployeeInsert) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEmployee(id: string, updates: EmployeeUpdate) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Assets ============
export async function fetchAssets() {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      category:asset_categories(*),
      current_assignee:employees(*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function generateAssetCode(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_asset_code');
  if (error) throw error;
  return data as string;
}

export async function createAsset(asset: AssetInsert) {
  const { data, error } = await supabase
    .from('assets')
    .insert(asset)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAsset(id: string, updates: AssetUpdate) {
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Asset Assignments ============
export async function fetchAssignments() {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(`
      *,
      asset:assets(*),
      employee:employees(*)
    `)
    .order('issued_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createAssignment(assignment: AssetAssignmentInsert) {
  const { data, error } = await supabase
    .from('asset_assignments')
    .insert(assignment)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAssignment(id: string, updates: Partial<AssetAssignment>) {
  const { data, error } = await supabase
    .from('asset_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Asset History ============
export async function fetchAssetHistory(assetId?: string) {
  let query = supabase
    .from('asset_history')
    .select(`
      *,
      asset:assets(*),
      employee:employees(*)
    `)
    .order('action_date', { ascending: false });
  
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function createAssetHistory(history: AssetHistoryInsert) {
  const { data, error } = await supabase
    .from('asset_history')
    .insert(history)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Issue Asset ============
export async function issueAsset(
  assetId: string, 
  employeeId: string, 
  notes: string | null,
  issuedBy: string
) {
  // Start a transaction-like operation
  // 1. Update asset status and assignee
  const { error: assetError } = await supabase
    .from('assets')
    .update({ 
      status: 'assigned' as const, 
      current_assignee_id: employeeId 
    })
    .eq('id', assetId);
  
  if (assetError) throw assetError;

  // 2. Create assignment record
  const { error: assignmentError } = await supabase
    .from('asset_assignments')
    .insert({
      asset_id: assetId,
      employee_id: employeeId,
      notes,
      issued_by: issuedBy,
    });
  
  if (assignmentError) throw assignmentError;

  // 3. Create history record
  const { error: historyError } = await supabase
    .from('asset_history')
    .insert({
      asset_id: assetId,
      action: 'issued' as const,
      employee_id: employeeId,
      notes,
      performed_by: issuedBy,
    });
  
  if (historyError) throw historyError;
}

// ============ Return Asset ============
export async function returnAsset(
  assetId: string,
  returnReason: Database['public']['Enums']['return_reason'],
  notes: string | null,
  returnedBy: string
) {
  // 1. Get current assignment
  const { data: assignment, error: fetchError } = await supabase
    .from('asset_assignments')
    .select('*')
    .eq('asset_id', assetId)
    .is('returned_date', null)
    .single();
  
  if (fetchError) throw fetchError;

  // 2. Update asset status
  const { error: assetError } = await supabase
    .from('assets')
    .update({ 
      status: 'available' as const, 
      current_assignee_id: null 
    })
    .eq('id', assetId);
  
  if (assetError) throw assetError;

  // 3. Update assignment record
  const { error: assignmentError } = await supabase
    .from('asset_assignments')
    .update({
      returned_date: new Date().toISOString(),
      return_reason: returnReason,
      notes,
      returned_by: returnedBy,
    })
    .eq('id', assignment.id);
  
  if (assignmentError) throw assignmentError;

  // 4. Create history record
  const { error: historyError } = await supabase
    .from('asset_history')
    .insert({
      asset_id: assetId,
      action: 'returned' as const,
      employee_id: assignment.employee_id,
      notes: `Return reason: ${returnReason}. ${notes || ''}`.trim(),
      performed_by: returnedBy,
    });
  
  if (historyError) throw historyError;
}

// ============ Scrap Asset ============
export async function scrapAsset(
  assetId: string,
  notes: string,
  performedBy: string
) {
  // 1. Update asset status
  const { error: assetError } = await supabase
    .from('assets')
    .update({ 
      status: 'scrapped' as const, 
      current_assignee_id: null 
    })
    .eq('id', assetId);
  
  if (assetError) throw assetError;

  // 2. Create history record
  const { error: historyError } = await supabase
    .from('asset_history')
    .insert({
      asset_id: assetId,
      action: 'scrapped' as const,
      notes,
      performed_by: performedBy,
    });
  
  if (historyError) throw historyError;
}

// ============ Stock Summary ============
export async function getStockSummary() {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      branch,
      status,
      purchase_price,
      category:asset_categories(id, name)
    `)
    .neq('status', 'scrapped');
  
  if (error) throw error;
  return data;
}

// ============ Reports ============
export async function getScrappedAssets() {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      category:asset_categories(name)
    `)
    .eq('status', 'scrapped')
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getAssetUtilization() {
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('*');
  
  if (assetsError) throw assetsError;

  const { data: history, error: historyError } = await supabase
    .from('asset_history')
    .select('*');
  
  if (historyError) throw historyError;

  return { assets, history };
}
