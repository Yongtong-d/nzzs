from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.common.config import settings
from app.common.database import get_db
from app.order_option.service import order_option_service
from app.user.model import User
from app.user.role import UserRole

router = APIRouter(tags=['admin'])

ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'password'
ADMIN_COOKIE_NAME = 'nzzs_admin_session'
ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode('utf-8')


def _b64url_decode(raw: str) -> bytes:
    padding = '=' * (-len(raw) % 4)
    return base64.urlsafe_b64decode(f'{raw}{padding}')


def _sign(raw: str) -> str:
    return _b64url_encode(hmac.new(settings.jwt_secret_key.encode('utf-8'), raw.encode('utf-8'), hashlib.sha256).digest())


def _create_admin_session(username: str) -> str:
    payload = {'u': username, 'exp': int(time.time()) + ADMIN_SESSION_TTL_SECONDS}
    encoded_payload = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signature = _sign(encoded_payload)
    return f'{encoded_payload}.{signature}'


def _verify_admin_session(token: str | None) -> bool:
    if not token or '.' not in token:
        return False

    encoded_payload, signature = token.split('.', 1)
    if not hmac.compare_digest(_sign(encoded_payload), signature):
        return False

    try:
        payload = json.loads(_b64url_decode(encoded_payload).decode('utf-8'))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return False

    if payload.get('u') != ADMIN_USERNAME:
        return False

    exp = payload.get('exp')
    return isinstance(exp, int) and exp >= int(time.time())


