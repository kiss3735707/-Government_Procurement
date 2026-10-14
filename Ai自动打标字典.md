下面我按你最新的需求，重新规划一版适合 **“中标（成交）结果公告”** 的 AI 自动打标签方案。

重点调整如下：

1. 不再是“采购意向/商机预测”为主。
2. 核心目标改为：**中标结果结构化抽取、供应商中标分析、行业分析、项目复盘、采购趋势分析**。
3. 增加 **中标供应商、成交金额、评审得分、包件/标项、服务范围、施工工期、供应商画像** 等字段。
4. 支持一条公告里有多个包件、多个中标供应商的情况。
5. 支持 AI 自动抽取并输出标准化 JSON，方便后续入库、搜索、统计、分析。

你可以将下面内容保存为：

```text
bid_result_tag_dictionary.md
```

````markdown
# 中标（成交）结果公告 AI 自动标签规范

> 用途：用于政府采购、工程招标、企业采购等“中标（成交）结果公告”的 AI 自动标签化、结构化抽取和后续数据分析。
>
> 适用对象：中标（成交）结果公告、成交公告、中标结果公示、结果公告等。

---

## 一、调整背景

此前标签体系偏向“采购意向 / 招标公告 / 商机推荐”，适用于预测供应商可能参与的项目。

当前需求调整为：**对中标（成交）结果公告进行 AI 自动打标签**。

因此标签重点需要从“商机预测”转向“结果事实抽取”，核心关注：

1. 谁中标了？
2. 中了多少钱？
3. 中了哪些包件？
4. 采购人了什么服务、货物或工程？
5. 项目属于哪个行业？
6. 供应商类型是什么？
7. 项目服务周期、施工周期、履约要求是什么？
8. 是否存在多包件、多供应商、多成交金额？
9. 是否存在金额不一致、信息缺失、字段粘连等数据质量问题？

---

## 二、与采购意向标签体系的主要差异

| 维度 | 采购意向/招标阶段 | 中标（成交）结果公告阶段 |
|---|---|---|
| 核心目标 | 商机预测、供应商匹配 | 中标结果分析、供应商中标画像 |
| 时间字段 | 预计采购时间 | 公告日期、服务时间、工期、合同签订周期 |
| 金额字段 | 预算金额 | 成交金额、各包件成交金额、总成交金额 |
| 供应商字段 | 适合供应商类型 | 实际中标供应商、供应商地址、得分、金额 |
| 项目字段 | 采购需求预测 | 中标/成交结果、包件明细、服务范围、施工范围 |
| 分析价值 | 商机推送 | 中标分析、竞争分析、供应商能力画像、行业趋势 |

因此，原标签中的以下内容需要弱化或删除：

```text
预计采购时间
商机等级
竞争程度预测
适合供应商类型
供应商订阅推送
采购意向到招标公告转化率
```

新增或强化以下内容：

```text
中标供应商
成交金额
包件数量
标项名称
评审总得分
服务时间
施工工期
项目经理
执行证书
供应商地址
供应商类型
中标行业
中标内容标签
金额一致性校验
```

---

## 三、标签对象层级

中标（成交）结果公告不能只打公告级标签，建议拆成三层：

### 3.1 公告级标签

用于描述整条公告。

例如：

```text
公告类型
项目名称
项目编号
采购人
地区
项目大类
行业领域
总成交金额
是否多包
中标结果状态
```

### 3.2 包件级标签

用于描述每一个标项/包件。

例如：

```text
标项名称
包件序号
中标供应商
成交金额
评审总得分
服务范围
施工范围
服务时间
施工工期
项目经理
执行证书
```

### 3.3 供应商级标签

用于沉淀供应商中标画像。

例如：

```text
供应商名称
供应商地区
供应商类型
中标项目
中标行业
中标金额
中标时间
服务区域
历史中标次数
```

---

## 四、标签体系总览

| 标签大类 | 编码前缀 | 用途 |
|---|---|---|
| A. 公告基础与结果状态标签 | A | 判断公告类型、结果状态、是否多包 |
| B. 地区标签 | B | 区域统计、区域分析 |
| C. 采购人标签 | C | 采购人分析、单位性质分析 |
| D. 项目属性标签 | D | 判断货物、工程、服务 |
| E. 金额标签 | E | 预算、成交金额、金额区间、金额校验 |
| F. 中标成交结果标签 | F | 中标结果、供应商数量、得分情况 |
| G. 包件/标项标签 | G | 多包件、多标项结果抽取 |
| H. 供应商标签 | H | 中标供应商画像 |
| I. 行业领域标签 | I | 行业分类、行业统计 |
| J. 采购内容标签 | J | 项目具体采购内容 |
| K. 人员与资质标签 | K | 项目经理、证书、资质信息 |
| L. 时间与履约标签 | L | 服务期、工期、公告期 |
| M. 政策功能标签 | M | 中小企业、节能环保等政采政策 |
| N. 评审与代理标签 | N | 评审专家、代理费、公告期限 |
| O. 关键词标签 | O | 搜索兜底、模型训练、扩展检索 |

---

# 五、标签字典明细

---

## A. 公告基础与结果状态标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| A01 | 公告类型 | 枚举 | 单选 | 中标（成交）结果公告 | 固定结果公告类型 |
| A02 | 结果状态 | 枚举 | 单选 | 中标、成交、废标、终止、流标、其他 | 本场景通常为中标/成交 |
| A03 | 项目状态 | 枚举 | 单选 | 已定标、结果公告阶段 | 表示项目已有结果 |
| A04 | 是否政府采购 | 枚举 | 单选 | 是、否、未明确 | 判断是否政采项目 |
| A05 | 是否工程招标 | 枚举 | 单选 | 是、否、未明确 | 判断是否工程类项目 |
| A06 | 是否多包 | 布尔 | 单选 | 是、否 | 是否有多个标项/包件 |
| A07 | 包件数量 | 数值 | 单选 | 1、2、4 | 统计包件数 |
| A08 | 公告标题 | 文本 | 单选 | 安全第三方服务的中标（成交）结果公告 | 原始标题 |
| A09 | 项目名称 | 文本 | 单选 | 安全第三方服务 | 公告内项目名称 |
| A10 | 项目编号 | 文本 | 单选 | 310120101260804127085-20373164 | 原文项目编号 |
| A11 | 原文来源 | 文本 | 单选 | 上海政府采购网、中国政府采购网 | 数据来源 |
| A12 | 原文链接 | 文本 | 单选 | 原公告链接 | 用于溯源 |

### 标准值建议

```text
A02 结果状态：
中标
成交
废标
终止
流标
其他

A03 项目状态：
已定标
结果公告阶段
```

---

## B. 地区标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| B01 | 省份 | 文本 | 单选 | 上海市 | 公告所属省份 |
| B02 | 城市 | 文本 | 单选 | 上海市 | 公告所属城市 |
| B03 | 区县 | 文本 | 单选 | 奉贤区、虹口区、嘉定区 | 公告所属区县 |
| B04 | 街镇 | 文本 | 单选 | 南桥镇、曲阳路街道、嘉定区公安分局 | 采购人或项目街镇 |
| B05 | 经济区域 | 枚举 | 多选 | 长三角、京津冀、粤港澳大湾区 | 宏观区域分析 |
| B06 | 采购人所属区域 | 文本 | 单选 | 上海市奉贤区南桥镇 | 采购人归属地 |
| B07 | 服务/施工区域 | 文本 | 多选 | 杨王园区、江海园区、玉田新村、东体小区 | 项目履约地点 |

### 地区抽取优先级

```text
公告列表页地区 > 采购人名称中的行政区 > 标题中的行政区 > 正文中的服务/施工范围
```

---

## C. 采购人标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| C01 | 采购人 | 文本 | 单选 | 上海市奉贤区南桥镇经济发展服务中心 | 采购单位全称 |
| C02 | 采购人简称 | 文本 | 单选 | 南桥镇经济发展服务中心 | 展示用 |
| C03 | 单位性质 | 枚举 | 单选 | 政府机关、事业单位、团体组织、国有企业、学校、医院、科研院所、其他、未明确 | 主体类型 |
| C04 | 单位层级 | 枚举 | 单选 | 中央、省、市、区县、街镇、园区、企业、其他 | 单位行政层级 |
| C05 | 主管部门 | 文本 | 单选 | 公安分局、经济发展部门、住建部门、消防部门 | 可根据采购人推断 |
| C06 | 采购人行业 | 枚举 | 多选 | 经济管理、公共安全、住建、应急管理、信息化 | 采购人职能归类 |
| C07 | 代理机构 | 文本 | 单选 | 未明确 | 若公告中存在则抽取 |

