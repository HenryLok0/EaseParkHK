import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const TC_URL = 'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_Tc.xml';
const SC_URL = 'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_Sc.xml';
const EN_URL = 'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml';

// 主區域對照表
const MAIN_DISTRICT_MAP = {
    'hong_kong_island': [
        'Central and Western', '中西區', '中西区',
        'Wan Chai', '灣仔區', '湾仔区',
        'Eastern', '東區', '东区',
        'Southern', '南區', '南区'
    ],
    'kowloon': [
        'Yau Tsim Mong', '油尖旺區', '油尖旺区',
        'Sham Shui Po', '深水埗區', '深水埗区',
        'Kowloon City', '九龍城區', '九龙城区',
        'Wong Tai Sin', '黃大仙區', '黄大仙区',
        'Kwun Tong', '觀塘區', '观塘区'
    ],
    'new_territories': [
        'Kwai Tsing', '葵青區', '葵青区',
        'Tsuen Wan', '荃灣區', '荃湾区',
        'Yuen Long', '元朗區', '元朗区',
        'Tuen Mun', '屯門區', '屯门区',
        'North', '北區', '北区',
        'Tai Po', '大埔區', '大埔区',
        'Sha Tin', '沙田區', '沙田区',
        'Sai Kung', '西貢區', '西贡区',
        'Islands', '離島區', '离岛区'
    ]
};

// 子區域對照表
const DISTRICT_MAP = {
    'central-western': ['Central and Western', '中西區', '中西区'],
    'wan-chai': ['Wan Chai', '灣仔區', '湾仔区'],
    'eastern': ['Eastern', '東區', '东区'],
    'southern': ['Southern', '南區', '南区'],
    'yau-tsim-mong': ['Yau Tsim Mong', '油尖旺區', '油尖旺区'],
    'sham-shui-po': ['Sham Shui Po', '深水埗區', '深水埗区'],
    'kowloon-city': ['Kowloon City', '九龍城區', '九龙城区'],
    'wong-tai-sin': ['Wong Tai Sin', '黃大仙區', '黄大仙区'],
    'kwun-tong': ['Kwun Tong', '觀塘區', '观塘区'],
    'kwai-tsing': ['Kwai Tsing', '葵青區', '葵青区'],
    'tsuen-wan': ['Tsuen Wan', '荃灣區', '荃湾区'],
    'yuen-long': ['Yuen Long', '元朗區', '元朗区'],
    'tuen-mun': ['Tuen Mun', '屯門區', '屯门区'],
    'north': ['North', '北區', '北区'],
    'tai-po': ['Tai Po', '大埔區', '大埔区'],
    'sha-tin': ['Sha Tin', '沙田區', '沙田区'],
    'sai-kung': ['Sai Kung', '西貢區', '西贡区'],
    'islands': ['Islands', '離島區', '离岛区'],
};

function parseXml(xml) {
    const images = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    doc.querySelectorAll('image').forEach(img => {
        images.push({
            key: img.querySelector('key')?.textContent,
            region: img.querySelector('region')?.textContent,
            district: img.querySelector('district')?.textContent,
            description: img.querySelector('description')?.textContent,
            url: img.querySelector('url')?.textContent,
            latitude: img.querySelector('latitude')?.textContent,
            longitude: img.querySelector('longitude')?.textContent,
        });
    });
    return images;
}

// 取得顯示用地區名稱
function getDisplayDistrictName(param, lang) {
    if (!param) return '';
    const key = param.replace(/[_\-\s]/g, '').toLowerCase();
    // 主區域
    const mainKey = Object.keys(MAIN_DISTRICT_MAP).find(
        k => k.replace(/[_\-\s]/g, '').toLowerCase() === key
    );
    if (mainKey) {
        if (lang === 'tc') {
            if (mainKey === 'hong_kong_island') return '港島';
            if (mainKey === 'kowloon') return '九龍';
            if (mainKey === 'new_territories') return '新界';
        } else if (lang === 'sc') {
            if (mainKey === 'hong_kong_island') return '港岛';
            if (mainKey === 'kowloon') return '九龙';
            if (mainKey === 'new_territories') return '新界';
        } else {
            if (mainKey === 'hong_kong_island') return 'Hong Kong Island';
            if (mainKey === 'kowloon') return 'Kowloon';
            if (mainKey === 'new_territories') return 'New Territories';
        }
    }
    // 子區域
    const found = Object.entries(DISTRICT_MAP).find(
        ([k]) => k.replace(/[_\-\s]/g, '').toLowerCase() === key
    );
    if (found) {
        if (lang === 'tc') return found[1][1];
        if (lang === 'sc') return found[1][2];
        return found[1][0];
    }
    return param;
}

