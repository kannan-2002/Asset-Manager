import { useQuery } from '@tanstack/react-query';
import { Package, Users, AlertTriangle, CheckCircle, Boxes, TrendingUp, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { fetchAssets, fetchEmployees, fetchCategories, getStockSummary } from '@/services/database';
import { useMemo } from 'react';

const branches = ['Head Office', 'Branch A', 'Branch B', 'Branch C'];

export default function Dashboard() {
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const stats = useMemo(() => {
    const totalAssets = assets.filter((a: any) => a.status !== 'scrapped').length;
    const availableAssets = assets.filter((a: any) => a.status === 'available').length;
    const assignedAssets = assets.filter((a: any) => a.status === 'assigned').length;
    const repairAssets = assets.filter((a: any) => a.status === 'repair').length;
    const activeEmployees = employees.filter((e: any) => e.is_active).length;
    const totalValue = assets
      .filter((a: any) => a.status !== 'scrapped')
      .reduce((sum: number, a: any) => sum + Number(a.purchase_price), 0);

    return {
      totalAssets,
      availableAssets,
      assignedAssets,
      repairAssets,
      activeEmployees,
      totalValue,
    };
  }, [assets, employees]);

  const stockByBranch = useMemo(() => {
    return branches.map((branch) => {
      const branchAssets = assets.filter(
        (a: any) => a.branch === branch && a.status !== 'scrapped'
      );
      return {
        branch,
        total: branchAssets.length,
        available: branchAssets.filter((a: any) => a.status === 'available').length,
        assigned: branchAssets.filter((a: any) => a.status === 'assigned').length,
        value: branchAssets.reduce((sum: number, a: any) => sum + Number(a.purchase_price), 0),
      };
    });
  }, [assets]);

  const recentAssets = assets
    .filter((a: any) => a.status !== 'scrapped')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const isLoading = assetsLoading || employeesLoading;

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of your asset management system</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Total Assets"
          value={stats.totalAssets}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Available"
          value={stats.availableAssets}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Assigned"
          value={stats.assignedAssets}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="In Repair"
          value={stats.repairAssets}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Active Employees"
          value={stats.activeEmployees}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Total Value"
          value={`$${stats.totalValue.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Branch */}
        <div className="bg-card rounded-lg border border-border p-6 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Stock by Branch
          </h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Available</th>
                  <th className="text-right">Assigned</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {stockByBranch.map((item) => (
                  <tr key={item.branch}>
                    <td className="font-medium">{item.branch}</td>
                    <td className="text-right">{item.total}</td>
                    <td className="text-right text-success">{item.available}</td>
                    <td className="text-right text-primary">{item.assigned}</td>
                    <td className="text-right">${item.value.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold">
                  <td>Total</td>
                  <td className="text-right">
                    {stockByBranch.reduce((sum, b) => sum + b.total, 0)}
                  </td>
                  <td className="text-right text-success">
                    {stockByBranch.reduce((sum, b) => sum + b.available, 0)}
                  </td>
                  <td className="text-right text-primary">
                    {stockByBranch.reduce((sum, b) => sum + b.assigned, 0)}
                  </td>
                  <td className="text-right">
                    ${stockByBranch.reduce((sum, b) => sum + b.value, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Assets */}
        <div className="bg-card rounded-lg border border-border p-6 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Recently Added Assets
          </h2>
          <div className="space-y-3">
            {recentAssets.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No assets yet</p>
            ) : (
              recentAssets.map((asset: any) => {
                const category = categories.find((c: any) => c.id === asset.category_id);
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category?.name || 'Unknown'} • {asset.branch}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${Number(asset.purchase_price).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