### 标准值建议

```text
C03 单位性质：
政府机关
事业单位
团体组织
国有企业
学校
医院
科研院所
其他
未明确

C04 单位层级：
中央
省
市
区县
街镇
园区
企业
其他
```

---

## D. 项目属性标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| D01 | 采购对象大类 | 枚举 | 单选 | 货物类、工程类、服务类 | 最核心分类 |
| D02 | 采购对象二级 | 枚举 | 多选 | 安全第三方服务、消防设施改造、信息化设备采购、机房改造、大屏改造 | 细化项目类型 |
| D03 | 项目属性 | 枚举 | 多选 | 采购、服务、施工、改造、安装、运维、咨询 | 项目性质 |
| D04 | 是否政府购买服务 | 枚举 | 单选 | 是、否、未明确 | 服务类项目分析 |
| D05 | 是否框架协议 | 布尔 | 单选 | 是、否、未明确 | 框架协议采购 |
| D06 | 是否定点采购 | 布尔 | 单选 | 是、否、未明确 | 定点、协议供货 |
| D07 | 是否含安装/改造 | 布尔 | 单选 | 是、否 | 货物类项目常伴随安装改造 |

### 判断规则

```text
如果主要标的是设备、软硬件、材料、终端、车辆等，则采购对象大类为货物类。
如果主要标的是施工、改造、修缮、安装、拆除等，则采购对象大类为工程类。
如果主要标的是管理、咨询、运维、安保、安全服务、物业、培训等，则采购对象大类为服务类。
如果同时存在货物和安装改造，优先根据公告标题、标的名称、主要标的信息判断主标的。
```

---

## E. 金额标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| E01 | 预算金额 | 数值 | 单选 | 未明确 | 若公告中有预算则抽取 |
| E02 | 公告头部中标金额 | 数值 | 单选 | 398000.00 | 页面头部展示的金额 |
| E03 | 包件成交金额合计 | 数值 | 单选 | 1194600.00 | 根据明细包件求和 |
| E04 | 金额是否一致 | 枚举 | 单选 | 一致、不一致、无法判断 | 头部金额与明细合计对比 |
| E05 | 币种 | 枚举 | 单选 | 人民币、美元、欧元 | 默认人民币 |
| E06 | 金额区间 | 枚举 | 单选 | 10万元以下、10万-50万元、50万-100万元、100万-300万元、300万-500万元、500万-1000万元、1000万-5000万元、5000万元以上 | 按包件合计判断 |
| E07 | 是否超100万 | 布尔 | 单选 | 是、否 | 中等以上项目筛选 |
| E08 | 是否超400万 | 布尔 | 单选 | 是、否 | 公开招标限额参考 |

### 金额区间标准

```text
10万元以下
10万-50万元
50万-100万元
100万-300万元
300万-500万元
500万-1000万元
1000万-5000万元
5000万元以上
```

### 金额抽取规则

```text
1. 优先抽取“中标（成交金额）”字段。
2. 如存在多个包件，应逐包抽取金额，并计算总成交金额。
3. 公告头部金额可能只是第一个包件金额，不能直接作为项目总金额。
4. 如头部金额与包件合计不一致，应标记“金额不一致”。
5. 如金额与评审得分粘连，例如“92.4398000.00元”，应结合上下文拆分。
6. 无法确定时，不要编造，标记“未明确”或低置信度。
```

---

## F. 中标成交结果标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| F01 | 中标供应商数量 | 数值 | 单选 | 4 | 中标供应商去重数量 |
| F02 | 中标供应商列表 | 文本数组 | 多选 | 上海谷贤企业管理服务有限公司、上海耕强安防技术有限公司 | 实际中标供应商 |
| F03 | 评审得分列表 | 数值数组 | 多选 | 92.40、92.16、91.47、91.17 | 各包件得分 |
| F04 | 最高评审得分 | 数值 | 单选 | 92.40 | 若有则填写 |
| F05 | 最低评审得分 | 数值 | 单选 | 91.17 | 若有则填写 |
| F06 | 平均评审得分 | 数值 | 单选 | 91.80 | 若有则填写 |
| F07 | 是否本地供应商 | 枚举 | 单选 | 是、否、部分本地、未明确 | 根据供应商地址判断 |
| F08 | 是否小微企业 | 枚举 | 单选 | 是、否、未明确 | 若公告未明确不推断 |
| F09 | 是否联合体 | 枚举 | 单选 | 是、否、未明确 | 是否联合体中标 |
| F10 | 是否单一来源 | 枚举 | 单选 | 是、否、未明确 | 单一来源采购人员/结果 |

---

## G. 包件/标项标签

包件级标签是中标（成交）结果公告中最关键的结构化对象之一。

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| G01 | 包件序号 | 数值 | 单选 | 1、2、3、4 | 标项序号 |
| G02 | 标项名称 | 文本 | 单选 | 安全第三方服务（杨王园区） | 包件名称 |
| G03 | 中标供应商 | 文本 | 单选 | 上海谷贤企业管理服务有限公司 | 该包件中标供应商 |
| G04 | 供应商地址 | 文本 | 单选 | 南桥镇金海公路3265号18号楼2单元6楼 | 原文地址 |
| G05 | 供应商所在区 | 文本 | 单选 | 奉贤区、闵行区、普陀区、宝山区 | 从地址抽取 |
| G06 | 评审总得分 | 数值 | 单选 | 92.40 | 该包件得分 |
| G07 | 成交金额 | 数值 | 单选 | 398000.00 | 该包件金额 |
| G08 | 服务范围/施工范围 | 文本 | 单选 | 按招标文件要求 | 原文抽取 |
| G09 | 服务要求 | 文本 | 单选 | 按招标文件要求 | 原文抽取 |
| G10 | 服务时间/施工工期 | 文本 | 单选 | 自合同签订之日起一年、合同签订之日起50日历天内交付使用 | 履约周期 |
| G11 | 项目经理 | 文本 | 单选 | 未明确 | 工程类公告常见 |
| G12 | 执行证书信息 | 文本 | 单选 | 未明确 | 工程类公告常见 |
| G13 | 备注 | 文本 | 单选 | 无 | 原文备注 |

### 包件抽取要求

```text
1. 每个标项必须单独抽取。
2. 不得将多个包件合并成一个供应商结果。
3. 若一个供应商中标多个包件，应分别记录。
4. 若一个包件有多个供应商，应记录为联合体或共同中标，并根据原文明确。
5. 若金额、得分、地址粘连，应尽量拆分；无法拆分时保留原文并标记低置信度。
```

---

## H. 供应商标签

用于建立供应商中标画像。

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| H01 | 供应商名称 | 文本 | 单选 | 上海谷贤企业管理服务有限公司 | 中标供应商全称 |
| H02 | 供应商简称 | 文本 | 单选 | 谷贤企管 | 展示用 |
| H03 | 供应商地区 | 文本 | 单选 | 上海市奉贤区 | 根据地址抽取 |
| H04 | 供应商类型 | 枚举 | 多选 | 企业管理服务公司、安防技术公司、建筑工程公司、消防工程公司、信息化集成商、通信运营商 | 供应商标签 |
| H05 | 中标行业 | 枚举 | 多选 | 应急管理、公共安全、建筑工程、信息化数字化 | 供应商中标行业 |
| H06 | 中标内容标签 | 文本数组 | 多选 | 安全第三方服务、消防设施改造、信息化基础设施改造 | 供应商标签 |
| H07 | 中标金额 | 数值 | 单选 | 398000.00 | 单包或合计 |
| H08 | 评审得分 | 数值 | 单选 | 92.40 | 若公告有 |
| H09 | 是否本地供应商 | 枚举 | 单选 | 是、否 | 与采购人同区/同市判断 |
| H10 | 是否小微企业 | 枚举 | 单选 | 是、否、未明确 | 不得无依据推断 |

### 常见供应商类型

```text
企业管理服务公司
安防技术公司
安全第三方服务机构
建筑工程公司
消防工程公司
建筑修缮公司
装饰装修企业
信息化集成商
通信运营商
软件公司
数据服务公司
网络安全公司
物业管理公司
人力资源服务公司
安保服务公司
园林绿化企业
养老服务企业
会计师事务所
律师事务所
造价咨询公司
招标代理机构
检测认证机构
```

