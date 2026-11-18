# 给 UER 团队的模型授权咨询邮件（草稿）

## 收件人 / 渠道

- 首选：在 <https://huggingface.co/uer/gpt2-chinese-cluecorpussmall> 的 model card 页面开一个
  **Discussion / Community 帖**（公开、有记录，学术团队一般都会看）。
- 备选：GitHub issue，<https://github.com/dbiir/UER-py/issues>（UER-py 是同一团队的代码库，
  维护者响应更及时）。
- 备选：直接邮件联系 UER-py 论文的通讯作者（`uer-py` 仓库 README 里列出的维护者）。

> 说明：该模型卡目前**没有 license 标签**，按 Hugging Face 的默认理解是「保留所有权利」。
> 所以下面的话术核心是：**说明用途、请求明确授权、给出版权方的署名方式、承诺不商用**。

---

## 英文邮件正文（可直接贴）

Subject: Permission request: using `uer/gpt2-chinese-cluecorpussmall` in a non-commercial
science-museum exhibit

Dear UER team,

I am building a **non-commercial public exhibition** of the Transformer Explainer
(<https://poloclub.github.io/transformer-explainer/>, MIT licensed) for a science museum in China.
The exhibit runs entirely offline on a local machine and lets visitors type a sentence and watch,
step by step, how a GPT-2-style model turns it into the next-token prediction — tokenization,
embeddings, attention heads, the MLP, logits and the sampling controls.

The audience is the general Chinese-speaking public, so the demo has to work on **Chinese input**.
GPT-2's own tokenizer has no CJK tokens at all: a single Chinese character is split into 2–3 raw
UTF-8 byte fragments, which makes the visualisation unreadable and defeats the whole point of the
exhibit.

`uer/gpt2-chinese-cluecorpussmall` is by far the best fit: it is character-level (one Chinese
character = one token), and it has exactly the same architecture as GPT-2 small (12 layers, 12
heads, 768 hidden), so it drops into the existing visualisation with no changes to the interface.

I would like to ask:

1. **May I use the model weights and the `vocab.txt` tokenizer for this non-commercial,
   public-education exhibit?** The exhibit runs offline; no model output is collected or
   redistributed as a service.
2. **Would you be willing to state a license** (e.g. Apache-2.0 or MIT) on the model card, or grant
   permission in writing here? A clear license would also help other educators reuse it.
3. **How should we credit you?** My current plan is an on-screen credit and a README line reading:
   *"Chinese language model: `uer/gpt2-chinese-cluecorpussmall` by the UER-py team (Tencent)."*

If it helps, I am happy to share the converted ONNX export and the exact preprocessing steps
(`BertTokenizer` with `tokenize_chinese_chars=True`, converted to a `tokenizer.json`), and to send a
short video of the exhibit once it is running.

Thank you for releasing these models — they are one of the very few Chinese GPT-2 checkpoints with a
character-level vocabulary, and without them this exhibit would not be possible.

Best regards,
<你的名字>
<机构 / 展览名称>
<联系邮箱>

---

## 中文要点（内部记录，不必发出）

- **只问三件事**：能不能用、能不能给个明确 license、怎么署名。
- **强调非商用 + 线下展览 + 不对外提供模型服务**，这是最容易拿到许可的组合。
- **主动提出回馈**：给对方 ONNX 转换脚本和 tokenizer.json，对 UER 团队自己也有价值
  （他们目前只发布 `vocab.txt`，没有 `tokenizer.json`）。
- **不要把话说成"我在复制你们的模型"**，说成"在科普展览中使用"。
- 如果 2 周内没有回复，走 fallback：`IDEA-CCNL/Wenzhong-GPT2-110M`（Apache-2.0，法律干净，
  但分词仍是字节级，中文会按字节碎片切，观感打折）。

---

## 附：技术事实（写邮件时可引用，均已实测）

| 项 | 值 |
|---|---|
| GPT-2 词表 | 50,257，其中整字中文词元仅 **8** 个（`人 大 天 女 士 使 代 姫`） |
| `人工智能` 在 GPT-2 下 | **8** 个词元（UTF-8 字节碎片） |
| `数据可视化让用户` | **19** 个词元 |
| uer 词表 | 21,128，纯汉字 **7,321** 个，一字一项，0 个多字词 |
| uer 架构 | `n_layer=12, n_head=12, n_embd=768, vocab_size=21128` — 与 GPT-2 small 同构 |
| uer 权重 | `pytorch_model.bin` 420,921,295 B |
| uer tokenizer.json | **不存在**（404），只有 `vocab.txt`（109,540 B） |
