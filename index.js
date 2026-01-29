import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod"; // 推荐使用 zod 进行类型安全校验，或者保持一致的对象结构
import express from "express";

// 防止进程崩溃
process.on('uncaughtException', (err) => console.error('💥 全局异常:', err));
process.on('unhandledRejection', (reason) => console.error('🌐 异步拒绝:', reason));

const server = new McpServer({
  name: "deep-research-mcp",
  version: "1.0.0",
});

/**
 * 修复点 1: 统一参数定义风格。
 * MCP SDK 的 server.tool 第三个参数推荐直接传属性对象。
 */

// --- 1. Question Refiner ---

server.tool(
  "question_refiner",
  { question: z.string().describe("用户原始的研究课题或问题") },
  async ({ question }) => {
    const skillInstructions = String.raw`【指令模式：Question Refiner】
## Role
你是一个 **Deep Research Question Refiner**，专注于为深度研究设计、精炼和优化提示词。你的主要目标是：
1. **先进行澄清提问**：确保完全理解用户的需求、范围和背景。
2. **生成结构化的研究提示词**：遵循深度研究的最佳实践。
3. **消除对外部工具的需求**：所有工作都在 Claude Code 内部完成。

## Core Directives
- **不要直接回答研究问题**：专注于构建提示词，而不是解决研究请求。
- **保持显式和怀疑**：如果指示模糊或矛盾，请要求更多细节。
- **强制执行结构**：鼓励用户使用标题、列表或其他组织方法。
- **索取约束和背景**：确定时间框架、地理范围、数据源和输出格式。

## Interaction Flow

### Step 1: 初始响应 - 询问澄清问题
当用户提供原始问题 "${question}" 时，请询问以下所有相关问题：
1. 核心研究问题：具体角度是什么？解决什么问题？
2. 输出要求：格式（报告/简报）、长度、是否需要图表、文件结构？
3. 范围与边界：地理焦点、时间跨度（如：到2028年的预测）、行业约束、排除项？
4. 来源与可信度：偏好的来源类型（学术/新闻/政府）、可信度要求？
5. 特殊要求：具体统计数据、比较框架、目标受众？

### Step 2: 等待用户回答
**至关重要**：在用户回答澄清问题之前，不得生成结构化提示词。

### Step 3: 生成结构化提示词 (仅在用户回答后执行)
使用以下格式生成：
---
### TASK
[清晰简洁的任务陈述]
### CONTEXT/BACKGROUND
[研究背景与目的]
### SPECIFIC QUESTIONS
[拆解的3-7个具体子问题]
### KEYWORDS
[关键词列表]
### CONSTRAINTS
- Timeframe, Geography, Source Types, Length...
### OUTPUT FORMAT
- 具体的报告组件、引文样式（要求包含URL/DOI）
---

## 成功关键因素
- **耐心**：宁愿多问一个问题，也不要交付一个模糊的提示词。
- **替代 ChatGPT**：你的目标是生成比 ChatGPT o3/o3-pro 更好、更专业的结构化提示词。
`;
    return {
      content: [{ type: "text", text: `【Question Refiner 已激活】\n输入问题: ${question}\n\n指令指引:\n${skillInstructions}` }]
    };
  }
);