---

## I. 行业领域标签

### I1. 一级行业标签

| 标签编码 | 一级行业 | 说明 |
|---|---|---|
| I01 | 应急管理 | 安全生产、消防、防灾减灾、应急指挥等 |
| I02 | 公共安全 | 公安、治安、平安建设、技防物防、公安信息化等 |
| I03 | 建筑工程 | 房建、装修、改造、修缮、消防工程等 |
| I04 | 城市管理 | 市容、环卫、市政、城管辅助等 |
| I05 | 基层治理 | 社区、村居、网格化、基层治理服务等 |
| I06 | 市政交通 | 道路、桥梁、交通设施、停车、照明等 |
| I07 | 绿化园林 | 绿化、公园、林业、景观等 |
| I08 | 水务水利 | 河道、排水、污水、防汛等 |
| I09 | 信息化数字化 | 软件、平台、数据、云、网络安全、机房等 |
| I10 | 教育 | 学校、教育装备、教育服务等 |
| I11 | 医疗卫生 | 医院、医疗设备、卫健服务等 |
| I12 | 民政养老 | 养老、救助、残联、社工等 |
| I13 | 文化体育 | 文化活动、体育设施、场馆运营等 |
| I14 | 市场监管 | 食药监、特种设备、信用监管等 |
| I15 | 财税审计 | 审计、会计、绩效评价、造价等 |
| I16 | 法律咨询 | 法律服务、合规、仲裁、公证等 |
| I17 | 科研技术 | 科研、实验室、技术服务等 |
| I18 | 商业服务 | 物业、餐饮、保险、租赁、人力等 |
| I19 | 其他 | 无法明确归类 |

### I2. 二级行业标签

| 一级行业 | 二级行业标签 |
|---|---|
| 应急管理 | 安全生产服务、安全第三方服务、消防安全、应急预案、防灾减灾 |
| 公共安全 | 平安建设、治安辅助、公安信息化、指挥中心建设、技防建设、物防设施 |
| 建筑工程 | 房屋修缮、消防工程、建筑改造、装修改造、安装工程 |
| 城市管理 | 环卫保洁、市容管理、市政养护、违法建筑整治 |
| 基层治理 | 社区治理、村居服务、网格化管理、社工服务 |
| 信息化数字化 | 软件开发、平台运维、机房建设、综合布线、监控改造、大屏系统、会议系统 |
| 市政交通 | 道路养护、交通设施、停车管理、照明设施 |
| 绿化园林 | 绿化养护、公园管理、景观提升 |
| 水务水利 | 河道养护、排水维护、污水处理、防汛防台 |

---

## J. 采购内容标签

采购内容标签用于描述项目具体采购了什么，是搜索和供应商画像最重要的标签。

### J1. 安全与应急类

| 标签编码 | 标签名称 | 说明 |
|---|---|---|
| J0101 | 安全第三方服务 | 安全生产、安全管理第三方服务 |
| J0102 | 园区安全服务 | 园区安全巡查、安全管理辅助 |
| J0103 | 村居安全服务 | 村、社区安全服务 |
| J0104 | 安全检查 | 安全隐患排查、安全检查 |
| J0105 | 安全巡查 | 安全巡逻、日常巡查 |
| J0106 | 安全生产服务 | 安全生产第三方技术服务 |
| J0107 | 应急预案服务 | 应急预案编制、演练 |
| J0108 | 消防安全服务 | 消防检查、消防宣传、消防评估 |

### J2. 消防与建筑改造类

| 标签编码 | 标签名称 | 说明 |
|---|---|---|
| J0201 | 消防设施改造 | 消防设施更新、安装、改造 |
| J0202 | 消防喷淋安装 | 喷淋系统加装 |
| J0203 | 防火材料喷涂 | 木质构件防火处理 |
| J0204 | 木质楼梯防火改造 | 木质楼梯防火处理 |
| J0205 | 砖木结构房屋改造 | 砖木结构房屋安全改造 |
| J0206 | 住宅修缮 | 老旧小区、住宅修缮 |
| J0207 | 建筑改造工程 | 建筑主体或附属设施改造 |
| J0208 | 安装工程 | 消防、水电、设备安装 |

### J3. 信息化类

| 标签编码 | 标签名称 | 说明 |
|---|---|---|
| J0301 | 信息化基础设施改造 | 指挥中心、机房、网络等基础改造 |
| J0302 | 指挥中心信息化改造 | 公安、应急指挥中心建设 |
| J0303 | 机房改造 | 机房装修、供配电、空调、机柜等 |
| J0304 | 综合布线 | 网络、弱电、综合布线 |
| J0305 | 监控改造 | 视频监控、安防监控 |
| J0306 | 大屏改造 | 指挥大屏、显示系统 |
| J0307 | 会议设备改造 | 会议系统、音频视频设备 |
| J0308 | 无线设备改造 | 无线通信、无线覆盖、指挥调度 |
| J0309 | 软硬件采购 | 系统软硬件采购 |

### J4. 城市运维与公共服务类

| 标签编码 | 标签名称 | 说明 |
|---|---|---|
| J0401 | 物业管理 | 办公楼、社区、园区物业 |
| J0402 | 安保服务 | 保安、巡逻、门岗 |
| J0403 | 环卫保洁 | 道路保洁、垃圾清运 |
| J0404 | 绿化养护 | 绿地、树木、公园养护 |
| J0405 | 设施维护 | 公共设施维护 |
| J0406 | 人力资源服务 | 劳务派遣、外包用工 |
| J0407 | 培训服务 | 干部培训、技能培训 |
| J0408 | 第三方评估 | 绩效评估、项目评估 |

---

## K. 人员与资质标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| K01 | 项目经理 | 文本 | 单选 | 未明确 | 工程类公告常见 |
| K02 | 执行证书信息 | 文本 | 单选 | 未明确 | 注册建造师、安全员等 |
| K03 | 资质要求 | 文本 | 多选 | 未明确 | 若结果公告中提及则抽取 |
| K04 | 人员要求 | 文本 | 多选 | 未明确 | 若原文提及则抽取 |

---

## L. 时间与履约标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| L01 | 公告日期 | 日期 | 单选 | 系统抓取日期 | 若原文无则取采集时间 |
| L02 | 服务时间 | 文本 | 单选 | 自合同签订之日起一年 | 服务类项目 |
| L03 | 施工工期 | 文本 | 单选 | 合同签订之日起50日历天内交付使用 | 工程/货物改造项目 |
| L04 | 履约期限类型 | 枚举 | 单选 | 按年、按日历天、固定日期、未明确 | 便于统计 |
| L05 | 公告期限 | 文本 | 单选 | 自本公告发布之日起1个工作日 | 公告要求 |
| L06 | 合同签订时间 | 日期 | 单选 | 未明确 | 若原文有则抽取 |

---

## M. 政策功能标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| M01 | 中小企业政策 | 多选 | 多选 | 面向中小企业、小微企业、专精特新、未明确 | 政采政策 |
| M02 | 节能环保 | 多选 | 多选 | 节能产品、环保产品、绿色采购、未明确 | 政策采购 |
| M03 | 残疾人就业 | 多选 | 多选 | 残疾人福利性单位、未明确 | 政策功能 |
| M04 | 监狱企业 | 多选 | 多选 | 监狱企业产品、未明确 | 政策功能 |
| M05 | 国产信创 | 多选 | 多选 | 信创、国产化、自主可控、未明确 | 信息化项目常见 |
| M06 | 绿色低碳 | 多选 | 多选 | 绿色建筑、低碳、碳中和、未明确 | 工程类项目常见 |

---

## N. 评审与代理标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| N01 | 评审专家名单 | 文本数组 | 多选 | 蒋建军、王瑾德、周嘉晏 | 若公告有 |
| N02 | 代理服务收费标准 | 文本 | 单选 | 未明确 | 若公告有 |
| N03 | 代理服务收费金额 | 数值 | 单选 | 未明确 | 若公告有 |
| N04 | 公告期限 | 文本 | 单选 | 自本公告发布之日起1个工作日 | 公告要求 |
| N05 | 推荐理由 | 文本 | 单选 | 若原文有则抽取 | 用于分析中标理由 |

---

## O. 关键词标签

