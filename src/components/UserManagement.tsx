import { useState } from 'react';
import { useAuth, User } from './AuthContext';
import { useCompanies } from './CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Users, Plus, Edit, Trash2, AlertCircle, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function UserManagement() {
  const { user, users, addUser, updateUser, deleteUser } = useAuth();
  const { companies, getCompany } = useCompanies();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sales_user' as 'super_admin' | 'company_admin' | 'team_lead' | 'sales_user',
    companyId: '',
    password: '',
    isActive: true,
  });

  if (!user) return null;

  // Check access rights
  const canManageUsers = ['super_admin', 'company_admin', 'team_lead'].includes(user.role);
  
  if (!canManageUsers) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: You don't have permission to manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get users based on role
  const displayUsers = user.role === 'super_admin'
    ? users // Super admin sees all users
    : users.filter(u => u.companyId === user.companyId); // Company users see only their company

  // Get available companies for user creation
  const availableCompanies = user.role === 'super_admin'
    ? companies
    : companies.filter(c => c.id === user.companyId);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'sales_user',
      companyId: user.role === 'super_admin' ? '' : user.companyId || '',
      password: '',
      isActive: true,
    });
  };

  const handleAdd = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (user.role !== 'super_admin' && formData.role === 'super_admin') {
      toast.error('Only Super Admin can create Super Admin users');
      return;
    }

    if (formData.role !== 'super_admin' && !formData.companyId) {
      toast.error('Please select a company');
      return;
    }

    // Check if email already exists
    if (users.some(u => u.email === formData.email)) {
      toast.error('Email already exists');
      return;
    }

    const userData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      companyId: formData.role === 'super_admin' ? null : formData.companyId,
      password: formData.password,
      isActive: formData.isActive,
    };

    addUser(userData);
    toast.success(`User "${formData.name}" created successfully!`);
    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      role: userToEdit.role,
      companyId: userToEdit.companyId || '',
      password: '',
      isActive: userToEdit.isActive,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedUser) return;

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updates: Partial<User> & { password?: string } = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      companyId: formData.role === 'super_admin' ? null : formData.companyId,
      isActive: formData.isActive,
    };

    if (formData.password && formData.password.trim()) {
      updates.password = formData.password;
    }

    updateUser(selectedUser.id, updates);
    toast.success(`User "${formData.name}" updated successfully!`);
    setShowEditDialog(false);
    setSelectedUser(null);
    resetForm();
  };

  const handleDelete = (userToDelete: User) => {
    if (userToDelete.id === user.id) {
      toast.error("You cannot delete your own account");
      return;
    }

    if (confirm(`Are you sure you want to delete user "${userToDelete.name}"?`)) {
      deleteUser(userToDelete.id);
      toast.success(`User "${userToDelete.name}" deleted successfully!`);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'company_admin': return 'default';
      case 'team_lead': return 'secondary';
      case 'sales_user': return 'outline';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'company_admin': return 'Company Admin';
      case 'team_lead': return 'Team Lead';
      case 'sales_user': return 'Sales User';
      default: return role;
    }
  };

  // Stats
  const activeUsers = displayUsers.filter(u => u.isActive).length;
  const adminUsers = displayUsers.filter(u => ['super_admin', 'company_admin'].includes(u.role)).length;
  const salesUsers = displayUsers.filter(u => u.role === 'sales_user').length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1>User Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {user.role === 'super_admin' ? 'Manage all platform users' : 'Manage your team members'}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{displayUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {user.role === 'super_admin' ? 'Across all companies' : 'In your company'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Admins</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{adminUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Admin level access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Sales Team</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{salesUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sales users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {displayUsers.length} user{displayUsers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUsers.map((u) => {
                  const company = u.companyId ? getCompany(u.companyId) : null;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {company ? (
                          <span className="text-sm">{company.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Platform</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(u.role)}>
                          {getRoleLabel(u.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? 'default' : 'secondary'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(u)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {u.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(u)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {user.role === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                  <SelectItem value="company_admin">Company Admin</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="sales_user">Sales User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                >
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} className="w-full sm:w-auto">
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {user.role === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                  <SelectItem value="company_admin">Company Admin</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="sales_user">Sales User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company *</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                >
                  <SelectTrigger id="edit-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="w-full sm:w-auto">
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
