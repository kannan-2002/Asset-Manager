import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Package, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAssets, fetchEmployees, fetchCategories, issueAsset } from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Asset = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  category_id: string;
  make: string;
  model: string;
  purchase_price: number;
  status: string;
};

type Employee = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  branch: string;
  is_active: boolean;
};

type Category = {
  id: string;
  name: string;
};

export default function IssueAsset() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const issueMutation = useMutation({
    mutationFn: () =>
      issueAsset(selectedAssetId, selectedEmployeeId, notes || null, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['asset-history'] });
      setSelectedAssetId('');
      setSelectedEmployeeId('');
      setNotes('');
      toast.success('Asset issued successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to issue asset');
    },
  });

  const availableAssets = assets.filter((a: Asset) => a.status === 'available');
  const activeEmployees = employees.filter((e: Employee) => e.is_active);

  const selectedAsset = assets.find((a: Asset) => a.id === selectedAssetId);
  const selectedEmployee = employees.find((e: Employee) => e.id === selectedEmployeeId);

  const getCategory = (categoryId: string) =>
    categories.find((c: Category) => c.id === categoryId)?.name || 'Unknown';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedEmployeeId) {
      toast.error('Please select both an asset and an employee');
      return;
    }
    issueMutation.mutate();
  };

  if (assetsLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          Issue Asset
        </h1>
        <p className="page-description">Assign an available asset to an employee</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Form */}
        <Card className="lg:col-span-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Issue Details</CardTitle>
            <CardDescription>Select an asset and employee to proceed</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="asset">Select Asset</Label>
                <Select onValueChange={setSelectedAssetId} value={selectedAssetId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose an available asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No available assets
                      </SelectItem>
                    ) : (
                      availableAssets.map((asset: Asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.asset_code} - {asset.name} ({asset.serial_number})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employee">Select Employee</Label>
                <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map((emp: Employee) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.employee_code} - {emp.first_name} {emp.last_name} ({emp.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about this assignment..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedAssetId || !selectedEmployeeId || issueMutation.isPending}
              >
                {issueMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Issuing...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Issue Asset
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div className="space-y-4">
          {/* Asset Preview */}
          <Card className="animate-slide-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Selected Asset
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAsset ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-medium">{selectedAsset.asset_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedAsset.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-mono text-xs">{selectedAsset.serial_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{getCategory(selectedAsset.category_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Make/Model:</span>
                    <span>
                      {selectedAsset.make} {selectedAsset.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-medium">
                      ${Number(selectedAsset.purchase_price).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No asset selected</p>
              )}
            </CardContent>
          </Card>

          {/* Employee Preview */}
          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Selected Employee
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmployee ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-medium">{selectedEmployee.employee_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-xs">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{selectedEmployee.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch:</span>
                    <span>{selectedEmployee.branch}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No employee selected
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
