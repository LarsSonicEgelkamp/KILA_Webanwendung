import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography
} from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import { track } from '@vercel/analytics';
import { useTranslation } from 'react-i18next';
import NavBar from './components/NavBar';
import RoughNotation from './components/RoughNotation';
import { useAuth } from './auth/AuthContext';
import { useSection } from './state/SectionContext';
import Home from './pages/Home';
import ContentPage from './pages/ContentPage';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import UserManagement from './pages/UserManagement';
import kilaLogo from './assets/img/KILA_Logo.png';

const drawerWidth = '50vw';
const appBarHeight = 56;

const App: React.FC = () => {
  const [navOpen, setNavOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading, logout } = useAuth();
  const { activeSection } = useSection();
  const isHome = location.pathname === '/';
  const [menuColor, setMenuColor] = React.useState('#ffffff');
  const [showTopHint, setShowTopHint] = React.useState(true);
  const [accountAnchorEl, setAccountAnchorEl] = React.useState<null | HTMLElement>(null);
  const mainRef = React.useRef<HTMLDivElement | null>(null);
  const lastTrackedRef = React.useRef<{ section?: string; path?: string; role?: string }>({});

  const updateMenuColor = React.useCallback(() => {
    const container = mainRef.current;
    if (!isHome || !container) {
      setMenuColor('#0088ff');
      setShowTopHint(false);
      return;
    }

    const sampleX = window.innerWidth - 28;
    const sampleY = appBarHeight + 8;
    const elements = document.elementsFromPoint(sampleX, sampleY) as HTMLElement[];
    let bg: string | null = null;
    for (const element of elements) {
      let node: HTMLElement | null = element;
      while (node && !node.dataset?.bg) {
        node = node.parentElement;
      }
      if (node?.dataset?.bg) {
        bg = node.dataset.bg;
        break;
      }
    }
    const resolvedBg = bg ?? 'light';
    setMenuColor(resolvedBg === 'blue' ? '#ffffff' : '#0088ff');
    setShowTopHint(activeSection === 'home' && container.scrollTop < 40);
  }, [activeSection, isHome]);

  React.useEffect(() => {
    const container = mainRef.current;
    if (!isHome || !container) {
      setMenuColor('#0088ff');
      setShowTopHint(false);
      return;
    }

    updateMenuColor();
    const handleScroll = () => updateMenuColor();
    const handleResize = () => updateMenuColor();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isHome, updateMenuColor]);

  React.useEffect(() => {
    if (!navOpen) {
      updateMenuColor();
    }
  }, [navOpen, updateMenuColor]);

  React.useEffect(() => {
    if (loading) {
      return;
    }
    const role = user?.role ?? 'guest';
    const path = location.pathname;
    const section = activeSection;
    const last = lastTrackedRef.current;
    if (last.section === section && last.path === path && last.role === role) {
      return;
    }
    lastTrackedRef.current = { section, path, role };
    track('section_view', { section, path, role });
  }, [activeSection, loading, location.pathname, user?.role]);

  const handleToggleNav = () => {
    setNavOpen((prev) => !prev);
  };

  const handleCloseNav = () => {
    setNavOpen(false);
  };

  const iconColor = navOpen ? '#0088ff' : menuColor;
  const statusColor = iconColor;
  const roleLabel = user?.role ? t(`auth.roles.${user.role}`) : '';
  const displayName = user?.name || user?.email || 'User';
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'leitung';

  const getInitials = (value: string) =>
    value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

  const handleAccountOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAccountAnchorEl(event.currentTarget);
  };

  const handleAccountClose = () => {
    setAccountAnchorEl(null);
  };

  const handleAccountNavigate = (path: string) => {
    handleAccountClose();
    navigate(path);
  };

  const handleLogout = async () => {
    handleAccountClose();
    await logout();
    navigate('/');
  };

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', bgcolor: '#ffffff' }}>
      <AppBar
        position="fixed"
        sx={(theme) => ({
          bgcolor: 'transparent',
          boxShadow: 'none',
          height: `${appBarHeight}px`,
          justifyContent: 'center',
          zIndex: theme.zIndex.drawer + 2,
          pointerEvents: 'none'
        })}
      >
        <Toolbar
          sx={{
            minHeight: `${appBarHeight}px`,
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ pointerEvents: 'auto', pl: { xs: 1, md: 2 } }}>
            {!loading && !user ? (
              <Button
                onClick={() => navigate('/anmeldung/login')}
                sx={{ color: statusColor, textTransform: 'none' }}
                variant="text"
              >
                Anmelden
              </Button>
            ) : null}
            {!loading && user ? (
              <Button
                onClick={handleAccountOpen}
                sx={{
                  color: statusColor,
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.4
                }}
                variant="text"
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: statusColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,136,255,0.15)',
                    color: statusColor,
                    fontSize: '0.8rem'
                  }}
                >
                  {getInitials(displayName)}
                </Avatar>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                    {displayName}
                  </Typography>
                  {roleLabel ? (
                    <Typography variant="caption" sx={{ color: statusColor, opacity: 0.85 }}>
                      {roleLabel}
                    </Typography>
                  ) : null}
                </Box>
              </Button>
            ) : null}
          </Box>
          <IconButton
            onClick={handleToggleNav}
            aria-label={navOpen ? 'Navigation schliessen' : 'Navigation oeffnen'}
            sx={{ color: iconColor, pointerEvents: 'auto' }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 26,
                height: 20
              }}
            >
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: navOpen ? '9px' : '4px',
                  width: '26px',
                  height: '3px',
                  bgcolor: 'currentColor',
                  transform: navOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 220ms ease, top 220ms ease'
                }}
              />
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: navOpen ? '9px' : '13px',
                  width: '26px',
                  height: '3px',
                  bgcolor: 'currentColor',
                  transform: navOpen ? 'rotate(-45deg)' : 'rotate(0deg)',
                  transition: 'transform 220ms ease, top 220ms ease'
                }}
              />
            </Box>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={accountAnchorEl}
        open={Boolean(accountAnchorEl)}
        onClose={handleAccountClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 320,
            bgcolor: '#1f2127',
            color: '#ffffff',
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1, textAlign: 'center' }}>
          {user?.email ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              {user.email}
            </Typography>
          ) : null}
          <Avatar
            sx={{
              width: 72,
              height: 72,
              mx: 'auto',
              bgcolor: '#0088ff',
              fontSize: '1.4rem'
            }}
          >
            {getInitials(displayName)}
          </Avatar>
          <Typography sx={{ fontWeight: 700, mt: 1 }}>{displayName}</Typography>
          {roleLabel ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {roleLabel}
            </Typography>
          ) : null}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />

        <MenuItem
          onClick={() => handleAccountNavigate('/konto')}
          sx={{ color: 'inherit' }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
            <ManageAccountsIcon fontSize="small" />
          </ListItemIcon>
          {t('menu.account.manage')}
        </MenuItem>
        <MenuItem
          onClick={() => handleAccountNavigate('/einstellungen')}
          sx={{ color: 'inherit' }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          {t('menu.account.settings')}
        </MenuItem>
        {isStaff ? (
          <MenuItem
            onClick={() => handleAccountNavigate('/aenderungshistorie')}
            sx={{ color: 'inherit' }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            {t('menu.account.history')}
          </MenuItem>
        ) : null}
        {isAdmin ? (
          <MenuItem
            onClick={() => handleAccountNavigate('/anmeldung/user-management')}
            sx={{ color: 'inherit' }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            {t('menu.account.userManagement')}
          </MenuItem>
        ) : null}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />

        <MenuItem onClick={handleLogout} sx={{ color: 'inherit' }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('menu.account.logout')}
        </MenuItem>
      </Menu>

      {isHome ? (
        <Box
          sx={(theme) => ({
            position: 'fixed',
            top: { xs: 8, md: 12 },
            right: { xs: 36, md: 52 },
            zIndex: theme.zIndex.drawer + 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.15,
            width: { xs: 120, md: 170 },
            color: '#ffffff',
            pointerEvents: 'none',
            opacity: showTopHint && !navOpen ? 1 : 0,
            transform: showTopHint && !navOpen ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'opacity 180ms ease, transform 180ms ease'
          })}
        >
          <RoughNotation
            type="circle"
            show={showTopHint && !navOpen}
            color="#ffffff"
            strokeWidth={3}
            padding={6}
            animationDuration={650}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: '"A Day In September", "Comic Sans MS", cursive',
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                letterSpacing: '0.02em',
                display: 'inline-block'
              }}
            >
              {t('home.learnMore')}
            </Typography>
          </RoughNotation>
        </Box>
      ) : null}

      {navOpen ? (
        <Box
          onClick={handleToggleNav}
          sx={(theme) => ({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            pl: { xs: 4, md: 10 },
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            zIndex: theme.zIndex.drawer - 1,
            cursor: 'pointer'
          })}
        >
          <Box
            component="img"
            src={kilaLogo}
            alt="KILA Logo"
            sx={{ width: { xs: 240, md: 320 }, height: 'auto', maxWidth: '80%', pointerEvents: 'none' }}
          />
        </Box>
      ) : null}

      <NavBar open={navOpen} width={drawerWidth} onNavigate={handleCloseNav} />

      <Box
        component="main"
        ref={mainRef}
        id="main-scroll"
        sx={{
          pt: isHome && activeSection === 'home' ? 0 : `${appBarHeight}px`,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          bgcolor: isHome && activeSection === 'home' ? '#0088ff' : '#ffffff',
          scrollBehavior: 'smooth'
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lager" element={<ContentPage titleKey="menu.home.camp" />} />
          <Route path="/termine" element={<ContentPage titleKey="menu.home.dates" />} />
          <Route path="/anmeldung" element={<Login />} />
          <Route path="/anmeldung/login" element={<Login />} />
          <Route path="/anmeldung/signup" element={<SignUp />} />
          <Route path="/anmeldung/user-management" element={<UserManagement />} />
          <Route path="/konto" element={<ContentPage titleKey="menu.account.manage" />} />
          <Route path="/einstellungen" element={<ContentPage titleKey="menu.account.settings" />} />
          <Route path="/aenderungshistorie" element={<ContentPage titleKey="menu.account.history" />} />
          <Route path="/team/leitung" element={<ContentPage titleKey="menu.team.leadership" />} />
          <Route path="/team/betreuer" element={<ContentPage titleKey="menu.team.caretakers" />} />
          <Route path="/team/kochteam" element={<ContentPage titleKey="menu.team.kitchen" />} />
          <Route path="/team/qualifikation" element={<ContentPage titleKey="menu.team.training" />} />
          <Route path="/downloads/packliste" element={<ContentPage titleKey="menu.downloads.packlist" />} />
          <Route path="/downloads/einverstaendnis" element={<ContentPage titleKey="menu.downloads.consents" />} />
          <Route path="/downloads/elterninfos" element={<ContentPage titleKey="menu.downloads.parents" />} />
          <Route path="/downloads/notfall" element={<ContentPage titleKey="menu.downloads.emergency" />} />
          <Route path="/galerie/aktuell" element={<ContentPage titleKey="menu.gallery.current" />} />
          <Route path="/galerie/vergangene" element={<ContentPage titleKey="menu.gallery.past" />} />
          <Route path="/das-lager/was-erwartet" element={<ContentPage titleKey="menu.camp.expect" />} />
          <Route path="/das-lager/tagesablauf" element={<ContentPage titleKey="menu.camp.schedule" />} />
          <Route path="/das-lager/spiele" element={<ContentPage titleKey="menu.camp.games" />} />
          <Route path="/das-lager/unterkunft" element={<ContentPage titleKey="menu.camp.location" />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default App;
