import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Bell,
  FileText,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  User,
  LogIn,
  Database,
  Activity,
  Upload,
  ClipboardList,
  ChevronDown,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// All navigation links - PUBLIC ACCESS
const mainNavLinks = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/search', label: 'Búsqueda', icon: Search },
  { path: '/screening/bulk', label: 'Bulk Screening', icon: Upload },
];

const adminNavItems = [
  { path: '/admin/sources', label: 'Fuentes de Datos', icon: Database },
  { path: '/monitoring', label: 'Monitoreo', icon: Activity },
  { path: '/admin/audit', label: 'Audit Trail', icon: ClipboardList },
  { path: '/reports', label: 'Reportes', icon: BarChart3 },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setIsScrolled(currentScrollY > 50);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
            >
              <Shield className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
              Sentinel PLD
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {mainNavLinks.map((link) => {
              const isActive = location.pathname === link.path || 
                (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium transition-colors rounded-lg',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-white/10 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </span>
                </Link>
              );
            })}
            
            {/* Admin Dropdown - ALWAYS VISIBLE */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-2',
                    location.pathname.startsWith('/admin') || location.pathname === '/monitoring' || location.pathname === '/reports' || location.pathname === '/settings'
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Admin
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#1a1a1a] border-white/10" align="end">
                {adminNavItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    className="text-gray-300 focus:text-white focus:bg-white/10 cursor-pointer"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              /* User Menu */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                        {getInitials(user?.first_name + ' ' + user?.last_name || 'Usuario')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-[#1a1a1a] border-white/10" align="end" forceMount>
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium text-white">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{user?.email}</p>
                      <p className="text-xs text-blue-400 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    className="text-gray-300 focus:text-white focus:bg-white/10 cursor-pointer"
                    onClick={() => navigate('/settings')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Login Button */
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="gap-2 text-gray-300 hover:text-white"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="lg:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5"
        >
          <nav className="px-4 py-4 space-y-1">
            {mainNavLinks.map((link) => {
              const isActive = location.pathname === link.path ||
                (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            
            {/* Admin Section Mobile - ALWAYS VISIBLE */}
            <div className="pt-2 pb-1">
              <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administración
              </p>
            </div>
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            
            {!isAuthenticated ? (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-blue-400 hover:bg-white/5"
              >
                <LogIn className="w-5 h-5" />
                Iniciar Sesión
              </Link>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 w-full"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            )}
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}

export default Navigation;
