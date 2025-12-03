# 辰极智脑服务中台

> **一个可扩展的企业级AI服务聚合平台**
>
> 统一管理和路由所有AI子服务 | 支持双模式查询 | 微服务架构 | ts_manage SSO认证

---

## 🚀 30秒快速启动

```bash
# 1️⃣ 激活虚拟环境 (必须!)
source ~/miniforge3/bin/activate ai_env_lzy
cd /home/root1/PycharmProjects/ygagentlanggraphLZY

# 2️⃣ 启动后端 (端口8540)
python src/api_main.py

# 3️⃣ 新终端启动前端 (端口5173)
cd frontendRef && npm run dev

# 4️⃣ 访问应用
# 前端: http://localhost:5173
# 后端API文档: http://localhost:8540/docs
```

---

## 📚 文档导航

| 我想... | 查看文档 | 时间 | 关键内容 |
|--------|--------|------|--------|
| **了解项目架构** | [README_01_overview.md](README_01_overview.md) | 30分钟 | 项目定位、核心特性、Provider架构、服务注册中心 |
| **调用后端API** | [README_02_backend.md](README_02_backend.md) | 20分钟 | 路由列表、API文档、双模式查询、Provider分发 |
| **配置系统参数** | [README_03_config.md](README_03_config.md) | 30分钟 | Phase 4重构、12个加载器、配置优先级、环境变量 |
| **集成认证系统** | [README_04_auth.md](README_04_auth.md) | 20分钟 | ts_manage SSO、Bearer Token、权限管理、DES加密 |
| **开发前端代码** | [README_05_frontend.md](README_05_frontend.md) | 40分钟 | Vue3+TS架构、Pinia状态管理、路由守卫、组件开发 |
| **部署到生产环境** | [README_06_ops.md](README_06_ops.md) | 1小时 | 环境准备、Docker部署、多环境配置、故障排查 |

---

## 🎯 常见任务速查

### 开发相关

```bash
# 启动后端开发服务
source ~/miniforge3/bin/activate ai_env_lzy
python src/api_main.py

# 启动前端开发服务
cd frontendRef && npm run dev

# 类型检查
mypy src

# 运行测试
pytest tests/
```

### 部署相关

```bash
# Docker一键启动
docker-compose -f deployment/docker-compose.yml up -d

# 查看Docker日志
docker-compose -f deployment/docker-compose.yml logs -f backend

# 停止Docker服务
docker-compose -f deployment/docker-compose.yml down
```

### 调试相关

```bash
# 后端健康检查
curl http://localhost:8540/api/v1/health/simple

# 查看后端日志
tail -f ai_microservice.log

# 查看API文档
# 访问: http://localhost:8540/docs
```

---

## 🏗️ 项目结构概览

```
辰极智脑服务中台/
├── 📂 src/                          # 后端核心代码
│   ├── api/                        # FastAPI服务层
│   │   ├── routes/                # API路由 (知识库、服务注册、认证等)
│   │   ├── services/              # 业务服务层 (配置、认证、RAG等)
│   │   ├── rag_providers/         # Provider架构 (lightrag、vikingdb等)
│   │   └── security.py            # 安全认证
│   ├── lightrag_service/          # LightRAG集成层
│   └── api_main.py                # 服务启动入口
│
├── 📂 frontendRef/                  # 前端应用 (Vue3+TS)
│   ├── src/
│   │   ├── components/            # Vue组件
│   │   ├── stores/                # Pinia状态管理
│   │   ├── router/                # 路由配置
│   │   ├── services/              # API服务
│   │   └── types/                 # TypeScript类型定义
│   ├── package.json               # 前端依赖
│   └── vite.config.ts             # Vite配置
│
├── 📂 deployment/                   # 部署配置
│   ├── docker-compose.yml         # Docker Compose配置
│   ├── backend.Dockerfile         # 后端镜像
│   └── environment.yml            # Python环境定义
│
├── 📂 tests/                        # 测试用例
│   └── api/                       # API测试
│
├── 📂 docs/                         # 项目文档
├── .env.example                    # 环境变量模板
├── README.md                       # 本文件 (导航索引)
├── README_01_overview.md           # 项目概览与架构
├── README_02_backend.md            # 后端API文档
├── README_03_config.md             # 配置系统详解
├── README_04_auth.md               # 认证系统详解
├── README_05_frontend.md           # 前端开发指南
├── README_06_ops.md                # 部署运维手册
```

---

## ⚙️ 核心特性

### 🔄 双模式查询系统

- **Retrieval (检索)**: 单轮查询,返回相关文档
- **Conversational (对话)**: 多轮对话,上下文保持
- **统一接口**: `/api/v1/knowledge/query/stream`

### 🔌 Provider架构

灵活扩展AI能力提供者:

