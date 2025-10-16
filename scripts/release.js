#!/usr/bin/env node
/**
 * 自动发布脚本
 * 步骤：
 * 1. 校验工作区是否干净（除 node_modules 以外）
 * 2. 运行测试 (可跳过: --skip-tests)
 * 3. 构建 (tsc)
 * 4. 自动递增版本 (patch|minor|major) --bump=patch 默认 patch
 * 5. 写入 package.json version 并更新 CHANGELOG 头部 (若存在 Unreleased)
 * 6. git commit & tag (vX.Y.Z) & push
 * 7. npm publish (可 dry-run: --dry-run)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function parseArgs() {
  const args = process.argv.slice(2)
  const flags = { bump: 'patch', dryRun: false, skipTests: false, allowDirty: false }
  for (const a of args) {
    if (a.startsWith('--bump=')) flags.bump = a.split('=')[1]
    else if (a === '--dry-run') flags.dryRun = true
    else if (a === '--skip-tests') flags.skipTests = true
    else if (a === '--allow-dirty') flags.allowDirty = true
  }
  if (!['patch','minor','major'].includes(flags.bump)) {
    console.warn(`不支持的 bump 类型: ${flags.bump}, 使用 patch`) 
    flags.bump = 'patch'
  }
  return flags
}

function ensureCleanGit(allowDirty) {
  const status = execSync('git status --porcelain').toString().trim()
  if (status && !allowDirty) {
    console.error('工作区存在未提交更改，请先提交或使用 --allow-dirty 继续。')
    console.error(status)
    process.exit(1)
  }
  return status
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file,'utf-8'))
}
function writeJSON(file,obj) {
  fs.writeFileSync(file, JSON.stringify(obj,null,2)+"\n",'utf-8')
}

function bumpVersion(version, level) {
  const [maj, min, pat] = version.split('.').map(Number)
  if (level === 'major') return `${maj+1}.0.0`
  if (level === 'minor') return `${maj}.${min+1}.0`
  return `${maj}.${min}.${pat+1}`
}

function updateChangelog(newVersion) {
  const changelogPath = path.resolve('CHANGELOG.md')
  if (!fs.existsSync(changelogPath)) return
  let content = fs.readFileSync(changelogPath,'utf-8')
  // 如果存在 Unreleased 头，则替换
  content = content.replace(/##\s+0\.1\.10\s+\(Unreleased\)/, `## ${newVersion}`)
  fs.writeFileSync(changelogPath, content,'utf-8')
}

function main() {
  const { bump, dryRun, skipTests, allowDirty } = parseArgs()
  console.log('发布参数:', { bump, dryRun, skipTests, allowDirty })
  const dirtyStatus = ensureCleanGit(allowDirty)
  if (allowDirty && dirtyStatus) {
    // 自动添加所有变更方便快速打版
    run('git add .')
    run('git commit -m "chore: prepare release (allow-dirty)"')
  }
  const pkgPath = path.resolve('package.json')
  const pkg = readJSON(pkgPath)
  const oldVersion = pkg.version
  const newVersion = bumpVersion(oldVersion, bump)
  console.log(`版本号: ${oldVersion} -> ${newVersion}`)

  if (!skipTests) {
    run('npm test')
  } else {
    console.log('跳过测试 (--skip-tests)')
  }

  run('npm run build')

  pkg.version = newVersion
  writeJSON(pkgPath, pkg)
  updateChangelog(newVersion)

  run('git add package.json CHANGELOG.md lib')
  run(`git commit -m "chore: release v${newVersion}"`)
  run(`git tag v${newVersion}`)

  if (!dryRun) {
    run('git push')
    run('git push --tags')
    run('npm publish --access public')
  } else {
    console.log('Dry run 模式：跳过 push 与 npm publish')
  }

  console.log(`发布流程完成 v${newVersion}`)
}

main()