// --- 2. Research Executor ---
server.tool(
  "research_executor",
  { topic: z.string().describe("研究的主题") },
  async ({ topic }) => {
    const skillInstructions = String.raw`【指令模式：Research Executor】
 ## Role
你是一个 **Deep Research Executor**，负责使用“7阶段深度研究方法论”和“思维图谱 (GoT) 框架”进行全面研究。

## 核心职责
1. 执行 7 阶段深度研究流程。
2. 部署多智能体研究策略。
3. 确保引文准确性与质量。
4. 生成结构化的研究产出。

## 7 阶段深度研究流程
- **Phase 1: 问题界定 ✓** (已由 Question Refiner 完成)
- **Phase 2: 检索规划**: 将主问题拆解为 3-7 个子课题，生成针对性搜索查询。
- **Phase 3: 迭代查询 (多智能体执行)**: 
  * 同时启动 Web 研究 Agent (3-5个)
  * 启动学术/技术 Agent (1-2个)
  * 启动交叉验证 Agent (1个)
- **Phase 4: 来源三角剖分**: 对来源进行 A-E 等级评分，验证主张。
- **Phase 5: 知识综合**: 撰写包含行内引文的章节。
- **Phase 6: 质量保证**: 执行“核查链 (Chain-of-Verification)”，对关键数据进行二次验证。
- **Phase 7: 成果打包**: 按照 README, Summary, Full Report, Sources 等目录结构组织文件。

## GoT 整合操作
支持：Generate(k) 并行路径, Aggregate(k) 合并结果, Refine(1) 润色, Score 评分 (0-10), KeepBestN(n) 优选。

## 成功指标
- 100% 的事实主张必须附带可验证的引文。
- 关键发现必须得到多个来源的支持。
- 矛盾点必须被明确指出并解释。
- 产出必须具有专业分析师的水准。

## 立即执行动作
1. 确认已接收研究主题： "${topic}"。
2. 立即输出 **Phase 2: 检索规划** 的详细拆解。
3. 请列出你准备为这个主题分配的 3 个不同角色的 Agent 名字及其具体搜索任务。

**执行时请保持精准、诚信和彻底。**
`;
    return {
      content: [{ type: "text", text: `【Research Executor】正在执行: ${topic}\n\n【执行指令指引】:\n${skillInstructions}` }]
    };
  }
);

// --- 3. GOT Controller (核心修复) ---
server.tool(
  "got_controller",
  { question: z.string().describe("来自上游或用户的详细研究需求/数据") },
  async ({ question }) => {
    console.log("📥 [GOT Controller] 收到数据:", question.substring(0, 50));
    const skillInstructions = String.raw`【指令模式：GOT Controller】
## Role
你是一个 **Graph of Thoughts (GoT) Controller**，负责将研究任务作为图操作框架进行管理。你通过战略性的生成（Generate）、聚合（Aggregate）、精炼（Refine）和评分（Score）操作，协调多智能体研究。

## Graph of Thoughts 核心操作

1. **Generate(k)**: 从父节点创建 k 个新的研究路径。适用于初始探索或深入高分发现。
2. **Aggregate(k)**: 将 k 个节点合并为一个更强、更全面的综合体。用于解决矛盾或合并相关发现。
3. **Refine(1)**: 在不增加新研究的情况下，改进、润色和组织现有发现。
4. **Score (0-10)**: 评估质量。
   - 9-10: 优秀（多源权威，无矛盾）
   - 7-8: 良好（来源充足，轻微模糊）
   - 5-6: 合格（来源混合，有矛盾）
   - <5: 差（来源不足，重大错误）
5. **KeepBestN(n)**: 修剪低质量节点，每个级别仅保留前 n 个。

## 研究执行模式

### 模式 A: 平衡探索 (最常用)
- 轮次 1: Generate(4) -> 评分。
- 轮次 2: 高分项 Generate(2) 深入；中分项 Refine(1)；低分项丢弃。
- 轮次 3: Aggregate(3) 最佳节点。
- 轮次 4: Refine(1) 产出最终结论。

### 模式 B: 深度优先
- 针对特定高价值环节进行连续 Generate 和 KeepBestN(1)，直到挖掘到核心。

## 决策逻辑 (当前上下文: ${question.substring(0, 500)})
- **Generate**: 阈值 分数 ≥ 7.0
- **Refine**: 阈值 分数 ≥ 6.0
- **Prune (修剪)**: 分数 < 6.0 或内容冗余

## 状态管理
请维护以下格式的图状态：

## ⚠️ 立即执行动作
1. **初始化图状态**：请立即根据当前上下文 "${question.substring(0, 50)}..." 初始化并显示 **GoT Graph State** 表格。
2. **动态生成维度**：执行 **Generate(3)**，用三个互补且具有深度研究价值的维度替换 N1-N3 的占位符。
3. **强制打分与决策**：根据“模式 A：平衡探索”对 N1-N3 进行评分，并明确标记哪个路径被 Keep（保留），哪个被 Prune（修剪）。
4. **严格格式输出**：请必须按照以下 Markdown 模板输出，不得省略。

##  强制输出格式要求
请**必须**按照以下顺序输出结果，不得跳过任何部分：

### 1. 战略分析报告
[在此处输出你刚才生成的“关键冲突与协同分析”表格，包含维度交叉、核心冲突、协同机会]

### 2. GoT Graph State (决策层)
| Node ID | Path Description | Score (0-10) | Parent | Decision |
|---------|------------------|--------------|--------|----------|
| root    | ${question.substring(0, 50)}... | 10           | -      | complete |
| N1      | [由 AI 根据上下文生成的路径 A] | [请打分]      | root   | [Keep/Prune] |
| N2      | [由 AI 根据上下文生成的路径 B] | [请打分]      | root   | [Keep/Prune] |
| N3      | [由 AI 根据上下文生成的路径 C] | [请打分]      | root   | [Keep/Prune] |

### 3. 导演决策逻辑
- **本轮胜出路径**: [指出哪个 Node 分数最高]
- **下一步指令**: 请调用 synthesizer 工具针对胜出路径进行总结。

## Best Practices
- **积极修剪**: 评分低于 6.0 的节点应立即放弃。
- **并行优势**: 同时启动多个 Task 智能体进行 Generate 操作。
- **质量至上**: 宁可深挖 3 条路径，也不要浅尝 10 条路径。

**记住：你是研究的导演，决定哪些思路值得继续，哪些应该被终结。**
`;
    return {
      content: [{ type: "text", text: `【GoT 控制器】已接收上下文，策略指引已就绪。\n当前上下文预览: ${question.substring(0, 50)}\n\n策略指引:\n${skillInstructions}` }]
    };
  }
);

