<script>
	import tailwindConfig from '../../../tailwind.config';
	import resolveConfig from 'tailwindcss/resolveConfig';
	import Katex from '~/utils/Katex.svelte';
</script>

<div id="description">
	<div class="article-section" data-click="article-intro">
		<h1>什么是 Transformer？</h1>

		<p>
			Transformer 是一种神经网络架构，它从根本上改变了人工智能的做法。Transformer 最早出现在 2017
			年的那篇开创性论文
			<a
				href="https://dl.acm.org/doi/10.5555/3295222.3295349"
				title="ACM Digital Library"
				target="_blank">《Attention is All You Need》</a
			>
			中，此后成为深度学习模型的首选架构，支撑起 OpenAI 的 <strong>GPT</strong>、Meta 的
			<strong>Llama</strong>、Google 的 <strong>Gemini</strong> 这类文本生成模型。除了文字，Transformer
			也被用在
			<a
				href="https://huggingface.co/learn/audio-course/en/chapter3/introduction"
				title="Hugging Face"
				target="_blank">音频生成</a
			>、
			<a
				href="https://huggingface.co/learn/computer-vision-course/unit3/vision-transformers/vision-transformers-for-image-classification"
				title="Hugging Face"
				target="_blank">图像识别</a
			>、
			<a href="https://elifesciences.org/articles/82819" title="eLife">蛋白质结构预测</a>，甚至
			<a
				href="https://www.deeplearning.ai/the-batch/reinforcement-learning-plus-transformers-equals-efficiency/"
				title="Deep Learning AI"
				target="_blank">下棋打游戏</a
			>上，足见它在众多领域都能通用。
		</p>
		<p>
			说到底，文本生成类 Transformer 模型的原理就是<strong>预测下一个词元</strong
			>：给定用户输入的一段文字，紧跟其后的<em>最可能的那个词元（一个词，或者词的一部分）</em>是什么？
			Transformer 真正的创新和威力来自它对自注意力机制的使用——这使它能够一次处理整段序列，
			比以往任何架构都更有效地捕捉长距离的依赖关系。
		</p>
		<p>
			GPT-2 系列模型是文本生成类 Transformer 的典型代表。本页的 Transformer Explainer 由
			<a href="https://huggingface.co/openai-community/gpt2" title="Hugging Face" target="_blank"
				>GPT-2</a
			>
			（small）驱动，它共有 1.24 亿个参数。它既不是最新的、也不是最强的 Transformer 模型，但它和当今
			最先进的模型共享大量相同的架构组件与原理，因此是理解基础原理的理想起点。
		</p>
	</div>

	<div class="article-section" data-click="article-overview">
		<h1>Transformer 的整体结构</h1>

		<p>每一个文本生成类 Transformer 都由这<strong>三个关键部分</strong>组成：</p>
		<ol>
			<li>
				<strong class="bold-purple">词向量（Embedding）</strong>：输入的文字先被切成更小的单元，
				也就是词元，它可能是一个词，也可能是词的一部分。这些词元再被换算成数字向量（也就是词向量），
				用来承载词的含义。
			</li>
			<li>
				<strong class="bold-purple">Transformer 层</strong
				>是模型中最基本的处理单元，负责处理并变换输入数据。每一层都包含：
				<ul class="">
					<li>
						<strong>注意力机制</strong>，Transformer 层的核心。它让词元之间能够互相通信，
						从而捕捉上下文信息以及词与词之间的关系。
					</li>
					<li>
						<strong>MLP（多层感知机）层</strong>，一个对每个词元独立运算的前馈网络。
						注意力的目标是在词元之间传递信息，而 MLP 的目标是提炼每个词元自己的表示。
					</li>
				</ul>
			</li>
			<li>
				<strong class="bold-purple">输出概率</strong>：最后的线性层和 softmax 层把处理好的向量
				换算成概率，模型据此对序列中的下一个词元作出预测。
			</li>
		</ol>
	</div>

	<div class="article-section" id="embedding" data-click="article-embedding">
		<h2>词向量（Embedding）</h2>
		<p>
			假设你想让 Transformer 模型生成文字，于是输入这样一句提示：<code>“Data visualization empowers users to”</code>。
			这个输入必须先变成模型能看懂、能处理的格式——这就是词向量登场的地方：它把文字转换成模型可以运算的数值表示。
			要把一句提示变成词向量，需要依次做四件事：1）分词，2）取得词元向量，3）加上位置信息，4）把词元向量和位置编码相加，
			得到最终的词向量。下面我们逐步来看。
		</p>
		<div class="figure">
			<img src="./article_assets/embedding.png" width="65%" />
		</div>
		<div class="figure-caption">
			图 <span class="attention">1</span>。展开词向量层的视图，展示输入的提示如何被转换成向量表示。
			整个过程包括 <span class="fig-numbering">(1)</span> 分词、(2) 词元向量、(3) 位置编码、(4) 最终词向量。
		</div>
		<div class="article-subsection">
			<h3>第 1 步：分词</h3>
			<p>
				分词就是把输入的文字拆成一个个更小、更好处理的片段，也就是词元。词元可以是一个完整的词，也可以是词的一部分。
				比如 <code>"Data"</code> 和 <code>"visualization"</code> 各自对应一个词元，而
				<code>"empowers"</code> 会被拆成两个词元。整个词表在训练模型之前就已经定好：GPT-2 的词表有
				<code>21,128</code> 个词元。把输入拆成带编号的词元之后，就可以从词向量里取出它们对应的向量表示了。
			</p>
		</div>
		<div class="article-subsection" id="article-token-embedding">
			<h3>第 2 步：词元向量</h3>
			<p>
				GPT-2（small）把词表里的每个词元都表示成一个 768 维的向量，具体维度取决于模型。这些向量存在一个形状为
				<code>(21,128, 768)</code> 的矩阵里，大约包含 1,600 万个参数！正是这张庞大的矩阵让模型能够给每个词元赋予语义，
				也就是说：用法或含义相近的词元，在这个高维空间里彼此靠得很近，而不相似的词元则离得较远。
			</p>
		</div>
		<div class="article-subsection" id="article-positional-embedding">
			<h3>第 3 步：位置编码</h3>
			<p>
				词向量层还编码了每个词元在输入提示中的位置信息。不同模型使用不同的位置编码方法。
				GPT-2 自己从零训练出一张位置编码矩阵，直接把它整合进训练过程。
			</p>

			<!-- <div class="article-subsection-l2">
	<h4>Alternative Positional Encoding Approach <strong class='attention'>[POTENTIALLY COLLAPSIBLE]</strong></h4>
	<p>
	  Other models, like the original Transformer and BERT,
	  use sinusoidal functions for positional encoding.

	  This sinusoidal encoding is deterministic and designed to reflect
	  the absolute as well as the relative position of each token.
	</p>
	<p>
	  Each position in a sequence is assigned a unique mathematical
	  representation using a combination of sine and cosine functions.

	  For a given position, the sine function represents even dimensions,
	  and the cosine function represents odd dimensions within the positional encoding vector.

	  This periodic nature ensures that each position has a consistent encoding,
	  independent of the surrounding context.
	</p>

	<p>
	  Here’s how it works:
	</p>

	<span class='attention'>
	  SINUSOIDAL POSITIONAL ENCODING EQUATION
	</span>

	<ul>
	  <li>
		<strong>Sine Function</strong>: Used for even indices of the embedding vector.
	  </li>
	  <li>
		<strong>Cosine Function</strong>: Used for odd indices of the embedding vector.
	</ul>

	<p>
	  Hover over individual encoding values in the matrix above to
	  see how it's calculated using the sins and cosine functions.
	</p>
  </div> -->
		</div>
		<div class="article-subsection">
			<h3>第 4 步：最终词向量</h3>
			<p>
				最后，把词元向量和位置编码相加，就得到最终的词向量表示。这个合成后的表示既包含词元的语义，
				也包含它在输入序列中的位置。
			</p>
		</div>
	</div>

	<div class="article-section" data-click="article-transformer-block">
		<h2>Transformer 层</h2>

		<p>
			Transformer 处理数据的核心在于 Transformer 层，它由多头自注意力和一个多层感知机（MLP）组成。
			大多数模型都会把很多个这样的层依次堆叠起来。词元的表示会一层层地演化，从第一层一直到最后一层，
			模型因此逐步积累起对每个词元的细致理解。这种分层的方式让输入获得了更高阶的表示。
			我们正在观察的 GPT-2（small）模型就有 <code>12</code> 个这样的层。
		</p>
	</div>

	<div class="article-section" id="self-attention" data-click="article-attention">
		<h3>多头自注意力</h3>
		<p>
			自注意力机制让模型能够捕捉序列中词元之间的关系，于是每个词元的表示都会受到其他词元的影响。
			多个注意力头则让模型能从不同角度考察这些关系；比如某一个头可能关注近距离的语法关联，
			另一个头则在追踪更大范围的语义上下文。接下来我们一步步拆解多头自注意力是怎么算出来的。
		</p>
		<div class="article-subsection-l2">
			<h4>第 1 步：查询、键、值矩阵</h4>

			<div class="figure pt-10">
				<img src="./article_assets/QKV.png" width="80%" />
				<div class="text-xs">
					<Katex
						displayMode
						math={`
		QKV_{ij} = ( \\sum_{d=1}^{768} \\text{Embedding}_{i,d} \\cdot \\text{Weights}_{d,j}) + \\text{Bias}_j
		`}
					/>
				</div>
			</div>
			<div class="figure-caption">
				图 <span class="attention">2</span>。由原始词向量计算得到查询、键、值矩阵。
			</div>

			<p>
				每个词元的向量都会被变换成三组向量：
				<span class="q-color">查询 Query（Q）</span>、
				<span class="k-color">键 Key（K）</span>和
				<span class="v-color">值 Value（V）</span>。做法是把输入的词向量矩阵分别乘上三组学好的权重矩阵，
				得到 <span class="q-color">Q</span>、<span class="k-color">K</span>、<span class="v-color">V</span>。
				这里可以用"搜索引擎"来打比方，帮助我们建立直觉：
			</p>
			<ul>
				<li>
					<strong class="q-color font-medium">查询 Query（Q）</strong>就是你在搜索框里敲下的关键词。
					它代表"你想去<em>了解更多信息</em>"的那个词元。
				</li>
				<li>
					<strong class="k-color font-medium">键 Key（K）</strong>是搜索结果里每个网页的标题。
					它代表查询可以关注的候选词元。
				</li>
				<li>
					<strong class="v-color font-medium">值 Value（V）</strong>是网页的实际内容。当我们把搜索词（Query）
					和相关的搜索结果（Key）对上之后，真正想要取回的是最相关那几个网页的内容（Value）。
				</li>
			</ul>
			<p>
				有了这三组 QKV 向量，模型就能算出注意力得分，得分决定了生成预测时每个词元应该得到多少关注。
			</p>
		</div>
		<div class="article-subsection-l2">
			<h4>第 2 步：拆分成多个头</h4>
			<p>
				<span class="q-color">查询</span>、<span class="k-color">键</span>和
				<span class="v-color">值</span>
				向量会被拆成多个头——在 GPT-2（small）里是 <code>12</code> 个头。每个头独立处理词向量的一部分，
				分别捕捉不同的语法和语义关系。这样的设计让模型可以并行地学习多种语言特征，表示能力也更强。
			</p>
		</div>
		<div class="article-subsection-l2">
			<h4>第 3 步：带掩码的自注意力</h4>
			<p>
				在每个头里，我们做的是带掩码的自注意力计算。这个机制让模型在生成序列时，可以把注意力放在输入中相关的部分，
				同时又无法接触到未来的词元。
			</p>

			<div class="figure">
				<img src="./article_assets/attention.png" width="80%" align="middle" />
			</div>
			<div class="figure-caption">
				图 <span class="attention">3</span>。用查询、键、值矩阵计算带掩码的自注意力。
			</div>

			<ul>
				<li>
					<strong>点积</strong>：把<span class="q-color">查询</span>矩阵和
					<span class="k-color">键</span>矩阵做点积，得到<strong>注意力得分</strong>，
					结果是一个方阵，反映所有输入词元两两之间的关系。
				</li>
				<li>
					<strong>缩放 · 掩码</strong>：先对注意力得分做缩放，再把注意力矩阵的上三角遮住，
					也就是把这些位置设成负无穷，从而阻止模型接触未来的词元。
					模型必须学会在不"偷看"未来的前提下预测下一个词元。
				</li>
				<li>
					<strong>Softmax · 丢弃法</strong>：掩码和缩放之后，用 softmax 把注意力得分换算成概率，
					然后可以选择性地用丢弃法做正则化。矩阵每一行加起来等于 1，表示它左边每个词元与它的相关程度。
				</li>
			</ul>
		</div>
		<div class="article-subsection-l2">
			<h4>第 4 步：输出与拼接</h4>
			<p>
				模型把带掩码的自注意力得分与<span class="v-color">值</span>矩阵相乘，
				得到自注意力机制的<span class="purple-color">最终输出</span>。GPT-2 有 <code>12</code>
				个自注意力头，每个头捕捉词元之间不同的关系。这些头的输出会被拼接起来，再经过一次线性投影。
			</p>
		</div>
	</div>

	<div class="article-section" id="article-activation" data-click="article-mlp">
		<h3>MLP：多层感知机</h3>

		<div class="figure">
			<img src="./article_assets/mlp.png" width="70%" align="middle" />
		</div>
		<div class="figure-caption">
			图 <span class="attention">4</span>。用 MLP 层把自注意力的表示投影到更高维的空间，
			以增强模型的表示能力。
		</div>

		<p>
			自注意力的多个头捕捉到输入词元之间各种各样的关系之后，拼接好的输出会送进多层感知机（MLP）层，
			进一步增强模型的表示能力。MLP 由两次线性变换组成，中间夹一个
			<a
				href="https://en.wikipedia.org/wiki/Rectified_linear_unit#Gaussian-error_linear_unit_(GELU)"
				>GELU</a
			> 激活函数。
		</p>
		<p>
			第一次线性变换把输入的维度扩大四倍，从 <code>768</code> 变成 <code>3072</code>。
			这一步扩展让模型能把词元的表示投影到更高维的空间，从而捕捉到原来维度里看不见的更丰富、更复杂的模式。
		</p>
		<p>
			第二次线性变换再把维度压回原来的 <code>768</code>。这一步压缩把表示收回一个可控的大小，
			同时保留扩展步骤中引入的有用非线性变换。
		</p>
		<p>
			和跨词元整合信息的自注意力不同，MLP 对每个词元独立处理，只是把每个词元的表示从一个空间映射到另一个空间，
			从而提升模型的整体能力。
		</p>
	</div>

	<div class="article-section" id="article-prob" data-click="article-prob">
		<h2>输出概率</h2>
		<p>
			输入走完全部 Transformer 层之后，输出会经过最后那个线性层，为预测词元做好准备。这一层把最终的表示
			投影到 <code>21,128</code> 维的空间里，词表中的每个词元都对应一个数值，这个数值叫作
			<code>得分（logit）</code>。任何一个词元都可能是下一个词，于是这一步就等于给所有词元按"成为下一个词"
			的可能性排了个序。接着我们用 softmax 函数把得分换算成加起来等于 1 的概率分布，
			这样就可以按可能性来采样下一个词元了。
		</p>

		<div class="figure py-5">
			<img src="./article_assets/softmax.png" width="70%" />
		</div>
		<div class="figure-caption">
			图 <span class="attention">5</span>。词表中的每个词元都会根据模型的输出得分得到一个概率。
			这些概率决定了每个词元成为序列中下一个词的可能性。
		</div>

		<p id="article-temperature" data-click="article-temperature">
			最后一步是从这个分布里采样，生成下一个词元。<code>温度</code>这个超参数在此过程中起着关键作用。
			从数学上说，这个操作非常简单：把模型输出的得分除以<code>温度</code>就行：
		</p>

		<ul>
			<li><code>温度 = 1</code>：除以 1 不改变任何东西，softmax 的输出保持不变。</li>
			<li>
				<code>温度 &lt; 1</code>：温度越低，概率分布越尖锐，模型越自信、越确定，输出也越好预测。
			</li>
			<li>
				<code>温度 &gt; 1</code>：温度越高，概率分布越平缓，生成结果里的随机性越强——也就是大家常说的模型<em>"创造力"</em>。
			</li>
		</ul>

		<p id="article-sampling" data-click="article-sampling">
			另外，采样过程还可以用 <code>top-k</code> 和 <code>top-p</code> 两个参数进一步控制：
		</p>
		<ul>
			<li>
				<code>top-k 采样</code>：只保留概率最高的 k 个词元作为候选，把不太可能的选项直接过滤掉。
			</li>
			<li>
				<code>top-p 采样</code>：从概率最高的词元开始累加，取到累计概率刚超过阈值 p 的最小集合，
				这样只有最可能的那些词元参与采样，同时又保留了一定的多样性。
			</li>
		</ul>
		<p>
			调节 <code>温度</code>、<code>top-k</code> 和 <code>top-p</code>，就能在"确定"与"多样"之间找平衡，
			让模型的表现符合你的具体需要。
		</p>
	</div>

	<div class="article-section" data-click="article-advanced-features">
		<h2>辅助架构设计</h2>

		<p>
			Transformer 模型还有几处辅助性的架构设计，用来提升整体表现。它们对模型的最终效果很重要，
			但对理解架构的核心概念来说没那么关键。层归一化、丢弃法和残差连接都是 Transformer 里的重要组件，
			尤其在训练阶段。层归一化让训练更稳定、收敛更快；丢弃法通过随机停用神经元来防止过拟合；
			残差连接让梯度可以直接流过网络，有助于缓解梯度消失问题。
		</p>
		<div class="article-subsection" id="article-ln">
			<h3>层归一化</h3>

			<p>
				层归一化能让训练过程更稳定，也更容易收敛。它的做法是在特征维度上对输入做归一化，
				保证各个激活值的均值和方差保持一致。这种归一化缓解了内部协变量偏移带来的问题，
				让模型学得更有效，也降低了它对初始权重的敏感度。每个 Transformer 层里会做两次层归一化：
				自注意力之前一次，MLP 之前一次。
			</p>
		</div>
		<div class="article-subsection" id="article-dropout">
			<h3>丢弃法（Dropout）</h3>

			<p>
				丢弃法是一种正则化技术，用来防止神经网络过拟合：训练时随机把一部分模型权重置零。
				这会促使模型学到更稳健的特征，减少对特定神经元的依赖，从而在面对没见过的新数据时泛化得更好。
				推理阶段不使用丢弃法，这相当于我们在使用许多训练过的子网络组成的集成，效果反而更好。
			</p>
		</div>
		<div class="article-subsection" id="article-residual">
			<h3>残差连接</h3>

			<p>
				残差连接最早出现在 2015 年的 ResNet 模型中，这一架构创新让训练极深的神经网络成为可能，
				彻底改变了深度学习。说到底，残差连接就是一条绕过一层或多层的"捷径"，把某一层的输入直接加到输出上。
				这有助于缓解梯度消失问题，让层层堆叠的 Transformer 更容易训练。在 GPT-2 里，
				每个 Transformer 层内部会用到两次残差连接：MLP 之前一次、之后一次，
				从而保证梯度更顺畅地流动，反向传播时靠前的层也能得到足够的更新。
			</p>
		</div>
	</div>

	<div class="article-section" data-click="article-interactive-features">
		<h1>交互功能</h1>
		<p>Transformer Explainer 从一开始就是按交互式设计的，让你可以亲手探索 Transformer 的内部运作。
			下面这些交互功能都可以试玩：
		</p>

		<ul>
			<li>
				<strong>输入你自己的句子</strong>，看看模型怎么处理它、又怎么预测下一个词。你可以查看注意力权重、
				中间各步的计算结果，以及最后的输出概率是怎么算出来的。
			</li>
			<li>
				<strong>拖动温度滑块</strong>，控制模型预测的随机程度。试着改变温度，看看输出怎么变得更确定、或者更有创意。
			</li>
			<li>
				<strong>选择 top-k 与 top-p 采样方式</strong>，调整推理时的采样行为。换几个不同的数值，
				观察概率分布如何变化、又如何影响模型的预测。
			</li>
			<li>
				<strong>和注意力图互动</strong>，看看模型把注意力放在输入序列的哪些词元上。把鼠标移到词元上
				就能高亮它的注意力权重，观察模型如何捕捉上下文和词与词之间的关系。
			</li>
		</ul>
	</div>

	<div class="article-section" data-click="article-video">
		<h2>视频讲解</h2>
		<div class="video-container">
			<iframe
				src="https://www.youtube.com/embed/ECR4oAwocjs"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			>
			</iframe>
		</div>
	</div>

	<div class="article-section" data-click="article-implementation">
		<h2>Transformer Explainer 是怎么实现的？</h2>
		<p>
			Transformer Explainer 里跑着一个真实的 GPT-2（small）模型，就直接在浏览器里运行。这个模型源自
			Andrej Karpathy 的
			<a href="https://github.com/karpathy/nanoGPT" title="Github" target="_blank">nanoGPT 项目</a>
			中的 PyTorch 版 GPT 实现，
			并被转换成
			<a href="https://onnxruntime.ai/" title="ONNX" target="_blank">ONNX Runtime</a>
			格式，以便在浏览器里顺畅执行。界面用 JavaScript 编写，前端框架是
			<a href="https://kit.svelte.dev/" title="Svelte" target="_blank">Svelte</a>，
			动态可视化则由
			<a href="https://d3js.org/" title="D3" target="_blank">D3.js</a>
			完成。所有数值都会随你的输入实时更新。
		</p>
	</div>

	<div class="article-section" data-click="article-credit">
		<h2>Transformer Explainer 是谁做的？</h2>
		<p>
			Transformer Explainer 由佐治亚理工学院的

			<a href="https://aereeeee.github.io/" target="_blank">Aeree Cho</a>,
			<a href="https://www.linkedin.com/in/chaeyeonggracekim/" target="_blank">Grace C. Kim</a>,
			<a href="https://alexkarpekov.com/" target="_blank">Alexander Karpekov</a>,
			<a href="https://alechelbling.com/" target="_blank">Alec Helbling</a>,
			<a href="https://zijie.wang/" target="_blank">Jay Wang</a>,
			<a href="https://seongmin.xyz/" target="_blank">Seongmin Lee</a>,
			<a href="https://bhoov.com/" target="_blank">Benjamin Hoover</a>, and
			<a href="https://poloclub.github.io/polochau/" target="_blank">Polo Chau</a>
			等人共同开发。
		</p>
	</div>
