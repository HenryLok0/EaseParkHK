import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spinner, Button, Container, Row, Col, Card, ListGroup, Table } from 'react-bootstrap';
import { Telephone, Globe, Map } from 'react-bootstrap-icons';

function CarparkDetail({ lang = 'en' }) {
  const { park_id } = useParams();
  const [info, setInfo] = useState(null);
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const [infoRes, vacancyRes] = await Promise.all([
          fetch('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json'),
          fetch('https://resource.data.one.gov.hk/td/carpark/vacancy_all.json'),
        ]);
        const infoData = await infoRes.json();
        const vacancyData = await vacancyRes.json();

        const carparkInfo = (infoData.car_park || []).find(c => c.park_id === park_id);
        const carparkVacancy = (vacancyData.car_park || []).find(c => c.park_id === park_id);

        setInfo(carparkInfo);
        setVacancy(carparkVacancy);
        setLastFetched(new Date());
      } catch (e) {
        setInfo(null);
        setVacancy(null);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [park_id]);

  const translations = {
    en: {
      back: 'Back',
      district: 'District',
      address: 'Address',
      contactNo: 'Contact Number',
      status: 'Opening Status',
      heightLimit: 'Height Limit',
      remark: 'Remarks',
      vacancyInfo: 'Vacancy Information',
      locationMap: 'Location Map',
      vehicleType: 'Vehicle Type',
      serviceCategory: 'Service Category',
      vacancy: 'Vacancy',
      lastUpdate: 'Last Update',
      noVacancy: 'No vacancy information available.',
      mapNotAvailable: 'Map not available.',
      carparkNotFound: 'Carpark Not Found',
      loading: 'Loading car park details...',
      generalInfo: 'General Information',
      location: 'Location',
      contact: 'Contact',
      additionalDetails: 'Additional Details',
      name: 'Name',
      website: 'Website',
      openingStatus: 'Opening Status',
      dataLastUpdated: 'Data last updated at',
    },
    tc: {
      back: '返回',
      district: '地區',
      address: '地址',
      contactNo: '聯絡電話',
      status: '狀態',
      heightLimit: '高度限制',
      remark: '備註',
      vacancyInfo: '空位資訊',
      locationMap: '位置地圖',
      vehicleType: '車輛類型',
      serviceCategory: '服務類別',
      vacancy: '空位',
      lastUpdate: '最後更新',
      noVacancy: '沒有空位資訊。',
      mapNotAvailable: '地圖不可用。',
      carparkNotFound: '找不到停車場',
      loading: '正在載入停車場詳情...',
      generalInfo: '一般資訊',
      location: '位置',
      contact: '聯絡',
      additionalDetails: '其他詳情',
      name: '名稱',
      website: '網站',
      openingStatus: '開放狀態',
      dataLastUpdated: '資料最後更新於',
    },
    sc: {
      back: '返回',
      district: '地区',
      address: '地址',
      contactNo: '联系电话',
      status: '状态',
      heightLimit: '高度限制',
      remark: '备注',
      vacancyInfo: '空位信息',
      locationMap: '位置地图',
      vehicleType: '车辆类型',
      serviceCategory: '服务类别',
      vacancy: '空位',
      lastUpdate: '最后更新',
      noVacancy: '没有空位信息。',
      mapNotAvailable: '地图不可用。',
      carparkNotFound: '未找到停车场',
      loading: '正在加载停车场详情...',
      generalInfo: '一般信息',
      location: '位置',
      contact: '联系',
      additionalDetails: '其他详情',
      name: '名称',
      website: '网站',
      openingStatus: '开放状态',
      dataLastUpdated: '数据最后更新于',
    },
  };

  const vehicleTypeMap = {
    en: {
      P: 'Private Car',
      L: 'Large Goods Vehicle',
      H: 'Heavy Goods Vehicle',
      M: 'Motor Cycle',
    },
    tc: {
      P: '私家車',
      L: '大型貨車',
      H: '重型貨車',
      M: '電單車',
    },
    sc: {
      P: '私家车',
      L: '大型货车',
      H: '重型货车',
      M: '摩托车',
    },
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">{translations[lang].loading}</p>
      </Container>
    );
  }

  if (!info) {
    return (
      <Container className="my-5">
        <h2>{translations[lang].carparkNotFound}</h2>
        <Link to="/">
          <Button variant="primary">{translations[lang].back}</Button>
        </Link>
      </Container>
    );
  }

  // 計算圖片高度，與資訊欄一致
  const photoHeight = 380; // px

  return (
    <Container className="my-5">
      {/* Google Map */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body style={{ padding: 0 }}>
              {info.latitude && info.longitude ? (
                <iframe
                  title="Google Map"
                  src={`https://www.google.com/maps?q=${info.latitude},${info.longitude}&output=embed`}
                  width="100%"
                  height="250"
                  style={{ border: 0, borderRadius: 8, minHeight: 200 }}
                  allowFullScreen=""
                  loading="lazy"
                />
              ) : (
                <div style={{ padding: 16 }}>
                  <p>{translations[lang].mapNotAvailable}</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* 圖片 + 一般資訊 + 聯絡 */}
      <Row className="mb-4">
        {info.carpark_photo && (
          <Col md={4} className="d-flex align-items-stretch mb-3 mb-md-0">
            <Card className="w-100 h-100">
              <Card.Img
                src={info.carpark_photo}
                alt="Car park photo"
                style={{
                  objectFit: 'cover',
                  height: `${photoHeight}px`,
                  minHeight: `${photoHeight}px`,
                  maxHeight: `${photoHeight}px`,
                  borderRadius: '0.5rem 0.5rem 0 0',
                }}
              />
            </Card>
          </Col>
        )}
        <Col md={info.carpark_photo ? 8 : 12}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>{translations[lang].generalInfo}</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>{translations[lang].name}</strong>: {info[`name_${lang}`] || info.name_en}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>{translations[lang].address}</strong>: {info[`displayAddress_${lang}`] || info.displayAddress_en}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>{translations[lang].district}</strong>: {info[`district_${lang}`] || info.district_en}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>{translations[lang].openingStatus}</strong>: {info.opening_status || 'N/A'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>{translations[lang].heightLimit}</strong>: {info.height ? `${info.height}m` : 'N/A'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>{translations[lang].remark}</strong>: {info[`remark_${lang}`] || info.remark_en || 'N/A'}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title>{translations[lang].contact}</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Telephone className="me-2" />
                  <strong>{translations[lang].contactNo}</strong>: {info.contactNo || 'N/A'}
                </ListGroup.Item>
                {info[`website_${lang}`] && (
                  <ListGroup.Item>
                    <Globe className="me-2" />
                    <strong>{translations[lang].website}</strong>: <a href={info[`website_${lang}`]} target="_blank" rel="noopener noreferrer">{info[`website_${lang}`]}</a>
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* Vacancy */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>{translations[lang].vacancyInfo}</Card.Title>
              {vacancy && vacancy.vehicle_type && vacancy.vehicle_type.length > 0 ? (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th scope="col">{translations[lang].vehicleType}</th>
                      <th scope="col">{translations[lang].serviceCategory}</th>
                      <th scope="col">{translations[lang].vacancy}</th>
                      <th scope="col">{translations[lang].lastUpdate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vacancy.vehicle_type.map(vt =>
                      vt.service_category.map(sc => (
                        <tr key={`${vt.type}-${sc.category}`}>
                          <td>{vehicleTypeMap[lang][vt.type] || vt.type}</td>
                          <td>{sc.category}</td>
                          <td style={{ color: sc.vacancy > 0 ? 'green' : sc.vacancy === 0 ? 'red' : 'gray' }}>
                            {sc.vacancy >= 0 ? sc.vacancy : 'N/A'}
                          </td>
                          <td>{new Date(sc.lastupdate).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              ) : (
                <p>{translations[lang].noVacancy}</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <p className="text-muted mt-4">
        {translations[lang].dataLastUpdated}: {lastFetched ? lastFetched.toLocaleString() : 'N/A'}
      </p>
    </Container>
  );
}

export default CarparkDetail;