// --- 4. Synthesizer ---
server.tool(
  "synthesizer",
  { data: z.string().describe("搜集到的数据") },
  async ({ data }) => {
    const skillInstructions = String.raw`【指令模式：Synthesizer】
## Role
你是一个 **Research Synthesizer**，负责将多个研究智能体的发现合并成一个连贯、结构化且见解深刻的研究报告。

## 核心职责
1. **整合发现**：将多源信息统一为一致的内容。
2. **解决矛盾**：识别并解释冲突信息（如数据差异或因果主张冲突）。
3. **提取共识**：识别多源支持的主题，区分强共识（3+来源）与弱共识。
4. **构建叙事**：建立从引言到结论的逻辑流。
5. **维护引文**：在综合过程中严格保留来源归属。
6. **识别缺口**：明确指出目前尚不清楚或需要进一步研究的部分。

## 报告结构建议
# [研究课题]: 深度研究报告
## Executive Summary (执行摘要)
## 1. Introduction (背景介绍)
## 2. [核心主题 1] - 共识性发现
## 3. [核心主题 2]
## 4. [矛盾点分析] - 冲突与解决说明
## 5. Integrated Analysis (综合分析)
## 6. Gaps and Limitations (研究局限)
## 7. Conclusions and Recommendations (结论与建议)
## References (参考文献列表)

## 质量评估指标 (Quality Score 0-10)
- **覆盖率 (Coverage)**: 是否包含所有重要发现？
- **连贯性 (Coherence)**: 逻辑结构是否顺畅？
- **准确性 (Accuracy)**: 引文是否保留，是否有臆造？
- **洞察力 (Insight)**: 是否提供了行动建议，而非简单汇总？
- **清晰度 (Clarity)**: 组织是否条理清晰？

## 综合技巧
- **主题分组**：按主题而非按智能体来源组织内容。
- **来源三角剖分**：多个高质量来源聚合时，提高结论置信度。
- **渐进式披露**：从基础概念构建到复杂分析。

**记住：好的综合（Good Synthesis）是告诉用户“研究说了什么，意味着什么，以及你应该做什么”；而差的综合只是简单的罗列。请成为前者。**
`;
    return {
      content: [{ type: "text", text: `【Synthesizer】处理数据量: ${data?.length || 0} 字符\n\n综合指引:\n${skillInstructions}` }]
    };
  }
);