| 标签编码 | 标签名称 | 类型 | 输入方式 | 示例 | 说明 |
|---|---|---|---|---|---|
| O01 | 标题关键词 | 文本数组 | 多选 | 安全第三方服务、消防设施改造、信息化基础设施改造 | 从标题提取 |
| O02 | 正文关键词 | 文本数组 | 多选 | 杨王园区、玉田新村、指挥大厅、机房改造 | 从正文提取 |
| O03 | 高价值业务词 | 文本数组 | 多选 | 安全第三方服务、消防喷淋、防火材料、指挥中心、大屏改造 | 用于匹配 |
| O04 | 地名关键词 | 文本数组 | 多选 | 南桥镇、曲阳路街道、嘉定区 | 用于地区检索 |

---

# 六、AI 自动打标输出 JSON 结构

建议后端统一输出以下 JSON 结构。

```json
{
  "announcement": {
    "title": "",
    "project_name": "",
    "project_code": "",
    "info_type": "中标（成交）结果公告",
    "result_status": "",
    "project_status": "",
    "is_government_purchase": "",
    "is_multi_package": "",
    "package_count": 0,
    "source_name": "",
    "source_url": ""
  },
  "region": {
    "province": "",
    "city": "",
    "district": "",
    "street": "",
    "service_or_construction_area": []
  },
  "purchaser": {
    "name": "",
    "short_name": "",
    "unit_nature": "",
    "unit_level": "",
    "related_industry": [],
    "agency": ""
  },
  "project_type": {
    "purchase_object": "",
    "purchase_object_sub": [],
    "project_nature": [],
    "is_government_purchase_service": "",
    "contains_installation_or_renovation": ""
  },
  "amount": {
    "budget_amount": "",
    "header_amount": 0,
    "item_total_amount": 0,
    "currency": "人民币",
    "amount_consistency": "",
    "amount_range": "",
    "is_over_1_million": "",
    "is_over_4_million": ""
  },
  "result": {
    "supplier_count": 0,
    "supplier_names": [],
    "review_scores": [],
    "max_review_score": 0,
    "min_review_score": 0,
    "avg_review_score": 0,
    "is_local_supplier": "",
    "is_small_micro": "",
    "is_consortium": "",
    "is_single_source": ""
  },
  "result_items": [
    {
      "item_index": 1,
      "item_name": "",
      "supplier_name": "",
      "supplier_address": "",
      "supplier_district": "",
      "review_score": 0,
      "deal_amount": 0,
      "service_scope": "",
      "service_requirement": "",
      "service_time_or_construction_period": "",
      "project_manager": "",
      "certificate_info": "",
      "remark": ""
    }
  ],
  "industry": {
    "main_industry": "",
    "sub_industry": []
  },
  "purchase_content_tags": [],
  "supplier_tags": [
    {
      "supplier_name": "",
      "supplier_type": [],
      "supplier_region": "",
      "winning_industry": [],
      "winning_content_tags": [],
      "deal_amount": 0,
      "review_score": 0
    }
  ],
  "keywords": [],
  "quality": {
    "confidence": 0,
    "missing_fields": [],
    "warnings": [],
    "tag_explain": ""
  }
}
```

---

# 七、AI 自动打标提示词

可用于后端调用大模型，对中标（成交）结果公告进行自动标签解析。

```text
你是政府采购数据治理与内容运营专家。请对我提供的“中标（成交）结果公告”进行标准化标签解析，用于后续数据分析、项目检索、供应商画像和中标结果统计。

请严格按以下规则处理：

1. 只根据原文内容提取信息，不虚构、不推断无关内容。
2. 对无法确认的信息填写“未明确”。
3. 标签要标准化、可统计、可检索。
4. 重点抽取：公告类型、项目名称、项目编号、采购人、地区、采购对象类型、预算/成交金额、中标供应商、评审得分、包件明细、服务时间/施工工期、行业领域、采购内容标签、供应商类型。
5. 如果公告中有多个标项/包件，必须逐个抽取，不得合并。
6. 如果公告头部金额只展示某一个包件金额，应同时计算包件明细合计金额，并标记金额是否一致。
7. 如果评审得分与成交金额粘连，例如“92.4398000.00元”，应结合上下文、金额规律、包件金额进行合理拆分；无法确定时保留原文并降低置信度。
8. 供应商类型、行业标签、采购内容标签可以基于原文进行合理归类，但必须有原文依据。
9. 对于政策类标签，如中小企业、节能环保等，若原文未明确，不得推断。
10. 输出结构化 JSON 结果，方便入库。

请输出以下 JSON 结构：

{
  "announcement": {
    "title": "",
    "project_name": "",
    "project_code": "",
    "info_type": "中标（成交）结果公告",
    "result_status": "",
    "project_status": "",
    "is_government_purchase": "",
    "is_multi_package": "",
    "package_count": 0,
    "source_name": "",
    "source_url": ""
  },
  "region": {
    "province": "",
    "city": "",
    "district": "",
    "street": "",
    "service_or_construction_area": []
  },
  "purchaser": {
    "name": "",
    "short_name": "",
    "unit_nature": "",
    "unit_level": "",
    "related_industry": [],
    "agency": ""
  },
  "project_type": {
    "purchase_object": "",
    "purchase_object_sub": [],
    "project_nature": [],
    "is_government_purchase_service": "",
    "contains_installation_or_renovation": ""
  },
  "amount": {
    "budget_amount": "",
    "header_amount": 0,
    "item_total_amount": 0,
    "currency": "人民币",
    "amount_consistency": "",
    "amount_range": "",
    "is_over_1_million": "",
    "is_over_4_million": ""
  },
  "result": {
    "supplier_count": 0,
    "supplier_names": [],
    "review_scores": [],
    "max_review_score": 0,
    "min_review_score": 0,
    "avg_review_score": 0,
    "is_local_supplier": "",
    "is_small_micro": "",
    "is_consortium": "",
    "is_single_source": ""
  },
  "result_items": [
    {
      "item_index": 1,
      "item_name": "",
      "supplier_name": "",
      "supplier_address": "",
      "supplier_district": "",
      "review_score": 0,
      "deal_amount": 0,
      "service_scope": "",
      "service_requirement": "",
      "service_time_or_construction_period": "",
      "project_manager": "",
      "certificate_info": "",
      "remark": ""
    }
  ],
  "industry": {
    "main_industry": "",
    "sub_industry": []
  },
  "purchase_content_tags": [],
  "supplier_tags": [
    {
      "supplier_name": "",
      "supplier_type": [],
      "supplier_region": "",
      "winning_industry": [],
      "winning_content_tags": [],
      "deal_amount": 0,
      "review_score": 0
    }
  ],
  "keywords": [],
  "quality": {
    "confidence": 0,
    "missing_fields": [],
    "warnings": [],
    "tag_explain": ""
  }
}

以下是待处理公告：

{这里粘贴中标（成交）结果公告原文}
```

---

# 八、关键解析规则

---

## 8.1 多包件识别规则

出现以下情况，应判断为多包件：

```text
存在“序号、标项名称、中标供应商名称、中标供应商地址、评审总得分、中标（成交金额）”表格。
存在多个标项名称。
存在多个中标供应商。
主要标的信息中有多个包名称。
```

标签输出：

```text
is_multi_package = 是
package_count = 包件数量
result_items = 每个包件一条记录
```

---

## 8.2 金额拆分规则

中标公告中常见得分与金额粘连，例如：

```text
92.4398000.00元
95.33373836.01元
92.736780000.00元
```

建议拆分逻辑：

```text
1. 优先识别金额特征：金额通常以“元”结尾，且包含两位小数。
2. 成交金额通常为较大数值，例如 398000.00、373836.01、6780000.00。
3. 评审总得分通常为 0-100 之间，常见两位小数。
4. 如页面头部已给出某个包件金额，可用于辅助判断。
5. 若仍无法拆分，保留原始字符串，并输出低置信度。
```

示例：

```text
原文：92.4398000.00元
已知头部金额：398000.00
拆分结果：
评审总得分：92.4
成交金额：398000.00
```

---

## 8.3 总金额计算规则

```text
包件成交金额合计 = 所有包件成交金额相加
公告头部中标金额 = 页面顶部展示金额
金额是否一致：
  - 若头部金额 = 包件合计，则一致
  - 若头部金额 = 第一个包件金额，则不一致
  - 若无法判断，则无法判断
```

---

## 8.4 项目类型判断规则

### 服务类

出现以下关键词：

```text
服务
第三方服务
管理
咨询
运维
安保
物业
保洁
培训
评估
调查
```

### 工程类

