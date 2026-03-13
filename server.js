#!/usr/bin/env node
/**
 * 台球练习助手 - URL 回调版本
 * 
 * 按钮点击后跳转到回调页面，处理完再发消息给用户
 */

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const url = require('url');

const app = express();
app.use(bodyParser.json());

// 配置
const APP_ID = process.env.APP_ID || 'cli_a918b4b7de78dbc8';
const APP_SECRET = process.env.APP_SECRET || 'v7EMLRiBMGI8DkuWd5W3aeL4Dzhvg7BA';
const USER_ID = process.env.USER_ID || 'ou_433e5534d9e9e75189e13a82f1491a76';
const BASE_URL = process.env.BASE_URL || 'https://table-tennis-tutor-production.up.railway.app';

// 导入主逻辑
const { loadProgress, saveProgress, getCurrentLesson, getLessonCard, getConfirmCard, getProgressCard, LESSONS } = require('./lib.js');

let cachedToken = null;
let tokenExpireTime = 0;

// 获取 token
async function getTenantAccessToken() {
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken;
  }
  const response = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: APP_ID, app_secret: APP_SECRET }
  );
  cachedToken = response.data.tenant_access_token;
  tokenExpireTime = Date.now() + 1.5 * 60 * 60 * 1000;
  return cachedToken;
}

// 发送卡片
async function sendCard(targetId, card) {
  const token = await getTenantAccessToken();
  await axios.post(
    'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
    {
      receive_id: targetId,
      msg_type: 'interactive',
      content: JSON.stringify(card)
    },
    { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' } }
  );
}

// 发送文本
async function sendText(targetId, text) {
  const token = await getTenantAccessToken();
  await axios.post(
    'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
    {
      receive_id: targetId,
      msg_type: 'text',
      content: JSON.stringify({ text })
    },
    { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' } }
  );
}

// 生成回调 URL
function makeCallbackUrl(action, lessonId) {
  return `${BASE_URL}/callback?action=${action}&lesson=${lessonId}`;
}

// 飞书验证 URL
app.get('/webhook', (req, res) => {
  const { challenge } = req.query;
  if (challenge) res.send(challenge);
  else res.send('OK');
});

// 回调处理页面
app.get('/callback', async (req, res) => {
  const { action, lesson } = req.query;
  console.log(`🎯 收到回调: action=${action}, lesson=${lesson}`);
  
  try {
    const progress = loadProgress();
    let responseText = '';
    
    if (action === 'complete') {
      // 用户点击"完成本课"
      const card = getConfirmCard(progress.currentLesson);
      await sendCard(USER_ID, card);
      responseText = '已发送确认卡片！';
    }
    else if (action === 'confirm_complete') {
      // 用户点击"确认完成"
      progress.totalCompleted++;
      if (progress.currentLesson < LESSONS.length) {
        progress.currentLesson++;
      }
      saveProgress(progress);
      
      await sendText(USER_ID, '🎉 太棒了！练习完成！\n\n继续加油～\n\n');
      
      const nextLesson = getCurrentLesson(progress);
      const card = getLessonCard(nextLesson);
      await sendCard(USER_ID, card);
      responseText = `已进入下一课：${nextLesson.title}`;
    }
    else if (action === 'later') {
      await sendText(USER_ID, '好的，随时想说"完成"的时候叫我～');
      responseText = '已发送提醒消息';
    }
    
    // 返回成功页面
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>台球练习助手</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 display: flex; justify-content: center; align-items: center; min-height: 100vh; 
                 margin: 0; background: #f5f5f7; }
          .card { background: white; padding: 40px; border-radius: 16px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
          h1 { color: #34c759; margin-bottom: 16px; }
          p { color: #666; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; 
                 background: #007aff; color: white; text-decoration: none; 
                 border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ ${responseText}</h1>
          <p>去飞书查看消息</p>
          <a href="https://feishu.cn" class="btn">打开飞书</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ 处理回调错误:', error.message);
    res.send('处理出错，请重试');
  }
});

// 飞书回调（Webhooks 方式）
app.post('/webhook', async (req, res) => {
  console.log('📥 收到飞书回调:', JSON.stringify(req.body).substring(0, 300));
  res.send('OK');
});

// 健康检查
app.get('/', (req, res) => {
  res.send('🎱 台球练习助手运行中...');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🎱 台球练习助手 - 服务器
================================
端口: ${PORT}
回调: /callback
验证: /webhook
================================
  `);
});
