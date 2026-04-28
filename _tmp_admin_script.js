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
        throw new Error(data.detail || 'Login failed');
      }
      location.href = '/admin';
    } catch (e) {
      err.textContent = e.message || 'Login failed';
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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NZZS Admin</title>
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
  </style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <h1>Admin Console</h1>
    <button id="logout" class="btn">Logout</button>
  </div>

  <div class="card">
    <div class="card-title">Order Options</div>
    <div class="option-grid">
      <div>
        <label class="label" for="petTypes">Pet Types (one per line)</label>
        <textarea id="petTypes" placeholder="cat&#10;dog&#10;rabbit"></textarea>
      </div>
      <div>
        <label class="label" for="serviceTypes">Service Types (one per line)</label>
        <textarea id="serviceTypes" placeholder="feeding&#10;walking&#10;visit"></textarea>
      </div>
    </div>
    <div style="margin-top:10px;">
      <button id="saveOptions" class="save">Save Options</button>
    </div>
    <div id="optionsMsg" class="msg"></div>
  </div>

  <div class="card-title" style="margin: 10px 0 8px;">User Management</div>
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
          <th>Nickname</th>
          <th>Role</th>
          <th>Real Name</th>
          <th>Phone</th>
          <th>ID Card</th>
          <th>OpenID</th>
          <th>Created At</th>
          <th>Last Login</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
  <div id="usersMsg" class="msg"></div>
</div>
<script>
  const rows = document.getElementById('rows');
  const usersMsg = document.getElementById('usersMsg');
  const optionsMsg = document.getElementById('optionsMsg');
  const petTypesEl = document.getElementById('petTypes');
  const serviceTypesEl = document.getElementById('serviceTypes');

  function esc(v) {
    return String(v || '').replace(/[&<>\"]/g, (s) => {
      if (s === '&') return '&amp;';
      if (s === '<') return '&lt;';
      if (s === '>') return '&gt;';
      return '&quot;';
    });
  }

  function parseLines(text) {
    const seen = new Set();
    const values = [];
    text.split(/\r?\n/).forEach((line) => {
      const value = line.trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      values.push(value);
    });
    return values;
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
            <option value="feeder" ${roleFeeder}>Feeder</option>
            <option value="owner" ${roleOwner}>Owner</option>
          </select>
        </td>
        <td><input data-k="real_name" value="${esc(user.real_name)}" /></td>
        <td><input data-k="phone" value="${esc(user.phone)}" /></td>
        <td><input data-k="id_card" value="${esc(user.id_card)}" /></td>
        <td class="wrap-cell">${esc(user.openid)}</td>
        <td>${esc(user.created_at)}</td>
        <td>${esc(user.last_login_at)}</td>
        <td><button class="save">Save</button></td>
      </tr>
    `;
  }

  async function loadUsers() {
    usersMsg.textContent = 'Loading users...';
    const resp = await fetch('/admin/api/users', { credentials: 'include' });
    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!resp.ok) {
      usersMsg.textContent = 'Failed to load users';
      return;
    }
    const data = await resp.json();
    rows.innerHTML = (data.users || []).map(rowHtml).join('');
    usersMsg.textContent = `Total users: ${(data.users || []).length}`;
  }

  async function loadOptions() {
    optionsMsg.textContent = 'Loading options...';
    const resp = await fetch('/admin/api/order-options', { credentials: 'include' });
    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!resp.ok) {
      optionsMsg.textContent = 'Failed to load options';
      return;
    }
    const data = await resp.json();
    petTypesEl.value = (data.pet_types || []).join('\n');
    serviceTypesEl.value = (data.service_types || []).join('\n');
    optionsMsg.textContent = 'Options loaded';
  }

  async function saveOptions() {
    const petTypes = parseLines(petTypesEl.value);
    const serviceTypes = parseLines(serviceTypesEl.value);

    if (!petTypes.length) {
      optionsMsg.textContent = 'Please provide at least one pet type';
      return;
    }
    if (!serviceTypes.length) {
      optionsMsg.textContent = 'Please provide at least one service type';
      return;
    }

    const resp = await fetch('/admin/api/order-options', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pet_types: petTypes, service_types: serviceTypes }),
    });

    if (resp.status === 401) {
      location.href = '/admin/login';
      return;
    }

    if (!resp.ok) {
      const data = await resp.json();
      optionsMsg.textContent = data.detail || 'Save failed';
      return;
    }

    const data = await resp.json();
    petTypesEl.value = (data.pet_types || []).join('\n');
    serviceTypesEl.value = (data.service_types || []).join('\n');
    optionsMsg.textContent = 'Options saved';
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
      usersMsg.textContent = data.detail || 'Save failed';
      return;
    }

    usersMsg.textContent = `User ${id} updated`;
  });

  document.getElementById('saveOptions').addEventListener('click', saveOptions);
  document.getElementById('logout').addEventListener('click', async () => {
    await fetch('/admin/api/logout', { method: 'POST', credentials: 'include' });
    location.href = '/admin/login';
  });

  loadOptions();
  loadUsers();