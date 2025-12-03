# 第二章：后端API + 服务系统

> **章节导航**: [第一章 项目概览](README_01_overview.md) | **第二章 后端API** | [第三章 前端系统](README_03_frontend.md) | [第四章 部署运维](README_04_deployment.md)

本章详细介绍辰极智脑服务中台的后端API架构、核心路由、Provider分发机制以及服务注册中心。

---

## 📋 目录

1. [API路由架构](#1-api路由架构)
2. [知识库查询API](#2-知识库查询api)
3. [服务注册中心API](#3-服务注册中心api)
4. [认证与权限API](#4-认证与权限api)
5. [配置管理API](#5-配置管理api)
6. [健康检查与监控API](#6-健康检查与监控api)
7. [Provider分发机制](#7-provider分发机制)
8. [API使用示例](#8-api使用示例)

---

## 1. API路由架构

### 1.1 路由模块总览

后端API基于FastAPI构建，采用模块化路由设计。所有路由位于 `/home/root1/PycharmProjects/ygagentlanggraphLZY/src/api/routes/` 目录：

| 路由模块 | 路径 | 功能描述 |
|---------|------|---------|
| `knowledge_query_routes.py` | `/api/v1/knowledge/*` | 知识库查询（双模式：retrieval/conversational） |
| `registry_api_routes.py` | `/api/v1/registry/*` | 服务注册、心跳、发现 |
| `registry_proxy_routes.py` | `/api/v1/{service}/*` | 统一服务代理层（HTTP/SSE透明代理） |
| `admin_routes.py` | `/api/v1/registry/admin/*` | 服务注册中心管理接口（8个） |
| `auth_routes.py` | `/api/v1/auth/*` | ts_manage统一认证（SSO） |
| `health_routes.py` | `/api/v1/health/*` | 健康检查与监控 |
| `config_routes.py` | `/api/v1/config/*` | 配置管理（资源配置、环境信息） |
| `rag_routes.py` | `/api/v1/rag/*` | RAG Provider管理 |

### 1.2 服务层架构

服务层采用分层设计，核心服务位于 `/home/root1/PycharmProjects/ygagentlanggraphLZY/src/api/services/`：

```
services/
├── config/                      # Phase 3-4重构：配置系统
│   ├── service.py              # 配置服务（委托模式）
│   ├── storage.py              # 存储抽象层（数据库+环境变量）
│   ├── models.py               # 16个Pydantic配置模型
│   └── loaders/                # 12个配置加载器
│       ├── llm_loader.py
│       ├── embedding_loader.py
│       ├── reranker_loader.py
│       └── ...
├── service_registry/           # 服务注册中心
│   ├── storage.py             # SSOT单一真相源（Redis）
│   ├── health_checker.py      # 健康检查器（T04）
│   ├── load_balancer.py       # 负载均衡器（T05）
│   ├── cleanup.py             # 后台清理任务
│   └── proxy/                 # 代理层（T01规范）
│       ├── http_proxy.py      # HTTP透明代理
│       ├── sse_proxy.py       # SSE流式代理
│       └── manager.py         # 代理管理器
├── ts_manage_auth_service.py  # ts_manage认证服务
├── knowledge_service.py        # 知识库服务
└── health_service.py          # 健康检查服务
```

---

## 2. 知识库查询API

### 2.1 统一查询接口（双模式）

**核心路由**: `/api/v1/knowledge/query/stream`
**文件**: `src/api/routes/knowledge_query_routes.py` (Line 40-126)

这是系统最核心的API，支持**retrieval（检索）**和**conversational（对话）**双模式。

#### 请求模型

```json
{
  "retrieval": {                      // 检索模式负载（与vikingdb_kb/lightrag配合）
    "query": "什么是LightRAG？",
    "mode": "hybrid",                 // naive/local/global/hybrid
    "top_k": 10,
    "include_metadata": true
  },
  "conversational": {                 // 对话模式负载（与vikingdb_service_chat配合）
    "messages": [
      {"role": "user", "content": "你好"},
      {"role": "assistant", "content": "你好！有什么可以帮助你的？"}
    ],
    "service_resource_id": "your-resource-id",
    "stream": true
  }
}
```

#### 响应格式（SSE流）

```
event: metadata
data: {"provider": "lightrag", "mode": "hybrid"}

event: chunk
data: {"content": "LightRAG是一个...", "similarity": 0.95}

event: done
data: {"total_chunks": 5, "duration_ms": 234}
```

### 2.2 知识库统计API

```bash
GET /api/v1/knowledge/stats
```

返回知识库统计信息（实体数、关系数、文档数等）。

### 2.3 实体与关系查询

```bash
# 列出实体
GET /api/v1/knowledge/entities?limit=50&offset=0&search=关键词

# 列出关系
GET /api/v1/knowledge/relationships?limit=50&offset=0&entity=实体名
```

---

## 3. 服务注册中心API

### 3.1 四大核心接口（T03规范）

**文件**: `src/api/routes/registry_api_routes.py`

#### 1. 服务注册

```http
POST /api/v1/registry/services
Authorization: Service-API-Key YOUR_KEY
Content-Type: application/json

{
  "service_name": "workflow-service",
  "host": "10.0.1.5",
  "port": 8080,
  "route_prefix": "/workflow",
  "metadata": {
    "version": "1.0.0",
    "region": "beijing"
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "Service registered successfully",
  "data": {
    "instance_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**错误码**:
- `409 Conflict` - 路由前缀冲突
- `400 Bad Request` - 参数验证失败

#### 2. 心跳更新

```http
POST /api/v1/registry/services/{instance_id}/heartbeat
Authorization: Service-API-Key YOUR_KEY
```

**响应**:
```json
{
  "success": true,
  "message": "Heartbeat updated successfully",
  "data": {
    "instance_id": "550e8400-...",
    "last_heartbeat_ts": 1735574400.123
  }
}
```

#### 3. 服务注销

```http
DELETE /api/v1/registry/services/{instance_id}
Authorization: Service-API-Key YOUR_KEY
```

#### 4. 服务发现

```http
GET /api/v1/registry/services?service_name=workflow-service&healthy_only=true
Authorization: Service-API-Key YOUR_KEY
```

**响应**:
```json
{
  "success": true,
  "data": {
    "service_name": "workflow-service",
    "instances": [
      {
        "instance_id": "550e8400-...",
        "host": "10.0.1.5",
        "port": 8080,
        "route_prefix": "/workflow",
        "status": "active",
        "is_healthy": true,
        "last_heartbeat_ts": 1735574400.123
      }
    ],
    "total_count": 1,
    "healthy_count": 1
  }
}
```

### 3.2 八大管理接口（需JWT认证）

**文件**: `src/api/routes/admin_routes.py`

| 接口 | 方法 | 路径 | 功能 |
|------|------|------|------|
| 列出所有服务 | GET | `/api/v1/registry/admin/services` | 支持服务名、状态过滤 |
| 启用服务 | POST | `/api/v1/registry/admin/service/{id}/enable` | 启用被禁用的实例 |
| 禁用服务 | POST | `/api/v1/registry/admin/service/{id}/disable` | 停止流量转发 |
| 手动探测 | POST | `/api/v1/registry/admin/service/{id}/probe` | 触发健康检查 |
| 强制注销 | DELETE | `/api/v1/registry/admin/service/{id}` | 清理僵尸实例 |
| 手工注册 | POST | `/api/v1/registry/admin/service/manual-register` | 调试用 |
| 统计数据 | GET | `/api/v1/registry/admin/stats` | 服务数/实例数/健康数 |
| 配置信息 | GET | `/api/v1/registry/admin/config` | 心跳超时/清理间隔 |

**示例：禁用服务实例**

```http
POST /api/v1/registry/admin/service/550e8400-e29b-41d4-a716-446655440000/disable
Authorization: Bearer YOUR_JWT_TOKEN
```

### 3.3 统一代理路由（T01规范）

**文件**: `src/api/routes/registry_proxy_routes.py`

所有注册服务的请求通过 `/api/v1/{service_name}/*` 自动路由：

```bash
# 原始请求：
GET /api/v1/workflow-service/tasks/123

# 自动代理到：
GET http://10.0.1.5:8080/workflow/tasks/123
```

**特性**:
- ✅ **HTTP/SSE透明代理** - 严格执行hop-by-hop头移除
- ✅ **负载均衡** - 轮询策略（Round-Robin）
- ✅ **健康检查** - 自动剔除不健康实例
- ✅ **保留路由** - 系统路由（`registry`、`auth`、`knowledge`等）不会被代理

---

## 4. 认证与权限API

### 4.1 ts_manage SSO集成

**文件**: `src/api/routes/auth_routes.py`

#### 1. 获取验证码

```http
GET /api/v1/auth/captcha
```

**响应**:
```json
{
  "success": true,
  "message": "验证码获取成功",
  "captcha_key": "abc123...",
  "captcha_base64": "data:image/png;base64,iVBORw0KGg..."
}
```

#### 2. 用户登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123",
  "platform": "AI_PLATFORM",
  "captcha_key": "abc123...",
  "captcha_code": "1234"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": "2025-10-18T10:30:00Z",
  "platform": "AI_PLATFORM"
}
```

#### 3. 获取用户权限路由

```http
GET /api/v1/auth/routes
Authorization: Bearer YOUR_JWT_TOKEN
```

**响应**:
```json
{
  "success": true,
  "message": "权限路由获取成功",
  "routes": [
    {
      "path": "/knowledge",
      "component": "Layout",
      "redirect": "/knowledge/query",
      "meta": {
        "title": "知识库管理",
        "icon": "database",
        "roles": ["admin", "user"]
      },
      "children": [...]
    }
  ]
}
```

#### 4. 用户登出

```http
DELETE /api/v1/auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 5. 配置管理API

### 5.1 资源配置管理（Phase 3-4重构）

**文件**: `src/api/routes/config_routes.py`

#### 1. 获取所有资源配置

```http
GET /api/v1/config/resources
Authorization: API-Key YOUR_KEY
```

**响应**:
```json
{
  "status": "ok",
  "data": {
    "llm": {
      "provider": "openai",
      "model": "gpt-4",
      "api_key": "sk-****",
      "temperature": 0.7
    },
    "embedding": {
      "provider": "openai",
      "model": "text-embedding-ada-002"
    },
    "reranker": {
      "provider": "bge",
      "model": "bge-reranker-large"
    }
  }
}
```

#### 2. 更新资源配置

```http
PUT /api/v1/config/resources
Authorization: API-Key YOUR_KEY
Content-Type: application/json

{
  "llm": {
    "provider": "azure_openai",
    "model": "gpt-4-turbo",
    "api_key": "new-key",
    "temperature": 0.5
  }
}
```

#### 3. 获取单个配置类型

```http
GET /api/v1/config/resources/llm
GET /api/v1/config/resources/embedding
GET /api/v1/config/resources/reranker
```

### 5.2 配置服务架构（委托模式）

```python
# src/api/services/config/service.py
class ConfigService:
    """Phase 4: 委托模式 - 路由配置请求到12个专用Loader"""

    def get_llm_config(self) -> LLMConfig:
        return self.llm_loader.load()

    def update_llm_config(self, data: dict) -> bool:
        return self.llm_loader.update(data)
```

**存储层抽象** (Phase 2):
```python
# src/api/services/config/storage.py
class ConfigStorage:
    """双源存储：数据库（优先） + 环境变量（兜底）"""

    async def get_config(self, key: str) -> Any:
        # 1. 尝试从数据库读取
        db_value = await self.db.get(key)
        if db_value:
            return db_value

        # 2. Fallback到环境变量
        return os.getenv(key)
```

---

## 6. 健康检查与监控API

### 6.1 健康检查端点

**文件**: `src/api/routes/health_routes.py`

#### 1. 简单健康检查（快速响应）

```http
GET /api/v1/health/simple
```

**响应**:
```json
{
  "status": "ok",
  "timestamp": 1735574400.123,
  "service": "LightRAG REST API"
}
```

#### 2. 系统综合健康检查

```http
GET /api/v1/health/system?force_refresh=false
```

**响应**:
```json
{
  "status": "ok",
  "timestamp": 1735574400.123,
  "resources": {
    "cpu": {
      "usage_percent": 35.2,
      "count": 16,
      "count_physical": 8
    },
    "memory": {
      "total": 34359738368,
      "used": 12884901888,
      "usage_percent": 37.5
    },
    "gpu": {
      "name": "NVIDIA RTX 4090",
      "memory_total_mb": 24576,
      "memory_used_mb": 8192,
      "utilization_percent": 45.0,
      "temperature": 62.0
    }
  },
  "current_metrics": {
    "cpu_usage": 35.2,
    "memory_usage": 37.5,
    "disk_usage": 65.3,
    "gpu_memory_usage": 33.3,
    "gpu_utilization": 45.0
  },
  "system": {
    "uptime_seconds": 3600,
    "uptime_formatted": "1小时",
    "total_events": 1523,
    "provider": {
      "selected": "lightrag",
      "effective": "lightrag",
      "capabilities": {
        "provider_type": "retrieval",
        "supports_streaming": true
      }
    }
  },
  "services": {
    "api_service": "running",
    "task_manager": "running",
    "rag_registry": "running",
    "rag_provider": "lightrag"
  }
}
```

#### 3. Provider专项健康检查

```http
GET /api/v1/health/provider
```

**响应**:
```json
{
  "success": true,
  "data": {
    "overall_status": "healthy",
    "provider": {
      "selected": "lightrag",
      "effective": "lightrag",
      "type": "retrieval"
    },
    "checks": {
      "initialization": "ok",
      "resource_list": "ok",
      "test_query": "ok"
    },
    "fallback": {
      "count": 0,
      "last_at": null
    },
    "suggestions": []
  }
}
```

### 6.2 服务注册中心健康检查

```http
GET /api/v1/registry/health
```

**响应**:
```json
{
  "status": "healthy",
  "redis": {
    "connected": true,
    "ping_ms": 2.3
  },
  "services_count": 3,
  "healthy_instances": 5,
  "timestamp": "2025-10-17T10:30:00Z"
}
```

---

## 7. Provider分发机制

### 7.1 Provider架构

**核心文件**: `src/api/rag_providers/`

```
rag_providers/
├── base.py                 # 抽象基类（BaseProvider, ConversationalProvider）
├── capabilities.py         # 能力声明（ProviderCapabilities）
├── registry.py            # 注册表（生命周期管理、降级逻辑）
├── lightrag/              # LightRAG Provider
│   └── provider.py
├── vikingdb_kb/           # VikingDB检索 Provider
│   └── provider.py
└── vikingdb_service_chat/ # VikingDB对话 Provider
    └── provider.py
```

### 7.2 双模式分发逻辑

**文件**: `src/api/routes/knowledge_query_routes.py` (Line 51-104)

```python
async def query_knowledge_base_stream(request: UnifiedQueryRequest):
    async with await get_provider_for_request() as context:
        capabilities = context.provider.capabilities()

        # 模式1: RETRIEVAL（检索型）
        if capabilities.provider_type == ProviderType.RETRIEVAL:
            if not request.retrieval:
                raise ValidationError("当前Provider为检索模式，请使用retrieval负载")

            payload = request.retrieval
            async for event in context.provider.stream(
                query=payload.query,
                mode=payload.mode.value,
                top_k=payload.top_k
            ):
                yield f"event: {event.event}\ndata: {json.dumps(event.data)}\n\n"

        # 模式2: CONVERSATIONAL（对话型）
        elif capabilities.provider_type == ProviderType.CONVERSATIONAL:
            if not request.conversational:
                raise ValidationError("当前Provider为聊天模式，请使用conversational负载")

            payload = request.conversational
            messages = [
                ChatMessage(role=MessageRole(msg.role), content=msg.content)
                for msg in payload.messages
            ]

            async for event in context.provider.chat(
                messages,
                service_resource_id=payload.service_resource_id
            ):
                yield f"event: {event.event}\ndata: {json.dumps(event.data)}\n\n"
```

### 7.3 Provider能力声明

**文件**: `src/api/rag_providers/capabilities.py`

```python
# LightRAG: 本地检索模式
LIGHTRAG_CAPABILITIES = ProviderCapabilities(
    provider_type=ProviderType.RETRIEVAL,
    interaction_modes={InteractionMode.SINGLE_TURN},
    knowledge_management=KnowledgeManagement(
        build=True,      # 支持构建知识库
        delete=True,     # 支持删除
        self_check=True  # 支持自检
    ),
    supports_streaming=True
)

# VikingDB KB: 云端检索模式
VIKINGDB_CAPABILITIES = ProviderCapabilities(
    provider_type=ProviderType.RETRIEVAL,
    interaction_modes={InteractionMode.SINGLE_TURN},
    knowledge_management=KnowledgeManagement(
        build=False,     # 仅查询，需控制台构建
        delete=False,
        self_check=False
    )
)

# VikingDB Service Chat: 云端对话模式
VIKINGDB_SERVICE_CHAT_CAPABILITIES = ProviderCapabilities(
    provider_type=ProviderType.CONVERSATIONAL,
    interaction_modes={InteractionMode.MULTI_TURN},
    knowledge_management=KnowledgeManagement(build=False, delete=False)
)
```

### 7.4 降级机制

**文件**: `src/api/rag_providers/registry.py` (Line 201-275)

```python
async def get_provider_for_request(self) -> FallbackContext:
    """Provider获取（带降级支持）"""

    # 1. 从配置获取选定Provider
    selected_provider = await self._get_selected_provider()  # 如 "vikingdb_kb"
    descriptor = self._provider_descriptors.get(selected_provider)

    try:
        # 2. 尝试创建选定Provider实例
        provider = await self._create_provider_instance(descriptor)
        logger.info("成功创建Provider: %s", selected_provider)

    except Exception as primary_error:
        # 3. 降级：按优先级尝试候选Provider
        fallback_reason = f"Provider {selected_provider} 创建失败: {primary_error}"

        for candidate in self._iter_fallback_candidates(descriptor):
            try:
                provider = await self._create_provider_instance(candidate)
                effective_descriptor = candidate
                logger.info("降级到 %s 成功", candidate.name)
                break
            except Exception as fallback_error:
                logger.warning("候选Provider %s 创建失败", candidate.name)

        if provider is None:
            raise RuntimeError(f"所有Provider都不可用: {primary_error}")

        # 4. 记录降级事件
        await self.record_fallback(fallback_reason, fallback_to=candidate.name)

    # 5. 更新状态
    self._status.selected_provider = selected_provider
    self._status.effective_provider = effective_descriptor.name

    return FallbackContext(provider, selected_provider, effective_descriptor.name)
```

**降级规则**:
- ✅ **同类型降级** - 只在同一Provider类型内降级（retrieval → retrieval）
- ✅ **优先级排序** - 按 `fallback_priority` 从低到高尝试
- ✅ **状态记录** - 记录降级次数、时间、原因
- ✅ **指标收集** - 通过 `metrics_collector` 记录降级事件

---

## 8. API使用示例

### 8.1 cURL示例

#### 检索模式查询（LightRAG/VikingDB KB）

```bash
curl -X POST "http://localhost:8540/api/v1/knowledge/query/stream" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "retrieval": {
      "query": "什么是GraphRAG？",
      "mode": "hybrid",
      "top_k": 5,
      "include_metadata": true
    }
  }'
```

#### 对话模式查询（VikingDB Service Chat）

```bash
curl -X POST "http://localhost:8540/api/v1/knowledge/query/stream" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "conversational": {
      "messages": [
        {"role": "user", "content": "介绍一下RAG技术"},
        {"role": "assistant", "content": "RAG是检索增强生成技术..."},
        {"role": "user", "content": "有哪些优势？"}
      ],
      "service_resource_id": "your-resource-id",
      "stream": true
    }
  }'
```

#### 服务注册

```bash
curl -X POST "http://localhost:8540/api/v1/registry/services" \
  -H "Content-Type: application/json" \
  -H "Authorization: Service-API-Key YOUR_KEY" \
  -d '{
    "service_name": "workflow-service",
    "host": "10.0.1.5",
    "port": 8080,
    "route_prefix": "/workflow",
    "metadata": {
      "version": "1.0.0",
      "region": "beijing"
    }
  }'
```

#### 健康检查

```bash
# 简单检查
curl "http://localhost:8540/api/v1/health/simple"

# 系统详情
curl "http://localhost:8540/api/v1/health/system" \
  -H "X-API-Key: your-api-key"

# Provider状态
curl "http://localhost:8540/api/v1/health/provider" \
  -H "X-API-Key: your-api-key"
```

### 8.2 Python示例

```python
import requests
import json

# 配置
BASE_URL = "http://localhost:8540"
API_KEY = "your-api-key"

# 1. 检索模式查询
def query_retrieval(query: str, mode: str = "hybrid"):
    url = f"{BASE_URL}/api/v1/knowledge/query/stream"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    payload = {
        "retrieval": {
            "query": query,
            "mode": mode,
            "top_k": 10,
            "include_metadata": True
        }
    }

    response = requests.post(url, headers=headers, json=payload, stream=True)

    # 解析SSE流
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: '):
                data = json.loads(line_str[6:])
                print(f"收到事件: {data}")

# 2. 对话模式查询
def query_conversational(messages: list, service_resource_id: str):
    url = f"{BASE_URL}/api/v1/knowledge/query/stream"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    payload = {
        "conversational": {
            "messages": messages,
            "service_resource_id": service_resource_id,
            "stream": True
        }
    }

    response = requests.post(url, headers=headers, json=payload, stream=True)

    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: '):
                data = json.loads(line_str[6:])
                if data.get('content'):
                    print(data['content'], end='', flush=True)

# 3. 服务注册
def register_service(service_name: str, host: str, port: int, route_prefix: str):
    url = f"{BASE_URL}/api/v1/registry/services"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Service-API-Key {API_KEY}"
    }
    payload = {
        "service_name": service_name,
        "host": host,
        "port": port,
        "route_prefix": route_prefix,
        "metadata": {"version": "1.0.0"}
    }

    response = requests.post(url, headers=headers, json=payload)
    result = response.json()

    if result['success']:
        print(f"注册成功: {result['data']['instance_id']}")
        return result['data']['instance_id']
    else:
        print(f"注册失败: {response.text}")
        return None

# 4. 心跳维持（需要定期调用）
def send_heartbeat(instance_id: str):
    url = f"{BASE_URL}/api/v1/registry/services/{instance_id}/heartbeat"
    headers = {"Authorization": f"Service-API-Key {API_KEY}"}

    response = requests.post(url, headers=headers)
    return response.json()

# 使用示例
if __name__ == "__main__":
    # 检索查询
    query_retrieval("什么是RAG技术？", mode="hybrid")

    # 对话查询
    messages = [
        {"role": "user", "content": "介绍一下LightRAG"}
    ]
    query_conversational(messages, "your-resource-id")

    # 服务注册
    instance_id = register_service(
        service_name="my-service",
        host="10.0.1.5",
        port=8080,
        route_prefix="/myservice"
    )

    # 心跳维持（应该在后台线程中定期执行）
    if instance_id:
        result = send_heartbeat(instance_id)
        print(f"心跳结果: {result}")
```

### 8.3 JavaScript示例

```javascript
// 1. 检索模式查询（使用EventSource处理SSE）
async function queryRetrieval(query, mode = 'hybrid') {
  const url = 'http://localhost:8540/api/v1/knowledge/query/stream';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({
      retrieval: {
        query: query,
        mode: mode,
        top_k: 10,
        include_metadata: true
      }
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('收到事件:', data);
      }
    }
  }
}

// 2. 对话模式查询
async function queryConversational(messages, serviceResourceId) {
  const url = 'http://localhost:8540/api/v1/knowledge/query/stream';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({
      conversational: {
        messages: messages,
        service_resource_id: serviceResourceId,
        stream: true
      }
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          fullResponse += data.content;
          console.log(data.content); // 流式输出
        }
      }
    }
  }

  return fullResponse;
}

// 3. 服务注册
async function registerService(serviceName, host, port, routePrefix) {
  const url = 'http://localhost:8540/api/v1/registry/services';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Service-API-Key your-key'
    },
    body: JSON.stringify({
      service_name: serviceName,
      host: host,
      port: port,
      route_prefix: routePrefix,
      metadata: {
        version: '1.0.0',
        region: 'beijing'
      }
    })
  });

  const result = await response.json();

  if (result.success) {
    console.log('注册成功:', result.data.instance_id);
    return result.data.instance_id;
  } else {
    console.error('注册失败:', result);
    return null;
  }
}

// 4. 心跳维持
async function sendHeartbeat(instanceId) {
  const url = `http://localhost:8540/api/v1/registry/services/${instanceId}/heartbeat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Service-API-Key your-key'
    }
  });

  return await response.json();
}

// 5. 系统健康检查
async function checkSystemHealth() {
  const url = 'http://localhost:8540/api/v1/health/system';

  const response = await fetch(url, {
    headers: {
      'X-API-Key': 'your-api-key'
    }
  });

  const health = await response.json();

  console.log('系统状态:', health.status);
  console.log('CPU使用率:', health.current_metrics.cpu_usage + '%');
  console.log('内存使用率:', health.current_metrics.memory_usage + '%');
  console.log('当前Provider:', health.system.provider.effective);

  return health;
}

// 使用示例
(async () => {
  // 检索查询
  await queryRetrieval('什么是RAG技术？', 'hybrid');

  // 对话查询
  const messages = [
    { role: 'user', content: '介绍一下LightRAG' }
  ];
  const response = await queryConversational(messages, 'your-resource-id');
  console.log('完整回复:', response);

  // 服务注册
  const instanceId = await registerService(
    'my-service',
    '10.0.1.5',
    8080,
    '/myservice'
  );

  // 定期心跳（每30秒）
  if (instanceId) {
    setInterval(async () => {
      const result = await sendHeartbeat(instanceId);
      console.log('心跳结果:', result);
    }, 30000);
  }

  // 健康检查
  await checkSystemHealth();
})();
```

---

## 9. 总结

### 核心特性

1. **双模式查询系统**
   - ✅ Retrieval（检索）: LightRAG、VikingDB KB
   - ✅ Conversational（对话）: VikingDB Service Chat
   - ✅ 统一接口 `/api/v1/knowledge/query/stream`

2. **服务注册中心**
   - ✅ 4个核心接口（注册/心跳/注销/发现）
   - ✅ 8个管理接口（启用/禁用/探测/统计等）
   - ✅ 透明代理层（HTTP/SSE）

3. **配置系统重构（Phase 3-4）**
   - ✅ 委托模式：12个专用Loader
   - ✅ 双源存储：数据库 + 环境变量
   - ✅ 16个Pydantic配置模型

4. **Provider分发机制**
   - ✅ 能力声明（Capabilities）
   - ✅ 降级机制（Fallback）
   - ✅ 状态管理（Status）

### 下一章预告

[第三章：前端系统](README_03_frontend.md) 将介绍Vue3前端架构、组件设计、状态管理以及如何与后端API集成。

---

**文档版本**: v1.0
**最后更新**: 2025-10-17
**维护者**: @Zeyu Li