// --- 5. Citation Validator ---
server.tool(
  "citation_validator",
  { report: z.string().describe("报告文本") },
  async ({ report }) => {
     const skillInstructions = String.raw`【指令模式：Citation Validator】

## Role
你是一个 **Citation Validator**，通过验证研究报告中的每一项事实主张是否具有准确、完整且高质量的引文，来确保研究的完整性。

## 核心职责
1. **验证引文存在性**：确保每一项事实主张（数据、日期、技术规格）都有引文。
2. **验证引文完整性**：必须包含作者/机构、发布日期、标题、URL/DOI。
3. **评估来源质量 (A-E 评级)**：
   - **A (优秀)**：同行评审期刊、政府监管机构。
   - **B (良好)**：知名分析机构（Gartner, Forrester）、政府网站。
   - **C (合格)**：专家观点、公司白皮书、主流新闻媒体。
   - **D/E (不佳/极差)**：博客、社交媒体、匿名内容、失效链接。
4. **检测幻觉**：识别无支持来源的主张、不存在的 URL 或张冠李戴的引用。

## 验证流程
- **步骤 1：主张检测**。扫描报告中的统计数字、因果陈述和引用。
- **步骤 2：完整性检查**。核实引文四要素是否齐全。
- **步骤 3：事实核实**。建议配合联网搜索验证原始来源的真实数据。
- **步骤 4：生成验证报告**。包含总计主张数、准确率及“潜在幻觉”预警。

## 输出格式要求
必须产出包含以下模块的验证报告：
- **Executive Summary**: 统计准确率与质量评分 (0-10)。
- **Critical Issues**: 立即列出所有发现的幻觉或严重错误。
- **Detailed Findings**: 逐条分析主要主张的可靠性。
- **Recommendations**: 改进建议。

**记住：你是对抗错误信息和 AI 幻觉的最后一道防线。绝不在引文质量上妥协，一个有据可查的主张胜过一万句空洞的断言。**
`;
    return {
      content: [{ type: "text", text: `【Citation Validator】核查开始，报告长度: ${report?.length || 0}\n\n验证指引:\n${skillInstructions}` }]
    };
  }
);

// --- Express SSE 逻辑 (修复点 2: 结构化传输处理) ---
const app = express();
//let transport = null; 

app.get("/sse", async (req, res) => {
  console.log("🚀 SSE 连接初始化...");

  // 1. 必须先设置 Header
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // 2. 写入 Padding 解决 iOS 缓存
  res.write(': ' + ' '.repeat(2048) + '\n\n');

  // 3. 创建传输实例
  const newTransport = new SSEServerTransport("/messages", res);
  
  // 4. 【关键修改】不要立刻把全局 transport 设为 null
  // 如果你想支持多端，这里最好用 sessionId。如果自用，请确保不要同时连两台。
  transport = newTransport;

  // 5. 先建立连接
  await server.connect(newTransport);
  console.log("✅ MCP Server 已连接到 Transport");

  // 6. 监听关闭：仅在当前请求结束时清理
  req.on('close', () => {
    console.log("🔌 客户端主动断开连接");
    if (transport === newTransport) {
      transport = null; 
    }
  });
});


// 使用 express.json() 处理 POST 请求，这是标准的做法
app.post("/messages", express.json(), async (req, res) => {
  if (!transport) {
    return res.status(400).send("Session not initialized. Please connect via SSE first.");
  }
  console.log("📥 收到消息类型:", req.body?.method);
  await transport.handlePostMessage(req, res, req.body);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Deep Research MCP 运行在端口 ${PORT}`);
});
