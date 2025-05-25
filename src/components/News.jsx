import React, { useEffect, useState } from 'react';
import { Accordion, Spinner, Badge, Form, Button, Container, Row, Col } from 'react-bootstrap';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';

const urls = {
    "Temporary Road Closure": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Temporary_Road_Closure.xml",
    "Expressways": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Expressways.xml",
    "Prohibited Zone": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Prohibited_Zone.xml",
    "Special Traffic and Transport Arrangement": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Special_Traffic_and_Transport_Arrangement.xml",
    "Other Notices": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Other_Notices.xml",
    "Temporary Speed Limit": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Temporary_Speed_Limits.xml",
    "Clearways": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Clearways.xml",
    "Public Transport": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Public_Transports.xml"
};

const CATEGORY_LABELS = {
    "Temporary Road Closure": { en: "Temporary Road Closure", tc: "臨時道路封閉", sc: "临时道路封闭" },
    "Expressways": { en: "Expressways", tc: "快速公路", sc: "快速公路" },
    "Prohibited Zone": { en: "Prohibited Zone", tc: "禁區", sc: "禁区" },
    "Special Traffic and Transport Arrangement": { en: "Special Traffic & Transport", tc: "特別交通及運輸", sc: "特别交通及运输" },
    "Other Notices": { en: "Other Notices", tc: "其他通告", sc: "其他通告" },
    "Temporary Speed Limit": { en: "Temporary Speed Limit", tc: "臨時車速限制", sc: "临时车速限制" },
    "Clearways": { en: "Clearways", tc: "禁止上落客貨區", sc: "禁止上落客货区" },
    "Public Transport": { en: "Public Transport", tc: "公共交通服務", sc: "公共交通服务" }
};

function parseXmlNotices(xml, lang) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const nodes = doc.querySelectorAll("Notice");
    const notices = [];
    nodes.forEach(node => {
        notices.push({
            id: node.querySelector("TNID")?.textContent,
            title: node.querySelector(`Title_${lang.toUpperCase()}`)?.textContent || "",
            date: node.querySelector("StartEffectiveDate")?.textContent || "",
            content: node.querySelector(`Content_${lang.toUpperCase()}`)?.textContent || "",
        });
    });
    return notices;
}

const News = ({ lang }) => {
    const [category, setCategory] = useState(Object.keys(urls)[0]);
    const [loading, setLoading] = useState(false);
    const [notices, setNotices] = useState([]);
    const [error, setError] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [lastUpdated, setLastUpdated] = useState("");

    const handleCategoryChange = (newCategory) => {
        setCategory(newCategory);
    };

    const refreshData = () => {
        setLoading(true);
        setError("");
        fetch(urls[category])
            .then(res => res.text())
            .then(xml => {
                setNotices(parseXmlNotices(xml, lang));
                setLastUpdated(new Date().toLocaleTimeString());
                setLoading(false);
            })
            .catch(e => {
                setError(lang === 'en' ? "Failed to fetch news." : lang === 'tc' ? "獲取新聞失敗" : "获取新闻失败");
                setLoading(false);
            });
    };

    useEffect(() => {
        refreshData();
        // eslint-disable-next-line
    }, [category, lang]);

    const filteredNotices = notices.filter(notice =>
        notice.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    const getPlaceholderText = () => {
        if (lang === 'en') return "Search title or content...";
        if (lang === 'tc') return "搜尋標題或內容...";
        return "搜索标题或内容...";
    };

    return (
        <Container className="my-4">
            <Row className="mb-4">
                <Col>
                    <h1 className="fw-bold" style={{ color: '#1a237e', fontSize: '2.2rem' }}>
                        {lang === "en" ? "Traffic News" : lang === "tc" ? "交通消息" : "交通消息"}
                    </h1>
                </Col>
            </Row>

            <Row className="mb-4 g-3 align-items-center">
                <Col md={4}>
                    <Form.Select
                        value={category}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="shadow-sm"
                    >
                        {Object.keys(urls).map(key => (
                            <option key={key} value={key}>
                                {CATEGORY_LABELS[key][lang]}
                            </option>
                        ))}
                    </Form.Select>
                </Col>
                <Col md={5}>
                    <div className="position-relative">
                        <Form.Control
                            type="text"
                            placeholder={getPlaceholderText()}
                            value={searchKeyword}
                            onChange={e => setSearchKeyword(e.target.value)}
                            className="shadow-sm ps-4"
                        />
                        <FiSearch className="position-absolute top-50 start-0 translate-middle-y ms-2" />
                    </div>
                </Col>
                <Col md={3} className="d-flex align-items-center gap-3">
                    <Button
                        variant="outline-primary"
                        onClick={refreshData}
                        disabled={loading}
                        className="shadow-sm"
                    >
                        {loading ? (
                            <Spinner animation="border" size="sm" />
                        ) : (
                            <>
                                <FiRefreshCw className="me-1" />
                                {lang === 'en' ? 'Refresh' : lang === 'tc' ? '刷新' : '刷新'}
                            </>
                        )}
                    </Button>
                    <Badge bg="info" pill className="px-3 py-2">
                        {filteredNotices.length} {lang === 'en' ? 'items' : lang === 'tc' ? '項' : '项'}
                    </Badge>
                </Col>
            </Row>

            {lastUpdated && (
                <div className="text-muted small mb-3">
                    {lang === 'en' ? 'Last updated:' : lang === 'tc' ? '最後更新:' : '最后更新:'} {lastUpdated}
                </div>
            )}

            {loading && !lastUpdated ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <div className="mt-2">
                        {lang === 'en' ? 'Loading...' : lang === 'tc' ? '載入中...' : '加载中...'}
                    </div>
                </div>
            ) : error ? (
                <div className="alert alert-danger">{error}</div>
            ) : filteredNotices.length === 0 ? (
                <div className="alert alert-info">
                    {lang === 'en' ? 'No notices found.' : lang === 'tc' ? '找不到通告。' : '找不到通告。'}
                </div>
            ) : (
                <Accordion alwaysOpen className="shadow-sm">
                    {filteredNotices.map((notice, idx) => (
                        <Accordion.Item eventKey={String(idx)} key={notice.id || idx} className="mb-2 border-0">
                            <Accordion.Header className="bg-light">
                                <div className="d-flex flex-column w-100">
                                    <div className="d-flex justify-content-between w-100">
                                        <span className="fw-bold text-primary">{notice.title}</span>
                                        <small className="text-muted">{notice.date}</small>
                                    </div>
                                    <small className="text-muted text-truncate">
                                        {
                                            notice.content
                                                .replace(/<[^>]*>/g, '') // 移除 HTML 標籤
                                                .replace(/(&nbsp;|\s)+/g, ' ') // 將 &nbsp; 及多餘空白合併為單一空白
                                                .trim()
                                                .substring(0, 100)
                                        }...
                                    </small>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body className="bg-white">
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: notice.content.replace(/(&nbsp;){2,}/g, ' ') // 只顯示單一空白
                                    }}
                                    style={{ lineHeight: '1.6', whiteSpace: 'pre-line' }}
                                />
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}
        </Container>
    );
};

export default News;