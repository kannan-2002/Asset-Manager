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
import { fetchEmployees, createEmployee, updateEmployee, generateEmployeeCode } from '@/services/database';
import { toast } from 'sonner';

const branches = ['Head Office', 'Branch A', 'Branch B', 'Branch C'];
const departments = ['IT', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing'];

type Employee = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  branch: string;
  designation: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function Employees() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsAddOpen(false);
      toast.success('Employee added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add employee');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Employee> }) =>
      updateEmployee(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditEmployee(null);
      toast.success('Employee updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update employee');
    },
  });

  const filteredEmployees = employees.filter((emp: Employee) => {
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      if (emp.is_active !== isActive) return false;
    }
    if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
    return true;
  });

  const columns = [
    { key: 'employee_code', header: 'Code' },
    {
      key: 'name',
      header: 'Name',
      render: (emp: Employee) => `${emp.first_name} ${emp.last_name}`,
    },
    { key: 'email', header: 'Email' },
    { key: 'department', header: 'Department' },
    { key: 'branch', header: 'Branch' },
    { key: 'designation', header: 'Designation' },
    {
      key: 'is_active',
      header: 'Status',
      render: (emp: Employee) => (
        <StatusBadge status={emp.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      searchable: false,
      render: (emp: Employee) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setViewEmployee(emp)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditEmployee(emp)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const employeeCode = await generateEmployeeCode();
      
      createMutation.mutate({
        employee_code: employeeCode,
        first_name: formData.get('firstName') as string,
        last_name: formData.get('lastName') as string,
        email: formData.get('email') as string,
        department: formData.get('department') as string,
        branch: formData.get('branch') as string,
        designation: formData.get('designation') as string,
        is_active: true,
      });
    } catch (error) {
      toast.error('Failed to generate employee code');
    }
  };

  const handleEditEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editEmployee) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editEmployee.id,
      updates: {
        first_name: formData.get('firstName') as string,
        last_name: formData.get('lastName') as string,
        email: formData.get('email') as string,
        department: formData.get('department') as string,
        branch: formData.get('branch') as string,
        designation: formData.get('designation') as string,
        is_active: formData.get('isActive') === 'true',
      },
    });
  };

  if (isLoading) {
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
          <h1 className="page-title">Employees</h1>
          <p className="page-description">Manage all employees in your organization</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select name="department" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" name="designation" required />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Employee'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Filters */}
      <div className="filter-bar">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Department:</Label>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        data={filteredEmployees}
        columns={columns}
        searchPlaceholder="Search employees..."
      />

      {/* View Employee Dialog */}
      <Dialog open={!!viewEmployee} onOpenChange={() => setViewEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {viewEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employee Code</Label>
                  <p className="font-medium">{viewEmployee.employee_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>
                    <StatusBadge status={viewEmployee.is_active ? 'active' : 'inactive'} />
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">
                    {viewEmployee.first_name} {viewEmployee.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{viewEmployee.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Department</Label>
                  <p>{viewEmployee.department}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Branch</Label>
                  <p>{viewEmployee.branch}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Designation</Label>
                  <p>{viewEmployee.designation}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Joined</Label>
                  <p>{new Date(viewEmployee.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={() => setEditEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editEmployee && (
            <form onSubmit={handleEditEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    name="firstName"
                    defaultValue={editEmployee.first_name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    name="lastName"
                    defaultValue={editEmployee.last_name}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  name="email"
                  type="email"
                  defaultValue={editEmployee.email}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editDepartment">Department</Label>
                <Select name="department" defaultValue={editEmployee.department}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editBranch">Branch</Label>
                <Select name="branch" defaultValue={editEmployee.branch}>
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
              <div>
                <Label htmlFor="editDesignation">Designation</Label>
                <Input
                  id="editDesignation"
                  name="designation"
                  defaultValue={editEmployee.designation}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select name="isActive" defaultValue={String(editEmployee.is_active)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
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
