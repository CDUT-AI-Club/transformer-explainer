# 复现与根因（确定性）

## 现象
第二次提交的提示词，模型却按第一次的提示词推理；再点一次“生成”，
新提示词末尾会被自动加进上一个提示词预测出的字。

## 复现（用项目自带的 Svelte 5 store 内部实现，非猜测）
输入 `我爱你中` → 生成；改成 `高等数` → 生成：

```
submit "我爱你中" -> runModel 实际使用 "我爱你中"
submit "高等数"   -> runModel 实际使用 "我爱你中"      ← 落后一拍
```

## 根因 1：订阅回调里读到的 $inputText 是上一拍的值
`src/routes/+page.svelte`:

```js
const unsubscribeInputText = inputText.subscribe((value) => { runModelOrCache(); });  // value 被丢弃
...
input: $inputText.trim()   // 在回调里重新读 $inputText
```

`$inputText` 编译成 `store_get(inputText, "$inputText", stores)`。它给组件建一个
**本地镜像**（mutable_source），该镜像只由它自己注册的回调更新。而这个回调是在
**第一次读 `$inputText` 的时候**才注册的 —— 那正好发生在 `inputText.subscribe()` 的
首次同步回调里，因此它被追加到订阅者集合的**末尾**。

于是每次 `set()` 通知时执行顺序是：
1. 页面这个订阅回调先被调用 → 读本地镜像 → 仍是**旧值**；
2. 之后才轮到镜像自己的回调把新值写进去。

→ 每次生成都用上一次的提示词。`value` 参数本来是对的，却被丢弃了。

对照实验：把 `$inputText` 换成回调参数 `value`（或 `get(inputText)`），立刻正确。

## 根因 2：同值 set() 不通知 → “点了生成没反应”
Svelte 的 `writable.set` 用 `safe_not_equal`，值相同不会通知任何订阅者。
`inputText.set('高等数')` 第二次点击时文本没变 → 不触发订阅 → 不推理。
用“订阅 inputText”来代替“用户点了生成”这个意图，本身就是错的事件模型。

## 根因 3：预测字没有归属，导致被塞进新提示词
`predictedToken` 只是一个字符，没有记录它属于哪个提示词。
`handleSubmit` 用 `normalizePrompt(pendingText) !== normalizePrompt($inputText)`
判断“建议是否过期”，而 `$inputText` 又被上一次提交改成了新文本，
于是“旧提示词产生的预测”看起来与输入框一致 → `acceptPrediction()` 把旧字接上去。
这就是“新输入被多加了一个字”。

## 修复要点
1. 生成由**显式请求**驱动（携带 prompt 字符串），不再靠 store diff 猜。
2. 每次运行分配 runId，被更新的运行取代后禁止写任何状态。
3. `predictedToken` 附带它所属的提示词，只有与输入框匹配时才可被接受。

---

# 修复（已实施并构建）

## 改动文件
| 文件 | 改动 |
|---|---|
| `src/store/index.ts` | 新增 `generationRequest`（含 id + prompt）、`requestGeneration()`、`predictionSource`（预测字归属） |
| `src/routes/+page.svelte` | 生成改由 `generationRequest` 驱动，prompt 来自请求本身，不再在回调里读 `$inputText` |
| `src/components/InputForm.svelte` | 提交时携带输入框文本发请求；建议只在属于当前输入时显示/可接受；选示例也发请求 |
| `src/utils/data.ts` | 每次运行分配 runId，被更新的运行取代后不再写任何状态 |
| `src/utils/trace.ts` | 新增 `?debug=1` 运行轨迹（默认无副作用） |
| `src/types/global.d.ts` | `ModelData.prompt` |
| `tests/prompt-request.test.mjs` | 6 条回归测试，锁死上面三类行为 |

## 行为差异
| 场景 | 修复前 | 修复后 |
|---|---|---|
| 输入 A 生成，改成 B 再生成 | 第二次仍按 A 推理 | 按 B 推理 |
| 同一提示词连点两次 生成 | 第二次无反应（值相同不通知） | 每次都推理 |
| 换掉输入后再点生成 | 新输入被塞进上一次预测的字 | 不塞；建议直接不显示 |
| 快速连点不同提示词 | 慢的那次可能覆盖结果 | 只保留最新一次 |
| 选同一个示例两次 | 第二次无反应 | 每次都运行 |

## 自测
```bash
node tests/prompt-request.test.mjs     # 6 passed
node --test tests/ 2>/dev/null || true
```

浏览器里带 `?debug=1` 打开，控制台会打印：
`[trace] submit` / `[trace] run:start` / `[trace] run:publish` / `[trace] run:abandon`，
`__teTraceDump()` 可导出完整轨迹。

---

# 实证（真实浏览器 + 真实 456MB 中文模型）

同一段脚本 `tests/e2e-prompt-switch.mjs` 分别跑「修复前」和「修复后」的构建，
输入框都写 `高等数` 后点「生成」，看模型**实际吃进去的词元**：

| | 输入框内容 | 模型实际运行在 | 建议字（预测） |
|---|---|---|---|
| 修复前 | `高等数` | **`我爱你中`** ❌ | `国`（属于我爱你中） |
| 修复后 | `高等数` | **`高等数`** ✅ | `学` |

截图：`docs/bug-before.png`（左：词元列是我/爱/你/中）与 `docs/bug-after.png`（高/等/数）。

## 怎么自己验证
```bash
# 1) 单元测试（不需要浏览器/模型，几秒就跑完，建议常跑）
node tests/prompt-request.test.mjs

# 2) 真实浏览器 + 真实模型（需要先 ./start.sh 或 serve.py 已启动）
node tests/e2e-prompt-switch.mjs http://127.0.0.1:4173/

# 3) 在修复前的构建上复现 bug（需要旧构建跑在 4174）
node tests/e2e-prompt-switch.mjs http://127.0.0.1:4174/ --legacy
```

> e2e 测试是可选工具，应用本身不依赖浏览器自动化。若环境里没有
> `playwright-core` / headless Chrome，脚本会直接给出安装提示而不是报栈：
> ```bash
> npm install --legacy-peer-deps --no-save playwright-core
> npx playwright-core install chromium-headless-shell
> ```
> 也可以用 `CHROME_PATH` 指向已有的 chrome-headless-shell。

## 现场排查用
打开 `http://127.0.0.1:4173/?debug=1`，控制台会实时打印每一步：
```
[trace] submit        {typed, submitted, acceptedSuggestion}
[trace] request       {requestId, prompt}
[trace] run:start     {runId, prompt}
[trace] run:publish   {runId, prompt, sampled}
[trace] run:abandon   {runId, prompt, at}   ← 被更新的运行取代，结果丢弃
```
`__teTraceDump()` 导出完整轨迹，`copy(__teTraceDump())` 可直接复制。
以后再有“跑了错的输入”的问题，看 `run:start` 的 prompt 和 `submit` 的 submitted 是否一致即可定位。
