import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit2, AlertCircle, Loader2, CheckCircle, Eye, Search, Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Project, User, Timesheet, Client } from '../types';

// Types
interface UserWithProjects extends User {
  projects: Project[];
  team?: User[];
  manager?: User;
}

interface UserFormData {
  username: string;
  password: string;
  full_name: string;
  email: string;
  role: 'user' | 'manager';
  manager_id: string;
}

interface ConfirmationDialog {
  show: boolean;
  title: string;
  message: string;
  action: () => Promise<void>;
}

// Modal Components
const TeamViewModal: React.FC<{
  manager: UserWithProjects;
  onClose: () => void;
}> = ({ manager, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Team Members - {manager.full_name || manager.username}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      {manager.team && manager.team.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manager.team.map(member => (
            <div key={member.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                  <span className="text-[#1732ca] font-medium">
                    {(member.full_name || member.username)[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.full_name || member.username}</p>
                  <p className="text-sm text-gray-500">{member.email || 'No email'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No team members found</p>
        </div>
      )}
    </div>
  </div>
);

const ProjectViewModal: React.FC<{
  user: UserWithProjects;
  onClose: () => void;
}> = ({ user, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Projects for {user.full_name || user.username}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-4">
        {user.projects && user.projects.length > 0 ? (
          user.projects.map(project => (
            <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">{project.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{project.description || 'No description'}</p>
              <p className="text-sm text-gray-600 mt-2">Allocated Hours: {project.allocated_hours}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No projects assigned</p>
        )}
      </div>
    </div>
  </div>
);

const UserDetailsModal: React.FC<{
  user: UserWithProjects;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);

  useEffect(() => {
    const fetchUserHours = async () => {
      try {
        const { data } = await supabase
          .from('timesheets')
          .select(`
            *,
            project:projects(*)
          `)
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false });

        if (data) {
          setTimesheets(data);
        }
      } catch (error) {
        console.error('Error fetching user hours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHours();
  }, [user.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{user.full_name || user.username}</h3>
            <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
          </div>
        ) : (
          <div className="space-y-6">
            {timesheets.length > 0 ? (
              timesheets.map(timesheet => (
                <div key={timesheet.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{timesheet.project.name}</p>
                      <p className="text-sm text-gray-500">
                        Week {timesheet.week_number}, {timesheet.year}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{timesheet.total_hours} hours</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        timesheet.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : timesheet.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {timesheet.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No timesheets found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const UserFormModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  managers: User[];
  editingUser?: User | null;
}> = ({ show, onClose, onSubmit, managers, editingUser }) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: editingUser?.username || '',
    password: '',
    full_name: editingUser?.full_name || '',
    email: editingUser?.email || '',
    role: editingUser?.role === 'manager' ? 'manager' : 'user',
    manager_id: editingUser?.manager_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username,
        password: '',
        full_name: editingUser.full_name || '',
        email: editingUser.email || '',
        role: editingUser.role === 'manager' ? 'manager' : 'user',
        manager_id: editingUser.manager_id || '',
      });
    }
  }, [editingUser]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{editingUser ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              required
            />
          </div>

          {!editingUser && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
                required={!editingUser}
              />
            </div>
          )}

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as 'user' | 'manager' }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
              required
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div>
            <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
              Manager
            </label>
            <select
              id="manager"
              value={formData.manager_id}
              onChange={e => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1732ca] focus:outline-none focus:ring-1 focus:ring-[#1732ca]"
            >
              <option value="">No Manager</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name || manager.username}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main People Component
export const People = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserWithProjects[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithProjects[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedManager, setSelectedManager] = useState<UserWithProjects | null>(null);
  const [viewingProjects, setViewingProjects] = useState<UserWithProjects | null>(null);
  const [viewingUserDetails, setViewingUserDetails] = useState<UserWithProjects | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialog>({
    show: false,
    title: '',
    message: '',
    action: async () => {},
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.role === 'admin') return;

      try {
        // Fetch users and their projects
        const [usersResponse, projectUsersResponse] = await Promise.all([
          supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('project_users')
            .select('user_id, project:projects(*)')
        ]);

        if (usersResponse.data) {
          // Create a map of user projects
          const userProjects = new Map<string, Project[]>();
          projectUsersResponse.data?.forEach(pu => {
            if (!userProjects.has(pu.user_id)) {
              userProjects.set(pu.user_id, []);
            }
            userProjects.get(pu.user_id)?.push(pu.project);
          });

          // Create team map
          const teamMap = new Map<string, User[]>();
          usersResponse.data.forEach(user => {
            if (user.manager_id) {
              const team = teamMap.get(user.manager_id) || [];
              team.push(user);
              teamMap.set(user.manager_id, team);
            }
          });

          const usersWithDetails = usersResponse.data.map(user => ({
            ...user,
            projects: userProjects.get(user.id) || [],
            team: teamMap.get(user.id) || [],
            manager: usersResponse.data.find(u => u.id === user.manager_id)
          }));

          setUsers(usersWithDetails);
          setFilteredUsers(usersWithDetails);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const filtered = users.filter(user => {
      const searchStr = searchQuery.toLowerCase();
      return (
        user.username.toLowerCase().includes(searchStr) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchStr)) ||
        (user.email && user.email.toLowerCase().includes(searchStr))
      );
    });
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleCreateUser = async (userData: UserFormData) => {
    try {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          username: userData.username,
          password_hash: userData.password,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          manager_id: userData.manager_id || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update local state
      const userWithDetails = {
        ...newUser,
        projects: [],
        team: [],
        manager: users.find(u => u.id === userData.manager_id),
      };

      setUsers(prev => [userWithDetails, ...prev]);
      setFilteredUsers(prev => [userWithDetails, ...prev]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const handleUpdateUser = async (userData: UserFormData) => {
    if (!editingUser) return;

    try {
      const updateData: Partial<User> = {
        username: userData.username,
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        manager_id: userData.manager_id || null,
      };

      if (userData.password) {
        updateData.password_hash = userData.password;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update local state
      const updatedUser = {
        ...editingUser,
        ...updateData,
        manager: users.find(u => u.id === userData.manager_id),
      };

      setUsers(prev =>
        prev.map(user =>
          user.id === editingUser.id
            ? { ...user, ...updatedUser }
            : user
        )
      );

      setFilteredUsers(prev =>
        prev.map(user =>
          user.id === editingUser.id
            ? { ...user, ...updatedUser }
            : user
        )
      );

      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1732ca]" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm">Only administrators can access this page.</p>
      </div>
    );
  }

  const managers = filteredUsers.filter(u => u.role === 'manager');
  const employees = filteredUsers.filter(u => u.role === 'user');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowUserForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1732ca] focus:border-[#1732ca] text-sm"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Managers Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Managers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Size
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {managers.map(manager => (
                  <tr key={manager.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#1732ca]/10 flex items-center justify-center">
                          <span className="text-[#1732ca] font-medium">
                            {(manager.full_name || manager.username)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {manager.full_name || manager.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{manager.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{manager.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{manager.team?.length || 0} members</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(manager)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80"
                          title="Edit manager"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedManager(manager)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80"
                          title="View team members"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewingProjects(manager)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80"
                          title="View active projects"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewingUserDetails(manager)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80"
                          title="View hours"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {managers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No managers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employees Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Employees</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(employee => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#1732ca]/10 flex items- center justify-center">
                          <span className="text-[#1732ca] font-medium">
                            {(employee.full_name || employee.username)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.full_name || employee.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{employee.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.manager ? (
                          employee.manager.full_name || employee.manager.username
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80"
                          title="Edit employee"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewingProjects(employee)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80"
                          title="View active projects"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewingUserDetails(employee)}
                          className="text-[#1732ca] hover:text-[#1732ca]/80"
                          title="View hours"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedManager && (
        <TeamViewModal
          manager={selectedManager}
          onClose={() => setSelectedManager(null)}
        />
      )}

      {viewingProjects && (
        <ProjectViewModal
          user={viewingProjects}
          onClose={() => setViewingProjects(null)}
        />
      )}

      {viewingUserDetails && (
        <UserDetailsModal
          user={viewingUserDetails}
          onClose={() => setViewingUserDetails(null)}
        />
      )}

      {showUserForm && (
        <UserFormModal
          show={showUserForm}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          managers={managers}
          editingUser={editingUser}
        />
      )}

      {confirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">{confirmation.title}</h3>
            <p className="text-gray-600 mb-6">{confirmation.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmation(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await confirmation.action();
                  setConfirmation(prev => ({ ...prev, show: false }));
                }}
                className="px-4 py-2 bg-[#1732ca] text-white rounded-lg hover:bg-[#1732ca]/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};