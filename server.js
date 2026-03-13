#!/usr/bin/env node
/**
 * 台球练习助手 - 回调服务器 (Express版)
 * 
 * 部署到 Railway 后，接收飞书按钮点击回调
 */

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// 配置
const APP_ID = process.env.APP_ID || 'cli_a918b4b7de78dbc8';
const APP_SECRET = process.env.APP_SECRET || 'v7EMLRiBMGI8DkuWd5W3aeL4Dzhvg7BA';
const USER_ID = process.env.USER_ID || 'ou_433e5534d9e9e75189e13a82f1491a76';

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
  tokenExpireTime = Date.now() + 1.5 * 60 * 60 * 1000; // 提前5分钟过期
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
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    }
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
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    }
  );
}

// 飞书验证 URL
app.get('/webhook', (req, res) => {
  const { challenge } = req.query;
  if (challenge) {
    res.send(challenge);
  } else {
    res.send('OK');
  }
});

// 飞书回调
app.post('/webhook', async (req, res) => {
  console.log('📥 收到飞书回调:', JSON.stringify(req.body).substring(0, 500));
  
  const event = req.body;
  
  // 处理卡片按钮回调
  if (event.type === 'im.message.interactive_card_callback') {
    const callback = event.callback || {};
    const action = callback.action || {};
    const value = action.value || {};
    
    const actionType = value.action;
    const lessonId = value.lesson;
    
    console.log(`🎯 按钮动作: ${actionType}, 课程: ${lessonId}`);
    
    try {
      const progress = loadProgress();
      
      if (actionType === 'complete') {
        // 用户点击"完成本课"
        const card = getConfirmCard(progress.currentLesson);
        await sendCard(USER_ID, card);
        console.log('✅ 已发送确认卡片');
      }
      else if (actionType === 'confirm_complete') {
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
        console.log(`✅ 已进入下一课：${nextLesson.title}`);
      }
      else if (actionType === 'later') {
        await sendText(USER_ID, '好的，随时想说"完成"的时候叫我～');
        console.log('⏳ 用户稍后再说');
      }
    } catch (error) {
      console.error('❌ 处理回调错误:', error.message);
    }
  }
  
  res.send('OK');
});

// 健康检查
app.get('/', (req, res) => {
  res.send('🎱 台球练习助手回调服务器运行中...');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🎱 台球练习助手 - 回调服务器
================================
监听端口: ${PORT}
回调URL: /webhook
用户ID: ${USER_ID}
================================
  `);
});
