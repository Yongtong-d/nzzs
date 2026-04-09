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
    return _b64url_encode(
        hmac.new(settings.jwt_secret_key.encode('utf-8'), raw.encode('utf-8'), hashlib.sha256).digest()
    )


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


def _normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


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
  document.getElementById('submit').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const err = document.getElementById('err');
    err.textContent = '';
    try {
      const resp = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || '登录失败');
      }
      location.href = '/admin';
    } catch (e) {
      err.textContent = e.message || '登录失败';
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
  <title>NZZS 用户管理</title>
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
    h1 { margin: 0; font-size: 36px; font-weight: 700; }
    .btn { border: 1px solid var(--border); background: var(--white); border-radius: 10px; height: 42px; padding: 0 16px; cursor: pointer; font-size: 16px; }

    .table-wrap { background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 1560px; table-layout: fixed; }

    col.col-id { width: 56px; }
    col.col-nickname { width: 118px; }
    col.col-role { width: 84px; }
    col.col-realname { width: 118px; }
    col.col-phone { width: 118px; }
    col.col-idcard { width: 128px; }
    col.col-openid { width: 230px; }
    col.col-created { width: 116px; }
    col.col-lastlogin { width: 116px; }
    col.col-action { width: 86px; }

    th, td { border-bottom: 1px solid #f1f1f1; padding: 10px 8px; text-align: left; vertical-align: middle; font-size: 14px; box-sizing: border-box; }
    th { background: #fafafa; color: var(--muted); font-weight: 600; white-space: nowrap; }

    td.wrap-cell { white-space: normal; word-break: break-all; line-height: 1.35; color: #333; }
    td.wrap-time { white-space: normal; word-break: break-word; line-height: 1.35; color: #333; }

    input, select { width: 100%; height: 34px; border: 1px solid var(--border); border-radius: 8px; padding: 0 8px; box-sizing: border-box; font-size: 14px; }
    .save { width: 100%; background: #222; color: #fff; border: 0; border-radius: 8px; height: 34px; cursor: pointer; font-size: 14px; }

    .msg { margin-top: 10px; color: var(--muted); font-size: 14px; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <h1>用户管理</h1>
    <button id="logout" class="btn">退出登录</button>
  </div>
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
  <div id="msg" class="msg"></div>
</div>
<script>
  const rows = document.getElementById('rows');
  const msg = document.getElementById('msg');

  function esc(v) {
    return String(v || '').replace(/[&<>\"]/g, (s) => {
      if (s === '&') return '&amp;';
      if (s === '<') return '&lt;';
      if (s === '>') return '&gt;';
      return '&quot;';
    });
  }

  function rowHtml(user) {
    const roleOwner = user.role === 'owner' ? 'selected' : '';
    const roleFeeder = user.role === 'feeder' ? 'selected' : '';
    return `
      <tr data-id="${user.id}">
        <td>${user.id}</td>
        <td><input data-k="nickname" value="${esc(user.nickname)}" /></td>
        <td>
          <select data-k="role">
            <option value="feeder" ${roleFeeder}>喂养者</option>
            <option value="owner" ${roleOwner}>主人</option>
          </select>
        </td>
        <td><input data-k="real_name" value="${esc(user.real_name)}" /></td>
        <td><input data-k="phone" value="${esc(user.phone)}" /></td>
        <td><input data-k="id_card" value="${esc(user.id_card)}" /></td>
        <td class="wrap-cell">${esc(user.openid)}</td>
        <td class="wrap-time">${esc(user.created_at)}</td>
        <td class="wrap-time">${esc(user.last_login_at)}</td>
        <td><button class="save">保存</button></td>
      </tr>
    `;
  }

  async function loadUsers() {
    msg.textContent = '加载中...';
    const resp = await fetch('/admin/api/users', { credentials: 'include' });
    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!resp.ok) {
      msg.textContent = '加载失败';
      return;
    }
    const data = await resp.json();
    rows.innerHTML = data.users.map(rowHtml).join('');
    msg.textContent = `用户总数：${data.users.length}`;
  }

  rows.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('save')) return;
    const tr = e.target.closest('tr');
    const id = tr.getAttribute('data-id');
    const payload = {};
    tr.querySelectorAll('[data-k]').forEach((el) => {
      payload[el.getAttribute('data-k')] = el.value;
    });

    const resp = await fetch(`/admin/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }

    if (!resp.ok) {
      const data = await resp.json();
      msg.textContent = data.detail || '保存失败';
      return;
    }

    msg.textContent = `用户 ${id} 已更新`;
  });

  document.getElementById('logout').addEventListener('click', async () => {
    await fetch('/admin/api/logout', { method: 'POST', credentials: 'include' });
    location.href = '/admin/login';
  });

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
