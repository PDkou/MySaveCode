const fs = require('fs');
const crypto = require('crypto');
const vm = require('vm');

const html = fs.readFileSync('assets/index.html', 'utf8');
const expectedArt = {
  'assets/img/window-note.png': '3846c92da953b980f051525435980970b862a474746f8aa25a1fe7b658083e0f',
  'assets/img/quiet-bell.png': '505941fd7a79abcf8acf80ddadcb81fd4ec4b5de9ad4f74cf8d1750ce81c8ee9',
  'assets/img/open-notebook.png': 'e6f32c8bf9b2e3b3e22184afa0e0f7f2221f21788aa74aea0a17e0b36db92a8d'
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [file, expected] of Object.entries(expectedArt)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert(actual === expected, `${file}: v0.4.8 illustration changed`);
  assert(html.includes(file.replace('assets/', '')), `${file}: illustration is no longer used`);
}

assert(html.includes('Hello, Today 0.4.14'), 'version label missing');
assert(html.includes('tutorialContentOut') && html.includes('is-leaving') && html.includes('is-closing'), 'tutorial fade hooks missing');
assert(!html.includes('tutorialShellOut') && !html.includes('.hero:after'), 'screen-revealing fade or odd title line remains');
assert((html.match(/class="btn ghost"/g) || []).length >= 3, 'existing ghost buttons were removed');
assert(html.includes("l('내일 다시','明日また','Tomorrow')") && html.includes("l('날짜 변경','日付を変更','Change date')"), 'snooze controls missing');
assert(html.includes('class="card"') && html.includes('class="themeGrid"'), 'existing card or theme UI removed');
assert(html.includes('class="reminderChoices"') && html.includes("setReminderMode('random')"), 'reminder choice cards missing');
assert(html.includes('rerollPersonDate') && html.includes('pnextdate'), 'next-date controls missing');
assert(html.includes('연락하고 싶은 사람을<br>등록해 보세요') && html.includes('튜토리얼 다시 보기'), 'revised human-readable copy missing');
assert(html.includes("if(tab==='settings')addLanguageControl()"), 'language control disappears while settings overlay is open');
assert(html.includes('.settingsRow{height:68px') && html.includes('.settingsRow>button{width:68px'), 'language-stable settings layout missing');

const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const appNode = {innerHTML: ''};
const context = {
  console,
  setTimeout: () => 0,
  clearTimeout: () => {},
  localStorage: {getItem: () => null, setItem: () => {}, removeItem: () => {}},
  document: {
    body: {className: '', classList: {add: () => {}, remove: () => {}}},
    documentElement: {lang: '', dataset: {}},
    addEventListener: () => {},
    getElementById: id => id === 'app' ? appNode : null,
    querySelectorAll: () => []
  },
  window: {addEventListener: () => {}},
  navigator: {language: 'ko-KR'},
  HelloNative: {schedule: () => {}, cancel: () => {}, syncSettings: () => {}, setLanguage: () => {}, syncAppearance: () => {}},
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  TextDecoder,
  Uint8Array,
  Intl,
  Date,
  JSON
};
context.window.document = context.document;
vm.createContext(context);
vm.runInContext(script, context);

assert(vm.runInContext("let legacy={interval:21};normalizePerson(legacy);legacy.reminderMode==='fixed'", context), 'legacy contacts must migrate to fixed mode');
vm.runInContext('Math.random=()=>0', context);
assert(vm.runInContext("nextIntervalDays({reminderMode:'random',interval:21,minDays:14,maxDays:28})", context) === 14, 'random lower bound failed');
vm.runInContext('Math.random=()=>0.999999', context);
assert(vm.runInContext("nextIntervalDays({reminderMode:'random',interval:21,minDays:14,maxDays:28})", context) === 28, 'random upper bound failed');
assert(vm.runInContext("nextIntervalDays({reminderMode:'fixed',interval:30,minDays:14,maxDays:28})", context) === 30, 'fixed interval changed');
assert(vm.runInContext("overlay={type:'person'};overlayView().includes('data-mode=\"random\" class=\"reminderChoice active\"')", context), 'new contacts do not default to random mode');

for (const language of ['ja', 'en']) {
  vm.runInContext(`state.settings.language='${language}';state.people=[{id:1,name:'Alex',relation:'',reminderMode:'random',interval:21,minDays:14,maxDays:28,nextAt:Date.now()+20*day,lastAt:null,memo:'',topic:seeds[0]}];state.logs=[{id:2,personId:1,name:'Alex',at:Date.now(),memo:'',mood:''}]`, context);
  const screens = [
    vm.runInContext('tutorialStep=0;tutorialView()', context),
    vm.runInContext('tutorialStep=1;tutorialView()', context),
    vm.runInContext('tutorialStep=2;tutorialView()', context),
    vm.runInContext('todayView()', context),
    vm.runInContext('peopleView()', context),
    vm.runInContext('logsView()', context),
    vm.runInContext('settingsView()', context),
    vm.runInContext("overlay={type:'person',id:1};overlayView()", context),
    vm.runInContext("overlay={type:'complete',id:1};overlayView()", context),
    vm.runInContext("overlay={type:'snooze',id:1};overlayView()", context)
  ];
  const visibleText = screens.join(' ').replace(/<[^>]*>/g, ' ');
  assert(!/[가-힣]/.test(visibleText), `${language} screen contains visible Korean copy`);
}

console.log('Regression: preserved UI, revised copy, reminder cards/date controls and scheduling — OK');