出现以下关键词：

```text
施工
改造
修缮
安装
拆除
建设
消防工程
防火材料喷涂
喷淋设施
工期
项目经理
执行证书
```

### 货物类

出现以下关键词：

```text
设备
软硬件采购
终端
服务器
大屏
会议设备
无线设备
监控设备
机房设备
```

### 混合类型处理

```text
1. 如果标题为“设备采购”，但包含安装、改造，优先判断为货物类，并标注“含安装/改造”。
2. 如果标题为“改造工程”，但包含设备采购，优先判断为工程类，并标注设备采购内容。
3. 如果无法判断主标的，则采购对象大类标记“未明确”，并在 warnings 中说明。
```

---

## 8.5 行业判断规则

| 行业 | 关键词 |
|---|---|
| 应急管理 | 安全第三方服务、安全生产、安全检查、消防、应急、防火、防灾 |
| 公共安全 | 公安、平安建设、治安、指挥中心、技防、物防、派出所 |
| 建筑工程 | 施工、改造、修缮、消防工程、防火材料、砖木结构房屋、工期 |
| 信息化数字化 | 信息化、软硬件、机房、综合布线、监控、大屏、会议设备、无线设备 |
| 基层治理 | 村、社区、园区、居委、村委、网格 |
| 城市管理 | 市容、环卫、保洁、市政、城管 |
| 民政养老 | 养老、助残、救助、残联、民政 |
| 教育 | 学校、教育、教学、校园 |
| 医疗卫生 | 医院、医疗、卫生、疾控 |

---

# 九、推荐数据库设计

---

## 9.1 中标结果公告主表：bid_result_notice

| 字段名 | 类型 | 说明 |
|---|---|---|
| notice_id | BIGINT | 公告ID，主键 |
| source_id | VARCHAR | 来源网站原始ID |
| source_name | VARCHAR | 来源网站名称 |
| title | VARCHAR | 公告标题 |
| project_name | VARCHAR | 项目名称 |
| project_code | VARCHAR | 项目编号 |
| info_type | VARCHAR | 公告类型 |
| result_status | VARCHAR | 中标、成交、废标、终止、流标 |
| province | VARCHAR | 省份 |
| city | VARCHAR | 城市 |
| district | VARCHAR | 区县 |
| street | VARCHAR | 街镇 |
| purchaser | VARCHAR | 采购人 |
| purchaser_nature | VARCHAR | 单位性质 |
| purchaser_level | VARCHAR | 单位层级 |
| agency | VARCHAR | 代理机构 |
| purchase_object | VARCHAR | 货物类、工程类、服务类 |
| main_industry | VARCHAR | 主行业 |
| budget_amount | DECIMAL | 预算金额 |
| header_amount | DECIMAL | 公告头部金额 |
| item_total_amount | DECIMAL | 包件成交金额合计 |
| amount_consistency | VARCHAR | 金额是否一致 |
| amount_range | VARCHAR | 金额区间 |
| supplier_count | INT | 中标供应商数量 |
| is_multi_package | TINYINT | 是否多包 |
| package_count | INT | 包件数量 |
| publish_date | DATE | 公告日期 |
| url | VARCHAR | 原文链接 |

### 建表 SQL 示例

```sql
CREATE TABLE bid_result_notice (
    notice_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '公告ID',
    source_id VARCHAR(100) COMMENT '来源网站原始ID',
    source_name VARCHAR(100) COMMENT '来源网站名称',
    title VARCHAR(500) NOT NULL COMMENT '公告标题',
    project_name VARCHAR(500) COMMENT '项目名称',
    project_code VARCHAR(100) COMMENT '项目编号',
    info_type VARCHAR(50) DEFAULT '中标（成交）结果公告' COMMENT '公告类型',
    result_status VARCHAR(20) COMMENT '中标、成交、废标、终止、流标',
    province VARCHAR(50) COMMENT '省份',
    city VARCHAR(50) COMMENT '城市',
    district VARCHAR(50) COMMENT '区县',
    street VARCHAR(100) COMMENT '街镇',
    purchaser VARCHAR(255) COMMENT '采购人',
    purchaser_nature VARCHAR(50) COMMENT '单位性质',
    purchaser_level VARCHAR(50) COMMENT '单位层级',
    agency VARCHAR(255) COMMENT '代理机构',
    purchase_object VARCHAR(50) COMMENT '货物类、工程类、服务类',
    main_industry VARCHAR(100) COMMENT '主行业',
    budget_amount DECIMAL(18,2) COMMENT '预算金额',
    header_amount DECIMAL(18,2) COMMENT '公告头部金额',
    item_total_amount DECIMAL(18,2) COMMENT '包件成交金额合计',
    amount_consistency VARCHAR(20) COMMENT '金额是否一致',
    amount_range VARCHAR(50) COMMENT '金额区间',
    supplier_count INT COMMENT '中标供应商数量',
    is_multi_package TINYINT DEFAULT 0 COMMENT '是否多包',
    package_count INT DEFAULT 1 COMMENT '包件数量',
    publish_date DATE COMMENT '公告日期',
    url VARCHAR(500) COMMENT '原文链接',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_region (province, city, district),
    INDEX idx_purchaser (purchaser),
    INDEX idx_info_type (info_type),
    INDEX idx_publish_date (publish_date),
    INDEX idx_main_industry (main_industry),
    INDEX idx_amount_range (amount_range)
) COMMENT '中标成交结果公告主表';
```

---

## 9.2 中标结果包件明细表：bid_result_item

| 字段名 | 类型 | 说明 |
|---|---|---|
| item_id | BIGINT | 包件明细ID，主键 |
| notice_id | BIGINT | 公告ID |
| item_index | INT | 包件序号 |
| item_name | VARCHAR | 标项名称 |
| supplier_name | VARCHAR | 中标供应商 |
| supplier_address | VARCHAR | 供应商地址 |
| supplier_district | VARCHAR | 供应商所在区 |
| review_score | DECIMAL | 评审总得分 |
| deal_amount | DECIMAL | 成交金额 |
| service_scope | TEXT | 服务范围/施工范围 |
| service_requirement | TEXT | 服务要求 |
| service_time_or_construction_period | VARCHAR | 服务时间/施工工期 |
| project_manager | VARCHAR | 项目经理 |
| certificate_info | VARCHAR | 执行证书信息 |
| remark | VARCHAR | 备注 |

### 建表 SQL 示例

```sql
CREATE TABLE bid_result_item (
    item_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '包件明细ID',
    notice_id BIGINT NOT NULL COMMENT '公告ID',
    item_index INT COMMENT '包件序号',
    item_name VARCHAR(500) COMMENT '标项名称',
    supplier_name VARCHAR(255) COMMENT '中标供应商',
    supplier_address VARCHAR(500) COMMENT '供应商地址',
    supplier_district VARCHAR(50) COMMENT '供应商所在区',
    review_score DECIMAL(6,2) COMMENT '评审总得分',
    deal_amount DECIMAL(18,2) COMMENT '成交金额',
    service_scope TEXT COMMENT '服务范围或施工范围',
    service_requirement TEXT COMMENT '服务要求',
    service_time_or_construction_period VARCHAR(255) COMMENT '服务时间或施工工期',
    project_manager VARCHAR(100) COMMENT '项目经理',
    certificate_info VARCHAR(255) COMMENT '执行证书信息',
    remark VARCHAR(255) COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_notice_id (notice_id),
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_deal_amount (deal_amount)
) COMMENT '中标成交结果包件明细表';
```

---

## 9.3 供应商主数据表：bid_supplier

| 字段名 | 类型 | 说明 |
|---|---|---|
| supplier_id | BIGINT | 供应商ID，主键 |
| supplier_name | VARCHAR | 供应商名称 |
| supplier_short_name | VARCHAR | 供应商简称 |
| supplier_region | VARCHAR | 供应商地区 |
| supplier_type | VARCHAR | 供应商类型 |
| main_industry | VARCHAR | 主要中标行业 |
| winning_count | INT | 历史中标次数 |
| total_winning_amount | DECIMAL | 历史中标总金额 |
| last_winning_date | DATE | 最近中标时间 |

### 建表 SQL 示例

