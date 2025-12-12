import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertTriangle, Package, Loader2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAssets, fetchCategories, scrapAsset } from '@/services/database';
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
  purchase_date: string;
  purchase_price: number;
  status: string;
};

type Category = {
  id: string;
  name: string;
};

export default function ScrapAsset() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [scrapReason, setScrapReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const scrapMutation = useMutation({
    mutationFn: () => scrapAsset(selectedAssetId, scrapReason, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-history'] });
      setSelectedAssetId('');
      setScrapReason('');
      setShowConfirm(false);
      toast.success('Asset marked as scrapped');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to scrap asset');
    },
  });

  // Only available or repair assets can be scrapped
  const scrappableAssets = assets.filter(
    (a: Asset) => a.status === 'available' || a.status === 'repair'
  );
  const selectedAsset = assets.find((a: Asset) => a.id === selectedAssetId);

  const getCategory = (categoryId: string) =>
    categories.find((c: Category) => c.id === categoryId)?.name || 'Unknown';

  const getAssetAge = (purchaseDate: string) => {
    const years = Math.floor(
      (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
    return years;
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
          <Trash2 className="h-6 w-6 text-destructive" />
          Scrap Asset
        </h1>
        <p className="page-description">Mark obsolete assets as scrapped</p>
      </header>

      {/* Warning Banner */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-start gap-3 animate-fade-in">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">Important Notice</p>
          <p className="text-sm text-muted-foreground mt-1">
            Scrapped assets will be removed from active inventory and will only appear in reports.
            This action is permanent and should only be used for assets that are no longer usable.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scrap Form */}
        <Card className="lg:col-span-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Scrap Details</CardTitle>
            <CardDescription>
              Select an available or repair-status asset to mark as obsolete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="asset">Select Asset</Label>
                <Select onValueChange={setSelectedAssetId} value={selectedAssetId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose an asset to scrap" />
                  </SelectTrigger>
                  <SelectContent>
                    {scrappableAssets.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No assets available for scrapping
                      </SelectItem>
                    ) : (
                      scrappableAssets.map((asset: Asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.asset_code} - {asset.name} ({asset.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason for Scrapping</Label>
                <Textarea
                  id="reason"
                  value={scrapReason}
                  onChange={(e) => setScrapReason(e.target.value)}
                  placeholder="Describe why this asset is being scrapped (e.g., hardware failure, obsolete, damaged beyond repair)..."
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <Button
                variant="destructive"
                className="w-full"
                disabled={!selectedAssetId || !scrapReason.trim()}
                onClick={() => setShowConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Mark as Scrapped
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Asset Preview */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Asset to Scrap
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAsset ? (
              <div className="space-y-3">
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
                    <span className="text-muted-foreground">Purchase Date:</span>
                    <span>{new Date(selectedAsset.purchase_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Value:</span>
                    <span className="font-medium text-destructive">
                      ${Number(selectedAsset.purchase_price).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Asset age: {getAssetAge(selectedAsset.purchase_date)} years
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No asset selected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Asset Scrapping
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to mark <strong>{selectedAsset?.name}</strong> (
              {selectedAsset?.asset_code}) as scrapped. This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove the asset from active inventory</li>
                <li>Hide it from all pages except reports</li>
                <li>Record the scrap in asset history</li>
              </ul>
              <p className="mt-2 font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => scrapMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={scrapMutation.isPending}
            >
              {scrapMutation.isPending ? 'Processing...' : 'Confirm Scrap'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
