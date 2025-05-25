import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Form, Modal, Row, Col, Badge, InputGroup, Spinner, ListGroup } from 'react-bootstrap';
import { FaRegStar, FaStar, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import '../styles/main.css';

const VEHICLE_TYPES = [
  { value: 'P', label: { en: 'Private Car', tc: '私家車', sc: '私家车' } },
  { value: 'P_D', label: { en: 'Private Car (Disabled)', tc: '私家車(傷健人士)', sc: '私家车(伤健人士)' } },
  { value: 'M', label: { en: 'Motorcycle', tc: '電單車', sc: '电单车' } },
  { value: 'LGV', label: { en: 'Light Goods Vehicle', tc: '輕型貨車', sc: '轻型货车' } },
  { value: 'HGV', label: { en: 'Heavy Goods Vehicle', tc: '重型貨車', sc: '重型货车' } },
  { value: 'COACH', label: { en: 'Coach', tc: '巴士', sc: '巴士' } },
];

const STATUS_ORDER = {
  OPEN: 0,
  CLOSED: 1,
  UNKNOWN: 2,
};

function Main({ lang, filterDistricts, customTitle }) {
  const [carparks, setCarparks] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favorite_carparks') || '[]'));
  const [vehicleType, setVehicleType] = useState('P');
  const [showMap, setShowMap] = useState(false);
  const [mapInfo, setMapInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    localStorage.setItem('selected_vehicle_type', vehicleType);
  }, [vehicleType]);
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [infoRes, vacancyRes] = await Promise.all([
          fetch('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json'),
          fetch('https://resource.data.one.gov.hk/td/carpark/vacancy_all.json'),
        ]);
        const infoData = await infoRes.json();
        const vacancyData = await vacancyRes.json();

        const vacancyMap = {};
        for (const item of vacancyData.car_park || []) {
          vacancyMap[item.park_id] = {};
          for (const vt of item.vehicle_type || []) {
            const hourly = (vt.service_category || []).find(sc => sc.category === 'HOURLY');
            let vacancyValue = -1;
            if (hourly && hourly.vacancy !== undefined && hourly.vacancy !== null) {
              if (hourly.vacancy === 'N/A') {
                vacancyValue = -1;
              } else {
                const parsed = parseInt(hourly.vacancy, 10);
                vacancyValue = isNaN(parsed) ? -1 : parsed;
              }
            }
            vacancyMap[item.park_id][vt.type] = hourly
              ? {
                vacancy: vacancyValue,
                vacancy_type: hourly.vacancy_type,
                lastupdate: hourly.lastupdate,
              }
              : { vacancy: -1, vacancy_type: '', lastupdate: '' };
          }
        }

        const combined = (infoData.car_park || []).map(carpark => {
          const parkId = carpark.park_id;
          const vacancy = vacancyMap[parkId] || {};
          const result = {
            ...carpark,
            park_Id: parkId,
            name: {
              en: carpark.name_en,
              tc: carpark.name_tc,
              sc: carpark.name_sc,
            },
            displayAddress: {
              en: carpark.displayAddress_en,
              tc: carpark.displayAddress_tc,
              sc: carpark.displayAddress_sc,
            },
            district: {
              en: carpark.district_en,
              tc: carpark.district_tc,
              sc: carpark.district_sc,
            },
            district_en: carpark.district_en,
            district_tc: carpark.district_tc,
            district_sc: carpark.district_sc,
            contactNo: carpark.contactNo || 'N/A',
            opening_status: carpark.opening_status || 'UNKNOWN',
            latitude: carpark.latitude,
            longitude: carpark.longitude,
          };
          for (const vt of VEHICLE_TYPES.map(v => v.value)) {
            result[`${vt}_vacancy`] = vacancy[vt]?.vacancy ?? -1;
            result[`${vt}_vacancy_type`] = vacancy[vt]?.vacancy_type ?? '';
          }
          return result;
        });

        setCarparks(combined);
      } catch (error) {
        console.error('Error fetching car park data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleFavorite = parkId => {
    let newFavs;
    if (favorites.includes(parkId)) {
      newFavs = favorites.filter(id => id !== parkId);
    } else {
      newFavs = [...favorites, parkId];
    }
    setFavorites(newFavs);
    localStorage.setItem('favorite_carparks', JSON.stringify(newFavs));
  };

  // 加入地區過濾
  const filterCarparks = list =>
    list.filter(carpark => {
      // 地區過濾
      if (filterDistricts && filterDistricts.length > 0) {
        // 支援多語言 district 過濾
        const districtMatch =
          filterDistricts.includes(carpark.district_en) ||
          filterDistricts.includes(carpark.district_tc) ||
          filterDistricts.includes(carpark.district_sc);
        if (!districtMatch) return false;
      }
      if (
        search &&
        !(
          (carpark.name[lang] && carpark.name[lang].toLowerCase().includes(search.toLowerCase())) ||
          (carpark.displayAddress[lang] && carpark.displayAddress[lang].toLowerCase().includes(search.toLowerCase()))
        )
      ) {
        return false;
      }
      return true;
    });

  const favoriteCarparks = filterCarparks(carparks.filter(c => favorites.includes(c.park_Id)));
  const otherCarparks = filterCarparks(carparks.filter(c => !favorites.includes(c.park_Id)));

  const handleShowMap = carpark => {
    setMapInfo(carpark);
    setShowMap(true);
  };

  return (
    <Container className="mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="text-center w-100">
          <h1 style={{ fontWeight: 800, letterSpacing: 1, color: '#1a237e', fontSize: '2.2rem' }}>
            {customTitle
              ? customTitle
              : lang === 'en'
              ? 'Hong Kong Parking Information'
              : lang === 'tc'
              ? '香港停車場資訊'
              : '香港停车场资讯'}
          </h1>
          <p style={{ color: '#607d8b', fontSize: '1.15em', fontWeight: 500 }}>
            {lang === 'en'
              ? 'Find real-time parking vacancy and info for all types of vehicles'
              : lang === 'tc'
              ? '即時查詢各類車輛停車場空位及資訊'
              : '实时查询各类车辆停车场空位及资讯'}
          </p>
        </div>
      </div>
      <Row className="mb-3 align-items-end">
        <Col md={4} xs={12} className="mb-2 mb-md-0">
          <Form.Group>
            <Form.Label style={{ fontWeight: 700, color: '#1976d2' }}>
              {lang === 'en' ? 'Vehicle Type:' : lang === 'tc' ? '車輛類型：' : '车辆类型：'}
            </Form.Label>
            <Form.Select value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
              {VEHICLE_TYPES.map(v => (
                <option key={v.value} value={v.value}>{v.label[lang]}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={8} xs={12}>
          <Form.Group>
            <Form.Label style={{ fontWeight: 700, color: '#1976d2' }}>
              {lang === 'en' ? 'Search (Name or Address):' : lang === 'tc' ? '搜尋（名稱或地址）：' : '搜索（名称或地址）：'}
            </Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder={lang === 'en' ? 'Enter name or address' : lang === 'tc' ? '輸入名稱或地址' : '输入名称或地址'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ borderRight: 0, borderRadius: '0.375rem 0 0 0.375rem', fontWeight: 500 }}
              />
              {search && (
                <Button variant="outline-secondary" onClick={() => setSearch('')} style={{ borderRadius: '0 0.375rem 0.375rem 0' }}>
                  {lang === 'en' ? 'Clear' : lang === 'tc' ? '清除' : '清除'}
                </Button>
              )}
            </InputGroup>
          </Form.Group>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div style={{ marginTop: 10, fontWeight: 'bold', fontSize: '1.2em', color: '#007bff' }}>
            {lang === 'en' ? 'Loading...' : lang === 'tc' ? '載入中...' : '加载中...'}
          </div>
        </div>
      ) : (
        <>
          {favoriteCarparks.length > 0 && (
            <>
              <h2 style={{ fontWeight: 700, color: '#ff9800', marginTop: 24 }}>
                <FaStar style={{ color: '#FFD700', marginRight: 6, background: '#232323', borderRadius: '50%', padding: 2 }} />
                {lang === 'en' ? 'Favorite Parking Lots' : lang === 'tc' ? '我的最愛' : '我的收藏'}
                <Badge bg="warning" style={{ marginLeft: 8 }}>{favoriteCarparks.length}</Badge>
              </h2>
              <CarparkTable
                carparks={favoriteCarparks}
                vehicleType={vehicleType}
                onShowMap={handleShowMap}
                onToggleFavorite={toggleFavorite}
                favorites={favorites}
                lang={lang}
              />
            </>
          )}

          <h2 className="mt-4" style={{ fontWeight: 700, color: '#1976d2' }}>
            {lang === 'en' ? 'All Parking Lots' : lang === 'tc' ? '所有停車場' : '所有停车场'}
            <Badge bg="info" style={{ marginLeft: 8 }}>{otherCarparks.length}</Badge>
          </h2>
          <CarparkTable
            carparks={otherCarparks}
            vehicleType={vehicleType}
            onShowMap={handleShowMap}
            onToggleFavorite={toggleFavorite}
            favorites={favorites}
            lang={lang}
          />
          {favoriteCarparks.length + otherCarparks.length === 0 && (
            <p className="text-center text-danger mt-4" style={{ fontWeight: 700 }}>
              {lang === 'en' ? 'No results found. Try adjusting your search or filters.' : lang === 'tc' ? '找不到結果，請嘗試調整搜尋或篩選條件。' : '未找到结果，请尝试调整搜索或筛选条件。'}
            </p>
          )}
        </>
      )}

      <Modal show={showMap} onHide={() => setShowMap(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {lang === 'en' ? 'Carpark Location' : lang === 'tc' ? '停車場位置' : '停车场位置'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <strong>{lang === 'en' ? 'Name:' : lang === 'tc' ? '名稱：' : '名称：'}</strong> {mapInfo.name?.[lang] || 'N/A'}<br />
            <strong>{lang === 'en' ? 'District:' : lang === 'tc' ? '地區：' : '地区：'}</strong> {mapInfo.district?.[lang] || 'N/A'}<br />
            <strong>{lang === 'en' ? 'Address:' : lang === 'tc' ? '地址：' : '地址：'}</strong> {mapInfo.displayAddress?.[lang] || 'N/A'}<br />
            <strong>{lang === 'en' ? 'Contact:' : lang === 'tc' ? '聯絡電話：' : '联系电话：'}</strong> {mapInfo.contactNo || 'N/A'}<br />
            <strong>{lang === 'en' ? 'Status:' : lang === 'tc' ? '狀態：' : '状态：'}</strong> <StatusBadge status={mapInfo.opening_status} lang={lang} /><br />
            <strong>{lang === 'en' ? 'Vacancy:' : lang === 'tc' ? '空位：' : '空位：'}</strong> <VacancyBadge value={mapInfo[`${vehicleType}_vacancy`]} lang={lang} />
          </div>
          {mapInfo.latitude && mapInfo.longitude ? (
            <iframe
              title="Google Map"
              src={`https://www.google.com/maps?q=${mapInfo.latitude},${mapInfo.longitude}&output=embed`}
              width="100%"
              height="350"
              style={{ border: 0, marginTop: 10 }}
              allowFullScreen=""
              loading="lazy"
            />
          ) : (
            <p>
              {lang === 'en' ? 'Location not available' : lang === 'tc' ? '未有位置資料' : '没有位置信息'}
            </p>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

function StatusBadge({ status, lang }) {
  let text = status;
  let bg = '#bdbdbd';
  if (status === 'OPEN') {
    text = { en: 'OPEN', tc: '開放', sc: '开放' }[lang];
    bg = '#4caf50';
  }
  if (status === 'CLOSED') {
    text = { en: 'CLOSED', tc: '關閉', sc: '关闭' }[lang];
    bg = '#f44336';
  }
  if (status === 'UNKNOWN') {
    text = { en: 'UNKNOWN', tc: '未知', sc: '未知' }[lang];
    bg = '#bdbdbd';
  }
  return (
    <span style={{
      background: bg,
      color: '#fff',
      padding: '2px 16px',
      borderRadius: 8,
      fontWeight: 700,
      fontSize: '1em',
      display: 'inline-block',
      minWidth: 70,
      textAlign: 'center',
      letterSpacing: 1,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    }}>
      {text}
    </span>
  );
}

function VacancyBadge({ value, lang }) {
  if (value === -1) {
    return (
      <span style={{
        background: '#bdbdbd',
        color: '#fff',
        padding: '2px 14px',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: '1em',
        minWidth: 70,
        display: 'inline-block',
        textAlign: 'center',
        letterSpacing: 1,
      }}>
        {lang === 'en' ? 'NO DATA' : lang === 'tc' ? '無資料' : '无资料'}
      </span>
    );
  }
  if (value === 0) {
    return (
      <span style={{
        background: '#f44336',
        color: '#fff',
        padding: '2px 14px',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: '1em',
        minWidth: 70,
        display: 'inline-block',
        textAlign: 'center',
        letterSpacing: 1,
      }}>
        {lang === 'en' ? 'FULL' : lang === 'tc' ? '已滿' : '已满'}
      </span>
    );
  }
  return (
    <span style={{
      background: '#1976d2',
      color: '#fff',
      padding: '2px 14px',
      borderRadius: 8,
      fontWeight: 700,
      fontSize: '1em',
      minWidth: 70,
      display: 'inline-block',
      textAlign: 'center',
      letterSpacing: 1,
    }}>
      {value}
    </span>
  );
}

function CarparkTable({ carparks, vehicleType, onShowMap, onToggleFavorite, favorites, lang }) {
  const [sortColumn, setSortColumn] = useState('vacancy_ranking');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = column => {
    let newDirection = 'asc';
    if (sortColumn === column) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  const carparksWithRanking = carparks.map(c => {
    const vacancy = c[`${vehicleType}_vacancy`];
    let vacancy_ranking = 0;
    if (vacancy === -1) vacancy_ranking = -1;
    else if (vacancy === 0) vacancy_ranking = -2;
    else vacancy_ranking = vacancy;
    return {
      ...c,
      status_ranking: STATUS_ORDER[c.opening_status] ?? 2,
      vacancy_ranking,
    };
  });

  const sortedCarparks = [...carparksWithRanking].sort((a, b) => {
    if (a.status_ranking !== b.status_ranking) {
      return a.status_ranking - b.status_ranking;
    }
    if (sortColumn === 'vacancy_ranking') {
      if (b.vacancy_ranking !== a.vacancy_ranking) return b.vacancy_ranking - a.vacancy_ranking;
    }
    let aValue = a[sortColumn];
    let bValue = b[sortColumn];
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <>
      {/* 桌面 Table */}
      <div className="d-none d-md-block">
        <Table striped hover responsive className="mt-3 align-middle" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <thead style={{ background: '#232323' }}>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: 180, fontWeight: 700, color: '#1976d2' }}>
                {lang === 'en' ? 'Name' : lang === 'tc' ? '名稱' : '名称'} {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('district')} style={{ cursor: 'pointer', minWidth: 120, fontWeight: 700, color: '#1976d2' }}>
                {lang === 'en' ? 'District' : lang === 'tc' ? '地區' : '地区'} {sortColumn === 'district' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('displayAddress')} style={{ cursor: 'pointer', minWidth: 220, fontWeight: 700, color: '#1976d2' }}>
                {lang === 'en' ? 'Address' : lang === 'tc' ? '地址' : '地址'} {sortColumn === 'displayAddress' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('status_ranking')} style={{ cursor: 'pointer', minWidth: 110, fontWeight: 700, color: '#1976d2' }}>
                {lang === 'en' ? 'Status' : lang === 'tc' ? '狀態' : '状态'} {sortColumn === 'status_ranking' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('vacancy_ranking')} style={{ cursor: 'pointer', minWidth: 90, fontWeight: 700, color: '#1976d2' }}>
                {lang === 'en' ? 'Vacancy' : lang === 'tc' ? '空位' : '空位'} {sortColumn === 'vacancy_ranking' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ minWidth: 120, fontWeight: 700, color: '#1976d2' }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedCarparks.map(carpark => (
              <tr key={carpark.park_Id}>
                <td>
                  <Link to={`/info/${carpark.park_Id}`} style={{ fontWeight: 'bold', color: '#1976d2', textDecoration: 'underline' }}>
                    {carpark.name[lang]}
                  </Link>
                </td>
                <td>{carpark.district[lang]}</td>
                <td>{carpark.displayAddress[lang]}</td>
                <td>
                  <StatusBadge status={carpark.opening_status} lang={lang} />
                </td>
                <td>
                  <VacancyBadge value={carpark[`${vehicleType}_vacancy`]} lang={lang} />
                </td>
                <td>
                  <Button variant="outline-primary" size="sm" onClick={() => onShowMap(carpark)} style={{ marginRight: 6 }}>
                    {lang === 'en' ? 'Map' : lang === 'tc' ? '地圖' : '地图'}
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onToggleFavorite(carpark.park_Id)}
                    aria-label={favorites.includes(carpark.park_Id)
                      ? (lang === 'en' ? 'Remove from favorites' : lang === 'tc' ? '從最愛中移除' : '从收藏中移除')
                      : (lang === 'en' ? 'Add to favorites' : lang === 'tc' ? '加入最愛' : '加入收藏')}
                  >
                    {favorites.includes(carpark.park_Id) ? <FaStar style={{ color: '#FFD700', fontSize: 20 }} /> : <FaRegStar style={{ fontSize: 20 }} />}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* 手機 List */}
      <div className="d-md-none">
        <ListGroup>
          {sortedCarparks.map(carpark => (
            <ListGroup.Item key={carpark.park_Id} style={{ marginBottom: 8, borderRadius: '8px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', background: '#fff' }}>
              <div className="d-flex justify-content-between align-items-start">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#1976d2', fontSize: '1.1em' }}>
                    {carpark.name[lang]}
                  </div>
                  <div style={{ color: '#607d8b', fontSize: '0.95em' }}>{carpark.district[lang]}</div>
                  <div style={{ color: '#555', fontSize: '0.95em' }}>{carpark.displayAddress[lang]}</div>
                  <div className="mt-1">
                    <StatusBadge status={carpark.opening_status} lang={lang} />
                  </div>
                  <div className="mt-1">
                    <VacancyBadge value={carpark[`${vehicleType}_vacancy`]} lang={lang} />
                  </div>
                </div>
                <div className="d-flex flex-column align-items-end gap-2 ms-2">
                  <Button variant="outline-primary" size="sm" onClick={() => onShowMap(carpark)} style={{ width: 56 }}>
                    {lang === 'en' ? 'Map' : lang === 'tc' ? '地圖' : '地图'}
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onToggleFavorite(carpark.park_Id)}
                    aria-label={favorites.includes(carpark.park_Id)
                      ? (lang === 'en' ? 'Remove from favorites' : lang === 'tc' ? '從最愛中移除' : '从收藏中移除')
                      : (lang === 'en' ? 'Add to favorites' : lang === 'tc' ? '加入最愛' : '加入收藏')}
                  >
                    {favorites.includes(carpark.park_Id) ? <FaStar style={{ color: '#FFD700', fontSize: 22 }} /> : <FaRegStar style={{ fontSize: 22 }} />}
                  </Button>
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
    </>
  );
}

export default Main;