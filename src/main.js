const app = document.getElementById("app");

app.innerHTML = `
  <h1 class="page-title">币安Alpha项目列表</h1>
  <button id="testNotification" class="test-btn">测试通知</button>
  <div class="chain-tabs"></div>
  <div id="list">加载中...</div>
`;

// 添加音频元素
const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// 存储上一次的数据用于比较
let previousData = new Set();

// 添加分页相关变量
let currentChain = null;
let chainTabs = null;
function proxyImage(url) {
    // 使用现成的图片代理服务：images.weserv.nl
    return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`;
}
async function fetchAndRender() {
    const res = await fetch(
        "https://www.binance.com/bapi/asset/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list"
    );
    const json = await res.json();
    const data = json.data || [];

    // 检查新项目
    const currentData = new Set();
    data.forEach(token => {
        if (token.onlineAirdrop || token.onlineTge) {
            currentData.add(`${token.symbol}-${token.onlineAirdrop ? 'airdrop' : 'tge'}`);
        }
    });

    // 如果有新项目，播放提示音
    if (previousData.size > 0) {
        const newItems = [...currentData].filter(item => !previousData.has(item));
        if (newItems.length > 0) {
            audio.play().catch(err => console.log('播放提示音失败:', err));
        }
    }

    // 更新previousData
    previousData = currentData;

    const grouped = {};
    data.forEach((token) => {
        if (!grouped[token.chainName]) grouped[token.chainName] = [];
        grouped[token.chainName].push(token);
    });

    // 创建分页栏
    const tabsContainer = document.querySelector('.chain-tabs');
    // 只在第一次加载时创建标签
    if (!tabsContainer.children.length) {
        Object.keys(grouped).forEach((chain, index) => {
            const tab = document.createElement('button');
            tab.className = `chain-tab ${index === 0 ? 'active' : ''}`;
            // 获取该链的第一个token的chainIconUrl
            const chainIcon = grouped[chain][0]?.chainIconUrl;
            // 添加项目数量显示和图标
            tab.innerHTML = `
                ${chainIcon ? `<img src="${proxyImage(chainIcon)}" class="chain-icon" alt="${chain}">` : ''}
                ${chain} <span class="token-count">(${grouped[chain].length})</span>
            `;
            tab.onclick = () => switchChain(chain);
            tabsContainer.appendChild(tab);
        });
    } else {
        // 更新现有标签的项目数量
        Object.keys(grouped).forEach(chain => {
            const tab = Array.from(tabsContainer.children).find(t => t.textContent.includes(chain));
            if (tab) {
                const isActive = tab.classList.contains('active');
                const chainIcon = grouped[chain][0]?.chainIconUrl;
                tab.innerHTML = `
                    ${chainIcon ? `<img src="${proxyImage(chainIcon)}" class="chain-icon" alt="${chain}">` : ''}
                    ${chain} <span class="token-count">(${grouped[chain].length})</span>
                `;
                if (isActive) {
                    tab.classList.add('active');
                }
            }
        });
    }

    // 默认显示第一个链
    if (!currentChain) {
        currentChain = Object.keys(grouped)[0];
    }

    // 渲染当前选中的链的数据
    renderChainData(currentChain, grouped[currentChain]);

    // 在渲染完成后更新时间
    updateLastRefreshTime();
}

// 切换链的函数
function switchChain(chain) {
    currentChain = chain;
    
    // 更新分页按钮状态
    document.querySelectorAll('.chain-tab').forEach(tab => {
        const isCurrentChain = tab.textContent.startsWith(chain);
        tab.classList.toggle('active', isCurrentChain);
    });

    // 重新渲染数据
    fetchAndRender();
}

// 渲染单个链的数据
function renderChainData(chain, tokens) {
    const container = document.getElementById("list");
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "token-grid";

    tokens.forEach((t) => {
        const change = parseFloat(t.percentChange24h);
        const shortAddress = `${t.contractAddress.slice(0, 6)}...${t.contractAddress.slice(-6)}`;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
      <div class="token-title">
        <a href="https://www.binance.com/en/alpha/${t.chainName.toLowerCase()}/${t.contractAddress}" 
           class="token-link ${t.listingCex ? 'listed' : ''}" 
           target="_blank" 
           rel="noopener noreferrer">
          <img src="${proxyImage(t.iconUrl)}" width="20" height="20" />
          ${t.name} (${t.symbol})
        </a>
        ${t.onlineAirdrop ? '<span class="token-badge">空投</span>' : ''}
        ${t.onlineTge ? '<span class="token-badge tge-badge">TGE</span>' : ''}
      </div>
      <div class="token-info">
        <div>价格：$${parseFloat(t.price).toFixed(4)}</div>
        <div class="${change >= 0 ? 'price-change-pos' : 'price-change-neg'}">
          24h涨跌：${t.percentChange24h}%
        </div>
        <div>持有人数：${t.holders.toLocaleString()}</div>
        <div>24h成交量：$${parseFloat(t.volume24h).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}</div>
        <div class="contract-address">
          合约地址：${shortAddress}
          <button class="copy-btn" data-address="${t.contractAddress}" title="复制完整地址">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
        grid.appendChild(card);
    });

    // 添加复制功能
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const address = e.currentTarget.dataset.address;
            try {
                await navigator.clipboard.writeText(address);
                const originalTitle = btn.getAttribute('title');
                btn.setAttribute('title', '已复制！');
                setTimeout(() => {
                    btn.setAttribute('title', originalTitle);
                }, 2000);
            } catch (err) {
                console.error('复制失败:', err);
            }
        });
    });

    container.appendChild(grid);
}

// 初始加载
fetchAndRender();

// 设置30秒定时刷新
setInterval(fetchAndRender, 10*1000);

// 添加刷新时间显示
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const timeElement = document.createElement('div');
    timeElement.className = 'refresh-time';
    timeElement.textContent = `最后更新: ${timeString}`;
    
    const existingTime = document.querySelector('.refresh-time');
    if (existingTime) {
        existingTime.remove();
    }
    document.getElementById('app').appendChild(timeElement);
}

// 请求通知权限
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('通知权限已获取');
        }
    } catch (err) {
        console.log('请求通知权限失败:', err);
    }
}

// 在页面加载时请求通知权限
requestNotificationPermission();

// 添加测试通知功能
document.getElementById('testNotification').addEventListener('click', async () => {
    // 播放提示音
    try {
        await audio.play();
    } catch (err) {
        console.log('播放提示音失败:', err);
    }
    
    // 发送浏览器通知
    if (Notification.permission === 'granted') {
        new Notification('测试通知', {
            body: '这是一条测试通知消息',
            icon: 'https://bin.bnbstatic.com/image/admin_mgs_image_upload/20250228/d0216ce4-a3e9-4bda-8937-4a6aa943ccf2.png'
        });
    } else {
        alert('请先允许通知权限');
        requestNotificationPermission();
    }
});
