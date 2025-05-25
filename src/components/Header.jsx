import React, { useState, useEffect } from 'react';
import { Navbar, Nav, NavDropdown, Container, Dropdown, Offcanvas, Accordion } from 'react-bootstrap';
import { FaGlobe, FaMoon, FaSun, FaCar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const LANGS = [
  { key: 'en', label: 'English' },
  { key: 'tc', label: '繁' },
  { key: 'sc', label: '简' },
];

const LABELS = {
  en: { districts: 'Districts', hkIsland: 'Hong Kong Island', kowloon: 'Kowloon', nt: 'New Territories', central: 'Central and Western', wanchai: 'Wan Chai', eastern: 'Eastern', southern: 'Southern', ytm: 'Yau Tsim Mong', ssp: 'Sham Shui Po', kc: 'Kowloon City', wts: 'Wong Tai Sin', kt: 'Kwun Tong', kts: 'Kwai Tsing', tw: 'Tsuen Wan', yl: 'Yuen Long', tm: 'Tuen Mun', north: 'North', tp: 'Tai Po', st: 'Sha Tin', sk: 'Sai Kung', islands: 'Islands', home: 'Home', settings: 'Settings', favourites: 'Favourites', news: 'Traffic Notices', camera: 'Traffic Cameras', theme: 'Theme', language: 'Language', menu: 'Menu' },
  tc: { districts: '地區', hkIsland: '港島', kowloon: '九龍', nt: '新界', central: '中西區', wanchai: '灣仔區', eastern: '東區', southern: '南區', ytm: '油尖旺區', ssp: '深水埗區', kc: '九龍城區', wts: '黃大仙區', kt: '觀塘區', kts: '葵青區', tw: '荃灣區', yl: '元朗區', tm: '屯門區', north: '北區', tp: '大埔區', st: '沙田區', sk: '西貢區', islands: '離島區', home: '主頁', settings: '設定', favourites: '收藏', news: '交通通知', camera: '交通鏡頭', theme: '主題', language: '語言', menu: '選單' },
  sc: { districts: '地区', hkIsland: '港岛', kowloon: '九龙', nt: '新界', central: '中西区', wanchai: '湾仔区', eastern: '东区', southern: '南区', ytm: '油尖旺区', ssp: '深水埗区', kc: '九龙城区', wts: '黄大仙区', kt: '观塘区', kts: '葵青区', tw: '荃湾区', yl: '元朗区', tm: '屯门区', north: '北区', tp: '大埔区', st: '沙田区', sk: '西贡区', islands: '离岛区', home: '主页', settings: '设置', favourites: '收藏', news: '交通通知', camera: '交通摄像头', theme: '主题', language: '语言', menu: '菜单' },
};

const regions = [
  {
    key: 'hong_kong_island', // 改成和路由一致
    label: (lang) => LABELS[lang].hkIsland,
    to: '/district/hong_kong_island',
    districts: [
      { key: 'central', label: (lang) => LABELS[lang].central, to: '/district/Central-Western' },
      { key: 'wanchai', label: (lang) => LABELS[lang].wanchai, to: '/district/Wan-Chai' },
      { key: 'eastern', label: (lang) => LABELS[lang].eastern, to: '/district/Eastern' },
      { key: 'southern', label: (lang) => LABELS[lang].southern, to: '/district/Southern' },
    ],
  },
  {
    key: 'kowloon',
    label: (lang) => LABELS[lang].kowloon,
    to: '/district/kowloon',
    districts: [
      { key: 'ytm', label: (lang) => LABELS[lang].ytm, to: '/district/Yau-Tsim-Mong' },
      { key: 'ssp', label: (lang) => LABELS[lang].ssp, to: '/district/Sham-Shui-Po' },
      { key: 'kc', label: (lang) => LABELS[lang].kc, to: '/district/Kowloon-City' },
      { key: 'wts', label: (lang) => LABELS[lang].wts, to: '/district/Wong-Tai-Sin' },
      { key: 'kt', label: (lang) => LABELS[lang].kt, to: '/district/Kwun-Tong' },
    ],
  },
  {
    key: 'new_territories',
    label: (lang) => LABELS[lang].nt,
    to: '/district/new_territories',
    districts: [
      { key: 'kts', label: (lang) => LABELS[lang].kts, to: '/district/Kwai-Tsing' },
      { key: 'tw', label: (lang) => LABELS[lang].tw, to: '/district/Tsuen-Wan' },
      { key: 'yl', label: (lang) => LABELS[lang].yl, to: '/district/Yuen-Long' },
      { key: 'tm', label: (lang) => LABELS[lang].tm, to: '/district/Tuen-Mun' },
      { key: 'north', label: (lang) => LABELS[lang].north, to: '/district/North' },
      { key: 'tp', label: (lang) => LABELS[lang].tp, to: '/district/Tai-Po' },
      { key: 'st', label: (lang) => LABELS[lang].st, to: '/district/Sha-Tin' },
      { key: 'sk', label: (lang) => LABELS[lang].sk, to: '/district/Sai-Kung' },
      { key: 'islands', label: (lang) => LABELS[lang].islands, to: '/district/Islands' },
    ],
  },
];

const cameraRegions = [
  {
    key: 'hkIsland',
    label: (lang) => LABELS[lang].hkIsland,
    to: '/camera/district/hong_kong_island',
    districts: [
      { key: 'central', label: (lang) => LABELS[lang].central, to: '/camera/district/Central-Western' },
      { key: 'wanchai', label: (lang) => LABELS[lang].wanchai, to: '/camera/district/Wan-Chai' },
      { key: 'eastern', label: (lang) => LABELS[lang].eastern, to: '/camera/district/Eastern' },
      { key: 'southern', label: (lang) => LABELS[lang].southern, to: '/camera/district/Southern' },
    ],
  },
  {
    key: 'kowloon',
    label: (lang) => LABELS[lang].kowloon,
    to: '/camera/district/kowloon',
    districts: [
      { key: 'ytm', label: (lang) => LABELS[lang].ytm, to: '/camera/district/Yau-Tsim-Mong' },
      { key: 'ssp', label: (lang) => LABELS[lang].ssp, to: '/camera/district/Sham-Shui-Po' },
      { key: 'kc', label: (lang) => LABELS[lang].kc, to: '/camera/district/Kowloon-City' },
      { key: 'wts', label: (lang) => LABELS[lang].wts, to: '/camera/district/Wong-Tai-Sin' },
      { key: 'kt', label: (lang) => LABELS[lang].kt, to: '/camera/district/Kwun-Tong' },
    ],
  },
  {
    key: 'nt',
    label: (lang) => LABELS[lang].nt,
    to: '/camera/district/new_territories',
    districts: [
      { key: 'kts', label: (lang) => LABELS[lang].kts, to: '/camera/district/Kwai-Tsing' },
      { key: 'tw', label: (lang) => LABELS[lang].tw, to: '/camera/district/Tsuen-Wan' },
      { key: 'yl', label: (lang) => LABELS[lang].yl, to: '/camera/district/Yuen-Long' },
      { key: 'tm', label: (lang) => LABELS[lang].tm, to: '/camera/district/Tuen-Mun' },
      { key: 'north', label: (lang) => LABELS[lang].north, to: '/camera/district/North' },
      { key: 'tp', label: (lang) => LABELS[lang].tp, to: '/camera/district/Tai-Po' },
      { key: 'st', label: (lang) => LABELS[lang].st, to: '/camera/district/Sha-Tin' },
      { key: 'sk', label: (lang) => LABELS[lang].sk, to: '/camera/district/Sai-Kung' },
      { key: 'islands', label: (lang) => LABELS[lang].islands, to: '/camera/district/Islands' },
    ],
  },
];

const ThemeToggleButton = ({ darkMode, onToggle, lang }) => {
  return (
    <div 
      onClick={onToggle}
      style={{
        position: 'relative',
        width: 64,
        height: 32,
        borderRadius: 16,
        backgroundColor: darkMode ? '#4d4d4d' : '#e0e0e0',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: `1px solid ${darkMode ? '#666' : '#ddd'}`,
      }}
      title={darkMode ? `${LABELS[lang].theme} ☀️` : `${LABELS[lang].theme} 🌙`}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: darkMode ? 34 : 2,
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: darkMode ? '#ffd700' : '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {darkMode ? (
          <FaSun size={14} color={darkMode ? '#333' : '#666'} />
        ) : (
          <FaMoon size={14} color={darkMode ? '#333' : '#666'} />
        )}
      </div>
    </div>
  );
};

