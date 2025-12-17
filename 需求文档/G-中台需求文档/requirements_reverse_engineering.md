# 辰极智脑 - 产品需求逆向工程分析文档

## 1. 系统概览与定位

**辰极智脑**是一个面向未来的企业级AI服务中台，其核心定位不是单一的应用系统，而是一个聚合了多AI能力、提供统一服务接口、具备动态路由和服务治理能力的**PaaS（Platform as a Service）级基础设施**。

它旨在解决企业内部AI能力碎片化、调用标准不统一、数据孤岛等问题，通过统一的网关和协议，为上层业务系统（如工作流引擎、认证中心等）提供稳定、高效的AI算力与知识服务。

---

## 2. 功能模块映射 (Frontend <-> Backend)

基于代码结构与架构文档的解析，系统被拆分为以下核心独立功能模块：

| 功能模块                             | 前端组件/页面 (Frontend)                              | 后端API/服务 (Backend)                                   | 关键代码路径                                 |
| :----------------------------------- | :---------------------------------------------------- | :------------------------------------------------------- | :------------------------------------------- |
| **1. 统一认证 (Auth)**         | `LoginView.vue<br>``stores/auth.ts`               | `/api/v1/auth/*<br>``ts_manage_auth_service.py`      | `src/api/routes/auth_routes.py`            |
| **2. 知识库查询 (RAG)**        | `QueryView.vue<br>``stores/rag.ts`                | `/api/v1/knowledge/query/stream<br>``rag_providers/` | `src/api/routes/knowledge_query_routes.py` |
| **3. 文档管理 (Docs)**         | `DocumentsView.vue<br>``stores/documents.ts`      | `/api/v1/files/*<br>``knowledge_service.py`          | `src/api/services/knowledge_service.py`    |
| **4. 知识库构建 (Build)**      | `KnowledgeBaseView.vue<br>``useKnowledgeBase.ts`  | `/api/v1/knowledge/builds<br>``TaskService`          | `src/api/routes/knowledge_routes.py`       |
| **5. 服务注册中心 (Registry)** | `ServiceRegistryView.vue<br>``stores/registry.ts` | `/api/v1/registry/*<br>``service_registry/`          | `src/api/services/service_registry/`       |
| **6. 系统监控 (Monitor)**      | `DashboardView.vue<br>``stores/system.ts`         | `/api/v1/health/*<br>``health_service.py`            | `src/api/routes/health_routes.py`          |
| **7. 配置管理 (Config)**       | `RagConfigView.vue<br>``ConfigService`            | `/api/v1/config/*<br>``config/service.py`            | `src/api/services/config/`                 |

---

## 3. 功能深度解析 (What & Why)

### 3.1 核心业务功能

|          功能名称          | 技术实现摘要                                                                                              | 核心业务用途                                                                                                         | 产品意义与价值                                                                                                                                                         |
| :------------------------: | :-------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **双模式AI查询引擎** | 后端通过 `Provider` 抽象层（`retrieval`/`conversational`）实现策略模式，前端通过 SSE 流式接收响应。 | 允许用户或上层应用通过统一接口进行“文档检索”或“多轮对话”。                                                       | **核心生产力引擎**。屏蔽了底层不同模型（LightRAG, VikingDB）的差异，<br />让业务方只需关注“问”和“答”，无需关心底层是查库还是调大模型，极大降低了AI接入成本。 |
|  **私有知识库构建**  | 前端上传文件 -> 后端触发异步任务 -> 调用 `LightRAG`/`VikingDB` 进行切片和向量化 -> SSE 推送进度。     | 允许管理员上传企业内部文档（PDF, TXT等），使其成为AI回答问题的依据。                                                 | **企业数据资产化**。解决了通用大模型不懂企业内部业务的问题，<br />同时保障了数据隐私（私有化部署），是B端客户最看重的“专属大脑”功能。                          |
|  **服务注册与发现**  | 基于 Redis 的 SSOT（单一真相源）存储 + Lua 原子脚本 + 心跳保活机制。                                      | 自动化管理所有微服务实例的生命周期（上线、下线、故障剔除）。                                                         | **高可用保障**。确保AI服务在扩缩容或单点故障时，整体业务不中断。<br />实现了服务间的解耦，支撑系统向大规模微服务架构演进。                                       |
|   **统一代理网关**   | 基于 `httpx` 的透明代理，支持 HTTP 和 SSE 流式转发，自动处理负载均衡。                                  | 作为所有AI子服务的统一入口，外部系统只需访问网关即可调用内部任意服务。                                               | **简化集成复杂度**。上层业务系统不需要知道具体AI服务部署在哪里，只需访问网关，降低了网络拓扑的复杂性，提升了安全性。                                             |
|   **动态配置管理**   | 采用委托模式 + 双源存储（数据库优先 + 环境变量兜底），支持热更新。                                        | 允许管理员在不重启服务的情况下，动态调整模型参数（如Temperature）、<br />切换底层模型提供商（如从OpenAI切到Azure）。 | **运营灵活性**。赋予运营人员调整AI效果的能力，无需开发介入即可优化模型表现或控制成本（切换更便宜的模型）。                                                       |