function Cameredistrist({ lang }) {
    const { district } = useParams();
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState(null); // {lat, lng, desc}

    function getDistrictNames(param) {
        if (!param) return [];
        const key = param.replace(/[_\-\s]/g, '').toLowerCase();
        // 主區域（支援底線、dash、空格、大小寫）
        const mainKey = Object.keys(MAIN_DISTRICT_MAP).find(
            k => k.replace(/[_\-\s]/g, '').toLowerCase() === key
        );
        if (mainKey) {
            return MAIN_DISTRICT_MAP[mainKey];
        }
        // 子區域
        const found = Object.entries(DISTRICT_MAP).find(
            ([k]) => k.replace(/[_\-\s]/g, '').toLowerCase() === key
        );
        return found ? found[1] : [param];
    }

    useEffect(() => {
        setLoading(true);
        let url = EN_URL;
        if (lang === 'tc') url = TC_URL;
        else if (lang === 'sc') url = SC_URL;
        fetch(url)
            .then(res => res.text())
            .then(xml => {
                const cams = parseXml(xml);
                setCameras(cams);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [lang]);

    // 只顯示對應 district 或主區域的攝影機
    const districtNames = getDistrictNames(district);
    const filteredCameras = cameras.filter(c =>
        districtNames.includes(c.district)
    );

    return (
        <div className="container py-3">
            <h2>
                {lang === 'tc'
                    ? `${getDisplayDistrictName(district, lang)}交通鏡頭`
                    : lang === 'sc'
                        ? `${getDisplayDistrictName(district, lang)}交通摄像头`
                        : `Traffic Cameras in ${getDisplayDistrictName(district, lang)}`}
            </h2>
            {loading ? (
                <div>{lang === 'tc' ? '載入中...' : lang === 'sc' ? '加载中...' : 'Loading...'}</div>
            ) : (
                <div className="row">
                    {filteredCameras.length > 0 ? (
                        filteredCameras.map(c => (
                            <div className="col-md-4 mb-4" key={c.key}>
                                <div className="card shadow-sm h-100">
                                    <img src={c.url} className="card-img-top" alt={c.description} style={{ objectFit: 'cover', height: 200 }} />
                                    <div className="card-body d-flex flex-column">
                                        <h6 className="card-title">{c.description}</h6>
                                        <div className="mb-2 text-muted" style={{ fontSize: 14 }}>{c.region} / {c.district}</div>
                                        {c.latitude && c.longitude && (
                                            <button
                                                className="btn btn-outline-primary btn-sm mt-auto"
                                                onClick={() => setPopup({
                                                    lat: c.latitude,
                                                    lng: c.longitude,
                                                    desc: c.description
                                                })}
                                            >
                                                {lang === 'tc' ? '地圖' : lang === 'sc' ? '地图' : 'Map'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div>
                            {lang === 'tc'
                                ? '此地區沒有攝影機'
                                : lang === 'sc'
                                    ? '此地区没有摄像机'
                                    : 'No cameras in this district'}
                        </div>
                    )}
                </div>
            )}
            {/* Popup */}
            {popup && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={() => setPopup(null)}
                >
                    <div
                        style={{
                            background: '#fff',
                            padding: 20,
                            borderRadius: 8,
                            maxWidth: 600,
                            width: '90%',
                            position: 'relative',
                            boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                border: 'none',
                                background: 'transparent',
                                fontSize: 24,
                                cursor: 'pointer'
                            }}
                            onClick={() => setPopup(null)}
                            aria-label="Close"
                        >&times;</button>
                        <h5 className="mb-3">{popup.desc}</h5>
                        <div style={{ width: '100%', height: 0, paddingBottom: '56%', position: 'relative' }}>
                            <iframe
                                title="Google Map"
                                src={`https://www.google.com/maps?q=${popup.lat},${popup.lng}&output=embed`}
                                width="100%"
                                height="100%"
                                style={{ border: 0, position: 'absolute', top: 0, left: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                            ></iframe>
                        </div>
                        <div className="mt-3 text-center">
                            <a
                                href={`https://www.google.com/maps?q=${popup.lat},${popup.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-link"
                            >
                                {lang === 'tc' ? '在 Google 地圖開啟' : lang === 'sc' ? '在 Google 地图打开' : 'Open in Google Maps'}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cameredistrist;