const Header = ({
  currentLang,
  onLangChange,
  onThemeToggle,
  darkMode,
}) => {
  const [lang, setLang] = useState(currentLang || localStorage.getItem('lang') || 'en');
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  useEffect(() => {
    setLang(currentLang || localStorage.getItem('lang') || 'en');
  }, [currentLang]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    if (onLangChange) onLangChange(newLang);
  };

  const brandName = lang === 'en' ? 'EaseParkHK' : 'EaseParkHK - 泊易香港';

  const renderDesktopDistricts = (
    <NavDropdown title={LABELS[lang].districts} id="districts-dropdown">
      {regions.map(region => (
        <NavDropdown key={region.key} title={region.label(lang)} id={`${region.key}-dropdown`} drop="end">
          <NavDropdown.Item as={Link} to={region.to} style={{ fontWeight: 600 }}>
            {region.label(lang)}
          </NavDropdown.Item>
          <NavDropdown.Divider />
          {region.districts.map(district => (
            <NavDropdown.Item key={district.key} as={Link} to={district.to}>
              {district.label(lang)}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      ))}
    </NavDropdown>
  );

  const renderDesktopCameraDistricts = (
    <NavDropdown title={LABELS[lang].camera} id="camera-districts-dropdown">
      {cameraRegions.map(region => (
        <NavDropdown key={region.key} title={region.label(lang)} id={`camera-${region.key}-dropdown`} drop="end">
          <NavDropdown.Item as={Link} to={region.to} style={{ fontWeight: 600 }}>
            {region.label(lang)}
          </NavDropdown.Item>
          <NavDropdown.Divider />
          {region.districts.map(district => (
            <NavDropdown.Item key={district.key} as={Link} to={district.to}>
              {district.label(lang)}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      ))}
    </NavDropdown>
  );

  const renderMobileDistricts = (
    <Accordion>
      {regions.map(region => (
        <Accordion.Item key={region.key} eventKey={region.key}>
          <Accordion.Header>{region.label(lang)}</Accordion.Header>
          <Accordion.Body>
            <Nav className="flex-column">
              <Nav.Link as={Link} to={region.to} onClick={() => setShowOffcanvas(false)} style={{ fontWeight: 600 }}>
                {region.label(lang)}
              </Nav.Link>
              {region.districts.map(district => (
                <Nav.Link key={district.key} as={Link} to={district.to} onClick={() => setShowOffcanvas(false)} style={{ paddingLeft: 16 }}>
                  {district.label(lang)}
                </Nav.Link>
              ))}
            </Nav>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );

  const renderMobileCameraDistricts = (
    <Accordion>
      {cameraRegions.map(region => (
        <Accordion.Item key={region.key} eventKey={region.key}>
          <Accordion.Header>{region.label(lang)}</Accordion.Header>
          <Accordion.Body>
            <Nav className="flex-column">
              <Nav.Link as={Link} to={region.to} onClick={() => setShowOffcanvas(false)} style={{ fontWeight: 600 }}>
                {region.label(lang)}
              </Nav.Link>
              {region.districts.map(district => (
                <Nav.Link key={district.key} as={Link} to={district.to} onClick={() => setShowOffcanvas(false)} style={{ paddingLeft: 16 }}>
                  {district.label(lang)}
                </Nav.Link>
              ))}
            </Nav>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );

  return (
    <>
      <Navbar bg={darkMode ? 'dark' : 'light'} variant={darkMode ? 'dark' : 'light'} expand="lg" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <FaCar style={{ marginRight: 8, color: '#0d6efd' }} />
            {brandName}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar" onClick={() => setShowOffcanvas(true)} />
          <Navbar.Collapse id="main-navbar" className="d-none d-lg-flex">
            <Nav className="me-auto">
              {renderDesktopDistricts}
              <Nav.Link as={Link} to="/news">{LABELS[lang].news}</Nav.Link>
              {renderDesktopCameraDistricts}
              <Nav.Link as={Link} to="/settings">{LABELS[lang].settings}</Nav.Link>
            </Nav>
            <Nav>
              <Dropdown align="end" className="me-2">
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-lang" style={{ minWidth: 60 }}>
                  <FaGlobe style={{ marginRight: 4 }} />
                  {LANGS.find(l => l.key === lang)?.label}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {LANGS.filter(l => l.key !== lang).map(opt => (
                    <Dropdown.Item key={opt.key} onClick={() => handleLangChange(opt.key)}>
                      {opt.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              <div className="d-flex align-items-center ms-2">
                <ThemeToggleButton 
                  darkMode={darkMode} 
                  onToggle={onThemeToggle}
                  lang={lang}
                />
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Offcanvas show={showOffcanvas} onHide={() => setShowOffcanvas(false)} placement="start" className="d-lg-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <FaCar style={{ marginRight: 8, color: '#0d6efd' }} />
            {brandName}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="mb-3">
            <h6>{LABELS[lang].districts}</h6>
            {renderMobileDistricts}
          </div>
          <div className="mb-3">
            <h6>{LABELS[lang].camera}</h6>
            {renderMobileCameraDistricts}
          </div>
          <Nav className="flex-column">
            <Nav.Link as={Link} to="/" onClick={() => setShowOffcanvas(false)}>{LABELS[lang].home}</Nav.Link>
            <Nav.Link as={Link} to="/news" onClick={() => setShowOffcanvas(false)}>{LABELS[lang].news}</Nav.Link>
            <Nav.Link as={Link} to="/settings" onClick={() => setShowOffcanvas(false)}>{LABELS[lang].settings}</Nav.Link>
          </Nav>
          <div className="mt-3 d-flex align-items-center">
            <Dropdown align="end" className="me-2">
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-lang-mobile" style={{ minWidth: 60 }}>
                <FaGlobe style={{ marginRight: 4 }} />
                {LANGS.find(l => l.key === lang)?.label}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {LANGS.filter(l => l.key !== lang).map(opt => (
                  <Dropdown.Item key={opt.key} onClick={() => { handleLangChange(opt.key); setShowOffcanvas(false); }}>
                    {opt.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
            <ThemeToggleButton 
              darkMode={darkMode} 
              onToggle={() => { onThemeToggle(); setShowOffcanvas(false); }}
              lang={lang}
            />
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default Header;