---

## 4. 交互规则与业务逻辑 (How)

### 4.1 核心业务流程：知识库构建与查询闭环

这是一个典型的**异步处理 + 流式反馈**流程。

1. **上传阶段**:

   * 用户在前端选择文件 -> 调用 `/api/v1/files/upload`。
   * **规则**: 文件大小限制（需确认具体数值，通常100MB），支持格式（PDF, MD, TXT）。
   * 后端存储文件并返回 `file_id`。
2. **构建阶段 (异步)**:

   * 用户选中文件点击“构建知识库” -> 调用 `/api/v1/knowledge/builds`。
   * 后端创建一个后台 `Task`，立即返回 `task_id`。
   * 前端通过 SSE (Server-Sent Events) 连接 `/api/v1/tasks/{task_id}/stream` 监听进度。
   * **状态流转**: `PENDING` (排队) -> `RUNNING` (处理中: 解析->切片->向量化) -> `COMPLETED` (完成) 或 `FAILED` (失败)。
3. **查询阶段 (双模式)**:

   * 用户发送查询请求 -> `/api/v1/knowledge/query/stream`。
   * **路由规则**:
     * 若 Payload 含 `retrieval`: 路由至 `LightRAG` 或 `VikingDB KB` (检索模式)，返回文档片段。
     * 若 Payload 含 `conversational`: 路由至 `VikingDB Chat` (对话模式)，维护上下文。
   * **降级规则**: 若配置的首选 Provider 初始化失败，系统会自动按优先级尝试备选 Provider (如 `LightRAG` 挂了切 `VikingDB`)，确保服务不挂。

### 4.2 服务治理流程：注册与保活

1. **服务启动**:

   * 微服务启动时，主动向注册中心 POST `/api/v1/registry/services`。
   * **冲突检测**: 若同名服务且 `route_prefix` 冲突，注册失败。
2. **心跳维持**:

   * 服务每隔 N 秒 (配置项) 发送心跳包 PUT `/api/v1/registry/services/{id}/heartbeat`。
   * Redis 更新该实例的 `last_heartbeat_ts`。
3. **健康检查 (被动+主动)**:

   * **被动**: 网关转发请求时，若发现实例连接失败，标记为“不健康”。
   * **主动**: `HealthChecker` 定时任务扫描 Redis，若 `now - last_heartbeat_ts > timeout`，则将实例标记为 `unhealthy` 或直接剔除。

### 4.3 关键业务规则总结

* **Provider 互斥与共存**: 系统同一时间只能有一个 *Effective Provider* (生效的) 用于特定类型的任务，但可以配置多个 *Candidate Providers* (备选)。
* **权限控制**:
  * 普通用户: 仅能查询、上传文件。
  * 管理员: 可管理服务注册表、查看系统监控、修改底层模型配置。
  * 认证依赖: 强依赖 `ts_manage` 系统的 Token，本地不存储用户密码。
* **数据隔离**:
  * 目前架构主要基于 `namespace` 或 `collection` 进行知识库隔离（具体需查看 `LightRAG` 实现细节，通常是全局或按租户隔离）。
* **配置优先级**: 数据库配置 > 环境变量 > 代码默认值。这保证了配置的持久化和灵活性。