def _require_admin(request: Request) -> None:
    if not _verify_admin_session(request.cookies.get(ADMIN_COOKIE_NAME)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Admin authentication required')


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AdminUserUpdateRequest(BaseModel):
    role: UserRole
    nickname: str = Field(..., min_length=1, max_length=50)
    real_name: str | None = Field(default=None, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    id_card: str | None = Field(default=None, max_length=32)


class AdminOrderOptionsUpdateRequest(BaseModel):
    pet_types: list[str] = Field(default_factory=list)
    service_types: list[str] = Field(default_factory=list)


def _normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


def _normalize_option_values(values: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for raw in values:
        text = raw.strip()
        if not text or text in seen:
            continue
        normalized.append(text[:50])
        seen.add(text)

    return normalized


@router.get('/admin/login', response_class=HTMLResponse)
def admin_login_page(request: Request) -> HTMLResponse:
    if _verify_admin_session(request.cookies.get(ADMIN_COOKIE_NAME)):
        return RedirectResponse(url='/admin', status_code=status.HTTP_302_FOUND)

    return HTMLResponse(
        """
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NZZS 后台登录</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; }
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { width: 340px; background: #fff; border: 1px solid #eaeaea; border-radius: 12px; padding: 24px; }
    h1 { margin: 0 0 16px; font-size: 22px; color: #222; }
    input { width: 100%; height: 40px; margin-bottom: 12px; border: 1px solid #eaeaea; border-radius: 8px; padding: 0 10px; box-sizing: border-box; }
    button { width: 100%; height: 40px; border: 0; border-radius: 8px; background: #222; color: #fff; }
    .hint { margin-top: 10px; color: #888; font-size: 12px; }
    .err { margin-top: 8px; color: #c0392b; font-size: 13px; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <h1>后台登录</h1>
    <input id="username" placeholder="用户名" value="admin" />
    <input id="password" placeholder="密码" type="password" value="password" />
    <button id="submit">登录</button>
    <div class="hint">默认账号：admin / password</div>
    <div id="err" class="err"></div>
  </div>
</div>
<script>
  document.getElementById('submit').addEventListener('click', async function () {
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    var err = document.getElementById('err');
    err.textContent = '';
    try {
      var resp = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username, password: password })
      });
      if (!resp.ok) {
        var data = await resp.json();
        throw new Error((data && data.detail) || '登录失败');
      }
      location.href = '/admin';
    } catch (e) {
      err.textContent = e && e.message ? e.message : '登录失败';
    }
  });
</script>
</body>
</html>
        """.strip()
    )


@router.post('/admin/api/login')
def admin_login(payload: AdminLoginRequest) -> Response:
    if payload.username != ADMIN_USERNAME or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid admin credentials')

    response = JSONResponse({'message': 'ok'})
    response.set_cookie(
        key=ADMIN_COOKIE_NAME,
        value=_create_admin_session(payload.username),
        max_age=ADMIN_SESSION_TTL_SECONDS,
        httponly=True,
        samesite='lax',
    )
    return response


@router.post('/admin/api/logout')
def admin_logout() -> Response:
    response = JSONResponse({'message': 'ok'})
    response.delete_cookie(ADMIN_COOKIE_NAME)
    return response


@router.get('/admin', response_class=HTMLResponse)
def admin_page(request: Request) -> HTMLResponse:
    if not _verify_admin_session(request.cookies.get(ADMIN_COOKIE_NAME)):
        return RedirectResponse(url='/admin/login', status_code=status.HTTP_302_FOUND)

    return HTMLResponse(
        """
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NZZS 管理后台</title>
  <style>
    :root {
      --border: #eaeaea;
      --bg: #f7f7f7;
      --text: #222;
      --muted: #666;
      --white: #fff;
    }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); }
    .wrap { width: min(1680px, calc(100vw - 24px)); margin: 0 auto; padding: 12px; box-sizing: border-box; }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    h1 { margin: 0; font-size: 32px; font-weight: 700; }
    .btn { border: 1px solid var(--border); background: var(--white); border-radius: 10px; height: 42px; padding: 0 16px; cursor: pointer; font-size: 16px; }
    .card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
    .card-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }

    .option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .label { display: block; margin-bottom: 6px; color: var(--muted); font-size: 14px; }
    textarea { width: 100%; min-height: 140px; border: 1px solid var(--border); border-radius: 8px; padding: 8px; box-sizing: border-box; font-size: 14px; resize: vertical; }
    .save { border: 0; background: #222; color: #fff; border-radius: 8px; height: 36px; padding: 0 14px; cursor: pointer; }

    .table-wrap { background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 1320px; table-layout: fixed; }
    col.col-id { width: 56px; }
    col.col-nickname { width: 140px; }
    col.col-role { width: 100px; }
    col.col-realname { width: 140px; }
    col.col-phone { width: 140px; }
    col.col-idcard { width: 150px; }
    col.col-openid { width: 260px; }
    col.col-created { width: 150px; }
    col.col-lastlogin { width: 150px; }
    col.col-action { width: 86px; }

    th, td { border-bottom: 1px solid #f1f1f1; padding: 10px 8px; text-align: left; vertical-align: middle; font-size: 14px; box-sizing: border-box; }
    th { background: #fafafa; color: var(--muted); font-weight: 600; white-space: nowrap; }
    input, select { width: 100%; height: 34px; border: 1px solid var(--border); border-radius: 8px; padding: 0 8px; box-sizing: border-box; font-size: 14px; }
    td.wrap-cell { white-space: normal; word-break: break-all; line-height: 1.35; color: #333; }

    .msg { margin-top: 10px; color: var(--muted); font-size: 14px; }
    .err { color: #c0392b; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <h1>管理后台</h1>
    <button id="logout" class="btn">退出登录</button>
  </div>

  <div class="card">
    <div class="card-title">订单选项配置</div>
    <div class="option-grid">
      <div>
        <label class="label" for="petTypes">宠物类型（每行一个）</label>
        <textarea id="petTypes" placeholder="例如：猫&#10;狗&#10;兔子"></textarea>
      </div>
      <div>
        <label class="label" for="serviceTypes">服务类型（每行一个）</label>
        <textarea id="serviceTypes" placeholder="例如：上门喂养&#10;遛狗&#10;上门照看"></textarea>
      </div>
    </div>
    <div style="margin-top:10px;">
      <button id="saveOptions" class="save">保存订单选项</button>
    </div>
    <div id="optionsMsg" class="msg"></div>
  </div>

  <div class="card-title" style="margin: 10px 0 8px;">用户管理</div>
  <div class="table-wrap">
    <table>
      <colgroup>
        <col class="col-id" />
        <col class="col-nickname" />
        <col class="col-role" />
        <col class="col-realname" />
        <col class="col-phone" />
        <col class="col-idcard" />
        <col class="col-openid" />
        <col class="col-created" />
        <col class="col-lastlogin" />
        <col class="col-action" />
      </colgroup>
      <thead>
        <tr>
          <th>ID</th>
          <th>昵称</th>
          <th>角色</th>
          <th>真实姓名</th>
          <th>手机号</th>
          <th>身份证号</th>
          <th>OpenID</th>
          <th>创建时间</th>
          <th>最后登录</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
  <div id="usersMsg" class="msg"></div>
</div>
<script>
  var rows = document.getElementById('rows');
  var usersMsg = document.getElementById('usersMsg');
  var optionsMsg = document.getElementById('optionsMsg');
  var petTypesEl = document.getElementById('petTypes');
  var serviceTypesEl = document.getElementById('serviceTypes');

  window.onerror = function (msg, src, line, col) {
    usersMsg.textContent = '页面脚本错误: ' + msg + ' @' + line + ':' + col;
    usersMsg.classList.add('err');
  };

  function esc(value) {
    var s = String(value == null ? '' : value);
    s = s.split('&').join('&amp;');
    s = s.split('<').join('&lt;');
    s = s.split('>').join('&gt;');
    s = s.split('"').join('&quot;');
    return s;
  }

  function parseLines(text) {
    var seen = {};
    var values = [];
    var normalized = String(text || '').split(String.fromCharCode(13)).join('');
    var lines = normalized.split(String.fromCharCode(10));
    for (var i = 0; i < lines.length; i += 1) {
      var value = lines[i].trim();
      if (!value || seen[value]) {
        continue;
      }
      seen[value] = true;
      values.push(value);
    }
    return values;
  }

  function rowHtml(user) {
    var roleOwner = user.role === 'owner' ? 'selected' : '';
    var roleFeeder = user.role === 'feeder' ? 'selected' : '';
    return ''
      + '<tr data-id="' + user.id + '">'
      + '<td>' + user.id + '</td>'
      + '<td><input data-k="nickname" value="' + esc(user.nickname) + '" /></td>'
      + '<td><select data-k="role">'
      + '<option value="feeder" ' + roleFeeder + '>喂养者</option>'
      + '<option value="owner" ' + roleOwner + '>主人</option>'
      + '</select></td>'
      + '<td><input data-k="real_name" value="' + esc(user.real_name) + '" /></td>'
      + '<td><input data-k="phone" value="' + esc(user.phone) + '" /></td>'
      + '<td><input data-k="id_card" value="' + esc(user.id_card) + '" /></td>'
      + '<td class="wrap-cell">' + esc(user.openid) + '</td>'
      + '<td>' + esc(user.created_at) + '</td>'
      + '<td>' + esc(user.last_login_at) + '</td>'
      + '<td><button class="save">保存</button></td>'
      + '</tr>';
  }

  async function loadUsers() {
    usersMsg.classList.remove('err');
    usersMsg.textContent = '用户加载中...';
    var resp = await fetch('/admin/api/users', { credentials: 'include' });
    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!resp.ok) {
      usersMsg.textContent = '用户加载失败，状态码: ' + resp.status;
      usersMsg.classList.add('err');
      return;
    }
    var data = await resp.json();
    var users = (data && data.users) || [];
    rows.innerHTML = users.map(rowHtml).join('');
    usersMsg.textContent = '用户总数: ' + users.length;
  }

  async function loadOptions() {
    optionsMsg.classList.remove('err');
    optionsMsg.textContent = '选项加载中...';
    var resp = await fetch('/admin/api/order-options', { credentials: 'include' });
    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!resp.ok) {
      optionsMsg.textContent = '订单选项加载失败，状态码: ' + resp.status;
      optionsMsg.classList.add('err');
      return;
    }
    var data = await resp.json();
    petTypesEl.value = ((data && data.pet_types) || []).join(String.fromCharCode(10));
    serviceTypesEl.value = ((data && data.service_types) || []).join(String.fromCharCode(10));
    optionsMsg.textContent = '订单选项已加载';
  }

  async function saveOptions() {
    var petTypes = parseLines(petTypesEl.value);
    var serviceTypes = parseLines(serviceTypesEl.value);

    if (!petTypes.length) {
      optionsMsg.textContent = '请至少填写一个宠物类型';
      optionsMsg.classList.add('err');
      return;
    }
    if (!serviceTypes.length) {
      optionsMsg.textContent = '请至少填写一个服务类型';
      optionsMsg.classList.add('err');
      return;
    }

    var resp = await fetch('/admin/api/order-options', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pet_types: petTypes, service_types: serviceTypes })
    });

    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }

    if (!resp.ok) {
      var errData = await resp.json();
      optionsMsg.textContent = (errData && errData.detail) || ('保存失败，状态码: ' + resp.status);
      optionsMsg.classList.add('err');
      return;
    }

    var data = await resp.json();
    petTypesEl.value = ((data && data.pet_types) || []).join(String.fromCharCode(10));
    serviceTypesEl.value = ((data && data.service_types) || []).join(String.fromCharCode(10));
    optionsMsg.classList.remove('err');
    optionsMsg.textContent = '订单选项保存成功';
  }

  rows.addEventListener('click', async function (e) {
    if (!e.target.classList.contains('save')) {
      return;
    }

    var tr = e.target.closest('tr');
    var id = tr.getAttribute('data-id');
    var payload = {};
    tr.querySelectorAll('[data-k]').forEach(function (el) {
      payload[el.getAttribute('data-k')] = el.value;
    });

    var resp = await fetch('/admin/api/users/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }

    if (!resp.ok) {
      var errData = await resp.json();
      usersMsg.textContent = (errData && errData.detail) || ('保存失败，状态码: ' + resp.status);
      usersMsg.classList.add('err');
      return;
    }

    usersMsg.classList.remove('err');
    usersMsg.textContent = '用户 ' + id + ' 已更新';
  });

  document.getElementById('saveOptions').addEventListener('click', function () {
    saveOptions();
  });

  document.getElementById('logout').addEventListener('click', async function () {
    await fetch('/admin/api/logout', { method: 'POST', credentials: 'include' });
    location.href = '/admin/login';
  });

  loadOptions();
  loadUsers();
</script>
</body>
</html>
        """.strip()
    )


@router.get('/admin/api/users')
def admin_list_users(request: Request, db: Session = Depends(get_db)) -> dict[str, list[dict[str, str | int | None]]]:
    _require_admin(request)
    users = db.query(User).order_by(User.id.desc()).all()
    return {
        'users': [
            {
                'id': user.id,
                'openid': user.openid,
                'nickname': user.nickname,
                'role': user.role,
                'real_name': user.real_name,
                'phone': user.phone,
                'id_card': user.id_card,
                'created_at': user.created_at.isoformat() if isinstance(user.created_at, datetime) else '',
                'last_login_at': user.last_login_at.isoformat() if isinstance(user.last_login_at, datetime) else '',
            }
            for user in users
        ]
    }


@router.put('/admin/api/users/{user_id}')
def admin_update_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _require_admin(request)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    user.role = payload.role.value
    user.nickname = payload.nickname.strip()
    user.real_name = _normalize_optional(payload.real_name)
    user.phone = _normalize_optional(payload.phone)
    user.id_card = _normalize_optional(payload.id_card)

    db.add(user)
    db.commit()
    return {'message': 'ok'}


@router.get('/admin/api/order-options')
def admin_get_order_options(request: Request, db: Session = Depends(get_db)) -> dict[str, list[str]]:
    _require_admin(request)
    return order_option_service.get_options(db)


@router.put('/admin/api/order-options')
def admin_update_order_options(
    payload: AdminOrderOptionsUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, list[str]]:
    _require_admin(request)

    pet_types = _normalize_option_values(payload.pet_types)
    service_types = _normalize_option_values(payload.service_types)

    if not pet_types:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='pet_types cannot be empty')
    if not service_types:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='service_types cannot be empty')

    return order_option_service.update_options(db, pet_types, service_types)
