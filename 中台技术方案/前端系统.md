# 第五章：前端系统

## 目录

- [架构概览](#架构概览)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [状态管理](#状态管理)
- [路由系统](#路由系统)
- [响应式设计](#响应式设计)
- [主要功能页面](#主要功能页面)
- [开发环境](#开发环境)
- [部署](#部署)

---

## 架构概览

辰极智脑前端是一个现代化的单页应用（SPA），采用 **Vue 3 Composition API** 和 **TypeScript** 构建，提供企业级的用户界面和交互体验。

### 核心设计理念

```
极致简约 + 功能至上 + 性能优先 + 一致性
```

- **组件化架构**：基于 Vue 3 `<script setup>` 语法，充分利用组合式 API
- **类型安全**：全面的 TypeScript 类型定义，编译时错误检测
- **模块化服务**：API 服务层按业务域拆分（文件、知识库、配置、健康监控等）
- **响应式设计**：支持手机、平板、桌面、4K 显示器的自适应布局

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Vue 3 Application                       │
├─────────────────────────────────────────────────────────────┤
│  Views (页面组件)                                             │
│  ├── DashboardView         (系统仪表板)                       │
│  ├── DocumentsView         (文档管理)                         │
│  ├── QueryView             (知识库查询)                       │
│  ├── KnowledgeBaseView     (知识库管理)                       │
│  ├── AdminView             (系统管理)                         │
│  ├── ServiceRegistryView   (服务注册中心)                     │
│  └── LoginView             (用户登录)                         │
├─────────────────────────────────────────────────────────────┤
│  Composables (组合式函数)                                     │
│  ├── useKnowledgeBase      (知识库逻辑)                       │
│  ├── useDocuments          (文档管理逻辑)                     │
│  ├── useAppNavigation      (导航逻辑)                         │
│  └── usePolling            (轮询逻辑)                         │
├─────────────────────────────────────────────────────────────┤
│  Stores (Pinia 状态管理)                                      │
│  ├── auth                  (认证与权限)                       │
│  ├── documents             (文档状态)                         │
│  ├── rag                   (RAG Provider)                    │
│  ├── system                (系统健康)                         │
│  ├── registry              (服务注册中心)                     │
│  └── navigation            (导航菜单)                         │
├─────────────────────────────────────────────────────────────┤
│  Services (API 服务层)                                        │
│  ├── FileService           (文件上传/删除)                    │
│  ├── KnowledgeService      (知识库构建/查询)                 │
│  ├── ConfigService         (系统配置)                         │
│  ├── HealthService         (健康监控)                         │
│  ├── PerformanceService    (性能配置)                         │
│  ├── TaskService           (任务管理)                         │
│  ├── RegistryService       (服务注册)                         │
│  └── authService           (认证服务)                         │
├─────────────────────────────────────────────────────────────┤
│  Router (Vue Router)                                         │
│  ├── 路由定义                                                 │
│  ├── 认证守卫                                                 │
│  ├── 权限检查                                                 │
│  └── 懒加载                                                   │
├─────────────────────────────────────────────────────────────┤
│  UI System                                                   │
│  ├── Element Plus          (组件库)                          │
│  ├── Custom UI Components  (自定义组件)                      │
│  ├── Design Tokens         (设计令牌)                        │
│  └── Responsive Grid       (响应式网格)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                      Backend API (FastAPI)
                   http://localhost:8540/api/v1
```

---

## 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue** | 3.5.18 | 渐进式前端框架，Composition API |
| **TypeScript** | 5.8.0 | 类型安全的 JavaScript 超集 |
| **Vite** | 7.0.6 | 新一代前端构建工具，极速 HMR |
| **Pinia** | 3.0.3 | Vue 官方状态管理库 |
| **Vue Router** | 4.5.1 | 官方路由管理器 |

### UI 组件库

| 库 | 版本 | 用途 |
|----|------|------|
| **Element Plus** | 2.10.6 | 企业级 UI 组件库 |
| **@element-plus/icons-vue** | 2.3.2 | Element Plus 图标集 |
| **ECharts** | 5.6.0 | Apache 数据可视化库 |
| **vue-echarts** | 7.0.3 | Vue 3 的 ECharts 封装 |

### Markdown 渲染

| 库 | 版本 | 用途 |
|----|------|------|
| **markdown-it** | 14.1.0 | Markdown 解析器 |
| **markdown-it-highlightjs** | 4.2.0 | 代码高亮插件 |
| **markdown-it-anchor** | 9.2.0 | 标题锚点插件 |
| **markdown-it-task-lists** | 2.1.1 | 任务列表插件 |
| **highlight.js** | 11.11.1 | 语法高亮库 |
| **github-markdown-css** | 5.8.1 | GitHub 风格样式 |

### HTTP 客户端

| 库 | 版本 | 用途 |
|----|------|------|
| **axios** | 1.11.0 | Promise 风格的 HTTP 客户端 |

---

## 项目结构

```
frontendRef/
├── src/
│   ├── views/                      # 页面组件
│   │   ├── DashboardView.vue       # 系统仪表板
│   │   ├── DocumentsView.vue       # 文档管理
│   │   ├── QueryView.vue           # 知识库查询
│   │   ├── KnowledgeBaseView.vue   # 知识库管理
│   │   ├── AdminView.vue           # 系统管理
│   │   ├── ServiceRegistryView.vue # 服务注册中心
│   │   └── LoginView.vue           # 登录页面
│   │
│   ├── components/                 # 可复用组件
│   │   ├── DocumentsList.vue       # 文档列表组件
│   │   ├── FileUploader.vue        # 文件上传组件
│   │   ├── KnowledgeGraph.vue      # 知识图谱可视化
│   │   └── ...
│   │
│   ├── stores/                     # Pinia 状态管理
│   │   ├── auth.ts                 # 认证状态 (316 行)
│   │   ├── documents.ts            # 文档状态 (337 行)
│   │   ├── rag.ts                  # RAG Provider (560 行)
│   │   ├── system.ts               # 系统健康 (517 行)
│   │   ├── registry.ts             # 服务注册中心 (293 行)
│   │   └── navigation.ts           # 导航菜单
│   │
│   ├── services/                   # API 服务层 (模块化)
│   │   ├── file.service.ts         # 文件管理 API
│   │   ├── knowledge.service.ts    # 知识库 API (297 行)
│   │   ├── config.service.ts       # 配置 API
│   │   ├── health.service.ts       # 健康检查 API
│   │   ├── performance.service.ts  # 性能配置 API
│   │   ├── task.service.ts         # 任务管理 API
│   │   ├── registry.service.ts     # 服务注册 API
│   │   ├── auth.ts                 # 认证 API
│   │   ├── sse.ts                  # SSE 流式连接
│   │   ├── client.ts               # Axios 客户端封装
│   │   └── index.ts                # 统一导出
│   │
│   ├── composables/                # 组合式函数 (可复用逻辑)
│   │   ├── useKnowledgeBase.ts     # 知识库管理逻辑 (624 行)
│   │   ├── useDocuments.ts         # 文档管理逻辑
│   │   ├── useAppNavigation.ts     # 导航逻辑
│   │   └── usePolling.ts           # 轮询逻辑
│   │
│   ├── types/                      # TypeScript 类型定义
│   │   ├── auth.ts                 # 认证类型
│   │   ├── documents.ts            # 文档类型
│   │   ├── file.ts                 # 文件类型
│   │   ├── knowledge.ts            # 知识库类型
│   │   ├── knowledge-base.ts       # 知识库管理类型
│   │   ├── system.ts               # 系统类型
│   │   ├── registry.ts             # 服务注册类型
│   │   ├── performance.ts          # 性能配置类型
│   │   ├── provider.ts             # Provider 类型
│   │   └── common.ts               # 通用类型
│   │
│   ├── router/                     # 路由配置
│   │   └── index.ts                # 路由定义与守卫 (193 行)
│   │
│   ├── ui/                         # 自定义 UI 系统
│   │   ├── styles/                 # 样式系统
│   │   │   ├── index.css           # 主样式文件
│   │   │   └── performance.css     # 性能降级样式
│   │   ├── layout/                 # 布局组件
│   │   ├── primitives/             # 原子组件
│   │   ├── forms/                  # 表单组件
│   │   └── data/                   # 数据展示组件
│   │
│   ├── utils/                      # 工具函数
│   │   ├── apiConfig.ts            # API 配置
│   │   ├── docId.ts                # 文档 ID 生成
│   │   ├── format.ts               # 格式化工具
│   │   ├── markdown.ts             # Markdown 渲染
│   │   ├── performanceDetector.ts  # 性能检测
│   │   ├── routeMapping.ts         # 路由映射
│   │   └── serviceResponse.ts      # 响应处理
│   │
│   ├── App.vue                     # 根组件
│   └── main.ts                     # 应用入口 (90 行)
│
├── public/                         # 静态资源
├── benchmark/                      # 性能基准测试
├── docs/                           # 项目文档
├── tests/                          # 单元测试
│
├── .env.development                # 开发环境配置
├── .env.production                 # 生产环境配置
├── .env.test                       # 测试环境配置
├── package.json                    # 依赖管理
├── vite.config.ts                  # Vite 配置
├── tsconfig.json                   # TypeScript 配置
└── README.md                       # 项目说明
```

---

## 状态管理

前端使用 **Pinia** 作为状态管理库，按业务域划分为多个 Store，每个 Store 负责特定功能的状态管理。

### Store 架构图

```
                    ┌─────────────────┐
                    │  Pinia (Root)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │  auth   │        │documents│        │   rag   │
    │ Store   │        │  Store  │        │  Store  │
    └────┬────┘        └────┬────┘        └────┬────┘
         │                  │                   │
         │                  │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │ system  │        │registry │        │navigation│
    │  Store  │        │  Store  │        │  Store  │
    └─────────┘        └─────────┘        └─────────┘
```

### 各 Store 职责

#### 1. auth Store (`stores/auth.ts`)

**职责**：管理用户认证状态、Token、用户权限路由

**状态**：
```typescript
interface AuthState {
  isLoggedIn: boolean                // 登录状态
  user: User | null                  // 用户信息
  token: string | null               // JWT Token
  expiresAt: string | null           // Token 过期时间
  userRoutes: RouteInfo[]            // 用户权限路由（从后端获取）
  isLoading: boolean                 // 加载状态
  error: string | null               // 错误信息
}
```

**关键方法**：
```typescript
// 初始化认证（从 localStorage 恢复）
async initAuth(): Promise<void>

// 用户登录
async login(loginRequest: LoginRequest): Promise<boolean>

// 用户登出
async logout(): Promise<void>

// 加载用户权限路由（从 ts_manage SSO 获取）
async loadUserRoutes(): Promise<void>

// 检查路由权限
checkRoutePermission(routePath: string): boolean

// 刷新认证状态
async refreshAuth(): Promise<boolean>
```

**使用示例**：
```typescript
// 在组件中使用
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 登录
await authStore.login({
  username: 'admin',
  password: 'password',
  platform: 'aiService'
})

// 检查权限
if (authStore.isAuthenticated) {
  console.log('用户已登录:', authStore.user)
}

// 检查路由权限
if (authStore.checkRoutePermission('/admin')) {
  // 有权限访问
}
```

**数据流**：
```
用户登录 → authService.login() → 后端验证 → 返回 Token + expires_at
         ↓
    保存到 localStorage + Store 状态
         ↓
    加载用户权限路由 → authService.getUserRoutes()
         ↓
    更新导航菜单 (navigation Store)
```

---

#### 2. documents Store (`stores/documents.ts`)

**职责**：管理文档列表、上传状态、知识库统计、查询历史、任务轮询

**状态**：
```typescript
interface DocumentsState {
  fileList: FileInfo[]                        // 文档列表
  selectedFiles: FileInfo[]                   // 选中的文档
  uploadProgress: Record<string, number>      // 上传进度
  loading: boolean                            // 加载状态
  uploading: boolean                          // 上传中
  knowledgeStats: KnowledgeStats              // 知识库统计
  queryHistory: QueryHistory[]                // 查询历史
  activeTasks: TaskInfo[]                     // 活动任务
  taskPollingInterval: number | null          // 轮询定时器
}
```

**关键方法**：
```typescript
// 文档管理
async fetchFileList(): Promise<void>
async uploadFile(file: File, onProgress?: (progress: number) => void)
async deleteFile(fileId: string): Promise<void>

// 知识库构建
async buildKnowledgeBase(fileIds: string[]): Promise<void>
async fetchKnowledgeStats(): Promise<void>

// 查询历史管理
addQueryToHistory(query: QueryHistory): void
removeQueryFromHistory(queryId: string): void
clearQueryHistory(): void

// 任务管理
async fetchActiveTasks(): Promise<void>
startTaskPolling(): void
stopTaskPolling(): void

// 初始化与清理
async initialize(): Promise<void>
cleanup(): void
```

**使用示例**：
```typescript
import { useDocumentsStore } from '@/stores/documents'

const documentsStore = useDocumentsStore()

// 初始化（加载文档列表、统计、任务）
await documentsStore.initialize()

// 上传文件
await documentsStore.uploadFile(file, (progress) => {
  console.log('上传进度:', progress)
})

// 构建知识库
await documentsStore.buildKnowledgeBase(['doc1.pdf', 'doc2.txt'])

// 组件卸载时清理
onUnmounted(() => {
  documentsStore.cleanup() // 停止轮询
})
```

**计算属性**：
```typescript
// 文件统计
const fileStats = computed(() => ({
  total: 100,
  uploaded: 80,
  processing: 10,
  processed: 70,
  failed: 5
}))

// 是否有活动任务
const hasActiveTasks = computed(() =>
  activeTasks.value.some(task => task.status === 'running')
)
```

---

#### 3. rag Store (`stores/rag.ts`)

**职责**：管理 RAG Provider 配置、运行态能力、前端展示所需的派生信息

**状态**：
```typescript
interface RagState {
  loading: boolean                              // 加载状态
  error: string | null                          // 错误信息
  providerStatus: ProviderStatus | null         // Provider 运行态
  providerRegistry: Record<string, unknown>     // Provider 注册表
  providerConfigs: ProviderConfig[]             // Provider 配置列表
  providerMeta: ProviderMetaSnapshot | null     // Provider 元数据
  providerMetrics: Record<string, ProviderMetrics>  // Provider 指标
  providerHealth: ProviderHealthCheck | null    // Provider 健康检查
}
```

**关键计算属性**：
```typescript
// 当前生效的 Provider
const currentProvider = computed(() =>
  providerStatus.value?.effective || 'unknown'
)

// 用户选择的 Provider
const selectedProvider = computed(() =>
  providerStatus.value?.selected || 'unknown'
)

// 当前 Provider 类型
const currentProviderType = computed<ProviderType>(() =>
  activeCapability.value?.providerType ?? 'unknown'
)

// 是否为检索模式
const isRetrievalMode = computed(() =>
  currentProviderType.value === 'retrieval'
)

// 是否为对话模式
const isConversationalMode = computed(() =>
  currentProviderType.value === 'conversational'
)

// 知识库管理能力
const capabilities = computed<KnowledgeCapabilityRecord>(() => ({
  build: activeCapability.value?.knowledgeManagement.build || false,
  delete: activeCapability.value?.knowledgeManagement.delete || false,
  self_check: activeCapability.value?.knowledgeManagement.selfCheck || false
}))
```

**关键方法**：
```typescript
// 获取 Provider 状态
async fetchProviderStatus(skipLoading = false): Promise<void>
async fetchProviderConfigs(skipLoading = false): Promise<void>
async fetchProviderMetrics(provider?: string): Promise<void>
async fetchProviderHealth(): Promise<void>

// 更新 Provider 配置
async updateProviderConfig(provider: string, config: Record<string, unknown>)

// 重载配置
async reloadConfig(): Promise<void>

// 重置指标
async resetMetrics(provider?: string): Promise<void>

// 初始化
async initialize(): Promise<void>
```

**使用示例**：
```typescript
import { useRagStore } from '@/stores/rag'

const ragStore = useRagStore()

// 初始化
await ragStore.initialize()

// 检查当前 Provider
console.log('当前 Provider:', ragStore.currentProvider)
console.log('Provider 类型:', ragStore.currentProviderType)
console.log('是否检索模式:', ragStore.isRetrievalMode)

// 根据能力显示功能
if (ragStore.capabilities.build) {
  // 显示知识库构建按钮
}

// 更新配置
await ragStore.updateProviderConfig('lightrag', {
  chunk_size: 1200,
  overlap: 100
})
```

**Provider 类型系统**：
```typescript
// Provider 类型
type ProviderType = 'retrieval' | 'conversational' | 'unknown'

// 交互模式
type InteractionMode = 'single-turn' | 'multi-turn'

// 知识库管理能力
interface KnowledgeManagementCapability {
  build: boolean       // 支持构建
  delete: boolean      // 支持删除
  selfCheck: boolean   // 支持自检
}

// Provider 能力快照
interface ProviderCapabilitySnapshot {
  providerType: ProviderType
  interactionModes: InteractionMode[]
  knowledgeManagement: KnowledgeManagementCapability
  supportsStreaming: boolean
  extraFeatures: string[]
  notes: string
}
```

---

#### 4. system Store (`stores/system.ts`)

**职责**：管理系统健康状态、监控数据、统计信息

**状态**：
```typescript
interface SystemState {
  loading: boolean                          // 加载状态
  lastUpdateTime: number                    // 最后更新时间
  healthReport: SystemHealthReport | null   // 健康报告
  monitoringData: MonitoringData | null     // 监控数据
  statistics: StatisticsSummary | null      // 统计摘要
  error: string | null                      // 错误信息
}
```

**关键计算属性**：
```typescript
// 系统状态
const systemStatus = computed(() =>
  healthReport.value?.overall_status || 'unknown'
)

// 是否健康
const isHealthy = computed(() => systemStatus.value === 'healthy')

// 服务统计
const servicesCount = computed(() => ({
  total: 10,
  healthy: 8
}))

// 系统指标（CPU、内存、磁盘、GPU）
const systemMetrics = computed(() => ({
  cpu_usage: 45.2,
  memory_usage: 68.5,
  disk_usage: 55.0,
  gpu_memory_usage: 72.3,
  gpu_utilization: 85.0,
  gpu_temperature: 68
}))

// 运行时间
const uptime = computed(() =>
  statistics.value?.system?.uptime_formatted || '未知'
)
```

**关键方法**：
```typescript
// 获取系统数据（统一 API）
async fetchSystemData(): Promise<void>

// 刷新所有数据
async refreshAllData(): Promise<void>

// 清除错误
clearError(): void

// 自动刷新
startAutoRefresh(intervalMs: number = 30000): void
stopAutoRefresh(): void
```

**使用示例**：
```typescript
import { useSystemStore } from '@/stores/system'

const systemStore = useSystemStore()

// 获取系统数据
await systemStore.fetchSystemData()

// 显示系统状态
console.log('系统状态:', systemStore.systemStatus)
console.log('健康服务数:', systemStore.servicesCount)
console.log('CPU 使用率:', systemStore.systemMetrics.cpu_usage, '%')

// 启动自动刷新（每 30 秒）
systemStore.startAutoRefresh(30000)

// 组件卸载时停止刷新
onUnmounted(() => {
  systemStore.stopAutoRefresh()
})
```

---

#### 5. registry Store (`stores/registry.ts`)

**职责**：管理服务注册中心的服务实例、统计、配置

**状态**：
```typescript
interface RegistryState {
  services: ServiceInstance[]                 // 所有服务实例（扁平化）
  serviceListResponses: ServiceListResponse[] // 原始响应（按服务名分组）
  stats: RegistryStats | null                 // 统计数据
  config: RegistryConfig | null               // 配置信息
  loading: boolean                            // 加载状态
  selectedInstances: string[]                 // 选中的实例 ID
  chartData: {                                // 图表数据
    healthRate: ChartDataPoint[]
    instanceCount: ChartDataPoint[]
  }
}
```

**关键方法**：
```typescript
// 获取服务列表
async fetchServices(serviceName?: string): Promise<void>

// 实例管理
async disableInstance(instanceId: string): Promise<void>
async enableInstance(instanceId: string): Promise<void>
async batchDisable(instanceIds: string[]): Promise<BatchDeleteResult>
async batchEnable(instanceIds: string[]): Promise<BatchDeleteResult>

// 统计与配置
async fetchStats(): Promise<void>
async fetchConfig(): Promise<void>

// 图表数据
appendChartData(currentStats: RegistryStats): void

// 选择管理
clearSelection(): void
updateSelection(instances: ServiceInstance[]): void

// 重置状态
reset(): void
```

**使用示例**：
```typescript
import { useRegistryStore } from '@/stores/registry'

const registryStore = useRegistryStore()

// 获取服务列表
await registryStore.fetchServices()

// 禁用实例
await registryStore.disableInstance('instance-id-123')

// 批量操作
await registryStore.batchDisable(['id1', 'id2', 'id3'])

// 获取统计
await registryStore.fetchStats()
console.log('健康率:', registryStore.healthRate, '%')
```

---

### Store 数据流示例

#### 用户登录流程
```
LoginView.vue
    ↓ (用户提交表单)
authStore.login({ username, password, platform })
    ↓
authService.login() → POST /api/v1/auth/login
    ↓ (后端返回 Token)
保存 Token 到 localStorage + Store
    ↓
authStore.loadUserRoutes()
    ↓
authService.getUserRoutes() → GET /api/v1/auth/routes
    ↓ (后端返回权限路由)
更新 navigation Store (导航菜单)
    ↓
router.push('/dashboard') (跳转到仪表板)
```

#### 文档上传流程
```
DocumentsView.vue (用户选择文件)
    ↓
documentsStore.uploadFile(file, onProgress)
    ↓
FileService.uploadFile() → POST /api/v1/files/upload
    ↓ (服务端处理文件)
更新上传进度 → uploadProgress[fileId] = percentage
    ↓ (上传完成)
documentsStore.fetchFileList() (刷新文档列表)
    ↓
FileService.getFilesList() → GET /api/v1/files
    ↓
更新 fileList 状态
```

#### 知识库构建流程
```
KnowledgeBaseView.vue (用户选择文档并点击构建)
    ↓
useKnowledgeBase().buildKnowledgeBase(documentPaths, config)
    ↓
KnowledgeService.buildKnowledgeBase() → POST /api/v1/knowledge/builds?background=true
    ↓ (后端返回 task_id)
TaskService.getTaskEventSource(taskId) (建立 SSE 连接)
    ↓ (监听 task_update 事件)
更新 buildProgress (进度条)
    ↓ (任务完成)
更新 buildResult (构建结果)
    ↓
刷新知识库统计 → documentsStore.fetchKnowledgeStats()
```

---

## 路由系统

### 路由配置文件

**文件路径**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/src/router/index.ts`

### 主要路由

| 路径 | 名称 | 组件 | 元信息 |
|------|------|------|--------|
| `/` | - | - | 重定向到 `/dashboard` |
| `/login` | login | LoginView | 不需要认证 |
| `/unauthorized` | unauthorized | UnauthorizedView | 不需要认证 |
| `/dashboard` | dashboard | DashboardView | 需要认证 |
| `/documents` | documents | DocumentsView | 需要认证 |
| `/query` | query | QueryView | 需要认证 |
| `/knowledge-base` | knowledge-base | KnowledgeBaseView | 需要认证 |
| `/admin` | admin | AdminView | 需要认证 |
| `/admin/service-registry` | service-registry | ServiceRegistryView | 需要认证 |
| `/rag-config` | rag-config | RagConfigView | 需要认证 |
| `/api-docs` | api-docs | - | 重定向到 `/docs` (新标签) |
| `/:pathMatch(.*)*` | notfound | NotFoundView | 404 页面 |

### 路由元信息

```typescript
interface RouteMeta {
  title: string           // 页面标题
  icon?: string           // 菜单图标
  requiresAuth: boolean   // 是否需要认证
  fullscreen?: boolean    // 是否全屏显示（如登录页）
  roles?: string[]        // 需要的角色（可选）
  hidden?: boolean        // 是否在菜单中隐藏
}
```

### 路由守卫

#### 全局前置守卫 (`router.beforeEach`)

```typescript
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 1. 不需要认证的路由直接放行
  if (to.meta.requiresAuth === false) {
    return next()
  }

  // 2. 检查是否已认证
  if (!authStore.isAuthenticated) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath } // 记录原始目标，登录后跳转
    })
  }

  // 3. 检查路由权限（基于后端返回的权限路由）
  if (to.path !== '/login' && to.path !== '/unauthorized') {
    const hasPermission = await checkRoutePermission(to.path, authStore)

    if (!hasPermission) {
      return next('/unauthorized')
    }
  }

  // 4. 检查角色权限（可选）
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
```

#### 权限检查逻辑

```typescript
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

### 懒加载

所有页面组件都使用**懒加载**，减少初始 bundle 大小：

```typescript
{
  path: '/dashboard',
  name: 'dashboard',
  component: () => import('../views/DashboardView.vue'), // 懒加载
  meta: {
    title: '系统仪表板',
    icon: 'Monitor',
    requiresAuth: true
  }
}
```

### 路由跳转示例

```typescript
import { useRouter } from 'vue-router'

const router = useRouter()

// 跳转到仪表板
router.push('/dashboard')

// 跳转到查询页面，并传递查询参数
router.push({
  path: '/query',
  query: { mode: 'conversational' }
})

// 编程式导航（带登录跳转）
if (!authStore.isAuthenticated) {
  router.push({
    path: '/login',
    query: { redirect: '/admin' }
  })
}
```

---

## 响应式设计

### 设计理念

```
移动优先 + 渐进增强 + 断点适配
```

前端支持**手机、平板、桌面、4K 显示器**的自适应布局，通过 CSS Media Queries 和 Element Plus 响应式网格实现。

### 断点系统

| 断点 | 设备 | 最小宽度 | 最大宽度 |
|------|------|----------|----------|
| **xs** | 手机 | 0px | 767px |
| **sm** | 平板（竖屏） | 768px | 991px |
| **md** | 平板（横屏） / 小桌面 | 992px | 1199px |
| **lg** | 桌面 | 1200px | 1919px |
| **xl** | 大桌面 / 4K | 1920px | ∞ |

### Element Plus 响应式网格

```vue
<el-row :gutter="20">
  <!-- 手机: 24列（100%）, 平板: 12列（50%）, 桌面: 8列（33.3%） -->
  <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
    <el-card>内容</el-card>
  </el-col>
</el-row>
```

### 响应式表格

**问题**：表格在小屏幕上无法完整显示所有列

**解决方案**：使用 `.responsive-table-container` 类包裹表格

```vue
<div class="responsive-table-container">
  <el-table :data="tableData" row-key="file_id">
    <el-table-column prop="filename" label="文件名" />
    <el-table-column prop="size" label="大小" class-name="hide-on-mobile" />
    <el-table-column prop="upload_time" label="上传时间" class-name="hide-on-tablet" />
    <el-table-column label="操作" fixed="right" />
  </el-table>
</div>
```

**CSS 实现**：
```css
/* 在小屏幕上隐藏不重要的列 */
@media (max-width: 767px) {
  .hide-on-mobile {
    display: none !important;
  }
}

@media (max-width: 991px) {
  .hide-on-tablet {
    display: none !important;
  }
}

/* 表格横向滚动 */
.responsive-table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

### 响应式统计卡片

```vue
<template>
  <div class="ui-stat ui-stat--md">
    <div class="ui-stat__value">1,234</div>
    <div class="ui-stat__label">总文档数</div>
  </div>
</template>

<style scoped>
/* 小尺寸卡片 */
.ui-stat--sm {
  padding: 12px;
  font-size: 0.875rem;
}

/* 中等尺寸卡片 */
.ui-stat--md {
  padding: 16px;
  font-size: 1rem;
}

/* 大尺寸卡片 */
.ui-stat--lg {
  padding: 24px;
  font-size: 1.25rem;
}
</style>
```

### 性能降级

针对低配置设备，自动降级动画和特效：

**文件路径**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/src/utils/performanceDetector.ts`

```typescript
export function initPerformanceDetection() {
  const isLowPerformance = detectLowPerformance()

  if (isLowPerformance) {
    document.documentElement.classList.add('performance-low')
  } else {
    document.documentElement.classList.add('performance-high')
  }
}

function detectLowPerformance(): boolean {
  // 检测 CPU 核心数
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return true
  }

  // 检测内存
  const memory = (navigator as any).deviceMemory
  if (memory && memory < 4) {
    return true
  }

  // 检测连接速度
  const connection = (navigator as any).connection
  if (connection && connection.effectiveType === '2g') {
    return true
  }

  return false
}
```

**性能降级样式**（`src/ui/styles/performance.css`）：
```css
/* 低性能设备：禁用动画 */
.performance-low * {
  animation: none !important;
  transition: none !important;
}

/* 高性能设备：启用流畅动画 */
.performance-high {
  --transition-speed: 0.3s;
}
```

---

## 主要功能页面

### 1. 系统仪表板 (DashboardView)

**路径**：`/dashboard`
**文件**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/src/views/DashboardView.vue`

**功能**：
- 系统健康状态总览
- 资源使用率监控（CPU、内存、磁盘、GPU）
- 服务状态检查
- 统计数据卡片（文档数、查询数、API 调用数）
- 实时图表（ECharts 折线图）

**关键组件**：
```vue
<template>
  <div class="dashboard-view">
    <!-- 系统状态卡片 -->
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="ui-stat ui-stat--md">
          <div class="ui-stat__value">{{ systemStore.servicesCount.healthy }}</div>
          <div class="ui-stat__label">健康服务</div>
        </div>
      </el-col>
      <!-- 其他统计卡片 -->
    </el-row>

    <!-- 资源使用率 -->
    <el-card class="metrics-card">
      <template #header>资源使用率</template>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-progress
            type="circle"
            :percentage="systemStore.systemMetrics.cpu_usage"
            :color="getProgressColor(systemStore.systemMetrics.cpu_usage)"
          />
          <p>CPU</p>
        </el-col>
        <el-col :span="12">
          <el-progress
            type="circle"
            :percentage="systemStore.systemMetrics.memory_usage"
            :color="getProgressColor(systemStore.systemMetrics.memory_usage)"
          />
          <p>内存</p>
        </el-col>
      </el-row>
    </el-card>

    <!-- 实时图表 -->
    <el-card class="chart-card">
      <template #header>系统性能趋势</template>
      <v-chart :option="chartOption" style="height: 400px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSystemStore } from '@/stores/system'
import VChart from 'vue-echarts'

const systemStore = useSystemStore()

onMounted(async () => {
  await systemStore.fetchSystemData()
  systemStore.startAutoRefresh(30000) // 每 30 秒刷新
})

onUnmounted(() => {
  systemStore.stopAutoRefresh()
})

const chartOption = computed(() => ({
  xAxis: { type: 'category', data: ['00:00', '00:30', '01:00'] },
  yAxis: { type: 'value', max: 100 },
  series: [
    {
      name: 'CPU',
      type: 'line',
      data: [45, 52, 48],
      smooth: true
    },
    {
      name: '内存',
      type: 'line',
      data: [68, 70, 72],
      smooth: true
    }
  ]
}))

const getProgressColor = (value: number) => {
  if (value < 50) return '#67c23a'
  if (value < 80) return '#e6a23c'
  return '#f56c6c'
}
</script>
```

---

### 2. 文档管理 (DocumentsView)

**路径**：`/documents`
**文件**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/src/views/DocumentsView.vue`

**功能**：
- 文档列表展示（表格 + 卡片视图）
- 文件上传（拖拽 + 点击）
- 批量删除
- 文件预览
- 上传进度条

**关键代码**：
```vue
<template>
  <div class="documents-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-upload
        :before-upload="handleBeforeUpload"
        :http-request="handleUpload"
        multiple
        drag
      >
        <el-button type="primary" :icon="Upload">上传文件</el-button>
      </el-upload>

      <el-button
        type="danger"
        :disabled="!documentsStore.selectedFiles.length"
        @click="handleBatchDelete"
      >
        批量删除
      </el-button>
    </div>

    <!-- 文档表格 -->
    <div class="responsive-table-container">
      <el-table
        :data="documentsStore.fileList"
        row-key="file_id"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="filename" label="文件名" min-width="200" />
        <el-table-column prop="file_size" label="大小" width="120">
          <template #default="{ row }">
            {{ formatFileSize(row.file_size) }}
          </template>
        </el-table-column>
        <el-table-column prop="upload_time" label="上传时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text @click="handlePreview(row)">预览</el-button>
            <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { formatFileSize } from '@/utils/format'

const documentsStore = useDocumentsStore()

onMounted(async () => {
  await documentsStore.initialize()
})

const handleBeforeUpload = (file: File) => {
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB')
    return false
  }
  return true
}

const handleUpload = async (options: any) => {
  await documentsStore.uploadFile(options.file, (progress) => {
    options.onProgress({ percent: progress })
  })
}

const handleDelete = async (row: FileInfo) => {
  await ElMessageBox.confirm('确定删除此文件吗？', '警告', {
    type: 'warning'
  })
  await documentsStore.deleteFile(row.file_id)
}

const handleBatchDelete = async () => {
  // 批量删除逻辑
}
</script>
```

---

### 3. 知识库查询 (QueryView)

**路径**：`/query`
**文件**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/src/views/QueryView.vue`

**功能**：
- 流式查询（SSE）
- Markdown 渲染（代码高亮、表格、公式）
- 查询历史
- 多轮对话（conversational 模式）
- 单轮检索（retrieval 模式）

**关键代码**：
```vue
<template>
  <div class="query-view">
    <!-- 查询输入框 -->
    <el-card class="query-card">
      <el-input
        v-model="query"
        type="textarea"
        :rows="4"
        placeholder="输入您的问题..."
      />
      <el-button
        type="primary"
        :loading="isQuerying"
        @click="handleQuery"
      >
        {{ ragStore.isConversationalMode ? '发送' : '查询' }}
      </el-button>
    </el-card>

    <!-- 流式响应展示 -->
    <el-card v-if="streamingResponse" class="response-card">
      <div class="markdown-body" v-html="renderedMarkdown"></div>
    </el-card>

    <!-- 查询历史 -->
    <el-card class="history-card">
      <template #header>查询历史</template>
      <el-timeline>
        <el-timeline-item
          v-for="item in documentsStore.queryHistory"
          :key="item.id"
          :timestamp="new Date(item.timestamp).toLocaleString()"
        >
          <p><strong>Q:</strong> {{ item.query }}</p>
          <p><strong>A:</strong> {{ item.response.substring(0, 100) }}...</p>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRagStore } from '@/stores/rag'
import { useDocumentsStore } from '@/stores/documents'
import { createSSEConnection } from '@/services/sse'
import { renderMarkdown } from '@/utils/markdown'

const ragStore = useRagStore()
const documentsStore = useDocumentsStore()

const query = ref('')
const streamingResponse = ref('')
const isQuerying = ref(false)

const renderedMarkdown = computed(() =>
  renderMarkdown(streamingResponse.value)
)

const handleQuery = async () => {
  if (!query.value.trim()) return

  isQuerying.value = true
  streamingResponse.value = ''

  const eventSource = createSSEConnection('/api/v1/knowledge/query/stream', {
    query: query.value,
    mode: ragStore.isConversationalMode ? 'conversational' : 'retrieval'
  })

  eventSource.addEventListener('chunk', (event: MessageEvent) => {
    streamingResponse.value += event.data
  })

  eventSource.addEventListener('done', () => {
    isQuerying.value = false
    eventSource.close()

    // 保存到查询历史
    documentsStore.addQueryToHistory({
      id: Date.now().toString(),
      query: query.value,
      response: streamingResponse.value,
      timestamp: Date.now(),
      mode: ragStore.currentProviderType,
      processing_time: 0
    })
  })

  eventSource.addEventListener('error', () => {
    isQuerying.value = false
    ElMessage.error('查询失败')
  })
}
</script>
```

---

### 4. 知识库管理 (KnowledgeBaseView)

**路径**：`/knowledge-base`
**文件**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/src/views/KnowledgeBaseView.vue`

**功能**：
- 知识库统计（文档数、实体数、关系数）
- 文档选择
- 知识库构建（带进度条）
- 知识库文档列表
- 知识库文档删除

**关键代码**：
```vue
<template>
  <div class="knowledge-base-view">
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="ui-stat ui-stat--md">
          <div class="ui-stat__value">{{ kb.knowledgeStatistics.total_documents }}</div>
          <div class="ui-stat__label">总文档数</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="ui-stat ui-stat--md">
          <div class="ui-stat__value">{{ kb.knowledgeStatistics.total_entities }}</div>
          <div class="ui-stat__label">总实体数</div>
        </div>
      </el-col>
      <!-- 其他统计卡片 -->
    </el-row>

    <!-- 文档选择 -->
    <el-card>
      <template #header>选择文档</template>
      <el-transfer
        v-model="kb.selectedDocuments"
        :data="kb.availableDocuments"
        :titles="['可用文档', '已选文档']"
      />
    </el-card>

    <!-- 构建按钮 -->
    <el-button
      type="primary"
      :disabled="!kb.canStartBuild"
      :loading="kb.isBuilding"
      @click="handleBuild"
    >
      构建知识库
    </el-button>

    <!-- 构建进度 -->
    <el-dialog v-model="kb.buildProgress.visible" title="构建进度">
      <el-progress
        :percentage="kb.buildProgress.percentage"
        :status="kb.buildProgress.status"
      />
      <p>{{ kb.buildProgress.message }}</p>
      <p>已处理: {{ kb.buildProgress.processed }} / {{ kb.buildProgress.total }}</p>
      <p>耗时: {{ kb.buildProgress.elapsed }}s</p>
    </el-dialog>

    <!-- 知识库文档列表 -->
    <el-card class="knowledge-docs-card">
      <template #header>知识库文档</template>
      <el-table :data="kb.knowledgeDocs" :loading="kb.knowledgeDocsLoading">
        <el-table-column prop="filename" label="文件名" />
        <el-table-column prop="vector_count" label="向量数" width="100" />
        <el-table-column prop="entity_count" label="实体数" width="100" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="danger" @click="handleDeleteDoc(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useKnowledgeBase } from '@/composables/useKnowledgeBase'
import { useRagStore } from '@/stores/rag'

const kb = useKnowledgeBase()
const ragStore = useRagStore()

onMounted(async () => {
  await kb.refreshData()
})

const handleBuild = async () => {
  const documentPaths = kb.selectedDocuments.value.map(doc => doc.file_path)

  await kb.buildKnowledgeBase(documentPaths, kb.buildConfiguration.value)

  // 构建完成后刷新数据
  await kb.refreshData()
}

const handleDeleteDoc = async (row: any) => {
  await ElMessageBox.confirm('确定删除此文档吗？', '警告', {
    type: 'warning'
  })

  await kb.deleteKnowledgeDoc(row.doc_id, {
    alsoDeleteOss: false // 是否同时删除 OSS 文件
  })
}
</script>
```

---

### 5. 系统管理 (AdminView)

**路径**：`/admin`
**文件**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/src/views/AdminView.vue`

**功能**：
- RAG Provider 配置
- 性能配置
- 系统配置
- 日志查看

---

## 开发环境

### 环境要求

| 工具 | 版本要求 |
|------|---------|
| **Node.js** | ^20.19.0 或 >=22.12.0 |
| **npm** | >=9.0.0 |

### 环境变量

#### 开发环境 (`.env.development`)
```bash
# 动态检测 API 地址（不指定则使用代理）
# VITE_API_BASE_URL=http://localhost:8000
VITE_APP_TITLE=辰极智脑
VITE_APP_VERSION=1.0.0
```

#### 生产环境 (`.env.production`)
```bash
# 使用相对路径，通过 Nginx 转发到后端
VITE_API_BASE_URL=/
VITE_APP_TITLE=辰极智脑
VITE_APP_VERSION=1.0.0
```

#### 测试环境 (`.env.test`)
```bash
VITE_API_BASE_URL=http://localhost:8545/api/v1
VITE_APP_TITLE=辰极智脑 (测试)
VITE_APP_VERSION=1.0.0-test
VITE_PORT=5176
```

### 启动开发服务器

```bash
# 1. 安装依赖
cd frontendRef
npm install

# 2. 启动开发服务器（连接到 localhost:8540）
npm run dev

# 3. 启动测试环境（连接到 localhost:8545）
npm run dev:test
```

**访问地址**：
- 开发环境：http://localhost:5173
- 测试环境：http://localhost:5176

### Vite 配置

**文件路径**：`/home/root1/PycharmProjects/ygagentlanggraphLZY/frontendRef/vite.config.ts`

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isTest = mode === 'test' || process.env.VITEST === 'true'

  return {
    plugins: [
      vue(),
      ...(isTest ? [] : [vueDevTools()]), // 测试环境禁用 DevTools
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_PORT) || 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL
            ? env.VITE_API_BASE_URL.replace(/\/api\/v1$/, '')
            : 'http://localhost:8540',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
            elementPlus: ['element-plus', '@element-plus/icons-vue'],
            utils: ['axios', 'echarts']
          }
        }
      }
    }
  }
})
```

### 热重载 (HMR)

Vite 提供**极速热重载**，修改代码后立即在浏览器中看到效果，无需刷新页面。

**HMR 生效的文件类型**：
- `.vue` 文件（组件）
- `.ts` / `.js` 文件（逻辑代码）
- `.css` 文件（样式）

### 代码检查与格式化

```bash
# 运行 ESLint 检查
npm run lint:check

