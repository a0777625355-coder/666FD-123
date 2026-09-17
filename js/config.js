/* ============================================================
 * 网站设定。名字、纪念日、那封信、玩乐链接都在这里改。
 * 相册照片、新增事件请在网页里添加（不要写在这里）。
 * 改完保存，浏览器按 F5 刷新即可。
 * ============================================================ */

window.LOVE = {
  myName: "小栋",
  herName: "小颖",

  // 顶部大标题（门禁页与侧栏显示）
  gateTitle: "LEE & CHENG",

  // 在一起的那一天，格式 年-月-日
  startDate: "2023-12-31",

  // 首页大数字下面那句话
  subtitle: "把日子留给我们自己写",

  // ---- 门禁（进入页）----
  // 简易登录：输「天数」= 以小颖进入；输「him 口令」= 以小栋进入
  // （只有聊天用得到身份，主页不会显示这些提示）
  login: {
    her: "days",   // "days" 表示口令就是距离纪念日的天数；也可以写一串数字
    him: "000"     // 小栋的口令
  },
  // 额外口令（可选），留空 "" 表示没有；输入它一律以她（小颖）的身份进入
  password: "",

  // 背景大图：填路径（如 "assets/bg.jpg"）就会用作玻璃背景；留空用默认蓝色渐变
  bgImage: "",

  // ---- 玩乐 ----
  // 约会联系电话
  phone: "18261950980",

  // 左边一列的活动。type：
  //   link      点一下直接打开 url
  //   platforms 点一下进入「选择页面」（platforms 里是一组名字+链接）
  //   address   点一下输入逛街的地址（保存后可一键打开地图）
  //   phone     点一下查看联系电话
  fun: [
    { id: "movie",   name: "看电影", type: "link",      url: "https://www.iqiyi.com",      note: "爱奇艺", platforms: [] },
    { id: "douyin",  name: "刷抖音", type: "link",      url: "https://www.douyin.com",     note: "抖音",   platforms: [] },
    { id: "kpl",     name: "看比赛", type: "link",      url: "https://live.bilibili.com",  note: "BiliBili-KPL", platforms: [] },
    { id: "taobao",  name: "逛淘宝", type: "link",      url: "https://www.taobao.com",     note: "淘宝",   platforms: [] },
    { id: "short",   name: "刷短剧", type: "link",      url: "https://fanqienovel.com",    note: "番茄短剧", platforms: [] },
    {
      id: "tv", name: "看电视", type: "platforms", note: "进入选择页面",
      platforms: [
        { name: "爱奇艺", url: "https://www.iqiyi.com" },
        { name: "优酷",   url: "https://www.youku.com" },
        { name: "芒果",   url: "https://www.mgtv.com" },
        { name: "Bilibili", url: "https://www.bilibili.com" }
      ]
    },
    { id: "music",  name: "听歌", type: "link", url: "https://y.qq.com", note: "QQ音乐", platforms: [] },
    { id: "street", name: "逛街", type: "address", url: "", note: "（请输入地址）", platforms: [] },
    { id: "date",   name: "约会", type: "phone", url: "", note: "请联系", platforms: [] }
  ],

  // ---- Game ----
  // 每个游戏：名字 + 可选官网链接 + 角色列表 + 图标（icon，填 assets/games 里的文件）
  games: [
    { id: "hok",   name: "王者荣耀", icon: "assets/games/pvp-official.png", url: "https://pvp.qq.com", roles: ["小乔", "大乔", "杨玉环", "西施", "李白", "韩信", "貂蝉"] },
    { id: "ys",    name: "原神",     icon: "assets/games/ys-paimon.jpg", url: "https://ys.mihoyo.com", roles: ["派蒙", "荧", "胡桃", "钟离"] },
    { id: "jcc",   name: "金铲铲",   icon: "assets/games/yg-jcc.png", url: "https://yg.qq.com", roles: ["提莫", "卡莎", "瑟提", "亚索"] },
    { id: "other", name: "Others",   icon: "", url: "", roles: ["角色1", "角色2", "角色3", "角色4"] }
  ],

  // 背景音乐：把 mp3 放到 assets，再写上文件名（如 "assets/bgm.mp3"）。没有就留空 ""
  music: "",

  // ---- 云端实时同步（可选）----
  // 在 https://supabase.com 注册一个免费项目（步骤见使用说明.txt），
  // 然后把 enabled 改成 true，并填入下面的 url 和 anonKey。
  // 聊天会变成真正的实时同步（多设备 / 多浏览器即时互见），
  // 本地文件夹同步仍保留作离线备份。
  cloud: {
    enabled: true,
    url: "https://pependbvhpnlechpvabs.supabase.co",
    anonKey: "sb_publishable_5smAQcIwctpKVZsQxlafhg_cPSemCzX"
  },

  // ---- 吃喝 ----
  // 刚打开时给的菜单（可在网页里直接改名、加菜、打喜爱度）
  // 结构：v 是版本号（改默认菜单就升一位，网站会自动刷新一次）；
  //      items 里每项一个 name，rate 是初始喜爱度 1~5 心；
  //      note 会显示在该分类的名称下面。
  foodDefaults: {
    v: "2026b",
    menu: {
      note: "",
      items: [
        { name: "西红柿炒鸡蛋", rate: 4 },
        { name: "香鸡脚", rate: 5 },
        { name: "糖醋排骨", rate: 5 },
        { name: "干锅排骨", rate: 4 },
        { name: "辣鸡米皮", rate: 4 },
        { name: "蒜蓉空心菜", rate: 4 },
        { name: "西红柿牛肉意大利面", rate: 4 },
        { name: "泡面（面要用煮的）", rate: 4 },
        { name: "螺蛳粉（阿灿螺蛳粉 · 柳州）", rate: 5 },
        { name: "软糖", rate: 3 },
        { name: "黄焖鸡", rate: 4 },
        { name: "黄焖排骨", rate: 4 },
        { name: "酸豆角炒肉末", rate: 4 },
        { name: "黄焖鸡翅", rate: 4 },
        { name: "酸粉（不能经常吃）", rate: 2 },
        { name: "早餐糯米粉（自助的）", rate: 4 }
      ]
    },
    milktea: {
      note: "不喜欢下午喝奶茶，因为会睡不着。",
      items: [
        { name: "古茗 · 波波奶茶", rate: 5 },
        { name: "喜茶 · 黑糖", rate: 5 },
        { name: "喜茶 · 果茶", rate: 4 }
      ]
    }
  },

  // 使用已有像素照片作为基础相册；网页新增照片继续保存在原有本地存储中。
  photos: [
    {
        "src": "photos/pixel-alley.jpg",
        "caption": "小巷里的慢时光"
    },
    {
        "src": "photos/pixel-cafe.jpg",
        "caption": "一起坐坐，喝杯咖啡"
    },
    {
        "src": "photos/pixel-chongqing-hands.jpg",
        "caption": "重庆 · 牵手的瞬间"
    },
    {
        "src": "photos/pixel-chongqing-together.jpg",
        "caption": "重庆 · 一起入镜"
    },
    {
        "src": "photos/pixel-chongqing-ying.jpg",
        "caption": "重庆 · 镜头里的你"
    },
    {
        "src": "photos/pixel-close-selfie.jpg",
        "caption": "靠近一点的合照"
    },
    {
        "src": "photos/pixel-hydrangea.jpg",
        "caption": "花开的时候"
    },
    {
        "src": "photos/pixel-night-clips.jpg",
        "caption": "夜晚的小片段"
    },
    {
        "src": "photos/pixel-sleep.jpg",
        "caption": "安静的日常"
    },
    {
        "src": "photos/pixel-street.jpg",
        "caption": "一起走过的街道"
    },
    {
        "src": "photos/pixel-wooden-selfie.jpg",
        "caption": "收藏一张合照"
    }
],

  // 基础时间线。以后新增内容请打开网页后点「添加事件」，不需要再改这里。
  events: [
    { date: "2023-06-26", title: "第一次看见", text: "故事从第一次看见彼此开始。" },
    { date: "2023-07-07", title: "第一次加好友", text: "从这一天起，有了彼此的联系方式。" },
    { date: "2023-10-01", title: "第一次出去玩", text: "一起抓娃娃。" },
    { date: "2023-10-30", title: "第一次离开遵义", text: "去贵阳打九价疫苗。" },
    { date: "2023-12-31", title: "我们开始了", text: "从这一天起，“我和你”成为“我们”。" },
    { date: "2024-01-16", title: "四川 · 成都", text: "一起去成都。" },
    { date: "2024-03-04", title: "贵州 · 遵义桐梓", text: "一起去桐梓。" },
    { date: "2024-08-11", title: "云南 · 昆明", text: "云南之旅第一站。" },
    { date: "2024-08-12", title: "云南 · 大理", text: "云南之旅第二站。" },
    { date: "2024-08-14", title: "云南 · 丽江", text: "云南之旅第三站。" },
    { date: "2025-05-01", title: "广西 · 柳州", text: "一起去柳州。" },
    { date: "2025-05-03", title: "广西 · 北海", text: "一起去北海。" },
    { date: "2025-08-29", title: "周深演唱会", text: "一起奔赴喜欢的现场。" },
    { date: "2026-04-25", title: "重庆", text: "一起去重庆。" },
    { date: "2026-08-23", title: "徐良演唱会", text: "下一段故事，正在发生。" }
  ],

  letter: `亲爱的宝宝酱：

992天了，还有8天就是1000天的纪念日。因为我的缘故，没法准时过1000天纪念日，我非常抱歉。

其实我有点记不清第一天是什么时候见面的。准确来说，第一次见面是在你参加完你发小后的一天。虽然我记不得第一天准确是几号，但是我可以确定，我们第一次加好友是在2023年7月7日。我大概记得第一次见到你应该是在6月24日左右，那好像是我第一天去自习室。

时间过得还是很快的，一眨眼就已经到了纪念日。虽然还不是正式的一千天，但是我还是想祝我们在一起一千天了。最近太累了，其实我在上个月就开始思考，要怎么过好一千天的纪念日。局限于我现在的情况，我可能没法给你更加刺激的纪念日。我很愧疚这个问题，每当想起我们总是因为一些事情，阻碍着想去体验和感受的脚步，我就非常难受。

虽然一千天了，但是我并没有厌烦和感到腻，我感觉我还是很喜欢你。我老是感觉自己会惹你不高兴，可能因为我现在自己的状态也不太稳定，宝宝你的工作压力也很大。

其实准备得还是比较仓促，我也感觉自己的礼物和安排都不够好。整体来说，希望你能感觉到进步。

我爱你，李姿颖宝宝。
祝我们1000天快乐。`
};
