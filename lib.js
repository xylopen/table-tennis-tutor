const fs = require('fs');
const path = require('path');
const os = require('os');

// 课程内容
const LESSONS = [
  {
    id: 1,
    title: "第1课：握杆与站姿",
    duration: "60分钟",
    content: `🎯 **目标**：掌握正确的握杆方式和身体姿势

📖 **内容**：
- 握杆手势：自然握紧，不要太紧
- 站位角度：双脚与肩同宽，身体对准目标线
- 俯身姿势：下巴贴近球杆，眼睛瞄准
- **练习方法**：空杆挥空练习 30分钟

📝 **课后作业**：每天挥杆100次，连续7天`
  },
  {
    id: 2,
    title: "第2课：瞄准技巧", 
    duration: "60分钟",
    content: `🎯 **目标**：理解瞄准原理，提高准确性

📖 **内容**：
- 母球与目标球的接触点
- 延长线瞄准法
- 厚度控制：薄切 vs 厚切
- **练习方法**：直线球练习，从近距离开始

📝 **课后作业**：直线球10进7，连续10组`
  },
  {
    id: 3,
    title: "第3课：运杆节奏",
    duration: "60分钟",
    content: `🎯 **目标**：掌握稳定的运杆节奏

📖 **内容**：
- 前后杆速度一致
- 杆头停留时间
- 呼吸控制
- **练习方法**：长距离直线球

📝 **课后作业**：30cm距离直线球，10进8`
  },
  {
    id: 4,
    title: "第4课：力度控制",
    duration: "60分钟",
    content: `🎯 **目标**：控制击球力度

📖 **内容**：
- 轻力、中力、强力击打
- 拉杆与推杆
- 力度与旋转的关系
- **练习方法**：远近球练习

📝 **课后作业**：5点位球，母球返回到开球区`
  },
  {
    id: 5,
    title: "第5课：基本杆法 - 推杆",
    duration: "60分钟",
    content: `🎯 **目标**：掌握推杆技术

📖 **内容**：
- 高杆：母球向前旋转
- 中杆：母球直线前进
- 低杆：母球向后旋转
- **练习方法**：定距离力度练习`
  },
  {
    id: 6,
    title: "第6课：基本杆法 - 拉杆",
    duration: "60分钟",
    content: `🎯 **目标**：掌握拉杆（Backspin）技术

📖 **内容**：
- 拉杆原理
- 厚拉与薄拉
- **练习方法**：母球拉回练习`
  },
  {
    id: 7,
    title: "第7课：基本杆法 - 塞球",
    duration: "60分钟",
    content: `🎯 **目标**：掌握左右旋转（塞球）

📖 **内容**：
- 左塞（Side spin）
- 右塞
- 塞球与线路偏移
- **练习方法**：角度球练习`
  },
  {
    id: 8,
    title: "第8课：高级杆法 - 组合球",
    duration: "60分钟",
    content: `🎯 **目标**：掌握两颗球以上的击打

📖 **内容**：
- 组合球角度计算
- 借力打力
- **练习方法**：简单组合球`
  },
  {
    id: 9,
    title: "第9课：防守意识",
    duration: "60分钟",
    content: `🎯 **目标**：学会安全防守

📖 **内容**：
- 为什么要防守
- 常见防守方式
- **练习方法**：把白球藏到障碍球后面`
  },
  {
    id: 10,
    title: "第10课：比赛心态",
    duration: "60分钟",
    content: `🎯 **目标**：建立正确比赛心态

📖 **内容**：
- 专注当下
- 不追求完美
- 失误后快速调整
- 深呼吸技巧`
  }
];

const PROGRESS_FILE = path.join(os.homedir(), '.openclaw', 'workspace', 'memory', 'table-tennis-progress.json');

// 加载进度
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { currentLesson: 1, totalCompleted: 0 };
}

// 保存进度
function saveProgress(progress) {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// 获取当前课程
function getCurrentLesson(progress) {
  return LESSONS.find(l => l.id === progress.currentLesson) || LESSONS[0];
}

// 发送课程卡片内容
function getLessonCard(lesson) {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `🎱 ${lesson.title}` },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: lesson.content }
      },
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `⏱️ 建议练习时长：**${lesson.duration}**` }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '✅ 完成本课' },
            type: 'primary',
            value: { action: 'complete', lesson: lesson.id }
          }
        ]
      }
    ]
  };
}

// 确认完成卡片 - 带按钮
function getConfirmCard(lessonId) {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📬 练习确认' },
      template: 'green'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `你已经完成第 **${lessonId}课** 的练习了吗？\n\n点击确认后，我将为你解锁下一课～\n\n💡 或者直接回复"确认完成"` }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '✅ 确认完成' },
            type: 'primary',
            url: 'https://open.feishu.cn',
            value: { action: 'confirm_complete', lesson: lessonId }
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '⏳ 稍后再说' },
            type: 'default',
            url: 'https://open.feishu.cn',
            value: { action: 'later' }
          }
        ]
      }
    ]
  };
}

// 进度卡片
function getProgressCard(progress) {
  const lesson = getCurrentLesson(progress);
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📊 练习进度' },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `✅ 已完成：**${progress.totalCompleted}** 课\n📚 当前课程：**${lesson.title}**\n🎯 进度：**${progress.currentLesson}/10**` }
      }
    ]
  };
}

module.exports = {
  LESSONS,
  loadProgress,
  saveProgress,
  getCurrentLesson,
  getLessonCard,
  getConfirmCard,
  getProgressCard
};
