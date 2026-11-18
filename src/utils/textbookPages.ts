import { get } from 'svelte/store';
import {
	expandedBlock,
	weightPopover,
	isBoundingBoxActive,
	textbookCurrentPageId,
	isExpandOrCollapseRunning,
	isFetchingModel,
	userId
} from '~/store';
import {
	highlightElements,
	removeHighlightFromElements,
	applyTransformerBoundingHeight,
	resetElementsHeight,
	highlightAttentionPath,
	removeAttentionPathHighlight,
	removeFingerFromElements
} from '~/utils/textbook';
import { drawResidualLine } from './animation';

export interface TextbookPage {
	id: string;
	title: string;
	content?: string;
	component?: any;
	timeoutId?: number;
	on: () => void;
	out: () => void;
	complete?: () => void;
}

const { drawLine, removeLine } = drawResidualLine();

export const textPages: TextbookPage[] = [
	{
		id: 'what-is-transformer',
		title: '什么是 Transformer？',
		content:
			'<p><strong>Transformer</strong> 是当今人工智能的核心架构，ChatGPT、Gemini 这类模型都建立在它之上。它于 2017 年被提出，彻底改变了 AI 处理信息的方式。同一套架构既用来在海量数据上训练，也用来推理生成结果。这里我们用的是与 GPT-2（small）同结构的<b>中文版</b>模型，它比新模型简单，但正好用来理解最基础的原理；好处是中文按单字切分，你能清楚看到「一个字 = 一个词元」。</p>',
		on: () => {},
		out: () => {}
	},
	{
		id: 'how-transformers-work',
		title: 'Transformer 是怎么工作的？',
		content:
			'<p>Transformer 并不神奇——它是一步步把文字建起来的，每一步都在问自己：</p><blockquote class="question">"在这个输入之后，最可能出现的下一个词是什么？"</blockquote><p>这里我们来看看一个训练好的模型是怎么生成文字的。你可以写下自己的句子，或者选一个示例，然后点击<strong>生成</strong>就能看到全过程。如果模型还没加载好，可以先用<strong>示例</strong>体验。</p>',
		on: () => {
			highlightElements(['.input-form']);
			if (get(isFetchingModel)) {
				highlightElements(['.input-form .select-button']);
			} else {
				highlightElements(['.input-form .generate-button']);
			}
		},
		out: () => {
			removeHighlightFromElements([
				'.input-form',
				'.input-form .select-button',
				'.input-form .generate-button'
			]);
		},
		complete: () => {
			removeFingerFromElements(['.input-form .select-button', '.input-form .generate-button']);
			if (get(textbookCurrentPageId) === 'how-transformers-work') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'how-transformers-work'
				});
			}
		}
	},
	{
		id: 'transformer-architecture',
		title: 'Transformer 的整体结构',
		content:
			'<p>Transformer 主要有三个部分：</p><div class="numbered-list"><div class="numbered-item"><span class="number-circle">1</span><div class="item-content"><strong>词向量</strong>把文字变成数字。</div></div><div class="numbered-item"><span class="number-circle">2</span><div class="item-content"><strong>Transformer 层</strong>先用自注意力混合信息，再用 MLP 提炼细节。</div></div><div class="numbered-item"><span class="number-circle">3</span><div class="item-content"><strong>概率</strong>给出每个候选词元成为下一个词元的可能性。</div></div></div>',
		on: () => {
			const selectors = [
				'.step.embedding',
				'.step.softmax',
				'.transformer-bounding',
				'.transformer-bounding-title'
			];
			highlightElements(selectors);
			applyTransformerBoundingHeight(['.softmax-bounding', '.embedding-bounding']);
		},
		out: () => {
			const selectors = [
				'.step.embedding',
				'.step.softmax',
				'.transformer-bounding',
				'.transformer-bounding-title'
			];
			removeHighlightFromElements(selectors);
			resetElementsHeight(['.softmax-bounding', '.embedding-bounding']);
		}
	},
	{
		id: 'embedding',
		title: '词向量（Embedding）',
		content:
			'<p>Transformer 还不能直接读文字，它先把文字切成小单元，再把每个单元表示成一串数字（向量）。这个过程叫<strong>嵌入（embedding）</strong>，这个词既可以指过程，也可以指算出来的那个向量。</p><p>在这个工具里，每个向量画成一个矩形，把鼠标移到上面就能看到它的长度。</p>',
		on: () => {
			highlightElements(['.step.embedding .title']);
		},
		out: () => {
			removeHighlightFromElements(['.step.embedding .title']);
		},
		complete: () => {
			removeFingerFromElements(['.step.embedding .title']);
			if (get(textbookCurrentPageId) === 'embedding') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'embedding'
				});
			}
		}
	},
	{
		id: 'token-embedding',
		title: '词元向量',
		content:
			'<p><strong>分词</strong>把输入的文字切成一个个词元——它们可能是一个词、也可能只是词的一部分。这个中文模型的词表有 21,128 个词元，每个词元都有一个编号；中文按<strong>单字</strong>切分，所以一个汉字就是一个词元。</p><p>在<strong>词元向量</strong>这一步，每个词元会从一张很大的查找表里取出对应的 768 个数字。这些向量是在训练中学出来的，用来尽量准确地表达每个词元的含义。</p>',
		on: function () {
			const selectors = [
				'.token-column .column.token-string',
				'.token-column .column.token-embedding'
			];
			if (get(expandedBlock).id !== 'embedding') {
				expandedBlock.set({ id: 'embedding' });
				this.timeoutId = setTimeout(() => {
					highlightElements(selectors);
				}, 500);
			} else {
				highlightElements(selectors);
			}
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			const selectors = [
				'.token-column .column.token-string',
				'.token-column .column.token-embedding'
			];
			removeHighlightFromElements(selectors);
			if (get(textbookCurrentPageId) !== 'positional-encoding') expandedBlock.set({ id: null });
		}
	},
	{
		id: 'positional-encoding',
		title: '位置编码',
		content:
			'<p>语言的顺序很重要。<strong>位置编码</strong>告诉每个词元：你在句子里的第几个位置。</p><p>GPT-2 的做法是给词元向量加上一个学出来的位置向量；更新的模型可能用别的方法，比如 RoPE，靠旋转某些向量来编码位置。目的都一样：让模型知道文字的顺序。</p>',
		on: function () {
			const selectors = [
				'.token-column .column.position-embedding',
				'.token-column .column.symbol'
			];
			if (get(expandedBlock).id !== 'embedding') {
				expandedBlock.set({ id: 'embedding' });
				this.timeoutId = setTimeout(() => {
					highlightElements(selectors);
				}, 500);
			} else {
				highlightElements(selectors);
			}
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			const selectors = [
				'.token-column .column.position-embedding',
				'.token-column .column.symbol'
			];
			removeHighlightFromElements(selectors);
			if (get(textbookCurrentPageId) !== 'token-embedding') expandedBlock.set({ id: null });
		}
	},
	{
		id: 'blocks',
		title: '重复堆叠的 Transformer 层',
		content:
			'<p><strong>Transformer 层</strong>是模型里最主要的处理单元，它包含两部分：</p><ul><li><strong>多头自注意力</strong>——让词元之间交换信息</li><li><strong>MLP</strong>——细化每个词元自己的细节</li></ul><p>模型会把很多层叠起来，词元的表示每经过一层就丰富一些。GPT-2（small）叠了 12 层。</p>',
		on: function () {
			this.timeoutId = setTimeout(
				() => {
					highlightElements([
						'.transformer-bounding',
						'.step.transformer-blocks .guide',
						'.attention > .title',
						'.mlp > .title'
					]);
					highlightElements(['.transformer-bounding-title'], 'textbook-button-highlight');
					isBoundingBoxActive.set(true);
				},
				get(isExpandOrCollapseRunning) ? 500 : 0
			);
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			removeHighlightFromElements([
				'.transformer-bounding',
				'.step.transformer-blocks .guide',
				'.attention > .title',
				'.mlp > .title'
			]);
			removeHighlightFromElements(['.transformer-bounding-title'], 'textbook-button-highlight');
			isBoundingBoxActive.set(false);
		},
		complete: () => {
			removeFingerFromElements(['.transformer-bounding-title']);
			if (get(textbookCurrentPageId) === 'blocks') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'blocks'
				});
			}
		}
	},
	{
		id: 'self-attention',
		title: '多头自注意力',
		content:
			'<p><strong>自注意力</strong>让模型自己判断：对当前这个词元来说，输入里哪些部分最相关。这样它就能抓住含义和关系，哪怕是隔得很远的两个词。</p><p>在<strong>多头</strong>形式下，模型会同时跑好几套注意力，每一套关注文字里不同的规律。</p>',
		on: () => {
			highlightElements(['.step.attention']);
		},
		out: () => {
			removeHighlightFromElements(['.step.attention']);
		}
	},
	{
		id: 'qkv',
		title: '查询、键、值',
		content:
			'<p>要做自注意力，每个词元的向量都会变换成<span class="highlight">三组新向量</span>——<span class="blue">查询（Query）</span>、<span class="red">键（Key）</span>和<span class="green">值（Value）</span>。这个变换靠给每个词元向量乘上不同的权重、加上不同的偏置来完成。这些参数（权重和偏置）都是在训练中优化出来的。</p><p>变换完成后，<span class="blue">查询</span>会和各个<span class="red">键</span>比较，量出彼此的关联程度，再用这个关联程度去给对应的<span class="green">值</span>加权。</p>',
		on: function () {
			this.timeoutId = setTimeout(
				() => {
					highlightElements(['g.path-group.qkv', '.step.qkv .qkv-column']);
				},
				get(isExpandOrCollapseRunning) ? 500 : 0
			);
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			removeHighlightFromElements(['g.path-group.qkv', '.step.qkv .qkv-column']);
			weightPopover.set(null);
		},
		complete: () => {
			removeFingerFromElements(['.step.qkv .qkv-column']);
			if (get(textbookCurrentPageId) === 'qkv') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'qkv'
				});
			}
		}
	},

	{
		id: 'multi-head',
		title: '多头',
		content:
			'<p>得到 <span class="blue">Q</span>、<span class="red">K</span>、<span class="green">V</span> 之后，模型会把它们拆成若干<strong>头</strong>（GPT-2 small 是 12 个）。每个头只用自己的那一小份 <span class="blue">Q</span>/<span class="red">K</span>/<span class="green">V</span>，各自关注文字里不同的规律——比如语法、含义，或者远距离的呼应。</p><p>多个头让模型能并行地学到多种关系，理解也就更丰富。</p>',
		on: () => {
			highlightAttentionPath();
			highlightElements(['.multi-head .head-title']);
		},
		out: () => {
			removeAttentionPathHighlight();
			removeHighlightFromElements(['.multi-head .head-title']);
		},
		complete: () => {
			removeFingerFromElements(['.multi-head .head-title']);
			if (get(textbookCurrentPageId) === 'multi-head') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'multi-head'
				});
			}
		}
	},
	{
		id: 'masked-self-attention',
		title: '带掩码的自注意力',
		content:
			'<p>在每个头里，模型要决定每个词元该看别的词元多少眼：</p><ul><li><strong>点积</strong>——把 <span class="blue">查询</span>与<span class="red">键</span>向量里对应的数字相乘再求和，得到<span class="purple">注意力得分</span>。</li><li><strong>掩码</strong>——把后面的词元遮住，防止它偷看还没生成的未来。</li><li><strong>Softmax</strong>——把得分换算成概率，每一行加起来等于 1，表示它把注意力放在前面哪些词元上。</li></ul>',
		on: () => {
			highlightAttentionPath();
			highlightElements(['.attention-matrix.attention-result']);
		},
		out: () => {
			removeAttentionPathHighlight();
			removeHighlightFromElements(['.attention-matrix.attention-result']);
			expandedBlock.set({ id: null });
		},
		complete: () => {
			removeFingerFromElements(['.attention-matrix.attention-result']);
			if (get(textbookCurrentPageId) === 'masked-self-attention') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'masked-self-attention'
				});
			}
		}
	},
	{
		id: 'output-concatenation',
		title: '注意力输出与拼接',
		content:
			'<p>每个头都会<span class="highlight">把自己的<span class="purple">注意力得分</span>与<span class="green">值</span>向量相乘，得到这个头的注意力输出</span>——这是每个词元在看过上下文之后更新过的表示。</p><p>GPT-2（small）有 12 个这样的输出，它们会被拼接成一个向量，长度恢复到最初的大小（768 个数字）。</p>',
		on: function () {
			this.timeoutId = setTimeout(
				() => {
					highlightElements(['path.to-attention-out.value-to-out', '.attention .column.out']);
				},
				get(isExpandOrCollapseRunning) ? 500 : 0
			);
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			removeHighlightFromElements(['path.to-attention-out.value-to-out', '.attention .column.out']);
			weightPopover.set(null);
		},
		complete: () => {
			removeFingerFromElements(['.attention .column.out']);
			if (get(textbookCurrentPageId) === 'output-concatenation') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'output-concatenation'
				});
			}
		}
	},
	{
		id: 'mlp',
		title: 'MLP（多层感知机）',
		content:
			'<p>注意力输出接着会经过一个 <strong>MLP</strong>，进一步提炼词元的表示。先用一个线性层，靠学好的权重和偏置改变向量的数值和维度，再用一个非线性激活函数决定每个数值能通过多少。</p><p>激活函数有很多种，GPT-2 用的是 <strong>GELU</strong>：小的数值只部分通过，大的数值几乎全部通过，这样既能抓住细微的差别，也能保留强烈的信号。</p>',
		on: () => {
			highlightElements(['.step.mlp', '.operation-col.activation']);
		},
		out: () => {
			removeHighlightFromElements(['.step.mlp', '.operation-col.activation']);
		}
	},

	{
		id: 'output-logit',
		title: '输出得分',
		content:
			'<p>走完全部 Transformer 层之后，最后一个词元的输出向量已经融合了前面所有词元的上下文，它会被乘上最后一层学好的权重。</p><p>这样得到的是一组<strong>得分（logits）</strong>，共 21,128 个数字——词表里每个词元对应一个，数值表示它成为下一个词元的可能性有多大。</p>',
		on: () => {
			highlightElements(['g.path-group.softmax', '.column.final']);
		},
		out: () => {
			removeHighlightFromElements(['g.path-group.softmax', '.column.final']);
			weightPopover.set(null);
		},
		complete: () => {
			removeFingerFromElements(['.column.final']);
			if (get(textbookCurrentPageId) === 'output-logit') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'output-logit'
				});
			}
		}
	},
	{
		id: 'output-probabilities',
		title: '概率',
		content:
			'<p>得分只是原始分数。为了便于理解，我们把它们换算成 0 到 1 之间的<strong>概率</strong>，并且所有概率加起来等于 1。这就是每个词元成为下一个词元的可能性。</p><p>我们不一定总挑概率最高的那个，也可以用不同的挑选策略，在生成文字的稳妥与创意之间找平衡。</p>',
		on: () => {
			highlightElements(['.step.softmax .title']);
		},
		out: () => {
			removeHighlightFromElements(['.step.softmax .title']);
		},
		complete: () => {
			removeFingerFromElements(['.step.softmax .title']);
			if (get(textbookCurrentPageId) === 'output-probabilities') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'output-probabilities'
				});
			}
		}
	},
	{
		id: 'temperature',
		title: '温度',
		content:
			'<p><strong>温度</strong>的作用是在把得分换算成概率之前，先对得分做一次缩放。<strong>温度低</strong>（比如 0.2）会让大的得分更大、小的得分更小，于是更偏向得分最高的那几个词元，结果<strong>更好预测</strong>。<strong>温度高</strong>（比如 1.0 以上）会把差距抹平，让原本不太可能的词元也有机会，于是<strong>更有创意</strong>。</p>',
		on: function () {
			if (get(expandedBlock).id !== 'softmax') {
				expandedBlock.set({ id: 'softmax' });
				this.timeoutId = setTimeout(() => {
					highlightElements([
						'.formula-step.scaled',
						'.title-box.scaled',
						'.content-box.scaled',
						'.temperature-input'
					]);
				}, 500);
			} else {
				highlightElements([
					'.formula-step.scaled',
					'.title-box.scaled',
					'.content-box.scaled',
					'.temperature-input'
				]);
			}
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			removeHighlightFromElements([
				'.formula-step.scaled',
				'.title-box.scaled',
				'.temperature-input',
				'.content-box.scaled'
			]);
			if (!['temperature', 'sampling'].includes(get(textbookCurrentPageId)))
				expandedBlock.set({ id: null });
		},
		complete: () => {
			removeFingerFromElements(['.temperature-input']);
			if (get(textbookCurrentPageId) === 'temperature') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'temperature'
				});
			}
		}
	},
	{
		id: 'sampling',
		title: '采样策略',
		content:
			'<p>最后要有一个策略来挑出下一个词元。常见的有几种：贪心搜索直接取最高的那个；<strong>Top-k</strong> 只保留可能性最大的 k 个词元；<strong>Top-p</strong> 保留最小的一组词元，使它们的概率之和刚好达到 p——提前把不太可能的都裁掉。</p><p>接着 softmax 把剩下的得分换算成概率，再从允许的集合里随机抽一个词元。</p>',
		on: function () {
			if (get(expandedBlock).id !== 'softmax') {
				expandedBlock.set({ id: 'softmax' });
				this.timeoutId = setTimeout(() => {
					highlightElements([
						'.formula-step.sampling',
						'.title-box.sampling',
						'.sampling-input',
						'.content-box.sampling'
					]);
				}, 500);
			} else {
				highlightElements([
					'.formula-step.sampling',
					'.title-box.sampling',
					'.sampling-input',
					'.content-box.sampling'
				]);
			}
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			removeHighlightFromElements([
				'.formula-step.sampling',
				'.title-box.sampling',
				'.sampling-input',
				'.content-box.sampling'
			]);
			if (!['temperature', 'sampling'].includes(get(textbookCurrentPageId)))
				expandedBlock.set({ id: null });
		},
		complete: () => {
			removeFingerFromElements(['.sampling-input']);
			if (get(textbookCurrentPageId) === 'sampling') {
				window.dataLayer?.push({
					user_id: get(userId),
					event: `textbook-complete`,
					page_id: 'sampling'
				});
			}
		}
	},
	{
		id: 'residual',
		title: '残差连接',
		content:
			'<p>Transformer 还有一些辅助设计来提升效果。比如<strong>残差连接</strong>会把某一层的输入直接加到它的输出上，这样信息经过很多层也不会被冲淡。在 GPT-2 里，每层会用到两次残差连接，深层网络才能顺利训练。</p>',
		on: function () {
			this.timeoutId = setTimeout(
				() => {
					highlightElements(['.operation-col.residual', '.residual-start']);
					drawLine();
				},
				get(isExpandOrCollapseRunning) ? 500 : 0
			);
		},
		out: function () {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = undefined;
			}
			removeHighlightFromElements(['.operation-col.residual', '.residual-start']);
			removeLine();
		}
	},
	{
		id: 'layer-normalization',
		title: '层归一化',
		content:
			'<p><strong>层归一化</strong>会把输入的数值调整到均值和方差都稳定的范围，让训练和推理都更稳定。这样模型对初始权重没那么敏感，也更容易学好。在 GPT-2 里，自注意力之前、MLP 之前，以及最后输出之前，都会做一次层归一化。</p>',
		on: () => {
			highlightElements(['.operation-col.ln']);
		},
		out: () => {
			removeHighlightFromElements(['.operation-col.ln']);
		}
	},
	{
		id: 'dropout',
		title: '丢弃法（Dropout）',
		content:
			'<p>训练的时候，<strong>丢弃法</strong>会随机关掉一部分数值之间的连接，避免模型死记硬背某些特定模式，从而学到更容易泛化的特征。GPT-2 用了它，但更新的模型往往不用，因为它们训练数据足够大、过拟合没那么严重。推理阶段不使用丢弃法。</p>',
		on: () => {
			highlightElements(['.operation-col.dropout']);
		},
		out: () => {
			removeHighlightFromElements(['.operation-col.dropout']);
		}
	}
	// {
	// 	id: 'final',
	// 	title: `Let's explore!`,
	// 	content: '',
	// 	on: () => {},
	// 	out: () => {}
	// }
];