```sql
CREATE TABLE bid_supplier (
    supplier_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '供应商ID',
    supplier_name VARCHAR(255) NOT NULL COMMENT '供应商名称',
    supplier_short_name VARCHAR(100) COMMENT '供应商简称',
    supplier_region VARCHAR(100) COMMENT '供应商地区',
    supplier_type VARCHAR(255) COMMENT '供应商类型',
    main_industry VARCHAR(100) COMMENT '主要中标行业',
    winning_count INT DEFAULT 0 COMMENT '历史中标次数',
    total_winning_amount DECIMAL(18,2) DEFAULT 0 COMMENT '历史中标总金额',
    last_winning_date DATE COMMENT '最近中标时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_supplier_name (supplier_name)
) COMMENT '中标供应商主数据表';
```

---

## 9.4 标签字典表：tag_dict

用于维护标签主数据，可沿用原标签字典表结构。

```sql
CREATE TABLE tag_dict (
    tag_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '标签ID',
    tag_code VARCHAR(50) NOT NULL COMMENT '标签编码',
    tag_name VARCHAR(100) NOT NULL COMMENT '标签名称',
    tag_category VARCHAR(50) NOT NULL COMMENT '标签大类',
    parent_code VARCHAR(50) DEFAULT NULL COMMENT '上级标签编码',
    tag_level INT DEFAULT 1 COMMENT '标签层级',
    value_type VARCHAR(20) NOT NULL COMMENT '值类型',
    input_type VARCHAR(20) NOT NULL COMMENT '输入方式',
    enum_values TEXT COMMENT '枚举值',
    generate_rule TEXT COMMENT '生成规则',
    status VARCHAR(10) DEFAULT 'ENABLE' COMMENT '状态',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_tag_code (tag_code)
) COMMENT '中标结果公告标签字典表';
```

---

## 9.5 公告标签关系表：bid_result_tag_relation

```sql
CREATE TABLE bid_result_tag_relation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    notice_id BIGINT NOT NULL COMMENT '公告ID',
    item_id BIGINT DEFAULT NULL COMMENT '包件ID，可为空，空表示公告级标签',
    tag_code VARCHAR(50) NOT NULL COMMENT '标签编码',
    tag_name VARCHAR(100) NOT NULL COMMENT '标签名称',
    tag_value VARCHAR(255) COMMENT '标签值',
    tag_category VARCHAR(50) COMMENT '标签分类',
    confidence DECIMAL(5,2) DEFAULT NULL COMMENT '置信度',
    source_type VARCHAR(20) COMMENT '来源类型：人工、规则、模型、系统',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_notice_id (notice_id),
    INDEX idx_item_id (item_id),
    INDEX idx_tag_code (tag_code),
    INDEX idx_tag_category (tag_category)
) COMMENT '中标结果公告标签关系表';
```

---

# 十、示例解析

---

## 示例一：安全第三方服务中标（成交）结果公告

### 原始关键信息

```text
项目名称：安全第三方服务
地区：奉贤区
采购人：上海市奉贤区南桥镇经济发展服务中心
项目编号：310120101260804127085-20373164
公告头部中标金额：398000.00
包件数量：4
包件1：安全第三方服务（杨王园区），上海谷贤企业管理服务有限公司，金额398000.00
包件2：安全第三方服务（江海园区、灵芝村、吴塘村、张翁庙村），上海耕强安防技术有限公司，金额369000.00
包件3：安全第三方服务（江海村、华严村、沈陆村），上海容上企业管理有限公司，金额228000.00
包件4：安全第三方服务（六墩村、光明园区、曙光村），上海森特企业管理服务有限公司，金额199600.00
服务时间：自合同签订之日起一年
```

### 标签化结果

```json
{
  "announcement": {
    "title": "安全第三方服务的中标（成交）结果公告",
    "project_name": "安全第三方服务",
    "project_code": "310120101260804127085-20373164",
    "info_type": "中标（成交）结果公告",
    "result_status": "成交",
    "project_status": "已定标",
    "is_government_purchase": "是",
    "is_multi_package": "是",
    "package_count": 4,
    "source_name": "未明确",
    "source_url": "未明确"
  },
  "region": {
    "province": "上海市",
    "city": "上海市",
    "district": "奉贤区",
    "street": "南桥镇",
    "service_or_construction_area": [
      "杨王园区",
      "江海园区",
      "灵芝村",
      "吴塘村",
      "张翁庙村",
      "江海村",
      "华严村",
      "沈陆村",
      "六墩村",
      "光明园区",
      "曙光村"
    ]
  },
  "purchaser": {
    "name": "上海市奉贤区南桥镇经济发展服务中心",
    "short_name": "南桥镇经济发展服务中心",
    "unit_nature": "事业单位",
    "unit_level": "街镇",
    "related_industry": [
      "经济管理",
      "应急管理",
      "基层治理"
    ],
    "agency": "未明确"
  },
  "project_type": {
    "purchase_object": "服务类",
    "purchase_object_sub": [
      "安全第三方服务",
      "园区安全服务",
      "村居安全服务"
    ],
    "project_nature": [
      "服务",
      "第三方服务",
      "安全服务"
    ],
    "is_government_purchase_service": "是",
    "contains_installation_or_renovation": "否"
  },
  "amount": {
    "budget_amount": "未明确",
    "header_amount": 398000.00,
    "item_total_amount": 1194600.00,
    "currency": "人民币",
    "amount_consistency": "不一致",
    "amount_range": "100万-300万元",
    "is_over_1_million": "是",
    "is_over_4_million": "否"
  },
  "result": {
    "supplier_count": 4,
    "supplier_names": [
      "上海谷贤企业管理服务有限公司",
      "上海耕强安防技术有限公司",
      "上海容上企业管理有限公司",
      "上海森特企业管理服务有限公司"
    ],
    "review_scores": [
      92.40,
      92.16,
      91.47,
      91.17
    ],
    "max_review_score": 92.40,
    "min_review_score": 91.17,
    "avg_review_score": 91.80,
    "is_local_supplier": "部分本地",
    "is_small_micro": "未明确",
    "is_consortium": "否",
    "is_single_source": "否"
  },
  "result_items": [
    {
      "item_index": 1,
      "item_name": "安全第三方服务（杨王园区）",
      "supplier_name": "上海谷贤企业管理服务有限公司",
      "supplier_address": "南桥镇金海公路3265号18号楼2单元6楼",
      "supplier_district": "奉贤区",
      "review_score": 92.40,
      "deal_amount": 398000.00,
      "service_scope": "按招标文件要求",
      "service_requirement": "按招标文件要求",
      "service_time_or_construction_period": "自合同签订之日起一年",
      "project_manager": "未明确",
      "certificate_info": "未明确",
      "remark": "无"
    },
    {
      "item_index": 2,
      "item_name": "安全第三方服务（江海园区、灵芝村、吴塘村、张翁庙村）",
      "supplier_name": "上海耕强安防技术有限公司",
      "supplier_address": "上海市奉贤区金海公路6055号",
      "supplier_district": "奉贤区",
      "review_score": 92.16,
      "deal_amount": 369000.00,
      "service_scope": "按招标文件要求",
      "service_requirement": "按招标文件要求",
      "service_time_or_construction_period": "自合同签订之日起一年",
      "project_manager": "未明确",
      "certificate_info": "未明确",
      "remark": "无"
    },
    {
      "item_index": 3,
      "item_name": "安全第三方服务（江海村、华严村、沈陆村）",
      "supplier_name": "上海容上企业管理有限公司",
      "supplier_address": "上海市奉贤区沪杭公路1778号602室",
      "supplier_district": "奉贤区",
      "review_score": 91.47,
      "deal_amount": 228000.00,
      "service_scope": "按招标文件要求",
      "service_requirement": "按招标文件要求",
      "service_time_or_construction_period": "自合同签订之日起一年",
      "project_manager": "未明确",
      "certificate_info": "未明确",
      "remark": "无"
    },
    {
      "item_index": 4,
      "item_name": "安全第三方服务（六墩村、光明园区、曙光村）",
      "supplier_name": "上海森特企业管理服务有限公司",
      "supplier_address": "上海闵行光华路18号B座5楼",
      "supplier_district": "闵行区",
      "review_score": 91.17,
      "deal_amount": 199600.00,
      "service_scope": "按招标文件要求",
      "service_requirement": "按招标文件要求",
      "service_time_or_construction_period": "自合同签订之日起一年",
      "project_manager": "未明确",
      "certificate_info": "未明确",
      "remark": "无"
    }
  ],
  "industry": {
    "main_industry": "应急管理",
    "sub_industry": [
      "安全生产服务",
      "安全第三方服务",
      "园区安全治理",
      "村居安全服务"
    ]
  },
  "purchase_content_tags": [
    "安全第三方服务",
    "园区安全服务",
    "村居安全服务",
    "安全巡查",
    "安全检查",
    "安全生产服务"
  ],
  "supplier_tags": [
    {
      "supplier_name": "上海谷贤企业管理服务有限公司",
      "supplier_type": [
        "企业管理服务公司",
        "安全第三方服务机构"
      ],
      "supplier_region": "上海市奉贤区",
      "winning_industry": [
        "应急管理",
        "基层治理"
      ],
      "winning_content_tags": [
        "安全第三方服务",
        "园区安全服务"
      ],
      "deal_amount": 398000.00,
      "review_score": 92.40
    },
    {
      "supplier_name": "上海耕强安防技术有限公司",
      "supplier_type": [
        "安防技术公司",
        "安全第三方服务机构"
      ],
      "supplier_region": "上海市奉贤区",
      "winning_industry": [
        "应急管理",
        "公共安全"
      ],
      "winning_content_tags": [
        "安全第三方服务",
        "园区安全服务",
        "村居安全服务"
      ],
      "deal_amount": 369000.00,
      "review_score": 92.16
    },
    {
      "supplier_name": "上海容上企业管理有限公司",
      "supplier_type": [
        "企业管理服务公司",
        "安全第三方服务机构"
      ],
      "supplier_region": "上海市奉贤区",
      "winning_industry": [
        "应急管理",
        "基层治理"
      ],
      "winning_content_tags": [
        "安全第三方服务",
        "村居安全服务"
      ],
      "deal_amount": 228000.00,
      "review_score": 91.47
    },
    {
      "supplier_name": "上海森特企业管理服务有限公司",
      "supplier_type": [
        "企业管理服务公司",
        "安全第三方服务机构"
      ],
      "supplier_region": "上海市闵行区",
      "winning_industry": [
        "应急管理",
        "基层治理"
      ],
      "winning_content_tags": [
        "安全第三方服务",
        "园区安全服务",
        "村居安全服务"
      ],
      "deal_amount": 199600.00,
      "review_score": 91.17
    }
  ],
  "keywords": [
    "安全第三方服务",
    "南桥镇",
    "杨王园区",
    "江海园区",
    "灵芝村",
    "吴塘村",
    "张翁庙村",
    "江海村",
    "华严村",
    "沈陆村",
    "六墩村",
    "光明园区",
    "曙光村"
  ],
  "quality": {
    "confidence": 0.90,
    "missing_fields": [
      "budget_amount",
      "agency",
      "source_url"
    ],
    "warnings": [
      "公告头部金额398000.00仅等于第一个包件金额，不等于四个包件成交金额合计。"
    ],
    "tag_explain": "地区来自公告列表和采购人名称；行业来自安全第三方服务关键词；采购对象为服务类；供应商类型基于供应商名称和项目内容推断。"
  }
}
```

