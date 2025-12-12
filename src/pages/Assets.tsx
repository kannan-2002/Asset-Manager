import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { 
  fetchAssets, 
  fetchCategories, 
  fetchEmployees,
  createAsset, 
  updateAsset,
  createAssetHistory,
  generateAssetCode 
} from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const branches = ['Head Office', 'Branch A', 'Branch B', 'Branch C'];

type Asset = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  category_id: string;
  make: string;
  model: string;
  purchase_date: string;
  purchase_price: number;
  warranty_expiry: string | null;
  branch: string;
  status: 'available' | 'assigned' | 'repair' | 'scrapped';
  current_assignee_id: string | null;
  category: { id: string; name: string } | null;
  current_assignee: { id: string; first_name: string; last_name: string } | null;
};

type Category = {
  id: string;
  name: string;
};

export default function Assets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const createMutation = useMutation({
    mutationFn: async (asset: Parameters<typeof createAsset>[0]) => {
      const result = await createAsset(asset);
      // Add purchase history
      await createAssetHistory({
        asset_id: result.id,
        action: 'purchased',
        notes: 'Initial purchase',
        performed_by: user?.id || null,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-history'] });
      setIsAddOpen(false);
      toast.success('Asset added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add asset');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Asset> }) =>
      updateAsset(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setEditAsset(null);
      toast.success('Asset updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update asset');
    },
  });

  const filteredAssets = assets.filter((asset: Asset) => {
    if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && asset.category_id !== categoryFilter) return false;
    return true;
  });

  const columns = [
    { key: 'asset_code', header: 'Asset Code' },
    { key: 'serial_number', header: 'Serial Number' },
    { key: 'name', header: 'Name' },
    {
      key: 'category_id',
      header: 'Category',
      render: (asset: Asset) => asset.category?.name || 'Unknown',
    },
    {
      key: 'makeModel',
      header: 'Make/Model',
      render: (asset: Asset) => `${asset.make} ${asset.model}`,
    },
    { key: 'branch', header: 'Branch' },
    {
      key: 'status',
      header: 'Status',
      render: (asset: Asset) => <StatusBadge status={asset.status} />,
    },
    {
      key: 'assignee',
      header: 'Assigned To',
      render: (asset: Asset) =>
        asset.current_assignee
          ? `${asset.current_assignee.first_name} ${asset.current_assignee.last_name}`
          : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      searchable: false,
      render: (asset: Asset) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setViewAsset(asset)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditAsset(asset)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleAddAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const assetCode = await generateAssetCode();

      createMutation.mutate({
        asset_code: assetCode,
        serial_number: formData.get('serialNumber') as string,
        name: formData.get('name') as string,
        category_id: formData.get('categoryId') as string,
        make: formData.get('make') as string,
        model: formData.get('model') as string,
        purchase_date: formData.get('purchaseDate') as string,
        purchase_price: Number(formData.get('purchasePrice')),
        warranty_expiry: formData.get('warrantyExpiry') as string || null,
        branch: formData.get('branch') as string,
        status: 'available',
      });
    } catch (error) {
      toast.error('Failed to generate asset code');
    }
  };

  const handleEditAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editAsset) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editAsset.id,
      updates: {
        serial_number: formData.get('serialNumber') as string,
        name: formData.get('name') as string,
        category_id: formData.get('categoryId') as string,
        make: formData.get('make') as string,
        model: formData.get('model') as string,
        branch: formData.get('branch') as string,
      },
    });
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
      <header className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="page-description">Manage all company assets</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input id="serialNumber" name="serialNumber" required />
                </div>
                <div>
                  <Label htmlFor="name">Asset Name</Label>
                  <Input id="name" name="name" required />
                </div>
              </div>
              <div>
                <Label htmlFor="categoryId">Category</Label>
                <Select name="categoryId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: Category) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="make">Make</Label>
                  <Input id="make" name="make" required />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" name="model" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input id="purchaseDate" name="purchaseDate" type="date" required />
                </div>
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                  <Input
                    id="purchasePrice"
                    name="purchasePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                  <Input id="warrantyExpiry" name="warrantyExpiry" type="date" />
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Select name="branch" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Asset'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Filters */}
      <div className="filter-bar">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Category:</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: Category) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="repair">In Repair</SelectItem>
              <SelectItem value="scrapped">Scrapped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        data={filteredAssets}
        columns={columns}
        searchPlaceholder="Search by name, serial, make, model..."
      />

      {/* View Asset Dialog */}
      <Dialog open={!!viewAsset} onOpenChange={() => setViewAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {viewAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Asset Code</Label>
                  <p className="font-medium">{viewAsset.asset_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Serial Number</Label>
                  <p className="font-medium">{viewAsset.serial_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{viewAsset.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p>{viewAsset.category?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Make / Model</Label>
                  <p>
                    {viewAsset.make} {viewAsset.model}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Branch</Label>
                  <p>{viewAsset.branch}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Date</Label>
                  <p>{new Date(viewAsset.purchase_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Price</Label>
                  <p className="font-medium">${Number(viewAsset.purchase_price).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Warranty Expiry</Label>
                  <p>
                    {viewAsset.warranty_expiry
                      ? new Date(viewAsset.warranty_expiry).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>
                    <StatusBadge status={viewAsset.status} />
                  </p>
                </div>
                {viewAsset.current_assignee && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Assigned To</Label>
                    <p className="font-medium">
                      {viewAsset.current_assignee.first_name}{' '}
                      {viewAsset.current_assignee.last_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={!!editAsset} onOpenChange={() => setEditAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>
          {editAsset && (
            <form onSubmit={handleEditAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editSerialNumber">Serial Number</Label>
                  <Input
                    id="editSerialNumber"
                    name="serialNumber"
                    defaultValue={editAsset.serial_number}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editName">Asset Name</Label>
                  <Input id="editName" name="name" defaultValue={editAsset.name} required />
                </div>
              </div>
              <div>
                <Label htmlFor="editCategoryId">Category</Label>
                <Select name="categoryId" defaultValue={editAsset.category_id}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: Category) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editMake">Make</Label>
                  <Input id="editMake" name="make" defaultValue={editAsset.make} required />
                </div>
                <div>
                  <Label htmlFor="editModel">Model</Label>
                  <Input id="editModel" name="model" defaultValue={editAsset.model} required />
                </div>
              </div>
              <div>
                <Label htmlFor="editBranch">Branch</Label>
                <Select name="branch" defaultValue={editAsset.branch}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
