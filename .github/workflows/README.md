# GitHub Actions Workflows

这个仓库包含了多个优化的 GitHub Actions 工作流，用于自动化部署、监控和维护。

## 📋 工作流概览

### 1. 🚀 Deploy to GitHub Pages (`pages.yml`)
**主要功能**: 构建和部署网站到 GitHub Pages

**优化特性**:
- ✅ **智能缓存**: 使用 npm 缓存和 node_modules 缓存加速构建
- ✅ **多阶段构建**: 分离构建和部署阶段，提高可靠性
- ✅ **构建验证**: 检查构建输出和文件数量
- ✅ **性能监控**: 检查构建大小和过大文件
- ✅ **错误处理**: 完善的错误处理和状态通知
- ✅ **条件部署**: 只在 main 分支推送时部署

**触发条件**:
- 推送到 main 分支
- Pull Request 到 main 分支
- 手动触发

### 2. 🔍 Dependency Check & Security Audit (`dependency-check.yml`)
**主要功能**: 定期检查依赖更新和安全漏洞

**优化特性**:
- ✅ **自动检查**: 每周自动检查过时的依赖包
- ✅ **安全审计**: 运行 npm audit 检查安全漏洞
- ✅ **智能通知**: 自动创建 GitHub Issues 报告问题
- ✅ **详细报告**: 提供详细的漏洞信息和修复建议
- ✅ **报告存档**: 保存审计报告供后续分析

**触发条件**:
- 每周一凌晨 2 点自动运行
- package.json 文件变更时
- 手动触发

### 3. 📊 Performance & SEO Monitor (`performance-monitor.yml`)
**主要功能**: 监控网站性能和 SEO 指标

**优化特性**:
- ✅ **Lighthouse 审计**: 自动运行性能、可访问性、最佳实践和 SEO 检查
- ✅ **SEO 检查**: 验证 meta 标签、内部链接和图片优化
- ✅ **性能报告**: 生成详细的性能分析报告
- ✅ **PR 集成**: 在 Pull Request 中自动评论性能结果
- ✅ **定期监控**: 每周自动运行监控

**触发条件**:
- 每周三凌晨 3 点自动运行
- 推送到 main 分支时
- 手动触发

## 🛠️ 技术优化

### 缓存策略
```yaml
# npm 缓存
cache: 'npm'
cache-dependency-path: './src/package-lock.json'

# node_modules 缓存
key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 构建优化
```yaml
# 使用 npm ci 而不是 npm install
run: npm ci --prefer-offline --no-audit

# 设置生产环境
env:
  NODE_ENV: production
```

### 错误处理
```yaml
# 条件执行和错误处理
if: always()
run: |
  if [ "${{ job.status }}" == "success" ]; then
    echo "✅ Success"
  else
    echo "❌ Failed"
    exit 1
  fi
```

## 📈 性能指标

### 构建时间优化
- **缓存命中**: 减少 60-80% 的依赖安装时间
- **并行作业**: 独立的构建、部署和监控作业
- **智能触发**: 只在必要时运行完整流程

### 资源使用优化
- **Artifact 管理**: 自动清理过期的构建产物
- **条件执行**: 避免不必要的作业运行
- **资源限制**: 合理设置缓存和存储策略

## 🔧 配置说明

### 环境变量
```yaml
env:
  NODE_VERSION: '20'
  CACHE_KEY: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 权限设置
```yaml
permissions:
  pages: write
  id-token: write
  contents: read
```

### 条件执行
```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

## 🚨 故障排除

### 常见问题

1. **缓存失效**
   - 检查 package-lock.json 是否变更
   - 验证缓存键是否正确

2. **构建失败**
   - 检查 Node.js 版本兼容性
   - 验证依赖包是否正确安装

3. **部署失败**
   - 确认 GitHub Pages 权限设置
   - 检查构建产物是否正确生成

### 调试命令
```bash
# 本地测试构建
cd src && npm ci && npm run build

# 检查缓存状态
npm cache verify

# 清理缓存
npm cache clean --force
```

## 📝 维护指南

### 定期维护任务
1. **更新依赖**: 每月检查并更新过时的包
2. **安全审计**: 及时修复安全漏洞
3. **性能监控**: 关注 Lighthouse 分数变化
4. **工作流优化**: 根据使用情况调整配置

### 监控指标
- 构建时间
- 缓存命中率
- 部署成功率
- 性能分数
- 安全漏洞数量

---

*最后更新: 2024年1月*