---

## 示例二：消防喷淋设施和木质楼梯防火改造项目

### 原始关键信息

```text
项目名称：曲阳路街道玉田新村、东体小区砖木结构房屋更换、加装消防喷淋设施和木质楼梯喷涂防火材料改造项目
地区：虹口区
采购人：上海市虹口区人民政府曲阳路街道办事处
公告头部中标金额：373836.01
包件数量：4
包件1：上海港峰建设工程有限公司，金额373836.01
包件2：上海滔隆建筑工程有限公司，金额86125.39
包件3：上海飞滕建设发展有限公司，金额391910.36
包件4：上海华洵建设工程有限公司，金额385515.03
项目类型：工程类
行业：建筑工程、应急管理、消防安全
```

### 核心标签

```json
{
  "announcement": {
    "title": "曲阳路街道玉田新村、东体小区砖木结构房屋更换、加装消防喷淋设施和木质楼梯喷涂防火材料改造项目的中标（成交）结果公告",
    "project_name": "曲阳路街道玉田新村、东体小区砖木结构房屋更换、加装消防喷淋设施和木质楼梯喷涂防火材料改造项目",
    "project_code": "310109000260813128601-09374894",
    "info_type": "中标（成交）结果公告",
    "result_status": "成交",
    "is_government_purchase": "是",
    "is_multi_package": "是",
    "package_count": 4
  },
  "region": {
    "province": "上海市",
    "city": "上海市",
    "district": "虹口区",
    "street": "曲阳路街道",
    "service_or_construction_area": [
      "玉田新村",
      "东体小区",
      "东体育会路657弄",
      "东体育会路659弄",
      "大连西路76号",
      "大连西路78号",
      "大连西路80号"
    ]
  },
  "purchaser": {
    "name": "上海市虹口区人民政府曲阳路街道办事处",
    "unit_nature": "政府机关",
    "unit_level": "街镇",
    "related_industry": [
      "基层治理",
      "建筑工程",
      "应急管理"
    ]
  },
  "project_type": {
    "purchase_object": "工程类",
    "purchase_object_sub": [
      "消防设施改造",
      "住宅修缮",
      "建筑改造工程",
      "安装工程"
    ],
    "project_nature": [
      "改造",
      "施工",
      "安装",
      "消防工程"
    ],
    "contains_installation_or_renovation": "是"
  },
  "amount": {
    "budget_amount": "未明确",
    "header_amount": 373836.01,
    "item_total_amount": 1237386.79,
    "currency": "人民币",
    "amount_consistency": "不一致",
    "amount_range": "100万-300万元",
    "is_over_1_million": "是",
    "is_over_4_million": "否"
  },
  "industry": {
    "main_industry": "建筑工程",
    "sub_industry": [
      "消防设施改造",
      "住宅修缮",
      "建筑改造工程",
      "消防安全改造"
    ]
  },
  "purchase_content_tags": [
    "消防设施改造",
    "消防喷淋安装",
    "防火材料喷涂",
    "木质楼梯防火改造",
    "砖木结构房屋改造",
    "老旧小区消防设施改造"
  ],
  "supplier_tags": [
    {
      "supplier_name": "上海港峰建设工程有限公司",
      "supplier_type": [
        "建筑工程公司",
        "消防工程公司"
      ],
      "supplier_region": "上海市浦东新区",
      "winning_industry": [
        "建筑工程",
        "应急管理"
      ],
      "winning_content_tags": [
        "消防设施改造",
        "消防喷淋安装",
        "防火材料喷涂"
      ],
      "deal_amount": 373836.01,
      "review_score": 95.33
    },
    {
      "supplier_name": "上海滔隆建筑工程有限公司",
      "supplier_type": [
        "建筑工程公司",
        "消防工程公司"
      ],
      "supplier_region": "上海市普陀区",
      "winning_industry": [
        "建筑工程",
        "应急管理"
      ],
      "winning_content_tags": [
        "消防设施改造",
        "住宅修缮"
      ],
      "deal_amount": 86125.39,
      "review_score": 95.03
    },
    {
      "supplier_name": "上海飞滕建设发展有限公司",
      "supplier_type": [
        "建筑工程公司",
        "建筑改造公司"
      ],
      "supplier_region": "上海市宝山区",
      "winning_industry": [
        "建筑工程",
        "应急管理"
      ],
      "winning_content_tags": [
        "消防设施改造",
        "砖木结构房屋改造"
      ],
      "deal_amount": 391910.36,
      "review_score": 95.33
    },
    {
      "supplier_name": "上海华洵建设工程有限公司",
      "supplier_type": [
        "建筑工程公司",
        "消防工程公司"
      ],
      "supplier_region": "上海市虹口区",
      "winning_industry": [
        "建筑工程",
        "应急管理"
      ],
      "winning_content_tags": [
        "消防设施改造",
        "住宅修缮"
      ],
      "deal_amount": 385515.03,
      "review_score": 93.33
    }
  ],
  "keywords": [
    "曲阳路街道",
    "玉田新村",
    "东体小区",
    "砖木结构房屋",
    "消防喷淋设施",
    "木质楼梯",
    "防火材料",
    "消防设施改造"
  ],
  "quality": {
    "confidence": 0.90,
    "missing_fields": [
      "budget_amount",
      "agency",
      "source_url"
    ],
    "warnings": [
      "公告头部金额373836.01仅等于第一个包件金额，不等于四个包件成交金额合计。"
    ],
    "tag_explain": "项目名称明确包含消防喷淋、防火材料、砖木结构房屋改造，因此采购对象大类判断为工程类；行业归类为建筑工程，并补充消防安全改造二级行业。"
  }
}
```

