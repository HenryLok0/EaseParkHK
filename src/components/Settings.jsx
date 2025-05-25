import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, ListGroup, InputGroup, Row, Col, Modal, Badge, OverlayTrigger, Tooltip, Spinner } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';

function getCarparkName(id, lang, carparkList) {
  const found = carparkList.find(c => c.park_id === id);
  if (!found) return '';
  if (lang === 'tc') return found.name_tc;
  if (lang === 'sc') return found.name_sc;
  return found.name_en;
}

function Settings({ lang, onLangChange, darkMode, onThemeToggle }) {
  const [carparkList, setCarparkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favorite_carparks') || '[]'));
  const [groups, setGroups] = useState(() => JSON.parse(localStorage.getItem('carpark_groups') || '{}'));
  const [newGroup, setNewGroup] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [carparkId, setCarparkId] = useState('');
  const [search, setSearch] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
      .then(res => res.json())
      .then(data => {
        setCarparkList(data.car_park || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('favorite_carparks', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('carpark_groups', JSON.stringify(groups));
  }, [groups]);

  const handleAddGroup = () => {
    if (newGroup && !groups[newGroup]) {
      setGroups({ ...groups, [newGroup]: [] });
      setNewGroup('');
    }
  };

  const handleDeleteGroup = group => {
    setGroupToDelete(group);
    setShowConfirm(true);
  };

  const confirmDeleteGroup = () => {
    const newGroups = { ...groups };
    delete newGroups[groupToDelete];
    setGroups(newGroups);
    if (selectedGroup === groupToDelete) setSelectedGroup('');
    setShowConfirm(false);
    setGroupToDelete('');
  };

  const handleEditGroup = group => {
    setEditGroup(group);
    setEditGroupName(group);
    setShowEditModal(true);
  };

  const confirmEditGroup = () => {
    if (!editGroupName || (groups[editGroupName] && editGroupName !== editGroup)) return;
    const newGroups = {};
    Object.entries(groups).forEach(([g, ids]) => {
      newGroups[g === editGroup ? editGroupName : g] = ids;
    });
    setGroups(newGroups);
    if (selectedGroup === editGroup) setSelectedGroup(editGroupName);
    setShowEditModal(false);
    setEditGroup('');
    setEditGroupName('');
  };

  const handleAddFavorite = () => {
    if (carparkId && !favorites.includes(carparkId)) {
      setFavorites([...favorites, carparkId]);
      // 如果有選擇群組，直接加入
      if (selectedGroup && groups[selectedGroup] && !groups[selectedGroup].includes(carparkId)) {
        setGroups({
          ...groups,
          [selectedGroup]: [...groups[selectedGroup], carparkId],
        });
      }
    }
    setCarparkId('');
  };

  const handleRemoveFavorite = id => {
    setFavorites(favorites.filter(f => f !== id));
    const newGroups = {};
    Object.keys(groups).forEach(g => {
      newGroups[g] = groups[g].filter(cid => cid !== id);
    });
    setGroups(newGroups);
  };

  const handleAddToGroup = id => {
    if (selectedGroup && groups[selectedGroup] && !groups[selectedGroup].includes(id)) {
      setGroups({
        ...groups,
        [selectedGroup]: [...groups[selectedGroup], id],
      });
    }
  };

  const handleRemoveFromGroup = (group, id) => {
    setGroups({
      ...groups,
      [group]: groups[group].filter(cid => cid !== id),
    });
  };

  const handleSortFavorites = () => {
    const sorted = [...favorites].sort((a, b) => {
      const nameA = getCarparkName(a, lang, carparkList);
      const nameB = getCarparkName(b, lang, carparkList);
      return nameA.localeCompare(nameB, lang === 'tc' ? 'zh-Hant' : lang === 'sc' ? 'zh-Hans' : 'en');
    });
    setFavorites(sorted);
  };

  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData('favoriteIdx', idx);
  };

  const handleDrop = (e, idx) => {
    const fromIdx = parseInt(e.dataTransfer.getData('favoriteIdx'), 10);
    if (isNaN(fromIdx)) return;
    const arr = [...favorites];
    const [removed] = arr.splice(fromIdx, 1);
    arr.splice(idx, 0, removed);
    setFavorites(arr);
  };

  const filteredCarparks = carparkList.filter(c =>
    getCarparkName(c.park_id, lang, carparkList).toLowerCase().includes(search.toLowerCase())
  );

  const renderTooltip = msg => <Tooltip>{msg}</Tooltip>;

  return (
    <Container className="my-5">
      {/* Language and Theme Settings */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title>
            <i className="bi bi-gear me-2" />
            {lang === 'en' ? 'Settings' : lang === 'tc' ? '設定' : '设置'}
          </Card.Title>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-translate me-1" />
                {lang === 'en' ? 'Language' : lang === 'tc' ? '語言' : '语言'}
              </Form.Label>
              <Form.Select value={lang} onChange={e => onLangChange(e.target.value)}>
                <option value="en">English</option>
                <option value="tc">繁體中文</option>
                <option value="sc">简体中文</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-moon-stars me-1" />
                {lang === 'en' ? 'Theme' : lang === 'tc' ? '主題' : '主题'}
              </Form.Label>
              <Button
                variant={darkMode ? 'secondary' : 'outline-secondary'}
                onClick={onThemeToggle}
              >
                {darkMode
                  ? lang === 'en' ? 'Dark Mode' : lang === 'tc' ? '深色模式' : '深色模式'
                  : lang === 'en' ? 'Light Mode' : lang === 'tc' ? '淺色模式' : '浅色模式'}
              </Button>
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>

      {/* Favorite Carparks Management */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title>
            <i className="bi bi-star-fill text-warning me-2" />
            {lang === 'en' ? 'Manage Favourite Carparks' : lang === 'tc' ? '管理收藏車場' : '管理收藏车场'}
          </Card.Title>
          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <InputGroup className="mb-3">
                <Form.Control
                  placeholder={lang === 'en' ? 'Search Carpark...' : lang === 'tc' ? '搜尋車場...' : '搜索车场...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <Form.Select value={carparkId} onChange={e => setCarparkId(e.target.value)}>
                  <option value="">
                    {lang === 'en' ? 'Select Carpark' : lang === 'tc' ? '選擇車場' : '选择车场'}
                  </option>
                  {filteredCarparks.map(c => (
                    <option key={c.park_id} value={c.park_id}>
                      {getCarparkName(c.park_id, lang, carparkList)}
                    </option>
                  ))}
                </Form.Select>
                <Button variant="primary" onClick={handleAddFavorite} disabled={!carparkId}>
                  <i className="bi bi-plus-circle me-1" />
                  {lang === 'en' ? 'Add' : lang === 'tc' ? '加入' : '加入'}
                </Button>
                <Button variant="outline-secondary" onClick={handleSortFavorites}>
                  <i className="bi bi-sort-alpha-down" />
                </Button>
              </InputGroup>
              <ListGroup>
                {favorites.length === 0 ? (
                  <ListGroup.Item className="text-center">
                    {lang === 'en' ? 'No favourites yet.' : lang === 'tc' ? '暫無收藏。' : '暂无收藏。'}
                  </ListGroup.Item>
                ) : (
                  favorites.map((id, idx) => (
                    <ListGroup.Item
                      key={id}
                      draggable
                      onDragStart={e => handleDragStart(e, idx)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDrop(e, idx)}
                      style={{ cursor: 'grab' }}
                    >
                      <Row>
                        <Col xs={1}>
                          <i className="bi bi-grip-vertical" />
                        </Col>
                        <Col xs={5}>
                          {getCarparkName(id, lang, carparkList)}
                        </Col>
                        <Col xs={6} className="text-end">
                          <OverlayTrigger
                            placement="top"
                            overlay={renderTooltip(lang === 'en' ? 'Remove from favourites' : lang === 'tc' ? '從收藏移除' : '从收藏移除')}
                          >
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleRemoveFavorite(id)}
                              className="me-2"
                            >
                              <i className="bi bi-x-lg" />
                            </Button>
                          </OverlayTrigger>
                          <Form.Select
                            size="sm"
                            value={selectedGroup}
                            onChange={e => setSelectedGroup(e.target.value)}
                            style={{ width: 'auto', display: 'inline-block' }}
                          >
                            <option value="">
                              {lang === 'en' ? 'Select Group' : lang === 'tc' ? '選擇群組' : '选择群组'}
                            </option>
                            {Object.keys(groups).map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </Form.Select>
                          <OverlayTrigger
                            placement="top"
                            overlay={renderTooltip(lang === 'en' ? 'Add to group' : lang === 'tc' ? '加入群組' : '加入群组')}
                          >
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleAddToGroup(id)}
                              disabled={!selectedGroup}
                              className="ms-2"
                            >
                              <i className="bi bi-collection" />
                            </Button>
                          </OverlayTrigger>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
              {favorites.length > 0 && (
                <small className="text-muted mt-2 d-block">
                  <i className="bi bi-info-circle me-1" />
                  {lang === 'en' ? 'Drag to reorder your favourites.' : lang === 'tc' ? '拖曳以排序收藏車場。' : '拖拽以排序收藏车场。'}
                </small>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Group Management */}
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>
            <i className="bi bi-collection-fill me-2" />
            {lang === 'en' ? 'Carpark Groups' : lang === 'tc' ? '車場群組' : '车场群组'}
          </Card.Title>
          <InputGroup className="mb-3">
            <Form.Control
              placeholder={lang === 'en' ? 'New Group Name' : lang === 'tc' ? '新群組名稱' : '新群组名称'}
              value={newGroup}
              onChange={e => setNewGroup(e.target.value)}
              maxLength={20}
            />
            <Button
              variant="success"
              onClick={handleAddGroup}
              disabled={!newGroup || groups[newGroup]}
            >
              <i className="bi bi-plus-circle me-1" />
              {lang === 'en' ? 'Add Group' : lang === 'tc' ? '新增群組' : '新增群组'}
            </Button>
          </InputGroup>
          <ListGroup>
            {Object.keys(groups).length === 0 ? (
              <ListGroup.Item className="text-center">
                {lang === 'en' ? 'No groups yet.' : lang === 'tc' ? '暫無群組。' : '暂无群组。'}
              </ListGroup.Item>
            ) : (
              Object.entries(groups).map(([g, ids]) => (
                <ListGroup.Item key={g}>
                  <Row>
                    <Col xs={6}>
                      <strong>{g}</strong>
                      <OverlayTrigger
                        placement="top"
                        overlay={renderTooltip(lang === 'en' ? 'Edit group name' : lang === 'tc' ? '編輯群組名稱' : '编辑群组名称')}
                      >
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => handleEditGroup(g)}
                          className="ms-2 p-0"
                        >
                          <i className="bi bi-pencil" />
                        </Button>
                      </OverlayTrigger>
                    </Col>
                    <Col xs={6} className="text-end">
                      <OverlayTrigger
                        placement="top"
                        overlay={renderTooltip(lang === 'en' ? 'Delete group' : lang === 'tc' ? '刪除群組' : '删除群组')}
                      >
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteGroup(g)}
                        >
                          <i className="bi bi-trash" />
                        </Button>
                      </OverlayTrigger>
                    </Col>
                  </Row>
                  <div className="mt-2">
                    {ids.length === 0 ? (
                      <span className="text-muted">
                        {lang === 'en' ? 'No carparks in this group.' : lang === 'tc' ? '此群組沒有車場。' : '此群组没有车场。'}
                      </span>
                    ) : (
                      ids.map(id => (
                        <Badge key={id} bg="secondary" className="me-2 mb-1">
                          {getCarparkName(id, lang, carparkList)}
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleRemoveFromGroup(g, id)}
                            style={{ color: 'white', textDecoration: 'none', marginLeft: '4px', padding: 0 }}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        </Card.Body>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {lang === 'en' ? 'Confirm Delete' : lang === 'tc' ? '確認刪除' : '确认删除'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {lang === 'en'
            ? `Are you sure you want to delete the group "${groupToDelete}"?`
            : lang === 'tc'
              ? `確定要刪除群組「${groupToDelete}」嗎？`
              : `确定要删除群组「${groupToDelete}」吗？`}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            {lang === 'en' ? 'Cancel' : lang === 'tc' ? '取消' : '取消'}
          </Button>
          <Button variant="danger" onClick={confirmDeleteGroup}>
            {lang === 'en' ? 'Delete' : lang === 'tc' ? '刪除' : '删除'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Group Name Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {lang === 'en' ? 'Edit Group Name' : lang === 'tc' ? '編輯群組名稱' : '编辑群组名称'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            value={editGroupName}
            onChange={e => setEditGroupName(e.target.value)}
            maxLength={20}
          />
          {editGroupName && groups[editGroupName] && editGroupName !== editGroup && (
            <small className="text-danger mt-2 d-block">
              {lang === 'en' ? 'Group name already exists.' : lang === 'tc' ? '群組名稱已存在。' : '群组名称已存在。'}
            </small>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            {lang === 'en' ? 'Cancel' : lang === 'tc' ? '取消' : '取消'}
          </Button>
          <Button
            variant="primary"
            onClick={confirmEditGroup}
            disabled={!editGroupName || (groups[editGroupName] && editGroupName !== editGroup)}
          >
            {lang === 'en' ? 'Save' : lang === 'tc' ? '儲存' : '保存'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Settings;