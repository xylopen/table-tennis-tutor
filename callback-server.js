#!/usr/bin/env node
/**
 * 台球练习助手 - 回调服务器
 * 
 * 使用飞书长轮询接收按钮点击事件
 * 运行方式: node callback-server.js
 */

const axios = require('axios');

const appId = 'cli_a918b4b7de78dbc8';
const appSecret = 'v7EMLRiBMGI8DkuWd5W3aeL4Dzhvg7BA';
const userId = 'ou_433e5534d9e9e75189e13a82f1491a76';

// 导入主逻辑
const { loadProgress, saveProgress, getCurrentLesson, getLessonCard, getConfirmCard, getProgressCard, LESSONS } = require('./lib.js');

// 获取 tenant_access_token
async function getTenantAccessToken() {
  const response = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: appId, app_secret: appSecret }
  );
  return response.data.tenant_access_token;
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

// 处理按钮回调
async function handleCallback(callbackData) {
  const { action, lesson } = callbackData;
  const progress = loadProgress();
  
  console.log(`📥 收到回调: action=${action}, lesson=${lesson}`);
  
  if (action === 'complete') {
    // 用户点击"完成本课"，发送确认卡片
    const card = getConfirmCard(progress.currentLesson);
    await sendCard(userId, card);
    console.log('✅ 已发送确认卡片');
  }
  else if (action === 'confirm_complete') {
    // 用户点击"确认完成"，进入下一课
    progress.totalCompleted++;
    if (progress.currentLesson < LESSONS.length) {
      progress.currentLesson++;
    }
    saveProgress(progress);
    
    await sendText(userId, '🎉 太棒了！练习完成！\n\n继续加油～\n\n');
    
    const nextLesson = getCurrentLesson(progress);
    const card = getLessonCard(nextLesson);
    await sendCard(userId, card);
    console.log(`✅ 已进入下一课：${nextLesson.title}`);
  }
  else if (action === 'later') {
    await sendText(userId, '好的，随时想说"完成"或"下一课"的时候叫我～');
    console.log('⏳ 用户稍后再说');
  }
}

// 长轮询获取事件
async function startLongPolling() {
  const token = await getTenantAccessToken();
  let cursor = '';
  
  console.log('🔄 回调服务器启动中...');
  
  while (true) {
    try {
      const params = cursor ? { cursor } : {};
      const response = await axios.get(
        'https://open.feishu.cn/open-apis/im/v1/events',
        {
          params,
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 30 // 30秒超时，触发下一次请求
        }
      );
      
      const data = response.data;
      
      if (data.code === 0 && data.data && data.data.items) {
        for (const event of data.data.items) {
          // 只处理卡片按钮回调事件
          if (event.type === 'im.message.interactive_card_callback') {
            const callbackData = event.callback;
            const buttonValue = callbackData?.action?.value;
            
            if (buttonValue) {
              await handleCallback(buttonValue);
            }
          }
        }
        
        // 更新 cursor
        if (data.data.page) {
          cursor = data.data.page;
        }
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.response?.status === 504) {
        // 超时是正常的，继续轮询
        continue;
      }
      console.error('❌ 轮询错误:', error.message);
      await new Promise(r => setTimeout(r, 5000)); // 错误后等待5秒
    }
  }
}

// 启动服务器
console.log(`
🎱 台球练习助手 - 回调服务器
================================
用户ID: ${userId}
按 Ctrl+C 停止
================================
`);

startLongPolling();
