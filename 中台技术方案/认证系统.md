# 第四章：认证系统 (ts_manage 集成)

> **作者**: @Zeyu Li
> **更新日期**: 2025-01-17
> **核心目标**: 企业级 SSO 统一认证、动态权限路由、JWT Token 生命周期管理

---

## 目录

- [1. 认证系统概览](#1-认证系统概览)
- [2. ts_manage SSO 集成](#2-ts_manage-sso-集成)
- [3. Bearer Token 认证流程](#3-bearer-token-认证流程)
- [4. 动态权限系统](#4-动态权限系统)
- [5. 前端认证实现](#5-前端认证实现)
- [6. 后端认证验证](#6-后端认证验证)
- [7. 认证错误处理](#7-认证错误处理)
- [8. 最佳实践与安全建议](#8-最佳实践与安全建议)

---

## 1. 认证系统概览

### 1.1 架构设计

辰极智脑服务中台采用**企业统一认证中心**（ts_manage）集成方案，实现跨系统单点登录（SSO）和细粒度权限控制。

```
┌─────────────────────────────────────────────────────────────┐
│                      认证系统架构图                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  前端应用     │◄───────►│ 后端 API     │                  │
│  │  Vue3 + TS   │  Bearer  │ FastAPI      │                  │
│  └──────┬───────┘  Token   └──────┬───────┘                  │
│         │                          │                          │
│         │                          │                          │
│         │      ┌──────────────────▼────────┐                 │
│         └─────►│   ts_manage 统一认证中心   │                 │
│                │   (企业级 SSO 服务)        │                 │
│                └───────────────────────────┘                 │
│                                                               │
│  核心功能:                                                    │
│  • JWT Token 颁发与验证                                       │
│  • 用户登录/登出管理                                          │
│  • 动态权限路由下发                                           │
│  • 验证码验证                                                 │
│  • DES 密码加密传输                                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心文件路径

| 功能域 | 文件路径 | 说明 |
|-------|---------|------|
| **后端认证服务** | `/src/api/services/ts_manage_auth_service.py` | ts_manage 集成核心逻辑 |
| **后端路由定义** | `/src/api/routes/auth_routes.py` | 认证相关 API 端点 |
| **后端安全验证** | `/src/api/security.py` | Token 验证、频率限制 |
| **密码加密工具** | `/src/api/utils/crypto.py` | DES 加密/解密工具 |
| **数据模型定义** | `/src/api/api_models.py` | 认证请求/响应模型 |
| **前端认证服务** | `/frontendRef/src/services/auth.ts` | 前端认证服务类 |
| **前端状态管理** | `/frontendRef/src/stores/auth.ts` | Pinia 认证 Store |
| **前端路由守卫** | `/frontendRef/src/router/index.ts` | 路由权限拦截器 |

---

## 2. ts_manage SSO 集成

### 2.1 连接配置

辰极智脑通过环境变量配置 ts_manage 连接信息：

**文件**: `.env`
```bash
# ts_manage 统一认证中心配置
TS_MANAGE_BASE_URL=http://localhost:8080       # ts_manage 服务地址
TS_MANAGE_PLATFORM=aiService                   # 平台标识（用于权限隔离）
TS_MANAGE_DES_KEY=12345678                     # DES 加密密钥
TS_MANAGE_TIMEOUT=30                           # 请求超时时间（秒）
TS_MANAGE_MAX_RETRIES=3                        # 最大重试次数
TS_MANAGE_ENABLE_DEV_FALLBACK=false            # 开发模式降级开关
```

### 2.2 TsManageAuthService 核心类

**文件**: `/src/api/services/ts_manage_auth_service.py`

```python
class TsManageAuthService:
    """ts_manage 管理员系统认证服务"""

    def __init__(self):
        self.config = get_ts_manage_config()
        self.http_client: Optional[httpx.AsyncClient] = None

    async def login(
        self,
        username: str,
        password: str,
        platform: Optional[str] = None,
        captcha_key: Optional[str] = None,
        captcha_code: Optional[str] = None
    ) -> AuthSession:
        """
        用户登录 - 核心流程
        1. 使用 DES 加密密码
        2. 发送 POST /api/v1/auth/login 请求
        3. 解析 JWT Token 过期时间
        4. 返回 AuthSession 会话信息
        """
        # 密码加密
        encrypted_password = encrypt_password(password, self.config.des_key)

        # 登录请求
        response = await self._make_request(
            method="POST",
            url="/api/v1/auth/login",
            data={
                "username": username,
                "password": encrypted_password,
                "platform": platform or self.config.platform,
                "captchaKey": captcha_key,
                "captchaCode": captcha_code
            }
        )

        # 解析响应
        login_result = response.get("data", {})
        expires_at = self._compute_token_expiry(login_result["accessToken"])

        return AuthSession(
            access_token=login_result["accessToken"],
            token_type=login_result.get("tokenType", "Bearer"),
            refresh_token=login_result.get("refreshToken", ""),
            expires_at=expires_at,
            platform=platform or self.config.platform
        )

    async def fetch_routes(self, token: str) -> List[RemoteRoute]:
        """
        获取用户权限路由 - 动态菜单核心
        1. 发送 GET /api/v1/menus/routes 请求（带 Bearer Token）
        2. 解析路由树结构
        3. 返回用户有权访问的路由列表
        """
        response = await self._make_request(
            method="GET",
            url="/api/v1/menus/routes",
            headers={"Authorization": f"Bearer {token}"}
        )

        routes_data = response.get("data", [])
        return [self._parse_remote_route(route_data) for route_data in routes_data]

    async def logout(self, token: str) -> None:
        """
        用户登出 - Token 黑名单处理
        """
        await self._make_request(
            method="DELETE",
            url="/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
```

### 2.3 DES 密码加密机制

**文件**: `/src/api/utils/crypto.py`

为确保与 ts_manage Java 后端完全兼容，辰极智脑实现了标准 DES/ECB/PKCS5Padding 加密：

```python
class DESCrypto:
    """DES 加密解密工具类，与 ts_manage Java 端完全兼容"""

    def __init__(self, key: str = "12345678"):
        """密钥必须 8 字节长度"""
        self.key = key.encode('utf-8')

    def encrypt_password(self, plaintext: str) -> str:
        """
        加密密码流程：
        1. 明文 -> DES/ECB/PKCS5Padding 加密
        2. 密文 -> Base64 编码
        """
        cipher = DES.new(self.key, DES.MODE_ECB)
        padded_data = pad(plaintext.encode('utf-8'), DES.block_size)
        encrypted = cipher.encrypt(padded_data)
        return base64.b64encode(encrypted).decode('ascii')

    def decrypt_password(self, encrypted_text: str) -> str:
        """
        解密密码流程（对应 Java LicenseUtil.decodePassword）：
        1. Base64 解码
        2. DES/ECB/PKCS5Padding 解密
        """
        decoded_data = base64.b64decode(encrypted_text)
        cipher = DES.new(self.key, DES.MODE_ECB)
        decrypted = cipher.decrypt(decoded_data)
        unpadded = unpad(decrypted, DES.block_size)
        return unpadded.decode('utf-8')
```

**调用示例**：
```python
from src.api.utils.crypto import encrypt_password

# 加密用户密码（发送到 ts_manage 前）
encrypted_pwd = encrypt_password("user_password", des_key="12345678")
# 输出：Base64 编码的密文，例如 "a8Xh2fK9..."
```

---

## 3. Bearer Token 认证流程

### 3.1 完整认证流程图

```
┌──────────┐                                                    ┌──────────┐
│  前端应用 │                                                    │ ts_manage│
└─────┬────┘                                                    └────┬─────┘
      │                                                              │
      │ 1. 用户输入用户名/密码                                        │
      ├──────────────────────────────────────────────────────────────┤
      │ POST /api/v1/auth/captcha                                   │
      │ ─────────────────────────────────────────────────────────►  │
      │                                                              │
      │ ◄───────────────────────────────────────────────────────────│
      │ { captcha_key, captcha_base64 }                             │
      │                                                              │
      │ 2. 用户输入验证码                                            │
      ├──────────────────────────────────────────────────────────────┤
      │ POST /api/v1/auth/login                                     │
      │ {                                                            │
      │   username: "admin",                                         │
      │   password: "加密后的密码（DES+Base64）",                     │
      │   platform: "aiService",                                     │
      │   captcha_key: "xxx",                                        │
      │   captcha_code: "1234"                                       │
      │ }                                                            │
      │ ─────────────────────────────────────────────────────────►  │
      │                                                              │
      │                                    [JWT Token 颁发]          │
      │ ◄───────────────────────────────────────────────────────────│
      │ {                                                            │
      │   success: true,                                             │
      │   access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI...",           │
      │   token_type: "Bearer",                                      │
      │   expires_at: "2025-01-18T10:30:00Z",                        │
      │   platform: "aiService"                                      │
      │ }                                                            │
      │                                                              │
      │ 3. 存储 Token 到 localStorage                                │
      ├──────────────────────────────────────────────────────────────┤
      │ GET /api/v1/auth/routes                                      │
      │ Headers: { Authorization: "Bearer eyJhbGci..." }             │
      │ ─────────────────────────────────────────────────────────►  │
      │                                                              │
      │                              [动态权限路由生成]              │
      │ ◄───────────────────────────────────────────────────────────│
      │ {                                                            │
      │   success: true,                                             │
      │   routes: [                                                  │
      │     {                                                        │
      │       path: "/dashboard",                                    │
      │       name: "dashboard",                                     │
      │       meta: { title: "系统仪表板", icon: "dashboard" },      │
      │       children: []                                           │
      │     },                                                       │
      │     ...                                                      │
      │   ]                                                          │
      │ }                                                            │
      │                                                              │
      │ 4. 生成动态菜单 + 启用路由守卫                                │
      └──────────────────────────────────────────────────────────────┘
```

### 3.2 后端 API 端点

**文件**: `/src/api/routes/auth_routes.py`

#### 3.2.1 登录接口

```python
@router.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    auth_service: TsManageAuthService = Depends(get_auth_service)
) -> LoginResponse:
    """
    用户登录接口

    请求体:
    {
        "username": "admin",
        "password": "password123",
        "platform": "aiService",
        "captcha_key": "optional_key",
        "captcha_code": "1234"
    }

    响应:
    {
        "success": true,
        "message": "登录成功",
        "token_type": "Bearer",
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "refresh_token_here",
        "expires_at": "2025-01-18T10:30:00Z",
        "platform": "aiService"
    }
    """
    async with auth_service:
        session: AuthSession = await auth_service.login(
            username=request.username,
            password=request.password,
            platform=request.platform,
            captcha_key=request.captcha_key,
            captcha_code=request.captcha_code
        )

    return LoginResponse(
        success=True,
        message="登录成功",
        token_type=session.token_type,
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_at=session.expires_at.isoformat(),
        platform=session.platform
    )
```

#### 3.2.2 获取验证码

```python
@router.get("/api/v1/auth/captcha", response_model=CaptchaResponse)
async def get_captcha(
    auth_service: TsManageAuthService = Depends(get_auth_service)
) -> CaptchaResponse:
    """
    获取图形验证码

    响应:
    {
        "success": true,
        "message": "验证码获取成功",
        "captcha_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "captcha_base64": "data:image/png;base64,iVBORw0KGgoAAAANS..."
    }
    """
    async with auth_service:
        captcha: CaptchaPayload = await auth_service.fetch_captcha()

    return CaptchaResponse(
        success=True,
        message="验证码获取成功",
        captcha_key=captcha.captcha_key,
        captcha_base64=captcha.captcha_base64
    )
```

#### 3.2.3 登出接口

```python
@router.delete("/api/v1/auth/logout", response_model=BaseResponse)
async def logout(
    authorization: Optional[str] = Header(None),
    request: Optional[LogoutRequest] = None,
    auth_service: TsManageAuthService = Depends(get_auth_service)
) -> BaseResponse:
    """
    用户登出接口

    请求头:
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    或请求体:
    {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }

    响应:
    {
        "success": true,
        "message": "登出成功"
    }
    """
    # 提取 Token（优先使用 Header）
    token = _extract_bearer_token(authorization)
    if not token and request and request.token:
        token = request.token

    if not token:
        raise HTTPException(status_code=401, detail="缺少认证 Token")

    async with auth_service:
        await auth_service.logout(token)

    return BaseResponse(success=True, message="登出成功")
```

#### 3.2.4 获取权限路由

```python
@router.get("/api/v1/auth/routes", response_model=RoutesResponse)
async def get_user_routes(
    authorization: Optional[str] = Header(None),
    auth_service: TsManageAuthService = Depends(get_auth_service)
) -> RoutesResponse:
    """
    获取当前用户的权限路由

    请求头:
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    响应:
    {
        "success": true,
        "message": "权限路由获取成功",
        "routes": [
            {
                "path": "/dashboard",
                "component": "DashboardView",
                "redirect": null,
                "name": "dashboard",
                "meta": {
                    "title": "系统仪表板",
                    "icon": "dashboard",
                    "hidden": false,
                    "roles": ["admin", "user"],
                    "keep_alive": true,
                    "always_show": false
                },
                "children": [],
                "system_type": "aiService"
            },
            ...
        ]
    }
    """
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="缺少认证 Token")

    async with auth_service:
        remote_routes = await auth_service.fetch_routes(token)

    routes = [_convert_remote_route_to_response(route) for route in remote_routes]

    return RoutesResponse(
        success=True,
        message="权限路由获取成功",
        routes=routes
    )
```

### 3.3 cURL 调用示例

#### 示例 1：获取验证码
```bash
curl -X GET http://localhost:8540/api/v1/auth/captcha
```

#### 示例 2：用户登录
```bash
curl -X POST http://localhost:8540/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "platform": "aiService",
    "captcha_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "captcha_code": "1234"
  }'
```

#### 示例 3：获取权限路由（需要 Token）
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:8540/api/v1/auth/routes \
  -H "Authorization: Bearer $TOKEN"
```

#### 示例 4：调用需要认证的 API（知识库查询）
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:8540/api/v1/knowledge/query/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "retrieval": {
        "query": "什么是 RAG？",
        "mode": "mix",
        "top_k": 5
    }
  }'
```

#### 示例 5：登出
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X DELETE http://localhost:8540/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. 动态权限系统

### 4.1 权限路由数据结构

**文件**: `/src/api/services/ts_manage_auth_service.py`

```python
@dataclass
class RemoteRouteMeta:
    """远程路由元信息"""
    title: str                      # 菜单标题
    icon: Optional[str] = None      # 图标名称
    hidden: Optional[bool] = None   # 是否隐藏菜单
    roles: Optional[List[str]] = None  # 角色权限列表
    keep_alive: Optional[bool] = None  # 是否缓存组件
    always_show: Optional[bool] = None # 是否始终显示（即使只有一个子路由）

@dataclass
class RemoteRoute:
    """远程路由信息"""
    path: str                       # 路由路径，例如 "/dashboard"
    component: Optional[str]        # 组件路径，例如 "DashboardView"
    redirect: Optional[str]         # 重定向路径
    name: str                       # 路由名称
    meta: RemoteRouteMeta           # 元信息
    children: List['RemoteRoute']   # 子路由列表
    system_type: Optional[str] = None  # 系统类型标识
```

### 4.2 权限路由解析逻辑

```python
def _parse_remote_route(self, route_data: Dict[str, Any]) -> RemoteRoute:
    """
    解析 ts_manage 返回的路由 JSON 数据
    兼容两种数据结构：
    1. 嵌套 meta 字段结构（标准 Vue Router 格式）
    2. 扁平字段结构（管理平台 API 返回格式）
    """
    meta_data = route_data.get("meta")

    if isinstance(meta_data, dict) and meta_data:
        # 标准嵌套结构
        meta = RemoteRouteMeta(
            title=meta_data.get("title", ""),
            icon=meta_data.get("icon"),
            hidden=meta_data.get("hidden"),
            roles=meta_data.get("roles"),
            keep_alive=meta_data.get("keepAlive"),
            always_show=meta_data.get("alwaysShow")
        )
    else:
        # 扁平字段结构（兼容处理）
        visible = route_data.get("visible")
        hidden = (visible == 0) if isinstance(visible, int) else None
        meta = RemoteRouteMeta(
            title=route_data.get("name", ""),
            icon=route_data.get("icon"),
            hidden=hidden,
            roles=None,
            keep_alive=None,
            always_show=None
        )

    # 递归解析子路由
    children_data = route_data.get("children", [])
    children = [self._parse_remote_route(child) for child in children_data]

    return RemoteRoute(
        path=route_data["path"],
        component=route_data.get("component"),
        redirect=route_data.get("redirect"),
        name=route_data["name"],
        meta=meta,
        children=children,
        system_type=route_data.get("systemType")
    )
```

### 4.3 开发模式降级路由

当 ts_manage 服务不可用且启用了开发模式降级（`ENABLE_DEV_FALLBACK=true`），系统将返回默认路由：

```python
def _create_fallback_routes(self) -> List[RemoteRoute]:
    """创建开发模式降级路由"""
    return [
        RemoteRoute(
            path="/dashboard",
            component="DashboardView",
            redirect=None,
            name="/dashboard",
            meta=RemoteRouteMeta(title="系统仪表板", icon="dashboard"),
            children=[],
            system_type="aiService"
        ),
        RemoteRoute(
            path="/documents",
            component="DocumentsView",
            redirect=None,
            name="/documents",
            meta=RemoteRouteMeta(title="文档管理", icon="document"),
            children=[],
            system_type="aiService"
        ),
        RemoteRoute(
            path="/query",
            component="QueryView",
            redirect=None,
            name="/query",
            meta=RemoteRouteMeta(title="知识库查询", icon="search"),
            children=[],
            system_type="aiService"
        ),
        RemoteRoute(
            path="/knowledge-base",
            component="KnowledgeBaseView",
            redirect=None,
            name="/knowledgeBase",
            meta=RemoteRouteMeta(title="知识库构建", icon="connection"),
            children=[],
            system_type="aiService"
        ),
        RemoteRoute(
            path="/admin",
            component="AdminView",
            redirect=None,
            name="/admin",
            meta=RemoteRouteMeta(title="系统管理", icon="setting"),
            children=[],
            system_type="aiService"
        )
    ]
```

---

## 5. 前端认证实现

### 5.1 AuthService 服务类

**文件**: `/frontendRef/src/services/auth.ts`

```typescript
export class AuthService {
    private baseURL: string
    private token: string | null = null

    constructor(baseURL?: string) {
        this.baseURL = baseURL || getApiBaseUrl({ defaultPort: 8540 })
        this.loadTokenFromStorage()
    }

    /**
     * 用户登录
     */
    async login(request: LoginRequest): Promise<LoginResponse> {
        const response = await axios.post(
            `${this.baseURL}/api/v1/auth/login`,
            {
                username: request.username,
                password: request.password,
                platform: 'aiService',
                captcha_key: request.captcha_key,
                captcha_code: request.captcha_code
            }
        )

        const result = response.data

        if (result.success && result.access_token) {
            // 保存 Token 到 localStorage
            this.saveTokenToStorage(result.access_token)
            localStorage.setItem('auth_expires_at', result.expires_at)
            localStorage.setItem('auth_platform', result.platform)
        }

        return result
    }

    /**
     * 获取用户权限路由
     */
    async getUserRoutes(): Promise<RouteResponse> {
        if (!this.token) {
            return { success: false, message: '未登录' }
        }

        const response = await axios.get(
            `${this.baseURL}/api/v1/auth/routes`,
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            }
        )

        return response.data
    }

    /**
     * 用户登出
     */
    async logout(): Promise<LogoutResponse> {
        if (!this.token) {
            this.clearTokenFromStorage()
            return { success: true, message: '已登出' }
        }

        await axios.delete(
            `${this.baseURL}/api/v1/auth/logout`,
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            }
        )

        // 无论后端响应如何，都清除本地 Token
        this.clearTokenFromStorage()
        return { success: true, message: '已登出' }
    }

    /**
     * 检查 Token 是否已过期
     */
    isTokenExpired(): boolean {
        const expiresAt = localStorage.getItem('auth_expires_at')
        if (!expiresAt || !this.token) {
            return true
        }

        const expiryTime = new Date(expiresAt).getTime()
        const currentTime = new Date().getTime()

        // 提前 5 分钟判断过期，预留刷新时间
        return expiryTime - currentTime < 5 * 60 * 1000
    }
}

// 导出单例实例
export const authService = new AuthService()
```

### 5.2 Pinia 认证 Store

**文件**: `/frontendRef/src/stores/auth.ts`

```typescript
export const useAuthStore = defineStore('auth', () => {
    // 状态定义
    const isLoggedIn = ref(false)
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const expiresAt = ref<string | null>(null)
    const userRoutes = ref<RouteInfo[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // 计算属性：检查是否已认证
    const isAuthenticated = computed(() => {
        return isLoggedIn.value && token.value && !isTokenExpired.value
    })

    // 计算属性：检查 Token 是否过期
    const isTokenExpired = computed(() => {
        if (!expiresAt.value) return true
        const expiryTime = new Date(expiresAt.value).getTime()
        const currentTime = new Date().getTime()
        // 提前 5 分钟判断过期
        return expiryTime - currentTime < 5 * 60 * 1000
    })

    /**
     * 用户登录
     */
    async function login(loginRequest: LoginRequest): Promise<boolean> {
        isLoading.value = true
        error.value = null

        try {
            const response = await authService.login(loginRequest)

            if (response.success && response.access_token) {
                // 保存认证信息
                token.value = response.access_token
                expiresAt.value = response.expires_at || null
                isLoggedIn.value = true

                user.value = {
                    username: loginRequest.username,
                    platform: response.platform || 'aiService'
                }

                // 保存到本地存储
                localStorage.setItem('auth_username', loginRequest.username)
                localStorage.setItem('auth_platform', user.value.platform)

                // 加载用户权限路由
                await loadUserRoutes()

                return true
            } else {
                error.value = response.message || '登录失败'
                return false
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : '登录过程中发生错误'
            return false
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 加载用户权限路由
     */
    async function loadUserRoutes(): Promise<void> {
        if (!isAuthenticated.value) {
            userRoutes.value = []
            return
        }

        try {
            const response = await authService.getUserRoutes()

            if (response.success && response.routes) {
                userRoutes.value = response.routes
                // 更新导航菜单
                const nav = useNavigationStore()
                nav.setNavigationItems(mapRoutesToNavItems(userRoutes.value))
            } else {
                console.warn('获取用户路由失败:', response.message)
                userRoutes.value = []
                // 如果是认证失败，清除状态
                if (response.message?.includes('认证') || response.message?.includes('token')) {
                    clearAuthState()
                }
            }
        } catch (err) {
            console.error('加载用户路由出错:', err)
            userRoutes.value = []
        }
    }

    /**
     * 检查路由权限
     */
    function checkRoutePermission(routePath: string): boolean {
        if (!isAuthenticated.value) {
            return false
        }

        return hasRoute.value(routePath)
    }

    /**
     * 初始化认证状态 - 从本地存储恢复
     */
    async function initAuth(): Promise<void> {
        const storedToken = localStorage.getItem('auth_token')
        const storedExpiresAt = localStorage.getItem('auth_expires_at')
        const storedPlatform = localStorage.getItem('auth_platform')
        const storedUsername = localStorage.getItem('auth_username')

        if (storedToken && storedExpiresAt) {
            token.value = storedToken
            expiresAt.value = storedExpiresAt

            // 检查 Token 是否过期
            if (!isTokenExpired.value) {
                isLoggedIn.value = true

                if (storedUsername && storedPlatform) {
                    user.value = {
                        username: storedUsername,
                        platform: storedPlatform
                    }
                }

                // 异步加载用户路由
                await loadUserRoutes()
            } else {
                // Token 已过期，清除状态
                clearAuthState()
            }
        }
    }

    return {
        // 状态
        isLoggedIn,
        user,
        token,
        userRoutes,
        isLoading,
        error,

        // 计算属性
        isAuthenticated,
        isTokenExpired,

        // 方法
        initAuth,
        login,
        logout,
        loadUserRoutes,
        checkRoutePermission,
        clearAuthState
    }
})
```

### 5.3 路由守卫实现

**文件**: `/frontendRef/src/router/index.ts`

```typescript
// 路由守卫
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // 如果路由不需要认证，直接放行
    if (to.meta.requiresAuth === false) {
        return next()
    }

    // 检查是否已认证
    if (!authStore.isAuthenticated) {
        // 未认证，跳转到登录页
        return next({
            path: '/login',
            query: { redirect: to.fullPath }
        })
    }

    // 检查路由权限（基于后端返回的权限路由）
    if (to.path !== '/login' && to.path !== '/unauthorized') {
        const hasPermission = await checkRoutePermission(to.path, authStore)

        if (!hasPermission) {
            // 没有权限，跳转到权限拒绝页面
            return next('/unauthorized')
        }
    }

    // 检查基于角色的权限
    if (to.meta.roles) {
        const hasRole = (to.meta.roles as string[]).some(role =>
            authStore.hasRole(role)
        )

        if (!hasRole) {
            return next('/unauthorized')
        }
    }

    next()
})

/**
 * 检查路由权限
 */
async function checkRoutePermission(
    routePath: string,
    authStore: ReturnType<typeof useAuthStore>
): Promise<boolean> {
    // 如果没有加载用户路由，先加载
    if (authStore.userRoutes.length === 0) {
        await authStore.loadUserRoutes()
    }

    // 检查是否有访问权限
    return authStore.checkRoutePermission(routePath)
}
```

---

## 6. 后端认证验证

### 6.1 Token 验证机制

**文件**: `/src/api/security.py`

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request, Depends

security = HTTPBearer(auto_error=False)

async def check_auth_flexible(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    灵活校验：优先使用 Authorization Bearer；若无，则接受 query 参数 access_token。
    在开发阶段 SecurityConfig.REQUIRE_API_KEY=False 时总是放行；
    未来启用时可在此对接 ts_manage 校验逻辑。
    """
    if not security_config.REQUIRE_API_KEY:
        return True

    # 先检查 Authorization Header
    token = credentials.credentials if credentials else None

    # 再检查 query 参数
    if not token:
        token = request.query_params.get('access_token')

    if not token:
        raise AuthenticationError("缺少认证信息")

    # 这里可以调用 ts_manage_auth_service 校验 token
    # 例如：解析 JWT、验证签名、检查过期时间等
    if token not in security_config.API_KEYS:
        raise AuthenticationError("无效的认证信息")

    return token
```

### 6.2 请求频率限制

```python
class RateLimiter:
    """请求频率限制器"""

    def __init__(self, config: SecurityConfig = None):
        self.config = config or SecurityConfig()
        self._requests = defaultdict(deque)
        self._lock = threading.Lock()

    def is_allowed(self, client_id: str) -> bool:
        """检查是否允许请求"""
        current_time = time.time()
        window_start = current_time - self.config.RATE_LIMIT_WINDOW

        with self._lock:
            # 清理过期的请求记录
            client_requests = self._requests[client_id]
            while client_requests and client_requests[0] < window_start:
                client_requests.popleft()

            # 检查是否超过限制
            if len(client_requests) >= self.config.RATE_LIMIT_REQUESTS:
                return False

            # 记录当前请求
            client_requests.append(current_time)
            return True

async def check_rate_limit(request: Request):
    """检查请求频率限制"""
    client_id = get_client_id(request)

    if not rate_limiter.is_allowed(client_id):
        raise RateLimitError(
            message=f"请求频率过高，请稍后再试",
            retry_after=security_config.RATE_LIMIT_WINDOW
        )

    return client_id
```

### 6.3 在受保护路由中使用认证

```python
from fastapi import APIRouter, Depends
from src.api.security import check_auth_flexible

router = APIRouter(prefix="/api/v1/knowledge")

@router.post("/query/stream")
async def query_knowledge(
    request: UnifiedQueryRequest,
    auth_token = Depends(check_auth_flexible)  # 强制认证
):
    """
    知识库查询接口（需要认证）

    请求头必须包含：
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    或 Query 参数：
    ?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    """
    # auth_token 已通过验证，可以安全执行业务逻辑
    ...
```

---

## 7. 认证错误处理

### 7.1 ts_manage 错误码映射

**文件**: `/src/api/services/ts_manage_auth_service.py`

```python
def _map_error_code_to_http_status(self, error_code: str) -> int:
    """
    将 ts_manage 错误码映射到 HTTP 状态码
    """
    error_mapping = {
        "AUTHORIZED_ERROR": 401,      # 认证失败
        "USER_ACCOUNT_LOCKED": 423,   # 用户账户锁定
        "USER_ACCOUNT_DISABLED": 403, # 用户账户禁用
        "VERIFY_CODE_ERROR": 400,     # 验证码错误
        "VERIFY_CODE_TIMEOUT": 400,   # 验证码超时
        "PERMISSION_DENIED": 403,     # 权限不足
        "TOKEN_EXPIRED": 401,         # Token 过期
        "TOKEN_INVALID": 401,         # Token 无效
        "LOGIN_SCOPE_ERROR": 403,     # 登录范围错误
    }
    return error_mapping.get(error_code, 400)
```

### 7.2 常见错误与解决方案

#### 错误 1：401 Unauthorized - 缺少认证 Token

**症状**：
```json
{
    "detail": "缺少认证 Token"
}
```

**原因**：
- 请求头缺少 `Authorization: Bearer <token>`
- Token 已过期或无效

**解决方案**：
```bash
# 1. 重新登录获取新 Token
curl -X POST http://localhost:8540/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "platform": "aiService"
  }'

# 2. 使用新 Token 访问 API
TOKEN="<new_access_token>"
curl -X GET http://localhost:8540/api/v1/auth/routes \
  -H "Authorization: Bearer $TOKEN"
```

#### 错误 2：403 Forbidden - 权限不足

**症状**：
```json
{
    "detail": "权限不足"
}
```

**原因**：
- 用户没有访问该资源的权限
- 路由权限配置不正确

**解决方案**：
1. 检查用户角色权限：
   ```bash
   curl -X GET http://localhost:8540/api/v1/auth/routes \
     -H "Authorization: Bearer $TOKEN"
   ```
2. 联系管理员在 ts_manage 中调整权限配置

#### 错误 3：423 Locked - 用户账户锁定

**症状**：
```json
{
    "detail": "用户账户已锁定"
}
```

**原因**：
- 用户账户在 ts_manage 中被管理员锁定
- 多次登录失败触发自动锁定

**解决方案**：
联系系统管理员在 ts_manage 后台解除账户锁定

#### 错误 4：400 Bad Request - 验证码错误

**症状**：
```json
{
    "detail": "验证码错误或已过期"
}
```

**原因**：
- 验证码输入错误
- 验证码已过期（通常 5 分钟有效期）

**解决方案**：
```bash
# 1. 重新获取验证码
curl -X GET http://localhost:8540/api/v1/auth/captcha

# 2. 使用新验证码登录
curl -X POST http://localhost:8540/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "platform": "aiService",
    "captcha_key": "<new_captcha_key>",
    "captcha_code": "<user_input_code>"
  }'
```

#### 错误 5：503 Service Unavailable - ts_manage 服务不可用

**症状**：
```json
{
    "detail": "无法连接到管理员系统"
}
```

**原因**：
- ts_manage 服务未启动
- 网络连接问题
- 配置的 `TS_MANAGE_BASE_URL` 不正确

**解决方案**：
1. 检查 ts_manage 服务状态：
   ```bash
   curl http://localhost:8080/health  # 假设 ts_manage 运行在 8080 端口
   ```
2. 检查 `.env` 配置：
   ```bash
   TS_MANAGE_BASE_URL=http://localhost:8080
   ```
3. 临时启用开发模式降级（仅用于开发环境）：
   ```bash
   TS_MANAGE_ENABLE_DEV_FALLBACK=true
   ```

### 7.3 前端错误处理

**文件**: `/frontendRef/src/services/auth.ts`

```typescript
async function login(request: LoginRequest): Promise<LoginResponse> {
    try {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, request)
        return response.data
    } catch (error) {
        console.error('登录失败:', error)

        // 提取错误信息
        if (isAxiosError(error)) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || '登录失败'
            }
        }

        return {
            success: false,
            message: error instanceof Error ? error.message : '登录失败'
        }
    }
}
```

---

## 8. 最佳实践与安全建议

### 8.1 Token 生命周期管理

#### 最佳实践 1：提前刷新 Token

在 Token 过期前 5 分钟尝试刷新，避免用户操作中断：

```typescript
const isTokenExpired = computed(() => {
    if (!expiresAt.value) return true
    const expiryTime = new Date(expiresAt.value).getTime()
    const currentTime = new Date().getTime()

    // 提前 5 分钟判断过期，预留刷新时间
    return expiryTime - currentTime < 5 * 60 * 1000
})
```

#### 最佳实践 2：自动登出过期 Token

```typescript
async function initAuth(): Promise<void> {
    const storedToken = localStorage.getItem('auth_token')
    const storedExpiresAt = localStorage.getItem('auth_expires_at')

    if (storedToken && storedExpiresAt) {
        token.value = storedToken
        expiresAt.value = storedExpiresAt

        // 检查 Token 是否过期
        if (!isTokenExpired.value) {
            isLoggedIn.value = true
            await loadUserRoutes()
        } else {
            // Token 已过期，清除状态并跳转登录页
            clearAuthState()
            router.push('/login')
        }
    }
}
```

### 8.2 安全配置检查清单

#### 生产环境必备配置

- [ ] **关闭开发模式降级**：`TS_MANAGE_ENABLE_DEV_FALLBACK=false`
- [ ] **启用 HTTPS**：生产环境必须使用 HTTPS 传输 Token
- [ ] **配置 CORS 白名单**：限制允许访问的前端域名
- [ ] **启用请求频率限制**：防止暴力破解
- [ ] **定期轮换 DES 密钥**：建议每季度更换 `TS_MANAGE_DES_KEY`
- [ ] **Token 过期时间设置**：建议不超过 24 小时
- [ ] **日志审计**：记录所有认证相关操作

#### 开发环境安全提示

- ⚠️ **不要提交 `.env` 文件**：包含敏感凭证
- ⚠️ **使用测试账户**：避免使用生产环境账户
- ⚠️ **定期清理 Token**：防止本地存储泄露

### 8.3 密码安全规范

#### 密码加密流程

```
用户输入明文密码
    ↓
前端发送到后端（HTTPS 传输）
    ↓
后端使用 DES 加密（crypto.py）
    ↓
发送到 ts_manage（加密密文）
    ↓
ts_manage 解密并验证
```

#### 注意事项

1. **前端不应加密密码**：加密由后端 `crypto.py` 完成
2. **密钥管理**：`TS_MANAGE_DES_KEY` 必须与 ts_manage 配置一致
3. **密码复杂度**：建议在前端添加密码强度验证

### 8.4 监控与日志

#### 认证事件日志

```python
# 文件: src/api/services/ts_manage_auth_service.py

logger.info(f"尝试登录用户: {username}, 平台: {platform}")
logger.info(f"用户 {username} 登录成功")
logger.warning(f"用户 {username} 登录失败: {error_message}")
logger.error(f"认证服务异常: {error}")
```

#### 监控指标

- **登录成功率**：`成功登录次数 / 总登录尝试次数`
- **Token 过期率**：`过期 Token 请求次数 / 总请求次数`
- **权限拒绝率**：`403 响应次数 / 总请求次数`
- **平均响应时间**：监控 ts_manage 响应延迟

#### 告警规则

- 🚨 **连续登录失败超过 5 次**：可能遭受暴力破解攻击
- 🚨 **Token 过期率超过 10%**：Token 有效期可能设置过短
- 🚨 **ts_manage 响应时间超过 3 秒**：认证服务性能下降

---

## 附录：完整认证流程示例

### Python 后端调用示例

```python
import asyncio
from src.api.services.ts_manage_auth_service import TsManageAuthService

async def complete_auth_flow():
    """完整的认证流程示例"""

    async with TsManageAuthService() as auth_service:
        # 1. 获取验证码
        captcha = await auth_service.fetch_captcha()
        print(f"验证码密钥: {captcha.captcha_key}")
        print(f"验证码图片: {captcha.captcha_base64[:50]}...")

        # 2. 用户登录
        session = await auth_service.login(
            username="admin",
            password="password123",
            platform="aiService",
            captcha_key=captcha.captcha_key,
            captcha_code="1234"  # 用户输入的验证码
        )
        print(f"访问 Token: {session.access_token[:30]}...")
        print(f"过期时间: {session.expires_at}")

        # 3. 获取权限路由
        routes = await auth_service.fetch_routes(session.access_token)
        print(f"用户有权访问 {len(routes)} 个路由")
        for route in routes:
            print(f"  - {route.path}: {route.meta.title}")

        # 4. 登出
        await auth_service.logout(session.access_token)
        print("登出成功")

# 运行示例
asyncio.run(complete_auth_flow())
```

### TypeScript 前端调用示例

```typescript
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

async function completeAuthFlow() {
    const authStore = useAuthStore()

    try {
        // 1. 获取验证码
        const captchaResponse = await authService.getCaptcha()
        console.log('验证码密钥:', captchaResponse.captcha_key)

        // 2. 用户登录
        const loginSuccess = await authStore.login({
            username: 'admin',
            password: 'password123',
            platform: 'aiService',
            captcha_key: captchaResponse.captcha_key,
            captcha_code: '1234'  // 用户输入的验证码
        })

        if (!loginSuccess) {
            console.error('登录失败:', authStore.error)
            return
        }

        console.log('登录成功，Token:', authStore.token?.substring(0, 30) + '...')

        // 3. 自动加载权限路由（login 方法已调用）
        console.log('用户路由:', authStore.userRoutes)

        // 4. 检查特定路由权限
        const hasQueryPermission = authStore.checkRoutePermission('/query')
        console.log('是否有查询权限:', hasQueryPermission)

        // 5. 登出
        await authStore.logout()
        console.log('登出成功')

    } catch (error) {
        console.error('认证流程出错:', error)
    }
}

// 页面加载时初始化认证状态
async function initApp() {
    const authStore = useAuthStore()
    await authStore.initAuth()  // 从 localStorage 恢复登录状态

    if (authStore.isAuthenticated) {
        console.log('用户已登录，跳转到仪表板')
        router.push('/dashboard')
    } else {
        console.log('用户未登录，跳转到登录页')
        router.push('/login')
    }
}
```

---

## 总结

辰极智脑服务中台的认证系统通过深度集成 ts_manage 企业统一认证中心，实现了：

✅ **企业级 SSO** - 跨系统单点登录，统一用户身份管理
✅ **JWT Token 认证** - 无状态认证，支持分布式部署
✅ **动态权限路由** - 基于用户角色的细粒度权限控制
✅ **安全密码传输** - DES 加密保护密码在传输过程中的安全
✅ **前后端分离** - Vue3 前端 + FastAPI 后端，清晰的职责划分
✅ **开发模式降级** - 即使 ts_manage 不可用也能继续开发

通过本章的学习，开发者应能够：
- 理解整个认证流程的前后端交互细节
- 正确调用认证 API 并处理各种错误情况
- 实现基于动态路由的权限控制
- 遵循安全最佳实践保护用户数据

---

**相关文档**：
- [第三章：RAG 配置系统](./README_03_rag_config.md)
- [第五章：服务注册中心](./README_05_service_registry.md)
- [ts_manage 项目文档](../ts_manage/README.md)