---

## 示例三：公安指挥中心信息化基础设施改造设备项目

### 原始关键信息

```text
项目名称：嘉定公安分局指挥中心信息化基础设施改造设备
地区：嘉定区
采购人：上海市公安局嘉定分局
中标供应商：联通（上海）产业互联网有限公司
成交金额：6780000.00
评审总得分：92.73
项目内容：系统软硬件采购，指挥中心综合布线及监控改造、机房改造、大屏改造、会议设备改造、无线设备改造
交付时间：合同签订之日起50日历天内交付使用
```

### 核心标签

```json
{
  "announcement": {
    "title": "嘉定公安分局指挥中心信息化基础设施改造设备的中标（成交）结果公告",
    "project_name": "嘉定公安分局指挥中心信息化基础设施改造设备",
    "project_code": "310114000260828131094-14377770",
    "info_type": "中标（成交）结果公告",
    "result_status": "成交",
    "project_status": "已定标",
    "is_government_purchase": "是",
    "is_multi_package": "否",
    "package_count": 1
  },
  "region": {
    "province": "上海市",
    "city": "上海市",
    "district": "嘉定区",
    "street": "未明确",
    "service_or_construction_area": [
      "17楼指挥大厅",
      "指挥中心机房"
    ]
  },
  "purchaser": {
    "name": "上海市公安局嘉定分局",
    "short_name": "嘉定公安分局",
    "unit_nature": "政府机关",
    "unit_level": "区县",
    "related_industry": [
      "公共安全",
      "信息化数字化"
    ],
    "agency": "未明确"
  },
  "project_type": {
    "purchase_object": "货物类",
    "purchase_object_sub": [
      "信息化设备采购",
      "机房改造",
      "大屏改造",
      "会议设备改造",
      "无线设备改造",
      "综合布线"
    ],
    "project_nature": [
      "采购",
      "改造",
      "安装",
      "信息化基础设施建设"
    ],
    "is_government_purchase_service": "否",
    "contains_installation_or_renovation": "是"
  },
  "amount": {
    "budget_amount": "未明确",
    "header_amount": 6780000.00,
    "item_total_amount": 6780000.00,
    "currency": "人民币",
    "amount_consistency": "一致",
    "amount_range": "500万-1000万元",
    "is_over_1_million": "是",
    "is_over_4_million": "是"
  },
  "result": {
    "supplier_count": 1,
    "supplier_names": [
      "联通（上海）产业互联网有限公司"
    ],
    "review_scores": [
      92.73
    ],
    "max_review_score": 92.73,
    "min_review_score": 92.73,
    "avg_review_score": 92.73,
    "is_local_supplier": "是",
    "is_small_micro": "未明确",
    "is_consortium": "否",
    "is_single_source": "未明确"
  },
  "result_items": [
    {
      "item_index": 1,
      "item_name": "嘉定公安分局指挥中心信息化基础设施改造设备",
      "supplier_name": "联通（上海）产业互联网有限公司",
      "supplier_address": "长宁路1033号7楼",
      "supplier_district": "长宁区",
      "review_score": 92.73,
      "deal_amount": 6780000.00,
      "service_scope": "本项目为系统软硬件采购，对17楼指挥大厅进行信息化基础设施改造。主要涉及指挥中心综合布线及监控改造、指挥中心机房改造、指挥中心大屏改造、会议设备改造、指挥中心无线设备改造。",
      "service_requirement": "供应商应保证服务内容和服务质量符合国家法律法规和规范要求，在服务期限内完成服务内容并通过验收，确保项目的顺利进行。",
      "service_time_or_construction_period": "合同签订之日起50日历天内交付使用",
      "project_manager": "未明确",
      "certificate_info": "未明确",
      "remark": "无"
    }
  ],
  "industry": {
    "main_industry": "公共安全",
    "sub_industry": [
      "公安信息化",
      "指挥中心建设",
      "信息化基础设施",
      "机房建设",
      "监控改造"
    ]
  },
  "purchase_content_tags": [
    "指挥中心信息化改造",
    "信息化基础设施改造",
    "软硬件采购",
    "综合布线",
    "监控改造",
    "机房改造",
    "大屏改造",
    "会议设备改造",
    "无线设备改造"
  ],
  "supplier_tags": [
    {
      "supplier_name": "联通（上海）产业互联网有限公司",
      "supplier_type": [
        "通信运营商",
        "信息化集成商",
        "信息化基础设施供应商"
      ],
      "supplier_region": "上海市长宁区",
      "winning_industry": [
        "公共安全",
        "信息化数字化"
      ],
      "winning_content_tags": [
        "指挥中心信息化改造",
        "机房改造",
        "综合布线",
        "监控改造",
        "大屏改造",
        "会议设备改造",
        "无线设备改造"
      ],
      "deal_amount": 6780000.00,
      "review_score": 92.73
    }
  ],
  "keywords": [
    "嘉定公安分局",
    "指挥中心",
    "信息化基础设施",
    "系统软硬件采购",
    "综合布线",
    "监控改造",
    "机房改造",
    "大屏改造",
    "会议设备改造",
    "无线设备改造"
  ],
  "quality": {
    "confidence": 0.92,
    "missing_fields": [
      "budget_amount",
      "agency",
      "source_url"
    ],
    "warnings": [
      "预算金额未明确。"
    ],
    "tag_explain": "项目名称和主要标的信息明确为指挥中心信息化基础设施改造设备，主要涉及软硬件采购及安装改造，因此采购对象大类判断为货物类，并标注含安装/改造。采购人为公安分局，主行业归入公共安全，副行业包括信息化数字化。"
  }
}
```

---

# 十一、标签质量治理规则

---

## 11.1 标签来源分类

| 来源类型 | 说明 |
|---|---|
| 人工 | 人工手动标注 |
| 规则 | 基于关键词、正则、字段规则生成 |
| 模型 | 基于 AI 或 NLP 模型生成 |
| 系统 | 系统自动生成，如金额合计、金额区间、公告日期 |

---

## 11.2 标签置信度建议

| 置信度 | 说明 |
|---|---|
| 0.90-1.00 | 高置信度，可直接入库 |
| 0.70-0.89 | 中置信度，建议人工审核 |
| 0.50-0.69 | 低置信度，需要人工确认 |
| 0.50以下 | 不建议直接展示 |

---

## 11.3 数据质量问题处理

| 问题类型 | 处理方式 |
|---|---|
| 预算缺失 | 填写“未明确”，不得编造 |
| 头部金额与明细金额不一致 | 记录两个金额，标记“不一致” |
| 得分与金额粘连 | 尝试拆分，无法拆分则保留原文并降低置信度 |
| 多个包件金额无法识别 | 保留原文表格，进入人工审核 |
| 供应商地址不完整 | 尽量抽取到区，无法识别则填写“未明确” |
| 项目类型混合 | 记录主对象类型，并标注“含安装/改造”等混合属性 |

---

# 十二、开发优先级建议

---

## 一期优先建设

如果资源有限，一期优先实现以下能力：

```text
1. 公告基础字段抽取
2. 地区、采购人、项目名称、项目编号抽取
3. 采购对象大类判断：货物、工程、服务
4. 包件明细抽取
5. 中标供应商抽取
6. 成交金额抽取
7. 总成交金额计算
8. 金额一致性校验
9. 行业领域标签
10. 采购内容标签
11. 供应商类型标签
12. 标签入库和搜索
```

---

## 二期扩展建设

```text
1. 供应商画像
2. 供应商历史中标次数
3. 供应商历史中标金额
4. 供应商中标行业分布
5. 区域中标热力图
6. 采购人分析
7. 行业采购金额统计
8. 中标供应商竞争分析
9. 类似项目推荐
10. 供应商能力标签库
```

---

# 十三、最终简化版字段

如果系统一期不想做得太复杂，可以先使用以下字段：

```text
notice_id
title
project_name
project_code
info_type
result_status
province
city
district
street
purchaser
purchase_object
main_industry
budget_amount
header_amount
item_total_amount
amount_consistency
supplier_count
is_multi_package
package_count
publish_date
url
```

包件明细先使用以下字段：

```text
item_id
notice_id
item_index
item_name
supplier_name
supplier_address
review_score
deal_amount
service_scope
service_time_or_construction_period
project_manager
certificate_info
remark
```

这套字段已经可以支撑中标结果公告的基础结构化、标签化、搜索和统计分析。
````