- **LightRAG**: 本地知识图谱 (自主可控)
- **VikingDB KB**: 云端检索服务
- **VikingDB Service Chat**: 云端对话服务

### 🎛️ 配置系统 (Phase 4重构)

- **4个演进阶段**: 模型层 → 存储层 → 加载器 → 委托模式
- **12个加载器**: LLM、Embedding、Reranker、存储等
- **三层优先级**: ENV > DB > Default
- **热更新支持**: 修改配置无需重启

### 🔐 统一认证系统

- **ts_manage SSO集成**: 企业级统一认证
- **动态权限管理**: 菜单权限动态加载
- **DES加密**: 与Java后端兼容

### 📊 服务注册中心

- **Redis SSOT模式**: Single Source of Truth
- **原子化注册**: Lua脚本保证并发安全
- **健康检查**: 自动故障发现
- **负载均衡**: 加权轮询策略

---

## 📊 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| **FastAPI** | - | 异步Web框架 |
| **Pydantic** | - | 数据验证与类型安全 |
| **LightRAG** | 1.4.7 | 知识图谱引擎 |
| **Redis** | - | 服务注册存储 |
| **PostgreSQL** | - | 配置数据库 |
| **Neo4j** | 5.x | 图数据库 |
| **Qdrant** | - | 向量检索 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue 3** | 3.5.18 | UI框架 |
| **TypeScript** | 5.8 | 类型安全 |
| **Element Plus** | 2.10.6 | UI组件库 |
| **Pinia** | 3.0.3 | 状态管理 |
| **Vite** | 7.0.6 | 构建工具 |

---

## 📋 快速参考

### 环境激活

```bash
# 激活虚拟环境 (每次开发前必须!)
source ~/miniforge3/bin/activate ai_env_lzy
cd /home/root1/PycharmProjects/ygagentlanggraphLZY
```

### 多环境启动

| 环境 | 后端启动 | 前端启动 | 后端端口 | 前端端口 |
|------|---------|---------|---------|---------|
| **开发** | `python src/api_main.py` | `npm run dev` | 8540 | 5173 |
| **测试** | `python src/api_main.py --api-port 8545` | `npm run dev:test` | 8545 | 5176 |
| **生产** | `docker-compose up -d` | 自动构建 | 8542 | 81 |

### 健康检查

```bash
# 简单检查
curl http://localhost:8540/api/v1/health/simple

# 详细检查
curl http://localhost:8540/api/v1/health/detailed

# 系统检查
curl http://localhost:8540/api/v1/health/system

# Provider检查
curl http://localhost:8540/api/v1/health/provider
```

---

## 🔗 相关项目

- **[ts_manage](file:///home/root1/IdeaProjects/ts_manage)** - 企业统一认证中心
- **[ygworkflow](file:///home/root1/PycharmProjects/ygworkflow)** - 工作流微服务
- **[LightRAG](https://github.com/HKUDS/LightRAG)** - 知识图谱框架

---

## ❓ 常见问题

### Q: 后端无法启动?

**A**: 检查虚拟环境激活:

```bash
which python
# 应输出: /home/root1/miniforge3/envs/ai_env_lzy/bin/python
```

→ [详细排查](README_06_ops.md#常见问题排查)

### Q: 前端无法连接后端?

**A**: 检查CORS配置和端口占用:

```bash
curl http://localhost:8540/api/v1/health/simple
```

→ [详细排查](README_06_ops.md#常见问题排查)

### Q: 如何配置LLM和Embedding?

**A**: 编辑 `.env` 文件:

```bash
cp .env.example .env
vim .env  # 配置LLM_API_KEY、EMBEDDING_*等
```

→ [配置详解](README_03_config.md)

### Q: 如何扩展新的AI能力Provider?

**A**: 实现Provider接口:

```python
from src.api.rag_providers import BaseProvider
# 实现stream()和capabilities()方法
```

→ [Provider开发指南](README_02_backend.md#provider分发机制)

---

## 🚀 下一步

1. **首次使用**: [5分钟快速启动](README_06_ops.md#快速开始---5分钟启动完整应用)
2. **理解架构**: [项目概览](README_01_overview.md)
3. **集成API**: [后端API文档](README_02_backend.md)
4. **生产部署**: [部署运维手册](README_06_ops.md)

---

## 📞 获取帮助

- **API文档**: <http://localhost:8540/docs>
- **项目配置**: `.env.example` 和 `deployment/environment.yml`
- **开发记忆**: `CLAUDE.md` (开发指南和最佳实践)
- **问题排查**: [故障排查流程](README_06_ops.md#故障排查与监控)

---

## 📄 许可证

MIT License

---

**项目状态**: 生产就绪 ✅
**最后更新**: 2025-10-17
**维护者**: AI开发团队
**文档版本**: v1.0