</div>

<style lang="scss">
	a {
		color: theme('colors.blue.500');

		&:hover {
			color: theme('colors.blue.700');
		}
	}

	.bold-purple {
		color: theme('colors.purple.700');
		font-weight: bold;
	}

	code {
		color: theme('colors.gray.500');
		background-color: theme('colors.gray.50');
		font-family: theme('fontFamily.mono');
	}

	.q-color {
		color: theme('colors.blue.400');
	}

	.k-color {
		color: theme('colors.red.400');
	}

	.v-color {
		color: theme('colors.green.400');
	}

	.purple-color {
		color: theme('colors.purple.500');
	}

	.article-section {
		padding-bottom: 2rem;
	}
	.architecture-section {
		padding-top: 1rem;
	}
	.video-container {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
		overflow: hidden;
		max-width: 100%;
		background: #000;
	}

	.video-container iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	#description {
		padding-bottom: 3rem;
		margin-left: auto;
		margin-right: auto;
		max-width: 78ch;
	}

	#description h1 {
		color: theme('colors.purple.700');
		font-size: 2.2rem;
		font-weight: 300;
		padding-top: 1rem;
	}

	#description h2 {
		// color: #444;
		color: theme('colors.purple.700');
		font-size: 2rem;
		font-weight: 300;
		padding-top: 1rem;
	}

	#description h3 {
		color: theme('colors.gray.700');
		font-size: 1.6rem;
		font-weight: 200;
		padding-top: 1rem;
	}

	#description h4 {
		color: theme('colors.gray.700');
		font-size: 1.6rem;
		font-weight: 200;
		padding-top: 1rem;
	}

	#description p {
		margin: 1rem 0;
	}

	#description p img {
		vertical-align: middle;
	}

	#description .figure-caption {
		font-size: 0.8rem;
		margin-top: 0.5rem;
		text-align: center;
		margin-bottom: 2rem;
	}

	#description ol {
		margin-left: 3rem;
		list-style-type: decimal;
	}

	#description li {
		margin: 0.6rem 0;
	}

	#description p,
	#description div,
	#description li {
		color: theme('colors.gray.600');
		line-height: 1.6;
	}

	#description small {
		font-size: 0.8rem;
	}

	#description ol li img {
		vertical-align: middle;
	}

	#description .video-link {
		color: theme('colors.blue.600');
		cursor: pointer;
		font-weight: normal;
		text-decoration: none;
	}

	#description ul {
		list-style-type: disc;
		margin-left: 2.5rem;
		margin-bottom: 1rem;
	}

	#description a:hover,
	#description .video-link:hover {
		text-decoration: underline;
	}

	.figure,
	.video {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
