import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SearchSuggestions from './SearchSuggestions';
import {
  Menu,
  X,
  Home,
  FileText,
  FolderOpen,
  FileCheck,
  LayoutTemplate,
  Search,
  BarChart3,
  Users,
  UserPlus,
  User,
  LogOut,
  Bell,
  Settings,
  Trash2,
  MessageCircle
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Build navigation based on user role
  const navigation = [];
  
  // Analyst role: Only Dashboard and Incidents
  if (user?.role === 'analyst') {
    navigation.push(
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Incidents', href: '/incidents', icon: FileText },
      { name: 'Chat', href: '/chat', icon: MessageCircle }
    );
  } else {
    // All other roles: Full navigation
    navigation.push(
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Incidents', href: '/incidents', icon: FileText },
      { name: 'Cases', href: '/cases', icon: FolderOpen },
      { name: 'Documents', href: '/documents', icon: FileCheck },
      { name: 'Templates', href: '/templates', icon: LayoutTemplate },
      { name: 'Monitoring', href: '/monitoring', icon: Search },
      { name: 'Reports', href: '/reports', icon: BarChart3 }
    );
    
    // Add admin-only navigation items
    if (user?.role === 'admin') {
      navigation.push({ name: 'Users', href: '/users', icon: Users });
    }

    // Add deleted incidents for admin and manager
    if (user?.role === 'admin' || user?.role === 'manager') {
      navigation.push({ name: 'Deleted Incidents', href: '/deleted-incidents', icon: Trash2 });
    }
    
    // Add chat for everyone
    navigation.push({ name: 'Chat', href: '/chat', icon: MessageCircle });
  }

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleGlobalSearch = (searchTerm) => {
    // Navigate to cases page with search term
    navigate(`/cases?search=${encodeURIComponent(searchTerm)}`);
  };

  const handleGlobalSuggestionSelect = (suggestion) => {
    if (suggestion.type === 'case') {
      navigate(`/cases/${suggestion.id}`);
    } else if (suggestion.type === 'user') {
      navigate(`/cases?assignedTo=${suggestion.id}`);
    } else if (suggestion.type === 'term') {
      navigate(`/cases?search=${encodeURIComponent(suggestion.value)}`);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DSP</span>
              </div>
              <span className="ml-2 text-white font-semibold">Brand Protection</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-white">{user?.fullName}</p>
                <p className="text-sm font-medium text-gray-400">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-gray-900">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DSP</span>
                </div>
                <span className="ml-2 text-white font-semibold">Brand Protection</span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive(item.href)
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                    >
                      <Icon className="mr-3 h-6 w-6" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-white">{user?.fullName}</p>
                  <p className="text-xs font-medium text-gray-400">{user?.role}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <button
                    onClick={logout}
                    className="text-gray-400 hover:text-white"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                {/* Hide search for analyst role */}
                {user?.role !== 'analyst' && (
                  <SearchSuggestions
                    placeholder="Search cases, incidents, or content..."
                    onSearch={handleGlobalSearch}
                    onSuggestionSelect={handleGlobalSuggestionSelect}
                    className="w-full"
                  />
                )}
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-2">
              <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Bell className="h-6 w-6" />
              </button>
              <Link
                to="/profile"
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