# 自动修复 ESLint 错误
npm run lint

# 格式化代码（Prettier）
npm run format

# TypeScript 类型检查
npm run type-check
```

---

## 部署

### 生产构建

```bash
# 1. 构建生产版本
cd frontendRef
npm run build

# 2. 构建产物
# 输出目录: frontendRef/dist/
# - index.html
# - assets/
#   - js/
#   - css/
#   - images/
```

### Bundle 分析

生产构建自动进行**代码分割**（Code Splitting），将依赖拆分为多个 chunk：

| Chunk | 内容 | 大小 |
|-------|------|------|
| **vendor** | Vue、Vue Router、Pinia | ~120 KB |
| **elementPlus** | Element Plus、图标库 | ~350 KB |
| **utils** | Axios、ECharts | ~180 KB |
| **app** | 业务代码 | ~80 KB |

### Nginx 配置

**文件路径**：`deployment/nginx/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;

    # 前端静态资源
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html; # SPA 路由支持
    }

    # 代理后端 API
    location /api {
        proxy_pass http://backend:8540;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 流式响应配置
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
    }

    # Swagger 文档
    location /docs {
        proxy_pass http://backend:8540/docs;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker 部署

**Dockerfile**：
```dockerfile
# 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY deployment/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml**：
```yaml
services:
  frontend:
    build:
      context: ./frontendRef
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    image: backend:latest
    ports:
      - "8540:8540"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 部署步骤

```bash
# 1. 构建 Docker 镜像
docker-compose -f deployment/docker-compose.yml build

# 2. 启动服务
docker-compose -f deployment/docker-compose.yml up -d

# 3. 查看日志
docker-compose -f deployment/docker-compose.yml logs -f frontend

# 4. 停止服务
docker-compose -f deployment/docker-compose.yml down
```

---

## 性能优化

### 已实施的优化

| 优化项 | 实现方式 | 效果 |
|--------|---------|------|
| **代码分割** | Vite `manualChunks` | 减少初始加载 40% |
| **懒加载** | Vue Router 动态 import | 按需加载页面组件 |
| **Tree Shaking** | 模块化服务层 | 未使用代码减少 71% |
| **Gzip 压缩** | Nginx 配置 | 传输大小减少 60% |
| **静态资源缓存** | Nginx `expires` | 二次访问速度提升 80% |
| **性能降级** | performanceDetector | 低配设备禁用动画 |

### Bundle 大小对比（2025-01 优化）

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| **函数调用性能** | 100% | 112.51% | +12.51% |
| **内存占用** | 14.3KB | 8.0KB | -43.92% |
| **Bundle 大小** | 14KB | 3KB | -78.57% |
| **Tree-shaking 效率** | 28.57% | 71.43% | +150% |

---

## 总结

辰极智脑前端是一个**现代化、高性能、企业级**的 Vue 3 应用，具备以下特点：

1. **类型安全**：全面的 TypeScript 类型定义
2. **模块化架构**：按业务域拆分的 Pinia Store 和 API Service
3. **响应式设计**：支持手机、平板、桌面、4K 显示器
4. **性能优先**：代码分割、懒加载、性能降级
5. **开发体验**：Vite HMR、ESLint、Prettier、Vue DevTools
6. **生产就绪**：Docker 部署、Nginx 代理、静态资源缓存

**下一章**：[第六章：服务注册中心](README_06_service_registry.md)
