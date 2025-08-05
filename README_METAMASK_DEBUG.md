# MetaMask 连接问题解决指南

## 🔧 问题诊断和解决步骤

### 1. 使用调试工具
访问调试页面来快速诊断问题：
```
http://localhost:8080/debug.html
```

### 2. 常见问题和解决方案

#### ❌ 问题：MetaMask未安装
**解决方案：**
1. 访问 [https://metamask.io](https://metamask.io)
2. 下载并安装MetaMask浏览器扩展
3. 重启浏览器

#### ❌ 问题：钱包连接被拒绝
**解决方案：**
1. 点击MetaMask扩展图标
2. 确保钱包已解锁
3. 在弹出的连接请求中点击"连接"
4. 检查是否有阻止弹窗的设置

#### ❌ 问题：网络错误
**解决方案：**
1. 打开MetaMask
2. 点击网络下拉菜单
3. 选择正确的网络（建议使用Sepolia测试网络）
4. 如果看不到Sepolia，添加测试网络：
   - 网络名称: Sepolia
   - RPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   - 链 ID: 11155111
   - 符号: ETH

#### ❌ 问题：余额不足
**解决方案：**
1. 访问 [Sepolia Faucet](https://sepoliafaucet.com/)
2. 输入你的钱包地址获取测试ETH
3. 等待交易确认

### 3. 服务器启动检查

确保两个服务器都在运行：

```bash
# 后端服务器 (端口 3000)
cd backend
npm start

# 前端服务器 (端口 8080) 
python3 -m http.server 8080 --directory frontend
```

### 4. 浏览器设置

1. **启用开发者模式**：按F12打开开发者工具查看错误
2. **清除缓存**：Ctrl+Shift+R 强制刷新
3. **允许不安全内容**：如果使用HTTPS，确保允许混合内容

### 5. 测试流程

1. 访问调试页面：`http://localhost:8080/debug.html`
2. 检查所有诊断项目是否为绿色✅
3. 点击"连接MetaMask"
4. 点击"测试功能"验证所有功能正常
5. 然后访问主应用：`http://localhost:8080/index.html`

### 6. 常见错误代码

- `4001`: 用户拒绝连接
- `4100`: 请求的方法或账户未授权
- `4200`: 不支持的方法
- `-32603`: 内部错误

### 7. 获取帮助

如果问题仍然存在：
1. 截图错误信息
2. 打开浏览器开发者工具，查看Console标签中的错误
3. 检查Network标签确认API请求是否正常

## 🎯 快速解决方案

大多数问题可以通过以下步骤解决：
1. 刷新页面
2. 重启MetaMask
3. 重新连接钱包
4. 检查网络设置
5. 确保有足够的测试ETH 